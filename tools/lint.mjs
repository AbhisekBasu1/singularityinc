// Static content lint: catches the mistakes that only show up at runtime.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
let problems = 0;
const fail = (f, msg) => { problems++; console.log(`  ✗ ${f}: ${msg}`); };

// 1. Event data files: `sub:`/`label:` template literals must not reference S
//    unless declared as a function.
for (const f of fs.readdirSync(path.join(ROOT, 'src/data')).filter((x) => /^events\d*\.js$/.test(x))) {
  const src = fs.readFileSync(path.join(ROOT, 'src/data', f), 'utf8');
  const re = /(sub|label):\s*`([^`]*)`/g;
  let m;
  while ((m = re.exec(src))) {
    if (/\bS\./.test(m[2]) || /\b(users|mrr)\(S\)/.test(m[2])) {
      const line = src.slice(0, m.index).split('\n').length;
      fail(f + ':' + line, `${m[1]} references S but is not a function — use ${m[1]}: (S) => \`…\``);
    }
  }
  // 2. Every choice needs a label and an effect.
  const ids = src.match(/id: '([\w_]+)'/g) || [];
  if (!ids.length) fail(f, 'no event ids found');
}

// 3. Research reqs must resolve; acts must be non-decreasing along edges.
const research = await import('../src/data/research.js');
const rmap = research.RESEARCH_MAP;
for (const n of research.RESEARCH) {
  for (const r of n.reqs) {
    if (!rmap[r]) fail('research.js', `${n.id} requires missing node ${r}`);
    else if ((rmap[r].act || 1) > (n.act || 1)) fail('research.js', `${n.id} (act ${n.act}) requires ${r} from a later act ${rmap[r].act}`);
    else if ((rmap[r].tier || 1) > (n.tier || 1)) fail('research.js', `${n.id} (tier ${n.tier}) requires higher-tier ${r} (tier ${rmap[r].tier})`);
  }
  if (n.unlock && typeof n.unlock !== 'string') fail('research.js', `${n.id} unlock must be a string`);
}

// 4. Unlock keys referenced by agents/products/projects must be produced somewhere.
const produced = new Set(research.RESEARCH.map((n) => n.unlock).filter(Boolean));
['own_foundation_model', 'recursive_self_improvement', 'ascension_protocol'].forEach((k) => produced.add(k));
const agents = await import('../src/data/agents.js');
for (const m of Object.values(agents.MODELS)) {
  if (m.req && !produced.has(m.req) && !rmap[m.req]) fail('agents.js', `model ${m.id} requires unknown unlock ${m.req}`);
}
for (const t of agents.AGENT_TOOLS) {
  if (t.req && !rmap[t.req]) fail('agents.js', `tool ${t.id} requires unknown research ${t.req}`);
}
const projects = await import('../src/data/projects.js');
for (const p of projects.PROJECTS) {
  if (p.req && !rmap[p.req]) fail('projects.js', `project ${p.id} requires unknown research ${p.req}`);
  if (!p.effects || !Object.keys(p.effects).length) fail('projects.js', `project ${p.id} has no effects`);
}

// 5. Characters referenced by events must exist.
const chars = await import('../src/data/characters.js');
const events = await import('../src/data/events.js');
for (const e of events.EVENTS) {
  if (e.char && !chars.CHARACTERS[e.char]) fail('events', `${e.id} references unknown character ${e.char}`);
  if (!e.choices?.length) fail('events', `${e.id} has no choices`);
  for (const c of e.choices || []) {
    if (!c.label) fail('events', `${e.id} has a choice with no label`);
    if (!c.effect) fail('events', `${e.id} choice "${String(c.label).slice(0, 30)}" has no effect`);
  }
  if (e.chained && e.weight) fail('events', `${e.id} is chained but also has a weight`);
}

// 6. Chained events must actually be reachable from some fx.chain() call.
const allSrc = fs.readdirSync(path.join(ROOT, 'src/data'))
  .filter((x) => /^events\d*\.js$/.test(x))
  .map((x) => fs.readFileSync(path.join(ROOT, 'src/data', x), 'utf8')).join('\n');
for (const e of events.EVENTS) {
  if (e.chained && !allSrc.includes(`fx.chain('${e.id}'`)) fail('events', `${e.id} is chained but nothing calls fx.chain for it`);
}

// 6b. Live threads: valid options and known effect keys.
const threads = await import('../src/data/threads.js');
const FX_KEYS = new Set(['rep','cash','code','insight','research','debt','focus','align','heat','opinion','awareness','sentiment']);
for (const t of threads.THREADS) {
  if (!t.text) fail('threads.js', `${t.id} has no text`);
  if (!t.opts?.length || t.opts.length < 2) fail('threads.js', `${t.id} needs at least two options`);
  for (const o of t.opts || []) {
    if (!o.label) fail('threads.js', `${t.id} option missing label`);
    if (!o.out) fail('threads.js', `${t.id} option "${o.label}" missing outcome text`);
    for (const k of Object.keys(o.fx || {})) {
      if (!FX_KEYS.has(k)) fail('threads.js', `${t.id} option "${o.label}" uses unknown effect key "${k}"`);
    }
  }
}
{ const ids = threads.THREADS.map((t) => t.id);
  const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  if (dup.length) fail('threads.js', `duplicate ids: ${[...new Set(dup)].join(', ')}`); }

