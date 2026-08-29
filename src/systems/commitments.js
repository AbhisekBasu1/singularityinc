// ─────────────────────────────────────────────────────────────────────────────
// COMMITMENTS — executing the deliberate acts that construct an ending.
// ─────────────────────────────────────────────────────────────────────────────
import { COMMITMENTS, commitmentsFor, commitmentDone, endingReady, endingProgress } from '../data/commitments.js';
import { markDirty } from './modifiers.js';
import { emit } from '../engine/bus.js';

export function commitState(S) {
  if (!S.narrative.commitments) S.narrative.commitments = {};
  return S.narrative.commitments;
}

// The first act you take closes the other five. Without this the climax is a
// checklist — build all six, pick the ending you like best at the end — and the
// panel's own promise that "none of them reversible" is not true of anything.
export function pathLocked(S) { return S.narrative?.pathLocked || null; }
export function pathLockedDay(S) { return S.narrative?.pathLockedDay ?? null; }

export function canCommit(S, endingId, cid) {
  const c = commitmentsFor(endingId).find((x) => x.id === cid);
  if (!c || c.kind !== 'act') return { ok: false };
  if (commitmentDone(S, c)) return { ok: false, reason: 'done' };
  const locked = pathLocked(S);
  if (locked && locked !== endingId) return { ok: false, reason: 'other-path', locked, c };
  let can = true;
  try { can = c.can ? !!c.can(S) : true; } catch (e) { can = false; }
  if (!can) return { ok: false, reason: 'blocked', c };
  return { ok: true, c };
}

export function commit(S, endingId, cid) {
  const check = canCommit(S, endingId, cid);
  if (!check.ok) return check;
  const c = check.c;
  let outcome = '';
  try { outcome = c.do ? (c.do(S) || '') : ''; } catch (e) { console.error('[commit]', cid, e); }
  // Commit the path itself on the first act, not just the act.
  if (!S.narrative.pathLocked) {
    S.narrative.pathLocked = endingId;
    S.narrative.pathLockedDay = Math.floor(S.time.day);
    emit('path:locked', { endingId, day: S.narrative.pathLockedDay });
  }
  commitState(S)[cid] = Math.floor(S.time.day);
  S.narrative.commitLog = S.narrative.commitLog || [];
  S.narrative.commitLog.push({ id: cid, ending: endingId, name: c.name, day: Math.floor(S.time.day), outcome });
  if (cid === 'rf_freeze') S.narrative.flags.frozeDay = S.time.day;
  markDirty();
  emit('commitment', { endingId, commitment: c, outcome });
  return { ok: true, outcome, commitment: c };
}

export { commitmentsFor, commitmentDone, endingReady, endingProgress };
