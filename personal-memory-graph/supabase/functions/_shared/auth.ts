// Shared auth helper for the personal-memory-graph edge functions.
//
// Every function in this project must resolve the caller's identity from
// their verified Supabase auth token (the `Authorization: Bearer <jwt>`
// header), NEVER from a client-supplied field like `userId` in the request
// body. A body-supplied user id can't be trusted; the JWT is signed by
// Supabase Auth and verified server-side here.
import {
  createClient,
  type User,
} from "https://esm.sh/@supabase/supabase-js@2";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export interface VerifiedCaller {
  /** The authenticated user, as returned by Supabase Auth. */
  user: User;
  /** Convenience accessor — same as `user.id`. */
  userId: string;
}

/**
 * Verifies the caller's Supabase auth JWT against the Supabase Auth server
 * and returns the verified user. Throws `AuthError` if the header is
 * missing, malformed, or the token doesn't verify.
 *
 * Usage in a function handler:
 *
 *   const { userId } = await getVerifiedCaller(req);
 *
 * `userId` is the only source of truth for "who is making this request" —
 * scope every downstream read/write (persons, memories, edges) to it.
 */
export async function getVerifiedCaller(req: Request): Promise<VerifiedCaller> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw new AuthError("Missing Authorization header.");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new AuthError(
      "Server misconfigured: SUPABASE_URL / SUPABASE_ANON_KEY not set.",
      500,
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new AuthError("Invalid or expired auth token.");
  }

  return { user: data.user, userId: data.user.id };
}
