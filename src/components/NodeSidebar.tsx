import { useState } from 'react'
import mapClient from '../api/mapClient'

interface ApiNode {
  id: string
  name: string
  position: { x: number; y: number }
  connections: Record<string, number> // keys are node IDs
}

interface ConnRow {
  id: string
  name: string
  weight: string
}

interface Props {
  node: ApiNode
  allNodes: ApiNode[]
  canEdit: boolean
  onClose: () => void
  onSaved: () => void
  onDeleted: () => void
}

export default function NodeSidebar({ node, allNodes, canEdit, onClose, onSaved, onDeleted }: Props) {
  const [name, setName] = useState(node.name)
  const [conns, setConns] = useState<ConnRow[]>(
    Object.entries(node.connections).map(([id, w]) => ({
      id,
      name: allNodes.find((n) => n.id === id)?.name ?? id,
      weight: String(w),
    }))
  )
  const [newNodeId, setNewNodeId] = useState('')
  const [newWeight, setNewWeight] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const availableNodes = allNodes.filter(
    (n) => n.id !== node.id && !conns.some((c) => c.id === n.id)
  )

  function addRow() {
    if (!newNodeId || !newWeight.trim()) return
    const target = allNodes.find((n) => n.id === newNodeId)
    if (!target) return
    setConns((prev) => [...prev, { id: newNodeId, name: target.name, weight: newWeight.trim() }])
    setNewNodeId('')
    setNewWeight('')
  }

  function removeRow(index: number) {
    setConns((prev) => prev.filter((_, i) => i !== index))
  }

  async function save() {
    setError(null)
    setSaving(true)
    try {
      const connections = Object.fromEntries(
        conns.filter((c) => c.id && c.weight.trim()).map((c) => [c.id, Number(c.weight)])
      )
      const body: Record<string, unknown> = { connections }
      if (name.trim() && name.trim() !== node.name) body.newName = name.trim()
      await mapClient.put(`/map/node/${node.id}`, body)
      onSaved()
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Save failed'
      )
    } finally {
      setSaving(false)
    }
  }

  async function deleteNode() {
    if (!confirm(`Delete node "${node.name}"?`)) return
    setDeleting(true)
    try {
      await mapClient.delete(`/map/node/${node.id}`)
      onDeleted()
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Delete failed'
      )
      setDeleting(false)
    }
  }

  return (
    <div className="w-72 bg-white border-l border-gray-200 flex flex-col overflow-y-auto shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h2 className="font-semibold text-gray-800">{node.name}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">
          ×
        </button>
      </div>

      <div className="px-4 py-2 text-xs text-gray-500">
        Position: ({Math.round(node.position.x)}, {Math.round(node.position.y)})
      </div>

      {canEdit && (
        <div className="px-4 py-2 border-b border-gray-100">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full border border-gray-200 rounded px-2 py-1 text-sm"
          />
        </div>
      )}

      <div className="px-4 flex-1 pt-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          Connections
        </p>

        {conns.length === 0 && (
          <p className="text-sm text-gray-400 mb-3">No connections</p>
        )}

        <div className="space-y-1 mb-3">
          {conns.map((c, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="flex-1 font-medium text-gray-700">{c.name}</span>
              {canEdit ? (
                <input
                  type="number"
                  value={c.weight}
                  onChange={(e) =>
                    setConns((prev) =>
                      prev.map((row, idx) => (idx === i ? { ...row, weight: e.target.value } : row))
                    )
                  }
                  className="w-16 border border-gray-200 rounded px-2 py-0.5 text-center text-sm"
                />
              ) : (
                <span className="text-gray-500">{c.weight}</span>
              )}
              {canEdit && (
                <button
                  onClick={() => removeRow(i)}
                  className="text-red-400 hover:text-red-600 font-bold"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        {canEdit && (
          <div className="flex gap-1 mb-4">
            <select
              value={newNodeId}
              onChange={(e) => setNewNodeId(e.target.value)}
              className="flex-1 min-w-0 border border-gray-200 rounded px-2 py-1 text-sm text-gray-700"
            >
              <option value="">Add connection…</option>
              {availableNodes.map((n) => (
                <option key={n.id} value={n.id}>{n.name}</option>
              ))}
            </select>
            <input
              placeholder="Wt"
              type="number"
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              className="w-14 border border-gray-200 rounded px-2 py-1 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && addRow()}
            />
            <button
              onClick={addRow}
              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium"
            >
              +
            </button>
          </div>
        )}

        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
      </div>

      {canEdit && (
        <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg py-1.5 text-sm font-medium"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={deleteNode}
            disabled={deleting}
            className="px-3 bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-600 rounded-lg py-1.5 text-sm font-medium border border-red-200"
          >
            {deleting ? '…' : 'Delete'}
          </button>
        </div>
      )}
    </div>
  )
}
