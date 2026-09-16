-- ============================================================================
-- Migration: 0001_persons.sql
-- Purpose:   Creates the `persons` table for the personal memory graph app.
--            Each row is a person node owned by a single auth.users account,
--            with free-form attributes (company, city, etc.) stored in a
--            jsonb column rather than as dedicated columns.
--
-- Rollback (manual):
--   Supabase migrations in this project are forward-only files; there is no
--   separate down-migration mechanism. To reverse this migration, run the
--   following statements manually:
--
--     drop policy if exists "persons_select_own" on public.persons;
--     drop policy if exists "persons_insert_own" on public.persons;
--     drop policy if exists "persons_update_own" on public.persons;
--     drop policy if exists "persons_delete_own" on public.persons;
--     drop table if exists public.persons;
--
-- ============================================================================

create table if not exists public.persons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security. No exceptions: every table gets RLS.
alter table public.persons enable row level security;

-- Policies scoped to auth.uid() = user_id, covering select/insert/update/delete.
-- Each policy is dropped and recreated so the migration is safe to re-run.

drop policy if exists "persons_select_own" on public.persons;
create policy "persons_select_own"
  on public.persons
  for select
  using (auth.uid() = user_id);

drop policy if exists "persons_insert_own" on public.persons;
create policy "persons_insert_own"
  on public.persons
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "persons_update_own" on public.persons;
create policy "persons_update_own"
  on public.persons
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "persons_delete_own" on public.persons;
create policy "persons_delete_own"
  on public.persons
  for delete
  using (auth.uid() = user_id);
