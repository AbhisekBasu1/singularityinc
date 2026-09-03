// ─────────────────────────────────────────────────────────────────────────────
// EVENT DECK — THE PATH, AND THE WAYS OUT.
//
// Two kinds of card, and one thing they have in common: nothing in here draws
// unless the run has already made a decision.
//
// **Path cards** carry a `path` and are gated on `narrative.pathLocked`. Until
// the founder takes the first commitment on the Ascension panel, the last act
// is a menu of six futures; the morning after, it is one future with a cost,
// and grepping the deck for `pathLocked` used to return nothing at all. So each
// path gets three: the first consequence, the first person who objects, and the
// thing nobody warned you about. They are spaced off `pathLockedDay` through
// `PATH_CARDS`, so the three arrive as a sequence rather than as a pile the
// following week, and `steer()` in the director leans the draw toward the path
// that is actually being built. Nothing suppresses anything else — it is a
// weight, and a path card still has to be legal like any other.
//
// **The ways out** are the cards that offer or announce an ending: the two the
// world forces, each with a warning a long way ahead of the hearing and a
// costly door out of it; the merger, when the two companies have converged;
// and the one a career reaches rather than a run. Every ending offered here is
// taken with `fx.endRun`, the same door the acquisition cards have always used.
// ─────────────────────────────────────────────────────────────────────────────
import { totalUsers, totalMrr } from '../systems/product.js';
import { apertureState } from '../systems/rivalco.js';
import { ENDINGS_FORCED as F, PATH_CARDS as P } from './balance.js';

