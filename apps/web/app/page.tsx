'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { addScan } from '@/lib/scans'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function Home() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await axios.post(`${API_URL}/api/scans`, {
        url: url,
        profiles: ['baseline']
      })
      
      const scanId = response.data.scan_ids[0]
      
      // Save to localStorage
      addScan(scanId, url)
      
      router.push(`/scan/${scanId}`)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create scan')
      setLoading(false)
    }
  }

  const features = [
    {
      icon: '🔍',
      title: 'Deep Analysis',
      description: 'Comprehensive scanning of tracking scripts, cookies, and third-party requests'
    },
    {
      icon: '🛡️',
      title: 'Fingerprint Detection',
      description: 'Identifies canvas, WebGL, audio, and device fingerprinting techniques'
    },
    {
      icon: '📊',
      title: 'Privacy Score',
      description: 'Get an instant privacy rating based on multiple security factors'
    },
    {
      icon: '🌐',
      title: 'Network Graph',
      description: 'Visualize third-party connections and data flow patterns'
    },
    {
      icon: '🍪',
      title: 'Cookie Tracking',
      description: 'Detailed breakdown of session, persistent, and third-party cookies'
    },
    {
      icon: '⚡',
      title: 'Real-time Results',
      description: 'Fast scanning with live progress updates and instant reports'
    }
  ]

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-white/10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🔒</span>
              </div>
              <span className="text-xl font-bold text-white">Privacy Explorer</span>
            </div>
            <button
              onClick={() => router.push('/scans')}
              className="px-4 py-2 text-sm text-blue-300 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
            >
              View History
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-block mb-4 px-4 py-2 bg-blue-500/20 rounded-full border border-blue-500/30">
            <span className="text-blue-300 text-sm font-medium">🚀 Advanced Privacy Analysis Tool</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Uncover Hidden
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
              Privacy Threats
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
            Analyze any website's privacy footprint with our advanced scanning engine. 
            Detect trackers, fingerprinting, cookies, and third-party connections in seconds.
          </p>

          {/* Scan Form */}
          <div className="max-w-2xl mx-auto mb-8">
            <form onSubmit={handleSubmit} className="relative">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2 border border-white/20 shadow-2xl hover:border-blue-500/50 transition-all duration-300">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    id="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com"
                    required
                    className="flex-1 px-6 py-4 bg-white/5 text-white placeholder-gray-400 rounded-xl border border-white/10 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-blue-500/50"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Scanning...
                      </span>
                    ) : (
                      'Scan Now'
                    )}
                  </button>
                </div>
              </div>
              
              {error && (
                <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 text-red-200 rounded-xl text-sm backdrop-blur-sm animate-shake">
                  {error}
                </div>
              )}
            </form>

            <div className="mt-6 flex items-center justify-center gap-8 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Free to use</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>No registration</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                <span>Real-time analysis</span>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Powerful Privacy Analysis Features
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:border-blue-500/50 hover:bg-white/10 transition-all duration-300 hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="text-4xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-16 p-8 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-white shadow-lg">
                1
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Enter URL</h3>
              <p className="text-gray-400">Paste any website URL you want to analyze</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-white shadow-lg">
                2
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">We Scan</h3>
              <p className="text-gray-400">Our engine analyzes trackers, cookies, and fingerprinting</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-white shadow-lg">
                3
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Get Results</h3>
              <p className="text-gray-400">View detailed privacy report with actionable insights</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center p-12 bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm rounded-2xl border border-white/20">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Explore Privacy?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Start scanning websites now and discover what's really happening behind the scenes
          </p>
          <button
            onClick={() => document.getElementById('url')?.focus()}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-blue-500/50"
          >
            Get Started Free
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 backdrop-blur-sm py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-400">
          <p>Built for privacy-conscious users</p>
        </div>
      </footer>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }

        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }

        .animate-shake {
          animation: shake 0.5s ease-out;
        }

        .delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </main>
  )
}
