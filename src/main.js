// ─────────────────────────────────────────────────────────────────────────────
// MAIN — bootstrap, input wiring, render loop.
// ─────────────────────────────────────────────────────────────────────────────
import { S, setState, activeProduct } from './engine/state.js';
import { on, emit } from './engine/bus.js';
import { fmt, money, pct } from './engine/format.js';
import * as Game from './game.js';
import * as Loop from './engine/loop.js';
import * as Save from './engine/save.js';
import { onAction, onKey, onSlider, isDragging, render, esc, md, slider as sliderHtml, tipOpen } from './ui/dom.js';
import { toast, floatFromEvent, shake } from './ui/toast.js';
import * as Modal from './ui/modal.js';
import * as Shell from './ui/shell.js';
import * as Intro from './ui/intro.js';
import * as Tutorial from './ui/tutorial.js';
import * as Nemesis from './systems/nemesis.js';
import { showEnding as showEndingScreen } from './ui/ending.js';
import { startBackground, setBackgroundEnabled } from './ui/background.js';
import * as MCP from './webmcp/index.js';
import * as World from './world/author.js';
import * as WorldConsole from './ui/author.js';
import { screenTools } from './webmcp/tools.js';
import * as Demo from './webmcp/demo.js';
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
import { setPrice, totalUsers, totalMrr, createProduct, featureCost } from './systems/product.js';
import { hireAgent, fireAgent, assignLane, upgradeModel, buyTool, rollCandidate, maxAgents, hireCost } from './systems/agents.js';
import { startResearch, availableResearch } from './systems/research.js';
import { acquireCompetitor } from './systems/market.js';
import { resolveThread } from './systems/feed.js';
import { startProject } from './systems/projects.js';
import { engage as engageRegion, courtRegion } from './systems/regions.js';
import { commit as doCommit } from './systems/commitments.js';
import { askAria } from './systems/aria.js';
import { availableRounds, raiseOffer, acceptRound, ROUND_TYPES } from './systems/economy.js';
import { resolveChoice, dismissEvent } from './systems/narrative.js';
import { markDirty } from './systems/modifiers.js';
import { LEGACY_MAP, LEGACY_PERKS } from './data/legacy.js';
import { DIRECTIVE_MAP, directiveStrength } from './data/directives.js';
import { CATEGORIES, CATEGORY_MAP } from './data/products.js';
import { AGENT_TOOLS, TOOL_MAP, MODELS, SPECIALTIES, TRAIT_MAP } from './data/agents.js';
import { productName } from './data/names.js';
import { CODE_SINK_MAP } from './data/codesinks.js';
import { KEYS, GLOSSARY, ACT_GUIDE, FOOTNOTES } from './data/manual.js';
import { CHARACTERS } from './data/characters.js';
import { KIND_TEXT } from './data/approaches.js';
import { ENDINGS, triggerEnding } from './systems/progression.js';
import { PROJECT_MAP } from './data/projects.js';

Shell.registerViews({
  desk: DeskView, product: ProductView, agents: AgentsView, research: ResearchView,
  market: MarketView, world: WorldView, story: StoryView, legacy: LegacyView,
});

let inGame = false;
let pendingEventShown = null;

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

onAction('start-game', async () => {
  const cfg = Intro.getConfig();
  sfx('act');
  const curtain = Intro.curtain([
    `<span class="curtain-mono">${esc(cfg.companyName)}</span>`,
    'The repository is empty.',
    'Nobody is waiting on you.',
  ]);
  await Intro.wait(1500);
  Game.startNewGame(cfg);
  enterGame();
  await curtain;
  toast({ icon: '⌘', title: 'Write something.', sub: 'Q writes code. W prompts the machine.', kind: 'good', ms: 7000 });
});

onAction('continue-game', () => {
  const s = Game.continueGame();
  if (!s) { toast({ icon: '⚠', title: 'No save found.' }); Intro.showIntro(0); return; }
  enterGame();
});

function enterGame() {
  inGame = true;
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
    onEnd: () => { Shell.paintMain(); Shell.paintTopbar(); Shell.paintNav(); Shell.paintStatus(); },
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
    if (!started && S.tutorialHold && !Tutorial.isActive()) S.tutorialHold = false;
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
  Modal.setFreeTextProvider(() => World.authorMode() === 'agent' && !S?.world?.author?.muted);
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
    on('world:immunity', ({ doctrine, tool, tone, key, line, name }) => {
      toast({ icon: '\u26e8', kind: 'good', ms: 6500,
        title: `**${name}** — the world lost something`,
        sub: line + (tool ? ` (${tool})` : tone ? ` (${tone})` : key ? ` (${key})` : '') });
    });
    on('world:card', () => { Shell.paintStatus(); });
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
  }).then(() => { WorldConsole.paintAuthor(); Shell.paintStatus(); });
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

