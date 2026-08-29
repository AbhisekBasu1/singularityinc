// ─────────────────────────────────────────────────────────────────────────────
// AUDIO — fully synthesised. No assets, no loading, no licensing.
// Small, warm, restrained: a UI that ticks rather than a game that beeps.
// ─────────────────────────────────────────────────────────────────────────────

let ctx = null;
let master = null;
let enabled = true;
let unlocked = false;

const NOTE = { C3: 130.81, D3: 146.83, E3: 164.81, G3: 196.00, A3: 220.00,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.00, C6: 1046.50, E6: 1318.5 };

export function initAudio() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.22;
    // Gentle limiter so stacked sounds never spike.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 22; comp.ratio.value = 8;
    comp.attack.value = 0.003; comp.release.value = 0.14;
    master.connect(comp); comp.connect(ctx.destination);
  } catch (e) { ctx = null; }
  return ctx;
}

export function setEnabled(v) { enabled = v; if (!v) stopAmbient(); }
export function isEnabled() { return enabled; }
export function setVolume(v) { if (master) master.gain.value = Math.max(0, Math.min(1, v)) * 0.4; }

function unlock() {
  if (unlocked) return;
  initAudio();
  if (ctx?.state === 'suspended') ctx.resume();
  unlocked = true;
}
['pointerdown', 'keydown'].forEach((e) => document.addEventListener(e, unlock, { once: false }));

function env(node, { a = 0.004, d = 0.09, s = 0, r = 0.06, peak = 1, t = 0 } = {}) {
  const g = ctx.createGain();
  const now = ctx.currentTime + t;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), now + a);
  if (s > 0) {
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * s), now + a + d);
    g.gain.exponentialRampToValueAtTime(0.0001, now + a + d + r);
  } else {
    g.gain.exponentialRampToValueAtTime(0.0001, now + a + d);
  }
  node.connect(g);
  return { g, stop: now + a + d + (s > 0 ? r : 0) + 0.02 };
}

function tone({ freq = 440, type = 'sine', t = 0, peak = 0.3, a = 0.004, d = 0.12, s = 0, r = 0.08,
                detune = 0, glide = 0, filter = null }) {
  if (!enabled || !ctx) return;
  const osc = ctx.createOscillator();
  osc.type = type;
  const now = ctx.currentTime + t;
  osc.frequency.setValueAtTime(freq, now);
  if (glide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * glide), now + a + d);
  if (detune) osc.detune.value = detune;
  let src = osc;
  if (filter) {
    const f = ctx.createBiquadFilter();
    f.type = filter.type || 'lowpass';
    f.frequency.value = filter.freq || 1800;
    f.Q.value = filter.q ?? 1;
    osc.connect(f); src = f;
  }
  const { g, stop } = env(src, { a, d, s, r, peak, t });
  g.connect(master);
  osc.start(now);
  osc.stop(stop);
}

function noise({ t = 0, peak = 0.2, d = 0.12, freq = 1200, type = 'lowpass', q = 1 }) {
  if (!enabled || !ctx) return;
  const len = Math.max(1, Math.floor(ctx.sampleRate * (d + 0.05)));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  src.connect(f);
  const { g, stop } = env(f, { a: 0.002, d, peak, t });
  g.connect(master);
  src.start(ctx.currentTime + t);
  src.stop(stop);
}

function chord(freqs, opts = {}) { freqs.forEach((f, i) => tone({ freq: f, t: (opts.spread || 0) * i, ...opts })); }

