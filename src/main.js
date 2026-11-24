import * as THREE from "three";
import { World } from "./world.js";
import { Player } from "./player.js";
import { EnemyManager } from "./enemies.js";
import { PickupManager } from "./pickups.js";
import { Effects } from "./effects.js";
import { HUD } from "./hud.js";
import { AudioEngine } from "./audio.js";
import { ZONES, ZONE_COUNT, nearestZone } from "./zones.js";
import { coop } from "./coop.js";
import { maraLine } from "./mara.js";

const $ = id => document.getElementById(id);
const LEGACY_SAVE_KEY = "mindwar_operation_v1";
const SAVE_PREFIX = "mindwar_world_v1_";
const ACTIVE_SLOT_KEY = "mindwar_active_world_v1";
const WORLD_COUNT = 5;
const START_X = 0;
const START_Z = 95;

/* --------------------------------- renderer ------------------------------- */
const canvas = $("game");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1417);
scene.fog = new THREE.Fog(0xa07455, 60, 420);

const camera = new THREE.PerspectiveCamera(78, window.innerWidth / window.innerHeight, 0.05, 520);
camera.rotation.order = "YXZ";
scene.add(camera);

const hemi = new THREE.HemisphereLight(0xffd9b0, 0x2b2a33, 1.35);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffbf82, 1.55);
sun.position.set(0.7, 1.4, -0.8);
scene.add(sun);
const fill = new THREE.DirectionalLight(0x7a9ac4, 0.35);
fill.position.set(-1, 0.4, 0.7);
scene.add(fill);

const weaponLight = new THREE.PointLight(0xffe0b8, 0.8, 6);
weaponLight.position.set(0.25, 0.1, 0.1);
camera.add(weaponLight);

/* ----------------------------------- sky ---------------------------------- */
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  fog: false,
  uniforms: {
    topColor: { value: new THREE.Color(0x252536) },
    horizonColor: { value: new THREE.Color(0xc9885a) },
    sunColor: { value: new THREE.Color(0xffd6a1) },
    sunDir: { value: new THREE.Vector3(0.36, 0.22, -0.9).normalize() }
  },
  vertexShader: `
    varying vec3 vDir;
    void main() {
      vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vDir;
    uniform vec3 topColor;
    uniform vec3 horizonColor;
    uniform vec3 sunColor;
    uniform vec3 sunDir;
    void main() {
      vec3 dir = normalize(vDir);
      float t = smoothstep(-0.04, 0.62, dir.y);
      vec3 col = mix(horizonColor, topColor, t);
      float d = max(dot(dir, normalize(sunDir)), 0.0);
      col += sunColor * pow(d, 260.0) * 2.2;
      col += sunColor * pow(d, 9.0) * 0.16;
      col += vec3(0.045, 0.02, 0.008) * (1.0 - smoothstep(0.0, 0.25, dir.y));
      gl_FragColor = vec4(col, 1.0);
    }
  `
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(420, 24, 14), skyMat);
sky.frustumCulled = false;
sky.renderOrder = -10;
scene.add(sky);

const SKY_RED = {
  bg: new THREE.Color(0x1a1417),
  fog: new THREE.Color(0xa07455),
  hemiSky: new THREE.Color(0xffd9b0),
  hemiGround: new THREE.Color(0x2b2a33),
  sun: new THREE.Color(0xffbf82),
  fill: new THREE.Color(0x7a9ac4),
  top: new THREE.Color(0x252536),
  horizon: new THREE.Color(0xc9885a),
  sunColor: new THREE.Color(0xffd6a1),
  hemiIntensity: 1.35,
  sunIntensity: 1.55,
  fillIntensity: 0.35
};
const SKY_BLUE = {
  bg: new THREE.Color(0x2f7cc4),
  fog: new THREE.Color(0xcfeaff),
  hemiSky: new THREE.Color(0xe4f5ff),
  hemiGround: new THREE.Color(0x3b4a58),
  sun: new THREE.Color(0xfff8e8),
  fill: new THREE.Color(0x9cc4e8),
  top: new THREE.Color(0x2f7cc4),
  horizon: new THREE.Color(0xd6f2ff),
  sunColor: new THREE.Color(0xfffdf2),
  hemiIntensity: 1.2,
  sunIntensity: 1.5,
  fillIntensity: 0.55
};

function applySkyBlend(amount) {
  const t = Math.max(0, Math.min(1, amount));
  scene.background.copy(SKY_RED.bg).lerp(SKY_BLUE.bg, t);
  scene.fog.color.copy(SKY_RED.fog).lerp(SKY_BLUE.fog, t);
  hemi.color.copy(SKY_RED.hemiSky).lerp(SKY_BLUE.hemiSky, t);
  hemi.groundColor.copy(SKY_RED.hemiGround).lerp(SKY_BLUE.hemiGround, t);
  sun.color.copy(SKY_RED.sun).lerp(SKY_BLUE.sun, t);
  fill.color.copy(SKY_RED.fill).lerp(SKY_BLUE.fill, t);
  skyMat.uniforms.topColor.value.copy(SKY_RED.top).lerp(SKY_BLUE.top, t);
  skyMat.uniforms.horizonColor.value.copy(SKY_RED.horizon).lerp(SKY_BLUE.horizon, t);
  skyMat.uniforms.sunColor.value.copy(SKY_RED.sunColor).lerp(SKY_BLUE.sunColor, t);
  hemi.intensity = SKY_RED.hemiIntensity + (SKY_BLUE.hemiIntensity - SKY_RED.hemiIntensity) * t;
  sun.intensity = SKY_RED.sunIntensity + (SKY_BLUE.sunIntensity - SKY_RED.sunIntensity) * t;
  fill.intensity = SKY_RED.fillIntensity + (SKY_BLUE.fillIntensity - SKY_RED.fillIntensity) * t;
}

/* --------------------------------- systems -------------------------------- */
const world = new World(scene);
const hud = new HUD();
const audio = new AudioEngine();
const effects = new Effects(scene);

let state = "menu";
let inputMode = null;

// Browsers only allow WebAudio after a gesture, so start the title theme on
// the first click or key press. Deploying immediately hands over to the
// battle score.
let titleMusicArmed = false;
function armTitleMusic() {
  if (titleMusicArmed || state !== "menu") return;
  titleMusicArmed = true;
  audio.ensure();
  audio.startMusic("title");
}
window.addEventListener("pointerdown", armTitleMusic, { capture: true, once: true });
window.addEventListener("keydown", armTitleMusic, { capture: true, once: true });

function setInputMode(mode) {
  inputMode = mode === "pad" ? "pad" : mode === "kb" ? "kb" : null;
  const kb = $("btn-input-kb");
  const pad = $("btn-input-pad");
  if (kb) kb.classList.toggle("active", inputMode === "kb");
  if (pad) pad.classList.toggle("active", inputMode === "pad");
  const deploy = $("btn-deploy");
  const cont = $("btn-continue");
  if (deploy) deploy.disabled = !inputMode;
  if (cont) cont.disabled = !inputMode;
  if (inputMode !== "kb") {
    mouseFire = false;
    mouseAds = false;
    input.fire = false;
    input.ads = false;
  }
}

function normalizePadBinding(value) {
  if (Number.isInteger(value) && value >= 0 && value < 32) return "b" + value;
  if (typeof value !== "string") return null;
  const match = /^([ba])(\d+)([+-]?)$/.exec(value);
  if (!match) return null;
  const index = Number(match[2]);
  if (index < 0 || index >= 32) return null;
  if (match[1] === "b") return "b" + index;
  if (match[3] !== "+" && match[3] !== "-") return null;
  return "a" + index + match[3];
}

function loadPadMap() {
  try {
    const raw = localStorage.getItem("mindwar_pad_map_v2");
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    const merged = { ...PAD_DEFAULT_MAP };
    for (const key of Object.keys(PAD_DEFAULT_MAP)) {
      const binding = normalizePadBinding(parsed[key]);
      if (binding) merged[key] = binding;
    }
    padMap = merged;
    try {
      const axes = JSON.parse(localStorage.getItem("mindwar_pad_axes_v2") || "{}");
      padAxisRest = {};
      for (const key of Object.keys(axes)) {
        const idx = Number(key);
        if (Number.isInteger(idx) && idx >= 0 && idx < 32 && Number.isFinite(axes[key])) {
          padAxisRest[idx] = axes[key];
        }
      }
    } catch (e) { padAxisRest = {}; }
    try {
      const sticks = JSON.parse(localStorage.getItem("mindwar_pad_sticks_v2") || "{}");
      padStick = {
        moveRight: { ...PAD_DEFAULT_STICKS.moveRight },
        moveUp: { ...PAD_DEFAULT_STICKS.moveUp },
        lookRight: { ...PAD_DEFAULT_STICKS.lookRight },
        lookDown: { ...PAD_DEFAULT_STICKS.lookDown }
      };
      for (const key of Object.keys(padStick)) {
        const v = sticks[key];
        if (v && Number.isInteger(v.axis) && v.axis >= 0 && v.axis < 32 && (v.sign === 1 || v.sign === -1)) {
          padStick[key] = { axis: v.axis, sign: v.sign };
        }
      }
    } catch (e) {
      padStick = {
        moveRight: { ...PAD_DEFAULT_STICKS.moveRight },
        moveUp: { ...PAD_DEFAULT_STICKS.moveUp },
        lookRight: { ...PAD_DEFAULT_STICKS.lookRight },
        lookDown: { ...PAD_DEFAULT_STICKS.lookDown }
      };
    }
    const stickAxes = [
      padStick.moveRight.axis, padStick.moveUp.axis,
      padStick.lookRight.axis, padStick.lookDown.axis
    ];
    const validSticks = new Set(stickAxes).size === 4;
    if (!validSticks) {
      padStick = {
        moveRight: { ...PAD_DEFAULT_STICKS.moveRight },
        moveUp: { ...PAD_DEFAULT_STICKS.moveUp },
        lookRight: { ...PAD_DEFAULT_STICKS.lookRight },
        lookDown: { ...PAD_DEFAULT_STICKS.lookDown }
      };
    }
    padSetupSaved = validSticks;
    return true;
  } catch (e) {
    return false;
  }
}

