// ─────────────────────────────────────────────────────────────────────────────
// DOCTRINES — track continuous conditions and grant permanent bonuses.
// ─────────────────────────────────────────────────────────────────────────────
import { DOCTRINES, DOCTRINE_MAP, FORBIDS } from '../data/doctrines.js';
import { DOCTRINE as DB } from '../data/balance.js';
import { markDirty } from './modifiers.js';
import { emit } from '../engine/bus.js';

export function doctrineState(S) {
  if (!S.doctrines) S.doctrines = { earned: {}, streak: {}, fail: {}, lapsed: {} };
  S.doctrines.fail ??= {};
  S.doctrines.lapsed ??= {};
  return S.doctrines;
}

// How long a held doctrine may be false before it is gone. The same clock it
// was earned on, with a floor so One Take — earned on a single day — is not a
// hair trigger.
export function lapseDays(doc) {
  return Math.max(DB.LAPSE_MIN_DAYS, doc.hold * DB.LAPSE_HOLD_MULT);
}

// §A20. A doctrine used to be permanent: "Beloved" survived a company nobody
// loved any more, and the immunities it took away from the world layer never
// came back. It is a standing condition now — held while it is true, lost when
// it has been false for as long as it had to be true. The achievement stays;
// the bonus goes; `src/world/validate.js` reads `earned` live, so a lapse hands
// the world back the tone or the key on the same tick.
export function tickDoctrines(S, days) {
  const d = doctrineState(S);
  for (const doc of DOCTRINES) {
    let ok = false;
    try { ok = doc.test(S); } catch (e) { ok = false; }
    // An exclusive pair is a door you closed by choosing the other one. Total
    // War is a company that has decided the market has room for one, and it
    // does not also get to be Beloved.
    if (ok && forbiddenNow(S, doc.id)) ok = false;
    // `!= null`, not truthiness: the value stored is the day it was earned, and
    // a doctrine earned on day zero stored a falsy 0 that read as "not earned".
    // `one_take` holds for a single day and is the one that can get near it.
    if (d.earned[doc.id] != null) {
      if (ok) { d.fail[doc.id] = 0; continue; }
      d.fail[doc.id] = (d.fail[doc.id] || 0) + days;
      if (d.fail[doc.id] >= lapseDays(doc)) {
        delete d.earned[doc.id];
        d.fail[doc.id] = 0;
        d.streak[doc.id] = 0;
        d.lapsed[doc.id] = Math.floor(S.time.day);
        markDirty();
        emit('doctrine:lapsed', doc);
      }
      continue;
    }
    if (ok) {
      d.streak[doc.id] = (d.streak[doc.id] || 0) + days;
      if (d.streak[doc.id] >= doc.hold) {
        d.earned[doc.id] = Math.floor(S.time.day);
        d.fail[doc.id] = 0;
        delete d.lapsed[doc.id];
        markDirty();
        emit('doctrine', doc);
      }
    } else if (d.streak[doc.id]) {
      d.streak[doc.id] = 0;
    }
  }
}

// What the run is doing that this doctrine will not stand beside, in words a
// panel can print. `FORBIDS` lives with the doctrines because it is content.
export function forbiddenBy(S, id) {
  const rule = FORBIDS[id];
  if (!rule) return null;
  return rule(S);
}
function forbiddenNow(S, id) { return !!forbiddenBy(S, id); }

// The other half of an exclusive pair: what a held doctrine forbids the founder
// from doing. Frugal Empire is every dollar in the company coming from somebody
// choosing to pay for it, and a term sheet ends it — so it says so on the
// button rather than quietly lapsing four months later.
export function doctrineBlocks(S, action) {
  const d = doctrineState(S);
  if (action === 'raise' && d.earned.frugal_empire != null) {
    return { id: 'frugal_empire', name: DOCTRINE_MAP.frugal_empire.name,
             note: 'FRUGAL EMPIRE',
             why: 'Frugal Empire is every dollar in this company coming from somebody who chose to pay for it. Take the round and it is gone.' };
  }
  return null;
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
    const lapsedDay = d.lapsed[doc.id];
    const failing = d.fail[doc.id] || 0;
    const held = d.earned[doc.id] != null;
    return {
      ...doc,
      earned: held,
      earnedDay: d.earned[doc.id],
      lapsed: !held && lapsedDay != null,
      lapsedDay,
      // How long this has left before it goes, once it has started slipping.
      slipping: held && failing > 0,
      slipDaysLeft: Math.max(0, Math.ceil(lapseDays(doc) - failing)),
      forbidden: forbiddenBy(S, doc.id),
      streak: d.streak[doc.id] || 0,
      progress: Math.min(1, (d.streak[doc.id] || 0) / doc.hold),
      visible: visible || held || lapsedDay != null,
    };
  });
}

// Giving one up on purpose. A closed door you can open, at the price the door
// was worth — the bonus stops today rather than in four months, and the shelf
// keeps the record that you once held it.
export function forfeitDoctrine(S, id) {
  const d = doctrineState(S);
  if (d.earned[id] == null) return false;
  const doc = DOCTRINE_MAP[id];
  delete d.earned[id];
  d.streak[id] = 0;
  d.fail[id] = 0;
  d.lapsed[id] = Math.floor(S.time.day);
  markDirty();
  emit('doctrine:lapsed', doc);
  return true;
}

export function earnedCount(S) { return Object.keys(doctrineState(S).earned).length; }
