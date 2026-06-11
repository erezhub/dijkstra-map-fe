import { useAuth } from '../contexts/AuthContext'

export default function Navbar() {
  const { role, logout } = useAuth()

  return (
    <nav className="h-12 bg-gray-900 text-white flex items-center justify-between px-4 shrink-0">
      <span className="font-semibold tracking-wide">Dijkstra Map</span>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-400">{role}</span>
        <button
          onClick={logout}
          className="text-gray-300 hover:text-white transition-colors"
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
