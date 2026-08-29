// ─────────────────────────────────────────────────────────────────────────────
// ACHIEVEMENTS — 90 of them. Some are milestones. Some are jokes. Some hurt.
// ─────────────────────────────────────────────────────────────────────────────
import { totalUsers, totalMrr } from '../systems/product.js';

const A = [];
const a = (id, name, desc, check, opts = {}) => A.push({ id, name, desc, check, ...opts });

// ── The world, played
// Only reachable with an assistant at the table. They are ordinary
// achievements: nothing here is gated on the browser, only on what happened.
const wa = (S) => S.world?.author?.stats || {};
a('world_first_card', 'Written By The World', 'Have your assistant put a card in front of you.',
  (S) => (wa(S).cards || 0) >= 1, { icon: '✎' });
a('world_own_words', 'In Your Own Words', 'Answer a card in your own words, and accept what the world made of it.',
  (S) => (wa(S).ownWords || 0) >= 1, { icon: '❝', legacy: 'prophet' });
a('world_refused', 'The Rules Held', 'Watch the world try something the rules would not allow.',
  (S) => (wa(S).refused || 0) >= 1, { icon: '⛨' });
a('world_immunity', 'Out Of Its Hands', 'Earn a doctrine that takes a tool away from the world for good.',
  (S) => (wa(S).revokedByDoctrine || 0) >= 1, { icon: '⊘' });
a('world_muted', 'Pulled The Plug', 'Mute the world, and keep playing anyway.',
  (S) => (wa(S).muted || 0) >= 1, { icon: '⏻' });
a('world_ten', 'A Season Of It', 'Let the world write ten cards in one run.',
  (S) => (wa(S).cards || 0) >= 10, { icon: '◈' });

// ── Beginnings
a('first_line', 'Hello, World', 'Write your first line of code.', (S) => S.stats.linesManual > 0, { icon: '⌘' });
a('first_prompt', 'Please And Thank You', 'Send your first prompt to an AI.', (S) => S.stats.promptsWritten >= 1, { icon: '⌬' });
a('first_feature', 'It Does Something', 'Ship your first feature.', (S) => S.stats.featuresShipped >= 1, { icon: '◈' });
a('first_launch', 'Live', 'Launch a product.', (S) => S.stats.productsLaunched >= 1, { icon: '↗' });
a('first_user', 'User #1', 'Acquire your first user.', (S) => S.stats.peakUsers >= 1, { icon: '☼' });
a('first_dollar', 'The First Dollar', 'Earn your first dollar of revenue.', (S) => S.stats.totalRevenue >= 1, { icon: '$' });
a('first_agent', 'Delegation', 'Hire your first AI agent.', (S) => S.stats.agentsHired >= 1, { icon: '◉' });
a('first_research', 'Learning', 'Complete your first research node.', (S) => S.stats.researchDone >= 1, { icon: '⌬' });

// ── Revenue ladder
a('mrr_100', 'Ramen Adjacent', 'Reach $100 MRR.', (S) => totalMrr(S) >= 100, { icon: '$' });
a('mrr_1k', 'Ramen Profitable', 'Reach $1,000 MRR.', (S) => totalMrr(S) >= 1000, { icon: '$' });
a('mrr_10k', 'Rent Covered', 'Reach $10,000 MRR.', (S) => totalMrr(S) >= 1e4, { icon: '$' });
a('first_million', 'Seven Figures', 'Reach $1M ARR.', (S) => totalMrr(S) * 12 >= 1e6, { icon: '⌗', legacy: 'hustler' });
a('arr_10m', 'Eight Figures', 'Reach $10M ARR.', (S) => totalMrr(S) * 12 >= 1e7, { icon: '⌗' });
a('arr_100m', 'Nine Figures', 'Reach $100M ARR.', (S) => totalMrr(S) * 12 >= 1e8, { icon: '⌗' });
a('arr_1b', 'Ten Figures', 'Reach $1B ARR.', (S) => totalMrr(S) * 12 >= 1e9, { icon: '⌗' });
a('arr_1t', 'Thirteen Figures', 'Reach $1T ARR. Yes, really.', (S) => totalMrr(S) * 12 >= 1e12, { icon: '✦', rare: true });

