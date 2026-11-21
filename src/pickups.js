import * as THREE from "three";

function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,0.9)");
  g.addColorStop(0.35, "rgba(255,220,130,0.4)");
  g.addColorStop(1, "rgba(255,180,40,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function crateTexture(kind) {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d");
  const rnd = (() => { let s = kind === "health" ? 811 : 1907; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
  ctx.fillStyle = kind === "health" ? "#5c9d72" : "#a67d41";
  ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = "rgba(0,0,0,.35)";
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 60, 60);
  if (kind === "health") {
    ctx.fillStyle = "#edf7ee";
    ctx.fillRect(25, 13, 14, 38);
    ctx.fillRect(13, 25, 38, 14);
    ctx.strokeStyle = "rgba(23,80,43,.5)";
    ctx.lineWidth = 2;
    ctx.strokeRect(14, 14, 36, 36);
  } else {
    ctx.fillStyle = "#3a2d1a";
    ctx.fillRect(8, 20, 48, 8);
    ctx.fillStyle = "#e4c879";
    for (let i = 0; i < 7; i++) ctx.fillRect(10 + i * 7, 34, 4, 15);
    ctx.fillStyle = "rgba(255,255,255,.22)";
    ctx.fillRect(6, 6, 52, 3);
  }
  for (let i = 0; i < 38; i++) {
    ctx.fillStyle = rnd() < 0.5 ? "rgba(0,0,0,.14)" : "rgba(255,255,255,.12)";
    ctx.fillRect(Math.floor(rnd() * 64), Math.floor(rnd() * 64), 1, 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
const HEALTH_TEX = crateTexture("health");
const AMMO_TEX = crateTexture("ammo");

const GEO = {
  health: new THREE.BoxGeometry(0.46, 0.34, 0.36),
  crossA: new THREE.BoxGeometry(0.3, 0.09, 0.02),
  crossB: new THREE.BoxGeometry(0.09, 0.3, 0.02),
  ammo: new THREE.BoxGeometry(0.52, 0.3, 0.36),
  stripe: new THREE.BoxGeometry(0.54, 0.07, 0.38),
  ring: new THREE.TorusGeometry(0.5, 0.025, 4, 22)
};

const MAT = {
  health: new THREE.MeshBasicMaterial({ color: 0x8fffb7, map: HEALTH_TEX }),
  healthDark: new THREE.MeshBasicMaterial({ color: 0x1b5b39, map: HEALTH_TEX }),
  white: new THREE.MeshBasicMaterial({ color: 0xeaffef }),
  ammo: new THREE.MeshBasicMaterial({ color: 0xffd27a, map: AMMO_TEX }),
  ammoDark: new THREE.MeshBasicMaterial({ color: 0x6a4b26, map: AMMO_TEX }),
  ringHealth: new THREE.MeshBasicMaterial({ color: 0x5cff9e, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }),
  ringAmmo: new THREE.MeshBasicMaterial({ color: 0xffc45e, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })
};

export class PickupManager {
  constructor({ scene, player, weapons, hud, audio, world }) {
    this.scene = scene;
    this.player = player;
    this.weapons = weapons;
    this.hud = hud;
    this.audio = audio;
    this.world = world;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.items = [];
    this.time = 0;
    this.glowTex = glowTexture();
    this.glowMatHealth = new THREE.SpriteMaterial({ map: this.glowTex, color: 0x6bffa8, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false });
    this.glowMatAmmo = new THREE.SpriteMaterial({ map: this.glowTex, color: 0xffc45e, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false });
  }

  spawn(type, pos, amount) {
    const g = new THREE.Group();
    if (type === "health") {
      const box = new THREE.Mesh(GEO.health, MAT.healthDark);
      box.position.y = 0.25;
      const face = new THREE.Mesh(new THREE.BoxGeometry(0.47, 0.35, 0.37), MAT.health);
      face.position.y = 0.25;
      // Slightly smaller bright shell, then a white cross on both visible faces.
      face.scale.set(0.92, 0.92, 0.94);
      const a = new THREE.Mesh(GEO.crossA, MAT.white); a.position.set(0, 0.25, 0.19);
      const b = new THREE.Mesh(GEO.crossB, MAT.white); b.position.set(0, 0.25, 0.19);
      const a2 = new THREE.Mesh(GEO.crossA, MAT.white); a2.position.set(0, 0.25, -0.19);
      const b2 = new THREE.Mesh(GEO.crossB, MAT.white); b2.position.set(0, 0.25, -0.19);
      const ring = new THREE.Mesh(GEO.ring, MAT.ringHealth);
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.24;
      const glow = new THREE.Sprite(this.glowMatHealth); glow.scale.setScalar(1.7); glow.position.y = 0.3;
      g.add(box, face, a, b, a2, b2, ring, glow);
    } else {
      const box = new THREE.Mesh(GEO.ammo, MAT.ammoDark);
      box.position.y = 0.22;
      const shell = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.28, 0.34), MAT.ammo);
      shell.position.y = 0.22; shell.scale.set(0.92, 0.93, 0.93);
      const stripe = new THREE.Mesh(GEO.stripe, MAT.ammoDark);
      stripe.position.y = 0.22;
      const ring = new THREE.Mesh(GEO.ring, MAT.ringAmmo);
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.2;
      const glow = new THREE.Sprite(this.glowMatAmmo); glow.scale.setScalar(1.5); glow.position.y = 0.28;
      g.add(box, shell, stripe, ring, glow);
    }
    const y = this.world.surfaceY(pos.x, pos.z) + 0.3;
    g.position.set(pos.x, y, pos.z);
    this.group.add(g);
    this.items.push({
      type, group: g, amount: amount ?? (type === "health" ? 260 : 85),
      baseY: y, phase: Math.random() * Math.PI * 2, age: 0
    });
    if (this.items.length > 130) this.remove(0);
  }

  remove(index) {
    const it = this.items[index];
    if (!it) return;
    this.group.remove(it.group);
    this.items.splice(index, 1);
  }

  supplyDrop(pos) {
    this.spawn("health", { x: pos.x + 2.2, z: pos.z + 1.2 }, 400);
    this.spawn("ammo", { x: pos.x - 2.4, z: pos.z + 1.8 }, 120);
    this.spawn("ammo", { x: pos.x + 0.4, z: pos.z - 2.6 }, 120);
  }

  update(dt) {
    this.time += dt;
    const pp = this.player.pos;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.age += dt;
      const bob = Math.sin(this.time * 2.6 + it.phase) * 0.11;
      it.group.position.y = it.baseY + bob;
      it.group.rotation.y += dt * 1.4;
      const dx = pp.x - it.group.position.x;
      const dz = pp.z - it.group.position.z;
      const dy = (pp.y + 0.9) - it.group.position.y;
      if (dx * dx + dz * dz < 2.6 * 2.6 && Math.abs(dy) < 2.1) {
        if (it.type === "health") {
          this.player.addHealth(it.amount);
          this.hud.toast("BIO-NANITES", `+${it.amount} INTEGRITY // NO CAP`, "green");
          this.audio.pickup(true);
        } else {
          this.weapons.addAmmo(it.amount);
          this.hud.toast("MUNITIONS", `+${it.amount} ROUNDS // ALL WEAPONS`, "amber");
          this.audio.pickup(false);
        }
        this.remove(i);
      } else if (it.age > 240 && Math.abs(dx) > 120) {
        this.remove(i);
      }
    }
  }

  clear() {
    for (let i = this.items.length - 1; i >= 0; i--) this.remove(i);
  }
}