function updatePadSetupUI(status) {
  if (!padSetup) return;
  const step = PAD_SETUP_STEPS[padSetup.step];
  const label = step ? step[1] : "";
  const isStick = step && step[2] === "stick";
  $("pad-setup-action").textContent = step ? (isStick ? label : "PRESS " + label) : "DONE";
  $("pad-setup-help").textContent = step
    ? (isStick
      ? `Release the stick, then ${label.toLowerCase()} and hold it briefly.`
      : `Release any held buttons or triggers, then press or pull the control you want for ${label.toLowerCase()}.`)
    : "Controller mapping saved.";
  $("pad-setup-step").textContent = String(Math.min(padSetup.step + 1, PAD_SETUP_STEPS.length)).padStart(2, "0");
  $("pad-setup-total").textContent = String(PAD_SETUP_STEPS.length);
  $("pad-setup-status").textContent = status;
}

function startPadSetup() {
  stopGamepadInput();
  padSetup = {
    step: 0, map: { ...padMap }, axisRest: { ...padAxisRest },
    stick: {
      moveRight: { ...padStick.moveRight },
      moveUp: { ...padStick.moveUp },
      lookRight: { ...padStick.lookRight },
      lookDown: { ...padStick.lookDown }
    },
    baseline: null, axisBaseline: null, waitRelease: null, blocked: null, centerTimer: 0
  };
  $("pad-setup-screen").classList.remove("hidden");
  updatePadSetupUI("WAITING FOR A CONTROLLER…");
}

function stopGamepadInput() {
  for (const key of Object.keys(padHeld)) {
    if (padHeld[key]) {
      input[key] = false;
      padHeld[key] = false;
    }
  }
  input.fire = false;
  input.ads = false;
}

function skipPadSetupStep() {
  if (!padSetup) return;
  padSetup.step++;
  if (padSetup.step >= PAD_SETUP_STEPS.length) {
    finishPadSetup(false, true);
    return;
  }
  padSetup.waitRelease = null;
  padSetup.baseline = null;
  padSetup.axisBaseline = null;
  padSetup.centerTimer = 0;
  updatePadSetupUI("WAITING FOR INPUT…");
}

function finishPadSetup(useDefaults = false, save = true) {
  if (save) {
    if (useDefaults) {
      padMap = { ...PAD_DEFAULT_MAP };
      padAxisRest = {};
      padStick = {
        moveRight: { ...PAD_DEFAULT_STICKS.moveRight },
        moveUp: { ...PAD_DEFAULT_STICKS.moveUp },
        lookRight: { ...PAD_DEFAULT_STICKS.lookRight },
        lookDown: { ...PAD_DEFAULT_STICKS.lookDown }
      };
    } else if (padSetup) {
      padMap = { ...padSetup.map };
      padAxisRest = { ...padSetup.axisRest };
      padStick = {
        moveRight: { ...padSetup.stick.moveRight },
        moveUp: { ...padSetup.stick.moveUp },
        lookRight: { ...padSetup.stick.lookRight },
        lookDown: { ...padSetup.stick.lookDown }
      };
    }
    try {
      localStorage.setItem("mindwar_pad_map_v2", JSON.stringify(padMap));
      localStorage.setItem("mindwar_pad_axes_v2", JSON.stringify(padAxisRest));
      localStorage.setItem("mindwar_pad_sticks_v2", JSON.stringify(padStick));
    } catch (e) { /* ignore */ }
    padSetupSaved = true;
    setInputMode("pad");
  }
  padSetup = null;
  padPrev = [];
  $("pad-setup-screen").classList.add("hidden");
}

function updatePadSetup(gp, dt) {
  if (!padSetup) return;
  if (!gp) {
    updatePadSetupUI("CONNECT A CONTROLLER, THEN PRESS A BUTTON");
    return;
  }
  const buttonActive = i => !!(gp.buttons[i] && (gp.buttons[i].pressed || (gp.buttons[i].value || 0) > 0.6));

  if (padSetup.waitRelease) {
    const rel = padSetup.waitRelease;
    let released = false;
    if (rel.type === "button") {
      released = !buttonActive(rel.index);
    } else {
      const base = padSetup.axisBaseline ? (padSetup.axisBaseline[rel.index] || 0) : 0;
      const delta = (gp.axes[rel.index] || 0) - base;
      released = Math.abs(delta) < 0.25;
    }
    if (released) {
      padSetup.waitRelease = null;
      padSetup.step++;
      if (padSetup.step >= PAD_SETUP_STEPS.length) {
        finishPadSetup(false, true);
        return;
      }
      padSetup.baseline = gp.buttons.map((b, i) => buttonActive(i));
      padSetup.axisBaseline = Array.from(gp.axes);
      padSetup.centerTimer = 0;
      updatePadSetupUI("WAITING FOR INPUT…");
    }
    return;
  }

  const stepDef = PAD_SETUP_STEPS[padSetup.step];
  const action = stepDef[0];
  const kind = stepDef[2] || "action";

  if (!padSetup.baseline) {
    if (kind === "stick") {
      let centered = true;
      for (let i = 0; i < gp.axes.length; i++) {
        const value = gp.axes[i] || 0;
        // Ignore unusual axes that rest far outside the normal stick range.
        if (Math.abs(value) <= 1.8 && Math.abs(value) > 0.4) centered = false;
      }
      if (!centered) {
        padSetup.centerTimer = 0;
        updatePadSetupUI("RELEASE / CENTER THE STICK TO BEGIN");
        return;
      }
      padSetup.centerTimer += dt;
      if (padSetup.centerTimer < 0.25) {
        updatePadSetupUI("HOLD THE STICK CENTERED…");
        return;
      }
    }
    padSetup.baseline = gp.buttons.map((b, i) => buttonActive(i));
    padSetup.axisBaseline = Array.from(gp.axes);
    if (!padSetup.blocked) {
      padSetup.blocked = new Set();
      for (let i = 0; i < gp.buttons.length; i++) {
        if (buttonActive(i)) padSetup.blocked.add(i);
      }
    }
    updatePadSetupUI(kind === "stick" ? `NOW ${stepDef[1]}` : "RELEASE ANY HELD BUTTONS, THEN PRESS THE MAPPED BUTTON");
    return;
  }

  for (let i = 0; i < gp.buttons.length; i++) {
    if (!buttonActive(i) && padSetup.baseline[i]) padSetup.baseline[i] = false;
  }

  if (kind !== "stick") {
    for (let i = 0; i < gp.buttons.length; i++) {
      if (padSetup.blocked && padSetup.blocked.has(i)) continue;
      if (buttonActive(i) && !padSetup.baseline[i]) {
        padSetup.map[action] = "b" + i;
        padSetup.waitRelease = { type: "button", index: i };
        updatePadSetupUI(`DETECTED BUTTON ${i + 1} — RELEASE TO CONTINUE`);
        return;
      }
    }
  }

  const allowAxis = kind === "stick" ||
    action === "fire" || action === "aim" || action === "switchPrev" || action === "switchNext";
  if (allowAxis) {
    const stickAxes = new Set(Object.values(padSetup.stick).map(s => s.axis));
    for (let i = 0; i < gp.axes.length; i++) {
      const base = padSetup.axisBaseline[i] || 0;
      const current = gp.axes[i] || 0;
      // Unusual axes that rest far outside a normal stick range are ignored
      // during stick calibration.
      if (kind === "stick" && (Math.abs(base) > 1.5 || Math.abs(current) > 1.5)) continue;
      // Once sticks are calibrated, stick axes are reserved for movement/look
      // and cannot be reassigned as action buttons.
      if (kind !== "stick" && stickAxes.has(i)) continue;
      const delta = current - base;
      if (Math.abs(delta) > (kind === "stick" ? 0.45 : 0.55)) {
        const binding = "a" + i + (delta > 0 ? "+" : "-");
        if (kind === "stick") {
          padSetup.stick[action] = { axis: i, sign: delta > 0 ? 1 : -1 };
        } else {
          padSetup.map[action] = binding;
        }
        padSetup.axisRest[i] = base;
        padSetup.waitRelease = { type: "axis", index: i };
        updatePadSetupUI(`DETECTED AXIS ${i + 1} ${delta > 0 ? "+" : "-"} — RELEASE TO CONTINUE`);
        return;
      }
    }
  }
}

let mapReturn = "playing";
let battleConfirmIndex = -1;
let battleConfirmReturn = "playing";
let locked = false;
let fallbackLook = false;
let draggingLook = false;
let lastMouseX = null;
let lastMouseY = null;
let menuT = 0;
let introActive = false;
let introT = 0;
let introLines = [];
let introIndex = 0;
const INTRO_LINE_COUNT = 3;
const INTRO_CAMERA_TIME = 9.5;
let lastBeacon = { x: START_X, z: START_Z, yaw: 0 };
let sessionStart = Date.now();
let saveTimer = 0;
let lastSaveAt = 0;
let regionMusicTimer = 0;
let autoBattleTimer = 0;
let gameStarted = false;
let victorySeen = false;
let lowHealthWarned = false;
let ending = null;
let frameCount = 0;
let fpsTime = 0;

