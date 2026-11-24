import * as THREE from "three";
import { ZONES, ZONE_COUNT, nearestZone, ladderForBuilding } from "./zones.js";
import { maraLine } from "./mara.js";

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_OCT = new THREE.OctahedronGeometry(0.34, 0);
const RING_GEO = new THREE.TorusGeometry(0.6, 0.035, 4, 24);

const MATS = {
  cyan: new THREE.MeshBasicMaterial({ color: 0x64e5ff }),
  green: new THREE.MeshBasicMaterial({ color: 0x7dffb0 }),
  purple: new THREE.MeshBasicMaterial({ color: 0xc17bff }),
  red: new THREE.MeshBasicMaterial({ color: 0xff3b5c }),
  glint: new THREE.MeshBasicMaterial({ color: 0xfff3c4, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })
};

function patternCanvas(kind) {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d");
  const rnd = (() => { let s = 9301 + kind.length * 331; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
  const px = (x, y, w, h, color, alpha = 1) => {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
  };
  const base = kind === "skin" ? "#f0e6dc" : kind === "visor" ? "#5a5a5a" : "#d9e2e6";
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 64, 64);

  if (kind === "cloth") {
    // Carbon-weave undersuit with a hard nano-fibre sheen.
    for (let x = -64; x < 64; x += 5) {
      ctx.globalAlpha = 0.16;
      ctx.strokeStyle = "#ffffff";
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 64, 64); ctx.stroke();
      ctx.strokeStyle = "#1b252c";
      ctx.beginPath(); ctx.moveTo(x + 2, 0); ctx.lineTo(x + 66, 64); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    for (let i = 0; i < 6; i++) px(0, 5 + i * 11, 64, 1, "#7fe6ff", 0.12);
    for (let i = 0; i < 50; i++) px(Math.floor(rnd() * 64), Math.floor(rnd() * 64), 1, 1, rnd() < 0.5 ? "#61707a" : "#ffffff", 0.18);
  } else if (kind === "armor") {
    // Segmented combat plating: dark recessed seams, bright machined edges.
    for (let y = 0; y < 64; y += 16) {
      px(0, y, 64, 2, "#141d23", 0.9);
      px(0, y + 2, 64, 1, "#ffffff", 0.3);
    }
    for (let x = 0; x < 64; x += 16) {
      px(x, 0, 2, 64, "#141d23", 0.8);
      px(x + 2, 0, 1, 64, "#ffffff", 0.2);
    }
    for (const [x, y] of [[5, 5], [57, 5], [5, 57], [57, 57], [32, 5], [5, 32], [57, 32]]) {
      px(x, y, 3, 3, "#ffffff", 0.8);
      px(x + 1, y + 1, 1, 1, "#1a242a", 0.8);
    }
    px(0, 31, 64, 1, "#5fe7ff", 0.2);
    px(22, 8, 20, 1, "#5fe7ff", 0.24);
    px(22, 8, 1, 9, "#5fe7ff", 0.24);
    for (let i = 0; i < 28; i++) px(Math.floor(rnd() * 64), Math.floor(rnd() * 64), 1, 1, rnd() < 0.5 ? "#6c7c86" : "#ffffff", 0.16);
  } else if (kind === "gear") {
    for (let i = 0; i < 5; i++) px(0, 4 + i * 13, 64, 3, "#1a242a", 0.65);
    for (let i = 0; i < 6; i++) {
      const x = 6 + i * 10;
      px(x, 8, 6, 9, "#ffffff", 0.18);
      px(x + 1, 9, 4, 7, "#26343c", 0.6);
      px(x + 2, 10, 2, 2, "#5fe7ff", 0.34);
    }
    for (let i = 0; i < 40; i++) px(Math.floor(rnd() * 64), Math.floor(rnd() * 64), 1, 1, "#f4f4f4", 0.16);
  } else if (kind === "skin") {
    for (let i = 0; i < 80; i++) px(Math.floor(rnd() * 64), Math.floor(rnd() * 64), 1, 1, rnd() < 0.5 ? "#cbb9aa" : "#ffffff", 0.1);
    // Subtle dermal circuit implant at the temple.
    px(44, 22, 10, 1, "#7fe6ff", 0.16);
    px(53, 23, 1, 8, "#7fe6ff", 0.16);
  } else if (kind === "wood") {
    // Darkened composite furniture with a metallic grain.
    for (let i = 0; i < 16; i++) {
      const x = Math.floor(rnd() * 64);
      px(x, 0, 1, 64, rnd() < 0.5 ? "#7c8a92" : "#ffffff", 0.28);
    }
    for (let i = 0; i < 7; i++) px(0, Math.floor(rnd() * 64), 64, 1, "#26333b", 0.24);
  } else if (kind === "visor") {
    const g = ctx.createLinearGradient(0, 0, 64, 64);
    g.addColorStop(0, "#0d2930");
    g.addColorStop(0.34, "#bffcff");
    g.addColorStop(0.5, "#ffffff");
    g.addColorStop(0.66, "#5fe7ff");
    g.addColorStop(1, "#0b1a20");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    px(0, 28, 64, 2, "#ffffff", 0.8);
    px(0, 34, 64, 1, "#5fe7ff", 0.6);
  } else if (kind === "gun") {
    // Machined receiver panels with a cyan power bus.
    for (let y = 0; y < 64; y += 14) {
      px(0, y, 64, 2, "#111b21", 0.85);
      px(0, y + 2, 64, 1, "#ffffff", 0.28);
    }
    for (let x = 0; x < 64; x += 16) {
      px(x, 0, 2, 64, "#111b21", 0.7);
      px(x + 2, 0, 1, 64, "#ffffff", 0.18);
    }
    for (let i = 0; i < 34; i++) px(0, Math.floor(rnd() * 64), 64, 1, rnd() < 0.5 ? "#3d4c55" : "#ffffff", 0.14);
    for (const [x, y] of [[5, 5], [57, 5], [5, 57], [57, 57], [32, 5], [5, 32]]) {
      px(x, y, 3, 3, "#ffffff", 0.6);
      px(x + 1, y + 1, 1, 1, "#1a2730", 0.7);
    }
    px(0, 29, 64, 2, "#5fe7ff", 0.48);
    px(0, 33, 64, 1, "#5fe7ff", 0.16);
    px(17, 29, 2, 12, "#5fe7ff", 0.4);
    for (let i = 0; i < 8; i++) {
      const x = rnd() * 64, y = rnd() * 64;
      ctx.strokeStyle = "#0a1115";
      ctx.globalAlpha = 0.35;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 8, y + 1); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  } else {
    for (let i = 0; i < 40; i++) px(Math.floor(rnd() * 64), Math.floor(rnd() * 64), 1, 1, rnd() < 0.5 ? "#8fa2ac" : "#fff", 0.16);
  }
  return c;
}

const PATTERN_TEXTURES = {};
function patternTexture(kind) {
  if (!PATTERN_TEXTURES[kind]) {
    const tex = new THREE.CanvasTexture(patternCanvas(kind));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 2;
    PATTERN_TEXTURES[kind] = tex;
  }
  return PATTERN_TEXTURES[kind];
}

const MATERIALS = new Map();
function material(hex, kind = "metal") {
  const key = hex + ":" + kind;
  let m = MATERIALS.get(key);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color: hex, map: patternTexture(kind) });
    // Let the machined panel detail read in shadow without turning the
    // armour into a flat black silhouette.
    if (kind === "armor" || kind === "cloth" || kind === "gear" || kind === "gun") {
      m.emissive = new THREE.Color(0x0a141a);
      m.emissiveMap = patternTexture(kind);
    }
    MATERIALS.set(key, m);
  }
  return m;
}
const GLOWS = new Map();
function glow(hex, kind = null) {
  const key = hex + ":" + (kind || "flat");
  let m = GLOWS.get(key);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color: hex });
    if (kind) m.map = patternTexture(kind);
    GLOWS.set(key, m);
  }
  return m;
}

const SKINS = [0x9a7a5e, 0x7d5c45, 0xb08a6a, 0x8c6a50];

const KIND_CONFIG = {
  conscript: {
    body: 0x33424f, armor: 0x24303c, dark: 0x111a23, skin: 0x9a7a5e,
    visor: 0xb47bff, helmet: "standard", weapon: "rifle", scale: 1.0,
    rig: "light", backpack: true
  },
  rifleman: {
    body: 0x3b4a58, armor: 0x293744, dark: 0x131d26, skin: 0x8c6a50,
    visor: 0xa266ff, helmet: "standard", weapon: "rifle", scale: 1.0,
    rig: "heavy", pads: true, backpack: true
  },
  scout: {
    body: 0x2b4b5b, armor: 0x1d3542, dark: 0x0e1b24, skin: 0x9a7a5e,
    visor: 0x5fe7ff, helmet: "cap", weapon: "smg", scale: 0.96,
    rig: "light", pads: true
  },
  breacher: {
    body: 0x5a3a34, armor: 0x3a2422, dark: 0x1b1210, skin: 0x7d5c45,
    visor: 0xff8a4a, helmet: "heavy", weapon: "shotgun", scale: 1.06,
    rig: "breacher", pads: true, mask: true, backpack: true
  },
  heavy: {
    body: 0x4d2f3b, armor: 0x351e2b, dark: 0x190e16, skin: 0x8c6a50,
    visor: 0xff4f6a, helmet: "heavy", weapon: "lmg", scale: 1.18,
    rig: "heavy", pads: true, backpack: true, antenna: true
  },
  officer: {
    body: 0x5c5238, armor: 0x3a3320, dark: 0x1c180f, skin: 0xb08a6a,
    visor: 0xffc45e, helmet: "beret", weapon: "smg", scale: 1.02,
    rig: "officer", pads: false, coat: true, antenna: true
  },
  sniper: {
    body: 0x2e4a3f, armor: 0x1d3329, dark: 0x0e1b15, skin: 0x8c6a50,
    visor: 0x43e0a5, helmet: "hood", weapon: "sniper", scale: 1.0,
    rig: "light", cloak: true, hood: true
  },
  ally: {
    body: 0x274a5e, armor: 0x1b3444, dark: 0x0d1c26, skin: 0x9a7a5e,
    visor: 0x5fe7ff, helmet: "standard", weapon: "rifle", scale: 1.0,
    rig: "heavy", pads: true, backpack: true
  },
  recruit: {
    body: 0x3a4a38, armor: 0x243023, dark: 0x111b11, skin: 0x9a7a5e,
    visor: 0x7dffb0, helmet: "none", weapon: null, scale: 0.98,
    rig: "light", backpack: false
  },
  captain: {
    body: 0x33475a, armor: 0x53697b, dark: 0x131d26, skin: 0x8c6a50,
    visor: 0x5fe7ff, helmet: "heavy", weapon: "lmg", scale: 1.38,
    rig: "heavy", pads: true, backpack: true, antenna: true, boss: true, markerY: 3.05
  },
  boss: {
    body: 0x3a1730, armor: 0x5c1844, dark: 0x1b0a17, skin: 0x6e5642,
    visor: 0xff3f6a, helmet: "heavy", weapon: "minigun", scale: 1.65,
    rig: "heavy", pads: true, backpack: true, antenna: true, boss: true, markerY: 3.55
  }
};

function part(parent, mat, w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(UNIT_BOX, mat);
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  parent.add(m);
  return m;
}

