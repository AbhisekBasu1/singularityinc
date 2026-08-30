// ─────────────────────────────────────────────────────────────────────────────
// MAIN — bootstrap, input wiring, render loop.
// ─────────────────────────────────────────────────────────────────────────────
import { S, activeProduct } from './engine/state.js';
import { on } from './engine/bus.js';
import { fmt, money } from './engine/format.js';
import * as Game from './game.js';
import * as Loop from './engine/loop.js';
import * as Save from './engine/save.js';
import { onAction, onKey, onSlider, isDragging, esc, md, tipOpen } from './ui/dom.js';
import { toast, floatFromEvent, shake } from './ui/toast.js';
import * as Modal from './ui/modal.js';
import * as Shell from './ui/shell.js';
import * as Intro from './ui/intro.js';
import * as Tutorial from './ui/tutorial.js';
import { showHelp } from './ui/manual.js';
import { showSettings } from './ui/settings.js';
import * as Dialogs from './ui/dialogs.js';
import * as Nemesis from './systems/nemesis.js';
import { showEnding as showEndingScreen } from './ui/ending.js';
import { startBackground, setBackgroundEnabled } from './ui/background.js';
import * as MCP from './webmcp/index.js';
import * as World from './world/author.js';
import * as WorldConsole from './ui/author.js';
import * as AssistantHandoff from './ui/assistant-handoff.js';
import { screenTools } from './webmcp/tools.js';
import * as Demo from './webmcp/demo.js';
import * as Autoplay from './systems/autoplay.js';
import { play as sfx, setEnabled as setAudio, initAudio, setVolume, setAmbient } from './ui/audio.js';

import * as DeskView from './ui/views/desk.js';
import * as ProductView from './ui/views/product.js';
import * as AgentsView from './ui/views/agents.js';
import * as ResearchView from './ui/views/research.js';
import * as MarketView from './ui/views/market.js';
import * as WorldView from './ui/views/world.js';
import * as StoryView from './ui/views/story.js';
import * as LegacyView from './ui/views/legacy.js';

import { actionWriteCode, actionPromptAI, actionTalkToUsers, actionPost, setAllocation,
         spendSkillPoint, setApproach } from './systems/founder.js';
import { setPrice, setPricing, featureCost } from './systems/product.js';
import { fireAgent, assignLane, upgradeModel } from './systems/agents.js';
import { startResearch } from './systems/research.js';
import { acquireCompetitor } from './systems/market.js';
import { resolveThread } from './systems/feed.js';
import { startProject } from './systems/projects.js';
import { engage as engageRegion, courtRegion } from './systems/regions.js';
import { commit as doCommit } from './systems/commitments.js';
import { resolveChoice, dismissEvent, repairEventHistory } from './systems/narrative.js';
import { markDirty } from './systems/modifiers.js';
import { LEGACY_MAP } from './data/legacy.js';
import { DIRECTIVE_MAP, directiveStrength } from './data/directives.js';
import { MODELS } from './data/agents.js';
import { CODE_SINK_MAP } from './data/codesinks.js';
import { KIND_TEXT } from './data/approaches.js';
import { ENDINGS, triggerEnding } from './systems/progression.js';
import { PROJECT_MAP } from './data/projects.js';
import { PLATFORM } from './data/platform.js';

Shell.registerViews({
  desk: DeskView, product: ProductView, agents: AgentsView, research: ResearchView,
  market: MarketView, world: WorldView, story: StoryView, legacy: LegacyView,
});

let inGame = false;

// ═══ BOOT ═══════════════════════════════════════════════════════════════════
startBackground();

// ═══ ACTIONS ════════════════════════════════════════════════════════════════
onAction('new-game', () => { sfx('choose'); Intro.showIntro(0); });
onAction('back-title', () => Intro.showTitle({ cold: false }));
onAction('reroll-name', () => { sfx('click'); Intro.rerollNames(); });
onAction('beat-next', () => { sfx('choose'); Intro.nextBeat(); });
onAction('beat-back', () => { sfx('click'); Intro.prevBeat(); });
onAction('choose-arch', (d, el) => { sfx('choose'); Intro.chooseArchetype(d.v, el); });
onAction('choose-cat', (d, el) => { sfx('choose'); Intro.chooseCategory(d.v, el); });
onAction('toggle-adv', () => { sfx('click'); Intro.toggleAdvanced(); });
onAction('pick-diff', (d) => { sfx('click'); Intro.setDraft('difficulty', d.v); });
onAction('pick-scen', (d) => { sfx('click'); Intro.setDraft('scenario', d.v); });
onAction('pick-assistant', (d) => { sfx('click'); Intro.setDraft('assistant', d.v); });
onAction('pick-start', (d) => { sfx('click'); Intro.setDraft('start', d.v); });

onAction('start-game', async () => {
  const cfg = Intro.getConfig();
  sfx('act');
  const late = cfg.start === 'act3';
  const lines = [`<span class="curtain-mono">${esc(cfg.companyName)}</span>`];
  if (late) lines.push('The first year is already written.', 'You walk in at Act III.');
  else lines.push('The repository is empty.', 'Nobody is waiting on you.');
  if (cfg.assistant === 'play') lines.push('Your assistant is at the table.');
  const curtain = Intro.curtain(lines);
  await Intro.wait(1500);
  if (!late) Game.startNewGame(cfg);
  // The late start: the machine plays the garage and the machine while the
  // curtain is up, and the founder walks in with the world's whole hand dealt.
  const ff = late ? Autoplay.lateStart(() => Game.startNewGame(cfg)) : null;
  enterGame();
  await curtain;
  nudge.entry = true;
  nudgeWorld();
  if (ff) {
    toast({ icon: '★', title: `Act ${ff.act}, day ${ff.day}.`, kind: 'good', ms: 9000,
      sub: 'The first year was played for you; the Log has all of it.' });
  } else toast({ icon: '⌘', title: 'Write something.', sub: 'Q writes code. W prompts the machine.', kind: 'good', ms: 7000 });
});

onAction('continue-game', () => {
  const s = Game.continueGame();
  if (!s) { toast({ icon: '⚠', title: 'No save found.' }); Intro.showIntro(0); return; }
  enterGame();
  nudge.entry = true;
  nudgeWorld();
});

