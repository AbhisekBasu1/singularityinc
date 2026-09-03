// ─────────────────────────────────────────────────────────────────────────────
// THE MODELS — everything the workstation draws, as a function of state.
//
// Nothing in this file touches the DOM. That is not tidiness for its own sake:
// `tools/ostest.mjs` renders the whole desktop headlessly at five points in a
// run and checks it for the same leaked `undefined` and `NaN` that
// `tools/uitest.mjs` checks every view for.
// ─────────────────────────────────────────────────────────────────────────────
import { esc, bar, sparkline } from '../dom.js';
import { fmt, gameDateShort, clockText } from '../../engine/format.js';
import * as Transport from '../transport.js';
import { isLocked, dockApps } from './apps.js';
import { navBadge, ROMAN } from '../shell-console.js';
import { visibleStats, alertChips, statsHtml, STAT_PRIORITY } from '../readouts.js';
import { nextActHint } from '../../systems/progression.js';
import { researchProgressPct } from '../../systems/research.js';
import { RESEARCH_MAP } from '../../data/research.js';
import { activeObjectives, objectiveProgress } from '../../systems/objectives.js';
import { openThreadCount } from '../../systems/feed.js';
import { unread as unreadMail } from '../../systems/mail.js';
import { ACTS, TIME } from '../../data/balance.js';
import { ARCHETYPE_MAP } from '../../data/legacy.js';
import { CATEGORY_MAP } from '../../data/products.js';
import { OS, machineName } from './config.js';
import { activity } from '../../systems/activity.js';
import { nominalLine, bootRoll } from '../actchrome.js';

const safe = (fn, dflt) => { try { const v = fn(); return v === undefined ? dflt : v; } catch { return dflt; } };

// ── Layout modes ────────────────────────────────────────────────────────────

export function modeFor(w) {
  if (w <= OS.STACKED_MAX) return 'stacked';
  if (w < OS.DESKTOP_MIN) return 'compact';
  return 'desktop';
}

// Where the windows go on a machine that has never been logged into. Desktop
// mode is the console's own shape — the work on the left, the Wire down the
// right — because that is what First Light expects to spotlight.
export function layoutFor(mode, { w, h } = { w: 1440, h: 900 }) {
  if (mode === 'desktop') {
    // `w` is the field — `deskSize()` has already taken the docked Wire out of
    // it — so the Desk fills what is left edge to edge. The Wire's rect here is
    // only ever used if the founder undocks the rail; while it is docked the
    // stylesheet owns its geometry and this is ignored.
    const pad = OS.INSET;
    return {
      desk: { open: true, x: pad, y: pad, w: w - pad * 2, h: h - pad * 2, z: 1 },
      wire: { open: true, x: Math.round(w * 0.68), y: pad, w: Math.round(w * 0.3), h: h - pad * 2, z: 2 },
    };
  }
  if (mode === 'compact') {
    return { desk: { open: true, zoomed: true, x: OS.INSET, y: OS.INSET, w: w - OS.INSET * 2, h: h - OS.INSET * 2, z: 1 } };
  }
  return { desk: { open: true, zoomed: true, x: 0, y: 0, w, h, z: 1 } };
}

// ── The dock ────────────────────────────────────────────────────────────────

// How many tiles the rack can show before it must shed. `budget` is a count,
// measured by `dock.js` against the real available extent — the dock is a
// vertical rail below 1120px and a horizontal bar above it, so the axis that
// runs out is not always the same one.
//
// It sheds rather than shrinks, for the same reason the menu bar does: a rack
// of 35px tiles is a rack nobody can hit, and a rail that simply scrolls hides
// apps behind a gesture nobody knows is there. At 420x760 — a real ChatGPT pane
// — thirteen tiles already needed 753px of a 730px rail before anything new was
// added to it, and the overflow was silent.
//
// The order it sheds in is the reverse of what a founder can least afford to
// lose: the machine's own utilities first, then the world's, and never a
// module. A module is a digit key and a walkthrough anchor.
const SHED_LAST = ['desk', 'product', 'agents', 'research', 'market', 'world', 'story', 'legacy'];

