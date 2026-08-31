// ─────────────────────────────────────────────────────────────────────────────
// THE CONTEXT MENUS — every right-click in the workstation, as data.
//
// One rule holds this file together, and it is the reason it exists: a blocked
// verb is never merely greyed out. Every disabled item carries a `note` saying
// exactly what it needs, in mono uppercase — 'ACT III', '41K PTS SHORT',
// 'FOCUS 12 OF 30', 'NEEDS ADVERSARIAL CODE REVIEW'. The reason is computed
// where the item is built, from the same predicate the real control uses, so a
// menu can never disagree with the button it mirrors.
//
// One exception, and it is not this file's to fix: a dock tile appends the
// app's own menu-bar menu verbatim, and `apps.js` writes several disabled rows
// with no note at all. They are the same rows the menu bar shows, so rewriting
// them here would make the two disagree. The note belongs in `apps.js`.
//
// Item shape is exactly `menubar.js`'s, because `ctxmenu.js` renders these with
// `itemHtml`:
//
//   { label, key?, act?, v?, disabled?, checked?, danger?, quiet?, note? }
//   { head: 'ASSIGN TO' }   { sep: true }
//
// Two consequences of that shape are load-bearing here. `itemHtml` emits
// `data-act` and `data-v` and nothing else, so anything an action needs rides
// in `v` as `a:b` — which is why the seven `ctx-*` actions exist rather than
// reusing `lane`, `upgrade-agent` and `thread`, all three of which read a
// second `data-` attribute off the element they were clicked on. And `.mi-note`
// is `white-space: nowrap`, so a note is four words at the outside.
//
// Prose lives in `src/data/machine.js` under `CTX`, keyed by kind. What is
// written *here* is chrome: mono uppercase refusals, and the labels on verbs
// the game already names elsewhere.
// ─────────────────────────────────────────────────────────────────────────────
import { CTX, EMPTY } from './machine.js';
import { fmt, money } from '../engine/format.js';
import { LANES, MODELS, MODEL_ORDER, AGENT_TOOLS, SPECIALTIES } from './agents.js';
import { RESEARCH_MAP, BRANCHES } from './research.js';
import { ACT_VERBS } from './verbs.js';
import { DIRECTIVES } from './directives.js';
import { PROJECT_MAP } from './projects.js';
import { APPROACHES } from './approaches.js';
import { GLOSSARY } from './manual.js';
import { AGENTS, CODE, FOUNDER } from './balance.js';
import { isAvailable, researchCost } from '../systems/research.js';
import { projectAvailable, projectCost } from '../systems/projects.js';
import { promptCost, currentApproach, approachAvailable } from '../systems/founder.js';
import { featureCost } from '../systems/product.js';
import { activeProduct } from '../engine/state.js';
import { threadOptions } from '../systems/feed.js';
import { STATS } from '../ui/readouts.js';
import { APP_MAP, isLocked, menuFor as appMenuFor } from '../ui/os/apps.js';

// The research queue's own ceiling, mirrored from the `queue` handler in
// `src/main.js`. It is chrome rather than balance — the note has to name the
// same number the handler enforces.
const QUEUE_CAP = 8;

// ── Small helpers ───────────────────────────────────────────────────────────
const up = (s) => String(s ?? '').toUpperCase();
const safe = (fn, dflt = null) => { try { const v = fn(); return v === undefined ? dflt : v; } catch { return dflt; } };

// A menu label is one nowrap line in a plate capped at 360px, which `.mi-label`
// ellipsises at about 46 characters — the same budget `machine.js` writes its
// lore to. Anything authored elsewhere that this file re-prints (a blurb, a
// memory, a node's description) is clipped to it, so the cut is made here, on
// a word boundary, rather than by the renderer in the middle of one.
const clip = (s, n = 46) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1).replace(/[\s,;:—-]+$/, '')}…` : t;
};

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
const actNote = (n) => `ACT ${ROMAN[n] || n}`;
// A note lives in a nowrap column beside the label, so a requirement whose
// name is a sentence gets trimmed rather than crushing the label it explains.
const needs = (name) => `NEEDS ${up(clip(name, 24))}`;
const needsCash = (n) => `NEEDS ${up(money(n))}`;
const pts = (n) => `${up(fmt(Math.max(0, Math.round(n))))} PTS`;
// A note that says '1 NODES' is a note nobody wrote and everybody reads.
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 'S'}`;
const nodeName = (id) => RESEARCH_MAP[id]?.name || String(id).replace(/_/g, ' ');

