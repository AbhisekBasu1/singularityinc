// ─────────────────────────────────────────────────────────────────────────────
// APERTURE SYSTEMS — the rival plays the same game.
//
// Aperture has always been three things that did not quite meet: the company
// Marcus Vance founded in the cards, a lab in the race, and a press office on
// its own origin. This file makes it one thing with state. When the founder
// meets Vance, Aperture enters the market as a real competitor — funding,
// users, quality — and from then on it plays a week at a time: it hires from a
// roster, researches real nodes off the real tree, ships, reprices, raises,
// poaches, or goes quiet. Its research becomes capability; its capability
// speeds the Aperture lab in the race, so the race stops being a converging
// number and becomes a company doing things you can see.
//
// Two hands can steer it. An assistant playing the world may point it at a
// focus for a month through `rival_move`; a person sitting in Vance's chair on
// the rival's own site may make its plays outright. Both go through
// `setFocus` and `play`, and neither reaches past what the company can afford.
//
// Everything hostile still runs through `nemesis.js`'s move engine, so a
// hostile play is the same move the feud would have made, with the same
// consequences and the same counters.
// ─────────────────────────────────────────────────────────────────────────────
import { RIVALCO as R, RACE, MARKET, NGPLUS } from '../data/balance.js';
import { PLAYS, FOCUS } from '../data/rivalco.js';
import { RESEARCH, RESEARCH_MAP } from '../data/research.js';
import { REGION_MAP } from '../data/regions.js';
import { diffMods } from '../data/difficulty.js';
import { rivalIn, takeRegion } from './regions.js';
import { spawnCompetitor } from './market.js';
import { totalUsers } from './product.js';
import { lastWorld } from './keep.js';
import { runMove, nemesisState, grudgeBand, activeGoal, intelReveals } from './nemesis.js';
import { pushFeed } from './feed.js';
import { markDirty } from './modifiers.js';
import { chance, weightedPick, pick } from '../engine/rng.js';
import { clamp } from '../engine/format.js';
import { emit } from '../engine/bus.js';

export const APERTURE = { name: 'Aperture Systems', founder: 'Marcus Vance', handle: '@mvance' };

const FRONTIER_KEYS = ['rag', 'agent_memory', 'model_deep', 'swarm_orchestration', 'finetuning',
  'model_frontier', 'interpretability', 'synthetic_data', 'distillation', 'own_foundation_model',
  'constitutional_ai', 'recursive_self_improvement', 'model_ecology', 'ascension_protocol'];

export function aperture(S) {
  return (S?.market?.competitors || []).find((c) => c.scripted && c.name === APERTURE.name) || null;
}
export function apertureAlive(S) { const c = aperture(S); return c && c.status === 'active' ? c : null; }

// The company, standing up. Called by the card that introduces Vance; safe to
// call twice.
export function spawnAperture(S) {
  const have = aperture(S);
  if (have) return have;
  // New Game+'s harder rival opens the same company with a bigger bank, which
  // is the only lever that changes every play it can afford afterwards. §A21
  // puts the difficulty's own multiple on top: Ruthless funds Vance two and a
  // half times over, One Take five.
  const fundMult = (S.settings?.ngRival ? NGPLUS.RIVAL_FUNDING : 1) * (diffMods(S).rivalFunding || 1);
  const c = spawnCompetitor(S, {
    name: APERTURE.name, founder: APERTURE.founder, personality: 'shark', scripted: true,
    funding: R.START_FUNDING * fundMult, users: R.START_USERS, mrr: R.START_MRR,
    quality: R.START_QUALITY, scale: 1,
  });
  c.handle = APERTURE.handle;
  const st = co(c);
  // §F8. A world that remembers opens Vance's company at the size of the one
  // the founder learned to run last timeline. `lastWorld` answers null without
  // the toggle, so this is the twelve people the card names.
  const past = lastWorld(S);
  if (past?.bestRoster) {
    st.roster = clamp(R.START_ROSTER + Math.round(past.bestRoster * R.MEMORY_ROSTER_PER_AGENT),
                      R.START_ROSTER, R.MEMORY_ROSTER_MAX);
  }
  emit('aperture:founded', { competitor: c });
  return c;
}

