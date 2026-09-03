// ─────────────────────────────────────────────────────────────────────────────
// THE APPS — what is in the dock, what each window says about itself, and what
// its menu offers.
//
// The eight modules are `VIEWS` with a body: a glyph, an accent, a default
// size and a one-line readout that a founder can read across the room without
// bringing the window forward. The five that are not modules — the Wire, the
// Uplink, ARIA, the Manual and Settings — are the machine's own.
//
// Everything here is a pure function of state. `tools/ostest.mjs` runs the
// whole registry headlessly at five points in a run and nothing in it may touch
// the DOM.
// ─────────────────────────────────────────────────────────────────────────────
import { VIEWS, VIEW_BLURB } from '../shell.js';
import { fmt, money } from '../../engine/format.js';
import { activeProduct } from '../../engine/state.js';
import { featureCost, pricingAllowed } from '../../systems/product.js';
import { PRICING_MODELS } from '../../data/products.js';
import { maxAgents, hireCost } from '../../systems/agents.js';
import { agentStats, computeMods } from '../../systems/modifiers.js';
import { LANES } from '../../data/agents.js';
import { RESEARCH_MAP, BRANCHES } from '../../data/research.js';
import { researchProgressPct } from '../../systems/research.js';
import { MACRO, activeCompetitors } from '../../systems/market.js';
import { availableRounds, raiseOffer } from '../../systems/economy.js';
import { availableCounters, nemesisOf } from '../../systems/nemesis.js';
import { raceStandings, playerRank } from '../../systems/agirace.js';
import { openThreadCount } from '../../systems/feed.js';
import { promptCost, currentApproach } from '../../systems/founder.js';
import { rel } from '../../engine/state.js';
import { actionNote, shipNote, launchNote, recruitNote, priceNote } from '../notes.js';
import * as MCP from '../../webmcp/index.js';
import * as RecordApp from './record.js';
import * as ContactsApp from './contacts.js';
import * as MailApp from './mail.js';
import * as JournalApp from './journal.js';
import * as CalendarApp from './calendar.js';
import * as TerminalApp from './terminal.js';
import * as BrowserApp from './browser.js';
import * as ListApp from './list.js';
import * as PlayerApp from './player.js';
import { plan as spendPlan } from '../../systems/spend.js';

const safe = (fn, dflt = '') => { try { const v = fn(); return v == null ? dflt : v; } catch { return dflt; } };
const up = (s) => String(s).toUpperCase();

// ── Readouts ────────────────────────────────────────────────────────────────
// One line per window, in the title bar. Written to be read at a glance and
// from a distance: no punctuation a reader has to parse, no number without its
// unit, and never a sentence.

// A greyed row says what it needs. The context menus made this the rule and
// the menu bar shows the same rows, so they cannot disagree: chrome, in mono
// uppercase, computed where the row is built. The notes themselves live in
// `src/ui/notes.js` now, because the console's disabled buttons print the same
// strings as tooltips and the console must not import the workstation.

