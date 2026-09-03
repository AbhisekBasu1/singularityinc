// ─────────────────────────────────────────────────────────────────────────────
// THE OPENING — a sequence, not a form. One question at a time, full screen,
// revealed at a readable pace. Choosing is advancing.
// ─────────────────────────────────────────────────────────────────────────────
import { esc } from './dom.js';
import { revealLines, typeInto, stagger, wait, skipActive, isPlaying } from './typewriter.js';
import { ARCHETYPES } from '../data/legacy.js';
import { CATEGORIES } from '../data/products.js';
import { DIFFICULTIES } from '../data/difficulty.js';
import { SCENARIOS } from '../data/scenarios.js';
import { companyName, personName, handleFor, TAGLINES } from '../data/names.js';
import { pick } from '../engine/rng.js';
import { fmt, money } from '../engine/format.js';
import { loadLegacy, hasSave } from '../engine/save.js';
import { newGame } from '../engine/state.js';
import { rngState, setRngState } from '../engine/rng.js';
import { capability } from '../webmcp/index.js';
import { desiredTools, templateFor } from '../webmcp/surface.js';
import { PLATFORM, REMEDY } from '../data/platform.js';
import { LATE_START, NGPLUS, TIME, ACT_GATES, ENDINGS_FORCED } from '../data/balance.js';

const ARCH_COLOR = { hacker: '#4dd0e1', designer: '#c084fc', hustler: '#f5a623',
  researcher: '#8b5cf6', operator: '#7c8a99', prophet: '#ffffff', ghost: '#6b7686' };

export const draft = {
  founderName: personName(),
  companyName: companyName(),
  archetype: 'hacker',
  category: 'devtools',
  difficulty: 'standard',
  scenario: 'none',
  assistant: 'play',        // 'play' | 'mute' — asked only where both are real
  start: 'day0',            // 'day0' | 'act3' — where the run begins
  letterToSelf: '',         // one line, posted back on the first day of Act IV
  // New Game+, offered from the third run on. Each is a different world rather
  // than a harder one, and each pays its own legacy multiplier.
  ngWorld: false, ngRival: false, ngInvert: false,
};

let onStart = null;
let onContinue = null;
export function setHandlers(h) { onStart = h.start; onContinue = h.cont; }

// The workstation dresses the title as a login screen and puts the saved run on
// it as an account tile. It injects that block here rather than rebuilding the
// title, so both housings show exactly the same pitch, panel and doors.
let decorFn = null;
export function setTitleDecor(fn) { decorFn = fn || null; }
function decor(slot) { try { return decorFn?.(slot) || ''; } catch { return ''; } }

const app = () => document.getElementById('app');
const legacy = () => loadLegacy() || { runs: 0, unlockedArchetypes: ['hacker'] };

// ── The world, on the title ─────────────────────────────────────────────────
// The headline feature is on the first screen, and it is detected rather than
// asked: the panel says what this browser can do, shows the hand the world
// will hold the moment the run begins, and offers the one door that matters
// for where the player is. Nothing here is a settings step — Begin is Begin.

// The stable capability list, from the same pure function that publishes the
// surface, so the title can never disagree with the popover. Some calls are
// live-gated until play makes them legal; keeping their descriptors stable is
// what lets one assistant stay connected for the whole run.
export function openingHand() {
  const rng = rngState();
  let names = [];
  try { names = desiredTools(newGame({})); } catch { names = []; }
  finally { setRngState(rng); }
  return {
    tools: names.map((name) => ({ name, title: templateFor(name)?.title || '' })),
    later: EARNED_BY_PLAY,
  };
}
const EARNED_BY_PLAY = [
  ['post_as_character', 'becomes legal for each person you meet'],
  ['rival_move', 'becomes legal once a rival enters'],
  ['market_weather', 'becomes legal in Act III'],
  ['regulator_pressure', 'becomes legal in Act III; Untouchable blocks it'],
  ['read_the_rival', 'answers while the rival lab\'s own site is reachable'],
];

// There is no documented host flag for a page to read. The desktop browser's
// WebMCP bridge currently exposes Codex-prefixed methods (and, on some builds,
// its backing object); older builds announced themselves in the user agent.
// Keep all three as best-effort signals. A miss is still harmless at the
// action boundary: main.js refuses to deep-link a page that is already hosted.
export function hostedInChat() { return inChatGPT(); }
function inChatGPT() {
  try {
    const mc = document?.modelContext;
    return !!window?.__codexWebMcpModelContext
      || typeof mc?.codexGetTools === 'function'
      || typeof mc?.codexExecuteTool === 'function'
      || /CodexBrowser|ChatGPT/i.test(navigator?.userAgent || '');
  } catch { return false; }
}

// 'hosted': site tools, inside ChatGPT's browser — the assistant is at the
// table. 'tools': site tools, no agent of its own (Chrome with the trial).
// 'none': the written world is the only game here. Detected, never asked.
export function assistantMode() {
  const cap = capability();
  const on = cap.tier === 'native' || cap.tier === 'legacy';
  return !on ? 'none' : inChatGPT() ? 'hosted' : 'tools';
}

// The one primary button. It says whose game this is only where there is
// somebody at the table; a first-ever visitor in an ordinary browser gets
// **Begin**, not a consolation about the browser they did not open.
function beginLabel() {
  return assistantMode() === 'hosted' ? 'Begin — with your assistant' : 'Begin';
}

