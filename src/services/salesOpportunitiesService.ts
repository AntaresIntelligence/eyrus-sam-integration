import { samOpportunitiesService } from './samOpportunitiesService';
import { SamOpportunityRepository } from '../repositories/samOpportunityRepository';
import { flowiseAiService } from './flowiseAiService';
import { logger, logBusinessEvent, logError } from '../utils/logger';
import { config } from '../config';

export interface SalesOpportunity {
  id: string;
  opportunityId: string;
  title: string;
  department: string;
  naicsCode: string;
  awardAmount: number;
  awardeeName?: string;
  awardeeInfo?: any;
  contactInfo?: any;
  postedDate: Date;
  responseDeadline?: Date;
  solicitationNumber: string;
  description: string;
  samUrl?: string;
  salesScore?: number;
  salesNotes?: string;
  keyContacts?: any[];
  projectType?: string;
  priority: 'high' | 'medium' | 'low';
}

export interface SalesFilters {
  minValue?: number;
  maxValue?: number;
  departments?: string[];
  naicsCodes?: string[];
  priority?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export interface BulkAnalysisRequest {
  opportunityIds: string[];
  analysisType: 'sales_potential' | 'competitive_analysis' | 'contact_strategy' | 'custom';
  customPrompt?: string;
}

export class SalesOpportunitiesService {
  private readonly opportunityRepo: SamOpportunityRepository;

  constructor() {
    this.opportunityRepo = new SamOpportunityRepository();
  }

  /**
   * Get sales-qualified opportunities (high-value, relevant departments)
   */
  async getSalesQualifiedOpportunities(filters: SalesFilters = {}): Promise<{
    opportunities: SalesOpportunity[];
    total: number;
    summary: any;
  }> {
    try {
      logger.info('Fetching sales-qualified opportunities', { filters });

      // Build filters with sales criteria
      const salesFilters = {
        minAmount: filters.minValue || config.sales.minContractValue,
        maxAmount: filters.maxValue || config.sales.maxContractValue,
        naicsCode: filters.naicsCodes?.join(','),
        department: filters.departments?.join('|'), // Use OR logic for departments
        postedFrom: filters.dateFrom,
        postedTo: filters.dateTo,
        limit: filters.limit || 50,
        offset: filters.offset || 0,
        opportunityType: 'Award Notice', // Focus on awarded contracts
      };

      // Get opportunities from main service
      const opportunities = await this.opportunityRepo.findOpportunities(salesFilters);
      
      // Transform to sales format and calculate scores
      const salesOpportunities = await Promise.all(
        opportunities.map(opp => this.transformToSalesOpportunity(opp))
      );

      // Sort by sales priority
      salesOpportunities.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      // Get total count
      const total = await this.opportunityRepo.countOpportunities({
        minAmount: salesFilters.minAmount,
        maxAmount: salesFilters.maxAmount,
        naicsCode: filters.naicsCodes?.[0],
        department: filters.departments?.[0],
        postedFrom: filters.dateFrom,
        postedTo: filters.dateTo,
        opportunityType: 'Award Notice',
      });

      // Generate summary
      const summary = this.generateSalesSummary(salesOpportunities);

      logBusinessEvent('sales_opportunities_fetched', {
        total,
        qualified: salesOpportunities.length,
        highPriority: salesOpportunities.filter(o => o.priority === 'high').length,
        filters,
      });

      return {
        opportunities: salesOpportunities,
        total,
        summary,
      };

    } catch (error: any) {
      logError(error, 'get_sales_opportunities_failed', { filters });
      throw error;
    }
  }

