// supabase/functions/graph-query/index.ts
//
// See README.md in this directory for the contract.
//
// Scope note (read before touching target resolution or traversal below):
// `persons` only contains people the caller already knows directly — there
// is no "third party I don't know" concept in this schema. A literal
// graph-theoretic "shortest path from me" would therefore always trivially
// resolve to "you know them directly," which isn't useful and isn't what
// the README's own example shows (a 2-hop path through one intermediary:
// ["me", "sam-id", "dana-id"]). So this endpoint deliberately surfaces
// intermediary connections only: for the resolved target person, find their
// neighbors in `edges` (other persons connected to the target) and report
// each as ["me", intermediaryPersonId, targetPersonId]. It does NOT report
// the trivial direct "you know them" edge even though the target is (as
// they always are) someone the caller already knows — that omission is a
// deliberate scope decision, not an oversight. Multi-hop chains (2+
// intermediaries) are out of scope for this task; only one intermediary
// hop is considered.
import { getVerifiedCaller, AuthError } from "../_shared/auth.ts";
import { corsHeaders, jsonHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Request / response contract
// ---------------------------------------------------------------------------

export interface GraphQueryRequest {
  /** Natural-language query, e.g. "who connects me to Dana?". */
  query: string;
  /** Known target person id, if the client already resolved who "X" is. */
  targetPersonId?: string;
}

export interface GraphQueryPath {
  /** Ordered person ids from the user to the target, e.g. [me, a, target]. */
  personIds: string[];
  /** Plain-language description of the path, e.g. "via Dana, through Sam". */
  description: string;
}

export interface GraphQueryResponse {
  paths: GraphQueryPath[];
}

export interface GraphQueryErrorResponse {
  error: string;
}

// ---------------------------------------------------------------------------
// Request validation
// ---------------------------------------------------------------------------

function isGraphQueryRequest(body: unknown): body is GraphQueryRequest {
  if (typeof body !== "object" || body === null) return false;
  const req = body as Record<string, unknown>;

  if (typeof req.query !== "string" || req.query.trim().length === 0) {
    return false;
  }
  if (req.targetPersonId !== undefined && typeof req.targetPersonId !== "string") {
    return false;
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
    const body: GraphQueryErrorResponse = { error: "Method not allowed. Use POST." };
    return new Response(JSON.stringify(body), { status: 405, headers: jsonHeaders() });
  }

  // Identity always comes from the verified Supabase auth token — never
  // from a client-supplied field in the request body. We don't need the
  // userId value directly below: the caller's own Authorization header is
  // reused for the Supabase client further down, and RLS scopes every
  // `persons` / `edges` query to that verified identity. Verifying here
  // still gates the request on a valid token before any other work happens.
  try {
    await getVerifiedCaller(req);
  } catch (err) {
    const status = err instanceof AuthError ? err.status : 401;
    const message = err instanceof Error ? err.message : "Unauthorized.";
    const body: GraphQueryErrorResponse = { error: message };
    return new Response(JSON.stringify(body), { status, headers: jsonHeaders() });
  }

  let parsedBody: unknown;
  try {
    parsedBody = await req.json();
  } catch {
    const body: GraphQueryErrorResponse = { error: "Request body must be valid JSON." };
    return new Response(JSON.stringify(body), { status: 400, headers: jsonHeaders() });
  }

  if (!isGraphQueryRequest(parsedBody)) {
    const body: GraphQueryErrorResponse = {
      error: "Invalid GraphQueryRequest. Expected { query: string; targetPersonId?: string }.",
    };
    return new Response(JSON.stringify(body), { status: 400, headers: jsonHeaders() });
  }

  const request: GraphQueryRequest = parsedBody;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    const body: GraphQueryErrorResponse = {
      error: "Server misconfigured: SUPABASE_URL / SUPABASE_ANON_KEY not set.",
    };
    return new Response(JSON.stringify(body), { status: 500, headers: jsonHeaders() });
  }

  // Scoped to the caller's own token (not a service-role key) so RLS
  // restricts every query below to their own `persons` / `edges` rows.
  const authHeader = req.headers.get("Authorization")!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  // -------------------------------------------------------------------
  // Step 1: resolve the target person.
  // -------------------------------------------------------------------

  let targetId: string | null = null;
  let targetName: string | null = null;

  if (request.targetPersonId) {
    const { data: targetPerson, error: targetError } = await supabase
      .from("persons")
      .select("id, name")
      .eq("id", request.targetPersonId)
      .maybeSingle();

    if (targetError) {
      const body: GraphQueryErrorResponse = { error: "Failed to look up the target person." };
      return new Response(JSON.stringify(body), { status: 502, headers: jsonHeaders() });
    }

    // Not found (doesn't exist, or belongs to someone else and RLS hid it)
    // is not an error — it just means no target resolved, handled below.
    if (targetPerson) {
      targetId = targetPerson.id;
      targetName = targetPerson.name;
    }
  } else {
    // No client-resolved id — infer the target from `query` against the
    // caller's own people via Claude, the same forced tool-use pattern
    // `capture` uses for fuzzy name matching.
    const { data: existingPersons, error: personsError } = await supabase
      .from("persons")
      .select("id, name");

    if (personsError) {
      const body: GraphQueryErrorResponse = { error: "Failed to load existing people." };
      return new Response(JSON.stringify(body), { status: 502, headers: jsonHeaders() });
    }

    const candidates: { id: string; name: string }[] = existingPersons ?? [];

    if (candidates.length > 0) {
      const anthropicKey = Deno.env.get("ANTHROPIC_KEY");
      if (!anthropicKey) {
        const body: GraphQueryErrorResponse = {
          error: "Server misconfigured: ANTHROPIC_KEY not set.",
        };
        return new Response(JSON.stringify(body), { status: 500, headers: jsonHeaders() });
      }

      const resolveTool = {
        name: "resolve_target",
        description:
          "Identify which candidate person, if any, the user's query is asking about.",
        input_schema: {
          type: "object",
          properties: {
            matchedPersonId: {
              type: "string",
              description:
                "The id of the candidate person the query refers to, copied exactly from the candidate list. Omit this field entirely if no candidate plausibly matches — never invent an id.",
            },
          },
        },
      };

      const promptLines = [
        "A user is asking a question about how they're connected to someone in their personal network. Identify which person (if any) they mean.",
        "",
        "Query:",
        request.query,
        "",
        "The user's existing people (id + name) to match against:",
        JSON.stringify(candidates),
        "",
        "Only return a matchedPersonId when a candidate is a clear, confident match for who the query is asking about. Omit matchedPersonId entirely if no candidate plausibly fits.",
      ];

      let anthropicResponse: Response;
      try {
        anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-sonnet-5",
            max_tokens: 1024,
            tools: [resolveTool],
            tool_choice: { type: "tool", name: "resolve_target" },
            messages: [{ role: "user", content: promptLines.join("\n") }],
          }),
        });
      } catch {
        const body: GraphQueryErrorResponse = { error: "Failed to reach the resolution service." };
        return new Response(JSON.stringify(body), { status: 502, headers: jsonHeaders() });
      }

      if (!anthropicResponse.ok) {
        const body: GraphQueryErrorResponse = { error: "Resolution service returned an error." };
        return new Response(JSON.stringify(body), { status: 502, headers: jsonHeaders() });
      }

      let anthropicBody: unknown;
      try {
        anthropicBody = await anthropicResponse.json();
      } catch {
        const body: GraphQueryErrorResponse = {
          error: "Resolution service returned malformed output.",
        };
        return new Response(JSON.stringify(body), { status: 502, headers: jsonHeaders() });
      }

      const resolved = extractResolveTarget(anthropicBody);
      if (resolved === undefined) {
        const body: GraphQueryErrorResponse = {
          error: "Resolution service returned an unexpected response.",
        };
        return new Response(JSON.stringify(body), { status: 502, headers: jsonHeaders() });
      }

      // Never trust a model-returned id at face value — cross-check it
      // against the actual candidate set we sent, exactly like `capture`
      // does for `existingPersonId`. An unverified/fabricated id is treated
      // as "no match."
      if (resolved.matchedPersonId) {
        const match = candidates.find((c) => c.id === resolved.matchedPersonId);
        if (match) {
          targetId = match.id;
          targetName = match.name;
        }
      }
    }
  }

  // -------------------------------------------------------------------
  // Step 2: no target resolved — a valid "no connecting path found"
  // answer per the contract, not an error.
  // -------------------------------------------------------------------

  if (!targetId || !targetName) {
    const body: GraphQueryResponse = { paths: [] };
    return new Response(JSON.stringify(body), { status: 200, headers: jsonHeaders() });
  }

  // -------------------------------------------------------------------
  // Step 3: find intermediary paths — the target's neighbors in `edges`.
  // See the scope note at the top of this file for why only one
  // intermediary hop is considered, and why the trivial "you know them
  // directly" edge is deliberately not reported.
  //
  // Capped at a small, fixed number of paths and ordered by most recently
  // noted connection first (`created_at` descending). There's no inherent
  // ranking signal for these paths (no relevance score, no path-length
  // variation since every path here is exactly one hop) — recency is a
  // reasonable default rather than an arbitrary one, since a connection
  // the caller logged more recently is more likely to still be top of mind.
  // -------------------------------------------------------------------

  const MAX_PATHS = 5;

  const { data: neighborEdges, error: edgesError } = await supabase
    .from("edges")
    .select("person_a_id, person_b_id, story, created_at")
    .or(`person_a_id.eq.${targetId},person_b_id.eq.${targetId}`)
    .order("created_at", { ascending: false })
    .limit(MAX_PATHS);

  if (edgesError) {
    const body: GraphQueryErrorResponse = { error: "Failed to look up connections." };
    return new Response(JSON.stringify(body), { status: 502, headers: jsonHeaders() });
  }

  const edges = neighborEdges ?? [];

  const intermediaryIds = Array.from(
    new Set(
      edges.map((edge) => (edge.person_a_id === targetId ? edge.person_b_id : edge.person_a_id)),
    ),
  );

  let intermediaryNames = new Map<string, string>();
  if (intermediaryIds.length > 0) {
    const { data: intermediaryPersons, error: intermediaryError } = await supabase
      .from("persons")
      .select("id, name")
      .in("id", intermediaryIds);

    if (intermediaryError) {
      const body: GraphQueryErrorResponse = { error: "Failed to look up connections." };
      return new Response(JSON.stringify(body), { status: 502, headers: jsonHeaders() });
    }

    intermediaryNames = new Map((intermediaryPersons ?? []).map((p) => [p.id, p.name]));
  }

  const paths: GraphQueryPath[] = [];
  for (const edge of edges) {
    const intermediaryId =
      edge.person_a_id === targetId ? edge.person_b_id : edge.person_a_id;
    const intermediaryName = intermediaryNames.get(intermediaryId);
    // Should always be present (edges are FK-constrained to persons, and
    // this is the same RLS-scoped caller), but skip defensively rather than
    // surface a path with a missing name.
    if (!intermediaryName) continue;

    let description = `You know ${intermediaryName}, who knows ${targetName}.`;
    if (edge.story && edge.story.trim().length > 0) {
      description += ` ${edge.story.trim()}`;
    }

    paths.push({
      personIds: ["me", intermediaryId, targetId],
      description,
    });
  }

  const response: GraphQueryResponse = { paths };
  return new Response(JSON.stringify(response), { status: 200, headers: jsonHeaders() });
});

