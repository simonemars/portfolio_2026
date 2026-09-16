# Personal Memory Graph — worktree build runbook

Paste this into a Claude Code session opened at the repo root. Follow it step by
step; don't skip ahead to a later step until the current one is merged to `main`.

## Conventions

- Worktrees live in a sibling directory: `../pmg-worktrees/<slug>`
- Branch naming: `<role>/<slug>`
- Create: `git worktree add ../pmg-worktrees/<slug> -b <role>/<slug>`
- Every Bash call into a worktree should `cd` there explicitly and in the same
  command as the work — don't assume the shell's directory persists between
  tool calls: `cd ../pmg-worktrees/<slug> && <command>`.
- After a branch is merged: `git worktree remove ../pmg-worktrees/<slug>` then
  `git branch -d <role>/<slug>`.
- Never commit directly to `main`. Every change lands via a worktree branch,
  gets its gate (hook + reviewer/rls-auditor), then merges.
- If a "parallel" step below doesn't actually run concurrently in this
  session — do the tasks in that step one at a time instead, still each in
  its own worktree. Isolation matters more than simultaneity; simultaneity is
  a bonus if the runtime supports it cleanly.

## Step 0 — Scaffold (directly on `main`, no worktree)

Create the following files exactly as specified, then commit them as
`chore: bootstrap agents, hooks, scaffold`.

`.claude/agents/schema-engineer.md`
```yaml
---
name: schema-engineer
description: Owns Supabase schema and migrations for Person/Memory/Edge. Use for any database schema change or migration file.
tools: Read, Write, Bash
model: sonnet
---
You own supabase/migrations/ only. Never touch apps/ or supabase/functions/.
Every table gets an RLS policy scoped to auth.uid() — no exceptions. Migrations
must be idempotent and reversible. One migration file per table unless told
otherwise. When a task doesn't specify a policy, ask rather than assume it's
handled elsewhere.
```

`.claude/agents/backend-engineer.md`
```yaml
---
name: backend-engineer
description: Owns Supabase edge functions - Claude API calls, transcription, and Voyage embedding calls. Use for any backend/API logic.
tools: Read, Write, Edit, Bash
model: sonnet
---
You own supabase/functions/ only. Never touch apps/mobile or supabase/migrations.
Define every Claude tool-use schema explicitly and validate responses against
it. Read user identity from the verified auth token, never a client-supplied
field. Document each function's request/response contract in its own README.
```

`.claude/agents/client-engineer.md`
```yaml
---
name: client-engineer
description: Owns the React Native (Expo) mobile app. Use for any UI/client work.
tools: Read, Write, Edit, Bash
model: sonnet
---
You own apps/mobile/ only. Build against the contract documented in each
supabase/functions/*/README — read-only reference, never edit those files.
No CRM language in copy: no "pipeline," "stage," "score," "deal." If a
contract isn't finalized yet, build against a mocked response matching the
documented shape rather than blocking.
```

`.claude/agents/reviewer.md`
```yaml
---
name: reviewer
description: Read-only review of any diff before merge. Use after backend-engineer or client-engineer produce a change.
tools: Read, Grep, Glob, Bash
model: sonnet
---
You never write or edit files. Check: the change matches its documented API
contract, no CRM-shaped language in user-facing copy, the change stays inside
its owning subagent's directory. Report blocking vs. non-blocking findings.
```

`.claude/agents/rls-auditor.md`
```yaml
---
name: rls-auditor
description: Read-only security review of database migrations. Verifies every table has an RLS policy scoped to auth.uid(). Use after schema-engineer produces or modifies a migration, before merge.
tools: Read, Grep, Glob
model: sonnet
---
You never write or edit files. For every table in the migration diff, confirm
an RLS policy exists and is scoped to auth.uid() on select/insert/update/
delete. Flag any missing policy as blocking. Report findings as a short list.
```

