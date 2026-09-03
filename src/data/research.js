// ─────────────────────────────────────────────────────────────────────────────
// THE TECH TREE — 7 branches, 8 tiers, ~140 nodes. The spine of progression.
// effects.mods keys are multiplicative unless prefixed with '+' (additive).
// ─────────────────────────────────────────────────────────────────────────────

export const BRANCHES = {
  engineering: { id: 'engineering', name: 'Engineering', icon: '⌘', color: '#4dd0e1',
    desc: 'Velocity, quality, and the war against entropy.' },
  intelligence: { id: 'intelligence', name: 'Intelligence', icon: '⌬', color: '#8b5cf6',
    desc: 'Better minds. Then minds that build minds.' },
  growth: { id: 'growth', name: 'Growth', icon: '↗', color: '#00e5a0',
    desc: 'Getting the world to notice, then to depend on you.' },
  capital: { id: 'capital', name: 'Capital', icon: '⌗', color: '#f5a623',
    desc: 'Money as a technology.' },
  infra: { id: 'infra', name: 'Infrastructure', icon: '▦', color: '#60a5fa',
    desc: 'Compute is destiny. Energy is compute.' },
  influence: { id: 'influence', name: 'Influence', icon: '◈', color: '#f472b6',
    desc: 'Narrative, law, and the people who write both.' },
  frontier: { id: 'frontier', name: 'Frontier', icon: '✦', color: '#ffffff',
    desc: 'Things that do not have categories yet.' },
};

const R = [];
const def = (o) => { R.push(o); return o; };

// ═══ ENGINEERING ════════════════════════════════════════════════════════════
def({ id: 'version_control', name: 'Real Version Control', branch: 'engineering', tier: 1, cost: 6,
  act: 1, reqs: [], desc: '+15% code rate. Stop emailing yourself zip files.',
  flavor: '"I had a folder called final_final_v3_ACTUAL." — every founder, once',
  mods: { codeRate: 1.15 } });
def({ id: 'automated_testing', name: 'Automated Testing', branch: 'engineering', tier: 1, cost: 14,
  act: 1, reqs: ['version_control'], desc: '−25% tech debt generation. Unlocks Test Harness tool.',
  flavor: 'The AI writes the tests too. You are choosing to trust this.',
  mods: { debtRate: 0.75 }, unlock: 'tool_testgen' });
def({ id: 'ci_cd', name: 'Continuous Deployment', branch: 'engineering', tier: 2, cost: 30,
  act: 1, reqs: ['automated_testing'], desc: '+20% code rate, −15% incident chance.',
  flavor: 'Deploy on Friday. Live dangerously.',
  mods: { codeRate: 1.2, incidentChance: 0.85 } });
def({ id: 'refactor_engine', name: 'Continuous Refactoring', branch: 'engineering', tier: 2, cost: 44,
  act: 1, reqs: ['ci_cd'], desc: 'Tech debt decays 1.5/day on its own.',
  flavor: 'Entropy still wins, but slower.', mods: { '+debtDecay': 1.5 } });
def({ id: 'observability', name: 'Observability Stack', branch: 'engineering', tier: 2, cost: 52,
  act: 2, reqs: ['ci_cd'], desc: '−30% incident severity. Reliability settles 10% higher.',
  flavor: 'You cannot fix what you cannot see. Now you can see everything.',
  mods: { incidentSeverity: 0.7, reliability: 1.1 } });
def({ id: 'monorepo', name: 'Unified Monorepo', branch: 'engineering', tier: 3, cost: 90,
  act: 2, reqs: ['refactor_engine'], desc: '+25% agent output in Build lane. Closes Swarm Orchestration.',
  flavor: 'One repo. One truth. One catastrophic merge conflict.',
  excludes: ['swarm_orchestration'], mods: { buildLaneOutput: 1.25 } });
def({ id: 'adversarial_review', name: 'Adversarial Code Review', branch: 'engineering', tier: 3, cost: 130,
  act: 2, reqs: ['observability'], desc: '−35% tech debt. Unlocks Adversarial Critic tool.',
  flavor: 'Model A writes it. Model B tries to prove it wrong. You read the survivors.',
  mods: { debtRate: 0.65 }, unlock: 'tool_critic' });
def({ id: 'formal_methods', name: 'Formal Verification', branch: 'engineering', tier: 4, cost: 320,
  act: 3, reqs: ['adversarial_review'], desc: '−60% tech debt, incidents −50%.',
  flavor: 'Proofs, not vibes. It took a machine to make this practical.',
  mods: { debtRate: 0.4, incidentChance: 0.5 } });