function buildGun(type) {
  const gun = new THREE.Group();
  const dark = material(0x141b20, "gun");
  const metal = material(0x33424c, "metal");
  const accent = material(0x2c3842, "wood");
  let muzzleZ = 0.74;

  if (type === "smg") {
    part(gun, material(0x25292d, "gun"), 0.11, 0.12, 0.38, 0, 0.01, 0.1);
    part(gun, dark, 0.055, 0.055, 0.25, 0, 0.02, 0.42);
    part(gun, dark, 0.07, 0.2, 0.09, 0, -0.14, 0.08);
    part(gun, metal, 0.09, 0.03, 0.14, 0, 0.09, 0.16);
    muzzleZ = 0.56;
  } else if (type === "shotgun") {
    part(gun, material(0x4a3b2d, "wood"), 0.1, 0.13, 0.42, 0, 0.01, 0.08);
    part(gun, dark, 0.08, 0.09, 0.48, 0, 0.04, 0.5);
    part(gun, metal, 0.095, 0.075, 0.18, 0, -0.02, 0.36);
    part(gun, accent, 0.075, 0.17, 0.09, 0, -0.14, 0.04);
    muzzleZ = 0.78;
  } else if (type === "lmg" || type === "minigun") {
    const big = type === "minigun";
    part(gun, material(0x2e3236, "gun"), big ? 0.16 : 0.13, big ? 0.16 : 0.14, 0.56, 0, 0.02, 0.12);
    part(gun, dark, big ? 0.12 : 0.07, big ? 0.12 : 0.07, 0.5, 0, 0.02, 0.58);
    part(gun, dark, 0.2, 0.2, 0.14, 0, -0.12, 0.02);
    part(gun, metal, 0.14, 0.14, 0.2, 0, 0.02, 0.35);
    if (big) {
      part(gun, MATS.red, 0.045, 0.045, 0.5, -0.07, 0.02, 0.55);
      part(gun, MATS.red, 0.045, 0.045, 0.5, 0.07, 0.02, 0.55);
    }
    muzzleZ = big ? 0.92 : 0.88;
  } else if (type === "sniper") {
    part(gun, material(0x2a2f2e, "gun"), 0.1, 0.11, 0.7, 0, 0.01, 0.16);
    part(gun, dark, 0.045, 0.045, 0.65, 0, 0.015, 0.8);
    part(gun, material(0x31383a, "gun"), 0.11, 0.12, 0.24, 0, -0.01, -0.18);
    part(gun, dark, 0.07, 0.25, 0.09, 0, -0.15, 0.16);
    part(gun, dark, 0.055, 0.055, 0.3, 0, 0.19, 0.18);
    part(gun, metal, 0.075, 0.075, 0.12, -0.06, 0.0, 0.48);
    part(gun, metal, 0.075, 0.075, 0.12, 0.06, 0.0, 0.48);
    muzzleZ = 1.14;
  } else {
    part(gun, material(0x2a2f31, "gun"), 0.1, 0.12, 0.56, 0, 0.01, 0.12);
    part(gun, dark, 0.055, 0.055, 0.35, 0, 0.02, 0.52);
    part(gun, dark, 0.07, 0.22, 0.09, 0, -0.14, 0.08);
    part(gun, dark, 0.08, 0.11, 0.2, 0, 0.0, -0.22);
    part(gun, metal, 0.115, 0.035, 0.15, 0, 0.085, 0.15);
    muzzleZ = 0.72;
  }

  // Powered cell window along the receiver.
  part(gun, glow(0x5fe7ff), 0.02, 0.022, 0.2, 0, 0.065, 0.14);
  part(gun, glow(0x5fe7ff), 0.016, 0.016, 0.1, 0, 0.065, 0.3);

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.02, muzzleZ);
  gun.add(muzzle);
  return { group: gun, muzzle };
}

export function createSoldier(kind = "conscript", variant = 0) {
  const cfg = KIND_CONFIG[kind] || KIND_CONFIG.conscript;
  const g = new THREE.Group();
  const isBoss = !!cfg.boss;
  const isRecruit = kind === "recruit";
  const skin = material(SKINS[(variant + (isBoss ? 2 : 0)) % SKINS.length], "skin");
  const body = material(cfg.body, "cloth");
  const armor = material(cfg.armor, "armor");
  const dark = material(cfg.dark, "gear");
  const visor = glow(cfg.visor, "visor");
  const trim = material(0x8c8a7c, "metal");

  // Head, face and neck.
  part(g, skin, 0.14, 0.12, 0.16, 0, 1.61, 0);
  const head = part(g, skin, 0.31, 0.32, 0.3, 0, 1.78, 0);
  part(g, skin, 0.24, 0.075, 0.24, 0, 1.63, 0.02);
  part(g, skin, 0.055, 0.075, 0.06, 0, 1.78, 0.18);
  part(g, skin, 0.04, 0.08, 0.09, -0.17, 1.78, 0);
  part(g, skin, 0.04, 0.08, 0.09, 0.17, 1.78, 0);
  part(g, visor, 0.28, 0.055, 0.045, 0, 1.81, 0.17);
  if (cfg.mask) part(g, dark, 0.23, 0.11, 0.045, 0, 1.69, 0.17);
  part(g, dark, 0.2, 0.035, 0.03, 0, 1.6, 0.15);

  // Helmets and headgear.
  if (cfg.helmet === "standard" || cfg.helmet === "heavy") {
    const hw = cfg.helmet === "heavy" ? 0.44 : 0.38;
    part(g, armor, hw, 0.16, hw, 0, 1.97, -0.01);
    part(g, armor, hw * 0.9, 0.08, 0.12, 0, 1.9, 0.15);
    part(g, armor, 0.07, 0.2, 0.3, -hw / 2, 1.84, 0);
    part(g, armor, 0.07, 0.2, 0.3, hw / 2, 1.84, 0);
    part(g, trim, 0.12, 0.025, 0.05, 0.08, 1.95, 0.18);
  } else if (cfg.helmet === "cap") {
    part(g, armor, 0.34, 0.075, 0.34, 0, 1.98, 0);
    part(g, armor, 0.34, 0.035, 0.12, 0, 1.94, 0.19);
  } else if (cfg.helmet === "beret") {
    part(g, material(0x3f2a2a, "cloth"), 0.36, 0.07, 0.34, 0, 1.98, 0, 0, 0, 0.08);
    part(g, trim, 0.055, 0.045, 0.055, 0, 1.96, 0.19);
  } else if (cfg.helmet === "hood") {
    part(g, armor, 0.44, 0.11, 0.45, 0, 1.98, -0.01);
    part(g, armor, 0.42, 0.3, 0.09, 0, 1.78, -0.22);
    part(g, armor, 0.08, 0.32, 0.36, -0.2, 1.8, 0);
    part(g, armor, 0.08, 0.32, 0.36, 0.2, 1.8, 0);
    part(g, material(0x2f3b2e, "cloth"), 0.42, 0.05, 0.12, 0, 1.89, 0.17);
  } else {
    part(g, dark, 0.34, 0.045, 0.34, 0, 1.96, 0);
  }

  // Torso, armor, belt, pouches and backpack.
  part(g, body, 0.55, 0.6, 0.32, 0, 1.26, 0);
  part(g, armor, 0.61, 0.33, 0.39, 0, 1.35, 0);
  part(g, body, 0.46, 0.16, 0.32, 0, 0.98, 0);
  part(g, dark, 0.52, 0.075, 0.34, 0, 0.9, 0);
  part(g, trim, 0.09, 0.065, 0.035, 0, 0.9, 0.17);
  if (cfg.rig === "heavy" || cfg.rig === "breacher" || cfg.rig === "officer") {
    part(g, dark, 0.46, 0.22, 0.34, 0, 1.1, 0.03);
    part(g, material(0x3b3a33, "gear"), 0.12, 0.13, 0.06, -0.15, 1.12, 0.2);
    part(g, material(0x3b3a33, "gear"), 0.12, 0.13, 0.06, 0.02, 1.12, 0.2);
    part(g, material(0x3b3a33, "gear"), 0.12, 0.13, 0.06, 0.2, 1.12, 0.2);
  } else {
    part(g, material(0x37362f, "gear"), 0.11, 0.11, 0.05, -0.13, 1.15, 0.19);
    part(g, material(0x37362f, "gear"), 0.11, 0.11, 0.05, 0.1, 1.15, 0.19);
  }
  if (cfg.pads) {
    part(g, armor, 0.23, 0.12, 0.28, -0.37, 1.5, 0);
    part(g, armor, 0.23, 0.12, 0.28, 0.37, 1.5, 0);
  }
  if (cfg.backpack) {
    part(g, armor, 0.35, 0.44, 0.17, 0, 1.28, -0.25);
    part(g, dark, 0.08, 0.2, 0.08, -0.1, 1.34, -0.35);
    part(g, dark, 0.08, 0.15, 0.08, 0.08, 1.3, -0.35);
  }
  if (cfg.antenna) {
    part(g, dark, 0.022, 0.55, 0.022, 0.32, 1.62, -0.25);
    part(g, glow(0xff5a5a), 0.035, 0.035, 0.035, 0.32, 1.9, -0.25);
  }
  if (cfg.coat) {
    part(g, body, 0.5, 0.36, 0.35, 0, 0.73, 0);
    part(g, armor, 0.5, 0.16, 0.38, 0, 0.95, 0);
  }
  if (cfg.cloak) {
    part(g, material(0x354335, "cloth"), 0.62, 0.5, 0.06, 0, 1.15, -0.2);
    part(g, material(0x2d3a2d, "cloth"), 0.52, 0.5, 0.05, -0.22, 0.82, -0.18);
    part(g, material(0x43563f, "cloth"), 0.24, 0.12, 0.07, 0.2, 1.36, -0.1);
    part(g, material(0x31422f, "cloth"), 0.12, 0.36, 0.05, -0.28, 1.2, -0.17);
    part(g, material(0x4b5c43, "cloth"), 0.09, 0.28, 0.04, 0.3, 0.98, -0.17);
  }
  if (isBoss) {
    part(g, material(0x7d2c43, "metal"), 0.32, 0.16, 0.52, -0.45, 1.55, 0);
    part(g, material(0x7d2c43, "metal"), 0.32, 0.16, 0.52, 0.45, 1.55, 0);
    part(g, glow(0xff3b5c), 0.1, 0.08, 0.05, 0, 1.7, 0.2);
  }

  // Emissive tech trim. Every Chorus unit carries a powered chest core,
  // shoulder cells and backpack vents so the armour reads at distance.
  const techLight = glow(cfg.visor);
  part(g, techLight, 0.15, 0.055, 0.025, 0, 1.4, 0.198);
  part(g, techLight, 0.055, 0.15, 0.025, 0, 1.4, 0.198);
  part(g, techLight, 0.055, 0.02, 0.02, 0, 1.47, 0.26);
  part(g, techLight, 0.16, 0.022, 0.03, -0.37, 1.52, 0.145);
  part(g, techLight, 0.16, 0.022, 0.03, 0.37, 1.52, 0.145);
  part(g, techLight, 0.09, 0.02, 0.025, 0, 0.925, 0.178);
  if (cfg.helmet && cfg.helmet !== "none") {
    part(g, techLight, 0.2, 0.018, 0.03, 0, 1.9, 0.18);
  }
  if (cfg.backpack) {
    part(g, techLight, 0.025, 0.13, 0.025, -0.09, 1.29, -0.34);
    part(g, techLight, 0.025, 0.09, 0.025, 0.09, 1.29, -0.34);
  }
  if (cfg.pads) {
    part(g, techLight, 0.1, 0.018, 0.025, -0.37, 1.455, 0.15);
    part(g, techLight, 0.1, 0.018, 0.025, 0.37, 1.455, 0.15);
  }

  // Arms with elbows and gloved hands.
  const makeArm = side => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.4, 1.46, 0);
    part(arm, body, 0.15, 0.34, 0.17, 0, -0.17, 0);
    part(arm, armor, 0.21, 0.1, 0.24, 0, 0.02, 0);
    part(arm, techLight, 0.02, 0.16, 0.02, side * 0.085, -0.19, 0.078);
    const elbow = new THREE.Group();
    elbow.position.y = -0.34;
    part(elbow, body, 0.14, 0.3, 0.15, 0, -0.15, 0);
    part(elbow, dark, 0.16, 0.1, 0.17, 0, -0.32, 0.02);
    part(elbow, techLight, 0.02, 0.11, 0.02, side * 0.075, -0.2, 0.076);
    part(elbow, skin, 0.15, 0.1, 0.16, 0, -0.41, 0.02);
    arm.add(elbow);
    g.add(arm);
    return { arm, elbow };
  };
  const armLData = makeArm(-1);
  const armRData = makeArm(1);
  const armL = armLData.arm, armR = armRData.arm;
  armL.rotation.x = isRecruit ? -0.25 : -1.22;
  armR.rotation.x = isRecruit ? -0.25 : -1.34;
  armL.rotation.z = isRecruit ? -0.1 : 0.28;
  armR.rotation.z = isRecruit ? 0.1 : -0.28;
  armLData.elbow.rotation.x = isRecruit ? -0.15 : -0.72;
  armRData.elbow.rotation.x = isRecruit ? -0.15 : -0.8;

  // Legs with knees and boots.
  const makeLeg = side => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.15, 0.86, 0);
    part(leg, armor, 0.19, 0.38, 0.22, 0, -0.19, 0);
    part(leg, dark, 0.21, 0.09, 0.23, 0, -0.39, 0.02);
    part(leg, techLight, 0.02, 0.16, 0.02, side * 0.1, -0.2, 0.09);
    const knee = new THREE.Group();
    knee.position.y = -0.4;
    part(knee, body, 0.18, 0.33, 0.2, 0, -0.17, 0);
    part(knee, dark, 0.23, 0.14, 0.31, 0, -0.36, 0.045);
    part(knee, techLight, 0.02, 0.12, 0.02, side * 0.09, -0.19, 0.085);
    part(knee, techLight, 0.09, 0.016, 0.02, 0, -0.3, 0.17);
    leg.add(knee);
    g.add(leg);
    return { leg, knee };
  };
  const legLData = makeLeg(-1);
  const legRData = makeLeg(1);
  const legL = legLData.leg, legR = legRData.leg;

  let gunGroup = null, muzzle = null, glint = null;
  if (cfg.weapon) {
    const built = buildGun(cfg.weapon);
    gunGroup = built.group;
    muzzle = built.muzzle;
    gunGroup.position.set(0.16, 1.3, 0.34);
    g.add(gunGroup);
    if (kind === "sniper") {
      glint = new THREE.Mesh(UNIT_OCT, MATS.glint);
      glint.scale.setScalar(0.5);
      glint.position.set(0, 0.22, 0.42);
      glint.visible = false;
      gunGroup.add(glint);
    }
  }

  let bossMarker = null;
  if (isBoss) {
    bossMarker = new THREE.Mesh(UNIT_OCT, MATS.red);
    bossMarker.scale.setScalar(1.1);
    bossMarker.position.y = cfg.markerY || 3.55;
    g.add(bossMarker);
  }

  return {
    group: g,
    parts: {
      legL, legR, kneeL: legLData.knee, kneeR: legRData.knee,
      armL, armR, elbowL: armLData.elbow, elbowR: armRData.elbow,
      head, gunGroup, muzzle, glint, bossMarker
    },
    baseScale: cfg.scale || 1
  };
}

