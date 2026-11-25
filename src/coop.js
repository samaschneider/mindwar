// Co-op campaign layer.
// The first player in a room is the host and owns enemy simulation and
// checkpoint progression. Everyone renders the host's enemies, sends damage
// requests, and sees the other players as soldier avatars.

import * as THREE from "three";
import { createSoldier, Enemy } from "./enemies.js";
import { net } from "./net.js";
import { maraLine } from "./mara.js";
import { vexLine } from "./vex.js";
import { ZONE_COUNT } from "./zones.js";
import { coopStoryLine } from "./story.js";

const $ = id => document.getElementById(id);

// Every cleared checkpoint makes the whole team hit harder and take less.
const CHECKPOINT_DAMAGE_BONUS = 0.10;
const CHECKPOINT_DAMAGE_REDUCTION = 0.05;
const MAX_DAMAGE_REDUCTION = 0.60;

// Co-op waves grow by one fifth of the solo total for every additional
// player: two players 1.2x, four players 1.6x, eight players 2.4x. The
// simultaneous cap uses the same factor so the extra hostiles actually share
// the battlefield instead of only lengthening each fight. Solo stays at 1x.
const COOP_ENEMY_GROWTH_PER_PLAYER = 0.2;
const COOP_MAX_ALIVE_CAP = 120;

function r2(v) { return Math.round(v * 100) / 100; }

function angleLerp(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function raySphere(origin, dir, cx, cy, cz, radius) {
  const ox = origin.x - cx, oy = origin.y - cy, oz = origin.z - cz;
  const b = ox * dir.x + oy * dir.y + oz * dir.z;
  const c = ox * ox + oy * oy + oz * oz - radius * radius;
  const disc = b * b - c;
  if (disc < 0) return -1;
  const t = -b - Math.sqrt(disc);
  return t > 0 ? t : -1;
}

function makeNameTag(name) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(6, 12, 16, 0.62)";
  ctx.fillRect(24, 12, 208, 40);
  ctx.strokeStyle = "rgba(120, 240, 190, 0.35)";
  ctx.strokeRect(24, 12, 208, 40);
  ctx.font = "700 26px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#a9f7ce";
  ctx.fillText(String(name).toUpperCase().slice(0, 14), 128, 32);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture, transparent: true, depthTest: false, depthWrite: false, fog: false
  }));
  sprite.scale.set(2.1, 0.52, 1);
  sprite.position.y = 2.42;
  return sprite;
}

function makeAvatar(name, id) {
  const model = createSoldier("ally", id);
  model.group.scale.setScalar(model.baseScale);
  const tag = makeNameTag(name);
  model.group.add(tag);
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 6, 5),
    new THREE.MeshBasicMaterial({ color: 0xfff1c4, fog: false })
  );
  flash.visible = false;
  if (model.parts.muzzle) model.parts.muzzle.add(flash);
  return {
    id, name, model, tag, flash,
    pos: new THREE.Vector3(),
    target: new THREE.Vector3(),
    yaw: 0,
    targetYaw: 0,
    speed: 0,
    walk: 0,
    dead: false,
    firing: false
  };
}

class CoopClient {
  constructor() {
    this.active = false;
    this.role = null;
    this.code = null;
    this.isHost = false;
    this.hostId = null;
    this.roomPlayers = [];
    this.names = new Map();
    this.avatars = new Map();
    this.proxies = new Map();
    this.puppets = new Map();
    this.presence = [];
    this.latestSnapshot = null;
    this.latestMara = null;
    this.maraPuppet = null;
    this.playerTimer = 0;
    this.snapTimer = 0;
    this.deps = null;
    this.bound = false;
    this.roomParam = new URLSearchParams(location.search).get("room");
    this.dealBonus = 0;
    this.takeBonus = 0;
    this.shareReadyAt = 0;
    this.localName = "ECHO";
    this.lanHost = null;
    this.lanHosts = [];
    this.downed = false;
    this.downUntil = 0;
    this.reviveHold = 0;
    this.reviveTargetId = null;
    this.reviveSentUntil = 0;
    this.kicked = false;
    this.damageBudget = new Map();
    this.lastFriendlyHitAt = 0;
    this.briefLines = [];
    this.briefIndex = 0;
    this.briefLocalReady = false;
    this.briefPlayers = [];
    this.briefStarting = false;
  }

  init(deps) {
    this.deps = deps;
    const weapons = deps.player?.weapons;
    if (weapons) {
      weapons.friendlyRaycast = (origin, dir, maxDist) => this.raycastFriendly(origin, dir, maxDist);
      weapons.friendlyDamage = (hit, amount, headshot) => this.applyFriendlyHit(hit, amount, headshot);
    }
    this.bindLobby();
    this.bindNet();
    this.loadLanInfo();
    if (this.roomParam) {
      this.openLobby();
      $("mp-code").value = String(this.roomParam).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    }
  }

  /* ------------------------------- lobby ---------------------------------- */
  bindLobby() {
    if (this.bound) return;
    this.bound = true;
    $("btn-multiplayer")?.addEventListener("click", () => this.openLobby());
    $("btn-mp-close")?.addEventListener("click", () => this.closeLobby());
    $("btn-mp-create")?.addEventListener("click", () => this.createRoom());
    $("btn-mp-join")?.addEventListener("click", () => this.joinRoom());
    $("btn-mp-copy")?.addEventListener("click", () => this.copyInvite());
    $("btn-mp-leave")?.addEventListener("click", () => this.leaveRoom());
    $("btn-mp-start")?.addEventListener("click", () => net.startRoom());
    $("btn-mp-ready")?.addEventListener("click", () => net.readyUp());
    $("btn-brief-next")?.addEventListener("click", () => this.briefNext());
    $("btn-brief-ready")?.addEventListener("click", () => this.sendBriefReady());
    $("btn-brief-leave")?.addEventListener("click", () => this.leaveRoom());
    $("btn-brief-exit")?.addEventListener("click", () => this.leaveRoom());
    $("btn-brief-start")?.addEventListener("click", () => this.startMission());
    $("btn-downed-giveup")?.addEventListener("click", () => this.bleedOut());
    $("mp-code")?.addEventListener("keydown", e => { if (e.key === "Enter") this.joinRoom(); });
    $("mp-name")?.addEventListener("keydown", e => { if (e.key === "Enter") this.joinRoom(); });
    const saved = localStorage.getItem("mindwar_callsign");
    if (saved) $("mp-name").value = saved;
  }

  callsign() {
    const value = ($("mp-name")?.value || "").trim().toUpperCase().replace(/[^A-Z0-9 _-]/g, "").slice(0, 14);
    return value || `ECHO-${1 + Math.floor(Math.random() * 9)}`;
  }