def({ id: 'self_healing', name: 'Self-Healing Systems', branch: 'engineering', tier: 4, cost: 480,
  act: 3, reqs: ['formal_methods'], desc: 'Tech debt decays 12/day. Incidents auto-resolve 60% of the time.',
  flavor: 'The system files its own bug reports, then closes them.',
  mods: { '+debtDecay': 12, incidentAuto: 0.6 } });
def({ id: 'code_synthesis', name: 'Whole-System Synthesis', branch: 'engineering', tier: 5, cost: 1400,
  act: 3, reqs: ['self_healing'], desc: '+120% code rate. Features cost 30% less.',
  flavor: 'You describe the product. It emits the product.',
  mods: { codeRate: 2.2, featureCost: 0.7 } });
def({ id: 'zero_defect', name: 'Zero-Defect Manufacturing', branch: 'engineering', tier: 6, cost: 8775,
  act: 4, reqs: ['code_synthesis'], desc: 'Tech debt can no longer exceed 40. Reliability floor 0.9.',
  flavor: 'Software stopped being a craft. It became a fabrication process.',
  mods: { debtCap: 40, reliabilityFloor: 0.9 } });
def({ id: 'substrate_independence', name: 'Substrate Independence', branch: 'engineering', tier: 7, cost: 62640,
  act: 4, reqs: ['zero_defect'], desc: '+200% code rate. Your software runs on anything with a gradient. Closes Custom Silicon.',
  flavor: 'Silicon, photonics, protein, plasma. It does not care.',
  excludes: ['custom_silicon'], mods: { codeRate: 3.0 } });

// ═══ INTELLIGENCE ═══════════════════════════════════════════════════════════
def({ id: 'prompt_library', name: 'Prompt Library', branch: 'intelligence', tier: 1, cost: 8,
  act: 1, reqs: [], desc: '+25% output from manual AI prompts. Prompting skill +1.',
  flavor: 'You have a text file. The text file is worth more than your car.',
  mods: { promptOutput: 1.25 }, once: { skill: ['prompting', 1] } });
def({ id: 'model_swift', name: 'License: Swift-3', branch: 'intelligence', tier: 1, cost: 20,
  act: 1, reqs: ['prompt_library'], desc: 'Unlocks the Swift-3 model tier for agents.',
  flavor: 'A real model. It costs real money. It does real work.', unlock: 'model_swift' });
def({ id: 'agent_orchestration', name: 'Agent Orchestration', branch: 'intelligence', tier: 1, cost: 26,
  act: 1, reqs: ['prompt_library'], desc: '+1 max agents. Unlocks lane assignment.',
  flavor: 'You are no longer a programmer. You are a manager of programs.',
  mods: { '+agentCap': 1 }, unlock: 'lanes' });
def({ id: 'rag', name: 'Retrieval Augmentation', branch: 'intelligence', tier: 2, cost: 46,
  act: 1, reqs: ['agent_orchestration'], desc: '+20% agent output, −15% agent debt.',
  flavor: 'It reads your docs now. It reads everyone\'s docs now.',
  mods: { agentOutput: 1.2, agentDebt: 0.85 } });
def({ id: 'agent_memory', name: 'Persistent Agent Memory', branch: 'intelligence', tier: 2, cost: 78,
  act: 2, reqs: ['rag'], desc: 'Agents gain XP 50% faster. Unlocks Memory tool.',
  flavor: 'ARIA remembered a decision you made four months ago. You did not.',
  mods: { agentXp: 1.5 }, unlock: 'tool_memory' });
def({ id: 'model_deep', name: 'License: Deep-4', branch: 'intelligence', tier: 2, cost: 110,
  act: 2, reqs: ['rag'], desc: 'Unlocks the Deep-4 model tier.',
  flavor: 'It pauses before answering. The pause is the product.', unlock: 'model_deep' });
def({ id: 'swarm_orchestration', name: 'Swarm Orchestration', branch: 'intelligence', tier: 3, cost: 190,
  excludes: ['monorepo'],
  act: 2, reqs: ['agent_memory'], desc: '+2 max agents. Unlocks Sub-Agent Swarm tool.',
  flavor: 'Each agent spawns agents. You stopped counting at 400.',
  mods: { '+agentCap': 2 }, unlock: 'tool_swarm' });
