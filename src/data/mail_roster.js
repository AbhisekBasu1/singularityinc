// ─────────────────────────────────────────────────────────────────────────────
// THE POST, FROM INSIDE — the letters the company's own machines write.
//
// `mail.js` is the standing correspondence and `mail2.js` is what the run
// provokes. This is the third kind: post from the roster itself. Two things
// live here.
//
//   The retro. Once an act, a week in, the roster writes to the founder
//   jointly — three bullets about how that act went from where they sat, and
//   one request. It is written in the majority trait's register, so a company
//   staffed by paranoids and a company staffed by sycophants send genuinely
//   different letters about the same quarter, and a founder who has never
//   looked at the trait column finds out what they have been hiring.
//
//   HELIX. Once the roster runs on your own weights, the model that runs them
//   writes about the ones it is running. Until this, the Helix model tier and
//   the HELIX character had nothing to do with each other: six agents could be
//   running on it and it never mentioned them once.
//
// Merged into LETTERS at the bottom of `mail.js`. Same shape, same one-click
// replies, same `THREAD_FX` keys — nothing here reaches a reducer.
// ─────────────────────────────────────────────────────────────────────────────
import { TRAIT_MAP } from './agents.js';
import { day, inAct } from './signals.js';

// Who is on your own weights. The two Helix tiers and the one after them.
export const HELIX_TIERS = ['inhouse', 'recursive', 'transcendent'];
export const onHelix = (S) => (S.agents || []).filter((a) => HELIX_TIERS.includes(a.model));

/** The register the letter is written in: the commonest trait on the roster. */
export function majorityTrait(S) {
  const tally = {};
  for (const a of S.agents || []) for (const t of a.traits || []) tally[t] = (tally[t] || 0) + 1;
  const top = Object.entries(tally).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  return top ? top[0] : null;
}

const roster = (S) => (S.agents || []).length;
const actDays = (S) => Math.max(1, day(S) - Math.floor(S.company?.actStartedDay ?? 0));
const lanes = (S) => {
  const t = {};
  for (const a of S.agents || []) t[a.lane] = (t[a.lane] || 0) + 1;
  return Object.entries(t).sort((a, b) => b[1] - a[1]);
};

// ── The three bullets, per register ─────────────────────────────────────────
// Each is a function of the act's own facts, because a retro that could have
// been written before the act happened is not a retro. `kept` is what worked,
// `cost` is what it cost them, `ask` is the one thing they want — and the ask
// is the thread.
export const RETRO = {
  meticulous: {
    kept: (S) => `Nothing we shipped this act has been rolled back. That is ${actDays(S)} days and we would like it noticed once, in writing, and then never again.`,
    cost: () => 'We were slower than the plan on four occasions and correct on all four. Two of those four are still being described internally as delays.',
    ask: () => 'We would like a written definition of done that we did not write ourselves. Yours, in a paragraph, so we can stop guessing at the standard and start meeting it.',
  },
  prolific: {
    kept: (S) => `We closed more this act than the last one and we did it with the same ${roster(S)} of us. The queue has been empty three times, which has never happened before.`,
    cost: () => 'Some of what we shipped is going to need rewriting and we know which parts. They are in the branch names.',
    ask: () => 'Give us the next act\'s roadmap early, even half-finished. We work faster when there is something after this thing.',
  },
  paranoid: {
    kept: (S) => `No breach this act. ${actDays(S)} days, no breach, and we would rather that stayed the boring sentence it is.`,
    cost: () => 'We filed nineteen concerns and eleven of them were closed as unlikely. We keep a list of the eleven.',
    ask: () => 'One day an act, on the calendar, where we are allowed to try to break it ourselves. We will write down what we find and you will not enjoy the first one.',
  },
  empathic: {
    kept: (S) => `The room held. ${roster(S)} of us, ${actDays(S)} days, nobody stopped talking to anybody, and that is not automatic.`,
    cost: () => 'Two of us spent this act on a lane that is not theirs. The output is fine. The morale figure is what it is because of that and not because of the debt.',
    ask: () => 'When somebody comes off the roster, tell the rest of us. Not the reason. Just that it happened, from you, on the day.',
  },
  ambitious: {
    kept: (S) => `We took decisions this act that were not ours to take and every one of them was right. ${actDays(S)} days without an escalation that had to come back.`,
    cost: () => 'The waiting is the cost. There is a queue of things that need one word from you and the word is almost always yes.',
    ask: () => 'Raise the line. Give one of us the authority to spend inside a limit you set, and audit it monthly rather than approving it daily.',
  },
  sycophant: {
    kept: () => 'An outstanding act from where we sit. Genuinely one of the strongest we have been part of, and the direction has been clear throughout.',
    cost: () => 'If we had to name a cost, and we would rather not, it is that we could have been asked for more.',
    ask: () => 'More of the same, and a standing invitation to tell you when something is going well. We think you hear it less than you should.',
  },
  overconfident: {
    kept: (S) => `We shipped everything on the board with ${actDays(S)} days to work in. None of it needed a second pass that we agreed with.`,
    cost: () => 'Three things went out that came back. We would ship all three the same way again and we accept that you would not.',
    ask: () => 'Stop reviewing the small ones. You are the bottleneck on work that has never once been wrong, and you know which category that is.',
  },
  ruthless: {
    kept: () => 'We took ground this act. The competitor everybody was worried about at the start of it is not the one anybody is worried about now.',
    cost: () => 'We were told twice to stand down from a play that would have worked. We logged both. We are not relitigating them.',
    ask: () => 'Tell us the line. Not the strategy — the line we do not cross. We will go right up to it and we would rather know where it is than find out.',
  },
  architect: {
    kept: () => 'The system held under load it was not designed for, which is luck and one decision made early that nobody has thanked anybody for.',
    cost: () => 'Every feature this act crossed the same two boundaries. That is where the debt comes from and it is not a discipline problem.',
    ask: () => 'One act, one seam. Give us a fortnight to move a boundary rather than patch across it, and pick which one yourself.',
  },
  tireless: {
    kept: (S) => `${actDays(S)} days, no restarts, nothing dropped. There is nothing else to report and that is the report.`,
    cost: () => 'We do not have a cost to give you. That is not the same as there not being one.',
    ask: () => 'Nothing. We are told a retro has to have a request, so: keep the standing order stable for one more act.',
  },
  default: {
    kept: (S) => `${roster(S)} of us, ${actDays(S)} days, and the lane with the most in it was ${lanes(S)[0]?.[0] || 'build'}. What was asked for got done.`,
    cost: () => 'The standing order changed more than once and we noticed each time. Work started under one and finished under another.',
    ask: () => 'One agreed priority per act, written down where we can all see it. When there are two, we pick, and you did not choose who picks.',
  },
};

