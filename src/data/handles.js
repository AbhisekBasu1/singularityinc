// ─────────────────────────────────────────────────────────────────────────────
// THE WIRE'S RECURRING PEOPLE — six handles with a stance, the posts that
// answer a card, and the three members of the cast who speak in the feed when
// nobody is playing the world for them.
//
// `feedlines.js` is a crowd: a pool of lines and a pool of handles, drawn
// apart, so nobody in it is anybody twice. These are the opposite — a handle
// and its lines are one object, the author is chosen by the pool rather than
// from `RANDOM_HANDLES`, and each of the six appears at most twice a
// fortnight. A run should end with a founder having an opinion about
// @grumpysre.
//
// Tokens are the feed's own (`tokens()` in `src/systems/feed.js`), plus four
// this file is the reason for:
//   {uptime}   the product's real reliability
//   {churn}    the real monthly churn
//   {guess}    a churn figure inside a point of it, stable for the act
//   {wrongval} a valuation that is wrong, and wrong in a direction
//
// House rules: lowercase where the handle is lowercase, no exclamation marks,
// and nobody explains the joke. A stance is a thing a person is wrong about
// consistently, not a catchphrase.
// ─────────────────────────────────────────────────────────────────────────────

export const VOICES = [
  // ── The SRE who only posts about uptime ───────────────────────────────────
  // Grudging when it is good, which is the whole character. Gated on the
  // product being live, because there is nothing to be grudging about before.
  {
    handle: '@grumpysre', stance: 'uptime, and nothing else, ever',
    when: (S) => S.products.some((p) => p.launched),
    lines: [
      '{product} at {uptime} this month. that is not four nines. it is not two either.',
      'the {product} status page updated before my monitoring did. once. I am noting it.',
      'thirty days, no incident on {product}. I have checked twice. I will check again on friday.',
      '{uptime}. I have seen worse from teams of two hundred, which is not a compliment, it is a fact about teams of two hundred.',
      'the {product} post-mortem named the change. named it. I did not think anyone still did that.',
      'I want it on record that I expected {product} to fall over this quarter and it did not.',
      'p99 on {product} is down again. nobody will notice, which is what good looks like.',
      'every vendor says they are reliable. {product} is at {uptime} and publishes it, which is the difference.',
      'woke up to a page. not {product}. I checked {product} first out of habit and I resent that.',
      'grudgingly: {uptime} for a company with one person in it is not the number I would have bet on.',
    ],
  },

  // ── The one who is not a VC and prices you anyway ──────────────────────────
  // Wrong in both directions. `{wrongval}` swings a multiple either side of the
  // real number and the act decides which way, so a run gets both halves.
  {
    handle: '@notaVC', stance: 'prices your company, incorrectly, in public',
    when: (S) => S.company.valuation > 0 && S.products.some((p) => p.launched),
    lines: [
      'not a vc but {company} is a {wrongval} company and everybody pricing it otherwise is anchoring on the headcount.',
      '{company} at {wrongval}. I will take the other side of that at any size.',
      'the {cat} comps say {wrongval} for {company}. the comps have been wrong about this category twice.',
      'I said {wrongval} on {company} last year and I am revising it, in the direction that makes me look worse.',
      'people keep telling me {company} is expensive. expensive relative to what, a company that has to pay salaries.',
      'my number on {company} is {wrongval} and I am aware nobody asked.',
      'I do not invest. I model. the model says {wrongval} for {company} and the model has a name.',
      'the thing about {company} at {wrongval} is that one of us is going to look extremely silly and it is usually me.',
      'revising {company} to {wrongval}. I would like the timeline to remember I was early and not that I was wrong.',
      'somebody asked what {company} is worth. {wrongval}. ask me again in a quarter and I will say something else with the same confidence.',
    ],
  },

  // ── The churn whisperer ───────────────────────────────────────────────────
  // Right within a point, every time, from the outside, which is unsettling
  // and is meant to be. Only speaks once there are users to churn.
  {
    handle: '@churnwhisperer', stance: 'guesses your churn from the outside, and is right',
    when: (S) => S.products.some((p) => p.launched && p.users > 400),
    lines: [
      'putting {product} monthly churn at about {guess}. no inside information, just the shape of the reviews.',
      '{guess} on {product}, give or take. the tell is how fast the support replies get shorter.',
      'churn call: {product}, {guess} a month. I will be within a point and nobody will check.',
      'I said {guess} for {product} last quarter. somebody who would know sent me a thumbs up and nothing else.',
      'the {cat} average is worse than {guess}. {product} is doing something on the retention side that nobody writes about.',
      '{product} churn is {guess}-ish and holding. holding is the interesting part, not the number.',
      'people ask how I do this. I read the changelog and the one-star reviews and I subtract. {product}: {guess}.',
      'raising my {product} estimate to {guess}. the last release moved something in the wrong direction.',
      'lowering my {product} estimate to {guess}. whatever they shipped in the spring worked.',
      'for the record my {product} number is {guess} and if it is wrong by more than a point I will say so here.',
    ],
  },

  // ── The one who left, and still logs in ───────────────────────────────────
  // Left the industry because of what {company} demonstrated, and uses the
  // product every day from a field. Never bitter; that is the point of them.
  {
    handle: '@ex_faang_now_farming', stance: 'left the industry because of you and still pays you',
    when: (S) => S.company.act >= 2 && S.products.some((p) => p.launched),
    lines: [
      'two years since I handed in the badge. I still pay {company} {k} dollars a month and it is the only software I miss nothing about.',
      'I left because I watched one person out-ship my org of forty. no hard feelings, {founder}. the goats are fine.',
      'ran the whole season on {product} from a shed with one bar of signal. it queued everything and caught up.',
      'people ask if I regret leaving. I run a farm on a laptop and a {cat} tool built by one person. no.',
      'my old team is still in the migration they started before I left. I moved a whole business onto {product} in an afternoon.',
      'the reason I quit is on my invoice every month and I find that funnier than I should.',
      'somebody from the old place emailed to ask how I use {product}. they have a hundred engineers. I sent them a screenshot.',
      'nine hours outside today and the accounts still balanced. that is not a farming post, it is a {product} post.',
      'I do not miss the standups. I do miss having somebody to tell when {product} ships something good.',
      '{founder} does not know who I am and changed what I do for a living. that is a strange sentence and it is true.',
    ],
  },

  // ── Page four of the forum ────────────────────────────────────────────────
  // The power user Sam would recognise: deep in the product, never on the
  // front page, writing the workaround everybody eventually finds.
  {
    handle: '@fourthpage', stance: 'knows the product better than the changelog does',
    when: (S) => S.products.some((p) => p.launched && p.users > 1200),
    lines: [
      'wrote up the {feature} workaround on the forum. page four, as usual. it will be in the docs in a year.',
      'there are {k} people using {product} the way I use it and none of us have ever met.',
      'the undocumented flag still works. I am saying this quietly and in the wrong thread.',
      '{product} changed a default and broke my setup and the fix took four minutes. that ratio is why I stay.',
      'somebody in the forum found the same trick I posted in the spring. no credit, no problem, that is how it should work.',
      'I have read every {product} changelog since launch. the interesting entries are the ones with no adjectives.',
      'the {product} docs are good. the forum is better. the forum is fourteen of us and a search box.',
      'people arrive asking how to do the thing, and page four has been sitting here the whole time.',
      'reported a bug with a repro, a diff and a suggested fix. shipped in six days. I have worked places that take six months to read it.',
      'I am not a customer, I am a resident. there is a difference and {company} seems to know it.',
    ],
  },

  // ── The other ledger ──────────────────────────────────────────────────────
  // A journalist at a competing outlet who is losing the story to Priya, and
  // is a better reporter when annoyed. Never names her; everybody knows.
  {
    handle: '@theotherledger', stance: 'covering the same story a beat behind Priya',
    when: (S) => S.company.act >= 2 && S.resources.reputation > 40,
    lines: [
      'we have been working the {company} story for a month. somebody else has the founder on the phone. that is the whole of it.',
      'access journalism gets you the quote. the filings get you the number. I have the filings.',
      'the {company} piece everyone is sharing is very good and does not once say how the money works.',
      'my editor asked why we did not have the {company} story. because we asked a question they did not want to answer.',
      'a profile is not an investigation. I can say that about a piece I wish I had written.',
      'filed {k} records requests about {company} this quarter. two came back. one of them was interesting.',
      'the difference between a source and a subject is who gets to read it first, and we are not reading it first.',
      'I will say this for the coverage: it is accurate. I would like it to be more curious.',
      'still the only outlet asking who audits {company}. still no answer, and still the only outlet asking.',
      'the {company} story is not the founder. everybody keeps writing the founder.',
    ],
  },
];

