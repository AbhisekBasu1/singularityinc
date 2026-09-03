// ─────────────────────────────────────────────────────────────────────────────
// WHY — the row shape that explains a number, in one place.
//
// The Product view has had this panel since the beginning and it is the best
// surface in the game: a label, the term's value, and a note on hover saying
// what moves it. §B1 gives the same treatment to the four numbers that decide
// the back half of a run — valuation, alignment, heat and approval — and this
// module is the renderer they share, so a fifth costs a function and not a
// panel.
//
// Pure string functions. `S.ui.whyShut` records which panels the founder has
// shut, so a repaint keeps them shut and a reload reopens where they were;
// nothing here touches the DOM.
// ─────────────────────────────────────────────────────────────────────────────
import { esc, sparkline } from './dom.js';
import { fmt, money } from '../engine/format.js';
import { S as LIVE } from '../engine/state.js';

// Open by default: a panel called "why" that has to be found before it can be
// read is a panel nobody reads. The flag records having *shut* it.
export function whyOpen(S, id) { return !(S?.ui?.whyShut || {})[id]; }
export function toggleWhy(id, S = LIVE) {
  if (!S) return;
  S.ui ??= {};
  S.ui.whyShut ??= {};
  S.ui.whyShut[id] = !S.ui.whyShut[id];
}

// One term. `kind` decides how the number is drawn, and the default is a
// multiplier, because most of these are.
//   mult (default) ×1.24, green above 1 (or below, when the block inverts)
//   raw            a bare number
//   money          dollars
//   pct / frac     a percentage of one
//   frac0          a percentage with no decimal
//   align          a signed contribution to a 0–1 equilibrium
//   rate           a signed per-day contribution
function cell(v, kind, invert) {
  if (kind === 'raw') return [v < 1 && v > 0 ? v.toFixed(4).replace(/0+$/, '') : fmt(v, 2), 'var(--ink-2)'];
  if (kind === 'money') return [money(v), 'var(--ink-2)'];
  if (kind === 'pct') return [(v * 100).toFixed(1) + '%', 'var(--ink-2)'];
  if (kind === 'frac0') return [(v * 100).toFixed(0) + '%', 'var(--ink-2)'];
  if (kind === 'frac') return [(v * 100).toFixed(0) + '%',
    v > 0.5 ? 'var(--green)' : v > 0.15 ? 'var(--amber)' : 'var(--red)'];
  if (kind === 'align' || kind === 'rate') {
    const dead = Math.abs(v) < (kind === 'rate' ? 0.0005 : 0.005);
    const good = invert ? v < 0 : v > 0;
    const text = (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(kind === 'rate' ? 3 : 2);
    return [text, dead ? 'var(--ink-4)' : good ? 'var(--green)' : 'var(--red)'];
  }
  const neutral = Math.abs(v - 1) < 0.02;
  const good = invert ? v < 1 : v > 1;
  return ['×' + v.toFixed(2), neutral ? 'var(--ink-4)' : good ? 'var(--green)' : 'var(--red)'];
}

// `note` is authored HTML — the call sites write <b> and escape their own
// interpolations, the way every tooltip in this codebase does.
export function whyRows(rows, invert = false) {
  return rows.map(([label, v, note, kind]) => {
    const [text, color] = cell(Number(v) || 0, kind, invert);
    return `<div class="row between g8" data-tip="${esc(note)}" data-tip-title="${esc(label)}">
      <span class="tiny dim" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(label)}</span>
      <span class="mono tiny" style="color:${color}">${text}</span>
    </div>`;
  }).join('');
}

export function whyBlock(title, sub, rows, { invert = false, subColor = null } = {}) {
  return `<div class="col g6">
    <div class="row between">
      <span class="meter-label">${esc(title)}</span>
      <span class="mono small" style="color:${subColor || (invert ? 'var(--red)' : 'var(--green)')}">${sub}</span>
    </div>
    ${whyRows(rows, invert)}
  </div>`;
}

// The panel. `id` is the key in `S.ui.whyShut`; `cols` is how many blocks sit
// across at full width. `.why-body` is a container in `console.css`, so a
// half-width column and a 700px window collapse it without a viewport query —
// a panel's contents are sized by the panel.
export function whyPanel(S, { id, title, note = 'hover any row', blocks, foot = '', tut = '' }) {
  const open = whyOpen(S, id);
  return `<div class="panel why-panel"${tut ? ` data-tut="${esc(tut)}"` : ''}>
    <button class="panel-head why-head${open ? '' : ' shut'}" data-act="why" data-v="${esc(id)}"
      aria-expanded="${open}" title="${open ? 'Hide' : 'Show'} the workings">
      <span class="panel-title">${esc(title)}</span>
      <span class="row g8">
        <span class="tiny dim">${esc(open ? note : 'show the workings')}</span>
        <span class="why-caret${open ? ' on' : ''}" aria-hidden="true">▾</span>
      </span>
    </button>
    ${!open ? '' : `<div class="panel-body why-body"><div class="why-grid why-cols-${blocks.length}">${blocks.join('')}</div></div>
    ${foot ? `<div class="panel-body" style="padding-top:0"><div class="tiny dimmer">${foot}</div></div>` : ''}`}
  </div>`;
}

// ── §B3 A trend, in a caption's worth of space ─────────────────────────────
// The slow killers — alignment, heat, approval, debt, burnout, morale, the
// race — are the four hundred days a run is lost in, and nothing on any screen
// said which way any of them had been going. `arcSeries` supplies the numbers;
// this is the cell. It renders nothing at all with fewer than three samples,
// because two points is not a trend, it is a pair of numbers.
export function trendCell(label, data, { color = 'var(--cyan)', log = false, note = '', fmt: f = null } = {}) {
  if (!data || data.length < 3) return '';
  const last = data[data.length - 1];
  const first = data[0];
  const word = last > first ? 'rising' : last < first ? 'falling' : 'flat';
  const show = f ? f(last) : String(Math.round(last * 100) / 100);
  return `<div class="trend-cell" data-tip="${esc(note || `${data.length} samples across the run, ${word}.`)}" data-tip-title="${esc(label)}">
    <div class="row between">
      <span class="tiny dim">${esc(label)}</span>
      <span class="mono tiny" style="color:${color}">${esc(show)}</span>
    </div>
    ${sparkline(data, { color, log, h: 26, label: label + ' over the run' })}
  </div>`;
}

export function trendRack(cells) {
  const kept = cells.filter(Boolean);
  if (!kept.length) return '';
  return `<div class="trend-wrap"><div class="trend-rack">${kept.join('')}</div></div>`;
}