const firstSentence = (s) => {
  const t = String(s ?? '').trim();
  const i = t.search(/[.!?](\s|$)/);
  return i < 0 ? t : t.slice(0, i + 1);
};

// Prose from `machine.js`, and nothing at all if it is not written yet — an
// unwritten line prints no row rather than an empty one. That file keys its
// lore by what the thing *is* rather than by what this file calls the
// right-click, so ask for the specific key first and fall back to the general
// one: a line written later lands without an edit here.
const lore = (...keys) => {
  for (const k of keys) {
    const v = safe(() => CTX[k], '');
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
};
const loreItems = (keys, n = 46) => {
  const s = lore(...[].concat(keys));
  return s ? [{ label: clip(s, n), quiet: true, disabled: true }] : [];
};

// The glossary, flattened once, so a stat can explain itself in the machine's
// own words rather than a second set written here.
const TERMS = (() => {
  const m = {};
  for (const g of GLOSSARY || []) for (const [term, def] of g.items || []) m[term.toLowerCase()] = def;
  return m;
})();
const define = (term) => TERMS[String(term).toLowerCase()] || '';

// Windows the founder can actually see, read straight off the saved layout in
// `S.ui.os` rather than by importing the window manager into a data file.
function openWindowIds(S) {
  const w = safe(() => S.ui.os.windows, null) || {};
  return Object.keys(w).filter((id) => w[id]?.open && !w[id]?.min);
}
const winState = (S, id) => safe(() => S.ui.os.windows[id], null) || {};
const appTitle = (id) => APP_MAP[id]?.fullTitle || APP_MAP[id]?.title || id;

// A locked module says which act opens it when its hint names one, and admits
// it does not know when the hint is a sentence about the game instead.
function lockNote(app) {
  const m = /act\s+([ivx]+)/i.exec(app?.lockHint || '');
  return m ? `ACT ${up(m[1])}` : 'NOT YET';
}

// ── desktop ─────────────────────────────────────────────────────────────────
// The bare wallpaper. Arrange the machine, change what is behind it, and one
// line about the room.
function desktopMenu(S) {
  const o = safe(() => S.settings.os, null) || {};
  const wall = o.wallpaper || 'act';
  return [
    { label: 'Tile the Desk and the Wire', act: 'os-layout', v: 'work' },
    { label: 'The ops floor', act: 'os-layout', v: 'ops' },
    { label: 'Show the desktop', key: '0', act: 'os-showdesk' },
    { sep: true },
    { head: 'WALLPAPER' },
    { label: 'The act', act: 'os-set', v: 'wallpaper:act', checked: wall === 'act' },
    { label: 'The title', act: 'os-set', v: 'wallpaper:title', checked: wall === 'title' },
    { label: 'Nothing', act: 'os-set', v: 'wallpaper:none', checked: wall === 'none' },
    { sep: true },
    { label: 'Desktop widgets', act: 'os-set', v: 'widgets:toggle', checked: o.widgets !== false },
    { sep: true },
    { label: 'The Record…', act: 'view', v: 'record' },
    { label: 'The Manual…', key: '?', act: 'help' },
    { label: 'Settings…', act: 'settings' },
    ...(lore('desktop') ? [{ sep: true }, ...loreItems('desktop')] : []),
  ];
}

// ── window ──────────────────────────────────────────────────────────────────
// The title bar. The three keys, plus the one thing a title bar cannot offer:
// everything else, gone.
function windowMenu(S, data) {
  const id = data.win || data.id || data.v || safe(() => S.ui.os.focused, '');
  if (!id) return [];
  const w = winState(S, id);
  const open = openWindowIds(S);
  const others = open.filter((x) => x !== id).length;
  return [
    { head: up(appTitle(id)) },
    { label: 'Zoom', act: 'ctx-win', v: `zoom:${id}`, checked: !!w.zoomed },
    { label: 'Minimize', act: 'ctx-win', v: `min:${id}` },
    { label: 'Close', act: 'ctx-win', v: `close:${id}` },
    { sep: true },
    { label: 'Only this window', act: 'ctx-win', v: `only:${id}`,
      disabled: !others, note: others ? `CLOSES ${others}` : 'NOTHING ELSE OPEN' },
    { label: 'Show the desktop', key: '0', act: 'os-showdesk' },
    ...(lore('window') ? [{ sep: true }, ...loreItems('window')] : []),
  ];
}

// ── dock ────────────────────────────────────────────────────────────────────
// A tile. Open it, close it, and then the app's own menu — so right-clicking
// Agents offers assigning every agent to Build without opening Agents.
function dockMenu(S, data) {
  const id = data.app || data.v || data.id;
  const app = APP_MAP[id];
  if (!app) return [];
  const locked = safe(() => isLocked(S, app), false);
  const visible = openWindowIds(S).includes(id);
  const out = [
    { head: up(app.title) },
    ...(app.blurb ? [{ label: clip(app.blurb), quiet: true, disabled: true }] : []),
    { label: visible ? 'Bring it forward' : 'Open', act: 'view', v: id,
      disabled: locked, note: locked ? lockNote(app) : undefined },
    { label: 'Close', act: 'ctx-win', v: `close:${id}`, disabled: !visible,
      note: visible ? undefined : 'NOT OPEN' },
    { label: 'Only this window', act: 'ctx-win', v: `only:${id}`, disabled: locked,
      note: locked ? lockNote(app) : undefined },
  ];
  if (!locked) {
    const own = safe(() => appMenuFor(S, id), []) || [];
    if (own.length) out.push({ sep: true }, ...own);
  }
  return out;
}

// ── agent ───────────────────────────────────────────────────────────────────
// One card. Where it works, what it runs on, what it holds, and whether it
// stays. The last line is its own most recent memory, which is the only place
// in the interface an agent gets the last word.
function agentMenu(S, data) {
  const id = data.id || data.agent || data.v;
  const a = (S.agents || []).find((x) => x.id === id);
  if (!a) return [];
  const model = MODELS[a.model];
  const spec = SPECIALTIES[a.spec];
  const out = [
    { head: `${up(a.name)} · ${up(model?.name || a.model)}` },
    { head: 'ASSIGN TO' },
  ];

  for (const l of Object.values(LANES)) {
    const gate = l.req && !(S.unlocks?.[l.req] || S.research.done[l.req]);
    const match = spec?.lane === l.id;
    out.push({
      label: l.name, act: 'ctx-lane', v: `${a.id}:${l.id}`,
      checked: a.lane === l.id, disabled: !!gate,
      note: gate ? needs(nodeName(l.req)) : match ? 'SPECIALTY' : undefined,
    });
  }

  // The next two tiers only. A nano agent listing all six higher models is a
  // catalogue, and a context menu is not a catalogue.
  const tier = model?.tier || 1;
  const ups = MODEL_ORDER.map((mid) => MODELS[mid]).filter((mo) => mo.tier > tier).slice(0, 2);
  if (ups.length) {
    out.push({ sep: true }, { head: 'UPGRADE' });
    for (const mo of ups) {
      const cost = Math.floor(AGENTS.UPGRADE_BASE_COST * Math.pow(AGENTS.UPGRADE_COST_GROWTH, mo.tier - 1));
      const gate = mo.req && !(S.research.done[mo.req] || S.unlocks?.[mo.req]);
      const poor = !gate && S.company.cash < cost;
      out.push({
        label: mo.name, act: 'ctx-model', v: `${a.id}:${mo.id}`,
        disabled: !!gate || poor,
        note: gate ? needs(nodeName(mo.req)) : poor ? needsCash(cost) : `−${up(money(cost))}`,
      });
    }
  }

  // Cheapest first, and never more than four: the rest are behind the dialog,
  // which is where a purchase with a description belongs anyway.
  const owned = new Set(a.tools || []);
  const tools = AGENT_TOOLS.filter((t) => !owned.has(t.id)).sort((x, y) => x.cost - y.cost).slice(0, 4);
  if (tools.length) {
    out.push({ sep: true }, { head: 'INSTALL' });
    for (const t of tools) {
      const gate = t.req && !S.research.done[t.req];
      const poor = !gate && S.company.cash < t.cost;
      out.push({
        label: t.name, act: 'ctx-tool', v: `${a.id}:${t.id}`,
        disabled: !!gate || poor,
        note: gate ? needs(nodeName(t.req)) : poor ? needsCash(t.cost) : `−${up(money(t.cost))}`,
      });
    }
    out.push({ label: 'All tools…', act: 'agent-tools', v: a.id });
  }

  out.push({ sep: true }, { label: `Release ${a.name}…`, act: 'fire-agent', v: a.id, danger: true });

  const mem = (a.memory || [])[0];
  const line = mem ? `d${mem.day} · ${mem.text}` : a.lastLine ? `d${a.lastLineDay ?? 0} · ${a.lastLine}` : '';
  if (line) out.push({ sep: true }, { label: clip(line), quiet: true, disabled: true, note: 'MEMORY' });
  else out.push(...(lore('agent') ? [{ sep: true }, ...loreItems('agent')] : []));
  return out;
}

// ── node ────────────────────────────────────────────────────────────────────
// A research node. Start it, queue it, or queue everything standing in front
// of it — which is the one thing the tech tree has never been able to do.
function chainFor(S, node) {
  const out = [], seen = new Set();
  const walk = (n) => {
    if (!n || seen.has(n.id) || S.research.done[n.id]) return;
    seen.add(n.id);
    for (const r of n.reqs || []) walk(RESEARCH_MAP[r]);
    out.push(n);
  };
  walk(node);
  return out;
}

function startBlock(S, n) {
  if (S.research.done[n.id]) return 'LEARNED';
  if (S.research.active === n.id) return 'RUNNING';
  if (n.act && S.company.act < n.act) return actNote(n.act);
  const missing = (n.reqs || []).filter((r) => !S.research.done[r]);
  if (missing.length) return needs(nodeName(missing[0]));
  const gate = n.gate?.compute || 0;
  // One local, read once. Guarding the comparison and not the subtraction is
  // how a save that predates `computeCap` printed '0 PF SHORT' beside a node
  // it could not start.
  const have = S.resources.computeCap || 0;
  if (gate && have < gate) return `${up(fmt(gate - have))} PF SHORT`;
  return '';
}

function nodeMenu(S, data) {
  const n = RESEARCH_MAP[data.id || data.node || data.v];
  if (!n) return [];
  const branch = BRANCHES[n.branch];
  const queue = S.research.queue || [];
  const queued = queue.includes(n.id);
  const room = QUEUE_CAP - queue.length;
  const cost = safe(() => researchCost(S, n), n.cost) || 0;
  const banked = S.resources.research || 0;
  const block = startBlock(S, n);
  const ok = safe(() => isAvailable(S, n), false);

  const chain = chainFor(S, n).filter((x) => x.id !== S.research.active && !queue.includes(x.id));
  const chainCost = chain.reduce((t, x) => t + (safe(() => researchCost(S, x), x.cost) || 0), 0);

  const out = [
    { head: `${up(branch?.name || n.branch)} · TIER ${n.tier}` },
    // `startResearch` does not spend the bank — it makes the node the one the
    // bank fills toward. So an affordable-looking shortfall is not a refusal
    // and must not be written as one: a startable node names its price, and
    // says READY only when the balance already covers it and it lands on the
    // next tick. 'SHORT' is the vocabulary of a blocked row, and this row is
    // not blocked.
    { label: 'Start it now', act: 'research', v: n.id,
      disabled: !ok || !!block,
      note: block || (banked >= cost ? 'READY' : pts(cost)) },
    { label: queued ? 'Take it out of the queue' : 'Queue it', act: 'ctx-queue', v: n.id,
      disabled: !queued && (!!block || room < 1),
      note: queued ? `SLOT ${queue.indexOf(n.id) + 1}` : block || (room < 1 ? `QUEUE FULL ${QUEUE_CAP} OF ${QUEUE_CAP}` : pts(cost)) },
    { label: 'Queue the whole chain', act: 'ctx-chain', v: n.id,
      disabled: !chain.length || chain.length > room,
      note: !chain.length ? 'NOTHING TO QUEUE'
        : chain.length > room ? `${plural(chain.length, 'SLOT')} · ${room} FREE`
        : `${plural(chain.length, 'NODE')} · ${pts(chainCost)}` },
  ];
  const tail = [
    ...(n.desc ? [{ label: clip(n.desc), quiet: true, disabled: true }] : []),
    ...(S.research.active === n.id ? loreItems('research.active') : []),
  ];
  if (tail.length) out.push({ sep: true }, ...tail);
  return out;
}

// ── feed ────────────────────────────────────────────────────────────────────
// A Wire entry. Its replies if it is still asking, what it was if it is not,
// and what this kind of entry is — because 'hn' has never once explained
// itself to anybody who did not already know.
function feedMenu(S, data) {
  const item = (S.feed || []).find((f) => f.id === Number(data.id ?? data.feed ?? data.v));
  if (!item) return [];
  const out = [{ head: up(item.type || 'wire') }];
  const open = item.thread && !item.resolved;

  if (open) {
    const opts = safe(() => threadOptions(S, item), []) || [];
    if (opts.length) {
      out.push({ head: 'REPLY' });
      opts.forEach((o, i) => out.push({ label: clip(o.label, 56), act: 'ctx-thread', v: `${item.id}:${i}` }));
    }
  } else if (item.thread && item.expired) {
    out.push({ label: clip(item.outcome || item.chosen || '—'), quiet: true, disabled: true, note: 'EXPIRED' });
  } else if (item.thread && item.chosen) {
    out.push({ label: clip(item.chosen), quiet: true, disabled: true, note: 'ANSWERED' });
  }

  const what = lore(`feed.${item.type}`, open ? 'wire.thread' : 'wire.post');
  if (what) out.push({ sep: true }, { head: 'WHAT THIS IS' }, { label: clip(what), quiet: true, disabled: true });
  if (item.untrusted) out.push(...loreItems(['feed.untrusted', 'wire.injection']));

  out.push({ sep: true }, { label: 'Open the Wire', act: 'view', v: 'wire' });
  return out;
}

// ── action ──────────────────────────────────────────────────────────────────
// One of the four verbs on the Desk. The verb itself, what it costs, and — for
// the prompt — every style you may talk to the machine in, with the reason the
// locked ones are locked.
const VERB_KEY = { code: 'Q', prompt: 'W', users: 'E', post: 'R' };

// `fmt` and not `Math.ceil`, because the Desk prints these same two numbers
// three centimetres away and rounding a 0.85 focus cost up to 1 makes the menu
// disagree with the panel it is explaining.
function verbBlock(S, id) {
  if (id === 'prompt') {
    const c = safe(() => promptCost(S), null) || { focus: 0, cash: 0, insight: 0 };
    if (S.founder.focus < c.focus) return [`FOCUS ${fmt(S.founder.focus)} OF ${fmt(c.focus)}`, true];
    if (S.company.cash < c.cash) return [needsCash(c.cash), true];
    if (c.insight && S.resources.insight < c.insight) return [`INSIGHT ${fmt(S.resources.insight)} OF ${fmt(c.insight)}`, true];
    return [`${fmt(c.focus)} FOCUS · ${up(money(c.cash))}`, false];
  }
  const need = id === 'code' ? CODE.MANUAL_FOCUS_COST
    : id === 'users' ? FOUNDER.TALK_FOCUS_COST : FOUNDER.POST_FOCUS_COST;
  if (S.founder.focus < need) return [`FOCUS ${fmt(S.founder.focus)} OF ${fmt(need)}`, true];
  return [`${fmt(need)} FOCUS`, false];
}

// Ship is the fifth thing on the Desk and the only one that spends a resource
// rather than the day, so it answers here too — a right-click on it should not
// be the one that does nothing.
function shipMenu(S) {
  const p = activeProduct(S);
  if (!p) return [{ label: 'Ship a feature', disabled: true, note: 'NO PRODUCT' }];
  const cost = safe(() => featureCost(S, p), 0) || 0;
  const have = S.resources.code || 0;
  const short = have < cost;
  const out = [
    { label: 'Ship a feature', key: 'S', act: 'ship', disabled: short,
      note: short ? `CODE ${up(fmt(have))} OF ${up(fmt(cost))}` : `−${up(fmt(cost))} CODE` },
    { label: 'Auto-ship', act: 'toggle-autoship', checked: S.settings.autoShip !== false },
  ];
  if (!p.launched) out.push({ label: `Launch ${p.name}…`, act: 'launch',
    disabled: p.features.length < 1, note: p.features.length < 1 ? 'NOTHING TO LAUNCH' : undefined });
  const tail = loreItems('desk.ship');
  if (tail.length) out.push({ sep: true }, ...tail);
  return out;
}

function actionMenu(S, data) {
  const id = data.v || data.action || data.id;
  if (id === 'ship' || id === 'launch') return shipMenu(S);
  const verb = safe(() => ACT_VERBS[S.company.act][id], null) || safe(() => ACT_VERBS[1][id], null);
  if (!verb) return [];
  const [note, blocked] = verbBlock(S, id);
  const out = [
    { label: verb.name, key: VERB_KEY[id], act: 'do', v: id, disabled: blocked, note },
  ];

  if (id === 'prompt') {
    const cur = safe(() => currentApproach(S), null);
    out.push({ sep: true }, { head: 'APPROACH' });
    for (const a of APPROACHES) {
      const okA = safe(() => approachAvailable(S, a), true);
      out.push({
        label: a.name, act: 'approach', v: a.id, checked: cur?.id === a.id,
        disabled: !okA, note: okA ? a.short : needs(nodeName(a.req)),
      });
    }
  }

  const desc = verb.desc || (id === 'prompt' ? safe(() => currentApproach(S).desc, '') : '');
  const tail = [...(desc ? [{ label: clip(desc), quiet: true, disabled: true }] : []),
    ...loreItems([`desk.${id}`, `verb.${id}`])];
  if (tail.length) out.push({ sep: true }, ...tail);
  return out;
}

// ── stat ────────────────────────────────────────────────────────────────────
// A number in the menu bar. What it is now, and what it means — the manual's
// own sentence, so there is one definition of Runway in the game.
function statMenu(S, data) {
  const id = data.stat || data.v || data.id;
  const st = STATS.find((x) => x.id === id);
  if (!st) return [];
  const value = safe(() => st.fmt(st.get(S), S), '—');
  const def = lore(`stat.${id}`, id) || firstSentence(define(st.label));
  return [
    { head: up(st.label) },
    { label: String(value), quiet: true, disabled: true, note: 'NOW' },
    ...(def ? [{ label: clip(def), quiet: true, disabled: true }] : []),
    { sep: true },
    { label: 'The glossary…', act: 'os-manual-tab', v: 'terms' },
  ];
}

// ── directive ───────────────────────────────────────────────────────────────
// The standing order, from the chip that shows it. Every order in the game,
// with the act that opens each one.
function directiveMenu(S) {
  const cur = S.company.directive || 'none';
  const out = [{ head: 'STANDING ORDER' }];
  for (const d of DIRECTIVES) {
    const gate = d.act && S.company.act < d.act;
    out.push({
      label: d.name, act: 'directive', v: d.id,
      checked: cur === d.id, disabled: !!gate || cur === d.id,
      note: gate ? actNote(d.act) : cur === d.id ? 'CURRENT' : undefined,
    });
  }
  const held = DIRECTIVES.find((d) => d.id === cur);
  if (held?.desc) out.push({ sep: true }, { label: clip(held.desc), quiet: true, disabled: true });
  return out;
}

// ── project ─────────────────────────────────────────────────────────────────
// A megaproject. One verb, and the four different ways it can be shut.
function projectMenu(S, data) {
  const p = PROJECT_MAP[data.id || data.project || data.v];
  if (!p) return [];
  const cost = safe(() => projectCost(S, p), p.cost) || 0;
  const built = safe(() => S.world.projectsBuilt[p.id], 0) || 0;
  const queued = safe(() => (S.world.projectQueue || []).some((q) => q.id === p.id), false);
  const note = S.company.act < p.act ? actNote(p.act)
    : p.req && !S.research.done[p.req] ? needs(nodeName(p.req))
    : queued ? 'UNDER WAY'
    : !p.repeatable && built ? 'BUILT'
    : S.company.cash < cost ? needsCash(cost)
    : `−${up(money(cost))} · ${p.days} DAYS`;
  const ok = safe(() => projectAvailable(S, p), false) && S.company.cash >= cost;
  return [
    { head: up(p.name) },
    { label: 'Break ground', act: 'project', v: p.id, disabled: !ok, note },
    ...(built ? [{ label: `Built ${built}×`, quiet: true, disabled: true }] : []),
    { sep: true },
    { label: clip(p.desc), quiet: true, disabled: true },
    ...loreItems('project'),
  ];
}

// ── The Record ──────────────────────────────────────────────────────────────
// Its three targets, which the app declares on its own rows. A folder and a
// file each offer the two things you can do with one and then say what it is;
// the app's background falls back to the window's own menu, so a right-click
// inside the Record is never a right-click on nothing.

function recordMenu(S, data, ctx) {
  return [
    { label: 'Search the record…', key: 'F', act: 'record-find' },
    { sep: true },
    ...windowMenu(S, { win: 'record' }),
  ];
}

function recordFolderMenu(S, data) {
  const path = data.path || data.v || '';
  const name = data.name || path;
  if (!path) return recordMenu(S, data);
  return [
    { head: up(name) },
    { label: 'Open it', act: 'record-folder', v: path },
    { label: 'Search the record…', key: 'F', act: 'record-find' },
    { sep: true },
    ...loreItems('record'),
    ...windowMenu(S, { win: 'record' }),
  ];
}

function recordFileMenu(S, data) {
  const path = data.path || '';
  const id = data.id || data.v || '';
  if (!id) return recordFolderMenu(S, data);
  return [
    { head: up(data.name || 'FILE') },
    // No `path` rides on this row: `itemHtml` renders `act` and `v` and nothing
    // else, and `ctxmenu.js` stamps the host's own `data-path` onto every
    // acting item — which is where `record-open` reads it from.
    { label: 'Open it', act: 'record-open', v: id },
    { label: 'Back to the folder', act: 'record-folder', v: path, disabled: !path,
      note: path ? undefined : 'NO FOLDER' },
    { sep: true },
    ...loreItems('journal'),
    ...windowMenu(S, { win: 'record' }),
  ];
}

// ── The registry ────────────────────────────────────────────────────────────
const BUILDERS = {
  desktop: desktopMenu, window: windowMenu, dock: dockMenu, agent: agentMenu,
  node: nodeMenu, feed: feedMenu, action: actionMenu, stat: statMenu,
  directive: directiveMenu, project: projectMenu,
  record: recordMenu, 'record-folder': recordFolderMenu, 'record-file': recordFileMenu,
};

// Every kind `ctxmenu.js` may be handed. A `data-ctx` outside this list gets an
// empty menu and no menu opens at all, which is the right answer: a right-click
// that offers nothing should look like a right-click on the page. It is read
// off the registry rather than written twice — a hand-kept copy of a list is a
// list that goes stale the first time somebody adds a kind and forgets.
export const CTX_KINDS = Object.keys(BUILDERS);

// A right-click happens while the clock is running and while a forecast may
// have swapped the state singleton underneath. Nothing here writes, and a
// builder that throws opens no menu rather than taking the frame with it.
export function menuFor(S, ctx = {}) {
  if (!S) return [];
  const build = BUILDERS[ctx.kind];
  if (!build) return [];                 // an unknown kind opens no menu at all
  let items = [];
  try { items = (build(S, ctx.data || {}, ctx) || []).filter(Boolean); } catch { items = []; }
  // A kind this file does handle, on a thing that has gone — a released agent,
  // a feed entry that fell off the end of the 160 — answers rather than
  // flickering an empty plate.
  if (!items.some((it) => !it.sep && !it.head)) {
    const line = safe(() => EMPTY.ctx, '');
    return line ? [{ label: clip(line), quiet: true, disabled: true }] : [];
  }
  return items;
}
