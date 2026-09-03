// ─────────────────────────────────────────────────────────────────────────────
// THE CHRONICLE — the sentences the book is built from.
//
// `src/systems/chronicle.js` assembles a run's history into prose; this is
// every line of that prose that is not already the game's own. Openers and
// closers per act, the connectives that turn a journal entry into a sentence,
// and the verdicts on people. Tokens: {company} {founder} {product} {days}
// {users} {mrr} {act}. Second person, past tense, in the game's voice.
// ─────────────────────────────────────────────────────────────────────────────

export const OPENERS = {
  1: [
    { text: 'It began in one room, with one laptop and nothing coming in. {founder} called it {company}, and for {days} days that was most of what it was.' },
    { text: '{company} was a repository and a cursor for the first {days} days. The product was called {product}. Nobody was waiting on it, which was the freedom and the problem.' },
    { text: 'The garage act: {days} days, one person, and a machine that would build exactly what it was told. Most of what {founder} learned in that time was how to say what they meant.' },
  ],
  2: [
    { text: 'Act II lasted {days} days and it was the act in which {company} stopped being a person and became a place people worked, most of them machines. There were {users} users by the end of it.' },
    { text: 'The machine years. {days} of them. {company} learned to run without {founder} in the room, and {founder} learned what that felt like.' },
    { text: 'Act II was when other people arrived — {users} users, a roster, a rival with a name — and it was the last act in which any of them spoke to {founder} as a person rather than an institution.' },
  ],
  3: [
    { text: 'By Act III {company} was a bottleneck for a continent. {days} days of it, and by the end {users} people depended on something that had started as a text field.' },
    { text: 'Escape velocity. For {days} days the numbers stopped meaning what they used to mean, and the people who called stopped calling as people.' },
    { text: 'In Act III {company} was written about by people who had never used it and regulated by people who had. {days} days of that, and {mrr} a month by the end.' },
  ],
  4: [
    { text: 'Act IV was {days} days of the thing improving itself, and of {founder} finding out which decisions were still theirs to make.' },
    { text: 'The recursive years. {company} spent {days} days becoming a fact about the world rather than a company in it.' },
    { text: 'Act IV: {days} days in which the machine was better than {founder} at most things, and the remaining things were the ones that mattered.' },
  ],
  5: [
    { text: 'After the company. {days} days in which the question changed from what happens next to what it was all for.' },
    { text: 'The last act was {days} days long. Everyone came back, one at a time, and asked the same question in a different voice.' },
    { text: 'Act V was not about the company. It was {days} days of {founder} deciding what {company} had been for, with the cast returning to hear the answer.' },
  ],
};

export const CLOSERS = {
  good: [
    { text: 'You took the careful option more often than not, and it compounded, and almost nobody noticed it happening.' },
    { text: 'In that act you kept choosing the thing that cost now and paid later. The paying-later part arrived on schedule, which is rarer than it sounds.' },
    { text: 'Careful, that act. Not timid — careful. The difference is that careful people still ship, and you did.' },
  ],
  risky: [
    { text: 'You reached for the high-variance option, and when it landed you looked like a genius, and when it did not you were still here.' },
    { text: 'That act was played on the high-variance settings. Two of the bets came in. The ones that did not are why the next act started where it did.' },
    { text: 'Bold, then. You bet on the long tail more than once, and the tail was there more often than the arithmetic said.' },
  ],
  costly: [
    { text: 'You solved problems with money for as long as the money lasted, which was longer than it should have been.' },
    { text: 'Most of that act\'s problems were made to go away with cash. It worked. It is a real strategy, and it teaches you nothing.' },
    { text: 'You paid. Fines, settlements, the expensive option on the card. The company stayed clean and the balance did not.' },
  ],
  cruel: [
    { text: 'You chose the effective thing over the kind thing, and it worked, and it kept working, and something accumulated.' },
    { text: 'That act was decided ruthlessly. The people it cost were mostly not you, and the ones who noticed wrote it down.' },
    { text: 'Effective, that act. Several people would use a different word, and two of them stopped taking your calls.' },
  ],
  neutral: [
    { text: 'You took the middle path more often than not. It was rarely wrong and rarely decisive.' },
    { text: 'Measured. You kept the company out of the ditch on either side, and out of the headlines too.' },
    { text: 'That act was played down the middle. Nothing broke, and nothing broke open either.' },
  ],
};

