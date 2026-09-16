import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'

export function RequireSession({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return null
  }

  if (!session) {
    return <Navigate to="/sign-in" replace />
  }

  return <>{children}</>
}
