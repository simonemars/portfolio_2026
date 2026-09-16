import { Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthProvider'
import { ThemeToggle } from './ThemeToggle'
import { ViewToggle } from './ViewToggle'

export function AppLayout() {
  const { session } = useAuth()

  return (
    <div>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <span style={{ fontWeight: 700, color: 'var(--text-h)' }}>Memory Graph</span>
          <ViewToggle />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: 'var(--text)', fontSize: 14 }}>{session?.user.email}</span>
          <ThemeToggle />
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'inherit',
              cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </div>
      </header>
      <Outlet />
    </div>
  )
}