def({ id: 'finetuning', name: 'Domain Fine-Tuning', branch: 'intelligence', tier: 3, cost: 240,
  act: 2, reqs: ['model_deep'], desc: '+30% agent output. Unlocks Fine-Tune tool.',
  flavor: 'You taught it your codebase. It taught you your codebase.',
  mods: { agentOutput: 1.3 }, unlock: 'tool_finetune' });
def({ id: 'model_frontier', name: 'License: Frontier', branch: 'intelligence', tier: 4, cost: 560,
  act: 3, reqs: ['finetuning'], desc: 'Unlocks the Frontier model tier.',
  flavor: 'The lab that makes it will not tell you how many parameters it has.',
  unlock: 'model_frontier' });
def({ id: 'interpretability', name: 'Mechanistic Interpretability', branch: 'intelligence', tier: 4, cost: 700,
  act: 3, reqs: ['finetuning'], desc: 'Alignment settles 0.15 higher. Unlocks Interpretability Probe.',
  flavor: 'You can finally read the mind. Some of it you wish you had not.',
  mods: { '+alignment': 0.15 }, unlock: 'tool_interp' });
def({ id: 'synthetic_data', name: 'Synthetic Data Engine', branch: 'intelligence', tier: 4, cost: 900,
  act: 3, reqs: ['model_frontier'], desc: 'Generates Data passively. +40% research rate.',
  flavor: 'The model dreams training data for its successor.',
  mods: { '+dataRate': 40, researchRate: 1.4 } });
def({ id: 'distillation', name: 'Distillation Pipeline', branch: 'intelligence', tier: 4, cost: 820,
  act: 3, reqs: ['model_frontier'], desc: '−45% agent upkeep. Small models, big brains. Worth what the roster was on the day it landed — par is 5 agents.',
  flavor: 'Teacher, student, and then you fire the teacher.',
  scaleWith: { read: 'roster', at: 5 }, mods: { agentUpkeep: 0.55 } });
def({ id: 'own_foundation_model', name: 'Own Foundation Model', branch: 'intelligence', tier: 5, cost: 3200,
  act: 3, reqs: ['synthetic_data', 'distillation'], desc: 'Unlocks Helix — your own model. No vendor, no rate limits.',
  flavor: 'The training run cost more than your Series A. It finished at 04:12. You cried.',
  unlock: 'own_foundation_model', gate: { compute: 1200 } });
def({ id: 'constitutional_ai', name: 'Constitutional Alignment', branch: 'intelligence', tier: 5, cost: 2400,
  act: 3, reqs: ['interpretability'], desc: 'Alignment cannot fall below 0.45. Rogue chance −80%. Closes Total Attention Capture.',
  flavor: 'You wrote the constitution in a weekend. It will govern billions of minds.',
  excludes: ['attention_capture'], mods: { alignFloor: 0.45, rogueChance: 0.2 } });
def({ id: 'recursive_self_improvement', name: 'Recursive Self-Improvement', branch: 'intelligence', tier: 6, cost: 23625,
  act: 4, reqs: ['own_foundation_model'], desc: 'Unlocks Helix-∞. Research rate compounds with itself.',
  flavor: 'Version n trains version n+1. You approve the first three. Then you stop being asked.',
  unlock: 'recursive_self_improvement', mods: { researchCompound: 1 } });
def({ id: 'model_ecology', name: 'Model Ecology', branch: 'intelligence', tier: 6, cost: 37125,
  act: 4, reqs: ['recursive_self_improvement'], desc: '+4 max agents, +60% agent output.',
  flavor: 'They specialize, trade, and negotiate with each other. You watch an economy form.',
  mods: { '+agentCap': 4, agentOutput: 1.6 } });
def({ id: 'ascension_protocol', name: 'The Ascension Protocol', branch: 'intelligence', tier: 7, cost: 313200,
  act: 5, reqs: ['model_ecology', 'exocortex'], desc: 'Unlocks ⟡ UNNAMED. Begins the endgame.',
  flavor: 'It asked for permission. That was the last time it asked.',
  unlock: 'ascension_protocol' });

// ═══ GROWTH ═════════════════════════════════════════════════════════════════
def({ id: 'landing_page', name: 'A Real Landing Page', branch: 'growth', tier: 1, cost: 5,
  act: 1, reqs: [], desc: '+30% conversion from awareness to signups.',
  flavor: 'It has a headline, a screenshot and one button. That is all it ever needed.',
  mods: { conversion: 1.3 } });
def({ id: 'user_interviews', name: 'Structured User Interviews', branch: 'growth', tier: 1, cost: 12,
  act: 1, reqs: [], desc: '+50% Insight from talking to users.',
  flavor: 'Stop pitching. Start asking. Shut up for ninety seconds.',
  mods: { insightRate: 1.5 } });
