// ─────────────────────────────────────────────────────────────────────────────
// LEGACY — the prestige layer. "New Timeline" resets the run; these persist.
// ─────────────────────────────────────────────────────────────────────────────

export const LEGACY_PERKS = [
  { id: 'seed_capital', name: 'Seed Capital', max: 10, cost: (l) => 2 + l * 2, icon: '⌗',
    desc: (l) => `Start each timeline with +$${(l * 15000).toLocaleString()}.`,
    special: 'startCash', per: 15000 },
  { id: 'muscle_memory', name: 'Muscle Memory', max: 8, cost: (l) => 3 + l * 3, icon: '⌘',
    desc: (l) => `+${l * 8}% code rate, permanently.`, mods: { codeRate: 1.08 } },
  { id: 'reputation_precedes', name: 'Your Reputation Precedes You', max: 6, cost: (l) => 4 + l * 4, icon: '☼',
    desc: (l) => `Start with ${l * 40} Reputation and +${l * 10}% reputation gain.`,
    mods: { repRate: 1.10 }, special: 'startRep', per: 40 },
  { id: 'known_quantity', name: 'Known Quantity', max: 5, cost: (l) => 6 + l * 5, icon: '⚑',
    desc: (l) => `Fundraising valuations +${l * 15}%. VCs remember the last timeline.`,
    mods: { raiseValuation: 1.15 } },
  { id: 'prompt_savant', name: 'Prompt Savant', max: 8, cost: (l) => 3 + l * 3, icon: '⌬',
    desc: (l) => `+${l * 12}% output from AI prompts and agents.`,
    mods: { promptOutput: 1.12, agentOutput: 1.06 } },
  { id: 'clean_architecture', name: 'Clean Architecture', max: 6, cost: (l) => 5 + l * 4, icon: '⊹',
    desc: (l) => `−${Math.round((1 - Math.pow(0.88, l)) * 100)}% tech debt generation.`,
    mods: { debtRate: 0.88 } },
  { id: 'the_rolodex', name: 'The Rolodex', max: 5, cost: (l) => 5 + l * 5, icon: '◈',
    desc: (l) => `Start with ${l} extra agent slot${l === 1 ? '' : 's'} and cheaper hires.`,
    mods: { '+agentCap': 1 } },
  { id: 'foreknowledge', name: 'Foreknowledge', max: 4, cost: (l) => 8 + l * 7, icon: '◉',
    desc: (l) => `Start with ${l * 25} Research banked. You remember the tree.`,
    special: 'startResearch', per: 25 },
  { id: 'iron_constitution', name: 'Iron Constitution', max: 5, cost: (l) => 4 + l * 4, icon: '♡',
    desc: (l) => `+${l * 20} max Focus, +${l * 15}% focus regeneration.`,
    mods: { '+focusMax': 20, focusRegen: 1.15 } },
  { id: 'market_timing', name: 'Market Timing', max: 4, cost: (l) => 7 + l * 6, icon: '↗',
    desc: (l) => `Start in a hotter market. Sector hype +${l * 12}%, +${l * 8}% valuation.`,
    mods: { valuationMult: 1.08 }, special: 'startHype', per: 0.12 },
  { id: 'the_long_game', name: 'The Long Game', max: 3, cost: (l) => 12 + l * 10, icon: '∞',
    desc: (l) => `Research rate +${l * 25}%. You know which branches matter.`,
    mods: { researchRate: 1.25 } },
  { id: 'aligned_by_default', name: 'Aligned By Default', max: 3, cost: (l) => 10 + l * 9, icon: '⛨',
    desc: (l) => `Start with +${(l * 0.1).toFixed(2)} alignment. Rogue chance −${l * 25}%.`,
    mods: { '+alignment': 0.1, rogueChance: 0.75 } },
];

export const LEGACY_MAP = Object.fromEntries(LEGACY_PERKS.map((p) => [p.id, p]));

