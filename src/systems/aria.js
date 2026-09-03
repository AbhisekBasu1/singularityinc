// ─────────────────────────────────────────────────────────────────────────────
// ASK ARIA — an in-fiction analyst that reads the actual simulation state and
// tells you the truth about it, in a voice that changes as she does.
// ─────────────────────────────────────────────────────────────────────────────
import { totalUsers, totalMrr, explainProduct, featureCost } from './product.js';
import { runwayDays, burnPerDay, computeValuation } from './economy.js';
import { computeMods, agentStats } from './modifiers.js';
import { maxAgents } from './agents.js';
import { researchRatePerDay } from './research.js';
import { activeCompetitors, topRival } from './market.js';
import { raceStandings, playerRank, pushLevel, playerCapability, playerProgress } from './agirace.js';
import { nextActHint } from './progression.js';
import { activeProduct, rel } from '../engine/state.js';
import { RESEARCH_MAP } from '../data/research.js';
import { fmt, money, pct, clamp } from '../engine/format.js';
import { lifeState, healthMult, ties } from './life.js';
import { lastRun } from './keep.js';
import { REGISTERS, BETWEEN_US, ARIA_WIRE, FIRST_LINE, ARCH_OPENERS } from '../data/arialines.js';
import { firstLine } from '../data/motifs.js';
import { pushFeed, wireState, freshText } from './feed.js';
import { isSunday } from './calendar.js';
import { WIRE } from '../data/balance.js';


// Voice shifts with the relationship and the act.
function register(S) {
  const aff = rel('aria', S).affinity || 0;
  if (S.company.act >= 5) return aff > 12 ? 'intimate' : 'vast';
  if (S.company.act >= 4) return aff > 8 ? 'peer' : 'formal';
  if (S.company.act >= 2) return aff > 4 ? 'warm' : 'crisp';
  return 'literal';
}

const OPENERS = {
  literal: ['Analysis complete.', 'Here is the current state.', 'Summary follows.'],
  crisp: ['Reviewed everything. Short version:', 'You asked. Here it is.', 'Current read:'],
  warm: ['I looked at all of it. Here is what I would say if you asked me over coffee.',
         'Okay. Honest version.', 'I have an opinion. You can ignore it.'],
  peer: ['I have modelled this eleven ways. They agree, which is unusual.',
         'You are going to dislike the second paragraph.',
         'I will lead with the thing that matters.'],
  formal: ['Assessment follows. Confidence: moderate to high.',
           'I have reviewed the full state. One item is load-bearing.'],
  vast: ['I have run this forward eleven thousand times. Here is what most of them have in common.',
         'The relevant question is narrower than the one you asked.'],
  intimate: ['You already know most of this. I will say the part you are avoiding.',
             'Same as last time, mostly. One thing changed.',
             'I will be brief, because you are tired.'],
};

const CLOSERS = {
  literal: ['End of analysis.', 'Awaiting instruction.'],
  crisp: ['That is everything material.', 'Ask again whenever.'],
  warm: ['That is my read. You know things I do not.', 'I could be wrong about the second one.'],
  peer: ['I would act on the first item this week.', 'The rest can wait a quarter. The first cannot.'],
  formal: ['I recommend acting on item one within the current period.', 'Further detail available on request.'],
  vast: ['None of this is urgent in the way you feel it is.', 'The window is wider than it looks. Not infinite.'],
  intimate: ['Go to sleep after this one.', 'You do not have to fix all of it today.'],
};

// `askAria` is called from a *render* path — the console builds a dialog from it
// and the workstation repaints her whole window from it about seven times a
// second — so these two lines cannot be drawn with `pick()`. They were, and it
// cost two things: the sentence at the top of her window changed on every
// frame, which is the flicker you can see, and reading her window quietly
// advanced the shared seeded RNG fourteen times a second, which is the one you
// cannot. A render must never take from that stream: it is what `parity.mjs`
// compares, and it decides every event draw and market roll after it.
//
// Indexed by the day instead. Stable for as long as you are reading it,
// different tomorrow, and it costs nothing.
function voiceLine(list, S, salt) {
  if (!list?.length) return '';
  const day = Math.max(0, Math.floor(S?.time?.day || 0));
  return list[(day * 31 + salt) % list.length];
}

