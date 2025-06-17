import { Router, Request, Response } from 'express';
import { samOpportunitiesService } from '../services/samOpportunitiesService';
import { SamOpportunityRepository } from '../repositories/samOpportunityRepository';
import { logger, logError } from '../utils/logger';

const router = Router();
const opportunityRepo = new SamOpportunityRepository();

/**
 * GET /statistics
 * Get overall dashboard statistics
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    logger.info('Fetching dashboard statistics');

    const stats = await opportunityRepo.getStatistics();
    
    // Calculate additional statistics
    const totalValue = await calculateTotalValue();
    const avgAward = totalValue && stats.totalOpportunities ? 
      Math.round(totalValue / stats.totalOpportunities) : 0;
    const lastUpdated = await getLastSyncTime();

    const dashboardStats = {
      totalValue,
      avgAward,
      lastUpdated,
      totalOpportunities: stats.totalOpportunities,
      totalByType: stats.totalByType,
      totalByDepartment: stats.totalByDepartment,
      recentSyncStatus: stats.recentSyncStatus,
    };

    res.json({
      success: true,
      data: dashboardStats,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logError(error, 'get_dashboard_statistics_failed');

    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /statistics/naics
 * Get NAICS-specific statistics
 */
router.get('/naics', async (req: Request, res: Response) => {
  try {
    const { dateFrom, dateTo } = req.query;

    logger.info('Fetching NAICS statistics', { dateFrom, dateTo });

    const naicsStats = await samOpportunitiesService.getNaicsStatistics(
      dateFrom as string,
      dateTo as string
    );

    res.json({
      success: true,
      data: naicsStats,
      meta: {
        dateFrom: dateFrom as string || null,
        dateTo: dateTo as string || null,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logError(error, 'get_naics_statistics_failed', {
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch NAICS statistics',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /statistics/summary
 * Get summary statistics for the dashboard
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    logger.info('Fetching summary statistics');

    // Get data in parallel
    const [stats, naicsStats, syncHistory] = await Promise.all([
      opportunityRepo.getStatistics(),
      samOpportunitiesService.getNaicsStatistics(),
      samOpportunitiesService.getSyncHistory(5),
    ]);

    const totalValue = await calculateTotalValue();
    const avgAward = totalValue && stats.totalOpportunities ? 
      Math.round(totalValue / stats.totalOpportunities) : 0;

    const summary = {
      overview: {
        totalOpportunities: stats.totalOpportunities,
        totalValue,
        avgAward,
        lastSync: syncHistory[0]?.completedAt || syncHistory[0]?.startedAt,
      },
      naicsCounts: naicsStats.map((stat: any) => ({
        naicsCode: stat.naicsCode,
        count: stat.count || 0,
        totalValue: stat.totalValue || 0,
        avgValue: stat.avgValue || 0,
      })),
      recentActivity: {
        syncs: syncHistory.slice(0, 3),
        syncStatus: stats.recentSyncStatus,
      },
      trends: {
        byType: stats.totalByType,
        byDepartment: Object.entries(stats.totalByDepartment)
          .slice(0, 5)
          .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {}),
      },
    };

    res.json({
      success: true,
      data: summary,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logError(error, 'get_summary_statistics_failed');

    res.status(500).json({
      success: false,
      error: 'Failed to fetch summary statistics',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Helper function to calculate total value of opportunities
 */
async function calculateTotalValue(): Promise<number> {
  try {
    // This would need to be implemented in the repository
    // For now, return a placeholder
    return 0;
  } catch (error) {
    logger.error('Failed to calculate total value', { error });
    return 0;
  }
}

/**
 * Helper function to get last sync time
 */
async function getLastSyncTime(): Promise<string> {
  try {
    const syncHistory = await samOpportunitiesService.getSyncHistory(1);
    if (syncHistory.length > 0) {
      const lastSync = syncHistory[0];
      const syncTime = lastSync.completedAt || lastSync.startedAt;
      if (syncTime instanceof Date) {
        return syncTime.toISOString();
      }
      return syncTime || 'Unknown';
    }
    return 'Never';
  } catch (error) {
    logger.error('Failed to get last sync time', { error });
    return 'Unknown';
  }
}

export { router as statisticsRouter };