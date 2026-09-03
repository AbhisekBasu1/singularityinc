// ─────────────────────────────────────────────────────────────────────────────
// SPEND THE BAR — one keystroke for the thing the founder was going to press
// eleven times anyway.
//
// The Act I loop is literally key-mashing: Q, Q, Q, Q until there is enough
// code for a feature, and the interface celebrated the *mashing* — a streak
// chip that counted keypresses. This runs the same hand repeatedly through the
// same four functions in `src/systems/founder.js`, so every guard those have
// still holds, and it stops the moment the game wants the founder back.
//
// Four rules, and the fourth is the one that makes it safe:
//
//   · It never calls anything the buttons do not. `actionWriteCode`,
//     `actionPromptAI`, `actionTalkToUsers` and `actionPost` are the whole of
//     the mechanism, so a change to any of their costs changes this too.
//   · It stops on a target, not on a count. Prompting stops when the next
//     feature is covered; talking stops when a prompt is affordable again.
//     Where there is no target it stops at the focus floor, which is what
//     "spend the bar" means.
//   · It stops on anything that would have stopped a hand: a card on the table,
//     the phone ringing, a walkthrough hold, a refusal from the action itself.
//     `plan()` says which of those it is before the founder presses anything.
//   · It is pure of the DOM and of the clock. `run()` mutates state and returns
//     what it did; the caller paints, plays the sound and reports it.
// ─────────────────────────────────────────────────────────────────────────────
import { CODE, FOUNDER } from '../data/balance.js';
import { fmt } from '../engine/format.js';
import { activeProduct } from '../engine/state.js';
import { computeMods } from '../systems/modifiers.js';
import { featureCost } from './product.js';
import { actionWriteCode, actionPromptAI, actionTalkToUsers, actionPost,
         promptCost, currentApproach } from './founder.js';

const FNS = {
  code: (S, m) => actionWriteCode(S, m),
  prompt: (S, m) => actionPromptAI(S, m),
  users: (S, m) => actionTalkToUsers(S, m),
  post: (S, m) => actionPost(S, m),
};

const safe = (fn, dflt = null) => { try { const v = fn(); return v === undefined ? dflt : v; } catch { return dflt; } };

/** The focus the run refuses to spend, so the bar is never left at nothing. */
export function floorFor(S) {
  return Math.max(0, (S.founder?.focusMax || 0) * FOUNDER.SPEND_FLOOR);
}

// ── What it would do ────────────────────────────────────────────────────────
// A target is a predicate on state plus the sentence that describes it. Two of
// the four have one; the other two spend the bar, and say so.
function targetFor(S, act) {
  const p = activeProduct(S);
  if (act === 'code' || act === 'prompt') {
    if (!p) return null;
    const cost = safe(() => featureCost(S, p), 0) || 0;
    if (!(cost > 0) || S.resources.code >= cost) return null;
    return { met: (st) => st.resources.code >= cost, say: `until the next feature is covered · ${fmt(Math.ceil(cost))} code` };
  }
  if (act === 'users') {
    const pc = safe(() => promptCost(S, computeMods(S), currentApproach(S)), null);
    const need = pc?.insight || 0;
    if (!(need > 0) || S.resources.insight >= need) return null;
    return { met: (st) => st.resources.insight >= need, say: `until insight reaches ${fmt(Math.ceil(need))} and you can prompt again` };
  }
  return null;
}

/**
 * What one press would do, before it does it. `{ ok, note, say, target }` —
 * `note` is a mono uppercase reason in the same register every other blocked
 * verb in the game uses, and it is `null` when the run may go ahead.
 */
export function plan(S, act) {
  if (!FNS[act]) return { ok: false, note: 'NO SUCH HAND', say: '' };
  const t = targetFor(S, act);
  const say = t ? t.say : 'until the bar is spent';
  if (S?.narrative?.activeEvent && !S.narrative.activeEvent.outcome) return { ok: false, note: 'A CARD IS OPEN', say, target: t };
  if (S?.calls?.active) return { ok: false, note: 'ON THE PHONE', say, target: t };
  if (S?.tutorialHold) return { ok: false, note: 'FINISH THE STEP', say, target: t };
  if ((S?.founder?.focus || 0) <= floorFor(S)) {
    return { ok: false, note: `FOCUS ${Math.round(S.founder.focus)} OF ${Math.round(floorFor(S)) + 1}`, say, target: t };
  }
  return { ok: true, note: null, say, target: t };
}

// Something that would have taken the founder's hand off the key.
function interrupted(S) {
  return !!((S.narrative?.activeEvent && !S.narrative.activeEvent.outcome)
    || S.calls?.active || S.tutorialHold || S.modalBlocking);
}

/**
 * Run the hand until the target is met, the floor is reached, or the game asks
 * for the founder back. Returns what it did, in the terms the founder will read
 * it in: how many times, what it produced, and why it stopped.
 *
 *   reason: 'target' | 'floor' | 'refused' | 'interrupted' | 'cap'
 */
export function run(S, act) {
  const fn = FNS[act];
  if (!fn) return { ok: false, n: 0, reason: 'refused' };
  const p0 = plan(S, act);
  if (!p0.ok) return { ok: false, n: 0, reason: 'refused', note: p0.note };

  const before = {
    code: S.resources.code, insight: S.resources.insight,
    reputation: S.resources.reputation, focus: S.founder.focus,
  };
  const target = p0.target;
  const floor = floorFor(S);
  let n = 0;
  let reason = 'floor';
  let viral = false;
  for (let i = 0; i < FOUNDER.SPEND_MAX_STEPS; i++) {
    if (interrupted(S)) { reason = 'interrupted'; break; }
    if (S.founder.focus <= floor) { reason = 'floor'; break; }
    // `computeMods` is cached and every one of these can dirty it, so it is
    // asked for again each pass rather than hoisted out of the loop.
    const r = fn(S, computeMods(S));
    if (!r?.ok) { reason = n ? 'refused' : 'refused'; break; }
    n++;
    if (r.viral) viral = true;
    if (target && target.met(S)) { reason = 'target'; break; }
    if (i === FOUNDER.SPEND_MAX_STEPS - 1) reason = 'cap';
  }
  if (!n) return { ok: false, n: 0, reason: 'refused', note: p0.note };
  return {
    ok: true, n, reason, viral,
    gained: {
      code: S.resources.code - before.code,
      insight: S.resources.insight - before.insight,
      reputation: S.resources.reputation - before.reputation,
      focus: before.focus - S.founder.focus,
    },
  };
}

/** What it did, as a sentence. The caller prints this; it invents no number. */
export function summarise(S, act, r) {
  if (!r?.ok) return '';
  const g = r.gained || {};
  const bits = [];
  if (g.code >= 1) bits.push(`+${fmt(g.code, 1)} code`);
  if (g.insight >= 0.1) bits.push(`+${fmt(g.insight, 1)} insight`);
  if (g.reputation >= 0.1) bits.push(`+${fmt(g.reputation, 1)} rep`);
  if (g.focus >= 1) bits.push(`−${fmt(g.focus)} focus`);
  return bits.join(' · ');
}

export const VERB_COUNT = (n) => `${n} time${n === 1 ? '' : 's'}`;
export { CODE };
