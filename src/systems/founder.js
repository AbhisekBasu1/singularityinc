// ─────────────────────────────────────────────────────────────────────────────
// FOUNDER — your finite, precious attention. The core Act I resource.
// ─────────────────────────────────────────────────────────────────────────────
import { FOUNDER, CODE } from '../data/balance.js';
import { computeMods, markDirty } from './modifiers.js';
import { clamp, soften } from '../engine/format.js';
import { rand, chance } from '../engine/rng.js';
import { emit } from '../engine/bus.js';
import { APPROACHES, APPROACH_MAP, shiftedBands } from '../data/approaches.js';
import { computeLaneOutput } from './agents.js';   // agents.js does not import this file

export const ALLOCATIONS = [
  { id: 'build', name: 'Build', icon: '⌘', color: '#4dd0e1',
    desc: 'Write code. Ship features. The only thing that definitely matters.' },
  { id: 'users', name: 'Users', icon: '☎', color: '#00e5a0',
    desc: 'Talk to people who use it. Generates Insight — the difference between building and guessing.' },
  { id: 'growth', name: 'Growth', icon: '↗', color: '#f5a623',
    desc: 'Post, pitch, ship changelogs, be visible. Awareness and Reputation.' },
  { id: 'learn', name: 'Learn', icon: '⌬', color: '#8b5cf6',
    desc: 'Read papers, run experiments, go deep. Research points.' },
  { id: 'rest', name: 'Rest', icon: '☾', color: '#7c8a99',
    desc: 'Sleep, eat, see a person. Restores Focus. You will resent every hour of it.' },
];

export function focusMultiplier(S) {
  const f = S.founder.focus / Math.max(1, S.founder.focusMax);
  return 0.45 + clamp(f, 0, 1) * 0.55;
}

export function normalizeAllocation(a) {
  const keys = ALLOCATIONS.map((x) => x.id);
  let sum = 0;
  for (const k of keys) { a[k] = Math.max(0, a[k] || 0); sum += a[k]; }
  if (sum <= 0) { a.build = 1; return a; }
  for (const k of keys) a[k] = a[k] / sum;
  return a;
}

export function setAllocation(S, key, value) {
  const a = S.founder.allocation;
  const keys = ALLOCATIONS.map((x) => x.id);
  const others = keys.filter((k) => k !== key);
  const v = clamp(value, 0, 1);
  const restTotal = 1 - v;
  const otherSum = others.reduce((s, k) => s + a[k], 0);
  a[key] = v;
  if (otherSum <= 0) { const each = restTotal / others.length; others.forEach((k) => (a[k] = each)); }
  else others.forEach((k) => (a[k] = a[k] / otherSum * restTotal));
  markDirty();
  return a;
}

// Per-day founder contribution
export function founderOutput(S, m = computeMods(S)) {
  const a = S.founder.allocation;
  const fm = focusMultiplier(S);
  const sk = S.founder.skills;
  const hours = FOUNDER.MAX_HOURS;
  return {
    code: a.build * hours * (0.42 + sk.engineering * 0.20) * m.codeRate * fm,
    insight: a.users * hours * (0.16 + sk.growth * 0.055 + sk.vision * 0.03) * m.insightRate * fm,
    awareness: a.growth * hours * (0.55 + sk.growth * 0.28) * fm,
    reputation: a.growth * hours * (0.055 + sk.vision * 0.028) * m.repRate * fm,
    research: 0, // handled in research system via allocation
    focusDelta: (a.rest * FOUNDER.FOCUS_REGEN_PER_DAY * FOUNDER.REST_REGEN_MULT * m.focusRegen)
              - ((1 - a.rest) * 38 * (1 + S.company.act * 0.06)),
  };
}