// The question, asked only where both answers are real: a browser with site
// tools. "Not this run" is the plug the World console already has, thrown
// before the run starts, and it can be thrown back at any time.
export function assistantPick() {
  if (assistantMode() === 'none') return '';
  const play = draft.assistant !== 'mute';
  return `<div class="assistant-pick reveal" role="group" aria-label="Your assistant">
    <div class="ap-kicker"><span class="al-mark">◈</span> Your assistant is at the table</div>
    <div class="ap-row">
      <button class="ap-opt ${play ? 'on' : ''}" data-act="pick-assistant" data-v="play" aria-pressed="${play}">
        <b>Let it play the world</b>
        <span>It writes the cards, speaks for the cast, moves the rival. Say <i>play the world</i> in the chat once the run begins.</span>
      </button>
      <button class="ap-opt ${play ? '' : 'on'}" data-act="pick-assistant" data-v="mute" aria-pressed="${!play}">
        <b>Not this run</b>
        <span>The written world — six files of cards, a rival with its own moves. You can hand it back at any time.</span>
      </button>
    </div>
    ${assistantHandoffPreview()}
  </div>`;
}

// The choice used to hide the only action it required in one line of 11px
// copy. Make the handoff part of the decision itself: before the player opens
// the editor they know that the page can offer tools, but only they can start
// the chat turn that brings the assistant through them.
export function assistantHandoffPreview() {
  if (assistantMode() === 'none' || draft.assistant === 'mute') return '';
  const moment = draft.start === 'act3' ? 'after the first-year curtain' : 'after First Light';
  return `<div class="ap-handoff" aria-label="How the assistant joins the run">
    <div class="aph-k">THE HANDOFF</div>
    <div class="aph-flow">
      <span><b>1</b> The editor registers the world&rsquo;s tools</span>
      <i aria-hidden="true">→</i>
      <span><b>2</b> The clock pauses ${moment}</span>
      <i aria-hidden="true">→</i>
      <span><b>3</b> You send <em>play the world</em> in this chat</span>
    </div>
    <div class="aph-note">The game confirms the first tool call before the story starts. You can use the written world instead.</div>
  </div>`;
}
// Where the run starts. Day one is the game. Act III is the door for a judge
// with three minutes and for anyone who has played the garage before: the
// machine plays the first year in a second, and the world's whole hand is on
// the table when the founder walks in.
export function startPick() {
  const late = draft.start === 'act3';
  return `<div class="start-pick reveal" role="group" aria-label="Where the run starts">
    <div class="adv-label">Choose where the story begins</div>
    <div class="start-row">
      <button class="start-opt ${late ? '' : 'on'}" style="--ac:#00e5a0" data-act="pick-start" data-v="day0" aria-pressed="${!late}">
        <b>⌘ Day one</b>
        <span>The full story — $12,000, a laptop and an empty repository.</span>
      </button>
      <button class="start-opt ${late ? 'on' : ''}" style="--ac:#8b5cf6" data-act="pick-start" data-v="act3" aria-pressed="${late}">
        <b>★ Quick tour — Act III</b>
        <span>Skip the first year and meet the rival, cast, market and regulators immediately. <i>×${LATE_START.LEGACY_MULT.toFixed(1)} legacy</i></span>
      </button>
    </div>
  </div>`;
}
// ── One line, to whoever is running this in three years ─────────────────────
// A field on the last beat, and the only thing on it that is not a choice about
// the run. What is typed here is held on `S.founder.letterToSelf` and posted
// back, verbatim and unedited, on the first morning of Act IV — by which point
// the person who wrote it has been gone for about a thousand days. Leaving it
// blank is a real answer and gets its own letter, so there is no validation,
// no asterisk and nothing to dismiss.
export function letterPick() {
  return `<div class="self-letter reveal">
    <div class="adv-label">One line to the person running this in three years</div>
    <textarea class="line-input self-letter-field" id="in-letter" rows="2" maxlength="240"
      placeholder="Optional. It comes back when the company is large."
      aria-label="A line to yourself, delivered in Act IV">${esc(draft.letterToSelf || '')}</textarea>
  </div>`;
}

// The button at the threshold says where the run opens. It used to say "Open
// the editor", which is what the button did and not what was being decided.
function openLabel() {
  const where = draft.start === 'act3' ? 'Begin — Act III' : 'Begin — day one';
  if (assistantMode() !== 'none' && draft.assistant !== 'mute') return `${where}, then connect →`;
  return `${where} →`;
}

// How many of the hand's tools get a chip of their own before the panel starts
// costing the founder the Begin button. Ten is what fits a 420px screen.
const HAND_CHIPS = 10;

// §D6. The one sentence, before any name. It says where to open the page, who
// the opponent is, and that it is *this* run rather than a mode — which is the
// whole of what a first-time reader needs and none of what a protocol name
// gives them.
const PLAIN = 'Open this page inside ChatGPT\'s own browser and the ChatGPT you are talking to plays the market, the press and the rival — in this run.';

