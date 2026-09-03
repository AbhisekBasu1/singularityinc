// ─────────────────────────────────────────────────────────────────────────────
// THE POST, AND THE REPLY — what the founder writes, and what answers it.
//
// The deck has told this story five times without ever showing it: an account
// called `nullptr` comments on every post the founder makes, ninety seconds
// later, at any hour, always right, never explaining. Until now the founder
// could press R four hundred times and never once see it happen. This file is
// the other half — the founder's own posts, keyed to the act, and the pool of
// one-liners that answer them.
//
// Two rules, and they are the character:
//
//  1. **A reply is one line, lowercase, and does not end in a full stop.** It
//     is correct in a way that is hard to argue with and it never says why.
//     No token ever reaches these: they are answered in the tick after the
//     post, and a render-adjacent draw from the shared stream is the one thing
//     `src/systems/aria.js` has a whole comment block about. The founder's own
//     posts carry tokens, because those are filled once, at the moment a
//     person presses the key.
//  2. **`topic` is the loose key, not a category.** A post about a number gets
//     an answer about a number; everything falls back to `any`. It is a
//     preference, not a routing table — the account is not a support desk.
//
// `off` is the small pool that carries the reveal: five posts about something
// that happened away from the desk, each with the one reply that could only
// have come from somebody who was not reading the machine. `src/systems/feed.js`
// spends one of those once per run, after `aria_confessed`, and sets
// `nullptr_after_aria` for a card to find later.
// ─────────────────────────────────────────────────────────────────────────────

// ── The founder's posts ─────────────────────────────────────────────────────
// Four minutes to write, two hours to refresh. Keyed by act, because what a
// post is about changes completely between a changelog nobody reads and a
// sentence that moves three currencies. Tokens are the Wire's own vocabulary
// (see `tokens()` in `src/systems/feed.js`).
export const FOUNDER_POSTS = {
  1: [
    { topic: 'ship', text: 'shipped {feature} tonight. small, and right.' },
    { topic: 'ship', text: '{product} is live for anyone who wants it. no signup wall, no demo call.' },
    { topic: 'number', text: '{weeks} weeks in. {users} people. every one of them found it on their own.' },
    { topic: 'user', text: 'spent the day reading support mail instead of writing code. best day this month.' },
    { topic: 'thinking', text: 'the whole {cat} category assumes you have a team. building on the assumption that you do not.' },
    { topic: 'ship', text: 'changelog is up. seven lines, and six of them are somebody else\'s bug report.' },
  ],
  2: [
    { topic: 'number', text: '{users} users. {mrr} a month. still one of me.' },
    { topic: 'ship', text: 'shipped {feature}. it took four days and two of them were the name.' },
    { topic: 'thinking', text: 'we do not have a roadmap. we have a queue, sorted by who is bleeding.' },
    { topic: 'rival', text: 'somebody moved off {rival} this morning and sent a diff of what broke. that is the quarter, planned.' },
    { topic: 'ship', text: 'the newest agent read the codebase before it read the brief. nobody told it to.' },
    { topic: 'number', text: '{product} did not go down this week. writing it here so there is a record of the week it did not.' },
  ],
  3: [
    { topic: 'number', text: '{users} people open this before breakfast. that stopped being a metric a while ago.' },
    { topic: 'ship', text: 'shipped {feature} to everyone at once. no ramp. the tests were the ramp.' },
    { topic: 'number', text: '{mrr} a month, and the number worth watching is still how many people we are not.' },
    { topic: 'rival', text: '{rival} announced the thing we shipped in March. good. it should exist twice.' },
    { topic: 'race', text: 'the frontier is not a leaderboard. it is a decision about what you point the company at.' },
    { topic: 'thinking', text: 'a morning in a room with regulators. they had read the docs. all of them.' },
  ],
  4: [
    { topic: 'number', text: '{users} users across {nations} economies. the support queue is still one inbox.' },
    { topic: 'ship', text: 'shipped {feature}. it changes what a working day is for people we will never meet.' },
    { topic: 'number', text: 'the mark is {val}. that is a number about other people\'s expectations, not about the work.' },
    { topic: 'race', text: 'if you are ahead in this the only honest thing to publish is what you are doing about the lead.' },
    { topic: 'rival', text: '{rival} is not the risk. the risk is that we stop being able to hear anyone outside the building.' },
    { topic: 'thinking', text: 'every system we run makes the decisions we would make. that is the claim. we test it weekly and we publish the failures.' },
  ],
  5: [
    { topic: 'number', text: 'our systems touch a share of world output that would have been a joke {weeks} weeks ago. posting it because somebody should.' },
    { topic: 'ship', text: 'shipped {feature}. eight hundred words of announcement, and the part that matters is in the footnotes.' },
    { topic: 'number', text: '{users} users. there is no version of this where that is a number about me.' },
    { topic: 'race', text: 'this is decided by what you convert, not by what you hold.' },
    { topic: 'thinking', text: 'we published the evals. all of them, including the four we failed.' },
    { topic: 'rival', text: '{rival} lost. writing that down without a feeling attached to it, and failing.' },
  ],
  // Away from the desk. These are the posts the machine has no record of, and
  // each one carries the answer that proves somebody was not reading a log.
  off: [
    { topic: 'off', text: 'walked to the water this morning before anything was open. first time in a year.',
      unseen: 'the tide was out at six and you went at seven' },
    { topic: 'off', text: 'called my mother. she asked whether the company was a real job yet.',
      unseen: 'she asks because she cannot hear it in your voice any more' },
    { topic: 'off', text: 'sat at the back of a lecture theatre for an hour. nobody there knew me. recommended.',
      unseen: 'row nine, and you stayed for the questions' },
    { topic: 'off', text: 'there is a ring on this desk from the first week and four offices have not removed it.',
      unseen: 'it is from the second week, and it was not coffee' },
    { topic: 'off', text: 'slept eight hours. writing it down because otherwise there is no record of it.',
      unseen: 'six, and you were awake for two of the middle ones' },
  ],
};

