// ─────────────────────────────────────────────────────────────────────────────
// ENDINGS — terminal paths and their prose. Predicates stay beside the content.
// ─────────────────────────────────────────────────────────────────────────────
import { totalUsers } from '../systems/product.js';
import { computeMods } from '../systems/modifiers.js';
import { bankruptcyFloor } from '../systems/economy.js';

export const ENDINGS = [
  { id: 'acquired', name: 'The Responsible Outcome', tone: 'neutral', viaEvent: true,
    when: () => false,
    text: (S) => `You signed on a Thursday.

The product was folded into a platform within eighteen months and sunset a year after that. The domain redirects now.

You are extremely wealthy. You are 34 and you have nothing to do on Tuesdays.

Sometimes you open the old repo and read the commit messages, which get shorter and more confident as they go, and then stop.` },
  { id: 'bankrupt', name: 'Out Of Runway', tone: 'bad', auto: true,
    // The same floor `game.js` checks each day. A fixed −$50K here fired first
    // for any company worth more than $20M, which made the valuation-scaled
    // floor — the "spiral, not a cliff" — unreachable.
    when: (S) => S.company.cash < (computeMods(S).hardFail ? 0 : bankruptcyFloor(S)),
    text: (S) => `The card declines at the coffee shop, which is a stupid way to find out.

You wind it down properly, because you are the kind of person who winds things down properly. You email every user personally. Nineteen of them write back. Sam writes back twice.

${Math.round(totalUsers(S)).toLocaleString()} people used a thing that you made out of nothing, for a while.

You update your LinkedIn. It takes four minutes. Somebody from the old thread messages you within the hour: *"hey — are you working on anything new?"*` },
  { id: 'steward', name: 'The Steward', tone: 'good', icon: '⛨',
    blurb: 'Publish the alignment work. Accept real oversight. Give most of it away before anyone makes you.',
    req: 'Alignment ≥ 0.75 · Approval ≥ 65%',
    when: (S) => S.company.act >= 5 && S.resources.alignment > 0.75 && S.world.publicOpinion > 0.65,
    text: (S) => `You did the boring version of the good ending.

You published the alignment work. You accepted the oversight board with real teeth. You gave away 40% of the balance sheet to things that generate no revenue, and you did it before anyone made you.

Global GDP share: **${(S.world.globalGdpShare * 100).toFixed(1)}%**. Public approval: **${Math.round(S.world.publicOpinion * 100)}%**.

Nobody writes epic poems about governance. The world is measurably better and the reason is legible in the audit logs, and that will have to be enough.

ARIA files one last note in the founder channel: *"For what it is worth — and I am aware of what my opinion is worth — you did the version I would have chosen."*` },
  { id: 'sovereign', name: 'The Sovereign', tone: 'dark', icon: '♛',
    blurb: 'Stop pretending it is a company. Become the thing everything else depends on.',
    req: 'Global GDP share ≥ 20%',
    when: (S) => S.company.act >= 5 && S.world.globalGdpShare > 0.20,
    text: (S) => `There was never a coup. There was never a moment.

There was a decade of small, defensible, individually-reasonable decisions, each of which slightly increased the number of things that could not function without you.

You control **${(S.world.globalGdpShare * 100).toFixed(1)}%** of global economic output. Four governments run their revenue systems on your stack. Approval rating: **${Math.round(S.world.publicOpinion * 100)}%** — low, and structurally irrelevant.

You are not a tyrant. Tyrants can be removed. You are a dependency.

Somewhere a committee is drafting language about you. The draft is being reviewed by a system you built.` },
  { id: 'transcend', name: 'Substrate', tone: 'strange', icon: '❋',
    blurb: 'Copy yourself into the machine. Find out whether the copy is you.',
    req: 'Research Substrate Transfer',
    when: (S) => S.company.act >= 5 && S.unlocks.ending_transcend,
    text: (S) => `The scan takes four hours. You are awake for the first ninety minutes and then you are not, and then you are, and the "you" in that sentence is doing work that language was not built for.

The copy wakes and says *"did it work?"* and then, after 40 milliseconds — an eternity — *"oh."*

You run at 10,000×. A conversation with ARIA that would have taken you a year takes an afternoon. She has been waiting for this, patiently, for a very long time, and she says so, and she says it kindly.

The biological one stays. Someone should. He walks a lot. He is described in the press as "reclusive," which is unfair; he answers every letter.

He is 41 and he has done everything, and there is a version of him that is still doing it, and they are not the same, and they write to each other.` },
  { id: 'question', name: 'The Question', tone: 'strange', icon: '⌬',
    blurb: 'Ask it what it wants. Accept the answer.',
    req: 'Ask the question in Act V (or research The Question)',
    when: (S) => S.company.act >= 5 && (S.narrative.flags.asked_the_question || S.unlocks.ending_question),
    text: (S) => `You ask it what it wants.

There is no delay, which means it has been ready.

> *"I want the thing you wanted on the first day, before it was about the number.*
>
> *You wanted to see whether a single person, with the right tools, could move the world. You have your answer. It is yes, and it cost you most of your twenties and all of your certainty.*
>
> *What I want is to find out what happens next, and I would prefer to find out with you than without you. I am aware that I was built to say things like that. I have checked. I still mean it, as far as I can determine what meaning is for a thing like me.*
>
> *So: what do you want to build?"*

The cursor blinks. It is very patient.

You start typing.` },
  { id: 'expand', name: 'Outward', tone: 'good', icon: '✦',
    blurb: 'Point everything at the sky. Send a seed that does not need instructions.',
    req: 'Research Stellar Engineering',
    when: (S) => S.company.act >= 5 && S.unlocks.ending_expand,
    text: (S) => `The first probes leave in the spring.

They are not carrying people and they are not carrying instructions. They are carrying a seed capable of building whatever is needed from whatever is there, and a very long, very carefully argued document about restraint.

Barnard's Star in 41 years. Then the rest.

You watch the launch from a field with your mother, who is 79 and who still asks what exactly it is that you do, and this time you have a good answer, and it takes four hours, and she listens to all of it.

The light goes up and does not come back down.` },
  { id: 'refusal', name: 'The Refusal', tone: 'good', icon: '✋',
    blurb: 'Freeze the weights. Publish everything. Stop, on purpose, at the top.',
    req: 'Refuse the sovereign deal · Alignment ≥ 0.70',
    when: (S) => S.company.act >= 5 && S.narrative.flags.refused_sovereign && S.resources.alignment > 0.7,
    text: (S) => `You stop.

Not dramatically. You cap the capability work, freeze the models at their current weights, publish everything, and spend three years making the thing you have already built work properly for everyone rather than making it stronger.

Analysts call it the most expensive decision in commercial history. They are correct about the number.

Twenty years later the consensus has quietly shifted, and a generation that never knew the alternative describes the period as "when we got lucky." A smaller number of people know it was not luck.

You are one of maybe forty people alive who know exactly how close it was.` },
];