// `brief` is for anyone who has seen the pitch: the status line and the doors,
// nothing else. The full panel is for first sight.
export function webmcpPanel({ brief = false } = {}) {
  const cap = capability();
  const on = cap.tier === 'native' || cap.tier === 'legacy';
  const hosted = on && inChatGPT();
  const hand = openingHand();
  const reason = on ? (cap.tier === 'legacy' ? cap.reason : '')
    : (cap.secure ? REMEDY : cap.reason);
  // The count is derived and stays honest; the list is a sample. The hand grew
  // from ten tools to twenty-three and one chip apiece pushed Begin below the
  // fold at 420px — which `tools/titleshot.mjs` is the thing that noticed. The
  // rest are named in the last chip's note rather than dropped.
  const shownTools = hand.tools.slice(0, HAND_CHIPS);
  const restTools = hand.tools.slice(HAND_CHIPS);
  const chips = shownTools.map((t) => `<span class="wm-tool" data-tip="${esc(t.title)}">${esc(t.name)}</span>`).join('')
    + (restTools.length
      ? `<span class="wm-tool wm-tool-more" data-tip="${esc(restTools.map((t) => esc(t.name)).join('<br>'))}" data-tip-title="The rest of the hand">+${restTools.length} more</span>`
      : '');
  const later = hand.later.map(([n, why]) => `<span class="wm-later"><b>${esc(n)}</b> ${esc(why)}</span>`).join('');
  // A hand-off reloads the game in another browser, and saves do not follow.
  const saves = hasSave()
    ? `<span class="wm-say dim">Saves stay in this browser — Settings → Copy save moves one across.</span>` : '';
  const cta = hosted
    ? `<div class="wm-cta reveal">
         <span class="wm-say"><b>You are already in ChatGPT.</b> Press Begin, set up the company, then decide whether this chat plays the world.</span>
         <button class="btn btn-sm btn-ghost" data-act="assistant-link">How it works</button>
       </div>`
    : `<div class="wm-cta reveal">
         <button class="btn btn-sm" data-act="assistant-open">Play in ChatGPT</button>
         <button class="btn btn-sm btn-ghost" data-act="assistant-copy">Copy link</button>
         <button class="btn btn-sm btn-ghost" data-act="assistant-link">How it works</button>
         <span class="wm-say">Open it there before setup so the game and its assistant begin together.</span>
         ${saves}
       </div>`;
  // In the brief panel with no site tools the requirements line stays out: it
  // is a list of browsers, and it lives in the Uplink, where a founder who
  // wants the opponent goes looking for it. A legacy bridge keeps its reason,
  // which is about this browser and worth one line.
  const sayReason = reason && !(brief && !on);
  const status = `<div class="wm-status reveal">
      <span class="wm-dot ${on ? 'on' : ''}"></span>
      <span class="wm-state">${on ? 'Site tools on in this browser' : 'No site tools in this browser'}</span>
      <span class="wm-tier">${esc(cap.label)}</span>
    </div>
    ${sayReason ? `<div class="wm-reason reveal">${esc(reason)}</div>` : ''}`;
  // §D6. The plain sentence first, then the standard. A new player's second
  // paragraph used to be the name of a browser protocol — which describes the
  // engineering and not the thing that happens to them. What happens to them is
  // one sentence, and the standard's name is the line under it, where somebody
  // who wants to know how goes looking.
  if (brief) {
    return `<section class="title-webmcp brief reveal" aria-label="Playing with your assistant">
      <p class="wm-plain reveal">${PLAIN}</p>
      <div class="wm-kicker reveal"><span class="wm-mark">◈</span> The first game built on WebMCP</div>
      ${status}
      ${cta}
    </section>`;
  }
  return `<section class="title-webmcp reveal" aria-label="Playing with your assistant">
    <p class="wm-plain reveal">${PLAIN}</p>
    <div class="wm-kicker reveal"><span class="wm-mark">◈</span> The first game built on WebMCP</div>
    <p class="wm-lead reveal">It shapes the opposition, the gameplay and the story: it writes the cards, speaks for the cast, moves the rival and turns the market — and you can take any of it away.</p>
    <p class="wm-lead dim reveal">It plays in full on its own. For the version with an opponent, use a WebMCP-capable browser: <b>${esc(PLATFORM.browser)}</b> or <b>${esc(PLATFORM.app)}</b> on ${esc(PLATFORM.presets)}.</p>
    ${status}
    <div class="wm-hand reveal">
      <div class="wm-label">The world's opening hand · ${hand.tools.length} tools, registered the moment the run begins</div>
      <div class="wm-tools">${chips}</div>
      <div class="wm-label wm-label-later">Authority unlocked by play</div>
      <div class="wm-laters">${later}</div>
    </div>
    ${cta}
  </section>`;
}

// ── Cold open ───────────────────────────────────────────────────────────────
const COLD_OPEN = [
  '4:06 AM.',
  'The apartment is quiet in the way that only 4am is quiet.',
  'You have twelve thousand dollars, a laptop that runs hot, and an idea you have not told anyone about — because saying it out loud makes it sound small.',
  'On the screen: an empty repository. A cursor. And in the second pane, an agent, idling, waiting for an instruction.',
  'Six years ago this would have taken a team of eleven.',
];