const READOUT = {
  record: (S) => RecordApp.readoutFor(S),
  contacts: (S) => ContactsApp.readoutFor(S),
  mail: (S) => MailApp.readoutFor(S),
  journal: (S) => JournalApp.readoutFor(S),
  calendar: (S) => CalendarApp.readoutFor(S),
  terminal: (S) => TerminalApp.readoutFor(S),
  browser: (S) => BrowserApp.readoutFor(S),
  todo: (S) => ListApp.readoutFor(S),
  player: (S) => PlayerApp.readoutFor(S),
  desk: (S) => `FOCUS ${Math.round(S.founder.focus)}/${Math.round(S.founder.focusMax)} · LV ${S.founder.level}`,
  product: (S) => {
    const p = activeProduct(S);
    if (!p) return 'NO PRODUCT';
    if (!p.launched) return `DRAFT · ${p.features.length} FEATURE${p.features.length === 1 ? '' : 'S'}`;
    return `${up(fmt(p.users))} USERS · ${up(money(p.mrr))}/MO · ${(p.churnMonthly * 100).toFixed(1)}% CHURN`;
  },
  agents: (S) => {
    const m = computeMods(S);
    const upkeep = S.agents.reduce((a, x) => a + agentStats(x, S, m).upkeep, 0);
    return `${S.agents.length} / ${maxAgents(S)} · ${up(money(upkeep))}/DAY`;
  },
  research: (S) => {
    const n = S.research.active ? RESEARCH_MAP[S.research.active] : null;
    if (!n) return `IDLE · ${up(fmt(S.resources.research))} PTS`;
    return `${up(n.name)} · ${(researchProgressPct(S) * 100).toFixed(0)}%`;
  },
  market: (S) => {
    const macro = MACRO[S.market.macro];
    const n = activeCompetitors(S).length;
    return `${up(macro?.name || '—')} · HYPE ${(S.market.hype * 100).toFixed(0)}% · ${n} RIVAL${n === 1 ? '' : 'S'}`;
  },
  world: (S) => {
    const W = S.world;
    const rank = W.race ? ` · ${ordinal(playerRank(S))} OF ${raceStandings(S).length}` : '';
    return `HEAT ${Math.round(W.regulatoryHeat)} · APPROVAL ${Math.round(W.publicOpinion * 100)}%${rank}`;
  },
  story: (S) => {
    const people = Object.values(S.narrative.relationships).filter((r) => r.met).length;
    return `${S.stats.eventsResolved} DECISION${S.stats.eventsResolved === 1 ? '' : 'S'} · ${people} PEOPLE`;
  },
  legacy: (S) => `${S.legacy.points || 0} PTS · RUN ${(S.legacy.runs || 0) + 1}`,
  wire: (S) => {
    const open = openThreadCount(S);
    return `${open ? `${open} OPEN · ` : ''}${fmt(S.feed.length)} ENTRIES`;
  },
  uplink: (S) => {
    const st = safe(() => MCP.status(), null);
    if (S.world?.author?.muted) return 'MUTED · THE DECK HAS IT';
    if (!st || st.tier === 'none') return 'THE WRITTEN WORLD';
    if (st.waiting) return `ON DUTY · ${st.count} TOOL${st.count === 1 ? '' : 'S'}`;
    if (st.mode === 'agent') return `PLAYING · ${st.count} TOOL${st.count === 1 ? '' : 'S'}`;
    return `READY · ${st.count} TOOL${st.count === 1 ? '' : 'S'}`;
  },
  aria: (S) => {
    const a = Math.round(rel('aria', S).affinity || 0);
    return `STANDING ${a >= 0 ? '+' : ''}${a}`;
  },
  manual: () => 'THE MANUAL',
  settings: () => 'THIS MACHINE',
};

function ordinal(n) { return ['—', '1ST', '2ND', '3RD', '4TH', '5TH', '6TH'][n] || `${n}TH`; }

// §C9. The Desk's strip, as a menu row: the same hand, the same reason when it
// is blocked, and the key it answers to.
const SPEND_VERB = { code: 'Write code', prompt: 'Prompt', users: 'Talk to users', post: 'Post' };
function spendItem(S) {
  const hand = S.ui?.spendHand && SPEND_VERB[S.ui.spendHand] ? S.ui.spendHand : 'prompt';
  const p = safe(() => spendPlan(S, hand), { ok: false, note: 'NOT NOW' });
  return { label: `${SPEND_VERB[hand]} until it is done`, key: 'G', act: 'spend-bar', v: hand,
    disabled: !p.ok, note: p.ok ? undefined : (p.note || 'NOT NOW') };
}

export function readoutFor(S, id) { return safe(() => READOUT[id]?.(S) || '', ''); }

