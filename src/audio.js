// All audio is synthesised at runtime with WebAudio. No asset files.

// Music sits well under gunfire in the mix but must still be clearly audible.
// The standalone score page uses the same levels relative to its master gain.
const MUSIC_TITLE_GAIN = 1.7;
const MUSIC_BATTLE_GAIN = 1.5;
const MUSIC_FINAL_GAIN = 1.6;
const MUSIC_CITY_GAIN = 2.4;
const MUSIC_DUCKED_GAIN = 0.5;

// Title-theme material. The harmony stays A minor / Fmaj7 / D minor / E minor,
// but each four-bar pass picks a different lead melody, broken-chord shape and
// left-hand pattern, so the loop does not repeat the same eight bars forever.
const TITLE_MELODIES = [
  { name: "descent", lead: [76, 74, 72, 71], echo: [72, 69, 67, 64] },
  { name: "ascent", lead: [72, 74, 77, 76], echo: [69, 72, 74, 72] },
  { name: "low", lead: [69, 72, 74, 71], echo: [65, 69, 72, 67] },
  { name: "wide", lead: [76, 72, 74, 67], echo: [72, 69, 67, 64] }
];
const TITLE_ARPS = [
  [3, 2, 1, 0, 2, 1, 0, 2],
  [2, 3, 1, 0, 3, 2, 1, 0],
  [1, 2, 3, 2, 0, 1, 2, 1],
  [3, 1, 2, 0, 2, 0, 1, 2]
];
const TITLE_BASSES = [
  [
    { step: 0, note: 0, dur: 14, vol: 0.062, dark: 0.15 },
    { step: 0, note: 7, dur: 12, vol: 0.03, dark: 0.2 },
    { step: 8, note: -12, dur: 9, vol: 0.04, dark: 0.25 }
  ],
  [
    { step: 0, note: 0, dur: 14, vol: 0.062, dark: 0.15 },
    { step: 4, note: 7, dur: 8, vol: 0.028, dark: 0.2 },
    { step: 8, note: -12, dur: 9, vol: 0.04, dark: 0.25 },
    { step: 12, note: 7, dur: 6, vol: 0.022, dark: 0.22 }
  ],
  [
    { step: 0, note: 0, dur: 16, vol: 0.055, dark: 0.18 },
    { step: 6, note: -12, dur: 11, vol: 0.045, dark: 0.28 }
  ],
  [
    { step: 0, note: 0, dur: 12, vol: 0.06, dark: 0.15 },
    { step: 8, note: 7, dur: 10, vol: 0.032, dark: 0.2 }
  ]
];

// Battle lead phrases. Same four-bar minor harmony, but four different shapes
// chosen per pass so the combat loop does not repeat one tune forever.
const BATTLE_MELODIES = [
  { name: "assault", lead: [76, 74, 72, 71], answer: [72, 69, 67, 64] },
  { name: "counter", lead: [72, 77, 74, 71], answer: [69, 72, 69, 67] },
  { name: "rise", lead: [69, 72, 74, 76], answer: [65, 69, 72, 71] },
  { name: "hammer", lead: [72, 72, 74, 71], answer: [69, 69, 67, 64] }
];
const BATTLE2_MELODIES = [
  { name: "charge", lead: [74, 72, 69, 65], answer: [69, 65, 62, 65] },
  { name: "drive", lead: [69, 74, 77, 74], answer: [65, 69, 72, 69] },
  { name: "low", lead: [62, 65, 69, 72], answer: [57, 62, 65, 62] },
  { name: "hammer", lead: [74, 74, 77, 72], answer: [69, 69, 65, 62] }
];