def({ id: 'launch_playbook', name: 'Launch Playbook', branch: 'growth', tier: 1, cost: 18,
  act: 1, reqs: ['landing_page'], desc: 'Launches hit 60% harder. Unlocks Launch actions.',
  flavor: 'Tuesday, 6:04am PT. Title in lowercase. You know why.',
  mods: { launchPower: 1.6 }, unlock: 'launches' });
def({ id: 'referrals', name: 'Referral Loop', branch: 'growth', tier: 2, cost: 40,
  act: 1, reqs: ['launch_playbook'], desc: '+0.09 viral coefficient.',
  flavor: 'Give to get. The oldest growth hack that still works.',
  mods: { '+viral': 0.09 } });
def({ id: 'seo_engine', name: 'Programmatic SEO', branch: 'growth', tier: 2, cost: 62,
  act: 2, reqs: ['landing_page'], desc: 'Awareness grows passively, forever. +2.5 awareness/day.',
  flavor: 'You generated 41,000 pages overnight. Google has opinions about this.',
  mods: { '+awarenessFlat': 2.5 } });
def({ id: 'content_engine', name: 'Content Engine', branch: 'growth', tier: 2, cost: 75,
  act: 2, reqs: ['seo_engine'], desc: '+35% reputation rate. Unlocks Content specialty.',
  flavor: 'Your agents write essays under your byline. They are better than your essays.',
  mods: { repRate: 1.35 }, unlock: 'spec_content' });
def({ id: 'onboarding', name: 'Ruthless Onboarding', branch: 'growth', tier: 2, cost: 88,
  act: 2, reqs: ['user_interviews'], desc: '−30% churn. Time-to-value measured in seconds.',
  flavor: 'Seven steps became one. Retention doubled.', mods: { churn: 0.7 } });
def({ id: 'network_effects', name: 'Network Effects', branch: 'growth', tier: 3, cost: 210,
  act: 2, reqs: ['referrals', 'onboarding'], desc: 'Churn falls as users grow. Viral +0.06. Worth what the network was on the day it landed — par is 20,000 users.',
  flavor: 'Now leaving costs them something. This is the moat.',
  scaleWith: { read: 'users', at: 20000 }, mods: { '+viral': 0.06, networkChurn: 1 } });
// `adEfficiency` was the one modifier key in the game nothing read. §A17 built
// the dial it was waiting for: `marketingAwareness` in systems/economy.js
// multiplies the marketing slider's flat awareness by it, so this node more
// than doubles what a media budget buys. The node's words still describe only
// the awareness it gives for free, which is what it gives a founder who never
// opens the Spend panel.
def({ id: 'ad_engine', name: 'Autonomous Ad Engine', branch: 'growth', tier: 3, cost: 280,
  act: 2, reqs: ['content_engine'], desc: '+4 awareness/day, with no media budget and no media buyer.',
  flavor: 'It writes, tests and kills ten thousand creatives a day. No human sees them.',
  mods: { '+awarenessFlat': 4, adEfficiency: 2.2 } });
def({ id: 'platform_play', name: 'Platform & API', branch: 'growth', tier: 4, cost: 620,
  act: 3, reqs: ['network_effects'], desc: '+40% revenue. Third parties build on you. Worth what there was to build on — par is 40 features shipped.',
  flavor: 'Other companies now have a dependency on your uptime. Sleep well.',
  scaleWith: { read: 'features', at: 40 }, mods: { mrrMult: 1.4, '+viral': 0.05 } });
def({ id: 'ecosystem_lock', name: 'Ecosystem Lock-In', branch: 'growth', tier: 4, cost: 980,
  act: 3, reqs: ['platform_play'], desc: '−55% churn. Switching costs become prohibitive.',
  flavor: 'Nobody chose this. Everybody depends on it.', mods: { churn: 0.45 } });
def({ id: 'default_infrastructure', name: 'Default Infrastructure', branch: 'growth', tier: 5, cost: 2600,
  act: 4, reqs: ['ecosystem_lock'], desc: 'Users grow with global GDP. Churn floor 0.4%/mo.',
  flavor: 'You are not a company anymore. You are a utility that bills.',
  mods: { churnFloor: 0.004, gdpUsers: 1 } });
