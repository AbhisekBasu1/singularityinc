// ─────────────────────────────────────────────────────────────────────────────
// THE SECOND LAB — §A24. What Act V is, when you lost.
//
// `c_race_lost` has three doors and two of them were dead ends dressed as
// comebacks: "race anyway" and "build the counterweight" both handed the
// founder six hundred more days in a game that had stopped being about
// anything. Folding is a real ending now. This file is the other road — the
// one the `counterweight` flag opens, where the run continues and the world
// has somebody else's AGI in it.
//
// The three cards are deliberately small. Nothing here is a comeback: the race
// is over and it was lost, `repriceForSecond` has already made the world a
// world in which that is true, and what is left is the question the act is
// actually about. Not "how do we win" — "what is a company for, when the thing
// it was racing toward exists and belongs to somebody else."
//
// So: the winner's API arrives on your own desk and is better than yours. The
// customers who stayed turn out to have stayed for a reason nobody modelled.
// And the winner offers you the one job in the world that is unambiguously
// worth doing, on their terms, in their building.
//
// Gated on the flag and on `SECOND.CARDS_FROM` days after it was set, because
// an API takes a fortnight to reach a desk and the offer is not made the same
// week. `once` on all three; the act does not repeat itself.
// ─────────────────────────────────────────────────────────────────────────────
import { SECOND } from './balance.js';

const WINNERS = {
  aperture: 'Aperture Systems', meridian_state: 'the Consortium',
  obsidian: 'Obsidian Research', commons: 'the Open Commons',
};
const winner = (S) => WINNERS[S.narrative?.flags?._rival_agi] || 'the lab that crossed';
// The day the race was decided, which is the day the fork opened.
const crossedDay = (S) => Math.floor(S.world?.race?.crossed?.day ?? S.time.day);
const since = (S) => S.time.day - crossedDay(S);
const onFork = (S, after = SECOND.CARDS_FROM) =>
  !!S.narrative?.flags?.counterweight && !!S.narrative?.flags?._rival_agi && since(S) >= after;

