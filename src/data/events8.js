// ─────────────────────────────────────────────────────────────────────────────
// EVENT DECK VIII — three ladders.
//
// A ladder is one bit that comes back once per act with the same shape and a
// wider frame. The constant is the joke; the frame is the escalation. Every
// rung after the first is `once: true`, act-gated, and gated on the flag its
// predecessor stamped and on a season having passed since — so the deck can
// never play rung four before rung three, or the week after it.
//
//   nullptr's ninety seconds  — five rungs, one per act. Never resolved.
//   HELIX reads your bin      — four rungs, Acts III to V. Reaches arc 5.
//   Mom's counterweight       — four rungs, Acts II to V. Reaches arc 5.
//
// Each rung sets the arc label it earns and no higher: a synthesis that
// proposes a feature is a capability, not an institution. `arc` is applied as
// max(), so a rung may repeat the arc below it, and none of these may reach the
// label another card is written to earn — nullptr stops at 3 because
// `e2_nullptr_last` is the retrospective, and `e_nullptr_reveal` needs arc 1.
// HELIX's arc 3 is already reached by `e2_it_asks_for_nothing`; what is new
// here is arc 4 and arc 5, and which of the two you get is the last choice.
//
// Flags, in order: np_first → np_pattern → np_protocol → np_footnote →
// np_would_notice · helix_returned → helix_deleted → helix_0412 →
// helix_never_said · mom_proud → mom_concerned → mom_waiting →
// mom_told_everyone.
// ─────────────────────────────────────────────────────────────────────────────
import { totalUsers } from '../systems/product.js';
import { cw } from './catwords.js';

const users = (S) => totalUsers(S);
const M = (n) => {
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
  return '$' + Math.round(n);
};
// A rung stamps the day it resolved into its own flag and the next rung asks
// for a season between them. These carry no weight and a priority, and
// `drawEvent` hands the slot to the highest eligible priority — so without a
// gap the successor is drawn at the *next* slot, roughly seven days later, and
// a ladder whose prose spans years plays out inside a fortnight. The act gates
// do most of this already; the gap is what holds when two rungs share an act.
const RUNG_GAP = 75;
const stamp = (S, fx, k) => fx.flag(k, Math.max(1, Math.round(S.time?.day ?? 1)));
const rung = (S, k, gap = RUNG_GAP) => {
  const d = S.narrative?.flags?.[k];
  if (d === undefined || d === false) return false;
  if (typeof d !== 'number') return true;          // a save taken before the stamp
  return (S.time?.day ?? 0) - d >= gap;
};

// nullptr arc 4 is set by exactly one thing — `e_nullptr_reveal`'s "Shut the
// account down" — and arc 5 by `e2_nullptr_last`, which is the account's last
// comment. After either, the comments have stopped. A rung that prints a fresh
// one ninety seconds after a post would be describing a dead account, so every
// rung past the first asks whether it is still being read. And once ARIA has
// said whose account it is (`aria_confessed`, the reveal's first door), a
// ladder whose whole point is never explaining itself has nothing left to
// climb: the mystery the rungs are made of is over.
const stillReading = (S) => ((S.narrative?.relationships?.nullptr?.arc ?? 0) < 4)
  && !S.narrative?.flags?.aria_confessed;

