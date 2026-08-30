// Headless UI harness: renders every view at several game states, catching errors.
globalThis.performance = globalThis.performance || { now: () => Date.now() };
globalThis.localStorage = { _d: {}, getItem(k){return this._d[k]??null}, setItem(k,v){this._d[k]=String(v)}, removeItem(k){delete this._d[k]} };
const noop = () => {};
const mkEl = () => ({ style: {}, dataset: {}, classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
  appendChild: noop, remove: noop, addEventListener: noop, querySelector: () => null, querySelectorAll: () => [],
  getBoundingClientRect: () => ({ left:0, top:0, width:100, height:20, right:100, bottom:20 }),
  set innerHTML(v) { this._h = v; }, get innerHTML() { return this._h || ''; },
  scrollTop: 0, scrollHeight: 0, clientHeight: 0, focus: noop, click: noop, textContent: '',
  clientWidth: 1200, width: 0, height: 0,
  getContext: () => ({ setTransform: noop, clearRect: noop, beginPath: noop, moveTo: noop, lineTo: noop,
    stroke: noop, arc: noop, fill: noop, globalAlpha: 1, strokeStyle: '', fillStyle: '', lineWidth: 1 }) });
globalThis.document = { addEventListener: noop, getElementById: () => mkEl(), querySelector: () => null,
  querySelectorAll: () => [], createElement: mkEl, body: { appendChild: noop }, hidden: false,
  documentElement: mkEl(), createRange: () => ({ selectNodeContents: noop }) };
globalThis.window = { addEventListener: noop, innerWidth: 1600, innerHeight: 900, devicePixelRatio: 1,
  matchMedia: () => ({ matches: false, addEventListener: noop }), getSelection: () => ({ removeAllRanges: noop, addRange: noop }) };
globalThis.location = { search: '', href: 'http://localhost/', reload: () => {} };
globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = noop;
globalThis.btoa = (s) => Buffer.from(s, 'binary').toString('base64');
globalThis.atob = (s) => Buffer.from(s, 'base64').toString('binary');
try { Object.defineProperty(globalThis, 'navigator', { value: { clipboard: { writeText: async () => {} } }, configurable: true }); } catch {}

const Game = await import('../src/game.js');
const Loop = await import('../src/engine/loop.js');
const { S } = await import('../src/engine/state.js');
const { resolveChoice, dismissEvent, drawEvent, presentEvent } = await import('../src/systems/narrative.js');
const { startResearch, availableResearch } = await import('../src/systems/research.js');
const { rollCandidate, hireAgent, maxAgents, hireCost } = await import('../src/systems/agents.js');
const { actionPromptAI, actionWriteCode } = await import('../src/systems/founder.js');
const { EVENTS } = await import('../src/data/events.js');
const { startProject, availableProjects } = await import('../src/systems/projects.js');
const Modal = await import('../src/ui/modal.js');

const views = {
  desk: await import('../src/ui/views/desk.js'),
  product: await import('../src/ui/views/product.js'),
  agents: await import('../src/ui/views/agents.js'),
  research: await import('../src/ui/views/research.js'),
  market: await import('../src/ui/views/market.js'),
  world: await import('../src/ui/views/world.js'),
  story: await import('../src/ui/views/story.js'),
  legacy: await import('../src/ui/views/legacy.js'),
};
const Shell = await import('../src/ui/shell.js');
const Intro = await import('../src/ui/intro.js');
const AssistantHandoff = await import('../src/ui/assistant-handoff.js');

let fails = 0, checked = 0;
function tryRender(name, fn) {
  checked++;
  try {
    const h = fn();
    // Screen renderers are async and side-effecting; view renderers return HTML.
    if (h && typeof h.then === 'function') { h.catch((e) => { fails++; console.log(`  ✗ ${name} (async): ${e.message}`); }); return ''; }
    if (typeof h !== 'string' && h !== undefined) throw new Error('returned ' + typeof h + ', expected a string');
    return h;
  } catch (e) { fails++; console.log(`  ✗ ${name}: ${e.message}\n     ${(e.stack||'').split('\n')[1]?.trim()}`); return ''; }
}