export function tickFounder(S, days, m = computeMods(S)) {
  const o = founderOutput(S, m);
  S.founder.focusMax = FOUNDER.START_FOCUS + m['+focusMax'];
  S.founder.focus = clamp(S.founder.focus + o.focusDelta * days, 0, S.founder.focusMax);

  if (!m.noBurnout) {
    if (S.founder.focus < FOUNDER.BURNOUT_THRESHOLD) {
      S.founder.burnout = clamp(S.founder.burnout + 4.5 * days, 0, 100);
      if (S.founder.burnout > 45 && chance(0.02 * days)) emit('founder:burnout', {});
    } else {
      S.founder.burnout = Math.max(0, S.founder.burnout - 2.4 * days);
    }
    // The body stops asking. Forced recovery: the schedule reorganises itself.
    if (S.founder.burnout >= 100 && !S.founder.recovering) {
      S.founder.recovering = true;
      S.founder.preRecovery = { ...S.founder.allocation };
      S.founder.allocation = { build: 0.05, users: 0.05, growth: 0.02, learn: 0.08, rest: 0.80 };
      markDirty();
      emit('founder:collapse', {});
    }
    if (S.founder.recovering && S.founder.burnout <= 10 && S.founder.focus > S.founder.focusMax * 0.7) {
      S.founder.recovering = false;
      if (S.founder.preRecovery) { S.founder.allocation = S.founder.preRecovery; S.founder.preRecovery = null; }
      markDirty();
      emit('founder:recovered', {});
    }
  } else { S.founder.burnout = 0; S.founder.recovering = false; }
  return o;
}

export function gainXp(S, amount) {
  S.founder.xp += amount;
  let leveled = 0;
  while (S.founder.xp >= FOUNDER.XP_PER_LEVEL(S.founder.level)) {
    S.founder.xp -= FOUNDER.XP_PER_LEVEL(S.founder.level);
    S.founder.level++;
    S.founder.skillPoints += 1;
    leveled++;
  }
  if (leveled) { markDirty(); emit('founder:level', { level: S.founder.level, gained: leveled }); }
  return leveled;
}

export function spendSkillPoint(S, skill) {
  if (S.founder.skillPoints <= 0) return false;
  if (S.founder.skills[skill] >= FOUNDER.SKILL_CAP) return false;
  S.founder.skillPoints--;
  S.founder.skills[skill]++;
  markDirty();
  emit('founder:skill', { skill });
  return true;
}

// ── Direct actions (the clicker layer, at every scale) ──────────────────────
// A click has to stay meaningful. Measured before this floor existed, one full
// focus bar was worth 2900% of a day of company build output in Act II and 8.8%
// of one in Act V, so the founder's own hands became decoration precisely when
// the company became enormous. The floor pins a full bar to a fixed share of a
// day; the approach bands still multiply on top, so a brilliant prompt is still
// brilliant and a hallucinated one is still a waste.
//
// Deliberately not applied to the debt term: scaling debt the same way would
// turn late-game prompting into a bomb rather than a decision.
function directFloor(S, m, focusSpent) {
  const dayBuild = computeLaneOutput(S, m).out.build * CODE.AGENT_CODE_MULT;
  if (!(dayBuild > 0)) return 0;
  return dayBuild * FOUNDER.DIRECT_DAY_SHARE * (focusSpent / Math.max(1, S.founder.focusMax));
}

export function actionWriteCode(S, m = computeMods(S)) {
  if (S.founder.focus < CODE.MANUAL_FOCUS_COST) return { ok: false, reason: 'focus' };
  const raw = CODE.MANUAL_PER_CLICK * (0.8 + S.founder.skills.engineering * 0.42)
            * m.codeRate * focusMultiplier(S);
  const amt = Math.max(raw, directFloor(S, m, CODE.MANUAL_FOCUS_COST));
  S.founder.focus -= CODE.MANUAL_FOCUS_COST;
  S.resources.code += amt;
  S.stats.linesManual += amt;
  S.stats.clicks++;
  gainXp(S, 0.55);
  return { ok: true, amount: amt };
}

export function currentApproach(S) {
  return APPROACH_MAP[S.founder.approach || 'describe'] || APPROACH_MAP.describe;
}

export function approachAvailable(S, a) {
  return !a.req || !!S.research.done[a.req];
}

export function availableApproaches(S) {
  return APPROACHES.filter((a) => approachAvailable(S, a));
}

export function promptCost(S, m = computeMods(S), approach = currentApproach(S)) {
  return {
    focus: approach.focus,
    cash: CODE.PROMPT_CASH_COST * approach.cashMult * (1 + S.founder.skills.prompting * 0.10),
    insight: approach.insight || 0,
  };
}

