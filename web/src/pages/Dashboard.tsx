import React from 'react'
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Database,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
} from 'lucide-react'
import { useDetailedHealth, useOpportunityStatistics, useSyncStatus } from '../hooks/useApi'
import LoadingSpinner from '../components/LoadingSpinner'
import { formatDistanceToNow } from 'date-fns'

interface StatCardProps {
  title: string
  value: string | number
  change?: string
  trend?: 'up' | 'down' | 'neutral'
  icon: React.ComponentType<{ className?: string }>
  loading?: boolean
}

function StatCard({ title, value, change, trend, icon: Icon, loading }: StatCardProps) {
  return (
    <div className="card">
      <div className="card-body">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Icon className="h-8 w-8 text-primary-600" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="flex items-baseline">
                {loading ? (
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
                ) : (
                  <>
                    <div className="text-2xl font-semibold text-gray-900">
                      {typeof value === 'number' ? value.toLocaleString() : value}
                    </div>
                    {change && (
                      <div className="ml-2 flex items-baseline text-sm">
                        {trend === 'up' ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : trend === 'down' ? (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        ) : null}
                        <span
                          className={`ml-1 ${
                            trend === 'up'
                              ? 'text-green-600'
                              : trend === 'down'
                              ? 'text-red-600'
                              : 'text-gray-600'
                          }`}
                        >
                          {change}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}

interface HealthStatusProps {
  status: 'healthy' | 'unhealthy'
  message: string
  checks?: any
}

function HealthStatus({ status, message, checks }: HealthStatusProps) {
  const healthyCount = checks ? Object.values(checks).filter((check: any) => check.status === 'healthy').length : 0
  const totalCount = checks ? Object.keys(checks).length : 0

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-medium text-gray-900">System Health</h3>
      </div>
      <div className="card-body">
        <div className="flex items-center">
          {status === 'healthy' ? (
            <CheckCircle className="h-8 w-8 text-green-500" />
          ) : (
            <AlertTriangle className="h-8 w-8 text-red-500" />
          )}
          <div className="ml-4">
            <p className="text-lg font-medium text-gray-900">{message}</p>
            {checks && (
              <p className="text-sm text-gray-500">
                {healthyCount}/{totalCount} components healthy
              </p>
            )}
          </div>
        </div>
        
        {checks && (
          <div className="mt-4 grid grid-cols-2 gap-4">
            {Object.entries(checks).map(([name, check]: [string, any]) => (
              <div key={name} className="flex items-center">
                {check.status === 'healthy' ? (
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                ) : (
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                )}
                <span className="ml-2 text-sm text-gray-600 capitalize">{name}</span>
                <span className="ml-auto text-xs text-gray-400">
                  {check.responseTime?.toFixed(1)}ms
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function RecentSyncs({ syncStatus }: { syncStatus: any }) {
  const recentSyncs = syncStatus?.data?.recentSyncs || []

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-medium text-gray-900">Recent Sync Operations</h3>
      </div>
      <div className="card-body">
        {recentSyncs.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No recent sync operations</p>
        ) : (
          <div className="space-y-3">
            {recentSyncs.slice(0, 5).map((sync: any) => (
              <div key={sync.id} className="flex items-center justify-between">
                <div className="flex items-center">
                  {sync.status === 'completed' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : sync.status === 'failed' ? (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  ) : (
                    <Clock className="h-5 w-5 text-yellow-500" />
                  )}
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">
                      {sync.syncType} sync
                    </p>
                    <p className="text-xs text-gray-500">
                      {sync.recordsProcessed || 0} records processed
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(sync.startedAt), { addSuffix: true })}
                  </p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    sync.status === 'completed' ? 'bg-green-100 text-green-800' :
                    sync.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {sync.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { data: health, isLoading: healthLoading } = useDetailedHealth()
  const { data: stats, isLoading: statsLoading } = useOpportunityStatistics()
  const { data: syncStatus, isLoading: syncLoading } = useSyncStatus()

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your SAM.gov integration system
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Opportunities"
          value={stats?.data?.totalOpportunities || 0}
          change="+12% from last week"
          trend="up"
          icon={FileText}
          loading={statsLoading}
        />
        <StatCard
          title="Successful Syncs"
          value={syncStatus?.data?.statistics?.totalSyncs || 0}
          change="+5% from last week"
          trend="up"
          icon={RefreshCw}
          loading={syncLoading}
        />
        <StatCard
          title="System Health"
          value={health?.status === 'healthy' ? 'Operational' : 'Issues'}
          icon={Activity}
          loading={healthLoading}
        />
        <StatCard
          title="Data Storage"
          value="PostgreSQL"
          change="99.9% uptime"
          icon={Database}
          loading={false}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Health */}
        <div>
          {healthLoading ? (
            <div className="card">
              <div className="card-body">
                <LoadingSpinner />
              </div>
            </div>
          ) : health ? (
            <HealthStatus
              status={health.status}
              message={health.overall.message}
              checks={health.checks}
            />
          ) : (
            <div className="card">
              <div className="card-body">
                <p className="text-gray-500">Unable to load health status</p>
              </div>
            </div>
          )}
        </div>

        {/* Recent Syncs */}
        <div>
          {syncLoading ? (
            <div className="card">
              <div className="card-body">
                <LoadingSpinner />
              </div>
            </div>
          ) : (
            <RecentSyncs syncStatus={syncStatus} />
          )}
        </div>
      </div>

      {/* System Information */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">System Information</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Application</h4>
              <dl className="mt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-600">Version:</dt>
                  <dd className="text-gray-900">1.0.0</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-600">Environment:</dt>
                  <dd className="text-gray-900">{health?.environment || 'Unknown'}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-600">Uptime:</dt>
                  <dd className="text-gray-900">
                    {health?.uptime ? `${Math.floor(health.uptime / 3600)}h ${Math.floor((health.uptime % 3600) / 60)}m` : 'Unknown'}
                  </dd>
                </div>
              </dl>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900">API Integration</h4>
              <dl className="mt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-600">SAM.gov API:</dt>
                  <dd className="text-gray-900">v2</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-600">Rate Limit:</dt>
                  <dd className="text-gray-900">60/min</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-600">Last Sync:</dt>
                  <dd className="text-gray-900">
                    {syncStatus?.data?.lastSync?.startedAt ? 
                      formatDistanceToNow(new Date(syncStatus.data.lastSync.startedAt), { addSuffix: true }) : 
                      'Never'
                    }
                  </dd>
                </div>
              </dl>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900">Database</h4>
              <dl className="mt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-600">Type:</dt>
                  <dd className="text-gray-900">PostgreSQL</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-600">Status:</dt>
                  <dd className="text-gray-900">
                    {health?.checks?.database?.status === 'healthy' ? 'Connected' : 'Disconnected'}
                  </dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-600">Response Time:</dt>
                  <dd className="text-gray-900">
                    {health?.checks?.database?.responseTime?.toFixed(1)}ms
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
