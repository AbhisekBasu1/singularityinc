// ─────────────────────────────────────────────────────────────────────────────
// TOASTS + floating feedback numbers.
// ─────────────────────────────────────────────────────────────────────────────
import { esc, md } from './dom.js';

const root = () => document.getElementById('toast-root');
const fxRoot = () => document.getElementById('fx-root');

let queue = [];
let showing = 0;
const MAX = 3;

const recent = new Map();   // title → { el, count, t }
export function toast({ icon = '◈', title, sub, kind = '', ms = 3600 }) {
  // Coalesce repeats: the fourth "It made that up" should be a counter, not a stack.
  const queued = queue.find((q) => q.title === title);
  if (queued) { queued.count = (queued.count || 1) + 1; return; }
  const live = recent.get(title);
  if (live && live.el.isConnected) {
    live.count++; live.t = Date.now();
    const badge = live.el.querySelector('.toast-count');
    if (badge) badge.textContent = '×' + live.count;
    else live.el.querySelector('.toast-title')?.insertAdjacentHTML('beforeend',
      ` <span class="toast-count mono">×${live.count}</span>`);
    return;
  }
  queue.push({ icon, title, sub, kind, ms, count: 1 });
  drain();
}

function drain() {
  while (showing < MAX && queue.length) {
    const t = queue.shift();
    showing++;
    const el = document.createElement('div');
    el.className = 'toast ' + t.kind;
    el.innerHTML = `<div class="toast-icon">${t.icon}</div>
      <div><div class="toast-title">${md(t.title)}${t.count > 1 ? ` <span class="toast-count mono">×${t.count}</span>` : ''}</div>${t.sub ? `<div class="toast-sub">${md(t.sub)}</div>` : ''}</div>`;
    root()?.appendChild(el);
    recent.set(t.title, { el, count: t.count || 1, t: Date.now() });
    let closed = false;
    const close = () => {
      if (closed) return; closed = true;
      el.classList.add('out');
      setTimeout(() => { el.remove(); showing--; drain(); }, 300);
    };
    el.addEventListener('click', close);
    el.title = 'Click to dismiss';
    setTimeout(close, t.ms);
  }
}

export function floatNum(text, x, y, color = 'var(--green)') {
  const el = document.createElement('div');
  el.className = 'float-num';
  el.textContent = text;
  el.style.color = color;
  el.style.left = (x - 18 + (Math.random() * 26 - 13)) + 'px';
  el.style.top = (y - 12) + 'px';
  fxRoot()?.appendChild(el);
  setTimeout(() => el.remove(), 1150);
}

export function floatFromEvent(e, text, color) {
  floatNum(text, e.clientX ?? window.innerWidth / 2, e.clientY ?? window.innerHeight / 2, color);
}

export function shake(sel) {
  const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
  if (!el) return;
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
  setTimeout(() => el.classList.remove('shake'), 500);
}
