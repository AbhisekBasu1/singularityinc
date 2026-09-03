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

// ── The real published surface, at two points in a run ──────────────────────
// The registry publishes a stable capability index — the same names from the
// first card to the credits — and resolves every description once, at
// publication. So "what the browser shows" is `descriptorSnapshot(S)`: name,
// title, description and schema, exactly what `reconcile` mints. It is taken
// twice, at two points in a bot-played run, and every phrase is scored in
// every state that publishes its tool. A phrase whose tool is published in
// neither is a gate failure, not a warning: thirteen phrases used to be
// skipped that way while the summary line counted the rest.
const mc = installModelContext();
const MCP = await import('../src/webmcp/index.js');
const SiteTools = await import('../src/webmcp/tools.js');
const World = await import('../src/world/author.js');
// §A6. Seeded on both sides: the game's stream through `startNewGame` below,
// and the bot's own dice here. Neither was pinned, so the two states this eval
// scores against were a different pair of states every run — and a phrase whose
// tool is published in only one of them is a gate failure rather than a
// warning. The number to print twice is the same number.
const SEED = 4242;
const bot = await makeBot('../src/', { seed: SEED });
const screen = SiteTools.screenTools({
  setView: () => {},
  views: () => [{ id: 'desk', name: 'The Desk' }, { id: 'research', name: 'Research' },
                { id: 'agents', name: 'Agents' }, { id: 'market', name: 'Market' }],
  spotlight: { anchors: () => ['.stat-strip'], anchorHelp: () => '.stat-strip — the readouts', show: () => ({ ok: true }) },
});
const s = bot.Game.startNewGame({ founderName: 'Ada', companyName: 'Meridian', archetype: 'hacker',
                                  category: 'devtools', productName: 'Meridian', seed: SEED });
bot.Loop.stop();
s.tutorialHold = false;   // a session releases this; nothing here does
await MCP.boot({ screen });

const meet = (ids) => { for (const id of ids) s.narrative.relationships[id] = { met: true, affinity: 2, respect: 1, fear: 0, arc: 2 }; };
const snapshot = (label) => ({ label, day: Math.floor(s.time.day), act: s.company.act,
                               tools: MCP.surface.descriptorSnapshot(s) });

// Act II: a young company, three people met, no card open.
bot.play(s, 110);
s.company.act = Math.max(2, s.company.act);
delete s.ending;                 // the harness bot plays through an ending; a live run is the point
meet(['vance', 'sam', 'priya']);
const actII = snapshot('Act II');

// Act III: the whole cast, the rival, a card open, a call the world is playing.
bot.play(s, 150);
s.company.act = Math.max(3, s.company.act);   // before the reconcile, so the
                                              // market and the regulators publish
delete s.ending;
s.market.nemesis = s.market.nemesis || {};
meet(['vance', 'priya', 'crane', 'sam', 'yuki', 'dorne', 'kai', 'weaver', 'nullptr']);
await MCP.surface.reconcile(s, 'evals');
World.writeCard(s, { title: 'A quiet week', kind: 'story',
  body: 'Nothing has broken in nine days and it is making you suspicious.',
  choices: [{ label: 'Ship it', tone: 'good', outcome: 'It goes out.', effects: { rep: 4 } },
            { label: 'Wait', tone: 'neutral', outcome: 'You wait.', effects: { focus: 3 } }] });
// A call the world is playing. Stood up by hand, the way the cast is above:
// the surface only asks whether one is open.
s.calls = { active: { id: 'call_eval', char: 'vance', by: 'world', mode: 'world', day: Math.floor(s.time.day),
  rounds: [{ who: 'them', text: 'we need to talk.', day: 1 }, { who: 'you', text: 'About what?', day: 1 }],
  used: [], node: null, deal: {}, fxLog: [], pending: { id: 'line_eval', text: 'About what?', delivered: true, answered: false },
  done: false, endedBy: null }, log: [], seq: 2, lastRing: -99 };
await MCP.surface.reconcile(s, 'evals');
const actIII = snapshot('Act III');
const STATES = [actII, actIII];

