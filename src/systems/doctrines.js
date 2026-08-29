// ─────────────────────────────────────────────────────────────────────────────
// DOCTRINES — track continuous conditions and grant permanent bonuses.
// ─────────────────────────────────────────────────────────────────────────────
import { DOCTRINES, DOCTRINE_MAP } from '../data/doctrines.js';
import { markDirty } from './modifiers.js';
import { emit } from '../engine/bus.js';

export function doctrineState(S) {
  if (!S.doctrines) S.doctrines = { earned: {}, streak: {} };
  return S.doctrines;
}

export function tickDoctrines(S, days) {
  const d = doctrineState(S);
  for (const doc of DOCTRINES) {
    if (d.earned[doc.id]) continue;
    let ok = false;
    try { ok = doc.test(S); } catch (e) { ok = false; }
    if (ok) {
      d.streak[doc.id] = (d.streak[doc.id] || 0) + days;
      if (d.streak[doc.id] >= doc.hold) {
        d.earned[doc.id] = Math.floor(S.time.day);
        markDirty();
        emit('doctrine', doc);
      }
    } else if (d.streak[doc.id]) {
      d.streak[doc.id] = 0;
    }
  }
}

export function doctrineMods(S) {
  const out = {};
  const d = S.doctrines;
  if (!d) return out;
  for (const id of Object.keys(d.earned || {})) {
    const doc = DOCTRINE_MAP[id];
    if (!doc?.mods) continue;
    for (const [k, v] of Object.entries(doc.mods)) {
      if (k.startsWith('+')) out[k] = (out[k] || 0) + v;
      else out[k] = (out[k] || 1) * v;
    }
  }
  return out;
}

export function doctrineList(S) {
  const d = doctrineState(S);
  return DOCTRINES.map((doc) => {
    let visible = false;
    try { visible = doc.reveal(S); } catch (e) { visible = false; }
    return {
      ...doc,
      earned: !!d.earned[doc.id],
      earnedDay: d.earned[doc.id],
      streak: d.streak[doc.id] || 0,
      progress: Math.min(1, (d.streak[doc.id] || 0) / doc.hold),
      visible: visible || !!d.earned[doc.id],
    };
  });
}

export function earnedCount(S) { return Object.keys(doctrineState(S).earned).length; }
