import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node as FlowNode,
  type Edge as FlowEdge,
  type NodeMouseHandler,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import mapClient from '../api/mapClient'
import { useAuth } from '../contexts/AuthContext'
import Navbar from '../components/Navbar'
import NodeSidebar from '../components/NodeSidebar'
import AddNodeModal from '../components/AddNodeModal'
import PathPanel from '../components/PathPanel'
import RoutesPanel from '../components/RoutesPanel'

export interface ApiNode {
  id: string
  name: string
  position: { x: number; y: number }
  connections: Record<string, number> // keys are node IDs
}

export interface PathSegment {
  fromId: string
  from: string
  toId: string
  to: string
  distance: number
}

interface PathResult {
  distance: number
  path: PathSegment[]
}

const BASE_NODE_STYLE = {
  background: '#fff',
  border: '2px solid #6366f1',
  borderRadius: 8,
  padding: '6px 14px',
  fontWeight: 600,
  fontSize: 13,
  minWidth: 50,
  width: 'fit-content',
}

function toFlowElements(apiNodes: ApiNode[]): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const nodes: FlowNode[] = apiNodes.map((n) => ({
    id: n.id,
    position: n.position,
    data: { label: n.name },
    style: BASE_NODE_STYLE,
  }))

  const seen = new Set<string>()
  const edges: FlowEdge[] = []
  for (const node of apiNodes) {
    for (const [targetId, weight] of Object.entries(node.connections)) {
      const key = [node.id, targetId].sort().join('|')
      if (!seen.has(key)) {
        seen.add(key)
        edges.push({
          id: key,
          source: node.id,
          target: targetId,
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
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  // Path finding
  const [pathMode, setPathMode] = useState(false)
  const [pathFrom, setPathFrom] = useState<string | null>(null) // node ID
  const [pathTo, setPathTo] = useState<string | null>(null)     // node ID
  const [pathResult, setPathResult] = useState<PathResult | null>(null)
  const [pathError, setPathError] = useState<string | null>(null)
  const [pathLoading, setPathLoading] = useState(false)

  // Save route
  const [routeSaving, setRouteSaving] = useState(false)
  const [routeSaved, setRouteSaved] = useState(false)
  const [routeSaveError, setRouteSaveError] = useState<string | null>(null)

  // Saved routes panel
  const [routesMode, setRoutesMode] = useState(false)

  const selectedApiNode = apiNodes.find((n) => n.id === selectedNodeId) ?? null

  // Resolve IDs to names for display
  const pathFromName = useMemo(
    () => apiNodes.find((n) => n.id === pathFrom)?.name ?? null,
    [apiNodes, pathFrom]
  )
  const pathToName = useMemo(
    () => apiNodes.find((n) => n.id === pathTo)?.name ?? null,
    [apiNodes, pathTo]
  )

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

  // Fire path query when both endpoints are set
  useEffect(() => {
    if (!pathFrom || !pathTo) return
    setPathLoading(true)
    setPathError(null)
    setPathResult(null)
    setRouteSaved(false)
    setRouteSaveError(null)
    mapClient
      .get<PathResult>('/map/path', { params: { from: pathFrom, to: pathTo } })
      .then(({ data }) => setPathResult(data))
      .catch((err: unknown) => {
        setPathError(
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            'No path found'
        )
      })
      .finally(() => setPathLoading(false))
  }, [pathFrom, pathTo])

  const clearPath = useCallback(() => {
    setPathFrom(null)
    setPathTo(null)
    setPathResult(null)
    setPathError(null)
    setRouteSaved(false)
    setRouteSaveError(null)
  }, [])

  const togglePathMode = useCallback(() => {
    setPathMode((prev) => {
      if (!prev) setRoutesMode(false)
      else {
        setPathFrom(null)
        setPathTo(null)
        setPathResult(null)
        setPathError(null)
        setRouteSaved(false)
        setRouteSaveError(null)
        setSelectedNodeId(null)
      }
      return !prev
    })
  }, [])

  const toggleRoutesMode = useCallback(() => {
    setRoutesMode((prev) => {
      if (!prev) {
        setPathMode(false)
        setPathFrom(null)
        setPathTo(null)
        setPathResult(null)
        setPathError(null)
        setRouteSaved(false)
        setRouteSaveError(null)
        setSelectedNodeId(null)
      }
      return !prev
    })
  }, [])

  const handleSaveRoute = useCallback(async () => {
    if (!pathFrom || !pathTo) return
    setRouteSaving(true)
    setRouteSaveError(null)
    setRouteSaved(false)
    try {
      await mapClient.post('/map/route', null, { params: { from: pathFrom, to: pathTo } })
      setRouteSaved(true)
    } catch (err: unknown) {
      setRouteSaveError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Save failed'
      )
    } finally {
      setRouteSaving(false)
    }
  }, [pathFrom, pathTo])

  const handleShowRoute = useCallback((fromId: string, toId: string, result: PathResult) => {
    setPathFrom(fromId)
    setPathTo(toId)
    setPathResult(result)
    setPathError(null)
  }, [])

  // Highlight sets derived from path result (all IDs)
  const pathNodeSet = useMemo(() => {
    const set = new Set<string>()
    if (pathFrom) set.add(pathFrom)
    if (pathTo) set.add(pathTo)
    pathResult?.path.forEach((s) => { set.add(s.fromId); set.add(s.toId) })
    return set
  }, [pathFrom, pathTo, pathResult])

  const pathEdgeSet = useMemo(() => {
    if (!pathResult) return new Set<string>()
    return new Set(pathResult.path.map((s) => [s.fromId, s.toId].sort().join('|')))
  }, [pathResult])

  const highlightActive = pathMode || routesMode

  // Overlay path highlight styles without touching the base node state
  const displayNodes = useMemo(
    () =>
      nodes.map((n) => {
        if (!highlightActive) return n
        const isEndpoint = n.id === pathFrom || n.id === pathTo
        const inPath = pathNodeSet.has(n.id)
        if (isEndpoint)
          return { ...n, style: { ...BASE_NODE_STYLE, border: '2px solid #f59e0b', background: '#fef3c7' } }
        if (inPath)
          return { ...n, style: { ...BASE_NODE_STYLE, border: '2px solid #f97316', background: '#ffedd5' } }
        return n
      }),
    [nodes, highlightActive, pathFrom, pathTo, pathNodeSet]
  )

  const displayEdges = useMemo(
    () =>
      edges.map((e) => {
        if (!highlightActive || !pathEdgeSet.has(e.id)) return e
        return { ...e, style: { stroke: '#f97316', strokeWidth: 3 }, animated: true }
      }),
    [edges, highlightActive, pathEdgeSet]
  )

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (pathMode) {
        if (!pathFrom) {
          setPathFrom(node.id)
        } else if (node.id === pathFrom) {
          setPathFrom(null)
          setPathTo(null)
          setPathResult(null)
          setPathError(null)
        } else {
          setPathTo(node.id)
          setPathResult(null)
          setPathError(null)
        }
        return
      }
      setSelectedNodeId(node.id)
    },
    [pathMode, pathFrom]
  )

  const onPaneClick = useCallback(() => {
    if (!pathMode) setSelectedNodeId(null)
  }, [pathMode])

  const onNodeDragStop = useCallback(
    (_event: MouseEvent | TouchEvent, node: FlowNode) => {
      if (!canEdit || pathMode) return
      mapClient
        .put(`/map/node/${node.id}`, { position: node.position })
        .catch(console.error)
    },
    [canEdit, pathMode]
  )

  return (
    <div className="flex flex-col h-screen">
      <Navbar />

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 bg-white shrink-0">
        <button
          onClick={togglePathMode}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
            pathMode
              ? 'bg-orange-500 text-white border-orange-500 hover:bg-orange-600'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Find Path
        </button>
        <button
          onClick={toggleRoutesMode}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
            routesMode
              ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
          Saved Routes
        </button>
        {pathMode && (
          <span className="text-xs text-gray-400 italic">
            {!pathFrom
              ? 'Click a node to select origin'
              : !pathTo
                ? `From: ${pathFromName ?? pathFrom} — click destination`
                : `${pathFromName ?? pathFrom} → ${pathToName ?? pathTo}`}
          </span>
        )}
      </div>

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
              nodes={displayNodes}
              edges={displayEdges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
              onNodeDragStop={onNodeDragStop}
              nodesDraggable={canEdit && !pathMode}
              fitView
              fitViewOptions={{ padding: 0.2 }}
            >
              <Background />
              <Controls />
              <MiniMap nodeColor="#6366f1" />
            </ReactFlow>

            {canEdit && !pathMode && (
              <button
                onClick={() => setShowAddModal(true)}
                className="absolute bottom-4 right-4 z-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full w-12 h-12 text-2xl font-light shadow-lg flex items-center justify-center"
                title="Add node"
              >
                +
              </button>
            )}
          </div>

          {routesMode ? (
            <RoutesPanel
              onShowRoute={handleShowRoute}
              onClearRoute={clearPath}
            />
          ) : pathMode ? (
            <PathPanel
              pathFromName={pathFromName}
              pathToName={pathToName}
              loading={pathLoading}
              result={pathResult}
              error={pathError}
              onClear={clearPath}
              onSave={pathResult ? handleSaveRoute : undefined}
              saving={routeSaving}
              saved={routeSaved}
              saveError={routeSaveError}
            />
          ) : (
            selectedApiNode && (
              <NodeSidebar
                key={selectedApiNode.id}
                node={selectedApiNode}
                allNodes={apiNodes}
                canEdit={canEdit}
                onClose={() => setSelectedNodeId(null)}
                onSaved={() => refreshMap().catch(console.error)}
                onDeleted={() => {
                  setSelectedNodeId(null)
                  refreshMap().catch(console.error)
                }}
              />
            )
          )}
        </div>
      )}

      {showAddModal && (
        <AddNodeModal
          allNodes={apiNodes}
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