export function dockModel(S, { windows = {}, focused = null, budget = Infinity } = {}) {
  const all = dockApps(S).map((a) => {
    const win = windows[a.id];
    const locked = a.module && isLocked(S, a);
    return {
      id: a.id,
      title: a.title,
      glyph: a.glyph,
      portrait: a.portrait || null,
      accent: a.accent,
      index: a.index || null,
      module: !!a.module,
      section: a.section,
      blurb: a.blurb,
      locked,
      lockHint: a.lockHint || 'Unlocks later.',
      badge: locked ? '' : badgeFor(S, a),
      running: !!win?.open,
      minimized: !!(win?.open && win.min),
      focused: focused === a.id && !!win?.open && !win.min,
    };
  });
  if (!(budget > 0) || all.length <= budget) return { rows: all, shed: [] };
  // One slot goes to the overflow tile itself.
  const keep = Math.max(1, budget - 1);
  const order = [...all].sort((x, y) => rank(x) - rank(y));
  const dropped = new Set(order.slice(0, Math.max(0, all.length - keep)).map((t) => t.id));
  return {
    rows: all.filter((t) => !dropped.has(t.id)),
    shed: all.filter((t) => dropped.has(t.id)),
  };
}

// Lower rank sheds first. A running or focused app never sheds before an idle
// one, and a module never sheds before anything else.
function rank(t) {
  const mod = SHED_LAST.indexOf(t.id);
  if (mod >= 0) return 1000 + mod;
  return (t.running ? 100 : 0) + (t.badge ? 50 : 0) + (t.locked ? -10 : 0);
}

function badgeFor(S, a) {
  if (a.module) return navBadge(S, a);
  if (a.id === 'wire') {
    const n = openThreadCount(S);
    return n ? `<span class="nav-badge amber">${n}</span>` : '';
  }
  if (a.id === 'uplink') {
    if (S.world?.author?.muted) return `<span class="nav-badge">✕</span>`;
    return '';
  }
  if (a.id === 'mail') {
    const n = safe(() => unreadMail(S).length, 0);
    return n ? `<span class="nav-badge amber">${n}</span>` : '';
  }
  return '';
}

export function dockHtml(S, opts) {
  const { rows, shed } = dockModel(S, opts);
  let last = null;
  const out = [];
  for (const t of rows) {
    if (last && t.section !== last) out.push('<span class="dock-sep" aria-hidden="true"></span>');
    last = t.section;
    const tip = t.locked
      ? esc(t.lockHint)
      : `<b>${esc(t.title)}</b>${t.blurb ? '<br>' + esc(t.blurb) : ''}`;
    const face = t.portrait
      ? `<span class="dock-face" style="background-image:url('${t.portrait}')"></span>`
      : `<span class="dock-glyph">${t.locked ? '⊘' : t.glyph}</span>`;
    out.push(`<button class="dock-tile ${t.locked ? 'locked' : ''} ${t.running ? 'running' : ''} ${t.minimized ? 'min' : ''} ${t.focused ? 'on' : ''}"
      data-ctx="dock" data-app="${t.id}"
      style="--accent:${t.accent};--i:${out.length}"
      role="tab" aria-selected="${t.focused}" aria-label="${esc(t.title)}"
      ${t.locked ? '' : `data-act="os-dock" data-v="${t.id}"`}
      data-tip="${tip.replace(/"/g, '&quot;')}">
      ${t.index ? `<span class="dock-idx">${String(t.index).padStart(2, '0')}</span>` : ''}
      ${face}
      ${t.badge}
      <span class="dock-tick" aria-hidden="true"></span>
    </button>`);
  }
  if (shed.length) {
    const names = shed.map((t) => t.title).join(', ');
    out.push('<span class="dock-sep" aria-hidden="true"></span>');
    out.push(`<button class="dock-tile dock-more" data-act="os-menu" data-v="dockmore"
      aria-label="${shed.length} more" aria-haspopup="menu"
      data-tip="<b>${shed.length} more</b><br>${esc(names)}"><span class="dock-glyph">⋯</span>
      <span class="dock-idx">${shed.length}</span></button>`);
  }
  return out.join('');
}

// What the overflow tile lists. Same rows, same lock rule, as menu items.
export function dockMoreItems(S, opts) {
  const { shed } = dockModel(S, opts);
  if (!shed.length) return [{ head: 'nothing hidden' }];
  return [{ head: 'ALSO HERE' }].concat(shed.map((t) => ({
    label: t.title,
    note: t.locked ? 'LOCKED' : t.running ? 'OPEN' : '',
    disabled: !!t.locked,
    act: 'view', v: t.id,
  })));
}

// ── The menu bar ────────────────────────────────────────────────────────────

