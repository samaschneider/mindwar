// All audio is synthesised at runtime with WebAudio. No asset files.

// Music sits well under gunfire in the mix but must still be clearly audible.
// The standalone score page uses the same levels relative to its master gain.
const MUSIC_TITLE_GAIN = 1.7;
const MUSIC_BATTLE_GAIN = 1.5;
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
    else this.scheduleTitleStep(step, t0, stepDur);
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

  scheduleBattleStep(step, t0, stepDur) {
    const bar = Math.floor(step / 16) % 4;
    const s = step % 16;
    // The battle track is the same sad theme under pressure: same minor
    // harmony and descending melody, but driven hard and kept dark.
    const chords = [
      [57, 60, 64, 69],   // Am
      [53, 57, 60, 64],   // Fmaj7
      [50, 53, 57, 62],   // Dm
      [52, 55, 59, 64]    // Em
    ];
    const bassRoots = [45, 41, 38, 40];
    const chord = chords[bar];
    const root = bassRoots[bar];

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
      // The title theme's descending melody, played with more attack.
      const melody = [76, 74, 72, 71][bar];
      this.pianoNote(this.mtof(melody), t0, stepDur * 3.6, 0.052, this.arpBus, 0.2);
    }
    if (s === 8) {
      for (const note of chord.slice(1, 4)) {
        this.pianoNote(this.mtof(note), t0, stepDur * 2.4, 0.035, null, 0.45);
      }
      const answer = [72, 69, 67, 64][bar];
      this.pianoNote(this.mtof(answer), t0, stepDur * 2.8, 0.044, this.arpBus, 0.3);
    }

    // A low tolling octave at the turn of each phrase.
    if ((bar === 1 || bar === 3) && s === 0) {
      this.pianoNote(this.mtof(root - 12), t0, stepDur * 9, 0.075, null, 0.55);
    }
  }

  scheduleMusic() {
    if (!this.ctx || !this.musicStarted) return;
    const now = this.ctx.currentTime;
    if (this.musicNext < now - 0.4) this.musicNext = now + 0.06;
    const bpm = this.musicMode === "battle" ? 118 : 66;
    const stepDur = 60 / bpm / 4;
    let guard = 0;
    while (this.musicNext < now + 0.22 && guard++ < 24) {
      this.scheduleMusicStep(this.musicStep, this.musicNext, stepDur);
      this.musicStep = (this.musicStep + 1) % 64;
      this.musicNext += stepDur;
    }
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

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.0001;
    const busFilter = this.ctx.createBiquadFilter();
    busFilter.type = "lowpass";
    busFilter.frequency.value = 5200;
    busFilter.Q.value = 0.4;
    this.musicGain.connect(busFilter).connect(this.master);

    // Echo send for the arpeggio.
    this.arpBus = this.ctx.createGain();
    this.arpBus.gain.value = 0.55;
    const delay = this.ctx.createDelay(0.6);
    delay.delayTime.value = 0.19;
    const feedback = this.ctx.createGain();
    feedback.gain.value = 0.24;
    const wet = this.ctx.createGain();
    wet.gain.value = 0.5;
    this.arpBus.connect(this.musicGain);
    this.arpBus.connect(delay);
    delay.connect(feedback).connect(delay);
    delay.connect(wet).connect(this.musicGain);

    this.setMusicDucked(false);
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

  setMusicMode(mode) {
    if (mode !== "title" && mode !== "battle") return;
    if (this.musicMode === mode) return;
    this.musicMode = mode;
    if (!this.ctx || !this.musicStarted || !this.musicGain) return;
    const now = this.ctx.currentTime;
    this.musicStep = 0;
    this.musicNext = now + 0.12;
    const target = this.musicDucked ? MUSIC_DUCKED_GAIN : (mode === "battle" ? MUSIC_BATTLE_GAIN : MUSIC_TITLE_GAIN);
    const g = this.musicGain.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(Math.max(0.0001, g.value), now);
    g.exponentialRampToValueAtTime(0.0001, now + 0.08);
    g.exponentialRampToValueAtTime(target, now + 0.38);
  }

  setMusicDucked(ducked) {
    this.musicDucked = ducked;
    if (!this.ctx || !this.musicGain) return;
    const target = ducked ? MUSIC_DUCKED_GAIN : (this.musicMode === "battle" ? MUSIC_BATTLE_GAIN : MUSIC_TITLE_GAIN);
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
