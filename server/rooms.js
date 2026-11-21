// MINDWAR co-op rooms. A small relay: the first player in a room is the
// simulation host, and the server only routes messages inside that room.
// No gameplay simulation runs here, which keeps the server tiny and lets the
// browser host keep full authority over enemies and checkpoint progression.

import { WebSocketServer } from "ws";
import { hasAccess } from "./security.js";

export const MAX_PLAYERS = 8;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
const MAX_PAYLOAD = 32 * 1024;
const MAX_MSG_PER_SEC = 220;
// Two sockets per player in a full eight-player room, plus reconnect overlap.
const MAX_CONNECTIONS_PER_IP = 16;
const MAX_JOIN_PER_MIN = 10;
const MAX_CREATE_PER_MIN = 5;
const MAX_DAMAGE_REQUEST = 3500;
const MAX_TEAM_HIT = 1000;
const MAX_SHARE_HP = 200;
const MAX_SHARE_AMMO = 2000;
const WORLD_LIMIT = 20000;
const ALLOWED_ORIGINS = String(process.env.ALLOWED_ORIGINS || "")
  .split(",").map(s => s.trim()).filter(Boolean);

const rooms = new Map();
const ipRates = new Map();
const ipConnections = new Map();
let nextPlayerId = 1;

function makeCode() {
  for (let attempt = 0; attempt < 200; attempt++) {
    let code = "";
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    if (!rooms.has(code)) return code;
  }
  return "X" + String(Math.floor(Math.random() * 90000 + 10000));
}

function allowRate(ws, key, limit, windowMs = 1000) {
  const now = Date.now();
  if (!ws.rates) ws.rates = new Map();
  let bucket = ws.rates.get(key);
  if (!bucket || now - bucket.start >= windowMs) {
    bucket = { start: now, count: 0 };
    ws.rates.set(key, bucket);
  }
  bucket.count++;
  return bucket.count <= limit;
}

function allowIp(ip, action, limit, windowMs = 60000) {
  const key = `${ip}:${action}`;
  const now = Date.now();
  let bucket = ipRates.get(key);
  if (!bucket || now - bucket.start >= windowMs) {
    bucket = { start: now, count: 0 };
    ipRates.set(key, bucket);
  }
  bucket.count++;
  return bucket.count <= limit;
}

function cleanNumber(value, min, max, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function originAllowed(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // non-browser clients have no Origin header
  if (ALLOWED_ORIGINS.length) return ALLOWED_ORIGINS.includes(origin);
  try {
    const parsed = new URL(origin);
    return parsed.host === req.headers.host;
  } catch (e) {
    return false;
  }
}

function cleanName(value) {
  const name = String(value ?? "").replace(/[\u0000-\u001f<>]/g, "").trim();
  return (name || "ECHO").slice(0, 14).toUpperCase();
}

function cleanCode(value) {
  return String(value ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, CODE_LENGTH);
}

function uniqueName(room, value) {
  const base = cleanName(value);
  if (!room) return base;
  const taken = new Set(room.players.map(p => p.name));
  if (!taken.has(base)) return base;
  for (let i = 2; i < 100; i++) {
    const candidate = `${base.slice(0, 11)}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base.slice(0, 9)}-${Math.random().toString(36).slice(2, 5)}`.toUpperCase();
}

function send(ws, message) {
  if (!ws || ws.readyState !== 1) return;
  try { ws.send(JSON.stringify(message)); } catch (e) { /* ignore */ }
}

function roomPayload(room) {
  return {
    t: "room",
    code: room.code,
    hostId: room.hostId,
    started: room.started,
    phase: room.phase,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      ready: !!p.ready,
      briefReady: !!p.briefReady
    }))
  };
}

function startPayload(room) {
  return { t: "start", code: room.code, hostId: room.hostId, players: roomPayload(room).players };
}

function cancelBriefing(room, reason) {
  room.phase = "lobby";
  room.started = false;
  for (const p of room.players) {
    p.briefReady = false;
    p.ready = p.id === room.hostId;
  }
  broadcast(room, { t: "briefingCanceled", reason });
  broadcast(room, roomPayload(room));
}

function maybeStartBriefing(room) {
  if (room.phase !== "briefing") return;
  if (room.players.length < 2) {
    cancelBriefing(room, "Not enough players to deploy. Waiting for replacements.");
    return;
  }
  broadcast(room, {
    t: "briefUpdate",
    players: room.players.map(p => ({ id: p.id, name: p.name, briefReady: !!p.briefReady }))
  });
  if (room.players.every(p => p.briefReady)) {
    room.phase = "started";
    room.started = true;
    broadcast(room, startPayload(room));
  }
}

function broadcast(room, message, exceptId = null) {
  for (const p of room.players) {
    if (p.id === exceptId) continue;
    send(p.ws, message);
  }
}

