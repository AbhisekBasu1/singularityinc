// ─────────────────────────────────────────────────────────────────────────────
// THE OTHER CHAIRS — the board seat and the room, §H15 and §H16.
//
// The relay carries a room per run and, until now, exactly one guest could sit
// in it: a person playing Aperture. Two more can now. Neither of them plays
// the game; both of them can reach into it, through the narrowest doors this
// codebase has.
//
//   · A **board member** holds three powers. Every one of them lands as a card
//     the founder answers, written through `writeCard` with `author: 'board'`
//     and bounded by `validateCard` exactly like a card the world wrote. The
//     powers themselves touch two fields — a flag the round dialog reads, and
//     the forced standing order the board system already had — and nothing
//     else. The motion to remove is refused outright unless the board's own
//     confidence has already collapsed, and it says which.
//   · A **spectator** holds one power, `commentary`, which prints a line in
//     the Wire and moves nothing.
//
// The roster of who is in the room comes from the relay, through the framed
// press office, and is held here because two files need it: `partners.js` to
// decide whether to accept a motion at all, and `tools.js` to decide whether
// `commentary` has anybody behind it.
// ─────────────────────────────────────────────────────────────────────────────
import { CARDS, CARD_META, POWERS, REFUSALS, CASTER } from '../data/chair.js';
import { CHAIRS } from '../data/balance.js';
import { DIRECTIVE_MAP } from '../data/directives.js';
import { boardState, confidence } from './board.js';
import { runwayDays } from './economy.js';
import { pushFeed } from './feed.js';
import { markDirty } from './modifiers.js';
import * as World from '../world/author.js';
import { emit } from '../engine/bus.js';

// ── Who is in the room ──────────────────────────────────────────────────────
// Session memory, exactly like the chair's rate buckets: it describes a
// connection, not a run, and a save that remembered a spectator who has gone
// home would publish a tool with nobody behind it.
let roles = { chair: 0, frame: 0, board: 0, watch: 0 };
// A spectator seen at any point this session keeps `commentary` published for
// the rest of it. Registration snapshots are capped at ten for the life of a
// document, and a room somebody joins and leaves four times would spend the
// budget on its own. `execute` re-checks whether anybody is actually watching,
// which is the pattern every tool here already follows: stable registration,
// live authority.
let everWatched = false;

export function setRoles(next) {
  if (!next || typeof next !== 'object') return roles;
  roles = { chair: 0, frame: 0, board: 0, watch: 0 };
  for (const k of Object.keys(roles)) {
    const v = Number(next[k]);
    if (Number.isFinite(v) && v > 0) roles[k] = Math.min(64, Math.trunc(v));
  }
  if (roles.watch > 0) everWatched = true;
  emit('chair:roles', { ...roles });
  return roles;
}
export function roomRoles() { return { ...roles }; }
export function boardSeated() { return roles.board > 0; }
export function watching() { return roles.watch > 0; }
export function everWatching() { return everWatched; }
export function resetChairs() { roles = { chair: 0, frame: 0, board: 0, watch: 0 }; everWatched = false; casts.length = 0; }

// ── What the board is shown ─────────────────────────────────────────────────
// The founder's company, projected the way `apertureState` projects Aperture's:
// enough to hold an opinion with, and nothing a board member does not already
// get in a pack. No roster, no research tree, no cast — a board reads a ledger
// and the minutes, and that is what this is.
export function founderProjection(S) {
  if (!S?.company) return null;
  const b = boardState(S);
  const cards = (S.narrative?.journal || []).slice(0, 3).map((e) => ({
    day: Math.floor(e.day), title: String(e.title || '').slice(0, 60),
    chose: String(e.choice || '').slice(0, 60),
  }));
  return {
    company: S.company.name, founder: S.founder?.name || 'the founder',
    act: S.company.act || 1, day: Math.floor(S.time?.day || 0),
    cash: Math.round(S.company.cash || 0),
    valuation: Math.round(S.company.valuation || 0),
    // `equity` is an object — `{ founder, employees }` — and reading it as a
    // number gave a projection whose equity line serialised to null, which is
    // not the same as being caught: JSON.stringify turns NaN into null and a
    // no-NaN assertion passes over it.
    equity: Math.round(((S.company.equity?.founder ?? 1)) * 100),
    runway: (() => { const d = runwayDays(S); return Number.isFinite(d) ? Math.round(d) : null; })(),
    directive: S.company.directive || 'none',
    directiveName: DIRECTIVE_MAP[S.company.directive]?.name || 'No standing order',
    doctrines: Object.keys(S.doctrines?.earned || {}).slice(0, 6),
    confidence: b ? Math.round((confidence(S) ?? 0) * 100) : null,
    refusedUntil: S.company.boardRefusedUntil ?? null,
    cards,
  };
}