// How a journal entry becomes a sentence. {day} {title} {choice} {outcome} {who}
export const ENTRY = {
  milestone: [
    { text: 'Day {day}: {title}. {outcome}' },
    { text: 'On day {day} the company stopped for a moment: {title}. {outcome}' },
    { text: '{title}, on day {day}. {outcome}' },
  ],
  character: [
    { text: 'On day {day} {who} was in front of you — {title}. You chose to {choice}. {outcome}' },
    { text: '{who}, day {day}. {title}. You decided to {choice}, and {outcome}' },
    { text: 'Day {day}. {title}, with {who} on the other side of it. You chose to {choice}. {outcome}' },
  ],
  characterSelf: [
    { text: 'On day {day} {who} had something to say. You chose to {choice}. {outcome}' },
    { text: '{who} came to you on day {day}. You chose to {choice}. {outcome}' },
    { text: 'Day {day} was {who}\'s. You decided to {choice}. {outcome}' },
  ],
  call: [
    { text: 'Day {day}, a call with {who}. {outcome}' },
    { text: 'You rang {who} on day {day}. {outcome}' },
    { text: 'The phone, day {day}: {who}. {outcome}' },
  ],
  crisis: [
    { text: 'Day {day} brought {title}. You chose to {choice}. {outcome}' },
    { text: 'Then, on day {day}, {title}. You chose to {choice}, and {outcome}' },
    { text: 'A bad day, day {day}: {title}. You decided to {choice}. {outcome}' },
  ],
  opportunity: [
    { text: 'Day {day}: {title}. You chose to {choice}. {outcome}' },
    { text: 'A door opened on day {day} — {title}. You chose to {choice}. {outcome}' },
    { text: 'On day {day} somebody offered {title}, more or less. You decided to {choice}. {outcome}' },
  ],
  story: [
    { text: 'Day {day}: {title}. You chose to {choice}. {outcome}' },
    { text: 'On day {day}, {title}. You chose to {choice}, and {outcome}' },
    { text: '{title} — day {day}. You decided to {choice}. {outcome}' },
  ],
  world: [
    { text: 'Day {day}, and the world wrote {title}. You chose to {choice}. {outcome}' },
    { text: 'On day {day} the world itself dealt {title}. You chose to {choice}. {outcome}' },
    { text: '{title}, written by the world on day {day}. You decided to {choice}. {outcome}' },
  ],
};

export const CONNECT = {
  round: [
    { text: 'The {name} closed on day {day}: {amount}, at a valuation of {valuation}.' },
    { text: 'On day {day} the money arrived — the {name}, {amount}, which put the company at {valuation} on paper.' },
    { text: 'Day {day}: {amount} in, the {name}, and a valuation of {valuation} that everybody in the room pretended not to be thinking about.' },
  ],
  doctrine: [
    { text: 'By day {day} you had earned {name}, which is not something you buy.' },
    { text: 'Somewhere around day {day} the company became the kind that has {name}. Nobody decided it; it was earned by holding a line.' },
    { text: '{name}, from day {day}. A doctrine, not a purchase: the reward for behaving one way long enough that it stopped being a choice.' },
  ],
  note: [
    { text: 'In your own words, on day {day}:' },
    { text: 'From the journal, day {day}:' },
  ],
  kept: [
    { text: 'You kept the card called {title}. It is in the deck now, for whoever comes next.' },
    { text: '{title} was worth keeping, and you kept it. The next founder will be dealt it without knowing why.' },
  ],
  quiet: [
    { text: 'Not much else happened that anybody wrote down. That is how most of it is done.' },
    { text: 'The rest of that act was work. Nobody writes work down, which is why it looks like nothing happened.' },
    { text: 'What else there was of that act was ordinary. Ordinary is the part that compounds.' },
  ],
};

export const PEOPLE = {
  warm: [{ text: '{name} stayed. {arc}' }, { text: '{name} kept picking up. {arc}' }],
  cold: [{ text: '{name} did not. {arc}' }, { text: '{name} stopped calling, and then stopped answering. {arc}' }],
  even: [{ text: '{name}: {arc}' }, { text: '{name} was there, on and off. {arc}' }],
};

export const RACE = {
  won: [{ text: 'You crossed the line first, by {margin} points, on day {day}. For a while you were the only entity on Earth that could do what you did.' }],
  lost: [{ text: '{name} crossed first, on day {day}. You were second by a margin that is now a footnote and was not one at the time.' }],
  none: [{ text: 'Nobody crossed the line. The frontier turned out to be an asymptote, and the world got very good at a great many things without the moment everybody had written about.' }],
};