  /**
   * Get detailed opportunity information for sales team
   */
  async getOpportunityDetailsForSales(opportunityId: string): Promise<{
    opportunity: SalesOpportunity;
    aiAnalysis?: any;
    contactStrategy?: any;
    competitiveInfo?: any;
  }> {
    try {
      logger.info('Fetching opportunity details for sales', { opportunityId });

      // Get base opportunity
      const baseOpportunity = await samOpportunitiesService.getOpportunityById(opportunityId);
      if (!baseOpportunity) {
        throw new Error('Opportunity not found');
      }

      // Transform to sales format
      const salesOpportunity = await this.transformToSalesOpportunity(baseOpportunity);

      // Get AI analysis focused on sales
      const aiAnalysis = await this.generateSalesAnalysis(baseOpportunity);

      // Extract contact strategy
      const contactStrategy = await this.generateContactStrategy(baseOpportunity);

      // Get competitive information
      const competitiveInfo = await this.getCompetitiveInformation(baseOpportunity);

      logBusinessEvent('sales_opportunity_details_fetched', {
        opportunityId,
        hasAiAnalysis: !!aiAnalysis.success,
        hasContactStrategy: !!contactStrategy.success,
      });

      return {
        opportunity: salesOpportunity,
        aiAnalysis: aiAnalysis.success ? aiAnalysis.response : null,
        contactStrategy: contactStrategy.success ? contactStrategy.response : null,
        competitiveInfo,
      };

    } catch (error: any) {
      logError(error, 'get_sales_opportunity_details_failed', { opportunityId });
      throw error;
    }
  }

  /**
   * Perform bulk AI analysis for selected opportunities
   */
  async performBulkAnalysis(request: BulkAnalysisRequest): Promise<{
    success: boolean;
    results: any[];
    summary: any;
  }> {
    try {
      logger.info('Starting bulk AI analysis for sales', {
        opportunityCount: request.opportunityIds.length,
        analysisType: request.analysisType,
      });

      const results = [];
      const opportunities = [];

      // Fetch all opportunities
      for (const id of request.opportunityIds) {
        try {
          const opp = await samOpportunitiesService.getOpportunityById(id);
          if (opp) opportunities.push(opp);
        } catch (error) {
          logger.warn('Failed to fetch opportunity for bulk analysis', { id });
        }
      }

      // Generate analysis prompt based on type
      const analysisPrompt = this.buildBulkAnalysisPrompt(request.analysisType, opportunities, request.customPrompt);

      // Perform AI analysis
      const aiResult = await flowiseAiService.askQuestion(analysisPrompt);

      if (aiResult.success) {
        // Process individual opportunities for detailed insights
        for (const opp of opportunities) {
          try {
            const individualAnalysis = await this.generateSalesAnalysis(opp);
            results.push({
              opportunityId: opp.opportunityId,
              title: opp.title,
              department: opp.department,
              awardAmount: opp.awardAmount,
              analysis: individualAnalysis.success ? individualAnalysis.response : 'Analysis failed',
              success: individualAnalysis.success,
            });
          } catch (error) {
            results.push({
              opportunityId: opp.opportunityId,
              title: opp.title,
              success: false,
              error: 'Individual analysis failed',
            });
          }
        }

        logBusinessEvent('bulk_sales_analysis_completed', {
          opportunityCount: opportunities.length,
          analysisType: request.analysisType,
          successCount: results.filter(r => r.success).length,
        });

        return {
          success: true,
          results,
          summary: {
            totalAnalyzed: opportunities.length,
            successful: results.filter(r => r.success).length,
            overallInsights: aiResult.response,
            analysisType: request.analysisType,
          },
        };
      } else {
        throw new Error('AI analysis failed: ' + aiResult.error);
      }

    } catch (error: any) {
      logError(error, 'bulk_sales_analysis_failed', request);
      return {
        success: false,
        results: [],
        summary: { error: error.message },
      };
    }
  }

  /**
   * Transform opportunity to sales-focused format
   */
  private async transformToSalesOpportunity(opp: any): Promise<SalesOpportunity> {
    // Calculate sales score and priority
    const salesScore = this.calculateSalesScore(opp);
    const priority = this.determinePriority(opp, salesScore);
    
    // Extract key contacts from contact info
    const keyContacts = this.extractKeyContacts(opp.contactInfo);
    
    // Determine project type
    const projectType = this.determineProjectType(opp.title, opp.description);

    return {
      id: opp.id,
      opportunityId: opp.opportunityId,
      title: opp.title,
      department: opp.department,
      naicsCode: opp.naicsCode,
      awardAmount: opp.awardAmount || 0,
      awardeeName: opp.awardeeName,
      awardeeInfo: opp.awardeeInfo,
      contactInfo: opp.contactInfo,
      postedDate: opp.postedDate,
      responseDeadline: opp.responseDeadline,
      solicitationNumber: opp.solicitationNumber,
      description: opp.description,
      samUrl: opp.samUrl,
      salesScore,
      keyContacts,
      projectType,
      priority,
    };
  }

