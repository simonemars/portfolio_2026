// supabase/functions/save-capture/index.ts
//
// See README.md in this directory for the contract. This is the persistence
// step `capture` deliberately never did (see that function's own README):
// given a finalized memory text and a finalized list of people to link, it
// embeds the text via Voyage AI and hands off to the `save_capture` Postgres
// function (supabase/migrations/0005_save_capture_function.sql), which
// atomically creates any new `persons` rows, inserts the `memories` row, and
// links them via `memory_person`.
import { getVerifiedCaller, AuthError } from "../_shared/auth.ts";
import { corsHeaders, jsonHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Request / response contract
// ---------------------------------------------------------------------------

export interface SaveCapturePersonInput {
  /** Required when creating a new person (no `personId`); optional display convenience when linking to an existing one. */
  name?: string;
  /** Existing person id, if linking to someone already known. Omit to create a new person with `name`. */
  personId?: string;
}

export interface SaveCaptureRequest {
  /** Final memory text to save (the user's reviewed/possibly-edited draft). */
  memoryText: string;
  /** Final list of people to link. May be empty (a memory need not be about anyone). */
  persons: SaveCapturePersonInput[];
}

export interface SaveCapturePerson {
  id: string;
  name: string;
}

export interface SaveCaptureResponse {
  memoryId: string;
  /** The final linked people — existing ones as given, new ones with their newly-created id. */
  persons: SaveCapturePerson[];
}

export interface SaveCaptureErrorResponse {
  error: string;
}

// ---------------------------------------------------------------------------
// Request validation
// ---------------------------------------------------------------------------

/**
 * Each entry needs either a non-empty `personId` (linking to an existing
 * person) or a non-empty `name` (creating a new one). `name` may still be
 * present alongside `personId` — the client's own display convenience — it
 * just isn't required in that case, so this is intentionally looser than the
 * `SaveCapturePersonInput` TS shape (which types `name` as always-present):
 * that type describes the typical/documented shape, this function is the
 * actual source of truth for what's accepted on the wire.
 */
function isSaveCapturePersonInput(value: unknown): value is SaveCapturePersonInput {
  if (typeof value !== "object" || value === null) return false;
  const person = value as Record<string, unknown>;

  if (person.name !== undefined && typeof person.name !== "string") return false;
  if (person.personId !== undefined && typeof person.personId !== "string") return false;

  const hasPersonId = typeof person.personId === "string" && person.personId.trim().length > 0;
  const hasName = typeof person.name === "string" && person.name.trim().length > 0;

  return hasPersonId || hasName;
}

function isSaveCaptureRequest(body: unknown): body is SaveCaptureRequest {
  if (typeof body !== "object" || body === null) return false;
  const req = body as Record<string, unknown>;

  if (typeof req.memoryText !== "string" || req.memoryText.trim().length === 0) {
    return false;
  }
  if (!Array.isArray(req.persons)) return false;
  if (!req.persons.every(isSaveCapturePersonInput)) return false;

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
    const body: SaveCaptureErrorResponse = { error: "Method not allowed. Use POST." };
    return new Response(JSON.stringify(body), { status: 405, headers: jsonHeaders() });
  }

  // Identity always comes from the verified Supabase auth token — never from
  // a client-supplied field in the request body. We don't need the userId
  // value directly below: the caller's own Authorization header is reused
  // for the Supabase client further down, and RLS on `persons` / `memories`
  // / `memory_person` (enforced inside the `save_capture` function itself,
  // which is SECURITY INVOKER) scopes every write to that verified identity.
  // Verifying here still gates the request on a valid token before any
  // other work — including the paid Voyage embedding call — happens.
  try {
    await getVerifiedCaller(req);
  } catch (err) {
    const status = err instanceof AuthError ? err.status : 401;
    const message = err instanceof Error ? err.message : "Unauthorized.";
    const body: SaveCaptureErrorResponse = { error: message };
    return new Response(JSON.stringify(body), { status, headers: jsonHeaders() });
  }

  let parsedBody: unknown;
  try {
    parsedBody = await req.json();
  } catch {
    const body: SaveCaptureErrorResponse = { error: "Request body must be valid JSON." };
    return new Response(JSON.stringify(body), { status: 400, headers: jsonHeaders() });
  }

  if (!isSaveCaptureRequest(parsedBody)) {
    const body: SaveCaptureErrorResponse = {
      error:
        "Invalid SaveCaptureRequest. Expected { memoryText: string; persons: { name: string; personId?: string }[] }, where each person has a non-empty personId and/or a non-empty name.",
    };
    return new Response(JSON.stringify(body), { status: 400, headers: jsonHeaders() });
  }

  const request: SaveCaptureRequest = parsedBody;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    const body: SaveCaptureErrorResponse = {
      error: "Server misconfigured: SUPABASE_URL / SUPABASE_ANON_KEY not set.",
    };
    return new Response(JSON.stringify(body), { status: 500, headers: jsonHeaders() });
  }

  const voyageKey = Deno.env.get("VOYAGE_AI_KEY");
  if (!voyageKey) {
    const body: SaveCaptureErrorResponse = {
      error: "Server misconfigured: VOYAGE_AI_KEY not set.",
    };
    return new Response(JSON.stringify(body), { status: 500, headers: jsonHeaders() });
  }

  // ---------------------------------------------------------------------
  // Embed the memory text via Voyage AI.
  //
  // Model choice is load-bearing: "voyage-3" is the model that produces
  // 1024-dimension vectors, matching `memories.embedding vector(1024)` in
  // the schema and the `retrieve` function's query-side embedding — mixed
  // model outputs aren't comparable via cosine distance even when their
  // dimensions happen to match.
  //
  // `input_type: "document"` (not `"query"`) is deliberate: Voyage's
  // asymmetric-retrieval convention embeds the query side and the
  // document/stored side differently for better search quality. `retrieve`
  // embeds the caller's search query with `"query"`; this function embeds
  // the memory text being stored with `"document"`. Using the wrong one
  // here would not error — it would silently degrade search quality later.
  // ---------------------------------------------------------------------

  let voyageResponse: Response;
  try {
    voyageResponse = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${voyageKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        input: [request.memoryText],
        model: "voyage-3",
        input_type: "document",
      }),
    });
  } catch {
    const body: SaveCaptureErrorResponse = { error: "Failed to reach the embedding service." };
    return new Response(JSON.stringify(body), { status: 502, headers: jsonHeaders() });
  }

  if (!voyageResponse.ok) {
    const body: SaveCaptureErrorResponse = { error: "Embedding service returned an error." };
    return new Response(JSON.stringify(body), { status: 502, headers: jsonHeaders() });
  }

  let voyageBody: unknown;
  try {
    voyageBody = await voyageResponse.json();
  } catch {
    const body: SaveCaptureErrorResponse = {
      error: "Embedding service returned malformed output.",
    };
    return new Response(JSON.stringify(body), { status: 502, headers: jsonHeaders() });
  }

  const embedding = extractDocumentEmbedding(voyageBody);
  if (!embedding) {
    const body: SaveCaptureErrorResponse = {
      error: "Embedding service returned an unexpected response.",
    };
    return new Response(JSON.stringify(body), { status: 502, headers: jsonHeaders() });
  }

  // ---------------------------------------------------------------------
  // Persist via the `save_capture` RPC. Authenticated with the caller's own
  // token (not a service-role key) — same pattern as every other function
  // here. `save_capture` is SECURITY INVOKER, so RLS on `persons` /
  // `memories` / `memory_person` does all the ownership enforcement; no
  // extra ownership filtering needed (or wanted) on this side.
  // ---------------------------------------------------------------------

  const authHeader = req.headers.get("Authorization")!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const personsJson = toPersonsJson(request.persons);

  const { data: rows, error: rpcError } = await supabase.rpc("save_capture", {
    p_memory_text: request.memoryText,
    p_embedding: embedding,
    p_persons: personsJson,
  });

  if (rpcError) {
    // The SQL function raises an exception with this message text when a
    // given personId doesn't belong to (or exist for) the caller — e.g. the
    // person was deleted between drafting and saving. That's a legitimate,
    // client-recoverable situation, not a server fault, so it gets its own
    // 400 rather than folding into the generic 502 below. The raw Postgres
    // error text is never forwarded to the client either way.
    if (rpcError.message && rpcError.message.includes("not found or not accessible to caller")) {
      const body: SaveCaptureErrorResponse = {
        error: "One of the selected people could not be found.",
      };
      return new Response(JSON.stringify(body), { status: 400, headers: jsonHeaders() });
    }

    const body: SaveCaptureErrorResponse = { error: "Failed to save the memory." };
    return new Response(JSON.stringify(body), { status: 502, headers: jsonHeaders() });
  }

  const resultRows: SaveCaptureRpcRow[] = Array.isArray(rows) ? rows : [];
  if (resultRows.length === 0) {
    // `save_capture` always returns at least one row (a null-person row when
    // zero people were linked) — this should be unreachable, but never read
    // .memoryId off an empty array.
    const body: SaveCaptureErrorResponse = { error: "Failed to save the memory." };
    return new Response(JSON.stringify(body), { status: 502, headers: jsonHeaders() });
  }

  const memoryId = resultRows[0].memory_id;
  const persons: SaveCapturePerson[] = resultRows
    .filter(
      (row): row is SaveCaptureRpcRow & { person_id: string; person_name: string } =>
        row.person_id !== null && row.person_name !== null,
    )
    .map((row) => ({ id: row.person_id, name: row.person_name }));

  const response: SaveCaptureResponse = { memoryId, persons };
  return new Response(JSON.stringify(response), { status: 200, headers: jsonHeaders() });
});

