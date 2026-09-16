# apps/web

The Personal Memory Graph web client — a browse-only viewer for the graph of
people, their memories, and the edges between them. Not a CRM: no create,
edit, or delete UI, no search box, no "ask" feature.

Plain client-side SPA (Vite + React + TypeScript), deliberately not a
server-rendered framework — this avoids the class of "window is not defined"
bugs that come from Supabase/auth code running server-side.

## Current scope

This is the auth + routing shell only. It has:

- Supabase magic-link (email OTP) sign-in
- A session-gated layout that redirects to sign-in when there's no session
- A placeholder authenticated home route

The two real views — a people list (searchable by name) and a person detail
page (memories + edges to other people) — are not built yet; they land in a
later worktree.

Every real data query, once the views exist, is expected to read Supabase
directly from the client using the authenticated session, scoped by the
existing `auth.uid()` RLS policies — no app-level filtering duplicating RLS,
and no new backend endpoints just to browse.

## Running it

```sh
npm install
npm run dev
```

## Environment variables

Copy `.env.example` to `.env.local` and fill in your Supabase project's
values (`.env.local` is gitignored):

- `VITE_SUPABASE_URL` — your Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — the publishable (anon) key, safe for
  client-side use — never the service-role secret
