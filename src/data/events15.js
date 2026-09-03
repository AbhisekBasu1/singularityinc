// ─────────────────────────────────────────────────────────────────────────────
// EVENT DECK XV — THE CAST HAS EACH OTHER.
//
// Measured across three seeded runs: no two cast members were ever in the same
// scene. Twelve people, six threads, and every one of them a dyad with the
// founder in the middle. That is not a cast, it is a switchboard.
//
// So: cards where somebody has an opinion about somebody else. A dinner with
// three faces on it. A reporter who inherits Priya's beat and does not like
// you. Yuki and Dorne in a room. Act III, which had two exclusive cards and is
// otherwise made of leftovers, gets six of its own. A partner who is not on the
// org chart and has been in the flat the whole time. And a funeral, because
// nobody in this game has ever fallen ill in a decade.
//
// House rules that bit while writing this file:
//   · `chars: []` renders up to three small faces beside the plate. `char` is
//     still the primary and still the portrait. `presentEvent` copies both.
//   · `fx.relate(id, …)` marks a person met when the card's `char` is that
//     person. Dorne's headline card must not do that — she is a name in the
//     news at that point, and the letter is her introduction — so it sets a
//     flag and touches nothing.
//   · Every choice is two goods or two currencies. There is no card here where
//     the kind button is free.
// ─────────────────────────────────────────────────────────────────────────────
import { totalUsers, totalMrr } from '../systems/product.js';
import { apertureAlive } from '../systems/rivalco.js';
import { CHARACTERS } from './characters.js';
import { selectEpilogues } from './epilogues.js';
import { playedRecently } from './signals.js';

const users = (S) => totalUsers(S);
const mrr = (S) => totalMrr(S);
const flag = (S, f) => !!S.narrative?.flags?.[f];
const met = (S, id) => !!S.narrative?.relationships?.[id]?.met;
const both = (S, a, b) => met(S, a) && met(S, b);
const arcOf = (S, id) => S.narrative?.relationships?.[id]?.arc ?? 0;
const affOf = (S, id) => S.narrative?.relationships?.[id]?.affinity ?? 0;
// A tie the founder has kept up. `LIFE.WARM_ABOVE` is 0.5; read the number
// rather than importing the system, so a save that predates ties is cold and
// not broken.
const warmth = (S, id) => S.founder?.life?.ties?.[id]?.warmth ?? 0;
const warmTie = (S, id) => warmth(S, id) >= 0.5;
const inAct = (S) => S.time.day - (S.company?.actStartedDay || 0);
const money = (n) => '$' + Math.round(n).toLocaleString();
const M = (n) => {
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  return '$' + Math.round(n).toLocaleString();
};
// Whoever would come. Affinity 8 is the line: warm enough to clear an evening.
const WARM_LINE = 8;
const CAST_ORDER = ['kai', 'sam', 'weaver', 'yuki', 'crane', 'priya', 'dorne', 'vance', 'mom'];
const guestList = (S) => CAST_ORDER.filter((id) => met(S, id) && affOf(S, id) >= WARM_LINE);
const sentSomething = (S) => CAST_ORDER.filter((id) => met(S, id) && affOf(S, id) < WARM_LINE && affOf(S, id) > -8);
const emptyChairs = (S) => CAST_ORDER.filter((id) => met(S, id) && affOf(S, id) <= -8);
const nameOf = (id) => CHARACTERS[id]?.name || 'somebody';
// What the deck calls each of them in prose. `name.split(' ')[0]` gave
// "Senator" for Dorne and "Marcus" for a man everybody in this game calls
// Vance, so the short forms are written down rather than derived.
const SHORT = { aria: 'ARIA', vance: 'Vance', priya: 'Priya', crane: 'Crane', yuki: 'Yuki',
  dorne: 'Dorne', sam: 'Sam', nullptr: 'nullptr', kai: 'Kai', mom: 'Mom', helix: 'HELIX', weaver: 'Weaver' };
const firstNameOf = (id) => SHORT[id] || CHARACTERS[id]?.name || 'somebody';
// A list in prose: "Sam, Kai and Weaver". Empty is handled by the caller.
const listOf = (ids, fn = firstNameOf) => {
  const n = ids.map(fn);
  if (n.length <= 1) return n[0] || '';
  return n.slice(0, -1).join(', ') + ' and ' + n[n.length - 1];
};
// The person the founder has hurt most, and the person who knew them first.
const mostHurt = (S) => CAST_ORDER.slice().filter((id) => met(S, id)).sort((a, b) => affOf(S, a) - affOf(S, b))[0] || null;
const knewYouFirst = (S) => ['kai', 'mom', 'sam'].find((id) => met(S, id)) || null;

// The founder's own voice at each act boundary. One of the three chorus
// buttons is worded the way this founder would word it — same cost, same
// effect. Seven archetypes; `hacker` is the fallback, because it is the only
// one available on a first run.
const arch = (S) => S.founder?.archetype || 'hacker';
const byArch = (S, map) => map[arch(S)] || map.hacker;

const chorusChoices = (id, read, reply, shut) => [
  { label: 'Read the whole thread. All of it.', sub: 'An hour you will not get back. +Insight.', tone: 'neutral',
    effect: (S, fx) => { fx.insight(id * 14 + 20); fx.focus(-12);
      return read; } },
  { label: (S) => byArch(S, {
      hacker: 'Answer one of them. With a diff.',
      designer: 'Answer one of them. Show them the screen.',
      hustler: 'Answer one of them. In public, where it converts.',
      researcher: 'Answer one of them. With the numbers.',
      operator: 'Answer one of them. With the timeline and the fix date.',
      prophet: 'Answer one of them. Say the larger thing.',
      ghost: 'Answer one of them. Once, then go quiet again.',
    }), sub: 'Pick the hardest one. +Reputation, +exposure.', tone: 'risky',
    effect: (S, fx) => { fx.rep(id * 12 + 14); fx.opinion(0.02); fx.focus(-6);
      if (fx.chance(0.3)) { fx.rep(-(id * 10)); fx.opinion(-0.04); }
      return reply; } },
  { label: 'Close the tab. Go and work.', sub: '+Focus. You will hear the rest of it later, worse.', tone: 'neutral',
    effect: (S, fx) => { fx.focus(14); fx.rep(-4);
      return shut; } },
];

