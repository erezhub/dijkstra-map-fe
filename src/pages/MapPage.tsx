import { useEffect, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import mapClient from '../api/mapClient'
import Navbar from '../components/Navbar'

interface ApiNode {
  name: string
  position: { x: number; y: number }
  connections: Record<string, number>
}

function toFlowElements(apiNodes: ApiNode[]): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = apiNodes.map((n) => ({
    id: n.name,
    position: n.position,
    data: { label: n.name },
    style: {
      background: '#fff',
      border: '2px solid #6366f1',
      borderRadius: 8,
      padding: '6px 14px',
      fontWeight: 600,
      fontSize: 13,
    },
  }))

  const seen = new Set<string>()
  const edges: Edge[] = []

  for (const node of apiNodes) {
    for (const [target, weight] of Object.entries(node.connections)) {
      const key = [node.name, target].sort().join('|')
      if (!seen.has(key)) {
        seen.add(key)
        edges.push({
          id: key,
          source: node.name,
          target,
          label: String(weight),
          labelStyle: { fontSize: 11, fontWeight: 600 },
          labelBgStyle: { fill: '#f3f4f6', fillOpacity: 0.9 },
          style: { stroke: '#6366f1' },
        })
      }
    }
  }

  return { nodes, edges }
}

export default function MapPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    mapClient
      .get<{ nodes: ApiNode[] }>('/map')
      .then(({ data }) => {
        const { nodes, edges } = toFlowElements(data.nodes)
        setNodes(nodes)
        setEdges(edges)
      })
      .catch((err: unknown) => {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ?? 'Failed to load map'
        setError(msg)
      })
      .finally(() => setLoading(false))
  }, [setNodes, setEdges])

  return (
    <div className="flex flex-col h-screen">
      <Navbar />

      {loading && (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          Loading map…
        </div>
      )}

      {error && (
        <div className="flex-1 flex items-center justify-center text-red-500">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
            fitViewOptions={{ padding: 0.2 }}
          >
            <Background />
            <Controls />
            <MiniMap nodeColor="#6366f1" />
          </ReactFlow>
        </div>
      )}
    </div>
  )
}
