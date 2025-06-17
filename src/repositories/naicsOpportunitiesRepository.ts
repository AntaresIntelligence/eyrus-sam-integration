import { Knex } from 'knex';
import { db } from '../database/connection';
import { logger, logError } from '../utils/logger';

export interface NaicsOpportunity {
  id?: string;
  opportunityId: string;
  naicsCode: string;
  postedDate: Date;
  responseDeadline?: Date;
  awardAmount?: number;
  title: string;
  department?: string;
  opportunityType?: string;
  aiAnalysis?: any;
  aiAnalysisDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface NaicsOpportunityFilters {
  naicsCode?: string;
  postedFrom?: string;
  postedTo?: string;
  deadlineFrom?: string;
  deadlineTo?: string;
  minAmount?: number;
  maxAmount?: number;
  department?: string;
  opportunityType?: string;
  hasAiAnalysis?: boolean;
  searchTerm?: string;
}

class NaicsOpportunitiesRepository {
  private tableName = 'opportunities_by_naics';

  /**
   * Create or update a NAICS opportunity record
   */
  async upsertOpportunity(opportunity: NaicsOpportunity): Promise<NaicsOpportunity> {
    try {
      const existingRecord = await db(this.tableName)
        .where({
          opportunity_id: opportunity.opportunityId,
          naics_code: opportunity.naicsCode,
        })
        .first();

      if (existingRecord) {
        // Update existing record
        await db(this.tableName)
          .where({
            opportunity_id: opportunity.opportunityId,
            naics_code: opportunity.naicsCode,
          })
          .update({
            posted_date: opportunity.postedDate,
            response_deadline: opportunity.responseDeadline,
            award_amount: opportunity.awardAmount,
            title: opportunity.title,
            department: opportunity.department,
            opportunity_type: opportunity.opportunityType,
            ai_analysis: opportunity.aiAnalysis,
            ai_analysis_date: opportunity.aiAnalysisDate,
            updated_at: new Date(),
          });

        return { ...opportunity, id: existingRecord.id };
      } else {
        // Create new record
        const [inserted] = await db(this.tableName)
          .insert({
            opportunity_id: opportunity.opportunityId,
            naics_code: opportunity.naicsCode,
            posted_date: opportunity.postedDate,
            response_deadline: opportunity.responseDeadline,
            award_amount: opportunity.awardAmount,
            title: opportunity.title,
            department: opportunity.department,
            opportunity_type: opportunity.opportunityType,
            ai_analysis: opportunity.aiAnalysis,
            ai_analysis_date: opportunity.aiAnalysisDate,
          })
          .returning('*');

        return this.mapDbToModel(inserted);
      }
    } catch (error: any) {
      logError(error, 'upsert_naics_opportunity_failed', {
        opportunityId: opportunity.opportunityId,
        naicsCode: opportunity.naicsCode,
      });
      throw error;
    }
  }

  /**
   * Get opportunities for a specific NAICS code with filtering
   */
  async getOpportunitiesByNaics(
    naicsCode: string,
    filters: NaicsOpportunityFilters = {},
    limit: number = 50,
    offset: number = 0
  ): Promise<NaicsOpportunity[]> {
    try {
      let query = db(this.tableName)
        .where('naics_code', naicsCode)
        .orderBy('posted_date', 'desc');

      // Apply filters
      if (filters.postedFrom) {
        query = query.where('posted_date', '>=', filters.postedFrom);
      }
      if (filters.postedTo) {
        query = query.where('posted_date', '<=', filters.postedTo);
      }
      if (filters.deadlineFrom) {
        query = query.where('response_deadline', '>=', filters.deadlineFrom);
      }
      if (filters.deadlineTo) {
        query = query.where('response_deadline', '<=', filters.deadlineTo);
      }
      if (filters.minAmount) {
        query = query.where('award_amount', '>=', filters.minAmount);
      }
      if (filters.maxAmount) {
        query = query.where('award_amount', '<=', filters.maxAmount);
      }
      if (filters.department) {
        query = query.where('department', 'ilike', `%${filters.department}%`);
      }
      if (filters.opportunityType) {
        query = query.where('opportunity_type', filters.opportunityType);
      }
      if (filters.hasAiAnalysis !== undefined) {
        if (filters.hasAiAnalysis) {
          query = query.whereNotNull('ai_analysis');
        } else {
          query = query.whereNull('ai_analysis');
        }
      }
      if (filters.searchTerm) {
        query = query.where((builder) => {
          builder
            .where('title', 'ilike', `%${filters.searchTerm}%`)
            .orWhere('department', 'ilike', `%${filters.searchTerm}%`);
        });
      }

      const results = await query.limit(limit).offset(offset);

      return results.map(this.mapDbToModel);
    } catch (error: any) {
      logError(error, 'get_opportunities_by_naics_failed', {
        naicsCode,
        filters,
        limit,
        offset,
      });
      throw error;
    }
  }