// ── The kit ────────────────────────────────────────────────────────────────
export const SFX = {
  click:   () => { tone({ freq: 620, type: 'triangle', peak: 0.09, a: 0.001, d: 0.045 });
                   noise({ peak: 0.035, d: 0.03, freq: 3200, type: 'highpass' }); },
  code:    () => { tone({ freq: 380 + Math.random() * 90, type: 'square', peak: 0.055, a: 0.001, d: 0.05,
                          filter: { freq: 1400, q: 2 } }); },
  prompt:  () => { tone({ freq: NOTE.E5, type: 'sine', peak: 0.10, a: 0.006, d: 0.13 });
                   tone({ freq: NOTE.B4, type: 'sine', peak: 0.07, a: 0.006, d: 0.17, t: 0.035 }); },
  promptGood: () => chord([NOTE.E5, NOTE.G5, NOTE.C6], { type: 'sine', peak: 0.10, d: 0.28, spread: 0.045 }),
  promptBad:  () => { tone({ freq: 180, type: 'sawtooth', peak: 0.10, a: 0.003, d: 0.20, glide: 0.6,
                             filter: { freq: 700, q: 3 } }); },
  insight: () => { tone({ freq: NOTE.A4, type: 'sine', peak: 0.09, a: 0.01, d: 0.20 });
                   tone({ freq: NOTE.E5, type: 'sine', peak: 0.06, a: 0.01, d: 0.24, t: 0.06 }); },
  post:    () => { tone({ freq: NOTE.D4, type: 'triangle', peak: 0.08, a: 0.004, d: 0.14, glide: 1.5 }); },
  viral:   () => { chord([NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.E6],
                    { type: 'sine', peak: 0.12, d: 0.42, spread: 0.055 });
                   noise({ peak: 0.05, d: 0.35, freq: 5000, type: 'highpass' }); },
  ship:    () => { chord([NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5],
                    { type: 'triangle', peak: 0.13, d: 0.30, spread: 0.05 }); },
  launch:  () => { chord([NOTE.C3, NOTE.G3, NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5],
                    { type: 'sine', peak: 0.15, a: 0.02, d: 0.9, spread: 0.08 });
                   noise({ peak: 0.09, d: 1.1, freq: 900, type: 'lowpass' }); },
  research:() => { chord([NOTE.D4, NOTE.A4, NOTE.D5], { type: 'sine', peak: 0.11, d: 0.5, spread: 0.07 }); },
  achieve: () => { chord([NOTE.G4, NOTE.B4, NOTE.D5, NOTE.G5],
                    { type: 'sine', peak: 0.12, d: 0.44, spread: 0.06 });
                   tone({ freq: NOTE.G5 * 2, type: 'sine', peak: 0.05, a: 0.02, d: 0.6, t: 0.18 }); },
  levelUp: () => { [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6].forEach((f, i) =>
                    tone({ freq: f, type: 'triangle', peak: 0.11, d: 0.16, t: i * 0.06 })); },
  money:   () => { tone({ freq: NOTE.E5, type: 'triangle', peak: 0.10, d: 0.10 });
                   tone({ freq: NOTE.G5, type: 'triangle', peak: 0.09, d: 0.16, t: 0.06 }); },
  bad:     () => { tone({ freq: 110, type: 'sawtooth', peak: 0.13, a: 0.004, d: 0.32, glide: 0.55,
                          filter: { freq: 500, q: 2 } });
                   noise({ peak: 0.06, d: 0.22, freq: 400, type: 'lowpass' }); },
  alarm:   () => { [0, 0.16].forEach((t) => tone({ freq: 330, type: 'square', peak: 0.09, d: 0.12, t,
                          filter: { freq: 900, q: 4 } })); },
  event:   () => { tone({ freq: NOTE.A3, type: 'sine', peak: 0.10, a: 0.05, d: 0.55 });
                   tone({ freq: NOTE.E4, type: 'sine', peak: 0.07, a: 0.06, d: 0.6, t: 0.08 }); },
  choose:  () => { tone({ freq: 520, type: 'triangle', peak: 0.10, a: 0.002, d: 0.09 });
                   tone({ freq: 780, type: 'sine', peak: 0.06, a: 0.004, d: 0.14, t: 0.04 }); },
  act:     () => { chord([NOTE.C3, NOTE.G3, NOTE.C4, NOTE.G4, NOTE.C5],
                    { type: 'sine', peak: 0.16, a: 0.4, d: 2.4, spread: 0.22 }); },
  hire:    () => { tone({ freq: NOTE.G4, type: 'sine', peak: 0.10, d: 0.14 });
                   tone({ freq: NOTE.D5, type: 'sine', peak: 0.09, d: 0.22, t: 0.07 });
                   noise({ peak: 0.03, d: 0.12, freq: 4200, type: 'highpass', t: 0.02 }); },
  project: () => { tone({ freq: NOTE.C3, type: 'sine', peak: 0.14, a: 0.03, d: 0.8 });
                   noise({ peak: 0.08, d: 0.5, freq: 300, type: 'lowpass' }); },
  tick:    () => { tone({ freq: 900, type: 'sine', peak: 0.03, a: 0.001, d: 0.02 }); },
};

