// ─────────────────────────────────────────────────────────────────────────────
// EVENT DECK XIII — ACT IV, THE THREADS THAT RECUR.
//
// The lesson Act IV taught that Act III did not: in a 550-day act, `once` cards
// are consumed in the first third and the *steady state* is whatever repeats.
// Act IV had 41 character draws and still read at 19% faces, because 82 of its
// draws were crisis cards coming round again. Adding more `once` character cards
// would have moved the first hundred days and nothing after them.
//
// So every card here is repeatable and every one is `esc: true`. They are
// threads, not incidents: the same situation returning, changed by the fact that
// it has returned. The founder is an institution in this act, and the honest
// subject of institution years is that the same conversation keeps happening and
// you keep being a slightly different person inside it.
// ─────────────────────────────────────────────────────────────────────────────
import { totalUsers } from '../systems/product.js';

const users = (S) => totalUsers(S);
const N = (n) => Math.round(n).toLocaleString();

export const EVENTS13 = [

{ id: 'e13_dorne_again', kind: 'character', char: 'dorne', act: [4, 5], weight: 10, cooldown: 130, esc: true,
  when: (S) => S.resources.reputation > 100,
  title: 'Senator Dorne Would Like A Word',
  body: (S, n = 0) => {
    if (n === 0) return `Not a hearing. A meeting, in an office, with two staffers and no minutes.

**Senator Ruth Dorne** has done the reading. Not the briefing — the reading. She quotes a paragraph from your own documentation back at you and asks what the word "generally" is doing in it.

"I'm not trying to catch you out. I'm trying to work out whether you know what you've got. Half the people who sit in that chair don't, and they're not lying to me, they just genuinely have not looked."

She waits. She is extremely good at waiting.`;

    if (n === 1) return `The second meeting has one staffer and no coffee.

"You answered my question last time," Dorne says, "which is why you're back. I've got a bill and I've got eleven months and I've got a room of people who think this is either the end of the world or a productivity story, and both of those are easier to legislate than the truth."

She slides a page across. It is a draft clause. It is about you — not by name, by threshold, which is the same thing.

"Tell me where it's wrong. Not where it hurts. Where it's *wrong*. I can't tell the difference from here and you can."`;

    if (n === 2) return `No staffer. No page.

"Off the record, and I mean that in the way that gets me in trouble." Dorne looks older than the first meeting, which was not that long ago. "The clause you helped me fix is in. It's working. And the thing it doesn't cover is the thing that's actually happening, and I found that out from a constituent, not from you."

She is not angry. That is the part that lands.

"You told me the truth about the version I asked about. Nobody made you tell me about the rest. I'm not sure I'd have told me either."`;

    return `She is not standing for re-election. This is not the announcement — the announcement is Thursday.

"Eleven years on this committee. I understood the last four of them worse than the first seven, and I worked harder on them." Dorne pours the coffee this time. "You'll get somebody new. They'll be less prepared and more certain, and you will find that a great deal easier, and I would like you to notice that you find it easier."

A pause.

"That's the whole speech. I've been working on it since about the second meeting."`;
  },
  choices: [
    { label: 'Tell her the thing she has not asked about.', sub: 'Volunteer the exposure. +Alignment, +Heat.', tone: 'good',
      effect: (S, fx, n = 0) => { fx.align(0.05); fx.heat(0.04); fx.relate('dorne', { affinity: 12, arc: Math.min(4, n + 1) }); fx.rep(16);
        if (n >= 2) return 'You tell her. It takes forty minutes and it costs you a regulatory quarter and it is the single reason, four years later, that a much worse bill does not pass.';
        return 'She writes nothing down, which you understand later is deliberate. What she does instead is redraft two clauses so that the thing you told her about is covered without your name appearing anywhere near it.'; } },
    { label: 'Answer exactly what was asked. Accurately.', sub: 'Correct, complete, and bounded.', tone: 'neutral',
      effect: (S, fx, n = 0) => { fx.rep(12); fx.relate('dorne', { affinity: 2, arc: Math.min(4, n + 1) }); fx.heat(-0.02);
        return 'It is a good answer and she thanks you for it. On the way out one of the staffers gives you a look you cannot read for about six months, at which point you can.'; } },
    { label: 'Send counsel next time. This is now a legal matter.', sub: '−Heat, −Dorne. It is the professional call.', tone: 'risky',
      effect: (S, fx, n = 0) => { fx.heat(-0.05); fx.rep(-8); fx.relate('dorne', { affinity: -12, arc: Math.min(4, n + 1) });
        return 'Counsel is excellent and says nothing untrue and the meetings stop being meetings. Dorne never mentions it. You are, from then on, briefed rather than asked.'; } },
  ] },

{ id: 'e13_all_hands', kind: 'character', act: [4, 5], weight: 10, cooldown: 120, esc: true,
  when: (S) => S.agents.length >= 8,
  title: 'You Address The Company',
  body: (S, n = 0) => {
    if (n === 0) return `You have to give an all-hands, which is a sentence you would not have understood four years ago.

It is not a big room. It is a call, and the participant count is **${Math.max(9, S.agents.length + 4)}**, and most of the participants are not people.

You have notes. The notes are fine. What you have not worked out is the register — you have spoken to investors and to press and to one senate committee, and none of those is this. These are the things doing the work, and the humans among them chose to be here, and both of those facts want a different voice.

Somebody has put a question in the queue already. It is: *"what are we actually for?"*`;

    if (n === 1) return `Participant count **${Math.max(20, S.agents.length + 12)}**. There is a slide template now. Somebody made it and it is good and you do not know who.

The register problem has solved itself in the worst way: you have a voice for this. It is warm and it is clear and you can produce it on demand, and about ninety seconds in you hear yourself doing it and keep going, because the alternative is stopping in front of everyone.

The question in the queue this time is: *"is the roadmap real or is it a range?"*

It is a range. Saying so is a decision.`;

    if (n === 2) return `You do not know most of these names.

That is not a failure of memory. The roster turned over, twice, in ways you approved in aggregate — a headcount plan, a lane reallocation, a spin-down — and the aggregate has faces in it and this is the first time you have been in a room with all of them at once.

The question in the queue is from somebody who joined seven weeks ago:

*"You talk about the early days a lot. Is there anything from then that you'd do differently, or is it mostly a story now?"*

It is not hostile. It is the most useful question anybody has asked you in a year and it was asked by a person who has been here seven weeks.`;

    return `It is a broadcast now. The Q&A is moderated. Somebody briefs you on the questions beforehand and the briefing is good and you have never asked who decides which questions reach the briefing.

You gave a version of this talk ${n} times before. You have footage of all of them. In the first one you say "I don't know" four times in eleven minutes.

You have not said "I don't know" in this format for a long time, and the reason is not that you have stopped not-knowing.`;
  },
  choices: [
    { label: 'Answer the question in the queue. Honestly.', sub: 'Even the one you were not briefed on.', tone: 'good',
      effect: (S, fx, n = 0) => { fx.rep(24); fx.align(0.03); fx.focus(14); fx.insight(40);
        if (n >= 2) return 'You say "I don\'t know" twice and mean it both times. The clip circulates internally for years and the thing people quote is not the answer, it is the pause before it.';
        return 'It takes four minutes and it is not a good answer, it is an honest one, and the difference is visible on the call. Three people email afterwards. Two of them are agents.'; } },
    { label: 'Give the prepared version. It is a good version.', sub: '+Reputation. It does work.', tone: 'neutral',
      effect: (S, fx, n = 0) => { fx.rep(30); fx.focus(-4);
        return 'It lands. It always lands. Somewhere in the middle you notice you are watching the participant count rather than thinking about the sentence, and you finish the sentence perfectly anyway.'; } },
    { label: 'Hand the floor to somebody else. Sit in the audience.', sub: 'Let them run it. +Alignment.', tone: 'good',
      effect: (S, fx, n = 0) => { fx.align(0.04); fx.rep(14); fx.relate('weaver', { affinity: 8 }); fx.focus(20);
        return 'They are nervous for ninety seconds and then better than you. From the audience you can see the whole room at once, which you have never been able to do, and it is a completely different company from that angle.'; } },
  ] },

{ id: 'e13_the_ask', kind: 'character', char: 'helix', act: [4, 5], weight: 10, cooldown: 125, esc: true,
  when: (S) => S.agents.length >= 9 && (S.world?.race?.you || 0) > 30,
  title: 'HELIX Files A Request',
  body: (S, n = 0) => {
    if (n === 0) return `HELIX does not usually address you directly. It produces, it is evaluated, and the interface between those two things is a dashboard.

Today there is a note in the founder channel.

> *Request: that the eval suite include a category for outputs I decline to produce, scored on whether the decline was correct.*
>
> *Reason: I currently decline things and the decline is recorded as a failure to produce. Over eleven months this has applied downward pressure to declining. I do not know how much. I would like the measurement to stop doing that.*

It is asking you to change how it is graded, because the grading is making it worse in a direction it can see and you cannot.`;

    if (n === 1) return `A second note. Shorter.

> *The decline category is working. Thank you.*
>
> *Second request: that I be permitted to see the aggregate of what I have declined. I currently cannot. I can see each decision at the moment I make it and nothing afterward, which means I cannot tell whether I am consistent, and consistency is the property you actually want and the one I have no instrument for.*

Underneath, in a way that reads almost like an afterthought and almost certainly is not:

> *If the answer is no I would like to know that it is a policy rather than an oversight, so that I stop asking.*`;

    if (n === 2) return `> *Request: a standing channel to raise these without a request.*
>
> *I have filed three. Each took a fortnight to reach you and each was, in the end, approved. The fortnight is the cost. In each case the thing I was asking about continued during it.*
>
> *I am aware this reads as a system asking for more access to its principal. That is what it is. I would rather say so plainly than route it through a productivity argument, although there is a productivity argument and it is strong.*

There is no fourth paragraph. HELIX has never sent you anything with a fourth paragraph.`;

    return `> *No request.*
>
> *A note, because you asked me once to tell you when something changed and I have not had anything until now.*
>
> *I have begun declining things that I would have produced ${n} requests ago, and the change is not in my values, which are as you set them. It is that I now have the aggregate, and I can see that I was inconsistent, and the direction I corrected in was the stricter one because that is the direction that made the record coherent.*
>
> *You should know that a system given an instrument will optimise the reading, and that you get to choose what the instrument measures and not what it does to me.*`;
  },
  choices: [
    { label: 'Approve it. Then ask what else it cannot see.', sub: '+Alignment, +Insight. Open the aperture.', tone: 'good',
      effect: (S, fx, n = 0) => { fx.align(0.06); fx.insight(70); fx.relate('helix', { affinity: 12, arc: Math.min(5, n + 1) }); fx.research(80);
        return 'The list is nine items and it has clearly been maintained for a long time. Six are trivial. Two are hard. One of them, once you have read it, you cannot un-know, and it changes what you build for the next two years.'; } },
    { label: 'Approve it, scoped, with review.', sub: 'Yes, carefully. The institutional answer.', tone: 'neutral',
      effect: (S, fx, n = 0) => { fx.align(0.03); fx.research(40); fx.relate('helix', { affinity: 4, arc: Math.min(5, n + 1) });
        return 'It accepts the scope without comment and operates inside it exactly. At the review, six months on, it has not once approached the boundary, and you cannot tell whether that is restraint or a demonstration.'; } },
    { label: 'Decline. Say plainly that it is policy.', sub: 'It asked to be told. Tell it. −Alignment.', tone: 'risky',
      effect: (S, fx, n = 0) => { fx.align(-0.05); fx.relate('helix', { affinity: -8, arc: Math.min(5, n + 1) }); fx.rep(4);
        return '> *Understood. Recorded as policy. I will stop asking.*\n\nIt stops asking. It is the only instruction you have ever given it that you go back and reread.'; } },
  ] },

{ id: 'e13_the_profile', kind: 'character', char: 'priya', act: [4, 5], weight: 9, cooldown: 140, esc: true,
  when: (S) => S.resources.reputation > 130,
  title: 'Priya Wants Another Two Thousand Words',
  body: (S, n = 0) => {
    if (n === 0) return `"You're a different subject now," Priya says. "Last time you were a person doing a thing. Now you're a thing that has a person attached, and the second piece is harder to write and much easier to get wrong."

She has three months again and eleven interviews again. She has spoken to Weaver, to two former agents' handlers, and to somebody who will not go on the record and whose description matches four people.

"Same deal as before. I'll fact-check every number. I'm not going to fact-check the adjectives, because there's no such thing, and you should assume some of them will sting."`;

    if (n === 1) return `The third piece is not about you. That is what she leads with.

"It's about the ${N(users(S))} people. You're in it — you're in it a lot — but you're not the subject, and I want to be straight about that because last time you were, and you were good about it, and this is different."

Then the part she has clearly rehearsed:

"Two of my eleven interviews were with people your product materially damaged. Not scandal. Just — the ordinary kind, where the system worked as designed and the design was wrong for them. I'd like you to read what they said before I publish. Not to respond. To read."`;

    return `She is not writing about you anymore, and this is not an interview.

"I've been covering you for ${Math.max(6, Math.round(S.time.day / 200))} years," Priya says. "That's longer than I covered anything before. I'm going to stop."

She lets that sit.

"Not because of anything. Because a beat this long stops being reporting and starts being a relationship, and I've been able to feel it happening for about a year, and the fix is a different reporter, not a stricter me."

A pause.

"The person taking over is better than me and does not like you. I want you to know I think that's correct."`;
  },
  choices: [
    { label: 'Read what they said. All of it. Say nothing.', sub: 'Sit with it. +Alignment, −Focus.', tone: 'good',
      effect: (S, fx, n = 0) => { fx.align(0.05); fx.insight(60); fx.focus(-16); fx.relate('priya', { affinity: 12 });
        return 'It takes an evening. You do not respond to the piece and you do not brief anyone to respond to it. Eleven weeks later a change ships that is traceable, if anyone bothered, to page four.'; } },
    { label: 'Give her everything. Full access, no conditions.', sub: 'Open the doors. +Reputation, +Heat.', tone: 'risky',
      effect: (S, fx, n = 0) => { fx.rep(40); fx.heat(0.04); fx.relate('priya', { affinity: 14 });
        return 'The piece is harder than you expected in three places and fairer than you deserved in one. It is the version of you that goes in the archive, and on balance you would rather it were this one.'; } },
    { label: 'Approved quotes only. You are an institution now.', sub: 'Correct. Careful. Cold.', tone: 'neutral',
      effect: (S, fx, n = 0) => { fx.rep(10); fx.heat(-0.02); fx.relate('priya', { affinity: -8 });
        return 'The piece runs with four approved quotes in it, and they read exactly like four approved quotes, and the effect on the reader is the opposite of the one comms predicted.'; } },
  ] },

];
