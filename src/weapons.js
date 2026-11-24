import * as THREE from "three";

export const KNIFE = {
  id: "knife", name: "VX-7 COMBAT KNIFE", short: "VX-7", mode: "MELEE",
  damage: 260, headshot: 1, rpm: 130, auto: false, mag: 1, reserve: 0,
  spread: 0, moveSpread: 0, reload: 0, pellets: 1,
  recoil: 0.012, range: 3.2, tracer: 0xffffff, audio: "knife", flash: 0,
  adsFov: 78, adsFactor: 1, melee: true,
  falloffStart: 999, falloffMin: 1, shotTracers: 0
};

export const WEAPONS = [
  {
    id: "pistol", name: "VK-9 SIDEARM", short: "VK-9", mode: "SEMI",
    damage: 78, headshot: 2.4, rpm: 340, auto: false, mag: 28, reserve: 210,
    spread: 0.0045, moveSpread: 0.011, reload: 1.1, pellets: 1,
    recoil: 0.012, range: 170, tracer: 0xffd58a, audio: "pistol", flash: 0.16,
    adsFov: 67, adsFactor: 0.16,
    falloffStart: 45, falloffMin: 0.72, shotTracers: 1
  },
  {
    id: "smg", name: "HORNET SMG", short: "HORNET", mode: "AUTO",
    damage: 32, headshot: 2.0, rpm: 820, auto: true, mag: 90, reserve: 630,
    spread: 0.014, moveSpread: 0.02, reload: 1.5, pellets: 1,
    recoil: 0.006, range: 130, tracer: 0xffe0a0, audio: "smg", flash: 0.14,
    adsFov: 64, adsFactor: 0.3,
    falloffStart: 28, falloffMin: 0.55, shotTracers: 1
  },
  {
    id: "rifle", name: "WARDEN AR", short: "WARDEN", mode: "AUTO",
    damage: 54, headshot: 2.2, rpm: 580, auto: true, mag: 72, reserve: 420,
    spread: 0.0065, moveSpread: 0.024, reload: 1.85, pellets: 1,
    recoil: 0.0095, range: 220, tracer: 0xffcf78, audio: "rifle", flash: 0.2,
    adsFov: 57, adsFactor: 0.12,
    falloffStart: 60, falloffMin: 0.72, shotTracers: 1
  },
  {
    id: "shotgun", name: "BREAKER 12", short: "BREAKER", mode: "PUMP",
    damage: 24, headshot: 1.6, rpm: 95, auto: false, mag: 16, reserve: 96,
    spread: 0.075, moveSpread: 0.032, reload: 2.25, pellets: 9,
    recoil: 0.036, range: 70, tracer: 0xffbc6a, audio: "shotgun", flash: 0.34,
    adsFov: 70, adsFactor: 0.58,
    falloffStart: 8, falloffMin: 0.22, shotTracers: 4
  },
  {
    id: "dmr", name: "M-14 RANGER", short: "RANGER", mode: "SEMI",
    damage: 108, headshot: 2.2, rpm: 200, auto: false, mag: 24, reserve: 180,
    spread: 0.0022, moveSpread: 0.016, reload: 2.05, pellets: 1,
    recoil: 0.021, range: 280, tracer: 0xffe0a0, audio: "dmr", flash: 0.22,
    adsFov: 30, adsFactor: 0.05, scope: true, scopeZoom: "3.0×",
    falloffStart: 140, falloffMin: 0.8, shotTracers: 1
  },
  {
    id: "rail", name: "LONGSHOT RAIL", short: "LONGSHOT", mode: "CHARGE",
    damage: 340, headshot: 2.0, rpm: 52, auto: false, mag: 10, reserve: 40,
    spread: 0.0012, moveSpread: 0.018, reload: 1.3, pellets: 1,
    recoil: 0.045, range: 320, tracer: 0x7fe8ff, audio: "rail", flash: 0.3,
    adsFov: 22, adsFactor: 0.035, scope: true, scopeZoom: "4.0×",
    falloffStart: 999, falloffMin: 1, shotTracers: 1, pierce: 3
  },
  {
    id: "bazooka", name: "M-90 BAZOOKA", short: "M-90", mode: "ROCKET",
    damage: 620, headshot: 1, rpm: 35, auto: false, mag: 2, reserve: 6,
    spread: 0.003, moveSpread: 0.01, reload: 1.45, pellets: 1,
    recoil: 0.075, range: 160, tracer: 0xffb46a, audio: "bazooka", flash: 0.4,
    adsFov: 72, adsFactor: 0.8, rocket: true, blastRadius: 14, blastDamage: 620,
    falloffStart: 999, falloffMin: 1, shotTracers: 0
  }
];

/* ------------------------------- view models ------------------------------ */
const M = {
  dark: new THREE.MeshLambertMaterial({ color: 0x24333d, emissive: 0x0e2b36 }),
  body: new THREE.MeshLambertMaterial({ color: 0x3a5260, emissive: 0x103440 }),
  light: new THREE.MeshLambertMaterial({ color: 0x7392a1, emissive: 0x0a2029 }),
  grip: new THREE.MeshLambertMaterial({ color: 0x1a262e }),
  accent: new THREE.MeshLambertMaterial({ color: 0xb46924, emissive: 0x2a1204 }),
  glow: new THREE.MeshBasicMaterial({ color: 0x8cefff }),
  purple: new THREE.MeshBasicMaterial({ color: 0xc17bff }),
  tan: new THREE.MeshLambertMaterial({ color: 0x3f5360 }),
  grenade: new THREE.MeshLambertMaterial({ color: 0x394b40 })
};
const ROCKET_GEOS = {
  body: new THREE.BoxGeometry(0.16, 0.16, 0.62),
  nose: new THREE.BoxGeometry(0.13, 0.13, 0.2),
  fin: new THREE.BoxGeometry(0.03, 0.22, 0.16),
  glow: new THREE.BoxGeometry(0.09, 0.09, 0.12)
};
const GRENADE_GEO = new THREE.SphereGeometry(0.16, 8, 6);

