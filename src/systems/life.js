// ─────────────────────────────────────────────────────────────────────────────
// LIFE — the person the company runs on.
//
// Three numbers the rest of the game has always implied and never modelled.
// Sleep follows the day: the Rest share of the allocation keeps it, and a
// focus bar that is empty for days erodes it. Health follows sleep, slowly,
// and it is the floor under everything: a founder at half health regains
// focus at a fraction of the rate and burns out faster. And warmth — one per
// person the founder has met — decays with silence and comes back with
// contact: a card with their face on it, a call, a Wire reply. A warm tie
// pays a small daily dividend in the one currency that person is good for,
// which is what turns the Sunday call from scenery into a decision.
//
// Everything here is bounded and slow. Nothing in this file can end a run, and
// a founder who leaves the sliders where the game put them will drift, not
// crash. The heart of the game is in the cards; this is the ground they land
// on.
// ─────────────────────────────────────────────────────────────────────────────
import { LIFE, FOUNDER } from '../data/balance.js';
import { CHARACTERS } from '../data/characters.js';
import { clamp } from '../engine/format.js';
import { emit } from '../engine/bus.js';

export function lifeState(S) {
  const f = S.founder;
  if (!f.life) f.life = { sleep: LIFE.START_SLEEP, health: LIFE.START_HEALTH, ties: {} };
  f.life.ties ??= {};
  if (!Number.isFinite(f.life.sleep)) f.life.sleep = LIFE.START_SLEEP;
  if (!Number.isFinite(f.life.health)) f.life.health = LIFE.START_HEALTH;
  return f.life;
}

// What health does to the day. 1 above the threshold, sliding to the floor
// at zero. Pure, and read by the Desk as well as the tick.
export function healthMult(S) {
  const h = lifeState(S).health;
  if (h >= LIFE.HEALTH_FULL_ABOVE) return 1;
  const short = (LIFE.HEALTH_FULL_ABOVE - h) / LIFE.HEALTH_FULL_ABOVE;
  return 1 - (1 - LIFE.HEALTH_FLOOR_MULT) * clamp(short, 0, 1);
}

// ── §A19. Sleep as judgement ────────────────────────────────────────────────
// Below the line the game stops explaining itself. Nothing here damages a
// number: what a tired founder loses is the ability to read the room. Four
// places ask this — `presentEvent` blanks the cost lines under a card's
// choices, `actionPromptAI` shifts the bands toward messy, `options()` on the
// phone offers one topic fewer, and the Desk's Life panel says so in mono, so
// that it is legible that legibility is what has gone.
//
// Pure, cheap and safe on a save with no `life` block, because it is called
// from render paths seven times a second.
export function tired(S) {
  return (S?.founder?.life?.sleep ?? LIFE.START_SLEEP) < LIFE.SLEEP_JUDGEMENT;
}
// The skill shift a tired founder's prompt takes, as a number `shiftedBands`
// adds to the relevant skill. Zero when rested.
export function sleepShift(S) { return tired(S) ? LIFE.SLEEP_SKILL_SHIFT : 0; }

export function tieFor(S, id) {
  const L = lifeState(S);
  if (!L.ties[id]) L.ties[id] = { warmth: LIFE.START_WARMTH, lastDay: null };
  return L.ties[id];
}

// Somebody the founder has met, in warmth order, with what keeping the line
// open is worth. The Desk and the Contacts app both read this.
export function ties(S) {
  const out = [];
  const rels = S.narrative?.relationships || {};
  for (const [id, r] of Object.entries(rels)) {
    const c = CHARACTERS[id];
    if (!c || !r?.met || id === 'aria') continue;
    const t = tieFor(S, id);
    const since = t.lastDay == null ? null : Math.max(0, Math.floor(S.time.day) - Math.floor(t.lastDay));
    out.push({ id, name: c.name, color: c.color, warmth: t.warmth, since, gives: c.tie?.gives || null,
               line: c.tie?.line || '', warm: t.warmth >= LIFE.WARM_ABOVE, cold: t.warmth < LIFE.COLD_BELOW });
  }
  return out.sort((a, b) => b.warmth - a.warmth);
}

