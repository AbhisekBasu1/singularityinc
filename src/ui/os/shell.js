// ─────────────────────────────────────────────────────────────────────────────
// THE WORKSTATION — the desktop the founder's machine actually is.
//
// It implements the same interface `shell-console.js` does, and everything else
// in the game talks to the facade in `../shell.js` rather than to either. The
// views are unchanged: `render(S)` still returns a string, and here the string
// lands in a window body instead of in `#main`.
//
// Three rules run through the whole file:
//
//   · Patch, never rebuild. Window bodies go through `render()`, which diffs;
//     chrome is written with `textContent` and only when the value moved. A
//     rebuilt subtree at seven frames a second is a pointer, a hover and a
//     focus ring thrown away seven times a second.
//   · Nothing pinned. The menu bar and the dock are in normal flow and the
//     windows are absolute inside a flowing desktop, so nothing the page puts
//     on screen lands under ChatGPT's floating chat input.
//   · One Wire. `#feed-rail`, `#world-console` and `#feed-list` are the same
//     ids the console uses, in a window, so `paintFeed`, the walkthrough,
//     `paintAuthor` and `tools/shot.mjs` all keep working untouched.
// ─────────────────────────────────────────────────────────────────────────────
import { S } from '../../engine/state.js';
import { on } from '../../engine/bus.js';
import { render, esc, onAction, onKey } from '../dom.js';
import * as Console from '../shell-console.js';
import * as Modal from '../modal.js';
import * as Tutorial from '../tutorial.js';
import { onToast, toast } from '../toast.js';
import * as Save from '../../engine/save.js';
import { hostedInChat } from '../intro.js';
import { manualBody, manualTabsHtml, manualClick, setManualTab } from '../manual.js';
import * as RecordApp from './record.js';
import * as ContactsApp from './contacts.js';
import * as MailApp from './mail.js';
import * as JournalApp from './journal.js';
import * as CalendarApp from './calendar.js';
import * as TerminalApp from './terminal.js';
import * as BrowserApp from './browser.js';
import * as ListApp from './list.js';
import * as PlayerApp from './player.js';
import { runAction } from '../dom.js';
import { apertureState } from '../../systems/rivalco.js';
import { markRead, markAllRead } from '../../systems/mail.js';
import { toggleTodo } from '../../systems/todo.js';
import { isSunday } from '../../systems/calendar.js';
import * as Audio from '../audio.js';
import { setAmbient, setEnabled as setAudio, initAudio, setVolume } from '../audio.js';
import * as Find from './find.js';
import * as Ctx from './ctxmenu.js';
import { menuFor as ctxMenuFor } from '../../data/context.js';
import { settingsBody, bindSettings, showImportSave, showAbandonRun } from '../settings.js';
import { ariaBody } from '../dialogs.js';
import { paintAuthor } from '../author.js';
import { resetTicks } from '../readouts.js';
import { applyActChrome, resetActChrome, bootRoll } from '../actchrome.js';
import { assignLane } from '../../systems/agents.js';
import { markDirty } from '../../systems/modifiers.js';
import { LANES } from '../../data/agents.js';

import { OS, machineName } from './config.js';
import { APPS, APP_MAP, isLocked } from './apps.js';
import { modeFor, loginTilesHtml, postText } from './model.js';
import { typeInto } from '../typewriter.js';
import * as WM from './wm.js';
import * as MenuBar from './menubar.js';
import * as Dock from './dock.js';
import * as Desktop from './desktop.js';
import * as Notify from './notify.js';
import { chrome as chromeSfx } from './sounds.js';
import * as Saver from './saver.js';

export const id = 'os';

let viewModules = {};
let mode = 'desktop';
let booting = false;
let bootTimer = 0;
let built = false;
let wiredOnce = false;
let lastSaveAt = 0;
let lastPointerWin = 0;
let worldChipFn = () => '';
const dirty = new Set();       // windows whose body must repaint on the next pass

const el = (i) => document.getElementById(i);
const reduced = () => {
  try {
    return document.documentElement?.classList?.contains('reduced-motion')
      || !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  } catch { return true; }
};

// The Manual, Settings and ARIA hold nothing that changes on its own, so they
// are painted when opened and when something they show is touched — never on
// the frame loop. That is also what lets Settings bind its own controls once
// and keep them: `paintOne` never rebuilds a body it was not asked to.

// ── Settings the workstation owns ───────────────────────────────────────────

function osSettings() {
  if (!S) return {};
  S.settings.os ??= {};
  const o = S.settings.os;
  o.dock ??= 'auto'; o.wallpaper ??= 'act';
  if (o.widgets === undefined) o.widgets = true;
  if (o.banners === undefined) o.banners = true;
  if (o.sounds === undefined) o.sounds = true;
  return o;
}

function dockSide() {
  const o = osSettings();
  if (o.dock === 'left') return 'left';
  if (o.dock === 'bottom') return 'bottom';
  return (mode === 'stacked' || safeHosted()) ? 'left' : 'bottom';
}
function safeHosted() { try { return hostedInChat(); } catch { return false; } }

function keepOut() {
  return safeHosted() || mode === 'stacked' ? OS.KEEPOUT_HOSTED : OS.KEEPOUT_PLAIN;
}

// ── Build ───────────────────────────────────────────────────────────────────

