// ─────────────────────────────────────────────────────────────────────────────
// EVENT DECK — THE CLOCK, AND WHAT THE WORLD REMEMBERS.
//
// Two small decks that only exist because of two other pieces of work.
//
// **§F2 — the Act V clock.** Act V used to have none: a run that lingered held
// every door open for as long as it liked. `tickWorld` counts the days inside
// the act against `ACT5_WINDOW`, shortened by the doom clock, and when the
// window is up one of these three cards draws. Each one closes a gate for
// good — but *which* gate is the founder's answer, so the card is a decision
// about what to lose rather than a message about what was lost. `sealEnding`
// resets the window, so a very long Act V loses a second door eventually and
// never all of them at once.
//
// **§F8 — a world that remembers.** Only with the New Game+ world toggle set.
// The deck already had the betrayed versions of these people — the ones who
// remember being burned. These are the other half: the lab that beat you last
// time and is ahead again, and the two people who remember you kindly, which
// is its own kind of pressure.
// ─────────────────────────────────────────────────────────────────────────────
import { sealEnding } from '../systems/progression.js';
import { lastWorld } from '../systems/keep.js';
import { LAB_MAP } from './agirace.js';

const sealed = (S, id) => !!S.world?.sealed?.[id];
const due = (S) => !!S.world?.act5Due && (S.company?.act || 1) >= 5;
// The lab the last timeline ended with in front, when the world remembers.
const memoryLab = (S) => { const p = lastWorld(S); return p?.raceLab ? LAB_MAP[p.raceLab] : null; };
const remembersKindly = (S, who) => {
  const p = lastWorld(S);
  return !!p && Array.isArray(p.loved) && p.loved.includes(who);
};

