// ─────────────────────────────────────────────────────────────────────────────
// THE LANDING — the prose the first screen prints below the hero.
//
// Content is data, and this file is under `tools/copylint.mjs` like every other
// content module. Two rules bind harder here than anywhere else in the game:
//
//   1. **Nothing states a quantity.** Every number the landing prints — cards,
//      choices, endings, letters, people, tools — is counted at render time by
//      `counts()` in `src/ui/landing.js` from the modules that hold them. A
//      sentence here that says "sixteen endings" is a sentence that goes wrong
//      the next time somebody writes one.
//   2. **The act lines are `docs/STORY.md`, one sentence each.** That file is
//      the story's own account of itself; if an act changes shape, it changes
//      there first and here second.
//
// `src/ui/landing.js` is the runtime that reads this and nothing else.
// ─────────────────────────────────────────────────────────────────────────────

// ── The five acts ───────────────────────────────────────────────────────────
// Keyed by act id so the banner, the name and the subtitle can be read out of
// `ACTS` in `balance.js` rather than repeated here. One sentence each, taken
// from that act's section in `docs/STORY.md`.
export const ACT_LINES = [
  { id: 1, text: 'You and ARIA, your first agent. Writing it yourself is genuinely the fastest way to get anything done, and the game says so out loud.' },
  { id: 2, text: 'The act where doing it yourself stops working. Agents get lanes, autonomy and morale, and tech debt starts charging real interest.' },
  { id: 3, text: 'Scale turns the environment from weather into politics. Regions, regulatory heat, public approval, and a rival who develops an actual grudge.' },
  { id: 4, text: 'Capability compounds and the race becomes the spine of the run. You can win the company and lose the century.' },
  { id: 5, text: 'The commitments open, the gates start closing on their own, and the run gets its ending. The good ones are mutually exclusive.' },
];

// ── The movements ───────────────────────────────────────────────────────────
// One entry per section below the hero: the mono eyebrow, the line that carries
// it, and the paragraph under that. `note` is the small line at the foot of a
// section. Nothing here counts anything.
export const SECTIONS = {
  cold: {
    label: 'Cold open',
    title: 'The machine is already awake.',
    body: 'This is the first thing the game shows you, on the morning nothing has happened yet. It plays once, and then you are inside it.',
  },
  cast: {
    label: 'The cast',
    title: 'A card from a person is not a card from a system.',
    body: 'Each of these has an arc that runs the length of the run, a phone key, and a tie that cools while you are not looking. They arrive when the run gives them a reason to, and they remember what you said last time.',
    hint: 'Scroll the rail for the rest',
    note: 'The one with no photograph is the person you live with. There is no phone key for Jo: you come home or you do not.',
  },
  acts: {
    label: 'The run',
    title: 'Vibe coder. Agentic engineer. The world\'s first trillionaire solopreneur?',
    body: 'Or just a person with a laptop in an age of unlimited leverage. Every act closes on a number and on a deed, and the deed has more than one door, so the act ends when you arrive rather than when the calendar does.',
  },
  world: {
    label: 'The world layer',
    title: 'Your assistant plays the world against you.',
    body: 'Open this page in a browser with site tools and the model you are already talking to gets a hand of its own. It writes into the same deck the game draws from, and every effect it lands is bounded twice before it reaches you.',
  },
  endings: {
    label: 'The endings',
    title: 'You get one.',
    body: 'Four arrive unasked, five are offered by a card you are free to refuse, and seven are built — and the first commitment locks the path.',
  },
  housings: {
    label: 'Two housings',
    title: 'The same game, in two machines.',
    body: 'The console is one screen with a rail of decisions down the right. The workstation is a desktop: a menu bar, a dock, windows you arrange, a filesystem generated out of the company\'s own history. They share one save, in both directions.',
  },
  numbers: {
    label: 'What is in it',
    title: 'Counted at the moment you loaded this page.',
    body: 'Every figure below is read out of the file that holds the thing, so none of them can drift away from the game.',
  },
};

// ── What the assistant actually does ────────────────────────────────────────
// Three plates, and each names the tools it is talking about. The names are
// checked against the published surface at render time — a plate that lists a
// tool the game does not mint prints nothing for it rather than a promise.
export const WORLD_PLATES = [
  {
    id: 'cards',
    title: 'It writes the cards',
    body: 'The slot the deck was about to fill is offered to your assistant first. What comes back is a card with a face, choices and consequences, judged against what the written deck already does to you.',
    tools: ['write_event', 'example_cards', 'remember'],
  },
  {
    id: 'cast',
    title: 'It speaks for the cast',
    body: 'Vance posts. ARIA answers. The phone rings at a bad time and the person on it knows what happened last week. You can also type a move nobody wrote a button for, and it decides what that costs.',
    tools: ['post_as_character', 'aria_says', 'take_the_call', 'ring_the_founder', 'answer_in_own_words'],
  },
  {
    id: 'market',
    title: 'It turns the market and calls the regulators',
    body: 'Weather over the whole sector, a rival lab that plays its own week, and a senator who has read your filings. None of it reaches a reducer except through the keys the world is allowed to touch.',
    tools: ['market_weather', 'rival_move', 'regulator_pressure'],
  },
];

// The fourth plate, quieter: the path with nobody at the table. It is the one
// most people will take, and the page says so rather than treating it as a
// degraded mode.
export const NO_ASSISTANT = {
  id: 'alone',
  title: 'Or no assistant at all',
  body: 'The game is finished without one. The written deck plays, the rival lab runs its own policy, the phone still rings. Nothing on this page is a demo.',
};

// ── What falls in the rain ──────────────────────────────────────────────────
// The hero's background is digital rain, and every so often a column drops a
// real word read top to bottom. Most of them are read out of the game at
// render — the five acts, the deck's own short card titles, the tools the
// world holds on the first morning, the kinds of thing a founder ships. These
// four belong to no list: the name of the thing, the two machines that talk,
// the account that answers every post, and the minute the story starts.
export const RAIN_WORDS = ['SINGULARITY', 'ARIA', 'HELIX', 'nullptr', '4:06 AM'];

// ── The foot ────────────────────────────────────────────────────────────────
export const FOOTER = {
  line: 'Everything is simulated locally and saved in your browser. No account, no server, no telemetry.',
  built: 'Built on WebMCP.',
  repo: 'https://github.com/AbhisekBasu1/singularityinc',
  licence: 'MIT',
};