// ── Menus ───────────────────────────────────────────────────────────────────
// Every item either dispatches a `data-act` the game already answers, or is a
// heading, or is a separator. Nothing here mutates anything: the shell clicks
// the real control when it can find one, so a Desk action keeps its floating
// number, its sound and its walkthrough notification.
//
//   { label, key?, act?, v?, data?, disabled?, checked?, danger? }
//   { head: 'RAISE' }   { sep: true }

const MENU = {
  record: (S) => RecordApp.menuFor(S),
  contacts: (S) => ContactsApp.menuFor(S),
  mail: (S) => MailApp.menuFor(S),
  journal: (S) => JournalApp.menuFor(S),
  calendar: (S) => CalendarApp.menuFor(S),
  terminal: (S) => TerminalApp.menuFor(S),
  browser: (S) => BrowserApp.menuFor(S),
  todo: (S) => ListApp.menuFor(S),
  player: (S) => PlayerApp.menuFor(S),
  desk: (S) => {
    const m = computeMods(S);
    const ap = currentApproach(S);
    const pc = promptCost(S, m, ap);
    const p = activeProduct(S);
    const cost = p ? featureCost(S, p) : 0;
    const canPrompt = S.founder.focus >= pc.focus && S.company.cash >= pc.cash
      && (!pc.insight || S.resources.insight >= pc.insight);
    const hand = (label, key, v) => {
      const note = actionNote(S, v, m);
      return { label, key, act: 'do', v, disabled: !!note, note: note || undefined };
    };
    const ship = shipNote(S, p, cost);
    const launch = p ? launchNote(p) : null;
    return [
      hand('Write code', 'Q', 'code'),
      { ...hand('Prompt the machine', 'W', 'prompt'), disabled: !canPrompt },
      hand('Talk to users', 'E', 'users'),
      hand('Post publicly', 'R', 'post'),
      { ...spendItem(S) },
      { sep: true },
      { label: 'Ship a feature', key: 'S', act: 'ship', disabled: !!ship, note: ship || undefined },
      { label: 'Auto-ship', act: 'toggle-autoship', checked: S.settings.autoShip !== false },
      ...(p && !p.launched ? [{ label: `Launch ${p.name}…`, act: 'launch', disabled: !!launch, note: launch || undefined }] : []),
      { sep: true },
      { label: 'Ask ARIA', key: 'A', act: 'ask-aria' },
    ];
  },

  product: (S) => {
    const p = activeProduct(S);
    if (!p) return [{ label: 'No product', disabled: true }];
    const out = [];
    if (S.company.act >= 2) out.push({ label: 'New product line…', act: 'new-product' });
    if (!p.launched) { const l = launchNote(p); out.push({ label: `Launch ${p.name}…`, act: 'launch', disabled: !!l, note: l || undefined }); }
    if (out.length) out.push({ sep: true });
    out.push({ head: 'PRICE' });
    const unlaunched = priceNote(p) || undefined;
    out.push({ label: 'Down 25%', act: 'price', v: '0.75', disabled: !p.launched, note: unlaunched });
    out.push({ label: 'Down 10%', act: 'price', v: '0.9', disabled: !p.launched, note: unlaunched });
    out.push({ label: 'Up 10%', act: 'price', v: '1.1', disabled: !p.launched, note: unlaunched });
    out.push({ label: 'Up 50%', act: 'price', v: '1.5', disabled: !p.launched, note: unlaunched });
    const models = Object.values(PRICING_MODELS).filter((pm) => safe(() => pricingAllowed(S, p, pm), false));
    if (models.length) {
      out.push({ sep: true }, { head: 'MODEL' });
      for (const pm of models) out.push({ label: pm.name, act: 'pricing', v: pm.id, checked: p.pricing === pm.id });
    }
    return out;
  },

  agents: (S) => {
    const cost = hireCost(S);
    const lanes = Object.values(LANES).filter((l) => !l.req || S.unlocks[l.req] || S.research.done[l.req]);
    const recruit = recruitNote(S);
    const out = [
      { label: `Recruit an agent… · ${money(cost)}`, act: 'recruit', disabled: !!recruit, note: recruit || undefined },
    ];
    if (S.agents.length) {
      out.push({ sep: true }, { head: 'ASSIGN EVERY AGENT TO' });
      for (const l of lanes) out.push({ label: l.name, act: 'os-lane-all', v: l.id });
    }
    return out;
  },

  research: (S) => {
    const out = [{ head: 'BRANCH' }];
    for (const b of Object.values(BRANCHES)) {
      out.push({ label: b.name, act: 'branch', v: b.id, checked: (S.ui?.researchBranch || 'engineering') === b.id });
    }
    out.push({ sep: true });
    out.push({ label: 'Cancel what is running', act: 'cancel-research', disabled: !S.research.active,
      note: S.research.active ? undefined : 'NOTHING RUNNING' });
    out.push({ label: 'Clear the queue', act: 'os-clear-queue', disabled: !(S.research.queue || []).length,
      note: (S.research.queue || []).length ? undefined : 'QUEUE EMPTY' });
    return out;
  },

  market: (S) => {
    const out = [];
    const rounds = S.unlocks.fundraising ? safe(() => availableRounds(S), []) : [];
    if (rounds.length) {
      out.push({ head: 'RAISE' });
      for (const rt of rounds) {
        const o = safe(() => raiseOffer(S, rt), null);
        out.push({ label: `${rt.name}${o ? ` · ${money(o.amount)}` : ''}`, act: 'raise', v: rt.id });
      }
    }
    const counters = nemesisOf(S) ? safe(() => availableCounters(S), []) : [];
    if (counters.length) {
      if (out.length) out.push({ sep: true });
      out.push({ head: 'AGAINST THE FEUD' });
      for (const k of counters) out.push({ label: `${k.name} · ${k.costLabel}`, act: 'counter', v: k.id, disabled: !k.ok });
    }
    return out.length ? out : [{ label: 'Nothing to decide here yet', disabled: true }];
  },

  world: (S) => {
    const tab = S.ui?.worldTab || 'standing';
    const out = [
      { label: 'Standing', act: 'world-tab', v: 'standing', checked: tab === 'standing' },
      { label: 'The Board', act: 'world-tab', v: 'board', checked: tab === 'board' },
    ];
    if (S.world.race) out.push({ label: 'The Race', act: 'world-tab', v: 'race', checked: tab === 'race' });
    out.push({ label: 'Megaprojects', act: 'world-tab', v: 'projects', checked: tab === 'projects' });
    if (S.company.act >= 5) out.push({ label: 'Ascension', act: 'world-tab', v: 'ascend', checked: tab === 'ascend' });
    return out;
  },

  story: () => [{ label: 'Nothing here was undone', disabled: true }],

  legacy: () => [{ label: 'Begin a new timeline…', act: 'prestige', danger: true }],

  wire: (S) => {
    const open = openThreadCount(S);
    return [{ label: open ? `${open} thread${open === 1 ? '' : 's'} waiting on you` : 'Nothing is waiting', disabled: true }];
  },

  uplink: (S) => {
    const st = safe(() => MCP.status(), { tier: 'none' });
    const muted = !!S.world?.author?.muted;
    const out = [];
    if (st.tier === 'none') out.push({ label: 'Play with your assistant…', act: 'assistant-link' });
    else if (muted) out.push({ label: 'Unmute the world', act: 'unmute-world' });
    else out.push({ label: 'Mute the world', act: 'mute-world', danger: true });
    if (st.tier !== 'none' && !muted) {
      out.push({ sep: true }, { label: 'Run the scripted world', act: 'demo-run' },
        { label: 'Stop the script', act: 'demo-stop' });
    }
    out.push({ sep: true }, { label: 'How it works…', act: 'assistant-link' });
    return out;
  },

  aria: () => [{ label: 'Ask again', act: 'ask-aria' }],

  manual: () => [
    { label: 'Walkthroughs', act: 'os-manual-tab', v: 'walk' },
    { label: 'Keys', act: 'os-manual-tab', v: 'keys' },
    { label: 'Glossary', act: 'os-manual-tab', v: 'terms' },
    { label: 'The run', act: 'os-manual-tab', v: 'run' },
  ],

  settings: () => [
    { label: 'Copy save to clipboard', act: 'os-save-export' },
    { label: 'Paste a save…', act: 'os-save-import' },
    { sep: true },
    { label: 'Download the file', act: 'os-save-download' },
    { label: 'Open a file…', act: 'os-save-upload' },
    { sep: true },
    { label: 'Abandon this run…', act: 'os-save-reset', danger: true },
  ],
};

