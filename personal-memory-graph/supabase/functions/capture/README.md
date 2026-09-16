# `capture`

Takes a raw voice transcript or freehand text (plus optional hints about who
it's about) and returns a cleaned-up draft memory alongside the person(s) it
appears to be about — matched to existing people, or proposed as new.

This endpoint drafts and matches only. It does **not** write to the
`persons` or `memories` tables — persistence is a separate, later
confirm/save step, not this one.

There is no server-side transcription. `rawText` is required and must
already be text by the time it reaches this endpoint (on-device
speech-to-text or typing is the client's responsibility); `audioUrl` is
kept only as optional supplementary metadata.

## Auth

Every request must include a Supabase auth token:

```
Authorization: Bearer <supabase access token>
```

The handler verifies this token against Supabase Auth and derives the
caller's identity from it. There is no `userId` field in the request body —
identity is never accepted from client input.

A missing or invalid token returns `401`.

## Request

`POST /functions/v1/capture`

```ts
interface CaptureRequest {
  /** Raw transcript or freehand text captured from the user. */
  rawText: string;
  /** Optional audio recording backing rawText, if captured by voice. */
  audioUrl?: string;
  /** Optional hints about who this memory is about. */
  personHints?: CapturePersonHint[];
}

interface CapturePersonHint {
  /** Free-text name as spoken/typed, e.g. "Dana from the climbing gym". */
  name: string;
  /** Known person id, if the client already resolved this hint. */
  personId?: string;
}
```

`rawText` is required and must be non-empty. `audioUrl` and `personHints`
are optional.

### Example

```json
{
  "rawText": "Ran into Dana at the climbing gym, she just started a new job in urban planning.",
  "personHints": [{ "name": "Dana" }]
}
```

## Response

On success, `200`:

```ts
interface CaptureResponse {
  /** Cleaned-up, story-shaped draft of the memory, ready for user review. */
  draftMemory: string;
  /** People the draft memory appears to be about, existing or proposed. */
  matchedPersons: CaptureMatchedPerson[];
}

interface CaptureMatchedPerson {
  /** Existing person id, or a server-proposed id for a new person. */
  id: string;
  name: string;
  /** 0..1 confidence that this is the right person for the memory. */
  confidence: number;
  /** Whether this person already exists or would be newly created. */
  isNew: boolean;
}
```

### Example

```json
{
  "draftMemory": "Ran into Dana at the climbing gym — she just started a new job in urban planning.",
  "matchedPersons": [
    { "id": "b3f1...", "name": "Dana", "confidence": 0.92, "isNew": false }
  ]
}
```

## Errors

All error responses share the shape `{ "error": string }`.

| Status | When |
|---|---|
| 400 | Body isn't valid JSON, or doesn't match `CaptureRequest` |
| 401 | Missing/invalid Authorization header or auth token |
| 405 | Method other than `POST` (or `OPTIONS` for CORS preflight) |
| 500 | Server misconfiguration — a required env var (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ANTHROPIC_KEY`) isn't set |
| 502 | Upstream failure — fetching the caller's existing people failed, the drafting call to Claude failed or returned a non-2xx response, or its response didn't validate against the expected shape |

## Product note

This function is a capture aid, not a form. `matchedPersons` surfaces
candidates for the user to confirm — never scores, stages, or ranks people
as leads. No CRM language anywhere in this contract or its future copy.