// ── The three powers ────────────────────────────────────────────────────────
// Each says whether it can be used and why not, in the mono note the chair
// page prints beside the button. Nothing here writes.
export function boardPowers(S) {
  const b = boardState(S);
  const conf = b ? (confidence(S) ?? 1) : null;
  const refused = (S?.company?.boardRefusedUntil ?? -1) > (S?.time?.day ?? 0);
  return POWERS.map((p) => {
    let why = null;
    if (!b) why = 'no_board';
    else if (p.id === 'refuse_round' && refused) why = 'already';
    else if (p.id === 'approve_round' && !refused) why = 'none';
    else if (p.id === 'remove_founder' && conf > CHAIRS.BOARD_CONFIDENCE_MAX) why = 'confident';
    return { ...p, ok: !why, why, note: why ? REFUSALS[why] : '' };
  });
}

const no = (reason) => ({ ok: false, reason, note: REFUSALS[reason] || String(reason).toUpperCase() });

// A motion. The order matters: the power is checked against the company, then
// the field it moves is moved, then the card is written — so a card that is
// refused for the world's own reasons (one is already open, the budget is
// spent, the run is over) leaves the flag it set behind, which is correct:
// the board's decision is a fact about the board, and the card is the founder
// hearing about it.
export function boardMotion(S, power, arg) {
  if (!S) return no('no_board');
  const def = boardPowers(S).find((p) => p.id === power);
  if (!def) return no('unknown');
  if (!def.ok) return { ok: false, reason: def.why, note: def.note };

  let order = null;
  if (def.kind === 'directive') {
    const d = DIRECTIVE_MAP[arg];
    if (!d || d.id === 'none') return no('directive');
    order = d;
  }

  const day = Math.floor(S.time.day);
  if (power === 'refuse_round') {
    S.company.boardRefusedUntil = day + CHAIRS.BOARD_REFUSAL_DAYS;
    S.narrative.flags.board_refused_round = true;
  } else if (power === 'approve_round') {
    S.company.boardRefusedUntil = 0;
    delete S.narrative.flags.board_refused_round;
  } else if (power === 'force_directive') {
    const b = boardState(S);
    S.company.directive = order.id;
    S.company.directiveSince = S.time.day;
    if (b) b.forcedUntil = Math.max(b.forcedUntil || 0, day + CHAIRS.BOARD_DIRECTIVE_DAYS);
    S.company.boardForcedOrder = order.id;
  }
  markDirty();

  const tpl = CARDS[power];
  const card = {
    kind: tpl.kind, title: tpl.title,
    body: tpl.body.replace(/\{order\}/g, order ? order.name : 'their order'),
    choices: tpl.choices.map((c) => ({ ...c })),
  };
  const r = World.writeCard(S, card, { author: 'board', meta: CARD_META[power] });
  emit('board:motion', { power, arg: order?.id || null, card: r.ok ? r.id : null, ok: !!r.ok });
  if (!r.ok) {
    // The decision stands; the founder simply has not been handed the scene
    // yet. Say so rather than pretending the motion failed.
    return { ok: true, applied: true, card: false, reason: r.problems?.[0]?.rule || 'card',
             note: REFUSALS.card, power, order: order?.id || null };
  }
  return { ok: true, applied: true, card: true, power, order: order?.id || null, title: r.card.title };
}

// Whether the round dialog may be signed. Read by the Market view's round
// block; a board that has refused this quarter is the one thing outside the
// doctrines that closes it.
export function roundRefused(S) {
  return (S?.company?.boardRefusedUntil ?? -1) > (S?.time?.day ?? 0);
}
export function roundRefusedFor(S) {
  return Math.max(0, Math.ceil((S?.company?.boardRefusedUntil ?? 0) - (S?.time?.day ?? 0)));
}

// ── §H16 The caster ─────────────────────────────────────────────────────────
// A line from somebody watching. It prints in the Wire, marked as a caster's,
// and moves nothing at all — which is why it needs no validator beyond a
// length and a rate. Session memory, per game day: a room that has said eight
// things today has said enough.
const casts = [];

export function commentaryLeft(S) {
  const day = Math.floor(S?.time?.day ?? 0);
  while (casts.length && casts[0] !== day) casts.shift();
  return Math.max(0, CHAIRS.COMMENTARY_PER_DAY - casts.length);
}

export function castLine(S, text) {
  if (!watching()) return { ok: false, reason: 'nobody', note: CASTER.empty };
  const line = String(text || '').replace(/\s+/g, ' ').trim().slice(0, CHAIRS.COMMENTARY_MAX);
  if (!line) return { ok: false, reason: 'empty', note: 'A caster with nothing to say is not a caster.' };
  if (commentaryLeft(S) <= 0) return { ok: false, reason: 'rate', note: CASTER.rate };
  casts.push(Math.floor(S.time.day));
  pushFeed(S, { type: 'social', tone: 'neutral', author: CASTER.author, text: line,
                meta: CASTER.meta, untrusted: true, byCaster: true });
  emit('chair:commentary', { text: line });
  return { ok: true, line, left: commentaryLeft(S) };
}
