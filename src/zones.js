// Campaign layout, national road network, regions and authored voxel structures.
// One deterministic open world: two training stages and 33 strongholds.

export const ZONE_COUNT = 35;

export const REGIONS = {
  beginning: {
    id: "beginning", name: "THE BEGINNING", label: "TRAINING", color: "#b7a37a",
    start: 0, end: 1
  },
  farm: {
    id: "farm", name: "HARROW COUNTY", label: "FARMLAND", color: "#9daf63",
    start: 2, end: 10
  },
  suburb: {
    id: "suburb", name: "CEDAR'S VILL", label: "SUBURBS", color: "#8fa3aa",
    start: 11, end: 22
  },
  city: {
    id: "city", name: "MERIDIAN", label: "CITY", color: "#c38f64",
    start: 23, end: 34
  }
};

export function regionForIndex(i) {
  if (i <= REGIONS.beginning.end) return "beginning";
  if (i <= REGIONS.farm.end) return "farm";
  if (i <= REGIONS.suburb.end) return "suburb";
  return "city";
}

export const ZONE_NAMES = [
  // The Beginning - two training stages
  "The Beginning I", "The Beginning II",
  // Harrow County farmland
  "Harrow Fields", "Mill Creek", "Coldwater", "Route 9", "Silo Row",
  "Thresher's Rest", "Orchard Line", "Grain Elevator", "The Fence",
  // Cedar's Vill suburbs
  "Rustgate", "Cinder Row", "Elmwood", "Fairview", "Cedar Heights",
  "Maple Grove", "Civic Center", "The Strip", "Blackwater", "Railyard",
  "New Haven", "Ashmarket",
  // Meridian city
  "Neon Docks", "Slagworks", "The Foundry", "Neon Bazaar", "Hive Block",
  "Rust Crown", "The Chorus", "Null Sector", "Ember Yards", "Glass Desert",
  "Voss's Gate", "The Director"
];

export const ZONE_FLAVOUR = [
  "Mara's first drill. Move, aim and clear the training field.",
  "Second drill. Grenades, the knife and keeping your squad alive.",
  "Wheat fields all the way to the horizon. The Chorus pays well for grain.",
  "A mill town that never got its harvest in.",
  "Cold water, colder people. Vex's conversion crews came through here first.",
  "The old national route runs straight through the county.",
  "Silos full of feed, silos full of conscripts.",
  "A threshing floor turned muster ground.",
  "The orchards are dead, but the fences still stand.",
  "A grain elevator tall enough to see the next county.",
  "The last farm before the suburbs begin.",
  "Rustgate used to be a truck stop. Now it is a checkpoint.",
  "Cinder Row burned twice and rebuilt itself out of scrap.",
  "Elm trees, cul-de-sacs and one very loud loudspeaker.",
  "Fairview looks normal until the patrols come past.",
  "Cedar Heights has the best sniper lines in the county.",
  "Maple Grove's town hall is a barracks now.",
  "Civic Center's windows are blacked out from the inside.",
  "The strip mall sells nothing but obedience.",
  "Blackwater's reservoir feeds the whole valley. The Chorus poisoned it.",
  "The railyard carries conscripts into the city by the thousand.",
  "New Haven's welcome sign has a Chorus seal on it.",
  "A market town with its square turned into a processing station.",
  "The docks are quiet. The cranes are not.",
  "Slagworks never stopped burning after the first purge.",
  "They cast gun barrels in the old foundry.",
  "The bazaar sells memories of freedom between the checkpoints.",
  "Ten thousand bunks. Ten thousand rifles.",
  "Vex's first fortress, rusted but standing.",
  "The Chorus choir sings behind every pair of eyes in the capital.",
  "Maps end at Null Sector. So does mercy.",
  "The yards burn day and night.",
  "The glass desert ends where the Inner Ring begins.",
  "Captain Voss holds the last gate before the Director's tower.",
  "Director Vex is waiting beneath the frozen sky."
];

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const l2 = dx * dx + dz * dz;
  let t = l2 > 0 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  const x = ax + dx * t, z = az + dz * t;
  return Math.hypot(px - x, pz - z);
}