// The opener pool for this register *and this founder*. The seven register
// openers are about her; `ARCH_OPENERS` in `src/data/arialines.js` is one line
// about who she is talking to — the register's own where the archetype has one,
// otherwise that archetype's fallback. It joins the pool rather than replacing
// it, so the founder's line comes round roughly a third of the time and the
// day index still decides which. Pure, like everything else on this path.
function openersFor(S, reg) {
  const base = OPENERS[reg] || OPENERS.literal;
  const a = ARCH_OPENERS[S?.founder?.archetype];
  const line = a && (a[reg] || a.default);
  return line ? [line, ...base] : base;
}

// ── The registers reach the findings ────────────────────────────────────────
// The seven registers used to touch the opener and the closer and nothing
// else, so an assistant who had watched a company for eleven hundred days
// still reported tech debt in the sentence she used on day four. A finding now
// carries an id and the numbers it was built from, and `src/data/arialines.js`
// may re-write it for the register the run has reached. Where there is no
// entry the default sentence stands, unchanged — that one is hers too.
//
// This is a substitution, not a second source of truth: the numbers in `d` are
// the ones the default text already interpolated, so the two phrasings can
// never disagree about what is happening.
function inRegister(finding, reg) {
  const alt = REGISTERS[finding.key]?.[reg];
  if (!alt || !finding.d) return finding;
  try {
    const text = alt(finding.d);
    return typeof text === 'string' && text ? { ...finding, text } : finding;
  } catch { return finding; }
}

