// ─────────────────────────────────────────────────────────────────────────────
// NOTES — why a verb is greyed, in mono uppercase, computed in one place.
//
// A blocked control says what it needs: `ROSTER FULL`, `FOCUS 12 OF 30`,
// `$4.1K SHORT`, `NOTHING SHIPPED`. The workstation's menus and its right-click
// print these; the console's disabled buttons carry the same string as a
// tooltip. Three surfaces, one function each, so they cannot disagree about
// the reason. Pure functions of state, no DOM, and every one answers `null`
// when the verb is free to act.
// ─────────────────────────────────────────────────────────────────────────────
import { fmt, money } from '../engine/format.js';
import { CODE, FOUNDER } from '../data/balance.js';
import { promptCost, currentApproach } from '../systems/founder.js';
import { computeMods } from '../systems/modifiers.js';
import { maxAgents, hireCost } from '../systems/agents.js';

const safe = (fn, dflt = null) => { try { const v = fn(); return v == null ? dflt : v; } catch { return dflt; } };

export const focusNote = (S, need) =>
  `FOCUS ${Math.round(S.founder.focus)} OF ${Math.round(need)}`;

export function cashNote(S, cost) {
  return S.company.cash < cost ? `${money(cost - S.company.cash)} SHORT` : null;
}

// Prompting has three prices and the note names the one that is short.
export function promptNote(S, m = computeMods(S)) {
  const pc = safe(() => promptCost(S, m, currentApproach(S)), null);
  const focusNeed = pc?.focus ?? FOUNDER.PROMPT_FOCUS_COST;
  if (S.founder.focus < focusNeed) return focusNote(S, focusNeed);
  if (pc && S.company.cash < pc.cash) return cashNote(S, pc.cash);
  if (pc?.insight && S.resources.insight < pc.insight) {
    return `INSIGHT ${Math.round(S.resources.insight)} OF ${Math.round(pc.insight)}`;
  }
  return null;
}

// The four hands on the Desk. `null` when the hand can act.
export function actionNote(S, act, m = computeMods(S)) {
  if (act === 'prompt') return promptNote(S, m);
  const need = act === 'code' ? CODE.MANUAL_FOCUS_COST
    : act === 'users' ? FOUNDER.TALK_FOCUS_COST
    : act === 'post' ? FOUNDER.POST_FOCUS_COST : 0;
  return S.founder.focus < need ? focusNote(S, need) : null;
}

export function shipNote(S, p, cost) {
  if (!p) return 'NO PRODUCT';
  if (S.resources.code < cost) return `${fmt(Math.ceil(cost - S.resources.code))} CODE SHORT`;
  return null;
}

export function launchNote(p) {
  if (!p) return 'NO PRODUCT';
  if (p.launched) return 'ALREADY LIVE';
  return p.features.length < 1 ? 'NOTHING SHIPPED' : null;
}

export function recruitNote(S) {
  if (S.agents.length >= maxAgents(S)) return 'ROSTER FULL';
  return cashNote(S, hireCost(S));
}

export function priceNote(p) {
  return p?.launched ? null : 'NOT LAUNCHED';
}

// The tooltip form of a note: the same string, in the same mono uppercase the
// menus use, so a greyed button in the console reads exactly like a greyed row
// on the workstation. Authored HTML, as every tip is — the note is escaped
// here and the caller writes the attribute with `esc()` again.
export function noteTip(note) {
  if (!note) return '';
  return `<span class="note">${String(note).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))}</span>`;
}