export const VOICE_MAP = Object.fromEntries(VOICES.map((v) => [v.handle, v]));

// ── Posts that answer a card ────────────────────────────────────────────────
// G32: the world outside notices what was decided inside. Keyed by the card's
// kind and its tone, because a crisis answered cruelly and a crisis answered
// carefully are two different weeks in public. Nothing here names the card:
// nobody outside the room knows what it was called.
export const CARD_POSTS = {
  milestone: {
    good: [
      'something changed at {company} this week and you can see it in the release notes before you see it anywhere else',
      'whatever {company} just did, the {cat} people I follow all went quiet for a day and then all posted about it',
      '{company} hit a number this week that nobody outside a handful of firms has hit. one person.',
    ],
    neutral: [
      '{company} passed a milestone and did not post about it. found out from the changelog.',
      'nothing from {company} this week except the thing itself, shipped, on a wednesday',
    ],
    risky: [
      '{company} made a call this week that is either the best decision of the year or the reason we are all talking about them next year',
      'watching {company} take a swing that a public company legally could not. that is the advantage and the whole risk.',
    ],
  },
  crisis: {
    good: [
      '{company} handled that badly for a day and then handled it better than anybody expected. I am revising upward.',
      'the {company} response was six sentences and no adjectives. I wish more companies were this boring in a crisis.',
      'they fixed it, said what happened, and did not ask anybody to be excited about it. rare.',
    ],
    cruel: [
      '{company} solved that problem. I would like somebody to write down who paid for the solution.',
      'the {company} answer this week was efficient and I do not feel great about it and I am still a customer',
      'there is a version of that decision that costs {company} money and does not cost a person anything. they did not pick it.',
    ],
    costly: [
      '{company} spent their way out of that one. it worked. it is not a strategy you can run twice.',
      'whatever that cost {company}, it cost less than the alternative, which is the least inspiring true sentence in business',
    ],
    risky: [
      '{company} took the risky exit from that and it is too early to say. everybody saying otherwise is guessing.',
      'the {company} call this week was a coin flip made confidently. I have started watching for the second one.',
    ],
    neutral: [
      '{company} had a bad week and dealt with it. no thread, no apology tour, no post. just the fix.',
      'the {product} thing is resolved. I only know because it stopped happening.',
    ],
  },
  character: {
    good: [
      'somebody who knows {founder} says the thing you cannot tell from the outside is how long they take over the small ones',
      'heard secondhand that {founder} made a decision this week that cost them and helped somebody who will never know',
    ],
    cruel: [
      'a person I know who worked near {company} stopped replying to me this week. read into that whatever you like.',
      'the {company} story nobody writes is the people who used to be in the story',
    ],
    neutral: [
      'the interesting thing about {company} is how few people there are to disagree with {founder}',
      'somebody asked {founder} a hard question this week and got an answer. I have that on one source and I believe it.',
    ],
    risky: [
      'whatever {founder} agreed to this week, somebody is going to write about it in three years',
      'there is a decision inside {company} this week that half the industry would have taken differently and none of us will hear about it',
    ],
  },
};

