import { get, post } from "./api";

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
