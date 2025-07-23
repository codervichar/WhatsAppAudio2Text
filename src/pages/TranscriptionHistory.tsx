import React, { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { ArrowLeft, FileText, Calendar, Clock, Play, Download, Share2, Search, Filter, MoreHorizontal, CheckCircle, AlertCircle, Trash2, Loader2, Settings } from 'lucide-react'
import { Link } from 'react-router-dom'
import { apiService } from '../services/api'

interface Transcription {
  id: string;
  date: string;
  time: string;
  text: string;
  audioLength: string;
  status: 'completed' | 'processing' | 'failed' | 'pending';
  fileName: string;
  fileSize: string;
  language: string;
  confidenceScore: number;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
}

interface TranscriptionStats {
  total: number;
  completed: number;
  processing: number;
  failed: number;
}

const TranscriptionHistory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([])
  const [stats, setStats] = useState<TranscriptionStats>({ total: 0, completed: 0, processing: 0, failed: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Fetch transcription history
  const fetchTranscriptions = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await apiService.getTranscriptionHistory({
        page: currentPage,
        limit: 10,
        status: selectedFilter !== 'all' ? selectedFilter : undefined,
        search: searchTerm || undefined
      })

      if (response.success) {
        setTranscriptions(response.data.transcriptions)
        setStats(response.data.statistics)
        setTotalPages(response.data.pagination.total_pages)
      } else {
        setError(response.message || 'Failed to fetch transcriptions')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Fetch stats only
  const fetchStats = async () => {
    try {
      const response = await apiService.getTranscriptionStats()
      if (response.success) {
        setStats(response.data.statistics)
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }

  // Delete transcription
  const handleDeleteTranscription = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this transcription?')) {
      return
    }

    try {
      const response = await apiService.deleteTranscription(id)
      if (response.success) {
        // Refresh the list
        await fetchTranscriptions()
        await fetchStats()
      } else {
        setError(response.message || 'Failed to delete transcription')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete transcription')
    }
  }

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1) // Reset to first page when searching
      fetchTranscriptions()
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, selectedFilter])

  // Initial load
  useEffect(() => {
    fetchTranscriptions()
  }, [currentPage])

  const filteredTranscriptions = transcriptions

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'processing':
        return <Settings className="w-4 h-4 text-blue-500" />
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'processing':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'failed':
        return 'bg-red-50 text-red-700 border-red-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <Helmet>
        <title>Transcription History - WhatsApp2Text</title>
        <meta name="description" content="View your transcription history from WhatsApp2Text." />
      </Helmet>
      
      {/* Header */}
      <div className="bg-gradient-to-r from-white via-blue-50/30 to-purple-50/30 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <Link 
                to="/dashboard" 
                className="flex items-center text-gray-600 hover:text-blue-600 transition-all duration-300 transform hover:scale-105"
              >
                <div className="w-10 h-10 bg-gray-100 hover:bg-blue-100 rounded-xl flex items-center justify-center transition-colors duration-300">
                  <ArrowLeft className="w-5 h-5" />
                </div>
                <span className="font-semibold ml-3">Back to Dashboard</span>
              </Link>
              <div className="h-8 w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent" />
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Transcription History
                </h1>
                <p className="text-gray-500 text-sm mt-1">Manage and view all your audio transcriptions</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button className="p-3 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-300 transform hover:scale-105">
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

              {/* Search and Filter Bar */}
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {/* Search Bar */}
            <div className="flex-1 relative group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors duration-200" />
              <input
                type="text"
                placeholder="Search transcriptions by filename or content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-300 shadow-sm hover:shadow-md"
              />
            </div>
            
            {/* Filter Dropdown */}
            <div className="relative group">
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="appearance-none bg-white border-2 border-gray-200 rounded-2xl px-4 py-4 pr-12 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="completed">✅ Completed</option>
                <option value="processing">⏳ Processing</option>
                <option value="failed">❌ Failed</option>
              </select>
              <Filter className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none group-focus-within:text-blue-500 transition-colors duration-200" />
            </div>
          </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 shadow-lg border border-blue-200 transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-700 mb-1">Total Files</p>
                <p className="text-3xl font-bold text-blue-900">{stats.total}</p>
                <p className="text-xs text-blue-600 mt-1">All time</p>
              </div>
              <div className="w-14 h-14 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                <FileText className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 shadow-lg border border-green-200 transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-green-700 mb-1">Completed</p>
                <p className="text-3xl font-bold text-green-900">{stats.completed}</p>
                <p className="text-xs text-green-600 mt-1">Successfully processed</p>
              </div>
              <div className="w-14 h-14 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
                <CheckCircle className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 shadow-lg border border-purple-200 transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-purple-700 mb-1">Processing</p>
                <p className="text-3xl font-bold text-purple-900">{stats.processing}</p>
                <p className="text-xs text-purple-600 mt-1">In progress</p>
              </div>
              <div className="w-14 h-14 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                <Settings className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-pulse">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-10 h-10 bg-gray-200 rounded-xl"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                    <div className="h-3 bg-gray-200 rounded w-1/4 mb-3"></div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

                {/* Transcription List */}
        {!loading && (
          <div className="space-y-6">
            {filteredTranscriptions.map((transcription, index) => (
              <div 
                key={transcription.id}
                className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                          <FileText className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 text-lg mb-1">{transcription.fileName}</h3>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                            <span className="flex items-center bg-gray-50 px-2 py-1 rounded-lg">
                              <Calendar className="w-4 h-4 mr-1" />
                              {transcription.date}
                            </span>
                            <span className="flex items-center bg-gray-50 px-2 py-1 rounded-lg">
                              <Clock className="w-4 h-4 mr-1" />
                              {transcription.time}
                            </span>
                            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-lg font-medium">
                              {transcription.audioLength}
                            </span>
                            <span className="bg-gray-50 px-2 py-1 rounded-lg">
                              {transcription.fileSize}
                            </span>
                            <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded-lg font-medium">
                              {transcription.language.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3 mb-4">
                        {getStatusIcon(transcription.status)}
                        <span className={`px-4 py-2 rounded-full text-sm font-semibold border-2 ${getStatusColor(transcription.status)}`}>
                          {transcription.status.charAt(0).toUpperCase() + transcription.status.slice(1)}
                        </span>
                        {transcription.status === 'completed' && (
                          <>
                            <span className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-200">
                              📝 {transcription.wordCount} words
                            </span>
                            <span className="px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium border border-green-200">
                              🎯 {(transcription.confidenceScore * 100).toFixed(0)}% confidence
                            </span>
                          </>
                        )}
                      </div>
                      
                      <div className="bg-gray-50 rounded-xl p-4 mb-4">
                        <p className="text-gray-700 leading-relaxed line-clamp-3 text-sm">
                          {transcription.text}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1 ml-4">
                      <button 
                        className="p-3 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all duration-200"
                        title="Play audio"
                      >
                        <Play className="w-5 h-5" />
                      </button>
                      <button 
                        className="p-3 text-green-500 hover:text-green-700 hover:bg-green-50 rounded-xl transition-all duration-200"
                        title="Download transcription"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                      <button 
                        className="p-3 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all duration-200"
                        title="Delete transcription"
                        onClick={() => handleDeleteTranscription(transcription.id)}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredTranscriptions.length === 0 && (
          <div className="text-center py-16">
            {/* Animated Icon */}
            <div className="relative mb-8">
              <div className="w-32 h-32 bg-gradient-to-br from-blue-50 to-purple-50 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                  <FileText className="w-12 h-12 text-blue-600" />
                </div>
              </div>
              {/* Floating elements */}
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }}></div>
              <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '1s' }}></div>
              <div className="absolute top-1/2 -right-4 w-4 h-4 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '1.5s' }}></div>
            </div>
            
            {/* Content */}
            <div className="max-w-md mx-auto">
              <h3 className="text-2xl font-bold text-gray-900 mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {searchTerm || selectedFilter !== 'all' 
                  ? 'No matching transcriptions'
                  : 'Ready to transcribe?'
                }
              </h3>
              <p className="text-gray-600 leading-relaxed mb-8">
                {searchTerm || selectedFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria to find what you\'re looking for.'
                  : 'Upload your first audio file and watch it transform into accurate text transcriptions with our advanced AI technology.'
                }
              </p>
              
              {!searchTerm && selectedFilter === 'all' && (
                <div className="space-y-4">
                  <Link 
                    to="/dashboard" 
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                  >
                    <FileText className="w-5 h-5 mr-3" />
                    <span className="font-semibold">Upload Audio File</span>
                  </Link>
                  
                  {/* Feature highlights */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
                    <div className="text-center p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                      </div>
                      <p className="text-xs font-medium text-gray-700">High Accuracy</p>
                    </div>
                    <div className="text-center p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <Clock className="w-4 h-4 text-green-600" />
                      </div>
                      <p className="text-xs font-medium text-gray-700">Fast Processing</p>
                    </div>
                    <div className="text-center p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <Share2 className="w-4 h-4 text-purple-600" />
                      </div>
                      <p className="text-xs font-medium text-gray-700">Easy Sharing</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default TranscriptionHistory