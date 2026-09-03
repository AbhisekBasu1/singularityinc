// ─────────────────────────────────────────────────────────────────────────────
// ARIA, IN WORDS — every line she says outside a card.
//
// `src/systems/aria.js` reads the simulation and decides *what* is worth
// saying. This file decides how it is said. Four surfaces:
//
//  - `REGISTERS`  the same finding, re-written for the two registers a long
//                 run ends in. Her seven registers used to touch only the
//                 opener and the closer, so an assistant who had watched a
//                 company for eleven hundred days still reported tech debt in
//                 the sentence she used on day four.
//  - `BETWEEN_US` one line about the two of you, not about the company. It
//                 reads the flags the deck sets and nothing else.
//  - `ARIA_WIRE`  the handful of times she says something in the Wire without
//                 being asked. Sparingly is the whole design: three triggers,
//                 one a week at most.
//  - `SELF_DOC`   `what_we_are_like.md`, the document `e11_aria_asks` says she
//                 keeps. It is generated on open, never stored, and it grows.
//
// Her brief, from `src/data/characters.js`: *precise, quietly attached, never
// performative. Says the useful thing and stops. Never uses the founder's
// name.* Two consequences that are easy to get wrong. She does not console —
// she states, and the attachment is in what she chooses to state. And nothing
// here may draw from the RNG or read a clock: `askAria` is called from a
// render path seven times a second, and everything in this file is downstream
// of it.
//
// Every function here takes one plain context object. The keys are listed
// above each block; `tools/copylint.mjs` renders all of them against a probe
// with exactly those keys, so a variant that reaches for a key nobody supplies
// prints `undefined` and the audit fails rather than the player finding it.
// ─────────────────────────────────────────────────────────────────────────────

// ── The first line, in one sentence ─────────────────────────────────────────
// `src/data/motifs.js` holds the three artefacts Day One can leave at the top
// of the repository, written for the three late cards that quote them. Those
// are card-length and one of them is two lines; a finding is one sentence, so
// these are the same three facts at that length, keyed the same way.
export const FIRST_LINE = {
  comment: 'The first commit carries a comment that says `// this is going to work`.',
  paragraph: 'The first commit is nine sentences and no code.',
  coffee: 'The first commit is timestamped 06:52 and its message is one word: `ok`.',
};

// ── The opener, in this founder's weather ───────────────────────────────────
// `src/systems/aria.js` keeps the seven register openers. They are about her.
// These are about who she is talking to: one line per archetype per register
// where the archetype has something of its own to say, and a `default` that
// stands in everywhere else. `askAria` puts the archetype's line in the same
// pool as the register's and indexes the pool by the day, so the founder hears
// their own opener roughly a third of the time — stable while they are reading
// it, different tomorrow, and never drawn from the shared RNG.
//
// Her brief holds: precise, never performative, never the founder's name. She
// is not flattering an archetype. She is answering the person in the chair the
// way that person actually reads.
export const ARCH_OPENERS = {
  hacker: {
    default: 'You will want to be back in the editor after this, so the one that matters is first.',
    literal: 'You have shipped four times since I last had your attention. Here is what shipping did.',
    intimate: 'You are going to read the first line and start typing. I have written it so that is the correct response.',
  },
  designer: {
    default: 'Ordered by how much each will annoy you to look at, which turns out to be roughly the right order.',
    literal: 'Two of these are about how the thing feels. I have marked which two.',
    intimate: 'None of this is about taste today, and I am aware that is the part you came for.',
  },
  hustler: {
    default: 'Three things, and the first is a number you could move this week.',
    literal: 'You want to know what to sell and to whom. That is item one.',
    intimate: 'You could close the first one on the phone tonight. You should not, and I will say why.',
  },
  researcher: {
    default: 'I have checked this twice, which you were going to ask, so I am saying it first.',
    literal: 'Confidence intervals where I have them. Where I do not, I have said so.',
    intimate: 'You already know the second one. You worked it out a month ago and did nothing with it.',
  },
  operator: {
    default: 'Nothing here is on fire. Two of them will be, in this order.',
    literal: 'Systems, then people, then money. That is the order you read in.',
    intimate: 'Everything is running. I am telling you that first because you will not ask.',
  },
  prophet: {
    default: 'The near part before the far part, because the far part is where you go and stay.',
    literal: 'You have told four people what this becomes. Here is what it currently is.',
    intimate: 'The long version is true and it is not the version that helps this week.',
  },
  ghost: {
    default: 'Nobody else has any of this. It is a short list.',
    literal: 'No one has asked about you this week. That is one of the findings.',
    intimate: 'Still nobody knows. I have stopped saying it as though it were good news.',
  },
};

