// ─────────────────────────────────────────────────────────────────────────────
// THE WORKSTATION, HEADLESSLY
//
// `tools/uitest.mjs` proves every view renders. This proves the housing around
// them does: that every app has a readout and a menu at every point in a run,
// that the dock is the nav in the same order with the same locks, that the
// layouts land inside the desktop at four widths, that the menus offer the
// actions their views actually render, and that none of it leaks `undefined`
// into a string a founder reads.
//
// It also builds the whole shell against the DOM stubs, because `main.js`
// imports it and a workstation that throws on a `getElementById` returning a
// bare object is a workstation that cannot be tested at all.
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs';
import { installDom, ok, eq, section, report } from './headless.mjs';

installDom();

const Game = await import('../src/game.js');
const Loop = await import('../src/engine/loop.js');
const { S, setState } = await import('../src/engine/state.js');
const { resolveChoice, dismissEvent } = await import('../src/systems/narrative.js');
const { startResearch, availableResearch } = await import('../src/systems/research.js');
const { rollCandidate, hireAgent, maxAgents, hireCost } = await import('../src/systems/agents.js');
const { actionPromptAI, actionWriteCode } = await import('../src/systems/founder.js');

const Shell = await import('../src/ui/shell.js');
const ConsoleShell = await import('../src/ui/shell-console.js');
const Os = await import('../src/ui/os/shell.js');
const Apps = await import('../src/ui/os/apps.js');
const Model = await import('../src/ui/os/model.js');
const WM = await import('../src/ui/os/wm.js');
const { OS, machineName } = await import('../src/ui/os/config.js');
const Save = await import('../src/engine/save.js');

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

const s = Game.startNewGame({ founderName: 'Test', companyName: 'Testco', archetype: 'hacker',
  category: 'devtools', productName: 'Testco' });

// Five points in a run, the same shape `uitest` uses, so a readout that only
// throws in Act IV is caught here rather than in a browser.
function play(days) {
  for (let d = 0; d < days; d++) {
    for (let i = 0; i < 3; i++) {
      if (s.founder.focus > 30 && s.company.cash > 200) actionPromptAI(s);
      else if (s.founder.focus > 5) actionWriteCode(s);
    }
    for (let i = 0; i < 4; i++) { const r = Game.doShipFeature(s); if (!r.ok) break; }
    const p = s.products[0];
    if (!p.launched && p.features.length >= 4) Game.doLaunch(s);
    if (!s.research.active) { const av = availableResearch(s).sort((a, b) => a.cost - b.cost); if (av.length) startResearch(s, av[0].id); }
    if (s.agents.length < maxAgents(s) && s.company.cash > hireCost(s) * 3) hireAgent(s, rollCandidate(s));
    if (s.narrative.activeEvent && !s.narrative.activeEvent.outcome) { resolveChoice(s, 0); dismissEvent(s); }
    Loop.simulate(1);
  }
}

const BAD = [/undefined/, /\bNaN\b/, /\[object Object\]/, /\bInfinity\b/];
function clean(name, str) {
  for (const re of BAD) {
    if (re.test(String(str))) {
      const i = String(str).search(re);
      return ok(name, false, `${re.source} in “…${String(str).slice(Math.max(0, i - 50), i + 40).replace(/\s+/g, ' ')}…”`);
    }
  }
  return ok(name, true);
}

const SNAPS = [];
function snapshot(label) { SNAPS.push({ label, act: s.company.act, day: Math.floor(s.time.day) }); }

snapshot('fresh');

