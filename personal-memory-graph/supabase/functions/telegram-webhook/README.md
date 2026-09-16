# `telegram-webhook`

The target of Telegram's Bot API webhook. This is both the capture surface
(voice note in → transcribed → drafted → confirm/edit via inline
buttons → saved) and the ask surface (text question in → routed to
`retrieve` or `graph-query`, answered) for this personal memory app. There is
exactly one real user (the app owner) — this is explicitly not a
multi-user product.

This function doesn't implement drafting, retrieval, graph traversal, or
persistence itself — it calls the four existing endpoints (`capture`,
`save-capture`, `retrieve`, `graph-query`) over HTTP and turns their
responses into Telegram messages.

## Auth model

This function's auth is genuinely different from every other function in
this repo, because its caller is Telegram's servers, not a client holding a
Supabase session. Two layers:

1. **Webhook secret token.** Telegram lets you register a `secret_token` on
   `setWebhook`, which it then sends back on every webhook POST as the
   header `X-Telegram-Bot-Api-Secret-Token`. This function compares that
   header against `TELEGRAM_WEBHOOK_SECRET`. A missing or mismatched header
   returns `401` immediately, before the body is even parsed — this is
   the one genuine non-200 response this function ever gives Telegram.
2. **Optional Telegram user allowlist**, defense in depth. If
   `TELEGRAM_ALLOWED_USER_ID` is set, the incoming update's sender id
   (`message.from.id` or `callback_query.from.id`) must match it (compared
   as strings, since Telegram ids are numbers and env vars are strings) or
   the update is silently ignored — logged via `console.log`, but still
   answered `200 { ok: true }`, so a disallowed sender learns nothing about
   whether the allowlist even exists. **If `TELEGRAM_ALLOWED_USER_ID` is
   unset, this check is skipped entirely.** That's a documented v1
   tradeoff: the webhook secret alone is the security boundary until this
   is set.

Every other function in this repo (`capture`, `save-capture`, `retrieve`,
`graph-query`) verifies a client-supplied Supabase auth JWT via
`_shared/auth.ts`'s `getVerifiedCaller`. That helper is **not used here** —
Telegram never holds a Supabase session to send. Instead, this function logs
in as the single app owner itself (see below) and uses that session's token
to call the other four functions and to do its own direct table reads, so
their RLS-based ownership model keeps working completely unmodified: every
write and read this function triggers is genuinely scoped to the one real
user via a real per-user JWT, never a service-role bypass.

## Identity used to call the other four functions

`capture`, `save-capture`, `retrieve`, and `graph-query` require a real
Supabase Auth bearer token and derive the caller's identity from it — they
never accept a client-supplied user id. Since there's exactly one app user,
this webhook logs in as them via Supabase's password grant, using
`TEST_USER_EMAIL` / `TEST_USER_PASSWORD`. Those names are historical (used
during development testing), but they hold the app owner's real login for
their own single-user account — reused as-is here rather than inventing new
secret names.

A small in-memory session cache lives at module scope (a plain variable
outside the `Deno.serve` handler), which persists across warm invocations of
the same isolate. On each update: if there's no cached session, or the
cached access token is within 60 seconds of expiry, this function tries a
refresh-token grant first, falling back to a fresh password-grant login if
there's no cached session yet or the refresh fails. The resulting
`access_token` is used as `Authorization: Bearer <token>` both when calling
the other four functions and when doing this function's own direct
`persons` table reads (via a Supabase client configured the same way
`capture/index.ts` configures its own RLS-scoped client). Calls to the other
four functions also send an `apikey` header (Supabase edge functions expect
both headers, same as a browser client calling them would).

## Environment variables

