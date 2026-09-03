// ─────────────────────────────────────────────────────────────────────────────
// THE DESKTOP — the wallpaper under the windows, and the two things written on
// it: what the game wants next, and every number at once.
//
// The wallpaper is the act's own banner at 22%, and it crossfades when the act
// turns. That is the quiet half of the act card: the machine changing under you
// while the card is still on screen.
// ─────────────────────────────────────────────────────────────────────────────
import { S } from '../../engine/state.js';
import { render } from '../dom.js';
import { nowWidgetHtml, readoutsWidgetHtml, floorWidgetHtml } from './model.js';
import { OS } from './config.js';

let wallEl = null;
let widgetsEl = null;
let shownAct = 0;
let front = 0;                 // which of the two plates is on top
let mode = 'act';
let enabled = true;

export function mount({ wallpaper, widgets }) {
  wallEl = wallpaper; widgetsEl = widgets;
  shownAct = 0; front = 0;
  if (wallEl) {
    wallEl.innerHTML = `<div class="wall-plate" data-p="0"></div><div class="wall-plate" data-p="1"></div>`;
  }
}

function srcFor(act) {
  if (mode === 'none') return '';
  if (mode === 'title') return 'assets/img/title_bg.jpg';
  return `assets/img/act${Math.max(1, Math.min(5, act || 1))}.jpg`;
}

export function setWallpaper(next) {
  mode = next || 'act';
  shownAct = -1;
  paintWallpaper(S?.company?.act || 1, { instant: true });
}

export function paintWallpaper(act, { instant = false } = {}) {
  if (!wallEl) return;
  if (act === shownAct) return;
  const src = srcFor(act);
  const plates = wallEl.querySelectorAll('.wall-plate');
  if (!plates.length) return;
  const next = plates[1 - front];
  const cur = plates[front];
  next.style.backgroundImage = src ? `url('${src}')` : 'none';
  next.style.transitionDuration = instant ? '0ms' : `${OS.T_WALL}ms`;
  cur.style.transitionDuration = instant ? '0ms' : `${OS.T_WALL}ms`;
  // Force a frame so the new image is decoded before the crossfade begins.
  requestAnimationFrame(() => {
    next.classList.add('on');
    cur.classList.remove('on');
    front = 1 - front;
    shownAct = act;
  });
}

// ── Widgets ─────────────────────────────────────────────────────────────────

export function setWidgets(on) {
  enabled = !!on;
  widgetsEl?.classList?.toggle('off', !enabled);
  if (enabled) paintWidgets(); else if (widgetsEl) { widgetsEl.innerHTML = ''; widgetsEl.__html = null; }
}

export function paintWidgets({ mode: layout = 'desktop' } = {}) {
  if (!widgetsEl || !S) return;
  if (!enabled || layout !== 'desktop') {
    if (widgetsEl.innerHTML) { widgetsEl.innerHTML = ''; widgetsEl.__html = null; }
    return;
  }
  render(widgetsEl, nowWidgetHtml(S) + floorWidgetHtml(S) + readoutsWidgetHtml(S));
}

export function widgetsOn() { return enabled; }
