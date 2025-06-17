import { Router, Request, Response } from 'express';
import { samOpportunitiesService } from '../services/samOpportunitiesService';
import { logger, logError, logBusinessEvent } from '../utils/logger';

const router = Router();

/**
 * POST /sync/manual
 * Trigger a manual sync operation
 */
router.post('/manual', async (req: Request, res: Response) => {
  try {
    const {
      postedFrom,
      postedTo,
      ptype = 'a',
      ncode = '236220',
      dryRun = false,
    } = req.body;

    // Validate required parameters
    if (!postedFrom || !postedTo) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'postedFrom and postedTo are required parameters',
        timestamp: new Date().toISOString(),
      });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(postedFrom) || !dateRegex.test(postedTo)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Dates must be in YYYY-MM-DD format',
        timestamp: new Date().toISOString(),
      });
    }

    // Validate date range
    const fromDate = new Date(postedFrom);
    const toDate = new Date(postedTo);
    
    if (fromDate > toDate) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'postedFrom must be before or equal to postedTo',
        timestamp: new Date().toISOString(),
      });
    }

    const syncOptions = {
      postedFrom,
      postedTo,
      ptype,
      ncode,
      dryRun: Boolean(dryRun),
    };

    logger.info('Manual sync triggered', { 
      syncOptions,
      requestedBy: req.ip,
    });

    logBusinessEvent('manual_sync_triggered', {
      syncOptions,
      requestedBy: req.ip,
    });

    // Start the sync operation (don't await to return response immediately)
    const syncPromise = samOpportunitiesService.syncOpportunities(syncOptions);

    // Return immediately with sync ID
    res.json({
      success: true,
      message: 'Manual sync started successfully',
      syncOptions,
      timestamp: new Date().toISOString(),
    });

    // Log the result when sync completes
    syncPromise
      .then((result) => {
        logBusinessEvent('manual_sync_completed', {
          syncId: result.syncId,
          success: result.success,
          recordsProcessed: result.recordsProcessed,
          duration: result.duration,
          requestedBy: req.ip,
        });
      })
      .catch((error) => {
        logError(error, 'manual_sync_failed', {
          syncOptions,
          requestedBy: req.ip,
        });
      });

  } catch (error: any) {
    logError(error, 'manual_sync_api_failed', {
      body: req.body,
      requestedBy: req.ip,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to start manual sync',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /sync/test
 * Test SAM.gov API connectivity
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    logger.info('API connection test triggered', { requestedBy: req.ip });

    const testResult = await samOpportunitiesService.testApiConnection();

    const statusCode = testResult.success ? 200 : 502;

    res.status(statusCode).json({
      success: testResult.success,
      message: testResult.message,
      details: testResult.details,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logError(error, 'api_test_failed', { requestedBy: req.ip });

    res.status(500).json({
      success: false,
      error: 'API test failed',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /sync/history
 * Get sync history
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const { limit = '50' } = req.query;
    const parsedLimit = Math.min(parseInt(limit as string, 10) || 50, 200); // Max 200

    logger.info('Fetching sync history', { limit: parsedLimit });

    const syncHistory = await samOpportunitiesService.getSyncHistory(parsedLimit);

    res.json({
      success: true,
      data: syncHistory,
      meta: {
        count: syncHistory.length,
        limit: parsedLimit,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logError(error, 'get_sync_history_api_failed', {
      query: req.query,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch sync history',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /sync/cleanup
 * Trigger data cleanup (remove old records)
 */
router.post('/cleanup', async (req: Request, res: Response) => {
  try {
    logger.info('Data cleanup triggered', { requestedBy: req.ip });

    const result = await samOpportunitiesService.cleanupOldData();

    logBusinessEvent('manual_cleanup_completed', {
      deletedRecords: result.deletedRecords,
      cutoffDate: result.cutoffDate,
      requestedBy: req.ip,
    });

    res.json({
      success: true,
      message: 'Data cleanup completed successfully',
      deletedRecords: result.deletedRecords,
      cutoffDate: result.cutoffDate,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logError(error, 'manual_cleanup_failed', { requestedBy: req.ip });

    res.status(500).json({
      success: false,
      error: 'Data cleanup failed',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /sync/status
 * Get current sync status and statistics
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    logger.info('Fetching sync status');

    // Get recent sync logs to determine current status
    const recentSyncs = await samOpportunitiesService.getSyncHistory(10);
    
    const currentStatus = {
      lastSync: recentSyncs[0] || null,
      recentSyncs: recentSyncs.slice(0, 5),
      statistics: {
        totalSyncs: recentSyncs.length,
        // Add more statistics as needed
      },
    };

    res.json({
      success: true,
      data: currentStatus,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logError(error, 'get_sync_status_api_failed');

    res.status(500).json({
      success: false,
      error: 'Failed to fetch sync status',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

export { router as syncRouter };
