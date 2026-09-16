-- Migration: 0002_memory_person.sql
-- Purpose: create the `memory_person` join table, linking a memory to the person/people it
-- mentions. A memory can mention multiple people; a person can appear in multiple memories.
-- This is a pure many-to-many association with no attributes of its own.
--
-- Ownership note: unlike `persons` and `memories`, this table has no direct `user_id` column —
-- it links two rows that are each already owned by a user via their own `user_id`. Ownership of
-- a join row is therefore *inherited*, not stored, and RLS is scoped accordingly: a row is only
-- visible/writable when the calling user owns *both* the referenced memory and the referenced
-- person (verified via EXISTS subqueries against `public.memories` and `public.persons`, each of
-- which already enforces `auth.uid() = user_id` via its own RLS). This was called out explicitly
-- as a case to get confirmation on rather than assume — both sides must be owned by the caller,
-- no exceptions.
--
-- Idempotent: safe to re-run (guards on table creation, drop-then-create for policies since
-- Postgres has no `create policy if not exists`).
--
-- ROLLBACK (manual — Supabase migrations in this project are forward-only files, no separate
-- down-migration mechanism, so the rollback path is documented here instead):
--   drop policy if exists "memory_person_select_own" on public.memory_person;
--   drop policy if exists "memory_person_insert_own" on public.memory_person;
--   drop policy if exists "memory_person_update_own" on public.memory_person;
--   drop policy if exists "memory_person_delete_own" on public.memory_person;
--   drop table if exists public.memory_person;

create table if not exists public.memory_person (
  memory_id uuid not null references public.memories(id) on delete cascade,
  person_id uuid not null references public.persons(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (memory_id, person_id)
);

-- Row Level Security: every row is scoped to its owning user, no exceptions — even though
-- ownership here is inherited rather than stored directly on this table.
alter table public.memory_person enable row level security;

-- select: visible only when the caller owns both the referenced memory and the referenced
-- person.
drop policy if exists "memory_person_select_own" on public.memory_person;
create policy "memory_person_select_own"
  on public.memory_person
  for select
  using (
    exists (
      select 1 from public.memories m
      where m.id = memory_id and m.user_id = auth.uid()
    )
    and exists (
      select 1 from public.persons p
      where p.id = person_id and p.user_id = auth.uid()
    )
  );

-- insert: only allowed when the caller owns both the memory and the person being linked.
drop policy if exists "memory_person_insert_own" on public.memory_person;
create policy "memory_person_insert_own"
  on public.memory_person
  for insert
  with check (
    exists (
      select 1 from public.memories m
      where m.id = memory_id and m.user_id = auth.uid()
    )
    and exists (
      select 1 from public.persons p
      where p.id = person_id and p.user_id = auth.uid()
    )
  );

-- update: included for consistency with the other tables even though this join table has no
-- mutable attributes of its own (only the composite PK columns exist besides `created_at`, and
-- changing either FK is equivalent to a delete+insert). Both the pre-update row and the
-- post-update row must satisfy the ownership check, so a caller can never update a row into or
-- out of another user's data.
drop policy if exists "memory_person_update_own" on public.memory_person;
create policy "memory_person_update_own"
  on public.memory_person
  for update
  using (
    exists (
      select 1 from public.memories m
      where m.id = memory_id and m.user_id = auth.uid()
    )
    and exists (
      select 1 from public.persons p
      where p.id = person_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.memories m
      where m.id = memory_id and m.user_id = auth.uid()
    )
    and exists (
      select 1 from public.persons p
      where p.id = person_id and p.user_id = auth.uid()
    )
  );

-- delete: only allowed when the caller owns both the memory and the person referenced by the
-- row being deleted.
drop policy if exists "memory_person_delete_own" on public.memory_person;
create policy "memory_person_delete_own"
  on public.memory_person
  for delete
  using (
    exists (
      select 1 from public.memories m
      where m.id = memory_id and m.user_id = auth.uid()
    )
    and exists (
      select 1 from public.persons p
      where p.id = person_id and p.user_id = auth.uid()
    )
  );

-- Index to support the common "all people mentioned in this memory" -> "all memories for this
-- person" traversal direction (memory_id is already leftmost in the composite PK, so this index
-- covers lookups by person_id).
create index if not exists memory_person_person_id_idx
  on public.memory_person (person_id);