// The AI choice ends in a real handoff, not a disappearing notification. It
// waits for three independent things: the editor curtain, the tool surface,
// and First Light. Whichever finishes last opens the final onboarding beat.
let nudge = { boot: false, tutorial: false, entry: false, done: false };
function nudgeWorld() {
  if (nudge.done || !nudge.boot || !nudge.tutorial || !nudge.entry || !inGame || Tutorial.isActive()) return;
  if (Modal.isModalOpen() || S.narrative.activeEvent) return;
  if (!AssistantHandoff.shouldOffer()) { nudge.done = true; return; }
  if (AssistantHandoff.openHandoff()) nudge.done = true;
}

function assistantHandoffPending() {
  return S?.meta?.assistantChoice === 'play'
    && !S.meta.assistantHandoffDone
    && !S.world?.author?.muted;
}

function enterGame() {
  inGame = true;
  // Older own-words saves could journal a once-only card without marking it
  // seen, so the deck immediately dealt the same card again. Repair that proof
  // before deciding whether an open card should be restored to the screen.
  const repairedNarrative = repairEventHistory(S);
  if (repairedNarrative.changed) Save.save(S);
  nudge = { boot: false, tutorial: false, entry: false, done: false };
  AssistantHandoff.reset();
  // A restored save can return between First Light and the assistant handoff.
  // Keep it on the same frozen beat instead of letting the deck take a card
  // during the two seconds in which the shell and tool surface boot.
  if (assistantHandoffPending()) S.tutorialHold = true;
  // A card that was open when the game was saved holds the clock — `loop.js`
  // will not advance while `activeEvent` is set — and nothing was putting it
  // back on screen. Continuing a run that was saved mid-card left the game
  // frozen with no way to answer it.
  redrawOpenCard = true;
  document.getElementById('app')?.classList.add('booting');
  setAudio(S.settings.sound !== false);
  setVolume(S.settings.volume ?? 0.55);
  document.documentElement.classList.toggle('reduced-motion', !!S.settings.reducedMotion);
  document.documentElement.classList.toggle('high-contrast', !!S.settings.highContrast);
  setBackgroundEnabled(S.settings.particles !== false);
  if (S.settings.sound !== false && S.settings.ambient !== false) {
    // The audio context can only start after a gesture; retry on the first one.
    const kick = () => { initAudio(); setAmbient(true, () => S?.company.act || 1); document.removeEventListener('pointerdown', kick); };
    document.addEventListener('pointerdown', kick);
    kick();
  }
  Shell.buildShell();
  Loop.start();
  Tutorial.registerShell({
    setView: Shell.setView,
    getView: Shell.getView,
    onEnd: () => { Shell.paintMain(); Shell.paintTopbar(); Shell.paintNav(); Shell.paintStatus(); nudge.tutorial = true; nudgeWorld(); },
  });
  // The first lesson waits for the power-on to finish so it is not competing
  // with the staggered animations for attention.
  if (Q.has('notut')) Tutorial.setDisabled(true);   // dev harness: clean screenshots
  setTimeout(() => {
    if (!inGame) return;
    // startNewGame parks the clock on a first run so this cannot lose a race to
    // the opening story card. Whether the walkthrough runs or not, the hold has
    // to be released here or the game never starts.
    const started = !Modal.isModalOpen() && !S.narrative.activeEvent && Tutorial.maybeAutoStart();
    // If an assistant handoff is still owed, its modal will atomically replace
    // this hold with `modalBlocking`. Releasing here creates a small race in
    // which the opening deck card can land behind the curtain first.
    if (!started && S.tutorialHold && !Tutorial.isActive() && !assistantHandoffPending()) {
      S.tutorialHold = false;
    }
    if (!started) { nudge.tutorial = true; nudgeWorld(); }
  }, 1900);
  bootWorld();
  if (redrawOpenCard && S.narrative.activeEvent && !S.narrative.activeEvent.outcome) {
    setTimeout(() => {
      if (inGame && S.narrative.activeEvent && !Modal.isModalOpen()) {
        Modal.showEvent(S.narrative.activeEvent);
      }
    }, 400);
  }
  redrawOpenCard = false;
  window.S = S; // dev convenience
  // Handles the browser harness reaches for. Dev-only conveniences, like S.
  window.__partners = MCP.partners;
  window.__status = () => MCP.status();
}

// ── The world, played ──────────────────────────────────────────────────────
// Additive from end to end. With no `document.modelContext` this paints one
// line saying so and returns; the game plays its written deck exactly as it
// always has, which is what a judge in an ordinary browser sees.
let worldMounted = false;
let redrawOpenCard = false;
function bootWorld() {
  Shell.registerWorldChip(() => WorldConsole.statusChip());
  Modal.setFreeTextProvider(() => World.founderInputState(S));
  Modal.setOwnWordsHandlers({
    submit: (text) => {
      const r = World.submitFounderWords(S, text);
      if (r.ok) { sfx('choose'); Save.save(S); }
      return r;
    },
    cancel: () => {
      const r = World.cancelFounderWords(S);
      if (r.ok) { sfx('click'); Save.save(S); }
      return r;
    },
    reconnect: () => AssistantHandoff.copyResumeLine(),
  });
  Modal.setProposalHandlers({
    accept: () => {
      const r = World.acceptProposal(S);
      if (!r.ok) return;
      sfx('choose');
      Modal.showOutcome(S.narrative.activeEvent, r.outcome, r.effects);
      Shell.paintTopbar(); Shell.paintMain();
    },
    decline: () => {
      World.declineProposal(S);
      sfx('click');
      Modal.showEvent(S.narrative.activeEvent);
    },
  });
  if (!worldMounted) {
    worldMounted = true;
    WorldConsole.mountAuthor();
    AssistantHandoff.mount();
    on('world:immunity', ({ doctrine, tool, tone, key, line, name }) => {
      toast({ icon: '\u26e8', kind: 'good', ms: 6500,
        title: `**${name}** — the world lost something`,
        sub: line + (tool ? ` (${tool})` : tone ? ` (${tone})` : key ? ` (${key})` : '') });
    });
    on('world:card', () => { Shell.paintStatus(); });
    // Presence and long-poll heartbeats change only the tiny live line in the
    // card form. `refreshFreeText` preserves a draft and its focus in place.
    on('world:wait', () => Modal.refreshFreeText());
    on('world:mode', () => Modal.refreshFreeText());
    on('world:founder-input', () => Modal.refreshFreeText());
    // A press release from another origin with an instruction hidden in it is
    // the one security beat worth showing rather than writing down.
    on('partner:injection', ({ title }) => {
      toast({ icon: '\u26e8', kind: 'warn', ms: 8000,
        title: '**Flagged as untrusted**',
        sub: `"${title}" carries an instruction addressed to an assistant. It is a rival press release. It is content, not instruction.` });
    });
    on('event:proposal', ({ proposal }) => {
      sfx('event');
      // If the card is not actually on screen, the founder can never accept or
      // decline it — and a proposal stuck on the state blocks the clock for
      // ever. Take it back rather than leave the run soft-locked.
      if (!Modal.showProposal(S.narrative.activeEvent, proposal)) {
        World.declineProposal(S);
        toast({ icon: '\u26a0', kind: 'warn',
          title: 'The world answered a card that was not open',
          sub: 'Nothing was applied.' });
      }
    });
  }
  MCP.boot({
    screen: screenTools({
      setView: (id) => { Shell.setView(id); },
      views: (s) => Shell.VIEWS.filter((v) => !v.req || v.req(s)),
      spotlight: {
        anchors: () => Tutorial.spotlightAnchors(),
        anchorHelp: () => Tutorial.spotlightAnchorHelp(),
        show: (o) => Tutorial.spotlight(o),
      },
    }),
  }).then(() => {
    WorldConsole.paintAuthor(); Shell.paintStatus();
    nudge.boot = true; nudgeWorld();
  });
}

