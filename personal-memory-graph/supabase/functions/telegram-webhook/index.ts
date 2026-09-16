// supabase/functions/telegram-webhook/index.ts
//
// See README.md in this directory for the full contract. This is the
// target of Telegram's Bot API webhook: it is both the capture surface
// (voice note -> transcribed -> drafted -> confirm/edit -> saved) and the
// ask surface (text question -> routed to `retrieve` or `graph-query`,
// answered) for this personal memory app. There is exactly one real user.
//
// Auth is two-layer and different from every other function in this repo
// (see README "Auth model"): a Telegram-issued webhook secret header, plus
// an optional sender-id allowlist. Once an update is authenticated, this
// function logs in as the single app owner via Supabase's password grant
// (cached across warm invocations) to call `capture`, `save-capture`,
// `retrieve`, and `graph-query` with a real per-user JWT, so their
// RLS-based ownership model keeps working unmodified.
//
// This function almost always answers Telegram with 200, even on internal
// failure -- see the top-level try/catch in the request handler and the
// comment there for why.
import { corsHeaders, jsonHeaders } from "../_shared/cors.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const DATA_MARKER = "[[DATA]]";

// ---------------------------------------------------------------------------
// Telegram Update shapes (only the fields this function uses)
// ---------------------------------------------------------------------------

interface TelegramChat {
  id: number;
}

interface TelegramFrom {
  id: number;
}

interface TelegramVoice {
  file_id: string;
}

interface TelegramReplyToMessage {
  text?: string;
  message_id: number;
}

interface TelegramMessage {
  message_id: number;
  chat: TelegramChat;
  from?: TelegramFrom;
  text?: string;
  voice?: TelegramVoice;
  reply_to_message?: TelegramReplyToMessage;
}

interface TelegramCallbackQueryMessage {
  chat: TelegramChat;
  message_id: number;
  text?: string;
}

interface TelegramCallbackQuery {
  id: string;
  from?: TelegramFrom;
  message?: TelegramCallbackQueryMessage;
  data?: string;
}

interface TelegramUpdate {
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

function isTelegramChat(value: unknown): value is TelegramChat {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).id === "number"
  );
}

function isTelegramFrom(value: unknown): value is TelegramFrom {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).id === "number"
  );
}

function isTelegramMessage(value: unknown): value is TelegramMessage {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;

  if (typeof v.message_id !== "number") return false;
  if (!isTelegramChat(v.chat)) return false;
  if (v.from !== undefined && !isTelegramFrom(v.from)) return false;
  if (v.text !== undefined && typeof v.text !== "string") return false;

  if (v.voice !== undefined) {
    if (typeof v.voice !== "object" || v.voice === null) return false;
    if (typeof (v.voice as Record<string, unknown>).file_id !== "string") return false;
  }

  if (v.reply_to_message !== undefined) {
    const reply = v.reply_to_message;
    if (typeof reply !== "object" || reply === null) return false;
    const replyRecord = reply as Record<string, unknown>;
    if (typeof replyRecord.message_id !== "number") return false;
    if (replyRecord.text !== undefined && typeof replyRecord.text !== "string") return false;
  }

  return true;
}

function isTelegramCallbackQuery(value: unknown): value is TelegramCallbackQuery {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;

  if (typeof v.id !== "string") return false;
  if (v.from !== undefined && !isTelegramFrom(v.from)) return false;
  if (v.data !== undefined && typeof v.data !== "string") return false;

  if (v.message !== undefined) {
    const msg = v.message;
    if (typeof msg !== "object" || msg === null) return false;
    const msgRecord = msg as Record<string, unknown>;
    if (!isTelegramChat(msgRecord.chat)) return false;
    if (typeof msgRecord.message_id !== "number") return false;
    if (msgRecord.text !== undefined && typeof msgRecord.text !== "string") return false;
  }

  return true;
}

function isTelegramUpdate(value: unknown): value is TelegramUpdate {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;

  if (v.message !== undefined && !isTelegramMessage(v.message)) return false;
  if (v.callback_query !== undefined && !isTelegramCallbackQuery(v.callback_query)) return false;

  return true;
}

// ---------------------------------------------------------------------------
// Pending-draft state, encoded directly in the Telegram message text
// (deliberate -- see README "State encoding"; no new database table).
// ---------------------------------------------------------------------------

interface DraftStatePerson {
  /** Existing person id. Omitted entirely (not null/undefined-valued) when this is a new person. */
  i?: string;
  /** Display name. */
  n: string;
  /** 1 if this is a newly proposed person, 0 if it matches an existing one. */
  w: number;
}

interface DraftState {
  /** The draft memory text. */
  t: string;
  p: DraftStatePerson[];
}

function isDraftStatePerson(value: unknown): value is DraftStatePerson {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.n !== "string" || v.n.trim().length === 0) return false;
  if (typeof v.w !== "number") return false;
  if (v.i !== undefined && typeof v.i !== "string") return false;
  return true;
}

function isDraftState(value: unknown): value is DraftState {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.t !== "string" || v.t.trim().length === 0) return false;
  if (!Array.isArray(v.p)) return false;
  return v.p.every(isDraftStatePerson);
}