function raySphere(origin, dir, center, radius) {
  const ox = origin.x - center.x, oy = origin.y - center.y, oz = origin.z - center.z;
  const b = ox * dir.x + oy * dir.y + oz * dir.z;
  const c = ox * ox + oy * oy + oz * oz - radius * radius;
  const disc = b * b - c;
  if (disc < 0) return -1;
  const sq = Math.sqrt(disc);
  let t = -b - sq;
  if (t < 0) t = -b + sq;
  return t >= 0 ? t : -1;
}

const ENEMY_TYPES = {
  conscript: {
    hp: 58, damage: 9.5, speed: 2.35, range: 52, spread: 0.055,
    fireMin: 1.5, fireMax: 2.7, burst: 2, preferredMin: 16, preferredMax: 28
  },
  rifleman: {
    hp: 86, damage: 11.5, speed: 2.6, range: 62, spread: 0.042,
    fireMin: 1.35, fireMax: 2.4, burst: 3, preferredMin: 18, preferredMax: 32
  },
  scout: {
    hp: 54, damage: 7.5, speed: 3.55, range: 38, spread: 0.068,
    fireMin: 0.85, fireMax: 1.6, burst: 4, preferredMin: 8, preferredMax: 18
  },
  breacher: {
    hp: 150, damage: 23, speed: 3.0, range: 28, spread: 0.075,
    fireMin: 1.65, fireMax: 2.35, burst: 1, preferredMin: 5, preferredMax: 12
  },
  heavy: {
    hp: 215, damage: 10.5, speed: 1.65, range: 62, spread: 0.05,
    fireMin: 1.6, fireMax: 2.7, burst: 6, preferredMin: 24, preferredMax: 42
  },
  officer: {
    hp: 105, damage: 12, speed: 2.45, range: 48, spread: 0.034,
    fireMin: 1.15, fireMax: 1.9, burst: 3, preferredMin: 18, preferredMax: 30
  },
  sniper: {
    hp: 74, damage: 27, speed: 0, range: 110, spread: 0.006,
    fireMin: 2.2, fireMax: 3.2, burst: 1, preferredMin: 25, preferredMax: 100,
    sniper: true
  }
};

const ROLE_WEIGHTS = {
  farm: [["conscript", 42], ["rifleman", 23], ["scout", 16], ["breacher", 9], ["sniper", 10]],
  suburb: [["conscript", 20], ["rifleman", 26], ["scout", 14], ["breacher", 15], ["heavy", 5], ["officer", 8], ["sniper", 12]],
  city: [["conscript", 7], ["rifleman", 22], ["scout", 11], ["breacher", 16], ["heavy", 17], ["officer", 10], ["sniper", 17]]
};

function chooseRole(region) {
  const table = ROLE_WEIGHTS[region] || ROLE_WEIGHTS.farm;
  let total = 0;
  for (const [, w] of table) total += w;
  let n = Math.random() * total;
  for (const [role, w] of table) {
    n -= w;
    if (n <= 0) return role;
  }
  return table[0][0];
}

let enemyId = 0;

export class Enemy {
  constructor(manager, pos, zoneIndex, bossKind = null, typeKey = "conscript", roof = null) {
    this.id = ++enemyId;
    // Stable id used by the co-op snapshot protocol.
    this.netId = this.id;
    this.manager = manager;
    this.zoneIndex = zoneIndex;
    const kind = typeof bossKind === "string" ? bossKind : bossKind ? "director" : null;
    this.bossKind = kind;
    this.isBoss = !!kind;
    this.typeKey = kind === "captain" ? "captain" : kind === "director" ? "boss" : (ENEMY_TYPES[typeKey] ? typeKey : "conscript");
    this.type = ENEMY_TYPES[this.typeKey] || ENEMY_TYPES.conscript;
    this.isSniper = !this.isBoss && !!this.type.sniper;
    this.roof = roof;
    this.pos = pos.clone();
    if (roof) this.pos.y = roof.y;
    const level = zoneIndex * 1.35;
    const captain = kind === "captain";
    this.maxHealth = (this.isBoss ? (captain ? 3400 : 7800) : this.type.hp + level) *
      (manager.enemyHealthMultiplier || 1);
    this.health = this.maxHealth;
    this.speed = this.isBoss ? (captain ? 3.35 : 3.1) : this.type.speed;
    this.damage = (this.isBoss ? (captain ? 14 : 19) : this.type.damage + zoneIndex * 0.08) *
      (manager.enemyDamageMultiplier || 1);
    this.range = this.isBoss ? (captain ? 52 : 60) : this.type.range;
    this.spread = this.isBoss ? (captain ? 0.028 : 0.035) : this.type.spread;
    this.radius = this.isBoss ? (captain ? 0.62 : 0.7) : this.isSniper ? 0.34 : 0.36;
    this.height = this.isBoss ? (captain ? 2.5 : 3.0) : 1.8;
    this.dead = false;
    this.deathTimer = 0;
    this.spawnTimer = this.isBoss ? 1.0 : 0.65;
    this.spawnTotal = this.spawnTimer;
    this.fireTimer = this.isBoss ? 1.2 : 1.0 + Math.random() * 1.8;
    this.burstLeft = 0;
    this.burstTimer = 0;
    this.losTimer = 0;
    this.canSee = false;
    this.target = null;
    this.climbDir = 0;
    this.alertTimer = 0;
    this.combatAlertTimer = 0;
    this.lastKnown = new THREE.Vector3();
    this.reactionTimer = 0;
    this.flinch = 0;
    this.idleTimer = 1 + Math.random() * 3;
    this.idleDir = Math.random() < 0.5 ? -1 : 1;
    this.retarget = Math.random() * 0.6;
    this.strafeDir = Math.random() < 0.5 ? -1 : 1;
    this.strafeTimer = 1 + Math.random() * 2;
    this.phase = Math.random() * 10;
    this.walk = 0;
    this.summonTimer = 12;
    this.aiming = false;
    this.aimTimer = 0;
    this.model = createSoldier(this.typeKey, this.id);
    this.model.group.position.copy(this.pos);
    this.model.group.scale.setScalar(this.model.baseScale * 0.2);
    this.hitScale = this.model.baseScale;
    this.markerBaseY = this.model.parts.bossMarker ? this.model.parts.bossMarker.position.y : 3.55;
    manager.scene.add(this.model.group);
  }

  eye(out = new THREE.Vector3()) {
    return out.set(this.pos.x, this.pos.y + (this.isBoss ? (this.bossKind === "captain" ? 1.95 : 2.2) : 1.58 * this.hitScale), this.pos.z);
  }

  inFov(dx, dz, threshold = 0.1) {
    const d = Math.hypot(dx, dz) || 1;
    const fx = Math.sin(this.model.group.rotation.y);
    const fz = Math.cos(this.model.group.rotation.y);
    return (dx / d) * fx + (dz / d) * fz > threshold;
  }

  onDamaged(opts = {}) {
    const attacker = opts.ally || this.manager.player;
    if (!attacker) return;
    this.alertTimer = Math.max(this.alertTimer, 9);
    this.combatAlertTimer = Math.max(this.combatAlertTimer, 9);
    this.reactionTimer = 0.22 + Math.random() * 0.2;
    this.flinch = 0.22;
    this.burstLeft = 0;
    this.aiming = false;
    this.fireTimer = Math.max(this.fireTimer, 0.36);
    this.retarget = 0.1;
    this.target = attacker;
    this.lastKnown.set(attacker.pos.x, attacker.pos.y, attacker.pos.z);
  }

  fireDelay() {
    if (this.isBoss) return 1.7 + Math.random() * 0.8;
    return this.type.fireMin + Math.random() * (this.type.fireMax - this.type.fireMin);
  }

  animateWalk(dt, moving, speed = 1) {
    if (moving) {
      this.walk += dt * speed * 2.7;
      const swing = Math.sin(this.walk) * 0.58;
      this.model.parts.legL.rotation.x = swing;
      this.model.parts.legR.rotation.x = -swing;
      this.model.parts.kneeL.rotation.x = Math.max(0, -Math.sin(this.walk)) * 0.55;
      this.model.parts.kneeR.rotation.x = Math.max(0, Math.sin(this.walk)) * 0.55;
    } else {
      this.model.parts.legL.rotation.x *= 0.88;
      this.model.parts.legR.rotation.x *= 0.88;
      this.model.parts.kneeL.rotation.x *= 0.9;
      this.model.parts.kneeR.rotation.x *= 0.9;
    }
  }

  updateSniper(dt, player, target, manager) {
    const bounds = this.roof;
    const eye = this.eye();
    const targetEye = new THREE.Vector3(target.pos.x, target.pos.y + (target === player ? 1.35 : 1.25), target.pos.z);
    const dx = target.pos.x - this.pos.x, dz = target.pos.z - this.pos.z;
    const dist = Math.hypot(dx, dz);

    this.losTimer -= dt;
    if (this.losTimer <= 0) {
      this.losTimer = 0.25 + Math.random() * 0.25;
      const combat = this.combatAlertTimer > 0;
      const aware = this.alertTimer > 0 && dist < (combat ? 100 : 42);
      this.canSee = dist < this.range + (combat ? 60 : 8) &&
        (this.inFov(dx, dz, combat ? -0.35 : 0.08) || aware) &&
        manager.world.hasLOS(eye, targetEye);
      if (this.canSee) {
        this.lastKnown.copy(target.pos);
        this.alertTimer = Math.max(this.alertTimer, 5);
      }
    }

    const desiredYaw = Math.atan2(dx, dz);
    let diff = desiredYaw - this.model.group.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.model.group.rotation.y += diff * Math.min(1, dt * 6);
    if (this.model.parts.gunGroup) {
      const aimPitch = Math.atan2(targetEye.y - eye.y, Math.max(1, dist));
      this.model.parts.gunGroup.rotation.x += (aimPitch * 0.85 - this.model.parts.gunGroup.rotation.x) * Math.min(1, dt * 6);
    }

    // Snipers never leave the roof. They reposition along it and use the height
    // to find a firing line.
    let moving = false;
    if (bounds) {
      this.pos.y = bounds.y;
      this.strafeTimer -= dt;
      if (this.strafeTimer <= 0) {
        this.strafeTimer = 1.8 + Math.random() * 2.8;
        this.strafeDir *= -1;
      }
      let mx = 0, mz = 0;
      if (this.canSee) {
        mx = -dz * this.strafeDir * 0.22;
        mz = dx * this.strafeDir * 0.22;
      } else {
        mx = dx;
        mz = dz;
      }
      const ml = Math.hypot(mx, mz);
      if (ml > 0.01) {
        mx /= ml; mz /= ml;
        const step = (this.canSee ? 0.55 : 1.15) * dt;
        const nx = THREE.MathUtils.clamp(this.pos.x + mx * step, bounds.minX, bounds.maxX);
        const nz = THREE.MathUtils.clamp(this.pos.z + mz * step, bounds.minZ, bounds.maxZ);
        moving = Math.abs(nx - this.pos.x) + Math.abs(nz - this.pos.z) > 0.001;
        this.pos.x = nx;
        this.pos.z = nz;
      }
    }

    this.fireTimer -= dt;
    if (this.aiming) {
      if (!this.canSee || dist > this.range) {
        this.aiming = false;
        if (this.model.parts.glint) this.model.parts.glint.visible = false;
      } else {
        this.aimTimer -= dt;
        if (this.model.parts.glint) {
          this.model.parts.glint.visible = true;
          const pulse = 0.46 + Math.sin(performance.now() * 0.02) * 0.14;
          this.model.parts.glint.scale.setScalar(pulse);
        }
        if (this.aimTimer <= 0) {
          this.shoot(player, target, targetEye, manager);
          this.aiming = false;
          this.fireTimer = this.fireDelay();
          if (this.model.parts.glint) this.model.parts.glint.visible = false;
        }
      }
    } else if (this.fireTimer <= 0 && this.canSee && this.reactionTimer <= 0 && dist < this.range) {
      this.aiming = true;
      this.aimTimer = 0.55;
    }

    this.animateWalk(dt, moving, 0.6);
    this.model.group.position.copy(this.pos);
    this.model.parts.armR.rotation.x = -1.35;
    this.model.parts.armL.rotation.x = -1.25;
  }

