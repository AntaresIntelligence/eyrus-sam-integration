import React, { useState } from 'react'
import {
  Database,
  Server,
  Clock,
  Bell,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  AlertTriangle,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

interface SettingsFormData {
  // Database settings
  dbHost: string
  dbPort: number
  dbName: string
  dbUser: string
  dbPassword: string
  dbPoolMin: number
  dbPoolMax: number
  
  // SAM.gov API settings
  samApiKey: string
  samApiBaseUrl: string
  samRateLimit: number
  samRequestTimeout: number
  samMaxRetries: number
  
  // Sync settings
  syncInterval: number
  syncBatchSize: number
  maxSyncRetries: number
  
  // Monitoring settings
  logLevel: string
  healthCheckInterval: number
  alertEmail: string
  
  // Data retention
  dataRetentionDays: number
  cleanupIntervalHours: number
}

function SettingsSection({ title, icon: Icon, children }: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center">
          <Icon className="h-5 w-5 text-gray-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        </div>
      </div>
      <div className="card-body space-y-4">
        {children}
      </div>
    </div>
  )
}

function FormField({ label, error, required, children }: {
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
    </div>
  )
}

export default function Settings() {
  const [showApiKey, setShowApiKey] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [activeTab, setActiveTab] = useState('database')
  
  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<SettingsFormData>({
    defaultValues: {
      // Database settings
      dbHost: 'localhost',
      dbPort: 5432,
      dbName: 'eyrus_sam',
      dbUser: 'postgres',
      dbPassword: '',
      dbPoolMin: 2,
      dbPoolMax: 10,
      
      // SAM.gov API settings
      samApiKey: 'cyPX1StgZ8Y1VaXyqkTM6RW0v6FJSP7UvLoPhyOd',
      samApiBaseUrl: 'https://api.sam.gov/prod/opportunities/v2',
      samRateLimit: 60,
      samRequestTimeout: 30000,
      samMaxRetries: 3,
      
      // Sync settings
      syncInterval: 30,
      syncBatchSize: 100,
      maxSyncRetries: 5,
      
      // Monitoring settings
      logLevel: 'info',
      healthCheckInterval: 300000,
      alertEmail: '',
      
      // Data retention
      dataRetentionDays: 365,
      cleanupIntervalHours: 24,
    }
  })
  
  const onSubmit = (data: SettingsFormData) => {
    // In a real app, this would save to the backend
    console.log('Settings saved:', data)
    toast.success('Settings saved successfully')
  }
  
  const tabs = [
    { id: 'database', name: 'Database', icon: Database },
    { id: 'api', name: 'SAM.gov API', icon: Server },
    { id: 'sync', name: 'Synchronization', icon: RefreshCw },
    { id: 'monitoring', name: 'Monitoring', icon: Bell },
    { id: 'retention', name: 'Data Retention', icon: Clock },
  ]
  
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure your SAM.gov integration settings
          </p>
        </div>
        
        {isDirty && (
          <div className="flex items-center space-x-3">
            <div className="flex items-center text-yellow-600">
              <AlertTriangle className="h-4 w-4 mr-2" />
              <span className="text-sm">Unsaved changes</span>
            </div>
            <button
              onClick={handleSubmit(onSubmit)}
              className="btn btn-primary"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </button>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  isActive
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Database Settings */}
        {activeTab === 'database' && (
          <SettingsSection title="Database Configuration" icon={Database}>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Host" error={errors.dbHost?.message} required>
                <input
                  type="text"
                  className="input"
                  {...register('dbHost', { required: 'Host is required' })}
                />
              </FormField>
              
              <FormField label="Port" error={errors.dbPort?.message}>
                <input
                  type="number"
                  className="input"
                  {...register('dbPort', { valueAsNumber: true, min: 1, max: 65535 })}
                />
              </FormField>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Database Name" error={errors.dbName?.message} required>
                <input
                  type="text"
                  className="input"
                  {...register('dbName', { required: 'Database name is required' })}
                />
              </FormField>
              
              <FormField label="Username" error={errors.dbUser?.message} required>
                <input
                  type="text"
                  className="input"
                  {...register('dbUser', { required: 'Username is required' })}
                />
              </FormField>
            </div>
            
            <FormField label="Password" error={errors.dbPassword?.message}>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  {...register('dbPassword')}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </FormField>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Pool Min Connections" error={errors.dbPoolMin?.message}>
                <input
                  type="number"
                  className="input"
                  {...register('dbPoolMin', { valueAsNumber: true, min: 1 })}
                />
              </FormField>
              
              <FormField label="Pool Max Connections" error={errors.dbPoolMax?.message}>
                <input
                  type="number"
                  className="input"
                  {...register('dbPoolMax', { valueAsNumber: true, min: 1 })}
                />
              </FormField>
            </div>
          </SettingsSection>
        )}

        {/* API Settings */}
        {activeTab === 'api' && (
          <SettingsSection title="SAM.gov API Configuration" icon={Server}>
            <FormField label="API Base URL" error={errors.samApiBaseUrl?.message} required>
              <input
                type="url"
                className="input"
                {...register('samApiBaseUrl', { required: 'API base URL is required' })}
              />
            </FormField>
            
            <FormField label="API Key" error={errors.samApiKey?.message} required>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  className="input pr-10"
                  {...register('samApiKey', { required: 'API key is required' })}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </FormField>
            
            <div className="grid grid-cols-3 gap-4">
              <FormField label="Rate Limit (per minute)" error={errors.samRateLimit?.message}>
                <input
                  type="number"
                  className="input"
                  {...register('samRateLimit', { valueAsNumber: true, min: 1 })}
                />
              </FormField>
              
              <FormField label="Request Timeout (ms)" error={errors.samRequestTimeout?.message}>
                <input
                  type="number"
                  className="input"
                  {...register('samRequestTimeout', { valueAsNumber: true, min: 1000 })}
                />
              </FormField>
              
              <FormField label="Max Retries" error={errors.samMaxRetries?.message}>
                <input
                  type="number"
                  className="input"
                  {...register('samMaxRetries', { valueAsNumber: true, min: 0, max: 10 })}
                />
              </FormField>
            </div>
          </SettingsSection>
        )}

        {/* Sync Settings */}
        {activeTab === 'sync' && (
          <SettingsSection title="Synchronization Settings" icon={RefreshCw}>
            <div className="grid grid-cols-3 gap-4">
              <FormField label="Sync Interval (minutes)" error={errors.syncInterval?.message}>
                <input
                  type="number"
                  className="input"
                  {...register('syncInterval', { valueAsNumber: true, min: 1 })}
                />
              </FormField>
              
              <FormField label="Batch Size" error={errors.syncBatchSize?.message}>
                <input
                  type="number"
                  className="input"
                  {...register('syncBatchSize', { valueAsNumber: true, min: 1, max: 1000 })}
                />
              </FormField>
              
              <FormField label="Max Retries" error={errors.maxSyncRetries?.message}>
                <input
                  type="number"
                  className="input"
                  {...register('maxSyncRetries', { valueAsNumber: true, min: 0, max: 10 })}
                />
              </FormField>
            </div>
          </SettingsSection>
        )}

        {/* Monitoring Settings */}
        {activeTab === 'monitoring' && (
          <SettingsSection title="Monitoring & Alerts" icon={Bell}>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Log Level" error={errors.logLevel?.message}>
                <select className="select" {...register('logLevel')}>
                  <option value="debug">Debug</option>
                  <option value="info">Info</option>
                  <option value="warn">Warning</option>
                  <option value="error">Error</option>
                </select>
              </FormField>
              
              <FormField label="Health Check Interval (ms)" error={errors.healthCheckInterval?.message}>
                <input
                  type="number"
                  className="input"
                  {...register('healthCheckInterval', { valueAsNumber: true, min: 30000 })}
                />
              </FormField>
            </div>
            
            <FormField label="Alert Email" error={errors.alertEmail?.message}>
              <input
                type="email"
                className="input"
                placeholder="alerts@your-company.com"
                {...register('alertEmail', { 
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                })}
              />
            </FormField>
          </SettingsSection>
        )}

        {/* Data Retention Settings */}
        {activeTab === 'retention' && (
          <SettingsSection title="Data Retention Policy" icon={Clock}>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Data Retention (days)" error={errors.dataRetentionDays?.message}>
                <input
                  type="number"
                  className="input"
                  {...register('dataRetentionDays', { valueAsNumber: true, min: 1 })}
                />
              </FormField>
              
              <FormField label="Cleanup Interval (hours)" error={errors.cleanupIntervalHours?.message}>
                <input
                  type="number"
                  className="input"
                  {...register('cleanupIntervalHours', { valueAsNumber: true, min: 1 })}
                />
              </FormField>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-800">Important</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Data older than the retention period will be permanently deleted during cleanup operations.
                    Make sure to backup any data you need to keep before reducing the retention period.
                  </p>
                </div>
              </div>
            </div>
          </SettingsSection>
        )}
      </form>
    </div>
  )
}
