// supabase/functions/retrieve/index.ts
//
// See README.md in this directory for the contract. Embeds the caller's
// query with Voyage AI, runs a pgvector similarity search over their own
// memories via the `match_memories` RPC, and maps the rows to
// `RetrieveResponse`. Deliberately no Claude call in this function: the
// build runbook's prose mentions "answer synthesis", but the reviewed
// `RetrieveResponse` contract only has a `results` array — no field for a
// synthesized natural-language answer. Following the actual reviewed
// contract, this returns ranked results only.
import { getVerifiedCaller, AuthError } from "../_shared/auth.ts";
import { corsHeaders, jsonHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Request / response contract
// ---------------------------------------------------------------------------

export interface RetrieveRequest {
  /** Natural-language query, e.g. "who did I meet at the climbing gym?". */
  query: string;
  /** Max number of results to return. Server may cap this. Default: 10. */
  limit?: number;
}

export interface RetrieveResult {
  personId: string;
  memoryId: string;
  /** Short excerpt of the matching memory, with the relevant part surfaced. */
  snippet: string;
  /** 0..1 semantic relevance score for this result. */
  relevance: number;
}

export interface RetrieveResponse {
  results: RetrieveResult[];
}

export interface RetrieveErrorResponse {
  error: string;
}

// ---------------------------------------------------------------------------
// Request validation
// ---------------------------------------------------------------------------

function isRetrieveRequest(body: unknown): body is RetrieveRequest {
  if (typeof body !== "object" || body === null) return false;
  const req = body as Record<string, unknown>;

  if (typeof req.query !== "string" || req.query.trim().length === 0) {
    return false;
  }
  if (req.limit !== undefined) {
    if (typeof req.limit !== "number" || !Number.isFinite(req.limit) || req.limit <= 0) {
      return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    const body: RetrieveErrorResponse = { error: "Method not allowed. Use POST." };
    return new Response(JSON.stringify(body), { status: 405, headers: jsonHeaders() });
  }

  // Identity always comes from the verified Supabase auth token — never
  // from a client-supplied field in the request body.
  let userId: string;
  try {
    const caller = await getVerifiedCaller(req);
    userId = caller.userId;
  } catch (err) {
    const status = err instanceof AuthError ? err.status : 401;
    const message = err instanceof Error ? err.message : "Unauthorized.";
    const body: RetrieveErrorResponse = { error: message };
    return new Response(JSON.stringify(body), { status, headers: jsonHeaders() });
  }

  let parsedBody: unknown;
  try {
    parsedBody = await req.json();
  } catch {
    const body: RetrieveErrorResponse = { error: "Request body must be valid JSON." };
    return new Response(JSON.stringify(body), { status: 400, headers: jsonHeaders() });
  }

  if (!isRetrieveRequest(parsedBody)) {
    const body: RetrieveErrorResponse = {
      error: "Invalid RetrieveRequest. Expected { query: string; limit?: number }.",
    };
    return new Response(JSON.stringify(body), { status: 400, headers: jsonHeaders() });
  }

  const request: RetrieveRequest = parsedBody;
  // Identity is only needed to gate the request above — `match_memories`
  // below is called with the caller's own token and RLS on `memories` /
  // `memory_person` naturally scopes results to them. No explicit
  // user_id filtering here.
  void userId;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    const body: RetrieveErrorResponse = {
      error: "Server misconfigured: SUPABASE_URL / SUPABASE_ANON_KEY not set.",
    };
    return new Response(JSON.stringify(body), { status: 500, headers: jsonHeaders() });
  }

  const voyageKey = Deno.env.get("VOYAGE_AI_KEY");
  if (!voyageKey) {
    const body: RetrieveErrorResponse = {
      error: "Server misconfigured: VOYAGE_AI_KEY not set.",
    };
    return new Response(JSON.stringify(body), { status: 500, headers: jsonHeaders() });
  }

  // ---------------------------------------------------------------------
  // Embed the query via Voyage AI.
  //
  // Model choice is load-bearing: "voyage-3" is the model that produces
  // 1024-dimension vectors, matching `memories.embedding vector(1024)` in
  // the schema. Whatever future code embeds memories at write-time must
  // use this same model, or similarity search becomes meaningless (mixed
  // model outputs aren't comparable via cosine distance even when their
  // dimensions happen to match).
  //
  // `input_type: "query"` is Voyage's documented parameter for asymmetric
  // retrieval — queries and documents get different embedding treatment
  // for better search quality — so it's used here for the query side.
  let voyageResponse: Response;
  try {
    voyageResponse = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${voyageKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        input: [request.query],
        model: "voyage-3",
        input_type: "query",
      }),
    });
  } catch {
    const body: RetrieveErrorResponse = { error: "Failed to reach the embedding service." };
    return new Response(JSON.stringify(body), { status: 502, headers: jsonHeaders() });
  }

  if (!voyageResponse.ok) {
    const body: RetrieveErrorResponse = { error: "Embedding service returned an error." };
    return new Response(JSON.stringify(body), { status: 502, headers: jsonHeaders() });
  }

  let voyageBody: unknown;
  try {
    voyageBody = await voyageResponse.json();
  } catch {
    const body: RetrieveErrorResponse = { error: "Embedding service returned malformed output." };
    return new Response(JSON.stringify(body), { status: 502, headers: jsonHeaders() });
  }

  const queryEmbedding = extractQueryEmbedding(voyageBody);
  if (!queryEmbedding) {
    const body: RetrieveErrorResponse = {
      error: "Embedding service returned an unexpected response.",
    };
    return new Response(JSON.stringify(body), { status: 502, headers: jsonHeaders() });
  }

  // ---------------------------------------------------------------------
  // Similarity search via the `match_memories` RPC. Authenticated with the
  // caller's own token (not a service-role key) so RLS scopes this to
  // their own rows — same pattern as `capture`.
  // ---------------------------------------------------------------------

  const authHeader = req.headers.get("Authorization")!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const matchCount = request.limit ?? 10;
  const { data: matches, error: matchError } = await supabase.rpc("match_memories", {
    query_embedding: queryEmbedding,
    match_count: matchCount,
  });

  if (matchError) {
    const body: RetrieveErrorResponse = { error: "Failed to search memories." };
    return new Response(JSON.stringify(body), { status: 502, headers: jsonHeaders() });
  }

  const rows: MatchMemoriesRow[] = Array.isArray(matches) ? matches : [];
  const results: RetrieveResult[] = rows.map((row) => ({
    personId: row.person_id,
    memoryId: row.memory_id,
    snippet: row.snippet,
    relevance: Math.max(0, Math.min(1, row.similarity)),
  }));

  const response: RetrieveResponse = { results };
  return new Response(JSON.stringify(response), { status: 200, headers: jsonHeaders() });
});

