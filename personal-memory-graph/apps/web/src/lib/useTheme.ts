import { useCallback, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

const STORAGE_KEY = 'theme'

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : null
  } catch {
    return null
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
}

/**
 * Manual light/dark override, persisted per-browser. Falls back to the
 * system preference (via prefers-color-scheme in index.css) until the user
 * makes an explicit choice here. The initial value is also set
 * synchronously in index.html (before React mounts) to avoid a flash of
 * the wrong theme on load -- this hook just keeps React's state in sync
 * with that and handles the toggle itself.
 */
export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [theme, setTheme] = useState<Theme>(() => readStoredTheme() ?? (systemPrefersDark() ? 'dark' : 'light'))

  useEffect(() => {
    applyTheme(theme)
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // Best-effort only -- a failure to persist just means the choice
      // doesn't survive a reload, not worth surfacing to the user.
    }
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, toggleTheme }
}
