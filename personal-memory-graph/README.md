# Personal Memory Graph

A personal (not business) memory tool: the graph of people I actually know,
plus the stories behind them, captured with near-zero friction and
retrievable by meaning rather than by a tag I remembered to set at the time.

Capture happens by voice, in a Telegram chat. Retrieval happens by asking
that same chat a plain-language question. A small read-only website lets me
browse the graph itself — people, their memories, and how they connect to
each other.

## Why I built this

I meet a lot of people — through work, friendships, family — and the detail
that makes each relationship feel real doesn't survive past a few hundred
people. Not from indifference; memory just doesn't scale. I looked at the
existing tools for "remembering people" and none of them fit:

- **CRM-shaped tools** (Dex, Clay, Folk, Cloze, LeadDelta, Monica) turn
  people into records to enrich toward some transaction — pipelines, stages,
  scores. That's the wrong shape entirely for people I'm not selling
  anything to, and it reads as faintly dystopian applied to family and
  friends.
- **Note-taking / voice-capture tools** (Obsidian plugins and similar) will
  happily store the detail, but never turn the *network between people* —
  and the story behind each connection — into something searchable and
  walkable later. Everything degrades into a pile of text you can `Cmd-F`
  if you remember the right word.

So the actual design bet here is narrow and specific:

- A **story** is the primary object, not a form field — company/title/city
  support the story, they never replace it.
- Every person is partly defined by **who else they're connected to**, not
  only by their relation to me — an explicit graph, not just a contacts
  list.
- **Capture has to happen standing up** — in a café, right after a
  conversation — so it's voice-first and friction-free, or it won't survive
  past week one.
- **Retrieval is by meaning**, in plain language, not by a tag I set months
  ago and have long since forgotten existed.
- It can **never read as a CRM** — no stage, no deal, no lead score,
  anywhere in the product. Everyone written about here is a real,
  non-consenting subject of someone else's notes on them; the content reads
  closer to a diary than a sales note, and the product has to respect that.

The full problem framing lives in [`docs/build-plan.md`](docs/build-plan.md);
the pivot from an original mobile-app plan to Telegram + a browse-only
website is in
[`docs/telegram-website-plan-delta.md`](docs/telegram-website-plan-delta.md).

## What it does today

- **Capture, by voice, in Telegram.** Send the bot a voice note (or text);
  it transcribes it, drafts a clean memory, and proposes who it's about —
  matched against people you already know, or proposed as new. You confirm
  or discard with an inline button; nothing is saved until you say so.
- **Correcting a draft is a reply, not a form.** Swipe-reply to the bot's
  draft with "his job is urban planning, not architecture" and it applies
  that correction to the existing draft rather than treating your reply as
  a full replacement.
- **Ask it things, in the same chat.** "Who did I meet at the climbing gym?"
  embeds your question, does a pgvector similarity search over your own
  memories, and synthesizes a direct answer grounded in what it found —
  not just a list of matching snippets.
