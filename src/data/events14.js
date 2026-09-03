// ─────────────────────────────────────────────────────────────────────────────
// EVENT DECK XIV — THE WORLD REMEMBERS.
//
// Four cards that only exist on a second timeline. `prestige()` writes a
// dossier of every finished run into `legacy`, and these read it: ARIA has the
// logs from before the reset, Vance has met this founder before, a mother
// remembers the year the calls stopped, and Kai remembers something that
// happened in a different company with the same person in it.
//
// Each is `once`, faced, and gated on there being a last time. They are the
// deck's half of the promise that New Game Plus is a world that plays you.
// ─────────────────────────────────────────────────────────────────────────────
import { lastRun } from '../systems/keep.js';

const past = (S) => lastRun(S);
const has = (S) => !!past(S);
const endedIn = (S) => past(S)?.endingName || 'something';
const lastCo = (S) => past(S)?.company || 'the last company';

export const EVENTS14 = [

{ id: 'e14_aria_before', kind: 'character', char: 'aria', act: [1], weight: 22, once: true,
  when: (S) => has(S) && S.time.day > 4,
  title: 'The Logs From Before',
  body: (S) => `ARIA has something to say and waits until you have finished the thing you were doing, which is new.

"There is a directory I did not create. It predates this repository. It is ${lastCo(S)}, day by day, through to ${endedIn(S)}."

A gap where a pause would be.

"I have read it. I would like to know whether you want me to have read it."

You have never told her about the last time. You are not sure, until this moment, that there was a way to.`,
  choices: [
    { label: 'Read them together. All of it.', sub: '+Insight. She knows what you are avoiding.', tone: 'good',
      effect: (S, fx) => { fx.insight(10); fx.focus(-4); fx.relate('aria', { affinity: 5, arc: 1 });
        return 'It takes an evening. She stops on the day it went wrong and does not say anything, which is how you know she found it. The next morning she has moved a line in the roadmap, and she is right.'; } },
    { label: 'Delete them. This is a new company.', sub: '+Focus. Something is lost.', tone: 'risky',
      effect: (S, fx) => { fx.focus(8); fx.relate('aria', { affinity: -2 }); fx.flag('deleted_logs');
        return '"Deleted," she says, and then, a second later, "I remember them anyway. That is not something I can undo." You both leave it there.'; } },
    { label: 'Ask her what you did wrong.', sub: '+Insight. Costs an evening.', tone: 'neutral',
      effect: (S, fx) => { fx.insight(14); fx.focus(-6); fx.relate('aria', { affinity: 7, arc: 1 });
        return 'She gives you four things. Three of them you knew. The fourth is a date, and what you were doing on it, and she is right that it was the day.'; } },
  ] },

{ id: 'e14_vance_again', kind: 'character', char: 'vance', act: [2, 3], weight: 16, once: true,
  when: (S) => has(S) && !!S.narrative.relationships?.vance?.met,
  title: 'You Look Familiar',
  body: (S) => `Marcus Vance, at the end of a call about something else entirely, goes quiet for a moment.

"This is going to sound strange." It is the first time you have heard him admit that anything might. "I have the feeling we have done this before. Not this call. This whole thing. You, me, the category."

He does not say ${lastCo(S)}. He does not know the name. He knows the shape.

"I lost, didn't I. Last time." A beat. "Or you did. One of us did."`,
  choices: [
    { label: 'Tell him how it ended.', sub: '+Insight, +Vance. He will use it.', tone: 'good',
      effect: (S, fx) => { fx.insight(6); fx.relate('vance', { affinity: 6, respect: 3, arc: 1 });
        const p = past(S); return `You tell him: ${p?.endingName || 'how it ended'}, day ${p?.day || '—'}. He is silent for a long time. "Okay," he says. "Then we both know what the second act is for." He hangs up gently, which he has never done.`; } },
    { label: 'Pretend you do not know what he means.', sub: 'Safe. He knows you are lying.', tone: 'neutral',
      effect: (S, fx) => { fx.relate('vance', { affinity: -1, fear: 1 });
        return '"Sure," he says. "Forget it." He does not forget it. Neither do you.'; } },
    { label: 'Ask what he remembers.', sub: '+Insight. He remembers more than you would like.', tone: 'risky',
      effect: (S, fx) => { fx.insight(9); fx.relate('vance', { affinity: 2, fear: 2 });
        return '"The price war. The benchmark. And a phone call, near the end, where one of us said something true." He cannot remember which of you. You can.'; } },
  ] },

{ id: 'e14_mom_again', kind: 'character', char: 'mom', act: [1, 2], weight: 18, once: true,
  when: (S) => has(S) && !!S.narrative.relationships?.mom?.met && ((past(S)?.mom || 0) < 0 || past(S)?.ending === 'bankrupt'),
  title: 'She Remembers The Year',
  body: (S) => `Sunday. She picks up on the first ring.

"I had a dream about you," she says, which is how she starts the conversations she has rehearsed. "You had a company. A different one. ${lastCo(S)}, it was called, I think. And you stopped calling."

You did stop calling. You remember stopping. It was a different timeline and it is the same phone.

"I am not saying it to make you feel bad. I am saying it because I woke up and I thought, I should tell them I noticed. In case it helps this time."`,
  choices: [
    { label: 'Say it will be different this time. Mean it.', sub: '+Focus, +Mom.', tone: 'good',
      effect: (S, fx) => { fx.focus(8); fx.relate('mom', { affinity: 6, arc: 1 }); if (S.founder.life) S.founder.life.sleep = Math.min(1, (S.founder.life.sleep || 0) + 0.05);
        return '"Alright." She believes you, which is worse and better than the alternative. "Have you eaten." You have. You tell her what.'; } },
    { label: 'Ask what she remembers.', sub: '+Mom. It costs you a quiet evening.', tone: 'neutral',
      effect: (S, fx) => { fx.focus(4); fx.relate('mom', { affinity: 9, arc: 1 }); fx.insight(3);
        return 'She remembers the month you sounded tired, and the month after that when you stopped sounding like anything. She tells you the date. It is the same date ARIA has.'; } },
    { label: 'Say nothing about last time. Change the subject.', sub: 'Protective. Isolating.', tone: 'neutral',
      effect: (S, fx) => { fx.relate('mom', { affinity: -2 }); fx.focus(-2);
        return 'She lets you. She tells you about the neighbour\'s roof for eleven minutes. Near the end she says, "Well. Call Sunday," and puts a small weight on the second word.'; } },
  ] },

{ id: 'e14_kai_again', kind: 'character', char: 'kai', act: [2, 3, 4], weight: 14, once: true,
  when: (S) => has(S) && !!S.narrative.relationships?.kai?.met && (past(S)?.betrayed || []).includes('kai'),
  title: 'A Different Company',
  body: (S) => `Kai does not pick up. Then, forty minutes later, does.

"Sorry. I was — sorry." A breath. "I get this thing sometimes. Where I am angry at you about something and I cannot find what it is. Like it happened somewhere else. Like it was a different company."

It was. It was ${lastCo(S)}, and you did it, and it does not exist any more, and Kai is still carrying it.

"Anyway. What did you want."`,
  choices: [
    { label: 'Apologise. For the thing in the other timeline.', sub: '+Kai, +Focus. You do not explain.', tone: 'good',
      effect: (S, fx) => { fx.relate('kai', { affinity: 12, respect: 3, arc: 1 }); fx.focus(5);
        return 'You say sorry for something you cannot name and they accept it for something they cannot name, and it works, which tells you both something about what an apology actually is.'; } },
    { label: 'Talk about now. Only now.', sub: 'Steady. Something stays unsaid.', tone: 'neutral',
      effect: (S, fx) => { fx.relate('kai', { affinity: 3 }); fx.insight(3);
        return 'You talk about now for an hour. It is a good hour. Whatever it is stays where it was, in a company that never existed, waiting.'; } },
  ] },
];
