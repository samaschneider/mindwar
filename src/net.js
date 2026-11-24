// Thin WebSocket client for the co-op relay in server/rooms.js.
// The same URL works in dev (Vite upgrades /ws) and production (server/index.js).

class NetClient {
  constructor() {
    this.ws = null;
    this.connectPromise = null;
    this.id = null;
    this.handlers = new Map();
    this.closedByUs = false;
  }

  get connected() {
    return !!this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  on(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(fn);
    return () => this.handlers.get(type)?.delete(fn);
  }

  emit(type, payload) {
    const set = this.handlers.get(type);
    if (!set) return;
    for (const fn of [...set]) {
      try { fn(payload); } catch (e) { console.error(`[net] ${type} handler failed`, e); }
    }
  }

  connect() {
    if (this.connected) return Promise.resolve();
    if (this.connectPromise) return this.connectPromise;
    this.closedByUs = false;
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const key = new URLSearchParams(location.search).get("key");
    const suffix = key ? `?key=${encodeURIComponent(key)}` : "";
    const url = `${proto}//${location.host}/ws${suffix}`;
    this.connectPromise = new Promise((resolve, reject) => {
      let settled = false;
      let ws;
      try { ws = new WebSocket(url); } catch (e) { reject(e); return; }
      this.ws = ws;
      const fail = err => {
        if (settled) return;
        settled = true;
        this.connectPromise = null;
        reject(err);
      };
      ws.addEventListener("open", () => {
        if (settled) return;
        settled = true;
        resolve();
      });
      ws.addEventListener("message", ev => {
        let msg;
        try { msg = JSON.parse(ev.data); } catch (e) { return; }
        if (!msg || typeof msg.t !== "string") return;
        if (msg.t === "hello") this.id = msg.id;
        this.emit(msg.t, msg);
      });
      ws.addEventListener("error", () => fail(new Error("Could not reach the co-op server.")));
      ws.addEventListener("close", () => {
        const wasConnected = !!this.connectPromise || settled;
        this.ws = null;
        this.connectPromise = null;
        if (!settled) fail(new Error("Co-op connection closed."));
        if (!this.closedByUs && wasConnected) this.emit("disconnected", {});
      });
    });
    return this.connectPromise;
  }

  send(type, data = {}) {
    if (!this.connected) return false;
    try {
      this.ws.send(JSON.stringify({ t: type, ...data }));
      return true;
    } catch (e) {
      return false;
    }
  }

  createRoom(name) { return this.send("create", { name }); }
  joinRoom(code, name) { return this.send("join", { code, name }); }
  startRoom() { return this.send("start"); }
  readyUp() { return this.send("ready"); }
  briefReady() { return this.send("briefReady"); }
  startMission() { return this.send("briefStart"); }
  leaveRoom() { return this.send("leave"); }

  sendPlayer(state) { return this.send("p", state); }
  sendSnapshot(snapshot) { return this.send("snap", snapshot); }
  sendDamage(enemyId, amount, headshot) {
    return this.send("damage", { id: enemyId, amount, headshot: !!headshot });
  }
  sendEvent(name, data) { return this.send("event", { name, data }); }
  sendHit(to, amount) { return this.send("hit", { to, amount }); }
  sendTeamHit(to, amount) { return this.send("teamHit", { to, amount }); }
  sendShare(to, hp, ammo) { return this.send("share", { to, hp, ammo }); }
  sendRevive(to) { return this.send("revive", { to }); }
  kick(to) { return this.send("kick", { to }); }

  close() {
    this.closedByUs = true;
    try { this.ws?.close(); } catch (e) { /* ignore */ }
    this.ws = null;
    this.connectPromise = null;
    this.id = null;
  }
}

export const net = new NetClient();
