import knex from 'knex';
import { config } from '../config';

// Database connection configuration
const dbConfig = {
  client: 'postgresql',
  connection: {
    host: config.database.host,
    port: config.database.port,
    database: config.database.name,
    user: config.database.user,
    password: config.database.password,
    ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
  },
  pool: {
    min: config.database.pool.min,
    max: config.database.pool.max,
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: './src/database/migrations',
  },
  acquireConnectionTimeout: 60000,
  createTimeoutMillis: 30000,
  destroyTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  reapIntervalMillis: 1000,
  createRetryIntervalMillis: 100,
  propagateCreateError: false,
};

// Create database connection
export const db = knex(dbConfig);

// Test database connection
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await db.raw('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function closeDatabaseConnection(): Promise<void> {
  await db.destroy();
}

export default db;
