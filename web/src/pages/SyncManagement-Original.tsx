import {
  Play,
  AlertTriangle,
  CheckCircle,
  Clock,
  Trash2,
  TestTube,
} from 'lucide-react'
import {
  useSyncHistory,
  useSyncStatus,
  useManualSync,
  useTestConnection,
  useCleanupData,
} from '../hooks/useApi'
import LoadingSpinner from '../components/LoadingSpinner'
import { format } from 'date-fns'
import { useForm } from 'react-hook-form'

interface SyncFormData {
  postedFrom: string
  postedTo: string
  ptype: string
  ncode: string
  dryRun: boolean
}

function SyncForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<SyncFormData>({
    defaultValues: {
      postedFrom: '2025-01-01',
      postedTo: '2025-06-16',
      ptype: 'a',
      ncode: '236220',
      dryRun: false,
    }
  })
  
  const manualSync = useManualSync()
  const testConnection = useTestConnection()
  
  const onSubmit = (data: SyncFormData) => {
    manualSync.mutate(data)
  }
  
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-medium text-gray-900">Manual Sync</h3>
        <p className="text-sm text-gray-500">Trigger a manual synchronization with SAM.gov</p>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Posted From
              </label>
              <input
                type="date"
                className="input"
                {...register('postedFrom', { required: 'Start date is required' })}
              />
              {errors.postedFrom && (
                <p className="text-sm text-red-600 mt-1">{errors.postedFrom.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Posted To
              </label>
              <input
                type="date"
                className="input"
                {...register('postedTo', { required: 'End date is required' })}
              />
              {errors.postedTo && (
                <p className="text-sm text-red-600 mt-1">{errors.postedTo.message}</p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Opportunity Type
              </label>
              <select className="select" {...register('ptype')}>
                <option value="a">Award Notice</option>
                <option value="p">Presolicitation</option>
                <option value="k">Combined Synopsis/Solicitation</option>
                <option value="">All Types</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                NAICS Code
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g., 236220"
                {...register('ncode')}
              />
            </div>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="dryRun"
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              {...register('dryRun')}
            />
            <label htmlFor="dryRun" className="ml-2 text-sm text-gray-700">
              Dry run (test only, don't save data)
            </label>
          </div>
          
          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={manualSync.isPending}
              className="btn btn-primary"
            >
              {manualSync.isPending ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Start Sync
            </button>
            
            <button
              type="button"
              onClick={() => testConnection.mutate()}
              disabled={testConnection.isPending}
              className="btn btn-secondary"
            >
              {testConnection.isPending ? (
                <LoadingSpinner size="sm" />
              ) : (
                <TestTube className="h-4 w-4 mr-2" />
              )}
              Test Connection
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SyncStats({ syncStatus }: { syncStatus: any }) {
  const stats = syncStatus?.data?.statistics || {}
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="card">
        <div className="card-body text-center">
          <div className="text-2xl font-bold text-primary-600">
            {stats.totalSyncs || 0}
          </div>
          <div className="text-sm text-gray-600">Total Syncs</div>
        </div>
      </div>
      
      <div className="card">
        <div className="card-body text-center">
          <div className="text-2xl font-bold text-green-600">
            {stats.successfulSyncs || 0}
          </div>
          <div className="text-sm text-gray-600">Successful</div>
        </div>
      </div>
      
      <div className="card">
        <div className="card-body text-center">
          <div className="text-2xl font-bold text-red-600">
            {stats.failedSyncs || 0}
          </div>
          <div className="text-sm text-gray-600">Failed</div>
        </div>
      </div>
      
      <div className="card">
        <div className="card-body text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {stats.runningSyncs || 0}
          </div>
          <div className="text-sm text-gray-600">Running</div>
        </div>
      </div>
    </div>
  )
}

function SyncHistoryTable({ syncHistory }: { syncHistory: any }) {
  const syncs = syncHistory?.data || []
  
  if (syncs.length === 0) {
    return (
      <div className="card">
        <div className="card-body text-center py-12">
          <p className="text-gray-500">No sync history available</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-medium text-gray-900">Sync History</h3>
      </div>
      <div className="card-body p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Records
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Started
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {syncs.map((sync: any) => {
                const duration = sync.completedAt && sync.startedAt 
                  ? new Date(sync.completedAt).getTime() - new Date(sync.startedAt).getTime()
                  : null
                
                return (
                  <tr key={sync.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {sync.status === 'completed' ? (
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                        ) : sync.status === 'failed' ? (
                          <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                        ) : (
                          <Clock className="h-5 w-5 text-yellow-500 mr-2" />
                        )}
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          sync.status === 'completed' ? 'bg-green-100 text-green-800' :
                          sync.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {sync.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sync.syncType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div>Processed: {sync.recordsProcessed || 0}</div>
                        <div className="text-xs text-gray-500">
                          Created: {sync.recordsCreated || 0}, Updated: {sync.recordsUpdated || 0}
                          {sync.recordsFailed > 0 && (
                            <span className="text-red-600">, Failed: {sync.recordsFailed}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div>{format(new Date(sync.startedAt), 'MMM d, yyyy')}</div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(sync.startedAt), 'h:mm a')}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {duration ? `${Math.round(duration / 1000)}s` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-primary-600 hover:text-primary-900">
                        View Details
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function SyncManagement() {
  const { data: syncHistory, isLoading: historyLoading } = useSyncHistory(20)
  const { data: syncStatus, isLoading: statusLoading } = useSyncStatus()
  const cleanupData = useCleanupData()
  
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sync Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage SAM.gov synchronization operations
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => cleanupData.mutate()}
            disabled={cleanupData.isPending}
            className="btn btn-secondary"
          >
            {cleanupData.isPending ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Cleanup Old Data
          </button>
        </div>
      </div>

      {/* Sync Stats */}
      <div>
        {statusLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="lg" text="Loading sync status..." />
          </div>
        ) : (
          <SyncStats syncStatus={syncStatus} />
        )}
      </div>

      {/* Manual Sync Form */}
      <SyncForm />

      {/* Sync History */}
      <div>
        {historyLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="lg" text="Loading sync history..." />
          </div>
        ) : (
          <SyncHistoryTable syncHistory={syncHistory} />
        )}
      </div>
    </div>
  )
}
