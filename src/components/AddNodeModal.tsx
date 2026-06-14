import { useState, type FormEvent } from 'react'
import mapClient from '../api/mapClient'
import type { ApiNode } from '../pages/MapPage'

interface ConnRow {
  id: string
  name: string
  weight: string
}

interface Props {
  allNodes: ApiNode[]
  onClose: () => void
  onSaved: () => void
}

export default function AddNodeModal({ allNodes, onClose, onSaved }: Props) {
  const [name, setName] = useState('')
  const [x, setX] = useState('0')
  const [y, setY] = useState('0')
  const [conns, setConns] = useState<ConnRow[]>([])
  const [newNodeId, setNewNodeId] = useState('')
  const [newWeight, setNewWeight] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const availableNodes = allNodes.filter((n) => !conns.some((c) => c.id === n.id))

  function addRow() {
    if (!newNodeId || !newWeight.trim()) return
    const target = allNodes.find((n) => n.id === newNodeId)
    if (!target) return
    setConns((prev) => [...prev, { id: newNodeId, name: target.name, weight: newWeight.trim() }])
    setNewNodeId('')
    setNewWeight('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const connections = Object.fromEntries(
        conns.filter((c) => c.id && c.weight.trim()).map((c) => [c.id, Number(c.weight)])
      )
      await mapClient.post('/map/node', {
        name: name.trim(),
        position: { x: Number(x), y: Number(y) },
        connections,
      })
      onSaved()
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to add node'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 text-lg">Add Node</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
            ×
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>
        )}

        <div className="space-y-1">
          <label className="text-sm text-gray-600">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1 space-y-1">
            <label className="text-sm text-gray-600">X</label>
            <input
              type="number"
              value={x}
              onChange={(e) => setX(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-sm text-gray-600">Y</label>
            <input
              type="number"
              value={y}
              onChange={(e) => setY(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        </div>

        <div>
          <p className="text-sm text-gray-600 mb-2">Connections</p>
          <div className="space-y-1 mb-2">
            {conns.map((c, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="flex-1 font-medium text-gray-700">{c.name}</span>
                <span className="text-gray-500 w-10 text-right">{c.weight}</span>
                <button
                  type="button"
                  onClick={() => setConns((prev) => prev.filter((_, idx) => idx !== i))}
                  className="text-red-400 hover:text-red-600 font-bold"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-1">
            <select
              value={newNodeId}
              onChange={(e) => setNewNodeId(e.target.value)}
              className="flex-1 min-w-0 border border-gray-200 rounded px-2 py-1 text-sm text-gray-700"
            >
              <option value="">Select node…</option>
              {availableNodes.map((n) => (
                <option key={n.id} value={n.id}>{n.name}</option>
              ))}
            </select>
            <input
              placeholder="Wt"
              type="number"
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRow())}
              className="w-16 border border-gray-200 rounded px-2 py-1 text-sm"
            />
            <button
              type="button"
              onClick={addRow}
              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium"
            >
              +
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium"
        >
          {saving ? 'Adding…' : 'Add Node'}
        </button>
      </form>
    </div>
  )
}
