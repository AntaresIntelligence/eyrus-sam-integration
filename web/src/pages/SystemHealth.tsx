import React from 'react'
import {
  Database,
  Shield,
  Server,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Monitor,
  HardDrive,
  Cpu,
} from 'lucide-react'
import { useDetailedHealth, useClearHealthCache } from '../hooks/useApi'
import LoadingSpinner from '../components/LoadingSpinner'
import { formatDistanceToNow } from 'date-fns'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'

// Mock data for charts
const responseTimeData = [
  { time: '00:00', database: 12, samApi: 245, memory: 5, disk: 3 },
  { time: '04:00', database: 15, samApi: 198, memory: 6, disk: 3 },
  { time: '08:00', database: 18, samApi: 312, memory: 8, disk: 4 },
  { time: '12:00', database: 14, samApi: 287, memory: 7, disk: 3 },
  { time: '16:00', database: 16, samApi: 234, memory: 6, disk: 4 },
  { time: '20:00', database: 13, samApi: 189, memory: 5, disk: 3 },
]

const systemMetricsData = [
  { time: '00:00', cpu: 45, memory: 62, disk: 78 },
  { time: '04:00', cpu: 38, memory: 58, disk: 78 },
  { time: '08:00', cpu: 52, memory: 65, disk: 79 },
  { time: '12:00', cpu: 68, memory: 71, disk: 80 },
  { time: '16:00', cpu: 59, memory: 69, disk: 81 },
  { time: '20:00', cpu: 41, memory: 61, disk: 81 },
]

interface HealthComponentCardProps {
  name: string
  check: any
  icon: React.ComponentType<{ className?: string }>
}

function HealthComponentCard({ name, check, icon: Icon }: HealthComponentCardProps) {
  const isHealthy = check.status === 'healthy'
  
  return (
    <div className={`card border-l-4 ${
      isHealthy ? 'border-l-green-500' : 'border-l-red-500'
    }`}>
      <div className="card-body">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Icon className={`h-8 w-8 ${
              isHealthy ? 'text-green-500' : 'text-red-500'
            }`} />
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900 capitalize">
                {name}
              </h3>
              <p className="text-sm text-gray-600">{check.message}</p>
            </div>
          </div>
          
          <div className="text-right">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              isHealthy ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {isHealthy ? (
                <CheckCircle className="h-4 w-4 mr-1" />
              ) : (
                <AlertTriangle className="h-4 w-4 mr-1" />
              )}
              {check.status}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {check.responseTime?.toFixed(1)}ms response
            </p>
          </div>
        </div>
        
        {check.details && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              {Object.entries(check.details).map(([key, value]: [string, any]) => (
                <div key={key}>
                  <dt className="font-medium text-gray-900 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                  </dt>
                  <dd className="text-gray-600">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </div>
  )
}

function OverallStatus({ health }: { health: any }) {
  const isHealthy = health.status === 'healthy'
  const healthyCount = Object.values(health.checks).filter((check: any) => check.status === 'healthy').length
  const totalCount = Object.keys(health.checks).length
  
  return (
    <div className="card">
      <div className="card-body">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {isHealthy ? (
              <Shield className="h-12 w-12 text-green-500" />
            ) : (
              <AlertTriangle className="h-12 w-12 text-red-500" />
            )}
            <div className="ml-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {health.overall.message}
              </h2>
              <p className="text-gray-600">
                {healthyCount}/{totalCount} components operational
              </p>
              <p className="text-sm text-gray-500">
                Last updated: {formatDistanceToNow(new Date(health.timestamp), { addSuffix: true })}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className={`inline-flex items-center px-4 py-2 rounded-lg font-medium ${
              isHealthy 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {isHealthy ? 'All Systems Operational' : 'System Issues Detected'}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Uptime: {Math.floor(health.uptime / 3600)}h {Math.floor((health.uptime % 3600) / 60)}m
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricsChart({ title, data, dataKey, color, unit = 'ms' }: {
  title: string
  data: any[]
  dataKey: string
  color: string
  unit?: string
}) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      </div>
      <div className="card-body">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="time" 
                stroke="#6b7280"
                fontSize={12}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={(value) => `${value}${unit}`}
              />
              <Tooltip 
                formatter={(value) => [`${value}${unit}`, dataKey]}
                labelStyle={{ color: '#374151' }}
                contentStyle={{ 
                  backgroundColor: '#f9fafb', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey={dataKey} 
                stroke={color} 
                strokeWidth={2}
                dot={{ r: 4, fill: color }}
                activeDot={{ r: 6, fill: color }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function SystemMetrics() {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-medium text-gray-900">System Resources</h3>
      </div>
      <div className="card-body">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={systemMetricsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="time" 
                stroke="#6b7280"
                fontSize={12}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip 
                formatter={(value, name) => [`${value}%`, name]}
                labelStyle={{ color: '#374151' }}
                contentStyle={{ 
                  backgroundColor: '#f9fafb', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px'
                }}
              />
              <Area
                type="monotone"
                dataKey="cpu"
                stackId="1"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="memory"
                stackId="1"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="disk"
                stackId="1"
                stroke="#f59e0b"
                fill="#f59e0b"
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 flex justify-center space-x-6">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2" />
            <span className="text-sm text-gray-600">CPU</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2" />
            <span className="text-sm text-gray-600">Memory</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2" />
            <span className="text-sm text-gray-600">Disk</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SystemHealth() {
  const { data: health, isLoading, refetch } = useDetailedHealth()
  const clearCache = useClearHealthCache()
  
  const handleRefresh = () => {
    refetch()
  }
  
  const handleClearCache = () => {
    clearCache.mutate()
  }
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" text="Loading system health..." />
      </div>
    )
  }
  
  if (!health) {
    return (
      <div className="card">
        <div className="card-body text-center py-12">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-500">Unable to load system health information</p>
          <button onClick={handleRefresh} className="btn btn-primary mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </button>
        </div>
      </div>
    )
  }
  
  const componentIcons = {
    database: Database,
    samApi: Server,
    memory: Cpu,
    disk: HardDrive,
  }
  
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Health</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor system components and performance metrics
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={handleClearCache}
            disabled={clearCache.isPending}
            className="btn btn-secondary"
          >
            {clearCache.isPending ? (
              <LoadingSpinner size="sm" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Clear Cache
          </button>
          
          <button onClick={handleRefresh} className="btn btn-primary">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Overall Status */}
      <OverallStatus health={health} />

      {/* Component Health Cards */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Component Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(health.checks).map(([name, check]: [string, any]) => {
            const IconComponent = componentIcons[name as keyof typeof componentIcons] || Monitor
            return (
              <HealthComponentCard
                key={name}
                name={name}
                check={check}
                icon={IconComponent}
              />
            )
          })}
        </div>
      </div>

      {/* Performance Metrics */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Performance Metrics</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MetricsChart
            title="Database Response Time"
            data={responseTimeData}
            dataKey="database"
            color="#3b82f6"
          />
          
          <MetricsChart
            title="SAM.gov API Response Time"
            data={responseTimeData}
            dataKey="samApi"
            color="#10b981"
          />
        </div>
      </div>

      {/* System Resources */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">System Resources</h2>
        <SystemMetrics />
      </div>
    </div>
  )
}
