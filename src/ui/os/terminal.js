// ─────────────────────────────────────────────────────────────────────────────
// TERMINAL — a prompt on the founder's own machine.
//
// The transcript lives at `S.ui.os.term.lines`, capped, and saved with the
// layout, so `render(S)` is pure and the scrollback survives a repaint. The
// prompt is a form; the shell listens for it once, delegated, the way it does
// for the journal. Commands are data in `src/data/terminal.js`.
// ─────────────────────────────────────────────────────────────────────────────
import { esc } from '../dom.js';
import { runCommand } from '../../data/terminal.js';
import { machineName } from './config.js';
import { EMPTY, CTX } from '../../data/machine.js';

const KEEP = 120;
const line = (k) => (EMPTY && typeof EMPTY[k] === 'string' ? EMPTY[k] : '');
const lore = (k) => (CTX && typeof CTX[k] === 'string' ? CTX[k] : '');

export function termState(S) {
  const os = ((S.ui ??= {}).os ??= {});
  if (!os.term) os.term = { lines: [], history: [] };
  os.term.lines ??= []; os.term.history ??= [];
  return os.term;
}

export function prompt(S) {
  const user = String(S.founder?.handle || 'founder').replace(/^@/, '');
  return `${user}@${machineName(S.company?.name, S.company?.act || 1).toLowerCase().replace(/\s+/g, '-')}:~$`;
}

export function submit(S, input, ctx) {
  const t = termState(S);
  const text = String(input || '').trim();
  if (!text) return;
  t.lines.push({ t: 'in', text: `${prompt(S)} ${text}` });
  t.history.unshift(text);
  if (t.history.length > 40) t.history.length = 40;
  const r = runCommand(S, text, ctx);
  if (r.clear) { t.lines = []; return; }
  for (const l of r.lines) t.lines.push({ t: r.err ? 'err' : 'out', text: String(l) });
  if (t.lines.length > KEEP) t.lines.splice(0, t.lines.length - KEEP);
}

export function render(S) {
  const t = termState(S);
  return `<div class="term" data-ctx="terminal">
    <div class="term-scroll" id="term-scroll">
      ${t.lines.length ? t.lines.map((l) => `<div class="term-line ${l.t}">${esc(l.text)}</div>`).join('')
        : `<div class="term-line motd">${esc(line('terminal'))}</div><div class="term-line motd dim">${esc(lore('terminal'))}</div>`}
      <form class="term-form" data-term-form novalidate autocomplete="off">
        <span class="term-prompt">${esc(prompt(S))}</span>
        <input class="term-input" name="cmd" type="text" spellcheck="false" autocomplete="off" aria-label="Command" />
      </form>
    </div>
  </div>`;
}

export function readoutFor(S) {
  const n = termState(S).lines.length;
  return n ? `${n} LINE${n === 1 ? '' : 'S'} · TYPE HELP` : 'TYPE HELP';
}

export function menuFor() {
  return [
    { label: 'Clear the screen', act: 'term-clear' },
    { label: 'Help', act: 'term-run', v: 'help' },
    { label: 'Status', act: 'term-run', v: 'status' },
    { label: 'Ask ARIA', act: 'term-run', v: 'aria' },
    { label: 'Read what_we_are_like.md', act: 'term-run', v: 'cat what_we_are_like.md' },
  ];
}
