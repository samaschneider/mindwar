import { MAP_BOUNDS, ZONES, MAIN_ROAD, LOCAL_ROADS, REGIONS } from "./zones.js";

const $ = id => document.getElementById(id);

export class HUD {
  constructor() {
    this.el = {
      hud: $("hud"),
      objectiveMode: $("objective-mode"),
      objectiveName: $("objective-name"),
      objectiveSub: $("objective-sub"),
      objectiveDist: $("objective-dist"),
      objectiveFill: $("objective-bar-fill"),
      healthValue: $("health-value"),
      healthFill: $("health-fill"),
      healthWrap: $("health-wrap"),
      healthNote: $("health-note"),
      squadList: $("squad-list"),
      squadCount: $("squad-count"),
      weaponName: $("weapon-name"),
      weaponSlot: $("weapon-slot"),
      weaponMode: $("weapon-mode"),
      ammoMag: $("ammo-mag"),
      ammoReserve: $("ammo-reserve"),
      grenadeCount: $("grenade-count"),
      weaponSlots: $("weapon-slots"),
      crosshair: $("crosshair"),
      hitmarker: $("hitmarker"),
      prompt: $("prompt"),
      promptText: $("prompt-text"),
      banner: $("zone-banner"),
      bannerKicker: $("zone-banner-kicker"),
      bannerTitle: $("zone-banner-title"),
      bannerSub: $("zone-banner-sub"),
      toasts: $("toasts"),
      comms: $("comms"),
      commsSpeaker: $("comms-speaker"),
      commsLine: $("comms-line"),
      boss: $("boss"),
      bossName: $("boss-name"),
      bossFill: $("boss-fill"),
      scope: $("scope"),
      scopeName: $("scope-name"),
      scopeZoom: $("scope-zoom"),
      radar: $("radar"),
      radarObjective: $("radar-objective"),
      damage: $("damage-vignette"),
      hint: $("hint"),
      fps: $("fps")
    };
    this.radarCtx = this.el.radar.getContext("2d");
    this.mapCanvas = $("campaign-map");
    this.mapCtx = this.mapCanvas.getContext("2d");
    this.startMap = $("start-map");
    this.startMapCtx = this.startMap ? this.startMap.getContext("2d") : null;
    this.cache = {};
    this.hitTimer = 0;
    this.commsTimer = 0;
    this.bannerTimer = 0;
    this.toastCount = 0;
    this.hintFaded = false;
    this.setHealth(1000);
    this.setSquad(null, []);
  }

  show(show) {
    this.el.hud.classList.toggle("hidden", !show);
    if (show && !this.hintFaded) {
      setTimeout(() => this.el.hint.classList.add("fade"), 14000);
      this.hintFaded = true;
    }
  }

  setHealth(hp) {
    const v = Math.max(0, Math.round(hp));
    if (this.cache.hp !== v) {
      this.cache.hp = v;
      this.el.healthValue.textContent = v.toLocaleString("en-US");
      this.el.healthFill.style.width = Math.min(100, (hp / 1000) * 100) + "%";
      const over = hp > 1000;
      this.el.healthWrap.classList.toggle("overdrive", over);
      this.el.healthNote.textContent = over ? "OVERCHARGE // FIELD NANITES UNBOUNDED" : "NO CAP // FIELD NANITES ACTIVE";
    }
  }

  setWeapon(def, state, index) {
    const key = def.id + state.mag + ":" + state.reserve + index;
    if (this.cache.weapon === key) return;
    this.cache.weapon = key;
    this.el.weaponName.textContent = def.name;
    this.el.weaponSlot.textContent = "WPN " + String(index + 1).padStart(2, "0");
    this.el.weaponMode.textContent = def.mode;
    this.cache.mode = def.mode;
    if (def.melee) {
      this.el.ammoMag.textContent = "∞";
      this.el.ammoReserve.textContent = "MELEE";
      this.el.ammoMag.style.color = "";
    } else {
      this.el.ammoMag.textContent = state.mag;
      this.el.ammoReserve.textContent = state.reserve.toLocaleString("en-US");
      this.el.ammoMag.style.color = state.mag === 0 ? "#ff6b5f" : "";
    }
  }

  setGrenades(n) {
    if (!this.el.grenadeCount) return;
    this.el.grenadeCount.textContent = "× " + n;
    this.el.grenadeCount.style.color = n > 0 ? "var(--amber)" : "#ff6b5f";
  }

