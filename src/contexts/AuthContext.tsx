import { createContext, useContext, useState, type ReactNode } from 'react'
import userClient from '../api/userClient'

type Role = 'ADMIN' | 'MANAGER' | 'REGULAR'

interface AuthState {
  token: string | null
  role: Role | null
}

interface AuthContextValue extends AuthState {
  login: (identifier: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(() => ({
    token: localStorage.getItem('token'),
    role: localStorage.getItem('role') as Role | null,
  }))

  async function login(identifier: string, password: string) {
    const { data } = await userClient.post<{ token: string }>('/auth/login', {
      identifier,
      password,
    })
    const meRes = await userClient.get<{ role: Role }>('/users/me', {
      headers: { Authorization: `Bearer ${data.token}` },
    })
    localStorage.setItem('token', data.token)
    localStorage.setItem('role', meRes.data.role)
    setAuth({ token: data.token, role: meRes.data.role })
  }

  async function logout() {
    try {
      await userClient.post('/auth/logout')
    } finally {
      localStorage.removeItem('token')
      localStorage.removeItem('role')
      setAuth({ token: null, role: null })
    }
  }

  return (
    <AuthContext.Provider value={{ ...auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
