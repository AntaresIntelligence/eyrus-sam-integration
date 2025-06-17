import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import rax from 'retry-axios';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { config } from '../config';
import { logger } from '../utils/logger';
import { createHash } from 'crypto';

export interface SamApiSearchParams {
  api_key: string;
  postedFrom?: string;
  postedTo?: string;
  limit?: number;
  offset?: number;
  ptype?: string;
  ncode?: string;
  title?: string;
  department?: string;
  subtier?: string;
  office?: string;
  state?: string;
  zip?: string;
  typeOfSetAsideCode?: string;
  typeOfSetAside?: string;
  rdlfrom?: string;
  rdlto?: string;
  procurementMethod?: string;
  notice?: string;
  organizationType?: string;
}

export interface SamOpportunity {
  opportunityId: string;
  noticeId?: string;
  title: string;
  description?: string;
  type?: string;
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
  postedDate?: string;
  responseDeadLine?: string;
  updatedDate?: string;
  contactInfo?: any;
  attachments?: any[];
  awardNumber?: string;
  awardAmount?: number;
  awardeeName?: string;
  awardeeDuns?: string;
  awardeeCage?: string;
  awardeeInfo?: any;
  samUrl?: string;
  relatedNotices?: any[];
  rawData?: any;
}

export interface SamApiResponse {
  opportunitiesData: SamOpportunity[];
  totalRecords: number;
  limit: number;
  offset: number;
  pageNumber: number;
  totalPages: number;
}

export interface SamApiError {
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  path: string;
}

export class SamApiClient {
  private readonly client: AxiosInstance;
  private readonly rateLimiter: RateLimiterMemory;
  private readonly apiKeyHash: string;
  private readonly apiKeys: string[];
  private currentKeyIndex: number = 0;

  constructor() {
    // Set up API keys for rotation
    this.apiKeys = config.sam.apiKeys || [config.sam.apiKey];
    
    // Create API key hash for rate limiting tracking
    this.apiKeyHash = createHash('sha256')
      .update(this.getCurrentApiKey())
      .digest('hex')
      .substring(0, 16);

    // Initialize rate limiter
    this.rateLimiter = new RateLimiterMemory({
      points: config.sam.rateLimitPerMinute,
      duration: 60, // 60 seconds
      blockDuration: 60, // Block for 60 seconds if exceeded
    });

    // Create axios instance with default configuration
    this.client = axios.create({
      baseURL: config.sam.apiBaseUrl,
      timeout: config.sam.requestTimeout,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Eyrus-SAM-Integration/1.0.0',
        'X-Client-Version': '1.0.0',
      },
    });

    // Configure retry logic
    rax.attach(this.client);
    this.client.defaults.raxConfig = {
      retry: config.sam.maxRetries,
      retryDelay: config.sam.retryDelay,
      httpMethodsToRetry: ['GET'],
      statusCodesToRetry: [
        [100, 199], // 1xx status codes
        [429, 429], // Rate limit
        [500, 599], // 5xx status codes
      ],
      backoffType: 'exponential',
      onRetryAttempt: (err) => {
        const cfg = rax.getConfig(err);
        logger.warn('SAM API retry attempt', {
          attempt: cfg?.currentRetryAttempt,
          maxRetries: cfg?.retry,
          error: err.message,
          url: err.config?.url,
          status: err.response?.status,
        });
      },
    };