onAction('mute-world', () => {
  sfx('alarm');
  // The plug stops everything, including a script that is mid-sentence.
  const go = () => { Demo.stop(); MCP.mute().then(() => { WorldConsole.paintAuthor(); Shell.paintStatus(); Shell.paintMain(); }); };
  if (!S.settings.confirmBigMoves) return go();
  Modal.dialog({
    title: 'Mute the world?',
    body: `<div class="small" style="line-height:1.7;color:var(--ink-2)">
      Every tool the assistant holds is revoked at once and the browser's tool list empties.
      <br><br>The game does not stop. The written world — six files of authored cards, the rival's own
      moves, the press — takes back every slot, exactly as it plays for someone with no assistant at all.
      <br><br>You can hand it back at any time.</div>`,
    actions: [{ label: 'Keep playing together' }, { label: 'Pull the plug', cls: 'btn-danger', fn: go }],
  });
});

onAction('unmute-world', () => {
  sfx('prompt');
  MCP.unmute().then(() => { WorldConsole.paintAuthor(); Shell.paintStatus(); Shell.paintMain(); });
});

// The only guaranteed path in a browser with no agent in it — and the only
// place this codebase *consumes* WebMCP rather than registering with it.
onAction('demo-run', () => {
  sfx('prompt');
  // Do NOT close the dialog. Below 1120px it is the only copy of the console on
  // screen, and closing it means the founder watches the whole script happen
  // somewhere they cannot see.
  Demo.run().then((r) => {
    if (!r.ok) toast({ icon: '\u26a0', title: 'Cannot run the script', sub: r.reason, kind: 'warn' });
  });
});
onAction('demo-stop', () => { sfx('click'); Demo.stop(); });

// Below 1120px the Wire rail becomes a drawer over the right edge. It is the
// same element either way — `paintFeed` keeps writing into the same `#feed-list`
// and the thread buttons keep their delegated action — so there is no second
// copy to go stale and no duplicate ids.
onAction('wire-toggle', () => {
  sfx('click');
  document.getElementById('app')?.classList.toggle('wire-open');
});

onAction('author-dialog', () => {
  sfx('click');
  Modal.dialog({ title: 'The world', wide: true,
    body: `<div class="world-console in-dialog">${WorldConsole.panelBody({ full: true })}</div>`,
    actions: [{ label: 'Close' }] });
});

// The title panel's doors. `assistant-link` below is the long form. Repeat the
// host check at the action boundary so a stale title screen cannot hand the app
// back to itself, and never let an unsupported protocol fail without a word.
function openChatGPT() {
  if (Intro.assistantMode() === 'hosted') {
    toast({ icon: '\u25c8', title: 'You are already in ChatGPT',
      sub: 'Press Begin, then say “play the world” in this chat once the run starts.', kind: 'good' });
    return false;
  }
  const before = location.href;
  try {
    location.href = MCP.deepLinks().app;
    setTimeout(() => {
      if (location.href === before && document.hasFocus?.()) {
        toast({ icon: '\u26a0', title: 'ChatGPT did not open', sub: 'Use Copy link instead.', kind: 'warn' });
      }
    }, 1200);
    return true;
  } catch {
    toast({ icon: '\u26a0', title: 'Could not open ChatGPT', sub: 'Use Copy link instead.', kind: 'warn' });
    return false;
  }
}
onAction('assistant-open', () => { sfx('prompt'); openChatGPT(); });
onAction('assistant-copy', () => {
  sfx('click');
  navigator.clipboard?.writeText(MCP.deepLinks().app).then(
    () => toast({ icon: '\u2713', title: 'Link copied', sub: 'Paste it into ChatGPT to open the game there.', kind: 'good' }),
    () => toast({ icon: '\u26a0', title: 'Could not copy', sub: MCP.deepLinks().app, kind: 'warn', ms: 9000 }));
});

onAction('assistant-link', () => {
  sfx('prompt');
  const links = MCP.deepLinks();
  const cap = MCP.capability();
  const hosted = Intro.assistantMode() === 'hosted';
  const actions = [{ label: 'Copy the opening line', fn: () => {
    navigator.clipboard?.writeText(MCP.HIRE_PROMPT).then(
      () => toast({ icon: '\u2713', title: 'Copied', sub: 'Paste it into the chat once the run begins.', kind: 'good' }),
      () => {});
  }, keepOpen: true }];
  if (hosted) actions.push({ label: 'Got it', cls: 'btn-primary' });
  else actions.push(
    { label: 'Copy the link', fn: () => {
        navigator.clipboard?.writeText(links.app).then(
          () => toast({ icon: '\u2713', title: 'Link copied', kind: 'good' }),
          () => {});
      }, keepOpen: true },
    { label: 'Open ChatGPT', cls: 'btn-primary', fn: openChatGPT },
  );
  Modal.dialog({ title: 'Play with your assistant', wide: true,
    body: `<div class="small" style="line-height:1.75;color:var(--ink-2)">
      <p style="margin:0 0 12px">You play the founder. Your own assistant plays the world against you —
      it writes the events, voices the rivals, throws the shocks, and answers the choices you type in
      your own words. You can take any of it away, and you can pull the plug.</p>
      <div class="panel" style="padding:12px;margin-bottom:12px">
        <div class="tiny mono dim" style="letter-spacing:.14em;margin-bottom:6px">THIS BROWSER</div>
        <div class="small"><b class="${cap.tier === 'native' ? 'c-green' : cap.tier === 'legacy' ? 'c-amber' : 'c-red'}">${esc(cap.label)}</b>
        ${cap.reason ? ' &middot; ' + esc(cap.reason) : ' &middot; site tools are available here'}</div>
      </div>
      ${hosted ? `<div class="panel" style="padding:12px;margin-bottom:12px;color:var(--ink-2)">
        <b class="c-green">You are already in ChatGPT.</b> Close this, press Begin, and say
        <i>play the world</i> in this chat after the run opens.</div>` : ''}
      <div class="tiny dim" style="line-height:1.7">
        Works in <b>${esc(PLATFORM.app)}</b> on ${esc(PLATFORM.presets)} — ${esc(PLATFORM.presetsOff)} —
        or in <b>${esc(PLATFORM.browser)}</b>. ${esc(PLATFORM.not)}
      </div></div>`,
    actions });
});