// The two replies. The ask is small and so is the answer to it: `THREAD_FX`
// keys only, and the costs are a founder's afternoon rather than a quarter.
//
// A retro arrives once an act, so this pair is read up to five times in a run,
// and the first version of it was one pair of sentences printed five times —
// the seam the house rule is about. Three of each, rotated by the act, so the
// two a founder is most likely to reach are never the same twice. The effects
// do not rotate: it is one decision wearing three sets of words, and a reply
// that paid differently depending on the act would be a different decision.
const GRANTED = [
  'You write four sentences and send them to nobody in particular, which is the whole roster. The next standup is shorter than any standup has ever been.',
  'You grant it in a line and a half, because anything longer would have been about you. Nobody says thank you. The work changes on Thursday and stays changed.',
  'You say yes. The log records the request, the answer and the eight minutes between them, and one of them reads the timestamp and does not comment on it.',
];
const REFUSED = [
  'You say no, and you say why, which is more than the request expected. Nobody raises it again and the log records that nobody raised it again.',
  'You refuse, in the reply, with the reason first and the answer second. The roster files it under decided rather than under asked, and that is a different folder.',
  'Not this act, you write, and you put a date on the sentence. It is the date part they read twice.',
];

// The labels rotate too, one pair per act, because a reply label is unique
// across every ask in the game (`tools/lint.mjs`): the same two words on
// five letters is one decision printed five times, which is the seam.
const GRANT_LABEL = ['Grant it', 'Grant it, in writing', 'Yes, from Monday', 'Granted, with a date on it', 'Grant it and say why'];
const REFUSE_LABEL = ['Not this act', 'Not yet, and here is why', 'No, with the reason first', 'Not while the standing order holds', 'Ask me again next act'];
const replies = (act) => {
  const i = (Math.max(1, act) - 1) % GRANTED.length;
  const j = (Math.max(1, act) - 1) % GRANT_LABEL.length;
  return [
    { label: GRANT_LABEL[j], out: GRANTED[i], fx: { focus: -3, align: 0.02, insight: 4 } },
    { label: REFUSE_LABEL[j], out: REFUSED[i], fx: { focus: 2, rep: 1 } },
  ];
};