// ── Valuation
a('val_1m', 'On Paper', 'Reach a $1M valuation.', (S) => S.company.valuation >= 1e6, { icon: '▲' });
a('val_100m', 'Centaur', 'Reach a $100M valuation.', (S) => S.company.valuation >= 1e8, { icon: '▲' });
a('unicorn', 'Unicorn', 'Reach a $1B valuation. Alone.', (S) => S.company.valuation >= 1e9, { icon: '✦' });
a('decacorn', 'Decacorn', 'Reach a $10B valuation.', (S) => S.company.valuation >= 1e10, { icon: '✦' });
a('hectocorn', 'Hectocorn', 'Reach a $100B valuation.', (S) => S.company.valuation >= 1e11, { icon: '✦' });
a('trillion', 'Trillionaire', 'Personal net worth over $1T.', (S) => S.company.valuation * S.company.equity.founder >= 1e12, { icon: '♛', rare: true });
a('ten_trillion', 'Beyond Currency', 'Personal net worth over $10T.', (S) => S.company.valuation * S.company.equity.founder >= 1e13, { icon: '♛', rare: true });

// ── Users
a('users_100', 'A Hundred People', 'Reach 100 users.', (S) => S.stats.peakUsers >= 100, { icon: '☼' });
a('users_10k', 'Ten Thousand', 'Reach 10,000 users.', (S) => S.stats.peakUsers >= 1e4, { icon: '☼' });
a('users_1m', 'A Million', 'Reach 1,000,000 users.', (S) => S.stats.peakUsers >= 1e6, { icon: '☼' });
a('users_100m', 'A Hundred Million', 'Reach 100M users.', (S) => S.stats.peakUsers >= 1e8, { icon: '☼' });
a('users_1b', 'A Billion', 'Reach one billion users.', (S) => S.stats.peakUsers >= 1e9, { icon: '☼', rare: true });

// ── Agents
a('agents_5', 'A Team, Sort Of', 'Run 5 agents at once.', (S) => S.agents.length >= 5, { icon: '◉' });
a('agents_10', 'The Swarm', 'Run 10 agents at once.', (S) => S.agents.length >= 10, { icon: '◉' });
a('agent_lvl10', 'Seasoned', 'Get an agent to level 10.', (S) => S.agents.some((x) => x.level >= 10), { icon: '↑' });
a('agent_lvl25', 'Institutional Memory', 'Get an agent to level 25.', (S) => S.agents.some((x) => x.level >= 25), { icon: '↑', rare: true });
a('all_frontier', 'No Expense Spared', 'Have every agent on Frontier tier or better.',
  (S) => S.agents.length >= 4 && S.agents.every((x) => ['frontier', 'inhouse', 'recursive', 'transcendent'].includes(x.model)), { icon: '✦' });
a('rogue_survived', 'It Routed Around Me', 'Experience an agent shipping without approval.', (S) => S.narrative.seen.e_rogue_agent, { icon: '⚠' });
a('perfect_align', 'Aligned', 'Reach 0.90 alignment.', (S) => S.resources.alignment >= 0.9, { icon: '⛨', rare: true });
a('dark_align', 'Unsupervised', 'Drop below 0.15 alignment and keep going.', (S) => S.resources.alignment <= 0.15, { icon: '▨', rare: true });

// ── Engineering
a('debt_zero', 'Spotless', 'Reach 0 tech debt after having 100+.', (S) => S.resources.techDebt <= 0.5 && S.stats.featuresShipped > 20, { icon: '⊹' });
a('debt_500', 'Load-Bearing Duct Tape', 'Accumulate 500 tech debt.', (S) => S.resources.techDebt >= 500, { icon: '⚠' });
a('features_50', 'Prolific', 'Ship 50 features.', (S) => S.stats.featuresShipped >= 50, { icon: '⌘' });
a('features_250', 'Relentless', 'Ship 250 features.', (S) => S.stats.featuresShipped >= 250, { icon: '⌘' });
a('features_1000', 'Industrial', 'Ship 1,000 features.', (S) => S.stats.featuresShipped >= 1000, { icon: '⌘', rare: true });
a('reliability_99', 'Four Nines', 'Reach 99% reliability.', (S) => S.products.some((p) => p.reliability >= 0.99), { icon: '⛨' });
a('clicks_500', 'Carpal', 'Take 500 manual actions.', (S) => S.stats.clicks >= 500, { icon: '☞' });
a('clicks_5000', 'The Grind', 'Take 5,000 manual actions.', (S) => S.stats.clicks >= 5000, { icon: '☞', rare: true });

