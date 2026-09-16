-- ============================================================================
-- Migration: 0004_match_memories_function.sql
-- Purpose:   pgvector similarity search needs vector-distance ordering, which
--            has no first-class support in the Supabase JS query builder —
--            the standard pattern is a Postgres function called via `.rpc()`.
--            This defines that function for the `retrieve` edge function's
--            "search memories by meaning" feature.
--
-- Security model — SECURITY INVOKER is deliberate, not a default left alone:
--   This function runs with the CALLING role's privileges (the same anon-key
--   + caller's-JWT client every other query in this project uses), so it is
--   subject to the same RLS policies as a plain `select` on `memories` and
--   `memory_person` would be. A caller can only ever get matches against
--   their own rows — there is no need to (and this deliberately does not)
--   filter by user_id inside the function body, because RLS already does
--   that at the storage layer for the invoking role. If this were instead
--   declared SECURITY DEFINER, it would run with the function owner's
--   (elevated) privileges and bypass RLS entirely — that would be a
--   cross-user data leak. Never change this to SECURITY DEFINER without
--   adding an explicit `auth.uid()` filter to compensate.
--
-- Join shape: INNER JOIN memory_person, not LEFT JOIN. A memory not yet
-- linked to any person produces no rows here. This matches the `retrieve`
-- contract (supabase/functions/retrieve/README.md), where `personId` is a
-- required (non-nullable) field on every result — a memory result without
-- an associated person doesn't fit that shape. A memory can be linked to
-- multiple people; each linked person produces its own result row with the
-- same similarity score, which is intentional (matches the "personId +
-- memoryId together" grain the contract already documents).
--
-- Idempotent: `create or replace function` is safe to re-run.
--
-- ROLLBACK (manual — this project's migrations are forward-only files, no
-- separate down-migration mechanism):
--   drop function if exists public.match_memories(vector(1024), int);
-- ============================================================================

create or replace function public.match_memories(
  query_embedding vector(1024),
  match_count int default 10
)
returns table (
  memory_id uuid,
  person_id uuid,
  snippet text,
  similarity float
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    m.id as memory_id,
    mp.person_id,
    m.text as snippet,
    1 - (m.embedding <=> query_embedding) as similarity
  from public.memories m
  join public.memory_person mp on mp.memory_id = m.id
  where m.embedding is not null
  order by m.embedding <=> query_embedding
  limit greatest(match_count, 0);
$$;
