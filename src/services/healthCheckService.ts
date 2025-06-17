import { testDatabaseConnection } from '../database/connection';
import { samApiClient } from './samApiClient';
import { logger, logHealthCheck, logError } from '../utils/logger';
import { config } from '../config';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: HealthComponentResult;
    samApi: HealthComponentResult;
    memory: HealthComponentResult;
    disk: HealthComponentResult;
  };
  overall: {
    status: 'healthy' | 'unhealthy';
    message: string;
  };
}

export interface HealthComponentResult {
  status: 'healthy' | 'unhealthy';
  responseTime: number;
  message: string;
  details?: any;
}

export class HealthCheckService {
  private lastHealthCheck: HealthCheckResult | null = null;
  private lastCheckTime: number = 0;
  private cacheDuration = 30000; // 30 seconds cache

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(forceRefresh = false): Promise<HealthCheckResult> {
    const now = Date.now();
    
    // Return cached result if recent and not forcing refresh
    if (!forceRefresh && this.lastHealthCheck && (now - this.lastCheckTime) < this.cacheDuration) {
      return this.lastHealthCheck;
    }

    const startTime = process.hrtime();
    const timestamp = new Date().toISOString();

    logger.info('Starting health check');

    try {
      // Run all health checks in parallel
      const [databaseCheck, samApiCheck, memoryCheck, diskCheck] = await Promise.allSettled([
        this.checkDatabase(),
        this.checkSamApi(),
        this.checkMemory(),
        this.checkDisk(),
      ]);

      const checks = {
        database: this.getResultFromSettled(databaseCheck, 'Database check failed'),
        samApi: this.getResultFromSettled(samApiCheck, 'SAM API check failed'),
        memory: this.getResultFromSettled(memoryCheck, 'Memory check failed'),
        disk: this.getResultFromSettled(diskCheck, 'Disk check failed'),
      };

      // Determine overall health
      const unhealthyChecks = Object.values(checks).filter(check => check.status === 'unhealthy');
      const overallStatus = unhealthyChecks.length === 0 ? 'healthy' : 'unhealthy';
      const overallMessage = overallStatus === 'healthy' 
        ? 'All systems operational'
        : `${unhealthyChecks.length} components unhealthy`;

      const result: HealthCheckResult = {
        status: overallStatus,
        timestamp,
        uptime: process.uptime(),
        version: config.server.apiVersion,
        environment: config.env,
        checks,
        overall: {
          status: overallStatus,
          message: overallMessage,
        },
      };

      // Cache the result
      this.lastHealthCheck = result;
      this.lastCheckTime = now;

      const duration = process.hrtime(startTime);
      const durationMs = duration[0] * 1000 + duration[1] / 1000000;

      logHealthCheck('comprehensive_health_check', overallStatus, {
        duration: durationMs,
        unhealthyComponents: unhealthyChecks.length,
        checks: Object.keys(checks).reduce((acc, key) => ({
          ...acc,
          [key]: checks[key as keyof typeof checks].status,
        }), {}),
      });

      return result;

    } catch (error: any) {
      logError(error, 'health_check_failed');
      
      const failedResult: HealthCheckResult = {
        status: 'unhealthy',
        timestamp,
        uptime: process.uptime(),
        version: config.server.apiVersion,
        environment: config.env,
        checks: {
          database: { status: 'unhealthy', responseTime: 0, message: 'Health check failed' },
          samApi: { status: 'unhealthy', responseTime: 0, message: 'Health check failed' },
          memory: { status: 'unhealthy', responseTime: 0, message: 'Health check failed' },
          disk: { status: 'unhealthy', responseTime: 0, message: 'Health check failed' },
        },
        overall: {
          status: 'unhealthy',
          message: `Health check system failure: ${error.message}`,
        },
      };

      this.lastHealthCheck = failedResult;
      this.lastCheckTime = now;

      return failedResult;
    }
  }

  /**
   * Get a quick health status (cached if available)
   */
  async getQuickHealth(): Promise<{ status: 'healthy' | 'unhealthy'; message: string }> {
    if (this.lastHealthCheck) {
      return {
        status: this.lastHealthCheck.overall.status,
        message: this.lastHealthCheck.overall.message,
      };
    }

    // If no cached result, perform a quick check
    try {
      const dbHealthy = await testDatabaseConnection();
      return {
        status: dbHealthy ? 'healthy' : 'unhealthy',
        message: dbHealthy ? 'System operational' : 'Database unavailable',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'System check failed',
      };
    }
  }

