import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Navbar() {
  const { role, username, logout } = useAuth()
  const location = useLocation()
  const canManageUsers = role === 'ADMIN' || role === 'MANAGER'

  function navLink(to: string, label: string) {
    const active = location.pathname === to
    return (
      <Link
        to={to}
        className={`text-sm transition-colors ${
          active ? 'text-white font-semibold' : 'text-gray-400 hover:text-white'
        }`}
      >
        {label}
      </Link>
    )
  }

  return (
    <nav className="h-12 bg-gray-900 text-white flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-5">
        <span className="font-semibold tracking-wide">Dijkstra Map</span>
        {navLink('/', 'Map')}
        {canManageUsers && navLink('/users', 'Users')}
        {navLink('/profile', 'Profile')}
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-400">{username}</span>
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