export function buildShell() {
  const app = el('app');
  if (!app) return;
  resetTicks();
  resetActChrome();
  built = true;
  app.className = 'os';
  app.classList.remove('booting');
  app.innerHTML = `
    <div class="menubar" id="menubar" role="menubar" aria-label="Menu bar"></div>
    <div class="desktop" id="desktop">
      <div class="wallpaper" id="wallpaper" aria-hidden="true"></div>
      <div class="widgets" id="widgets" aria-hidden="false"></div>
    </div>
    <div class="dock" id="dock" role="toolbar" aria-label="Applications"></div>
    <div class="menus" id="menus"></div>
    <div class="ctx" id="ctx"></div>
    <aside class="nc" id="nc" aria-label="Notifications"></aside>`;

  const desk = el('desktop');
  WM.mount(desk);
  WM.setCallbacks({ onFocus: onFocusChanged, onGeometry: () => WM.persist() });
  WM.bindPointer(desk);
  MenuBar.mount(el('menubar'), el('menus'));
  // Its own layer, not the menu bar's container: `menubar.js` clears that with
  // innerHTML every time a title drops, which would sweep a menu parked in it
  // away mid-press with nothing saying so.
  Ctx.mount(el('ctx'));
  Ctx.registerMenus((st, ctx) => ctxMenuFor(st, ctx));
  MenuBar.registerWorldChip(() => worldChip());
  MenuBar.registerDockOpts(() => Dock.opts());
  MenuBar.registerSavedAgo(() => savedAgo());
  Dock.mount(el('dock'));
  Desktop.mount({ wallpaper: el('wallpaper'), widgets: el('widgets') });
  Notify.mount({ toasts: el('toast-root'), center: el('nc'), onCountChange: (n) => MenuBar.setNotificationCount(n) });
  Notify.buildCenter();
  // §I7. A child of the desktop, never of the document: anything with a fixed
  // ancestor is what `tools/shot.mjs` calls pinned. It refuses to come up while
  // anything is asking for the founder.
  Saver.unmount();
  Saver.mount(desk, { isBlocked: () => Modal.isModalOpen() || Tutorial.isActive()
    || !!S?.narrative?.activeEvent || !!S?.calls?.active || booting });

  const o = osSettings();
  Desktop.setWallpaper(o.wallpaper);
  Desktop.setWidgets(o.widgets !== false);
  Notify.setBanners(o.banners !== false);

  applyMode(true);
  WM.restore({ first: !hasSavedLayout() });
  syncWireClass();                 // restore decided what is open; the rail follows
  WM.applyAll();
  Dock.setSide(dockSide());

  wire();
  paintNav(); paintTopbar(); paintMain(); paintFeed(); paintStatus();
  MenuBar.measure();
  Desktop.paintWallpaper(S?.company?.act || 1, { instant: true });
  powerOn();
}

function hasSavedLayout() {
  const w = WM.store().windows;
  return Object.values(w || {}).some((x) => x?.open);
}

// ── Power on ────────────────────────────────────────────────────────────────

function powerOn() {
  const app = el('app');
  if (!app) return;
  clearTimeout(bootTimer);
  app.classList.remove('booting');
  void app.offsetWidth;
  app.classList.add('booting');
  booting = true;
  bootTimer = setTimeout(endBoot, 1500);
  document.addEventListener('pointerdown', endBoot, { once: true });
  document.addEventListener('keydown', endBoot, { once: true });
}

export function endBoot() {
  if (!booting) return;
  booting = false;
  clearTimeout(bootTimer);
  el('app')?.classList?.remove('booting');
}

// ── Modes ───────────────────────────────────────────────────────────────────

function applyMode(force = false) {
  const w = typeof window !== 'undefined' ? (window.innerWidth || 1440) : 1440;
  const next = modeFor(w);
  const changed = next !== mode || force;
  mode = next;
  const app = el('app');
  if (app) {
    app.classList.toggle('m-desktop', mode === 'desktop');
    app.classList.toggle('m-compact', mode === 'compact');
    app.classList.toggle('m-stacked', mode === 'stacked');
    app.style.setProperty('--keepout-bottom', `${keepOut()}px`);
  }
  if (changed) {
    WM.setMode(mode);
    Dock.setSide(dockSide());
    Desktop.paintWidgets({ mode });
  }
  // Every time. The rail's width is taken out of the desktop by `deskSize()`
  // and put back by a class, and the two have to agree on every frame that
  // could have changed either — a resize across 1120px, a save restored into a
  // narrower window, the first paint of all. When they disagreed at boot the
  // Wire had no inline geometry (JS said rail) and no rule (CSS said window),
  // and collapsed to nothing.
  syncWireClass();
  return changed;
}

let resizeTimer = 0;
function onResize() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    applyMode();
    WM.applyAll();
    MenuBar.measure();
  }, 90);
}

// ── The interface ───────────────────────────────────────────────────────────

export function registerViews(mods) { viewModules = mods; Console.registerViews(mods); }

// What a dock tile does. A dock is a toggle, not a shortcut: on every desktop
// anyone has used, pressing the tile of the app you are looking at puts it away
// and pressing it again brings it back. It was wired to the generic `view`
// action, which only ever focuses — so the second press on a focused app did
// nothing at all, and the tile of the app you were already in was a dead key.
// That is the same rule this codebase already wrote down for the Wire: no key
// that visibly does nothing.
//
// The docked Wire keeps its exemption, and it is not a special case so much as
// the same sentence: a rail has one gesture, which is show or hide, and
// `WM.minimize` refuses it by name. Sending it through `setView` gives it that
// one gesture.
// The Terminal is a prompt: bringing it forward puts the cursor in it, or the
// first thing typed goes to the game's hotkeys instead.
function focusPrompt(id) {
  if (id !== 'terminal') return;
  setTimeout(() => { try { WM.bodyOf('terminal')?.querySelector?.('.term-input')?.focus?.({ preventScroll: true }); } catch {} }, 0);
}

export function toggleFromDock(id) {
  if (!id) return;
  // A rail has one gesture. `WM.toggle` would reach `minimize`, which refuses
  // the docked Wire by name and would leave the tile dead — the exact bug this
  // is fixing. `setView('wire')` is that one gesture.
  if (id === 'wire' && WM.wireDocked()) { setView('wire'); return; }
  const fresh = !WM.isVisible(id) && !WM.store().windows[id]?.open;
  WM.toggle(id);
  if (fresh) { dirty.add(id); paintOne(id); }
  paintNav();
  if (WM.isVisible(id) && WM.focused() === id) focusPrompt(id);
  paintTopbar();
}

export function setView(nextId) {
  endBoot();
  const app = APP_MAP[nextId];
  if (!app) return;
  if (app.module && isLocked(S, app)) return;
  // The docked Wire is furniture, and its dock tile is a light switch rather
  // than a window control. Focusing a rail that is already in front does
  // nothing a founder can see, and pressing the tile twice used to leave them
  // exactly where they started.
  if (nextId === 'wire' && WM.wireDocked()) {
    chromeSfx('window');
    if (WM.isVisible('wire')) WM.close('wire'); else WM.open('wire', { focus: false });
    syncWireClass();
    WM.applyAll();
    dirty.add('wire'); paintOne('wire'); paintNav(); paintTopbar();
    return;
  }
  // Below 1120px the Wire is a drawer and `#app.wire-open` is its door, so
  // opening the *window* is not the same as showing it: the plate is still
  // parked off-canvas by a transform. "Show me the Wire" has to mean the same
  // thing in every mode — the walkthrough's own step for it spotlighted a panel
  // nobody could see at 760px, which is the width this game is meant for.
  if (nextId === 'wire' && mode !== 'desktop') {
    el('app')?.classList?.add('wire-open');
    WM.open('wire', { focus: false, silent: true });
    dirty.add('wire'); paintOne('wire'); syncWireClass(); paintNav();
    return;
  }
  if (mode === 'stacked') {
    WM.open(nextId, { focus: true, silent: true });
    WM.stackedShow(nextId);
  } else {
    const fresh = WM.open(nextId);
    if (fresh) chromeSfx('window');
  }
  dirty.add(nextId);
  paintOne(nextId);
  focusPrompt(nextId);
  paintNav();
  paintTopbar();
  if (nextId === 'wire') syncWireClass();
}