// ── The power cell ──────────────────────────────────────────────────────────
// The company employs one human being, so the machine's power supply is that
// human being. Focus is the founder's day, metered — and putting it in the bar
// beside the signal, the messages and the clock is the premise stated as
// chrome rather than as prose. It reads at a glance and it is the only number
// up here that is about the person rather than the company.
const POWER_SAY = [
  [0.75, 'Charged. The machine runs on this.'],
  [0.45, 'Enough for one more thing.'],
  [0.20, 'Running low. Everything costs more from here.'],
  [0.00, 'Empty. What you do now, you do badly.'],
];

export function powerHtml(S) {
  const max = Math.max(1, S.founder?.focusMax || 1);
  const now = Math.max(0, Math.min(max, S.founder?.focus ?? 0));
  const pct = now / max;
  const tone = pct > 0.55 ? 'ok' : pct > 0.25 ? 'warn' : 'low';
  const say = POWER_SAY.find(([at]) => pct >= at)?.[1] || POWER_SAY[POWER_SAY.length - 1][1];
  return `<div class="mb-power ${tone}" aria-label="Focus"
      data-tip="<b>Focus</b> — ${Math.round(now)} of ${Math.round(max)}<br>${esc(say)}"
      data-tip-title="">
    <span class="pw-cell"><i style="width:${(pct * 100).toFixed(0)}%"></i></span>
    <span class="pw-n">${Math.round(now)}</span>
  </div>`;
}

// The most-pressed control in the game. The console gives it four buttons in
// the topbar and the founder uses them constantly — skip the dead stretch, slow
// down when a decision is due. Behind the clock's popover it was three actions
// instead of one, many times a session, and there is no key for speed: Space
// pauses and the digits are the eight modules. So it lives in the bar.
// `-` and `=` walk the speeds and `N` runs to the next decision; each key says
// so in its tip, because for a long time this control had no key at all.
export function speedHtml(S) {
  const paused = !!S.settings.paused;
  const seeking = Transport.isSeeking();
  return `<div class="mb-speed" role="group" aria-label="Speed">
    <button class="sp ${paused ? 'on' : ''}" data-act="speed" data-v="0"
      aria-label="Pause" aria-pressed="${paused}" data-tip="Pause · <b>Space</b>">❚❚</button>
    ${TIME.SPEEDS.map((sp, i) => `<button class="sp ${!paused && S.settings.speed === i + 1 ? 'on' : ''}"
      data-act="speed" data-v="${i + 1}" aria-pressed="${!paused && S.settings.speed === i + 1}"
      data-tip="${sp}× · <b>−</b> slower, <b>=</b> faster">${sp}×</button>`).join('')}
    <button class="sp next ${seeking ? 'on' : ''}" data-act="next-decision"
      aria-label="Run to the next decision" aria-pressed="${seeking}"
      data-tip="${seeking ? 'Running to the next decision — press to stop' : 'Run to the next decision'} · <b>N</b>">▸❚</button>
  </div>`;
}

// The time of day, as the founder's clock reads it. The bar patches this into
// `#mb-time` on every paint rather than rebuilding the clock button, because
// the button is a menu anchor and a rebuilt anchor loses its lit state.
export function clockTime(S) { return clockText(S.time.hourOfDay, TIME.DAWN_H); }

export function clockHtml(S) {
  const seeking = Transport.isSeeking();
  return `<button class="mb-clock ${S.settings.paused ? 'paused' : ''} ${seeking ? 'seeking' : ''}" data-act="os-menu" data-v="clock"
      aria-label="Time" data-tip="Speed and the clock · <b>Space</b> pauses, <b>−</b> and <b>=</b> step, <b>N</b> runs to the next decision">
    <span class="mb-act">ACT ${ROMAN[S.company.act]}</span>
    <span class="mb-dot">·</span>
    <span class="mb-day">D ${Math.floor(S.time.day)}</span>
    <span class="mb-dot mb-dot-d">·</span>
    <span class="mb-date">${esc(gameDateShort(S.time.day).toUpperCase())}</span>
    <span class="mb-dot mb-dot-t">·</span>
    <span class="mb-time" id="mb-time">${clockTime(S)}</span>
  </button>`;
}

export function alertsHtml(S) {
  const alerts = alertChips(S);
  // §I5. The nominal line is the act's own, so the machine sounds different in
  // Act IV — and it is the tip and the label as well as the lamp, because the
  // lamp itself is four pixels of accent and says nothing on its own.
  if (!alerts.length) {
    const line = safe(() => nominalLine(S), 'ALL SYSTEMS NOMINAL');
    return `<span class="mb-nominal" data-tip="${esc(line)}" aria-label="${esc(line)}"></span>`;
  }
  return alerts.map(([k, t]) => `<span class="sl-alert ${k}">${esc(t)}</span>`).join('');
}