  update(dt, player, allies, manager) {
    if (this.dead) {
      this.deathTimer += dt;
      const t = Math.min(1, this.deathTimer / 0.45);
      this.model.group.rotation.z = (this.fallDir || 1) * t * Math.PI * 0.5;
      this.model.group.position.y = this.pos.y - Math.min(0.4, this.deathTimer * 0.3);
      this.model.group.scale.setScalar(this.model.baseScale * (1 - Math.max(0, this.deathTimer - 1.4) / 0.6));
      if (this.deathTimer > 2) {
        manager.scene.remove(this.model.group);
        this.removed = true;
      }
      return;
    }

    if (this.spawnTimer > 0) {
      this.spawnTimer -= dt;
      const p = 1 - Math.max(0, this.spawnTimer) / this.spawnTotal;
      this.model.group.scale.setScalar(this.model.baseScale * (0.2 + 0.8 * p));
      this.model.group.position.copy(this.pos);
      return;
    }
    this.model.group.scale.setScalar(this.model.baseScale);

    this.alertTimer = Math.max(0, this.alertTimer - dt);
    this.combatAlertTimer = Math.max(0, this.combatAlertTimer - dt);
    this.reactionTimer = Math.max(0, this.reactionTimer - dt);
    if (this.flinch > 0) {
      this.flinch = Math.max(0, this.flinch - dt * 1.8);
      this.model.group.rotation.x = -this.flinch * 0.75;
    } else {
      this.model.group.rotation.x = 0;
    }

    const playerAlive = player && !player.dead;
    const pdx = player ? player.pos.x - this.pos.x : 999;
    const pdz = player ? player.pos.z - this.pos.z : 999;
    const playerDist = Math.hypot(pdx, pdz);
    // In co-op the host may be dead or far from a client's fight; keep the
    // simulation alive when any remote player is nearby.
    const remoteNear = manager.remoteTargets?.some(a =>
      !a.dead && Math.hypot(a.pos.x - this.pos.x, a.pos.z - this.pos.z) < 165
    );
    if ((!playerAlive || playerDist > 165) && !remoteNear) {
      this.model.group.position.copy(this.pos);
      return;
    }

    this.retarget -= dt;
    if (this.retarget <= 0) {
      this.retarget = 0.32;
      const eye = this.eye();
      let best = null, bestScore = Infinity;
      const consider = (candidate, weight) => {
        if (!candidate || candidate.dead || candidate.downed) return;
        const cdx = candidate.pos.x - this.pos.x;
        const cdz = candidate.pos.z - this.pos.z;
        const cdist = Math.hypot(cdx, cdz);
        const combat = this.combatAlertTimer > 0;
        if (cdist > this.range + (combat ? 55 : 26)) return;
        const clearlyClose = cdist < (combat ? 16 : 9);
        const alerted = this.alertTimer > 0 && cdist < (combat ? 90 : 38);
        if (!clearlyClose && !alerted && !this.inFov(cdx, cdz, combat ? -0.35 : 0.08)) return;
        const cEye = new THREE.Vector3(
          candidate.pos.x,
          candidate.pos.y + (candidate === player ? 1.35 : 1.25),
          candidate.pos.z
        );
        if (!manager.world.hasLOS(eye, cEye)) return;
        const score = cdist * weight;
        if (score < bestScore) {
          bestScore = score;
          best = candidate;
        }
      };
      if (playerAlive) consider(player, 0.9);
      for (const a of allies) consider(a, 1.1);
      if (best) {
        if (this.target !== best) this.canSee = false;
        this.target = best;
        this.lastKnown.set(best.pos.x, best.pos.y, best.pos.z);
        this.alertTimer = Math.max(this.alertTimer, 5);
      } else if (this.alertTimer <= 0) {
        this.target = null;
      }
    }

    const target = this.target;
    if (!target) {
      this.climbDir = 0;
      // Investigate a gunshot or a hit from an unseen direction before
      // settling back into an idle scan.
      if (this.alertTimer > 0) {
        const ix = this.lastKnown.x - this.pos.x;
        const iz = this.lastKnown.z - this.pos.z;
        const idist = Math.hypot(ix, iz);
        if (idist > 2.2) {
          const desiredYaw = Math.atan2(ix, iz);
          let diff = desiredYaw - this.model.group.rotation.y;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          this.model.group.rotation.y += diff * Math.min(1, dt * 5);
          this.manager.moveAgent(this, (ix / idist) * 2.8 * dt, (iz / idist) * 2.8 * dt, 0.32, 1.7, dt);
          this.animateWalk(dt, true, 2.8);
          this.model.group.position.copy(this.pos);
          this.model.parts.armR.rotation.x = -1.35;
          this.model.parts.armL.rotation.x = -1.25;
          return;
        }
      }
      // Unaware: slowly scan, then resume a loose idle facing.
      this.manager.settleAgent(this, 0.32, 1.7, dt);
      this.idleTimer -= dt;
      if (this.idleTimer <= 0) {
        this.idleTimer = 1.5 + Math.random() * 2.6;
        this.idleDir *= -1;
      }
      this.model.group.rotation.y += this.idleDir * dt * 0.55;
      this.model.group.rotation.x = 0;
      this.model.group.position.copy(this.pos);
      this.animateWalk(dt, false);
      this.model.parts.armR.rotation.x = -1.35;
      this.model.parts.armL.rotation.x = -1.25;
      return;
    }

    this.climbDir = target.pos.y > this.pos.y ? 1 : target.pos.y < this.pos.y - 0.5 ? -1 : 0;
    const trackingX = this.canSee ? target.pos.x : this.lastKnown.x;
    const trackingZ = this.canSee ? target.pos.z : this.lastKnown.z;
    const tx = trackingX, tz = trackingZ;
    const dx = tx - this.pos.x, dz = tz - this.pos.z;
    const dist = Math.hypot(dx, dz);
    const eye = this.eye();
    const targetEye = new THREE.Vector3(target.pos.x, target.pos.y + (target === player ? 1.35 : 1.25), target.pos.z);

    if (this.isSniper) {
      this.updateSniper(dt, player, target, manager);
      return;
    }

    this.losTimer -= dt;
    if (this.losTimer <= 0) {
      this.losTimer = 0.3 + Math.random() * 0.25;
      const realDx = target.pos.x - this.pos.x;
      const realDz = target.pos.z - this.pos.z;
      const realDist = Math.hypot(realDx, realDz);
      const combat = this.combatAlertTimer > 0;
      const aware = this.alertTimer > 0 && realDist < (combat ? 95 : 38);
      this.canSee = realDist < this.range + (combat ? 65 : 10) &&
        (this.inFov(realDx, realDz, combat ? -0.35 : 0.08) || aware) &&
        manager.world.hasLOS(eye, targetEye);
      if (this.canSee) {
        this.lastKnown.copy(target.pos);
        this.alertTimer = Math.max(this.alertTimer, 5);
      }
    }

    // Facing
    const desiredYaw = Math.atan2(dx, dz);
    let diff = desiredYaw - this.model.group.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.model.group.rotation.y += diff * Math.min(1, dt * 7);
    if (this.model.parts.gunGroup) {
      const aimPitch = Math.atan2(targetEye.y - eye.y, Math.max(1, dist));
      this.model.parts.gunGroup.rotation.x += (aimPitch - this.model.parts.gunGroup.rotation.x) * Math.min(1, dt * 6);
    }

    // Movement, weighted by role.
    let mx = 0, mz = 0;
    this.strafeTimer -= dt;
    if (this.strafeTimer <= 0) {
      this.strafeTimer = 1.4 + Math.random() * 2.4;
      this.strafeDir *= -1;
    }
    const zone = ZONES[this.zoneIndex];
    const homeDist = Math.hypot(this.pos.x - zone.x, this.pos.z - zone.z);
    const pmin = this.type.preferredMin || 10;
    const pmax = this.type.preferredMax || 24;
    if (homeDist > 82) {
      mx = zone.x - this.pos.x; mz = zone.z - this.pos.z;
    } else if (dist > pmax) {
      mx = dx; mz = dz;
    } else if (dist < pmin) {
      mx = -dx; mz = -dz;
    } else {
      const strafe = this.typeKey === "scout" ? 1.1 : this.typeKey === "heavy" ? 0.4 : 0.7;
      mx = -dz * this.strafeDir * strafe;
      mz = dx * this.strafeDir * strafe;
    }

    const onLadderNow = manager.world.isLadderAt(this.pos.x, this.pos.y + 0.2, this.pos.z) ||
      manager.world.isLadderAt(this.pos.x, this.pos.y + 1.2, this.pos.z);
    // Head for a ladder when the target is on a roof above us.
    if (target.pos.y > this.pos.y + 1.8 && !onLadderNow) {
      const ladder = manager.nearestLadder(this.zoneIndex, this.pos.x, this.pos.z, 30);
      if (ladder) {
        mx = ladder.x + 0.5 - this.pos.x;
        mz = ladder.z + 0.5 - this.pos.z;
      }
    } else if (onLadderNow && this.climbDir === 0) {
      // At the top of the ladder, step off toward the target instead of
      // strafing back into thin air.
      mx = dx;
      mz = dz;
    }

    // Separation
    for (const other of manager.enemies) {
      if (other === this || other.dead) continue;
      const sx = this.pos.x - other.pos.x, sz = this.pos.z - other.pos.z;
      const d2 = sx * sx + sz * sz;
      if (d2 < 2.4 && d2 > 0.0001) {
        const d = Math.sqrt(d2);
        mx += (sx / d) * 0.9;
        mz += (sz / d) * 0.9;
      }
    }

    const ml = Math.hypot(mx, mz);
    const onLadder = this.climbDir !== 0 && (
      manager.world.isLadderAt(this.pos.x, this.pos.y + 0.2, this.pos.z) ||
      manager.world.isLadderAt(this.pos.x, this.pos.y + 1.2, this.pos.z)
    );
    if (ml > 0.01) {
      mx /= ml; mz /= ml;
      const spd = this.speed * (this.canSee && dist < 26 ? 0.55 : 1);
      manager.moveAgent(this, mx * spd * dt, mz * spd * dt, 0.32, 1.7, dt);
      this.animateWalk(dt, true, spd);
    } else if (onLadder) {
      // Climb even when there is no horizontal movement to make.
      manager.moveAgent(this, 0, 0, 0.32, 1.7, dt);
      this.animateWalk(dt, true, 2.4);
    } else {
      manager.settleAgent(this, 0.32, 1.7, dt);
      this.animateWalk(dt, false);
    }

    // Shooting
    this.fireTimer -= dt;
    if (this.burstLeft > 0) {
      this.burstTimer -= dt;
      if (this.burstTimer <= 0) {
        this.burstTimer = this.typeKey === "heavy" ? 0.085 : 0.11;
        this.burstLeft--;
        this.shoot(player, target, targetEye, manager);
      }
    } else if (this.fireTimer <= 0 && this.canSee && this.reactionTimer <= 0 && dist < this.range) {
      this.burstLeft = this.isBoss ? 6 : this.type.burst;
      this.burstTimer = 0;
      this.fireTimer = this.fireDelay();
      this.model.parts.armR.rotation.x = -1.45;
    }

    if (this.isBoss) {
      if (this.model.parts.bossMarker) {
        this.model.parts.bossMarker.rotation.y += dt * 2.4;
        this.model.parts.bossMarker.position.y = this.markerBaseY + Math.sin(performance.now() * 0.002) * 0.12;
      }
      this.summonTimer -= dt;
      if (this.summonTimer <= 0) {
        this.summonTimer = this.bossKind === "captain" ? 10 : 13;
        manager.summonGuards(this.zoneIndex, this.bossKind === "captain" ? 1 : 2);
        manager.audio.bossRoar();
        manager.hud.toast(
          this.bossKind === "captain" ? "CAPTAIN VOSS" : "DIRECTOR VEX",
          this.bossKind === "captain" ? "VOSS GUARD DEPLOYED" : "PRAETORIANS DEPLOYED",
          "red"
        );
      }
    }

    this.model.group.position.copy(this.pos);
    const recoil = Math.max(0, this.burstLeft) > 0 ? Math.sin(performance.now() * 0.05) * 0.04 : 0;
    this.model.parts.armR.rotation.x = -1.25 + recoil;
    this.model.parts.armL.rotation.x = -1.25;
  }

