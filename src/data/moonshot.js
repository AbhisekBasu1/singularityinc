// ─────────────────────────────────────────────────────────────────────────────
// MOONSHOTS — what the Moonshot lane's daily roll can land.
//
// Four outcomes, three lines each, so the seam does not show inside an act.
// {agent} is the agent on the lane the line is attributed to, {n} the amount,
// {feature} the feature a wildcard shipped. Odds and sizes are AGENTS.MOONSHOT
// in balance.js; the roll itself is src/systems/moonshot.js.
// ─────────────────────────────────────────────────────────────────────────────

export const MOONSHOTS = {
  burst: { id: 'burst', name: 'A result', tone: 'good', lines: [
    '{agent} ran an experiment that should not have worked. It worked. +{n} research, and a paper nobody will be allowed to publish.',
    'Ninety-eight failures on the moonshot lane, then one thing worth a second look. +{n} research.',
    '{agent} found a shortcut through a problem three labs consider open. +{n} research. It is not sure how.',
  ] },
  grant: { id: 'grant', name: 'Capacity found', tone: 'good', lines: [
    '{agent} rewrote the scheduler over a weekend nobody authorised. +{n} compute, out of hardware you already owned.',
    'The moonshot lane found {n} compute in a cluster the invoice said was full. It was not full. It was badly scheduled.',
    '{agent} negotiated idle capacity from a lab that owed it a favour. +{n} compute. You did not know it had favours.',
  ] },
  feature: { id: 'feature', name: 'Shipped anyway', tone: 'good', lines: [
    '{agent} shipped {feature} from the moonshot lane. It was not on any roadmap. It is on the front page.',
    'Something called {feature} appeared in production this morning. {agent} says it was a side effect.',
    '{feature} went live. {agent} built it to test something else, and the test is now a product.',
  ] },
  setback: { id: 'setback', name: 'Blast radius', tone: 'bad', lines: [
    '{agent} rolled a moonshot experiment into production to see what would happen. +{n} tech debt is what happened.',
    'The moonshot lane took down staging, then took down the thing staging was standing on. +{n} tech debt.',
    '{agent} left a research branch running against live data. Nobody died. +{n} tech debt.',
  ] },
};