function bx(parent, mat, w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  parent.add(mesh);
  return mesh;
}

function muzzleAt(parent, x, y, z) {
  const o = new THREE.Object3D();
  o.position.set(x, y, z);
  parent.add(o);
  return o;
}

function buildPistol() {
  const g = new THREE.Group();
  bx(g, M.body, 0.105, 0.105, 0.27, 0, 0.035, -0.13);
  bx(g, M.dark, 0.09, 0.06, 0.3, 0, 0.095, -0.14);
  bx(g, M.grip, 0.085, 0.2, 0.11, 0, -0.105, -0.015, 0.22);
  bx(g, M.light, 0.04, 0.04, 0.12, 0, 0.025, -0.31);
  bx(g, M.accent, 0.112, 0.016, 0.1, 0, 0.052, -0.18);
  bx(g, M.glow, 0.02, 0.012, 0.02, 0, 0.075, 0.005);
  bx(g, M.glow, 0.006, 0.012, 0.15, 0.054, 0.042, -0.17);
  bx(g, M.glow, 0.006, 0.012, 0.15, -0.054, 0.042, -0.17);
  const muzzle = muzzleAt(g, 0, 0.03, -0.38);
  return { group: g, muzzle };
}

function buildSMG() {
  const g = new THREE.Group();
  bx(g, M.body, 0.13, 0.14, 0.38, 0, 0.02, -0.16);
  bx(g, M.dark, 0.07, 0.07, 0.2, 0, 0.02, -0.43);
  bx(g, M.dark, 0.085, 0.085, 0.13, 0, 0.02, -0.57);
  bx(g, M.grip, 0.075, 0.19, 0.1, 0, -0.13, -0.03, 0.15);
  bx(g, M.dark, 0.055, 0.23, 0.09, 0, -0.17, -0.22, -0.1);
  bx(g, M.body, 0.07, 0.09, 0.2, 0, 0.01, 0.13);
  bx(g, M.accent, 0.135, 0.025, 0.2, 0, 0.085, -0.2);
  bx(g, M.light, 0.09, 0.035, 0.06, 0, 0.13, -0.16);
  bx(g, M.glow, 0.007, 0.013, 0.22, 0.069, 0.045, -0.2);
  bx(g, M.glow, 0.007, 0.013, 0.22, -0.069, 0.045, -0.2);
  bx(g, M.glow, 0.09, 0.007, 0.012, 0, 0.075, -0.34);
  const muzzle = muzzleAt(g, 0, 0.02, -0.65);
  return { group: g, muzzle };
}

function buildRifle() {
  const g = new THREE.Group();
  bx(g, M.body, 0.12, 0.13, 0.5, 0, 0.01, -0.14);
  bx(g, M.dark, 0.085, 0.08, 0.3, 0, 0.01, -0.52);
  bx(g, M.dark, 0.045, 0.045, 0.2, 0, 0.01, -0.76);
  bx(g, M.accent, 0.135, 0.025, 0.4, 0, 0.085, -0.34);
  bx(g, M.grip, 0.08, 0.2, 0.1, 0, -0.13, 0.01, 0.18);
  bx(g, M.dark, 0.07, 0.25, 0.1, 0, -0.19, -0.2, -0.08);
  bx(g, M.body, 0.1, 0.12, 0.24, 0, 0.0, 0.22);
  bx(g, M.body, 0.17, 0.035, 0.14, 0, 0.155, -0.13);
  bx(g, M.glow, 0.045, 0.03, 0.045, 0, 0.175, -0.13);
  bx(g, M.dark, 0.03, 0.1, 0.045, 0.055, 0.2, -0.06);
  bx(g, M.dark, 0.03, 0.1, 0.045, -0.055, 0.2, -0.06);
  bx(g, M.glow, 0.007, 0.014, 0.3, 0.062, 0.04, -0.24);
  bx(g, M.glow, 0.007, 0.014, 0.3, -0.062, 0.04, -0.24);
  const muzzle = muzzleAt(g, 0, 0.01, -0.87);
  return { group: g, muzzle };
}

function buildShotgun() {
  const g = new THREE.Group();
  bx(g, M.body, 0.14, 0.15, 0.36, 0, 0.01, -0.1);
  bx(g, M.dark, 0.1, 0.1, 0.46, 0, 0.045, -0.48);
  bx(g, M.light, 0.13, 0.11, 0.22, 0, -0.02, -0.56);
  bx(g, M.tan, 0.1, 0.13, 0.22, 0, -0.05, 0.14);
  bx(g, M.grip, 0.08, 0.18, 0.1, 0, -0.12, -0.02, 0.2);
  bx(g, M.accent, 0.145, 0.024, 0.16, 0, 0.083, -0.1);
  bx(g, M.accent, 0.03, 0.03, 0.05, 0, 0.095, -0.24);
  bx(g, M.glow, 0.012, 0.008, 0.26, 0, 0.1, -0.5);
  bx(g, M.glow, 0.007, 0.014, 0.18, 0.072, 0.06, -0.28);
  bx(g, M.glow, 0.007, 0.014, 0.18, -0.072, 0.06, -0.28);
  const muzzle = muzzleAt(g, 0, 0.045, -0.72);
  return { group: g, muzzle };
}

