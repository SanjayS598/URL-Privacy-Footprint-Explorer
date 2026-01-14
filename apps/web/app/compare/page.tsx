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
    if (delta > 0) return 'text-red-600' // Worse privacy
    if (delta < 0) return 'text-green-600' // Better privacy
    return 'text-gray-600'
  }

  const getDeltaIcon = (delta: number) => {
    if (delta > 0) return '↑'
    if (delta < 0) return '↓'
    return '='
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.push('/scans')}
            className="text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center"
          >
            ← Back to Scans
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Compare Scans</h1>
          <p className="text-gray-600 mt-2">Select two scans to compare their privacy metrics</p>
        </div>

        {/* Scan Selectors */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Scan
              </label>
              <select
                value={scanAId}
                onChange={(e) => setScanAId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a scan...</option>
                {scans.map((scan) => (
                  <option key={scan.id} value={scan.id}>
                    {scan.url} - Score: {scan.privacy_score}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Second Scan
              </label>
              <select
                value={scanBId}
                onChange={(e) => setScanBId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a scan...</option>
                {scans.map((scan) => (
                  <option key={scan.id} value={scan.id}>
                    {scan.url} - Score: {scan.privacy_score}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleCompare}
            disabled={loading || !scanAId || !scanBId}
            className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Comparing...' : 'Compare Scans'}
          </button>
        </div>

        {/* Comparison Results */}
        {comparison && (
          <div className="space-y-6">
            {/* Privacy Score Comparison */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Privacy Score</h2>
              <div className="grid grid-cols-3 gap-4 items-center">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{comparison.scan_a.privacy_score}</div>
                  <div className="text-sm text-gray-600 mt-1">{comparison.scan_a.url}</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getDeltaColor(comparison.deltas.score_delta)}`}>
                    {getDeltaIcon(comparison.deltas.score_delta)} {Math.abs(comparison.deltas.score_delta)}
                  </div>
                  <div className="text-xs text-gray-500">Difference</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{comparison.scan_b.privacy_score}</div>
                  <div className="text-sm text-gray-600 mt-1">{comparison.scan_b.url}</div>
                </div>
              </div>
            </div>

            {/* Metrics Comparison */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Detailed Metrics</h2>
              <div className="space-y-4">
                {/* Third-party Domains */}
                <div className="grid grid-cols-3 gap-4 items-center border-b pb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{comparison.scan_a.third_party_domains}</div>
                    <div className="text-sm text-gray-600">Third-party Domains</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-lg font-bold ${getDeltaColor(comparison.deltas.third_party_domains_delta)}`}>
                      {getDeltaIcon(comparison.deltas.third_party_domains_delta)} {Math.abs(comparison.deltas.third_party_domains_delta)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{comparison.scan_b.third_party_domains}</div>
                    <div className="text-sm text-gray-600">Third-party Domains</div>
                  </div>
                </div>

                {/* Cookies */}
                <div className="grid grid-cols-3 gap-4 items-center border-b pb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{comparison.scan_a.cookies_set}</div>
                    <div className="text-sm text-gray-600">Cookies</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-lg font-bold ${getDeltaColor(comparison.deltas.cookies_delta)}`}>
                      {getDeltaIcon(comparison.deltas.cookies_delta)} {Math.abs(comparison.deltas.cookies_delta)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{comparison.scan_b.cookies_set}</div>
                    <div className="text-sm text-gray-600">Cookies</div>
                  </div>
                </div>

                {/* Total Requests */}
                <div className="grid grid-cols-3 gap-4 items-center border-b pb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{comparison.scan_a.total_requests}</div>
                    <div className="text-sm text-gray-600">Total Requests</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-lg font-bold text-gray-600`}>
                      {getDeltaIcon(comparison.scan_b.total_requests - comparison.scan_a.total_requests)} {Math.abs(comparison.scan_b.total_requests - comparison.scan_a.total_requests)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{comparison.scan_b.total_requests}</div>
                    <div className="text-sm text-gray-600">Total Requests</div>
                  </div>
                </div>

                {/* localStorage Keys */}
                <div className="grid grid-cols-3 gap-4 items-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{comparison.scan_a.localstorage_keys}</div>
                    <div className="text-sm text-gray-600">localStorage Keys</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-lg font-bold text-gray-600`}>
                      {getDeltaIcon(comparison.scan_b.localstorage_keys - comparison.scan_a.localstorage_keys)} {Math.abs(comparison.scan_b.localstorage_keys - comparison.scan_a.localstorage_keys)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{comparison.scan_b.localstorage_keys}</div>
                    <div className="text-sm text-gray-600">localStorage Keys</div>
                  </div>
                </div>
              </div>
            </div>

            {/* View Individual Reports */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => router.push(`/scan/${comparison.scan_a.id}`)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                View {comparison.scan_a.url} Report
              </button>
              <button
                onClick={() => router.push(`/scan/${comparison.scan_b.id}`)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
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
