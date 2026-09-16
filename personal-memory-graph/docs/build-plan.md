# Build plan

Distilled from the `frame-problem` pass ("Personal Memory Graph", v1) and the
worktree build runbook. This is the reference `CLAUDE.md` points at — keep it
in sync if either source document changes.

## The problem

People who meet many others — across work, friendship, and family — lose the
specific details that make each relationship feel real. Not from
indifference, but because memory doesn't scale past a few hundred people. No
existing tool solves this without either treating people as records to
enrich toward some transaction (Dex, Clay, Folk, Cloze, LeadDelta, Monica),
or capturing detail without turning the network between people, and the
story behind each one, into something searchable and walkable later
(Obsidian plugins, voice-capture tools).

## Who it's for

Simo, first — this has to earn a place in his own weekly habit before
anyone else's. The people written about are a real stakeholder: everyone
added is a non-consenting subject of someone else's notes on them, and the
content here reads closer to a diary entry than a sales note. Multi-user
productization is deliberately deferred.

## Constraints

- **Solo build.** The data model earns its keep with two things: graph
  edges between people, and searchable free-text memory.
- **Years already live in Obsidian.** If the app can't import that
  structure, the whole premise fails at the first hurdle.
- **Standalone means data leaves the vault.** Needs an honest data-handling
  stance — this is family and friends, not leads.
- **It can never read as a CRM.** No stage, no deal, no lead score, no
  pipeline, anywhere in the product.
- **Capture happens standing up** — in a cafe, right after a conversation,
  on a phone. Nothing that needs a form filled in on the spot.

## Principles

- **Content** — a story is the primary object; fields like company or city
  support it, they never replace it.
- **Shape** — every person is defined partly by who else they're connected
  to, not only by their relation to Simo.
- **Capture** — logging happens at the speed of a thought: voice-first,
  usable standing up, near-zero friction.
- **Retrieval** — search by meaning, in plain language, never only by a tag
  someone remembered to set months ago.
- **Tone** — nothing in the interface borrows CRM language.
- **Ethics** — write every note as though its subject could, in principle,
  read it back.

## Phased priorities

| Sub-problem | Why it matters | Phase |
|---|---|---|
| Low-friction capture (voice / quick add) | The daily-use hook — without it, nothing gets added after week one. | 1 |
| Import from the existing Obsidian vault | Years of notes are stranded otherwise. | 1 |
| Person-to-person graph, manually linked | The core differentiator against every business-shaped tool. | 1 |
| Natural-language retrieval | Solves the real failure mode of plain Obsidian — search, not storage. | 2 |
| Graph visualization (force-directed) | Makes the network legible; the underlying data matters more than the picture. | 2 |
| Multi-user, product-ification | Deliberately deferred. | Later |

## Architecture (as executed by the worktree build runbook)

> As of the Telegram + browse-only-website pivot, the `apps/mobile/` bullet
> below is historical — see
> [docs/telegram-website-plan-delta.md](telegram-website-plan-delta.md) for
> what replaced it. The schema and backend bullets are still accurate.

- **`supabase/migrations/`** — Postgres schema: `persons`, `memories`
  (with a `vector(1024)` embedding column for Voyage), `memory_person` join
  table, `edges` (person-to-person, with a `story` field). Every table gets
  an RLS policy scoped to `auth.uid()`.
- **`supabase/functions/`** — edge functions for capture (Claude tool-use
  draft + person match against `rawText`; no server-side transcription —
  the client is responsible for producing text before calling this), retrieval
  (Voyage embed + pgvector similarity search via the `match_memories` RPC;
  no Claude call, since the reviewed contract has no answer-synthesis field),
  save-capture (persists a reviewed draft: embeds it, then atomically writes
  `memories`/`persons`/`memory_person` via the `save_capture` RPC), and
  graph-aware query (Claude-based target-person resolution from natural
  language, then a one-hop intermediary lookup over `edges`; ranked by
  recency, not a semantic/Claude-scored ranking). Each deviation from an
  earlier, looser description of these functions is deliberate and documented
  in the function's own `README.md` and code comments — the README is the
  source of truth for each contract, not this summary.
- ~~`apps/mobile/` — Expo/React Native client~~ — removed. Replaced by a
  Telegram bot (capture + ask surface) and `apps/web/` (browse-only people
  list + person detail pages). See the delta doc linked above.

See `worktree-build-runbook.md` at the repo root for the original build
sequence, and the delta doc for how Steps 3 onward changed.