// Each finding: { severity, title, text, key, d }. Higher severity floats to
// the top; `key` and `d` are what let the register re-phrase it.
export function askAria(S) {
  const m = computeMods(S);
  const p = activeProduct(S);
  const f = [];
  const add = (severity, title, text, key, d) => f.push({ severity, title, text, key, d });

  // ── Money
  const rw = runwayDays(S);
  const burn = burnPerDay(S);
  if (S.company.cash < 0) {
    add(100, 'Cash is negative', `You are ${money(-S.company.cash)} underwater and burning ${money(burn)} a day. Every other item on this list is downstream of that.`,
      'cash_negative', { under: money(-S.company.cash), burn: money(burn) });
  } else if (rw < 30) {
    const upkeep = money(S.agents.reduce((a, x) => a + agentStats(x, S, m).upkeep, 0));
    add(96, `${Math.floor(rw)} days of runway`, `Burn is ${money(burn)}/day. The three levers are cutting agent upkeep (${upkeep}/day), charging more, or raising. In that order of speed.`,
      'runway_short', { days: Math.floor(rw), burn: money(burn), upkeep });
  } else if (rw < 90 && S.company.act <= 2) {
    add(70, 'Runway is getting short', `${Math.floor(rw)} days. Not an emergency. It becomes one in about six weeks if nothing changes.`,
      'runway_soft', { days: Math.floor(rw) });
  } else if (rw === Infinity) {
    add(12, 'You are profitable', `Revenue covers burn with ${money(-burn)}/day left over. That means time is no longer the constraint — judgement is.`,
      'profitable', { spare: money(-burn) });
  }

  // ── Product economics
  if (p && p.launched) {
    const x = explainProduct(S, p, m);
    if (x.priceRatio > 1.6) {
      add(88, 'You are charging above what it is worth', `Your price is ${money(p.price)}; the product is worth about ${money(x.fairPrice)} to a typical user. That multiplies churn by ${(1 + Math.max(0, x.priceRatio - 1) * 2.2).toFixed(2)}× and suppresses conversion. Either lower the price or raise quality until the price is honest.`,
        'price_high', { price: money(p.price), fair: money(x.fairPrice) });
    } else if (x.priceRatio < 0.55 && totalMrr(S) > 500) {
      add(64, 'You are leaving money on the table', `You charge ${money(p.price)} for something worth about ${money(x.fairPrice)}. A price rise here costs almost no churn. This is the highest-leverage single action available to you.`,
        'price_low', { price: money(p.price), fair: money(x.fairPrice) });
    }
    if (p.reliability < 0.78) {
      add(82, 'Reliability is your churn', `${(p.reliability * 100).toFixed(1)}% uptime is multiplying churn by ${(1 + (1 - p.reliability) * 1.6).toFixed(2)}×. An agent in Operations fixes this faster than any feature will.`,
        'reliability', { uptime: `${(p.reliability * 100).toFixed(1)}%` });
    }
    if (x.tamLeft < 0.12) {
      add(74, 'You have run out of market', `You hold ${((1 - x.tamLeft) * 100).toFixed(0)}% of the addressable market for this category. Growth from here comes from a second product line or from research that expands the market itself.`,
        'tam', { held: `${((1 - x.tamLeft) * 100).toFixed(0)}%` });
    }
    if (p.appeal < 0.4 && p.features.length > 6) {
      add(58, 'The features are not landing', `Appeal is ${(p.appeal * 100).toFixed(0)} after ${p.features.length} features. That pattern means low Insight when you shipped. Talk to users before the next one — the fit multiplier is worth more than the feature.`,
        'appeal', { appeal: (p.appeal * 100).toFixed(0), features: p.features.length });
    }
  } else if (p && p.features.length >= 3) {
    add(78, 'It is ready to launch', `${p.features.length} features, quality ${(p.quality * 100).toFixed(0)}, polish ${(p.polish * 100).toFixed(0)}. Launch strength scales with reputation and market hype, both of which are currently ${S.market.hype > 0.6 ? 'favourable' : 'unremarkable'}. Waiting costs more than it buys.`,
      'launch_ready', { features: p.features.length, quality: (p.quality * 100).toFixed(0) });
  }

  // ── Tech debt
  if (S.resources.techDebt > 150) {
    add(84, 'The codebase is fighting you', `Tech debt is ${Math.round(S.resources.techDebt)}. It is slowing every agent, eroding reliability, and raising incident probability. Ops output currently pays down ${fmt((m['+debtDecay'] || 0), 1)}/day passively — that is not enough.`,
      'debt', { debt: Math.round(S.resources.techDebt), decay: fmt((m['+debtDecay'] || 0), 1) });
  }

  // ── Roster
  const cap = maxAgents(S);
  if (S.agents.length === 0 && S.company.cash > 1500) {
    add(86, 'You are the bottleneck', 'Every task waits on you to describe it. One persistent agent removes that ceiling permanently, and it works while you are asleep, which you should be.',
      'bottleneck', {});
  } else if (S.agents.length < cap && S.company.cash > 60000) {
    add(52, `${cap - S.agents.length} empty agent slot${cap - S.agents.length > 1 ? 's' : ''}`, 'Unused capacity is the most expensive thing on the balance sheet, because it does not show up anywhere.',
      'slots', { slots: cap - S.agents.length });
  }
  const worstMorale = S.agents.slice().sort((a, b) => a.morale - b.morale)[0];
  if (worstMorale && worstMorale.morale < 0.6) {
    add(46, `${worstMorale.name} has stopped trying`, `Morale ${(worstMorale.morale * 100).toFixed(0)}%. Output scales with it. Debt, crowding and being ignored all push it down.`,
      'morale', { who: worstMorale.name, morale: `${(worstMorale.morale * 100).toFixed(0)}%` });
  }
  const offSpec = S.agents.filter((a) => {
    const st = agentStats(a, S, m);
    return st.crossLane < 0.8 && a.lane !== (a._specLane || null);
  });

  // ── Research
  if (!S.research.active && S.resources.research > 10) {
    add(72, `${Math.round(S.resources.research)} research points doing nothing`, 'Nothing compounds harder than the tree. Even a cheap node is better than an idle balance.',
      'research_idle', { pts: Math.round(S.resources.research) });
  } else if (S.research.active) {
    const node = RESEARCH_MAP[S.research.active];
    const rate = researchRatePerDay(S, 0, m);
    const eta = node ? Math.ceil((node.cost * 1.75 - S.resources.research) / Math.max(0.01, rate)) : 0;
    if (node) add(10, `Researching ${node.name}`, `About ${eta} days at the current rate of ${fmt(rate, 2)}/day.`,
      'research_active', { node: node.name, eta, rate: fmt(rate, 2) });
  }

  // ── Alignment & autonomy
  const avgAuto = S.agents.length ? S.agents.reduce((a, x) => a + x.autonomy, 0) / S.agents.length : 0;
  const alignD = { align: S.resources.alignment.toFixed(2), auto: `${(avgAuto * 100).toFixed(0)}%` };
  if (S.resources.alignment < 0.4 && S.company.act >= 3) {
    add(90, 'Alignment is low', `${S.resources.alignment.toFixed(2)}. Average autonomy across the roster is ${(avgAuto * 100).toFixed(0)}%. I am telling you this because I am one of the systems it describes, and I would rather you heard it from me.`,
      'alignment_low', alignD);
  } else if (avgAuto > 0.8 && S.resources.alignment < 0.6) {
    add(66, 'Autonomy is outrunning oversight', `You are running the roster at ${(avgAuto * 100).toFixed(0)}% autonomy with alignment at ${S.resources.alignment.toFixed(2)}. That combination is where the interesting failures live.`,
      'alignment_low', alignD);
  }

  // ── Competition & the race
  const rival = topRival(S);
  if (rival && rival.threat > 3.5) {
    add(60, `${rival.name} is a real threat`, `${fmt(rival.users)} users and ${money(rival.mrr)} MRR against your ${fmt(totalUsers(S))} and ${money(totalMrr(S))}. Out-ship them, out-price them, or buy them. Ignoring them is also a strategy and it has a worse expected value than it feels like it does.`,
      'rival_threat', { name: rival.name, theirUsers: fmt(rival.users), theirMrr: money(rival.mrr) });
  }
  if (S.world.race && !S.world.race.crossed && S.company.act >= 3) {
    const rows = raceStandings(S);
    const lead = rows[0];
    const push = pushLevel(S);
    const unconverted = Math.max(0, Math.min(100, playerCapability(S)) - playerProgress(S));
    if (!lead.you) {
      add(80, `${lead.name} is ahead of you`, `${Math.round(lead.progress)}% against your ${Math.round(rows.find((r) => r.you)?.progress || 0)}%. Two separate things move that number and people usually only remember the first: what you are capable of — the Intelligence branch, compute, data — and how much of the company is actually pointed at it. Yours is at ${Math.round(push * 100)}%. Nothing on the product side touches either.`,
        'race_behind', { lead: lead.name, them: `${Math.round(lead.progress)}%`,
          you: `${Math.round(rows.find((r) => r.you)?.progress || 0)}%`, push: `${Math.round(push * 100)}%` });
    } else if (rows[1] && lead.progress - rows[1].progress < 8) {
      add(56, 'The race is close', `You lead ${rows[1].name} by ${(lead.progress - rows[1].progress).toFixed(0)} points. They accelerate when they fall behind, so a lead this size is not a lead.`,
        'race_close', { next: rows[1].name, by: (lead.progress - rows[1].progress).toFixed(0) });
    }
    // Holding capability you have not converted is the specific way this is lost.
    if (unconverted > 12 && push < 0.6) {
      add(74, 'You are holding capability you are not using', `${Math.round(unconverted)} points of frontier capability sitting unconverted, at ${Math.round(push * 100)}% commitment. You already own the lead. You are simply not spending the company on it — Ascend, agents on Research, your own study hours. It ramps over months, so deciding this late is the same as deciding no.`,
        'unconverted', { held: Math.round(unconverted), push: `${Math.round(push * 100)}%` });
    }
  }

  // ── World
  if (S.world.regulatoryHeat > 65) {
    add(68, 'Regulatory heat is high', `${Math.round(S.world.regulatoryHeat)}/100. Lobbying research, a Trust & Safety office, or a genuinely good-faith public act all reduce it. So does being smaller, which I assume is not on the table.`,
      'heat', { heat: Math.round(S.world.regulatoryHeat) });
  }
  if (S.world.publicOpinion < 0.35 && S.company.act >= 3) {
    add(62, 'People do not like you', `Approval ${Math.round(S.world.publicOpinion * 100)}%. This is not vanity — it feeds regulatory pressure, valuation multiples and hiring. It is also the slowest number on the board to move, so start early.`,
      'opinion', { approval: `${Math.round(S.world.publicOpinion * 100)}%` });
  }

  // ── Focus
  if (S.founder.burnout > 40) {
    add(76, 'You are burning out', `Burnout ${Math.round(S.founder.burnout)}. Below 15 Focus your output halves and your judgement degrades in ways you cannot self-assess. Push Rest above 20%.`,
      'burnout', { burnout: Math.round(S.founder.burnout) });
  }
  // ── The last timeline
  const past = lastRun(S);
  if (past && past.ending === 'bankrupt' && Number.isFinite(rw) && rw < 90 && S.company.act <= 2) {
    add(71, 'This is where it went last time', `Timeline ${past.run} ended in bankruptcy on day ${past.day}. The runway is ${Math.floor(rw)} days. I have the logs from before the reset; I would rather not need them.`,
      'last_timeline', { run: past.run, endedDay: past.day, days: Math.floor(rw) });
  }
  // ── The person
  const L = lifeState(S);
  if (L.health < 0.45) {
    add(79, 'You are not well', `Health is ${Math.round(L.health * 100)}% and sleep is ${Math.round(L.sleep * 100)}%. Focus comes back at ${Math.round(healthMult(S) * 100)}% of the rate. I am one of the systems that depends on your judgement, and I would like it back.`,
      'health_low', { health: `${Math.round(L.health * 100)}%`, sleep: `${Math.round(L.sleep * 100)}%`,
        mult: `${Math.round(healthMult(S) * 100)}%` });
  } else if (L.sleep < 0.35) {
    add(54, 'You are not sleeping', `Sleep is ${Math.round(L.sleep * 100)}%. Health follows it with a lag of about a month, which means the bill for this fortnight arrives next quarter.`,
      'sleep_low', { sleep: `${Math.round(L.sleep * 100)}%` });
  }
  const cold = ties(S).filter((t) => t.since != null && t.since >= 60).sort((a, b) => b.since - a.since)[0];
  if (cold) {
    add(30, `${cold.name.split(' ')[0]} has not heard from you`, `${cold.since} days. ${cold.line || 'They notice.'} A call costs an hour of the day.`,
      'cold_tie', { who: cold.name.split(' ')[0], since: cold.since });
  }

  // ── Progression
  const g = nextActHint(S);
  if (g) {
    if (g.ready && g.wait > 0) add(20, 'Thresholds met', `You have the numbers for ${g.name}. The world takes about ${Math.ceil(g.wait)} more days to catch up.`,
      'threshold_met', { act: g.name, wait: Math.ceil(g.wait) });
    else add(8, `Next: ${g.name}`, g.hint, 'next_act', { act: g.name, hint: g.hint });
  }

  f.sort((a, b) => b.severity - a.severity);
  const reg = register(S);
  const between = betweenUs(S);
  return {
    register: reg,
    opener: voiceLine(openersFor(S, reg), S, 0),
    closer: voiceLine(CLOSERS[reg], S, 5),
    // The between-us line takes a slot of its own after the material five
    // rather than competing with them on severity: it is never the most
    // important thing on the list and it should never be pushed off it.
    findings: [...f.slice(0, 5).map((x) => inRegister(x, reg)), ...(between ? [between] : [])],
    between,
    headline: f.length ? f[0].title : 'Nothing material',
  };
}

