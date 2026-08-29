// ─────────────────────────────────────────────────────────────────────────────
// WHAT YOU ARE ACTUALLY DOING
//
// The four direct actions keep their ids for their whole life — `code`,
// `prompt`, `users`, `post` — because the keys, the tutorial anchors and the
// handlers all depend on them. What changes is what they mean.
//
// In Act I "Write Code" is literal: your hands, one file. In Act V the same
// keystroke is a founder putting one constraint into a system that has not
// needed a human in months. The mechanic is continuous; the fiction is not, and
// a button that still says "Your own hands. Slow, clean, and yours." while you
// mediate 40% of world GDP is the game failing to notice its own story.
//
// Missing acts fall back to Act I. `prompt` deliberately carries no desc: the
// Desk builds that from the current prompting approach.
// ─────────────────────────────────────────────────────────────────────────────

export const ACT_VERBS = {
  1: {
    code:   { name: 'Write Code',      desc: 'Your own hands. Slow, clean, and yours.' },
    prompt: { name: 'Prompt the AI' },
    users:  { name: 'Talk to Users',   desc: 'The only way to stop guessing.' },
    post:   { name: 'Post Publicly',   desc: 'Small odds of a very large day.' },
  },
  2: {
    code:   { name: 'Write It Yourself', desc: 'Faster than explaining it. Still true, for now.' },
    prompt: { name: 'Prompt the AI' },
    users:  { name: 'Call Ten Users',    desc: 'They say the thing the dashboard cannot.' },
    post:   { name: 'Post Publicly',     desc: 'You have an audience now. It cuts both ways.' },
  },
  3: {
    code:   { name: 'Review the Diff',   desc: 'Nobody else here can say what good looks like.' },
    prompt: { name: 'Direct the Swarm' },
    users:  { name: 'Sit With Support',  desc: 'Read the tickets nobody thought to escalate.' },
    post:   { name: 'Say Something',     desc: 'A sentence from you moves a market now.' },
  },
  4: {
    code:   { name: 'Set the Constraint', desc: 'One rule, written by hand, that everything obeys.' },
    prompt: { name: 'Direct the Swarm' },
    users:  { name: 'Read the Raw Feed',  desc: 'Unaggregated, unfiltered, and difficult.' },
    post:   { name: 'Address It Directly', desc: 'The room is very large and it is listening.' },
  },
  5: {
    code:   { name: 'Steer the Run',   desc: 'Your hands on a thing that no longer needs them.' },
    prompt: { name: 'Ask It Directly' },
    users:  { name: 'Listen',          desc: 'To the people all of it was supposedly for.' },
    post:   { name: 'Speak',           desc: 'What you say now is what it will have meant.' },
  },
};

export function verbFor(act, id) {
  return (ACT_VERBS[act] && ACT_VERBS[act][id]) || ACT_VERBS[1][id];
}