  setWeaponSlots(states, active) {
    if (this.cache.slots === states.map(s => s.mag).join(",") + active) return;
    this.cache.slots = states.map(s => s.mag).join(",") + active;
    if (!this.el.weaponSlots.children.length) {
      for (let i = 0; i < states.length; i++) {
        const d = document.createElement("div");
        d.className = "wslot";
        d.textContent = String(i + 1).padStart(2, "0");
        this.el.weaponSlots.appendChild(d);
      }
    }
    [...this.el.weaponSlots.children].forEach((el, i) => {
      el.className = "wslot" + (i === active ? " active" : "") + (states[i].mag === 0 ? " empty" : "");
    });
  }

  setReloading(on) {
    if (this.cache.reloading === on) return;
    this.cache.reloading = on;
    if (on) {
      this.el.weaponMode.textContent = "RELOADING";
      this.el.weaponMode.style.color = "#ffb545";
    } else {
      this.el.weaponMode.style.color = "";
      this.el.weaponMode.textContent = "READY";
      setTimeout(() => this.setWeaponModeIdle(), 500);
    }
  }

  setWeaponModeIdle() {
    if (!this.cache.reloading) this.el.weaponMode.textContent = this.cache.mode || "SEMI";
  }

  setCrosshair(spread, ads) {
    const gap = Math.min(54, 8 + spread * 520);
    this.el.crosshair.style.setProperty("--gap", gap.toFixed(1) + "px");
    this.el.crosshair.classList.toggle("ads", !!ads);
  }

  hitmarker(kill, head) {
    const el = this.el.hitmarker;
    el.classList.remove("show", "kill", "headshot");
    void el.offsetWidth;
    el.classList.add("show");
    if (kill) el.classList.add("kill");
    if (head) el.classList.add("headshot");
    clearTimeout(this.hitTimer);
    this.hitTimer = setTimeout(() => el.classList.remove("show", "kill", "headshot"), 110);
  }

  damageFlash(amount) {
    const el = this.el.damage;
    el.classList.remove("hit");
    void el.offsetWidth;
    el.classList.add("hit");
    el.style.opacity = Math.min(0.95, 0.35 + amount / 60);
    clearTimeout(this.damageTimer);
    this.damageTimer = setTimeout(() => {
      el.classList.remove("hit");
      el.style.opacity = "";
    }, 120);
  }

  setObjective(mode, name, sub, progress, distText) {
    if (this.cache.objMode !== mode) { this.el.objectiveMode.textContent = mode; this.cache.objMode = mode; }
    if (this.cache.objName !== name) { this.el.objectiveName.textContent = name; this.cache.objName = name; }
    if (this.cache.objSub !== sub) { this.el.objectiveSub.textContent = sub; this.cache.objSub = sub; }
    if (this.cache.objDist !== distText) { this.el.objectiveDist.textContent = distText; this.cache.objDist = distText; }
    this.el.objectiveFill.style.width = Math.max(0, Math.min(100, progress * 100)) + "%";
  }

  setSquad(player, allies) {
    const key = (player ? Math.round(player.health) : -1) + "|" + allies.map(a => a.name + Math.round(a.health) + (a.downed ? "D" : "")).join("|");
    if (this.el.squadCount) this.el.squadCount.textContent = player ? `// ${allies.length + 1} STRONG` : "";
    if (this.cache.squad === key) return;
    this.cache.squad = key;
    const list = this.el.squadList;
    list.innerHTML = "";
    const add = (name, hp, max, downed, isPlayer) => {
      const card = document.createElement("div");
      card.className = "squad-card" + (isPlayer ? " player" : "") + (downed ? " down" : "");
      const n = document.createElement("div");
      n.className = "squad-name";
      n.textContent = name;
      const h = document.createElement("div");
      h.className = "squad-hp";
      h.textContent = downed ? "DOWN" : Math.max(0, Math.round(hp)).toLocaleString("en-US");
      const bar = document.createElement("div");
      bar.className = "squad-bar";
      const fill = document.createElement("i");
      fill.style.width = Math.max(0, Math.min(100, (hp / max) * 100)) + "%";
      bar.appendChild(fill);
      card.append(n, h, bar);
      list.appendChild(card);
    };
    if (player) add("HAVOC", player.health, Math.max(1000, player.health), false, true);
    const visible = allies.slice(0, 7);
    for (const a of visible) add(a.name, a.health, a.maxHealth, a.downed, false);
    if (allies.length > visible.length) {
      const card = document.createElement("div");
      card.className = "squad-card";
      card.style.opacity = "0.65";
      card.innerHTML = `<div class="squad-name">+${allies.length - visible.length} MORE</div><div class="squad-hp">ECHO CO.</div><div class="squad-bar"><i style="width:100%"></i></div>`;
      list.appendChild(card);
    }
    if (player && allies.length === 0) {
      const card = document.createElement("div");
      card.className = "squad-card";
      card.style.opacity = "0.55";
      card.innerHTML = '<div class="squad-name">NO SQUAD</div><div class="squad-hp">E REVIVE</div><div class="squad-bar"><i style="width:0%"></i></div>';
      list.appendChild(card);
    }
  }