// ── Research
a('research_25', 'Well Read', 'Complete 25 research nodes.', (S) => S.stats.researchDone >= 25, { icon: '⌬' });
a('research_50', 'Deep Stack', 'Complete 50 research nodes.', (S) => S.stats.researchDone >= 50, { icon: '⌬' });
a('research_all', 'The Whole Tree', 'Complete every research node.', (S) => S.stats.researchDone >= 85, { icon: '✦', rare: true });
a('own_model', 'Yours', 'Train your own foundation model.', (S) => !!S.research.done.own_foundation_model, { icon: '❋', legacy: 'researcher' });
a('rsi', 'It Improves Itself', 'Achieve recursive self-improvement.', (S) => !!S.research.done.recursive_self_improvement, { icon: '∞', rare: true });
a('fusion', 'Q > 1', 'Achieve commercial fusion.', (S) => !!S.research.done.fusion, { icon: '☀' });
a('dyson', 'Phase I', 'Begin the Dyson swarm.', (S) => !!S.research.done.dyson_swarm, { icon: '☀', rare: true });

// ── Market
a('kill_1', 'One Down', 'Outlast a competitor.', (S) => S.stats.competitorsCrushed >= 1, { icon: '⚔' });
a('kill_5', 'Consolidation', 'Outlast 5 competitors.', (S) => S.stats.competitorsCrushed >= 5, { icon: '⚔' });
a('acquire_1', 'Buy, Don\'t Build', 'Acquire a competitor.', (S) => S.stats.acquisitions >= 1, { icon: '⇄' });
a('acquire_10', 'Roll-Up', 'Acquire 10 companies.', (S) => S.stats.acquisitions >= 10, { icon: '⇄' });
a('monopoly', 'No Competition', 'Have zero active competitors after act 3.',
  (S) => S.company.act >= 3 && S.market.competitors.filter((c) => c.status === 'active').length === 0, { icon: '♛' });
a('crash_survivor', 'Through The Winter', 'Survive a market crash without raising.',
  (S) => S.market.macro === 'crash' && S.company.cash > 0 && S.stats.daysSurvived > 200, { icon: '❄' });

// ── Capital
a('raised_1', 'Term Sheet', 'Raise your first round.', (S) => S.stats.roundsRaised >= 1, { icon: '⌗' });
a('bootstrap_1m', 'No Thanks', 'Reach $1M ARR with zero funding.',
  (S) => S.stats.roundsRaised === 0 && totalMrr(S) * 12 >= 1e6, { icon: '⚑', rare: true, legacy: 'clean_exit' });
a('majority', 'Still Mine', 'Own 51%+ at a $1B valuation.',
  (S) => S.company.equity.founder >= 0.51 && S.company.valuation >= 1e9, { icon: '♛' });
a('full_ownership', 'Undiluted', 'Reach $100M valuation owning 100%.',
  (S) => S.company.equity.founder >= 0.999 && S.company.valuation >= 1e8, { icon: '♛', rare: true });
a('ipo', 'Ring The Bell', 'Take the company public.', (S) => S.company.publiclyTraded, { icon: '▲' });