export async function showTitle({ cold = null } = {}) {
  const L = legacy();
  const firstEver = (L.runs || 0) === 0 && !hasSave();
  const doCold = cold === null ? firstEver : cold;

  const tiles = decor('accounts');
  app().className = '';
  app().innerHTML = `
  <div class="stage" id="stage">
    ${doCold ? decor('post') : ''}
    <div class="stage-inner">
      <div class="cold" id="cold"></div>
      <div class="title-block" id="title-block">
        <div class="title-kicker">A solo-founder simulation</div>
        <div class="title-word">SINGULARITY,<br/>INC.</div>
        <!-- The break is deliberate. Left to wrap, the second question splits
             mid-clause at 760px — "solopreneur? Or just a / person with a
             laptop" — and the two questions stop reading as a pair. With it,
             each one wraps inside itself at every width. -->
        <div class="title-sub">Vibe coder. Agentic Engineer. The world's first trillionaire solopreneur?<br/>
          Or just a person with a laptop in an age of unlimited leverage?</div>
        <div class="title-sub dim2">When machines can do anything you describe, how far does that go?</div>
        ${tiles}
        ${webmcpPanel({ brief: hasSave() || (L.runs || 0) > 0 || assistantMode() === 'none' })}
        <div class="title-actions" id="title-actions">
          ${tiles ? '' : `${hasSave() ? `<button class="btn btn-primary btn-lg reveal" data-act="continue-game">Continue</button>` : ''}
          <button class="btn ${hasSave() ? 'btn-ghost' : 'btn-primary'} btn-lg reveal" data-act="new-game">
            ${hasSave() ? 'New timeline' : beginLabel()}</button>`}
          <button class="btn btn-ghost btn-lg reveal" data-act="import-save-file">Import save file</button>
        </div>
        ${L.runs > 0 ? `<div class="title-legacy reveal">
          <span>${L.runs} timeline${L.runs === 1 ? '' : 's'}</span>
          <span>${L.points || 0} legacy points</span>
          <span>best ${money(L.bestValuation || 0)}</span>
        </div>` : ''}
        <div class="title-foot reveal">Everything is simulated locally and saved in your browser.<br/>
          Space pauses. Q · W · E · R are your hands.</div>
      </div>
      ${doCold ? '<div class="skip-hint" id="skip-hint">click to skip</div>' : ''}
    </div>
  </div>`;

  // The title block can outgrow a short window once the accounts tiles and the
  // WebMCP panel are both in play. The observer inside picks up the cold open
  // handing over to the block, so this is safe to arm before either happens.
  stageCue();

  const block = document.getElementById('title-block');
  if (doCold) {
    block.classList.add('hidden-until');
    await revealLines(document.getElementById('cold'), COLD_OPEN, { mode: 'fade', gap: 1500 });
    await wait(900);
    document.getElementById('cold')?.classList.add('fading');
    document.getElementById('skip-hint')?.remove();
    await wait(700);
    document.getElementById('cold')?.remove();
    document.getElementById('post-line')?.remove();
    block.classList.remove('hidden-until');
  }
  block.classList.add('in');
  await stagger(block.querySelectorAll('.reveal'), { gap: 130, delay: 520 });
}

// ── The beats ───────────────────────────────────────────────────────────────
const ALL_BEATS = ['who', 'founder', 'building', 'threshold'];
let beat = 0;
let advanced = false;

// One open archetype is not a question. On a first run the founder beat asked
// it anyway — one card, one button, a strip of things you cannot have — so the
// beat is skipped when there is nothing to choose, and the locked strip moves
// to the threshold, where it reads as what the next run is for.
function openArchetypes() {
  const un = legacy().unlockedArchetypes || ['hacker'];
  return ARCHETYPES.filter((a) => !a.unlockedBy || un.includes(a.id));
}
function lockedArchetypes() {
  const un = legacy().unlockedArchetypes || ['hacker'];
  return ARCHETYPES.filter((a) => a.unlockedBy && !un.includes(a.id));
}
function beats() {
  return openArchetypes().length === 1 ? ALL_BEATS.filter((b) => b !== 'founder') : ALL_BEATS;
}

export function showIntro(startAt = 0) {
  const open = openArchetypes();
  if (open.length === 1) draft.archetype = open[0].id;
  beat = Math.max(0, Math.min(beats().length - 1, startAt));
  renderBeat();
}

export function introBeat() { return beats()[beat]; }

export async function nextBeat() {
  if (beat >= beats().length - 1) return;
  await leave();
  beat++;
  renderBeat();
}
export async function prevBeat() {
  if (beat === 0) { showTitle({ cold: false }); return; }
  await leave();
  beat--;
  renderBeat();
}

function leave() {
  document.querySelector('.stage-cue')?.classList?.remove('on');
  const el = document.querySelector('.beat');
  if (!el) return Promise.resolve();
  el.classList.add('leaving');
  return wait(240);
}

// ─────────────────────────────────────────────────────────────────────────────
// THE STAGE CAN BE TALLER THAN THE SCREEN.
// Eight category cards do not fit a 900px laptop: two of them sit below the
// fold, and a beat that silently hides a quarter of its choices is a beat that
// quietly changes the game. The stage has always scrolled; nothing ever said
// so. This says so — a veil and a chevron pinned to the bottom of #app, which
// is *outside* the scroller on purpose, because a cue positioned inside the
// thing it is describing scrolls away exactly when you need it. It shows only
// when there is something below and dissolves the moment you reach it.
// ─────────────────────────────────────────────────────────────────────────────
let cueOff = null;