// ── The registry ────────────────────────────────────────────────────────────
await section('the registry', () => {
  const ids = new Set();
  for (const a of Apps.APPS) {
    ok(`app ${a.id} has a title`, !!a.title);
    ok(`app ${a.id} has an accent`, !!a.accent);
    ok(`app ${a.id} has a glyph or a portrait`, !!(a.glyph || a.portrait));
    ok(`app ${a.id} is unique`, !ids.has(a.id)); ids.add(a.id);
    ok(`app ${a.id} has four defaults in (0,1]`,
      Array.isArray(a.def) && a.def.length === 4 && a.def.every((n) => n > 0 && n <= 1),
      JSON.stringify(a.def));
    ok(`app ${a.id} has a minimum size`, Array.isArray(a.min) && a.min[0] >= 240 && a.min[1] >= 200);
  }
  // The dock's module order is the nav's, because the digit keys are both.
  eq('modules are the views, in order', Apps.MODULE_IDS.join(','), Shell.VIEWS.map((v) => v.id).join(','));
  // Every module accent is distinct from its neighbours' — two adjacent tiles
  // in one colour is two tiles nobody can tell apart at a glance.
  const acc = Apps.APPS.filter((a) => a.module).map((a) => a.accent);
  let clash = 0;
  for (let i = 1; i < acc.length; i++) if (acc[i] === acc[i - 1]) clash++;
  eq('no two adjacent module tiles share an accent', clash, 0);
});

// ── Layouts ─────────────────────────────────────────────────────────────────
await section('layouts', () => {
  eq('1440 is a desktop', Model.modeFor(1440), 'desktop');
  eq('1180 is a desktop', Model.modeFor(1180), 'desktop');
  eq('1000 is compact', Model.modeFor(1000), 'compact');
  eq('860 is stacked', Model.modeFor(860), 'stacked');
  eq('420 is stacked', Model.modeFor(420), 'stacked');

  for (const [w, h] of [[1440, 900], [1280, 800], [1180, 720], [1024, 768], [760, 1000], [420, 900]]) {
    const mode = Model.modeFor(w);
    const lay = Model.layoutFor(mode, { w, h });
    for (const [id, box] of Object.entries(lay)) {
      ok(`${w}px · ${id} is inside the desktop`,
        box.x >= 0 && box.y >= 0 && box.x + box.w <= w + 1 && box.y + box.h <= h + 1,
        JSON.stringify(box));
      const app = Apps.APP_MAP[id];
      ok(`${w}px · ${id} is at least usable`, box.w >= Math.min(app.min[0], w) - 1, `${box.w} < ${app.min[0]}`);
    }
    if (mode === 'desktop') ok(`${w}px · the first boot is the Desk and the Wire`, !!lay.desk && !!lay.wire);
    else ok(`${w}px · the first boot is the Desk alone`, !!lay.desk && !lay.wire);
  }
});

// ── Everything the housing says, at five points in a run ────────────────────
async function auditState(label) {
  await section(`${label} — act ${s.company.act}, day ${Math.floor(s.time.day)}`, () => {
    for (const a of Apps.APPS) {
      const r = Apps.readoutFor(s, a.id);
      ok(`${a.id} has a readout`, typeof r === 'string' && r.length > 0, JSON.stringify(r));
      clean(`${a.id} readout is clean`, r);
      ok(`${a.id} readout is short enough for a title bar`, r.length <= 52, `${r.length} chars: ${r}`);

      const m = Apps.menuFor(s, a.id);
      ok(`${a.id} has a menu`, Array.isArray(m) && m.length > 0);
      for (const it of m) {
        if (it.sep) continue;
        ok(`${a.id} menu item is labelled`, !!(it.head || it.label), JSON.stringify(it));
        if (it.label) clean(`${a.id} menu label is clean`, it.label);
      }
    }
    clean('the Now widget is clean', Model.nowWidgetHtml(s));
    clean('the Readouts widget is clean', Model.readoutsWidgetHtml(s));
    clean('the dock is clean', Model.dockHtml(s, { windows: {}, focused: null }));
    clean('the clock is clean', Model.clockHtml(s));
    clean('the alerts are clean', Model.alertsHtml(s));
    clean('the transport is clean', Model.transportHtml(s, { savedAgo: 4 }));
    clean('about this machine is clean', Model.aboutHtml(s, { tools: 12, savedAgo: 3 }));

    // The alerts must be the same list the console prints down its status line.
    const chips = Model.alertsHtml(s);
    const { alertChips } = ConsoleShell;
    ok('alerts render', typeof chips === 'string' && chips.length > 0);

    // The dock is the nav: same locks, same badges.
    const { rows } = Model.dockModel(s, { windows: {}, focused: null });
    for (const v of Shell.VIEWS) {
      const row = rows.find((r) => r.id === v.id);
      const locked = !!(v.req && !v.req(s));
      if (locked && !v.showLocked) { ok(`${v.id} is hidden while locked`, !row); continue; }
      ok(`${v.id} is in the dock`, !!row);
      if (row) eq(`${v.id} lock state matches the nav`, row.locked, locked);
    }
  });
}

