import { db } from '../database/connection';
import { logger, logDatabaseOperation } from '../utils/logger';

export interface SamSyncLog {
  id?: string;
  syncType: string;
  status: string;
  startedAt: Date;
  completedAt?: Date;
  recordsProcessed?: number;
  recordsCreated?: number;
  recordsUpdated?: number;
  recordsFailed?: number;
  errorDetails?: any;
  syncParameters?: any;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class SamSyncLogRepository {
  private readonly tableName = 'sam_sync_logs';

  /**
   * Create a new sync log entry
   */
  async createSyncLog(syncLog: Omit<SamSyncLog, 'createdAt' | 'updatedAt'>): Promise<string> {
    const startTime = process.hrtime();
    
    try {
      const [result] = await db(this.tableName)
        .insert({
          id: syncLog.id,
          sync_type: syncLog.syncType,
          status: syncLog.status,
          started_at: syncLog.startedAt,
          completed_at: syncLog.completedAt,
          records_processed: syncLog.recordsProcessed || 0,
          records_created: syncLog.recordsCreated || 0,
          records_updated: syncLog.recordsUpdated || 0,
          records_failed: syncLog.recordsFailed || 0,
          error_details: syncLog.errorDetails,
          sync_parameters: syncLog.syncParameters,
          notes: syncLog.notes,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning('id');

      const duration = process.hrtime(startTime);
      logDatabaseOperation('INSERT', this.tableName, 1, duration[0] * 1000 + duration[1] / 1000000, {
        syncId: syncLog.id,
        syncType: syncLog.syncType,
      });

      return result.id;
    } catch (error: any) {
      logger.error('Failed to create sync log', {
        error: error.message,
        syncId: syncLog.id,
        syncType: syncLog.syncType,
      });
      throw error;
    }
  }

  /**
   * Update an existing sync log
   */
  async updateSyncLog(id: string, updates: Partial<SamSyncLog>): Promise<void> {
    const startTime = process.hrtime();
    
    try {
      const updateData: any = {
        updated_at: new Date(),
      };

      // Map camelCase to snake_case
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.completedAt !== undefined) updateData.completed_at = updates.completedAt;
      if (updates.recordsProcessed !== undefined) updateData.records_processed = updates.recordsProcessed;
      if (updates.recordsCreated !== undefined) updateData.records_created = updates.recordsCreated;
      if (updates.recordsUpdated !== undefined) updateData.records_updated = updates.recordsUpdated;
      if (updates.recordsFailed !== undefined) updateData.records_failed = updates.recordsFailed;
      if (updates.errorDetails !== undefined) updateData.error_details = updates.errorDetails;
      if (updates.syncParameters !== undefined) updateData.sync_parameters = updates.syncParameters;
      if (updates.notes !== undefined) updateData.notes = updates.notes;

      const affectedRows = await db(this.tableName)
        .where('id', id)
        .update(updateData);

      const duration = process.hrtime(startTime);
      logDatabaseOperation('UPDATE', this.tableName, affectedRows, duration[0] * 1000 + duration[1] / 1000000, {
        syncId: id,
        updates: Object.keys(updates),
      });

      if (affectedRows === 0) {
        throw new Error(`Sync log with ID ${id} not found`);
      }
    } catch (error: any) {
      logger.error('Failed to update sync log', {
        error: error.message,
        syncId: id,
        updates: Object.keys(updates),
      });
      throw error;
    }
  }

  /**
   * Get a sync log by ID
   */
  async findById(id: string): Promise<SamSyncLog | null> {
    const startTime = process.hrtime();
    
    try {
      const result = await db(this.tableName)
        .where('id', id)
        .first();

      const duration = process.hrtime(startTime);
      logDatabaseOperation('SELECT', this.tableName, result ? 1 : 0, duration[0] * 1000 + duration[1] / 1000000, {
        syncId: id,
        found: !!result,
      });

      return result ? this.mapDbToModel(result) : null;
    } catch (error: any) {
      logger.error('Failed to find sync log by ID', {
        error: error.message,
        syncId: id,
      });
      throw error;
    }
  }

  /**
   * Get recent sync logs
   */
  async getRecentSyncLogs(limit: number = 50): Promise<SamSyncLog[]> {
    const startTime = process.hrtime();
    
    try {
      const results = await db(this.tableName)
        .orderBy('started_at', 'desc')
        .limit(limit);

      const duration = process.hrtime(startTime);
      logDatabaseOperation('SELECT', this.tableName, results.length, duration[0] * 1000 + duration[1] / 1000000, {
        limit,
        resultCount: results.length,
      });

      return results.map(result => this.mapDbToModel(result));
    } catch (error: any) {
      logger.error('Failed to get recent sync logs', {
        error: error.message,
        limit,
      });
      throw error;
    }
  }

  /**
   * Get sync logs by status
   */
  async getSyncLogsByStatus(status: string, limit: number = 50): Promise<SamSyncLog[]> {
    const startTime = process.hrtime();
    
    try {
      const results = await db(this.tableName)
        .where('status', status)
        .orderBy('started_at', 'desc')
        .limit(limit);

      const duration = process.hrtime(startTime);
      logDatabaseOperation('SELECT', this.tableName, results.length, duration[0] * 1000 + duration[1] / 1000000, {
        status,
        limit,
        resultCount: results.length,
      });

      return results.map(result => this.mapDbToModel(result));
    } catch (error: any) {
      logger.error('Failed to get sync logs by status', {
        error: error.message,
        status,
        limit,
      });
      throw error;
    }
  }

  /**
   * Get sync statistics
   */
  async getSyncStatistics(): Promise<{
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    runningSyncs: number;
    averageDuration: number;
    totalRecordsProcessed: number;
    recentSyncStatus: { [key: string]: number };
  }> {
    try {
      const [
        totalResult,
        statusResult,
        avgDurationResult,
        totalRecordsResult,
      ] = await Promise.all([
        // Total count
        db(this.tableName).count('* as count').first(),
        
        // Count by status
        db(this.tableName)
          .groupBy('status')
          .select('status', db.raw('count(*) as count'))
          .orderBy('count', 'desc'),
        
        // Average duration for completed syncs
        db(this.tableName)
          .where('status', 'completed')
          .whereNotNull('completed_at')
          .select(db.raw('AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000) as avg_duration'))
          .first(),
        
        // Total records processed
        db(this.tableName)
          .sum('records_processed as total')
          .first(),
      ]);

      const statusCounts = statusResult.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count, 10);
        return acc;
      }, {});

      return {
        totalSyncs: parseInt(String(totalResult?.count || '0'), 10),
        successfulSyncs: statusCounts['completed'] || 0,
        failedSyncs: statusCounts['failed'] || 0,
        runningSyncs: statusCounts['running'] || 0,
        averageDuration: parseFloat(String(avgDurationResult?.avg_duration || '0')),
        totalRecordsProcessed: parseInt(String(totalRecordsResult?.total || '0'), 10),
        recentSyncStatus: statusCounts,
      };
    } catch (error: any) {
      logger.error('Failed to get sync statistics', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Clean up old sync logs
   */
  async cleanupOldLogs(cutoffDate: Date): Promise<number> {
    const startTime = process.hrtime();
    
    try {
      const affectedRows = await db(this.tableName)
        .where('started_at', '<', cutoffDate)
        .del();

      const duration = process.hrtime(startTime);
      logDatabaseOperation('DELETE', this.tableName, affectedRows, duration[0] * 1000 + duration[1] / 1000000, {
        operation: 'cleanup',
        cutoffDate: cutoffDate.toISOString(),
      });

      return affectedRows;
    } catch (error: any) {
      logger.error('Failed to cleanup old sync logs', {
        error: error.message,
        cutoffDate: cutoffDate.toISOString(),
      });
      throw error;
    }
  }

  /**
   * Get currently running syncs
   */
  async getActiveSyncs(): Promise<SamSyncLog[]> {
    const startTime = process.hrtime();
    
    try {
      const results = await db(this.tableName)
        .where('status', 'running')
        .orderBy('started_at', 'desc');

      const duration = process.hrtime(startTime);
      logDatabaseOperation('SELECT', this.tableName, results.length, duration[0] * 1000 + duration[1] / 1000000, {
        operation: 'get_active_syncs',
        resultCount: results.length,
      });

      return results.map(result => this.mapDbToModel(result));
    } catch (error: any) {
      logger.error('Failed to get active syncs', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Map database row to model object
   */
  private mapDbToModel(row: any): SamSyncLog {
    return {
      id: row.id,
      syncType: row.sync_type,
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      recordsProcessed: row.records_processed,
      recordsCreated: row.records_created,
      recordsUpdated: row.records_updated,
      recordsFailed: row.records_failed,
      errorDetails: row.error_details,
      syncParameters: row.sync_parameters,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