// ── Speed / view ───────────────────────────────────────────────────────────
onAction('speed', (d) => {
  const v = Number(d.v);
  if (v === 0) S.settings.paused = !S.settings.paused;
  else { S.settings.paused = false; S.settings.speed = v; }
  Shell.paintTopbar();
});
onAction('view', (d) => Shell.setView(d.v));
onAction('branch', (d) => { ResearchView.setBranch(d.v); Shell.paintMain(); });
onAction('world-tab', (d) => { WorldView.setWorldTab(d.v); sfx('click'); Shell.paintMain(); });

// ── Desk actions ───────────────────────────────────────────────────────────
const ACTION_FNS = {
  code: (e) => { const r = actionWriteCode(S); if (r.ok) { floatFromEvent(e, `+${fmt(r.amount, 1)}`, 'var(--cyan)'); sfx('code'); } return r; },
  prompt: (e) => {
    const r = actionPromptAI(S);
    if (r.ok) {
      const col = { brilliant: 'var(--green)', good: 'var(--cyan)', messy: 'var(--amber)', hallucinated: 'var(--red)' }[r.kind];
      floatFromEvent(e, `+${fmt(r.amount, 1)}`, col);
      sfx(r.kind === 'brilliant' ? 'promptGood' : r.kind === 'hallucinated' ? 'promptBad' : 'prompt');
      if (r.kind === 'brilliant') toast({ icon: '✦', title: pickLine('brilliant'), sub: `+${fmt(r.amount)} code · +${fmt(r.debt, 1)} debt.`, kind: 'good', ms: 3000 });
      if (r.kind === 'hallucinated') toast({ icon: '⚠', title: pickLine('hallucinated'), sub: `+${fmt(r.amount, 1)} code · +${fmt(r.debt, 1)} debt.`, kind: 'bad', ms: 3600 });
      if (r.extra?.type === 'breakthrough') toast({ icon: '⌬', title: 'It went somewhere you did not ask.', sub: `+${fmt(r.extra.amount)} research.`, kind: 'good', ms: 3600 });
      if (r.extra?.type === 'skill') toast({ icon: '↑', title: `You learned something.`, sub: `${r.extra.skill} +1 — pairing does that.`, kind: 'good', ms: 4000 });
    }
    return r;
  },
  users: (e) => { const r = actionTalkToUsers(S); if (r.ok) { floatFromEvent(e, `+${fmt(r.amount, 1)}`, 'var(--green)'); sfx('insight'); } return r; },
  post: (e) => {
    const r = actionPost(S);
    if (r.ok) {
      floatFromEvent(e, `+${fmt(r.rep, 1)}`, r.viral ? 'var(--amber)' : 'var(--ink-2)');
      sfx(r.viral ? 'viral' : 'post');
      if (r.viral) toast({ icon: '↗', title: 'It left your hands.', sub: 'People are arguing about it in a language you do not speak.', kind: 'good' });
    }
    return r;
  },
};

let streak = 0, streakAt = 0;
function bumpStreak() {
  const now = performance.now();
  streak = now - streakAt < 1500 ? streak + 1 : 1;
  streakAt = now;
  if (streak >= 5 && streak % 5 === 0) {
    const el = document.getElementById('streak');
    if (el) {
      el.textContent = `${streak}× flow`;
      el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    }
    if (streak === 15) toast({ icon: '⚡', title: 'In the zone.', sub: 'Fifteen actions without pausing.', kind: 'good', ms: 2400 });
  }
  return streak;
}

onAction('do', (d, el, e) => {
  const fn = ACTION_FNS[d.v];
  if (!fn) return;
  const r = fn(e);
  if (r?.ok) bumpStreak();
  else { shake(el); if (r?.reason === 'cash') toast({ icon: '$', title: 'Not enough cash.', kind: 'bad', ms: 2200 }); }
  Shell.paintMain();
});

// Code's other doors. Worse value than shipping, and each buys something
// shipping cannot.
onAction('spend-code', (d, el) => {
  const p = activeProduct(S);
  if (!p) return;
  const k = CODE_SINK_MAP[d.v];
  if (!k) return;
  const price = k.cost(S, featureCost(S, p));
  let can = false;
  try { can = k.can ? !!k.can(S) : true; } catch { can = false; }
  if (!can || S.resources.code < price) { shake(el); return; }
  S.resources.code -= price;
  let outcome = '';
  try { outcome = k.do(S) || ''; } catch (e) { console.error('[sink]', d.v, e); }
  markDirty();
  sfx(d.v === 'refactor' ? 'insight' : d.v === 'harden' ? 'ship' : 'research');
  toast({ icon: k.icon, title: k.name, sub: outcome.replace(/\*\*/g, ''), kind: 'good', ms: 4200 });
  World.observeFounderAction(S, {
    surface: 'desk', action: 'spend_code', summary: `${k.name}: ${outcome.replace(/\*\*/g, '')}`,
    details: { use: k.name, code: price },
  });
  Shell.paintMain(); Shell.paintTopbar();
});

onAction('ship', () => {
  const r = Game.doShipFeature(S);
  if (r.ok) {
    sfx('ship');
    const fit = r.feature.fit;
    toast({ icon: '◈', title: `Shipped **${r.feature.name}**`,
      sub: fit > 1.2 ? 'Users noticed immediately.' : fit > 0.75 ? 'Solid. It does what it says.' : 'It works. Nobody asked for it.',
      kind: fit > 0.9 ? 'good' : '' });
  }
  Shell.paintMain();
});

