// ─────────────────────────────────────────────────────────────────────────────
// THE RACE — rival frontier labs, visibly closing. Act III onward.
// Progress is 0..100. Reaching 100 is the point of no return for somebody.
//
// Each lab is a company as well as a curve. `co` is what it opens with and how
// it spends a week — `systems/labs.js` plays it, `RIVAL_LABS` in balance.js
// prices it. Aperture is the exception: it has a real competitor record in the
// market and `systems/rivalco.js` has always played its week, so it carries no
// `co` here and the race reads its capability off the company the founder can
// actually see.
//
//   wealth   multiple on RIVAL_LABS.START_FUNDING
//   heads    multiple on RIVAL_LABS.START_ROSTER
//   weights  its own bias over the five plays, before funding and act
//   blocs    where it goes first on the region board, in order
// ─────────────────────────────────────────────────────────────────────────────

export const LABS = [
  { id: 'aperture', name: 'Aperture Systems', tag: 'the rival you know',
    color: '#ff4d5e', icon: '⚔', base: 0.052, volatility: 0.35, safety: 0.25,
    line: 'Marcus Vance is not going to lose twice.',
    linkedChar: 'vance' },
  { id: 'meridian_state', name: 'The Consortium', tag: 'four governments, one budget',
    color: '#60a5fa', icon: '⚑', base: 0.040, volatility: 0.15, safety: 0.55,
    line: 'Slow, enormous, and answerable to voters. That last part cuts both ways.',
    co: { wealth: 2.6, heads: 2.2, blocs: ['eu', 'na', 'af', 'latam'],
          weights: { hire: 2.6, research: 2.4, raise: 1.6, expand: 2.2, quiet: 0.6 } } },
  { id: 'obsidian', name: 'Obsidian Research', tag: 'nobody knows who funds it',
    color: '#a3a3a3', icon: '◌', base: 0.048, volatility: 0.55, safety: 0.08,
    line: 'No papers. No product. Three datacenters and a nine-figure power contract.',
    co: { wealth: 1.9, heads: 0.7, blocs: ['me', 'sea'],
          weights: { hire: 1.4, research: 4.2, raise: 1.2, expand: 0.5, quiet: 1.6 } } },
  { id: 'commons', name: 'The Open Commons', tag: 'everyone at once',
    color: '#00e5a0', icon: '⌘', base: 0.036, volatility: 0.25, safety: 0.7,
    line: 'Forty thousand contributors and no one to negotiate with.',
    co: { wealth: 0.5, heads: 2.8, blocs: ['in', 'sea', 'af'],
          weights: { hire: 3.0, research: 2.6, raise: 0.5, expand: 0.7, quiet: 1.0 } } },
];

export const LAB_MAP = Object.fromEntries(LABS.map((l) => [l.id, l]));

// What a lab did with its week, in words. Tokens: {them} {you} {n} {node}
// {bloc}. Third person, present tense — the register of somebody reporting on
// an institution rather than on a company, because that is what these are.
export const LAB_PLAYS = {
  hire: { name: 'Hired', icon: '◉', lines: [
    '{them} adds {n} researchers. The postings did not say where, which is itself a location.',
    '{them} is hiring at {n} a month and has stopped publishing the org chart.',
    '{n} more names at {them}. Four of them left tenured positions to be there.',
    'A recruiting round at {them}: {n} people, and a relocation package that reads as a warning.',
  ] },
  research: { name: 'Research', icon: '⌬', lines: [
    '{them} finishes {node}. The write-up is two pages and the appendix is sealed.',
    '{node} is done at {them}. They announce it in a footnote to something else.',
    '{them} completes {node} and says nothing at all, which everybody reads as the announcement.',
    'Word out of {them}: {node}, working, on hardware nobody outside has costed.',
  ] },
  raise: { name: 'Funded', icon: '↗', lines: [
    'A new tranche for {them}. The line item is classified and the number is not.',
    '{them} closes its funding for the year. Three of the signatures are sovereign.',
    'Money into {them} again — enough to run the whole thing for a decade at this size.',
    '{them} is refinanced. Nobody involved describes it as an investment.',
  ] },
  expand: { name: 'Expanded', icon: '⊕', lines: [
    '{them} signs an agreement in {bloc}. It is described as a research partnership.',
    '{bloc} announces a hosting arrangement with {them}. Nobody names the terms.',
    '{them} opens in {bloc} — a building, a power contract, and a ministry liaison.',
    'A memorandum between {them} and {bloc}, signed on a Friday, published on a Sunday.',
  ] },
  quiet: { name: 'Quiet', icon: '◌', lines: [
    'Nothing out of {them} this quarter. Their power draw did not go down.',
    '{them} publishes nothing for weeks. Two of their people have stopped attending anything.',
    'A quiet stretch at {them}. Quiet is what they do instead of announcing.',
    '{them} cancels its own workshop with no reason given, which is the reason.',
  ] },
};

// Narrative beats keyed to how close the leader is.
export const RACE_BEATS = [
  { at: 25, id: 'race_25', text: 'The frontier is no longer a research question. It is a schedule.' },
  { at: 50, id: 'race_50', text: 'Halfway. The conversations have changed from "whether" to "who".' },
  { at: 75, id: 'race_75', text: 'Every capability announcement is now a national security briefing.' },
  { at: 92, id: 'race_92', text: 'Someone is going to cross the line this year.' },
];
