// ─────────────────────────────────────────────────────────────────────────────
// FIND — one field over the whole machine.
//
// Every command the founder can run, every research node, every achievement and
// objective, every term the manual defines, every file in the Record, and the
// eight modules. Type, and the machine answers with what it has.
//
// Three things about it are load-bearing:
//
//   · It is an overlay, not a window. The layer is `pointer-events: none` and
//     only the plate takes a pointer, because `tools/shot.mjs` calls a
//     full-screen fixed layer that answers the pointer a page-eater. So there
//     is no scrim; the plate is opaque and carries its own shadow, and a press
//     outside it closes the palette the way a press outside a menu closes one.
//   · It holds the clock. `S.modalBlocking` is a hold that other things also
//     take — the assistant handoff owns one for minutes at a time — so this
//     records what was there and puts *that* back. Setting it false on the way
//     out would silently start the clock under a dialog that had stopped it.
//   · Nothing here runs on the frame loop. The palette repaints on a keystroke
//     and on an arrow, and the game is paused while it is up, so the list is
//     rebuilt from scratch each time and is stable while it is on screen.
//
// A row that maps to a real control carries that control's own `data-act`, and
// Enter clicks the row rather than calling a handler — same as the menu bar's
// `activateSelection`. That is what keeps `queue`, whose handler reads the
// event, working from the keyboard.
// ─────────────────────────────────────────────────────────────────────────────
import { S, activeProduct } from '../../engine/state.js';
import { render as paintInto, esc, runAction } from '../dom.js';
import { fmt, money } from '../../engine/format.js';
import { GLOSSARY } from '../../data/manual.js';
import { RESEARCH, RESEARCH_MAP, BRANCHES } from '../../data/research.js';
import { ACHIEVEMENTS } from '../../data/achievements.js';
import { OBJECTIVES } from '../../data/objectives.js';
import { CODE, FOUNDER } from '../../data/balance.js';
import { computeMods } from '../../systems/modifiers.js';
import { featureCost } from '../../systems/product.js';
import { maxAgents, hireCost } from '../../systems/agents.js';
import { promptCost, currentApproach } from '../../systems/founder.js';
import { researchCost } from '../../systems/research.js';
import { activeObjectives } from '../../systems/objectives.js';
import { availableCounters } from '../../systems/nemesis.js';
import { search as recordSearch } from '../../systems/record.js';
import { APPS, APP_MAP, menuFor, isLocked } from './apps.js';
import { ROMAN } from './config.js';
import * as WM from './wm.js';

const MAX_ROWS = 40;

// The groups, in the order they are printed. A row may override the head — the
// empty query prints the same rows under headings that say why they are there.
const KINDS = [
  { id: 'command', head: 'COMMANDS', cap: 10, w: 6 },
  { id: 'record', head: 'THE RECORD', cap: 10, w: 3 },
  { id: 'research', head: 'RESEARCH', cap: 8, w: 3 },
  { id: 'module', head: 'MODULES', cap: 8, w: 5 },
  { id: 'term', head: 'GLOSSARY', cap: 6, w: 2 },
  { id: 'objective', head: 'OBJECTIVES', cap: 5, w: 1 },
  { id: 'achievement', head: 'ACHIEVEMENTS', cap: 6, w: 0 },
];
const KIND_MAP = Object.fromEntries(KINDS.map((k, i) => [k.id, { ...k, order: i }]));

// The machine's own commands. Chrome, not content — the same call the menu bar
// makes when it writes “Show the desktop” beside a key.
const MACHINE = [
  { label: 'Show the desktop', act: 'os-showdesk', key: '0', sub: 'Machine' },
  { label: 'Tile the Desk and the Wire', act: 'os-layout', v: 'work', sub: 'Machine' },
  { label: 'The ops floor', act: 'os-layout', v: 'ops', sub: 'Machine' },
  { label: 'The Wire', act: 'wire-toggle', sub: 'Machine' },
  { label: 'The manual', act: 'help', key: '?', sub: 'Machine' },
  { label: 'The glossary', act: 'os-manual-tab', v: 'terms', sub: 'Machine' },
  { label: 'The keys', act: 'os-manual-tab', v: 'keys', sub: 'Machine' },
  { label: 'Settings', act: 'settings', sub: 'Machine' },
  { label: 'About this machine', act: 'os-about', sub: 'Machine' },
  { label: 'Play with your assistant', act: 'assistant-link', sub: 'Machine' },
  { label: 'Open the classic console', act: 'os-classic', sub: 'Machine' },
];

