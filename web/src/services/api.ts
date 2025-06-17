import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`)
    return config
  },
  (error) => {
    console.error('API Request Error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    console.error('API Response Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

// Health Check API
export const healthApi = {
  getHealth: () => axios.get('http://localhost:3000/health'),
  getDetailedHealth: () => api.get('/health/detailed'),
  getLiveness: () => api.get('/health/liveness'),
  getReadiness: () => api.get('/health/readiness'),
  clearCache: () => api.post('/health/cache/clear'),
}

// Opportunities API
export const opportunitiesApi = {
  getOpportunities: (params?: {
    limit?: number
    offset?: number
    postedFrom?: string
    postedTo?: string
    naicsCode?: string
    department?: string
    opportunityType?: string
    searchTerm?: string
  }) => api.get('/opportunities', { params }),
  
  getOpportunityById: (id: string) => api.get(`/opportunities/${id}`),
  
  getStatistics: () => api.get('/statistics'),
}

// Sync API - Updated to match real server endpoints
export const syncApi = {
  triggerManualSync: (data: {
    naics_codes: string[]
    posted_from: string
    posted_to: string
    limit?: number
    dry_run?: boolean
  }) => api.post('/sync/sam', data),
  
  testConnection: () => api.get('/test-connection'),
  
  getSyncHistory: (limit?: number) => api.get('/sync/active', { params: { limit } }),
  
  getSyncStatus: (syncId?: string) => syncId ? api.get(`/sync/status/${syncId}`) : api.get('/sync/active'),
  
  getActiveSyncs: () => api.get('/sync/active'),
}

// TypeScript interfaces
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  timestamp: string
  meta?: {
    count: number
    limit: number
    offset: number
  }
}

export interface HealthCheck {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  uptime: number
  version: string
  environment: string
  checks: {
    database: HealthComponent
    samApi: HealthComponent
    memory: HealthComponent
    disk: HealthComponent
  }
  overall: {
    status: 'healthy' | 'unhealthy'
    message: string
  }
}

export interface HealthComponent {
  status: 'healthy' | 'unhealthy'
  responseTime: number
  message: string
  details?: any
}

export interface Opportunity {
  id: string
  opportunityId: string
  noticeId?: string
  title: string
  description?: string
  opportunityType?: string
  baseType?: string
  naicsCode?: string
  department?: string
  subTier?: string
  office?: string
  solicitationNumber?: string
  postedDate?: string
  responseDeadline?: string
  updatedDate?: string
  awardNumber?: string
  awardAmount?: number
  awardeeName?: string
  awardeeDuns?: string
  awardeeCage?: string
  samUrl?: string
  syncStatus?: string
  lastSyncedAt?: string
  createdAt?: string
  updatedAt?: string
}

export interface SyncLog {
  id: string
  syncType: string
  status: string
  startedAt: string
  completedAt?: string
  recordsProcessed?: number
  recordsCreated?: number
  recordsUpdated?: number
  recordsFailed?: number
  errorDetails?: any
  syncParameters?: any
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export interface SyncResult {
  success: boolean
  syncId: string
  recordsProcessed: number
  recordsCreated: number
  recordsUpdated: number
  recordsFailed: number
  errors: string[]
  duration: number
  startTime: string
  endTime: string
}

export default api