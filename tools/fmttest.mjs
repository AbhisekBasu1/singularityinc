// Formatting integrity. Every number the player reads goes through fmt(), so a
// bug here is invisible in every test that only checks the simulation and
// catastrophic in every screen at once.
//
// The rule this enforces: the string a player reads must mean the number the
// simulation holds, to within the precision the string itself claims.

import { fmt, money, pct, duration } from '../src/engine/format.js';

const MULT = { '': 1, K: 1e3, M: 1e6, B: 1e9, T: 1e12, Qa: 1e15, Qi: 1e18,
               Sx: 1e21, Sp: 1e24, Oc: 1e27, No: 1e30, Dc: 1e33 };
let fails = 0, checks = 0;
const fail = (m) => { fails++; console.log('  ✗ ' + m); };

// ── Round-trip: what the string implies must be what went in ───────────────
function roundTrip(n) {
  checks++;
  const s = fmt(n);
  const m = String(s).match(/^(-?[0-9.]+)([A-Za-z]*)$/);
  if (!m) { fail(`fmt(${n}) = "${s}" is not parseable`); return; }
  const mult = MULT[m[2]];
  if (mult === undefined) { fail(`fmt(${n}) = "${s}" has unknown suffix "${m[2]}"`); return; }
  const back = parseFloat(m[1]) * mult;
  // Two significant figures is the least fmt ever shows, so 2% is the bound.
  const err = n === 0 ? Math.abs(back) : Math.abs(back - n) / Math.abs(n);
  if (err > 0.02) fail(`fmt(${n}) = "${s}" reads as ${back} (${(err * 100).toFixed(0)}% off)`);
}

// The band that regressed: mantissa >= 100 with trailing zeros, in every tier.
for (const tier of [1e3, 1e6, 1e9, 1e12]) {
  for (const mant of [100, 110, 120, 150, 200, 300, 400, 500, 750, 900, 999, 101, 105]) {
    roundTrip(mant * tier);
  }
}
// And the rest of the range, including the sub-1000 path and negatives.
for (const n of [0, 1, 7, 9.5, 99, 100, 999, 1000, 1001, 9999, 1e5, 1.5e5, 1e7, 6.02e23,
                 -500000, -1200, -3.4e9]) roundTrip(n);

// ── Specific regressions, stated as the player would read them ─────────────
const EXPECT = [
  [fmt(500000), '500K'], [fmt(110000), '110K'], [fmt(100000), '100K'],
  [fmt(750000), '750K'], [fmt(1000000), '1M'],  [fmt(1500000), '1.5M'],
  [fmt(1e9), '1B'],      [fmt(2.5e9), '2.5B'],  [fmt(999), '999'],
  [money(500000), '$500K'], [money(-500000), '-$500K'],
];
for (const [got, want] of EXPECT) {
  checks++;
  if (got !== want) fail(`expected "${want}", got "${got}"`);
}

// ── Nothing may ever leak NaN/undefined/Infinity into the interface ────────
for (const bad of [NaN, undefined, null, Infinity, -Infinity]) {
  for (const [name, fn] of [['fmt', fmt], ['money', money], ['pct', pct], ['duration', duration]]) {
    checks++;
    let out;
    try { out = String(fn(bad)); } catch (e) { fail(`${name}(${String(bad)}) threw: ${e.message}`); continue; }
    if (/NaN|undefined|Infinity/.test(out) && out !== '∞' && out !== '-∞') {
      fail(`${name}(${String(bad)}) = "${out}"`);
    }
  }
}

// ── Monotonic: a bigger number must never print as a smaller-looking one ───
let prev = -Infinity, prevStr = '';
for (let e = 2; e <= 13; e += 0.25) {
  const n = Math.pow(10, e);
  const s = fmt(n);
  const m = String(s).match(/^([0-9.]+)([A-Za-z]*)$/);
  const back = parseFloat(m[1]) * (MULT[m[2]] ?? 1);
  checks++;
  if (back < prev * 0.98) fail(`monotonicity: fmt(${n})="${s}" reads below fmt of the previous step ("${prevStr}")`);
  prev = back; prevStr = s;
}

console.log(`\n  ${checks} formatting checks`);
if (fails) { console.log(`\n═══ ${fails} problem${fails === 1 ? '' : 's'} ═══\n`); process.exit(1); }
console.log('  formatting clean\n');