- **"Who connects me to Dana?"** walks the person-to-person graph for
  one-hop intermediaries and answers in plain language ("You know Sam, who
  knows Dana"), instead of a contacts search.
- **A read-only website** to browse the graph itself: a searchable people
  list, a person detail page (their memories + who they're connected to),
  and a force-directed graph visualization of the whole network — with a
  light/dark theme.

What it deliberately doesn't do: multi-hop graph traversal (2+
intermediaries), multi-user support, or any create/edit/delete UI on the
website. All out of scope by design, not by ran-out-of-time — see
[Scope & limitations](#scope--limitations).

## How it's built

**Stack:** Supabase (Postgres + pgvector, Auth, Edge Functions) for the
backend and data; Claude (tool use / structured outputs) for drafting,
intent classification, and answer synthesis; Voyage AI for memory
embeddings; OpenAI Whisper for voice transcription; a Telegram bot as the
capture/ask surface; a Vite + React + TypeScript SPA as the browse-only
viewer.

```
Telegram (voice/text) ──▶ telegram-webhook ──▶ capture / retrieve / graph-query / save-capture
                                                        │
                                                        ▼
                                    Postgres (persons, memories + pgvector embedding,
                                              memory_person, edges) — RLS on auth.uid()
                                                        ▲
                                                        │
                              apps/web (Vite/React SPA) ── reads Supabase directly, same RLS
```

Each edge function's exact request/response contract is documented in its
own README — the source of truth is
[`supabase/functions/capture`](supabase/functions/capture/README.md),
[`retrieve`](supabase/functions/retrieve/README.md),
[`graph-query`](supabase/functions/graph-query/README.md),
[`save-capture`](supabase/functions/save-capture/README.md), and
[`telegram-webhook`](supabase/functions/telegram-webhook/README.md) — not
this file.

### Process: building it with subagent-owned worktrees

This was a solo build, but I ran it with Claude Code as a small team, not a
single agent making every kind of change. Five subagents
([`.claude/agents/`](.claude/agents/)) each own one slice of the repo —
`schema-engineer` (`supabase/migrations/` only), `backend-engineer`
(`supabase/functions/` only), `client-engineer` (`apps/web/` only), plus two
read-only gatekeepers, `rls-auditor` and `reviewer`, that never write code.
Each unit of work happened in its own `git worktree` on a `<role>/<slug>`
branch, so parallel changes never collided in one working directory, and
nothing landed on `main` without its gate passing — `rls-auditor` on every
migration (every table needs an RLS policy scoped to `auth.uid()`, no
exceptions), `reviewer` on every function/client change. The full sequence —
which waves ran in parallel, what each one built, in what order — is in
[`worktree-build-runbook.md`](worktree-build-runbook.md).

Two of the guardrails are enforced by hooks, not by asking nicely:
[`guard-paths.sh`](.claude/hooks/guard-paths.sh) blocks a write to
`supabase/migrations/` or `.claude/` unless the branch is actually scoped
for it, and [`post-subagent-check.sh`](.claude/hooks/post-subagent-check.sh)
runs the matching type-check/lint gate automatically whenever a subagent
finishes touching a given area — a change fails closed if its gate fails,
rather than relying on remembering to run it.

About two-thirds of the way through the build, the plan changed: the
original design was a React Native mobile app, and I pivoted it to a
Telegram bot for capture/ask plus a read-only website for browsing — a
genuinely smaller surface (no app-store distribution, no RN styling, no
client-side search UI) that fit the actual daily-use pattern better than a
dedicated app did. That decision, and exactly what it changed in the
build plan, subagent scopes, and milestone sequence, is recorded rather than
silently overwritten — see
[`docs/telegram-website-plan-delta.md`](docs/telegram-website-plan-delta.md).

## Results

32 commits took this from an empty repo to a working system: schema with
RLS on every table, all five edge functions implemented against their
documented contracts, a Telegram bot handling the full
transcribe → draft → confirm/correct → save loop plus natural-language
ask/graph-query, and a themed web viewer with a people list, person detail
pages, and a force-directed graph view. Every table has `user_id` scoped
RLS; every edge function derives the caller's identity from a verified
Supabase auth token rather than trusting a client-supplied field — including
`telegram-webhook`, which has no Supabase session to receive from Telegram
and instead logs in as the single app owner itself so the same
per-user RLS model keeps applying unmodified (see that function's own
[README](supabase/functions/telegram-webhook/README.md) for the full auth
model). It's been running as my actual capture habit since the Telegram
pivot, which was the real bar for success — not a demo, a tool I keep using.

## Setup

This is genuinely runnable by someone else — you'll need your own Supabase
project, and API keys for Claude, Voyage AI, OpenAI, and a Telegram bot.

### 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Run the migrations in [`supabase/migrations/`](supabase/migrations/), in
   filename order, via the SQL editor or the Supabase CLI
   (`supabase db push`). They create `persons`, `memories` (with a
   `vector(1024)` embedding column), `memory_person`, `edges`, and the
   `match_memories` / `save_capture` RPC functions — every table with RLS
   scoped to `auth.uid()`.
3. Enable email auth (magic link / OTP) in Authentication → Providers.
4. Create one real user for yourself — this is a single-user app by design.

### 2. Edge functions

Deploy everything under [`supabase/functions/`](supabase/functions/) with
the Supabase CLI:

```bash
supabase functions deploy capture retrieve graph-query save-capture telegram-webhook
```

Set these as function secrets (`supabase secrets set KEY=value`, or via the
dashboard):

| Variable | Used by | Purpose |
|---|---|---|
| `ANTHROPIC_KEY` | capture, graph-query, telegram-webhook | Claude API — drafting, target resolution, intent classification, answer synthesis |
| `VOYAGE_AI_KEY` | retrieve, save-capture | Voyage AI — memory/query embeddings |
| `OPEN_AI_KEY` | telegram-webhook | Whisper transcription of Telegram voice notes |
| `TOKEN_TELEGRAM_BOT` | telegram-webhook | Telegram Bot API token |
| `TELEGRAM_WEBHOOK_SECRET` | telegram-webhook | Shared secret Telegram echoes back on every webhook call; the function's primary auth boundary |
| `TELEGRAM_ALLOWED_USER_ID` | telegram-webhook | *(optional)* Telegram numeric user id allowlist — defense in depth |
| `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` | telegram-webhook | The app owner's own Supabase login — the webhook signs in as this single user so RLS keeps applying normally (see the function's README) |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | all functions | Auto-injected by Supabase — no action needed |

### 3. Telegram bot

1. Create a bot with [@BotFather](https://t.me/BotFather); note its token
   (→ `TOKEN_TELEGRAM_BOT`).
2. Register the webhook, including the secret token:
   ```bash
   curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
     -d "url=https://<project-ref>.functions.supabase.co/telegram-webhook" \
     -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
   ```
3. Message the bot — a voice note starts a capture, a text question hits
   retrieve or graph-query depending on what you ask.

### 4. Web viewer

```bash
cd apps/web
cp .env.example .env.local   # fill in VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY
npm install
npm run dev
```

`npm run build` produces a static SPA — [`vercel.json`](apps/web/vercel.json)
is already set up for a client-side-routed deploy on Vercel; any static host
works as long as it rewrites unknown paths to `index.html`.

## Scope & limitations

- **Single user, by design.** There's no multi-tenant product model here —
  one Supabase Auth user, one graph. Multi-user was explicitly deferred in
  the original problem framing, not an oversight.
- **One-hop graph queries only.** "Who connects me to X" reports direct
  intermediaries, not longer chains — see
  [`graph-query`'s README](supabase/functions/graph-query/README.md) for
  the reasoning.
- **Browse-only website.** No create/edit/delete UI, no search box, no ask
  feature on the site — all capture and retrieval happens through Telegram
  by design; see the [pivot doc](docs/telegram-website-plan-delta.md).
- **No Obsidian import yet.** The original problem framing calls out years
  of existing notes in Obsidian as a real migration need; that importer
  was never built.

## Repo layout

```
personal-memory-graph/
├── supabase/
│   ├── migrations/         # schema: persons, memories, memory_person, edges, RPCs — RLS everywhere
│   └── functions/          # capture, retrieve, graph-query, save-capture, telegram-webhook
├── apps/web/                # browse-only SPA: people list, person detail, graph view
├── docs/
│   ├── build-plan.md                    # problem framing, constraints, phased priorities
│   └── telegram-website-plan-delta.md   # the mobile-app → Telegram/website pivot
├── .claude/agents/           # the five subagents this was built with
├── .claude/hooks/            # path-ownership + gate enforcement
└── worktree-build-runbook.md # the exact build sequence, wave by wave
```
