// ─────────────────────────────────────────────────────────────────────────────
// OBJECTIVES — the drumbeat. Always 1–3 live, always achievable, always
// pointing at the next thing the game wants to teach you.
// ─────────────────────────────────────────────────────────────────────────────
import { totalUsers, totalMrr } from '../systems/product.js';
import { activeProduct } from '../engine/state.js';

const O = [];
const o = (id, title, hint, test, opts = {}) => O.push({ id, title, hint, test, ...opts });

// ── Act I: the garage
o('first_code', 'Write some code', 'Press Q or click Write Code. Nothing exists until you make it.',
  (S) => S.resources.code > 0 || S.stats.featuresShipped > 0, { act: 1, reward: { xp: 4 }, view: 'desk' });
o('first_prompt', 'Delegate to the machine', 'Press W. It costs money and focus. It is worth both.',
  (S) => S.stats.promptsWritten >= 1, { act: 1, reward: { xp: 6 }, view: 'desk' });
o('ship_first', 'Ship your first feature', 'Accumulate enough Code, then ship. Features are what users actually get.',
  (S) => S.stats.featuresShipped >= 1, { act: 1, reward: { xp: 12, insight: 5 }, view: 'desk' });
o('talk_users', 'Talk to three users', 'Insight decides whether the next feature is the right one.',
  (S) => S.resources.insight >= 12, { act: 1, reward: { xp: 8 }, view: 'desk' });
o('ship_three', 'Ship three features', 'One feature is a demo. Three is a product.',
  (S) => S.stats.featuresShipped >= 3, { act: 1, reward: { xp: 14 }, view: 'desk' });
o('launch', 'Launch it', 'Quality and polish decide how hard it lands. It only happens once.',
  (S) => S.stats.productsLaunched >= 1, { act: 1, reward: { xp: 25, rep: 10 }, view: 'product' });
o('first_research', 'Start researching', 'Capability compounds. Everything else is temporary.',
  (S) => S.stats.researchDone >= 1, { act: 1, reward: { xp: 10 }, view: 'research' });
o('first_agent', 'Hire your first agent', 'Stop being the bottleneck. Agents work while you sleep.',
  (S) => S.stats.agentsHired >= 1, { act: 1, reward: { xp: 20 }, view: 'agents' });
o('first_users_100', 'Get to 100 users', 'A hundred strangers chose your thing over doing nothing.',
  (S) => S.stats.peakUsers >= 100, { act: 1, reward: { xp: 15, rep: 8 } });
o('first_revenue', 'Earn a dollar', 'Turn on pricing. "We\'ll monetize later" has killed more companies than fraud.',
  (S) => S.stats.totalRevenue >= 1, { act: 1, reward: { xp: 18 }, view: 'product' });
o('mrr_1k', 'Reach $1,000 MRR', 'Ramen profitable. The most important threshold nobody celebrates.',
  (S) => totalMrr(S) >= 1000, { act: 1, reward: { xp: 25, cash: 500 } });
o('lane_assign', 'Assign an agent to a lane', 'Build, Growth, Research or Ops. Specialty match means full output.',
  (S) => S.agents.some((a) => a.laneDays > 3), { act: 1, reward: { xp: 8 }, view: 'agents' });

// ── Act II: the machine
o('three_agents', 'Run three agents at once', 'A company is a throughput machine. Build the machine.',
  (S) => S.agents.length >= 3, { act: 2, reward: { xp: 22 }, view: 'agents' });
o('debt_control', 'Get tech debt under 60', 'Assign an agent to Ops, or research the Engineering branch.',
  (S) => S.resources.techDebt < 60 && S.stats.featuresShipped > 8, { act: 2, reward: { xp: 20 } });
o('research_5', 'Complete five research nodes', 'The tree is the game.',
  (S) => S.stats.researchDone >= 5, { act: 2, reward: { xp: 20 } });
o('upgrade_model', 'Upgrade an agent\'s model', 'Model tier is the single biggest lever on output.',
  (S) => S.agents.some((a) => a.model !== 'nano'), { act: 2, reward: { xp: 18 }, view: 'agents' });
o('price_it', 'Set a pricing model', 'Free, freemium, subscription, usage or enterprise. Each is a different company.',
  (S) => { const p = activeProduct(S); return p && p.pricing !== 'sub'; },
  { act: 2, reward: { xp: 15 }, view: 'product', optional: true });
o('users_10k', 'Reach 10,000 users', 'Ten thousand. That is a stadium.',
  (S) => S.stats.peakUsers >= 1e4, { act: 2, reward: { xp: 30, rep: 20 } });