const enemies = new EnemyManager({
  scene, world, effects, audio, hud, player: null, pickups: null,
  callbacks: {
    onZoneClear: (zone, stats) => {
      if (!stats.final) {
        const spot = safeSpawn(zone.x, zone.z + 18);
        lastBeacon = { x: spot.x, z: spot.z, yaw: 0 };
        hud.toast("RESUPPLY", "HEALTH + AMMO CACHE AT THE BEACON", "green");
        coop.grantUpgrade(zone);
        saveGame();
      } else {
        clearSave();
      }
    },
    onVictory: () => { if (state === "playing") showVictory(); },
    onFinale: (zone, bossPos) => {
      coop.sendFinale(zone.index, bossPos);
      startEndingSequence(zone, bossPos);
    },
    onBattleStart: (zone) => {
      if (state === "playing") {
        audio.setMusicMode(battleMusicMode(zone ? zone.index : enemies.activeIndex));
        audio.setMusicDucked(false);
      }
    },
    onBattleEnd: () => {
      if (state === "playing") {
        audio.setMusicMode(regionMusicMode());
        audio.setMusicDucked(false);
      }
    },
    onKill: () => { },
    onRecruit: () => saveGame(),
    onRequestBattle: index => openBattleConfirm(index)
  }
});

const player = new Player({
  camera, scene, world, enemies, effects, audio, hud,
  onDeath: () => {
    if (state !== "playing") return;
    if (coop.active) coop.playerDowned();
    else showDeath();
  }
});

const pickups = new PickupManager({ scene, player, weapons: player.weapons, hud, audio, world });
enemies.setPickups(pickups);

/* ---------------------------------- co-op ---------------------------------- */
function finishIntro() {
  if (!introActive) return;
  introActive = false;
  const intro = $("intro-screen");
  if (intro) {
    intro.classList.add("intro-done");
    setTimeout(() => intro.classList.add("hidden"), 760);
  }
  $("start-screen")?.classList.remove("hidden");
}

function renderIntroLine() {
  const lines = [...document.querySelectorAll("#intro-dialogue-lines .intro-line")];
  lines.forEach((el, i) => {
    const active = i === introIndex;
    el.classList.toggle("is-active", active);
    el.setAttribute("aria-hidden", active ? "false" : "true");
  });
  const last = introIndex >= introLines.length - 1;
  const next = $("btn-intro-next");
  if (next) next.innerHTML = last ? 'ENTER <span>›</span>' : 'NEXT <span>›</span>';
  const progress = $("intro-progress");
  if (progress) progress.textContent = `TRANSMISSION ${introIndex + 1} / ${introLines.length}`;
  const hint = $("intro-next-hint");
  if (hint) hint.textContent = last ? "ENTER THE OPERATION" : "READ, THEN PRESS NEXT";
}

function introNext() {
  if (!introActive) return;
  if (introIndex < introLines.length - 1) {
    introIndex++;
    renderIntroLine();
  } else {
    finishIntro();
  }
}

function buildIntroDialogue() {
  const wrap = $("intro-dialogue-lines");
  if (!wrap) return;
  wrap.innerHTML = "";
  introLines = [];
  const seen = new Set();
  for (let i = 0; i < INTRO_LINE_COUNT; i++) {
    let line = maraLine("intro");
    let guard = 0;
    while (seen.has(line) && guard++ < 12) line = maraLine("intro");
    seen.add(line);
    introLines.push(line);
    const el = document.createElement("div");
    el.className = "intro-line";
    el.textContent = line;
    wrap.appendChild(el);
  }
  introIndex = 0;
  renderIntroLine();
}

function initIntro() {
  const params = new URLSearchParams(location.search);
  const skip = params.has("room") || params.has("reset") || params.has("nointro");
  const intro = $("intro-screen");
  const start = $("start-screen");
  if (skip) {
    introActive = false;
    intro?.classList.add("hidden");
    if (!params.has("room")) start?.classList.remove("hidden");
    return;
  }
  introActive = true;
  introT = 0;
  intro?.classList.remove("hidden", "intro-done");
  start?.classList.add("hidden");
  buildIntroDialogue();
  $("btn-intro-next")?.addEventListener("click", introNext);
  $("btn-intro-skip")?.addEventListener("click", finishIntro);
}

function startCoopOperation(role) {
  $("start-screen").classList.add("hidden");
  $("mp-screen").classList.add("hidden");
  $("death-screen").classList.add("hidden");
  $("victory-screen").classList.add("hidden");
  setInputMode("kb");
  victorySeen = false;
  state = "playing";
  newOperation();
  audio.startMusic(regionMusicMode());
  audio.setMusicDucked(false);
  hud.banner(
    "CO-OP OPERATION",
    "HUMAN SQUAD + MARA",
    "MARA PROVIDES AI FIRE SUPPORT // F SHARES SUPPLIES // FIELD REFITS AFTER EACH CHECKPOINT",
    false
  );
  hud.toast(
    "CO-OP UPLINK",
    role === "host" ? "YOU ARE THE HOST // ENEMY AUTHORITY" : "CONNECTED TO THE HOST",
    "green"
  );
  hud.comms(
    "MARA",
    `${maraLine("coop")} Hold E near a downed teammate to revive them.`,
    9500
  );
  requestLock();
}



/* --------------------------------- helpers -------------------------------- */
function formatTime(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return (h > 0 ? h + ":" : "") + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

function fillStats(el, rows) {
  el.innerHTML = "";
  for (const [value, label] of rows) {
    const d = document.createElement("div");
    const s = document.createElement("strong");
    s.textContent = value;
    const l = document.createElement("span");
    l.textContent = label;
    d.append(s, l);
    el.appendChild(d);
  }
}

function safeSpawn(x, z) {
  for (let rad = 0; rad <= 28; rad += 2.5) {
    const steps = rad === 0 ? 1 : 14;
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const sx = x + Math.cos(a) * rad;
      const sz = z + Math.sin(a) * rad;
      const y = world.surfaceY(sx, sz);
      if (y <= 7 && !world.collidesBox(sx, y + 0.25, sz, 0.4, 1.8)) {
        return { x: sx, y: y + 0.15, z: sz };
      }
    }
  }
  return { x, y: world.surfaceY(x, z) + 0.15, z };
}

function enableLookFallback() {
  if (locked) return;
  fallbackLook = true;
  $("deploy-hint").textContent = "MOUSE CAPTURE BLOCKED · HOLD RIGHT MOUSE + DRAG TO LOOK";
}

function requestLock() {
  if (inputMode === "pad") return;
  if (document.pointerLockElement === canvas) return;
  try {
    const p = canvas.requestPointerLock();
    if (p && p.catch) p.catch(enableLookFallback);
  } catch (e) {
    enableLookFallback();
  }
  // If the browser silently ignores the request, switch to drag-look.
  setTimeout(() => {
    if (state === "playing" && document.pointerLockElement !== canvas) {
      enableLookFallback();
    }
  }, 550);
}

function slotKey(slot) { return `${SAVE_PREFIX}${slot}`; }

function readActiveSlot() {
  const n = Number(localStorage.getItem(ACTIVE_SLOT_KEY));
  return Number.isInteger(n) && n >= 0 && n < WORLD_COUNT ? n : 0;
}

let activeSlot = readActiveSlot();
let existingSave = null;

function setActiveSlot(slot) {
  activeSlot = Math.max(0, Math.min(WORLD_COUNT - 1, slot | 0));
  localStorage.setItem(ACTIVE_SLOT_KEY, String(activeSlot));
  refreshContinueButton();
}

function readSave(slot = activeSlot) {
  try {
    const raw = localStorage.getItem(slotKey(slot));
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data) return null;
    if (data.v === 1 && Array.isArray(data.cleared)) {
      const cleared = [...new Set([0, 1, ...data.cleared.map(i => i + 2)])].sort((a, b) => a - b);
      return { ...data, v: 2, cleared };
    }
    if (data.v !== 2 || !Array.isArray(data.cleared)) return null;
    return data;
  } catch (e) {
    return null;
  }
}

function clearSave(slot = activeSlot) {
  try { localStorage.removeItem(slotKey(slot)); } catch (e) { /* ignore */ }
}

function migrateLegacySave() {
  try {
    if (localStorage.getItem(slotKey(0))) return;
    const raw = localStorage.getItem(LEGACY_SAVE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data && data.v === 1 && Array.isArray(data.cleared)) {
      localStorage.setItem(slotKey(0), raw);
    }
    localStorage.removeItem(LEGACY_SAVE_KEY);
  } catch (e) { /* ignore */ }
}

function refreshContinueButton() {
  existingSave = readSave(activeSlot);
  const btn = $("btn-continue");
  if (!btn) return;
  btn.classList.toggle("hidden", !existingSave);
  if (existingSave) {
    const info = $("continue-info");
    if (info) {
      info.textContent = `WORLD ${String(activeSlot + 1).padStart(2, "0")} · ${existingSave.cleared.length} / 35 SECURED · ${existingSave.kills || 0} KILLS`;
    }
  }
}

function saveGame() {
  if (coop.active) return;
  if (!gameStarted || state === "dead" || state === "victory") return;
  try {
    const data = {
      v: 2,
      ts: Date.now(),
      player: player.getSaveData(),
      cleared: enemies.states.filter(s => s.cleared).map(s => s.zone.index),
      allies: enemies.allies.map(a => a.name),
      kills: enemies.kills,
      elapsed: Date.now() - sessionStart
    };
    localStorage.setItem(slotKey(activeSlot), JSON.stringify(data));
    localStorage.setItem(ACTIVE_SLOT_KEY, String(activeSlot));
    lastSaveAt = Date.now();
  } catch (e) { /* storage can fail */ }
}

migrateLegacySave();
refreshContinueButton();

hud.drawStartMap();

/* ---------------------------------- menu ---------------------------------- */
player.weapons.root.visible = false;
hud.show(false);

function menuCamera() {
  menuT += 0.016;
  const x = START_X + Math.sin(menuT * 0.09) * 15;
  const z = START_Z + 9 + Math.cos(menuT * 0.07) * 9;
  const y = world.surfaceY(x, z) + 7.8;
  camera.position.set(x, y, z);
  camera.lookAt(START_X - 3, 9, START_Z - 58);
  camera.fov = 78;
  camera.updateProjectionMatrix();
}