const up = (s) => String(s ?? '').toUpperCase();
const safe = (fn, dflt) => { try { const v = fn(); return v == null ? dflt : v; } catch { return dflt; } };
// The lock hints are authored prose and carry markdown. A footer line is text.
const plain = (s) => String(s ?? '').replace(/\*\*|[*`]/g, '');

// The refusal vocabulary, and it is not this module's. `src/data/context.js`
// already writes these lines for the context menus, and the same shortfall has
// to read the same way in both — a right-click and this field are one
// keystroke apart. Same wording, and the same rounding: a floor on what you
// have and a ceiling on what it costs, so the machine never says you have
// enough when you do not.
//
// These are copies. Collapsing them means exporting the helpers from
// `context.js`; until that happens, anything changed there changes here.
const clip = (t, n) => (String(t).length > n
  ? `${String(t).slice(0, n - 1).replace(/[\s,;:—-]+$/, '')}…` : String(t));
const gapNote = (have, need, label) => `${label} ${Math.floor(have)} OF ${Math.ceil(need)}`;
const needsNote = (name) => `NEEDS ${up(clip(name, 24))}`;
const cashNote = (n) => `NEEDS ${up(money(n))}`;
const ptsNote = (n) => `${up(fmt(Math.max(0, Math.round(n))))} PTS`;

// ── State ───────────────────────────────────────────────────────────────────

let on = false;
let q = '';
let sel = 0;
let layer = null;
let held = null;          // what `S.modalBlocking` was before this took it
let shown = [];           // the rows the last paint printed, in printed order

export function isOpen() { return on; }

export function open() {
  if (on) return true;
  const St = S;
  if (!St) return false;
  on = true;
  q = ''; sel = 0;
  // Record the previous hold — its presence as well as its value. Restoring
  // `false` where there was nothing is not the same thing, and never `false`
  // where the handoff had put its own name.
  held = { has: 'modalBlocking' in St, value: St.modalBlocking };
  St.modalBlocking = 'find';
  paint();
  focusField();
  return true;
}

export function close() {
  if (!on) return false;
  on = false;
  const St = S;
  // Only put back what this took. A row's click runs before the palette gets
  // out of the way, and what it ran may have taken the hold for itself — the
  // assistant handoff owns one for minutes at a time. Restoring over that
  // would start the clock under a dialog that had stopped it.
  if (St && held && St.modalBlocking === 'find') {
    if (held.has) St.modalBlocking = held.value;
    else delete St.modalBlocking;
  }
  held = null;
  q = ''; sel = 0; shown = [];
  layer?.remove?.();
  layer = null;
  return true;
}

// Once per task. `wire()` in the shell runs again on a prestige and registers
// a second `f` handler — `onKey` keeps a Set of them — so one keystroke would
// otherwise open this and shut it again before anything painted.
let toggling = false;
export function toggle() {
  if (toggling) return on;
  toggling = true;
  const clear = () => { toggling = false; };
  if (typeof queueMicrotask === 'function') queueMicrotask(clear);
  else Promise.resolve().then(clear);
  return on ? close() : open();
}

export function setQuery(text) {
  q = String(text ?? '');
  sel = 0;
  if (!on) return;
  const field = document.getElementById('find-q');
  if (field && field.value !== q) field.value = q;
  paint();
}

// ── The palette ─────────────────────────────────────────────────────────────

export function render(St = S) {
  const rows = build(St);
  shown = rows;
  if (sel >= rows.length) sel = Math.max(0, rows.length - 1);
  const list = rows.length
    ? groupHtml(rows)
    : `<div class="find-empty">Nothing on this machine matches that.</div>`;
  const detail = rows[sel] ? detailOf(rows[sel]) : '';
  const count = rows.length ? `${rows.length} RESULT${rows.length === 1 ? '' : 'S'}` : 'NOTHING';
  return `<div class="find-panel" role="dialog" aria-modal="true" aria-label="Find">
    <div class="find-field">
      <span class="find-glyph" aria-hidden="true">⊙</span>
      <input class="find-input" id="find-q" type="text" role="combobox" aria-expanded="true"
        aria-controls="find-list" aria-label="Find" placeholder="Search the machine"
        autocomplete="off" autocorrect="off" spellcheck="false"
        ${rows[sel] ? `aria-activedescendant="find-row-${sel}"` : ''}>
      <span class="find-count">${count}</span>
    </div>
    <div class="find-list" id="find-list" role="listbox" aria-label="Results">${list}</div>
    <div class="find-foot">
      <span class="ff-why">${esc(detail)}</span>
      <span class="ff-keys" aria-hidden="true">↑↓ MOVE · ↵ RUN · ESC CLOSE</span>
    </div>
  </div>`;
}

function groupHtml(rows) {
  let head = null;
  const out = [];
  rows.forEach((r, i) => {
    if (r.group !== head) {
      head = r.group;
      // A listbox owns options. The heads are furniture between them.
      out.push(`<div class="find-head" role="presentation">${esc(head)}</div>`);
    }
    out.push(rowHtml(r, i));
  });
  return out.join('');
}

function rowHtml(r, i) {
  const off = !r.act;
  const attrs = off ? '' : `data-act="${esc(r.act)}"${r.v !== undefined ? ` data-v="${esc(String(r.v))}"` : ''}`
    + (r.path !== undefined ? ` data-path="${esc(String(r.path))}"` : '');
  const cls = ['find-row', i === sel ? 'sel' : '', off ? 'off' : '', r.danger ? 'danger' : ''].filter(Boolean).join(' ');
  return `<button class="${cls}" type="button"
    role="option" id="find-row-${i}" data-i="${i}" aria-selected="${i === sel}"
    ${off ? 'aria-disabled="true"' : ''} ${attrs}>
    <span class="fr-glyph" aria-hidden="true">${esc(r.glyph || '⊡')}</span>
    <span class="fr-text">
      <span class="fr-label">${esc(r.label)}</span>
      ${r.sub ? `<span class="fr-sub">${esc(r.sub)}</span>` : ''}
    </span>
    ${r.note ? `<span class="fr-note${off ? ' blocked' : ''}">${esc(r.note)}</span>` : ''}
    ${r.key ? `<kbd class="fr-key">${esc(r.key)}</kbd>` : ''}
  </button>`;
}

// ── What is in it ───────────────────────────────────────────────────────────

function build(St) {
  if (!St) return [];
  const raw = q.trim().toLowerCase();
  if (!raw) return suggest(St);

  const hits = recordRows(St, raw);
  // The Record holds what actually happened, so an achievement it already has a
  // file for would otherwise print twice — once as the file and once as the
  // definition. The file wins; the definition is only interesting unearned.
  const filed = new Set(hits.map((h) => String(h.label).toLowerCase()));
  for (const c of pool(St)) {
    if ((c.kind === 'achievement' || c.kind === 'objective') && filed.has(c.label.toLowerCase())) continue;
    const s = scoreOf(c, raw);
    if (s > 0) hits.push({ ...c, s });
  }

  hits.sort((a, b) => b.s - a.s || a.label.localeCompare(b.label));
  const taken = [];
  const per = {};
  for (const h of hits) {
    const k = KIND_MAP[h.kind];
    per[h.kind] = (per[h.kind] || 0) + 1;
    if (per[h.kind] > (k?.cap || 6)) continue;
    taken.push(h);
    if (taken.length >= MAX_ROWS) break;
  }
  taken.sort((a, b) => (KIND_MAP[a.kind]?.order ?? 9) - (KIND_MAP[b.kind]?.order ?? 9) || b.s - a.s);
  for (const t of taken) t.group = t.group || KIND_MAP[t.kind]?.head || 'RESULTS';
  return taken;
}

// Everything except the Record, which does its own ranking.
function pool(St) {
  return [...commandRows(St), ...moduleRows(St), ...researchRows(St),
    ...termRows(), ...objectiveRows(St), ...achievementRows(St)];
}

// ── Commands ────────────────────────────────────────────────────────────────
// The app menus are the single source: a command the palette offers is the same
// item the menu bar offers, with the same action and the same key. A blocked
// one keeps its place and says why, which is the whole point of listing it.

// Two commands with the same action and the same value are one command. The
// Desk and Product both offer `Launch Testco…`, the Manual and the machine
// both offer the glossary, and the Uplink offers `assistant-link` twice; the
// palette is a flat list, so the same row twice reads as a bug rather than as
// two menus agreeing. The machine's own go in first and keep their wording.
//
// Two actions are skipped outright: they open this. A row that closes the
// palette by opening it is a dead end.
const SKIP_ACTS = new Set(['find', 'record-find']);

function commandRows(St) {
  const out = [];
  const seen = new Set();
  const add = (row) => {
    const k = `${row.act || row._act}:${row.v ?? ''}`;
    if (seen.has(k)) return;
    seen.add(k);
    delete row._act;
    out.push(row);
  };
  for (const it of MACHINE) {
    if (SKIP_ACTS.has(it.act)) continue;
    add({ kind: 'command', label: it.label, sub: it.sub, glyph: '⚙', key: it.key, act: it.act, v: it.v });
  }
  for (const app of APPS) {
    if (app.module && isLocked(St, app) && !app.showLocked) continue;
    const locked = app.module && isLocked(St, app);
    for (const it of safe(() => menuFor(St, app.id), [])) {
      if (it.sep || it.head || !it.act || SKIP_ACTS.has(it.act)) continue;
      const off = !!it.disabled || locked;
      add({
        kind: 'command', label: it.label, sub: app.fullTitle || app.title,
        glyph: app.glyph || '⊙', key: it.key, danger: !!it.danger,
        // A blocked row still has to hold its identity for the dedupe, or two
        // blocked items with no action collapse into one.
        act: off ? null : it.act, _act: it.act, v: it.v,
        note: off ? (it.note ? up(it.note) : (locked ? 'LOCKED' : refusal(St, it))) : null,
        why: off && locked ? plain(app.lockHint) : null,
      });
    }
  }
  return out;
}

// Why a blocked command is blocked, in the machine's own voice. Every branch
// here reads state and prints the gap — a disabled item that says only that it
// is disabled teaches a founder nothing.
function refusal(St, it) {
  switch (it.act) {
    case 'do': {
      if (it.v === 'code') return gapNote(St.founder.focus, CODE.MANUAL_FOCUS_COST, 'FOCUS');
      if (it.v === 'users') return gapNote(St.founder.focus, FOUNDER.TALK_FOCUS_COST, 'FOCUS');
      if (it.v === 'post') return gapNote(St.founder.focus, FOUNDER.POST_FOCUS_COST, 'FOCUS');
      if (it.v === 'prompt') {
        const pc = safe(() => promptCost(St, computeMods(St), currentApproach(St)), null);
        if (!pc) return 'NOT NOW';
        if (St.founder.focus < pc.focus) return gapNote(St.founder.focus, pc.focus, 'FOCUS');
        if (St.company.cash < pc.cash) return cashNote(pc.cash);
        if (pc.insight && St.resources.insight < pc.insight) return gapNote(St.resources.insight, pc.insight, 'INSIGHT');
      }
      return 'NOT NOW';
    }
    case 'ship': {
      const p = activeProduct(St);
      if (!p) return 'NO PRODUCT';
      const cost = safe(() => featureCost(St, p), 0);
      return `CODE ${up(fmt(Math.floor(St.resources.code)))} OF ${up(fmt(Math.ceil(cost)))}`;
    }
    case 'launch': return 'NOTHING TO LAUNCH';
    case 'recruit': {
      if (St.agents.length >= safe(() => maxAgents(St), 0)) return 'ROSTER FULL';
      return cashNote(safe(() => hireCost(St), 0));
    }
    case 'price': case 'pricing': return 'NOT LAUNCHED';
    case 'cancel-research': return 'NOTHING RUNNING';
    case 'os-clear-queue': return 'THE QUEUE IS EMPTY';
    case 'counter': {
      // `ok` is two things — the move has to be open to you and you have to be
      // able to pay for it — and naming the wrong one sends a founder to raise
      // money for a move that is not on the table.
      const k = safe(() => availableCounters(St).find((x) => x.id === it.v), null);
      if (!k) return 'NOT AVAILABLE';
      if (!k.need) return 'NOT YET';
      if ((k.cost?.cash || 0) > St.company.cash) return cashNote(k.cost.cash);
      if ((k.cost?.focus || 0) > St.founder.focus) return gapNote(St.founder.focus, k.cost.focus, 'FOCUS');
      if ((k.cost?.code || 0) > (St.resources.code || 0)) {
        return `CODE ${up(fmt(Math.floor(St.resources.code || 0)))} OF ${up(fmt(Math.ceil(k.cost.code)))}`;
      }
      if ((k.cost?.reputation || 0) > (St.resources.reputation || 0)) {
        return gapNote(St.resources.reputation || 0, k.cost.reputation, 'REPUTATION');
      }
      return 'NOT AVAILABLE';
    }
    case 'raise': return 'NOT ON OFFER';
    default: return 'NOT AVAILABLE';
  }
}

// ── Modules and apps ────────────────────────────────────────────────────────

function moduleRows(St) {
  return APPS.filter((a) => !a.module || !isLocked(St, a) || a.showLocked).map((a) => {
    const locked = a.module && isLocked(St, a);
    return {
      kind: 'module', label: a.fullTitle || a.title, sub: a.blurb, glyph: a.glyph || '⊡',
      key: a.index ? String(a.index) : undefined,
      act: locked ? null : 'view', v: a.id,
      note: locked ? 'LOCKED' : null,
      why: locked ? plain(a.lockHint) : a.blurb,
    };
  });
}

// ── Research ────────────────────────────────────────────────────────────────
// Enter starts a node when the bench is free and queues it when it is not,
// because that is what the founder would have clicked. The note carries the
// gap, so a node that cannot be started says what it is waiting for.

function researchRows(St) {
  const done = St.research?.done || {};
  const queue = St.research?.queue || [];
  const bank = St.resources?.research || 0;
  const active = St.research?.active || null;
  const busy = !!active;
  return RESEARCH.map((n) => {
    const branch = BRANCHES[n.branch];
    const isDone = !!done[n.id];
    const running = active === n.id;
    const queued = queue.indexOf(n.id) >= 0;
    const blocked = isDone ? 'LEARNED' : gateOf(St, n);
    const cost = safe(() => researchCost(St, n), n.cost);
    let note = blocked;
    if (!blocked) note = bank >= cost ? ptsNote(cost) : `${ptsNote(cost - bank)} SHORT`;
    if (queued && !isDone) note = `SLOT ${queue.indexOf(n.id) + 1}`;
    // What is on the bench is already running. `queue` is a toggle, so sending
    // it here would put the running node in the queue as well and start it a
    // second time the day it lands; the row goes to the bench instead.
    if (running) note = 'RUNNING';
    return {
      kind: 'research', label: n.name, sub: `${branch?.name || n.branch} · TIER ${n.tier}`,
      glyph: branch?.icon || '⌬', note,
      act: running ? 'view' : blocked ? null : busy || queued ? 'queue' : 'research',
      v: running ? 'research' : n.id,
      why: n.desc, keywords: n.branch,
    };
  });
}

function gateOf(St, n) {
  if (n.act && (St.company?.act || 1) < n.act) return `ACT ${ROMAN[n.act] || n.act}`;
  for (const r of n.reqs || []) {
    if (!St.research?.done?.[r]) return needsNote(RESEARCH_MAP[r]?.name || String(r).replace(/_/g, ' '));
  }
  const gate = n.gate?.compute || 0;
  const have = St.resources?.computeCap || 0;
  // The shortfall, not the bar. A founder reading `1.2K PF NEEDED` beside 1.1K
  // of compute has to do the subtraction the machine already did.
  if (gate && have < gate) return `${up(fmt(gate - have))} PF SHORT`;
  return null;
}

// ── The glossary ────────────────────────────────────────────────────────────

const TERMS = [];
for (const g of GLOSSARY) for (const [name, def] of g.items) TERMS.push({ name, def, group: g.group });

function termRows() {
  return TERMS.map((t) => ({
    kind: 'term', label: t.name, sub: t.def, glyph: '⊡',
    act: 'os-manual-tab', v: 'terms', note: up(t.group), why: t.def,
  }));
}

// ── Objectives and achievements ─────────────────────────────────────────────

function objectiveRows(St) {
  const done = St.objectivesDone || {};
  const live = new Set(safe(() => activeObjectives(St).map((o) => o.id), []));
  return OBJECTIVES.filter((o) => (o.act ?? 1) <= St.company.act || done[o.id]).map((o) => ({
    kind: 'objective', label: o.title, sub: o.hint, glyph: '⊞',
    // Everything unfinished in this list is already reachable — the filter
    // above dropped the acts that are not. Naming its act read as a lock.
    note: done[o.id] ? `DAY ${done[o.id]}` : live.has(o.id) ? 'LIVE' : 'OPEN',
    act: 'view', v: o.view || 'desk', why: o.hint,
  }));
}

function achievementRows(St) {
  const got = St.achievements || {};
  // A secret achievement is a story beat; until it lands, Find does not say
  // what it is — the name would be the spoiler.
  return ACHIEVEMENTS.map((a) => {
    const hidden = a.secret && !got[a.id];
    return {
      kind: 'achievement', label: hidden ? '???' : a.name, sub: hidden ? 'Something in the story unlocks it.' : a.desc,
      glyph: hidden ? '◌' : (a.icon || '◈'),
      note: got[a.id] ? `DAY ${got[a.id]}` : hidden ? 'SECRET' : a.rare ? 'RARE' : 'NOT YET',
      act: 'view', v: 'legacy', why: hidden ? 'Something in the story unlocks it.' : a.desc,
    };
  });
}

// ── The Record ──────────────────────────────────────────────────────────────
// `search` ranks its own hits, so they arrive scored and in order: `act` on a
// hit is the act it happened in and `v` is that ranking, not an action — every
// one of these opens the Record at that file. `why` is the machine saying which
// part of the file the query touched, which is worth a note of its own when the
// match was in a body the row cannot show.
//
// The action is `record-open`, the same one the Record's own rows carry, with
// the same `data-path` and `data-v`: the shell already answers it by writing
// `S.ui.os.record` and switching to the window. A palette-only action would be
// a second way to do one thing, and the first one to go stale.

function recordRows(St, raw) {
  const hits = safe(() => recordSearch(St, raw), []) || [];
  return hits.slice(0, KIND_MAP.record.cap).map((r, i) => ({
    kind: 'record', label: r.label, sub: r.sub, glyph: '✎',
    note: up(r.why || r.kind || ''),
    act: 'record-open', v: r.id, path: r.path,
    why: `${r.path} · ${r.sub || r.label}`, s: 88 - i,
  }));
}

// ── The empty query ─────────────────────────────────────────────────────────
// What a founder is most likely to want next: the hands of whatever is in
// front of them, then what the game is asking for, then what is on the bench,
// then the modules. Never an empty list.

function suggest(St) {
  const out = [];
  const focusId = WM.focused?.() || WM.lastModule?.() || 'desk';
  const order = focusId === 'desk' ? ['desk'] : [focusId, 'desk'];
  const seen = new Set();
  // Blocked hands come after the ones that work, but they do come: a founder
  // who opens this at zero Focus is owed the reason, not an empty group.
  const blocked = [];
  for (const id of order) {
    const app = APP_MAP[id];
    if (!app) continue;
    for (const it of safe(() => menuFor(St, id), [])) {
      if (it.sep || it.head || !it.act || SKIP_ACTS.has(it.act)) continue;
      const k = `${it.act}:${it.v ?? ''}`;
      if (seen.has(k)) continue;
      seen.add(k);
      const row = { kind: 'command', group: 'COMMANDS', label: it.label, sub: app.fullTitle || app.title,
        glyph: app.glyph || '⊙', key: it.key, act: it.act, v: it.v, danger: !!it.danger };
      if (!it.disabled) { out.push(row); continue; }
      if (blocked.length < 4) {
        blocked.push({ ...row, act: null, note: it.note ? up(it.note) : refusal(St, it) });
      }
    }
    if (out.length >= 8) break;
  }
  out.push(...blocked);

  for (const o of safe(() => activeObjectives(St), [])) {
    out.push({ kind: 'objective', group: 'NEXT', label: o.title, sub: o.hint, glyph: '⊞',
      note: 'LIVE', act: 'view', v: o.view || 'desk', why: o.hint });
  }

  const bench = benchRow(St);
  if (bench) out.push(bench);

  for (const a of APPS) {
    if (a.module && isLocked(St, a) && !a.showLocked) continue;
    const locked = a.module && isLocked(St, a);
    out.push({ kind: 'module', group: 'MODULES', label: a.fullTitle || a.title, sub: a.blurb,
      glyph: a.glyph || '⊡', key: a.index ? String(a.index) : undefined,
      act: locked ? null : 'view', v: a.id, note: locked ? 'LOCKED' : null,
      why: locked ? plain(a.lockHint) : a.blurb });
  }
  return out.slice(0, MAX_ROWS);
}

// What is running, or the cheapest thing that could be.
function benchRow(St) {
  const active = St.research?.active ? RESEARCH_MAP[St.research.active] : null;
  if (active) {
    return { kind: 'research', group: 'ON THE BENCH', label: active.name, glyph: BRANCHES[active.branch]?.icon || '⌬',
      sub: active.desc, note: 'RUNNING', act: 'view', v: 'research', why: active.desc };
  }
  const open = RESEARCH.filter((n) => !St.research?.done?.[n.id] && !gateOf(St, n));
  if (!open.length) return null;
  const n = open.sort((a, b) => a.cost - b.cost)[0];
  return { kind: 'research', group: 'ON THE BENCH', label: n.name, glyph: BRANCHES[n.branch]?.icon || '⌬',
    sub: n.desc, note: ptsNote(safe(() => researchCost(St, n), n.cost)),
    act: 'research', v: n.id, why: n.desc };
}

// ── Ranking ─────────────────────────────────────────────────────────────────
// Exact prefix, then word-start, then substring — and a blocked row sinks under
// a runnable one of the same score, because the palette is for doing things.

function match(text, needle) {
  if (!text) return 0;
  const t = String(text).toLowerCase();
  if (t === needle) return 120;
  if (t.startsWith(needle)) return 100 - Math.min(30, t.length - needle.length) * 0.2;
  const i = t.indexOf(needle);
  if (i < 0) return 0;
  const before = t[i - 1];
  if (/[\s\-_/·:(,.]/.test(before)) return 70 - Math.min(40, i) * 0.1;
  return 40 - Math.min(60, i) * 0.1;
}

function one(c, needle) {
  let s = match(c.label, needle);
  if (!s) s = match(c.sub, needle) * 0.45;
  if (!s) s = match(c.keywords, needle) * 0.35;
  return s;
}

function scoreOf(c, needle) {
  // Several words are several requirements: “agent lane” must find the thing
  // that is both, not everything that is either.
  const words = needle.split(/\s+/).filter(Boolean);
  let s;
  if (words.length > 1) {
    let total = 0;
    for (const w of words) {
      const v = one(c, w);
      if (!v) { total = 0; break; }
      total += v;
    }
    s = total ? total / words.length + 6 : one(c, needle);
  } else {
    s = one(c, needle);
  }
  if (!s) return 0;
  s += KIND_MAP[c.kind]?.w || 0;
  if (!c.act) s -= 8;
  return s;
}

// ── The footer ──────────────────────────────────────────────────────────────

function detailOf(r) {
  if (!r) return '';
  const why = r.why || r.sub || '';
  if (!r.act && r.note) return why ? `${r.note} — ${why}` : r.note;
  return why;
}

// ── Painting ────────────────────────────────────────────────────────────────

function host() {
  if (layer && layer.isConnected) return layer;
  const app = document.getElementById('app');
  if (!app) return null;
  layer = document.createElement('div');
  layer.className = 'find-layer';
  layer.id = 'find';
  app.appendChild(layer);
  return layer;
}

function paint() {
  if (!on) return;
  const el = host();
  if (!el) return;
  // `render()` patches, so the field keeps its node, its caret and its value —
  // and the markup never writes a `value` attribute, which `syncAttrs` would
  // otherwise put back over what the founder has typed.
  paintInto(el, render(S));
}

function focusField() {
  const go = () => {
    const f = document.getElementById('find-q');
    if (!f) return;
    if (f.value !== q) f.value = q;
    try { f.focus({ preventScroll: true }); } catch {}
  };
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(go);
  else go();
}

function move(dir) {
  if (!shown.length) return;
  sel = (sel + dir + shown.length) % shown.length;
  paint();
  const row = layer?.querySelector?.('.find-row.sel');
  try { row?.scrollIntoView?.({ block: 'nearest' }); } catch {}
}

function run() {
  const row = layer?.querySelector?.('.find-row.sel');
  if (!row || row.classList.contains('off')) { refuse(); return; }
  // A real, bubbling click: `queue` reads the event, and going through the
  // delegated handler means the palette runs the same control the menu does.
  row.click();
}

function refuse() {
  const panel = layer?.querySelector?.('.find-panel');
  if (!panel) return;
  panel.classList.remove('nope');
  void panel.offsetWidth;
  panel.classList.add('nope');
}

// ── Opening a file in the Record ────────────────────────────────────────────
// Selection lives in `S.ui.os.record`, which the Record app reads and the save
// carries. Setting it here and then dispatching `view` means the palette does
// not need to know how that window is built.

export function openFile(path, id) {
  const St = S;
  if (!St) return false;
  St.ui ??= {};
  St.ui.os ??= {};
  St.ui.os.record = { path, id };
  close();
  // The shell's own handler writes the selection and switches the view; going
  // through it means the Record repaints and the title bar follows. It is not
  // registered until the workstation is built, so `view` is the fallback.
  if (!runAction('record-open', { path, v: id })) runAction('view', { v: 'record' });
  return true;
}

// ── Keyboard and pointer ────────────────────────────────────────────────────
// One listener each, at module scope. The palette's own markup carries no
// handlers, and the field is a real input — which is why these are here at all:
// `dom.js`'s key dispatcher steps aside for an input, so Escape, the arrows and
// Enter would never reach it while the founder is typing.

if (typeof document !== 'undefined') {
  document.addEventListener('keydown', (e) => {
    if (!on) return;
    const k = e.key;
    if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (k === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); move(1); return; }
    if (k === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); move(-1); return; }
    if (k === 'PageDown') { e.preventDefault(); e.stopPropagation(); move(5); return; }
    if (k === 'PageUp') { e.preventDefault(); e.stopPropagation(); move(-5); return; }
    if (k === 'Enter') { e.preventDefault(); e.stopPropagation(); run(); return; }
    // Nothing behind the palette may be reached with Tab while it is up.
    if (k === 'Tab') { e.preventDefault(); e.stopPropagation(); move(e.shiftKey ? -1 : 1); }
  }, true);

  document.addEventListener('input', (e) => {
    if (!on) return;
    if (e.target?.id !== 'find-q') return;
    q = e.target.value || '';
    sel = 0;
    paint();
    const list = document.getElementById('find-list');
    if (list) list.scrollTop = 0;
  });

  // Hover moves the selection, the way it does in a menu.
  document.addEventListener('pointerover', (e) => {
    if (!on) return;
    const row = e.target?.closest?.('.find-row');
    if (!row) return;
    const i = Number(row.dataset.i);
    if (Number.isFinite(i) && i !== sel) { sel = i; paint(); }
  });

  // A press outside the plate closes it. No scrim: a full-screen fixed layer
  // that answers the pointer is what `tools/shot.mjs` calls a page-eater.
  document.addEventListener('pointerdown', (e) => {
    if (!on) return;
    if (e.target?.closest?.('.find-panel')) return;
    close();
  }, true);

  // A row that dispatched a real action has done its work; the palette gets out
  // of the way afterwards, the way a menu does.
  document.addEventListener('click', (e) => {
    if (!on) return;
    if (!e.target?.closest?.('.find-row[data-act]')) return;
    setTimeout(() => close(), 0);
  });
}