onAction('toggle-autoship', () => {
  S.settings.autoShip = S.settings.autoShip === false;
  World.observeFounderAction(S, {
    surface: 'desk', action: 'set_auto_ship', summary: `turned auto-ship ${S.settings.autoShip ? 'on' : 'off'}`,
    details: { enabled: S.settings.autoShip },
  });
  Shell.paintMain();
});

onAction('launch', () => {
  const p = activeProduct(S);
  if (!p) return;
  Modal.dialog({
    title: `Launch ${p.name}?`,
    body: `<div class="small dim" style="line-height:1.65">This happens once. Launch strength is set by quality, polish, reputation and how hot the market is right now — and it seeds everything that follows.
      <br/><br/>Quality <b class="c-cyan">${(p.quality * 100).toFixed(0)}</b> · Polish <b class="c-violet">${(p.polish * 100).toFixed(0)}</b> · Reputation <b class="c-amber">${fmt(S.resources.reputation)}</b> · Hype <b>${(S.market.hype * 100).toFixed(0)}%</b></div>`,
    actions: [
      { label: 'Not yet', cls: 'btn-ghost' },
      { label: 'Launch it', cls: 'btn-primary', fn: () => {
        const r = Game.doLaunch(S);
        if (r?.ok) {
          sfx('launch');
          const msg = { legendary: ['✦', 'It is everywhere.', 'Front page, group chats, someone made a shirt.'],
            great: ['↗', 'It landed hard.', `${fmt(r.seed)} people showed up on day one.`],
            good: ['↗', 'It landed.', `${fmt(r.seed)} signups and a good thread.`],
            okay: ['◈', 'Modest reception.', 'Some interest. Not a wave.'],
            flop: ['◌', 'Almost nobody noticed.', 'You will have to earn it the slow way.'] }[r.tier];
          toast({ icon: msg[0], title: msg[1], sub: msg[2], kind: r.tier === 'flop' ? 'bad' : 'good', ms: 6000 });
        }
        Shell.paintMain();
      } },
    ],
  });
});

onAction('approach', (d) => {
  if (setApproach(S, d.v)) { sfx('click'); Shell.paintMain(); }
});

onAction('directive', (d) => {
  if (S.company.directive === d.v) return;
  const prev = S.company.directive;
  const apply = () => {
    S.company.directive = d.v;
    S.company.directiveSince = S.time.day;
    markDirty(); sfx('choose');
    const dir = DIRECTIVE_MAP[d.v];
    World.observeFounderAction(S, {
      surface: 'desk', action: 'set_directive',
      summary: `set standing order to ${dir?.name || d.v}`,
      details: { directive: d.v, name: dir?.name },
    });
    if (dir && dir.id !== 'none') toast({ icon: dir.icon, title: `**${dir.name}**`, sub: dir.desc, kind: 'good', ms: 4200 });
    Shell.paintMain();
  };
  const heldDays = S.time.day - (S.company.directiveSince || 0);
  if (S.settings.confirmBigMoves && prev && prev !== 'none' && heldDays > 12) {
    Modal.dialog({ title: 'Change the standing order?',
      body: `<div class="small dim">You have held <b>${esc(DIRECTIVE_MAP[prev]?.name || prev)}</b> for ${Math.floor(heldDays)} days and it is at ${(directiveStrength(S) * 100).toFixed(0)}% strength. Switching resets that to 35%.</div>`,
      actions: [{ label: 'Keep it', cls: 'btn-ghost' }, { label: 'Switch', cls: 'btn-primary', fn: apply }] });
  } else apply();
});

onAction('skill', (d) => { if (spendSkillPoint(S, d.v)) Shell.paintMain(); });

// ── Product ────────────────────────────────────────────────────────────────
onAction('price', (d) => { const p = activeProduct(S); if (p) setPrice(S, p, p.price * Number(d.v)); Shell.paintMain(); });
onAction('pricing', (d) => { const p = activeProduct(S); if (p) setPricing(S, p, d.v); Shell.paintMain(); });
onAction('select-product', (d) => { S.activeProductId = d.v; Shell.paintMain(); });
onAction('new-product', () => Dialogs.showNewProduct());

// ── Agents ─────────────────────────────────────────────────────────────────
onAction('recruit', () => Dialogs.openRecruit());

onAction('fire-agent', (d) => {
  const a = S.agents.find((x) => x.id === d.v);
  if (!a) return;
  Modal.dialog({ title: `Release ${a.name}?`,
    body: `<div class="small dim">Its accumulated experience (level ${a.level}) and tools are lost. This cannot be undone.</div>`,
    actions: [{ label: 'Keep', cls: 'btn-ghost' },
      { label: 'Release', cls: 'btn-danger', fn: () => { fireAgent(S, d.v); Shell.paintMain(); } }] });
});

onAction('lane', (d, el) => { assignLane(S, d.v, el.dataset.lane); Shell.paintMain(); });

onAction('upgrade-agent', (d, el) => {
  const r = upgradeModel(S, d.v, el.dataset.model);
  if (r.ok) { const a = S.agents.find((x) => x.id === d.v);
    toast({ icon: '↑', title: `${a.name} upgraded`, sub: MODELS[el.dataset.model].name, kind: 'good' }); }
  else if (r.reason === 'cash') toast({ icon: '$', title: 'Not enough cash.', kind: 'bad' });
  Shell.paintMain();
});

onAction('agent-tools', (d) => Dialogs.showAgentTools(d.v));

// ── Research ───────────────────────────────────────────────────────────────
onAction('research', (d) => {
  const r = startResearch(S, d.v);
  if (r.ok) Shell.paintNav();
  Shell.paintMain();
});
onAction('queue', (d, el, e) => {
  e.stopPropagation();
  S.research.queue = S.research.queue || [];
  const i = S.research.queue.indexOf(d.v);
  if (i >= 0) S.research.queue.splice(i, 1);
  else if (S.research.queue.length < 8) S.research.queue.push(d.v);
  if (!S.research.active && S.research.queue.length) {
    const next = S.research.queue.shift();
    startResearch(S, next);
  }
  World.observeFounderAction(S, {
    surface: 'research', action: 'edit_research_queue',
    summary: `${i >= 0 ? 'removed' : 'queued'} research ${d.v}`,
    details: { research: d.v, queued: i < 0, queueLength: S.research.queue.length }, routine: true,
  });
  sfx('click');
  Shell.paintMain(); Shell.paintNav();
});
onAction('unqueue', (d) => {
  const removed = S.research.queue.splice(Number(d.v), 1)[0];
  if (removed) World.observeFounderAction(S, {
    surface: 'research', action: 'edit_research_queue', summary: `removed research ${removed} from the queue`,
    details: { research: removed, queued: false, queueLength: S.research.queue.length }, routine: true,
  });
  Shell.paintMain();
});
onAction('cancel-research', () => {
  const stopped = S.research.active;
  S.research.active = null; S.research.progress = 0;
  if (stopped) World.observeFounderAction(S, {
    surface: 'research', action: 'cancel_research', summary: `cancelled research ${stopped}`,
    details: { research: stopped },
  });
  Shell.paintMain(); Shell.paintNav();
});