  setPrompt(text) {
    if (text) {
      if (this.cache.prompt !== text) {
        this.el.promptText.textContent = text;
        this.cache.prompt = text;
      }
      this.el.prompt.classList.remove("hidden");
    } else {
      this.el.prompt.classList.add("hidden");
      this.cache.prompt = null;
    }
  }

  banner(kicker, title, sub, green = false) {
    const b = this.el.banner;
    this.el.bannerKicker.textContent = kicker;
    this.el.bannerTitle.textContent = title;
    this.el.bannerSub.textContent = sub;
    b.classList.remove("show", "green");
    if (green) b.classList.add("green");
    void b.offsetWidth;
    b.classList.add("show");
  }

  toast(title, sub, tone = "green") {
    const t = document.createElement("div");
    t.className = "toast " + tone;
    const a = document.createElement("div");
    a.className = "toast-t";
    a.textContent = title;
    const b = document.createElement("div");
    b.className = "toast-s";
    b.textContent = sub;
    t.append(a, b);
    this.el.toasts.prepend(t);
    while (this.el.toasts.children.length > 5) this.el.toasts.lastChild.remove();
    setTimeout(() => t.remove(), 3600);
  }

  comms(speaker, line, duration = 6200) {
    this.el.commsSpeaker.textContent = speaker;
    this.el.commsLine.textContent = line;
    this.el.comms.classList.remove("hidden");
    clearTimeout(this.commsTimer);
    this.commsTimer = setTimeout(() => this.el.comms.classList.add("hidden"), duration);
  }

  setBoss(name, hp, max) {
    this.el.boss.classList.remove("hidden");
    this.el.bossName.textContent = name;
    this.el.bossFill.style.width = Math.max(0, Math.min(100, (hp / max) * 100)) + "%";
  }

  hideBoss() { this.el.boss.classList.add("hidden"); }

  setScope(on, def) {
    this.el.scope.classList.toggle("hidden", !on);
    this.el.hud.classList.toggle("scoped", !!on);
    if (on && def) {
      this.el.scopeName.textContent = def.name;
      this.el.scopeZoom.textContent = (def.scopeZoom || "4.0×") + " // CHORUS OPTIC";
    }
  }

  setFps(text) { this.el.fps.textContent = text; }

  /* -------------------------------- radar --------------------------------- */
  updateRadar(data) {
    const { pos, yaw, enemies, allies, recruits, zones, nextIndex, activeIndex, boss } = data;
    const ctx = this.radarCtx;
    const S = 360, cx = S / 2, cy = S / 2, R = 165;
    ctx.clearRect(0, 0, S, S);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();

    const bg = ctx.createRadialGradient(cx, cy, 10, cx, cy, R);
    bg.addColorStop(0, "rgba(30, 54, 40, 0.65)");
    bg.addColorStop(1, "rgba(4, 12, 8, 0.9)");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, S, S);

    // grid rings
    ctx.strokeStyle = "rgba(125,255,176,0.13)";
    ctx.lineWidth = 1;
    for (let r = 55; r <= 165; r += 55) {
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.stroke();

    // forward cone
    ctx.fillStyle = "rgba(255,181,69,0.08)";
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, 130, -Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5);
    ctx.closePath();
    ctx.fill();

    const range = 120;
    const scale = R / range;
    const cos = Math.cos(yaw), sin = Math.sin(yaw);
    const project = (x, z) => {
      const dx = x - pos.x, dz = z - pos.z;
      const right = dx * cos - dz * sin;
      const up = -dx * sin - dz * cos;
      return [cx + right * scale, cy - up * scale];
    };

