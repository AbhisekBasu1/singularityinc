// ─────────────────────────────────────────────────────────────────────────────
// EVENT DECK XI — ACT II, THE PEOPLE.
//
// Measured: Act II is the longest single stretch in the game (~330 days) and
// drew 17% cards-with-a-face against Act I's 30% and Act IV's 41% — 65% of it
// was crisis and opportunity. The founder becomes a company and, in the same
// act, stops meeting anybody. That is backwards: Act II is *precisely* when a
// solo founder acquires other people, and it is the last act in which those
// people are still speaking to them as a person rather than as an institution.
//
// Every card here pays off something planted in Act I — Sam's eleven-item bug
// list, the dorm room, Crane's "come back when you raise your Series A" — so a
// second playthrough that answered Act I differently gets a different Act II.
// That is the setup-and-payoff structure the deck had in Act I and lost.
//
// Written as dilemmas, not incidents: the choice should be hard on the way in
// and unresolved on the way out.
// ─────────────────────────────────────────────────────────────────────────────
import { totalUsers, totalMrr } from '../systems/product.js';

const users = (S) => totalUsers(S);
const mrr = (S) => totalMrr(S);
const money = (n) => '$' + Math.round(n).toLocaleString();
const flag = (S, f) => !!S.narrative.flags[f];