onAction('author-dialog', () => {
  sfx('click');
  Modal.dialog({ title: 'The world', wide: true,
    body: `<div class="world-console in-dialog">${WorldConsole.panelBody({ full: true })}</div>`,
    actions: [{ label: 'Close' }] });
});

onAction('assistant-link', () => {
  sfx('prompt');
  const links = MCP.deepLinks();
  const cap = MCP.capability();
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
      <div class="tiny dim" style="line-height:1.7">
        Works in the <b>ChatGPT desktop app's built-in browser</b> on GPT-5.6 Sol or Terra — Luna has site
        tools switched off — or in <b>Chrome 149+</b>. Not the ChatGPT web app, the extension, or Codex CLI.
        Enterprise and Edu workspaces are excluded.
      </div></div>`,
    actions: [
      { label: 'Copy the link', fn: () => {
          navigator.clipboard?.writeText(links.app).then(
            () => toast({ icon: '\u2713', title: 'Link copied', kind: 'good' }),
            () => {});
        }, keepOpen: true },
      { label: 'Open ChatGPT', cls: 'btn-primary', fn: () => { try { location.href = links.app; } catch {} } },
    ] });
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
      if (r.viral) toast({ icon: '↗', title: 'It went off.', sub: 'Six hundred thousand views and counting.', kind: 'good' });
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

onAction('toggle-autoship', () => { S.settings.autoShip = S.settings.autoShip === false; Shell.paintMain(); });

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
onAction('pricing', (d) => { const p = activeProduct(S); if (p) { p.pricing = d.v; markDirty(); } Shell.paintMain(); });
onAction('select-product', (d) => { S.activeProductId = d.v; Shell.paintMain(); });
onAction('new-product', () => {
  const cost = 25000 * Math.pow(2.4, S.products.length - 1);
  Modal.dialog({ title: 'New product line', wide: true,
    body: `<div class="small dim mb16">A second product diversifies revenue and opens new markets — but splits your build capacity. Cost: <b class="c-amber">${money(cost)}</b>.</div>
      <div class="grid grid-auto" style="gap:10px">${CATEGORIES.map((c) => `
        <button class="pick-card" style="--pick-color:${c.color}" data-newprod="${c.id}">
          <div class="pick-icon" style="color:${c.color}">${c.icon}</div>
          <div class="pick-name">${esc(c.name)}</div>
          <div class="pick-desc">${esc(c.tagline)}</div>
        </button>`).join('')}</div>`,
    actions: [] });
  document.querySelectorAll('[data-newprod]').forEach((b) => b.addEventListener('click', () => {
    if (S.company.cash < cost) { toast({ icon: '$', title: 'Not enough cash.', kind: 'bad' }); return; }
    S.company.cash -= cost;
    const p = createProduct(S, { name: productName(), category: b.dataset.newprod });
    S.activeProductId = p.id;
    Modal.closeModal();
    toast({ icon: '◈', title: `Started **${p.name}**`, sub: 'A second bet. Build it.', kind: 'good' });
    Shell.paintMain();
  }));
});

// ── Agents ─────────────────────────────────────────────────────────────────
let candidates = null;
onAction('recruit', () => {
  if (S.agents.length >= maxAgents(S)) { toast({ icon: '⚠', title: 'Roster is full.', sub: 'Research more orchestration capacity.', kind: 'bad' }); return; }
  candidates = [rollCandidate(S), rollCandidate(S), rollCandidate(S)];
  showRecruit();
});

function showRecruit() {
  const cost = hireCost(S);
  Modal.dialog({ title: 'Recruiting', wide: true,
    body: `<div class="small dim mb16">Three candidates. Same price. Traits are permanent — read them carefully.
      <span class="dim">Cost: <b class="c-amber">${money(cost)}</b>.</span></div>
      <div class="grid grid-3" style="gap:10px">
        ${candidates.map((c, i) => {
          const model = MODELS[c.model], spec = SPECIALTIES[c.spec];
          return `<button class="pick-card" style="--pick-color:${model.color}" data-cand="${i}">
            <div class="row g8"><span class="agent-avatar" style="--agent-color:${model.color};--agent-bg:${model.color}18;width:32px;height:32px;flex:0 0 32px;font-size:14px">${spec.icon}</span>
              <div><div class="pick-name" style="font-size:14px;font-family:var(--mono)">${esc(c.name)}</div>
              <div class="tiny dim">${esc(spec.name)} · <span style="color:${model.color}">${esc(model.name)}</span></div></div></div>
            <div class="col g4 mt8">
              ${c.traits.map((tid) => { const t = TRAIT_MAP[tid];
                return `<div class="trait-chip ${t.good ? 'good' : 'bad'}" style="white-space:normal;text-align:left">
                  <b>${t.icon} ${esc(t.name)}</b> — ${esc(t.desc)}</div>`; }).join('')}
            </div>
          </button>`;
        }).join('')}
      </div>
      <div class="row g8 mt16"><button class="btn btn-ghost btn-sm" data-reroll>⟳ Reroll all (free)</button></div>`,
    actions: [] });
  document.querySelectorAll('[data-cand]').forEach((b) => b.addEventListener('click', () => {
    const c = candidates[Number(b.dataset.cand)];
    const r = hireAgent(S, c);
    if (r.ok) {
      Modal.closeModal();
      toast({ icon: '◉', title: `**${c.name}** is online.`, sub: `${SPECIALTIES[c.spec].name} · ${MODELS[c.model].name}`, kind: 'good' });
      Shell.paintMain(); Shell.paintNav();
    } else if (r.reason === 'cash') toast({ icon: '$', title: 'Not enough cash.', kind: 'bad' });
  }));
  document.querySelector('[data-reroll]')?.addEventListener('click', () => {
    candidates = [rollCandidate(S), rollCandidate(S), rollCandidate(S)];
    showRecruit();
  });
}

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

onAction('agent-tools', (d) => {
  const a = S.agents.find((x) => x.id === d.v);
  if (!a) return;
  const avail = AGENT_TOOLS.filter((t) => !t.req || S.research.done[t.req]);
  Modal.dialog({ title: `${a.name} — tooling`, wide: true,
    body: `<div class="grid grid-2" style="gap:10px">${avail.map((t) => {
      const owned = a.tools.includes(t.id);
      return `<div class="panel" style="padding:13px;border-color:${owned ? 'rgba(0,229,160,.3)' : 'var(--line)'}">
        <div class="row between mb4"><span class="row g6"><span class="c-cyan">${t.icon}</span><span class="bold small">${esc(t.name)}</span></span>
          ${owned ? '<span class="pill green">installed</span>' : `<span class="mono tiny">${money(t.cost)}</span>`}</div>
        <div class="tiny dim">${esc(t.desc)}</div>
        ${owned ? '' : `<button class="btn btn-sm btn-block mt8" data-buytool="${t.id}" ${S.company.cash < t.cost ? 'disabled' : ''}>Install</button>`}
      </div>`; }).join('') || '<div class="empty">No tools researched yet.</div>'}</div>`,
    actions: [] });
  document.querySelectorAll('[data-buytool]').forEach((b) => b.addEventListener('click', () => {
    const r = buyTool(S, a.id, b.dataset.buytool);
    if (r.ok) { Modal.closeModal(); toast({ icon: '⚙', title: `Installed on ${a.name}`, kind: 'good' }); Shell.paintMain(); }
  }));
});

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
  sfx('click');
  Shell.paintMain(); Shell.paintNav();
});
onAction('unqueue', (d) => { S.research.queue.splice(Number(d.v), 1); Shell.paintMain(); });
onAction('cancel-research', () => { S.research.active = null; S.research.progress = 0; Shell.paintMain(); Shell.paintNav(); });

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

onAction('raise', (d) => {
  const rt = ROUND_TYPES.find((x) => x.id === d.v);
  if (!rt) return;
  const offer = raiseOffer(S, rt);
  Modal.dialog({ title: `${rt.name} term sheet`, wide: false,
    body: `<div class="col g12">
      <div class="small dim">${esc(rt.desc)}</div>
      <div class="grid grid-2" style="gap:10px">
        <div class="stat-tile"><div class="stat-tile-label">Raise</div><div class="stat-tile-value c-green">${money(offer.amount)}</div></div>
        <div class="stat-tile"><div class="stat-tile-label">Post-money</div><div class="stat-tile-value c-amber">${money(offer.post)}</div></div>
        <div class="stat-tile"><div class="stat-tile-label">Dilution</div><div class="stat-tile-value c-red">${pct(offer.dilution, 1)}</div></div>
        <div class="stat-tile"><div class="stat-tile-label">You keep</div><div class="stat-tile-value">${pct(S.company.equity.founder * (1 - offer.dilution), 1)}</div></div>
      </div>
      <div class="tiny dim">Money buys time and speed. It costs a permanent share of everything that follows — including the ending.</div>
    </div>`,
    actions: [
      { label: 'Walk away', cls: 'btn-ghost' },
      { label: 'Push for better terms', cls: '', fn: () => {
        const better = { ...offer, amount: offer.amount * 1.15, dilution: offer.dilution * 0.82 };
        const ok = Math.random() < 0.55 + S.founder.skills.sales * 0.02;
        if (ok) { acceptRound(S, better); toast({ icon: '⌗', title: 'They blinked.', sub: `${money(better.amount)} at ${pct(better.dilution, 1)} dilution.`, kind: 'good' }); }
        else { toast({ icon: '⚠', title: 'They walked.', sub: 'The round is off. Try again later.', kind: 'bad' });
          S.narrative.cooldowns['_raise_' + rt.id] = S.time.day + 60; }
        Shell.paintMain(); Shell.paintTopbar();
      } },
      { label: 'Sign', cls: 'btn-primary', fn: () => {
        acceptRound(S, offer);
        toast({ icon: '⌗', title: `${rt.name} closed`, sub: `${money(offer.amount)} in the bank.`, kind: 'good', ms: 5000 });
        Shell.paintMain(); Shell.paintTopbar();
      } },
    ] });
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
onAction('ask-aria', () => {
  const r = askAria(S);
  const char = CHARACTERS.aria;
  sfx('prompt');
  Modal.dialog({ title: 'ARIA', wide: true,
      body: `<div class="row g14 mb16" style="align-items:flex-start">
          ${char?.img ? `<div class="event-portrait" style="width:52px;height:52px;flex:0 0 52px;border-color:${char.color}44">
            <img src="${char.img}" alt="" onerror="this.parentElement.style.display='none'"/></div>` : ''}
          <div class="small" style="color:var(--ink-2);line-height:1.6;font-style:italic">${esc(r.opener)}</div>
        </div>
        <div class="col g10">
          ${r.findings.map((f, i) => `
            <div class="panel" style="padding:13px;border-left:2px solid ${sevColor(f.severity)}">
              <div class="row g8 mb4">
                <span class="mono tiny" style="color:${sevColor(f.severity)};font-weight:700">${String(i + 1).padStart(2, '0')}</span>
                <span class="small bold">${esc(f.title)}</span>
              </div>
              <div class="tiny dim" style="line-height:1.6">${md(f.text)}</div>
            </div>`).join('') || '<div class="empty">Nothing material. That is rarer than it sounds.</div>'}
        </div>
        <div class="small dim mt16" style="font-style:italic;line-height:1.6">${esc(r.closer)}</div>`,
      actions: [{ label: 'Thanks', cls: 'btn-primary' }] });
});
function pickLine(kind) {
  const set = KIND_TEXT[kind] || ['Done.'];
  return set[Math.floor(Math.random() * set.length)];
}

function sevColor(s) {
  return s >= 85 ? 'var(--red)' : s >= 65 ? 'var(--amber)' : s >= 40 ? 'var(--cyan)' : 'var(--ink-3)';
}

// ── Help ───────────────────────────────────────────────────────────────────
const MANUAL_TABS = [
  { id: 'walk', name: 'Walkthroughs' },
  { id: 'keys', name: 'Keys' },
  { id: 'terms', name: 'Glossary' },
  { id: 'run', name: 'The run' },
];
let manualTab = 'walk';

function manualBody() {
  if (manualTab === 'walk') return manualWalk();
  if (manualTab === 'keys') return manualKeys();
  if (manualTab === 'run') return manualRun();
  return manualTerms();
}

function manualWalk() {
  const rows = Tutorial.chapterStatus();
  return `<div class="col g8">
    <div class="small dim mb4">Short, anchored tours of the interface. Each one runs where it applies and holds the clock while it does.</div>
    ${rows.map((c, i) => {
      const state = c.done ? 'done' : c.available ? 'ready' : 'later';
      return `<div class="man-row ${state}">
        <span class="man-idx">${String(i + 1).padStart(2, '0')}</span>
        <span class="man-text">
          <span class="man-name">${esc(c.name)}</span>
          <span class="man-sub">${esc(c.sub)} · ${c.steps} steps</span>
        </span>
        <span class="man-state">${c.done ? 'complete' : c.available ? 'available' : 'not yet'}</span>
        <button class="btn btn-sm ${c.available ? '' : 'btn-ghost'}" data-man="run:${c.id}"
          ${c.available ? '' : 'disabled'}>${c.done ? 'Replay' : 'Start'}</button>
      </div>`;
    }).join('')}
    <div class="divider"></div>
    <div class="row between">
      <span class="small dim">Offer walkthroughs automatically</span>
      <button class="btn btn-sm ${Tutorial.isDisabled() ? '' : 'on'}" data-man="toggle" style="min-width:52px">${Tutorial.isDisabled() ? 'OFF' : 'ON'}</button>
    </div>
  </div>`;
}

function manualKeys() {
  return `<div class="col g8">
    ${KEYS.map(([k, name, note]) => `<div class="row g10" style="align-items:flex-start">
      <kbd class="kbd">${esc(k)}</kbd>
      <span style="min-width:0"><span class="small bold">${esc(name)}</span>
        ${note ? `<span class="tiny dim" style="display:block;line-height:1.45">${esc(note)}</span>` : ''}</span>
    </div>`).join('')}
    <div class="divider"></div>
    ${FOOTNOTES.map((f) => `<div class="tiny dimmer" style="line-height:1.5">${esc(f)}</div>`).join('')}
  </div>`;
}

function manualTerms() {
  return `<div class="small dim mb12">Every term below is also a hover. Anywhere the interface prints one of these words as a label, resting on it gives you this definition.</div>
  <div class="man-terms">
    ${GLOSSARY.map((g) => `<div class="man-group">
      <div class="man-group-title">${esc(g.group)}</div>
      ${g.items.map(([n, d]) => `<div class="man-term">
        <div class="man-term-name">${esc(n)}</div>
        <div class="man-term-def">${esc(d)}</div>
      </div>`).join('')}
    </div>`).join('')}
  </div>`;
}

function manualRun() {
  const act = S?.company.act || 1;
  return `<div class="col g8">
    <div class="small dim mb4">Five acts. Each one changes what the game is about, and the previous act's habits stop working.</div>
    ${ACT_GUIDE.map((a) => `<div class="man-act ${a.act === act ? 'on' : a.act < act ? 'past' : ''}">
      <div class="man-act-head">
        <span class="man-act-num">ACT ${['','I','II','III','IV','V'][a.act]}</span>
        <span class="man-act-name">${esc(a.name)}</span>
        ${a.act === act ? '<span class="man-act-here">you are here</span>' : ''}
      </div>
      <div class="man-act-line">${esc(a.line)}</div>
      <div class="man-act-row"><span class="man-k">do</span>${esc(a.goal)}</div>
      <div class="man-act-row"><span class="man-k">watch</span>${esc(a.watch)}</div>
    </div>`).join('')}
  </div>`;
}

function showHelp() {
  const el = Modal.dialog({ title: 'Manual', wide: true,
    body: `<div class="man-tabs" id="man-tabs">
      ${MANUAL_TABS.map((t) => `<button class="branch-tab ${manualTab === t.id ? 'on' : ''}" data-man="tab:${t.id}">${esc(t.name)}</button>`).join('')}
    </div>
    <div id="man-body">${manualBody()}</div>`,
    actions: [{ label: 'Close', cls: 'btn-primary' }] });

  const repaint = () => {
    const tabs = el.querySelector('#man-tabs');
    const body = el.querySelector('#man-body');
    if (!tabs || !body) return;
    tabs.querySelectorAll('[data-man^="tab:"]').forEach((b) =>
      b.classList.toggle('on', b.dataset.man === 'tab:' + manualTab));
    body.innerHTML = manualBody();
  };

  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-man]');
    if (!b) return;
    const v = b.dataset.man;
    if (v.startsWith('tab:')) { manualTab = v.slice(4); sfx('click'); repaint(); return; }
    if (v === 'toggle') { Tutorial.setDisabled(!Tutorial.isDisabled()); sfx('click'); repaint(); return; }
    if (v.startsWith('run:')) {
      const id = v.slice(4);
      Modal.closeModal();
      setTimeout(() => Tutorial.start(id), 220);
    }
  });
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
onAction('settings', () => {
  Modal.dialog({ title: 'Settings', wide: false,
    body: `<div class="col g12">
      ${toggle('sound', 'Sound', S.settings.sound)}
      ${toggle('ambient', 'Ambient bed', S.settings.ambient !== false)}
      <div class="row between g12">
        <span class="small">Volume</span>
        <div style="flex:1;max-width:180px">${sliderHtml('volume', S.settings.volume ?? 0.55, 'var(--green)')}</div>
      </div>
      ${toggle('autosave', 'Autosave', S.settings.autosave)}
      ${toggle('particles', 'Background motion', S.settings.particles)}
      ${toggle('reducedMotion', 'Reduce motion', S.settings.reducedMotion)}
      ${toggle('highContrast', 'High contrast', S.settings.highContrast)}
      ${toggle('confirmBigMoves', 'Confirm large decisions', S.settings.confirmBigMoves)}
      <div class="divider"></div>
      <button class="btn btn-sm btn-ghost btn-block" data-act="assistant-link">Play with your assistant</button>
      <button class="btn btn-sm btn-ghost btn-block" data-act="help">Manual — keys, glossary, walkthroughs</button>
      <div class="divider"></div>
      <div class="row g8">
        <button class="btn btn-sm" data-set="export">Copy save to clipboard</button>
        <button class="btn btn-sm" data-set="import">Import save</button>
      </div>
      <div class="row g8">
        <button class="btn btn-sm btn-danger" data-set="reset">Abandon this run</button>
      </div>
      <div class="tiny dimmer">Saves live in your browser's local storage. Exporting gives you a portable string.</div>
    </div>`, actions: [] });
  document.querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.toggle; S.settings[k] = !S.settings[k];
    if (k === 'sound') { setAudio(S.settings.sound);
      if (S.settings.sound) { initAudio(); sfx('click'); if (S.settings.ambient !== false) setAmbient(true, () => S?.company.act || 1); } }
    if (k === 'ambient') setAmbient(S.settings.ambient !== false && S.settings.sound !== false, () => S?.company.act || 1);
    if (k === 'reducedMotion') document.documentElement.classList.toggle('reduced-motion', !!S.settings.reducedMotion);
    if (k === 'highContrast') document.documentElement.classList.toggle('high-contrast', !!S.settings.highContrast);
    if (k === 'particles') setBackgroundEnabled(S.settings.particles);
    b.classList.toggle('on'); b.textContent = S.settings[k] ? 'ON' : 'OFF';
  }));
  document.querySelectorAll('[data-set]').forEach((b) => b.addEventListener('click', async () => {
    const k = b.dataset.set;
    if (k === 'export') { await navigator.clipboard.writeText(Save.exportSave(S)); toast({ icon: '⌗', title: 'Save copied.', kind: 'good' }); }
    if (k === 'import') { const v = prompt('Paste save string:'); if (v && Save.importSave(v)) { location.reload(); } }
    if (k === 'reset') { if (confirm('Abandon this run? Legacy points are kept.')) { Save.clearSave(); location.reload(); } }
  }));
});
function toggle(key, label, val) {
  return `<div class="row between"><span class="small">${label}</span>
    <button class="btn btn-sm ${val ? 'on' : ''}" data-toggle="${key}" style="min-width:52px">${val ? 'ON' : 'OFF'}</button></div>`;
}

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
  if (kind === 'volume') {
    S.settings.volume = value; setVolume(value);
    const el = document.querySelector('[data-slider="volume"]');
    if (el) { el.querySelector('.slider-fill').style.width = (value * 100) + '%';
              el.querySelector('.slider-knob').style.left = (value * 100) + '%'; }
    return;
  }
  if (kind === 'autonomy') {
    const a = S.agents.find((x) => x.id === id);
    if (a) { a.autonomy = value; markDirty(); Shell.paintMain(); }
  }
});

// ── Keys ───────────────────────────────────────────────────────────────────
onKey(' ', (e) => { if (!inGame || Modal.isModalOpen()) return; e.preventDefault(); S.settings.paused = !S.settings.paused; Shell.paintTopbar(); });
onKey('q', (e) => triggerAction('code', e));
onKey('w', (e) => triggerAction('prompt', e));
onKey('e', (e) => triggerAction('users', e));
onKey('r', (e) => triggerAction('post', e));
onKey('s', () => { if (inGame) { Game.doShipFeature(S); Shell.paintMain(); } });
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
  dismiss: () => { dismissEvent(S); Modal.closeModal(); pendingEventShown = null; Shell.paintMain(); Shell.paintNav(); },
});

on('event:present', (ev) => { pendingEventShown = ev.id; sfx('event'); Modal.showEvent(ev); });
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
function tileHtml(l, v) { return `<div class="stat-tile"><div class="stat-tile-label">${l}</div><div class="stat-tile-value">${v}</div></div>`; }

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
    if (!Modal.isModalOpen() && !S.narrative.activeEvent && !Tutorial.isActive()) Tutorial.maybeAutoStart();
  }
});

// Dev harness: ?dev=1&cat=devtools&arch=hacker&days=400&view=research&event=e_first_user
const Q = new URLSearchParams(location.search);
if (Q.has('setup')) Intro.showIntro(Number(Q.get('setup')) || 0);
else if (Q.has('dev')) { devBoot(Q); }
else { Intro.showTitle({ cold: Q.has('cold') ? true : null }); }

function devBoot(q) {
  Game.startNewGame({
    founderName: q.get('founder') || 'Alex Rivera',
    companyName: q.get('company') || 'Meridian',
    archetype: q.get('arch') || 'hacker',
    category: q.get('cat') || 'devtools',
    productName: q.get('company') || 'Meridian',
    difficulty: q.get('diff') || 'standard',
    scenario: q.get('scen') || 'none',
  });
  enterGame();
  const days = Number(q.get('days') || 0);
  if (days > 0) {
    devSimulate(days);
  }
  if (q.get('view')) Shell.setView(q.get('view'));
  if (q.get('wtab')) WorldView.setWorldTab(q.get('wtab'));
  if (q.get('event')) {
    import('./data/events.js').then(({ EVENT_MAP }) => {
      const e = EVENT_MAP[q.get('event')];
      if (e) import('./systems/narrative.js').then((N) => N.presentEvent(S, e));
    });
  }
  if (q.get('end')) {
    const e = ENDINGS.find((x) => x.id === q.get('end'));
    if (e) { S.ending = { id: e.id, name: e.name, tone: e.tone, day: Math.floor(S.time.day) }; showEnding(e); }
  }
  if (q.has('aria')) setTimeout(() => document.querySelector('[data-act="ask-aria"]')?.click(), 60);
  if (q.get('dlg')) setTimeout(() => {
    const map = { recruit: '[data-act="recruit"]', raise: '[data-act="raise"]', tools: '[data-act="agent-tools"]',
      newprod: '[data-act="new-product"]', settings: '[data-act="settings"]' };
    document.querySelector(map[q.get('dlg')] || '')?.click();
  }, 80);
  if (q.has('help')) setTimeout(() => showHelp(), 60);
  if (q.get('tut')) setTimeout(() => Tutorial.start(q.get('tut'), { from: Number(q.get('tstep') || 0) }), 300);
  if (q.get('regions')) devRegions(Number(q.get('regions')) || 0);
  if (q.has('feud')) devFeud();
  if (q.has('career')) devCareer();
  if (q.has('brief')) setTimeout(() => emit('game:continue', { offline: {
    days: 3.4, from: Math.max(0, Math.floor(S.time.day) - 3), to: Math.floor(S.time.day),
    gained: { cash: 4.1e6, users: 128000, mrr: 92000, valuation: 8.4e8, features: 3, research: 2, incidents: 1 },
    waiting: 2,
    headlines: S.feed.slice(0, 5).map((f) => ({ type: f.type, tone: f.tone || '', day: f.day, text: f.text, author: f.author || '' })),
  } }), 400);
  if (q.has('pause')) S.settings.paused = true;
  Shell.paintMain(); Shell.paintTopbar(); Shell.paintNav(); Shell.paintFeed();
}

// Dev harness: a plausible career ledger, for looking at the panel.
function devCareer() {
  const runs = [
    ['bankrupt', 'Out Of Runway', 'bad', 'hacker', 'devtools', 'Northwind', 3.1e6, 214, 1, 7],
    ['acquired', 'The Responsible Outcome', 'neutral', 'hustler', 'consumer', 'Palegrove', 9.4e9, 512, 3, 34],
    ['steward', 'The Steward', 'good', 'researcher', 'agents', 'Cinderpath', 2.2e12, 1043, 5, 88],
    ['sovereign', 'The Sovereign', 'dark', 'operator', 'b2b', 'Ninefold', 41e12, 1218, 5, 126],
  ];
  S.legacy.log = runs.map(([ending, endingName, tone, archetype, category, company, valuation, day, act, gain], i) => ({
    run: i + 1, day, ending, endingName, tone, archetype, category, company,
    valuation, users: valuation / 4200, act, difficulty: i > 1 ? 'brutal' : 'standard',
    scenario: 'none', gain, seconds: 3600 * (i + 2),
  }));
  S.legacy.runs = runs.length;
  Shell.paintMain();
}

// Dev harness: force a rivalry so the dossier can be seen without waiting for
// one to develop naturally.
function devFeud() {
  Promise.all([import('./systems/nemesis.js'), import('./systems/market.js')]).then(([N, M]) => {
    let list = M.activeCompetitors(S);
    if (!list.length) { M.spawnCompetitor(S, { scale: 90, quality: 1.4 }); list = M.activeCompetitors(S); }
    const c = list.sort((a, b) => b.threat - a.threat)[0];
    c.day = S.time.day - 200;
    c.users = Math.max(c.users, totalUsers(S) * 0.7);
    c.mrr = Math.max(c.mrr, totalMrr(S) * 0.6);
    const n = N.nemesisState(S);
    n.id = c.id; n.since = Math.max(0, S.time.day - 180); n.grudge = 2.1; n.moves = [];
    for (let i = 0; i < 4; i++) N.runMove(S, c);
    S.market.priceSiege = 18;
    Shell.paintMain(); Shell.paintFeed();
  });
}

// Dev harness: plant presence so the tactical display can be seen with a board
// in progress rather than an empty one.
function devRegions(n) {
  import('../src/systems/regions.js').catch(() => import('./systems/regions.js')).then((R) => {
    R.initRegions(S);
    import('./data/regions.js').then(({ REGIONS, STAGES }) => {
      REGIONS.slice(0, n).forEach((r, i) => {
        const st = S.world.regions[r.id];
        st.stage = STAGES[Math.min(STAGES.length - 1, 1 + (i % 4))].id;
        st.stance = 0.55 + (i % 4) * 0.1;
      });
      Shell.paintMain();
    });
  });
}

// Deterministic-ish fast-forward used only by the dev harness.
function devSimulate(days) {
  const wasRealtime = S.meta.realtime;
  S.meta.realtime = false;   // let the fast-forward draw events freely
  const step = () => {
    for (let i = 0; i < 3; i++) {
      if (S.founder.focus > 30 && S.company.cash > 200) ACTION_FNS.prompt({ clientX: 0, clientY: 0 });
      else if (S.founder.focus > 5) ACTION_FNS.code({ clientX: 0, clientY: 0 });
    }
    const p = activeProduct(S);
    for (let i = 0; i < 3; i++) { const r = Game.doShipFeature(S); if (!r.ok) break; }
    if (p && !p.launched && p.features.length >= 4) Game.doLaunch(S);
    if (!S.research.active) {
      const av = availableResearch(S).sort((a, b) => a.cost - b.cost);
      if (av.length) startResearch(S, av[0].id);
    }
    if (S.agents.length < maxAgents(S) && S.company.cash > hireCost(S) * 3) hireAgent(S, rollCandidate(S));
    if (S.company.directive === 'none') { S.company.directive = 'ship'; S.company.directiveSince = S.time.day; markDirty(); }
    if (S.narrative.activeEvent && !S.narrative.activeEvent.outcome) {
      const ch = S.narrative.activeEvent.choices || [];
      const ENDERS = /Take it\. Life-changing|Take it\. This is a good outcome|Honour it\. You said a number/;
      let idx = ch.findIndex((c) => !ENDERS.test(c.label));
      resolveChoice(S, idx < 0 ? 0 : idx); dismissEvent(S); Modal.closeModal();
    }
  };
  for (let d = 0; d < days; d++) { step(); Loop.simulate(1); }
  S.meta.realtime = wasRealtime;
  if (S.narrative.activeEvent) { dismissEvent(S); Modal.closeModal(); }
  Shell.paintMain(); Shell.paintTopbar(); Shell.paintNav(); Shell.paintFeed();
}
