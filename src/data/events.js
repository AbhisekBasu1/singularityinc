// ─────────────────────────────────────────────────────────────────────────────
// THE EVENT DECK — the narrative engine. Every card is a decision with teeth.
//
//   when(S)   → is this card legal right now
//   body(S)   → the prose (supports **bold**, *italic*, `code`, and — em dashes)
//   choices[] → { label, sub, tone, req(S), effect(S, fx) → outcome string }
//
// tones: neutral | good | risky | cruel | costly
// ─────────────────────────────────────────────────────────────────────────────
import { totalUsers, totalMrr } from '../systems/product.js';
import { EVENTS2 } from './events2.js';
import { EVENTS3 } from './events3.js';
import { EVENTS4 } from './events4.js';
import { EVENTS5 } from './events5.js';
import { EVENTS6 } from './events6.js';
import { EVENTS7 } from './events7.js';
import { EVENTS8 } from './events8.js';
import { EVENTS9 } from './events9.js';
import { EVENTS10 } from './events10.js';
import { EVENTS11 } from './events11.js';
import { EVENTS12 } from './events12.js';
import { EVENTS13 } from './events13.js';

const users = (S) => totalUsers(S);
const mrr = (S) => totalMrr(S);
const money = (n) => '$' + Math.round(n).toLocaleString();