export function menuFor(S, id) { return safe(() => MENU[id]?.(S) || [], []); }

// ── The registry ────────────────────────────────────────────────────────────
// Modules first, in `VIEWS` order, because the dock's indices are the nav's and
// the digit keys are both. Then the machine's own three, then its two utilities.

const MODULE_ACCENT = {
  desk: 'var(--green)', product: 'var(--cyan)', agents: 'var(--violet)',
  research: 'var(--blue)', market: 'var(--amber)', world: 'var(--pink)',
  story: 'var(--ink-2)', legacy: 'var(--white)',
};
// Fractions of the desktop. A save made at 1440 opens sensibly at 1280.
const MODULE_DEF = {
  desk: [0.02, 0.02, 0.62, 0.94], product: [0.10, 0.06, 0.62, 0.86],
  agents: [0.08, 0.05, 0.64, 0.88], research: [0.06, 0.04, 0.68, 0.90],
  market: [0.12, 0.07, 0.62, 0.84], world: [0.05, 0.04, 0.70, 0.91],
  story: [0.14, 0.05, 0.60, 0.89], legacy: [0.10, 0.05, 0.64, 0.89],
};
const MODULE_MIN = {
  desk: [600, 420], product: [560, 400], agents: [600, 420], research: [620, 440],
  market: [580, 420], world: [640, 460], story: [560, 440], legacy: [580, 440],
};

