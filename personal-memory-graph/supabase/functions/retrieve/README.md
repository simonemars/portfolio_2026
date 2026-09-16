# `retrieve`

Takes a natural-language query and returns semantically ranked memories
(and the people they're about) — search by meaning, not by a tag someone
remembered to set.

The query is embedded via Voyage AI and matched against memory embeddings
with a pgvector similarity search (the `match_memories` RPC). This function
does not call Claude — it returns ranked `results` only, no synthesized
natural-language answer. (The build runbook's prose mentions "answer
synthesis" for this endpoint, but the reviewed `RetrieveResponse` contract
below has no field for one; this implementation follows the contract.)

## Auth

Every request must include a Supabase auth token:

```
Authorization: Bearer <supabase access token>
```

The handler verifies this token against Supabase Auth and derives the
caller's identity from it. There is no `userId` field in the request body —
identity is never accepted from client input, and results are always scoped
to the caller's own data.

A missing or invalid token returns `401`.

## Request

`POST /functions/v1/retrieve`

```ts
interface RetrieveRequest {
  /** Natural-language query, e.g. "who did I meet at the climbing gym?". */
  query: string;
  /** Max number of results to return. Server may cap this. Default: 10. */
  limit?: number;
}
```

`query` is required and must be non-empty. `limit`, if given, must be a
positive number.

### Example

```json
{ "query": "who did I meet at the climbing gym?", "limit": 5 }
```

## Response

On success, `200`:

```ts
interface RetrieveResponse {
  results: RetrieveResult[];
}

interface RetrieveResult {
  personId: string;
  memoryId: string;
  /** Short excerpt of the matching memory, with the relevant part surfaced. */
  snippet: string;
  /** 0..1 semantic relevance score for this result. */
  relevance: number;
}
```

### Example

```json
{
  "results": [
    {
      "personId": "b3f1...",
      "memoryId": "7ac2...",
      "snippet": "Ran into Dana at the climbing gym — new job in urban planning.",
      "relevance": 0.87
    }
  ]
}
```

## Errors

All error responses share the shape `{ "error": string }`.

| Status | When |
|---|---|
| 400 | Body isn't valid JSON, or doesn't match `RetrieveRequest` |
| 401 | Missing/invalid Authorization header or auth token |
| 405 | Method other than `POST` (or `OPTIONS` for CORS preflight) |
| 500 | Server misconfiguration — a required env var (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `VOYAGE_AI_KEY`) isn't set |
| 502 | Upstream failure — the embedding call to Voyage AI failed or returned a non-2xx response or an unexpected shape, or the `match_memories` similarity search failed |

## Product note

Results are memories surfaced by meaning, not leads sorted by score.
`relevance` describes semantic match quality only — no CRM language anywhere
in this contract or its future copy.