// Which module is on screen and in front. `null` when none is, so
// `triggerAction` in main.js opens the Desk rather than shaking at nothing.
export function getView() {
  const os = WM.store();
  const f = os.focused;
  if (f && APP_MAP[f]?.module && WM.isVisible(f)) return f;
  const m = os.lastModule;
  return m && WM.isVisible(m) ? m : null;
}

// What the walkthrough asks before it draws a ring: is the thing this step
// teaches actually on the glass, and in front?
//
// The Wire needs its own answer in two of the three modes, and getting this
// wrong is not a cosmetic bug. `tick()` in the walkthrough calls
// `ensureStepView` on every animation frame, so a view that can never satisfy
// this predicate makes it re-run `setView` sixty times a second — and
// `setView('wire')` on the desktop is `WM.applyAll()` plus three repaints.
// Chrome absorbs that; Firefox locks up. The docked Wire was exactly that view:
// it is furniture rather than a window, permanently in front and deliberately
// never focusable (`minimize` and `toggleZoom` refuse it by name), so
// `WM.focused() === 'wire'` is false by construction and always will be.
//
//   docked      → it is a rail; being open *is* being in front
//   drawer      → `#app.wire-open` is the door; `isVisible` can be true while
//                 the plate is still parked off-canvas by a transform
//   undocked    → an ordinary window, so ask the ordinary question
export function showing(viewId) {
  if (!viewId) return true;
  if (viewId === 'wire') {
    if (WM.wireDocked()) return WM.isVisible('wire');
    if (WM.currentMode() !== 'desktop') return !!el('app')?.classList?.contains('wire-open');
  }
  return WM.isVisible(viewId) && WM.focused() === viewId;
}

export function viewByIndex(i) {
  const appId = Dock.appAt(i);
  if (!appId) return false;
  setView(appId);
  return true;
}

export function showWorldConsole() {
  setView('uplink');
  return true;
}

// §I9. The morning line, in the bar's own notice slot. `ariaSpoke` already
// draws exactly this — a name, a sentence, six seconds — so this is that, with
// the speaker's name rather than always hers.
export function say(who, text) { MenuBar.spoke(who, text); return true; }

export function markSaved() { lastSaveAt = Date.now(); }
function savedAgo() { return lastSaveAt ? Math.round((Date.now() - lastSaveAt) / 1000) : null; }

export function registerWorldChip(fn) { worldChipFn = fn || (() => ''); }
function worldChip() { try { return worldChipFn() || ''; } catch { return ''; } }

// The console's chrome under the workstation's names. The authored selector is
// the one every tool and test knows; this is only what this housing calls it.
const ALIAS = {
  '#nav': '#dock',
  '.nav': '.dock',
  '.statusline': '.menubar',
  '.time-block': '.mb-clock',
  '.topbar': '.menubar',
};
export function anchorAlias(sel) { return ALIAS[sel] || sel; }

export function announcesCards() { return true; }
export function announceCard(ev) { return Notify.announce(ev); }

// ── Painting ────────────────────────────────────────────────────────────────

export function paintTopbar() {
  if (booting || !S) return;
  MenuBar.paint();
  WM.paintChrome();
}

export function paintNav() {
  if (booting || !S) return;
  Dock.paint();
  Desktop.paintWidgets({ mode });
}

export function paintStatus() {
  if (!S) return;
  // §I5. The act, as a class and a token on `#app`. `applyActChrome` is a
  // no-op unless the act moved, so this costs nothing on the frame loop.
  applyActChrome(S);
  MenuBar.paint();
  Desktop.paintWidgets({ mode });
}

export function paintFeed() {
  if (!S) return;
  Console.paintFeed();
  const n = document.getElementById('feed-count');
  if (n) n.classList.toggle('c-amber', /open/.test(n.textContent || ''));
}

// The focused window on every call; the rest take turns. A window whose body
// has not changed costs one string build, because `render()` short-circuits.
export function paintMain() {
  if (!S) return;
  // Two `classList.toggle`s with unchanged values, which cost nothing and no
  // style recalc. It is here rather than on a callback because the Wire's
  // visibility can change from six places — the chip, the dock tile, its own
  // close key, a digit key, a restored save, a resize across 1120px — and a
  // rail whose class disagrees with `deskSize()` is a strip of desktop that
  // either no window may use or every window covers.
  syncWireClass();
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  // `paintFeed` already paints the Wire twice a second, so it does not need one
  // of the rotation's slots; the Uplink does, because nothing else is on a
  // clock for it.
  const targets = WM.paintTargets(now).filter((t) => t !== 'wire');
  for (const t of dirty) { if (!targets.includes(t)) targets.push(t); WM.markPainted(t, now); }
  dirty.clear();
  for (const winId of targets) paintOne(winId);
}

