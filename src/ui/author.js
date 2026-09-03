// ─────────────────────────────────────────────────────────────────────────────
// THE WORLD'S CONSOLE
//
// What the assistant is allowed to do to you right now, what it just did, and
// the plug. Three rules from the field guide shape it:
//
//   · user observability — the tool firing, its arguments, what came back, and
//     what it weighed against the platform's cap, all visible while it happens;
//   · a visible kill switch, and one that really works: MUTE aborts the root
//     controller, the popover empties, and the written deck carries on;
//   · nothing may be unreachable. The Wire rail is display:none below 1120px,
//     and the ChatGPT pane is about 760px wide, so the panel has a second home
//     in a dialog behind a statusline chip. A control you cannot see is a
//     control you do not have.
//
// It is a string function like every other view, painted through `render()`.
// ─────────────────────────────────────────────────────────────────────────────
import { esc, render } from './dom.js';
import { on } from '../engine/bus.js';
import { S } from '../engine/state.js';
import * as MCP from '../webmcp/index.js';
import * as Demo from '../webmcp/demo.js';
import * as Resident from '../webmcp/resident.js';
import * as World from '../world/author.js';
import { typeInto, skipActive } from './typewriter.js';
import { PLATFORM } from '../data/platform.js';

const HARD_CAP = 1500;
let lastAria = '';
let typing = false;
let demoLine = '';        // what the scripted world is 'saying' right now

// ── The pieces ──────────────────────────────────────────────────────────────

// The hand an assistant would arrive with, supplied from outside rather than
// imported: the only thing that knows it is `intro.js`, and reaching for it
// from here would put this module in a cycle with the whole WebMCP surface —
// `ui/author.js → intro.js → webmcp/index.js → surface.js → tools.js →
// ui/author.js` — which leaves a binding undefined at evaluation time and
// breaks tool execution, not rendering, so it fails a long way from here.
// Registered the same way the world chip and the saved-ago line are.
//
// It builds a throwaway state to ask the surface what it would publish, so it
// is computed once rather than on every 480ms repaint.
let handFn = null;
let handMemo;
export function registerHand(fn) { handFn = fn || null; handMemo = undefined; }
function cachedHand() {
  if (handMemo === undefined) {
    try { handMemo = handFn ? handFn() : null; } catch { handMemo = null; }
  }
  return handMemo && (handMemo.tools?.length || handMemo.later?.length) ? handMemo : null;
}

function statusOf() {
  const st = MCP.status();
  const muted = !!S?.world?.author?.muted;
  if (muted) return { key: 'muted', label: 'MUTED', tone: 'muted', sub: 'the written world has it' };
  if (st.tier === 'none') return { key: 'none', label: 'UNAVAILABLE', tone: 'off', sub: st.reason };
  // A model in this browser, playing the same tools a visiting assistant would.
  // It reads LOCAL rather than PLAYING, because which of the two is holding the
  // world is the first thing a player is owed. The sub-line says what it *is*;
  // the readout beside the stop key says what it is *doing* — both of them
  // saying "thinking" was one line doing one job twice.
  if (Resident.isRunning()) {
    return { key: 'local', label: 'LOCAL', tone: 'live',
      sub: 'a model in this browser is playing the world' };
  }
  if (st.tier === 'legacy') return { key: 'legacy', label: 'LEGACY', tone: 'warn', sub: st.reason };
  if (st.waiting) return { key: 'listening', label: 'ON DUTY', tone: 'live', sub: 'waiting for the world to owe a card' };
  if (st.mode === 'agent') return { key: 'agent', label: 'PLAYING', tone: 'live', sub: 'an assistant is playing the world' };
  return { key: 'ready', label: 'READY', tone: 'ok',
    sub: S?.meta?.assistantChoice === 'play'
      ? 'say “play the world” in chat to bring the assistant in'
      : 'no assistant has spoken yet' };
}

