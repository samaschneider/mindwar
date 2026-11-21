// Production co-op server: serves the built client from dist/ and the room
// relay at /ws on the same origin, so invite links work without a proxy.

import http from "node:http";
import os from "node:os";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, isAbsolute, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { attachRoomServer } from "./rooms.js";
import { ACCESS_KEY, accessCookieHeader, hasAccess } from "./security.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(__dirname, "..", "dist");
const port = Number(process.env.PORT || 8787);
// Local-only by default. Set HOST=0.0.0.0 only when you intend to expose it
// on your LAN, and prefer a tunnel over raw port forwarding for internet play.
const host = process.env.HOST || "127.0.0.1";

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff2": "font/woff2"
};

function lanAddresses() {
  const found = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const entry of list || []) {
      if (entry.family !== "IPv4" || entry.internal) continue;
      if (!/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(entry.address)) continue;
      found.push({ address: entry.address, name });
    }
  }
  // Prefer Wi-Fi / Ethernet adapters over virtual adapters.
  found.sort((a, b) => {
    const score = n => /wi-?fi|ethernet|wlan|en0|eth0/i.test(n) ? 0 : 1;
    return score(a.name) - score(b.name);
  });
  return found;
}

function deny(res, status, message) {
  res.writeHead(status, {
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer"
  });
  res.end(message);
}

const server = http.createServer((req, res) => {
  let url;
  try {
    url = new URL(req.url, "http://localhost");
  } catch (e) {
    deny(res, 400, "bad request");
    return;
  }

  if (url.pathname === "/health") {
    res.writeHead(200, { "content-type": "text/plain", "cache-control": "no-store" });
    res.end("ok");
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { allow: "GET, HEAD", "content-type": "text/plain" });
    res.end("method not allowed");
    return;
  }

  if (ACCESS_KEY) {
    if (url.searchParams.get("key") === ACCESS_KEY) {
      res.setHeader("set-cookie", accessCookieHeader());
    } else if (!hasAccess(req)) {
      deny(res, 401, "MINDWAR access key required.");
      return;
    }
  }

  if (url.pathname === "/network") {
    res.writeHead(200, {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    });
    res.end(JSON.stringify({ addresses: lanAddresses(), port }));
    return;
  }

  let pathname = "/";
  try { pathname = decodeURIComponent(url.pathname); } catch (e) { /* fall back to index */ }
  if (pathname.includes("\0")) {
    deny(res, 400, "bad request");
    return;
  }

  let file = normalize(join(root, pathname));
  const inside = relative(root, file);
  if (inside.startsWith("..") || isAbsolute(inside)) {
    deny(res, 403, "forbidden");
    return;
  }
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(root, "index.html");
  if (!existsSync(file)) {
    deny(res, 503, "MINDWAR client not built. Run: npm run build");
    return;
  }

  res.writeHead(200, {
    "content-type": types[extname(file).toLowerCase()] || "application/octet-stream",
    "cache-control": file.endsWith("index.html") ? "no-cache" : "public, max-age=31536000, immutable",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer"
  });
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  createReadStream(file).pipe(res);
});

attachRoomServer(server);

server.listen(port, host, () => {
  const shown = host === "0.0.0.0" ? "localhost" : host;
  console.log(`MINDWAR co-op server on http://${shown}:${port}`);
  if (host === "0.0.0.0") {
    console.log("WARNING: bound to all interfaces. Use a firewall and only share the address with people you trust.");
  } else {
    console.log("Bound to localhost. Use a tunnel (cloudflared/ngrok) for internet play.");
  }
  if (ACCESS_KEY) {
    console.log("Access key required (COOP_KEY is set). Open the game once with ?key=... to receive the access cookie.");
  } else {
    console.log("No access key is set. Anyone who can reach this port can open the lobby.");
  }
  if (!existsSync(root)) console.log("dist/ is missing — run npm run build first.");
});
