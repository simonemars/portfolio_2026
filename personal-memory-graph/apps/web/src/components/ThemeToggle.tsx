import { useTheme } from '../lib/useTheme'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        width: 34,
        height: 34,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        border: '1px solid var(--border)',
        background: 'transparent',
        color: 'var(--text-h)',
        fontSize: 16,
        lineHeight: 1,
        cursor: 'pointer',
        padding: 0,
      }}
    >
      {isDark ? '☀' : '☾'}
    </button>
  )
}
