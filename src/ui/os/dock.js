// ─────────────────────────────────────────────────────────────────────────────
// THE DOCK — the module rack, in flow along the bottom edge (or down the left
// on a narrow screen, and inside the ChatGPT pane, where a bottom dock would sit
// under the floating chat box).
//
// It is the console's nav with the same order, the same indices, the same
// badges and the same lock rule, so the digit keys, the walkthrough and the
// player's muscle memory all still point at the same eight things.
// ─────────────────────────────────────────────────────────────────────────────
import { S } from '../../engine/state.js';
import { render } from '../dom.js';
import { dockHtml, dockModel } from './model.js';
import { OS } from './config.js';
import * as WM from './wm.js';

let el = null;
let lastUnlocked = null;      // which apps were open to the founder last paint

export function mount(node) { el = node; lastUnlocked = null; }

// How many tiles fit, arithmetically rather than by rendering and measuring —
// the numbers are all ours (`--os-tile`, the 8px gap, a 9px separator, 12px of
// padding), so there is no measure-then-re-render loop and no frame where the
// rack is the wrong length. The axis that runs out is the rail's height below
// 1120px and the bar's width above it.
function budget() {
  // Headless (`tools/ostest.mjs`) has no layout and no getComputedStyle. There
  // is nothing to run out of, so nothing sheds.
  const r = el?.getBoundingClientRect?.();
  if (!r) return Infinity;
  const vert = document.getElementById('app')?.classList?.contains?.('dock-left');
  const avail = (vert ? r.height : r.width) - 24;          // the dock's own padding
  if (!(avail > 0)) return Infinity;
  let tile = OS.TILE;
  try { tile = parseFloat(getComputedStyle(document.documentElement)
    .getPropertyValue('--os-tile')) || OS.TILE; } catch { /* no computed style */ }
  const step = tile + 8;
  const seps = 5 * 9;                                       // four section rules, plus the overflow's
  return Math.max(3, Math.floor((avail - seps + 8) / step));
}

// The options the model needs, so the overflow menu asks the same question the
// rack answered.
export function opts() {
  return { windows: WM.store().windows, focused: WM.focused(), budget: budget() };
}

export function paint() {
  if (!el || !S) return;
  const opts = { windows: WM.store().windows, focused: WM.focused(), budget: budget() };
  const { rows } = dockModel(S, opts);
  render(el, dockHtml(S, opts));
  flashUnlocks(rows);
}

// An app that becomes available is the machine noticing that the company grew.
// It gets one flash and never mentions it again.
function flashUnlocks(rows) {
  const now = new Set(rows.filter((r) => !r.locked).map((r) => r.id));
  if (lastUnlocked) {
    for (const id of now) {
      if (lastUnlocked.has(id)) continue;
      const tile = el?.querySelector?.(`.dock-tile[data-v="${id}"]`);
      if (!tile) continue;
      tile.classList.remove('unlocked'); void tile.offsetWidth; tile.classList.add('unlocked');
      setTimeout(() => tile.classList.remove('unlocked'), 1400);
    }
  }
  lastUnlocked = now;
}

// The nth tile, for the digit keys. Modules first, in the nav's order — and
// deliberately over the UNSHED list, so a digit still opens the same module on a
// rail too short to show every tile. A module never sheds, but the indices must
// not move even if one ever did.
export function appAt(i) {
  if (!S) return null;
  const { rows } = dockModel(S, { windows: WM.store().windows, focused: WM.focused() });
  const t = rows[i];
  return t && !t.locked ? t.id : null;
}

export function tileRect(id) {
  return el?.querySelector?.(`.dock-tile[data-v="${id}"]`)?.getBoundingClientRect?.() || null;
}

// Something in a window you are not looking at wants you. Twice, then it stops
// — a dock that keeps asking is a dock people stop reading.
export function attention(id) {
  const tile = el?.querySelector?.(`.dock-tile[data-v="${id}"]`);
  if (!tile) return;
  tile.classList.remove('wants'); void tile.offsetWidth; tile.classList.add('wants');
  setTimeout(() => tile.classList.remove('wants'), 2600);
}

export function setSide(side) {
  el?.classList?.toggle('left', side === 'left');
  document.getElementById('app')?.classList?.toggle('dock-left', side === 'left');
}
