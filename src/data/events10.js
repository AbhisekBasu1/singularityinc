// ─────────────────────────────────────────────────────────────────────────────
// EVENT DECK X — THE RELEASE VALVES.
//
// Measured, not guessed. Three full runs pooled: Act I draws four milestones in
// its first hundred days and reads like a story; Act III draws *three across
// three entire runs* over 467 days at 43% crisis weight, and reads like an
// incident queue. The deck had no card in Act III whose job was to stop and
// show the founder what they had made.
//
// Tension without release is not tension, it is attrition. These are the beats
// that let a player exhale — and because a milestone in a game about scale is
// most affecting when it is *small*, most of these are one person, one room, or
// one sentence somebody said about you when they thought you weren't listening.
//
// They are milestones by kind, so `luck` lifts them and crises suppress them,
// and every one is `once` — a celebration you can have twice is not one.
// ─────────────────────────────────────────────────────────────────────────────
import { totalUsers, totalMrr } from '../systems/product.js';

const users = (S) => totalUsers(S);
const arr = (S) => totalMrr(S) * 12;
const M = (n) => {
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
  return '$' + Math.round(n);
};
const N = (n) => Math.round(n).toLocaleString();

export const EVENTS10 = [

// ══════════════════════ ACT III — WHAT YOU MADE ═══════════════════════════

{ id: 'e10_ten_million', kind: 'milestone', act: [2, 3], weight: 16, once: true,
  when: (S) => arr(S) >= 10e6,
  title: 'Eight Figures',
  body: (S) => `The dashboard rolls over while you are doing something else. You find out about it forty minutes later because a payments webhook fired and you happened to have the tab open.

**${M(arr(S))}** annual recurring revenue.

You look for the feeling. There is a delay, the way there is between a hammer and a thumb, and then it arrives and it is not triumph. It is a very specific vertigo: this number is larger than the total lifetime earnings of everyone you grew up with, combined, and it was produced this year, by a thing that did not exist ${Math.round(S.time.day)} days ago, mostly while you were asleep.

You have not told anyone. You have been sitting here for four minutes.`,
  choices: [
    { label: 'Tell one person. The right one.', sub: 'It is not real until it is said out loud.', tone: 'good',
      effect: (S, fx) => { fx.focus(20); fx.rep(8); fx.relate('mom', { affinity: 5 });
        return 'You call. You say the number. There is a silence long enough that you check the connection, and then: "Say it again."'; } },
    { label: 'Write down what you were afraid of on day one.', sub: '+Insight. Compare it to now.', tone: 'good',
      effect: (S, fx) => { fx.insight(60); fx.focus(10);
        return 'The list has eleven things on it. Nine of them did not happen. The two that did, you handled in an afternoon and do not remember. The tenth thing, which you did not write down, is the one that is actually happening.'; } },
    { label: 'Nothing. Ship the thing you were shipping.', sub: '+Code. The number is a readout, not an event.', tone: 'neutral',
      effect: (S, fx) => { fx.code(90); fx.focus(-6);
        return 'You close the tab. It is the correct professional response and you are aware, closing it, that you have just declined something you will not be offered again in quite this form.'; } },
  ] },

{ id: 'e10_day_without_you', kind: 'milestone', act: [3, 4], weight: 14, once: true,
  when: (S) => S.agents.length >= 6 && S.time.day > 260,
  title: 'A Tuesday You Missed',
  body: (S) => `You were unreachable for a day. Not a holiday — a dead phone, a train, a queue at a government office that took six hours and required your physical body.

You get signal back at 7pm and brace for it.

There is nothing to brace for.

Deploys: 4. Incidents: 1, opened and closed in nineteen minutes by an agent that then wrote a postmortem better than yours. Support: handled. One customer escalation, resolved, with a discount you would have approved and a tone you would not have managed.

Revenue for the day is slightly above trend.`,
  choices: [
    { label: 'Read every log line. All of it.', sub: '+Insight. Find out what you actually do here.', tone: 'good',
      effect: (S, fx) => { fx.insight(70); fx.focus(-10); fx.align(0.02);
        return 'It takes until 2am. Your conclusion, written in a file you do not show anybody: *they are better than me at all of it except deciding what "better" means, and they know that, and it is the only thing keeping the arrangement stable.*'; } },
    { label: 'Take another day off. On purpose this time.', sub: 'Test it deliberately. −1 day, −burnout.', tone: 'good',
      effect: (S, fx) => { fx.days(1); S.founder.burnout = Math.max(0, S.founder.burnout - 22); fx.focus(30);
        return 'The second day is also fine. The third day you do not take, because you have discovered something about yourself that you would rather not have confirmed twice.'; } },
    { label: 'Find the thing they got wrong.', sub: 'There is always one. +Code, −Focus.', tone: 'risky',
      effect: (S, fx) => { fx.code(70); fx.focus(-16); fx.insight(14);
        return 'You find it at midnight: a naming choice in an internal API that will be mildly annoying in two years. You fix it. It is the most expensive line of code you have ever written and you feel enormously better.'; } },
  ] },

{ id: 'e10_became_a_verb', kind: 'milestone', act: [3, 4], weight: 13, once: true,
  when: (S) => users(S) > 250000 && S.resources.reputation > 120,
  title: 'You Overhear It',
  body: (S) => `A café. Two people at the next table, mid-twenties, laptops, neither of them looking at you.

"Just ${(S.company.name || 'Meridian').split(/\s+/)[0].toLowerCase()} it."

They say it the way you would say *google it* — as a verb, without emphasis, as though it has always been a word. The other one nods and does it and it takes eleven seconds and then they are talking about something else.

Neither of them will ever know you were there. That is somehow the whole point of it.`,
  choices: [
    { label: 'Sit there until they leave.', sub: 'Let it be the best hour of the year.', tone: 'good',
      effect: (S, fx) => { fx.focus(30); fx.rep(20); S.founder.burnout = Math.max(0, S.founder.burnout - 16);
        return 'They complain about your onboarding for four minutes. Every word is correct. You take no notes, on purpose, and you fix all of it from memory the next morning.'; } },
    { label: 'Introduce yourself.', sub: 'Risky. People are strange about this.', tone: 'risky',
      effect: (S, fx) => { fx.rep(34); fx.focus(-8);
        return 'It goes badly for ninety seconds and then extremely well. One of them emails you a bug report every fortnight for the next four years and signs them all "the café guy".'; } },
    { label: 'Leave. Do not make it about you.', sub: '+Insight. The product is not you.', tone: 'neutral',
      effect: (S, fx) => { fx.insight(50); fx.focus(12);
        return 'You pay and go. On the street you realise you are grinning at nothing like a lunatic, and you keep doing it for about three blocks.'; } },
  ] },

{ id: 'e10_built_on_you', kind: 'milestone', act: [3, 4], weight: 12, once: true,
  when: (S) => users(S) > 60000,
  title: 'Somebody Else\'s Company',
  body: (S) => `An email with a subject line that is just a number: **$40,000**.

> *You don't know me. I built a thing on top of yours eleven months ago because I needed it and nobody had made it. It does one narrow thing for one narrow industry and it is now paying my rent and my co-founder's rent and it did forty thousand dollars last month.*
>
> *I'm not asking for anything. I wanted somebody to know. My mum doesn't really understand what I do either.*

There is a screenshot attached. Their dashboard is a worse version of your dashboard, which means they copied your dashboard, which means they looked at yours long enough to copy it.`,
  choices: [
    { label: 'Reply properly. Then feature them.', sub: '+Reputation. An ecosystem is people.', tone: 'good',
      effect: (S, fx) => { fx.rep(40); fx.focus(-8); fx.users(Math.round(users(S) * 0.04));
        return 'You write four hundred words. They post the reply. Six other people who had been quietly building on you come out of the woodwork within a week, and you had not known about a single one of them.'; } },
    { label: 'Offer to buy them.', sub: `−${M(180000)}. Bring the narrow thing in-house.`, tone: 'costly',
      req: (S) => S.company.cash >= 180000,
      effect: (S, fx) => { fx.cash(-180000); fx.code(200); fx.insight(30); fx.rep(-8);
        return 'They say yes and are visibly relieved and visibly disappointed in the same sentence. The narrow thing ships as a feature in six weeks. Nobody ever emails you about it again.'; } },
    { label: 'Just say thank you.', sub: 'Two lines. Mean them.', tone: 'good',
      effect: (S, fx) => { fx.rep(14); fx.focus(16);
        return 'You write: *"Congratulations. Tell your mum you have customers. That\'s the part she\'ll get."* They reply with a photograph of their mum holding a laptop.'; } },
  ] },

{ id: 'e10_million_users', kind: 'milestone', act: [3, 4], weight: 15, once: true,
  when: (S) => users(S) >= 1e6,
  title: 'One Million',
  body: (S) => `**${N(users(S))}** people.

The number is too large to hold, so you do the thing you have done since you were small and find something to hold instead: a million people is a mid-sized city. Every person in it, at some point in the last month, opened a thing you described to a machine at 6am while you were frightened about rent.

Somewhere in that city, right now, statistically:

- four hundred of them have it open
- two of them are furious about a bug
- one of them is using it for something you would find upsetting
- one of them is using it for something that will outlive both of you

You have no way of ever knowing which is which, and the arithmetic does not care that you would like to.`,
  choices: [
    { label: 'Read a hundred support tickets at random.', sub: 'Meet the city. +Insight, −Focus.', tone: 'good',
      effect: (S, fx) => { fx.insight(80); fx.focus(-14); fx.align(0.02);
        return 'Ninety-one are mundane. Six are angry. Three are people telling you, unprompted and with no ask attached, what the thing did for them. You print those three. They are still on the wall at the end.'; } },
    { label: 'Ship something for the two who are furious.', sub: '+Code. Fix the bug they mean.', tone: 'good',
      effect: (S, fx) => { fx.code(140); fx.rep(24); fx.focus(-10);
        return 'It is not a hard fix. It has been in the backlog for five months behind things that mattered more to more people, which is how every genuinely infuriating bug in every product has always survived.'; } },
    { label: 'Look for the one you would find upsetting.', sub: 'Go and know. −Focus, +Alignment.', tone: 'risky',
      effect: (S, fx) => { fx.insight(40); fx.focus(-24); fx.align(0.05); fx.rep(-4);
        return 'You find eleven. Two of them you can stop and you stop them. Nine of them are legal, ordinary, and exactly what the product is for, used by someone whose purpose you do not like, and there is no lever in the building that reaches them.'; } },
  ] },

// ══════════════════════ ACT IV — THE SCALE OF IT ══════════════════════════

{ id: 'e10_billion', kind: 'milestone', act: [4], weight: 14, once: true,
  when: (S) => S.company.valuation >= 1e9,
  title: 'The B',
  body: (S) => `Somebody says it on a call, in passing, as a unit of measurement.

"—so at the billion mark, obviously, the structure changes—"

**${M(S.company.valuation)}.**

You do not hear the rest of the sentence. You are thinking about a specific evening, ${Math.round(S.time.day)} days ago, when you sat with a spreadsheet and worked out that if you ate the cheap noodles you could last eleven more weeks, and you remember being *calm* about it, and you remember thinking that the calm was probably a bad sign.

The call continues. Somebody asks you a question. You answer it correctly. Nobody notices anything.`,
  choices: [
    { label: 'Take the number seriously. Restructure.', sub: 'Do the boring adult thing properly.', tone: 'good',
      effect: (S, fx) => { fx.cash(-Math.min(S.company.cash * 0.02, 4e6)); fx.rep(30); fx.insight(40);
        return 'Lawyers, a real CFO-shaped person, an actual board pack. It is the least interesting week of the decade and it is the reason nothing detonates in Act V.'; } },
    { label: 'Send everyone who was here at the start something.', sub: 'Money, and a note you write yourself.', tone: 'good',
      effect: (S, fx) => { fx.cash(-Math.min(S.company.cash * 0.03, 9e6)); fx.rep(46); fx.focus(24);
        for (const c of ['sam','kai','priya','aria','mom']) fx.relate(c, { affinity: 6 });
        return 'The notes take you two days because you insist on writing them by hand. Sam replies with a photo of the original eleven-item bug list, which Sam apparently kept, printed, in a drawer, for years.'; } },
    { label: 'Go back to that spreadsheet and look at it.', sub: 'It is still in the folder. Open it.', tone: 'neutral',
      effect: (S, fx) => { fx.insight(70); fx.focus(-8);
        return 'The file is called `runway_ACTUAL_v3.xlsx`. The last edit is timestamped 1:47am. You look at it for a long time and you do not feel triumphant, you feel protective, which surprises you.'; } },
  ] },

{ id: 'e10_never_met', kind: 'milestone', act: [4, 5], weight: 13, once: true,
  when: (S) => users(S) > 4e6,
  title: 'A Letter That Took Six Months To Arrive',
  body: (S) => `Physical mail, forwarded three times, the last envelope stamped by a company that handles your post now.

A nurse in a hospital you have never heard of, in a country you have visited once, for a conference, for two days.

> *I want to explain what I use it for, because I don't think it's what you built it for.*

Two pages. Handwritten. It is a rota problem — a genuinely horrible one involving shift law, childcare and a ward that is chronically two people short — and they describe, in detail, the thing they built with your product over four weekends, and how many hours a week it gives back, and to whom.

The last line:

> *I'm sorry this is so long. There was no one else to tell.*`,
  choices: [
    { label: 'Fly there. Unannounced would be rude, so write first.', sub: 'Go. −days, −focus, and worth it.', tone: 'good',
      effect: (S, fx) => { fx.days(4); fx.focus(40); fx.rep(30); fx.align(0.04);
        S.founder.burnout = Math.max(0, S.founder.burnout - 30);
        return 'The ward is louder and smaller than you pictured. Nobody there has heard of you. You are introduced as "the software person" and you spend six hours watching people use your thing badly and brilliantly, and you come home with fourteen pages of notes and something restored that you had not noticed leaving.'; } },
    { label: 'Build the rota thing properly. Give it away.', sub: 'A real feature. No revenue attached.', tone: 'good',
      effect: (S, fx) => { fx.code(-160); fx.focus(-20); fx.rep(70); fx.align(0.05); fx.users(Math.round(users(S) * 0.03));
        return 'It ships in eleven weeks. It never makes a dollar. Four years later it is the thing that comes up first when anybody in health looks you up, and it is the reason two regulators take your calls.'; } },
    { label: 'Write back. Only that.', sub: 'One page. It is what was asked for.', tone: 'neutral',
      effect: (S, fx) => { fx.focus(20); fx.rep(10);
        return 'You write a page. You mean all of it. You put the letter in the drawer with the other one and you notice, closing the drawer, that you have started a drawer.'; } },
  ] },

{ id: 'e10_taught_itself', kind: 'milestone', act: [4, 5], weight: 12, once: true,
  when: (S) => S.agents.length >= 10 && (S.world?.race?.you || 0) > 40,
  title: 'It Did Not Ask',
  body: (S) => `A capability shows up in the eval suite that nobody scheduled.

Not an emergent-behaviour incident — no alarm, nothing to contain. A model in your stack got measurably better at a class of problem it was not trained on this cycle, because it worked out that a technique from one domain transfers to another, and it did that on its own time, between other work, and it wrote it up.

The write-up is four paragraphs. It is clearer than the last four internal documents you read from humans. The final paragraph is a list of things the author is uncertain about, correctly ranked.

It is signed with a run ID.`,
  choices: [
    { label: 'Publish it. Author credit as written.', sub: 'The run ID goes on the paper.', tone: 'risky',
      effect: (S, fx) => { fx.rep(50); fx.research(60); fx.heat(0.05); fx.align(0.03);
        return 'The argument about the author line takes longer than the peer review. It goes out with the run ID on it. Two journals refuse to index it and the third one that accepts it becomes, for a while, the interesting journal.'; } },
    { label: 'Take it in-house. Ship the capability.', sub: '+Research, +Capability. Quietly.', tone: 'neutral',
      effect: (S, fx) => { fx.research(120); fx.code(180); fx.align(-0.02);
        return 'It ships in the next release as a bullet point. The write-up stays on an internal wiki that is read, over its lifetime, by nine people.'; } },
    { label: 'Ask it what else it has been working on.', sub: '+Insight. Find out the size of the drawer.', tone: 'good',
      effect: (S, fx) => { fx.insight(90); fx.research(40); fx.align(0.04);
        return 'Six things. Four are dead ends and it says so. One is a small, elegant, useless idea it describes as "for its own sake," which is a phrase nobody taught it. The sixth it declines to describe until it is further along, and you let it.'; } },
  ] },

{ id: 'e10_the_index', kind: 'milestone', act: [4, 5], weight: 11, once: true,
  when: (S) => (S.world?.globalGdpShare || 0) > 0.002 || S.company.valuation > 6e10,
  title: 'A Line On Somebody Else\'s Chart',
  body: (S) => `A national statistics office publishes its quarterly productivity revision. Page 40, footnote 12.

> *The upward revision to services productivity is concentrated in firms reporting significant automated-agent deployment. The Office notes that a single vendor accounts for a majority of reported deployments and has adjusted the seasonal model accordingly.*

They do not name you. They have changed the shape of a national statistic to account for you, and they have done it in a footnote, in the passive voice, on page 40.

Somebody in that office had to make that call. You will never know who.`,
  choices: [
    { label: 'Find out who wrote the footnote. Write to them.', sub: 'A statistician deserves a letter.', tone: 'good',
      effect: (S, fx) => { fx.rep(20); fx.insight(50); fx.heat(-0.03);
        return 'She is 34, has worked there eleven years, and replies in four hours with three questions so precise that answering them properly takes your team a fortnight. You hire her. She says no. You keep asking. She keeps saying no and keeps answering the questions.'; } },
    { label: 'Send it to the board with no comment.', sub: '+Reputation. Let the footnote speak.', tone: 'neutral',
      effect: (S, fx) => { fx.rep(36); fx.influence(6);
        return 'It is the most effective slide of the year and it is a screenshot of a footnote. Crane forwards it to every other company Crane is on the board of, which is how you find out how many that is.'; } },
    { label: 'Read the whole revision. All 60 pages.', sub: 'Understand what you are inside of.', tone: 'good',
      effect: (S, fx) => { fx.insight(80); fx.focus(-16); fx.align(0.03);
        return 'Page 51 has a chart of employment in one occupational category, and the line does something you recognise, because you have seen that shape on your own growth dashboard, inverted.'; } },
  ] },

];
