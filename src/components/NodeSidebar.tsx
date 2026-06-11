import { useState } from 'react'
import mapClient from '../api/mapClient'

interface ApiNode {
  name: string
  position: { x: number; y: number }
  connections: Record<string, number>
}

interface Props {
  node: ApiNode
  canEdit: boolean
  onClose: () => void
  onSaved: () => void
  onDeleted: () => void
}

export default function NodeSidebar({ node, canEdit, onClose, onSaved, onDeleted }: Props) {
  const [conns, setConns] = useState(
    Object.entries(node.connections).map(([n, w]) => ({ node: n, weight: String(w) }))
  )
  const [newNode, setNewNode] = useState('')
  const [newWeight, setNewWeight] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addRow() {
    if (!newNode.trim() || !newWeight.trim()) return
    setConns((prev) => [...prev, { node: newNode.trim(), weight: newWeight.trim() }])
    setNewNode('')
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
        conns
          .filter((c) => c.node.trim() && c.weight.trim())
          .map((c) => [c.node.trim(), Number(c.weight)])
      )
      await mapClient.put(`/map/node/${node.name}`, { connections })
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
      await mapClient.delete(`/map/node/${node.name}`)
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

      <div className="px-4 py-3 text-xs text-gray-500">
        Position: ({Math.round(node.position.x)}, {Math.round(node.position.y)})
      </div>

      <div className="px-4 flex-1">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          Connections
        </p>

        {conns.length === 0 && (
          <p className="text-sm text-gray-400 mb-3">No connections</p>
        )}

        <div className="space-y-1 mb-3">
          {conns.map((c, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="flex-1 font-medium text-gray-700">{c.node}</span>
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
            <input
              placeholder="Node"
              value={newNode}
              onChange={(e) => setNewNode(e.target.value)}
              className="flex-1 min-w-0 border border-gray-200 rounded px-2 py-1 text-sm"
            />
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
