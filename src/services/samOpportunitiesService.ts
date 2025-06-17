import { samApiClient, SamOpportunity, SamApiSearchParams } from './samApiClient';
import { SamOpportunityRepository } from '../repositories/samOpportunityRepository';
import { SamSyncLogRepository } from '../repositories/samSyncLogRepository';
import { naicsOpportunitiesRepository, NaicsOpportunity } from '../repositories/naicsOpportunitiesRepository';
import { flowiseAiService } from './flowiseAiService';
import { logger, logSyncOperation, logBusinessEvent, logError } from '../utils/logger';
import { config } from '../config';
import { v4 as uuidv4 } from 'uuid';

export interface SyncResult {
  success: boolean;
  syncId: string;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  errors: string[];
  duration: number;
  startTime: Date;
  endTime: Date;
}

export interface SyncOptions {
  postedFrom: string;
  postedTo: string;
  ptype?: string;
  ncode?: string;
  batchSize?: number;
  maxRetries?: number;
  dryRun?: boolean;
}

export class SamOpportunitiesService {
  private readonly opportunityRepo: SamOpportunityRepository;
  private readonly syncLogRepo: SamSyncLogRepository;

  constructor() {
    this.opportunityRepo = new SamOpportunityRepository();
    this.syncLogRepo = new SamSyncLogRepository();
  }

