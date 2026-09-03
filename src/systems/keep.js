// ─────────────────────────────────────────────────────────────────────────────
// KEEP — the deck grows, and the world remembers.
//
// Two things that only a run with a mind on the other side can have.
//
// Kept cards. When the world writes a card worth keeping, one press saves it
// — title, face, choices, effects — into `S.legacy.kept`, which survives the
// timeline reset with everything else in `legacy`. In every later run it is
// dealt by the written deck like any authored card: once, in the act it was
// written for, with a face only if the founder has met that person this time,
// and with its effects bounded at the moment they land by the same rules the
// world played under. A kept card can never do more than a written one.
//
// The dossier. `prestige()` writes one entry per finished timeline: how it
// ended, who was betrayed, who stayed, what the founder always does. The
// briefing carries the short version and the written deck reads it too, so a
// second timeline is a world that remembers the first — and plays it.
// ─────────────────────────────────────────────────────────────────────────────
import { KEEP } from '../data/balance.js';
import { CHARACTERS } from '../data/characters.js';
import { markDirty } from './modifiers.js';
import { emit } from '../engine/bus.js';

const TONES = ['neutral', 'good', 'risky', 'cruel', 'costly'];
const KINDS = ['story', 'crisis', 'opportunity', 'character'];

export function kept(S) {
  if (!Array.isArray(S?.legacy?.kept)) { if (S?.legacy) S.legacy.kept = []; else return []; }
  return S.legacy.kept;
}

// The shape a card must have to be kept. Structural only — ceilings are
// re-judged when it lands, because the act and the budgets will be different.
export function cardShape(data) {
  if (!data || typeof data !== 'object') return null;
  if (!KINDS.includes(data.kind)) return null;
  if (typeof data.title !== 'string' || !data.title.trim() || data.title.length > 48) return null;
  if (typeof data.body !== 'string' || !data.body.trim() || data.body.length > 900) return null;
  if (!Array.isArray(data.choices) || data.choices.length < 2 || data.choices.length > 4) return null;
  const choices = [];
  for (const c of data.choices) {
    if (!c || typeof c !== 'object') return null;
    if (typeof c.label !== 'string' || !c.label.trim() || c.label.length > 72) return null;
    if (typeof c.outcome !== 'string' || c.outcome.length > 420) return null;
    if (!TONES.includes(c.tone)) return null;
    const fx = {};
    for (const [k, v] of Object.entries(c.effects || {})) {
      if (k === 'flags') { if (Array.isArray(v)) fx.flags = v.filter((f) => typeof f === 'string' && f.length <= 40).slice(0, 4); continue; }
      if (typeof k === 'string' && k.length <= 20 && Number.isFinite(v) && v !== 0) fx[k] = v;
    }
    choices.push({ label: c.label.trim(), sub: typeof c.sub === 'string' ? c.sub.slice(0, 90) : '', tone: c.tone,
                   outcome: String(c.outcome).trim(), effects: fx });
  }
  return { kind: data.kind, char: typeof data.char === 'string' && CHARACTERS[data.char] ? data.char : null,
           title: data.title.trim(), body: data.body.trim(), choices,
           // A shared deck may be a sequence rather than a bag: `after` names
           // another kept card that has to have been dealt first. It is a gate
           // on `when`, which is the only ordering the deck understands — the
           // draw is weighted, so nothing can be made to come *next*, only to
           // be kept from coming *before*.
           ...(typeof data.after === 'string' && data.after.trim() && data.after.length <= 40
             ? { after: data.after.trim() } : {}) };
}

// ── A memory of a written card ──────────────────────────────────────────────
// The Keep key used to appear only on a card the world wrote, which meant that
// in a browser with no assistant the whole feature — the panel, the shelf, the
// walkthrough chapter — was furniture around an empty box. A written card can
// be kept too, and what is kept is not the card: it is the *memory* of what you
// did with it. The founder's own answer becomes one door and the road not taken
// becomes the other, and the next timeline is dealt the moment back.
//
// The fx collector logs `['reputation', 12]`; the deck's vocabulary calls that
// `rep`. This is the whole translation, and anything not in it — equity, days,
// skills, the roster — is dropped, because a kept card may never do more than
// the world's own seventeen keys allow.
const FX_LOG_TO_KEY = {
  cash: 'cash', reputation: 'rep', insight: 'insight', code: 'code', focus: 'focus',
  users: 'users', alignment: 'align', heat: 'heat', opinion: 'opinion',
  techDebt: 'debt', research: 'research', influence: 'influence', compute: 'compute',
};

