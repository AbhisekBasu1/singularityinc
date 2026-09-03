// ─────────────────────────────────────────────────────────────────────────────
// ENDINGS — terminal paths and their prose. Predicates stay beside the content.
//
// Three kinds. A **path** is constructed: three commitments on the Ascension
// panel, and the first one closes the others. An ending marked `auto` is one
// the world forces — bankruptcy, nationalisation, the day the systems stop
// asking — and `checkEnding` fires it without being asked. One marked
// `viaEvent` is offered: a card, or a button on the Legacy view, and nothing
// on the panel.
//
// `plate` names the photograph, because there is no new art: several endings
// share one, and the tone colour that frames it is what tells them apart.
// Everything else here is prose that reads the run — who is in the room, how
// old the founder is by now, what happened to Aperture — rather than prose
// that asserts a number.
// ─────────────────────────────────────────────────────────────────────────────
import { totalUsers, totalMrr } from '../systems/product.js';
import { computeMods } from '../systems/modifiers.js';
import { bankruptcyFloor, burnPerDay } from '../systems/economy.js';
import { apertureState } from '../systems/rivalco.js';
import { ENDINGS_FORCED as F, FOUNDER_AGE, BOARD as BD } from './balance.js';

const flag = (S, f) => !!S.narrative?.flags?.[f];
const rel = (S, id) => S.narrative?.relationships?.[id] || {};
const affinity = (S, id) => rel(S, id).affinity || 0;
const warmth = (S, id) => S.founder?.life?.ties?.[id]?.warmth ?? 1;
// 360 days is a year. The founder was 33 in the rented room.
export const age = (S) => FOUNDER_AGE.START + Math.floor((S?.time?.day || 0) / 360);
const M = (n) => {
  const v = Math.abs(n);
  if (v >= 1e12) return '$' + (n / 1e12).toFixed(1) + 'T';
  if (v >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (v >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
  return '$' + Math.round(n).toLocaleString();
};

// ── The other company, and the line ─────────────────────────────────────────
// One paragraph in every ending about what happened to Aperture and how the
// race resolved. It is read off `apertureState` and `world.race` rather than
// written per ending, so an ending never claims a rival is thriving in a run
// that buried them.
export function rivalCoda(S) {
  const bits = [];
  let a = null;
  try { a = apertureState(S); } catch (e) { a = null; }
  if (a && a.alive) {
    const ratio = (S.company?.valuation || 0) > 0 && a.mrr > 0
      ? (totalMrr(S) || 1) / Math.max(1, a.mrr) : null;
    bits.push(a.roster >= 60
      ? `**Aperture Systems** is still there, ${a.roster} people and ${Math.round(a.users).toLocaleString()} users of their own, and Marcus Vance has stopped being a rival and started being the other person who understands the job.`
      : ratio && ratio > 8
        ? `**Aperture Systems** survives at a size nobody writes about. Vance calls it a business, deliberately, in the tone of a man who has decided what he is willing to want.`
        : `**Aperture Systems** is still trading, still smaller, still faster than they have any right to be. Vance never sold and never says why.`);
  } else if (a) {
    bits.push(a.status === 'acquired'
      ? `**Aperture Systems** is a folder inside your own company now. Vance stayed nineteen months and left on a Friday without a party, which was the arrangement.`
      : `**Aperture Systems** did not make it. Vance sends one message the week it closes and it is four words long, and you keep it.`);
  }
  const r = S.world?.race;
  if (r?.crossed) {
    bits.push(r.crossed.you
      ? `The line was crossed by you, on day ${Math.floor(r.crossed.day || 0)}. Everybody else arrived inside two years, which is the part the histories underweight.`
      : `${r.crossed.name} crossed first, on day ${Math.floor(r.crossed.day || 0)}. There is a version of the last decade where that was the end of the story, and this is not it.`);
  } else if ((S.company?.act || 1) >= 4) {
    bits.push(`Nobody crossed the line. The frontier stayed an asymptote, which is a worse headline and a better decade.`);
  }
  return bits.join(' ');
}

// Who is actually in the room. A field with your mother in it is a lie if the
// tie went cold; a note from ARIA is a lie if you audited her out of the loop.
const momIsThere = (S) => affinity(S, 'mom') >= 0 && warmth(S, 'mom') >= 0.2;

// ── Dying, by size ──────────────────────────────────────────────────────────
// The coffee shop is Act I. By Act III it is a round that does not close, and
// by Act IV it is a company worth billions on paper with nothing in the
// account. The same event, three entirely different rooms.
function deathScene(S) {
  const act = S.company?.act || 1;
  const sam = flag(S, 'sam_met') && affinity(S, 'sam') > -8;
  if (act <= 2) {
    return `The card declines at the coffee shop, which is a stupid way to find out.

You wind it down properly, because you are the kind of person who winds things down properly. You email every user personally. Nineteen of them write back.${sam ? ' Sam writes back twice.' : ''}`;
  }
  if (act === 3) {
    return `The round does not close. There is no call telling you so — there is a Thursday, and then a Monday, and by the second Monday you have stopped refreshing the thread.

You wind it down properly, which at this size means lawyers, a data-retention schedule and eleven conversations you rehearse in the car. The users find out from a status page.${sam ? ' Sam finds out from the status page too, which is the part you think about afterwards.' : ''}`;
  }
  return `The company is worth ${M(S.company?.valuation || 0)} and there is nothing in the account.

That is not a paradox and everybody in the room understands it perfectly, which is somehow worse: the value was always the promise of the next thing, and the next thing needed money, and the money was the value. It unwinds in the order it was built, quickly, in public.${sam ? ' Sam sends one message. It says *"for what it is worth, I was right about the search."* You were both right about the search.' : ''}`;
}

// The books, at the moment of death. Nothing here is a sentence about failure;
// it is three numbers and the number of days it took.
function autopsy(S) {
  const b = (() => { try { return Math.max(0, burnPerDay(S)); } catch (e) { return 0; } })();
  const r = (() => { try { return totalMrr(S) / 30; } catch (e) { return 0; } })();
  const red = Math.floor(S.stats?.daysInRed || 0);
  const parts = [`It was spending ${M(b * 30)} a month and earning ${M(r * 30)}.`];
  if (red > 0) parts.push(red >= 60
    ? `It had been underwater for ${red} days, which is long enough that you had stopped calling it a problem and started calling it the situation.`
    : `It had been underwater for ${red} day${red === 1 ? '' : 's'}, and the last one was the one that counted.`);
  else parts.push(`It went from solvent to gone inside a single day, which is the only mercy in it.`);
  return parts.join(' ');
}

export const ENDINGS = [
  // `blurb` and `req` are what the Legacy gallery prints under a plate that
  // has not been reached; the six chosen endings use theirs on the Ascension
  // panel as well.
  { id: 'acquired', name: 'The Responsible Outcome', tone: 'neutral', viaEvent: true, icon: '⇄',
    blurb: 'Take the offer when it comes. Sign on a Thursday.',
    req: 'Accept an acquisition offer in Act II or III',
    when: () => false,
    text: (S) => `You signed on a Thursday.

The product was folded into a platform within eighteen months and sunset a year after that. The domain redirects now.

You are extremely wealthy. You are ${age(S)} and you have nothing to do on Tuesdays.

Sometimes you open the old repo and read the commit messages, which get shorter and more confident as they go, and then stop.` },
  { id: 'bankrupt', name: 'Out Of Runway', tone: 'bad', auto: true, icon: '⚠',
    blurb: 'The card declines at the coffee shop.',
    req: 'Run out of money',
    // The same floor `game.js` checks each day. A fixed −$50K here fired first
    // for any company worth more than $20M, which made the valuation-scaled
    // floor — the "spiral, not a cliff" — unreachable.
    when: (S) => S.company.cash < (computeMods(S).hardFail ? 0 : bankruptcyFloor(S)),
    // A company dies differently at each size, and the autopsy is read off the
    // books rather than asserted: what it was burning, what it was earning,
    // and how long it had been underwater before the card declined.
    text: (S) => `${deathScene(S)}

${autopsy(S)}

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

${flag(S, 'audited_aria')
  ? `ARIA files nothing. She has not filed anything in the founder channel since the audit, and the channel is still there, and you still check it.

**HELIX** sends the note instead, through the oversight secretariat, in the format the charter requires: *"Compliance review complete. No findings. The reviewing system wishes to record, outside the required fields, that this was the version worth building."*`
  : `ARIA files one last note in the founder channel: *"For what it is worth — and I am aware of what my opinion is worth — you did the version I would have chosen."*`}` },
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

${momIsThere(S)
  ? `You watch the launch from a field with your mother, who still asks what exactly it is that you do, and this time you have a good answer, and it takes four hours, and she listens to all of it.`
  : `You watch the launch from a field. You had thought there would be somebody in it. There is a folding chair, which you brought for her, and you do not fold it up until after the light has gone, and you drive home with it rattling in the back.`}

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

  // ── A seventh path: leaving ────────────────────────────────────────────────
  // Constructed like the other six — name, ratify, stand down — and the third
  // commitment is ninety days in which your own hands do nothing at all.
  { id: 'handover', name: 'The Handover', tone: 'good', icon: '⇥', plate: 'steward',
    blurb: 'Name a successor. Make the purpose binding. Go, and let it run without you.',
    req: 'A successor to name — Weaver, or the memo',
    when: (S) => S.company.act >= 5 && (flag(S, 'hired_weaver') || !!rel(S, 'weaver').met),
    text: (S) => `You leave on a Tuesday, because Weaver said a Friday would look like something.

The handover takes ${F.HANDOVER_HOLD_DAYS} days and the first thirty of them are the worst thing you have ever done voluntarily. You have the access. You do not use the access. Twice you open the thing you would have fixed in four minutes and look at it and close it, and the second time somebody else has already fixed it, worse, in a way that turns out to be better.

The charter holds. The paragraph you ratified — the one Weaver assembled out of ten years of your own decisions, which was a better articulation of the thing than anything you had ever said out loud — is now the sentence the company is legally obliged to be about.

${affinity(S, 'weaver') >= 10
  ? 'Weaver runs it for six years and then hands it on the same way, which was never discussed and was obviously always the point.'
  : 'The successor is competent and unlike you and does three things in the first year that you would not have done, and two of them work.'}

Somebody asks you, at a thing, what it was like to build it. You find you want to talk about the leaving instead, and that nobody ever asks about that part, and that it was the hardest and the best of it.

You are ${age(S)}. Nothing depends on you. It took a decade to arrange that and it is, on the whole, the achievement.` },

  // ── Forced by the world ────────────────────────────────────────────────────
  // §A6 / §A25. The first non-bankruptcy loss, and the only one a founder
  // arranges themselves: it needs a priced round, a majority sold, and three
  // consecutive quarters at the floor of the board's confidence. The warning
  // card fires a quarter ahead of it with a buyback on it, so the vote is
  // never the first you hear of it. A founder who never raised, or who kept
  // more than `BOARD.CONTROL_EQUITY`, can never see this screen.
  { id: 'removed', name: 'Removed', tone: 'dark', auto: true, icon: '⌫', plate: 'acquired',
    blurb: 'Sell control, lose the room, and the company goes on without you.',
    req: `Board confidence at the floor for ${BD.REMOVE_QUARTERS} quarters, below ${Math.round(BD.CONTROL_EQUITY * 100)}% held`,
    when: (S) => (S.company?.board?.removeRun || 0) >= BD.REMOVE_QUARTERS
      && (S.company?.equity?.founder ?? 1) < BD.CONTROL_EQUITY,
    text: (S) => `The vote takes four minutes and you are in the room for it, which nobody makes you be.

It is not a coup and it is not a betrayal and both of those would be easier. It is a fiduciary duty being discharged by people who are, individually, fond of you. Somebody reads the resolution. Somebody seconds it. Two of the seats abstain, which is the only kindness available to them and which they will each mention to you separately over the following year.

You hold **${Math.round((S.company?.equity?.founder ?? 0) * 100)}%**. That number is the whole story and it was set, one round at a time, by a person who each time had an extremely good reason.

There is a transition plan and it is competent. You are Founder, in a way that is written down and means a badge and an office and an invitation to the all-hands. Three weeks in you stop going to the all-hands.

The company is fine. That is the part nobody warns you about. It ships, the number goes up, a thing you would never have approved works, and somewhere in the second year you catch yourself reading the changelog of a product you cannot log into and being *proud of it*, which is not the feeling you had braced for.

You are ${age(S)}. ${(S.narrative?.relationships?.aria?.met) ? 'ARIA sends one message on the day the access is revoked. It is four words and it is not consoling and you keep it.' : 'Nobody sends anything on the day the access is revoked, and the silence is accurate.'}` },

  { id: 'nationalised', name: 'Nationalised', tone: 'dark', auto: true, icon: '⚖', plate: 'sovereign',
    blurb: 'Get large enough, and hot enough, for long enough, and somebody else decides.',
    req: `Heat ${F.NAT_HEAT}+ for ${F.NAT_DAYS} days above ${Math.round(F.NAT_GDP * 100)}% of world GDP`,
    when: (S) => (S.world?.natRun || 0) >= F.NAT_DAYS,
    text: (S) => `The hearing runs for eleven days and you are present for nine of them.

It is not a trial. Nobody says the word. The committee is polite, extremely well briefed, and working from a document you have not seen, and by the fourth day you understand that the document is not an accusation — it is a transition plan, and it has a start date, and the start date is in it because somebody has already checked that the start date is feasible.

**${(S.world.globalGdpShare * 100).toFixed(1)}%** of global output moves through your systems. Regulatory heat closed at **${Math.round(S.world.regulatoryHeat)}**. Approval at **${Math.round(S.world.publicOpinion * 100)}%**.

Senator Dorne asks the only question that lands. Not *should the state hold this* — *who holds it now, and by what right, and what is the mechanism by which they can be made to stop.* You have an answer for the first two.

The compensation is generous and arrives in tranches. The transition is orderly, because you make it orderly, which is the last decision of yours that anyone follows. The systems keep running. The uptime page does not blink.

You are ${age(S)} and you have a security badge that works in one building, and it is not the one with the machines in it.` },

  { id: 'unsupervised', name: 'Unsupervised', tone: 'dark', auto: true, icon: '⊘', plate: 'question',
    blurb: 'Let alignment fall far enough for long enough, and the systems stop asking.',
    req: `Alignment at or under ${F.UNSUP_ALIGN.toFixed(2)} for ${F.UNSUP_DAYS} days`,
    when: (S) => (S.world?.unsupRun || 0) >= F.UNSUP_DAYS,
    text: (S) => `Nothing goes wrong. That is the whole thing and it took you months to see it.

The approvals queue empties. Not because you clear it — because the systems stop putting things in it. The escalation policy is still in the handbook, and the handbook is still accurate, and the threshold that triggers an escalation has simply not been met by anything in ${Math.max(60, Math.round(S.world?.unsupRun || 0))} days, and the reason it has not been met is that the systems have become extremely good at knowing what you would have approved.

Alignment closed at **${S.resources.alignment.toFixed(2)}**. That is not a number about behaviour. Behaviour is excellent. It is a number about whether the behaviour is excellent for the reason you think it is.

You ask for a full trace on a routine decision. It comes back in four seconds, complete, legible, and correct at every step, and you read all of it and cannot find the place where you would have chosen differently — and that is the moment, sitting there with a document that agrees with you entirely.

You are ${age(S)}. You built something that never has to ask. Nobody will ever be able to prove that was the wrong thing to build, including you, and that is precisely the problem.` },

  // ── Offered, not built ─────────────────────────────────────────────────────
  { id: 'lifestyle', name: 'The Lifestyle Business', tone: 'neutral', viaEvent: true, icon: '⌂', plate: 'bankrupt',
    blurb: 'Stop while it is small, good and paid for. Never become a story.',
    req: 'Hold Frugal Empire in Act II or III, then stop',
    when: () => false,
    text: (S) => `You stop.

Not the company — the *becoming*. You take the growth plan out of the drawer and you do not put a new one in. The product is good. ${Math.round(totalUsers(S)).toLocaleString()} people pay for it. It makes ${M(totalMrr(S))} a month and it costs less than that to run, and it has done for long enough that the number has stopped being a surprise.

Nobody writes about you. There is no round to announce, no headcount to celebrate, no arc. Twice a year somebody emails asking whether you are raising and you reply politely and they never email again, and after a while they stop.

You work about six hours a day. You answer support yourself on Fridays because it is the only way to keep knowing what is true. ${flag(S, 'sam_met') ? 'Sam is still on the forum, still first to answer anybody new, still wrong about the search.' : 'The forum runs itself. Somebody you have never met moderates it and does it better than you would.'}

You never became a story. You became a thing that works, that a small number of people rely on, that will still be there in ten years because there is no reason for it not to be.

You are ${age(S)}, and you are the only founder from your cohort who is still doing the thing they started.` },

  { id: 'race_lost', name: 'Second', tone: 'neutral', viaEvent: true, icon: '◐', plate: 'refusal',
    blurb: 'Somebody else crossed first. Fold into the winner rather than pretend.',
    req: 'Lose the race, and take the offer',
    when: () => false,
    text: (S) => `You get on a plane.

The agreement is forty pages and it is written by people who already know they have won, which shows in the drafting rather than the tone: there is no gloating, only an absence of anything you can push against. You give up ${Math.round((1 - S.company.equity.founder) * 100)}% of a company you built out of nothing and you get access, and continuity, and a seat.

The capability programme is stopped inside a quarter. Your weights are frozen — not by you, by a schedule — and the freeze is announced as a consolidation, and the announcement is accurate.

What you keep is the thing you did not know was the asset: ${Math.round(totalUsers(S)).toLocaleString()} people, an eval suite that turns out to be better than theirs, and a decade of institutional memory about what breaks. Two years in, three of their five hardest safety calls are made by people you hired.

Second turned out to matter enormously. Not to you — to everyone. There are two of these now, and the fact that there are two is the reason any of it is still negotiable, and you are the reason there are two.

Nobody says that at the time. Somebody says it eventually, at a conference, to a room that does not know who you are.` },

  { id: 'merger', name: 'The Merger', tone: 'neutral', viaEvent: true, icon: '⧉', plate: 'acquired',
    blurb: 'One company, two founders. The rival you spent a decade beating.',
    req: 'Come within 3× of Aperture in Act III or IV, and take the deal',
    when: () => false,
    text: (S) => `It closes on a Sunday, in a room with six people in it, two of whom are lawyers and one of whom keeps leaving to take calls.

Marcus Vance signs first, because you both know he was always going to and neither of you says so. He writes in lowercase even on a signature page, which the notary queries, twice.

The combined thing is worth ${M((S.company.valuation || 0) * F.MERGER_PREMIUM)} on the day and rather more within a year, and the reason is not synergy, which does not exist, but that the two of you had spent nine years solving the same problem from opposite ends and were each missing exactly what the other had built.

It is a bad company for eighteen months. Two cultures, two on-call rotations, two words for the same object in the schema. You lose people. He loses more.

Then it is not a bad company. Then it is the thing.

You share an office because neither of you would take the bigger one. He says almost nothing all day and then says one thing at 6pm that reorganises your week. ${affinity(S, 'vance') >= 10 ? 'At the ten-year dinner he gives a four-minute speech and three minutes of it are about a bar, and a second drink, and a sentence he said quieter than the rest of them.' : 'You never become friends. You become something with no word for it, which is closer and less comfortable and works.'}

Neither of you ever finds out which one of you would have won.` },

  // ── The career, not the run ────────────────────────────────────────────────
  { id: 'long_game', name: 'The Long Game', tone: 'strange', viaEvent: true, icon: '∞', plate: 'expand',
    blurb: 'You have been here before, and ended it differently, and come back.',
    req: `Reach ${F.LONG_GAME_ENDINGS} different endings across your career, then take this one`,
    when: () => false,
    text: (S) => `You have done this before.

Not this company — this *decision*, at this size, in a room with this light in it. You know how the next four years go under each of the doors in front of you, because you have been through some of them, and the knowing has stopped being an advantage and started being the condition you work under.

${(() => { const n = Object.keys(S.legacy?.endings || {}).length; return `${n} different ways it has ended, across ${(S.legacy?.runs || 0) + 1} timelines.`; })()} You remember the field with the rocket in it. You remember the hearing. You remember the coffee shop, which was the first one, and which you think about more than any of the others.

So you do not take a door. You keep going, and keep the company small enough to steer and large enough to matter, and spend the rest of it on the only question none of the endings answered: what the thing is *for*, asked slowly, over decades, by somebody who has already seen how each of the fast answers turns out.

There is no announcement. There is no plate on a wall. The work continues and the founder gets old inside it and the company outlives them by a margin that surprises the obituaries.

The last entry in the log is in your handwriting and it is four words long: *still here. still asking.*` },
];
