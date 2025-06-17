import { db } from '../database/connection';
import { logger, logDatabaseOperation } from '../utils/logger';

export interface SamOpportunity {
  id?: string;
  opportunityId: string;
  noticeId?: string;
  title: string;
  description?: string;
  opportunityType?: string;
  baseType?: string;
  archiveType?: string;
  archiveDate?: string;
  classificationCode?: string;
  naicsCode?: string;
  setAsideCode?: string;
  setAside?: string;
  department?: string;
  subTier?: string;
  office?: string;
  solicitationNumber?: string;
  postedDate?: Date;
  responseDeadline?: Date;
  updatedDate?: Date;
  contactInfo?: any;
  attachments?: any;
  awardNumber?: string;
  awardAmount?: number;
  awardeeName?: string;
  awardeeDuns?: string;
  awardeeCage?: string;
  awardeeInfo?: any;
  samUrl?: string;
  relatedNotices?: any;
  rawData?: any;
  dataSource?: string;
  syncStatus?: string;
  syncError?: string;
  lastSyncedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export interface OpportunityFilters {
  limit?: number;
  offset?: number;
  postedFrom?: string;
  postedTo?: string;
  naicsCode?: string;
  department?: string;
  opportunityType?: string;
  searchTerm?: string;
  syncStatus?: string;
  minAmount?: number;
  maxAmount?: number;
}

export class SamOpportunityRepository {
  private readonly tableName = 'sam_opportunities';

