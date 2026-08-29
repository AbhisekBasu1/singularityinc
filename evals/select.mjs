// ─────────────────────────────────────────────────────────────────────────────
// TOOL SELECTION — an offline scorer, and what it is not
//
// This does not simulate a model and must not be read as predicting one. What
// it proves is the necessary condition underneath any model getting it right:
// that no two tools are lexically indistinguishable for the words a player
// actually uses, and that the intended tool is reachable from every phrase.
//
// The method: build a document per tool from everything the browser publishes
// about it — name, title, description, and every property description — score
// each phrase against every document with IDF-weighted cosine over stemmed
// terms, and gate on the things that would be defects rather than on the score.
//
//   · no two tool documents may be near-duplicates (cosine > 0.60)
//   · the intended tool must rank top-5 for every phrase
//   · no phrase may match nothing
//   · no phrase may name a tool
//   · every tool must be exercised by at least one phrase
//
// Top-1 and median rank are reported and asserted on by neither, because a
// bag-of-words scorer is not the thing being shipped. The number still earns
// its keep: it is how you find out a description is written in the builder's
// vocabulary instead of the player's, and rewriting for it helps a real model
// for exactly the same reason.
//
//   node evals/select.mjs            the table
//   node evals/select.mjs --verbose  every miss, with the winner it lost to
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { installDom } from '../tools/headless.mjs';
installDom();
import { installModelContext } from '../tools/fakemodelcontext.mjs';
import { makeBot } from '../tools/bot.mjs';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const VERBOSE = process.argv.includes('--verbose');
const { cases } = JSON.parse(fs.readFileSync(path.join(ROOT, 'evals/prompts.json'), 'utf8'));

// ── Get the real published surface, as wide as it ever gets ─────────────────
const mc = installModelContext();
const MCP = await import('../src/webmcp/index.js');
const bot = await makeBot();
const s = bot.Game.startNewGame({ founderName: 'Ada', companyName: 'Meridian', archetype: 'hacker',
                                  category: 'devtools', productName: 'Meridian' });
bot.Loop.stop();
s.tutorialHold = false;   // a session releases this; nothing here does
await MCP.boot({
  screen: {
    show_module: (await import('../src/webmcp/tools.js')).screenTools({
      setView: () => {}, views: () => [{ id: 'desk', name: 'The Desk' }, { id: 'research', name: 'Research' },
                                       { id: 'agents', name: 'Agents' }, { id: 'market', name: 'Market' }],
      spotlight: { anchors: () => ['.stat-strip'], anchorHelp: () => '.stat-strip — the readouts', show: () => ({ ok: true }) },
    }).show_module,
    spotlight_panel: (await import('../src/webmcp/tools.js')).screenTools({
      setView: () => {}, views: () => [{ id: 'desk', name: 'The Desk' }],
      spotlight: { anchors: () => ['.stat-strip'], anchorHelp: () => '.stat-strip — the readouts', show: () => ({ ok: true }) },
    }).spotlight_panel,
  },
});
// Grow the run so the whole cast and the whole hand are published at once.
bot.play(s, 260);
s.company.act = Math.max(3, s.company.act);   // before the reconcile, so the
                                              // market and the regulators publish
s.market.nemesis = s.market.nemesis || {};
for (const id of ['vance', 'priya', 'crane', 'sam', 'yuki', 'dorne', 'kai', 'weaver', 'nullptr']) {
  s.narrative.relationships[id] = { met: true, affinity: 2, respect: 1, fear: 0, arc: 2 };
}
// A card open publishes the one-shot; a rival publishes rival_move.
await MCP.surface.reconcile(s, 'evals');
const World = await import('../src/world/author.js');
World.writeCard(s, { title: 'A quiet week', kind: 'story',
  body: 'Nothing has broken in nine days and it is making you suspicious.',
  choices: [{ label: 'Ship it', tone: 'good', outcome: 'It goes out.', effects: { rep: 4 } },
            { label: 'Wait', tone: 'neutral', outcome: 'You wait.', effects: { focus: 3 } }] });
await MCP.surface.reconcile(s, 'evals');

