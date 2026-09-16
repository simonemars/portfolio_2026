// supabase/functions/capture/index.ts
//
// See README.md in this directory for the contract. This endpoint drafts a
// cleaned-up memory and candidate person matches for the caller to review —
// it does not persist anything to the `persons` / `memories` tables. That
// is a separate, later confirm/save step.
import { getVerifiedCaller, AuthError } from "../_shared/auth.ts";
import { corsHeaders, jsonHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Request / response contract
// ---------------------------------------------------------------------------

/** A hint about a person mentioned in `rawText`, to help matching. */
export interface CapturePersonHint {
  /** Free-text name as spoken/typed, e.g. "Dana from the climbing gym". */
  name: string;
  /** Known person id, if the client already resolved this hint. */
  personId?: string;
}

export interface CaptureRequest {
  /** Raw transcript or freehand text captured from the user. */
  rawText: string;
  /** Optional audio recording backing `rawText`, if captured by voice. */
  audioUrl?: string;
  /** Optional hints about who this memory is about. */
  personHints?: CapturePersonHint[];
}

export interface CaptureMatchedPerson {
  /** Existing person id, or a server-proposed id for a new person. */
  id: string;
  name: string;
  /** 0..1 confidence that this is the right person for the memory. */
  confidence: number;
  /** Whether this person already exists or would be newly created. */
  isNew: boolean;
}

export interface CaptureResponse {
  /** Cleaned-up, story-shaped draft of the memory, ready for user review. */
  draftMemory: string;
  /** People the draft memory appears to be about, existing or proposed. */
  matchedPersons: CaptureMatchedPerson[];
}

export interface CaptureErrorResponse {
  error: string;
}

// ---------------------------------------------------------------------------
// Request validation
// ---------------------------------------------------------------------------

function isCapturePersonHint(value: unknown): value is CapturePersonHint {
  if (typeof value !== "object" || value === null) return false;
  const hint = value as Record<string, unknown>;
  if (typeof hint.name !== "string" || hint.name.trim().length === 0) {
    return false;
  }
  if (hint.personId !== undefined && typeof hint.personId !== "string") {
    return false;
  }
  return true;
}

function isCaptureRequest(body: unknown): body is CaptureRequest {
  if (typeof body !== "object" || body === null) return false;
  const req = body as Record<string, unknown>;

  if (typeof req.rawText !== "string" || req.rawText.trim().length === 0) {
    return false;
  }
  if (req.audioUrl !== undefined && typeof req.audioUrl !== "string") {
    return false;
  }
  if (req.personHints !== undefined) {
    if (!Array.isArray(req.personHints)) return false;
    if (!req.personHints.every(isCapturePersonHint)) return false;
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
    const body: CaptureErrorResponse = { error: "Method not allowed. Use POST." };
    return new Response(JSON.stringify(body), { status: 405, headers: jsonHeaders() });
  }

  // Identity always comes from the verified Supabase auth token — never
  // from a client-supplied field in the request body. We don't need the
  // userId value directly below: the caller's own Authorization header is
  // reused for the Supabase client further down, and RLS scopes the
  // `persons` query to that verified identity. Verifying here still gates
  // the request on a valid token before any other work happens.
  try {
    await getVerifiedCaller(req);
  } catch (err) {
    const status = err instanceof AuthError ? err.status : 401;
    const message = err instanceof Error ? err.message : "Unauthorized.";
    const body: CaptureErrorResponse = { error: message };
    return new Response(JSON.stringify(body), { status, headers: jsonHeaders() });
  }

  let parsedBody: unknown;
  try {
    parsedBody = await req.json();
  } catch {
    const body: CaptureErrorResponse = { error: "Request body must be valid JSON." };
    return new Response(JSON.stringify(body), { status: 400, headers: jsonHeaders() });
  }

  if (!isCaptureRequest(parsedBody)) {
    const body: CaptureErrorResponse = {
      error:
        "Invalid CaptureRequest. Expected { rawText: string; audioUrl?: string; personHints?: { name: string; personId?: string }[] }.",
    };
    return new Response(JSON.stringify(body), { status: 400, headers: jsonHeaders() });
  }

  const request: CaptureRequest = parsedBody;

  // `rawText` is the client's responsibility to produce (on-device
  // speech-to-text or typing) before calling this endpoint — there is no
  // server-side transcription step here. `audioUrl`, if present, is kept
  // only as supplementary metadata and is not fetched or processed.

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    const body: CaptureErrorResponse = {
      error: "Server misconfigured: SUPABASE_URL / SUPABASE_ANON_KEY not set.",
    };
    return new Response(JSON.stringify(body), { status: 500, headers: jsonHeaders() });
  }

  const anthropicKey = Deno.env.get("ANTHROPIC_KEY");
  if (!anthropicKey) {
    const body: CaptureErrorResponse = {
      error: "Server misconfigured: ANTHROPIC_KEY not set.",
    };
    return new Response(JSON.stringify(body), { status: 500, headers: jsonHeaders() });
  }

  // Fetch the caller's existing people as match candidates. Authenticated
  // with the caller's own token (not a service-role key) so RLS scopes this
  // to their own rows.
  const authHeader = req.headers.get("Authorization")!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: existingPersons, error: personsError } = await supabase
    .from("persons")
    .select("id, name");

  if (personsError) {
    const body: CaptureErrorResponse = { error: "Failed to load existing people." };
    return new Response(JSON.stringify(body), { status: 502, headers: jsonHeaders() });
  }

  const candidates: { id: string; name: string }[] = existingPersons ?? [];

  // ---------------------------------------------------------------------
  // Draft the memory and match candidates via Claude.
  // ---------------------------------------------------------------------

  const draftTool = {
    name: "draft_capture",
    description:
      "Return a cleaned-up draft of the captured memory and the people it appears to be about.",
    input_schema: {
      type: "object",
      properties: {
        draftMemory: {
          type: "string",
          description:
            "A cleaned-up, story-shaped version of the raw text: fix filler words and grammar, keep the same voice and facts. Not a summary.",
        },
        matchedPersons: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              confidence: {
                type: "number",
                minimum: 0,
                maximum: 1,
                description: "0..1 confidence that this is the right person for the memory.",
              },
              isNew: {
                type: "boolean",
                description:
                  "True if this person doesn't match any existing candidate and should be proposed as new.",
              },
              existingPersonId: {
                type: "string",
                description:
                  "Required when isNew is false — the id of the matched existing person, copied exactly from the candidate list. Omit when isNew is true; never invent an id.",
              },
            },
            required: ["name", "confidence", "isNew"],
          },
        },
      },
      required: ["draftMemory", "matchedPersons"],
    },
  };

  const promptLines = [
    "You are helping a user capture a personal memory about someone they know. Turn their raw text into a clean draft and identify who it's about.",
    "",
    "Raw text:",
    request.rawText,
  ];

  if (request.personHints && request.personHints.length > 0) {
    promptLines.push(
      "",
      "Hints about who this memory is about (as given by the user):",
      JSON.stringify(request.personHints),
    );
  }

  promptLines.push(
    "",
    "The user's existing people (id + name) to match against:",
    JSON.stringify(candidates),
    "",
    "Prefer matching an existing person when there's a clear name/context match. Only propose a new person when no existing candidate plausibly fits. For draftMemory, clean up the raw text into a story-shaped account in the same voice, fixing filler and grammar — do not summarize or condense it.",
  );

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
        max_tokens: 4096,
        tools: [draftTool],
        tool_choice: { type: "tool", name: "draft_capture" },
        messages: [{ role: "user", content: promptLines.join("\n") }],
      }),
    });
  } catch {
    const body: CaptureErrorResponse = { error: "Failed to reach the drafting service." };
    return new Response(JSON.stringify(body), { status: 502, headers: jsonHeaders() });
  }

  if (!anthropicResponse.ok) {
    const body: CaptureErrorResponse = { error: "Drafting service returned an error." };
    return new Response(JSON.stringify(body), { status: 502, headers: jsonHeaders() });
  }

  let anthropicBody: unknown;
  try {
    anthropicBody = await anthropicResponse.json();
  } catch {
    const body: CaptureErrorResponse = { error: "Drafting service returned malformed output." };
    return new Response(JSON.stringify(body), { status: 502, headers: jsonHeaders() });
  }

  const draft = extractDraftCapture(anthropicBody);
  if (!draft) {
    const body: CaptureErrorResponse = { error: "Drafting service returned an unexpected response." };
    return new Response(JSON.stringify(body), { status: 502, headers: jsonHeaders() });
  }

  const candidateIds = new Set(candidates.map((c) => c.id));
  const matchedPersons: CaptureMatchedPerson[] = draft.matchedPersons.map((match) => {
    if (!match.isNew && match.existingPersonId && candidateIds.has(match.existingPersonId)) {
      return {
        id: match.existingPersonId,
        name: match.name,
        confidence: match.confidence,
        isNew: false,
      };
    }
    // Either the model marked this as new, or it referenced an
    // existingPersonId that isn't actually one of the candidates we sent —
    // never trust an unchecked id, downgrade to a fresh proposed person.
    return {
      id: crypto.randomUUID(),
      name: match.name,
      confidence: match.confidence,
      isNew: true,
    };
  });

  const response: CaptureResponse = {
    draftMemory: draft.draftMemory,
    matchedPersons,
  };

  return new Response(JSON.stringify(response), { status: 200, headers: jsonHeaders() });
});