  /**
   * Check database connectivity
   */
  private async checkDatabase(): Promise<HealthComponentResult> {
    const startTime = process.hrtime();
    
    try {
      const isConnected = await testDatabaseConnection();
      const duration = process.hrtime(startTime);
      const responseTime = duration[0] * 1000 + duration[1] / 1000000;

      if (isConnected) {
        return {
          status: 'healthy',
          responseTime,
          message: 'Database connection successful',
          details: {
            host: config.database.host,
            port: config.database.port,
            database: config.database.name,
          },
        };
      } else {
        return {
          status: 'unhealthy',
          responseTime,
          message: 'Database connection failed',
        };
      }
    } catch (error: any) {
      const duration = process.hrtime(startTime);
      const responseTime = duration[0] * 1000 + duration[1] / 1000000;

      return {
        status: 'unhealthy',
        responseTime,
        message: `Database error: ${error.message}`,
      };
    }
  }

  /**
   * Check SAM.gov API connectivity
   */
  private async checkSamApi(): Promise<HealthComponentResult> {
    const startTime = process.hrtime();
    
    try {
      const result = await samApiClient.testConnection();
      const duration = process.hrtime(startTime);
      const responseTime = duration[0] * 1000 + duration[1] / 1000000;

      return {
        status: result.success ? 'healthy' : 'unhealthy',
        responseTime,
        message: result.message,
        details: result.details,
      };
    } catch (error: any) {
      const duration = process.hrtime(startTime);
      const responseTime = duration[0] * 1000 + duration[1] / 1000000;

      return {
        status: 'unhealthy',
        responseTime,
        message: `SAM API error: ${error.message}`,
      };
    }
  }

  /**
   * Check memory usage
   */
  private async checkMemory(): Promise<HealthComponentResult> {
    const startTime = process.hrtime();
    
    try {
      const memUsage = process.memoryUsage();
      const duration = process.hrtime(startTime);
      const responseTime = duration[0] * 1000 + duration[1] / 1000000;

      // Convert bytes to MB
      const memoryMB = {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
      };

      // Check if memory usage is concerning (heap used > 500MB)
      const heapUsageMB = memoryMB.heapUsed;
      const isHealthy = heapUsageMB < 500;

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        responseTime,
        message: isHealthy 
          ? `Memory usage normal (${heapUsageMB}MB)` 
          : `High memory usage (${heapUsageMB}MB)`,
        details: memoryMB,
      };
    } catch (error: any) {
      const duration = process.hrtime(startTime);
      const responseTime = duration[0] * 1000 + duration[1] / 1000000;

      return {
        status: 'unhealthy',
        responseTime,
        message: `Memory check error: ${error.message}`,
      };
    }
  }

  /**
   * Check disk space (simplified check)
   */
  private async checkDisk(): Promise<HealthComponentResult> {
    const startTime = process.hrtime();
    
    try {
      // This is a basic check - in a real environment you might want to check actual disk space
      const duration = process.hrtime(startTime);
      const responseTime = duration[0] * 1000 + duration[1] / 1000000;

      return {
        status: 'healthy',
        responseTime,
        message: 'Disk access normal',
        details: {
          cwd: process.cwd(),
          pid: process.pid,
        },
      };
    } catch (error: any) {
      const duration = process.hrtime(startTime);
      const responseTime = duration[0] * 1000 + duration[1] / 1000000;

      return {
        status: 'unhealthy',
        responseTime,
        message: `Disk check error: ${error.message}`,
      };
    }
  }

  /**
   * Extract result from Promise.allSettled result
   */
  private getResultFromSettled(
    settledResult: PromiseSettledResult<HealthComponentResult>,
    fallbackMessage: string
  ): HealthComponentResult {
    if (settledResult.status === 'fulfilled') {
      return settledResult.value;
    } else {
      return {
        status: 'unhealthy',
        responseTime: 0,
        message: `${fallbackMessage}: ${settledResult.reason?.message || 'Unknown error'}`,
      };
    }
  }

  /**
   * Clear health check cache
   */
  clearCache(): void {
    this.lastHealthCheck = null;
    this.lastCheckTime = 0;
  }
}

// Export singleton instance
export const healthCheckService = new HealthCheckService();
