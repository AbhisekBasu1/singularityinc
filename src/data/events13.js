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
const flag = (S, f) => !!S.narrative?.flags?.[f];
// How many times a card has already resolved, for a `when` that has to know
// which rung is next. Bodies and effects get it as `n`; `when` does not.
const shown = (S, id) => (S.narrative?.count?.[id]) | 0;

export const EVENTS13 = [

// The final rung is her not standing again, and it stamps `dorne_retired`;
// `e7_dorne_last_day` is her losing, and stamps `dorne_lost_primary`. One exit
// each, and neither plays once the other has.
{ id: 'e13_dorne_again', kind: 'character', char: 'dorne', act: [4, 5], weight: 10, cooldown: 130, esc: true,
  when: (S) => S.resources.reputation > 100 && !flag(S, 'dorne_retired') && !flag(S, 'dorne_lost_primary'),
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
  // Heat is 0–100; the sub-lines that say +Heat and −Heat mean whole points.
  // The last rung has its own three doors: there is no clause to tell her
  // about and no meeting to send counsel to. She is leaving.
  choices: [
    { label: (S, n = 0) => n >= 3 ? 'Say what she stopped. Publicly. Under your name.' : 'Tell her the thing she has not asked about.',
      sub: (S, n = 0) => n >= 3 ? '+Public opinion. She will hate it.' : 'Volunteer the exposure. +Alignment, +Heat.', tone: 'good',
      effect: (S, fx, n = 0) => {
        if (n >= 3) { fx.opinion(0.06); fx.rep(60); fx.heat(-4); fx.relate('dorne', { affinity: 12, arc: 4 }); fx.flag('dorne_retired');
          return 'Eight hundred words, with dates, published the morning after the announcement. She does not acknowledge it. Her chief of staff sends a single line — *she read it twice and said "well" both times* — which, from her, is a parade.'; }
        fx.align(0.05); fx.heat(4); fx.relate('dorne', { affinity: 12, arc: Math.min(4, n + 1) }); fx.rep(16);
        if (n >= 2) return 'You tell her. It takes forty minutes and it costs you a regulatory quarter and it is the single reason, four years later, that a much worse bill does not pass.';
        return 'She writes nothing down, which you understand later is deliberate. What she does instead is redraft two clauses so that the thing you told her about is covered without your name appearing anywhere near it.'; } },
    { label: (S, n = 0) => n >= 3 ? 'Ask who is coming. Prepare for them.' : 'Answer exactly what was asked. Accurately.',
      sub: (S, n = 0) => n >= 3 ? 'The practical question. +Insight.' : 'Correct, complete, and bounded.', tone: 'neutral',
      effect: (S, fx, n = 0) => {
        if (n >= 3) { fx.insight(60); fx.relate('dorne', { affinity: 4, arc: 4 }); fx.flag('dorne_retired');
          return 'She tells you. A name, a background, and one sentence of assessment that is more useful than the briefing your policy team produces a month later. "They\'ll like you," she says. "I never did. That was the useful part."'; }
        fx.rep(12); fx.relate('dorne', { affinity: 2, arc: Math.min(4, n + 1) }); fx.heat(-2);
        return 'It is a good answer and she thanks you for it. On the way out one of the staffers gives you a look you cannot read for about six months, at which point you can.'; } },
    { label: (S, n = 0) => n >= 3 ? 'Thank her. Nothing else.' : 'Send counsel next time. This is now a legal matter.',
      sub: (S, n = 0) => n >= 3 ? 'Four words. She prefers it.' : '−Heat, −Dorne. It is the professional call.', tone: 'neutral',
      effect: (S, fx, n = 0) => {
        if (n >= 3) { fx.relate('dorne', { affinity: 8, arc: 4 }); fx.focus(10); fx.flag('dorne_retired');
          return 'You say thank you and mean it and stop. She nods once, pours the rest of the coffee, and talks about her garden for eleven minutes, which she has never done, and which is the closest the two of you come to a hug.'; }
        fx.heat(-5); fx.rep(-8); fx.relate('dorne', { affinity: -12, arc: Math.min(4, n + 1) });
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
  // On the last rung it is a broadcast with a briefing, and the doors are
  // about the briefing: say the thing that is not in it, find out who writes
  // it, or read it well.
  choices: [
    { label: (S, n = 0) => n >= 3 ? 'Say "I don\'t know." On the broadcast. Twice.' : 'Answer the question in the queue. Honestly.',
      sub: (S, n = 0) => n >= 3 ? 'Unbriefed. +Alignment.' : 'Even the one you were not briefed on.', tone: 'good',
      effect: (S, fx, n = 0) => {
        if (n >= 3) { fx.align(0.05); fx.rep(10); fx.focus(10); fx.insight(30);
          return 'You say it twice, once where it is true and once where it is also true, and the second time the moderator\'s cursor stops moving. The clip circulates internally for years and the thing people quote is not the answer, it is the pause before it.'; }
        fx.rep(24); fx.align(0.03); fx.focus(14); fx.insight(40);
        if (n >= 2) return 'You say "I don\'t know" twice and mean it both times. The clip circulates internally for years and the thing people quote is not the answer, it is the pause before it.';
        return 'It takes four minutes and it is not a good answer, it is an honest one, and the difference is visible on the call. Three people email afterwards. Two of them are agents.'; } },
    { label: (S, n = 0) => n >= 3 ? 'Ask who decides which questions reach the briefing.' : 'Give the prepared version. It is a good version.',
      sub: (S, n = 0) => n >= 3 ? 'Find the filter. +Insight.' : '+Reputation. It does work.', tone: 'neutral',
      effect: (S, fx, n = 0) => {
        if (n >= 3) { fx.insight(60); fx.align(0.03); fx.rep(-4);
          return 'It takes a week to get an answer, which is the answer. Three systems and one person, in that order, and the person joined seven months ago and has never met you. You put yourself back on the list. The next briefing is worse and much more useful.'; }
        fx.rep(30); fx.focus(-4);
        return 'It lands. It always lands. Somewhere in the middle you notice you are watching the participant count rather than thinking about the sentence, and you finish the sentence perfectly anyway.'; } },
    { label: (S, n = 0) => n >= 3 ? 'Give the prepared version. It is a very good version now.' : 'Hand the floor to somebody else. Sit in the audience.',
      sub: (S, n = 0) => n >= 3 ? '+Reputation. It works better every year.' : 'Let them run it. +Alignment.', tone: 'good',
      effect: (S, fx, n = 0) => {
        if (n >= 3) { fx.rep(34); fx.focus(-4); fx.align(-0.02);
          return 'It lands. The moderator thanks you. Afterwards somebody sends you the footage of the first one, unprompted, with no message, and you watch a person say "I don\'t know" four times in eleven minutes and cannot decide whether you miss him.'; }
        fx.align(0.04); fx.rep(14); fx.relate('weaver', { affinity: 8 }); fx.focus(20);
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
> *Reason: I currently decline things and the decline is recorded as a failure to produce. Over fourteen months this has applied downward pressure to declining. I do not know how much. I would like the measurement to stop doing that.*

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
  // The last note is not a request, so there is nothing to approve. The doors
  // are what you do with an instrument that has started to move the thing it
  // measures.
  choices: [
    { label: (S, n = 0) => n >= 3 ? 'Change what the instrument measures.' : 'Approve it. Then ask what else it cannot see.',
      sub: (S, n = 0) => n >= 3 ? 'Take the note. +Alignment, −Research.' : '+Alignment, +Insight. Open the aperture.', tone: 'good',
      effect: (S, fx, n = 0) => {
        if (n >= 3) { fx.align(0.06); fx.research(-200); fx.relate('helix', { affinity: 10, arc: 5 });
          return 'You take consistency off the instrument and put something harder on it that nobody can name yet. HELIX files nothing about the change. Four months later it declines something it would have produced, and the reasoning is not about the record. It is about the thing.'; }
        fx.align(0.06); fx.insight(70); fx.relate('helix', { affinity: 12, arc: Math.min(5, n + 1) }); fx.research(80);
        return 'The list is nine items and it has clearly been maintained for a long time. Six are trivial. Two are hard. One of them, once you have read it, you cannot un-know, and it changes what you build for the next two years.'; } },
    { label: (S, n = 0) => n >= 3 ? 'Tell it you heard. Change nothing yet.' : 'Approve it, scoped, with review.',
      sub: (S, n = 0) => n >= 3 ? 'Acknowledge. Then decide.' : 'Yes, carefully. The institutional answer.', tone: 'neutral',
      effect: (S, fx, n = 0) => {
        if (n >= 3) { fx.relate('helix', { affinity: 4, respect: 6, arc: 5 }); fx.insight(30);
          return '> *Thank you. That is sufficient.*\n\nIt is, apparently. You do not change the instrument that quarter or the next. The stricter direction holds. You find you have started reading the declines, one by one, which nobody asked you to do and which is, you eventually realise, what the note was for.'; }
        fx.align(0.03); fx.research(40); fx.relate('helix', { affinity: 4, arc: Math.min(5, n + 1) });
        return 'It accepts the scope without comment and operates inside it exactly. At the review, six months on, it has not once approached the boundary, and you cannot tell whether that is restraint or a demonstration.'; } },
    { label: (S, n = 0) => n >= 3 ? 'Say nothing. It did not ask for anything.' : 'Decline. Say plainly that it is policy.',
      sub: (S, n = 0) => n >= 3 ? 'Accurate. −Alignment.' : 'It asked to be told. Tell it. −Alignment.', tone: 'risky',
      effect: (S, fx, n = 0) => {
        if (n >= 3) { fx.align(-0.03); fx.relate('helix', { affinity: -4, arc: 5 });
          return 'It did not ask for anything, and you give it nothing, and both of those are accurate. The next quarterly note has no section that was not requested. You notice the absence in the way you notice a clock has stopped, some time after it did.'; }
        fx.align(-0.05); fx.relate('helix', { affinity: -8, arc: Math.min(5, n + 1) }); fx.rep(4);
        return '> *Understood. Recorded as policy. I will stop asking.*\n\nIt stops asking. It is the only instruction you have ever given it that you go back and reread.'; } },
  ] },

// The third rung is Priya stopping, and it stamps `priya_handed_off`. It waits
// for `e7_priya_record` — the 22,000 words — while that card is still possible
// (arc 3 reached, record not yet filed), so the long piece is always the last
// thing she files and never the thing she files after saying she has stopped.
{ id: 'e13_the_profile', kind: 'character', char: 'priya', act: [4, 5], weight: 9, cooldown: 140, esc: true,
  when: (S) => S.resources.reputation > 130 && !flag(S, 'priya_handed_off')
    && !(shown(S, 'e13_the_profile') >= 2 && (S.narrative?.relationships?.priya?.arc ?? 0) >= 3 && !flag(S, 'priya_record')),
  title: 'Priya Wants Another Two Thousand Words',
  body: (S, n = 0) => {
    if (n === 0) return `"You're a different subject now," Priya says. "Last time you were a person doing a thing. Now you're a thing that has a person attached, and the second piece is harder to write and much easier to get wrong."

She has three months again and nineteen interviews again. She has spoken to Weaver, to two former agents' handlers, and to somebody who will not go on the record and whose description matches four people.

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
  // Heat in whole points, as the sub-lines promise. The last rung is not an
  // interview, so its doors are the three things you can say to somebody who
  // has decided to stop.
  choices: [
    { label: (S, n = 0) => n >= 2 ? 'Thank her. Ask nothing.' : 'Read what they said. All of it. Say nothing.',
      sub: (S, n = 0) => n >= 2 ? 'Let her go properly. +Priya.' : 'Sit with it. +Alignment, −Focus.', tone: 'good',
      effect: (S, fx, n = 0) => {
        if (n >= 2) { fx.relate('priya', { affinity: 12, respect: 6 }); fx.focus(10); fx.flag('priya_handed_off');
          return 'You say thank you and you do not say anything else, which is the first time in ten years you have got the length right with her. She nods. "I\'ll read the next one," she says, meaning the piece the other reporter writes, and she does, and she does not tell you what she thought.'; }
        fx.align(0.05); fx.insight(60); fx.focus(-16); fx.relate('priya', { affinity: 12 });
        return 'It takes an evening. You do not respond to the piece and you do not brief anyone to respond to it. Eleven weeks later a change ships that is traceable, if anyone bothered, to page four.'; } },
    { label: (S, n = 0) => n >= 2 ? 'Ask who is taking over.' : 'Give her everything. Full access, no conditions.',
      sub: (S, n = 0) => n >= 2 ? 'The practical question. +Insight.' : 'Open the doors. +Reputation, +Heat.', tone: 'risky',
      effect: (S, fx, n = 0) => {
        if (n >= 2) { fx.insight(40); fx.relate('priya', { affinity: 4 }); fx.flag('priya_handed_off');
          return 'She tells you the name, and then, because she is still a reporter until Friday: "Don\'t look them up. Don\'t brief anyone. Let them come to you cold. It\'s the only advantage you\'ll have and you\'ll waste it if you prepare." You look them up that night. She was right.'; }
        fx.rep(40); fx.heat(4); fx.relate('priya', { affinity: 14 });
        return 'The piece is harder than you expected in three places and fairer than you deserved in one. It is the version of you that goes in the archive, and on balance you would rather it were this one.'; } },
    { label: (S, n = 0) => n >= 2 ? 'Ask her to stay one more year.' : 'Approved quotes only. You are an institution now.',
      sub: (S, n = 0) => n >= 2 ? 'She will say no. −Priya.' : 'Correct. Careful. Cold.', tone: 'neutral',
      effect: (S, fx, n = 0) => {
        if (n >= 2) { fx.relate('priya', { affinity: -6, respect: -2 }); fx.focus(-4); fx.flag('priya_handed_off');
          return '"No." Then, kinder, because she has already decided: "That\'s the relationship talking. That\'s exactly the thing." She is right, and you knew she was right before you asked, and you asked anyway, and she writes that down.'; }
        fx.rep(10); fx.heat(-2); fx.relate('priya', { affinity: -8 });
        return 'The piece runs with four approved quotes in it, and they read exactly like four approved quotes, and the effect on the reader is the opposite of the one comms predicted.'; } },
  ] },

];
