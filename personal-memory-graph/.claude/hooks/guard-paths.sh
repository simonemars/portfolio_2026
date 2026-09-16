#!/usr/bin/env bash
# PreToolUse hook (matcher: Write|Edit).
#
# Blocks writes to .claude/ and supabase/migrations/ unless the current
# branch signals the task is actually scoped to touch them:
#   - .claude/*              only from the `main` branch (Step 0 bootstrap,
#                             or deliberate maintenance done directly by the
#                             orchestrating session — never from a worktree).
#   - supabase/migrations/*  only from a branch named `schema/<slug>`.
#
# Exit 0 = allow. Exit 2 = block (stderr is surfaced to the calling agent).
set -euo pipefail

payload="$(cat)"

file_path="$(printf '%s' "$payload" | jq -r '.tool_input.file_path // empty')"
cwd="$(printf '%s' "$payload" | jq -r '.cwd // empty')"

if [ -z "$file_path" ]; then
  exit 0
fi

if [ -n "$cwd" ]; then
  cd "$cwd"
fi

# Normalize to a repo-root-relative path so absolute and relative
# file_path values are handled the same way.
repo_root="$(git rev-parse --show-toplevel 2>/dev/null || printf '%s' "$cwd")"
rel_path="$file_path"
case "$file_path" in
  "$repo_root"/*)
    rel_path="${file_path#"$repo_root"/}"
    ;;
esac

branch="$(git symbolic-ref --quiet --short HEAD 2>/dev/null)"
[ -z "$branch" ] && branch="unknown"

case "$rel_path" in
  .claude/*)
    if [ "$branch" != "main" ]; then
      echo "guard-paths: refusing to write '$rel_path' from branch '$branch'. .claude/ may only be edited from main (Step 0 / deliberate maintenance), never from a worktree branch." >&2
      exit 2
    fi
    ;;
  supabase/migrations/*)
    case "$branch" in
      schema/*) : ;;
      *)
        echo "guard-paths: refusing to write '$rel_path' from branch '$branch'. supabase/migrations/ may only be edited from a schema/<slug> branch." >&2
        exit 2
        ;;
    esac
    ;;
esac

exit 0
