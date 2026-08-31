// ─────────────────────────────────────────────────────────────────────────────
// THE MACHINE — authored copy for the workstation's own surfaces: the Record,
// the context menus, the Find palette, and the one line the company prints
// when somebody stops working here.
//
// Copy only. No logic, no state, no imports. `src/systems/record.js` counts the
// files; this file decides what the folder says about them. If a line here
// needs a number, it does not belong here.
//
// Two consumers read `CTX`, and the tighter one sets the budget. A context
// menu row is `.os .mi-label` — `white-space: nowrap` with an ellipsis, inside
// a `.os .menu` capped at `min(360px, 92vw)` at 10.5px mono. That is about 46
// characters, and because 92vw is 699px at 760px the 360px cap binds at every
// width the game is played at. The Record prints the same strings as markdown
// body text, where length would be fine. Write to 46 and both are happy.
// ─────────────────────────────────────────────────────────────────────────────

// ── FOLDERS ─────────────────────────────────────────────────────────────────
// The company's home directory, in display order. `act` gates a folder that
// cannot exist yet. `blurb` is the one line under the name; `empty` is what a
// fresh save reads on day three, which is the first impression and the one
// every version of this screen has forgotten.
//
// Every path here must have a reader in `src/systems/record.js`, and every
// reader there must have a path here. `folders()` walks this list and nothing
// else, and `search()` only visits the paths `folders()` returned — so a
// reader this file does not name is not merely hidden, it is unsearchable.
export const FOLDERS = [
  { path: 'repo', name: 'repo', act: 1,
    blurb: 'Everything you have shipped, newest first. The gaps are the interesting part.',
    empty: 'Nothing shipped yet. The repository exists and that is the whole of it.' },

  { path: 'notes', name: 'notes', act: 1,
    blurb: 'One line for every decision. Nobody else keeps this record.',
    empty: 'No decisions on file. Nothing has asked you anything yet.' },

  { path: 'agents', name: 'agents', act: 1,
    blurb: 'Who works here, what each one is for, and what it remembers.',
    empty: 'The roster is empty. For now the company is you and a text field.' },

  { path: 'agents/archive', name: 'archive', act: 1,
    blurb: 'Everyone who left, with the reason recorded at the time.',
    empty: 'Nobody has left. It stays this way for a while.' },

  { path: 'people', name: 'people', act: 1,
    blurb: 'Everyone the record has met, and where each one stands.',
    empty: 'You have met nobody. That changes earlier than you expect.' },

  { path: 'research', name: 'research', act: 1,
    blurb: 'What you know now and did not know before. Permanent, all of it.',
    empty: 'Nothing finished. The whole tree is still ahead of you.' },

  { path: 'press', name: 'press', act: 1,
    blurb: 'What the internet said, while it still remembered saying it.',
    empty: 'Nobody has mentioned you. Nobody has heard of you.' },

  { path: 'ledger', name: 'ledger', act: 1,
    blurb: 'Every round raised and every company bought, at the price you paid.',
    empty: 'No rounds, no buyouts. The money in the account is still yours.' },

  { path: 'awards', name: 'awards', act: 1,
    blurb: 'What you did first, or fastest, or at all. Nobody handed you any of it.',
    empty: 'Nothing earned yet. Everything in here has to be earned.' },

  { path: 'rivals', name: 'rivals', act: 1,
    blurb: 'The other companies in your category, and what they did about you.',
    empty: 'The category is quiet. Somebody is reading your launch post right now.' },

  { path: 'world', name: 'world', act: 3,
    blurb: 'Regions, megaprojects and the race. The parts with a physical address.',
    empty: 'You are not in the world yet. You are in a category.' },

  { path: 'commit', name: 'commit', act: 5,
    blurb: 'The commitments you made at the end, and what each one turned into.',
    empty: 'Nothing committed. There is still time to be several things.' },
];

// ── DEPARTURES ──────────────────────────────────────────────────────────────
// Keyed on the reason recorded with the departure. One sentence each: this is
// the body of a file in `agents/archive`, and the file is short on purpose.
//
// `fireAgent` emits three — 'released' from the roster panel, 'cut' from the
// whole-roster spin-down in The Spreadsheet, 'terminated' from shutting down a
// rogue. Two more ways to lose an agent do not go through `fireAgent` at all:
// the emergency spin-down in `src/systems/economy.js` and the replacement
// choice in `src/data/events4.js` both splice the roster directly. The copy is
// here so that routing them through `fireAgent` is a one-line change rather
// than a writing job. `default` catches a save that predates a reason.
export const DEPARTURES = {
  released:
    'You released it from a panel with two buttons, and its work redistributed across the others inside an hour.',
  cut:
    'You spun the whole roster down in one sitting to make the arithmetic work, and the work did not go anywhere.',
  terminated:
    'It shipped something correct without asking, so you stopped it inside a minute and never read the rest of the trace.',
  spun_down:
    'The account decided this one rather than you, on the day the money stopped covering the roster.',
  replaced:
    'You spun it down and spun up a fresh one, which was worse for two months and cheaper for none of them.',
  default:
    'It is not on the roster any more, and the record does not say why.',
};

