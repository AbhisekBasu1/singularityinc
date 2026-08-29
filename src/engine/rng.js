// Deterministic, serializable PRNG (mulberry32) + weighted helpers.

export function makeRng(seed = Date.now() >>> 0) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.seed = (v) => { s = v >>> 0; };
  next.state = () => s >>> 0;
  return next;
}

// Global game RNG. Reseeded on new game / load.
export let rng = makeRng((Math.random() * 0xffffffff) >>> 0);
export function reseed(seed) { rng = makeRng(seed); return rng; }
export function rngState() { return rng.state(); }

// Put the stream back where it was. `forecast` runs the real reducers forward
// on a copy of the world, and those reducers draw from here — so without this,
// looking at a hypothetical would change what actually happens next, which is
// the one thing a hypothetical must not do.
export function setRngState(v) { rng.seed(v >>> 0); }

export const rand = () => rng();
export const randRange = (a, b) => a + rng() * (b - a);
export const randInt = (a, b) => Math.floor(a + rng() * (b - a + 1));
export const chance = (p) => rng() < p;
export const pick = (arr) => arr[Math.floor(rng() * arr.length)];

export function pickMany(arr, n) {
  const copy = arr.slice();
  const out = [];
  while (out.length < n && copy.length) {
    out.push(copy.splice(Math.floor(rng() * copy.length), 1)[0]);
  }
  return out;
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// weights: array of numbers parallel to items, or fn(item)=>weight
export function weightedPick(items, weights) {
  const w = typeof weights === 'function' ? items.map(weights) : weights;
  let total = 0;
  for (const x of w) total += Math.max(0, x);
  if (total <= 0) return null;
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= Math.max(0, w[i]);
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

// Approximately-normal via sum of uniforms. Clamped to +-3 sigma.
export function gaussian(mean = 0, sd = 1) {
  let u = 0;
  for (let i = 0; i < 6; i++) u += rng();
  const z = (u - 3) / 0.7071;
  return mean + Math.max(-3, Math.min(3, z)) * sd;
}

// Deterministic hash → [0,1) for stable "random-looking" per-key values.
export function hash01(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h >>> 0) / 4294967296;
}