/* -------------------------------- finale ---------------------------------- */
let fireTexture = null;
function makeFireTexture() {
  if (fireTexture) return fireTexture;
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 256;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, 64, 256);
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(Math.random() * 64);
    const w = 1 + Math.floor(Math.random() * 4);
    const y = Math.random() * 180;
    const h = 40 + Math.random() * 90;
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.28, `rgba(255,${180 + Math.floor(Math.random() * 60)},90,${0.35 + Math.random() * 0.3})`);
    g.addColorStop(0.7, `rgba(255,${120 + Math.floor(Math.random() * 60)},30,${0.25 + Math.random() * 0.25})`);
    g.addColorStop(1, "rgba(255,70,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  }
  // A hot vertical core through the texture.
  const core = ctx.createLinearGradient(28, 0, 36, 0);
  core.addColorStop(0, "rgba(255,220,150,0)");
  core.addColorStop(0.5, "rgba(255,250,220,0.55)");
  core.addColorStop(1, "rgba(255,220,150,0)");
  ctx.fillStyle = core;
  ctx.fillRect(26, 0, 12, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  fireTexture = tex;
  return tex;
}

function createMountainMesh() {
  const group = new THREE.Group();
  group.name = "finale-mountain";
  const makeCone = (radius, height, segments, color, baseOffset, seed, emissive = 0x05080b) => {
    const geo = new THREE.ConeGeometry(radius, height, segments, 6, false);
    const pos = geo.attributes.position;
    let s = seed;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const f = 0.86 + rnd() * 0.28;
      pos.setX(i, x * f);
      pos.setZ(i, z * f);
      if (y < 0) pos.setY(i, y + (rnd() - 0.5) * height * 0.06);
    }
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color, flatShading: true, emissive }));
    mesh.position.y = baseOffset + height / 2;
    return mesh;
  };
  group.add(makeCone(150, 300, 13, 0x667684, 0, 7331, 0x0a1218));
  group.add(makeCone(105, 190, 11, 0x536372, 70, 991, 0x081018));
  group.add(makeCone(95, 150, 10, 0xf2fbff, 150, 2243, 0x4a5f6b));

  // Rugged underside so the descending mass never reads as a flat saucer.
  const under = new THREE.Mesh(
    new THREE.ConeGeometry(150, 140, 13, 6, false),
    new THREE.MeshLambertMaterial({ color: 0x3a444f, flatShading: true, emissive: 0x05080b })
  );
  under.rotation.x = Math.PI;
  under.position.y = -70;
  group.add(under);

  group.rotation.y = Math.PI * 0.17;
  return group;
}

function startEndingSequence(zone, bossPos) {
  if (state === "ending" || state === "victory" || ending) return;
  state = "ending";
  document.exitPointerLock?.();
  for (const k of Object.keys(input)) input[k] = false;
  player.weapons.root.visible = false;
  world.markerGroup.visible = false;
  hud.show(false);
  hud.hideBoss();
  hud.setPrompt(null);

  const origin = new THREE.Vector3(
    bossPos?.x ?? zone.x,
    (bossPos?.y ?? world.surfaceY(zone.x, zone.z)) + 1.4,
    bossPos?.z ?? zone.z
  );
  const dx = origin.x - player.pos.x;
  const dz = origin.z - player.pos.z;
  const len = Math.hypot(dx, dz) || 1;
  const dir = new THREE.Vector3(dx / len, 0, dz / len);
  player.yaw = Math.atan2(-dx, -dz);
  player.pitch = 0.04;
  player.updateCamera(0);

  const mountainPos = new THREE.Vector3(
    player.pos.x + dir.x * 230,
    0,
    player.pos.z + dir.z * 230
  );

  // The Director is ended by a column of light from the breaking sky. There is
  // no figure: the light itself is the event, and the mountain does the rest.
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 3.2, 1, 12, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xfff4cf, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false,
      side: THREE.DoubleSide, fog: false
    })
  );
  beam.visible = false;
  scene.add(beam);

  applySkyBlend(0);
  ending = {
    t: 0, origin, mountainPos, beam,
    bossGroup: bossPos?.group || null, bossHidden: false,
    shake: 0.012, mountain: null, ring: null, landed: false
  };
  audio.bossRoar();
}