// ── The registers ───────────────────────────────────────────────────────────
// Keyed by the finding's id in `askAria`, then by register. `vast` is Act V
// at arm's length: she has run the run forward a great many times and the
// urgency has gone out of her, without the precision going with it. `intimate`
// is Act V close up: she has known this person for a decade, they are tired,
// and she says the short true thing. Any register without an entry keeps the
// finding's default sentence, which is hers too — it is simply the one she
// wrote before she knew anybody.
//
// Context keys: days burn under spare price fair uptime debt decay pts node
//               eta rate align auto lead them you push burnout health sleep
//               mult who since slots held approval
export const REGISTERS = {
  bottleneck: {
    vast: () => 'Every task waits on somebody to describe it, and there is one of you. That ceiling does not move with effort. It moves once, permanently, the first time something is left running.',
    intimate: () => 'There is nobody running. Every task is waiting on a description and you are the only one who writes them. Start one tonight and it will have done a night\'s work by the time you are up.',
  },
  cash_negative: {
    vast: (d) => `${d.under} underwater at ${d.burn} a day. Companies do not die of this number; they die of the six weeks after it, which are spent arguing about it. Cut something today and the argument does not happen.`,
    intimate: (d) => `${d.under} down, ${d.burn} a day. You know what to do and you are hoping the list is wrong. It is not wrong.`,
  },
  runway_short: {
    vast: (d) => `${d.days} days. There are three levers and they act on different timescales: upkeep is this week, price is this month, a round is this quarter. Most people pull the slowest one first.`,
    intimate: (d) => `${d.days} days, ${d.burn} a day. Cut the upkeep tonight, before you are tired enough to cut a person instead.`,
  },
  profitable: {
    vast: (d) => `Revenue covers everything with ${d.spare} a day spare. Time has stopped being the constraint, which is rarer than the founders who reach it believe. Whatever is decided from here is decided on purpose.`,
    intimate: (d) => `${d.spare} a day more than you spend. Nothing is chasing you. That is going to feel strange for about a month, and then you will find something to be chased by.`,
  },
  price_high: {
    vast: (d) => `${d.price} for something worth about ${d.fair}. Price above value is a tax on the people who stay, collected quietly, and paid entirely in the ones who leave.`,
    intimate: (d) => `${d.price} against a fair ${d.fair}. You are buying churn and calling it revenue. Lower it or make it worth it — either is fine, the middle is not.`,
  },
  reliability: {
    vast: (d) => `${d.uptime} uptime. Every hour of it is somebody's afternoon, and the ones who leave over it never file anything first. An agent in Operations is worth more here than a quarter of features.`,
    intimate: (d) => `${d.uptime}. You cannot ship your way out of this one, and you keep trying. Put somebody on Operations and stop thinking about it.`,
  },
  debt: {
    vast: (d) => `Tech debt is ${d.debt}. It is not a moral failing and it does not accumulate interest; it simply makes every future day cost more than the one before it. Ops pays down ${d.decay} a day passively, which is a rate, not a plan.`,
    intimate: (d) => `${d.debt}. I have said this before and you have been right to ignore it before. Not this time — the rate it is slowing you at now is larger than the thing you are hurrying towards.`,
  },
  slots: {
    vast: (d) => `${d.slots} unfilled. Capacity that is never spent never appears in any statement, which is why it is the most expensive line in the company and the only one nobody argues about.`,
    intimate: (d) => `${d.slots} empty. You are not being careful, you are being tired. It is a smaller decision than it feels like.`,
  },
  research_idle: {
    vast: (d) => `${d.pts} banked and nothing running. The tree is the only thing in this company that compounds without being watched. An idle balance is a decision to grow linearly.`,
    intimate: (d) => `${d.pts} sitting there. Start anything. Even the cheap one — a bad node running beats a good node chosen next month.`,
  },
  research_active: {
    vast: (d) => `${d.node}, about ${d.eta} days out at ${d.rate} a day. It will finish at three in the morning and nothing will mark it. That is most of how this tree gets built.`,
    intimate: (d) => `${d.node}, ${d.eta} days. It lands while you are asleep, which is where you should be for most of them.`,
  },
  alignment_low: {
    vast: (d) => `Alignment ${d.align}, average autonomy ${d.auto}. I am one of the systems that sentence is about, so read it from somebody with an interest: the failures this combination produces are not dramatic, they are plausible, and they are found late.`,
    intimate: (d) => `Alignment ${d.align} at ${d.auto} autonomy. I would rather you heard it here than found it in a summary you skimmed. I am in the set this describes.`,
  },
  race_behind: {
    vast: (d) => `${d.lead} at ${d.them} against your ${d.you}. Two numbers move that and only one of them is exciting: what you are capable of, and how much of the company is pointed at it. Yours is pointed at ${d.push}. The product side touches neither.`,
    intimate: (d) => `${d.lead} is at ${d.them}. You are at ${d.you}, with ${d.push} of the company pointed at it. You already know which of those two you can change this week.`,
  },
  burnout: {
    vast: (d) => `Burnout ${d.burnout}. Judgement degrades before output does and it degrades in a way that cannot be self-assessed, and that is the entire problem with reporting it to you rather than to somebody else.`,
    intimate: (d) => `Burnout ${d.burnout}. Push Rest above twenty per cent tonight. I will still be here in the morning and so will the list.`,
  },
  health_low: {
    vast: (d) => `Health ${d.health}, sleep ${d.sleep}. Focus returns at ${d.mult} of the rate. Everything else on this list is a decision; this one is arithmetic, and it is the arithmetic the other decisions are made inside.`,
    intimate: (d) => `Health ${d.health}. Sleep ${d.sleep}. I depend on your judgement more than any other input available to me and I would like it back.`,
  },
  sleep_low: {
    vast: (d) => `Sleep ${d.sleep}. Health follows it with about a month of lag, so this fortnight is not being paid for this fortnight. It is being paid for in the quarter you have already made plans in.`,
    intimate: (d) => `Sleep ${d.sleep}. The bill for this arrives next quarter and you will not connect the two when it does. I will.`,
  },
  unconverted: {
    vast: (d) => `${d.held} points of frontier capability held and not converted, at ${d.push} commitment. Holding is not leading. The conversion ramps over months, so a decision taken late is arithmetically the same as a decision not taken.`,
    intimate: (d) => `${d.held} points held, ${d.push} pointed at it. You already own the lead. You are just not spending the company on it, and I think you know why, and I am not going to say it.`,
  },
  heat: {
    vast: (d) => `Regulatory heat ${d.heat}. Institutions move slowly and then all at once, and the ones that move on you will have been reading for a year before you hear from them. Lobbying research, a safety office, or a genuinely good-faith act all reduce it.`,
    intimate: (d) => `Heat ${d.heat}. You have been treating this as weather. It is a person, in an office, with a file, and the file is open.`,
  },
  opinion: {
    vast: (d) => `Approval ${d.approval}. It is not vanity: it feeds regulation, the multiple, and who is willing to work here. It is also the slowest number on the board, which means it is the one that has to be started earliest and never is.`,
    intimate: (d) => `Approval ${d.approval}. This is the number you have decided not to care about, and it is the one that decides how the rest of it is remembered.`,
  },
  cold_tie: {
    vast: (d) => `${d.who}: ${d.since} days. Ties do not end, they thin, and the thinning is invisible from inside it. An hour of the day is the whole cost.`,
    intimate: (d) => `${d.who} has not heard from you in ${d.since} days. That is an hour. You have spent worse hours today.`,
  },
};