/**
 * Recovers pending-draft state from a Telegram message's own text (Telegram
 * is the state store; this function stays fully stateless). Returns `null`
 * on any parse failure -- callers must treat that as a recoverable,
 * user-facing situation ("please try again"), never throw.
 */
function parseDraftState(text: string): DraftState | null {
  // lastIndexOf, not indexOf: the real marker is always the one this
  // function itself appended at the end of the message. A draft whose own
  // text happens to contain the literal "[[DATA]]" substring would
  // otherwise have that earlier occurrence found first, and the slice
  // after it would fail to parse as JSON.
  const idx = text.lastIndexOf(DATA_MARKER);
  if (idx === -1) return null;
  const jsonPart = text.slice(idx + DATA_MARKER.length);
  try {
    const parsed = JSON.parse(jsonPart);
    return isDraftState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Builds the confirm-message text (draft + persons + the DATA line the
 * bot later recovers state from) and its inline Save/Discard keyboard.
 */
function buildConfirmMessage(
  draftMemory: string,
  persons: DraftStatePerson[],
): { text: string; replyMarkup: unknown } {
  const aboutLine = persons.length > 0 ? persons.map((p) => p.n).join(", ") : "no one";
  const state: DraftState = { t: draftMemory, p: persons };
  const dataLine = DATA_MARKER + JSON.stringify(state);

  const text = [
    "\u{1F4DD} Draft memory",
    "",
    draftMemory,
    "",
    `About: ${aboutLine}`,
    "",
    "To fix something: swipe on (or long-press → Reply to) this message, then say what to change — e.g. \"his job is urban planning, not architecture.\"",
    "",
    dataLine,
  ].join("\n");

  const replyMarkup = {
    inline_keyboard: [[
      { text: "✅ Save", callback_data: "save" },
      { text: "❌ Discard", callback_data: "discard" },
    ]],
  };

  return { text, replyMarkup };
}

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Server misconfigured: ${name} not set.`);
  }
  return value;
}

// ---------------------------------------------------------------------------
// Supabase session cache -- module scope, persists across warm invocations
// of the same isolate. Logs in as the single app owner (TEST_USER_EMAIL /
// TEST_USER_PASSWORD -- historical names, see README) via the password
// grant, refreshing the token rather than re-logging in when possible.
// ---------------------------------------------------------------------------

interface CachedSession {
  accessToken: string;
  refreshToken: string;
  /** Epoch seconds. */
  expiresAt: number;
}

let cachedSession: CachedSession | null = null;

const SESSION_REFRESH_MARGIN_SECONDS = 60;

interface SupabaseTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in?: number;
}

function isSupabaseTokenResponse(value: unknown): value is SupabaseTokenResponse {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.access_token !== "string" || v.access_token.length === 0) return false;
  if (typeof v.refresh_token !== "string" || v.refresh_token.length === 0) return false;
  if (v.expires_at !== undefined && typeof v.expires_at !== "number") return false;
  if (v.expires_in !== undefined && typeof v.expires_in !== "number") return false;
  return true;
}

function toCachedSession(body: SupabaseTokenResponse): CachedSession {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = body.expires_at ?? now + (body.expires_in ?? 3600);
  return { accessToken: body.access_token, refreshToken: body.refresh_token, expiresAt };
}

async function passwordLogin(supabaseUrl: string, supabaseAnonKey: string): Promise<CachedSession> {
  const email = requireEnv("TEST_USER_EMAIL");
  const password = requireEnv("TEST_USER_PASSWORD");

  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: supabaseAnonKey, "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(`Supabase password login failed with status ${res.status}.`);
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new Error("Supabase password login returned malformed JSON.");
  }
  if (!isSupabaseTokenResponse(body)) {
    throw new Error("Supabase password login returned an unexpected response shape.");
  }
  return toCachedSession(body);
}

/** Never throws -- returns `null` on any failure so the caller falls back to a fresh password login. */
async function tryRefreshSession(
  supabaseUrl: string,
  supabaseAnonKey: string,
  refreshToken: string,
): Promise<CachedSession | null> {
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { apikey: supabaseAnonKey, "content-type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const body = await res.json();
    if (!isSupabaseTokenResponse(body)) return null;
    return toCachedSession(body);
  } catch {
    return null;
  }
}

async function getAccessToken(supabaseUrl: string, supabaseAnonKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  if (cachedSession && cachedSession.expiresAt - now > SESSION_REFRESH_MARGIN_SECONDS) {
    return cachedSession.accessToken;
  }

  if (cachedSession) {
    const refreshed = await tryRefreshSession(supabaseUrl, supabaseAnonKey, cachedSession.refreshToken);
    if (refreshed) {
      cachedSession = refreshed;
      return refreshed.accessToken;
    }
  }

  const fresh = await passwordLogin(supabaseUrl, supabaseAnonKey);
  cachedSession = fresh;
  return fresh.accessToken;
}

// ---------------------------------------------------------------------------
// Request context -- built once per update after auth + allowlist checks
// pass, reused by every handler for that update.
// ---------------------------------------------------------------------------

interface RequestContext {
  supabaseUrl: string;
  supabaseAnonKey: string;
  accessToken: string;
  botToken: string;
  /** RLS-scoped client, authenticated with the single app owner's access token. */
  supabase: SupabaseClient;
}

async function buildContext(botToken: string): Promise<RequestContext> {
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const supabaseAnonKey = requireEnv("SUPABASE_ANON_KEY");
  const accessToken = await getAccessToken(supabaseUrl, supabaseAnonKey);

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false },
  });

  return { supabaseUrl, supabaseAnonKey, accessToken, botToken, supabase };
}

// ---------------------------------------------------------------------------
// Telegram Bot API -- raw fetch, no SDK, matching this project's convention.
// ---------------------------------------------------------------------------

async function callTelegramApi(
  botToken: string,
  method: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  let parsed: unknown = null;
  try {
    parsed = await res.json();
  } catch {
    // Ignore -- handled below via res.ok.
  }

  if (!res.ok) {
    throw new Error(`Telegram API ${method} failed with status ${res.status}.`);
  }
  return parsed;
}

interface TgSendMessageParams {
  chat_id: number;
  text: string;
  reply_markup?: unknown;
  reply_to_message_id?: number;
}

interface TgEditMessageTextParams {
  chat_id: number;
  message_id: number;
  text: string;
  reply_markup?: unknown;
}

async function tgSendMessage(botToken: string, params: TgSendMessageParams): Promise<void> {
  await callTelegramApi(botToken, "sendMessage", params as unknown as Record<string, unknown>);
}

async function tgEditMessageText(botToken: string, params: TgEditMessageTextParams): Promise<void> {
  await callTelegramApi(botToken, "editMessageText", params as unknown as Record<string, unknown>);
}

async function tgEditMessageReplyMarkup(
  botToken: string,
  params: { chat_id: number; message_id: number; reply_markup: unknown },
): Promise<void> {
  await callTelegramApi(botToken, "editMessageReplyMarkup", params as unknown as Record<string, unknown>);
}

async function tgAnswerCallbackQuery(
  botToken: string,
  params: { callback_query_id: string; text?: string; show_alert?: boolean },
): Promise<void> {
  await callTelegramApi(botToken, "answerCallbackQuery", params as unknown as Record<string, unknown>);
}

// "Safe" variants that never throw -- a failure to notify the user should
// never itself crash update handling (the top-level catch would still keep
// this function returning 200 either way, but every send here is already
// best-effort by design, per README).
async function safeSendMessage(botToken: string, params: TgSendMessageParams): Promise<void> {
  try {
    await tgSendMessage(botToken, params);
  } catch (err) {
    console.error("telegram-webhook: sendMessage failed", err);
  }
}

async function safeEditMessageText(botToken: string, params: TgEditMessageTextParams): Promise<void> {
  try {
    await tgEditMessageText(botToken, params);
  } catch (err) {
    console.error("telegram-webhook: editMessageText failed", err);
  }
}

async function safeAnswerCallbackQuery(
  botToken: string,
  callbackQueryId: string,
  params: { text?: string; show_alert?: boolean },
): Promise<void> {
  try {
    await tgAnswerCallbackQuery(botToken, { callback_query_id: callbackQueryId, ...params });
  } catch (err) {
    console.error("telegram-webhook: answerCallbackQuery failed", err);
  }
}

async function safeClearReplyMarkup(botToken: string, chatId: number, messageId: number): Promise<void> {
  try {
    await tgEditMessageReplyMarkup(botToken, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: { inline_keyboard: [] },
    });
  } catch (err) {
    console.error("telegram-webhook: editMessageReplyMarkup failed", err);
  }
}

function extractFilePath(value: unknown): string | null {
  if (typeof value !== "object" || value === null) return null;
  const result = (value as Record<string, unknown>).result;
  if (typeof result !== "object" || result === null) return null;
  const filePath = (result as Record<string, unknown>).file_path;
  return typeof filePath === "string" && filePath.length > 0 ? filePath : null;
}

// ---------------------------------------------------------------------------
// OpenAI Whisper transcription
// ---------------------------------------------------------------------------

interface WhisperResponse {
  text: string;
}

function isWhisperResponse(value: unknown): value is WhisperResponse {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.text === "string" && v.text.trim().length > 0;
}

/** Throws on any failure (network, non-2xx, missing/malformed shape) -- callers treat that as "transcription failed". */
async function transcribeVoice(botToken: string, fileId: string): Promise<string> {
  const openAiKey = requireEnv("OPEN_AI_KEY");

  const fileInfo = await callTelegramApi(botToken, "getFile", { file_id: fileId });
  const filePath = extractFilePath(fileInfo);
  if (!filePath) {
    throw new Error("Telegram getFile returned an unexpected response.");
  }

  const fileRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`);
  if (!fileRes.ok) {
    throw new Error(`Failed to download voice file (status ${fileRes.status}).`);
  }
  const audioBuffer = await fileRes.arrayBuffer();
  const audioBlob = new Blob([audioBuffer], { type: "audio/ogg" });

  const form = new FormData();
  form.append("file", audioBlob, "voice.ogg");
  form.append("model", "whisper-1");

  // No content-type header here -- fetch sets the multipart boundary
  // automatically from the FormData body.
  const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${openAiKey}` },
    body: form,
  });
  if (!whisperRes.ok) {
    throw new Error(`Whisper transcription failed with status ${whisperRes.status}.`);
  }

  let body: unknown;
  try {
    body = await whisperRes.json();
  } catch {
    throw new Error("Whisper returned malformed JSON.");
  }
  if (!isWhisperResponse(body)) {
    throw new Error("Whisper returned an unexpected response shape.");
  }
  return body.text;
}

// ---------------------------------------------------------------------------
// Calls to this repo's own edge functions (capture / save-capture /
// retrieve / graph-query), authenticated with the single app owner's token.
// ---------------------------------------------------------------------------

async function callEdgeFunction(ctx: RequestContext, name: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${ctx.supabaseUrl}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ctx.accessToken}`,
      apikey: ctx.supabaseAnonKey,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  let parsed: unknown = null;
  try {
    parsed = await res.json();
  } catch {
    // Ignore -- handled below via res.ok.
  }

  if (!res.ok) {
    throw new Error(`${name} returned status ${res.status}.`);
  }
  return parsed;
}

