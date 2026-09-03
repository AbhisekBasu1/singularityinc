// ─────────────────────────────────────────────────────────────────────────────
// THE ACT CARDS — §A2. One per turn, and each one names the deed.
//
// An act used to end because a counter ran out, and the only thing that said so
// was the act plate: a title, a photograph, and a number that had changed.
// Measured, Acts II, III and IV each lasted almost exactly their floor and the
// middle act spent nearly half its length with the next gate already open — so
// the transition was not the founder finishing anything, it was the founder
// waiting for a calendar.
//
// Each act closes on a deed now (`ACT_DEEDS` in `systems/progression.js`), and
// this is the card that reads it back. It fires in the first fortnight of the
// new act, it is `once`, and its whole job is to say *which door you walked
// through*, because every deed has more than one and two founders will have
// left the same act for entirely different reasons.
//
// The cards never grant anything large. A transition is already the reward;
// what it was missing was a sentence about what you did.
// ─────────────────────────────────────────────────────────────────────────────
import { STAGE_INDEX } from './regions.js';

// How long after the turn the card is still the right card to open with.
const FRESH = 14;
const justTurned = (S, act) => S.company.act === act
  && (S.time.day - (S.company.actStartedDay ?? 0)) <= FRESH;

const flag = (S, k) => !!S?.narrative?.flags?.[k];
const partnered = (S) => Object.values(S.world?.regions || {})
  .find((r) => (STAGE_INDEX[r.stage] || 0) >= STAGE_INDEX.partner);

export const EVENTS_ACTS = [

// ── Act I closed on a launch ─────────────────────────────────────────────────
{ id: 'ea_act2', kind: 'milestone', weight: 0, once: true, priority: 30,
  when: (S) => justTurned(S, 2),
  title: 'The Thing Exists Now',
  body: (S) => {
    const n = S.stats.featuresShipped || 0;
    return `There was a day — you could find it in the log if you wanted to, and you do not want to — when this was a folder on a laptop with a name you were embarrassed by.

Since then you have shipped ${n} ${n === 1 ? 'feature' : 'features'} and put the thing in front of strangers, which is the only part that ever counted. Everything before a launch is a rehearsal, and a rehearsal can be perfect and mean nothing.

What changed this week is not the number of users. It is that the company is now something that happens to other people. You will spend the next year finding out what that costs.`;
  },
  choices: [
    { label: 'Note the date. Get back to work.', sub: 'The act is the record. +XP.', tone: 'neutral',
      effect: (S, fx) => { fx.rep(12);
        return 'You write the date on the back of an envelope, which is a thing you have started doing and cannot account for. The envelope survives four house moves.'; } },
    { label: 'Tell the three people who were there at the beginning.', sub: '+Reputation, warmer ties.', tone: 'good',
      effect: (S, fx) => { fx.rep(30); fx.focus(-4);
        return 'Two reply the same evening. The third replies eleven days later with a paragraph you keep, and reads it back to you at a much later dinner, when the company is a different animal entirely.'; } },
  ] },

// ── Act II closed on a round, or on a quarter that paid for itself ──────────
{ id: 'ea_act3', kind: 'milestone', weight: 0, once: true, priority: 30,
  when: (S) => justTurned(S, 3),
  title: 'It Pays For Itself',
  body: (S) => {
    const raised = (S.company.rounds || []).some((r) => r.type === 'a');
    return raised
      ? `The wire cleared on a Thursday and the number in the account stopped being a countdown.

A Series A is not money. Money you already had, in the sense that you were surviving. What a Series A is, is somebody with a fiduciary duty deciding in a room you were not in that this is a company rather than a project — and then writing that decision down where other people can read it.

The terms are on the desk. Somebody sits on your board now, and the quarter has a rhythm it did not have last year. You will find out over the next two years which of those two facts mattered.`
      : `Ninety days in a row where what came in covered what went out.

Nobody sends a note about this. There is no wire, no term sheet, no announcement, and the one person who would understand what it took is asleep in another time zone. A profitable quarter is the least photogenic thing a company can do and it is the only one that makes every other decision yours.

You did not raise. That was a choice and it stays a choice: it means the ceiling is what the business can pay for, and it means nobody gets to tell you what the next year is for.`;
  },
  choices: [
    { label: 'Say it out loud to the room, then move on.', sub: 'The company hears it. +Morale.', tone: 'good',
      effect: (S, fx) => { fx.rep(20);
        for (const a of S.agents) a.morale = Math.min(1, (a.morale ?? 1) + 0.05);
        return 'It takes forty seconds and it is the flattest speech ever given about a genuinely good week. The roster is better for a fortnight anyway.'; } },
    { label: 'Write down what the next year is for, while it is still yours to decide.', sub: '+Insight, −Focus.', tone: 'neutral',
      effect: (S, fx) => { fx.insight(40); fx.focus(-6);
        return 'Four hundred words, most of it wrong. The one paragraph that is right is the one you will still be quoting to people in three years, usually without remembering where it came from.'; } },
  ] },

// ── Act III closed on a hearing, a treaty, or a training run ────────────────
{ id: 'ea_act4', kind: 'milestone', weight: 0, once: true, priority: 30,
  when: (S) => justTurned(S, 4),
  title: 'Somebody Else Is In The Room',
  body: (S) => {
    const region = partnered(S);
    const heard = flag(S, 'answered_dorne') || flag(S, 'played_the_room') || flag(S, 'said_i_dont_know');
    if (heard) {
      return `The transcript runs to sixty pages and you are in about nine of them.

That is the thing nobody tells you about a hearing: it is not a trial and it is not a conversation, it is a piece of process, and once you have been through it you are inside the process for good. There is a file with your name on it in a building you have never entered and it will be added to for the rest of your life.

You are not a company that gets regulated one day. You are a company that is regulated, now, by people with names and staffers and re-election campaigns. The next stretch is about what you build while that is true.`;
    }
    if (region) {
      return `The signing was fourteen minutes long and the photograph took nine.

What it means is on page thirty-one: public services in ${region.name || 'the bloc'} run on your stack, under an agreement with a term and a renewal clause and a schedule of penalties. Somebody in a ministry can now be fired for something your systems do at three in the morning.

That is a different kind of company from the one that had customers. Customers leave. A government does not leave, it renegotiates — and the next stretch of this is about being the sort of supplier that survives a change of administration.`;
    }
    return `The run finished at an hour you were awake for on purpose, and the loss curve did the thing you had read about and never watched.

A frontier-class training run is the first thing this company has done that a larger one could not simply copy next quarter. Everything before it was a product decision. This was a capability decision, and capability is the only kind that compounds.

Nobody outside the building understands what changed this week. Inside it, everybody does, and one of them says so in a message at 04:40 that you will still have in five years.`;
  },
  choices: [
    { label: 'Take the afternoon. Look at what you built.', sub: '+Focus, +alignment.', tone: 'good',
      effect: (S, fx) => { fx.focus(14); fx.align(0.02);
        return 'You walk around a building full of machines doing work you could not do by hand in a thousand years, and the feeling is not triumph. It is something closer to responsibility, and it is unfamiliar enough that you sit down.'; } },
    { label: 'Write the memo about what this makes you responsible for.', sub: '+Approval, +Reputation, −Focus.', tone: 'neutral',
      effect: (S, fx) => { fx.opinion(0.03); fx.rep(45); fx.focus(-8);
        return 'It is published, read more widely than anything else you have written, and quoted against you twice — both times accurately, which is the part you did not plan for and would not take back.'; } },
  ] },

// ── Act IV closed on a promise kept, or a season taken ──────────────────────
{ id: 'ea_act5', kind: 'milestone', weight: 0, once: true, priority: 30,
  when: (S) => justTurned(S, 5),
  title: 'On Purpose',
  body: (S) => {
    const season = (S.market?.nemesis?.seasons || []).find((x) => x && x.won === false);
    return season
      ? `They said what they were going to do and then they did not do it.

That is the whole of it. A season of somebody else's plan, aimed at you, played out in public, and at the end of it the thing they were reaching for is still yours. It cost them a quarter and it cost you a great deal more than that, and the ledger does not record the second number.

What it buys is not safety. It is the knowledge that this company can be aimed at and hold — which is the only preparation available for the stretch that starts now, because from here what comes at you is not a rival.`
      : `You wrote down what the quarter was for. Ninety days later you read it back and it had happened.

That sounds small. Measured against the last four years it is close to unprecedented: almost everything this company has done, it did because the week demanded it. Deciding a thing in advance and then arriving at it is a different motion entirely, and it is the only one that works at this size.

Whatever the last act of this is, it will not be survived. It will have to be chosen, in advance, on purpose, and then arrived at.`;
  },
  choices: [
    { label: 'Keep the page.', sub: '+Focus. It is a short document.', tone: 'neutral',
      effect: (S, fx) => { fx.focus(12);
        return 'It goes in the drawer with the envelope from the launch. Two pieces of paper, five years apart, and between them the only two dates you could name without checking.'; } },
    { label: 'Say it to the company: this is how the rest of it gets decided.', sub: '+Reputation, +alignment.', tone: 'good',
      effect: (S, fx) => { fx.rep(60); fx.align(0.03);
        for (const a of S.agents) a.morale = Math.min(1, (a.morale ?? 1) + 0.04);
        return 'The room takes it better than you expected, which you eventually work out is because they had already noticed and were waiting to hear whether you had.'; } },
  ] },

];

