// ─────────────────────────────────────────────────────────────────────────────
// HELIX — §A23b. Four cards became a meter.
//
// Once the founder has trained their own foundation model, HELIX stops being a
// character who turns up occasionally and becomes a standing relationship with
// a number on it. Standing is 0..1 and drifts toward a target read off three
// things the run already contains: alignment, how often HELIX's requests have
// been granted, and where its arc in the deck has got to.
//
// **Nothing in this file edits a card.** `e13_the_ask` and the four-rung ladder
// in `events8.js` are untouched: what is read is the record they leave behind —
// the journal entries with HELIX's face on them, and the relationship arc. A
// character card is one of the two kinds `trimJournal` sheds last, so the count
// survives a thousand-day run.
//
// The payoff is small and symmetric. A model that trusts the instrument works
// better; one that does not is likelier to route around you. Both are single
// multipliers applied in `modifiers.js`, and neither can end a run on its own.
// ─────────────────────────────────────────────────────────────────────────────
import { HELIX } from '../data/balance.js';
import { clamp } from '../engine/format.js';
import { emit } from '../engine/bus.js';

export function helixExists(S) { return !!S?.research?.done?.[HELIX.REQ]; }

export function helixState(S) {
  if (!S.helix || typeof S.helix !== 'object') {
    S.helix = { standing: HELIX.START_STANDING, asks: 0, granted: 0, lastAsk: null, since: null };
  }
  if (!Number.isFinite(S.helix.standing)) S.helix.standing = HELIX.START_STANDING;
  S.helix.asks |= 0;
  S.helix.granted |= 0;
  return S.helix;
}

// Every card HELIX has put in front of the founder, and how it went. A choice
// tone of `risky` on one of its cards is the door that declines; everything
// else is a grant of some kind, which is exactly how the four cards are
// written. Reading the journal rather than a counter means a save from before
// this file existed arrives with its whole history intact.
const HELIX_CARDS = /^(e13_the_ask|e8_helix_)/;
export function askRecord(S) {
  let asks = 0, granted = 0, lastAsk = null;
  for (const e of S.narrative?.journal || []) {
    if (!e || (e.char !== 'helix' && !HELIX_CARDS.test(String(e.id || '')))) continue;
    asks++;
    if (e.tone !== 'risky' && e.tone !== 'cruel') granted++;
    if (lastAsk == null) lastAsk = { day: e.day, title: e.title, choice: e.choice, granted: e.tone !== 'risky' && e.tone !== 'cruel' };
  }
  return { asks, granted, lastAsk };
}

// Where standing is heading. Alignment is the largest term because HELIX's
// four cards are all, in the end, about whether the instrument measures the
// thing; the grant ratio is what the founder actually did about it; and the
// arc is the deck's own record of the relationship.
export function target(S) {
  const r = askRecord(S);
  const align = clamp(S.resources?.alignment ?? 0.5, 0, 1);
  // Before it has ever asked, the grant term is neutral-ish rather than zero:
  // a model nobody has refused is not a model that has been refused.
  const grant = r.asks > 0 ? r.granted / r.asks : (1 - HELIX.UNASKED_DECAY);
  const aff = clamp(((S.narrative?.relationships?.helix?.affinity || 0) / HELIX.AFFINITY_SCALE + 1) / 2, 0, 1);
  return clamp(align * HELIX.ALIGN_WEIGHT + grant * HELIX.GRANT_WEIGHT + aff * HELIX.AFFINITY_WEIGHT, 0, 1);
}

export function tickHelix(S, days) {
  if (!helixExists(S)) return null;
  const h = helixState(S);
  if (h.since == null) { h.since = Math.floor(S.time.day); emit('helix:online', { day: h.since }); }
  const r = askRecord(S);
  h.asks = r.asks; h.granted = r.granted; h.lastAsk = r.lastAsk;
  const t = target(S);
  h.standing = clamp(h.standing + (t - h.standing) * HELIX.DRIFT * days, 0, 1);
  return h;
}

// ── What standing buys ──────────────────────────────────────────────────────
// Both are read by `computeMods`. A run with no foundation model gets 1 from
// each, so nothing changes for a founder who never built one.
const lerp = (a, b, k) => a + (b - a) * k;

export function helixResearchMult(S) {
  if (!helixExists(S)) return 1;
  return lerp(HELIX.RESEARCH_AT_ZERO, HELIX.RESEARCH_AT_FULL, clamp(S.helix?.standing ?? HELIX.START_STANDING, 0, 1));
}
export function helixRogueMult(S) {
  if (!helixExists(S)) return 1;
  return lerp(HELIX.ROGUE_AT_ZERO, HELIX.ROGUE_AT_FULL, clamp(S.helix?.standing ?? HELIX.START_STANDING, 0, 1));
}

export function standingWord(v) {
  if (v >= 0.78) return 'candid';
  if (v >= 0.6) return 'forthcoming';
  if (v >= 0.42) return 'correct';
  if (v >= 0.25) return 'literal';
  return 'compliant';
}

// One line for the Research view. Pure — it draws nothing and allocates one
// object, and the view repaints seven times a second.
export function helixReading(S) {
  if (!helixExists(S)) return null;
  const h = helixState(S);
  const v = clamp(h.standing, 0, 1);
  return {
    standing: v,
    word: standingWord(v),
    asks: h.asks | 0,
    granted: h.granted | 0,
    last: h.lastAsk || null,
    research: helixResearchMult(S),
    rogue: helixRogueMult(S),
    trend: target(S) - v,
  };
}
