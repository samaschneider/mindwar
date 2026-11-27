import * as THREE from "three";
import { ZONES, ZONE_COUNT, roadAt, nearestZone, ladderForBuilding } from "./zones.js";

export const CHUNK = 16;
export const HEIGHT = 56;
const LADDER = 52;
const RENDER_RADIUS = 8;
const BUILD_PER_FRAME = 3;

/* --------------------------------- palette -------------------------------- */
const PALETTE_HEX = {
  1: 0xc7d7d8, 2: 0xaab5ba, 3: 0x56606a, 4: 0x242b34,
  5: 0x929ba4, 6: 0x737e87, 7: 0x6d555b, 8: 0x44545f,
  9: 0x38d9ef, 10: 0xb2bcc0, 11: 0xc3ced2, 12: 0xbfd0d2,
  13: 0xa6b0b5, 14: 0x94afa9, 15: 0x6d4b3e, 16: 0x2f3a43,
  17: 0x65e9ff, 18: 0x507469, 19: 0x3a657a, 20: 0xb46cff,
  21: 0xd0d9db, 22: 0x2b3238,
  23: 0xd8dfe0, 24: 0x9fb8c8, 25: 0xa8b8a9, 26: 0x2a333d,
  27: 0x5d4a52, 28: 0xc9bd7a, 29: 0x4e6654, 30: 0xb0b9bd,
  31: 0xd3c78e, 32: 0x59755f, 33: 0x4a4842, 34: 0xd6e0e4,
  35: 0x63434a, 36: 0x684348, 37: 0xc2ced1, 38: 0x6b8794,
  39: 0x356156,
  40: 0x5fe7ff, 41: 0xff5bd5, 42: 0x1b3045,
  43: 0x242a31, 44: 0x3e8ea8, 45: 0xffb545,
  46: 0xd5e1e5, 47: 0x43e0a5, 48: 0x9c68ff,
  49: 0x1a2228, 50: 0x6f8794, 51: 0xd8e8ea,
  52: 0x8a6a3a
};
const PALETTE = [];
for (let i = 0; i < 56; i++) {
  PALETTE[i] = new THREE.Color(PALETTE_HEX[i] ?? 0x8844aa);
}

/* ------------------------- runtime block texture atlas ------------------- */
const ATLAS_TILE = 32;
const ATLAS_COLS = 8;
const ATLAS_SIZE = ATLAS_TILE * ATLAS_COLS;

