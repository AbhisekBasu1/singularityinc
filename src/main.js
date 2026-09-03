// ─────────────────────────────────────────────────────────────────────────────
// MAIN — bootstrap, input wiring, render loop.
// ─────────────────────────────────────────────────────────────────────────────
import { S, activeProduct } from './engine/state.js';
import { inviteLink, inviteReach } from './webmcp/origin.js';
import { on } from './engine/bus.js';
import { fmt, money } from './engine/format.js';
import * as Game from './game.js';
import * as Loop from './engine/loop.js';
import * as Save from './engine/save.js';
import { onAction, onKey, onSlider, runAction, isDragging, esc, md, tipOpen } from './ui/dom.js';
import { toast, floatFromEvent, shake } from './ui/toast.js';
import * as Modal from './ui/modal.js';
import * as Shell from './ui/shell.js';
import * as Intro from './ui/intro.js';
import * as Tutorial from './ui/tutorial.js';
import { showHelp } from './ui/manual.js';
import { showSettings } from './ui/settings.js';
import * as Dialogs from './ui/dialogs.js';
import * as Transport from './ui/transport.js';
import * as Nemesis from './systems/nemesis.js';
import { showEnding as showEndingScreen } from './ui/ending.js';
import { startBackground, setBackgroundEnabled } from './ui/background.js';
import * as MCP from './webmcp/index.js';
import * as World from './world/author.js';
import * as WorldConsole from './ui/author.js';
import * as AssistantHandoff from './ui/assistant-handoff.js';
import { screenTools } from './webmcp/tools.js';
import * as Demo from './webmcp/demo.js';
import * as Resident from './webmcp/resident.js';
import * as Autoplay from './systems/autoplay.js';
import { play as sfx, setEnabled as setAudio, initAudio, setVolume, setAmbient } from './ui/audio.js';

import * as DeskView from './ui/views/desk.js';
import * as ProductView from './ui/views/product.js';
import * as AgentsView from './ui/views/agents.js';
import * as ResearchView from './ui/views/research.js';
import * as MarketView from './ui/views/market.js';
import * as WorldView from './ui/views/world.js';
import * as Why from './ui/why.js';
import * as Preview from './systems/preview.js';
import * as StoryView from './ui/views/story.js';
import * as LegacyView from './ui/views/legacy.js';

import { actionWriteCode, actionPromptAI, actionTalkToUsers, actionPost, setAllocation,
         spendSkillPoint, setApproach } from './systems/founder.js';
import { setPrice, setPricing, featureCost } from './systems/product.js';
import { fireAgent, assignLane, upgradeModel, setAutonomy } from './systems/agents.js';
import { toggleIntention } from './systems/board.js';
import { startResearch } from './systems/research.js';
import { acquireCompetitor } from './systems/market.js';
import { resolveThread, snoozeThread } from './systems/feed.js';
import { markRead, markAllRead } from './systems/mail.js';
import * as Spend from './systems/spend.js';
import { toggleTodo } from './systems/todo.js';
import { morningLine } from './ui/morning.js';
import * as Alarm from './ui/alarm.js';
import { startProject } from './systems/projects.js';
import { engage as engageRegion, courtRegion, displaceRival } from './systems/regions.js';
import { commit as doCommit } from './systems/commitments.js';
import { resolveChoice, dismissEvent, repairEventHistory } from './systems/narrative.js';
import { markDirty } from './systems/modifiers.js';
import { marketingMax, infraMax, runwayDays } from './systems/economy.js';
import { setComputeShare } from './systems/compute.js';
import { forfeitDoctrine } from './systems/doctrines.js';
import { LEGACY_MAP } from './data/legacy.js';
import { DIRECTIVE_MAP, directiveStrength, setOrder } from './data/directives.js';
import { MODELS } from './data/agents.js';
import { CODE_SINK_MAP } from './data/codesinks.js';
import { KIND_TEXT } from './data/approaches.js';
import { ENDINGS, triggerEnding } from './systems/progression.js';
import { PROJECT_MAP } from './data/projects.js';
import { PLATFORM } from './data/platform.js';
import * as Calls from './systems/calls.js';
import * as Keep from './systems/keep.js';
import { chronicle, toText } from './systems/chronicle.js';
import { chronicleHtml } from './ui/ending.js';
import { CHARACTERS, arcLabel } from './data/characters.js';
import { CALLS, TIME } from './data/balance.js';
import { describeEffects } from './world/effects.js';

// ═══ WHICH HOUSING ══════════════════════════════════════════════════════════
// Two shells play the same game: the console (the original) and the
// workstation, a desktop at `/computer/`. The choice is made here, before
// anything is registered with it, and everything below is written as though
// there were only one.
const Q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
const wantOs = (typeof document !== 'undefined'
  && document.documentElement?.dataset?.shell === 'os') || Q.get('shell') === 'os';
if (wantOs) {
  try {
    const Os = await import('./ui/os/shell.js');
    Shell.use(Os);
    // The title becomes a login screen: the same pitch, the same panel and the
    // same doors, with the saved run on it as an account you log into.
    Intro.setTitleDecor(Os.titleDecor);
  } catch (e) { console.error('[shell] the workstation did not load; falling back', e); }
}

Shell.registerViews({
  desk: DeskView, product: ProductView, agents: AgentsView, research: ResearchView,
  market: MarketView, world: WorldView, story: StoryView, legacy: LegacyView,
});

let inGame = false;

// ═══ BOOT ═══════════════════════════════════════════════════════════════════
startBackground();

// ═══ ACTIONS ════════════════════════════════════════════════════════════════
// A login tile carries the slot it stands for, so "New timeline" on the empty
// third tile begins a run *there* rather than over the one on the first.
onAction('new-game', (d) => { sfx('choose'); if (d?.v) Save.setSlot(Number(d.v)); Intro.showIntro(0); });
// A new machine has no run and therefore no Settings screen yet. Import lives
// on the title too, so moving a run never requires creating a disposable one.
onAction('import-save-file', () => {
  sfx('click');
  Save.pickSaveFile((ok, reason) => {
    if (ok) { location.reload(); return; }
    if (reason) toast({ icon: '⚠', title: reason, kind: 'bad' });
  });
});
onAction('pick-slot', (d) => { sfx('click'); Save.setSlot(Number(d.v)); Intro.showTitle({ cold: false }); });
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
onAction('pick-pace', (d) => { sfx('click'); Intro.setDraft('pace', d.v); });
onAction('pick-ng', (d) => { sfx('click'); Intro.setDraft(d.v, !Intro.draft[d.v]); });