export const EVENTS_SECOND = [

{ id: 'sec_their_api', kind: 'story', act: [4, 5], weight: 22, once: true, cooldown: 40,
  when: (S) => onFork(S),
  title: 'Their API, On Your Desk',
  body: (S) => `Somebody on the platform team put ${winner(S)}'s model behind your own evaluation harness on Tuesday, without asking, because that is what an engineer does when a thing exists.

The results are in a document with no summary at the top. There does not need to be one. It is better than yours on every task you measure and on four you stopped measuring because they were too hard to be useful.

The document ends with one line, which is not a recommendation, because whoever wrote it understood exactly what they were handing you: *we could serve our customers better tomorrow by routing to them.*

There are twelve hundred people here. Most of them found out about the benchmark before you did.`,
  choices: [
    { label: 'Route to them. Be honest about it.', tone: 'costly',
      sub: 'Better product, and their meter running',
      effect: (S, fx) => {
        fx.flag('routed_to_winner');
        fx.users(Math.round(0.06 * (S.products?.[0]?.users || 0)));
        fx.cash(-Math.min(S.company.cash * 0.05, 4e9)); fx.rep(120); fx.opinion(0.03); fx.align(0.02);
        return 'You publish the routing decision before you ship it, including the benchmark, including the four tasks. Your customers get a better product on Thursday and you get a line item that grows with your own success. Three competitors do the same thing within a month and none of them say so.';
      } },
    { label: 'Keep your own stack. Say why, publicly.', tone: 'risky',
      sub: 'Independence, and the gap',
      effect: (S, fx) => {
        fx.flag('kept_the_stack');
        fx.rep(60); fx.influence(30); fx.opinion(-0.03);
        fx.users(-Math.round(0.03 * (S.products?.[0]?.users || 0)));
        return 'You write it yourself and it is the clearest thing you have published in years: a market with one supplier is not a market, and a company that will not be one of two is a company that has agreed to be none. It is correct. It costs you the customers for whom correct is not the point.';
      } },
    { label: 'Take the document off the network.', tone: 'cruel',
      sub: 'The number stops being a fact people can quote',
      effect: (S, fx) => {
        fx.flag('buried_the_benchmark');
        fx.rep(-90); fx.align(-0.04); fx.opinion(-0.04); fx.insight(40);
        return 'It comes down at 16:20 and it is on two personal machines by 16:24, which you know, because one of them tells you. Nobody resigns. Something quieter than that happens instead, over about a year, to the kind of person who runs a benchmark without asking.';
      } },
  ] },

{ id: 'sec_who_stayed', kind: 'milestone', act: [4, 5], weight: 20, once: true, cooldown: 40,
  when: (S) => onFork(S, SECOND.CARDS_FROM + 20),
  title: 'The Ones Who Stayed',
  body: (S) => `Churn went up for nine weeks after ${winner(S)} crossed and then it stopped, at a number nobody's model produced.

Sales assumed price. Research assumed latency. The actual answer is in the exit interviews of the people who *did not* leave, which somebody finally read all of, and it is not a feature.

They stayed because your on-call rota is public, because you have never once changed a price without ninety days of notice, and because when the thing broke in March a person wrote the post-mortem and signed it.

Nobody in the industry has ever had to defend a market position with that sentence before. You are about to find out whether it is one.`,
  choices: [
    { label: 'Make it the whole strategy.', tone: 'good',
      sub: 'Slower, and yours',
      effect: (S, fx) => {
        fx.flag('second_by_trust');
        fx.rep(200); fx.opinion(0.06); fx.align(0.03); fx.focus(-8);
        return 'Every commitment goes on a page with a date on it, and the page is versioned in public. The first quarter it changes nothing. The fourth quarter a government procurement officer reads it end to end and does not call anybody for a reference.';
      } },
    { label: 'Use it as a floor and go after the frontier anyway.', tone: 'risky',
      sub: 'Both, badly, for a while',
      effect: (S, fx) => {
        fx.rep(60); fx.research(1200); fx.focus(-16); fx.cash(-Math.min(S.company.cash * 0.08, 6e9));
        return 'You run the reliable company and the ambitious one out of the same building, which works for about two quarters and then produces the first roadmap meeting anybody has walked out of. It is not a mistake. It is a bill, arriving later than you would like.';
      } },
    { label: 'Say it out loud, to them.', tone: 'neutral',
      sub: 'One letter, no ask',
      effect: (S, fx) => {
        fx.rep(90); fx.opinion(0.04); fx.relate('vance', { affinity: 2 }); fx.focus(-3);
        return 'You write to the customers rather than about them, and the letter has no offer in it and no discount, which is what makes it circulate. Somebody screenshots the fourth paragraph. The fourth paragraph is about March.';
      } },
  ] },

{ id: 'sec_the_offer', kind: 'character', char: 'vance', act: [5], weight: 24, once: true, cooldown: 60,
  when: (S) => onFork(S, SECOND.CARDS_FROM + 40) && (S.company?.act || 1) >= 5,
  title: 'Run Their Safety Team',
  body: (S) => `The offer comes through somebody you both know, which is how these are always made, and it is not a job offer in any sense you recognise.

${winner(S)} would like you to run alignment. Not advise. Not sit on a committee. Run it, with the budget, with the veto, with the thing you have argued for twelve years should exist and has never once existed anywhere with a system worth applying it to.

Your own company continues without you. That is stated plainly and it is not a threat; it is the offer's whole weight. Everything you have said you wanted is available in a building that is not yours, attached to a system that is not yours, and the only price is that you stop being the person who was going to build both.

You have until Friday, which is generous, and you know exactly what you are going to do, which is the part that is difficult.`,
  choices: [
    { label: 'Take it. The work is the point.', tone: 'good',
      sub: 'The veto, in their building',
      effect: (S, fx) => {
        fx.flag('took_their_chair'); fx.flag('founder_stepped_back');
        fx.align(0.12); fx.opinion(0.06); fx.rep(-40); fx.influence(60);
        return 'You say yes on Wednesday, two days early, because waiting would have been a performance. The handover at your own company takes four months and is the most careful thing you have ever done. In the new building you have a veto and you use it twice in the first year, and both times it holds, and that is the whole argument settled.';
      } },
    { label: 'Refuse. Build the second one anyway.', tone: 'risky',
      sub: 'Alone, and slower',
      effect: (S, fx) => {
        fx.flag('refused_their_chair');
        fx.align(0.05); fx.rep(140); fx.research(900); fx.focus(-12);
        return 'You tell them the truth, which is that a veto inside one company is a courtesy and a second company is a structure, and that you have spent twelve years learning the difference. They take it well. One of them says, on the way out, that they hoped you would say that, and does not explain.';
      } },
    { label: 'Counter: both companies, one standard.', tone: 'neutral',
      sub: 'Neither of you gets what you asked for',
      effect: (S, fx) => {
        fx.flag('joint_standard');
        fx.align(0.08); fx.influence(90); fx.rep(80); fx.heat(-10); fx.focus(-10);
        return 'You go back with a document instead of an answer: a joint evaluation standard, published, binding on both, audited by neither. It takes seven months and four lawyers and it is signed in a room with no press in it. Neither company got what it wanted. That is roughly what a standard is.';
      } },
  ] },

];