function atlasRng(seed) {
  let a = seed | 0;
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function rgb(hex) { return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255]; }
function tint(hex, f) {
  const [r, g, b] = rgb(hex);
  const c = v => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c(r)},${c(g)},${c(b)})`;
}

function makeBlockAtlas() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = ATLAS_SIZE;
  const ctx = canvas.getContext("2d");

  for (let type = 1; type < 56; type++) {
    const tx = (type % ATLAS_COLS) * ATLAS_TILE;
    const ty = Math.floor(type / ATLAS_COLS) * ATLAS_TILE;
    const base = PALETTE_HEX[type] ?? 0x8844aa;
    const r = atlasRng(7301 + type * 5471);
    ctx.save();
    ctx.beginPath();
    ctx.rect(tx, ty, ATLAS_TILE, ATLAS_TILE);
    ctx.clip();
    ctx.fillStyle = tint(base, 1);
    ctx.fillRect(tx, ty, ATLAS_TILE, ATLAS_TILE);

    const px = (x, y, w, h, color, alpha = 1) => {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.fillRect(tx + x, ty + y, w, h);
      ctx.globalAlpha = 1;
    };

    // Material families. Everything is built from dark tech panels, clean
    // seams and emissive cyan/magenta accents so the nation reads as a
    // near-future occupation rather than a period war.
    const grass = [1, 12, 14].includes(type);
    const earth = [2, 10, 11, 30].includes(type);
    const stone = type === 3;
    const asphalt = type === 4 || type === 17;
    const concrete = [5, 6, 13, 21, 22, 34].includes(type);
    const brick = type === 7;
    const metal = [8, 16, 18, 19].includes(type);
    const siding = [23, 24, 25, 34, 37, 46, 51].includes(type);
    const roof = [26, 27, 35, 36, 49].includes(type);
    const windowType = type === 9;
    const rust = type === 15;
    const wheat = type === 28;
    const crop = type === 29;
    const hay = type === 31;
    const leaf = type === 32;
    const trunk = type === 33;
    const tech = type >= 40 && type !== 52;
    const ladder = type === 52;

    const neon = [40, 44, 47, 51].includes(type) ? "#5fe7ff"
      : [41, 48].includes(type) ? "#ff5bd5"
      : [45].includes(type) ? "#ffb545"
      : "#5fe7ff";

    if (grass) {
      for (let i = 0; i < 52; i++) {
        const x = Math.floor(r() * 32), y = Math.floor(r() * 32);
        px(x, y, 1, 1 + Math.floor(r() * 3), r() < 0.5 ? tint(base, 0.74) : tint(base, 1.2), 0.7);
      }
      for (let i = 0; i < 10; i++) px(Math.floor(r() * 32), Math.floor(r() * 32), 1, 1, "#f2fbff", 0.2 + r() * 0.25);
    }
    if (earth) {
      for (let i = 0; i < 44; i++) {
        const s = r() < 0.2 ? 2 : 1;
        px(Math.floor(r() * 31), Math.floor(r() * 31), s, s, r() < 0.5 ? tint(base, 0.68) : tint(base, 1.28), 0.62);
      }
      for (let i = 0; i < 9; i++) px(Math.floor(r() * 32), Math.floor(r() * 32), 1, 1, "#f2fbff", 0.18 + r() * 0.22);
    }
    if (stone) {
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = tint(base, 1.5);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tx + 2, ty + 7); ctx.lineTo(tx + 13, ty + 12); ctx.lineTo(tx + 20, ty + 23);
      ctx.moveTo(tx + 18, ty + 3); ctx.lineTo(tx + 25, ty + 9); ctx.lineTo(tx + 30, ty + 7);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (asphalt) {
      for (let i = 0; i < 105; i++) {
        px(Math.floor(r() * 32), Math.floor(r() * 32), 1, 1, r() < 0.5 ? "#04080a" : "#7c9aa4", 0.22 + r() * 0.16);
      }
      if (type === 17) {
        // Recessed light-guide stud, readable from any road direction.
        px(0, 0, 32, 32, "#1a8fa4", 0.2);
        px(9, 9, 14, 14, "#0b2228", 0.85);
        px(11, 11, 10, 10, "#2fb9cc", 0.8);
        px(13, 13, 6, 6, "#5fe7ff", 0.85);
        px(15, 15, 2, 2, "#e6ffff", 0.9);
        for (let i = 0; i < 12; i++) px(9 + Math.floor(r() * 14), 9 + Math.floor(r() * 14), 1, 1, "#061416", 0.3);
      } else {
        // Embedded road studs every few blocks.
        px(1, 14, 2, 2, "#6fe8ff", 0.2);
        px(29, 14, 2, 2, "#6fe8ff", 0.2);
      }
    }
    if (concrete) {
      // Segmented composite panels with a thin glowing seam.
      ctx.globalAlpha = 0.75;
      ctx.strokeStyle = tint(base, 0.62);
      ctx.strokeRect(tx + 0.5, ty + 0.5, 31, 31);
      ctx.globalAlpha = 1;
      px(0, 15, 32, 1, tint(base, 0.58), 0.7);
      for (let x = 0; x < 32; x += 16) px(x, 0, 1, 32, tint(base, 0.66), 0.5);
      for (const [x, y] of [[2, 2], [29, 2], [2, 29], [29, 29]]) {
        px(x, y, 2, 2, tint(base, 1.4), 0.55);
        px(x + 1, y + 1, 1, 1, "#111a20", 0.45);
      }
      // Circuit trace.
      px(6, 23, 7, 1, neon, 0.34);
      px(12, 23, 1, 4, neon, 0.34);
      px(19, 7, 8, 1, neon, 0.28);
      px(19, 7, 1, 5, neon, 0.28);
      for (let i = 0; i < 18; i++) px(Math.floor(r() * 32), Math.floor(r() * 32), 1, 1, r() < 0.5 ? tint(base, 0.7) : tint(base, 1.16), 0.35);
    }
    if (brick) {
      // Dark modular masonry with luminous mortar joints.
      const mortar = "#0c1418";
      for (let y = 0; y < 32; y += 8) {
        px(0, y, 32, 1, mortar, 0.9);
        px(0, y + 1, 32, 1, neon, 0.12);
        const off = (y / 8) % 2 ? 8 : 0;
        for (let x = off; x < 32; x += 16) px(x, y + 1, 1, 7, mortar, 0.85);
      }
      for (let i = 0; i < 20; i++) px(Math.floor(r() * 32), Math.floor(r() * 32), 2, 1, tint(base, r() < 0.5 ? 0.76 : 1.2), 0.45);
    }
    if (metal) {
      for (let i = 0; i < 34; i++) px(0, Math.floor(r() * 32), 32, 1, r() < 0.5 ? "#04090c" : "#cfe9ef", 0.07 + r() * 0.07);
      const rivet = tint(base, 1.55);
      for (const [x, y] of [[2, 2], [29, 2], [2, 29], [29, 29], [15, 2], [15, 29]]) {
        px(x, y, 2, 2, rivet, 0.85);
        px(x + 1, y + 1, 1, 1, "#0b1116", 0.55);
      }
      px(3, 15, 26, 1, "#5fe7ff", 0.36);
      px(3, 17, 26, 1, "#5fe7ff", 0.16);
      px(16, 0, 1, 8, tint(base, 0.52), 0.6);
    }
    if (windowType) {
      // Tall illuminated glazing with a hard chrome frame.
      px(0, 0, 32, 32, "#061a20", 1);
      const g = ctx.createLinearGradient(tx, ty + 32, tx + 32, ty);
      g.addColorStop(0, "rgba(44,208,232,0.92)");
      g.addColorStop(0.45, "rgba(168,250,255,0.7)");
      g.addColorStop(1, "rgba(20,84,104,0.95)");
      ctx.fillStyle = g;
      ctx.fillRect(tx + 3, ty + 3, 26, 26);
      ctx.strokeStyle = "#051216";
      ctx.lineWidth = 3;
      ctx.strokeRect(tx + 1.5, ty + 1.5, 29, 29);
      px(16, 3, 1, 26, "#0a2933", 0.9);
      px(5, 6, 8, 2, "#e8ffff", 0.45);
      px(19, 23, 8, 2, "#bffcff", 0.22);
    }
    if (rust) {
      for (let i = 0; i < 38; i++) px(Math.floor(r() * 32), Math.floor(r() * 32), 1 + Math.floor(r() * 4), 1 + Math.floor(r() * 3), r() < 0.6 ? "#3b2118" : "#c0693d", 0.25 + r() * 0.25);
      for (let i = 0; i < 6; i++) px(Math.floor(r() * 32), Math.floor(r() * 32), 1, 1, "#ffb545", 0.18 + r() * 0.2);
    }
    if (siding) {
      for (let y = 3; y < 32; y += 6) {
        px(0, y, 32, 1, tint(base, 0.62), 0.7);
        px(0, y + 1, 32, 1, tint(base, 1.16), 0.35);
      }
      px(0, 15, 32, 1, neon, 0.14);
      for (let i = 0; i < 9; i++) px(Math.floor(r() * 32), Math.floor(r() * 32), 1, 1, tint(base, 0.82), 0.4);
    }
    if (roof) {
      // Solar tile grid.
      for (let y = 0; y < 32; y += 6) {
        px(0, y, 32, 1, "#050a0d", 0.9);
        for (let x = (y / 6) % 2 ? 5 : 0; x < 32; x += 10) px(x, y + 1, 1, 5, "#050a0d", 0.75);
      }
      for (let y = 2; y < 32; y += 6) px(0, y, 32, 1, "#3b9fb5", 0.16);
      for (let i = 0; i < 12; i++) px(Math.floor(r() * 32), Math.floor(r() * 32), 2, 1, tint(base, r() < 0.5 ? 0.8 : 1.18), 0.35);
      // Wind-blown snow caught between the solar tiles.
      for (let i = 0; i < 15; i++) px(Math.floor(r() * 30), Math.floor(r() * 32), 2 + Math.floor(r() * 4), 1, "#eef7fb", 0.18 + r() * 0.22);
    }
    if (wheat) {
      for (let x = 1; x < 32; x += 3) {
        px(x, 3 + Math.floor(r() * 8), 1, 24, "#d8b24a", 0.62);
        px(x - 1, 8 + Math.floor(r() * 8), 3, 1, "#ffe27a", 0.7);
      }
      for (let i = 0; i < 8; i++) px(Math.floor(r() * 32), Math.floor(r() * 32), 1, 2, "#f2fbff", 0.24);
    }
    if (crop) {
      for (let i = 0; i < 40; i++) {
        const x = Math.floor(r() * 32), y = Math.floor(r() * 32);
        px(x, y, 1, 3, r() < 0.5 ? "#2f5a3e" : "#93c477", 0.72);
      }
      for (let x = 2; x < 32; x += 8) px(x, 0, 1, 32, "#5fe7ff", 0.1);
    }
    if (hay) {
      for (let y = 2; y < 32; y += 4) px(0, y, 32, 1, "#ffd86b", 0.45);
      for (let i = 0; i < 24; i++) px(Math.floor(r() * 32), Math.floor(r() * 32), 2 + Math.floor(r() * 4), 1, r() < 0.5 ? "#6b5526" : "#ffe28a", 0.5);
      px(0, 12, 32, 2, "#26313a", 0.8);
      px(0, 24, 32, 2, "#26313a", 0.8);
    }
    if (leaf) {
      for (let i = 0; i < 50; i++) {
        const s = 2 + Math.floor(r() * 4);
        px(Math.floor(r() * 30), Math.floor(r() * 30), s, s, r() < 0.5 ? tint(base, 0.66) : tint(base, 1.3), 0.55);
      }
      for (let i = 0; i < 7; i++) px(Math.floor(r() * 32), Math.floor(r() * 32), 1, 1, "#f2fbff", 0.22);
    }
    if (trunk) {
      for (let x = 2; x < 32; x += 5) {
        px(x, 0, 1, 32, tint(base, 0.52), 0.65);
        px(x + 2, 0, 1, 32, tint(base, 1.2), 0.3);
      }
      px(0, 0, 32, 2, "#eef7fb", 0.4);
      px(14, 0, 1, 32, "#5fe7ff", 0.07);
    }
    if (type === 20) {
      px(0, 4, 32, 2, "#e0b4ff", 0.62);
      px(0, 18, 32, 1, "#6f36a0", 0.75);
      for (let i = 0; i < 18; i++) px(Math.floor(r() * 32), Math.floor(r() * 32), 1, 1, "#f0d6ff", 0.45);
    }
    if (tech) {
      // Dedicated neon accent panels used by the city palettes.
      ctx.globalAlpha = 0.28;
      ctx.strokeStyle = tint(base, 0.6);
      ctx.strokeRect(tx + 0.5, ty + 0.5, 31, 31);
      ctx.globalAlpha = 1;
      if (type % 3 === 0) {
        px(0, 6, 32, 3, neon, 0.85);
        px(0, 7, 32, 1, "#ffffff", 0.45);
      } else if (type % 3 === 1) {
        px(13, 0, 6, 32, tint(base, 1.3), 0.45);
        px(15, 0, 2, 32, neon, 0.8);
      } else {
        px(0, 26, 32, 1, neon, 0.7);
        px(5, 9, 1, 12, neon, 0.55);
        px(6, 9, 8, 1, neon, 0.55);
      }
      for (let i = 0; i < 10; i++) px(Math.floor(r() * 32), Math.floor(r() * 32), 1, 1, "#ffffff", 0.08 + r() * 0.1);
    }

    if (ladder) {
      // Industrial wall ladder: two rails and evenly spaced rungs.
      px(0, 0, 32, 32, "#5a4228", 0.75);
      px(8, 0, 3, 32, "#d9b06a", 0.95);
      px(21, 0, 3, 32, "#d9b06a", 0.95);
      for (let y = 2; y < 32; y += 6) px(8, y, 16, 3, "#efd091", 0.95);
      px(9, 0, 1, 32, "#fff0c0", 0.35);
      px(22, 0, 1, 32, "#fff0c0", 0.28);
      px(0, 0, 2, 32, "#241a10", 0.35);
      px(30, 0, 2, 32, "#241a10", 0.35);
    }

    // Fine surface noise over everything.
    for (let i = 0; i < 26; i++) {
      px(Math.floor(r() * 32), Math.floor(r() * 32), 1, 1, r() < 0.5 ? "#000" : "#fff", 0.04 + r() * 0.04);
    }
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  // Soft filtering and mipmaps keep block faces from reading as hard,
  // separate swatches at a distance.
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

const BLOCK_ATLAS = makeBlockAtlas();

function makeDistantSurface() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d");
  const rnd = (() => { let s = 4127; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
  ctx.fillStyle = "#1b2730";
  ctx.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = rnd() < 0.5 ? "rgba(4,10,14,.3)" : "rgba(120,210,228,.12)";
    ctx.fillRect(Math.floor(rnd() * 64), Math.floor(rnd() * 64), 1 + Math.floor(rnd() * 3), 1);
  }
  for (let y = 8; y < 64; y += 16) {
    ctx.fillStyle = "rgba(95,231,255,.12)";
    ctx.fillRect(0, y, 64, 1);
    for (let x = (y / 16) % 2 ? 6 : 0; x < 64; x += 14) {
      ctx.fillStyle = "rgba(120,240,255,.16)";
      ctx.fillRect(x, y - 5, 2, 5);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
const DISTANT_TEXTURE = makeDistantSurface();

const FACES = [
  { dir: [1, 0, 0], corners: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], shade: 0.74 },
  { dir: [-1, 0, 0], corners: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], shade: 0.66 },
  { dir: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], shade: 1.0 },
  { dir: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], shade: 0.45 },
  { dir: [0, 0, 1], corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], shade: 0.86 },
  { dir: [0, 0, -1], corners: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], shade: 0.78 }
];

// Ladders are thin wall-mounted plates, not full cubes: 4 cm deep, about
// two-thirds of a cell wide. The climb volume is still the whole cell, so
// they remain easy to grab without a metre of geometry filling the view.
const LADDER_PANEL_DEPTH = 0.04;
const LADDER_PANEL_WIDTH = 0.62;
const LADDER_PANEL_GAP = 0.015;
const LADDER_SIDES = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function hash2(x, z, seed = 0) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263) + Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function hash3(x, y, z) {
  return hash2(x * 31 + y * 17, z * 13 + y * 7, 913);
}
function smooth(t) { return t * t * (3 - 2 * t); }
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const xf = smooth(x - xi), zf = smooth(z - zi);
  const a = hash2(xi, zi), b = hash2(xi + 1, zi);
  const c = hash2(xi, zi + 1), d = hash2(xi + 1, zi + 1);
  return (a + (b - a) * xf) * (1 - zf) + (c + (d - c) * xf) * zf;
}

export function terrainHeight(x, z) {
  const road = roadAt(x, z);
  if (road) return 3;
  const nz = nearestZone(x, z);
  if (nz.dist < 96) return 3;
  const n = vnoise(x * 0.021, z * 0.021) * 0.72 + vnoise(x * 0.061, z * 0.061) * 0.28;
  return 2 + Math.floor(n * 3.6);
}

export class World {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = "voxel-world";
    scene.add(this.group);

    this.data = new Map();
    this.meshes = new Map();
    this.chunkMaterial = new THREE.MeshBasicMaterial({ map: BLOCK_ATLAS, vertexColors: true, fog: true });
    this.propIndex = new Map();
    this.markerGroup = new THREE.Group();
    this.markerGroup.name = "beacons";
    scene.add(this.markerGroup);
    this.markers = [];
    this.markerTimer = 0;
    this.frame = 0;
    this.nextZone = 0;
    this.activeZone = -1;

    this.buildPropIndex();
    this.createZoneMarkers();
    this.lockBarrier = this.createLockBarrier();
    this.createSkyline();
    this.createDust();
    this.createSnow();
  }

  /* ------------------------------ structure index ------------------------- */
  buildPropIndex() {
    const add = (x0, z0, x1, z1, prop) => {
      const cx0 = Math.floor(x0 / CHUNK), cx1 = Math.floor(x1 / CHUNK);
      const cz0 = Math.floor(z0 / CHUNK), cz1 = Math.floor(z1 / CHUNK);
      for (let cx = cx0; cx <= cx1; cx++) {
        for (let cz = cz0; cz <= cz1; cz++) {
          const key = cx + "," + cz;
          let arr = this.propIndex.get(key);
          if (!arr) { arr = []; this.propIndex.set(key, arr); }
          arr.push(prop);
        }
      }
    };
    for (const zone of ZONES) {
      for (const p of zone.props) {
        if (p.kind === "building") add(p.x0 - 1, p.z0 - 1, p.x0 + p.w + 1, p.z0 + p.d + 1, p);
        else if (p.kind === "tree") add(p.x - 2, p.z - 2, p.x + 2, p.z + 2, p);
        else add(p.x0 - 1, p.z0 - 1, p.x0 + p.sx + 1, p.z0 + p.sz + 1, p);
      }
    }
  }

  /* --------------------------------- chunks -------------------------------- */
  chunkKey(cx, cz) { return cx + "," + cz; }

  getChunkData(cx, cz) {
    const key = this.chunkKey(cx, cz);
    let data = this.data.get(key);
    if (data) return data;
    data = new Uint8Array(CHUNK * CHUNK * HEIGHT);
    this.generateChunk(data, cx, cz);
    this.data.set(key, data);
    return data;
  }

  generateChunk(data, cx, cz) {
    const wx0 = cx * CHUNK, wz0 = cz * CHUNK;
    const idx = (x, y, z) => y * 256 + z * 16 + x;

    for (let z = 0; z < CHUNK; z++) {
      for (let x = 0; x < CHUNK; x++) {
        const wx = wx0 + x, wz = wz0 + z;
        const h = terrainHeight(wx, wz);
        const road = roadAt(wx, wz);
        const nz = nearestZone(wx, wz);
        const region = nz.zone.region;
        const plaza = nz.dist < 96;
        const pad = nz.dist < 4.6;

        for (let y = 0; y <= h; y++) {
          let c;
          if (y === h) {
            if (road === 2) c = 17;
            else if (road === 1) c = 4;
            else if (road === 3) c = 30;
            else if (pad) c = 13;
            else if (plaza) {
              if (region === "farm") {
                const patch = hash2(Math.floor(wx / 4), Math.floor(wz / 4), 171);
                c = patch < 0.44 ? 2 : patch < 0.72 ? 30 : patch < 0.9 ? 12 : patch < 0.97 ? 5 : 31;
              } else if (region === "suburb") {
                const patch = hash2(Math.floor(wx / 3), Math.floor(wz / 3), 201);
                c = patch < 0.38 ? 1 : patch < 0.66 ? 12 : patch < 0.82 ? 14 : patch < 0.94 ? 13 : 2;
              } else {
                const patch = hash2(Math.floor(wx / 2), Math.floor(wz / 2), 77);
                c = patch < 0.38 ? 5 : patch < 0.68 ? 6 : patch < 0.94 ? 13 : patch < 0.97 ? 4 : 2;
              }
            } else if (region === "farm" && nz.dist < 330) {
              if (nz.dist < 128) {
                const patch = hash2(Math.floor(wx / 4), Math.floor(wz / 4), 173);
                c = patch < 0.34 ? 2 : patch < 0.6 ? 30 : patch < 0.82 ? 12 : patch < 0.94 ? 5 : 31;
              } else {
                const field = hash2(Math.floor(wx / 31), Math.floor(wz / 31), 51);
                if (field < 0.76) {
                  const row = Math.abs(Math.floor(wx / 4) + Math.floor(wz / 4)) % 8;
                  c = row < 4 ? 28 : row < 7 ? 29 : 30;
                } else {
                  const patch = hash2(Math.floor(wx / 3), Math.floor(wz / 3), 91);
                  c = patch < 0.34 ? 12 : patch < 0.66 ? 1 : patch < 0.84 ? 10 : 2;
                }
              }
            } else if (region === "suburb" && nz.dist < 235) {
              const patch = hash2(Math.floor(wx / 3), Math.floor(wz / 3), 211);
              c = patch < 0.4 ? 1 : patch < 0.66 ? 12 : patch < 0.8 ? 14 : patch < 0.92 ? 13 : 2;
            } else if (region === "city" && nz.dist < 225) {
              const patch = hash2(Math.floor(wx / 2), Math.floor(wz / 2), 221);
              c = patch < 0.38 ? 5 : patch < 0.68 ? 6 : patch < 0.94 ? 13 : patch < 0.97 ? 4 : 2;
            } else {
              const patch = hash2(Math.floor(wx / 3), Math.floor(wz / 3), 91);
              c = patch < 0.32 ? 10 : patch < 0.6 ? 11 : patch < 0.86 ? 12 : patch < 0.94 ? 1 : 2;
            }
          } else if (y === h - 1) {
            c = road || plaza ? (road === 3 ? 2 : 6) : 2;
          } else {
            c = hash2(wx + y, wz - y, 3) < 0.08 ? 16 : 3;
          }
          data[idx(x, y, z)] = c;
        }

      }
    }

    const props = this.propIndex.get(this.chunkKey(cx, cz));
    if (props) {
      for (const p of props) {
        if (p.kind === "building") this.carveBuilding(data, p, wx0, wz0);
        else if (p.kind === "tree") this.applyTree(data, p, wx0, wz0);
        else this.applyBox(data, p, wx0, wz0);
      }
    }
  }

  carveBuilding(data, b, wx0, wz0) {
    const idx = (x, y, z) => y * 256 + z * 16 + x;
    // The ladder stands just outside the footprint, which is often in a
    // different chunk than the building itself. Place it before the
    // intersection test so the neighbouring chunk still builds it.
    const ladder = ladderForBuilding(b);
    if (ladder) {
      const lastRung = b.roofStyle === "flat" ? b.base + b.h + 1 : b.base + b.h + 2;
      for (let y = ladder.base; y <= lastRung && y < HEIGHT; y++) {
        if (y < 0 || ladder.x < wx0 || ladder.x >= wx0 + 16 || ladder.z < wz0 || ladder.z >= wz0 + 16) continue;
        data[idx(ladder.x - wx0, y, ladder.z - wz0)] = 52;
      }
    }
    const xStart = Math.max(b.x0, wx0), xEnd = Math.min(b.x0 + b.w - 1, wx0 + 15);
    const zStart = Math.max(b.z0, wz0), zEnd = Math.min(b.z0 + b.d - 1, wz0 + 15);
    if (xStart > xEnd || zStart > zEnd) return;
    const base = b.base;
    const top = base + b.h;
    const doorW = Math.max(1, b.doorWidth || 3);
    const doorStartX = b.x0 + Math.floor(b.w / 2) - Math.floor(doorW / 2);
    const doorStartZ = b.z0 + Math.floor(b.d / 2) - Math.floor(doorW / 2);
    const roofStyle = b.roofStyle || "flat";
    const city = b.windowDensity === "city";
    const house = b.buildingType === "house" || b.buildingType === "farmhouse";
    const noWindows = b.windowDensity === "none";
    const windowEvery = city ? 3 : house ? 4 : 5;
    const rowEvery = city ? 3 : house ? 4 : 5;
    const doorHeight = b.buildingType === "barn" ? 4 : 3;

    const put = (wx, y, wz, c) => {
      if (wx < wx0 || wx >= wx0 + 16 || wz < wz0 || wz >= wz0 + 16 || y < 0 || y >= HEIGHT) return;
      data[idx(wx - wx0, y, wz - wz0)] = c;
    };

    for (let wz = zStart; wz <= zEnd; wz++) {
      for (let wx = xStart; wx <= xEnd; wx++) {
        const lx = wx - wx0, lz = wz - wz0;
        const px = wx - b.x0, pz = wz - b.z0;
        const perim = px === 0 || px === b.w - 1 || pz === 0 || pz === b.d - 1;
        const door = (b.doorSide === "west" || b.doorSide === "east")
          ? (pz >= doorStartZ - b.z0 && pz < doorStartZ - b.z0 + doorW &&
             ((b.doorSide === "west" && px === 0) || (b.doorSide === "east" && px === b.w - 1)))
          : (px >= doorStartX - b.x0 && px < doorStartX - b.x0 + doorW &&
             ((b.doorSide === "north" && pz === 0) || (b.doorSide === "south" && pz === b.d - 1)));

        data[idx(lx, base - 1, lz)] = b.wall;

        if (perim) {
          const along = (px === 0 || px === b.w - 1) ? pz : px;
          for (let y = base; y < top; y++) {
            if (door && y < base + doorHeight) continue;
            if (hash3(wx, y, wz) < b.ruin * 0.055) continue;
            let c = b.wall;
            const band = (y - base) % 6;
            if (band === 0 && !house) c = b.accent;
            const windowRow = (y - base) >= 3 && (y - base) % rowEvery === 0;
            if (!noWindows && windowRow && along % windowEvery === 1 && hash3(wx, y * 3, wz) > 0.2) c = b.window;
            data[idx(lx, y, lz)] = c;
          }
        }
        // Solid roof/ceiling over the whole footprint.
        data[idx(lx, top, lz)] = b.roof;
      }
    }

    // Pitched roofs above the solid ceiling.
    if (roofStyle === "hip") {
      const layers = Math.min(4, Math.floor(Math.min(b.w, b.d) / 2));
      for (let k = 1; k <= layers; k++) {
        const inset = k;
        for (let wx = b.x0 + inset; wx <= b.x0 + b.w - 1 - inset; wx++) {
          for (let wz = b.z0 + inset; wz <= b.z0 + b.d - 1 - inset; wz++) {
            if (k === layers || hash3(wx, top + k, wz) > b.ruin * 0.18) {
              put(wx, top + k, wz, k === layers ? b.trim : b.roof);
            }
          }
        }
      }
    } else if (roofStyle === "gable") {
      const alongX = b.w >= b.d;
      const span = alongX ? b.w : b.d;
      const half = Math.floor(span / 2);
      for (let e = 0; e < span; e++) {
        const edge = Math.min(e, span - 1 - e);
        const lift = Math.min(4, Math.floor(edge * 0.7)) + 1;
        if (alongX) {
          const wx = b.x0 + e;
          for (let wz = b.z0; wz < b.z0 + b.d; wz++) {
            if (hash3(wx, top + lift, wz) < b.ruin * 0.1) continue;
            put(wx, top + lift, wz, b.roof);
          }
          for (let y = top + 1; y < top + lift; y++) {
            put(wx, y, b.z0, b.roof);
            put(wx, y, b.z0 + b.d - 1, b.roof);
          }
        } else {
          const wz = b.z0 + e;
          for (let wx = b.x0; wx < b.x0 + b.w; wx++) {
            if (hash3(wx, top + lift, wz) < b.ruin * 0.1) continue;
            put(wx, top + lift, wz, b.roof);
          }
          for (let y = top + 1; y < top + lift; y++) {
            put(b.x0, y, wz, b.roof);
            put(b.x0 + b.w - 1, y, wz, b.roof);
          }
        }
        if (edge === half) put(alongX ? b.x0 + e : b.x0 + Math.floor(b.w / 2), top + lift, alongX ? b.z0 + Math.floor(b.d / 2) : b.z0 + e, b.trim);
      }
    }

    // Flat-roof parapets. The inner roof remains a clean sniper platform.
    if (roofStyle === "flat" && (b.parapet || b.buildingType === "silo")) {
      for (let wx = b.x0; wx < b.x0 + b.w; wx++) {
        put(wx, top + 1, b.z0, b.trim);
        put(wx, top + 1, b.z0 + b.d - 1, b.trim);
      }
      for (let wz = b.z0; wz < b.z0 + b.d; wz++) {
        put(b.x0, top + 1, wz, b.trim);
        put(b.x0 + b.w - 1, top + 1, wz, b.trim);
      }
    }

    // Corner trim pillars.
    for (const [cx, cz] of [[b.x0, b.z0], [b.x0 + b.w - 1, b.z0], [b.x0, b.z0 + b.d - 1], [b.x0 + b.w - 1, b.z0 + b.d - 1]]) {
      if (cx < wx0 || cx >= wx0 + 16 || cz < wz0 || cz >= wz0 + 16) continue;
      for (let y = base; y <= top; y++) data[idx(cx - wx0, y, cz - wz0)] = b.accent;
    }

    // Clear the parapet where the ladder reaches the roof.
    if (ladder && roofStyle === "flat" && (b.parapet || b.buildingType === "silo")) {
      put(ladder.roofX, top + 1, ladder.roofZ, 0);
    }
  }

  applyTree(data, p, wx0, wz0) {
    const idx = (x, y, z) => y * 256 + z * 16 + x;
    const base = p.base || 4;
    const trunkH = p.h || 5;
    const set = (wx, y, wz, c) => {
      if (wx < wx0 || wx >= wx0 + 16 || wz < wz0 || wz >= wz0 + 16 || y < 0 || y >= HEIGHT) return;
      data[idx(wx - wx0, y, wz - wz0)] = c;
    };
    for (let y = base; y < base + trunkH; y++) set(p.x, y, p.z, p.trunk || 33);
    const leaf = p.leaf || 32;
    const crown = base + trunkH - 1;
    for (let dy = -1; dy <= 2; dy++) {
      const radius = dy < 1 ? 2 : dy === 1 ? 1 : 0;
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
          set(p.x + dx, crown + dy, p.z + dz, leaf);
        }
      }
    }
    set(p.x, base + trunkH + 1, p.z, leaf);
  }

  applyBox(data, p, wx0, wz0) {
    const idx = (x, y, z) => y * 256 + z * 16 + x;
    const x0 = Math.max(p.x0, wx0), x1 = Math.min(p.x0 + p.sx - 1, wx0 + 15);
    const z0 = Math.max(p.z0, wz0), z1 = Math.min(p.z0 + p.sz - 1, wz0 + 15);
    const y0 = p.y0, y1 = p.y0 + p.sy - 1;
    if (x0 > x1 || z0 > z1) return;
    for (let y = y0; y <= y1; y++) {
      for (let z = z0; z <= z1; z++) {
        for (let x = x0; x <= x1; x++) {
          const top = y === y1;
          const rim = x === x0 || x === x1 || z === z0 || z === z1;
          data[idx(x - wx0, y, z - wz0)] = top && rim ? p.top : p.color;
        }
      }
    }
  }

  getBlock(x, y, z) {
    if (y < 0) return 3;
    if (y >= HEIGHT) return 0;
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    const lx = x - cx * CHUNK, lz = z - cz * CHUNK;
    const data = this.getChunkData(cx, cz);
    return data[y * 256 + lz * 16 + lx];
  }

  isLadderAt(x, y, z) {
    return this.getBlock(Math.floor(x), Math.floor(y), Math.floor(z)) === LADDER;
  }

  isSolid(x, y, z) {
    const b = this.getBlock(Math.floor(x), Math.floor(y), Math.floor(z));
    return b !== 0 && b !== LADDER;
  }

  collidesBox(x, y, z, radius, height) {
    const minX = Math.floor(x - radius + 0.001), maxX = Math.floor(x + radius - 0.001);
    const minZ = Math.floor(z - radius + 0.001), maxZ = Math.floor(z + radius - 0.001);
    const minY = Math.floor(y + 0.01), maxY = Math.floor(y + height - 0.01);
    for (let by = minY; by <= maxY; by++) {
      for (let bz = minZ; bz <= maxZ; bz++) {
        for (let bx = minX; bx <= maxX; bx++) {
          const b = this.getBlock(bx, by, bz);
          if (b && b !== LADDER) return true;
        }
      }
    }
    return false;
  }

  surfaceY(x, z) {
    const bx = Math.floor(x), bz = Math.floor(z);
    const cx = Math.floor(bx / CHUNK), cz = Math.floor(bz / CHUNK);
    const lx = bx - cx * CHUNK, lz = bz - cz * CHUNK;
    const data = this.getChunkData(cx, cz);
    for (let y = HEIGHT - 1; y >= 0; y--) {
      const b = data[y * 256 + lz * 16 + lx];
      if (b && b !== LADDER) return y + 1;
    }
    return 1;
  }

  ladderTop(x, z) {
    const bx = Math.floor(x), bz = Math.floor(z);
    const cx = Math.floor(bx / CHUNK), cz = Math.floor(bz / CHUNK);
    const lx = bx - cx * CHUNK, lz = bz - cz * CHUNK;
    const data = this.getChunkData(cx, cz);
    for (let y = HEIGHT - 1; y >= 0; y--) {
      if (data[y * 256 + lz * 16 + lx] === LADDER) return y;
    }
    return null;
  }

  groundBelow(x, z, fromY) {
    const bx = Math.floor(x), bz = Math.floor(z);
    const cx = Math.floor(bx / CHUNK), cz = Math.floor(bz / CHUNK);
    const lx = bx - cx * CHUNK, lz = bz - cz * CHUNK;
    const data = this.getChunkData(cx, cz);
    const start = Math.min(HEIGHT - 1, Math.max(0, Math.ceil(fromY)));
    for (let y = start; y >= 0; y--) {
      const b = data[y * 256 + lz * 16 + lx];
      if (b && b !== LADDER) return y + 1;
    }
    return 1;
  }

  /* --------------------------------- meshing ------------------------------- */
  buildChunkMesh(cx, cz) {
    const key = this.chunkKey(cx, cz);
    if (this.meshes.has(key)) return;
    const data = this.getChunkData(cx, cz);
    // Make sure edge data exists so chunk seams are closed.
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) this.getChunkData(cx + dx, cz + dz);
    }

    const positions = [];
    const normals = [];
    const colors = [];
    const uvs = [];
    const indices = [];
    let vcount = 0;
    const wx0 = cx * CHUNK, wz0 = cz * CHUNK;
    const eps = 0.0007;

    for (let y = 0; y < HEIGHT; y++) {
      for (let z = 0; z < CHUNK; z++) {
        for (let x = 0; x < CHUNK; x++) {
          const c = data[y * 256 + z * 16 + x];
          if (!c) continue;
          const wx = wx0 + x, wz = wz0 + z;
          const jitter = 0.97 + hash3(wx, y, wz) * 0.06;
          const col = c % ATLAS_COLS;
          const row = Math.floor(c / ATLAS_COLS);
          const u0 = col / ATLAS_COLS + eps;
          const u1 = (col + 1) / ATLAS_COLS - eps;
          const v0 = 1 - (row + 1) / ATLAS_COLS + eps;
          const v1 = 1 - row / ATLAS_COLS - eps;
          const faceUV = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];

          if (c === LADDER) {
            // Find the wall this ladder is mounted on. The top rung can sit
            // above the roof, so look a few blocks down for the building face.
            let sideX = 0, sideZ = 0;
            for (let back = 0; back <= 6 && !sideX && !sideZ; back++) {
              for (const [sx, sz] of LADDER_SIDES) {
                const nb = this.getBlock(wx + sx, y - back, wz + sz);
                if (nb && nb !== LADDER) { sideX = sx; sideZ = sz; break; }
              }
            }
            if (sideX || sideZ) {
              const halfW = LADDER_PANEL_WIDTH / 2;
              const localX = x + 0.5, localZ = z + 0.5;
              let bx0, bx1, bz0, bz1;
              if (sideX) {
                const wall = x + (sideX > 0 ? 1 : 0);
                const inner = wall - sideX * LADDER_PANEL_GAP;
                const outer = inner - sideX * LADDER_PANEL_DEPTH;
                bx0 = Math.min(inner, outer); bx1 = Math.max(inner, outer);
                bz0 = localZ - halfW; bz1 = localZ + halfW;
              } else {
                const wall = z + (sideZ > 0 ? 1 : 0);
                const inner = wall - sideZ * LADDER_PANEL_GAP;
                const outer = inner - sideZ * LADDER_PANEL_DEPTH;
                bz0 = Math.min(inner, outer); bz1 = Math.max(inner, outer);
                bx0 = localX - halfW; bx1 = localX + halfW;
              }
              for (const face of FACES) {
                const shade = face.shade * jitter;
                for (let k = 0; k < 4; k++) {
                  const corner = face.corners[k];
                  positions.push(bx0 + corner[0] * (bx1 - bx0), y + corner[1], bz0 + corner[2] * (bz1 - bz0));
                  normals.push(...face.dir);
                  colors.push(shade, shade, shade);
                  uvs.push(faceUV[k][0], faceUV[k][1]);
                }
                indices.push(vcount, vcount + 1, vcount + 2, vcount, vcount + 2, vcount + 3);
                vcount += 4;
              }
            }
            continue;
          }

          for (const face of FACES) {
            const nx = wx + face.dir[0], ny = y + face.dir[1], nz = wz + face.dir[2];
            const neighbor = this.getBlock(nx, ny, nz);
            // Ladder cells are thin plates now, so they must not hide the wall
            // behind them.
            if (neighbor && neighbor !== LADDER) continue;
            const shade = face.shade * jitter;
            for (let k = 0; k < 4; k++) {
              const corner = face.corners[k];
              positions.push(corner[0] + x, corner[1] + y, corner[2] + z);
              normals.push(...face.dir);
              colors.push(shade, shade, shade);
              uvs.push(faceUV[k][0], faceUV[k][1]);
            }
            indices.push(vcount, vcount + 1, vcount + 2, vcount, vcount + 2, vcount + 3);
            vcount += 4;
          }
        }
      }
    }

    if (vcount === 0) { this.meshes.set(key, null); return; }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, this.chunkMaterial);
    mesh.position.set(wx0, 0, wz0);
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    this.group.add(mesh);
    this.meshes.set(key, mesh);
  }

  update(camera, dt = 0.016) {
    this.frame++;
    const pcx = Math.floor(camera.position.x / CHUNK);
    const pcz = Math.floor(camera.position.z / CHUNK);

    // Collect missing chunks nearest-first.
    const need = [];
    for (let dx = -RENDER_RADIUS; dx <= RENDER_RADIUS; dx++) {
      for (let dz = -RENDER_RADIUS; dz <= RENDER_RADIUS; dz++) {
        if (dx * dx + dz * dz > RENDER_RADIUS * RENDER_RADIUS + 2) continue;
        const cx = pcx + dx, cz = pcz + dz;
        const key = this.chunkKey(cx, cz);
        if (!this.meshes.has(key)) need.push({ cx, cz, d: dx * dx + dz * dz });
      }
    }
    need.sort((a, b) => a.d - b.d);
    let built = 0;
    for (const n of need) {
      if (built >= BUILD_PER_FRAME) break;
      this.buildChunkMesh(n.cx, n.cz);
      built++;
    }

    // Unload distant meshes.
    for (const [key, mesh] of this.meshes) {
      const [cx, cz] = key.split(",").map(Number);
      const d2 = (cx - pcx) ** 2 + (cz - pcz) ** 2;
      if (d2 > (RENDER_RADIUS + 2) ** 2) {
        if (mesh) {
          this.group.remove(mesh);
          mesh.geometry.dispose();
        }
        this.meshes.delete(key);
      }
    }

    // Distance fog / streaming cleanup for raw data.
    if (this.frame % 90 === 0) {
      for (const key of this.data.keys()) {
        const [cx, cz] = key.split(",").map(Number);
        const d2 = (cx - pcx) ** 2 + (cz - pcz) ** 2;
        if (d2 > (RENDER_RADIUS + 4) ** 2) this.data.delete(key);
      }
    }

    this.markerTimer -= dt;
    if (this.markerTimer <= 0) {
      this.markerTimer = 0.18;
      for (const m of this.markers) {
        const d = Math.hypot(camera.position.x - m.zone.x, camera.position.z - m.zone.z);
        const visible = d < 620;
        m.beam.visible = visible && d > 2;
        m.beam2.visible = visible && d > 2;
        m.ring.visible = d < 190;
        m.label.visible = visible && d < 480 && (d > 42 || m.zone.isBoss);
        const active = m.zone.index === this.activeZone;
        const next = m.zone.index === this.nextZone;
        const locked = !active && !next && m.zone.index > this.nextZone;
        if (!m.cleared) {
          const target = locked ? 0.045 : m.zone.isBoss ? 0.32 : active ? 0.35 : next ? 0.24 : 0.1;
          m.beam.material.opacity = target;
          m.beam2.material.opacity = target * 0.32;
          m.ring.material.opacity = locked ? 0.13 : active || next ? 0.85 : 0.4;
          m.label.material.opacity = locked ? 0.18 : active || next ? 1 : 0.62;
        }
      }
    }

    if (this.lockBarrier && this.lockBarrier.group.visible) {
      const pulse = Math.sin(performance.now() * 0.003) * 0.045;
      this.lockBarrier.wall.material.opacity = 0.2 + pulse;
      this.lockBarrier.ring.material.opacity = 0.32 + pulse;
    }
    this.updateDust(camera, dt);
    this.updateSnow(camera, dt);
  }

  raycast(origin, dir, maxDist) {
    let x = Math.floor(origin.x), y = Math.floor(origin.y), z = Math.floor(origin.z);
    const stepX = dir.x > 0 ? 1 : dir.x < 0 ? -1 : 0;
    const stepY = dir.y > 0 ? 1 : dir.y < 0 ? -1 : 0;
    const stepZ = dir.z > 0 ? 1 : dir.z < 0 ? -1 : 0;
    const invX = dir.x !== 0 ? Math.abs(1 / dir.x) : Infinity;
    const invY = dir.y !== 0 ? Math.abs(1 / dir.y) : Infinity;
    const invZ = dir.z !== 0 ? Math.abs(1 / dir.z) : Infinity;
    let tMaxX = dir.x > 0 ? (x + 1 - origin.x) * invX : dir.x < 0 ? (origin.x - x) * invX : Infinity;
    let tMaxY = dir.y > 0 ? (y + 1 - origin.y) * invY : dir.y < 0 ? (origin.y - y) * invY : Infinity;
    let tMaxZ = dir.z > 0 ? (z + 1 - origin.z) * invZ : dir.z < 0 ? (origin.z - z) * invZ : Infinity;
    let normal = [0, 0, 0];
    let t = 0;

    for (let i = 0; i < 900; i++) {
      const block = this.getBlock(x, y, z);
      if (block && block !== LADDER) {
        return {
          dist: t,
          point: new THREE.Vector3(origin.x + dir.x * t, origin.y + dir.y * t, origin.z + dir.z * t),
          normal: new THREE.Vector3(normal[0], normal[1], normal[2])
        };
      }
      if (tMaxX < tMaxY && tMaxX < tMaxZ) {
        t = tMaxX; x += stepX; tMaxX += invX; normal = [-stepX, 0, 0];
      } else if (tMaxY < tMaxZ) {
        t = tMaxY; y += stepY; tMaxY += invY; normal = [0, -stepY, 0];
      } else {
        t = tMaxZ; z += stepZ; tMaxZ += invZ; normal = [0, 0, -stepZ];
      }
      if (t > maxDist) break;
    }
    return null;
  }

  hasLOS(from, to) {
    const dir = new THREE.Vector3().subVectors(to, from);
    const dist = dir.length();
    if (dist < 0.0001) return true;
    dir.multiplyScalar(1 / dist);
    const hit = this.raycast(from, dir, dist);
    return !hit || hit.dist >= dist - 0.35;
  }

  spawnPointFor(zone, angle, radiusOffset = 0, groundOnly = false) {
    const a = angle;
    for (let attempt = 0; attempt < 18; attempt++) {
      const rad = 19 + ((attempt * 7.3 + radiusOffset) % 37);
      const x = zone.x + Math.cos(a + attempt * 0.7) * rad;
      const z = zone.z + Math.sin(a + attempt * 0.7) * rad;
      const y = this.surfaceY(x, z);
      if (groundOnly && y > 5.5) continue;
      if (!this.collidesBox(x, y + 0.1, z, 0.35, 1.75)) {
        return new THREE.Vector3(x, y + 0.02, z);
      }
    }
    let x = zone.x + 16, z = zone.z;
    let y = this.surfaceY(x, z);
    if (groundOnly && y > 5.5) {
      x = zone.x; z = zone.z + 18;
      y = this.surfaceY(x, z);
    }
    return new THREE.Vector3(x, y + 0.02, z);
  }

  /* --------------------------------- beacons ------------------------------- */
  createZoneMarkers() {
    for (const zone of ZONES) {
      const color = zone.isBoss ? 0xff3f6a : 0xffb545;
      const beamMat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending,
        depthWrite: false, side: THREE.FrontSide, fog: false
      });
      const beamMat2 = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.045, blending: THREE.AdditiveBlending,
        depthWrite: false, side: THREE.FrontSide, fog: false
      });
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.55, 72, 10, 1, true), beamMat);
      beam.position.set(zone.x, 4 + 36, zone.z);
      beam.renderOrder = 2;
      const beam2 = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 2.0, 72, 10, 1, true), beamMat2);
      beam2.position.copy(beam.position);
      beam2.renderOrder = 2;
      const ringMat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.34, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false
      });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.045, 4, 40), ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(zone.x, 4.16, zone.z);
      this.markerGroup.add(beam, beam2, ring);

      const label = this.makeZoneLabel(zone);
      label.position.set(zone.x, 20, zone.z);
      this.markerGroup.add(label);

      this.markers.push({ zone, beam, beam2, ring, label, cleared: false });
    }
    this.updateMarkerZone();
  }

  makeZoneLabel(zone) {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 200;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 640, 200);
    ctx.textAlign = "center";
    ctx.font = "600 26px Consolas, monospace";
    ctx.fillStyle = zone.boss ? "#ff6b86" : "#ffb545";
    const kicker = zone.boss === "director"
      ? "FINAL CHECKPOINT"
      : zone.boss === "captain"
        ? "BOSS CHECKPOINT"
        : "CHECKPOINT " + String(zone.id).padStart(2, "0");
    ctx.fillText(kicker + " // " + String(zone.total).padStart(2, "0") + " HOSTILES", 320, 60);
    ctx.font = "700 66px Bahnschrift, Segoe UI, sans-serif";
    ctx.fillStyle = "#f4ead6";
    ctx.fillText(zone.name.toUpperCase(), 320, 128);
    ctx.font = "400 20px Consolas, monospace";
    ctx.fillStyle = "#b58e57";
    ctx.fillText(zone.boss === "director" ? "DIRECTOR VEX" : zone.boss === "captain" ? "CAPTAIN VOSS" : "CHORUS CHECKPOINT", 320, 164);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, opacity: 0.8 });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(29, 9.1, 1);
    return sprite;
  }

  createLockBarrier() {
    const group = new THREE.Group();
    group.visible = false;

    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, 64, 64);
    ctx.strokeStyle = "rgba(255,120,105,0.9)";
    ctx.lineWidth = 2;
    for (let x = 0; x <= 64; x += 16) {
      ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, 64); ctx.stroke();
    }
    for (let y = 8; y <= 64; y += 24) {
      ctx.strokeStyle = "rgba(255,170,145,0.45)";
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(64, y); ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(24, 2);

    const wallMat = new THREE.MeshBasicMaterial({
      map: tex, color: 0xff6d5d, transparent: true, opacity: 0.22,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      depthWrite: false, fog: false
    });
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(101, 101, 24, 64, 1, true), wallMat);
    wall.position.y = 16;
    group.add(wall);

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff4f4f, transparent: true, opacity: 0.4,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(101, 0.32, 4, 96), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 4.15;
    group.add(ring);

    const pylonMat = new THREE.MeshBasicMaterial({
      color: 0xff6655, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false
    });
    const pylonGeo = new THREE.BoxGeometry(0.42, 9, 0.42);
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const px = Math.cos(a) * 101, pz = Math.sin(a) * 101;
      // Never push a solid-looking pylon through the highway.
      if (roadAt(px, pz)) continue;
      const p = new THREE.Mesh(pylonGeo, pylonMat);
      p.position.set(px, 8.5, pz);
      group.add(p);
    }

    this.scene.add(group);
    return { group, wall, ring, zone: null };
  }

  setLockBarrier(zone) {
    if (!this.lockBarrier) return;
    if (this.lockBarrier.zone === zone) return;
    this.lockBarrier.zone = zone;
    if (!zone) {
      this.lockBarrier.group.visible = false;
      return;
    }
    this.lockBarrier.group.position.set(zone.x, 0, zone.z);
    this.lockBarrier.group.visible = true;
  }

  setZoneCleared(index) {
    const m = this.markers[index];
    if (!m) return;
    m.cleared = true;
    m.beam.material.color.setHex(0x7dffb0);
    m.beam2.material.color.setHex(0x7dffb0);
    m.ring.material.color.setHex(0x7dffb0);
    m.beam.material.opacity = 0.08;
    m.beam2.material.opacity = 0.03;
    m.ring.material.opacity = 0.18;
    m.label.material.opacity = 0.32;
  }

  setProgress(nextIndex, activeIndex) {
    this.nextZone = nextIndex;
    this.activeZone = activeIndex;
    this.updateMarkerZone();
  }

  updateMarkerZone() {
    for (const m of this.markers) {
      if (m.cleared) continue;
      const active = m.zone.index === this.activeZone;
      const next = m.zone.index === this.nextZone;
      const locked = !active && !next && m.zone.index > this.nextZone;
      const c = locked ? 0x7d2d38 : m.zone.isBoss ? 0xff3f6a : (active || next) ? 0xffc45e : 0xffb545;
      m.beam.material.color.setHex(c);
      m.beam2.material.color.setHex(c);
      m.ring.material.color.setHex(c);
    }
  }

  /* --------------------------------- dressing ------------------------------ */
  createSkyline() {
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0x1d2b36, map: DISTANT_TEXTURE, fog: true });
    const mat2 = new THREE.MeshBasicMaterial({ color: 0x2a3a46, map: DISTANT_TEXTURE, fog: true });
    const cyan = new THREE.MeshBasicMaterial({ color: 0x5fe7ff, fog: false });
    const magenta = new THREE.MeshBasicMaterial({ color: 0xff5bd5, fog: false });
    const rng = (() => { let s = 4242; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
    for (let i = 0; i < 34; i++) {
      const a = (i / 34) * Math.PI * 2 + rng() * 0.16;
      const r = 1550 + rng() * 760;
      const w = 28 + rng() * 76;
      const d = w * (0.6 + rng() * 0.8);
      const h = 45 + rng() * 150;
      const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), rng() > 0.5 ? mat : mat2);
      box.position.set(Math.cos(a) * r, h / 2 - 2, Math.sin(a) * r);
      box.rotation.y = rng() * Math.PI;
      group.add(box);
      // Vertical neon channels and stacked sky-bands.
      const bands = 1 + Math.floor(rng() * 3);
      for (let b = 0; b < bands; b++) {
        const band = new THREE.Mesh(
          new THREE.BoxGeometry(w + 0.5, 0.9 + rng() * 1.6, d + 0.5),
          rng() > 0.5 ? cyan : magenta
        );
        band.position.set(box.position.x, 8 + rng() * (h - 16), box.position.z);
        band.rotation.y = box.rotation.y;
        group.add(band);
      }
      if (i % 6 === 0) {
        const light = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.3, 1.3),
          new THREE.MeshBasicMaterial({ color: 0xff5a6a, fog: false }));
        light.position.set(box.position.x, h + 2, box.position.z);
        group.add(light);
      }
    }
    // The Chorus Spire above the final arena.
    const boss = ZONES[ZONE_COUNT - 1];
    const spire = new THREE.Group();
    const dark = new THREE.MeshBasicMaterial({ color: 0x181a1d });
    const glow = new THREE.MeshBasicMaterial({ color: 0xb45cff, fog: false });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(9, 14, 92, 6), dark);
    base.position.y = 46;
    spire.add(base);
    for (let i = 0; i < 5; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(10 - i * 0.7, 0.32, 4, 30), glow);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 24 + i * 13;
      spire.add(ring);
    }
    const tip = new THREE.Mesh(new THREE.OctahedronGeometry(4, 0), glow);
    tip.position.y = 97;
    spire.add(tip);
    spire.position.set(boss.x + 72, 0, boss.z + 44);
    group.add(spire);
    this.skylineSpire = spire;
    this.scene.add(group);
  }

  createDust() {
    const count = 480;
    const positions = new Float32Array(count * 3);
    this.dustVel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 70;
      positions[i * 3 + 1] = Math.random() * 24;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 70;
      this.dustVel[i * 3] = 0.35 + Math.random() * 0.8;
      this.dustVel[i * 3 + 1] = (Math.random() - 0.5) * 0.1;
      this.dustVel[i * 3 + 2] = (Math.random() - 0.5) * 0.35;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xe3b577, size: 0.11, transparent: true, opacity: 0.45,
      depthWrite: false, sizeAttenuation: true
    });
    this.dust = new THREE.Points(geo, mat);
    this.dust.frustumCulled = false;
    this.scene.add(this.dust);
    this.dustPositions = positions;
  }

  updateDust(camera, dt) {
    const p = this.dustPositions;
    const v = this.dustVel;
    for (let i = 0; i < p.length; i += 3) {
      p[i] += v[i] * dt;
      p[i + 1] += v[i + 1] * dt;
      p[i + 2] += v[i + 2] * dt;
      if (p[i] > 35) p[i] = -35;
      if (p[i + 1] > 25) p[i + 1] = 0;
      if (p[i + 1] < 0) p[i + 1] = 25;
      if (p[i + 2] > 35) p[i + 2] = -35;
      if (p[i + 2] < -35) p[i + 2] = 35;
    }
    this.dust.geometry.attributes.position.needsUpdate = true;
    this.dust.position.set(camera.position.x, Math.max(0, camera.position.y - 10), camera.position.z);
  }

  createSnow() {
    const count = 1800;
    const positions = new Float32Array(count * 3);
    this.snowVel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 90;
      positions[i * 3 + 1] = Math.random() * 44;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 90;
      this.snowVel[i * 3] = 0.7 + Math.random() * 1.4;
      this.snowVel[i * 3 + 1] = -(2.2 + Math.random() * 3.2);
      this.snowVel[i * 3 + 2] = (Math.random() - 0.5) * 0.7;
    }
    const c = document.createElement("canvas");
    c.width = c.height = 32;
    const ctx = c.getContext("2d");
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.5, "rgba(235,248,255,0.9)");
    grad.addColorStop(1, "rgba(220,240,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      map: tex, color: 0xeaf6ff, size: 0.16, transparent: true, opacity: 0.85,
      depthWrite: false, sizeAttenuation: true, alphaTest: 0.02
    });
    this.snow = new THREE.Points(geo, mat);
    this.snow.frustumCulled = false;
    this.snow.renderOrder = 3;
    this.scene.add(this.snow);
    this.snowPositions = positions;
  }

  updateSnow(camera, dt) {
    const p = this.snowPositions;
    const v = this.snowVel;
    for (let i = 0; i < p.length; i += 3) {
      p[i] += v[i] * dt;
      p[i + 1] += v[i + 1] * dt;
      p[i + 2] += v[i + 2] * dt;
      if (p[i + 1] < -1) {
        p[i + 1] = 42 + Math.random() * 4;
        p[i] = (Math.random() - 0.5) * 90;
        p[i + 2] = (Math.random() - 0.5) * 90;
      }
      if (p[i] > 45) p[i] = -45;
      if (p[i] < -45) p[i] = 45;
      if (p[i + 2] > 45) p[i + 2] = -45;
      if (p[i + 2] < -45) p[i + 2] = 45;
    }
    this.snow.geometry.attributes.position.needsUpdate = true;
    this.snow.position.set(camera.position.x, Math.max(0, camera.position.y - 8), camera.position.z);
  }

  updateSpire(t) {
    if (!this.skylineSpire) return;
    this.skylineSpire.rotation.y = t * 0.03;
  }
}
