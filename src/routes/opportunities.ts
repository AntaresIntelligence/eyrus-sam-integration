import { Router, Request, Response } from 'express';
import { samOpportunitiesService } from '../services/samOpportunitiesService';
import { logger, logError } from '../utils/logger';

const router = Router();

/**
 * GET /opportunities
 * Get opportunities with filtering and pagination
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      limit = '50',
      offset = '0',
      postedFrom,
      postedTo,
      naicsCode,
      department,
      opportunityType,
      searchTerm,
    } = req.query;

    // Validate and parse query parameters
    const parsedLimit = Math.min(parseInt(limit as string, 10) || 50, 1000); // Max 1000
    const parsedOffset = Math.max(parseInt(offset as string, 10) || 0, 0);

    const filters = {
      limit: parsedLimit,
      offset: parsedOffset,
      ...(postedFrom && { postedFrom: postedFrom as string }),
      ...(postedTo && { postedTo: postedTo as string }),
      ...(naicsCode && { naicsCode: naicsCode as string }),
      ...(department && { department: department as string }),
      ...(opportunityType && { opportunityType: opportunityType as string }),
      ...(searchTerm && { searchTerm: searchTerm as string }),
    };

    logger.info('Fetching opportunities', { filters });

    const opportunities = await samOpportunitiesService.getOpportunities(filters);

    res.json({
      success: true,
      data: opportunities,
      meta: {
        count: opportunities.length,
        limit: parsedLimit,
        offset: parsedOffset,
        filters: filters,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logError(error, 'get_opportunities_api_failed', {
      query: req.query,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch opportunities',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /opportunities/:id
 * Get a specific opportunity by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Opportunity ID is required',
        timestamp: new Date().toISOString(),
      });
    }

    logger.info('Fetching opportunity by ID', { id });

    const opportunity = await samOpportunitiesService.getOpportunityById(id);

    return res.json({
      success: true,
      data: opportunity,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    
    logError(error, 'get_opportunity_by_id_api_failed', {
      id: req.params.id,
    });

    return res.status(statusCode).json({
      success: false,
      error: statusCode === 404 ? 'Not Found' : 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /opportunities/naics/:naicsCode
 * Get opportunities for a specific NAICS code
 */
router.get('/naics/:naicsCode', async (req: Request, res: Response) => {
  try {
    const { naicsCode } = req.params;
    const {
      limit = '50',
      offset = '0',
      postedFrom,
      postedTo,
      minAmount,
      maxAmount,
      searchTerm,
    } = req.query;

    const parsedLimit = Math.min(parseInt(limit as string, 10) || 50, 1000);
    const parsedOffset = Math.max(parseInt(offset as string, 10) || 0, 0);

    const filters = {
      naicsCode,
      ...(postedFrom && { postedFrom: postedFrom as string }),
      ...(postedTo && { postedTo: postedTo as string }),
      ...(searchTerm && { searchTerm: searchTerm as string }),
      ...(minAmount && { minAmount: parseFloat(minAmount as string) }),
      ...(maxAmount && { maxAmount: parseFloat(maxAmount as string) }),
    };

    logger.info('Fetching opportunities by NAICS code', { naicsCode, filters });

    const result = await samOpportunitiesService.getOpportunitiesByNaics(
      naicsCode,
      filters,
      parsedLimit,
      parsedOffset
    );

    res.json({
      success: true,
      opportunities: result.opportunities,
      total: result.total,
      meta: {
        naicsCode,
        count: result.opportunities.length,
        total: result.total,
        limit: parsedLimit,
        offset: parsedOffset,
        filters,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logError(error, 'get_opportunities_by_naics_api_failed', {
      naicsCode: req.params.naicsCode,
      query: req.query,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch opportunities by NAICS code',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /opportunities/:id/analyze
 * Analyze a specific opportunity with AI
 */
router.post('/:id/analyze', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    logger.info('Analyzing opportunity with AI', { opportunityId: id });

    // Get the opportunity first
    const opportunity = await samOpportunitiesService.getOpportunityById(id);
    if (!opportunity) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Opportunity not found',
        timestamp: new Date().toISOString(),
      });
    }

    // Analyze with AI (implement this method in the service)
    const analysisResult = await samOpportunitiesService.analyzeOpportunitiesWithAI(
      opportunity.naicsCode,
      1
    );

    res.json({
      success: true,
      analysis: analysisResult,
      opportunity: {
        id: opportunity.id,
        opportunityId: opportunity.opportunityId,
        title: opportunity.title,
        naicsCode: opportunity.naicsCode,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logError(error, 'analyze_opportunity_api_failed', {
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

export { router as opportunitiesRouter };