function callRow(c) {
  const pct = c.bytes > 0 ? Math.min(100, Math.round((c.bytes / HARD_CAP) * 100)) : 0;
  const tone = c.status === 'ok' ? 'ok'
             : c.status === 'refused' ? 'refused'
             : c.status === 'cancelled' ? 'stopped'
             : c.status === 'needs_human' ? 'human'
             : c.status === 'needs_world' || c.status === 'heartbeat' ? 'wait' : 'bad';
  const mark = { ok: '·', refused: '✕', stopped: '⏹', human: '✎', wait: '◌', bad: '!' }[tone];
  const tip = `${esc(c.name)}<br><b>${esc(c.status)}</b>${c.note ? ' &middot; ' + esc(c.note) : ''}`
            + `<br>${esc(c.args || 'no arguments')}<br>${c.bytes} of ${HARD_CAP} characters &middot; ${c.ms}ms`;
  return `<div class="wc-call ${tone}" data-tip="${esc(tip)}">
      <span class="wc-n">${String(c.n).padStart(2, '0')}</span>
      <span class="wc-mark">${mark}</span>
      <span class="wc-name">${esc(c.name)}</span>
      <span class="wc-bytes"><i style="width:${pct}%"></i></span>
      <span class="wc-ms">${c.ms}ms</span>
    </div>`;
}

