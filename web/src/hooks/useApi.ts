import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { healthApi, opportunitiesApi, syncApi, type HealthCheck, type ApiResponse, type Opportunity, type SyncLog } from '../services/api'
import toast from 'react-hot-toast'

// Health hooks
export const useHealth = () => {
  return useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const response = await healthApi.getHealth()
      return response.data
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })
}

export const useDetailedHealth = (enabled = true) => {
  return useQuery({
    queryKey: ['health', 'detailed'],
    queryFn: async () => {
      const response = await healthApi.getDetailedHealth()
      return response.data as HealthCheck
    },
    refetchInterval: 60000, // Refetch every minute
    enabled,
  })
}

// Opportunities hooks
export const useOpportunities = (params?: {
  limit?: number
  offset?: number
  postedFrom?: string
  postedTo?: string
  naicsCode?: string
  department?: string
  opportunityType?: string
  searchTerm?: string
}) => {
  return useQuery({
    queryKey: ['opportunities', params],
    queryFn: async () => {
      const response = await opportunitiesApi.getOpportunities(params)
      return response.data as ApiResponse<Opportunity[]>
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useOpportunity = (id: string) => {
  return useQuery({
    queryKey: ['opportunities', id],
    queryFn: async () => {
      const response = await opportunitiesApi.getOpportunityById(id)
      return response.data as ApiResponse<Opportunity>
    },
    enabled: !!id,
  })
}

export const useOpportunityStatistics = () => {
  return useQuery({
    queryKey: ['opportunities', 'statistics'],
    queryFn: async () => {
      const response = await opportunitiesApi.getStatistics()
      return response.data
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Sync hooks
export const useSyncHistory = (limit = 20) => {
  return useQuery({
    queryKey: ['sync', 'history', limit],
    queryFn: async () => {
      const response = await syncApi.getSyncHistory(limit)
      return response.data as ApiResponse<SyncLog[]>
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })
}

export const useSyncStatus = () => {
  return useQuery({
    queryKey: ['sync', 'status'],
    queryFn: async () => {
      const response = await syncApi.getSyncStatus()
      return response.data
    },
    refetchInterval: 15000, // Refetch every 15 seconds
  })
}

// Sync mutations
export const useManualSync = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: {
      postedFrom: string
      postedTo: string
      ptype?: string
      ncode?: string
      dryRun?: boolean
    }) => {
      const response = await syncApi.triggerManualSync(data)
      return response.data
    },
    onSuccess: () => {
      toast.success('Manual sync started successfully')
      // Invalidate and refetch sync-related queries
      queryClient.invalidateQueries({ queryKey: ['sync'] })
      queryClient.invalidateQueries({ queryKey: ['opportunities'] })
    },
    onError: (error: any) => {
      toast.error(`Failed to start sync: ${error.response?.data?.message || error.message}`)
    },
  })
}

export const useTestConnection = () => {
  return useMutation({
    mutationFn: async () => {
      const response = await syncApi.testConnection()
      return response.data
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('SAM.gov API connection successful')
      } else {
        toast.error(`API connection failed: ${data.message}`)
      }
    },
    onError: (error: any) => {
      toast.error(`Connection test failed: ${error.response?.data?.message || error.message}`)
    },
  })
}

export const useCleanupData = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async () => {
      const response = await syncApi.triggerCleanup()
      return response.data
    },
    onSuccess: (data) => {
      toast.success(`Data cleanup completed. Deleted ${data.deletedRecords} records.`)
      queryClient.invalidateQueries({ queryKey: ['opportunities'] })
      queryClient.invalidateQueries({ queryKey: ['sync'] })
    },
    onError: (error: any) => {
      toast.error(`Cleanup failed: ${error.response?.data?.message || error.message}`)
    },
  })
}

export const useClearHealthCache = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async () => {
      const response = await healthApi.clearCache()
      return response.data
    },
    onSuccess: () => {
      toast.success('Health check cache cleared')
      queryClient.invalidateQueries({ queryKey: ['health'] })
    },
    onError: (error: any) => {
      toast.error(`Failed to clear cache: ${error.response?.data?.message || error.message}`)
    },
  })
}

// Real-time data hook
export const useRealTimeUpdates = () => {
  const queryClient = useQueryClient()
  
  // Simulate real-time updates by periodically invalidating queries
  // In a real application, you might use WebSockets or Server-Sent Events
  React.useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['health'] })
      queryClient.invalidateQueries({ queryKey: ['sync', 'status'] })
    }, 30000) // Every 30 seconds
    
    return () => clearInterval(interval)
  }, [queryClient])
}