// ── §A5 A door opening ──────────────────────────────────────────────────────
// The act card above is what the founder reads once the act has turned. These
// are what the Wire says the day a door *opens* — the moment one of the two or
// three ways out of an act stops being a thing to go and do and starts being a
// thing that is done. One line per door, once per run, keyed by the door id in
// `ACT_DEEDS`, and `systems/progression.js` reads this map.
//
// It reads this file and this file imports nothing from `src/systems/`, which
// is what keeps that safe. Do not give this module an upward import.
export const DOOR_META = 'A WAY OUT OF THIS ACT';

export const DOOR_OPENED = {
  series_a: 'The A closed this week. Somebody with a fund and a thesis has decided this is one of the ones, and the company is no longer a question of whether it lasts the year.',
  profit_quarter: 'Ninety consecutive days in which the day paid for itself. No round closed it, no investor blessed it, and it is the harder of the two ways to arrive.',
  hearing: 'The founder sat through the hearing and answered under oath, which is a thing the company had never had to do and will now do again.',
  treaty: 'A government signed. Public services in that bloc run on this stack from the next fiscal year, which makes the company a piece of the state rather than a vendor to it.',
  frontier: 'A frontier-class training run finished in a building this company owns. Whatever comes next, it does not have to be asked for.',
  kept: 'The quarter was written down in advance and then it happened, which the people who have been here since the garage tell each other about for a week.',
  season: 'The rival named what they were coming for, came for it, and did not get it. The season closes with the thing they wanted still on this side of the table.',
};