    // Add request interceptor for logging and rate limiting
    this.client.interceptors.request.use(
      async (config) => {
        // Check rate limit before making request
        try {
          await this.rateLimiter.consume(this.apiKeyHash);
        } catch (rateLimitRes: any) {
          const waitTime = Math.round(rateLimitRes.msBeforeNext || 1000);
          logger.warn('SAM API rate limit exceeded, waiting', {
            waitTimeMs: waitTime,
            remainingPoints: rateLimitRes.remainingPoints,
          });
          
          // Wait for the required time
          await new Promise(resolve => setTimeout(resolve, waitTime));
          
          // Try to consume again
          await this.rateLimiter.consume(this.apiKeyHash);
        }

        logger.debug('SAM API request', {
          method: config.method?.toUpperCase(),
          url: config.url,
          params: this.sanitizeParams(config.params),
        });

        return config;
      },
      (error) => {
        logger.error('SAM API request error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('SAM API response', {
          status: response.status,
          url: response.config.url,
          dataSize: JSON.stringify(response.data).length,
        });
        return response;
      },
      (error) => {
        const status = error.response?.status;
        const statusText = error.response?.statusText;
        const url = error.config?.url;
        const responseData = error.response?.data;

        logger.error('SAM API response error', {
          status,
          statusText,
          url,
          error: error.message,
          responseData: responseData ? JSON.stringify(responseData).substring(0, 500) : undefined,
        });

        return Promise.reject(error);
      }
    );
  }

  /**
   * Get current API key
   */
  private getCurrentApiKey(): string {
    return this.apiKeys[this.currentKeyIndex];
  }

  /**
   * Rotate to next API key
   */
  private rotateApiKey(): void {
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    logger.info('Rotated to next API key', { 
      keyIndex: this.currentKeyIndex,
      totalKeys: this.apiKeys.length 
    });
  }

  /**
   * Format date from YYYY-MM-DD to MM/dd/yyyy format for SAM.gov API
   */
  private formatDateForSamApi(dateString: string): string {
    if (!dateString) return dateString;
    
    // If already in MM/dd/yyyy format, return as is
    if (dateString.includes('/')) return dateString;
    
    // Convert from YYYY-MM-DD to MM/dd/yyyy
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      logger.warn('Invalid date format provided', { dateString });
      return dateString;
    }
    
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${month}/${day}/${year}`;
  }

  /**
   * Search for opportunities using the SAM.gov API
   */
  async searchOpportunities(params: Partial<SamApiSearchParams>): Promise<SamApiResponse> {
    try {
      const searchParams: SamApiSearchParams = {
        api_key: this.getCurrentApiKey(),
        limit: 1000,
        offset: 0,
        ...params,
      };

      // Format dates for SAM.gov API
      if (searchParams.postedFrom) {
        searchParams.postedFrom = this.formatDateForSamApi(searchParams.postedFrom);
      }
      if (searchParams.postedTo) {
        searchParams.postedTo = this.formatDateForSamApi(searchParams.postedTo);
      }
      if (searchParams.rdlfrom) {
        searchParams.rdlfrom = this.formatDateForSamApi(searchParams.rdlfrom);
      }
      if (searchParams.rdlto) {
        searchParams.rdlto = this.formatDateForSamApi(searchParams.rdlto);
      }

      logger.info('Searching SAM opportunities', {
        params: this.sanitizeParams(searchParams),
      });

      const response: AxiosResponse<SamApiResponse> = await this.client.get('/search', {
        params: searchParams,
      });

      if (!response.data) {
        throw new Error('No data received from SAM.gov API');
      }

      logger.info('SAM opportunities search completed', {
        totalRecords: response.data.totalRecords,
        returnedRecords: response.data.opportunitiesData?.length || 0,
        totalPages: response.data.totalPages,
        currentPage: response.data.pageNumber,
      });

      // Transform opportunities data to match interface
      if (response.data.opportunitiesData) {
        response.data.opportunitiesData = response.data.opportunitiesData.map(this.transformApiResponse);
      }

      return response.data;
    } catch (error: any) {
      // Check if it's a rate limit error and rotate key
      if (error.response?.status === 429 && this.apiKeys.length > 1) {
        logger.warn('Rate limit hit, rotating API key', {
          status: error.response.status,
          currentKeyIndex: this.currentKeyIndex,
        });
        this.rotateApiKey();
        
        // Retry with new key
        const retryParams: SamApiSearchParams = {
          ...params,
          api_key: this.getCurrentApiKey(),
        };
        return this.searchOpportunities(retryParams);
      }

      logger.error('Failed to search SAM opportunities', {
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
        params: this.sanitizeParams(params),
        currentKeyIndex: this.currentKeyIndex,
      });

      // Re-throw with enhanced error information
      const enhancedError = new Error(
        `SAM.gov API search failed: ${error.message}`
      );
      (enhancedError as any).cause = error;
      throw enhancedError;
    }
  }

  /**
   * Get a specific opportunity by ID
   */
  async getOpportunity(opportunityId: string): Promise<SamOpportunity> {
    try {
      logger.info('Fetching SAM opportunity details', { opportunityId });

      const response: AxiosResponse<{ opportunitiesData: SamOpportunity[] }> = 
        await this.client.get(`/${opportunityId}`, {
          params: {
            api_key: this.getCurrentApiKey(),
          },
        });

      if (!response.data?.opportunitiesData?.[0]) {
        throw new Error(`Opportunity ${opportunityId} not found`);
      }

      const opportunity = response.data.opportunitiesData[0];
      
      logger.info('SAM opportunity fetched successfully', {
        opportunityId,
        title: opportunity.title,
      });

      return opportunity;
    } catch (error: any) {
      logger.error('Failed to fetch SAM opportunity', {
        opportunityId,
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
      });

      throw new Error(`Failed to fetch opportunity ${opportunityId}: ${error.message}`);
    }
  }

  /**
   * Get all opportunities for a date range with pagination support
   */
  async getAllOpportunitiesInDateRange(
    postedFrom: string,
    postedTo: string,
    additionalParams: Partial<SamApiSearchParams> = {}
  ): Promise<SamOpportunity[]> {
    const allOpportunities: SamOpportunity[] = [];
    let currentOffset = 0;
    const batchSize = config.sync.batchSize;
    let totalRecords = 0;
    let processedRecords = 0;

    logger.info('Starting bulk SAM opportunities fetch', {
      postedFrom,
      postedTo,
      batchSize,
      additionalParams: this.sanitizeParams(additionalParams),
    });

    try {
      do {
        const searchParams: Partial<SamApiSearchParams> = {
          postedFrom: this.formatDateForSamApi(postedFrom),
          postedTo: this.formatDateForSamApi(postedTo),
          limit: batchSize,
          offset: currentOffset,
          ...additionalParams,
        };

        const response = await this.searchOpportunities(searchParams);
        
        if (totalRecords === 0) {
          totalRecords = response.totalRecords;
          logger.info('Total records to fetch determined', { totalRecords });
        }

        if (response.opportunitiesData && response.opportunitiesData.length > 0) {
          // Transform raw API response to SamOpportunity interface
          const transformedOpportunities = response.opportunitiesData.map(this.transformApiResponse);
          allOpportunities.push(...transformedOpportunities);
          processedRecords += response.opportunitiesData.length;
          
          logger.info('Batch fetched successfully', {
            batchOffset: currentOffset,
            batchSize: response.opportunitiesData.length,
            totalProcessed: processedRecords,
            totalRecords,
            progressPercent: Math.round((processedRecords / totalRecords) * 100),
          });
        }

        currentOffset += batchSize;

        // Add a small delay between batches to be respectful to the API
        if (currentOffset < totalRecords) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } while (currentOffset < totalRecords && allOpportunities.length < totalRecords);

      logger.info('Bulk SAM opportunities fetch completed', {
        totalFetched: allOpportunities.length,
        totalRecords,
        postedFrom,
        postedTo,
      });

      return allOpportunities;
    } catch (error: any) {
      logger.error('Failed to fetch all opportunities in date range', {
        postedFrom,
        postedTo,
        processedRecords,
        totalRecords,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Test API connectivity and authentication
   */
  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      logger.info('Testing SAM.gov API connection');

      // Test with a minimal search to verify connectivity
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      
      const testParams: Partial<SamApiSearchParams> = {
        limit: 1,
        offset: 0,
        ptype: 'a', // Award notices
        postedFrom: this.formatDateForSamApi(thirtyDaysAgo.toISOString().split('T')[0]!),
        postedTo: this.formatDateForSamApi(today.toISOString().split('T')[0]!),
      };

      const response = await this.searchOpportunities(testParams);

      const success = response && typeof response.totalRecords === 'number';
      
      if (success) {
        logger.info('SAM.gov API connection test successful', {
          totalRecords: response.totalRecords,
        });
        
        return {
          success: true,
          message: 'API connection successful',
          details: {
            totalRecords: response.totalRecords,
            apiUrl: config.sam.apiBaseUrl,
            rateLimitPerMinute: config.sam.rateLimitPerMinute,
          },
        };
      } else {
        throw new Error('Invalid response format from API');
      }
    } catch (error: any) {
      logger.error('SAM.gov API connection test failed', {
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
      });

      return {
        success: false,
        message: `API connection failed: ${error.message}`,
        details: {
          error: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          apiUrl: config.sam.apiBaseUrl,
        },
      };
    }
  }

  /**
   * Get current rate limit status
   */
  async getRateLimitStatus(): Promise<{
    remainingRequests: number;
    resetTime: Date;
    totalRequests: number;
  }> {
    try {
      const rateLimitInfo = await this.rateLimiter.get(this.apiKeyHash);
      
      return {
        remainingRequests: rateLimitInfo ? rateLimitInfo.remainingPoints || 0 : config.sam.rateLimitPerMinute,
        resetTime: new Date(Date.now() + (rateLimitInfo?.msBeforeNext || 0)),
        totalRequests: rateLimitInfo ? (rateLimitInfo as any).totalHits || 0 : 0,
      };
    } catch (error) {
      logger.error('Failed to get rate limit status', { error });
      
      return {
        remainingRequests: config.sam.rateLimitPerMinute,
        resetTime: new Date(Date.now() + 60000),
        totalRequests: 0,
      };
    }
  }

  /**
   * Transform raw API response to SamOpportunity interface
   */
  private transformApiResponse = (apiData: any): SamOpportunity => {
    const award = apiData.award || {};
    const awardee = award.awardee || {};
    
    return {
      opportunityId: apiData.noticeId, // Use noticeId as primary ID
      noticeId: apiData.noticeId,
      title: apiData.title,
      description: apiData.description,
      type: apiData.type,
      baseType: apiData.baseType,
      archiveType: apiData.archiveType,
      archiveDate: apiData.archiveDate,
      classificationCode: apiData.classificationCode,
      naicsCode: apiData.naicsCode,
      setAsideCode: apiData.typeOfSetAside,
      setAside: apiData.typeOfSetAsideDescription,
      department: this.extractDepartmentName(apiData.fullParentPathName),
      subTier: apiData.fullParentPathName,
      office: apiData.organizationType,
      solicitationNumber: apiData.solicitationNumber,
      postedDate: apiData.postedDate,
      responseDeadLine: apiData.responseDeadLine,
      updatedDate: apiData.updatedDate,
      contactInfo: apiData.pointOfContact || [],
      attachments: apiData.resourceLinks || [],
      awardNumber: award.number,
      awardAmount: award.amount ? parseFloat(award.amount) : undefined,
      awardeeName: awardee.name,
      awardeeDuns: awardee.ueiSAM,
      awardeeCage: awardee.cageCode,
      awardeeInfo: awardee,
      samUrl: apiData.uiLink,
      relatedNotices: apiData.links || [],
      rawData: apiData,
    };
  };

  /**
   * Extract department name from fullParentPathName
   */
  private extractDepartmentName(fullParentPathName?: string): string {
    if (!fullParentPathName) return '';
    const pathParts = fullParentPathName.split('.');
    return pathParts.length > 0 ? pathParts[0] : '';
  }

  /**
   * Sanitize parameters for logging (remove sensitive data)
   */
  private sanitizeParams(params: any): any {
    if (!params) return params;
    
    const sanitized = { ...params };
    if (sanitized.api_key) {
      sanitized.api_key = `${sanitized.api_key.substring(0, 8)}...`;
    }
    return sanitized;
  }
}

// Export singleton instance
export const samApiClient = new SamApiClient();