function paintOne(winId) {
  if (!WM.isVisible(winId)) return;
  const body = WM.bodyOf(winId);
  if (!body) return;
  const mod = viewModules[winId];
  if (mod) { render(body, mod.render(S)); return; }
  // The Wire and the Uplink are painted by the two functions that already own
  // them, into the ids they already write to. Calling them here is what makes
  // a window that has just been opened show something before its own cadence
  // comes round — the Uplink is otherwise painted only by a bus event, and on
  // a quiet run there may not be one for a minute.
  if (winId === 'wire') { Console.paintFeed(); paintAuthor(); return; }
  if (winId === 'uplink') { paintAuthor(); return; }
  if (winId === 'record') { render(body, RecordApp.render(S)); return; }
  if (winId === 'contacts') { render(body, ContactsApp.render(S)); return; }
  if (winId === 'mail') { render(body, MailApp.render(S)); return; }
  if (winId === 'journal') { renderJournal(body); return; }
  if (winId === 'calendar') { render(body, CalendarApp.render(S)); return; }
  if (winId === 'todo') { render(body, ListApp.render(S)); return; }
  if (winId === 'player') { render(body, PlayerApp.render(S)); return; }
  if (winId === 'terminal') { renderTerminal(body); return; }
  if (winId === 'browser') {
    render(body, BrowserApp.render(S));
    // The framed press office is told what Aperture did this week, so the
    // page in the founder's browser and the one the tools read say the same.
    const f = body.querySelector?.('.web-frame');
    if (f?.contentWindow) { try { f.contentWindow.postMessage({ type: 'aperture:state', payload: apertureState(S) }, '*'); } catch {} }
    return;
  }
  if (winId === 'manual') { renderManual(body); return; }
  if (winId === 'settings') { renderSettings(body); return; }
  if (winId === 'aria') { render(body, `<div class="aria-win">${ariaBody()}</div>`); return; }
}

// The journal's field holds a draft. Patching around it keeps the draft; a
// wholesale repaint while the founder is mid-sentence would not.
function renderJournal(body) {
  const draft = body.querySelector?.('.jn-field')?.value || '';
  render(body, JournalApp.render(S));
  const f = body.querySelector?.('.jn-field');
  if (f && draft && !f.value) f.value = draft;
}

// The prompt keeps what is being typed, and the scrollback stays at the foot.
function renderTerminal(body) {
  const draft = body.querySelector?.('.term-input')?.value || '';
  const focused = document.activeElement === body.querySelector?.('.term-input');
  render(body, TerminalApp.render(S));
  const input = body.querySelector?.('.term-input');
  if (input && draft && !input.value) input.value = draft;
  if (input && focused) { try { input.focus({ preventScroll: true }); } catch {} }
  const sc = body.querySelector?.('#term-scroll');
  if (sc) sc.scrollTop = sc.scrollHeight;
}

function renderManual(body) {
  render(body, `<div class="man-win">
    <div class="man-tabs" id="man-tabs">${manualTabsHtml()}</div>
    <div id="man-body">${manualBody()}</div>
  </div>`);
}

function renderSettings(body) {
  const html = `<div class="set-win">${settingsBody()}${osSettingsHtml()}</div>`;
  if (body.__setHtml === html) return;
  body.__setHtml = html;
  body.innerHTML = html;
  body.__html = null;
  bindSettings(body);
}

function osSettingsHtml() {
  const o = osSettings();
  const pick = (key, val, label) => `<button class="btn btn-sm ${o[key] === val ? 'on' : ''}" data-act="os-set" data-v="${key}:${val}">${esc(label)}</button>`;
  const sw = (key, label) => `<div class="row between"><span class="small">${esc(label)}</span>
    <button class="btn btn-sm ${o[key] !== false ? 'on' : ''}" data-act="os-set" data-v="${key}:toggle" aria-pressed="${o[key] !== false}" style="min-width:52px">${o[key] !== false ? 'ON' : 'OFF'}</button></div>`;
  return `<div class="divider"></div>
    <div class="set-group">
      <div class="set-k">WORKSTATION</div>
      <div class="row between"><span class="small">Dock</span>
        <span class="row g4">${pick('dock', 'auto', 'Auto')}${pick('dock', 'bottom', 'Bottom')}${pick('dock', 'left', 'Left')}</span></div>
      <div class="row between"><span class="small">Wallpaper</span>
        <span class="row g4">${pick('wallpaper', 'act', 'Act')}${pick('wallpaper', 'title', 'Title')}${pick('wallpaper', 'none', 'None')}</span></div>
      <div class="row between"><span class="small">The Wire</span>
        <span class="row g4">
          <button class="btn btn-sm ${WM.wireDocked() && WM.isVisible('wire') ? 'on' : ''}" data-act="os-wire" data-v="dock">Right</button>
          <button class="btn btn-sm ${WM.wireDocked() && WM.isVisible('wire') ? '' : 'on'}" data-act="os-wire" data-v="hide">Hidden</button>
        </span></div>
      ${sw('widgets', 'Desktop widgets')}
      ${sw('banners', 'Notification banners')}
      ${sw('sounds', 'Interface sounds')}
      <div class="divider"></div>
      <button class="btn btn-sm btn-ghost btn-block" data-act="os-classic">Open the classic console</button>
      <div class="tiny dimmer mt8">${esc(machineName(S?.company?.name, S?.company?.act || 1))} · the same save, in either housing.</div>
    </div>`;
}

function onFocusChanged() {
  paintNav();
  MenuBar.paint();
  syncWireClass();
}

// `#app.wire-open` is the one flag that says whether the Wire is on screen, in
// both housings and at every width. `tools/shot.mjs` toggles it to test the
// drawer, so it must stay true.
function syncWireClass() {
  const app = el('app');
  if (!app) return;
  // `wire-docked` is what turns the window into the rail, and it is only ever
  // true when the Wire is actually up: a docked-but-closed rail would leave a
  // strip of desktop that no window is allowed to use.
  const railUp = WM.wireDocked() && WM.isVisible('wire');
  app.classList.toggle('wire-docked', railUp);
  // The toast lane and the banners hang off the right edge of the screen, and
  // the rail is now part of that edge — without this they print across the Wire
  // and you answer a thread by reading through a toast. One number, in pixels
  // rather than a `var()`, because a custom property whose value contains a
  // `var()` substitutes where it is declared, not where it is used.
  document.documentElement?.style?.setProperty('--os-rail-taken', railUp ? `${OS.WIRE_W}px` : '0px');
  if (mode === 'desktop') { app.classList.toggle('wire-open', WM.isVisible('wire')); return; }
  // In a drawer the class is the door, but the window's own red key can still
  // shut it — and a door left open over a closed rail is an empty drawer.
  if (!WM.isOpen('wire')) app.classList.remove('wire-open');
}

// ── Shutdown ────────────────────────────────────────────────────────────────

export async function powerDown() {
  if (!built) return;
  const app = el('app');
  if (!app) return;
  MenuBar.closeMenu();
  Notify.toggleCenter(false);
  if (reduced()) { app.classList.add('powerdown'); return; }
  await WM.closeAllForShutdown();
  app.classList.add('powerdown');
  await new Promise((r) => setTimeout(r, 520));
}

// ── The login screen ────────────────────────────────────────────────────────

