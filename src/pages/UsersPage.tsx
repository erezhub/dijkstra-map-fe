import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import userClient from '../api/userClient'
import { useAuth } from '../contexts/AuthContext'
import Navbar from '../components/Navbar'

interface UserResponse {
  id: string
  username: string
  email: string
  role: 'ADMIN' | 'MANAGER' | 'REGULAR'
}

type ApiError = { response?: { data?: { message?: string } } }
function errMsg(err: unknown, fallback: string) {
  return (err as ApiError)?.response?.data?.message ?? fallback
}

// ── Create modal ──────────────────────────────────────────────────────────────

interface CreateModalProps {
  onClose: () => void
  onCreated: () => void
}

function CreateUserModal({ onClose, onCreated }: CreateModalProps) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await userClient.post('/users', { username, email, password })
      onCreated()
    } catch (err) {
      setError(errMsg(err, 'Failed to create user'))
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
          <h2 className="font-semibold text-gray-800 text-lg">New User</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

        <Field label="Username" value={username} onChange={setUsername} required />
        <Field label="Email" type="email" value={email} onChange={setEmail} required />
        <Field label="Password" type="password" value={password} onChange={setPassword} required />

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium"
        >
          {saving ? 'Creating…' : 'Create'}
        </button>
      </form>
    </div>
  )
}

// ── Edit modal ────────────────────────────────────────────────────────────────

interface EditModalProps {
  user: UserResponse
  onClose: () => void
  onSaved: () => void
}

function EditUserModal({ user, onClose, onSaved }: EditModalProps) {
  const [username, setUsername] = useState(user.username)
  const [email, setEmail] = useState(user.email ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await userClient.put(`/users/${user.id}`, { username, email })
      onSaved()
    } catch (err) {
      setError(errMsg(err, 'Failed to update user'))
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
          <h2 className="font-semibold text-gray-800 text-lg">Edit User</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

        <Field label="Username" value={username} onChange={setUsername} />
        <Field label="Email" type="email" value={email} onChange={setEmail} />

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </form>
    </div>
  )
}

// ── Shared form field ─────────────────────────────────────────────────────────

interface FieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
}

function Field({ label, value, onChange, type = 'text', required }: FieldProps) {
  return (
    <div className="space-y-1">
      <label className="text-sm text-gray-600">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
    </div>
  )
}

// ── Role badge ────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const colour =
    role === 'ADMIN' ? 'bg-red-100 text-red-700' :
    role === 'MANAGER' ? 'bg-amber-100 text-amber-700' :
    'bg-gray-100 text-gray-600'
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${colour}`}>{role}</span>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const { role } = useAuth()
  const navigate = useNavigate()

  const [users, setUsers] = useState<UserResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    if (role === 'REGULAR') navigate('/', { replace: true })
  }, [role, navigate])

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await userClient.get<UserResponse[]>('/users')
      setUsers(data)
    } catch (err) {
      setError(errMsg(err, 'Failed to load users'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  async function deleteUser(user: UserResponse) {
    if (!confirm(`Delete user "${user.username}"?`)) return
    setDeletingId(user.id)
    setDeleteError(null)
    try {
      await userClient.delete(`/users/${user.id}`)
      await loadUsers()
    } catch (err) {
      setDeleteError(errMsg(err, 'Delete failed'))
    } finally {
      setDeletingId(null)
    }
  }

  const managedRole = role === 'ADMIN' ? 'MANAGER' : 'REGULAR'

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar />

      <div className="flex-1 overflow-y-auto px-6 py-6 max-w-3xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">User Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {role === 'ADMIN' ? 'Managing managers' : 'Managing regular users'}
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            + New {managedRole.charAt(0) + managedRole.slice(1).toLowerCase()}
          </button>
        </div>

        {deleteError && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {deleteError}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-16 text-gray-400">Loading…</div>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {!loading && !error && users.length === 0 && (
          <div className="flex items-center justify-center py-16 text-gray-400 italic">
            No users yet
          </div>
        )}

        {!loading && !error && users.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {users.map((user) => (
              <div key={user.id} className="flex items-center gap-4 px-5 py-4">
                <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center shrink-0">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 text-sm truncate">{user.username}</span>
                    <RoleBadge role={user.role} />
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{user.email}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setEditingUser(user)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-600 font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteUser(user)}
                    disabled={deletingId === user.id}
                    className="text-xs px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-medium disabled:opacity-50"
                  >
                    {deletingId === user.id ? '…' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadUsers() }}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={() => { setEditingUser(null); loadUsers() }}
        />
      )}
    </div>
  )
}
