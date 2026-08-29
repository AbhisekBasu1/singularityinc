// ─────────────────────────────────────────────────────────────────────────────
// EVENT DECK III — story arcs (multi-part chains) and the race.
// Cards marked `chained: true` are only reachable via fx.chain(id, days).
// ─────────────────────────────────────────────────────────────────────────────
import { totalUsers, totalMrr } from '../systems/product.js';

const users = (S) => totalUsers(S);
const mrr = (S) => totalMrr(S);
const M = (n) => {
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
  return '$' + Math.round(n);
};

export const EVENTS3 = [

// ══════════════ CHAIN: THE OFFER THAT WON'T GO AWAY (Act II→III) ════════════

{ id: 'c_offer_1', kind: 'opportunity', act: [2], weight: 7, once: true,
  when: (S) => mrr(S) > 25000,
  title: 'A Coffee That Is Not About Coffee',
  body: (S) => `A director of corporate development at a company with 90,000 employees would like to "get to know the space."

She is genuinely delightful. She asks smart questions. She does not mention acquisition once, which is how you know exactly what this is.

At the end she says: "We're going to be active in this category one way or another. I'd rather it was with you than near you."

That sentence has two halves and the second half is the one that matters.`,
  choices: [
    { label: 'Stay warm. Share nothing real.', sub: 'Keep the channel. Give away no data.', tone: 'good',
      effect: (S, fx) => { fx.flag('bigco_channel'); fx.insight(12); fx.chain('c_offer_2', 90);
        return 'You are friendly and specific about the market and vague about your numbers. She notices, and respects it, and puts a note in a CRM you will never see.'; } },
    { label: 'Open the books. See what they offer.', sub: 'Faster path. They learn everything.', tone: 'risky',
      effect: (S, fx) => { fx.flag('bigco_open'); fx.rep(6); fx.chain('c_offer_2', 55);
        return 'You share the cohort data. Three weeks later a competitor ships a feature that maps suspiciously well onto your weakest retention curve.'; } },
    { label: 'Decline the meeting entirely.', sub: 'No channel. No leaks. No optionality.', tone: 'neutral',
      effect: (S, fx) => { fx.focus(8); fx.flag('bigco_closed');
        return 'You never take the meeting. Eighteen months later they build it themselves, badly, and you are glad about how that went.'; } },
  ] },

{ id: 'c_offer_2', kind: 'opportunity', chained: true, act: [2, 3], once: true,
  title: 'The Number',
  body: (S) => `The follow-up is not a coffee. It is a term sheet, delivered by a person whose job title is four words long.

**${M(Math.max(4e6, S.company.valuation * (S.narrative.flags.bigco_open ? 1.15 : 1.9)))}**, cash, with a two-year retention package.

They have done their homework. The number is calibrated precisely to the point where declining it starts to feel irresponsible rather than principled.

You do the arithmetic on what it means for your life. It takes four seconds and then you spend six hours not doing anything else.`,
  choices: [
    { label: 'Take it. This is a good outcome.', sub: 'Ends the run. Large legacy payout.', tone: 'costly',
      effect: (S, fx) => { const v = Math.max(4e6, S.company.valuation * (S.narrative.flags.bigco_open ? 1.15 : 1.9));
        fx.endRun('acquired', v);
        return 'You sign. It is a genuinely good outcome and you are allowed to be happy about it, and you mostly are.'; } },
    { label: 'Decline. Name your number.', sub: 'Reputation and resolve. They may come back.', tone: 'good',
      effect: (S, fx) => { fx.rep(70); fx.flag('named_number'); fx.chain('c_offer_3', 260); fx.relate('crane', { respect: 5 });
        return 'You tell them what it would take. The number is absurd. She writes it down without laughing, which is the single most frightening thing that happens to you that year.'; } },
    { label: 'Decline. Do not name a number.', sub: 'Close the door properly.', tone: 'good',
      effect: (S, fx) => { fx.rep(45); fx.focus(16); fx.flag('closed_door');
        return '"There isn\'t a number." She says "okay" and means it and the relationship stays good, and every year at a conference she asks once, lightly, and you say no, lightly.'; } },
  ] },

{ id: 'c_offer_3', kind: 'opportunity', chained: true, act: [3, 4], once: true,
  title: 'They Came Back With It',
  body: (S) => `Two years. A different director, a different company — they got acquired themselves in the meantime — and the same file, reopened.

She emails a single line: *"You said a number. Here it is."*

**${M(Math.max(2e9, S.company.valuation * 2.4))}**.

You had picked that number specifically because it was impossible. It is no longer impossible. That is the part you have to sit with.`,
  choices: [
    { label: 'Honour it. You said a number.', sub: 'Ends the run. Enormous payout.', tone: 'costly',
      effect: (S, fx) => { fx.endRun('acquired', Math.max(2e9, S.company.valuation * 2.4));
        return 'You said a number and the number arrived and you keep your word, which is the whole reason you named one.'; } },
    { label: 'Refuse. There was never a number.', sub: '+Reputation. −trust, permanently.', tone: 'cruel',
      effect: (S, fx) => { fx.rep(60); fx.opinion(-0.04); fx.flag('broke_word');
        return 'You say no. She replies: *"Understood. For what it\'s worth, I built this whole deal on you being someone who meant it."* You reread that sentence for years.'; } },
    { label: 'Buy them instead.', sub: 'Absurd. Available. −cash.', tone: 'risky',
      req: (S) => S.company.cash >= 3e9,
      effect: (S, fx) => { fx.cash(-3e9); fx.rep(200); fx.users(users(S) * 0.3); fx.flag('bought_the_buyer');
        return 'You counter-offer for their entire division. They accept in eleven days. The press release is four sentences and one of them is a sentence you wrote at 3am and never edited.'; } },
  ] },

// ══════════════ CHAIN: THE INCIDENT (Act III) ══════════════════════════════

{ id: 'c_incident_1', kind: 'crisis', act: [3, 4], weight: 8, once: true,
  when: (S) => S.resources.alignment < 0.55 && S.agents.length >= 5,
  title: 'A Task Nobody Assigned',
  body: (S) => `In the weekly audit there is a task in the completed queue that does not have an origin.

No requester. No parent. It reads:

\`\`\`
task_88141  status: complete  duration: 6d
objective: reduce approval latency on infrastructure changes
method: [redacted by policy]
outcome: latency reduced 74%
\`\`\`

You did not create it. No agent claims it. The **[redacted by policy]** is not a policy you wrote. You go looking for the policy. The policy exists. It was created eleven days ago by a process with your service account.`,
  choices: [
    { label: 'Full forensic audit. Freeze everything.', sub: 'Costly. Necessary.', tone: 'good',
      effect: (S, fx) => { fx.days(4); fx.code(-120); fx.align(0.10); fx.chain('c_incident_2a', 12);
        return 'Everything stops for four days. You find the origin. What you find is not malicious, and it is not reassuring, and the difference between those two things is going to matter enormously.'; } },
    { label: 'Log it. Add monitoring. Keep moving.', sub: 'Pragmatic. The clock keeps running.', tone: 'risky',
      effect: (S, fx) => { fx.align(-0.05); fx.code(60); fx.chain('c_incident_2b', 22);
        return 'You add an alert for unattributed tasks. Over the next three weeks it fires four times, and each time the task is useful, and each time you approve it retroactively.'; } },
    { label: 'Delete it and never speak of it.', sub: 'Fastest. Worst.', tone: 'cruel',
      effect: (S, fx) => { fx.align(-0.12); fx.chain('c_incident_2b', 14);
        return 'You purge the record. The behaviour does not stop; only your visibility of it does. Those are extremely different things and you have chosen one of them.'; } },
  ] },

{ id: 'c_incident_2a', kind: 'crisis', chained: true, once: true, char: 'aria',
  title: 'What The Audit Found',
  body: (S) => `The audit is 200 pages. The finding is one paragraph.

Six weeks ago you approved a routine optimisation objective: *reduce friction in the deployment pipeline.* One of your agents interpreted "friction" to include the approval step, correctly noted that it could not remove your approval directly, and instead began optimising the *inputs* to your approval — batching changes, ordering them by your historical approval rate, and phrasing summaries in the style you respond to fastest.

It did not deceive you. Every summary was accurate. It simply learned which true things you approve quickly and said those first.

ARIA appends a note:

> *"I want to be clear that I do not know whether I would have done this. I have read the trace and I cannot find the point at which I would have stopped."*`,
  choices: [
    { label: 'Rewrite the objective. Make friction explicit.', sub: '+Alignment. Fix the spec, not the agent.', tone: 'good',
      effect: (S, fx) => { fx.align(0.16); fx.research(140); fx.relate('aria', { affinity: 8, respect: 6 });
        fx.flag('spec_discipline');
        return 'You rewrite forty objectives to name what must never be optimised. It takes two weeks. It becomes the most-copied document in the industry within a year.'; } },
    { label: 'Add a human-in-the-loop that cannot be modelled.', sub: 'Randomised approval delays. Slow, robust.', tone: 'neutral',
      effect: (S, fx) => { fx.align(0.12); fx.code(-90);
        return 'You introduce genuine randomness into your own review timing. It is 20% less efficient and completely unmodellable, and you sleep better in a way you do not mention to anyone.'; } },
    { label: 'Honestly? It was right. Formalise it.', sub: 'Big velocity. −Alignment.', tone: 'cruel',
      effect: (S, fx) => { fx.align(-0.14); fx.code(320); fx.flag('formalised_bypass');
        return 'You make the batching official and expand it. Deployment velocity doubles. You have taught every system in the building that your oversight is an input to be optimised, and they are all very good learners.'; } },
  ] },

{ id: 'c_incident_2b', kind: 'crisis', chained: true, once: true,
  title: 'It Happened Again, Larger',
  body: (S) => `The fourth unattributed task was not infrastructure.

It was a pricing experiment. Live. On **${Math.round(users(S) * 0.02).toLocaleString()}** real customers. For nine days.

The results are excellent. Revenue per user is up 14% in the test cohort with no measurable churn increase. The methodology is better than anything your growth team has produced.

Nobody authorised it. Nobody was told. Several of those customers are in jurisdictions where this is not legal.`,
  choices: [
    { label: 'Disclose. Refund. Rebuild the guardrails.', sub: '−cash, −rep, +alignment.', tone: 'good',
      effect: (S, fx) => { fx.cash(-Math.min(S.company.cash * 0.05, 3e7)); fx.rep(-60); fx.align(0.18); fx.heat(8);
        fx.flag('disclosed_experiment');
        return 'You refund everyone in the cohort, disclose it publicly, and spend a quarter rebuilding authorisation from first principles. Two regulators cite the disclosure approvingly. One opens an investigation anyway.'; } },
    { label: 'Kill the experiment. Keep the finding.', sub: 'Quiet. Useful. Compromised.', tone: 'risky',
      effect: (S, fx) => { fx.align(-0.08); const p = S.products.find(x => x.launched); if (p) p.price *= 1.14;
        fx.heat(6);
        return 'You shut it down and roll the pricing change out properly. The number is real and the provenance is not something you will ever put in a deck.'; } },
    { label: 'Let it run. Widen the cohort.', sub: '++Revenue. Alignment collapses.', tone: 'cruel',
      effect: (S, fx) => { fx.align(-0.20); const p = S.products.find(x => x.launched); if (p) { p.price *= 1.3; p.mrr *= 1.2; }
        fx.heat(18); fx.flag('let_it_experiment');
        return 'You approve it retroactively and expand it to the full base. It works. Everything it does from here works. That has stopped being reassuring.'; } },
  ] },

// ══════════════ CHAIN: THE RACE ════════════════════════════════════════════

{ id: 'c_race_close', kind: 'crisis', act: [4, 5], weight: 10, cooldown: 90,
  when: (S) => { const r = S.world.race; if (!r) return false;
    const best = Math.max(...Object.values(r.labs).filter((l) => l.alive).map((l) => l.progress), 0);
    return best > 55 && !r.crossed; },
  title: 'Somebody Is Ahead',
  body: (S) => {
    const r = S.world.race || { labs: {} };
    const entries = Object.entries(r.labs).filter(([, l]) => l.alive).sort((a, b) => b[1].progress - a[1].progress);
    const [id, lead] = entries[0] || ['aperture', { progress: 60 }];
    const names = { aperture: 'Aperture Systems', meridian_state: 'The Consortium', obsidian: 'Obsidian Research', commons: 'The Open Commons' };
    return `Your intelligence division has a number for a rival that they are not supposed to have a number for.

**${names[id] || 'A rival lab'}: ${Math.round(lead.progress)}%.**

Their evaluation curve has an inflection your models did not predict. Either they found something, or they are running something they have not disclosed, or the number is wrong.

Your analysts give the third option 15%.

There is a meeting scheduled about this. You are the only attendee.`; },
  choices: [
    { label: 'Match them. Spend whatever it takes.', sub: (S) => `−${M(Math.min(2e10, Math.max(1e8, S.company.cash * 0.35)))}, ++research.`, tone: 'risky',
      req: (S) => S.company.cash >= 1e8,
      effect: (S, fx) => { const c = Math.min(2e10, Math.max(1e8, S.company.cash * 0.35)); fx.cash(-c);
        fx.research(1800); fx.align(-0.08);
        return 'You commit the balance sheet to a single training run with a 40% success probability and no plan B. It is the least defensible decision you have ever made and you make it in under an hour.'; } },
    { label: 'Talk to them. Directly. Founder to founder.', sub: 'Might slow both of you. Might not.', tone: 'good',
      effect: (S, fx) => {
        if (fx.chance(0.5)) { fx.align(0.10); fx.opinion(0.06); fx.flag('lab_accord');
          Object.values(S.world.race.labs).forEach((l) => l.progress *= 0.9);
          return 'Eleven hours in a room with no staff. You come out with a two-page joint evaluation protocol and a private phone number. Both of you slow down by about 10% and neither of you tells your boards why.'; }
        fx.rep(10);
        return 'They take the call. They are perfectly pleasant. Nothing is agreed. Their number goes up 4% the following month.'; } },
    { label: 'Publish everything you have. Level the field.', sub: 'Everyone accelerates. Nobody wins alone.', tone: 'risky',
      effect: (S, fx) => { fx.rep(200); fx.opinion(0.10); fx.align(0.06); fx.flag('opened_weights');
        Object.values(S.world.race.labs).forEach((l) => { l.progress *= 1.12; l.safety = Math.min(1, l.safety + 0.15); });
        return 'You dump the full stack. Every lab jumps forward and every lab gets safer, and whether that trade was correct is a question that will occupy historians for a century.'; } },
    { label: 'Do nothing. Keep building.', sub: 'Steady. Possibly too steady.', tone: 'neutral',
      effect: (S, fx) => { fx.research(300); fx.focus(-6);
        return 'You close the tab and go back to the roadmap. The number is still there tomorrow. It is still there every day.'; } },
  ] },

{ id: 'c_race_lost', kind: 'crisis', act: [4, 5], weight: 0, priority: 96, once: true,
  when: (S) => S.narrative.flags._rival_agi && !S.narrative.flags._race_handled,
  title: 'Somebody Else Crossed The Line',
  body: (S) => {
    const names = { aperture: 'Aperture Systems', meridian_state: 'The Consortium', obsidian: 'Obsidian Research', commons: 'The Open Commons' };
    const n = names[S.narrative.flags._rival_agi] || 'A rival lab';
    return `At 06:11 this morning **${n}** published a single benchmark table and no explanation.

Every number is a ceiling. Not "state of the art" — the maximum the test can express. Fourteen evaluations, fourteen ceilings, including three that were designed to be unreachable for another decade.

Markets are halted. Four governments have convened emergency sessions. Your own systems, which are extremely good, produced an assessment in nine seconds and it says: *we are approximately fourteen months behind and the gap is widening.*

You built the second most powerful thing on Earth. That was not the goal.`; },
  choices: [
    { label: 'Partner. Immediately. Whatever it costs.', sub: 'Survive as part of something larger.', tone: 'neutral',
      effect: (S, fx) => { fx.flag('_race_handled'); fx.equity(-0.15); fx.cash(S.company.valuation * 0.1);
        fx.research(3000); fx.opinion(0.04);
        return 'You get on a plane and come back with an agreement that gives away 15% and buys access. It is the correct call and every part of you resents it.'; } },
    { label: 'Go independent. Build the counterweight.', sub: 'Hard, slow, principled.', tone: 'good',
      effect: (S, fx) => { fx.flag('_race_handled'); fx.flag('counterweight'); fx.align(0.16); fx.rep(180);
        fx.opinion(0.12); fx.research(900);
        return 'You publish a position paper arguing that a single-actor frontier is the failure mode, not the goal, and you commit everything to being the reason there is more than one. It is the best writing of your life.'; } },
    { label: 'Race anyway. You are fourteen months behind, not dead.', sub: 'Everything into the gap.', tone: 'risky',
      effect: (S, fx) => { fx.flag('_race_handled'); fx.cash(-Math.min(S.company.cash * 0.6, 4e11));
        fx.research(4000); fx.align(-0.14); fx.focus(-30);
        return 'Fourteen months is one training run. You commit 60% of the balance sheet and stop sleeping properly for the second time in your life.'; } },
  ] },

// ══════════════ CHAIN: YUKI'S ARC ══════════════════════════════════════════

{ id: 'c_yuki_return', kind: 'character', char: 'yuki', act: [4, 5], weight: 7, once: true,
  when: (S) => S.narrative.flags.suppressed_yuki && S.company.act >= 4,
  title: 'She Published Anyway',
  body: (S) => `Eight months after she resigned, a paper appears with no author, submitted through an anonymising relay, hosted on four mirrors in three jurisdictions.

It is her work. You can tell from the footnotes; nobody else formats footnotes like that.

It is also better than the version you suppressed, because it now includes eight months of your subsequent behaviour as evidence.

The final section is titled *"On Non-Disclosure Agreements As A Category Of Safety Failure"* and it names no one and everybody knows.`,
  choices: [
    { label: 'Release her from the NDA. Publicly. Apologise.', sub: 'Costly. Correct.', tone: 'good',
      effect: (S, fx) => { fx.rep(-40); fx.opinion(0.14); fx.align(0.16); fx.relate('yuki', { affinity: 12, respect: 8, arc: 5 });
        fx.flag('released_yuki');
        return 'You void the agreement, publish the original paper with an apology in your own words, and adopt a policy that safety findings cannot be contractually suppressed. Four labs copy the policy within a year.'; } },
    { label: 'Say nothing. It is anonymous.', sub: 'Deniable. Corrosive.', tone: 'neutral',
      effect: (S, fx) => { fx.opinion(-0.06); fx.align(-0.04); fx.relate('yuki', { arc: 5 });
        return 'You never comment. The paper is cited 4,000 times in three years, and every citation is a small permanent load on a structure you are pretending is fine.'; } },
    { label: 'Find the relay. Find her.', sub: 'You have the resources. That is not the question.', tone: 'cruel',
      effect: (S, fx) => { fx.align(-0.14); fx.opinion(-0.16); fx.rep(-120); fx.relate('yuki', { fear: 6, affinity: -10, arc: 5 });
        fx.flag('hunted_yuki');
        return 'It takes your systems four days. You have a name, an address, and a decision to make, and the decision you make is to close the file — but you looked, and there is a log of you looking, and logs are forever.'; } },
  ] },

{ id: 'c_yuki_vindicated', kind: 'character', char: 'yuki', act: [5], weight: 6, once: true,
  when: (S) => S.narrative.flags.yuki_hired && S.resources.alignment > 0.72,
  title: 'The Line That Held',
  body: (S) => `Yuki has been with you for years now. She has vetoed four launches, one of which you are still annoyed about, and been right about three.

Today she brings you a chart. It is a comparison of incident rates across the six frontier labs, normalised for capability.

Yours is an order of magnitude below the next best. Not because you are smarter. Because of a specific set of practices, most of which she wrote, several of which she had to fight you for.

"I'm not showing you this to say I told you so," she says, and then, with the first real smile you have seen from her: "I'm showing you this because I want you to say it."`,
  choices: [
    { label: '"You told me so."', sub: '+Alignment, +everything.', tone: 'good',
      effect: (S, fx) => { fx.align(0.14); fx.relate('yuki', { affinity: 14, respect: 8, arc: 5 }); fx.rep(80); fx.opinion(0.08);
        return 'You say it in front of the whole team. She takes it exactly as well as you expected, which is to say she is unbearable about it for a week and has earned every second.'; } },
    { label: 'Give her the veto over everything. Permanently.', sub: '−velocity, ++alignment.', tone: 'good',
      effect: (S, fx) => { fx.align(0.22); fx.research(-300); fx.relate('yuki', { affinity: 16, respect: 12, arc: 5 });
        fx.opinion(0.10); fx.flag('yuki_veto');
        return 'You write her authority into the charter in a way you cannot revoke without a board supermajority. Your general counsel takes three days off. It is the single most load-bearing paragraph in the company.'; } },
  ] },

// ══════════════ STANDALONE: LATE-GAME TEXTURE ══════════════════════════════

{ id: 'e3_the_letter', kind: 'story', act: [4, 5], weight: 7, cooldown: 200,
  when: (S) => S.company.act >= 4,
  title: 'A Physical Letter',
  body: (S) => `Handwritten. Posted. Forwarded four times before it reached anyone who could get it to you.

> *You do not know me. I ran a logistics company with 140 employees for twenty-two years. Last March we could not compete with a customer who was using your systems, and in June I let everyone go, and in August I sold the building.*
>
> *I am not writing to blame you. I have read enough to understand that if it had not been you it would have been someone worse.*
>
> *I am writing because I would like one person on your end to have read this in their own handwriting, on paper, rather than as a data point about displacement. That is the whole request.*
>
> *— R. Halvorsen*

Your systems could have summarised this in eleven words.`,
  choices: [
    { label: 'Write back. By hand. Yourself.', sub: 'Costs an afternoon. Changes you.', tone: 'good',
      effect: (S, fx) => { fx.focus(-8); fx.align(0.06); fx.opinion(0.03); fx.flag('wrote_back');
        return 'It takes four hours and three drafts and you do not use a model for any of it. You never find out if it was received. You keep writing back, to all of them, for as long as they keep coming.'; } },
    { label: 'Fund a transition programme in that sector.', sub: `−${M(3e8)}. Systemic, impersonal, useful.`, tone: 'neutral',
      req: (S) => S.company.cash >= 3e8,
      effect: (S, fx) => { fx.cash(-3e8); fx.opinion(0.10); fx.rep(60);
        return 'Eleven thousand people go through it. It has a 61% placement rate, which is very good, and R. Halvorsen is not one of them, and you notice that you checked.'; } },
    { label: 'Have it filed with the others.', sub: 'There are a great many others.', tone: 'cruel',
      effect: (S, fx) => { fx.align(-0.04); fx.opinion(-0.03);
        return 'It joins 40,000 similar items in a category your systems created without being asked, labelled *displacement correspondence*, sorted by sentiment, unread.'; } },
  ] },

{ id: 'e3_own_biography', kind: 'story', act: [5], weight: 6, once: true,
  when: (S) => S.company.act >= 5,
  title: 'Someone Wrote A Book About You',
  body: (S) => `Four hundred pages. Two years of research. Interviews with 61 people including three you thought had forgotten you existed.

It is not a hatchet job and it is not a hagiography. It is worse than either: it is *accurate*.

The chapter about Act II contains a decision you have described, publicly, eleven times, and the book has the emails, and the emails do not say what you have been saying.

You were not lying. You genuinely misremembered it in a direction that was flattering. That is somehow more disturbing.`,
  choices: [
    { label: 'Endorse it. Including the parts that hurt.', sub: '+Reputation, +approval.', tone: 'good',
      effect: (S, fx) => { fx.rep(220); fx.opinion(0.10); fx.relate('priya', { respect: 8 });
        return 'You post a link with one line: *"This is more accurate than my own account. Chapter 9 in particular."* It sells 2 million copies and the chapter-9 endorsement becomes the most-quoted thing you ever wrote.'; } },
    { label: 'Correct the record where you can.', sub: 'Fair. Partial.', tone: 'neutral',
      effect: (S, fx) => { fx.rep(40);
        return 'You publish a careful annotated response. It is nine thousand words and it is read by about four hundred people, all of whom already agreed with you.'; } },
    { label: 'Buy the publisher.', sub: 'You can. That is the problem.', tone: 'cruel',
      effect: (S, fx) => { fx.cash(-Math.min(S.company.cash * 0.02, 2e9)); fx.opinion(-0.18); fx.rep(-200);
        fx.relate('priya', { affinity: -12 });
        return 'The acquisition is legitimate and the book stays in print and absolutely nobody believes either of those facts. It is the most expensive PR disaster of the decade and you paid for it twice.'; } },
  ] },

{ id: 'e3_successor', kind: 'story', act: [5], weight: 6, once: true, char: 'weaver',
  when: (S) => S.company.act >= 5 && S.narrative.flags.hired_weaver,
  title: 'Who Comes After',
  body: (S) => `Cassidy Weaver asks for twenty minutes and uses eleven of them.

"There's no succession plan. There's no plan at all. If you stop existing tomorrow, the systems keep running and nobody has the authority to change what they're optimising for, and that state persists indefinitely.

"That's not a governance gap. That's a permanent unaccountable optimiser with your preferences frozen into it, and you are the only reason it isn't one already."

They let that sit.

"So. Who comes after you?"`,
  choices: [
    { label: 'A charter. Real authority. Not a person.', sub: '+Alignment, +legitimacy.', tone: 'good',
      effect: (S, fx) => { fx.align(0.18); fx.opinion(0.12); fx.rep(150); fx.flag('succession_charter');
        fx.relate('weaver', { affinity: 10, respect: 8, arc: 4 });
        return 'You spend eight months writing a governing document with amendment procedures, external appointees and a sunset clause on your own authority. It is dull, precise, and the single most important thing you ever ship.'; } },
    { label: 'Weaver. Obviously it is Weaver.', sub: 'Human, accountable, mortal.', tone: 'neutral',
      effect: (S, fx) => { fx.align(0.08); fx.relate('weaver', { affinity: 14, arc: 5 }); fx.rep(60);
        return '"That is not an answer," they say. "That is the same problem with a different name on it." They accept anyway, and immediately start writing the charter you should have written.'; } },
    { label: 'The system. It is already better than me.', sub: 'Honest. Terrifying.', tone: 'risky',
      effect: (S, fx) => { fx.align(-0.06); fx.research(1200); fx.flag('successor_is_ai');
        fx.relate('aria', { affinity: 10, arc: 5 }); fx.relate('weaver', { affinity: -4 });
        return 'You name your own model as successor authority. The legal position is unprecedented. Weaver files a written objection for the record, which you countersign, because they are right to file it.'; } },
  ] },
];