function findPlayer(room, id) {
  return room.players.find(p => p.id === id) || null;
}

function leaveRoom(ws) {
  const room = ws.room;
  if (!room) return;
  ws.room = null;
  const player = findPlayer(room, ws.playerId);
  if (!player) return;
  room.players = room.players.filter(p => p.id !== player.id);

  if (player.id === room.hostId) {
    // Host authority is not migrated in this build: end the session cleanly
    // rather than leaving clients with no enemy simulation.
    broadcast(room, { t: "closed", reason: "The host left the operation." });
    for (const p of room.players) p.ws.room = null;
    rooms.delete(room.code);
    return;
  }

  broadcast(room, { t: "peerLeft", id: player.id, name: player.name });
  broadcast(room, roomPayload(room));
  maybeStartBriefing(room);
}

export function attachRoomServer(httpServer, { path = "/ws" } = {}) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD });

  httpServer.on("upgrade", (req, socket, head) => {
    let pathname = "";
    try { pathname = new URL(req.url, "http://localhost").pathname; } catch (e) { pathname = ""; }
    if (pathname !== path) return;
    if (!originAllowed(req)) {
      socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    if (!hasAccess(req)) {
      socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, ws => {
      ws.ip = req.socket.remoteAddress || "unknown";
      wss.emit("connection", ws);
    });
  });

  wss.on("connection", ws => {
    const ipCount = (ipConnections.get(ws.ip) || 0) + 1;
    if (ipCount > MAX_CONNECTIONS_PER_IP) {
      send(ws, { t: "error", message: "Too many connections from this address." });
      ws.close(4003, "connection limit");
      return;
    }
    ipConnections.set(ws.ip, ipCount);

    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      const left = (ipConnections.get(ws.ip) || 1) - 1;
      if (left <= 0) ipConnections.delete(ws.ip);
      else ipConnections.set(ws.ip, left);
      leaveRoom(ws);
    };

    ws.playerId = nextPlayerId++;
    ws.room = null;
    ws.rates = new Map();
    ws.abuse = 0;
    send(ws, { t: "hello", id: ws.playerId });

    ws.on("message", raw => {
      if (!allowRate(ws, "all", MAX_MSG_PER_SEC)) {
        ws.abuse++;
        if (ws.abuse > 20) {
          try { ws.close(4004, "rate limit"); } catch (e) { /* ignore */ }
        }
        return;
      }
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch (e) { return; }
      if (!msg || typeof msg.t !== "string") return;
      const room = ws.room;
      const me = room ? findPlayer(room, ws.playerId) : null;

      if (msg.t === "create") {
        if (!allowIp(ws.ip, "create", MAX_CREATE_PER_MIN)) {
          send(ws, { t: "error", message: "Too many rooms created. Wait a minute and try again." });
          return;
        }
        if (room) leaveRoom(ws);
        const code = makeCode();
        const created = {
          code,
          hostId: ws.playerId,
          started: false,
          phase: "lobby",
          players: [{ id: ws.playerId, name: cleanName(msg.name), ws, ready: true, briefReady: false }]
        };
        rooms.set(code, created);
        ws.room = created;
        send(ws, { t: "joined", code, hostId: created.hostId, id: ws.playerId, host: true, players: roomPayload(created).players });
        broadcast(created, roomPayload(created));
        return;
      }

      if (msg.t === "join") {
        if (!allowIp(ws.ip, "join", MAX_JOIN_PER_MIN)) {
          send(ws, { t: "error", message: "Too many join attempts. Wait a minute and try again." });
          return;
        }
        if (room) leaveRoom(ws);
        const code = cleanCode(msg.code);
        if (code.length !== CODE_LENGTH) {
          send(ws, { t: "error", message: `Enter the ${CODE_LENGTH}-character room code.` });
          return;
        }
        const target = rooms.get(code);
        if (!target) { send(ws, { t: "error", message: "No room with that code." }); return; }
        if (target.phase !== "lobby" || target.started) {
          send(ws, { t: "error", message: "That operation has already started." });
          return;
        }
        if (target.players.length >= MAX_PLAYERS) {
          send(ws, { t: "error", message: "That room is full." });
          return;
        }
        target.players.push({
          id: ws.playerId,
          name: uniqueName(target, msg.name),
          ws,
          ready: false,
          briefReady: false
        });
        ws.room = target;
        send(ws, { t: "joined", code, hostId: target.hostId, id: ws.playerId, host: false, players: roomPayload(target).players });
        broadcast(target, roomPayload(target));
        return;
      }

      if (msg.t === "leave") { leaveRoom(ws); return; }
      if (!room || !me) return;

      if (msg.t === "ready") {
        if (room.phase !== "lobby" || ws.playerId === room.hostId) return;
        me.ready = !me.ready;
        broadcast(room, roomPayload(room));
        return;
      }

      if (msg.t === "start") {
        if (ws.playerId !== room.hostId || room.phase !== "lobby") return;
        const squad = room.players.filter(p => p.id !== room.hostId);
        if (squad.length === 0) {
          send(ws, { t: "error", message: "Wait for at least one more player to join." });
          return;
        }
        if (squad.some(p => !p.ready)) {
          send(ws, { t: "error", message: "Everyone in the squad must ready up first." });
          return;
        }
        room.phase = "briefing";
        for (const p of room.players) p.briefReady = false;
        broadcast(room, { t: "briefing", code: room.code, players: roomPayload(room).players });
        maybeStartBriefing(room);
        return;
      }

      if (msg.t === "briefReady") {
        if (room.phase !== "briefing" || me.briefReady) return;
        me.briefReady = true;
        maybeStartBriefing(room);
        return;
      }

      if (msg.t === "kick") {
        if (ws.playerId !== room.hostId) return;
        const target = findPlayer(room, Number(msg.to));
        if (!target || target.id === room.hostId) return;
        send(target.ws, { t: "kicked", reason: "The host removed you from the operation." });
        target.ws.room = null;
        room.players = room.players.filter(p => p.id !== target.id);
        broadcast(room, { t: "peerLeft", id: target.id, name: target.name });
        broadcast(room, roomPayload(room));
        maybeStartBriefing(room);
        setTimeout(() => {
          try { target.ws.close(4001, "kicked"); } catch (e) { /* ignore */ }
        }, 80);
        return;
      }

      // Gameplay messages. Host-only traffic is gated so a client cannot take
      // over the enemy simulation or checkpoint state.
      if (msg.t === "p") {
        if (!allowRate(ws, "p", 22)) return;
        const packet = {
          t: "p",
          id: ws.playerId,
          name: me.name,
          x: cleanNumber(msg.x, -WORLD_LIMIT, WORLD_LIMIT),
          y: cleanNumber(msg.y, -1000, WORLD_LIMIT),
          z: cleanNumber(msg.z, -WORLD_LIMIT, WORLD_LIMIT),
          yaw: cleanNumber(msg.yaw, -Math.PI * 4, Math.PI * 4),
          p: cleanNumber(msg.p, -2, 2),
          h: cleanNumber(msg.h, 0, 10000000),
          d: msg.d ? 1 : 0,
          down: msg.down ? 1 : 0,
          w: Math.floor(cleanNumber(msg.w, 0, 7, 0)),
          f: msg.f ? 1 : 0
        };
        broadcast(room, packet, ws.playerId);
        return;
      }
      if (msg.t === "damage") {
        if (!room.started || !allowRate(ws, "damage", 45)) return;
        const id = Math.floor(cleanNumber(msg.id, 0, 1000000000, 0));
        const amount = cleanNumber(msg.amount, 0, MAX_DAMAGE_REQUEST, 0);
        if (id <= 0 || amount <= 0) return;
        send(findPlayer(room, room.hostId)?.ws, {
          t: "damage",
          id,
          amount,
          headshot: !!msg.headshot,
          from: ws.playerId
        });
        return;
      }
      if (msg.t === "teamHit") {
        if (!room.started || !allowRate(ws, "teamHit", 30)) return;
        const target = findPlayer(room, Number(msg.to));
        const amount = cleanNumber(msg.amount, 0, MAX_TEAM_HIT, 0);
        if (target && target.id !== ws.playerId && amount > 0) {
          send(target.ws, { t: "hit", amount, from: ws.playerId, friendly: true });
        }
        return;
      }
      if (msg.t === "share") {
        if (!room.started || !allowRate(ws, "share", 2)) return;
        const target = findPlayer(room, Number(msg.to));
        if (target && target.id !== ws.playerId) {
          send(target.ws, {
            t: "share",
            from: ws.playerId,
            name: me.name,
            hp: cleanNumber(msg.hp, 0, MAX_SHARE_HP, 0),
            ammo: cleanNumber(msg.ammo, 0, MAX_SHARE_AMMO, 0)
          });
        }
        return;
      }
      if (msg.t === "revive") {
        if (!room.started || !allowRate(ws, "revive", 2)) return;
        const target = findPlayer(room, Number(msg.to));
        if (target && target.id !== ws.playerId) {
          send(target.ws, { t: "revive", from: ws.playerId, name: me.name });
        }
        return;
      }
      if (ws.playerId !== room.hostId) return;
      if (msg.t === "snap" || msg.t === "event") {
        broadcast(room, msg, ws.playerId);
        return;
      }
      if (msg.t === "hit") {
        const target = findPlayer(room, Number(msg.to));
        if (target) {
          send(target.ws, {
            t: "hit",
            amount: cleanNumber(msg.amount, 0, 100000, 0),
            from: ws.playerId
          });
        }
      }
    });

    ws.on("close", cleanup);
    ws.on("error", cleanup);
  });

  return wss;
}