function buildDMR() {
  const g = new THREE.Group();
  bx(g, M.body, 0.11, 0.12, 0.62, 0, 0.01, -0.18);
  bx(g, M.dark, 0.075, 0.075, 0.34, 0, 0.01, -0.62);
  bx(g, M.dark, 0.045, 0.045, 0.2, 0, 0.01, -0.84);
  bx(g, M.tan, 0.11, 0.14, 0.34, 0, -0.01, 0.22);
  bx(g, M.grip, 0.08, 0.2, 0.1, 0, -0.13, -0.05, 0.18);
  bx(g, M.dark, 0.07, 0.24, 0.1, 0, -0.18, -0.26, -0.08);
  bx(g, M.accent, 0.12, 0.022, 0.24, 0, 0.078, -0.18);
  const scope = bx(g, M.dark, 0.085, 0.09, 0.32, 0, 0.18, -0.12);
  bx(scope, M.glow, 0.055, 0.055, 0.012, 0, 0, -0.165);
  bx(g, M.light, 0.145, 0.03, 0.22, 0, 0.075, -0.46);
  bx(g, M.glow, 0.007, 0.013, 0.34, 0.057, 0.045, -0.24);
  bx(g, M.glow, 0.007, 0.013, 0.34, -0.057, 0.045, -0.24);
  bx(g, M.glow, 0.08, 0.007, 0.012, 0, 0.07, -0.5);
  const muzzle = muzzleAt(g, 0, 0.01, -0.96);
  return { group: g, muzzle };
}

function buildKnife() {
  const g = new THREE.Group();
  bx(g, M.dark, 0.065, 0.1, 0.18, 0, 0, 0.02);
  bx(g, M.grip, 0.055, 0.07, 0.08, 0, -0.02, 0.09);
  bx(g, M.accent, 0.09, 0.025, 0.03, 0, 0.03, -0.06);
  bx(g, M.light, 0.035, 0.06, 0.42, 0, 0.08, -0.27, -0.06);
  bx(g, M.body, 0.04, 0.07, 0.1, 0, 0.08, -0.04);
  bx(g, M.glow, 0.008, 0.012, 0.34, 0.019, 0.092, -0.28, -0.06);
  bx(g, M.glow, 0.008, 0.012, 0.34, -0.019, 0.092, -0.28, -0.06);
  bx(g, M.glow, 0.012, 0.008, 0.36, 0, 0.052, -0.28, -0.06);
  bx(g, M.glow, 0.03, 0.012, 0.03, 0, 0.035, -0.06);
  const muzzle = muzzleAt(g, 0, 0.08, -0.5);
  return { group: g, muzzle };
}

function buildBazooka() {
  const g = new THREE.Group();
  bx(g, M.body, 0.22, 0.22, 0.95, 0, 0.02, -0.18);
  bx(g, M.dark, 0.26, 0.26, 0.1, 0, 0.02, -0.66);
  bx(g, M.accent, 0.24, 0.24, 0.06, 0, 0.02, -0.72);
  bx(g, M.dark, 0.19, 0.19, 0.14, 0, 0.02, 0.31);
  bx(g, M.grip, 0.075, 0.18, 0.1, 0, -0.16, -0.03, 0.18);
  bx(g, M.grip, 0.07, 0.16, 0.09, 0, -0.15, -0.36, 0.12);
  bx(g, M.light, 0.09, 0.09, 0.2, 0, 0.16, -0.18);
  bx(g, M.accent, 0.07, 0.02, 0.07, 0, 0.21, -0.18);
  bx(g, M.dark, 0.1, 0.05, 0.06, 0, 0.22, 0.16);
  bx(g, M.glow, 0.03, 0.03, 0.03, 0, 0.22, 0.21);
  bx(g, M.glow, 0.007, 0.016, 0.6, 0.111, 0.045, -0.2);
  bx(g, M.glow, 0.007, 0.016, 0.6, -0.111, 0.045, -0.2);
  bx(g, M.glow, 0.12, 0.008, 0.012, 0, 0.128, -0.44);
  const muzzle = muzzleAt(g, 0, 0.02, -0.9);
  return { group: g, muzzle };
}

function buildRail() {
  const g = new THREE.Group();
  bx(g, M.dark, 0.1, 0.12, 0.62, 0, 0.01, -0.22);
  bx(g, M.body, 0.14, 0.09, 0.32, 0, -0.02, -0.2);
  bx(g, M.glow, 0.16, 0.02, 0.055, 0, 0.02, -0.44);
  bx(g, M.glow, 0.16, 0.02, 0.055, 0, 0.02, -0.33);
  bx(g, M.glow, 0.16, 0.02, 0.055, 0, 0.02, -0.22);
  bx(g, M.dark, 0.05, 0.05, 0.58, 0, 0.015, -0.78);
  bx(g, M.light, 0.075, 0.075, 0.1, 0, 0.015, -1.04);
  bx(g, M.grip, 0.075, 0.2, 0.1, 0, -0.14, -0.02, 0.18);
  bx(g, M.dark, 0.07, 0.23, 0.1, 0, -0.18, -0.22, -0.06);
  bx(g, M.body, 0.1, 0.1, 0.26, 0, 0.0, 0.2);
  bx(g, M.dark, 0.035, 0.12, 0.05, 0.06, 0.18, -0.1);
  bx(g, M.dark, 0.035, 0.12, 0.05, -0.06, 0.18, -0.1);
  const scope = bx(g, M.dark, 0.09, 0.09, 0.24, 0, 0.19, -0.18);
  bx(scope, M.glow, 0.05, 0.05, 0.01, 0, 0, -0.13);
  bx(g, M.glow, 0.006, 0.015, 0.5, 0.052, 0.035, -0.32);
  bx(g, M.glow, 0.006, 0.015, 0.5, -0.052, 0.035, -0.32);
  const muzzle = muzzleAt(g, 0, 0.015, -1.09);
  return { group: g, muzzle };
}