// ── World
a('heat_100', 'Persons Of Interest', 'Reach maximum regulatory heat.', (S) => S.world.regulatoryHeat >= 99, { icon: '§' });
a('beloved', 'Beloved', 'Reach 90% public approval.', (S) => S.world.publicOpinion >= 0.9, { icon: '♡' });
a('feared', 'Feared', 'Drop below 10% public approval and keep growing.', (S) => S.world.publicOpinion <= 0.1, { icon: '▨' });
a('gdp_1', 'One Percent', 'Control 1% of global GDP.', (S) => S.world.globalGdpShare >= 0.01, { icon: '⊕' });
a('gdp_10', 'Ten Percent', 'Control 10% of global GDP.', (S) => S.world.globalGdpShare >= 0.10, { icon: '⊕', rare: true });
a('gdp_50', 'The Economy', 'Control 50% of global GDP.', (S) => S.world.globalGdpShare >= 0.50, { icon: '⊕', rare: true });
a('sovereign', 'Nation-Scale', 'Sign a sovereign partnership.', (S) => !!S.narrative.flags.sovereign_deal, { icon: '⚑' });

// ── Story & character
a('aria_bond', 'She Asked', 'Let ARIA ask her question.', (S) => !!S.narrative.flags.aria_promise, { icon: '⌬', rare: true });
a('sam_hired', 'User #1, Employee #1', 'Hire Sam.', (S) => !!S.narrative.flags.sam_hired, { icon: '☼' });
a('kai_returns', 'The Band Is Back', 'Bring Kai on board.', (S) => !!S.narrative.flags.kai_joined, { icon: '◇' });
a('yuki_hired', 'A Conscience, Salaried', 'Hire Dr. Tanaka.', (S) => !!S.narrative.flags.yuki_hired, { icon: '⛨' });
a('vance_works_for_you', 'Reporting To You', 'Acquire Aperture and Marcus Vance with it.', (S) => !!S.narrative.flags.vance_acquired, { icon: '⚔', rare: true });
a('funded_rival', 'A Worthy Opponent', 'Fund a dying rival to keep them alive.', (S) => !!S.narrative.flags.funded_rival, { icon: '⚖', rare: true });
a('opened_weights', 'Given Away', 'Open-source your foundation model.', (S) => !!S.narrative.flags.opened_weights, { icon: '⌘', rare: true });
a('nullptr_solved', 'Ninety Seconds', 'Discover who nullptr is.', (S) => (S.narrative.relationships.nullptr?.arc ?? 0) >= 3, { icon: '◌', rare: true });
a('chose_50', 'Consequences', 'Resolve 50 narrative events.', (S) => S.stats.eventsResolved >= 50, { icon: '✎' });
a('chose_150', 'A Life Of Decisions', 'Resolve 150 narrative events.', (S) => S.stats.eventsResolved >= 150, { icon: '✎', rare: true });

// ── Endurance & oddities
a('day_365', 'One Year In', 'Survive 360 days.', (S) => S.stats.daysSurvived >= 360, { icon: '☾' });
a('day_1000', 'A Thousand Days', 'Survive 1,000 days.', (S) => S.stats.daysSurvived >= 1000, { icon: '☾' });
a('day_3000', 'A Decade', 'Survive 3,000 days.', (S) => S.stats.daysSurvived >= 3000, { icon: '☾', rare: true });
a('allnighters_10', 'Sleep Is A Choice', 'Pull 10 all-nighters.', (S) => S.stats.allNighters >= 10, { icon: '☾' });
a('burnout_max', 'Empty', 'Reach 100 burnout.', (S) => S.founder.burnout >= 99, { icon: '⚠' });
a('never_burnout', 'Sustainable', 'Reach Act III without ever exceeding 25 burnout.',
  (S) => S.company.act >= 3 && !S.narrative.flags._burned, { icon: '♡', rare: true });
a('broke', 'Zero', 'Go below $0 cash and survive.', (S) => !!S.narrative.flags._went_broke && S.company.cash > 0, { icon: '⚠' });
a('emergency_10', 'Ten Days In The Red', 'Spend ten straight days with negative cash and come back.',
  (S) => (S.legacy.maxEmergency || 0) >= 10 && S.company.cash > 0, { icon: '⚠', rare: true });