// How many stats fit. Measured once per resize by the menu bar, never per
// frame; this only says which ones survive a given budget.
export function statsForWidth(S, budget) {
  const all = visibleStats(S).map((s) => s.id);
  if (budget >= all.length) return all;
  const drop = new Set();
  for (const id of STAT_PRIORITY) {
    if (all.length - drop.size <= Math.max(1, budget)) break;
    if (all.includes(id)) drop.add(id);
  }
  return all.filter((id) => !drop.has(id));
}

export { statsHtml };

// ── The widgets ─────────────────────────────────────────────────────────────
// The nav's two cards and the topbar's numbers, on the wallpaper, for the
// stretch of a run where the Desk is not the window in front.

export function nowWidgetHtml(S) {
  const goal = safe(() => nextActHint(S), null);
  const active = S.research.active ? RESEARCH_MAP[S.research.active] : null;
  const objs = safe(() => activeObjectives(S), []);
  const prog = safe(() => objectiveProgress(S), { done: 0, total: 0 });
  return `<section class="widget widget-now" aria-label="What the game wants next">
    <div class="widget-head"><span class="widget-k">NOW</span>
      <span class="widget-n">${prog.done}/${prog.total}</span></div>
    ${goal ? `<button class="w-goal" data-act="view" data-v="world">
      <span class="w-goal-k">NEXT · ACT ${ROMAN[goal.act]}</span>
      <span class="w-goal-name">${esc(goal.name)}</span>
      <span class="w-goal-hint">${esc(goal.hint)}</span>
      ${goal.ready && goal.waitText ? `<span class="w-goal-ready">✓ Thresholds met · ${esc(goal.waitText)}</span>` : ''}
    </button>` : ''}
    ${active
      ? `<button class="w-research" data-act="view" data-v="research">
          <span class="w-goal-k">RESEARCHING</span>
          <span class="w-res-name">${esc(active.name)}</span>
          ${bar(researchProgressPct(S), 'var(--cyan)', { thin: true, shimmer: true })}
        </button>`
      : `<button class="w-research idle" data-act="view" data-v="research">
          <span class="w-goal-k">RESEARCH</span>
          <span class="w-res-name">Nothing is being researched</span>
          <span class="w-goal-hint">${fmt(S.resources.research)} points with nowhere to go.</span>
        </button>`}
    ${objs.length ? `<div class="w-objs">${objs.map((o) => `
      <button class="w-obj" ${o.view ? `data-act="view" data-v="${o.view}"` : ''}>
        <span class="w-obj-dot"></span>
        <span class="w-obj-text"><span class="w-obj-title">${esc(o.title)}</span>
        <span class="w-obj-hint">${esc(o.hint)}</span></span>
      </button>`).join('')}</div>` : ''}
  </section>`;
}

const SPARK_SRC = {
  cash: ['cashHistory', 'var(--green)'],
  mrr: ['revenueHistory', 'var(--cyan)'],
  users: ['userHistory', 'var(--green)'],
  val: ['valuationHistory', 'var(--amber)'],
};

export function readoutsWidgetHtml(S) {
  const stats = visibleStats(S);
  // Two columns of tiles rather than two columns of rows: a label above its
  // number above its own line reads down, which is how an instrument is read.
  // Paired across, the eye has to decide every time whether "RUNWAY" belongs to
  // the number on its left or the one on its right.
  return `<section class="widget widget-readouts" aria-label="Readouts">
    <div class="widget-head"><span class="widget-k">READOUTS</span>
      <span class="widget-n">D ${fmt(Math.floor(S.time.day))}</span></div>
    <div class="w-reads">
      ${stats.map((st) => {
        const raw = st.get(S);
        const src = SPARK_SRC[st.id];
        const series = src ? (S.company[src[0]] || []) : null;
        const spark = series && series.length > 2
          ? sparkline(series, { color: src[1], log: st.id === 'val', h: 18, w: 132 })
          : '<span class="w-read-flat"></span>';
        return `<div class="w-read" data-tip="${esc(st.tip(S))}" data-tip-title="${esc(st.label)}">
          <span class="stat-label">${esc(st.label)}</span>
          <span class="w-read-v" id="wg-${st.id}" style="color:${st.color(raw, S)}">${esc(st.fmt(raw, S))}</span>
          ${spark}
        </div>`;
      }).join('')}
    </div>
  </section>`;
}