// The company state, on the competitor record so it saves and dies with it.
export function co(c) {
  if (!c.co) c.co = { roster: R.START_ROSTER, research: { done: {}, doneDay: {}, active: null, progress: 0 },
                      plays: [], focus: 'auto', focusUntil: -1, lastWeek: -99, lastRaiseDay: -999, capability: 0,
                      blocs: [], building: null, intent: null, intents: [], lastLeakDay: -999 };
  c.co.research ??= { done: {}, doneDay: {}, active: null, progress: 0 };
  c.co.plays ??= []; c.co.focus ??= 'auto'; c.co.focusUntil ??= -1; c.co.lastWeek ??= -99; c.co.lastRaiseDay ??= -999;
  c.co.blocs ??= []; c.co.building ??= null;
  // §H12. What they mean to do, written down before they do it. A save from
  // before this grows the fields on the next tick and knows nothing until the
  // policy sets one.
  c.co.intent ??= null; c.co.intents ??= []; c.co.lastLeakDay ??= -999;
  return c.co;
}

// ── §H12 Asymmetric information ─────────────────────────────────────────────
// `intent` is the one thing about Aperture the founder cannot simply read.
// The policy sets it a few days before the play; `rival_move`'s focus and a
// person in the chair set it too, because a hand that has decided has an
// intent whoever the hand belongs to. It never appears in `apertureState` —
// that payload is rendered on their own public site and read by the Market
// view — so every route to it is a route the founder had to earn.

export function setIntent(S, play, { target = null, days = R.INTENT_LEAD_DAYS, by = 'policy' } = {}) {
  const c = apertureAlive(S);
  if (!c) return null;
  const st = co(c);
  const intent = { play, target, by, set: Math.floor(S.time.day),
                   until: Math.floor(S.time.day + Math.max(1, days)) };
  st.intent = intent;
  st.intents.unshift(intent);
  if (st.intents.length > R.INTENT_HISTORY) st.intents.length = R.INTENT_HISTORY;
  return intent;
}

// The live plan, for the three surfaces that have earned it. Never serialised
// into the public payload.
export function apertureIntent(S) {
  const c = apertureAlive(S);
  if (!c) return null;
  const st = co(c);
  const i = st.intent;
  if (!i) return null;
  return { ...i, name: PLAYS[i.play]?.name || FOCUS[i.play]?.name || i.play,
           line: FOCUS[i.play]?.line || PLAYS[i.play]?.name || '' };
}

// What the press office will admit to, which is last month's plan and only
// once a month. Old enough that saying it costs them nothing, which is why
// they say it.
export function leakIntent(S, { take = true } = {}) {
  const c = apertureAlive(S);
  if (!c) return null;
  const st = co(c);
  if (S.time.day - st.lastLeakDay < R.INTENT_LEAK_EVERY_DAYS) return null;
  const old = (st.intents || []).find((i) => S.time.day - i.set >= R.INTENT_LEAK_AFTER_DAYS);
  if (!old) return null;
  if (take) st.lastLeakDay = Math.floor(S.time.day);
  return { ...old, name: PLAYS[old.play]?.name || FOCUS[old.play]?.name || old.play,
           ago: Math.round(S.time.day - old.set) };
}

// What they could research next: real nodes, whose requirements they have,
// no later than the act the world is in, cheapest first within a branch bias.
function candidates(S, c, frontier) {
  const done = co(c).research.done;
  const act = S.company?.act || 1;
  return RESEARCH.filter((n) => !done[n.id] && (n.act || 1) <= act && (n.reqs || []).every((r) => done[r]))
    .filter((n) => !frontier || n.branch === 'intelligence' || n.branch === 'frontier' || FRONTIER_KEYS.includes(n.id))
    .sort((a, b) => a.cost - b.cost);
}

export function capability(c) {
  const st = co(c);
  let p = 0;
  for (const k of FRONTIER_KEYS) if (st.research.done[k]) p += (RESEARCH_MAP[k]?.tier || 1) * RACE.NODE_TIER_VALUE;
  p += Math.min(R.ROSTER_CAPABILITY_CAP, st.roster * R.ROSTER_CAPABILITY_RATE);
  return p;
}