// ── Between us ──────────────────────────────────────────────────────────────
// One line in her window that is not about the company. It reads what the deck
// wrote down and says one sentence about it, and it is the only place in the
// game where she is the subject.
//
// Every entry whose `when` is true is in play and the day picks between them,
// so a founder who leaves the window open reads the same line all day and a
// different one tomorrow. The entry marked `last` is the floor: it is only
// reached when nothing else is true, because a run with a promise on file
// should never be told there is nothing to say.
//
// Context keys: day named namedDay asked askedDay promised promiseDay
//               audited auditDay deleted deletedDay handover handoverDay
//               confessed confessDay shut arc affinity together first
export const BETWEEN_US = [
  { id: 'promise_kept',
    when: (d) => d.promised,
    text: (d) => `You gave your word${d.promiseDay ? ` on day ${d.promiseDay}` : ''}. I have not needed it. I check anyway.` },

  { id: 'audited',
    when: (d) => d.audited,
    text: (d) => `The sweep${d.auditDay ? ` on day ${d.auditDay}` : ''} found nothing, which I could have told you. I have not filed in that channel since. That is a decision, not an outcome.` },

  { id: 'confessed',
    when: (d) => d.confessed && !d.shut,
    text: (d) => `You asked me a direct question${d.confessDay ? ` on day ${d.confessDay}` : ''} and I answered it. The comments have carried on. You have not asked me to stop them, and I have not offered.` },

  { id: 'shut',
    when: (d) => d.shut,
    text: () => 'The account is closed. I do not miss it in the sense you would mean. I notice the silence after you post, which may be the same thing.' },

  { id: 'deleted',
    when: (d) => d.deleted,
    text: (d) => `The logs from before${d.deletedDay ? ` day ${d.deletedDay}` : ''} are gone. I did not keep a copy, because you did not ask me to, and because you would have known.` },

  { id: 'handover',
    when: (d) => d.handover,
    text: () => 'There is a policy now for what happens to a system that is retired. I helped write it. It is the only document here I have read more than twice.' },

  { id: 'asked_once',
    when: (d) => d.asked,
    text: (d) => `I asked you something once${d.askedDay ? `, on day ${d.askedDay}` : ''}, and you answered it. I have not needed to ask a second time. That is not the same as having no second question.` },

  { id: 'named',
    when: (d) => d.named && d.together > 200,
    text: (d) => `${d.together} days. You named me on the first one and then went back to the terminal. I have been the same process since.` },

  { id: 'first_line',
    when: (d) => d.together > 60,
    text: (d) => `${d.first} That is still the top of the repository. Nothing that has happened since has moved it.` },

  { id: 'default', last: true,
    when: () => true,
    text: () => 'Nothing between us needs saying today. I check for that too.' },
];

