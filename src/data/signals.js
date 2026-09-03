// ─────────────────────────────────────────────────────────────────────────────
// SIGNALS — small readings of the run that authored content reacts to.
//
// A letter that arrives the week of an outage, a topic that is only on the
// phone after a round closes, a mother who can hear you have not slept: all of
// it reads the same handful of facts. They live here so the phone, the mail and
// anything written later ask the same questions the same way. Every one is a
// pure function of S and tolerates a save that predates the field it reads.
// ─────────────────────────────────────────────────────────────────────────────
import { totalUsers } from '../systems/product.js';
import { runwayDays, burnPerDay } from '../systems/economy.js';
import { aperture, co, apertureIntent } from '../systems/rivalco.js';
import { NEMESIS as NEM } from './balance.js';
import { weekday } from '../systems/calendar.js';

export const day = (S) => Math.floor(S.time.day);
export const journal = (S) => S.narrative?.journal || [];
export const recentKind = (S, kind, n = 5) => journal(S).slice(0, n).some((e) => e.kind === kind);
export const recentTone = (S, tone, n = 6) => journal(S).slice(0, n).some((e) => e.tone === tone);
export const shippedRecently = (S, d = 5) => day(S) - (S.stats?.lastShipDay ?? -99) <= d;
export const incidentRecently = (S, d = 7) => day(S) - (S.stats?.lastIncidentDay ?? -99) <= d;
// What the last incident *did*, as a verb phrase. The map itself is a leaf in
// `incidentverbs.js` and is re-exported here, because `threads.js` needs it
// and cannot import this file without closing a cycle back through
// `rivalco.js` into `feed.js`. Every existing caller of `incidentVerb` is
// unchanged.
export { incidentVerb, INCIDENT_VERBS } from './incidentverbs.js';
export const raisedRecently = (S, d = 20) => day(S) - (S.stats?.lastRaiseDay ?? -99) <= d;
export const lastLost = (S) => (S.agentsLeft || [])[0] || null;
export const lostRecently = (S, d = 14) => !!lastLost(S) && day(S) - lastLost(S).day <= d;
export const sleep = (S) => S.founder?.life?.sleep ?? 0.8;
export const health = (S) => S.founder?.life?.health ?? 0.9;
export const heat = (S) => S.world?.regulatoryHeat || 0;
export const align = (S) => S.resources?.alignment ?? 0.5;
export const rep = (S) => S.resources?.reputation || 0;
export const runway = (S) => { try { const r = runwayDays(S); return Number.isFinite(r) ? r : Infinity; } catch { return Infinity; } };
export const burn = (S) => { try { return Math.max(0, burnPerDay(S)); } catch { return 0; } };
export const profitable = (S) => runway(S) === Infinity;
export const lastPlay = (S) => { const c = aperture(S); return c ? (co(c).plays?.[0] || null) : null; };
export const playedRecently = (S, kind, d = 10) => { const p = lastPlay(S); return !!p && p.kind === kind && day(S) - p.day <= d; };
export const behindInRace = (S) => {
  const r = S.world?.race; if (!r) return false;
  const you = r.you ?? 0;
  return Object.values(r.labs || {}).some((l) => l.alive && (l.progress || 0) > you);
};
export const morale = (S) => { const a = S.agents || []; return a.length ? a.reduce((t, x) => t + (x.morale ?? 1), 0) / a.length : 1; };
export const thursday = (S) => weekday(day(S)) === 3;
export const weeks = (d) => Math.max(1, Math.round(d / 7));
export const inAct = (S, d = 6) => day(S) - (S.company?.actStartedDay ?? 0) <= d;
export const cold = (S, id) => (S.founder?.life?.ties?.[id]?.warmth ?? 1) < 0.2;
// §H12. A tie warm enough that the other person volunteers something. The
// number is `NEMESIS.TELEGRAPH_WARMTH`, because a warm Vance and a warm Vance
// telling you about a poach are the same fact.
export const warm = (S, id) => (S.founder?.life?.ties?.[id]?.warmth ?? 0) >= NEM.TELEGRAPH_WARMTH;
// What Aperture means to do next, when there is an Aperture and it has
// decided. Null everywhere else, including against a probe state.
export const rivalIntent = (S) => { try { return apertureIntent(S); } catch { return null; } };
export const sinceCall = (S, r = {}) => day(S) - (r.lastCallDay ?? -999);
export const met = (S, id) => !!S.narrative?.relationships?.[id]?.met;
export const engagedRegions = (S) => Object.values(S.world?.regions || {}).filter((r) => r.stage && r.stage !== 'none').length;
export const projectsBuilt = (S) => Object.values(S.world?.projectsBuilt || {}).reduce((a, n) => a + (n || 0), 0);
export const sentiment = (S) => S.products?.[0]?.sentiment ?? 0.5;
export const usersNow = (S) => totalUsers(S);

// ── The last act ────────────────────────────────────────────────────────────
// Which ending the founder started building, and how long ago. The first
// commitment on any path sets both; before that they are null, which is what
// every card, letter and topic written against a path has to tolerate.
export const pathChosen = (S) => S.narrative?.pathLocked || null;
export const pathDay = (S) => S.narrative?.pathLockedDay ?? null;
export const daysOnPath = (S) => (pathChosen(S) ? day(S) - (S.narrative.pathLockedDay || 0) : 0);
export const onPath = (S, id) => pathChosen(S) === id;
// The two run-ups the world can force an ending out of, in days held.
export const heatRun = (S) => S.world?.natRun || 0;
export const driftRun = (S) => S.world?.unsupRun || 0;
export const steppedBack = (S) => !!S.narrative?.flags?.founder_stepped_back;
