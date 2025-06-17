import { Router, Request, Response } from 'express';
import { salesOpportunitiesService } from '../services/salesOpportunitiesService';
import { samOpportunitiesService } from '../services/samOpportunitiesService';
import { logger, logError, logBusinessEvent } from '../utils/logger';
import { config } from '../config';

const router = Router();

/**
 * GET /sales/opportunities
 * Get sales-qualified opportunities with value-based filtering
 */
router.get('/opportunities', async (req: Request, res: Response) => {
  try {
    const {
      minValue = config.sales.minContractValue,
      maxValue = config.sales.maxContractValue,
      priority,
      departments,
      naicsCodes,
      dateFrom,
      dateTo,
      limit = '25',
      offset = '0',
    } = req.query;

    const filters = {
      minValue: parseFloat(minValue as string),
      maxValue: parseFloat(maxValue as string),
      priority: priority as string,
      departments: departments ? (departments as string).split(',') : undefined,
      naicsCodes: naicsCodes ? (naicsCodes as string).split(',') : config.business.targetNaicsCodes,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    };

    logger.info('Fetching sales-qualified opportunities', { filters });

    const result = await salesOpportunitiesService.getSalesQualifiedOpportunities(filters);

    res.json({
      success: true,
      opportunities: result.opportunities,
      total: result.total,
      summary: result.summary,
      filters: {
        applied: filters,
        contractValueRange: `$${filters.minValue.toLocaleString()} - $${filters.maxValue.toLocaleString()}`,
        naicsCodes: filters.naicsCodes,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logError(error, 'get_sales_opportunities_failed', {
      query: req.query,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch sales opportunities',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /sales/opportunities/:id
 * Get detailed opportunity information for sales team
 */
router.get('/opportunities/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    logger.info('Fetching sales opportunity details', { opportunityId: id });

    const result = await salesOpportunitiesService.getOpportunityDetailsForSales(id);

    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    
    logError(error, 'get_sales_opportunity_details_failed', {
      opportunityId: req.params.id,
    });

    res.status(statusCode).json({
      success: false,
      error: statusCode === 404 ? 'Opportunity not found' : 'Failed to fetch opportunity details',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /sales/analyze/bulk
 * Perform bulk AI analysis for selected opportunities
 */
router.post('/analyze/bulk', async (req: Request, res: Response) => {
  try {
    const { opportunityIds, analysisType = 'sales_potential', customPrompt } = req.body;

    if (!opportunityIds || !Array.isArray(opportunityIds) || opportunityIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'opportunityIds array is required and must not be empty',
        timestamp: new Date().toISOString(),
      });
    }

    if (opportunityIds.length > 20) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Maximum 20 opportunities can be analyzed at once',
        timestamp: new Date().toISOString(),
      });
    }

    logger.info('Starting bulk sales analysis', {
      opportunityCount: opportunityIds.length,
      analysisType,
    });

    const result = await salesOpportunitiesService.performBulkAnalysis({
      opportunityIds,
      analysisType,
      customPrompt,
    });

    if (result.success) {
      logBusinessEvent('bulk_sales_analysis_completed', {
        opportunityCount: opportunityIds.length,
        analysisType,
        successCount: result.results.filter(r => r.success).length,
      });
    }

    res.json({
      success: result.success,
      results: result.results,
      summary: result.summary,
      analysisType,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logError(error, 'bulk_sales_analysis_failed', {
      body: req.body,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to perform bulk analysis',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /sales/dashboard
 * Get sales dashboard summary data
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const { timeframe = '30' } = req.query;
    const days = parseInt(timeframe as string, 10);
    
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);
    
    const filters = {
      minValue: config.sales.minContractValue,
      maxValue: config.sales.maxContractValue,
      naicsCodes: config.business.targetNaicsCodes,
      dateFrom: dateFrom.toISOString().split('T')[0],
      limit: 100,
    };

    logger.info('Fetching sales dashboard data', { timeframe: days, filters });

    const [salesOpportunities, allStats] = await Promise.all([
      salesOpportunitiesService.getSalesQualifiedOpportunities(filters),
      samOpportunitiesService.getNaicsStatistics(filters.dateFrom),
    ]);

    // Calculate key metrics
    const highPriorityCount = salesOpportunities.opportunities.filter(o => o.priority === 'high').length;
    const totalValue = salesOpportunities.summary.totalValue;
    const avgValue = salesOpportunities.summary.avgValue;
    
    // Top opportunities by score
    const topOpportunities = salesOpportunities.opportunities
      .sort((a, b) => (b.salesScore || 0) - (a.salesScore || 0))
      .slice(0, 5);

    const dashboardData = {
      summary: {
        totalQualifiedOpportunities: salesOpportunities.total,
        highPriorityCount,
        totalValue,
        avgValue,
        timeframe: `Last ${days} days`,
      },
      topOpportunities: topOpportunities.map(opp => ({
        id: opp.id,
        opportunityId: opp.opportunityId,
        title: opp.title,
        awardAmount: opp.awardAmount,
        department: opp.department,
        awardeeName: opp.awardeeName,
        salesScore: opp.salesScore,
        priority: opp.priority,
        projectType: opp.projectType,
      })),
      valueDistribution: salesOpportunities.summary.valueRanges,
      priorityBreakdown: salesOpportunities.summary.priorityCounts,
      topDepartments: salesOpportunities.summary.topDepartments,
      naicsStats: allStats.slice(0, 6), // Top 6 NAICS codes
    };

    logBusinessEvent('sales_dashboard_viewed', {
      timeframe: days,
      qualifiedOpportunities: salesOpportunities.total,
      highPriority: highPriorityCount,
    });

    res.json({
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logError(error, 'get_sales_dashboard_failed', {
      query: req.query,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch sales dashboard data',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /sales/filters
 * Get available filter options for sales team
 */
router.get('/filters', async (req: Request, res: Response) => {
  try {
    const filterOptions = {
      contractValueRanges: [
        { label: 'High Priority ($5M+)', min: 5000000, max: null },
        { label: 'Medium Priority ($500K - $5M)', min: 500000, max: 4999999 },
        { label: 'Standard ($100K - $500K)', min: 100000, max: 499999 },
        { label: 'Small ($50K - $100K)', min: 50000, max: 99999 },
      ],
      priorities: [
        { value: 'high', label: 'High Priority', description: 'Best fit for Eyrus' },
        { value: 'medium', label: 'Medium Priority', description: 'Good potential' },
        { value: 'low', label: 'Low Priority', description: 'Lower potential' },
      ],
      naicsCodes: config.business.targetNaicsCodes.map((code: string) => ({
        code,
        description: getNaicsDescription(code),
      })),
      departments: config.sales.preferredDepartments.map((dept: string) => ({
        name: dept,
        priority: 'high' as const,
      })),
      projectTypes: [
        'Data Center',
        'School/Education',
        'Airport/Terminal',
        'Hotel/Hospitality',
        'Industrial/Manufacturing',
        'Hospital/Healthcare',
        'Office/Commercial',
        'Infrastructure',
      ],
      analysisTypes: [
        { value: 'sales_potential', label: 'Sales Potential Analysis' },
        { value: 'competitive_analysis', label: 'Competitive Analysis' },
        { value: 'contact_strategy', label: 'Contact Strategy' },
        { value: 'custom', label: 'Custom Analysis' },
      ],
    };

    res.json({
      success: true,
      filters: filterOptions,
      defaults: {
        minContractValue: config.sales.minContractValue,
        maxContractValue: config.sales.maxContractValue,
        naicsCodes: config.business.targetNaicsCodes,
        departments: config.sales.preferredDepartments,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logError(error, 'get_sales_filters_failed');

    res.status(500).json({
      success: false,
      error: 'Failed to fetch filter options',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Helper function to get NAICS code descriptions
 */
function getNaicsDescription(code: string): string {
  const descriptions: Record<string, string> = {
    '236210': 'Industrial Building Construction',
    '236220': 'Commercial and Institutional Building Construction',
    '237110': 'Water and Sewer Line and Related Structures Construction',
    '237130': 'Power and Communication Line and Related Structures Construction',
    '237310': 'Highway, Street, and Bridge Construction',
    '237990': 'Other Heavy and Civil Engineering Construction',
  };
  
  return descriptions[code] || 'Construction';
}

export { router as salesRouter };