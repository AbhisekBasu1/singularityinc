// ─────────────────────────────────────────────────────────────────────────────
// APERTURE SYSTEMS, PLAYING — what it does with its week, in words.
//
// `src/systems/rivalco.js` decides; these are the lines the decision is
// reported in, on their site and occasionally in the Wire. Tokens: {them}
// {you} {n} {node}. Third person, present tense, the register of a trade
// paper writing about a company it half admires.
// ─────────────────────────────────────────────────────────────────────────────

export const PLAYS = {
  hire:     { name: 'Hired', icon: '◉', lines: [
    '{them} adds {n} to the roster. The job ad did not mention {you}. The interviews did.',
    '{them} is hiring again — {n} people this month, two of them from companies that used to compete with {you}.',
    '{n} new names on the {them} team page. Three of them have shipped against {you} before and say so in their bios.',
    '{them} hires {n}. The press release says "world-class." The org chart says "the people {you} did not make offers to."',
    'A hiring post from {them}, {n} roles, all of them titled the way {you} titles them. Imitation, or recruiting from the same pool. Both.',
    '{them} opens {n} seats and fills them in a week. Whatever they are building needs hands, and they have decided it is a race.',
  ] },
  ship:     { name: 'Shipped', icon: '◈', lines: [
    '{them} ships a release. The changelog is long and one line in it is about a thing {you} does better.',
    'A quiet release from {them}: quality up, nothing announced, which is how they announce things now.',
    '{them} ships. Half the changelog is a feature {you} has had for a quarter, described as new. The other half is genuinely new.',
    'Release day at {them}. The demo is good. The demo is always good; the question is Tuesday.',
    '{them} ships something small and correct and says nothing about it. That is the version of them to worry about.',
    'A release from {them} with a migration guide for people leaving {you}. It is twelve steps and the twelfth is a discount.',
  ] },
  research: { name: 'Research', icon: '⌬', lines: [
    '{them} starts on {node}. They are not hiding it; they are hiring for it.',
    '{them} finishes {node}. The paper is thin and the demo is not.',
    '{them} puts {node} on the roadmap and a headcount behind it. The roadmap is public. The headcount is the tell.',
    'Word that {them} is deep into {node}. Two of the names on the preprint used to work on the same problem for {you}.',
    '{them} publishes on {node}. The benchmark table has one row conspicuously missing, and it is {you}.',
    '{node}, at {them}, is done. Vance says so on stage in eleven words and does not take questions.',
  ] },
  price:    { name: 'Repriced', icon: '⌗', lines: [
    '{them} moves its pricing page. Down. The footnote names no competitor and everybody knows which one it means.',
    'A new pricing page at {them}: one tier fewer, one number smaller, and a comparison table with {you} in the last column.',
    '{them} cuts the price of the thing {you} charges most for. It is a loss leader, and everybody can do the arithmetic.',
    '{them} undercuts again. The sales team calls it "aligning with the market." The market is {you}.',
    'A footnote on the {them} pricing page now reads "for teams switching from other tools." There is one other tool.',
  ] },
  raise:    { name: 'Raised', icon: '↗', lines: [
    '{them} closes a round. The deck was mostly about the category. The category is mostly {you}.',
    '{them} raises. The number is large and the announcement is short, which is how you know the number is real.',
    'A round for {them}, led by a fund that passed on {you}. Somebody at that fund is sending a message, and it is not to {them}.',
    '{them} announces new capital and a "war chest." Nobody uses that phrase about a company they intend to run quietly.',
    'Fresh money at {them}. Vance tells the press it is for research. The hiring page says it is for sales.',
  ] },
  poach:    { name: 'Poached', icon: '⚔', lines: [
    '{them} is paying above market for anyone who has shipped against it. Everyone knows who that is.',
    'Recruiters from {them} are in the inboxes of everyone who has ever committed to {you}. Two of them replied.',
    '{them} hires away somebody who wrote a piece of {you}. The exit interview was gracious. The job title is not.',
    'A referral bonus at {them} for "candidates from the competition." The competition is one company long.',
    '{them} takes a run at your people and gets one. The one it got was the one you were about to promote.',
  ] },
  quiet:    { name: 'Quiet', icon: '◌', lines: [
    '{them} goes quiet for a week. It has done this before, and something usually follows.',
    'Nothing from {them} this week. No release, no post, no hire. Their people are online at 2am.',
    '{them} cancels a launch event with no explanation. The last time they did that, the next release was the good one.',
    'Silence from {them}. Vance has not posted in nine days, which for Vance is a statement.',
    'A quiet week at {them}. Quiet at a company like that is not rest; it is the sound of a thing being built.',
  ] },
  expand:   { name: 'Expanded', icon: '⊕', lines: [
    '{them} opens in {bloc}. The announcement thanks a minister by name and does not mention {you}.',
    'A regional office for {them} in {bloc} — localisation, a data centre, and a lobbying budget.',
    '{them} signs in {bloc}. The terms are not public and the timing, three weeks after your own filing, is.',
    '{bloc} names {them} as a supplier. It is the first list of that kind {you} is not on.',
    '{them} takes {bloc}: a building, a hiring page in the local language, and a price that only works at scale.',
  ] },
  frontier: { name: 'Frontier', icon: '✦', lines: [
    '{them} points the company at the frontier. Three teams, one goal, and a power contract to match.',
    '{them} signs for compute at a scale that only makes sense if the product is no longer the point.',
    'Everything at {them} is the race now. The consumer team has been folded into "capabilities." Nobody announced it.',
    '{them} pulls people off the product and onto the frontier. Users notice a week later, and stay anyway.',
    'A frontier update from {them}: a number, a chart, and a sentence about safety that is exactly one sentence long.',
  ] },
};

export const FOCUS = {
  auto:     { name: 'Their own judgement', line: 'Vance decides, week by week, the way he always has.' },
  research: { name: 'The tree', line: 'Every spare dollar into what they do not know yet.' },
  growth:   { name: 'Growth', line: 'Hire, ship, hire. Buy the market before it notices.' },
  price:    { name: 'The price war', line: 'Undercut until one of you flinches.' },
  raise:    { name: 'The war chest', line: 'Raise now, spend later, lose money for years if it works.' },
  poach:    { name: 'Your people', line: 'The fastest way to a roadmap is to hire the people who wrote it.' },
  frontier: { name: 'The frontier', line: 'The race. Everything else is a means.' },
  expand:   { name: 'The board', line: 'Blocs, ministries, and a building in every timezone.' },
  quiet:    { name: 'Quiet', line: 'Nothing for a while. It is never nothing.' },
  human:    { name: 'A person', line: 'Somebody is sitting in Vance\'s chair. Every move is theirs.' },
};