o('mrr_25k', 'Reach $25,000 MRR', 'You could pay a person now. You are not going to.',
  (S) => totalMrr(S) >= 25000, { act: 2, reward: { xp: 30 } });
o('agent_tool', 'Install a tool on an agent', 'Tools multiply an agent for the rest of its life.',
  (S) => S.agents.some((a) => a.tools?.length), { act: 2, reward: { xp: 18 }, view: 'agents' });
o('survive_incident', 'Survive an incident', 'Reliability is a feature. You will learn this the hard way.',
  (S) => S.stats.incidents >= 1, { act: 2, reward: { xp: 12 } });

// ── Act III: the empire
o('arr_1m', 'Reach $1M ARR', 'Seven figures, one employee.',
  (S) => totalMrr(S) * 12 >= 1e6, { act: 3, reward: { xp: 40 } });
o('compute', 'Stand up private compute', 'Research the Infrastructure branch. Compute is destiny.',
  (S) => S.resources.computeCap > 0, { act: 3, reward: { xp: 35 }, view: 'research' });
o('second_product', 'Start a second product line', 'A different category cross-sells, sticks, and launches harder.',
  (S) => S.products.length >= 2, { act: 3, reward: { xp: 35 }, view: 'product' });
o('suite', 'Build a suite', 'Three products in three categories. Customers who buy two rarely leave.',
  (S) => new Set(S.products.filter((p) => p.launched).map((p) => p.category)).size >= 3,
  { act: 4, reward: { xp: 60 }, view: 'product', optional: true });
o('first_project', 'Break ground on a megaproject', 'Cash is only useful when it becomes capability.',
  (S) => Object.keys(S.world.projectsBuilt || {}).length > 0 || (S.world.projectQueue || []).length > 0,
  { act: 3, reward: { xp: 40 }, view: 'world' });
o('beat_rival', 'Outlast or acquire a rival', 'There is more than one way to remove a competitor.',
  (S) => S.stats.competitorsCrushed >= 1 || S.stats.acquisitions >= 1, { act: 3, reward: { xp: 30 }, view: 'market' });
o('research_25', 'Complete 25 research nodes', 'You are now ahead of people with a thousand employees.',
  (S) => S.stats.researchDone >= 25, { act: 3, reward: { xp: 35 } });
o('align_watch', 'Keep alignment above 0.55', 'Autonomy buys speed. It is not free.',
  (S) => S.resources.alignment >= 0.55, { act: 3, reward: { xp: 30 }, view: 'world' });

// ── Act IV: the singularity
o('own_model', 'Train your own foundation model', 'No vendor. No rate limits. No one to ask.',
  (S) => !!S.research.done.own_foundation_model, { act: 4, reward: { xp: 60 }, view: 'research' });
o('gdp_1', 'Mediate 1% of global GDP', 'A percent of everything.',
  (S) => S.world.globalGdpShare >= 0.01, { act: 4, reward: { xp: 50 }, view: 'world' });
o('projects_3', 'Complete three megaprojects', 'Turn the balance sheet into physical reality.',
  (S) => Object.values(S.world.projectsBuilt || {}).reduce((a, b) => a + b, 0) >= 3,
  { act: 4, reward: { xp: 50 }, view: 'world' });
o('rsi', 'Achieve recursive self-improvement', 'Version n trains version n+1. You approve the first three.',
  (S) => !!S.research.done.recursive_self_improvement, { act: 4, reward: { xp: 80 }, view: 'research' });
o('opinion', 'Hold public approval above 55%', 'Legitimacy is cheaper than security.',
  (S) => S.world.publicOpinion >= 0.55, { act: 4, reward: { xp: 40 }, view: 'world' });

// ── Act V: ascension
o('pick_ending', 'Decide what all of this was for', 'The Ascension panel. There is no wrong answer, only yours.',
  (S) => !!S.ending, { act: 5, reward: { xp: 100 }, view: 'world' });
o('gdp_10', 'Mediate 10% of global GDP', 'At this point the word "company" is doing a lot of work.',
  (S) => S.world.globalGdpShare >= 0.10, { act: 5, reward: { xp: 70 }, view: 'world' });
o('trillion', 'Become a trillionaire', 'Personal net worth past thirteen figures.',
  (S) => S.company.valuation * S.company.equity.founder >= 1e12, { act: 5, reward: { xp: 90 } });
o('research_all', 'Finish the tech tree', 'Every branch. Every tier. Nothing left that has a name.',
  (S) => S.stats.researchDone >= 85, { act: 5, reward: { xp: 100 }, view: 'research', optional: true });

export const OBJECTIVES = O;
export const OBJECTIVE_MAP = Object.fromEntries(O.map((x) => [x.id, x]));