export function actionPromptAI(S, m = computeMods(S)) {
  const approach = currentApproach(S);
  const c = promptCost(S, m, approach);
  if (S.founder.focus < c.focus) return { ok: false, reason: 'focus' };
  if (S.company.cash < c.cash) return { ok: false, reason: 'cash' };
  if (c.insight && S.resources.insight < c.insight) return { ok: false, reason: 'insight' };
  S.founder.focus -= c.focus;
  S.company.cash -= c.cash;
  if (c.insight) S.resources.insight -= c.insight;

  const skill = S.founder.skills[approach.scales] || 1;
  const base = CODE.PROMPT_BASE_OUTPUT * m.promptOutput * m.codeRate;

  // Draw a band from the approach's distribution, shifted by the relevant skill.
  const bands = shiftedBands(approach, skill);
  let r = rand(), band = bands[bands.length - 1];
  for (const b of bands) { if (r < b.p) { band = b; break; } r -= b.p; }

  let amount = base * band.out * (0.9 + rand() * 0.2);
  let debt = CODE.PROMPT_DEBT * band.debt;
  amount *= focusMultiplier(S);
  amount = Math.max(amount, directFloor(S, m, c.focus) * band.out);
  debt *= m.debtRate;

  S.resources.code += amount;
  S.resources.techDebt += debt;
  S.stats.promptsWritten++;
  S.stats.clicks++;
  S.stats.approachUse = S.stats.approachUse || {};
  S.stats.approachUse[approach.id] = (S.stats.approachUse[approach.id] || 0) + 1;

  // Approach-specific side effects.
  let extra = null;
  if (approach.fitBonus) {
    S.founder.fitCredit = (S.founder.fitCredit || 0) + approach.fitBonus;
  }
  if (approach.breakthrough && chance(approach.breakthrough)) {
    const amt = 5 + S.company.act * 6;
    S.resources.research += amt;
    extra = { type: 'breakthrough', amount: amt };
  }
  if (approach.skillChance && chance(approach.skillChance)) {
    const k = approach.scales;
    if (S.founder.skills[k] < FOUNDER.SKILL_CAP) {
      S.founder.skills[k]++;
      markDirty();
      extra = { type: 'skill', skill: k };
    }
  }
  gainXp(S, 1.15 * (approach.xpMult || 1));
  emit('action:prompt', { kind: band.kind, amount, debt, approach: approach.id, extra });
  return { ok: true, amount, debt, kind: band.kind, approach, extra };
}

export function setApproach(S, id) {
  const a = APPROACH_MAP[id];
  if (!a || !approachAvailable(S, a)) return false;
  S.founder.approach = id;
  return true;
}

export function actionTalkToUsers(S, m = computeMods(S)) {
  const cost = 4.5;
  if (S.founder.focus < cost) return { ok: false, reason: 'focus' };
  S.founder.focus -= cost;
  const amt = (2.2 + S.founder.skills.growth * 0.6) * m.insightRate * focusMultiplier(S) * (0.7 + rand() * 0.7);
  S.resources.insight += amt;
  S.resources.reputation += 0.5;
  S.stats.clicks++;
  gainXp(S, 0.8);
  emit('action:users', { amount: amt });
  return { ok: true, amount: amt };
}

export function actionPost(S, m = computeMods(S)) {
  const cost = 3.2;
  if (S.founder.focus < cost) return { ok: false, reason: 'focus' };
  S.founder.focus -= cost;
  const skill = S.founder.skills.vision + S.founder.skills.growth;
  const roll = rand();
  const viral = roll < clamp(0.045 + skill * 0.008 + S.resources.reputation / 4000, 0, 0.30);
  const rep = (viral ? 22 : 1.4) * m.repRate * (0.6 + rand() * 0.9);
  S.resources.reputation += rep;
  const p = S.products.find((x) => x.id === S.activeProductId);
  if (p) p.awareness += viral ? 240 : 12;
  if (viral) S.stats.viralHits++;
  S.stats.clicks++;
  gainXp(S, viral ? 3 : 0.6);
  emit('action:post', { viral, rep });
  return { ok: true, viral, rep };
}
