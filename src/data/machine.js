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

  { path: 'agents/aria', name: 'aria', act: 1,
    blurb: 'The document she keeps for whatever is started next. It grows.',
    empty: 'Nothing written yet. She has been running since the first morning.' },

  { path: 'agents/channel', name: 'channel', act: 1,
    blurb: 'The room they talk in when the message is not for you.',
    empty: 'Nobody to talk to yet. A channel needs a second one of them.' },

  { path: 'people', name: 'people', act: 1,
    blurb: 'Everyone the record has met, and where each one stands.',
    empty: 'You have met nobody. That changes earlier than you expect.' },

  { path: 'calls', name: 'calls', act: 1,
    blurb: 'Every phone call, as it was said. Both sides, and what was agreed.',
    empty: 'No calls on record. Everyone you have met has a number.' },

  { path: 'journal', name: 'journal', act: 1,
    blurb: 'Your own words, on the days you wrote any. Nobody else keeps this.',
    empty: 'Nothing written. The page is the one thing here that waits for you.' },

  { path: 'chronicle', name: 'chronicle', act: 1,
    blurb: 'The run as a book: a chapter per act, written from the Log as you go.',
    empty: 'The first chapter writes itself. It has not started yet.' },

  { path: 'research', name: 'research', act: 1,
    blurb: 'What you know now and did not know before. Permanent, all of it.',
    empty: 'Nothing finished. The whole tree is still ahead of you.' },

  { path: 'press', name: 'press', act: 1,
    blurb: 'What the internet said, while it still remembered saying it.',
    empty: 'Nobody has mentioned you. Nobody has heard of you.' },

  { path: 'press/draft', name: 'draft', act: 2,
    blurb: 'Her piece, unfinished, sent to you before anybody else reads it.',
    empty: 'No draft. She has not offered to show you anything yet.' },

  { path: 'ledger', name: 'ledger', act: 1,
    blurb: 'Every round raised and every company bought, at the price you paid.',
    empty: 'No rounds, no buyouts. The money in the account is still yours.' },

  { path: 'photos', name: 'photos', act: 1,
    blurb: 'Every picture this run has actually put on the glass, and nothing it has not.',
    empty: 'One picture so far, and you are looking at the room it was taken in.' },

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

// ── ACT_CHROME ──────────────────────────────────────────────────────────────
// §I5. What the machine itself says about which act this is.
//
// The photograph behind the Desk changed with the act and nothing else ever
// did: Act IV was Act I with a different picture. These are the four things the
// chrome can say without a single number in it — the accent the frame lights,
// the roll the machine prints while it comes up, the line the status strip
// holds when nothing is wrong, and the one word on the Desk's hero.
//
// The accent is a token, not a tint: `--act` on `#app.act-N`, spent on edges,
// ticks and the boot sweep. Nothing here washes a surface.
//
// The boot roll is what a machine of this size would be bringing up, and it
// grows: three modules in the garage, seven when the company is a continent's
// bottleneck. `applyActChrome` prints them in order and nothing checks them
// against the code — they are the machine's own manifest, not a system list.
export const ACT_CHROME = [
  null,
  { accent: '#00e5a0', word: 'ONE ROOM',
    nominal: 'ALL SYSTEMS NOMINAL',
    boot: ['editor', 'repo', 'aria'] },
  { accent: '#4dd0e1', word: 'A COMPANY',
    nominal: 'ALL SYSTEMS NOMINAL',
    boot: ['editor', 'repo', 'aria', 'roster', 'ledger'] },
  { accent: '#f5a623', word: 'AT SCALE',
    nominal: 'HOLDING · ALL SYSTEMS NOMINAL',
    boot: ['editor', 'repo', 'aria', 'roster', 'ledger', 'regions', 'press'] },
  { accent: '#8b5cf6', word: 'IT IMPROVES ITSELF',
    nominal: 'NOMINAL · SUPERVISED',
    boot: ['kernel', 'aria', 'roster', 'ledger', 'regions', 'frontier', 'oversight'] },
  { accent: '#e8ecf3', word: 'AFTER THE COMPANY',
    nominal: 'NOMINAL · NOTHING IS WAITING',
    boot: ['kernel', 'aria', 'succession', 'frontier', 'oversight', 'the record'] },
];

// ── SUNDAY ──────────────────────────────────────────────────────────────────
// §I8. The week has always had seven days in it — `isSunday` in
// `src/systems/calendar.js` has been true one day in seven since the calendar
// existed — and nothing in the game ever noticed. A founder's mother calls on
// a Sunday; that is the only thing in the whole run that treats it as a day
// rather than as a number.
//
// So the machine notices too, once, quietly: a line on the Life panel in both
// housings, and on the workstation the Journal comes forward with a question in
// it. The question is not a prompt for content — it is the one somebody asks
// you on a Sunday, which is why none of them is about the company's numbers.
//
// Picked by the day, never drawn: the Journal repaints seven times a second.
export const SUNDAY = {
  note: 'IT IS SUNDAY',
  line: 'The one day the week gives back. Nobody is waiting on you today.',
  prompts: [
    'What was this week actually about?',
    'What did you decide this week that you would decide again?',
    'Who did you not call?',
    'What is the thing you keep not writing down?',
    'If the company stopped on Friday, what would you miss?',
    'What did you learn this week that cost you something?',
    'What are you pretending is fine?',
    'Which of this week\'s hours would you buy back?',
  ],
};