// The snapshot is the surface: what the live registry publishes is the same list.
const live = (await mc.getTools()).map((t) => t.name).sort().join(',');
const snap = actIII.tools.map((t) => t.name).sort().join(',');
if (!snap) { console.log('no tools were published — the surface is broken'); process.exit(1); }
if (live !== snap) {
  console.log(`the registry publishes [${live}] and the snapshot says [${snap}] — this eval is not reading the real surface`);
  process.exit(1);
}

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

// ── One index per state ─────────────────────────────────────────────────────
// IDF is a property of the document set, so each state indexes its own.
//
// Plain L2-normalised cosine. It has a known bias toward short documents, and
// when this surface published fourteen `post_as_*` tools generated from one
// template it was strong enough to put `post_as_kai` above `briefing` for
// "how much runway have I got left", on the word "left", against the only
// document in the set containing "runway". The textbook correction is pivoted
// length normalisation (Singhal et al.), so it was tried, at b = 0.55: top-1
// went from 74% to 64% and two phrases fell out of the top five. It over-
// penalised the long documents, which on this surface are the ones actually
// carrying the domain vocabulary. Recorded here because being wrong in a
// specific way is more useful than being vaguely right, and because the number
// below is a plain-cosine number and should be read as one.
function index(tools) {
  const docs = tools.map((t) => ({ name: t.name, terms: terms(docFor(t)) }));
  const N = docs.length;
  const df = new Map();
  for (const d of docs) for (const w of new Set(d.terms)) df.set(w, (df.get(w) || 0) + 1);
  const idf = (w) => Math.log((N + 1) / ((df.get(w) || 0) + 1)) + 1;
  const vec = (ts) => {
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
  };
  const docVecs = new Map(docs.map((d) => [d.name, vec(d.terms)]));
  return { docs, vec, docVecs, names: new Set(docs.map((d) => d.name)) };
}
const cos = (a, b) => {
  let sum = 0;
  const [small, big] = a.size < b.size ? [a, b] : [b, a];
  for (const [w, x] of small) { const y = big.get(w); if (y) sum += x * y; }
  return sum;
};

let fails = 0, warns = 0;
const fail = (m) => { fails++; console.log('  ✗ ' + m); };
const warn = (m) => { warns++; console.log('  ! ' + m); };

// A stable surface publishes the same descriptors in both states; scoring
// them twice would double every count and say nothing new. Scored once when
// they are byte-identical, and the summary says so; in both when they differ.
const identical = JSON.stringify(actII.tools) === JSON.stringify(actIII.tools);
const scoredStates = identical ? [actIII] : STATES;
console.log(identical
  ? `\n── ${actIII.tools.length} tools published — the same descriptors at day ${actII.day} (Act ${actII.act}) and day ${actIII.day} (Act ${actIII.act}), so the surface is scored once ──`
  : `\n── ${actII.tools.length} tools at day ${actII.day} (Act ${actII.act}), ${actIII.tools.length} at day ${actIII.day} (Act ${actIII.act}) — scored in both ──`);

const DUP = 0.60;
for (const st of scoredStates) {
  st.ix = index(st.tools);
  const tag = identical ? '' : ` [${st.label}]`;
  const { docs, docVecs } = st.ix;

  // ── Gate 1: no two tools may be lexically indistinguishable ───────────────
  let worstPair = { sim: 0 };
  for (let i = 0; i < docs.length; i++) {
    for (let j = i + 1; j < docs.length; j++) {
      const sim = cos(docVecs.get(docs[i].name), docVecs.get(docs[j].name));
      if (sim > worstPair.sim) worstPair = { sim, a: docs[i].name, b: docs[j].name };
      if (sim > DUP) fail(`${docs[i].name} and ${docs[j].name} read the same${tag} (cosine ${sim.toFixed(2)} > ${DUP})`);
    }
  }
  console.log(`  closest pair${tag}: ${worstPair.a} / ${worstPair.b} at ${worstPair.sim.toFixed(2)} (limit ${DUP})`);

  // ── Gate 2: opening clauses ───────────────────────────────────────────────
  // A model reads the first clause and stops, so two tools may not begin alike.
  const opens = new Map();
  for (const t of st.tools) {
    const first = String(t.description).split(/[.:—]/)[0].trim().toLowerCase();
    if (opens.has(first)) fail(`${t.name} opens exactly like ${opens.get(first)}${tag}`);
    opens.set(first, t.name);
  }
}