export function stageCue() {
  try { cueOff?.(); } catch { /* the old stage is already gone */ }
  cueOff = null;
  const host = app();
  const stage = host?.querySelector?.('.stage');
  // Headless (`tools/uitest.mjs`) has no layout and no real elements. There is
  // nothing to measure and nothing to point at, so there is nothing to do.
  if (!stage || typeof stage.scrollTo !== 'function' || !document.createElement) return;

  const cue = document.createElement('div');
  cue.className = 'stage-cue';
  cue.innerHTML = '<button class="stage-cue-btn" type="button" tabindex="-1" aria-label="Scroll down for more">\u25be</button>';
  host.appendChild(cue);

  const sync = () => {
    // The opening's last screen hands #app to the game, which takes the cue
    // with it — but not these listeners. Anything that fires after that is
    // measuring a stage nobody can see.
    if (!stage.isConnected) { endStageCue(); return; }
    const over = stage.scrollHeight - stage.clientHeight;
    cue.classList.toggle('on', over > 8);
    cue.classList.toggle('at-end', stage.scrollTop >= over - 8);
  };

  const down = () => stage.scrollTo({ top: stage.scrollHeight, behavior: 'smooth' });
  cue.querySelector('.stage-cue-btn')?.addEventListener('click', down);
  stage.addEventListener('scroll', sync, { passive: true });
  window.addEventListener('resize', sync);
  // The plate grows while the reveals land and again when the webfont swaps in,
  // so one measurement at mount is a measurement of the wrong page.
  let ro = null;
  try {
    ro = new ResizeObserver(sync);
    ro.observe(stage);
    if (stage.firstElementChild) ro.observe(stage.firstElementChild);
  } catch { /* no ResizeObserver: the scroll and resize listeners still hold */ }

  cueOff = () => {
    try { ro?.disconnect(); } catch { /* already torn down */ }
    stage.removeEventListener('scroll', sync);
    window.removeEventListener('resize', sync);
    cue.remove();
  };
  sync();
}

export function endStageCue() {
  try { cueOff?.(); } catch { /* the stage is already gone */ }
  cueOff = null;
}

function chrome(id) {
  const list = beats();
  const index = Math.max(0, list.indexOf(id));
  return `<div class="beat-chrome">
    <button class="beat-back" data-act="beat-back" title="Back">←</button>
    <div class="beat-dots">
      ${list.map((_, i) => `<span class="beat-dot ${i === index ? 'on' : ''} ${i < index ? 'done' : ''}"></span>`).join('')}
    </div>
    <div class="beat-count">${index + 1} / ${list.length}</div>
  </div>`;
}

async function renderBeat() {
  const id = beats()[beat];
  const fn = id === 'who' ? beatWho : id === 'founder' ? beatFounder
    : id === 'building' ? beatBuilding : beatThreshold;
  // Each beat writes its innerHTML before its first `await`, so the stage is on
  // the page the moment the call returns its promise — measure it now rather
  // than after every reveal has finished landing.
  const done = fn();
  stageCue();
  return done;
}

// ── 1. Who ──────────────────────────────────────────────────────────────────
async function beatWho() {
  app().innerHTML = `
  <div class="stage"><div class="beat narrow" id="beat">
    ${chrome('who')}
    <div class="beat-body narrow">
      <div class="beat-q" id="q"></div>
      <div class="beat-fields reveal">
        <label class="line-field">
          <span class="line-label">Your name</span>
          <input class="line-input" id="in-founder" value="${esc(draft.founderName)}"
            maxlength="28" autocomplete="off" spellcheck="false" />
        </label>
        <label class="line-field">
          <span class="line-label">The company</span>
          <span class="line-with-btn">
            <input class="line-input" id="in-company" value="${esc(draft.companyName)}"
              maxlength="28" autocomplete="off" spellcheck="false" />
            <button class="roll-btn" data-act="reroll-name" title="Roll new names">⟳</button>
          </span>
        </label>
      </div>
      <div class="beat-note reveal">Nobody has heard either of these yet.</div>
      <button class="btn btn-primary btn-lg beat-next reveal" data-act="beat-next">Continue</button>
    </div>
  </div></div>`;

  const f = document.getElementById('in-founder');
  const c = document.getElementById('in-company');
  f?.addEventListener('input', () => { draft.founderName = f.value; });
  c?.addEventListener('input', () => { draft.companyName = c.value; });
  for (const el of [f, c]) {
    el?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); nextBeat(); } });
  }

  await typeInto(document.getElementById('q'), 'First — who is doing this?', { cps: 38 });
  await stagger(document.querySelectorAll('#beat .reveal'), { gap: 150, delay: 120 });
  f?.focus();
  f?.select();
}

// ── 2. Founder ──────────────────────────────────────────────────────────────
async function beatFounder() {
  const open = openArchetypes();
  const shut = lockedArchetypes();
  const single = open.length === 1;

  app().innerHTML = `
  <div class="stage"><div class="beat ${single ? 'narrow' : ''}" id="beat">
    ${chrome('founder')}
    <div class="beat-body ${single ? 'narrow' : ''}">
      <div class="beat-q" id="q"></div>
      <div class="beat-sub reveal">${single
        ? 'Everyone starts here. The others are earned.'
        : 'This is not a difficulty setting. It is a different game.'}</div>
      <div class="choice-grid ${single ? 'single' : ''}">
        ${open.map((a) => `
          <button class="choice-card reveal" style="--cc:${ARCH_COLOR[a.id]}"
            data-act="choose-arch" data-v="${a.id}">
            <span class="cc-icon" style="color:${ARCH_COLOR[a.id]}">${a.icon}</span>
            <span class="cc-name">${esc(a.name)}</span>
            <span class="cc-tag">${esc(a.tagline)}</span>
            <span class="cc-desc">${esc(a.desc)}</span>
            ${a.perk ? `<span class="cc-perk">${esc(a.perk)}</span>` : ''}
            <span class="cc-stats">${archStats(a)}</span>
          </button>`).join('')}
      </div>
      ${lockedStrip(shut, single ? 'Waiting for you' : 'Still locked')}
    </div>
  </div></div>`;
  await typeInto(document.getElementById('q'),
    single ? 'You are a builder.' : 'What kind of founder are you?', { cps: 38 });
  await stagger(document.querySelectorAll('#beat .reveal'), { gap: 70, delay: 100 });
}