  status(text, bad = false) {
    const el = $("mp-status");
    if (!el) return;
    el.textContent = text || "";
    el.classList.toggle("bad", !!bad);
  }

  openLobby() {
    $("start-screen")?.classList.add("hidden");
    $("mp-screen")?.classList.remove("hidden");
    this.status("Connecting to the co-op relay…");
    net.connect().then(() => {
      if (!this.code) this.status("Create a room or enter a friend's code.");
    }).catch(err => this.status(err.message || "Co-op server unavailable.", true));
    setTimeout(() => $("mp-name")?.focus(), 80);
  }

  closeLobby() {
    if (this.code && !this.active) {
      net.leaveRoom();
      this.code = null;
      this.isHost = false;
      $("mp-room")?.classList.add("hidden");
    }
    $("mp-screen")?.classList.add("hidden");
    $("start-screen")?.classList.remove("hidden");
  }

  async ensureConnected() {
    try {
      await net.connect();
      return true;
    } catch (e) {
      this.status(e.message || "Could not reach the co-op server.", true);
      return false;
    }
  }

  async createRoom() {
    if (!(await this.ensureConnected())) return;
    localStorage.setItem("mindwar_callsign", this.callsign());
    this.status("Creating room…");
    net.createRoom(this.callsign());
  }

