import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  BarChart3,
  FileText,
  Settings,
  Activity,
  RefreshCw,
  Menu,
  X,
  Bell,
  Search,
  User,
  Shield,
  Database,
  Zap,
} from 'lucide-react'
import { useHealth } from '../hooks/useApi'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
  { name: 'Opportunities', href: '/opportunities', icon: FileText },
  { name: 'Sync Management', href: '/sync', icon: RefreshCw },
  { name: 'System Health', href: '/health', icon: Activity },
  { name: 'Settings', href: '/settings', icon: Settings },
]

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const { data: health } = useHealth()

  const getHealthIcon = () => {
    if (!health) return <Activity className="w-4 h-4 text-gray-400" />
    
    if (health.status === 'healthy') {
      return <Shield className="w-4 h-4 text-green-500" />
    } else {
      return <Zap className="w-4 h-4 text-red-500" />
    }
  }

  const getHealthStatus = () => {
    if (!health) return 'Checking...'
    return health.status === 'healthy' ? 'All Systems Operational' : 'System Issues Detected'
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar for desktop */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <Database className="w-8 h-8 text-primary-600" />
            <div className="ml-3">
              <h1 className="text-xl font-bold text-gray-900">Eyrus SAM</h1>
              <p className="text-sm text-gray-500">Integration Dashboard</p>
            </div>
          </div>
          
          {/* Health Status */}
          <div className="mt-6 mx-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center">
                {getHealthIcon()}
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">System Status</p>
                  <p className="text-xs text-gray-500">{getHealthStatus()}</p>
                </div>
              </div>
            </div>
          </div>

          <nav className="mt-6 flex-1 px-2 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={classNames(
                    isActive
                      ? 'bg-primary-50 border-primary-500 text-primary-700'
                      : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                    'group flex items-center px-3 py-2 text-sm font-medium border-l-4 transition-colors'
                  )}
                >
                  <item.icon
                    className={classNames(
                      isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500',
                      'mr-3 h-5 w-5 transition-colors'
                    )}
                  />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Version info */}
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div>
                <p className="text-xs font-medium text-gray-900">Version 1.0.0</p>
                <p className="text-xs text-gray-500">Enterprise Edition</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 flex z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            {/* Mobile navigation content */}
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-4">
                <Database className="w-8 h-8 text-primary-600" />
                <div className="ml-3">
                  <h1 className="text-xl font-bold text-gray-900">Eyrus SAM</h1>
                  <p className="text-sm text-gray-500">Integration Dashboard</p>
                </div>
              </div>
              <nav className="mt-5 px-2 space-y-1">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={classNames(
                        isActive
                          ? 'bg-primary-50 border-primary-500 text-primary-700'
                          : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                        'group flex items-center px-3 py-2 text-sm font-medium border-l-4'
                      )}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon
                        className={classNames(
                          isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500',
                          'mr-3 h-5 w-5'
                        )}
                      />
                      {item.name}
                    </Link>
                  )
                })}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Top navigation */}
        <div className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-white shadow">
          <button
            type="button"
            className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex-1 px-4 flex justify-between">
            <div className="flex-1 flex">
              <div className="w-full flex md:ml-0">
                <div className="relative w-full text-gray-400 focus-within:text-gray-600">
                  <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
                    <Search className="h-5 w-5" />
                  </div>
                  <input
                    className="block w-full h-full pl-8 pr-3 py-2 border-transparent text-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-0 focus:border-transparent sm:text-sm"
                    placeholder="Search opportunities..."
                    type="search"
                  />
                </div>
              </div>
            </div>
            
            <div className="ml-4 flex items-center md:ml-6">
              <button
                type="button"
                className="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <Bell className="h-6 w-6" />
              </button>

              <div className="ml-3 relative">
                <div className="flex items-center">
                  <button
                    type="button"
                    className="max-w-xs bg-white flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <User className="h-8 w-8 rounded-full bg-gray-200 p-1 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}