| Variable | Purpose |
|---|---|
| `TOKEN_TELEGRAM_BOT` | Telegram Bot API token. Used for every `https://api.telegram.org/bot<token>/...` call and the matching `/file/bot<token>/...` file download. |
| `TELEGRAM_WEBHOOK_SECRET` | Expected value of the `X-Telegram-Bot-Api-Secret-Token` header (layer 1 auth). |
| `TELEGRAM_ALLOWED_USER_ID` | *(optional)* Telegram numeric user id allowed to use the bot (layer 2 auth, defense in depth). Unset = check skipped. |
| `OPEN_AI_KEY` | OpenAI API key, for Whisper transcription of voice notes. |
| `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` | The app owner's real Supabase login (historical names — see "Identity" above). Used for the password-grant login this function performs on their behalf. |
| `ANTHROPIC_KEY` | Claude API key, for the `classify_message` intent call. |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Auto-injected by Supabase into every edge function. Used both for this function's own password/refresh-token calls and for calling the other four edge functions and reading `persons` directly. |

## Message routing

On each incoming update, in order:

| # | Trigger | Behavior |
|---|---|---|
| 1 | `callback_query` present | Handle Save / Discard on a pending draft (see below). Always `answerCallbackQuery` at the end. |
| 2 | `message.voice` present | Transcribe via Whisper, then run the capture flow on the transcript. Transcription failure → plain error message, stop. |
| 3 | `message.text` present **and** `message.reply_to_message.text` contains the `[[DATA]]` marker | Edit-in-place: recover the previously-matched `persons` from the replied-to message, then apply the new message's text to the draft via a forced-tool-choice Claude call (`apply_correction`) rather than using it verbatim — see "Correction application" below. Does **not** re-call `capture`'s person-matching — just re-shows a fresh confirm message with the corrected text and the same persons. |
| 4 | `message.text` present, not a qualifying reply | Classify intent via a forced-tool-choice Claude call (`classify_message`, one of `capture` / `retrieve` / `graph_query`), then route: `capture` → capture flow; `retrieve` → call `retrieve`, look up person names, synthesize a direct answer to the actual question via `answer_question` (see "Answer synthesis" below), falling back to raw `Name — snippet` lines if synthesis fails, or "No matching memories found."; `graph_query` → call `graph-query`, reply one line per path's `description`, or "No connecting path found." Classification defaults to `capture` on any failure (network error, bad response shape) — the lowest-risk default, since capture never auto-saves, it only drafts. |

Anything that matches none of the above (a message with neither text nor
voice, or an update with neither `message` nor `callback_query`) is logged
and ignored.

The capture flow itself (used by both #2 and #4's `capture` branch) calls
`capture` with `rawText` set to the transcript or message text (no
`personHints`), then sends a confirm message with inline Save/Discard
buttons.

## State encoding: no new database table

The schema is unchanged for this pivot, and a full persistence layer for
"pending drafts" would need a new table just to bridge the gap between
drafting and confirming. Instead, this function encodes the pending draft's
state directly in the Telegram message text it sends, and recovers it later
from Telegram's own copy of that message
(`callback_query.message.text` or `message.reply_to_message.text`).
**Telegram is the state store; this function stays fully stateless.** This
is a deliberate simplification for a single-user bot with no concurrent
drafts to juggle server-side, not an oversight.

A confirm message looks like:

```
📝 Draft memory

{draft text}

About: {comma-joined person names, or "no one"}

To fix something: swipe on (or long-press → Reply to) this message, then say what to change — e.g. "his job is urban planning, not architecture."

[[DATA]]{"t":"...","p":[{"i":"<personId, omitted if new>","n":"<name>","w":<1 if new else 0>}, ...]}
```

with an inline keyboard offering ✅ Save / ❌ Discard. To recover state, this
function finds `[[DATA]]` in the message text and `JSON.parse`s everything
after it; a parse failure (message too old, tampered, or not actually one of
ours) produces a plain "Couldn't read that draft — please try again." reply
rather than throwing.

No Telegram `parse_mode` (Markdown/HTML) is ever used — every message this
function sends is plain text. This sidesteps entity-escaping complexity
entirely and keeps the state-encoding line simple and reliable to recover.

## Confirm / edit / save / discard flow

- **Save** (`callback_query.data === "save"`): recovers `{t, p}` from the
  tapped message's own text, maps `p` to `SaveCapturePersonInput[]` (new
  people → `{ name }` with no `personId` key at all; existing people →
  `{ personId, name }` — the same conditional-key-presence discipline
  `save-capture` itself documents and relies on), and calls `save-capture`
  with `{ memoryText: t, persons }`. On success, edits the original message
  to a confirmation ("✅ Saved. Linked to: ...", or "✅ Saved. Not linked to
  anyone.") and clears the inline keyboard (`reply_markup: { inline_keyboard: [] }`
  — required explicitly; omitting `reply_markup` on `editMessageText` leaves
  old buttons in place). On failure, answers the callback query with
  `show_alert: true` and a short error, and leaves the original
  message/buttons untouched so the user can retry.