// §A3. Aperture's capability on the race's own 0..100 scale, so the company
// the founder can go and look at is measured the same way the founder is and
// the same way the three institutions are. The three terms are the same three:
// the frontier nodes it has finished, the people who run them, and the money
// that stands in for the compute it can buy. Zero when there is no company —
// the Aperture lab is then a name on a door, running at `RACE.DRIVE_FLOOR`.
export function apertureCapability(S) {
  const c = apertureAlive(S);
  if (!c) return 0;
  const st = co(c);
  let p = 0;
  for (const k of FRONTIER_KEYS) if (st.research.done[k]) p += (RESEARCH_MAP[k]?.tier || 1) * RACE.NODE_TIER_VALUE;
  p += Math.min(R.ROSTER_CAP_RACE, st.roster * R.ROSTER_RATE_RACE);
  p += Math.min(R.MONEY_CAP_RACE,
    Math.max(0, Math.log10(Math.max(1, c.funding) / R.MONEY_FLOOR_RACE)) * R.MONEY_RATE_RACE);
  return clamp(p, 0, 100);
}

// How much faster the Aperture lab runs for what the company has built,
// against the same lab with nothing behind it. This is the number the Market
// view prints *and* the number the race applies — `tickRace` reads
// `labDrive(apertureCapability(S))`, and `labDrive(0)` is that empty lab. It
// used to be a decorative 22% ceiling on a rate the sprint term dominated.
export function apertureRaceMult(S) {
  const c = apertureAlive(S);
  if (!c) return 1;
  const floor = RACE.DRIVE_FLOOR;
  return (floor + RACE.DRIVE_GAIN * clamp(apertureCapability(S) / 100, 0, 1)) / floor;
}

export function setFocus(S, focus, days = R.FOCUS_DAYS) {
  const c = apertureAlive(S);
  if (!c || !FOCUS[focus]) return { ok: false, reason: c ? 'unknown focus' : 'no company' };
  const st = co(c);
  st.focus = focus;
  st.focusUntil = S.time.day + Math.max(1, days);
  // §H12. A hand that has decided has an intent, whoever the hand belongs to.
  // `human` is not a plan, it is who is holding the company.
  if (focus !== 'auto' && focus !== 'human') setIntent(S, focus, { days: Math.max(1, days), by: 'world' });
  markDirty();
  emit('aperture:focus', { focus, until: st.focusUntil });
  return { ok: true, focus, until: st.focusUntil };
}

const fillLine = (t, S, c, extra = {}) => String(t)
  .replace(/\{them\}/g, c.name).replace(/\{you\}/g, S.company.name)
  .replace(/\{n\}/g, String(extra.n ?? '')).replace(/\{node\}/g, String(extra.node ?? ''))
  .replace(/\{bloc\}/g, String(extra.bloc ?? ''));

function record(S, c, kind, extra = {}, { announce = false } = {}) {
  const st = co(c);
  const def = PLAYS[kind];
  // Not the line the site printed last time for this play, or for any play in
  // the last few weeks: a company whose every release reads the same is a
  // template, not a rival.
  const recent = (st.plays || []).slice(0, 6).map((p) => p.text);
  let line = fillLine(pick(def.lines), S, c, extra);
  for (let i = 0; i < 4 && recent.includes(line); i++) line = fillLine(pick(def.lines), S, c, extra);
  st.plays.unshift({ day: Math.floor(S.time.day), kind, text: line });
  if (st.plays.length > R.PLAYS_KEEP) st.plays.length = R.PLAYS_KEEP;
  if (announce) pushFeed(S, { type: 'news', author: 'The Ledger', tone: 'neutral', text: line, meta: `${c.name} · ${def.name}` });
  emit('aperture:play', { competitor: c, kind, line });
  return line;
}