const SYSTEM_APPS = [
  { id: 'wire', title: 'Wire', navName: 'Wire', glyph: '⌁', accent: 'var(--amber)',
    section: 'The world', blurb: 'Users, press, rivals, and your own agents.',
    def: [0.70, 0.02, 0.28, 0.94], min: [280, 320] },
  { id: 'contacts', title: 'Contacts', navName: 'Contacts', glyph: '☎', accent: 'var(--cyan)',
    section: 'The world', blurb: 'Everyone you have met, and a number for each of them.',
    def: [0.16, 0.06, 0.56, 0.84], min: [520, 380] },
  { id: 'mail', title: 'Mail', navName: 'Mail', glyph: '✉', accent: 'var(--amber)',
    section: 'The world', blurb: 'The post: the bank, a committee, a mother forwarding an article.',
    def: [0.12, 0.05, 0.62, 0.86], min: [520, 380] },
  { id: 'browser', title: 'Browser', navName: 'Browser', glyph: '⊛', accent: 'var(--blue)',
    section: 'The world', blurb: 'The rival\'s site, the paper, and your own front page.',
    def: [0.10, 0.05, 0.66, 0.86], min: [520, 400] },
  { id: 'todo', title: 'List', navName: 'List', glyph: '✓', accent: 'var(--green)',
    section: 'Machine', blurb: 'What the company is still asking for. It resets at midnight.',
    def: [0.22, 0.09, 0.46, 0.78], min: [400, 340] },
  { id: 'player', title: 'Player', navName: 'Player', glyph: '♪', accent: 'var(--pink)',
    section: 'Machine', blurb: 'Whatever you have on while you work. It changes with the act.',
    def: [0.30, 0.13, 0.36, 0.70], min: [340, 340] },
  { id: 'journal', title: 'Journal', navName: 'Journal', glyph: '✎', accent: 'var(--ink-2)',
    section: 'Machine', blurb: 'Your own words, on the days you wrote any.',
    def: [0.24, 0.10, 0.44, 0.76], min: [400, 360] },
  { id: 'calendar', title: 'Calendar', navName: 'Calendar', glyph: '▦', accent: 'var(--amber)',
    section: 'Machine', blurb: 'The run on a month grid, and what is due.',
    def: [0.14, 0.06, 0.60, 0.82], min: [520, 400] },
  { id: 'terminal', title: 'Terminal', navName: 'Terminal', glyph: '>_', accent: 'var(--green)',
    section: 'Machine', blurb: 'A prompt. The machine answers to a few words.',
    def: [0.20, 0.12, 0.52, 0.66], min: [420, 300] },
  { id: 'uplink', title: 'Uplink', navName: 'Uplink', glyph: '⊚', accent: 'var(--violet)',
    section: 'The world', blurb: 'What the world is allowed to do to you, and the plug.',
    def: [0.36, 0.14, 0.32, 0.66], min: [330, 300] },
  { id: 'aria', title: 'ARIA', navName: 'ARIA', glyph: '', portrait: 'assets/img/char_aria.jpg',
    accent: 'var(--violet)', section: 'The world', blurb: 'A full read of where you stand, in her words.',
    def: [0.28, 0.10, 0.44, 0.74], min: [420, 360] },
  { id: 'record', title: 'Record', navName: 'Record', glyph: '⊟', accent: 'var(--ink-2)',
    section: 'Machine', blurb: 'Everything the company wrote down and did not throw away.',
    def: [0.05, 0.05, 0.84, 0.88], min: [520, 380] },
  { id: 'manual', title: 'Manual', navName: 'Manual', glyph: '?', accent: 'var(--green)',
    section: 'Machine', blurb: 'Keys, the glossary, the walkthroughs and the run.',
    def: [0.20, 0.08, 0.56, 0.80], min: [480, 400] },
  { id: 'settings', title: 'Settings', navName: 'Settings', glyph: '⚙', accent: 'var(--ink-2)',
    section: 'Machine', blurb: 'Sound, motion, the save, and this machine.',
    def: [0.32, 0.10, 0.36, 0.78], min: [420, 420] },
];

