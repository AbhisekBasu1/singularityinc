// Copy audit — imports the content modules and checks the actual prose fields,
// so it reads what the player reads rather than what the compiler reads.
const stub = () => {};
globalThis.performance = globalThis.performance || { now: () => Date.now() };
globalThis.localStorage = { getItem: () => null, setItem: stub, removeItem: stub };
globalThis.window = { addEventListener: stub, innerWidth: 1600, innerHeight: 900 };
globalThis.document = { addEventListener: stub, getElementById: () => null, querySelector: () => null,
  querySelectorAll: () => [], createElement: () => ({ style: {}, classList: { add: stub, remove: stub, toggle: stub },
  appendChild: stub, remove: stub, addEventListener: stub }), body: { appendChild: stub }, hidden: false };
globalThis.requestAnimationFrame = () => 0; globalThis.cancelAnimationFrame = stub;
globalThis.btoa = (s) => Buffer.from(s, 'binary').toString('base64');
globalThis.atob = (s) => Buffer.from(s, 'base64').toString('binary');

const { newGame, setState } = await import('../src/engine/state.js');
const S = newGame({ founderName: 'Alex Rivera', companyName: 'Meridian', archetype: 'hacker' });
setState(S);
S.company.act = 3;
S.products.push({ id: 'p1', name: 'Meridian', category: 'devtools', launched: true, features: [{ name: 'X', kind: 'core', day: 1, fit: 1, q: 0, a: 0, p: 0, r: 0 }],
  quality: 0.6, polish: 0.5, appeal: 0.6, reliability: 0.9, price: 30, pricing: 'sub', users: 50000,
  payingUsers: 12000, awareness: 500, mrr: 300000, churnMonthly: 0.03, viralK: 0.2, momentum: 0,
  sentiment: 0.7, peakUsers: 50000, totalRevenue: 0, fairPrice: 30 });
S.activeProductId = 'p1';
S.agents.push({ id: 'a1', name: 'ARIA', model: 'deep', spec: 'engineering', traits: ['meticulous'], tools: [],
  level: 5, xp: 0, morale: 0.9, autonomy: 0.5, lane: 'build', laneDays: 30, hiredDay: 1, contribution: 0, status: 'active', memory: [] });

const MODULES = {
  events: (await import('../src/data/events.js')).EVENTS,
  research: (await import('../src/data/research.js')).RESEARCH,
  projects: (await import('../src/data/projects.js')).PROJECTS,
  threads: (await import('../src/data/threads.js')).THREADS,
  doctrines: (await import('../src/data/doctrines.js')).DOCTRINES,
  directives: (await import('../src/data/directives.js')).DIRECTIVES,
  approaches: (await import('../src/data/approaches.js')).APPROACHES,
  achievements: (await import('../src/data/achievements.js')).ACHIEVEMENTS,
  objectives: (await import('../src/data/objectives.js')).OBJECTIVES,
  scenarios: (await import('../src/data/scenarios.js')).SCENARIOS,
  difficulty: (await import('../src/data/difficulty.js')).DIFFICULTIES,
  characters: Object.values((await import('../src/data/characters.js')).CHARACTERS),
  categories: (await import('../src/data/products.js')).CATEGORIES,
  agentTraits: (await import('../src/data/agents.js')).TRAITS,
  agentTools: (await import('../src/data/agents.js')).AGENT_TOOLS,
  legacyPerks: (await import('../src/data/legacy.js')).LEGACY_PERKS,
  archetypes: (await import('../src/data/legacy.js')).ARCHETYPES,
  regions: (await import('../src/data/regions.js')).REGIONS,
  labs: (await import('../src/data/agirace.js')).LABS,
  endings: (await import('../src/systems/progression.js')).ENDINGS,
  epilogues: (await import('../src/data/epilogues.js')).EPILOGUES,
  advice: (await import('../src/data/advice.js')).ADVICE,
};

const PROSE_KEYS = new Set(['name', 'title', 'desc', 'desc2', 'body', 'text', 'flavour', 'flavor', 'label',
  'sub', 'out', 'hint', 'blurb', 'req', 'tagline', 'line', 'bio', 'note', 'short', 'costLabel', 'perk']);

let issues = 0, checked = 0;
const bad = (where, msg, s) => { issues++; console.log(`  ✗ ${where}: ${msg}\n      "${String(s).slice(0, 140).replace(/\n/g, ' ⏎ ')}"`); };

const RULES = [
  [/\bteh\b|\brecieve|\bseperate|\boccured\b|\bdefinately\b|\bpubicly\b|\bthier\b|\bwiht\b/i, 'likely typo'],
  [/\bTODO\b|\bFIXME\b|\bXXX\b|\blorem\b/i, 'placeholder left in'],
  [/ {2,}/, 'double space'],
  [/\s+[,.;:!?](?!\d)/, 'space before punctuation'],
  [/[a-z],[A-Za-z]/, 'missing space after comma'],
  [/[“”‘’]/, 'curly quote (copy uses straight quotes)'],
  [/\bundefined\b|\bNaN\b|\[object Object\]/, 'leaked value'],
  [/\.\.\./, 'three dots — use …'],
  [/\bi\b(?![.'])/, 'lowercase standalone "i"'],
];

function checkString(where, s) {
  if (typeof s !== 'string' || s.length < 4) return;
  checked++;
  // Fenced blocks and code spans are deliberate formatting, not prose.
  // Replace code with a token (not a space) so stripping cannot manufacture gaps.
  const prose = s.replace(/```[\s\S]*?```/g, 'CODEBLOCK').replace(/`[^`]*`/g, 'CODE');
  for (const [re, msg] of RULES) {
    if (re.test(prose)) { bad(where, msg, s); break; }
  }
}

function walk(where, obj, depth = 0) {
  if (depth > 4 || obj == null) return;
  if (Array.isArray(obj)) { obj.forEach((o, i) => walk(`${where}[${i}]`, o, depth + 1)); return; }
  if (typeof obj !== 'object') return;
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string' && PROSE_KEYS.has(k)) checkString(`${where}.${k}`, v);
    else if (typeof v === 'function' && PROSE_KEYS.has(k)) {
      // Some copy functions take a level rather than the game state.
      for (const arg of [S, 3]) {
        let out = null;
        try { out = v(arg); } catch (e) { continue; }
        if (typeof out === 'string' && !/NaN|\[object Object\]/.test(out)) {
          checkString(`${where}.${k}()`, out); break;
        }
      }
    } else if (Array.isArray(v) || (v && typeof v === 'object')) walk(`${where}.${k}`, v, depth + 1);
  }
}

for (const [mod, list] of Object.entries(MODULES)) {
  (Array.isArray(list) ? list : []).forEach((item) => walk(`${mod}/${item.id || item.name || '?'}`, item));
}

console.log(issues
  ? `\n${issues} copy issue(s) across ${checked} prose strings`
  : `  copy audit clean — ${checked} prose strings checked across ${Object.keys(MODULES).length} content modules`);
process.exit(issues ? 1 : 0);
