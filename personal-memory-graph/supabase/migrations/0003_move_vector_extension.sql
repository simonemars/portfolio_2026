-- ============================================================================
-- Migration: 0003_move_vector_extension.sql
-- Purpose:   Resolves Supabase's "Extension in Public" security advisory
--            (extension_in_public / lint 0014). The `vector` extension was
--            installed in the `public` schema by 0001_memories.sql, which
--            Supabase flags as a WARN: installing extensions in `public`
--            pollutes that schema's namespace and increases the chance of
--            an extension-defined object colliding with app-defined ones.
--            The fix is to move it into a dedicated `extensions` schema.
--
-- Effect on existing objects: `alter extension ... set schema` relocates the
-- extension's member objects (the `vector` type, its operators, index access
-- methods) without dropping/recreating them. Postgres tracks column types
-- and indexes by OID, not by schema-qualified name, so `memories.embedding`
-- and the `memories_embedding_hnsw_idx` HNSW index keep working unchanged —
-- this statement touches only the extension's catalog namespace, no table
-- data or index data.
--
-- Idempotent: `create schema if not exists` is safe to re-run. Re-running
-- `alter extension vector set schema extensions` when it's already there is
-- also a no-op error-free statement in Postgres (it just re-confirms the
-- current schema) — but to be fully safe on re-run we guard with a DO block
-- that checks the extension's current schema first.
--
-- ROLLBACK (manual — this project's migrations are forward-only files, no
-- separate down-migration mechanism):
--   alter extension vector set schema public;
--   -- (leaving the now-empty `extensions` schema in place is harmless; drop
--   -- it explicitly with `drop schema if exists extensions;` only if nothing
--   -- else has since been placed there)
-- ============================================================================

create schema if not exists extensions;

do $$
begin
  if exists (
    select 1
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'vector'
      and n.nspname <> 'extensions'
  ) then
    alter extension vector set schema extensions;
  end if;
end;
$$;
