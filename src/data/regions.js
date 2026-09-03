// ─────────────────────────────────────────────────────────────────────────────
// REGIONS — the board for Act III–V. Eight blocs, each with its own posture,
// its own price, and its own reason to say yes.
//
// `path` and `at` drive the tactical display in src/ui/worldmap.js. They are
// stylised, not cartographic: angular outlines on a 1000x440 field, placed so
// the board reads at a glance rather than so it survives a geography exam.
// ─────────────────────────────────────────────────────────────────────────────

export const REGIONS = [
  { id: 'na', path: 'M 96,74 L 214,58 L 262,94 L 240,150 L 192,198 L 150,178 L 126,130 L 94,108 Z', at: [172, 122], name: 'North America', short: 'NA', icon: '◧', color: '#4dd0e1',
    pop: 0.06, gdp: 0.26, baseStance: 0.55, regBase: 0.5,
    desc: 'Your home market, if you have one. Litigious, wealthy, and quick to adopt.',
    likes: ['reputation'], dislikes: ['heat'],
    flavour: 'They will sue you and buy from you in the same quarter.',
    bonus: { key: 'revenue', value: 0.22, label: '+22% revenue', note: 'Highest willingness to pay on Earth.' } },
  { id: 'eu', path: 'M 424,64 L 522,56 L 548,90 L 520,132 L 452,142 L 422,108 Z', at: [484, 100], name: 'European Union', short: 'EU', icon: '◨', color: '#60a5fa',
    pop: 0.05, gdp: 0.17, baseStance: 0.38, regBase: 0.95,
    desc: 'Slow, principled, and willing to fine you a percentage of global turnover.',
    likes: ['alignment', 'opinion'], dislikes: ['heat'],
    flavour: 'Compliance here is expensive and then it is a moat everywhere else.',
    bonus: { key: 'heat', value: 2.2, label: '−2.2 regulatory heat/day', note: 'Compliance here is a passport everywhere else.' } },
  { id: 'cn', path: 'M 704,70 L 848,62 L 868,118 L 830,180 L 760,192 L 718,150 L 698,110 Z', at: [784, 126], name: 'East Asia', short: 'EA', icon: '◩', color: '#ff4d5e',
    pop: 0.22, gdp: 0.24, baseStance: 0.22, regBase: 0.85,
    desc: 'Enormous, fast, and already building its own version of everything you make.',
    likes: ['control'], dislikes: ['opinion'],
    flavour: 'Access is conditional. It is always conditional.',
    // The card has always said they are already building their own version.
    // §A10 makes that true: East Asia opens with somebody in the room, at the
    // infrastructure stage, and the only way past them is to displace them.
    domestic: { name: 'Wanshu Compute', stage: 'infra',
      note: 'State-adjacent, four years old, and running on fabrication nobody else can book.' },
    bonus: { key: 'compute', value: 900, label: '+900 PF compute', note: 'Fabrication capacity nobody else can access.' } },
  { id: 'in', path: 'M 626,182 L 716,174 L 726,232 L 686,270 L 648,244 L 626,214 Z', at: [674, 220], name: 'South Asia', short: 'SA', icon: '◪', color: '#f5a623',
    pop: 0.24, gdp: 0.09, baseStance: 0.48, regBase: 0.45,
    desc: 'The largest pool of users on the planet and the most price-sensitive.',
    likes: ['opinion'], dislikes: ['heat'],
    flavour: 'Win here on price and reliability, or do not win here.',
    bonus: { key: 'users', value: 0.35, label: '+35% user growth', note: 'The largest addressable population anywhere.' } },
  { id: 'sea', path: 'M 724,242 L 814,232 L 840,270 L 806,306 L 752,298 L 724,268 Z', at: [782, 268], name: 'Southeast Asia', short: 'SEA', icon: '◫', color: '#00e5a0',
    pop: 0.09, gdp: 0.06, baseStance: 0.52, regBase: 0.35,
    desc: 'Mobile-first, fast-adopting, and pragmatic about who provides the substrate.',
    likes: ['reputation'], dislikes: [],
    flavour: 'Whoever is useful first, wins, and stays won.',
    bonus: { key: 'viral', value: 0.05, label: '+0.05 viral coefficient', note: 'Mobile-first and fast to share.' } },
  { id: 'me', path: 'M 556,146 L 642,138 L 654,186 L 610,218 L 566,204 Z', at: [604, 178], name: 'Gulf & Middle East', short: 'ME', icon: '◬', color: '#fbbf24',
    pop: 0.06, gdp: 0.07, baseStance: 0.44, regBase: 0.30,
    desc: 'Sovereign capital, cheap energy, and a serious appetite for being early.',
    likes: ['control'], dislikes: [],
    flavour: 'They do not want a supplier. They want a stake.',
    bonus: { key: 'energy', value: 9000, label: '+9,000 MW energy', note: 'Power at a price nobody else is offered.' } },
  { id: 'af', path: 'M 438,176 L 554,166 L 568,230 L 528,308 L 486,350 L 452,296 L 436,232 Z', at: [500, 254], name: 'Africa', short: 'AF', icon: '◭', color: '#c084fc',
    pop: 0.19, gdp: 0.04, baseStance: 0.50, regBase: 0.25,
    desc: 'The youngest population on Earth and the least legacy infrastructure to replace.',
    likes: ['opinion', 'alignment'], dislikes: ['heat'],
    flavour: 'Nothing to rip out. That is the whole opportunity.',
    bonus: { key: 'opinion', value: 0.006, label: '+approval drift', note: 'Nothing to rip out; everything to gain.' } },
  { id: 'latam', path: 'M 196,216 L 264,206 L 294,248 L 268,308 L 240,394 L 214,352 L 204,282 Z', at: [246, 292], name: 'Latin America', short: 'LA', icon: '◮', color: '#f472b6',
    pop: 0.09, gdp: 0.07, baseStance: 0.46, regBase: 0.40,
    desc: 'Sophisticated demand, volatile currencies, and a lot of very good engineers.',
    likes: ['reputation'], dislikes: [],
    flavour: 'They have seen a lot of foreign platforms arrive and leave.',
    bonus: { key: 'upkeep', value: 0.82, label: '−18% agent upkeep', note: 'Excellent engineers, sane cost base.' } },
];

