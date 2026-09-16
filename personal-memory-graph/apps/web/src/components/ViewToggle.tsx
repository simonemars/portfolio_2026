import { Link, useLocation } from 'react-router-dom'

const OPTIONS = [
  { to: '/', label: 'People' },
  { to: '/graph', label: 'Graph' },
]

export function ViewToggle() {
  const { pathname } = useLocation()

  return (
    <div
      style={{
        display: 'inline-flex',
        padding: 3,
        gap: 2,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 999,
      }}
    >
      {OPTIONS.map((option) => {
        const active = pathname === option.to
        return (
          <Link
            key={option.to}
            to={option.to}
            aria-current={active ? 'page' : undefined}
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              fontSize: 14,
              fontWeight: 700,
              textDecoration: 'none',
              color: active ? 'var(--accent-text)' : 'var(--text)',
              background: active ? 'var(--accent)' : 'transparent',
              transition: 'background 120ms ease, color 120ms ease',
            }}
          >
            {option.label}
          </Link>
        )
      })}
    </div>
  )
}