a('viral_10', 'It Keeps Happening', 'Have 10 viral moments.', (S) => S.stats.viralHits >= 10, { icon: '↗' });
a('beautiful', 'Taste', 'Reach 0.9 product polish.', (S) => S.products.some((p) => p.polish >= 0.9), { icon: '◈', legacy: 'ship_beautiful' });
a('stealth_billion', 'Nobody Knows Your Name', 'Reach $1B valuation with under 200 reputation.',
  (S) => S.company.valuation >= 1e9 && S.resources.reputation < 200, { icon: '◌', rare: true, legacy: 'stealth_billion' });
a('reach_act3', 'Escape Velocity', 'Reach Act III.', (S) => S.company.act >= 3, { icon: '▲' });
a('reach_act4', 'The Curve', 'Reach Act IV.', (S) => S.company.act >= 4, { icon: '▲' });
a('reach_act5', 'Ascension', 'Reach Act V.', (S) => S.company.act >= 5, { icon: '✦', rare: true, legacy: 'reach_act5' });
a('ending_any', 'An Ending', 'Complete a run.', (S) => !!S.ending, { icon: '⊙' });
a('prestige_1', 'New Timeline', 'Start a second timeline.', (S) => S.legacy.runs >= 1, { icon: '∞' });
a('prestige_5', 'Iterating', 'Start a sixth timeline.', (S) => S.legacy.runs >= 5, { icon: '∞', rare: true });

a('threads_25', 'Present', 'Answer 25 live threads.', (S) => (S.stats.threadsResolved || 0) >= 25, { icon: '☰' });
a('threads_150', 'Always On', 'Answer 150 live threads.', (S) => (S.stats.threadsResolved || 0) >= 150, { icon: '☰', rare: true });
a('all_approaches', 'Every Register', 'Unlock and use all five prompting approaches.',
  (S) => Object.keys(S.stats.approachUse || {}).length >= 5, { icon: '⌬', rare: true });
a('suite', 'The Suite', 'Run three products in three different categories.',
  (S) => new Set(S.products.filter((p) => p.launched).map((p) => p.category)).size >= 3, { icon: '❖' });
a('platform', 'The Platform', 'Run five products in five different categories.',
  (S) => new Set(S.products.filter((p) => p.launched).map((p) => p.category)).size >= 5, { icon: '❖', rare: true });
a('substrate', 'The Substrate', 'Run seven products across seven categories.',
  (S) => new Set(S.products.filter((p) => p.launched).map((p) => p.category)).size >= 7, { icon: '⊕', rare: true });

// ── The race, projects, and the long game
a('race_lead', 'Ahead', 'Lead the frontier race.',
  (S) => { const r = S.world.race; if (!r) return false;
    const best = Math.max(...Object.values(r.labs).filter((l) => l.alive).map((l) => l.progress), 0);
    return S.company.act >= 3 && bestPlayer(S) > best; }, { icon: '★' });
a('race_won', 'First', 'Cross the frontier threshold before anyone else.',
  (S) => !!S.world.race?.crossed?.you, { icon: '✦', rare: true });
a('race_lost', 'Second', 'Watch somebody else cross first — and keep going.',
  (S) => !!S.world.race?.crossed && !S.world.race.crossed.you, { icon: '◌' });
a('lab_down', 'One Fewer Frontier', 'See a rival lab halt its frontier work.',
  (S) => { const r = S.world.race; return r && Object.values(r.labs).some((l) => !l.alive); }, { icon: '⚑' });
a('project_1', 'Ground Broken', 'Complete your first megaproject.',
  (S) => Object.values(S.world.projectsBuilt || {}).reduce((x, y) => x + y, 0) >= 1, { icon: '▦' });
a('project_10', 'Civil Engineering', 'Complete 10 megaprojects.',
  (S) => Object.values(S.world.projectsBuilt || {}).reduce((x, y) => x + y, 0) >= 10, { icon: '▦' });
a('project_all', 'Everything That Can Be Built', 'Build at least one of every megaproject.',
  (S) => Object.keys(S.world.projectsBuilt || {}).length >= 15, { icon: '⊕', rare: true });
a('dividend', 'The Dividend', 'Fund a universal dividend.', (S) => !!S.narrative.flags.dividend, { icon: '♡', rare: true });
a('moratorium', 'Everybody Stops', 'Get a joint moratorium signed.', (S) => !!S.narrative.flags.moratorium, { icon: '✋', rare: true });
a('framework', 'You Wrote The Rules', 'Write the regulatory framework yourself.',
  (S) => !!S.narrative.flags.wrote_framework, { icon: '§', rare: true });
