# What changed: Telegram capture + browse-only website

This describes the delta against `personal-memory-graph-build-plan.md` and
`worktree-build-runbook.md`. It doesn't replace either — read it alongside
them; only the sections named below are affected.

## The shift, in one line

The React Native app is gone. Telegram becomes the capture surface and the
conversational-ask surface; a small website becomes a browse-only viewer for
the graph. The schema, and the retrieval/graph-query logic, are unchanged —
only who calls them, and how, changes.

## Removed

- `apps/mobile` — the entire React Native app. No capture screen, no search
  screen, no graph-query screen. None of it gets built.
- Website search/ask feature — decided browse-only for v1. No search box, no
  reuse of retrieval on the website for now.
- Every RN-specific milestone and worktree from the original docs: `M2b`
  (Expo scaffold), `M3`'s `client-capture-wire`, `M4b`'s `client-search`,
  `M5b`'s `client-graph-query`.

## Added

- **Telegram bot** as the capture surface (voice note in → transcribed →
  drafted → confirm/edit via inline buttons) and the ask surface (text
  question in → answered, via the existing retrieval/graph-query logic).
- **New backend function:** `telegram-webhook` — receives updates from
  Telegram, routes them (voice note → capture flow; text → retrieval or
  graph-query, decided by content), sends replies and inline buttons, handles
  the button callback that actually saves a memory.
- **`apps/web`** — a small website, browse-only. Two views: a people list
  (searchable by name) and a person detail page showing their memories and
  their edges to other people. No force-directed graph rendering yet — that
  stays a clean v2 add-on later, the `edges` table already carries everything
  it would need.

## Changed

- **`client-engineer`'s scope**: `apps/mobile` → `apps/web`. Its job changes
  from "build a mobile app" to "build two read-only pages." Updated
  definition below.
- **Website data access**: reads Supabase directly from the client, using the
  user's session and existing RLS policies (`user_id = auth.uid()`) — no new
  backend endpoints needed just to browse. This is a real simplification, not
  a shortcut: `backend-engineer` has less surface area, not more.
- **Retrieval and graph-query endpoints**: logic is unchanged from the
  original plan. What changes is who calls them — `telegram-webhook` instead
  of a client screen. Keep them as their own functions rather than folding
  their logic into the webhook handler; if a search feature ever gets added
  to the website later, it calls the same functions Telegram already uses.

## Updated subagent definition

Replace `.claude/agents/client-engineer.md` with:

```yaml
---
name: client-engineer
description: Owns the read-only web viewer for the graph - a people list and person detail pages. Use for any UI/client work.
tools: Read, Write, Edit, Bash
model: sonnet
---
You own apps/web/ only. Two views: a people list (search by name) and a
person detail page showing their memories and their edges to other people.
Read-only — no create, edit, or delete UI. Query Supabase directly using the
authenticated session; rely on existing RLS, don't add app-level filtering
that duplicates it. No CRM language in copy. No search box, no ask feature —
that's explicitly out of scope for this version.
```

`schema-engineer`, `reviewer`, and `rls-auditor` are unaffected. Add nothing
new for them.

## Updated milestone table

| Milestone | Work | Agent(s) | Parallel with |
|---|---|---|---|
| M1 / M1b | Unchanged | schema-engineer / backend-engineer | — |
| M2 | Capture logic: Claude tool call + STT (unchanged internals) | backend-engineer | M2b |
| M2b | ~~Expo scaffold~~ → Next.js/Vite scaffold, Supabase magic-link auth, basic layout | client-engineer | M2 |
| M3 | ~~Wire RN screen to backend~~ → build `telegram-webhook`: register bot, wire voice-note capture flow, confirm/edit buttons, save callback | backend-engineer | — |
| M3r | Reviewer pass on the capture flow — now tested by messaging the bot directly | reviewer | — |
| M4 | Retrieval: Voyage embed + pgvector + Claude synthesis (unchanged internals) | backend-engineer | M4c |
| ~~M4b~~ | *(removed — no website search)* | — | — |
| M4c | People list + person detail pages | client-engineer | M4 |
| M5 | Graph-query logic (unchanged internals) + extend `telegram-webhook`'s router to call it for "who connects me to X"-style questions | backend-engineer | — |
| ~~M5b~~ | *(removed — no website graph-query screen)* | — | — |
| M6 | Final reviewer pass — surfaces to test are now Telegram + website | reviewer | — |

## Updated worktree waves

From `worktree-build-runbook.md`: Steps 0–2 (scaffold, schema wave 1 and 2)
are unaffected — run them as written. From Step 3 on:

- **Step 3** — `backend-capture` unchanged. `client-scaffold` becomes: build
  the Next.js/Vite web app, Supabase auth, no RN.
- **Step 4** — replace `client-capture-wire` with `backend-telegram-webhook`
  (branch `backend/telegram-webhook`): bot registration, voice-note handling,
  confirm/edit buttons, save callback. Still `backend-engineer`, still gated
  by `reviewer` before merge. No client-side worktree in this step at all.
- **Step 5** — `backend-retrieval` unchanged. Replace `client-search` with
  `client-web-views` (branch `client/web-views`): people list + person
  detail pages. Can run in parallel with `backend-retrieval` since it only
  needs schema, not the retrieval endpoint.
- **Step 6** — `backend-graph-query` unchanged, but its task description
  grows to include extending `telegram-webhook`'s router. Drop
  `client-graph-query` entirely — nothing to build there now.

## Net effect on scope

Smaller, not just different: no app-store distribution, no RN styling or
navigation work, no client-side search UI. What's added instead — a Telegram
bot registration and a webhook router — is genuinely less work than the app
it replaces.