onAction('start-game', async () => {
  const cfg = Intro.getConfig();
  sfx('act');
  const late = cfg.start === 'act3';
  const lines = [`<span class="curtain-mono">${esc(cfg.companyName)}</span>`];
  if (late) lines.push('The first year is already written.', 'You walk in at Act III.');
  else lines.push('The repository is empty.', 'Nobody is waiting on you.');
  if (cfg.assistant === 'play') lines.push('Your assistant is at the table.');
  if (cfg.pace === 'long') lines.push('A month of the company for every day of yours.');
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

onAction('continue-game', (d) => {
  // A tile carries the slot it is for; the plain Continue button carries none
  // and means "the one this browser was last in".
  const s = Game.continueGame(d?.v ? Number(d.v) : null);
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
  // The landing page keeps a node field and two observers alive. Continue goes
  // straight here without passing through the beats, so this is the one place
  // that is on every route out of the first screen.
  Intro.endLanding();
  Transport.reset();
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
  // A decision that was open when the game was saved holds the clock. Queue its
  // return now, but do not fight the welcome-back briefing or another dialog
  // for the modal slot; the restorer keeps trying until that slot is free.
  queueOpenDecisionRestore();
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
  Alarm.clearAlarms();
  // §I12. The alarms must not import the shell — the shell imports the console,
  // which imports the views, which import the alarms — so the paint is handed
  // in, the way the world chip and the saved-ago line are.
  Alarm.registerRepaint(() => { Shell.paintMain(); Shell.paintTopbar(); });
  Shell.buildShell();
  Loop.start();
  // §I9. The first morning of the session. After the power-on, so it lands on a
  // machine that is already up rather than under the boot sweep — and forced,
  // because a founder who opens the game at 3× still gets one.
  setTimeout(() => sayMorning(true), 2200);
  Tutorial.registerShell({
    setView: Shell.setView,
    getView: Shell.getView,
    alias: Shell.anchorAlias,
    showing: Shell.showing,
    os: Shell.isOs(),
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
let decisionRestoreTimer = null;

// A saved decision and the dialog that explains the time away arrive through
// different systems. The old restore made one attempt after 400ms; if the
// briefing was still open at that instant it abandoned the card forever while
// `activeEvent` continued to hold the clock. Keep the exact decision captured
// on entry queued until the modal slot is free. Capturing the object also keeps
// this from opening a brand-new card early on the workstation, before its own
// incoming-card announcement has finished.
function queueOpenDecisionRestore() {
  if (decisionRestoreTimer) clearTimeout(decisionRestoreTimer);
  decisionRestoreTimer = null;
  const event = S?.narrative?.activeEvent || null;
  const call = event ? null : Calls.activeCall(S);
  if (!event && !call) return;

  const attempt = () => {
    decisionRestoreTimer = null;
    if (!inGame || !S) return;
    if (event && S.narrative?.activeEvent !== event) return;
    if (call && Calls.activeCall(S) !== call) return;
    if (event && document.getElementById('event-modal')) return;
    if (call && Modal.isCallOpen()) return;
    if (Modal.isModalOpen()) {
      decisionRestoreTimer = setTimeout(attempt, 120);
      return;
    }

    if (event) {
      Modal.showEvent(event);
      // A reload may land at any of the card's three signed states, not only at
      // the initial choices. Restore what the founder was actually looking at.
      if (event.proposal) Modal.showProposal(event, event.proposal);
      else if (event.outcome) Modal.showOutcome(event, event.outcome, event.effects);
    } else {
      // A call is the same kind of clock-holding decision and needs the same
      // retry when the welcome-back briefing got the modal slot first.
      paintCall();
    }
  };
  decisionRestoreTimer = setTimeout(attempt, 400);
}
function bootWorld() {
  Shell.registerWorldChip(() => WorldConsole.statusChip());
  // The Uplink shows the hand an assistant would arrive with when there is no
  // world layer to report on. `intro.js` owns that list; the console is told,
  // rather than importing it, because the import would close a cycle through
  // the whole WebMCP surface.
  WorldConsole.registerHand(() => Intro.openingHand());
  Modal.setFreeTextProvider(() => World.founderInputState(S));
  // §B6. Off unless the founder asked for it. Called once, when a plate opens.
  Modal.setPreviewProvider((ev) => Preview.previewChoices(S, ev));
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
      // The eight modules, plus whatever else this housing can be told to open.
      // On the workstation that is the Record, the Uplink, ARIA, the Manual and
      // Settings; on the console it is nothing, and the enum is the same eight
      // it has always been.
      views: (s) => Shell.VIEWS.filter((v) => !v.req || v.req(s)).concat(Shell.extraViews(s)),
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
  // The plug stops everything, including a script that is mid-sentence and a
  // local model that is mid-turn.
  const go = () => { Demo.stop(); Resident.stop();
    MCP.mute().then(() => { WorldConsole.paintAuthor(); Shell.paintStatus(); Shell.paintMain(); }); };
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

// The same consumption, driven by a model instead of a list. The button exists
// only in a browser that has one; everything it does goes out through
// `getTools()` and `executeTool()` and comes back through the same bounds.
onAction('resident-run', () => {
  sfx('prompt');
  Resident.run().then((r) => {
    if (!r.ok) toast({ icon: '\u26a0', title: 'Cannot start the local model', sub: r.reason, kind: 'warn' });
  });
});
onAction('resident-stop', () => { sfx('click'); Resident.stop(); });

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
  // The workstation has a window for this and opens it instead; the console
  // has one home for the panel and it is a dialog.
  if (Shell.showWorldConsole()) return;
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
// A transport key clicked with the mouse keeps focus, and a focused button
// answers Space itself — so the next Space both toggled pause here and
// re-activated the button, which is a pause and an unpause in one keystroke.
// `detail` is 0 for a click synthesised from the keyboard and ≥ 1 for a real
// pointer, so this hands focus back only to the hand that did not ask for it.
const unfocusKey = (el, e) => { if (e && e.detail > 0) { try { el?.blur?.(); } catch { /* not focusable */ } } };
onAction('speed', (d, el, e) => {
  const v = Number(d.v);
  if (v === 0) Transport.togglePause();
  else Transport.setSpeed(v);
  unfocusKey(el, e);
  Shell.paintTopbar();
});
// Run at the top speed until something asks for the founder, then hold.
// Pressing it again mid-run stops it where it is.
onAction('next-decision', (d, el, e) => {
  if (!inGame) return;
  const r = Transport.seek();
  unfocusKey(el, e);
  if (!r.ok) {
    if (el) shake(el);
    toast({ icon: '▸❚', title: 'Not now.', sub: r.reason, kind: 'bad', ms: 2600 });
    return;
  }
  sfx(r.stopped ? 'click' : 'prompt');
  if (!r.stopped) {
    toast({ icon: '▸❚', title: 'Running to the next decision.',
      sub: 'A card, a thread, a letter, an incident or a finished node stops it. Space stops it sooner.', ms: 3800 });
  }
  Shell.paintTopbar(); Shell.paintStatus();
});
onAction('view', (d) => Shell.setView(d.v));
// The dock is a toggle, not a shortcut: pressing the tile of the app you are
// looking at puts it away. The console has no dock and ignores this.
onAction('os-dock', (d) => Shell.toggleFromDock(d.v));
onAction('branch', (d) => { ResearchView.setBranch(d.v); Shell.paintMain(); });
onAction('world-tab', (d) => { WorldView.setWorldTab(d.v); sfx('click'); Shell.paintMain(); });
// §B1. A "why" panel shuts and stays shut: `S.ui.whyShut` is view state on the
// save, so the founder who has read it once is not handed it again every reload.
onAction('why', (d) => { Why.toggleWhy(d.v, S); sfx('click'); Shell.paintMain(); });

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

// The chip used to count keypresses — `15× flow` — which celebrated the
// mashing rather than the thing the mashing was for. It says how close the run
// of actions has brought the next feature now, and the toast at fifteen names
// what got built instead of how many keys were pressed. The count is still
// kept, because the *rhythm* is what decides when to say anything at all.
let streak = 0, streakAt = 0;
function bumpStreak() {
  const now = performance.now();
  streak = now - streakAt < 1500 ? streak + 1 : 1;
  streakAt = now;
  if (streak >= 5 && streak % 5 === 0) {
    const el = document.getElementById('streak');
    const p = activeProduct(S);
    const cost = p ? featureCost(S, p) : 0;
    if (el) {
      el.textContent = cost > 0
        ? (S.resources.code >= cost ? 'a feature is ready to ship'
          : `${Math.round((S.resources.code / cost) * 100)}% of the next feature`)
        : '';
      el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    }
    if (streak === 15 && cost > 0) {
      const left = Math.max(0, cost - S.resources.code);
      toast({ icon: '⌘', title: 'That is a feature taking shape.',
        sub: left > 0 ? `${fmt(Math.ceil(left))} more code and it ships.` : 'Enough code. Ship it.',
        kind: 'good', ms: 2600 });
    }
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

// ── §I10. The console's own doors ───────────────────────────────────────────
// Mail and Contacts as sheets, and the focus mode. Every one of these is
// registered here rather than in `shell-console.js` because `onAction` is a Map
// and the workstation registers *over* the first two — so on a desktop the same
// press opens a window and here it opens a sheet, and neither housing has to
// know about the other.
onAction('open-mail', () => { sfx('click'); Dialogs.showMailDialog(); });
onAction('open-contacts', () => { sfx('click'); Dialogs.showContactsDialog(); });
onAction('mail-open', (d) => {
  const id = Number(d.v);
  ((S.ui ??= {}).os ??= {}).mail = id;
  markRead(S, id);
  if (!Dialogs.repaintMailDialog()) Dialogs.showMailDialog();
  Shell.paintFeed(); Shell.paintTopbar();
});
onAction('mail-back', () => { ((S.ui ??= {}).os ??= {}).mail = null; Dialogs.repaintMailDialog(); });
onAction('mail-read-all', () => { markAllRead(S); Dialogs.repaintMailDialog(); Shell.paintTopbar(); });
onAction('contact-select', (d) => {
  ((S.ui ??= {}).os ??= {}).contact = d.v || null;
  if (!Dialogs.repaintContactsDialog()) Dialogs.showContactsDialog();
});
onAction('contact-back', () => { ((S.ui ??= {}).os ??= {}).contact = null; Dialogs.repaintContactsDialog(); });

// Collapse the nav to icons and put the Wire away. One class on `#app`, so the
// two stylesheets own the whole of it and nothing here measures anything.
onAction('focus-mode', () => {
  const app = document.getElementById('app');
  if (!app) return;
  const on = app.classList.toggle('focus-mode');
  if (on) app.classList.remove('wire-open');
  sfx('click');
  Shell.paintTopbar(); Shell.paintNav(); Shell.paintStatus();
  toast({ icon: '◱', title: on ? 'Focus mode.' : 'Everything back.',
    sub: on ? 'The nav is icons and the Wire is away. F brings it back.' : '', ms: 2400 });
});

// §I4. The list. Generated every morning, ticked for today only. The
// workstation registers over these to repaint its own window as well.
onAction('todo-tick', (d) => {
  toggleTodo(S, d.v);
  sfx('click');
  Shell.paintMain(); Shell.paintTopbar();
});
onAction('todo-clear', () => {
  const t = ((S.ui ??= {}).todoDone ??= { day: Math.floor(S.time.day), ids: {} });
  t.ids = {};
  Shell.paintMain(); Shell.paintTopbar();
});

// §C9. Spend the bar. Which hand it spends is a setting the Desk shows and the
// key uses, so `G` is always the sentence the strip is printing.
onAction('spend-hand', (d) => {
  S.ui ??= {};
  S.ui.spendHand = d.v;
  sfx('click');
  Shell.paintMain();
});

onAction('spend-bar', (d, el) => {
  const hand = d.v || S.ui?.spendHand || 'prompt';
  const r = Spend.run(S, hand);
  if (!r.ok) { shake(el); if (r.note) toast({ icon: '⚠', title: r.note, kind: 'bad', ms: 2200 }); Shell.paintMain(); return; }
  sfx(hand === 'post' ? (r.viral ? 'viral' : 'post') : hand === 'users' ? 'insight' : 'code');
  const why = { target: 'The target is met.', floor: 'The bar is spent.',
    interrupted: 'Something wants you.', refused: 'It stopped there.', cap: 'That is as far as it goes.' }[r.reason] || '';
  toast({ icon: '⌘', title: `${VERB[hand] || hand}, ${r.n} time${r.n === 1 ? '' : 's'}.`,
    sub: [Spend.summarise(S, hand, r), why].filter(Boolean).join(' · '), kind: 'good', ms: 4200 });
  World.observeFounderAction(S, {
    surface: 'desk', action: 'spend_the_bar', summary: `${VERB[hand] || hand} ${r.n} times`,
    details: { hand, times: r.n, stopped: r.reason },
  });
  Tutorial.notifyAction('do', hand);
  Shell.paintMain(); Shell.paintTopbar();
});

const VERB = { code: 'Wrote code', prompt: 'Prompted the machine', users: 'Talked to users', post: 'Posted' };

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

// §A23a / §A7. Two one-line verbs: an extra standing-order slot, and a
// quarterly intention. Both refuse in their own systems and both are pure of
// UI, so this is the whole of the wiring.
onAction('set-order', (d, el) => { if (setOrder(S, Number(el?.dataset?.slot || 0), d.v).ok) { markDirty(); sfx('choose'); Shell.paintMain(); } });
onAction('plan-toggle', (d) => { if (toggleIntention(S, d.v).ok) { sfx('click'); Shell.paintMain(); } });

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
// §A20. The door Frugal Empire closes, opened on purpose: the bonus stops
// today rather than lapsing quietly four months after the round lands.
onAction('forfeit-doctrine', (d) => {
  if (forfeitDoctrine(S, d.v)) { sfx('click'); Shell.paintMain(); Shell.paintNav(); }
});

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
      { label: 'Reset the timeline', cls: 'btn-violet', fn: async () => {
        const { gain } = Game.prestige(S);
        Loop.stop();
        inGame = false;
        Modal.closeModal();
        await Shell.powerDown();
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
  else if (r.reason === 'rival') toast({ icon: '⊘', title: `${r.who || 'Somebody'} holds this bloc.`, sub: 'At this depth a bloc runs on one supplier. Displace them first.', kind: 'bad' });
  else if (r.reason === 'stance') toast({ icon: '◈', title: 'Standing too low.', sub: 'Court them first, or improve how the world sees you.', kind: 'bad' });
  Shell.paintMain(); Shell.paintTopbar();
});
// §A10. Buying out whoever is already in the bloc. Costly, noticed, and the
// only door to partnership and sovereign integration where somebody is.
onAction('displace', (d) => {
  const r = displaceRival(S, d.v);
  if (r.ok) { sfx('achieve');
    toast({ icon: '⊘', title: `**${r.who}** is out of the bloc.`,
      sub: 'Their contracts are yours. Somebody noticed how.', kind: 'good', ms: 5200, show: 'world' }); }
  else if (r.reason === 'cash') toast({ icon: '$', title: 'Not enough cash.', kind: 'bad' });
  else if (r.reason === 'stance') toast({ icon: '◈', title: 'Standing too low.', sub: 'A state will not drop a supplier for somebody it barely knows.', kind: 'bad' });
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
  toast({ icon: '⊕', title: `**${region.name}** — ${STAGES_NAME(stage)}`, sub: 'Complete.', kind: 'good', ms: 5500, show: 'world' });
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

// Later. A week further out and below whatever is still asking — the founder
// saying "not now" out loud rather than scrolling past it. Once per thread;
// the second press is refused by name and the row says so.
onAction('thread-later', (d, el) => {
  const r = snoozeThread(S, d.v);
  if (!r.ok) { shake(el); return; }
  sfx('click');
  toast({ icon: '◷', title: 'Later.', sub: `Back in ${r.days} days, below whatever is still asking.`, ms: 2600 });
  Shell.paintFeed(); Shell.paintTopbar();
});

// A letter in the rail is an envelope. In the console it unfolds where it is;
// the workstation registers over this and opens Mail, which is the app that
// already holds the whole letter.
onAction('feed-letter', (d) => {
  const id = Number(d.v);
  S.ui ??= {};
  S.ui.letterOpen = S.ui.letterOpen === id ? null : id;
  if (S.ui.letterOpen != null) markRead(S, id);
  sfx('click');
  Shell.paintFeed(); Shell.paintTopbar(); Shell.paintNav();
});

// ── The phone ──────────────────────────────────────────────────────────────
// Anyone the founder has met can be called. The call is a modal, like a card,
// and it holds the clock like one. `callView` is the whole bridge between the
// phone system and the plate: the modal never reads game state itself.
function callView(opts = {}) {
  // An ended call is no longer the active one, but its plate stays up until
  // the founder puts the phone down — so the caller hands it in.
  const call = opts.call || Calls.activeCall(S);
  if (!call) return null;
  const c = CHARACTERS[call.char] || {};
  const r = S.narrative.relationships?.[call.char] || {};
  const live = call.mode === 'world';
  const pending = call.pending && !call.pending.answered ? call.pending : null;
  const status = call.done ? call.endedBy
    : live && pending ? (pending.delivered ? 'writing' : 'queued')
    : live && !World.isPresent(S) ? 'quiet'
    : 'connected';
  const since = Calls.lastCallWith(S, call.char);
  const aff = Math.round(r.affinity || 0);
  return {
    call, person: c, live, status, pending,
    options: Calls.options(S),
    deal: describeEffects(Calls.dealOnTable(S)),
    said: Calls.roundsSaid(call), max: CALLS.MAX_ROUNDS,
    dossier: {
      bio: c.bio, wants: c.wants, knows: c.knows,
      standing: `${arcLabel(call.char, r.arc || 0)} · ${aff >= 0 ? '+' : ''}${aff}`,
      since: since && since.id !== call.id ? `day ${since.day}` : 'never, before this',
      remembers: (r.memory || []).slice(0, 3).map((m) => m.text),
    },
    typeLast: opts.typeLast || null,
  };
}
function paintCall(opts) { const v = callView(opts); if (v) Modal.showCall(v); }

onAction('copy-invite', (d, el) => {
  const link = inviteLink(S);
  if (!link) return;
  const sub = inviteReach() === 'this machine'
    ? 'From localhost it reaches only this machine; open the game from the address npm start prints for another one.'
    : 'Anyone on this network can sit in Vance\'s chair with it.';
  Promise.resolve().then(() => navigator.clipboard.writeText(link))
    .then(() => toast({ icon: '☎', title: 'Copied. Open it in a second window.', sub, ms: 4200 }))
    .catch(() => { if (el) shake(el); toast({ icon: '☎', title: 'Could not copy — select the link instead.', kind: 'bad' }); });
});

onAction('call', (d, el) => {
  const r = Calls.startCall(S, d.v);
  if (!r.ok) {
    if (el) shake(el);
    const c = CHARACTERS[d.v];
    toast({ icon: '☎', title: c ? `${c.name} — ${String(r.note || 'not now').toLowerCase()}` : 'No such number.',
      sub: r.reason === 'cooldown' || r.reason === 'cold' ? Calls.busyLine(S, d.v) : '', kind: 'bad', ms: 3800 });
    return;
  }
  sfx('event');
  paintCall({ typeLast: r.call.rounds[0]?.text });
  Shell.paintMain(); Shell.paintTopbar();
});
Modal.setCallHandlers({
  topic: (id) => {
    const r = Calls.say(S, id);
    if (!r.ok) return;
    sfx('choose');
    paintCall({ typeLast: r.reply });
    Shell.paintTopbar();
  },
  say: async (text) => {
    const r = Calls.founderSays(S, text);
    if (r.ok) { sfx('choose'); Save.save(S); paintCall(); }
    return r;
  },
  hangUp: (accept) => {
    const r = Calls.hangUp(S, { accept });
    if (!r.ok) return;
    sfx('click');
    paintCall({ call: r.call });
    Shell.paintTopbar(); Shell.paintMain(); Shell.paintFeed();
    Save.save(S);
  },
});
on('call:reply', ({ line }) => { sfx('event'); paintCall({ typeLast: line }); });
on('call:end', ({ by, call }) => { if (by !== 'founder') { sfx('bad'); paintCall({ call }); } });
on('call:start', ({ call, by }) => {
  if (by === 'founder') return;
  sfx('event');
  const ann = Shell.announceCard({ char: call.char, kind: 'character' });
  const show = () => { if (Calls.activeCall(S) === call) paintCall({ typeLast: call.rounds[0]?.text }); };
  if (ann && typeof ann.then === 'function') ann.then(show); else show();
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
// Through the registry, not straight to the function: the workstation answers
// all three of these with a window rather than a dialog, and it does that by
// registering over them.
const key = (name) => () => { if (inGame && !Modal.isModalOpen()) runAction(name); };
onKey('?', key('help'));
onKey('/', key('help'));
onKey('a', key('ask-aria'));

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
  // §A17: the two dials the ledger has always had rows for. Both tops are a
  // share of daily revenue, so the stored number is dollars and the slider is
  // the fraction of what the company could afford to commit today.
  if (kind === 'marketing') {
    S.company.marketingBudget = Math.round(value * marketingMax(S));
    Shell.paintMain();
  }
  if (kind === 'infra') {
    S.company.infraSpend = Math.round(value * infraMax(S));
    Shell.paintMain();
  }
  // §A9: the compute allocation. One lane moves and the other two absorb it.
  if (kind === 'csplit') { setComputeShare(S, id, value); markDirty(); Shell.paintMain(); }
  if (kind === 'autonomy') {
    const a = setAutonomy(S, id, value);
    if (a) {
      World.observeFounderAction(S, {
        surface: 'agents', action: 'set_agent_autonomy', summary: `set ${a.name} autonomy to ${Math.round(value * 100)}%`,
        details: { agent: a.name, autonomy: value }, routine: true,
      });
      Shell.paintMain();
    }
  }
});

// ── Keys ───────────────────────────────────────────────────────────────────
onKey(' ', (e) => { if (!inGame || Modal.isModalOpen()) return; e.preventDefault(); Transport.togglePause(); });
// The rest of the transport. `-` steps the clock down to a stop and `=` steps
// it up (`+` is the same key with Shift held); `N` runs to the next decision.
// Same guard as Space: never under a card or a dialog. `main.js` runs once, so
// these are registered once — the Set-per-key rule only bites in a shell that
// is rebuilt on a prestige.
const clockKey = (fn) => (e) => { if (!inGame || Modal.isModalOpen()) return; e.preventDefault(); fn(); };
onKey('-', clockKey(() => Transport.stepSpeed(-1)));
onKey('=', clockKey(() => Transport.stepSpeed(1)));
onKey('+', clockKey(() => Transport.stepSpeed(1)));
onKey('n', clockKey(() => runAction('next-decision')));
onKey('q', (e) => triggerAction('code', e));
onKey('w', (e) => triggerAction('prompt', e));
onKey('e', (e) => triggerAction('users', e));
onKey('r', (e) => triggerAction('post', e));
// §C9. The eleventh press, once. It goes through `triggerAction`'s guards by
// hand rather than through the button, because the strip's key is the whole
// point: a founder who has decided to spend the bar should not have to be
// looking at the Desk to do it.
onKey('g', (e) => {
  if (!inGame || Modal.isModalOpen()) return;
  e?.preventDefault?.();
  if (Shell.getView() !== 'desk') Shell.setView('desk');
  runAction('spend-bar');
});
// §I10. Three console keys. `f` is Find on the workstation, registered below
// its own `wiredOnce` guard, so this one steps aside there rather than firing
// beside it — `onKey` keeps a Set per key and two handlers on one press is the
// bug that made `f` open Find, close it and open it again.
const consoleKey = (fn) => (e) => {
  if (!inGame || Modal.isModalOpen() || Shell.isOs()) return;
  if (document.activeElement?.matches?.('input, textarea')) return;
  e?.preventDefault?.();
  fn();
};
onKey('f', consoleKey(() => runAction('focus-mode')));
onKey('m', consoleKey(() => runAction('open-mail')));
onKey('c', consoleKey(() => runAction('open-contacts')));

onKey('s', () => {
  if (!inGame || Modal.isModalOpen()) return;
  const r = Game.doShipFeature(S);
  // The walkthrough watches the button; the key has to report itself.
  if (r?.ok) Tutorial.notifyAction('ship');
  Shell.paintMain();
});
for (let i = 1; i <= 9; i++) {
  onKey(String(i), () => {
    if (S?.narrative.activeEvent && !S.narrative.activeEvent.outcome) {
      const btn = document.querySelector(`[data-choice="${i - 1}"]`);
      if (btn) btn.click();
      return;
    }
    // On a written call the digits are what you say next, as they are on a card.
    if (Modal.isCallOpen()) {
      const b = document.querySelectorAll('[data-call-topic]')[i - 1];
      if (b) b.click();
      return;
    }
    // Otherwise the digits are the module rack, in the order the housing shows
    // them — the nav in the console, the dock on the workstation.
    if (inGame && !Modal.isModalOpen()) { Shell.viewByIndex(i - 1); return; }
  });
}
onKey('enter', () => {
  const b = document.getElementById('event-continue') || document.getElementById('call-close');
  if (b) { b.click(); return; }
  if (inGame) return;
  document.querySelector('[data-act="start-game"], [data-act="beat-next"], [data-act="new-game"]')?.click();
});
onKey('arrowright', () => { if (!inGame) document.querySelector('[data-act="beat-next"]')?.click(); });
onKey('arrowleft', () => { if (!inGame) document.querySelector('[data-act="beat-back"]')?.click(); });
onKey('escape', () => {
  if (AssistantHandoff.isOpen()) { AssistantHandoff.dismiss(); return; }
  // A menu, a popover or the Notification Center is the shallowest thing open
  // on the workstation and Escape belongs to it first. The console has none of
  // those and says so.
  if (Shell.escape()) return;
  const app = document.getElementById('app');
  if (app?.classList.contains('wire-open') && !Modal.isModalOpen()) {
    app.classList.remove('wire-open'); return;
  }
  // A call in progress is hung up, never dismissed: the founder has to put the
  // phone down on purpose. A finished one closes like any dialog.
  if (Modal.isCallOpen() && Calls.activeCall(S)) return;
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
  keep: (ev) => {
    const r = Keep.keepCard(S, ev?.runtime || Keep.memoryOf(S, ev));
    if (r.ok) { sfx('achieve'); Save.saveLegacy(S.legacy); toast({ icon: '⊕', title: `Kept **${r.card.title}**`, sub: 'It joins the written deck in every timeline after this.', kind: 'good', ms: 4200 }); }
    return r;
  },
});

// ── The chronicle ──────────────────────────────────────────────────────────
function showBook(book, title) {
  Modal.dialog({ title: title || book.title, wide: true,
    body: `<div class="chronicle in-dialog">${chronicleHtml(book)}</div>`,
    actions: [{ label: 'Copy the chronicle', keepOpen: true, fn: () => {
      navigator.clipboard?.writeText(toText(book)).then(() => toast({ icon: '✓', title: 'Copied', kind: 'good' }), () => {});
    } }, { label: 'Close', cls: 'btn-primary' }] });
}
onAction('chronicle-now', () => { sfx('click'); showBook(chronicle(S)); });
onAction('chronicle-copy', async () => {
  try { await navigator.clipboard.writeText(toText(chronicle(S))); toast({ icon: '✓', title: 'The book so far, copied.', kind: 'good' }); }
  catch { toast({ icon: '⚠', title: 'Could not copy.', kind: 'bad' }); }
});
onAction('chronicle-read', (d) => {
  const shelf = Array.isArray(S.legacy.chronicles) ? S.legacy.chronicles : [];
  const b = shelf[Number(d.v)];
  if (!b) return;
  sfx('click');
  Modal.dialog({ title: `${b.company} — ${b.endingName}`, wide: true,
    body: `<pre class="chronicle-text">${esc(b.text)}</pre>`,
    actions: [{ label: 'Copy', keepOpen: true, fn: () => navigator.clipboard?.writeText(b.text).then(() => toast({ icon: '✓', title: 'Copied', kind: 'good' }), () => {}) },
              { label: 'Close', cls: 'btn-primary' }] });
});

// ── Kept cards ─────────────────────────────────────────────────────────────
// From the Log: a world card that has closed can still be kept.
onAction('keep-card', (d, el) => {
  const [id, day] = String(d.v || '').split('@');
  const j = S.narrative.journal.find((e) => e.id === id && String(e.day) === String(day));
  if (!j) { if (el) shake(el); return; }
  const r = Keep.keepCard(S, j.runtime || Keep.memoryOf(S, j), { day: j.day });
  if (!r.ok) { if (el) shake(el); toast({ icon: '·', title: r.reason, kind: 'bad', ms: 2600 }); return; }
  sfx('achieve'); Save.saveLegacy(S.legacy);
  toast({ icon: '⊕', title: `Kept **${r.card.title}**`, sub: 'It joins the written deck in every timeline after this.', kind: 'good', ms: 4200 });
  Shell.paintMain();
});
onAction('keep-forget', (d) => {
  if (Keep.forget(S, d.v)) { sfx('click'); Save.saveLegacy(S.legacy); Shell.paintMain(); }
});
onAction('keep-export', async () => {
  const txt = Keep.exportKept(S);
  try { await navigator.clipboard.writeText(txt); toast({ icon: '⊕', title: 'Deck copied.', sub: `${Keep.kept(S).length} kept card${Keep.kept(S).length === 1 ? '' : 's'}, as JSON.`, kind: 'good' }); }
  catch { toast({ icon: '⚠', title: 'Could not copy the deck.', kind: 'bad' }); }
});
onAction('keep-link', async () => {
  const link = `${location.origin}${location.pathname}#deck=${Keep.encodeDeck(S)}`;
  try { await navigator.clipboard.writeText(link); toast({ icon: '⊕', title: 'Link copied.', sub: `${Keep.kept(S).length} card${Keep.kept(S).length === 1 ? '' : 's'} travel with it.`, kind: 'good' }); }
  catch { toast({ icon: '⚠', title: 'Could not copy the link.', kind: 'bad' }); }
});
onAction('keep-import', () => {
  Dialogs.pasteDialog({
    title: 'Import a deck', verb: 'Keep them',
    hint: 'Paste the JSON this game exports from <b>Copy the deck</b>. Every card in it is dealt under the same ceilings as anything the world writes.',
    placeholder: '[ { "title": … } ]',
    submit: (v) => {
      const r = Keep.importKept(S, v);
      if (!r.ok) return { ok: false, reason: r.reason };
      sfx('achieve'); Save.saveLegacy(S.legacy);
      toast({ icon: '⊕', title: `${r.added} card${r.added === 1 ? '' : 's'} kept.`, sub: r.refused ? `${r.refused} refused — not cards the deck could deal.` : '', kind: 'good', show: 'legacy' });
      Shell.paintMain();
      return { ok: true };
    },
  });
});

// A card from a person announces itself on the workstation before it opens —
// the founder's machine says who is calling. Everything else, and every card in
// the console, opens straight away.
on('event:present', (ev) => {
  sfx('event');
  Transport.hold('card');
  const ann = Shell.announceCard(ev);
  if (ann && typeof ann.then === 'function') ann.then(() => { if (S?.narrative.activeEvent === ev) Modal.showEvent(ev); });
  else Modal.showEvent(ev);
});
on('objective', (o) => { sfx('money'); toast({ icon: '✓', title: `**${o.title}**`, sub: 'Objective complete', kind: 'good', ms: 3400, show: 'desk' }); });
on('agent:hired', () => sfx('hire'));
on('project:started', () => sfx('project'));
on('project:done', ({ project }) => { sfx('achieve');
  toast({ icon: project.icon, title: `**${project.name}** complete`, sub: project.desc, kind: 'good', ms: 6000, show: 'world' }); });
on('agent:rogue', () => sfx('alarm'));

on('doctrine', (d) => {
  sfx('viral');
  toast({ icon: d.icon, title: `**${d.name}**`, sub: 'Doctrine earned — held while you keep it true.',
    kind: 'achievement', ms: 7000, show: 'legacy' });
  Shell.paintNav();
});

// §A20. A doctrine is a standing condition now, and this is the moment it stops
// being true for long enough to matter. The shelf keeps it; the company does
// not — and anything the world layer lost to it is handed straight back.
on('doctrine:lapsed', (d) => {
  sfx('alarm');
  toast({ icon: d.icon, title: `**${d.name}** lapsed`,
    sub: 'The bonus is gone. It stays on the shelf, and you can earn it again.',
    kind: 'bad', ms: 7000, show: 'legacy' });
  Shell.paintNav();
});

on('save', () => Shell.markSaved());

on('achievement', (a) => {
  sfx('achieve');
  toast({ icon: a.icon || '★', title: `**${a.name}**`, sub: a.desc, kind: 'achievement', ms: 5200, show: 'legacy' });
});

on('act:advance', ({ act }) => {
  if (act >= 5) WorldView.setWorldTab('ascend');
  sfx('act');
  // A founder-requested run to the next decision ends here. The transition
  // itself is a transient blocker: it must not impersonate the pause button or
  // leave the founder responsible for restarting a clock they never stopped.
  Transport.hold('act');
  const actState = S;
  const priorBlock = { has: Object.prototype.hasOwnProperty.call(actState, 'modalBlocking'), value: actState.modalBlocking };
  actState.modalBlocking = 'act-transition';
  Modal.showActTransition(act, () => {
    if (actState.modalBlocking === 'act-transition') {
      if (priorBlock.has) actState.modalBlocking = priorBlock.value;
      else delete actState.modalBlocking;
    }
    Shell.paintTopbar(); Shell.paintStatus();
  });
  Shell.paintNav();
});

on('research:done', ({ node }) => {
  sfx('research');
  toast({ icon: '⌬', title: `**${node.name}**`, sub: node.desc, kind: 'good', ms: 4600, show: 'research' });
  Transport.hold('research');
  Shell.paintNav();
});

on('incident', ({ incident, severity }) => {
  sfx('bad');
  toast({ icon: '⚠', title: `**${incident.name}**`, sub: incident.text, kind: 'bad', ms: 5200, show: 'product' });
  // §I12. The product broke, so the Product panel says so — not only a toast
  // in the corner of whatever screen the founder happened to be on.
  Alarm.raise('incident', 3200);
  Transport.hold('incident');
  Transport.autoPause('incident');
});

on('agent:rogue', ({ agent }) => {
  toast({ icon: '▨', title: `${agent.name} shipped without approval.`, kind: 'bad', ms: 5000, show: 'agents' });
  // §I12. The card that went rogue, and the rack it is in, light for a moment.
  Alarm.raise('rogue');
  if (agent?.id) Alarm.raise(`agent:${agent.id}`, 4200);
  Transport.hold('rogue');
  Transport.autoPause('rogue');
});
on('agent:left', ({ agent, reason }) => {
  if (reason === 'quit') toast({ icon: '◌', title: `${agent.name} has left.`, sub: 'Weeks under the morale line. The archive has the rest.', kind: 'bad', ms: 6000, show: 'agents' });
  else if (reason === 'poached') toast({ icon: '⚔', title: `${agent.name} was poached.`, sub: 'They came for your people, and one of them went.', kind: 'bad', ms: 6000, show: 'agents' });
});

// §I6. Four sources, four cues. Everything that arrived used to arrive as one
// sound — `notify` — so a letter, a thread, an agent finishing something and
// the press were indistinguishable and none of them said where to look. Each
// is quiet, under 200ms, and none may be louder than the card.
//
// Guarded the same way the day tick is: never for a day the founder did not
// watch pass. Offline catch-up delivers a fortnight of post in one second.
const canCue = () => inGame && S && !S._offline && !S._forecast && S.meta?.realtime && !document.hidden;
let lastCue = 0;
function cue(name) {
  if (!canCue()) return;
  const now = performance.now();
  if (now - lastCue < 260) return;     // two arrivals in one tick is one sound
  lastCue = now;
  sfx(name);
}
on('feed', (item) => {
  if (!item) return;
  if (item.type === 'mail') return;                  // the `mail` event has its own
  if (item.thread && !item.resolved) { cue('cueThread'); return; }
  if (item.type === 'log') { cue('cueAgent'); return; }
  if (item.type === 'news' || item.type === 'hn') cue('cuePress');
});
on('mail', (item) => { if (!item?.mail?.quiet) cue('cueMail'); });

// The account goes under. Not an alarm — `bad` already exists for a thing that
// went wrong — but a pad that swells and sits, because this is a state the
// company has entered rather than an event. Once per crossing: `S.stats` keeps
// whether it was already underwater, so a run that hovers at zero does not
// swell every tick.
on('day', () => {
  if (!S) return;
  const under = S.company.cash < 0;
  if (under === !!S.stats.wasUnderwater) return;
  S.stats.wasUnderwater = under;
  if (!under) return;
  // §I12. The account is under. The number that went under is the one that
  // lights, in both housings, because `statsHtml` builds the strip for both.
  Alarm.raise('stat:cash', 4200);
  if (canCue()) sfx('underwater');
  Transport.autoPause('cash');
});

// §C2. The other threshold the founder can ask to be stopped at, and the only
// one of the five that is not already an event: runway is a derived number
// that drifts rather than a thing that happens. Its own crossing flag, on the
// same once-per-crossing rule as the account going under — a company sitting
// at 29 days for a fortnight is one decision, not fourteen — and it clears
// when the runway comes back, so a raise re-arms it. `runwayDays` is Infinity
// for a profitable company, which is greater than any threshold and therefore
// falls out of the comparison on its own.
on('day', () => {
  if (!S) return;
  const low = runwayDays(S) < TIME.AUTOPAUSE_RUNWAY_DAYS;
  if (low === !!S.stats.wasShortOfRunway) return;
  S.stats.wasShortOfRunway = low;
  if (low) Transport.autoPause('runway');
});

// These are destinations for a founder-requested run to the next decision.
// During ordinary play they notify without touching the pause state — unless
// the founder went to Settings and asked for this one, which is the whole of
// §C2: an opt-in is the founder's hand on the pause button, made in advance.
on('feed', (item) => { if (item?.thread && !item.resolved && item.type !== 'mail') { Transport.hold('thread'); Transport.autoPause('wire'); } });
on('mail', (item) => { Transport.hold('letter'); if (!item?.mail?.quiet) Transport.autoPause('wire'); });
on('call:start', ({ by }) => { if (by !== 'founder') Transport.hold('call'); });

// §A22. The auto-throttle. A card, a ring or a thread is a decision, and a
// decision that opens at 5× is one made under a timer nobody asked for — so
// the two fast speeds drop to 1× while one is on the table and come back when
// it is answered. Six lines, and every one of them is on an event that already
// existed. `Transport.throttle` refuses when the founder is seeking, paused,
// already slow, or has the setting off; `release` refuses to hand the speed
// back if the founder touched the dial in between.
on('event:present', () => Transport.throttle('card'));
on('event:dismissed', () => Transport.release());
on('call:start', () => Transport.throttle('call'));
on('call:end', () => Transport.release());
on('feed', (item) => { if (item?.thread && !item.resolved && item.type !== 'mail') Transport.throttle('thread'); });
on('thread:resolved', () => Transport.release());

// §I9. The morning line. The welcome-back briefing has always been the best
// thing this game does with a paragraph, and it only ever fired after a week
// away. This is the same idea at the scale of a day: one sentence from somebody
// who works here, on the first morning of a session and on each in-game morning
// the founder is slow enough to read one.
//
// At 1× only, deliberately. At 3× a day is under three seconds and a line that
// arrives every two and a half is not a ritual, it is a ticker. Guarded like
// the day tick: never for a day the founder did not watch pass.
let saidOn = -1;
function sayMorning(force = false) {
  if (!inGame || !S || S._offline || S._forecast) return;
  if (!S.meta?.realtime || document.hidden) return;
  if (!force && (S.settings.paused || (S.settings.speed || 1) > 1)) return;
  if (Modal.isModalOpen() || Tutorial.isActive() || S.narrative?.activeEvent) return;
  const day = Math.floor(S.time.day);
  if (saidOn === day) return;
  saidOn = day;
  const line = morningLine(S);
  if (line) Shell.say(line.name, line.text);
}
on('day', () => sayMorning());

// The day tick: one quiet click per day boundary while the clock is slow
// enough to follow, and never for a day the founder did not watch pass —
// offline catch-up, the late start, a forecast. Throttled by the wall clock
// too, so any fast-forward that slips through is one tick rather than a burst.
let lastDayTick = 0;
on('day', () => {
  if (!inGame || !S || S._offline || S._forecast) return;
  if (S.settings.paused || (S.settings.speed || 1) > TIME.TICK_MAX_SPEED) return;
  if (!S.meta.realtime || document.hidden) return;
  const now = performance.now();
  if (now - lastDayTick < 1200) return;
  lastDayTick = now;
  sfx('tick');
});

on('founder:level', ({ level }) => {
  sfx('levelUp');
  toast({ icon: '↑', title: `Level ${level}`, sub: 'A skill point is available.', kind: 'good', show: 'desk' });
});

on('ending', ({ ending, state }) => {
  Loop.stop();
  Transport.stop();
  S.settings.paused = true;
  showEnding(ending);
});

async function showEnding(ending) {
  // The machine goes down before the retrospective comes up. In the console
  // this resolves at once and nothing has changed.
  await Shell.powerDown();
  sfx('act');
  showEndingScreen(S, ending, () => {
    const { gain } = Game.prestige(S);
    Loop.stop(); inGame = false; Intro.showTitle({ cold: false });
    toast({ icon: '∞', title: `+${gain} legacy points`, sub: 'A new timeline begins.', kind: 'good', ms: 6000 });
  });
}

// The long game's clock holds once today's month is played. Said once, with
// the override on the same plate, because a clock that stops without saying
// why is a bug and one that cannot be argued with is a cage.
on('long:held', () => {
  const a = Loop.longAllowance(S);
  Modal.dialog({ title: 'The month is played.', centred: true,
    body: `<div class="small dim" style="line-height:1.7">${Math.round(a.used)} live days today, which is a month of the company in the long game.
      Come back tomorrow and another month will have passed on its own — the inbox fills, the market moves, and the first decision is waiting.
      <br><br>Or keep going tonight. The pace is yours; the setting only reminds you what you chose.</div>`,
    actions: [{ label: 'Come back tomorrow', cls: 'btn-primary', fn: () => Transport.setPaused(true) },
              { label: 'Keep going tonight', cls: 'btn-ghost', fn: () => { Loop.longOverride(S); Shell.paintTopbar(); } }] });
});

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

  Modal.dialog({ title: offline.long ? 'Good morning.' : 'While you were gone', wide: true, body: `
    <div class="brief-head">
      <span class="brief-span">day ${offline.from} &rarr; day ${offline.to}</span>
      <span class="brief-note">${offline.long
        ? `${Math.floor(offline.days)} days of the company passed while you lived yours. ${offline.letters ? `${offline.letters} letter${offline.letters === 1 ? '' : 's'} in the post. ` : ''}The first decision is on its way.`
        : `${Math.floor(offline.days)} days ran without you. The machines do not stop.`}</span>
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

// ═══ A DECK ARRIVING AS A LINK ══════════════════════════════════════════════
// `#deck=<base64>` is somebody handing you their kept cards. It runs before the
// title, into the *legacy* store rather than into a run, because there is no
// run yet and kept cards have never belonged to one. Same JSON, same
// `importKept`, same validation as the Paste a deck… dialog — a link is a
// paste with fewer steps and not a second door into the deck.
//
// The fragment is cleared afterwards whatever happens: a reload should not
// import the same deck twice, and a deck in the address bar is not something a
// player should have to tidy up themselves.
if (typeof location !== 'undefined' && /(?:^|[#&])deck=/.test(location.hash || '')) {
  const hash = location.hash;
  try { history.replaceState(null, '', location.pathname + location.search); } catch { location.hash = ''; }
  try {
    const legacy = Save.loadLegacy() || {};
    legacy.kept = Array.isArray(legacy.kept) ? legacy.kept : [];
    const r = Keep.importDeckLink({ legacy }, hash);
    if (r.ok) {
      Save.saveLegacy(legacy);
      toast({ icon: '⊕', title: `${r.added} card${r.added === 1 ? '' : 's'} from a shared deck.`,
              sub: r.refused ? `${r.refused} refused — not cards the deck could deal.`
                             : 'They are dealt in this run and every one after it.',
              kind: 'good', ms: 6000 });
    } else {
      toast({ icon: '⚠', title: 'That link did not carry a deck.', sub: r.reason || '', kind: 'bad', ms: 5000 });
    }
  } catch (e) { console.error('[deck link]', e); }
}

// Dev harness: ?dev=1&cat=devtools&arch=hacker&days=400&view=research&event=e_first_user
// It is its own module, fetched only when asked for — nothing in it ships to a
// player who did not put `dev=1` in the address bar.
if (Q.has('setup')) Intro.showIntro(Number(Q.get('setup')) || 0);
else if (Q.has('dev')) {
  import('./dev.js').then((D) => D.devBoot(Q, { enterGame, showEnding }));
} else { Intro.showTitle({ cold: Q.has('cold') ? true : null }); }
