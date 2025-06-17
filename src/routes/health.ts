import { Router, Request, Response } from 'express';
import { healthCheckService } from '../services/healthCheckService';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /health
 * Quick health check endpoint for load balancers
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const quickHealth = await healthCheckService.getQuickHealth();
    
    const statusCode = quickHealth.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      status: quickHealth.status,
      message: quickHealth.message,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Quick health check failed', { error: error.message });
    
    res.status(503).json({
      status: 'unhealthy',
      message: 'Health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /health/detailed
 * Comprehensive health check with all component details
 */
router.get('/detailed', async (req: Request, res: Response) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const healthResult = await healthCheckService.performHealthCheck(forceRefresh);
    
    const statusCode = healthResult.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json(healthResult);
  } catch (error: any) {
    logger.error('Detailed health check failed', { error: error.message });
    
    res.status(503).json({
      status: 'unhealthy',
      message: 'Detailed health check failed',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /health/liveness
 * Kubernetes liveness probe endpoint
 */
router.get('/liveness', (req: Request, res: Response) => {
  // Simple liveness check - if the process is running, it's alive
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    pid: process.pid,
  });
});

/**
 * GET /health/readiness
 * Kubernetes readiness probe endpoint
 */
router.get('/readiness', async (req: Request, res: Response) => {
  try {
    const quickHealth = await healthCheckService.getQuickHealth();
    
    const statusCode = quickHealth.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      status: quickHealth.status === 'healthy' ? 'ready' : 'not_ready',
      message: quickHealth.message,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Readiness check failed', { error: error.message });
    
    res.status(503).json({
      status: 'not_ready',
      message: 'Readiness check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /health/cache/clear
 * Clear health check cache (for testing/debugging)
 */
router.post('/cache/clear', (req: Request, res: Response) => {
  try {
    healthCheckService.clearCache();
    
    logger.info('Health check cache cleared');
    
    res.json({
      message: 'Health check cache cleared successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Failed to clear health check cache', { error: error.message });
    
    res.status(500).json({
      error: 'Failed to clear cache',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

export { router as healthRouter };
