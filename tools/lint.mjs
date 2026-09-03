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
  // §A12c. A `scaleWith` names one of three readers and a par worth reading.
  if (n.scaleWith) {
    if (!['users', 'features', 'roster'].includes(n.scaleWith.read)) {
      fail('research.js', `${n.id} scaleWith reads unknown ${n.scaleWith.read}`);
    }
    if (!(n.scaleWith.at > 0)) fail('research.js', `${n.id} scaleWith needs a par above zero`);
  }
}

// 3b. §A12a. Exclusions are symmetric, and never sit on the required chain of a
// node an act gate or an ending names — a door that closes an ending is not a
// choice, it is a dead run, and nothing else in the tree would say so.
{
  const chain = new Set();
  const walk = (id) => { if (!id || chain.has(id)) return; chain.add(id);
    for (const r of rmap[id]?.reqs || []) walk(r); };
  ['own_foundation_model', 'model_frontier', 'recursive_self_improvement',
   'mind_uploading', 'stellar_engineering', 'the_question'].forEach(walk);
  for (const n of research.RESEARCH) {
    for (const x of n.excludes || []) {
      if (!rmap[x]) { fail('research.js', `${n.id} excludes missing node ${x}`); continue; }
      if (!(rmap[x].excludes || []).includes(n.id)) {
        fail('research.js', `${n.id} excludes ${x} but ${x} does not exclude it back`);
      }
      if (chain.has(n.id)) fail('research.js', `${n.id} is on a gate or ending chain and may not carry excludes`);
      if (chain.has(x)) fail('research.js', `${n.id} excludes ${x}, which a gate or an ending needs`);
    }
  }
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
const FX_KEYS = new Set(['rep','cash','code','insight','research','debt','focus','align','heat','opinion','awareness','sentiment','autonomy','flag']);
// A thread is one question or a family of `stages`, never both, and every
// stage has the shape a thread has. `until` is the last act it may open in.
// `fx` may be a function of the run; it is evaluated against a probe state and
// its keys checked like any other.
const threadProbe = (await import('../src/engine/state.js')).newGame({});
for (const t of threads.THREADS) {
  const staged = Array.isArray(t.stages);
  if (staged && (t.text || t.opts)) fail('threads.js', `${t.id} has stages and a top-level text or opts — one or the other`);
  if (staged && t.stages.length < 2) fail('threads.js', `${t.id} has fewer than two stages — write it as a plain thread`);
  if (t.until && t.act && t.until < t.act) fail('threads.js', `${t.id} ends (until ${t.until}) before it begins (act ${t.act})`);
  (staged ? t.stages : [t]).forEach((f, i) => {
    const at = staged ? `${t.id}[${i}]` : t.id;
    if (!f.text) fail('threads.js', `${at} has no text`);
    if (!f.opts?.length || f.opts.length < 2) fail('threads.js', `${at} needs at least two options`);
    for (const o of f.opts || []) {
      if (!o.label) fail('threads.js', `${at} option missing label`);
      if (!o.out) fail('threads.js', `${at} option "${o.label}" missing outcome text`);
      let fx = o.fx || {};
      if (typeof fx === 'function') { try { fx = fx(threadProbe) || {}; } catch (e) { fail('threads.js', `${at} option "${o.label}" fx threw: ${e.message}`); fx = {}; } }
      for (const [k, v] of Object.entries(fx)) {
        if (!FX_KEYS.has(k)) fail('threads.js', `${at} option "${o.label}" uses unknown effect key "${k}"`);
        if (k !== 'flag' && !Number.isFinite(v)) fail('threads.js', `${at} option "${o.label}" effect ${k} is not a number`);
      }
    }
  });
}
{ const ids = threads.THREADS.map((t) => t.id);
  const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  if (dup.length) fail('threads.js', `duplicate ids: ${[...new Set(dup)].join(', ')}`); }

// 6b2. Mail: every letter has a sender, a subject, a body and known reply keys.
const mail = await import('../src/data/mail.js');
{ const ids = mail.LETTERS.map((l) => l.id);
  const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  if (dup.length) fail('mail.js', `duplicate ids: ${[...new Set(dup)].join(', ')}`);
  for (const l of mail.LETTERS) {
    if (!l.from?.name) fail('mail.js', `${l.id} has no sender`);
    if (l.from?.char && !chars.CHARACTERS[l.from.char]) fail('mail.js', `${l.id} is from unknown character ${l.from.char}`);
    if (!l.subject) fail('mail.js', `${l.id} has no subject`);
    if (typeof l.body !== 'function' || typeof l.when !== 'function') fail('mail.js', `${l.id} needs body(S) and when(S)`);
    for (const o of l.ask || []) {
      if (!o.label || !o.out) fail('mail.js', `${l.id} reply missing label or outcome`);
      for (const k of Object.keys(o.fx || {})) if (!FX_KEYS.has(k)) fail('mail.js', `${l.id} reply "${o.label}" uses unknown effect key "${k}"`);
    }
    if (threads.THREADS.some((t) => t.id === l.id)) fail('mail.js', `${l.id} collides with a thread id`);
  } }

// 6b2a. Every reply label is unique across every ask in the game — the Wire's
// threads, every stage of a family, and the letters that ask. Two open items
// offering the same word are one decision printed twice: measured before this
// rule, "Decline" sat on seven asks and "Grant it" on all five retros.
{ const seen = new Map();
  const claim = (where, label) => {
    const k = String(label ?? '').trim().toLowerCase();
    if (seen.has(k)) fail('threads.js', `reply label "${label}" on ${where} is already on ${seen.get(k)}`);
    else seen.set(k, where);
  };
  for (const t of threads.THREADS) {
    const staged = Array.isArray(t.stages);
    (staged ? t.stages : [t]).forEach((f, i) => (f.opts || []).forEach((o) => claim(staged ? `${t.id}[${i}]` : t.id, o.label)));
  }
  for (const l of mail.LETTERS) (l.ask || []).forEach((o) => claim(l.id, o.label));
}

// 6b3. The phone: every topic has a line, a reply and a noun; every effect key
// is one the collector knows; ids are unique per person across the whole tree.
{ const { CALLS } = await import('../src/data/calls.js');
  const { newGame } = await import('../src/engine/state.js');
  const probe = newGame({});
  const CALL_FX = new Set([...FX_KEYS, 'affinity', 'respect', 'fear', 'flags', 'sleep', 'users', 'influence', 'equity', 'compute']);
  const rel = { met: true, affinity: 0, arc: 0 };
  for (const [id, tree] of Object.entries(CALLS)) {
    for (const k of ['pickup', 'busy', 'bye']) if (typeof tree[k] !== 'function') fail('calls.js', `${id} has no ${k}()`);
    if (typeof tree.recall !== 'function') fail('calls.js', `${id} has no recall() — the phone would not remember`);
    const seen = new Set();
    const walk = (t, where) => {
      if (!t.id) fail('calls.js', `${where} topic has no id`);
      if (seen.has(t.id)) fail('calls.js', `${id}: topic id "${t.id}" is used twice`);
      seen.add(t.id);
      if (!t.label) fail('calls.js', `${id}.${t.id} has no label`);
      if (!t.reply) fail('calls.js', `${id}.${t.id} has no reply`);
      if (!t.about) fail('calls.js', `${id}.${t.id} has no about — recall() has nothing to name`);
      let fx = t.fx || {};
      if (typeof fx === 'function') { try { fx = fx(probe, rel) || {}; } catch (e) { fail('calls.js', `${id}.${t.id}.fx threw: ${e.message}`); fx = {}; } }
      for (const k of Object.keys(fx)) if (!CALL_FX.has(k)) fail('calls.js', `${id}.${t.id} uses unknown effect key "${k}"`);
      for (const f of t.follow || []) walk(f, `${id}.${t.id}.follow`);
    };
    for (const t of tree.topics || []) walk(t, id);
    const ringIds = new Set();
    for (const g of tree.rings || []) {
      if (!g.id || ringIds.has(g.id)) fail('calls.js', `${id} ring id missing or duplicated: ${g.id}`);
      ringIds.add(g.id);
      if (typeof g.when !== 'function' || typeof g.opening !== 'function') fail('calls.js', `${id}.${g.id} needs when(S, r) and opening(S, r)`);
      if (!g.topics?.length) fail('calls.js', `${id}.${g.id} has nothing to say back`);
      for (const t of g.topics || []) walk(t, `${id}.${g.id}`);
    }
  } }

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

// 8. The preload lists in the two index files are generated from the import
//    graph (`tools/preload.mjs`). A stale list is a slow first load and not a
//    broken page, so nothing but this would ever notice it.
{
  const { stale } = await import('./preload.mjs');
  for (const x of stale()) {
    fail(x.file, `modulepreload list is ${x.noBlock ? 'missing' : 'stale'}`
      + (x.noBlock ? '' : ` (${x.missing} not listed, ${x.extra} not imported${x.reordered ? ', order changed' : ''})`)
      + ' — run node tools/preload.mjs');
  }
}

console.log(problems ? `\n${problems} lint problem(s)`
  : `  content lint clean — ${events.EVENTS.length} events · ${research.RESEARCH.length} research · ${projects.PROJECTS.length} projects · ${threads.THREADS.length} threads · ${doctrines.DOCTRINES.length} doctrines · ${directives.DIRECTIVES.length} directives · ${epi.EPILOGUES.length} epilogues · ${scen.SCENARIOS.length} scenarios`);
process.exit(problems ? 1 : 0);