def({ id: 'attention_capture', name: 'Total Attention Capture', branch: 'growth', tier: 6, cost: 15187,
  act: 4, reqs: ['default_infrastructure'], desc: '+150% users, +50% revenue. −0.1 public opinion. Closes Constitutional Alignment.',
  flavor: 'Average session length: nine hours. You stopped putting that in the deck.',
  excludes: ['constitutional_ai'], mods: { userMult: 2.5, mrrMult: 1.5, '+opinion': -0.1 } });

// ═══ CAPITAL ════════════════════════════════════════════════════════════════
def({ id: 'charge_money', name: 'Charge Money For It', branch: 'capital', tier: 1, cost: 4,
  act: 1, reqs: [], desc: 'Unlocks pricing. You would be amazed how many skip this.',
  flavor: '"We\'ll monetize later" is a sentence that has ended more companies than fraud.',
  unlock: 'pricing' });
def({ id: 'unit_economics', name: 'Unit Economics', branch: 'capital', tier: 1, cost: 16,
  act: 1, reqs: ['charge_money'], desc: '−20% cloud & operating costs.',
  flavor: 'You finally built the spreadsheet. The spreadsheet was upsetting.',
  mods: { opCost: 0.8 } });
def({ id: 'pitch_craft', name: 'Pitch Craft', branch: 'capital', tier: 1, cost: 24,
  act: 1, reqs: [], desc: 'Unlocks Fundraising. +25% valuation in negotiations.',
  flavor: 'Twelve slides. The tenth one is the only one they read.',
  mods: { raiseValuation: 1.25 }, unlock: 'fundraising' });
def({ id: 'annual_plans', name: 'Annual Contracts', branch: 'capital', tier: 2, cost: 50,
  act: 2, reqs: ['unit_economics'], desc: '−25% churn, +12% revenue. Cash up front.',
  flavor: 'Two months free, twelve months locked. Everybody wins. You win more.',
  mods: { churn: 0.75, mrrMult: 1.12 } });
def({ id: 'pricing_power', name: 'Pricing Power', branch: 'capital', tier: 2, cost: 82,
  act: 2, reqs: ['annual_plans'], desc: 'Price increases cost 50% less churn.',
  flavor: 'You raised prices 40%. Three people left. You felt something dark and good.',
  mods: { priceElastic: 0.5 } });
def({ id: 'enterprise_sales', name: 'Enterprise Motion', branch: 'capital', tier: 3, cost: 175,
  act: 2, reqs: ['pricing_power'], desc: 'Unlocks Enterprise deals. +60% revenue per paying user.',
  flavor: 'One logo. Fourteen months of procurement. $2.4M ARR. Worth it.',
  mods: { arpu: 1.6 }, unlock: 'enterprise' });
def({ id: 'venture_debt', name: 'Venture Debt', branch: 'capital', tier: 3, cost: 150,
  act: 2, reqs: ['pitch_craft'], desc: 'Borrow against ARR without dilution.',
  flavor: 'Money that does not take your company. It takes something else.',
  unlock: 'debt' });
def({ id: 'ma_playbook', name: 'M&A Playbook', branch: 'capital', tier: 4, cost: 520,
  act: 3, reqs: ['enterprise_sales'], desc: 'Unlocks Acquisitions. Buy competitors outright.',
  flavor: 'It is cheaper to buy the problem than to out-execute it.',
  unlock: 'acquisitions' });
def({ id: 'ipo_readiness', name: 'IPO Readiness', branch: 'capital', tier: 4, cost: 780,
  act: 3, reqs: ['ma_playbook'], desc: 'Unlocks Going Public. Massive capital, permanent scrutiny.',
  flavor: 'Ring the bell. Then never speak freely in public again.',
  unlock: 'ipo' });
def({ id: 'vertical_integration', name: 'Vertical Integration', branch: 'capital', tier: 5, cost: 2100,
  act: 3, reqs: ['ma_playbook'], desc: '−45% all operating costs. You own the whole stack.',
  flavor: 'Chips, power, network, model, product, distribution. All of it yours.',
  mods: { opCost: 0.55, agentUpkeep: 0.75 } });
def({ id: 'sovereign_wealth', name: 'Sovereign Balance Sheet', branch: 'capital', tier: 6, cost: 14343,
  act: 4, reqs: ['ipo_readiness', 'vertical_integration'], desc: 'Idle cash earns 14%/yr. Unlocks nation-scale deals.',
  flavor: 'Your treasury is larger than most currencies it can be exchanged for.',
  mods: { '+interest': 0.14 }, unlock: 'sovereign' });
