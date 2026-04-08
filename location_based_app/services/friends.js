import { get, post } from "./api";

export async function getFriends() {
  return get("/api/friends");
}

export async function getFriendRequests() {
  return get("/api/friends/requests");
}

export async function sendFriendRequest(userId) {
  return post("/api/friends/request", { userId });
}

export async function acceptFriendRequest(requestId) {
  return post("/api/friends/accept", { requestId });
}