const s = Game.startNewGame({ founderName: 'Test', companyName: 'Testco', archetype: 'hacker', category: 'devtools', productName: 'Testco' });

const snapshots = [];
function snap(label) {
  console.log(`\n── ${label} (day ${Math.floor(s.time.day)}, act ${s.company.act}) ──`);
  const out = {};
  for (const [k, v] of Object.entries(views)) out[k] = tryRender('view:' + k, () => v.render(s));
  tryRender('shell:topbar', () => Shell.paintTopbar());
  tryRender('shell:nav', () => Shell.paintNav());
  tryRender('shell:feed', () => Shell.paintFeed());
  snapshots.push({ label, out });
  return out;
}

snap('fresh game');

// Simulate to various states
function play(days) {
  for (let d = 0; d < days; d++) {
    for (let i = 0; i < 3; i++) { if (s.founder.focus > 30 && s.company.cash > 200) actionPromptAI(s); else if (s.founder.focus > 5) actionWriteCode(s); }
    const p = s.products[0];
    for (let i = 0; i < 4; i++) { const r = Game.doShipFeature(s); if (!r.ok) break; }
    if (!p.launched && p.features.length >= 4) Game.doLaunch(s);
    if (!s.research.active) { const av = availableResearch(s).sort((a,b)=>a.cost-b.cost); if (av.length) startResearch(s, av[0].id); }
    if (s.agents.length < maxAgents(s) && s.company.cash > hireCost(s)*3) hireAgent(s, rollCandidate(s));
    if (s.narrative.activeEvent && !s.narrative.activeEvent.outcome) {
      const n = s.narrative.activeEvent.choices.length;
      const bad = s.narrative.activeEvent.choices.findIndex(c=>/Take it\. Life-changing/.test(c.label));
      const idxs = [...Array(n).keys()].filter(i=>i!==bad);
      resolveChoice(s, idxs[Math.floor(Math.random()*idxs.length)] ?? 0); dismissEvent(s);
    }
    const projs = availableProjects(s).filter(x=>x.available && s.company.cash > x.cost*4);
    if (projs.length) startProject(s, projs[0].id);
    Loop.simulate(1);
  }
}

play(120); snap('act I → II');
play(400); snap('act III');
play(500); snap('act IV');
play(500); snap('act V');

// Render every event card body + choices
console.log('\n── event deck render check ──');
let evFails = 0;
for (const e of EVENTS) {
  try {
    const body = typeof e.body === 'function' ? e.body(s) : e.body;
    if (typeof body !== 'string' || !body.length) throw new Error('empty body');
    for (const c of e.choices) {
      if (!c.label) throw new Error('choice missing label');
      if (typeof c.sub === 'function') c.sub(s);
      if (typeof c.label === 'function') c.label(s);
      if (c.req) c.req(s);
    }
  } catch (err) { evFails++; console.log(`  ✗ ${e.id}: ${err.message}`); }
}
console.log(`  ${EVENTS.length - evFails}/${EVENTS.length} event cards render`);

// Exercise every choice effect on a scratch state to catch runtime errors
console.log('\n── event effect check ──');
let effFails = 0, effRun = 0;
const { newGame, setState } = await import('../src/engine/state.js');
for (const e of EVENTS) {
  for (let ci = 0; ci < e.choices.length; ci++) {
    const scratch = JSON.parse(JSON.stringify(s));
    setState(scratch);
    scratch.narrative.activeEvent = { id: e.id, title: e.title, kind: e.kind, char: e.char, body: '', choices: e.choices.map((c,i)=>({i,label:c.label,sub:c.sub,tone:c.tone})), outcome: null };
    try { const r = resolveChoice(scratch, ci); effRun++;
      if (r && typeof r.outcome !== 'string') throw new Error('outcome not a string');
    } catch (err) { effFails++; console.log(`  ✗ ${e.id}[${ci}]: ${err.message}`); }
  }
}
setState(s);
console.log(`  ${effRun - effFails}/${effRun} choice effects execute`);

