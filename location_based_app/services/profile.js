import { get, put } from "./api";

export async function getMe() {
  return get("/api/me");
}

export async function updateMe(body) {
  return put("/api/me", body);
}
