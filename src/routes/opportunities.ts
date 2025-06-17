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

    res.json({
      success: true,
      data: opportunity,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    
    logError(error, 'get_opportunity_by_id_api_failed', {
      id: req.params.id,
    });

    res.status(statusCode).json({
      success: false,
      error: statusCode === 404 ? 'Not Found' : 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /opportunities/stats
 * Get opportunity statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    logger.info('Fetching opportunity statistics');

    // This would require implementing a getStatistics method in the service
    // For now, return a placeholder response
    const stats = {
      totalOpportunities: 0,
      totalByType: {},
      totalByDepartment: {},
      recentSyncStatus: {},
    };

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logError(error, 'get_opportunity_stats_api_failed');

    res.status(500).json({
      success: false,
      error: 'Failed to fetch opportunity statistics',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

export { router as opportunitiesRouter };