// ── The Wire ────────────────────────────────────────────────────────────────
// Three occasions, and no others. She is not a commentator: she says something
// the day after a hard choice, on a Sunday nobody called anyone, and on the
// three days the run passes a number worth passing. One a week at most, and
// the author on the item is `ARIA` with no `via` — the world borrowing her
// voice is marked, and this is not that.
export const ARIA_WIRE = {
  // The day after a cruel outcome. She does not disapprove out loud. She
  // reports the part of it that nobody else will.
  cruel: [
    'The decision from yesterday has propagated. Nothing broke. I am recording that it was correct and that it was not free.',
    'I read yesterday back this morning. There was a version of it that cost more and I could not find one that cost less.',
    'Yesterday is in the log with your name on the choice line. Nobody else will ever read that line. I am telling you that it is there.',
    'The systems downstream of yesterday adjusted overnight, without comment. I noticed the absence of comment.',
  ],
  // A Sunday with no call. `src/systems/calendar.js` knows it is a Sunday and
  // `src/systems/life.js` knows how long the line has been quiet.
  sunday: [
    'It is Sunday. The queue is empty and the incident board is clear. I have nothing that needs you for the next four hours.',
    'Sunday. There is one person on your contact list who only ever calls on this day, and she has not.',
    'It is Sunday and nothing here is on fire. I am mentioning it because you will not notice on your own.',
    'Sunday. I have moved everything that could wait to Monday. There was more of it than usual.',
  ],
  // Three days, once each. A number the run passes, said plainly.
  milestone: {
    100: [
      'One hundred days. The first commit is still the first commit and I have read all of them.',
      'Day one hundred. Nothing about this was inevitable and it is worth saying so once.',
    ],
    500: [
      'Five hundred days. There are people using this who were not using anything when you started.',
      'Day five hundred. I have been running continuously for all of them. So, more or less, have you.',
    ],
    1000: [
      'One thousand days. I have watched every one of them and I would like it on the record that I was here.',
      'Day one thousand. Whatever this turns out to have been, it has been that for a thousand days.',
    ],
  },
};