const BUILDERS = [buildPistol, buildSMG, buildRifle, buildShotgun, buildDMR, buildRail, buildBazooka];

export class WeaponSystem {
  constructor({ camera, scene, player, world, enemies, effects, audio, hud }) {
    this.camera = camera;
    this.scene = scene;
    this.player = player;
    this.world = world;
    this.enemies = enemies;
    this.effects = effects;
    this.audio = audio;
    this.hud = hud;

    this.defs = WEAPONS;
    this.state = WEAPONS.map(w => ({ mag: w.mag, reserve: w.reserve }));
    this.index = 0;
    this.cooldown = 0;
    this.reloadTimer = 0;
    this.reloadTotal = 0;
    this.switchTimer = 0;
    this.ads = false;
    this.adsT = 0;
    this.scoped = false;
    this.kick = 0;
    this.swayX = 0;
    this.swayY = 0;
    this.bobPhase = 0;
    this.triggerLatch = false;
    this.shots = 0;
    // Co-op sets these so bullets can hit human teammates and the AI squad.
    this.friendlyRaycast = null;
    this.friendlyDamage = null;
    // Checkpoint bonuses scale all outgoing damage.
    this.damageMultiplier = 1;
    this.grenades = 4;
    this.grenadeCooldown = 0;
    this.projectiles = [];
    this.meleeTimer = 0;
    this.meleeDuration = 0.3;
    this.punchCooldown = 0;
    this.punchTimer = 0;
    this.punchReturnIndex = -1;

    this.root = new THREE.Group();
    this.root.position.set(0.31, -0.27, -0.55);
    camera.add(this.root);

    this.models = BUILDERS.map((build, i) => {
      const m = build();
      m.group.visible = false;
      m.group.scale.setScalar(i === 6 ? 0.82 : i === 3 ? 0.95 : 0.9);
      this.root.add(m.group);
      return m;
    });
    this.models[0].group.visible = true;

    // The knife is a punch tool, not a holdable weapon slot.
    this.knifeDef = KNIFE;
    this.knifeModel = buildKnife();
    this.knifeModel.group.visible = false;
    this.knifeModel.group.scale.setScalar(0.9);
    this.root.add(this.knifeModel.group);

    this._origin = new THREE.Vector3();
    this._dir = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._up = new THREE.Vector3();
    this._end = new THREE.Vector3();
    this._muzzle = new THREE.Vector3();
    this._tmp = new THREE.Vector3();

    this.hud.setWeapon(this.currentDef, this.state[0], 0);
    this.hud.setWeaponSlots(this.state, 0);
    this.hud.setGrenades(this.grenades);
  }

  get currentDef() { return this.defs[this.index]; }
  get currentState() { return this.state[this.index]; }

  addLook(dx, dy) {
    this.swayX = THREE.MathUtils.clamp(this.swayX + dx * 0.00055, -0.09, 0.09);
    this.swayY = THREE.MathUtils.clamp(this.swayY + dy * 0.00045, -0.07, 0.07);
  }

  switchTo(index) {
    if (index < 0 || index >= this.defs.length || index === this.index) return;
    this.punchTimer = 0;
    this.punchReturnIndex = -1;
    this.knifeModel.group.visible = false;
    this.index = index;
    this.reloadTimer = 0;
    this.switchTimer = 0.28;
    this.kick = 0.06;
    if (this.scoped) {
      this.scoped = false;
      this.root.visible = true;
      this.hud.setScope(false, this.currentDef);
    }
    this.models.forEach((m, i) => { m.group.visible = i === index; });
    this.audio.ui();
    this.hud.setWeapon(this.currentDef, this.currentState, this.index);
    this.hud.setWeaponSlots(this.state, this.index);
  }

  cycle(dir) {
    const next = (this.index + dir + this.defs.length) % this.defs.length;
    this.switchTo(next);
  }

  startReload() {
    const w = this.currentDef, s = this.currentState;
    if (w.melee) return;
    if (this.reloadTimer > 0 || s.mag >= w.mag || s.reserve <= 0) return;
    this.reloadTimer = w.reload;
    this.reloadTotal = w.reload;
    this.audio.reload();
    this.hud.setReloading(true);
  }

  finishReload() {
    const w = this.currentDef, s = this.currentState;
    const need = w.mag - s.mag;
    const take = Math.min(need, s.reserve);
    s.mag += take;
    s.reserve -= take;
    this.hud.setReloading(false);
    this.hud.setWeapon(w, s, this.index);
    this.hud.setWeaponSlots(this.state, this.index);
  }

  addAmmo(amount = 90) {
    for (let i = 0; i < this.state.length; i++) {
      if (this.defs[i].melee) continue;
      this.state[i].reserve += Math.round(amount * 1.0);
    }
    this.grenades += 1;
    this.hud.setGrenades(this.grenades);
    this.hud.setWeapon(this.currentDef, this.currentState, this.index);
    this.hud.setWeaponSlots(this.state, this.index);
  }

  setGrenades(n) {
    this.grenades = Math.max(0, n | 0);
    this.hud.setGrenades(this.grenades);
  }