// ── Gate 3: the phrases, in every state that publishes their tool ───────────
const published = new Set(STATES.flatMap((st) => st.tools.map((t) => t.name)));
const ranks = [];
const perState = new Map(scoredStates.map((st) => [st.label, { n: 0, top1: 0, top3: 0 }]));
let top1 = 0, top3 = 0, unreachable = 0, skipped = 0;
const misses = [];

for (const c of cases) {
  const where = scoredStates.filter((st) => st.ix.names.has(c.intended));
  if (!where.length) {
    fail(`"${c.say}" wants ${c.intended}, which is published in neither state — retarget the phrase or publish the tool`);
    skipped++;
    continue;
  }
  const lower = c.say.toLowerCase();
  for (const n of published) {
    if (lower.includes(n) || lower.includes(n.replace(/_/g, ' '))) fail(`"${c.say}" names a tool (${n})`);
  }
  for (const st of where) {
    const tag = identical ? '' : ` [${st.label}]`;
    const { docs, docVecs, vec } = st.ix;
    const q = vec(terms(c.say));
    const scored = docs.map((d) => ({ name: d.name, score: cos(q, docVecs.get(d.name)) }))
                       .sort((a, b) => b.score - a.score);
    if (scored[0].score <= 0) { fail(`"${c.say}"${tag} matches nothing at all`); unreachable++; continue; }
    const accept = new Set([c.intended, ...(c.also || [])]);
    const rank = scored.findIndex((x) => accept.has(x.name)) + 1;
    if (rank === 0) { fail(`"${c.say}"${tag} cannot reach ${c.intended} at any rank`); unreachable++; continue; }
    ranks.push(rank);
    const ps = perState.get(st.label);
    ps.n++;
    if (rank === 1) { top1++; ps.top1++; }
    if (rank <= 3) { top3++; ps.top3++; }
    if (rank > 5) fail(`"${c.say}"${tag} → ${c.intended} ranks ${rank} (top-5 required); winner was ${scored[0].name}`);
    else if (rank > 1) misses.push({ say: c.say, want: c.intended, rank, tag, got: scored.slice(0, 3).map((x) => `${x.name} ${x.score.toFixed(2)}`) });
  }
}

// ── Gate 4: every tool is exercised ─────────────────────────────────────────
const exercised = new Set(cases.map((c) => c.intended));
for (const name of [...published].sort()) {
  if (!exercised.has(name)) fail(`${name} is never asked for by any phrase`);
}

// ── Report ──────────────────────────────────────────────────────────────────
const scored = ranks.length;
const median = ranks.length ? ranks.slice().sort((a, b) => a - b)[Math.floor(ranks.length / 2)] : 0;
console.log(`\n── ${cases.length} phrases, ${scored} scored${identical ? '' : ` across ${scoredStates.length} states`}${skipped ? `, ${skipped} unscorable` : ''} ──`);
console.log(`  top-1        ${top1}/${scored}  (${Math.round((top1 / scored) * 100)}%)`);
console.log(`  top-3        ${top3}/${scored}  (${Math.round((top3 / scored) * 100)}%)`);
if (!identical) for (const [label, ps] of perState) console.log(`  ${label.padEnd(12)} top-1 ${ps.top1}/${ps.n} · top-3 ${ps.top3}/${ps.n}`);
console.log(`  median rank  ${median}`);
console.log(`  unreachable  ${unreachable}`);

if (VERBOSE && misses.length) {
  console.log('\n── where the intended tool did not win ──');
  for (const m of misses) console.log(`  ${m.rank}. "${m.say}"${m.tag}\n       want ${m.want} · got ${m.got.join(' | ')}`);
}

console.log(fails ? `\n${fails} gate failure(s)${warns ? `, ${warns} warning(s)` : ''}`
                  : `\nselection gates clean${warns ? ` · ${warns} warning(s)` : ''}`);
process.exit(fails ? 1 : 0);