  async joinRoom() {
    const code = ($("mp-code")?.value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    if (code.length !== 6) { this.status("Enter the 6-character room code.", true); return; }
    if (!(await this.ensureConnected())) return;
    localStorage.setItem("mindwar_callsign", this.callsign());
    this.status("Joining room…");
    net.joinRoom(code, this.callsign());
  }

  leaveRoom() {
    net.leaveRoom();
    this.code = null;
    this.isHost = false;
    $("mp-room")?.classList.add("hidden");
    $("brief-screen")?.classList.add("hidden");
    $("mp-screen")?.classList.add("hidden");
    $("start-screen")?.classList.remove("hidden");
    this.briefLocalReady = false;
    this.status("Left the room.");
  }

  copyInvite() {
    const value = $("mp-invite")?.value || "";
    if (!value) return;
    navigator.clipboard?.writeText(value).then(
      () => this.status("Invite link copied."),
      () => this.status("Copy failed — select the link and copy it manually.", true)
    );
  }

  isLoopback() {
    const host = location.hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
  }

  loadLanInfo() {
    fetch("/network", { cache: "no-store" })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data || !Array.isArray(data.addresses)) return;
        const addresses = data.addresses.map(a => a?.address).filter(Boolean);
        if (!addresses.length) return;
        this.lanHosts = addresses;
        this.lanHost = addresses[0];
        if (this.code) this.updateInvite();
      })
      .catch(() => { /* dev server or blocked; the warning explains it */ });
  }

  updateInvite() {
    const invite = $("mp-invite");
    if (invite && this.code) invite.value = this.inviteUrl();
    const warn = $("mp-invite-warning");
    if (!warn) return;
    if (!this.code) {
      warn.classList.add("hidden");
      return;
    }
    const loopback = this.isLoopback();
    const port = location.port || (location.protocol === "https:" ? "443" : "80");
    if (loopback && this.lanHost) {
      warn.classList.remove("hidden");
      warn.textContent = `Invite uses your LAN address ${this.lanHost}:${port}. Friends must be on the same Wi-Fi. For remote play, open the game through your tunnel URL.`;
    } else if (loopback) {
      warn.classList.remove("hidden");
      warn.textContent = "This invite only works on this PC. Run npm start, then open the game using your LAN address (for example http://192.168.x.x:8787) before creating the room.";
    } else {
      warn.classList.add("hidden");
    }
  }

  inviteUrl() {
    const url = new URL(location.href);
    const key = new URLSearchParams(location.search).get("key");
    if (this.isLoopback() && this.lanHost) url.hostname = this.lanHost;
    url.search = "";
    if (key) url.searchParams.set("key", key);
    if (this.code) url.searchParams.set("room", this.code);
    return url.toString();
  }

  renderRoster(hostId) {
    const wrap = $("mp-roster");
    if (!wrap) return;
    wrap.innerHTML = "";
    for (const p of this.roomPlayers) {
      const row = document.createElement("div");
      row.className = "mp-player";
      const name = document.createElement("strong");
      name.textContent = p.name;
      const meta = document.createElement("span");
      meta.className = "mp-status-tag";
      if (p.id === hostId) {
        meta.textContent = "HOST";
      } else {
        meta.textContent = p.ready ? "READY" : "WAITING";
        meta.classList.toggle("ready", !!p.ready);
      }
      if (p.id === net.id) {
        const you = document.createElement("em");
        you.textContent = "YOU";
        row.append(name, you, meta);
      } else {
        row.append(name, meta);
        if (this.isHost) {
          const kick = document.createElement("button");
          kick.type = "button";
          kick.className = "mp-kick";
          kick.textContent = "KICK";
          kick.addEventListener("click", () => net.kick(p.id));
          row.appendChild(kick);
        }
      }
      wrap.appendChild(row);
    }
    const squad = this.roomPlayers.filter(p => p.id !== hostId);
    const allReady = squad.length > 0 && squad.every(p => p.ready);
    const start = $("btn-mp-start");
    if (start) {
      start.classList.toggle("hidden", !this.isHost);
      start.textContent = this.isHost
        ? (squad.length === 0
          ? "WAITING FOR PLAYERS"
          : allReady ? "START BRIEFING" : "WAITING FOR READY")
        : "WAITING FOR HOST";
      start.disabled = !this.isHost || !allReady;
    }
    const ready = $("btn-mp-ready");
    if (ready) {
      const me = this.roomPlayers.find(p => p.id === net.id);
      ready.classList.toggle("hidden", this.isHost);
      ready.textContent = me?.ready ? "CANCEL READY" : "READY UP";
      ready.classList.toggle("active", !!me?.ready);
    }
    this.renderPauseRoster();
  }

  handleBriefing(msg) {
    this.roomPlayers = msg.players || this.roomPlayers;
    const seen = new Set();
    this.briefLines = [];
    for (let i = 0; i < 4; i++) {
      let line = maraLine("intro");
      let guard = 0;
      while (seen.has(line) && guard++ < 12) line = maraLine("intro");
      seen.add(line);
      this.briefLines.push(line);
    }
    this.briefIndex = 0;
    this.briefLocalReady = false;
    this.briefStarting = false;
    this.briefPlayers = (msg.players || []).map(p => ({ ...p, briefReady: !!p.briefReady }));
    $("mp-screen")?.classList.add("hidden");
    $("brief-screen")?.classList.remove("hidden");
    const status = $("brief-status");
    if (status) status.textContent = "READ THE BRIEFING // NEXT TO CONTINUE";
    this.renderBriefLine();
    this.renderBriefWaiting(this.briefPlayers);
    this.renderBriefStart();
  }

  renderBriefLine() {
    const last = this.briefIndex >= this.briefLines.length - 1;
    const text = $("brief-text");
    if (text) {
      text.textContent = this.briefLines[this.briefIndex] || "";
      text.classList.remove("line-in");
      void text.offsetWidth;
      text.classList.add("line-in");
    }
    const progress = $("brief-progress");
    if (progress) {
      progress.textContent = `TRANSMISSION ${this.briefIndex + 1} / ${this.briefLines.length}`;
    }
    $("btn-brief-next")?.classList.toggle("hidden", last || this.briefLocalReady);
    $("btn-brief-ready")?.classList.toggle("hidden", !last || this.briefLocalReady);
  }

  briefNext() {
    if (this.briefLocalReady) return;
    if (this.briefIndex < this.briefLines.length - 1) {
      this.briefIndex++;
      this.renderBriefLine();
    }
  }

  sendBriefReady() {
    if (this.briefLocalReady) return;
    this.briefLocalReady = true;
    net.briefReady();
    $("btn-brief-next")?.classList.add("hidden");
    $("btn-brief-ready")?.classList.add("hidden");
    const me = this.briefPlayers.find(p => p.id === net.id);
    if (me) me.briefReady = true;
    const waiting = this.briefPlayers.filter(p => !p.briefReady && p.id !== net.id);
    const status = $("brief-status");
    if (status) {
      status.textContent = waiting.length
        ? "READY // WAITING FOR THE REST OF THE SQUAD"
        : this.isHost
          ? "ALL PLAYERS READY // START MISSION WHEN READY"
          : "SQUAD READY // WAITING FOR HOST TO START";
    }
    this.renderBriefStart();
    this.renderBriefWaiting(this.briefPlayers);
  }

  handleBriefUpdate(msg) {
    this.briefPlayers = (msg.players || []).map(p => ({ ...p }));
    this.renderBriefWaiting(this.briefPlayers);
    this.renderBriefStart();
    const waiting = this.briefPlayers.filter(p => !p.briefReady && p.id !== net.id);
    const status = $("brief-status");
    if (!status) return;
    if (this.briefLocalReady) {
      status.textContent = waiting.length
        ? `WAITING FOR ${waiting.map(p => p.name).join(", ")}`
        : this.isHost
          ? "ALL PLAYERS READY // START MISSION WHEN READY"
          : "SQUAD READY // WAITING FOR HOST TO START";
    } else {
      status.textContent = "READ THE BRIEFING // NEXT TO CONTINUE";
    }
  }

  renderBriefStart() {
    const btn = $("btn-brief-start");
    if (!btn) return;
    if (!this.isHost) {
      btn.classList.add("hidden");
      return;
    }
    btn.classList.remove("hidden");
    const allReady = this.briefPlayers.length >= 2 &&
      this.briefPlayers.every(p => p.briefReady);
    btn.disabled = !allReady || this.briefStarting;
    btn.title = allReady
      ? "All players are ready. Start the operation."
      : "Every player must finish the briefing and click READY first.";
    if (!this.briefStarting) btn.innerHTML = 'START MISSION <span>›</span>';
  }

  startMission() {
    if (!this.isHost || this.briefStarting) return;
    if (this.briefPlayers.length < 2 || !this.briefPlayers.every(p => p.briefReady)) return;
    this.briefStarting = true;
    const btn = $("btn-brief-start");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "STARTING...";
    }
    const status = $("brief-status");
    if (status) status.textContent = "STARTING OPERATION...";
    net.startMission();
    setTimeout(() => {
      if (this.active || !this.briefStarting) return;
      this.briefStarting = false;
      this.renderBriefStart();
      if (status) status.textContent = "COULD NOT START // TRY AGAIN";
    }, 3000);
  }

  renderBriefWaiting(players) {
    const wrap = $("brief-waiting");
    if (!wrap) return;
    wrap.innerHTML = "";
    const waiting = (players || []).filter(p => !p.briefReady);
    if (!waiting.length) return;
    for (const p of waiting) {
      const row = document.createElement("div");
      row.className = "brief-waiting-row";
      const name = document.createElement("strong");
      name.textContent = p.name;
      const tag = document.createElement("span");
      tag.textContent = p.id === this.hostId ? "HOST" : "READING";
      row.append(name, tag);
      if (this.isHost && p.id !== net.id) {
        const kick = document.createElement("button");
        kick.type = "button";
        kick.className = "mp-kick";
        kick.textContent = "KICK";
        kick.addEventListener("click", () => net.kick(p.id));
        row.appendChild(kick);
      }
      wrap.appendChild(row);
    }
  }

  renderPauseRoster() {
    const wrap = $("pause-coop");
    if (!wrap) return;
    if (!this.active || !this.isHost || !this.roomPlayers.length) {
      wrap.classList.add("hidden");
      return;
    }
    wrap.classList.remove("hidden");
    wrap.innerHTML = "";
    const label = document.createElement("div");
    label.className = "label";
    label.textContent = "CO-OP SQUAD // HOST CONTROLS";
    wrap.appendChild(label);
    for (const p of this.roomPlayers) {
      const row = document.createElement("div");
      row.className = "pause-coop-row";
      const name = document.createElement("strong");
      name.textContent = p.name;
      row.appendChild(name);
      if (p.id === net.id) {
        const you = document.createElement("em");
        you.textContent = "YOU";
        row.appendChild(you);
      } else {
        const kick = document.createElement("button");
        kick.type = "button";
        kick.className = "mp-kick";
        kick.textContent = "KICK";
        kick.addEventListener("click", () => net.kick(p.id));
        row.appendChild(kick);
      }
      wrap.appendChild(row);
    }
  }

  showRoom(hostId) {
    $("mp-room")?.classList.remove("hidden");
    $("mp-room-code").textContent = this.code || "----";
    this.updateInvite();
    this.renderRoster(hostId);
    this.status(this.isHost
      ? "Room ready. Send the invite link, then start when your squad is in."
      : "Waiting for the host to start the operation.");
  }

  /* -------------------------------- net ----------------------------------- */
  bindNet() {
    net.on("joined", msg => {
      this.code = msg.code;
      this.isHost = !!msg.host;
      this.hostId = msg.hostId ?? (this.isHost ? net.id : null);
      this.roomPlayers = msg.players || [];
      this.names = new Map(this.roomPlayers.map(p => [p.id, p.name]));
      this.showRoom(this.hostId);
    });
    net.on("room", msg => {
      this.code = msg.code;
      this.hostId = msg.hostId;
      this.isHost = msg.hostId === net.id;
      this.roomPlayers = msg.players || [];
      this.names = new Map(this.roomPlayers.map(p => [p.id, p.name]));
      if (!this.active) this.showRoom(msg.hostId);
    });
    net.on("start", msg => this.handleStart(msg));
    net.on("p", msg => this.onPlayer(msg));
    net.on("snap", msg => {
      if (this.role !== "client") return;
      this.latestSnapshot = msg.e || [];
      this.latestMara = msg.m || null;
      this.deps.enemies.kills = Number(msg.k) || 0;
      const active = this.deps.enemies.states[this.deps.enemies.activeIndex];
      if (active) active.killed = Number(msg.c) || 0;
    });
    net.on("damage", msg => this.onDamageRequest(msg));
    net.on("hit", msg => {
      if (!this.active) return;
      const amount = Number(msg.amount);
      if (!Number.isFinite(amount) || amount <= 0) return;
      if (msg.friendly) {
        // Player-to-player damage is validated on the receiving client too.
        if (amount > 1000) return;
        const now = performance.now();
        if (now - this.lastFriendlyHitAt < 35) return;
        this.lastFriendlyHitAt = now;
        const sender = this.avatars.get(msg.from);
        if (!sender || sender.dead || sender.downed) return;
        if (Math.hypot(
          sender.pos.x - this.deps.player.pos.x,
          sender.pos.z - this.deps.player.pos.z
        ) > 380) return;
      } else if (amount > 100000) {
        return;
      }
      this.deps.player.damage(amount, null);
    });
    net.on("briefing", msg => this.handleBriefing(msg));
    net.on("briefUpdate", msg => this.handleBriefUpdate(msg));
    net.on("briefingCanceled", msg => {
      $("brief-screen")?.classList.add("hidden");
      $("mp-screen")?.classList.remove("hidden");
      this.briefLocalReady = false;
      this.status(msg.reason || "Briefing canceled.", true);
    });
    net.on("event", msg => this.onEvent(msg));
    net.on("share", msg => this.receiveShare(msg));
    net.on("revive", msg => {
      if (!this.downed) return;
      const sender = this.avatars.get(msg.from);
      if (!sender || sender.dead || sender.downed) return;
      if (Math.hypot(
        sender.pos.x - this.deps.player.pos.x,
        sender.pos.z - this.deps.player.pos.z
      ) > 6.5) return;
      this.revivePlayer();
    });
    net.on("peerLeft", msg => this.onPeerLeft(msg));
    net.on("kicked", msg => {
      this.kicked = true;
      this.active = false;
      $("brief-screen")?.classList.add("hidden");
      this.deps.hud.toast("REMOVED FROM SESSION", String(msg.reason || "The host removed you.").toUpperCase(), "red");
      setTimeout(() => location.reload(), 1800);
    });
    net.on("error", msg => this.status(msg.message || "Room error.", true));
    net.on("closed", msg => this.onClosed(msg.reason));
    net.on("disconnected", () => this.onClosed("Connection to the co-op server was lost."));
  }

  handleStart(msg) {
    if (this.active) return;
    this.code = msg.code || this.code;
    this.isHost = msg.hostId === net.id;
    this.role = this.isHost ? "host" : "client";
    this.roomPlayers = msg.players || this.roomPlayers;
    this.names = new Map(this.roomPlayers.map(p => [p.id, p.name]));
    this.active = true;

    const enemies = this.deps.enemies;
    enemies.netRole = this.role;
    // Co-op is human players plus Mara. Waves start at the normal solo size
    // and gain one fifth per additional player; enemies are tougher and hit
    // harder, and checkpoint bonuses stack on top of that.
    const playerCount = Math.max(2, this.roomPlayers.length || 2);
    const waveMultiplier = 1 + COOP_ENEMY_GROWTH_PER_PLAYER * (playerCount - 1);
    // modeMultipliers() already folds in co-op wave growth and the co-op
    // damage floor; the host's threat level scales on top of both.
    const threat = this.deps.modeMultipliers
      ? this.deps.modeMultipliers()
      : { count: waveMultiplier, damage: 1.4, alive: waveMultiplier, drops: 1, healthDrops: 1, toughness: 1.75 };
    enemies.squadLimit = 0;
    enemies.removeAllies?.();
    enemies.enemyCountMultiplier = threat.count;
    enemies.enemyHealthMultiplier = threat.toughness ?? 1.75;
    enemies.enemyDamageMultiplier = threat.damage;
    enemies.dropMultiplier = threat.drops ?? 1;
    enemies.healthDropMultiplier = threat.healthDrops ?? 1;
    enemies.playerDamageMultiplier = 1;
    for (const s of enemies.states) {
      s.maxAlive = Math.min(
        COOP_MAX_ALIVE_CAP,
        Math.round(s.maxAliveBase * threat.alive)
      );
    }
    this.dealBonus = 0;
    this.takeBonus = 0;
    this.applyTeamMultipliers();
    this.shareReadyAt = 0;
    this.localName = this.callsign();
    enemies.netDamage = (enemy, amount, opts) => {
      if (enemy?.netId) net.sendDamage(enemy.netId, amount, opts?.headshot);
    };
    enemies.netEvent = (name, data) => net.sendEvent(name, data);
    enemies.netPuppetTick = dt => this.updatePuppets(dt);
    if (this.isHost) {
      this.presence = [];
      enemies.netPresence = this.presence;
      enemies.remoteTargets = [];
    }

    $("mp-screen")?.classList.add("hidden");
    $("brief-screen")?.classList.add("hidden");
    this.status("");
    this.kicked = false;
    this.downed = false;
    this.downUntil = 0;
    this.reviveHold = 0;
    this.briefLocalReady = false;
    this.roomPlayers = msg.players || this.roomPlayers;
    this.renderPauseRoster();
    this.deps.onStart(this.role);
    // Mara is host-authoritative and mirrored to clients in the snapshot.
    if (this.isHost && !enemies.allies.some(a => a.name === "MARA")) {
      const p = this.deps.player.pos;
      enemies.spawnAlly("MARA", p.x + 2.4, p.z + 2.4);
    }
    if (this.isHost) {
      setTimeout(() => {
        if (this.active) this.vex("coopStart");
      }, 9800);
    }
  }

  onPlayer(msg) {
    if (!this.active || msg.id === net.id) return;
    if (msg.name) this.names.set(msg.id, msg.name);
    const name = this.names.get(msg.id) || `ECHO-${msg.id}`;
    let avatar = this.avatars.get(msg.id);
    if (!avatar) {
      avatar = makeAvatar(name, msg.id);
      this.deps.scene.add(avatar.model.group);
      avatar.pos.set(msg.x, msg.y, msg.z);
      avatar.target.copy(avatar.pos);
      avatar.yaw = Number(msg.yaw) || 0;
      avatar.targetYaw = Number(msg.yaw) || 0;
      avatar.model.group.position.copy(avatar.pos);
      this.avatars.set(msg.id, avatar);
    }
    const wasDowned = !!avatar.downed;
    avatar.target.set(Number(msg.x) || 0, Number(msg.y) || 0, Number(msg.z) || 0);
    avatar.targetYaw = Number(msg.yaw) || 0;
    avatar.dead = !!msg.d;
    avatar.downed = !!msg.down;
    avatar.firing = !!msg.f;
    avatar.weapon = msg.w;

    if (this.isHost) {
      if (!wasDowned && avatar.downed) {
        this.vex("downed", name);
      } else if (wasDowned && !avatar.downed && !avatar.dead) {
        setTimeout(() => {
          if (this.active) this.vex("revived", name);
        }, 1800);
      }
    }

    if (this.isHost) {
      let proxy = this.proxies.get(msg.id);
      if (!proxy) {
        proxy = {
          id: msg.id,
          name,
          pos: new THREE.Vector3(),
          dead: false,
          downed: false,
          health: 100,
          hurt: amount => net.sendHit(msg.id, Math.max(1, Math.round(amount)))
        };
        this.proxies.set(msg.id, proxy);
        this.syncProxies();
      }
      const wasOut = proxy.dead || proxy.downed;
      let px = avatar.target.x;
      let pz = avatar.target.z;
      if (!wasOut && (proxy.pos.x !== 0 || proxy.pos.z !== 0)) {
        const dx = avatar.target.x - proxy.pos.x;
        const dz = avatar.target.z - proxy.pos.z;
        const d = Math.hypot(dx, dz);
        if (d > 15) {
          px = proxy.pos.x + (dx / d) * 15;
          pz = proxy.pos.z + (dz / d) * 15;
        }
      }
      proxy.pos.set(px, avatar.target.y, pz);
      proxy.dead = avatar.dead;
      proxy.downed = avatar.downed;
      proxy.health = Number(msg.h) || 0;
      this.syncProxies();
    }
  }

  syncProxies() {
    if (!this.isHost) return;
    const enemies = this.deps.enemies;
    enemies.remoteTargets = [...this.proxies.values()];
    this.presence.length = 0;
    for (const p of this.proxies.values()) if (!p.dead) this.presence.push(p.pos);
    enemies.netPresence = this.presence;
  }

  onDamageRequest(msg) {
    if (!this.active || !this.isHost) return;
    const amount = Number(msg.amount);
    const id = Number(msg.id);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 4000) return;
    if (!Number.isInteger(id) || id <= 0) return;
    const proxy = this.proxies.get(msg.from);
    if (!proxy || proxy.dead || proxy.downed) return;
    const enemy = this.deps.enemies.enemies.find(e => e.netId === id && !e.dead);
    if (!enemy) return;
    if (Math.hypot(enemy.pos.x - proxy.pos.x, enemy.pos.z - proxy.pos.z) > 380) return;
    const now = performance.now();
    let budget = this.damageBudget.get(msg.from);
    if (!budget || now - budget.start > 1000) {
      budget = { start: now, total: 0 };
      this.damageBudget.set(msg.from, budget);
    }
    budget.total += amount;
    if (budget.total > 8000) return;
    this.deps.enemies.applyNetworkDamage(id, amount, !!msg.headshot, proxy);
  }

  onEvent(msg) {
    if (!this.active) return;
    const data = msg.data || {};
    const enemies = this.deps.enemies;
    if (msg.name === "battleStart") {
      const state = enemies.states[data.index];
      if (state) {
        state.active = true;
        enemies.activeIndex = data.index;
      }
      const mode = data.theme === "battle" || data.theme === "battle2" || data.theme === "final"
        ? data.theme
        : data.index >= ZONE_COUNT - 2 ? "final"
          : data.index < 2 ? "battle"
            : "battle";
      enemies.battleTheme = mode;
      this.deps.audio.setMusicMode(mode);
      this.deps.audio.setMusicDucked(false);
      this.deps.hud.toast("CHECKPOINT ENGAGED", `${state ? state.zone.name.toUpperCase() : "HOSTILES"} // HOST SIMULATION`, "amber");
      return;
    }
    if (msg.name === "zoneClear") {
      const indices = Array.isArray(data.cleared) ? data.cleared : [data.index];
      for (const i of indices) {
        const state = enemies.states[i];
        if (state) state.active = false;
      }
      enemies.applyCleared(indices);
      const region = enemies.states[data.index]?.zone.region || "farm";
      const exploreMode = region === "beginning" ? "title"
        : region === "suburb" ? "suburb"
          : region === "city" ? "city" : "farm";
      this.deps.audio.setMusicMode(exploreMode, { kind: "leaveBattle" });
      this.deps.audio.setMusicDucked(false);
      const zone = enemies.states[data.index]?.zone;
      this.deps.hud.toast(
        "CHECKPOINT SECURED",
        zone ? `${String(zone.id).padStart(2, "0")} / 35 // ${zone.name.toUpperCase()}` : "SECTOR CLEARED",
        "green"
      );
      this.deps.onCoopZoneClear?.(data.index);
      const story = coopStoryLine(zone);
      if (story) this.deps.hud.comms(story.speaker, story.text, 7000);
      return;
    }
    if (msg.name === "finale") {
      this.deps.onCoopFinale?.(data.zoneIndex, data.boss);
      return;
    }
    if (msg.name === "upgrade") {
      this.applyTeamUpgrade(Number(data.deal) || 0, Number(data.take) || 0, data.name || "TEAM UPGRADE");
      return;
    }
    if (msg.name === "vex") {
      this.showVex(data.line, data.moment);
    }
  }

  onPeerLeft(msg) {
    const avatar = this.avatars.get(msg.id);
    if (avatar) {
      this.deps.scene.remove(avatar.model.group);
      this.avatars.delete(msg.id);
    }
    if (this.proxies.delete(msg.id)) this.syncProxies();
    if (this.active) {
      this.deps.hud.toast("SQUAD UPDATE", `${msg.name || "A PLAYER"} LEFT THE OPERATION`, "amber");
    }
    this.roomPlayers = this.roomPlayers.filter(p => p.id !== msg.id);
    this.renderPauseRoster();
    if (!this.active) this.renderRoster(this.hostId ?? this.roomPlayers[0]?.id);
  }

  onClosed(reason) {
    if (this.kicked) return;
    if (!this.active) {
      this.status(reason || "Room closed.", true);
      this.code = null;
      this.isHost = false;
      $("mp-room")?.classList.add("hidden");
      $("brief-screen")?.classList.add("hidden");
      $("mp-screen")?.classList.add("hidden");
      $("start-screen")?.classList.remove("hidden");
      return;
    }
    this.active = false;
    this.deps.onClosed?.(reason || "The co-op session ended.");
  }

  sendFinale(zoneIndex, bossPos) {
    if (!this.active || !this.isHost) return;
    net.sendEvent("finale", {
      zoneIndex,
      boss: { x: bossPos?.x || 0, y: bossPos?.y || 0, z: bossPos?.z || 0 }
    });
  }

  raycastFriendly(origin, dir, maxDist) {
    if (!this.deps) return null;
    let best = null;
    const test = (pos, kind, extra) => {
      const body = raySphere(origin, dir, pos.x, pos.y + 1.05, pos.z, 0.48);
      const head = raySphere(origin, dir, pos.x, pos.y + 1.65, pos.z, 0.28);
      let dist = -1;
      let headshot = false;
      if (body > 0 && body <= maxDist) dist = body;
      if (head > 0 && head <= maxDist && (dist < 0 || head < dist)) {
        dist = head;
        headshot = true;
      }
      if (dist < 0) return;
      if (!best || dist < best.dist) {
        best = {
          kind,
          id: extra?.id,
          ally: extra?.ally,
          name: extra?.name,
          dist,
          headshot,
          point: origin.clone().addScaledVector(dir, dist)
        };
      }
    };
    for (const ally of this.deps.enemies.allies) {
      if (ally.downed || ally.networkPuppet) continue;
      test(ally.pos, "ally", { ally, name: ally.name });
    }
    for (const avatar of this.avatars.values()) {
      if (!avatar.dead && !avatar.downed) test(avatar.pos, "player", { id: avatar.id, name: avatar.name });
    }
    return best;
  }

  applyFriendlyHit(hit, amount, headshot) {
    if (!hit) return;
    const dmg = Math.max(1, Math.round(amount));
    if (hit.kind === "player") {
      net.sendTeamHit(hit.id, dmg);
      return;
    }
    if (hit.kind === "ally" && hit.ally) {
      hit.ally.hurt(dmg, this.deps.player);
    }
    void headshot;
  }

  /* --------------------------- checkpoint bonuses ------------------------- */
  applyTeamMultipliers() {
    if (!this.deps) return;
    this.deps.player.weapons.damageMultiplier = 1 + this.dealBonus;
    this.deps.enemies.playerDamageMultiplier = Math.max(
      1 - MAX_DAMAGE_REDUCTION,
      1 - this.takeBonus
    );
  }

  grantUpgrade(zone) {
    if (!this.active || !this.isHost) return;
    this.applyTeamUpgrade(
      CHECKPOINT_DAMAGE_BONUS,
      CHECKPOINT_DAMAGE_REDUCTION,
      "FIELD REFIT",
      zone
    );
    net.sendEvent("upgrade", {
      deal: CHECKPOINT_DAMAGE_BONUS,
      take: CHECKPOINT_DAMAGE_REDUCTION,
      name: "FIELD REFIT"
    });
  }

  applyTeamUpgrade(deal, take, name, zone) {
    this.dealBonus += Math.max(0, deal);
    this.takeBonus = Math.min(MAX_DAMAGE_REDUCTION, this.takeBonus + Math.max(0, take));
    this.applyTeamMultipliers();
    this.deps.hud.toast(
      "CHECKPOINT BONUS",
      `${String(name).toUpperCase()} // +${Math.round(this.dealBonus * 100)}% DAMAGE · -${Math.round(this.takeBonus * 100)}% TAKEN${zone ? ` // ${zone.name.toUpperCase()} SECURED` : ""}`,
      "green"
    );
    this.deps.hud.comms("MARA", maraLine("upgrade"), 5200);
  }

  /* -------------------------------- sharing ------------------------------- */
  nearestTeammate(maxDist = 5.5) {
    if (!this.deps) return null;
    const p = this.deps.player.pos;
    let best = null;
    let bd = maxDist;
    for (const avatar of this.avatars.values()) {
      if (avatar.dead || avatar.downed) continue;
      const d = Math.hypot(avatar.pos.x - p.x, avatar.pos.z - p.z);
      if (d < bd) { bd = d; best = avatar; }
    }
    return best;
  }

  shareWithNearest() {
    if (!this.active || !this.deps) return;
    const now = performance.now();
    if (now < this.shareReadyAt) return;
    const mate = this.nearestTeammate(5.5);
    if (!mate) {
      this.deps.hud.toast("SHARE", "NO TEAMMATE WITHIN 5 M", "amber");
      this.shareReadyAt = now + 900;
      return;
    }
    const player = this.deps.player;
    const hp = Math.max(0, Math.min(150, Math.floor(player.health * 0.2), Math.ceil(player.health) - 1));
    const ammo = player.weapons.takeReserveShare(0.25);
    if (hp <= 0 && ammo <= 0) {
      this.deps.hud.toast("SHARE", "NO HEALTH OR AMMO TO SHARE", "amber");
      this.shareReadyAt = now + 900;
      return;
    }
    if (hp > 0) {
      player.health = Math.max(1, player.health - hp);
      player.hud.setHealth(player.health);
    }
    net.sendShare(mate.id, hp, ammo);
    this.shareReadyAt = now + 2500;
    this.deps.hud.toast("SUPPLIES SHARED", `${mate.name} // +${hp} HP · +${ammo} AMMO`, "green");
    this.deps.enemies.effects?.burst(
      player.pos.clone().setY(player.pos.y + 1.2), 0x7dffb0, 8, 2, 6
    );
  }

  receiveShare(msg) {
    if (!this.active) return;
    const sender = this.avatars.get(msg.from);
    if (!sender || sender.dead || sender.downed) return;
    if (Math.hypot(
      sender.pos.x - this.deps.player.pos.x,
      sender.pos.z - this.deps.player.pos.z
    ) > 6.5) return;
    const hp = Math.min(200, Math.max(0, Math.round(Number(msg.hp) || 0)));
    const ammo = Math.min(2000, Math.max(0, Math.round(Number(msg.ammo) || 0)));
    const player = this.deps.player;
    if (hp > 0) player.addHealth(hp);
    else player.hud.setHealth(player.health);
    if (ammo > 0) player.weapons.addReserve(ammo);
    this.deps.hud.toast(
      "SUPPLIES RECEIVED",
      `${msg.name || "TEAMMATE"} // +${hp} HP · +${ammo} AMMO`,
      "green"
    );
    this.deps.hud.comms("MARA", maraLine("share"), 4200);
    this.deps.enemies.effects?.burst(
      player.pos.clone().setY(player.pos.y + 1.2), 0x7dffb0, 8, 2, 6
    );
  }

  /* ------------------------------- downed --------------------------------- */
  myName() {
    return this.roomPlayers.find(p => p.id === net.id)?.name || this.localName || "the Captain";
  }

  showVex(line, moment) {
    if (!line) return;
    this.deps.hud.comms("DIRECTOR VEX", line, 7600);
    if (moment === "downed" && this.downed) {
      const el = $("downed-vex");
      if (el) el.textContent = `DIRECTOR VEX // ${line}`;
    }
  }

  vex(moment, name) {
    if (!this.active || !this.isHost) return;
    const who = name || this.myName();
    const line = vexLine(moment, { name: who });
    if (!line) return;
    this.showVex(line, moment);
    net.sendEvent("vex", { moment, line, name: who });
  }

  playerDowned() {
    if (!this.active || this.downed) return;
    this.downed = true;
    this.downUntil = performance.now() + 30000;
    this.reviveHold = 0;
    this.reviveTargetId = null;
    this.deps.player.dead = true;
    this.deps.onPlayerDowned?.();
    if (this.isHost) this.vex("downed", this.myName());
  }

  revivePlayer() {
    if (!this.downed) return;
    const who = this.myName();
    this.downed = false;
    this.downUntil = 0;
    this.reviveHold = 0;
    this.reviveTargetId = null;
    this.deps.player.dead = false;
    this.deps.onPlayerRevived?.();
    this.deps.hud.comms("MARA", maraLine("revived"), 5200);
    if (this.isHost) {
      setTimeout(() => {
        if (this.active && !this.downed) this.vex("revived", who);
      }, 1800);
    }
  }

  bleedOut() {
    if (!this.downed) return;
    this.downed = false;
    this.downUntil = 0;
    this.deps.onPlayerBleedOut?.();
  }

  nearestDownedTeammate(maxDist = 4.5) {
    if (!this.deps) return null;
    const p = this.deps.player.pos;
    let best = null;
    let bd = maxDist;
    for (const avatar of this.avatars.values()) {
      if (!avatar.downed || avatar.dead) continue;
      const d = Math.hypot(avatar.pos.x - p.x, avatar.pos.z - p.z);
      if (d < bd) { bd = d; best = avatar; }
    }
    return best;
  }

  /* ------------------------------- runtime -------------------------------- */
  update(dt) {
    if (!this.active) return;
    const { player, input, enemies } = this.deps;

    this.playerTimer += dt;
    if (this.playerTimer >= 1 / 15) {
      this.playerTimer = 0;
      net.sendPlayer({
        x: r2(player.pos.x),
        y: r2(player.pos.y),
        z: r2(player.pos.z),
        yaw: r2(player.yaw),
        p: r2(player.pitch),
        h: Math.max(0, Math.round(player.health)),
        d: player.dead && !this.downed ? 1 : 0,
        down: this.downed ? 1 : 0,
        w: player.weapons.index,
        f: input.fire && !player.dead && !this.downed ? 1 : 0
      });
    }

    if (this.isHost) {
      this.snapTimer += dt;
      if (this.snapTimer >= 1 / 8) {
        this.snapTimer = 0;
        const list = [];
        for (const e of enemies.enemies) {
          if (e.dead || e.removed) continue;
          list.push([
            e.netId, e.typeKey, e.bossKind || "",
            r2(e.pos.x), r2(e.pos.y), r2(e.pos.z),
            r2(e.model.group.rotation.y),
            Math.round(e.health),
            e.isBoss ? 1 : 0,
            e.zoneIndex
          ]);
        }
        const active = enemies.states[enemies.activeIndex];
        const mara = enemies.allies.find(a => a.name === "MARA");
        net.sendSnapshot({
          e: list,
          k: enemies.kills,
          c: active ? active.killed : 0,
          m: mara ? [
            r2(mara.pos.x), r2(mara.pos.y), r2(mara.pos.z),
            r2(mara.model.group.rotation.y),
            Math.round(mara.health),
            mara.downed ? 1 : 0
          ] : null
        });
      }
    }

    this.updateAvatars(dt);

    if (this.downed) {
      const left = Math.max(0, this.downUntil - performance.now());
      const timer = $("downed-timer");
      if (timer) timer.textContent = String(Math.ceil(left / 1000));
      player.externalPrompt = null;
      if (left <= 0) this.bleedOut();
      return;
    }

    const mate = this.nearestDownedTeammate(4.5);
    if (!mate) {
      this.reviveTargetId = null;
      this.reviveHold = 0;
      player.externalPrompt = null;
      return;
    }
    if (this.reviveTargetId !== mate.id) {
      this.reviveTargetId = mate.id;
      this.reviveHold = 0;
    }
    const now = performance.now();
    if (now < this.reviveSentUntil) {
      player.externalPrompt = `REVIVE SENT // ${mate.name}`;
      return;
    }
    if (input.reviveHeld) this.reviveHold += dt;
    else this.reviveHold = Math.max(0, this.reviveHold - dt * 3);
    const shown = Math.min(2.5, this.reviveHold);
    player.externalPrompt = `HOLD E TO REVIVE ${mate.name} // ${shown.toFixed(1)}s`;
    if (this.reviveHold >= 2.5) {
      net.sendRevive(mate.id);
      this.reviveHold = 0;
      this.reviveSentUntil = now + 1200;
      player.externalPrompt = `REVIVE SENT // ${mate.name}`;
      this.deps.hud.toast("REVIVE", `${mate.name} IS COMING BACK`, "green");
      this.deps.enemies.effects?.burst(
        mate.pos.clone().setY(mate.pos.y + 1.2), 0x7dffb0, 10, 2, 6
      );
    }
  }

  updateAvatars(dt) {
    const k = 1 - Math.exp(-dt * 14);
    for (const avatar of this.avatars.values()) {
      const dx = avatar.target.x - avatar.pos.x;
      const dz = avatar.target.z - avatar.pos.z;
      const distance = Math.hypot(dx, dz);
      avatar.speed += ((distance / Math.max(dt, 0.001)) - avatar.speed) * Math.min(1, dt * 8);
      avatar.pos.lerp(avatar.target, k);
      avatar.yaw = angleLerp(avatar.yaw, avatar.targetYaw, Math.min(1, dt * 12));
      // Soldier models face +Z; the player camera faces -Z at yaw 0.
      avatar.model.group.rotation.y = avatar.yaw + Math.PI;
      avatar.model.group.visible = !avatar.dead;
      avatar.tag.visible = !avatar.dead;

      if (avatar.dead) {
        avatar.flash.visible = false;
        continue;
      }

      if (avatar.downed) {
        avatar.model.group.position.copy(avatar.pos);
        avatar.model.group.position.y -= 0.5;
        avatar.model.group.rotation.z = -1.2;
        avatar.flash.visible = false;
        continue;
      }

      avatar.model.group.rotation.z = 0;
      avatar.model.group.position.copy(avatar.pos);
      avatar.flash.visible = avatar.firing;
      {
        if (avatar.speed > 0.6) {
          avatar.walk += dt * Math.min(avatar.speed, 10) * 2.7;
          const swing = Math.sin(avatar.walk) * 0.58;
          avatar.model.parts.legL.rotation.x = swing;
          avatar.model.parts.legR.rotation.x = -swing;
          avatar.model.parts.kneeL.rotation.x = Math.max(0, -Math.sin(avatar.walk)) * 0.55;
          avatar.model.parts.kneeR.rotation.x = Math.max(0, Math.sin(avatar.walk)) * 0.55;
        } else {
          avatar.model.parts.legL.rotation.x *= 0.88;
          avatar.model.parts.legR.rotation.x *= 0.88;
          avatar.model.parts.kneeL.rotation.x *= 0.9;
          avatar.model.parts.kneeR.rotation.x *= 0.9;
        }
      }
    }
  }

  updatePuppets(dt) {
    if (this.role !== "client" || !this.latestSnapshot) return;
    const { enemies, scene } = this.deps;
    const seen = new Set();
    let boss = null;
    for (const entry of this.latestSnapshot) {
      const [netId, typeKey, bossKind, x, y, z, yaw, hp, isBoss, zoneIndex] = entry;
      seen.add(netId);
      let puppet = this.puppets.get(netId);
      if (!puppet) {
        puppet = new Enemy(enemies, new THREE.Vector3(x, y, z), zoneIndex, bossKind || null, typeKey);
        puppet.netId = netId;
        puppet.networkPuppet = true;
        puppet.spawnTimer = 0;
        puppet.model.group.scale.setScalar(puppet.model.baseScale);
        enemies.enemies.push(puppet);
        this.puppets.set(netId, puppet);
      }
      puppet.targetX = x;
      puppet.targetY = y;
      puppet.targetZ = z;
      puppet.targetYaw = yaw;
      puppet.health = hp;
      puppet.targetable = true;
      const k = 1 - Math.exp(-dt * 16);
      const ex = puppet.pos.x;
      const ez = puppet.pos.z;
      puppet.pos.x += (x - puppet.pos.x) * k;
      puppet.pos.y += (y - puppet.pos.y) * k;
      puppet.pos.z += (z - puppet.pos.z) * k;
      puppet.model.group.position.copy(puppet.pos);
      puppet.model.group.rotation.y = angleLerp(puppet.model.group.rotation.y, yaw, Math.min(1, dt * 14));
      const speed = Math.hypot(puppet.pos.x - ex, puppet.pos.z - ez) / Math.max(dt, 0.001);
      puppet.animateWalk(dt, speed > 0.4, Math.min(speed, 9));
      if (isBoss) boss = puppet;
    }

    for (const [netId, puppet] of [...this.puppets]) {
      if (seen.has(netId)) continue;
      this.deps.enemies.effects?.burst(
        new THREE.Vector3(puppet.pos.x, puppet.pos.y + 1.1, puppet.pos.z),
        puppet.isBoss ? 0xff5a5a : 0x9c58ff, puppet.isBoss ? 40 : 8, 4, 8
      );
      scene.remove(puppet.model.group);
      puppet.removed = true;
      const index = enemies.enemies.indexOf(puppet);
      if (index >= 0) enemies.enemies.splice(index, 1);
      this.puppets.delete(netId);
    }

    enemies.boss = boss;
    if (!boss) enemies.hud.hideBoss();

    this.updateMaraPuppet(dt);
  }

  updateMaraPuppet(dt) {
    const { enemies, scene } = this.deps;
    const data = this.latestMara;
    if (!data) {
      if (this.maraPuppet) {
        scene.remove(this.maraPuppet.model.group);
        const index = enemies.allies.indexOf(this.maraPuppet);
        if (index >= 0) enemies.allies.splice(index, 1);
        this.maraPuppet = null;
      }
      return;
    }
    if (!this.maraPuppet) {
      this.maraPuppet = enemies.spawnAlly("MARA", data[0], data[2]);
      this.maraPuppet.networkPuppet = true;
      this.maraPuppet.model.group.position.set(data[0], data[1], data[2]);
    }
    const mara = this.maraPuppet;
    const k = 1 - Math.exp(-dt * 12);
    const oldX = mara.pos.x;
    const oldZ = mara.pos.z;
    mara.pos.x += (data[0] - mara.pos.x) * k;
    mara.pos.y += (data[1] - mara.pos.y) * k;
    mara.pos.z += (data[2] - mara.pos.z) * k;
    mara.health = data[4];
    mara.downed = !!data[5];
    mara.model.group.position.copy(mara.pos);
    mara.model.group.rotation.y = data[3];
    if (mara.downed) {
      mara.model.group.position.y -= 0.5;
      mara.model.group.rotation.z = -1.2;
    } else {
      mara.model.group.rotation.z = 0;
      const speed = Math.hypot(mara.pos.x - oldX, mara.pos.z - oldZ) / Math.max(dt, 0.001);
      if (speed > 0.5) {
        mara.walk = (mara.walk || 0) + dt * Math.min(speed, 10) * 2.7;
        const swing = Math.sin(mara.walk) * 0.5;
        mara.model.parts.legL.rotation.x = swing;
        mara.model.parts.legR.rotation.x = -swing;
        mara.model.parts.kneeL.rotation.x = Math.max(0, -Math.sin(mara.walk)) * 0.45;
        mara.model.parts.kneeR.rotation.x = Math.max(0, Math.sin(mara.walk)) * 0.45;
      } else {
        mara.model.parts.legL.rotation.x *= 0.88;
        mara.model.parts.legR.rotation.x *= 0.88;
      }
    }
  }
}

export const coop = new CoopClient();