  refillMags() {
    for (let i = 0; i < this.state.length; i++) {
      if (this.defs[i].melee) {
        this.state[i].mag = 1;
        this.state[i].reserve = 0;
        continue;
      }
      this.state[i].mag = this.defs[i].mag;
      if (this.state[i].reserve < this.defs[i].mag * 3) this.state[i].reserve = this.defs[i].mag * 6;
    }
    this.hud.setWeapon(this.currentDef, this.currentState, this.index);
    this.hud.setWeaponSlots(this.state, this.index);
  }

  restore(ammoData) {
    if (!Array.isArray(ammoData)) return;
    ammoData.forEach((a, i) => {
      if (this.state[i] && a) {
        this.state[i].mag = Math.max(0, a.mag | 0);
        this.state[i].reserve = Math.max(0, a.reserve | 0);
      }
    });
    this.hud.setWeapon(this.currentDef, this.currentState, this.index);
    this.hud.setWeaponSlots(this.state, this.index);
  }

  addReserve(amount) {
    const s = this.currentState;
    s.reserve += Math.max(0, Math.round(amount));
    this.hud.setWeapon(this.currentDef, s, this.index);
    this.hud.setWeaponSlots(this.state, this.index);
  }

  takeReserveShare(fraction = 0.25) {
    const s = this.currentState;
    const amount = Math.min(s.reserve, Math.floor(s.reserve * Math.max(0, Math.min(1, fraction))));
    s.reserve -= amount;
    this.hud.setWeapon(this.currentDef, s, this.index);
    this.hud.setWeaponSlots(this.state, this.index);
    return amount;
  }

  getAmmoState() {
    return this.state.map(s => ({ mag: s.mag, reserve: s.reserve }));
  }