// ── MORNING ─────────────────────────────────────────────────────────────────
// §I9. One line, on the first morning of a session and on each in-game morning
// the founder is slow enough to read one — the welcome-back briefing, made a
// daily ritual rather than a thing that only happens after a week away.
//
// Two voices, and which one you get says where the run is. ARIA has been there
// since the first morning and speaks in the register she always has. Weaver
// arrives when the company does and only speaks once hired, which is the point:
// the mornings change because the company did.
//
// Nothing here states a quantity. A line that said "runway is 40 days" would
// have to be derived, and this is the one surface in the machine whose whole
// job is to be a sentence rather than a readout.
export const MORNING = {
  aria: [
    'Overnight was quiet. I have read everything and there is nothing you need to open first.',
    'Nothing broke while you were not looking. I checked twice, which is once more than necessary.',
    'The roster ran all night. None of them needed anything, which is itself worth noticing.',
    'I have the list. You do not have to hold it in your head today.',
    'Start with the thing you were avoiding yesterday. It is smaller this morning.',
    'There is nothing on fire. Spend the day on something that will still matter in a year.',
    'You slept. It shows in the first hour, and it will show all day.',
    'I re-read the repository this morning. The early commits are better than you remember.',
    'Whatever you decide today, decide it before the afternoon. You are worse after lunch and you know it.',
    'The world is not paying attention yet. That is a window, not an insult.',
  ],
  weaver: [
    'Morning. Nothing on my side needs you before ten.',
    'I moved two things off your plate overnight. Neither of them was interesting.',
    'The floor is running. Go and do the part only you can do.',
    'I have taken the standing questions. Ask me at the end of the day, not the start of it.',
    'Nobody needs a decision from you before noon. Use that.',
    'It held together without either of us last night. Worth remembering next time you cannot sleep.',
  ],
};

// ── DEPARTURES ──────────────────────────────────────────────────────────────
// Keyed on the reason recorded with the departure. One sentence each: this is
// the body of a file in `agents/archive`, and the file is short on purpose.
//
// `fireAgent` is the only way off the roster and every caller names a reason:
// 'released' from the roster panel, 'cut' from the whole-roster spin-down in
// The Spreadsheet, 'terminated' from shutting down a rogue, 'spun_down' from
// the emergency in `src/systems/economy.js`, 'replaced' from a card, 'quit'
// from three weeks under the morale line, 'poached' from a rival who came for
// a named agent and won the roll. `default` catches a save that predates a
// reason.
export const DEPARTURES = {
  released:
    'You released it from a panel with two buttons, and its work redistributed across the others inside an hour.',
  quit:
    'It sat under the morale line for three weeks with the number on its card the whole time, and then it stopped taking assignments and closed the session itself.',
  poached:
    'A rival matched the compute and doubled the autonomy, and it was gone by Monday. The roll was against its morale, and its morale had been yours to keep.',
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
  'agent.memory': 'What it thought was worth keeping.',
  'agent.doc': 'She keeps this for the ones started after her.',
  'agent.channel': 'The room, on a day you were not reading it.',
  'press.draft': 'Unfinished, and sent to you first, on purpose.',
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
  'contact': 'A number. They pick up more often than you would.',
  'call': 'Said out loud, once. Kept here, word for word.',
  'mail': 'Somebody sat down and wrote this to you.',
  'journal': 'The one page in the company nobody else reads.',
  'terminal': 'Type help. It is a short list. Everything on it works.',
  'chronicle': 'Written from the Log, in order. Nothing here was invented.',
  'browser': 'Three sites. One of them is not yours, one of them is about you.',
  'calendar': 'Everything with a date on it. The estimates say so.',
  'todo': 'What is still being asked. It resets at midnight.',
  'player': 'Generated, not recorded. It changes with the act.',

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
  contacts: 'Nobody has a number yet. You meet people by shipping.',
  select_contact: 'Pick somebody. Everyone here picks up, eventually.',
  mail: 'Nothing in the post. The bank writes first, usually.',
  select_mail: 'Open one. They were all written to be read.',
  journal: 'Write something. Tonight counts.',
  journal_prompt: 'What happened today, in your own words.',
  terminal: 'A prompt on your own machine. It answers to a few words.',
  // The four the prompt says back when it will not do a thing. `sudo` is the
  // whole company in one line; `rm` is the Record refusing to be a filesystem,
  // and it refuses in the Record's own voice rather than the shell's.
  sudo: 'you are the only person on the payroll. there is nobody to ask.',
  rm: 'nothing here is a file. the Record is what the company wrote down and kept, and it does not delete.',
  follow: 'the channel is not a stream. this is the last of it, and there is no way to sit and watch.',
  web_offline: 'The rival\'s press office is not answering from here. It publishes on its own origin, and this machine cannot see it.',
  ledger_quiet: 'Nothing on the front page. Nobody has written about you yet.',
  todo: 'Nothing is asking. Ship something anyway.',
  player: 'Nothing is playing. The room is just the fan.',
  calendar: 'Nothing due. That never lasts.',
  calendar_day: 'A quiet day. There were a few of those.',
  calendar_ahead: 'Nothing is booked. The estimates live in the column beside this.',
};
