import { useEffect, useState, useCallback } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeMouseHandler,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import mapClient from '../api/mapClient'
import { useAuth } from '../contexts/AuthContext'
import Navbar from '../components/Navbar'
import NodeSidebar from '../components/NodeSidebar'
import AddNodeModal from '../components/AddNodeModal'

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
  const { role } = useAuth()
  const canEdit = role === 'ADMIN' || role === 'MANAGER'

  const [apiNodes, setApiNodes] = useState<ApiNode[]>([])
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedNodeName, setSelectedNodeName] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  const selectedApiNode = apiNodes.find((n) => n.name === selectedNodeName) ?? null

  const refreshMap = useCallback(async () => {
    const { data } = await mapClient.get<{ nodes: ApiNode[] }>('/map')
    setApiNodes(data.nodes)
    const { nodes, edges } = toFlowElements(data.nodes)
    setNodes(nodes)
    setEdges(edges)
  }, [setNodes, setEdges])

  useEffect(() => {
    refreshMap()
      .catch((err: unknown) => {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to load map'
        setError(msg)
      })
      .finally(() => setLoading(false))
  }, [refreshMap])

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => setSelectedNodeName(node.id),
    []
  )

  const onPaneClick = useCallback(() => setSelectedNodeName(null), [])

  const onNodeDragStop: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (!canEdit) return
      mapClient
        .put(`/map/node/${node.id}`, { position: node.position })
        .catch(console.error)
    },
    [canEdit]
  )

  return (
    <div className="flex flex-col h-screen">
      <Navbar />

      {loading && (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          Loading map…
        </div>
      )}

      {error && (
        <div className="flex-1 flex items-center justify-center text-red-500">{error}</div>
      )}

      {!loading && !error && (
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
              onNodeDragStop={onNodeDragStop}
              nodesDraggable={canEdit}
              fitView
              fitViewOptions={{ padding: 0.2 }}
            >
              <Background />
              <Controls />
              <MiniMap nodeColor="#6366f1" />
            </ReactFlow>

            {canEdit && (
              <button
                onClick={() => setShowAddModal(true)}
                className="absolute bottom-4 right-4 z-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full w-12 h-12 text-2xl font-light shadow-lg flex items-center justify-center"
                title="Add node"
              >
                +
              </button>
            )}
          </div>

          {selectedApiNode && (
            <NodeSidebar
              node={selectedApiNode}
              canEdit={canEdit}
              onClose={() => setSelectedNodeName(null)}
              onSaved={() => refreshMap().catch(console.error)}
              onDeleted={() => {
                setSelectedNodeName(null)
                refreshMap().catch(console.error)
              }}
            />
          )}
        </div>
      )}

      {showAddModal && (
        <AddNodeModal
          onClose={() => setShowAddModal(false)}
          onSaved={() => {
            setShowAddModal(false)
            refreshMap().catch(console.error)
          }}
        />
      )}
    </div>
  )
}