export const HEADS = {
  book: 'The chronicle of {company}',
  people: 'The people',
  numbers: 'In numbers',
  race: 'The race',
  coda: 'Afterwards',
  end: 'How it ended',
};

export const LOSS = [
  { text: 'It ended on day {day}. This is the book anyway. A company that did not survive is still a company that happened, and the parts worth keeping are the same parts.' },
  { text: 'Day {day} was the last one. What follows is the whole of it, written the same way it would have been written if it had gone the other way, because the decisions were the same size.' },
];

// ─────────────────────────────────────────────────────────────────────────────
// PRIYA'S REGISTER — the draft she hands over before anybody else reads it.
//
// The chronicle above is the game's own voice: second person, past tense, and
// willing to say what an act felt like. This is not that. It is a reporter's
// unfinished copy, and the rule she works to is one fact and one question per
// thing that happened, with no adjective anywhere in either. `priyaDraft(S)` in
// `src/systems/chronicle.js` builds three paragraphs out of it, and the Record
// files them at `press/draft`; the letter that hands it over, with "mark what
// is wrong" as the reply, belongs to the post.
//
// Tokens are the chronicle's own — {day} {title} {choice} {outcome} {who}
// {company} {founder} {product} {users} {mrr} — plus {n}, the count of things
// the Log holds for that act.
//
// If a line here needs an adjective to work, it is the wrong line.
// ─────────────────────────────────────────────────────────────────────────────
export const PRIYA = {
  head: 'Draft: {company}. Not for publication.',
  lead: [
    { text: '{company} has one employee. In {n} recorded decisions across {days} days, {founder} is the only name that appears on every one of them.' },
    { text: 'Between day 1 and day {days}, {company} shipped, hired, and answered {n} decisions of record. The staff list has not changed. It reads: {founder}.' },
    { text: 'The filings say {company} employs one person. The Log says {n} decisions were taken in {days} days. Both of those are true and only one of them is on the website.' },
  ],
  // One fact per entry, keyed by what kind of thing it was.
  fact: {
    milestone: [
      { text: 'On day {day}, {title}. {outcome}' },
      { text: 'Day {day}: {title}. The record notes the date and not the hour.' },
      { text: '{title} is dated day {day} in the company\'s own record.' },
    ],
    crisis: [
      { text: 'On day {day} the company recorded {title}. {founder} chose to {choice}.' },
      { text: 'Day {day}, {title}. The option taken was to {choice}.' },
      { text: 'The record for day {day} reads {title}, and the decision taken was to {choice}.' },
    ],
    character: [
      { text: 'On day {day}, {who} put {title} in front of {founder}. The answer was to {choice}.' },
      { text: '{who} is named in the day {day} entry. {founder} chose to {choice}.' },
      { text: 'Day {day}: {who}, and {title}. The decision was to {choice}.' },
    ],
    story: [
      { text: 'On day {day} the company recorded {title}. The decision was to {choice}.' },
      { text: 'Day {day}, {title}. {outcome}' },
      { text: 'The entry for day {day} is {title}, decided as {choice}.' },
    ],
  },
  // And one question. She does not answer them in a draft.
  question: {
    milestone: [
      { text: 'Who signed it off, and who else read it first?' },
      { text: 'What did it cost, and which line does that sit on?' },
      { text: 'Who was told, and in what order?' },
    ],
    crisis: [
      { text: 'Who was on the other end of that, and were they told?' },
      { text: 'What was the second option, and who wrote it?' },
      { text: 'How long was it known before it was recorded?' },
    ],
    character: [
      { text: 'What did {who} ask for, and what did {who} get?' },
      { text: 'Was {who} told what the alternative had been?' },
      { text: 'Who else was in the room, and is there a record that they were?' },
    ],
    story: [
      { text: 'Who reviewed it, and where is that written down?' },
      { text: 'What did the other option cost, and who priced it?' },
      { text: 'Who does that decision bind, and did they agree to be bound?' },
    ],
  },
  close: [
    { text: 'Company approached for comment. [HOLD — check the day 1 date against Companies House before this runs.]' },
    { text: '[TO CHECK: every figure above is from the company\'s own record. Nobody outside the company keeps a second one.]' },
    { text: 'The company was asked these questions in writing. [Note for the desk: mark what is wrong here rather than what is unflattering. They are not the same list.]' },
  ],
};