// 6c. Prompt approaches: bands must sum to ~1.
const approaches = await import('../src/data/approaches.js');
for (const a of approaches.APPROACHES) {
  const sum = a.bands.reduce((x, b) => x + b.p, 0);
  if (Math.abs(sum - 1) > 0.02) fail('approaches.js', `${a.id} band probabilities sum to ${sum.toFixed(3)}, not 1`);
  if (!a.scales) fail('approaches.js', `${a.id} has no scaling skill`);
}

// 6d. Doctrines and directives must be well formed.
const doctrines = await import('../src/data/doctrines.js');
for (const d of doctrines.DOCTRINES) {
  if (!d.mods || !Object.keys(d.mods).length) fail('doctrines.js', `${d.id} has no mods`);
  if (!d.hint || !d.flavour) fail('doctrines.js', `${d.id} missing hint or flavour`);
}
const directives = await import('../src/data/directives.js');
for (const d of directives.DIRECTIVES) {
  if (d.id !== 'none' && (!d.mods || !Object.keys(d.mods).length)) fail('directives.js', `${d.id} has no mods`);
}

// 6e. Ending commitments: every non-auto ending needs exactly three, well formed.
const commitments = await import('../src/data/commitments.js');
const progression = await import('../src/systems/progression.js');
for (const e of progression.ENDINGS) {
  if (e.auto || e.viaEvent) continue;
  const list = commitments.commitmentsFor(e.id);
  if (list.length !== 3) fail('commitments.js', `${e.id} has ${list.length} commitments, expected 3`);
  for (const c of list) {
    if (!c.name || !c.desc) fail('commitments.js', `${e.id}/${c.id} missing name or desc`);
    if (c.kind === 'act' && !c.do) fail('commitments.js', `${e.id}/${c.id} is an act with no do()`);
    if (c.kind === 'state' && !c.test) fail('commitments.js', `${e.id}/${c.id} is a state check with no test()`);
    if (c.kind === 'act' && !c.costLabel) fail('commitments.js', `${e.id}/${c.id} has no costLabel`);
  }
  const ids = list.map((c) => c.id);
  if (new Set(ids).size !== ids.length) fail('commitments.js', `${e.id} has duplicate commitment ids`);
}

// 6e2. Epilogues
const epi = await import('../src/data/epilogues.js');
{ const ids = epi.EPILOGUES.map((x) => x.id);
  const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  if (dup.length) fail('epilogues.js', `duplicate ids: ${[...new Set(dup)].join(', ')}`);
  for (const x of epi.EPILOGUES) {
    if (typeof x.text !== 'function') fail('epilogues.js', `${x.id} text must be a function`);
    if (typeof x.priority !== 'number') fail('epilogues.js', `${x.id} needs a priority`);
  } }

// 6f. Difficulties
const diff = await import('../src/data/difficulty.js');
for (const d of diff.DIFFICULTIES) {
  if (!d.name || !d.desc || !d.tagline) fail('difficulty.js', `${d.id} missing copy`);
  if (typeof d.legacyMult !== 'number') fail('difficulty.js', `${d.id} has no legacyMult`);
}

// 6g. Scenarios
const scen = await import('../src/data/scenarios.js');
for (const sc of scen.SCENARIOS) {
  if (!sc.name || !sc.desc || !sc.tagline) fail('scenarios.js', `${sc.id} missing copy`);
  if (typeof sc.apply !== 'function') fail('scenarios.js', `${sc.id} has no apply()`);
  if (typeof sc.legacyMult !== 'number') fail('scenarios.js', `${sc.id} has no legacyMult`);
}

// 7. Objectives / achievements must have unique ids.
const obj = await import('../src/data/objectives.js');
const ach = await import('../src/data/achievements.js');
for (const [name, list] of [['objectives', obj.OBJECTIVES], ['achievements', ach.ACHIEVEMENTS]]) {
  const ids = list.map((x) => x.id);
  const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  if (dup.length) fail(name, `duplicate ids: ${[...new Set(dup)].join(', ')}`);
}

console.log(problems ? `\n${problems} lint problem(s)`
  : `  content lint clean — ${events.EVENTS.length} events · ${research.RESEARCH.length} research · ${projects.PROJECTS.length} projects · ${threads.THREADS.length} threads · ${doctrines.DOCTRINES.length} doctrines · ${directives.DIRECTIVES.length} directives · ${epi.EPILOGUES.length} epilogues · ${scen.SCENARIOS.length} scenarios`);
process.exit(problems ? 1 : 0);