function updateEnding(dt) {
  if (!ending) return;
  ending.t += dt;
  const t = ending.t;

  // Look up at the light breaking through the sky, then hold on the mountain
  // while it settles. The camera barely shakes: this is a gentle arrival.
  const look = t < 2.6
    ? 0.04 + 0.48 * Math.min(1, t / 1.8)
    : t < 11.4
      ? 0.52
      : 0.52 + (0.24 - 0.52) * Math.min(1, (t - 11.4) / 2.2);
  player.pitch = look;

  if (ending.beam) {
    const to = ending.origin.clone();
    to.y += 2.4;
    const from = new THREE.Vector3(to.x, to.y + 86, to.z);
    const dir = to.clone().sub(from);
    const dist = dir.length();
    ending.beam.position.copy(from).addScaledVector(dir, 0.5);
    ending.beam.scale.set(1, Math.max(0.01, dist), 1);
    ending.beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    const opening = Math.min(1, Math.max(0, (t - 1.0) / 1.1));
    const closing = 1 - Math.min(1, Math.max(0, (t - 2.8) / 0.7));
    ending.beam.material.opacity = 0.58 * opening * closing;
    ending.beam.visible = ending.beam.material.opacity > 0.02;
  }

  if (t >= 2.8 && !ending.bossHidden) {
    ending.bossHidden = true;
    if (ending.bossGroup) ending.bossGroup.visible = false;
    const blast = ending.origin.clone();
    blast.y += 2.5;
    effects.muzzle(blast, 0xffffff, 16);
    effects.burst(blast, 0xfff3c4, 100, 14, 2);
    effects.burst(blast, 0xffffff, 50, 8, 1);
    audio.explosion();
  }

  // The red occupation sky breaks into clear blue once Vex is gone.
  const blue = t < 2.8 ? 0 : Math.min(1, (t - 2.8) / 5.4);
  applySkyBlend(blue);

  if (t >= 3.8 && !ending.mountain) {
    ending.mountain = createMountainMesh();
    ending.mountain.position.copy(ending.mountainPos);
    ending.mountain.position.y = 280;
    scene.add(ending.mountain);
    audio.setMusicMode("title");
    audio.setMusicDucked(false);
  }

  if (ending.mountain && !ending.landed) {
    const p = Math.max(0, Math.min(1, (t - 3.8) / 10.8));
    const e = p * p * (3 - 2 * p);
    ending.mountain.position.y = 280 * (1 - e);
    if (p >= 1) {
      ending.landed = true;
      ending.shake = 0.02;
      audio.zoneClear();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const p2 = new THREE.Vector3(
          ending.mountainPos.x + Math.cos(a) * 112,
          2,
          ending.mountainPos.z + Math.sin(a) * 112
        );
        effects.burst(p2, 0xe8f4f8, 18, 5, 1.5);
      }
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(122, 134, 64),
        new THREE.MeshBasicMaterial({
          color: 0xf4fbff, transparent: true, opacity: 0.42,
          side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
          depthWrite: false, fog: false
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(ending.mountainPos.x, 1.5, ending.mountainPos.z);
      scene.add(ring);
      ending.ring = { mesh: ring, life: 3.2 };
    }
  }

  if (ending.ring) {
    ending.ring.life -= dt;
    const p = 1 - ending.ring.life / 3.2;
    const s = 1 + p * 1.5;
    ending.ring.mesh.scale.set(s, s, s);
    ending.ring.mesh.material.opacity = Math.max(0, 0.42 * (1 - p));
    if (ending.ring.life <= 0) {
      scene.remove(ending.ring.mesh);
      ending.ring = null;
    }
  }

  ending.shake = Math.max(0.008, ending.shake - dt * 0.08);
  player.shake = ending.shake;
  player.updateCamera(0);

  if (t >= 16.2) {
    ending = null;
    showVictory();
  }
}

/* ------------------------------- new / load ------------------------------- */
function newOperation() {
  clearSave();
  $("downed-screen")?.classList.add("hidden");
  player.weapons.clearProjectiles();
  player.weapons.root.visible = true;
  const start = safeSpawn(START_X, START_Z);
  player.spawn(start.x, start.z, 0);
  enemies.setPlayer(player);
  enemies.updateNext();
  enemies.updateHud();
  player.weapons.switchTo(0);
  lastBeacon = { x: start.x, z: start.z, yaw: 0 };
  sessionStart = Date.now();
  gameStarted = true;
  victorySeen = false;
  hud.show(true);
  hud.hideBoss();
  hud.setPrompt(null);
  hud.banner("OPERATION BREAKWATER", "ECHO COMPANY", "2-MAN SQUAD // ONE CONTINUOUS SPRAWL", false);
  hud.comms("MARA", maraLine("intro"), 7600);
  setTimeout(() => {
    if (state === "playing") hud.comms("DIRECTOR VEX", "Echo Company. Twenty minds in the sprawl I cannot hear. How delightfully temporary.", 7600);
  }, 7600);
  saveGame();
}

function continueOperation(save) {
  player.weapons.root.visible = true;
  player.restore(save.player);
  if (player.collidesAt(player.pos.x, player.pos.y, player.pos.z)) {
    const s = safeSpawn(START_X, START_Z);
    player.pos.set(s.x, s.y, s.z);
  }
  enemies.setPlayer(player);
  enemies.applyCleared(save.cleared);
  enemies.restoreAllies(Array.isArray(save.allies) && save.allies.length ? save.allies : ["MARA", "JAX"]);
  enemies.kills = save.kills || 0;
  enemies.updateNext();
  enemies.updateHud();
  const lastIdx = save.cleared.length ? Math.max(...save.cleared) : -1;
  if (lastIdx >= 0) {
    const z = ZONES[lastIdx];
    const spot = safeSpawn(z.x, z.z + 18);
    lastBeacon = { x: spot.x, z: spot.z, yaw: 0 };
  } else {
    const spot = safeSpawn(START_X, START_Z);
    lastBeacon = { x: spot.x, z: spot.z, yaw: 0 };
  }
  sessionStart = Date.now() - (save.elapsed || 0);
  gameStarted = true;
  hud.show(true);
  hud.hideBoss();
  hud.setPrompt(null);
  hud.banner("OPERATION RESTORED", "ECHO COMPANY", `${save.cleared.length} / 35 CHECKPOINTS SECURED`, true);
  hud.comms("MARA", `Back on the net, Captain. ${save.cleared.length} of 35 checkpoints dark. Vex knows we're still breathing.`, 6400);
  saveGame();
}

function deploy(useSave, save = readSave(activeSlot)) {
  audio.ensure();
  audio.startAmbience();
  $("start-screen").classList.add("hidden");
  if (useSave && save) continueOperation(save);
  else newOperation();
  state = "playing";
  audio.startMusic(currentMusicMode());
  audio.setMusicDucked(false);
  sessionStart = Date.now() - (useSave && save ? save.elapsed || 0 : 0);
  requestLock();
  saveGame();
}

/* ------------------------------ world archive ----------------------------- */
function firstEmptyWorld() {
  if (!readSave(activeSlot)) return activeSlot;
  for (let i = 0; i < WORLD_COUNT; i++) {
    if (!readSave(i)) return i;
  }
  return -1;
}

function deployNewWorld() {
  const slot = firstEmptyWorld();
  if (slot < 0) {
    openCampaignScreen("ALL FIVE WORLDS ARE FULL // LOAD ONE OR DELETE A WORLD.");
    return;
  }
  setActiveSlot(slot);
  clearSave(slot);
  $("campaign-screen")?.classList.add("hidden");
  deploy(false);
}

function startFromMenu() {
  if (readSave(activeSlot)) deploy(true);
  else deployNewWorld();
}

function openCampaignScreen(message = "") {
  if (state !== "menu") return;
  state = "campaigns";
  renderCampaignSlots();
  const status = $("campaign-status");
  if (status) status.textContent = message;
  $("campaign-screen")?.classList.remove("hidden");
  audio.ui();
}

function closeCampaignScreen() {
  if (state !== "campaigns") return;
  $("campaign-screen")?.classList.add("hidden");
  state = "menu";
  refreshContinueButton();
  audio.ui();
}

function renderCampaignSlots() {
  const wrap = $("campaign-slots");
  if (!wrap) return;
  wrap.innerHTML = "";
  for (let i = 0; i < WORLD_COUNT; i++) {
    const save = readSave(i);
    const row = document.createElement("div");
    row.className = "campaign-slot" + (save ? "" : " empty") +
      (save && i === activeSlot ? " active" : "");

    const info = document.createElement("div");
    info.className = "campaign-info";
    const world = document.createElement("div");
    world.className = "campaign-world";
    world.textContent = `WORLD ${String(i + 1).padStart(2, "0")}`;
    if (save && i === activeSlot) {
      const tag = document.createElement("span");
      tag.textContent = "ACTIVE";
      world.appendChild(tag);
    }
    const meta = document.createElement("div");
    meta.className = "campaign-meta";
    if (save) {
      const lastIdx = save.cleared.length ? Math.max(...save.cleared) : -1;
      const where = lastIdx >= 0 ? ZONES[lastIdx].name.toUpperCase() : "HARROW FIELDS";
      meta.textContent = `${save.cleared.length} / 35 SECURED · ${save.kills || 0} KILLS · ${where}`;
    } else {
      meta.textContent = "EMPTY WORLD // READY FOR DEPLOYMENT";
    }
    info.append(world, meta);
    if (save) {
      const date = document.createElement("div");
      date.className = "campaign-date";
      date.textContent = `LAST PLAYED ${new Date(save.ts || Date.now()).toLocaleDateString("en-US")}`;
      info.appendChild(date);
    }

    const actions = document.createElement("div");
    actions.className = "campaign-actions";
    if (save) {
      const load = document.createElement("button");
      load.className = "btn primary";
      load.textContent = "LOAD";
      load.addEventListener("click", () => {
        audio.ui();
        setActiveSlot(i);
        closeCampaignScreen();
        deploy(true, readSave(i));
      });
      const del = document.createElement("button");
      del.className = "btn danger";
      del.textContent = "DELETE";
      del.addEventListener("click", () => {
        if (!window.confirm(`Delete WORLD ${String(i + 1).padStart(2, "0")}? This cannot be undone.`)) return;
        clearSave(i);
        if (i === activeSlot) refreshContinueButton();
        renderCampaignSlots();
        const status = $("campaign-status");
        if (status) status.textContent = `WORLD ${String(i + 1).padStart(2, "0")} DELETED.`;
        audio.ui();
      });
      actions.append(load, del);
    } else {
      const start = document.createElement("button");
      start.className = "btn primary";
      start.textContent = "START";
      start.addEventListener("click", () => {
        audio.ui();
        setActiveSlot(i);
        clearSave(i);
        closeCampaignScreen();
        deploy(false);
      });
      actions.appendChild(start);
    }

    row.append(info, actions);
    wrap.appendChild(row);
  }
}

/* --------------------------------- pause ---------------------------------- */
function pauseGame() {
  if (state !== "playing") return;
  state = "paused";
  mouseFire = false;
  mouseAds = false;
  input.fire = false;
  input.ads = false;
  input.forward = input.back = input.left = input.right = false;
  input.sprint = false;
  input.reviveHeld = false;
  document.exitPointerLock?.();
  audio.setMusicMode("title");
  audio.setMusicDucked(true);
  $("pause-screen").classList.remove("hidden");
  hud.setPrompt(null);
  fillStats($("pause-stats"), [
    [String(enemies.states.filter(s => s.cleared).length).padStart(2, "0") + " / 35", "CHECKPOINTS"],
    [String(enemies.kills), "CONFIRMED KILLS"],
    [String(enemies.allies.filter(a => !a.downed).length + 1), "SQUAD ACTIVE"],
    [formatTime(Date.now() - sessionStart), "OPERATION TIME"]
  ]);
}

function battleActive() {
  return enemies.states.some(s => s.active && !s.cleared);
}

function battleMusicMode(index = enemies.activeIndex) {
  if (index >= ZONE_COUNT - 2) return "final";
  if (index < 2) return "battle2";
  return index % 2 === 0 ? "battle" : "battle2";
}

function regionMusicMode() {
  if (enemies.nextIndex < 2) return "title";
  const region = nearestZone(player.pos.x, player.pos.z).zone.region;
  if (region === "beginning") return "title";
  if (region === "suburb") return "suburb";
  if (region === "city") return "city";
  return "farm";
}

function currentMusicMode() {
  return battleActive() ? battleMusicMode() : regionMusicMode();
}

function resumeGame() {
  if (state !== "paused" && state !== "map") return;
  $("pause-screen").classList.add("hidden");
  $("map-screen").classList.add("hidden");
  audio.setMusicMode(currentMusicMode());
  audio.setMusicDucked(false);
  state = "playing";
  requestLock();
}

function openMap() {
  if (state === "map") { closeMap(); return; }
  if (state !== "playing" && state !== "paused") return;
  mapReturn = state;
  state = "map";
  document.exitPointerLock?.();
  audio.setMusicMode("title");
  audio.setMusicDucked(true);
  $("pause-screen").classList.add("hidden");
  $("map-screen").classList.remove("hidden");
  hud.setPrompt(null);
  drawMap();
}

function closeMap() {
  if (state !== "map") return;
  $("map-screen").classList.add("hidden");
  if (mapReturn === "paused") {
    state = "paused";
    audio.setMusicMode("title");
    audio.setMusicDucked(true);
    $("pause-screen").classList.remove("hidden");
  } else {
    state = "playing";
    audio.setMusicMode(currentMusicMode());
    audio.setMusicDucked(false);
    requestLock();
  }
}

/* ---------------------------- battle confirmation ------------------------- */
function requestBattle(index) {
  const zoneState = enemies.states[index];
  if (!zoneState) return;
  if (zoneState.cleared) {
    hud.toast("ALREADY SECURED", `${zoneState.zone.name.toUpperCase()} IS CLEAR`, "green");
    return;
  }
  if (index !== enemies.nextIndex) {
    hud.toast("CHECKPOINT SEALED", "Clear the current stronghold first.", "red");
    return;
  }
  if (battleActive()) {
    hud.toast("BATTLE IN PROGRESS", "Finish this checkpoint before starting another.", "amber");
    return;
  }
  if (coop.active && !coop.isHost) {
    hud.toast("HOST ONLY", "The host starts checkpoint battles.", "amber");
    return;
  }
  openBattleConfirm(index);
}

function openBattleConfirm(index) {
  if (state !== "playing" && state !== "map" && state !== "paused") return;
  const zoneState = enemies.states[index];
  if (!zoneState || zoneState.cleared) return;
  if (battleActive()) return;
  battleConfirmIndex = index;
  battleConfirmReturn = state;
  if (state === "map") $("map-screen").classList.add("hidden");
  if (state === "paused") $("pause-screen").classList.add("hidden");
  state = "confirm";
  document.exitPointerLock?.();
  hud.setPrompt(null);
  audio.setMusicDucked(true);
  const name = $("battle-confirm-name");
  const meta = $("battle-confirm-meta");
  if (name) name.textContent = zoneState.zone.name.toUpperCase();
  if (meta) {
    meta.textContent =
      `${zoneState.zone.regionName.toUpperCase()} // ${enemies.totalFor(zoneState)} HOSTILES // CHECKPOINT ${String(zoneState.zone.id).padStart(2, "0")}`;
  }
  $("battle-confirm").classList.remove("hidden");
  audio.ui();
}

function cancelBattleConfirm() {
  if (state !== "confirm") return;
  $("battle-confirm").classList.add("hidden");
  const back = battleConfirmReturn;
  battleConfirmIndex = -1;
  if (back === "map") {
    state = "map";
    $("map-screen").classList.remove("hidden");
    audio.setMusicMode("title");
    audio.setMusicDucked(true);
  } else if (back === "paused") {
    state = "paused";
    $("pause-screen").classList.remove("hidden");
    audio.setMusicMode("title");
    audio.setMusicDucked(true);
  } else {
    state = "playing";
    audio.setMusicMode(currentMusicMode());
    audio.setMusicDucked(false);
    requestLock();
  }
  audio.ui();
}

function startConfirmedBattle() {
  if (state !== "confirm") return;
  const index = battleConfirmIndex;
  battleConfirmIndex = -1;
  $("battle-confirm").classList.add("hidden");
  $("map-screen").classList.add("hidden");
  $("pause-screen").classList.add("hidden");
  state = "playing";
  audio.setMusicDucked(false);
  const zoneState = enemies.states[index];
  if (zoneState && !zoneState.cleared) enemies.activateZone(zoneState);
  audio.ui();
  requestLock();
}

function drawMap() {
  hud.drawMap({
    player,
    cleared: new Set(enemies.states.filter(s => s.cleared).map(s => s.zone.index)),
    nextIndex: enemies.nextIndex,
    activeIndex: enemies.activeIndex
  });
}

/* --------------------------------- downed --------------------------------- */
function playerDowned() {
  state = "downed";
  input.fire = false;
  input.ads = false;
  input.forward = input.back = input.left = input.right = false;
  input.sprint = false;
  input.reviveHeld = false;
  document.exitPointerLock?.();
  hud.show(false);
  hud.setPrompt(null);
  $("downed-screen").classList.remove("hidden");
  $("downed-timer").textContent = "30";
  const line = $("downed-line");
  if (line) line.textContent = maraLine("downed");
  const vex = $("downed-vex");
  if (vex) vex.textContent = "";
}

function playerRevived() {
  $("downed-screen").classList.add("hidden");
  player.dead = false;
  player.health = Math.max(400, player.health);
  player.hud.setHealth(player.health);
  player.weapons.refillMags();
  hud.show(true);
  state = "playing";
  requestLock();
}

function playerBleedOut() {
  $("downed-screen").classList.add("hidden");
  showDeath();
}

/* --------------------------------- death ---------------------------------- */
function showDeath() {
  state = "dead";
  player.weapons.clearProjectiles();
  document.exitPointerLock?.();
  audio.setMusicMode("title");
  audio.setMusicDucked(true);
  input.fire = false;
  input.ads = false;
  hud.setPrompt(null);
  hud.show(false);
  fillStats($("death-stats"), [
    [String(enemies.kills), "ELIMINATIONS"],
    [String(enemies.states.filter(s => s.cleared).length) + " / 35", "CHECKPOINTS"],
    [formatTime(Date.now() - sessionStart), "SURVIVED"],
    [Math.round(player.totalDamageTaken).toLocaleString("en-US"), "DAMAGE TAKEN"]
  ]);
  $("death-screen").classList.remove("hidden");
  audio.bossRoar();
}

function redeploy() {
  $("death-screen").classList.add("hidden");
  player.weapons.clearProjectiles();
  for (const k of Object.keys(input)) input[k] = false;
  hud.show(true);
  hud.hideBoss();
  // In co-op the shared battle must survive an individual player's death.
  if (!coop.active) enemies.resetActiveBattle();
  pickups.clear();
  player.respawn();
  const s = safeSpawn(lastBeacon.x, lastBeacon.z);
  player.spawn(s.x, s.z, lastBeacon.yaw || 0);
  player.weapons.refillMags();
  state = "playing";
  audio.setMusicMode(currentMusicMode());
  audio.setMusicDucked(false);
  gameStarted = true;
  hud.setHealth(player.health);
  hud.comms("MARA", "We pulled you back. Beacon's still hot, Captain. Finish it.", 5200);
  requestLock();
  saveGame();
}

/* -------------------------------- victory --------------------------------- */
function showVictory() {
  if (victorySeen) return;
  victorySeen = true;
  state = "victory";
  document.exitPointerLock?.();
  audio.setMusicMode("title");
  audio.setMusicDucked(true);
  input.fire = false;
  hud.setPrompt(null);
  hud.show(false);
  fillStats($("victory-stats"), [
    ["35 / 35", "CHECKPOINTS"],
    [String(enemies.kills), "ELIMINATIONS"],
    [String(enemies.allies.filter(a => !a.downed).length + 1), "SQUAD ALIVE"],
    [formatTime(Date.now() - sessionStart), "OPERATION TIME"]
  ]);
  $("victory-screen").classList.remove("hidden");
  clearSave();
}

/* --------------------------------- input ---------------------------------- */
const input = {
  forward: false, back: false, left: false, right: false,
  sprint: false, jump: false, fire: false, ads: false, reloadPressed: false,
  reviveHeld: false
};
const CONTROLLER_ENABLED = false;
let gamepadActive = false;
let mouseFire = false;
let mouseAds = false;
let padPrev = [];
let padInit = false;
let padFireSuppressed = false;
let padAimSuppressed = false;
let padFireRelease = 0;
let padAimRelease = 0;
const padHeld = {};

const PAD_DEFAULT_MAP = {
  fire: "b5", aim: "b6", jump: "b1", reload: "b0", melee: "b2", interact: "b3",
  grenade: "b4", switchPrev: "b14", switchNext: "b15", pause: "b9", map: "b8"
};
const PAD_DEFAULT_STICKS = {
  moveRight: { axis: 0, sign: 1 },
  moveUp: { axis: 1, sign: -1 },
  lookRight: { axis: 2, sign: 1 },
  lookDown: { axis: 3, sign: 1 }
};
const PAD_SETUP_STEPS = [
  ["moveRight", "PUSH LEFT STICK RIGHT", "stick"],
  ["moveUp", "PUSH LEFT STICK UP", "stick"],
  ["lookRight", "PUSH RIGHT STICK RIGHT", "stick"],
  ["lookDown", "PUSH RIGHT STICK DOWN", "stick"],
  ["fire", "FIRE", "action"],
  ["aim", "AIM", "action"],
  ["jump", "JUMP", "action"],
  ["reload", "RELOAD", "action"],
  ["melee", "MELEE / PUNCH", "action"],
  ["interact", "INTERACT / REVIVE", "action"],
  ["grenade", "GRENADE", "action"],
  ["switchPrev", "PREVIOUS WEAPON", "action"],
  ["switchNext", "NEXT WEAPON", "action"],
  ["pause", "PAUSE / MENU", "action"],
  ["map", "TACTICAL MAP", "action"]
];
let padMap = { ...PAD_DEFAULT_MAP };
let padStick = {
  moveRight: { ...PAD_DEFAULT_STICKS.moveRight },
  moveUp: { ...PAD_DEFAULT_STICKS.moveUp },
  lookRight: { ...PAD_DEFAULT_STICKS.lookRight },
  lookDown: { ...PAD_DEFAULT_STICKS.lookDown }
};
let padAxisRest = {};
let padPrevActions = {};
let padSetup = null;
let padSetupSaved = false;

const keyMap = {
  KeyW: "forward", KeyS: "back", KeyA: "left", KeyD: "right",
  ArrowUp: "forward", ArrowDown: "back", ArrowLeft: "left", ArrowRight: "right"
};
const keyMapByKey = {
  w: "forward", s: "back", a: "left", d: "right",
  W: "forward", S: "back", A: "left", D: "right",
  ArrowUp: "forward", ArrowDown: "back", ArrowLeft: "left", ArrowRight: "right"
};

function updateGamepad(dt) {
  if (!CONTROLLER_ENABLED) {
    for (const key of Object.keys(padHeld)) {
      if (padHeld[key]) {
        input[key] = false;
        padHeld[key] = false;
      }
    }
    gamepadActive = false;
    padPrev = [];
    padPrevActions = {};
    return;
  }
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  let gp = null;
  for (const p of pads) {
    if (p && p.connected) { gp = p; break; }
  }
  const padMode = inputMode === "pad";
  if (padSetup) {
    gamepadActive = !!gp;
    updatePadSetup(gp, dt);
    padPrev = gp ? gp.buttons.map(b => !!b.pressed) : [];
    return;
  }
  gamepadActive = padMode && !!gp;

  if (!gp) {
    for (const key of Object.keys(padHeld)) {
      if (padHeld[key]) {
        input[key] = false;
        padHeld[key] = false;
      }
    }
    input.fire = inputMode === "kb" && state === "playing" ? mouseFire : false;
    input.ads = inputMode === "kb" && state === "playing" ? mouseAds : false;
    padPrev = [];
    padPrevActions = {};
    padInit = false;
    padFireSuppressed = false;
    padAimSuppressed = false;
    padFireRelease = 0;
    padAimRelease = 0;
    return;
  }

  const btn = i => gp.buttons[i] || { pressed: false, value: 0 };
  const just = i => !!btn(i).pressed && !padPrev[i];
  const setPad = (key, active) => {
    if (active) {
      input[key] = true;
      padHeld[key] = true;
    } else if (padHeld[key]) {
      input[key] = false;
      padHeld[key] = false;
    }
  };

  const actionActive = action => {
    const binding = padMap[action];
    if (typeof binding !== "string") return false;
    if (binding[0] === "b") {
      const idx = Number(binding.slice(1));
      const b = btn(idx);
      return b.pressed || (b.value || 0) > 0.6;
    }
    if (binding[0] === "a") {
      const idx = Number(binding.slice(1, -1));
      const sign = binding.endsWith("+") ? 1 : -1;
      return ((gp.axes[idx] || 0) - (padAxisRest[idx] || 0)) * sign > 0.35;
    }
    return false;
  };
  const actionJust = action => actionActive(action) && !padPrevActions[action];

  if (!padMode) {
    // Keyboard/mouse mode: the controller only does one thing — choose
    // controller mode and start from the title screen.
    if (state === "menu" && (just(0) || just(9))) {
      setInputMode("pad");
      if (!padSetupSaved) startPadSetup();
      else startFromMenu();
      padPrev = gp.buttons.map(b => !!b.pressed);
      padPrevActions = {};
      return;
    }
    for (const key of Object.keys(padHeld)) {
      if (padHeld[key]) {
        input[key] = false;
        padHeld[key] = false;
      }
    }
    input.fire = state === "playing" ? mouseFire : false;
    input.ads = state === "playing" ? mouseAds : false;
    padPrev = gp.buttons.map(b => !!b.pressed);
    padPrevActions = {};
    return;
  }

  const axisValue = i => (gp.axes[i] || 0) - (padAxisRest[i] || 0);
  const moveX = axisValue(padStick.moveRight.axis) * padStick.moveRight.sign;
  const moveY = axisValue(padStick.moveUp.axis) * padStick.moveUp.sign;
  const lookX = axisValue(padStick.lookRight.axis) * padStick.lookRight.sign;
  const lookY = axisValue(padStick.lookDown.axis) * padStick.lookDown.sign;
  const dead = 0.22;

  if (state === "playing") {
    const dpadActive = btn(12).pressed || btn(13).pressed || btn(14).pressed || btn(15).pressed ||
      actionActive("switchPrev") || actionActive("switchNext");
    // D-pad is weapon selection only. On some third-party pads it also leaks
    // onto the stick axes, so suppress analog movement while it is pressed.
    setPad("forward", !dpadActive && moveY > dead);
    setPad("back", !dpadActive && moveY < -dead);
    setPad("left", !dpadActive && moveX < -dead);
    setPad("right", !dpadActive && moveX > dead);
    setPad("sprint", !dpadActive && Math.hypot(moveX, moveY) > 0.82);
    setPad("jump", actionActive("jump") || actionActive("reload"));

    const rawPadFire = actionActive("fire");
    const rawPadAim = actionActive("aim");
    if (!padInit) {
      padInit = true;
      // Some third-party pads report a trigger as pressed before it has ever
      // been touched. Suppress it until it has released cleanly for a moment.
      padFireSuppressed = rawPadFire;
      padAimSuppressed = rawPadAim;
      padFireRelease = 0;
      padAimRelease = 0;
    }
    if (padFireSuppressed) {
      if (rawPadFire) {
        padFireRelease = 0;
      } else {
        padFireRelease += dt;
        if (padFireRelease > 0.35) padFireSuppressed = false;
      }
    }
    if (padAimSuppressed) {
      if (rawPadAim) {
        padAimRelease = 0;
      } else {
        padAimRelease += dt;
        if (padAimRelease > 0.35) padAimSuppressed = false;
      }
    }
    const padFire = (!padFireSuppressed && rawPadFire) || btn(5).pressed;
    input.fire = padFire;
    input.ads = padAimSuppressed ? false : rawPadAim;

    if (Math.abs(lookX) > 0.16 || Math.abs(lookY) > 0.16) {
      player.look(lookX * 900 * dt, lookY * 700 * dt);
    }
    if (actionJust("reload")) input.reloadPressed = true;
    if (actionJust("melee")) player.weapons.punch();
    if (actionJust("interact")) {
      player.enemies.tryInteract();
      if (state === "playing") hud.setPrompt(player.enemies.getInteractPrompt());
    }
    if (actionJust("grenade")) player.weapons.throwGrenade();
    if (actionJust("switchPrev")) player.weapons.cycle(-1);
    if (actionJust("switchNext")) player.weapons.cycle(1);
  } else {
    for (const key of ["forward", "back", "left", "right", "sprint", "jump"]) {
      setPad(key, false);
    }
    input.fire = false;
    input.ads = false;
  }

  const menuConfirm = actionJust("jump") || actionJust("fire") || actionJust("pause");
  const menuBack = actionJust("interact") || actionJust("map") || actionJust("pause");
  if (state === "menu") {
    if (menuConfirm) {
      if (!padSetupSaved) startPadSetup();
      else startFromMenu();
    }
  } else if (state === "paused") {
    if (menuConfirm) resumeGame();
    else if (actionJust("map") || actionJust("interact")) openMap();
  } else if (state === "map") {
    if (menuBack) closeMap();
  } else if (state === "dead") {
    if (menuConfirm) redeploy();
  } else if (state === "victory") {
    if (menuConfirm) $("btn-explore").click();
  } else if (state === "playing") {
    if (actionJust("pause")) pauseGame();
    else if (actionJust("map")) openMap();
  }

  padPrev = gp.buttons.map(b => !!b.pressed);
  padPrevActions = {};
  for (const key of Object.keys(padMap)) padPrevActions[key] = actionActive(key);
}

function isTypingTarget(target) {
  if (!target || !(target instanceof Element)) return false;
  const tag = target.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) return true;
  if (tag !== "INPUT") return false;
  const type = String(target.type || "text").toLowerCase();
  return !["button", "checkbox", "radio", "submit", "reset", "range", "color", "file"].includes(type);
}