export function titleDecor(slot) {
  const saved = Save.peek();
  if (slot === 'accounts') return loginTilesHtml(Save.slots(), { legacy: Save.loadLegacy() });
  if (slot === 'post') {
    // The machine's own name, typed at the same pace as the cold open beside
    // it. `WORKSTATION` on a fresh machine; the company's from Act III, which
    // is the one place the login screen knows anything about the saved run
    // beyond who is in it.
    setTimeout(() => {
      const el = document.getElementById('post-text');
      if (el) typeInto(el, postText(saved), { cps: 26 });
    }, 240);
    return `<div class="post-line" id="post-line" aria-hidden="true"><span id="post-text"></span></div>`;
  }
  return '';
}

// ── Wiring ──────────────────────────────────────────────────────────────────

function wire() {
  // Actions are a Map keyed by name, so registering here — at build time, after
  // `main.js` has registered its own — is how the workstation takes over the
  // handful the console answers differently.
  onAction('wire-toggle', () => {
    chromeSfx('window');
    if (mode === 'desktop') {
      // The chip used to close the Wire on its first press, which is exactly
      // wrong when the complaint is that you cannot see it: a founder who has
      // lost the Wire presses this to get it *back*. Docked, it is a plain
      // show/hide of the rail; floating, the first press raises it and only a
      // press while it is already in front puts it away.
      if (WM.wireDocked()) {
        if (WM.isVisible('wire')) { WM.close('wire'); syncWireClass(); }
        else { WM.open('wire', { focus: false }); syncWireClass(); }
        WM.applyAll();
      } else if (!WM.isVisible('wire')) {
        setView('wire');
      } else if (WM.focused() !== 'wire') {
        WM.focus('wire');
      } else {
        WM.close('wire');
      }
    } else {
      // Below 1120px it is a drawer, and `#app.wire-open` is the door. The
      // window still has to be *open* underneath, or `paintFeed` writes into a
      // `display:none` rail and the founder slides in an empty one.
      const open = el('app')?.classList?.toggle('wire-open');
      if (open) WM.open('wire', { focus: false, silent: true });
      else WM.close('wire', { silent: true });
    }
    // Both branches paint the same two things into the same two ids, which is
    // the whole reason there is one Wire and not two.
    dirty.add('wire');
    paintOne('wire');
    syncWireClass();
    paintNav();
  });
  // ── The Record ────────────────────────────────────────────────────────────
  // Selection is state, saved with the layout, so the machine reopens on the
  // file you were reading. Every one of these repaints only the Record.
  const recSel = () => ((S.ui ??= {}).os ??= {}).record ??= { path: null, id: null };
  const recPaint = () => { dirty.add('record'); paintOne('record'); paintTopbar(); };
  onAction('record-folder', (d) => {
    const r = recSel(); r.path = d.v || null; r.id = null;
    setView('record'); recPaint();
  });
  onAction('record-open', (d) => {
    const r = recSel();
    if (d.path) r.path = d.path;
    // The rows carry `data-id`; Find and the context menu carry `data-v`. Both
    // are the same identity and the handler takes either — an action reached
    // from three surfaces must not care which one sent it.
    r.id = d.id ?? d.v ?? null;
    setView('record'); recPaint();
  });
  onAction('record-back', () => {
    const r = recSel();
    if (r.id) r.id = null; else r.path = null;
    recPaint();
  });

  onAction('find', () => Find.toggle());
  onAction('record-find', () => Find.open());

  // ── Contacts ──────────────────────────────────────────────────────────────
  // Selection is state, saved with the layout, like the Record's.
  const ctSel = () => ((S.ui ??= {}).os ??= {});
  onAction('contact-select', (d) => {
    ctSel().contact = d.v || null;
    setView('contacts');
    dirty.add('contacts'); paintOne('contacts'); paintTopbar();
  });
  onAction('contact-back', () => {
    ctSel().contact = null;
    dirty.add('contacts'); paintOne('contacts');
  });

  // ── Mail ──────────────────────────────────────────────────────────────────
  onAction('mail-open', (d) => {
    const id = Number(d.v);
    ctSel().mail = id;
    markRead(S, id);
    setView('mail');
    dirty.add('mail'); paintOne('mail'); paintNav(); paintTopbar();
  });
  onAction('mail-back', () => { ctSel().mail = null; dirty.add('mail'); paintOne('mail'); });
  // An envelope in the rail opens the app that holds the whole letter. The
  // console unfolds it in place because it has nowhere else to put it; here
  // there is a Mail window, so this is `mail-open` under the rail's name.
  onAction('feed-letter', (d) => {
    const id = Number(d.v);
    ctSel().mail = id;
    markRead(S, id);
    setView('mail');
    dirty.add('mail'); paintOne('mail'); paintFeed(); paintNav(); paintTopbar();
  });
  onAction('mail-read-all', () => { markAllRead(S); dirty.add('mail'); paintOne('mail'); paintNav(); paintTopbar(); });

  // ── Journal ───────────────────────────────────────────────────────────────
  onAction('journal-remove', (d) => {
    if (!JournalApp.removeNote(S, d.v)) return;
    markDirty();
    dirty.add('journal'); paintOne('journal'); paintTopbar();
  });
  onAction('journal-focus', () => {
    setView('journal');
    setTimeout(() => { try { WM.bodyOf('journal')?.querySelector?.('.jn-field')?.focus?.({ preventScroll: true }); } catch {} }, 60);
  });

  // ── The list ──────────────────────────────────────────────────────────────
  // The list is generated; only the ticks are state, and they are keyed by the
  // day so tomorrow starts blank.
  onAction('todo-tick', (d) => {
    toggleTodo(S, d.v);
    dirty.add('todo'); paintOne('todo'); paintMain(); paintTopbar();
  });
  onAction('todo-clear', () => {
    const t = ((S.ui ??= {}).todoDone ??= { day: Math.floor(S.time.day), ids: {} });
    t.ids = {};
    dirty.add('todo'); paintOne('todo'); paintMain(); paintTopbar();
  });

  // ── The Player ────────────────────────────────────────────────────────────
  // The bed is a session, not a run, so none of this is saved except the two
  // settings that already were: `sound` and `ambient`.
  const actOf = () => S?.company?.act || 1;
  onAction('player-play', () => {
    if (S.settings.sound === false) { S.settings.sound = true; setAudio(true); initAudio(); }
    const on = !Audio.ambientState(actOf).playing;
    S.settings.ambient = on;
    setAmbient(on, actOf);
    try { Save.save(S); } catch {}
    dirty.add('player'); paintOne('player'); paintTopbar();
  });
  onAction('player-bells', () => {
    Audio.setBells(!Audio.bellsOn());
    dirty.add('player'); paintOne('player'); paintTopbar();
  });
  onAction('player-vol', (d) => {
    const step = d.v === 'down' ? -0.1 : 0.1;
    const next = Math.max(0, Math.min(1, (S.settings.volume ?? 0.55) + step));
    S.settings.volume = next;
    setVolume(next);
    try { Save.save(S); } catch {}
    dirty.add('player'); paintOne('player'); paintTopbar();
  });

  // ── Calendar, terminal, browser ──────────────────────────────────────────
  onAction('cal-month', (d) => {
    const os = ((S.ui ??= {}).os ??= {});
    os.cal = { ...(os.cal || {}), month: Math.max(0, Number(d.v) || 0), day: null };
    dirty.add('calendar'); paintOne('calendar');
  });
  onAction('cal-day', (d) => {
    const os = ((S.ui ??= {}).os ??= {});
    const day = Number(d.v);
    os.cal = { ...(os.cal || {}), day: os.cal?.day === day ? null : day };
    dirty.add('calendar'); paintOne('calendar');
  });
  const termCtx = () => ({
    runAction: (name, data) => runAction(name, data),
    addNote: (t) => { JournalApp.addNote(S, t); dirty.add('journal'); },
  });
  onAction('term-clear', () => { TerminalApp.termState(S).lines = []; dirty.add('terminal'); paintOne('terminal'); });
  onAction('term-run', (d) => { TerminalApp.submit(S, d.v, termCtx()); setView('terminal'); dirty.add('terminal'); paintOne('terminal'); });
  onAction('web-site', (d) => { ((S.ui ??= {}).os ??= {}).web = d.v; dirty.add('browser'); paintOne('browser'); paintTopbar(); });

  onAction('help', () => setView('manual'));
  onAction('settings', () => setView('settings'));
  onAction('ask-aria', () => { dirty.add('aria'); setView('aria'); });

  onAction('os-menu', (d, node) => { chromeSfx('minimize'); MenuBar.openMenu(d.v, node); });
  onAction('os-nc', () => { Notify.toggleCenter(); MenuBar.closeMenu(); });
  onAction('os-nc-clear', () => Notify.clearCenter());
  onAction('os-banner-close', (d, node) => Notify.closeAnyBanner(node));
  onAction('os-showdesk', () => { WM.showDesktop(); MenuBar.closeMenu(); });
  onAction('os-about', () => {
    let tools = 0;
    try { tools = window.__status?.().count || 0; } catch {}
    Modal.dialog({ title: 'About this machine', centred: true, body: MenuBar.aboutDialogBody(tools),
      actions: [{ label: 'Close', cls: 'btn-primary' }] });
  });
  onAction('os-classic', () => {
    try { Save.save(S); } catch {}
    location.href = new URL('./', location.origin + '/').href;
  });
  onAction('os-win', (d) => {
    const f = WM.focused();
    if (!f) return;
    if (d.v === 'zoom') WM.toggleZoom(f);
    else if (d.v === 'min') { chromeSfx('minimize'); WM.minimize(f); }
    else if (d.v === 'close') { chromeSfx('minimize'); WM.close(f); syncWireClass(); }
    paintNav();
  });
  onAction('os-layout', (d) => {
    const wanted = d.v === 'ops' ? ['desk', 'agents', 'market', 'wire'] : ['desk', 'wire'];
    for (const winId of WM.visibleWindows()) if (!wanted.includes(winId)) WM.close(winId, { silent: true });
    for (const winId of wanted) WM.open(winId, { focus: false, silent: true });
    tile(wanted);
    WM.focus('desk');
    for (const w of wanted) dirty.add(w);
    paintNav(); paintFeed(); syncWireClass();
  });
  onAction('os-walk', (d) => { MenuBar.closeMenu(); setTimeout(() => Tutorial.start(d.v), 180); });
  onAction('os-manual-tab', (d) => { setManualTab(d.v); dirty.add('manual'); setView('manual'); });
  onAction('os-lane-all', (d) => {
    if (!S?.agents?.length) return;
    for (const a of S.agents) assignLane(S, a.id, d.v);
    markDirty();
    toast({ icon: LANES[d.v]?.icon || '◉', title: `Every agent is on ${LANES[d.v]?.name || d.v}`, kind: 'good' });
    dirty.add('agents'); paintMain();
  });
  onAction('os-clear-queue', () => {
    if (!S?.research?.queue?.length) return;
    S.research.queue.length = 0;
    dirty.add('research'); paintMain(); paintNav();
  });
  // The Settings window's own controls answer through `bindSettings`; these are
  // the same three from the app menu, where there is no button to click.
  onAction('os-save-export', async () => {
    const str = Save.exportSave(S);
    if (!str) { toast({ icon: '⚠', title: 'Nothing to copy just now.', sub: 'A forecast is running. Try again in a moment.', kind: 'bad' }); return; }
    try { await navigator.clipboard.writeText(str); toast({ icon: '⌗', title: 'Save copied.', kind: 'good' }); }
    catch { toast({ icon: '⚠', title: 'Could not copy the save.', kind: 'bad' }); }
  });
  onAction('os-save-import', () => showImportSave());
  onAction('os-save-download', () => {
    if (!Save.downloadSave(S)) { toast({ icon: '⚠', title: 'Nothing to write just now.', sub: 'A forecast is running. Try again in a moment.', kind: 'bad' }); return; }
    toast({ icon: '⌗', title: 'Save written.', sub: Save.saveFileName(S), kind: 'good' });
  });
  onAction('os-save-upload', () => {
    Save.pickSaveFile((ok, reason) => {
      if (ok) { location.reload(); return; }
      if (reason) toast({ icon: '⚠', title: reason, kind: 'bad' });
    });
  });
  onAction('os-save-reset', () => showAbandonRun());
  // A record in the Notification Center offers the window it is about.
  onAction('os-nc-show', (d) => { Notify.toggleCenter(false); if (d.v) setView(d.v); });

  // The rail has a chip in the menu bar; this is the same switch, where a
  // founder goes looking for switches.
  onAction('os-wire', (d) => {
    const want = d.v === 'dock';
    WM.setWireDocked(true);
    if (want) WM.open('wire', { focus: false, silent: true });
    else WM.close('wire', { silent: true });
    syncWireClass();
    WM.applyAll();
    dirty.add('wire'); paintOne('wire'); paintNav();
    try { Save.save(S); } catch {}
    const body = WM.bodyOf('settings');
    if (body) { body.__setHtml = null; renderSettings(body); }
  });

  onAction('os-set', (d) => {
    const [key, val] = String(d.v).split(':');
    const o = osSettings();
    if (val === 'toggle') o[key] = o[key] === false;
    else o[key] = val;
    if (key === 'wallpaper') Desktop.setWallpaper(o.wallpaper);
    if (key === 'widgets') Desktop.setWidgets(o.widgets !== false);
    if (key === 'banners') Notify.setBanners(o.banners !== false);
    if (key === 'dock') Dock.setSide(dockSide());
    try { Save.save(S); } catch {}
    const body = WM.bodyOf('settings');
    if (body) { body.__setHtml = null; renderSettings(body); }
  });

  if (wiredOnce) return;
  wiredOnce = true;

  // Below the guard, and it matters: `onAction` is a Map and overwrites, but
  // `onKey` keeps a Set per key and `buildShell` runs again on a prestige. A
  // key registered above this line gains a handler every run, and by the third
  // timeline `f` would open Find, close it and open it again in one press.
  onKey('f', (e) => {
    if (Modal.isModalOpen() || Tutorial.isActive()) return;
    if (document.activeElement?.matches?.('input, textarea')) return;
    e?.preventDefault?.();
    Find.toggle();
  });

  window.addEventListener('resize', onResize);

  // A click on a menu item does its thing and the menu goes away, which is what
  // every menu anywhere does and what nobody notices until it does not.
  document.addEventListener('click', (e) => {
    if (e.target.closest?.('.menu-item')) setTimeout(() => MenuBar.closeMenu(), 0);
  });
  // Which window an action came from, for `setPlacement`. Both events, both in
  // the capture phase: a pointer press alone misses a control activated from
  // the keyboard, and a bubble-phase listener would run *after* the delegated
  // handler that already opened the dialog.
  const fromWindow = (e) => { if (e.target.closest?.('.win')) lastPointerWin = Date.now(); };
  document.addEventListener('click', fromWindow, true);
  document.addEventListener('pointerdown', (e) => {
    fromWindow(e);
    if (MenuBar.isMenuOpen() && !e.target.closest?.('.menus') && !e.target.closest?.('[data-act="os-menu"]')) MenuBar.closeMenu();
    if (Notify.centerIsOpen() && !e.target.closest?.('.nc') && !e.target.closest?.('[data-act="os-nc"]')) Notify.toggleCenter(false);
  }, true);
  // Hovering another title while a menu is open switches to it.
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest?.('.mb-title');
    if (t) MenuBar.hoverSwitch(t);
  });
  // The terminal's prompt. Enter runs the line; up and down walk the history.
  document.addEventListener('submit', (e) => {
    const f = e.target.closest?.('[data-term-form]');
    if (!f) return;
    e.preventDefault();
    const input = f.querySelector('.term-input');
    const text = input?.value || '';
    if (input) input.value = '';
    TerminalApp.submit(S, text, termCtx());
    dirty.add('terminal'); paintOne('terminal'); paintTopbar();
    setTimeout(() => { try { WM.bodyOf('terminal')?.querySelector?.('.term-input')?.focus?.({ preventScroll: true }); } catch {} }, 0);
  });
  let histIx = -1;
  document.addEventListener('keydown', (e) => {
    const input = e.target.closest?.('.term-input');
    if (!input) return;
    const h = TerminalApp.termState(S).history;
    if (e.key === 'ArrowUp') { e.preventDefault(); histIx = Math.min(h.length - 1, histIx + 1); input.value = h[histIx] || ''; }
    else if (e.key === 'ArrowDown') { e.preventDefault(); histIx = Math.max(-1, histIx - 1); input.value = histIx < 0 ? '' : (h[histIx] || ''); }
    else if (e.key === 'Enter') histIx = -1;
  });

  // The journal's field, delegated the same way: one listener, any repaint.
  document.addEventListener('submit', (e) => {
    const f = e.target.closest?.('[data-jn-form]');
    if (!f) return;
    e.preventDefault();
    const field = f.querySelector('.jn-field');
    const r = JournalApp.addNote(S, field?.value);
    if (!r.ok) return;
    if (field) field.value = '';
    markDirty();
    try { Save.save(S); } catch {}
    dirty.add('journal'); paintOne('journal'); paintTopbar();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !(e.metaKey || e.ctrlKey)) return;
    const field = e.target.closest?.('.jn-field');
    if (field) { e.preventDefault(); field.closest('form')?.requestSubmit?.(); }
  });

  // The Manual's own controls, delegated so a repaint can never orphan them.
  document.addEventListener('click', (e) => {
    const b = e.target.closest?.('[data-man]');
    if (!b || !b.closest?.('.man-win')) return;
    const r = manualClick(b.dataset.man);
    if (r && r.run) { setTimeout(() => Tutorial.start(r.run), 180); return; }
    if (r) { const body = WM.bodyOf('manual'); if (body) renderManual(body); }
  });

  // The digit `0` and the arrow keys inside a menu.
  // `#app.booting` animates every window with `fill-mode: both`, and an
  // animation outranks a transition — peeking mid-boot changed nothing at all.
  onKey('0', () => { if (!built || Modal.isModalOpen()) return; endBoot(); WM.showDesktop(); });
  document.addEventListener('keydown', (e) => {
    if (!MenuBar.isMenuOpen()) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); MenuBar.moveSelection(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); MenuBar.moveSelection(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); MenuBar.stepMenu(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); MenuBar.stepMenu(-1); }
    else if (e.key === 'Enter') { if (MenuBar.activateSelection()) e.preventDefault(); }
  }, true);

  // A sheet hangs from the window whose control opened it; anything the
  // machine itself raises is centred.
  Modal.setPlacement(() => {
    if (mode !== 'desktop') return null;
    if (Date.now() - lastPointerWin > 600) return null;
    const f = WM.focused();
    const r = f && WM.rectOf(f);
    if (!r || r.width < 380) return null;
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + OS.TITLE_H), w: Math.round(r.width) };
  });

  onToast((t) => Notify.record(t));

  on('act:advance', ({ act }) => {
    // After the act card, not under it: the wallpaper turning while the card is
    // still up is the machine noticing before the founder does. The accent goes
    // with it, for the same reason.
    setTimeout(() => { applyActChrome(S, { force: true }); Desktop.paintWallpaper(act); }, 900);
    setTimeout(() => { lastAppTitle = ''; MenuBar.paint(); }, 900);
  });
  on('feed', (item) => {
    if (!item?.thread || item.resolved) return;
    // A decision is worth a line in the record whether or not it was banner-ed:
    // the Center is what a founder opens to find what they missed.
    if (item.type !== 'mail') Notify.record({ icon: '⌁', title: 'The Wire needs you', sub: item.text, kind: '', show: 'wire' });
    if (WM.isVisible('wire') || el('app')?.classList?.contains('wire-open')) { Dock.attention('wire'); return; }
    // No chime here: §I6 gives every source its own cue in `main.js`, and the
    // chrome's generic `notify` on top of it was two sounds for one arrival.
    Dock.attention('wire');
    Notify.offerThread(item);
  });
  on('thread:resolved', ({ item } = {}) => Notify.closeThreadBanner(item?.id));
  on('aria:says', (line) => MenuBar.ariaSpoke(line));
  on('game:start', () => { dirty.clear(); });
  on('research:done', () => dirty.add('research'));
  on('call:start', () => dirty.add('contacts'));
  on('mail', (item) => {
    dirty.add('mail');
    // A receipt is filed, not announced: no notice, no bounce, no chime.
    if (item?.mail?.quiet) return;
    Notify.record({ icon: '✉', title: item?.meta ? `**${item.meta}**` : 'A letter', sub: item?.author || '', kind: '', show: 'mail' });
    if (WM.isVisible('mail')) return;
    Dock.attention('mail');
  });
  on('thread:resolved', () => dirty.add('mail'));
  on('day', () => { if (WM.isVisible('calendar')) dirty.add('calendar'); });
  // §I8. The Sunday ritual. The week has had seven days in it since the
  // calendar existed and nothing ever noticed one of them. Once per Sunday, and
  // never over something that is asking for the founder — a journal window
  // sliding in front of a card is the machine interrupting a decision.
  on('day', () => {
    if (!S || S._offline || S._forecast || booting) return;
    // Only for a Sunday the founder actually watched pass. `?days=N` runs the
    // day hooks live and offline catch-up runs hundreds in a second — without
    // this the machine opened the Journal fifty-seven times during a
    // fast-forward, which is the same guard the day tick already carries.
    if (!S.meta?.realtime || document.hidden) return;
    const day = Math.floor(S.time.day);
    if (!isSunday(day)) return;
    const os = ((S.ui ??= {}).os ??= {});
    if (os.sundayAt === day) return;
    os.sundayAt = day;
    // And a wall-clock floor on top of the day floor, because at 5× a Sunday
    // comes round every ten seconds.
    const now = Date.now();
    if (now - lastSunday < 60000) return;
    lastSunday = now;
    if (Modal.isModalOpen() || Tutorial.isActive() || S.narrative?.activeEvent || S.calls?.active) return;
    setView('journal');
    dirty.add('journal'); paintOne('journal');
    // `preventScroll`, always: `#app` is a clipped box with the Notification
    // Center parked off its right edge, and a focus that scrolls it takes the
    // whole machine sideways with nothing to scroll it back.
    setTimeout(() => { try { WM.bodyOf('journal')?.querySelector?.('.jn-field')?.focus?.({ preventScroll: true }); } catch {} }, 120);
  });
  on('call:end', () => { dirty.add('contacts'); dirty.add('story'); paintMain(); });
  on('doctrine', () => dirty.add('legacy'));
  on('achievement', () => dirty.add('legacy'));
}