export function panelBody({ full = false } = {}) {
  const st = MCP.status();
  const s = statusOf();
  const muted = s.key === 'muted';
  const calls = st.calls.slice(0, full ? 14 : 6);
  const w = S?.world?.author?.stats || {};

  // In the rail the console sits above the feed, and the feed is where the
  // decisions are. When there is no world layer to show, the sub-line is a
  // browser requirements list — five lines of what you cannot do, permanently,
  // at the top of the most valuable column in the game. It moves to the status
  // row's tooltip and to the Uplink window, which is the full panel; the line
  // that stays is the one a player actually needs, which is that they are not
  // missing the game. Every other tier keeps its sub-line: those say what the
  // world is *doing*, and that is worth the room.
  const terse = !full && st.tier === 'none';
  const head = `<div class="wc-status ${s.tone}"${terse ? ` data-tip="${esc(s.sub || '')}" data-tip-title="Site tools"` : ''}>
      <span class="wc-dot"></span><span class="wc-label">${esc(s.label)}</span>
      <span class="grow"></span>
      <span class="wc-count" title="tools the world holds right now">${st.count} TOOL${st.count === 1 ? '' : 'S'}</span>
    </div>
    ${terse ? '' : `<div class="wc-sub">${esc(s.sub || '')}</div>`}`;

  // The consolation and the requirements live here, in the Uplink, and not on
  // the title: a new player's second paragraph should not be the name of a
  // browser standard. The full panel is the one place that says both.
  const plug = st.tier === 'none' ? `
      <button class="wc-plug hire" data-act="assistant-link">PLAY WITH YOUR ASSISTANT</button>
      <div class="wc-note">The game plays in full without one — this is the written world.${full
        ? ` For the version with an opponent, open it in <b>${esc(PLATFORM.browser)}</b> or in <b>${esc(PLATFORM.app)}</b> on ${esc(PLATFORM.presets)}.` : ''}</div>`
    : muted ? `
      <button class="wc-plug back" data-act="unmute-world">UNMUTE THE WORLD</button>`
    : `
      <button class="wc-plug" data-act="mute-world">MUTE THE WORLD</button>`;

  const log = calls.length
    ? `<div class="wc-log">${calls.map(callRow).join('')}</div>`
    : st.tier === 'none' ? ''
    : `<div class="wc-empty">Nothing has been asked of the world yet.</div>`;

  // The tally is what the world has done to this run. `voiceNotes` is the
  // house style, counted: `src/world/voice.js` runs `copylint`'s rules over
  // prose the linter never sees because it was written at run time, and every
  // one of them is advice rather than a refusal — so the only place a player
  // ever finds out the world is writing in a voice the game does not use is
  // here, next to the cards it wrote.
  const q = S?.world?.author?.queue?.length || 0;
  const tally = (w.cards || w.posts || w.refused || q)
    ? `<div class="wc-tally">
         <span>${w.cards || 0} card${w.cards === 1 ? '' : 's'}</span>
         <span>${w.posts || 0} posted</span>
         ${q ? `<span data-tip="Cards the world post-dated. Each is judged again on the day it lands, and the plug drops them all.">${q} waiting</span>` : ''}
         ${w.refused ? `<span class="refused">${w.refused} refused</span>` : ''}
         ${w.voiceNotes ? `<span class="voice" data-tip="Places the world's prose broke the house style — an exclamation mark, a contraction in narration, a count written as a digit. Advice, never a refusal.">${w.voiceNotes} voice note${w.voiceNotes === 1 ? '' : 's'}</span>` : ''}
         ${w.ownWords ? `<span class="human">${w.ownWords} in your own words</span>` : ''}
       </div>` : '';

  const aria = lastAria
    ? `<div class="wc-aria"><span class="wc-aria-who">ARIA</span><span class="wc-aria-line" id="wc-aria-line"></span></div>`
    : '';

  const tools = full && st.tools.length
    ? `<div class="wc-tools">${st.tools.map((t) => `<span>${esc(t)}</span>`).join('')}</div>` : '';

  // With no world layer, the full panel had four lines in it and nothing else —
  // a window whose whole content was an apology. It shows the hand instead: the
  // tools an assistant *would* hold the moment it arrived, and the ones it would
  // have to earn. It is the most interesting thing in the game to a player who
  // cannot run it yet, and it is the same pure function the title screen uses,
  // so the two can never disagree. Computed once — it builds a throwaway state.
  const hand = full && st.tier === 'none' ? cachedHand() : null;
  const offer = hand ? `
      <div class="wc-offer">
        <div class="wc-offer-k">WHAT AN ASSISTANT WOULD HOLD</div>
        <div class="wc-tools">${hand.tools.map((t) =>
          `<span data-tip="${esc(t.title)}">${esc(t.name)}</span>`).join('')}</div>
        <div class="wc-offer-k later">AND WHAT IT WOULD HAVE TO EARN</div>
        <div class="wc-laters">${hand.later.map(([n, why]) =>
          `<span><b>${esc(n)}</b> ${esc(why)}</span>`).join('')}</div>
      </div>` : '';

  // Tools this page did not publish. Aperture Systems registers them on its own
  // origin and shares them with this one; they arrive through
  // getTools({ fromOrigins }) rather than through our registry.
  const partner = st.partner ? `<div class="wc-partner">
      <div class="wc-partner-head">FROM ANOTHER ORIGIN</div>
      <div class="wc-partner-origin">${esc(String(st.partner.origin).replace(/^https?:\/\//, ''))}</div>
      <div class="wc-tools">${st.partner.tools.map((t) => `<span>${esc(t)}</span>`).join('')}</div>
    </div>` : '';

  // Stock Chrome ships no consumer agent, so without this the whole feature is
  // invisible to anyone without the ChatGPT desktop app. It is a script and the
  // button says so; what it demonstrates is the machinery, which is real —
  // it goes out through getTools() and executeTool() like a visiting agent.
  const demo = st.tier === 'none' || muted ? '' : Demo.isRunning()
    ? `<div class="wc-demo running">
         <div class="wc-demo-say">${esc(demoLine || 'running…')}</div>
         <button class="wc-demo-btn stop" data-act="demo-stop">STOP THE SCRIPT</button>
       </div>`
    : `<button class="wc-demo-btn" data-act="demo-run"
         data-tip="A fixed sequence of calls, made through <b>getTools()</b> and <b>executeTool()</b> exactly as a visiting agent would.<br>Not a model. For seeing what this does without one.">
         ▷ RUN THE SCRIPTED WORLD</button>`;

  // And the other half of that answer. When the browser has a model of its own,
  // it can drive the same loop for real — same discovery, same tools, same
  // bounds, nothing leaving the tab. Drawn only when there is one to press it:
  // a browser without the Prompt API is the ordinary case, and the ordinary
  // case does not want a disabled button and an apology under it.
  const rs = Resident.state();
  const resident = st.tier === 'none' || muted || !Resident.offered() ? ''
    : rs.running
    ? `<div class="wc-local">
         <div class="wc-local-say">${esc(rs.text || 'thinking')}</div>
         ${rs.lastRefusal ? `<div class="wc-local-ref">REFUSED &middot; ${esc(rs.lastRefusal)}</div>` : ''}
         <div class="wc-local-n">${rs.calls} CALL${rs.calls === 1 ? '' : 'S'}${
             rs.refused ? ` &middot; ${rs.refused} REFUSED` : ''}${
             rs.benched.length ? ` &middot; ${rs.benched.length} BENCHED` : ''}</div>
         <button class="wc-demo-btn stop" data-act="resident-stop">STOP THE LOCAL MODEL</button>
       </div>`
    : `<button class="wc-demo-btn local" data-act="resident-run"
         data-tip="This browser has a model built into it. It plays the world through the same <b>getTools()</b> and <b>executeTool()</b> calls a visiting assistant makes, under every rule in this console.<br>Nothing leaves the tab.">
         ▷ LET A LOCAL MODEL PLAY THE WORLD</button>`;

  return head + plug + demo + resident + tally + log + tools + offer + partner + aria;
}