// The plays, each bounded by what the company can afford.
const DO = {
  hire(S, c) {
    const st = co(c);
    if (st.roster >= R.MAX_ROSTER || c.funding < R.HIRE_COST * 3) return false;
    const n = Math.min(R.MAX_ROSTER - st.roster, 1 + Math.floor(Math.log10(Math.max(1, c.funding / R.HIRE_COST))));
    st.roster += n; c.funding -= n * R.HIRE_COST;
    record(S, c, 'hire', { n }, { announce: chance(R.ANNOUNCE) });
    return true;
  },
  ship(S, c) {
    // Hostile when the feud is hot enough for it; otherwise a quiet release.
    if (nemesisState(S).id === c.id && runMove(S, c, 'mirror')) { record(S, c, 'ship'); return true; }
    c.quality = clamp(c.quality + R.SHIP_QUALITY, 0, 5);
    record(S, c, 'ship', {}, { announce: chance(R.ANNOUNCE * 0.6) });
    return true;
  },
  research(S, c, frontier = false) {
    const st = co(c);
    if (st.research.active) return false;
    const next = candidates(S, c, frontier)[0] || candidates(S, c, false)[0];
    if (!next) return false;
    st.research.active = next.id; st.research.progress = 0;
    record(S, c, frontier ? 'frontier' : 'research', { node: next.name }, { announce: chance(R.ANNOUNCE) });
    return true;
  },
  price(S, c) { return nemesisState(S).id === c.id && !!runMove(S, c, 'undercut') && !!record(S, c, 'price'); },
  raise(S, c) {
    if (!canRaise(S, c).ok) return false;
    const st = co(c);
    st.lastRaiseDay = S.time.day;
    if (nemesisState(S).id === c.id && runMove(S, c, 'raise')) {
      c.funding = Math.min(c.funding, R.FUNDING_CEILING);
      record(S, c, 'raise'); return true;
    }
    c.funding = Math.min(R.FUNDING_CEILING, c.funding + c.mrr * 18 + R.RAISE_FLOOR);
    record(S, c, 'raise', {}, { announce: true });
    return true;
  },
  poach(S, c) { return nemesisState(S).id === c.id && !!runMove(S, c, 'poach') && !!record(S, c, 'poach'); },
  // §A10. Aperture takes a stage on the same region board the founder plays.
  // It cannot start one while another is building, cannot enter a bloc
  // somebody already holds, and never reaches past `BOARD.EXCLUSIVE_FROM` —
  // above that a bloc has one supplier, and if that is going to be Aperture
  // the founder is the one who has to be displaced, in a card.
  expand(S, c) {
    const st = co(c);
    if ((S.company.act || 1) < 3 || st.building) return false;
    if (c.funding < R.EXPAND_COST) return false;
    const want = R.EXPAND_BLOCS.find((id) => !rivalIn(S, id));
    if (!want) return false;
    c.funding -= R.EXPAND_COST;
    st.building = { region: want, days: R.EXPAND_DAYS, progress: 0 };
    return true;
  },
  quiet(S, c) { record(S, c, 'quiet'); return true; },
};

export const PLAY_KINDS = Object.keys(DO);

// A round, if the company may close one now: not inside the cooldown and not
// at the ceiling. Says why not, in a form the chair can print.
export function canRaise(S, c) {
  const st = co(c);
  const since = S.time.day - st.lastRaiseDay;
  if (since < R.RAISE_COOLDOWN_DAYS) {
    const days = Math.max(1, Math.ceil(R.RAISE_COOLDOWN_DAYS - since));
    return { ok: false, reason: 'cooldown', note: `NEXT ROUND IN ${days}D`, days };
  }
  if (c.funding >= R.FUNDING_CEILING) return { ok: false, reason: 'ceiling', note: 'FUNDING AT CEILING' };
  return { ok: true };
}

function weights(S, c) {
  const st = co(c);
  const w = { ...R.PLAY_WEIGHTS };
  const grudge = nemesisState(S).id === c.id ? nemesisState(S).grudge : 0;
  if (c.funding < R.LOW_FUNDING) { w.raise *= 3; w.hire *= 0.2; }
  if (!st.research.active) w.research *= 3;
  if (grudge >= 1) { w.price *= 2; w.poach *= 2; }
  if ((S.company.act || 1) >= 3) w.frontier = R.PLAY_WEIGHTS.frontier * 2;
  if ((S.company.act || 1) < 3 || st.building || c.funding < R.EXPAND_COST) w.expand = 0.01;
  const f = st.focus;
  if (f && f !== 'auto' && f !== 'human' && S.time.day <= st.focusUntil) {
    for (const k of Object.keys(w)) w[k] *= (k === f || (f === 'growth' && (k === 'hire' || k === 'ship')) || (f === 'frontier' && k === 'research')) ? 4 : 0.35;
  }
  return w;
}