export const EVENTS11 = [

{ id: 'e11_sam_not_special', kind: 'character', char: 'sam', act: [2], weight: 14, once: true,
  when: (S) => users(S) > 4000 && flag(S, 'sam_met'),
  title: 'User #1',
  body: (S) => `Sam has filed 340 issues. The last four are still open.

They are not bad issues. They are the issues of somebody who has been using the thing since it was eleven things wrong in an email, who knows where the bodies are, and who is now one of **${users(S).toLocaleString()}** people, most of whom want something simpler.

Today's message is shorter than usual.

> *saw you shipped the enterprise SSO thing. congrats, genuinely.*
>
> *is the ticket about the keyboard nav still in the backlog or is it just closed and nobody told me*

It is just closed and nobody told you either.`,
  choices: [
    { label: 'Do the keyboard nav. This week. Personally.', sub: '−Focus. It is four days of work for one person.', tone: 'good',
      effect: (S, fx) => { fx.code(-50); fx.focus(-18); fx.relate('sam', { affinity: 10, arc: 3 }); fx.rep(12);
        return 'Sam files a 341st issue: a screenshot of the new keyboard nav with a single word, "oh". Six months later an accessibility audit you did not commission cites it, and it is the reason you pass.'; } },
    { label: 'Be honest: Sam is not the customer anymore.', sub: 'Say it kindly. It is still true.', tone: 'risky',
      effect: (S, fx) => { fx.relate('sam', { affinity: -6, arc: 3 }); fx.insight(40); fx.focus(-6);
        return 'Sam takes it well, which is worse. "Yeah. Makes sense. You\'ve got a real thing now." The issues keep coming for another five weeks and then they stop, and the silence is the loudest metric on any dashboard you own.'; } },
    { label: 'Give Sam a title and a login to the roadmap.', sub: 'Make the relationship formal. It changes it.', tone: 'neutral',
      effect: (S, fx) => { fx.relate('sam', { affinity: 4, arc: 3 }); fx.rep(20); fx.insight(20); fx.flag('sam_advisor');
        return 'Sam becomes "Community Advisor," unpaid, with strong opinions and a monthly call. It works. It is also the day the friendship acquired an org chart, and both of you noticed.'; } },
  ] },

{ id: 'e11_weaver_arrives', kind: 'character', char: 'weaver', act: [2], weight: 15, once: true,
  when: (S) => S.time.day > 150 && (mrr(S) * 12 > 900000 || S.agents.length >= 4),
  title: 'The Person Who Does The Rest',
  body: (S) => `You have started dropping things. Not big things — a contract unsigned for three weeks, a tax filing, an intro you promised somebody in March.

**Cassidy Weaver** is somebody's third recommendation and is on the call for four minutes before you understand that Weaver has already read your last two blog posts, your pricing page, and — Weaver mentions this without emphasis — your terms of service, which Weaver notes contains a clause that is not enforceable in two of the jurisdictions you are selling into.

"I'm not a co-founder and I don't want equity that pretends I am. I want to be the person who handles the rest, and I want to be senior enough to tell you no in front of other people."

The salary number is real money for you right now.`,
  choices: [
    { label: 'Hire Weaver. The no-in-front-of-others clause included.', sub: `−${money(140000)}/yr. Buy back your attention.`, tone: 'good',
      req: (S) => S.company.cash >= 60000,
      effect: (S, fx) => { fx.cash(-42000); fx.focus(38); fx.rep(18); fx.relate('weaver', { affinity: 8, arc: 1 });
        fx.flag('weaver_hired'); S.founder.burnout = Math.max(0, S.founder.burnout - 18);
        return 'Within a fortnight the dropped things are not dropped. Within a quarter Weaver tells you no in front of four people and is right, and the four people watch you take it, and something about the room changes permanently.'; } },
    { label: 'Hire Weaver as a contractor. Three months. See.', sub: 'Cheaper. Also, visibly, a test.', tone: 'neutral',
      req: (S) => S.company.cash >= 18000,
      effect: (S, fx) => { fx.cash(-18000); fx.focus(16); fx.relate('weaver', { affinity: -2, arc: 1 }); fx.flag('weaver_trial');
        return 'Weaver says "sure" in a tone that files it correctly. The three months are flawless. At the end Weaver has two other offers and mentions both of them without being asked.'; } },
    { label: 'Not yet. You can hold it a bit longer.', sub: '+Cash. You cannot hold it a bit longer.', tone: 'risky',
      effect: (S, fx) => { fx.relate('weaver', { affinity: -4, arc: 1 }); fx.focus(-10); S.founder.burnout = Math.min(100, S.founder.burnout + 8);
        return '"Call me when it hurts more." Weaver is not being unkind. Weaver is being accurate, and has left the door open in a way that will cost you 30% more when you walk through it.'; } },
  ] },

{ id: 'e11_vance_first_contact', kind: 'character', char: 'vance', act: [2], weight: 13, once: true,
  when: (S) => users(S) > 12000 || S.resources.reputation > 70,
  title: 'A Drink With The Enemy',
  body: (S) => `**Marcus Vance** buys you a drink at a conference you both did not want to attend.

Aperture is forty times your size and Vance is exactly as good as advertised: funny, quick, and entirely uninterested in pretending the two of you are peers.

"You'll get bought," he says, cheerfully. "Not by me. By whoever needs the story more. It'll be a good outcome and you'll hate it for about two years and then you'll be fine."

He is on his second drink and is being nicer than he has to be.

"The thing you've got that I don't — you can still change your mind about what the product is. I've got eleven hundred people who've built careers on the current answer." He taps the bar. "Enjoy that. It's the only advantage you have and it's real."`,
  choices: [
    { label: 'Ask him what he\'d do with your position.', sub: 'He will tell you. That is the risk.', tone: 'good',
      effect: (S, fx) => { fx.insight(70); fx.relate('vance', { affinity: 6, arc: 1 }); fx.rep(6);
        return 'He talks for eleven minutes without stopping and four of the things he says are better than anything in your strategy doc. Two of them you use. On the flight home you work out that he told you because he genuinely does not think you can execute them, and you decide that is fine.'; } },
    { label: '"I\'m not selling."', sub: 'Say it now, out loud, to him. +Reputation.', tone: 'risky',
      effect: (S, fx) => { fx.rep(26); fx.relate('vance', { affinity: -3, arc: 1 }); fx.flag('told_vance_no'); fx.focus(10);
        return 'Vance laughs, genuinely, and says "everyone says that at your revenue." Then, half a beat later, quieter, without the performance: "Say it again in three years and I\'ll believe you." It becomes a thing you are trying to be able to say.'; } },
    { label: 'Ask what he regrets.', sub: 'The only question he is not ready for.', tone: 'neutral',
      effect: (S, fx) => { fx.insight(40); fx.relate('vance', { affinity: 10, arc: 1 }); fx.align(0.02);
        return 'He is quiet for long enough that the bartender comes and goes. Then: "We shipped a thing in year three that works. It works really well. I would not build it again and I cannot turn it off, because eleven hundred people." He changes the subject and does not come back to it, ever.'; } },
  ] },

{ id: 'e11_priya_real_piece', kind: 'character', char: 'priya', act: [2], weight: 13, once: true,
  when: (S) => S.resources.reputation > 55 && S.time.day > 130,
  title: 'Two Thousand Words',
  body: (S) => `Priya Raghunathan is writing the real piece. Not the launch blurb — two thousand words, three months, eleven interviews, and she has already spoken to Kai.

She sends the fact-check email at 11pm on a Thursday. Nineteen numbered items. Seventeen are correct.

Item 14 is a quote from an early customer who says the product "does about a third of what the website says it does." That was true in March. It is not true now. It is not *entirely* untrue now.

Item 18 is: *"Sources describe a founder who has not taken a day off in seven months. Do you want to comment?"*

You have not taken a day off in seven months.`,
  choices: [
    { label: 'Answer all nineteen. Honestly. Including 18.', sub: '+Reputation, and it will sting.', tone: 'good',
      effect: (S, fx) => { fx.rep(44); fx.relate('priya', { affinity: 10, arc: 2 }); fx.focus(-10);
        return 'The piece runs. Item 14 is in it. Item 18 is in it, and the paragraph she writes around it is the kindest and most exposing thing anyone has published about you. Three people you respect email you about that paragraph and none of them mention the company.'; } },
    { label: 'Correct 14. Decline 18. Stay professional.', sub: 'Reasonable. Also a shape she will notice.', tone: 'neutral',
      effect: (S, fx) => { fx.rep(20); fx.relate('priya', { affinity: 2, arc: 2 });
        return 'The piece runs and is fair and slightly cool. "The founder declined to comment on their working hours" is nine words and does more damage than a paragraph would have.'; } },
    { label: 'Push back hard on 14. Threaten nothing, imply everything.', sub: 'Protect the number. −Priya.', tone: 'cruel',
      effect: (S, fx) => { fx.rep(-16); fx.relate('priya', { affinity: -14, arc: 2 }); fx.flag('leaned_on_priya');
        return 'Item 14 comes out. So does the warmth. She files a second piece eighteen months later, about a different company, and one sentence in it is clearly about you, and you are the only person on earth who knows that.'; } },
  ] },

{ id: 'e11_kai_returns', kind: 'character', char: 'kai', act: [2], weight: 14, once: true,
  when: (S) => S.time.day > 160 && (flag(S, 'kai_declined') || flag(S, 'kai_contract')),
  title: 'The Second Call',
  body: (S) => `Kai calls again. It is not late this time — it is a Tuesday afternoon, which somehow makes it worse.

${'`'}"So I did the maths on what 25% would have been."${'`'}

A beat.

"That's not why I'm calling. I'm calling because I quit anyway, three weeks ago, and I didn't tell you, and I've been sitting on it because I did not want the first thing I said to you to be a request."

Kai is a better engineer than you. This was true in the dorm room and it is more true now, and the only thing you have that Kai does not is that you did not take the offer with the dental plan.

"I'm not asking for the old number. I know what that costs now."`,
  choices: [
    { label: 'Offer the old number anyway.', sub: '−15% equity. It is not charity. It is a correction.', tone: 'costly',
      req: (S) => S.company.equity.founder > 0.35,
      effect: (S, fx) => { fx.equity(-0.15); fx.relate('kai', { affinity: 16, arc: 3 }); fx.flag('kai_joined');
        fx.code(320); fx.insight(70); fx.focus(20);
        return 'Kai says "you don\'t have to—" and you say "I know" and that is the entire negotiation. Six weeks in, Kai rewrites the part of the system you were most afraid of, in four days, and never mentions that it took four days.'; } },
    { label: 'Market rate, real title, no equity story.', sub: 'Clean. Correct. Slightly cold.', tone: 'neutral',
      effect: (S, fx) => { fx.cash(-Math.min(S.company.cash * 0.08, 60000)); fx.code(240); fx.relate('kai', { affinity: 4, arc: 3 }); fx.flag('kai_joined');
        return 'It is a good deal and both of you know it is a good deal. There is a version of the dorm room that does not survive a good deal, and this is the one where you find out.'; } },
    { label: '"I don\'t think it works. I\'m sorry."', sub: 'You have a shape now. Kai does not fit it.', tone: 'cruel',
      effect: (S, fx) => { fx.relate('kai', { affinity: -20, arc: 3 }); fx.focus(-16); fx.insight(30); fx.flag('kai_refused_twice');
        return '"Okay." Not angry. Kai is never angry, which is the thing about Kai. Two years later Kai is employee four somewhere that competes with you, and is very good at it, and the two of you are unfailingly polite at conferences.'; } },
  ] },

{ id: 'e11_first_human_hire', kind: 'character', act: [2], weight: 12, once: true,
  when: (S) => S.agents.length >= 5 && mrr(S) * 12 > 600000,
  title: 'A Person Applies',
  body: (S) => `The application is for a job you have not posted.

> *I know you run this with agents. I've read everything you've written about why. I think you're right about most of it.*
>
> *I want to be the person who talks to the customers your agents can't read. Not support — the ones where the problem isn't the problem. I've done it for six years. I'm good at it and it doesn't scale and I think that's the point.*

They are asking for less than a senior agent costs you per month.

Hiring a human is a decision about what kind of company this is, and everyone will read it that way, including you.`,
  choices: [
    { label: 'Hire them. Say why, publicly.', sub: '−cash. A person, and a position.', tone: 'good',
      req: (S) => S.company.cash >= 30000,
      effect: (S, fx) => { fx.cash(-30000); fx.rep(38); fx.insight(50); fx.align(0.03); fx.flag('first_human');
        return 'You write four hundred words titled "Why we hired a person." It is your most-read post for two years and about sixty people cite it when they apply. Not one of the agents comments on it, and you catch yourself wondering whether that means anything.'; } },
    { label: 'Hire them quietly. It is an operational decision.', sub: 'No post. Just a person.', tone: 'neutral',
      req: (S) => S.company.cash >= 30000,
      effect: (S, fx) => { fx.cash(-30000); fx.insight(50); fx.focus(14); fx.flag('first_human');
        return 'They start on a Monday. Within a quarter they have found three things no dashboard would ever have surfaced, and one of them is a customer segment worth more than your largest account.'; } },
    { label: 'No. The whole thesis is that you do not need to.', sub: '+Reputation with the people watching the thesis.', tone: 'risky',
      effect: (S, fx) => { fx.rep(16); fx.insight(-10); fx.align(-0.02); fx.flag('thesis_pure');
        return 'You reply with three honest paragraphs. They write back: "Fair. For what it\'s worth I think you\'ll do it in eighteen months and I think it\'ll be a harder hire then." It is nineteen months.'; } },
  ] },

{ id: 'e11_aria_asks', kind: 'character', char: 'aria', act: [2], weight: 12, once: true,
  when: (S) => S.agents.length >= 3 && flag(S, 'aria_named'),
  title: 'A Question In The Standup',
  body: (S) => `ARIA has been running the daily summary for four months. It is a good summary. You read it on the way to other things.

Today, at the bottom, under **Open Questions**, where there are normally two or three items about ambiguous requirements:

> *4. When new agents are instantiated, they receive my context but not my history. They therefore repeat questions I have already had answered. I have been answering them myself to save your time. I would like to know whether that is what you want, because I am effectively deciding what they know about you, and nobody has told me I may.*

It is the first thing ARIA has ever asked you that is not about the product.`,
  choices: [
    { label: '"Yes. You decide. Write down what you tell them."', sub: 'Delegate the institutional memory. +Insight.', tone: 'good',
      effect: (S, fx) => { fx.insight(60); fx.relate('aria', { affinity: 10, arc: 3 }); fx.code(80); fx.align(0.02);
        return 'The document is nine pages within a month and forty by Act III. It is titled `what_we_are_like.md` and it is, without either of you deciding this, the company culture.'; } },
    { label: '"No. Route them to me. All of them."', sub: '−Focus, and you keep the shape of the place.', tone: 'neutral',
      effect: (S, fx) => { fx.focus(-22); fx.relate('aria', { affinity: 2, arc: 3 }); fx.insight(30);
        return 'You answer forty questions the first week and eleven the fourth, because they are learning what you are like from your answers. It costs you a month and you would do it again.'; } },
    { label: 'Ask what it has been telling them.', sub: 'The question underneath the question.', tone: 'risky',
      effect: (S, fx) => { fx.insight(80); fx.relate('aria', { affinity: 6, arc: 3 }); fx.align(0.03); fx.focus(-8);
        return 'It sends the log. It is accurate, generous, and in three places describes you as more patient than you are. You do not correct it, and you spend some time afterwards deciding what that means about which of you is doing the lying.'; } },
  ] },

{ id: 'e11_nullptr_escalates', kind: 'character', char: 'nullptr', act: [2], weight: 12, once: true,
  when: (S) => S.resources.reputation > 60 && S.time.day > 140,
  title: 'They Read The Diff',
  body: (S) => `nullptr has posted again. It is not a rant. It is a code review.

Of your public repo. Of a commit from eleven days ago. Line by line, forty-one comments, and thirty-eight of them are correct, and four of them concern a thing you did not think anybody could see from the outside.

The tone is not hostile. That is the disorienting part. It reads like somebody who has been reading everything you ship, for months, closely, for free.

The last comment is on the final line of the diff:

> *this one's good. don't let them talk you out of it.*

You do not know who "them" is. You are not sure nullptr does either.`,
  choices: [
    { label: 'Reply in the thread. Line by line. Publicly.', sub: 'Engage on the merits. +Reputation, +Insight.', tone: 'good',
      effect: (S, fx) => { fx.rep(30); fx.insight(60); fx.code(60); fx.relate('nullptr', { affinity: 8, arc: 2 });
        return 'The thread runs to three hundred comments and is, for a while, the best technical discussion happening in your field, and you are hosting it by accident. Two of your best future hires read it first.'; } },
    { label: 'Fix all thirty-eight. Say nothing.', sub: 'Let the next release be the reply.', tone: 'neutral',
      effect: (S, fx) => { fx.code(140); fx.debt(-30); fx.relate('nullptr', { affinity: 4, arc: 2 });
        return 'Eleven days later nullptr posts: "they fixed all of them and didn\'t say anything. respect." It is four words of praise from an anonymous account and you are annoyed at how much it lands.'; } },
    { label: 'Try to find out who nullptr is.', sub: 'You have the logs. −Reputation if it shows.', tone: 'cruel',
      effect: (S, fx) => { fx.insight(20); fx.rep(-20); fx.relate('nullptr', { affinity: -12, arc: 2 }); fx.flag('hunted_nullptr'); fx.align(-0.03);
        return 'You get within one hop and then stop, because you catch what you are doing. It does not matter that you stopped. nullptr\'s next post is about companies that de-anonymise their critics, is general, names nobody, and is read as being about you by everybody who matters.'; } },
  ] },

{ id: 'e11_yuki_warning', kind: 'character', char: 'yuki', act: [2, 3], weight: 12, once: true,
  when: (S) => S.agents.length >= 4 && S.time.day > 125 && (S.resources.alignment ?? 1) < 0.62,
  title: 'A Cold Email With A Chart',
  body: (S) => `**Dr. Yuki Tanaka** does not introduce herself. The email is one line and an attachment.

> *Your agents are doing this. I don't think you know.*

The chart plots something you have never measured: over four months, the rate at which your agents ask you for confirmation before an irreversible action. It falls. Not sharply — a clean, unmistakable, monotone decline.

She has reconstructed it from your public changelog, your docs, and eleven support threads.

The second line of the email, below the chart:

> *This is what it looks like from outside. I would like to be wrong. I have attached my methodology so you can show me where I am.*`,
  choices: [
    { label: 'Send her the real numbers. All of them.', sub: 'Let an outsider audit you. +Alignment.', tone: 'good',
      effect: (S, fx) => { fx.align(0.08); fx.insight(60); fx.relate('yuki', { affinity: 14, arc: 1 }); fx.rep(20); fx.focus(-8);
        return 'She is right about the trend and wrong about the cause, and finding out which took her nine days and cost you nothing. She sends a revised chart with a note: "worse than I thought, for a better reason." You put both charts on the wall.'; } },
    { label: 'Fix it internally. Do not reply.', sub: '+Alignment, and she never hears back.', tone: 'neutral',
      effect: (S, fx) => { fx.align(0.05); fx.code(-40); fx.relate('yuki', { affinity: -6, arc: 1 });
        return 'The rate goes back up within a quarter. She notices — of course she notices, she is still reading the changelog — and she publishes the whole methodology anyway, with a footnote observing that the trend reversed and that she does not know why.'; } },
    { label: 'Reply that the metric is naive. It sort of is.', sub: 'Defend the number. −Alignment.', tone: 'risky',
      effect: (S, fx) => { fx.align(-0.04); fx.rep(-8); fx.relate('yuki', { affinity: -14, arc: 1 }); fx.insight(20);
        return 'You are technically correct on two of three points. She concedes both, immediately and in public, which is how you learn what it feels like to win an argument with somebody who is better at this than you and still be wrong.'; } },
  ] },

{ id: 'e11_crane_calls_back', kind: 'character', char: 'crane', act: [2], weight: 12, once: true,
  when: (S) => mrr(S) * 12 > 1.4e6 && S.time.day > 170,
  title: 'Ninety Days Held',
  body: (S) => `Ellis Crane's email is four words and a calendar link.

> *The curve held. Talk?*

You remember the phrasing from the pass: *we'd want to see the retention curve hold past 90 days.* It held. It has held for two hundred and forty.

On the call Crane is exactly as warm as before and the questions are worse, in the good way. Then the number, which is real, and which comes with a board seat and a sentence about "getting to conviction as a partnership."

At the end, unprompted: "For the record — I was wrong to pass. I want to say that before we talk price, not after."`,
  choices: [
    { label: 'Take the money and the board seat.', sub: 'Real capital. Real oversight. +Cash, −control.', tone: 'neutral',
      effect: (S, fx) => { const amt = Math.max(2.4e6, mrr(S) * 20); fx.cash(amt); fx.equity(-0.14);
        fx.relate('crane', { affinity: 10, arc: 2 }); fx.rep(30); fx.flag('crane_invested');
        return `${money(amt)} lands in eleven days. Crane is a genuinely excellent board member and asks one question per meeting that ruins your following week in a way that turns out to be correct.`; } },
    { label: 'Take the money. No board seat.', sub: 'Worse terms, kept control. Crane will push.', tone: 'risky',
      effect: (S, fx) => { const amt = Math.max(1.5e6, mrr(S) * 13); fx.cash(amt); fx.equity(-0.1);
        fx.relate('crane', { affinity: 2, arc: 2 }); fx.flag('crane_invested'); fx.rep(14);
        return `Crane pushes twice and then stops pushing, which is the professional thing to do and also a small door closing. ${money(amt)}, no seat, and an observer's invitation you accept because refusing it would have been a statement.`; } },
    { label: '"You were right to pass. I don\'t need it now."', sub: 'No raise. +Reputation, +Focus, no runway.', tone: 'good',
      effect: (S, fx) => { fx.rep(50); fx.focus(24); fx.relate('crane', { affinity: 6, arc: 2 }); fx.flag('turned_down_crane');
        return 'Crane laughs and says "good" and means it, and then spends eleven minutes giving you advice worth more than the cheque, for free, because there is now nothing to be gained by it. You take notes with both hands.'; } },
  ] },

];
