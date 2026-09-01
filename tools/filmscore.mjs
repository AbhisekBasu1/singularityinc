// ─────────────────────────────────────────────────────────────────────────────
// THE SCORE
//
// The game has no audio files — `src/ui/audio.js` synthesises everything, and
// its bed is a slow generative drone: four oscillators (three sawtooth, one
// triangle) detuned around an act's root, through a lowpass that a very slow
// LFO keeps moving, with an occasional distant bell.
//
// So the film's music is not "something that fits the game". It is the same
// synthesis, offline, from the same constants — ACT_TONES below is copied from
// audio.js and must stay in step with it. Which also means it is original
// content end to end, and the contest rules on third-party audio never come
// into it.
//
// The act rises as the film does: the run starts in a garage and is a continent
// by the end, and the drone should have gone with it.
//
//   node tools/filmscore.mjs <seconds> <out.wav>
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs';

const SR = 48000;
const SECONDS = Number(process.argv[2] || 180);
const OUT = process.argv[3] || '/tmp/score.wav';
// A ten-second standby card cannot spend eight of them fading in.
const FADE_IN = Number(process.env.SCORE_FADEIN || 8);
const FADE_OUT = Number(process.env.SCORE_FADEOUT || 4);
// A short clip should sit in one act. Sweeping the arc across ten seconds is an
// audible downward drift rather than a film changing register.
const PIN_ACT = process.env.SCORE_ACT ? Number(process.env.SCORE_ACT) : 0;

// Copied from src/ui/audio.js. Keep in step.
const ACT_TONES = [
  null,
  { root: 65.41, fifth: 98.00, colour: 130.81, filter: 420, wobble: 0.05, bells: [523.25, 659.25, 783.99] },
  { root: 73.42, fifth: 110.00, colour: 146.83, filter: 520, wobble: 0.07, bells: [587.33, 739.99, 880.00] },
  { root: 82.41, fifth: 123.47, colour: 164.81, filter: 640, wobble: 0.09, bells: [659.25, 830.61, 987.77] },
  { root: 61.74, fifth: 92.50, colour: 146.83, filter: 760, wobble: 0.13, bells: [493.88, 622.25, 739.99, 987.77] },
  { root: 55.00, fifth: 82.41, colour: 164.81, filter: 900, wobble: 0.17, bells: [440.00, 554.37, 659.25, 880.00, 1108.7] },
];

// Where the film is, act-wise, as a fraction of its length. The game's own
// retune glides over six seconds; these are the midpoints of those glides.
const ARC = [
  { at: 0.00, act: 1 },
  { at: 0.42, act: 2 },
  { at: 0.68, act: 3 },
  { at: 0.88, act: 4 },
];

const lerp = (a, b, t) => a + (b - a) * t;
function toneAt(p) {
  if (PIN_ACT) return { ...ACT_TONES[PIN_ACT] };
  let lo = ARC[0], hi = ARC[ARC.length - 1];
  for (let i = 0; i < ARC.length - 1; i++) {
    if (p >= ARC[i].at && p <= ARC[i + 1].at) { lo = ARC[i]; hi = ARC[i + 1]; break; }
  }
  if (p >= ARC[ARC.length - 1].at) lo = hi = ARC[ARC.length - 1];
  const span = hi.at - lo.at;
  // A six-second glide at the boundary, not a step.
  const t = span > 0 ? Math.min(1, Math.max(0, (p - lo.at) / span)) : 1;
  const eased = t * t * (3 - 2 * t);
  const A = ACT_TONES[lo.act], B = ACT_TONES[hi.act];
  return {
    root: lerp(A.root, B.root, eased),
    fifth: lerp(A.fifth, B.fifth, eased),
    colour: lerp(A.colour, B.colour, eased),
    filter: lerp(A.filter, B.filter, eased),
    wobble: lerp(A.wobble, B.wobble, eased),
    bells: eased > 0.5 ? B.bells : A.bells,
  };
}

const N = Math.floor(SECONDS * SR);
const L = new Float64Array(N);
const R = new Float64Array(N);

// Four oscillators, detuned in cents the way the game does it.
const OSC = [
  { type: 'saw', gain: 0.22, detune: -10.5, pick: 'root' },
  { type: 'saw', gain: 0.22, detune: -3.5, pick: 'fifth' },
  { type: 'saw', gain: 0.22, detune: 3.5, pick: 'colour' },
  { type: 'tri', gain: 0.10, detune: 10.5, pick: 'octave' },
];
const phase = new Float64Array(OSC.length);

