import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { ThemeToggle } from '../components/ThemeToggle'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthProvider'

export function SignIn() {
  const { session, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  if (!loading && session) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setStatus('sending')
    setErrorMessage('')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })

    if (error) {
      setStatus('error')
      setErrorMessage(error.message)
      return
    }

    setStatus('sent')
  }

  const themeToggle = (
    <div style={{ position: 'fixed', top: 16, right: 24 }}>
      <ThemeToggle />
    </div>
  )

  if (status === 'sent') {
    return (
      <>
        {themeToggle}
        <main style={{ maxWidth: 400, margin: '80px auto', padding: '0 16px' }}>
          <h1>Check your email</h1>
          <p>
            We sent a sign-in link to <strong>{email}</strong>. Open it on this device to
            continue.
          </p>
        </main>
      </>
    )
  }

  return (
    <>
      {themeToggle}
      <main style={{ maxWidth: 400, margin: '80px auto', padding: '0 16px' }}>
        <h1>Sign in</h1>
        <p>Enter your email and we'll send you a link to sign in.</p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'inherit' }}
          />
          <button
            type="submit"
            disabled={status === 'sending'}
            style={{
              padding: '10px 12px',
              borderRadius: 6,
              border: 'none',
              background: 'var(--accent)',
              color: 'var(--accent-text)',
              cursor: status === 'sending' ? 'default' : 'pointer',
              opacity: status === 'sending' ? 0.7 : 1,
            }}
          >
            {status === 'sending' ? 'Sending…' : 'Send magic link'}
          </button>
          {status === 'error' && (
            <p style={{ color: 'var(--error)', margin: 0 }}>{errorMessage}</p>
          )}
        </form>
      </main>
    </>
  )
}