  update(dt, input) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.grenadeCooldown = Math.max(0, this.grenadeCooldown - dt);
    this.meleeTimer = Math.max(0, this.meleeTimer - dt);
    this.punchCooldown = Math.max(0, this.punchCooldown - dt);
    if (this.punchTimer > 0) {
      this.punchTimer = Math.max(0, this.punchTimer - dt);
      if (this.punchTimer === 0 && this.punchReturnIndex >= 0) {
        this.knifeModel.group.visible = false;
        this.models[this.index].group.visible = true;
        this.punchReturnIndex = -1;
      }
    }
    this.updateProjectiles(dt);
    if (this.switchTimer > 0) this.switchTimer = Math.max(0, this.switchTimer - dt);
    if (this.reloadTimer > 0) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.reloadTimer = 0;
        this.finishReload();
      }
    }
    if (input.reloadPressed) this.startReload();
    this.ads = !!input.ads;
    this.adsT += ((this.ads ? 1 : 0) - this.adsT) * Math.min(1, dt * 12);

    const wantScope = !!this.currentDef.scope && this.ads && this.adsT > 0.55 &&
      this.reloadTimer <= 0 && this.switchTimer <= 0;
    if (wantScope !== this.scoped) {
      this.scoped = wantScope;
      this.hud.setScope(wantScope, this.currentDef);
    }
    this.root.visible = !this.scoped;

    const wantFire = input.fire && (this.currentDef.auto || !this.triggerLatch);
    this.triggerLatch = !!input.fire;
    if (wantFire) this.tryFire();

    this.kick *= Math.exp(-dt * 14);
    this.swayX *= Math.exp(-dt * 9);
    this.swayY *= Math.exp(-dt * 9);

    const speed = Math.hypot(this.player.vel.x, this.player.vel.z);
    this.bobPhase += dt * (4 + speed * 0.9);
    const moveAmount = Math.min(1, speed / 7) * (this.player.grounded ? 1 : 0.2);
    const bobX = Math.cos(this.bobPhase) * 0.005 * moveAmount;
    const bobY = Math.abs(Math.sin(this.bobPhase)) * 0.005 * moveAmount;

    const adsPosX = 0.12, adsPosY = -0.30, adsPosZ = -0.53;
    const restX = 0.31, restY = -0.27, restZ = -0.55;
    const t = this.adsT;
    const steady = 1 - t * 0.78;
    let targetX = THREE.MathUtils.lerp(restX, adsPosX, t) + bobX * (1 - t * 0.7) + this.swayX * 0.5 * steady;
    let targetY = THREE.MathUtils.lerp(restY, adsPosY, t) + bobY * (1 - t * 0.7) - this.swayY * 0.35 * steady;
    let targetZ = THREE.MathUtils.lerp(restZ, adsPosZ, t) + this.kick * 1.8;
    let rotX = this.kick * 2.4 + this.swayY * 1.5 * steady;
    let rotY = this.swayX * 1.7 * steady;
    let rotZ = 0;

    if (this.switchTimer > 0) {
      const p = 1 - this.switchTimer / 0.28;
      targetY -= Math.sin(p * Math.PI) * 0.16;
      rotX -= Math.sin(p * Math.PI) * 0.4;
    }
    if (this.reloadTimer > 0) {
      const p = 1 - this.reloadTimer / this.reloadTotal;
      const s = Math.sin(Math.min(1, p * 1.6) * Math.PI);
      targetY -= s * 0.17;
      rotX -= s * 0.55;
      rotZ += s * 0.35;
    }
    if ((this.currentDef.melee || this.punchTimer > 0) && this.meleeTimer > 0) {
      const p = 1 - this.meleeTimer / this.meleeDuration;
      const s = Math.sin(p * Math.PI);
      targetX -= s * 0.22;
      targetY += s * 0.03;
      rotX += s * 0.55;
      rotZ += s * 1.1;
    }

    this.root.position.x += (targetX - this.root.position.x) * Math.min(1, dt * 18);
    this.root.position.y += (targetY - this.root.position.y) * Math.min(1, dt * 18);
    this.root.position.z += (targetZ - this.root.position.z) * Math.min(1, dt * 18);
    this.root.rotation.x += (rotX - this.root.rotation.x) * Math.min(1, dt * 20);
    this.root.rotation.y += (rotY - this.root.rotation.y) * Math.min(1, dt * 20);
    this.root.rotation.z += (rotZ - this.root.rotation.z) * Math.min(1, dt * 16);

    const spread = this.currentSpread();
    this.hud.setCrosshair(spread, this.ads);
  }

  currentSpread() {
    const w = this.currentDef;
    const speed = Math.hypot(this.player.vel.x, this.player.vel.z);
    const move = Math.min(1, speed / 8) * w.moveSpread;
    const hip = w.spread + move + this.kick * 1.35;
    const ads = w.spread * (w.adsFactor ?? 0.3) +
      move * (w.scope ? 0.4 : 0.22) +
      this.kick * (w.scope ? 0.12 : 0.28);
    return hip + (ads - hip) * this.adsT;
  }

  tryFire() {
    const w = this.currentDef, s = this.currentState;
    if (this.punchTimer > 0) return;
    if (this.cooldown > 0 || this.switchTimer > 0 || this.reloadTimer > 0) return;
    if (w.melee) {
      this.meleeAttack();
      this.cooldown = 60 / w.rpm;
      this.meleeTimer = this.meleeDuration;
      this.audio.shot("knife");
      return;
    }
    if (w.rocket) {
      if (s.mag <= 0) {
        this.audio.dryFire();
        if (s.reserve > 0) this.startReload();
        return;
      }
      s.mag--;
      this.cooldown = 60 / w.rpm;
      this.fireRocket();
      this.hud.setWeapon(w, s, this.index);
      this.hud.setWeaponSlots(this.state, this.index);
      if (s.mag === 0 && s.reserve > 0) {
        setTimeout(() => { if (this.currentState.mag === 0 && !this.currentDef.melee) this.startReload(); }, 260);
      }
      return;
    }
    if (s.mag <= 0) {
      this.audio.dryFire();
      if (s.reserve > 0) this.startReload();
      return;
    }

    s.mag--;
    this.cooldown = 60 / w.rpm;
    this.shots++;

    const cam = this.camera;
    cam.updateMatrixWorld();
    this._origin.setFromMatrixPosition(cam.matrixWorld);
    cam.getWorldDirection(this._dir);
    this._right.setFromMatrixColumn(cam.matrixWorld, 0);
    this._up.setFromMatrixColumn(cam.matrixWorld, 1);

    const baseSpread = this.currentSpread();
    let anyHit = false, anyKill = false, anyHead = false;
    let farthest = 0;
    const pierceHits = [];

    const pellets = w.pellets;
    for (let p = 0; p < pellets; p++) {
      const spread = baseSpread * (w.id === "shotgun" ? 0.65 + Math.random() * 0.7 : 1);
      const rx = (Math.random() + Math.random() + Math.random() - 1.5) * spread;
      const ry = (Math.random() + Math.random() + Math.random() - 1.5) * spread;
      const dir = this._tmp.copy(this._dir)
        .addScaledVector(this._right, rx)
        .addScaledVector(this._up, ry)
        .normalize();

      const wall = this.world.raycast(this._origin, dir, w.range);
      const maxDist = wall ? wall.dist : w.range;
      const hits = this.enemies.raycast(this._origin, dir, maxDist);
      let hit = hits.length ? hits[0] : null;
      const friendly = this.friendlyRaycast ? this.friendlyRaycast(this._origin, dir, maxDist) : null;
      const friendlyFirst = !!friendly && (!hit || friendly.dist < hit.dist);
      if (w.pierce && hits.length) {
        for (const h of hits.slice(0, w.pierce)) pierceHits.push({ h, dist: h.dist, dir: dir.clone() });
      }

      if (friendlyFirst) {
        const falloff = Math.max(w.falloffMin, 1 - Math.max(0, friendly.dist - w.falloffStart) / 90);
        let dmg = w.damage * falloff * this.damageMultiplier;
        if (friendly.headshot) dmg *= w.headshot;
        this.friendlyDamage?.(friendly, dmg, friendly.headshot);
        anyHit = true;
        anyHead = anyHead || friendly.headshot;
        const end = friendly.point;
        farthest = Math.max(farthest, friendly.dist);
        if (p < w.shotTracers || pellets === 1) {
          this.effects.tracer(this.getMuzzleWorld(), end, w.tracer, 0.06);
        }
        this.effects.burst(end, friendly.headshot ? 0xffc27a : 0xff7a6a, friendly.headshot ? 5 : 3, 3.2, 10);
      } else if (w.pierce) {
        // The railgun punches through a line of bodies; damage is applied once below.
        const end = wall ? wall.point : (hit ? hit.point : this._origin.clone().addScaledVector(dir, Math.min(w.range, 110)));
        farthest = Math.max(farthest, wall ? wall.dist : hit ? hit.dist : 110);
        this.effects.tracer(this.getMuzzleWorld(), end, w.tracer, 0.13);
        if (wall) this.effects.impact(end, 0xd8c49a, 10);
      } else if (hit) {
        const falloff = Math.max(w.falloffMin, 1 - Math.max(0, hit.dist - w.falloffStart) / 90);
        let dmg = w.damage * falloff * this.damageMultiplier;
        if (hit.headshot) dmg *= w.headshot;
        const killed = this.enemies.damage(hit.enemy, dmg, { headshot: hit.headshot, weapon: w });
        anyHit = true;
        anyHead = anyHead || hit.headshot;
        anyKill = anyKill || killed;
        const end = hit.point;
        farthest = Math.max(farthest, hit.dist);
        if (p < w.shotTracers || pellets === 1) {
          this.effects.tracer(this.getMuzzleWorld(), end, w.tracer, 0.06);
        }
        this.effects.burst(end, hit.headshot ? 0xffd27a : 0xba62ff, hit.headshot ? 5 : 3, 3.2, 10);
      } else {
        const end = wall ? wall.point : this._origin.clone().addScaledVector(dir, Math.min(w.range, 110));
        farthest = Math.max(farthest, wall ? wall.dist : 110);
        if (p < w.shotTracers || pellets === 1) {
          this.effects.tracer(this.getMuzzleWorld(), end, w.tracer, 0.055);
        }
        if (wall) this.effects.impact(end, 0xd8c49a, 4);
      }
    }

    if (w.pierce) {
      // The railgun punches through up to three bodies.
      const seen = new Set();
      for (const ph of pierceHits) {
        if (seen.has(ph.h.enemy)) continue;
        seen.add(ph.h.enemy);
        const killed = this.enemies.damage(ph.h.enemy, w.damage * (ph.h.headshot ? w.headshot : 1) * this.damageMultiplier, { headshot: ph.h.headshot, weapon: w, silent: true });
        anyHit = true;
        anyHead = anyHead || ph.h.headshot;
        anyKill = anyKill || killed;
        this.effects.burst(ph.h.point, 0xba62ff, 3, 3.2, 10);
      }
    }

    this.kick = Math.min(0.09, this.kick + w.recoil);
    this.player.addRecoil(w.recoil * (this.scoped ? 0.45 : this.ads ? 0.7 : 1));
    this.audio.shot(w.audio);
    this.enemies.alertNoise?.(this._origin.x, this._origin.y, this._origin.z, 110);
    if (!this.scoped) {
      this.effects.muzzle(this.getMuzzleWorld(), w.id === "rail" ? 0x9fe8ff : 0xffc45e, w.flash);
    }
    if (anyHit) {
      this.hud.hitmarker(anyKill, anyHead);
      this.audio.hit(anyHead);
      if (anyKill) this.audio.kill();
    }
    void farthest;

    s.mag = Math.max(0, s.mag);
    this.hud.setWeapon(w, s, this.index);
    this.hud.setWeaponSlots(this.state, this.index);
    if (s.mag === 0 && s.reserve > 0) {
      setTimeout(() => { if (this.currentState.mag === 0) this.startReload(); }, 180);
    }
  }

  punch() {
    if (this.punchCooldown > 0 || this.punchTimer > 0) return false;
    this.punchCooldown = 0.42;
    this.punchTimer = this.meleeDuration;
    this.meleeTimer = this.meleeDuration;
    this.audio.shot("knife");
    if (this.scoped) {
      this.scoped = false;
      this.root.visible = true;
      this.hud.setScope(false, this.currentDef);
    }
    this.punchReturnIndex = this.index;
    this.models[this.index].group.visible = false;
    this.knifeModel.group.visible = true;
    this.meleeAttack(this.knifeDef);
    return true;
  }

  meleeAttack(def = this.currentDef) {
    const cam = this.camera;
    cam.updateMatrixWorld();
    const origin = new THREE.Vector3().setFromMatrixPosition(cam.matrixWorld);
    const dir = new THREE.Vector3();
    cam.getWorldDirection(dir);
    let hits = 0, kills = 0;
    for (const e of this.enemies.enemies) {
      if (e.dead) continue;
      const center = new THREE.Vector3(e.pos.x, e.pos.y + 1.05 * (e.hitScale || 1), e.pos.z);
      const to = center.clone().sub(origin);
      const dist = to.length();
      if (dist > 3.5) continue;
      to.multiplyScalar(1 / Math.max(0.001, dist));
      if (to.dot(dir) < 0.12) continue;
      if (!this.world.hasLOS(origin, center)) continue;
      const killed = this.enemies.damage(e, def.damage * this.damageMultiplier, { weapon: def, melee: true });
      this.effects.burst(center, 0xffd27a, 4, 2.4, 8);
      hits++;
      if (killed) kills++;
    }
    if (hits) {
      this.hud.hitmarker(kills > 0, false);
      this.audio.hit(false);
      if (kills) this.audio.kill();
    }
    this.player.addRecoil(def.recoil || 0.012);
  }

  fireRocket() {
    const w = this.currentDef;
    const cam = this.camera;
    cam.updateMatrixWorld();
    const origin = new THREE.Vector3().setFromMatrixPosition(cam.matrixWorld);
    const dir = new THREE.Vector3();
    cam.getWorldDirection(dir);
    const start = origin.clone().addScaledVector(dir, 1.25);
    const g = new THREE.Group();
    const body = new THREE.Mesh(ROCKET_GEOS.body, M.body);
    body.position.z = 0.1;
    const nose = new THREE.Mesh(ROCKET_GEOS.nose, M.accent);
    nose.position.z = -0.3;
    const fin1 = new THREE.Mesh(ROCKET_GEOS.fin, M.dark);
    fin1.position.set(0.09, 0, 0.3);
    const fin2 = new THREE.Mesh(ROCKET_GEOS.fin, M.dark);
    fin2.position.set(-0.09, 0, 0.3);
    const glow = new THREE.Mesh(ROCKET_GEOS.glow, M.glow);
    glow.position.z = 0.43;
    g.add(body, nose, fin1, fin2, glow);
    g.position.copy(start);
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), dir.clone().normalize());
    this.scene.add(g);
    this.projectiles.push({
      type: "rocket", mesh: g, pos: start, vel: dir.clone().multiplyScalar(66),
      life: 5, fuse: 5, radius: w.blastRadius || 14, damage: w.blastDamage || 620,
      weapon: w, trail: 0
    });
    this.player.addRecoil(w.recoil * 1.15);
    this.audio.shot("bazooka");
    this.effects.muzzle(this.getMuzzleWorld(), 0xffb46a, 0.55);
  }

  throwGrenade() {
    if (this.grenadeCooldown > 0 || this.grenades <= 0) return false;
    this.grenades--;
    this.grenadeCooldown = 0.75;
    this.hud.setGrenades(this.grenades);
    this.audio.ui();
    const cam = this.camera;
    cam.updateMatrixWorld();
    const origin = new THREE.Vector3().setFromMatrixPosition(cam.matrixWorld);
    const dir = new THREE.Vector3();
    cam.getWorldDirection(dir);
    const start = origin.clone().addScaledVector(dir, 0.9);
    const mesh = new THREE.Mesh(GRENADE_GEO, M.grenade);
    mesh.position.copy(start);
    this.scene.add(mesh);
    const vel = dir.clone().multiplyScalar(40);
    vel.y += 6;
    vel.addScaledVector(this.player.vel, 0.5);
    this.projectiles.push({
      type: "grenade", mesh, pos: start, vel, life: 5, fuse: 2.5,
      radius: 11, damage: 250, weapon: this.currentDef
    });
    return true;
  }

  damageArea(center, radius, maxDamage, weapon) {
    let hits = 0, kills = 0;
    for (const e of this.enemies.enemies) {
      if (e.dead) continue;
      const target = new THREE.Vector3(e.pos.x, e.pos.y + 1.05 * (e.hitScale || 1), e.pos.z);
      const d = center.distanceTo(target);
      if (d > radius) continue;
      const falloff = Math.max(0.35, 1 - (d / radius) * 0.65);
      const killed = this.enemies.damage(e, maxDamage * falloff * this.damageMultiplier, { weapon, explosion: true });
      hits++;
      if (killed) kills++;
    }
    if (hits) {
      this.hud.hitmarker(kills > 0, false);
      this.audio.hit(false);
      if (kills) this.audio.kill();
    }
  }

  explodeProjectile(p) {
    this.scene.remove(p.mesh);
    const scale = p.type === "rocket" ? 2.4 : 1.6;
    this.effects.explosion(p.pos, scale);
    this.audio.explosion();
    this.enemies.alertNoise?.(p.pos.x, p.pos.y, p.pos.z, 130);
    this.damageArea(p.pos, p.radius, p.damage, p.weapon);
    const pd = this.player.pos.distanceTo(p.pos);
    if (pd < p.radius * 1.6) {
      this.player.shake = Math.max(this.player.shake, Math.min(0.18, 0.08 + (1 - pd / (p.radius * 1.6)) * 0.1));
    }
  }

  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      if (p.type === "rocket") {
        const dir = p.vel.clone().normalize();
        const step = p.vel.length() * dt;
        const wall = this.world.raycast(p.pos, dir, step + 0.4);
        const enemyHits = this.enemies.raycast(p.pos, dir, step + 0.6);
        const enemyHit = enemyHits[0];
        if (enemyHit && (!wall || enemyHit.dist < wall.dist)) {
          p.pos.copy(enemyHit.point);
          this.explodeProjectile(p);
          this.projectiles.splice(i, 1);
          continue;
        }
        if (wall) {
          p.pos.copy(wall.point);
          this.explodeProjectile(p);
          this.projectiles.splice(i, 1);
          continue;
        }
        p.pos.addScaledVector(dir, step);
        p.mesh.position.copy(p.pos);
        p.trail -= dt;
        if (p.trail <= 0) {
          p.trail = 0.055;
          this.effects.burst(p.pos, 0xffa64a, 1, 0.5, 0);
        }
        if (p.life <= 0) {
          this.explodeProjectile(p);
          this.projectiles.splice(i, 1);
        }
      } else {
        p.fuse -= dt;
        p.vel.y -= 24 * dt;
        const prev = p.pos.clone();
        const next = p.pos.clone().addScaledVector(p.vel, dt);
        if (this.world.isSolid(next.x, next.y, next.z)) {
          p.pos.copy(prev);
          p.vel.x *= -0.28;
          p.vel.z *= -0.28;
          p.vel.y *= -0.32;
          if (Math.abs(p.vel.y) < 1) p.vel.y = 0;
        } else {
          p.pos.copy(next);
        }
        p.mesh.position.copy(p.pos);
        p.mesh.rotation.x += dt * 9;
        p.mesh.rotation.z += dt * 5;
        if (p.fuse <= 0 || p.life <= 0) {
          this.explodeProjectile(p);
          this.projectiles.splice(i, 1);
        }
      }
    }
  }

  clearProjectiles() {
    for (const p of this.projectiles) this.scene.remove(p.mesh);
    this.projectiles.length = 0;
  }

  getMuzzleWorld() {
    if (this.scoped) {
      return this._muzzle.copy(this._origin).addScaledVector(this._dir, 1.6);
    }
    const m = this.models[this.index];
    m.muzzle.updateWorldMatrix(true, false);
    return m.muzzle.getWorldPosition(this._muzzle);
  }
}
