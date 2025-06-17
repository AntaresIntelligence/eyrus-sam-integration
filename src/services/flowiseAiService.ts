import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { logger, logError, logBusinessEvent } from '../utils/logger';

export interface FlowiseAiRequest {
  question: string;
  opportunityId?: string;
  opportunityData?: any;
}

export interface FlowiseAiResponse {
  id: string;
  opportunityId: string;
  question: string;
  response: any;
  confidenceScore?: number;
  metadata?: any;
  requestedAt: Date;
  requestId?: string;
  status: 'pending' | 'completed' | 'failed';
  errorMessage?: string;
}

class FlowiseAiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.flowise.apiUrl,
      timeout: config.flowise.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.flowise.apiKey}`,
      },
    });

    // Request interceptor for logging
    this.client.interceptors.request.use((config) => {
      logger.debug('Flowise AI request', {
        method: config.method,
        url: config.url,
        data: config.data ? { question: config.data.question?.substring(0, 100) + '...' } : undefined,
      });
      return config;
    });

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('Flowise AI response', {
          status: response.status,
          data: response.data ? 'Response received' : 'No data',
        });
        return response;
      },
      (error) => {
        logger.error('Flowise AI response error', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Analyze a government opportunity with AI
   */
  async analyzeOpportunity(opportunityData: any): Promise<any> {
    try {
      const question = this.buildAnalysisPrompt(opportunityData);
      
      logger.info('Analyzing opportunity with Flowise AI', {
        opportunityId: opportunityData.opportunity_id,
        title: opportunityData.title?.substring(0, 100),
      });

      const response = await this.client.post('', {
        question: question,
      });

      logBusinessEvent('flowise_ai_analysis_completed', {
        opportunityId: opportunityData.opportunity_id,
        responseLength: JSON.stringify(response.data).length,
      });

      return {
        success: true,
        response: response.data,
        metadata: {
          opportunityId: opportunityData.opportunity_id,
          analyzedAt: new Date().toISOString(),
          promptLength: question.length,
        },
      };

    } catch (error: any) {
      logError(error, 'flowise_ai_analysis_failed', {
        opportunityId: opportunityData.opportunity_id,
      });

      return {
        success: false,
        error: error.message,
        metadata: {
          opportunityId: opportunityData.opportunity_id,
          failedAt: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Ask a custom question about an opportunity
   */
  async askQuestion(question: string, opportunityData?: any): Promise<any> {
    try {
      let enhancedQuestion = question;
      
      if (opportunityData) {
        enhancedQuestion = `
Context: Government Contract Opportunity
Title: ${opportunityData.title}
Department: ${opportunityData.department}
NAICS Code: ${opportunityData.naics_code}
Posted Date: ${opportunityData.posted_date}
Deadline: ${opportunityData.response_deadline}
Award Amount: ${opportunityData.award_amount ? '$' + opportunityData.award_amount.toLocaleString() : 'Not specified'}
Description: ${opportunityData.description?.substring(0, 500)}

Question: ${question}
`;
      }

      logger.info('Sending custom question to Flowise AI', {
        questionLength: question.length,
        hasOpportunityContext: !!opportunityData,
      });

      const response = await this.client.post('', {
        question: enhancedQuestion,
      });

      logBusinessEvent('flowise_ai_question_completed', {
        questionLength: question.length,
        responseLength: JSON.stringify(response.data).length,
      });

      return {
        success: true,
        response: response.data,
        metadata: {
          questionAsked: question,
          askedAt: new Date().toISOString(),
        },
      };

    } catch (error: any) {
      logError(error, 'flowise_ai_question_failed', {
        question: question.substring(0, 100),
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Build analysis prompt for opportunity evaluation
   */
  private buildAnalysisPrompt(opportunityData: any): string {
    return `
As an expert in government contracting and construction industry analysis, please analyze this government contract opportunity for Eyrus, a construction site intelligence platform company:

OPPORTUNITY DETAILS:
- Title: ${opportunityData.title}
- Department: ${opportunityData.department}
- NAICS Code: ${opportunityData.naics_code}
- Posted Date: ${opportunityData.posted_date}
- Response Deadline: ${opportunityData.response_deadline}
- Award Amount: ${opportunityData.award_amount ? '$' + opportunityData.award_amount.toLocaleString() : 'Not specified'}
- Opportunity Type: ${opportunityData.opportunity_type}
- Description: ${opportunityData.description}

EYRUS COMPANY CONTEXT:
Eyrus provides construction site intelligence solutions including:
- Workforce management and automated time tracking
- Worksite security and access control
- Safety monitoring and compliance
- Real-time project visibility and reporting
- Integration with major construction software platforms

ANALYSIS REQUESTED:
1. Business Opportunity Assessment: Rate the opportunity relevance for Eyrus (1-10) and explain why
2. Market Fit Analysis: How well does this align with Eyrus's construction intelligence solutions?
3. Competition Level: Assess likely competition and Eyrus's competitive advantages
4. Technical Requirements: Identify any specific technology requirements or capabilities needed
5. Strategic Value: Beyond direct revenue, what strategic value could this opportunity provide?
6. Risk Assessment: Identify potential risks or challenges
7. Recommendation: Should Eyrus pursue this opportunity? Why or why not?

Please provide a structured analysis with specific insights and actionable recommendations.
`;
  }

  /**
   * Batch analyze multiple opportunities
   */
  async batchAnalyzeOpportunities(opportunities: any[]): Promise<any[]> {
    const results = [];
    
    logger.info('Starting batch analysis of opportunities', {
      count: opportunities.length,
    });

    for (let i = 0; i < opportunities.length; i++) {
      const opportunity = opportunities[i];
      
      try {
        logger.info(`Analyzing opportunity ${i + 1}/${opportunities.length}`, {
          opportunityId: opportunity.opportunity_id,
        });

        const result = await this.analyzeOpportunity(opportunity);
        results.push(result);

        // Add delay between requests to avoid rate limiting
        if (i < opportunities.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error: any) {
        logError(error, 'batch_analysis_item_failed', {
          opportunityId: opportunity.opportunity_id,
          itemNumber: i + 1,
        });

        results.push({
          success: false,
          opportunityId: opportunity.opportunity_id,
          error: error.message,
        });
      }
    }

    logBusinessEvent('batch_analysis_completed', {
      totalOpportunities: opportunities.length,
      successfulAnalyses: results.filter(r => r.success).length,
      failedAnalyses: results.filter(r => !r.success).length,
    });

    return results;
  }

  /**
   * Test the Flowise AI connection
   */
  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      logger.info('Testing Flowise AI connection');

      const testQuestion = "Hello, this is a connection test. Please respond with 'Connection successful' if you can read this message.";

      const response = await this.client.post('', {
        question: testQuestion,
      });

      if (response.data) {
        logger.info('Flowise AI connection test successful', {
          responseReceived: true,
          statusCode: response.status,
        });

        return {
          success: true,
          message: 'Flowise AI connection successful',
          details: {
            apiUrl: config.flowise.apiUrl,
            responseStatus: response.status,
            responseData: response.data,
          },
        };
      } else {
        throw new Error('No response data received');
      }

    } catch (error: any) {
      logger.error('Flowise AI connection test failed', {
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
      });

      return {
        success: false,
        message: `Flowise AI connection failed: ${error.message}`,
        details: {
          error: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
        },
      };
    }
  }
}

// Export singleton instance
export const flowiseAiService = new FlowiseAiService();