// ─────────────────────────────────────────────────────────────────────────────
// OBJECTIVES — the drumbeat. Always 1–3 live, always achievable, always
// pointing at the next thing the game wants to teach you.
// ─────────────────────────────────────────────────────────────────────────────
import { totalUsers, totalMrr } from '../systems/product.js';
import { activeProduct } from '../engine/state.js';
import { RESEARCH_MAP } from './research.js';
import { ACT_DEEDS, deedDoors } from '../systems/progression.js';
import { treeComplete } from '../systems/research.js';

const O = [];
const o = (id, title, hint, test, opts = {}) => O.push({ id, title, hint, test, ...opts });

// §A2. The deed that closes each act, as that act's last objective. The name,
// the sentence and the test all come from `ACT_DEEDS` rather than being typed
// again here — a number in prose should be read, not typed, and so should a
// requirement. Declared at the end of each act's block, which is where
// `activeObjectives` sorts it: last thing in the act, because it is.
//
// §A5. And `doors`, which is the same table read one level deeper: the two or
// three ways out of the act, each with how far along it is. An objective row
// that carries it renders a checklist rather than a sentence, so the founder
// can see which door is nearest instead of being told three of them exist.
const deed = (id, act, view) => {
  const d = ACT_DEEDS[act + 1];
  o(id, d.name, d.hint, (S) => d.test(S),
    { act, reward: { xp: 30 }, view, doors: (S) => deedDoors(S, act + 1) });
};

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
o('first_research', 'Start researching', 'A finished node is permanent. Cash, users and reputation all move back down.',
  (S) => S.stats.researchDone >= 1, { act: 1, reward: { xp: 10 }, view: 'research' });
o('first_agent', 'Hire your first agent', 'Stop being the bottleneck. Agents work while you sleep.',
  (S) => S.stats.agentsHired >= 1, { act: 1, reward: { xp: 20 }, view: 'agents' });
o('first_users_100', 'Get to 100 users', 'A hundred strangers chose your thing over doing nothing.',
  (S) => S.stats.peakUsers >= 100, { act: 1, reward: { xp: 15, rep: 8 } });
o('first_revenue', 'Earn a dollar', 'Turn on pricing. The first paying user tells you something the first thousand free ones do not.',
  (S) => S.stats.totalRevenue >= 1, { act: 1, reward: { xp: 18 }, view: 'product' });
o('mrr_1k', 'Reach $1,000 MRR', 'Ramen profitable. The most important threshold nobody celebrates.',
  (S) => totalMrr(S) >= 1000, { act: 1, reward: { xp: 25, cash: 500 } });
o('lane_assign', 'Assign an agent to a lane', 'Build, Growth, Research or Ops. Specialty match means full output.',
  (S) => S.agents.some((a) => a.laneDays > 3), { act: 1, reward: { xp: 8 }, view: 'agents' });

// ── Act II: the machine
o('three_agents', 'Run three agents at once', 'Three lanes running at once is the first day the company outpaces the founder.',
  (S) => S.agents.length >= 3, { act: 2, reward: { xp: 22 }, view: 'agents' });
o('debt_control', 'Get tech debt under 60', 'Assign an agent to Ops, or research the Engineering branch.',
  (S) => S.resources.techDebt < 60 && S.stats.featuresShipped > 8, { act: 2, reward: { xp: 20 } });