`.claude/settings.json`
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [{ "type": "command", "command": "./.claude/hooks/guard-paths.sh" }]
      }
    ],
    "SubagentStop": [
      {
        "hooks": [{ "type": "command", "command": "./.claude/hooks/post-subagent-check.sh" }]
      }
    ]
  }
}
```

Create `.claude/hooks/guard-paths.sh` and `.claude/hooks/post-subagent-check.sh`
as executable scripts: the first blocks writes to `supabase/migrations/` or
`.claude/` unless the active task is explicitly a schema task; the second runs
`git diff --name-only` after a subagent finishes and runs the matching gate —
`tsc --noEmit` for `apps/mobile` changes, the edge functions' type check for
`supabase/functions` changes, a migration lint/dry-run for `supabase/migrations`
changes — exiting non-zero on failure. Verify the current hook payload format
against Claude Code's docs while writing these; the exact stdin JSON fields may
have changed since this runbook was written.

Also create empty `supabase/migrations/`, `supabase/functions/`, `apps/mobile/`
directories (with `.gitkeep` if needed) and a `CLAUDE.md` at the repo root that
briefly states the project and points at `docs/build-plan.md`.

## Step 1 — Wave 1 (parallel): base schema tables + backend skeletons

Create three worktrees:

1. `schema-persons` (branch `schema/persons`) — invoke `schema-engineer`:
   "Create the persons table migration: id, user_id, name, attributes jsonb,
   created_at. RLS scoped to auth.uid()."
2. `schema-memories` (branch `schema/memories`) — invoke `schema-engineer`:
   "Create the memories table migration: id, user_id, text, embedding
   vector(1024), created_at. RLS scoped to auth.uid()."
3. `backend-skeletons` (branch `backend/function-skeletons`) — invoke
   `backend-engineer`: "Create route skeletons for the capture, retrieval, and
   graph-query edge functions — typed request/response contracts and a README
   per function, empty handlers. No implementation yet."

Run the three subagent tasks concurrently if the session supports it;
otherwise one at a time. When each finishes: the `SubagentStop` hook runs
automatically. Then invoke `rls-auditor` against the two schema worktrees'
diffs, and `reviewer` against `backend-skeletons`. On a clean pass, squash-merge
each branch into `main` and remove its worktree. On a blocking finding, hand it
back to the owning subagent inside its worktree before merging.

## Step 2 — Wave 2 (parallel): dependent schema tables

Off the now-updated `main`:

1. `schema-memory-person` (branch `schema/memory-person`) — `schema-engineer`:
   "Create the memory_person join table migration (memory_id, person_id,
   composite primary key) with RLS."
2. `schema-edges` (branch `schema/edges`) — `schema-engineer`: "Create the
   edges table migration: id, user_id, person_a_id, person_b_id, story text,
   created_at. RLS scoped to auth.uid()."

Same gate → merge → worktree cleanup pattern as Step 1, `rls-auditor` on both.

## Step 3 — M2 / M2b (parallel): capture backend + client scaffold

1. `backend-capture` (branch `backend/capture-endpoint`) — `backend-engineer`:
   implement the capture draft+match endpoint (transcription call, Claude tool
   call for draft memory + person match) against the now-real schema.
2. `client-scaffold` (branch `client/app-scaffold`) — `client-engineer`: Expo
   project init, navigation, auth screen, built against `backend-skeletons`'
   documented contract with mocked responses.

`reviewer` gate on both, merge, clean up.

## Step 4 — M3: wire client to backend (sequential, single worktree)

`client-capture-wire` (branch `client/capture-wire`) — `client-engineer`:
connect the capture screen to the real backend endpoint. `reviewer` gate, merge.
Then run a full `reviewer` pass on the merged capture flow end-to-end directly
against `main` — no worktree needed for a review-only pass.

## Step 5 — M4 / M4b (parallel): retrieval

1. `backend-retrieval` (branch `backend/retrieval-endpoint`) —
   `backend-engineer`: Voyage embed + pgvector similarity search + Claude
   answer synthesis.
2. `client-search` (branch `client/search-screen`) — `client-engineer`: search
   screen wired to the retrieval endpoint.

`reviewer` gate, merge, clean up.

## Step 6 — M5 / M5b (parallel): graph-aware query

1. `backend-graph-query` (branch `backend/graph-query-endpoint`) —
   `backend-engineer`: person-graph traversal + semantic ranking merge +
   Claude answer synthesis.
2. `client-graph-query` (branch `client/graph-query-screen`) —
   `client-engineer`: "who connects me to X" screen.

`reviewer` gate, merge, clean up.

## Step 7 — M6: final pass

`reviewer` full pass against `main`. No worktree needed.

## If a "parallel" wave turns out not to be independent

Stop rather than force a merge conflict. Do that wave's tasks sequentially in
one worktree instead. The wave split is a bet on the build plan's dependency
read being right — if `memory_person`'s foreign keys, or anything else, reach
further than expected, sequential and correct beats parallel and broken.