// §I3. The roster, on the wallpaper. The Agents view has the whole strip; this
// is the three rows a founder wants at a glance while looking at something
// else, and it is drawn only once there is a roster to draw.
export function floorWidgetHtml(S) {
  const rows = safe(() => activity(S), []) || [];
  if (!rows.length) return '';
  const shown = rows.slice(0, 4);
  return `<section class="widget widget-floor" aria-label="What the roster is doing">
    <div class="widget-head"><span class="widget-k">ON THE FLOOR</span>
      <span class="widget-n">${rows.length}</span></div>
    <div class="act-strip">
      ${shown.map((r) => `<button class="act-row" data-act="view" data-v="agents"
          style="--lc:${r.color};--ph:${r.phase.toFixed(3)}" data-tip="${esc(r.task)}" data-tip-title="${esc(r.name)}">
        <span class="act-who">${esc(r.name)}</span>
        <span class="act-lane mono">${r.laneIcon}</span>
        <span class="act-track" aria-hidden="true"><i></i></span>
        <span class="act-task">${esc(r.task)}</span>
      </button>`).join('')}
      ${rows.length > shown.length ? `<div class="act-more tiny dimmer">${rows.length - shown.length} more on the roster</div>` : ''}
    </div>
  </section>`;
}

export function widgetsHtml(S) {
  return nowWidgetHtml(S) + floorWidgetHtml(S) + readoutsWidgetHtml(S);
}

// ── The login screen ────────────────────────────────────────────────────────

// Three slots, three tiles. A machine with accounts on it shows the accounts:
// one occupied slot is a run to log into, one empty slot is a run to begin, and
// which of the three the game will write to is decided here rather than by
// whatever happened to be in the browser last. A slot whose save will not parse
// says so and offers the only thing left, which is to start over in it.
export function loginTilesHtml(rows, { legacy } = {}) {
  const list = Array.isArray(rows)
    ? rows
    // Called with a bare `peek()` by an older caller: one occupied slot.
    : (rows ? [{ n: 1, saved: rows, active: true, empty: false, corrupt: false }] : []);
  if (!list.length || (list.every((r) => r.empty) && list.length <= 1)) return '';
  // A machine nobody has ever used shows no account rack at all — the title
  // screen's own Begin is the whole of it.
  if (list.every((r) => r.empty && !r.corrupt)) return '';
  const tiles = list.map((r) => tileHtml(r, legacy));
  return `<div class="login-tiles" role="group" aria-label="Accounts">${tiles.join('')}</div>`;
}

function tileHtml(r, legacy) {
  const slot = `<span class="lt-slot mono">${r.n}</span>`;
  if (r.corrupt) {
    return `<button class="login-tile new reveal" data-act="new-game" data-v="${r.n}" style="--tc:var(--red)">
      ${slot}
      <div class="lt-face" aria-hidden="true">⚠</div>
      <div class="lt-who">
        <div class="lt-name">Unreadable</div>
        <div class="lt-meta">This slot holds something this build cannot open.</div>
      </div>
      <span class="btn lt-go" aria-hidden="true">Start over</span>
    </button>`;
  }
  if (r.empty) {
    // The whole tile is the control here, so its call to action is a `span`
    // wearing the button's clothes — a real button inside a button is invalid,
    // and a card with nothing at the foot beside one that has a Log in reads
    // like the pair was left unfinished.
    return `<button class="login-tile new reveal" data-act="new-game" data-v="${r.n}" style="--tc:var(--violet)">
      ${slot}
      <div class="lt-face" aria-hidden="true">+</div>
      <div class="lt-who">
        <div class="lt-name">New timeline</div>
        <div class="lt-meta">${legacy?.points ? `${legacy.points} legacy points carried` : 'begin again, from one room'}</div>
      </div>
      <span class="btn lt-go" aria-hidden="true">Begin</span>
    </button>`;
  }
  const saved = r.saved;
  const arch = ARCHETYPE_MAP[saved.archetype];
  const cat = saved.category ? CATEGORY_MAP[saved.category] : null;
  const act = ACTS[saved.act];
  return `<div class="login-tile reveal ${r.active ? 'on' : ''}" style="--tc:${arch?.color || 'var(--green)'}">
    ${slot}
    <div class="lt-face" aria-hidden="true">${esc(arch?.icon || '◈')}</div>
    <div class="lt-who">
      <div class="lt-name">${esc(saved.founderName)}</div>
      <div class="lt-meta">${esc(saved.companyName)} · Act ${ROMAN[saved.act]}${act ? ` · ${esc(act.name)}` : ''}</div>
      <div class="lt-meta dim">day ${fmt(saved.day)} · ${esc(arch?.name || saved.archetype)}${cat ? ` · ${esc(cat.name)}` : ''}</div>
    </div>
    <button class="btn btn-primary lt-go" data-act="continue-game" data-v="${r.n}">Log in</button>
  </div>`;
}