function angleLerp(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

/* ------------------------------- national route --------------------------- */
const CORE_ZONE_COUNT = 33;
function coreRegionForIndex(i) {
  if (i <= 8) return "farm";
  if (i <= 20) return "suburb";
  return "city";
}

const rng = mulberry32(0xc0ffee);
const coreCenters = [{ x: 0, z: 0 }];
let heading = -Math.PI / 2;

const REGION_TARGETS = {
  farm: { x: 50, z: -1750 },
  suburb: { x: 950, z: -1050 },
  city: { x: 1450, z: -1750 }
};

for (let i = 1; i < CORE_ZONE_COUNT; i++) {
  let chosen = null;
  for (let attempt = 0; attempt < 55; attempt++) {
    const step = 240 + rng() * 92;
    const last = coreCenters[coreCenters.length - 1];
    const target = REGION_TARGETS[coreRegionForIndex(i)] || REGION_TARGETS.city;
    let h = heading + (rng() - 0.5) * 1.35;
    if (attempt < 24) {
      h = angleLerp(h, Math.atan2(target.z - last.z, target.x - last.x), 0.22);
    }
    let nx = last.x + Math.cos(h) * step;
    let nz = last.z + Math.sin(h) * step;

    if (Math.hypot(nx, nz) > 2350) {
      h = Math.atan2(-last.z, -last.x) + (rng() - 0.5) * 0.9;
      nx = last.x + Math.cos(h) * step;
      nz = last.z + Math.sin(h) * step;
    }

    let ok = true;
    for (const c of coreCenters) {
      if (Math.hypot(nx - c.x, nz - c.z) < 218) { ok = false; break; }
    }
    if (ok) { chosen = { x: nx, z: nz, heading: h }; break; }
  }
  if (!chosen) {
    // Deterministic spiral fallback: never let two strongholds collapse into
    // the same piece of countryside.
    const last = coreCenters[coreCenters.length - 1];
    search:
    for (let rad = 235; rad <= 760; rad += 22) {
      for (let k = 0; k < 48; k++) {
        const h = heading + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.14;
        const nx = last.x + Math.cos(h) * rad;
        const nz = last.z + Math.sin(h) * rad;
        if (Math.hypot(nx, nz) > 2350) continue;
        let ok = true;
        for (const c of coreCenters) {
          if (Math.hypot(nx - c.x, nz - c.z) < 218) { ok = false; break; }
        }
        if (ok) {
          chosen = { x: nx, z: nz, heading: h };
          break search;
        }
      }
    }
    if (!chosen) {
      heading += 0.83;
      chosen = { x: last.x + Math.cos(heading) * 300, z: last.z + Math.sin(heading) * 300, heading };
    }
  }
  heading = chosen.heading;
  coreCenters.push({ x: chosen.x, z: chosen.z });
}

// Two training stages sit in front of Harrow Fields and keep the original 33
// campaign centers exactly where they were.
const centers = [
  { x: -80, z: 150 },
  { x: 80, z: 150 },
  ...coreCenters
];

/* ------------------------------ curved highways --------------------------- */
// The main road bends between strongholds instead of running point-to-point.
const roadRng = mulberry32(0xbadc0de);
export const MAIN_ROAD = [];
for (let i = 0; i < centers.length - 1; i++) {
  const a = centers[i], b = centers[i + 1];
  const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  const px = -(b.z - a.z) / len, pz = (b.x - a.x) / len;
  const amp = (26 + roadRng() * 54) * (i % 2 ? -1 : 1);
  MAIN_ROAD.push({ x: a.x, z: a.z });
  for (let k = 1; k <= 2; k++) {
    const t = k / 3;
    const off = Math.sin(Math.PI * t) * amp;
    MAIN_ROAD.push({
      x: a.x + (b.x - a.x) * t + px * off,
      z: a.z + (b.z - a.z) * t + pz * off
    });
  }
}
MAIN_ROAD.push({ x: centers[centers.length - 1].x, z: centers[centers.length - 1].z });

/* ---------------------------------- roads -------------------------------- */
// 0 = none, 1 = asphalt, 2 = centre line, 3 = dirt lane
const road = new Map();
const ROAD_KEY = (x, z) => (x + 12288) * 24576 + (z + 12288);
export function roadAt(x, z) {
  return road.get(ROAD_KEY(Math.round(x), Math.round(z))) || 0;
}

function roadPriority(type) {
  if (type === 2) return 3;
  if (type === 1) return 2;
  if (type === 3) return 1;
  return 0;
}

function setRoad(x, z, type) {
  const key = ROAD_KEY(x, z);
  const cur = road.get(key) || 0;
  if (roadPriority(type) > roadPriority(cur)) road.set(key, type);
}

function rasterLine(ax, az, bx, bz, width, type, centerLine = false) {
  const len = Math.hypot(bx - ax, bz - az);
  if (len < 0.001) return;
  const nx = (bx - ax) / len, nz = (bz - az) / len;
  const px = -nz, pz = nx;
  for (let t = 0; t <= len; t += 0.5) {
    const cx = ax + nx * t, cz = az + nz * t;
    for (let o = -width; o <= width; o += 1) {
      setRoad(
        Math.round(cx + px * o),
        Math.round(cz + pz * o),
        centerLine && Math.abs(o) < 0.6 ? 2 : type
      );
    }
  }
}

for (let i = 0; i < MAIN_ROAD.length - 1; i++) {
  const a = MAIN_ROAD[i], b = MAIN_ROAD[i + 1];
  rasterLine(a.x, a.z, b.x, b.z, 5, 1, true);
}

export const LOCAL_ROADS = [];

function addLocalRoad(points, type = 1, width = 2) {
  LOCAL_ROADS.push({ points, type });
  for (let i = 0; i < points.length - 1; i++) {
    rasterLine(points[i].x, points[i].z, points[i + 1].x, points[i + 1].z, width, type, false);
  }
}

// Local lanes, suburban loops and city grids. These make each stronghold feel
// like part of a country rather than an isolated arena.
for (let i = 0; i < centers.length; i++) {
  const c = centers[i];
  const region = regionForIndex(i);
  const r = mulberry32(0x9000 + i * 7919);

  if (region === "beginning") {
    addLocalRoad([{ x: c.x - 30, z: c.z }, { x: c.x + 30, z: c.z }], 3, 1.6);
    addLocalRoad([{ x: c.x, z: c.z - 30 }, { x: c.x, z: c.z + 30 }], 3, 1.6);
  } else if (region === "farm") {
    for (let k = 0; k < 2 + (i % 2); k++) {
      const a = r() * Math.PI * 2;
      const rad = 62 + r() * 42;
      addLocalRoad([
        { x: c.x + Math.cos(a) * 9, z: c.z + Math.sin(a) * 9 },
        { x: c.x + Math.cos(a) * (rad * 0.55) + Math.sin(a) * 9, z: c.z + Math.sin(a) * (rad * 0.55) - Math.cos(a) * 9 },
        { x: c.x + Math.cos(a) * rad, z: c.z + Math.sin(a) * rad }
      ], 3, 1.6);
    }
  } else if (region === "suburb") {
    const ring = [];
    const count = 18;
    const rad = 45 + r() * 7;
    for (let k = 0; k <= count; k++) {
      const a = (k / count) * Math.PI * 2;
      ring.push({ x: c.x + Math.cos(a) * rad, z: c.z + Math.sin(a) * rad });
    }
    addLocalRoad(ring, 1, 1.8);
    addLocalRoad([{ x: c.x - rad, z: c.z }, { x: c.x + rad, z: c.z }], 1, 1.5);
    addLocalRoad([{ x: c.x, z: c.z - rad }, { x: c.x, z: c.z + rad }], 1, 1.5);
  } else {
    for (const gx of [-48, 0, 48]) {
      addLocalRoad([
        { x: c.x + gx, z: c.z - 82 },
        { x: c.x + gx, z: c.z + 82 }
      ], 1, 2);
    }
    for (const gz of [-48, 0, 48]) {
      addLocalRoad([
        { x: c.x - 82, z: c.z + gz },
        { x: c.x + 82, z: c.z + gz }
      ], 1, 2);
    }
  }
}

export function distanceToPath(x, z) {
  let m = Infinity;
  for (let i = 0; i < MAIN_ROAD.length - 1; i++) {
    const a = MAIN_ROAD[i], b = MAIN_ROAD[i + 1];
    m = Math.min(m, segDist(x, z, a.x, a.z, b.x, b.z));
  }
  return m;
}

function touchesRoad(x0, z0, w, d, margin = 1) {
  const xa = Math.floor(x0 - margin), xb = Math.ceil(x0 + w + margin);
  const za = Math.floor(z0 - margin), zb = Math.ceil(z0 + d + margin);
  for (let x = xa; x <= xb; x++) {
    for (let z = za; z <= zb; z++) {
      if (roadAt(x, z)) return true;
    }
  }
  return false;
}

/* ---------------------------------- zones -------------------------------- */
function pick(r, arr) { return arr[Math.floor(r() * arr.length) % arr.length]; }

const PALETTES = {
  farm: {
    houseWalls: [23, 7, 25, 37, 46], roofs: [26, 27, 15],
    barnWalls: [36, 7, 15], siloWalls: [8, 5, 13],
    trim: 34, window: 9, accent: 45, crate: [15, 8, 16, 40], barrier: [5, 7]
  },
  suburb: {
    houseWalls: [23, 24, 25, 37, 7, 13, 40, 51], roofs: [26, 27, 6],
    commercialWalls: [5, 6, 13, 7, 42, 50], trim: 34, window: 9,
    accent: 8, crate: [8, 16, 18, 40], barrier: [5, 7, 45]
  },
  city: {
    walls: [5, 6, 13, 7, 8, 16, 42, 43, 50, 51], roofs: [6, 16, 22, 49],
    accent: [8, 16, 7, 20, 40, 41, 44, 48], trim: 34, window: 9,
    crate: [15, 8, 16, 18, 19, 40], barrier: [5, 13, 8, 45]
  }
};

function doorToward(c, x, z) {
  return Math.abs(x - c.x) > Math.abs(z - c.z)
    ? (x > c.x ? "west" : "east")
    : (z > c.z ? "north" : "south");
}

function shuffle(r, arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const ZONES = centers.map((c, i) => {
  const name = ZONE_NAMES[i];
  const region = regionForIndex(i);
  const regionDef = REGIONS[region];
  const pal = PALETTES[region] || PALETTES.farm;
  const coreIndex = i - 2;
  const r = mulberry32(0x51de + coreIndex * 977);
  const bossKind = coreIndex === CORE_ZONE_COUNT - 1 ? "director" : coreIndex === CORE_ZONE_COUNT - 2 ? "captain" : null;
  const isBoss = !!bossKind;
  const total = coreIndex === CORE_ZONE_COUNT - 1 ? 44 : coreIndex === CORE_ZONE_COUNT - 2 ? 38 : 18 + Math.round(coreIndex * 1.5);
  const props = [];
  const spawnAngles = [];

  if (i < 2) {
    // Training yard: no buildings, just a few crates for cover and a short
    // ring of spawn points. The battle itself is a normal wave of four or six
    // hostiles, so everything the player learns uses the real combat systems.
    props.push(
      { kind: "box", x0: c.x - 15, y0: 4, z0: c.z - 3, sx: 4, sy: 2, sz: 3, color: 15, top: true },
      { kind: "box", x0: c.x + 10, y0: 4, z0: c.z - 12, sx: 3, sy: 2, sz: 4, color: 8, top: true },
      { kind: "box", x0: c.x - 6, y0: 4, z0: c.z + 12, sx: 5, sy: 2, sz: 3, color: 16, top: true },
      { kind: "box", x0: c.x + 13, y0: 4, z0: c.z + 9, sx: 3, sy: 2, sz: 3, color: 15, top: true }
    );
    for (let k = 0; k < 24; k++) {
      spawnAngles.push({ a: (k / 24) * Math.PI * 2 + r() * 0.2, rad: 14 + r() * 22 });
    }
    return {
      index: i,
      id: i + 1,
      name,
      region,
      regionName: regionDef.name,
      regionLabel: regionDef.label,
      regionColor: regionDef.color,
      flavour: ZONE_FLAVOUR[i],
      x: c.x, z: c.z,
      total: i === 0 ? 4 : 6,
      isBoss: false,
      boss: null,
      props,
      spawnAngles,
      cleared: false,
      isIntro: true
    };
  }

  const overlaps = (x0, z0, w, d, pad = 3) => {
    for (const p of props) {
      if (p.kind !== "building") continue;
      if (x0 < p.x0 + p.w + pad && x0 + w + pad > p.x0 &&
          z0 < p.z0 + p.d + pad && z0 + d + pad > p.z0) return true;
    }
    return false;
  };

  const treeOverlaps = (x0, z0, w, d, pad = 2) => {
    for (const p of props) {
      if (p.kind !== "tree") continue;
      if (x0 < p.x + w + pad && x0 + w + pad > p.x &&
          z0 < p.z + d + pad && z0 + d + pad > p.z) return true;
    }
    return false;
  };

  const addBuilding = (opts, minRad = 23, maxRad = 88, attempts = 34) => {
    for (let attempt = 0; attempt < attempts; attempt++) {
      const ang = r() * Math.PI * 2;
      const rad = minRad + r() * (maxRad - minRad);
      const x = c.x + Math.cos(ang) * rad;
      const z = c.z + Math.sin(ang) * rad;
      const x0 = Math.round(x - opts.w / 2);
      const z0 = Math.round(z - opts.d / 2);
      if (Math.hypot(x - c.x, z - c.z) < 18) continue;
      if (coreIndex === 0 && x0 < 24 && x0 + opts.w > -24 && z0 < 112 && z0 + opts.d > 56) continue;
      if (coreIndex === 0 && Math.hypot(x - 0, z - 95) < 32) continue;
      if (overlaps(x0, z0, opts.w, opts.d, 3)) continue;
      if (touchesRoad(x0, z0, opts.w, opts.d, 4)) continue;
      const doorSide = opts.doorSide || doorToward(c, x, z);
      props.push({
        kind: "building", base: 4, x0, z0, ...opts, doorSide
      });
      return true;
    }
    return false;
  };

  const addBox = (x, z, sx, sy, sz, color, top, allowRoad = false) => {
    // Centre the footprint on the requested point. Treating x/z as a corner
    // made long crates and barriers poke out over the highway.
    const x0 = Math.round(x - sx / 2), z0 = Math.round(z - sz / 2);
    if (!allowRoad && touchesRoad(x0, z0, sx, sz, 2)) return false;
    if (Math.hypot(x0 + sx / 2 - c.x, z0 + sz / 2 - c.z) < 13) return false;
    props.push({ kind: "box", x0, y0: 4, z0, sx, sy, sz, color, top });
    return true;
  };

  const addTree = (minRad = 25, maxRad = 92) => {
    for (let attempt = 0; attempt < 16; attempt++) {
      const ang = r() * Math.PI * 2;
      const rad = minRad + r() * (maxRad - minRad);
      const x = Math.round(c.x + Math.cos(ang) * rad);
      const z = Math.round(c.z + Math.sin(ang) * rad);
      if (Math.hypot(x - c.x, z - c.z) < 17) continue;
      if (coreIndex === 0 && x > -24 && x < 24 && z > 56 && z < 112) continue;
      if (touchesRoad(x - 2, z - 2, 4, 4, 1)) continue;
      if (overlaps(x - 2, z - 2, 4, 4, 1)) continue;
      if (treeOverlaps(x - 2, z - 2, 4, 4, 1)) continue;
      props.push({ kind: "tree", x, z, base: 4, h: 4 + Math.floor(r() * 4), leaf: 32, trunk: 33 });
      return true;
    }
    return false;
  };

  if (region === "farm") {
    // Barns, farmhouses and silos spread across the fields.
    addBuilding({
      w: 12 + Math.floor(r() * 5), d: 10 + Math.floor(r() * 5),
      h: 6 + Math.floor(r() * 3), wall: pick(r, pal.barnWalls),
      accent: 34, window: pal.window, roof: pick(r, pal.roofs), trim: pal.trim,
      roofStyle: "gable", buildingType: "barn", ruin: r() * 0.2, doorWidth: 4
    }, 28, 78);
    addBuilding({
      w: 7 + Math.floor(r() * 4), d: 7 + Math.floor(r() * 4),
      h: 4 + Math.floor(r() * 3), wall: pick(r, pal.houseWalls),
      accent: pal.trim, window: pal.window, roof: pick(r, pal.roofs), trim: pal.trim,
      roofStyle: r() < 0.55 ? "gable" : "hip", buildingType: "farmhouse",
      ruin: r() * 0.12, doorWidth: 2
    }, 27, 75);
    addBuilding({
      w: 4 + Math.floor(r() * 2), d: 4 + Math.floor(r() * 2),
      h: 12 + Math.floor(r() * 5), wall: pick(r, pal.siloWalls),
      accent: 8, window: 8, roof: 16, trim: 13,
      roofStyle: "flat", buildingType: "silo", ruin: 0.05, doorWidth: 1,
      windowDensity: "none"
    }, 28, 70);
    if (r() > 0.35) {
      addBuilding({
        w: 6 + Math.floor(r() * 3), d: 6 + Math.floor(r() * 3),
        h: 3 + Math.floor(r() * 2), wall: pick(r, [7, 15, 5]),
        accent: 34, window: pal.window, roof: pick(r, pal.roofs), trim: pal.trim,
        roofStyle: "hip", buildingType: "shed", ruin: r() * 0.3, doorWidth: 2
      }, 26, 78);
    }
    addBuilding({
      w: 13 + Math.floor(r() * 5), d: 9 + Math.floor(r() * 4),
      h: 5 + Math.floor(r() * 2), wall: 5, accent: 8, window: pal.window,
      roof: 16, trim: 13, roofStyle: "flat", buildingType: "warehouse",
      ruin: r() * 0.35, doorWidth: 4
    }, 40, 82);

    for (let k = 0; k < 5; k++) addTree(22, 92);
    for (let k = 0; k < 3; k++) {
      const ang = r() * Math.PI * 2, rad = 20 + r() * 35;
      addBox(c.x + Math.cos(ang) * rad, c.z + Math.sin(ang) * rad, 5 + Math.floor(r() * 4), 1, 1, 33, 33);
    }
    for (let k = 0; k < 7; k++) {
      const ang = r() * Math.PI * 2, rad = 18 + r() * 45;
      addBox(c.x + Math.cos(ang) * rad, c.z + Math.sin(ang) * rad, 2, 1, 2, 31, 33);
    }
    for (let k = 0; k < 4; k++) {
      const ang = r() * Math.PI * 2, rad = 20 + r() * 45;
      addBox(c.x + Math.cos(ang) * rad, c.z + Math.sin(ang) * rad, 2, 2, 2, 31, 30);
    }
  } else if (region === "suburb") {
    // A loose grid of detached houses, fences, trees and a couple of flat-roof
    // commercial buildings that make good sniper perches.
    const slots = [];
    for (let gx = -2; gx <= 2; gx++) {
      for (let gz = -2; gz <= 2; gz++) {
        const x = c.x + gx * 34 + (r() - 0.5) * 12;
        const z = c.z + gz * 34 + (r() - 0.5) * 12;
        if (Math.hypot(x - c.x, z - c.z) > 22) slots.push({ x, z });
      }
    }
    shuffle(r, slots);
    let houses = 0;
    for (const slot of slots) {
      if (houses >= 10) break;
      const w = 7 + Math.floor(r() * 4), d = 7 + Math.floor(r() * 4);
      const x0 = Math.round(slot.x - w / 2), z0 = Math.round(slot.z - d / 2);
      if (overlaps(x0, z0, w, d, 3)) continue;
      if (touchesRoad(x0, z0, w, d, 4)) continue;
      const style = r() < 0.62 ? "gable" : "hip";
      props.push({
        kind: "building", base: 4, x0, z0, w, d,
        h: 4 + Math.floor(r() * 3),
        wall: pick(r, pal.houseWalls), accent: pal.trim, window: pal.window,
        roof: pick(r, pal.roofs), trim: pal.trim, roofStyle: style,
        buildingType: "house", doorSide: doorToward(c, slot.x, slot.z),
        ruin: r() * 0.16, doorWidth: 2
      });
      houses++;
    }
    for (let k = 0; k < 2; k++) {
      addBuilding({
        w: 16 + Math.floor(r() * 6), d: 10 + Math.floor(r() * 4),
        h: 5 + Math.floor(r() * 3), wall: pick(r, pal.commercialWalls),
        accent: 8, window: pal.window, roof: 16, trim: pal.trim,
        roofStyle: "flat", buildingType: "warehouse", ruin: r() * 0.25, doorWidth: 4
      }, 38, 82);
    }
    for (let k = 0; k < 7; k++) addTree(24, 88);
    for (let k = 0; k < 5; k++) {
      const ang = r() * Math.PI * 2, rad = 22 + r() * 40;
      addBox(c.x + Math.cos(ang) * rad, c.z + Math.sin(ang) * rad, 6 + Math.floor(r() * 4), 1, 1, 33, 33);
    }
    for (let k = 0; k < 4; k++) {
      const ang = r() * Math.PI * 2, rad = 18 + r() * 48;
      addBox(c.x + Math.cos(ang) * rad, c.z + Math.sin(ang) * rad, 4, 2, 2, pick(r, [15, 19, 7, 8]), 16);
    }
  } else {
    // Dense capital blocks. Flat roofs are deliberately common here.
    const slots = [];
    for (let gx = -3; gx <= 3; gx++) {
      for (let gz = -3; gz <= 3; gz++) {
        const x = c.x + gx * 30 + (r() - 0.5) * 9;
        const z = c.z + gz * 30 + (r() - 0.5) * 9;
        if (Math.hypot(x - c.x, z - c.z) > 22) slots.push({ x, z });
      }
    }
    shuffle(r, slots);
    let blocks = 0;
    for (const slot of slots) {
      if (blocks >= 16) break;
      const w = 10 + Math.floor(r() * 8), d = 10 + Math.floor(r() * 8);
      const x0 = Math.round(slot.x - w / 2), z0 = Math.round(slot.z - d / 2);
      if (overlaps(x0, z0, w, d, 3)) continue;
      if (touchesRoad(x0, z0, w, d, 4)) continue;
      props.push({
        kind: "building", base: 4, x0, z0, w, d,
        h: 10 + Math.floor(r() * (isBoss ? 23 : 21)),
        wall: pick(r, pal.walls), accent: pick(r, pal.accent), window: pal.window,
        roof: pick(r, pal.roofs), trim: pal.trim, roofStyle: "flat",
        buildingType: "block", doorSide: doorToward(c, slot.x, slot.z),
        ruin: r() * 0.45, doorWidth: 2, parapet: true, windowDensity: "city"
      });
      blocks++;
    }
    for (let k = 0; k < 3; k++) {
      addBuilding({
        w: 16 + Math.floor(r() * 6), d: 10 + Math.floor(r() * 5),
        h: 4 + Math.floor(r() * 3), wall: pick(r, [5, 7, 8, 13]),
        accent: pick(r, pal.accent), window: pal.window, roof: 16, trim: pal.trim,
        roofStyle: "flat", buildingType: "store", ruin: r() * 0.3,
        doorWidth: 4, parapet: true, windowDensity: "city"
      }, 32, 80);
    }
    for (let k = 0; k < 3; k++) addTree(28, 82);
    for (let k = 0; k < 5; k++) {
      const ang = r() * Math.PI * 2, rad = 18 + r() * 46;
      addBox(c.x + Math.cos(ang) * rad, c.z + Math.sin(ang) * rad, 3, 2, 2, pick(r, pal.crate), 15);
    }
    for (let k = 0; k < 4; k++) {
      const ang = r() * Math.PI * 2, rad = 20 + r() * 42;
      const alongX = r() > 0.5;
      addBox(c.x + Math.cos(ang) * rad, c.z + Math.sin(ang) * rad, alongX ? 5 : 1, 1, alongX ? 1 : 5, pick(r, pal.barrier), 5);
    }
    for (let k = 0; k < 4; k++) {
      const ang = r() * Math.PI * 2, rad = 18 + r() * 48;
      addBox(c.x + Math.cos(ang) * rad, c.z + Math.sin(ang) * rad, 4, 2, 2, pick(r, [15, 19, 8, 16]), 16);
    }
  }

  // Universal cover along the approach.
  for (let k = 0; k < 6; k++) {
    const ang = r() * Math.PI * 2;
    const rad = 56 + r() * 36;
    const x = Math.round(c.x + Math.cos(ang) * rad);
    const z = Math.round(c.z + Math.sin(ang) * rad);
    const alongX = r() > 0.5;
    const sx = alongX ? 5 : 2, sz = alongX ? 2 : 5;
    const x0 = x - Math.floor(sx / 2), z0 = z - Math.floor(sz / 2);
    if (overlaps(x0 - 1, z0 - 1, sx + 2, sz + 2, 1)) continue;
    if (touchesRoad(x0, z0, sx, sz, 2)) continue;
    props.push({
      kind: "box", x0, y0: 4, z0, sx, sy: 2, sz,
      color: alongX ? 15 : pick(r, pal.crate || [8, 16, 18]),
      top: alongX ? 16 : 15
    });
  }

  // The opening staging camp.
  if (i === 0) {
    for (const b of [
      { x: -9, z: 89, sx: 3, sy: 2, sz: 2, color: 8 },
      { x: 7, z: 91, sx: 2, sy: 2, sz: 2, color: 18 },
      { x: 0, z: 84, sx: 5, sy: 1, sz: 1, color: 5 },
      { x: -4, z: 91, sx: 2, sy: 2, sz: 2, color: 16 }
    ]) {
      const x0 = b.x - Math.floor(b.sx / 2), z0 = b.z - Math.floor(b.sz / 2);
      if (!touchesRoad(x0, z0, b.sx, b.sz, 2)) props.push({ kind: "box", x0, y0: 4, z0, sx: b.sx, sy: b.sy, sz: b.sz, color: b.color, top: 15 });
    }
  }

  // Final road-clearance pass. Guarantees no authored prop can sit on or
  // overhang the asphalt, including long crates, hay bales and tree canopies.
  for (let i = props.length - 1; i >= 0; i--) {
    const p = props[i];
    let hit = false;
    if (p.kind === "tree") hit = touchesRoad(p.x - 3, p.z - 3, 7, 7, 0);
    else if (p.kind === "box") hit = touchesRoad(p.x0, p.z0, p.sx, p.sz, 1);
    else if (p.kind === "building") hit = touchesRoad(p.x0, p.z0, p.w, p.d, 0);
    if (hit) props.splice(i, 1);
  }

  for (let k = 0; k < 28; k++) {
    spawnAngles.push({ a: (k / 28) * Math.PI * 2 + r() * 0.15, rad: 20 + r() * 37 });
  }

  return {
    index: i,
    id: i + 1,
    name,
    region,
    regionName: regionDef.name,
    regionLabel: regionDef.label,
    regionColor: regionDef.color,
    flavour: ZONE_FLAVOUR[i],
    x: c.x, z: c.z,
    total,
    isBoss,
    boss: bossKind,
    props,
    spawnAngles,
    cleared: false
  };
});

export function ladderForBuilding(b) {
  if (!b || b.kind !== "building") return null;
  const idx = Math.abs(b.x0 * 31 + b.z0 * 17 + b.w * 7 + b.d * 13) % 4;
  // The ladder stands in the street cell against a wall near a corner, not
  // inside the wall itself, so the building stays sealed and the builder can
  // still step off the top rung onto the roof.
  const sides = [
    { x: b.x0 - 1, z: b.z0, roofX: b.x0, roofZ: b.z0 },
    { x: b.x0, z: b.z0 - 1, roofX: b.x0, roofZ: b.z0 },
    { x: b.x0 + b.w, z: b.z0 + b.d - 1, roofX: b.x0 + b.w - 1, roofZ: b.z0 + b.d - 1 },
    { x: b.x0 + b.w - 1, z: b.z0 + b.d, roofX: b.x0 + b.w - 1, roofZ: b.z0 + b.d - 1 }
  ];
  const side = sides[idx];
  return { ...side, base: b.base, top: b.base + b.h };
}

export function nearestZone(x, z) {
  let best = null, bd = Infinity;
  for (const zone of ZONES) {
    const d = Math.hypot(x - zone.x, z - zone.z);
    if (d < bd) { bd = d; best = zone; }
  }
  return { zone: best, dist: bd };
}

export function zoneAtDistance(x, z, maxDist) {
  let result = null;
  for (const zone of ZONES) {
    const d = Math.hypot(x - zone.x, z - zone.z);
    if (d <= maxDist && (!result || d < result.dist)) result = { zone, dist: d };
  }
  return result;
}

export function regionAt(x, z) {
  return nearestZone(x, z).zone.region;
}

export const MAP_BOUNDS = (() => {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const z of ZONES) {
    minX = Math.min(minX, z.x); maxX = Math.max(maxX, z.x);
    minZ = Math.min(minZ, z.z); maxZ = Math.max(maxZ, z.z);
  }
  for (const p of MAIN_ROAD) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
  }
  const pad = 170;
  return { minX: minX - pad, maxX: maxX + pad, minZ: minZ - pad, maxZ: maxZ + pad };
})();