    // zone markers
    zones.forEach((z, i) => {
      const [x, y] = project(z.x, z.z);
      if ((x - cx) ** 2 + (y - cy) ** 2 > R * R) return;
      const cleared = z.cleared;
      const isNext = i === nextIndex;
      const isActive = i === activeIndex;
      if (cleared) return;
      const locked = !isNext && z.index > nextIndex;
      ctx.fillStyle = locked ? "rgba(150,64,60,0.55)" : isNext ? "#ffd07d" : z.isBoss ? "#ff4f6a" : (z.regionColor || "rgba(255,181,69,0.55)");
      ctx.strokeStyle = isNext ? "#fff5d8" : "transparent";
      ctx.lineWidth = 2;
      const s = isNext ? 7 : 5;
      if (z.isBoss) {
        ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s, y); ctx.closePath(); ctx.fill();
      } else {
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
        if (isNext) ctx.strokeRect(x - s / 2, y - s / 2, s, s);
      }
      if (isActive) {
        ctx.strokeStyle = "rgba(255,181,69,0.45)";
        ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.stroke();
      }
    });

    // allies
    for (const a of allies) {
      if (a.downed) continue;
      const [x, y] = project(a.pos.x, a.pos.z);
      if ((x - cx) ** 2 + (y - cy) ** 2 > R * R) continue;
      ctx.fillStyle = "#64e5ff";
      ctx.fillRect(x - 2.5, y - 2.5, 5, 5);
    }
    // Survivor markers are retained for compatibility; the campaign spawns none.
    for (const r of recruits) {
      const [x, y] = project(r.pos.x, r.pos.z);
      if ((x - cx) ** 2 + (y - cy) ** 2 > R * R) continue;
      ctx.strokeStyle = "#7dffb0";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.stroke();
    }
    // enemies
    for (const e of enemies) {
      if (e.dead) continue;
      const [x, y] = project(e.pos.x, e.pos.z);
      if ((x - cx) ** 2 + (y - cy) ** 2 > R * R) continue;
      ctx.fillStyle = e.boss ? "#ff3b5c" : "#ff6b5f";
      if (e.boss) {
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillRect(x - 1.8, y - 1.8, 3.6, 3.6);
      }
    }
    if (boss) {
      const [x, y] = project(boss.pos.x, boss.pos.z);
      if ((x - cx) ** 2 + (y - cy) ** 2 < R * R) {
        ctx.strokeStyle = "#ff3b5c";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.stroke();
      }
    }

    // player
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = "#fff4d8";
    ctx.beginPath();
    ctx.moveTo(0, -9); ctx.lineTo(6, 7); ctx.lineTo(0, 3); ctx.lineTo(-6, 7); ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.restore();

    // rim
    ctx.strokeStyle = "rgba(255,181,69,0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "rgba(255,181,69,0.85)";
    ctx.font = "600 18px Consolas, monospace";
    ctx.textAlign = "center";
    ctx.fillText("FWD", cx, 25);
    ctx.fillText("REAR", cx, S - 12);
    ctx.textAlign = "left";
    ctx.fillText("LEFT", 10, cy + 6);
    ctx.textAlign = "right";
    ctx.fillText("RIGHT", S - 10, cy + 6);

    // objective direction
    if (nextIndex >= 0 && nextIndex < zones.length) {
      const z = zones[nextIndex];
      const dx = z.x - pos.x, dz = z.z - pos.z;
      const dist = Math.hypot(dx, dz);
      this.el.radarObjective.textContent = `${z.name.toUpperCase()} // ${Math.round(dist)}m`;
      const [x, y] = project(z.x, z.z);
      const ox = x - cx, oy = y - cy;
      if (ox * ox + oy * oy > (R - 16) ** 2) {
        const a = Math.atan2(oy, ox);
        const ex = cx + Math.cos(a) * (R - 18);
        const ey = cy + Math.sin(a) * (R - 18);
        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(a + Math.PI / 2);
        ctx.fillStyle = "#ffb545";
        ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(7, 7); ctx.lineTo(-7, 7); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }
  }

  /* --------------------------------- map ---------------------------------- */
  drawCampaign(canvas, ctx, opts = {}) {
    if (!canvas || !ctx) return;
    const { player, cleared = new Set(), nextIndex = 0, activeIndex = -1, compact = false } = opts;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#050908";
    ctx.fillRect(0, 0, W, H);

    const pad = compact ? 50 : 60;
    const bw = MAP_BOUNDS.maxX - MAP_BOUNDS.minX;
    const bh = MAP_BOUNDS.maxZ - MAP_BOUNDS.minZ;
    const scale = Math.min((W - pad * 2) / bw, (H - pad * 2) / bh);
    const ox = (W - bw * scale) / 2, oy = (H - bh * scale) / 2;
    const tx = x => ox + (x - MAP_BOUNDS.minX) * scale;
    const ty = z => oy + (z - MAP_BOUNDS.minZ) * scale;

    // grid
    ctx.strokeStyle = "rgba(125,255,176,0.05)";
    ctx.lineWidth = 1;
    for (let x = Math.ceil(MAP_BOUNDS.minX / 200) * 200; x < MAP_BOUNDS.maxX; x += 200) {
      ctx.beginPath(); ctx.moveTo(tx(x), 0); ctx.lineTo(tx(x), H); ctx.stroke();
    }
    for (let z = Math.ceil(MAP_BOUNDS.minZ / 200) * 200; z < MAP_BOUNDS.maxZ; z += 200) {
      ctx.beginPath(); ctx.moveTo(0, ty(z)); ctx.lineTo(W, ty(z)); ctx.stroke();
    }

    // Region names give the map the shape of a country, not a level list.
    for (const region of Object.values(REGIONS)) {
      const members = ZONES.filter(z => z.region === region.id);
      if (!members.length) continue;
      const rx = members.reduce((a, z) => a + z.x, 0) / members.length;
      const rz = members.reduce((a, z) => a + z.z, 0) / members.length;
      ctx.save();
      const lx = tx(rx), ly = ty(rz);
      const label = region.name;
      ctx.font = compact ? "700 10px Consolas, monospace" : "700 14px Bahnschrift, Segoe UI, sans-serif";
      const w = ctx.measureText(label).width + (compact ? 10 : 18);
      ctx.fillStyle = "rgba(4, 8, 6, 0.66)";
      ctx.fillRect(lx - w / 2, ly - (compact ? 16 : 22), w, compact ? 27 : 36);
      ctx.globalAlpha = compact ? 0.7 : 0.58;
      ctx.fillStyle = region.color;
      ctx.textAlign = "center";
      ctx.fillText(label, lx, ly - (compact ? 2 : 8));
      ctx.font = compact ? "400 7px Consolas, monospace" : "400 10px Consolas, monospace";
      ctx.fillText(region.label + " // ROUTE 9", lx, ly + (compact ? 9 : 8));
      ctx.restore();
    }

    // Local farm lanes, suburban loops and city grids.
    for (const roadLine of LOCAL_ROADS) {
      ctx.strokeStyle = roadLine.type === 3 ? "rgba(155,120,75,0.2)" : "rgba(185,190,180,0.14)";
      ctx.lineWidth = compact ? 0.6 : 1;
      ctx.beginPath();
      roadLine.points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(tx(p.x), ty(p.z));
        else ctx.lineTo(tx(p.x), ty(p.z));
      });
      ctx.stroke();
    }

    // Curved national highway.
    ctx.strokeStyle = "rgba(216,165,74,0.3)";
    ctx.lineWidth = compact ? 1.5 : 2.6;
    ctx.beginPath();
    MAIN_ROAD.forEach((p, i) => {
      if (i === 0) ctx.moveTo(tx(p.x), ty(p.z));
      else ctx.lineTo(tx(p.x), ty(p.z));
    });
    ctx.stroke();

    // Glowing route only up to the next checkpoint. Everything beyond is sealed.
    if (nextIndex > 0) {
      ctx.strokeStyle = "rgba(255,181,69,0.24)";
      ctx.lineWidth = 6;
      ctx.beginPath();
      for (let i = 0; i < nextIndex; i++) {
        const z = ZONES[i];
        if (i === 0) ctx.moveTo(tx(z.x), ty(z.z)); else ctx.lineTo(tx(z.x), ty(z.z));
      }
      const n = ZONES[nextIndex];
      ctx.lineTo(tx(n.x), ty(n.z));
      ctx.stroke();
    }
    ctx.save();
    ctx.setLineDash([4, 7]);
    ctx.strokeStyle = "rgba(190, 80, 70, 0.25)";
    ctx.lineWidth = compact ? 1 : 1.5;
    ctx.beginPath();
    for (let i = nextIndex; i < ZONES.length; i++) {
      const z = ZONES[i];
      if (i === nextIndex) ctx.moveTo(tx(z.x), ty(z.z));
      else ctx.lineTo(tx(z.x), ty(z.z));
    }
    ctx.stroke();
    ctx.restore();

    for (const z of ZONES) {
      const x = tx(z.x), y = ty(z.z);
      const isCleared = cleared.has(z.index);
      const isNext = z.index === nextIndex;
      const isActive = z.index === activeIndex;
      const isBoss = z.isBoss;
      const locked = !isCleared && !isNext && z.index > nextIndex;

      if (isNext && !isCleared) {
        ctx.strokeStyle = "rgba(255,181,69,0.4)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, compact ? 13 : 18, 0, Math.PI * 2); ctx.stroke();
      }
      const r = compact ? 5 : (isBoss ? 9 : 7);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = isCleared ? "#7dffb0" :
        locked ? (isBoss ? "#6b2f3a" : "#4a4842") :
        isBoss ? "#ff3b5c" : isNext ? "#ffd07d" : isActive ? "#ffb545" : (z.regionColor || "#5d5643");
      ctx.fill();
      if (isActive) {
        ctx.strokeStyle = "#fff3d0"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, r + 5, 0, Math.PI * 2); ctx.stroke();
      }

      if (locked) {
        ctx.strokeStyle = "rgba(255,105,92,0.7)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y - 10, 2.4, Math.PI, 0);
        ctx.stroke();
        ctx.fillStyle = "rgba(8,10,9,0.92)";
        ctx.fillRect(x - 3.2, y - 8.5, 6.4, 5);
        ctx.strokeStyle = "rgba(255,105,92,0.8)";
        ctx.strokeRect(x - 3.2, y - 8.5, 6.4, 5);
      }

      if (!compact) {
        ctx.fillStyle = isCleared ? "#bfe8cc" : locked ? "#6c6f66" : isNext ? "#fff1d0" : "#8d8a78";
        ctx.font = isNext ? "700 13px Consolas, monospace" : "400 11px Consolas, monospace";
        ctx.textAlign = "left";
        ctx.fillText(String(z.id).padStart(2, "0"), x + r + 4, y + 4);
        if (isNext || isBoss) {
          ctx.font = "700 14px Bahnschrift, Segoe UI, sans-serif";
          ctx.fillStyle = locked ? "#8c555b" : isBoss ? "#ff8b9d" : "#ffd07d";
          ctx.fillText(z.name.toUpperCase(), x + r + 22, y + 4);
        }
      }
    }

    if (player) {
      const x = tx(player.pos.x), y = ty(player.pos.z);
      const a = -player.yaw;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#fff";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(0, -11); ctx.lineTo(7, 8); ctx.lineTo(0, 4); ctx.lineTo(-7, 8); ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.shadowBlur = 0;
    }

    if (!compact) {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, H - 34, W, 34);
      ctx.fillStyle = "#77907e";
      ctx.font = "11px Consolas, monospace";
      ctx.textAlign = "left";
      ctx.fillText("THE NATION // NATIONAL ROUTE 9 // 33 STRONGHOLDS", 18, H - 13);
      ctx.textAlign = "right";
      ctx.fillStyle = "#ffb545";
      ctx.fillText(`${cleared.size} SECURED`, W - 18, H - 13);
    }
  }

  drawStartMap() {
    if (!this.startMapCtx) return;
    const cleared = new Set();
    this.drawCampaign(this.startMap, this.startMapCtx, {
      player: null, cleared, nextIndex: 0, activeIndex: -1, compact: true
    });
    // Mark the final objective
    const ctx = this.startMapCtx;
    const W = this.startMap.width, H = this.startMap.height;
    ctx.fillStyle = "#ff5a6f";
    ctx.font = "600 12px Consolas, monospace";
    ctx.textAlign = "center";
    ctx.fillText("THE DIRECTOR", W / 2, H - 16);
  }

  drawMap(data) {
    this.drawCampaign(this.mapCanvas, this.mapCtx, data);
    const secured = data.cleared.size;
    $("map-summary").textContent = secured >= 33
      ? "33 / 33 SECURED // NATION CLEARED"
      : `${secured} / 33 SECURED // NEXT: CHECKPOINT ${String(data.nextIndex + 1).padStart(2, "0")}`;
  }
}