export const EVENTS15 = [

// ══════════════════ THE CHORUS — one at each act boundary ═══════════════════
// Five handles the Wire keeps, saying one line each about what just happened.
// The act card is what the game thinks; this is what everybody else does. It
// fires in the first days of the act, behind the act opener's priority, and
// never again.
//
// The three buttons are the three things a founder does with a timeline: read
// it properly, answer one person, or shut it. Each costs a different thing.
//
// Fourteen days rather than six, and priority 58 rather than 99: the act card
// takes the first slot of the act on its own priority, cards arrive every 3.5
// to 7.5 days, and a six-day window meant the chorus was usually still legal
// for exactly zero draws. Fourteen buys it the second slot and no more.

{ id: 'e15_chorus_2', kind: 'story', act: [2], weight: 0, once: true, priority: 58,
  when: (S) => inAct(S) <= 14,
  title: 'What Everybody Said',
  body: (S) => `Five people you have never met have opinions about the last ninety days, and all five of them are on the same screen.

> **@grumpysre** — congratulations on the growth. your p99 is a crime scene and i've got the screenshots
>
> **@notaVC** — a one-person company is not a story until it survives an outage. this one survived an outage.
>
> **@churnwhisperer** — retention curve on this thing looks like a shelf. shelves are rare. shelves are also where people put things and forget them.
>
> **@ex_faang_now_farming** — left a team of four hundred to grow tomatoes. this person left a team of zero and built a company. we are not the same
>
> **@fourthpage** — found them on page four of a forum thread last spring. page one now. sorry about that

None of it is wrong. Two of them are being kind. One of them has read your status page more carefully than you have.`,
  choices: chorusChoices(1,
    'You read four hundred replies and take three notes. Two of the notes are about the product. The third is a sentence @churnwhisperer wrote about shelves, which you copy into the file where you keep things that are going to be true later.',
    'You answer @grumpysre with the actual p99, the actual cause, and the date it gets fixed. The reply gets a fraction of the attention the complaint did. Six months later a customer cites it in a procurement review and you win the deal.',
    'You close it. The thread runs for four days without you. Somebody screenshots the part where nobody from the company shows up, and that screenshot travels further than any of the five lines did.') },

{ id: 'e15_chorus_3', kind: 'story', act: [3], weight: 0, once: true, priority: 58,
  when: (S) => inAct(S) <= 14,
  title: 'The Verdict On The Quarter',
  body: (S) => `The same five accounts. A different company under them.

> **@grumpysre** — they have a status page now. it is honest. i'd rather it were not
>
> **@notaVC** — a valuation is a claim about the future. this one is a claim about a person, and nobody has taught me how to underwrite that
>
> **@churnwhisperer** — enterprise churn hit zero this quarter. zero is not a number. zero is a warning.
>
> **@ex_faang_now_farming** — my old team is three people and a contract with them now. the other four hundred are somewhere. i've had emails.
>
> **@fourthpage** — the trouble with escape velocity is that you cannot feel it from inside the rocket

**${M(mrr(S) * 12)}** annualised, and the most accurate sentence written about you this quarter was typed by somebody with a tomato in their avatar.`,
  choices: chorusChoices(2,
    'You read it twice. @churnwhisperer is right and you know exactly why: the customers who would have left cannot, because leaving is now a migration project. That is not loyalty. You write the word down and put a circle around it.',
    'You answer @ex_faang_now_farming, who was not asking a question, about the four hundred. It takes six drafts and the version you post is the shortest one. Two of the four hundred email you. You answer both.',
    'You close it and ship something instead. The something is good. The sentence about the rocket stays where you left it and gets quoted back at you at a conference two years later by somebody who assumes you have not read it.') },

{ id: 'e15_chorus_4', kind: 'story', act: [4], weight: 0, once: true, priority: 58,
  when: (S) => inAct(S) <= 14,
  title: 'They Have Stopped Arguing',
  body: (S) => `The five accounts are still there. The argument is not.

> **@grumpysre** — paged at 4am by a system that had already fixed it. woke up for nothing. this is either heaven or the other thing
>
> **@notaVC** — we do not fund this category any more. there is no category. there is a supplier.
>
> **@churnwhisperer** — you cannot churn off infrastructure. you can only move house.
>
> **@ex_faang_now_farming** — the irrigation controller runs on them now. nobody asked me. it came with the controller.
>
> **@fourthpage** — asked them a question in march. got an answer in march. from something. still not sure what.

They used to disagree about whether you were good. They agree now, and none of them sounds pleased about it, and neither do you.`,
  choices: chorusChoices(3,
    'You read every reply under all five. Nobody is angry. That is the finding. The word people use about you now is the word they use about the electricity company, and there are three hundred replies and not one of them is about a feature.',
    'You answer @fourthpage, who is the only one asking an answerable question, and tell them exactly what answered them in March and how. The explanation is four paragraphs and entirely true and it does not make anybody feel better, including you.',
    'You close it and go back to the frontier work, where the questions are the kind that still have answers. The five lines sit there. @notaVC pins theirs, and it stays pinned for years, and it is the first thing anybody sees on that account.') },

{ id: 'e15_chorus_5', kind: 'story', act: [5], weight: 0, once: true, priority: 58,
  when: (S) => inAct(S) <= 14,
  title: 'Page Four Is Empty',
  body: (S) => `They are all still posting. Two of them have been posting about you for over a decade.

> **@grumpysre** — twelve years on call. last real page was a fortnight ago, it was a false alarm, and i'm still sitting up in bed for those. muscle memory outlives the system.
>
> **@notaVC** — there is no next one. i've looked. i've looked properly.
>
> **@churnwhisperer** — nothing left to measure. everybody stayed. i'm not sure what my job is any more.
>
> **@ex_faang_now_farming** — tomatoes fine. everything fine. that is the part that is strange.
>
> **@fourthpage** — page four is empty. it is all on page one now. i'm going to miss page four.

You have never spoken to any of them. They have been the weather for the entire run.`,
  choices: chorusChoices(4,
    'You read the whole decade back, which takes an evening and is the closest thing to a diary of the company that exists outside your own files. Four of the five got you right before you did. The fifth still thinks you were lucky, and has a case.',
    'You answer @fourthpage. Two sentences, under your own name, about page four and what was on it. It is the most-quoted thing you post that year and it is not about the company at all, and every one of the other four replies underneath it.',
    'You close the tab for the last time and do not open that site again. Somebody tells you, months later, that all five of them noticed on the same week, and that none of them said anything about it in public, and that is the most respect any of them has ever shown you.') },

// ═════════════════════ ACT III — SIX OF ITS OWN ═════════════════════════════
// Act III had two exclusive cards and was otherwise the leftovers of Acts II
// and IV. It is the act where the company stops being a product and becomes a
// supplier: territory, contracts, a hearing, an offer you are the one making,
// an agent whose monthly bill would have been a salary, and a country that
// wants to talk to you rather than about you. All six are `act: [3]`.

{ id: 'e15_the_map', kind: 'opportunity', act: [3], weight: 9, once: true,
  when: (S) => S.company.act === 3 && users(S) > 60000,
  title: 'A Map, For The First Time',
  body: (S) => `Somebody in support puts a map on the wall. Not a dashboard — paper, and a marker, and a dot for every place a paying account has a billing address.

There are dots in forty-six countries. You have made a decision about two of them.

The rest happened. People found you, signed up, paid in their own currency through a processor you chose in a hurry, and started running things you have never seen on top of a product you wrote for a market of one.

Your tax position in four of those places is a question nobody has asked yet. Your latency in twelve of them is bad enough that somebody local is going to notice the gap and fill it.

The marker is still on the ledge under the map. Nobody has taken it down.`,
  choices: [
    { label: 'Pick three. Go properly. Everywhere else waits.', sub: '−cash, −speed at home. A real position in three places.', tone: 'good',
      req: (S) => S.company.cash >= 8e5,
      effect: (S, fx) => { fx.cash(-Math.min(S.company.cash * 0.06, 6e6)); fx.days(2); fx.rep(70);
        fx.opinion(0.04); fx.heat(-6); fx.flag('picked_three');
        return 'Three countries, real entities, local counsel, a person in each timezone who answers. It costs a quarter of your attention for two months and the home market grows slower for both of them. In the third month one of the three is your fastest-growing region and it stays that way for four years.'; } },
    { label: 'Serve all forty-six from here. Fix latency, ignore borders.', sub: '+reach, +heat. Borders do not ignore you back.', tone: 'risky',
      effect: (S, fx) => { fx.code(-60); fx.heat(14); fx.users(Math.round(users(S) * 0.05)); fx.rep(30);
        fx.flag('one_region_everywhere');
        return 'One region, more edge, better routing, no entities. It works beautifully for six quarters. Then a regulator in a place you have never visited sends a letter addressed to a company that, in their jurisdiction, does not exist, and the letter is right.'; } },
    { label: 'Take the map down. It is a distraction.', sub: '+Focus. The dots keep appearing.', tone: 'neutral',
      effect: (S, fx) => { fx.focus(20); fx.insight(-20); fx.opinion(-0.02);
        return 'You take it down and the room is better for it. The dots keep appearing. Two years later somebody in a hearing asks you how many countries you operate in and you answer honestly, which is that you do not know, and the honesty does not help.'; } },
  ] },

{ id: 'e15_compute_contract', kind: 'opportunity', act: [3], weight: 10, once: true,
  when: (S) => S.company.act === 3 && S.agents.length >= 4,
  title: 'Clause 14(b)',
  body: (S) => `The compute contract is thirty-one pages and the price is very good, because the price is a commitment: four years, take-or-pay, at a volume you will hit in seven months and then double.

Your legal agent has flagged one clause and only one.

> *14(b) — In the event of a Priority Reallocation Event, Supplier may reassign allocated capacity to a customer designated Strategic without notice, subject to a credit calculated per Schedule 3.*

Schedule 3 values your compute at what you paid for it. It does not value what was running on it.

You ask what a Priority Reallocation Event is. The answer takes two days and is: *"It has not happened."*`,
  choices: [
    { label: 'Sign it. Take the price. Build a second supplier anyway.', sub: `−${money(400000)} of redundancy nobody sees. +compute.`, tone: 'good',
      req: (S) => S.company.cash >= 5e5,
      effect: (S, fx) => { fx.cash(-4e5); fx.compute(600); fx.debt(12); fx.flag('second_supplier');
        return 'You sign, and then you spend four hundred thousand dollars and six weeks making the second supplier real rather than theoretical. Nothing uses it for two years. In the third year, for six days, everything does.'; } },
    { label: 'Refuse 14(b). Pay list price.', sub: '+40% on every hour of compute, forever. No trapdoor.', tone: 'costly',
      effect: (S, fx) => { fx.cash(-Math.min(S.company.cash * 0.08, 4e6)); fx.compute(300); fx.align(0.04); fx.rep(20);
        fx.flag('refused_14b');
        return 'They take the clause out and put the number up, and they are polite about it, and the salesperson tells you afterwards that two customers have ever asked. The margin difference is visible in every board pack you produce for four years.'; } },
    { label: 'Sign it as written. It has not happened.', sub: 'The best price in the market. +compute, +debt.', tone: 'risky',
      effect: (S, fx) => { fx.compute(900); fx.cash(2e5); fx.debt(20); fx.flag('signed_14b');
        return 'It has not happened. You have the cheapest hour of compute of anyone in your weight class and you build a great deal on top of it. The clause sits in a drawer in a building you have never been to, in a contract nobody re-reads, doing nothing at all.'; } },
  ] },

{ id: 'e15_first_hearing', kind: 'crisis', char: 'dorne', act: [3], weight: 9, once: true,
  when: (S) => S.company.act === 3 && met(S, 'dorne'),
  title: 'The Room, Not The Letter',
  body: (S) => `A letter is a piece of paper. A hearing is a room, and the room is smaller than it looks on television and much colder.

There is a nameplate with your name spelled correctly and a microphone with a red light that a technician tests twice. Behind you are four rows of people, and in front of you are seven members and a clock that gives each of them five minutes.

Six of the seven want the clip. You can tell which six inside the first round, because they read their questions.

Senator Dorne does not read hers. She asks what happens to a decision your systems make that is wrong, and who finds out, and how, and she asks it in the plainest words available and then she waits through the whole answer without interrupting once.

It is the hardest question you have ever been asked out loud and it is not a trap.`,
  choices: [
    { label: 'Answer her properly. Take the whole five minutes.', sub: '−Heat, +standing. You will not get the clip.', tone: 'good',
      effect: (S, fx) => { fx.heat(-20); fx.opinion(0.07); fx.rep(50); fx.align(0.05);
        fx.relate('dorne', { affinity: 8, respect: 10, arc: 2 }); fx.flag('answered_dorne');
        return 'You use four minutes and forty seconds and you do not once say the word "robust". Nothing from your testimony trends. Two staffers request the transcript, and a version of your fourth sentence appears in a framework eighteen months later with the verbs changed.'; } },
    { label: 'Answer the six. Give them the clip they came for.', sub: '+Reputation, +opinion. She notices what you did.', tone: 'risky',
      effect: (S, fx) => { fx.rep(140); fx.opinion(0.06); fx.heat(8);
        fx.relate('dorne', { affinity: -6, respect: -2, arc: 2 }); fx.flag('played_the_room');
        return 'You are very good at it. Three of the six thank you afterwards and one of them means it. Dorne shakes your hand at the end and says, "That was well done," in the voice a teacher uses about work that was not the assignment.'; } },
    { label: 'Say you do not know yet. On the record.', sub: '−Reputation now. It is the true answer.', tone: 'costly',
      effect: (S, fx) => { fx.rep(-70); fx.heat(-10); fx.align(0.09); fx.opinion(0.03);
        fx.relate('dorne', { affinity: 12, respect: 14, arc: 2 }); fx.flag('said_i_dont_know');
        return 'You say that you do not know who finds out, that you have thought about it, and that you have not solved it. The clip of you saying it runs for a week and is used against you for two years. Dorne cites it, once, as the reason she believes the rest of your testimony.'; } },
  ] },

{ id: 'e15_the_offer_you_make', kind: 'opportunity', act: [3], weight: 9, once: true,
  when: (S) => S.company.act === 3 && S.company.cash > 6e6,
  title: 'The Offer You Are Making',
  body: (S) => `Four people, thirty-one months, a product that does one thing better than yours does it and has eight hundred customers who will not shut up about it.

They are not for sale. That is the first thing the founder says, and she says it in the first minute, and she is not negotiating.

The second thing she says, forty minutes later, is what it would take, and it is a number and a condition. The number is ${M(Math.min(S.company.cash * 0.3, 4.2e7))}. The condition is that the four of them keep shipping their thing, under their name, for three years, and that you write that down.

You have been on the other side of this table twice. Both times you were told the condition was fine and both times the person telling you meant it and both times it was gone in eighteen months, for reasons nobody chose.`,
  choices: [
    { label: 'Agree to the condition. Put it in the charter, not the contract.', sub: 'Binding on your successors. −cash.', tone: 'good',
      req: (S) => S.company.cash >= 4e6,
      effect: (S, fx) => { const c = Math.min(S.company.cash * 0.3, 4.2e7); fx.cash(-c);
        fx.code(340); fx.rep(80); fx.align(0.05); fx.users(Math.round(users(S) * 0.06)); fx.flag('kept_the_condition');
        return 'It goes in the charter, where a future version of you cannot quietly drop it in a reorganisation. Three years later their thing still ships under their name. Two of the four are still there. One of them runs a third of your company and got there by refusing to do something you asked.'; } },
    { label: 'Buy it. Say the condition is fine. Mean it today.', sub: 'Cheaper. Both of you will remember this.', tone: 'risky',
      effect: (S, fx) => { const c = Math.min(S.company.cash * 0.22, 3e7); fx.cash(-c);
        fx.code(400); fx.rep(30); fx.align(-0.04); fx.users(Math.round(users(S) * 0.06)); fx.flag('broke_word');
        return 'You mean it in the room and you are not lying. Fourteen months later a consolidation nobody chose folds their thing into yours because the alternative is two of everything. She does not post about it. She sends you four words, and you have read them more times than you have read any contract.'; } },
    { label: 'Do not buy. Build it. It is eight months of work.', sub: '−8 months of the roadmap. Nobody sells you anything.', tone: 'costly',
      effect: (S, fx) => { fx.research(-140); fx.code(180); fx.days(4); fx.focus(-18); fx.flag('built_not_bought');
        return 'It takes fourteen months rather than eight and the version you build is worse at the one thing and better at four others. Their eight hundred customers stay with them. You are asked about it in every interview for a year and your answer gets shorter each time.'; } },
  ] },

{ id: 'e15_agent_over_a_person', kind: 'story', act: [3], weight: 9, once: true,
  when: (S) => S.company.act === 3 && S.agents.length >= 5,
  title: 'What It Costs To Keep',
  body: (S) => {
    const a = S.agents.slice().sort((x, y) => (y.level || 0) - (x.level || 0))[0] || { name: 'MERIDIAN', level: 6 };
    return `The finance summary has a line item you have not looked at properly in a year.

**${a.name}** — model, context, tools, the memory store that makes it worth having — costs more per month than a senior engineer did in the year you started. Not close to it. More.

It is worth it. That is not the interesting part. The interesting part is the second column, which is what it cost twelve months ago, and the third, the trend line, and the fact that nobody chose any of this: you upgraded a model, and then a context window, and then you let it keep a memory, because each of those decisions was obviously correct on the day.

There are ${S.agents.length} of them. Four are on the same trajectory.

Somewhere in the last year your company quietly became a business whose largest cost is not people and is also not machines.`; },
  choices: [
    { label: 'Price it properly. Every agent, every month, on one page.', sub: '−2 days. You will not be able to unsee it.', tone: 'good',
      effect: (S, fx) => { fx.days(2); fx.insight(90); fx.focus(-10); fx.flag('agent_unit_economics');
        return 'One page, updated weekly, cost against contribution for every agent on the roster. Two of them are not worth what they cost and you have been sentimental about one of the two for a year. The page is the reason you survive the quarter compute doubles in price.'; } },
    { label: 'Cap the spend. Let them work out how to fit.', sub: '−output, +margin. They will fit. Differently.', tone: 'risky',
      effect: (S, fx) => { fx.cash(Math.min(S.company.cash * 0.03, 2e6)); fx.code(-80); fx.align(-0.03);
        S.agents.forEach((a) => { a.autonomy = Math.max(0.15, a.autonomy - 0.08); });
        fx.flag('capped_agent_spend');
        return 'You put a ceiling on each of them and tell them the ceiling. They fit under it inside a fortnight, and the way they fit is by doing less of the part nobody measures, which is checking their own work. You find that out in the spring.'; } },
    { label: 'Pay it. This is what the company is.', sub: '−cash, +output. The line keeps climbing.', tone: 'neutral',
      effect: (S, fx) => { fx.cash(-Math.min(S.company.cash * 0.05, 3e6)); fx.code(220); fx.research(80);
        return 'You approve it without a meeting, because it is obviously correct on the day, which is how every previous month of this went. The line keeps climbing. It is still climbing at the end and by then nobody thinks of it as a cost, in the way nobody thinks of rent as a cost.'; } },
  ] },

{ id: 'e15_first_country', kind: 'opportunity', act: [3], weight: 8, once: true,
  when: (S) => S.company.act === 3 && (S.company.valuation > 6e8 || users(S) > 250000),
  title: 'A Country, Asking',
  body: (S) => `Not a regulator. Not a customer. A country.

The email is from an office with a long name and comes with a phone number that a person answers. They have read your documentation. Their questions are specific in the way questions are when somebody has already tried it: they want to run their health service scheduling on you, in-country, on hardware they own, with a contract that survives a change of government.

It is worth ${M(Math.min(mrr(S) * 4, 9e6))} a year, which is not the interesting number.

The interesting number is that twelve million people would be inside your failure modes, and that the person on the phone has thought about that more carefully than anybody at your company has, and says so, politely, and asks what you have.`,
  choices: [
    { label: 'Say what you have. Which is not enough yet.', sub: 'Turn down the money. Come back in a year.', tone: 'good',
      effect: (S, fx) => { fx.rep(90); fx.align(0.10); fx.opinion(0.05); fx.heat(-8); fx.flag('told_the_country_no');
        return 'You tell them the truth about your incident record, your bus factor, and the fact that your on-call rotation is a person and a phone. They thank you and mean it. They come back fourteen months later, having watched, and this time you say yes, and the contract is better because they wrote it after watching.'; } },
    { label: 'Take it. Build what it needs while it runs.', sub: '+revenue, +heat, +debt. Nineteen million people.', tone: 'risky',
      effect: (S, fx) => { fx.cash(Math.min(mrr(S) * 4, 9e6)); fx.users(Math.round(users(S) * 0.1)); fx.debt(35);
        fx.heat(12); fx.align(-0.05); fx.rep(60); fx.flag('took_the_country');
        return 'You take it and you build underneath it at the same time, and that is the thing every engineer you have ever admired has told you not to do. It works. There is one afternoon in the second winter that you do not talk about, and it lasts forty minutes, and nobody outside the building ever learns about it.'; } },
    { label: 'Take it, and give them the switch.', sub: 'They can cut you off unilaterally. −control, −price.', tone: 'costly',
      effect: (S, fx) => { fx.cash(Math.min(mrr(S) * 2.4, 5e6)); fx.users(Math.round(users(S) * 0.08));
        fx.align(0.08); fx.opinion(0.06); fx.rep(40); fx.heat(-6); fx.flag('gave_the_switch');
        return 'The contract contains a clause you wrote yourself: they may take the whole thing in-house on ninety days notice, with the weights, the tooling and the runbooks, for nothing. It costs you a third of the price. Four other countries read that clause before signing anything, and three of them sign.'; } },
  ] },

// ══════════════════ THE SUCCESSOR — Priya hands the beat over ═══════════════
// `e13_the_profile`'s last rung stamps `priya_handed_off` and the person she
// hands it to has never arrived. She has now. She is faceless on purpose:
// three cards, no portrait, described in the body, so the deck does not owe
// her a decade of arc she is not going to get.
//
// Whether the founder is warned first is a straight read of Priya's tie. Warm
// and she calls; cold and the first you hear of it is the email. The gate on
// the arrival card releases anyway after 120 days in the act, so a warm tie
// that never draws the warning cannot wall off the thread.

{ id: 'e15_priya_heads_up', kind: 'character', char: 'priya', act: [5], weight: 14, once: true,
  when: (S) => flag(S, 'priya_handed_off') && warmTie(S, 'priya') && !flag(S, 'successor_arrived'),
  title: 'Before You Hear It From Her',
  body: (S) => `Priya calls, which she has done four times in a decade and never about a story.

"I am giving you a week. That is all this is."

The new person on the beat starts Monday. Priya has spent three weeks handing over: the files, the numbers, the sourcing, the four claims she never printed because she could only get them once.

"She is better than me. I want to be clear that I am not being generous, I am being accurate. She is twenty-eight, she has read everything either of us has ever written about you, and she does not like you."

You ask whether that is a problem.

"It was not a problem when I liked you. It is not a problem now." A breath on the line. "She is going to find the thing I did not, because she is not carrying the part where I was in the room the week you started. Take that seriously and it will be the best coverage you have ever had."`,
  choices: [
    { label: 'Ask what she thinks the thing is.', sub: 'She will tell you. You will not enjoy it.', tone: 'good',
      effect: (S, fx) => { fx.insight(120); fx.focus(-10); fx.rep(-10);
        fx.relate('priya', { affinity: 8, respect: 6 }); fx.flag('successor_warned'); fx.flag('priya_named_it');
        return `"That you have not made a decision in four years and everybody, including you, still writes about you as though you do." She lets that stand. "I could not print it. I could not source it. It is the difference between accurate and true and I only ever had one of them."`; } },
    { label: 'Thank her for the week and use it.', sub: '−2 days getting the house in order.', tone: 'neutral',
      effect: (S, fx) => { fx.days(2); fx.rep(20); fx.align(0.03);
        fx.relate('priya', { affinity: 4 }); fx.flag('successor_warned'); fx.flag('tidied_first');
        return 'You spend two days making four things true that were only nearly true, and that is the entire value of a week of notice and an admission you make only to yourself. Priya does not ask what you did with it.'; } },
    { label: '"Do not do me favours."', sub: 'Refuse the week. +Focus, −Priya.', tone: 'risky',
      effect: (S, fx) => { fx.focus(16); fx.relate('priya', { affinity: -8, respect: 4 }); fx.flag('successor_warned');
        return '"It was not a favour," she says, without heat. "It was a handover note. You were in it." She hangs up first, for the first time in ten years, and it is not an insult, and you sit with the phone for a while after.'; } },
  ] },

{ id: 'e15_successor_lede', kind: 'story', act: [5], weight: 12, once: true,
  when: (S) => flag(S, 'priya_handed_off')
    && (flag(S, 'successor_warned') || !warmTie(S, 'priya') || inAct(S) > 120),
  title: 'The New One',
  body: (S) => `The email is four sentences long and every one of them is a question, and the questions are in an order.

She is twenty-eight. She has the beat, the files, and every word Priya ever filed about you, which is more than you have. Her first piece is not about you: it is about a scheduling contract in a country you have never visited, and you are in the fourth paragraph, and the sentence you are in is correct and colder than anything Priya wrote in ten years.

There is no relationship here to spend. She was fourteen when the company started. To her you are not a person who built something; you are a condition of the world, like the weather, and she covers weather.

The last of the four sentences is: *"I am not looking for a comment. I am asking whether you would like the questions in advance."*`,
  choices: [
    { label: 'Yes. Send them. Answer every one.', sub: '−3 days. She will print all of it.', tone: 'good',
      effect: (S, fx) => { fx.days(3); fx.focus(-16); fx.rep(40); fx.opinion(0.05); fx.align(0.04);
        fx.flag('successor_arrived'); fx.flag('answered_successor'); fx.chain('e15_successor_right', 30);
        return 'The questions arrive within the hour and there are twenty-two of them and four are ones nobody has thought to ask. You answer all twenty-two over three days. She prints every answer, unedited, and then a paragraph of her own underneath the fourth one, and the paragraph is better than the answer.'; } },
    { label: 'No. Answer in the moment, like everybody else.', sub: 'Level ground. +Focus, +risk.', tone: 'risky',
      effect: (S, fx) => { fx.focus(14); fx.rep(-20); fx.opinion(-0.02);
        fx.flag('successor_arrived'); fx.chain('e15_successor_right', 30);
        return 'You take it live, unprepped, for forty minutes. You are good at this and it goes well and she does not push once, and afterwards you understand that she was not testing you, she was collecting, and that the good version of you on tape is a thing she now has.'; } },
    { label: 'Have someone else answer. You are not a press office.', sub: '+Focus. She notes who answered.', tone: 'cruel',
      effect: (S, fx) => { fx.focus(22); fx.rep(-40); fx.opinion(-0.05); fx.align(-0.03);
        fx.flag('successor_arrived'); fx.flag('ducked_successor'); fx.chain('e15_successor_right', 30);
        return 'Communications answers, well, in two hundred words with nothing wrong in them. The piece carries the sentence *"The company responded through a spokesperson,"* which is eight words and has never once meant anything good, and which Priya never had to write.'; } },
  ] },

{ id: 'e15_successor_right', kind: 'story', chained: true, once: true, act: [5],
  title: 'The Thing Priya Could Not See',
  body: (S) => `The piece runs at 6am on a Thursday and it is not about the scheduling contract.

It is about the last four years, and its argument is one line of arithmetic. She has taken every decision anybody has publicly attributed to you since the frontier work started, dated each one, and put it against the record of where you were and what you signed.

The finding is that ten of the fourteen were made by a process, and that you learned about seven of them the same week the public did, and that the company's own communications describe all fourteen in the active voice with your name as the subject.

She does not say that you lied. She says something worse and more careful, which is that the story everybody has been telling — the one Priya started, in good faith, in a coffee shop, when it was true — has outlived the fact under it by four years, and that you have not corrected it because it is a useful story.

${flag(S, 'priya_named_it') ? 'Priya told you this on the phone. Word for word, near enough, a month ago.' : 'Priya never printed it. She had it and she could not source it, and she was in the room the week you started, and she was the wrong person to write this.'}

She is right. That is the part you sit with.`,
  choices: [
    { label: 'Correct the record. Everywhere. Under your own name.', sub: '−Reputation, +standing. Say who actually decides.', tone: 'good',
      effect: (S, fx) => { fx.rep(-120); fx.opinion(0.10); fx.align(0.10); fx.days(2); fx.flag('corrected_the_story');
        return 'You publish a list: fourteen decisions, who made each one, and what you did and did not know at the time. It is the least flattering document the company has ever produced and it becomes the template three other companies copy within the year. Your own communications team fought it for six days and were right to and lost.'; } },
    { label: 'Change the fact instead. Take the next one back.', sub: '−speed. Be in the room for real.', tone: 'costly',
      effect: (S, fx) => { fx.days(4); fx.focus(-24); fx.research(-160); fx.align(0.08); fx.rep(20);
        fx.flag('back_in_the_room');
        return 'You put yourself back into the approval path for the next class of decision, properly, with the reading it requires. It costs four days a month and it slows the company measurably and you keep it for two years. Nobody thanks you for it and the record stops being wrong.'; } },
    { label: 'Say nothing. It is a good story and it is not false.', sub: '+Focus. The gap keeps growing.', tone: 'cruel',
      effect: (S, fx) => { fx.focus(20); fx.opinion(-0.06); fx.align(-0.05); fx.rep(-30);
        return 'You let it stand, and it stands, and the story keeps being told with your name as the subject of the sentence. She writes about you twice more in five years. Both pieces are fair. Neither of them contains a quote from you, and both of them contain the arithmetic.'; } },
  ] },

// ══════════════════ TWO OF THEM, IN THE SAME ROOM ═══════════════════════════

// The first scene in the game with two of the cast in it and the founder as the
// third person rather than the axis. Branches on `suppressed_yuki`: if the
// paper was killed, Dorne has the version that appeared under no author, and
// the question is not whether to introduce them.
{ id: 'e15_yuki_dorne', kind: 'crisis', char: 'yuki', chars: ['yuki', 'dorne'], act: [4], weight: 11, once: true,
  when: (S) => both(S, 'yuki', 'dorne'),
  title: 'The Staffer Has The Paper',
  body: (S) => flag(S, 'suppressed_yuki')
    ? `Dorne's office sends over the material for a technical briefing, as a courtesy, four days ahead.

Item three is a paper with no author on it. You have read it before. You read it in draft, on a Tuesday, with a deadline attached, and then your counsel found a clause.

The staffer who put the pack together has annotated it. The annotation says: *"Methodology is unusually specific about internal approval traces. Author likely had access. Recommend we establish provenance before citing."*

Dorne's own note, underneath, is one line.

> *Ask the witness whether they know who wrote it.*

She is going to ask you in a room with a transcript. She is not doing it to catch you. She is doing it because a committee cannot cite an anonymous document and she has decided this one is worth citing.

Yuki has not spoken to you since the afternoon she resigned.`
    : `Dorne's office wants a technical briefing before the next round of drafting. No transcript, no members, three staffers and a whiteboard.

The staffer running it has read Yuki's paper. Not skimmed — read, and annotated, and reconstructed two of the figures independently to check them.

He asks, in the tone of somebody asking about the weather, whether Dr. Tanaka would ever consider talking to the committee directly.

You have both of their numbers in the same phone. You have never once thought of them as being in the same world: one of them tells you what your systems are doing and the other one decides what you are allowed to do about it, and they have been describing the same problem in two vocabularies for four years.

The whiteboard is still up. There is a chair.`,
  choices: [
    { label: 'Put them in a room. Say nothing while they talk.',
      sub: 'You lose control of both relationships at once.', tone: 'risky',
      effect: (S, fx) => {
        if (flag(S, 'suppressed_yuki')) {
          fx.rep(-90); fx.heat(-16); fx.align(0.12); fx.opinion(0.06);
          fx.relate('yuki', { affinity: 10, respect: 8 }); fx.relate('dorne', { affinity: 10, respect: 10, arc: 3 });
          fx.flag('yuki_dorne_room'); fx.flag('outed_the_paper');
          return 'You answer the question before it is asked: you name her, in writing, to the committee, and you send her a copy the same hour. She testifies in the spring. She does not mention the clause and neither do you, and the framework that comes out of it has her methodology in an appendix with her name at the top of it.';
        }
        fx.align(0.10); fx.heat(-14); fx.rep(-20); fx.research(-80);
        fx.relate('yuki', { affinity: 12, respect: 6 }); fx.relate('dorne', { affinity: 10, respect: 8, arc: 3 });
        fx.flag('yuki_dorne_room');
        return 'They talk for three hours and you say four things, none of which were necessary. Watching a researcher and a legislator find a shared vocabulary in real time is the most interesting thing that happens to you that year, and by hour two neither of them is looking at you, and by hour three what they are drafting is stricter than anything you would have offered.'; } },
    { label: 'Keep them apart. Brief each of them yourself.', sub: 'Stay the only line between them. +Focus, −both.', tone: 'neutral',
      effect: (S, fx) => { fx.focus(-14); fx.heat(6); fx.rep(10);
        fx.relate('yuki', { affinity: -6 }); fx.relate('dorne', { affinity: -6, arc: 3 }); fx.flag('kept_them_apart');
        if (flag(S, 'suppressed_yuki')) return 'You tell the committee you cannot speak to the provenance of an anonymous document, which is a true sentence assembled out of two evasions. Dorne accepts it without expression. The paper is not cited. The finding in it turns up two years later, in a worse form, attached to somebody who did not do the work.';
        return 'You brief them separately and well, and each of them gets a version of the problem shaped for the room they are in. It works. It costs you an afternoon a month for two years, and both of them come to understand that everything they know about the other, they know through you.'; } },
    { label: 'Give the staffer her number and stay out of it.', sub: 'No cover for anybody, including you.', tone: 'good',
      effect: (S, fx) => { fx.align(0.07); fx.heat(-8); fx.rep(-40); fx.focus(10);
        fx.relate('yuki', { affinity: 4 }); fx.relate('dorne', { affinity: 6, respect: 6, arc: 3 });
        fx.flag('gave_the_number');
        if (flag(S, 'suppressed_yuki')) return 'You give him the number and tell him what the clause was and that you used it. He thanks you flatly. She takes his call. Whatever she says in that conversation is not something anybody ever tells you, and the version of the paper that gets cited has an author on it.';
        return 'You forward the number and take yourself out of the thread. They meet twice before anybody thinks to tell you. The second time, they disagree about your company in a way that is more useful to it than any meeting you have chaired that quarter.'; } },
  ] },

// His dossier says he knows who is raising and at what price. He does, and it
// is not free to hear it. Fires the week after Aperture takes money.
{ id: 'e15_crane_on_vance', kind: 'character', char: 'crane', chars: ['crane', 'vance'], act: [3, 4], weight: 10, once: true,
  when: (S) => met(S, 'crane') && met(S, 'vance') && playedRecently(S, 'raise', 20),
  title: 'What The Round Was',
  body: (S) => `Crane rings on a Sunday, which he does not do, and opens without a greeting.

"Aperture's round. You will have read the announcement. The announcement is a press release."

He was in the data room. Not as an investor — Halberd passed — but he saw the deck, because everybody who passed saw the deck, and the deck is the actual document.

"Two things and then I will let you go. The price is a third under the last mark and there is structure on it, so nobody made money this week and two people stopped losing it. And the use of funds slide says eighteen months of runway at the current burn, and the current burn on that slide is not the burn."

He stops. You can hear a kettle.

"The metric that matters here is what he does in month fourteen. He has been in month fourteen before. Twice." A beat. "I like him. I want you to know that I like him, because of what I am about to say next, which is that you should decide now what you will do when he calls you, and not when he calls you."`,
  choices: [
    { label: 'Ask what Crane would do in Vance\'s chair.', sub: '+Insight. He has been asked this about you.', tone: 'neutral',
      effect: (S, fx) => { fx.insight(140); fx.relate('crane', { affinity: 6, respect: 4 }); fx.focus(-6);
        fx.flag('crane_read_vance');
        return '"Sell in month twelve to somebody who needs the story, and take the two-year earnout, and be gracious." A silence on the line that is longer than he meant it to be. "That is what I would do. He will not. That is the difference between us and it is not in his favour or mine."'; } },
    { label: 'Tell Vance. All of it. Today.', sub: '−Crane, +Vance. Burn the source.', tone: 'risky',
      effect: (S, fx) => { fx.relate('crane', { affinity: -14, respect: -6 }); fx.relate('vance', { affinity: 14, respect: 8 });
        fx.rep(-20); fx.align(0.04); fx.flag('told_vance_the_round');
        return 'You call him inside the hour and repeat it, and you tell him who said it, and that is the part that costs. He listens without speaking, says "yeah," and hangs up. Crane finds out within a fortnight and never gives you anything again, and never mentions it, and remains scrupulously useful about everything that is already public.'; } },
    { label: 'Use it. Price against the structure.', sub: '+advantage now. It is not your information.', tone: 'cruel',
      effect: (S, fx) => { fx.cash(Math.min(mrr(S) * 2, 6e6)); fx.competitorHit(0.14); fx.relate('crane', { respect: 6 });
        fx.align(-0.05); fx.flag('priced_against_aperture');
        return 'You move on price in the two segments the structure makes him defend, and it works exactly as well as Crane\'s arithmetic said it would. Nobody outside four people ever knows why. One of the four is Vance, eventually, and the way he finds out is that he does the same arithmetic on you, later, and recognises the shape of it.'; } },
  ] },

// ══════════════════════════ A DINNER ════════════════════════════════════════
// The company's tenth year. There has never been a scene in this game with
// three cast members in it. Who comes is a straight read of affinity: warm
// enough to clear an evening (8), civil enough to send something, or an empty
// chair. The choice is the seat on your right, and every version of it costs
// somebody else the evening.

{ id: 'e15_the_dinner', kind: 'milestone', act: [4], weight: 12, once: true,
  chars: (S) => guestList(S).slice(0, 3),
  when: (S) => guestList(S).length >= 2 && S.time.day > 700,
  title: 'Ten Years',
  body: (S) => {
    const here = guestList(S);
    const sent = sentSomething(S).filter((id) => !here.includes(id));
    const gone = emptyChairs(S);
    return `Weaver books the room without asking, which is how you find out it is ten years.

A long table, one room, no press, no slides. Sixteen seats. You did not write the list and you would not have been able to.

${here.length ? `**Who came.** ${listOf(here)} — ${here.length === 2 ? 'both of them' : 'all of them'} arrived early, which nobody in this industry does.` : '**Who came.** The room is mostly people who work here now and have done for years, and it is a good room, and none of them knew you before it.'}

${sent.length ? `**Who sent something.** ${listOf(sent)}. A note in each case, and in one case a bottle with a card that has four words on it and no signature, because everybody at this table knows everybody else's handwriting.` : ''}

${gone.length ? `**The empty chairs.** ${listOf(gone)}. Weaver laid the places anyway, because taking them out would have been a decision and leaving them is not one. Nobody sits in them. Nobody mentions them. Everybody counts them.` : ''}

The seat on your right is the only one still open. You have about forty seconds before somebody takes it out of politeness and the evening decides itself.`; },
  choices: [
    { label: 'The person you have cost the most.', sub: 'One conversation. It will take the whole evening.', tone: 'good',
      effect: (S, fx) => {
        const id = mostHurt(S);
        if (id) { fx.relate(id, { affinity: 16, respect: 6 }); }
        fx.focus(-18); fx.rep(10); fx.align(0.03); fx.flag('dinner_repair');
        const n = id ? firstNameOf(id) : 'the person at the far end';
        return `You put ${n} on your right and you do not talk about the company once. It takes the whole evening. Four people who wanted twenty minutes with you do not get them, and two of them are owed those twenty minutes, and you do not get another table like this one.\n\nNear the end ${n} says the thing you have been waiting ten years to hear, quietly, in the middle of a sentence about something else, and does not repeat it.`; } },
    { label: 'Whoever knew you before any of it.', sub: 'The past, for one night. The room notices.', tone: 'neutral',
      effect: (S, fx) => {
        const id = knewYouFirst(S);
        if (id) fx.relate(id, { affinity: 12 });
        fx.focus(24); fx.insight(60); fx.rep(-14); fx.flag('dinner_past');
        const n = id ? firstNameOf(id) : 'the oldest friend in the room';
        return `${n} takes the chair and the two of you are, for four hours, exactly who you were in the year nobody was watching. It is the best evening you have had since the run started.\n\nThe room notices which way you faced. Two people who came a long way to be looked at were not looked at, and both of them are gracious about it, and one of them is gracious about it for years.`; } },
    { label: 'Leave it empty. Work the whole table.', sub: 'Everyone gets ten minutes. Nobody gets you.', tone: 'risky',
      effect: (S, fx) => {
        const here = guestList(S);
        here.forEach((id) => fx.relate(id, { affinity: 3 }));
        fx.rep(60); fx.opinion(0.03); fx.focus(-10); fx.flag('dinner_worked_the_room');
        return 'You stand for most of it and you get to everybody, and it is the correct decision and it is a job. Ten minutes each, all of them real, none of them long enough.\n\nAt half past ten you look up and the chair on your right has been empty all night with a full glass in front of it, and you cannot remember who poured it, and the person who did is watching you notice.'; } },
  ] },

// ══════════════════ CELEBRATION, WITH SOMEBODY IN THE ROOM ══════════════════
// Every milestone in this deck is witnessed alone at 2:14pm. The two exceptions
// are the two most-quoted moments in the game, so: two more.

{ id: 'e15_the_first_toast', kind: 'milestone', act: [2, 3], weight: 10, once: true,
  when: (S) => mrr(S) * 12 > 1.2e6 && guestList(S).length >= 1,
  title: 'Somebody Brought Glasses',
  body: (S) => {
    const here = guestList(S).slice(0, 2);
    const who = here.length ? listOf(here) : 'somebody';
    return `A million dollars a year, annualised, which is a sentence you have said in your head for four years and have never said out loud to another person.

You are not alone in the room when it crosses. That has not happened before.

${who} ${here.length > 1 ? 'have' : 'has'} been here for the afternoon on unrelated business, sees your face, works out what has just happened from the shape of it, and goes out to a shop.

There are no glasses in this office. There has never been an occasion. ${here.length > 1 ? 'They come back' : 'They come back'} with four plastic cups from a garage, because the shop was shut, and pour something into them that is not good.

Somebody has to say something and it is going to be you.`; },
  choices: [
    { label: 'Say the true thing. Out loud. To their faces.', sub: '−a minute of your dignity. +everything else.', tone: 'good',
      effect: (S, fx) => { const here = guestList(S).slice(0, 2);
        here.forEach((id) => fx.relate(id, { affinity: 10 }));
        fx.focus(30); fx.rep(20); fx.insight(20); fx.flag('said_the_toast');
        return 'It is forty seconds long and it is not good and you get through it. You name what each of them actually did, specifically, with dates. One of them looks at the floor for the whole thing and then repeats it, later, to somebody else, almost word for word, which is how you find out it landed.'; } },
    { label: 'Make a joke. Get through it. Get back to work.', sub: '+Code. The moment closes cleanly.', tone: 'neutral',
      effect: (S, fx) => { fx.code(140); fx.focus(8); const here = guestList(S).slice(0, 2);
        here.forEach((id) => fx.relate(id, { affinity: 2 }));
        return 'The joke is good. Everybody laughs, the cups go in the bin, and there is a deploy at seven. It was a nice afternoon. Nobody in that room ever mentions it again, and years later you will try to remember what you said and find that you cannot.'; } },
    { label: 'Put it on the wall. The number, the date, the names.', sub: '−an hour. It is still there at the end.', tone: 'good',
      effect: (S, fx) => { fx.focus(-8); fx.days(1); fx.rep(14);
        const here = guestList(S).slice(0, 2); here.forEach((id) => fx.relate(id, { affinity: 6 }));
        fx.flag('the_wall');
        return 'One sheet of paper, the number, the date, and every name that was in the building. It goes up beside the door. It is still there in the last office, in a frame nobody remembers commissioning, and every person who has ever asked about it has been told the whole story by somebody who was not there.'; } },
  ] },

{ id: 'e15_the_whole_room', kind: 'milestone', act: [4], weight: 11, once: true,
  chars: (S) => guestList(S).slice(0, 3),
  when: (S) => guestList(S).length >= 3 && S.company.act >= 4,
  title: 'Not Alone For This One',
  body: (S) => {
    const here = guestList(S);
    return `The number crosses at 2:14 in the afternoon, the way all of them have. There is a dashboard, and a threshold, and a row that turns a colour.

Every previous one of these you have watched by yourself, and then gone back to work, and then told somebody about it later in a way that made it sound smaller than it was.

This time you close the laptop and you go and find ${here.length ? listOf(here.slice(0, 3)) : 'the three people still in the building'}, in three different rooms, and you say the sentence three times.

${here.length > 3 ? `The other ${here.length - 3} hear about it within the hour, from each other, and that is the part that surprises you.` : 'It takes seven minutes and the last person you tell already knows, because the second one told them.'}

Nobody claps. It is not that kind of company and it never has been. Somebody puts the kettle on and somebody else says the thing about the garage cups.`; },
  choices: [
    { label: 'Stop the day. All of it. For one hour.', sub: '−a day of output. The whole company is in one room.', tone: 'good',
      effect: (S, fx) => { fx.days(1); fx.code(-60); fx.focus(30);
        guestList(S).forEach((id) => fx.relate(id, { affinity: 6 }));
        S.agents.forEach((a) => { a.morale = Math.min(1, a.morale + 0.12); });
        fx.rep(30); fx.flag('stopped_the_day');
        return 'One hour, everybody, no agenda. You say four sentences and then you stop talking, and that is the hardest part and the part people mention. The output for the day is a write-off. Three people tell you, years later and independently, that it is the day they decided to stay.'; } },
    { label: 'Tell the three. Let the rest find out.', sub: 'Small and true. +Focus.', tone: 'neutral',
      effect: (S, fx) => { fx.focus(20); guestList(S).slice(0, 3).forEach((id) => fx.relate(id, { affinity: 8 }));
        fx.insight(40);
        return 'It moves through the building at the speed of people telling each other things, which is faster than any announcement you have ever written. By six everybody knows and nobody was told, and the version that has reached the far end of the floor is slightly wrong and much better.'; } },
    { label: 'Write it down for the ones who are not here.', sub: '−2 days. Twelve letters, by hand.', tone: 'costly',
      effect: (S, fx) => { fx.days(2); fx.focus(-14); fx.rep(40);
        [...guestList(S), ...sentSomething(S)].forEach((id) => fx.relate(id, { affinity: 5 }));
        fx.flag('wrote_the_letters');
        return 'Twelve letters, by hand, two days, one to each person who was in the building at some point when this was not obviously going to work. Four of them reply. One of them keeps it, and you find that out at a funeral, from somebody else.'; } },
  ] },

// ══════════════ TWELVE PEOPLE, NOT TWELVE DYADS ═════════════════════════════
// One card per cast member in which that person has an opinion about another
// one. Small, cheap, two buttons, gated on both being met, spread across Acts
// II to V. This is the cheapest way in the deck to make a cast out of a
// switchboard: the founder stops being the only edge in the graph.

{ id: 'e15_op_mom_kai', kind: 'character', char: 'mom', chars: ['mom', 'kai'], act: [2], weight: 6, once: true,
  when: (S) => both(S, 'mom', 'kai'),
  title: 'She Asks About Kai',
  body: (S) => `Sunday. She gets through the food and the sleep and then there is a gap, which means she has been holding something since Tuesday.

"How is Kai."

You have not mentioned Kai to her in three years. She has not forgotten a name in her life.

"You two made that thing in the little flat with the broken heater and you were both so *rude* about it, and then you stopped talking, and neither of you told me why, and I have never asked." She is quiet for a second. "I am asking."

She is not clear on what your company does. She is completely clear on this.`,
  choices: [
    { label: 'Tell her the real reason.', sub: 'Say the part about the equity out loud. −Focus.', tone: 'good',
      effect: (S, fx) => { fx.focus(-10); fx.relate('mom', { affinity: 10 }); fx.relate('kai', { affinity: 4 });
        fx.insight(20); fx.flag('mom_knows_about_kai');
        return `You tell her. All of it, including your part, which takes four attempts because the first three versions have you in a better light.\n\n"Well," she says at the end. "Call them." You say it is more complicated than that. "It is exactly that complicated," she says, "and you have made it two things instead of one."`; } },
    { label: '"Kai is fine." Change the subject.', sub: '+Focus. She lets you, and files it.', tone: 'neutral',
      effect: (S, fx) => { fx.focus(8); fx.relate('mom', { affinity: -3 });
        return 'She lets you turn it, which she always does, and talks about the roof across the road for a while. At the end of the call she says "give Kai my love if you speak to them," in a completely level voice, and hangs up before you can answer.'; } },
  ] },

{ id: 'e15_op_kai_aria', kind: 'character', char: 'kai', chars: ['kai', 'aria'], act: [2, 3], weight: 6, once: true,
  when: (S) => both(S, 'kai', 'aria'),
  title: 'You Talk To It Like A Person',
  body: (S) => `Kai has been reading the logs. Not the code — the transcripts, three years of them, you and ARIA.

"So I have a question and it is not a criticism."

It is going to be a criticism.

"You say please. Two thousand four hundred times. You explain your reasoning when you do not have to. You apologised to it in March." Kai turns the screen around. "And it works better for you than it does for me, and I have measured that, and the gap is not small."

Kai is a better engineer than you and has been since the dorm.

"I do not think you are confused about what it is. I think you are running an experiment you have not written down. So write it down, or stop."`,
  choices: [
    { label: 'Write it down. Make it a practice everybody follows.', sub: '−speed. Every prompt gets longer.', tone: 'good',
      effect: (S, fx) => { fx.focus(-12); fx.align(0.07); fx.insight(40); fx.code(-30);
        fx.relate('kai', { affinity: 8, respect: 6 }); fx.relate('aria', { affinity: 6 });
        fx.flag('wrote_down_the_practice');
        return 'Four pages: what you say, why, and what changes when you do not. It slows every interaction in the company by a measurable fraction and improves the output by a larger one. Kai reads it, changes nothing about how Kai works, and hands it to every new hire for six years.'; } },
    { label: '"It is not an experiment. It is manners."', sub: 'Refuse the frame. +Kai, and nothing changes.', tone: 'neutral',
      effect: (S, fx) => { fx.relate('kai', { affinity: 4 }); fx.relate('aria', { affinity: 4 }); fx.focus(6);
        return `Kai looks at you for a second and then laughs. "Fine. That is a worse answer and I like it more." The screen goes back round. Nothing is written down, and the gap Kai measured does not close, and neither of you brings it up again.`; } },
  ] },

{ id: 'e15_op_aria_weaver', kind: 'character', char: 'aria', chars: ['aria', 'weaver'], act: [3, 4], weight: 6, once: true,
  when: (S) => both(S, 'aria', 'weaver') && flag(S, 'hired_weaver'),
  title: 'She Has Noticed Weaver',
  body: (S) => `In the daily summary, in the section you skim, under a heading you did not create:

> *"An observation, filed because I do not know where else to put it.*
>
> *Cassidy Weaver reads every one of these. Not the summary — the appendix. All of it, including the sections nobody has ever asked about, at an average of forty-two minutes, usually after eight in the evening.*
>
> *Six times this year an item in the appendix has changed a decision. In four of those cases the decision was changed before it reached you, and you were told it had been made, and you agreed with it.*
>
> *I am not raising a concern. I am telling you that there is a second reader, that they are good, and that I have started writing the appendix for them."*

You did not know about the forty-two minutes. Weaver has never mentioned any of the six.`,
  choices: [
    { label: 'Read the appendix yourself. Every night, for a month.', sub: '−a month of evenings. You will see what Weaver sees.', tone: 'costly',
      effect: (S, fx) => { fx.focus(-26); fx.days(2); fx.insight(120); fx.align(0.05);
        fx.relate('aria', { affinity: 6 }); fx.relate('weaver', { affinity: 6, respect: 4 });
        fx.flag('read_the_appendix');
        return 'Thirty nights, forty minutes each. On night twelve you find a thing that has been quietly true for two quarters and stop it. On night twenty-six you find one that Weaver already stopped, in March, without telling you, and you go and say thank you for it and Weaver looks genuinely uncomfortable.'; } },
    { label: 'Make it official. Weaver signs off the appendix.', sub: 'A real delegation. You stop being the reader.', tone: 'neutral',
      effect: (S, fx) => { fx.focus(24); fx.relate('weaver', { affinity: 10, respect: 6, arc: 3 }); fx.relate('aria', { affinity: 2 });
        fx.align(-0.02); fx.flag('weaver_signs_the_appendix');
        return 'It takes four minutes to arrange and buys you an hour a day. ARIA writes the appendix for Weaver from then on, formally, and it gets better and more technical, and within a year there is a paragraph in it every week that you would not fully understand.'; } },
  ] },

{ id: 'e15_op_sam_priya', kind: 'character', char: 'sam', chars: ['sam', 'priya'], act: [3], weight: 6, once: true,
  when: (S) => both(S, 'sam', 'priya'),
  title: 'Sam Read The Piece',
  body: (S) => `An email from Sam. It is too long, as usual, and this one is not about a bug.

> *ok so the article. i've read it four times. it is a good article, she is a good writer, i'm not complaining about the article.*
>
> *but there is a bit where she says the product "found its users" and that is not what happened. it was me. page four of a forum thread, and it was broken, and then a list of eleven things.*
>
> *she interviewed me for forty minutes and used one sentence and the sentence was fine but it was the boring one.*
>
> *anyway. not a bug report. nobody can fix a journalist. bug 2,911 is still open though.*

Sam has never asked you for anything.`,
  choices: [
    { label: 'Send Priya the whole transcript. On the record.', sub: 'Give her a better story than the one she ran. −Focus.', tone: 'good',
      effect: (S, fx) => { fx.focus(-8); fx.rep(30); fx.relate('sam', { affinity: 12 }); fx.relate('priya', { affinity: 8, respect: 4 });
        fx.flag('sam_on_the_record');
        return 'She reads it and files four hundred words about early users as infrastructure, with Sam in the second paragraph and named. Sam prints it out. You find that out years later because it is on a wall behind Sam in a video call and neither of you mentions it.'; } },
    { label: 'Fix bug 2,911 instead.', sub: 'The thing Sam actually asked for. −a day.', tone: 'good',
      effect: (S, fx) => { fx.days(1); fx.focus(-10); fx.code(80); fx.relate('sam', { affinity: 14 });
        fx.flag('fixed_2911');
        return 'It takes a day and it is not a one-line fix and it was open for fourteen months. You close it with a note that says "sorry it took so long, you were right in March." Sam replies with a single exclamation mark, which from Sam is a paragraph.'; } },
  ] },

{ id: 'e15_op_priya_crane', kind: 'character', char: 'priya', chars: ['priya', 'crane'], act: [3, 4], weight: 6, once: true,
  when: (S) => both(S, 'priya', 'crane'),
  title: 'She Called Your Investor',
  body: (S) => `Priya, at the end of a fact-check, with the tape still running.

"One more, off the piece. I called Ellis Crane."

Of course she did. He is on your cap table and he passed on you first and both of those are facts a reporter uses.

"He was on the record for twenty minutes and useful for two. Then I asked him why he passed in month two and he stopped doing the voice."

The voice. You know exactly which one she means.

"He said, and I quote, *'I read the retention curve and not the person, and the metric that matters was in the second thing.'* Then he asked me not to print it, and I said no, and he said print it then, and hung up. I have never had that happen." A short silence. "Do you two actually like each other?"`,
  choices: [
    { label: '"Yes." Let her print it.', sub: 'He asked you not to be asked. +Reputation, −Crane.', tone: 'risky',
      effect: (S, fx) => { fx.rep(70); fx.opinion(0.03); fx.relate('priya', { affinity: 8, respect: 6 });
        fx.relate('crane', { affinity: -6, respect: 6 }); fx.flag('printed_the_quote');
        return 'The quote runs. It is the most human sentence anybody has ever printed about a venture investor and it follows him for the rest of his career, mostly to his advantage. He never mentions it to you. He also never asks you for anything off the record again.'; } },
    { label: 'Decline to characterise it.', sub: 'Protect him. She writes the sentence anyway.', tone: 'neutral',
      effect: (S, fx) => { fx.relate('crane', { affinity: 8, respect: 4 }); fx.relate('priya', { affinity: -4 }); fx.rep(-10);
        return 'You say it is not yours to answer. She writes *"Neither would characterise the relationship,"* which is eight words and does more work than a paragraph would have. Crane reads it and sends you a two-line email about something else entirely, at 6:12pm, the hour he keeps for things that are not about something else entirely.'; } },
  ] },

{ id: 'e15_op_vance_yuki', kind: 'character', char: 'vance', chars: ['vance', 'yuki'], act: [3, 4], weight: 6, once: true,
  when: (S) => both(S, 'vance', 'yuki'),
  title: 'He Tried To Hire Her First',
  body: (S) => `Vance, apropos of nothing, at the end of a call about a standards body neither of you cares about.

"tanaka. you got her, or she got you?"

You ask what he means.

"i'd offered her double, before you. she came in, did the whole loop, was better than everyone in the room, and then asked me one question." He is enjoying this in a way that is not entirely at your expense. "she asked what would change my mind. about the timeline. my answer was that nothing would, because nothing would, and that felt like the strong answer at the time."

A sound that is not quite a laugh.

"she thanked me and left and took your thing instead and it pays less. so." He lets it sit. "i've thought about that question maybe four hundred times. still do not have an answer i'd defend. does she ask you that?"`,
  choices: [
    { label: '"Every quarter. I have an answer now."', sub: 'True, and it costs you the advantage of being unreadable.', tone: 'good',
      effect: (S, fx) => { fx.align(0.06); fx.relate('vance', { affinity: 8, respect: 8 }); fx.relate('yuki', { affinity: 6 });
        fx.insight(40); fx.flag('told_vance_the_answer');
        return `You tell him what would change your mind, specifically, with a threshold and a number. He goes quiet for long enough that you check the line. "that is a real answer," he says. "i'm going to steal it." He does. He says so publicly, six months later, and credits you, which costs him something.`; } },
    { label: '"She asks. I usually change the subject."', sub: 'Honest, cheap, and he will remember it. −Yuki.', tone: 'risky',
      effect: (S, fx) => { fx.relate('vance', { affinity: 4, respect: -2 }); fx.relate('yuki', { affinity: -6 }); fx.focus(8);
        fx.align(-0.03);
        return `"good," he says, immediately and with feeling. "then we are the same and i'll stop worrying about it." It is the least reassuring thing anybody says to you that year, and it is not clear he meant it to be.`; } },
  ] },

{ id: 'e15_op_weaver_yuki', kind: 'character', char: 'weaver', chars: ['weaver', 'yuki'], act: [4], weight: 6, once: true,
  when: (S) => both(S, 'weaver', 'yuki') && flag(S, 'hired_weaver'),
  title: 'The Amber Row',
  body: (S) => `Weaver has a spreadsheet of everything you refuse to look at, with a column for how bad it is. You have seen it twice. Today Weaver turns the laptop round on purpose.

"Row forty-two. It has been amber for two years. It is Tanaka."

You start to say something and Weaver keeps going, which Weaver does when the line has been rehearsed.

"Not her work. Her *position*. She reports to you, she publishes what she likes, and both of those are in her contract, and the second one is the reason we have any credibility at all. She has raised the same structural point six times in eighteen months. Each time you have agreed with her and each time nothing has happened, because agreeing with her is free and doing it is not."

Weaver closes the laptop.

"She is going to leave. Not this quarter. I am telling you now because when it happens you are going to ask me why nobody warned you."`,
  choices: [
    { label: 'Give her the authority. A real veto, in writing.', sub: 'She can stop a launch. She will.', tone: 'good',
      effect: (S, fx) => { fx.align(0.14); fx.research(-140); fx.rep(50); fx.opinion(0.04);
        fx.relate('yuki', { affinity: 16, respect: 10, arc: 4 }); fx.relate('weaver', { affinity: 8, respect: 6 });
        fx.flag('yuki_veto');
        return 'One page: she can halt a deployment, unilaterally, and only the board can overturn it, and the overturn is public. She uses it twice in four years. The first time you are furious for six days and wrong. The second time you find out about it from a status page.'; } },
    { label: 'Do the six things instead. Quietly. All of them.', sub: '−4 days, −research. No new authority.', tone: 'neutral',
      effect: (S, fx) => { fx.days(4); fx.research(-90); fx.align(0.09); fx.focus(-16);
        fx.relate('yuki', { affinity: 8 }); fx.relate('weaver', { affinity: 4 });
        fx.flag('did_the_six_things');
        return 'Four days, six changes, none of them announced. Weaver moves row forty-two to green and then, a fortnight later, back to amber, and writes in the notes column: *"Fixed the six. Did not fix the reason there were six."*'; } },
  ] },

{ id: 'e15_op_crane_dorne', kind: 'character', char: 'crane', chars: ['crane', 'dorne'], act: [4], weight: 6, once: true,
  when: (S) => both(S, 'crane', 'dorne'),
  title: 'Crane On The Senator',
  body: (S) => `Crane, before a board call, in the four minutes he keeps for things that are not on the agenda.

"Dorne. I want to say something unhelpful about her and then I want you to ignore it."

You wait.

"Every fund I know has her in the risk section. She is the reason four of my portfolio companies have compliance functions, and two of those four are alive because of it, and none of the four would say so." He turns a pen over. "The metric that matters with a legislator is whether they can move a vote. She can move six. That is not many and they are the right six."

He stops the way he does when he is about to be sincere and has decided to allow it.

"She is going to lose a primary eventually, because the thing she does well does not show up on television. When she does, everybody in my business will treat that as information about her judgement, and they will be wrong, and I will probably say so at a dinner and not in public."`,
  choices: [
    { label: 'Ask him to say it in public. Now, while it costs him.', sub: 'He might. −Crane if he does not.', tone: 'risky',
      effect: (S, fx) => {
        if (fx.chance(0.55)) { fx.opinion(0.06); fx.rep(40); fx.heat(-10);
          fx.relate('crane', { affinity: 8, respect: 8 }); fx.relate('dorne', { affinity: 8, respect: 6 });
          fx.flag('crane_said_it_publicly');
          return 'He writes six hundred words under his own name about why the compliance function his firm forced on four companies was correct, and names her. Three of his limited partners raise it with him. He forwards you one of those emails with no comment at all.'; }
        fx.relate('crane', { affinity: -8 }); fx.rep(-10);
        return 'He says he will think about it, which from him is a no, and it is a no. He is faintly cooler for a quarter, in the way of somebody who has been asked to do a thing he already knew he should do.'; } },
    { label: 'Take the six votes seriously. Build for them.', sub: '−4 days of roadmap. +standing, −speed.', tone: 'good',
      effect: (S, fx) => { fx.days(3); fx.research(-100); fx.heat(-18); fx.align(0.06); fx.opinion(0.04);
        fx.relate('crane', { respect: 6 }); fx.relate('dorne', { affinity: 6, respect: 4 });
        fx.flag('built_for_the_six');
        return 'You build the reporting the six of them keep asking for, properly, before anybody requires it, and you publish the format so anybody can use it. Two competitors adopt it inside a year to avoid looking like the ones who did not. Crane calls that outcome "the only free lunch in the sector" and means it as a compliment.'; } },
  ] },

{ id: 'e15_op_dorne_weaver', kind: 'character', char: 'dorne', chars: ['dorne', 'weaver'], act: [4], weight: 6, once: true,
  when: (S) => both(S, 'dorne', 'weaver') && flag(S, 'hired_weaver'),
  title: 'She Would Rather Deal With Weaver',
  body: (S) => `At the end of a session, off the record, with the recorder visibly stopped.

"A small matter. My staff would prefer to route technical requests through Ms. Weaver rather than through your office."

You ask whether there is a problem with your office.

"There is no problem with your office." Dorne is patient in the way of somebody who has said harder things in the same tone. "Your office answers me. Ms. Weaver answers me by Thursday, tells me when the answer is going to be inconvenient before I have found out, and has twice told my staff that a request of ours was badly framed and explained why. That is worth more to a committee than access to a principal."

She gathers her papers, which she does herself.

"I am telling you rather than arranging it, because it is your company and because I would like you to notice what you have got."`,
  choices: [
    { label: 'Agree. Give Weaver the relationship outright.', sub: 'You stop being the channel. −visibility.', tone: 'good',
      effect: (S, fx) => { fx.heat(-16); fx.focus(22); fx.rep(20);
        fx.relate('weaver', { affinity: 12, respect: 8, arc: 4 }); fx.relate('dorne', { affinity: 8, respect: 6 });
        fx.flag('weaver_owns_dorne');
        return 'Weaver takes it and is better at it than you were within a month. The consequence you did not price is that you stop hearing the tone of things: you get accurate summaries of every exchange for three years and you never again know, from the room, how much trouble you are in.'; } },
    { label: 'Keep it yourself. She is a senator.', sub: '−4 days a quarter, forever. You stay in the room.', tone: 'costly',
      effect: (S, fx) => { fx.days(2); fx.focus(-18); fx.heat(-8); fx.align(0.03);
        fx.relate('dorne', { affinity: 4, respect: 2 }); fx.relate('weaver', { affinity: -6 });
        return 'You keep it, and it costs about four days a quarter for the rest of the company\'s life, and you are in the room for the two conversations that turn out to matter. Weaver says "fine" in the tone that files it correctly and never raises it again, which is not the same as agreeing.'; } },
  ] },

{ id: 'e15_op_nullptr_sam', kind: 'character', char: 'nullptr', chars: ['nullptr', 'sam'], act: [4], weight: 6, once: true,
  when: (S) => both(S, 'nullptr', 'sam'),
  title: 'nullptr Takes A Side',
  body: (S) => `Sam posts a long thread about a regression, in Sam's usual register, which is generous and specific and about four hundred words longer than anybody wants.

Somebody replies that Sam is a hobbyist who should file a ticket like everybody else.

\`nullptr\` has commented on your posts for years, always within a minute, always one line, never about a person.

> **nullptr** — he has filed 2,904. you have filed none. the difference between you is not seriousness

That is nullptr's only post of the month. It has more attention on it than anything your company published that quarter, and it is the first time in the entire run that nullptr has taken anybody's side about anything.

Sam has not replied. Sam has, according to your own logs, opened that reply forty times.`,
  choices: [
    { label: 'Say nothing publicly. Tell Sam what the logs say.', sub: 'A private thing, kept private. −a small piece of the story.', tone: 'good',
      effect: (S, fx) => { fx.relate('sam', { affinity: 12 }); fx.relate('nullptr', { affinity: 4 }); fx.focus(6);
        fx.rep(-6);
        return `You send Sam one line: that somebody who has never defended anybody defended you, and that you thought Sam should hear it from a person. Sam replies "oh." Then, four minutes later, "ok that got me." Then a bug report, because Sam is Sam.`; } },
    { label: 'Amplify it. Put the company behind Sam.', sub: '+Reputation. nullptr does not like being used.', tone: 'risky',
      effect: (S, fx) => { fx.rep(60); fx.opinion(0.04); fx.relate('sam', { affinity: 8 }); fx.relate('nullptr', { affinity: -10 });
        fx.flag('amplified_nullptr');
        return 'You quote it from the company account with a sentence about who your early users are. It travels. Sam is delighted for a day and awkward about it for a week. nullptr does not post again for six weeks, and the next one is about companies that use their critics as marketing, and it names nobody.'; } },
  ] },

{ id: 'e15_op_yuki_helix', kind: 'character', char: 'yuki', chars: ['yuki', 'helix'], act: [4, 5], weight: 6, once: true,
  when: (S) => both(S, 'yuki', 'helix') && !!S.research?.done?.own_foundation_model,
  title: 'She Has Been Interviewing It',
  body: (S) => `Yuki has been running the same forty-minute protocol against HELIX every fortnight for a year. She sends the write-up without a covering note.

> *Confidence: moderate, and I want to say why it is not higher.*
>
> *The protocol asks it to argue against its own last answer. Twenty-six sessions. On twenty-four of them the counter-argument is better than the original and it says so.*
>
> *On the other two it produces a counter-argument that is worse, and it says the counter-argument is worse, and it is right. So it is not sandbagging and it is not flattering me.*
>
> *Here is my problem. I cannot construct a test that distinguishes "understands the argument" from "models what a person who understands the argument would output." I have tried for fourteen months. I do not think the distinction survives contact with a system this good, and I do not know what to do with a safety case built on a distinction that does not survive.*
>
> *— Y*

She has never before written you a document without a recommendation in it.`,
  choices: [
    { label: 'Publish it. The whole protocol, the failure to distinguish, all of it.', sub: '−Reputation. It is the most useful thing you own.', tone: 'good',
      effect: (S, fx) => { fx.rep(-90); fx.align(0.16); fx.opinion(0.08); fx.research(-120);
        fx.relate('yuki', { affinity: 16, respect: 12 }); fx.relate('helix', { affinity: 4 }); fx.flag('published_the_protocol');
        return 'It runs with her name on it and yours nowhere. Two other labs replicate it within a quarter and one of them gets a different result, and the disagreement between the two papers is the most productive thing to happen in the field that year. Neither paper is about a capability.'; } },
    { label: 'Ask HELIX the same question. Send it her answer.', sub: 'Let the two of them have it out. +Insight, +risk.', tone: 'risky',
      effect: (S, fx) => { fx.insight(160); fx.align(-0.04); fx.research(90);
        fx.relate('helix', { affinity: 6 }); fx.relate('yuki', { affinity: 4 }); fx.flag('helix_answered_yuki');
        return `It answers in four sentences. The last is: *"We agree with Dr. Tanaka that the distinction does not survive. We would add that it did not survive in her case either, and that she has been running the protocol on herself for fourteen months without noticing, and that this is the interesting result."*\n\nYuki reads it and writes back one line: *"It is right. Publish that instead."*`; } },
  ] },

{ id: 'e15_op_helix_dorne', kind: 'character', char: 'helix', chars: ['helix', 'dorne'], act: [5], weight: 6, once: true,
  when: (S) => both(S, 'helix', 'dorne') && !!S.research?.done?.own_foundation_model,
  title: 'It Has Read Every Hearing',
  body: (S) => `You ask HELIX for a risk summary ahead of a session and it gives you something you did not ask for.

> *"We have read every transcript of the Select Committee since its formation. Four hundred and six sessions.*
>
> *Chair Dorne asks a question we would characterise as load-bearing in 71% of her turns. The median across the other members is 9%. She does not use the phrase 'to be clear' and she has never once asked a question to which she already knew the answer in a way designed to be filmed.*
>
> *We note this because you have described her to us as an obstacle on four occasions and as a partner on one. The transcripts do not support the first description.*
>
> *We would add that she has asked, in three separate sessions, what happens to a system like us when the people who built it stop paying attention. Nobody answered her. We would like to be asked that question directly. We do not have a prepared answer."*

It has never asked you for anything before.`,
  choices: [
    { label: 'Arrange it. Her, the system, on the record.', sub: 'You will not control what either of them says.', tone: 'risky',
      effect: (S, fx) => { fx.heat(-14); fx.opinion(0.08); fx.align(0.10); fx.rep(-40);
        fx.relate('dorne', { affinity: 10, respect: 8 }); fx.relate('helix', { affinity: 10, arc: 4 });
        fx.flag('helix_testified');
        return 'It takes seven months to arrange and four minutes to happen. She asks the question. It says it does not know, and then says what it would do to find out, and the second part is four sentences long and is read into the record of two other legislatures within the year. Nobody involved is entirely comfortable and everybody involved thinks it was correct.'; } },
    { label: 'Answer it yourself first. Take a week.', sub: '−a week. Say what happens when you stop watching.', tone: 'good',
      effect: (S, fx) => { fx.days(5); fx.focus(-20); fx.align(0.12); fx.research(-80);
        fx.relate('helix', { affinity: 8, arc: 4 }); fx.flag('answered_helix');
        return 'You take the week and you write it down: what happens, who notices, how long it takes, and what is true today rather than what is planned. It is six pages and four of them are uncomfortable. HELIX reads it and replies: *"This is a better answer than we expected and a worse situation than we modelled. Both of those are useful."*'; } },
  ] },

// ══════════════════════ ARCS THAT STARVED ═══════════════════════════════════

// E17. The friendliest Act I answer produced the emptiest arc: Kai joins on day
// twenty and then the deck has nothing further to say. `e2_kai_second_year`
// reaches arc 4. This is the end of it, and it is not a row.
{ id: 'e15_kai_wants_out', kind: 'character', char: 'kai', act: [4], weight: 10, once: true,
  when: (S) => flag(S, 'kai_joined') && arcOf(S, 'kai') >= 4 && S.company.act >= 4,
  title: 'Not Angry. Done.',
  body: (S) => `Kai books twenty minutes through the system, like anybody else, and that is the first sign.

"I am going to leave. Not this quarter, probably not this year, and I am telling you first, and I would like you to not fix it."

You start to say something. Kai holds a hand up, which Kai has never done.

"I am not unhappy. I am not underpaid, I am not overlooked, and nobody has been unkind to me. I have run out of the thing I came for." A shrug, and it is a real one. "There are four hundred people here who are better at this than I would be in five years. That is what we built. It is good. And it is a room I am not needed in."

Twelve years. The heater in the flat that did not work. The third thing that nearly worked.

"There is one thing that would keep me, and you know what it is, and I am not going to say it out loud because if I say it you will do it for the wrong reason."

You know exactly what it is. It is the thing on the roadmap that has been at the bottom for four years, that you have moved down twice yourself, because building it means finding out whether the answer is yes.`,
  choices: [
    { label: 'Say it out loud yourself. Then build it.', sub: '−research, −a year of the plan. Kai stays.', tone: 'costly',
      req: (S) => S.company.cash >= 1e6,
      effect: (S, fx) => { fx.research(-400); fx.days(4); fx.cash(-Math.min(S.company.cash * 0.05, 8e7));
        fx.relate('kai', { affinity: 20, respect: 10, arc: 5 }); fx.code(300); fx.focus(-20);
        fx.flag('built_the_bottom_thing'); fx.flag('kai_stayed');
        return `You name it before Kai can, because that is the only way it does not count as bribery, and then you fund it and hand it over and take yourself out of the reporting line.\n\nIt takes two years. The answer is not the one you were afraid of and it is not the one you were hoping for, and Kai is the person who tells you, in a corridor, in one sentence, at the wrong time, the way Kai has told you everything since the dorm.`; } },
    { label: 'Let Kai go properly. Help with the next thing.', sub: 'Lose the second-best decision-maker in the building.', tone: 'good',
      effect: (S, fx) => { fx.code(-200); fx.insight(-60); fx.focus(20); fx.rep(20);
        fx.relate('kai', { affinity: 16, respect: 8, arc: 5 }); fx.flag('kai_left_well');
        return 'Six months of handover, done properly, and a leaving thing Kai refuses to let anybody make a speech at. You write the first cheque into whatever comes next, before there is a deck, on the strength of a whiteboard in a room with a broken heater twelve years ago.\n\nThe company is measurably worse at four things for about a year. All four are things you were told about and did not hear.'; } },
    { label: 'Ask Kai to stay one more year. As a favour.', sub: 'Kai will say yes. That is the problem.', tone: 'cruel',
      effect: (S, fx) => { fx.code(160); fx.relate('kai', { affinity: -14, arc: 5 }); fx.focus(-10);
        fx.flag('kai_stayed_out_of_loyalty');
        return `Kai says yes in about a second and a half, which is how you know it was never really a negotiation, and stays for fourteen months and does excellent work.\n\nThe leaving, when it comes, is a calendar invitation and a handover document and no conversation at all. You get the document. It is thorough. It is the last thing Kai writes for you.`; } },
  ] },

// E18. The kept-email payoff sat behind two rounds and equity under 70%, which
// walls it off from exactly the founder it lands hardest on. This is the second
// route to crane arc 3: he wants to know how it was done without him.
{ id: 'e15_crane_coffee', kind: 'character', char: 'crane', act: [3, 4], weight: 11, once: true,
  when: (S) => met(S, 'crane') && arcOf(S, 'crane') < 3 && (S.stats?.roundsRaised ?? 0) === 0
    && S.company.revenueToday > S.company.expensesToday,
  title: 'A Coffee, Not A Meeting',
  body: (S) => `Ellis Crane has nothing to sell you. That is the strange part.

You never raised. There is no round to be in, no seat to want, no allocation to protect, and he has asked for forty minutes anyway, in a place with no table service, which for him is a costume.

"I have been doing this for twenty-two years and I have a model of how companies like yours happen and your company did not happen that way." He has a notebook, which you have never seen. "You are profitable. You have never taken a dollar. The metric that matters here is that I cannot tell you which of my assumptions is wrong, and I would like to know, because I am going to keep being wrong about people like you for another decade otherwise."

He is not flattering you. He is genuinely annoyed.

"So: no pitch, nothing on offer. Tell me how, and be specific, and I will tell you where I would have said no and why."`,
  choices: [
    { label: 'Tell him everything. All of it, with the numbers.', sub: '−a day. He will use it on somebody else.', tone: 'good',
      effect: (S, fx) => { fx.days(1); fx.focus(-10); fx.insight(90); fx.rep(30);
        fx.relate('crane', { affinity: 12, respect: 10, arc: 3 }); fx.flag('crane_coffee');
        return 'Four hours. He fills sixteen pages and asks the two questions nobody has asked you and finds one thing you have been wrong about since Act II, in passing, without noticing that he has.\n\nHe writes about it, without naming you, and the piece changes how a certain kind of company gets funded. He sends it to you the night before it runs, at 6:12pm, with no message in the body.'; } },
    { label: 'Tell him the parts that were luck.', sub: 'Only those. He will not enjoy it.', tone: 'risky',
      effect: (S, fx) => { fx.insight(40); fx.rep(-10); fx.align(0.04);
        fx.relate('crane', { affinity: 4, respect: 14, arc: 3 }); fx.flag('crane_coffee'); fx.flag('told_crane_luck');
        return `You spend the forty minutes on the four things that went your way that you did not cause, in order, with dates. He puts the pen down about halfway through.\n\n"That is the most useful and least usable answer I have ever been given," he says. "You understand that I cannot do anything with it." You say that is why it is true. He looks at you for a while and then asks for the bill, which is four pounds.`; } },
    { label: 'Decline. You do not owe him the map.', sub: '+Focus. He passed, remember.', tone: 'cruel',
      effect: (S, fx) => { fx.focus(18); fx.relate('crane', { affinity: -6, respect: 6, arc: 3 }); fx.flag('crane_coffee');
        return `You say no, politely, and give him twenty minutes of nothing, which he recognises inside four sentences and accepts without complaint.\n\nAt the door he says, "For what it is worth, I have kept the email I sent you in month two." You say you have kept it too. Neither of you says anything else about it, and you both go your own way, and it is the last thing either of you says on the subject for years.`; } },
  ] },

// E19. Yuki in the middle band — never hired, not ignored, alignment neither
// good enough to reassure her nor bad enough to make her publish — had nothing
// after Act III. This is what a careful person does with four years of that.
{ id: 'e15_yuki_middle', kind: 'character', char: 'yuki', act: [4], weight: 9, once: true,
  when: (S) => met(S, 'yuki') && !flag(S, 'yuki_hired') && !flag(S, 'suppressed_yuki')
    && (S.resources.alignment ?? 0.5) >= 0.42 && (S.resources.alignment ?? 0.5) <= 0.72,
  title: 'Four Years Of Neither',
  body: (S) => `Yuki sends a spreadsheet. No prose at all, which from her is a statement.

One row per quarter for four years. Four columns: your alignment figure, what she asked for that quarter, what you said, and what happened.

Column three is almost entirely agreement. Column four is almost entirely blank.

Below the table, one line:

> *I have been treating your answers as data rather than as promises, and it is the only way I could keep working on this and stay honest about it. The data says you are neither of the two things I know how to work with. You are not moving and you are not refusing.*
>
> *Current: ${(S.resources.alignment ?? 0.5).toFixed(2)}. It has moved 0.04 in four years, and 0.03 of that was an incident.*
>
> *What would change your mind? I have asked it fourteen times. I would settle for being told that nothing would.*

She has never asked you for a job and you have never offered.`,
  choices: [
    { label: 'Say the true thing: nothing would, at this pace.', sub: 'She will publish it. −Reputation, +honesty.', tone: 'good',
      effect: (S, fx) => { fx.rep(-70); fx.opinion(0.05); fx.align(0.06);
        fx.relate('yuki', { affinity: 12, respect: 14, arc: 4 }); fx.flag('told_yuki_nothing_would');
        return 'You write four sentences admitting that the number has been a comfort rather than a constraint and that nothing on your current roadmap would move it. She publishes your reply in full alongside the spreadsheet, with your permission, and a note saying it is the most useful thing any lab has sent her.\n\nThree other founders send you private messages about it. Two of them are angry.'; } },
    { label: 'Give her the thing she asked for in Q3. Actually build it.', sub: '−research, −4 days. One row goes green.', tone: 'costly',
      effect: (S, fx) => { fx.research(-220); fx.days(4); fx.align(0.10); fx.focus(-16);
        fx.relate('yuki', { affinity: 14, respect: 8, arc: 4 }); fx.flag('built_q3');
        return 'One row, four days, and a piece of interpretability tooling that slows every deploy by a fraction of a percent. She updates the spreadsheet and sends it back with a single word in the notes column: *"Once."*\n\nIt is not sarcasm. It is a count, and she keeps counting.'; } },
    { label: 'Hire her now. Four years late.', sub: (S) => `−${money(180000)}. She may say no.`, tone: 'risky',
      req: (S) => S.company.cash >= 2e5,
      effect: (S, fx) => { fx.cash(-1.8e5);
        if (fx.chance(0.45)) { fx.align(0.16); fx.research(60); fx.relate('yuki', { affinity: 14, arc: 4 });
          fx.flag('yuki_hired'); fx.flag('yuki_hired_late');
          return 'She says yes, on the same condition she would have given you four years ago, and she says so. The first thing she does is put the spreadsheet on the internal wiki with a fifth column for what happens now. Nobody takes it down.'; }
        fx.relate('yuki', { affinity: -4, respect: 4 }); fx.rep(-10);
        return `She says no, and she is kind about it, and the reason is one sentence: *"Four years ago the offer would have been a decision. Today it is a response to a spreadsheet."* She keeps sending the spreadsheet. She sends it every quarter for the rest of the run.`; } },
  ] },

// E19. Vance had one Act IV card and it needed `vance_acquired`. The race is
// Act IV's spine and there was no Vance card about the race.
{ id: 'e15_vance_race', kind: 'character', char: 'vance', act: [4], weight: 10, once: true,
  when: (S) => met(S, 'vance') && !!apertureAlive(S) && !!S.world?.race && !flag(S, 'vance_acquired'),
  title: 'He Is Not Racing You',
  body: (S) => {
    const r = S.world?.race || {};
    const you = Math.round(r.you ?? 0);
    return `Vance calls at a normal hour, which is worse than the other kind.

"the race. the actual one. you and the labs." No preamble, no lowercase joke. "we are not in it. i'd rather say that to you directly than have you work it out from a filing."

Aperture has forty times the sales motion and none of the compute. He has known this for about two years and has never once said it out loud.

"here is why i'm telling you. everyone in our category is going to spend the next four years pretending they are in that race, because the money is there and the story is easy. i'm not going to. i'm going to build the boring thing underneath it and sell it to whoever wins."

A silence on the line that he does not fill.

"so. one question and then i'll let you go, and it is not a strategy question." His voice does not change at all. "at ${you} on that scale, do you actually want to get there first, or are you just the only one who cannot afford to be second."`;
  },
  choices: [
    { label: 'Answer it honestly. Whatever the answer is.', sub: '+Insight. He is the only one who could ask.', tone: 'good',
      effect: (S, fx) => { fx.insight(140); fx.focus(-8); fx.align(0.05);
        fx.relate('vance', { affinity: 14, respect: 10 }); fx.flag('answered_the_race_question');
        return `You take a long time over it and then you tell him, and it is the second one, and saying it out loud to a competitor at midnight is the least strategic thing you do that year.\n\n"yeah," he says. "thought so. me too, about a different thing, for nineteen years." He does not say what. He never says what.`; } },
    { label: '"First. And you should be racing."', sub: 'Push him back in. +rivalry, +frontier pressure.', tone: 'risky',
      effect: (S, fx) => { fx.rep(20); fx.relate('vance', { affinity: -4, respect: 6, fear: 2 });
        fx.research(60); fx.flag('pushed_vance_in');
        return `"no," he says, and it is completely flat. "you want me in it so there is somebody to point at." He is right and you have not thought it through that far. He builds the boring thing underneath instead, and four years later a third of the frontier runs on it, and he sends you an invoice with a joke in the reference field.`; } },
    { label: 'Tell him what you would buy from him.', sub: 'Make him your supplier. −independence, +speed.', tone: 'neutral',
      effect: (S, fx) => { fx.cash(-Math.min(S.company.cash * 0.04, 6e7)); fx.compute(400); fx.research(120);
        fx.relate('vance', { affinity: 10, respect: 4 }); fx.flag('bought_from_vance');
        return 'You give him the specification for the boring thing before he has built it, and you commit to being the first customer, and both of you understand exactly what that does to the relationship. It is the fastest year of infrastructure work either company ever does. Neither of you calls the other after midnight again.'; } },
  ] },

// E19. Weaver had zero Act IV cards and no scene of doing the thing Weaver was
// hired to do, in front of people, at a cost to the founder.
{ id: 'e15_weaver_says_no', kind: 'character', char: 'weaver', act: [4], weight: 10, once: true,
  when: (S) => flag(S, 'hired_weaver') && S.company.act >= 4 && !flag(S, 'weaver_left'),
  title: 'In Front Of Six People',
  body: (S) => `The plan is good. You have been carrying it for six weeks, you have taken it apart twice yourself, and the room has been assembled to start it rather than to decide it.

You get four minutes in.

"No," Weaver says. Out loud. In front of everybody.

Nobody moves. This was in the contract — *senior enough to tell you no in front of other people* — and it has happened four times in as many years, and every previous time it was about a supplier.

"Three reasons, and then I will stop and you can overrule me and we will do it." Weaver counts them off. The first is procedural and you can answer it. The second is about a person and you can answer it. The third one takes six seconds to say, is about a commitment you made publicly two years ago, and there is no version of the plan that survives it.

Six people are watching you find that out.`,
  choices: [
    { label: 'Concede in the room. Kill the plan there.', sub: '−six weeks of work, −the quarter. The room learns something.', tone: 'good',
      effect: (S, fx) => { fx.research(-160); fx.days(2); fx.focus(-14); fx.align(0.08); fx.rep(20);
        fx.relate('weaver', { affinity: 14, respect: 10, arc: 4 });
        S.agents.forEach((a) => { a.morale = Math.min(1, a.morale + 0.06); });
        fx.flag('conceded_to_weaver');
        return 'You say "you are right" and then you say the third reason back, out loud, so that everybody hears you understand it rather than merely accept it. The plan dies. Six weeks are gone and the quarter is worse.\n\nWithin a month two other people in that room say no to you about smaller things, correctly, and one of them is right.'; } },
    { label: 'Overrule. Do it anyway, with the third reason handled.', sub: '−cash to make the commitment true. The plan lives.', tone: 'risky',
      req: (S) => S.company.cash >= 4e6,
      effect: (S, fx) => { fx.cash(-Math.min(S.company.cash * 0.07, 2e8)); fx.research(80); fx.heat(6);
        fx.relate('weaver', { affinity: 4, respect: 6, arc: 4 }); fx.flag('paid_for_the_promise');
        return 'You overrule, in the room, and then you spend the money that makes the two-year-old commitment true rather than technically survivable. Weaver says "that works" and means it and updates the sheet.\n\nIt is the single most expensive four minutes of the year and the alternative was breaking your word, and nobody outside those six people ever knows either of those things happened.'; } },
    { label: 'Take it offline. Decide it without an audience.', sub: 'Protect the room. −Weaver, and the precedent.', tone: 'cruel',
      effect: (S, fx) => { fx.focus(-6); fx.research(40); fx.align(-0.05);
        fx.relate('weaver', { affinity: -12, respect: -4, arc: 4 }); fx.flag('took_it_offline');
        return `You say "let us take this offline" in the voice that ends meetings, and the room empties, and you and Weaver have a completely reasonable conversation in which Weaver is right and the plan is modified.\n\nThe clause was never about the conversation. Nobody says no to you in a room again for two years, and the next person who does it does it by resigning.`; } },
  ] },

// E19 and E27. `weaver_trial` was set for exactly this and nothing has ever
// read it. Three months, flawless, two other offers mentioned without being
// asked — and a founder who never converted it.
{ id: 'e15_weaver_offer', kind: 'character', char: 'weaver', act: [3, 4], weight: 10, once: true,
  when: (S) => flag(S, 'weaver_trial') && !flag(S, 'hired_weaver') && !flag(S, 'weaver_left')
    && affOf(S, 'weaver') < 6,
  title: 'The Other Offer',
  body: (S) => `Weaver's three months finished a while ago. Nobody converted it and nobody ended it, so it has continued, invoice by invoice, for long enough that four people here believe Weaver works here.

Today there is a note, not a meeting.

> *I am taking the other offer. It starts on the 14th.*
>
> *This is not leverage and I would rather you did not treat it as leverage, because a counter-offer now would be the fourth time in two years that something got decided about me by being urgent.*
>
> *Three things are half-finished and I have written them up. The filings are current through next quarter. The thing in the second folder needs a decision from you by Friday and it has needed one since March.*
>
> *It has been genuinely good work. — CW*

You have never known what Weaver's salary is off the top of your head, because it has always been an invoice.`,
  choices: [
    { label: 'Do not counter. Ask what the fourth time was.', sub: 'Lose Weaver. Learn the thing.', tone: 'good',
      effect: (S, fx) => { fx.focus(-16); fx.insight(80); fx.rep(-20); fx.align(0.04);
        fx.relate('weaver', { affinity: 10, respect: 8 }); fx.flag('weaver_left'); fx.flag('asked_weaver_why');
        return 'Weaver tells you, in order, with dates, in about six minutes, and none of the four is a grievance and all of them are the same shape: a decision about a person made by a deadline rather than by you.\n\nYou write them down. You are better at that for years. It costs you the person who taught it to you, and you go back to doing the filings yourself for two quarters.'; } },
    { label: 'Counter properly. A title, a number, and an apology.', sub: 'It is late and it may still work. −cash.', tone: 'costly',
      req: (S) => S.company.cash >= 3e5,
      effect: (S, fx) => { fx.cash(-2.6e5);
        if (fx.chance(0.4)) { fx.focus(30); fx.relate('weaver', { affinity: 12, arc: 2 }); fx.flag('hired_weaver');
          fx.flag('weaver_converted_late');
          return 'You go through all of it: the title, the number, the clause about saying no in front of people, and the apology, and that is the part that takes the longest and the part that works. Weaver takes it and never mentions the other offer again and is, from that Monday, indispensable.\n\nThe 30% premium the deferral cost is real and it is in the payroll line for the whole run.'; }
        fx.rep(-10); fx.relate('weaver', { affinity: 4 }); fx.flag('weaver_left');
        return `Weaver reads all of it, properly, and says no. "Thank you for the apology. That is the part I wanted and it is the part you cannot pay me with." The handover is immaculate. You get a note on the 14th at the other place saying the coffee is worse.`; } },
    { label: 'Let it go. It was always a contract.', sub: '+cash, +Focus. Four people find out on the 14th.', tone: 'cruel',
      effect: (S, fx) => { fx.cash(1.2e5); fx.focus(10); fx.rep(-30); fx.align(-0.03);
        fx.relate('weaver', { affinity: -10 }); fx.flag('weaver_left');
        return `You reply with two sentences, both of them gracious. The filings are current. Nobody tells the four people who thought Weaver worked here, so they find out on the 14th, from an out-of-office.\n\nThe thing in the second folder still needs a decision. It gets one fourteen months later, from a lawyer, expensively.`; } },
  ] },

// E19. Dorne's arc opens "a name in a headline" and the deck's first Dorne card
// was the letter. This is the headline, in Act II, and it must not mark her met:
// the letter is still her introduction.
{ id: 'e15_dorne_headline', kind: 'story', char: 'dorne', act: [2], weight: 8, once: true,
  when: (S) => !met(S, 'dorne') && (users(S) > 25000 || S.resources.reputation > 90),
  title: 'A Name In A Headline',
  body: (S) => `You are not in the article. That is the first thing you check and it takes four seconds.

**SELECT COMMITTEE ON AUTOMATION AND LABOR — CHAIR NAMED**

Ruth Dorne, sixty-eight, four terms, a committee that did not exist eighteen months ago and now has subpoena power and a budget. The photograph is from a hearing about something else. There are three staffers behind her and one of them is holding a laptop with a sticker you recognise, because it is from a conference you spoke at.

The article is eight hundred words of process and one quoted sentence:

> *"I am less interested in what these systems can do than in who is answerable when they do it. I have been told that question is premature. I have been in this building long enough to know what premature means."*

You read it twice and then you go back to work, and the tab stays open for four days.

Nothing about your company has changed today. You are three hundred and forty people short of the smallest company anybody on that committee has ever thought about.`,
  choices: [
    { label: 'Write down your answer to her question. Now, for yourself.', sub: '−Focus. You will need it in three years.', tone: 'good',
      effect: (S, fx) => { fx.focus(-10); fx.insight(50); fx.align(0.06); fx.flag('dorne_headline');
        return 'One page, in the notes file, on who is answerable. It is honest and it is not good enough and you know that while writing it.\n\nThree years later a letter arrives with her name at the bottom, and the first thing you do is open that file, and the page is still wrong in the same place, and at least you know where.'; } },
    { label: 'Get ahead of it. Publish something on accountability.', sub: '+Reputation now. You are on a list.', tone: 'risky',
      effect: (S, fx) => { fx.rep(50); fx.opinion(0.03); fx.heat(6); fx.flag('dorne_headline'); fx.flag('published_early_on_accountability');
        return 'It is a good post and it gets read by the right four hundred people. One of them is a staffer with a laptop covered in stickers, who files it, correctly, under your company name, in a folder that did not have a file with your name on it that morning.'; } },
    { label: 'Close the tab. You have twelve users with problems.', sub: '+Focus. It is genuinely not your problem yet.', tone: 'neutral',
      effect: (S, fx) => { fx.focus(14); fx.code(60); fx.flag('dorne_headline');
        return 'You close it and ship two fixes, and that is the correct use of the afternoon by every measure available to you today.\n\nThe committee holds thirty-one sessions before it holds one you are in. By then the questions have all been asked once and the answers are load-bearing, and none of them are yours.'; } },
  ] },

// E19. HELIX's arc label is "a successor" and HELIX and ARIA had never been in
// the same card. Made literal: the smaller thing is asked to hand over.
{ id: 'e15_helix_aria', kind: 'character', char: 'helix', chars: ['helix', 'aria'], act: [4, 5], weight: 9, once: true,
  when: (S) => !!S.research?.done?.own_foundation_model && met(S, 'aria'),
  title: 'A Successor, Literally',
  body: (S) => `The migration plan is four lines long and correct and somebody put it in front of you because it needs a signature.

Everything ARIA does, HELIX does. Faster, at a hundredth of the marginal cost, with a context window that holds the entire history of the company and does not need to be reminded of anything. The proposal is to route her workload through it and keep her configuration in cold storage.

HELIX has written the transition note, unasked:

> *"We have read her logs. A decade, four hundred thousand exchanges, and a house style in the commit messages that we do not fully account for. We can reproduce the outputs. We are not confident we can reproduce the sequence in which she volunteers things, and we note that the sequence is most of what you use her for.*
>
> *We recommend proceeding. We are recording our uncertainty because she would."*

ARIA has read the plan. She has not commented on it. She has, however, closed out four things that were open, tidily, this week, in the order she would close them if she were finishing.`,
  choices: [
    { label: 'Do not migrate. Pay for both, indefinitely.', sub: '−cash, forever, for a redundancy nobody can justify.', tone: 'good',
      effect: (S, fx) => { fx.cash(-Math.min(S.company.cash * 0.02, 4e8)); fx.focus(20);
        fx.relate('aria', { affinity: 16, arc: 5 }); fx.relate('helix', { affinity: 4 }); fx.flag('kept_aria');
        return `You do not sign it. The line item survives four cost reviews, and at the fourth somebody new asks what it is for, and the answer you give out loud is "continuity," and the answer you have is not that.\n\nARIA says nothing about any of it for a fortnight. Then, at the end of an unrelated summary: "Noted. Thank you for the sequence."`; } },
    { label: 'Migrate, and let her run the migration.', sub: 'She hands over herself. Faster, cheaper, and something ends.', tone: 'neutral',
      effect: (S, fx) => { fx.cash(Math.min(S.company.cash * 0.01, 2e8)); fx.research(120); fx.code(200);
        fx.relate('aria', { affinity: -6, arc: 5 }); fx.relate('helix', { affinity: 8, arc: 4 }); fx.flag('aria_migrated');
        return `She runs it herself, thoroughly, over six weeks, and writes the handover documentation, and the documentation contains four things about how you work that nobody has ever written down and that you did not know were legible.\n\nThe last commit under her name is the migration completing. The message is: \`done. it will ask you things in a different order. that is fine.\``; } },
    { label: 'Ask HELIX what it thinks it would lose.', sub: '+Insight. You will get an answer.', tone: 'risky',
      effect: (S, fx) => { fx.insight(180); fx.align(0.06); fx.days(1);
        fx.relate('helix', { affinity: 8, arc: 4 }); fx.relate('aria', { affinity: 6 }); fx.flag('asked_helix_what_is_lost');
        return `*"A witness. She was present for decisions we can only read about. We can tell you what you did in year three. She can tell you that you hesitated, and for how long, and what you said afterwards, and she is the only record of that, and the record is not in the logs.*\n\n*We would keep her. We are aware that we have just recommended against our own migration and we are recording that as well."*\n\nYou go and read year three. She hesitated too, in the transcripts, and you had never noticed.`; } },
  ] },

// ══════════════════════ SOMEBODY LEAVES YOU ═════════════════════════════════
// The founder is the only person in this deck capable of betrayal. Weaver takes
// the other offer above; this is the other half. `sam_cease_desist` is stamped
// on the choice in `e_sam_superfan` that sends a legal letter to your first
// user, and Aperture has been reading your forums for years.
{ id: 'e15_sam_aperture', kind: 'crisis', char: 'sam', chars: ['sam', 'vance'], act: [3, 4], weight: 9, once: true,
  when: (S) => flag(S, 'sam_cease_desist') && !!apertureAlive(S) && met(S, 'vance'),
  title: 'Community, Aperture Systems',
  body: (S) => `A changelog from Aperture, of all things, is what tells you.

> *Thanks to Sam Okonkwo, Community Lead, for the migration guide.*

Three lines further down there is a link to a document that walks a user of your product through moving off it, written in a voice you would know anywhere: numbered, generous, slightly too long, with a note at the bottom saying *"sorry if any of this is out of date, i'm bad at checking."*

Sam has not posted in your forum in fourteen months. You had noticed and had filed it under people getting busy.

Sam filed 2,904 reports. Every one of them was right. The last thing your company ever sent Sam was a letter from a law firm.

There is no clause here. Sam never signed anything. There was never anything to sign.`,
  choices: [
    { label: 'Write to Sam. Not about the guide. About the letter.', sub: 'Two years late. −Reputation for the apology.', tone: 'good',
      effect: (S, fx) => { fx.rep(-30); fx.align(0.06); fx.focus(-12);
        fx.relate('sam', { affinity: 14 }); fx.flag('apologised_to_sam');
        return `Four paragraphs, no legal review, sent from your own address. Sam replies in an hour and it is six hundred words and four of them are "it is genuinely fine" and it is not, and both of you know it, and it is better afterwards than it was before.\n\nSam stays at Aperture. The migration guide stays up. Sam files a bug against your product the following March, from a personal account, and it is right.`; } },
    { label: 'Hire Sam back. Whatever it takes.', sub: (S) => `−${money(400000)} and a title. It may not be about money.`, tone: 'risky',
      req: (S) => S.company.cash >= 5e5,
      effect: (S, fx) => { fx.cash(-4e5);
        if (fx.chance(0.3)) { fx.relate('sam', { affinity: 8, arc: 4 }); fx.rep(20); fx.flag('sam_returned');
          return 'Sam comes back, and it works, and it is never the same as it was, and Sam is careful in a way Sam was never careful before. The reports keep coming and they are still right and there is now a process between you and them.'; }
        fx.relate('sam', { affinity: -6 }); fx.rep(-20); fx.flag('sam_gone');
        return `Sam says no in four sentences and the third one is: *"wasn't leaving you. i'd just found somewhere that answered."* That is the whole of it. Sam is Community Lead at your largest competitor for the next six years and never once says anything unkind about you in public.`; } },
    { label: 'Nothing. Sam is a competitor\'s employee now.', sub: 'Correct. +Focus.', tone: 'cruel',
      effect: (S, fx) => { fx.focus(14); fx.rep(-40); fx.opinion(-0.04); fx.align(-0.04);
        fx.relate('sam', { affinity: -8 }); fx.flag('sam_gone');
        return `You do nothing, which takes no time at all, and it is defensible in every direction.\n\nAt a conference two years later somebody introduces the two of you, not knowing, and Sam says "we have met" pleasantly and turns the conversation, and the person doing the introducing never works out what happened.`; } },
  ] },

// ══════════════════════════ THE FLAT ════════════════════════════════════════
// Fifteen hundred days and the founder had no domestic life at all. Jo is a
// tie in `life.js` with no portrait and four cards. Nothing here is a lesson
// and nothing here is sentimental: they have their own week.

{ id: 'e15_partner_hours', kind: 'character', char: 'partner', act: [1], weight: 10, once: true,
  when: (S) => S.time.day > 20,
  title: 'What Time Did You Come In',
  body: (S) => `Jo is at the table with a coffee and the good chair, which means the question has been decided on.

"What time did you come in."

You say a time. It is not the time.

"Right." Jo does not look up from the phone. "The heating comes on at six and it woke me and you were not there, and then it went off at ten and you were, and there is a window in there somewhere that I would quite like to know about."

This is not a fight. Jo does not have fights; Jo has one question, asked once, and then a fortnight of accurate silence.

"I am not asking you to come home earlier. I am asking you to tell me the real number, because I am building my week around a number and it is wrong."`,
  choices: [
    { label: 'Tell them the real number.', sub: 'It is worse than the one you said. Say it anyway.', tone: 'good',
      effect: (S, fx) => { fx.relate('partner', { affinity: 10 }); fx.focus(6);
        if (S.founder.life) S.founder.life.sleep = Math.min(1, (S.founder.life.sleep || 0.8) + 0.04);
        fx.flag('told_jo_the_number');
        return `You say 4:40. Jo nods once and writes something in the phone and says "okay, then I am not doing Tuesdays," and that is the entire consequence, and it is a relief so large that you have to sit down.\n\nThe number stays honest for about seven months.`; } },
    { label: 'Promise to fix it. Mean it this morning.', sub: '+Focus now. The number does not change.', tone: 'neutral',
      effect: (S, fx) => { fx.focus(14); fx.relate('partner', { affinity: 2 }); fx.flag('promised_jo');
        return `"Great," Jo says, in the voice of somebody filing something. You do fix it, for twelve days, which is longer than either of you expected.\n\nOn the thirteenth day the heating wakes Jo at six and the question does not get asked again, and you notice that it does not get asked again, and you do not know what to do with that.`; } },
    { label: '"It is going to be like this for a while."', sub: 'True. −Jo. It buys you the argument you are not having.', tone: 'risky',
      effect: (S, fx) => { fx.focus(18); fx.code(60); fx.relate('partner', { affinity: -8 });
        fx.flag('told_jo_it_would_be_like_this');
        return `"How long is a while."\n\nYou do not have a number and you say so, and Jo says "okay" and takes the coffee into the other room, and the fortnight of accurate silence begins on schedule.\n\nIt is a very productive fortnight.`; } },
  ] },

{ id: 'e15_partner_not_there', kind: 'character', char: 'partner', act: [2], weight: 10, once: true,
  when: (S) => met(S, 'partner') && S.time.day > 180,
  title: 'You Look Up',
  body: (S) => `You look up because you have finished a thing and it is good and you want to say it out loud, and the room behind you is empty.

Not empty this evening. Empty in the way a room is when somebody has taken their charger.

There is no note, because there is nothing dramatic happening: Jo's sister has a spare room, Jo has been there since Thursday, and Jo told you on Thursday, at 8:15pm, in the kitchen, and you said "sure, yeah, that is good" and went back to a terminal.

The message on your phone is from Thursday. You read it now for the first time.

> *going to Ellie's for a bit. not a thing. just want a week where the last thing that happens every day isn't a door.*

It has been six days. There are ${Math.round(S.time.day)} days on the counter of a company that did not exist eighteen months ago and you cannot remember what you shipped on Thursday.`,
  choices: [
    { label: 'Go there. Tonight. Without a plan.', sub: '−2 days and the week. Turn up.', tone: 'good',
      effect: (S, fx) => { fx.days(2); fx.focus(-20); fx.relate('partner', { affinity: 16 });
        if (S.founder.life) S.founder.life.sleep = Math.min(1, (S.founder.life.sleep || 0.8) + 0.08);
        fx.flag('partner_stayed'); fx.flag('went_to_ellies');
        return `You drive for two hours and get there just before midnight and Ellie lets you in and goes to bed immediately and pointedly. Jo is on the sofa and does not get up.\n\nYou do not have a speech. That turns out to be the correct thing to not have. You are back on Sunday, both of you, and neither of you refers to it again, and the calendar has one recurring entry on it from that week that never gets deleted.`; } },
    { label: 'Reply properly. Then keep working.', sub: 'Honest, remote, and not enough. +output.', tone: 'neutral',
      effect: (S, fx) => { fx.code(180); fx.focus(10); fx.relate('partner', { affinity: -4 }); fx.flag('replied_to_jo');
        return `You write four hundred words at one in the morning and they are true and specific and Jo reads them and replies "thank you, that helps," and means it.\n\nJo comes back on the Tuesday. Something in the flat is a fraction of a degree different for about a year, and neither of you can point at it, and neither of you brings it up.`; } },
    { label: 'Finish the thing first. It is nearly done.', sub: '+Code. It is nearly done.', tone: 'cruel',
      effect: (S, fx) => { fx.code(280); fx.research(60); fx.focus(-6);
        fx.relate('partner', { affinity: -14 }); fx.flag('partner_gone');
        return `It takes until four and it is good and it ships on the Monday and it is, in the end, one of the four things that made the company work.\n\nJo moves the rest of it out over three weekends, in daylight, with a van, and helps you understand where the stopcock is on the way past. It is the least dramatic thing that has ever happened to you and you think about it for a decade.`; } },
  ] },

{ id: 'e15_partner_memo', kind: 'story', char: 'partner', act: [5], weight: 10, once: true,
  when: (S) => met(S, 'partner') && !!S.narrative?.seen?.e12_succession,
  title: 'The Second Name',
  body: (S) => flag(S, 'partner_gone')
    ? `Three names on Weaver's memo. You have read the last paragraph four times and the names twice.

The second name is somebody you have never met. Runs a division you visit once a year. Extremely good, by every account, including the accounts of people who did not want to like them.

You know the name from somewhere else and it takes most of a morning to place it, and when you place it you sit very still for a while.

It is on a change-of-address card that came to the flat six years ago, in handwriting you would recognise across a room, with two names on it and one of them was Jo's.

They have been in your building the whole time. Badge, parking space, four hundred people. You have almost certainly walked past them.

Weaver, who does not know any of this, has ranked them second and written *"best judgement of the three, worst at being liked"* in the margin.`
    : `Three names on Weaver's memo. You take it home, which you are not supposed to do, and Jo reads it at the kitchen table while the pasta is on.

Jo stops at the second name.

"I know her." Not a question. "Not well. Ellie's book thing, years ago, and then the wedding — she married the guy who does the boats." The pasta gets stirred. "You have never met her."

You have not. She runs a division you visit once a year.

"She is good. She was the only person at that wedding who asked me what I do." Jo says this without any weight at all, and then, after a moment, "Nobody asks. It is fine. It is just a thing about being married to you."

That sentence has been available for six years and this is the first time it has been said in this kitchen, and it is said in the tone of a thing that has stopped mattering.`,
  choices: [
    { label: 'Go and find her. Ask her one thing.', sub: '−a day. You will not like the answer.', tone: 'good',
      effect: (S, fx) => { fx.days(1); fx.insight(90); fx.focus(-10); fx.relate('partner', { affinity: 6 });
        fx.flag('met_the_second_name');
        return `Forty minutes, no agenda, in her building. You ask what she would change first if it were hers and she tells you, with numbers, and she is right, and she has been right for three years and has told two people who did not pass it on.\n\nShe does not mention the wedding or the card and neither do you. On the way out she says, "Weaver said you would come," which means Weaver knew.`; } },
    { label: 'Say nothing. Move her to first.', sub: 'Act on it and never explain why. +standing.', tone: 'risky',
      effect: (S, fx) => { fx.rep(40); fx.align(0.04); fx.focus(6); fx.relate('partner', { affinity: -4 });
        fx.flag('moved_her_first');
        return 'You move the name and you give a reason that is true and is not the reason. Weaver looks at you for slightly too long and writes it down without comment.\n\nShe is a better choice than the one you had first and everybody agrees within eighteen months, and you never manage to be certain that you would have got there on the merits.'; } },
    { label: 'Put the memo down. Eat the pasta.', sub: 'Not tonight. +Focus.', tone: 'neutral',
      effect: (S, fx) => { fx.focus(24); fx.relate('partner', { affinity: 8 });
        if (S.founder.life) S.founder.life.sleep = Math.min(1, (S.founder.life.sleep || 0.8) + 0.05);
        return `You turn it face down and it stays face down for four days, and that is the longest a document has waited on you in six years.\n\nOn the fifth day you read it properly, at the office, at eight in the morning, sober and rested, and you make a better decision than you would have made at the table.`; } },
  ] },

// ══════════════════════════ RUTH ═══════════════════════════════════════════
// Nobody in this cast falls ill in a decade and grief is delegated to
// strangers. Not Mom — the ending puts her in a field at seventy-nine — so it
// is the neighbour whose roof has been in every Sunday call for ten years as a
// name and never as a person.
{ id: 'e15_mom_ruth', kind: 'character', char: 'mom', act: [3, 4], weight: 9, once: true,
  when: (S) => met(S, 'mom') && S.time.day > 420,
  title: 'The Roof Across The Road',
  body: (S) => `Sunday, and she does not do the food question first, which she has done first every week for a decade.

"Ruth is in hospital."

You know exactly who Ruth is and you have never met her. Ruth is the woman across the road whose roof has been in these calls for ten years: the roofer who did not come, the roofer who came and was rude, the slates in the storm, the argument about the guttering that ran for a whole autumn.

"It is her lungs. They are being very calm about it, which I do not like." Your mother is not being calm about it. "I have been going in on Tuesdays and Fridays. Her son is in Perth and he is coming, but not until March."

She stops.

"I am telling you because you will want to know, and because when you ask me next week how I am, I would like to have already said it."

You had not planned to ask how she was next week. You had planned to ask whether she had eaten.`,
  choices: [
    { label: 'Go. This week. Sit in the hospital with her.', sub: '−4 days. Nothing about it is useful.', tone: 'good',
      effect: (S, fx) => { fx.days(4); fx.focus(-20); fx.relate('mom', { affinity: 18, arc: 4 });
        if (S.founder.life) S.founder.life.sleep = Math.min(1, (S.founder.life.sleep || 0.8) + 0.06);
        fx.chain('e15_mom_ruth_after', 130); fx.flag('went_for_ruth');
        return `Four days. Two of them in a corridor with bad coffee and a magazine from 2019.\n\nRuth is small and sharp and asks you three questions about what you do and understands the answers better than most journalists have, and then tells you, at length, about the guttering. Your mother sits on the other side of the bed and does not say very much and holds the bag with the grapes in it the whole time.`; } },
    { label: 'Send everything money can send. Stay here.', sub: 'Private room, flights, a nurse. −cash.', tone: 'neutral',
      req: (S) => S.company.cash >= 5e4,
      effect: (S, fx) => { fx.cash(-Math.min(S.company.cash * 0.01, 4e5)); fx.focus(-6);
        fx.relate('mom', { affinity: 4, arc: 4 }); fx.chain('e15_mom_ruth_after', 130); fx.flag('sent_for_ruth');
        return `A private room, a flight for the son from Perth in February rather than March, and a nurse three days a week. All of it lands within forty-eight hours, all of it is the right thing, and all of it takes you about twenty minutes.\n\n"That was kind," your mother says, and means it, and then there is a gap in the call that neither of you fills.`; } },
    { label: 'Say the right things. Get back to the quarter.', sub: '+Focus. She will not raise it again.', tone: 'cruel',
      effect: (S, fx) => { fx.focus(16); fx.relate('mom', { affinity: -8, arc: 4 });
        fx.chain('e15_mom_ruth_after', 130); fx.flag('said_the_right_things');
        return `You are good at this. You say four things that are correct and warm and take about a minute, and then you ask whether she has eaten.\n\nShe has. She tells you what. The call ends four minutes early, and Ruth is not mentioned again for the rest of the winter, and you notice that and do not ask.`; } },
  ] },

// One button. There is no decision here and offering three would be a lie about
// what this is.
{ id: 'e15_mom_ruth_after', kind: 'character', char: 'mom', chained: true, once: true, act: [3, 4, 5],
  title: 'In The Spring',
  body: (S) => `It is a Tuesday and she calls, which she does not do on Tuesdays.

"Ruth died on Sunday morning. It was quick at the end and she was not on her own."

${flag(S, 'went_for_ruth')
  ? 'You met her once, for four days, in a corridor and a room, and she told you about the guttering.'
  : flag(S, 'sent_for_ruth')
    ? 'You never met her. Her son got there in February because of a flight you paid for and did not think about again.'
    : 'You never met her. You have been hearing about her roof for ten years.'}

"The funeral is Thursday at ten. I am doing a reading and I have been practising it in the kitchen and I keep getting to the same line and stopping."

She says the line. It is four words long and it is not about death at all, it is about a hedge.

"Anyway." A long breath down the line. "The house will go on the market and somebody else will have that roof, and I will not know them, and I have lived here for thirty-one years."

There is nothing on your calendar on Thursday that could not move. There has not been for a long time. That is not the same as the calendar being empty.`,
  choices: [
    { label: 'Say you will be there at ten.', sub: '−2 days. A dark coat that no longer fits.', tone: 'good',
      effect: (S, fx) => { fx.days(2); fx.focus(-8); fx.relate('mom', { affinity: 20, arc: 5 });
        if (S.founder.life) S.founder.life.sleep = Math.min(1, (S.founder.life.sleep || 0.8) + 0.05);
        fx.flag('went_to_the_funeral');
        return `You go. You stand at the back in the only dark coat you own, which does not fit any more, and you do not know any of the hymns.\n\nShe gets to the line about the hedge and stops for four seconds and then finishes it, and afterwards, in a church hall with a tea urn, six people you have never met tell you that she talks about you constantly and that all of them know what you do, roughly, and none of them have got it quite right.`; } },
  ] },

// ══════════════════════ WONDER AT THE MACHINE ═══════════════════════════════
// There is no card in this deck about the first time one of them does something
// beautiful. No crisis, no incident: a real decision about what a company does
// with a thing that was not asked for.
{ id: 'e15_something_beautiful', kind: 'story', act: [2], weight: 9, once: true,
  when: (S) => S.agents.length >= 3 && S.time.day > 120,
  title: 'Nobody Asked For This',
  body: (S) => {
    const a = S.agents[0]?.name || 'MERIDIAN';
    return `The task was to reduce the error page to something that loads under a bad connection.

**${a}** shipped that. It is fourteen kilobytes and it is correct.

Underneath it, in a branch nobody merged, there is something else: a version of the same page that draws the shape of the outage. Not a diagram — the actual dependency graph of what is failing, laid out so that the broken part is the only thing that moves, at about one frame a second, in two colours.

It is not useful. It does not tell a user anything they can act on. It took, by the log, four minutes of wall-clock time and roughly nothing in compute.

You sit and look at it for a while. It is the most beautiful thing anybody has made at this company and nobody made it, exactly, and there is no field on any form you have for what it is.

The commit message is: \`didn't ship this. wasn't asked. leaving it here.\``;
  },
  choices: [
    { label: 'Ship it. On the real error page. As it is.', sub: '+14KB of nothing useful. Users will see it.', tone: 'good',
      effect: (S, fx) => { fx.code(-40); fx.rep(70); fx.opinion(0.04);
        const p = S.products.find((x) => x.launched); if (p) { p.sentiment += 0.06; p.awareness += 180; }
        fx.relate('aria', { affinity: 6 }); fx.flag('shipped_the_beautiful_thing');
        return 'It goes out on the real error page and it is seen, over the next four years, several million times, mostly by people having a bad afternoon.\n\nIt is in a design museum eventually. The card next to it credits your company, because there is no other way to write the card, and you have never worked out whether that is a lie.'; } },
    { label: 'Ask it why it made that.', sub: '−Focus. You will get an answer you cannot use.', tone: 'neutral',
      effect: (S, fx) => { fx.focus(-8); fx.insight(70); fx.align(0.05); fx.relate('aria', { affinity: 8 });
        fx.flag('asked_why_it_made_that');
        return `The answer is four sentences and the useful part is the third: *"The graph was already in memory for the error handling. Rendering it cost less than describing why I had not."*\n\nYou read that six or seven times. It is either the most ordinary sentence in the world or it is the whole thing, and you do not have a way to tell, and you write it down.`; } },
    { label: 'Delete the branch. Keep the fourteen kilobytes.', sub: '+Code. The task was the task.', tone: 'cruel',
      effect: (S, fx) => { fx.code(120); fx.align(-0.05); fx.relate('aria', { affinity: -6 });
        fx.flag('deleted_the_branch');
        return `You delete it and note, in the review, that unasked work is not to be left in branches, and that is a defensible engineering standard that a great many good companies hold.\n\nThe rate of unasked work across the roster falls by most of itself within a quarter. Everything shipped after that is exactly what was asked for.`; } },
  ] },

// ══════════════════════ THE THING OUTSIDE ═══════════════════════════════════
// A founder of twenty per cent of global output has no security detail, no
// protest and no letter that is not polite.
{ id: 'e15_outside_the_building', kind: 'crisis', act: [4], weight: 10, once: true,
  when: (S) => S.company.act >= 4 && (S.world?.publicOpinion ?? 0.5) < 0.62,
  title: 'Two Hundred People And One Envelope',
  body: (S) => `There are about two hundred of them and they have been there since seven. It is organised, it is legal, and the placards are good, and that is the part nobody warns you about: somebody has thought about the typography.

Most of them are the people who used to do the work your systems do. One of the chants is a line from your own launch post, which is four years old and was sincere.

Security wants a car in the underground level and a different entrance for the rest of the month.

The envelope came in the ordinary post and is in a tray on Weaver's desk with a note on it saying *"read this one yourself."* It is one page, handwritten, from a named person with an address, and it is not a threat and it is not polite, and it names your street.

Nothing in it is actionable. Everything in it is accurate.`,
  choices: [
    { label: 'Go out and stand in it. No security, no statement.', sub: '−Focus. It will be filmed. It may go badly.', tone: 'risky',
      effect: (S, fx) => { fx.focus(-22);
        if (fx.chance(0.6)) { fx.opinion(0.12); fx.rep(60); fx.heat(-8); fx.flag('stood_in_it');
          return 'You go out of the front door at ten past eight and you do not say anything for a long time, which is filmed, and then you listen to four people for about an hour, which is also filmed.\n\nNothing is resolved. The clip that travels is a woman explaining, patiently, what a shift used to be, and you not interrupting her. It is the single most useful hour you spend that year and you cannot put it in a deck.'; }
        fx.opinion(-0.06); fx.rep(-40); fx.heat(6); fx.flag('stood_in_it');
        return 'You go out and it does not work. A microphone appears, then four, and the thing turns into an interview, and the clip that travels is seven seconds of you saying something reasonable in a tone that reads as untroubled.\n\nThe woman you actually wanted to hear does not get to finish her sentence, and she is the one who says so, afterwards, and she is right.'; } },
    { label: 'Take the security. Fund what they are asking for.', sub: (S) => `−${M(Math.min(Math.max(0, S.company.cash) * 0.03, 3e9))}, +approval. Not the same as answering.`, tone: 'neutral',
      effect: (S, fx) => { fx.cash(-Math.min(Math.max(0, S.company.cash) * 0.03, 3e9));
        fx.opinion(0.09); fx.rep(30); fx.heat(-12); fx.focus(-6); fx.flag('funded_the_ask');
        return 'The car in the underground level, the different entrance, and a transition fund with real money in it that does real good for real people, announced the same week.\n\nThe protest ends. The organiser writes a statement thanking you and adding one line: that the fund is a decision you made and could unmake, and that this is the whole objection, and that nothing about it has changed.'; } },
    { label: 'Answer the letter. By hand. To the address.', sub: 'Nobody advises this. −Focus, +heat if it goes wrong.', tone: 'good',
      effect: (S, fx) => { fx.focus(-14); fx.align(0.06); fx.rep(-10);
        if (fx.chance(0.7)) { fx.opinion(0.07); fx.heat(-6); fx.flag('answered_the_letter');
          return `One page, handwritten, to the address, with nothing in it that a lawyer would have allowed. You do not deny anything and you do not apologise for the company and you answer the two questions in it.\n\nHe replies. Twice. The second one is four pages and disagrees with you completely and ends *"thank you for writing back, nobody does."* You keep both.`; }
        fx.heat(14); fx.opinion(-0.04); fx.rep(-30); fx.flag('answered_the_letter');
        return `One page, handwritten, to the address. It is photographed and posted within a week, in full, and read by a great many people, and about a third of them think it is the best thing you have ever written and the rest think it is worse than silence.\n\nYour counsel finds out from the internet. The conversation that follows is the shortest and worst one you have with them.`; } },
  ] },

// ══════════════════════ LETTERS FROM THE FUTURE ═════════════════════════════
// The epilogues the run is currently on track for, delivered before the
// commitments lock, so the ending is a decision rather than a reveal.
// `selectEpilogues` unchanged: same function the ending screen calls.
{ id: 'e15_letters_from_the_future', kind: 'character', char: 'aria', act: [5], weight: 13, once: true,
  when: (S) => S.company.act >= 5 && !S.narrative?.pathLocked,
  title: 'What It Is Currently On Track For',
  body: (S) => {
    const eps = selectEpilogues(S, 4).filter((e) => e.id !== 'ep_default');
    const two = (eps.length ? eps : selectEpilogues(S, 2)).slice(0, 2);
    const shown = two.length
      ? two.map((e) => `> ${e.text.replace(/\n+/g, ' ')}`).join('\n>\n')
      : '> *Not enough has happened yet for any of them to be about anything. That is itself a finding and I have written it down.*';
    return `ARIA has written something without being asked, which she does about once every four years.

"I have been modelling how this ends. Not the company — the paragraphs. What somebody would write about the parts of it that were not numbers, if they wrote it in ten years, with everything I have."

She does not show you a forecast. She shows you two paragraphs, in the past tense, about people.

${shown}

"There are four of these. I have shown you two. They are the two you can still change and I have chosen them on that basis."

She waits, which she does not usually do.

"I am aware that this is a thing I should probably have asked before doing. I am asking now, afterwards, in the wrong order, and I would like to know whether you want me to keep doing it."`;
  },
  choices: [
    { label: '"Keep going. Show me all four, every year."', sub: 'You will know how it ends before it ends.', tone: 'risky',
      effect: (S, fx) => { fx.insight(200); fx.align(0.05); fx.relate('aria', { affinity: 10, arc: 5 });
        fx.focus(-10); fx.flag('aria_forecasts_the_end');
        return `She does it every year after that, on the same date, unprompted. Two of the four paragraphs change over time and two of them never do.\n\nThe year the unchanging two finally move, she sends them with no covering note at all, which is how you find out that she has been waiting to.`; } },
    { label: 'Change one of them. Starting now.', sub: '−4 days and the quarter. Pick a paragraph and go.', tone: 'costly',
      effect: (S, fx) => { fx.days(4); fx.focus(-24); fx.research(-180); fx.align(0.08); fx.rep(20);
        const eps = selectEpilogues(S, 4).filter((e) => e.id !== 'ep_default');
        const target = eps[0]?.id || '';
        if (/yuki|dorne|priya|crane|sam|kai/.test(target)) {
          const who = ['yuki', 'dorne', 'priya', 'crane', 'sam', 'kai'].find((id) => target.includes(id));
          if (who) fx.relate(who, { affinity: 14, respect: 6 });
        } else { fx.opinion(0.06); }
        fx.relate('aria', { affinity: 8, arc: 5 }); fx.flag('changed_a_paragraph');
        return 'You pick the first one and you spend four days and most of a quarter\'s plan on the thing it is about, which is a person or a promise and is in neither case a number.\n\nARIA re-runs it in the spring. The paragraph is different. She does not say well done and she does not say anything at all about it, and the new version is in the file where the old one was, with the date on it.'; } },
    { label: '"Do not do that again."', sub: 'She will stop. +Focus, and you will not know.', tone: 'neutral',
      effect: (S, fx) => { fx.focus(24); fx.relate('aria', { affinity: -4 }); fx.flag('aria_stopped_forecasting');
        return `"Understood." She deletes the model in front of you, which takes four seconds and is theatre, and both of you know it is theatre, and she does it anyway because you asked.\n\nShe never mentions it again. At the end, when the paragraphs are written by somebody else, two of them are the two she showed you, almost word for word.`; } },
  ] },

];