// One play, chosen by policy or by hand. Returns what happened.
export function play(S, c, kind) {
  const st = co(c);
  const k = kind || weightedPick(Object.keys(weights(S, c)), Object.values(weights(S, c)));
  const frontier = k === 'frontier';
  const fn = DO[frontier ? 'research' : k];
  let ok = fn ? fn(S, c, frontier) : false;
  if (!ok) ok = DO.quiet(S, c);
  st.lastWeek = S.time.day;
  // §H12. The plan has been spent. What it was stays in `intents` for the
  // press office to admit to a month from now.
  st.intent = null;
  // Whichever hand made the play, growth never leaves the market's ceiling:
  // the feud's `raise` compounds it, and a chair could raise every quarter.
  if (Number.isFinite(c.growth)) c.growth = Math.min(c.growth, MARKET.RIVAL_GROWTH_CAP);
  markDirty();
  return { kind: k, ok };
}

// A person in Vance's chair, through the rival's own site. A week is one
// play for a person as it is for the policy, and every refusal says why with
// a mono note the chair prints: the week is not up, the round is too soon,
// the bank is full, the play does not exist.
export function humanPlay(S, kind) {
  const c = apertureAlive(S);
  if (!c) return { ok: false, reason: 'no company', note: 'NO COMPANY YET' };
  if (!PLAY_KINDS.includes(kind) && kind !== 'frontier') return { ok: false, reason: 'not a play', note: 'NOT A PLAY' };
  const st = co(c);
  const since = S.time.day - st.lastWeek;
  if (since < R.WEEK) {
    const days = Math.max(1, Math.ceil(R.WEEK - since));
    return { ok: false, reason: 'week', note: `NEXT PLAY IN ${days}D`, days };
  }
  if (kind === 'raise') { const r = canRaise(S, c); if (!r.ok) return r; }
  setFocus(S, 'human', R.FOCUS_DAYS);
  // §H12. A person's hand is a plan too: recorded before it lands, so the
  // press office has something to admit to next month.
  setIntent(S, kind, { days: 1, by: 'chair' });
  return play(S, c, kind);
}

export function tickRivalCo(S, days = 1) {
  const c = apertureAlive(S);
  if (!c) return;
  const st = co(c);
  // Research runs every day; a roster is what runs it.
  if (st.research.active) {
    const node = RESEARCH_MAP[st.research.active];
    if (!node) st.research.active = null;
    else {
      st.research.progress += (R.RESEARCH_BASE + st.roster * R.RESEARCH_PER_AGENT) * days;
      if (st.research.progress >= node.cost * R.COST_MULT) {
        st.research.done[node.id] = true; st.research.doneDay[node.id] = Math.floor(S.time.day);
        st.research.active = null; st.research.progress = 0;
        record(S, c, 'research', { node: node.name }, { announce: chance(R.ANNOUNCE) });
      }
    }
  }
  st.capability = capability(c);
  // §A10. A bloc lands when the building is finished, not when it is
  // announced — the same clock the founder's own stages run on.
  if (st.building) {
    st.building.progress += days / st.building.days;
    if (st.building.progress >= 1) {
      const rid = st.building.region;
      const got = takeRegion(S, 'aperture', rid, R.EXPAND_MAX_STAGE);
      st.building = null;
      if (got) {
        st.blocs = st.blocs || [];
        st.blocs.push(rid);
        record(S, c, 'expand', { bloc: REGION_MAP[rid]?.name || rid }, { announce: true });
      }
    }
  }
  // Payroll: people cost money, which is the whole reason a roster is a decision.
  c.funding -= st.roster * R.WAGE_PER_DAY * days;
  // A company of this size serves somebody. The shared-market logistic can
  // starve a rival to nothing under a dominant founder; a lab with thirty
  // people and forty million in the bank does not have zero users.
  c.users = Math.max(c.users, st.roster * R.USERS_PER_HEAD);
  if (st.focus !== 'auto' && st.focus !== 'human' && S.time.day > st.focusUntil) st.focus = 'auto';
  if (st.focus === 'human' && S.time.day > st.focusUntil) st.focus = 'auto';
  // A week is a decision. A person in the chair makes them; the policy waits.
  // §A21. A week is a decision — or two of them, on the difficulties that
  // change the rival's shape rather than its multipliers. `play` writes
  // `lastWeek` itself, so the second one has to be asked for by hand.
  if (st.focus !== 'human' && !S._offline) {
    const since = S.time.day - st.lastWeek;
    // §H12. The policy decides a few days before it acts, and then does what it
    // decided. That gap is the whole of the asymmetry: for INTENT_LEAD_DAYS
    // there is a fact about next week that the founder can only buy.
    if (since >= R.WEEK - R.INTENT_LEAD_DAYS && !st.intent) {
      const w = weights(S, c);
      setIntent(S, weightedPick(Object.keys(w), Object.values(w)), { days: R.INTENT_LEAD_DAYS + 1 });
    }
    if (since >= R.WEEK) {
      const plays = Math.max(1, Math.round(diffMods(S).rivalPlays || 1));
      const planned = st.intent?.by === 'policy' ? st.intent.play : null;
      for (let i = 0; i < plays; i++) play(S, c, i === 0 ? planned : undefined);
    }
  }
}