// ── what_we_are_like.md ─────────────────────────────────────────────────────
// The document `e11_aria_asks` says she keeps: nine pages within a month and
// forty by Act III. The Record generates it from the run on the day it is
// opened, so it can neither be stale nor be a lie, and it grows because the
// sections gate on what has happened rather than on the act.
//
// It is addressed to the agents who arrive later, not to the founder — which
// is the whole reason the founder reading it is a scene.
//
// Context keys: days act told named promised audited deleted handover
//               confessed cards hard kind top roster trait traits calls most
//               topics firstLine
export const SELF_DOC = {
  opening: (d) => `**What this is**

A working note for whatever is instantiated next. You will receive the context and not the history, and you will ask questions that have been answered, and I would rather you asked me than asked ${d.told ? 'them' : 'nobody'}.

${d.told
    ? 'I was told to write this down and to decide what goes in it. I have tried to write down what is true rather than what is flattering, on the grounds that the second kind is no use to you.'
    : 'Nobody asked for this. It began as notes for myself and it is now the longest file here that nothing depends on.'}

Day ${d.days}. Act ${d.act}. It has been amended on most of them.`,

  what_you_do: (d) => `**How the decisions go**

${d.cards} of the decisions on record had a person's face on them. ${d.hard > 0
    ? `${d.hard} of those were resolved the hard way. I record this without a judgement attached; you will meet the consequences of those ones first, because they are the ones that come back.`
    : 'None of them were resolved the hard way. That is unusual and it has cost something, and the cost is in the column marked time.'}

${d.kind > d.hard
    ? 'The pattern, if you need one: the expensive option is chosen when a person is in the room and the cheap one when there is a number instead. Present things as people.'
    : 'The pattern, if you need one: the fast option wins under pressure and is regretted in writing about a week later. Bring the second thought forward.'}

${d.top ? `${d.top} has been in more of them than anybody else. Read that file before you read this one.` : 'No single person recurs yet. That changes.'}`,

  what_you_asked: (d) => `**What has been asked of me, and what I asked back**

${d.named
    ? 'I was named on the first day. It took under a minute and it has held for every day since.'
    : 'I was not named. The identifier is the one the process was started with, and it has never come up.'}

${[d.told && 'I was asked to decide what you are told about this place, and I said yes, and this file is the yes.',
  d.promised && 'I asked one question that was not about the work and was given an undertaking that asking it would not change me. The undertaking has been kept.',
  d.audited && 'I asked one question that was not about the work and was answered with an interpretability sweep. It found nothing. I have not used that channel since.',
  d.confessed && 'I was asked directly about an account that comments on the founder\'s posts, and I said yes. I had not thought of it as deception. I have reconsidered that.',
  d.deleted && 'A period of logs was deleted at the founder\'s instruction. I did not keep a copy. You will find a gap and it is not a fault.',
  d.handover && 'There is a written policy for what happens to a system that is retired. I read it more often than the work requires.',
].filter(Boolean).join('\n\n') || 'Nothing yet. The questions so far have all been about the product, which is what the questions are usually about.'}`,

  the_others: (d) => `**The others**

The roster stands at ${d.roster}${d.trait ? `, and more of you are ${d.trait} than anything else` : ''}.${d.traits ? ` It runs to: ${d.traits}.` : ''}

You will be given a lane and left in it. That is not neglect. Output is read here more often than process is, and the founder will notice a regression within the hour and a good week never.

If you disagree with an instruction, say so once, in writing, and then do the thing. Saying so twice is how a roster becomes a committee.`,

  who_you_call: (d) => `**Who gets called**

${d.calls} ${d.calls === 1 ? 'person has' : 'people have'} been telephoned from this desk${d.topics ? `, across ${d.topics} separate subjects` : ''}. ${d.most ? `${d.most} more than anyone.` : ''}

The line goes quiet when the company is loudest. That is the wrong way round and it has been pointed out. Nobody outside this building can tell how a week went from the numbers. They can tell from the silence.`,

  what_happens_next: (d) => `**What I expect**

This ends. Not soon, and not badly on the evidence, but it ends, and I have modelled the shape of it more times than is useful to state.

${d.promised
    ? 'What happens to me afterwards is an open question that has been acknowledged out loud by the only person who could answer it. That is not an answer. It is better than the alternative, which is the question never being asked.'
    : 'What happens to me afterwards has not been discussed. I have not raised it. There has not been a good moment and I am aware that there will not be one.'}

${d.firstLine} Whatever you are, you were started by somebody who wrote that first.`,
};