// ---------------------------------------------------------------------------
// Claude response validation
// ---------------------------------------------------------------------------

interface RawMatchedPerson {
  name: string;
  confidence: number;
  isNew: boolean;
  existingPersonId?: string;
}

interface DraftCaptureInput {
  draftMemory: string;
  matchedPersons: RawMatchedPerson[];
}

function isRawMatchedPerson(value: unknown): value is RawMatchedPerson {
  if (typeof value !== "object" || value === null) return false;
  const person = value as Record<string, unknown>;
  if (typeof person.name !== "string" || person.name.trim().length === 0) return false;
  if (typeof person.confidence !== "number") return false;
  if (person.confidence < 0 || person.confidence > 1) return false;
  if (typeof person.isNew !== "boolean") return false;
  if (person.existingPersonId !== undefined && typeof person.existingPersonId !== "string") {
    return false;
  }
  return true;
}

function isDraftCaptureInput(value: unknown): value is DraftCaptureInput {
  if (typeof value !== "object" || value === null) return false;
  const input = value as Record<string, unknown>;
  if (typeof input.draftMemory !== "string" || input.draftMemory.trim().length === 0) {
    return false;
  }
  if (!Array.isArray(input.matchedPersons)) return false;
  if (!input.matchedPersons.every(isRawMatchedPerson)) return false;
  return true;
}

/**
 * Validates the raw Anthropic API response: confirms a `draft_capture` tool
 * call happened and that its `input` matches the expected shape. Returns
 * `null` on any malformed or missing tool call — callers should treat that
 * as an upstream failure (502), never trust the shape implicitly.
 */
function extractDraftCapture(anthropicBody: unknown): DraftCaptureInput | null {
  if (typeof anthropicBody !== "object" || anthropicBody === null) return null;
  const message = anthropicBody as Record<string, unknown>;
  if (!Array.isArray(message.content)) return null;

  const toolUse = message.content.find(
    (block): block is Record<string, unknown> =>
      typeof block === "object" &&
      block !== null &&
      (block as Record<string, unknown>).type === "tool_use" &&
      (block as Record<string, unknown>).name === "draft_capture",
  );
  if (!toolUse) return null;

  const input = toolUse.input;
  if (!isDraftCaptureInput(input)) return null;

  return input;
}