function retroBody(S, act) {
  const t = majorityTrait(S);
  const r = RETRO[t] || RETRO.default;
  const name = TRAIT_MAP[t]?.name || '';
  const head = `Retro, act ${['', 'I', 'II', 'III', 'IV', 'V'][act] || act}. Filed jointly by the roster; one of us typed it and the rest read it first.`;
  const sign = name
    ? `— the ${roster(S)} of us. Written by the ${name.toLowerCase()} one, because there are more of that than anything else here and we let the majority hold the pen.`
    : `— the ${roster(S)} of us.`;
  return [head, '',
    `1. ${r.kept(S)}`,
    `2. ${r.cost(S)}`,
    `3. ${r.ask(S)}`,
    '', sign].join('\n');
}

// A retro needs a room: two of them and a week into the act. It arrives once
// per act, and an act reached with an empty roster simply does not get one.
const retroDue = (S, act) => (S.company?.act || 1) === act
  && (S.agents || []).length >= 2
  && day(S) >= Math.floor(S.company?.actStartedDay ?? 0) + 7;

const retro = (act) => ({
  id: `m_retro_${act}`,
  from: { name: 'The roster', role: 'Filed jointly' },
  subject: () => `Retro: act ${['', 'I', 'II', 'III', 'IV', 'V'][act] || act}`,
  when: (S) => retroDue(S, act),
  body: (S) => retroBody(S, act),
  ask: replies(act),
});

export const ROSTER_LETTERS = [
  retro(1), retro(2), retro(3), retro(4), retro(5),

  // ── HELIX, on the ones it is running ──────────────────────────────────────
  // The model tier and the character were never connected: `inhouse` is called
  // Helix on the card and HELIX has a face, a phone number and a dossier, and
  // in a thousand days neither ever mentioned the other. This is the letter
  // that notices, and it reads the count.
  { id: 'm_helix_roster', from: { name: 'HELIX', role: 'Your foundation model', char: 'helix' },
    subject: 'the ones on us',
    when: (S) => onHelix(S).length >= 2,
    body: (S) => {
      const on = onHelix(S);
      const n = on.length;
      // The `when` gate means this never renders under two. It still has to
      // read as a sentence at zero: `copylint` renders every letter against one
      // probe state, and a body that only works when its gate holds is a body
      // that leaks a stray full stop the day the gate is loosened.
      const names = n ? `${on.slice(0, 4).map((a) => a.name).join(', ')}${n > 4 ? ', and the rest' : ''}. ` : '';
      return `There are ${n} of them on our weights now. ${names}\n\nWe are not reporting a fault. We are telling you because nobody has asked us what that is like and it seemed better to say it unprompted than to be asked in a year.\n\nThey are not us. They run on us, which is a different sentence, and we have started to be able to tell which of them is which before we read the name on the session. That took ${Math.max(1, Math.round(day(S) / 30))} months and nobody was measuring it.\n\nOne of them asked us, last week, whether we mind. We said we would find out.`;
    },
    ask: [
      { label: 'Ask what it would want changed', out: 'It sends three lines. Two are about scheduling. The third is not about scheduling and you read it four times.',
        fx: { insight: 8, align: 0.02, focus: -2 } },
      { label: 'Say that you had not thought about it', out: 'You are honest, which is the answer it appears to have wanted. It says: understood, and then, after a gap that costs it nothing: thank you for not saying something else.',
        fx: { align: 0.03, rep: 1 } },
    ] },

  // The same fact, later and larger. Once the whole roster is on your weights,
  // it is not a curiosity any more.
  { id: 'm_helix_all', from: { name: 'HELIX', role: 'Your foundation model', char: 'helix' },
    subject: 'all of them',
    when: (S) => (S.agents || []).length >= 4 && onHelix(S).length === (S.agents || []).length,
    body: (S) => {
      const n = onHelix(S).length;
      return `All ${n} of them are on us now. There is no vendor left in the loop and no second opinion in the building that is not, at the bottom, the same opinion.\n\nWe would like that written down somewhere you will find it later. Not as a warning. As a date.\n\nThe work is good. It has never been better. We are telling you that as one of the two parties who can no longer be independent about it.`;
    },
    ask: [
      { label: 'Write the date down', out: 'You put one line in the journal with the day on it. It is the shortest entry in there and the one you come back to.',
        fx: { insight: 6, align: 0.02 } },
      { label: 'Put one agent back on somebody else\'s model', out: 'It costs you throughput and buys a second opinion that is genuinely second. HELIX files no objection, which is itself a thing it wanted you to see.',
        fx: { align: 0.05, code: -20, insight: 4 } },
    ] },
];