  /**
   * Calculate sales score based on Eyrus's ideal customer profile
   */
  private calculateSalesScore(opp: any): number {
    let score = 0;

    // Award amount scoring based on contract value priority (0-50 points)
    const amount = opp.awardAmount || 0;
    if (amount >= 5000000) score += 50; // $5M+ = High Priority
    else if (amount >= 500000) score += 35; // $500K+ = Medium Priority  
    else if (amount >= 100000) score += 20; // $100K+ = Lower Priority
    else if (amount >= 50000) score += 10; // $50K+ = Minimal Priority
    // Below $50K gets 0 points - likely too small for Eyrus ROI

    // Project type scoring based on proven Eyrus successes (0-25 points)
    const title = (opp.title || '').toLowerCase();
    const description = (opp.description || '').toLowerCase();
    const combinedText = `${title} ${description}`;
    
    // Proven Eyrus project types (highest scores)
    if (combinedText.includes('data center') || combinedText.includes('datacenter')) score += 25; // HITT case study
    else if (combinedText.includes('school') || combinedText.includes('elementary') || combinedText.includes('education')) score += 24; // CAM Construction case study
    else if (combinedText.includes('airport') || combinedText.includes('terminal')) score += 23; // Allegheny County Airport Authority
    else if (combinedText.includes('hotel') || combinedText.includes('hospitality')) score += 22; // Beck Group hotel project
    
    // High-workforce/security projects (Eyrus strength)
    else if (combinedText.includes('industrial') || combinedText.includes('manufacturing') || combinedText.includes('facility')) score += 21; // ZAP ECS industrial
    else if (combinedText.includes('secure') || combinedText.includes('security') || combinedText.includes('access control')) score += 20;
    else if (combinedText.includes('hospital') || combinedText.includes('medical') || combinedText.includes('healthcare')) score += 19;
    
    // Complex construction projects
    else if (combinedText.includes('multi-story') || combinedText.includes('high-rise') || combinedText.includes('tower')) score += 18;
    else if (combinedText.includes('renovation') || combinedText.includes('modernization') || combinedText.includes('retrofit')) score += 17;
    else if (combinedText.includes('office') || combinedText.includes('commercial') || combinedText.includes('headquarters')) score += 16;
    else if (combinedText.includes('infrastructure') || combinedText.includes('utility')) score += 15;
    
    // Projects with large workforce requirements (Eyrus value prop)
    else if (combinedText.includes('large scale') || combinedText.includes('complex') || combinedText.includes('multi-phase')) score += 14;

    // Department/Agency preference based on Eyrus experience (0-30 points)
    const dept = (opp.department || '').toLowerCase();
    if (dept.includes('defense') || dept.includes('army') || dept.includes('navy') || dept.includes('air force')) score += 30;
    else if (dept.includes('veterans') || dept.includes('va')) score += 28;
    else if (dept.includes('general services') || dept.includes('gsa')) score += 26;
    else if (dept.includes('corps of engineers')) score += 25;
    else if (dept.includes('homeland security') || dept.includes('dhs')) score += 24;
    else if (dept.includes('energy') || dept.includes('doe')) score += 22;
    else if (dept.includes('transportation') || dept.includes('dot')) score += 20;
    else if (dept.includes('health') || dept.includes('hhs')) score += 18;
    else if (dept.includes('education')) score += 16;
    else if (dept.includes('agriculture')) score += 14;

    // Recency bonus (0-10 points) - newer awards mean recent project starts
    const daysSincePosted = opp.postedDate ? 
      (Date.now() - new Date(opp.postedDate).getTime()) / (1000 * 60 * 60 * 24) : 999;
    if (daysSincePosted <= 30) score += 10;
    else if (daysSincePosted <= 90) score += 7;
    else if (daysSincePosted <= 180) score += 5;
    else if (daysSincePosted <= 365) score += 3;

    return Math.min(100, score);
  }