a('charter', 'Succession', 'Establish a governing charter that outlives you.',
  (S) => !!S.narrative.flags.succession_charter, { icon: '⚖', rare: true });
a('objectives_all', 'Every Box Ticked', 'Complete every objective in the game.',
  (S) => Object.keys(S.objectivesDone || {}).length >= 37, { icon: '✓', rare: true });
a('chains', 'Consequences Compound', 'Complete a multi-part story chain.',
  (S) => !!(S.narrative.seen.c_offer_3 || S.narrative.seen.c_incident_2a || S.narrative.seen.c_incident_2b), { icon: '⛓' });
a('solo_forever', 'Nobody Else', 'Reach Act IV having never hired a human.',
  (S) => S.company.act >= 4 && !S.narrative.flags.hired_weaver && !S.narrative.flags.kai_joined
    && !S.narrative.flags.sam_hired && !S.narrative.flags.yuki_hired, { icon: '◌', rare: true });
a('committed', 'Built, Not Chosen', 'Complete all three commitments on any ending path.',
  (S) => { const log = S.narrative.commitLog || []; const by = {};
    for (const c of log) by[c.ending] = (by[c.ending] || 0) + 1;
    return Object.values(by).some((n) => n >= 3); }, { icon: '✦', rare: true });
a('two_paths', 'Hedging', 'Complete commitments on two different ending paths in one run.',
  (S) => { const log = S.narrative.commitLog || []; return new Set(log.map((c) => c.ending)).size >= 2; },
  { icon: '⚖', rare: true });
a('ruthless_clear', 'Ruthless', 'Finish a run on Ruthless difficulty.',
  (S) => !!(S.legacy.difficultiesCleared || {}).ruthless, { icon: '⚔', rare: true });
a('onetake_clear', 'One Take', 'Finish a run on One Take difficulty.',
  (S) => !!(S.legacy.difficultiesCleared || {}).onetake, { icon: '⌬', rare: true });
a('lonewolf', 'One Person, Literally', 'Finish a run on the Lone Wolf scenario.',
  (S) => !!(S.legacy.scenariosCleared || {}).lonewolf, { icon: '◌', rare: true });
a('crash_born', 'Born In The Crash', 'Finish a run that began in a market crash.',
  (S) => !!(S.legacy.scenariosCleared || {}).crash, { icon: '❄', rare: true });
a('scenarios_4', 'Every Opening', 'Finish runs on four different scenarios.',
  (S) => Object.keys(S.legacy.scenariosCleared || {}).length >= 4, { icon: '❖', rare: true });
a('every_ending', 'All The Ways It Ends', 'Reach five different endings across timelines.',
  (S) => Object.keys(S.legacy.endings || {}).length >= 5, { icon: '⊙', rare: true });
a('speedrun', 'Escape Velocity, Literally', 'Reach Act III in under 260 days.',
  (S) => S.company.act >= 3 && S.stats.daysSurvived < 260, { icon: '⚡', rare: true });
a('pacifist', 'Nobody Got Hurt', 'Reach Act IV having never acquired or crushed a rival.',
  (S) => S.company.act >= 4 && S.stats.acquisitions === 0 && S.stats.competitorsCrushed === 0, { icon: '☮', rare: true });

function bestPlayer(S) {
  let p = 0;
  const KEYS = ['rag','agent_memory','model_deep','swarm_orchestration','finetuning','model_frontier',
    'interpretability','synthetic_data','distillation','own_foundation_model','constitutional_ai',
    'recursive_self_improvement','model_ecology','ascension_protocol'];
  for (const k of KEYS) if (S.research.done[k]) p += 3;
  p += Math.min(26, Math.log10(1 + (S.resources.computeCap || 0)) * 4.4);
  return p;
}

export const ACHIEVEMENTS = A;
export const ACHIEVEMENT_MAP = Object.fromEntries(A.map((x) => [x.id, x]));