function isUiTarget(target) {
  if (!target || !(target instanceof Element)) return false;
  if (isTypingTarget(target)) return true;
  const tag = target.tagName;
  return tag === "BUTTON" || tag === "A" || tag === "SELECT";
}

window.addEventListener("keydown", (e) => {
  // Escape must close the battle confirmation even when its buttons own focus.
  if (e.code === "Escape" && state === "confirm") {
    e.preventDefault();
    cancelBattleConfirm();
    return;
  }
  // Let the lobby nickname, room-code and other form controls receive normal
  // typing; otherwise the game's WASD handler swallows the letters.
  if (isUiTarget(e.target)) return;
  if (inputMode === "pad" && e.code !== "Escape") return;
  const action = keyMap[e.code] || keyMapByKey[e.key];
  if (action) {
    input[action] = true;
    e.preventDefault();
    return;
  }
  if (e.repeat) return;
  switch (e.code) {
    case "ShiftLeft":
    case "ShiftRight":
      input.sprint = true;
      break;
    case "Space":
      input.jump = true;
      e.preventDefault();
      break;
    case "KeyR":
      if (state === "playing") input.reloadPressed = true;
      break;
    case "KeyE":
      if (state === "playing") {
        input.reviveHeld = true;
        player.enemies.tryInteract();
        if (state === "playing") hud.setPrompt(player.externalPrompt || player.enemies.getInteractPrompt());
      }
      break;
    case "KeyM":
      if (state === "playing" || state === "paused" || state === "map") openMap();
      break;
    case "KeyN":
      audio.ensure();
      hud.toast("AUDIO", audio.toggleMute() ? "MUTED" : "UNMUTED", "amber");
      break;
    case "Digit1":
    case "Digit2":
    case "Digit3":
    case "Digit4":
    case "Digit5":
    case "Digit6":
    case "Digit7":
      if (state === "playing") player.weapons.switchTo(Number(e.code.slice(-1)) - 1);
      break;
    case "KeyX":
      if (state === "playing") player.weapons.punch();
      break;
    case "KeyG":
      if (state === "playing") player.weapons.throwGrenade();
      break;
    case "KeyF":
      if (state === "playing" && coop.active) {
        e.preventDefault();
        coop.shareWithNearest();
      }
      break;
    case "Escape":
      if (state === "playing") pauseGame();
      else if (state === "map") closeMap();
      else if (state === "paused") resumeGame();
      else if (state === "confirm") cancelBattleConfirm();
      else if (state === "campaigns") closeCampaignScreen();
      break;
    default:
      break;
  }
});

