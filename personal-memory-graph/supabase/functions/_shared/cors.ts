// Shared CORS headers for the personal-memory-graph edge functions.
// The client (Expo app) is not yet locked to a fixed origin, so this stays
// permissive on origin but restricts allowed request headers.
export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function jsonHeaders(): Record<string, string> {
  return { ...corsHeaders, "Content-Type": "application/json" };
}