  shoot(player, target, targetEye, manager) {
    const eye = this.eye();
    const spread = this.spread + (this.canSee ? 0 : 0.03);
    const jitter = new THREE.Vector3(
      (Math.random() - 0.5) * spread,
      (Math.random() - 0.5) * spread * 0.8,
      (Math.random() - 0.5) * spread
    );
    const aim = new THREE.Vector3().subVectors(targetEye, eye).normalize().add(jitter).normalize();
    const maxRange = this.range;
    const wall = manager.world.raycast(eye, aim, maxRange);
    const maxDist = wall ? wall.dist : maxRange;
    let end = wall ? wall.point.clone() : eye.clone().addScaledVector(aim, maxRange);
    const origin = this.model.parts.muzzle
      ? this.model.parts.muzzle.getWorldPosition(new THREE.Vector3())
      : eye;

    const tBody = raySphere(eye, aim, new THREE.Vector3(target.pos.x, target.pos.y + 1.05, target.pos.z), 0.48);
    const tHead = raySphere(eye, aim, new THREE.Vector3(target.pos.x, target.pos.y + 1.62, target.pos.z), 0.27);
    let hitT = -1;
    if (tBody > 0 && tBody < maxDist) hitT = tBody;
    if (tHead > 0 && tHead < maxDist && (hitT < 0 || tHead < hitT)) hitT = tHead;

    if (hitT > 0) {
      end = eye.clone().addScaledVector(aim, hitT);
      const dmg = this.damage * (tHead === hitT ? 1.3 : 1) * (manager.playerDamageMultiplier || 1);
      if (target === player) {
        player.damage(dmg, this);
      } else if (target && target !== player && target.hurt) {
        target.hurt(dmg, this);
      }
      manager.effects.burst(end, 0xff5a5a, 3, 2, 8);
    } else if (wall) {
      manager.effects.impact(end, 0xcfc2a4, 3);
    }

    const sniper = this.typeKey === "sniper";
    const tracerColor = this.isBoss ? 0xff3b5c : sniper ? 0xfff2c4 : 0xff7a5a;
    manager.effects.tracer(origin, end, tracerColor, sniper ? 0.18 : 0.07);
    manager.effects.muzzle(origin, this.isBoss ? 0xff5a6a : sniper ? 0xffe7ae : 0xff9a6a, sniper ? 0.8 : this.isBoss ? 1.2 : 0.55);
    const d = Math.hypot(player.pos.x - this.pos.x, player.pos.z - this.pos.z);
    manager.audio.enemyShot(d);
  }
}

class Ally {
  constructor(manager, pos, name) {
    this.manager = manager;
    this.name = name;
    // Mara is the squad's combat specialist: tougher, faster and far more
    // accurate than the ordinary Echo riflemen.
    this.expert = name === "MARA";
    this.pos = pos.clone();
    this.maxHealth = this.expert ? 2600 : 900;
    this.health = this.maxHealth;
    this.downed = false;
    this.downTimer = 0;
    this.fireTimer = this.expert ? 0.1 + Math.random() * 0.2 : Math.random() * 0.8;
    this.losTimer = 0;
    this.target = null;
    this.canSee = false;
    this.climbDir = 0;
    this.alertTimer = 0;
    this.leader = null;
    this.phase = Math.random() * 10;
    this.walk = 0;
    this.model = createSoldier("ally");
    this.model.group.position.copy(this.pos);
    manager.scene.add(this.model.group);
    this.radius = 0.34;
    this.height = 1.8;
  }

  hurt(amount, source) {
    if (this.downed) return;
    this.alertTimer = Math.max(this.alertTimer, 8);
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.downed = true;
      this.downTimer = 0;
      this.model.group.rotation.z = -1.2;
      this.model.group.position.y -= 0.5;
      this.manager.hud.toast("SQUAD DOWN", `${this.name} IS DOWN // E TO REVIVE`, "red");
    }
  }

  revive(fraction = 0.45) {
    this.downed = false;
    this.health = this.maxHealth * fraction;
    this.model.group.rotation.z = 0;
    this.model.group.position.y = this.pos.y;
  }

  update(dt, player, manager) {
    if (this.downed) {
      this.downTimer += dt;
      this.model.group.position.copy(this.pos);
      this.model.group.position.y -= 0.5;
      if (this.downTimer > 35) this.revive(0.35);
      return;
    }

    this.alertTimer = Math.max(0, this.alertTimer - dt);
    const dxp = player.pos.x - this.pos.x, dzp = player.pos.z - this.pos.z;
    const dp = Math.hypot(dxp, dzp);

    if (dp > 58) {
      this.pos.set(player.pos.x + 2.5, player.pos.y + 0.2, player.pos.z + 2.5);
    }

    // Retarget
    this.losTimer -= dt;
    if (this.losTimer <= 0) {
      this.losTimer = this.expert ? 0.08 + Math.random() * 0.06 : 0.18 + Math.random() * 0.14;
      const eye = new THREE.Vector3(this.pos.x, this.pos.y + 1.45, this.pos.z);
      let best = null, bd = 68;
      for (const e of manager.enemies) {
        if (e.dead) continue;
        const d = Math.hypot(e.pos.x - this.pos.x, e.pos.z - this.pos.z);
        if (d < bd && manager.world.hasLOS(
          eye,
          new THREE.Vector3(e.pos.x, e.pos.y + 1.2, e.pos.z))) {
          bd = d; best = e;
        }
      }
      if (manager.boss && !manager.boss.dead) {
        const d = Math.hypot(manager.boss.pos.x - this.pos.x, manager.boss.pos.z - this.pos.z);
        if (d < bd && manager.world.hasLOS(
          eye,
          new THREE.Vector3(manager.boss.pos.x, manager.boss.pos.y + 1.2, manager.boss.pos.z))) {
          bd = d; best = manager.boss;
        }
      }
      this.target = best;
      this.canSee = !!best;
      if (best) this.alertTimer = Math.max(this.alertTimer, 5);
    }

    // If another nearby ally is already alert, fall in with them. This keeps
    // the squad from standing around while one member is in a firefight.
    let leader = null, leaderDist = 14;
    if (!this.target) {
      for (const a of manager.allies) {
        if (a === this || a.downed || a.alertTimer <= 0) continue;
        const d = Math.hypot(a.pos.x - this.pos.x, a.pos.z - this.pos.z);
        if (d < leaderDist) { leader = a; leaderDist = d; }
      }
    }
    this.leader = leader;

    const target = this.target;
    // Follow the Captain (or a target) up a ladder when they are on a roof.
    const climbFocus = target || player;
    this.climbDir = climbFocus.pos.y > this.pos.y ? 1
      : climbFocus.pos.y < this.pos.y - 0.5 ? -1 : 0;
    let moveX = 0, moveZ = 0;
    if (dp < 3.5) {
      // Never stand in the Captain's face.
      moveX = -dxp; moveZ = -dzp;
    } else if (target) {
      const dx = target.pos.x - this.pos.x, dz = target.pos.z - this.pos.z;
      const dist = Math.hypot(dx, dz);
      const desiredYaw = Math.atan2(dx, dz);
      let diff = desiredYaw - this.model.group.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.model.group.rotation.y += diff * Math.min(1, dt * 8);

      this.fireTimer -= dt;
      if (this.fireTimer <= 0) {
        const eye = new THREE.Vector3(this.pos.x, this.pos.y + 1.45, this.pos.z);
        const targetEye = new THREE.Vector3(target.pos.x, target.pos.y + 1.2, target.pos.z);
        this.canSee = manager.world.hasLOS(eye, targetEye);
        if (this.canSee) {
          this.fireTimer = this.expert ? 0.1 + Math.random() * 0.06 : 0.3 + Math.random() * 0.16;
          this.shoot(target, manager);
        } else {
          this.fireTimer = 0.2;
        }
      }
      if (dist > 26) { moveX = dx; moveZ = dz; }
      else if (dist < 8) { moveX = -dx; moveZ = -dz; }
    } else {
      const follow = this.leader;
      const ldx = follow ? follow.pos.x - this.pos.x : 0;
      const ldz = follow ? follow.pos.z - this.pos.z : 0;
      const leaderDistance = follow ? Math.hypot(ldx, ldz) : Infinity;
      if (follow && leaderDistance > 3.2) {
        moveX = ldx;
        moveZ = ldz;
      } else if (!follow && dp > 9) {
        moveX = dxp;
        moveZ = dzp;
      }
      const desiredYaw = follow ? Math.atan2(ldx, ldz) : Math.atan2(dxp, dzp);
      let diff = desiredYaw - this.model.group.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.model.group.rotation.y += diff * Math.min(1, dt * 5);
    }

    // Keep squadmates out of each other's bodies. This runs even when the
    // ally has no intended movement, so a cluster unpacks itself.
    for (const other of manager.allies) {
      if (other === this || other.downed) continue;
      const sx = this.pos.x - other.pos.x;
      const sz = this.pos.z - other.pos.z;
      const d2 = sx * sx + sz * sz;
      const minD = 1.5;
      if (d2 < minD * minD) {
        if (d2 < 0.0001) {
          const a = Math.random() * Math.PI * 2;
          moveX += Math.cos(a) * 1.2;
          moveZ += Math.sin(a) * 1.2;
        } else {
          const d = Math.sqrt(d2);
          const push = (minD - d) / minD * 1.4;
          moveX += (sx / d) * push;
          moveZ += (sz / d) * push;
        }
      }
    }

    const captainAbove = dp > 3.2 && player.pos.y > this.pos.y + 1.8;
    const onLadderNow = manager.world.isLadderAt(this.pos.x, this.pos.y + 0.2, this.pos.z) ||
      manager.world.isLadderAt(this.pos.x, this.pos.y + 1.2, this.pos.z);
    if ((captainAbove || (target && target.pos.y > this.pos.y + 1.8)) && !onLadderNow) {
      const zoneIndex = nearestZone(this.pos.x, this.pos.z).zone.index;
      const ladder = manager.nearestLadder(zoneIndex, this.pos.x, this.pos.z, 30);
      if (ladder) {
        moveX = ladder.x + 0.5 - this.pos.x;
        moveZ = ladder.z + 0.5 - this.pos.z;
      }
    } else if (onLadderNow && this.climbDir === 0) {
      moveX = dxp;
      moveZ = dzp;
    }

    const ml = Math.hypot(moveX, moveZ);
    const onLadder = this.climbDir !== 0 && (
      manager.world.isLadderAt(this.pos.x, this.pos.y + 0.2, this.pos.z) ||
      manager.world.isLadderAt(this.pos.x, this.pos.y + 1.2, this.pos.z)
    );
    if (ml > 0.05) {
      moveX /= ml; moveZ /= ml;
      const spd = this.expert ? (dp > 16 ? 10 : 6.4) : (dp > 16 ? 8 : 4.6);
      manager.moveAgent(this, moveX * spd * dt, moveZ * spd * dt, 0.3, 1.7, dt);
      this.walk += dt * 8;
      const swing = Math.sin(this.walk) * 0.6;
      this.model.parts.legL.rotation.x = swing;
      this.model.parts.legR.rotation.x = -swing;
      this.model.parts.kneeL.rotation.x = Math.max(0, -Math.sin(this.walk)) * 0.5;
      this.model.parts.kneeR.rotation.x = Math.max(0, Math.sin(this.walk)) * 0.5;
    } else if (onLadder) {
      manager.moveAgent(this, 0, 0, 0.3, 1.7, dt);
      this.walk += dt * 6;
      const swing = Math.sin(this.walk) * 0.5;
      this.model.parts.legL.rotation.x = swing;
      this.model.parts.legR.rotation.x = -swing;
      this.model.parts.kneeL.rotation.x = Math.max(0, -Math.sin(this.walk)) * 0.4;
      this.model.parts.kneeR.rotation.x = Math.max(0, Math.sin(this.walk)) * 0.4;
    } else {
      manager.settleAgent(this, 0.3, 1.7, dt);
      this.model.parts.legL.rotation.x *= 0.9;
      this.model.parts.legR.rotation.x *= 0.9;
      this.model.parts.kneeL.rotation.x *= 0.9;
      this.model.parts.kneeR.rotation.x *= 0.9;
    }

    this.model.group.position.copy(this.pos);
    this.model.parts.armL.rotation.x = -1.25;
    this.model.parts.armR.rotation.x = -1.25;
  }

  shoot(target, manager) {
    const start = this.model.parts.muzzle
      ? this.model.parts.muzzle.getWorldPosition(new THREE.Vector3())
      : new THREE.Vector3(this.pos.x, this.pos.y + 1.5, this.pos.z);
    // Mara fires from eye level so a low wall or her own rifle model can never
    // clip an otherwise clear shot. The tracer still leaves the muzzle.
    const rayOrigin = this.expert
      ? new THREE.Vector3(this.pos.x, this.pos.y + 1.45, this.pos.z)
      : start;
    const headAim = Math.random() < (this.expert ? 0.8 : 0.28);
    const aimPoint = new THREE.Vector3(
      target.pos.x,
      target.pos.y + (headAim ? 1.72 : 1.08),
      target.pos.z
    );
    const dir = aimPoint.clone().sub(rayOrigin).normalize();
    // Mara is a designated marksman: her shots land inside the hit sphere at
    // every practical range, while the riflemen still scatter a little.
    const spread = this.expert ? 0.0012 : 0.008;
    dir.x += (Math.random() - 0.5) * spread;
    dir.y += (Math.random() - 0.5) * spread * 0.8;
    dir.z += (Math.random() - 0.5) * spread;
    dir.normalize();
    const wall = manager.world.raycast(rayOrigin, dir, 68);
    const maxDist = wall ? wall.dist : 68;
    const hits = manager.raycast(rayOrigin, dir, maxDist);
    if (hits.length) {
      const h = hits[0];
      const base = this.expert ? 150 : 52;
      const dmg = h.headshot ? base * 1.8 : base;
      manager.damage(h.enemy, dmg, { headshot: h.headshot, ally: this, weapon: null });
      manager.effects.tracer(start, h.point, 0x7fe8ff, 0.055);
      manager.effects.burst(h.point, 0x74dfff, 2, 2, 8);
    } else {
      manager.effects.tracer(start, wall ? wall.point : start.clone().addScaledVector(dir, 68), 0x7fe8ff, 0.05);
      if (wall) manager.effects.impact(wall.point, 0xb9c9b5, 2);
    }
    manager.effects.muzzle(start, 0x8ff0ff, 0.4);
    manager.audio.enemyShot(12);
    this.alertTimer = Math.max(this.alertTimer, 6);
  }
}