export const REGION_MAP = Object.fromEntries(REGIONS.map((r) => [r.id, r]));

export const STANCE_LABELS = [
  { at: 0.00, name: 'Hostile', color: '#ff4d5e', note: 'Actively working against you.' },
  { at: 0.22, name: 'Wary', color: '#f5a623', note: 'Watching, not blocking.' },
  { at: 0.42, name: 'Neutral', color: '#7c8a99', note: 'You are a vendor like any other.' },
  { at: 0.62, name: 'Warm', color: '#4dd0e1', note: 'Doors open when you knock.' },
  { at: 0.80, name: 'Aligned', color: '#00e5a0', note: 'Your interests are treated as theirs.' },
];

export function stanceOf(v) {
  let out = STANCE_LABELS[0];
  for (const s of STANCE_LABELS) if (v >= s.at) out = s;
  return out;
}

// Escalating engagement. Each stage unlocks the next.
export const STAGES = [
  { id: 'none', name: 'No presence', desc: 'You do not operate here.' },
  { id: 'market', name: 'Market entry', cost: (r, S) => 9e7 * (1 + r.gdp * 6),
    need: 0.34, days: 60, desc: 'Localise, comply, and start selling.',
    effects: { users: 1, revenue: 1 } },
  { id: 'infra', name: 'Regional infrastructure', cost: (r, S) => 1.4e9 * (1 + r.gdp * 5),
    need: 0.52, days: 140, desc: 'Datacenters, peering, local latency.',
    effects: { compute: 320, users: 1.5, reliability: 0.02 } },
  { id: 'partner', name: 'Government partnership', cost: (r, S) => 9e9 * (1 + r.gdp * 4),
    need: 0.70, days: 220, desc: 'Public services run on your stack.',
    effects: { users: 2.4, control: 0.35, heat: -8, revenue: 1.8 } },
  { id: 'sovereign', name: 'Sovereign integration', cost: (r, S) => 7e10 * (1 + r.gdp * 3),
    need: 0.86, days: 320, desc: 'Currency, identity, dispute resolution. The state runs on you.',
    effects: { users: 3.2, control: 1.1, revenue: 2.6, opinion: -0.02 } },
];
export const STAGE_INDEX = Object.fromEntries(STAGES.map((s, i) => [s.id, i]));