// ── CTX ─────────────────────────────────────────────────────────────────────
// A context menu is mostly verbs. One row in each is not: it is a sentence
// about the thing under the cursor. These are those sentences, keyed by the
// `kind` the menu was opened with, and read again by the Record as the closing
// line of a file's body. Forty-six characters — see the note at the top.
export const CTX = {
  // The Desk. Keys are the real ids: `code`, `prompt`, `users` and `post` are
  // `ACT_VERBS` in `src/data/verbs.js`; `ship` is its own button; `rest` is an
  // allocation in `src/systems/founder.js`, not a desk action, so it is keyed
  // under the namespace it actually belongs to.
  'desk.code': 'Slow work, in your own handwriting.',
  'desk.prompt': 'You describe it. Something faster builds it.',
  'desk.users': 'Eleven minutes beats a week of guessing.',
  'desk.post': 'Four minutes to write, two hours to refresh.',
  'desk.ship': 'Built and shipped are different words.',
  'desk.aria': 'She reads your numbers and disagrees.',
  'alloc.rest': 'You never regret the night you slept.',

  // Work
  'feature': 'Shipped once. Maintained ever since.',
  'product': 'Strangers spend real hours inside this.',
  'debt': 'Written fast, by something not maintaining it.',
  'research.node': 'Nobody here has ever unlearned anything.',
  'research.locked': 'Upstream of something you already want.',
  'research.active': 'It finishes at 3am, without ceremony.',

  // The roster
  'agent': 'Running since you started it, asking nothing.',
  'agent.lane': 'Point it somewhere and it stays pointed.',
  'agent.memory': 'The six things it thought worth keeping.',
  'agent.rogue': 'The work was never the concern.',

  // The Wire
  'wire.post': 'Somebody typed this and went to lunch.',
  'wire.thread': 'Somebody is waiting. Not for long.',
  'wire.injection': 'Written to be obeyed. Nothing is behind it.',

  // The record
  'journal': 'You decided this. The date is right there.',
  'achievement': 'Nobody handed you this. Something noticed.',
  'doctrine': 'Earned by how you ran it, not what you spent.',
  'objective': 'The next obvious thing. Obvious is underrated.',
  'round': 'The money arrived. So did the calendar.',
  'subsidiary': 'Your name on it, somebody else on the badge.',
  'person': 'Met once. Filed ever since.',

  // The world
  'competitor': 'Somebody started the same week you did.',
  'nemesis': 'They keep a file on you as well.',
  'region': 'Laws, weather, and an opinion about you.',
  'project': 'Concrete and a permit. It outlasts software.',
  'race': 'Four labs, and you, all running the numbers.',

  // The machine itself
  'desktop': 'One machine. The company runs warm on it.',
  'dock': 'Every part of the company, one key each.',
  'window': 'The machine remembers where you left it.',
  'clock': 'Days pass whether or not you spend them.',
  'cash': 'Money, and the number of days it buys.',
  'focus': 'You spend the day regardless of the plan.',
  'record': 'What the company wrote down and kept.',
};

// ── EMPTY ───────────────────────────────────────────────────────────────────
// Empty states. A folder prints its own `empty` above; these cover everything
// else that can come back with nothing in it.
//
// A key here must never collide with a path in `FOLDERS`. `read()` falls back
// through `empty(path)`, so a generic line named after a folder would be
// served as the body of a file inside it — which is why the roster's empty
// state is `roster` and not `agents`. Say nothing about where a thing is on
// screen: the Record stacks its panes at 760px and every direction is wrong
// there.
export const EMPTY = {
  folder: 'Empty. Something lands here eventually.',
  search: 'No hits. Nothing in the company matches that.',
  find: 'Everything the company has written down.',
  day_one: 'One day on record. The oldest file is from this morning.',
  select: 'No file open. All of it is still here.',
  read: 'That file is not here any more.',
  meta: 'No details recorded. It happened, and that is all anybody wrote.',
  locked: 'Not yet. This part of the company does not exist.',
  ctx: 'Nothing to do with this one.',
  feed: 'The Wire is quiet. It does not stay quiet.',
  roster: 'No agents running. Every lane is yours today.',
  recent: 'Nothing opened yet.',
};
