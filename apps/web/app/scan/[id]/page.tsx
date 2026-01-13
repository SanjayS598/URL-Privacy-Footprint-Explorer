'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Scan {
  id: string
  url: string
  final_url: string
  status: string
  privacy_score: number
  total_requests: number
  third_party_domains: number
  cookies_set: number
  localstorage_keys: number
  indexeddb_present: boolean
  created_at: string
  finished_at: string | null
  page_title: string
  error_message: string | null
}

interface DomainAggregate {
  domain: string
  is_third_party: boolean
  request_count: number
  bytes: number
  resource_breakdown: Record<string, number>
}

interface Cookie {
  name: string
  domain: string
  is_third_party: boolean
  is_session: boolean
  expires_at: string | null
}

interface Artifact {
  kind: string
  uri: string
}

interface Report {
  scan: Scan
  domain_aggregates: DomainAggregate[]
  cookies: Cookie[]
  artifacts: Artifact[]
}

export default function ScanPage() {
  const params = useParams()
  const router = useRouter()
  const scanId = params.id as string
  
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!scanId) return

    const fetchReport = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/scans/${scanId}/report`)
        setReport(response.data)
        setLoading(false)
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to fetch scan')
        setLoading(false)
      }
    }

    // Poll if scan is not completed
    const interval = setInterval(async () => {
      if (!report || report.scan.status === 'queued' || report.scan.status === 'running') {
        await fetchReport()
      }
    }, 2000)

    fetchReport()

    return () => clearInterval(interval)
  }, [scanId, report])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading scan results...</p>
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Scan not found'}</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  const { scan, domain_aggregates, cookies, artifacts } = report
  const screenshot = artifacts.find(a => a.kind === 'screenshot')

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-100'
    if (score >= 50) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center"
          >
            ← Back to Home
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Scan Results</h1>
        </div>

        {/* Status Banner */}
        {scan.status === 'running' && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-blue-800">Scan in progress... Results will update automatically.</p>
          </div>
        )}

        {scan.status === 'failed' && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 font-medium">Scan failed</p>
            {scan.error_message && (
              <p className="text-red-600 text-sm mt-2">{scan.error_message}</p>
            )}
          </div>
        )}

        {/* Privacy Score Card */}
        <div className={`mb-6 p-6 ${getScoreBg(scan.privacy_score)} rounded-lg`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-1">Privacy Score</h2>
              <p className="text-sm text-gray-600">{scan.url}</p>
            </div>
            <div className="text-center">
              <div className={`text-5xl font-bold ${getScoreColor(scan.privacy_score)}`}>
                {scan.privacy_score}
              </div>
              <div className="text-sm text-gray-600 mt-1">/ 100</div>
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-900">{scan.total_requests}</div>
            <div className="text-sm text-gray-600">Total Requests</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-900">{scan.third_party_domains}</div>
            <div className="text-sm text-gray-600">Third-Party Domains</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-900">{scan.cookies_set}</div>
            <div className="text-sm text-gray-600">Cookies</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-900">{scan.localstorage_keys}</div>
            <div className="text-sm text-gray-600">localStorage Keys</div>
          </div>
        </div>

        {/* Screenshot */}
        {screenshot && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Screenshot</h2>
            <img src={screenshot.uri} alt="Page screenshot" className="w-full rounded-md border" />
          </div>
        )}

        {/* Domain Breakdown */}
        {domain_aggregates.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Domain Breakdown</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">Domain</th>
                    <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">Type</th>
                    <th className="text-right py-2 px-4 text-sm font-medium text-gray-700">Requests</th>
                    <th className="text-right py-2 px-4 text-sm font-medium text-gray-700">Size</th>
                  </tr>
                </thead>
                <tbody>
                  {domain_aggregates.map((domain, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="py-2 px-4 text-sm">{domain.domain}</td>
                      <td className="py-2 px-4">
                        <span className={`text-xs px-2 py-1 rounded ${domain.is_third_party ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                          {domain.is_third_party ? 'Third-party' : 'First-party'}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-sm text-right">{domain.request_count}</td>
                      <td className="py-2 px-4 text-sm text-right">
                        {(domain.bytes / 1024).toFixed(1)} KB
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Cookies */}
        {cookies.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Cookies ({cookies.length})</h2>
            <div className="space-y-2">
              {cookies.slice(0, 10).map((cookie, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium text-sm">{cookie.name}</div>
                    <div className="text-xs text-gray-600">{cookie.domain}</div>
                  </div>
                  <div className="flex gap-2">
                    {cookie.is_third_party && (
                      <span className="text-xs px-2 py-1 bg-orange-100 text-orange-800 rounded">
                        Third-party
                      </span>
                    )}
                    <span className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded">
                      {cookie.is_session ? 'Session' : 'Persistent'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