// Biquad lowpass, recomputed as the LFO moves the cutoff.
let b0 = 0, b1 = 0, b2 = 0, a1 = 0, a2 = 0;
function setLowpass(f0, Q) {
  const w0 = (2 * Math.PI * Math.min(f0, SR * 0.45)) / SR;
  const alpha = Math.sin(w0) / (2 * Q);
  const c = Math.cos(w0);
  const B0 = (1 - c) / 2, B1 = 1 - c, B2 = (1 - c) / 2;
  const A0 = 1 + alpha, A1 = -2 * c, A2 = 1 - alpha;
  b0 = B0 / A0; b1 = B1 / A0; b2 = B2 / A0; a1 = A1 / A0; a2 = A2 / A0;
}
let x1 = 0, x2 = 0, y1 = 0, y2 = 0;

// Bells, scheduled rather than rolled: the film wants them where it wants them.
const BELLS = [];
{
  let t = 9;
  let i = 0;
  while (t < SECONDS - 6) {
    BELLS.push({ t, i: i++ });
    t += 7.5 + ((i * 2.7) % 5.5);
  }
}
function bellAt(i, tone) { return tone.bells[i % tone.bells.length]; }

let lfoPhase = 0;
for (let n = 0; n < N; n++) {
  const t = n / SR;
  const p = t / SECONDS;
  const tone = toneAt(p);

  const lfoHz = 0.02 + tone.wobble * 0.2;
  lfoPhase += (2 * Math.PI * lfoHz) / SR;
  const cutoff = tone.filter + Math.sin(lfoPhase) * (60 + tone.filter * 0.18);
  if ((n & 63) === 0) setLowpass(Math.max(80, cutoff), 0.8);

  let s = 0;
  for (let o = 0; o < OSC.length; o++) {
    const base = OSC[o].pick === 'octave' ? tone.root * 2 : tone[OSC[o].pick];
    const f = base * Math.pow(2, OSC[o].detune / 1200);
    phase[o] += f / SR;
    if (phase[o] >= 1) phase[o] -= 1;
    const ph = phase[o];
    const v = OSC[o].type === 'saw' ? 2 * ph - 1 : 4 * Math.abs(ph - 0.5) - 1;
    s += v * OSC[o].gain;
  }

  const y = b0 * s + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
  x2 = x1; x1 = s; y2 = y1; y1 = y;

  // The bus fades in over eight seconds, exactly as startAmbient does.
  const busEnv = Math.min(1, t / FADE_IN);
  // …and back out over the last four, because a film ends.
  const outEnv = Math.min(1, Math.max(0, (SECONDS - t) / FADE_OUT));
  let out = y * 0.055 * busEnv * outEnv;

  for (const b of BELLS) {
    const dt = t - b.t;
    if (dt < 0 || dt > 6) continue;
    const f = bellAt(b.i, tone);
    const a = 0.6, d = 4.5;
    const env = dt < a ? dt / a : Math.exp(-(dt - a) / (d / 3));
    out += Math.sin(2 * Math.PI * f * dt) * 0.022 * env * busEnv * outEnv;
    const dt2 = dt - 0.4;
    if (dt2 > 0) {
      const env2 = dt2 < 0.9 ? dt2 / 0.9 : Math.exp(-(dt2 - 0.9) / (5.0 / 3));
      out += Math.sin(2 * Math.PI * f * 1.5 * dt2) * 0.010 * env2 * busEnv * outEnv;
    }
  }

  // Master, then the game's gentle limiter as a soft knee.
  // The game plays this at a whisper under a UI; a film wants it present but
  // still well under a voice, so it lands around -11 dBFS before the limiter.
  out *= 0.22 * 22;
  out = Math.tanh(out * 1.6) / 1.6;

  // A hair of stereo width from the detune, not from a delay.
  L[n] = out * 1.0;
  R[n] = out * 0.985;
}

// 16-bit stereo WAV.
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8);
buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28);
buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
let peak = 0;
for (let n = 0; n < N; n++) { peak = Math.max(peak, Math.abs(L[n]), Math.abs(R[n])); }
for (let n = 0; n < N; n++) {
  buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(L[n] * 32767))), 44 + n * 4);
  buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(R[n] * 32767))), 46 + n * 4);
}
fs.writeFileSync(OUT, buf);
console.log(`  ${OUT} · ${SECONDS}s · peak ${peak.toFixed(3)}`);