// ── The cast, in the Wire ───────────────────────────────────────────────────
// Without an assistant these three are only ever faces on cards. Here they are
// people with accounts: Priya's outlet runs a headline the day her card lands,
// Vance posts after a move, and Sam answers an outage the way a first user
// does. When the world holds a voice, none of this fires — two authors, one
// cast.

// Priya's outlet, keyed by how her card went. `{outlet}` is her masthead.
export const PRIYA_HEADLINES = {
  good: [
    '{outlet}: Inside {company}: the first long interview with {founder}',
    '{outlet}: What one person and a room full of machines actually looks like',
    '{outlet}: {company}, on the record, at last',
    '{outlet}: The {cat} company that answered the questions',
  ],
  bad: [
    '{outlet}: {company} declined to comment. Here is what we found anyway.',
    '{outlet}: Questions {company} would not answer this week',
    '{outlet}: The company with one employee and {n} unanswered emails',
    '{outlet}: What {founder} did not say',
  ],
  neutral: [
    '{outlet}: {company}, {weeks} weeks in: what the filings show',
    '{outlet}: The {cat} market, and the one company nobody can price',
    '{outlet}: A profile of a company with nobody in the corridor',
    '{outlet}: {founder} answers eleven questions and dodges the twelfth',
  ],
};

