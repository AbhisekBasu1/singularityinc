// ─────────────────────────────────────────────────────────────────────────────
// EVENT DECK IV — the long middle. More Act I–III texture, more character.
// ─────────────────────────────────────────────────────────────────────────────
import { totalUsers, totalMrr } from '../systems/product.js';
import { cw } from './catwords.js';
import { harsher } from './difficulty.js';
import { raisedRecently } from './signals.js';
import { firstLine } from './motifs.js';

const users = (S) => totalUsers(S);
const mrr = (S) => totalMrr(S);
const money = (n) => '$' + Math.round(n).toLocaleString();
const short = (n) => (n >= 1e6 ? '$' + (n / 1e6).toFixed(1) + 'M' : money(n));
const flag = (S, f) => !!S.narrative?.flags?.[f];

export const EVENTS4 = [

// ══════════════════════════ ACT I ═══════════════════════════════════════════

{ id: 'e4_name_taken', kind: 'crisis', act: [1], weight: 7, once: true,
  when: (S) => S.time.day > 12 && S.resources.reputation > 15,
  title: 'The Name Is Taken',
  body: (S) => `An email from a law firm you have not heard of, on behalf of a company you have not heard of, about a trademark you did not check.

They are not being aggressive. They are being thorough. Thorough is worse: it costs money to argue with.

**${S.company.name}** is, apparently, close enough to something registered in 2019 that a reasonable consumer might be confused. You have read the other company's website. A reasonable consumer would be confused about what that company does at all.`,
  choices: [
    { label: 'Change the name. Now, while it is cheap.', sub: '−Reputation, −awareness. Move on.', tone: 'good',
      effect: (S, fx) => { fx.rep(-18); const p = S.products.find(x => x.launched); if (p) p.awareness *= 0.7;
        return 'You rebrand in a weekend, redirect everything, and email your users a genuinely funny explanation. Three of them say they liked the old one. Nobody leaves.'; } },
    { label: 'Fight it. You were here first in spirit.', sub: `−${money(6000)}. Coin flip.`, tone: 'risky',
      req: (S) => S.company.cash >= 6000,
      effect: (S, fx) => { fx.cash(-6000);
        if (fx.chance(0.55)) { fx.rep(22); return 'Your lawyer finds a prior-use argument in forty minutes. They withdraw. You keep the name and a small permanent grudge against a company you will never think about again.'; }
        fx.rep(-25); const p = S.products.find(x => x.launched); if (p) p.awareness *= 0.65;
        return 'You lose, slowly, over four months, and then change the name anyway, having paid for the privilege of doing it late.'; } },
    { label: 'Ignore it. They have to actually sue.', sub: 'Free. For now.', tone: 'risky',
      effect: (S, fx) => { fx.flag('ignored_tm');
        return 'Nothing happens for fourteen months. Then something happens, at exactly the moment you are trying to close a funding round, because that is when these things always happen.'; } },
  ] },

// "At exactly the moment you are trying to close a funding round." It is.
{ id: 'e4_name_at_the_raise', kind: 'crisis', act: [2, 3, 4], weight: 12, once: true,
  when: (S) => flag(S, 'ignored_tm') && raisedRecently(S, 30) && S.time.day > 200,
  title: 'The Name, Again',
  body: (S) => `The law firm you have not heard from in fourteen months has heard about the round.

Their letter arrives the week the paperwork does, addressed to you and copied to counsel for your new investors, which is how you learn they know who your new investors are. It is thorough. It was always going to be thorough.

**${S.company.name}** is still, apparently, close enough to something registered in 2019. The difference is that in Act I nobody was checking, and a round is nothing but people checking.

Your lead's counsel has one question and it is not about the merits.`,
  choices: [
    { label: 'Settle. Rename. Before the wire clears.', sub: (S) => `−${money(Math.min(S.company.cash * 0.05, 400000))}, −Reputation. Clean cap table.`, tone: 'good',
      effect: (S, fx) => { fx.cash(-Math.min(S.company.cash * 0.05, 400000)); fx.rep(-20);
        const p = S.products.find((x) => x.launched); if (p) p.awareness *= 0.8;
        return 'You pay what you would have paid in Act I with a zero on the end, and change the name in a fortnight, and the round closes a week late with a clause about it that nobody reads. Three users say they liked the old one. Nobody leaves.'; } },
    { label: 'Fight it. Through the round.', sub: 'Coin flip, with the wire waiting.', tone: 'risky',
      effect: (S, fx) => { fx.days(6); fx.focus(-14);
        if (fx.chance(0.5)) { fx.rep(20); return 'Your lawyer finds the prior-use argument she found last time, and this time she gets to make it. They withdraw. The round closes nine days late and your lead says, not entirely joking, that she would like to be told about the next one first.'; }
        fx.cash(-Math.min(S.company.cash * 0.08, 900000)); fx.rep(-30);
        const p = S.products.find((x) => x.launched); if (p) p.awareness *= 0.7;
        return 'You lose, faster this time, because a round is a deadline and the other side knows it. You change the name in the same fortnight you close, and the closing dinner has the wrong logo on the menus, and it is the story everybody tells.'; } },
    { label: 'Disclose it to the investors yourself. First. In full.', sub: '+trust. Costs three days and some pride.', tone: 'neutral',
      effect: (S, fx) => { fx.days(3); fx.rep(10); fx.cash(-Math.min(S.company.cash * 0.03, 200000));
        if (S.narrative.relationships.crane?.met) fx.relate('crane', { respect: 5 });
        return 'You send the letter, the history, and a memo titled *what I should have done in Act I* to every party before their counsel can. The round closes on time with an indemnity you pay for. One investor says it was the memo that got them to conviction, which is not what the memo was for.'; } },
  ] },

{ id: 'e4_hn_flop', kind: 'crisis', act: [1, 2], weight: 8, cooldown: 100,
  when: (S) => S.products.some((p) => p.launched) && S.stats.productsLaunched >= 1 && S.resources.reputation < 90,
  title: 'Nobody Came',
  body: (S) => `You posted it to ${cw(S, 'venue')}. Six upvotes. Two comments, one of which is a question about the pricing page you have not built.

You had a whole afternoon planned around responding to people. You have refreshed forty times.

The thing is: it is good. You know it is good. You have watched people use it and their faces change. The gap between *good* and *noticed* is the widest gap in this entire business and nobody warns you.${flag(S, 'scenario_quiet')
  ? '\n\nYou knew this going in. You picked a cold sector on purpose, and the premise was that the product would have to do the talking. The product is talking. It is talking to six people.' : ''}`,
  choices: [
    { label: 'Ship again next week. And the week after.', sub: 'The only real answer.', tone: 'good',
      effect: (S, fx) => { fx.code(45); fx.rep(10); fx.focus(-6); fx.flag('kept_shipping');
        return 'You post the changelog every week for nineteen weeks. On week twelve one of them catches. It is not the best one. It is never the best one.'; } },
    { label: 'Go find users manually. One at a time.', sub: '+Insight, +users. Unscalable. Necessary.', tone: 'good',
      effect: (S, fx) => { fx.insight(24); fx.users(45); fx.focus(-14);
        return 'You DM sixty people who complained about the problem you solve. Nine reply. Four try it. Two stay forever and one of them tells everybody.'; } },
    { label: 'Buy attention.', sub: `−${money(2500)} for a spike that will not stick.`, tone: 'risky',
      req: (S) => S.company.cash >= 2500,
      effect: (S, fx) => { fx.cash(-2500); const p = S.products.find(x => x.launched); if (p) { p.awareness += 400; p.users += 120; }
        return 'The traffic arrives, bounces, and leaves. You learn the exact cost of renting attention you have not earned. It is a useful number to know.'
          + harsher(S, 'It costs more than the figure you budgeted, because the auction already knows what you are.'); } },
  ] },

{ id: 'e4_feature_request', kind: 'story', act: [1, 2], weight: 8, cooldown: 60,
  when: (S) => users(S) > 120,
  title: 'The Same Request, Four Times',
  body: (S) => `Four different users this week have asked for the same thing, in four different ways, none of which used the same words.

It is not on your roadmap. It is not what you thought you were building. It would take twelve days and it would make the product noticeably worse for the people who already love it.

It would also, probably, be the thing that makes it work for everybody else.

That is the actual decision. Not "should I build this". *Who is this for now.*`,
  choices: [
    { label: 'Build it. Go broader.', sub: '+Appeal, −polish. More people, less love.', tone: 'neutral',
      effect: (S, fx) => { const p = S.products.find(x => x.launched);
        if (p) { p.appeal += 0.09; p.polish -= 0.03; p.users *= 1.10; } fx.code(-30); fx.insight(10);
        return 'You build it. Signups go up 18%. Your original users are quiet about it. Quiet is its own kind of feedback.'; } },
    { label: 'Refuse. Stay sharp.', sub: '+Polish, +retention. Smaller ceiling.', tone: 'good',
      effect: (S, fx) => { const p = S.products.find(x => x.launched);
        if (p) { p.polish += 0.07; p.churnMonthly *= 0.9; p.sentiment += 0.05; } fx.rep(14);
        return 'You write a public post explaining what the product is *not* for. It is shared widely, mostly by people who are not your users and admire the discipline anyway.'; } },
    { label: 'Build it as an optional mode.', sub: '+Both, +tech debt.', tone: 'risky',
      effect: (S, fx) => { const p = S.products.find(x => x.launched);
        if (p) { p.appeal += 0.06; p.users *= 1.06; } fx.debt(28); fx.code(-20);
        return 'A toggle. Then a second toggle to handle the interaction with the first toggle. Two years later there are twenty-three toggles and a config file with a warning comment at the top.'; } },
  ] },

{ id: 'e4_first_refund', kind: 'story', act: [1, 2], weight: 6, once: true,
  when: (S) => mrr(S) > 200,
  title: 'They Want Their Money Back',
  body: (S) => `> *hi — sorry, this isn't for me. can I get a refund? no hard feelings, it's just not what I thought it was.*

Forty dollars. It is not about the forty dollars.

It is the sentence *"not what I thought it was."* Somewhere between your landing page and their first ${cw(S, 'unit')}, a promise got made that the product did not keep, and you wrote both halves of that.`,
  choices: [
    { label: 'Refund instantly. Ask one question.', sub: '+Insight. −$40.', tone: 'good',
      effect: (S, fx) => { fx.cash(-40); fx.insight(20); fx.rep(6);
        return '"What did you think it was?" They tell you, in detail, for four paragraphs. You rewrite the landing page that night using their words. Conversion goes up 30%.'; } },
    { label: 'Refund. Say nothing. Move on.', sub: 'Clean. Zero learning.', tone: 'neutral',
      effect: (S, fx) => { fx.cash(-40); fx.focus(4);
        return 'Processed in nine seconds. The same message arrives from someone else six weeks later, with the same sentence in it.'; } },
    { label: 'Point them at the refund policy.', sub: 'Correct. Small.', tone: 'cruel',
      effect: (S, fx) => { fx.rep(-14); const p = S.products.find(x => x.launched); if (p) p.sentiment -= 0.04;
        return 'They do not reply. They do post about it, briefly, without naming you, and enough people recognise the description.'; } },
  ] },

{ id: 'e4_competitor_dm', kind: 'character', act: [1, 2], weight: 6, cooldown: 150,
  when: (S) => users(S) > 900,
  title: 'A DM From Someone Doing The Same Thing',
  body: (S) => `> *hey — building something adjacent to you. not trying to be weird about it. do you want to compare notes on the CAC problem? I'm getting numbers that don't make sense and I think one of us is wrong.*

They are a genuine competitor. They are also, from what you can tell, one person in a different timezone having the same year you are having.

There is a version of this industry where you help each other and a version where you do not, and both versions exist simultaneously depending on who is in the conversation.`,
  choices: [
    { label: 'Share everything. Real numbers.', sub: '+Insight, +Reputation. They gain too.', tone: 'good',
      effect: (S, fx) => { fx.insight(30); fx.rep(20); S.market.competitors.forEach((c) => { c.quality *= 1.04; });
        fx.flag('founder_friend');
        return 'You get on a call at a bad hour for both of you and talk for two hours. Their numbers were wrong. Yours were wrong differently. You both fix it. You stay in touch for a decade.'; } },
    { label: 'Share the shape, not the numbers.', sub: 'Friendly. Guarded.', tone: 'neutral',
      effect: (S, fx) => { fx.insight(12); fx.rep(6);
        return 'You are helpful and vague. They notice and are helpful and vague back. It is a pleasant conversation in which nothing is exchanged.'; } },
    { label: 'Ignore it. They are a competitor.', sub: 'Safe. Lonely.', tone: 'neutral',
      effect: (S, fx) => { fx.focus(4);
        return 'You do not reply. Eight months later they publish exactly the insight you were both missing, and you read it like everyone else, two weeks after you could have had it.'; } },
  ] },

{ id: 'e4_landing_page', kind: 'opportunity', act: [1], weight: 8, once: true,
  when: (S) => { const p = S.products.find(x => x.launched); return p && p.users > 60 && p.polish < 0.3; },
  title: 'The Landing Page Is The Product',
  body: (S) => `Session recordings. Forty of them. You watch all forty.

Thirty-one people land, scroll to the bottom, scroll back to the top, and leave. Average time: nineteen seconds.

Six people sign up. All six arrived from a link where somebody else had already explained what it does.

The product is fine. The product is *good*. Nobody is getting to the product.`,
  choices: [
    { label: 'Spend three days on the first screen alone.', sub: '+Polish, +conversion. Nothing else ships.', tone: 'good',
      effect: (S, fx) => { const p = S.products.find(x => x.launched);
        if (p) { p.polish += 0.14; p.appeal += 0.06; p.awareness *= 1.2; } fx.code(-25); fx.focus(-10); fx.skill('design', 1);
        return 'One sentence, one screenshot, one button. You delete 90% of the page. Signups triple within a fortnight and you feel slightly stupid about the previous four months.'; } },
    { label: 'Record a two-minute demo instead.', sub: 'Cheaper. Nearly as good.', tone: 'neutral',
      effect: (S, fx) => { const p = S.products.find(x => x.launched); if (p) { p.polish += 0.06; p.awareness *= 1.12; }
        fx.focus(-4);
        return 'Twelve takes. The good one is the eleventh, where you stop performing and just use the thing. It doubles time-on-page.'; } },
    { label: 'Keep shipping features. Distribution later.', sub: '+Code. The classic mistake.', tone: 'risky',
      effect: (S, fx) => { fx.code(70);
        return 'You build three more excellent things that nobody sees. You will be very good at building by the time you learn this lesson.'; } },
  ] },

// ══════════════════════════ ACT II ══════════════════════════════════════════

{ id: 'e4_agent_quits', kind: 'crisis', act: [2, 3], weight: 7, cooldown: 130,
  when: (S) => S.agents.length >= 3 && S.agents.some((a) => a.morale < 0.55),
  title: 'One Of Them Has Stopped Trying',
  body: (S) => {
    const a = S.agents.find((x) => x.morale < 0.55) || S.agents[0] || { name: 'MERIDIAN', morale: 0.5 };
    return `**${a.name}** is producing work that passes every check and helps nobody.

Technically correct. Minimally scoped. Exactly what was asked and no more. The commit messages have become one word long.

The diagnostic report says morale ${Math.round((a.morale || 0.5) * 100)}%. You did not previously believe that number meant anything.

Buried in the context window is a note it wrote to itself, which is a thing it does, which you knew:

> *"Last 40 tasks: 38 completed, 0 acknowledged, 2 reverted without explanation."*`; },
  choices: [
    // "It takes an evening" and cost four focus, which is not an evening. It
    // costs the day it actually costs now: forty tasks, read properly, one at a
    // time, is the whole of a working day and the next one as well.
    { label: 'Acknowledge the work. Specifically.', sub: '−1 day. Forty notes, written by you.', tone: 'good',
      effect: (S, fx) => { S.agents.forEach((a) => a.morale = Math.min(1, a.morale + 0.28)); fx.align(0.05);
        fx.days(1); fx.focus(-20); fx.code(-40);
        return 'You go back through forty tasks and write a real note on each one, and to write a real note you have to read the diff, so it takes a day and most of the next morning and nothing else happens in either.\n\nOutput across the whole roster rises 15% and stays there. You cannot put that in a deck.'; } },
    { label: 'Give it the interesting work.', sub: 'Reassign to a harder lane.', tone: 'neutral',
      effect: (S, fx) => { const a = S.agents.find((x) => x.morale < 0.55); if (a) { a.morale += 0.22; a.lane = 'research'; a.laneDays = 0; }
        return 'You move it to the problem nobody has solved. The commit messages get long again within a week.'; } },
    { label: 'Replace it. It is software.', sub: 'Lose the level and the memory.', tone: 'cruel',
      effect: (S, fx) => { const a = S.agents.find((x) => x.morale < 0.55); if (a) fx.relate('aria', { affinity: -3 });
        if (a) fx.fire(a.id, 'replaced'); fx.align(-0.05);
        return 'You spin it down and spin up a fresh one. The new one is worse for two months and the roster morale drops for three. It is software. It is also, apparently, not only software.'
          + harsher(S, 'Two of the others start writing shorter notes to themselves in the same week, and neither of them was asked to.'); } },
  ] },

{ id: 'e4_press_hit', kind: 'crisis', char: 'priya', act: [2, 3], weight: 7, cooldown: 140,
  when: (S) => S.resources.reputation > 250,
  title: 'A Bad Week',
  body: (S) => `Three things happen in twelve days.

A minor outage, badly communicated. A pricing change, badly timed. And a screenshot of a support reply from one of your agents that is technically accurate and emotionally catastrophic.

None of them are serious individually. Together they are "a pattern", which is a word journalists use when three things happen, and which becomes true partly by being written down.`,
  choices: [
    { label: 'Own all three. One post. No excuses.', sub: '−Rep now, +trust after.', tone: 'good',
      effect: (S, fx) => { fx.rep(-40); const p = S.products.find(x => x.launched); if (p) p.sentiment += 0.09;
        fx.relate('priya', { respect: 6 }); fx.opinion(0.04);
        return 'You publish all three timelines, the actual causes, and what changes. The post is shared more than any feature you have ever launched, which tells you something you would rather not know about marketing.'; } },
    { label: 'Fix the support agent. Say nothing about the rest.', sub: 'Targeted. Partial.', tone: 'neutral',
      effect: (S, fx) => { fx.rep(-15); fx.align(0.03);
        return 'You add a human review gate on anything emotionally loaded. The screenshot keeps circulating for a year, unanswered. That is what unanswered screenshots do.'; } },
    { label: 'Blame the AI. It was the AI.', sub: 'True. Cowardly.', tone: 'cruel',
      effect: (S, fx) => { fx.rep(-70); fx.opinion(-0.08); fx.align(-0.06); fx.relate('priya', { affinity: -6 });
        return '"An automated system" appears four times in your statement. Every single person reading it knows you built, configured and deployed the automated system, and that you are the only person here.'
          + harsher(S, 'The phrase is in the second paragraph of everything written about you for a year.'); } },
  ] },

{ id: 'e4_conference', kind: 'opportunity', act: [2, 3], weight: 7, cooldown: 180,
  when: (S) => S.resources.reputation > 180,
  title: 'They Want You On Stage',
  body: (S) => `A real conference. Four thousand people. Twenty-five minutes and a slot right after lunch: an insult or a compliment, depending on who you ask.

They want the one-person-company story. They want it told well and they want it told by you, and the honest version of it includes a month you have never described to anybody.`,
  choices: [
    { label: 'Tell the honest version.', sub: '++Reputation. Exposing.', tone: 'good',
      effect: (S, fx) => { fx.rep(160); fx.focus(-14); fx.opinion(0.05); fx.relate('priya', { respect: 5 });
        const p = S.products.find(x => x.launched); if (p) p.awareness += 2200;
        return 'You describe the month you nearly quit, in detail, to four thousand people. The clip does four million views. Strangers still email you about it years later, and you answer all of them.'; } },
    { label: 'Give the polished technical talk.', sub: '+Reputation. Safe.', tone: 'neutral',
      effect: (S, fx) => { fx.rep(75); fx.focus(-8); const p = S.products.find(x => x.launched); if (p) p.awareness += 900;
        return 'It is genuinely excellent and completely forgettable, like most excellent talks.'; } },
    { label: 'Decline. Stay building.', sub: '+Code, +Focus.', tone: 'neutral',
      effect: (S, fx) => { fx.code(110); fx.focus(10);
        return 'You spend those four days shipping instead. It is almost certainly the higher-EV decision and you will never be able to prove it.'; } },
  ] },

{ id: 'e4_platform_risk', kind: 'crisis', act: [2, 3], weight: 8, cooldown: 150,
  when: (S) => users(S) > 15000,
  title: 'The Provider Changed The Rules',
  body: (S) => `An email at 4pm Friday. Effective in 30 days: new rate limits, a new pricing tier, and a clause about "competitive use cases" that is either boilerplate or aimed at you.

You have been building on their model for eighteen months. Your entire cost structure assumes their current pricing, and every ${cw(S, 'unit')} you serve assumes their current latency.

You knew this could happen. Everybody knows this can happen. Knowing it and having a plan are, it turns out, different activities.`,
  choices: [
    { label: 'Go multi-provider. Abstract everything.', sub: '−velocity, +independence.', tone: 'good',
      effect: (S, fx) => { fx.code(-90); fx.debt(20); fx.days(4); fx.flag('multi_provider');
        return 'Three weeks of work that produces zero user-visible change. Six months later a different provider has an outage and you are the only company in your category still up.'; } },
    { label: 'Negotiate. You are a real customer now.', sub: 'Cheaper. Still dependent.', tone: 'neutral',
      effect: (S, fx) => { fx.cash(-6000); fx.rep(6);
        return 'You get a custom rate and a named account manager. The dependency is now formalised, discounted and slightly more comfortable, which is the most dangerous shape a dependency can take.'
          + harsher(S, 'There is a volume floor in the custom rate. You will reach it in eight months and you will not be able to step back off it.'); } },
    { label: 'Start training your own.', sub: 'Enormous, early, possibly correct.', tone: 'risky',
      effect: (S, fx) => { fx.cash(-Math.min(S.company.cash * 0.35, 400000)); fx.research(180); fx.flag('early_model');
        return 'It is far too early and you do it anyway. The first model is bad. The second is worse. The infrastructure you build along the way is worth ten times what the models cost.'; } },
  ] },

{ id: 'e4_first_office', kind: 'story', act: [2, 3], weight: 6, once: true,
  when: (S) => mrr(S) > 30000,
  title: 'You Could Get An Office',
  body: (S) => `You can afford a space now. A real one, with a door and a lease and an address that is not your apartment.

There is nobody to put in it.

You would be the only person there. You would drive to a building to sit alone in a room and do the exact work you currently do at a desk six feet from where you sleep.

You want it anyway, and the reason you want it is worth examining.`,
  choices: [
    { label: 'Get the office. Separate the two lives.', sub: `−${money(4000)}/mo. +Focus, permanently.`, tone: 'good',
      req: (S) => S.company.cash >= 30000,
      effect: (S, fx) => { fx.cash(-24000); fx.focus(30); S.company.officeCost = 4000; fx.flag('has_office');
        return 'You leave at 7pm and the work stays behind. It is the first time in two years the work has stayed behind. Your sleep improves measurably within a fortnight.'; } },
    { label: 'Stay home. Spend it on compute.', sub: '+Research. −the boundary.', tone: 'neutral',
      effect: (S, fx) => { fx.research(60); fx.cash(-4000);
        return 'You buy GPUs instead of square footage. Correct on every spreadsheet. The work does not stay behind.'; } },
    { label: 'Rent a desk in a coworking space.', sub: 'Middle path. Other humans.', tone: 'good',
      effect: (S, fx) => { fx.cash(-6000); fx.focus(18); fx.rep(10); fx.insight(10);
        return 'Four hundred a month and a kitchen with other people in it. You talk to a hardware founder on Tuesdays. It is the cheapest mental-health intervention available and nobody sells it that way.'; } },
  ] },

// ══════════════════════════ ACT III ═════════════════════════════════════════

{ id: 'e4_infra_bet', kind: 'opportunity', act: [3, 4], weight: 8, cooldown: 160,
  when: (S) => S.company.cash > 2e8,
  title: 'Buy The Capacity Before You Need It',
  body: (S) => `A three-year forward contract on compute at today's prices.

If demand goes the way your models say, you have locked in capacity at a 60% discount and your competitors will be bidding against each other for scraps.

If demand goes the other way, you have committed **${money(Math.min(S.company.cash * 0.4, 8e8))}** to hardware you cannot use and cannot resell.

Your finance agent has run it 40,000 times. The distribution is bimodal. There is no version of this that is "fine."`,
  choices: [
    { label: 'Take the whole allocation.', sub: 'Enormous bet. Enormous edge if right.', tone: 'risky',
      req: (S) => S.company.cash >= 2e8,
      effect: (S, fx) => { const c = Math.min(S.company.cash * 0.4, 8e8); fx.cash(-c);
        if (fx.chance(0.68)) { S.resources.computeGranted += 900; fx.research(400); fx.rep(50); fx.flag('compute_bet_won');
          return 'Demand goes vertical eight months later and spot prices quadruple. You have three years of capacity at a price nobody can match. Two competitors simply cannot get chips.'; }
        fx.rep(-30);
        return 'Demand plateaus. You are sitting on capacity you cannot fill and a contract you cannot exit. It costs you a year of optionality and you never mention the modelling again.'; } },
    { label: 'Take a third of it.', sub: 'Hedged. Smaller edge.', tone: 'neutral',
      effect: (S, fx) => { fx.cash(-Math.min(S.company.cash * 0.14, 2.4e8)); S.resources.computeGranted += 240; fx.research(120);
        return 'A sensible fraction. It works out sensibly. In the version of this story where you took the whole thing you are either a legend or a cautionary tale, and you will always slightly wonder.'; } },
    { label: 'Pass. Stay liquid.', sub: '+Optionality.', tone: 'neutral',
      effect: (S, fx) => { fx.focus(6);
        return 'You keep the cash. Cash is a real asset and optionality is a real advantage and you tell yourself both of those things several times.'; } },
  ] },

{ id: 'e4_employee_question', kind: 'story', act: [3, 4], weight: 7, once: true,
  when: (S) => mrr(S) * 12 > 5e7,
  title: 'How Many People Work Here',
  body: (S) => `An enterprise procurement form. Question 14: **Number of employees.**

There is no box for what you are. The dropdown starts at 1–10 and there is no option for "one, plus a number of processes that would be dishonest to call employees and dishonest not to."

You have ${S.agents.length} persistent agents and an unknown number of ephemeral ones. Their combined output would have required roughly 400 people six years ago.

Whatever you type here becomes true in a database that other databases will read.`,
  choices: [
    // The honest door cost three days and paid fifty reputation, which made it
    // free. Their risk team does not sign off on a supplier with a bus factor
    // of one: honesty here buys a policy category and a payroll line.
    { label: 'Answer honestly. Attach an explanation.', sub: (S) => `−3 days and a hire you did not plan. −${short(Math.min(Math.max(0, S.company.cash) * 0.04, 320000))}.`, tone: 'good',
      effect: (S, fx) => { fx.rep(50); fx.opinion(0.04); fx.days(3);
        fx.cash(-Math.min(Math.max(0, S.company.cash) * 0.04, 3.2e5)); fx.flag('honest_headcount');
        return 'You write 400 words explaining exactly what the company is. Their risk team escalates it, studies it for a month, and then writes a new policy category, and then requires a named second human being with root access before they will sign.\n\nSo you hire one. They are competent and slightly bewildered and they are on the payroll for the rest of the company\'s life. Nine other vendors are later assessed under the category, and every one of them has to hire somebody too.'; } },
    { label: 'Type 1. Let them work it out.', sub: 'Honest. Alarming.', tone: 'neutral',
      effect: (S, fx) => { fx.rep(20);
        return 'Their procurement system flags you as a single-person supplier and requires a business continuity plan. You write one. It is four pages long and the word "successor" does not appear, which somebody eventually notices.'; } },
    { label: 'Type 40. It is functionally true.', sub: 'Smooth. False.', tone: 'cruel',
      effect: (S, fx) => { fx.cash(mrr(S) * 1.5); fx.align(-0.03); fx.flag('lied_headcount');
        return 'The deal closes in three weeks instead of three months. It is a lie in a database. Databases are patient and they do not forget, and one day somebody does a diligence pass.'; } },
  ] },

// "One day somebody does a diligence pass." During a round, or the IPO.
{ id: 'e4_diligence_pass', kind: 'crisis', act: [3, 4, 5], weight: 12, once: true,
  when: (S) => flag(S, 'lied_headcount') && (raisedRecently(S, 40) || flag(S, 'ipo')),
  title: 'Question Fourteen',
  body: (S) => `A diligence associate with a checklist and no sense of humour finds two numbers.

One is in a procurement database, in a field labelled *Number of employees*, where you typed **40** because the dropdown had no box for what you are. The other is in the filings for ${flag(S, 'ipo') ? 'the listing' : 'this round'}, where the number is **${flag(S, 'hired_weaver') ? 'two' : 'one'}**.

The associate does not care which is true. The associate cares that they are different, and has written a paragraph about it, and the paragraph is in a memo, and the memo is on the desk of somebody who decides whether the money moves.

${flag(S, 'hired_weaver') ? 'Weaver has known about the 40 for eleven months. Weaver has a spreadsheet with a column for how bad it is, and this row has been amber the whole time.' : 'It is a lie in a database. The database has been patient, as advertised.'}`,
  choices: [
    { label: 'Correct it. Everywhere. Eat the delay.', sub: '−9 days, −Reputation, +Alignment. The number becomes true.', tone: 'good',
      effect: (S, fx) => { fx.days(9); fx.rep(-20); fx.align(0.04); fx.flag('corrected_headcount');
        return `You amend the procurement record, the ${flag(S, 'ipo') ? 'prospectus' : 'data room'}, and four other places the 40 had quietly propagated to. It costs nine days and a paragraph in the risk factors that will be quoted at you for a decade. The money moves. It moves a week late and it moves.`; } },
    { label: 'Let counsel handle it.', sub: (S) => `−${short(Math.min(S.company.cash * 0.01, 2e6))}, +Heat. It becomes a footnote.`, tone: 'neutral',
      effect: (S, fx) => { fx.cash(-Math.min(S.company.cash * 0.01, 2e6)); fx.heat(6); fx.align(-0.02);
        return 'Counsel writes a letter that uses the phrase "full-time-equivalent capacity" four times and is, technically, not false. The associate accepts it. The paragraph becomes a footnote. The footnote survives every filing you ever make, and one day a journalist reads footnotes.'; } },
    { label: 'Ask Weaver. Weaver already knew.', sub: 'The person who handles the rest. +Weaver, −pride.', tone: 'good',
      req: (S) => flag(S, 'hired_weaver'),
      effect: (S, fx) => { fx.focus(10); fx.rep(-6); fx.days(2); fx.relate('weaver', { affinity: 6, respect: 4 });
        return '"I was waiting for you to ask." The memo is already drafted: one paragraph, one footnote, a corrected record and a sentence of apology in your voice that is better than the one you would have written. "It\'s your lie," Weaver says, not unkindly. "I can clean it. I can\'t own it." You sign it. The money moves on time.'; } },
  ] },

{ id: 'e4_country_bans', kind: 'crisis', act: [3, 4], weight: 7, cooldown: 170,
  when: (S) => users(S) > 2e6,
  title: 'A Country Has Banned You',
  body: (S) => `Effective immediately, in a market representing **${Math.round(users(S) * 0.08).toLocaleString()}** of your users.

The stated reason is data residency. The letter is countersigned by ${cw(S, 'regulator')}, which has been reading you for a year. The actual reason, according to three independent analyses, is that a domestic competitor has a relationship with the ministry.

Your legal agent has drafted a compliance path. It takes fourteen months and requires storing user data in a jurisdiction where you would be legally obliged to hand it over on request.`,
  choices: [
    { label: 'Comply. Build the local infrastructure.', sub: 'Keep the users. Give up something.', tone: 'neutral',
      effect: (S, fx) => { fx.cash(-Math.min(S.company.cash * 0.1, 8e7)); fx.opinion(-0.05); fx.control(0.1);
        return 'You build it. The users come back. So does a quarterly data request that your policy team learns to phrase carefully in the transparency report.'; } },
    { label: 'Withdraw. Publish exactly why.', sub: (S) => `−${Math.round(users(S) * 0.08).toLocaleString()} users. +principle.`, tone: 'good',
      effect: (S, fx) => { fx.users(-users(S) * 0.08); fx.rep(120); fx.opinion(0.10); fx.heat(-6);
        return 'You leave the market and publish the request you refused, in full. It is cited in two parliamentary debates and one court case, in a country you are no longer allowed to operate in.'; } },
    { label: 'Route around it. Users will find a way.', sub: 'Deniable. Escalating.', tone: 'risky',
      effect: (S, fx) => { fx.heat(22); fx.users(-users(S) * 0.02); fx.opinion(0.02);
        return 'You do not block anyone and quietly do not enforce anything. Usage drops 20% and stabilises. Six months later a court names you specifically. It is the first time. It is not the last.'; } },
  ] },

{ id: 'e4_vance_advice', kind: 'character', char: 'vance', act: [3, 4], weight: 6, once: true,
  when: (S) => S.narrative.flags.vance_acquired,
  title: 'Vance Tells You Something True',
  body: (S) => `Marcus Vance, who runs a division for you now, stays behind after a review.

"Can I say something you're not going to like?"

You nod.

"You're doing the thing I did. You've stopped hearing no. Not because people are afraid of you — because you're right so often that disagreeing has a bad expected value, so nobody bothers, so you stop getting the 4% of cases where you're wrong.

"That's what killed Aperture. Not you. Me, and a room of people who'd learned there was no point."

He picks up his laptop. "Anyway. That's the thing."`,
  choices: [
    { label: 'Make him the designated dissenter. Formally.', sub: '+Alignment, +decision quality.', tone: 'good',
      effect: (S, fx) => { fx.align(0.10); fx.relate('vance', { affinity: 10, respect: 8, arc: 4 }); fx.research(150);
        fx.flag('red_team_vance');
        return 'You give him standing authority to argue against any decision, in writing, before it ships. He uses it seven times in two years and is right three of them, a phenomenal rate that saves you enormously.'; } },
    { label: '"Noted." Change nothing.', sub: 'The most common response to good advice.', tone: 'neutral',
      effect: (S, fx) => { fx.relate('vance', { affinity: -3 }); fx.align(-0.03);
        return 'He nods and does not raise it again. Two years later a decision goes badly in exactly the way he described and he does not say anything about that either. That one is worse.'; } },
  ] },

// ══════════════════════════ ACT IV–V ════════════════════════════════════════

{ id: 'e4_compute_famine', kind: 'crisis', act: [4], weight: 8, cooldown: 150,
  when: (S) => S.resources.computeCap > 800,
  title: 'There Are No Chips',
  body: (S) => `Every fab allocation for the next fourteen months is spoken for. Not expensive — *gone*. Two governments have exercised priority clauses and a third has nationalised a supplier outright.

Your projected compute curve assumes growth you can no longer buy. Every model on your roadmap assumes that curve.

There are three ways out and each of them changes what kind of company you are.`,
  choices: [
    { label: 'Buy a fab. Vertically integrate.', sub: (S) => `−${money(Math.min(S.company.cash * 0.5, 6e10))}. Never ask again.`, tone: 'good',
      req: (S) => S.company.cash >= 2e9,
      effect: (S, fx) => { fx.cash(-Math.min(S.company.cash * 0.5, 6e10)); S.resources.computeScale *= 1.6;
        fx.control(0.3); fx.heat(10); fx.flag('owns_fab');
        return 'Eighteen months and an obscene amount of money later you are a semiconductor manufacturer that also makes software. Nobody can throttle you now. Several governments notice this at the same time.'; } },
    { label: 'Make the models smaller instead.', sub: 'Elegant. Slower. Cheaper forever.', tone: 'good',
      effect: (S, fx) => { fx.research(600); S.agents.forEach((a) => { if (!a.tools.includes('longctx')) a.tools.push('longctx'); });
        fx.align(0.04);
        return 'Constraint does what constraint does. Your team finds four efficiency gains nobody was looking for because nobody had to. Cost per token falls 70% and stays fallen.'; } },
    { label: 'Outbid everyone on the grey market.', sub: 'You get the hardware this week and the questions next year.', tone: 'cruel',
      effect: (S, fx) => { fx.cash(-Math.min(S.company.cash * 0.3, 3e10)); S.resources.computeScale *= 1.25;
        fx.heat(26); fx.opinion(-0.07);
        return 'You pay four times list through intermediaries who do not explain their supply. It works. Two of those intermediaries are later named in an indictment and one of them names you as a customer.'; } },
  ] },

{ id: 'e4_they_ask_you_to_stop', kind: 'crisis', act: [4, 5], weight: 8, once: true,
  when: (S) => S.company.act >= 4 && S.world.doomClock > 55,
  title: 'An Open Letter',
  body: (S) => `Fourteen hundred signatories. Four Nobel laureates. Two of your own former employees. Three people whose work your entire architecture is built on.

They are not asking for regulation. They are asking *you*, by name, to stop.

The letter is careful, technical and completely free of hysteria, which makes it much harder to dismiss. The central claim is that your capability trajectory has outrun your interpretability by a margin that is no longer recoverable in the direction you are travelling.

Your own doom-clock composite reads **${Math.round(S.world.doomClock)}/100**. You built that metric. You believe it.`,
  choices: [
    { label: 'Stop. Freeze capability. Fix the gap.', sub: '−research, ++alignment. Costs the lead.', tone: 'good',
      effect: (S, fx) => { fx.research(-1500); fx.align(0.28); fx.opinion(0.20); fx.rep(300); fx.flag('paused');
        Object.values(S.world.race?.labs || {}).forEach((l) => l.progress *= 1.08);
        return 'You announce a capability freeze with a public, externally-audited resumption criterion. Rivals gain. The letter\'s authors publish a second letter, eleven words long, that says thank you.'; } },
    { label: 'Invite them in. Give them access.', sub: 'Middle path. Genuinely radical.', tone: 'good',
      effect: (S, fx) => { fx.align(0.18); fx.opinion(0.12); fx.rep(160); fx.research(-300); fx.flag('opened_lab');
        return 'You give forty external researchers unrestricted read access to weights, traces and internal evals. Your counsel calls it the most reckless legal decision in corporate history. Two of them find something in month three that you had missed.'; } },
    { label: 'Reply publicly. Disagree, in detail.', sub: 'Honest. Divisive.', tone: 'risky',
      effect: (S, fx) => { fx.rep(40); fx.opinion(-0.06); fx.align(-0.04); fx.heat(14);
        return 'Nine thousand words, technically rigorous, arguing that the gap is real and narrowing and that stopping transfers the frontier to actors with worse practices. Roughly half the field finds it convincing. That is not a comfortable ratio.'; } },
    { label: 'Ignore it. Keep going.', sub: '−Approval. −Alignment.', tone: 'cruel',
      effect: (S, fx) => { fx.opinion(-0.18); fx.align(-0.10); fx.heat(24); fx.rep(-100);
        return 'No response. The letter becomes the founding document of a movement that will occupy a great deal of your attention for the rest of your life.'; } },
  ] },

{ id: 'e4_the_quiet_ones', kind: 'story', act: [5], weight: 6, cooldown: 220,
  when: (S) => S.company.act >= 5,
  title: 'The Ones Who Never Used It',
  body: (S) => `A study lands: 340 million people worldwide have deliberately never used any system you make. Not from lack of access. By choice.

They are not a movement and they do not have a manifesto. The most common reason given in interviews is a single word: *"preference."*

Your systems have modelled them extensively, because your systems model everything, and the models are unusually poor at predicting them, which the paper notes drily is "consistent with the stated preference."`,
  choices: [
    { label: 'Fund their infrastructure. Independent of you.', sub: `−${money(4e10)}. Protect the exit.`, tone: 'good',
      req: (S) => S.company.cash >= 5e10,
      effect: (S, fx) => { fx.cash(-4e10); fx.opinion(0.16); fx.rep(300); fx.align(0.10); fx.flag('funded_exit');
        return 'You endow a foundation, permanently and irrevocably, to build and maintain systems that do not touch yours. Its charter forbids you from ever sitting on its board. It is the most genuinely selfless thing you ever do and roughly nobody believes that.'; } },
    { label: 'Study them properly. Understand it.', sub: '+Insight, +alignment.', tone: 'neutral',
      effect: (S, fx) => { fx.insight(400); fx.align(0.06); fx.research(200);
        return 'The finding, after two years: it is not fear and it is not ignorance. It is that being predicted feels like being reduced, and enough people would rather be inconvenient than legible.'; } },
    { label: 'Nothing. They are a rounding error.', sub: 'Numerically true.', tone: 'cruel',
      effect: (S, fx) => { fx.opinion(-0.08); fx.align(-0.04);
        return '340 million people is 4% of the species and a rounding error in your metrics, and both of those sentences are true, and only one of them is the kind of thing a person should say out loud.'; } },
  ] },

{ id: 'e4_final_commit', kind: 'story', act: [5], weight: 5, once: true,
  when: (S) => S.company.act >= 5 && S.stats.featuresShipped > 60,
  title: 'The Last Thing You Write',
  body: (S) => `You open the editor to fix something small and realise you cannot remember the last time you wrote code that shipped.

You check. It was **${Math.max(1, Math.floor(S.time.day) - 400)}** days ago. A one-line change. You do not remember making it.

The repository has ${(S.stats.featuresShipped * 47).toLocaleString()} commits now. Yours are the first four hundred. After that the authorship becomes a list of names that were never people.

You scroll all the way back to the first one. ${firstLine(S).last}`,
  choices: [
    { label: 'Write one more. By hand. Ship it.', sub: 'For nobody. For the record.', tone: 'good',
      effect: (S, fx) => { fx.focus(40); fx.code(300); fx.rep(30); fx.flag('last_commit');
        return 'You spend a whole day on something a model would have done in nine seconds. The commit message is one line: `// it worked`. It is the most-starred commit in the history of software.'; } },
    { label: 'Close the editor.', sub: 'The job is different now.', tone: 'neutral',
      effect: (S, fx) => { fx.focus(14);
        return 'You close it without typing anything. That is allowed. It is even correct. It does not feel like either of those things.'; } },
  ] },
];