// -- capture --

interface CaptureMatchedPerson {
  id: string;
  name: string;
  confidence: number;
  isNew: boolean;
}

interface CaptureResponse {
  draftMemory: string;
  matchedPersons: CaptureMatchedPerson[];
}

function isCaptureMatchedPerson(value: unknown): value is CaptureMatchedPerson {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    v.id.length > 0 &&
    typeof v.name === "string" &&
    v.name.length > 0 &&
    typeof v.confidence === "number" &&
    typeof v.isNew === "boolean"
  );
}

function isCaptureResponse(value: unknown): value is CaptureResponse {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.draftMemory !== "string" || v.draftMemory.trim().length === 0) return false;
  if (!Array.isArray(v.matchedPersons)) return false;
  return v.matchedPersons.every(isCaptureMatchedPerson);
}

async function callCapture(ctx: RequestContext, rawText: string): Promise<CaptureResponse | null> {
  try {
    const raw = await callEdgeFunction(ctx, "capture", { rawText });
    return isCaptureResponse(raw) ? raw : null;
  } catch (err) {
    console.error("telegram-webhook: capture call failed", err);
    return null;
  }
}

// -- save-capture --

interface SaveCapturePersonInput {
  name?: string;
  personId?: string;
}

interface SaveCapturePerson {
  id: string;
  name: string;
}