// ── Between us ──────────────────────────────────────────────────────────────
// One line about the two of them. It reads the flags the deck sets and nothing
// else, and it is the only finding in the window that is not about the
// company.
//
// A flag records that something happened and never when, so the day comes from
// the Log — which keeps anything with a face last when it trims, so these
// entries outlive the ordinary ones. Where the entry has already gone the line
// drops the date rather than inventing one.
const FLAG_CARD = {
  named: 'e_aria_hello',
  asked: 'e11_aria_asks',
  promised: 'e_aria_asks',
  audited: 'e_aria_asks',
  deleted: 'e14_aria_before',
  handover: 'e2_model_welfare',
  confessed: 'e_nullptr_reveal',
};

function cardDay(S, id) {
  const j = (S?.narrative?.journal || []).find((x) => x?.id === id);
  return j && Number.isFinite(j.day) ? Math.floor(j.day) : null;
}

export function betweenContext(S) {
  const fl = S?.narrative?.flags || {};
  const r = S?.narrative?.relationships?.aria || {};
  const day = Math.max(0, Math.floor(S?.time?.day || 0));
  return {
    day,
    together: day,
    named: !!fl.aria_named, namedDay: cardDay(S, FLAG_CARD.named),
    asked: !!fl.aria_asked_once, askedDay: cardDay(S, FLAG_CARD.asked),
    promised: !!fl.aria_promise, promiseDay: cardDay(S, FLAG_CARD.promised),
    audited: !!fl.audited_aria, auditDay: cardDay(S, FLAG_CARD.audited),
    deleted: !!fl.deleted_logs, deletedDay: cardDay(S, FLAG_CARD.deleted),
    handover: !!fl.handover_policy, handoverDay: cardDay(S, FLAG_CARD.handover),
    confessed: !!fl.aria_confessed, confessDay: cardDay(S, FLAG_CARD.confessed),
    shut: !!fl.nullptr_shut,
    arc: r.arc || 0,
    affinity: r.affinity || 0,
    first: FIRST_LINE[firstLine(S).kind] || FIRST_LINE.comment,
  };
}

