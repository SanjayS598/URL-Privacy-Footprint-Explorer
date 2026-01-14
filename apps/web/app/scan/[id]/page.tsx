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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-8 px-4">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/')}
            className="text-blue-400 hover:text-blue-300 mb-4 inline-flex items-center transition-all duration-200 hover:translate-x-[-4px]"
          >
            ← Back to Home
          </button>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-white">Scan Results</h1>
            {scan.status === 'completed' && (
              <button
                onClick={() => router.push(`/scan/${scanId}/graph`)}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 inline-flex items-center gap-2 transform hover:scale-105 transition-all duration-200 shadow-lg"
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
          <div className="mb-6 p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg backdrop-blur-sm animate-pulse">
            <div className="flex items-center gap-3">
              <svg className="animate-spin h-5 w-5 text-blue-400" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-blue-200">Scan in progress... Results will update automatically.</p>
            </div>
          </div>
        )}

        {scan.status === 'failed' && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg backdrop-blur-sm">
            <p className="text-red-200 font-medium">Scan failed</p>
            {scan.error_message && (
              <p className="text-red-300 text-sm mt-2">{scan.error_message}</p>
            )}
          </div>
        )}

        {/* Privacy Score Card */}
        <div className="mb-6 p-6 bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-md rounded-xl border border-white/20 hover:border-white/30 transition-all duration-300 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                <span className="text-2xl">🔒</span>
                Privacy Score
              </h2>
              <p className="text-sm text-gray-300 truncate max-w-md">{scan.url}</p>
            </div>
            <div className="text-center">
              <div className={`text-6xl font-bold bg-gradient-to-r ${scan.privacy_score >= 80 ? 'from-green-400 to-emerald-500' : scan.privacy_score >= 50 ? 'from-yellow-400 to-orange-500' : 'from-red-400 to-pink-500'} text-transparent bg-clip-text animate-pulse`}>
                {scan.privacy_score}
              </div>
              <div className="text-sm text-gray-400 mt-1">/ 100</div>
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20 hover:border-blue-500/50 transition-all duration-300 hover:transform hover:scale-105 shadow-lg">
            <div className="text-2xl font-bold text-white">{scan.total_requests}</div>
            <div className="text-sm text-gray-400">Total Requests</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20 hover:border-purple-500/50 transition-all duration-300 hover:transform hover:scale-105 shadow-lg">
            <div className="text-2xl font-bold text-white">{scan.third_party_domains}</div>
            <div className="text-sm text-gray-400">Third-Party Domains</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20 hover:border-pink-500/50 transition-all duration-300 hover:transform hover:scale-105 shadow-lg">
            <div className="text-2xl font-bold text-white">{scan.cookies_set}</div>
            <div className="text-sm text-gray-400">Cookies</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20 hover:border-orange-500/50 transition-all duration-300 hover:transform hover:scale-105 shadow-lg">
            <div className="text-2xl font-bold text-white">{scan.localstorage_keys}</div>
            <div className="text-sm text-gray-400">localStorage Keys</div>
          </div>
        </div>

        {/* Screenshot */}
        {screenshot && (
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20 shadow-xl mb-6 transition-all duration-300 hover:border-white/30">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">📸</span>
              Screenshot
            </h2>
            <img src={screenshot.uri} alt="Page screenshot" className="w-full rounded-lg border border-white/30 shadow-lg" />
          </div>
        )}

        {/* Fingerprinting Detection */}
        {fingerprinting_detections.length > 0 && (
          <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 backdrop-blur-sm p-6 rounded-xl border border-red-500/30 shadow-xl mb-6 animate-fade-in">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              <svg className="w-6 h-6 mr-2 text-red-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Browser Fingerprinting Detected ({fingerprinting_detections.length})
            </h2>
            <p className="text-sm text-gray-300 mb-4">
              This website uses browser fingerprinting techniques to track you across the web without cookies.
            </p>
            <div className="space-y-3">
              {fingerprinting_detections.map((detection) => {
                const getSeverityColor = (severity: string) => {
                  if (severity === 'high') return 'bg-red-500/20 text-red-200 border-red-500/40'
                  if (severity === 'medium') return 'bg-yellow-500/20 text-yellow-200 border-yellow-500/40'
                  return 'bg-gray-500/20 text-gray-200 border-gray-500/40'
                }
                
                return (
                  <div key={detection.id} className={`p-4 rounded-lg border ${getSeverityColor(detection.severity)}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold capitalize">{detection.technique} Fingerprinting</span>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            detection.severity === 'high' ? 'bg-red-500/30 text-red-200 border border-red-500/50' :
                            detection.severity === 'medium' ? 'bg-yellow-500/30 text-yellow-200 border border-yellow-500/50' :
                            'bg-gray-500/30 text-gray-200 border border-gray-500/50'
                          }`}>
                            {detection.severity.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-sm space-y-1 text-gray-300">
                          <div><span className="font-medium text-gray-200">Domain:</span> {detection.domain}</div>
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
        <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20 shadow-xl mb-6 transition-all duration-300 hover:border-white/30">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span className="text-2xl">🔎</span>
            Filters
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search domains or cookies..."
                className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Domains</label>
              <select
                value={domainFilter}
                onChange={(e) => setDomainFilter(e.target.value as any)}
                className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              >
                <option value="all" className="bg-slate-800">All ({domain_aggregates.length})</option>
                <option value="first-party" className="bg-slate-800">First-party ({domain_aggregates.filter(d => !d.is_third_party).length})</option>
                <option value="third-party" className="bg-slate-800">Third-party ({domain_aggregates.filter(d => d.is_third_party).length})</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Cookies</label>
              <select
                value={cookieFilter}
                onChange={(e) => setCookieFilter(e.target.value as any)}
                className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              >
                <option value="all" className="bg-slate-800">All ({cookies.length})</option>
                <option value="session" className="bg-slate-800">Session ({cookies.filter(c => c.is_session).length})</option>
                <option value="persistent" className="bg-slate-800">Persistent ({cookies.filter(c => !c.is_session).length})</option>
                <option value="third-party" className="bg-slate-800">Third-party ({cookies.filter(c => c.is_third_party).length})</option>
              </select>
            </div>
          </div>
          {(searchQuery || domainFilter !== 'all' || cookieFilter !== 'all') && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-gray-300">
                Showing {filteredDomains.length} domains, {filteredCookies.length} cookies
              </span>
              <button
                onClick={() => {
                  setSearchQuery('')
                  setDomainFilter('all')
                  setCookieFilter('all')
                }}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors duration-200"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {/* Domain Breakdown */}
        {filteredDomains.length > 0 && (
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20 shadow-xl mb-6 transition-all duration-300 hover:border-white/30">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">🌐</span>
              Domain Breakdown ({filteredDomains.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left py-2 px-4 text-sm font-medium text-gray-300">Domain</th>
                    <th className="text-left py-2 px-4 text-sm font-medium text-gray-300">Type</th>
                    <th className="text-right py-2 px-4 text-sm font-medium text-gray-300">Requests</th>
                    <th className="text-right py-2 px-4 text-sm font-medium text-gray-300">Size</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDomains.map((domain, idx) => (
                    <tr key={idx} className="border-b border-white/10 last:border-0 hover:bg-white/5 transition-colors duration-200">
                      <td className="py-2 px-4 text-sm text-gray-300">{domain.domain}</td>
                      <td className="py-2 px-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${domain.is_third_party ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40' : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'}`}>
                          {domain.is_third_party ? 'Third-party' : 'First-party'}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-sm text-right text-gray-300">{domain.request_count}</td>
                      <td className="py-2 px-4 text-sm text-right text-gray-300">
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
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20 shadow-xl transition-all duration-300 hover:border-white/30">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">🍪</span>
              Cookies ({filteredCookies.length})
            </h2>
            <div className="space-y-2">
              {filteredCookies.map((cookie, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all duration-200">
                  <div>
                    <div className="font-medium text-sm text-white">{cookie.name}</div>
                    <div className="text-xs text-gray-400">{cookie.domain}</div>
                  </div>
                  <div className="flex gap-2">
                    {cookie.is_third_party && (
                      <span className="text-xs px-2 py-1 bg-orange-500/20 text-orange-300 border border-orange-500/40 rounded-full">
                        Third-party
                      </span>
                    )}
                    <span className="text-xs px-2 py-1 bg-gray-500/20 text-gray-300 border border-gray-500/40 rounded-full">
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