o('research_5', 'Complete five research nodes', 'Five is where the tree starts opening branches instead of one node at a time.',
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
deed('deed_act2', 2, 'market');

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
o('first_project', 'Break ground on a megaproject', 'A megaproject takes months and pays in compute and energy that nothing else supplies.',
  (S) => Object.keys(S.world.projectsBuilt || {}).length > 0 || (S.world.projectQueue || []).length > 0,
  { act: 3, reward: { xp: 40 }, view: 'world' });
o('beat_rival', 'Outlast or acquire a rival', 'There is more than one way to remove a competitor.',
  (S) => (S.stats.competitorsOutlasted || 0) >= 1 || S.stats.competitorsCrushed >= 1 || S.stats.acquisitions >= 1,
  { act: 3, reward: { xp: 30 }, view: 'market' });
o('research_25', 'Complete 25 research nodes', 'You are now ahead of people with a thousand employees.',
  (S) => S.stats.researchDone >= 25, { act: 3, reward: { xp: 35 } });
o('align_watch', 'Keep alignment above 0.55', 'Autonomy buys speed. It is not free.',
  (S) => S.resources.alignment >= 0.55, { act: 3, reward: { xp: 30 }, view: 'world' });
deed('deed_act3', 3, 'world');

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
o('opinion', 'Hold public approval above 55%', 'Approval decays regulatory heat and lowers what every other lever costs you.',
  (S) => S.world.publicOpinion >= 0.55, { act: 4, reward: { xp: 40 }, view: 'world' });
deed('deed_act4', 4, 'desk');

// ── Act V: ascension
o('pick_ending', 'Decide what all of this was for', 'The Ascension panel. There is no wrong answer, only yours.',
  (S) => !!S.ending, { act: 5, reward: { xp: 100 }, view: 'world' });
o('gdp_10', 'Mediate 10% of global GDP', 'At this point the word "company" is doing a lot of work.',
  (S) => S.world.globalGdpShare >= 0.10, { act: 5, reward: { xp: 70 }, view: 'world' });
o('trillion', 'Become a trillionaire', 'Personal net worth past thirteen figures.',
  (S) => S.company.valuation * S.company.equity.founder >= 1e12, { act: 5, reward: { xp: 90 } });
o('research_all', 'Finish the tech tree', 'Every branch, every tier, and every door you did not close.',
  (S) => treeComplete(S), { act: 5, reward: { xp: 100 }, view: 'research', optional: true });

// ── One each, for whoever is in the chair ───────────────────────────────────
// An optional `arch` field. `systems/objectives.js` filters on it, so a Hustler
// never sees the Hacker's goal and a Ghost's is never quietly completed by
// somebody else. Each is the thing that archetype is *for*, stated as a number
// the founder can aim at: the modifier table says the Hustler prices rounds
// better, and this says what that is worth doing with.
//
// All seven are `optional`, on purpose. Six of them are windows — before a
// launch, before a second agent, before a hundred users — and a window that has
// closed can never be ticked. Optional sorts last in `activeObjectives`, so a
// missed one waits behind the drumbeat instead of standing in front of it.
// The rewards are small for the same reason: this is a way of playing, not a
// tax on not playing that way.
o('arch_hustler_mrr', 'Reach $1,000 MRR before 100 users', 'Distribution first. Charge the ones you have.',
  (S) => totalMrr(S) >= 1000 && S.stats.peakUsers < 100,
  { act: 1, arch: 'hustler', reward: { xp: 20, cash: 800 }, optional: true, view: 'product' });
o('arch_researcher_tier3', 'Reach tier 3 research before you launch', 'Go deep first. The market will still be there.',
  (S) => S.stats.productsLaunched === 0
    && Object.keys(S.research.done || {}).some((id) => (RESEARCH_MAP[id]?.tier || 1) >= 3),
  { act: 1, arch: 'researcher', reward: { xp: 20, research: 60 }, optional: true, view: 'research' });
o('arch_hacker_ten', 'Ship ten features before a second agent', 'Out-build the roster you have not hired yet.',
  (S) => S.stats.featuresShipped >= 10 && (S.stats.agentsHired || 0) < 2,
  { act: 1, arch: 'hacker', reward: { xp: 20, insight: 10 }, optional: true, view: 'desk' });
o('arch_designer_polish', 'Polish above 0.7 before a second product', 'Finish one thing before you start another.',
  (S) => { const p = activeProduct(S); return !!p && (p.polish || 0) >= 0.7 && S.products.length < 2; },
  { act: 2, arch: 'designer', reward: { xp: 24, rep: 15 }, optional: true, view: 'product' });
o('arch_operator_clean', 'A hundred days without an incident', 'Survive one, then never have another.',
  (S) => (S.stats.incidents || 0) >= 1 && S.time.day - (S.stats.lastIncidentDay ?? 0) >= 100,
  { act: 2, arch: 'operator', reward: { xp: 24, cash: 3000 }, optional: true, view: 'agents' });
o('arch_prophet_milestones', 'A milestone in each of your first three months',
  'Make something happen every month, and be there when it does.',
  (S) => [0, 30, 60].every((from) => (S.narrative?.journal || [])
    .some((j) => j.kind === 'milestone' && j.day >= from && j.day < from + 30)),
  { act: 1, arch: 'prophet', reward: { xp: 24, rep: 20 }, optional: true, view: 'story' });
o('arch_ghost_quiet', 'Reach $100K MRR under 50 reputation', 'Be large and be nobody.',
  (S) => totalMrr(S) >= 1e5 && S.resources.reputation < 50,
  { act: 3, arch: 'ghost', reward: { xp: 30, cash: 12000 }, optional: true });

export const OBJECTIVES = O;
export const OBJECTIVE_MAP = Object.fromEntries(O.map((x) => [x.id, x]));
