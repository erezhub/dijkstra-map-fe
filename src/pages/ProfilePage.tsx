import { useState, useEffect, type FormEvent } from 'react'
import userClient from '../api/userClient'
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

function RoleBadge({ role }: { role: string }) {
  const colour =
    role === 'ADMIN' ? 'bg-red-100 text-red-700' :
    role === 'MANAGER' ? 'bg-amber-100 text-amber-700' :
    'bg-gray-100 text-gray-600'
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded ${colour}`}>{role}</span>
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    userClient.get<UserResponse>('/users/me')
      .then(({ data }) => {
        setUser(data)
        setUsername(data.username)
        setEmail(data.email ?? '')
      })
      .catch((err) => setLoadError(errMsg(err, 'Failed to load profile')))
      .finally(() => setLoading(false))
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      const body: Record<string, string> = { username, email }
      if (password) body.password = password
      const { data } = await userClient.put<UserResponse>('/users/me', body)
      setUser(data)
      setPassword('')
      setSaved(true)
    } catch (err) {
      setSaveError(errMsg(err, 'Failed to save profile'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar />

      <div className="flex-1 overflow-y-auto flex items-start justify-center px-6 py-10">
        <div className="w-full max-w-md space-y-6">

          {loading && (
            <p className="text-center text-gray-400">Loading…</p>
          )}

          {loadError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {loadError}
            </p>
          )}

          {user && (
            <>
              {/* Avatar + identity */}
              <div className="bg-white rounded-xl border border-gray-200 px-6 py-5 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xl flex items-center justify-center shrink-0">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{user.username}</span>
                    <RoleBadge role={user.role} />
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{user.email}</p>
                </div>
              </div>

              {/* Edit form */}
              <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 px-6 py-5 space-y-4">
                <h2 className="font-semibold text-gray-800">Edit Profile</h2>

                {saveError && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                    {saveError}
                  </p>
                )}
                {saved && (
                  <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
                    Profile updated successfully.
                  </p>
                )}

                <div className="space-y-1">
                  <label className="text-sm text-gray-600">Username</label>
                  <input
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setSaved(false) }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm text-gray-600">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setSaved(false) }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm text-gray-600">
                    New Password
                    <span className="text-gray-400 font-normal ml-1">(leave blank to keep current)</span>
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setSaved(false) }}
                    placeholder="••••••••"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
