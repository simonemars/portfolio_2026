import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force'
import { supabase } from '../lib/supabase'

type Person = {
  id: string
  name: string
}

type Edge = {
  id: string
  person_a_id: string
  person_b_id: string
  story: string | null
}

type GraphNode = SimulationNodeDatum & {
  id: string
  name: string
}

type GraphLink = SimulationLinkDatum<GraphNode> & {
  id: string
}

type LaidOutGraph = {
  nodes: GraphNode[]
  links: GraphLink[]
  viewBox: string
}

const NODE_RADIUS = 24
const PADDING = 60
const TICKS = 300

function layout(people: Person[], edges: Edge[]): LaidOutGraph {
  const nodes: GraphNode[] = people.map((person) => ({
    id: person.id,
    name: person.name,
  }))

  const links: GraphLink[] = edges.map((edge) => ({
    id: edge.id,
    source: edge.person_a_id,
    target: edge.person_b_id,
  }))

  const simulation = forceSimulation(nodes)
    .force(
      'link',
      forceLink<GraphNode, GraphLink>(links)
        .id((d) => d.id)
        .distance(120),
    )
    .force('charge', forceManyBody().strength(-220))
    .force('center', forceCenter(0, 0))
    .force('collide', forceCollide(NODE_RADIUS + 12))
    .stop()

  for (let i = 0; i < TICKS; i += 1) {
    simulation.tick()
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const node of nodes) {
    const x = node.x ?? 0
    const y = node.y ?? 0
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }

  if (!Number.isFinite(minX)) {
    // No nodes at all — shouldn't render, but keep a sane default.
    minX = 0
    minY = 0
    maxX = 0
    maxY = 0
  }

  const left = minX - NODE_RADIUS - PADDING
  const top = minY - NODE_RADIUS - PADDING
  const width = maxX - minX + (NODE_RADIUS + PADDING) * 2
  const height = maxY - minY + (NODE_RADIUS + PADDING) * 2

  return {
    nodes,
    links,
    viewBox: `${left} ${top} ${Math.max(width, 1)} ${Math.max(height, 1)}`,
  }
}

export function Graph() {
  const navigate = useNavigate()
  const [people, setPeople] = useState<Person[] | null>(null)
  const [edges, setEdges] = useState<Edge[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const [peopleResult, edgesResult] = await Promise.all([
        supabase.from('persons').select('id, name'),
        supabase.from('edges').select('id, person_a_id, person_b_id, story'),
      ])

      if (cancelled) return

      if (peopleResult.error) {
        setError(peopleResult.error.message)
        return
      }
      if (edgesResult.error) {
        setError(edgesResult.error.message)
        return
      }

      setPeople((peopleResult.data ?? []) as unknown as Person[])
      setEdges((edgesResult.data ?? []) as unknown as Edge[])
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  // Computed unconditionally (before the early returns below) since hooks
  // must run in the same order every render. d3-force's simulation involves
  // randomization, so without this memo, any unrelated re-render of this
  // component would silently reshuffle every node's position.
  const laidOutGraph = useMemo(() => layout(people ?? [], edges ?? []), [people, edges])

  if (error) {
    return (
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '32px 16px' }}>
        <h1>Graph</h1>
        <p style={{ color: 'var(--error)' }}>{error}</p>
      </main>
    )
  }

  if (people === null || edges === null) {
    return (
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '32px 16px' }}>
        <h1>Graph</h1>
        <p style={{ color: 'var(--text)' }}>Loading…</p>
      </main>
    )
  }

  if (people.length === 0) {
    return (
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '32px 16px' }}>
        <h1>Graph</h1>
        <p style={{ color: 'var(--text)' }}>No people yet.</p>
      </main>
    )
  }

  const { nodes, links, viewBox } = laidOutGraph

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '32px 16px' }}>
      <h1>Graph</h1>
      <svg
        viewBox={viewBox}
        style={{
          width: '100%',
          height: '75vh',
          marginTop: 16,
          border: '1px solid var(--border)',
          borderRadius: 8,
        }}
      >
        {links.map((link) => {
          const source = link.source as GraphNode
          const target = link.target as GraphNode
          return (
            <line
              key={link.id}
              x1={source.x ?? 0}
              y1={source.y ?? 0}
              x2={target.x ?? 0}
              y2={target.y ?? 0}
              stroke="var(--border)"
              strokeWidth={1.5}
            />
          )
        })}
        {nodes.map((node) => (
          <g
            key={node.id}
            role="button"
            tabIndex={0}
            aria-label={node.name}
            onClick={() => navigate(`/people/${node.id}`)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                navigate(`/people/${node.id}`)
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            <circle
              cx={node.x ?? 0}
              cy={node.y ?? 0}
              r={NODE_RADIUS}
              fill="var(--accent-bg)"
              stroke="var(--accent)"
              strokeWidth={1.5}
            />
            <text
              x={node.x ?? 0}
              y={(node.y ?? 0) + NODE_RADIUS + 16}
              textAnchor="middle"
              fill="var(--text-h)"
              fontSize={13}
            >
              {node.name}
            </text>
          </g>
        ))}
      </svg>
    </main>
  )
}
