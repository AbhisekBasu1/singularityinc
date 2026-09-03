// ─────────────────────────────────────────────────────────────────────────────
// MOONSHOT — the lane with low odds and an absurd payoff, finally rolled.
//
// `computeLaneOutput` has always produced `out.moonshot` and nothing has ever
// read it. Once a day now: the chance is per creativity-weighted work unit,
// scaled by the `moonshotOdds` modifier (Frontier Division) and capped, and a
// hit is one of four things — a research burst, a compute grant, a wildcard
// feature, or a setback. Grants go through `computeGranted`, never the cap,
// because the loop rebuilds the cap from modifiers every tick.
// ─────────────────────────────────────────────────────────────────────────────
import { AGENTS } from '../data/balance.js';
import { MOONSHOTS } from '../data/moonshot.js';
import { FEATURE_KINDS } from '../data/products.js';
import { computeMods } from './modifiers.js';
import { shipFeature } from './product.js';
import { pushFeed } from './feed.js';
import { chance, weightedPick, pick } from '../engine/rng.js';
import { fmt } from '../engine/format.js';
import { emit } from '../engine/bus.js';

export function moonshotChance(S, work, m = computeMods(S)) {
  const MS = AGENTS.MOONSHOT;
  return Math.min(MS.CHANCE_CAP, Math.max(0, work) * MS.CHANCE_PER_WORK * (m.moonshotOdds || 1));
}

export function tickMoonshot(S, days, work, m = computeMods(S)) {
  if (!(work > 0)) return null;
  const MS = AGENTS.MOONSHOT;
  if (!chance(moonshotChance(S, work, m) * days)) return null;

  const kinds = Object.keys(MS.WEIGHTS);
  let kind = weightedPick(kinds, kinds.map((k) => MS.WEIGHTS[k]));
  const p = S.products.find((x) => x.id === S.activeProductId) || S.products[0];
  // A grant before compute exists, or a feature with nothing to ship it into,
  // is a result instead: the roll always lands as something you can see.
  if (kind === 'grant' && !S.unlocks.compute) kind = 'burst';
  if (kind === 'feature' && !p) kind = 'burst';

  let amount = 0, feature = '';
  if (kind === 'burst') {
    amount = Math.round(Math.max(MS.BURST_MIN, work * MS.BURST_PER_WORK));
    S.resources.research += amount;
  } else if (kind === 'grant') {
    amount = Math.round(Math.max(MS.GRANT_MIN, work * MS.GRANT_PER_WORK));
    S.resources.computeGranted = Math.max(0, (S.resources.computeGranted || 0) + amount);
  } else if (kind === 'feature') {
    const wild = FEATURE_KINDS.find((k) => k.id === 'wild') || FEATURE_KINDS[0];
    feature = shipFeature(S, p, { kind: wild }).name;
  } else {
    amount = Math.round(Math.max(MS.SETBACK_DEBT_MIN, work * MS.SETBACK_DEBT_PER_WORK));
    S.resources.techDebt += amount;
  }

  const lane = S.agents.filter((a) => a.status === 'active' && a.lane === 'moonshot');
  const agent = lane.length ? pick(lane) : null;
  const o = MOONSHOTS[kind];
  const text = pick(o.lines)
    .replace(/\{agent\}/g, agent?.name || 'The lab')
    .replace(/\{n\}/g, fmt(amount))
    .replace(/\{feature\}/g, feature);
  pushFeed(S, { type: 'research', author: 'MOONSHOT', tone: o.tone, text, meta: o.name });
  emit('moonshot', { kind, amount, agent, feature });
  return { kind, amount, feature };
}
