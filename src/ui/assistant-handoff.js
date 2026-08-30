// ─────────────────────────────────────────────────────────────────────────────
// THE ASSISTANT HANDOFF — the final beat of onboarding when the founder chose
// an AI-authored world.
//
// Registering WebMCP tools is passive: the page cannot originate a chat turn.
// This screen makes that boundary explicit, holds the simulation so the written
// deck cannot win the first slot by accident, and closes itself the moment a
// real tool call proves the assistant has arrived. There is always a way out.
// ─────────────────────────────────────────────────────────────────────────────
import { esc } from './dom.js';
import * as Modal from './modal.js';
import { toast } from './toast.js';
import * as Save from '../engine/save.js';
import { S as LIVE } from '../engine/state.js';
import * as MCP from '../webmcp/index.js';
import { on } from '../engine/bus.js';

export const OPENING_LINE = 'Play the world. Call briefing, then wait_for_world. Re-call it after every result—including while I Accept a proposal—and keep the loop open until I ask you to stop.';
export const RESUME_LINE = 'Continue playing the world. Call wait_for_world now—my move is waiting on the open card. Then re-call it after every result, including while I Accept a proposal, until I ask you to stop.';

let mounted = false;
let open = false;
let phase = 'idle';       // idle | ready | connected | unavailable
let arrived = false;
let firstCall = '';
let closeTimer = null;

export function reset() {
  clearTimeout(closeTimer);
  closeTimer = null;
  open = false;
  phase = 'idle';
  arrived = false;
  firstCall = '';
}

// Pure so the branch table is testable without opening a dialog.
export function stateFor(S = LIVE, st = MCP.status()) {
  if (!S || S.meta?.assistantChoice !== 'play' || S.meta?.assistantHandoffDone) return 'none';
  if (S.world?.author?.muted) return 'none';
  if (st?.tier === 'none' || !st?.count) return 'unavailable';
  if (arrived || st?.mode === 'agent') return 'connected';
  return 'ready';
}

export function shouldOffer(S = LIVE, st = MCP.status()) { return stateFor(S, st) !== 'none'; }

export function bodyFor(kind, { company = 'the company', count = 0, callName = '', reason = '' } = {}) {
  if (kind === 'unavailable') return `<div class="assistant-handoff unavailable" data-assistant-handoff data-state="unavailable">
    <div class="ah-hero">
      <div class="ah-signal" aria-hidden="true"><span>◇</span></div>
      <div>
        <div class="ah-kicker">THE FINAL ONBOARDING STEP</div>
        <div class="ah-title">The assistant did not arrive.</div>
        <div class="ah-copy">This browser no longer exposes the site tools this run expected. Nothing is broken and nothing is blocked — the written world is ready to take the first card.</div>
      </div>
    </div>
    ${reason ? `<div class="ah-reason">${esc(reason)}</div>` : ''}
    <div class="ah-live off"><i></i><span>THE CLOCK WAITS UNTIL YOU CHOOSE HOW TO CONTINUE</span></div>
  </div>`;

  if (kind === 'connected') return `<div class="assistant-handoff connected" data-assistant-handoff data-state="connected">
    <div class="ah-hero">
      <div class="ah-signal" aria-hidden="true"><span>◈</span></div>
      <div>
        <div class="ah-kicker">CONNECTION MADE</div>
        <div class="ah-title">Your assistant is in the world.</div>
        <div class="ah-copy">The first call reached <b>${esc(company)}</b> through WebMCP${callName ? ` as <code>${esc(callName)}</code>` : ''}. From here it can read the run, wait for a story slot, and put its own cards on your screen.</div>
      </div>
    </div>
    <div class="ah-route compact">
      <span class="done"><b>✓</b><small>PAGE</small> tools offered</span>
      <i aria-hidden="true">→</i>
      <span class="done"><b>✓</b><small>CHAT</small> assistant present</span>
      <i aria-hidden="true">→</i>
      <span class="live"><b>◈</b><small>WORLD</small> ${callName ? esc(callName) : 'first call'}</span>
    </div>
    <div class="ah-live on"><i></i><span>CONNECTED · THE CLOCK IS STARTING</span></div>
  </div>`;

  return `<div class="assistant-handoff" data-assistant-handoff data-state="ready">
    <div class="ah-hero">
      <div class="ah-signal" aria-hidden="true"><span>◈</span></div>
      <div>
        <div class="ah-kicker">THE FINAL ONBOARDING STEP</div>
        <div class="ah-title">One line brings your assistant in.</div>
        <div class="ah-copy"><b>${count} tools</b> are waiting in this browser. WebMCP lets the page offer them to the chat, but the page cannot start a chat turn for you.</div>
      </div>
    </div>
    <div class="ah-instruction">
      <span class="ah-label">RETURN TO THIS CHAT AND SEND</span>
      <strong>play the world</strong>
      <span class="ah-hint">The dialog closes itself when the first tool call arrives.</span>
    </div>
    <div class="ah-route">
      <span><b>1</b><small>BRIEFING</small> reads ${esc(company)}</span>
      <i aria-hidden="true">→</i>
      <span><b>2</b><small>WAIT</small> stays on duty</span>
      <i aria-hidden="true">→</i>
      <span><b>3</b><small>WORLD</small> writes the next card</span>
    </div>
    <div class="ah-live"><i></i><span>WAITING FOR THE FIRST TOOL CALL · THE CLOCK IS PAUSED</span></div>
  </div>`;
}