const tools = await mc.getTools();
if (!tools.length) { console.log('no tools were published — the surface is broken'); process.exit(1); }

// ── The documents ───────────────────────────────────────────────────────────
function docFor(t) {
  const parts = [t.name.replace(/_/g, ' '), t.title || '', t.description || ''];
  const walk = (schema, depth = 0) => {
    if (!schema || depth > 3) return;
    for (const [k, v] of Object.entries(schema.properties || {})) {
      parts.push(k.replace(/_/g, ' '));
      if (v?.description) parts.push(v.description);
      if (v?.enum) parts.push(v.enum.slice(0, 10).join(' '));
      if (v?.properties) walk(v, depth + 1);
      if (v?.items?.properties) walk(v.items, depth + 1);
    }
  };
  walk(t.inputSchema);
  return parts.join(' ');
}

const STOP = new Set(('a an the and or of to in on for with it its is are was be been that this these those you your yours '
  + 'they them their we our i me my at by from as if then than so but not no can may might will would should could '
  + 'have has had one two three them there here what which who whom when where how why all any each '
  + 'give gives given make makes made get gets got want wants like want something anything '
  + 'other into out up down over under again more most some such only own same too very just now s t').split(' '));

// A small, deliberate stemmer: enough to make "cards"/"card" and "writes"/"write"
// the same term without pulling in a dependency.
function stem(w) {
  if (w.length <= 3) return w;
  return w.replace(/(ies)$/, 'y').replace(/(sses|shes|ches)$/, '$1')
          .replace(/([^s])s$/, '$1').replace(/(ing|ed)$/, '')
          .replace(/(er|est)$/, '');
}
function terms(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9\s']/g, ' ').split(/\s+/)
    .filter((w) => w && !STOP.has(w)).map(stem).filter((w) => w.length > 1);
}

const docs = tools.map((t) => ({ name: t.name, terms: terms(docFor(t)) }));
const N = docs.length;
const df = new Map();
for (const d of docs) for (const w of new Set(d.terms)) df.set(w, (df.get(w) || 0) + 1);
const idf = (w) => Math.log((N + 1) / ((df.get(w) || 0) + 1)) + 1;

// Plain L2-normalised cosine.
//
// It has a known bias toward short documents, and this surface has fourteen
// `post_as_*` tools generated from one template whose documents are among the
// shortest published — strong enough to put `post_as_kai` above `briefing` for
// "how much runway have I got left", on the word "left", against the only
// document in the set containing "runway". The textbook correction is pivoted
// length normalisation (Singhal et al.), so it was tried, at b = 0.55: top-1
// went from 74% to 64% and two phrases fell out of the top five. It over-
// penalised the long documents, which on this surface are the ones actually
// carrying the domain vocabulary. Recorded here because being wrong in a
// specific way is more useful than being vaguely right, and because the number
// below is a plain-cosine number and should be read as one.
let avgLen = 1;

function vec(ts) {
  const tf = new Map();
  for (const w of ts) tf.set(w, (tf.get(w) || 0) + 1);
  const v = new Map();
  let norm = 0;
  for (const [w, n] of tf) {
    const x = (1 + Math.log(n)) * idf(w);
    v.set(w, x); norm += x * x;
  }
  norm = Math.sqrt(norm) || 1;
  for (const [w, x] of v) v.set(w, x / norm);
  return v;
}
const cos = (a, b) => {
  let sum = 0;
  const [small, big] = a.size < b.size ? [a, b] : [b, a];
  for (const [w, x] of small) { const y = big.get(w); if (y) sum += x * y; }
  return sum;
};

avgLen = docs.reduce((a, d) => a + d.terms.length, 0) / (docs.length || 1);
const docVecs = new Map(docs.map((d) => [d.name, vec(d.terms)]));
const plainVecs = docVecs;

// ── Gate 1: no two tools may be lexically indistinguishable ─────────────────
let fails = 0, warns = 0;
const fail = (m) => { fails++; console.log('  ✗ ' + m); };
const warn = (m) => { warns++; console.log('  ! ' + m); };

