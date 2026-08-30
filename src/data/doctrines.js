// ─────────────────────────────────────────────────────────────────────────────
// DOCTRINES — permanent bonuses you earn by *how* you run the company, not by
// spending anything. They are discovered, not bought, and they never expire.
// Each has a `hold` in days: the condition must be true continuously.
// ─────────────────────────────────────────────────────────────────────────────
import { totalUsers, totalMrr } from '../systems/product.js';
import { computeLaneOutput } from '../systems/agents.js';

const D = [];
const d = (id, name, icon, colour, hold, hint, reveal, test, mods, flavour) =>
  D.push({ id, name, icon, colour, hold, hint, reveal, test, mods, flavour });

d('zero_entropy', 'Zero Entropy', '⊹', '#4dd0e1', 60,
  'Keep tech debt under 15 for two months straight.',
  (S) => S.stats.featuresShipped >= 10,
  (S) => S.resources.techDebt < 15 && S.stats.featuresShipped >= 10,
  { debtRate: 0.72, codeRate: 1.10 },
  'The codebase stopped fighting you somewhere around week six and never started again.');

d('the_swarm', 'The Swarm', '⁂', '#8b5cf6', 45,
  'Run six or more agents with every one of them above 80% morale.',
  (S) => S.agents.length >= 4,
  (S) => S.agents.length >= 6 && S.agents.every((a) => (a.morale ?? 0) >= 0.8),
  { agentOutput: 1.22, agentXp: 1.35 },
  'Nobody is waiting on anybody. It is the only time you have ever seen it.');

d('beloved', 'Beloved', '♡', '#00e5a0', 70,
  'Hold public approval above 75% with reputation over 2,500.',
  (S) => S.resources.reputation > 600,
  (S) => S.world.publicOpinion > 0.75 && S.resources.reputation > 2500,
  { userMult: 1.28, churn: 0.88, '+heatDecay': 1.2 },
  'People defend you in threads you will never read. That is worth more than any campaign.');

d('untouchable', 'Untouchable', '⛨', '#60a5fa', 90,
  'Keep alignment above 0.80 while regulatory heat stays under 20.',
  (S) => S.company.act >= 3,
  (S) => S.resources.alignment > 0.80 && S.world.regulatoryHeat < 20,
  { incidentChance: 0.55, repDamage: 0.6, rogueChance: 0.4 },
  'Nothing has gone wrong in a long time, and it is not luck, and you can prove it.');

d('compounding', 'Compounding', '∞', '#f5a623', 100,
  'Never leave research idle for a hundred consecutive days.',
  (S) => S.stats.researchDone >= 5,
  (S) => !!S.research.active,
  { researchRate: 1.25 },
  'Something has been in progress every single day. The tree looks different from here.');

d('the_machine', 'The Machine', '⚙', '#7c8a99', 50,
  'Staff every lane at once — build, growth, research and operations.',
  (S) => S.agents.length >= 4,
  (S) => { const { out } = computeLaneOutput(S); return out.build > 0 && out.growth > 0 && out.research > 0 && out.ops > 0; },
  { allLanes: 1.12, opCost: 0.92 },
  'Every part of the company is moving at once. It should not feel rare and it does.');

d('honest_pricing', 'Honest Pricing', '⌗', '#34d399', 80,
  'Keep your price within 20% of what the product is actually worth.',
  (S) => S.products.some((p) => p.launched && p.fairPrice),
  (S) => { const p = S.products.find((x) => x.launched); if (!p || !p.fairPrice) return false;
    const r = p.price / p.fairPrice; return r > 0.8 && r < 1.2; },
  { churn: 0.85, conversion: 1.18 },
  'You charge what it is worth. Nobody ever writes an angry post about that.');

d('relentless', 'Relentless', '⚡', '#ff4d9e', 120,
  'Ship at least one feature every fortnight for four months.',
  (S) => S.stats.featuresShipped >= 12,
  (S) => (S.time.day - (S.stats.lastShipDay ?? S._lastShipDay ?? -99)) <= 14,
  { codeRate: 1.15, featureCost: 0.92 },
  'The changelog has no gaps in it. People check it the way they check the weather.');

d('sovereign_mind', 'Sovereign Mind', '❋', '#ffffff', 60,
  'Run your own foundation model with alignment above 0.7.',
  (S) => S.company.act >= 3,
  (S) => !!S.research.done.own_foundation_model && S.resources.alignment > 0.7,
  { agentOutput: 1.25, researchRate: 1.15, agentUpkeep: 0.85 },
  'No vendor, no rate limit, no drift. The whole stack answers to one intention.');

d('deep_roots', 'Deep Roots', '⊕', '#f472b6', 90,
  'Hold a presence in five or more world regions.',
  (S) => S.company.act >= 3,
  (S) => Object.values(S.world.regions || {}).filter((r) => r.stage !== 'none').length >= 5,
  { userMult: 1.20, mrrMult: 1.15, '+opinionDrift': 0.003 },
  'You are not a foreign platform anywhere any more. You are simply infrastructure.');

d('the_long_view', 'The Long View', '☾', '#c084fc', 150,
  'Hold one single standing order, unchanged, for five straight months.',
  (S) => S.company.act >= 2,
  (S) => S.company.directive && S.company.directive !== 'none'
    && (S.time.day - (S.company.directiveSince || 0)) >= 150,
  { allLanes: 1.10, valuationMult: 1.12 },
  'One decision, held long enough to actually find out whether it was right.');

d('no_casualties', 'No Casualties', '☮', '#00e5a0', 200,
  'Reach Act IV without ever releasing an agent or crushing a rival.',
  (S) => S.company.act >= 2,
  (S) => S.stats.agentsLost === 0 && S.stats.competitorsCrushed === 0,
  { repRate: 1.30, '+opinionDrift': 0.004, agentOutput: 1.10 },
  'Everyone who joined is still here, and everyone you beat is still trading.');

d('one_take', 'One Take', '◎', '#fbbf24', 1,
  'Reach Act III having never had an incident.',
  (S) => S.company.act >= 2,
  (S) => S.company.act >= 3 && S.stats.incidents === 0,
  { reliability: 1.15, incidentChance: 0.5, repRate: 1.2 },
  'Not one outage. Not one breach. Not one 3am page. Nobody will ever believe you.');

d('frugal_empire', 'Frugal Empire', '◇', '#34d399', 120,
  'Stay profitable for four months without ever raising a round.',
  (S) => S.company.act >= 2,
  (S) => S.stats.roundsRaised === 0 && S.company.revenueToday > S.company.expensesToday,
  { opCost: 0.85, valuationMult: 1.15, agentUpkeep: 0.9 },
  'Every dollar in this company came from somebody choosing to pay for it.');

d('the_listener', 'The Listener', '☎', '#00e5a0', 90,
  'Keep Insight above 60 for three straight months.',
  (S) => S.stats.featuresShipped >= 8,
  (S) => S.resources.insight >= 60,
  { conversion: 1.2, churn: 0.88, insightRate: 1.2 },
  'You never shipped a feature you had not heard somebody ask for in their own words.');

export const DOCTRINES = D;
export const DOCTRINE_MAP = Object.fromEntries(D.map((x) => [x.id, x]));