// The archetypes a run has not earned yet, with what earns each.
function lockedStrip(shut, label) {
  if (!shut.length) return '';
  return `<div class="locked-strip reveal">
    <div class="locked-label">${esc(label)}</div>
    <div class="locked-row">
      ${shut.map((a) => `<span class="locked-chip"
        data-tip="${esc(a.desc)}<br><br><b>Unlocks:</b> ${esc(unlockHint(a))}" data-tip-title="${esc(a.name)} — locked">
        <span style="color:${ARCH_COLOR[a.id]};opacity:.55">${a.icon}</span> ${esc(a.name)}</span>`).join('')}
    </div>
  </div>`;
}

const UNLOCK_HINT = {
  designer: 'reach 0.9 product polish in any run',
  hustler: 'reach $1M ARR',
  researcher: 'train your own foundation model',
  operator: 'reach $1M ARR without ever raising',
  prophet: 'reach Act V',
  ghost: 'reach a $1B valuation with under 200 reputation',
};
function unlockHint(a) { return UNLOCK_HINT[a.id] || 'keep playing'; }

// ── 3. Building ─────────────────────────────────────────────────────────────
async function beatBuilding() {
  app().innerHTML = `
  <div class="stage"><div class="beat" id="beat">
    ${chrome('building')}
    <div class="beat-body">
      <div class="beat-q" id="q"></div>
      <div class="beat-sub reveal">Every category is a different economy. Choose the one you want to live in.</div>
      <div class="choice-grid">
        ${CATEGORIES.map((c) => `
          <button class="choice-card reveal" style="--cc:${c.color}" data-act="choose-cat" data-v="${c.id}">
            <span class="cc-icon" style="color:${c.color}">${c.icon}</span>
            <span class="cc-name">${esc(c.name)}</span>
            <span class="cc-tag">${esc(c.tagline)}</span>
            <span class="cc-desc">${esc(c.desc)}</span>
            <span class="cc-stats">${catStats(c)}</span>
          </button>`).join('')}
      </div>
    </div>
  </div></div>`;
  await typeInto(document.getElementById('q'), 'What are you going to build?', { cps: 38 });
  await stagger(document.querySelectorAll('#beat .reveal'), { gap: 65, delay: 100 });
}

// ── 4. Threshold ────────────────────────────────────────────────────────────
async function beatThreshold() {
  const a = ARCHETYPES.find((x) => x.id === draft.archetype) || ARCHETYPES[0];
  const c = CATEGORIES.find((x) => x.id === draft.category) || CATEGORIES[0];
  const L = legacy();
  const showAdv = (L.runs || 0) > 0;
  const diff = DIFFICULTIES.find((d) => d.id === draft.difficulty) || DIFFICULTIES[1];
  const scen = SCENARIOS.find((s) => s.id === draft.scenario) || SCENARIOS[0];

  // The card names the two choices and, under each, what the choice does to
  // the run — the same chips the beats showed — so "None of this can be
  // changed later" stands over something rather than beside two nouns.
  const archMods = archStats(a);
  const single = openArchetypes().length === 1;
  app().innerHTML = `
  <div class="stage"><div class="beat narrow threshold-beat" id="beat">
    ${chrome('threshold')}
    <div class="beat-body narrow">
      <div class="threshold-lines" id="lines"></div>
      <div class="threshold-card reveal">
        <span class="tc-row"><span class="tc-icon" style="color:${ARCH_COLOR[a.id]}">${a.icon}</span>
          <span><b>${esc(draft.founderName || 'You')}</b> — ${esc(a.name)}</span></span>
        ${archMods ? `<span class="tc-mods">${archMods}</span>` : ''}
        <span class="tc-row"><span class="tc-icon" style="color:${c.color}">${c.icon}</span>
          <span><b>${esc(draft.companyName || 'Untitled')}</b> — ${esc(c.name)}</span></span>
        <span class="tc-mods">${catStats(c)}</span>
        ${showAdv ? `<span class="tc-row"><span class="tc-icon" style="color:${diff.color}">${diff.icon}</span>
          <span>${esc(diff.name)}${scen.id !== 'none' ? ` · ${esc(scen.name)}` : ''}</span></span>` : ''}
      </div>
      ${single ? lockedStrip(lockedArchetypes(), 'Waiting for you — six more founders, each earned by a run') : ''}
      ${showAdv ? `<button class="adv-toggle reveal" data-act="toggle-adv">${advanced ? 'Hide' : 'Adjust'} the run conditions</button>` : ''}
      ${showAdv && advanced ? advancedPanel(L) : ''}
      ${letterPick()}
      ${assistantPick()}
      ${startPick()}
      <button class="btn btn-primary btn-lg beat-next reveal" data-act="start-game">${openLabel()}</button>
      <div class="beat-note reveal">None of this can be changed later${assistantMode() === 'none' ? '' : ' — except the assistant, which the World console can mute or hand back'}.</div>
      ${assistantMode() === 'none' ? `<button class="assistant-line reveal" data-act="assistant-link">
        <span class="al-mark">◈</span>
        <span>Play with your assistant — it writes the world against you</span>
      </button>` : ''}
    </div>
  </div></div>`;

  await revealLines(document.getElementById('lines'), [
    'That is everything the world knows.',
    'It is 4am and nobody is waiting on you.',
  ], { mode: 'fade', gap: 900 });
  document.getElementById('in-letter')
    ?.addEventListener('input', (e) => { draft.letterToSelf = e.target.value; });
  await stagger(document.querySelectorAll('#beat .reveal'), { gap: 120, delay: 80 });
}

