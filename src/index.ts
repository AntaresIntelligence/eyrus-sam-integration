import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import cron from 'node-cron';

import { config } from './config';
import { logger, logApiRequest, logError, logBusinessEvent } from './utils/logger';
import { testDatabaseConnection, closeDatabaseConnection } from './database/connection';
import { samOpportunitiesService } from './services/samOpportunitiesService';
import { healthCheckService } from './services/healthCheckService';

// Import routes
import { opportunitiesRouter } from './routes/opportunities';
import { healthRouter } from './routes/health';
import { syncRouter } from './routes/sync';

class EyrusSamIntegrationApp {
  private app: Application;
  private rateLimiter: RateLimiterMemory;
  private server: any;
  private isShuttingDown = false;

  constructor() {
    this.app = express();
    this.initializeRateLimiter();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeScheduledTasks();
  }

  /**
   * Initialize rate limiter
   */
  private initializeRateLimiter(): void {
    this.rateLimiter = new RateLimiterMemory({
      keyGenerator: (req) => req.ip,
      points: config.rateLimit.maxRequests,
      duration: config.rateLimit.windowMs / 1000,
      blockDuration: 60, // Block for 60 seconds if exceeded
    });
  }

  /**
   * Initialize Express middleware
   */
  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS
    this.app.use(cors({
      origin: config.env === 'production' ? false : true,
      credentials: true,
    }));

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting middleware
    this.app.use(async (req: Request, res: Response, next: NextFunction) => {
      try {
        await this.rateLimiter.consume(req.ip);
        next();
      } catch (rateLimitRes) {
        const remainingTime = Math.round(rateLimitRes.msBeforeNext / 1000) || 1;
        
        logger.warn('Rate limit exceeded', {
          ip: req.ip,
          url: req.url,
          method: req.method,
          remainingTime,
        });

        res.set({
          'Retry-After': remainingTime,
          'X-RateLimit-Limit': config.rateLimit.maxRequests,
          'X-RateLimit-Remaining': rateLimitRes.remainingPoints || 0,
          'X-RateLimit-Reset': new Date(Date.now() + rateLimitRes.msBeforeNext),
        });

        res.status(429).json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again in ${remainingTime} seconds.`,
          retryAfter: remainingTime,
        });
      }
    });

    // Request logging middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        logApiRequest(req.method, req.url, res.statusCode, duration, {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        });
      });

      next();
    });

    // Health check bypass (no auth required)
    this.app.use('/health', (req: Request, res: Response, next: NextFunction) => {
      next();
    });
  }

  /**
   * Initialize API routes
   */
  private initializeRoutes(): void {
    // API versioning
    const apiPrefix = `/api/${config.server.apiVersion}`;

    // Health check routes (no versioning)
    this.app.use('/health', healthRouter);

    // Main API routes
    this.app.use(`${apiPrefix}/opportunities`, opportunitiesRouter);
    this.app.use(`${apiPrefix}/sync`, syncRouter);

    // Root endpoint
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        name: 'Eyrus SAM Integration API',
        version: config.server.apiVersion,
        status: 'operational',
        timestamp: new Date().toISOString(),
        endpoints: {
          health: '/health',
          opportunities: `${apiPrefix}/opportunities`,
          sync: `${apiPrefix}/sync`,
        },
      });
    });

    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      logger.warn('Route not found', {
        method: req.method,
        url: req.url,
        ip: req.ip,
      });

      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.url} not found`,
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * Initialize error handling middleware
   */
  private initializeErrorHandling(): void {
    // Global error handler
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      logError(error, 'global_error_handler', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      if (res.headersSent) {
        return next(error);
      }

      // Don't expose sensitive error details in production
      const isDevelopment = config.env === 'development';
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: isDevelopment ? error.message : 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
        ...(isDevelopment && { stack: error.stack }),
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logError(error, 'uncaught_exception');
      this.gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      logError(new Error(String(reason)), 'unhandled_rejection', { promise });
      this.gracefulShutdown('UNHANDLED_REJECTION');
    });

    // Handle termination signals
    process.on('SIGTERM', () => {
      logger.info('Received SIGTERM signal');
      this.gracefulShutdown('SIGTERM');
    });

    process.on('SIGINT', () => {
      logger.info('Received SIGINT signal');
      this.gracefulShutdown('SIGINT');
    });
  }

  /**
   * Initialize scheduled tasks
   */
  private initializeScheduledTasks(): void {
    // Scheduled sync task - runs every configured interval
    const syncCronExpression = this.minutesToCron(config.sync.intervalMinutes);
    
    cron.schedule(syncCronExpression, async () => {
      if (this.isShuttingDown) {
        logger.info('Skipping scheduled sync - application is shutting down');
        return;
      }

      try {
        logger.info('Starting scheduled SAM opportunities sync');
        
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);

        const result = await samOpportunitiesService.syncOpportunities({
          postedFrom: thirtyDaysAgo.toISOString().split('T')[0],
          postedTo: today.toISOString().split('T')[0],
          ptype: 'a', // Award notices
          ncode: '236220', // NAICS code from requirements
        });

        logBusinessEvent('scheduled_sync_completed', {
          syncId: result.syncId,
          success: result.success,
          recordsProcessed: result.recordsProcessed,
          duration: result.duration,
        });

      } catch (error: any) {
        logError(error, 'scheduled_sync_failed');
      }
    }, {
      name: 'sam-opportunities-sync',
      scheduled: true,
      timezone: 'UTC',
    });

    // Data cleanup task - runs daily
    cron.schedule('0 2 * * *', async () => { // 2 AM UTC daily
      if (this.isShuttingDown) {
        logger.info('Skipping scheduled cleanup - application is shutting down');
        return;
      }

      try {
        logger.info('Starting scheduled data cleanup');
        
        const result = await samOpportunitiesService.cleanupOldData();
        
        logBusinessEvent('scheduled_cleanup_completed', {
          deletedRecords: result.deletedRecords,
          cutoffDate: result.cutoffDate,
        });

      } catch (error: any) {
        logError(error, 'scheduled_cleanup_failed');
      }
    }, {
      name: 'data-cleanup',
      scheduled: true,
      timezone: 'UTC',
    });

    // Health check task - runs every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      if (this.isShuttingDown) {
        return;
      }

      try {
        await healthCheckService.performHealthCheck();
      } catch (error: any) {
        logError(error, 'health_check_failed');
      }
    }, {
      name: 'health-check',
      scheduled: true,
      timezone: 'UTC',
    });

    logger.info('Scheduled tasks initialized', {
      syncInterval: `${config.sync.intervalMinutes} minutes`,
      syncCron: syncCronExpression,
      cleanupCron: '0 2 * * *',
      healthCheckCron: '*/5 * * * *',
    });
  }

  /**
   * Start the application server
   */
  async start(): Promise<void> {
    try {
      // Test database connection
      logger.info('Testing database connection...');
      const dbConnected = await testDatabaseConnection();
      
      if (!dbConnected) {
        throw new Error('Database connection failed');
      }
      
      logger.info('Database connection successful');

      // Test SAM.gov API connection
      logger.info('Testing SAM.gov API connection...');
      const apiTest = await samOpportunitiesService.testApiConnection();
      
      if (!apiTest.success) {
        logger.warn('SAM.gov API connection test failed', apiTest);
      } else {
        logger.info('SAM.gov API connection successful', apiTest.details);
      }

      // Start the HTTP server
      this.server = this.app.listen(config.server.port, () => {
        logger.info('Eyrus SAM Integration started successfully', {
          port: config.server.port,
          env: config.env,
          apiVersion: config.server.apiVersion,
          nodeVersion: process.version,
          pid: process.pid,
        });

        logBusinessEvent('application_started', {
          port: config.server.port,
          env: config.env,
          version: config.server.apiVersion,
        });
      });

      // Configure server timeout
      this.server.timeout = 60000; // 60 seconds
      this.server.keepAliveTimeout = 65000; // 65 seconds

    } catch (error: any) {
      logError(error, 'application_startup_failed');
      process.exit(1);
    }
  }

  /**
   * Graceful shutdown
   */
  private async gracefulShutdown(signal: string): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn('Graceful shutdown already in progress');
      return;
    }

    this.isShuttingDown = true;
    
    logger.info('Starting graceful shutdown', { signal });

    try {
      // Stop accepting new requests
      if (this.server) {
        await new Promise<void>((resolve) => {
          this.server.close(resolve);
        });
        logger.info('HTTP server closed');
      }

      // Close database connections
      await closeDatabaseConnection();
      logger.info('Database connections closed');

      logBusinessEvent('application_shutdown', {
        signal,
        graceful: true,
      });

      logger.info('Graceful shutdown completed');
      process.exit(0);

    } catch (error: any) {
      logError(error, 'graceful_shutdown_failed', { signal });
      process.exit(1);
    }
  }

  /**
   * Convert minutes to cron expression
   */
  private minutesToCron(minutes: number): string {
    if (minutes < 60) {
      return `*/${minutes} * * * *`;
    } else {
      const hours = Math.floor(minutes / 60);
      return `0 */${hours} * * *`;
    }
  }

  /**
   * Get Express app instance
   */
  getApp(): Application {
    return this.app;
  }
}

// Create and start the application
const app = new EyrusSamIntegrationApp();

// Handle startup
if (require.main === module) {
  app.start().catch((error) => {
    logger.error('Failed to start application', { error: error.message });
    process.exit(1);
  });
}

export { app };
export default app;
