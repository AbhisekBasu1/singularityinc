// ─────────────────────────────────────────────────────────────────────────────
// PER-ACT CHROME — §I5.
//
// The machine changed its wallpaper when the act turned and nothing else, so
// Act IV was Act I with a different photograph. This puts one class on `#app`
// and one token under it, and the two stylesheets spend that token on edges,
// ticks and the boot sweep — colour as structure, never as tint.
//
// Everything it says comes from `ACT_CHROME` in `src/data/machine.js`: the
// accent, the boot roll, the line the status strip holds when nothing is wrong,
// and the one word on the Desk's hero. Nothing here is a number, so nothing
// here can disagree with the simulation.
//
// It is called from both housings' `paintStatus`, which runs every frame, and
// it is a no-op unless the act actually moved — a `classList.toggle` with an
// unchanged value costs nothing, but five of them plus a `setProperty` on every
// frame is exactly the sort of thing that does.
// ─────────────────────────────────────────────────────────────────────────────
import { ACT_CHROME } from '../data/machine.js';

const ACTS = [1, 2, 3, 4, 5];
let shown = 0;

function actOf(S) {
  const a = Math.round(Number(S?.company?.act));
  return ACTS.includes(a) ? a : 1;
}

export function chromeFor(S) {
  return ACT_CHROME[actOf(S)] || ACT_CHROME[1];
}

/** The act's accent, for anything that needs it in JavaScript. */
export function actAccent(S) { return chromeFor(S).accent; }

/** What the status strip holds when nothing is wrong. */
export function nominalLine(S) { return chromeFor(S).nominal; }

/** The one word the Desk's hero wears. */
export function actWord(S) { return chromeFor(S).word; }

/** The roll the machine prints while it comes up. */
export function bootRoll(S) { return chromeFor(S).boot || []; }

/**
 * Put the act on `#app`. Both housings call this from `paintStatus`; it does
 * nothing at all unless the act moved.
 */
export function applyActChrome(S, { force = false } = {}) {
  const act = actOf(S);
  if (act === shown && !force) return act;
  shown = act;
  const app = typeof document !== 'undefined' ? document.getElementById('app') : null;
  if (!app) { shown = 0; return act; }        // no DOM yet: try again next frame
  for (const a of ACTS) app.classList.toggle(`act-${a}`, a === act);
  // On `#app` and not on `:root`, so the token is inherited by everything the
  // housing draws and by nothing outside it — the intro's own screens are film
  // and keep their own palette.
  app.style.setProperty('--act', chromeFor(S).accent);
  return act;
}

/** A rebuilt shell has a fresh `#app`; the next call has to write again. */
export function resetActChrome() { shown = 0; }