const SQUAD_NAMES = [
  "MARA", "JAX", "SABLE", "ROOK", "NOVA", "HALO", "WRAITH", "BISHOP",
  "KESTREL", "DOC", "TALON", "VEGA", "ORION", "ECHO", "CORVUS", "NIX",
  "STRAY", "HEX", "MOTH", "GRAVE"
];
// The Captain plus five squadmates: Mara and four Echo riflemen.
const SQUAD_LIMIT = 5;
const VILLAIN_LINES = [
  "Every soldier you kill is a neighbour you failed to save.",
  "There is no cure, Captain. The Chorus does not let go.",
  "My army does not fear death. I removed that feature.",
  "Thirty-three gates. Thirty-three chances to kneel.",
  "Your twenty soldiers are cattle with rifles. They will die like the rest.",
  "The sprawl is a nervous system. I am its mind.",
  "You are a loose thread in a very old tapestry.",
  "When you reach me, you will already be mine."
];
const CLEAR_LINES = [
  "Beacon down. Chorus is deaf in this sector.",
  "Signal's flat. I can hear myself think again.",
  "They're not waking up. They never will. But the signal is weaker here.",
  "Stronghold's ours. Vex is going to feel that.",
  "Another hole in the net. Keep moving, Captain.",
  "The conscripts are down. No cure, no rescue. Just the next gate."
];

export class EnemyManager {
  constructor({ scene, world, effects, audio, hud, player, pickups, callbacks = {} }) {
    this.scene = scene;
    this.world = world;
    this.effects = effects;
    this.audio = audio;
    this.hud = hud;
    this.player = player;
    this.pickups = pickups || null;
    this.callbacks = callbacks;
    this.enemies = [];
    this.allies = [];
    this.recruits = [];
    this.squadLimit = SQUAD_LIMIT;
    // Co-op scales the wave size, enemy armour and enemy damage; team upgrades
    // add further player-damage and incoming-damage multipliers on top.
    this.enemyCountMultiplier = 1;
    this.enemyHealthMultiplier = 1;
    this.enemyDamageMultiplier = 1;
    this.playerDamageMultiplier = 1;
    // Co-op roles: solo runs the full simulation, host owns enemies and
    // checkpoint progression, client renders host snapshots and sends damage.
    this.netRole = "solo";
    this.netDamage = null;
    this.netEvent = null;
    this.netPresence = null;
    this.remoteTargets = [];
    this.netPuppetTick = null;
    this.zoneTrees = ZONES.map(zone => zone.props.filter(p => p.kind === "tree"));
    this.zoneLadders = ZONES.map(zone =>
      zone.props.filter(p => p.kind === "building").map(ladderForBuilding).filter(Boolean)
    );
    this.boss = null;
    this.kills = 0;
    this.clearedCount = 0;
    this.totalFor = state => Math.max(1, Math.round(state.zone.total * this.enemyCountMultiplier));
    this.states = ZONES.map(zone => {
      const maxAliveBase = Math.min(30, 14 + Math.floor(zone.index * 0.55));
      return {
        zone, active: false, cleared: false, spawned: 0, killed: 0, alive: 0,
        spawnTimer: 0, maxAliveBase, maxAlive: maxAliveBase,
        roofClaims: new Set(), snipersSpawned: 0,
        maxSnipers: zone.region === "city" ? 3 : zone.region === "suburb" ? 2 : 1
      };
    });
    this.triggerTimer = 0;
    this.spawnCheck = 0;
    this.hudTimer = 0;
    this.radarTimer = 0;
    this.pendingVictory = -1;
    this.victorySent = false;
    this.supplyGiven = new Set();
    this.started = false;
    this.zoneTotal = this.states.length;
    this.activeIndex = -1;
    this.nextIndex = 0;
    this.regionCheck = 0;
    this.lastRegion = null;
    this.lockedZone = null;
    this.lockWarned = -1;
    this.world.setProgress(0, -1);
  }

  setPickups(p) { this.pickups = p; }

  setPlayer(player) {
    this.player = player;
    if (!this.lastRegion) this.lastRegion = nearestZone(player.pos.x, player.pos.z).zone.region;
    if (!this.started) {
      this.started = true;
      this.spawnSquad(SQUAD_NAMES);
    }
  }

  spawnAlly(name, x, z) {
    const y = this.world.surfaceY(x, z) + 0.05;
    const ally = new Ally(this, new THREE.Vector3(x, y, z), name);
    this.allies.push(ally);
    return ally;
  }

  spawnSquad(names) {
    const p = this.player.pos;
    names = names.slice(0, Math.max(0, this.squadLimit));
    let placed = 0;
    for (let attempt = 0; attempt < 220 && placed < names.length; attempt++) {
      const ring = 4 + Math.floor(attempt / 11) * 2.2;
      const angle = attempt * 2.39996;
      const x = p.x + Math.cos(angle) * ring;
      const z = p.z + Math.sin(angle) * ring;
      const y = this.world.surfaceY(x, z);
      if (this.world.collidesBox(x, y + 0.1, z, 0.34, 1.8)) continue;
      if (this.allies.some(a => Math.hypot(a.pos.x - x, a.pos.z - z) < 1.5)) continue;
      this.spawnAlly(names[placed], x, z);
      placed++;
    }
    // Safety net: never leave the Captain short-handed.
    while (placed < names.length) {
      const angle = placed * 2.39996;
      this.spawnAlly(names[placed], p.x + Math.cos(angle) * 3.5, p.z + Math.sin(angle) * 3.5);
      placed++;
    }
  }

  removeAllies() {
    for (const a of this.allies) this.scene.remove(a.model.group);
    this.allies = [];
  }

  restoreAllies(names) {
    for (const a of [...this.allies]) {
      this.scene.remove(a.model.group);
    }
    this.allies = [];
    const saved = Array.isArray(names) ? names.slice(0, SQUAD_LIMIT) : [];
    const list = saved.concat(SQUAD_NAMES.filter(n => !saved.includes(n))).slice(0, SQUAD_LIMIT);
    this.spawnSquad(list);
    for (const a of this.allies) a.health = a.maxHealth * 0.8;
  }

  applyCleared(indices) {
    for (const idx of indices) {
      const s = this.states[idx];
      if (!s) continue;
      s.cleared = true;
      s.zone.cleared = true;
      this.world.setZoneCleared(idx);
    }
    this.clearedCount = this.states.filter(s => s.cleared).length;
    this.updateNext();
    this.hud.setObjective("ADVANCE", this.currentObjectiveName(), "CLEAR THE SPRAWL", this.clearedCount / ZONE_COUNT, "");
  }

  currentObjectiveName() {
    const next = this.states[this.nextIndex];
    return next ? next.zone.name : "THE SPRAWL";
  }

  updateNext() {
    const previous = this.nextIndex;
    this.nextIndex = this.states.findIndex(s => !s.cleared);
    if (this.nextIndex < 0) this.nextIndex = ZONE_COUNT - 1;
    if (previous !== this.nextIndex) this.lockWarned = -1;
    const active = this.states.find(s => s.active && !s.cleared);
    this.activeIndex = active ? active.zone.index : -1;
    this.world.setProgress(this.nextIndex, this.activeIndex);
    if (this.states.every(s => s.cleared)) {
      this.lockedZone = null;
      this.world.setLockBarrier(null);
    }
  }

  update(dt) {
    if (!this.player) return;
    if (this.netRole === "client") {
      // The host owns the enemy simulation. Keep the allied squad, the radar
      // and the boss bar alive, and let the co-op layer move the puppets.
      this.netPuppetTick?.(dt);
      this.updateCheckpointLock();
      for (const a of this.allies) {
        if (!a.networkPuppet) a.update(dt, this.player, this);
      }
      this.radarTimer -= dt;
      if (this.radarTimer <= 0) {
        this.radarTimer = 0.1;
        this.updateHud();
      }
      if (this.boss && !this.boss.dead) {
        this.hud.setBoss(
          this.boss.bossKind === "captain" ? "CAPTAIN VOSS // CHORUS HAND" : "DIRECTOR VEX // CHORUS PRIME",
          this.boss.health,
          this.boss.maxHealth
        );
      }
      return;
    }
    this.triggerTimer -= dt;
    if (this.triggerTimer <= 0) {
      this.triggerTimer = 0.2;
      this.checkZoneTriggers();
    }

    this.regionCheck -= dt;
    if (this.regionCheck <= 0) {
      this.regionCheck = 0.7;
      const region = nearestZone(this.player.pos.x, this.player.pos.z).zone.region;
      if (this.lastRegion && region !== this.lastRegion) {
        const zone = nearestZone(this.player.pos.x, this.player.pos.z).zone;
        this.hud.toast("ENTERING " + zone.regionName, zone.regionLabel + " // NATIONAL ROUTE 9", "amber");
        this.hud.comms("MARA", `${zone.regionName}. ${maraLine("region")}`, 5200);
      }
      this.lastRegion = region;
    }

    this.updateCheckpointLock();
    this.checkActiveZone(dt);

    const targets = this.remoteTargets.length ? this.allies.concat(this.remoteTargets) : this.allies;
    for (const e of this.enemies) e.update(dt, this.player, targets, this);
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (this.enemies[i].removed) this.enemies.splice(i, 1);
    }
    for (const a of this.allies) a.update(dt, this.player, this);

    this.radarTimer -= dt;
    if (this.radarTimer <= 0) {
      this.radarTimer = 0.1;
      this.updateHud();
    }

    if (this.pendingVictory > 0) {
      this.pendingVictory -= dt;
      if (this.pendingVictory <= 0 && !this.victorySent) {
        this.victorySent = true;
        this.callbacks.onVictory?.();
      }
    }