  /**
   * Create a new opportunity record
   */
  async createOpportunity(opportunity: Omit<SamOpportunity, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const startTime = process.hrtime();
    
    try {
      const [result] = await db(this.tableName)
        .insert({
          opportunity_id: opportunity.opportunityId,
          notice_id: opportunity.noticeId,
          title: opportunity.title,
          description: opportunity.description,
          opportunity_type: opportunity.opportunityType,
          base_type: opportunity.baseType,
          archive_type: opportunity.archiveType,
          archive_date: opportunity.archiveDate,
          classification_code: opportunity.classificationCode,
          naics_code: opportunity.naicsCode,
          set_aside_code: opportunity.setAsideCode,
          set_aside: opportunity.setAside,
          department: opportunity.department,
          sub_tier: opportunity.subTier,
          office: opportunity.office,
          solicitation_number: opportunity.solicitationNumber,
          posted_date: opportunity.postedDate,
          response_deadline: opportunity.responseDeadline,
          updated_date: opportunity.updatedDate,
          contact_info: opportunity.contactInfo,
          attachments: opportunity.attachments,
          award_number: opportunity.awardNumber,
          award_amount: opportunity.awardAmount,
          awardee_name: opportunity.awardeeName,
          awardee_duns: opportunity.awardeeDuns,
          awardee_cage: opportunity.awardeeCage,
          awardee_info: opportunity.awardeeInfo,
          sam_url: opportunity.samUrl,
          related_notices: opportunity.relatedNotices,
          raw_data: opportunity.rawData,
          data_source: opportunity.dataSource,
          sync_status: opportunity.syncStatus || 'pending',
          sync_error: opportunity.syncError,
          last_synced_at: opportunity.lastSyncedAt,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning('id');

      const duration = process.hrtime(startTime);
      logDatabaseOperation('INSERT', this.tableName, 1, duration[0] * 1000 + duration[1] / 1000000, {
        opportunityId: opportunity.opportunityId,
      });

      return result.id;
    } catch (error: any) {
      logger.error('Failed to create opportunity', {
        error: error.message,
        opportunityId: opportunity.opportunityId,
      });
      throw error;
    }
  }

  /**
   * Update an existing opportunity
   */
  async updateOpportunity(id: string, updates: Partial<SamOpportunity>): Promise<void> {
    const startTime = process.hrtime();
    
    try {
      // Convert camelCase to snake_case for database
      const dbUpdates: any = { updated_at: new Date() };
      
      if (updates.opportunityId !== undefined) dbUpdates.opportunity_id = updates.opportunityId;
      if (updates.noticeId !== undefined) dbUpdates.notice_id = updates.noticeId;
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.opportunityType !== undefined) dbUpdates.opportunity_type = updates.opportunityType;
      if (updates.baseType !== undefined) dbUpdates.base_type = updates.baseType;
      if (updates.archiveType !== undefined) dbUpdates.archive_type = updates.archiveType;
      if (updates.archiveDate !== undefined) dbUpdates.archive_date = updates.archiveDate;
      if (updates.classificationCode !== undefined) dbUpdates.classification_code = updates.classificationCode;
      if (updates.naicsCode !== undefined) dbUpdates.naics_code = updates.naicsCode;
      if (updates.setAsideCode !== undefined) dbUpdates.set_aside_code = updates.setAsideCode;
      if (updates.setAside !== undefined) dbUpdates.set_aside = updates.setAside;
      if (updates.department !== undefined) dbUpdates.department = updates.department;
      if (updates.subTier !== undefined) dbUpdates.sub_tier = updates.subTier;
      if (updates.office !== undefined) dbUpdates.office = updates.office;
      if (updates.solicitationNumber !== undefined) dbUpdates.solicitation_number = updates.solicitationNumber;
      if (updates.postedDate !== undefined) dbUpdates.posted_date = updates.postedDate;
      if (updates.responseDeadline !== undefined) dbUpdates.response_deadline = updates.responseDeadline;
      if (updates.updatedDate !== undefined) dbUpdates.updated_date = updates.updatedDate;
      if (updates.contactInfo !== undefined) dbUpdates.contact_info = updates.contactInfo;
      if (updates.attachments !== undefined) dbUpdates.attachments = updates.attachments;
      if (updates.awardNumber !== undefined) dbUpdates.award_number = updates.awardNumber;
      if (updates.awardAmount !== undefined) dbUpdates.award_amount = updates.awardAmount;
      if (updates.awardeeName !== undefined) dbUpdates.awardee_name = updates.awardeeName;
      if (updates.awardeeDuns !== undefined) dbUpdates.awardee_duns = updates.awardeeDuns;
      if (updates.awardeeCage !== undefined) dbUpdates.awardee_cage = updates.awardeeCage;
      if (updates.awardeeInfo !== undefined) dbUpdates.awardee_info = updates.awardeeInfo;
      if (updates.samUrl !== undefined) dbUpdates.sam_url = updates.samUrl;
      if (updates.relatedNotices !== undefined) dbUpdates.related_notices = updates.relatedNotices;
      if (updates.rawData !== undefined) dbUpdates.raw_data = updates.rawData;
      if (updates.dataSource !== undefined) dbUpdates.data_source = updates.dataSource;
      if (updates.syncStatus !== undefined) dbUpdates.sync_status = updates.syncStatus;
      if (updates.syncError !== undefined) dbUpdates.sync_error = updates.syncError;
      if (updates.lastSyncedAt !== undefined) dbUpdates.last_synced_at = updates.lastSyncedAt;

      const affectedRows = await db(this.tableName)
        .where('id', id)
        .update(dbUpdates);

      const duration = process.hrtime(startTime);
      logDatabaseOperation('UPDATE', this.tableName, affectedRows, duration[0] * 1000 + duration[1] / 1000000, {
        id,
        updates: Object.keys(updates),
      });

      if (affectedRows === 0) {
        throw new Error(`Opportunity with ID ${id} not found`);
      }
    } catch (error: any) {
      logger.error('Failed to update opportunity', {
        error: error.message,
        id,
        updates: Object.keys(updates),
      });
      throw error;
    }
  }

  /**
   * Find opportunity by ID
   */
  async findById(id: string): Promise<SamOpportunity | null> {
    const startTime = process.hrtime();
    
    try {
      const result = await db(this.tableName)
        .where('id', id)
        .whereNull('deleted_at')
        .first();

      const duration = process.hrtime(startTime);
      logDatabaseOperation('SELECT', this.tableName, result ? 1 : 0, duration[0] * 1000 + duration[1] / 1000000, {
        id,
        found: !!result,
      });

      return result ? this.mapDbToModel(result) : null;
    } catch (error: any) {
      logger.error('Failed to find opportunity by ID', {
        error: error.message,
        id,
      });
      throw error;
    }
  }

  /**
   * Find opportunity by SAM.gov opportunity ID
   */
  async findByOpportunityId(opportunityId: string): Promise<SamOpportunity | null> {
    const startTime = process.hrtime();
    
    try {
      const result = await db(this.tableName)
        .where('opportunity_id', opportunityId)
        .whereNull('deleted_at')
        .first();

      const duration = process.hrtime(startTime);
      logDatabaseOperation('SELECT', this.tableName, result ? 1 : 0, duration[0] * 1000 + duration[1] / 1000000, {
        opportunityId,
        found: !!result,
      });

      return result ? this.mapDbToModel(result) : null;
    } catch (error: any) {
      logger.error('Failed to find opportunity by opportunity ID', {
        error: error.message,
        opportunityId,
      });
      throw error;
    }
  }

  /**
   * Find opportunities with filters and pagination
   */
  async findOpportunities(filters: OpportunityFilters): Promise<SamOpportunity[]> {
    const startTime = process.hrtime();
    
    try {
      let query = db(this.tableName)
        .whereNull('deleted_at');

      // Apply filters
      if (filters.postedFrom) {
        query = query.where('posted_date', '>=', filters.postedFrom);
      }
      
      if (filters.postedTo) {
        query = query.where('posted_date', '<=', filters.postedTo);
      }
      
      if (filters.naicsCode) {
        query = query.where('naics_code', filters.naicsCode);
      }
      
      if (filters.department) {
        query = query.where('department', 'ilike', `%${filters.department}%`);
      }
      
      if (filters.opportunityType) {
        query = query.where('opportunity_type', filters.opportunityType);
      }
      
      if (filters.syncStatus) {
        query = query.where('sync_status', filters.syncStatus);
      }
      
      if (filters.searchTerm) {
        query = query.where(function() {
          this.where('title', 'ilike', `%${filters.searchTerm}%`)
            .orWhere('description', 'ilike', `%${filters.searchTerm}%`)
            .orWhere('solicitation_number', 'ilike', `%${filters.searchTerm}%`);
        });
      }

      if (filters.minAmount) {
        query = query.where('award_amount', '>=', filters.minAmount);
      }

      if (filters.maxAmount) {
        query = query.where('award_amount', '<=', filters.maxAmount);
      }

      // Apply pagination
      if (filters.offset) {
        query = query.offset(filters.offset);
      }
      
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      // Order by most recent first
      query = query.orderBy('posted_date', 'desc');

      const results = await query;

      const duration = process.hrtime(startTime);
      logDatabaseOperation('SELECT', this.tableName, results.length, duration[0] * 1000 + duration[1] / 1000000, {
        filters,
        resultCount: results.length,
      });

      return results.map(result => this.mapDbToModel(result));
    } catch (error: any) {
      logger.error('Failed to find opportunities', {
        error: error.message,
        filters,
      });
      throw error;
    }
  }

  /**
   * Get count of opportunities matching filters
   */
  async countOpportunities(filters: Omit<OpportunityFilters, 'limit' | 'offset'>): Promise<number> {
    try {
      let query = db(this.tableName)
        .whereNull('deleted_at');

      // Apply same filters as findOpportunities
      if (filters.postedFrom) {
        query = query.where('posted_date', '>=', filters.postedFrom);
      }
      
      if (filters.postedTo) {
        query = query.where('posted_date', '<=', filters.postedTo);
      }
      
      if (filters.naicsCode) {
        query = query.where('naics_code', filters.naicsCode);
      }
      
      if (filters.department) {
        query = query.where('department', 'ilike', `%${filters.department}%`);
      }
      
      if (filters.opportunityType) {
        query = query.where('opportunity_type', filters.opportunityType);
      }
      
      if (filters.syncStatus) {
        query = query.where('sync_status', filters.syncStatus);
      }
      
      if (filters.searchTerm) {
        query = query.where(function() {
          this.where('title', 'ilike', `%${filters.searchTerm}%`)
            .orWhere('description', 'ilike', `%${filters.searchTerm}%`)
            .orWhere('solicitation_number', 'ilike', `%${filters.searchTerm}%`);
        });
      }

      if (filters.minAmount) {
        query = query.where('award_amount', '>=', filters.minAmount);
      }

      if (filters.maxAmount) {
        query = query.where('award_amount', '<=', filters.maxAmount);
      }

      const result = await query.count('* as count').first();
      return parseInt(String(result?.count || '0'), 10);
    } catch (error: any) {
      logger.error('Failed to count opportunities', {
        error: error.message,
        filters,
      });
      throw error;
    }
  }

  /**
   * Soft delete opportunities older than the specified date
   */
  async deleteOldRecords(cutoffDate: Date): Promise<number> {
    const startTime = process.hrtime();
    
    try {
      const affectedRows = await db(this.tableName)
        .where('created_at', '<', cutoffDate)
        .whereNull('deleted_at')
        .update({
          deleted_at: new Date(),
          updated_at: new Date(),
        });

      const duration = process.hrtime(startTime);
      logDatabaseOperation('UPDATE', this.tableName, affectedRows, duration[0] * 1000 + duration[1] / 1000000, {
        operation: 'soft_delete',
        cutoffDate: cutoffDate.toISOString(),
      });

      return affectedRows;
    } catch (error: any) {
      logger.error('Failed to delete old records', {
        error: error.message,
        cutoffDate: cutoffDate.toISOString(),
      });
      throw error;
    }
  }

  /**
   * Get statistics about opportunities
   */
  async getStatistics(): Promise<{
    totalOpportunities: number;
    totalByType: { [key: string]: number };
    totalByDepartment: { [key: string]: number };
    recentSyncStatus: { [key: string]: number };
  }> {
    try {
      const [totalResult, byTypeResult, byDepartmentResult, syncStatusResult] = await Promise.all([
        // Total count
        db(this.tableName).whereNull('deleted_at').count('* as count').first(),
        
        // Count by opportunity type
        db(this.tableName)
          .whereNull('deleted_at')
          .groupBy('opportunity_type')
          .select('opportunity_type', db.raw('count(*) as count'))
          .orderBy('count', 'desc'),
        
        // Count by department (top 10)
        db(this.tableName)
          .whereNull('deleted_at')
          .whereNotNull('department')
          .groupBy('department')
          .select('department', db.raw('count(*) as count'))
          .orderBy('count', 'desc')
          .limit(10),
        
        // Count by sync status
        db(this.tableName)
          .whereNull('deleted_at')
          .groupBy('sync_status')
          .select('sync_status', db.raw('count(*) as count'))
          .orderBy('count', 'desc'),
      ]);

      return {
        totalOpportunities: parseInt(String(totalResult?.count || '0'), 10),
        totalByType: byTypeResult.reduce((acc, row) => {
          acc[row.opportunity_type || 'Unknown'] = parseInt(String(row.count), 10);
          return acc;
        }, {}),
        totalByDepartment: byDepartmentResult.reduce((acc, row) => {
          acc[row.department] = parseInt(String(row.count), 10);
          return acc;
        }, {}),
        recentSyncStatus: syncStatusResult.reduce((acc, row) => {
          acc[row.sync_status || 'Unknown'] = parseInt(String(row.count), 10);
          return acc;
        }, {}),
      };
    } catch (error: any) {
      logger.error('Failed to get statistics', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Map database row to model object
   */
  private mapDbToModel(row: any): SamOpportunity {
    return {
      id: row.id,
      opportunityId: row.opportunity_id,
      noticeId: row.notice_id,
      title: row.title,
      description: row.description,
      opportunityType: row.opportunity_type,
      baseType: row.base_type,
      archiveType: row.archive_type,
      archiveDate: row.archive_date,
      classificationCode: row.classification_code,
      naicsCode: row.naics_code,
      setAsideCode: row.set_aside_code,
      setAside: row.set_aside,
      department: row.department,
      subTier: row.sub_tier,
      office: row.office,
      solicitationNumber: row.solicitation_number,
      postedDate: row.posted_date,
      responseDeadline: row.response_deadline,
      updatedDate: row.updated_date,
      contactInfo: row.contact_info,
      attachments: row.attachments,
      awardNumber: row.award_number,
      awardAmount: row.award_amount ? parseFloat(String(row.award_amount)) : undefined,
      awardeeName: row.awardee_name,
      awardeeDuns: row.awardee_duns,
      awardeeCage: row.awardee_cage,
      awardeeInfo: row.awardee_info,
      samUrl: row.sam_url,
      relatedNotices: row.related_notices,
      rawData: row.raw_data,
      dataSource: row.data_source,
      syncStatus: row.sync_status,
      syncError: row.sync_error,
      lastSyncedAt: row.last_synced_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    };
  }
}