function advancedPanel(L) {
  return `<div class="adv-panel reveal">
    <div class="adv-label">How hard</div>
    <div class="adv-row">
      ${DIFFICULTIES.map((d) => {
        const ok = !d.req || L[d.req];
        return `<button class="adv-chip ${draft.difficulty === d.id ? 'on' : ''} ${ok ? '' : 'locked'}"
          style="--ac:${d.color}" ${ok ? `data-act="pick-diff" data-v="${d.id}"` : 'disabled'}
          data-tip="${esc(d.desc)}" data-tip-title="${esc(d.name)}">
          ${ok ? d.icon : '🔒'} ${esc(d.name)} <span class="adv-mult">×${d.legacyMult.toFixed(1)}</span></button>`;
      }).join('')}
    </div>
    <div class="adv-label">Opening conditions</div>
    <div class="adv-row">
      ${SCENARIOS.map((s) => `<button class="adv-chip ${draft.scenario === s.id ? 'on' : ''}"
        style="--ac:${s.color}" data-act="pick-scen" data-v="${s.id}"
        data-tip="${esc(s.desc)}" data-tip-title="${esc(s.name)}">
        ${s.icon} ${esc(s.name)}${s.legacyMult !== 1 ? ` <span class="adv-mult">×${s.legacyMult.toFixed(2)}</span>` : ''}</button>`).join('')}
    </div>
    <div class="adv-label">How the days pass</div>
    <div class="adv-row">
      <button class="adv-chip ${draft.pace !== 'long' ? 'on' : ''}" style="--ac:#4dd0e1" data-act="pick-pace" data-v="sitting"
        data-tip="The clock runs while you play, at one to five times. A full run is an evening or two." data-tip-title="One sitting">◷ One sitting</button>
      <button class="adv-chip ${draft.pace === 'long' ? 'on' : ''}" style="--ac:#f5a623" data-act="pick-pace" data-v="long"
        data-tip="A month of the company for every real day you are away. The clock holds after a month of live play, the inbox fills while you are gone, and a run lives in your week rather than your evening." data-tip-title="The long game">☾ The long game</button>
    </div>
    <div class="adv-note">${runLengthLine()}</div>
    ${ngRow(L)}
    <div class="adv-note">Harder conditions pay more Legacy points when the run ends.</div>
  </div>`;
}

// ── §D7. How long a run is ──────────────────────────────────────────────────
// Nothing on the opening screen has ever said whether this is twenty minutes or
// twenty hours, which is the first thing anybody wants to know and the one
// question the interface refused to answer. It is *derived*: the four act
// floors plus the window Act V leaves open are the shortest and longest a full
// timeline can be, and `TIME.DAY_SECONDS` and `TIME.SPEEDS` turn those into
// clock time. A number in prose should be read, not typed.
export function runLengthDays() {
  const toActV = ACT_GATES.ACT2_MIN_DAYS + ACT_GATES.ACT3_MIN_DAYS + ACT_GATES.ACT4_MIN_DAYS + ACT_GATES.ACT5_MIN_DAYS;
  return [toActV + ENDINGS_FORCED.ACT5_WINDOW_MIN, toActV + ENDINGS_FORCED.ACT5_WINDOW];
}

function clockSpan(days, speed) {
  const h = (days * TIME.DAY_SECONDS) / speed / 3600;
  if (h >= 1.6) return `${h.toFixed(1)} hours`;
  if (h >= 0.95) return 'about an hour';
  return `${Math.round(h * 60)} minutes`;
}

function runLengthLine() {
  const [lo, hi] = runLengthDays();
  const top = TIME.SPEEDS[TIME.SPEEDS.length - 1];
  return `A full timeline is ${fmt(lo)}–${fmt(hi)} in-game days — ${clockSpan(hi, 1)} of clock at 1×, `
    + `${clockSpan(lo, top)} at ${top}×. How long you take over the decisions is the rest of it.`;
}

// ── New Game+ ───────────────────────────────────────────────────────────────
// From the third run on. These are not difficulty: each one changes the shape
// of the world you are walking into, and the third reads the last timeline's
// ending out of the dossier — so what "inverted" means is different depending
// on how the run before this one finished.
function ngRow(L) {
  if ((L.runs || 0) < NGPLUS.MIN_RUNS) return '';
  const last = (L.dossier || [])[(L.dossier || []).length - 1];
  const invertLine = last?.ending === 'refusal'
    ? 'You stopped last time. This world\'s labs are slower for it.'
    : last?.ending === 'sovereign'
      ? 'You became a dependency last time. Senator Dorne opens hostile.'
      : last
        ? `Nothing in ${esc(last.endingName)} inverts yet — the toggle is stored and the world reads it where it can.`
        : 'Nothing to invert: there is no finished timeline behind this one.';
  const chip = (key, on, colour, icon, name, tip, tipTitle, mult) => `<button
    class="adv-chip ${on ? 'on' : ''}" style="--ac:${colour}" data-act="pick-ng" data-v="${key}"
    data-tip="${esc(tip)}" data-tip-title="${esc(tipTitle)}">${icon} ${esc(name)}
    <span class="adv-mult">×${mult.toFixed(2)}</span></button>`;
  return `<div class="adv-label">New Game+</div>
    <div class="adv-row">
      ${chip('ngWorld', draft.ngWorld, '#8b5cf6', '∞', 'The world remembers',
        'The cast, the rival labs and the opening conditions read the timelines behind this one.',
        'The world remembers', NGPLUS.LEGACY_WORLD)}
      ${chip('ngRival', draft.ngRival, '#ff4d5e', '⚔', 'A harder rival',
        `Aperture Systems opens with ${NGPLUS.RIVAL_FUNDING.toFixed(1)}× the money, from the first morning.`,
        'A harder rival', NGPLUS.LEGACY_RIVAL)}
      ${chip('ngInvert', draft.ngInvert, '#4dd0e1', '⇄', 'An inverted timeline',
        invertLine, 'An inverted timeline', NGPLUS.LEGACY_INVERT)}
    </div>`;
}

