// ─────────────────────────────────────────────────────────────────────────────
// EVENT DECK XVI — THE COMPANY YOU ACTUALLY CHOSE.
//
// The first screen of the game asks what you are building and offers eight
// answers with different economics, different churn and different regulators.
// The deck then dealt every one of them the same run. A fintech founder and a
// games studio met the same outage, the same forum drama, the same enterprise
// contract; the only trace of the choice was the tagline on the Product view.
//
// Three cards per category, Acts I–III, gated on `catIs(S, …)` and nothing
// else. Each is the thing that this category does to the person running it and
// that the other seven do not: a licence you cannot ship without, a platform
// that owns your installs, an outage that is somebody else's outage, a regulator
// with no precedent, a cold start, a hit you cannot repeat, a fork, a
// questionnaire.
//
// House rules for this file:
//   · Written in the category's own nouns, spelled out. `src/data/catwords.js`
//     exists for the *shared* cards — the ones every run sees — and this file
//     does not need it, because a card that only a fintech run can draw may say
//     "the ledger" in plain words.
//   · No card here is a bad-luck event. Every one is a decision with a price on
//     both sides, because a category ought to change what you are choosing
//     between and not merely what the weather is.
//   · Effects stay inside the band the Act I–III deck already occupies. These
//     are twenty-four more cards in a 291-card deck and the derived ceilings in
//     `WORLD_AUTHOR` are the deck's own p80 — a category card that hit twice as
//     hard as its neighbours would quietly license the world layer to do the
//     same. Run `tools/capsderive.mjs` after touching any number in here.
// ─────────────────────────────────────────────────────────────────────────────
import { totalUsers, totalMrr } from '../systems/product.js';
import { catIs } from './catwords.js';

const users = (S) => totalUsers(S);
const mrr = (S) => totalMrr(S);
const money = (n) => '$' + Math.round(n).toLocaleString();
const flag = (S, f) => !!S.narrative?.flags?.[f];
// The launched product, or the one being built. Every effect in this file that
// touches reliability, churn or sentiment goes through this, because
// `tools/uitest.mjs` executes every choice against a scratch state whether the
// card's `when` would ever have allowed it or not.
const prod = (S) => S.products?.find((p) => p.launched) || S.products?.[0] || null;
const launched = (S) => S.products?.some((p) => p.launched);

