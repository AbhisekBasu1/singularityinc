// Walkthrough integrity: every step points at something that actually exists,
// every chapter is reachable, and every lesson renders.
//
// A tutorial that spotlights a selector nobody renders any more is worse than
// no tutorial, and it fails silently in a browser. So it fails loudly here.

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

globalThis.performance = globalThis.performance || { now: () => Date.now() };
globalThis.localStorage = { _d: {}, getItem: () => null, setItem() {}, removeItem() {} };

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const { CHAPTERS } = await import('../src/data/tutorial.js');
const { newGame } = await import('../src/engine/state.js');

// Everything the tutorial could possibly anchor to lives in one of these.
const SOURCES = [
  // Every module that can put markup on screen, not just the views: the chart
  // and the world map render anchors too.
  ...fs.readdirSync(path.join(ROOT, 'src/ui')).filter((f) => f.endsWith('.js')).map((f) => 'src/ui/' + f),
  ...fs.readdirSync(path.join(ROOT, 'src/ui/views')).map((f) => 'src/ui/views/' + f),
  // The workstation's apps render anchors of their own.
  ...fs.readdirSync(path.join(ROOT, 'src/ui/os')).filter((f) => f.endsWith('.js')).map((f) => 'src/ui/os/' + f),
].map((p) => ({ p, src: read(p) }));
const ALL_SRC = SOURCES.map((s) => s.src).join('\n');