  /**
   * Determine opportunity priority
   */
  private determinePriority(opp: any, salesScore: number): 'high' | 'medium' | 'low' {
    if (salesScore >= 75) return 'high';
    if (salesScore >= 50) return 'medium';
    return 'low';
  }

  /**
   * Extract key contacts from contact information
   */
  private extractKeyContacts(contactInfo: any): any[] {
    if (!contactInfo) return [];
    
    try {
      const contacts = Array.isArray(contactInfo) ? contactInfo : [contactInfo];
      return contacts.map(contact => ({
        name: contact.name || contact.fullName || 'N/A',
        title: contact.title || contact.position || 'N/A',
        email: contact.email || 'N/A',
        phone: contact.phone || contact.phoneNumber || 'N/A',
        role: contact.role || 'Contact',
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * Determine project type from title and description
   */
  private determineProjectType(title: string, description: string): string {
    const text = `${title} ${description}`.toLowerCase();
    
    if (text.includes('construction') || text.includes('building')) return 'Construction';
    if (text.includes('renovation') || text.includes('retrofit')) return 'Renovation';
    if (text.includes('maintenance') || text.includes('repair')) return 'Maintenance';
    if (text.includes('design') || text.includes('engineering')) return 'Design/Engineering';
    if (text.includes('infrastructure')) return 'Infrastructure';
    
    return 'Other';
  }

  /**
   * Generate sales-focused AI analysis
   */
  private async generateSalesAnalysis(opportunity: any): Promise<any> {
    const prompt = `
As a sales strategist for Eyrus construction intelligence platform, analyze this awarded government contract opportunity:

CONTRACT DETAILS:
- Title: ${opportunity.title}
- Awardee: ${opportunity.awardeeName || 'Not specified'}
- Contract Value: ${opportunity.awardAmount ? '$' + opportunity.awardAmount.toLocaleString() : 'Not specified'}
- Department: ${opportunity.department}
- NAICS Code: ${opportunity.naicsCode}
- Posted: ${opportunity.postedDate}
- Solicitation: ${opportunity.solicitationNumber}

EYRUS VALUE PROPOSITION:
Eyrus provides construction site intelligence including workforce management, automated time tracking, worksite security, safety monitoring, and real-time project visibility.

SALES ANALYSIS NEEDED:
1. Sales Opportunity Score (1-10): Rate the potential for Eyrus to engage with this awardee
2. Decision Maker Profile: Who at the awardee company would be the key decision maker?
3. Pain Points: What construction challenges might this project face that Eyrus solves?
4. Approach Strategy: How should the sales team approach this opportunity?
5. Timing: Best time to reach out (project phase considerations)
6. Competition Risk: What competitors might already be engaged?
7. Value Messaging: Key Eyrus benefits to emphasize for this specific project

Provide actionable sales intelligence for immediate use by the sales team.
`;

    return await flowiseAiService.askQuestion(prompt, opportunity);
  }

  /**
   * Generate contact strategy
   */
  private async generateContactStrategy(opportunity: any): Promise<any> {
    const prompt = `
Create a contact strategy for Eyrus sales team to engage with the awardee of this government contract:

OPPORTUNITY: ${opportunity.title}
AWARDEE: ${opportunity.awardeeName || 'Unknown'}
CONTRACT VALUE: ${opportunity.awardAmount ? '$' + opportunity.awardAmount.toLocaleString() : 'Not specified'}

CONTACT STRATEGY NEEDED:
1. Primary Contact Titles: What job titles should we target at the awardee company?
2. Research Approach: How to find the right contacts?
3. Initial Outreach: Email/LinkedIn message template
4. Value Proposition: Key points to mention in first contact
5. Follow-up Strategy: Timeline and touchpoints
6. Meeting Ask: What specific meeting should we request?

Provide a tactical contact plan that the sales team can execute immediately.
`;

    return await flowiseAiService.askQuestion(prompt, opportunity);
  }

  /**
   * Get competitive information
   */
  private async getCompetitiveInformation(opportunity: any): Promise<any> {
    // For now, return static competitive info
    // This could be enhanced with real competitive intelligence data
    return {
      likelyCompetitors: [
        'Procore Technologies',
        'Autodesk Construction Cloud',
        'Oracle Aconex',
        'Bentley Systems',
      ],
      competitiveAdvantages: [
        'Real-time workforce intelligence',
        'Automated time tracking',
        'Advanced security monitoring',
        'Government contract experience',
      ],
      differentiators: [
        'Construction-specific AI analytics',
        'Seamless integration capabilities',
        'Proven ROI in similar projects',
      ],
    };
  }

  /**
   * Build bulk analysis prompt
   */
  private buildBulkAnalysisPrompt(analysisType: string, opportunities: any[], customPrompt?: string): string {
    const opportunitiesSummary = opportunities.map((opp, index) => `
${index + 1}. ${opp.title}
   - Awardee: ${opp.awardeeName || 'Unknown'}
   - Value: ${opp.awardAmount ? '$' + opp.awardAmount.toLocaleString() : 'Not specified'}
   - Department: ${opp.department}
   - NAICS: ${opp.naicsCode}
`).join('');

    switch (analysisType) {
      case 'sales_potential':
        return `
Analyze these ${opportunities.length} awarded government contracts for Eyrus sales potential:

${opportunitiesSummary}

Provide insights on:
1. Which opportunities have the highest sales potential for Eyrus?
2. Common patterns in high-value awards?
3. Recommended sales approach for each category?
4. Priority ranking for sales outreach?
`;

      case 'competitive_analysis':
        return `
Analyze the competitive landscape for these ${opportunities.length} government contracts:

${opportunitiesSummary}

Provide insights on:
1. Who are the winning contractors and what does this tell us?
2. Market trends in government construction awards?
3. Competitive positioning opportunities for Eyrus?
4. Market share insights and growth opportunities?
`;

      case 'contact_strategy':
        return `
Develop contact strategies for these ${opportunities.length} contract awardees:

${opportunitiesSummary}

Provide:
1. Target contact profiles for each awardee type?
2. Industry-specific approach strategies?
3. Timing recommendations for outreach?
4. Key messaging themes for each contract type?
`;

      case 'custom':
        return customPrompt ? `
${customPrompt}

OPPORTUNITIES TO ANALYZE:
${opportunitiesSummary}
` : 'Please provide a custom analysis prompt.';

      default:
        return `
Provide general business intelligence on these ${opportunities.length} government contract opportunities:

${opportunitiesSummary}

Include market insights, trends, and strategic recommendations for Eyrus.
`;
    }
  }

  /**
   * Generate sales summary
   */
  private generateSalesSummary(opportunities: SalesOpportunity[]): any {
    const totalValue = opportunities.reduce((sum, opp) => sum + (opp.awardAmount || 0), 0);
    const avgValue = opportunities.length > 0 ? totalValue / opportunities.length : 0;
    
    const priorityCounts = opportunities.reduce((acc, opp) => {
      acc[opp.priority] = (acc[opp.priority] || 0) + 1;
      return acc;
    }, {} as any);

    const departmentCounts = opportunities.reduce((acc, opp) => {
      acc[opp.department] = (acc[opp.department] || 0) + 1;
      return acc;
    }, {} as any);

    return {
      totalOpportunities: opportunities.length,
      totalValue,
      avgValue,
      priorityCounts,
      topDepartments: Object.entries(departmentCounts)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 5),
      valueRanges: {
        above10M: opportunities.filter(o => (o.awardAmount || 0) >= 10000000).length,
        between1M_10M: opportunities.filter(o => (o.awardAmount || 0) >= 1000000 && (o.awardAmount || 0) < 10000000).length,
        between100K_1M: opportunities.filter(o => (o.awardAmount || 0) >= 100000 && (o.awardAmount || 0) < 1000000).length,
        below100K: opportunities.filter(o => (o.awardAmount || 0) < 100000).length,
      },
    };
  }
}

// Export singleton instance
export const salesOpportunitiesService = new SalesOpportunitiesService();