let lastAppTitle = '';
// §I8. The wall clock behind the Sunday ritual, so a fast clock cannot stack up
// a Journal every ten seconds.
let lastSunday = 0;

// Two or four windows, in a row, filling the desktop. It is the only automatic
// arrangement the machine offers and it is the console's own shape.
function tile(ids) {
  const { w, h } = WM.deskSize();
  const pad = OS.INSET;
  // `deskSize()` has already taken the docked rail out of `w`, so a tile that
  // fills the field fills exactly the part of the screen windows may use.
  const rest = ids.filter((x) => x !== 'wire');
  if (rest.length === 1) { place(rest[0], { x: pad, y: pad, w: w - pad * 2, h: h - pad * 2 }); return; }
  if (rest.length === 2) {
    const cw = Math.round((w - pad * 3) / 2);
    place(rest[0], { x: pad, y: pad, w: cw, h: h - pad * 2 });
    place(rest[1], { x: pad * 2 + cw, y: pad, w: cw, h: h - pad * 2 });
    return;
  }
  ids = rest;
  const cw = Math.round((w - pad * 3) / 2);
  const ch = Math.round((h - pad * 3) / 2);
  const spots = [[pad, pad], [pad * 2 + cw, pad], [pad, pad * 2 + ch], [pad * 2 + cw, pad * 2 + ch]];
  ids.forEach((winId, i) => {
    const [x, y] = spots[i] || spots[0];
    place(winId, { x, y, w: cw, h: ch });
  });
}

function place(winId, box) {
  const st = WM.store().windows[winId];
  if (!st) return;
  const { w: DW, h: DH } = WM.deskSize();
  st.zoomed = false;
  st.fx = box.x / DW; st.fy = box.y / DH; st.fw = box.w / DW; st.fh = box.h / DH;
  WM.elOf(winId)?.classList?.remove('zoomed');
  WM.apply(winId);
}

// ── Escape ──────────────────────────────────────────────────────────────────

// The machine's own screens, for anything that asks what can be opened — the
// WebMCP `show_module` tool derives its enum from this, so a visiting assistant
// can send the founder to the Record rather than only to the eight modules.
export function extraViews(st) {
  return APPS.filter((a) => !a.module && a.id !== 'wire')
    .filter((a) => !a.req || a.req(st))
    .map((a) => ({ id: a.id, name: a.fullTitle || a.title }));
}

export function escape() {
  if (Saver.wake()) return true;
  if (Find.isOpen()) { Find.close(); return true; }
  if (Ctx.close()) return true;
  if (MenuBar.closeMenu()) return true;
  if (Notify.centerIsOpen()) { Notify.toggleCenter(false); return true; }
  if (WM.isShowingDesktop()) { WM.showDesktop(false); return true; }
  return false;
}