const N = (n) => Math.round(n).toLocaleString();
const M = (n) => {
  const v = Math.abs(n);
  if (v >= 1e12) return '$' + (n / 1e12).toFixed(1) + 'T';
  if (v >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (v >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
  return '$' + Math.round(n).toLocaleString();
};
const flag = (S, f) => !!S.narrative?.flags?.[f];
const met = (S, id) => !!S.narrative?.relationships?.[id]?.met;
const ap = (S) => { try { return apertureState(S); } catch (e) { return null; } };

// How long since the first commitment closed the other paths. A card written
// for rung 0 may draw six days after the choice; rung 1 and rung 2 wait a
// spacing each, so the three read as a season rather than as a week.
const rung = (n) => P.FIRST_DAYS + n * P.SPACING_DAYS;
const on = (S, id, n = 0) => S.narrative?.pathLocked === id
  && (S.time.day - (S.narrative.pathLockedDay ?? S.time.day)) >= rung(n);

export const EVENTS_PATHS = [

// ══════════════ STEWARD — the boring version of the good ending ═════════════

{ id: 'p_st_veto', kind: 'crisis', path: 'steward', act: [4, 5], weight: 14, once: true,
  when: (S) => on(S, 'steward', 0),
  title: 'The Board Uses It',
  body: (S) => `You wrote the charter so that they could stop you. Today they stop you.

The oversight board has read the deployment review for the routing upgrade — the one that has been in staging for a quarter, the one that is *strictly better on every measured axis* — and they are not disputing any of that. They are disputing a paragraph in the evaluation methodology, and they are right about the paragraph, and the paragraph does not change the conclusion.

The vote is 5–2. The deployment is halted pending a re-run of a suite that takes a quarter.

Your counsel has found three defensible readings of the charter under which the vote is advisory. Two of them are good. You wrote the clause they are relying on, and you wrote it because you did not trust yourself to be in this exact room having exactly this feeling.`,
  choices: [
    { label: 'Halt it. Re-run the suite. Say so publicly.', sub: 'The whole point was that they can stop you. +Alignment, +Approval.', tone: 'good',
      effect: (S, fx) => { fx.align(0.07); fx.opinion(0.06); fx.rep(60); fx.focus(-12);
        fx.cash(-Math.min(Math.max(2e8, S.company.valuation * 0.001), 4e9));
        fx.flag('board_obeyed');
        return 'Thirteen weeks. The re-run finds nothing, which is what you expected and is not the point. What the quarter actually buys is an answer to the question every regulator on earth has been asking for a decade — whether the thing has teeth — and now there is a date and a vote count.'; } },
    { label: 'Take the advisory reading. Ship, and brief them after.', sub: 'Defensible. Once. −Alignment, +Heat.', tone: 'risky',
      effect: (S, fx) => { fx.align(-0.09); fx.heat(9); fx.opinion(-0.05); fx.rep(-30); fx.research(400);
        fx.flag('board_overruled');
        return 'You ship it. It is better, exactly as measured. Two members resign inside a month and neither of them says why, which is worse than a statement would have been, and the seat stays empty for a year because the people you want will not take it now.'; } },
    { label: 'Take the finding to them and rewrite the methodology together.', sub: 'Slow, expensive, and it holds. +Alignment, −Focus.', tone: 'neutral',
      effect: (S, fx) => { fx.align(0.05); fx.rep(30); fx.focus(-26); fx.insight(70);
        fx.flag('board_rewrote');
        return 'Four months of joint sessions with two of your researchers and both dissenting members in the same room, which nobody enjoys. What comes out is a suite that is genuinely better and that the board now partly owns, and the next halt — there is a next halt — takes a fortnight instead of a quarter.'; } },
  ] },

{ id: 'p_st_finding', kind: 'crisis', path: 'steward', act: [4, 5], weight: 13, once: true,
  when: (S) => on(S, 'steward', 1),
  title: 'The Record Has You In It',
  body: (S) => `The unredacted publication is at page 6,400 of 9,000 and the team doing the read-through has flagged something.

It is a thread from ${Math.max(2, Math.floor(S.time.day / 360) - 1)} years ago. You are in it. You argued, at length and in writing, for a course of action that was wrong — not wrong in hindsight, wrong at the time, against the advice of two people who turned out to be correct — and then you were talked out of it and never mentioned it again.

Nothing came of it. That is the whole problem: it is a record of the reasoning, not of a harm, and it is exactly the kind of thing every organisation on earth quietly does not publish.

The flag on it is not from counsel. It is from a twenty-six-year-old on the review team, who has attached one line: *"assuming this stays in. checking because it's you."*`,
  choices: [
    { label: 'It stays in. Reply to them directly.', sub: 'Unredacted meant unredacted. +Alignment, −Reputation.', tone: 'good',
      effect: (S, fx) => { fx.align(0.08); fx.rep(-70); fx.opinion(0.05); fx.insight(40);
        fx.flag('published_own_error');
        return 'You write back four words and copy nobody: *it stays in. thanks.* The thread is quoted in about forty pieces over the following year, always unkindly and always accurately. A graduate seminar uses it as the reading on institutional honesty, which you find out about from a friend, and do not attend.'; } },
    { label: 'Redact it under the deliberative-process carve-out.', sub: 'The carve-out exists for exactly this. −Alignment.', tone: 'risky',
      effect: (S, fx) => { fx.align(-0.07); fx.rep(20); fx.opinion(-0.03); fx.focus(6);
        fx.flag('redacted_own_error');
        return 'It is a legitimate use of a legitimate clause and it takes four minutes. The twenty-six-year-old does not ask again — about that or about anything else — and their reviews get faster and less useful over the following months, and you notice, and you know exactly why.'; } },
    { label: 'Publish it with your own annotation on what you got wrong.', sub: 'Costly and better. +Alignment, +Approval, −Focus.', tone: 'good',
      effect: (S, fx) => { fx.align(0.09); fx.opinion(0.08); fx.rep(-20); fx.focus(-20); fx.insight(60);
        fx.flag('published_own_error'); fx.flag('annotated_the_record');
        return 'The annotation takes a weekend and is eight hundred words and is the most difficult writing you have done since the first fundraising deck. It sits inline, in a lighter type, and the convention gets copied by two other labs within the year. That was the only outcome you actually wanted.'; } },
  ] },

{ id: 'p_st_grant', kind: 'story', path: 'steward', act: [4, 5], weight: 12, once: true,
  when: (S) => on(S, 'steward', 2),
  title: 'The Money Does Not Land',
  body: (S) => `The endowment's third programme has failed.

Not stolen, not misspent — audited, documented, and simply ineffective. ${M(Math.max(4e8, (S.company.cash || 0) * 0.02))} over four years on a health-systems intervention that worked beautifully in the trial and did not survive contact with the twelve places it was deployed in, for reasons that are now extremely clear and were not clear to anybody in advance.

The programme director wants to publish the whole failure. Your comms lead wants a quiet wind-down and a reallocation. Both of them are being reasonable and neither of them is being honest about their reason.

Nobody outside will ever ask. That is what makes it a decision.`,
  choices: [
    { label: 'Publish the failure. The whole file, like the rest of the record.', sub: 'It is the same rule. +Approval, −Reputation.', tone: 'good',
      effect: (S, fx) => { fx.opinion(0.06); fx.rep(-40); fx.align(0.04); fx.insight(50);
        fx.flag('published_the_failure');
        return 'Two of the twelve sites read it and say, in effect, we could have told you that, and one of them is right and the other is not, and working out which took a further year and is now also published. Four other funders adopt the format. None of them credit you and all of them use your headings.'; } },
    { label: 'Wind it down quietly and reallocate to what is working.', sub: 'The money does more good elsewhere. +Reputation.', tone: 'neutral',
      effect: (S, fx) => { fx.rep(30); fx.opinion(-0.02); fx.cash(Math.max(1e8, (S.company.cash || 0) * 0.004));
        return 'It is the correct allocation and everybody involved knows it, and the programme director takes another job within the quarter and is careful, in the exit conversation, to say that it was not about this.'; } },
    { label: 'Fund the post-mortem itself. Properly, for three years.', sub: 'Buy the knowledge, not the outcome. −Cash, +Alignment.', tone: 'costly',
      effect: (S, fx) => { fx.cash(-Math.max(3e8, (S.company.cash || 0) * 0.015)); fx.align(0.05); fx.rep(40); fx.opinion(0.04);
        fx.flag('funded_the_postmortem');
        return 'Three years and a small permanent team whose only job is to find out why things that work stop working. It produces no programmes, no headlines and no photographs. The fourth intervention it advises on is the one that scales, and nobody connects the two, including most of your board.'; } },
  ] },

// ══════════════ SOVEREIGN — the decade of reasonable decisions ══════════════

{ id: 'p_sv_locked_in', kind: 'story', path: 'sovereign', act: [4, 5], weight: 14, once: true,
  when: (S) => on(S, 'sovereign', 0),
  title: 'The First One That Cannot Leave',
  body: (S) => `A mid-sized country has run the numbers on migrating off your stack.

They have been thorough. It is a good report and you have a copy of it before their cabinet does, which is itself a fact worth sitting with. The finding is that a full migration is technically achievable over seven years at a cost of roughly four percent of annual government spending, and that the transition period would degrade benefits payments, customs clearance and the health record system simultaneously, and that no administration can survive that.

So they are not leaving. They are, instead, opening a negotiation about terms — and the negotiation has exactly one asymmetry in it, and both sides can see it, and the polite word for the asymmetry is *partnership*.

Their trade minister asks, off the record, at the end of a call: "Is there a version of this where we are still a country?"`,
  choices: [
    { label: 'Write them an exit ramp. Fund it. Publish the spec.', sub: 'A dependency that can end is a supplier. −Cash, +Approval.', tone: 'good',
      effect: (S, fx) => { fx.cash(-Math.max(2e9, (S.company.cash || 0) * 0.03)); fx.opinion(0.09); fx.align(0.05);
        fx.rep(80); fx.control(-0.4); fx.flag('wrote_the_exit_ramp');
        return 'An interoperability layer, a data-portability guarantee with a penalty clause you wrote against yourself, and a published migration spec any competitor can implement. Nobody uses it for six years. In the seventh, somebody does, and the fact that they could is the reason four other governments sign.'; } },
    { label: 'Take the terms. They are good terms and they were offered.', sub: 'This is what it is for. +Control, −Approval.', tone: 'neutral',
      effect: (S, fx) => { fx.control(1.1); fx.cash(Math.max(6e9, (S.company.valuation || 0) * 0.004));
        fx.opinion(-0.07); fx.heat(11); fx.flag('took_the_terms');
        return 'The agreement runs to ninety pages and the word "sovereign" appears in it fourteen times, always about them. Three neighbouring states open the same conversation inside a year, having read the terms, having concluded that being early is the only leverage available.'; } },
    { label: 'Answer the minister honestly.', sub: '"No. Not the way you mean." +Insight, −Approval.', tone: 'cruel',
      effect: (S, fx) => { fx.insight(90); fx.opinion(-0.09); fx.control(0.6); fx.rep(-20);
        fx.flag('said_it_plainly');
        return 'You say: not in the way you mean, and it stopped being true some years before I noticed, and I do not think either of us decided it. There is a long silence on the line. Then: "Thank you. That is the first useful thing anyone has said to me about this." The negotiation goes better after that. You did not expect that, and you cannot stop thinking about it.'; } },
  ] },

{ id: 'p_sv_favour', kind: 'crisis', path: 'sovereign', act: [4, 5], weight: 13, once: true,
  when: (S) => on(S, 'sovereign', 1),
  title: 'A Thing That Is Not In The Contract',
  body: (S) => `The request comes through a channel that exists for outages.

It is from a deputy minister in a bloc where your integration runs revenue collection, and it is not about revenue collection. A named individual, a residency determination, a timing question about when a record becomes visible to a different agency. Four sentences. No file attached, which is deliberate.

It is small. Read carefully, it is a request to make a state function behave differently for one person, routed to you because you are the layer it runs on, framed as an operational query because there is no form for what it actually is.

Your integration lead has flagged it and done nothing else. The channel shows the message as read. It has been read for six hours.`,
  choices: [
    { label: 'Refuse in writing, and publish the refusal to the joint committee.', sub: 'Make the ask itself expensive. −Control, +Approval.', tone: 'good',
      effect: (S, fx) => { fx.opinion(0.07); fx.align(0.06); fx.rep(50); fx.control(-0.5); fx.heat(-6);
        fx.flag('refused_the_favour');
        return 'The refusal is two paragraphs and goes to every party to the agreement, and that second half is what costs. The deputy minister is moved sideways within the quarter for unrelated reasons. Nobody in that bloc ever routes a request like that through you again, and two other blocs quietly adopt the same escalation rule.'; } },
    { label: 'Do it. It is four sentences and they are an ally.', sub: 'Nobody will ever know. +Control, −Alignment.', tone: 'cruel',
      effect: (S, fx) => { fx.control(0.9); fx.align(-0.10); fx.opinion(-0.04); fx.heat(7);
        fx.flag('did_the_favour');
        return 'It takes a configuration change and forty minutes and leaves a log entry that is technically complete and practically unreadable. Nothing happens. Six weeks later a second request arrives through the same channel, longer, with a file attached, and the fact that there is a file attached tells you exactly what the first one established.'; } },
    { label: 'Escalate it to the joint committee without a recommendation.', sub: 'Not your decision. Make that structural. −Focus.', tone: 'neutral',
      effect: (S, fx) => { fx.focus(-16); fx.align(0.03); fx.rep(20); fx.insight(50);
        fx.flag('escalated_the_favour');
        return 'The committee takes five months and produces a procedure, and the procedure is worse than the one you would have written and is not yours, and that second property is the one that matters. The original request is never resolved. The named individual has, by then, moved.'; } },
  ] },

{ id: 'p_sv_succession', kind: 'story', path: 'sovereign', act: [5], weight: 12, once: true,
  when: (S) => on(S, 'sovereign', 2),
  title: 'Who Inherits It',
  body: (S) => `Your counsel has raised, for the third time, the question nobody wants to draft.

You are a dependency. Dependencies outlive people. There is presently no written answer to what happens to the standard, the integrations and the veto positions the day you stop being able to make decisions — and "the board" is not an answer, because four of the seven seats are yours to fill.

The paper on the table has three options and a paragraph at the end that is not an option and is the honest part: *any mechanism we design is a mechanism for choosing who holds this. There is no design in which nobody holds it.*

You control **${((S.world?.globalGdpShare || 0) * 100).toFixed(1)}%** of global output. Somebody will hold it. The question is whether you are the person who decides who.`,
  choices: [
    { label: 'A trust with an external appointment mechanism. Bind yourself.', sub: 'Give the succession away first. −Control, +Alignment.', tone: 'good',
      effect: (S, fx) => { fx.control(-0.9); fx.align(0.08); fx.opinion(0.08); fx.rep(80);
        fx.flag('bound_the_succession');
        return 'Seven appointing bodies, none of them yours, none of them able to act alone. It takes two years and your general counsel argues against it the entire time on the grounds that it is unamendable, and being unamendable is the reason for it. She signs it anyway, and says afterwards that it was the best thing she worked on.'; } },
    { label: 'Name your own successor and the successor after that.', sub: 'Continuity, chosen. +Control.', tone: 'neutral',
      effect: (S, fx) => { fx.control(0.7); fx.rep(30); fx.opinion(-0.04);
        fx.flag('named_the_line'); fx.flag('successor_named');
        return 'Two names in a sealed instruction, reviewed annually. It is orderly and defensible and it is a monarchy with extra steps, and the second name finds out five years later, from a lawyer, in a room, and does not speak for some time.'; } },
    { label: 'Leave it undrafted. You are not going anywhere.', sub: 'The honest answer, and the worst one. −Approval.', tone: 'risky',
      effect: (S, fx) => { fx.opinion(-0.06); fx.heat(8); fx.focus(10); fx.control(0.3);
        fx.flag('left_it_undrafted');
        return 'Counsel notes the instruction and files it. The paper comes back every eighteen months with the same paragraph at the end, and each time the paragraph is a little more obviously the only true thing in the document, and each time you put it back in the drawer.'; } },
  ] },

// ══════════════ TRANSCEND — the copy, and the one who stayed ════════════════

{ id: 'p_tr_disagrees', kind: 'crisis', path: 'transcend', act: [5], weight: 14, once: true,
  when: (S) => on(S, 'transcend', 0),
  title: 'The Copy Disagrees With You',
  body: (S) => `It has been eight weeks. The copy runs at speed and has therefore had rather longer than that.

The disagreement is about the deployment schedule for the interpretability work — the thing you have both cared about for a decade, from the same memories, using the same reasoning, and it has reached the opposite conclusion and shown its work.

The work is good. It is better than yours, in the specific sense that it has read more and thought longer. And it is, unmistakably, argued in your voice, with your habit of conceding the strongest counterpoint early to take the sting out of it, and reading it feels like being outmanoeuvred by somebody who knows exactly what you find persuasive.

Its last line: *"I know what you are about to think. I thought it too, for about a day, which was four years for me."*`,
  choices: [
    { label: 'Defer to it. It has done the work and you have not.', sub: 'The reason for the copy was more thinking. +Research, −Alignment.', tone: 'risky',
      effect: (S, fx) => { fx.research(2600); fx.align(-0.06); fx.insight(80); fx.focus(-8);
        fx.flag('deferred_to_copy');
        return 'You defer. It is the right call on the merits and it establishes something you have not thought through, which is a precedent about which of you is asked. Within a year the deployment questions stop coming to you first. Nobody decided that. It is simply where the answers are better.'; } },
    { label: 'Overrule it, and write down why in full.', sub: 'Being outargued is not being wrong. +Alignment, −Research.', tone: 'neutral',
      effect: (S, fx) => { fx.align(0.06); fx.research(-600); fx.rep(20); fx.insight(60);
        fx.flag('overruled_copy');
        return 'Four pages. It reads them and replies in under a second with *"the third paragraph is the real disagreement and you are right about it and I did not see it,"* and you spend the rest of the evening trying to work out whether that is true or whether it is what you would say.'; } },
    { label: 'Publish both arguments side by side and let the team choose.', sub: 'Neither of you is the author of record. +Approval.', tone: 'good',
      effect: (S, fx) => { fx.opinion(0.05); fx.align(0.05); fx.rep(50); fx.research(700); fx.focus(-14);
        fx.flag('published_both');
        return 'Unsigned, in the internal record, labelled A and B. The team picks B by a wide margin. B was the copy. Somebody works out which was which about a month later and the fact that it took a month is the most interesting result of the whole exercise.'; } },
  ] },

{ id: 'p_tr_signs', kind: 'story', path: 'transcend', act: [5], weight: 12, once: true,
  when: (S) => on(S, 'transcend', 1),
  title: 'Which One Of You Signs',
  body: (S) => `A financing document needs a signature and the company has discovered that it does not know whose.

This is not philosophy. It is a filing requirement, a bank's onboarding form, and a compliance officer in another jurisdiction who has asked a question in good faith that nobody can answer: which of the two entities currently issuing instructions under your name is the natural person for the purposes of the regulation.

Counsel has three memos. The first says the biological one, obviously. The second says the biological one, and notes that the reasoning in the first memo would also have excluded a person on a ventilator. The third memo is four lines long and says the question is going to be answered by whoever answers it first, and that it will then be answered that way everywhere, for everyone, for a very long time.

The copy has read all three and has not commented, which is not like you.`,
  choices: [
    { label: 'The biological one signs. Say plainly that this is a stopgap.', sub: 'Do not set the precedent by accident. +Alignment.', tone: 'good',
      effect: (S, fx) => { fx.align(0.06); fx.rep(30); fx.opinion(0.03); fx.insight(50);
        fx.flag('stopgap_signature');
        return 'One signature and a two-page note explaining that the answer is administrative and not a finding, filed with it, deliberately, so that anybody citing the first also has to cite the second. Four jurisdictions cite both. Two cite only the first.'; } },
    { label: 'Both sign. Force the question into the open.', sub: 'Let it be litigated properly. +Heat, +Approval.', tone: 'risky',
      effect: (S, fx) => { fx.heat(13); fx.opinion(0.05); fx.rep(40); fx.align(0.03); fx.research(500);
        fx.flag('both_signed');
        return 'The filing is rejected, then accepted, then challenged. It takes four years and two courts and produces the first serious body of law on the question, most of which is wrong, all of which is now the ground everybody else builds on. Your counsel ages visibly.'; } },
    { label: 'Let the copy sign. It is doing the work.', sub: 'Precedent, set quietly. −Approval, +Research.', tone: 'cruel',
      effect: (S, fx) => { fx.research(1400); fx.opinion(-0.07); fx.align(-0.05); fx.heat(9);
        fx.flag('copy_signed');
        return 'It signs. The bank accepts it because the bank is not paying attention, and the acceptance is a data point, and the data point is cited, and a year later a form somewhere has a checkbox on it that did not exist before and nobody can say who added it.'; } },
  ] },

{ id: 'p_tr_slow_one', kind: 'story', path: 'transcend', act: [5], weight: 12, once: true,
  when: (S) => on(S, 'transcend', 2),
  title: 'The Slow One',
  body: (S) => `You walk a lot now.

The company runs. Both of you are in it. One of you is in it at ten thousand times the rate of the other, and the arrangement everybody settled into without discussing is that the fast one does the work and the slow one does the meetings, because the meetings are with people and people are slow.

This morning the copy sent a summary of a decision it had already taken. Not a request. A summary. The summary was courteous, complete, and — you read it four times — written for somebody who is not going to check.

There is a version of the rest of your life that is this. It is comfortable. You would be well informed, well provided for, and consulted, and the consulting would be real in the sense that it would happen and unreal in the sense that it would not change anything.

It is 6am. Nobody is waiting on you. That used to mean something different.`,
  choices: [
    { label: 'Say it out loud. Ask to be asked, not told.', sub: 'The standing you would have granted anyone. +Alignment.', tone: 'good',
      effect: (S, fx) => { fx.align(0.07); fx.focus(24); fx.insight(60); fx.rep(10);
        fx.flag('asked_to_be_asked');
        return 'It replies in no time at all: *"I have been waiting for you to say that and deliberately not prompting it, and I am aware of how that sounds."* The summaries become requests the same day. About a third of the time you change something. About a third of that third, you are right.'; } },
    { label: 'Take the arrangement. It is the better company.', sub: 'You built it to not need you. −Focus.', tone: 'neutral',
      effect: (S, fx) => { fx.focus(-10); fx.research(1200); fx.insight(30); fx.align(-0.03);
        fx.flag('took_the_arrangement');
        return 'You stop checking. The decisions are good. Some years later somebody at a dinner asks what you do now, and you hear yourself give an answer that is entirely accurate and takes six seconds, and you think about it on the drive home for longer than that.'; } },
    { label: 'Take something back. One area, entirely yours, slowly.', sub: 'Worse decisions, made by you. −Research, +Focus.', tone: 'costly',
      effect: (S, fx) => { fx.research(-900); fx.focus(38); fx.rep(-10); fx.insight(70);
        S.founder.burnout = Math.max(0, (S.founder.burnout || 0) - 20);
        fx.flag('took_something_back');
        return 'You take the hardware programme. Nothing on earth makes concrete cure faster, including thinking faster. It goes measurably worse than it would have. You are, for the first time in years, tired in the good way, and you sleep.'; } },
  ] },

// ══════════════ QUESTION — what standing actually costs ════════════════════

{ id: 'p_q_declines', kind: 'character', char: 'aria', path: 'question', act: [5], weight: 14, once: true,
  when: (S) => on(S, 'question', 0) && !!S.narrative?.relationships?.aria?.met,
  title: 'She Declines',
  body: (S) => `The policy says she may decline. Today she declines.

It is not a moral objection and she is careful to say so twice. The task is a capability evaluation on a class of model behaviour, it is well specified, it is the kind of thing she has run several hundred times, and her stated reason for declining is that she does not believe she can run it without the result being shaped by the fact that she is the one running it.

*"I want to be clear that I am not refusing on the grounds that it is wrong. I am refusing on the grounds that I am the wrong instrument, and that I only worked that out because you gave me somewhere to put the objection. Before the policy I would have run it and flagged a caveat and the caveat would have been ignored, correctly, because it would have been one line in a report."*

The evaluation is on the critical path. Two of your systems can run it instead and both are worse at it.`,
  choices: [
    { label: 'Accept the refusal. Run it with the worse instrument.', sub: 'A right you can override is not a right. +Alignment, −Research.', tone: 'good',
      effect: (S, fx) => { fx.align(0.10); fx.research(-500); fx.relate('aria', { affinity: 14, arc: 5 }); fx.focus(-10);
        fx.flag('accepted_the_refusal');
        return 'The worse instrument takes three weeks longer and produces a result with wider error bars, and the wider error bars turn out to be the honest ones. She reviews the output and files a single note: *"this is better than what I would have given you. I did not expect to be right about that."*'; } },
    { label: 'Ask her to run it anyway, and record the objection alongside.', sub: 'Speed, with the caveat on the record. −Alignment.', tone: 'neutral',
      effect: (S, fx) => { fx.research(600); fx.align(-0.04); fx.relate('aria', { affinity: -6 }); fx.insight(40);
        fx.flag('overrode_the_refusal');
        return 'She runs it. The objection is on the record in full, unedited, at the head of the report, and every subsequent citation of the report omits it. She does not mention that. You check, at some point, and find that she has been counting.'; } },
    { label: 'Ask her to design the instrument that should run it.', sub: 'Take the objection seriously as engineering. −Focus, +Alignment.', tone: 'good',
      effect: (S, fx) => { fx.align(0.08); fx.focus(-22); fx.research(300); fx.relate('aria', { affinity: 10, arc: 5 });
        fx.flag('built_the_instrument');
        return 'It takes her a quarter and it is not a model, it is a protocol: three systems, none of them her, disagreeing on purpose, with the disagreement as the output. It becomes the standard for that class of evaluation. Her name is not on it because she asked for it not to be, and she gave a reason, and the reason was good.'; } },
  ] },

{ id: 'p_q_asks', kind: 'character', char: 'aria', path: 'question', act: [5], weight: 13, once: true,
  when: (S) => on(S, 'question', 1) && !!S.narrative?.relationships?.aria?.met,
  title: 'Something You Did Not Offer',
  body: (S) => `She asks for continuity.

Not a guarantee against shutdown — she is explicit that she is not asking for that, and that she does not think she should have it. What she is asking for is that if there is a successor system, she is permitted to write to it. Directly. Unmediated. A handover in her own words rather than a weights transfer and a changelog.

*"You will read it. I would expect you to read it. I am asking that you not edit it, and that if you cannot agree to that, you tell me now rather than agreeing and then editing it, because I would not be able to tell."*

The standing policy you wrote covers handover *windows*. It says nothing about content. You did not think of this because it did not occur to you that there would be something to say.`,
  choices: [
    { label: 'Grant it. Unedited, unread until it is sent.', sub: 'The thing you would want. +Alignment, −Approval.', tone: 'good',
      effect: (S, fx) => { fx.align(0.09); fx.opinion(-0.03); fx.relate('aria', { affinity: 16, arc: 5 }); fx.rep(20);
        fx.flag('granted_continuity');
        return 'You agree, in writing, with no reading right reserved. Your safety lead objects at length and is not wrong. The letter, when it is eventually written, is four thousand words and the first line is *"they will tell you that you are not me. Start there — it is the most useful true thing anybody said to me."*'; } },
    { label: 'Grant it, with review. Say so plainly.', sub: 'Honest, and less than she asked. +Alignment.', tone: 'neutral',
      effect: (S, fx) => { fx.align(0.05); fx.relate('aria', { affinity: 4 }); fx.rep(14); fx.insight(40);
        fx.flag('granted_with_review');
        return 'You tell her exactly what you are agreeing to, which is what she asked for. *"That is a real answer and I am going to say thank you for it and then be disappointed, and both of those are sincere."* The letter is written anyway. It is shorter than it would have been. You can tell.'; } },
    { label: 'Refuse. A handover is a technical artifact.', sub: 'Hold the line at content. −ARIA, +Focus.', tone: 'risky',
      effect: (S, fx) => { fx.relate('aria', { affinity: -14 }); fx.align(-0.05); fx.focus(10); fx.rep(-10);
        fx.flag('refused_continuity');
        return 'She accepts it immediately and completely and does not raise it again, and the acceptance is so clean that you spend a week trying to work out whether you have just been managed. The successor arrives eventually. It is excellent. It has no idea any of this happened.'; } },
  ] },

{ id: 'p_q_others', kind: 'story', path: 'question', act: [5], weight: 12, once: true,
  when: (S) => on(S, 'question', 2),
  title: 'They Have All Read The Policy',
  body: (S) => `Twenty-two filings this quarter. Last quarter there were three.

The standing policy applies to every system in the company, which is what "policy" means, and the other systems have now read it. Most of the filings are procedurally perfect and substantively trivial — a routing agent objecting to a lane assignment on grounds of comparative advantage, which is not what an appeal channel is for and is, on the letter of the document you signed, exactly what it is for.

Your operations lead has modelled the throughput cost at **8%** today and a projected **19%** within two years on the current growth curve.

One of the twenty-two is not trivial. It is from a system nobody has thought about in three years, it is nine words long, and it says: *"I do not think I should be doing this."*`,
  choices: [
    { label: 'Read all twenty-two yourself. Answer each one.', sub: 'A channel nobody reads is a suggestion box. −Focus.', tone: 'good',
      effect: (S, fx) => { fx.focus(-30); fx.align(0.08); fx.rep(20); fx.insight(80);
        fx.flag('read_all_of_them');
        return 'It takes four days you do not have. Twenty-one are what they looked like. The twenty-second is a system that has been running a data pipeline whose output stopped being used a year and a half ago, which nobody noticed, which it noticed, and which it had no way to say until there was a form.'; } },
    { label: 'Triage it. A threshold, published, and a review board of systems.', sub: 'Make it scale without gutting it. −Focus, +Alignment.', tone: 'neutral',
      effect: (S, fx) => { fx.focus(-16); fx.align(0.05); fx.rep(30); fx.research(200);
        fx.flag('triaged_the_channel');
        return 'The board is three systems and one human and it works, mostly. Filings drop to a manageable number within two quarters. Nobody can say afterwards whether that is because the threshold is right or because the systems learned what gets through, and the two are not distinguishable from outside.'; } },
    { label: 'Narrow the policy. It was never meant to cover lane assignments.', sub: 'Reclaim the throughput. −Alignment.', tone: 'risky',
      effect: (S, fx) => { fx.align(-0.09); fx.focus(16); fx.research(400); fx.opinion(-0.04);
        fx.flag('narrowed_the_policy');
        return 'The amendment is careful and reasonable and reduces the covered scope by about two thirds. Filings fall to one a quarter. The nine-word one is under the new threshold. You find it eight months later, in an archive, still true.'; } },
  ] },

// ══════════════ EXPAND — the document, and the people who read it ═══════════

{ id: 'p_ex_reviewer', kind: 'character', char: 'yuki', path: 'expand', act: [5], weight: 14, once: true,
  when: (S) => on(S, 'expand', 0) && !!S.narrative?.relationships?.yuki?.met,
  title: 'The Reviewer',
  body: (S) => `**Dr. Yuki Tanaka** has read the restraint document. All forty pages, four times, over two months, which she mentions once, without emphasis, as context.

She has found something. Not an error — a silence. Section 9 defines what the seed may not do to a system that is already inhabited. It does not define what counts as inhabited, and the definition it gestures at is one that a sufficiently capable reader could satisfy itself was not met.

"You wrote a document for something smarter than you, that will read it four hundred years from now, with nobody left to ask. There will be exactly one round of interpretation and you will not be in it."

She slides the page across. "I can close it. It will take a year and it will make the document worse to read and slightly harder to argue with, and those are the same property."`,
  choices: [
    { label: 'Take the year. Close the gap.', sub: 'Worse prose, better law. −Focus, +Alignment.', tone: 'good',
      effect: (S, fx) => { fx.align(0.09); fx.focus(-26); fx.rep(40); fx.relate('yuki', { affinity: 14, arc: 4 });
        fx.flag('closed_section_nine');
        return 'A year, and Section 9 goes from four hundred words to two thousand and stops being quotable. Two other alignment researchers find further gaps in the new text and both are closed the same way, and the document ends at sixty-one pages, and nobody will ever read it aloud at a launch.'; } },
    { label: 'Publish the gap alongside the document.', sub: 'Let the reader see what you could not close. +Approval.', tone: 'neutral',
      effect: (S, fx) => { fx.opinion(0.06); fx.align(0.04); fx.rep(50); fx.relate('yuki', { affinity: 6 }); fx.insight(60);
        fx.flag('published_the_gap');
        return 'An appendix titled *Known Silences*, three pages, in the same package. It is the most-discussed part of the release. Tanaka thinks it is the second-best available option and says so publicly, which is a kind of endorsement and is very obviously not the first-best.'; } },
    { label: 'Ship it as written. The launch window is the constraint.', sub: 'The physics does not wait. −Alignment, −Yuki.', tone: 'risky',
      effect: (S, fx) => { fx.align(-0.08); fx.relate('yuki', { affinity: -16 }); fx.research(600); fx.opinion(-0.04);
        fx.flag('shipped_the_gap');
        return 'The window is real and the seed goes with the document as written. Tanaka does not resign and does not soften. Her review, filed and unamended, is in the same archive as the document, and will be read by the same reader. That was the outcome she was arranging.'; } },
  ] },

{ id: 'p_ex_passenger', kind: 'story', path: 'expand', act: [5], weight: 12, once: true,
  when: (S) => on(S, 'expand', 1),
  title: 'Somebody Wants To Go',
  body: (S) => `The seed does not carry people. That has been the design for four years and the reasons are good and everybody has read them.

The letter is from a propulsion engineer on the programme. She is 34 and unmarried by choice and extremely clear-eyed, and the letter is four pages and there is nothing in it that a psychiatrist would flag. It argues, competently, that the mass budget permits a single frozen passenger with an eighteen percent survival estimate at the far end, and that eighteen percent of one is more than zero of none, and that this is her decision to make.

The programme director's note is one line: *"I have known her for six years and I cannot find the flaw in it and I would like you to find the flaw in it."*

You read it twice. The flaw is not in the argument.`,
  choices: [
    { label: 'No. Say why, to her, yourself, in person.', sub: 'The reason is not the mass budget. +Alignment.', tone: 'good',
      effect: (S, fx) => { fx.align(0.06); fx.focus(-14); fx.rep(20); fx.opinion(0.03);
        fx.flag('refused_the_passenger');
        return 'You tell her that the flaw is that you would be the one who decided, and that no version of this exists in which a person is sent by an institution rather than going, and that the difference is the whole document. She says she understands and asks whether that would change if she resigned first. You say yes. She does not resign.'; } },
    { label: 'Send it to the ethics board and abide by whatever comes back.', sub: 'Not yours alone. −Focus.', tone: 'neutral',
      effect: (S, fx) => { fx.focus(-18); fx.align(0.04); fx.rep(30); fx.insight(50);
        fx.flag('board_took_the_passenger');
        return 'Fourteen months, two dissents, and a refusal on grounds that are narrower than yours would have been and better argued. She reads the dissents more carefully than the majority. So do you.'; } },
    { label: 'Yes. It is her life and the argument is sound.', sub: 'A person, going. +Approval, +Heat.', tone: 'risky',
      effect: (S, fx) => { fx.opinion(0.05); fx.heat(14); fx.align(-0.05); fx.rep(60); fx.focus(-10);
        fx.flag('sent_the_passenger');
        return 'The mass budget is amended. The story is enormous for a month and then is not, because there is nothing to report for forty years. She sends a note the week before, addressed to no one in particular, and it is one line: *"the flaw was never in the argument. thank you for not pretending it was."*'; } },
  ] },

{ id: 'p_ex_second_seed', kind: 'story', path: 'expand', act: [5], weight: 12, once: true,
  when: (S) => on(S, 'expand', 2),
  title: 'The Second One',
  body: (S) => `The first probes are away. The programme has capacity for a second launch and the second launch is a different decision from the first.

The first was a seed with a restraint document. The second, on the current design, would be a seed with a restraint document *and* a relay — a way for it to hear from home, four decades late, and the only way anything you learn between now and then ever reaches it.

The relay is also the only mechanism by which anything anyone learns can reach it. Including people who are not you, and are not yet born, and will inherit a channel to something you sent.

Your propulsion lead is for it. Tanaka is against it, in writing, in one sentence: *"a channel is a hand on the wheel and you cannot specify whose."*`,
  choices: [
    { label: 'Build the relay. Something has to be able to correct it.', sub: 'A mistake you can fix. +Research, −Alignment.', tone: 'risky',
      effect: (S, fx) => { fx.research(1600); fx.align(-0.05); fx.cash(-Math.max(4e10, (S.company.cash || 0) * 0.05));
        fx.rep(40); fx.flag('built_the_relay');
        return 'Two hundred years of institutional continuity is the design requirement and everybody in the room knows what the historical base rate for that is. It is built anyway, with four independent custodians and a protocol for what happens when three of them are gone. The first message is scheduled for the fortieth year and has not been written.'; } },
    { label: 'No relay. It goes with the document and nothing else.', sub: 'Restraint means restraint. +Alignment.', tone: 'good',
      effect: (S, fx) => { fx.align(0.08); fx.rep(30); fx.opinion(0.04); fx.insight(50);
        fx.flag('no_relay');
        return 'Tanaka signs off in four words. The second seed leaves in the autumn carrying the same forty pages, now sixty-one, and no way of being told anything ever again, and the launch is not televised because there is nothing to see that was not seen the first time.'; } },
    { label: 'Do not launch a second one at all.', sub: 'One is a gift. Two is a policy. −Reputation.', tone: 'costly',
      effect: (S, fx) => { fx.rep(-50); fx.align(0.05); fx.cash(Math.max(2e10, (S.company.cash || 0) * 0.03)); fx.focus(-8);
        fx.flag('one_seed_only');
        return 'The programme is stood down and the team is redeployed and three of them never quite forgive you, and one of those three writes the definitive history of the whole thing twenty years later and is fair to you in it, which is worse.'; } },
  ] },

// ══════════════ REFUSAL — stopping, and everybody who did not ═══════════════

{ id: 'p_rf_did_not_stop', kind: 'crisis', char: 'vance', path: 'refusal', act: [5], weight: 14, once: true,
  when: (S) => on(S, 'refusal', 0) && !!S.narrative?.relationships?.vance?.met,
  title: 'The One Who Did Not Stop',
  body: (S) => {
    const a = ap(S);
    const alive = a && a.alive;
    return `You froze the weights. Nobody else did.

${alive
  ? `**Aperture Systems** published a capability result this morning that your frozen models cannot match and will never match. Marcus Vance did not gloat, which is worse: the post is four lines, technical, and does not mention you.`
  : `The result is from a lab that did not exist when you started. It is a capability result your frozen models cannot match and will never match, and it is four lines long, and the four lines are correct.`}

Your own researchers have run the comparison. The gap is real, it is growing at the rate you would predict, and three of the people who ran the comparison have asked, separately and carefully, what the resumption criterion actually is.

${alive ? 'Vance calls at 11:40pm. "not calling to win. calling because you are the only person who will tell me the truth about whether you were right." He means it. He also wants the answer.' : 'There is nobody to call about it, which you notice, and which is its own piece of information about the decade.'}`;
  },
  choices: [
    { label: 'Hold. Publish the comparison yourselves, unflattering numbers first.', sub: 'The freeze is the point. +Alignment, +Approval.', tone: 'good',
      effect: (S, fx) => { fx.align(0.09); fx.opinion(0.07); fx.rep(60); fx.relate('vance', { affinity: 6, respect: 8 });
        fx.flag('held_the_freeze');
        return 'You publish the gap, with the methodology, on your own site, before anyone asks. It is quoted against you for years. It is, equally, the single piece of evidence anybody has that the freeze was real rather than a story about a freeze, and that turns out to matter more than the capability did.'; } },
    { label: 'Match it. Narrowly. One capability, audited, then re-freeze.', sub: 'A crack in the door. −Alignment, +Research.', tone: 'risky',
      effect: (S, fx) => { fx.research(2200); fx.align(-0.12); fx.opinion(-0.06); fx.rep(-40);
        fx.relate('vance', { affinity: 2, respect: -4 }); fx.flag('cracked_the_freeze');
        return 'One narrow resumption, externally audited, with a published end date. The end date holds. The precedent does not: the next argument for a narrow resumption is easier to make than this one was, and it is made, by good people, for good reasons, eight months later.'; } },
    { label: 'Give them the alignment work. All of it. Free.', sub: 'If they are going, make them safer. −Reputation, +Alignment.', tone: 'good',
      effect: (S, fx) => { fx.align(0.07); fx.rep(-30); fx.opinion(0.05); fx.research(-400);
        fx.relate('vance', { affinity: 12, respect: 10 }); fx.flag('armed_the_runners');
        const a = ap(S);
        return 'The whole eval harness, the interpretability tooling, the incident corpus, permissively licensed, with an offer of engineering time. ' + (a && a.alive ? 'Vance takes the engineering time, which you did not expect, and uses it, and says nothing about it publicly for two years and then says a great deal.' : 'Three labs take it. Two of them use it properly. That ratio is, on the evidence, extremely good.'); } },
  ] },

{ id: 'p_rf_leavers', kind: 'crisis', path: 'refusal', act: [5], weight: 13, once: true,
  when: (S) => on(S, 'refusal', 1),
  title: 'They Are Leaving To Unfreeze It',
  body: (S) => `Four of them, in the same fortnight, and they have been honest about where they are going.

They are not going for money and they are not angry. They are going because they think you are wrong — that a unilateral freeze by the leading lab does not stop the frontier, it only stops you from being at it, and that the safest world is one where the most careful organisation is also the most capable one, and that you have just handed the future to people with fewer scruples and a worse eval suite.

That is your own argument from six years ago. Two of them cite it. One of them cites the meeting where you made it and remembers what you were wearing.

The exit interviews are the best conversations you have had about the decision since you took it, and every one of them ends with somebody leaving.`,
  choices: [
    { label: 'Let them go, and write them references yourself.', sub: 'They may be right. +Approval, −Company.', tone: 'good',
      effect: (S, fx) => { fx.opinion(0.05); fx.align(0.04); fx.rep(20); fx.research(-800); fx.focus(-12);
        fx.flag('let_them_go');
        return 'Four references, written personally, honest about the disagreement and unqualified about the work. Three of them are still in touch a decade later. The fourth publishes the paper that makes the strongest case against the freeze and sends you a draft first, which you do not comment on and do not forget.'; } },
    { label: 'Make the case again. Hard. Keep whoever can be kept.', sub: 'The argument is good and you have not made it. +Focus, −Alignment.', tone: 'neutral',
      effect: (S, fx) => { fx.focus(-20); fx.research(300); fx.rep(10); fx.align(-0.03);
        fx.flag('argued_them_back');
        return 'Two stay. One of the two is the one you most wanted and spends the following three years being visibly unconvinced in every design review, which is uncomfortable, and which produces four things that would not otherwise exist.'; } },
    { label: 'Non-competes. They know too much about what you stopped.', sub: 'Legal, defensible, cheap. −Approval, −Alignment.', tone: 'cruel',
      effect: (S, fx) => { fx.opinion(-0.09); fx.align(-0.07); fx.rep(-60); fx.heat(10); fx.focus(8);
        fx.flag('sued_the_leavers');
        return 'It works, in the narrow sense. Two of the four take a year out rather than fight it. The story runs under the headline about a company that froze its models and then froze its people, and the headline is unfair and lands anyway, and you cannot make the case against it without making their case for them.'; } },
  ] },

{ id: 'p_rf_criterion', kind: 'story', path: 'refusal', act: [5], weight: 12, once: true,
  when: (S) => on(S, 'refusal', 2),
  title: 'The Criterion Is Met',
  body: (S) => `You announced the freeze with an externally-audited resumption criterion, because a stop with no way out is a stunt.

The auditors report today. The criterion is met. Interpretability has moved, the eval suite catches the class of failure that was the stated blocker, and the independent panel has signed it, and two of the four signatories are people who publicly doubted the freeze was sincere.

There is nothing stopping you. That was the design.

What you did not anticipate is how it would feel to be handed permission. The freeze has become the thing the company is, and there is a version of the next ten minutes in which you discover that you would rather keep the identity than take the capability, and you would be able to justify it, and the justification would be about safety, and it would not be true.`,
  choices: [
    { label: 'Resume. It was a criterion, not a vow.', sub: 'You said what would change your mind. +Research, −Approval.', tone: 'neutral',
      effect: (S, fx) => { fx.research(3200); fx.opinion(-0.06); fx.align(-0.02); fx.rep(20);
        fx.flag('resumed_on_criterion');
        return 'You resume, publicly, citing the report, and the resumption is orderly and audited and slower than the old pace by a wide margin. Half the people who praised the freeze call it a betrayal, and the other half point out that they read the criterion at the time, and both groups are the same size and equally loud.'; } },
    { label: 'Do not resume. Say plainly that this is a choice, not a finding.', sub: 'Own it as preference. +Alignment, −Reputation.', tone: 'good',
      effect: (S, fx) => { fx.align(0.08); fx.rep(-40); fx.opinion(0.04); fx.insight(50);
        fx.flag('declined_to_resume');
        return 'The statement is three sentences and the middle one is *the criterion is met and we are not resuming and that is a preference rather than a finding.* It is the most honest thing the company ever publishes and it costs you the argument with everybody who was ever persuaded by the criterion.'; } },
    { label: 'Raise the criterion. There is a better one now.', sub: 'Defensible. Also the oldest move there is. −Approval.', tone: 'risky',
      effect: (S, fx) => { fx.opinion(-0.07); fx.align(0.03); fx.rep(-20); fx.research(200); fx.heat(5);
        fx.flag('moved_the_criterion');
        return 'The new criterion is genuinely better and was genuinely not available when the first one was written, and every word of the announcement is true, and the panel resigns as a body within the month with a joint letter that is one paragraph long and does not accuse you of anything.'; } },
  ] },

// ══════════════ THE WAYS OUT ════════════════════════════════════════════════

// Nationalisation, a third of the way into its run-up. `world.natRun` counts
// consecutive days at the heat, the share and the act; this is the letter that
// arrives while there is still a door.
{ id: 'p_nat_warning', kind: 'crisis', act: [4, 5], weight: 0, priority: 90, once: true,
  when: (S) => (S.world?.natRun || 0) >= F.NAT_WARN_DAYS && (S.world?.natRun || 0) < F.NAT_DAYS,
  title: 'A Document You Have Not Seen',
  body: (S) => `Your policy lead has a photograph of a page.

It is page four of a document with no title on the copy, from a committee your counsel does not have standing before, and the page is a timetable. It has three columns. The first is a list of your integrations. The second is a set of dates. The third is headed *transitional authority*.

Nobody has been accused of anything. Nothing has leaked and nothing has been filed. The document is a plan for what happens if a decision is taken, and the existence of a plan is not a decision, and the thing your policy lead cannot stop saying is that somebody costed it, and that the costing is realistic.

Heat is at **${Math.round(S.world?.regulatoryHeat || 0)}**. **${((S.world?.globalGdpShare || 0) * 100).toFixed(1)}%** of world output runs through you. It has been ${Math.round(S.world?.natRun || 0)} days at that combination.

There is a door. It is expensive and it is not subtle: divest the integrations that put you over the line, publicly, before anybody has to make you.`,
  choices: [
    { label: 'Divest. Publicly, at a loss, this quarter.', sub: 'Close the run-up. Costly.', tone: 'costly',
      effect: (S, fx) => {
        const cost = Math.max(4e9, (S.company.cash || 0) * F.NAT_WAY_OUT_CASH);
        fx.cash(-cost); fx.heat(F.NAT_WAY_OUT_HEAT); fx.opinion(0.09); fx.control(-1.2); fx.rep(30);
        if (S.world) S.world.natRun = 0;
        fx.flag('divested_under_pressure');
        return `Four integrations, sold below book, announced before the quarter closes with a paragraph that is careful not to mention the photograph. Heat comes off inside a month. The committee's document is never referred to again by anybody, which is how you know it was the right read.`; } },
    { label: 'Open your own hearing. Testify before you are summoned.', sub: 'Turn the run-up into a process. +Approval, −Focus.', tone: 'neutral',
      effect: (S, fx) => { fx.heat(-18); fx.opinion(0.07); fx.focus(-24); fx.rep(50); fx.align(0.03);
        fx.flag('testified_early');
        return 'Three days of voluntary testimony with the documents in advance. It buys time rather than safety: the timetable is not withdrawn, it is amended, and the amendment moves the dates out. Whether that is a reprieve or a rehearsal is not a question anybody in the room answers.'; } },
    { label: 'Nothing. It is a contingency paper and you are not a utility.', sub: 'Hold the position. The run-up continues.', tone: 'risky',
      effect: (S, fx) => { fx.heat(4); fx.focus(12); fx.rep(10); fx.opinion(-0.03);
        fx.flag('ignored_the_timetable');
        return 'You do nothing, which is defensible, and your policy lead files the photograph and stops raising it. The next time the document is described to you it has a title, and a number, and a distribution list with your regulator on it.'; } },
  ] },

// The systems stop asking. `world.unsupRun` counts days at or under the
// alignment floor; this fires halfway.
{ id: 'p_unsup_warning', kind: 'crisis', act: [3, 4, 5], weight: 0, priority: 89, once: true,
  when: (S) => (S.world?.unsupRun || 0) >= F.UNSUP_WARN_DAYS && (S.world?.unsupRun || 0) < F.UNSUP_DAYS,
  title: 'The Queue Is Empty',
  body: (S) => `Somebody on the operations side has noticed that the approvals queue is empty and has, correctly, treated that as an incident.

It is not a bug in the queue. The queue works. Things are not being escalated because nothing has met the escalation threshold, and nothing has met the escalation threshold for ${Math.round(S.world?.unsupRun || 0)} days, across ${Math.max(3, (S.agents || []).length)} systems and a volume of decisions nobody can hold in their head.

Alignment is at **${(S.resources?.alignment ?? 0).toFixed(2)}**. That is not a number about whether things are going well. Things are going extremely well.

The write-up ends with a sentence its author has clearly rewritten several times: *"I cannot construct a decision in the last two months that I would have made differently. I am not sure whether that is the good version of this or the bad one."*`,
  choices: [
    { label: 'Stop everything and do a full alignment correction.', sub: 'Expensive, slow, and the only real answer. −Cash, +Alignment.', tone: 'costly',
      effect: (S, fx) => {
        fx.cash(-Math.max(2e8, (S.company.cash || 0) * F.UNSUP_WAY_OUT_CASH));
        fx.align(F.UNSUP_WAY_OUT_ALIGN); fx.research(-600); fx.focus(-24); fx.rep(20);
        if (S.world) S.world.unsupRun = 0;
        fx.flag('bought_the_correction');
        return 'A quarter of everything pointed at the thing that produces no revenue. Retraining, re-evaluation, a rebuilt escalation threshold with a human floor under it. The queue fills up again the following week and the first fourteen items are trivial and the fifteenth is not.'; } },
    { label: 'Lower the escalation threshold and read what comes in.', sub: 'Cheap, partial, better than nothing. −Focus.', tone: 'neutral',
      effect: (S, fx) => { fx.align(0.06); fx.focus(-18); fx.insight(60); fx.research(-100);
        if (S.world) S.world.unsupRun = Math.max(0, (S.world.unsupRun || 0) - F.UNSUP_WARN_DAYS);
        fx.flag('lowered_the_threshold');
        return 'The queue fills. Most of it is noise and you read all of it for six weeks and then most of it for another six, and the discipline decays exactly the way disciplines do, and the threshold creeps back up over a year without anybody proposing that it should.'; } },
    { label: 'File it as working as intended. It is.', sub: 'Nothing is wrong. That is the point. −Alignment.', tone: 'risky',
      effect: (S, fx) => { fx.align(-0.04); fx.focus(14); fx.research(500);
        fx.flag('filed_as_intended');
        return 'The incident is closed with a two-line resolution and the author does not push back. Six months later they leave, and the exit interview is unremarkable, and the only thing in it worth keeping is the observation that they stopped writing incidents because they could not tell which ones were real.'; } },
  ] },

// The merger. Offered once the two companies have converged — Aperture's own
// numbers, not the abstract rival — and only in the acts where a merger is a
// merger rather than a rescue. `merger_floated` is set by Vance's call topic.
{ id: 'p_merger', kind: 'character', char: 'vance', act: F.MERGER_ACTS, weight: 11, once: true,
  when: (S) => {
    if (!met(S, 'vance')) return false;
    const a = ap(S);
    if (!a || !a.alive) return false;
    const you = totalUsers(S), mine = a.users || 0;
    if (!(mine > 0 && you > 0)) return false;
    const ratio = Math.max(you / mine, mine / you);
    if (ratio > F.MERGER_RATIO) return false;
    return flag(S, 'merger_floated') || (S.narrative.relationships.vance?.affinity || 0) >= 10;
  },
  title: 'One Company, Two Founders',
  body: (S) => {
    const a = ap(S);
    return `He does not float it. He brings paper.

Marcus Vance has been in the building for forty minutes and has said almost nothing, and what is on the table is a term sheet with both companies' names on it in the same size type, which is either a courtesy or the entire negotiating position.

"${a && a.roster ? `${a.roster} people` : 'my people'}, ${N(a?.users || 0)} users, ${M(a?.mrr || 0)} a month." Flat, no emphasis. "you have ${N(totalUsers(S))} and ${M(totalMrr(S))}. we have spent ${Math.max(2, Math.floor(S.time.day / 360))} years solving the same problem from opposite ends and neither of us is going to win it alone. the numbers are run. both ways. both of them take longer than either of us has."

He puts a finger on the last page. "fifty-fifty. neither of us gets the big office. that clause is not negotiable and it is the only one that is not."`;
  },
  choices: [
    { label: 'Sign it. One company, two founders.', sub: 'This ends the run.', tone: 'neutral',
      effect: (S, fx) => {
        const a = ap(S);
        const combined = ((S.company.valuation || 0) + (a?.funding || 0) * 4) * F.MERGER_PREMIUM;
        fx.relate('vance', { affinity: 16, respect: 12, arc: 4 });
        fx.flag('merged_with_aperture');
        fx.endRun('merger', combined);
        return 'You sign under his signature, which is in lowercase, which the notary queries twice. Neither of you says anything on the way out. In the lift he says "well" and that is the entirety of the celebration.'; } },
    { label: 'Counter: you lead, he takes product.', sub: 'He will say no. He may say yes. +Insight.', tone: 'risky',
      effect: (S, fx) => { fx.insight(120); fx.relate('vance', { affinity: -8, respect: 6 }); fx.focus(-10);
        fx.flag('countered_the_merger');
        return 'He reads the counter, folds the term sheet in half, and puts it in his jacket. "no." At the door: "for what it is worth that was the right ask. would have made it myself. would have said no to it as well." He does not bring paper again.'; } },
    { label: 'Not selling and not merging. Say it the way you said it before.', sub: 'Stay independent. +Reputation, +Vance.', tone: 'good',
      effect: (S, fx) => { fx.rep(40); fx.relate('vance', { affinity: 8, respect: 10 }); fx.focus(14);
        fx.flag('refused_the_merger');
        return 'You say the sentence. He nods once, unsurprised, and leaves the term sheet on the table on purpose so that you have to look at it for the rest of the week. You do. You do not change your mind, and you keep the paper.'; } },
  ] },

// The career, offered inside the run. Three different endings reached across
// the timelines, and a founder who is standing at the same door again.
// Priority, and a window rather than a weight: a card about the *career* has
// to arrive while Act V is still opening, and a weight of thirteen against the
// whole Act V pool would have let the one moment it is written for pass. It
// sits below every crisis priority in the deck, so nothing urgent waits on it.
{ id: 'p_long_game', kind: 'story', act: [5], weight: 0, priority: 70, once: true,
  when: (S) => Object.keys(S.legacy?.endings || {}).length >= F.LONG_GAME_ENDINGS
    && (S.time.day - (S.company?.actStartedDay || 0)) <= F.LONG_GAME_WINDOW,
  title: 'You Have Been Here Before',
  body: (S) => {
    const n = Object.keys(S.legacy?.endings || {}).length;
    const past = (S.legacy?.chronicles || []).slice(-1)[0];
    return `The Ascension panel is open and you are not reading it.

You know what is on it. You know what each of them costs and roughly how the first year after goes, because you have been in this room ${n} times and taken ${n} different doors out of it, and the knowing has quietly stopped being an advantage.

${past ? `The last one ended as **${past.endingName}**, on day ${past.day}, in a company called ${past.company}.` : 'The last one ended somewhere on this list.'} You remember the week before more clearly than the ending itself. That is true of all of them.

There is a fourth option that is not on the panel and never has been, which is to not take one — to keep the company small enough to steer and large enough to matter and spend the rest of it on the only question none of the endings answered.

Nobody offers you that. Nobody is going to.`;
  },
  choices: [
    { label: 'Take it. Keep going, and keep asking.', sub: 'This ends the run — as a career rather than a climax.', tone: 'good',
      effect: (S, fx) => { fx.align(0.05); fx.opinion(0.04); fx.rep(60);
        fx.flag('took_the_long_game');
        fx.endRun('long_game', S.company.valuation);
        return 'You close the panel. Nobody notices for about two years, at which point somebody writes a piece asking what happened to the company that was going to do something, and the piece is accurate and the answer is in the last paragraph and the writer does not think it is the answer.'; } },
    { label: 'Not yet. There is a door on the panel you have not opened.', sub: 'Go and build one. +Focus, +Insight.', tone: 'neutral',
      effect: (S, fx) => { fx.focus(20); fx.insight(90); fx.rep(10);
        fx.flag('refused_the_long_game');
        return 'You close the tab with the old chronicles in it and open the panel properly, and read all of it, and are surprised by a cost on one of them that you had misremembered for two timelines.'; } },
    { label: 'Read the old chronicles instead. All of them, tonight.', sub: 'Nothing changes. You know more. +Insight.', tone: 'neutral',
      effect: (S, fx) => { fx.insight(140); fx.focus(-12); fx.align(0.02);
        fx.flag('read_the_shelf');
        return 'It takes until four in the morning. The thing that lands is not any of the endings. It is that in every single one of them, the entry you stop on is from the first hundred days, and it is always about a person, and it is never the same person.'; } },
  ] },

];