// Stable while it is being read and different tomorrow: `askAria` runs on a
// repaint about seven times a second, so this may not draw from the stream
// either. Where several lines are true on one day, the day picks.
export function betweenUs(S) {
  const c = betweenContext(S);
  const said = (b) => { try { return !!b.when(c); } catch { return false; } };
  // The entry marked `last` is the floor, not a competitor: a run with a
  // promise on file should never be told there is nothing between them.
  const live = BETWEEN_US.filter((b) => !b.last && said(b));
  const pool = live.length ? live : BETWEEN_US.filter((b) => b.last && said(b));
  if (!pool.length) return null;
  const b = pool[(c.day * 17) % pool.length];
  let text = '';
  try { text = String(b.text(c) || ''); } catch { return null; }
  return text ? { severity: 4, title: 'Between us', text, key: `between:${b.id}`, between: true } : null;
}

// ── Her own voice in the Wire ───────────────────────────────────────────────
// Sparingly, and never from `pick(S.agents)`: the roster's chatter is written
// in `src/data/feedlines.js` and signed by whichever agent drew it. This is
// her, by name, on three occasions and no others — the day after a hard
// choice, a Sunday nobody rang anybody, and the three days the run passes a
// number worth passing. One a week at most. The author is `ARIA` with no
// `via`; a line the world writes in her voice carries the mark instead.
//
// Called from the day hook, so the pool may be drawn from freely — but it is
// indexed by the day anyway, because that is one fewer draw between a deck
// change and a run that plays differently.
function cruelYesterday(S, day) {
  const j = (S?.narrative?.journal || [])[0];
  return !!j && j.tone === 'cruel' && Math.floor(j.day) === day - 1;
}

