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

interface FingerprintingDetection {
  id: string
  technique: string
  domain: string
  script_url: string | null
  evidence: {
    description: string
    patterns_found: string[]
    total_matches: number
  } | null
  severity: string
  created_at: string
}

interface Report {
  scan: Scan
  domain_aggregates: DomainAggregate[]
  cookies: Cookie[]
  artifacts: Artifact[]
  fingerprinting_detections: FingerprintingDetection[]
}

export default function ScanPage() {
  const params = useParams()
  const router = useRouter()
  const scanId = params.id as string
  
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Filter states
  const [domainFilter, setDomainFilter] = useState<'all' | 'first-party' | 'third-party'>('all')
  const [cookieFilter, setCookieFilter] = useState<'all' | 'session' | 'persistent' | 'third-party'>('all')
  const [searchQuery, setSearchQuery] = useState('')

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

  const { scan, domain_aggregates, cookies, artifacts, fingerprinting_detections } = report
  const screenshot = artifacts.find(a => a.kind === 'screenshot')

  // Filter domains
  const filteredDomains = domain_aggregates.filter(domain => {
    if (domainFilter === 'first-party' && domain.is_third_party) return false
    if (domainFilter === 'third-party' && !domain.is_third_party) return false
    if (searchQuery && !domain.domain.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  // Filter cookies
  const filteredCookies = cookies.filter(cookie => {
    if (cookieFilter === 'session' && !cookie.is_session) return false
    if (cookieFilter === 'persistent' && cookie.is_session) return false
    if (cookieFilter === 'third-party' && !cookie.is_third_party) return false
    if (searchQuery && !cookie.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !cookie.domain.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

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
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Scan Results</h1>
            {scan.status === 'completed' && (
              <button
                onClick={() => router.push(`/scan/${scanId}/graph`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                View Graph
              </button>
            )}
          </div>
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

        {/* Fingerprinting Detection */}
        {fingerprinting_detections.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <svg className="w-6 h-6 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Browser Fingerprinting Detected ({fingerprinting_detections.length})
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              This website uses browser fingerprinting techniques to track you across the web without cookies.
            </p>
            <div className="space-y-3">
              {fingerprinting_detections.map((detection) => {
                const getSeverityColor = (severity: string) => {
                  if (severity === 'high') return 'bg-red-100 text-red-800 border-red-200'
                  if (severity === 'medium') return 'bg-yellow-100 text-yellow-800 border-yellow-200'
                  return 'bg-gray-100 text-gray-800 border-gray-200'
                }
                
                return (
                  <div key={detection.id} className={`p-4 rounded-lg border ${getSeverityColor(detection.severity)}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold capitalize">{detection.technique} Fingerprinting</span>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            detection.severity === 'high' ? 'bg-red-200 text-red-900' :
                            detection.severity === 'medium' ? 'bg-yellow-200 text-yellow-900' :
                            'bg-gray-200 text-gray-900'
                          }`}>
                            {detection.severity.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-sm space-y-1">
                          <div><span className="font-medium">Domain:</span> {detection.domain}</div>
                          {detection.evidence && (
                            <>
                              <div className="text-xs italic">{detection.evidence.description}</div>
                              {detection.evidence.patterns_found && detection.evidence.patterns_found.length > 0 && (
                                <div className="text-xs">
                                  <span className="font-medium">Patterns detected:</span> {detection.evidence.patterns_found.slice(0, 3).join(', ')}
                                  {detection.evidence.patterns_found.length > 3 && ` (+${detection.evidence.patterns_found.length - 3} more)`}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search domains or cookies..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Domains</label>
              <select
                value={domainFilter}
                onChange={(e) => setDomainFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All ({domain_aggregates.length})</option>
                <option value="first-party">First-party ({domain_aggregates.filter(d => !d.is_third_party).length})</option>
                <option value="third-party">Third-party ({domain_aggregates.filter(d => d.is_third_party).length})</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cookies</label>
              <select
                value={cookieFilter}
                onChange={(e) => setCookieFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All ({cookies.length})</option>
                <option value="session">Session ({cookies.filter(c => c.is_session).length})</option>
                <option value="persistent">Persistent ({cookies.filter(c => !c.is_session).length})</option>
                <option value="third-party">Third-party ({cookies.filter(c => c.is_third_party).length})</option>
              </select>
            </div>
          </div>
          {(searchQuery || domainFilter !== 'all' || cookieFilter !== 'all') && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-gray-600">
                Showing {filteredDomains.length} domains, {filteredCookies.length} cookies
              </span>
              <button
                onClick={() => {
                  setSearchQuery('')
                  setDomainFilter('all')
                  setCookieFilter('all')
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {/* Domain Breakdown */}
        {filteredDomains.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Domain Breakdown ({filteredDomains.length})
            </h2>
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
                  {filteredDomains.map((domain, idx) => (
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
        {filteredCookies.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Cookies ({filteredCookies.length})
            </h2>
            <div className="space-y-2">
              {filteredCookies.map((cookie, idx) => (
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
