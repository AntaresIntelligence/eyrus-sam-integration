import winston from 'winston';
import { config } from '../config';

// Define log levels and colors
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
};

winston.addColors(logColors);

// Custom format for structured logging
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = `\\n${JSON.stringify(meta, null, 2)}`;
    }
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// Create logger instance
export const logger = winston.createLogger({
  levels: logLevels,
  level: config.log.level,
  format: logFormat,
  defaultMeta: {
    service: 'eyrus-sam-integration',
    environment: config.env,
  },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      level: config.env === 'production' ? 'info' : 'debug',
      format: config.env === 'production' ? logFormat : consoleFormat,
    }),
    
    // File transport for errors
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    }),
  ],
  
  // Handle uncaught exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' }),
  ],
});

// Performance logging utility
export const logPerformance = (
  operation: string,
  startTime: [number, number],
  metadata?: Record<string, any>
) => {
  const endTime = process.hrtime(startTime);
  const duration = endTime[0] * 1000 + endTime[1] / 1000000; // Convert to milliseconds
  
  logger.info('Performance metric', {
    operation,
    durationMs: Math.round(duration * 100) / 100,
    ...metadata,
  });
};

// Request logging utility for API calls
export const logApiRequest = (
  method: string,
  url: string,
  statusCode: number,
  duration: number,
  metadata?: Record<string, any>
) => {
  const level = statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'info';
  
  logger.log(level, 'API request completed', {
    method: method.toUpperCase(),
    url,
    statusCode,
    durationMs: Math.round(duration * 100) / 100,
    ...metadata,
  });
};

// Database operation logging utility
export const logDatabaseOperation = (
  operation: string,
  table: string,
  affectedRows: number,
  duration: number,
  metadata?: Record<string, any>
) => {
  logger.info('Database operation completed', {
    operation,
    table,
    affectedRows,
    durationMs: Math.round(duration * 100) / 100,
    ...metadata,
  });
};

// Error logging utility with context
export const logError = (
  error: Error,
  context: string,
  metadata?: Record<string, any>
) => {
  logger.error('Error occurred', {
    context,
    error: error.message,
    stack: error.stack,
    ...metadata,
  });
};

// Health check logging utility
export const logHealthCheck = (
  component: string,
  status: 'healthy' | 'unhealthy',
  details?: Record<string, any>
) => {
  const level = status === 'healthy' ? 'debug' : 'error';
  
  logger.log(level, 'Health check result', {
    component,
    status,
    timestamp: new Date().toISOString(),
    ...details,
  });
};

// Business logic logging utility
export const logBusinessEvent = (
  event: string,
  metadata?: Record<string, any>
) => {
  logger.info('Business event', {
    event,
    timestamp: new Date().toISOString(),
    ...metadata,
  });
};

// Security event logging utility
export const logSecurityEvent = (
  event: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  metadata?: Record<string, any>
) => {
  const level = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
  
  logger.log(level, 'Security event', {
    event,
    severity,
    timestamp: new Date().toISOString(),
    ...metadata,
  });
};

// Sync operation logging utility
export const logSyncOperation = (
  operation: string,
  status: 'started' | 'progress' | 'completed' | 'failed',
  metadata?: Record<string, any>
) => {
  const level = status === 'failed' ? 'error' : status === 'completed' ? 'info' : 'debug';
  
  logger.log(level, 'Sync operation', {
    operation,
    status,
    timestamp: new Date().toISOString(),
    ...metadata,
  });
};

// Create logs directory if it doesn't exist
import { mkdirSync } from 'fs';
try {
  mkdirSync('logs', { recursive: true });
} catch (error) {
  // Directory might already exist, which is fine
}

export default logger;
