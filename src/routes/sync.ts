import { Router, Request, Response } from 'express';
import { samOpportunitiesService } from '../services/samOpportunitiesService';
import { logger, logError, logBusinessEvent } from '../utils/logger';

const router = Router();

/**
 * POST /sync
 * Trigger a sync operation for multiple NAICS codes
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      naicsCodes = ['236210', '236220', '237110', '237130', '237310', '237990'],
      postedFrom = '2025-01-01',
      postedTo = '2025-06-16',
      ptype = 'a',
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

    const syncOptions = {
      naicsCodes,
      postedFrom,
      postedTo,
      ptype,
      dryRun: Boolean(dryRun),
    };

    logger.info('NAICS-based sync triggered', { 
      syncOptions,
      requestedBy: req.ip,
    });

    logBusinessEvent('naics_sync_triggered', {
      syncOptions,
      requestedBy: req.ip,
    });

    // Start the sync operation
    const result = await samOpportunitiesService.syncOpportunitiesForNaicsCodes(
      naicsCodes,
      syncOptions
    );

    return res.json({
      success: result.success,
      message: result.success ? 'Sync completed successfully' : 'Sync completed with errors',
      syncId: result.syncId,
      recordsProcessed: result.recordsProcessed,
      recordsCreated: result.recordsCreated,
      recordsUpdated: result.recordsUpdated,
      recordsFailed: result.recordsFailed,
      errors: result.errors,
      duration: result.duration,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logError(error, 'naics_sync_api_failed', {
      body: req.body,
      requestedBy: req.ip,
    });

    return res.status(500).json({
      success: false,
      error: 'Failed to start sync',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /sync/sam
 * Trigger SAM.gov sync operation (main UI endpoint)
 */
router.post('/sam', async (req: Request, res: Response) => {
  try {
    const {
      naics_codes = ['236210', '236220', '237110', '237130', '237310', '237990'],
      posted_from = '2025-01-01',
      posted_to = '2025-06-16',
      limit = 1000,
      dry_run = false,
    } = req.body;

    // Validate required parameters
    if (!posted_from || !posted_to) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'posted_from and posted_to are required parameters',
        timestamp: new Date().toISOString(),
      });
    }

    // Validate NAICS codes array
    if (!Array.isArray(naics_codes) || naics_codes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'naics_codes must be a non-empty array',
        timestamp: new Date().toISOString(),
      });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(posted_from) || !dateRegex.test(posted_to)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Dates must be in YYYY-MM-DD format',
        timestamp: new Date().toISOString(),
      });
    }

    // Validate date range
    const fromDate = new Date(posted_from);
    const toDate = new Date(posted_to);
    
    if (fromDate > toDate) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'posted_from must be before or equal to posted_to',
        timestamp: new Date().toISOString(),
      });
    }

    const syncOptions = {
      naicsCodes: naics_codes,
      postedFrom: posted_from,
      postedTo: posted_to,
      ptype: 'a', // Award notices
      dryRun: Boolean(dry_run),
    };

    logger.info('SAM sync triggered from UI', { 
      syncOptions,
      requestedBy: req.ip,
    });

    logBusinessEvent('ui_sam_sync_triggered', {
      syncOptions,
      requestedBy: req.ip,
    });

    // Start the sync operation
    const result = await samOpportunitiesService.syncOpportunitiesForNaicsCodes(
      naics_codes,
      syncOptions
    );

    return res.json({
      success: result.success,
      message: result.success ? 'SAM sync completed successfully' : 'SAM sync completed with errors',
      data: {
        syncId: result.syncId,
        recordsProcessed: result.recordsProcessed,
        recordsCreated: result.recordsCreated,
        recordsUpdated: result.recordsUpdated,
        recordsFailed: result.recordsFailed,
        duration: result.duration,
        startTime: result.startTime,
        endTime: result.endTime,
      },
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logError(error, 'ui_sam_sync_api_failed', {
      body: req.body,
      requestedBy: req.ip,
    });

    return res.status(500).json({
      success: false,
      error: 'Failed to start SAM sync',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /sync/manual
 * Trigger a manual sync operation (legacy endpoint)
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

    // Return immediately with sync ID
    return res.json({
      success: true,
      message: 'Manual sync started successfully',
      syncOptions,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logError(error, 'manual_sync_api_failed', {
      body: req.body,
      requestedBy: req.ip,
    });

    return res.status(500).json({
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
 * GET /sync/active
 * Get active sync operations (for UI polling)
 */
router.get('/active', async (req: Request, res: Response) => {
  try {
    logger.debug('Fetching active sync operations');

    // Get recent sync logs to determine active operations
    const recentSyncs = await samOpportunitiesService.getSyncHistory(20);
    
    // Filter for active/running syncs (those that started but haven't completed)
    const activeSyncs = recentSyncs.filter(sync => 
      sync.status === 'running' || sync.status === 'in_progress' || 
      (sync.status === 'started' && !sync.completedAt)
    );

    // Get the most recent sync for status
    const latestSync = recentSyncs[0] || null;

    res.json({
      success: true,
      data: {
        activeSyncs,
        latestSync,
        hasActiveSync: activeSyncs.length > 0,
        totalActiveOps: activeSyncs.length,
      },
      meta: {
        count: activeSyncs.length,
        lastChecked: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logError(error, 'get_active_syncs_api_failed');

    res.status(500).json({
      success: false,
      error: 'Failed to fetch active sync operations',
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
