// ─────────────────────────────────────────────────────────────────────────────
// THE SCREENSAVER — §I7.
//
// After `OS.SCREENSAVER_S` without a pointer or a key, the machine draws the
// run: the whole trajectory, stroked in from left to right, with the Wire
// running under it as a ticker. Any input at all ends it.
//
// Four things it must not be, each of which is a rule this codebase already
// wrote down:
//
//   · **Not `position: fixed`.** `tools/shot.mjs` calls anything with a fixed
//     or sticky ancestor *pinned* and flags it under ChatGPT's chat box. It is
//     a child of `#desktop`, absolute inside a flowing element, exactly as the
//     windows are.
//   · **Not on a pause.** Idle only. `shot.mjs` opens every check with
//     `pause=1`, and a screensaver that answered a pause would put a plate over
//     every screenshot this project takes.
//   · **Not a third filter pass.** The plate is one background and no
//     `backdrop-filter`: the third chained filter on a layer this size is the
//     74fps-to-31fps cliff, and a backdrop root is what makes one headless
//     screenshot in three come back milky.
//   · **Not a draw from the RNG.** It renders from `runChart`, which is pure,
//     and from the feed as it stands. Nothing here advances the shared stream.
//
// It repaints once a second while it is up — the chart is a hundred points and
// a handful of paths, and it is only ever on screen when nobody is playing.
// ─────────────────────────────────────────────────────────────────────────────
import { S } from '../../engine/state.js';
import { esc } from '../dom.js';
import { runChart } from '../chart.js';
import { gameDateShort, fmt } from '../../engine/format.js';
import { OS, machineName, ROMAN } from './config.js';

let host = null;          // the plate, a child of #desktop
let deskEl = null;
let idleAt = 0;
let timer = 0;
let up = false;
let blocked = () => false;
let wired = false;

const reduced = () => {
  try {
    return document.documentElement?.classList?.contains('reduced-motion')
      || !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  } catch { return true; }
};

/**
 * `desktop` is the element the plate lives inside — never the document, so
 * nothing here is pinned. `isBlocked` is asked before it comes up: the shell
 * says no while a card, a call or the walkthrough is on the table.
 */
export function mount(desktop, { isBlocked } = {}) {
  deskEl = desktop || null;
  blocked = typeof isBlocked === 'function' ? isBlocked : () => false;
  host = null;
  up = false;
  poke();
  if (!wired) {
    wired = true;
    // Capture, so a press that a window swallows still counts as a person
    // being here. `pointermove` is throttled by `poke` itself — it only writes
    // a timestamp — and `wake` is the only thing that touches the DOM.
    for (const ev of ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart']) {
      document.addEventListener(ev, onInput, { capture: true, passive: true });
    }
    document.addEventListener('visibilitychange', () => { if (!document.hidden) onInput(); });
  }
  clearInterval(timer);
  timer = setInterval(tick, 1000);
}

function onInput() {
  if (up) wake();
  else poke();
}

/** Somebody is here. */
export function poke() { idleAt = Date.now(); }

export function isUp() { return up; }

function tick() {
  if (up || !deskEl || !S) return;
  if (document.hidden) { poke(); return; }
  if (blocked()) { poke(); return; }
  if (Date.now() - idleAt < OS.SCREENSAVER_S * 1000) return;
  // A screensaver of an empty room is worse than no screensaver. On the first
  // morning there is no trajectory to draw and nothing on the Wire to run under
  // it, so the machine simply stays where it is until there is a run to show.
  if (!worthShowing()) { poke(); return; }
  show();
}

// Three weeks of arc is what `runChart` needs before it draws anything, and the
// ticker needs a Wire with something on it. Either will do.
function worthShowing() {
  const arc = (S?.company?.arc || []).filter((x) => x && x.d != null);
  return arc.length >= 3 || (Array.isArray(S?.feed) && S.feed.length > 3);
}

function show() {
  if (up || !deskEl) return;
  up = true;
  if (!host) {
    host = document.createElement('div');
    host.className = 'saver';
    host.setAttribute('aria-hidden', 'true');
    deskEl.appendChild(host);
  }
  host.innerHTML = body();
  host.classList.remove('out');
  // A frame between insert and class so the stroke animation actually runs
  // from zero rather than starting mid-way.
  requestAnimationFrame(() => host && host.classList.add('in'));
}

/** Any input at all. Called from the capture listeners and from the shell. */
export function wake() {
  if (!up) { poke(); return false; }
  up = false;
  poke();
  if (host) {
    host.classList.remove('in');
    host.classList.add('out');
    const dead = host;
    setTimeout(() => { if (!up && dead) { dead.remove(); if (host === dead) host = null; } }, OS.SAVER_FADE_MS);
  }
  return true;
}

/** The shell is being rebuilt: the plate belongs to a desktop that is gone. */
export function unmount() {
  clearInterval(timer);
  timer = 0;
  up = false;
  host?.remove?.();
  host = null;
  deskEl = null;
}

// ── What it draws ───────────────────────────────────────────────────────────
// The run, and the last thing the world said about it. Nothing interactive:
// every element is inert, because the first press is what puts it away.

function body() {
  const day = Math.floor(Number(S?.time?.day) || 0);
  const act = Math.max(1, Math.min(5, S?.company?.act || 1));
  let chart = '';
  try { chart = runChart(S) || ''; } catch { chart = ''; }
  const ticker = tickerLines();
  return `<div class="saver-in ${reduced() ? 'still' : ''}">
    <div class="saver-head">
      <span class="saver-name">${esc(machineName(S?.company?.name, act))}</span>
      <span class="saver-when mono">ACT ${ROMAN[act]} · D${fmt(day)} · ${esc(gameDateShort(day).toUpperCase())}</span>
    </div>
    <div class="saver-chart">${chart}</div>
    ${ticker.length ? `<div class="saver-ticker"><div class="saver-tape">
      ${ticker.map((t) => `<span class="saver-item"><span class="saver-i-k mono">${esc(t.k)}</span>${esc(t.text)}</span>`).join('')}
      ${ticker.map((t) => `<span class="saver-item" aria-hidden="true"><span class="saver-i-k mono">${esc(t.k)}</span>${esc(t.text)}</span>`).join('')}
    </div></div>` : ''}
  </div>`;
}

// The last two dozen things on the Wire, shortest first past the door. Written
// twice into the tape so the loop has no seam — the second copy is the first
// one again, which is how every ticker anybody has ever built works.
function tickerLines() {
  const feed = Array.isArray(S?.feed) ? S.feed : [];
  return feed.slice(0, 24).map((f) => ({
    k: f?.type === 'mail' ? 'POST' : String(f?.type || '').toUpperCase(),
    text: String(f?.text || '').replace(/\*\*/g, '').replace(/\s+/g, ' ').slice(0, 160),
  })).filter((t) => t.text);
}
