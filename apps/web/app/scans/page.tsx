'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { getScanIds, removeScan } from '@/lib/scans'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Scan {
  id: string
  url: string
  status: string
  privacy_score: number
  created_at: string
  finished_at: string | null
}

export default function ScansPage() {
  const router = useRouter()
  const [scans, setScans] = useState<Scan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchScans = async () => {
      try {
        const userScanIds = getScanIds()
        
        if (userScanIds.length === 0) {
          setScans([])
          setLoading(false)
          return
        }
        
        // Fetch each user's scan
        const scanPromises = userScanIds.map(id => 
          axios.get(`${API_URL}/api/scans/${id}`)
            .then(r => ({ id, data: r.data, found: true }))
            .catch(err => ({ id, data: null, found: false }))
        )
        
        const results = await Promise.all(scanPromises)
        
        // Remove invalid scan IDs from localStorage
        results.forEach(result => {
          if (!result.found) {
            removeScan(result.id)
          }
        })
        
        const validScans = results
          .filter(r => r.found && r.data)
          .map(r => r.data!)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        
        setScans(validScans)
        setLoading(false)
      } catch (err: any) {
        setError('Failed to fetch scans')
        setLoading(false)
      }
    }

    fetchScans()
  }, [])

  const handleDeleteScan = (id: string) => {
    removeScan(id)
    setScans(prev => prev.filter(s => s.id !== id))
  }
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'from-green-400 to-emerald-500'
    if (score >= 50) return 'from-yellow-400 to-orange-500'
    return 'from-red-400 to-pink-500'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-1 text-xs bg-green-500/20 text-green-300 border border-green-500/40 rounded-full">Completed</span>
      case 'running':
        return <span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded-full animate-pulse">Running</span>
      case 'failed':
        return <span className="px-2 py-1 text-xs bg-red-500/20 text-red-300 border border-red-500/40 rounded-full">Failed</span>
      default:
        return <span className="px-2 py-1 text-xs bg-gray-500/20 text-gray-300 border border-gray-500/40 rounded-full">{status}</span>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading scans...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-8 px-4">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="mb-6">
          <button
            onClick={() => router.push('/')}
            className="text-blue-400 hover:text-blue-300 mb-4 inline-flex items-center transition-all duration-200 hover:translate-x-[-4px]"
          >
            ← Back to Home
          </button>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <span className="text-3xl">📚</span>
              Scan History
            </h1>
            <button
              onClick={() => router.push('/compare')}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
            >
              Compare Scans
            </button>
          </div>
        </div>

        {scans.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-sm p-8 rounded-xl border border-white/20 shadow-xl text-center">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-gray-300 mb-4 text-lg">No scans found</p>
            <p className="text-gray-400 text-sm mb-6">Create your first scan to start analyzing website privacy</p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
            >
              Create First Scan
            </button>
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-xl overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    URL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Privacy Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-transparent divide-y divide-white/10">
                {scans.map((scan) => (
                  <tr key={scan.id} className="hover:bg-white/5 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white truncate max-w-md">{scan.url}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(scan.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {scan.status === 'completed' ? (
                        <span className={`text-2xl font-bold bg-gradient-to-r ${getScoreColor(scan.privacy_score)} text-transparent bg-clip-text`}>
                          {scan.privacy_score}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {new Date(scan.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => router.push(`/scan/${scan.id}`)}
                        className="text-blue-400 hover:text-blue-300 mr-4 transition-colors duration-200"
                      >
                        View
                      </button>
                      {scan.status === 'completed' && (
                        <button
                          onClick={() => router.push(`/scan/${scan.id}/graph`)}
                          className="text-green-400 hover:text-green-300 mr-4 transition-colors duration-200"
                        >
                          Graph
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteScan(scan.id)}
                        className="text-red-400 hover:text-red-300 transition-colors duration-200"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
