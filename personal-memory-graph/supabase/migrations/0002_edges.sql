-- ============================================================================
-- Migration: 0002_edges.sql
-- Purpose:   Creates the `edges` table — the person-to-person graph that is
--            the core differentiator of the product. Every person is defined
--            partly by who else they're connected to, not just their relation
--            to the user. Each row is a directed edge (person_a_id ->
--            person_b_id) owned by a single auth.users account, carrying an
--            optional free-text `story` that captures the human context for
--            *how* the two people are connected — per the product principle
--            that the story is the primary object, not just a structured
--            field.
--
-- Design notes:
--
--   * Undirected meaning, directed storage. "A connects to B" and "B connects
--     to A" are the same real-world fact, but we deliberately store a single
--     directed row per edge rather than enforcing symmetry in the schema
--     (e.g. via a `check (person_a_id < person_b_id)` constraint or a trigger
--     that inserts/maintains a mirror row). Reasoning: at this stage we don't
--     yet know whether the app will want to attach direction-dependent
--     meaning to a/b (e.g. "introduced by" vs "introduced to") on top of the
--     undirected base case, and a DB-level ordering constraint would force
--     that decision prematurely and complicate every insert with a sort step.
--     Deduplication and any "is this the same edge, just reversed" logic is
--     left to the app layer for now. Revisit if duplicate/mirrored edges
--     become a real data-quality problem.
--
--   * `check (person_a_id <> person_b_id)` — a person should not have an edge
--     to themselves; this is unambiguous and cheap to enforce in the schema.
--
--   * Ownership defense-in-depth: RLS on `public.persons` already restricts
--     each user to selecting/mutating their own person rows, but a foreign
--     key only requires the referenced row to exist — it does not require
--     the caller to own it. Without an extra check, a user who learns (or
--     guesses) another user's person UUID could otherwise create an edge in
--     their own graph that references someone else's person row. Because
--     `edges` is a graph table where the whole point is connecting `persons`
--     rows, and because leaking structural information this way is a
--     meaningful concern (not just a theoretical one), we add explicit
--     ownership checks on person_a_id/person_b_id to the insert and update
--     policies rather than relying on the FK alone.
--
-- Idempotent: safe to re-run (guards on table creation, index creation, and
-- drop-then-create for policies since Postgres has no
-- `create policy if not exists`).
--
-- ROLLBACK (manual — Supabase migrations in this project are forward-only
-- files, no separate down-migration mechanism, so the rollback path is
-- documented here instead):
--   drop policy if exists "edges_select_own" on public.edges;
--   drop policy if exists "edges_insert_own" on public.edges;
--   drop policy if exists "edges_update_own" on public.edges;
--   drop policy if exists "edges_delete_own" on public.edges;
--   drop index if exists public.edges_person_a_id_idx;
--   drop index if exists public.edges_person_b_id_idx;
--   drop table if exists public.edges;
-- ============================================================================

create table if not exists public.edges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_a_id uuid not null references public.persons(id) on delete cascade,
  person_b_id uuid not null references public.persons(id) on delete cascade,
  story text,
  created_at timestamptz not null default now(),
  constraint edges_no_self_loop check (person_a_id <> person_b_id)
);

-- Row Level Security: every row is scoped to its owning user, no exceptions.
alter table public.edges enable row level security;

drop policy if exists "edges_select_own" on public.edges;
create policy "edges_select_own"
  on public.edges
  for select
  using (auth.uid() = user_id);

-- Insert/update also verify that both endpoints are persons owned by the
-- caller (see "Ownership defense-in-depth" above) — the edge row itself
-- being owned by auth.uid() is not sufficient to guarantee that, since a
-- foreign key alone doesn't check ownership of the referenced row.
drop policy if exists "edges_insert_own" on public.edges;
create policy "edges_insert_own"
  on public.edges
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.persons
      where persons.id = edges.person_a_id
        and persons.user_id = auth.uid()
    )
    and exists (
      select 1 from public.persons
      where persons.id = edges.person_b_id
        and persons.user_id = auth.uid()
    )
  );

drop policy if exists "edges_update_own" on public.edges;
create policy "edges_update_own"
  on public.edges
  for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.persons
      where persons.id = edges.person_a_id
        and persons.user_id = auth.uid()
    )
    and exists (
      select 1 from public.persons
      where persons.id = edges.person_b_id
        and persons.user_id = auth.uid()
    )
  );

drop policy if exists "edges_delete_own" on public.edges;
create policy "edges_delete_own"
  on public.edges
  for delete
  using (auth.uid() = user_id);

-- Lookup indexes for graph traversal ("who is this person connected to?"),
-- which will be the dominant query pattern against this table.
create index if not exists edges_person_a_id_idx on public.edges (person_a_id);
create index if not exists edges_person_b_id_idx on public.edges (person_b_id);
