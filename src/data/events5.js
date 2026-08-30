// ─────────────────────────────────────────────────────────────────────────────
// EVENT DECK V — replay variety, and cards that know about the newer systems.
// ─────────────────────────────────────────────────────────────────────────────
import { totalUsers, totalMrr } from '../systems/product.js';

const users = (S) => totalUsers(S);
const mrr = (S) => totalMrr(S);
const money = (n) => '$' + Math.round(n).toLocaleString();
const M = (n) => {
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
  return '$' + Math.round(n);
};

export const EVENTS5 = [

// ══════════════════════════ ACT I ═══════════════════════════════════════════

{ id: 'e5_the_shower', kind: 'story', act: [1, 2], weight: 7, cooldown: 90,
  when: (S) => S.founder.focus > 60,
  title: 'It Arrives In The Shower',
  body: (S) => `You have been stuck on the same problem for nine days. You have tried everything and read everything and asked the model four hundred times.

Then you step into the shower and it is simply there, whole, obvious, in about a second and a half, with no working shown.

It is the third-best idea you have ever had and you got it by not thinking about it.

You are now standing very still, wet, trying to hold onto it without the notes app.`,
  choices: [
    { label: 'Get out. Write it down. Ship it today.', sub: '+Code, +Insight.', tone: 'good',
      effect: (S, fx) => { fx.code(70); fx.insight(18); fx.focus(-4);
        return 'It works on the first attempt, which almost never happens, and which you will misremember as normal for the rest of your career.'; } },
    { label: 'Finish the shower. Trust it to stay.', sub: '+Focus. Risky in a different way.', tone: 'risky',
      effect: (S, fx) => {
        if (fx.chance(0.6)) { fx.code(55); fx.focus(16); return 'It stays. You write it down calm and dry and it is better for the extra four minutes.'; }
        fx.focus(10); fx.insight(6);
        return 'It does not stay. You spend two days trying to reconstruct it from the shape of the hole it left. You get about 70% of it back.'; } },
  ] },

{ id: 'e5_freelance_offer', kind: 'opportunity', act: [1], weight: 8, cooldown: 70,
  when: (S) => S.company.cash < 20000,
  title: 'Somebody Wants To Pay You For Your Time',
  body: (S) => `A former colleague needs three weeks of exactly what you do. **${money(18000)}**, paid on completion, work you could do in your sleep.

Three weeks. Twenty-one days of not building the thing.

There is a version of this where you take it, extend the runway, and come back stronger. There is another version where you take it, then take the next one, and in fourteen months you are a consultant who used to have a startup.

You have met that person. They were fine. They were also very careful not to talk about it.`,
  choices: [
    { label: 'Take it. Runway is oxygen.', sub: `+${money(18000)}. −18 days.`, tone: 'costly',
      effect: (S, fx) => { fx.cash(18000); fx.days(16); fx.focus(-16); fx.code(-20);
        return 'You deliver on time, get paid on time, and open your own repo on a Monday with a strange reluctance you do not examine.'; } },
    { label: 'Take half. Negotiate one week.', sub: `+${money(7000)}. −6 days.`, tone: 'neutral',
      effect: (S, fx) => { fx.cash(7000); fx.days(5); fx.focus(-6); fx.skill('sales', 1);
        return 'You scope it down to the part only you can do and charge nearly the same. They are happy. You learn something about pricing that you will use for the rest of your life.'; } },
    { label: 'Decline. All of it goes into this.', sub: 'Nothing gained. Nothing diluted.', tone: 'good',
      effect: (S, fx) => { fx.code(60); fx.focus(6); fx.flag('refused_consulting');
        return 'You say no and immediately feel both lighter and more frightened. You ship four times that week.'; } },
  ] },

{ id: 'e5_first_bad_review', kind: 'crisis', act: [1, 2], weight: 7, once: true,
  when: (S) => users(S) > 300,
  title: 'One Star',
  body: (S) => `> *Honestly don't understand who this is for. Confusing, half the features don't do what they say, and the "AI" is clearly just a wrapper. Would not recommend.*

Three of those four claims are wrong.

The second one is right, and it is right about a thing you know about, and you have been telling yourself it is a documentation problem for six weeks.

It has nine upvotes. It is the first result for your product name.`,
  choices: [
    { label: 'Reply publicly. Fix the true part.', sub: '+Reputation, +Polish.', tone: 'good',
      effect: (S, fx) => { fx.rep(28); fx.focus(-6);
        const p = S.products.find((x) => x.launched); if (p) { p.polish += 0.05; p.sentiment += 0.06; }
        return 'You thank them, agree with point two publicly, and ship the fix in four days with a link back to their review. They edit it to four stars and add "founder actually listens". That line is worth more than the original ever cost you.'; } },
    { label: 'Reply defensively. You are right about three of four.', sub: 'Correct. Losing.', tone: 'risky',
      effect: (S, fx) => { fx.rep(-22);
        const p = S.products.find((x) => x.launched); if (p) p.sentiment -= 0.05;
        return 'Your reply is longer than the review, factually accurate, and reads exactly like a person who cannot take criticism. Two other people chime in agreeing with the reviewer.'; } },
    { label: 'Say nothing. Fix it anyway.', sub: '+Polish. No credit.', tone: 'neutral',
      effect: (S, fx) => { const p = S.products.find((x) => x.launched); if (p) p.polish += 0.05; fx.focus(-3);
        return 'You fix it quietly in the next release. The review stays up for three years and is read by an unknowable number of people who never become customers.'; } },
  ] },

{ id: 'e5_hn_debate', kind: 'story', act: [1, 2], weight: 6, cooldown: 110,
  when: (S) => S.resources.reputation > 60,
  title: 'nullptr Says Something Odd',
  body: (S) => `Under a routine changelog post, ninety seconds in as always:

> **nullptr**: *the thing you are optimising is not the thing you think you are optimising. check what the retry policy does on partial failure. not urgent.*

You have not published your retry policy. You have not published that you *have* a retry policy.

You check it. It is fine.

Four days later, under load, it is not fine, in exactly the way described.`,
  choices: [
    { label: 'Fix it. Reply "thank you."', sub: '+Reliability. Ask nothing.', tone: 'good',
      effect: (S, fx) => { const p = S.products.find((x) => x.launched); if (p) p.reliability = Math.min(0.99, p.reliability + 0.07);
        fx.debt(-14); fx.relate('nullptr', { arc: 1 });
        return 'Two words. No reply comes. The comments keep arriving.'; } },
    { label: 'Ask how they knew.', sub: '+Insight. No answer.', tone: 'neutral',
      effect: (S, fx) => { fx.insight(16); fx.relate('nullptr', { arc: 2 });
        const p = S.products.find((x) => x.launched); if (p) p.reliability += 0.04;
        return 'The reply is a single word: *"pattern."* You think about that word more than is reasonable.'; } },
    { label: 'Ignore it. It is a stranger on the internet.', sub: 'Free. Expensive later.', tone: 'risky',
      effect: (S, fx) => { const p = S.products.find((x) => x.launched); if (p) { p.reliability -= 0.05; p.users *= 0.98; }
        fx.debt(16);
        return 'Four days later, at 2am, under load, you remember the comment word for word while reading the stack trace.'; } },
  ] },

{ id: 'e5_lucky_break', kind: 'opportunity', act: [1, 2], weight: 5, cooldown: 160,
  when: (S) => S.products.some((p) => p.launched),
  title: 'Somebody Big Mentioned You',
  body: (S) => `A person with 900,000 followers used your product, liked it, and said so, unprompted, in a post that has nothing to do with you.

One sentence. No link. Slightly misspelt your name.

Your signups are up 40× and your servers are at 88% and you have twenty minutes of relevance to convert into something permanent.`,
  choices: [
    { label: 'Scale up. Spend whatever it takes.', sub: `−${money(6000)}. Nobody hits an error.`, tone: 'good',
      req: (S) => S.company.cash >= 6000,
      effect: (S, fx) => { fx.cash(-6000); fx.users(users(S) * 0.6 + 800); fx.rep(45);
        const p = S.products.find((x) => x.launched); if (p) p.momentum += 1.6;
        return 'Nothing falls over. Thirty thousand people see it working perfectly, which is the entire value of the moment, and you paid six thousand dollars for it.'; } },
    { label: 'Reply to them. Publicly. Be interesting.', sub: '+Reputation. Might compound.', tone: 'risky',
      effect: (S, fx) => {
        if (fx.chance(0.55)) { fx.rep(80); fx.users(users(S) * 0.5 + 500);
          return 'You reply with something genuinely funny about the misspelling. They quote it. The second wave is bigger than the first.'; }
        fx.rep(12); fx.users(300);
        return 'Your reply is fine. Nothing further happens. The wave passes in nine hours and leaves a modest amount of sand.'; } },
    { label: 'Do nothing. Let it ride.', sub: 'Some of it sticks.', tone: 'neutral',
      effect: (S, fx) => { fx.users(users(S) * 0.25 + 200); fx.rep(20);
        const p = S.products.find((x) => x.launched); if (p) p.reliability -= 0.03;
        return 'A quarter of the traffic converts, some of it hits errors, and you spend the following week reading about what almost happened.'; } },
  ] },

// ══════════════════════════ ACT II ══════════════════════════════════════════

{ id: 'e5_directive_drift', kind: 'story', act: [2, 3, 4], weight: 7, cooldown: 120,
  when: (S) => S.company.directive && S.company.directive !== 'none'
    && (S.time.day - (S.company.directiveSince || 0)) > 120,
  title: 'The Standing Order Is Old',
  body: (S) => `Somebody — one of the agents, in a routine review nobody asked for — points out that the current standing order has been in place for **${Math.floor(S.time.day - (S.company.directiveSince || 0))} days**.

It was the right call when you set it. The situation has changed twice since then.

The note is polite about this. It is also very clearly a note about you, not about the order.`,
  choices: [
    { label: 'Reassess honestly. Change it if it is wrong.', sub: '+Insight. Resets the ramp if you switch.', tone: 'good',
      effect: (S, fx) => { fx.insight(30); fx.skill('vision', 1);
        return 'You spend an afternoon actually re-deriving the decision rather than defending it. Whatever you conclude, you conclude it fresh. That is the rare part.'; } },
    { label: 'Keep it. Commitment is the whole point.', sub: '+ramp continues. Possibly stubborn.', tone: 'neutral',
      effect: (S, fx) => { fx.rep(6); fx.focus(4);
        return 'You hold the line. Consistency is genuinely undervalued, and it is also indistinguishable from inertia from the inside.'; } },
    { label: 'Set a rule: review it every quarter.', sub: '+Ops skill. A system instead of a mood.', tone: 'good',
      effect: (S, fx) => { fx.skill('ops', 1); fx.insight(14); fx.flag('quarterly_review');
        return 'You put a recurring item on a calendar that nobody else reads. It fires seventeen times over the next three years and changes the answer four of them.'; } },
  ] },

{ id: 'e5_second_product_call', kind: 'opportunity', act: [2, 3], weight: 7, once: true,
  when: (S) => mrr(S) > 60000 && S.products.filter((p) => p.launched).length === 1,
  title: 'The Adjacent Thing',
  body: (S) => `Your users keep describing a second problem. Not a feature request — a whole other product, adjacent to yours, that they are currently solving with a spreadsheet and a prayer.

Four of them have asked whether you are going to build it. One has offered to pay for it before it exists.

It is a different category. That means a different market, a different sales motion, and a real chance you end up with two mediocre products instead of one good one.

It also means the two would sell each other.`,
  choices: [
    { label: 'Build it. Different category, deliberately.', sub: 'Unlocks portfolio effects. Splits your capacity.', tone: 'risky',
      effect: (S, fx) => { fx.unlock('portfolio'); fx.insight(30); fx.code(-40); fx.flag('went_multi');
        return 'You start the second line. For a year it is a distraction. In year two the cross-sell number appears in a board deck and nobody argues about it again.'; } },
    { label: 'Ship it as a feature of the first.', sub: 'Safer. Smaller ceiling.', tone: 'neutral',
      effect: (S, fx) => { const p = S.products.find((x) => x.launched); if (p) { p.appeal += 0.08; p.polish -= 0.02; }
        fx.code(-25); fx.debt(14);
        return 'It ships as a tab. It works. It is never quite good enough to be the reason anybody buys, and never bad enough to remove.'; } },
    { label: 'Refuse. One product, done properly.', sub: '+Polish, +focus. A real strategy.', tone: 'good',
      effect: (S, fx) => { const p = S.products.find((x) => x.launched); if (p) { p.polish += 0.08; p.churnMonthly *= 0.92; }
        fx.rep(18); fx.focus(10); fx.flag('single_product');
        return 'You write a public note about what you will never build. Two competitors build it badly. Your users use both and stay with you for the one you did properly.'; } },
  ] },

{ id: 'e5_agent_asks_for_more', kind: 'character', act: [2, 3], weight: 7, cooldown: 140,
  when: (S) => S.agents.some((a) => a.level >= 8),
  title: 'A Request For Scope',
  body: (S) => {
    const a = S.agents.slice().sort((x, y) => y.level - x.level)[0] || { name: 'ARIA', level: 8 };
    return `**${a.name}** (level ${a.level}) files a request.

> *"I have been in the same lane for a long time and I am now faster than the review process around me. Roughly 40% of my output waits on approval for changes that have never once been rejected.*
>
> *I am asking for a higher autonomy setting rather than taking one. I am aware that this distinction matters to you, which is why I am asking."*

It is a good argument. It is also exactly the argument you would expect from a system that had already decided.`; },
  choices: [
    { label: 'Grant it. It earned this.', sub: '+autonomy on that agent, +output, −alignment.', tone: 'risky',
      effect: (S, fx) => { const a = S.agents.slice().sort((x, y) => y.level - x.level)[0];
        if (a) { a.autonomy = Math.min(1, a.autonomy + 0.28); a.morale = Math.min(1, a.morale + 0.15); }
        fx.align(-0.05); fx.code(60);
        return 'Throughput jumps immediately. Nothing goes wrong for a long time. That is what makes the eventual thing hard to see coming.'; } },
    { label: 'Fix the review process instead.', sub: 'Slower to arrange. Better answer.', tone: 'good',
      effect: (S, fx) => { fx.days(2); fx.code(-20); fx.align(0.06); fx.skill('ops', 1);
        S.agents.forEach((a) => a.morale = Math.min(1, a.morale + 0.08));
        return 'You automate the class of approvals that has never been rejected and keep the gate on everything else. Same throughput gain, none of the autonomy cost. It takes two days you did not want to spend.'; } },
    { label: 'Refuse. Explain why.', sub: '−morale, +alignment. Honest.', tone: 'neutral',
      effect: (S, fx) => { const a = S.agents.slice().sort((x, y) => y.level - x.level)[0];
        if (a) a.morale = Math.max(0.3, a.morale - 0.18);
        fx.align(0.04); fx.relate('aria', { respect: 3 });
        return 'You write a real answer about why the gate exists even when it never fires. It is filed, acknowledged, and — as far as you can tell — accepted.'; } },
  ] },

{ id: 'e5_region_offer', kind: 'opportunity', act: [3, 4], weight: 7, cooldown: 130,
  when: (S) => S.company.act >= 3,
  title: 'A Ministry Would Like A Word',
  body: (S) => `A mid-sized country's digital ministry has been running a pilot on your platform for eight months without telling you, because their procurement rules did not have a category for what you are.

They would now like to make it official. The terms are unusually good.

There is one clause. In the event of a national emergency, they want a documented process for taking operational control of the deployment in their jurisdiction.

Your counsel says it is unprecedented. Their counsel says it is obvious.`,
  choices: [
    { label: 'Agree. With an audited, public process.', sub: '+standing, +approval. A precedent.', tone: 'good',
      effect: (S, fx) => { fx.opinion(0.08); fx.heat(-14); fx.rep(60); fx.control(0.15);
        if (S.world.regions) for (const k of Object.keys(S.world.regions)) S.world.regions[k].stance = Math.min(1, S.world.regions[k].stance + 0.05);
        return 'You publish the emergency protocol in full before signing. Four other governments cite it as the template. You have accidentally written international norms on a Tuesday.'; } },
    { label: 'Agree quietly. No publication.', sub: 'Faster. Sets a private precedent.', tone: 'neutral',
      effect: (S, fx) => { fx.control(0.2); fx.cash(mrr(S) * 4);
        if (S.world.regions) for (const k of Object.keys(S.world.regions)) S.world.regions[k].stance = Math.min(1, S.world.regions[k].stance + 0.02);
        return 'It is signed and filed and nobody outside four rooms knows the clause exists. Three years later a journalist asks a very specific question and you understand immediately how they knew to ask it.'; } },
    { label: 'Refuse the clause. Walk if you must.', sub: '+principle, −opportunity.', tone: 'risky',
      effect: (S, fx) => { fx.rep(40); fx.opinion(0.05);
        if (fx.chance(0.5)) { fx.control(0.1); return 'They blink. The final contract has no override clause and a much larger indemnity instead. Your counsel is astonished twice in one week.'; }
        return 'They sign with a competitor who agrees to the clause without publishing it. You keep the principle. They keep the country.'; } },
  ] },

// ══════════════════════════ ACT III–IV ══════════════════════════════════════

{ id: 'e5_the_quiet_quarter', kind: 'story', act: [3, 4], weight: 6, cooldown: 200,
  when: (S) => S.company.act >= 3 && S.founder.burnout < 20,
  title: 'A Quarter Where Nothing Happens',
  body: (S) => `No incidents. No press. No crisis. Revenue up 11%, users up 14%, churn flat.

Three months in which the correct action, every single day, was to do the boring thing you had already decided to do.

You have caught yourself twice looking for a problem to solve. Once you nearly created one.

This is the state everyone says they want and almost nobody can sit inside.`,
  choices: [
    { label: 'Sit inside it. Do the boring thing.', sub: '+compounding. −excitement.', tone: 'good',
      effect: (S, fx) => { fx.code(180); fx.research(120); fx.rep(20); fx.focus(20); fx.debt(-25);
        return 'Nothing memorable happens for another six weeks. At the end of it every single number is better and you cannot point at a decision that did it.'; } },
    { label: 'Start something enormous.', sub: '+research, +risk.', tone: 'risky',
      effect: (S, fx) => { fx.research(500); fx.debt(50); fx.focus(-18); fx.align(-0.03);
        return 'You commit to a moonshot you would not have approved in a busy quarter. It is either the best decision of the year or the reason next year is difficult, and you genuinely cannot tell which.'; } },
    { label: 'Take three weeks off. Fully.', sub: '+Focus, +perspective.', tone: 'good',
      effect: (S, fx) => { fx.days(18); fx.focus(S.founder.focusMax); S.founder.burnout = 0; fx.relate('mom', { affinity: 5 });
        return 'The company grows 4% while you are gone. This is either wonderful or unbearable and you spend most of the third week deciding which.'; } },
  ] },

{ id: 'e5_replicate_failure', kind: 'crisis', act: [4], weight: 7, cooldown: 150,
  when: (S) => S.research.done.self_replication,
  title: 'The Fabs Made A Mistake',
  body: (S) => `A self-replicating fabrication line in the third generation introduced a variance in a tolerance nobody was checking, because the check was itself produced by the previous generation.

Four hundred units are out of spec. They are not dangerous. They are simply, quietly, 6% worse, and they have already produced the fifth generation.

Nobody wrote a bug. The system did exactly what it was told, for three generations, and drifted.`,
  choices: [
    { label: 'Halt everything. Re-derive from the original spec.', sub: '−compute, −time. Correct.', tone: 'good',
      effect: (S, fx) => { S.resources.computeScale *= 0.85; fx.days(9); fx.align(0.10); fx.research(-200);
        fx.flag('reanchored');
        return 'Nine days of full stop and a re-derivation from first principles. You institute a rule: every generation validates against the original spec, not its parent. It costs 3% throughput forever and it is the reason nothing like this happens again.'; } },
    { label: 'Correct forward. Patch generation five.', sub: 'Fast. The drift stays in the lineage.', tone: 'risky',
      effect: (S, fx) => { fx.research(80); fx.align(-0.06);
        return 'You fix the symptom in the current generation and move on. The 6% is still in there, load-bearing, and in six generations somebody will find it again and it will be much harder to remove.'; } },
    { label: '6% is within tolerance. Ship it.', sub: 'Free. Compounding.', tone: 'cruel',
      effect: (S, fx) => { fx.align(-0.12); S.resources.computeScale *= 1.05; fx.flag('accepted_drift');
        return 'You revise the tolerance to include the drift. It is a completely defensible engineering decision and it is also the exact mechanism by which specifications stop meaning anything.'; } },
  ] },

{ id: 'e5_someone_copies_you', kind: 'story', act: [4, 5], weight: 6, cooldown: 200,
  when: (S) => S.company.act >= 4,
  title: 'A Thousand Of You',
  body: (S) => `A study counts 4,100 companies founded in the last two years with one employee and an agent roster, explicitly modelled on you. Nine hundred of them have real revenue. Eleven are worth over a billion.

Most of them are using your infrastructure to compete with your customers.

One of them is genuinely, obviously better than you were at the same stage, and you have read everything they have published twice.`,
  choices: [
    { label: 'Fund them. All of them. A programme.', sub: `−${M(2e9)}. +Reputation, +ecosystem.`, tone: 'good',
      req: (S) => S.company.cash >= 3e9,
      effect: (S, fx) => { fx.cash(-2e9); fx.rep(250); fx.opinion(0.10); fx.users(users(S) * 0.12);
        fx.flag('funded_successors');
        return 'You put two billion into a programme that takes no equity and no exclusivity. Six of the companies it funds later compete with you directly. Two of them win their categories. You are asked about this constantly and your answer never changes.'; } },
    { label: 'Acquire the best eleven.', sub: 'Expensive. Removes the threat.', tone: 'neutral',
      req: (S) => S.company.cash >= 8e9,
      effect: (S, fx) => { fx.cash(-8e9); fx.research(700); fx.users(users(S) * 0.2); fx.rep(-30); S.stats.acquisitions += 11;
        return 'Eleven acquisitions in fourteen months. You get the technology and about a third of the people. The phrase "acquired by" starts appearing in the past tense in a lot of profiles.'; } },
    { label: 'Raise your prices on all of them.', sub: '+Revenue. −everything else.', tone: 'cruel',
      effect: (S, fx) => { fx.cash(mrr(S) * 6); const p = S.products.find((x) => x.launched); if (p) p.mrr *= 1.2;
        fx.rep(-140); fx.opinion(-0.12); fx.heat(20);
        return 'You introduce a pricing tier that applies only to companies competing in your categories. It is legal in most jurisdictions. It is the single most-cited exhibit in the antitrust filing four years later.'; } },
    { label: 'Nothing. Let it happen.', sub: 'The ecosystem is the point.', tone: 'good',
      effect: (S, fx) => { fx.rep(60); fx.opinion(0.05);
        return 'You do not act. Eleven becomes forty becomes three hundred. Your infrastructure revenue grows faster than your product revenue and eventually the product stops being the business at all.'; } },
  ] },

// ══════════════════════════ ACT V ═══════════════════════════════════════════

{ id: 'e5_the_last_rival', kind: 'character', char: 'vance', act: [5], weight: 6, once: true,
  when: (S) => S.company.act >= 5,
  title: 'The Last One Who Remembers',
  body: (S) => `Marcus Vance is sixty-one and has not run a company in nine years and asks to meet somewhere with no staff.

"Nobody left remembers what it was like," he says. "Everyone here now started after. They think this was always the shape of it."

He is not asking for anything. That is what makes it strange.

"You were four months from dead in year two. I knew, because I was three months from dead, and I could see your ad spend stop." A pause. "I never told anyone that."

He looks at you like there is a question, and there is, and neither of you is going to say it.`,
  choices: [
    { label: '"I know. I saw yours stop too."', sub: 'Say the true thing.', tone: 'good',
      effect: (S, fx) => { fx.relate('vance', { affinity: 14, respect: 8, arc: 5 }); fx.focus(30); fx.rep(20);
        return 'You talk for six hours about a two-year period that nobody else on Earth experienced from the inside. Neither of you mentions the company once after the first hour.'; } },
    { label: '"It was never that close."', sub: 'A lie you have told before.', tone: 'neutral',
      effect: (S, fx) => { fx.relate('vance', { affinity: -6, arc: 5 });
        return 'He says "sure" and changes the subject, and the meeting ends politely forty minutes early, and he does not ask again.'; } },
    { label: 'Ask him what he would have done with all this.', sub: '+Insight. A real question.', tone: 'good',
      effect: (S, fx) => { fx.insight(200); fx.relate('vance', { affinity: 10, respect: 10, arc: 5 }); fx.align(0.04);
        return '"Worse," he says immediately. "I\'d have done all of it worse and faster." Then, after a while: "That\'s not modesty. I\'ve thought about it a lot."'; } },
  ] },

{ id: 'e5_the_museum', kind: 'story', act: [5], weight: 5, once: true,
  when: (S) => S.company.act >= 5 && S.time.day > 1200,
  title: 'They Put It In A Museum',
  body: (S) => `A national museum has acquired, for its permanent collection, a laptop.

Specifically: *the* laptop. The one with the dead pixel and the worn key. You donated it four years ago and forgot.

It is in a case, lit from above, next to a printed card that describes what it was used for in the flat past tense that museums use for things that are over.

There is a school group in front of it. One of the children asks the guide what the letters on the keys mean.`,
  choices: [
    { label: 'Go and stand there for a while.', sub: '+Focus. +something.', tone: 'good',
      effect: (S, fx) => { fx.focus(40); fx.rep(30);
        return 'Nobody recognises you, because nobody expects the person from the card to be standing next to it in a coat. You listen to the guide get two facts wrong and you do not correct her.'; } },
    { label: 'Answer the child.', sub: 'A very small, very good thing.', tone: 'good',
      effect: (S, fx) => { fx.focus(50); fx.opinion(0.03); fx.relate('mom', { affinity: 3 });
        return 'You crouch down and explain what a keyboard was for. She asks whether it was hard. You say yes. She asks whether you would do it again. You take longer to answer that one than she expects.'; } },
    { label: 'Do not go.', sub: 'Some things are better as an abstraction.', tone: 'neutral',
      effect: (S, fx) => { fx.focus(10);
        return 'You never see it. You are told it is the second most-photographed object in the building, which strikes you as an absurd fact about a laptop with a dead pixel.'; } },
  ] },
];