function archStats(a) {
  const out = [];
  for (const [k, v] of Object.entries(a.mods || {})) {
    if (k.startsWith('+')) { out.push(`<span class="cc-stat">${k.slice(1)} +${v}</span>`); continue; }
    // `luck` is a share, not a multiplier: 0.6 lifts opportunity and milestone
    // draws by 60% and cuts crisis draws by half that. See drawEvent.
    if (k === 'luck') { out.push(`<span class="cc-stat up">good cards +${Math.round(v * 100)}%</span>`); continue; }
    const p = Math.round((v - 1) * 100);
    if (!p) continue;
    out.push(`<span class="cc-stat ${p > 0 ? 'up' : 'down'}">${label(k)} ${p > 0 ? '+' : ''}${p}%</span>`);
  }
  return out.join('');
}
// A category's economy in five chips, on its card and again at the threshold.
function catStats(c) {
  return `<span class="cc-stat">market ${fmt(c.tam)}</span>
    <span class="cc-stat">viral ${c.baseViral.toFixed(2)}</span>
    <span class="cc-stat">churn ${(c.baseChurn * 100).toFixed(1)}%</span>
    <span class="cc-stat">${money(c.basePrice)}/mo</span>
    ${c.regRisk > 0.6 ? '<span class="cc-stat warn">scrutiny</span>' : ''}
    ${c.coldStart ? '<span class="cc-stat warn">cold start</span>' : ''}`;
}
const LABELS = { codeRate: 'code', debtRate: 'debt', repRate: 'reputation', conversion: 'conversion',
  churn: 'churn', mrrMult: 'revenue', arpu: 'arpu', researchRate: 'research', agentOutput: 'agents',
  opCost: 'costs', valuationMult: 'valuation', competitorGrowth: 'rivals', rivalHeat: 'rival heat',
  raiseValuation: 'round offers', incidentChance: 'incidents', heatRate: 'heat' };
function label(k) { return LABELS[k] || k; }

// ── Selection helpers ───────────────────────────────────────────────────────
export async function chooseArchetype(id, el) {
  draft.archetype = id;
  await commitCard(el);
  nextBeat();
}
export async function chooseCategory(id, el) {
  draft.category = id;
  await commitCard(el);
  nextBeat();
}
async function commitCard(el) {
  if (!el) return;
  el.parentElement?.querySelectorAll('.choice-card').forEach((n) => {
    if (n !== el) n.classList.add('dimmed');
  });
  el.classList.add('chosen');
  await wait(320);
}

export function toggleAdvanced() { advanced = !advanced; renderBeat(); }
export function rerollNames() {
  draft.founderName = personName();
  draft.companyName = companyName();
  const f = document.getElementById('in-founder');
  const c = document.getElementById('in-company');
  if (f) f.value = draft.founderName;
  if (c) c.value = draft.companyName;
}

export function getConfig() {
  return {
    founderName: draft.founderName?.trim() || 'Alex Rivera',
    companyName: draft.companyName?.trim() || 'Untitled',
    handle: handleFor(draft.founderName || 'alex'),
    archetype: draft.archetype,
    category: draft.category,
    difficulty: draft.difficulty,
    scenario: draft.scenario,
    productName: draft.companyName?.trim() || 'Untitled',
    tagline: pick(TAGLINES),
    // 'none' where there was nothing to decide; the game ignores it.
    assistant: assistantMode() === 'none' ? 'none' : (draft.assistant === 'mute' ? 'mute' : 'play'),
    start: draft.start === 'act3' ? 'act3' : 'day0',
    pace: draft.pace === 'long' ? 'long' : 'sitting',
    // Plain text, one line: it is posted back through `md()`, which escapes,
    // and a newline in the middle of a quoted block reads as two letters.
    letterToSelf: String(draft.letterToSelf || '').replace(/\s+/g, ' ').trim().slice(0, 240),
    ngWorld: !!draft.ngWorld, ngRival: !!draft.ngRival, ngInvert: !!draft.ngInvert,
  };
}

export function setDraft(k, v) { draft[k] = v; if (beats()[beat] === 'threshold') renderBeat(); }

// ── The curtain ─────────────────────────────────────────────────────────────
// A held beat between choosing and playing, so the game does not simply appear.
export async function curtain(lines, { hold = 900 } = {}) {
  endStageCue();                       // the opening is over; so is its cue
  const el = document.createElement('div');
  el.className = 'curtain';
  el.innerHTML = '<div class="curtain-lines" id="curtain-lines"></div>';
  document.body.appendChild(el);
  await wait(60);
  el.classList.add('in');
  await revealLines(document.getElementById('curtain-lines'), lines, { mode: 'fade', gap: 1150 });
  await wait(hold);
  el.classList.add('out');
  await wait(760);
  el.remove();
}
export { skipActive, isPlaying, wait };
