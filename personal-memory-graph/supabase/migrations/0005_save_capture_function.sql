-- ============================================================================
-- Migration: 0005_save_capture_function.sql
-- Purpose:   The `capture` edge function only drafts and matches — it never
--            writes anything (see its own README). This function is the
--            actual persistence step: given a finalized memory text, its
--            precomputed embedding, and a finalized list of people to link
--            (existing ids and/or brand-new names), it atomically creates
--            any new `persons` rows, inserts the `memories` row, and links
--            them via `memory_person` — all in one function invocation, so a
--            caller never ends up with a half-saved memory (a memory with no
--            links, or new person rows with nothing pointing at them) if
--            something in the middle fails. Called from the future
--            `save-capture` edge function, which computes the embedding via
--            Voyage before calling this.
--
-- Security model — SECURITY INVOKER, same reasoning as `match_memories` in
-- 0004_match_memories_function.sql: this function runs with the CALLING
-- role's privileges, so every insert/select inside it is still subject to
-- the normal RLS policies on `persons`/`memories`/`memory_person`. This is
-- not just relied upon incidentally — it is the actual mechanism that stops
-- a caller from linking another user's person id (see below). Never change
-- this to SECURITY DEFINER without redesigning the ownership checks that
-- currently come for free from RLS.
--
-- How an existing `person_id` is validated: rather than a separate
-- `exists (... and user_id = auth.uid())` check, this function does a plain
-- `select name from public.persons where id = ...` under SECURITY INVOKER —
-- RLS's `persons_select_own` policy means that select simply returns no row
-- if the id belongs to someone else (or doesn't exist), which this function
-- treats as "not found" and raises an exception for. The ownership check is
-- RLS itself, not application logic re-deriving it.
--
-- `user_id` on every insert is set to `auth.uid()` directly in this
-- function, never taken as a parameter — the caller cannot assert whose
-- account a memory or person belongs to.
--
-- Idempotent: `create or replace function` is safe to re-run.
--
-- ROLLBACK (manual — this project's migrations are forward-only files, no
-- separate down-migration mechanism):
--   drop function if exists public.save_capture(text, vector(1024), jsonb);
-- ============================================================================

create or replace function public.save_capture(
  p_memory_text text,
  p_embedding vector(1024),
  -- jsonb array of {"name": text, "person_id": uuid-as-text or null/absent}.
  -- person_id present + non-null = link to that existing person (ownership
  -- verified via RLS, see above). person_id absent/null = create a new
  -- person with this name, then link to it. May be an empty array — a
  -- memory can be saved with no linked people.
  p_persons jsonb
)
returns table (
  memory_id uuid,
  person_id uuid,
  person_name text
)
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  v_memory_id uuid;
  v_person jsonb;
  v_person_id uuid;
  v_person_name text;
  v_person_count int;
begin
  if p_memory_text is null or length(trim(p_memory_text)) = 0 then
    raise exception 'p_memory_text must be non-empty';
  end if;

  insert into public.memories (user_id, text, embedding)
  values (auth.uid(), p_memory_text, p_embedding)
  returning id into v_memory_id;

  v_person_count := coalesce(jsonb_array_length(p_persons), 0);

  for v_person in select * from jsonb_array_elements(p_persons)
  loop
    if (v_person ? 'person_id') and (v_person->>'person_id') is not null then
      v_person_id := (v_person->>'person_id')::uuid;

      -- RLS-scoped select: returns no row (not an error) if this id
      -- belongs to another user or doesn't exist, which we treat below as
      -- "not found" — this IS the ownership check, not a formality on top
      -- of one.
      select name into v_person_name
      from public.persons
      where id = v_person_id;

      if v_person_name is null then
        raise exception 'person_id % not found or not accessible to caller', v_person_id;
      end if;
    else
      if (v_person->>'name') is null or length(trim(v_person->>'name')) = 0 then
        raise exception 'a person entry without person_id must have a non-empty name';
      end if;

      insert into public.persons (user_id, name, attributes)
      values (auth.uid(), v_person->>'name', '{}'::jsonb)
      returning id, name into v_person_id, v_person_name;
    end if;

    insert into public.memory_person (memory_id, person_id)
    values (v_memory_id, v_person_id);

    memory_id := v_memory_id;
    person_id := v_person_id;
    person_name := v_person_name;
    return next;
  end loop;

  -- A memory with zero linked people is allowed (e.g. a personal note not
  -- about anyone specific) — still return a row so the caller can see the
  -- created memory_id even when no persons were linked.
  if v_person_count = 0 then
    memory_id := v_memory_id;
    person_id := null;
    person_name := null;
    return next;
  end if;
end;
$$;
