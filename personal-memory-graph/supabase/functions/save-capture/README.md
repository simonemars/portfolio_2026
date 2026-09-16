# `save-capture`

Takes a finalized memory — the text the user reviewed and possibly edited
after `capture`, plus the final list of people to link — and persists it.
This is the persistence step `capture` deliberately never did (see that
function's own README): `capture` only drafts a memory and proposes person
matches, it doesn't write to `persons` or `memories`. This function is where
a capture actually becomes a saved memory.

The memory text is embedded via Voyage AI, then handed to the `save_capture`
Postgres function
(`supabase/migrations/0005_save_capture_function.sql`), which atomically
creates any new `persons` rows, inserts the `memories` row, and links them
via `memory_person` — so a request never leaves the caller with a
half-saved memory (a memory with no links, or new person rows nothing points
at) if something in the middle fails.

## Auth

Every request must include a Supabase auth token:

```
Authorization: Bearer <supabase access token>
```

The handler verifies this token against Supabase Auth and derives the
caller's identity from it. There is no `userId` field in the request body —
identity is never accepted from client input. Every write is scoped to the
caller via Postgres RLS on `persons` / `memories` / `memory_person`
(`save_capture` runs `security invoker`, so RLS applies to it directly) —
not by any extra ownership filtering in this function.

A missing or invalid token returns `401`.

## Request

`POST /functions/v1/save-capture`

```ts
interface SaveCaptureRequest {
  /** Final memory text to save (the user's reviewed/possibly-edited draft). */
  memoryText: string;
  /** Final list of people to link. May be empty (a memory need not be about anyone). */
  persons: SaveCapturePersonInput[];
}

interface SaveCapturePersonInput {
  /** Required when creating a new person (no `personId`); optional display convenience when linking to an existing one. */
  name?: string;
  /** Existing person id, if linking to someone already known. Omit to create a new person with `name`. */
  personId?: string;
}
```

`memoryText` is required and must be non-empty (after trimming whitespace).
`persons` is required and may be an empty array. Each entry needs a
non-empty `personId` (linking to an existing person) and/or a non-empty
`name` (creating a new person) — `name` may still be included alongside
`personId` as a client display convenience, it just isn't required in that
case.

### Example

```json
{
  "memoryText": "Ran into Dana at the climbing gym — she just started a new job in urban planning.",
  "persons": [{ "name": "Dana", "personId": "b3f1..." }]
}
```

Saving a memory about a new person, with no existing id:

```json
{
  "memoryText": "Met someone named Priya at the co-op board meeting.",
  "persons": [{ "name": "Priya" }]
}
```

## Response

On success, `200`:

```ts
interface SaveCaptureResponse {
  memoryId: string;
  /** The final linked people — existing ones as given, new ones with their newly-created id. */
  persons: SaveCapturePerson[];
}

interface SaveCapturePerson {
  id: string;
  name: string;
}
```

`persons` reflects what was actually linked in the database — for a memory
linked to no one, it's `[]`, but `memoryId` is still returned.

### Example

```json
{
  "memoryId": "7ac2...",
  "persons": [{ "id": "b3f1...", "name": "Dana" }]
}
```

## Errors

All error responses share the shape `{ "error": string }`.

| Status | When |
|---|---|
| 400 | Body isn't valid JSON, or doesn't match `SaveCaptureRequest`; or one of the given `personId`s doesn't belong to (or no longer exists for) the caller — e.g. deleted between drafting and saving |
| 401 | Missing/invalid Authorization header or auth token |
| 405 | Method other than `POST` (or `OPTIONS` for CORS preflight) |
| 500 | Server misconfiguration — a required env var (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `VOYAGE_AI_KEY`) isn't set |
| 502 | Upstream failure — the embedding call to Voyage AI failed, returned a non-2xx response, or returned an unexpected shape; or the `save_capture` database call failed for a reason other than an inaccessible `personId` |

## Product note

This function saves a personal memory, not a converted lead or a staged
record — no CRM language anywhere in this contract or its future copy.

## Implementation note: Voyage `input_type`

Voyage's asymmetric-retrieval convention embeds queries and stored documents
differently for better search quality. `retrieve` embeds the caller's search
query with `input_type: "query"`; this function embeds the memory text being
*stored* with `input_type: "document"`. Getting this backwards wouldn't
error — it would silently degrade search quality later — so it's called out
explicitly here and in the implementation.
