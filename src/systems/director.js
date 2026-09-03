// ─────────────────────────────────────────────────────────────────────────────
// THE DIRECTOR — pacing, measured live and steered gently.
//
// The pacing pass that produced decks X through XIII was done by hand: three
// seeded runs, pooled, a log read for crisis runs, silent stretches and acts
// that had stopped showing faces. This is that instrument built into the
// draw. It reads the last few cards and the days since the last release and
// the last face, and it leans on the weights — never on `once`, never on
// `when`, never on a priority card — so that a run gets an arc instead of a
// distribution: trouble, then a breath; institutions, then a person.
//
// It also writes a beat sheet, one line, for the assistant playing the world:
// what the run wants next, in the same terms. A world that reads it becomes a
// co-director rather than a dealer. Everything here is pure and cheap; it runs
// once per draw and once per briefing.
// ─────────────────────────────────────────────────────────────────────────────
import { DIRECTOR as D, PATH_CARDS, CAMPAIGN as CP } from '../data/balance.js';
import { CAMPAIGN_BEATS, CAMPAIGN_MAP, CAMPAIGN_LINES } from '../data/campaign.js';
import { clamp } from '../engine/format.js';

const RELEASE = new Set(['milestone', 'opportunity']);

export function measure(S) {
  const today = Math.floor(S?.time?.day || 0);
  const j = (S?.narrative?.journal || []).filter((e) => e && e.kind !== 'call');
  const recent = j.slice(0, D.WINDOW);
  let crisisRun = 0;
  for (const e of recent) { if (e.kind === 'crisis') crisisRun++; else break; }
  const crises = recent.filter((e) => e.kind === 'crisis').length;
  const faces = recent.filter((e) => e.char).length;
  const lastFace = j.find((e) => e.char);
  const lastRelease = j.find((e) => RELEASE.has(e.kind));
  const daysSinceFace = lastFace ? today - Math.floor(lastFace.day) : today;
  const daysSinceRelease = lastRelease ? today - Math.floor(lastRelease.day) : today;
  const tension = clamp((recent.length ? crises / recent.length : 0) * 0.6
    + Math.min(1, daysSinceRelease / D.RELEASE_AFTER) * 0.4, 0, 1);
  return { crisisRun, crises, faces, facesShare: recent.length ? faces / recent.length : 0,
           daysSinceFace, daysSinceRelease, tension, sample: recent.length };
}

// The weight multiplier for one candidate card. 1 is "no opinion".
export function steer(S, e, m = measure(S)) {
  if (!e || (e.priority || 0) > 0) return 1;
  let w = 1;
  // A card written for the path the founder committed to. Once `pathLocked` is
  // set the last act has a subject, and the deck should be about it — so the
  // three cards written for that path are favoured over the general pool. It
  // is a weight and nothing else: a path card still has to be legal, and no
  // other card is ever suppressed for it.
  if (e.path) w *= e.path === S?.narrative?.pathLocked ? PATH_CARDS.STEER : 1;
  if (e.kind === 'crisis' && m.crisisRun >= D.CRISIS_RUN_FROM) {
    w *= Math.pow(D.CRISIS_DAMP, m.crisisRun - D.CRISIS_RUN_FROM + 1);
  }
  if (RELEASE.has(e.kind) && m.daysSinceRelease > D.RELEASE_AFTER) w *= 1 + D.RELEASE_BOOST * m.tension;
  if (e.char && m.daysSinceFace > D.FACE_AFTER) w *= 1 + D.FACE_BOOST;
  if (e.kind === 'character' && m.facesShare > D.FACES_SATURATE) w *= D.FACES_DAMP;
  // §H21. A campaign beat the world never wrote is handed back to the deck:
  // the card that says the same thing is favoured until it draws. A weight and
  // nothing else — `once` and `when` still decide whether it is legal at all,
  // so a beat whose written card cannot draw this run simply does not land.
  if (releasedCards(S).includes(e.id)) w *= PATH_CARDS.STEER;
  return w;
}

// ── §H21 The campaign ───────────────────────────────────────────────────────
// The director hands the assistant one beat at a time and marks it off when a
// card that answers it lands. Everything here is a pure read except `openBeat`
// and `noteCard`, which write two arrays.

export function campaignState(S) {
  const w = S.world ??= {};
  const c = w.campaign ??= { done: [], open: null, released: [] };
  c.done ??= []; c.released ??= []; c.open ??= null;
  return c;
}

function gateOpen(S, b) {
  if ((S.company?.act || 1) !== b.act) return false;
  const inAct = (S.time?.day || 0) - (S.company?.actStartedDay || 0);
  if (inAct < b.after) return false;
  try { return b.gate ? !!b.gate(S) : true; } catch { return false; }
}

