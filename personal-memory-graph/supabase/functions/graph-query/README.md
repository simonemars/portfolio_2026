# `graph-query`

Takes a question about how the user connects to another person (e.g. "who
connects me to Dana?") and returns the connecting path(s) through the
person graph — the "who connects me to X" feature.

The target person is resolved either from a client-supplied
`targetPersonId` or, if omitted, inferred from `query` against the caller's
own people via Claude. `persons` only ever contains people the caller
already knows directly, so this endpoint surfaces *intermediary*
connections: for the resolved target, it looks up their neighbors in the
`edges` table and reports each as a one-hop path through that intermediary.
It does not report a trivial "you know them directly" path, and multi-hop
chains (2+ intermediaries) are out of scope. See the comment at the top of
`index.ts` for the full reasoning.

## Auth

Every request must include a Supabase auth token:

```
Authorization: Bearer <supabase access token>
```

The handler verifies this token against Supabase Auth and derives the
caller's identity from it. There is no `userId` field in the request body —
identity is never accepted from client input; the traversal always starts
from the caller's own node in their own graph.

A missing or invalid token returns `401`.

## Request

`POST /functions/v1/graph-query`

```ts
interface GraphQueryRequest {
  /** Natural-language query, e.g. "who connects me to Dana?". */
  query: string;
  /** Known target person id, if the client already resolved who "X" is. */
  targetPersonId?: string;
}
```

`query` is required and must be non-empty. `targetPersonId` is optional —
when omitted, the target is expected to be inferred from `query`.

### Example

```json
{ "query": "who connects me to Dana?", "targetPersonId": "b3f1..." }
```

## Response

On success, `200`:

```ts
interface GraphQueryResponse {
  paths: GraphQueryPath[];
}

interface GraphQueryPath {
  /** Ordered person ids from the user to the target, e.g. [me, a, target]. */
  personIds: string[];
  /** Plain-language description of the path, e.g. "via Dana, through Sam". */
  description: string;
}
```

### Example

```json
{
  "paths": [
    {
      "personIds": ["me", "sam-id", "dana-id"],
      "description": "You know Sam, who knows Dana."
    }
  ]
}
```

An empty `paths` array means no connecting path was found — not an error.

## Errors

All error responses share the shape `{ "error": string }`.

| Status | When |
|---|---|
| 400 | Body isn't valid JSON, or doesn't match `GraphQueryRequest` |
| 401 | Missing/invalid Authorization header or auth token |
| 405 | Method other than `POST` (or `OPTIONS` for CORS preflight) |
| 500 | Server misconfiguration — a required env var (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, or, only when target resolution via Claude is needed, `ANTHROPIC_KEY`) isn't set |
| 502 | Upstream failure — a `persons`/`edges` lookup failed, or the target-resolution call to Claude failed, returned a non-2xx response, or returned an unexpected shape |

## Product note

This surfaces how people in the user's own life connect — never a pipeline
or org-chart view. No CRM language anywhere in this contract or its future
copy.