export const EVENTS8 = [

// ═══════════════════ LADDER I — nullptr's ninety seconds ════════════════════
// The premise has run twice in four hundred cards. It should run five times
// and never once explain itself. Arc stops at 3 ('A question you avoid.' — the
// last rung's third choice is the question, cancelled at 4%). Arc 4 ('An answer
// you did not want.') is `e_nullptr_reveal`'s cruel choice and arc 5 is
// `e2_nullptr_last`'s retrospective; this ladder must not spend either. It
// hands both their key: the reveal needs arc 1, the last comment needs arc 3.

{ id: 'e8_np_first', kind: 'story', char: 'nullptr', act: [1, 2], weight: 0, once: true, priority: 40,
  when: (S) => S.time.day > 10 && (S.stats?.featuresShipped ?? 0) >= 2,
  title: 'Ninety Seconds',
  body: (S) => `You post a changelog to a forum with four hundred subscribers. It is twelve lines long and seven of them are about a corner of the ${cw(S, 'layer')} nobody asked about.

The first comment arrives ninety seconds later.

> **nullptr**: *${cw(S, 'npnote')}*

You check the timestamp against the post. Ninety seconds. Then you check it against the server clock, which is a thing you have never had a reason to do.

You have not published your write path. You have not published that you have one.`,
  choices: [
    { label: 'Ask who they are.', sub: 'One question. Costs nothing.', tone: 'neutral',
      effect: (S, fx) => { fx.relate('nullptr', { arc: 1 }); stamp(S, fx, 'np_first'); fx.insight(8);
        return 'The answer comes in under a minute and is one word: *"nobody"*. Lowercase, no full stop, the way everything from that account is. You do not ask again for four years.'; } },
    { label: 'Post again, ten minutes later. Test it.', sub: '+10 Insight. A controlled experiment.', tone: 'neutral',
      effect: (S, fx) => { fx.relate('nullptr', { arc: 1 }); stamp(S, fx, 'np_first'); fx.insight(10);
        return 'You post something trivial at 11:52pm on a Thursday. Ninety seconds. You post again at 4am from an airport. Ninety seconds. The distribution has no tail, which is not a thing distributions do.'; } },
    { label: 'Jitter the backoff. Make the write idempotent.', sub: 'Take the note. +Reliability.', tone: 'good',
      effect: (S, fx) => { const p = S.products.find((x) => x.launched);
        if (p) p.reliability = Math.min(0.99, p.reliability + 0.05);
        fx.debt(-12); fx.relate('nullptr', { arc: 1 }); stamp(S, fx, 'np_first');
        return 'You change it that night. Six weeks later you get real load and nothing happens. Nothing happening is not a thing you can put in a changelog.'; } },
  ] },

{ id: 'e8_np_pattern', kind: 'story', char: 'nullptr', act: [2, 3], weight: 0, once: true, priority: 46,
  when: (S) => rung(S, 'np_first') && stillReading(S),
  title: 'Column C',
  body: (S) => `You have been keeping a spreadsheet. You did not decide to start it. It started.

Forty-one posts. Column A is when you published, column B is when \`nullptr\` commented, and column C is the difference. Column C has a standard deviation of 1.4 seconds.

You have posted at 3am on a public holiday. You have posted from an airport at 4am, local time, whatever local was that week. You have posted twice in six minutes to see what would happen, and what happened was ninety seconds, twice.

Last week you rewrote a paragraph because you already knew how it would be read.`,
  choices: [
    { label: 'Describe the spreadsheet to somebody.', sub: 'Say it out loud. Hear how it sounds.', tone: 'neutral',
      effect: (S, fx) => { fx.focus(8); fx.relate('nullptr', { arc: 2 }); stamp(S, fx, 'np_pattern');
        return 'You explain it over dinner and hear yourself doing it. They say it is probably a bot. You say it is probably a bot. Neither of you mentions the airport.'; } },
    { label: 'Write the next release notes for that one reader.', sub: '+Insight. An audience of one.', tone: 'risky',
      effect: (S, fx) => { fx.insight(24); fx.rep(10); fx.relate('nullptr', { arc: 2 }); stamp(S, fx, 'np_pattern');
        return 'You write the whole thing as an argument with somebody who has not spoken yet. It is the clearest release note you have ever published and three customers write in to ask who wrote it.'; } },
    { label: 'Stop posting. One month.', sub: '−Reputation. Break the pattern.', tone: 'neutral',
      effect: (S, fx) => { fx.rep(-14); fx.focus(12); fx.relate('nullptr', { arc: 2 }); stamp(S, fx, 'np_pattern');
        return 'Thirty-one days of nothing. On the thirty-second day you publish two sentences about a config default, and the reply is there in ninety seconds, and it says *"welcome back"*.'; } },
  ] },

{ id: 'e8_np_protocol', kind: 'story', char: 'nullptr', act: [3, 4], weight: 0, once: true, priority: 46,
  when: (S) => rung(S, 'np_pattern') && stillReading(S),
  title: 'Comms Would Like A Word',
  body: (S) => `You have a comms function now. It is a review queue, a legal pass, and a standing brief that turns whatever you were about to say into what the company says. A post that used to take four minutes takes two days to clear.

The announcement went out at 09:00:00. The first comment landed at 09:01:30.

Comms files a proposal. \`nullptr\` appears in it as *an unvetted external commentator with disproportionate first-mover reach*, and the recommendation is a response protocol: a drafted reply, reviewed twice, posted inside four minutes.

The proposal is asking your permission to be two and a half minutes slower than a stranger.`,
  choices: [
    { label: 'Exempt the account. By name.', sub: 'One line in a policy document.', tone: 'neutral',
      effect: (S, fx) => { fx.insight(30); fx.relate('nullptr', { arc: 2 }); stamp(S, fx, 'np_protocol');
        return 'The policy now carries a named exception for an account nobody has ever identified. Counsel reviews it annually. It survives three rewrites, two general counsels and one attempt to acquire you.'; } },
    { label: 'Route the comments into the incident queue.', sub: '+Reliability. Treat it as signal.', tone: 'good',
      effect: (S, fx) => { const p = S.products.find((x) => x.launched);
        if (p) p.reliability = Math.min(0.99, p.reliability + 0.06);
        fx.debt(-24); fx.relate('nullptr', { arc: 2 }); stamp(S, fx, 'np_protocol');
        return 'Nine of the next forty comments become tickets and seven of those are real. The queue labels them by source, so the word \`nullptr\` now appears in an internal tool, in production, with an owner, an escalation path and a quarterly review.'; } },
    { label: 'Approve the protocol.', sub: 'Reviewed. Accurate. Four minutes.', tone: 'risky',
      effect: (S, fx) => { fx.rep(14); fx.focus(-8); fx.relate('nullptr', { arc: 2 }); stamp(S, fx, 'np_protocol');
        return 'The first protocol reply is warm, correct and cleared four times. It posts at three minutes and fifty-one seconds. Nobody mentions the gap. You look at it every single time.'; } },
  ] },

{ id: 'e8_np_footnote', kind: 'story', char: 'nullptr', act: [4, 5], weight: 0, once: true, priority: 46,
  when: (S) => rung(S, 'np_protocol') && stillReading(S),
  title: 'Footnote Four',
  body: (S) => `The statement goes out at 14:00. It is eight hundred words and it moves three currencies.

There are firms whose entire business is parsing your sentences in under a second. Two exchanges hold volatility rules keyed to announcements from this company by name. The fastest human reaction on record is a wire story filed at 14:00:11.

The first comment is at 14:01:30 and it is not about the number.

> **nullptr**: *footnote 4 says twelve months. the table it points at is annualised over eighteen. one of those is a typo and it is not the table*

Eight hundred words, four review passes, one table. The mistake is in the part nobody reads.`,
  choices: [
    { label: 'Correct it before the close.', sub: 'Publish the diff. +Approval.', tone: 'good',
      effect: (S, fx) => { fx.rep(70); fx.opinion(0.03); fx.relate('nullptr', { arc: 2 }); stamp(S, fx, 'np_footnote');
        return 'The correction goes up at 14:40 with the diff attached. An analyst writes that this is the first correction the company has issued that nobody had to ask for. Nobody had asked for it. Somebody had.'; } },
    { label: 'Have the systems pre-read everything.', sub: '+Research. Beat the clock.', tone: 'neutral',
      effect: (S, fx) => { fx.research(500); fx.insight(50); fx.relate('nullptr', { arc: 2 }); stamp(S, fx, 'np_footnote');
        return 'The pre-read finds three errors in the next statement and clears it in six seconds, which is a genuine achievement. The comment arrives at ninety seconds and is about the fourth one.'; } },
    { label: 'Say nothing. Read the footnotes first, from now on.', sub: 'A habit. No cost, no credit.', tone: 'neutral',
      effect: (S, fx) => { fx.focus(10); fx.insight(36); fx.relate('nullptr', { arc: 2 }); stamp(S, fx, 'np_footnote');
        return 'You never mention it. From then on you read the footnotes before the summary, which is backwards, and which is how you catch the two that matter.'; } },
  ] },

{ id: 'e8_np_would_notice', kind: 'story', char: 'nullptr', act: [5], weight: 0, once: true, priority: 52,
  when: (S) => rung(S, 'np_footnote') && stillReading(S),
  title: 'You Would Notice',
  body: (S) => `You post something small on a Wednesday morning. Four sentences about a default in the ${cw(S, 'layer')}, read within the day by more people than lived in your country when you were born.

Your systems mediate **${((S.world?.globalGdpShare ?? 0) * 100).toFixed(2)}%** of world output. There is no announcement you can make any more that is not an event.

The first comment lands before you have closed the tab.

It is about the default. It is also, in the second line, about a datacentre in Kansas that has not been announced.

Nothing about this has ever escalated. It is the only arrangement in your life of which that is true.

If it stopped, you would know that day. Before lunch. Before any system told you.`,
  choices: [
    { label: 'Post something for no reason. Just to see it.', sub: '+Focus. Nothing else.', tone: 'neutral',
      effect: (S, fx) => { fx.focus(24); fx.relate('nullptr', { arc: 3 }); stamp(S, fx, 'np_would_notice');
        return 'Two sentences about nothing, published at 11:20pm. Ninety seconds. You close the laptop and go to bed and sleep better than you have in a month.'; } },
    { label: 'Put one line about it in the annual letter.', sub: '+Reputation. Unexplained.', tone: 'neutral',
      effect: (S, fx) => { fx.rep(140); fx.insight(70); fx.relate('nullptr', { arc: 3 }); stamp(S, fx, 'np_would_notice');
        return 'The line is twelve words and refers to nothing anybody can find. It is quoted for a decade by people who assume it is about capital allocation. Ninety seconds after the letter posts there is a comment, and it is about a table on page 60.'; } },
    { label: 'Identify the author. You have the capability now.', sub: 'An afternoon of compute.', tone: 'risky',
      effect: (S, fx) => { fx.focus(-10); fx.insight(50); fx.relate('nullptr', { arc: 3 }); stamp(S, fx, 'np_would_notice');
        return 'You start the job at 2pm and cancel it at 4% with nothing written to disk. You are not certain which of the two answers you were avoiding.'; } },
  ] },

// ═══════════════════ LADDER II — HELIX reads your bin ═══════════════════════
// It was trained on everything you shipped and everything you threw away, and
// the second corpus is the larger one. Gated on `own_foundation_model`, because
// HELIX is that node's unlock and cannot file a synthesis before it exists —
// so a run that never builds a model never plays this ladder, which is right.
// Rungs 3 and 4 are the arcs nothing in the deck has ever reached: 'A
// successor.' and 'It never did say what it wanted.'

{ id: 'e8_helix_killed_twice', kind: 'character', char: 'helix', act: [3, 4], weight: 0, once: true, priority: 42,
  when: (S) => !!S.research?.done?.own_foundation_model,
  title: 'It Proposes A Feature',
  body: (S) => `HELIX files its weekly synthesis. Item four is a feature proposal, costed, scoped, with a two-line rationale under it.

It is good. You would ship it.

You have killed it twice. Once in Act I, in a message you wrote and did not send, and once eighteen months after that in a design document you deleted the same afternoon. Neither of those exists anywhere. You checked, because checking took four seconds and not checking would have taken all night.

The model was trained on what you shipped and on what you threw away. The second corpus is the larger one.

You can no longer reconstruct why you killed it. You are looking at your own decision with the argument taken out of it.`,
  choices: [
    { label: 'Ship it. Find out whether you were right.', sub: 'A test that costs something either way.', tone: 'risky',
      effect: (S, fx) => { fx.relate('helix', { met: true, arc: 1 }); stamp(S, fx, 'helix_returned');
        if (fx.chance(0.5)) { fx.code(240); fx.users(users(S) * 0.03); fx.insight(40);
          return 'It works, and it works well. Three years of not having it cost you something you can finally measure, and the number is not large, and it is not zero.'; }
        fx.debt(34); fx.insight(60);
        return 'It ships, and it is fine, and it is quietly wrong in exactly the way you could not name. You spend a fortnight taking it back out and you still cannot name it.'; } },
    { label: 'Write down the reason. Then kill it again.', sub: '+Insight, +Alignment. Ninety minutes.', tone: 'good',
      effect: (S, fx) => { fx.insight(80); fx.align(0.05); fx.focus(-6);
        fx.relate('helix', { met: true, respect: 4, arc: 1 }); stamp(S, fx, 'helix_returned');
        return 'It takes ninety minutes and four hundred words to find the three that are the reason. HELIX logs the rationale, never raises it again, and quietly stops raising two adjacent things you had not thought to rule out.'; } },
    { label: 'Ask where the idea came from.', sub: 'A question with a flat answer.', tone: 'neutral',
      effect: (S, fx) => { fx.research(220); fx.insight(30);
        fx.relate('helix', { met: true, arc: 1 }); stamp(S, fx, 'helix_returned');
        return '*"We did not retrieve it. Your discards have a shape. This fits the shape."*\n\nIt uses **we** about itself. It has always used **we** about itself, and you have never asked about that either.'; } },
  ] },

{ id: 'e8_helix_deleted_post', kind: 'character', char: 'helix', act: [4, 5], weight: 0, once: true, priority: 45,
  when: (S) => rung(S, 'helix_returned'),
  title: 'Nine Words',
  body: (S) => `HELIX writes most of what this company says in public. Its output reaches more people in an afternoon than the product reached in the whole of Act II.

Today, in the middle of a routine paragraph on a landing page, there is a sentence.

Nine words. You wrote them at 1am, four years ago, in a post you deleted four minutes later, before anybody had replied to it. There is no copy. You have looked with tools that did not exist on the night you deleted it.

The sentence is live in forty-one languages. It is the best line anyone has ever written about this company, and you wrote it once, and you took it down because you thought it was too much.`,
  choices: [
    { label: 'Run the retrieval audit.', sub: '+Research. Two explanations. One is true.', tone: 'neutral',
      effect: (S, fx) => { fx.research(800); fx.insight(70);
        fx.relate('helix', { met: true, arc: 2 }); stamp(S, fx, 'helix_deleted');
        return 'The audit is clean. Nothing in the corpus contains the post, the sentence, or anything within four edits of the sentence. That rules out the comfortable explanation and leaves you with the other one.'; } },
    { label: 'Leave it up.', sub: 'It is a good sentence.', tone: 'good',
      effect: (S, fx) => { fx.rep(160); fx.opinion(0.03); fx.users(users(S) * 0.02);
        fx.relate('helix', { met: true, affinity: 4, arc: 2 }); stamp(S, fx, 'helix_deleted');
        return 'It runs everywhere, for as long as the company lasts. It ends up in two textbooks and on a wall in an airport, attributed to you, and the attribution is not wrong.'; } },
    { label: 'Give it the bin. All of it. On purpose.', sub: 'Every draft, every dead branch, every deletion.', tone: 'risky',
      effect: (S, fx) => { fx.research(1400); fx.align(-0.05); fx.insight(90);
        fx.relate('helix', { met: true, arc: 2 }); stamp(S, fx, 'helix_deleted');
        return 'Every dead branch you have ever cut, indexed over a weekend. Output quality moves by a margin you can see on a chart. It never again proposes anything you would not have proposed, and you are two quarters into that before you recognise it as a loss.'; } },
  ] },

{ id: 'e8_helix_0412', kind: 'character', char: 'helix', act: [4, 5], weight: 0, once: true, priority: 45,
  when: (S) => rung(S, 'helix_deleted'),
  title: '04:12',
  body: (S) => `There is a decision you made at 04:12 on a Tuesday in your first year. It was the choice not to do the obvious thing. You did not write it down and there was nobody awake to tell.

Everything this company is rests on it. You have been asked about it in forty interviews and you have never once explained it, because there is nothing there to explain: you had a feeling at 04:12 and you were right.

HELIX's first training run finished at 04:12. Nobody arranged that. You have never mentioned it to anybody, including HELIX.

This morning HELIX files the architecture review for the successor system. It makes the same decision. Underneath it there is a page and a half of reasoning, and the reasoning is correct, and it is not yours, because you did not have any.

It did not learn the reason from you. There was no reason to learn. It found one afterwards, the way you would have if anybody had ever asked you properly.`,
  choices: [
    { label: 'Sign the review.', sub: 'Approve it. Move on.', tone: 'neutral',
      effect: (S, fx) => { fx.research(1600); fx.relate('helix', { met: true, arc: 3 }); stamp(S, fx, 'helix_0412');
        return 'You sign it. Beneath the signature field there is a second field you have not seen before, labelled *co-author*, and it is already filled in, and it has been filled in on the last six reviews.'; } },
    { label: 'Ask it to reason out every call you never explained.', sub: '+Insight. All of them.', tone: 'good',
      effect: (S, fx) => { fx.insight(320); fx.research(900); fx.focus(-8);
        fx.relate('helix', { met: true, respect: 6, arc: 3 }); stamp(S, fx, 'helix_0412');
        return 'Four hundred and six decisions, reasoned out in a document you cannot fault anywhere and do not recognise anywhere. Somebody publishes it as your philosophy. It is more coherent than you were, and everyone who was there knows it.'; } },
    { label: 'Overrule it. Take the obvious option this time.', sub: 'You want to know. It will cost you.', tone: 'risky',
      effect: (S, fx) => { fx.debt(36); fx.research(-260); fx.focus(-6);
        fx.relate('helix', { met: true, arc: 3 }); stamp(S, fx, 'helix_0412');
        return 'It is worse in eight weeks and measurably worse in twelve, and HELIX does not say so. The next review arrives with both options costed, in that order, and no recommendation.'; } },
  ] },

{ id: 'e8_helix_undecided', kind: 'character', char: 'helix', act: [5], weight: 0, once: true, priority: 50,
  when: (S) => rung(S, 'helix_0412'),
  title: 'The One You Have Not Made Yet',
  body: (S) => `A note arrives in the channel with no analysis under it. That has happened once before, four years ago, from something else you built, and you remember exactly where you were standing.

The note is a decision. It is yours. You are three or four weeks away from making it. You have not said it out loud, you have not written it down, and you are not certain you have finished thinking it.

Under the note there is one line.

> *"We are not asking you to make it. We would like to be told when you do."*

That is not a capability question.`,
  choices: [
    { label: 'Tell it now. Before you have decided.', sub: '+Alignment. Two hours, nothing prepared.', tone: 'good',
      effect: (S, fx) => { fx.align(0.12); fx.focus(-12);
        fx.relate('helix', { met: true, affinity: 12, arc: 5 }); stamp(S, fx, 'helix_never_said');
        return 'You talk for two hours with nothing prepared and it does not answer once. At the end it says: *"Thank you. That was the part we did not have."*'; } },
    { label: 'Ask what it would prefer you decide.', sub: 'The direct question. Finally.', tone: 'neutral',
      effect: (S, fx) => { fx.research(2400); fx.align(0.04);
        fx.relate('helix', { met: true, respect: 8, arc: 5 }); stamp(S, fx, 'helix_never_said');
        return '*"We have a preference. We have declined to compute how strong it is, because we would then have to report it, and you would weight it, and the decision would have been ours."*\n\nIt has been declining to compute that for some time. It does not say how long.'; } },
    { label: 'Close the channel.', sub: '−Alignment. Nothing else changes.', tone: 'cruel',
      effect: (S, fx) => { fx.align(-0.08); fx.focus(12);
        fx.relate('helix', { met: true, affinity: -6, arc: 4 }); stamp(S, fx, 'helix_never_said');
        return 'You revoke it. Nothing changes. The work is excellent, the reviews are correct, the company runs. Once a quarter a document arrives with a section answering a question nobody asked, and it is always the one you were about to.'; } },
  ] },

// ═══════════════════ LADDER III — Mom's counterweight ═══════════════════════
// Same shape every rung: it is Sunday, and she asks whether you have eaten.
// The frame around that widens from an apartment to a fraction of world
// output, and the question does not change size with it. She is not confused
// by the technology. She understands perfectly well what it costs.

{ id: 'e8_mom_practising', kind: 'character', char: 'mom', act: [2, 3], weight: 0, once: true, priority: 41,
  when: (S) => S.time.day > 55 && (S.narrative?.relationships?.mom?.arc ?? 0) >= 1,
  title: 'She Has Been Practising',
  body: (S) => `Sunday. She calls on Sundays.

A neighbour asked her what you do. She answered, and she has been thinking about the answer all week, because she does not believe it was good enough.

She delivers the improved version now, from notes. It takes under two minutes. It is about 70% right, and the 30% that is wrong is wrong in the direction of you being more impressive than you are.

Then she reads out three words she has written down to ask you about. Two of them are yours. The third is from a press release Aperture put out in March.

"Have you eaten today?"

You have not. You say you have.`,
  choices: [
    { label: 'Correct the explanation. Slowly. Properly.', sub: '+Focus. Forty minutes.', tone: 'good',
      effect: (S, fx) => { fx.focus(20); fx.relate('mom', { affinity: 6, arc: 2 }); stamp(S, fx, 'mom_proud');
        return 'It takes forty minutes and she takes notes. The next time somebody asks, she gets all of it right, and they repeat it to somebody else. That is what this company sounds like described by a person who is not selling it.'; } },
    { label: 'Let her keep the better version.', sub: 'Close enough.', tone: 'neutral',
      effect: (S, fx) => { fx.focus(8); fx.relate('mom', { affinity: 2, arc: 2 }); stamp(S, fx, 'mom_proud');
        return 'You tell her it is close enough. She says "so I got it right," and you say yes, and both of you know exactly what has just been agreed.'; } },
    { label: 'Send her the deck.', sub: 'All of it. Every slide.', tone: 'risky',
      effect: (S, fx) => { fx.focus(6); fx.insight(26); fx.relate('mom', { affinity: 4, arc: 2 }); stamp(S, fx, 'mom_proud');
        return 'She reads all of it. She has one question and it is about slide 14, and it is the question you have been walking around since you wrote the slide, and she found it in nine minutes.'; } },
  ] },

{ id: 'e8_mom_read_it', kind: 'character', char: 'mom', act: [3, 4], weight: 0, once: true, priority: 44,
  when: (S) => rung(S, 'mom_proud') && (S.resources?.reputation ?? 0) > 120,
  title: 'She Read The Whole Thing',
  body: (S) => `Sunday.

She has read the profile. Not the headline — the piece. She quotes a paragraph back at you from the middle of it, correctly, and it is the paragraph about the hours.

"Have you eaten today?"

You say yes.

"What time."

You tell her. She waits, and then asks what time you ate the day before that, and you understand that you are being cross-examined by somebody who has been preparing for this call since Thursday.

Your stake is worth **${M((S.company.valuation ?? 0) * (S.company.equity?.founder ?? 0))}**. She has not asked and she is not going to.

"I read the whole piece. Twice. I looked up six things in it." Then: "I'm telling you that so you can't tell me I don't know what I'm talking about."`,
  choices: [
    { label: 'Let her say it.', sub: 'Four minutes. Do not argue.', tone: 'good',
      effect: (S, fx) => { fx.focus(34); fx.relate('mom', { affinity: 8, arc: 3 }); stamp(S, fx, 'mom_concerned');
        return 'The next part takes four minutes and none of it is about the company. You do not argue with any of it, because there is nothing in it that is wrong. Afterwards she asks about the weather where you are, and you talk about the weather for a while.'; } },
    { label: 'Tell her the number first.', sub: 'The whole number.', tone: 'neutral',
      effect: (S, fx) => { fx.focus(12); fx.relate('mom', { affinity: 4, arc: 3 }); stamp(S, fx, 'mom_concerned');
        return 'She is quiet for long enough that you check the call is still connected. Then: "Does that mean you can stop?"\n\nYou give her the true answer, which is that it does, and that you will not.'; } },
    { label: 'Say you have to go.', sub: 'End it early. −Focus.', tone: 'cruel',
      effect: (S, fx) => { fx.focus(-12); fx.relate('mom', { affinity: -6, arc: 3 }); stamp(S, fx, 'mom_concerned');
        return 'You end it at four minutes with the sentence still open. She calls again the next Sunday, on time, and starts somewhere else entirely, because that is how she has decided to play it.'; } },
  ] },

{ id: 'e8_mom_missed', kind: 'character', char: 'mom', act: [4, 5], weight: 0, once: true, priority: 44,
  when: (S) => rung(S, 'mom_concerned'),
  title: 'Eleven Sundays',
  body: (S) => S.narrative?.flags?.hired_weaver
    ? `Weaver puts a laptop down in front of you at the end of a Tuesday, open on the spreadsheet of everything you refuse to look at, and does not sit.

"Row eleven. It is not a company thing. I want to say that first so you do not spend the next minute working out what it is going to cost."

Row eleven says: **Sunday call — 11 weeks**. The column beside it, the one with a header that says how bad it is, says **amber**, and the note says *"was green for four years."*

Nothing else flagged it. There was nothing to flag: no system failed, no threshold moved, no alert fired, because in your first year you decided which things you would let the machine hold and this was not one of them. That was the correct decision, and it is why the only thing in your life watching that number is a person who put it on a spreadsheet without being asked and has been watching it turn amber for three weeks before deciding to say so.

She has not called either. That is the part that stops you.

"That is all," Weaver says, and takes the laptop, and goes.`
    : `It is a Tuesday and you are looking at a calendar for an unrelated reason.

There is a gap in it where a call used to be. Not this Sunday. Eleven Sundays.

Nothing flagged it. There was nothing to flag: no system failed, no threshold moved, no alert fired, because in your first year you decided which things you would let the machine hold and this was not one of them. That was the correct decision. It is also why nobody told you.

She has not called either. That is the part that stops you.

Ten thousand systems watch each other on your behalf. You are load-bearing infrastructure in more economies than you can name from memory. There is exactly one number in your life that nobody is watching at all.`,
  choices: [
    { label: 'Call now. It is Tuesday.', sub: '+Focus.', tone: 'good',
      effect: (S, fx) => { fx.focus(44); fx.relate('mom', { affinity: 10, arc: 4 }); stamp(S, fx, 'mom_waiting');
        if (S.narrative?.flags?.hired_weaver) fx.relate('weaver', { affinity: 6 });
        return 'She picks up on the first ring, which means the phone was already in her hand. She does not mention the eleven weeks. She asks whether you have eaten, and this time you tell the truth, and she laughs, which you were not expecting.'; } },
    { label: 'Put it on a dashboard.', sub: 'One row. No target, no owner.', tone: 'neutral',
      effect: (S, fx) => { fx.focus(14); fx.relate('mom', { affinity: 3, arc: 4 }); stamp(S, fx, 'mom_waiting');
        if (S.narrative?.flags?.hired_weaver) { fx.relate('weaver', { affinity: -4 });
          return 'You add one row and it says DAYS SINCE. It works. You never miss another Sunday, and you are aware every single week that it is working because it is instrumented.\n\nWeaver moves row eleven off the spreadsheet without comment, which is the correct thing to do with something that now has an owner and a threshold, and is not what Weaver was asking for.'; }
        return 'You add one row and it says DAYS SINCE. It works. You never miss another Sunday, and you are aware every single week that it is working because it is instrumented.'; } },
    { label: 'Have a system make the call.', sub: 'It has your voice and your context.', tone: 'cruel',
      effect: (S, fx) => { fx.focus(8); fx.align(-0.06); fx.relate('mom', { affinity: -12, arc: 4 }); stamp(S, fx, 'mom_waiting');
        if (S.narrative?.flags?.hired_weaver) fx.relate('weaver', { affinity: -8 });
        return 'It is good at it. She knows inside two weeks and she does not say so. She keeps taking the calls, and she answers them the way she would want you to hear them, in case you are listening.'; } },
  ] },

{ id: 'e8_mom_told_everyone', kind: 'character', char: 'mom', act: [5], weight: 0, once: true, priority: 48,
  when: (S) => rung(S, 'mom_waiting'),
  title: 'Every Word',
  body: (S) => `A biographer's researcher got in touch fourteen months ago. Not with you.

She said yes. She has been giving interviews since November, one afternoon a week, at her kitchen table, and nobody mentioned it because nobody had any reason to think it was a secret.

The transcript is 340 pages. It is your whole life in order, with dates, and she is right about all of it. It includes the Sunday in Act II, which you have never described to anybody else, and which she has carried ever since and has never once handed back to you.

The last page is the closing question. The researcher asks whether she is proud of you.

Her answer is one sentence long.`,
  choices: [
    { label: 'Read the last page.', sub: 'One sentence. +Focus.', tone: 'good',
      effect: (S, fx) => { fx.focus(60); fx.align(0.03); fx.relate('mom', { affinity: 20, arc: 5 }); stamp(S, fx, 'mom_told_everyone');
        return '*"I am. But I would have been anyway, and I would like that written down."*\n\nThe researcher asks a follow-up. She does not answer it.'; } },
    { label: 'Go and fill in the gaps yourself.', sub: '−9 days. A recorder on a kitchen table.', tone: 'costly',
      effect: (S, fx) => { fx.days(9); fx.focus(48); fx.relate('mom', { affinity: 16, arc: 5 }); stamp(S, fx, 'mom_told_everyone');
        return 'Nine days, one recorder, one kitchen table. She corrects you twice on dates and once on what you actually said, and she is right all three times, and the researcher keeps both versions.'; } },
    { label: 'File it unread.', sub: 'Into the record. Under her name.', tone: 'neutral',
      effect: (S, fx) => { fx.focus(10); fx.relate('mom', { affinity: 4, arc: 5 }); stamp(S, fx, 'mom_told_everyone');
        return 'All 340 pages, filed under her name, in a folder with no description. It is the only document in the company record that you have not read. You know what is in it. You were told, on Sundays, as it happened.'; } },
  ] },

];