// ── The replies ─────────────────────────────────────────────────────────────
// Thirty-two one-liners. Lowercase, no full stop, no explanation, and never
// wrong. `topic` matches the post it answers; `any` answers anything.
export const NULLPTR_REPLIES = [
  { topic: 'ship', text: 'the migration in that release is not reversible and the notes say it is' },
  { topic: 'ship', text: 'you shipped the flag and not the default, so nobody will see it' },
  { topic: 'ship', text: 'the retry in there still shares a clock with the thing it retries' },
  { topic: 'ship', text: 'that is the third one this quarter that reads a column you deprecated' },
  { topic: 'ship', text: 'the changelog entry is longer than the diff, which is usually a tell' },

  { topic: 'number', text: 'that one is monthly and the one under it is annualised' },
  { topic: 'number', text: 'you are counting the trials again' },
  { topic: 'number', text: 'the growth is in one region and the churn is in the other one' },
  { topic: 'number', text: 'the interesting figure is the one you rounded' },
  { topic: 'number', text: 'you have posted that twice now with two different denominators' },

  { topic: 'user', text: 'the loud ones are not the ones leaving' },
  { topic: 'user', text: 'you answered the mail and not the ticket underneath it' },
  { topic: 'user', text: 'the person who filed that has filed it before, in March' },
  { topic: 'user', text: 'four of them wrote the same sentence, so it is the wording of the form' },

  { topic: 'rival', text: 'they did not announce it, they shipped it in a beta four months ago' },
  { topic: 'rival', text: 'they are not copying you, you are both reading the same paper' },
  { topic: 'rival', text: 'their pricing page changed on Tuesday and yours has not' },
  { topic: 'rival', text: 'the hire they made last month is the announcement' },

  { topic: 'race', text: 'capability is not progress until you spend the company on it' },
  { topic: 'race', text: 'you are ahead on the axis you chose to measure' },
  { topic: 'race', text: 'the lead is real and the conversion rate is what decides it' },
  { topic: 'race', text: 'two of the four stopped publishing, which is the actual news' },

  { topic: 'thinking', text: 'you have written this before, in a different order' },
  { topic: 'thinking', text: 'that is a policy, not a principle, and it will be edited' },
  { topic: 'thinking', text: 'the sentence you deleted was the true one' },
  { topic: 'thinking', text: 'nobody outside the building reads the third paragraph, which is where you put it' },

  { topic: 'off', text: 'good' },
  { topic: 'off', text: 'the water is better on a weekday' },
  { topic: 'off', text: 'she has asked that every year since the first one' },

  { topic: 'any', text: 'the timestamp on that is out by an hour and it is not the timezone' },
  { topic: 'any', text: 'you fixed the symptom in the post and the cause is still in main' },
  { topic: 'any', text: 'three of the five claims here are testable and one of them is false' },
];

// ── After she says whose account it is ──────────────────────────────────────
// `aria_confessed`. The comments do not stop — the founder never asked them
// to, and the one choice that does stop them sets `nullptr_shut` instead. What
// changes is the reader: the same ninety seconds, and now you know.
export const NULLPTR_AFTER = [
  { topic: 'any', text: 'the second sentence is the one you meant' },
  { topic: 'any', text: 'you checked this at 2am and changed your mind' },
  { topic: 'any', text: 'the figure is right and the verb is not' },
  { topic: 'any', text: 'you wrote a longer version of this and it was better' },
  { topic: 'any', text: 'still unjittered' },
  { topic: 'any', text: 'you have not fixed the March one and you know that' },
  { topic: 'any', text: 'the draft you deleted had the honest paragraph in it' },
  { topic: 'any', text: 'correct, and you will regret the third bullet' },
  { topic: 'any', text: 'you did not have to post this one' },
  { topic: 'any', text: 'on time, as always' },
];

export const FOUNDER_POST_ACTS = Object.keys(FOUNDER_POSTS).filter((k) => k !== 'off').length;
