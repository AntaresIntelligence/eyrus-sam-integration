import React, { useState } from 'react'
import {
  Search,
  Filter,
  Download,
  Eye,
  ExternalLink,
  Calendar,
  DollarSign,
  Building,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useOpportunities } from '../hooks/useApi'
import LoadingSpinner from '../components/LoadingSpinner'
import { formatDistanceToNow, format } from 'date-fns'
import { Link } from 'react-router-dom'

interface FiltersState {
  searchTerm: string
  naicsCode: string
  department: string
  opportunityType: string
  postedFrom: string
  postedTo: string
}

function OpportunityCard({ opportunity }: { opportunity: any }) {
  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="card-body">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {opportunity.title}
            </h3>
            <p className="text-sm text-gray-600 mb-3 line-clamp-3">
              {opportunity.description || 'No description available'}
            </p>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              {opportunity.department && (
                <div className="flex items-center text-sm text-gray-600">
                  <Building className="h-4 w-4 mr-2" />
                  {opportunity.department}
                </div>
              )}
              {opportunity.naicsCode && (
                <div className="flex items-center text-sm text-gray-600">
                  <FileText className="h-4 w-4 mr-2" />
                  NAICS: {opportunity.naicsCode}
                </div>
              )}
              {opportunity.postedDate && (
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  Posted: {format(new Date(opportunity.postedDate), 'MMM d, yyyy')}
                </div>
              )}
              {opportunity.awardAmount && (
                <div className="flex items-center text-sm text-gray-600">
                  <DollarSign className="h-4 w-4 mr-2" />
                  ${opportunity.awardAmount.toLocaleString()}
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  opportunity.syncStatus === 'synced' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {opportunity.syncStatus || 'pending'}
                </span>
                {opportunity.opportunityType && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {opportunity.opportunityType}
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <button className="btn btn-secondary btn-sm">
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </button>
                {opportunity.samUrl && (
                  <a
                    href={opportunity.samUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-sm"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    SAM.gov
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Filters({ filters, setFilters, onApply }: {
  filters: FiltersState
  setFilters: (filters: FiltersState) => void
  onApply: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-secondary"
      >
        <Filter className="h-4 w-4 mr-2" />
        Filters
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                NAICS Code
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g., 236220"
                value={filters.naicsCode}
                onChange={(e) => setFilters({ ...filters, naicsCode: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g., Department of Defense"
                value={filters.department}
                onChange={(e) => setFilters({ ...filters, department: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Opportunity Type
              </label>
              <select
                className="select"
                value={filters.opportunityType}
                onChange={(e) => setFilters({ ...filters, opportunityType: e.target.value })}
              >
                <option value="">All Types</option>
                <option value="a">Award Notice</option>
                <option value="p">Presolicitation</option>
                <option value="k">Combined Synopsis/Solicitation</option>
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Posted From
                </label>
                <input
                  type="date"
                  className="input"
                  value={filters.postedFrom}
                  onChange={(e) => setFilters({ ...filters, postedFrom: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Posted To
                </label>
                <input
                  type="date"
                  className="input"
                  value={filters.postedTo}
                  onChange={(e) => setFilters({ ...filters, postedTo: e.target.value })}
                />
              </div>
            </div>
            
            <div className="flex justify-between pt-2">
              <button
                onClick={() => {
                  setFilters({
                    searchTerm: '',
                    naicsCode: '',
                    department: '',
                    opportunityType: '',
                    postedFrom: '',
                    postedTo: '',
                  })
                  onApply()
                }}
                className="btn btn-secondary btn-sm"
              >
                Clear
              </button>
              <button
                onClick={() => {
                  onApply()
                  setIsOpen(false)
                }}
                className="btn btn-primary btn-sm"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Opportunities() {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<FiltersState>({
    searchTerm: '',
    naicsCode: '',
    department: '',
    opportunityType: '',
    postedFrom: '',
    postedTo: '',
  })
  const [appliedFilters, setAppliedFilters] = useState<FiltersState>(filters)
  
  const limit = 20
  const offset = (page - 1) * limit
  
  const queryParams = {
    limit,
    offset,
    ...(appliedFilters.searchTerm && { searchTerm: appliedFilters.searchTerm }),
    ...(appliedFilters.naicsCode && { naicsCode: appliedFilters.naicsCode }),
    ...(appliedFilters.department && { department: appliedFilters.department }),
    ...(appliedFilters.opportunityType && { opportunityType: appliedFilters.opportunityType }),
    ...(appliedFilters.postedFrom && { postedFrom: appliedFilters.postedFrom }),
    ...(appliedFilters.postedTo && { postedTo: appliedFilters.postedTo }),
  }
  
  const { data, isLoading, error } = useOpportunities(queryParams)
  
  const opportunities = data?.data || []
  const totalCount = data?.meta?.count || 0
  const totalPages = Math.ceil(totalCount / limit)
  
  const handleApplyFilters = () => {
    setAppliedFilters(filters)
    setPage(1)
  }
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    handleApplyFilters()
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Opportunities</h1>
          <p className="mt-1 text-sm text-gray-500">
            Browse and search SAM.gov opportunities
          </p>
        </div>
        <button className="btn btn-primary">
          <Download className="h-4 w-4 mr-2" />
          Export
        </button>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  className="input pl-10"
                  placeholder="Search opportunities by title, description, or solicitation number..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary">
              Search
            </button>
            <Filters 
              filters={filters} 
              setFilters={setFilters} 
              onApply={handleApplyFilters}
            />
          </form>
        </div>
      </div>

      {/* Results */}
      <div>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" text="Loading opportunities..." />
          </div>
        ) : error ? (
          <div className="card">
            <div className="card-body text-center py-12">
              <p className="text-red-600">Failed to load opportunities</p>
              <p className="text-sm text-gray-500 mt-1">
                {error.message || 'An unexpected error occurred'}
              </p>
            </div>
          </div>
        ) : opportunities.length === 0 ? (
          <div className="card">
            <div className="card-body text-center py-12">
              <p className="text-gray-500">No opportunities found</p>
              <p className="text-sm text-gray-400 mt-1">
                Try adjusting your search criteria or filters
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Results count */}
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-600">
                Showing {offset + 1}-{Math.min(offset + limit, totalCount)} of {totalCount} opportunities
              </p>
            </div>
            
            {/* Opportunities grid */}
            <div className="space-y-4">
              {opportunities.map((opportunity: any) => (
                <OpportunityCard key={opportunity.id} opportunity={opportunity} />
              ))}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 mt-8">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                  className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
