// ─────────────────────────────────────────────────────────────────────────────
// THE WORLD'S VOCABULARY
//
// Everything an assistant-authored card is allowed to do to you, and nothing
// else. There is no path from a tool to a reducer: a tool produces one of these
// objects, `validate.js` bounds it, and `applyEffects` spends it through the
// same `makeFx` the authored deck uses. If a key is not in this table, the
// world cannot touch it — no equity, no research unlocks, no firing your
// agents, no ending the run.
// ─────────────────────────────────────────────────────────────────────────────
import { makeFx } from '../systems/narrative.js';
import { THREAD_FX } from '../systems/feed.js';
import { fmt, money } from '../engine/format.js';

// key → how it is spent. `fx` names a method on makeFx(); `thread` names one of
// the product-side handlers the live threads already use.
export const EFFECT_KEYS = {
  cash:      { via: 'fx',     label: 'cash',        unit: 'money' },
  rep:       { via: 'fx',     label: 'reputation',  unit: 'int' },
  insight:   { via: 'fx',     label: 'insight',     unit: 'int' },
  code:      { via: 'fx',     label: 'code',        unit: 'int' },
  focus:     { via: 'fx',     label: 'focus',       unit: 'int' },
  users:     { via: 'fx',     label: 'users',       unit: 'int' },
  align:     { via: 'fx',     label: 'alignment',   unit: 'ratio' },
  heat:      { via: 'fx',     label: 'regulatory heat', unit: 'int' },
  opinion:   { via: 'fx',     label: 'public approval', unit: 'ratio' },
  debt:      { via: 'fx',     label: 'tech debt',   unit: 'int' },
  research:  { via: 'fx',     label: 'research',    unit: 'int' },
  influence: { via: 'fx',     label: 'influence',   unit: 'int' },
  awareness: { via: 'thread', label: 'awareness',   unit: 'int' },
  sentiment: { via: 'thread', label: 'sentiment',   unit: 'ratio' },
  affinity:  { via: 'rel',    label: 'affinity',    unit: 'int' },
};

export const EFFECT_KEY_LIST = Object.keys(EFFECT_KEYS);

// Deliberately absent, and the reason for each, because the next person to read
// this will want to add one of them:
//   days            the world does not get to move the clock
//   equity, skill   the founder's own position and abilities
//   unlock, achieve the tech tree and the trophy case are earned, not given
//   control         territory is taken through the World module
//   competitorHit / competitorKill   rivals live or die by the market, not by fiat
//   fireAll, killRogue, constrainRogue, clearRogue   never touch the roster
//   endRun          the world cannot end your run. That is the whole promise.
//   chain           authored arcs are authored

// Apply a validated effects object. `charId` is the card's character, used by
// `affinity`. Returns the same `[key, value]` log the authored deck produces,
// so the journal and the outcome strip render agent cards identically.
export function applyEffects(S, effects = {}, charId = null) {
  return applyEffectsWith(makeFx(S), S, effects, charId);
}

// The same thing, spending an fx collector somebody else owns. `resolveChoice`
// builds one, hands it to the choice, and journals *its* log — so a world card
// that made its own would apply real changes and then report none of them, and
// the timeline would show a card that did nothing.
export function applyEffectsWith(fx, S, effects = {}, charId = null) {
  const log = [];
  // The rolling budget is spent here rather than at validation, because what
  // matters is what the founder actually chose, not what they were offered.
  const rec = S?.world?.author?.recent;
  if (rec) {
    rec.taken = rec.taken || [];
    for (const [k, v] of Object.entries(effects)) {
      if (k === 'flags' || !Number.isFinite(v)) continue;
      if (isAdverse(k, v)) rec.taken.push([S.time.day, k, v]);
    }
  }
  for (const [k, v] of Object.entries(effects)) {
    if (k === 'flags') continue;
    const spec = EFFECT_KEYS[k];
    if (!spec || !Number.isFinite(v) || v === 0) continue;
    if (spec.via === 'fx') { fx[k](v); }
    else if (spec.via === 'thread') { THREAD_FX[k]?.(S, v); log.push([k, v]); }
    else if (spec.via === 'rel' && charId) { fx.relate(charId, { affinity: v }); }
  }
  // Continuity markers. Prefixed so nothing the authored deck reads can be
  // forged, and so a save tells you which flags a world wrote.
  for (const name of effects.flags || []) {
    if (typeof name === 'string' && name.length <= 40) fx.flag('world_' + name.replace(/[^a-z0-9_]/gi, '_'));
  }
  return fx._log.concat(log);
}

// "−$2,000 cash · +12 reputation" — the strip under an outcome, and the line
// under a proposal the founder is about to accept.
export function describeEffects(effects = {}) {
  const parts = [];
  for (const [k, v] of Object.entries(effects)) {
    if (k === 'flags' || !Number.isFinite(v) || v === 0) continue;
    const spec = EFFECT_KEYS[k];
    if (!spec) continue;
    const sign = v > 0 ? '+' : '−';
    const mag = Math.abs(v);
    const n = spec.unit === 'money' ? money(mag)
            : spec.unit === 'ratio' ? (mag * 100).toFixed(mag < 0.01 ? 1 : 0) + '%'
            : fmt(mag);
    parts.push(`${sign}${n} ${spec.label}`);
  }
  return parts.join(' · ');
}

// The net effect on one key across a whole choice — used by the protected-key
// rule, which forbids a card that is adverse on the same axis whichever button
// the founder presses.
export function netOn(choice, key) {
  const v = choice?.effects?.[key];
  return Number.isFinite(v) ? v : 0;
}

// Heat is the one key where "up" is bad. Everything else reads the normal way.
export const ADVERSE_WHEN_POSITIVE = new Set(['heat', 'debt']);

export function isAdverse(key, value) {
  if (!Number.isFinite(value) || value === 0) return false;
  return ADVERSE_WHEN_POSITIVE.has(key) ? value > 0 : value < 0;
}
