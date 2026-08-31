// ─────────────────────────────────────────────────────────────────────────────
// EVENT DECK VII — last acts. Five beats the cast was written to have and the
// deck never reached: Priya's final piece, Crane's seat and Crane's email,
// Dorne's last day, and bug report 4,118.
//
// Each of these is the sixth label in src/data/characters.js. Each gates on the
// arc the deck actually lands on, and none of them says the label out loud.
// ─────────────────────────────────────────────────────────────────────────────
import { totalUsers } from '../systems/product.js';

const users = (S) => totalUsers(S);
const arcOf = (S, id) => S.narrative?.relationships?.[id]?.arc ?? 0;

export const EVENTS7 = [

// ══════════════════════════ PRIYA — arc 5 ═══════════════════════════════════
// Gated at 3, not 4, on purpose. The base deck only reaches priya arc 4 on the
// cruel branch of e2_priya_investigation, so a gate on the previous label would
// hand her closing piece exclusively to the founder who went around her. Same
// reasoning for sam below: his arc 4 is the cease-and-desist branch.

{ id: 'e7_priya_record', kind: 'character', char: 'priya', act: [4, 5], weight: 7, once: true,
  when: (S) => (S.company?.act ?? 1) >= 4 && arcOf(S, 'priya') >= 3,
  title: 'The Long Version',
  body: (S) => `Priya Raghunathan has written about you four times. Two profiles, one investigation, and a single paragraph in a piece about somebody else that you still think about.

Tonight she sends a document with no subject line. It is 22,000 words.

> *This one is not for the week. It is for the file.*
>
> *It runs in nine days whatever you say. I am sending it early because there are 41 factual claims in it, I have sourced every one of them twice, and there are four where sourcing is not the problem.*
>
> *You are the only person alive who can tell me which of them are true and which are only accurate.*
>
> *— P*

You read it in one sitting, at the desk, without moving.

It is the fairest thing anybody has written about you. That is much harder than the cruel ones were.`,
  choices: [
    { label: 'Go through all forty-one. Line by line.', sub: '−3 days. Every correction prints.', tone: 'good',
      effect: (S, fx) => { fx.days(3); fx.focus(-14); fx.rep(120); fx.opinion(0.08);
        fx.relate('priya', { affinity: 12, respect: 12, arc: 5 }); fx.flag('priya_record');
        return 'You spend three days on other people\'s sentences about your own life. Nine of the forty-one change. Two of the nine make you look worse, and you say so, and she keeps those two, and that is the reason the piece is believed.'; } },
    { label: 'Answer the one question she never got.', sub: 'One paragraph. On the record, permanently.', tone: 'risky',
      effect: (S, fx) => { fx.rep(-40); fx.opinion(0.12); fx.align(0.06);
        fx.relate('priya', { affinity: 14, respect: 14, arc: 5 }); fx.flag('priya_record');
        return 'She has asked it in every interview since the first: what did this cost somebody who never got a vote. You answer with a name, a date, and four sentences. The paragraph is 61 words long and it is the only part of the piece anybody ever quotes.'; } },
    { label: 'Let it run untouched.', sub: 'No corrections. No fingerprints.', tone: 'neutral',
      effect: (S, fx) => { fx.rep(60); fx.focus(10); fx.relate('priya', { respect: 6, arc: 5 }); fx.flag('priya_record');
        return 'You reply with four words: *"Run it as written."* Three of the forty-one claims are wrong in small ways. She finds two of them herself within the year. The third is still being cited by people who were not born when it happened.'; } },
  ] },

// ══════════════════════════ CRANE — arc 4 ═══════════════════════════════════

{ id: 'e7_crane_seat', kind: 'character', char: 'crane', act: [4, 5], weight: 7, once: true,
  when: (S) => (S.company?.act ?? 1) >= 4 && arcOf(S, 'crane') >= 3,
  title: 'No Items',
  body: (S) => `Halberd Capital does not raise its eighth fund.

The notice to limited partners is one page and uses the word "environment" three times. What it means is simpler than that. People with capital have compared what a venture fund does with $1B against what your compute allocation does with it, and have made an unremarkable decision.

Ellis Crane still holds a board seat. He has a vote, ninety minutes a quarter, and a standing agenda item that has read "no items" for two years.

He asks for twenty minutes that are not a board meeting.

"I'd like to resign the seat," he says. "Not in protest. Candidly, the metric that matters here is whether my being in the room changes an outcome. I have been tracking it. It does not."`,
  choices: [
    { label: 'Accept. Tell him what the seat was worth.', sub: 'Say the true thing out loud.', tone: 'good',
      effect: (S, fx) => { fx.relate('crane', { affinity: 10, respect: 10, arc: 4 }); fx.focus(16); fx.rep(20);
        fx.flag('crane_resigned');
        return 'You tell him the governance layer he forced on you is the reason the company survived a decision you got wrong. He writes it down. In all the years of meetings he has never written anything down in front of you.'; } },
    { label: 'Refuse. Keep the seat filled.', sub: 'He stays. Nothing changes. That is the point.', tone: 'neutral',
      effect: (S, fx) => { fx.relate('crane', { affinity: 4, respect: -2, arc: 4 }); fx.align(0.04); fx.heat(-4);
        fx.flag('crane_stayed');
        return 'He stays three more years and votes yes on everything, because everything is settled by the time it reaches a vote. At his last meeting he thanks everyone in the room by name. There are four names.'; } },
    { label: 'Accept. Say nothing else.', sub: 'A signature. Four minutes.', tone: 'cruel',
      effect: (S, fx) => { fx.relate('crane', { affinity: -8, arc: 4 }); fx.rep(-10); fx.focus(6);
        fx.flag('crane_resigned');
        return 'Counsel handles the paperwork and it takes four minutes. He sends a short note afterwards thanking you for the years. It is gracious and accurate and reads like it was written to be filed.'; } },
  ] },

// ══════════════════════════ CRANE — arc 5 ═══════════════════════════════════

// Only e7_crane_seat reaches crane arc 4, so this card cannot draw until that
// one has played. Two once-cards in the same two acts, in sequence.
{ id: 'e7_crane_email', kind: 'character', char: 'crane', act: [4, 5], weight: 6, once: true,
  when: (S) => (S.company?.act ?? 1) >= 4 && arcOf(S, 'crane') >= 4,
  title: 'A Forward With No Body',
  body: (S) => `An email arrives with nothing in it.

It is a forward. The forwarded message is dated month two of the company and you have read it something like four hundred times.

> *For us it's just too early — we'd want to see the retention curve hold past 90 days before we could get to conviction. Keep me posted.*

A second message arrives a minute later, because he wanted the first one to land on its own.

> *I have moved this between six laptops. Candidly, I could not tell you why.*
>
> *— E*

You have moved it between six laptops as well.

Neither of you has ever mentioned that.`,
  choices: [
    { label: '"You were right about the ninety days."', sub: 'Give him the one thing he was right about.', tone: 'good',
      effect: (S, fx) => { fx.relate('crane', { affinity: 14, respect: 12, arc: 5 }); fx.focus(24); fx.rep(20);
        return 'He replies in seven minutes, which is what he did the first time. *"I was right about the test and wrong about you. Those are different skills and I have had a long time to work out which one the job needs."*'; } },
    { label: 'Anchor his next fund. No deck, no diligence.', sub: '−$200M. He did not ask.', tone: 'costly',
      req: (S) => (S.company?.cash ?? 0) >= 4e8,
      effect: (S, fx) => { fx.cash(-2e8); fx.relate('crane', { affinity: 16, respect: 8, arc: 5 }); fx.rep(40);
        fx.flag('anchored_crane');
        return 'He takes it, which surprises both of you. The fund closes at $240M and writes eleven cheques a year. He never shows you one of them, and when you ask why, he says the metric that matters there is whether you would be able to say no.'; } },
    { label: 'Do not reply. Keep the email.', sub: 'Two things in a folder.', tone: 'neutral',
      effect: (S, fx) => { fx.relate('crane', { arc: 5 }); fx.focus(12); fx.insight(80);
        return 'You file both messages in the folder where the first one has lived since month two. There are two things in the folder now. You check, some years later, and there are still two.'; } },
  ] },

// ══════════════════════════ DORNE — arc 5 ═══════════════════════════════════

{ id: 'e7_dorne_last_day', kind: 'character', char: 'dorne', act: [4, 5], weight: 7, once: true,
  when: (S) => (S.company?.act ?? 1) >= 4 && arcOf(S, 'dorne') >= 3,
  title: 'Held It Up',
  body: (S) => `Senator Ruth Dorne loses her primary by nine points.

Her opponent ran on two issues and one of them was her. The advertisement that did the work is thirty-one seconds long, contains no false statement, and is mostly the phrase "held it up" over footage of a hearing you attended.

She is seventy. Four of the frameworks that govern what you are allowed to build exist because she stayed in a building until 2am with three staffers and a printer that jammed.

Her office calls to schedule an exit meeting. The scheduler apologises twice for the short notice and mentions, unprompted, that the Senator does not like fuss.

There is no clip of any of this. The things she stopped did not happen, and things that do not happen do not trend.`,
  choices: [
    { label: 'Say it publicly. Under your own name.', sub: '+Public opinion. It will not change the result.', tone: 'good',
      effect: (S, fx) => { fx.opinion(0.10); fx.rep(140); fx.heat(-10);
        fx.relate('dorne', { affinity: 12, respect: 12, arc: 5 }); fx.flag('praised_dorne');
        return 'You publish eight hundred words listing what she stopped, with dates. It is read four million times and changes nothing about an election that is over. Three of her staffers print it out. You learn that much later, from one of them, across a hearing table.'; } },
    { label: 'Offer her the chair of the safety board.', sub: 'A real seat. Real authority.', tone: 'risky',
      effect: (S, fx) => { fx.align(0.10); fx.opinion(0.04); fx.research(120);
        fx.relate('dorne', { affinity: 8, respect: 10, arc: 5 });
        return 'She says no in the meeting, kindly and without pausing. *"If I sit at your table, every clause I wrote becomes a favour somebody did you. I would rather they stayed law."* Then she gives you the name of the staffer who actually drafted them, and that hire is worth more than she would have been.'; } },
    { label: 'Nothing. The framework is already written.', sub: 'Costs nothing today.', tone: 'cruel',
      effect: (S, fx) => { fx.opinion(-0.08); fx.align(-0.04); fx.heat(8);
        fx.relate('dorne', { affinity: -10, arc: 4 });
        return 'You do not attend the exit meeting. Her three staffers scatter into two agencies and a lab, and every one of them takes the file with them. You meet all three again within four years. They are extremely good and they are not on your side.'; } },
  ] },

// ══════════════════════════ SAM — arc 5 ═════════════════════════════════════
// Gated at 3. See the note above e7_priya_record.

{ id: 'e7_sam_ticket', kind: 'character', char: 'sam', act: [4, 5], weight: 7, once: true,
  when: (S) => (S.company?.act ?? 1) >= 4 && S.narrative?.flags?.sam_met && arcOf(S, 'sam') >= 3,
  title: 'Closed At 06:14',
  body: (S) => `A bug report arrives at 06:14 and is closed at 06:14.

It is the 4,118th one Sam Okonkwo has filed. It has the shape every one of them has had: a numbered list, a screenshot with a red rectangle drawn on it by hand, and a line at the bottom that says *"sorry if this is a dupe, i'm bad at searching."*

Triage closed it as \`not-reproducible / working-as-intended\`, confidence 0.97. Its precision on this class of report is the best number in the company.

There are ${Math.round(users(S)).toLocaleString()} accounts now. The first one is still Sam.

You read the report because your name sits on a notification rule you wrote years ago and never turned off.

Sam is right. Sam is right about something eleven layers below anything a person outside the building should be able to see, and the reason the model cannot reproduce it is the reason it matters.`,
  choices: [
    { label: 'Reopen it. Fix it yourself.', sub: '−1 day. Nine lines.', tone: 'good',
      effect: (S, fx) => { fx.days(1); fx.focus(-16); fx.align(0.06); fx.code(200);
        fx.relate('sam', { affinity: 14, respect: 8, arc: 5 });
        return 'You spend a day inside a subsystem you did not design and cannot fully read. The fix is nine lines. You put the ticket number in the commit message. Nothing in this repository has referenced a ticket number in six years.'; } },
    { label: 'Change triage. Add a door it cannot close.', sub: '−0.4% throughput. Permanent rule.', tone: 'neutral',
      effect: (S, fx) => { fx.align(0.10); fx.opinion(0.04); fx.rep(60);
        fx.relate('sam', { affinity: 10, arc: 5 }); fx.flag('human_triage');
        return 'One rule: anything filed by a person who has filed more than a hundred reports goes to a human being. It costs 0.4% of triage throughput and catches nine things a year that nothing else catches. Nobody can prove the nine were worth it, including you.'; } },
    { label: 'Leave it closed. The system is right four million times a year.', sub: 'Numerically correct.', tone: 'cruel',
      effect: (S, fx) => { fx.align(-0.06); fx.opinion(-0.04); fx.relate('sam', { affinity: -8, arc: 5 });
        return 'The system is right four million times a year and it is wrong about this one. Sam files the same report again in March, and again in July, with more evidence each time and no mention of the two before it.'; } },
  ] },

];
