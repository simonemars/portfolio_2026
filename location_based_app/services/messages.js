import { get, post } from "./api";
import { supabase } from "./supabase";

export async function getThreads() {
  return get("/api/threads");
}

export async function getMessages(threadId) {
  return get(`/api/threads/${threadId}/messages`);
}

export async function sendMessage(threadId, text) {
  return post(`/api/threads/${threadId}/messages`, { text });
}

export async function createThread(otherUserId) {
  return post("/api/threads", { userId: otherUserId });
}

export function subscribeToMessages(threadId, onNewMessage) {
  const channel = supabase
    .channel(`messages:thread_${threadId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `thread_id=eq.${threadId}`,
      },
      (payload) => {
        onNewMessage(payload.new);
      }
    )
    .subscribe();

  return channel;
}

export function unsubscribeFromMessages(channel) {
  if (channel) {
    supabase.removeChannel(channel);
  }
}