// ---------------------------------------------------------------------------
// Claude response validation
// ---------------------------------------------------------------------------

interface ResolveTargetInput {
  matchedPersonId?: string;
}

function isResolveTargetInput(value: unknown): value is ResolveTargetInput {
  if (typeof value !== "object" || value === null) return false;
  const input = value as Record<string, unknown>;
  if (input.matchedPersonId !== undefined && typeof input.matchedPersonId !== "string") {
    return false;
  }
  return true;
}

/**
 * Validates the raw Anthropic API response: confirms a `resolve_target` tool
 * call happened and that its `input` matches the expected shape. Returns
 * `undefined` on any malformed or missing tool call — callers should treat
 * that as an upstream failure (502), never trust the shape implicitly.
 */
function extractResolveTarget(anthropicBody: unknown): ResolveTargetInput | undefined {
  if (typeof anthropicBody !== "object" || anthropicBody === null) return undefined;
  const message = anthropicBody as Record<string, unknown>;
  if (!Array.isArray(message.content)) return undefined;

  const toolUse = message.content.find(
    (block): block is Record<string, unknown> =>
      typeof block === "object" &&
      block !== null &&
      (block as Record<string, unknown>).type === "tool_use" &&
      (block as Record<string, unknown>).name === "resolve_target",
  );
  if (!toolUse) return undefined;

  const input = toolUse.input;
  if (!isResolveTargetInput(input)) return undefined;

  return input;
}
