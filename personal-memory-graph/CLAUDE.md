# Personal Memory Graph

A personal (not business) memory tool: the graph of people Simo actually
knows, plus the stories behind them, captured with near-zero friction and
retrievable by meaning rather than by a tag someone remembered to set. It
must never read as a CRM — no pipeline, stage, score, or deal language
anywhere in the product.

Full problem framing, constraints, and phased priorities: [docs/build-plan.md](docs/build-plan.md).
Telegram + browse-only-website pivot (supersedes the mobile-app sections of
the above): [docs/telegram-website-plan-delta.md](docs/telegram-website-plan-delta.md).

## Working in this repo

- Never commit directly to `main`, except the Step 0 bootstrap and other
  deliberate, explicitly-approved maintenance. Every other change lands via
  a git worktree branch (`<role>/<slug>`), passes its gate, then merges.
- Ownership boundaries between `supabase/migrations/`, `supabase/functions/`,
  and `apps/web/` are enforced by the subagents in `.claude/agents/` and
  by `.claude/hooks/guard-paths.sh`. Don't cross them.
- The full execution sequence — waves, gates, merge order — lives in
  `worktree-build-runbook.md` at the repo root.