// Ask ARIA at several states
console.log('\n── ask aria ──');
{ const { askAria } = await import('../src/systems/aria.js');
  let ok2 = 0;
  for (const snapObj of snapshots) {
    try { const r = askAria(s); if (!r.opener || !Array.isArray(r.findings)) throw new Error('bad shape');
      for (const f of r.findings) { if (!f.title || !f.text) throw new Error('finding missing text'); }
      ok2++; } catch (e) { fails++; console.log('  ✗ askAria: ' + e.message); }
  }
  console.log(`  askAria produced ${ok2} valid reports`);
}

// Opening sequence — every beat must render without throwing.
console.log('\n── opening sequence ──');
tryRender('title', () => Intro.showTitle({ cold: false }));
for (let i = 0; i < 4; i++) tryRender('beat ' + i, () => Intro.showIntro(i));
tryRender('advanced panel', () => { Intro.toggleAdvanced(); Intro.showIntro(3); Intro.toggleAdvanced(); });
tryRender('config', () => { const c = Intro.getConfig();
  for (const k of ['founderName', 'companyName', 'archetype', 'category', 'difficulty', 'scenario'])
    if (!c[k]) throw new Error('config missing ' + k); });
tryRender('assistant handoff ready', () => AssistantHandoff.bodyFor('ready', { company: 'Testco', count: 10 }));
tryRender('assistant handoff connected', () => AssistantHandoff.bodyFor('connected', { company: 'Testco', count: 10, callName: 'briefing' }));
tryRender('assistant handoff unavailable', () => AssistantHandoff.bodyFor('unavailable', { reason: 'no site tools' }));

// Dump a sample of rendered HTML for eyeballing
if (process.argv.includes('--dump')) {
  const which = process.argv[process.argv.indexOf('--dump') + 1] || 'desk';
  const idx = Number(process.argv[process.argv.indexOf('--dump') + 2] || 0);
  console.log('\n' + (snapshots[idx]?.out[which] || 'n/a'));
}

// ── Content sanity: no leaked undefined/NaN, balanced tags ──────────────────
console.log('\n── content sanity ──');
let sanity = 0;
const BAD = [/undefined/g, /\bNaN\b/g, /\[object Object\]/g, /\bInfinity\b/g];
for (const snapObj of snapshots) {
  for (const [view, html] of Object.entries(snapObj.out)) {
    if (!html) continue;
    for (const re of BAD) {
      const hits = html.match(re);
      if (hits) { sanity++; console.log(`  ✗ ${snapObj.label}/${view}: ${hits.length}× ${re.source}`);
        const i = html.search(re); console.log(`     …${html.slice(Math.max(0,i-90), i+60).replace(/\s+/g,' ')}…`); break; }
    }
    const opens = (html.match(/<div/g) || []).length, closes = (html.match(/<\/div>/g) || []).length;
    if (opens !== closes) { sanity++; console.log(`  ✗ ${snapObj.label}/${view}: ${opens} <div> vs ${closes} </div>`); }
    const bopens = (html.match(/<button/g) || []).length, bcloses = (html.match(/<\/button>/g) || []).length;
    if (bopens !== bcloses) { sanity++; console.log(`  ✗ ${snapObj.label}/${view}: ${bopens} <button> vs ${bcloses} </button>`); }
  }
}
if (!sanity) console.log('  all snapshots clean');

// ── main.js loads (wires all handlers) ──────────────────────────────────────
console.log('\n── main.js module load ──');
let mainOk = true;
try { await import('../src/main.js'); console.log('  main.js loaded'); }
catch (e) { mainOk = false; console.log('  ✗ main.js: ' + e.message + '\n     ' + (e.stack||'').split('\n')[1]); }

console.log(`\n═══ ${checked - fails}/${checked} renders ok · ${fails + evFails + effFails + sanity + (mainOk?0:1)} problems ═══`);
process.exit(fails + evFails + effFails + sanity + (mainOk?0:1) > 0 ? 1 : 0);