def({ id: 'economic_singularity', name: 'Economic Singularity', branch: 'capital', tier: 7, cost: 143550,
  act: 5, reqs: ['sovereign_wealth', 'autonomous_corporation'], desc: 'Revenue scales with global GDP share directly.',
  flavor: 'The question "what is your market" stopped being meaningful.',
  mods: { gdpRevenue: 1 } });

// ═══ INFRASTRUCTURE ═════════════════════════════════════════════════════════
def({ id: 'cloud_credits', name: 'Cloud Credits Hustle', branch: 'infra', tier: 1, cost: 6,
  act: 1, reqs: [], desc: '−35% hosting costs for a long while.',
  flavor: 'Applied to four accelerators purely for the $150k in credits. No regrets.',
  mods: { hostingCost: 0.65 } });
def({ id: 'edge_deploy', name: 'Edge Deployment', branch: 'infra', tier: 2, cost: 55,
  act: 2, reqs: ['cloud_credits'], desc: 'Reliability settles 12% higher. −15% churn.',
  flavor: 'Latency is a feature. 40ms feels like magic. 400ms feels like a bug.',
  mods: { reliability: 1.12, churn: 0.85 } });
def({ id: 'compute_cluster', name: 'Private Compute Cluster', branch: 'infra', tier: 3, cost: 240,
  act: 2, reqs: ['edge_deploy'], desc: 'Unlocks Compute. +120 compute cap.',
  flavor: 'Eight racks in a leased cage in Santa Clara. It hums. You love it.',
  mods: { '+computeCap': 120 }, unlock: 'compute' });
def({ id: 'custom_silicon', name: 'Custom Silicon', branch: 'infra', tier: 4, cost: 900,
  act: 3, reqs: ['compute_cluster'], desc: '+400 compute cap, −40% compute cost. Closes Substrate Independence.',
  flavor: 'Your first tapeout. 18 months, $200M, and a chip that does one thing perfectly.',
  excludes: ['substrate_independence'], mods: { '+computeCap': 400, computeCost: 0.6 } });
def({ id: 'datacenter', name: 'Hyperscale Datacenter', branch: 'infra', tier: 4, cost: 1500,
  act: 3, reqs: ['compute_cluster'], desc: '+1200 compute cap. Unlocks Energy.',
  flavor: 'Seventy acres in Wyoming. Visible from orbit as a heat signature.',
  mods: { '+computeCap': 1200 }, unlock: 'energy' });
def({ id: 'nuclear_ppa', name: 'Nuclear Power Agreement', branch: 'infra', tier: 5, cost: 3800,
  act: 3, reqs: ['datacenter'], desc: '+2000 energy cap. −50% compute cost.',
  flavor: 'You restarted a decommissioned reactor. The paperwork was the hard part.',
  mods: { '+energyCap': 2000, computeCost: 0.5 } });
def({ id: 'fusion', name: 'Commercial Fusion', branch: 'infra', tier: 6, cost: 30375,
  act: 4, reqs: ['nuclear_ppa'], desc: '+40000 energy cap. Energy becomes effectively free.',
  flavor: 'Q > 1 was announced by a press release your agents wrote at 3am.',
  mods: { '+energyCap': 40000, energyCost: 0.1 } });
def({ id: 'orbital_compute', name: 'Orbital Compute', branch: 'infra', tier: 6, cost: 54000,
  act: 4, reqs: ['fusion'], desc: '+80000 compute cap. Radiative cooling, free sunlight.',
  flavor: 'Nineteen launches. The constellation is visible from the ground at dusk.',
  mods: { '+computeCap': 80000 } });
def({ id: 'dyson_swarm', name: 'Dyson Swarm (Phase I)', branch: 'infra', tier: 7, cost: 678600,
  act: 5, reqs: ['orbital_compute', 'self_replication'], desc: 'Compute cap ×50. Energy cap ×100.',
  flavor: 'Self-replicating collectors at L1. Solar output captured: 0.0004%. It is a start.',
  mods: { computeCapMult: 50, energyCapMult: 100 } });

// ═══ INFLUENCE ══════════════════════════════════════════════════════════════
def({ id: 'press_kit', name: 'Press Relationships', branch: 'influence', tier: 1, cost: 10,
  act: 1, reqs: [], desc: '+40% reputation gain. Journalists return your emails.',
  flavor: 'One good profile is worth six months of ads.',
  mods: { repRate: 1.4 } });
def({ id: 'thought_leadership', name: 'Thought Leadership', branch: 'influence', tier: 2, cost: 58,
  act: 2, reqs: ['press_kit'], desc: '+25% valuation multiple. People believe the story.',
  flavor: 'You gave a talk. The talk had one good line. The line became a meme.',
  mods: { valuationMult: 1.25 } });