// Region themes. Farmland is open and slow; Cedar's Vill is colder and more
// mechanical; Meridian is Vex's low, hostile theme. The final two checkpoints
// use a harder variant of Vex's material instead of the normal battle theme.
const EXPLORE_THEMES = {
  farm: {
    bpm: 60,
    chords: [[52, 55, 59, 64], [48, 52, 55, 60], [43, 47, 50, 55], [50, 54, 57, 62]],
    roots: [40, 36, 43, 38],
    arpLift: 12, arpVol: 0.038, melodyVol: 0.04, echoVol: 0.026,
    variations: [
      {
        id: "open", name: "Open Sky",
        melody: [71, 76, 74, 66], echo: [67, 64, 62, 62],
        arp: [2, 1, 0, 2, 1, 0, 2, 1], arpVol: 0.038,
        bass: [
          { step: 0, note: 0, dur: 14, vol: 0.07, dark: 0.2 },
          { step: 0, note: 7, dur: 11, vol: 0.03, dark: 0.25 },
          { step: 8, note: -12, dur: 9, vol: 0.04, dark: 0.3 }
        ]
      },
      {
        id: "hymnal", name: "Hymnal",
        melody: [69, 71, 74, 76], echo: [64, 67, 71, 74],
        arp: [0, 1, 2, 3, 2, 1, 0, 2], arpVol: 0.04,
        bass: [
          { step: 0, note: 0, dur: 14, vol: 0.065, dark: 0.22 },
          { step: 4, note: 7, dur: 8, vol: 0.026, dark: 0.28 },
          { step: 8, note: -12, dur: 10, vol: 0.042, dark: 0.32 },
          { step: 12, note: 7, dur: 6, vol: 0.022, dark: 0.26 }
        ]
      },
      {
        id: "frost", name: "Frost",
        melody: [64, 67, 71, 74], echo: [59, 62, 67, 71],
        arp: [3, 2, 1, 0, 2, 0, 1, 3], arpVol: 0.034,
        bass: [
          { step: 0, note: 0, dur: 16, vol: 0.06, dark: 0.28 },
          { step: 8, note: -12, dur: 11, vol: 0.045, dark: 0.34 },
          { step: 12, note: 7, dur: 6, vol: 0.024, dark: 0.3 }
        ]
      }
    ]
  },
  suburb: {
    bpm: 72,
    chords: [[50, 53, 57, 62], [46, 50, 53, 58], [53, 57, 60, 65], [48, 52, 55, 60]],
    roots: [38, 34, 41, 36],
    arpLift: 12, arpVol: 0.042, melodyVol: 0.04, echoVol: 0.026,
    variations: [
      {
        id: "empty", name: "Empty Street",
        melody: [77, 74, 72, 67], echo: [72, 69, 65, 64],
        arp: [1, 2, 0, 1, 2, 0, 1, 2], arpVol: 0.042,
        bass: [
          { step: 0, note: 0, dur: 12, vol: 0.065, dark: 0.25 },
          { step: 4, note: 7, dur: 7, vol: 0.026, dark: 0.3 },
          { step: 8, note: -12, dur: 9, vol: 0.04, dark: 0.35 }
        ]
      },
      {
        id: "colder", name: "Colder",
        melody: [74, 72, 69, 65], echo: [69, 65, 62, 69],
        arp: [2, 1, 0, 2, 0, 1, 2, 1], arpVol: 0.038,
        bass: [
          { step: 0, note: 0, dur: 14, vol: 0.06, dark: 0.3 },
          { step: 4, note: 7, dur: 7, vol: 0.024, dark: 0.35 },
          { step: 8, note: -12, dur: 10, vol: 0.042, dark: 0.4 },
          { step: 12, note: 7, dur: 6, vol: 0.02, dark: 0.32 }
        ]
      },
      {
        id: "static", name: "Static",
        melody: [77, 76, 74, 72], echo: [72, 69, 67, 65],
        arp: [1, 2, 3, 1, 2, 3, 0, 1], arpVol: 0.045,
        bass: [
          { step: 0, note: 0, dur: 12, vol: 0.06, dark: 0.28 },
          { step: 4, note: 12, dur: 6, vol: 0.022, dark: 0.33 },
          { step: 8, note: -12, dur: 9, vol: 0.04, dark: 0.38 },
          { step: 12, note: 7, dur: 6, vol: 0.022, dark: 0.32 }
        ]
      }
    ]
  },
  city: {
    bpm: 50,
    chords: [[50, 53, 57, 62], [46, 50, 53, 58], [44, 48, 51, 56], [45, 49, 52, 57]],
    roots: [38, 34, 44, 45],
    arpLift: 0, arpVol: 0.04, melodyVol: 0.055, echoVol: 0.032,
    variations: [
      {
        id: "low", name: "Low Toll",
        melody: [62, 58, 56, 61], echo: [57, 53, 51, 52],
        arp: [0, 2, 1, 3, 0, 2, 1, 2], arpVol: 0.04,
        bass: [
          { step: 0, note: 0, dur: 16, vol: 0.09, dark: 0.55 },
          { step: 8, note: -12, dur: 10, vol: 0.065, dark: 0.6 },
          { step: 12, note: 0, dur: 6, vol: 0.04, dark: 0.55 }
        ]
      },
      {
        id: "chromatic", name: "Chromatic",
        melody: [61, 60, 58, 57], echo: [56, 55, 53, 52],
        arp: [1, 2, 0, 1, 3, 2, 1, 0], arpVol: 0.038,
        bass: [
          { step: 0, note: 0, dur: 14, vol: 0.085, dark: 0.6 },
          { step: 8, note: -1, dur: 9, vol: 0.06, dark: 0.65 },
          { step: 12, note: -12, dur: 7, vol: 0.045, dark: 0.6 }
        ]
      },
      {
        id: "hollow", name: "Hollow",
        melody: [50, 53, 56, 58], echo: [45, 48, 51, 53],
        arp: [0, 1, 0, 2, 0, 1, 0, 2], arpVol: 0.036,
        bass: [
          { step: 0, note: 0, dur: 18, vol: 0.08, dark: 0.65 },
          { step: 8, note: -12, dur: 12, vol: 0.06, dark: 0.7 },
          { step: 12, note: 7, dur: 5, vol: 0.028, dark: 0.62 }
        ]
      }
    ]
  }
};

const FINAL_THEME = {
  bpm: 126,
  chords: [[50, 53, 57, 62], [46, 50, 53, 58], [43, 46, 50, 55], [45, 49, 52, 57]],
  roots: [38, 34, 43, 33],
  lead: [74, 77, 79, 81],
  answer: [81, 77, 74, 69],
  arp: [0, 2, 1, 3, 2, 1, 0, 2, 1, 3, 2, 0, 1, 2, 3, 1],
  ostinato: [0, 0, 12, 7, 0, 12, 7, 12]
};

const MUSIC_BPM = { title: 66, battle: 118, battle2: 124, farm: 60, suburb: 72, city: 50, final: 126 };

// Two different crossfades: area-to-area changes breathe slowly behind a
// filtered air swell, while combat entries slam in and battle exits unwind.
const BATTLE_MODES = new Set(["battle", "battle2", "final"]);
const MUSIC_TRANSITIONS = {
  region: {
    newStart: 0.05, newFade: 2.7, oldFade: 2.3,
    newFilter: 520, oldFilter: 480, delay: 0.22, cleanup: 3400
  },
  enterBattle: {
    newStart: 0.22, newFade: 0.9, oldFade: 1.0,
    newFilter: 1700, oldFilter: 520, delay: 0.05, cleanup: 2200
  },
  leaveBattle: {
    newStart: 0.04, newFade: 2.9, oldFade: 1.2,
    newFilter: 650, oldFilter: 360, delay: 0.15, cleanup: 3800
  },
  battle: {
    newStart: 0.12, newFade: 1.1, oldFade: 0.9,
    newFilter: 900, oldFilter: 600, delay: 0.06, cleanup: 2400
  },
  menu: {
    newStart: 0.2, newFade: 0.5, oldFade: 0.45,
    newFilter: 1100, oldFilter: 700, delay: 0.03, cleanup: 1300
  },
  default: {
    newStart: 0.35, newFade: 0.55, oldFade: 1.0,
    newFilter: 2100, oldFilter: 900, delay: 0.12, cleanup: 1600
  }
};