export function postLineHtml(saved) {
  const name = machineName(saved?.companyName, saved?.act || 1);
  return `<div class="post-line" id="post-line" aria-hidden="true"><span id="post-text"></span></div>`;
}

// §I5. The power-on self test, and what it is bringing up. Three modules on a
// machine in a garage, six on one that runs a continent — the roll is the act's
// own, from `ACT_CHROME`, and it is the only thing on the login screen that
// says how far the saved run has come without printing a number.
export function postText(saved) {
  const act = Math.max(1, Math.min(5, saved?.act || 1));
  const roll = safe(() => bootRoll({ company: { act } }), []) || [];
  const name = machineName(saved?.companyName, act);
  return roll.length ? `${name} · POST · ${roll.join(' · ')}` : `${name} · POST`;
}

// ── About this machine ──────────────────────────────────────────────────────

export function aboutHtml(S, { tools = 0, savedAgo = null } = {}) {
  const arch = ARCHETYPE_MAP[S.founder.archetype];
  const rows = [
    ['Machine', machineName(S.company.name, S.company.act)],
    ['Build', `Act ${ROMAN[S.company.act]} · ${ACTS[S.company.act]?.name || ''}`],
    ['Operator', `${S.founder.name} · ${arch?.name || S.founder.archetype}`],
    ['Company', S.company.name],
    ['Uptime', `${fmt(Math.floor(S.time.day))} days`],
    ['Timeline', `run ${(S.legacy.runs || 0) + 1} · seed ${S.meta.seed}`],
    ['The world', tools ? `${tools} tool${tools === 1 ? '' : 's'} in this browser` : 'the written deck'],
    ['Saved', savedAgo === null ? '—' : savedAgo < 3 ? 'just now' : `${savedAgo}s ago`],
  ];
  return `<div class="about">
    <div class="about-mark">${esc((S.company.name || 'S')[0].toUpperCase())}</div>
    <div class="about-rows">
      ${rows.map(([k, v]) => `<div class="about-row"><span class="about-k">${esc(k)}</span><span class="about-v">${esc(String(v))}</span></div>`).join('')}
    </div>
  </div>`;
}

// ── The transport ───────────────────────────────────────────────────────────

export function transportHtml(S, { savedAgo = null } = {}) {
  const goal = safe(() => nextActHint(S), null);
  const played = Math.floor((S.meta.playSeconds || 0) / 60);
  return `<div class="transport">
    <div class="tr-speeds">
      <button class="speed-btn pause ${S.settings.paused ? 'on' : ''}" data-act="speed" data-v="0" aria-label="Pause" data-tip="Pause · <b>Space</b>">❚❚</button>
      ${TIME.SPEEDS.map((s, i) => `<button class="speed-btn ${!S.settings.paused && S.settings.speed === i + 1 ? 'on' : ''}" data-act="speed" data-v="${i + 1}" data-tip="${s}× · <b>−</b> slower, <b>=</b> faster">${s}×</button>`).join('')}
      <button class="speed-btn next ${Transport.isSeeking() ? 'on' : ''}" data-act="next-decision" aria-label="Run to the next decision" data-tip="Run to the next decision · <b>N</b>">▸❚</button>
    </div>
    <div class="tr-rows">
      <div class="tr-row"><span class="tr-k">day</span><span>${fmt(Math.floor(S.time.day))} · ${esc(gameDateShort(S.time.day))} · ${clockTime(S)}</span></div>
      <div class="tr-row"><span class="tr-k">played</span><span>${played < 60 ? `${played}m` : `${Math.floor(played / 60)}h ${played % 60}m`}</span></div>
      <div class="tr-row"><span class="tr-k">saved</span><span>${savedAgo === null ? '—' : savedAgo < 3 ? 'just now' : `${savedAgo}s ago`}</span></div>
    </div>
    ${goal ? `<div class="tr-goal"><span class="tr-k">next</span>
      <span><b>Act ${ROMAN[goal.act]} — ${esc(goal.name)}</b><br>${esc(goal.hint)}</span></div>` : ''}
  </div>`;
}