export function paintAuthor() {
  // The dialog copy is the panel's only home at every width where the Wire rail
  // is hidden — which is the width this game is meant to be played at. Painting
  // only the rail left it a snapshot: press UNMUTE in the dialog and the dialog
  // went on saying UNMUTE, over a tool count that had already changed.
  const dlg = document.querySelector('.world-console.in-dialog');
  if (dlg) render(dlg, panelBody({ full: true }));

  const el = document.getElementById('world-console');
  if (!el) return;
  // `render()` patches, and a patch removes the text node the typewriter put
  // in — so the line has to be put back after every repaint. Restarting the
  // reveal each time would make it stutter: the log repaints on every call,
  // and a line is typed over about a second. So it is only ever typed once.
  const before = el.querySelector('#wc-aria-line')?.textContent || '';
  if (!render(el, panelBody())) return;
  const line = el.querySelector('#wc-aria-line');
  if (!line || !lastAria) return;
  if (typing || before === lastAria) { line.textContent = before || lastAria; return; }
  typing = true;
  Promise.resolve(typeInto(line, lastAria, { cps: 52 })).finally(() => { typing = false; });
}

// The statusline chip: the panel's second home, for every width where the Wire
// rail is not on screen — which includes the pane this game is meant to be
// played in.
// The topbar's world readout. It is a button, because at every width where the
// Wire rail is hidden it is the only way to the panel and the plug.
export function statusChip() {
  const st = MCP.status();
  const s = statusOf();
  const deck = st.tier === 'none' && !S?.world?.author?.muted;
  const tip = deck
    ? 'The written world &middot; <b>play with your assistant</b> and it writes this run instead'
    : `<b>${esc(s.label)}</b><br>${esc(s.sub || '')}<br>${st.count} tool${st.count === 1 ? '' : 's'} &middot; click for the console and the plug`;
  return `<button class="tb-world ${deck ? 'off' : s.tone}" data-act="author-dialog"
    aria-label="The world" data-tip="${esc(tip)}"><span class="tbw-dot"></span><span class="tbw-n">${
      deck ? 'DECK' : st.count}</span></button>`;
}

// ── Wiring ──────────────────────────────────────────────────────────────────

export function mountAuthor({ dialog, onPaint } = {}) {
  const repaint = () => { paintAuthor(); onPaint?.(); };
  on('webmcp:call', repaint);
  on('webmcp:tools', repaint);
  on('webmcp:surface', repaint);
  on('webmcp:capability', repaint);
  on('world:mode', repaint);
  on('world:wait', repaint);
  on('world:slot', repaint);
  on('world:mute', repaint);
  on('world:unmute', repaint);
  on('world:card', repaint);
  // The notebook and the post-dated queue both show in the tally, and the plug
  // empties the queue — a count that does not change when the founder pulls it
  // is the console lying about what it just did.
  on('world:queue', repaint);
  on('world:note', repaint);
  on('aria:says', (line) => {
    // Finish whatever is mid-reveal before starting another, or the longer of
    // two consecutive lines lands last and overwrites the newer one.
    if (typing) { try { skipActive(); } catch {} }
    lastAria = line; typing = false; repaint();
  });
  // A new timeline is a new company. The last one's line is not its line.
  on('game:start', () => { resetAuthorUi(); repaint(); });
  on('prestige', () => { resetAuthorUi(); repaint(); });
  on('demo:start', () => { demoLine = 'starting…'; repaint(); });
  on('demo:beat', ({ say }) => { demoLine = say; repaint(); });
  on('demo:waiting', ({ label }) => { demoLine = label; repaint(); });
  on('demo:end', () => { demoLine = ''; repaint(); });
  // The resident model keeps its own line — what it is doing, what was refused,
  // how many calls in — so the console repaints on every step of its loop.
  on('resident:start', repaint);
  on('resident:step', repaint);
  on('resident:end', repaint);
  on('webmcp:partner', repaint);
  on('partner:tools', repaint);
  return { repaint, dialog };
}

export function ariaLine() { return lastAria; }
export function resetAuthorUi() { lastAria = ''; typing = false; }
