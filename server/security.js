// Shared access-key helpers for the HTTP and WebSocket surfaces.
// Set COOP_KEY to a long random value to require a key on both the page and
// the relay. If it is unset, the server is open to anyone who can reach it.

export const ACCESS_KEY = String(process.env.COOP_KEY || "").trim();
export const ACCESS_COOKIE = "mindwar_key";

function cookieValue(req, name) {
  const raw = req.headers.cookie;
  if (!raw) return "";
  for (const part of raw.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(index + 1).trim());
    } catch (e) {
      return "";
    }
  }
  return "";
}

function queryKey(req) {
  try {
    return new URL(req.url, "http://localhost").searchParams.get("key") || "";
  } catch (e) {
    return "";
  }
}

export function hasAccess(req) {
  if (!ACCESS_KEY) return true;
  if (queryKey(req) === ACCESS_KEY) return true;
  return cookieValue(req, ACCESS_COOKIE) === ACCESS_KEY;
}

export function accessCookieHeader() {
  return `${ACCESS_COOKIE}=${encodeURIComponent(ACCESS_KEY)}; Path=/; HttpOnly; SameSite=Strict`;
}