- **Discard** (`callback_query.data === "discard"`): edits the message to
  "Discarded." and clears the keyboard. No downstream calls.
- Every `callback_query` is answered via `answerCallbackQuery` before this
  function finishes handling it, regardless of outcome — Telegram shows a
  loading spinner on the tapped button until that happens.
- **Edit-in-place**: see routing rule #3 above. This is how "editing" a
  draft works — there's no separate edit UI, the user replies to the bot's
  own draft message with either a short correction instruction or a full
  replacement memory, and `apply_correction` (below) figures out which.

## Answer synthesis

`retrieve` deliberately returns raw ranked snippets with no synthesized
answer (see its own README) — reasonable for a search-results list, but a
bad fit for a chat surface: two different questions matching the same
memory got back the *identical* reply regardless of what was actually
asked (e.g. "who did I meet at the gym?" and "what was Dana doing?" both
returned the whole memory verbatim). This function adds a synthesis step on
top, scoped to this function only — `retrieve`'s own contract is
deliberately left unchanged, since other future consumers of it may still
want raw ranked results. `runRetrieveFlow` builds `Name — snippet` lines
from `retrieve`'s results the same way as before, then sends those plus the
original question to a forced-tool-choice Claude call (`answer_question`)
asking for a direct, specific answer grounded only in those excerpts. If
synthesis fails for any reason, it falls back to the raw lines rather than
erroring — the underlying search results are still good even if this extra
step isn't available.

## Correction application

The original version of edit-in-place used the reply text verbatim as the
new draft memory. In practice a reply to a draft is usually a short
instruction ("he had fun, not a song"), not a full retyped memory — using
it verbatim silently discarded everything else in the original draft.
`applyCorrection` sends the original draft text and the reply text to a
forced-tool-choice Claude call (`apply_correction`), which is prompted to
tell the two cases apart: a short instruction gets applied against the
original while preserving what wasn't mentioned; a reply that already reads
as a complete replacement memory is used as-is. On any failure, this falls
back to using the reply text verbatim (the original behavior) rather than
blocking the user from saving anything.

## Response behavior

This function answers Telegram `200 { ok: true }` after handling every
update, success or failure — the only exception is the webhook-secret check,
which is the one genuine `401`. Telegram retries updates that don't get a
`200`, and since this function has side effects (sends messages, may save
data), retrying after a partial failure risks duplicate processing. All
per-update handling is wrapped in a top-level try/catch: any unexpected
error is logged via `console.error` (for `query_logs` visibility) and this
function makes a best-effort attempt to tell the user something went wrong
via `sendMessage` (itself wrapped so a failure to notify never throws) — but
the response to Telegram is `200` either way.

## Bot registration is out of scope

Registering this function as the bot's webhook (`setWebhook`, including
setting the `secret_token` to match `TELEGRAM_WEBHOOK_SECRET`) is a one-time
operational step performed after deployment. It is not something this
function does itself, and there's no code here for it.