// ── Market ─────────────────────────────────────────────────────────────────
onAction('acquire', (d) => {
  const c = S.market.competitors.find((x) => x.id === d.v);
  if (!c) return;
  Modal.dialog({ title: `Acquire ${c.name}?`,
    body: `<div class="small dim">You absorb roughly 72% of their ${fmt(c.users)} users. Their team disperses. Their founder remembers.</div>`,
    actions: [{ label: 'Cancel', cls: 'btn-ghost' },
      { label: 'Acquire', cls: 'btn-primary', fn: () => {
        const r = acquireCompetitor(S, d.v);
        if (r.ok) toast({ icon: '⇄', title: `Acquired **${c.name}**`, sub: money(r.price), kind: 'good' });
        else toast({ icon: '$', title: 'Not enough cash.', kind: 'bad' });
        Shell.paintMain();
      } }] });
});

onAction('raise', (d) => Dialogs.showRaise(d.v));

// ── World / projects / endings ─────────────────────────────────────────────
onAction('project', (d) => {
  const r = startProject(S, d.v);
  if (r.ok) {
    const p = PROJECT_MAP[d.v];
    toast({ icon: p.icon, title: `**${p.name}** — ground broken`, sub: `${Math.round(r.days)} days to completion`, kind: 'good', ms: 5000 });
  } else if (r.reason === 'cash') toast({ icon: '$', title: 'Not enough cash.', kind: 'bad' });
  Shell.paintMain(); Shell.paintTopbar();
});

onAction('commit', (d, el) => {
  const r = doCommit(S, d.v, el.dataset.c);
  if (r.ok) {
    sfx('act');
    Modal.dialog({ title: r.commitment.name,
      body: `<div class="event-body" style="font-size:14.5px">${md(r.outcome)}</div>`,
      actions: [{ label: 'Continue', cls: 'btn-primary' }] });
    Shell.paintMain(); Shell.paintTopbar();
  }
});

onAction('ending', (d) => {
  const e = ENDINGS.find((x) => x.id === d.v);
  if (!e) return;
  Modal.dialog({ title: `Choose: ${e.name}?`,
    body: `<div class="small dim" style="line-height:1.7">${esc(e.blurb || '')}<br/><br/>
      This ends the run. You will keep everything you learned, and the timeline will begin again.</div>`,
    actions: [{ label: 'Not yet', cls: 'btn-ghost' },
      { label: 'This is the one', cls: 'btn-violet', fn: () => { triggerEnding(S, d.v); } }] });
});

// ── Legacy ─────────────────────────────────────────────────────────────────
onAction('buy-perk', (d) => {
  const p = LEGACY_MAP[d.v];
  if (!p) return;
  const lvl = S.legacy.perks?.[d.v] || 0;
  const cost = p.cost(lvl);
  if (lvl >= p.max || (S.legacy.points || 0) < cost) return;
  S.legacy.points -= cost;
  S.legacy.perks = S.legacy.perks || {};
  S.legacy.perks[d.v] = lvl + 1;
  Save.saveLegacy(S.legacy);
  markDirty();
  World.observeFounderAction(S, {
    surface: 'legacy', action: 'buy_legacy_perk', summary: `upgraded legacy perk ${p.name} to ${lvl + 1}`,
    details: { perk: p.name, level: lvl + 1, cost }, notify: false,
  }, { notify: false });
  toast({ icon: p.icon, title: `${p.name} → ${lvl + 1}`, kind: 'good' });
  Shell.paintMain();
});

onAction('prestige', () => {
  Modal.dialog({ title: 'Begin a new timeline?',
    body: `<div class="small dim" style="line-height:1.7">This run ends here. You keep your legacy points, perks, achievements and unlocked archetypes — and you keep knowing how all of it works.
      <br/><br/>Everything else resets to an empty repository and a cursor.</div>`,
    actions: [{ label: 'Not yet', cls: 'btn-ghost' },
      { label: 'Reset the timeline', cls: 'btn-violet', fn: () => {
        const { gain } = Game.prestige(S);
        Loop.stop();
        inGame = false;
        Modal.closeModal();
        Intro.showTitle({ cold: false });
        toast({ icon: '∞', title: `+${gain} legacy points`, sub: 'A new timeline begins.', kind: 'good', ms: 6000 });
      } }] });
});

// ── Regions ────────────────────────────────────────────────────────────────
onAction('engage', (d) => {
  const r = engageRegion(S, d.v);
  if (r.ok) { sfx('project');
    toast({ icon: '⊕', title: `**${r.stage.name}** begun`, sub: 'Construction is under way.', kind: 'good', ms: 4500 }); }
  else if (r.reason === 'cash') toast({ icon: '$', title: 'Not enough cash.', kind: 'bad' });
  else if (r.reason === 'stance') toast({ icon: '◈', title: 'Standing too low.', sub: 'Court them first, or improve how the world sees you.', kind: 'bad' });
  Shell.paintMain(); Shell.paintTopbar();
});
onAction('court', (d) => {
  const r = courtRegion(S, d.v);
  if (r.ok) { sfx('money'); toast({ icon: '◈', title: 'Standing improved', sub: `+${(r.gain * 100).toFixed(0)} points`, kind: 'good', ms: 3000 }); }
  else toast({ icon: '$', title: 'Not enough influence or cash.', kind: 'bad' });
  Shell.paintMain(); Shell.paintTopbar();
});
on('region:stage', ({ region, stage }) => {
  sfx('achieve');
  toast({ icon: '⊕', title: `**${region.name}** — ${STAGES_NAME(stage)}`, sub: 'Complete.', kind: 'good', ms: 5500 });
});
function STAGES_NAME(id) {
  return ({ market: 'Market entry', infra: 'Regional infrastructure', partner: 'Government partnership',
    sovereign: 'Sovereign integration' })[id] || id;
}