window.addEventListener("keyup", (e) => {
  if (isUiTarget(e.target)) return;
  if (inputMode === "pad") return;
  const action = keyMap[e.code] || keyMapByKey[e.key];
  if (action) input[action] = false;
  if (e.code === "ShiftLeft" || e.code === "ShiftRight") input.sprint = false;
  if (e.code === "Space") input.jump = false;
});

window.addEventListener("mousedown", (e) => {
  if (inputMode !== "kb" || state !== "playing") return;
  if (!locked) {
    draggingLook = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    requestLock();
  }
  if (e.button === 0) {
    mouseFire = true;
    input.fire = true;
  } else if (e.button === 1) {
    e.preventDefault();
    player.weapons.punch();
  } else if (e.button === 2) {
    mouseAds = true;
    input.ads = true;
  }
});

window.addEventListener("mouseup", (e) => {
  if (inputMode !== "kb") return;
  draggingLook = false;
  if (e.button === 0) {
    mouseFire = false;
    input.fire = false;
  }
  if (e.button === 2) {
    mouseAds = false;
    input.ads = false;
  }
});

window.addEventListener("mousemove", (e) => {
  if (inputMode !== "kb" || state !== "playing") return;
  if (mouseFire && !(e.buttons & 1)) {
    mouseFire = false;
    if (!gamepadActive) input.fire = false;
  }
  if (mouseAds && !(e.buttons & 2)) {
    mouseAds = false;
    if (!gamepadActive) input.ads = false;
  }
  if (locked) {
    player.look(e.movementX || 0, e.movementY || 0);
    return;
  }
  if (!fallbackLook) return;
  if (lastMouseX === null) {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    return;
  }
  const dx = e.clientX - lastMouseX;
  const dy = e.clientY - lastMouseY;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  if (e.buttons) player.look(dx, dy);
});

window.addEventListener("wheel", (e) => {
  if (inputMode !== "kb" || state !== "playing") return;
  e.preventDefault();
  player.weapons.cycle(Math.sign(e.deltaY));
}, { passive: false });

