// ─────────────────────────────────────────────────────────────────────────────
// SCENARIOS — optional opening conditions. They change the shape of a run
// rather than its difficulty, and they stack with the difficulty setting.
// ─────────────────────────────────────────────────────────────────────────────

export const SCENARIOS = [
  { id: 'none', name: 'Standard opening', icon: '◇', color: '#7c8a99',
    tagline: 'An empty repository and a cursor.',
    desc: 'The default. Twelve thousand dollars, a laptop, and nothing else.',
    legacyMult: 1.0, apply: () => {} },

  { id: 'crash', name: 'Born In The Crash', icon: '❄', color: '#60a5fa',
    tagline: 'The worst possible time to start.',
    desc: 'Funding has stopped, multiples have halved, and half the companies you admire will not survive the year. Everything you build has to pay for itself.',
    legacyMult: 1.25,
    apply: (S) => {
      S.market.macro = 'crash';
      S.market.macroDaysLeft = 700;
      S.market.hype = 0.10;
      S.market.hypePhase = Math.PI * 1.5;   // start at the bottom of the cycle
      S.company.cash = Math.round(S.company.cash * 0.7);
      S.narrative.flags.scenario_crash = true;
    } },

  { id: 'late', name: 'Late To The Party', icon: '⚔', color: '#ff4d5e',
    tagline: 'Five companies got here first.',
    desc: 'The category already exists and it is crowded. You start with more cash and a market that already has incumbents worth beating.',
    legacyMult: 1.3,
    apply: (S, api) => {
      S.company.cash += 30000;
      S.market.hype = 0.72;
      for (let i = 0; i < 5; i++) api.spawnCompetitor(S, { scale: 6 + i * 2 });
      S.narrative.flags.scenario_late = true;
    } },

  { id: 'lonewolf', name: 'Lone Wolf', icon: '◌', color: '#c084fc',
    tagline: 'No agents. Ever.',
    desc: 'You cannot hire. Everything the company ever does, you do — with prompting, allocation and research alone. Enormously harder and a completely different game.',
    legacyMult: 1.9,
    apply: (S) => {
      S.unlocks.noAgents = true;
      S.founder.skills.prompting += 4;
      S.founder.skills.engineering += 2;
      S.company.cash += 20000;
      S.narrative.flags.scenario_lonewolf = true;
    } },

  { id: 'inheritance', name: 'The Inheritance', icon: '⌗', color: '#f5a623',
    tagline: 'Money, and a reputation you did not earn.',
    desc: 'You start with $400,000 and a name people already know — and a market that expects a great deal, quickly. Runway is not the problem. Proving it is.',
    legacyMult: 0.8,
    apply: (S) => {
      S.company.cash += 400000;
      S.resources.reputation += 700;
      S.world.publicOpinion = 0.42;
      S.narrative.flags.scenario_inheritance = true;
    } },

  { id: 'aligned', name: 'The Careful Path', icon: '⛨', color: '#00e5a0',
    tagline: 'Alignment first, and it will cost you.',
    desc: 'You begin with high alignment, a hard floor beneath it, and a permanent cap on how fast you can move. Rivals will be faster. That is the premise.',
    legacyMult: 1.45,
    apply: (S) => {
      S.resources.alignment = 0.85;
      S.unlocks.alignFloorScenario = true;
      S.narrative.flags.scenario_aligned = true;
    } },

  { id: 'ghosttown', name: 'Nobody Is Watching', icon: '☾', color: '#8b5cf6',
    tagline: 'No press, no hype, no attention at all.',
    desc: 'Reputation gains are cut by 70% and the sector is cold. Everything must come from the product itself. Slower, quieter, and much harder to derail.',
    legacyMult: 1.35,
    apply: (S) => {
      S.market.hype = 0.10;
      S.unlocks.quietWorld = true;
      S.company.cash += 15000;
      S.narrative.flags.scenario_quiet = true;
    } },
];

export const SCENARIO_MAP = Object.fromEntries(SCENARIOS.map((s) => [s.id, s]));