const VIEW_IDS = [...read('src/ui/shell.js').matchAll(/\{\s*id:\s*'([a-z]+)',\s*name:/g)].map((m) => m[1]);
// The workstation's windows: a step may name one under `os`, and a chapter
// marked `osOnly` may name one outright.
const APP_IDS = [...read('src/ui/os/apps.js').matchAll(/\{\s*id:\s*'([a-z]+)',\s*title:/g)].map((m) => m[1]);
const ACTIONS = new Set([...ALL_SRC.matchAll(/data-act="([a-z0-9-]+)"/g)].map((m) => m[1]));
const CSS = ['main', 'components', 'intro', 'console', 'os'].map((f) => read(`styles/${f}.css`)).join('\n');

let fails = 0, warns = 0, checks = 0;
const fail = (m) => { fails++; console.log('  ✗ ' + m); };
const warn = (m) => { warns++; console.log('  ! ' + m); };

// ── Anchor resolution ──────────────────────────────────────────────────────
// Selectors are simple by construction: #id, .class, [data-tut="x"], or a
// compound of [data-act]/[data-v]. Each form is checked against the sources
// that could render it.
function anchorExists(sel) {
  const tut = sel.match(/^\[data-tut="([\w-]+)"\]$/);
  if (tut) return ALL_SRC.includes(`data-tut="${tut[1]}"`);

  const act = sel.match(/^\[data-act="([\w-]+)"\](?:\[data-v="([\w-]+)"\])?$/);
  if (act) {
    if (!ACTIONS.has(act[1])) return false;
    if (!act[2]) return true;
    // data-v is usually interpolated; accept the action existing plus the
    // literal value appearing anywhere in the sources.
    return ALL_SRC.includes(`'${act[2]}'`) || ALL_SRC.includes(`"${act[2]}"`) || ALL_SRC.includes(`data-v="${act[2]}"`);
  }

  if (sel.startsWith('#')) return ALL_SRC.includes(`id="${sel.slice(1)}"`) || ALL_SRC.includes(`'${sel.slice(1)}'`);
  if (sel.startsWith('.')) return ALL_SRC.includes(`class="${sel.slice(1)}`) || ALL_SRC.includes(sel.slice(1));
  return false;
}

function styled(sel) {
  // Ids are often styled through the class on the same element (#nav / .nav),
  // so accept either spelling before complaining.
  if (sel.startsWith('#')) return CSS.includes(sel) || CSS.includes('.' + sel.slice(1));
  if (sel.startsWith('.')) return CSS.includes(sel);
  return true;
}

// ── Structure ──────────────────────────────────────────────────────────────
console.log('\n── walkthrough ──');
const ids = new Set();
for (const c of CHAPTERS) {
  checks++;
  if (ids.has(c.id)) fail(`duplicate chapter id "${c.id}"`);
  ids.add(c.id);
  if (!c.name || !c.sub) fail(`chapter "${c.id}" is missing name/sub`);
  if (typeof c.when !== 'function') fail(`chapter "${c.id}" has no when()`);
  if (!c.steps?.length) fail(`chapter "${c.id}" has no steps`);

  const stepIds = new Set();
  for (const [i, st] of (c.steps || []).entries()) {
    checks++;
    const where = `${c.id}[${i}] "${st.id}"`;
    if (!st.id) fail(`${where}: no id`);
    if (stepIds.has(st.id)) fail(`${where}: duplicate step id`);
    stepIds.add(st.id);
    if (!st.title) fail(`${where}: no title`);
    if (!st.body) fail(`${where}: no body`);
    if (st.title && st.title.length > 46) warn(`${where}: title is ${st.title.length} chars — it will wrap hard`);
    if (st.body && st.body.length > 420) warn(`${where}: body is ${st.body.length} chars — long for a card`);

    const viewOk = (v) => VIEW_IDS.includes(v) || ((c.osOnly || false) && APP_IDS.includes(v));
    if (st.view && !viewOk(st.view)) fail(`${where}: unknown view "${st.view}"`);
    // The workstation's overrides are checked the same way, against its ids.
    if (st.os) {
      if (st.os.view && !VIEW_IDS.includes(st.os.view) && !APP_IDS.includes(st.os.view)) fail(`${where}: os.view "${st.os.view}" is not a window`);
      if (st.os.anchor && !anchorExists(st.os.anchor)) fail(`${where}: os.anchor ${st.os.anchor} matches nothing`);
      if (st.os.title && st.os.title.length > 46) warn(`${where}: os.title is ${st.os.title.length} chars`);
    }

    if (st.anchor) {
      if (!anchorExists(st.anchor)) {
        if (st.optional) warn(`${where}: optional anchor ${st.anchor} not found`);
        else fail(`${where}: anchor ${st.anchor} matches nothing in any view`);
      } else if (!styled(st.anchor)) {
        warn(`${where}: anchor ${st.anchor} exists but has no styles — is it the right element?`);
      }
    }
    // `also` widens the cutout; a selector in it is an anchor by another name.
    if (st.also && !Array.isArray(st.also)) fail(`${where}: also must be a list of selectors`);
    for (const sel of Array.isArray(st.also) ? st.also : []) {
      checks++;
      if (!st.anchor) fail(`${where}: also without an anchor`);
      if (!anchorExists(sel)) fail(`${where}: also ${sel} matches nothing in any view`);
    }

    const a = st.advance;
    if (a) {
      const kinds = ['act', 'view', 'pred'].filter((k) => k in a);
      if (kinds.length !== 1) fail(`${where}: advance must name exactly one of act/view/pred`);
      if (a.act && !ACTIONS.has(a.act)) fail(`${where}: advance action "${a.act}" is not a data-act anywhere`);
      if (a.view && !VIEW_IDS.includes(a.view)) fail(`${where}: advance view "${a.view}" is unknown`);
      if (a.pred && typeof a.pred !== 'function') fail(`${where}: advance.pred is not a function`);
    }
    // A step that waits on the player must point at the thing to act on.
    if (a?.act && !st.anchor) warn(`${where}: waits for an action but spotlights nothing`);
  }
}

// The research walkthrough used to spotlight only the branch tabs while
// asking for a node click. The tutorial panes correctly swallow clicks outside
// the spotlight, which made the requested node impossible to press. Keep the
// two interactions as two separately anchored steps.
const compounding = CHAPTERS.find((c) => c.id === 'compounding');
const branchStep = compounding?.steps.find((st) => st.id === 'branch');
const nodeStep = compounding?.steps.find((st) => st.id === 'queue');
checks++;
if (branchStep?.anchor !== '.branch-tabs' || branchStep?.advance?.act !== 'branch') {
  fail('compounding: branch choice must be its own branch-tabs action step');
}
checks++;
if (nodeStep?.anchor !== '.tier-nodes' || typeof nodeStep?.advance?.pred !== 'function') {
  fail('compounding: node choice must have its own clickable tier-nodes step');
}

// ── Gates evaluate ─────────────────────────────────────────────────────────
// when()/auto()/pred() must survive a fresh state and a fully grown one.
const early = newGame({});
const late = newGame({});
late.company.act = 4;
late.resources.research = 400;
late.unlocks = { agents: true, fundraising: true };
late.agents = [];
late.research = { active: null, done: {}, progress: 0, queue: [] };
// A fresh state has no product yet; the chapters that teach one need one.
late.products = [{ id: 'p1', name: 'Probe', category: 'devtools', launched: true,
                   features: [], price: 20, quality: 0.5, appeal: 0.5, polish: 0.5, reliability: 0.9 }];
late.stats.eventsResolved = 40;
late.legacy.runs = 2;
// A grown run has had an assistant at the table, so the chapter that teaches
// the world's own console is reachable in a probe rather than only in a tab.
late.world.author.stats.cards = 3;
// And it has met people, so the chapter about the phone is reachable.
late.narrative.relationships.sam = { met: true, affinity: 4, arc: 1 };
late.narrative.relationships.mom = { met: true, affinity: 4, arc: 1 };
// And Vance has appeared, so the chapter about his company has a panel to point at.
{ const { spawnAperture } = await import('../src/systems/rivalco.js'); try { spawnAperture(late); } catch {} }
// And the Wire has asked it something, so the chapter about the Wire is reachable.
late.feed.push({ id: 1, type: 'social', text: 'probe', tone: 'neutral', thread: 'probe', resolved: false, day: 40 });

for (const S of [early, late]) {
  for (const c of CHAPTERS) {
    for (const [fnName, fn] of [['when', c.when], ['auto', c.auto]]) {
      if (!fn) continue;
      checks++;
      try { fn(S); } catch (e) { fail(`chapter "${c.id}".${fnName} threw on act ${S.company.act}: ${e.message}`); }
    }
    for (const st of c.steps) {
      if (!st.advance?.pred) continue;
      checks++;
      try { st.advance.pred(S); } catch (e) { fail(`${c.id}."${st.id}".pred threw on act ${S.company.act}: ${e.message}`); }
    }
  }
}

// ── Reachability ───────────────────────────────────────────────────────────
// Every chapter must be gated by something that becomes true during a run.
const REACHABLE_AT = [early, late];
for (const c of CHAPTERS) {
  checks++;
  const ok = REACHABLE_AT.some((S) => { try { return !!c.when(S); } catch { return false; } });
  if (!ok) warn(`chapter "${c.id}" was not reachable in either probe state — check when()`);
}

// ── The manual references real things ──────────────────────────────────────
const { KEYS, GLOSSARY, ACT_GUIDE } = await import('../src/data/manual.js');
checks++;
if (ACT_GUIDE.length !== 5) fail(`manual: ACT_GUIDE has ${ACT_GUIDE.length} acts, expected 5`);
const terms = GLOSSARY.flatMap((g) => g.items.map((i) => i[0]));
const dupes = terms.filter((t, i) => terms.indexOf(t) !== i);
if (dupes.length) fail(`manual: duplicate glossary terms — ${[...new Set(dupes)].join(', ')}`);
for (const [k, name, note] of KEYS) {
  checks++;
  if (!k || !name) fail(`manual: malformed key row ${JSON.stringify([k, name, note])}`);
}

const steps = CHAPTERS.reduce((a, c) => a + c.steps.length, 0);
console.log(`\n  ${CHAPTERS.length} chapters · ${steps} steps · ${terms.length} glossary terms · ${checks} checks`);
if (fails) { console.log(`\n═══ ${fails} problem${fails === 1 ? '' : 's'}${warns ? ` · ${warns} warning${warns === 1 ? '' : 's'}` : ''} ═══\n`); process.exit(1); }
console.log(`  walkthrough clean${warns ? ` · ${warns} warning${warns === 1 ? '' : 's'}` : ''}\n`);
