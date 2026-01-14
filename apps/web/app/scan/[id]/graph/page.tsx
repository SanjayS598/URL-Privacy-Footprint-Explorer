'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import axios from 'axios'
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface GraphNode {
  id: string
  domain: string
  is_third_party: boolean
  is_tracker: boolean
  request_count: number
  bytes: number
}

interface GraphEdge {
  source: string
  target: string
}

interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export default function GraphPage() {
  const params = useParams()
  const router = useRouter()
  const scanId = params.id as string
  
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  useEffect(() => {
    if (!scanId) return

    const fetchGraph = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/scans/${scanId}/graph`)
        const data: GraphData = response.data
        setGraphData(data)
        
        // Find root domain (the one with most requests and is first-party)
        const rootDomain = data.nodes.find(n => !n.is_third_party) || data.nodes[0]
        
        // Transform graph data to React Flow format
        const flowNodes: Node[] = data.nodes.map((node, index) => {
          const isRoot = node.id === rootDomain.id
          const x = isRoot ? 400 : (index % 3) * 300 + 100
          const y = isRoot ? 50 : Math.floor(index / 3) * 150 + 200
          
          return {
            id: node.id,
            type: 'default',
            position: { x, y },
            data: {
              label: (
                <div className="text-center">
                  <div className="font-semibold text-sm">{node.domain}</div>
                  <div className="text-xs text-gray-600">{node.request_count} requests</div>
                  <div className="text-xs text-gray-500">{(node.bytes / 1024).toFixed(1)} KB</div>
                </div>
              ),
            },
            style: {
              background: node.is_tracker ? '#fee2e2' : node.is_third_party ? '#fef3c7' : '#dbeafe',
              border: isRoot ? '3px solid #2563eb' : '1px solid #94a3b8',
              borderRadius: '8px',
              padding: '10px',
              width: 180,
            },
          }
        })

        const flowEdges: Edge[] = data.edges.map((edge, index) => {
          const targetNode = data.nodes.find(n => n.id === edge.target)
          const requestCount = targetNode?.request_count || 1
          
          return {
            id: `e${index}`,
            source: edge.source,
            target: edge.target,
            label: `${requestCount}`,
            animated: requestCount > 5,
            markerEnd: {
              type: MarkerType.ArrowClosed,
            },
            style: {
              stroke: '#94a3b8',
              strokeWidth: Math.min(requestCount / 5, 4),
            },
          }
        })

        setNodes(flowNodes)
        setEdges(flowEdges)
        setLoading(false)
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to fetch graph')
        setLoading(false)
      }
    }

    fetchGraph()
  }, [scanId, setNodes, setEdges])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading graph...</p>
        </div>
      </div>
    )
  }

  if (error || !graphData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Graph not found'}</p>
          <button
            onClick={() => router.push(`/scan/${scanId}`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Report
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push(`/scan/${scanId}`)}
              className="text-blue-600 hover:text-blue-800 mb-2 inline-flex items-center"
            >
              ← Back to Report
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Domain Network Graph</h1>
            <p className="text-sm text-gray-600 mt-1">
              Visualizing {graphData.nodes.length} domains with {graphData.edges.length} connections
            </p>
          </div>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ background: '#dbeafe', border: '3px solid #2563eb' }}></div>
              <span>Root Domain</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ background: '#dbeafe' }}></div>
              <span>First-party</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ background: '#fef3c7' }}></div>
              <span>Third-party</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ background: '#fee2e2' }}></div>
              <span>Tracker</span>
            </div>
          </div>
        </div>
      </div>

      {/* Graph */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  )
}
