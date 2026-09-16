import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Person = {
  id: string
  name: string
  attributes: Record<string, unknown>
  created_at: string
}

type Memory = {
  id: string
  text: string
  created_at: string
}

type MemoryLink = {
  memory_id: string
  memories: Memory | null
}

type PersonRef = {
  id: string
  name: string
}

type Edge = {
  id: string
  story: string | null
  person_a: PersonRef | null
  person_b: PersonRef | null
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function stringAttr(attributes: Record<string, unknown>, key: string): string | null {
  const value = attributes[key]
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

// Keyed by id from the route wrapper below, so navigating from one person's
// connection to another remounts this fresh rather than reusing state from
// the previous person.
function PersonDetailView({ id }: { id: string }) {
  // undefined = still loading, null = confirmed not found
  const [person, setPerson] = useState<Person | null | undefined>(undefined)
  const [memories, setMemories] = useState<MemoryLink[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load(personId: string) {
      const [personResult, memoriesResult, edgesResult] = await Promise.all([
        supabase
          .from('persons')
          .select('id, name, attributes, created_at')
          .eq('id', personId)
          .maybeSingle(),
        supabase
          .from('memory_person')
          .select('memory_id, memories(id, text, created_at)')
          .eq('person_id', personId)
          .order('created_at', { foreignTable: 'memories', ascending: false }),
        supabase
          .from('edges')
          .select(
            'id, story, person_a:persons!edges_person_a_id_fkey(id, name), person_b:persons!edges_person_b_id_fkey(id, name)',
          )
          .or(`person_a_id.eq.${personId},person_b_id.eq.${personId}`),
      ])

      if (cancelled) return

      if (personResult.error) {
        setError(personResult.error.message)
        return
      }
      setPerson((personResult.data ?? null) as unknown as Person | null)

      if (memoriesResult.error) {
        setError(memoriesResult.error.message)
      } else {
        setMemories((memoriesResult.data ?? []) as unknown as MemoryLink[])
      }

      if (edgesResult.error) {
        setError(edgesResult.error.message)
      } else {
        setEdges((edgesResult.data ?? []) as unknown as Edge[])
      }
    }

    load(id)

    return () => {
      cancelled = true
    }
  }, [id])

  if (error) {
    return (
      <main style={{ maxWidth: 600, margin: '0 auto', padding: '32px 16px' }}>
        <p style={{ color: 'var(--error)' }}>{error}</p>
        <Link to="/">Back to people</Link>
      </main>
    )
  }

  if (person === undefined) {
    return (
      <main style={{ maxWidth: 600, margin: '0 auto', padding: '32px 16px' }}>
        <p style={{ color: 'var(--text)' }}>Loading…</p>
      </main>
    )
  }

  if (person === null) {
    return (
      <main style={{ maxWidth: 600, margin: '0 auto', padding: '32px 16px' }}>
        <h1>Not found</h1>
        <p style={{ color: 'var(--text)' }}>
          This person doesn't exist, or isn't yours to see.
        </p>
        <Link to="/">Back to people</Link>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: 600, margin: '0 auto', padding: '32px 16px' }}>
      <Link to="/" style={{ fontSize: 14 }}>
        ← Back to people
      </Link>
      <h1 style={{ marginTop: 12 }}>{person.name}</h1>

      {(() => {
        const title = stringAttr(person.attributes, 'title')
        const company = stringAttr(person.attributes, 'company')
        const linkedinUrl = stringAttr(person.attributes, 'linkedinUrl')
        const connectedOn = stringAttr(person.attributes, 'connectedOn')
        const roleLine = [title, company].filter(Boolean).join(' at ')

        if (!roleLine && !linkedinUrl && !connectedOn) return null

        return (
          <div style={{ marginTop: 8 }}>
            {roleLine && <p style={{ margin: 0, color: 'var(--text)' }}>{roleLine}</p>}
            {linkedinUrl && (
              <p style={{ margin: '4px 0 0' }}>
                <a href={linkedinUrl} target="_blank" rel="noreferrer">
                  LinkedIn profile
                </a>
              </p>
            )}
            {connectedOn && (
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text)' }}>
                Connected on LinkedIn — {connectedOn}
              </p>
            )}
          </div>
        )
      })()}

      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 16 }}>Memories</h2>
        {memories.length === 0 && (
          <p style={{ color: 'var(--text)' }}>No memories yet.</p>
        )}
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {memories.map((link) =>
            link.memories ? (
              <li
                key={link.memory_id}
                style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}
              >
                <p style={{ margin: 0, color: 'var(--text-h)' }}>{link.memories.text}</p>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text)' }}>
                  {formatDate(link.memories.created_at)}
                </p>
              </li>
            ) : null,
          )}
        </ul>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 16 }}>Connections</h2>
        {edges.length === 0 && (
          <p style={{ color: 'var(--text)' }}>No connections yet.</p>
        )}
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {edges.map((edge) => {
            const other = edge.person_a?.id === person.id ? edge.person_b : edge.person_a
            if (!other) return null
            return (
              <li
                key={edge.id}
                style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}
              >
                <Link to={`/people/${other.id}`} style={{ color: 'var(--text-h)', fontWeight: 700 }}>
                  {other.name}
                </Link>
                {edge.story && (
                  <p style={{ margin: '4px 0 0', color: 'var(--text)' }}>{edge.story}</p>
                )}
              </li>
            )
          })}
        </ul>
      </section>
    </main>
  )
}

export function PersonDetail() {
  const { id } = useParams<{ id: string }>()

  if (!id) {
    return (
      <main style={{ maxWidth: 600, margin: '0 auto', padding: '32px 16px' }}>
        <h1>Not found</h1>
        <p style={{ color: 'var(--text)' }}>
          This person doesn't exist, or isn't yours to see.
        </p>
        <Link to="/">Back to people</Link>
      </main>
    )
  }

  return <PersonDetailView key={id} id={id} />
}