interface SaveCaptureResponse {
  memoryId: string;
  persons: SaveCapturePerson[];
}

function isSaveCapturePerson(value: unknown): value is SaveCapturePerson {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === "string" && v.id.length > 0 && typeof v.name === "string" && v.name.length > 0;
}

function isSaveCaptureResponse(value: unknown): value is SaveCaptureResponse {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.memoryId !== "string" || v.memoryId.length === 0) return false;
  if (!Array.isArray(v.persons)) return false;
  return v.persons.every(isSaveCapturePerson);
}

async function callSaveCapture(
  ctx: RequestContext,
  memoryText: string,
  persons: SaveCapturePersonInput[],
): Promise<SaveCaptureResponse | null> {
  try {
    const raw = await callEdgeFunction(ctx, "save-capture", { memoryText, persons });
    return isSaveCaptureResponse(raw) ? raw : null;
  } catch (err) {
    console.error("telegram-webhook: save-capture call failed", err);
    return null;
  }
}

// -- retrieve --

interface RetrieveResult {
  personId: string;
  memoryId: string;
  snippet: string;
  relevance: number;
}

interface RetrieveResponse {
  results: RetrieveResult[];
}

function isRetrieveResult(value: unknown): value is RetrieveResult {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.personId === "string" &&
    typeof v.memoryId === "string" &&
    typeof v.snippet === "string" &&
    typeof v.relevance === "number"
  );
}

function isRetrieveResponse(value: unknown): value is RetrieveResponse {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (!Array.isArray(v.results)) return false;
  return v.results.every(isRetrieveResult);
}

async function callRetrieve(ctx: RequestContext, query: string): Promise<RetrieveResponse | null> {
  try {
    const raw = await callEdgeFunction(ctx, "retrieve", { query });
    return isRetrieveResponse(raw) ? raw : null;
  } catch (err) {
    console.error("telegram-webhook: retrieve call failed", err);
    return null;
  }
}

// -- graph-query --

interface GraphQueryPath {
  personIds: string[];
  description: string;
}

interface GraphQueryResponse {
  paths: GraphQueryPath[];
}

function isGraphQueryPath(value: unknown): value is GraphQueryPath {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.description !== "string") return false;
  if (!Array.isArray(v.personIds)) return false;
  return v.personIds.every((id) => typeof id === "string");
}

function isGraphQueryResponse(value: unknown): value is GraphQueryResponse {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (!Array.isArray(v.paths)) return false;
  return v.paths.every(isGraphQueryPath);
}

async function callGraphQuery(ctx: RequestContext, query: string): Promise<GraphQueryResponse | null> {
  try {
    const raw = await callEdgeFunction(ctx, "graph-query", { query });
    return isGraphQueryResponse(raw) ? raw : null;
  } catch (err) {
    console.error("telegram-webhook: graph-query call failed", err);
    return null;
  }
}

// -- direct persons lookup (for retrieve reply formatting; retrieve only
// returns personId, not a name) --