export const APPS = [
  ...VIEWS.map((v, i) => ({
    id: v.id,
    title: v.navName || v.name,
    fullTitle: v.name,
    navName: v.navName || v.name,
    glyph: v.icon,
    accent: MODULE_ACCENT[v.id] || 'var(--ink)',
    section: v.section,
    module: true,
    index: i + 1,
    blurb: VIEW_BLURB[v.id] || '',
    def: MODULE_DEF[v.id] || [0.10, 0.06, 0.62, 0.86],
    min: MODULE_MIN[v.id] || [560, 400],
    req: v.req,
    lockHint: v.lockHint,
    showLocked: v.showLocked,
  })),
  ...SYSTEM_APPS.map((a) => ({ ...a, module: false, fullTitle: a.title })),
];

export const APP_MAP = Object.fromEntries(APPS.map((a) => [a.id, a]));
export const MODULE_IDS = APPS.filter((a) => a.module).map((a) => a.id);

export function isLocked(S, app) {
  const a = typeof app === 'string' ? APP_MAP[app] : app;
  if (!a?.req) return false;
  try { return !a.req(S); } catch { return false; }
}

// Which apps the dock shows: every module (locked ones greyed, as the nav does)
// and every system app.
export function dockApps(S) {
  return APPS.filter((a) => !a.module || !isLocked(S, a) || a.showLocked);
}
