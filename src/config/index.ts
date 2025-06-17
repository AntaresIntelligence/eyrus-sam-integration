import dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config();

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  PORT: Joi.number().positive().default(3000),
  API_VERSION: Joi.string().default('v1'),
  
  // Database
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().positive().default(5432),
  DB_NAME: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_SSL: Joi.boolean().default(false),
  DB_POOL_MIN: Joi.number().min(1).default(2),
  DB_POOL_MAX: Joi.number().min(1).default(10),
  
  // SAM.gov API
  SAM_API_BASE_URL: Joi.string().uri().required(),
  SAM_API_KEY: Joi.string().required(),
  SAM_API_KEYS: Joi.string().optional(),
  SAM_RATE_LIMIT_PER_MINUTE: Joi.number().positive().default(60),
  SAM_REQUEST_TIMEOUT: Joi.number().positive().default(30000),
  SAM_MAX_RETRIES: Joi.number().min(0).default(3),
  SAM_RETRY_DELAY: Joi.number().positive().default(1000),
  
  // Monitoring
  HEALTH_CHECK_INTERVAL: Joi.number().positive().default(300000),
  ALERT_EMAIL: Joi.string().email(),
  SENTRY_DSN: Joi.string().uri(),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: Joi.number().positive().default(900000),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().positive().default(100),
  
  // Sync Configuration
  SYNC_INTERVAL_MINUTES: Joi.number().positive().default(30),
  SYNC_BATCH_SIZE: Joi.number().positive().default(100),
  MAX_SYNC_RETRIES: Joi.number().min(0).default(5),
  
  // Data Retention
  DATA_RETENTION_DAYS: Joi.number().positive().default(365),
  CLEANUP_INTERVAL_HOURS: Joi.number().positive().default(24),
  
  // Flowise AI
  FLOWISE_API_URL: Joi.string().uri().required(),
  FLOWISE_API_KEY: Joi.string().required(),
  FLOWISE_TIMEOUT: Joi.number().positive().default(30000),
  
  // Target NAICS Codes
  TARGET_NAICS_CODES: Joi.string().default('236210,236220,237110,237130,237310,237990'),
  
  // Opportunities Date Range
  OPPORTUNITIES_DATE_FROM: Joi.string().default('2025-01-01'),
  OPPORTUNITIES_DATE_TO: Joi.string().default('2025-06-16'),
  
  // Sales Filtering
  SALES_MIN_CONTRACT_VALUE: Joi.number().positive().default(100000),
  SALES_MAX_CONTRACT_VALUE: Joi.number().positive().default(50000000),
  SALES_PREFERRED_DEPARTMENTS: Joi.string().default('Department of Defense,Department of Veterans Affairs,General Services Administration,Army Corps of Engineers'),
}).unknown();

const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export const config = {
  env: envVars.NODE_ENV,
  log: {
    level: envVars.LOG_LEVEL,
  },
  server: {
    port: envVars.PORT,
    apiVersion: envVars.API_VERSION,
  },
  database: {
    host: envVars.DB_HOST,
    port: envVars.DB_PORT,
    name: envVars.DB_NAME,
    user: envVars.DB_USER,
    password: envVars.DB_PASSWORD,
    ssl: envVars.DB_SSL,
    pool: {
      min: envVars.DB_POOL_MIN,
      max: envVars.DB_POOL_MAX,
    },
  },
  sam: {
    apiBaseUrl: envVars.SAM_API_BASE_URL,
    apiKey: envVars.SAM_API_KEY,
    apiKeys: envVars.SAM_API_KEYS ? envVars.SAM_API_KEYS.split(',').map((key: string) => key.trim()) : [envVars.SAM_API_KEY],
    rateLimitPerMinute: envVars.SAM_RATE_LIMIT_PER_MINUTE,
    requestTimeout: envVars.SAM_REQUEST_TIMEOUT,
    maxRetries: envVars.SAM_MAX_RETRIES,
    retryDelay: envVars.SAM_RETRY_DELAY,
  },
  monitoring: {
    healthCheckInterval: envVars.HEALTH_CHECK_INTERVAL,
    alertEmail: envVars.ALERT_EMAIL,
    sentryDsn: envVars.SENTRY_DSN,
  },
  rateLimit: {
    windowMs: envVars.RATE_LIMIT_WINDOW_MS,
    maxRequests: envVars.RATE_LIMIT_MAX_REQUESTS,
  },
  sync: {
    intervalMinutes: envVars.SYNC_INTERVAL_MINUTES,
    batchSize: envVars.SYNC_BATCH_SIZE,
    maxRetries: envVars.MAX_SYNC_RETRIES,
  },
  dataRetention: {
    retentionDays: envVars.DATA_RETENTION_DAYS,
    cleanupIntervalHours: envVars.CLEANUP_INTERVAL_HOURS,
  },
  flowise: {
    apiUrl: envVars.FLOWISE_API_URL,
    apiKey: envVars.FLOWISE_API_KEY,
    timeout: envVars.FLOWISE_TIMEOUT,
  },
  business: {
    targetNaicsCodes: envVars.TARGET_NAICS_CODES.split(',').map((code: string) => code.trim()),
    opportunitiesDateFrom: envVars.OPPORTUNITIES_DATE_FROM,
    opportunitiesDateTo: envVars.OPPORTUNITIES_DATE_TO,
  },
  sales: {
    minContractValue: envVars.SALES_MIN_CONTRACT_VALUE,
    maxContractValue: envVars.SALES_MAX_CONTRACT_VALUE,
    preferredDepartments: envVars.SALES_PREFERRED_DEPARTMENTS.split(',').map((dept: string) => dept.trim()),
  },
};

export default config;