// ── Ambient bed ────────────────────────────────────────────────────────────
// A slow generative drone that changes character with the act. Very quiet by
// design: you should notice it only when it stops.
let amb = null;

const ACT_TONES = [
  null,
  { root: 65.41,  fifth: 98.00,  colour: 130.81, filter: 420,  wobble: 0.05, bellRate: 0.010, bells: [523.25, 659.25, 783.99] },
  { root: 73.42,  fifth: 110.00, colour: 146.83, filter: 520,  wobble: 0.07, bellRate: 0.014, bells: [587.33, 739.99, 880.00] },
  { root: 82.41,  fifth: 123.47, colour: 164.81, filter: 640,  wobble: 0.09, bellRate: 0.018, bells: [659.25, 830.61, 987.77] },
  { root: 61.74,  fifth: 92.50,  colour: 146.83, filter: 760,  wobble: 0.13, bellRate: 0.024, bells: [493.88, 622.25, 739.99, 987.77] },
  { root: 55.00,  fifth: 82.41,  colour: 164.81, filter: 900,  wobble: 0.17, bellRate: 0.030, bells: [440.00, 554.37, 659.25, 880.00, 1108.7] },
];

export function startAmbient(actGetter) {
  if (!ctx) initAudio();
  if (!ctx || amb) return;
  const bus = ctx.createGain();
  bus.gain.value = 0.0001;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass'; filter.frequency.value = 500; filter.Q.value = 0.8;
  filter.connect(bus); bus.connect(master);

  const oscs = [];
  for (let i = 0; i < 4; i++) {
    const o = ctx.createOscillator();
    o.type = i === 3 ? 'triangle' : 'sawtooth';
    o.frequency.value = 65.41;
    o.detune.value = (i - 1.5) * 7;
    const g = ctx.createGain();
    g.gain.value = i === 3 ? 0.10 : 0.22;
    o.connect(g); g.connect(filter);
    o.start();
    oscs.push({ o, g });
  }
  // Slow filter movement so the pad never sits still.
  const lfo = ctx.createOscillator();
  lfo.type = 'sine'; lfo.frequency.value = 0.035;
  const lfoGain = ctx.createGain(); lfoGain.gain.value = 90;
  lfo.connect(lfoGain); lfoGain.connect(filter.frequency);
  lfo.start();

  amb = { bus, filter, oscs, lfo, lfoGain, act: 0, timer: null, bellTimer: null };
  bus.gain.exponentialRampToValueAtTime(0.055, ctx.currentTime + 8);

  const retune = () => {
    if (!amb || !enabled) return;
    const act = Math.max(1, Math.min(5, actGetter?.() || 1));
    const t = ACT_TONES[act];
    if (act !== amb.act) {
      amb.act = act;
      const now = ctx.currentTime;
      const freqs = [t.root, t.fifth, t.colour, t.root * 2];
      amb.oscs.forEach((x, i) => x.o.frequency.exponentialRampToValueAtTime(freqs[i], now + 6));
      amb.filter.frequency.exponentialRampToValueAtTime(t.filter, now + 6);
      amb.lfo.frequency.setValueAtTime(0.02 + t.wobble * 0.2, now);
      amb.lfoGain.gain.setValueAtTime(60 + t.filter * 0.18, now);
    }
    // Occasional distant bell.
    if (Math.random() < (t.bellRate * 14)) {
      const f = t.bells[Math.floor(Math.random() * t.bells.length)];
      tone({ freq: f, type: 'sine', peak: 0.022, a: 0.6, d: 4.5 });
      tone({ freq: f * 1.5, type: 'sine', peak: 0.010, a: 0.9, d: 5.0, t: 0.4 });
    }
  };
  retune();
  amb.timer = setInterval(retune, 2600);
}

export function stopAmbient() {
  if (!amb || !ctx) return;
  clearInterval(amb.timer);
  const now = ctx.currentTime;
  amb.bus.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
  const dead = amb; amb = null;
  setTimeout(() => {
    try { dead.oscs.forEach((x) => x.o.stop()); dead.lfo.stop(); } catch (e) { /* already stopped */ }
  }, 2000);
}

export function setAmbient(on, actGetter) {
  if (on) startAmbient(actGetter); else stopAmbient();
}

export function play(name) {
  if (!enabled) return;
  if (!ctx) initAudio();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  try { SFX[name]?.(); } catch (e) { /* never let audio break the game */ }
}