  /**
   * Get opportunities across all NAICS codes with filtering
   */
  async getAllOpportunities(
    filters: NaicsOpportunityFilters = {},
    limit: number = 50,
    offset: number = 0
  ): Promise<NaicsOpportunity[]> {
    try {
      let query = db(this.tableName).orderBy('posted_date', 'desc');

      // Apply filters (same logic as getOpportunitiesByNaics)
      if (filters.naicsCode) {
        query = query.where('naics_code', filters.naicsCode);
      }
      if (filters.postedFrom) {
        query = query.where('posted_date', '>=', filters.postedFrom);
      }
      if (filters.postedTo) {
        query = query.where('posted_date', '<=', filters.postedTo);
      }
      if (filters.deadlineFrom) {
        query = query.where('response_deadline', '>=', filters.deadlineFrom);
      }
      if (filters.deadlineTo) {
        query = query.where('response_deadline', '<=', filters.deadlineTo);
      }
      if (filters.minAmount) {
        query = query.where('award_amount', '>=', filters.minAmount);
      }
      if (filters.maxAmount) {
        query = query.where('award_amount', '<=', filters.maxAmount);
      }
      if (filters.department) {
        query = query.where('department', 'ilike', `%${filters.department}%`);
      }
      if (filters.opportunityType) {
        query = query.where('opportunity_type', filters.opportunityType);
      }
      if (filters.hasAiAnalysis !== undefined) {
        if (filters.hasAiAnalysis) {
          query = query.whereNotNull('ai_analysis');
        } else {
          query = query.whereNull('ai_analysis');
        }
      }
      if (filters.searchTerm) {
        query = query.where((builder) => {
          builder
            .where('title', 'ilike', `%${filters.searchTerm}%`)
            .orWhere('department', 'ilike', `%${filters.searchTerm}%`);
        });
      }

      const results = await query.limit(limit).offset(offset);

      return results.map(this.mapDbToModel);
    } catch (error: any) {
      logError(error, 'get_all_opportunities_failed', {
        filters,
        limit,
        offset,
      });
      throw error;
    }
  }

  /**
   * Count opportunities for statistics
   */
  async countOpportunities(filters: NaicsOpportunityFilters = {}): Promise<number> {
    try {
      let query = db(this.tableName);

      // Apply same filters as getAllOpportunities
      if (filters.naicsCode) {
        query = query.where('naics_code', filters.naicsCode);
      }
      if (filters.postedFrom) {
        query = query.where('posted_date', '>=', filters.postedFrom);
      }
      if (filters.postedTo) {
        query = query.where('posted_date', '<=', filters.postedTo);
      }
      // ... other filters

      const result = await query.count('* as count').first();
      return parseInt(String(result?.count || '0'), 10);
    } catch (error: any) {
      logError(error, 'count_opportunities_failed', { filters });
      throw error;
    }
  }

  /**
   * Get statistics by NAICS code
   */
  async getNaicsStatistics(dateFrom?: string, dateTo?: string): Promise<any[]> {
    try {
      let query = db(this.tableName)
        .select('naics_code')
        .count('* as total_opportunities')
        .sum('award_amount as total_award_amount')
        .avg('award_amount as avg_award_amount')
        .countDistinct('department as departments_count')
        .groupBy('naics_code')
        .orderBy('total_opportunities', 'desc');

      if (dateFrom) {
        query = query.where('posted_date', '>=', dateFrom);
      }
      if (dateTo) {
        query = query.where('posted_date', '<=', dateTo);
      }

      const results = await query;

      return results.map(row => ({
        naicsCode: row.naics_code,
        totalOpportunities: parseInt(String(row.total_opportunities), 10),
        totalAwardAmount: parseFloat(String(row.total_award_amount || '0')),
        avgAwardAmount: parseFloat(String(row.avg_award_amount || '0')),
        departmentsCount: parseInt(String(row.departments_count), 10),
      }));
    } catch (error: any) {
      logError(error, 'get_naics_statistics_failed', { dateFrom, dateTo });
      throw error;
    }
  }

  /**
   * Update AI analysis for an opportunity
   */
  async updateAiAnalysis(
    opportunityId: string,
    naicsCode: string,
    aiAnalysis: any
  ): Promise<void> {
    try {
      await db(this.tableName)
        .where({
          opportunity_id: opportunityId,
          naics_code: naicsCode,
        })
        .update({
          ai_analysis: aiAnalysis,
          ai_analysis_date: new Date(),
          updated_at: new Date(),
        });
    } catch (error: any) {
      logError(error, 'update_ai_analysis_failed', {
        opportunityId,
        naicsCode,
      });
      throw error;
    }
  }

  /**
   * Get opportunities that need AI analysis
   */
  async getOpportunitiesForAiAnalysis(limit: number = 10): Promise<NaicsOpportunity[]> {
    try {
      const results = await db(this.tableName)
        .whereNull('ai_analysis')
        .orderBy('posted_date', 'desc')
        .limit(limit);

      return results.map(this.mapDbToModel);
    } catch (error: any) {
      logError(error, 'get_opportunities_for_ai_analysis_failed', { limit });
      throw error;
    }
  }

  /**
   * Map database row to model
   */
  private mapDbToModel(row: any): NaicsOpportunity {
    return {
      id: row.id,
      opportunityId: row.opportunity_id,
      naicsCode: row.naics_code,
      postedDate: row.posted_date,
      responseDeadline: row.response_deadline,
      awardAmount: row.award_amount ? parseFloat(String(row.award_amount)) : undefined,
      title: row.title,
      department: row.department,
      opportunityType: row.opportunity_type,
      aiAnalysis: row.ai_analysis,
      aiAnalysisDate: row.ai_analysis_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

// Export singleton instance
export const naicsOpportunitiesRepository = new NaicsOpportunitiesRepository();