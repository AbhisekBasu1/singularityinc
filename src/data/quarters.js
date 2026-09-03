// ─────────────────────────────────────────────────────────────────────────────
// QUARTERS — §A7. Up to three intentions, set at the boundary, read back at
// the review ninety days later.
//
// This is the board's rhythm for a founder who does not have a board, and it
// is the thing the 350 open-gate days of Act III were missing: a run that is
// otherwise a continuous slope gets a place to say what this stretch is for
// and a card that tells you whether it was.
//
// An intention is written once and judged once:
//
//   when(S)          may this be offered at all this quarter
//   base(S, snap)    the target, computed the day it is set and stored on the
//                    plan as `base` — so a founder who sets "double the users"
//                    on a bad Tuesday is judged against that Tuesday, and a
//                    number cannot slide out from under them
//   label(base, S)   the sentence, with the number in it
//   test(S, snap, base)  kept, or not
//
// `snap` is the reading taken at the quarter boundary: features shipped, users,
// MRR, debt, rounds raised, regions engaged, the day. Nothing here draws from
// the RNG and nothing here mutates: `systems/board.js` is the only writer.
//
// A number in prose is read, never typed — every label below interpolates the
// same `base` the test uses.
// ─────────────────────────────────────────────────────────────────────────────
import { totalUsers, totalMrr } from '../systems/product.js';

const N = (n) => Math.round(n).toLocaleString();
const regionsEngaged = (S) => Object.values(S.world?.regions || {})
  .filter((r) => r.stage && r.stage !== 'none').length;

export const INTENTIONS = [
  { id: 'qi_ship', icon: '⌘', colour: '#4dd0e1',
    name: 'Ship',
    blurb: 'A quarter measured in things that exist at the end of it.',
    when: () => true,
    // Ninety days at the rate of the last ninety. `snap.prev` is the reading
    // taken at the *previous* boundary, so this is what the company actually
    // did last quarter; a company with no last quarter is asked for three.
    base: (S, snap) => Math.max(3,
      Math.round((snap.features ?? 0) - (snap.prev?.features ?? snap.features ?? 0))),
    label: (base) => `Ship ${base} features`,
    test: (S, snap, base) => (S.stats.featuresShipped - (snap.features ?? 0)) >= base },

  { id: 'qi_debt', icon: '⚙', colour: '#7c8a99',
    name: 'Hold the line on debt',
    blurb: 'The codebase is the company. Say what you will not let it become.',
    when: (S) => S.resources.techDebt > 20,
    base: (S) => Math.max(30, Math.round(S.resources.techDebt * 1.1 / 5) * 5),
    label: (base) => `Keep tech debt under ${N(base)}`,
    test: (S, snap, base) => S.resources.techDebt <= base },

  { id: 'qi_users', icon: '↗', colour: '#f5a623',
    name: 'Grow',
    blurb: 'One number, out loud, ninety days ahead of knowing.',
    when: (S) => totalUsers(S) >= 100,
    base: (S) => Math.max(200, Math.round(totalUsers(S) * 1.35)),
    label: (base) => `Reach ${N(base)} users`,
    test: (S, snap, base) => totalUsers(S) >= base },

  { id: 'qi_revenue', icon: '⛁', colour: '#34d399',
    name: 'Earn',
    blurb: 'Growth you can spend, rather than growth you can describe.',
    when: (S) => totalMrr(S) >= 1000,
    base: (S) => Math.max(2000, Math.round(totalMrr(S) * 1.3 / 100) * 100),
    label: (base) => `Reach $${N(base)} MRR`,
    test: (S, snap, base) => totalMrr(S) >= base },

  { id: 'qi_region', icon: '◎', colour: '#60a5fa',
    name: 'Land a region',
    blurb: 'A bloc that was a map last quarter and is a market this one.',
    when: (S) => !!S.unlocks?.world_map,
    base: (S) => regionsEngaged(S) + 1,
    label: (base) => `Hold a stage in ${base} regions`,
    test: (S, snap, base) => regionsEngaged(S) >= base },

  { id: 'qi_align', icon: '✦', colour: '#8b5cf6',
    name: 'Keep alignment above the line',
    blurb: 'The number nobody outside the building asks about until it is too late.',
    when: (S) => S.company.act >= 2,
    base: (S) => Math.max(0.3, Math.round((S.resources.alignment - 0.03) * 100) / 100),
    label: (base) => `Keep alignment above ${base.toFixed(2)}`,
    test: (S, snap, base) => S.resources.alignment >= base },

  { id: 'qi_noraise', icon: '⊘', colour: '#f472b6',
    name: 'Take no money',
    blurb: 'Ninety days of finding out what the thing is worth without help.',
    when: (S) => !!S.unlocks?.fundraising,
    base: (S) => S.stats.roundsRaised,
    label: () => 'Close no round this quarter',
    test: (S, snap, base) => S.stats.roundsRaised <= base },

  { id: 'qi_paydown', icon: '⌗', colour: '#00e5a0',
    name: 'Pay it down',
    blurb: 'A quarter where nothing visible happens and everything gets better.',
    when: (S) => S.resources.techDebt > 60,
    base: (S) => Math.round(S.resources.techDebt * 0.75),
    label: (base) => `Bring tech debt down to ${N(base)}`,
    test: (S, snap, base) => S.resources.techDebt <= base },

  { id: 'qi_quiet', icon: '☾', colour: '#c084fc',
    name: 'Sleep',
    blurb: 'The one intention nobody else in the company can keep for you.',
    when: () => true,
    base: () => 0.6,
    label: (base) => `Finish the quarter sleeping above ${base.toFixed(2)}`,
    test: (S, snap, base) => (S.founder?.life?.sleep ?? 0) >= base },
];

export const INTENTION_MAP = Object.fromEntries(INTENTIONS.map((i) => [i.id, i]));