function musicTransitionKind(from, to) {
  if (to === "title") return "menu";
  const fromBattle = BATTLE_MODES.has(from);
  const toBattle = BATTLE_MODES.has(to);
  if (fromBattle && toBattle) return "battle";
  if (fromBattle) return "leaveBattle";
  if (toBattle) return "enterBattle";
  return "region";
}

function musicGainFor(mode) {
  if (mode === "city") return MUSIC_CITY_GAIN;
  if (mode === "final") return MUSIC_FINAL_GAIN;
  if (mode === "battle" || mode === "battle2") return MUSIC_BATTLE_GAIN;
  return MUSIC_TITLE_GAIN;
}

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noise = null;
    this.muted = false;
    this.ambienceStarted = false;
    this.lastStep = 0;
    this.musicStarted = false;
    this.musicGain = null;
    this.musicBus = null;
    this.musicTimer = null;
    this.musicStep = 0;
    this.musicNext = 0;
    this.musicBpm = 102;
    this.musicMode = "title";
    this.musicDucked = false;
    this.titleVariation = -1;
    this.titleMelodyIndex = -1;
    this.titleVariationName = "";
    this.titleMelody = TITLE_MELODIES[0];
    this.titleArp = TITLE_ARPS[0];
    this.titleBass = TITLE_BASSES[0];
    this.battleVariation = -1;
    this.battleMelodyIndex = -1;
    this.battleVariationName = "";
    this.battleMelody = BATTLE_MELODIES[0];
    this.battle2Variation = -1;
    this.battle2MelodyIndex = -1;
    this.battle2VariationName = "";
    this.battle2Melody = BATTLE2_MELODIES[0];
    this.regionVariations = {};
    this.regionVariationName = "";
    this.regionVariationId = "";
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.ctx.onstatechange = () => {
      if (this.ctx.state === "running") this.ensureMusicScheduler();
    };
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.7;
    this.master.connect(this.ctx.destination);

    const len = this.ctx.sampleRate * 1.2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = last * 0.94 + white * 0.06;
      data[i] = white * 0.6 + last * 1.6;
    }
    this.noise = buf;
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.7, this.ctx.currentTime, 0.03);
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  now() { return this.ctx ? this.ctx.currentTime : 0; }

  env(gainNode, t0, attack, decay, peak) {
    const g = gainNode.gain;
    g.cancelScheduledValues(t0);
    g.setValueAtTime(0.0001, t0);
    g.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + attack);
    g.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  }

  noiseBurst({ dur = 0.12, freq = 1200, q = 0.8, vol = 0.3, type = "lowpass", delay = 0 }) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const filt = this.ctx.createBiquadFilter();
    filt.type = type;
    filt.frequency.setValueAtTime(freq, t0);
    filt.frequency.exponentialRampToValueAtTime(Math.max(80, freq * 0.35), t0 + dur);
    filt.Q.value = q;
    const g = this.ctx.createGain();
    this.env(g, t0, 0.004, dur, vol);
    src.connect(filt).connect(g).connect(this.master);
    src.start(t0, Math.random() * 0.3);
    src.stop(t0 + dur + 0.05);
  }

  tone({ freq = 120, toFreq = 60, dur = 0.15, vol = 0.2, type = "sine", delay = 0 }) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, toFreq), t0 + dur);
    const g = this.ctx.createGain();
    this.env(g, t0, 0.005, dur, vol);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  shot(type, dist = 0) {
    if (!this.ctx || this.muted) return;
    const fall = 1 / (1 + dist * 0.028);
    switch (type) {
      case "pistol":
        this.noiseBurst({ dur: 0.1, freq: 2600, vol: 0.31 * fall });
        this.tone({ freq: 190, toFreq: 60, dur: 0.09, vol: 0.2 * fall, type: "triangle" });
        break;
      case "smg":
        this.noiseBurst({ dur: 0.07, freq: 2100, vol: 0.23 * fall });
        this.tone({ freq: 160, toFreq: 55, dur: 0.07, vol: 0.13 * fall, type: "triangle" });
        break;
      case "rifle":
        this.noiseBurst({ dur: 0.13, freq: 1700, vol: 0.38 * fall });
        this.tone({ freq: 125, toFreq: 44, dur: 0.12, vol: 0.22 * fall, type: "sawtooth" });
        break;
      case "shotgun":
        this.noiseBurst({ dur: 0.24, freq: 950, vol: 0.5 * fall, q: 0.5 });
        this.tone({ freq: 90, toFreq: 30, dur: 0.2, vol: 0.3 * fall, type: "triangle" });
        break;
      case "dmr":
        this.noiseBurst({ dur: 0.16, freq: 1550, vol: 0.4 * fall, q: 0.7 });
        this.tone({ freq: 115, toFreq: 40, dur: 0.15, vol: 0.24 * fall, type: "sawtooth" });
        break;
      case "knife":
        this.noiseBurst({ dur: 0.09, freq: 3800, vol: 0.12 * fall, type: "highpass", q: 2 });
        this.tone({ freq: 260, toFreq: 120, dur: 0.08, vol: 0.06 * fall, type: "triangle" });
        break;
      case "bazooka":
        this.noiseBurst({ dur: 0.35, freq: 700, vol: 0.55 * fall, q: 0.5 });
        this.tone({ freq: 85, toFreq: 28, dur: 0.3, vol: 0.32 * fall, type: "sawtooth" });
        break;
      case "rail":
        this.noiseBurst({ dur: 0.26, freq: 4600, vol: 0.25 * fall, type: "bandpass", q: 2 });
        this.tone({ freq: 1500, toFreq: 160, dur: 0.3, vol: 0.17 * fall, type: "sawtooth" });
        this.tone({ freq: 70, toFreq: 40, dur: 0.22, vol: 0.2 * fall, type: "sine", delay: 0.04 });
        break;
      default:
        this.noiseBurst({ dur: 0.1, freq: 2200, vol: 0.25 * fall });
    }
  }

  enemyShot(dist = 10) {
    if (!this.ctx || this.muted) return;
    const fall = Math.max(0.06, 1 / (1 + dist * 0.055));
    this.noiseBurst({ dur: 0.08, freq: 1500, vol: 0.18 * fall });
    this.tone({ freq: 120, toFreq: 50, dur: 0.08, vol: 0.08 * fall, type: "square" });
  }

  hit(headshot = false) {
    if (!this.ctx || this.muted) return;
    this.tone({ freq: headshot ? 900 : 620, toFreq: headshot ? 480 : 380, dur: 0.045, vol: 0.1, type: "square" });
  }

  kill() {
    if (!this.ctx || this.muted) return;
    this.tone({ freq: 420, toFreq: 140, dur: 0.1, vol: 0.1, type: "triangle" });
  }

  pickup(health = false) {
    if (!this.ctx || this.muted) return;
    this.tone({ freq: health ? 520 : 600, toFreq: health ? 780 : 900, dur: 0.08, vol: 0.1, type: "sine" });
    this.tone({ freq: health ? 780 : 900, toFreq: health ? 1100 : 1250, dur: 0.1, vol: 0.08, type: "sine", delay: 0.07 });
  }

  reload() {
    if (!this.ctx || this.muted) return;
    this.noiseBurst({ dur: 0.04, freq: 1800, vol: 0.09, type: "bandpass", q: 3 });
    this.noiseBurst({ dur: 0.05, freq: 1100, vol: 0.09, type: "bandpass", q: 3, delay: 0.13 });
    this.noiseBurst({ dur: 0.05, freq: 2200, vol: 0.1, type: "bandpass", q: 4, delay: 0.32 });
  }

  dryFire() {
    if (!this.ctx || this.muted) return;
    this.noiseBurst({ dur: 0.025, freq: 3000, vol: 0.09, type: "highpass" });
  }

  hurt() {
    if (!this.ctx || this.muted) return;
    this.noiseBurst({ dur: 0.08, freq: 400, vol: 0.12 });
    this.tone({ freq: 110, toFreq: 55, dur: 0.12, vol: 0.14, type: "triangle" });
  }

  footstep() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    if (t - this.lastStep < 0.18) return;
    this.lastStep = t;
    this.noiseBurst({ dur: 0.045, freq: 500, vol: 0.055, type: "lowpass" });
  }

  alarm() {
    if (!this.ctx || this.muted) return;
    for (let i = 0; i < 3; i++) {
      this.tone({ freq: 440, toFreq: 660, dur: 0.18, vol: 0.09, type: "square", delay: i * 0.28 });
    }
  }

  zoneClear() {
    if (!this.ctx || this.muted) return;
    const notes = [392, 523, 659, 784];
    notes.forEach((f, i) => this.tone({ freq: f, toFreq: f * 1.01, dur: 0.32, vol: 0.09, type: "triangle", delay: i * 0.11 }));
  }

  explosion() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    this.noiseBurst({ dur: 0.55, freq: 420, vol: 0.42, q: 0.4 });
    this.tone({ freq: 70, toFreq: 24, dur: 0.48, vol: 0.3, type: "sawtooth" });
    this.noiseBurst({ dur: 0.32, freq: 1600, vol: 0.18, type: "bandpass", q: 0.7, delay: 0.04 });
    void t;
  }

  bossRoar() {
    if (!this.ctx || this.muted) return;
    this.tone({ freq: 65, toFreq: 38, dur: 0.9, vol: 0.22, type: "sawtooth" });
    this.noiseBurst({ dur: 0.8, freq: 260, vol: 0.16, type: "lowpass" });
  }

  victory() {
    if (!this.ctx || this.muted) return;
    const notes = [262, 330, 392, 523, 659, 784];
    notes.forEach((f, i) => this.tone({ freq: f, toFreq: f, dur: 0.5, vol: 0.09, type: "triangle", delay: i * 0.14 }));
  }

  ui() {
    if (!this.ctx || this.muted) return;
    this.tone({ freq: 880, toFreq: 660, dur: 0.045, vol: 0.05, type: "square" });
  }

  /* --------------------------------- music --------------------------------- */
  mtof(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

  // Layered, inharmonic partials with independent decays. This is a
  // synthesised piano voice rather than a sustained synth tone.
  pianoNote(freq, t0, dur, vol = 0.1, dest = null, dark = 0) {
    const target = dest || this.musicGain;
    const partials = [
      [1, 1, 1.0],
      [2.002, 0.4, 0.62],
      [3.008, 0.19, 0.44],
      [4.015, 0.09, 0.3],
      [5.03, 0.045, 0.22]
    ];
    const cutoff = 4600 - dark * 1500;
    for (const [ratio, amp, decay] of partials) {
      const osc = this.ctx.createOscillator();
      const filt = this.ctx.createBiquadFilter();
      const g = this.ctx.createGain();
      osc.type = ratio === 1 ? "triangle" : "sine";
      osc.frequency.setValueAtTime(freq * ratio, t0);
      osc.detune.setValueAtTime((Math.random() - 0.5) * 3.5, t0);
      filt.type = "lowpass";
      filt.frequency.setValueAtTime(cutoff, t0);
      const peak = Math.max(0.0002, vol * amp);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur * decay);
      osc.connect(filt).connect(g).connect(target);
      osc.start(t0);
      osc.stop(t0 + dur * decay + 0.05);
    }
  }

  musicTone(freq, t0, dur, vol, type = "sawtooth", cutoff = 900, dest = null) {
    const osc = this.ctx.createOscillator();
    const filt = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    filt.type = "lowpass";
    filt.frequency.setValueAtTime(cutoff, t0);
    filt.Q.value = 1.1;
    const attack = Math.min(0.02, dur * 0.25);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0003, vol), t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(filt).connect(g).connect(dest || this.musicGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.04);
  }

  musicNoise(t0, dur, freq, vol, type = "highpass", q = 1) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const filt = this.ctx.createBiquadFilter();
    filt.type = type;
    filt.frequency.setValueAtTime(freq, t0);
    filt.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0003, vol), t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filt).connect(g).connect(this.musicGain);
    src.start(t0, Math.random() * 0.3);
    src.stop(t0 + dur + 0.04);
  }

  // Airy sweep used by the music crossfades. It runs through the master mix
  // rather than either music bus, so it keeps moving while both fades trade
  // places instead of being cut with the old arrangement.
  transitionNoise(t0, dur, fromFreq, toFreq, vol, type = "bandpass", q = 0.8) {
    if (!this.master) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const filt = this.ctx.createBiquadFilter();
    filt.type = type;
    filt.Q.value = q;
    filt.frequency.setValueAtTime(Math.max(40, fromFreq), t0);
    filt.frequency.exponentialRampToValueAtTime(Math.max(40, toFreq), t0 + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + Math.min(0.35, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filt).connect(g).connect(this.master);
    src.start(t0, Math.random() * 0.3);
    src.stop(t0 + dur + 0.05);
  }

  transitionThud(t0, fromFreq, toFreq, dur, vol) {
    if (!this.master) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(fromFreq, t0);
    osc.frequency.exponentialRampToValueAtTime(toFreq, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  regionMotif(mode) {
    const theme = EXPLORE_THEMES[mode];
    if (theme?.variations?.length) {
      const index = this.regionVariations?.[mode] ?? 0;
      return (theme.variations[index] || theme.variations[0]).melody[0];
    }
    if (mode === "title") return this.titleMelody?.lead?.[0] || 69;
    return null;
  }

  musicTransitionFx(kind, mode, now) {
    if (kind === "region") {
      this.transitionNoise(now, 2.4, 280, 1500, 0.03);
      const motif = this.regionMotif(mode);
      // A quiet low preview of the incoming key bridges the two areas.
      if (motif) this.pianoNote(this.mtof(motif - 12), now + 0.45, 2.6, 0.016, this.master, 0.5);
    } else if (kind === "enterBattle") {
      this.transitionNoise(now, 0.8, 240, 3200, 0.05, "bandpass", 1.1);
      this.transitionThud(now + 0.03, 96, 32, 0.5, 0.12);
    } else if (kind === "leaveBattle") {
      this.transitionNoise(now, 1.9, 2400, 240, 0.035);
      this.transitionThud(now, 62, 26, 0.9, 0.085);
    }
  }

  musicKick(t0) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, t0);
    osc.frequency.exponentialRampToValueAtTime(42, t0 + 0.18);
    g.gain.setValueAtTime(0.55, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.24);
    osc.connect(g).connect(this.musicGain);
    osc.start(t0);
    osc.stop(t0 + 0.28);
    this.musicNoise(t0, 0.025, 3200, 0.035, "bandpass", 1.5);
  }

  scheduleMusicStep(step, t0, stepDur) {
    if (this.musicMode === "battle") this.scheduleBattleStep(step, t0, stepDur);
    else if (this.musicMode === "battle2") this.scheduleBattle2Step(step, t0, stepDur);
    else if (this.musicMode === "final") this.scheduleFinalBattleStep(step, t0, stepDur);
    else if (EXPLORE_THEMES[this.musicMode]) {
      this.scheduleRegionStep(step, t0, stepDur, this.musicMode);
    } else this.scheduleTitleStep(step, t0, stepDur);
  }

  scheduleRegionStep(step, t0, stepDur, theme) {
    const config = EXPLORE_THEMES[theme] || EXPLORE_THEMES.farm;
    if (step === 0) this.pickRegionVariation(theme);
    const variation = config.variations?.[this.regionVariations[theme] ?? 0] || config.variations?.[0];
    if (!variation) return;
    const bar = Math.floor(step / 16) % 4;
    const s = step % 16;
    const chord = config.chords[bar];
    const root = config.roots[bar];

    for (const hit of variation.bass) {
      if (s !== hit.step) continue;
      this.pianoNote(this.mtof(root + hit.note), t0, stepDur * hit.dur, hit.vol, null, hit.dark);
    }
    if (s % 2 === 0) {
      const arp = variation.arp;
      const lift = variation.arpLift ?? config.arpLift ?? 12;
      const vol = variation.arpVol ?? config.arpVol ?? 0.04;
      this.pianoNote(this.mtof(chord[arp[s / 2]] + lift), t0, stepDur * 3.4, vol, this.arpBus, 0.18);
    }
    if (s === 0) {
      const vol = variation.melodyVol ?? config.melodyVol ?? 0.04;
      this.pianoNote(this.mtof(variation.melody[bar]), t0, stepDur * 7.4, vol, this.arpBus, 0.16);
    }
    if (s === 12) {
      const vol = variation.echoVol ?? config.echoVol ?? 0.026;
      this.pianoNote(this.mtof(variation.echo[bar]), t0, stepDur * 4.6, vol, this.arpBus, 0.24);
    }
  }

  scheduleFinalBattleStep(step, t0, stepDur) {
    const bar = Math.floor(step / 16) % 4;
    const s = step % 16;
    const chord = FINAL_THEME.chords[bar];
    const root = FINAL_THEME.roots[bar];

    if (s % 2 === 0) {
      const offsets = FINAL_THEME.ostinato;
      this.pianoNote(this.mtof(root + offsets[s / 2]), t0, stepDur * 1.5, 0.12, null, 0.55);
    }
    const arp = FINAL_THEME.arp;
    this.pianoNote(this.mtof(chord[arp[s]] + 12), t0, stepDur * 0.8, 0.05, this.arpBus, 0.4);

    if (s === 0) {
      for (const note of chord) {
        this.pianoNote(this.mtof(note), t0, stepDur * 4.6, 0.05, null, 0.5);
      }
      // High bell and octave-doubled lead give the finale its scale.
      this.pianoNote(this.mtof(chord[3] + 24), t0, stepDur * 3.6, 0.018, this.arpBus, 0.15);
      this.pianoNote(this.mtof(FINAL_THEME.lead[bar]), t0, stepDur * 3.2, 0.06, this.arpBus, 0.2);
      this.pianoNote(this.mtof(FINAL_THEME.lead[bar] - 12), t0, stepDur * 3.2, 0.032, this.arpBus, 0.35);
    }
    if (s === 8) {
      for (const note of chord.slice(1, 4)) {
        this.pianoNote(this.mtof(note), t0, stepDur * 2.4, 0.038, null, 0.5);
      }
      this.pianoNote(this.mtof(FINAL_THEME.answer[bar]), t0, stepDur * 2.6, 0.05, this.arpBus, 0.35);
      this.pianoNote(this.mtof(FINAL_THEME.answer[bar] - 12), t0, stepDur * 2.6, 0.028, this.arpBus, 0.45);
    }
    if ((bar === 1 || bar === 3) && s === 0) {
      this.pianoNote(this.mtof(root - 12), t0, stepDur * 8, 0.08, null, 0.6);
    }
  }

  pickTitleVariation() {
    const count = TITLE_MELODIES.length;
    let melody = Math.floor(Math.random() * count);
    if (count > 1 && melody === this.titleMelodyIndex) {
      melody = (melody + 1 + Math.floor(Math.random() * (count - 1))) % count;
    }
    const arp = Math.floor(Math.random() * TITLE_ARPS.length);
    const bass = Math.floor(Math.random() * TITLE_BASSES.length);
    this.titleMelodyIndex = melody;
    this.titleVariation = melody * TITLE_ARPS.length * TITLE_BASSES.length +
      arp * TITLE_BASSES.length + bass;
    this.titleMelody = TITLE_MELODIES[melody];
    this.titleArp = TITLE_ARPS[arp];
    this.titleBass = TITLE_BASSES[bass];
    this.titleVariationName = `${this.titleMelody.name}/${arp}/${bass}`;
  }

  scheduleTitleStep(step, t0, stepDur) {
    if (step === 0) this.pickTitleVariation();
    const bar = Math.floor(step / 16) % 4;
    const s = step % 16;
    const chords = [
      [57, 60, 64, 69],   // Am
      [53, 57, 60, 64],   // Fmaj7
      [50, 53, 57, 62],   // Dm
      [52, 55, 59, 64]    // Em
    ];
    const bassRoots = [45, 41, 38, 40];
    const chord = chords[bar];
    const root = bassRoots[bar];
    const melody = this.titleMelody || TITLE_MELODIES[0];
    const arp = this.titleArp || TITLE_ARPS[0];
    const bass = this.titleBass || TITLE_BASSES[0];

    // Left hand: one of four root/fifth/octave patterns.
    for (const hit of bass) {
      if (s !== hit.step) continue;
      this.pianoNote(this.mtof(root + hit.note), t0, stepDur * hit.dur, hit.vol, null, hit.dark);
    }

    // Right hand: a broken chord that changes shape between passes.
    if (s % 2 === 0) {
      this.pianoNote(this.mtof(chord[arp[s / 2]] + 12), t0, stepDur * 3.8, 0.045, this.arpBus, 0.15);
    }

    // Sparse lead and answer. The lead melody rotates between four phrases,
    // including a new rising line, so consecutive passes sing different tunes.
    if (s === 0) {
      this.pianoNote(this.mtof(melody.lead[bar]), t0, stepDur * 6.2, 0.036, this.arpBus, 0.1);
    }
    if (s === 12) {
      this.pianoNote(this.mtof(melody.echo[bar]), t0, stepDur * 4.4, 0.025, this.arpBus, 0.2);
    }
  }

  pickBattleVariation() {
    const count = BATTLE_MELODIES.length;
    let melody = Math.floor(Math.random() * count);
    if (count > 1 && melody === this.battleMelodyIndex) {
      melody = (melody + 1 + Math.floor(Math.random() * (count - 1))) % count;
    }
    this.battleMelodyIndex = melody;
    this.battleVariation = melody;
    this.battleMelody = BATTLE_MELODIES[melody];
    this.battleVariationName = this.battleMelody.name;
  }

  scheduleBattleStep(step, t0, stepDur) {
    if (step === 0) this.pickBattleVariation();
    const bar = Math.floor(step / 16) % 4;
    const s = step % 16;
    // The battle track is the same sad theme under pressure: same minor
    // harmony, but one of four lead phrases and a hard-driven arrangement.
    const chords = [
      [57, 60, 64, 69],   // Am
      [53, 57, 60, 64],   // Fmaj7
      [50, 53, 57, 62],   // Dm
      [52, 55, 59, 64]    // Em
    ];
    const bassRoots = [45, 41, 38, 40];
    const chord = chords[bar];
    const root = bassRoots[bar];
    const melody = this.battleMelody || BATTLE_MELODIES[0];

    // Driving piano ostinato in the left hand, intentionally dark.
    if (s % 2 === 0) {
      const offsets = [0, 0, 12, 7, 0, 12, 7, 12];
      this.pianoNote(this.mtof(root + offsets[s / 2]), t0, stepDur * 1.7, 0.105, null, 0.5);
    }

    // Right-hand sixteenths descend instead of climbing brightly.
    const arp = [3, 2, 1, 0, 2, 1, 0, 2, 3, 2, 1, 0, 1, 2, 1, 0];
    this.pianoNote(this.mtof(chord[arp[s]] + 12), t0, stepDur * 0.9, 0.042, this.arpBus, 0.35);

    // Chords at the top of each bar and the half-bar.
    if (s === 0) {
      for (const note of chord) {
        this.pianoNote(this.mtof(note), t0, stepDur * 4.8, 0.042, null, 0.45);
      }
      // One of four battle lead phrases, played with more attack.
      this.pianoNote(this.mtof(melody.lead[bar]), t0, stepDur * 3.6, 0.052, this.arpBus, 0.2);
    }
    if (s === 8) {
      for (const note of chord.slice(1, 4)) {
        this.pianoNote(this.mtof(note), t0, stepDur * 2.4, 0.035, null, 0.45);
      }
      this.pianoNote(this.mtof(melody.answer[bar]), t0, stepDur * 2.8, 0.044, this.arpBus, 0.3);
    }

    // A low tolling octave at the turn of each phrase.
    if ((bar === 1 || bar === 3) && s === 0) {
      this.pianoNote(this.mtof(root - 12), t0, stepDur * 9, 0.075, null, 0.55);
    }
  }

  pickBattle2Variation() {
    const count = BATTLE2_MELODIES.length;
    let melody = Math.floor(Math.random() * count);
    if (count > 1 && melody === this.battle2MelodyIndex) {
      melody = (melody + 1 + Math.floor(Math.random() * (count - 1))) % count;
    }
    this.battle2MelodyIndex = melody;
    this.battle2Variation = melody;
    this.battle2Melody = BATTLE2_MELODIES[melody];
    this.battle2VariationName = this.battle2Melody.name;
  }

  pickRegionVariation(theme) {
    const list = EXPLORE_THEMES[theme]?.variations;
    if (!list?.length) return;
    let index = Math.floor(Math.random() * list.length);
    if (list.length > 1 && index === this.regionVariations[theme]) {
      index = (index + 1 + Math.floor(Math.random() * (list.length - 1))) % list.length;
    }
    this.regionVariations[theme] = index;
    this.regionVariationName = list[index].name;
    this.regionVariationId = list[index].id;
  }

  scheduleBattle2Step(step, t0, stepDur) {
    if (step === 0) this.pickBattle2Variation();
    const bar = Math.floor(step / 16) % 4;
    const s = step % 16;
    // Second battle theme: Dm - Bb - F - C, brighter and more martial than the
    // Am battle loop, but still minor and hard-driven.
    const chords = [
      [50, 53, 57, 62],   // Dm
      [46, 50, 53, 58],   // Bb
      [53, 57, 60, 65],   // F
      [48, 52, 55, 60]    // C
    ];
    const bassRoots = [38, 34, 41, 36];
    const chord = chords[bar];
    const root = bassRoots[bar];
    const melody = this.battle2Melody || BATTLE2_MELODIES[0];

    if (s % 2 === 0) {
      const offsets = [0, 0, 12, 7, 0, 12, 7, 12];
      this.pianoNote(this.mtof(root + offsets[s / 2]), t0, stepDur * 1.7, 0.1, null, 0.45);
    }
    const arp = [0, 2, 1, 3, 2, 1, 0, 2, 1, 3, 2, 0, 1, 2, 3, 1];
    this.pianoNote(this.mtof(chord[arp[s]] + 12), t0, stepDur * 0.9, 0.044, this.arpBus, 0.3);

    if (s === 0) {
      for (const note of chord) {
        this.pianoNote(this.mtof(note), t0, stepDur * 4.6, 0.042, null, 0.4);
      }
      this.pianoNote(this.mtof(melody.lead[bar]), t0, stepDur * 3.5, 0.054, this.arpBus, 0.18);
    }
    if (s === 8) {
      for (const note of chord.slice(1, 4)) {
        this.pianoNote(this.mtof(note), t0, stepDur * 2.3, 0.035, null, 0.4);
      }
      this.pianoNote(this.mtof(melody.answer[bar]), t0, stepDur * 2.7, 0.045, this.arpBus, 0.28);
    }
    if ((bar === 1 || bar === 3) && s === 0) {
      this.pianoNote(this.mtof(root - 12), t0, stepDur * 8, 0.07, null, 0.5);
    }
  }


  scheduleMusic() {
    if (!this.ctx || !this.musicStarted) return;
    const now = this.ctx.currentTime;
    if (this.musicNext < now - 0.4) this.musicNext = now + 0.06;
    const bpm = MUSIC_BPM[this.musicMode] || 66;
    const stepDur = 60 / bpm / 4;
    let guard = 0;
    while (this.musicNext < now + 0.22 && guard++ < 24) {
      this.scheduleMusicStep(this.musicStep, this.musicNext, stepDur);
      this.musicStep = (this.musicStep + 1) % 64;
      this.musicNext += stepDur;
    }
  }

  createMusicBus() {
    const ctx = this.ctx;
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 5200;
    filter.Q.value = 0.4;
    gain.connect(filter).connect(this.master);

    // Echo send for the arpeggio.
    const arp = ctx.createGain();
    arp.gain.value = 0.55;
    const delay = ctx.createDelay(0.6);
    delay.delayTime.value = 0.19;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.24;
    const wet = ctx.createGain();
    wet.gain.value = 0.5;
    arp.connect(gain);
    arp.connect(delay);
    delay.connect(feedback).connect(delay);
    delay.connect(wet).connect(gain);

    return { gain, filter, arp, delay, feedback, wet };
  }

  startMusic(mode = "title") {
    this.ensure();
    if (!this.ctx) return;
    if (this.musicStarted) {
      this.setMusicMode(mode);
      this.ensureMusicScheduler();
      return;
    }
    this.musicStarted = true;
    this.musicMode = mode;
    this.musicDucked = false;

    this.musicBus = this.createMusicBus();
    this.musicGain = this.musicBus.gain;
    this.arpBus = this.musicBus.arp;

    const now = this.ctx.currentTime;
    const target = musicGainFor(mode);
    this.musicGain.gain.setValueAtTime(0.0001, now);
    this.musicGain.gain.exponentialRampToValueAtTime(target, now + 0.6);
    this.ensureMusicScheduler();
  }

  ensureMusicScheduler() {
    if (!this.ctx || !this.musicStarted || this.musicTimer) return;
    if (this.ctx.state !== "running") return;
    this.musicStep = 0;
    this.musicNext = this.ctx.currentTime + 0.12;
    this.musicTimer = setInterval(() => this.scheduleMusic(), 25);
    this.scheduleMusic();
  }

  setMusicMode(mode, options = {}) {
    if (!["title", "battle", "battle2", "farm", "suburb", "city", "final"].includes(mode)) return;
    if (this.musicMode === mode) return;
    const from = this.musicMode;
    const kind = options.kind || musicTransitionKind(from, mode);
    const cfg = MUSIC_TRANSITIONS[kind] || MUSIC_TRANSITIONS.default;
    this.musicMode = mode;
    if (!this.ctx || !this.musicStarted || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const oldBus = this.musicBus;
    const newBus = this.createMusicBus();
    this.musicBus = newBus;
    this.musicGain = newBus.gain;
    this.arpBus = newBus.arp;

    // Each transition kind gets its own timing. Area changes start almost
    // silent and swell under the old theme; combat entries arrive fast, while
    // battle exits let the old drums close and the next area breathe in.
    const target = this.musicDucked ? MUSIC_DUCKED_GAIN : musicGainFor(mode);
    const gain = newBus.gain.gain;
    gain.setValueAtTime(Math.max(0.0001, target * cfg.newStart), now);
    // Linear gain ramps keep the summed level steady through the long area
    // crossfades; the filter still sweeps exponentially for a natural opening.
    gain.linearRampToValueAtTime(Math.max(0.0002, target), now + cfg.newFade);
    newBus.filter.frequency.setValueAtTime(Math.max(120, cfg.newFilter), now);
    newBus.filter.frequency.exponentialRampToValueAtTime(5200, now + cfg.newFade);

    if (oldBus) {
      const oldGain = oldBus.gain.gain;
      const oldFilter = oldBus.filter.frequency;
      // Hold whatever level the previous fade reached before releasing it, so
      // back-to-back region changes never snap to a stale gain.
      if (typeof oldGain.cancelAndHoldAtTime === "function") {
        oldGain.cancelAndHoldAtTime(now);
        oldFilter.cancelAndHoldAtTime(now);
      } else {
        oldGain.cancelScheduledValues(now);
        oldGain.setValueAtTime(Math.max(0.0001, oldGain.value), now);
        oldFilter.cancelScheduledValues(now);
        oldFilter.setValueAtTime(Math.max(120, oldFilter.value), now);
      }
      oldGain.linearRampToValueAtTime(0.0001, now + cfg.oldFade);
      oldFilter.exponentialRampToValueAtTime(Math.max(120, cfg.oldFilter), now + cfg.oldFade);
      setTimeout(() => {
        for (const node of [oldBus.gain, oldBus.filter, oldBus.arp, oldBus.delay, oldBus.feedback, oldBus.wet]) {
          try { node.disconnect(); } catch (e) { /* already gone */ }
        }
      }, cfg.cleanup);
    }

    if (options.fx !== false) this.musicTransitionFx(kind, mode, now);

    this.musicStep = 0;
    this.musicNext = now + cfg.delay;
  }

  setMusicDucked(ducked) {
    this.musicDucked = ducked;
    if (!this.ctx || !this.musicGain) return;
    const target = ducked ? MUSIC_DUCKED_GAIN : musicGainFor(this.musicMode);
    const g = this.musicGain.gain;
    const now = this.ctx.currentTime;
    // Cancel any mode-crossfade ramp so the duck state always wins.
    g.cancelScheduledValues(now);
    g.setValueAtTime(Math.max(0.0001, g.value), now);
    g.setTargetAtTime(target, now, 0.18);
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    this.musicStarted = false;
    if (this.ctx && this.musicGain) {
      this.musicGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.15);
    }
  }

  startAmbience() {
    if (!this.ctx || this.ambienceStarted) return;
    this.ambienceStarted = true;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const filt = this.ctx.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.value = 190;
    const g = this.ctx.createGain();
    g.gain.value = 0.055;
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = 0.022;
    lfo.connect(lfoGain).connect(g.gain);
    src.connect(filt).connect(g).connect(this.master);
    src.start();
    lfo.start();
  }
}