function effectsFromLog(log, charId) {
  const fx = {};
  for (const [k, v] of log || []) {
    if (!Number.isFinite(v) || v === 0) continue;
    if (k.startsWith('rel:')) { if (charId && k.slice(4) === charId) fx.affinity = (fx.affinity || 0) + v; continue; }
    const key = FX_LOG_TO_KEY[k];
    if (key) fx[key] = (fx[key] || 0) + v;
  }
  for (const [k, v] of Object.entries(fx)) fx[k] = Math.round(v * 1000) / 1000;
  return fx;
}

const trim = (s, n) => { const t = String(s || '').replace(/\s+\n/g, '\n').trim();
  return t.length <= n ? t : t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…'; };

// `src` is a resolved active event or a journal entry. Both carry the title,
// the body or the outcome, what was chosen, and the fx log.
export function memoryOf(S, src) {
  if (!src) return null;
  const chosen = src.chosen || src.choice;
  const outcome = src.outcome;
  if (!chosen || !outcome) return null;
  const kind = KINDS.includes(src.kind) ? src.kind : 'story';
  const char = typeof src.char === 'string' && CHARACTERS[src.char] ? src.char : null;
  const body = src.body || outcome;
  const tone = TONES.includes(src.tone) ? src.tone : 'neutral';
  return cardShape({
    kind, char,
    title: trim(src.title || 'A day you remember', 48),
    body: trim(body, 900),
    choices: [
      { label: trim(chosen, 72), sub: 'What you did last time.', tone,
        outcome: trim(outcome, 420), effects: effectsFromLog(src.effects, char) },
      { label: 'Do it differently this time.', sub: 'The road you did not take.', tone: 'neutral',
        outcome: trim(`You remember choosing otherwise, and you remember what it cost, and you go the other way to find out whether the cost was the choice or the year.`, 420),
        effects: { insight: 20, focus: 4 } },
    ],
  });
}

// A fresh id, guaranteed to be one neither this deck nor this run has used.
// The old form was `Date.now()` plus the list length, and two cards kept
// inside the same millisecond into lists of the same length collided — a card
// forgotten and another kept, an import, a harness. A collision is not
// cosmetic: a kept card is `once` per timeline, so a card minted onto an id
// the run has already *seen* is filtered out of the deck the moment it is
// kept, and an `after` written against the first points at the wrong card.
// Hence both checks, and a counter that cannot repeat inside one page load.
let mintSeq = 0;
function mintId(S, list) {
  const taken = new Set(list.map((k) => k.id));
  const seen = S?.narrative?.seen || {};
  const stem = Date.now().toString(36);
  for (let i = 0; i < 64; i++) {
    const id = `${stem}${(mintSeq++).toString(36)}`;
    if (!taken.has(id) && !seen['k_' + id]) return id;
  }
  return `${stem}${Math.random().toString(36).slice(2, 7)}`;
}

// Keep the card on the founder's screen, or one from the Log. Returns what
// was kept, or why not.
export function keepCard(S, data, {
  act = S?.company?.act || 1,
  run = (S?.legacy?.runs || 0) + 1,
  day = Math.floor(S?.time?.day || 0),
  // Provenance. A deck that travels needs to say where it came from: which
  // timeline, whose company, and whose founder wrote it down. It is also what
  // the token substitution below reads to find last timeline's proper nouns.
  company = S?.company?.name || '',
  author = S?.founder?.name || '',
  id = null,
} = {}) {
  const card = cardShape(data);
  if (!card) return { ok: false, reason: 'that is not a card the deck could deal' };
  const list = kept(S);
  if (list.some((k) => k.title === card.title && k.body === card.body)) return { ok: false, reason: 'already kept' };
  if (list.length >= KEEP.MAX) return { ok: false, reason: `the deck holds ${KEEP.MAX} kept cards — let one go first` };
  // An imported card keeps its own id where it can, so an `after` written
  // against it in the same deck still points at something.
  const wanted = typeof id === 'string' && /^[A-Za-z0-9_-]{1,32}$/.test(id) && !list.some((k) => k.id === id) ? id : null;
  const entry = { id: wanted || mintId(S, list),
                  act: Math.max(1, Math.min(5, act)), run, day, keptAt: Date.now(),
                  ...(company ? { company: String(company).slice(0, 48) } : {}),
                  ...(author ? { author: String(author).slice(0, 48) } : {}),
                  ...card };
  list.push(entry);
  markDirty();
  emit('keep', { card: entry });
  return { ok: true, card: entry };
}

export function forget(S, id) {
  const list = kept(S);
  const i = list.findIndex((k) => k.id === id);
  if (i < 0) return false;
  list.splice(i, 1);
  markDirty();
  return true;
}

// ── Last timeline's proper nouns ────────────────────────────────────────────
// A kept card was written about a company that no longer exists. Dealt as
// written it says "Meridian" to a founder running Halcyon, which is the seam
// that makes a kept card read as a photocopy rather than as a card. So on the
// way into the deck the tokens are filled and the literal names are swapped:
// the company it was written in, the rival that was in it, the founder who
// wrote it, from the provenance on the card and from the dossier entry for its
// run.
//
// Deliberately *not* `fillTokens` from `feed.js`: that one draws from the
// shared RNG for `{agent}` and `{city}`, and this runs inside `eligibleEvents`,
// which is called on every draw and every eligibility check. A render path may
// not move the stream the deck draws from. This map is pure.
function nowNouns(S) {
  const rival = (S?.market?.competitors || []).find((c) => c.id === S?.market?.nemesis?.id)
             || (S?.market?.competitors || []).find((c) => c.status === 'active');
  return {
    company: S?.company?.name || 'the company',
    product: S?.products?.[0]?.name || S?.company?.name || 'the product',
    founder: S?.founder?.name || 'the founder',
    rival: rival?.name || 'the competition',
  };
}

const RX = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The substitution for one kept card, built once per card per draw.
function retokenise(S, k) {
  const now = nowNouns(S);
  const past = dossier(S).find((d) => d.run === k.run) || null;
  const swaps = [];
  const add = (from, to) => {
    const a = String(from || '').trim();
    const b = String(to || '').trim();
    if (a.length > 2 && b && a.toLowerCase() !== b.toLowerCase()) swaps.push([new RegExp(RX(a), 'g'), b]);
  };
  add(k.company || past?.company, now.company);
  add(past?.rival, now.rival);
  add(past?.founder, now.founder);
  return (text) => {
    let s = String(text ?? '').replace(/\{(company|product|founder|rival)\}/g, (_, key) => now[key]);
    for (const [re, to] of swaps) s = s.replace(re, to);
    return s;
  };
}

// The kept cards as events the deck can deal. Pure: built from state on
// every draw, which is cheap for a list this size.
export function keptEvents(S) {
  const out = [];
  const list = kept(S);
  // "Your Own Hand": the newest card in the deck is dealt in any act, so the
  // run opens with something of the founder's own in the pile rather than
  // waiting for the act it happened to be written in. The stored card keeps
  // its own act — this only widens what the deck offers this timeline.
  const openHand = (S?.legacy?.perks?.own_hand || 0) > 0 ? list[list.length - 1] : null;
  for (const k of list) {
    const id = 'k_' + k.id;
    const sub = retokenise(S, k);
    const title = sub(k.title), body = sub(k.body);
    const choices = k.choices.map((c) => ({ label: sub(c.label), sub: sub(c.sub), tone: c.tone,
                                            outcome: sub(c.outcome), effects: c.effects }));
    out.push({
      id, kind: k.kind, char: k.char, title, body,
      act: k === openHand ? [1, 2, 3, 4, 5] : [k.act], once: true, weight: KEEP.WEIGHT, kept: true,
      // A face only if the founder has met that person this time round — and,
      // for an ordered deck, not before the card it says it follows.
      when: (st) => (!k.char || !!st.narrative?.relationships?.[k.char]?.met)
                 && (!k.after || !!st.narrative?.seen?.['k_' + k.after]),
      choices,
      // Resolved through the world's own hydrate so the effects are bounded at
      // landing. `narrative.js` sees `runtime` on the active card and hands it
      // to the registered hydrate function — the same door a world card uses.
      runtime: { kind: k.kind, char: k.char, title, body, choices },
    });
  }
  return out;
}

// Export and import: plain JSON, so a deck can be handed to somebody. The id
// travels now — `after` points at one, and a deck whose ordering is stripped on
// export is a deck that arrives shuffled.
export function exportKept(S) {
  return JSON.stringify({ singularity_kept: 1, cards: kept(S).map(({ keptAt, ...rest }) => rest) }, null, 2);
}

export function importKept(S, text) {
  let data;
  try { data = JSON.parse(String(text || '')); } catch { return { ok: false, reason: 'that is not a deck — the paste should be the JSON this game exports', added: 0 }; }
  const cards = Array.isArray(data) ? data : Array.isArray(data?.cards) ? data.cards : null;
  if (!cards) return { ok: false, reason: 'no cards in it', added: 0 };
  let added = 0, refused = 0;
  for (const c of cards) {
    const r = keepCard(S, c, { act: Number.isInteger(c.act) ? c.act : 1, run: c.run || 0, day: c.day || 0,
                               company: c.company || '', author: c.author || '', id: c.id || null });
    if (r.ok) added++; else refused++;
  }
  return { ok: added > 0, added, refused, reason: added ? '' : 'nothing in it was a card the deck could deal' };
}

// ── A deck as a link ────────────────────────────────────────────────────────
// `#deck=<base64 of the export>` on the address. It is the same JSON, through
// the same `importKept`, under the same validation — a URL is a paste with
// fewer steps, not a second door. Base64url, because a `+` in a fragment is a
// space by the time it reaches here and a `/` reads as a path.

export function encodeDeck(S) {
  return toBase64Url(exportKept(S));
}

// Reads the fragment, whether it arrives as `#deck=…`, `deck=…` or bare.
export function decodeDeck(hash) {
  const raw = String(hash || '').replace(/^#/, '');
  const m = /(?:^|&)deck=([^&]*)/.exec(raw);
  const payload = m ? m[1] : raw;
  if (!payload) return null;
  try { return fromBase64Url(decodeURIComponent(payload)); } catch { return null; }
}

// `target` is anything with a `legacy` on it: the live state in a run, or a
// bare `{ legacy }` at the title screen, where there is no state yet.
export function importDeckLink(target, hash) {
  const json = decodeDeck(hash);
  if (json == null) return { ok: false, added: 0, reason: 'that link does not carry a deck' };
  return importKept(target, json);
}

function toBase64Url(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = typeof btoa === 'function' ? btoa(bin) : Buffer.from(bytes).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s) {
  const b64 = String(s).replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  if (typeof atob === 'function') {
    const bin = atob(pad);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  return Buffer.from(pad, 'base64').toString('utf8');
}

// ── The dossier ─────────────────────────────────────────────────────────────

export function dossier(S) {
  return Array.isArray(S?.legacy?.dossier) ? S.legacy.dossier : [];
}

// Whoever was in front when the run stopped, if nobody actually crossed. A
// timeline that ran out of road still knows which lab was winning it.
function raceLeaderId(S) {
  const labs = S?.world?.race?.labs;
  if (!labs) return null;
  let best = null;
  for (const [id, st] of Object.entries(labs)) {
    if (!st?.alive) continue;
    if (!best || st.progress > labs[best].progress) best = id;
  }
  return best;
}

// §F8. The last timeline, for anything seeding this one from it. Answers null
// unless the New Game+ world toggle is set, so every caller is one `if`.
export function lastWorld(S) {
  if (!S?.settings?.ngWorld) return null;
  const past = dossier(S);
  return past.length ? past[past.length - 1] : null;
}

// One entry per finished timeline, written by `prestige()`.
export function buildDossier(S) {
  const rels = S.narrative?.relationships || {};
  const betrayed = Object.entries(rels).filter(([id, r]) => CHARACTERS[id] && r?.met && (r.affinity || 0) <= -14).map(([id]) => id);
  const loved = Object.entries(rels).filter(([id, r]) => CHARACTERS[id] && r?.met && (r.affinity || 0) >= 25).map(([id]) => id);
  const j = S.narrative?.journal || [];
  const tones = { cruel: 0, good: 0, risky: 0, costly: 0, neutral: 0 };
  for (const e of j) tones[e.tone || 'neutral'] = (tones[e.tone || 'neutral'] || 0) + 1;
  const style = Object.entries(tones).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
  const flags = Object.keys(S.narrative?.flags || {}).filter((k) => !k.startsWith('_') && !k.startsWith('world_')).slice(0, 12);
  const race = S.world?.race?.crossed;
  return {
    run: (S.legacy?.runs || 0) + 1,
    company: S.company?.name, founder: S.founder?.name, archetype: S.founder?.archetype,
    ending: S.ending?.id || 'abandoned', endingName: S.ending?.name || 'Abandoned', tone: S.ending?.tone || 'neutral',
    act: S.company?.act || 1, day: Math.floor(S.time?.day || 0),
    valuation: S.company?.valuation || 0,
    race: race ? (race.you ? 'won' : `lost to ${race.name}`) : 'nobody crossed',
    // §F8. The world remembers. These are the three facts the next timeline
    // seeds itself from when `settings.ngWorld` is set: which lab crossed (or
    // led, if nobody did), how large a company you learned to run, and how
    // Dorne felt about you the day it ended. Read in `initRace`, `spawnAperture`
    // and `game.js`; ignored entirely without the toggle.
    // The best *lab*, always — when the founder crossed, `race.id` is 'you'
    // and the interesting fact is who was second.
    raceLab: race && !race.you ? race.id : (raceLeaderId(S) || null),
    raceCrossed: !!race && !race.you,
    raceWon: !!race?.you,
    raceMargin: race ? (race.margin ?? 0) : 0,
    bestRoster: (S.agents || []).filter((a) => a.status === 'active').length,
    dorneHeat: Math.round(S.world?.regulatoryHeat || 0),
    rival: S.market?.competitors?.find((c) => c.id === S.market?.nemesis?.id)?.name || null,
    style, cruel: tones.cruel, betrayed, loved, flags,
    doctrines: Object.keys(S.doctrines?.earned || {}),
    mom: Math.round(rels.mom?.affinity || 0),
    calls: S.stats?.callsMade || 0,
    // The world's own notebook, whole. It is the only thing an assistant wrote
    // to itself, and the next timeline's briefing reads it back — so a world
    // that promised somebody something on day 300 can still be holding that
    // promise in a company that does not exist yet.
    worldNotes: (S.world?.author?.notes || []).slice(-KEEP.NOTES_KEPT).map((n) => n.text),
    ...(S.world?.author?.epilogue?.text ? { epilogue: S.world.author.epilogue.text } : {}),
  };
}

// The short version the world gets, and the deck reads: a couple of lines.
export function dossierLines(S, max = 2) {
  const past = dossier(S);
  if (!past.length) return [];
  const last = past[past.length - 1];
  const out = [];
  out.push(`Timeline ${last.run}, ${last.company}: ${last.endingName} on day ${last.day}, act ${last.act}; the race ${last.race}${last.rival ? `; the rival was ${last.rival}` : ''}.`);
  const bits = [];
  if (last.style === 'cruel') bits.push('chose the cruel option more than any other');
  else if (last.style === 'good') bits.push('took the careful option most');
  if (last.betrayed.length) bits.push(`burned ${last.betrayed.map((id) => CHARACTERS[id]?.name.split(' ')[0] || id).join(', ')}`);
  if (last.loved.length) bits.push(`kept ${last.loved.map((id) => CHARACTERS[id]?.name.split(' ')[0] || id).join(', ')} close`);
  if (last.mom < 0) bits.push('stopped calling their mother');
  if (bits.length) out.push(`They ${bits.join('; ')}.`);
  // What the world wrote down for itself last time, in its own words. It goes
  // last, so a caller taking two lines gets the history and a caller taking
  // three gets the intent.
  const notes = (last.worldNotes || []).slice(-2);
  if (notes.length) out.push(`Your notebook from that run: ${notes.join(' · ')}`);
  return out.slice(0, max);
}


export function lastRun(S) { const d = dossier(S); return d.length ? d[d.length - 1] : null; }