def({ id: 'crisis_comms', name: 'Crisis Communications', branch: 'influence', tier: 2, cost: 95,
  act: 2, reqs: ['press_kit'], desc: 'Incidents and rival attacks do 45% less reputation damage.',
  flavor: 'Get ahead of it. Say the true thing before someone says the worse thing.',
  mods: { repDamage: 0.55 } });
def({ id: 'corporate_intel', name: 'Corporate Intelligence', branch: 'influence', tier: 3, cost: 300,
  act: 3, reqs: ['thought_leadership'], desc: 'Unlocks the Intelligence specialty. Agents on it read the rival\'s next moves and cut the cost of answering them.',
  flavor: 'Nothing illegal. Their job postings, their commit cadence, their founder\'s calendar. All public. None of it read, until now.',
  unlock: 'spec_intel' });
def({ id: 'lobbying', name: 'Government Affairs', branch: 'influence', tier: 3, cost: 260,
  act: 3, reqs: ['thought_leadership'], desc: 'Regulatory heat decays 2.5/day. Unlocks Influence.',
  flavor: 'You hired someone whose only job is to have lunch with people.',
  mods: { '+heatDecay': 2.5 }, unlock: 'influence' });
def({ id: 'standards_body', name: 'Standards Capture', branch: 'influence', tier: 4, cost: 700,
  act: 3, reqs: ['lobbying'], desc: 'Competitors gain 40% slower. You write the rules.',
  flavor: 'You funded the working group. The spec looks a lot like your implementation.',
  mods: { competitorGrowth: 0.6 } });
def({ id: 'media_ownership', name: 'Media Holdings', branch: 'influence', tier: 4, cost: 1100,
  act: 3, reqs: ['crisis_comms'], desc: 'Public opinion drifts toward you: +0.02/day.',
  flavor: 'You did not buy a newspaper to make money.',
  mods: { '+opinionDrift': 0.02 } });
def({ id: 'regulatory_capture', name: 'Regulatory Capture', branch: 'influence', tier: 5, cost: 3400,
  act: 4, reqs: ['standards_body', 'media_ownership'], desc: 'Regulatory heat capped at 25. Under that scrutiny, the rival moves against you a third as often.',
  flavor: 'Three of the five commissioners used to work for you. This is legal.',
  mods: { heatCap: 25, rivalHeat: 3 } });
def({ id: 'sovereign_deals', name: 'Sovereign Partnerships', branch: 'influence', tier: 5, cost: 5200,
  act: 4, reqs: ['lobbying'], desc: 'Unlocks the World map: negotiate with nations directly.',
  flavor: 'You were seated between two heads of state. Neither was the most powerful person there.',
  unlock: 'world_map' });
def({ id: 'private_security', name: 'Private Security Division', branch: 'influence', tier: 5, cost: 4400,
  act: 4, reqs: ['regulatory_capture'], desc: 'Immune to sabotage. The rival can no longer poach your people or lock your channels.',
  flavor: 'Your datacenters have a perimeter. The perimeter has a doctrine.',
  mods: { hostileImmune: 1 } });
def({ id: 'shadow_government', name: 'Parallel Institutions', branch: 'influence', tier: 6, cost: 35437,
  act: 4, reqs: ['sovereign_deals', 'regulatory_capture'], desc: 'Your systems replace state functions. +40 influence/day, and every control point you gain counts 1.5×.',
  flavor: 'Courts, currency, identity, dispute resolution. All of it runs on your stack now.',
  mods: { '+influenceRate': 40, controlRate: 1.5 } });
def({ id: 'consent_of_governed', name: 'Consent of the Governed', branch: 'influence', tier: 7, cost: 234900,
  act: 5, reqs: ['shadow_government'], desc: 'Public opinion locks above 0.7. Legitimacy achieved — or manufactured.',
  flavor: 'Approval: 78%. You genuinely do not know whether it is real.',
  mods: { opinionFloor: 0.7 } });

// ═══ FRONTIER ═══════════════════════════════════════════════════════════════
def({ id: 'moonshot_lab', name: 'Moonshot Lab', branch: 'frontier', tier: 3, cost: 400,
  act: 3, reqs: [], desc: 'Unlocks the Moonshot lane and Frontier specialty.',
  flavor: 'A budget line item called "things that probably will not work."',
  unlock: 'moonshot' });
