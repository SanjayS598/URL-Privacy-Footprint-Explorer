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

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Privacy Footprint Explorer
          </h1>
          <p className="text-gray-600">
            Analyze websites for tracking, cookies, and privacy concerns
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-4">
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
              Enter URL to scan
            </label>
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Scanning...' : 'Scan Website'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>This tool analyzes:</p>
          <div className="flex justify-center gap-4 mt-2">
            <span>Third-party requests</span>
            <span>Cookies</span>
            <span>Storage usage</span>
            <span>Privacy score</span>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/scans')}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            View all scans →
          </button>
        </div>
      </div>
    </main>
  )
}
