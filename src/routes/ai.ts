import { Router, Request, Response } from 'express';
import { samOpportunitiesService } from '../services/samOpportunitiesService';
import { flowiseAiService } from '../services/flowiseAiService';
import { logger, logError, logBusinessEvent } from '../utils/logger';

const router = Router();

/**
 * POST /ai/analyze/opportunity/:id
 * Analyze a specific opportunity with AI
 */
router.post('/analyze/opportunity/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { customPrompt } = req.body;

    logger.info('AI analysis requested for opportunity', { opportunityId: id });

    // Get the opportunity data
    const opportunity = await samOpportunitiesService.getOpportunityById(id);
    if (!opportunity) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Opportunity not found',
        timestamp: new Date().toISOString(),
      });
    }

    // Perform AI analysis
    const analysisResult = customPrompt 
      ? await flowiseAiService.askQuestion(customPrompt, opportunity)
      : await flowiseAiService.analyzeOpportunity(opportunity);

    if (analysisResult.success) {
      logBusinessEvent('ai_opportunity_analysis_completed', {
        opportunityId: id,
        hasCustomPrompt: !!customPrompt,
        responseLength: JSON.stringify(analysisResult.response).length,
      });
    }

    res.json({
      success: analysisResult.success,
      analysis: analysisResult.response,
      metadata: analysisResult.metadata,
      opportunity: {
        id: opportunity.id,
        opportunityId: opportunity.opportunityId,
        title: opportunity.title,
        naicsCode: opportunity.naicsCode,
        department: opportunity.department,
        awardAmount: opportunity.awardAmount,
      },
      error: analysisResult.error,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logError(error, 'ai_opportunity_analysis_failed', {
      opportunityId: req.params.id,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to analyze opportunity',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /ai/analyze/batch
 * Analyze multiple opportunities with AI
 */
router.post('/analyze/batch', async (req: Request, res: Response) => {
  try {
    const { opportunityIds, naicsCode, limit = 10 } = req.body;
    
    logger.info('Batch AI analysis requested', {
      opportunityIds: opportunityIds?.length,
      naicsCode,
      limit,
    });

    let opportunities = [];

    if (opportunityIds && opportunityIds.length > 0) {
      // Analyze specific opportunities
      for (const id of opportunityIds.slice(0, limit)) {
        try {
          const opportunity = await samOpportunitiesService.getOpportunityById(id);
          if (opportunity) {
            opportunities.push(opportunity);
          }
        } catch (error) {
          logger.warn('Failed to fetch opportunity for batch analysis', { id });
        }
      }
    } else if (naicsCode) {
      // Analyze opportunities by NAICS code
      const result = await samOpportunitiesService.getOpportunitiesByNaics(
        naicsCode,
        {},
        limit,
        0
      );
      opportunities = result.opportunities;
    } else {
      // Analyze recent opportunities
      const recentOpportunities = await samOpportunitiesService.getOpportunities({
        limit,
        offset: 0,
      });
      opportunities = recentOpportunities;
    }

    if (opportunities.length === 0) {
      return res.json({
        success: true,
        message: 'No opportunities found for batch analysis',
        results: [],
        timestamp: new Date().toISOString(),
      });
    }

    // Perform batch analysis
    const analysisResults = await flowiseAiService.batchAnalyzeOpportunities(opportunities);

    logBusinessEvent('ai_batch_analysis_completed', {
      totalOpportunities: opportunities.length,
      successfulAnalyses: analysisResults.filter(r => r.success).length,
      failedAnalyses: analysisResults.filter(r => !r.success).length,
    });

    res.json({
      success: true,
      results: analysisResults,
      summary: {
        total: opportunities.length,
        successful: analysisResults.filter(r => r.success).length,
        failed: analysisResults.filter(r => !r.success).length,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logError(error, 'ai_batch_analysis_failed', {
      body: req.body,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to perform batch analysis',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /ai/chat
 * Interactive AI chat about opportunities
 */
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { question, opportunityId, context } = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Question is required',
        timestamp: new Date().toISOString(),
      });
    }

    logger.info('AI chat question received', {
      questionLength: question.length,
      hasOpportunityId: !!opportunityId,
      hasContext: !!context,
    });

    let opportunityData = null;
    if (opportunityId) {
      try {
        opportunityData = await samOpportunitiesService.getOpportunityById(opportunityId);
      } catch (error) {
        logger.warn('Failed to fetch opportunity for AI chat', { opportunityId });
      }
    }

    // Build enhanced question with context
    let enhancedQuestion = question;
    if (context) {
      enhancedQuestion = `Context: ${context}\n\nQuestion: ${question}`;
    }

    const chatResult = await flowiseAiService.askQuestion(enhancedQuestion, opportunityData);

    if (chatResult.success) {
      logBusinessEvent('ai_chat_completed', {
        questionLength: question.length,
        responseLength: JSON.stringify(chatResult.response).length,
        hasOpportunityContext: !!opportunityData,
      });
    }

    res.json({
      success: chatResult.success,
      response: chatResult.response,
      metadata: chatResult.metadata,
      opportunity: opportunityData ? {
        id: opportunityData.id,
        title: opportunityData.title,
        naicsCode: opportunityData.naicsCode,
      } : null,
      error: chatResult.error,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logError(error, 'ai_chat_failed', {
      question: req.body.question?.substring(0, 100),
    });

    res.status(500).json({
      success: false,
      error: 'Failed to process chat question',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /ai/test
 * Test AI connection and functionality
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    logger.info('AI connection test requested');

    const testResult = await flowiseAiService.testConnection();

    const statusCode = testResult.success ? 200 : 502;

    res.status(statusCode).json({
      success: testResult.success,
      message: testResult.message,
      details: testResult.details,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logError(error, 'ai_test_failed');

    res.status(500).json({
      success: false,
      error: 'AI test failed',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /ai/insights
 * Get AI-powered insights about opportunities trends
 */
router.get('/insights', async (req: Request, res: Response) => {
  try {
    const { naicsCode, dateFrom, dateTo, limit = 50 } = req.query;

    logger.info('AI insights requested', { naicsCode, dateFrom, dateTo, limit });

    // Get recent opportunities for analysis
    const filters: any = {
      limit: parseInt(limit as string, 10),
      offset: 0,
    };

    if (naicsCode) filters.naicsCode = naicsCode as string;
    if (dateFrom) filters.postedFrom = dateFrom as string;
    if (dateTo) filters.postedTo = dateTo as string;

    const opportunities = await samOpportunitiesService.getOpportunities(filters);

    if (opportunities.length === 0) {
      return res.json({
        success: true,
        message: 'No opportunities found for insights generation',
        insights: 'No recent opportunities available for analysis.',
        timestamp: new Date().toISOString(),
      });
    }

    // Create insights prompt
    const insightsPrompt = `
As an expert analyst for Eyrus construction intelligence platform, analyze these recent government contracting opportunities and provide strategic insights:

OPPORTUNITY SUMMARY:
${opportunities.slice(0, 10).map((opp, index) => `
${index + 1}. ${opp.title}
   - Department: ${opp.department}
   - NAICS: ${opp.naicsCode}
   - Amount: ${opp.awardAmount ? '$' + opp.awardAmount.toLocaleString() : 'Not specified'}
   - Posted: ${opp.postedDate}
`).join('')}

Total Opportunities Analyzed: ${opportunities.length}
Date Range: ${dateFrom || 'Recent'} to ${dateTo || 'Current'}
${naicsCode ? `NAICS Focus: ${naicsCode}` : 'All Construction NAICS Codes'}

INSIGHTS REQUESTED:
1. Market Trends: What trends do you see in these opportunities?
2. Opportunity Patterns: Common themes, departments, or project types?
3. Strategic Recommendations: What should Eyrus focus on based on these opportunities?
4. Competitive Landscape: What does this suggest about the market competition?
5. Technology Opportunities: Where could Eyrus's construction intelligence add most value?

Provide actionable insights for business development and strategic planning.
`;

    const insightsResult = await flowiseAiService.askQuestion(insightsPrompt);

    if (insightsResult.success) {
      logBusinessEvent('ai_insights_generated', {
        opportunitiesAnalyzed: opportunities.length,
        naicsCode: naicsCode as string,
        dateRange: `${dateFrom}-${dateTo}`,
      });
    }

    res.json({
      success: insightsResult.success,
      insights: insightsResult.response,
      metadata: {
        opportunitiesAnalyzed: opportunities.length,
        dateRange: { from: dateFrom, to: dateTo },
        naicsCode: naicsCode as string,
        generatedAt: new Date().toISOString(),
      },
      error: insightsResult.error,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logError(error, 'ai_insights_failed', {
      query: req.query,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to generate insights',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

export { router as aiRouter };