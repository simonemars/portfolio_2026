#!/usr/bin/env bash
# SubagentStop hook.
#
# The payload gives us the session's cwd but no subagent-scoped diff, so we
# infer "what changed" from git directly: everything on this branch since it
# diverged from main, plus any uncommitted/untracked work still sitting in
# the worktree. Whichever owned directories show up decide which gate(s) run.
#
# A gate only runs if its tooling/project actually exists yet (early Step 0/1
# work predates most of these) — that's a skip, not a pass. A gate that runs
# and fails exits 2, which is the only code the SubagentStop hook treats as
# blocking.
set -uo pipefail

payload="$(cat)"
cwd="$(printf '%s' "$payload" | jq -r '.cwd // empty')"
[ -n "$cwd" ] && cd "$cwd"

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$repo_root"

merge_base="$(git merge-base main HEAD 2>/dev/null || true)"
{
  [ -n "$merge_base" ] && git diff --name-only "$merge_base" HEAD --
  git diff --name-only HEAD --
  git status --porcelain --untracked-files=all | awk '{print $2}'
} 2>/dev/null | sort -u >/tmp/post-subagent-check.$$.files

files_file="/tmp/post-subagent-check.$$.files"
trap 'rm -f "$files_file"' EXIT

touched() { grep -q "^$1" "$files_file"; }

status=0
ran_any=0

if touched "apps/mobile/"; then
  if [ -f apps/mobile/package.json ] && [ -f apps/mobile/tsconfig.json ]; then
    ran_any=1
    echo "post-subagent-check: apps/mobile changed — running tsc --noEmit" >&2
    if ! (cd apps/mobile && npx --no-install tsc --noEmit); then
      echo "post-subagent-check: tsc failed in apps/mobile" >&2
      status=2
    fi
  else
    echo "post-subagent-check: apps/mobile changed but no package.json/tsconfig.json yet — skipping tsc gate" >&2
  fi
fi

if touched "supabase/functions/"; then
  if command -v deno >/dev/null 2>&1; then
    ran_any=1
    echo "post-subagent-check: supabase/functions changed — running deno check" >&2
    ts_files="$(grep '^supabase/functions/.*\.ts$' "$files_file" || true)"
    if [ -n "$ts_files" ]; then
      if ! deno check $ts_files; then
        echo "post-subagent-check: deno check failed in supabase/functions" >&2
        status=2
      fi
    fi
  else
    echo "post-subagent-check: supabase/functions changed but deno is not installed — skipping type-check gate" >&2
  fi
fi

if touched "supabase/migrations/"; then
  if command -v supabase >/dev/null 2>&1 && [ -f supabase/config.toml ]; then
    ran_any=1
    echo "post-subagent-check: supabase/migrations changed — running supabase db lint" >&2
    if ! supabase db lint --local; then
      echo "post-subagent-check: supabase db lint failed" >&2
      status=2
    fi
  else
    echo "post-subagent-check: supabase/migrations changed but no linked/local supabase project yet — skipping migration lint gate" >&2
  fi
fi

if [ "$ran_any" -eq 0 ] && [ "$status" -eq 0 ]; then
  echo "post-subagent-check: no owned-directory gate applicable (nothing changed there, or tooling not set up yet)" >&2
fi

exit "$status"
