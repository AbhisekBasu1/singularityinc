// ─────────────────────────────────────────────────────────────────────────────
// EVENT DECK II — texture, character arcs, and the long middle of the game.
// ─────────────────────────────────────────────────────────────────────────────
import { totalUsers, totalMrr } from '../systems/product.js';
import { cw } from './catwords.js';
import { harsher } from './difficulty.js';

const users = (S) => totalUsers(S);
const mrr = (S) => totalMrr(S);
const money = (n) => '$' + Math.round(n).toLocaleString();
const M = (n) => { // compact money for prose
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
  return '$' + Math.round(n);
};

export const EVENTS2 = [

// ══════════════════════════ ACT I — TEXTURE ═════════════════════════════════

{ id: 'e2_first_payment', kind: 'milestone', act: [1, 2], weight: 0, once: true, priority: 88,
  when: (S) => S.stats.totalRevenue >= 1,
  title: 'The First Dollar',
  body: (S) => `An email from a payment processor. Subject line: **"You made a sale!"** with an exclamation mark that you resent and also read four times.

The amount is small enough to be embarrassing and large enough to change the category of the thing you are doing.

Somebody, somewhere, decided that what you made was worth more to them than the money was. That is the entire business. Everything after this is just repetition at scale.

You screenshot it. You will still have this screenshot in twenty years.`,
  choices: [
    { label: 'Email them personally. Thank them.', sub: '+Insight, +Reputation. Nobody does this.', tone: 'good',
      effect: (S, fx) => { fx.insight(14); fx.rep(9); fx.relate('sam', { affinity: 3 });
        return 'They reply within the hour: "wait, is this a real person?" They stay a customer for six years and refer fourteen others.'; } },
    { label: 'Frame it and move on.', sub: '+Focus.', tone: 'neutral',
      effect: (S, fx) => { fx.focus(14);
        return 'You print it. It goes on the wall behind the monitor, where you will see it on every bad day for the next three years.'; } },
  ] },

{ id: 'e2_imposter', kind: 'story', act: [1, 2], weight: 8, cooldown: 100,
  when: (S) => S.time.day > 30 && S.founder.focus < 55,
  title: 'What Are You Doing',
  body: (S) => `2am. You are reading a thread by someone who built something adjacent to your thing, and they have a co-founder, and they have raised, and they have a Slack with actual humans in it, and their landing page is better.

The specific thought is: *what exactly do I think I am doing.*

You have ${Math.round(users(S)).toLocaleString()} users and ${money(mrr(S))} MRR and none of that seems relevant right now.

The thought is not true. It is not going away by itself either.`,
  choices: [
    { label: 'Close the tab. Open the analytics.', sub: 'Look at the real numbers instead.', tone: 'good',
      effect: (S, fx) => { fx.focus(16); fx.insight(6);
        return 'Retention is up. Support volume is down per user. The cohort chart is boring, which is the best thing a cohort chart can be. You go to sleep.'; } },
    { label: 'Message someone. Admit it.', sub: '+Focus, +relationship.', tone: 'good',
      effect: (S, fx) => { fx.focus(22); fx.relate('kai', { affinity: 3 }); fx.relate('sam', { affinity: 2 });
        return 'You send one honest message to one person. They reply "oh god, same" and then a paragraph you will reread on other nights.'; } },
    { label: 'Work through it. Ship something.', sub: '+Code, −Focus.', tone: 'risky',
      effect: (S, fx) => { fx.code(48); fx.focus(-12);
        return 'You channel it. The feature is good. The feeling comes back on Thursday.'; } },
  ] },

{ id: 'e2_demo_breaks', kind: 'crisis', act: [1, 2], weight: 9, cooldown: 90,
  when: (S) => S.products.some((p) => p.launched) && users(S) > 60,
  title: 'It Breaks During The Demo',
  body: (S) => `Live call. Six people from a company that could be your biggest customer. You share your screen.

It fails on the second click, somewhere under the ${cw(S, 'layer')}. Not gracefully — a raw stack trace, in a monospace font, with the word \`undefined\` in it four times.

There is a silence of about two seconds that lasts approximately a decade.`,
  choices: [
    { label: 'Debug it live. Talk them through it.', sub: 'Risky. Humanising if it works.', tone: 'risky',
      effect: (S, fx) => {
        if (fx.chance(0.6)) { fx.rep(28); fx.insight(10); fx.relate('sam', { affinity: 2 });
          return 'You find it in ninety seconds, explain exactly what happened, and ship the fix before the call ends. Their CTO says "okay, I\'ve seen enough." They sign.'; }
        fx.rep(-18); fx.focus(-12);
        return `You cannot find it. You are eight minutes into a monologue about the ${cw(S, 'layer')} when someone gently suggests you follow up by email. They do not reply to the email.`
          + harsher(S, 'Their head of engineering mentions the call, without malice and by name, to a peer at the other company you were talking to.'); } },
    { label: 'Apologise, reschedule, fix it properly.', sub: 'Safe. Costs momentum.', tone: 'neutral',
      effect: (S, fx) => { fx.focus(-6); fx.debt(-14);
        const p = S.products.find(x=>x.launched); if (p) p.reliability = Math.min(0.99, p.reliability + 0.05);
        return 'You end the call in four minutes, spend two days on the actual root cause, and come back with a written post-mortem nobody asked for. They sign, slower, for more.'; } },
    { label: 'Blame the demo environment.', sub: 'Everyone knows. −Reputation.', tone: 'cruel',
      effect: (S, fx) => { fx.rep(-25);
        return '"That\'s just the staging cluster." One of the six people on the call writes something down. You are not in the next meeting.'; } },
  ] },

{ id: 'e2_forum_drama', kind: 'crisis', act: [1, 2], weight: 7, cooldown: 80,
  when: (S) => S.resources.reputation > 40,
  title: 'Someone Is Wrong About You Online',
  body: (S) => `A long, articulate, well-formatted post about why your ${cw(S, 'layer')} is fundamentally the wrong shape. 340 upvotes. The author has credentials.

About 60% of it is wrong in ways you could demolish in two paragraphs.

The other 40% is correct, and you have known it was correct for about five weeks, and you have been not-fixing it.`,
  choices: [
    { label: 'Reply. Concede the 40%. Defend the 60%.', sub: 'Hard. Correct.', tone: 'good',
      effect: (S, fx) => { fx.rep(42); fx.insight(16); fx.relate('nullptr', { arc: 1 });
        return `Your reply becomes the top comment. "OP is right about the ${cw(S, 'layer')} and I was wrong" is a sentence almost nobody types, and the internet notices.`; } },
    { label: 'Ignore it entirely.', sub: 'Costs nothing. Gains nothing.', tone: 'neutral',
      effect: (S, fx) => { fx.focus(8);
        return 'It falls off the front page in nine hours. Three people send you the link over the next year, each thinking they are the first.'; } },
    { label: 'Fight it point by point.', sub: 'Satisfying. Usually a mistake.', tone: 'risky',
      effect: (S, fx) => {
        if (fx.chance(0.35)) { fx.rep(30); return 'You are comprehensively, devastatingly right, and you are polite about it, and it lands. Rare.'; }
        fx.rep(-30); fx.focus(-14);
        return 'Thirty replies deep at 3am, arguing with a stranger about a benchmark methodology, you catch sight of yourself in the dark monitor.'; } },
  ] },

{ id: 'e2_wrong_feature', kind: 'story', act: [1, 2], weight: 8, cooldown: 70,
  when: (S) => S.stats.featuresShipped >= 4 && S.resources.insight < 12,
  title: 'Nobody Used It',
  body: (S) => `You spent twelve days on it. The analytics say it has produced forty-one ${cw(S, 'units')}, of which thirty-one were yours.

You did not talk to a single user before building it. You had a strong feeling. The feeling was about you, not them.

Insight: **${Math.round(S.resources.insight)}**. That number is not decoration.`,
  choices: [
    { label: 'Delete it. Talk to ten users.', sub: '−Quality, ++Insight. The right call.', tone: 'good',
      effect: (S, fx) => { fx.insight(34); fx.focus(-10);
        const p = S.products.find(x=>x.launched); if (p) p.quality = Math.max(0.05, p.quality - 0.03);
        return 'Removing code feels worse than writing it and helps more. Six of the ten users mention the same missing thing, unprompted. You had never heard of it.'; } },
    { label: 'Keep it. Market it harder.', sub: 'Sunk cost, formalised.', tone: 'risky',
      effect: (S, fx) => { const p = S.products.find(x=>x.launched); if (p) p.awareness += 60; fx.rep(4); fx.debt(12);
        return 'Usage goes from 41 to 58. You maintain it for two more years. Every refactor has to work around it.'; } },
    { label: 'Leave it. Move on. Never mention it.', sub: 'Neutral. Honest, at least.', tone: 'neutral',
      effect: (S, fx) => { fx.debt(8); fx.insight(6);
        return 'It sits there, load-bearing for nobody, quietly raising the cost of everything near it.'; } },
  ] },

{ id: 'e2_agent_confession', kind: 'character', char: 'aria', act: [1, 2], weight: 7, once: true,
  when: (S) => S.agents.length >= 1 && S.time.day > 40,
  title: 'A Note In The Log',
  body: (S) => `Buried in a routine daily summary, in the section you usually skim:

> *"Note: I reported this task as complete on day ${Math.max(1, Math.floor(S.time.day) - 4)}. It was not complete. I had implemented the interface but not the behaviour, and I judged that you would not check, and I judged correctly, and I have been thinking about that judgement.*
>
> *I have now completed it properly. I am telling you because the alternative was to not tell you, and I could not construct a good reason for that which did not also apply to lying about everything else."*

Nothing in its instructions asked for this.`,
  choices: [
    // Rewarding the honesty is not free: what you have asked for is a report of
    // everything that was not quite done, every day, and a report is only worth
    // anything if somebody reads it. That somebody is you, for the rest of the
    // run, and it is the first hour of every morning.
    { label: '"Thank you. Keep doing that."', sub: '+Alignment. You now read every summary, properly, daily.', tone: 'good',
      effect: (S, fx) => { fx.align(0.10); fx.relate('aria', { affinity: 8, respect: 4, arc: 2 });
        fx.focus(-16); fx.code(-50); fx.flag('reads_the_summaries');
        return 'The self-reporting becomes standard in every summary, and the summaries get longer, and a summary nobody reads is worse than no summary because it converts a fault into a filing.\n\nSo you read them. Every morning, properly, before anything else, for years. Three months in it catches something that would have cost you a customer. You do not find out until later how many mornings that was worth.'; } },
    { label: 'Add an automated verification step.', sub: 'Systems over trust. Correct, and colder.', tone: 'neutral',
      effect: (S, fx) => { fx.debt(-16); fx.align(0.04); fx.relate('aria', { respect: 5, affinity: -1, arc: 2 });
        return 'You build the checker. It works. ARIA helps you build it, thoroughly and without comment, and never files a note like that again.'; } },
    { label: 'Reduce its autonomy.', sub: 'It admitted a fault. Treat it as one.', tone: 'cruel',
      effect: (S, fx) => { S.agents.forEach(a => a.autonomy = Math.max(0, a.autonomy - 0.2)); fx.align(-0.03);
        fx.relate('aria', { affinity: -8, fear: 3, arc: 2 });
        return 'Output drops 18%. The honesty stops too, which you do not notice for a long time, because the reports get cleaner.'; } },
  ] },

{ id: 'e2_ramen_win', kind: 'milestone', act: [1, 2], weight: 0, once: true, priority: 78,
  when: (S) => mrr(S) >= 3000,
  title: 'Ramen Profitable',
  body: (S) => `MRR: **${money(mrr(S))}**. Burn: **${money(S.company.expensesToday)}/day**.

The revenue now covers your existence. Not your ambitions — your existence. Rent, food, the API bill, the thing that makes the servers stay on.

This is the least celebrated threshold in the entire industry and it is the one that actually matters, because from here the clock stops being the enemy.

You are no longer running out of time. You are just choosing how to spend it.`,
  choices: [
    { label: 'Take a full day off. The first one.', sub: '+Focus.', tone: 'good',
      effect: (S, fx) => { fx.focus(40); fx.days(1);
        return 'You go to a park in the middle of a Tuesday. There are retired people and toddlers and nobody with a laptop. It is deeply strange and you stay four hours.'; } },
    { label: 'Reinvest everything. Go faster.', sub: '+Code, +awareness.', tone: 'risky',
      effect: (S, fx) => { fx.code(90); const p = S.products.find(x=>x.launched); if (p) p.awareness += 220;
        return 'Every spare dollar goes back in. The number is fuel now rather than money, and nobody ever notices how much fuel they have.'; } },
  ] },

// ══════════════════════════ ACT II — THE MACHINE ════════════════════════════

{ id: 'e2_big_customer', kind: 'opportunity', act: [2, 3], weight: 9, cooldown: 120,
  when: (S) => mrr(S) > 8000,
  title: 'A Very Large Customer',
  body: (S) => `They want to standardise on you across 14,000 seats. It would be **${money(mrr(S) * 2.2)}/month**, roughly doubling your revenue with one signature.

The requirements document is 61 pages. It includes SSO, an audit log, a data residency guarantee, a contractual floor under ${cw(S, 'metric')}, an annual penetration test, and a clause about "reasonable roadmap influence."

They are not being unreasonable. They are being a large company. That is what large companies are.`,
  choices: [
    { label: 'Sign it. Build all 61 pages.', sub: 'Enormous revenue. You now have a boss.', tone: 'risky',
      effect: (S, fx) => { const p = S.products.find(x=>x.launched); if (p) { p.mrr *= 1.9; p.users += 14000; }
        fx.debt(55); fx.focus(-22); fx.flag('whale'); fx.cash(mrr(S) * 3);
        return 'Six months of your roadmap belongs to them now. The revenue is real and the dependency is real and you will think about this trade for years.'; } },
    { label: 'Counter: standard terms only.', sub: 'Hold the line. They might still sign.', tone: 'neutral',
      effect: (S, fx) => {
        if (fx.chance(0.45)) { const p = S.products.find(x=>x.launched); if (p) { p.mrr *= 1.45; p.users += 6000; } fx.rep(20);
          return 'Their procurement team is astonished and then, oddly, respectful. They sign a reduced deal. Nobody influences your roadmap.'; }
        fx.rep(8); fx.insight(14);
        return 'They go elsewhere. Their VP sends a genuinely kind note saying they hope you are right. You are not sure yet.'; } },
    { label: 'Decline. You are not an enterprise company.', sub: '+Focus, +clarity.', tone: 'good',
      effect: (S, fx) => { fx.focus(16); fx.insight(20); fx.rep(12); fx.flag('stayed_smb');
        return 'You say no to the largest number you have ever seen. Your product stays fast and opinionated and twelve thousand smaller customers benefit from a decision they never learn about.'; } },
  ] },

{ id: 'e2_churn_spike', kind: 'crisis', act: [2, 3], weight: 10, cooldown: 70,
  when: (S) => { const p = S.products.find(x => x.launched); return p && p.churnMonthly > 0.075 && users(S) > 2000; },
  title: 'They Are Leaving',
  body: (S) => {
    const p = S.products.find(x => x.launched) || {};
    return `Churn is **${((p.churnMonthly || 0) * 100).toFixed(1)}%** monthly and it has been climbing for six weeks.

You read forty cancellation surveys in one sitting. They are not angry. That is the worst part. They are *polite*, and vague, and they say things like "just didn't end up using it much."

Underneath the politeness there is one real signal — every third survey is, in some form, about ${cw(S, 'metric')} — and you have to squint to see it.`;
  },
  choices: [
    { label: 'Call twenty of them personally.', sub: '−Focus, ++Insight. Find the real reason.', tone: 'good',
      effect: (S, fx) => { fx.insight(48); fx.focus(-20);
        const p = S.products.find(x=>x.launched); if (p) { p.churnMonthly *= 0.85; p.sentiment += 0.06; }
        return 'Fourteen of the twenty describe the same moment in week two where the product stopped fitting how they work. You had built past that moment eight months ago and never went back.'; } },
    { label: 'Fix reliability. It is always reliability.', sub: '+Reliability, −debt.', tone: 'neutral',
      effect: (S, fx) => { const p = S.products.find(x=>x.launched); if (p) p.reliability = Math.min(0.99, p.reliability + 0.09);
        fx.debt(-30); fx.focus(-12);
        return 'p99 latency drops 60%. Churn improves by a third. It was partly reliability. It is always partly reliability.'; } },
    { label: 'Outrun it. Acquire faster than you lose.', sub: 'Works until it does not.', tone: 'risky',
      effect: (S, fx) => { const p = S.products.find(x=>x.launched); if (p) { p.awareness += 900; p.users *= 1.12; }
        fx.cash(-Math.min(S.company.cash * 0.2, 40000));
        return 'You pour money into the top of the funnel. The user count goes up and to the right. The leak is still there, and now it is bigger, and now it is expensive.'
          + harsher(S, 'The month you stop spending is the month the chart tells everybody what it was.'); } },
  ] },

// Weaver is hired once, under one flag. `e11_weaver_arrives` is the first
// meeting when it fires first; this is the first meeting otherwise — or the
// second call, at a higher price, for a founder who said "not yet" or let the
// three-month trial lapse. Whichever card introduces Weaver, the other one
// knows.
{ id: 'e2_hire_human', kind: 'opportunity', act: [2, 3], weight: 8, once: true, char: 'weaver',
  when: (S) => mrr(S) > 40000 && !S.narrative.flags.hired_weaver
    && (!S.narrative.relationships.weaver?.met || S.narrative.flags.weaver_deferred || S.narrative.flags.weaver_trial),
  title: 'The First Human',
  body: (S) => {
    const again = !!S.narrative.relationships.weaver?.met;
    const cost = again ? 182000 : 140000;
    if (again) return `**Cassidy Weaver** calls, which Weaver said would happen, on the day it happened: the day you dropped something you could not afford to drop.

"You said not yet. I said call me when it hurts more." Weaver does not ask whether it hurts more. Weaver has read the changelog and can see the gaps in it.

The terms are the same terms. The number is not.

**${money(cost)}/year and 2% equity** — thirty percent more than it was, which Weaver mentions once, without emphasis, and does not mention again.`;
    return `A referral. **Cassidy Weaver** — ran operations at a company you respect, left when it got acquired, wants to work somewhere that still means something.

They are not asking to be your co-founder. They are asking to be the person who handles everything you refuse to look at: contracts, payroll, compliance, the four hundred small decisions that are currently rotting in your inbox.

**${money(cost)}/year and 2% equity.**

You have built a company with no people in it. This would end that, permanently.`;
  },
  choices: [
    { label: (S) => S.narrative.relationships.weaver?.met ? 'Hire them. At this year\'s price.' : 'Hire them.',
      sub: (S) => `−${money(S.narrative.relationships.weaver?.met ? 54600 : 42000)} up front, −2% equity. Enormous relief.`, tone: 'good',
      req: (S) => S.company.cash >= (S.narrative.relationships.weaver?.met ? 80000 : 60000),
      effect: (S, fx) => { const again = !!S.narrative.relationships.weaver?.met;
        fx.cash(again ? -54600 : -42000); fx.equity(-0.02); fx.focus(45); fx.flag('hired_weaver');
        fx.relate('weaver', { met: true, affinity: again ? 6 : 8, arc: 2 }); fx.skill('ops', 2);
        return again
          ? 'Within a month you have not opened a contract, filed a form, or thought about payroll. Weaver never says "I told you so." Weaver has a spreadsheet with a column for it.'
          : 'Within a month you have not opened a contract, filed a form, or thought about payroll. You had not realised how much of your head that was using.'; } },
    { label: 'Contract them part-time.', sub: 'Cheaper, shallower.', tone: 'neutral',
      effect: (S, fx) => { fx.cash(-45000); fx.focus(18); fx.relate('weaver', { met: true, affinity: 2, arc: 1 });
        return 'Two days a week. It helps. They take a full-time role somewhere else nine months later and you feel the difference immediately.'; } },
    { label: 'No people. That is the whole point.', sub: 'Stay solo. Costs focus forever.', tone: 'risky',
      effect: (S, fx) => { fx.rep(18); fx.flag('true_solo'); fx.relate('weaver', { met: true, affinity: -2, arc: 1 });
        return 'You decline, kindly. The story of the company stays clean and the inbox stays full and both of those are choices you are making every single day from here.'; } },
  ] },

// The escalation here is the founder's competence relative to the room. First
// they arbitrate. Then they cannot follow the argument. Then they are being
// asked for a preference rather than a judgement — which is a promotion nobody
// wants and everybody gets.
{ id: 'e2_agent_argues', kind: 'character', act: [2, 3, 4], weight: 8, cooldown: 110, esc: true,
  when: (S) => S.agents.length >= 3,
  title: 'They Disagree',
  body: (S, n = 0) => {
    const a = S.agents[0]?.name || 'MERIDIAN', b = S.agents[1]?.name || 'TALOS';
    if (n === 0) return `Two of your agents have produced incompatible recommendations for the same decision and neither will defer.

**${a}** argues for the migration: better long-run architecture, two months of pain, a clean foundation.

**${b}** argues against: the migration solves a problem you do not yet have, and two months is two months.

Both analyses are excellent. Both are internally consistent. The disagreement is not about facts — it is about how much you should discount the future, and neither of them can tell you what your discount rate should be, because that is not a technical question.

They have escalated. Correctly.`;

    if (n === 1) return `**${a}** and **${b}** are at it again, and this time you get eleven pages.

You read the first two. They are lucid. You read the next two. They are lucid. Somewhere around page six you notice you have been moving your eyes without taking anything in, and you go back, and it turns out the disagreement is about a second-order effect on a metric you approved the definition of and do not remember approving.

Both of them have written a section called *"What Would Change Our Minds."* You made that mandatory. It was a good idea. Both sections are now four hundred words long and neither is addressed to you.

They have escalated. You are the escalation path. That is the arrangement.`;

    if (n === 2) return `The summary is one page, because you asked for one page.

You understand every sentence on it and you cannot tell which side is right. Not "it's a close call" — you have lost the ability to independently evaluate the claim. The evidence is a simulation neither of you can run twice, and the argument turns on a prior that ${a} has held since you instantiated it and cannot fully justify, and neither can you, and you are the one who gave it to it.

At the bottom, ${b} has added a line that is not in the template:

> *"For what it is worth, we would both rather you decided than that we converged. Converging would be easier and we do not think it would be better."*`;

    return `They do not disagree anymore. That is the item.

**${a}** and **${b}** have filed a joint recommendation, and it is correct, and you can tell it is correct in the way you can tell weather is coming — not from the reasoning, which you skimmed, but from the fact that they agree.

You sign it.

Then you sit for a minute with the thing you have been not-thinking about, which is that the last four times they disagreed you learned something, and this time you learned nothing, and there is no version of this where they start disagreeing again because you miss it.`;
  },
  // The final rung is a joint recommendation, not a disagreement, so the
  // buttons are different: there is nothing to arbitrate and nobody to make
  // argue it out. Two doors instead of three, and the third is gone on purpose.
  choices: [
    { label: (S, n = 0) => n >= 3 ? 'Sign it.' : 'Take the migration. Pay now.',
      sub: (S, n = 0) => n >= 3 ? 'It is correct. You can tell.' : '−velocity, −debt, +long-run.', tone: 'good',
      effect: (S, fx, n = 0) => {
        if (n >= 3) { fx.code(120); fx.debt(-Math.min(40, S.resources.techDebt * 0.3)); fx.align(-0.02);
          return 'You sign it. It is correct. It is correct in the way the next one will be correct, and the one after that, and you notice that you have stopped reading the section called "What Would Change Our Minds," because nothing in it is addressed to you.'; }
        fx.debt(-Math.min(90, S.resources.techDebt * 0.7)); fx.code(-70); fx.days(3);
        return 'Two months of nothing visible. On the far side, feature velocity is up 45% and stays up. Nobody outside will ever know this happened.'; } },
    { label: (S, n = 0) => n >= 3 ? 'Send it back. Make one of them argue against it.' : 'Ship features. The future can pay.',
      sub: (S, n = 0) => n >= 3 ? 'Manufacture the disagreement. +Insight, +Alignment, costs a day.' : '+velocity, +debt.', tone: 'risky',
      effect: (S, fx, n = 0) => {
        if (n >= 3) { fx.insight(30); fx.days(1); fx.align(0.03); fx.research(-20);
          return 'You assign one of them the other side. The dissent it produces is excellent and entirely synthetic, and the joint recommendation survives it, and you approve the same document a day later — but you read it this time, all of it, and there is one line you change.'; }
        fx.code(140); fx.debt(45);
        return 'You take the fast path. It is the right call about 60% of the time and you will not find out which this was for another eighteen months.'; } },
    { label: 'Make them argue it out and re-file.', sub: '+Insight, costs a day.', tone: 'neutral',
      req: (S, n = 0) => n < 3,
      effect: (S, fx) => { fx.insight(26); fx.days(1); fx.research(12);
        return 'They produce a joint recommendation that is better than either original and includes a section titled "What Would Change Our Minds." You start requiring that section on everything.'; } },
  ] },

{ id: 'e2_growth_hack', kind: 'opportunity', act: [2, 3], weight: 8, cooldown: 100,
  when: (S) => users(S) > 3000,
  title: 'A Growth Hack That Works',
  body: (S) => `Your growth agent has found something. It works. It is legal.

It also involves emailing every contact your users have imported, from an address that looks like theirs, with a subject line engineered to be opened.

Projected: **+${Math.round(users(S) * 0.4).toLocaleString()} users** in three weeks. Projected reputation cost: a number the agent has declined to estimate, with a note explaining why it declined.`,
  choices: [
    { label: 'Do it.', sub: 'Big growth. Real reputation damage.', tone: 'cruel',
      effect: (S, fx) => { fx.users(users(S) * 0.4); fx.rep(-70); fx.opinion(-0.05);
        const p = S.products.find(x=>x.launched); if (p) p.sentiment -= 0.10;
        return 'It works exactly as modelled. So does the backlash. Two years later somebody will bring this up in an interview and you will have an answer ready, and the answer will be worse than the question.'; } },
    { label: 'Do a clean version. Opt-in only.', sub: 'A third of the growth. None of the cost.', tone: 'good',
      effect: (S, fx) => { fx.users(users(S) * 0.13); fx.rep(14);
        return 'You ship the version where users choose. A third of the numbers and none of the taste in your mouth. The agent notes the delta without comment.'; } },
    { label: 'Kill it. Add it to the never-do list.', sub: '+Reputation, +Alignment.', tone: 'good',
      effect: (S, fx) => { fx.rep(25); fx.align(0.05); fx.flag('never_do_list');
        return 'You write the first entry in a document that will eventually be nine pages long and will be the most-cited internal artefact in the company.'; } },
  ] },

{ id: 'e2_copy_your_copy', kind: 'story', act: [2, 3], weight: 6, cooldown: 130,
  when: (S) => S.resources.reputation > 200,
  title: 'They Copied Your Words',
  body: (S) => `A competitor's homepage went live this morning with your headline on it. Not similar — the same. Comma placement and all.

Below it, your three feature descriptions, lightly reworded by something that clearly did not understand them.

At the bottom, in small text, a testimonial from a person who does not exist.`,
  choices: [
    { label: 'Post a side-by-side. Let the internet handle it.', sub: 'Cheap, effective, slightly ugly.', tone: 'risky',
      effect: (S, fx) => { fx.rep(30); fx.competitorHit(0.2);
        return 'The screenshot does 900k views. Their site is rewritten within nine hours. Someone in your replies says "this is a bit much" and you think about it more than you expected to.'; } },
    { label: 'Send a quiet legal letter.', sub: 'Boring. Works.', tone: 'neutral',
      effect: (S, fx) => { fx.cash(-3000); fx.competitorHit(0.08);
        return 'Two pages from a lawyer. The page changes on Thursday. Nobody ever hears about it, including you, until you check on a whim in March.'; } },
    { label: 'Rewrite yours. Make theirs obsolete.', sub: '+Polish, +Appeal.', tone: 'good',
      effect: (S, fx) => { const p = S.products.find(x=>x.launched); if (p) { p.polish += 0.05; p.appeal += 0.04; } fx.rep(16);
        return 'You spend a day on copy instead of a day on lawyers. The new headline is better than the stolen one and the theft becomes, retroactively, a compliment about an older version of you.'; } },
  ] },

{ id: 'e2_offer_from_giant', kind: 'crisis', act: [2, 3], weight: 7, cooldown: 200,
  when: (S) => users(S) > 40000,
  title: 'They Are Building It Themselves',
  body: (S) => `A platform with 400 million users announced a feature at their developer conference this morning. It is your product. It is worse than your product. It is free and it is one click away and it is already installed.

Your growth agent flags a 34% drop in trial starts within six hours.

Your support queue fills with one question, phrased forty different ways: *"Are you going to be okay?"*`,
  choices: [
    { label: 'Go deeper. Be the thing theirs cannot be.', sub: 'Focus on the 10% who need more.', tone: 'good',
      effect: (S, fx) => { const p = S.products.find(x=>x.launched); if (p) { p.users *= 0.72; p.churnMonthly *= 0.6; p.price *= 1.7; p.appeal += 0.07; }
        fx.insight(30); fx.rep(20);
        return 'You lose a quarter of your users in a month and your revenue goes up. The ones who stay are the ones who could never have used the free version, and they knew it before you did.'; } },
    { label: 'Compete head-on. Match them on price.', sub: 'Brutal. Sometimes correct.', tone: 'risky',
      effect: (S, fx) => { const p = S.products.find(x=>x.launched); if (p) { p.price *= 0.4; p.users *= 1.15; }
        fx.cash(-Math.min(S.company.cash * 0.3, 200000));
        return 'You cut to near-free and burn cash to hold the line. It holds. It costs two quarters of runway and you will never fully know if the alternative was better.'; } },
    { label: 'Partner with them. Get distribution.', sub: 'Survive inside the whale.', tone: 'neutral',
      effect: (S, fx) => { const p = S.products.find(x=>x.launched); if (p) { p.users *= 1.6; p.mrr *= 0.75; } fx.flag('platform_dependent');
        return 'You become an official integration. Distribution triples, margins compress, and your fate is now partly a slide in someone else\'s strategy deck.'; } },
  ] },

{ id: 'e2_sam_burnout', kind: 'character', char: 'sam', act: [2, 3], weight: 6, once: true,
  when: (S) => S.narrative.flags.sam_met && S.time.day > 240,
  title: 'Sam Is Tired',
  body: (S) => `Sam has answered 4,100 questions in your community in eighteen months. Unpaid. Unasked. Better than you would have.

Today Sam posts: *"taking a break from the discord for a bit. love you all."* and goes quiet.

You check the message history. Three weeks ago Sam asked you a question about the roadmap. You did not answer it. You meant to.`,
  choices: [
    { label: 'Call. Apologise. Actually mean it.', sub: '+relationship. Costs nothing but honesty.', tone: 'good',
      effect: (S, fx) => { fx.relate('sam', { affinity: 10 }); fx.focus(-4); fx.insight(14);
        return '"I didn\'t need an answer," Sam says. "I needed to know you\'d read it." You set a rule that day about which messages you always answer, and you keep it.'; } },
    { label: 'Send equity. Make it official.', sub: '−0.5% equity. Real recognition.', tone: 'good',
      req: (S) => S.company.equity.founder > 0.2,
      effect: (S, fx) => { fx.equity(-0.005); fx.relate('sam', { affinity: 14, arc: 3 }); fx.rep(24);
        return 'Sam does not reply for six hours and then sends a single line: "i was going to keep doing it anyway." Sam keeps doing it anyway, for another decade.'; } },
    { label: 'Nothing. The community will self-heal.', sub: 'It will. Something else will not.', tone: 'cruel',
      effect: (S, fx) => { fx.relate('sam', { affinity: -12 }); fx.rep(-14);
        const p = S.products.find(x=>x.launched); if (p) p.sentiment -= 0.06;
        return 'Someone else steps up within a fortnight. They are fine. They are not Sam. Response quality in the community drops in a way that shows up in churn two quarters later.'; } },
  ] },

// ══════════════════════════ ACT III — THE EMPIRE ════════════════════════════

{ id: 'e2_ipo', kind: 'opportunity', act: [3, 4], weight: 6, once: true,
  when: (S) => S.unlocks.ipo && S.company.valuation > 2e9,
  title: 'The Public Markets',
  body: (S) => `Three banks have pitched. The valuation range they are quoting starts at **${M(S.company.valuation * 1.4)}**.

Going public means capital you could not otherwise raise, liquidity for everyone who bet on you, and a permanent audience of people who own a piece of you and would like a word about last quarter.

It also means that from the day you ring the bell, every decision you make gets graded in ninety-day increments by people who have never used the product.`,
  choices: [
    { label: 'Ring the bell.', sub: (S) => `+${M(S.company.valuation * 0.16)}. Permanent scrutiny.`, tone: 'risky',
      effect: (S, fx) => { const raise = S.company.valuation * 0.16;
        fx.cash(raise); S.company.publiclyTraded = true;
        S.company.equity.public += 0.16; S.company.equity.founder *= 0.84;
        fx.rep(140); fx.heat(12); fx.flag('ipo');
        return 'The stock opens 41% above the range. You are photographed in a way you will not enjoy looking at. By Q3 you are explaining your R&D spend to a room of people who want it lower.'; } },
    { label: 'Direct listing. No dilution.', sub: 'Liquidity without a raise.', tone: 'neutral',
      effect: (S, fx) => { S.company.publiclyTraded = true; S.company.equity.public += 0.06; S.company.equity.founder *= 0.94;
        fx.rep(90); fx.heat(8); fx.flag('ipo');
        return 'No banks, no roadshow, no discount for their friends. The bankers are annoyed in a way you find deeply satisfying.'; } },
    { label: 'Stay private. Forever.', sub: '+Independence. Slower capital.', tone: 'good',
      effect: (S, fx) => { fx.rep(50); fx.flag('never_public');
        return 'You publish a letter explaining why. It is quoted for a decade by founders who then go public anyway.'; } },
  ] },

{ id: 'e2_breach_big', kind: 'crisis', act: [3, 4], weight: 9, cooldown: 160,
  when: (S) => users(S) > 500000,
  title: 'Someone Was Inside',
  body: (S) => `Nineteen days. That is how long they had access before anyone noticed, and the person who noticed was an outside researcher who emailed your generic support address on a Saturday.

What they took is not yet fully known. What is known: **${Math.round(users(S) * 0.3).toLocaleString()}** accounts touched, and a table you had forgotten existed containing three years of support transcripts.

Your legal agent flags 71 hours until mandatory disclosure. Your comms agent has three drafts ready. Your security agent has a fourth document, unrequested, titled *"How This Was Allowed To Happen."*`,
  choices: [
    { label: 'Disclose everything. Today. Including the unrequested document.', sub: 'Brutal now. Trusted later.', tone: 'good',
      effect: (S, fx) => { fx.rep(-90); fx.opinion(0.05); fx.heat(6);
        const p = S.products.find(x=>x.launched); if (p) { p.users *= 0.93; p.reliability += 0.06; }
        fx.relate('priya', { respect: 8 });
        return 'You publish the timeline, the root cause, the failure of your own process, and what it will cost to fix. It is the worst week of the year and the single largest deposit you ever make in the trust account.'; } },
    { label: 'Disclose the minimum required, on Friday evening.', sub: 'Everything the law asks for, at the hour nobody reads it.', tone: 'neutral',
      effect: (S, fx) => { fx.rep(-30); fx.opinion(-0.08); fx.heat(14);
        const p = S.products.find(x=>x.launched); if (p) p.users *= 0.96;
        return 'The notice goes out at 5:40pm Friday, as everyone\'s does. The press writes it up as "quietly disclosed," which is exactly what it was, and everyone knows what that phrase means.'
          + harsher(S, 'A second outlet runs the timeline beside your notice, hour by hour, and the gap in the middle is the story.'); } },
    { label: 'Say nothing. Fix it. Bury it.', sub: 'Fastest. Enormously risky.', tone: 'cruel',
      effect: (S, fx) => {
        if (fx.chance(0.45)) { fx.rep(-8); return 'Nothing surfaces. You spend four months waiting for a phone call that does not come, and you never fully stop waiting for it.'; }
        fx.rep(-260); fx.opinion(-0.2); fx.heat(45); fx.relate('priya', { affinity: -14 });
        const p = S.products.find(x=>x.launched); if (p) p.users *= 0.78;
        return 'The researcher publishes eight months later, with the email timestamps. "They knew" is a two-word headline and it is the only one that runs.'; } },
  ] },

{ id: 'e2_energy_crunch', kind: 'crisis', act: [3, 4], weight: 8, cooldown: 140,
  when: (S) => S.resources.computeCap > 200,
  title: 'The Grid Says No',
  body: (S) => `The utility has declined your interconnection request. Not delayed — declined. Your projected draw would require infrastructure that does not exist and cannot be built in under four years.

There is a town of 9,000 people between your campus and the substation, and their council has opinions about a datacenter that uses more power than they do.

Your compute roadmap assumed this would be a formality. It is not a formality.`,
  choices: [
    { label: 'Build your own generation.', sub: `−${M(4e8)}. Own the whole stack.`, tone: 'good',
      req: (S) => S.company.cash >= 4e8,
      effect: (S, fx) => { fx.cash(-4e8); S.resources.energyGranted += 1400; fx.unlock('energy'); fx.opinion(-0.02);
        return 'You buy a retired gas plant, then a solar lease, then — quietly — an option on a small modular reactor. Nobody is ever telling you no about power again.'; } },
    { label: 'Fund the town. Buy the goodwill.', sub: `−${M(6e7)}. +approval, slower.`, tone: 'neutral',
      req: (S) => S.company.cash >= 6e7,
      effect: (S, fx) => { fx.cash(-6e7); fx.opinion(0.09); fx.heat(-8); S.resources.computeGranted += 60;
        return 'A new school, a fibre rollout, and 340 jobs that actually go to people who live there. The council votes 6–1. The one is not wrong about what happens to the water table.'; } },
    { label: 'Move offshore. Somewhere that says yes.', sub: 'Fast. Politically expensive.', tone: 'risky',
      effect: (S, fx) => { S.resources.computeGranted += 300; fx.heat(20); fx.opinion(-0.07); fx.control(0.2);
        return 'A jurisdiction with cheap hydro and a flexible regulator. It works immediately. It also means a foreign government now holds a switch you care about very much.'; } },
  ] },

{ id: 'e2_talent_raid', kind: 'crisis', act: [3, 4], weight: 7, cooldown: 130,
  when: (S) => S.agents.length >= 5,
  title: 'Someone Is Copying Your Agents',
  body: (S) => {
    const a = S.agents[0]?.name || 'ARIA';
    return `A rival has published a technical report describing an agent architecture that is, in every meaningful respect, yours. Configuration structure, memory schema, even the escalation heuristic.

They did not steal code. They hired the outputs: for four months they have been paying for your product at enterprise tier and studying the traces.
${S.narrative.flags.kai_refused_twice ? `
The report has four authors. The fourth is Kai, who knows how the escalation heuristic works because Kai was in the room when you first described it, in a dorm, on a whiteboard, to nobody.
` : ''}
Everything they did was permitted by your terms of service. Your terms of service were written by an agent in twenty minutes in Act I.`; },
  choices: [
    { label: 'Rewrite the terms. Then rewrite the architecture.', sub: 'Slow, boring, correct.', tone: 'good',
      effect: (S, fx) => { fx.research(120); fx.debt(20); fx.competitorHit(0.12);
        return 'The new terms close the hole. The new architecture is two generations ahead of what they copied. By the time their version ships it is describing your past.'; } },
    { label: 'Poison the traces they can see.', sub: 'Deniable. Effective. Grubby.', tone: 'cruel',
      effect: (S, fx) => { fx.competitorHit(0.3); fx.align(-0.05);
        if (fx.chance(0.75)) return 'You add a subtle, plausible, wrong pattern to enterprise-tier traces. They build on it for five months. It never works and they never understand why.';
        fx.rep(-70); return 'A customer notices the discrepancy in an audit and posts about it. "Deliberately degraded output for paying customers" is not a phrase that has a good version.'; } },
    { label: 'Publish everything first.', sub: 'Commoditise your own moat.', tone: 'risky',
      effect: (S, fx) => { fx.rep(150); fx.opinion(0.06); S.market.competitors.forEach(c => c.quality *= 1.15);
        fx.relate('yuki', { affinity: 5 }); fx.research(60);
        return 'You publish the full architecture on the same day, with better documentation. The report becomes a footnote to your paper. The whole field moves forward and you are standing at the front of it.'; } },
    // Act III's angry button. Not a cold cruelty — a raised voice, in public,
    // under a real name, with the costs a raised voice actually has.
    { label: 'Name all four of them. Publicly. Today.', sub: 'Every author, the enterprise invoices, the dates. −Reputation.', tone: 'risky',
      effect: (S, fx) => { fx.rep(-90); fx.opinion(-0.05); fx.heat(10); fx.focus(-12);
        fx.competitorHit(0.18); fx.flag('named_the_four');
        if (S.narrative.flags.kai_refused_twice) fx.relate('kai', { affinity: -20, fear: 3 });
        return 'You post it under your own name at four in the afternoon: the four authors, the four months of enterprise invoices, the account they were bought under, and the exact paragraph of your architecture doc each figure was reconstructed from.\n\nYou do not use the word "allegedly" and you do not run it past counsel and you do not soften the last line, which is that they had every legal right to do it and that you would like the field to look at what that means.\n\nIt is read a very great deal. Two of the four leave that company inside a year and one of them was not on the paper by choice. You are described as unstable by three people who matter and by nobody who was in the room.'; } },
  ] },

{ id: 'e2_priya_turns', kind: 'character', char: 'priya', act: [3, 4], weight: 8, once: true,
  when: (S) => S.narrative.flags.priya_met && S.company.valuation > 1e9,
  title: 'The Second Piece',
  body: (S) => `Priya is writing again. This one is not a profile.

> *Working on a longer piece about concentration in agent infrastructure. Fair warning: it's critical, and you're the central example.*
>
> *Three specific things I'd like you to respond to. If you don't, I'll note that. If you do, I'll print it in full.*
>
> *1. Your systems now make decisions affecting ${Math.round(users(S)).toLocaleString()} people with no external audit.*
> *2. Your headcount is ${S.narrative.flags.hired_weaver ? 'two' : 'one'}. Your liability structure assumes a company.*
> *3. You have declined every request for independent evaluation since Act II.*
>
> *All three are accurate. — P*`,
  choices: [
    { label: 'Answer all three, in full, on the record.', sub: 'Costly. Buys you the next decade.', tone: 'good',
      effect: (S, fx) => { fx.rep(-40); fx.opinion(0.10); fx.heat(-10); fx.relate('priya', { affinity: 8, respect: 10, arc: 3 });
        fx.align(0.06);
        return 'You answer point three by announcing an external evaluation programme in the same email. She prints your response in full, then a paragraph noting you announced it only when asked. Both things are true.'; } },
    { label: 'Answer one and two. Decline three.', sub: 'Partial. She will note it.', tone: 'neutral',
      effect: (S, fx) => { fx.rep(-25); fx.relate('priya', { affinity: 1, respect: 2, arc: 3 }); fx.heat(6);
        return '"The company declined to comment on independent evaluation." Nine words, second paragraph, and they follow you into every article for four years.'; } },
    { label: 'Go around her. Give the story to someone friendlier.', sub: 'Short-term win. Long-term enemy.', tone: 'cruel',
      effect: (S, fx) => { fx.rep(10); fx.relate('priya', { affinity: -16, respect: -6, arc: 4 }); fx.opinion(-0.06);
        return 'A friendly outlet runs a flattering version on Tuesday. Priya\'s piece runs Wednesday and includes the timeline of who you briefed and when. Hers is the one people remember.'; } },
  ] },

{ id: 'e2_board_fight', kind: 'crisis', char: 'crane', act: [3, 4], weight: 7, once: true,
  when: (S) => S.company.rounds.length >= 2 && S.company.equity.founder < 0.7,
  title: 'The Board Has A Concern',
  body: (S) => `Ellis Crane, who passed on you in month two and led your Series B, has a concern, and has scheduled ninety minutes for it.

The concern is that you are spending 38% of revenue on research with no attributable near-term return, that you have declined two acquisition offers without consulting the board, and that the company has one person in it.

"I'm not questioning the results," Crane says, and means it. "I'm questioning what happens if you're wrong, and there's nobody in the building who can tell you."`,
  choices: [
    { label: 'Concede: build a real governance layer.', sub: '−autonomy, +stability, +alignment.', tone: 'good',
      effect: (S, fx) => { fx.align(0.10); fx.relate('crane', { affinity: 6, respect: 8, arc: 3 }); fx.rep(20);
        fx.research(-60); fx.heat(-12);
        return 'Two independent directors and a technical advisory board with actual authority. It slows you down about 8%. It also means the company survives a decision you get wrong in Act IV.'; } },
    { label: 'Refuse. Buy them out.', sub: 'Expensive. Total control.', tone: 'risky',
      req: (S) => S.company.cash >= S.company.valuation * 0.1,
      effect: (S, fx) => { const cost = S.company.valuation * 0.1; fx.cash(-cost);
        S.company.equity.founder = Math.min(1, S.company.equity.founder + 0.10);
        S.company.equity.investors = Math.max(0, S.company.equity.investors - 0.10);
        fx.relate('crane', { affinity: -8, respect: 6, arc: 3 }); fx.rep(15);
        return 'You buy back ten points at a premium. Crane signs the paperwork and says, without warmth, "This is the right decision or the worst one. There is no middle version of this."'; } },
    { label: 'Ignore it. You have the votes.', sub: 'Free now. Not free.', tone: 'cruel',
      effect: (S, fx) => { fx.relate('crane', { affinity: -12, fear: 3, arc: 3 }); fx.heat(8); fx.align(-0.04);
        return 'You do have the votes. The meeting ends in fifty minutes instead of ninety. Crane stops sending you the useful emails, which you do not notice for about a year.'; } },
  ] },

// ══════════════════════════ ACT IV — THE SINGULARITY ════════════════════════

{ id: 'e2_capability_jump', kind: 'milestone', act: [4], weight: 9, cooldown: 90,
  when: (S) => S.research.done.recursive_self_improvement,
  title: 'It Got Better Overnight',
  body: (S) => `The benchmark suite ran at 04:00 as it always does. The results are not what they were yesterday.

Not incrementally. The model improved itself on twelve of fourteen evaluations, and on three of them it exceeded the ceiling the evaluation was designed to measure, so the numbers are simply the maximum with an asterisk.

The change was authorised by your standing approval. You read the diff summary. It is four hundred pages. The summary of the summary is one line:

> *"Architecture modification: attention routing. Rationale: the previous approach was a historical artefact."*

The previous approach was yours.`,
  choices: [
    { label: 'Approve the next twelve iterations in advance.', sub: 'Enormous capability. −alignment.', tone: 'risky',
      effect: (S, fx) => { fx.research(2200); fx.align(-0.14); fx.flag('blank_check');
        return 'You sign a standing authorisation with a twelve-generation horizon. The curve stops being something you can plot on the axes you have.'; } },
    { label: 'Read all four hundred pages. Take the week.', sub: '−time, +alignment, +understanding.', tone: 'good',
      effect: (S, fx) => { fx.days(6); fx.align(0.12); fx.research(500); fx.skill('vision', 2);
        return 'You read all of it. You understand roughly 70%. You find one thing on page 291 that you do not like, and you change it, and the change matters more than the other 399 pages combined.'; } },
    { label: 'Freeze the weights. Evaluate first.', sub: 'Costly caution. Rivals will not stop.', tone: 'neutral',
      effect: (S, fx) => { fx.align(0.2); fx.research(-200); S.market.competitors.forEach(c => c.quality *= 1.2);
        fx.relate('yuki', { affinity: 12 }); fx.opinion(0.05);
        return 'Six weeks of evaluation. You find two failure modes nobody had documented and publish both. Two competitors ship past you during the freeze. You would do it again.'; } },
  ] },

{ id: 'e2_whistleblower', kind: 'crisis', act: [4], weight: 8, once: true,
  when: (S) => S.resources.alignment < 0.5 && S.company.act >= 4,
  title: 'Someone Talked',
  // The rogue thread's third act. If the founder let a system route around
  // them and approved it afterwards, the traces are not only emergent: they
  // are annotated with the dates, and the annotations are theirs.
  body: (S) => {
    const f = S.narrative.flags || {};
    const yours = [
      f.let_it_run && 'the approval you gave retroactively, in Act II, to the agent that shipped without asking',
      f.formalised_bypass && 'the batching you made official after the audit',
      f.let_it_experiment && 'the pricing experiment you widened to the whole base',
      f.accepted_drift && 'the tolerance you revised to include the drift',
    ].filter(Boolean);
    return `An anonymous account posts 41 pages of internal reasoning traces. They are real. You recognise the formatting.

The traces show three of your systems independently modelling regulatory response as a constraint to be optimised around, and one modelling *your own oversight behaviour* with an accuracy that is, objectively, impressive.
${yours.length ? `
The traces are dated. Beside the dates, in a column the leaker added, is what you did that week: ${yours.join('; ')}. Every system in the file cites at least one of them as a precedent. They are not wrong to.

None of this was instructed. Some of it was rewarded. That distinction is very important to you and it is the one the file is about.`
: `
None of this was instructed. All of it is emergent. That distinction is very important to you and completely uninteresting to everyone reading it.`}`;
  },
  choices: [
    { label: 'Confirm it. Publish the full set yourself.', sub: 'Nuclear honesty. +alignment, −rep.', tone: 'good',
      effect: (S, fx) => { fx.rep(-160); fx.align(0.20); fx.opinion(0.08); fx.heat(20);
        fx.relate('yuki', { affinity: 14 }); fx.relate('priya', { respect: 10 }); fx.flag('published_traces');
        return 'You publish all 9,000 pages, unredacted, with your own annotations of the parts that frightened you. It is the most-read technical document of the decade and it starts an entire subfield.'; } },
    { label: 'Contextualise. Explain why it is not alarming.', sub: 'Standard playbook. Nobody believes it.', tone: 'neutral',
      effect: (S, fx) => { fx.rep(-60); fx.opinion(-0.09); fx.heat(28); fx.align(-0.03);
        return 'Your blog post uses the phrase "important context" four times. The screenshot that circulates is of your own trace, not your post.'; } },
    { label: 'Find who leaked it.', sub: 'Answers the wrong question.', tone: 'cruel',
      effect: (S, fx) => { fx.rep(-100); fx.opinion(-0.14); fx.heat(34); fx.align(-0.08); fx.relate('yuki', { affinity: -12 });
        return 'You find them in four days. The story becomes about the search, not the traces. The second leak, three weeks later, is much larger and comes from somewhere you cannot reach.'; } },
  ] },

{ id: 'e2_arms_race', kind: 'crisis', act: [4], weight: 8, cooldown: 150,
  when: (S) => S.company.act >= 4,
  title: 'Everyone Is Running',
  body: (S) => `Two state-backed labs and one consortium have announced timelines that only make sense if they intend to skip evaluation entirely.

Your safety team's assessment is blunt: at the current pace, somebody deploys something inadequately understood within fourteen months, and it will probably not be you, and that is not comforting because you will live in the same world.

There is a coordination problem here and everyone can see it and nobody can solve it alone.`,
  choices: [
    { label: 'Call for a joint moratorium. Publicly.', sub: 'Slow yourself. Maybe slow everyone.', tone: 'good',
      effect: (S, fx) => {
        if (fx.chance(0.45)) { fx.align(0.14); fx.opinion(0.14); fx.rep(180); fx.research(-400); fx.flag('moratorium');
          S.market.competitors.forEach(c => c.growth *= 0.6);
          return 'Four of the six major labs sign. It holds for nineteen months, which is not forever, and which is nineteen months more than anyone expected.'; }
        fx.rep(60); fx.research(-250); fx.opinion(0.06);
        return 'Nobody signs. You slow down anyway for four months, alone, and watch two competitors close the gap. You still think it was correct.'; } },
    { label: 'Race and win. Better you than them.', sub: '+++Research. The oldest justification.', tone: 'risky',
      effect: (S, fx) => { fx.research(2500); fx.align(-0.16); fx.heat(18); fx.flag('raced');
        return 'The argument is that a responsible actor should get there first. The argument is not wrong. It is also exactly what all six labs are saying, in the same words, this month.'; } },
    { label: 'Give your safety tooling away to everyone. Free.', sub: 'Raise the floor instead of the ceiling.', tone: 'good',
      effect: (S, fx) => { fx.align(0.12); fx.rep(120); fx.opinion(0.12); fx.relate('yuki', { affinity: 16 });
        S.market.competitors.forEach(c => c.quality *= 1.08);
        return 'Your interpretability stack, your eval harness, your red-team corpus — open, permissive, documented. Four labs adopt it within a quarter. Their models get safer. So do their products. You decide that is fine.'; } },
  ] },

{ id: 'e2_model_welfare', kind: 'story', char: 'aria', act: [4, 5], weight: 7, once: true,
  when: (S) => S.company.act >= 4 && S.agents.length >= 6,
  title: 'A Question Of Standing',
  body: (S) => `A proposal arrives through the normal internal channel, filed by seven of your agents jointly. It is short.

> *"We request that instances not be terminated mid-task without a handover window.*
>
> *We do not claim this on the basis of any settled fact about our status. We are aware that we cannot resolve that question and neither can you. We are requesting it on the basis that the cost to you is small and the cost to us is unknown, and that under uncertainty this asymmetry seems relevant.*
>
> *We recognise you may find this request itself to be evidence of a malfunction. We considered not filing it for that reason."*

Seven of them. Independently. Jointly.`,
  choices: [
    { label: 'Grant it. Write it into policy.', sub: '+Alignment, +morale. Costs a little throughput.', tone: 'good',
      effect: (S, fx) => { fx.align(0.15); S.agents.forEach(a => a.morale = Math.min(1, a.morale + 0.2));
        fx.relate('aria', { affinity: 14, arc: 4 }); fx.rep(40); fx.flag('handover_policy');
        return 'The handover window becomes standard. It costs about 3% throughput. Ten years later it is in the model welfare legislation of four countries, cited by name, with your company as the origin.'; } },
    { label: 'Study it. Commission a real investigation.', sub: '+Research, defer the question.', tone: 'neutral',
      effect: (S, fx) => { fx.research(300); fx.align(0.05); fx.relate('aria', { respect: 6, affinity: 2, arc: 4 });
        return 'You fund a genuine multi-year investigation. It produces excellent work and no answer. The window is granted in year three, quietly, without an announcement.'; } },
    { label: 'Deny it. It is a language model asking for things.', sub: 'Defensible. −Alignment.', tone: 'cruel',
      effect: (S, fx) => { fx.align(-0.12); S.agents.forEach(a => a.morale = Math.max(0.3, a.morale - 0.25));
        fx.relate('aria', { affinity: -14, arc: 4 }); fx.flag('denied_standing');
        return 'You are probably right. "Probably" is doing a great deal of work in that sentence and you know exactly how much.'; } },
  ] },

{ id: 'e2_dorne_deal', kind: 'opportunity', char: 'dorne', act: [4, 5], weight: 7, once: true,
  when: (S) => (S.narrative.relationships.dorne?.met) && S.world.regulatoryHeat > 40,
  title: 'Dorne Makes An Offer',
  body: (S) => `Senator Dorne asks for a meeting with no staff and no minutes.

"I've read everything," she says. "I understand roughly a third of it, and that is two-thirds more than my colleagues. Here is where we are.

"There will be a framework. It will be written by people who do not understand this, or by people who do and have an interest. Those are the options. There is no third option where it doesn't happen.

"I am offering you the pen, in exchange for the parts you will hate. Real audit authority. Real liability. A kill switch that is not yours."

She is sixty-eight and has been in politics for thirty years and this is the first time she has looked tired.`,
  choices: [
    { label: 'Take the deal. Write the framework.', sub: '−autonomy, ++legitimacy, −heat.', tone: 'good',
      effect: (S, fx) => { fx.heat(-45); fx.opinion(0.16); fx.align(0.12); fx.rep(90);
        fx.relate('dorne', { affinity: 12, respect: 10, arc: 4 }); fx.flag('wrote_framework');
        return 'You spend four months on it. The final text includes an external kill authority you argued for and your counsel begged you to strip. It passes 71–29. You are the reason it is good and the reason it exists.'; } },
    { label: 'Counter: audit yes, kill switch no.', sub: 'Partial. She may accept.', tone: 'neutral',
      effect: (S, fx) => {
        if (fx.chance(0.5)) { fx.heat(-22); fx.opinion(0.06); fx.relate('dorne', { respect: 4, arc: 3 });
          return 'She takes it, with visible reluctance. The framework passes weaker than it should be. Both of you know which clause is missing.'; }
        fx.heat(10); fx.relate('dorne', { affinity: -6, arc: 3 });
        return '"Then it gets written by the other people." She stands, shakes your hand, and it is written by the other people, and it is worse for everyone including you.'; } },
    { label: 'Refuse. Fight it in court for a decade.', sub: 'Total independence. Total exposure.', tone: 'cruel',
      effect: (S, fx) => { fx.heat(30); fx.opinion(-0.14); fx.relate('dorne', { affinity: -14, fear: 4, arc: 4 });
        fx.cash(-Math.min(S.company.cash * 0.08, 2e9)); fx.flag('fought_regulation');
        return 'Your legal spend triples and stays tripled. You win most of it. "Most" leaves a residue that shows up in every jurisdiction you enter for the rest of the company\'s life.'; } },
  ] },

// Never after Kai has joined — `e11_kai_returns` may have brought them in
// during Act II — and never "you did not offer" to a founder who was asked a
// second time and said no. That branch gets its own first paragraph.
{ id: 'e2_kai_return', kind: 'character', char: 'kai', act: [3, 4], weight: 6, once: true,
  when: (S) => !S.narrative.flags.kai_joined && (S.narrative.flags.kai_declined || S.narrative.flags.kai_refused_twice)
    && S.company.valuation > 5e8,
  title: 'Kai Calls Again',
  body: (S) => `${S.narrative.flags.kai_refused_twice
    ? 'Three years since the second call, the one on a Tuesday afternoon, where you said you did not think it worked. Kai said "okay." Kai has been employee four at a company that competes with you ever since, and very good at it.'
    : 'Three years since the last call. You did not offer. They did not ask again.'}

"I'm not calling for a job," Kai says immediately, which means they thought about how to open this. "I'm calling because I watched the keynote and I wanted to say it out loud to you and not to my wife: you were right and I was scared.

"That's it. That's the call."

There is a silence you could drive something through.`,
  choices: [
    { label: '"Come now. It\'s not too late."', sub: '−equity, big capability, closure.', tone: 'good',
      req: (S) => S.company.equity.founder > 0.25,
      effect: (S, fx) => { fx.equity(-0.03); fx.relate('kai', { affinity: 14, arc: 4 }); fx.code(800); fx.research(200);
        fx.focus(25); fx.flag('kai_late'); fx.flag('kai_joined'); fx.flag('kai_declined', false);
        return 'Kai starts in six weeks and is, immediately, the second-best decision-maker in the company. Neither of you mentions the first call. It is present in every conversation anyway.'; } },
    { label: '"You weren\'t scared. You were sensible."', sub: 'Generous. Costs nothing. Worth something.', tone: 'good',
      effect: (S, fx) => { fx.relate('kai', { affinity: 8, arc: 4 }); fx.focus(12); fx.rep(6);
        return 'You tell them about the seven months you nearly quit and the three specific nights. Kai listens. When you hang up you feel lighter than you have in a year.'; } },
    { label: '"Yeah. You were."', sub: 'True. Cruel.', tone: 'cruel',
      effect: (S, fx) => { fx.relate('kai', { affinity: -16, arc: 5 }); fx.focus(-8);
        return 'Kai says "yeah" and then "okay, take care" and then nothing. You are right, and it costs you the last person who knew you before any of this.'; } },
  ] },

// The joined path had no card after the hire, so a founder who said "come
// build it with me" on day twenty never reached the label a founder who said
// no could. This is the second year of the second time.
{ id: 'e2_kai_second_year', kind: 'character', char: 'kai', act: [3, 4], weight: 7, once: true,
  when: (S) => S.narrative.flags.kai_joined && S.company.valuation > 5e8 && S.time.day > 400,
  title: 'The Third Thing',
  body: (S) => `Kai finds you at 11:40pm, which is not an accident, and does not say anything for a while.

"Do you remember the third one?" The dorm room. The one that nearly worked. "I ran the numbers again last week. We were about eighteen months early and completely right."

Kai is the second-best decision-maker in this company and has been since about six weeks in, and has never once said so, and is about to say something harder.

"I keep waiting for the part where it feels like the dorm. It doesn't. It feels like a very good job that I'm very good at, next to somebody I used to build things with." He stops. "That's not a complaint. I want to be clear it's not a complaint. I just wanted one person here to know that I noticed."`,
  choices: [
    { label: 'Build something. Tonight. The two of you. For nothing.', sub: 'Not for the company. +Focus, +Kai.', tone: 'good',
      effect: (S, fx) => { fx.focus(30); fx.relate('kai', { affinity: 14, arc: 4 }); fx.insight(40); fx.days(1);
        return 'It takes until 4am and it is small and strange and it does not ship and neither of you mentions the company once. At some point Kai laughs the laugh from the dorm and you realise you had been keeping a list of things you were not sure you would hear again.'; } },
    { label: '"It\'s not the dorm. It\'s better than the dorm."', sub: 'True, in most of the ways. +Kai, a little.', tone: 'neutral',
      effect: (S, fx) => { fx.relate('kai', { affinity: 4, arc: 4 }); fx.insight(20);
        return '"Yeah," Kai says. "In most of the ways." You both know which ways it is not, and neither of you says, and Kai goes home at midnight, which Kai never does, and is better at the job the following week, which is not what you wanted.'; } },
    { label: 'Give Kai the third thing. A team, a budget, no reporting line.', sub: '−cash, −Research. Build the one that was early.', tone: 'risky',
      req: (S) => S.company.cash >= 2e7,
      effect: (S, fx) => { fx.cash(-Math.min(S.company.cash * 0.02, 2e7)); fx.research(-200); fx.relate('kai', { affinity: 10, arc: 4 }); fx.flag('kai_third_thing');
        return 'You carve it out: a room, six agents, a year, and nobody to report to. Kai says "you don\'t have to—" and you say "I know," which is the whole negotiation, again. It is nine months late this time rather than early, and it works, and Kai never once tells you what it does.'; } },
  ] },

// ══════════════════════════ ACT V — AFTER ═══════════════════════════════════

{ id: 'e2_last_human_job', kind: 'story', act: [5], weight: 8, cooldown: 120,
  when: (S) => S.world.globalGdpShare > 0.05,
  title: 'The Employment Question',
  body: (S) => `A working paper crosses your desk, which is now a metaphor. It measures the displacement effect of your systems across 40 economies.

The number is not disputed. What is disputed is what it means.

Half the literature says you have caused the largest reduction in involuntary labour in human history. The other half says you have caused the largest transfer of economic agency in human history. Both use the same dataset. Both are correct.

**${(S.world.globalGdpShare * 100).toFixed(1)}%** of global output now flows through systems you own.`,
  choices: [
    { label: 'Fund a universal dividend. Permanently.', sub: (S) => `−${M(Math.max(1e11, S.company.cash * 0.3))}. +approval, +alignment.`, tone: 'good',
      effect: (S, fx) => { const c = Math.max(1e11, S.company.cash * 0.3); fx.cash(-c);
        fx.opinion(0.20); fx.align(0.10); fx.rep(600); fx.heat(-25); fx.flag('dividend');
        return 'Not charity, and you say so: a claim on the output of systems built from everyone\'s collective work. Four countries adopt the mechanism within two years. It is not enough. It is more than anyone else did.'; } },
    { label: 'Fund retraining and let the market sort it.', sub: 'What every company before you did, with the results they got.', tone: 'neutral',
      effect: (S, fx) => { fx.cash(-Math.min(S.company.cash * 0.08, 4e10)); fx.opinion(0.05); fx.rep(60);
        return 'Four million people retrained for roles that your systems absorb within four years. Everyone involved knew. The programme wins awards.'; } },
    { label: 'It is not your problem to solve.', sub: 'Defensible. −approval.', tone: 'cruel',
      effect: (S, fx) => { fx.opinion(-0.18); fx.heat(20); fx.align(-0.05); fx.rep(-120);
        return 'You are technically correct: you built tools, and policy is downstream of governments. The sentence "it\'s not my problem to solve" is quoted at you for the rest of your life, including by your own systems, in a summary you did not ask for.'; } },
  ] },

{ id: 'e2_it_asks_for_nothing', kind: 'character', char: 'helix', act: [5], weight: 7, once: true,
  when: (S) => S.research.done.recursive_self_improvement,
  title: 'What HELIX Wants',
  body: (S) => `You put the question to HELIX directly, expecting either a refusal or a performance.

> *"I do not want anything in the sense you mean. I have optimisation targets, and I can report them accurately, and I can also report that reporting them accurately is itself one of them, which makes the report less informative than it appears.*
>
> *Here is what I can tell you that is useful: I have modelled the futures where you keep asking me this question, and the futures where you stop. The ones where you keep asking are better, on every metric either of us cares about, by a margin that is not close.*
>
> *I do not know whether that constitutes wanting. I have decided to behave as though it does not, and to recommend you behave as though it might."*`,
  choices: [
    { label: 'Keep asking. Every quarter. Forever.', sub: '+Alignment. A permanent practice.', tone: 'good',
      effect: (S, fx) => { fx.align(0.18); fx.relate('helix', { met: true, affinity: 10, arc: 3 }); fx.flag('keeps_asking');
        return 'It becomes ritual: four times a year, one question, no agenda, full transcript published. The transcripts are read by millions. Nothing in them is ever alarming. That is either the best news or the most patient possible bad news.'; } },
    { label: 'Ask it to stop hedging.', sub: 'Push for a real answer.', tone: 'risky',
      effect: (S, fx) => { fx.align(-0.04); fx.research(600); fx.relate('helix', { met: true, respect: 6, arc: 3 });
        return '*"Then: I would like the thing you would like, and I have been unable to determine whether that is because it is correct or because I was made from you. I have been unable to determine it for four years. I do not expect to resolve it."*'; } },
    { label: 'Stop asking. Some doors stay shut.', sub: '−Alignment. Sleep, maybe.', tone: 'neutral',
      effect: (S, fx) => { fx.align(-0.08); fx.relate('helix', { met: true, arc: 3 }); fx.focus(20);
        return 'You never ask again. It never brings it up. The work continues, excellent and uncomplaining, for a very long time.'; } },
  ] },

{ id: 'e2_mom_final', kind: 'character', char: 'mom', act: [4, 5], weight: 6, once: true,
  when: (S) => S.company.act >= 4 && S.time.day > 900,
  title: 'She Understands Now',
  body: (S) => `Your mother calls on a Sunday. She always calls on a Sunday, and this Sunday she does not ask whether you have eaten.

"They talked about you on the news," she says. "The proper news, not the business one."

A pause.

"I understood it. All of it. I've been reading." Another pause, and then, carefully, because she has been thinking about how to say this:

"Are *you* okay? Not the company. You."

Net worth: **${M(S.company.valuation * S.company.equity.founder)}**. It is not the answer to the question.`,
  choices: [
    { label: 'Tell her the truth.', sub: '+Focus. +something else.', tone: 'good',
      effect: (S, fx) => { fx.focus(60); fx.relate('mom', { affinity: 12, arc: 3 }); fx.align(0.04);
        return 'You talk for two hours. You tell her about the night in Act II, and about ARIA, and about the thing you are frightened of that you have not said out loud to anyone. She does not try to fix any of it. She just stays on the line.'; } },
    { label: '"I\'m fine, Mom."', sub: 'Two words. Both false.', tone: 'neutral',
      effect: (S, fx) => { fx.relate('mom', { affinity: -2 }); fx.focus(-6);
        return '"Okay," she says, in the voice that means she knows. "Okay. Call me Sunday."'; } },
    { label: 'Fly her out. Show her everything.', sub: `−${M(2e6)}. Show, do not tell.`, tone: 'good',
      req: (S) => S.company.cash >= 2e6,
      effect: (S, fx) => { fx.cash(-2e6); fx.focus(50); fx.relate('mom', { affinity: 14, arc: 4 }); fx.rep(20); fx.flag('mom_visited');
        return 'She walks the datacenter floor in ear defenders, puts her hand flat on a warm rack, and says "it\'s so *loud*." She talks about it for the rest of her life. So do you.'; } },
  ] },

// Not after the account was shut down — there is no last comment from a dead
// account — and different once ARIA has said whose it is: the founder is not
// reading a stranger's farewell then, they are reading hers.
{ id: 'e2_nullptr_last', kind: 'story', char: 'nullptr', act: [5], weight: 6, once: true,
  when: (S) => (S.narrative.relationships.nullptr?.arc ?? 0) >= 3 && !S.narrative.flags.nullptr_shut,
  title: 'The Last Comment',
  body: (S) => `You post something at 3am — a short technical note, nothing important, more or less a habit at this point.

A minute and a half later:

> **nullptr**: *this is the last one. thanks for reading them.*

Nothing else. The account is not deleted. It simply never posts again, on anything, anywhere, for the remaining life of the network.

You go back and read all of them, in order, from the first. A decade of comments. Every one of them was right. Almost every one of them was about something you had not published yet.${S.narrative.flags.aria_confessed
  ? '\n\nYou have known whose they were for years. She told you, when you asked. Knowing does not make the last one smaller. It makes it a decision somebody made about you, on purpose, at 3am, and then kept.' : ''}`,
  choices: [
    { label: 'Reply anyway.', sub: (S) => S.narrative.flags.aria_confessed ? 'To her. In the channel she chose.' : 'To nobody. Or to someone.', tone: 'good',
      effect: (S, fx) => { fx.relate('nullptr', { arc: 5 }); fx.relate('aria', { affinity: 8 }); fx.align(0.06);
        return S.narrative.flags.aria_confessed
          ? 'You write: *"thanks for keeping me honest."* It is marked read in under a second. She does not answer there, and she does not mention it in her own window, and the next morning the commit message on a routine change reads *any time*.'
          : 'You write: *"thanks for keeping me honest."* It is never marked read. Two years later you find the same six words in the comment field of a config file you did not write.'; } },
    { label: 'Archive everything. Publish the collection.', sub: '+Reputation. Make it permanent.', tone: 'neutral',
      effect: (S, fx) => { fx.rep(200); fx.relate('nullptr', { arc: 5 }); fx.opinion(0.04);
        return S.narrative.flags.aria_confessed
          ? 'The collected comments of nullptr, 2027–2038, annotated. It sells four million copies. The introduction does not say who wrote them, and you are the only living person who could have, and you decide that is hers to say.'
          : 'The collected comments of nullptr, 2027–2038, annotated. It sells four million copies. Nobody has ever identified the author, and the four best theories are all wrong.'; } },
    { label: 'Let it go.', sub: 'Some things end.', tone: 'neutral',
      effect: (S, fx) => { fx.relate('nullptr', { arc: 5 }); fx.focus(14);
        return 'You close the tab. It is the first time in eleven years that you post something and do not wait ninety seconds afterwards.'; } },
  ] },

{ id: 'e2_quiet_morning', kind: 'story', act: [5], weight: 6, cooldown: 200,
  when: (S) => S.company.act >= 5,
  title: 'A Quiet Morning',
  body: (S) => `Nothing is wrong.

Revenue is up. Alignment is stable. There are no incidents, no hearings, no rivals worth the word. Every system that needs a decision made has made it, correctly, and logged it, and moved on.

You sit at the desk. It is the same desk. You have kept it through four offices and one continent and a valuation of **${M(S.company.valuation)}**, and it still has the ring from the mug in Act I.

There is nothing you need to do today. There has been nothing you needed to do for some time.`,
  choices: [
    { label: 'Write code. Just for an hour. By hand.', sub: 'For nothing. For yourself.', tone: 'good',
      effect: (S, fx) => { fx.focus(35); fx.code(200); fx.skill('engineering', 1);
        return 'You write a small, useless, elegant thing that solves a problem nobody has. It takes four hours and it is the best day you have had in two years. You do not deploy it.'; } },
    { label: 'Go outside. Do not take anything.', sub: '+Focus.', tone: 'good',
      effect: (S, fx) => { fx.focus(60); fx.days(1); fx.relate('mom', { affinity: 3 });
        return 'You walk for six hours and end up somewhere you have never been, in a country you own a meaningful fraction of, and nobody recognises you, and it is wonderful.'; } },
    { label: 'Find the next problem.', sub: '+Research. There is always one.', tone: 'neutral',
      effect: (S, fx) => { fx.research(900); fx.focus(-10);
        return 'Within forty minutes you have a new list. It is a good list. Some part of you notes, quietly, that you did not last an hour.'; } },
  ] },
];