// ---------------------------------------------------------------------------
// p_persons jsonb construction
// ---------------------------------------------------------------------------

interface SaveCapturePersonRpcEntry {
  name?: string;
  person_id?: string;
}

/**
 * Maps request persons to the `save_capture` RPC's jsonb shape.
 *
 * Load-bearing detail: the SQL function distinguishes "link to an existing
 * person" from "create a new one" via `(v_person ? 'person_id') and
 * (v_person->>'person_id') is not null` — i.e. it checks whether the
 * `person_id` *key is present at all*, not just whether it's truthy. An
 * absent `personId` on the request must therefore produce an object with no
 * `person_id` key whatsoever — never a JSON `null` or `""` — or the SQL
 * function would try to treat it as an existing-person link and fail. Simply
 * not assigning the key on `rpcEntry` (as opposed to assigning
 * `undefined`, which some serializers still emit as a literal `null`)
 * guarantees `JSON.stringify`/the Postgres client's own serialization omits
 * it entirely.
 */
function toPersonsJson(persons: SaveCapturePersonInput[]): SaveCapturePersonRpcEntry[] {
  return persons.map((entry) => {
    const rpcEntry: SaveCapturePersonRpcEntry = {};

    if (typeof entry.name === "string" && entry.name.trim().length > 0) {
      rpcEntry.name = entry.name;
    }
    if (typeof entry.personId === "string" && entry.personId.trim().length > 0) {
      rpcEntry.person_id = entry.personId.trim();
    }

    return rpcEntry;
  });
}

// ---------------------------------------------------------------------------
// Voyage response validation
// ---------------------------------------------------------------------------

const EXPECTED_EMBEDDING_DIMENSIONS = 1024;

/**
 * Validates the raw Voyage AI response: confirms `data[0].embedding` exists
 * and is an array of `EXPECTED_EMBEDDING_DIMENSIONS` finite numbers. Returns
 * `null` on any malformed or unexpected shape — callers should treat that as
 * an upstream failure (502), never trust the shape implicitly.
 */
function extractDocumentEmbedding(voyageBody: unknown): number[] | null {
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
// save_capture RPC row shape
// ---------------------------------------------------------------------------

interface SaveCaptureRpcRow {
  memory_id: string;
  person_id: string | null;
  person_name: string | null;
}