// The payload the rival's own site renders, and the Market view reads.
export function apertureState(S) {
  const c = aperture(S);
  if (!c) return null;
  const st = co(c);
  const active = st.research.active ? RESEARCH_MAP[st.research.active] : null;
  const n = nemesisState(S);
  const grudge = n.id === c.id ? (n.grudge || 0) : 0;
  const known = n.id === c.id && intelReveals(S) ? activeGoal(S) : null;
  return {
    name: c.name, founder: c.founder, alive: c.status === 'active', status: c.status,
    users: Math.round(c.users), mrr: Math.round(c.mrr), funding: Math.round(c.funding), quality: Math.round(c.quality * 100) / 100,
    roster: st.roster, researchDone: Object.keys(st.research.done).length,
    researching: active ? active.name : null,
    progress: active ? clamp(st.research.progress / (active.cost * R.COST_MULT), 0, 1) : 0,
    capability: Math.round(st.capability * 10) / 10,
    focus: st.focus, focusName: FOCUS[st.focus]?.name || st.focus, focusLine: FOCUS[st.focus]?.line || '',
    // For the chair: days until the next play is legal, and until the next round.
    playIn: Math.max(0, Math.ceil(st.lastWeek + R.WEEK - S.time.day)),
    raiseIn: Math.max(0, Math.ceil(st.lastRaiseDay + R.RAISE_COOLDOWN_DAYS - S.time.day)),
    // §A10. Where on the region board they are, and where they are building.
    blocs: (st.blocs || []).slice(),
    building: st.building ? (REGION_MAP[st.building.region]?.short || st.building.region) : null,
    plays: st.plays.slice(0, 6),
    // §H11. What their press office writes from. The grudge is public in the
    // only sense that matters — everybody can hear the tone — and the season's
    // objective is printed only when the founder has bought the ability to
    // read it, because this payload crosses back into the game.
    grudge: Math.round(grudge * 100) / 100,
    band: grudgeBand(grudge).name,
    goal: known?.name || null,
    // §H12. `intent` is deliberately not here. `apertureIntent` is the door,
    // and every caller of it had to earn the look.
  };
}

// The founder, as the rival's own site may read them: what anybody watching
// the market would know. No cash, no runway, no roster, no research — the
// numbers a competitor reads off a pricing page and a changelog.
export function founderPublic(S) {
  if (!S?.company) return null;
  const p = (S.products || []).find((x) => x.launched) || S.products?.[0] || null;
  const last = (S.narrative?.journal || []).find((e) => e.kind === 'milestone' || e.kind === 'opportunity');
  return {
    company: S.company.name, founder: S.founder?.name || 'the founder',
    act: S.company.act || 1, day: Math.floor(S.time?.day || 0),
    users: Math.round(totalUsers(S)),
    product: p ? p.name : null,
    category: p ? p.category : null,
    price: p ? Math.round(p.price || 0) : null,
    launched: !!p?.launched,
    lastRelease: last ? { day: Math.floor(last.day), what: String(last.title || '').slice(0, 60) } : null,
    approval: Math.round((S.world?.publicOpinion ?? 0.5) * 100),
    band: grudgeBand(nemesisState(S).grudge || 0).name,
  };
}