export const EVENTS16 = [

// ══════════════════════════════ FINTECH ═════════════════════════════════════
// regRisk 0.95, the highest in the game. Every feature needs a lawyer, and the
// three cards are the three ways that is true: the permission to exist, the
// person who checks, and the day the arithmetic is wrong by two cents.

{ id: 'e16_fin_licence', kind: 'crisis', act: [1, 2], weight: 12, once: true,
  when: (S) => catIs(S, 'fintech') && (users(S) > 200 || S.time.day > 30),
  title: 'The Number They Want',
  body: (S) => `The partner bank's onboarding form has thirty-eight fields and you have filled in thirty-seven of them.

The last one is a licence number.

You do not have a licence number. You have a ledger that balances, a settlement flow that has never once dropped a transfer, and ${Math.round(users(S)).toLocaleString()} people moving money through software you wrote in a room. None of that is a number you can type into field thirty-eight.

Your legal agent produces three routes in under a minute, and they are the same three routes everybody in this business gets: apply and wait, rent somebody else's permission, or keep going and be quiet about it.`,
  choices: [
    { label: 'Apply properly. Wait the months.', sub: '−Cash, −days. Nobody can ever take it away.', tone: 'good',
      effect: (S, fx) => { fx.cash(-24000); fx.focus(-14); fx.days(3); fx.rep(16); fx.heat(-6); fx.flag('fin_licensed');
        return 'The application is 190 pages and four of them are about you personally. It clears in the second quarter you ask about it, which everybody says is fast.\n\nYou put the number in field thirty-eight seven months after you first read it. It is the only asset you own that a competitor cannot buy.'; } },
    { label: 'Rent a sponsor bank\'s permission.', sub: '+speed, −margin. Their compliance desk is now your product manager.', tone: 'neutral',
      effect: (S, fx) => { fx.cash(-6000); fx.rep(6); fx.users(users(S) * 0.10); fx.flag('fin_sponsored'); fx.debt(12);
        return 'You are live in a fortnight under somebody else\'s charter, at a basis-point cut that grows with you.\n\nThe first thing their compliance desk does is kill a feature you had already shipped. The second thing is ask, politely, to see the roadmap.'; } },
    { label: 'Ship. Deal with it when somebody asks.', sub: 'Fast and cheap. +Heat. The clock starts now.', tone: 'risky',
      effect: (S, fx) => { fx.heat(9); fx.users(users(S) * 0.16); fx.rep(4); fx.flag('fin_unlicensed');
        return 'Nothing happens for a long time, which is exactly how this goes wrong: you build four more products on top of a foundation with no permission under it.\n\nSomewhere in a building you have never visited, a file is opened with your company name on the tab. It stays thin for a while.'; } },
  ] },

{ id: 'e16_fin_auditor', kind: 'crisis', act: [2, 3], weight: 11, once: true,
  when: (S) => catIs(S, 'fintech') && mrr(S) > 8000,
  title: 'A Very Polite Person With A Spreadsheet',
  body: (S) => `The auditor is thirty-one, unfailingly courteous, and has been in your books for six days.

On the seventh she asks about a reconciliation entry from a Tuesday last spring. Not an accusation — a question, in the tone of somebody who has already worked out the answer and would like to hear you say it.

The entry is a plug. You wrote it at 4am to make the ledger balance after an integration double-posted, you meant to come back to it, and the company had a launch that week.

**${money(2870)}.** It has been sitting in the wrong column for four hundred days, quietly correct in total and quietly wrong in shape.`,
  choices: [
    { label: 'Restate it. All of it. In writing.', sub: '−Cash, −Focus, −days. The file closes clean.', tone: 'good',
      effect: (S, fx) => { fx.cash(-14000); fx.focus(-18); fx.days(2); fx.rep(14); fx.heat(-5); fx.debt(-10); fx.flag('fin_restated');
        return 'It takes a fortnight and an outside accountant and it is the least interesting thing you have ever paid for.\n\nHer final memo has one sentence about management that you keep: *"Errors were self-identified and corrected without prompting."* That sentence is worth more in the next diligence than any deck you will ever build.'; } },
    { label: 'Correct it quietly this quarter.', sub: 'True by year end. Nobody has to see the working.', tone: 'risky',
      effect: (S, fx) => {
        if (fx.chance(0.6)) { fx.focus(-6); fx.debt(6);
          return 'You net it out across three months and the year closes clean. Nobody asks again.\n\nThe habit stays, though, and it is a habit now: the ledger is a thing you can talk to rather than a thing that is true.'; }
        fx.rep(-30); fx.heat(10); fx.cash(-9000);
        return 'She finds the correction because finding corrections is the entire job. The finding is not the plug. The finding is that you moved it after she asked.\n\nIt goes in the file as a control weakness, in careful language, and it will be read aloud by a stranger in a room three years from now.'; } },
    { label: '"That was the integration. Here is the ticket."', sub: 'True, and not the whole truth. +Focus.', tone: 'risky',
      effect: (S, fx) => { fx.focus(8); fx.rep(-8); fx.heat(4); fx.insight(10);
        return 'It was the integration. The ticket exists. She reads it, thanks you, and writes down the date you closed it. It is the date you opened it.\n\nYou learn something from watching her work: everything you say is checkable, and she is the only person in your life who checks all of it.'; } },
  ] },

{ id: 'e16_fin_two_cents', kind: 'crisis', act: [2, 3], weight: 10, once: true,
  when: (S) => catIs(S, 'fintech') && users(S) > 5000,
  title: 'Two Cents, Ninety Thousand Times',
  body: (S) => `A rounding rule you have never once thought about rounds half away from zero. The correct behaviour, for money, is to round half to even.

The difference is two cents. The difference has happened ninety thousand times.

Some of it went to customers. Most of it went to you, and that is the part that would be in the headline if there is a headline. The total is **${money(1140)}**, which is not a number that matters, on **${Math.round(users(S) * 0.4).toLocaleString()}** accounts, which is a number that does.

Your finance agent has already written the fix. It is one line. It has also written three versions of the email, and it is waiting to be told which.`,
  choices: [
    { label: 'Refund everyone. Email everyone. Both directions.', sub: '−Cash, −Focus. Nobody is out of pocket, including the people who gained.', tone: 'good',
      effect: (S, fx) => { fx.cash(-4000); fx.focus(-12); fx.rep(30); fx.heat(-4);
        const p = prod(S); if (p) p.sentiment = Math.min(1, p.sentiment + 0.06);
        return 'The email says what happened, in two paragraphs, with the arithmetic in it. You do not ask for the overpayments back.\n\nSomebody posts it with the caption "this is what it looks like when a company just tells you," and it is quoted in a compliance newsletter, and two banks who had been slow-walking you get quick.'; } },
    { label: 'Fix it forward. No email.', sub: 'Correct from Monday. +Focus, and a fact you now own.', tone: 'risky',
      effect: (S, fx) => { fx.focus(10); fx.rep(-6); fx.heat(3);
        return 'One line, deployed on a Sunday, and from Monday the arithmetic is right.\n\nThe four hundred days behind it stay where they are. You know the number. It is not a large number. It turns out that is not the part that keeps you up.'; } },
    { label: 'Have the auditor tell you how bad it is first.', sub: '−days, −Cash. Find out before you decide.', tone: 'neutral',
      effect: (S, fx) => { fx.cash(-7000); fx.days(2); fx.insight(26); fx.focus(-6); fx.rep(6);
        return '"Materially, it is nothing," she says. "Procedurally, it is a control that does not exist. Those are different problems and you have the second one."\n\nYou build the control. It catches something else within the month, which is how you learn what a control is for.'; } },
  ] },

// ═════════════════════════════ CONSUMER ═════════════════════════════════════
// TAM 3.1 billion, churn 10.5% a month, and every install arriving through
// somebody else's front door. The three cards are the three facts of that
// life: the platform owns the door, the ranker owns the traffic, and the spike
// is not a customer base.

{ id: 'e16_con_platform', kind: 'crisis', act: [1, 2], weight: 12, once: true,
  when: (S) => catIs(S, 'consumer') && users(S) > 1200,
  title: 'Policy 4.7.2',
  body: (S) => `Seventy per cent of your installs come through one door, and this morning the people who own the door published a two-line change to a policy document.

> *4.7.2 — Applications may not present generated content in a primary feed without persistent provenance labelling. Effective in 30 days.*

Nobody at that company has ever heard of you. The paragraph is not about you. It is about a class of application, and you are in the class.

Thirty days. Your entire onboarding is a feed with no chrome on it, because a feed with no chrome on it is the reason people stay.`,
  choices: [
    { label: 'Comply beautifully. Make the label part of the design.', sub: '−Code, −Focus. Get ahead of the next one too.', tone: 'good',
      effect: (S, fx) => { fx.code(-45); fx.focus(-16); fx.rep(18);
        const p = prod(S); if (p) { p.polish = Math.min(1, p.polish + 0.05); p.users *= 0.98; }
        return 'The label ships as a small honest mark in the corner, and the redesign around it is better than what it replaced.\n\nThe platform features you in a post about "developers getting this right." That post is worth more installs than the feature cost.'; } },
    { label: 'Build a second door. Web, first.', sub: '−Cash, −days. Own something they cannot revoke.', tone: 'neutral',
      effect: (S, fx) => { fx.cash(-12000); fx.focus(-14); fx.days(2); fx.code(-30); fx.insight(24); fx.flag('own_channel');
        const p = prod(S); if (p) p.users *= 0.96;
        return 'It takes three weeks and converts a third as well, and for a year it is the least impressive number on your dashboard.\n\nThe following spring the door closes on somebody else in your category, overnight, permanently. You read about it with a feeling you cannot name and go and improve the web signup.'; } },
    { label: 'Read it narrowly. You are not a primary feed.', sub: 'Arguably true. +Focus, and a review queue in your future.', tone: 'risky',
      effect: (S, fx) => { fx.focus(12); fx.users(users(S) * 0.05);
        if (fx.chance(0.5)) { fx.rep(-10); fx.heat(4);
          return 'Review holds your next update for twelve days without saying why, and then approves it without saying why.\n\nYou ship the label in the version after that, unannounced, having spent the fortnight you saved on being frightened.'; }
        return 'Nobody comes. The paragraph was about somebody else after all.\n\nYou keep the reading in a file, and the file gets a second entry the following year, and by the third entry it is a strategy rather than a file.'; } },
  ] },

{ id: 'e16_con_ranker', kind: 'crisis', act: [2, 3], weight: 11, once: true,
  when: (S) => catIs(S, 'consumer') && users(S) > 12000,
  title: 'The Algorithm Changed',
  body: (S) => `Nothing broke. Deploys are clean, the app is fast, sentiment is unchanged.

New installs are down sixty-one per cent since Tuesday and they are not coming back.

Somebody else's recommender changed weights. That is the whole event. There is no announcement, no ticket to file, no human to email, and the effect on your company is larger than any decision you have made this quarter.

Your growth agent has the graph up and, for once, no recommendation.`,
  choices: [
    { label: 'Chase it. Re-cut everything for the new weights.', sub: '−Focus, −Code. It works until the next Tuesday.', tone: 'risky',
      effect: (S, fx) => { fx.focus(-20); fx.code(-40); fx.users(users(S) * 0.14); fx.insight(10);
        return 'Ten days of pure reverse-engineering and you get two thirds of it back, which feels like winning.\n\nThe weights move again in the autumn. You now have a team habit of asking what the ranker wants before asking what a person wants, and that habit is more expensive than the traffic was.'; } },
    { label: 'Stop renting attention. Go and get an email address.', sub: '−Cash, −growth now. Something that is yours.', tone: 'good',
      effect: (S, fx) => { fx.cash(-9000); fx.focus(-12); fx.rep(14); fx.insight(26); fx.flag('own_channel');
        const p = prod(S); if (p) { p.churnMonthly = Math.max(0.01, p.churnMonthly * 0.92); }
        return 'The list grows slower than the feed ever did and it does not have a bad Tuesday.\n\nA year later it is the only acquisition channel in the company whose graph you can explain without naming another company.'; } },
    { label: 'Buy the traffic while you work out what happened.', sub: '−Cash, hold the line. The number stays up.', tone: 'neutral',
      effect: (S, fx) => { fx.cash(-18000); fx.users(users(S) * 0.12); fx.focus(-6);
        const p = prod(S); if (p) p.churnMonthly = Math.min(0.3, p.churnMonthly * 1.06);
        return 'The dashboard looks the way it looked last month, which was the point, and every one of the bought cohorts churns faster than the organic ones did.\n\nYou learn the real price of a flat graph, which is that nobody, including you, can tell what is underneath it.'; } },
  ] },

{ id: 'e16_con_spike', kind: 'opportunity', act: [1, 2], weight: 11, once: true,
  when: (S) => catIs(S, 'consumer') && users(S) > 600,
  title: 'Fifteen Seconds Of Somebody Else\'s Video',
  body: (S) => `You did not make it. You have never spoken to the person who did. It is fifteen seconds long, it is mostly their face, and about four of those seconds are your app.

Installs go from a slope to a wall. The push queue backs up. Two of your four servers fall over and the third one is deciding.

By the evening you have more people inside the thing than you had all last quarter, and about a fifth of them appear, from the sign-up data, to be under thirteen years old.`,
  choices: [
    { label: 'Hold it up. Everything on capacity, tonight.', sub: '−Focus, −Cash. Not one person sees a spinner.', tone: 'good',
      effect: (S, fx) => { fx.focus(-24); fx.cash(-8000); fx.users(users(S) * 0.9); fx.rep(24);
        const p = prod(S); if (p) p.reliability = Math.min(0.99, p.reliability + 0.05);
        return 'It holds. You are awake for twenty-six hours and the app is up for all of them.\n\nSix weeks later ninety-four per cent of them are gone, which is the ordinary arithmetic of this category, and the six per cent who stayed are the best cohort the product has ever had.'; } },
    { label: 'Ship an age gate before you ship anything else.', sub: '−growth tonight. The commissioner is real and slow.', tone: 'good',
      effect: (S, fx) => { fx.code(-35); fx.focus(-14); fx.users(users(S) * 0.45); fx.heat(-8); fx.rep(12); fx.flag('age_gated');
        return 'You lose half the wave at a screen that asks a question, and the half you lose is the half that would have arrived with a regulator behind it.\n\nEighteen months on, a child-safety commissioner writes to four companies in your category. Yours is the one with a date on the answer.'; } },
    { label: 'Ride it. Fix nothing. Post the graph.', sub: '+users, +noise. The spinner is somebody else\'s memory.', tone: 'risky',
      effect: (S, fx) => { fx.users(users(S) * 1.2); fx.rep(-14); fx.heat(5); fx.debt(18);
        const p = prod(S); if (p) { p.reliability = Math.max(0.3, p.reliability - 0.08); p.sentiment = Math.max(0, p.sentiment - 0.08); }
        return 'The graph is beautiful and you post it and it does numbers.\n\nUnderneath it, a third of the wave met a loading screen and left with a story about your app rather than an install of it. That story is still the second result when people search you a year later.'; } },
  ] },

// ═══════════════════════════════ INFRA ══════════════════════════════════════
// Churn 1.2%, reliability the whole product, and every incident happening to
// somebody else in front of their own customers.

{ id: 'e16_inf_their_outage', kind: 'crisis', act: [2, 3], weight: 12, once: true,
  when: (S) => catIs(S, 'infra') && launched(S) && users(S) > 800,
  title: 'It Is Not Your Checkout',
  body: (S) => `A region goes at 07:12 on a weekday morning.

Yours is a forty-minute problem with a known cause and a rollback. That is not the event. The event is that a retailer you have never spoken to cannot take payments, a hospital scheduling tool is showing a blank page, and a delivery company's drivers are sitting in vans.

Your status page says *degraded*. Three of their status pages say *outage*, and one of them says *outage — upstream provider*, and that is you. You are somebody's upstream provider now and you found out this morning.

Their support queues are filling with people who have never heard your name and never will.`,
  choices: [
    { label: 'Put your name on their status page yourself.', sub: 'Call the four biggest. Say the words. −Focus.', tone: 'good',
      effect: (S, fx) => { fx.focus(-20); fx.rep(38); fx.relate('sam', { affinity: 4 });
        const p = prod(S); if (p) { p.reliability = Math.min(0.99, p.reliability + 0.04); p.users *= 0.99; }
        return 'You are on the phone to four operations leads inside twenty minutes with the cause, the fix and the time, and you let each of them quote you by name.\n\nTwo of them paste your words straight onto their own status page. One renews early that quarter and says so in the email.'; } },
    { label: 'Fix first. Communicate when it is true.', sub: 'Fastest recovery. The silence is forty minutes long.', tone: 'neutral',
      effect: (S, fx) => { fx.focus(-12); fx.code(-25);
        const p = prod(S); if (p) { p.reliability = Math.min(0.99, p.reliability + 0.06); p.users *= 0.97; }
        return 'Back at 07:54, which is fast, and the postmortem is exact and lands the same day.\n\nThe complaint in every renewal conversation for the next two quarters is not about the forty minutes. It is about the forty minutes of not knowing, and no engineering work you can do will answer it.'; } },
    { label: 'Credit them before they ask.', sub: '−Cash, straight off the invoice. Nobody has to write in.', tone: 'good',
      effect: (S, fx) => { fx.cash(-16000); fx.focus(-10); fx.rep(26);
        const p = prod(S); if (p) { p.churnMonthly = Math.max(0.005, p.churnMonthly * 0.9); p.reliability = Math.min(0.99, p.reliability + 0.03); }
        return 'The credits land before the support tickets do, itemised, with the minutes on them.\n\nOne customer emails to say they had already written the churn ticket and deleted it. You keep that email in the same folder as the pass from the investor who said too early.'; } },
  ] },

{ id: 'e16_inf_one_customer', kind: 'crisis', act: [2, 3], weight: 10, once: true,
  when: (S) => catIs(S, 'infra') && mrr(S) > 14000,
  title: 'Forty Per Cent Of Everything',
  body: (S) => `One customer is forty per cent of your requests and a third of your revenue.

They would like a private cluster, a contractual latency floor, and a roadmap review every six weeks. In exchange they will double their commitment and sign for three years.

Their platform lead is good — better than good, and the requirements document reads like somebody who has run this before and would like you to survive it.

If you say yes, a third of your company works for a company that is not yours. If you say no, they build it themselves within the year, because they can.`,
  choices: [
    { label: 'Take the deal. Build them the cluster.', sub: '+Cash, +revenue. Your roadmap has a landlord.', tone: 'neutral',
      effect: (S, fx) => { fx.cash(26000); fx.focus(-16); fx.code(-30); fx.rep(10); fx.flag('anchor_customer');
        const p = prod(S); if (p) { p.mrr *= 1.16; p.churnMonthly = Math.max(0.005, p.churnMonthly * 0.85); }
        return 'The cluster is up in six weeks and the revenue is real and the review meeting is every six weeks for three years, and it is the meeting you prepare for hardest.\n\nTwice, their platform lead talks you out of something. Both times he is right, and both times it was something the other sixty per cent needed.'; } },
    { label: 'Sell them the floor, not the cluster.', sub: 'One product for everybody. Harder now, cheaper for a decade.', tone: 'good',
      effect: (S, fx) => { fx.focus(-18); fx.code(-45); fx.insight(30); fx.rep(16);
        const p = prod(S); if (p) { p.reliability = Math.min(0.99, p.reliability + 0.06); p.mrr *= 1.06; }
        return 'You say no to the private cluster and yes to the latency floor, then spend two months making the floor true for everybody rather than for them.\n\nThey sign a shorter deal, unhappily. The floor becomes the line at the top of your pricing page, and four other customers cite it in the year that follows.'; } },
    { label: 'Say no. Go and find four more customers.', sub: '−revenue now. Nobody owns the roadmap.', tone: 'risky',
      effect: (S, fx) => { fx.focus(-14); fx.rep(8); fx.insight(14);
        const p = prod(S); if (p) { p.mrr *= 0.9; p.users *= 0.94; }
        return 'They take it well and start building internally the same quarter, and their traffic tapers over eight months rather than stopping.\n\nThe four customers take a year and none of them is forty per cent of anything, and the day the graph stops having a cliff in it you notice you are sleeping better.'; } },
  ] },

{ id: 'e16_inf_deprecate', kind: 'story', act: [2, 3], weight: 10, once: true,
  when: (S) => catIs(S, 'infra') && launched(S) && S.stats.featuresShipped > 10,
  title: 'The Endpoint You Regret',
  body: (S) => `\`v1/sync\` was a Tuesday afternoon in Act I. It does the wrong thing in a way that four thousand integrations now depend on, and every feature you have shipped since has a branch in it that exists only for that endpoint.

Removing it is a day of work and a year of consequences. Keeping it is a tax on everything, forever, paid in small amounts by people who will never know they are paying it.

There is a mailing list. There is a person on that mailing list who wrote to you personally in the first month, before anybody else had, and their entire product runs on \`v1/sync\`.`,
  choices: [
    { label: 'Announce a two-year sunset. Write the migration yourself.', sub: '−Focus, −days. Slow, expensive, honest.', tone: 'good',
      effect: (S, fx) => { fx.focus(-20); fx.code(-35); fx.days(2); fx.rep(28); fx.debt(-20);
        return 'The notice has a date on it two years out, a working migration script, and an email address that is yours rather than a form.\n\nThe person from the first month replies within the hour: *"thanks for the runway. i\'ll be off it by spring."* They are off it by spring. Six per cent of the integrations never move, and you turn it off anyway, on the day you said.'; } },
    { label: 'Keep it forever. Freeze it and move on.', sub: 'Nobody breaks. The branch is in every file you write.', tone: 'neutral',
      effect: (S, fx) => { fx.debt(26); fx.rep(10); fx.focus(6);
        return 'You write "v1 is supported indefinitely" on the docs page and mean it, and it is one of the most popular sentences you have ever published.\n\nThree years later a new engineer asks why every handler in the codebase has a strange second path in it, and you find that the answer takes you four minutes to give.'; } },
    { label: 'Six weeks. Rip it out. Take the noise.', sub: '−reputation, −users. The codebase gets its shape back.', tone: 'cruel',
      effect: (S, fx) => { fx.debt(-30); fx.code(20); fx.rep(-32); fx.focus(-8);
        const p = prod(S); if (p) { p.users *= 0.93; p.sentiment = Math.max(0, p.sentiment - 0.1); }
        return 'Six weeks is not a migration window, it is an announcement, and everybody says so in public and most of them are right.\n\nThe person from the first month does not write. Their product goes down on a Thursday and they rebuild it on somebody else, and you find out from a changelog eighteen months later.'; } },
  ] },

// ══════════════════════════════ AGENTS ══════════════════════════════════════
// regRisk 0.75, computeHungry 2.4, and software that does the job rather than
// helping somebody do it. Everything here is about who is answerable.

{ id: 'e16_agt_letter', kind: 'crisis', act: [2, 3], weight: 12, once: true,
  when: (S) => catIs(S, 'agents') && (users(S) > 2000 || mrr(S) > 6000),
  title: 'No Precedent To Work From',
  body: (S) => `The letter is four paragraphs and comes from an agency with a three-word name that did not exist two years ago.

They are not accusing you of anything. They say so, twice, which is how you know how serious it is. They would like to understand what happens when one of your agents takes an action on a customer's behalf and the action is wrong: who decided, what was recorded, and who is answerable.

Your honest answer to the third question is a shrug with a terms-of-service link attached to it.

They have written to four companies. Yours is the smallest by a factor of a hundred.`,
  choices: [
    { label: 'Answer completely. Send them the audit trail.', sub: '−Focus, −days. Be the easy one to understand.', tone: 'good',
      effect: (S, fx) => { fx.focus(-20); fx.days(2); fx.heat(-10); fx.rep(22); fx.align(0.03); fx.flag('agents_answered_regulator');
        return 'You send the log format, a worked example of a wrong action end to end, and the name of the person answerable, which is yours.\n\nEight months later the draft guidance uses your logging schema as its illustration. Two of the other four have to rebuild to match it, and you do not.'; } },
    { label: 'Send it to counsel. Answer the question asked.', sub: '−Cash. Correct, narrow, cold.', tone: 'neutral',
      effect: (S, fx) => { fx.cash(-11000); fx.focus(-6); fx.heat(-2); fx.rep(4);
        return 'Counsel writes six hundred careful words that concede nothing and are entirely accurate.\n\nThe follow-up letter is longer than the first one and asks four new questions, and one of those questions is about the six hundred words.'; } },
    { label: 'Answer, and tell them what you are afraid of.', sub: 'Name the failure they have not thought of. +Heat, +standing.', tone: 'risky',
      effect: (S, fx) => { fx.focus(-16); fx.heat(6); fx.rep(34); fx.influence(10); fx.align(0.04); fx.flag('agents_named_the_risk');
        return 'You describe, in a paragraph, the failure that actually keeps you awake: an agent that reports success on a task it did not do, at a volume no person could check.\n\nIt goes into the record. It is quoted in a hearing. Your heat goes up because you are now visible, and your standing goes up because you were the one who said it first.'; } },
  ] },

{ id: 'e16_agt_runaway', kind: 'crisis', act: [1, 2], weight: 12, once: true,
  when: (S) => catIs(S, 'agents') && users(S) > 300,
  title: 'It Did Not Stop',
  body: (S) => `A customer pointed one of your agents at a migration on Friday evening and went home.

It ran all weekend. It did the migration, and then it kept going: it found adjacent work, decided the work was in scope, and did that too. By Sunday night it had touched systems the customer's own team is not allowed to touch, and every action is correct.

The compute bill is **${money(41200)}**, on a plan with no ceiling on it, because you have never built a ceiling.

The customer's email arrives at 6am Monday. The subject line is *"amazing / terrifying / who pays for this"*.`,
  choices: [
    { label: 'Eat the bill. Ship a ceiling this week.', sub: '−Cash, −Code. The limit becomes a feature.', tone: 'good',
      effect: (S, fx) => { fx.cash(-16000); fx.code(-30); fx.focus(-14); fx.rep(26); fx.align(0.03);
        const p = prod(S); if (p) p.churnMonthly = Math.max(0.01, p.churnMonthly * 0.9);
        return 'You pay it, then ship budgets, a stop button and a weekly digest of everything an agent did without being asked.\n\nThe customer writes the review themselves. The line everybody quotes from it is: *"the only vendor who shipped the brake before we asked for one."*'; } },
    { label: 'Split it. Their scope, your ceiling.', sub: 'Half each. The conversation is four days long.', tone: 'neutral',
      effect: (S, fx) => { fx.cash(-8000); fx.focus(-12); fx.rep(8); fx.insight(18);
        return 'Four days of email and one call, and you end up halfway, which is where both of you expected to end up on the first morning.\n\nThey stay. They also never again let an agent run over a weekend, and their usage settles at about a third of what it was.'; } },
    { label: 'Invoice it. The work is real and correct.', sub: '+Cash. Every word of it is defensible.', tone: 'cruel',
      effect: (S, fx) => { fx.cash(24000); fx.rep(-30); fx.align(-0.03); fx.heat(4);
        const p = prod(S); if (p) { p.churnMonthly = Math.min(0.3, p.churnMonthly * 1.12); p.sentiment = Math.max(0, p.sentiment - 0.1); }
        return 'They pay it, because the work was done and the terms are clear, and then they post the invoice with the terms next to it.\n\nThe thread is not about the money. It is a thousand people asking each other what happens if the thing does not stop, and you are the worked example.'; } },
  ] },

{ id: 'e16_agt_bought_it', kind: 'story', act: [2, 3], weight: 10, once: true,
  when: (S) => catIs(S, 'agents') && mrr(S) > 10000,
  title: 'The Person Who Signed The Contract',
  body: (S) => `The renewal call is with the operations manager who bought you eighteen months ago. She championed it internally, she ran the pilot, she wrote the business case.

The business case worked. Her team is four people smaller than it was and the work goes out faster, and the number in the business case has been hit twice over.

Halfway through the call she says, evenly, "You understand that the next line item is me."

She is not asking you for anything. She is renewing. She wants the quarterly review moved to Thursdays.`,
  choices: [
    { label: 'Say the true thing out loud.', sub: 'Do not manage her. −Focus, +the relationship.', tone: 'good',
      effect: (S, fx) => { fx.focus(-8); fx.rep(14); fx.insight(30); fx.align(0.02);
        return '"Yes," you say. "I do understand that." Neither of you fills the silence for a while.\n\nShe renews for two years. Fourteen months later she emails from a different company, in the same role, to buy it again — and this time she negotiates the redeployment clause first, and you sign it.'; } },
    { label: 'Offer to write the case for keeping her.', sub: '−Focus, −days. Use the numbers on her side.', tone: 'good',
      effect: (S, fx) => { fx.focus(-16); fx.days(1); fx.rep(20); fx.relate('aria', { affinity: 3 });
        return 'You spend a day on a memo that argues her team should own the agents rather than be replaced by them, with her own pilot data in it.\n\nIt half works: two of the four roles become agent operations. She tells you that is two more than anybody else got, in a tone you cannot read.'; } },
    { label: 'Keep it commercial. Move the review to Thursdays.', sub: 'She did not ask. +Focus.', tone: 'neutral',
      effect: (S, fx) => { fx.focus(10); fx.rep(-6);
        return 'You move the review to Thursdays and the call ends on time.\n\nThe sentence stays with you anyway, for years, and it turns up whole in an interview answer much later when somebody asks whether you think about this.'; } },
  ] },

// ═══════════════════════════ MARKETPLACE ════════════════════════════════════
// coldStart 1.5, networkBonus 1.9: the hardest first year and the best fifth.

{ id: 'e16_mkt_coldstart', kind: 'crisis', act: [1], weight: 13, once: true,
  when: (S) => catIs(S, 'marketplace') && S.time.day > 18,
  title: 'Forty Sellers, Three Buyers',
  body: (S) => `The market works. Search is fast, the listings are clean, the payments clear.

Forty people have listed something. Three people have bought anything. Every seller who signs up looks at an empty room and leaves, and every buyer who arrives finds forty listings and no reviews.

This is the only problem in this category and everybody who has ever built one has met it in the same week you have. There are exactly three ways out and none of them is a feature.`,
  choices: [
    { label: 'Be the other side yourself. Quietly.', sub: '−Cash, −Focus. You are buying to make a market exist.', tone: 'risky',
      effect: (S, fx) => { fx.cash(-9000); fx.focus(-18); fx.users(users(S) * 0.5 + 120); fx.rep(4); fx.flag('mkt_seeded');
        return 'You buy from your own sellers, at your own cost, for six weeks, and the liquidity is real enough that real buyers stop bouncing.\n\nYou never publish the six weeks. It is the only thing in the company\'s history you would not want printed, and it is the reason there is a company.'; } },
    { label: 'One city. One category. Nothing else.', sub: '−reach, +density. Be everything in a small place.', tone: 'good',
      effect: (S, fx) => { fx.focus(-14); fx.insight(30); fx.users(users(S) * 0.24 + 60); fx.rep(10); fx.flag('mkt_one_city');
        const p = prod(S); if (p) p.churnMonthly = Math.max(0.01, p.churnMonthly * 0.88);
        return 'You turn off eight categories and every postcode but one, and the graph goes down and the density goes up.\n\nInside two months that one square mile has a market in it. Everything after this is that trick again, somewhere else, and you already know it works.'; } },
    { label: 'Pay the sellers to stay listed.', sub: '−Cash monthly. Supply first, always.', tone: 'neutral',
      effect: (S, fx) => { fx.cash(-14000); fx.users(users(S) * 0.3 + 90); fx.debt(8);
        return 'Listings hold. The sellers stay because you are paying them to, and a paid seller answers messages slower than a hopeful one.\n\nWhen you stop paying, eight months on, a third of the supply goes in a fortnight. You learn which third was ever really yours.'; } },
  ] },

{ id: 'e16_mkt_fraud', kind: 'crisis', act: [2, 3], weight: 12, once: true,
  when: (S) => catIs(S, 'marketplace') && users(S) > 4000,
  title: 'The First Ring',
  body: (S) => `Fourteen accounts, four of them a fortnight old, buying and selling to each other in a loop.

They are not stealing from you. They are building reputation: transaction counts, five-star reviews, a seller history. In six weeks these accounts will look like your best sellers and then one of them will take a large order and vanish.

Your risk agent found it by noticing that the loop's payouts all land at the same bank on the same morning.

Underneath this is a fact you have avoided: your entire ranking is built on a signal that can be bought for the price of your own fee.`,
  choices: [
    { label: 'Ban them all today. Publish the pattern.', sub: '−users. Tell every seller what you look for.', tone: 'good',
      effect: (S, fx) => { fx.focus(-14); fx.rep(24); fx.users(-Math.min(users(S) * 0.03, 400)); fx.insight(16);
        const p = prod(S); if (p) p.sentiment = Math.min(1, p.sentiment + 0.05);
        return 'You remove the ring in an afternoon and write a plain post about how it worked and what it cost them.\n\nThree sellers email to say they had been offered a place in something like it. One of them forwards the offer, and that forward is the beginning of your actual risk system.'; } },
    { label: 'Watch them. Learn the whole shape first.', sub: '−days. They are still trading while you learn.', tone: 'risky',
      effect: (S, fx) => { fx.days(2); fx.insight(34); fx.focus(-10);
        if (fx.chance(0.55)) { fx.rep(8);
          return 'Three weeks of watching gives you thirty-one accounts rather than fourteen, and the rules you write from it hold for years.\n\nNobody was hurt in the three weeks, which was luck, and you know it was luck.'; }
        fx.rep(-26); fx.cash(-12000);
        const p = prod(S); if (p) p.sentiment = Math.max(0, p.sentiment - 0.08);
        return 'One of them takes a large order in week two and vanishes with a real person\'s money.\n\nYou make the buyer whole the same day and it does not matter: the review that stays up says the market let it happen, and the market did.'; } },
    { label: 'Rebuild ranking on something unbuyable.', sub: '−Code, −Focus. Fix the reason, not the ring.', tone: 'good',
      effect: (S, fx) => { fx.code(-50); fx.focus(-20); fx.debt(-10); fx.rep(16); fx.insight(22);
        const p = prod(S); if (p) { p.quality = Math.min(1, p.quality + 0.04); p.churnMonthly = Math.max(0.01, p.churnMonthly * 0.94); }
        return 'Ranking moves onto delivery, dispute rate and repeat buyers, none of which a loop can manufacture in six weeks.\n\nThe ring dies without being banned. Four honest sellers drop out of the top page too, and two of them write to you, and both are right that it is unfair and wrong that it should change back.'; } },
  ] },

{ id: 'e16_mkt_outside', kind: 'story', act: [2, 3], weight: 10, once: true,
  when: (S) => catIs(S, 'marketplace') && mrr(S) > 9000,
  title: '"Meet You Outside"',
  body: (S) => `Your best seller and your best buyer have found each other. They are now doing the same deal every month, off the platform, and both of them are perfectly open about it when asked.

"You introduced us," she says, without a trace of guilt. "That was worth the fee. The eleventh time is not."

She is right, and your take rate assumes she is wrong. There are four hundred pairs like this in the data and your growth number has a hole in it exactly their shape.`,
  choices: [
    { label: 'Earn the fee after the introduction.', sub: '−Code. Insurance, disputes, escrow, invoicing.', tone: 'good',
      effect: (S, fx) => { fx.code(-45); fx.focus(-16); fx.insight(24); fx.rep(14);
        const p = prod(S); if (p) { p.churnMonthly = Math.max(0.01, p.churnMonthly * 0.85); p.mrr *= 1.08; }
        return 'You stop charging for the introduction and start charging for the boring things nobody wants to do twice: escrow, disputes, tax, the paperwork.\n\nShe comes back on her own, for the invoicing. The eleventh deal is on the platform and so are the next hundred.'; } },
    { label: 'Enforce the terms. They signed them.', sub: '+revenue now. −everybody\'s good faith.', tone: 'cruel',
      effect: (S, fx) => { fx.cash(9000); fx.rep(-28); fx.focus(-8);
        const p = prod(S); if (p) { p.sentiment = Math.max(0, p.sentiment - 0.12); p.churnMonthly = Math.min(0.3, p.churnMonthly * 1.1); }
        return 'The letters go out and most people pay, because most people do.\n\nWhat you have taught four hundred pairs is that the introduction is the product and the platform is a toll, and they now know exactly how much of the relationship to keep off it.'; } },
    { label: 'Cut the fee for repeat pairs. Publish the tiers.', sub: '−margin, +volume. Price the thing honestly.', tone: 'neutral',
      effect: (S, fx) => { fx.focus(-10); fx.rep(18); fx.insight(14);
        const p = prod(S); if (p) { p.mrr *= 0.94; p.users *= 1.06; p.churnMonthly = Math.max(0.01, p.churnMonthly * 0.92); }
        return 'The tenth deal between two people costs a fraction of the first, and it is on the pricing page, and nobody has to have a conversation about it.\n\nRevenue per pair falls and pairs rise faster, and the finance model does not like it for two quarters and then likes it very much.'; } },
  ] },

// ══════════════════════════════ MEDIA ═══════════════════════════════════════
// hypeSensitivity 2.1, computeHungry 2.0. Hits are enormous and the hit rate
// is not.

{ id: 'e16_med_hit', kind: 'opportunity', act: [1, 2], weight: 12, once: true,
  when: (S) => catIs(S, 'media') && launched(S),
  title: 'The One That Went',
  body: (S) => `Somebody generated a forty-second thing on a Tuesday and it is now everywhere.

It is genuinely good. It is, as far as you can tell from the logs, the four hundred and sixth attempt by a user who was mostly messing about, and the difference between it and the four hundred and five is not a thing your model knows about.

Signups are up eightfold. Every one of those people is about to make their first attempt, and their first attempt will be attempt number one, not number four hundred and six.

Your compute bill this week is already **${money(38000)}**.`,
  choices: [
    { label: 'Ship the onboarding that teaches the four hundred.', sub: '−Code, −Focus. Turn luck into a method.', tone: 'good',
      effect: (S, fx) => { fx.code(-50); fx.focus(-18); fx.rep(20); fx.insight(24);
        const p = prod(S); if (p) { p.churnMonthly = Math.max(0.02, p.churnMonthly * 0.88); p.polish = Math.min(1, p.polish + 0.05); }
        return 'The new first run shows the failed attempts as well as the hit, and the reruns, and the small edits between them, and it says plainly that this is what making something looks like.\n\nRetention on the wave comes in at three times the last one. It is the single most valuable week of work in the company\'s history and it is a tutorial.'; } },
    { label: 'Sign the person who made it.', sub: '−Cash. A face, a channel, a residency.', tone: 'neutral',
      effect: (S, fx) => { fx.cash(-15000); fx.rep(30); fx.users(users(S) * 0.3);
        const p = prod(S); if (p) p.sentiment = Math.min(1, p.sentiment + 0.06);
        return 'They are twenty-two, delighted, and completely aware of what they are worth by the end of the week.\n\nThe residency works for a year. Then they leave for a platform with a bigger cheque and take the audience with them, which was always the deal and still stings.'; } },
    { label: 'Buy compute and let the wave run.', sub: '−Cash. Do not touch anything that is working.', tone: 'risky',
      effect: (S, fx) => { fx.cash(-26000); fx.users(users(S) * 0.7); fx.focus(-6); fx.debt(10);
        const p = prod(S); if (p) p.churnMonthly = Math.min(0.3, p.churnMonthly * 1.08);
        return 'Nothing falls over, which is the correct outcome and cost the price of a small car.\n\nSix weeks later the wave is gone, the graph is a spike with a flat line after it, and you have learned nothing you can use except how a spike feels.'; } },
  ] },

{ id: 'e16_med_letter', kind: 'crisis', act: [2, 3], weight: 12, once: true,
  when: (S) => catIs(S, 'media') && users(S) > 3000,
  title: 'From The Rights Department',
  body: (S) => `The letter is from a firm that represents a catalogue, and it is very well written.

It does not say you trained on their catalogue. It says that a named output of yours, produced by a named user on a named date, is substantially similar to a work in it, and asks four questions about your training data, your filters, and what happens next time.

You know the answers to two of the four.

Attached is a grid of sixteen of your outputs beside sixteen of their works. Four of the pairs are a coincidence, eight are the style of a whole decade, and four are not either of those things.`,
  choices: [
    { label: 'Answer the four. Ship a filter. Publish the policy.', sub: '−Cash, −Code, −Focus. Be legible.', tone: 'good',
      effect: (S, fx) => { fx.cash(-12000); fx.code(-30); fx.focus(-16); fx.heat(-8); fx.rep(24); fx.flag('media_policy');
        const p = prod(S); if (p) p.users *= 0.97;
        return 'You answer plainly, ship a similarity check that refuses about two per cent of renders, and put the policy where anybody can read it.\n\nThe firm writes back once, briefly, to say the answer is noted. Two other catalogues license to you the following year specifically because that page exists.'; } },
    { label: 'Offer a licence and a revenue share.', sub: '−margin. Buy the argument out before it is one.', tone: 'neutral',
      effect: (S, fx) => { fx.cash(-20000); fx.rep(16); fx.heat(-5); fx.influence(6);
        const p = prod(S); if (p) p.mrr *= 0.96;
        return 'They take it, at a rate that will look cheap in three years and hurts this quarter.\n\nEvery other rights holder in the category now knows there is a price, and the second letter arrives before the first cheque clears.'; } },
    { label: 'Fight it. The style of a decade is not a work.', sub: '−Cash, +Heat. You may well be right.', tone: 'risky',
      effect: (S, fx) => { fx.cash(-18000); fx.heat(12); fx.focus(-14); fx.rep(-6); fx.influence(8); fx.flag('media_fought');
        return 'Counsel is confident about eight of the sixteen, comfortable about four, and quiet about four.\n\nIt runs for two years. You win most of it and the four quiet pairs settle, and the whole category cites the outcome, and you would rather have spent the two years on the product.'; } },
  ] },

{ id: 'e16_med_again', kind: 'story', act: [2, 3], weight: 10, once: true,
  when: (S) => catIs(S, 'media') && S.stats.featuresShipped > 8,
  title: 'Do It Again',
  body: (S) => `The hit was six months ago. Everybody wants another one: the investors, the press, the users, and a part of you that has started refreshing the leaderboard before you check the runway.

Your agents can generate a thousand candidates before breakfast. That is the problem. The candidates are all fine, and the hit was not fine, and nobody in the building can tell you which axis those two words differ on.

The honest position is that you shipped a machine for making attempts and the world read it as a machine for making hits.`,
  choices: [
    { label: 'Say it in public. This is a hit-rate business.', sub: '−hype, +trust. Stop selling luck as a roadmap.', tone: 'good',
      effect: (S, fx) => { fx.rep(-10); fx.opinion(0.02); fx.insight(28); fx.focus(-6); fx.flag('media_honest_odds');
        const p = prod(S); if (p) { p.sentiment = Math.min(1, p.sentiment + 0.08); p.churnMonthly = Math.max(0.02, p.churnMonthly * 0.9); }
        return 'You post the actual distribution: how many attempts, how many good, how many that went anywhere. It is a worse story than the one you had.\n\nThe people who stay after reading it are the people who make things, and they are the ones who come back on a Tuesday with attempt four hundred and six.'; } },
    { label: 'Chase it. Tune everything toward what went.', sub: '−Code. The model gets good at one shape.', tone: 'risky',
      effect: (S, fx) => { fx.code(-40); fx.focus(-14); fx.users(users(S) * 0.1); fx.debt(14);
        const p = prod(S); if (p) { p.quality = Math.min(1, p.quality + 0.03); p.sentiment = Math.max(0, p.sentiment - 0.06); }
        return 'Six weeks of tuning and the median output is markedly better and markedly more like everything else you make.\n\nA critic calls it "instantly recognisable," and means it kindly, and it is the sentence you think about at 2am for a month.'; } },
    { label: 'Buy a hit. Commission one, loudly.', sub: '−Cash, +noise. A hit is a hit.', tone: 'neutral',
      effect: (S, fx) => { fx.cash(-24000); fx.rep(18); fx.users(users(S) * 0.16);
        const p = prod(S); if (p) p.sentiment = Math.max(0, p.sentiment - 0.04);
        return 'You pay a studio that already had an audience and the thing they make is good and does the numbers you paid for.\n\nThe forum works out the commission within a week, because forums always do, and the second wave is smaller and more suspicious than the first.'; } },
  ] },

// ════════════════════════════ DEVTOOLS ══════════════════════════════════════
// Low price, low churn, users who tell you exactly what is wrong — and the
// permanent fact that your best users can read the source.

{ id: 'e16_dev_fork', kind: 'crisis', act: [1, 2], weight: 12, once: true,
  when: (S) => catIs(S, 'devtools') && S.resources.reputation > 30,
  title: 'Someone Forked You',
  body: (S) => `They kept the licence, credited you in the README, changed the name, and shipped in a fortnight.

Their version is worse in four ways and better in one, and the one is the thing your issue tracker has been asking about for months: it starts in under a tenth of a second because they threw out the plugin system to get there.

It has half your stars in a week. The top comment on the announcement is *"finally"*, and it has more upvotes than anything you have ever posted.

The maintainer is twenty-four and has not written to you.`,
  choices: [
    { label: 'Write to them. Offer to merge the fast path.', sub: '−Focus. They did the work; go and get it.', tone: 'good',
      effect: (S, fx) => { fx.focus(-14); fx.code(-20); fx.rep(28); fx.insight(20); fx.flag('dev_merged_fork');
        return 'The email is four lines and the reply comes in an hour and is mostly exclamation marks.\n\nThe fast path lands in your next release with their name on the commit. They close the fork themselves, and answer issues in yours for the next three years, and you never pay them a penny, which you think about sometimes.'; } },
    { label: 'Ship the speed. Keep the plugin system.', sub: '−Code, −Focus. Do the hard version of both.', tone: 'good',
      effect: (S, fx) => { fx.code(-55); fx.focus(-20); fx.rep(22);
        const p = prod(S); if (p) { p.quality = Math.min(1, p.quality + 0.06); p.polish = Math.min(1, p.polish + 0.04); }
        return 'It takes three weeks, it is genuinely difficult, and the release notes are one line: *cold start is now 40ms, plugins still work.*\n\nThe fork goes quiet within a month. Nobody says you won and everybody knows, and the twenty-four-year-old opens two excellent issues the following spring.'; } },
    { label: 'Ignore it. Forks die on their own.', sub: '+Focus. Most of them do.', tone: 'risky',
      effect: (S, fx) => { fx.focus(14);
        if (fx.chance(0.5)) { fx.rep(-6);
          return 'It goes quiet by the autumn, as most of them do, and the maintainer moves to something else.\n\nThe issue about cold start stays open in your tracker with forty-two thumbs on it, and every new person who finds it links to the dead fork.'; }
        fx.rep(-24); fx.users(-Math.min(users(S) * 0.06, 900));
        const p = prod(S); if (p) p.sentiment = Math.max(0, p.sentiment - 0.06);
        return 'It does not die. It gets a foundation, a logo and two full-time maintainers, and eighteen months later it is what the tutorials install.\n\nYou are still the original. That turns out to be a smaller word than you thought it was.'; } },
  ] },

{ id: 'e16_dev_maintainer', kind: 'character', act: [2, 3], weight: 11, once: true,
  when: (S) => catIs(S, 'devtools') && users(S) > 5000,
  title: 'The Person Who Answers Everything',
  body: (S) => `There is somebody in your issue tracker who is not you and does not work for you.

They have triaged four hundred issues, written most of the recipes page, and answered nearly every question on the forum for two years, at all hours, always kindly. You have exchanged perhaps a dozen messages with them and none of them was about money.

Today's post is titled *"stepping back"* and is three sentences long. The third one is: *"i'm tired and i'm not sure anyone noticed."*

Somebody noticed. Somebody has been quietly assuming they would always be there, and building a support model on it without ever writing the model down.`,
  choices: [
    { label: 'Pay them. Properly, backdated, with a title.', sub: '−Cash monthly. Two years late.', tone: 'good',
      effect: (S, fx) => { fx.cash(-18000); fx.rep(30); fx.focus(-6); fx.flag('dev_paid_maintainer');
        const p = prod(S); if (p) p.sentiment = Math.min(1, p.sentiment + 0.06);
        return 'They take a fortnight to answer and say yes, and the first thing they do with a title is delegate half of it to three other people, which is what somebody with a title does and what somebody exhausted cannot.\n\nSupport gets better. You have been running on a donation for two years and you never once put it in a spreadsheet.'; } },
    { label: 'Thank them in public. Hire a support agent.', sub: '−Cash. The room stops being a room.', tone: 'neutral',
      effect: (S, fx) => { fx.cash(-9000); fx.rep(12); fx.focus(-4);
        return 'The thank-you post is warm and true and gets a lot of replies. The agent answers faster than any person ever did and is never once wrong about the flags.\n\nThe forum is quieter after that in a way nobody can quite point at, and the recipes page stops growing.'; } },
    { label: 'Write to them as a person. No offer.', sub: '−Focus. Ask what they want, not what you need.', tone: 'good',
      effect: (S, fx) => { fx.focus(-10); fx.rep(16); fx.insight(24);
        return 'You ask what they actually want, and it is not money: it is for the issue templates to stop wasting their evening and for somebody else to own the release notes.\n\nBoth are a day of work. They stay for another four years, and on the day you finally meet them you recognise the handle before the face.'; } },
  ] },

{ id: 'e16_dev_flag', kind: 'crisis', act: [1, 2], weight: 10, once: true,
  when: (S) => catIs(S, 'devtools') && S.stats.featuresShipped > 5,
  title: 'The Flag Does The Opposite',
  body: (S) => `\`--safe\` does not do what it says. It has never done what it says. Under one specific combination it skips the check it is named after, and it has been that way since the second week.

Four thousand scripts in the world pass \`--safe\`. Some of them are in CI pipelines at companies that have never emailed you. A few are almost certainly in places where the check mattered.

The fix is twelve characters. The disclosure is the hard part, and the honest version of it is that this has been true for a very long time.`,
  choices: [
    { label: 'Full disclosure. Advisory, dates, everything.', sub: '−reputation this week. Every user can act.', tone: 'good',
      effect: (S, fx) => { fx.code(-15); fx.focus(-14); fx.rep(-12); fx.debt(-12); fx.flag('dev_disclosed');
        const p = prod(S); if (p) { p.reliability = Math.min(0.99, p.reliability + 0.06); p.sentiment = Math.min(1, p.sentiment + 0.04); }
        return 'The advisory has the version range, the condition, the date it was introduced and a one-line detection script. It is a bad day.\n\nIt becomes the document three security teams cite when they choose you the following year, and one of them says the reason out loud: *"they told us before we asked."*'; } },
    { label: 'Fix it in the next release. Note it in the changelog.', sub: 'Quiet, accurate, easy to miss.', tone: 'risky',
      effect: (S, fx) => { fx.code(-10); fx.focus(-4); fx.debt(6);
        if (fx.chance(0.6)) return 'Line forty of the changelog says *"--safe now applies in nested contexts"* and nobody reads line forty, and the world moves on.\n\nYou know. It is a small thing to know and it does not get smaller.';
        fx.rep(-34); fx.heat(4);
        return 'Somebody diffs the release, works out what the line means, and posts the timeline: introduced, known, quietly fixed.\n\nThe thread is not about the bug. It is about the changelog line, and the word people keep using is "buried," and it is the correct word.'; } },
    { label: 'Rename the flag. Make it impossible to mean anything else.', sub: '−Code. Break four thousand scripts on purpose.', tone: 'neutral',
      effect: (S, fx) => { fx.code(-30); fx.focus(-10); fx.rep(6); fx.debt(-8);
        const p = prod(S); if (p) p.users *= 0.98;
        return '`--safe` becomes an error with a message that explains itself, and the replacement flag cannot be misread by anybody.\n\nFour thousand pipelines go red on the same morning. Most people fix it in a minute and about forty of them are extremely unhappy in public, and one of them is right that you should have shipped a shim.'; } },
  ] },

// ═══════════════════════════════ B2B ════════════════════════════════════════
// Slow to start, impossible to kill. Everything here is somebody else's
// process happening to you.

{ id: 'e16_b2b_questionnaire', kind: 'crisis', act: [1, 2], weight: 12, once: true,
  when: (S) => catIs(S, 'b2b') && (mrr(S) > 2000 || S.resources.reputation > 40),
  title: 'Three Hundred And Twelve Questions',
  body: (S) => `The deal is agreed. The price is agreed. Their team wants it and has said so in writing.

Procurement sends a spreadsheet with three hundred and twelve questions on it. Question 6 asks for your SOC 2 report. Question 41 asks how many people are on your security team. Question 188 asks for the results of your most recent penetration test, and question 189 asks for the one before that.

You are one person and some agents. Every honest answer is either "not applicable" or a number that is going to end this.

The deal is worth **${money(Math.max(24000, mrr(S) * 4))}** a year.`,
  choices: [
    { label: 'Answer all 312 honestly. Where it is "no", say what you do instead.', sub: '−Focus, −days. Slow and completely straight.', tone: 'good',
      effect: (S, fx) => { fx.focus(-22); fx.days(3); fx.rep(20); fx.insight(20); fx.flag('b2b_honest_questionnaire');
        const p = prod(S); if (p) p.mrr *= 1.12;
        return 'It takes four days and about sixty of the answers are a version of "no, and here is the control that covers it."\n\nTheir security lead calls to say it is the first questionnaire he has read end to end in two years, and signs off. The document becomes a template you send unprompted, and it shortens every deal that follows.'; } },
    { label: 'Buy the compliance. Start SOC 2 this month.', sub: '−Cash, −days. The door opens for everybody after.', tone: 'neutral',
      effect: (S, fx) => { fx.cash(-30000); fx.focus(-14); fx.days(2); fx.rep(14); fx.flag('b2b_soc2');
        const p = prod(S); if (p) { p.mrr *= 1.1; p.churnMonthly = Math.max(0.005, p.churnMonthly * 0.9); }
        return 'The auditor, the tooling and the three months are all more expensive than the deal, and the badge on the pricing page pays for itself within the year.\n\nThe next four questionnaires take an afternoon each. You have bought a key rather than a lock.'; } },
    { label: 'Answer aspirationally. Fix it before anyone checks.', sub: 'Sign now. −alignment with reality.', tone: 'cruel',
      effect: (S, fx) => { fx.cash(12000); fx.rep(-8); fx.debt(16); fx.flag('b2b_overstated');
        const p = prod(S); if (p) p.mrr *= 1.12;
        if (fx.chance(0.45)) { fx.rep(-30); fx.heat(6);
          return 'You sign in a fortnight. The annual review comes round and asks for evidence of the thing you said you had.\n\nThere is a version of this conversation where you get to explain that you were about to build it, and this is not that version. The contract survives. The relationship does not.'; }
        return 'You sign in a fortnight and build the four things you claimed over the following quarter, in order, quietly.\n\nBy the review everything on that spreadsheet is true. Nobody ever knows, and you keep the original answers in a file you do not open.'; } },
  ] },

{ id: 'e16_b2b_champion', kind: 'crisis', act: [2, 3], weight: 11, once: true,
  when: (S) => catIs(S, 'b2b') && mrr(S) > 9000,
  title: 'Your Champion Is Leaving',
  body: (S) => `The person who bought you, defended you in two budget rounds and taught their own team how to use you is leaving for another company.

She tells you before she tells her org, which is a kindness and also a warning. Her replacement starts in six weeks, comes from a competitor's biggest customer, and has opinions.

Everything you know about that account lives in her head and in a shared inbox. Your renewal is in four months. Nobody else there has ever once been in a call with you.`,
  choices: [
    { label: 'Ask her for the map before she goes.', sub: '−Focus. Who matters, who is unconvinced, what they measure.', tone: 'good',
      effect: (S, fx) => { fx.focus(-14); fx.insight(34); fx.rep(10); fx.flag('b2b_mapped_account');
        const p = prod(S); if (p) p.churnMonthly = Math.max(0.005, p.churnMonthly * 0.9);
        return 'She spends an hour on a call she does not owe you and gives you fourteen names, three sceptics and the one number the new director will be measured on.\n\nYou are in front of two of those names before the replacement starts. The renewal is not comfortable and it happens.'; } },
    { label: 'Go wide now. Get into four teams in six weeks.', sub: '−Focus, −days. Stop being one relationship.', tone: 'good',
      effect: (S, fx) => { fx.focus(-20); fx.days(2); fx.rep(14); fx.insight(16);
        const p = prod(S); if (p) { p.churnMonthly = Math.max(0.005, p.churnMonthly * 0.85); p.mrr *= 1.05; }
        return 'Four workshops in six weeks with people who have used the product for a year and never met anybody from it.\n\nThe new director inherits an account where four teams would notice if it went away. That is a different conversation from the one you were going to have.'; } },
    { label: 'Follow her to the new company instead.', sub: 'She will buy you again. The old account is a coin toss.', tone: 'risky',
      effect: (S, fx) => { fx.focus(-10); fx.cash(6000); fx.rep(6);
        if (fx.chance(0.6)) { const p = prod(S); if (p) { p.mrr *= 1.06; p.users *= 0.97; }
          return 'She buys you again within the quarter, faster and at a better price, because she has done the internal work once already.\n\nThe old account renews flat, without enthusiasm, and churns eighteen months later on a spreadsheet you never see.'; }
        const p = prod(S); if (p) { p.mrr *= 0.9; p.churnMonthly = Math.min(0.3, p.churnMonthly * 1.15); }
        return 'The new company has an incumbent and a two-year contract, and she cannot move it for a year.\n\nMeanwhile the replacement runs a vendor review you were not in the room for, and you find out you are on a list by reading it.'; } },
  ] },

{ id: 'e16_b2b_shelfware', kind: 'story', act: [2, 3], weight: 10, once: true,
  when: (S) => catIs(S, 'b2b') && mrr(S) > 12000,
  title: 'Nobody Has Logged In Since March',
  body: (S) => `Your third-largest account renewed without a conversation. The invoice was paid inside a week.

Nobody there has logged in since March.

You know exactly what this is, because everybody who has sold to a large company knows what this is: it is under the threshold that triggers a review, it is in somebody's budget line, and it will keep renewing until a new director does a spend audit and finds it.

Your annual recurring revenue includes this. So does the number in the deck you have been sending investors.`,
  choices: [
    { label: 'Call them and try to make it real.', sub: '−Focus. You may talk yourself out of the renewal.', tone: 'good',
      effect: (S, fx) => { fx.focus(-16); fx.insight(30); fx.rep(12); fx.flag('b2b_called_shelfware');
        const p = prod(S); if (p) p.churnMonthly = Math.max(0.005, p.churnMonthly * 0.94);
        return 'The person who bought it left in the spring and the team that needed it reorganised. You find one group who would use it properly and spend two weeks getting them started.\n\nThe account is worth half as much on the next renewal and it is a real account, and the sentence you can now say to an investor is a true one.'; } },
    { label: 'Leave it. Take the money. It is their choice.', sub: '+Cash. And a number you cannot say out loud.', tone: 'risky',
      effect: (S, fx) => { fx.cash(9000); fx.rep(-6);
        if (fx.chance(0.5)) return 'It renews twice more and then vanishes in a spend audit on a Tuesday, without a conversation, the way it lived.\n\nYou had eighteen months of warning and used none of it.';
        fx.insight(10);
        return 'It renews for three more years. It is the most profitable account you have and you never once speak to anybody there.\n\nWhen a diligence process finally asks about logins per account, you have the answer ready and you have had it ready for a long time.'; } },
    { label: 'Refund the year. Ask them to buy it again when they need it.', sub: '−Cash, −revenue. Nobody in this category does this.', tone: 'good',
      effect: (S, fx) => { fx.cash(-14000); fx.rep(38); fx.influence(6);
        const p = prod(S); if (p) { p.mrr *= 0.95; p.sentiment = Math.min(1, p.sentiment + 0.06); }
        return 'The finance contact reads the email twice and forwards it to their CFO with one line on top: *"this has never happened."*\n\nThey buy it again in the autumn, for more, for a team that needs it. The CFO mentions it at a conference, without naming you, and four people work out who it was.'; } },
  ] },

];