function context(kind = phase) {
  const st = MCP.status();
  return {
    company: LIVE?.company?.name || 'the company',
    count: st.count || 0,
    callName: firstCall,
    reason: kind === 'unavailable' ? st.reason || 'Site tools are unavailable in this browser.' : '',
  };
}

function markDone() {
  if (!LIVE?.meta) return;
  LIVE.meta.assistantHandoffDone = true;
  delete LIVE.modalBlocking;
  Save.save(LIVE);
}

function paint(kind = phase) {
  const body = document.querySelector('#generic-modal .modal-body');
  if (body) body.innerHTML = bodyFor(kind, context(kind));
}

function closeConnected() {
  if (!open || phase !== 'connected') return;
  const stillOurs = !!document.querySelector('[data-assistant-handoff]');
  open = false;
  phase = 'idle';
  if (stillOurs) Modal.closeModal();
  toast({ icon: '◈', title: 'Your assistant is in the world',
    sub: `${firstCall || 'The first tool call'} reached the run. The written deck stands down while it stays present.`,
    kind: 'good', ms: 6500 });
}

function connect() {
  arrived = true;
  if (!open || phase === 'unavailable') return;
  if (phase === 'connected' && LIVE?.meta?.assistantHandoffDone) return;
  phase = 'connected';
  markDone();                         // release the clock before the next call
  paint('connected');
  const modal = document.querySelector('#generic-modal .modal');
  modal?.classList.add('assistant-connected');
  const actions = modal?.querySelector('.modal-choices');
  if (actions) actions.style.display = 'none';
  clearTimeout(closeTimer);
  closeTimer = setTimeout(closeConnected, 1200);
}

export async function copyOpeningLine() {
  try {
    await navigator.clipboard.writeText(OPENING_LINE);
    toast({ icon: '✓', title: 'Opening line copied', sub: 'Paste it into this chat and send.', kind: 'good' });
    return true;
  } catch {
    toast({ icon: '⚠', title: 'Could not copy the line', sub: 'Type “play the world” in this chat.', kind: 'warn' });
    return false;
  }
}

export async function copyResumeLine() {
  try {
    await navigator.clipboard.writeText(RESUME_LINE);
    toast({ icon: '✓', title: 'Reconnect line copied', sub: 'Paste it into this chat and send.', kind: 'good' });
    return true;
  } catch {
    toast({ icon: '⚠', title: 'Could not copy the line', sub: 'Tell the chat “continue the world”.', kind: 'warn' });
    return false;
  }
}

function defer({ unavailable = false } = {}) {
  if (!open) return;
  clearTimeout(closeTimer);
  closeTimer = null;
  if (unavailable && LIVE?.meta) LIVE.meta.assistantChoice = 'none';
  markDone();
  open = false;
  phase = 'idle';
  toast({ icon: '◇', title: 'The written world has the next card',
    sub: unavailable ? 'Move the save to a WebMCP browser to bring an assistant in.'
      : 'Say “play the world” whenever you want the assistant to take over.', ms: 5500 });
}

export function dismiss() {
  if (!open) return false;
  defer({ unavailable: phase === 'unavailable' });
  Modal.closeModal();
  return true;
}

export function isOpen() { return open && !!document.querySelector('[data-assistant-handoff]'); }

export function openHandoff() {
  if (open) return true;
  const kind = stateFor();
  if (kind === 'none') return false;
  phase = kind;
  open = true;
  // Transfer the onboarding hold to this dialog. Exactly one mechanism owns
  // the pause at a time, and `markDone()` can release it with one delete when
  // the first tool call arrives or the founder chooses the written world.
  LIVE.modalBlocking = 'assistant-handoff';
  LIVE.tutorialHold = false;
  const actions = kind === 'unavailable'
    ? [{ label: 'Continue with the written world', cls: 'btn-primary', fn: () => defer({ unavailable: true }) }]
    : kind === 'connected' ? [] : [
      { label: 'Use the written world for now', cls: 'btn-ghost', fn: () => defer() },
      { label: 'Copy “play the world”', cls: 'btn-primary', fn: copyOpeningLine, keepOpen: true },
    ];
  const modal = Modal.dialog({
    title: kind === 'unavailable' ? 'The handoff' : 'Bring in the world',
    wide: true,
    body: bodyFor(kind, context(kind)),
    actions,
    onClose: () => { if (open) defer({ unavailable: phase === 'unavailable' }); },
  });
  modal?.classList.add('assistant-handoff-modal');
  if (kind === 'connected') connect();
  return true;
}

export function mount() {
  if (mounted) return;
  mounted = true;
  on('webmcp:call:start', ({ name } = {}) => {
    if (!firstCall && name) firstCall = name;
    // This event is emitted only after schema validation and immediately
    // before execution, so it is the earliest trustworthy proof that the chat
    // crossed the WebMCP boundary. Long-running calls should not leave the
    // founder staring at a waiting screen until their result comes back.
    connect();
  });
  on('world:mode', ({ mode } = {}) => {
    if (mode === 'agent') connect();
  });
  on('webmcp:call', ({ name } = {}) => {
    if (!firstCall && name) firstCall = name;
    if (open && phase === 'connected') paint('connected');
  });
  on('world:mute', () => {
    if (open) dismiss();
  });
}