    if (this.boss && !this.boss.dead) {
      this.hud.setBoss(
        this.boss.bossKind === "captain" ? "CAPTAIN VOSS // CHORUS HAND" : "DIRECTOR VEX // CHORUS PRIME",
        this.boss.health,
        this.boss.maxHealth
      );
    }
  }

  updateHud() {
    const active = this.states.find(s => s.active && !s.cleared);
    const next = this.states[this.nextIndex];
    const cleared = this.states.filter(s => s.cleared).length;
    if (cleared >= ZONE_COUNT) {
      this.hud.setObjective("OPERATION COMPLETE", "THE NATION", "DIRECTOR VEX IS DEAD // CHORUS OFFLINE", 1, "SECURED");
    } else if (active) {
      const total = this.totalFor(active);
      const remaining = Math.max(0, total - active.killed);
      const dist = Math.round(Math.hypot(this.player.pos.x - active.zone.x, this.player.pos.z - active.zone.z));
      this.hud.setObjective(
        `CHECKPOINT ${String(active.zone.id).padStart(2, "0")} / 33 // ${active.zone.regionName}`,
        active.zone.name.toUpperCase(),
        `${active.zone.regionLabel} // HOSTILES REMAINING ${remaining} OF ${total}`,
        active.killed / total,
        `${dist} m`
      );
    } else if (next) {
      const dist = Math.round(Math.hypot(this.player.pos.x - next.zone.x, this.player.pos.z - next.zone.z));
      this.hud.setObjective(
        `NEXT CHECKPOINT // ${String(next.zone.id).padStart(2, "0")} / 33`,
        next.zone.name.toUpperCase(),
        `${next.zone.regionName} // CLEAR THIS CHECKPOINT TO ADVANCE // ${dist} m`,
        cleared / ZONE_COUNT,
        `${dist} m`
      );
    } else {
      this.hud.setObjective("OPERATION COMPLETE", "THE NATION", "DIRECTOR VEX IS DEAD", 1, "");
    }

    const zoneData = this.states.map(s => {
      const z = s.zone;
      z.cleared = s.cleared;
      return z;
    });
    this.hud.updateRadar({
      pos: this.player.pos,
      yaw: this.player.yaw,
      enemies: this.enemies,
      allies: this.allies,
      recruits: this.recruits,
      zones: zoneData,
      nextIndex: this.nextIndex,
      activeIndex: this.activeIndex,
      boss: this.boss && !this.boss.dead ? this.boss : null
    });
    this.hud.setSquad(this.player, this.allies);
    this.hud.setHealth(this.player.health);
  }

  checkZoneTriggers() {
    // Campaign order is strict: only the next uncleared checkpoint can wake up.
    if (this.states.some(s => s.active && !s.cleared)) return;
    const next = this.states[this.nextIndex];
    if (!next || next.cleared) return;
    const points = [this.player.pos];
    if (this.netPresence) points.push(...this.netPresence);
    if (points.some(p => Math.hypot(p.x - next.zone.x, p.z - next.zone.z) < 68)) {
      this.activateZone(next);
    }
  }

  updateCheckpointLock() {
    if (!this.player) return;
    let nearest = null, nd = 280;
    for (const s of this.states) {
      if (s.cleared || s.zone.index <= this.nextIndex) continue;
      const d = Math.hypot(this.player.pos.x - s.zone.x, this.player.pos.z - s.zone.z);
      if (d < nd) { nd = d; nearest = s.zone; }
    }
    if (nearest !== this.lockedZone) {
      this.lockedZone = nearest;
      this.world.setLockBarrier(nearest || null);
    }
    if (!nearest) return;

    const dx = this.player.pos.x - nearest.x;
    const dz = this.player.pos.z - nearest.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 100.8) {
      const a = dist > 0.001 ? Math.atan2(dz, dx) : 0;
      this.player.pos.x = nearest.x + Math.cos(a) * 101.2;
      this.player.pos.z = nearest.z + Math.sin(a) * 101.2;
      this.player.vel.x = 0;
      this.player.vel.z = 0;
      this.player.updateCamera(0);
    }
    if ((dist < 132 || dist < 100.8) && this.lockWarned !== nearest.index) {
      this.lockWarned = nearest.index;
      const next = this.states[this.nextIndex]?.zone;
      this.hud.toast(
        "CHECKPOINT LOCKED",
        `CLEAR ${next ? next.name.toUpperCase() : "THE CURRENT CHECKPOINT"} TO ADVANCE`,
        "red"
      );
      this.hud.comms("MARA", "That sector is sealed until we take the current checkpoint. No shortcuts.", 4800);
      this.audio.alarm();
    }
  }

  findBossSpawn(zone) {
    for (let rad = 6; rad <= 18; rad += 2) {
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const x = zone.x + Math.cos(a) * rad;
        const z = zone.z + Math.sin(a) * rad;
        const y = this.world.surfaceY(x, z);
        if (y > 6) continue;
        if (!this.world.collidesBox(x, y + 0.1, z, 0.65, 2.9)) {
          return new THREE.Vector3(x, y + 0.02, z);
        }
      }
    }
    return this.world.spawnPointFor(zone, Math.PI * 0.28, 12, true).clone();
  }

  activateZone(state) {
    state.active = true;
    this.activeIndex = state.zone.index;
    this.netEvent?.("battleStart", { index: state.zone.index });
    this.callbacks.onBattleStart?.(state.zone);
    this.world.setProgress(this.nextIndex, state.zone.index);
    const bossKind = state.zone.boss;
    const total = this.totalFor(state);
    this.audio.alarm();
    this.hud.banner(
      bossKind === "director"
        ? "FINAL CHECKPOINT // 33"
        : bossKind === "captain"
          ? "BOSS CHECKPOINT // 32"
          : `CHECKPOINT ${String(state.zone.id).padStart(2, "0")} // ${total} HOSTILES`,
      state.zone.name.toUpperCase(),
      bossKind === "director"
        ? "DIRECTOR VEX // CHORUS PRIME"
        : bossKind === "captain"
          ? "CAPTAIN VOSS // VEX'S HAND"
          : "CHORUS GARRISON DETECTED — ELIMINATE ALL",
      false
    );
    this.hud.toast("CHECKPOINT ENGAGED", `${state.zone.name.toUpperCase()} // ${total} MIND-CONTROLLED`, "amber");
    this.hud.comms("MARA", maraLine("engage", { n: total }), 6200);
    if (state.zone.index % 5 === 4) {
      setTimeout(() => this.hud.comms("DIRECTOR VEX", VILLAIN_LINES[(state.zone.index / 5 | 0) % VILLAIN_LINES.length], 7000), 800);
    }
    state.spawnTimer = 0.15;
    if (state.zone.isBoss) {
      this.spawnBoss(state);
    }
  }

  checkActiveZone(dt) {
    const active = this.states.find(s => s.active && !s.cleared);
    if (!active) return;
    const zone = active.zone;
    const total = this.totalFor(active);
    active.spawnTimer -= dt;
    const maxAlive = active.maxAlive;
    if (active.spawned < total && active.alive < maxAlive && active.spawnTimer <= 0) {
      const batch = active.alive < maxAlive - 3 ? 2 : 1;
      for (let i = 0; i < batch && active.spawned < total && active.alive < maxAlive; i++) {
        this.spawnEnemy(active);
      }
      active.spawnTimer = Math.max(0.28, 0.62 - zone.index * 0.008);
    }

    if (zone.isBoss) return; // cleared when the Director dies

    if (active.spawned >= total && active.alive <= 0) {
      this.completeZone(active);
    }
  }

  findRoofSpawn(state) {
    const zone = state.zone;
    const candidates = zone.props.filter(p =>
      p.kind === "building" && p.roofStyle === "flat" &&
      p.w >= 4 && p.d >= 4 && p.h >= 5 && !state.roofClaims.has(p)
    );
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    for (const p of candidates) {
      const top = p.base + p.h;
      const inset = Math.min(1.8, p.w / 2 - 0.6, p.d / 2 - 0.6);
      const minX = p.x0 + inset, maxX = p.x0 + p.w - 1 - inset;
      const minZ = p.z0 + inset, maxZ = p.z0 + p.d - 1 - inset;
      if (maxX <= minX || maxZ <= minZ) continue;
      for (let attempt = 0; attempt < 8; attempt++) {
        const x = minX + Math.random() * (maxX - minX);
        const z = minZ + Math.random() * (maxZ - minZ);
        const y = this.world.surfaceY(x, z);
        if (y < top + 1) continue;
        if (y < 9) continue;
        if (this.world.collidesBox(x, y + 0.08, z, 0.36, 1.8)) continue;
        state.roofClaims.add(p);
        return {
          pos: new THREE.Vector3(x, y + 0.02, z),
          minX, maxX, minZ, maxZ, y
        };
      }
    }
    return null;
  }

  spawnEnemy(state) {
    const zone = state.zone;
    let typeKey = chooseRole(zone.region);
    if (typeKey !== "sniper" && state.spawned < 3 && state.snipersSpawned === 0 && state.snipersSpawned < state.maxSnipers) {
      typeKey = "sniper";
    }
    if (typeKey === "sniper" && (state.snipersSpawned >= state.maxSnipers || this.player === null)) {
      typeKey = "rifleman";
    }

    let roof = null;
    let pos = null;
    if (typeKey === "sniper") {
      roof = this.findRoofSpawn(state);
      if (!roof) {
        typeKey = zone.region === "city" ? "rifleman" : "conscript";
      } else {
        pos = roof.pos;
        state.snipersSpawned++;
      }
    }

    if (!pos) {
      for (let i = 0; i < 10; i++) {
        const ang = Math.random() * Math.PI * 2;
        pos = this.world.spawnPointFor(zone, ang, Math.random() * 30, true);
        if (Math.hypot(pos.x - this.player.pos.x, pos.z - this.player.pos.z) > 17) break;
      }
    }
    if (!pos) return;
    const e = new Enemy(this, pos, zone.index, false, typeKey, roof);
    e.model.group.rotation.y = Math.atan2(zone.x - pos.x, zone.z - pos.z);
    this.enemies.push(e);
    state.spawned++;
    state.alive++;
    this.effects.explosion(new THREE.Vector3(pos.x, pos.y + 1, pos.z), 0.5);
    this.effects.burst(pos, 0xc17bff, 10, 3, 2);
  }

  spawnBoss(state) {
    if (this.boss) return;
    const zone = state.zone;
    const bossKind = zone.boss || "director";
    const captain = bossKind === "captain";
    const pos = this.findBossSpawn(zone);
    const boss = new Enemy(this, pos, zone.index, bossKind);
    boss.model.group.rotation.y = Math.atan2(this.player.pos.x - pos.x, this.player.pos.z - pos.z);
    this.boss = boss;
    this.enemies.push(boss);
    state.spawned++;
    state.alive++;
    this.effects.explosion(new THREE.Vector3(pos.x, pos.y + 1.5, pos.z), 2);
    this.audio.bossRoar();
    this.hud.banner(
      captain ? `BOSS CHECKPOINT // ${String(zone.id).padStart(2, "0")}` : "FINAL CHECKPOINT // 33",
      captain ? "CAPTAIN VOSS" : "THE DIRECTOR",
      captain ? "VEX'S HAND // BREAK THE INNER GATE" : "KILL VEX // BREAK THE CHORUS",
      false
    );
    this.hud.toast(
      "BOSS SIGNATURE",
      captain ? "CAPTAIN VOSS // 3,400 INTEGRITY" : "DIRECTOR VEX // 7,800 INTEGRITY",
      "red"
    );
    this.hud.comms("MARA", maraLine("boss"), 6200);
    for (let i = 0; i < (captain ? 6 : 10); i++) this.spawnGuard(zone.index);

    // Vex keeps two elite praetorians at his shoulder in addition to the wave.
    if (!captain) {
      for (let i = 0; i < 2; i++) {
        const gx = pos.x + (i === 0 ? -4.5 : 4.5);
        const gz = pos.z + (i === 0 ? -3 : 3);
        const gy = this.world.surfaceY(gx, gz);
        const guard = new Enemy(this, new THREE.Vector3(gx, gy + 0.02, gz), zone.index, false, "heavy");
        guard.model.group.rotation.y = Math.atan2(this.player.pos.x - gx, this.player.pos.z - gz);
        this.enemies.push(guard);
        state.spawned++;
        state.alive++;
        this.effects.burst(new THREE.Vector3(gx, gy + 1, gz), 0xc17bff, 14, 4, 3);
      }
      this.hud.toast("PRAETORIAN GUARD", "DIRECTOR VEX IS SHIELDED BY TWO ELITE GUARDS", "red");
    }
  }

  spawnGuard(zoneIndex) {
    const zone = ZONES[zoneIndex];
    const state = this.states[zoneIndex];
    if (state.spawned >= this.totalFor(state)) return;
    const ang = Math.random() * Math.PI * 2;
    const pos = this.world.spawnPointFor(zone, ang, Math.random() * 20, true);
    let typeKey = chooseRole(zone.region);
    if (typeKey === "sniper") typeKey = "heavy";
    const e = new Enemy(this, pos, zoneIndex, false, typeKey);
    e.model.group.rotation.y = Math.atan2(zone.x - pos.x, zone.z - pos.z);
    this.enemies.push(e);
    state.spawned++;
    state.alive++;
    this.effects.burst(pos, 0xc17bff, 8, 3, 2);
  }

  summonGuards(zoneIndex, count) {
    const state = this.states[zoneIndex];
    if (!state) return;
    for (let i = 0; i < count; i++) this.spawnGuard(zoneIndex);
    this.effects.burst(new THREE.Vector3(state.zone.x, this.world.surfaceY(state.zone.x, state.zone.z) + 2, state.zone.z), 0xc17bff, 24, 6, 3);
  }

  raycast(origin, dir, maxDist) {
    const hits = [];
    const all = this.enemies;
    for (const e of all) {
      if (e.dead || e.removed) continue;
      const scale = e.hitScale || (e.isBoss ? 1.65 : 1);
      const bodyCenter = new THREE.Vector3(e.pos.x, e.pos.y + 1.08 * scale, e.pos.z);
      const headCenter = new THREE.Vector3(e.pos.x, e.pos.y + 1.72 * scale, e.pos.z);
      const tb = raySphere(origin, dir, bodyCenter, 0.48 * scale);
      const th = raySphere(origin, dir, headCenter, 0.3 * scale);
      if (th > 0 && th < maxDist && (tb <= 0 || th < tb)) {
        hits.push({ enemy: e, dist: th, headshot: true, point: origin.clone().addScaledVector(dir, th) });
      } else if (tb > 0 && tb < maxDist) {
        hits.push({ enemy: e, dist: tb, headshot: false, point: origin.clone().addScaledVector(dir, tb) });
      }
    }
    hits.sort((a, b) => a.dist - b.dist);
    return hits;
  }

  damage(enemy, amount, opts = {}) {
    if (!enemy || enemy.dead) return false;
    if (this.netRole === "client") {
      // A client cannot authorise an enemy death. Ask the host and wait for
      // the next snapshot to show the result.
      this.netDamage?.(enemy, amount, opts);
      return false;
    }
    enemy.onDamaged(opts);
    enemy.health -= Math.max(1, amount);
    if (enemy.health > 0) {
      this.effects.burst(new THREE.Vector3(enemy.pos.x, enemy.pos.y + 1.2, enemy.pos.z), 0x9c58ff, 2, 1.8, 7);
      return false;
    }
    this.killEnemy(enemy, opts);
    return true;
  }

  applyNetworkDamage(netId, amount, headshot, attacker) {
    if (this.netRole !== "host") return false;
    const enemy = this.enemies.find(e => e.netId === netId && !e.dead);
    if (!enemy) return false;
    return this.damage(enemy, amount, {
      headshot: !!headshot,
      remote: true,
      ally: attacker || this.player
    });
  }

  killEnemy(enemy, opts = {}) {
    if (enemy.dead) return;
    enemy.dead = true;
    enemy.deathTimer = 0;
    enemy.fallDir = Math.random() > 0.5 ? 1 : -1;
    this.kills++;
    const state = this.states[enemy.zoneIndex];
    if (state) {
      state.alive = Math.max(0, state.alive - 1);
      state.killed++;
    }
    const p = new THREE.Vector3(enemy.pos.x, enemy.pos.y + 1, enemy.pos.z);
    this.effects.burst(p, 0xb85cff, enemy.isBoss ? 60 : 12, enemy.isBoss ? 8 : 4, 8);
    this.effects.burst(p, 0xff7a5a, enemy.isBoss ? 30 : 4, 4, 10);
    if (!opts.silent) {
      // A body hitting the ground pulls every nearby Chorus unit's attention.
      this.alertNoise(enemy.pos.x, enemy.pos.y, enemy.pos.z, 90);
    }

    if (enemy.isBoss) {
      this.bossDeath(enemy);
      return;
    }

    if (this.pickups && !opts.silent) {
      const r = Math.random();
      if (r < 0.17) this.pickups.spawn("health", enemy.pos, 220 + Math.round(Math.random() * 120));
      else if (r < 0.41) this.pickups.spawn("ammo", enemy.pos, 65 + Math.round(Math.random() * 55));
    }
    this.callbacks.onKill?.(this.kills);

    if (state && state.active && !state.cleared && state.spawned >= this.totalFor(state) && state.alive <= 0 && !state.zone.isBoss) {
      this.completeZone(state);
    }
  }

  bossDeath(boss) {
    const captain = boss.bossKind === "captain";
    boss.dead = true;
    this.hud.setBoss(captain ? "CAPTAIN VOSS // CHORUS HAND" : "DIRECTOR VEX // CHORUS PRIME", 0, boss.maxHealth);
    this.hud.hideBoss();
    const p = new THREE.Vector3(boss.pos.x, boss.pos.y + 2, boss.pos.z);
    this.effects.explosion(p, captain ? 1.9 : 2.4);
    this.effects.burst(p, 0xc17bff, captain ? 60 : 90, 10, 4);

    // Every mind-linked soldier drops when its local command dies.
    for (const e of this.enemies) {
      if (e === boss || e.dead) continue;
      e.health = 0;
      this.killEnemy(e, { silent: true });
    }
    this.boss = null;

    const state = this.states[boss.zoneIndex];
    state.active = false;
    state.cleared = true;
    state.zone.cleared = true;
    state.killed = this.totalFor(state);
    state.alive = 0;
    this.clearedCount = this.states.filter(s => s.cleared).length;
    this.world.setZoneCleared(boss.zoneIndex);
    this.updateNext();
    this.netEvent?.("zoneClear", {
      index: boss.zoneIndex,
      final: !captain,
      cleared: this.states.map((s, i) => s.cleared ? i : -1).filter(i => i >= 0)
    });

    if (captain) {
      this.hud.banner("CHORUS HAND", "CAPTAIN VOSS IS DEAD", "INNER GATE OPEN // THE DIRECTOR WAITS", true);
      this.hud.toast("COMMAND SEVERED", "CAPTAIN VOSS ELIMINATED", "green");
      this.hud.comms("MARA", "Voss is down. The inner gate is opening. Vex is next.", 6000);
      this.audio.zoneClear();
      if (this.pickups) {
        const y = this.world.surfaceY(state.zone.x + 4, state.zone.z + 4);
        this.pickups.supplyDrop(new THREE.Vector3(state.zone.x + 4, y, state.zone.z + 4));
      }
      for (const a of this.allies) if (a.downed) a.revive(0.5);
      this.callbacks.onBattleEnd?.(state.zone);
      this.callbacks.onZoneClear?.(state.zone, { kills: this.kills, cleared: this.clearedCount, boss: "captain" });
      return;
    }

    this.hud.banner("CHORUS PRIME", "THE DIRECTOR IS DEAD", "SIGNAL COLLAPSE // THE SKY IS OPENING", true);
    this.hud.toast("SIGNAL TERMINATED", "DIRECTOR VEX ELIMINATED", "green");
    this.audio.victory();
    this.callbacks.onBattleEnd?.(state.zone);
    this.callbacks.onZoneClear?.(state.zone, { final: true, kills: this.kills });
    this.callbacks.onFinale?.(state.zone, {
      x: boss.pos.x, y: boss.pos.y, z: boss.pos.z, group: boss.model.group
    });
  }

  completeZone(state) {
    if (state.cleared) return;
    state.cleared = true;
    state.active = false;
    state.zone.cleared = true;
    this.clearedCount = this.states.filter(s => s.cleared).length;
    this.world.setZoneCleared(state.zone.index);
    this.hud.banner("CHECKPOINT SECURED", state.zone.name.toUpperCase(), "NEXT CHECKPOINT UNLOCKED // SUPPLIES RECOVERED", true);
    this.hud.toast("CHECKPOINT CLEARED", `${state.zone.id} / 33 // ${state.zone.name.toUpperCase()}`, "green");
    this.hud.comms("MARA", maraLine("clear", { count: this.clearedCount }), 6200);
    this.audio.zoneClear();
    this.callbacks.onBattleEnd?.(state.zone);

    if (this.pickups) {
      const y = this.world.surfaceY(state.zone.x + 4, state.zone.z + 4);
      this.pickups.supplyDrop(new THREE.Vector3(state.zone.x + 4, y, state.zone.z + 4));
    }
    for (const a of this.allies) if (a.downed) a.revive(0.5);
    this.updateNext();
    this.netEvent?.("zoneClear", {
      index: state.zone.index,
      cleared: this.states.map((s, i) => s.cleared ? i : -1).filter(i => i >= 0)
    });
    if (this.clearedCount < ZONE_COUNT) {
      const next = this.states[this.nextIndex]?.zone;
      if (next) this.hud.toast("NEXT CHECKPOINT UNLOCKED", `${next.name.toUpperCase()} // ${next.regionName}`, "amber");
    }
    this.callbacks.onZoneClear?.(state.zone, { kills: this.kills, cleared: this.clearedCount });
  }

  getInteractPrompt() {
    if (!this.player) return null;
    const p = this.player.pos;
    let best = null, bd = 4.6;
    for (const a of this.allies) {
      if (!a.downed || a.networkPuppet) continue;
      const d = Math.hypot(a.pos.x - p.x, a.pos.z - p.z);
      if (d < bd) { bd = d; best = a; }
    }
    return best ? `REVIVE ${best.name}` : null;
  }

  tryInteract() {
    if (!this.player) return false;
    const p = this.player.pos;
    for (const a of this.allies) {
      if (a.downed && Math.hypot(a.pos.x - p.x, a.pos.z - p.z) < 4.6) {
        a.revive(0.55);
        this.hud.toast("SQUAD LINK", `${a.name} BACK ON HER FEET`, "cyan");
        this.audio.pickup(true);
        return true;
      }
    }
    return false;
  }

  reviveAll(fraction = 0.55) {
    for (const a of this.allies) if (a.downed) a.revive(fraction);
  }

  alertNoise(x, y, z, radius = 55) {
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.pos.x - x, e.pos.z - z);
      if (d > radius) continue;
      e.alertTimer = Math.max(e.alertTimer, 10);
      e.combatAlertTimer = Math.max(e.combatAlertTimer, 9);
      e.lastKnown.set(x, y, z);
      e.retarget = Math.min(e.retarget, 0.05);
    }
  }

  nearestLadder(zoneIndex, x, z, maxDist = 28) {
    const ladders = this.zoneLadders[zoneIndex] || [];
    let best = null, bd = maxDist;
    for (const ladder of ladders) {
      const d = Math.hypot(ladder.x + 0.5 - x, ladder.z + 0.5 - z);
      if (d < bd) { bd = d; best = ladder; }
    }
    return best;
  }

  treeAvoidance(x, z) {
    const trees = this.zoneTrees[nearestZone(x, z).zone.index] || [];
    let ax = 0, az = 0;
    for (const p of trees) {
      const dx = x - p.x, dz = z - p.z;
      const d2 = dx * dx + dz * dz;
      if (d2 > 20.25 || d2 < 0.0001) continue;
      const d = Math.sqrt(d2);
      const push = (1 - d / 4.5) * 0.8;
      ax += (dx / d) * push;
      az += (dz / d) * push;
    }
    return { x: ax, z: az };
  }

  moveAgent(agent, dx, dz, radius, height, dt = 1 / 60) {
    const x = agent.pos.x, y = agent.pos.y, z = agent.pos.z;
    const ladderY = this.world.ladderTop(x, z, y);
    const onLadder = ladderY !== null &&
      (this.world.isLadderAt(x, y + 0.2, z) || this.world.isLadderAt(x, y + 1.2, z));
    const atTop = onLadder && agent.climbDir > 0 && y >= ladderY - 0.01;

    // Climbing agents hold the ladder instead of drifting sideways off it.
    // At the top they are free to step onto the roof.
    if (!onLadder || !agent.climbDir || atTop) {
      let ax = dx, az = dz;
      if (ax !== 0 || az !== 0) {
        const avoid = this.treeAvoidance(x, z);
        ax += avoid.x * 0.45;
        az += avoid.z * 0.45;
      }
      if (!this.world.collidesBox(x + ax, y + 0.05, z, radius, height)) {
        agent.pos.x = x + ax;
      } else if (!this.world.collidesBox(x + ax, y + 1.06, z, radius, height) &&
                 this.world.groundBelow(x + ax, z, y + 1.2) <= y + 1.1) {
        agent.pos.x = x + ax;
        agent.pos.y += 1.05;
      }
      if (!this.world.collidesBox(agent.pos.x, agent.pos.y + 0.05, z + az, radius, height)) {
        agent.pos.z = z + az;
      } else if (!this.world.collidesBox(agent.pos.x, agent.pos.y + 1.06, z + az, radius, height) &&
                 this.world.groundBelow(agent.pos.x, z + az, agent.pos.y + 1.2) <= agent.pos.y + 1.1) {
        agent.pos.z = z + az;
        agent.pos.y += 1.05;
      }
    }

    const nowLadder = this.world.isLadderAt(agent.pos.x, agent.pos.y + 0.2, agent.pos.z) ||
      this.world.isLadderAt(agent.pos.x, agent.pos.y + 1.2, agent.pos.z);
    if (nowLadder && agent.climbDir) {
      let ny = agent.pos.y + agent.climbDir * 3.2 * dt;
      // The ladder ends at the roof lip. Stop there so the agent can walk
      // onto the roof rather than climbing into the air above it.
      const topY = this.world.ladderTop(agent.pos.x, agent.pos.z, agent.pos.y);
      if (agent.climbDir > 0 && topY !== null) ny = Math.min(ny, topY);
      if (!this.world.collidesBox(agent.pos.x, ny, agent.pos.z, radius, height)) {
        agent.pos.y = ny;
      } else {
        agent.climbDir = 0;
      }
    } else if (!nowLadder) {
      this.settleAgent(agent, radius, height, dt);
    }
  }

  settleAgent(agent, radius, height, dt = 1 / 60) {
    if (this.world.isLadderAt(agent.pos.x, agent.pos.y + 0.2, agent.pos.z) ||
        this.world.isLadderAt(agent.pos.x, agent.pos.y + 1.2, agent.pos.z)) return;
    const ground = this.world.groundBelow(agent.pos.x, agent.pos.z, agent.pos.y + 0.5);
    if (agent.pos.y > ground) {
      agent.pos.y = Math.max(ground, agent.pos.y - 9 * dt);
    } else if (agent.pos.y < ground - 0.6) {
      agent.pos.y = ground;
    }
  }

  getSaveData() {
    return {
      cleared: this.states.filter(s => s.cleared).map(s => s.zone.index),
      allies: this.allies.map(a => a.name),
      kills: this.kills
    };
  }

  resetActiveBattle() {
    for (const e of this.enemies) this.scene.remove(e.model.group);
    this.enemies = [];
    this.boss = null;
    this.pendingVictory = -1;
    for (const s of this.states) {
      if (s.active && !s.cleared) {
        s.active = false;
        s.spawned = 0;
        s.killed = 0;
        s.alive = 0;
        s.spawnTimer = 0;
        s.roofClaims.clear();
        s.snipersSpawned = 0;
      }
    }
    this.reviveAll(0.6);
    this.updateNext();
  }

  reset() {
    for (const e of this.enemies) this.scene.remove(e.model.group);
    for (const a of this.allies) this.scene.remove(a.model.group);
    for (const r of this.recruits) this.scene.remove(r.model.group);
    this.enemies = [];
    this.allies = [];
    this.recruits = [];
    this.boss = null;
    this.victorySent = false;
    this.pendingVictory = -1;
  }
}