// Contact. A card with their face, a call, a reply to something they posted.
export function touch(S, id, amount = LIFE.WARMTH_ON_CONTACT) {
  if (!CHARACTERS[id] || id === 'aria') return null;
  const t = tieFor(S, id);
  const was = t.warmth;
  t.warmth = clamp(t.warmth + amount, 0, 1);
  t.lastDay = S.time.day;
  if (was < LIFE.WARM_ABOVE && t.warmth >= LIFE.WARM_ABOVE) emit('life:warm', { id, name: CHARACTERS[id].name });
  return t;
}

const PAYOFF = {
  sleep:   (S, k) => { const L = lifeState(S); L.sleep = clamp(L.sleep + LIFE.PAY_SLEEP * k, 0, 1); },
  insight: (S, k) => { S.resources.insight += LIFE.PAY_INSIGHT * k; },
  rep:     (S, k) => { S.resources.reputation += LIFE.PAY_REP * k; },
  focus:   (S, k) => { S.founder.focus = clamp(S.founder.focus + LIFE.PAY_FOCUS * k, 0, S.founder.focusMax); },
  align:   (S, k) => { S.resources.alignment = clamp(S.resources.alignment + LIFE.PAY_ALIGN * k, 0, 1); },
  heat:    (S, k) => { S.world.regulatoryHeat = clamp(S.world.regulatoryHeat - LIFE.PAY_HEAT * k, 0, 100); },
};

// Once a day, from the founder's tick. `days` is fractional inside a day and
// the flows are all rates, so it is exact rather than stepped.
export function tickLife(S, days, o = {}) {
  const L = lifeState(S);
  const rest = S.founder.allocation?.rest || 0;
  // Sleep follows the Rest share; an empty bar erodes it on top.
  L.sleep = clamp(L.sleep + (rest - LIFE.SLEEP_NEED) * LIFE.SLEEP_RATE * days, 0, 1);
  if (S.founder.focus < FOUNDER.BURNOUT_THRESHOLD) L.sleep = clamp(L.sleep - LIFE.SLEEP_FOCUS_DRAG * days, 0, 1);
  if (S.founder.recovering) L.sleep = clamp(L.sleep + LIFE.RECOVERY_SLEEP * days, 0, 1);
  // Health follows sleep, with inertia.
  L.health = clamp(L.health + (L.sleep - L.health) * LIFE.HEALTH_FOLLOW * days, 0, 1);
  // Ties cool with silence and pay while they are warm.
  const decay = Math.pow(0.5, days / LIFE.WARMTH_HALFLIFE);
  for (const [id, t] of Object.entries(L.ties)) {
    const c = CHARACTERS[id];
    if (!c) continue;
    t.warmth = clamp(t.warmth * decay, 0, 1);
    const gives = c.tie?.gives;
    if (gives && PAYOFF[gives] && t.warmth > LIFE.WARM_ABOVE) {
      const k = ((t.warmth - LIFE.WARM_ABOVE) / (1 - LIFE.WARM_ABOVE)) * days;
      PAYOFF[gives](S, k);
    }
  }
  return L;
}

// One line for the Desk, in the register of the rest of the panel.
export function sleepWord(v) {
  return v >= 0.8 ? 'rested' : v >= 0.55 ? 'short' : v >= 0.3 ? 'thin' : 'running on nothing';
}
export function healthWord(v) {
  return v >= 0.8 ? 'well' : v >= 0.6 ? 'holding' : v >= 0.35 ? 'worn' : 'unwell';
}
export function warmthWord(t) {
  if (t.since == null) return 'quiet';
  if (t.warm) return 'warm';
  if (t.cold) return 'cold';
  return 'cooling';
}