  /**
   * Sync SAM.gov opportunities for the specified date range
   */
  async syncOpportunities(options: SyncOptions): Promise<SyncResult> {
    const syncId = uuidv4();
    const startTime = new Date();
    let recordsProcessed = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;
    let recordsFailed = 0;
    const errors: string[] = [];

    logSyncOperation('sam_opportunities_sync', 'started', {
      syncId,
      options,
    });

    try {
      // Create initial sync log entry
      await this.syncLogRepo.createSyncLog({
        id: syncId,
        syncType: 'api_sync',
        status: 'running',
        startedAt: startTime,
        syncParameters: options,
      });

      // Prepare search parameters
      const searchParams: Partial<SamApiSearchParams> = {
        postedFrom: options.postedFrom,
        postedTo: options.postedTo,
        ptype: options.ptype || 'a', // Default to Award Notices
        ncode: options.ncode || '236220', // Default NAICS code from requirements
      };

      logBusinessEvent('sam_sync_api_call_started', {
        syncId,
        searchParams: { ...searchParams, api_key: '[REDACTED]' },
      });

      // Fetch opportunities from SAM.gov API
      const opportunities = await samApiClient.getAllOpportunitiesInDateRange(
        options.postedFrom,
        options.postedTo,
        searchParams
      );

      logBusinessEvent('sam_sync_api_call_completed', {
        syncId,
        totalRecords: opportunities.length,
      });

      // Process opportunities in batches
      const batchSize = options.batchSize || config.sync.batchSize;
      const batches = this.chunkArray(opportunities, batchSize);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const batchNumber = i + 1;

        logSyncOperation('sam_opportunities_batch_processing', 'progress', {
          syncId,
          batchNumber,
          totalBatches: batches.length,
          batchSize: batch?.length || 0,
        });

        try {
          const batchResult = await this.processBatch(batch || [], options.dryRun || false);
          
          recordsProcessed += batchResult.processed;
          recordsCreated += batchResult.created;
          recordsUpdated += batchResult.updated;
          recordsFailed += batchResult.failed;
          
          if (batchResult.errors.length > 0) {
            errors.push(...batchResult.errors);
          }

          // Update sync log with progress
          await this.syncLogRepo.updateSyncLog(syncId, {
            recordsProcessed,
            recordsCreated,
            recordsUpdated,
            recordsFailed,
            errorDetails: errors.length > 0 ? { errors } : null,
          });

        } catch (batchError: any) {
          logError(batchError, 'batch_processing_failed', {
            syncId,
            batchNumber,
            batchSize: batch?.length || 0,
          });
          
          errors.push(`Batch ${batchNumber} failed: ${batchError.message}`);
          recordsFailed += batch?.length || 0;
        }

        // Small delay between batches to prevent overwhelming the database
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      const success = recordsFailed === 0 && errors.length === 0;

      // Update final sync log
      await this.syncLogRepo.updateSyncLog(syncId, {
        status: success ? 'completed' : 'failed',
        completedAt: endTime,
        recordsProcessed,
        recordsCreated,
        recordsUpdated,
        recordsFailed,
        errorDetails: errors.length > 0 ? { errors } : null,
        notes: `Sync completed. Duration: ${duration}ms`,
      });

      const result: SyncResult = {
        success,
        syncId,
        recordsProcessed,
        recordsCreated,
        recordsUpdated,
        recordsFailed,
        errors,
        duration,
        startTime,
        endTime,
      };

      logSyncOperation('sam_opportunities_sync', success ? 'completed' : 'failed', {
        syncId,
        result,
      });

      logBusinessEvent('sam_sync_completed', {
        syncId,
        success,
        recordsProcessed,
        recordsCreated,
        recordsUpdated,
        recordsFailed,
        duration,
      });

      return result;

    } catch (error: any) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      logError(error, 'sam_opportunities_sync_failed', {
        syncId,
        options,
        duration,
      });

      // Update sync log with failure
      await this.syncLogRepo.updateSyncLog(syncId, {
        status: 'failed',
        completedAt: endTime,
        recordsProcessed,
        recordsCreated,
        recordsUpdated,
        recordsFailed: recordsFailed + 1,
        errorDetails: { 
          errors: [...errors, error.message],
          stack: error.stack,
        },
        notes: `Sync failed: ${error.message}`,
      });

      return {
        success: false,
        syncId,
        recordsProcessed,
        recordsCreated,
        recordsUpdated,
        recordsFailed: recordsFailed + 1,
        errors: [...errors, error.message],
        duration,
        startTime,
        endTime,
      };
    }
  }

  /**
   * Get opportunities from database with filtering and pagination
   */
  async getOpportunities(filters: {
    limit?: number;
    offset?: number;
    postedFrom?: string;
    postedTo?: string;
    naicsCode?: string;
    department?: string;
    opportunityType?: string;
    searchTerm?: string;
  }) {
    try {
      logger.info('Fetching opportunities from database', { filters });
      
      const opportunities = await this.opportunityRepo.findOpportunities(filters);
      
      logger.info('Opportunities fetched successfully', {
        count: opportunities.length,
        filters,
      });

      return opportunities;
    } catch (error: any) {
      logError(error, 'get_opportunities_failed', { filters });
      throw error;
    }
  }

  /**
   * Get a specific opportunity by ID
   */
  async getOpportunityById(id: string) {
    try {
      logger.info('Fetching opportunity by ID', { id });
      
      const opportunity = await this.opportunityRepo.findById(id);
      
      if (!opportunity) {
        throw new Error(`Opportunity with ID ${id} not found`);
      }

      return opportunity;
    } catch (error: any) {
      logError(error, 'get_opportunity_by_id_failed', { id });
      throw error;
    }
  }

  /**
   * Test the SAM.gov API connection
   */
  async testApiConnection() {
    try {
      logger.info('Testing SAM.gov API connection');
      
      const result = await samApiClient.testConnection();
      
      logger.info('API connection test completed', result);
      
      return result;
    } catch (error: any) {
      logError(error, 'api_connection_test_failed');
      throw error;
    }
  }

  /**
   * Get sync history
   */
  async getSyncHistory(limit: number = 50) {
    try {
      logger.info('Fetching sync history', { limit });
      
      const syncLogs = await this.syncLogRepo.getRecentSyncLogs(limit);
      
      logger.info('Sync history fetched successfully', { count: syncLogs.length });
      
      return syncLogs;
    } catch (error: any) {
      logError(error, 'get_sync_history_failed', { limit });
      throw error;
    }
  }

  /**
   * Clean up old data based on retention policy
   */
  async cleanupOldData() {
    try {
      const retentionDays = config.dataRetention.retentionDays;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      logger.info('Starting data cleanup', {
        retentionDays,
        cutoffDate: cutoffDate.toISOString(),
      });

      const deletedCount = await this.opportunityRepo.deleteOldRecords(cutoffDate);
      
      logBusinessEvent('data_cleanup_completed', {
        deletedRecords: deletedCount,
        cutoffDate: cutoffDate.toISOString(),
        retentionDays,
      });

      return { deletedRecords: deletedCount, cutoffDate };
    } catch (error: any) {
      logError(error, 'data_cleanup_failed');
      throw error;
    }
  }

  /**
   * Process a batch of opportunities
   */
  private async processBatch(
    opportunities: SamOpportunity[], 
    dryRun: boolean
  ): Promise<{
    processed: number;
    created: number;
    updated: number;
    failed: number;
    errors: string[];
  }> {
    let processed = 0;
    let created = 0;
    let updated = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const opportunity of opportunities) {
      try {
        if (dryRun) {
          logger.debug('Dry run: would process opportunity', {
            opportunityId: opportunity.opportunityId,
            title: opportunity.title,
          });
          processed++;
          continue;
        }

        // Check if opportunity already exists
        if (!opportunity.opportunityId) {
          throw new Error('Missing required opportunityId field');
        }
        
        const existing = await this.opportunityRepo.findByOpportunityId(
          opportunity.opportunityId
        );

        if (existing) {
          // Update existing opportunity
          await this.opportunityRepo.updateOpportunity(existing.id!, {
            ...this.mapApiToDb(opportunity),
            lastSyncedAt: new Date(),
            syncStatus: 'synced',
          });
          updated++;
        } else {
          // Create new opportunity
          await this.opportunityRepo.createOpportunity({
            ...this.mapApiToDb(opportunity),
            lastSyncedAt: new Date(),
            syncStatus: 'synced',
          });
          created++;
        }
        
        processed++;
        
      } catch (error: any) {
        logError(error, 'opportunity_processing_failed', {
          opportunityId: opportunity.opportunityId,
          title: opportunity.title,
        });
        
        errors.push(`Failed to process opportunity ${opportunity.opportunityId || 'undefined'}: ${error.message}`);
        failed++;
      }
    }

    return { processed, created, updated, failed, errors };
  }

  /**
   * Map SAM API opportunity to database format
   */
  private mapApiToDb(opportunity: any): any {
    // The opportunity data is already transformed by samApiClient
    // We just need to ensure correct field mapping for database
    return {
      opportunityId: opportunity.opportunityId, // Already transformed by API client
      noticeId: opportunity.noticeId,
      title: opportunity.title,
      description: opportunity.description,
      opportunityType: opportunity.type,
      baseType: opportunity.baseType,
      archiveType: opportunity.archiveType,
      archiveDate: opportunity.archiveDate,
      classificationCode: opportunity.classificationCode,
      naicsCode: opportunity.naicsCode,
      setAsideCode: opportunity.setAsideCode,
      setAside: opportunity.setAside,
      department: opportunity.department,
      subTier: opportunity.subTier,
      office: opportunity.office,
      solicitationNumber: opportunity.solicitationNumber,
      postedDate: opportunity.postedDate ? new Date(opportunity.postedDate) : null,
      responseDeadline: opportunity.responseDeadLine ? new Date(opportunity.responseDeadLine) : null,
      updatedDate: opportunity.updatedDate ? new Date(opportunity.updatedDate) : null,
      contactInfo: opportunity.contactInfo || [],
      attachments: opportunity.attachments || [],
      awardNumber: opportunity.awardNumber,
      awardAmount: opportunity.awardAmount,
      awardeeName: opportunity.awardeeName,
      awardeeDuns: opportunity.awardeeDuns,
      awardeeCage: opportunity.awardeeCage,
      awardeeInfo: opportunity.awardeeInfo,
      samUrl: opportunity.samUrl,
      relatedNotices: opportunity.relatedNotices || [],
      rawData: opportunity.rawData || opportunity,
      dataSource: 'sam.gov',
    };
  }

  /**
   * Sync opportunities for specific NAICS codes
   */
  async syncOpportunitiesForNaicsCodes(
    naicsCodes: string[] = config.business.targetNaicsCodes,
    options: any = {}
  ): Promise<SyncResult> {
    const syncId = uuidv4();
    const startTime = new Date();
    let recordsProcessed = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;
    let recordsFailed = 0;
    const errors: string[] = [];

    try {
      logger.info('Starting NAICS-specific opportunities sync', {
        syncId,
        naicsCodes,
        options,
      });

      // Create sync log
      await this.syncLogRepo.createSyncLog({
        id: syncId,
        syncType: 'naics_targeted',
        status: 'running',
        startedAt: startTime,
        syncParameters: { naicsCodes, ...options },
      });

      for (const naicsCode of naicsCodes) {
        try {
          logger.info(`Syncing opportunities for NAICS ${naicsCode}`, { syncId, naicsCode });

          // Search for opportunities with this NAICS code
          const searchParams: Partial<SamApiSearchParams> = {
            postedFrom: options.postedFrom || config.business.opportunitiesDateFrom,
            postedTo: options.postedTo || config.business.opportunitiesDateTo,
            ptype: options.ptype || 'a', // Award notices
            ncode: naicsCode,
            limit: 100, // Get more results per NAICS code
            offset: 0,
          };

          const searchResult = await samApiClient.searchOpportunities(searchParams);

          if (searchResult.opportunitiesData && searchResult.opportunitiesData.length > 0) {
            // Process opportunities for this NAICS code
            for (const opportunity of searchResult.opportunitiesData) {
              try {
                // Store in main opportunities table
                const existingOpportunity = await this.opportunityRepo.findByOpportunityId(
                  opportunity.opportunityId
                );

                if (existingOpportunity) {
                  await this.opportunityRepo.updateOpportunity(existingOpportunity.id!, {
                    ...this.mapApiToDb(opportunity),
                    lastSyncedAt: new Date(),
                    syncStatus: 'synced',
                  });
                  recordsUpdated++;
                } else {
                  await this.opportunityRepo.createOpportunity({
                    ...this.mapApiToDb(opportunity),
                    lastSyncedAt: new Date(),
                    syncStatus: 'synced',
                  });
                  recordsCreated++;
                }

                // Store in NAICS-specific table
                await naicsOpportunitiesRepository.upsertOpportunity({
                  opportunityId: opportunity.opportunityId,
                  naicsCode: naicsCode,
                  postedDate: new Date(opportunity.postedDate || new Date()),
                  responseDeadline: opportunity.responseDeadLine ? new Date(opportunity.responseDeadLine) : undefined,
                  awardAmount: opportunity.awardAmount,
                  title: opportunity.title,
                  department: opportunity.department,
                  opportunityType: opportunity.type,
                });

                recordsProcessed++;
              } catch (error: any) {
                recordsFailed++;
                errors.push(`Failed to process opportunity ${opportunity.opportunityId}: ${error.message}`);
                logError(error, 'naics_opportunity_processing_failed', {
                  syncId,
                  naicsCode,
                  opportunityId: opportunity.opportunityId,
                });
              }
            }
          }

          logger.info(`Completed sync for NAICS ${naicsCode}`, {
            syncId,
            naicsCode,
            opportunitiesFound: searchResult.opportunitiesData?.length || 0,
          });

        } catch (error: any) {
          errors.push(`Failed to sync NAICS ${naicsCode}: ${error.message}`);
          logError(error, 'naics_sync_failed', { syncId, naicsCode });
        }
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      const success = errors.length === 0;

      // Update sync log
      await this.syncLogRepo.updateSyncLog(syncId, {
        status: success ? 'completed' : 'failed',
        recordsProcessed,
        recordsCreated,
        recordsUpdated,
        recordsFailed,
        errorDetails: errors.length > 0 ? { errors } : null,
        notes: `NAICS-targeted sync for codes: ${naicsCodes.join(', ')}`,
      });

      logBusinessEvent('naics_sync_completed', {
        syncId,
        success,
        naicsCodes,
        recordsProcessed,
        recordsCreated,
        recordsUpdated,
        recordsFailed,
        duration,
      });

      return {
        success,
        syncId,
        recordsProcessed,
        recordsCreated,
        recordsUpdated,
        recordsFailed,
        errors,
        duration,
        startTime,
        endTime,
      };

    } catch (error: any) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await this.syncLogRepo.updateSyncLog(syncId, {
        status: 'failed',
        recordsProcessed,
        recordsCreated,
        recordsUpdated,
        recordsFailed,
        errorDetails: { error: error.message, errors },
      });

      logError(error, 'naics_sync_failed', { syncId, naicsCodes });
      
      throw error;
    }
  }

  /**
   * Analyze opportunities with Flowise AI
   */
  async analyzeOpportunitiesWithAI(naicsCode?: string, limit: number = 10): Promise<any> {
    try {
      logger.info('Starting AI analysis of opportunities', { naicsCode, limit });

      // Get opportunities that need AI analysis
      const opportunities = await naicsOpportunitiesRepository.getOpportunitiesForAiAnalysis(limit);

      if (opportunities.length === 0) {
        return {
          success: true,
          message: 'No opportunities found that need AI analysis',
          analyzed: 0,
        };
      }

      const results = [];
      let successful = 0;
      let failed = 0;

      for (const opportunity of opportunities) {
        try {
          logger.info('Analyzing opportunity with AI', {
            opportunityId: opportunity.opportunityId,
            naicsCode: opportunity.naicsCode,
          });

          // Get full opportunity data from main table
          const fullOpportunity = await this.opportunityRepo.findByOpportunityId(
            opportunity.opportunityId
          );

          if (fullOpportunity) {
            const aiResult = await flowiseAiService.analyzeOpportunity(fullOpportunity);

            if (aiResult.success) {
              // Update the NAICS opportunity record with AI analysis
              await naicsOpportunitiesRepository.updateAiAnalysis(
                opportunity.opportunityId,
                opportunity.naicsCode,
                aiResult.response
              );

              successful++;
              results.push({
                opportunityId: opportunity.opportunityId,
                naicsCode: opportunity.naicsCode,
                success: true,
                analysis: aiResult.response,
              });
            } else {
              failed++;
              results.push({
                opportunityId: opportunity.opportunityId,
                naicsCode: opportunity.naicsCode,
                success: false,
                error: aiResult.error,
              });
            }
          }

          // Add delay between AI requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error: any) {
          failed++;
          logError(error, 'ai_analysis_failed', {
            opportunityId: opportunity.opportunityId,
            naicsCode: opportunity.naicsCode,
          });

          results.push({
            opportunityId: opportunity.opportunityId,
            naicsCode: opportunity.naicsCode,
            success: false,
            error: error.message,
          });
        }
      }

      logBusinessEvent('ai_analysis_batch_completed', {
        totalOpportunities: opportunities.length,
        successful,
        failed,
      });

      return {
        success: true,
        analyzed: opportunities.length,
        successful,
        failed,
        results,
      };

    } catch (error: any) {
      logError(error, 'ai_analysis_batch_failed', { naicsCode, limit });
      throw error;
    }
  }

  /**
   * Get opportunities by NAICS code with filtering
   */
  async getOpportunitiesByNaics(
    naicsCode: string,
    filters: any = {},
    limit: number = 50,
    offset: number = 0
  ): Promise<{ opportunities: NaicsOpportunity[]; total: number }> {
    try {
      const [opportunities, total] = await Promise.all([
        naicsOpportunitiesRepository.getOpportunitiesByNaics(naicsCode, filters, limit, offset),
        naicsOpportunitiesRepository.countOpportunities({ ...filters, naicsCode }),
      ]);

      return { opportunities, total };
    } catch (error: any) {
      logError(error, 'get_opportunities_by_naics_failed', { naicsCode, filters });
      throw error;
    }
  }

  /**
   * Get NAICS statistics
   */
  async getNaicsStatistics(dateFrom?: string, dateTo?: string): Promise<any> {
    try {
      const stats = await naicsOpportunitiesRepository.getNaicsStatistics(dateFrom, dateTo);
      return stats;
    } catch (error: any) {
      logError(error, 'get_naics_statistics_failed', { dateFrom, dateTo });
      throw error;
    }
  }

  /**
   * Utility function to chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

// Export singleton instance
export const samOpportunitiesService = new SamOpportunitiesService();