// The beat on the table, opening one if the act has reached it. The `open`
// record carries the day it was handed over, which is what `GRACE_DAYS` and
// `MATCH_DAYS` are both counted from.
export function openBeat(S) {
  const c = campaignState(S);
  if (c.open) {
    const b = CAMPAIGN_MAP[c.open.id];
    if (!b) { c.open = null; }
    else if ((S.company?.act || 1) > b.act) { release(S, c.open.id, 'act'); }
    else if ((S.time?.day || 0) - c.open.day > CP.GRACE_DAYS) { release(S, c.open.id, 'grace'); }
    else return { ...b, since: Math.floor((S.time?.day || 0) - c.open.day) };
  }
  const next = CAMPAIGN_BEATS.find((b) => !c.done.includes(b.id) && gateOpen(S, b));
  if (!next) return null;
  c.open = { id: next.id, day: Math.floor(S.time?.day || 0) };
  return { ...next, since: 0 };
}

// Purely a read: what the briefing prints without opening anything. Used by
// tests and by any surface that must not have a side effect.
export function peekBeat(S) {
  const c = campaignState(S);
  if (c.open && CAMPAIGN_MAP[c.open.id]) {
    return { ...CAMPAIGN_MAP[c.open.id], since: Math.floor((S.time?.day || 0) - c.open.day) };
  }
  const next = CAMPAIGN_BEATS.find((b) => !c.done.includes(b.id) && gateOpen(S, b));
  return next ? { ...next, since: 0 } : null;
}

// The deck takes it back. The written card is marked for `steer` and the beat
// is done — by the deck rather than by the world, which is the distinction the
// dossier and the briefing both print.
function release(S, id, why) {
  const c = campaignState(S);
  const b = CAMPAIGN_MAP[id];
  c.open = null;
  if (!c.done.includes(id)) c.done.push(id);
  if (b?.fallback && !c.released.includes(b.fallback)) c.released.push(b.fallback);
  c.byDeck = (c.byDeck || 0) + 1;
  return { released: id, why };
}

export function releasedCards(S) { return S?.world?.campaign?.released || []; }

// A card landed. If it answers the open beat — by carrying its id, or by being
// about the person the beat is about, inside the window — the beat is done and
// the deck never gets asked for its version.
export function noteCard(S, { beat = null, char = null, author = 'world' } = {}) {
  const c = campaignState(S);
  if (!c.open) return null;
  const b = CAMPAIGN_MAP[c.open.id];
  if (!b) { c.open = null; return null; }
  const within = (S.time?.day || 0) - c.open.day <= CP.MATCH_DAYS;
  const matches = beat === b.id || (within && char && char === b.char && author === 'world');
  if (!matches) return null;
  c.open = null;
  if (!c.done.includes(b.id)) c.done.push(b.id);
  c.byWorld = (c.byWorld || 0) + 1;
  return { done: b.id, title: b.title };
}

// One line for the briefing, and the whole brief with it. `open` is a side
// effect on purpose: the beat is handed over by being read.
export function campaignBrief(S, { open = true } = {}) {
  const c = campaignState(S);
  const b = open ? openBeat(S) : peekBeat(S);
  if (!b) {
    return { beat: null, left: CAMPAIGN_BEATS.length - c.done.length,
             note: c.done.length >= CAMPAIGN_BEATS.length ? CAMPAIGN_LINES.done : CAMPAIGN_LINES.waiting };
  }
  return { beat: b.id, title: b.title, brief: b.brief.slice(0, CP.BRIEF_MAX * 3),
           about: b.char, daysLeft: Math.max(0, Math.ceil(CP.GRACE_DAYS - b.since)),
           left: CAMPAIGN_BEATS.length - c.done.length, note: CAMPAIGN_LINES.next };
}

export function campaignDone(S) { return (campaignState(S).done || []).slice(); }
export function campaignIds() { return CAMPAIGN_BEATS.map((b) => b.id); }

// What the run wants next, in one word and one line.
export function beatSheet(S) {
  const m = measure(S);
  const tension = m.tension >= 0.7 ? 'high' : m.tension >= 0.45 ? 'rising' : m.tension >= 0.2 ? 'steady' : 'low';
  let wants, note;
  if (m.crisisRun >= D.CRISIS_RUN_FROM) {
    wants = 'a breath';
    note = `${m.crisisRun} crises in a row. The run needs a release before another blow — a milestone, an opportunity, or somebody it knows.`;
  } else if (m.daysSinceFace > D.FACE_AFTER) {
    wants = 'a face';
    note = `${m.daysSinceFace} days since a card with a person on it. Institutions have had the floor; put someone in front of the founder.`;
  } else if (m.daysSinceRelease > D.RELEASE_AFTER && m.tension >= 0.45) {
    wants = 'a release';
    note = `${m.daysSinceRelease} days without a milestone or an opportunity. Tension without release is attrition; give them something they made.`;
  } else if (m.tension < 0.2 && m.sample >= 3) {
    wants = 'trouble';
    note = 'Quiet for a while. The founder can afford a complication that costs something real.';
  } else {
    wants = 'anything';
    note = 'The pacing is even. Write what the story wants.';
  }
  return { tension, wants, note, lastCards: (S?.narrative?.journal || []).slice(0, 4).map((e) => e.kind),
           daysSinceFace: m.daysSinceFace, daysSinceRelease: m.daysSinceRelease };
}