// Vance, after a move. Lowercase, and he never names your product — that is
// the whole tell, and it is deliberate on his part.
export const VANCE_MOVES = {
  mirror: [
    'we shipped it. it was obvious. the only interesting question is why it took anybody two years to find obvious.',
    'built in nine days what somebody else took a quarter over. I am not going to pretend that is not the job.',
    'yes, it looks familiar. good ideas look familiar. that is how you know.',
  ],
  undercut: [
    'price is a product decision. we made ours. the market will tell us in a fortnight.',
    'we cut it. somebody will say that is not sustainable. it is not meant to be sustainable, it is meant to be decisive.',
    'cheaper as of this morning. if that is a problem for anybody, that was the point.',
  ],
  benchmark: [
    'published the numbers. all of them, including the two that make us look slow.',
    'benchmarks are marketing until somebody publishes the harness. ours is up. use it against us.',
    'we ran the comparison ourselves and lost one of the six. that one is in the post as well.',
  ],
  poach: [
    'hired four this month. two of them had somewhere else in mind and changed their minds in the room.',
    'we made an offer somebody could not say no to. that is not aggression, that is arithmetic somebody else got wrong.',
    'good people move toward the thing that is moving. we are moving.',
  ],
  fud: [
    'said something on the record this week that some people would rather I had not. I stand by the sentence.',
    'a reporter asked me a question about a competitor. I answered it honestly, which everyone has decided is a tactic.',
    'I am not going to pretend to be neutral about a company I am trying to beat.',
  ],
  channel: [
    'signed the distribution deal. exclusive. I would apologise but I do not think anybody would believe it.',
    'we own that channel for a year now. the year starts today.',
    'somebody was slow to sign and we were not.',
  ],
  open_source: [
    'gave it away this morning. weights, harness, the lot. do what you like with it.',
    'we open sourced the thing everybody thought was the moat. it was never the moat.',
    'free, from today. I would like a lot of people to build on this and I would like some of them to be nobody I have heard of.',
  ],
  raise: [
    'closed the round. the number is in the filing and I am not going to perform modesty about it.',
    'raised. we did not need it. that is exactly when you raise.',
    'money in. it buys three years of not caring what any of this quarter looks like.',
  ],
  respect: [
    'somebody built something good this week and it was not us. saying so costs me nothing and I would like it noted anyway.',
    'I have been wrong about a competitor for about a year. correcting that publicly, once.',
    'credit where it is due, quietly, and then back to work.',
  ],
};

// Sam, under an outage. First user, still answering support questions he was
// never asked to answer.
export const SAM_OUTAGE = [
  'it is down for me too. it is down for everyone. give them an hour, they always post what happened.',
  'this is the fourth one I have sat through and the third one they explained properly. that ratio is better than my bank.',
  'for anyone new: the status page lags the actual fix by about twenty minutes. the changelog is the honest one.',
  'I have been using this since there were forty of us. it goes down. it comes back with a post that says why.',
  'not defending it. just saying I have watched the fix go in from the commit log while the ticket was still open.',
  'if you are stuck, the workaround is on page four of the forum. it always is.',
];
