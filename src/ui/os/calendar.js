// ─────────────────────────────────────────────────────────────────────────────
// CALENDAR — the run on a month grid, and what is coming.
//
// A grid of thirty cells and an agenda beside it. Days that happened carry
// dots in the colour of what happened; days that have not are dim, and the
// things due on them are estimates and say so. The month shown is
// `S.ui.os.cal.month`, saved with the layout; nothing else is stored.
// ─────────────────────────────────────────────────────────────────────────────
import { esc } from '../dom.js';
import { monthGrid, monthOf, monthName, upcoming, WEEKDAYS, calendarEvents } from '../../systems/calendar.js';
import { EMPTY, CTX } from '../../data/machine.js';
import { gameDateShort } from '../../engine/format.js';

const safe = (fn, dflt) => { try { const v = fn(); return v == null ? dflt : v; } catch { return dflt; } };
const line = (k) => (EMPTY && typeof EMPTY[k] === 'string' ? EMPTY[k] : '');
const lore = (k) => (CTX && typeof CTX[k] === 'string' ? CTX[k] : '');

export function shownMonth(S) {
  const m = S?.ui?.os?.cal?.month;
  return Number.isInteger(m) ? Math.max(0, m) : monthOf(S?.time?.day || 0);
}

export function render(S) {
  const m = shownMonth(S);
  const grid = safe(() => monthGrid(S, m), null);
  if (!grid) return `<div class="cal"></div>`;
  const today = Math.floor(S.time.day);
  const thisMonth = monthOf(today);
  const due = safe(() => upcoming(S, 30), []) || [];
  const selDay = Number.isInteger(S?.ui?.os?.cal?.day) ? S.ui.os.cal.day : null;
  const dayEvents = selDay != null ? safe(() => calendarEvents(S, selDay, selDay), []) : [];
  return `<div class="cal" data-ctx="calendar">
    <div class="cal-main">
      <div class="cal-head">
        <button class="cal-nav" data-act="cal-month" data-v="${m - 1}" type="button" aria-label="Previous month" ${m <= 0 ? 'disabled' : ''}>‹</button>
        <span class="cal-title">${esc(grid.name)}</span>
        <button class="cal-nav" data-act="cal-month" data-v="${m + 1}" type="button" aria-label="Next month">›</button>
        <span class="grow"></span>
        ${m !== thisMonth ? `<button class="cal-today-key" data-act="cal-month" data-v="${thisMonth}" type="button">Today</button>` : `<span class="cal-k">D ${today} · ${esc(gameDateShort(today).toUpperCase())}</span>`}
      </div>
      <div class="cal-week">${WEEKDAYS.map((w) => `<span class="${w === 'Sun' ? 'sun' : ''}">${w}</span>`).join('')}</div>
      <div class="cal-grid">
        ${Array.from({ length: grid.lead }, () => '<span class="cal-blank"></span>').join('')}
        ${grid.cells.map((c) => cellHtml(c, selDay)).join('')}
      </div>
      ${selDay != null ? dayHtml(selDay, dayEvents, today) : ''}
    </div>
    <div class="cal-side">
      <div class="cal-k">Coming up</div>
      ${due.length ? `<div class="cal-agenda">${due.slice(0, 12).map((e) => `
        <div class="cal-item ${e.future ? 'est' : ''}" style="--ec:${e.color || 'var(--ink-3)'}">
          <span class="cal-item-d">${e.day === today ? 'TODAY' : `D${e.day}`}</span>
          <span class="cal-item-t">${esc(e.title)}${e.sub ? `<span class="cal-item-s">${esc(e.sub)}</span>` : ''}</span>
        </div>`).join('')}</div>` : `<div class="cal-empty">${esc(line('calendar'))}</div>`}
      <div class="tiny dimmer mt12">${esc(lore('clock'))}</div>
    </div>
  </div>`;
}

function cellHtml(c, selDay) {
  const dots = c.events.filter((e) => e.kind !== 'sunday').slice(0, 4);
  const tip = c.events.length ? c.events.map((e) => e.title).slice(0, 5).join('<br>') : '';
  return `<button class="cal-cell ${c.today ? 'today' : ''} ${c.future ? 'future' : ''} ${c.sunday ? 'sun' : ''} ${selDay === c.day ? 'on' : ''}" type="button"
      data-act="cal-day" data-v="${c.day}" ${tip ? `data-tip="${esc(tip)}" data-tip-title="Day ${c.day}"` : ''} aria-label="Day ${c.day}">
    <span class="cal-dom">${c.dom}</span>
    <span class="cal-dots">${dots.map((e) => `<i style="background:${e.color || 'var(--ink-3)'}"></i>`).join('')}</span>
  </button>`;
}

function dayHtml(day, events, today) {
  return `<div class="cal-dayview">
    <div class="cal-k">Day ${day} · ${esc(gameDateShort(day).toUpperCase())}${day === today ? ' · TODAY' : day > today ? ' · AHEAD' : ''}</div>
    ${events.length ? events.map((e) => `<div class="cal-item ${e.future ? 'est' : ''}" style="--ec:${e.color || 'var(--ink-3)'}">
        <span class="cal-item-d">${esc(e.kind.toUpperCase())}</span>
        <span class="cal-item-t">${esc(e.title)}${e.sub ? `<span class="cal-item-s">${esc(e.sub)}</span>` : ''}</span>
      </div>`).join('') : `<div class="cal-empty">${esc(day > today ? line('calendar_ahead') : line('calendar_day'))}</div>`}
  </div>`;
}

export function readoutFor(S) {
  const due = safe(() => upcoming(S, 30), []) || [];
  return `${esc(monthName(monthOf(S.time.day)).toUpperCase())} · ${due.length} COMING UP`;
}

export function menuFor(S) {
  const m = shownMonth(S);
  const thisMonth = monthOf(S.time.day);
  return [
    { label: 'This month', act: 'cal-month', v: String(thisMonth), checked: m === thisMonth },
    { label: 'Previous month', act: 'cal-month', v: String(m - 1), disabled: m <= 0, note: m <= 0 ? 'THE BEGINNING' : undefined },
    { label: 'Next month', act: 'cal-month', v: String(m + 1) },
  ];
}
