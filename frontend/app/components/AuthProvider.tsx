'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

type AuthUser = {
  id: number
  email: string
  username: string
  xp: number
  level: number
  is_verified: boolean
}

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/me`, {
        method: 'GET',
        credentials: 'include',
      })
      if (!response.ok) {
        setUser(null)
        return
      }
      const data: AuthUser = await response.json()
      setUser(data)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } finally {
      setUser(null)
    }
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      refresh,
      logout,
    }),
    [user, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

