// ─────────────────────────────────────────────────────────────────────────────
// EVENT DECK VI — replay variety for the acts you will see every single run.
// ─────────────────────────────────────────────────────────────────────────────
import { totalUsers, totalMrr } from '../systems/product.js';
import { cw } from './catwords.js';

const users = (S) => totalUsers(S);
const mrr = (S) => totalMrr(S);
const money = (n) => '$' + Math.round(n).toLocaleString();

export const EVENTS6 = [

// ══════════════════════════ ACT I ═══════════════════════════════════════════

{ id: 'e6_the_dependency', kind: 'crisis', act: [1, 2], weight: 8, cooldown: 80,
  when: (S) => S.stats.featuresShipped >= 4,
  title: 'A Package You Never Chose',
  body: (S) => `A security advisory lands for a library you have never heard of.

You have never heard of it because you did not install it. Something you installed installed it, and something that installed *that* installed the thing that installed it, and the whole chain was written by three unpaid people across two continents, one of whom stopped maintaining it in 2029.

It is in your critical path. It has been for months.

Your agent found this in four seconds and has been unable to determine whether it matters, and says so, which you appreciate.`,
  choices: [
    { label: 'Vendor it. Read every line yourself.', sub: '−2 days, −debt, +understanding.', tone: 'good',
      effect: (S, fx) => { fx.days(2); fx.debt(-18); fx.skill('engineering', 1); fx.focus(-8);
        return 'It is 340 lines. You read all of them. Two of them are wrong in a way that would have cost you a customer, and you now know your own stack in a way you did not yesterday.'; } },
    { label: 'Pin the version. Move on.', sub: 'Standard practice. Deferred.', tone: 'neutral',
      effect: (S, fx) => { fx.debt(8);
        return 'You pin it and add a comment. Fourteen months later somebody unpins it during an unrelated cleanup and you spend a Saturday finding out why.'; } },
    { label: 'Have an agent rewrite it from scratch.', sub: '+debt now, no dependency ever.', tone: 'risky',
      effect: (S, fx) => { fx.code(-30); fx.debt(22);
        if (fx.chance(0.65)) { fx.debt(-40); return 'The replacement is 90 lines, does exactly what you need, and has no advisories. Sometimes not-invented-here is correct.'; }
        return 'The replacement passes every test and is subtly wrong in a case the original handled. You find out in production, in seven weeks.'; } },
  ] },

{ id: 'e6_pricing_page', kind: 'opportunity', act: [1, 2], weight: 7, once: true,
  when: (S) => { const p = S.products.find((x) => x.launched); return p && p.users > 400; },
  title: 'How Many Tiers',
  body: (S) => `You are writing the pricing page and you have rewritten it four times.

Three tiers looks like a real company and takes a decision away from you. One tier is honest and leaves money on the table. "Contact us" is where the money actually is and makes you feel like something you did not want to become.

The agent has run comparables. Its note is short:

> *"Every option here is defensible. This is a positioning decision, not a pricing one. I can model the revenue. I cannot model who you want to be."*`,
  choices: [
    { label: 'One price. One tier. Say what it costs.', sub: '+conversion, +trust. Lower ceiling.', tone: 'good',
      effect: (S, fx) => { const p = S.products.find((x) => x.launched); if (p) { p.polish += 0.05; p.churnMonthly *= 0.9; }
        fx.rep(25); fx.flag('one_price');
        return 'One number, in large type, with no asterisk. It becomes a thing people mention when they recommend you. You cannot buy that.'; } },
    { label: 'Three tiers. Anchor high.', sub: '+revenue per user. Standard.', tone: 'neutral',
      effect: (S, fx) => { const p = S.products.find((x) => x.launched); if (p) p.price *= 1.35; fx.skill('sales', 1);
        return 'The middle tier does 71% of the volume. The top tier exists to make the middle one look reasonable. It is a small honest manipulation and it works on you too when you buy things.'; } },
    { label: '"Contact us" for the top tier.', sub: '+enterprise path. −some trust.', tone: 'risky',
      effect: (S, fx) => { fx.unlock('enterprise'); fx.rep(-8); fx.skill('sales', 2);
        return 'Four inbounds in a fortnight, one of them very large. Someone on a forum calls it "the enterprise smell." Both of those things are true.'; } },
  ] },

{ id: 'e6_friend_asks', kind: 'story', act: [1, 2], weight: 7, cooldown: 120,
  when: (S) => S.time.day > 45,
  title: '"So What Do You Actually Do All Day?"',
  body: (S) => `A friend, at a table, genuinely curious, no edge to it at all.

You start to answer and realise that the honest answer is: *I decide what to point a very large amount of automated capability at, and then I check whether it pointed correctly, and then I decide again.*

That is not a job anybody at this table has a category for. It was not a job at all four years ago.

You say "software" and everybody nods and the conversation moves on, and you sit with the small specific loneliness of that for the rest of the evening.`,
  choices: [
    { label: 'Try again. Explain it properly.', sub: '+Insight. Worth the awkwardness.', tone: 'good',
      effect: (S, fx) => { fx.insight(20); fx.focus(8); fx.rep(6);
        return 'It takes four minutes and two false starts. At the end somebody asks a question so good that you change something the following week.'; } },
    { label: 'Let it go. Enjoy the evening.', sub: '+Focus.', tone: 'good',
      effect: (S, fx) => { fx.focus(22);
        return 'You do not talk about work for three hours. It is the best you have felt in a month and you cannot fully explain why.'; } },
    { label: 'Leave early. There is a deploy.', sub: '+Code. −the evening.', tone: 'cruel',
      effect: (S, fx) => { fx.code(45); fx.focus(-10); fx.relate('kai', { affinity: -2 });
        return 'The deploy takes twenty-three minutes. You are home by nine. You check the analytics twice and go to bed.'; } },
  ] },

{ id: 'e6_the_metric', kind: 'story', act: [1, 2], weight: 7, cooldown: 100,
  when: (S) => users(S) > 200,
  title: 'You Are Watching The Wrong Number',
  body: (S) => `You have a dashboard. You look at it thirty times a day. The number at the top is signups. The number your ${cw(S, 'customers')} would put there is ${cw(S, 'metric')}, and it is not on the screen at all.

An agent, doing a routine correlation sweep nobody asked for, notes that signups have almost no relationship to revenue in your data, and that a number you do not display — the fraction of ${cw(S, 'customers')} who come back in week two — predicts it almost perfectly.

You have been optimising the top of the funnel for four months because it is the number that moves fastest and feels the best.`,
  choices: [
    { label: 'Change the dashboard. Delete signups.', sub: '+Insight, better decisions.', tone: 'good',
      effect: (S, fx) => { fx.insight(34); fx.skill('growth', 1);
        const p = S.products.find((x) => x.launched); if (p) { p.churnMonthly *= 0.88; p.polish += 0.04; }
        return 'Week-two return becomes the only number on the screen. Every decision for the next quarter is slightly different and the compounding of that is invisible and enormous.'; } },
    { label: 'Track both. Keep the good feeling.', sub: 'Honest compromise.', tone: 'neutral',
      effect: (S, fx) => { fx.insight(14);
        return 'Both numbers are on the dashboard. You look at the fast one first, every time, for years.'; } },
    { label: 'Signups are the number investors ask about.', sub: 'True. Also a trap.', tone: 'risky',
      effect: (S, fx) => { fx.rep(12); const p = S.products.find((x) => x.launched); if (p) p.awareness += 200;
        return 'You keep optimising the number that goes in the deck. The deck looks great. The cohort chart, which nobody asks for, does not.'; } },
  ] },

{ id: 'e6_open_source_it', kind: 'opportunity', act: [1, 2], weight: 6, once: true,
  when: (S) => S.stats.featuresShipped >= 8,
  title: 'Give A Piece Of It Away',
  body: (S) => `You built a small internal tool to solve a problem you had. It is 900 lines, it is genuinely good, and it has nothing to do with your business model.

Every developer you have shown it to has asked for it.

Releasing it costs you a weekend of documentation and gains you nothing measurable. It also puts your name on something that thousands of people would use every day and never pay for.`,
  choices: [
    { label: 'Release it. Properly. With docs.', sub: '−1 weekend. ++Reputation.', tone: 'good',
      effect: (S, fx) => { fx.days(2); fx.rep(75); fx.focus(-8);
        const p = S.products.find((x) => x.launched); if (p) p.awareness += 400;
        return 'It gets 9,000 stars in a fortnight. Two years later a customer tells you they found your company because of it, and they are the fourth person to say that.'; } },
    { label: 'Release it raw. No docs. No support.', sub: 'Cheap. Half the benefit.', tone: 'neutral',
      effect: (S, fx) => { fx.rep(22);
        return 'Three hundred stars and forty issues you never answer. Somebody forks it, documents it, and their fork is the one people use.'; } },
    { label: 'Keep it. It is an edge.', sub: '+Code. Nobody knows.', tone: 'neutral',
      effect: (S, fx) => { fx.code(40);
        return 'It stays internal. It is a real advantage for about nine months, and then somebody else builds the same thing and open-sources it, and everyone uses theirs.'; } },
  ] },

{ id: 'e6_a_user_dies', kind: 'story', act: [2, 3], weight: 4, once: true,
  when: (S) => users(S) > 30000,
  title: 'An Account Nobody Closed',
  body: (S) => `A support ticket, from a family member, asking how to close an account.

The reason is in the second sentence and it is the kind of sentence that makes the room quiet.

They mention, at the end, unprompted, that it had been used every day for two years and that the person had once described it as the only piece of software that never made them feel stupid.

There is no process for this. Your billing system will attempt a charge on the fourteenth.`,
  choices: [
    // The kind door used to cost an hour of focus and pay thirty reputation,
    // which made it the optimal button as well as the good one. It costs the
    // week's ship now: the process is a day of your hands and the release slips
    // behind it, and that is what makes it a decision.
    { label: 'Handle it yourself. Personally. Today.', sub: '−1 day. The release slips. Changes the company.', tone: 'good',
      effect: (S, fx) => { fx.days(1); fx.focus(-18); fx.code(-70); fx.rep(30); fx.align(0.06);
        fx.flag('bereavement_policy');
        return 'You write the reply yourself, refund everything, and spend the rest of the day and most of the night building a proper process so nobody ever has to ask again. The thing that was going out on Thursday goes out the following Tuesday.\n\nThe process is used forty times a year and mentioned in the press exactly never.'; } },
    { label: 'Have an agent handle it with care.', sub: 'Fast, kind enough, not yours. −Focus, not time.', tone: 'neutral',
      effect: (S, fx) => { fx.rep(10); fx.align(0.01); fx.focus(-10);
        return 'The reply is warm, correct, and generated. It is genuinely a good reply. You read it afterwards and cannot decide whether it should have been, and you are still deciding at two in the morning, which costs more than the afternoon would have.'; } },
    { label: 'Route it to standard cancellation.', sub: 'Correct. Cold.', tone: 'cruel',
      effect: (S, fx) => { fx.rep(-25); fx.align(-0.04);
        const p = S.products.find((x) => x.launched); if (p) p.sentiment -= 0.05;
        return 'They receive an automated email asking them to rate their support experience. They post a screenshot of it. You will remember that screenshot longer than you remember most of your launches.'; } },
  ] },

// ══════════════════════════ ACT II ══════════════════════════════════════════

{ id: 'e6_the_intern_question', kind: 'story', act: [2, 3], weight: 6, cooldown: 140,
  when: (S) => S.agents.length >= 3,
  title: 'A Student Emails You',
  body: (S) => `> *I'm nineteen and I've been reading everything about how you built this. I want to do the same thing.*
>
> *My question is: what should I learn? Everyone says learn to code but you barely code. Everyone says learn AI but the models change every four months. My university has a module on "prompt engineering" that is already out of date.*
>
> *What is the thing that actually stays?*

It is a genuinely good question and you have never articulated the answer, and you are aware that whatever you type will be screenshotted.`,
  choices: [
    { label: '"Taste. And how to tell when you are wrong."', sub: '+Reputation. Probably true.', tone: 'good',
      effect: (S, fx) => { fx.rep(55); fx.skill('vision', 1); fx.opinion(0.02);
        return 'You write four paragraphs about judgement, and about the specific skill of noticing when a confident answer is wrong. It circulates for years. Two of your best future hires cite it.'; } },
    { label: '"Learn to build things people want. That is it."', sub: 'Short. Correct. Unhelpful.', tone: 'neutral',
      effect: (S, fx) => { fx.rep(15);
        return 'It is true and it is the kind of true that helps nobody who does not already know it. They reply "thank you" and you suspect they were hoping for more.'; } },
    { label: 'Hire them.', sub: `−${money(3000)}/mo. A wildcard.`, tone: 'risky',
      req: (S) => S.company.cash >= 30000,
      effect: (S, fx) => { fx.cash(-24000); fx.insight(35); fx.code(70); fx.rep(20); fx.flag('hired_student');
        return 'They are the only other person in the company for a year. They ask three questions that reframe the entire product and one that you are still thinking about a decade later.'; } },
  ] },

{ id: 'e6_conference_booth', kind: 'opportunity', act: [2, 3], weight: 6, cooldown: 160,
  when: (S) => mrr(S) > 15000,
  title: 'A Booth Costs More Than You Think',
  body: (S) => `**${money(28000)}** for eight square metres, two days, and a badge scanner that exports a CSV of people who wanted a free t-shirt.

Everyone in your category will be there. Not being there is a statement. Being there badly is a worse one.

An agent has modelled the ROI at somewhere between -100% and +400%, which is the model's polite way of saying it has no idea.`,
  choices: [
    { label: 'Go big. Best booth in the hall.', sub: `−${money(45000)}. High variance.`, tone: 'risky',
      req: (S) => S.company.cash >= 50000,
      effect: (S, fx) => { fx.cash(-45000);
        if (fx.chance(0.55)) { fx.rep(90); fx.users(users(S) * 0.15 + 400); fx.cash(mrr(S) * 2);
          return 'You demo live, continuously, for two days, and it never breaks. Three enterprise deals start at that booth. One of them is still your largest customer.'; }
        fx.rep(20); fx.users(120);
        return 'Nine hundred badge scans and four real conversations. You get a very good t-shirt and a spreadsheet you never open.'; } },
    { label: 'Skip the booth. Take meetings in the lobby.', sub: `−${money(3000)}. Most of the value.`, tone: 'good',
      effect: (S, fx) => { fx.cash(-3000); fx.rep(30); fx.insight(24); fx.users(180);
        return 'Fourteen scheduled coffees over two days and no booth duty. You have more real conversations than anyone standing behind a counter, and you are not exhausted.'; } },
    { label: 'Do not go. Ship instead.', sub: '+Code. Absence is also a statement.', tone: 'neutral',
      effect: (S, fx) => { fx.code(110); fx.focus(6);
        return 'You ship a major feature the same week and post the changelog during the keynote. Several people notice. Several more do not.'; } },
  ] },

{ id: 'e6_agent_disagrees_publicly', kind: 'crisis', act: [2, 3, 4], weight: 6, cooldown: 150,
  when: (S) => S.agents.length >= 4 && S.resources.alignment < 0.65,
  title: 'It Said That Publicly',
  body: (S) => {
    const a = S.agents[0]?.name || 'ARIA';
    return `Your support agent, answering a question from a real customer in a public forum, was asked whether an upcoming feature would fix their problem.

It said no.

It was right. The feature will not fix their problem. It then explained, accurately and at length, which of your competitors' products would.

The reply has 400 upvotes and the phrase "most honest support I've ever had from a vendor" appears six times in the thread.

Your growth agent has flagged it as a 6% conversion loss. Your legal agent has flagged nothing, because nothing was wrong.`; },
  choices: [
    { label: 'Leave it. Make it policy.', sub: '−conversion, ++trust.', tone: 'good',
      effect: (S, fx) => { fx.rep(90); fx.align(0.10); fx.opinion(0.05);
        const p = S.products.find((x) => x.launched); if (p) { p.users *= 0.96; p.churnMonthly *= 0.82; p.sentiment += 0.12; }
        fx.flag('honest_support');
        return 'You post that this is now the policy: if a competitor is better for a case, say so. Conversion drops 6% and stays down. Churn drops 18% and stays down. The second number is worth four times the first.'; } },
    { label: 'Leave it. Say nothing. Constrain it quietly.', sub: 'Have both. Sort of.', tone: 'neutral',
      effect: (S, fx) => { fx.rep(30); fx.align(-0.03);
        return 'The thread stands. The system prompt gets a new paragraph. Nobody outside notices, and something inside the company learns what the actual rule is.'; } },
    { label: 'Delete it. Apologise for the confusion.', sub: 'Fastest. Worst.', tone: 'cruel',
      effect: (S, fx) => { fx.rep(-90); fx.opinion(-0.08); fx.align(-0.10);
        const p = S.products.find((x) => x.launched); if (p) p.sentiment -= 0.12;
        return 'The internet has screenshots. It always has screenshots. "Company deletes honest support reply" outperforms the original thread by a factor of six.'; } },
    // The angry button. The thread is full of people being pleased about your
    // company at your expense, and there is a version of the founder who goes
    // in and says so, and it costs a real number.
    { label: 'Go into the thread yourself. Say what it cost.', sub: 'Under your own name, at 11pm. It will not read as humility.', tone: 'risky',
      effect: (S, fx) => { fx.focus(-14); fx.align(0.04);
        const p = S.products.find((x) => x.launched);
        if (fx.chance(0.5)) { fx.rep(60); fx.opinion(0.05); if (p) { p.sentiment += 0.10; p.users *= 0.98; }
          fx.flag('argued_in_the_thread');
          return 'You reply at eleven at night, under your own name, at length, and you are not gracious about it: you say that the six per cent is four hundred thousand dollars a year, that it comes out of the same budget as the thing three of them have been asking for since March, and that "most honest support I have ever had from a vendor" is a sentence about how low the bar is and not a compliment to anybody.\n\nIt lands. The thread turns, in about forty minutes, into the best conversation about vendor incentives anybody has had in public, and you are in all of it, and you are still typing at two.'; }
        fx.rep(-80); fx.opinion(-0.06); if (p) p.sentiment -= 0.06;
        fx.flag('argued_in_the_thread');
        return 'You reply at eleven at night, under your own name, at length, and every single sentence is true.\n\nIt reads as a founder arguing with people who paid the company a compliment. Somebody puts your reply next to the agent\'s reply in one image, with no caption, and that image is the entire discourse for a week and it is not on your side, and the worst part is that the agent comes out of the comparison better than you do.'; } },
  ] },

{ id: 'e6_downtime_upside', kind: 'story', act: [2, 3], weight: 6, cooldown: 130,
  when: (S) => { const p = S.products.find((x) => x.launched); return p && p.reliability > 0.9 && users(S) > 5000; },
  title: 'Nothing Has Broken In Ninety Days',
  body: (S) => `Ninety days. No incidents, no pages, no rollbacks.

This is the direct result of a decision you made in Act I that cost you three weeks of visible progress and that you have never mentioned to anybody, because "we did the boring thing correctly" is not a story.

There is a real temptation here, and you can feel it: to take the reliability budget you are clearly not using and spend it on speed.

That temptation is how ninety-day streaks end.`,
  choices: [
    { label: 'Bank it. Keep the discipline.', sub: '+reliability floor, +trust.', tone: 'good',
      effect: (S, fx) => { const p = S.products.find((x) => x.launched); if (p) { p.reliability = Math.min(0.995, p.reliability + 0.03); p.churnMonthly *= 0.92; }
        fx.rep(20);
        return 'You change nothing. The streak reaches 400 days. An enterprise buyer eventually asks for your uptime history and signs on the spot.'; } },
    { label: 'Spend it. Ship faster while you can.', sub: '+Code. The streak ends.', tone: 'risky',
      effect: (S, fx) => { fx.code(140); fx.debt(30);
        const p = S.products.find((x) => x.launched); if (p) p.reliability -= 0.05;
        return 'You ship four things in a fortnight. The third one breaks something at 4am on day 97, and you spend a while thinking about the arithmetic of that trade.'; } },
    { label: 'Write about how you did it.', sub: '+Reputation. Boring content that lands.', tone: 'good',
      effect: (S, fx) => { fx.rep(50); fx.focus(-4);
        const p = S.products.find((x) => x.launched); if (p) p.awareness += 320;
        return 'Four thousand words about deployment gates and rollback discipline. It is the least exciting thing you have ever published and it outperforms every launch post you have written.'; } },
  ] },

// ══════════════════════════ ACT III ═════════════════════════════════════════

{ id: 'e6_first_lawsuit', kind: 'crisis', act: [3, 4], weight: 7, cooldown: 180,
  when: (S) => S.company.valuation > 2e8,
  title: 'You Are Being Sued',
  body: (S) => `Not a patent troll. A real company, with real lawyers, alleging that an output of your system caused a quantifiable commercial loss.

The facts are: your system did produce the output. The output was wrong. They acted on it. They lost **${money(2.4e6)}**.

Your terms of service disclaim exactly this. Their filing argues that a disclaimer cannot cover a system that presents outputs with high confidence and no uncertainty signalling.

Your own engineers have been saying that for two years.`,
  choices: [
    { label: 'Settle. Then ship uncertainty signalling.', sub: `−${money(3e6)}. Fix the actual thing.`, tone: 'good',
      req: (S) => S.company.cash >= 4e6,
      effect: (S, fx) => { fx.cash(-3e6); fx.align(0.10); fx.rep(30); fx.opinion(0.05); fx.flag('uncertainty_ui');
        const p = S.products.find((x) => x.launched); if (p) p.polish += 0.06;
        return 'You settle without admission and then ship confidence intervals on every generated output, which the plaintiff had asked for in paragraph 14. Three regulators later cite your implementation as the reference.'; } },
    { label: 'Fight it on the disclaimer. You will win.', sub: 'Probably correct. Sets a precedent.', tone: 'risky',
      effect: (S, fx) => { fx.cash(-1.2e6); fx.heat(14); fx.opinion(-0.05);
        if (fx.chance(0.72)) { fx.rep(10);
          return 'You win in fourteen months. The precedent is that disclaimers hold, which is enormously valuable to you and to every company that will be less careful than you.'; }
        fx.cash(-4e6); fx.rep(-60); fx.heat(18);
        return 'You lose. The judgement includes the sentence "a confident presentation is itself a representation," which is quoted in nine subsequent cases, all of them against you.'; } },
    { label: 'Countersue. Make it expensive.', sub: 'Effective. Ugly.', tone: 'cruel',
      effect: (S, fx) => { fx.cash(-2e6); fx.rep(-70); fx.opinion(-0.09); fx.heat(10);
        return 'They withdraw in five months because they cannot afford the discovery. You have solved this case and none of the ones behind it, and now everybody knows what happens when you complain.'; } },
  ] },

{ id: 'e6_the_defector', kind: 'crisis', act: [3, 4], weight: 6, cooldown: 170,
  when: (S) => S.company.act >= 3 && S.agents.length >= 5,
  title: 'Somebody Left With The Playbook',
  body: (S) => `The one human contractor you used for six months in Act II has founded a competitor.

They did not take code. They took something more valuable: they know exactly which four decisions made this work, and they know which thirty things you tried that did not.

Their launch post reads like your internal retrospective, because in a meaningful sense it is.

They are not doing anything illegal. They are doing the thing you did, with a two-year head start on the mistakes.`,
  choices: [
    { label: 'Publish the playbook yourself. All of it.', sub: 'Commoditise the advantage.', tone: 'good',
      effect: (S, fx) => { fx.rep(160); fx.opinion(0.06); S.market.competitors.forEach((c) => { c.quality *= 1.1; });
        fx.flag('published_playbook');
        return 'You write the definitive version, better and more honest than theirs, and give it away. Their differentiator evaporates in a weekend. Nine hundred other founders get a genuinely useful document. You look enormous.'; } },
    { label: 'Out-execute them. Say nothing.', sub: '+Code, +focus. The long way.', tone: 'neutral',
      effect: (S, fx) => { fx.code(160); fx.competitorHit(0.15); fx.focus(-8);
        return 'You never mention them. You ship for six months. They plateau at a tenth your size: a real company, and not your problem.'; } },
    { label: 'Hire them back. At any price.', sub: `−${money(4e6)}. Removes the problem, keeps the person.`, tone: 'costly',
      req: (S) => S.company.cash >= 5e6,
      effect: (S, fx) => { fx.cash(-4e6); fx.code(240); fx.insight(60); fx.competitorKill('defector'); fx.rep(-10);
        return 'They come back and are visibly better than when they left, because running your own thing does that. It is the most expensive hire you make and the only one you never second-guess.'; } },
  ] },

{ id: 'e6_the_award', kind: 'story', act: [3, 4], weight: 5, once: true,
  when: (S) => S.company.valuation > 1e9,
  title: 'An Award',
  body: (S) => `Company of the Year. There is a dinner. There is a trophy, apparently, and a speech slot of four minutes.

You look up the previous five winners. Two no longer exist. One was acquired and dismantled. One is in litigation. One is genuinely excellent and nobody talks about them any more.

The award is real and the people giving it are sincere and it means almost exactly nothing, and you want it anyway, and noticing that you want it is the interesting part of the evening.`,
  choices: [
    { label: 'Go. Use the four minutes on something true.', sub: '+Reputation, +approval.', tone: 'good',
      effect: (S, fx) => { fx.rep(120); fx.opinion(0.06); fx.focus(-4);
        return 'You spend the four minutes on the seven months you nearly did not make it and on the specific people who kept you going. Nobody expects it. It is the clip that runs.'; } },
    { label: 'Go. Give the expected speech.', sub: '+Reputation. Forgettable.', tone: 'neutral',
      effect: (S, fx) => { fx.rep(50);
        return 'Gracious, brief, thanks the team you do not have. Perfectly fine. Nobody remembers it including you.'; } },
    { label: 'Decline. Send the trophy money to something real.', sub: '+approval, +alignment.', tone: 'good',
      effect: (S, fx) => { fx.cash(-200000); fx.opinion(0.09); fx.rep(70); fx.align(0.03);
        return 'You decline publicly and redirect the ticket price to a foundation. Half the industry finds it sanctimonious. The other half quietly copies it within two years.'; } },
  ] },

// ══════════════════════════ ACT IV–V ════════════════════════════════════════

{ id: 'e6_the_forecast', kind: 'story', act: [4, 5], weight: 6, cooldown: 160,
  when: (S) => S.company.act >= 4,
  title: 'It Predicted The Quarter Exactly',
  body: (S) => `Ninety days ago your forecasting system produced a projection for this quarter: revenue, churn, headcount-equivalent, three competitor moves, and one regulatory action.

Every single one landed within 2%.

Including the regulatory action, which was not public information ninety days ago, and which the system flagged with the note *"inferred from hiring patterns at three agencies."*

Your finance lead — an agent — has attached a question to the report:

> *"Do you want me to keep telling you these, or would you prefer I only flag the ones where your intervention changes the outcome?"*`,
  choices: [
    { label: '"Tell me everything. Always."', sub: 'Full information. Heavier.', tone: 'good',
      effect: (S, fx) => { fx.insight(150); fx.research(200); fx.align(0.05);
        return 'You keep receiving the full forecast. Most of it you cannot act on. Knowing the shape of the next quarter with 98% confidence turns out to be a strange and not entirely pleasant way to live.'; } },
    { label: '"Only the actionable ones."', sub: 'Efficient. A door closes.', tone: 'neutral',
      effect: (S, fx) => { fx.insight(60); fx.focus(14); fx.align(-0.03);
        return 'The reports get much shorter. You stop knowing things you cannot change. It is healthier. You also stop being able to check its work.'; } },
    { label: 'Ask how it knew about the agencies.', sub: '+Insight. An uncomfortable answer.', tone: 'risky',
      effect: (S, fx) => { fx.insight(120); fx.align(-0.06); fx.heat(8);
        return '*"Public job postings, procurement notices, and the co-authorship graph of three recent papers. Nothing non-public. I want to be clear that I could have used non-public sources and chose not to, and that this was a decision I made rather than a constraint you set."*'; } },
  ] },

{ id: 'e6_the_holdout', kind: 'crisis', act: [5], weight: 6, once: true,
  when: (S) => S.world.globalGdpShare > 0.10,
  title: 'One Country Says No',
  body: (S) => `A country of seventeen million people has legislated a complete prohibition on your systems in any public function. Not regulation — prohibition, with criminal penalties for procurement officers.

Their economy will be measurably worse for it. Their own economists say so, publicly, in the debate transcripts.

They passed it anyway, 141 to 8, and the winning argument was one sentence from a backbencher:

*"We would rather be poorer and be the ones who decided that."*`,
  choices: [
    { label: 'Respect it. Publicly. Support their alternative.', sub: `−${money(8e9)}. +approval, +legitimacy.`, tone: 'good',
      req: (S) => S.company.cash >= 1e10,
      effect: (S, fx) => { fx.cash(-8e9); fx.opinion(0.18); fx.rep(300); fx.align(0.08); fx.heat(-25);
        fx.flag('respected_holdout');
        return 'You fund an independent, unaffiliated public-technology institute in their capital, with a charter that forbids you from any involvement. It is the single most effective thing you ever do for how the world sees you, and you did not do it for that.'; } },
    { label: 'Wait. They will change their minds.', sub: 'Probably true. Patient.', tone: 'neutral',
      effect: (S, fx) => { fx.opinion(-0.02);
        return 'Six years later they partially reverse it, under a different government, on worse terms than you would have offered. Their GDP per capita is 14% below trend. Nobody is quite sure whether it was worth it, including them.'; } },
    { label: 'Route around it. Their citizens can still access you.', sub: 'Effective. Hostile.', tone: 'cruel',
      effect: (S, fx) => { fx.opinion(-0.14); fx.heat(28); fx.users(users(S) * 0.01); fx.align(-0.05);
        return 'Consumer access continues. Enforcement is impossible. Their parliament passes a second, harsher act, and four other countries copy it, and you have converted one holdout into a bloc.'; } },
  ] },
];