await auditState('fresh game');
play(120); snapshot('act I→II'); await auditState('act I→II');
play(400); snapshot('act III'); await auditState('act III');
play(500); snapshot('act IV'); await auditState('act IV');
play(500); snapshot('act V'); await auditState('act V');

// ── The menus offer what the views render ───────────────────────────────────
await section('the menus reach the real controls', () => {
  const acts = {};
  for (const [id, mod] of Object.entries(views)) {
    const html = mod.render(s);
    acts[id] = new Set([...html.matchAll(/data-act="([a-z0-9-]+)"/g)].map((m) => m[1]));
  }
  // Every menu item that names a `data-act` must be one the game actually
  // registers. The authority is the source: `main.js` for the game's own
  // actions and the workstation's shell for its five. A menu that dispatches a
  // name nothing answers is a menu item that silently does nothing.
  const src = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
  const REGISTERED = new Set([
    ...[...src('../src/main.js').matchAll(/onAction\('([a-z0-9-]+)'/g)].map((m) => m[1]),
    ...[...src('../src/ui/os/shell.js').matchAll(/onAction\('([a-z0-9-]+)'/g)].map((m) => m[1]),
  ]);
  ok('main.js registers a plausible number of actions', REGISTERED.size > 30, `${REGISTERED.size}`);
  for (const a of Apps.APPS) {
    for (const it of Apps.menuFor(s, a.id)) {
      if (!it.act) continue;
      ok(`${a.id} · “${it.label}” dispatches a registered action (${it.act})`, REGISTERED.has(it.act));
    }
  }
  // The Desk's four hands and Ship must be on its menu with their keys.
  const desk = Apps.menuFor(s, 'desk');
  for (const [key, v] of [['Q', 'code'], ['W', 'prompt'], ['E', 'users'], ['R', 'post']]) {
    const it = desk.find((x) => x.act === 'do' && x.v === v);
    ok(`the Desk menu offers ${v}`, !!it);
    if (it) eq(`${v} shows its key`, it.key, key);
  }
  ok('the Desk menu offers Ship', desk.some((x) => x.act === 'ship' && x.key === 'S'));
  ok('the Desk menu offers Ask ARIA', desk.some((x) => x.act === 'ask-aria' && x.key === 'A'));
});

// ── The seam ────────────────────────────────────────────────────────────────
await section('the seam', () => {
  const API = ['buildShell', 'setView', 'getView', 'registerViews', 'endBoot', 'markSaved',
    'registerWorldChip', 'paintTopbar', 'paintNav', 'paintMain', 'paintFeed', 'paintStatus',
    'escape', 'viewByIndex', 'showWorldConsole', 'powerDown', 'anchorAlias', 'showing'];
  for (const fn of API) {
    ok(`the console implements ${fn}`, typeof ConsoleShell[fn] === 'function');
    ok(`the workstation implements ${fn}`, typeof Os[fn] === 'function');
    ok(`the facade exposes ${fn}`, typeof Shell[fn] === 'function');
  }
  eq('the console is the default', Shell.isOs(), false);
  Shell.use(Os);
  eq('use() swaps the housing', Shell.isOs(), true);
  Shell.use(null);
  eq('use(null) puts the console back', Shell.isOs(), false);

  // Chrome anchors resolve to something in each housing.
  for (const sel of ['#nav', '.statusline', '.time-block', '.stat-strip', '#feed-rail']) {
    eq(`the console calls ${sel} itself`, ConsoleShell.anchorAlias(sel), sel);
    ok(`the workstation has a name for ${sel}`, typeof Os.anchorAlias(sel) === 'string' && Os.anchorAlias(sel).length > 0);
  }
  eq('#nav is the dock', Os.anchorAlias('#nav'), '#dock');
  eq('the status line is the menu bar', Os.anchorAlias('.statusline'), '.menubar');
});

// ── The walkthrough's own overrides ─────────────────────────────────────────
await section('walkthrough overrides', async () => {
  const { CHAPTERS } = await import('../src/data/tutorial.js');
  const appIds = new Set(Apps.APPS.map((a) => a.id));
  let n = 0;
  for (const c of CHAPTERS) {
    for (const st of c.steps) {
      if (!st.os) continue;
      n++;
      const merged = { ...st, ...st.os };
      ok(`${c.id}.${st.id} keeps a title`, !!merged.title);
      ok(`${c.id}.${st.id} keeps a body`, !!merged.body);
      if (merged.view) ok(`${c.id}.${st.id} names an app that exists (${merged.view})`, appIds.has(merged.view));
      if (merged.title) ok(`${c.id}.${st.id} title fits the card`, merged.title.length <= 46, `${merged.title.length}`);
      for (const k of Object.keys(st.os)) {
        ok(`${c.id}.${st.id}.os.${k} is a word or a selector, never a function`, typeof st.os[k] !== 'function');
      }
    }
  }
  ok('there are overrides at all', n >= 5, `${n}`);
});

// ── The machine's name ──────────────────────────────────────────────────────
await section('the machine names itself', () => {
  eq('act I is a workstation', machineName('Meridian', 1), 'WORKSTATION');
  eq('act II is a workstation', machineName('Meridian', 2), 'WORKSTATION');
  eq('act III takes the company name', machineName('Meridian', 3), 'MERIDIAN OS');
  eq('act V keeps it', machineName('Meridian', 5), 'MERIDIAN OS');
  eq('no company is still a workstation', machineName('', 4), 'WORKSTATION');
});

// ── The save ────────────────────────────────────────────────────────────────
await section('the save carries a layout', () => {
  Save.save(s);
  const peek = Save.peek();
  ok('peek reads the run without loading it', !!peek);
  if (peek) {
    eq('peek has the founder', peek.founderName, s.founder.name);
    eq('peek has the company', peek.companyName, s.company.name);
    eq('peek has the act', peek.act, s.company.act);
    ok('peek has a day', Number.isFinite(peek.day));
  }
  s.ui = s.ui || {};
  s.ui.os = { windows: { desk: { open: true, fx: 0.1, fy: 0.1, fw: 0.5, fh: 0.8, z: 0 } }, focused: 'desk', lastModule: 'desk' };
  Save.save(s);
  const round = JSON.parse(JSON.stringify(Save.serialisable(s)));
  ok('window geometry survives a round trip', round.ui.os.windows.desk.fw === 0.5);
  ok('the workstation settings survive', !!round.settings.os);
});

// ── The whole shell, built ──────────────────────────────────────────────────
await section('the workstation builds against the stubs', () => {
  Shell.use(Os);
  Shell.registerViews(views);
  let threw = null;
  try {
    Os.buildShell();
    Os.paintTopbar(); Os.paintNav(); Os.paintMain(); Os.paintFeed(); Os.paintStatus();
    Os.setView('product'); Os.setView('wire'); Os.setView('uplink');
    Os.viewByIndex(0); Os.escape(); Os.showWorldConsole(); Os.anchorAlias('#nav');
    Os.getView(); Os.showing('desk'); Os.markSaved(); Os.endBoot();
    Os.titleDecor('accounts'); Os.titleDecor('post');
  } catch (e) { threw = e; }
  ok('buildShell and every paint survive a stubbed DOM', !threw, threw && `${threw.message}\n     ${(threw.stack || '').split('\n')[1]?.trim()}`);
  clean('the login tiles are clean', Os.titleDecor('accounts'));
  Shell.use(null);
});

report('workstation');