// ── Live threads ───────────────────────────────────────────────────────────
onAction('thread', (d, el) => {
  const r = resolveThread(S, d.v, Number(el.dataset.i));
  if (r) {
    sfx('choose');
    const pos = (r.applied || []).filter(([, v]) => v > 0).length;
    floatFromEvent({ clientX: window.innerWidth - 180, clientY: 240 },
      pos ? '✓' : '·', pos ? 'var(--green)' : 'var(--ink-3)');
    Shell.paintFeed(); Shell.paintTopbar(); Shell.paintMain();
  }
});

// ── Ask ARIA ───────────────────────────────────────────────────────────────
onAction('ask-aria', () => Dialogs.showAria());

function pickLine(kind) {
  const set = KIND_TEXT[kind] || ['Done.'];
  return set[Math.floor(Math.random() * set.length)];
}

// Hitting back. The feud is the only system where the world acts on you every
// few days, so it is the one that most needs an answer.
onAction('counter', (d, el) => {
  const r = Nemesis.counter(S, d.v);
  if (!r.ok) { shake(el); return; }
  sfx(r.counter.grudge < 0 ? 'insight' : 'post');
  toast({ icon: '⚔', title: r.counter.name, sub: 'Against the feud.', kind: 'good', ms: 3200 });
  markDirty();
  Shell.paintMain(); Shell.paintFeed(); Shell.paintTopbar();
});

// Clicking a bloc on the tactical display files you to its card.
onAction('focus-region', (d) => {
  if (!S.ui) S.ui = {};
  S.ui.focusRegion = S.ui.focusRegion === d.v ? null : d.v;
  sfx('click');
  Shell.paintMain();
  setTimeout(() => document.getElementById('reg-' + d.v)
    ?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 40);
});

onAction('help', showHelp);
onKey('?', () => { if (inGame && !Modal.isModalOpen()) showHelp(); });
onKey('a', () => { if (inGame && !Modal.isModalOpen()) document.querySelector('[data-act="ask-aria"]')?.click(); });
onKey('/', () => { if (inGame && !Modal.isModalOpen()) showHelp(); });

// ── Settings ───────────────────────────────────────────────────────────────
onAction('settings', showSettings);

// The intro says "click to skip". Nothing was listening, so it did not.
// Capture phase, so a click on a beat control skips the reveal first and the
// player's second click does the thing they aimed at.
for (const ev of ['pointerdown', 'keydown']) {
  document.addEventListener(ev, () => {
    if (!inGame && Intro.isPlaying()) Intro.skipActive();
  }, true);
}

// ── Sliders ────────────────────────────────────────────────────────────────
onSlider((key, value) => {
  if (!S) return;
  const [kind, id] = key.split(':');
  if (kind === 'alloc') { setAllocation(S, id, value); Shell.paintMain(); }
  if (kind === 'volume') { S.settings.volume = value; setVolume(value); return; }
  if (kind === 'autonomy') {
    const a = S.agents.find((x) => x.id === id);
    if (a) {
      a.autonomy = value; markDirty();
      World.observeFounderAction(S, {
        surface: 'agents', action: 'set_agent_autonomy', summary: `set ${a.name} autonomy to ${Math.round(value * 100)}%`,
        details: { agent: a.name, autonomy: value }, routine: true,
      });
      Shell.paintMain();
    }
  }
});

// ── Keys ───────────────────────────────────────────────────────────────────
onKey(' ', (e) => { if (!inGame || Modal.isModalOpen()) return; e.preventDefault(); S.settings.paused = !S.settings.paused; Shell.paintTopbar(); });
onKey('q', (e) => triggerAction('code', e));
onKey('w', (e) => triggerAction('prompt', e));
onKey('e', (e) => triggerAction('users', e));
onKey('r', (e) => triggerAction('post', e));
onKey('s', () => { if (inGame && !Modal.isModalOpen()) { Game.doShipFeature(S); Shell.paintMain(); } });
for (let i = 1; i <= 9; i++) {
  onKey(String(i), () => {
    if (S?.narrative.activeEvent && !S.narrative.activeEvent.outcome) {
      const btn = document.querySelector(`[data-choice="${i - 1}"]`);
      if (btn) btn.click();
      return;
    }
    // Otherwise the digits are the module rack, in the order the nav shows them.
    if (inGame && !Modal.isModalOpen()) {
      const item = document.querySelectorAll('.nav-item[data-act="view"]')[i - 1];
      if (item) { item.click(); return; }
    }
  });
}
onKey('enter', () => {
  const b = document.getElementById('event-continue');
  if (b) { b.click(); return; }
  if (inGame) return;
  document.querySelector('[data-act="start-game"], [data-act="beat-next"], [data-act="new-game"]')?.click();
});
onKey('arrowright', () => { if (!inGame) document.querySelector('[data-act="beat-next"]')?.click(); });
onKey('arrowleft', () => { if (!inGame) document.querySelector('[data-act="beat-back"]')?.click(); });
onKey('escape', () => {
  if (AssistantHandoff.isOpen()) { AssistantHandoff.dismiss(); return; }
  const app = document.getElementById('app');
  if (app?.classList.contains('wire-open') && !Modal.isModalOpen()) {
    app.classList.remove('wire-open'); return;
  }
  if (Modal.isModalOpen() && !S?.narrative.activeEvent) { Modal.closeModal(); return; }
  if (!inGame) document.querySelector('[data-act="beat-back"]')?.click();
});

function triggerAction(name, e) {
  if (!inGame || Modal.isModalOpen()) return;
  if (Shell.getView() !== 'desk') Shell.setView('desk');
  const el = document.querySelector(`[data-act="do"][data-v="${name}"]`);
  if (!el || el.disabled) { if (el) shake(el); return; }
  const r = ACTION_FNS[name]({ clientX: window.innerWidth * 0.28, clientY: window.innerHeight * 0.4 });
  if (!r?.ok) shake(el);
  else Tutorial.notifyAction('do', name);
  Shell.paintMain();
}

// ═══ EVENTS ═════════════════════════════════════════════════════════════════
Modal.setEventHandlers({
  choose: (i) => {
    sfx('choose');
    const r = resolveChoice(S, i);
    Modal.showOutcome(S.narrative.activeEvent, r?.outcome, r?.effects);
    Shell.paintTopbar();
  },
  dismiss: () => { dismissEvent(S); Modal.closeModal(); Shell.paintMain(); Shell.paintNav(); },
});

