import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Person = {
  id: string
  name: string
  attributes: Record<string, unknown>
  created_at: string
}

export function PeopleList() {
  const [people, setPeople] = useState<Person[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false

    supabase
      .from('persons')
      .select('id, name, attributes, created_at')
      .order('name', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setError(error.message)
          return
        }
        setPeople((data ?? []) as unknown as Person[])
      })

    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    if (!people) return []
    const q = query.trim().toLowerCase()
    if (!q) return people
    return people.filter((person) => person.name.toLowerCase().includes(q))
  }, [people, query])

  return (
    <main style={{ maxWidth: 600, margin: '0 auto', padding: '32px 16px' }}>
      <h1>People</h1>

      <input
        type="text"
        placeholder="Filter by name"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: 6,
          border: '1px solid var(--border)',
          background: 'transparent',
          color: 'inherit',
          marginTop: 16,
        }}
      />

      {error && (
        <p style={{ color: 'var(--error)', marginTop: 16 }}>{error}</p>
      )}

      {people === null && !error && (
        <p style={{ color: 'var(--text)', marginTop: 16 }}>Loading…</p>
      )}

      {people !== null && people.length === 0 && (
        <p style={{ color: 'var(--text)', marginTop: 16 }}>No people yet.</p>
      )}

      {people !== null && people.length > 0 && filtered.length === 0 && (
        <p style={{ color: 'var(--text)', marginTop: 16 }}>No matches.</p>
      )}

      <ul style={{ listStyle: 'none', padding: 0, marginTop: 16 }}>
        {filtered.map((person) => (
          <li key={person.id} style={{ borderBottom: '1px solid var(--border)' }}>
            <Link
              to={`/people/${person.id}`}
              style={{
                display: 'block',
                padding: '12px 4px',
                color: 'var(--text-h)',
                textDecoration: 'none',
              }}
            >
              {person.name}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