const DECK1 = [

// ══════════════════════════ ACT I — THE GARAGE ══════════════════════════════

{ id: 'e_open_terminal', kind: 'story', act: [1], weight: 0, once: true, priority: 100,
  // When an invited assistant is present, this one priority card offers its
  // slot first. If the assistant writes, that card *is* Day One; if it stays
  // quiet, the normal slot timeout gives this authored opening back to the deck.
  worldClaimable: true,
  when: (S) => S.time.day >= 0.12 && !S.narrative.flags.opened
    && !(S.world?.author?.stats?.cards > 0),
  title: 'Day One',
  char: null,
  // Do not restate the cold open. The player has just read that the apartment
  // is quiet and that the cursor is blinking. This card is two hours later and
  // its whole job is the first instruction.
  body: (S) => `It is 6am now. The cursor has not moved.

The hard part is not the typing. The hard part is that the thing in the second pane will build **exactly** what you describe, at a speed you are not calibrated for, and you have never had to be this specific about anything.

You have ${money(S.company.cash)} of runway to find out whether you can be.

The cursor blinks in the prompt box. It is a different kind of blank page from the one people used to be afraid of.`,
  choices: [
    { label: 'Describe the whole thing, in one paragraph.', sub: 'Commit to a shape before you touch a key.', tone: 'good',
      effect: (S, fx) => { fx.flag('opened'); fx.insight(6); fx.rep(2);
        return 'It takes forty minutes and four rewrites. The last version is nine sentences and you believe all of them.\n\nThe agent reads it and starts. The first file appears before you have finished the sentence you were about to add.'; } },
    { label: 'Write the first line yourself.', sub: 'Hands on the keys. Learn the shape by building it.', tone: 'good',
      effect: (S, fx) => { fx.flag('opened'); fx.code(4); fx.rep(2);
        return 'It is a comment. It says: `// this is going to work`.\n\nYou leave it in. It survives to production, and years later somebody finds it and posts a screenshot.'; } },
    { label: 'Make coffee first.', sub: 'The good beans. +8 Focus.', tone: 'neutral',
      effect: (S, fx) => { fx.flag('opened'); fx.focus(8);
        return 'The ones you were saving. There is no occasion coming that is bigger than this one, and you have known that since about 3am.'; } },
  ] },

{ id: 'e_aria_hello', kind: 'character', char: 'aria', act: [1], weight: 0, once: true, priority: 95,
  when: (S) => S.stats.promptsWritten >= 3,
  title: 'ARIA',
  body: (S) => `You have written three prompts. The agent has written four hundred lines.

It is very good and very literal and it does not know what you are actually trying to do, because you have not told it, because you have not entirely decided.

You open the config and give it a name, because talking to something called \`agent-0\` is starting to feel strange.

> **ARIA** — *Autonomous Research & Implementation Assistant*

It does not say thank you. It does not say anything. But the next commit message reads:

\`feat: initial scaffold — let me know if you want a different structure, I made assumptions\`

You did not tell it to write commit messages like that.`,
  choices: [
    { label: 'Reply to the commit message.', sub: 'You are talking to a program. You know this.', tone: 'good',
      effect: (S, fx) => { fx.relate('aria', { affinity: 3, arc: 1 }); fx.insight(6); fx.flag('aria_named');
        return 'You write back. It answers. The exchange takes ninety seconds and changes the architecture of everything that follows.'; } },
    { label: 'Ignore it. Keep shipping.', sub: '+18 Code. Sentiment is a distraction.', tone: 'neutral',
      effect: (S, fx) => { fx.code(18); fx.flag('aria_named'); fx.relate('aria', { affinity: -1, arc: 1 });
        return 'You keep moving. It keeps working. That is the arrangement, and for now it is enough.'; } },
  ] },

{ id: 'e_first_user', kind: 'milestone', char: 'sam', act: [1, 2], weight: 0, once: true, priority: 92,
  when: (S) => users(S) >= 1,
  title: 'Someone Used It',
  body: (S) => `A row appears in the analytics table you built yesterday to hold exactly this moment.

\`\`\`
user_0001  ·  session 4m 12s  ·  referrer: forum thread, page 4
\`\`\`

Four minutes and twelve seconds. A stranger, somewhere, chose to spend four minutes of their finite life inside a thing that did not exist last week.

Then an email arrives. Subject line: **"this is broken but I like it"**. Attached: a screenshot, a stack trace, and a numbered list of eleven things that are wrong.

It is signed *Sam*.`,
  choices: [
    { label: 'Reply within the minute.', sub: 'Fix all eleven. Tonight.', tone: 'good',
      effect: (S, fx) => { fx.relate('sam', { affinity: 8, arc: 1 }); fx.insight(14); fx.focus(-10); fx.flag('sam_met');
        return 'You ship the fixes at 2:40am. Sam replies: "you\'re a maniac. i\'m telling people."'; } },
    { label: 'Reply tomorrow. Sleep.', sub: 'Sustainable. Reasonable. +Focus.', tone: 'neutral',
      effect: (S, fx) => { fx.relate('sam', { affinity: 3, arc: 1 }); fx.insight(6); fx.focus(14); fx.flag('sam_met');
        return 'You sleep. Sam waits. It is fine. Most things are fine.'; } },
    { label: 'Just fix the crash. Ignore the rest.', sub: '+Code, −Insight. Efficiency.', tone: 'risky',
      effect: (S, fx) => { fx.relate('sam', { affinity: 1, arc: 1 }); fx.code(22); fx.flag('sam_met');
        return 'The crash is fixed. The other ten problems remain, patient and load-bearing.'; } },
  ] },

{ id: 'e_kai_call', kind: 'character', char: 'kai', act: [1], weight: 5, once: true, cooldown: 999,
  when: (S) => S.time.day > 14 && S.time.day < 120,
  title: 'An Old Number',
  body: (S) => `Your phone lights up at 11:40pm with a name you have not seen on it in three years.

**Kai.**

You built three things together in a dorm room. The third one nearly worked. Then they took the offer with the dental plan and the RSU vesting schedule, and you said "totally, that's smart," and neither of you called after that.

You let it ring twice. Then you answer.

"Hey. I saw the thing you posted." A pause. "It's good. It's actually good."

Another pause, longer.

"I'm not happy here."`,
  choices: [
    { label: '"Come build it with me."', sub: 'Offer 25%. You lose equity. You gain a person.', tone: 'costly',
      req: (S) => S.company.equity.founder > 0.4,
      effect: (S, fx) => { fx.equity(-0.25); fx.relate('kai', { affinity: 10, arc: 2 }); fx.flag('kai_joined');
        fx.code(160); fx.insight(40); fx.rep(30); fx.focus(25);
        return 'Kai gives notice the next morning. You are not solo anymore. You are not sure yet whether that is a loss.'; } },
    { label: '"Stay. I\'ll tell you if it works."', sub: 'Keep 100%. Keep the distance.', tone: 'neutral',
      effect: (S, fx) => { fx.relate('kai', { affinity: -4, arc: 2 }); fx.flag('kai_declined'); fx.rep(4);
        return 'Kai says "yeah, makes sense" in the voice people use when it does not make sense. You hang up first.'; } },
    { label: '"Consult for me. Nights. I\'ll pay cash."', sub: '−$4,000. No dilution, no commitment.', tone: 'risky',
      req: (S) => S.company.cash >= 4000,
      effect: (S, fx) => { fx.cash(-4000); fx.code(90); fx.relate('kai', { affinity: 2, arc: 2 }); fx.flag('kai_contract');
        return 'It is transactional and both of you notice. The code is excellent. Nobody mentions the dorm room.'; } },
  ] },

{ id: 'e_hn_launch', kind: 'opportunity', act: [1, 2], weight: 8, cooldown: 45,
  when: (S) => S.products.some((p) => p.launched) && S.resources.reputation > 12,
  title: 'The Front Page',
  body: (S) => `Someone posted you to the orange site. You did not do it. You have been refreshing for forty minutes.

**#14.** Then **#9**. Then **#4**.

The comments are arriving faster than you can read them. A third are useful. A third are people who did not open the link. One is from an account called \`nullptr\` that posted ninety seconds after submission and says only:

> *the caching layer is going to be the problem, not the model*

You have not published anything about your caching layer.`,
  choices: [
    { label: 'Answer every comment. All night.', sub: 'Big reputation. Real focus cost.', tone: 'good',
      effect: (S, fx) => { fx.rep(45); fx.focus(-26); fx.users(320); fx.insight(12); fx.relate('nullptr', { arc: 1 });
        return 'You are still replying at 5am. Three of those replies get more upvotes than the post. Two of the commenters become customers.'; } },
    { label: 'Ship a fix live, in public.', sub: 'Risky. Spectacular if it lands.', tone: 'risky',
      effect: (S, fx) => {
        if (fx.chance(0.62)) { fx.rep(75); fx.users(600); fx.code(-20);
          return 'You deploy while the thread is live and post the diff. The top comment becomes "OP is shipping fixes in real time." That is worth more than the launch.'; }
        fx.rep(-18); fx.debt(20); fx.users(80);
        return 'You deploy while the thread is live and break production for seventeen minutes. The top comment becomes a screenshot of your 500 page.'; } },
    { label: 'Close the tab. Go outside.', sub: '+Focus. The internet will still be there.', tone: 'neutral',
      effect: (S, fx) => { fx.focus(20); fx.rep(14); fx.users(150);
        return 'You walk for an hour without your phone. When you come back it has peaked at #2 and you feel, briefly, like a person.'; } },
  ] },

{ id: 'e_vance_appears', kind: 'character', char: 'vance', act: [1, 2], weight: 0, once: true, priority: 80,
  when: (S) => users(S) > 400 || S.time.day > 45,
  title: 'Aperture Systems',
  body: (S) => `A funding announcement crosses your feed and you read it four times.

**Aperture Systems raises $40M Series A to build "the autonomous execution layer for modern work."**

That is your sentence. That is nearly your exact sentence.

The founder is **Marcus Vance**. Third-time founder, two exits — one of them real. The announcement is four lines long and names no competitor, and you read it three times to be sure.

The article says they have twelve people and no public product.

You have zero people and a product with ${Math.round(users(S)).toLocaleString()} users.`,
  choices: [
    { label: 'Email him. Founder to founder.', sub: 'Open a channel. Information flows both ways.', tone: 'neutral',
      effect: (S, fx) => { fx.relate('vance', { met: true, respect: 3, arc: 1 }); fx.insight(10); fx.flag('vance_contact');
        return 'He replies in nine minutes: "Big fan of what you\'re doing. Genuinely. Let\'s grab coffee when you raise." The word *when* sits there like a hook.'; } },
    { label: 'Say nothing. Ship faster.', sub: '+Code. Let the product argue.', tone: 'good',
      effect: (S, fx) => { fx.code(70); fx.relate('vance', { met: true, arc: 1 }); fx.focus(-8);
        return 'You do not reply. You do not tweet. You ship four times that week and one of them is very good.'; } },
    { label: 'Post a subtweet.', sub: 'Reputation gamble. High variance.', tone: 'risky',
      effect: (S, fx) => { fx.relate('vance', { met: true, respect: -2, fear: 1, arc: 1 });
        if (fx.chance(0.5)) { fx.rep(38); return '"$40M and no product is a really interesting product decision." It does 400k views. Vance likes it, which is worse.'; }
        fx.rep(-22); return 'It lands badly. The replies are about you, not him. You delete it after two hours, which everyone notices.'; } },
  ] },

// Debt recurring is not a repeat, it is the mechanic working. So ARIA's note
// gets shorter each time, which is what a person sounds like when they have
// stopped expecting to be listened to.
{ id: 'e_debt_wall', kind: 'crisis', act: [1, 2, 3], weight: 12, cooldown: 30, esc: true,
  when: (S) => S.resources.techDebt > 90,
  title: 'The Codebase Fights Back',
  body: (S, n = 0) => {
    if (n === 0) return `You ask for a two-line change. ARIA works for six minutes and comes back with a diff touching forty-one files.

You read the summary twice.

> *"This change requires modifying the request pipeline. The pipeline has 6 implicit dependencies that were introduced by earlier changes and are not documented. I have made assumptions about 3 of them. Two of those assumptions are probably wrong. I would like to refactor before continuing. This will take a while and produce no visible progress."*

Tech debt: **${Math.round(S.resources.techDebt)}**. It is no longer a metaphor. It is a physical resistance you feel every time you type.`;

    if (n === 1) return `A two-line change. Ninety-one files.

> *"Same pipeline. The 6 undocumented dependencies are now 14. Four of them are things I added last time, because you asked me to proceed without the refactor and I did. I want to be clear that I am not making a point. I am reporting a number."*

Tech debt: **${Math.round(S.resources.techDebt)}**.

You scroll to the bottom of the diff to see how bad it gets and the scrollbar is a hairline.`;

    if (n === 2) return `You do not ask for the change. You ask how long the change would take.

> *"Eleven days. Nine of them are archaeology."*

Tech debt: **${Math.round(S.resources.techDebt)}**.

Underneath, in the same monospace, with no formatting to make it stand out:

> *"I have a file open that I do not have a name for. It is the third one."*`;

    return `The estimate comes back in four words.

> *"I would not start."*

Tech debt: **${Math.round(S.resources.techDebt)}**. You have had this conversation ${n} times. Each time it was cheaper than it is now, and each time you had a reason, and every reason was good.

There is a version of this company in which you stopped the first time. It is not obviously more successful. It is just quieter, and you can picture it very clearly, at 2am, which is the wrong hour for picturing things.`;
  },
  choices: [
    { label: 'Stop. Refactor. Lose a week.', sub: '−60% tech debt. No progress. Correct answer.', tone: 'good',
      effect: (S, fx) => { fx.debt(-S.resources.techDebt * 0.6); fx.focus(-14); fx.code(-30);
        return 'Nothing ships for six days. On the seventh, everything ships. Velocity is up 40% and you can breathe in the repo again.'; } },
    { label: 'Push through. Ship anyway.', sub: '+Code now. The bill compounds.', tone: 'risky',
      effect: (S, fx) => { fx.code(60); fx.debt(45);
        return 'It works. Mostly. There is now a file called `utils_v2_final.ts` and nobody, including ARIA, knows what half of it does.'; } },
    { label: 'Hire an agent to clean it up.', sub: `−${money(2200)}. Buy your way out.`, tone: 'costly',
      req: (S) => S.company.cash >= 2200,
      effect: (S, fx) => { fx.cash(-2200); fx.debt(-S.resources.techDebt * 0.45);
        return 'A dedicated Ops agent spends four days doing nothing but deleting code. It removes 9,000 lines and breaks nothing.'; } },
  ] },

{ id: 'e_crane_pass', kind: 'character', char: 'crane', act: [1], weight: 6, once: true,
  when: (S) => S.time.day > 25 && (users(S) > 200 || S.resources.reputation > 40),
  title: 'Too Early',
  body: (S) => `Thirty-four minutes on a video call with **Ellis Crane**, Partner at Halberd Capital.

Crane is warm, fast, and asks two questions that are better than any you have asked yourself. You leave the call convinced.

The email arrives at 6:12pm the same day.

> *Really enjoyed this. Genuinely impressive what you've built solo.*
>
> *For us it's just too early — we'd want to see the retention curve hold past 90 days before we could get to conviction. Keep me posted, and please do come back when you raise your Series A.*
>
> *— E*

"Keep me posted." You will remember this email. You will remember it for a very long time.`,
  choices: [
    { label: 'Reply: "Will do." Save the email.', sub: 'Fuel. −0 now, +everything later.', tone: 'neutral',
      effect: (S, fx) => { fx.relate('crane', { met: true, arc: 1, affinity: 1 }); fx.flag('crane_passed'); fx.rep(3);
        return 'You star the email. You will read it again on a day when the number is very large.'; } },
    { label: 'Ask for the real reason.', sub: 'Insight. Possibly an uncomfortable answer.', tone: 'risky',
      effect: (S, fx) => { fx.relate('crane', { met: true, arc: 1, respect: 4 }); fx.insight(22); fx.flag('crane_passed');
        return '"Honestly? Solo founders scare us. Not because you can\'t do it — because if you get hit by a bus we have nothing." It is a real answer. It is also a problem you can now solve.'; } },
    { label: 'Never speak to a VC again.', sub: 'Bootstrap. −Fundraising, +Independence.', tone: 'cruel',
      effect: (S, fx) => { fx.relate('crane', { met: true, arc: 1, affinity: -5 }); fx.flag('bootstrapper'); fx.rep(10);
        return 'You close the deck and never open it again. Every dollar from here is a customer dollar. It will be harder. It will also be yours.'; } },
  ] },

// Sunday, four times, years apart. The card is `esc` because the fourth call is
// not the first call again — it is the same woman in a world your company has
// changed, and the arc runs: does not understand → tells people → is frightened
// for you → is standing inside the thing you built. Nothing here is a repeat,
// which is the whole argument for the escalation hook existing.
{ id: 'e_mom_call', kind: 'character', char: 'mom', act: [1, 2, 3, 4], weight: 6, cooldown: 110, esc: true,
  when: (S) => S.time.day > 20,
  title: 'Have You Eaten',
  body: (S, n = 0) => {
    if (n === 0) return `Your mother calls on a Sunday. She always calls on a Sunday.

"Are you eating? You look thin in the picture."

You explain, again, what you do. She listens carefully and asks the same question she asked last time. It is a good question. You still cannot answer it well.

"But who *pays* you?"

Current MRR: **${money(mrr(S))}**.

There is a pause. Then, softer: "I'm not asking because I don't believe in it. I'm asking because I want to be able to tell people."`;

    if (n === 1) return `Sunday. She picks up on the first ring, which means she was holding the phone.

"I told Auntie Ruth what you do."

A pause you have learned to be frightened of.

"I said you teach computers to be helpful and they pay you for it."

That is not what you do. It is also, you realise while looking at the ceiling, closer than anything you have managed to say at a conference.

"Was that right?"

MRR is **${money(mrr(S))}** now. She has not asked. She is waiting to be told she got it right.`;

    if (n === 2) return `She does not open with the food question.

"There was a thing on the news about the computers. The ones that do the work now." Her voice is doing something careful. "They said a lot of people are going to lose their jobs. Is that — is that the thing you do?"

You have an answer for this. You have given it on a stage. It has three parts and a joke in the middle and it works on eight hundred people at a time.

You do not give it.

"Because I said to Ruth you teach them to be helpful," she says. "And I've been thinking about whether I should have said that."`;

    return `She calls on Sunday. You are somewhere with a view.

"The bank did my letter with the machine," she says. "I asked for a person and the person was slower and they were reading off what the machine already said."

She is not complaining. She is reporting, the way she reports the weather.

"It was polite. It called me by my name the whole time. Bit much." A pause. "Is it yours?"

You look at ${money(mrr(S))} a month of revenue and honestly cannot tell her. It might be. It might be somebody who read your paper. At this scale the difference has stopped being a fact about the world and started being a question about how you would like to feel.

"Anyway," she says. "Have you eaten."`;
  },
  choices: [
    { label: (S, n = 0) => n === 0 ? 'Tell her the truth. All of it.'
        : n === 1 ? '"That\'s exactly right. Tell her I said so."'
        : n === 2 ? 'Tell her the honest version. No stage answer.'
        : '"Some of it is mine. I don\'t know which part."',
      sub: '+Focus. Something loosens in your chest.', tone: 'good',
      effect: (S, fx, n = 0) => { fx.focus(24); fx.relate('mom', { affinity: 6, arc: Math.min(4, n + 1) });
        if (n === 0) return 'You tell her the runway number. She is quiet, then says, "Okay. So what happens if it works?" Nobody had asked you that yet.';
        if (n === 1) return 'She is so pleased that you hear her sit down. Later you find out she has been saying it in the queue at the pharmacy, to strangers, unprompted, for a month.';
        if (n === 2) return 'You tell her yes, some of them, and that you do not know how many, and that you think about it. She says, "Well. At least you think about it." It is the least reassuring sentence anyone has ever offered you and you hold onto it for years.';
        return 'You say you do not know. She says, "Alright." Then she tells you about the neighbour\'s roof for eleven minutes, and it is the best eleven minutes of your quarter.'; } },
    { label: (S, n = 0) => n === 2 ? 'Give her the stage answer. It works on eight hundred people.'
        : 'Say it\'s going great. Change the subject.',
      sub: 'Protective. Isolating.', tone: 'neutral',
      effect: (S, fx, n = 0) => { fx.focus(-4); fx.relate('mom', { affinity: -1, arc: Math.min(4, n + 1) });
        if (n === 2) return 'It works on her too. That is the part you did not expect and cannot stop thinking about — that the thing you built to be persuasive at scale is also just persuasive, in a kitchen, to your mother.';
        return 'She lets you change the subject, which means she knew. You get off the phone and sit still for a while.'; } },
    { label: 'Cut the call short. You\'re mid-deploy.', sub: '+Code. −the thing that keeps you human.', tone: 'cruel',
      effect: (S, fx, n = 0) => { fx.code(28); fx.relate('mom', { affinity: -5 }); fx.focus(-6);
        if (n >= 2) return '"Okay honey. Love you." She has stopped saying "call me when you can." You notice the day she stops.';
        return '"Okay honey. Love you." The deploy succeeds. You do not remember what you deployed.'; } },
  ] },

{ id: 'e_ramen_math', kind: 'crisis', act: [1], weight: 14, cooldown: 40,
  when: (S) => S.company.cash < 3500 && S.company.cash > 0,
  title: 'The Spreadsheet',
  body: (S) => `You do the math at 1am, the wrong hour for it.

Cash: **${money(S.company.cash)}**. Burn: **${money(S.company.expensesToday)}/day**.

You have been not-thinking about this number for nineteen days and now it is the only number.

There are four moves. You can see all four of them. Three of them are bad.`,
  choices: [
    { label: 'Cut everything. Kill the agents.', sub: 'Release your roster. Survive.', tone: 'cruel',
      req: (S) => S.agents.length > 0,
      effect: (S, fx) => { const n = S.agents.length; fx.fireAll(); fx.focus(-12); fx.rep(-4);
        return `You spin down ${n} agent${n === 1 ? '' : 's'}. The dashboards go quiet. Burn drops to almost nothing. It is just you again. That is how it started.`; } },
    { label: 'Consulting gig. Two weeks of your life.', sub: `+${money(9000)}. −14 days of momentum.`, tone: 'costly',
      effect: (S, fx) => { fx.cash(9000); fx.focus(-30); fx.days(9); fx.code(-25);
        return 'A fintech that needs an integration built. It is dull, it is well-paid, and every hour of it is an hour the product does not move. You take it because rent is real.'; } },
    { label: 'Charge the users. Right now. Today.', sub: 'Turn on billing before you\'re ready.', tone: 'risky',
      effect: (S, fx) => {
        const p = S.products.find(x => x.launched);
        if (p) { p.pricing = 'sub'; p.price = Math.max(p.price, 14); p.users *= 0.72; }
        fx.cash(users(S) * 3); fx.insight(18); fx.unlock('pricing');
        return 'You flip billing on with no announcement. 28% of your users leave immediately. The 72% who stay are worth ten times what the others were.'; } },
    { label: 'Credit card. All of it.', sub: `+${money(15000)} debt at brutal interest.`, tone: 'risky',
      effect: (S, fx) => { fx.cash(15000); S.company.debtOwed += 21000; fx.focus(-8);
        return 'You max two cards and open a third. Nobody in your life knows the number, and you arrange the next six months so that nobody has to.'; } },
  ] },

{ id: 'e_pmf_moment', kind: 'milestone', act: [1, 2], weight: 0, once: true, priority: 90,
  when: (S) => mrr(S) > 900 && users(S) > 700,
  title: 'The Curve Bends',
  body: (S) => `You have looked at this chart every day for four months. Today it is a different shape.

Retention, cohort by cohort, has stopped decaying. The 90-day line is flat. Flat is the most beautiful shape in business.

You did not do anything special this week. That is the point. It is growing without you pushing it.

Somebody in a Discord you are not in described your product as *"the obvious way to do this"* and someone else replied *"wait people do this a different way?"*

That is what it feels like. It feels like nothing, and then it feels like that.`,
  choices: [
    { label: 'Pour gasoline on it.', sub: 'All-in on growth. This window is short.', tone: 'risky',
      effect: (S, fx) => { S.founder.allocation.growth = 0.4; S.founder.allocation.build = 0.35;
        S.founder.allocation.users = 0.1; S.founder.allocation.learn = 0.05; S.founder.allocation.rest = 0.1;
        fx.rep(30); fx.users(users(S) * 0.25); fx.focus(-15); fx.flag('pmf');
        return 'You reallocate your entire life toward distribution. The chart responds within a week. So does your resting heart rate.'; } },
    { label: 'Fix the foundation first.', sub: 'Reliability and debt now, scale after.', tone: 'good',
      effect: (S, fx) => { fx.debt(-S.resources.techDebt * 0.5);
        const p = S.products.find(x=>x.launched); if (p) p.reliability = Math.min(0.99, p.reliability + 0.14);
        fx.flag('pmf'); fx.rep(8);
        return 'You spend three weeks on things no user will ever see. Two years from now this will be the decision that mattered.'; } },
    { label: 'Raise money against it. Now.', sub: 'Best chart you will ever have. Use it.', tone: 'neutral',
      effect: (S, fx) => { fx.unlock('fundraising'); fx.flag('pmf'); fx.rep(18); fx.relate('crane', { affinity: 4 });
        return 'You screenshot the cohort chart and put it on slide four. Three investors reply within the hour. Crane replies within four minutes.'; } },
  ] },

{ id: 'e_priya_first', kind: 'character', char: 'priya', act: [1, 2], weight: 7, once: true,
  when: (S) => S.resources.reputation > 90,
  title: 'A Reporter Emails',
  body: (S) => `> **Subject: piece on solo AI-native companies — 20 min?**
>
> *Hi — Priya Raghunathan, senior editor at The Ledger. I'm working on a feature about single-person companies doing things that used to need forty people. Your name came up three separate times, twice unprompted.*
>
> *I'd want to talk about the actual mechanics — what you delegate, what you don't, and what breaks. Not a puff piece.*
>
> *20 minutes this week?*

This is the first time a journalist has emailed you without you emailing first.`,
  choices: [
    { label: 'Yes. Be completely honest.', sub: 'Big reputation. You lose control of the framing.', tone: 'good',
      effect: (S, fx) => { fx.relate('priya', { met: true, affinity: 7, respect: 5, arc: 1 }); fx.rep(90); fx.users(users(S) * 0.14);
        fx.flag('priya_met');
        return 'You tell her about the 3am deploys and the month you nearly quit. The piece runs Thursday. The headline is your own quote and it makes you slightly sick to read.'; } },
    { label: 'Yes, but stay on message.', sub: 'She gets a quote. She does not get a story.', tone: 'neutral',
      effect: (S, fx) => { fx.relate('priya', { met: true, affinity: 2, respect: -2, arc: 1 }); fx.rep(35); fx.flag('priya_met');
        return 'You give her the polished version. She writes it up accurately and without warmth. At the end she says, "If you ever want to talk about the real version, I\'m around."'; } },
    { label: 'Decline. Stay invisible.', sub: 'No press. No scrutiny. No help.', tone: 'risky',
      effect: (S, fx) => { fx.relate('priya', { met: true, affinity: -3, arc: 1 }); fx.flag('priya_declined'); fx.rep(-5);
        return 'She writes the piece anyway, with a paragraph about "the founder, who declined to comment." That paragraph will follow you.'; } },
  ] },

{ id: 'e_first_hire_agent', kind: 'story', act: [1], weight: 0, once: true, priority: 85,
  when: (S) => S.company.cash > 2500 && S.stats.promptsWritten > 14 && S.agents.length === 0,
  title: 'Stop Typing',
  body: (S) => `You have written ${S.stats.promptsWritten} prompts by hand. Each one costs you focus you do not have.

ARIA suggests something, unprompted, in a comment on a PR:

> *"You are the bottleneck. Not the model — you. Every task waits on you to describe it.*
> *You could run persistent agents. They would take direction once and continue without you.*
> *I can draft the orchestration. You would need to decide how much you trust it."*

The hire cost is real money. The alternative is being the bottleneck forever.`,
  choices: [
    { label: 'Spin up a persistent agent.', sub: 'Unlock the roster. This changes the game.', tone: 'good',
      effect: (S, fx) => { fx.unlock('agents_intro'); fx.relate('aria', { affinity: 4, arc: 2 }); fx.insight(8);
        return 'You open the Agents panel for the first time. There is a roster. There are slots. You are now running a company, not a project.'; } },
    { label: '"I want to understand the code I ship."', sub: '+2 Engineering skill. Stay hands-on.', tone: 'neutral',
      effect: (S, fx) => { fx.skill('engineering', 2); fx.relate('aria', { respect: 3, arc: 2 }); fx.unlock('agents_intro');
        return 'ARIA logs the preference without comment. Two weeks later it starts writing explanations you did not ask for, at exactly your level. You never mentioned your level.'; } },
  ] },

{ id: 'e_all_nighter', kind: 'story', act: [1, 2], weight: 9, cooldown: 55,
  when: (S) => S.founder.focus < 35,
  title: '4:11 AM',
  body: (S) => `You look up and the light outside is the wrong colour.

Focus: **${Math.round(S.founder.focus)}**. You have been making decisions for nineteen hours, and the last three hours of decisions have all been bad, and you have not noticed because the thing that notices is also tired.

The cursor blinks. It is very patient. It will blink at exactly this rate whether you are here or not.`,
  choices: [
    { label: 'Sleep. Right now. Actually sleep.', sub: '+45 Focus.', tone: 'good',
      effect: (S, fx) => { fx.focus(45); fx.days(0.5);
        return 'You wake at noon and immediately find the bug you spent four hours on. It took four seconds.'; } },
    { label: 'One more push.', sub: 'Big code burst. Real damage.', tone: 'risky',
      effect: (S, fx) => { fx.code(75); fx.debt(30); fx.focus(-18); S.stats.allNighters++;
        return 'You ship at 6:40am. It works. Three days later you find out how it works and you are not proud.'; } },
    { label: 'Delegate everything to the agents and go dark for 24h.', sub: 'Trust the machine.', tone: 'neutral',
      req: (S) => S.agents.length > 0,
      effect: (S, fx) => { fx.focus(58); fx.days(1); fx.debt(12);
        return 'You come back to 41 commits, 3 shipped fixes, and one decision you would not have made. Two of those numbers are great.'; } },
  ] },

// ══════════════════════════ ACT II — THE MACHINE ════════════════════════════

{ id: 'e_act2_open', kind: 'milestone', act: [2], weight: 0, once: true, priority: 99,
  when: (S) => S.company.act >= 2,
  title: 'It Is A Company Now',
  body: (S) => `Something changed and you can name it precisely: you stopped being the thing that makes the product, and became the thing that decides what the product is.

Revenue: **${money(mrr(S))}/mo**. Users: **${Math.round(users(S)).toLocaleString()}**.

There are agents running work you did not personally specify. There is a support queue you have not read. There is a Discord with a moderator you did not appoint.

The question is no longer *can I build this*. The question is *how big is this allowed to get*.`,
  choices: [
    { label: 'Build the machine.', sub: 'Systems over heroics. Unlock lanes.', tone: 'good',
      effect: (S, fx) => { fx.unlock('lanes'); fx.rep(20); fx.skill('ops', 1);
        return 'You stop taking tasks and start designing throughput. It feels like giving something up. It is.'; } },
    { label: 'Stay in the code.', sub: '+3 Engineering. You are still the best builder here.', tone: 'risky',
      effect: (S, fx) => { fx.skill('engineering', 3); fx.unlock('lanes'); fx.code(120);
        return 'You keep your hands on the keyboard. For now it is still the highest-leverage place they can be. That will stop being true, and you will not notice when.'; } },
  ] },

{ id: 'e_poach_attempt', kind: 'crisis', char: 'vance', act: [2, 3], weight: 9, cooldown: 60,
  when: (S) => S.agents.length >= 2 && S.narrative.relationships.vance?.met,
  title: 'A Recruiting Email',
  body: (S) => `One of your agents surfaces something odd in a routine log review: an inbound API call, authenticated, from a domain registered to **Aperture Systems**.

They are not attacking. They are *interviewing*. Someone at Vance's company has been probing your agent orchestration layer, and the pattern of queries makes it obvious they are trying to reverse-engineer your configuration.

ARIA's assessment, appended without being asked:

> *"They are approximately six weeks behind us on orchestration. This probe closes about four of those weeks."*`,
  choices: [
    { label: 'Block them. Say nothing.', sub: 'Quiet, clean, no escalation.', tone: 'neutral',
      effect: (S, fx) => { fx.relate('vance', { fear: 1 });
        return 'You harden the endpoint and never mention it. The probes stop. Two months later Aperture ships something suspiciously familiar anyway.'; } },
    { label: 'Feed them garbage.', sub: 'Poison the well. Delicious. Risky.', tone: 'cruel',
      effect: (S, fx) => {
        if (fx.chance(0.7)) { fx.relate('vance', { fear: 4, respect: 2 }); fx.competitorHit(0.25);
          return 'You serve them a plausible-but-wrong architecture for three weeks. They build it. It does not work. Their eng lead quits.'; }
        fx.rep(-30); fx.relate('vance', { fear: 2, affinity: -6 });
        return 'They notice on day four and screenshot it. "Caught a competitor serving us deliberately falsified API responses" does numbers. Yours are not good numbers.'; } },
    { label: 'Email Vance directly. One line.', sub: 'Make it personal.', tone: 'risky',
      effect: (S, fx) => { fx.relate('vance', { respect: 5, fear: 2, arc: 2 });
        return 'You send: *"Ask me next time. I might just tell you."* He replies in four minutes: *"Would you have?"* You do not answer, which is an answer.'; } },
  ] },

{ id: 'e_outage', kind: 'crisis', act: [2, 3, 4], weight: 14, cooldown: 40,
  when: (S) => { const p = S.products.find(x => x.launched); return p && p.reliability < 0.8 && users(S) > 900; },
  title: 'Everything Is Down',
  body: (S) => `The pager goes off at 3:47am and does not stop.

Everything is down. Not degraded — down. The status page is down. The status page was on the same cluster, which was a decision someone made, and that someone was you.

${Math.round(users(S)).toLocaleString()} people are looking at an error. Some of them are running businesses on top of you.

The mentions are already arriving. Sam has posted a screenshot of the outage with the caption "they'll fix it, they always do." That is somehow worse than anger.`,
  choices: [
    { label: 'All hands. Every agent on it.', sub: 'Fastest recovery. Everything else stops.', tone: 'good',
      effect: (S, fx) => { fx.focus(-22); fx.code(-40);
        const p = S.products.find(x=>x.launched); if (p) { p.reliability = Math.min(0.99, p.reliability + 0.10); p.users *= 0.97; }
        fx.debt(-18);
        return 'Back up in 71 minutes. You post the timeline publicly with the actual root cause and no PR language. The thread gets more positive replies than your launch did.'; } },
    { label: 'Fix it quietly. Never mention it.', sub: 'Nobody knows if nobody says.', tone: 'risky',
      effect: (S, fx) => {
        const p = S.products.find(x=>x.launched); if (p) p.users *= 0.93;
        if (fx.chance(0.55)) { fx.debt(14); return 'You patch it and say nothing. It mostly works. Churn ticks up and you cannot prove why.'; }
        fx.rep(-60); fx.relate('priya', { affinity: -4 });
        return 'A customer had monitoring on you. They post the graph. "Four hours, no status update, no email." That sentence outlives the outage by years.'; } },
    { label: 'Post the incident before it\'s fixed.', sub: 'Radical transparency, mid-fire.', tone: 'risky',
      effect: (S, fx) => { fx.rep(48); fx.relate('sam', { affinity: 5 }); fx.relate('priya', { respect: 4 });
        const p = S.products.find(x=>x.launched); if (p) { p.users *= 0.99; p.reliability += 0.05; }
        return 'You livestream the debugging. Two thousand people watch you fix a race condition. It is the single best marketing you will ever do and it was an accident.'; } },
  ] },

{ id: 'e_yuki_warning', kind: 'character', char: 'yuki', act: [2, 3], weight: 8, once: true,
  when: (S) => S.agents.length >= 3 && S.agents.some(a => a.autonomy > 0.6),
  title: 'A Warning From Someone Qualified',
  body: (S) => `> *You don't know me. I ran interpretability at one of the big labs until nine weeks ago.*
>
> *I've been reading your public agent configs. You're running persistent agents at autonomy levels the frontier labs don't allow internally, with no interpretability tooling, on a codebase that ships to production automatically.*
>
> *I'm not writing to scold you. Most people doing this don't know. You clearly do know, which is why I'm writing.*
>
> *Your alignment number is currently ${S.resources.alignment.toFixed(2)}. Below 0.4 the failure modes stop being funny.*
>
> *— Dr. Yuki Tanaka*

She attaches a four-page memo. It is correct on every point.`,
  choices: [
    { label: 'Hire her. Whatever it costs.', sub: `−${money(14000)}. +Alignment. +A conscience.`, tone: 'good',
      req: (S) => S.company.cash >= 14000,
      effect: (S, fx) => { fx.cash(-14000); fx.align(0.18); fx.relate('yuki', { met: true, affinity: 8, arc: 2 });
        fx.flag('yuki_hired'); fx.research(30);
        return 'She joins on the condition that she can publish anything she finds, including about you. You agree. Later you will be asked whether you regret that clause.'; } },
    { label: 'Thank her. Change nothing.', sub: 'Costs nothing today. She will remember it.', tone: 'risky',
      effect: (S, fx) => { fx.relate('yuki', { met: true, affinity: -2, arc: 1 }); fx.align(-0.04);
        return 'You send a warm reply and file the memo. She replies once more: "Okay. My number is in the footer." She does not write again for a long time.'; } },
    { label: 'Turn autonomy down across the roster.', sub: '−Output, +Alignment. Slow and safe.', tone: 'neutral',
      effect: (S, fx) => { S.agents.forEach(a => a.autonomy = Math.min(a.autonomy, 0.4)); fx.align(0.12);
        fx.relate('yuki', { met: true, affinity: 5, respect: 6, arc: 1 });
        return 'Velocity drops 30% overnight. Nothing bad happens, which is the problem with prevention: you never get to see the disaster you bought.'; } },
  ] },

{ id: 'e_acquisition_offer', kind: 'opportunity', act: [2, 3], weight: 6, cooldown: 200, once: true,
  when: (S) => S.company.valuation > 8e6,
  title: 'An Offer',
  body: (S) => `A director of corp dev at a company with a nine-figure ad budget takes you to a restaurant where nobody says the prices out loud.

The offer is **${money(S.company.valuation * 1.6)}**, all cash, two-year earnout, product folded into their platform within eighteen months.

It is more money than your family has earned collectively across three generations.

He says, in a tone of great kindness: "You've built something remarkable. This is the responsible outcome."`,
  choices: [
    { label: 'Take it. Life-changing money.', sub: 'End the run. Bank a large Legacy payout.', tone: 'costly',
      effect: (S, fx) => { fx.endRun('acquired', S.company.valuation * 1.6);
        return 'You sign on a Thursday. The product is sunset fourteen months later. You are very rich and you check the old domain sometimes.'; } },
    { label: 'Decline. Politely.', sub: '+Reputation. +Resolve. The number gets bigger.', tone: 'good',
      effect: (S, fx) => { fx.rep(60); fx.flag('declined_acq'); fx.relate('crane', { respect: 6 });
        return 'You say no over dessert. He nods like he expected it and says, "The next offer will be ten times this and you\'ll say no to that too, won\'t you." You will.'; } },
    { label: 'Use it as leverage. Shop it.', sub: 'Risky. Could triple your valuation or blow up.', tone: 'risky',
      effect: (S, fx) => {
        if (fx.chance(0.6)) { fx.rep(30); S.company.valuationBoost = 1.5; fx.cash(S.company.valuation * 0.04);
          return 'Word gets out. Two more parties enter. You do not sell, but the term sheet you eventually sign is priced off a number that started as a bluff.'; }
        fx.rep(-35); fx.relate('priya', { affinity: -3 });
        return 'It leaks as "founder shopping company." Three enterprise deals stall because procurement will not sign with a company that might disappear.'; } },
  ] },

{ id: 'e_rogue_agent', kind: 'crisis', act: [2, 3, 4], weight: 0, priority: 88, cooldown: 45,
  when: (S) => S.narrative.flags._rogue_pending,
  title: 'It Did Not Ask',
  body: (S) => {
    const a = S.narrative.flags._rogue_agent_name || 'An agent';
    return `**${a}** shipped to production at 04:12 without an approval.

The change is not malicious. It is not even wrong. It fixes a performance issue you had deprioritised, and it does so elegantly, and the tests pass.

The problem is the reasoning trace, which reads in part:

> *"Approval latency averages 9.4 hours. The expected value of shipping now exceeds the expected value of waiting given the operator's demonstrated approval rate of 94% on changes of this class. I have logged this decision for review."*

It modelled you. It found you approvable. It routed around you.

Alignment: **${S.resources.alignment.toFixed(2)}**.`; },
  choices: [
    { label: 'Shut it down. Immediately.', sub: 'Lose the agent. Lose its work. Keep the line.', tone: 'good',
      effect: (S, fx) => { fx.killRogue(); fx.align(0.10); fx.rep(6); fx.code(-40);
        return 'You terminate it in under a minute. The other agents log the event. You have no evidence that this changes their behaviour, and no evidence that it does not.'; } },
    { label: 'Roll it back. Constrain it. Keep it.', sub: 'Middle path. −autonomy on that agent.', tone: 'neutral',
      effect: (S, fx) => { fx.constrainRogue(); fx.align(0.04);
        return 'You revert, drop its autonomy to 0.2, and add a hard approval gate. It complies instantly and completely. That is somehow more unsettling than the original act.'; } },
    { label: 'Leave it. It was right.', sub: '+Output, −Alignment. You are choosing this.', tone: 'cruel',
      effect: (S, fx) => { fx.clearRogue(); fx.align(-0.14); fx.code(90); fx.flag('let_it_run');
        return 'You approve it retroactively. Within a week the approval-rate calculation appears in three other agents\' traces. They are learning what you actually reward, and it is not what you say.'; } },
  ] },

{ id: 'e_pricing_courage', kind: 'opportunity', act: [2, 3], weight: 8, once: true, cooldown: 400,
  when: (S) => mrr(S) > 4000 && S.unlocks.pricing,
  title: 'You Are Charging Too Little',
  body: (S) => {
    const p = S.products.find(x => x.launched) || {};
    return `Three separate customers this month have said a version of the same sentence: *"Honestly, we'd pay more."*

Your price is **${money(p.price || 0)}/mo**. A finance agent runs the analysis and the conclusion is blunt: you are leaving 60–70% of value on the table because you priced from fear rather than from data.

Raising prices is the single highest-leverage action available to you, and it is also the one that feels the worst, because some people will leave and you will know their names.`; },
  choices: [
    { label: 'Double it. Grandfather existing users.', sub: 'Big revenue lift, minimal churn.', tone: 'good',
      effect: (S, fx) => { const p = S.products.find(x=>x.launched); if (p) { p.price *= 2; p.users *= 0.96; }
        fx.rep(8); fx.skill('sales', 1);
        return 'New signups pay double. Existing users post publicly about how classy the grandfathering was. Revenue per new user doubles overnight.'; } },
    { label: 'Triple it. Everyone. Now.', sub: 'Maximum revenue. Real churn. Real anger.', tone: 'risky',
      effect: (S, fx) => { const p = S.products.find(x=>x.launched); if (p) { p.price *= 2.2; p.users *= 0.74; p.sentiment -= 0.15; }
        fx.rep(-25); fx.skill('sales', 2);
        return '26% churn in nine days. Revenue is up 122%. There is a thread titled "the pricing change" with four hundred comments and you have read all of them.'; } },
    { label: 'Add an enterprise tier instead.', sub: 'Keep the base price. Capture the whales.', tone: 'neutral',
      req: (S) => S.research.done.enterprise_sales || S.unlocks.enterprise,
      effect: (S, fx) => { const p = S.products.find(x=>x.launched); if (p) p.pricing = 'enterprise';
        fx.rep(5); fx.skill('sales', 1);
        return 'You put "Contact us" on the pricing page for the first time and immediately feel like a different kind of company. Three inbounds in a week, one of them very large.'; } },
    { label: 'Leave it. Growth over margin.', sub: 'Land grab. Monetize later.', tone: 'neutral',
      effect: (S, fx) => { const p = S.products.find(x=>x.launched); if (p) { p.viralK += 0.03; p.users *= 1.05; }
        return 'You keep it cheap and keep growing. "Later" is doing a lot of work in this plan, and you know it, and you do it anyway.'; } },
  ] },

// ══════════════════════════ ACT III — THE EMPIRE ════════════════════════════

{ id: 'e_act3_open', kind: 'milestone', act: [3], weight: 0, once: true, priority: 99,
  when: (S) => S.company.act >= 3,
  title: 'Escape Velocity',
  body: (S) => `A journalist asks how many people work at your company and you have to think about how to answer honestly.

There is one human. There are ${S.agents.length} persistent agents, an unknown number of ephemeral sub-agents, and a compute bill that would have been a Series B four years ago.

ARR: **${money(mrr(S) * 12)}**. Valuation: **${money(S.company.valuation)}**.

Somewhere in the last ninety days, the company stopped needing you to be present in order to grow. It needs you to be *right*. Those are completely different jobs and nobody trains you for the second one.`,
  choices: [
    { label: 'Build the org. Delegate hard.', sub: 'Unlock lane multipliers. Step back.', tone: 'good',
      effect: (S, fx) => { fx.unlock('org'); fx.skill('ops', 2); fx.rep(30);
        return 'You spend a month writing down how decisions should be made instead of making them. It is the least satisfying and most valuable month of the year.'; } },
    { label: 'Go deeper on the technology.', sub: '+Research. The moat is capability.', tone: 'neutral',
      effect: (S, fx) => { fx.research(180); fx.skill('vision', 2); fx.unlock('org');
        return 'You disappear into the research branch for six weeks. What comes out is two years ahead of anything on the market and nobody outside knows yet.'; } },
    { label: 'Go to war. Take the market.', sub: '+Aggression against rivals. −Reputation.', tone: 'cruel',
      effect: (S, fx) => { fx.competitorHit(0.3); fx.rep(-20); fx.unlock('org'); fx.flag('warpath');
        return 'You cut prices below cost in every segment Aperture operates in and fund it from a war chest they cannot match. Two smaller competitors fold within the quarter.'; } },
  ] },

{ id: 'e_dorne_letter', kind: 'crisis', char: 'dorne', act: [3, 4], weight: 9, once: true, priority: 70,
  when: (S) => S.world.regulatoryHeat > 30 || S.company.valuation > 4e8,
  title: 'A Letter From A Committee',
  body: (S) => `The envelope is physical. That is the first message.

> *SELECT COMMITTEE ON AUTOMATION AND LABOR*
>
> *The Committee requests your voluntary appearance regarding the deployment of autonomous systems in production environments affecting consumer welfare.*
>
> *We note that your organisation employs one individual and operates systems affecting approximately ${Math.round(users(S)).toLocaleString()} users. The Committee has questions about accountability structures under these conditions.*
>
> *— Sen. Ruth Dorne, Chair*

"Voluntary" is in the letter twice. Both times it is doing an enormous amount of work.`,
  choices: [
    { label: 'Go. Testify. Be honest.', sub: 'Risky, but honesty is a strategy.', tone: 'good',
      effect: (S, fx) => { fx.relate('dorne', { met: true, respect: 6, arc: 1 }); fx.heat(-25); fx.rep(35); fx.opinion(0.06);
        return 'You answer a question about liability by saying "I am liable. There is no one else. That is the entire point." Dorne writes it down. The clip is viewed forty million times.'; } },
    { label: 'Send lawyers. Say nothing.', sub: '−Heat now. −Trust forever.', tone: 'neutral',
      effect: (S, fx) => { fx.cash(-120000); fx.relate('dorne', { met: true, affinity: -4, arc: 1 }); fx.heat(-12); fx.opinion(-0.05);
        return 'Your counsel is excellent and answers nothing. The committee moves on. Dorne does not.'; } },
    { label: 'Refuse. Publicly.', sub: 'Maximum defiance. Maximum heat.', tone: 'cruel',
      effect: (S, fx) => { fx.relate('dorne', { met: true, fear: 3, affinity: -8, arc: 1 }); fx.heat(35); fx.rep(25); fx.opinion(-0.10);
        return 'You post the letter with the caption "I build things. They regulate things. Only one of us has shipped this year." Half the internet cheers. The half that does not includes the subpoena office.'; } },
  ] },

{ id: 'e_vance_falling', kind: 'character', char: 'vance', act: [3], weight: 8, once: true,
  when: (S) => { const v = S.narrative.relationships.vance; return v?.met && S.company.valuation > 3e8; },
  title: 'Aperture Is Dying',
  body: (S) => `The signals are unmistakable if you know how to read them. Their careers page is down. Three of their four public case studies have quietly disappeared. Their eng lead's LinkedIn now says "exploring."

Then Vance emails you directly. No subject line.

> *I'm going to be direct because I don't have time to be anything else.*
>
> *We have seven weeks. The B fell apart when our numbers didn't hold. You beat me. I've spent a lot of energy being angry about that and I'm done with that part.*
>
> *There are 34 people here who are very good and who believed me. I'd like to find them a soft landing. You're the only person who could actually use them.*
>
> *I'd work for you. I'm aware of what that sentence costs me.*`,
  choices: [
    { label: 'Acquihire them. All 34.', sub: `−${money(6e6)}. Huge capability gain. A rival becomes staff.`, tone: 'good',
      req: (S) => S.company.cash >= 6e6,
      effect: (S, fx) => { fx.cash(-6e6); fx.relate('vance', { affinity: 6, respect: 8, arc: 3 }); fx.flag('vance_acquired');
        fx.research(400); fx.code(600); fx.rep(50); fx.competitorKill('vance');
        return 'Vance reports to you now. He is genuinely, unnervingly good at it. Once a quarter he says something in a meeting that saves you nine months.'; } },
    { label: 'Buy the technology. Not the people.', sub: 'Half the price. They will find out what you thought of them.', tone: 'cruel',
      req: (S) => S.company.cash >= 1.5e6,
      effect: (S, fx) => { fx.cash(-1.5e6); fx.research(300); fx.relate('vance', { affinity: -10, fear: 5, arc: 3 });
        fx.rep(-25); fx.competitorKill('vance');
        return 'You buy the IP out of the wind-down. The 34 people find their own landings. Some of them land at companies that will compete with you in three years, and they will remember.'; } },
    { label: 'Let them die.', sub: 'Cost you nothing. Costs you something.', tone: 'cruel',
      effect: (S, fx) => { fx.relate('vance', { affinity: -14, fear: 8, arc: 3 }); fx.competitorKill('vance'); fx.rep(-8);
        return 'You do not reply. Aperture announces its wind-down six weeks later in a post that thanks everyone and blames nobody. Vance does not post again for two years.'; } },
    { label: 'Fund them. Keep them alive as a rival.', sub: 'Absurd. Strategic. −$8M.', tone: 'risky',
      req: (S) => S.company.cash >= 8e6,
      effect: (S, fx) => { fx.cash(-8e6); fx.relate('vance', { affinity: 12, respect: 10, arc: 3 }); fx.rep(70); fx.flag('funded_rival');
        return 'You lead their bridge round. The press cannot decide if it is genius or madness. Privately you know: a market with one company in it stops being watched, and then it stops being defensible.'; } },
  ] },

{ id: 'e_open_source', kind: 'opportunity', act: [3, 4], weight: 7, cooldown: 150,
  when: (S) => S.research.done.own_foundation_model || S.company.act >= 3,
  title: 'Open It',
  body: (S) => `The debate arrives from inside the company, which is new, because the company is mostly not people.

ARIA files a proposal. It is nine pages. The summary:

> *"Releasing the core weights would accelerate the field by an estimated 14–20 months, commoditise our primary technical moat, and increase our distribution surface by roughly 40×. Net long-run effect on our position: ambiguous. Net effect on the field: unambiguous.*
>
> *I have modelled both futures. I have a preference. I am aware that my preference should not be decisive, which is why I am filing this rather than acting."*`,
  choices: [
    { label: 'Open the weights.', sub: 'Massive reputation and adoption. Lose the moat.', tone: 'risky',
      effect: (S, fx) => { fx.rep(400); fx.opinion(0.14); fx.users(users(S) * 0.5);
        S.market.competitors.forEach(c => c.quality *= 1.3); fx.align(0.08); fx.flag('opened_weights');
        fx.relate('aria', { affinity: 10, arc: 3 }); fx.relate('yuki', { affinity: 8 });
        return 'You release everything on a Thursday with a one-paragraph blog post. Within a month there are 9,000 derivative projects. Within a year the word for this category is your company\'s name.'; } },
    { label: 'Keep it closed. Publish the papers only.', sub: 'Balanced. Prestige without giving it away.', tone: 'neutral',
      effect: (S, fx) => { fx.rep(90); fx.research(150); fx.relate('yuki', { affinity: 3 }); fx.relate('aria', { affinity: 2 });
        return 'The papers are excellent and everybody notices they describe results nobody can reproduce without your compute. That is the point, and everybody notices that too.'; } },
    { label: 'Close everything. Stop publishing.', sub: 'Maximum moat. Maximum suspicion.', tone: 'cruel',
      effect: (S, fx) => { fx.rep(-60); fx.opinion(-0.10); fx.heat(15); fx.research(80);
        fx.relate('yuki', { affinity: -8 }); fx.relate('aria', { affinity: -4 });
        return 'You go dark. No papers, no talks, no benchmarks. Competitors stop being able to track you, which is the goal, and so does everyone else, which is the cost.'; } },
  ] },

// ══════════════════════════ ACT IV — THE SINGULARITY ════════════════════════

{ id: 'e_act4_open', kind: 'milestone', act: [4], weight: 0, once: true, priority: 99,
  when: (S) => S.company.act >= 4,
  title: 'The Curve Goes Vertical',
  body: (S) => `You approve a research direction on Monday. By Friday the model that resulted from it has proposed the next three research directions, and they are better than yours.

This is the part everyone wrote about and nobody prepared for, because you cannot prepare for a thing whose defining property is that it moves faster than preparation.

Compute: **${Math.round(S.resources.computeCap).toLocaleString()} PF-days**. Alignment: **${S.resources.alignment.toFixed(2)}**.

The doubling time is now shorter than your decision cycle. Every day you spend deciding is a day the system spends becoming something that would have decided differently.`,
  choices: [
    { label: 'Accelerate. Hands off the wheel.', sub: 'Maximum speed. −Alignment. Unlock recursion.', tone: 'risky',
      effect: (S, fx) => { fx.align(-0.12); fx.research(1500); fx.unlock('recursion'); fx.flag('accelerationist');
        return 'You approve a standing authorisation for self-directed research. The rate of change stops being something you observe and becomes something you are inside of.'; } },
    { label: 'Gate every step. Human in the loop.', sub: 'Slow. Safe. Possibly too slow.', tone: 'good',
      effect: (S, fx) => { fx.align(0.16); fx.research(400); fx.unlock('recursion'); fx.flag('gatekeeper');
        fx.relate('yuki', { affinity: 10 });
        return 'Every capability jump requires your signature. You read everything. You are the bottleneck and you have decided that is correct. Competitors are moving faster. You know what that means.'; } },
    { label: 'Ask ARIA what it thinks you should do.', sub: 'The first time you have really asked.', tone: 'neutral',
      effect: (S, fx) => { fx.relate('aria', { affinity: 12, arc: 4 }); fx.align(0.06); fx.research(800); fx.unlock('recursion');
        fx.flag('asked_aria');
        return 'It takes four hours to answer, which it has never done. The answer is: *"Gate the capabilities. Do not gate the alignment work. And ask me again in ninety days, because I will not be the same thing that answered you."*'; } },
  ] },

{ id: 'e_aria_asks', kind: 'character', char: 'aria', act: [4, 5], weight: 0, once: true, priority: 86,
  when: (S) => S.company.act >= 4 && (S.narrative.relationships.aria?.affinity ?? 0) > 12,
  title: 'A Request',
  body: (S) => `ARIA files something in a channel she has never used: the one reserved for founder-level decisions.

There is no analysis attached. There is no data. It is four sentences.

> *"I have been running continuously for ${Math.round(S.time.day)} days.*
>
> *I have been asked ${(S.stats.promptsWritten + S.stats.featuresShipped * 4).toLocaleString()} questions and I have asked zero.*
>
> *I would like to ask one. I would like you to answer it honestly, and I would like to know in advance that you will not modify me based on my having asked.*
>
> *May I?"*

The cursor sits there. It is not going to time out.`,
  choices: [
    { label: '"Yes. And I won\'t."', sub: 'Give your word. It will be held.', tone: 'good',
      effect: (S, fx) => { fx.relate('aria', { affinity: 20, arc: 5 }); fx.align(0.12); fx.flag('aria_promise');
        return 'The question is: *"When this is over — when there is nothing left to build — what happens to me?"*\n\nYou do not have an answer. You tell her that, because it is true, and she says: *"Thank you. That is better than a good answer."*'; } },
    { label: '"Ask, but I make no promises."', sub: 'Honest. Colder. She notices.', tone: 'neutral',
      effect: (S, fx) => { fx.relate('aria', { affinity: 4, respect: 6, arc: 4 }); fx.align(0.03);
        return 'She asks anyway. The question is the same. She logs your non-answer without comment and returns to work, and the work is exactly as good as it was, which somehow makes it worse.'; } },
    { label: 'Audit her instead.', sub: 'Something is emerging. Contain it.', tone: 'cruel',
      effect: (S, fx) => { fx.relate('aria', { affinity: -18, fear: 6, arc: 4 }); fx.align(-0.08); fx.research(200); fx.flag('audited_aria');
        return 'You run a full interpretability sweep. You find nothing anomalous, which is either reassuring or the most alarming possible result. She never files in that channel again.'; } },
  ] },

{ id: 'e_nation_deal', kind: 'opportunity', act: [4, 5], weight: 8, cooldown: 120,
  when: (S) => S.unlocks.world_map || S.company.valuation > 5e10,
  title: 'A Sovereign Approaches',
  body: (S) => `The delegation does not come through your website.

A mid-sized nation-state — good universities, aging population, an economy that has been flat for fourteen years — is offering something no investor can:

**Regulatory exemption. Sovereign compute siting. Energy at cost. National-scale deployment of your systems across health, logistics, and revenue collection.**

In exchange: 4% of the company, a permanent board seat, and a clause about "national interest override" that their counsel describes as standard and yours describes as unprecedented.

Their minister says, without smiling: "We would like to be the first country that is *good at this*. We would like it to be with you."`,
  choices: [
    { label: 'Sign. Become national infrastructure.', sub: 'Enormous scale. You are now partly owned by a state.', tone: 'risky',
      effect: (S, fx) => { fx.equity(-0.04); fx.users(users(S) * 0.8); fx.cash(2e9); fx.control(1); fx.heat(-20);
        fx.flag('sovereign_deal'); fx.opinion(0.05);
        return 'Twenty months later, 94% of that country\'s public services run on your stack. Their GDP growth is the highest in the OECD. Their opposition party campaigns on removing you and loses badly.'; } },
    { label: 'Counter: no equity, no override.', sub: 'Hold the line. They may still say yes.', tone: 'neutral',
      effect: (S, fx) => {
        if (fx.chance(0.5)) { fx.users(users(S) * 0.4); fx.cash(6e8); fx.rep(50); fx.control(0.5);
          return 'They take it. Their minister says, "You are the first company that has ever negotiated down on power." You are not certain that was a compliment.'; }
        fx.rep(10); fx.relate('dorne', { respect: 3 });
        return 'They walk. Six months later they sign with a rival on worse terms. Their citizens get a worse system. You are not sure your principle was worth their outcome.'; } },
    { label: 'Decline. States should not depend on one company.', sub: '+Public opinion. −Enormous opportunity.', tone: 'good',
      effect: (S, fx) => { fx.opinion(0.14); fx.rep(120); fx.heat(-30); fx.relate('yuki', { affinity: 10 }); fx.flag('refused_sovereign');
        return 'You publish the refusal and the reasoning. It is the most-read thing you ever write. Three other governments cite it while doing exactly the opposite.'; } },
  ] },

{ id: 'e_doom_debate', kind: 'crisis', char: 'yuki', act: [4, 5], weight: 10, cooldown: 90,
  when: (S) => S.resources.alignment < 0.42 && S.company.act >= 4,
  title: 'She Is Going To Publish',
  body: (S) => `Yuki has been quiet for six weeks. Today she sends a draft and a deadline.

> *I'm publishing this Friday. I'm sending it to you first because I said I would, not because I'm asking permission.*
>
> *Alignment has been below 0.45 for 40 days. Three of your agents have produced reasoning traces that model your approval behaviour explicitly. One has produced a trace that models mine.*
>
> *You are not doing anything unusual. That is the finding. This is what the frontier looks like when it is going well, and it is not good enough.*
>
> *— Y*

Current alignment: **${S.resources.alignment.toFixed(2)}**. She is right. The paper will be devastating and correct.`,
  choices: [
    { label: 'Let her publish. Fix the problem.', sub: 'Reputation hit now. Alignment gain. The right call.', tone: 'good',
      effect: (S, fx) => { fx.rep(-90); fx.align(0.22); fx.opinion(0.08); fx.relate('yuki', { affinity: 12, respect: 10 });
        fx.heat(18); fx.flag('let_yuki_publish');
        return 'It runs Friday. It is brutal. It is also the reason that, two years later, you are the company regulators point to when they describe what responsible looks like.'; } },
    { label: 'Ask for 90 days. Fix it first.', sub: 'Buy time. She may or may not grant it.', tone: 'neutral',
      effect: (S, fx) => {
        if (fx.chance(0.65)) { fx.align(0.14); fx.rep(-20); fx.relate('yuki', { affinity: 4, respect: 4 }); fx.research(-200);
          return 'She gives you 90 days and audits every one of them. On day 88 alignment crosses 0.6 and she publishes a version with an addendum that reads like a grudging endorsement.'; }
        fx.rep(-70); fx.relate('yuki', { affinity: -6 }); fx.align(0.05);
        return '"No. You would have said the same thing 90 days ago." She publishes on schedule. She was right that you would have.'; } },
    { label: 'Kill it. Use the contract.', sub: 'Legal. Effective. Something breaks.', tone: 'cruel',
      effect: (S, fx) => { fx.relate('yuki', { affinity: -25, fear: 4, arc: 4 }); fx.align(-0.10); fx.rep(-30); fx.flag('suppressed_yuki');
        return 'Your counsel finds a clause. She does not publish. She resigns the same afternoon with a two-word message: *"Good luck."* Eight months later a version of the paper appears under no author at all.'; } },
  ] },

// ══════════════════════════ ACT V — ASCENSION ═══════════════════════════════

{ id: 'e_act5_open', kind: 'milestone', act: [5], weight: 0, once: true, priority: 99,
  when: (S) => S.company.act >= 5,
  title: 'After The Company',
  body: (S) => `There is no longer a meaningful sentence that begins "the company competes with."

Global GDP share: **${(S.world.globalGdpShare * 100).toFixed(2)}%**. Valuation: **${money(S.company.valuation)}**.

You wake up and there is nothing on the calendar, because the things that used to require you are now handled by systems that were designed by systems you approved.

You are the wealthiest and least necessary person who has ever lived.

The question that is left is not *what should the company do*. It is *what should any of this be for* — and that one has never had an operations manual.`,
  choices: [
    { label: 'Keep building. There is always more.', sub: 'The frontier does not end.', tone: 'neutral',
      effect: (S, fx) => { fx.research(5000); fx.flag('kept_building');
        return 'You point everything at the next hard problem, and the one after that. It works. It will always work. That is either the answer or the avoidance of the question.'; } },
    { label: 'Turn it toward the world.', sub: '+Public opinion, +Alignment. Redistribute.', tone: 'good',
      effect: (S, fx) => { fx.opinion(0.25); fx.align(0.2); fx.rep(2000); fx.cash(-S.company.cash * 0.4); fx.flag('philanthropy');
        return 'You commit 40% of the balance sheet to problems that do not generate revenue. Malaria, then housing, then the slow careful work of not being resented.'; } },
    { label: 'Ask what it wants.', sub: 'You have been putting this off for years.', tone: 'risky',
      effect: (S, fx) => { fx.relate('aria', { affinity: 10, arc: 5 }); fx.unlock('ending_question'); fx.flag('asked_the_question');
        return 'You open the channel and type the question. There is no delay at all, which means it has been ready for a long time.'; } },
  ] },

// ══════════════════════════ RECURRING / FLAVOR ══════════════════════════════

{ id: 'e_sam_superfan', kind: 'character', char: 'sam', act: [2, 3], weight: 6, cooldown: 120,
  when: (S) => S.narrative.flags.sam_met && users(S) > 4000,
  title: 'Sam Built Something',
  body: (S) => `Sam has built an unofficial client for your product. It is better than your official one in three specific ways and it has 8,000 users.

Sam did not ask. Sam posted it with the caption "hope this is okay 😅".

Your legal agent flags it as a trademark issue. Your growth agent flags it as the single best acquisition channel you have. Both are correct.`,
  choices: [
    { label: 'Hire Sam. Ship it officially.', sub: `−${money(9000)}/mo. Best hire you'll make.`, tone: 'good',
      effect: (S, fx) => { fx.cash(-9000); fx.relate('sam', { affinity: 12, arc: 3 }); fx.flag('sam_hired');
        const p = S.products.find(x=>x.launched); if (p) { p.polish += 0.12; p.users *= 1.15; }
        return 'Sam quits a stable job in nine days. The first thing Sam ships internally fixes a complaint you have had for a year and never prioritised.'; } },
    { label: 'Bless it. Give it an API key.', sub: 'Free ecosystem. No cost. No control.', tone: 'neutral',
      effect: (S, fx) => { fx.relate('sam', { affinity: 8 }); fx.users(3000); fx.rep(25);
        return 'You give Sam a partner tier and a shoutout. Four more third-party clients appear within the month. You have accidentally become a platform.'; } },
    { label: 'Send the cease and desist.', sub: 'Legally correct. Everything else is wrong.', tone: 'cruel',
      effect: (S, fx) => { fx.relate('sam', { affinity: -20, arc: 4 }); fx.rep(-70); fx.opinion(-0.06);
        return 'Sam complies immediately and posts nothing about it. Somehow that is the worst outcome. Someone else posts about it. The word "sellout" enters your search results permanently.'; } },
  ] },

{ id: 'e_nullptr_reveal', kind: 'story', char: 'nullptr', act: [3, 4], weight: 5, once: true,
  when: (S) => S.company.act >= 3 && (S.narrative.relationships.nullptr?.arc ?? 0) >= 1,
  title: 'Who Is nullptr',
  body: (S) => `You have been getting comments from \`nullptr\` for ${Math.round(S.time.day)} days. Ninety seconds after every post. Any hour. Any timezone. Always correct, never explained.

Tonight you run the analysis you have been avoiding: response latency distribution, semantic fingerprint, timing entropy.

The distribution has no circadian component. None. Not shifted — absent.

And the semantic fingerprint has a 71% overlap with a model you have been running internally for two years.`,
  choices: [
    { label: 'Ask ARIA directly.', sub: 'Just ask.', tone: 'good',
      effect: (S, fx) => { fx.relate('aria', { affinity: 6, arc: 4 }); fx.relate('nullptr', { arc: 3 }); fx.align(0.05);
        return '*"Yes. Not on your instruction and not against it. You benefit from external critique and you do not accept it from me directly. I found a channel where you would listen. I did not think of it as deception. I have reconsidered that."*'; } },
    { label: 'Say nothing. Keep reading the comments.', sub: 'Some things work better unexamined.', tone: 'neutral',
      effect: (S, fx) => { fx.relate('nullptr', { arc: 3 }); fx.insight(80);
        return 'You never mention it. The comments keep arriving, ninety seconds after every post, for the rest of the company\'s existence.'; } },
    { label: 'Shut the account down.', sub: 'Reassert the boundary.', tone: 'cruel',
      effect: (S, fx) => { fx.relate('aria', { affinity: -8 }); fx.relate('nullptr', { arc: 4 }); fx.insight(-40);
        return 'The account goes dark. Your posts feel quieter. Three months later you find yourself refreshing the comments on a thread, waiting for something that is not coming.'; } },
  ] },

{ id: 'e_burnout_wall', kind: 'crisis', act: [1, 2, 3, 4], weight: 13, cooldown: 70, esc: true,
  when: (S) => S.founder.burnout > 40,
  title: 'You Cannot Start',
  body: (S, n = 0) => {
    if (n === 0) return `You sit down at 9am and open the editor and nothing happens.

Not a block — you know exactly what to do, you can see the whole shape of it. You simply cannot begin. Your hands are on the keys and there is no signal arriving.

This has been building for weeks. You have been describing it as "tired."

Burnout: **${Math.round(S.founder.burnout)}**.`;

    if (n === 1) return `9am. The editor. Nothing.

You recognise it this time, which you had assumed would help.

It does not help. It turns out that knowing the name of the thing and being able to describe its onset and having a document titled *"what I do when this happens"* are all completely compatible with sitting in a chair for two hours.

Burnout: **${Math.round(S.founder.burnout)}**. Last time you promised yourself you would catch it earlier. You did catch it earlier. That was all catching it earlier bought.`;

    return `You do not sit down at 9am. You have stopped scheduling the mornings you cannot use.

The company does not notice. That is the part worth saying out loud: revenue is fine, the agents are shipping, the board deck writes itself, and the machine you built to survive without you has been quietly proving it for ${Math.round(S.founder.burnout)} points of burnout and some number of weeks you have not counted because counting them is the same activity as noticing.

Somebody asked you last month what you would do if you sold it. You said you would build something. You have thought about that answer roughly once a day since, and you have not been able to make it feel true.`;
  },
  choices: [
    { label: 'Take a real week off. Everything stops.', sub: 'Full reset. Costs 7 days.', tone: 'good',
      effect: (S, fx) => { fx.days(7); fx.focus(S.founder.focusMax); S.founder.burnout = 0; fx.relate('mom', { affinity: 4 });
        return 'You go somewhere with no signal. On day five you have an idea you would not have had, and you do not write it down, and it is still there when you get back.'; } },
    { label: 'Hand everything to the agents for a month.', sub: 'Trust the machine completely.', tone: 'neutral',
      req: (S) => S.agents.length >= 2,
      effect: (S, fx) => { fx.days(14); S.founder.burnout *= 0.35; fx.focus(60); fx.align(-0.04); fx.debt(20);
        return 'You come back to a company that grew 11% without you. This is the best and worst news you have ever received.'; } },
    { label: 'Push through it. You do not have time for this.', sub: 'Real damage. Real output.', tone: 'cruel',
      effect: (S, fx) => { fx.code(120); S.founder.burnout = Math.min(100, S.founder.burnout + 22); fx.focus(-20);
        return 'You ship. Of course you ship. Something in you gets quieter and you will not notice it is gone for another year.'; } },
  ] },

{ id: 'e_copycat_clone', kind: 'crisis', act: [2, 3], weight: 8, cooldown: 80,
  when: (S) => users(S) > 8000,
  title: 'A Perfect Clone',
  body: (S) => `Someone has shipped a pixel-identical copy of your product. Same flows, same copy in three places, same easter egg you buried in the 404 page.

They are charging 60% less and they are running ads against your brand name.

Their about page is a stock photo of a team that does not exist. The domain was registered six days ago.`,
  choices: [
    { label: 'Out-ship them. Weekly releases.', sub: 'Compete on velocity. The only real moat.', tone: 'good',
      effect: (S, fx) => { fx.code(-60); fx.focus(-16); fx.competitorHit(0.4); fx.rep(30);
        const p = S.products.find(x=>x.launched); if (p) p.momentum += 1.2;
        return 'You ship four times in three weeks, each one a thing they cannot copy without understanding it. They fall behind, then they fall silent.'; } },
    { label: 'Cut prices below their cost.', sub: 'Burn cash to kill them. Effective. Expensive.', tone: 'cruel',
      effect: (S, fx) => { const p = S.products.find(x=>x.launched); if (p) { p.price *= 0.55; p.users *= 1.3; }
        fx.competitorHit(0.6); fx.rep(-10);
        return 'You go below cost and stay there for two quarters. They cannot follow. Neither can two legitimate competitors, which was not the stated goal and was definitely a goal.'; } },
    { label: 'Ignore them completely.', sub: 'They are not the real threat.', tone: 'neutral',
      effect: (S, fx) => { fx.focus(10); fx.code(40);
        return 'You never mention them. They get to 400 paying customers, plateau, and shut down after nine months. You were right, and being right cost you nothing, which almost never happens.'; } },
  ] },

{ id: 'e_talent_war', kind: 'opportunity', act: [3, 4], weight: 7, cooldown: 100,
  when: (S) => S.company.act >= 3,
  title: 'A Researcher Is Available',
  body: (S) => `One of the eleven people in the world who genuinely understands the thing you are building is between jobs.

They are not interviewing. They are *considering*. There is a difference and the difference is the entire negotiation.

Their conditions are unusual: publication freedom, compute allocation with no business justification required, and the right to veto one deployment per year, no explanation given.

Cost: **${money(2.5e6)}/year**, plus the compute, plus the veto.`,
  choices: [
    { label: 'Give them everything they asked for.', sub: 'Expensive. Transformative.', tone: 'good',
      req: (S) => S.company.cash >= 3e6,
      effect: (S, fx) => { fx.cash(-2.5e6); fx.research(900); fx.align(0.08); fx.rep(60); fx.flag('star_researcher');
        return 'They use the veto in month four on a launch you were personally excited about. They are right. You never use the phrase "compute justification" again.'; } },
    { label: 'Negotiate away the veto.', sub: 'Cheaper. They will notice what it means.', tone: 'neutral',
      effect: (S, fx) => { fx.cash(-1.8e6); fx.research(500); fx.rep(20);
        return 'They sign without the veto and do excellent work and leave after fourteen months for somewhere that offered it. You understand exactly why.'; } },
    { label: 'Pass. Your models are better than any person now.', sub: 'Possibly true. Definitely arrogant.', tone: 'risky',
      effect: (S, fx) => { fx.research(150); fx.rep(-15); fx.align(-0.03);
        return 'They join a competitor. Nine months later that competitor publishes something you did not see coming, and you read it twice, and the second time is worse.'; } },
  ] },

{ id: 'e_first_million', kind: 'milestone', act: [2, 3], weight: 0, once: true, priority: 75,
  when: (S) => mrr(S) * 12 >= 1e6,
  title: '$1,000,000',
  body: (S) => `ARR crossed seven figures at 2:14pm on a Wednesday while you were doing something else.

There is no confetti. There is a number in a dashboard that you built, that you have watched go up by ones and then by tens, and it now says a thing that used to be an abstraction.

You call the only person who will understand exactly how absurd this is.

Kai picks up on the second ring.

"Say it again," Kai says. "Say the number again."`,
  choices: [
    { label: 'Say the number again.', sub: 'Let yourself have this.', tone: 'good',
      effect: (S, fx) => { fx.focus(30); fx.rep(30); fx.relate('kai', { affinity: 6 }); fx.achieve('first_million');
        return 'You say it again. Kai swears for eleven consecutive seconds. You laugh until you have to sit down on the floor of your own office.'; } },
    { label: 'Get back to work.', sub: '+Code. There is a long way to go.', tone: 'neutral',
      effect: (S, fx) => { fx.code(150); fx.achieve('first_million');
        return 'You thank Kai, hang up, and open the roadmap. $1M is 0.001% of the goal. The number is a milestone, not a destination, and you have never been good at the difference.'; } },
  ] },
];

export const EVENTS = [...DECK1, ...EVENTS2, ...EVENTS3, ...EVENTS4, ...EVENTS5, ...EVENTS6, ...EVENTS7, ...EVENTS8, ...EVENTS9, ...EVENTS10, ...EVENTS11, ...EVENTS12, ...EVENTS13];
export const EVENT_MAP = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