// ---------------------------------------------------------------------------
// Voyage response validation
// ---------------------------------------------------------------------------

const EXPECTED_EMBEDDING_DIMENSIONS = 1024;

/**
 * Validates the raw Voyage AI response: confirms `data[0].embedding` exists
 * and is an array of `EXPECTED_EMBEDDING_DIMENSIONS` numbers. Returns `null`
 * on any malformed or unexpected shape — callers should treat that as an
 * upstream failure (502), never trust the shape implicitly.
 */
function extractQueryEmbedding(voyageBody: unknown): number[] | null {
  if (typeof voyageBody !== "object" || voyageBody === null) return null;
  const parsed = voyageBody as Record<string, unknown>;
  if (!Array.isArray(parsed.data) || parsed.data.length === 0) return null;

  const first = parsed.data[0];
  if (typeof first !== "object" || first === null) return null;
  const embedding = (first as Record<string, unknown>).embedding;

  if (!Array.isArray(embedding) || embedding.length !== EXPECTED_EMBEDDING_DIMENSIONS) {
    return null;
  }
  if (!embedding.every((value) => typeof value === "number" && Number.isFinite(value))) {
    return null;
  }

  return embedding as number[];
}

// ---------------------------------------------------------------------------
// match_memories RPC row shape
// ---------------------------------------------------------------------------

interface MatchMemoriesRow {
  memory_id: string;
  person_id: string;
  snippet: string;
  similarity: number;
}
