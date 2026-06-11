import { useState, useEffect, useCallback } from 'react'
import mapClient from '../api/mapClient'

interface PathSegment {
  from: string
  to: string
  distance: number
}

interface PathResult {
  distance: number
  path: PathSegment[]
}

interface SavedRoute {
  nodeA: string
  nodeB: string
  distance: number
  path: PathSegment[]
  createdBy: string[]
}

interface Props {
  onShowRoute: (from: string, to: string, result: PathResult) => void
  onClearRoute: () => void
}

export default function RoutesPanel({ onShowRoute, onClearRoute }: Props) {
  const [routes, setRoutes] = useState<SavedRoute[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [deletingKey, setDeletingKey] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const loadRoutes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await mapClient.get<SavedRoute[]>('/map/routes')
      setRoutes(data)
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to load routes'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRoutes()
  }, [loadRoutes])

  function showRoute(route: SavedRoute) {
    const key = `${route.nodeA}|${route.nodeB}`
    if (activeKey === key) {
      setActiveKey(null)
      onClearRoute()
      return
    }
    setActiveKey(key)
    onShowRoute(route.nodeA, route.nodeB, { distance: route.distance, path: route.path })
  }

  async function deleteRoute(nodeA: string, nodeB: string) {
    const key = `${nodeA}|${nodeB}`
    setDeletingKey(key)
    setDeleteError(null)
    try {
      await mapClient.delete('/map/route', { params: { from: nodeA, to: nodeB } })
      if (activeKey === key) setActiveKey(null)
      await loadRoutes()
    } catch (err: unknown) {
      setDeleteError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Delete failed'
      )
    } finally {
      setDeletingKey(null)
    }
  }

  return (
    <div className="w-72 bg-white border-l border-gray-200 flex flex-col shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h2 className="font-semibold text-gray-800">Saved Routes</h2>
        <button
          onClick={loadRoutes}
          className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded px-2 py-0.5"
          title="Refresh"
        >
          ↻
        </button>
      </div>

      {deleteError && (
        <div className="px-4 pt-3">
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {deleteError}
          </p>
        </div>
      )}

      {loading && (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          Loading…
        </div>
      )}

      {error && (
        <div className="px-4 py-3 flex-1">
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </p>
        </div>
      )}

      {!loading && !error && routes.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm italic">
          No saved routes yet
        </div>
      )}

      {!loading && !error && routes.length > 0 && (
        <ol className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {routes.map((route) => {
            const key = `${route.nodeA}|${route.nodeB}`
            const isActive = activeKey === key
            const isDeleting = deletingKey === key
            return (
              <li key={key} className={`px-4 py-3 ${isActive ? 'bg-orange-50' : ''}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-800">
                    {route.nodeA}
                    <span className="text-gray-400 mx-1">→</span>
                    {route.nodeB}
                  </span>
                  <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 rounded px-1.5 py-0.5">
                    {route.distance}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-2">
                  {route.path.length} hop{route.path.length !== 1 ? 's' : ''}
                </p>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => showRoute(route)}
                    className={`flex-1 text-xs py-1 rounded font-medium border transition-colors ${
                      isActive
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {isActive ? 'Shown' : 'Show'}
                  </button>
                  <button
                    onClick={() => deleteRoute(route.nodeA, route.nodeB)}
                    disabled={isDeleting}
                    className="px-2 text-xs py-1 rounded font-medium border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                  >
                    {isDeleting ? '…' : 'Delete'}
                  </button>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
