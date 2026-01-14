'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { getScanIds } from '@/lib/scans'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Scan {
  id: string
  url: string
  status: string
  privacy_score: number
  created_at: string
  third_party_domains: number
  cookies_set: number
  total_requests: number
  localstorage_keys: number
}

interface ComparisonData {
  scan_a: Scan
  scan_b: Scan
  deltas: {
    third_party_domains_delta: number
    cookies_delta: number
    bytes_delta: number
    score_delta: number
    domains_added: string[]
    domains_removed: string[]
    cookies_added_count: number
    cookies_removed_count: number
  }
}

export default function ComparePage() {
  const router = useRouter()
  const [scans, setScans] = useState<Scan[]>([])
  const [scanAId, setScanAId] = useState('')
  const [scanBId, setScanBId] = useState('')
  const [comparison, setComparison] = useState<ComparisonData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchScans = async () => {
      try {
        const userScanIds = getScanIds()
        
        if (userScanIds.length === 0) {
          setScans([])
          return
        }
        
        // Fetch each user's completed scan
        const scanPromises = userScanIds.map(id => 
          axios.get(`${API_URL}/api/scans/${id}`).catch(() => null)
        )
        
        const results = await Promise.all(scanPromises)
        const completedScans = results
          .filter(r => r !== null && r!.data.status === 'completed')
          .map(r => r!.data)
        
        setScans(completedScans)
      } catch (err: any) {
        setError('Failed to load scans')
      }
    }

    fetchScans()
  }, [])

  const handleCompare = async () => {
    if (!scanAId || !scanBId) {
      setError('Please select two scans to compare')
      return
    }

    if (scanAId === scanBId) {
      setError('Please select two different scans')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Fetch both scans
      const [scanARes, scanBRes, deltaRes] = await Promise.all([
        axios.get(`${API_URL}/api/scans/${scanAId}`),
        axios.get(`${API_URL}/api/scans/${scanBId}`),
        axios.post(`${API_URL}/api/compare`, {
          scan_a_id: scanAId,
          scan_b_id: scanBId,
        })
      ])

      setComparison({
        scan_a: scanARes.data,
        scan_b: scanBRes.data,
        deltas: deltaRes.data
      })
      setLoading(false)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to compare scans')
      setLoading(false)
    }
  }

  const getDeltaColor = (delta: number) => {
    if (delta > 0) return 'from-red-400 to-pink-500' // Worse privacy
    if (delta < 0) return 'from-green-400 to-emerald-500' // Better privacy
    return 'from-gray-400 to-gray-500'
  }

  const getDeltaIcon = (delta: number) => {
    if (delta > 0) return '↑'
    if (delta < 0) return '↓'
    return '='
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
            onClick={() => router.push('/scans')}
            className="text-blue-400 hover:text-blue-300 mb-4 inline-flex items-center transition-all duration-200 hover:translate-x-[-4px]"
          >
            ← Back to Scans
          </button>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <span className="text-3xl">⚖️</span>
            Compare Scans
          </h1>
          <p className="text-gray-300 mt-2">Select two scans to compare their privacy metrics</p>
        </div>

        {/* Scan Selectors */}
        <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20 shadow-xl mb-6 transition-all duration-300 hover:border-white/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                First Scan
              </label>
              <select
                value={scanAId}
                onChange={(e) => setScanAId(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              >
                <option value="" className="bg-slate-800">Select a scan...</option>
                {scans.map((scan) => (
                  <option key={scan.id} value={scan.id} className="bg-slate-800">
                    {scan.url} - Score: {scan.privacy_score}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Second Scan
              </label>
              <select
                value={scanBId}
                onChange={(e) => setScanBId(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              >
                <option value="" className="bg-slate-800">Select a scan...</option>
                {scans.map((scan) => (
                  <option key={scan.id} value={scan.id} className="bg-slate-800">
                    {scan.url} - Score: {scan.privacy_score}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg backdrop-blur-sm">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleCompare}
            disabled={loading || !scanAId || !scanBId}
            className="mt-4 w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200 shadow-lg"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Comparing...
              </span>
            ) : 'Compare Scans'}
          </button>
        </div>

        {/* Comparison Results */}
        {comparison && (
          <div className="space-y-6">
            {/* Privacy Score Comparison */}
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20 shadow-xl transition-all duration-300 hover:border-white/30">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">🎯</span>
                Privacy Score
              </h2>
              <div className="grid grid-cols-3 gap-4 items-center">
                <div className="text-center">
                  <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">{comparison.scan_a.privacy_score}</div>
                  <div className="text-sm text-gray-300 mt-1 truncate">{comparison.scan_a.url}</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold bg-gradient-to-r ${getDeltaColor(comparison.deltas.score_delta)} text-transparent bg-clip-text`}>
                    {getDeltaIcon(comparison.deltas.score_delta)} {Math.abs(comparison.deltas.score_delta)}
                  </div>
                  <div className="text-xs text-gray-400">Difference</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">{comparison.scan_b.privacy_score}</div>
                  <div className="text-sm text-gray-300 mt-1 truncate">{comparison.scan_b.url}</div>
                </div>
              </div>
            </div>

            {/* Metrics Comparison */}
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20 shadow-xl transition-all duration-300 hover:border-white/30">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">📊</span>
                Detailed Metrics
              </h2>
              <div className="space-y-4">
                {/* Third-party Domains */}
                <div className="grid grid-cols-3 gap-4 items-center border-b border-white/20 pb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{comparison.scan_a.third_party_domains}</div>
                    <div className="text-sm text-gray-400">Third-party Domains</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-lg font-bold bg-gradient-to-r ${getDeltaColor(comparison.deltas.third_party_domains_delta)} text-transparent bg-clip-text`}>
                      {getDeltaIcon(comparison.deltas.third_party_domains_delta)} {Math.abs(comparison.deltas.third_party_domains_delta)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{comparison.scan_b.third_party_domains}</div>
                    <div className="text-sm text-gray-400">Third-party Domains</div>
                  </div>
                </div>

                {/* Cookies */}
                <div className="grid grid-cols-3 gap-4 items-center border-b border-white/20 pb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{comparison.scan_a.cookies_set}</div>
                    <div className="text-sm text-gray-400">Cookies</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-lg font-bold bg-gradient-to-r ${getDeltaColor(comparison.deltas.cookies_delta)} text-transparent bg-clip-text`}>
                      {getDeltaIcon(comparison.deltas.cookies_delta)} {Math.abs(comparison.deltas.cookies_delta)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{comparison.scan_b.cookies_set}</div>
                    <div className="text-sm text-gray-400">Cookies</div>
                  </div>
                </div>

                {/* Total Requests */}
                <div className="grid grid-cols-3 gap-4 items-center border-b border-white/20 pb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{comparison.scan_a.total_requests}</div>
                    <div className="text-sm text-gray-400">Total Requests</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-lg font-bold text-gray-400`}>
                      {getDeltaIcon(comparison.scan_b.total_requests - comparison.scan_a.total_requests)} {Math.abs(comparison.scan_b.total_requests - comparison.scan_a.total_requests)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{comparison.scan_b.total_requests}</div>
                    <div className="text-sm text-gray-400">Total Requests</div>
                  </div>
                </div>

                {/* localStorage Keys */}
                <div className="grid grid-cols-3 gap-4 items-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{comparison.scan_a.localstorage_keys}</div>
                    <div className="text-sm text-gray-400">localStorage Keys</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-lg font-bold text-gray-400`}>
                      {getDeltaIcon(comparison.scan_b.localstorage_keys - comparison.scan_a.localstorage_keys)} {Math.abs(comparison.scan_b.localstorage_keys - comparison.scan_a.localstorage_keys)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{comparison.scan_b.localstorage_keys}</div>
                    <div className="text-sm text-gray-400">localStorage Keys</div>
                  </div>
                </div>
              </div>
            </div>

            {/* View Individual Reports */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => router.push(`/scan/${comparison.scan_a.id}`)}
                className="px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-lg hover:bg-white/20 border border-white/20 transition-all duration-200 hover:scale-105"
              >
                View {comparison.scan_a.url} Report
              </button>
              <button
                onClick={() => router.push(`/scan/${comparison.scan_b.id}`)}
                className="px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-lg hover:bg-white/20 border border-white/20 transition-all duration-200 hover:scale-105"
              >
                View {comparison.scan_b.url} Report
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
