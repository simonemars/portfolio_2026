import Constants from "expo-constants";

const BASE_URL =
  Constants.expoConfig?.extra?.apiUrl ||
  process.env.EXPO_PUBLIC_API_URL ||
  "http://localhost:8000";

let _authToken = null;

export function setAuthToken(token) {
  _authToken = token;
}

export function clearAuthToken() {
  _authToken = null;
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (_authToken) {
    headers["Authorization"] = `Bearer ${_authToken}`;
  }

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, body);
  }

  if (res.status === 204) return null;
  return res.json();
}

export class ApiError extends Error {
  constructor(status, body) {
    super(`API ${status}: ${body}`);
    this.status = status;
    this.body = body;
  }
}

export function get(path) {
  return request(path, { method: "GET" });
}

export function post(path, body) {
  return request(path, { method: "POST", body: JSON.stringify(body) });
}

export function put(path, body) {
  return request(path, { method: "PUT", body: JSON.stringify(body) });
}

export function del(path) {
  return request(path, { method: "DELETE" });
}