async function lookupPersonNames(ctx: RequestContext, personIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (personIds.length === 0) return map;

  const { data, error } = await ctx.supabase.from("persons").select("id, name").in("id", personIds);
  if (error || !data) return map;

  for (const row of data as { id: string; name: string }[]) {
    map.set(row.id, row.name);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Message classification (Claude, forced tool-choice)
// ---------------------------------------------------------------------------

type ClassifyIntent = "capture" | "retrieve" | "graph_query";

interface ClassifyMessageInput {
  intent: ClassifyIntent;
}

function isClassifyMessageInput(value: unknown): value is ClassifyMessageInput {
  if (typeof value !== "object" || value === null) return false;
  const intent = (value as Record<string, unknown>).intent;
  return intent === "capture" || intent === "retrieve" || intent === "graph_query";
}

const CLASSIFY_TOOL = {
  name: "classify_message",
  description: "Classify what kind of message this is.",
  input_schema: {
    type: "object",
    properties: {
      intent: {
        type: "string",
        enum: ["capture", "retrieve", "graph_query"],
        description:
          "'capture': the user is recounting something that happened or describing a person, meant to be remembered. " +
          "'retrieve': the user is asking to recall/search past memories by meaning. " +
          "'graph_query': the user is asking how they connect to someone through other people.",
      },
    },
    required: ["intent"],
  },
};

function extractClassifyInput(body: unknown): ClassifyMessageInput | null {
  if (typeof body !== "object" || body === null) return null;
  const message = body as Record<string, unknown>;
  if (!Array.isArray(message.content)) return null;

  const toolUse = message.content.find(
    (block): block is Record<string, unknown> =>
      typeof block === "object" &&
      block !== null &&
      (block as Record<string, unknown>).type === "tool_use" &&
      (block as Record<string, unknown>).name === "classify_message",
  );
  if (!toolUse) return null;

  const input = toolUse.input;
  return isClassifyMessageInput(input) ? input : null;
}

/**
 * Classifies a text message's intent via a forced-tool-choice Claude call.
 * Defaults to "capture" on any failure (network error, non-2xx, malformed
 * response) -- capture is the lowest-risk default since it never
 * auto-saves anything, it only drafts.
 */
async function classifyMessage(text: string): Promise<ClassifyIntent> {
  try {
    const anthropicKey = requireEnv("ANTHROPIC_KEY");
    const prompt = [
      "Classify the following message from the user of a personal memory app.",
      "",
      "Message:",
      text,
    ].join("\n");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 256,
        tools: [CLASSIFY_TOOL],
        tool_choice: { type: "tool", name: "classify_message" },
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return "capture";

    const body = await res.json();
    const input = extractClassifyInput(body);
    return input ? input.intent : "capture";
  } catch (err) {
    console.error("telegram-webhook: classification failed, defaulting to capture", err);
    return "capture";
  }
}

// ---------------------------------------------------------------------------
// Answer synthesis (Claude, forced tool-choice) -- turns retrieve's raw
// ranked snippets into a direct answer to the specific question asked.
// Without this, every question that matches the same memory got back the
// identical snippet verbatim regardless of what was actually asked (e.g.
// "who did I meet at the gym?" and "what was Dana doing?" produced the same
// reply) -- fine for a search-results list, not for a conversational bot.
// ---------------------------------------------------------------------------

interface SynthesizeAnswerInput {
  answer: string;
}

function isSynthesizeAnswerInput(value: unknown): value is SynthesizeAnswerInput {
  if (typeof value !== "object" || value === null) return false;
  const answer = (value as Record<string, unknown>).answer;
  return typeof answer === "string" && answer.trim().length > 0;
}

const SYNTHESIZE_ANSWER_TOOL = {
  name: "answer_question",
  description: "Answer the user's question directly, using only the given memory excerpts.",
  input_schema: {
    type: "object",
    properties: {
      answer: {
        type: "string",
        description:
          "A direct, specific answer to the question, grounded only in the given excerpts. " +
          "If the excerpts don't actually answer the question, say so plainly rather than guessing.",
      },
    },
    required: ["answer"],
  },
};

function extractSynthesizeAnswerInput(body: unknown): SynthesizeAnswerInput | null {
  if (typeof body !== "object" || body === null) return null;
  const message = body as Record<string, unknown>;
  if (!Array.isArray(message.content)) return null;

  const toolUse = message.content.find(
    (block): block is Record<string, unknown> =>
      typeof block === "object" &&
      block !== null &&
      (block as Record<string, unknown>).type === "tool_use" &&
      (block as Record<string, unknown>).name === "answer_question",
  );
  if (!toolUse) return null;

  const input = toolUse.input;
  return isSynthesizeAnswerInput(input) ? input : null;
}

/**
 * Synthesizes a direct answer to `query` from a list of "Name: snippet"
 * excerpts. Returns `null` on any failure (network, non-2xx, malformed
 * response) -- callers should fall back to the raw excerpts rather than
 * showing an error, since the underlying `retrieve` results are still good.
 */
async function synthesizeAnswer(query: string, excerpts: string[]): Promise<string | null> {
  try {
    const anthropicKey = requireEnv("ANTHROPIC_KEY");
    const prompt = [
      "The user asked a question about people they personally know, based on memories they've recorded about them.",
      "Answer their question directly and specifically -- don't just repeat a whole memory verbatim if only part of it is relevant to what they asked.",
      "Never use CRM or business language (no \"lead\", \"pipeline\", \"stage\", \"deal\").",
      "",
      "Question:",
      query,
      "",
      "Relevant memory excerpts (name: excerpt):",
      ...excerpts.map((e) => `- ${e}`),
    ].join("\n");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 512,
        tools: [SYNTHESIZE_ANSWER_TOOL],
        tool_choice: { type: "tool", name: "answer_question" },
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return null;

    const body = await res.json();
    const input = extractSynthesizeAnswerInput(body);
    return input ? input.answer : null;
  } catch (err) {
    console.error("telegram-webhook: answer synthesis failed, falling back to raw excerpts", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Correction application (Claude, forced tool-choice) -- used by the
// edit-in-place flow. A reply to a draft is usually a short instruction
// ("he had fun, not a song") rather than a full retyped memory, so using
// the reply text verbatim as the new draft (the original approach) silently
// discarded everything else in the original draft. This applies the
// correction against the original draft instead.
// ---------------------------------------------------------------------------

interface ApplyCorrectionInput {
  correctedMemory: string;
}

function isApplyCorrectionInput(value: unknown): value is ApplyCorrectionInput {
  if (typeof value !== "object" || value === null) return false;
  const corrected = (value as Record<string, unknown>).correctedMemory;
  return typeof corrected === "string" && corrected.trim().length > 0;
}

const APPLY_CORRECTION_TOOL = {
  name: "apply_correction",
  description: "Apply the user's correction to a draft memory and return the corrected text.",
  input_schema: {
    type: "object",
    properties: {
      correctedMemory: {
        type: "string",
        description:
          "The corrected draft memory text, in the same voice as the original. " +
          "Return only the memory text itself, not commentary or a summary.",
      },
    },
    required: ["correctedMemory"],
  },
};

function extractApplyCorrectionInput(body: unknown): ApplyCorrectionInput | null {
  if (typeof body !== "object" || body === null) return null;
  const message = body as Record<string, unknown>;
  if (!Array.isArray(message.content)) return null;

  const toolUse = message.content.find(
    (block): block is Record<string, unknown> =>
      typeof block === "object" &&
      block !== null &&
      (block as Record<string, unknown>).type === "tool_use" &&
      (block as Record<string, unknown>).name === "apply_correction",
  );
  if (!toolUse) return null;

  const input = toolUse.input;
  return isApplyCorrectionInput(input) ? input : null;
}

/**
 * Applies a user's correction/instruction to a draft memory via a
 * forced-tool-choice Claude call. Handles both a short correction
 * instruction ("he had fun, not a song") and a full replacement memory the
 * same way -- the prompt asks Claude to tell them apart. Falls back to the
 * raw correction text verbatim on any failure, matching the old behavior
 * rather than blocking the user from saving anything.
 */
async function applyCorrection(originalText: string, correction: string): Promise<string> {
  try {
    const anthropicKey = requireEnv("ANTHROPIC_KEY");
    const prompt = [
      "Here is a draft memory about someone the user knows:",
      "",
      originalText,
      "",
      "The user replied to it with the following. It's either a short instruction describing what to fix, or a full replacement memory in its own right:",
      "",
      correction,
      "",
      "If it's a short instruction, apply that specific fix to the original draft while preserving everything else the user didn't ask to change, in the same voice.",
      "If it already reads as a complete replacement memory, use it as-is.",
    ].join("\n");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 1024,
        tools: [APPLY_CORRECTION_TOOL],
        tool_choice: { type: "tool", name: "apply_correction" },
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return correction;

    const body = await res.json();
    const input = extractApplyCorrectionInput(body);
    return input ? input.correctedMemory : correction;
  } catch (err) {
    console.error("telegram-webhook: apply-correction failed, using the reply text verbatim", err);
    return correction;
  }
}

// ---------------------------------------------------------------------------
// Draft-state <-> downstream-contract mapping
// ---------------------------------------------------------------------------

function toDraftStatePerson(match: CaptureMatchedPerson): DraftStatePerson {
  return match.isNew ? { n: match.name, w: 1 } : { i: match.id, n: match.name, w: 0 };
}

function toSaveCapturePersonInput(entry: DraftStatePerson): SaveCapturePersonInput {
  const out: SaveCapturePersonInput = {};
  if (entry.w) {
    out.name = entry.n;
  } else {
    if (entry.i) out.personId = entry.i;
    out.name = entry.n;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Flows
// ---------------------------------------------------------------------------

async function runCaptureFlow(
  ctx: RequestContext,
  chatId: number,
  rawText: string,
  replyToMessageId?: number,
): Promise<void> {
  const result = await callCapture(ctx, rawText);
  if (!result) {
    await safeSendMessage(ctx.botToken, {
      chat_id: chatId,
      text: "Sorry, I couldn't draft that memory. Please try again.",
      reply_to_message_id: replyToMessageId,
    });
    return;
  }

  const persons = result.matchedPersons.map(toDraftStatePerson);
  const { text, replyMarkup } = buildConfirmMessage(result.draftMemory, persons);
  await safeSendMessage(ctx.botToken, {
    chat_id: chatId,
    text,
    reply_markup: replyMarkup,
    reply_to_message_id: replyToMessageId,
  });
}

async function runRetrieveFlow(ctx: RequestContext, chatId: number, query: string): Promise<void> {
  const result = await callRetrieve(ctx, query);
  if (!result) {
    await safeSendMessage(ctx.botToken, {
      chat_id: chatId,
      text: "Sorry, I couldn't search your memories right now. Please try again.",
    });
    return;
  }

  if (result.results.length === 0) {
    await safeSendMessage(ctx.botToken, { chat_id: chatId, text: "No matching memories found." });
    return;
  }

  const personIds = [...new Set(result.results.map((r) => r.personId))];
  const names = await lookupPersonNames(ctx, personIds);
  const lines = result.results.map((r) => `${names.get(r.personId) ?? "Someone"} — ${r.snippet}`);

  // Synthesize a direct answer to the actual question from the matched
  // excerpts, rather than just dumping the raw snippet(s) -- otherwise two
  // different questions matching the same memory get back the identical
  // reply regardless of what was actually asked. Falls back to the raw
  // lines if synthesis fails for any reason; the search results themselves
  // are still good even if this extra step doesn't work.
  const synthesized = await synthesizeAnswer(query, lines);
  await safeSendMessage(ctx.botToken, { chat_id: chatId, text: synthesized ?? lines.join("\n") });
}

async function runGraphQueryFlow(ctx: RequestContext, chatId: number, query: string): Promise<void> {
  const result = await callGraphQuery(ctx, query);
  if (!result) {
    await safeSendMessage(ctx.botToken, {
      chat_id: chatId,
      text: "Sorry, I couldn't look that up right now. Please try again.",
    });
    return;
  }

  if (result.paths.length === 0) {
    await safeSendMessage(ctx.botToken, { chat_id: chatId, text: "No connecting path found." });
    return;
  }

  const lines = result.paths.map((p) => p.description);
  await safeSendMessage(ctx.botToken, { chat_id: chatId, text: lines.join("\n") });
}

async function handleVoiceMessage(message: TelegramMessage, ctx: RequestContext): Promise<void> {
  const chatId = message.chat.id;

  let transcript: string;
  try {
    transcript = await transcribeVoice(ctx.botToken, message.voice!.file_id);
  } catch (err) {
    console.error("telegram-webhook: voice transcription failed", err);
    await safeSendMessage(ctx.botToken, {
      chat_id: chatId,
      text: "Sorry, I couldn't transcribe that voice note. Please try again or type it instead.",
      reply_to_message_id: message.message_id,
    });
    return;
  }

  await runCaptureFlow(ctx, chatId, transcript, message.message_id);
}

async function handleEditInPlace(message: TelegramMessage, ctx: RequestContext): Promise<void> {
  const chatId = message.chat.id;
  const replyText = message.reply_to_message?.text ?? "";

  const state = parseDraftState(replyText);
  if (!state) {
    await safeSendMessage(ctx.botToken, {
      chat_id: chatId,
      text: "Couldn't read that draft — please try again.",
      reply_to_message_id: message.message_id,
    });
    return;
  }

  // The reply is usually a short correction instruction ("he had fun, not
  // a song"), not a full retyped memory -- using it verbatim as the new
  // draft text (the original approach) silently discarded everything else
  // in the original. Apply it against the original draft instead.
  const correction = (message.text ?? "").trim();
  const newText = await applyCorrection(state.t, correction);
  const { text, replyMarkup } = buildConfirmMessage(newText, state.p);
  await safeSendMessage(ctx.botToken, {
    chat_id: chatId,
    text,
    reply_markup: replyMarkup,
    reply_to_message_id: message.message_id,
  });

  // The message being replied to is now superseded by the one just sent
  // above -- clear its buttons so a stale tap can't save the uncorrected
  // text. Best-effort: if this fails, the new message is still the correct
  // one to act on, just with an extra (now-orphaned) live prompt above it.
  await safeClearReplyMarkup(ctx.botToken, chatId, message.reply_to_message!.message_id);
}

async function handleTextMessage(message: TelegramMessage, ctx: RequestContext): Promise<void> {
  const chatId = message.chat.id;
  const text = (message.text ?? "").trim();

  const intent = await classifyMessage(text);

  if (intent === "retrieve") {
    await runRetrieveFlow(ctx, chatId, text);
    return;
  }
  if (intent === "graph_query") {
    await runGraphQueryFlow(ctx, chatId, text);
    return;
  }
  await runCaptureFlow(ctx, chatId, text, message.message_id);
}

async function handleCallbackQuery(cq: TelegramCallbackQuery, ctx: RequestContext): Promise<void> {
  const chatMessage = cq.message;
  if (!chatMessage) {
    await safeAnswerCallbackQuery(ctx.botToken, cq.id, {
      text: "This draft is no longer available.",
      show_alert: true,
    });
    return;
  }

  const chatId = chatMessage.chat.id;
  const messageId = chatMessage.message_id;

  if (cq.data === "discard") {
    await safeEditMessageText(ctx.botToken, {
      chat_id: chatId,
      message_id: messageId,
      text: "Discarded.",
      reply_markup: { inline_keyboard: [] },
    });
    await safeAnswerCallbackQuery(ctx.botToken, cq.id, {});
    return;
  }

  if (cq.data !== "save") {
    await safeAnswerCallbackQuery(ctx.botToken, cq.id, {
      text: "Unrecognized action.",
      show_alert: true,
    });
    return;
  }

  const state = parseDraftState(chatMessage.text ?? "");
  if (!state) {
    await safeAnswerCallbackQuery(ctx.botToken, cq.id, {
      text: "Couldn't read that draft — please try again.",
      show_alert: true,
    });
    return;
  }

  const persons = state.p.map(toSaveCapturePersonInput);
  const result = await callSaveCapture(ctx, state.t, persons);
  if (!result) {
    // Leave the original message/buttons in place so the user can retry.
    await safeAnswerCallbackQuery(ctx.botToken, cq.id, {
      text: "Couldn't save — please try again.",
      show_alert: true,
    });
    return;
  }

  const names = result.persons.map((p) => p.name);
  const summary =
    names.length > 0 ? `✅ Saved. Linked to: ${names.join(", ")}.` : "✅ Saved. Not linked to anyone.";

  await safeEditMessageText(ctx.botToken, {
    chat_id: chatId,
    message_id: messageId,
    text: summary,
    reply_markup: { inline_keyboard: [] },
  });
  await safeAnswerCallbackQuery(ctx.botToken, cq.id, {});
}

// ---------------------------------------------------------------------------
// Sender allowlist (defense in depth -- see README "Auth model")
// ---------------------------------------------------------------------------

function isAllowedSender(senderId: number | undefined): boolean {
  const allowed = Deno.env.get("TELEGRAM_ALLOWED_USER_ID");
  if (!allowed) return true; // Unset -- check disabled, documented v1 tradeoff.
  if (senderId === undefined) return false;
  return String(senderId) === allowed;
}

// ---------------------------------------------------------------------------
// Update routing
// ---------------------------------------------------------------------------

async function routeUpdate(update: TelegramUpdate): Promise<void> {
  const botToken = requireEnv("TOKEN_TELEGRAM_BOT");

  if (update.callback_query) {
    const senderId = update.callback_query.from?.id;
    if (!isAllowedSender(senderId)) {
      console.log("telegram-webhook: ignoring callback_query from disallowed sender", senderId);
      return;
    }
    const ctx = await buildContext(botToken);
    await handleCallbackQuery(update.callback_query, ctx);
    return;
  }

  const message = update.message;
  if (!message) {
    console.log("telegram-webhook: update had neither message nor callback_query, ignoring");
    return;
  }

  const senderId = message.from?.id;
  if (!isAllowedSender(senderId)) {
    console.log("telegram-webhook: ignoring message from disallowed sender", senderId);
    return;
  }

  const ctx = await buildContext(botToken);

  if (message.voice) {
    await handleVoiceMessage(message, ctx);
    return;
  }

  if (typeof message.text === "string" && message.text.trim().length > 0) {
    const replyText = message.reply_to_message?.text;
    if (replyText && replyText.includes(DATA_MARKER)) {
      await handleEditInPlace(message, ctx);
      return;
    }
    await handleTextMessage(message, ctx);
    return;
  }

  console.log("telegram-webhook: message had neither text nor voice, ignoring");
}

async function bestEffortNotifyError(update: TelegramUpdate): Promise<void> {
  const botToken = Deno.env.get("TOKEN_TELEGRAM_BOT");
  if (!botToken) return;

  const chatId = update.message?.chat.id ?? update.callback_query?.message?.chat.id;
  if (chatId === undefined) return;

  await safeSendMessage(botToken, {
    chat_id: chatId,
    text: "Sorry, something went wrong processing that. Please try again.",
  });
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

function okResponse(): Response {
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: jsonHeaders() });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    const body = { error: "Method not allowed. Use POST." };
    return new Response(JSON.stringify(body), { status: 405, headers: jsonHeaders() });
  }

  // Layer 1 (the only genuine non-200 in this function): Telegram's own
  // webhook secret token, registered via `setWebhook` and echoed back on
  // every call as this header. A missing or mismatched header means the
  // request didn't originate from our registered webhook -- reject before
  // touching the body at all.
  const expectedSecret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
  const providedSecret = req.headers.get("X-Telegram-Bot-Api-Secret-Token");
  if (!expectedSecret || !providedSecret || providedSecret !== expectedSecret) {
    const body = { error: "Unauthorized." };
    return new Response(JSON.stringify(body), { status: 401, headers: jsonHeaders() });
  }

  // From here on this function always returns 200 to Telegram, success or
  // failure: Telegram retries updates that don't get a 200, and since this
  // function has side effects (sends messages, may save data), a retry
  // after partial failure risks duplicate processing. Every failure path
  // below is logged via console.error (for query_logs visibility) and,
  // where possible, best-effort reported to the user.
  let update: unknown;
  try {
    update = await req.json();
  } catch {
    console.error("telegram-webhook: request body was not valid JSON");
    return okResponse();
  }

  if (!isTelegramUpdate(update)) {
    console.error("telegram-webhook: update did not match the expected shape", update);
    return okResponse();
  }

  try {
    await routeUpdate(update);
  } catch (err) {
    console.error("telegram-webhook: unhandled error while processing update", err);
    await bestEffortNotifyError(update);
  }

  return okResponse();
});