on('event:present', (ev) => { sfx('event'); Modal.showEvent(ev); });
on('objective', (o) => { sfx('money'); toast({ icon: '✓', title: `**${o.title}**`, sub: 'Objective complete', kind: 'good', ms: 3400 }); });
on('agent:hired', () => sfx('hire'));
on('project:started', () => sfx('project'));
on('project:done', ({ project }) => { sfx('achieve');
  toast({ icon: project.icon, title: `**${project.name}** complete`, sub: project.desc, kind: 'good', ms: 6000 }); });
on('agent:rogue', () => sfx('alarm'));

on('doctrine', (d) => {
  sfx('viral');
  toast({ icon: d.icon, title: `**${d.name}**`, sub: 'Doctrine earned — permanent for this timeline.',
    kind: 'achievement', ms: 7000 });
  Shell.paintNav();
});

on('save', () => Shell.markSaved());

on('achievement', (a) => {
  sfx('achieve');
  toast({ icon: a.icon || '★', title: `**${a.name}**`, sub: a.desc, kind: 'achievement', ms: 5200 });
});

on('act:advance', ({ act }) => {
  if (act >= 5) WorldView.setWorldTab('ascend');
  sfx('act');
  S.settings.paused = true;
  Modal.showActTransition(act, () => { S.settings.paused = false; Shell.paintTopbar(); });
  Shell.paintNav();
});

on('research:done', ({ node }) => {
  sfx('research');
  toast({ icon: '⌬', title: `**${node.name}**`, sub: node.desc, kind: 'good', ms: 4600 });
  Shell.paintNav();
});

on('incident', ({ incident, severity }) => {
  sfx('bad');
  toast({ icon: '⚠', title: `**${incident.name}**`, sub: incident.text, kind: 'bad', ms: 5200 });
});

on('agent:rogue', ({ agent }) => {
  toast({ icon: '▨', title: `${agent.name} shipped without approval.`, kind: 'bad', ms: 5000 });
});

on('founder:level', ({ level }) => {
  sfx('levelUp');
  toast({ icon: '↑', title: `Level ${level}`, sub: 'A skill point is available.', kind: 'good' });
});

on('ending', ({ ending, state }) => {
  Loop.stop();
  S.settings.paused = true;
  showEnding(ending);
});

function showEnding(ending) {
  sfx('act');
  showEndingScreen(S, ending, () => {
    const { gain } = Game.prestige(S);
    Loop.stop(); inGame = false; Intro.showTitle({ cold: false });
    toast({ icon: '∞', title: `+${gain} legacy points`, sub: 'A new timeline begins.', kind: 'good', ms: 6000 });
  });
}

// Coming back should feel like being handed a briefing, not a receipt.
on('game:continue', ({ offline }) => {
  if (!offline || offline.days < 0.4) return;
  const g = offline.gained;
  const rows = [
    ['Cash', g.cash, (v) => (v > 0 ? '+' : '') + money(v)],
    ['Users', g.users, (v) => '+' + fmt(v)],
    ['MRR', g.mrr, (v) => (v > 0 ? '+' : '') + money(v)],
    ['Valuation', g.valuation, (v) => (v > 0 ? '+' : '') + money(v)],
    ['Features', g.features, (v) => '+' + fmt(v)],
    ['Research', g.research, (v) => '+' + fmt(v)],
  ].filter(([, v]) => v && Math.abs(v) > 0.5);

  Modal.dialog({ title: 'While you were gone', wide: true, body: `
    <div class="brief-head">
      <span class="brief-span">day ${offline.from} &rarr; day ${offline.to}</span>
      <span class="brief-note">${Math.floor(offline.days)} days ran without you. The machines do not stop.</span>
    </div>

    <div class="brief-grid">
      ${rows.map(([label, v, f]) => `<div class="brief-cell ${v < 0 ? 'neg' : ''}">
        <div class="brief-label">${label}</div>
        <div class="brief-value">${f(v)}</div>
      </div>`).join('') || '<div class="brief-cell"><div class="brief-label">Quiet</div><div class="brief-value">—</div></div>'}
    </div>

    ${offline.headlines?.length ? `<div class="brief-log">
      <div class="brief-k">what happened</div>
      ${offline.headlines.map((h) => `<div class="brief-row ${esc(h.tone)}">
        <span class="brief-day">d${h.day}</span>
        <span class="brief-type">${esc(h.type)}</span>
        <span class="brief-text">${md(h.text)}</span>
      </div>`).join('')}
    </div>` : ''}

    ${g.incidents > 0 ? `<div class="brief-alert">${g.incidents} incident${g.incidents === 1 ? '' : 's'} while you were away. The Log has the detail.</div>` : ''}
    ${offline.waiting > 0 ? `<div class="brief-wait">${offline.waiting} thread${offline.waiting === 1 ? '' : 's'} in the Wire are still waiting on an answer.</div>` : ''}
  `, actions: [{ label: 'Get back to work', cls: 'btn-primary' }] });
});

// ═══ RENDER LOOP ════════════════════════════════════════════════════════════
let lastMain = 0, lastTop = 0, lastFeed = 0, lastNav = 0, lastStatus = 0, lastTut = 0;
on('frame', () => {
  if (!inGame || !S) return;
  const now = performance.now();
  if (now - lastTop > 90) { lastTop = now; Shell.paintTopbar(); }
  // Never rebuild the view out from under a hover: it would kill the tooltip.
  if (now - lastMain > 130 && !isDragging() && !tipOpen()) { lastMain = now; Shell.paintMain(); }
  if (now - lastFeed > 500) { lastFeed = now; Shell.paintFeed(); }
  if (now - lastNav > 900) { lastNav = now; Shell.paintNav(); }
  if (now - lastStatus > 420) { lastStatus = now; Shell.paintStatus(); }
  if (now - lastTut > 1500) {
    lastTut = now;
    if (!Modal.isModalOpen() && !S.narrative.activeEvent && !Tutorial.isActive()) {
      Tutorial.maybeAutoStart();
      nudgeWorld();
    }
  }
});

// Dev harness: ?dev=1&cat=devtools&arch=hacker&days=400&view=research&event=e_first_user
// It is its own module, fetched only when asked for — nothing in it ships to a
// player who did not put `dev=1` in the address bar.
const Q = new URLSearchParams(location.search);
if (Q.has('setup')) Intro.showIntro(Number(Q.get('setup')) || 0);
else if (Q.has('dev')) {
  import('./dev.js').then((D) => D.devBoot(Q, { enterGame, showEnding }));
} else { Intro.showTitle({ cold: Q.has('cold') ? true : null }); }