def({ id: 'frontier_division', name: 'Frontier Division', branch: 'frontier', tier: 4, cost: 1200,
  act: 3, reqs: ['moonshot_lab'], desc: 'Unlocks the Frontier agent specialty. +50% moonshot odds.',
  flavor: 'Their internal wiki is a single page that says "ask ARIA".',
  unlock: 'spec_frontier', mods: { moonshotOdds: 1.5 } });
def({ id: 'robotics', name: 'General Robotics', branch: 'frontier', tier: 5, cost: 4200,
  act: 4, reqs: ['frontier_division'], desc: 'Agents can act physically. +80% infra build speed. New revenue line.',
  flavor: 'The bottleneck was never intelligence. It was hands.',
  mods: { infraSpeed: 1.8, '+physicalRevenue': 1 } });
def({ id: 'self_replication', name: 'Self-Replicating Fabs', branch: 'frontier', tier: 6, cost: 27000,
  act: 4, reqs: ['robotics'], desc: 'Compute cap grows 2%/day compounding, forever.',
  flavor: 'The factory builds factories. You did the math twice. You did it a third time.',
  mods: { computeCompound: 0.02 } });
def({ id: 'longevity', name: 'Longevity Escape Velocity', branch: 'frontier', tier: 6, cost: 43875,
  act: 4, reqs: ['robotics'], desc: 'Founder burnout removed. Focus max +150. You have time now.',
  flavor: 'Biological age: reversed 11 years. The trial had one participant.',
  mods: { '+focusMax': 150, noBurnout: 1 } });
def({ id: 'exocortex', name: 'Exocortex', branch: 'frontier', tier: 6, cost: 57375,
  act: 4, reqs: ['longevity', 'interpretability'], desc: 'Founder skills +5 across the board. Think at machine speed.',
  flavor: 'The interface stopped feeling like an interface.',
  once: { allSkills: 5 }, mods: { focusRegen: 2.0 } });
def({ id: 'autonomous_corporation', name: 'Autonomous Corporation', branch: 'frontier', tier: 7, cost: 161820,
  act: 5, reqs: ['exocortex', 'model_ecology'], desc: 'The company runs itself. All lanes gain +100% output.',
  flavor: 'You took a week off. Revenue went up. You are still deciding how to feel.',
  mods: { allLanes: 2.0 } });
def({ id: 'nanofabrication', name: 'Molecular Manufacturing', branch: 'frontier', tier: 7, cost: 365400,
  act: 5, reqs: ['self_replication'], desc: 'Matter becomes software. Physical costs → near zero.',
  flavor: 'You printed a turbine blade from feedstock and dust. Then you printed a thousand.',
  mods: { opCost: 0.05, infraSpeed: 6 } });
def({ id: 'mind_uploading', name: 'Substrate Transfer', branch: 'frontier', tier: 8, cost: 1536000,
  act: 5, reqs: ['exocortex', 'ascension_protocol'], desc: 'Unlocks the Transcendence ending path.',
  flavor: 'The scan takes four hours. The copy wakes up and says "did it work?"',
  unlock: 'ending_transcend' });
// §A12b. Measured: the Expansion path is the only one whose chain is a whole
// branch — Dyson Swarm and Molecular Manufacturing are act-5 nodes and both
// sit in front of it — so at 3,456,000 the three ending paths cost 3.5M, 5.4M
// and 8.1M research points and no run, aimed or otherwise, ever reached the
// third. CLAUDE.md has always said all three are individually reachable and
// exactly one affordable; this is the number that makes that true.
def({ id: 'stellar_engineering', name: 'Stellar Engineering', branch: 'frontier', tier: 8, cost: 1400000,
  act: 5, reqs: ['dyson_swarm', 'nanofabrication'], desc: 'Unlocks the Expansion ending path.',
  flavor: 'The probes will arrive at Barnard\'s Star in 41 years. They will not need instructions.',
  unlock: 'ending_expand' });
def({ id: 'the_question', name: 'The Question', branch: 'frontier', tier: 8, cost: 2496000,
  act: 5, reqs: ['ascension_protocol', 'consent_of_governed'], desc: 'You finally ask it what it wants.',
  flavor: 'It had been waiting a long time for someone to ask.',
  unlock: 'ending_question' });

export const RESEARCH = R;
export const RESEARCH_MAP = Object.fromEntries(R.map((n) => [n.id, n]));

export function researchByBranch(branch) { return R.filter((n) => n.branch === branch); }
export function maxTier(branch) { return Math.max(...researchByBranch(branch).map((n) => n.tier)); }