window.addEventListener("keyup", (e) => {
  if (isUiTarget(e.target)) return;
  if (e.code === "KeyE") input.reviveHeld = false;
});

document.addEventListener("focusin", (e) => {
  if (!isUiTarget(e.target)) return;
  // Do not carry held gameplay keys into a form field or button.
  mouseFire = false;
  mouseAds = false;
  input.fire = false;
  input.ads = false;
  input.jump = false;
  input.sprint = false;
  input.reloadPressed = false;
  input.reviveHeld = false;
  input.forward = input.back = input.left = input.right = false;
});

window.addEventListener("blur", () => {
  mouseFire = false;
  mouseAds = false;
  input.fire = false;
  input.ads = false;
  input.forward = input.back = input.left = input.right = false;
  input.sprint = false;
  input.reviveHeld = false;
});

window.addEventListener("contextmenu", (e) => {
  if (state === "playing") e.preventDefault();
});

document.addEventListener("pointerlockchange", () => {
  locked = document.pointerLockElement === canvas;
  const hint = $("deploy-hint");
  if (locked) {
    fallbackLook = false;
    hint.textContent = "CLICK TO CAPTURE MOUSE";
    hint.classList.add("hidden");
  }
  if (!locked) {
    input.forward = input.back = input.left = input.right = false;
    input.sprint = false;
    input.fire = false;
    input.ads = false;
    mouseFire = false;
    mouseAds = false;
  }
  if (!locked && state === "playing" && inputMode === "kb") pauseGame();
});

document.addEventListener("pointerlockerror", enableLookFallback);

$("deploy-hint").addEventListener("mousedown", (e) => {
  e.stopPropagation();
  e.preventDefault();
  audio.ensure();
  requestLock();
});

canvas.addEventListener("click", () => {
  if (state === "playing" && !locked) requestLock();
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    mouseFire = false;
    mouseAds = false;
    input.fire = false;
    input.ads = false;
    input.forward = input.back = input.left = input.right = false;
    input.sprint = false;
  }
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* --------------------------------- buttons -------------------------------- */
$("btn-input-kb").addEventListener("click", () => { audio.ui(); setInputMode("kb"); });
$("btn-input-pad").addEventListener("click", () => {
  if (!CONTROLLER_ENABLED) return;
  audio.ui();
  setInputMode("pad");
  if (!padSetupSaved) startPadSetup();
});
$("btn-input-setup").addEventListener("click", () => {
  if (!CONTROLLER_ENABLED) return;
  audio.ui();
  startPadSetup();
});
$("btn-pad-setup-cancel").addEventListener("click", () => { audio.ui(); finishPadSetup(false, false); });
$("btn-pad-setup-default").addEventListener("click", () => { audio.ui(); finishPadSetup(true, true); });
$("btn-pad-setup-skip").addEventListener("click", () => { audio.ui(); skipPadSetupStep(); });
$("btn-deploy").addEventListener("click", () => { audio.ui(); deployNewWorld(); });
$("btn-continue").addEventListener("click", () => { audio.ui(); deploy(true); });
$("btn-campaigns").addEventListener("click", () => { audio.ui(); openCampaignScreen(); });
$("btn-campaign-close").addEventListener("click", () => { closeCampaignScreen(); });
$("btn-resume").addEventListener("click", () => { audio.ui(); resumeGame(); });
$("btn-map").addEventListener("click", () => { audio.ui(); openMap(); });
$("btn-abandon").addEventListener("click", () => {
  audio.ui();
  saveGame();
  location.reload();
});
$("btn-map-close").addEventListener("click", () => { audio.ui(); closeMap(); });
$("campaign-map").addEventListener("click", (e) => {
  if (state !== "map") return;
  const canvas = e.currentTarget;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const x = (e.clientX - rect.left) * canvas.width / rect.width;
  const y = (e.clientY - rect.top) * canvas.height / rect.height;
  const hit = (hud.mapHotspots || []).find(h => Math.hypot(h.x - x, h.y - y) <= h.r);
  if (!hit) return;
  requestBattle(hit.index);
});
$("btn-battle-start").addEventListener("click", () => { audio.ui(); startConfirmedBattle(); });
$("btn-battle-cancel").addEventListener("click", () => { audio.ui(); cancelBattleConfirm(); });
$("btn-redeploy").addEventListener("click", () => { audio.ui(); redeploy(); });
$("btn-death-restart").addEventListener("click", () => {
  audio.ui();
  clearSave();
  location.reload();
});
$("btn-explore").addEventListener("click", () => {
  audio.ui();
  $("victory-screen").classList.add("hidden");
  player.weapons.root.visible = true;
  world.markerGroup.visible = true;
  audio.setMusicMode(regionMusicMode());
  audio.setMusicDucked(false);
  hud.show(true);
  state = "playing";
  requestLock();
});
$("btn-new-game").addEventListener("click", () => {
  audio.ui();
  clearSave();
  location.reload();
});

/* --------------------------------- loop ----------------------------------- */
coop.init({
  scene, player, enemies, hud, audio, input, requestLock,
  onStart: startCoopOperation,
  onPlayerDowned: playerDowned,
  onPlayerRevived: playerRevived,
  onPlayerBleedOut: playerBleedOut,
  onCoopZoneClear: index => {
    const zone = ZONES[index];
    if (!zone) return;
    const spot = safeSpawn(zone.x, zone.z + 18);
    lastBeacon = { x: spot.x, z: spot.z, yaw: 0 };
  },
  onCoopFinale: (zoneIndex, boss) => {
    const zone = ZONES[zoneIndex];
    if (!zone) return;
    const group = enemies.boss?.model.group || null;
    startEndingSequence(zone, { ...(boss || {}), group });
  },
  onClosed: reason => {
    hud.toast("CO-OP SESSION ENDED", reason.toUpperCase(), "red");
    setTimeout(() => location.reload(), 1800);
  }
});

initIntro();

window.__mindwar = { player, world, enemies, camera, scene, hud, renderer, input, coop, audio, get state() { return state; } };

menuCamera();
let lastFrame = performance.now();

function animate(now = performance.now()) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;
  frameCount++;
  fpsTime += dt;
  updateGamepad(dt);

  if (state === "menu") {
    menuT += dt;
    if (introActive) {
      introT += dt;
      const p = Math.min(1, introT / INTRO_CAMERA_TIME);
      const ease = 1 - Math.pow(1 - p, 3);
      const x = START_X + Math.sin(introT * 0.12) * 28;
      const z = START_Z + 62 - ease * 48;
      const ground = world.surfaceY(x, z);
      const y = Math.max(ground + 5, ground + 62 - ease * 48);
      camera.position.set(x, y, z);
      camera.lookAt(START_X - 4, 10 + ease * 4, START_Z - 60);
      camera.fov = 82 - ease * 4;
      camera.updateProjectionMatrix();
    } else {
      const x = START_X + Math.sin(menuT * 0.09) * 15;
      const z = START_Z + 9 + Math.cos(menuT * 0.07) * 9;
      const y = world.surfaceY(x, z) + 7.8;
      camera.position.set(x, y, z);
      camera.lookAt(START_X - 3, 9, START_Z - 58);
      camera.fov = 78;
      camera.updateProjectionMatrix();
    }
    world.update(camera, dt);
  } else if (state === "playing") {
    regionMusicTimer -= dt;
    if (regionMusicTimer <= 0 && !battleActive()) {
      regionMusicTimer = 1;
      const musicMode = regionMusicMode();
      if (audio.musicMode !== musicMode) {
        audio.setMusicMode(musicMode);
        audio.setMusicDucked(false);
      }
    }
    autoBattleTimer -= dt;
    if (!battleActive() && enemies.netRole !== "client" && autoBattleTimer <= 0) {
      autoBattleTimer = 0.25;
      const next = enemies.states[enemies.nextIndex];
      if (next && !next.cleared) {
        const d = Math.hypot(player.pos.x - next.zone.x, player.pos.z - next.zone.z);
        if (d < 68) enemies.activateZone(next);
      }
    }
    player.update(dt, input);
    input.reloadPressed = false;
    if (player.health <= 300 && !lowHealthWarned) {
      lowHealthWarned = true;
      hud.comms("MARA", maraLine("lowHealth"), 4200);
    } else if (player.health > 600) {
      lowHealthWarned = false;
    }
    if (state === "playing") {
      enemies.update(dt);
      pickups.update(dt);
      saveTimer += dt;
      if (saveTimer > 10 && Date.now() - lastSaveAt > 8000) {
        saveTimer = 0;
        saveGame();
      }
    }
    world.update(camera, dt);
  } else if (state === "ending") {
    updateEnding(dt);
    world.update(camera, dt);
  } else if (state === "dead" || state === "downed") {
    // A downed or dead host keeps the shared simulation running for the squad.
    if (coop.active && coop.isHost) enemies.update(dt);
    world.update(camera, dt);
  } else {
    world.update(camera, dt);
  }

  coop.update(dt);
  effects.update(dt);
  world.updateSpire(performance.now() * 0.001);
  sky.position.copy(camera.position);
  $("deploy-hint").classList.toggle(
    "hidden",
    locked || inputMode === "pad" || gamepadActive || state !== "playing" || (fallbackLook && draggingLook) || player.weapons.ads
  );

  if (fpsTime > 0.5) {
    hud.setFps(`MINDWAR // ${Math.round(frameCount / fpsTime)} FPS // ${world.meshes.size} CHUNKS`);
    frameCount = 0;
    fpsTime = 0;
  }

  renderer.render(scene, camera);
}

animate();

/* --------------------------------- intro ---------------------------------- */
window.addEventListener("load", () => {
  hud.drawStartMap();
  loadPadMap();
  setInputMode("kb");
  // Best-effort autoplay of the title piano. Browsers that block WebAudio
  // until a gesture will start it on the first click/key press instead.
  audio.ensure();
  audio.startMusic("title");
});
