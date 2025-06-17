import { useState, useEffect } from 'react'
import {
  Play,
  AlertTriangle,
  CheckCircle,
  Clock,
  Trash2,
  TestTube,
  RefreshCw,
  Download,
  Eye,
} from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import { format } from 'date-fns'
import { useForm } from 'react-hook-form'
import axios from 'axios'
import toast from 'react-hot-toast'

interface SyncFormData {
  naics_codes: string[]
  posted_from: string
  posted_to: string
  limit: number
  dry_run: boolean
}

interface SyncStatus {
  sync_id: string
  status: 'running' | 'completed' | 'failed'
  started_at: string
  completed_at?: string
  naics_codes: string[]
  posted_from: string
  posted_to: string
  dry_run: boolean
  progress: {
    processed: number
    created: number
    errors: number
    current_naics?: string
  }
  error?: string
}

const NAICS_OPTIONS = [
  { code: '236220', name: 'Commercial & Institutional Building Construction' },
  { code: '236210', name: 'Industrial Building Construction' },
  { code: '237110', name: 'Water & Sewer Line Construction' },
  { code: '237130', name: 'Power & Communication Line Construction' },
  { code: '237310', name: 'Highway, Street & Bridge Construction' },
  { code: '237990', name: 'Other Heavy Construction' },
];

export default function SyncManagement() {
  const [activeSyncs, setActiveSyncs] = useState<SyncStatus[]>([]);
  const [selectedNaics, setSelectedNaics] = useState<string[]>(['236220']);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, watch } = useForm<SyncFormData>({
    defaultValues: {
      naics_codes: ['236220'],
      posted_from: '2025-06-01',
      posted_to: '2025-06-17',
      limit: 100,
      dry_run: false,
    }
  });

  // Poll for active sync status
  useEffect(() => {
    const pollActiveSyncs = async () => {
      try {
        const response = await axios.get('http://localhost:3003/api/sync/active');
        if (response.data.success) {
          setActiveSyncs(response.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch active syncs:', error);
      }
    };

    pollActiveSyncs();
    const interval = setInterval(pollActiveSyncs, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, []);

  const handleNaicsChange = (naicsCode: string) => {
    setSelectedNaics(prev => 
      prev.includes(naicsCode) 
        ? prev.filter(code => code !== naicsCode)
        : [...prev, naicsCode]
    );
  };

  const onSubmit = async (data: SyncFormData) => {
    setIsLoading(true);
    
    try {
      const payload = {
        naics_codes: selectedNaics,
        posted_from: data.posted_from,
        posted_to: data.posted_to,
        limit: data.limit,
        dry_run: data.dry_run
      };

      console.log('🚀 Triggering SAM.gov sync:', payload);
      
      const response = await axios.post('http://localhost:3003/api/sync/sam', payload);
      
      if (response.data.success) {
        toast.success(`SAM.gov sync started! Sync ID: ${response.data.sync_id}`);
        console.log('✅ Sync started:', response.data);
      } else {
        toast.error('Failed to start sync');
      }
    } catch (error: any) {
      console.error('❌ Sync failed:', error);
      toast.error(`Sync failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async () => {
    try {
      const response = await axios.get('http://localhost:3003/health');
      if (response.data.sam_api_configured) {
        toast.success('SAM.gov API connection is configured and ready!');
      } else {
        toast.error('SAM.gov API not configured');
      }
    } catch (error) {
      toast.error('Failed to test connection');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Clock className="h-5 w-5 text-blue-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (status) {
      case 'running':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'completed':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'failed':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">SAM.gov Sync Management</h1>
        <p className="text-gray-600">Trigger real-time synchronization with SAM.gov opportunities API</p>
      </div>

      {/* Sync Form */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">🚀 Start New SAM.gov Sync</h3>
          <p className="text-sm text-gray-500">Pull fresh government contracting opportunities from SAM.gov</p>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* NAICS Code Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                NAICS Codes (Select one or more)
              </label>
              <div className="grid grid-cols-2 gap-3">
                {NAICS_OPTIONS.map((naics) => (
                  <label key={naics.code} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedNaics.includes(naics.code)}
                      onChange={() => handleNaicsChange(naics.code)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      <strong>{naics.code}</strong> - {naics.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Posted From
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  {...register('posted_from', { required: 'Start date is required' })}
                />
                {errors.posted_from && (
                  <p className="text-sm text-red-600 mt-1">{errors.posted_from.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Posted To
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  {...register('posted_to', { required: 'End date is required' })}
                />
                {errors.posted_to && (
                  <p className="text-sm text-red-600 mt-1">{errors.posted_to.message}</p>
                )}
              </div>
            </div>

            {/* Sync Options */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Limit (opportunities per NAICS)
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  {...register('limit', { required: 'Limit is required', min: 1, max: 1000 })}
                />
              </div>
              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    {...register('dry_run')}
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Dry Run (test without saving data)
                  </span>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={isLoading || selectedNaics.length === 0}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {isLoading ? 'Starting Sync...' : 'Start SAM.gov Sync'}
              </button>
              
              <button
                type="button"
                onClick={testConnection}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <TestTube className="h-4 w-4 mr-2" />
                Test Connection
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Active Syncs */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">🔄 Active Sync Operations</h3>
          <p className="text-sm text-gray-500">Monitor real-time sync progress</p>
        </div>
        <div className="p-6">
          {activeSyncs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No active sync operations</p>
              <p className="text-sm">Start a sync above to see real-time progress</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeSyncs.map((sync) => (
                <div key={sync.sync_id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(sync.status)}
                      <div>
                        <h4 className="font-medium text-gray-900">Sync #{sync.sync_id}</h4>
                        <p className="text-sm text-gray-500">
                          NAICS: {sync.naics_codes.join(', ')} | {sync.posted_from} to {sync.posted_to}
                        </p>
                      </div>
                    </div>
                    <span className={getStatusBadge(sync.status)}>
                      {sync.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="bg-gray-50 rounded p-3">
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Processed:</span>
                        <span className="ml-1 text-gray-900">{sync.progress.processed}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Created:</span>
                        <span className="ml-1 text-green-600">{sync.progress.created}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Errors:</span>
                        <span className="ml-1 text-red-600">{sync.progress.errors}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Started:</span>
                        <span className="ml-1 text-gray-900">
                          {format(new Date(sync.started_at), 'HH:mm:ss')}
                        </span>
                      </div>
                    </div>
                    
                    {sync.progress.current_naics && (
                      <div className="mt-2 text-sm">
                        <span className="font-medium text-gray-700">Current NAICS:</span>
                        <span className="ml-1 text-blue-600">{sync.progress.current_naics}</span>
                      </div>
                    )}
                    
                    {sync.error && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        <strong>Error:</strong> {sync.error}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">💡 How to Use</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Select one or more NAICS codes for construction industry opportunities</li>
          <li>• Choose a date range for recently posted opportunities</li>
          <li>• Use "Dry Run" to test without saving data to the database</li>
          <li>• Monitor sync progress in real-time in the Active Syncs section</li>
          <li>• New opportunities will appear in the Opportunities page after sync completes</li>
        </ul>
      </div>
    </div>
  );
}