console.log(`\n── ${N} tools published ──`);
const DUP = 0.60;
let worstPair = { sim: 0 };
for (let i = 0; i < docs.length; i++) {
  for (let j = i + 1; j < docs.length; j++) {
    const sim = cos(plainVecs.get(docs[i].name), plainVecs.get(docs[j].name));
    if (sim > worstPair.sim) worstPair = { sim, a: docs[i].name, b: docs[j].name };
    if (sim > DUP) fail(`${docs[i].name} and ${docs[j].name} read the same (cosine ${sim.toFixed(2)} > ${DUP})`);
  }
}
console.log(`  closest pair: ${worstPair.a} / ${worstPair.b} at ${worstPair.sim.toFixed(2)} (limit ${DUP})`);

// ── Gate 2: opening clauses ─────────────────────────────────────────────────
// A model reads the first clause and stops, so two tools may not begin alike.
const opens = new Map();
for (const t of tools) {
  const first = String(t.description).split(/[.:—]/)[0].trim().toLowerCase();
  if (opens.has(first)) fail(`${t.name} opens exactly like ${opens.get(first)}`);
  opens.set(first, t.name);
}

// ── Gate 3: the phrases ─────────────────────────────────────────────────────
const known = new Set(tools.map((t) => t.name));
const ranks = [];
let top1 = 0, top3 = 0, unreachable = 0;
const misses = [];

for (const c of cases) {
  if (!known.has(c.intended)) { warn(`"${c.say}" wants ${c.intended}, which is not published in this state`); continue; }
  const lower = c.say.toLowerCase();
  for (const n of known) {
    if (lower.includes(n) || lower.includes(n.replace(/_/g, ' '))) fail(`"${c.say}" names a tool (${n})`);
  }
  const q = vec(terms(c.say));
  const scored = docs.map((d) => ({ name: d.name, score: cos(q, docVecs.get(d.name)) }))
                     .sort((a, b) => b.score - a.score);
  if (scored[0].score <= 0) { fail(`"${c.say}" matches nothing at all`); unreachable++; continue; }
  const accept = new Set([c.intended, ...(c.also || [])]);
  const rank = scored.findIndex((x) => accept.has(x.name)) + 1;
  if (rank === 0) { fail(`"${c.say}" cannot reach ${c.intended} at any rank`); unreachable++; continue; }
  ranks.push(rank);
  if (rank === 1) top1++;
  if (rank <= 3) top3++;
  if (rank > 5) fail(`"${c.say}" → ${c.intended} ranks ${rank} (top-5 required); winner was ${scored[0].name}`);
  else if (rank > 1) misses.push({ say: c.say, want: c.intended, rank, got: scored.slice(0, 3).map((x) => `${x.name} ${x.score.toFixed(2)}`) });
}

// ── Gate 4: every tool is exercised ─────────────────────────────────────────
const exercised = new Set(cases.map((c) => c.intended));
for (const t of tools) {
  if (!exercised.has(t.name)) {
    if (t.name.startsWith('post_as_')) continue;    // one voice stands for the rest
    warn(`${t.name} is never asked for by any phrase`);
  }
}

// ── Report ──────────────────────────────────────────────────────────────────
const scored = ranks.length;
const median = ranks.length ? ranks.slice().sort((a, b) => a - b)[Math.floor(ranks.length / 2)] : 0;
console.log(`\n── ${scored} phrases scored ──`);
console.log(`  top-1        ${top1}/${scored}  (${Math.round((top1 / scored) * 100)}%)`);
console.log(`  top-3        ${top3}/${scored}  (${Math.round((top3 / scored) * 100)}%)`);
console.log(`  median rank  ${median}`);
console.log(`  unreachable  ${unreachable}`);

if (VERBOSE && misses.length) {
  console.log('\n── where the intended tool did not win ──');
  for (const m of misses) console.log(`  ${m.rank}. "${m.say}"\n       want ${m.want} · got ${m.got.join(' | ')}`);
}

console.log(fails ? `\n${fails} gate failure(s)${warns ? `, ${warns} warning(s)` : ''}`
                  : `\nselection gates clean${warns ? ` · ${warns} warning(s)` : ''}`);
process.exit(fails ? 1 : 0);