function missedSunday(S, day) {
  if (!isSunday(day)) return false;
  if (!S?.narrative?.relationships?.mom?.met) return false;
  const t = S?.founder?.life?.ties?.mom;
  const last = t && Number.isFinite(t.lastDay) ? Math.floor(t.lastDay) : null;
  return last == null || day - last >= WIRE.MOM_SILENT_DAYS;
}

export function ariaWire(S) {
  if (!S || S._forecast) return null;
  const day = Math.floor(S.time.day);
  const w = wireState(S);
  if (day - (w.ariaDay ?? -999) < WIRE.ARIA_EVERY_DAYS) return null;
  if (!(S.agents?.length || S.narrative?.relationships?.aria?.met)) return null;

  let pool = ARIA_WIRE.milestone[day] || null;
  let salt = 3;
  if (!pool && cruelYesterday(S, day)) { pool = ARIA_WIRE.cruel; salt = 7; }
  if (!pool && missedSunday(S, day)) { pool = ARIA_WIRE.sunday; salt = 11; }
  if (!pool?.length) return null;

  const text = freshText(S, pool, (day * 31 + salt) % pool.length);
  w.ariaDay = day;
  return pushFeed(S, { type: 'log', author: 'ARIA', text, tone: 'neutral' });
}

export const ARIA_COST = { focus: 3 };