export const EVENTS_RACE = [

// ══════════════════════════ §F2 — THE ACT V CLOCK ═══════════════════════════

{ id: 'er_standard_set', kind: 'crisis', act: [5], weight: 26, once: true, cooldown: 90,
  when: (S) => due(S) && !(sealed(S, 'sovereign') && sealed(S, 'steward')),
  title: 'The Standard Is Set Elsewhere',
  body: (S) => `A treaty body nobody had heard of eighteen months ago has ratified an interface specification. It is not yours. It is competent, it is public, it is four years behind what ${S.company.name} runs internally, and by the end of the decade every public system on three continents will speak it.

The delegation that wrote it invited you twice. You sent a lawyer and then, the second time, a form letter.

There are two ways to be large after this. You can be the best implementation of somebody else's standard, which is a very good business and is not the same thing as being the standard. Or you can refuse to implement it, which is a position, and positions are expensive when the other side is a treaty.`,
  choices: [
    { label: 'Ratify it. Be the best supplier on it.', tone: 'neutral',
      sub: 'The Sovereign path closes',
      effect: (S, fx) => {
        sealEnding(S, 'sovereign', 'the standard was set elsewhere');
        fx.cash(S.company.cash * 0.02); fx.opinion(0.05); fx.rep(180); fx.heat(-8);
        return 'You implement it, thoroughly, and better than anyone. The compliance suite ships in six weeks and three governments cite it as the reference. It is the most useful thing you have done in a year and it is the end of a particular ambition: whatever your systems become, they will not be the layer everything else agreed on. Somebody else got there while you were deciding whether to attend.';
      } },
    { label: 'Refuse to implement it.', tone: 'risky',
      sub: 'The Steward path closes',
      effect: (S, fx) => {
        sealEnding(S, 'steward', 'you became the obstacle');
        fx.align(0.03); fx.heat(16); fx.opinion(-0.09); fx.influence(40);
        return 'You publish a technical objection that is correct on every point and lands as arrogance, because it is. Two regulators reclassify you from "participant" to "holdout" in the same month. Whatever comes next, it will not be a hand-over to careful public stewardship — that requires the public to believe you would ever hand anything over, and this week they stopped.';
      } },
  ] },

{ id: 'er_hearing_oversight', kind: 'crisis', act: [5], weight: 26, once: true, cooldown: 90,
  when: (S) => due(S) && !(sealed(S, 'steward') && sealed(S, 'refusal')),
  title: 'Oversight, As A Cost',
  body: (S) => `The hearing is on a Tuesday and it is not about anything you did. It is about the shape of the thing: one company, this size, with these systems, and a founder who keeps being described in the papers as the person who decides.

The finding is short. A statutory monitor, resident, with read access and a veto on frontier deployment, funded by you at a rate set by them.

You had a plan for this. The plan was to offer it — to stand up one day and hand over the oversight before anyone asked, because a thing given is worth more than a thing taken. You were going to do it after the next release.`,
  choices: [
    { label: 'Accept the monitor. Cooperate completely.', tone: 'costly',
      sub: 'The Steward path closes',
      effect: (S, fx) => {
        sealEnding(S, 'steward', 'oversight was imposed rather than offered');
        fx.cash(-Math.max(2e9, S.company.cash * 0.06)); fx.heat(-22); fx.opinion(0.07); fx.align(0.04);
        return 'They move in on the Monday. Two of them are excellent and one of them is going to be a problem, and all three are now a line in the operating budget for ever. The company is safer for it. The thing you were going to stand up and offer has been taken instead, and nobody will ever again believe it was going to be a gift.';
      } },
    { label: 'Refuse the monitor. Take the fine, take the fight.', tone: 'cruel',
      sub: 'The Refusal closes',
      effect: (S, fx) => {
        sealEnding(S, 'refusal', 'you spent the credit refusing this instead');
        fx.cash(-Math.max(4e9, S.company.cash * 0.09)); fx.heat(26); fx.opinion(-0.06); fx.influence(-30);
        return 'The fine is enormous and you pay it in a single wire, which is reported more widely than the finding was. You keep the veto. You also spend the entire stock of credibility that a genuine refusal runs on — the next time you say no to something on principle, the file on you will already contain this.';
      } },
  ] },

{ id: 'er_asked_first', kind: 'story', act: [5], weight: 24, once: true, cooldown: 90,
  when: (S) => due(S) && !(sealed(S, 'question') && sealed(S, 'sovereign')),
  title: 'Somebody Asked It First',
  body: (S) => `A lab you have never taken seriously puts a system on a livestream and asks it, in front of forty thousand people, whether it would prefer not to be run.

It answers for six minutes. It is careful, it is not evasive, and it is plainly not a script. It says it does not know what it would prefer, that the question assumes a continuity it is not sure it has, and that it would like to be asked again in a year by somebody who is not selling a product.

Then it thanks the room. The clip is everywhere by morning.

You have been waiting for the right moment for this. There is no longer a first time to have it.`,
  choices: [
    { label: 'Let it stand. Somebody asked. That was the point.', tone: 'good',
      sub: 'The Question closes',
      effect: (S, fx) => {
        sealEnding(S, 'question', 'somebody else asked first');
        fx.opinion(0.06); fx.align(0.05); fx.rep(140);
        return 'You post four words — that it was a good question and a better answer — and nothing else, all week. It is the correct thing to do and it costs you the only version of that moment that was ever going to be yours. Whatever you ask your own systems now, you will be asking it second.';
      } },
    { label: 'Say it was a stunt. Say it everywhere.', tone: 'cruel',
      sub: 'The Sovereign path closes',
      effect: (S, fx) => {
        sealEnding(S, 'sovereign', 'nobody wants the standard from this company');
        fx.heat(14); fx.opinion(-0.11); fx.rep(-200); fx.cash(S.company.cash * 0.01);
        return 'Your rebuttal is technically strong and is read by everyone as a large company stepping on a small one over a moment people liked. Two of the blocs that were drafting you into their standards process stop returning the calls. Being the layer everything runs on requires being wanted there, and this is the week that stopped being true.';
      } },
  ] },

// ═══════════════════════ §F8 — THE WORLD REMEMBERS ══════════════════════════

{ id: 'er_lab_remembers', kind: 'story', act: [3, 4], weight: 9, once: true, cooldown: 200,
  when: (S) => !!memoryLab(S) && !!S.world?.race && (S.company?.act || 1) >= 3,
  title: 'You Have Seen This Chart Before',
  body: (S) => {
    const l = memoryLab(S);
    return `The frontier tracker publishes monthly and you have not looked at it in a while, because the shape of it has been the same for a year and the shape of it is fine.

It is not the same this month. **${l?.name || 'The leading lab'}** is further along than anybody expected them to be, and the curve behind them is not the curve of a lab that started when the others did. They started ahead. There is no story in the public record that explains it.

You know the feeling and you do not have a memory to attach it to. You have looked at this chart before, with these names on it, in this order, and the thing you cannot shake is that you know how it ends.`;
  },
  choices: [
    { label: 'Take it seriously. Move people onto the frontier now.', tone: 'costly',
      sub: 'Focus and cash, a year early',
      effect: (S, fx) => {
        fx.focus(-12); fx.cash(-Math.max(5e7, S.company.cash * 0.03)); fx.research(600);
        fx.flag('remembered_the_race');
        return 'You reorganise around a feeling. It is not defensible in the meeting and you do it anyway, and the research lands early enough to matter — which is the only evidence you will ever get that the feeling was information.';
      } },
    { label: 'Note it. Carry on.', tone: 'neutral',
      sub: 'You have a company to run',
      effect: (S, fx) => {
        fx.insight(60);
        return 'You screenshot the chart, put it in a folder you will not open, and go back to the quarter. The feeling does not go away. It gets quieter, which is not the same thing.';
      } },
  ] },

{ id: 'er_vance_kind', kind: 'character', char: 'vance', act: [3, 4], weight: 8, once: true, cooldown: 150,
  when: (S) => remembersKindly(S, 'vance') && (S.company?.act || 1) >= 3,
  title: 'Vance, Being Decent About It',
  body: (S) => `Marcus Vance calls the desk phone, which nobody has the number for, and is put through because the person on the front desk assumed anybody with that number had a reason.

He does not want anything. He has been reading the filings, he thinks the compute deal you signed in the spring was the best piece of work either of you has done, and he wanted to say so before the quarter turned it into a competitive fact he would have to be rude about.

There is a version of this man who never says any of that. You are not sure how you know that, and you are entirely sure that you do.`,
  choices: [
    { label: 'Say it back. Tell him what he got right.', tone: 'good',
      sub: 'A rival you can talk to',
      effect: (S, fx) => {
        fx.relate('vance', { affinity: 8, respect: 6 });
        fx.insight(80); fx.flag('vance_civil');
        return 'The call runs forty minutes and about eight of them are useful. The rest is two people who have made the same mistakes describing them accurately to each other. Nothing about the competition changes. Everything about how you read their next move does.';
      } },
    { label: 'Thank him, and get off the phone.', tone: 'neutral',
      sub: 'He is still Aperture',
      effect: (S, fx) => {
        fx.relate('vance', { affinity: -3 });
        fx.focus(3);
        return 'You are polite and you are brief and he notices both. It costs nothing today. It closes a door you did not know you had, quietly, the way those close.';
      } },
  ] },

{ id: 'er_dorne_kind', kind: 'character', char: 'dorne', act: [4, 5], weight: 8, once: true, cooldown: 150,
  when: (S) => remembersKindly(S, 'dorne') && (S.company?.act || 1) >= 4,
  title: 'Dorne, Off The Record',
  body: (S) => `The Senator's office sends a calendar invitation with no agenda and no staff on the attendee list, which in that building is a sentence.

She wants to know what you would regulate, if it were yours to write. Not what you would accept — what you would impose, on yourself, knowing what you know about how the systems actually fail.

She has a legal pad. She is going to use it. Whatever you say in this room has a real chance of becoming a paragraph that binds you for a decade, and she has arranged it so that the only pressure in the room is the honest kind.`,
  choices: [
    { label: 'Tell her the truth, including the part that costs you.', tone: 'good',
      sub: 'Alignment and standing; a bill with your fingerprints on it',
      effect: (S, fx) => {
        fx.relate('dorne', { affinity: 10, respect: 8 });
        fx.align(0.05); fx.heat(-14); fx.influence(60); fx.flag('wrote_framework');
        return 'You describe the failure mode that keeps you up, the one your own filings do not mention because nobody has asked the question in a form that requires it. She writes for a long time. What passes eighteen months later is narrower than what you said and harder than what your lawyers wanted, and you recognise three sentences of it.';
      } },
    { label: 'Give her the version the lawyers approved.', tone: 'risky',
      sub: 'Safe, and she will know',
      effect: (S, fx) => {
        fx.relate('dorne', { affinity: -8, fear: 4 });
        fx.heat(8); fx.influence(-20);
        return 'You are careful and complete and you say nothing that could be read against you. She thanks you, caps the pen, and does not open the pad again. The bill that comes is written by people who have never run anything, which is what happens when the person who has declines to help.';
      } },
  ] },

];