// Legacy points awarded at the end of a run.
export function computeLegacyGain(S) {
  const v = Math.max(0, S.company.valuation);
  const byVal = v > 1e6 ? Math.floor(Math.log10(v / 1e6) * 6) : 0;
  const byAct = (S.company.act - 1) * 4;
  const byEnding = S.ending && S.ending.id !== 'bankrupt' ? 12 : 0;
  const byAchieve = Math.floor(Object.keys(S.achievements).length / 4);
  const byDepth = Math.floor((S.stats.researchDone || 0) / 8);
  return Math.max(1, byVal + byAct + byEnding + byAchieve + byDepth);
}

// Founder archetypes — unlocked over time, each plays differently.
export const ARCHETYPES = [
  { id: 'hacker', name: 'The Hacker', icon: '⌘', unlockedBy: null,
    tagline: 'Ship first. Apologize never.',
    desc: 'You out-build everyone. Code comes fast; polish comes never.',
    skills: { engineering: 4, prompting: 3 },
    mods: { codeRate: 1.35, debtRate: 1.25, repRate: 0.85 },
    startCash: 0, perk: 'Manual coding is 60% more effective.' },
  { id: 'designer', name: 'The Designer', icon: '◈', unlockedBy: 'ship_beautiful',
    tagline: 'Taste is a moat.',
    desc: 'Your product feels inevitable. Growth is organic and churn is low.',
    skills: { design: 4, vision: 3 },
    mods: { conversion: 1.4, churn: 0.75, codeRate: 0.85 },
    startCash: 0, perk: 'Product Polish rises on its own.' },
  { id: 'hustler', name: 'The Hustler', icon: '↗', unlockedBy: 'first_million',
    tagline: 'Distribution beats product.',
    desc: 'You can sell anything. Revenue arrives early; the product lags.',
    skills: { sales: 4, growth: 3 },
    mods: { mrrMult: 1.35, arpu: 1.3, '+viral': 0.05, codeRate: 0.8 },
    startCash: 8000, perk: 'Fundraising is dramatically easier.' },
  { id: 'researcher', name: 'The Researcher', icon: '⌬', unlockedBy: 'own_model',
    tagline: 'The tech tree is the game.',
    desc: 'You go deep before you go wide. Slow start, unstoppable finish.',
    skills: { vision: 4, prompting: 3 },
    mods: { researchRate: 1.5, agentOutput: 1.15, mrrMult: 0.8 },
    startCash: 0, perk: 'Start with 40 Research banked.' },
  { id: 'operator', name: 'The Operator', icon: '⚙', unlockedBy: 'clean_exit',
    tagline: 'Systems, not heroics.',
    desc: 'Nothing breaks. Nothing is wasted. Everything compounds.',
    skills: { ops: 4, engineering: 2, sales: 2 },
    mods: { agentOutput: 1.25, opCost: 0.75, debtRate: 0.7, '+agentCap': 1 },
    startCash: 0, perk: 'Incidents are 60% less likely.' },
  { id: 'prophet', name: 'The Prophet', icon: '✦', unlockedBy: 'reach_act5',
    tagline: 'They will understand eventually.',
    desc: 'You bend belief itself. Reputation and influence are your resources.',
    skills: { vision: 5, growth: 3 },
    mods: { repRate: 1.8, valuationMult: 1.5, '+opinionDrift': 0.01, opCost: 1.2 },
    startCash: 0, perk: 'Narrative events skew heavily in your favor.' },
  { id: 'ghost', name: 'The Ghost', icon: '◌', unlockedBy: 'stealth_billion',
    tagline: 'Nobody knows your name.',
    desc: 'You operate unseen. No press, no scrutiny, no limits.',
    skills: { engineering: 3, ops: 3, prompting: 2 },
    mods: { repRate: 0.3, competitorGrowth: 0.7, rivalHeat: 2, opCost: 0.85 },
    startCash: 0, perk: 'Regulatory heat accrues 80% slower.' },
];
export const ARCHETYPE_MAP = Object.fromEntries(ARCHETYPES.map((a) => [a.id, a]));
