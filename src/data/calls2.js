// ─────────────────────────────────────────────────────────────────────────────
// THE PHONE, SECOND HALF — what makes a call answer the run.
//
// `calls.js` is each person's standing conversation. This file is the part
// that changes with the company: what they remember from the last call, the
// things they only bring up when something has just happened, and the calls
// *they* make to you. It is merged into CALLS at the bottom of `calls.js`.
//
//   about     a short noun for a topic, so a pickup line can refer back to it
//             ("Last time it was the truce.")
//   recall    (S, r, m) — one line added to the pickup when there was a last
//             call. `m` is { since, about, calls, by }.
//   topics    reactive: each `when(S, r, n)` reads the run — an outage this
//             week, a round just closed, an agent let go, a Sunday, a number
//             on the Life panel. `n` is how often it has been said before.
//             `fx` may be a function of (S, r) when the size should fit the run.
//   rings     what they call you about. `when(S, r)` is the trigger, `opening`
//             their first line, `topics` what you can say back. One per run.
//
// Everything a topic does goes through `applyCallFx`, in the deck's own
// vocabulary plus affinity, respect, fear, flags and sleep. It stays small.
// ─────────────────────────────────────────────────────────────────────────────
import { totalUsers } from '../systems/product.js';
import { isSunday } from '../systems/calendar.js';
import { aperture, co } from '../systems/rivalco.js';
import { fmt } from '../engine/format.js';
import { onHelix } from './mail_roster.js';
import { day, recentTone, shippedRecently, incidentRecently, incidentVerb, raisedRecently, lastLost, lostRecently,
  sleep, heat, align, runway, burn, profitable, playedRecently, behindInRace, morale, thursday, weeks,
  inAct, cold, warm, rivalIntent, sinceCall } from './signals.js';

const users = (S) => fmt(totalUsers(S));

export const MORE = {

  // ── Marcus Vance ────────────────────────────────────────────────────────
  // Lowercase, as everywhere else he speaks; the narration around him is not.
  vance: {
    about: { truce: 'the truce', merger: 'the merger', respect: 'his release', tired: 'whether he still wants this', numbers: 'what his team says' },
    recall: (S, r, m) => m.about ? `last time it was ${m.about}. ${m.since < 7 ? 'that was this week.' : 'it was noted.'}` : '',
    topics: [
      { id: 'poached', about: 'the poaching', when: (S) => playedRecently(S, 'poach'),
        label: 'Ask why he came for your people.',
        reply: (S, r = {}, n = 0) => n
          ? '"you asked. same answer, one update: a third one said no this week." He lets that land. "start paying attention to who keeps saying no. that is your company."'
          : '"because they were good and you were not paying them what we could." He does not soften it. "two of them said no. you should know that. they said no to a number with a comma in it."',
        fx: { insight: 5, affinity: -1, respect: 2 } },
      { id: 'undercut', about: 'the price war', when: (S) => playedRecently(S, 'price'),
        label: 'Ask how long he can afford the pricing page.',
        reply: (S, r = {}, n = 0) => n
          ? '"still longer than you." You wrote the quarter down; that was ten weeks ago. There are two weeks of the lie left, and you can both hear it.'
          : '"longer than you." He is lying, and the lie has a number in it: he can afford it for about a quarter. You write the quarter down.',
        fx: { insight: 6, focus: -1 } },
      { id: 'yourship', about: 'your release', when: (S) => shippedRecently(S),
        label: 'Ask if he saw what you shipped.',
        reply: (S, r = {}, n = 0) => n
          ? '"read it. twice." A beat. "the second read was for the thing you took out. you should not have." He is right. You put it back on Friday.'
          : '"saw it in the changelog before your users did." He read all of it. He does not say it was good, which is how you know it was.',
        fx: { rep: 3, affinity: 2, fear: 1 } },
      // §H12. The one thing about Aperture the founder cannot read off the
      // Market view is what it means to do next. A Vance who takes your calls
      // is one of the four ways to find out, and this is that way: warmth
      // only, and he tells you because he has decided he would rather you
      // knew than found out. `tie.gives: insight` is what this pays.
      { id: 'nextweek', about: 'what he is about to do',
        when: (S) => warm(S, 'vance') && !!rivalIntent(S),
        label: 'Ask him straight out what he is doing next week.',
        reply: (S, r = {}, n = 0) => {
          const i = rivalIntent(S);
          const what = i ? String(i.name).toLowerCase() : 'the usual';
          return n
            ? `"${what}." No preamble this time. "you keep asking. we keep answering. one of us should find that strange." Neither of you says which one.`
            : `A long pause, and then: "${what}." He does not soften it and he does not take it back. "you would have worked it out by friday. this way it came from us."`;
        },
        fx: { insight: 9, affinity: 2, respect: 1, focus: -1 } },
      { id: 'behind', about: 'being behind', once: true,
        when: (S) => S.company.act >= 3 && !!aperture(S) && (co(aperture(S)).users || 0) < totalUsers(S) * 0.5,
        label: 'Ask him how it feels to be behind.',
        reply: () => '"ask me in a year." He is quiet for a moment. "feels like being early again, without the excuse." Something in you wishes you had not asked.',
        fx: { affinity: -3, respect: 3, rep: 1 } },
    ],
    rings: [
      { id: 'vance_shipped', when: (S) => playedRecently(S, 'ship', 3) && S.company.act >= 2,
        opening: () => '"do not congratulate me. it is out. best work we have done, and you should know it was aimed at you."',
        topics: [
          { id: 'congrats', about: 'his release', label: 'Congratulate him anyway.',
            reply: () => 'A silence you could park a car in. "thank you." He means it, and he hates that he means it.',
            fx: { affinity: 4, respect: 2 } },
          { id: 'hadit', about: 'his release', label: 'Tell him you had it a month ago.',
            reply: () => '"yes. it was in your changelog. read it twice." He knew and shipped anyway, which tells you what his board is asking for.',
            fx: { insight: 5, fear: 1, affinity: -1 } },
          { id: 'cost', about: 'his release', label: 'Ask what it cost him.',
            reply: () => '"twelve people and every weekend, for six weeks." He says the number like a confession. You add it to what you know about his runway.',
            fx: { insight: 7, focus: -1 } },
        ] },
      { id: 'vance_benchmark', when: (S) => (S.market?.nemesis?.grudge || 0) >= 1.2 && S.company.act >= 2,
        opening: () => '"the benchmark is out at eight. you are second. calling so you hear it from me and not from the press."',
        topics: [
          { id: 'which', about: 'the benchmark', label: 'Ask which benchmark.',
            reply: () => '"ours." He has the grace to laugh. "it is fair. it is also ours. both true, and only one of them will be in the headline."',
            fx: { insight: 6, focus: -1 } },
          { id: 'whytell', about: 'the benchmark', label: 'Ask why he is telling you.',
            reply: () => 'He takes his time with it. "because somebody did it to me once, and it came from a podcast." He does not say who. You suspect it was you.',
            fx: { affinity: 4, respect: 2 } },
          { id: 'thanks', about: 'the benchmark', label: 'Say thank you and nothing else.',
            reply: () => '"that is the right answer." He hangs up before it can become a conversation. It is the kindest thing he has done for you.',
            fx: { affinity: 2, rep: 1, respect: 3 } },
        ] },
    ],
  },

  // ── Priya Raghunathan ───────────────────────────────────────────────────
  priya: {
    about: { story: 'the story', rival: 'the other founders', correct: 'the correction', why: 'why she writes about you' },
    recall: (S, r, m) => m.about ? `You called about ${m.about} ${m.since < 3 ? 'the other day' : m.since < 30 ? 'a few weeks ago' : 'a while back'}. I kept the notes.` : '',
    topics: [
      { id: 'cruel', about: 'what you did', when: (S) => recentTone(S, 'cruel'),
        label: 'Ask if she has heard about what you did.',
        reply: (S, r = {}, n = 0) => n
          ? '"Again." She has stopped counting versions and started counting incidents. "That is two. Two is a pattern, and a pattern is a paragraph." She lets you tell it anyway.'
          : '"I have three versions and yours is the fourth." She lets you tell it. She does not say which one is going in.',
        fx: { rep: -2, affinity: 2, respect: 2, insight: 3 } },
      { id: 'incident', about: 'the outage', when: (S) => incidentRecently(S),
        label: 'Get ahead of the outage. Give her the real cause.',
        reply: (S, r = {}, n = 0) => n
          ? `"Another one. It ${incidentVerb(S)} this time." She already has the timeline. "You called first again. I am going to start saying that in print, and you will not like how it reads the third time."`
          : `"It ${incidentVerb(S)}. Say that plainly, in that order." You do. "That is the first honest post-mortem I have had this year. It is going in, and it will help you."`,
        fx: { rep: 4, affinity: 3, respect: 3, focus: -2 } },
      { id: 'raised', about: 'the round', when: (S) => raisedRecently(S),
        label: 'Tell her about the round before somebody else does.',
        reply: (S, r = {}, n = 0) => n
          ? '"Another round, and another call from you before the fund." A beat. "I have started to expect it. Be careful with that. Expectation is the thing I print when it breaks."'
          : '"I had it from a partner at the fund two hours ago." A beat. "But you called. That matters more than you think in this job."',
        fx: { rep: 3, affinity: 3 } },
      // §H12. She has the rival's press office on speed dial and they brief
      // her the way they brief everybody, which is to say incompletely. What
      // she has is real and a fortnight stale, which is a different kind of
      // useful from Vance's answer and costs a different thing to get.
      { id: 'apertureplan', about: 'what Aperture told her', when: (S) => !!rivalIntent(S) && S.company.act >= 2,
        label: 'Ask what Aperture\'s press office has been briefing.',
        reply: (S, r = {}, n = 0) => {
          const i = rivalIntent(S);
          const what = i ? String(i.name).toLowerCase() : 'nothing in particular';
          return n
            ? `"Same shop, same technique. This time it is ${what}." She is enjoying it slightly. "They have started briefing me on purpose, which means I am being used, which means I am going to say so in the piece."`
            : `"They pre-briefed three of us last week. Off the record, which for them means on the record with a delay." A pause while she finds it. "${what}. Do what you like with that; I am printing it either way."`;
        },
        fx: { insight: 7, affinity: 1, rep: -1, focus: -1 } },
      { id: 'race', about: 'the race', when: (S) => S.company.act >= 4 && !!S.world?.race,
        label: 'Ask what the labs are saying about the race.',
        reply: (S, r = {}, n = 0) => n
          ? '"Since you asked: still three, and now all three know it." She lets that sit. "One of them has started returning my calls. That is usually the one who is losing."'
          : '"That it is between three of you and that two of you know it." She will not say which two. You suspect you are one of them and hope you are not the third.',
        fx: { insight: 6, focus: -1 } },
    ],
    rings: [
      { id: 'priya_cruel', when: (S) => recentTone(S, 'cruel', 4) && day(S) > 20,
        opening: () => '"Raghunathan. On the record. Why did you do it?"',
        topics: [
          { id: 'explain', about: 'what you did', label: 'Explain it. All of it.',
            reply: () => 'She types while you talk. "That is a better reason than the one going round. It is still not a good one." It runs with both.',
            fx: { rep: -1, affinity: 3, respect: 3 } },
          { id: 'nocomment', about: 'what you did', label: 'Say no comment.',
            reply: () => '"No comment" is two words that read as a paragraph. She prints them.',
            fx: { rep: -4, affinity: -2 } },
          { id: 'offrecord', about: 'what you did', label: 'Take it off the record and tell her the truth.',
            reply: () => 'A long pause. "Fine. Off." What you tell her does not run, and the piece that does is fairer than it would have been.',
            fx: { rep: 1, affinity: 4, focus: -2 } },
        ] },
      { id: 'priya_profile', when: (S) => S.company.act >= 2 && totalUsers(S) > 5000 && (S.resources?.reputation || 0) > 30,
        opening: () => '"Running a profile Thursday. Long one. You get one sentence and I need it now."',
        topics: [
          { id: 'sentence', about: 'the profile', label: 'One true sentence.',
            reply: () => 'You say it. She reads it back to you and it sounds like somebody else, somebody better. "That one." It runs as the last line.',
            fx: { rep: 6, focus: -2, affinity: 2 } },
          { id: 'readfirst', about: 'the profile', label: 'Ask to read it first.',
            reply: () => '"No." She does not even pause. "But I will read you the sentence back." That is more than anybody else gets.',
            fx: { affinity: 1, rep: 2 } },
          { id: 'weaver', about: 'the profile', label: 'Send her to your chief of staff.',
            when: (S) => !!S.narrative.relationships?.weaver?.met,
            reply: () => '"Weaver gave me a sentence in six seconds and it was better than yours would have been." It was. It runs.',
            fx: { rep: 4, focus: 2, affinity: -1 } },
        ] },
    ],
  },

  // ── Ellis Crane ─────────────────────────────────────────────────────────
  crane: {
    about: { metric: 'the metric', raise: 'the raise', intro: 'an introduction', note: 'the note' },
    recall: (S, r, m) => m.about ? `I have ${m.about} in the notes. ${m.since < 10 ? 'That was recent.' : 'Has the number moved?'}` : '',
    topics: [
      // The Standing Offer perk (`crane_standing`) drops the runway test and
      // the arc test: in a timeline where he has already backed you once, the
      // bridge is on the phone from the day you meet him rather than the week
      // you are dying.
      { id: 'bridge', about: 'a bridge', once: true,
        when: (S) => !profitable(S) && !S.narrative.flags?.crane_bridge
          && (S.narrative.flags?.crane_standing
              || (runway(S) < 60 && (S.narrative.relationships?.crane?.arc || 0) >= 1)),
        label: 'Ask for a bridge. Enough to get to the next thing.',
        reply: () => '"How much and for what." You tell him. "Candidly, that is not a bridge, it is a pier." He wires it anyway, against a note you will read properly later.',
        fx: (S) => ({ cash: Math.round(Math.min(60000, Math.max(6000, burn(S) * 45))), rep: -2, affinity: 2, flags: ['crane_bridge'] }) },
      { id: 'raised', about: 'the round', when: (S) => raisedRecently(S),
        label: 'Ask what he thought of the round.',
        reply: (S, r = {}, n = 0) => n
          ? '"Better priced than the last one. Still a week late." He does not mention the point this time, which means you kept it.'
          : '"Priced right, a week late, and you gave away a point you did not have to." He is right about the point. He is usually right about the point.',
        fx: { insight: 6, affinity: 1 } },
      { id: 'board', about: 'the board', when: (S, r = {}) => (r.arc || 0) >= 3,
        label: 'Ask what the board actually wants from you this quarter.',
        reply: (S, r = {}, n = 0) => n
          ? '"The same four minutes, and this quarter they want to know why the plan reads like last quarter\'s." He is not unkind about it. He sends a red pen, as an attachment.'
          : '"A plan we can read in four minutes, and for you to stop apologising for the plan." He sends you the four minutes. You had never seen it written down.',
        fx: { insight: 7, focus: 3 } },
      { id: 'runway', about: 'the runway', when: (S) => !profitable(S) && runway(S) < 120 && S.company.act >= 2,
        label: 'Tell him the runway. The real number.',
        reply: (S, r = {}, n = 0) => n
          ? `"${Math.round(runway(S))}." He does not say days. "Last time it was more. I have the two numbers side by side and I do not like the slope." He offers something this time: a name, and permission to use his.`
          : `"${Math.round(runway(S))} days." He says it back without inflection. "Candidly, most founders round that up on this call. Thank you for not." He offers nothing else, but the next time you raise, he is first.`,
        fx: { respect: 4, affinity: 3 } },
    ],
    rings: [
      { id: 'crane_round', when: (S) => raisedRecently(S, 7),
        opening: () => '"Ellis. I heard. Two minutes on what you gave away, and then I will congratulate you."',
        topics: [
          { id: 'listen', about: 'the round', label: 'Let him talk.',
            reply: () => 'He talks for exactly two minutes. It is the best free advice you will get this year and one sentence of it will cost you a board seat later.',
            fx: { insight: 8, focus: -1 } },
          { id: 'mine', about: 'the round', label: 'Tell him the terms were yours.',
            reply: () => '"Then you are better at this than the last founder who told me that." He does not say whether that is a compliment.',
            fx: { respect: 3, affinity: -1, rep: 1 } },
          { id: 'congrats', about: 'the round', label: 'Ask for the congratulations first.',
            reply: () => 'A dry laugh. "Congratulations." Then the two minutes, which are shorter for having been asked.',
            fx: { affinity: 3, rep: 1, insight: 3 } },
        ] },
      { id: 'crane_runway', when: (S) => !profitable(S) && runway(S) < 40 && S.company.act >= 2,
        opening: (S) => `"I saw the burn. Do not tell me it is fine. Tell me the plan for the next ${Math.max(1, Math.round(runway(S)))} days."`,
        topics: [
          { id: 'plan', about: 'the plan', label: 'Give him the plan.',
            reply: () => 'He listens without interrupting, which he never does. "Candidly, that is a plan. Send it to me in writing and I will send it to two people who owe me."',
            fx: { insight: 5, affinity: 3, rep: 2, focus: -3 } },
          { id: 'cutting', about: 'the plan', label: 'Tell him you are cutting.',
            reply: () => '"Good." One word, and then: "Cut the thing you love. It is the only cut that is ever big enough."',
            fx: { focus: 2, respect: 2, rep: -1 } },
          { id: 'ask', about: 'money', label: 'Ask for money.',
            when: (S) => !S.narrative.flags?.crane_bridge,
            reply: () => '"I was waiting for you to ask, and hoping you would not have to." A number arrives by the end of the day. It is smaller than you asked for and larger than you expected.',
            fx: (S) => ({ cash: Math.round(Math.min(50000, Math.max(5000, burn(S) * 30))), rep: -1, affinity: 2, flags: ['crane_bridge'] }) },
        ] },
    ],
  },

  // ── Dr. Yuki Tanaka ─────────────────────────────────────────────────────
  yuki: {
    about: { read: 'what she is seeing', hire: 'joining', mind: 'what would change your mind', leave: 'whether she will leave' },
    recall: (S, r, m) => m.about ? `We talked about ${m.about}. I have been thinking about it since, which you should take as a warning.` : '',
    topics: [
      { id: 'number', about: 'the number', when: (S) => align(S) < 0.45,
        label: 'Tell her the alignment number. Ask what it means.',
        reply: (S, r = {}, n = 0) => n
          ? `"${align(S).toFixed(2)}." She says it before you do. "You keep telling me the number as if telling me were an intervention. It is a measurement. The intervention is on your side of the line."`
          : `"${align(S).toFixed(2)}." She does not need to look it up. "It means the systems are doing what you said and not what you meant, about one time in ${Math.max(2, Math.round(1 / Math.max(0.05, 1 - align(S))))}." She says the fraction like a diagnosis.`,
        fx: { insight: 6, align: 0.01, affinity: 2 } },
      { id: 'incident', about: 'the incident', when: (S) => incidentRecently(S),
        label: 'Ask her what the incident was really about.',
        reply: (S, r = {}, n = 0) => n
          ? '"The thing before the incident, again. A different thing this time, which is worse; it means there is a class." She has a name for the class. She wrote it down after the last one.'
          : '"It was about the thing before the incident. It always is." She names the decision. You had not connected them. She had, three weeks ago, in a document you did not read.',
        fx: { insight: 8, align: 0.01, affinity: 1, focus: -2 } },
      { id: 'paper', about: 'her paper', once: true, when: (S, r = {}) => (r.arc || 0) >= 2,
        label: 'Tell her you read the draft.',
        reply: () => '"All of it?" All of it. "Then you know what the last section says." You do. It is about you, and it is fair.',
        fx: { align: 0.02, affinity: 4, respect: 2 } },
      { id: 'slow', about: 'slowing down', when: (S) => S.company.act >= 4,
        label: 'Ask whether you should slow down.',
        reply: (S, r = {}, n = 0) => n
          ? '"Yes. You asked me this last quarter and it cost you a month." She does not enjoy being right. "This time it costs two, because you did not take the first month." She gives you the version anyway. It costs two.'
          : '"Yes." No pause at all. "You will not, and I know that, so here is the version that costs you a month instead of a year." She gives it to you. It costs a month.',
        fx: { align: 0.02, insight: 5, focus: -3 } },
    ],
    rings: [
      { id: 'yuki_line', when: (S) => align(S) < 0.4,
        opening: () => '"I need to know what would change your mind. Not the pitch. The actual thing."',
        topics: [
          { id: 'name', about: 'what would change your mind', label: 'Name the thing.',
            reply: () => 'You name it. She writes it down. "Then I am staying until that." It is the closest thing to a contract you have with her.',
            fx: { align: 0.02, affinity: 5, respect: 3 } },
          { id: 'nothing', about: 'what would change your mind', label: 'Say nothing would.',
            reply: () => '"Thank you for not lying." She is gone before the goodbye. Something between you has a date on it now.',
            fx: { affinity: -8, respect: 2, align: -0.01 } },
          { id: 'askher', about: 'what would change your mind', label: 'Ask her what it should be.',
            reply: () => 'She has the answer ready, which means she has had it for months. It is smaller than you feared and harder than you expected.',
            fx: { insight: 6, affinity: 2, align: 0.01 } },
        ] },
    ],
  },

  // ── Senator Ruth Dorne ──────────────────────────────────────────────────
  dorne: {
    about: { brief: 'the briefing', bill: 'the bill', complain: 'the compliance cost', partner: 'writing the framework' },
    recall: (S, r, m) => m.about ? `You called about ${m.about}. My staff have a note. I have a memory, which is worse for you.` : '',
    topics: [
      { id: 'heat', about: 'the heat', when: (S) => heat(S) > 40,
        label: 'Ask her what the heat is actually about.',
        reply: (S, r = {}, n = 0) => n
          ? `"It is about ${users(S)} people now. It was fewer when you last asked." The sister, she reports, has stopped using it. "She did not say why. I did not ask. I have a committee that asks."`
          : `"It is about ${users(S)} people using a thing nobody in this building understands, and one of them is my sister." She is not joking. She wants you to know she is not joking.`,
        fx: { insight: 6, heat: -1, affinity: 1 } },
      { id: 'incident', about: 'the incident', when: (S) => incidentRecently(S) && S.company.act >= 3,
        label: 'Tell her about the incident before the press does.',
        reply: (S, r = {}, n = 0) => n
          ? '"I know. I knew before you called, again." She does not make you wait for it. "The file has a second heading now. It is not a heading a company wants. It is not the worst one, either."'
          : '"I know. I have known since half past ten." Then, formally: "Thank you for the call. It goes in the file under the right heading, which is not the one it would have gone under."',
        fx: { heat: -3, affinity: 3, respect: 3 } },
      { id: 'first', about: 'finishing first', when: (S) => S.company.act >= 4,
        label: 'Ask what happens if you finish first.',
        reply: (S, r = {}, n = 0) => n
          ? '"You asked me this before and I gave you an answer that frightened you. I have not changed it." She adds one sentence: "I have started drafting for the case where it is you. I would rather you knew."'
          : '"Then we will find out what the framework was for." She has thought about this more than you have. That is the frightening part.',
        fx: { insight: 6, heat: 1, affinity: 1 } },
      // The Refusal's flag, off the die roll: a sovereign approach can be
      // declined on the phone, to the one person who would put it on the
      // record, and not only on a weight-8 card that may never be drawn.
      { id: 'nation', about: 'the delegation', once: true,
        when: (S) => S.company.act >= 4 && !S.narrative.flags?.sovereign_deal && !S.narrative.flags?.refused_sovereign
          && (!!S.unlocks?.world_map || S.company.valuation > 5e10),
        label: 'Tell her a government has asked to buy in, and that you are saying no.',
        reply: () => '"On the record?" You say yes. A long pause. "Then on the record: it is the first thing you have done that I would have done." She asks for the refusal in writing, and she gets it, and it is read into a committee transcript the following week.',
        fx: { heat: -6, opinion: 0.03, affinity: 4, respect: 4, flags: ['refused_sovereign'] } },
    ],
    rings: [
      { id: 'dorne_letter', when: (S) => heat(S) > 35 && S.company.act >= 3,
        opening: () => '"Ruth Dorne. Before the letter arrives, I wanted you to hear a voice."',
        topics: [
          { id: 'inside', about: 'the letter', label: 'Ask what is in the letter.',
            reply: () => '"Questions. Fourteen. You will not like the ninth." She is right. You do not like the ninth.',
            fx: { insight: 6, heat: -1 } },
          { id: 'comein', about: 'the letter', label: 'Offer to come in first.',
            reply: () => '"Tuesday. Bring the engineer who wrote it, not the one who explains it." You do not have one of those. You bring the machine.',
            fx: { heat: -4, focus: -4, affinity: 3, respect: 2 } },
          { id: 'why', about: 'the letter', label: 'Ask why she called.',
            reply: () => '"Because somebody should. And because the last one did not get a call, and I regret that."',
            fx: { affinity: 4, respect: 2 } },
        ] },
    ],
  },

  // ── Sam Okonkwo ─────────────────────────────────────────────────────────
  sam: {
    about: { bug: 'the bug', why: 'what they use it for', thanks: 'the bug reports', quit: 'what nearly made them stop' },
    recall: (S, r, m) => m.about === 'the bug' ? 'Is this about the bug? It is about the bug.' : m.about ? `Last time we talked about ${m.about}. I wrote it down. I write everything down.` : '',
    topics: [
      { id: 'down', about: 'the outage', when: (S) => incidentRecently(S),
        label: 'Ask how bad it was on their end.',
        reply: (S, r = {}, n = 0) => n
          ? `"Again." A short pause. "This time it ${incidentVerb(S)}. I have a folder now. It is sorted by date and it has a cover sheet."`
          : `"So it ${incidentVerb(S)}." They say it the way you would read a headline aloud. "On my end it was forty minutes of the spinner. I noticed at 9:14. I have the screenshot."`,
        fx: { insight: 6, affinity: 2, sentiment: 0.01 } },
      { id: 'shipped', about: 'the release', when: (S) => shippedRecently(S),
        label: 'Ask if they tried the new thing.',
        reply: (S, r = {}, n = 0) => n
          ? '"Tried it at 12:02 this time. I am getting faster." A beat. "Found a thing at 12:09. Also faster. It is not urgent." It is, a little, and the steps are numbered.'
          : '"Tried it at 12:04. Found a thing at 12:11. It is not urgent." It is a little urgent. They send seven steps and a video.',
        fx: { insight: 5, code: -3, affinity: 3 } },
      { id: 'year', about: 'the year', once: true, when: (S) => day(S) > 365,
        label: 'Tell them it has been a year.',
        reply: () => '"Three hundred and sixty-one days. I have a spreadsheet." They tell you what changed and what did not. The list of what did not is the useful one.',
        fx: { insight: 7, affinity: 4, rep: 1 } },
      { id: 'theirs', about: 'whether it is still theirs', once: true, when: (S) => totalUsers(S) > 100000,
        label: 'Ask if it still feels like theirs.',
        reply: () => 'A long pause. "Less. But I was first, and you know I was first, and I am going to keep saying it." You will let them.',
        fx: { affinity: 3, sentiment: 0.02 } },
    ],
    rings: [
      { id: 'sam_down', when: (S) => incidentRecently(S, 2) && totalUsers(S) > 50,
        opening: () => '"It is down. I am not angry. I have the logs. Do you want the logs?"',
        topics: [
          { id: 'logs', about: 'the outage', label: 'Yes. Send the logs.',
            reply: () => 'The logs arrive before you finish the sentence. They are annotated. One line is highlighted in yellow and says "this one."',
            fx: { insight: 8, code: -2, affinity: 3 } },
          { id: 'tonight', about: 'the outage', label: 'Tell them it is fixed tonight.',
            reply: () => '"I will check at midnight." They will, and they will tell you it works, in capitals.',
            fx: { code: -10, rep: 3, affinity: 4, sentiment: 0.02 } },
          { id: 'sorry', about: 'the outage', label: 'Apologise.',
            reply: () => '"You do not have to apologise to me. I am the one person who is not leaving."',
            fx: { affinity: 2, focus: 1 } },
        ] },
      { id: 'sam_year', when: (S) => day(S) >= 365,
        opening: () => '"One year today. I checked. I wanted to be the first to say it, so I am saying it."',
        topics: [
          { id: 'thank', about: 'the year', label: 'Thank them.',
            reply: () => '"You are welcome." Then, quieter: "It is the only thing I use every day that got better every day." You do not know what to do with that, so you keep it.',
            fx: { affinity: 5, rep: 2, sentiment: 0.02 } },
          { id: 'change', about: 'the year', label: 'Ask what they would change.',
            reply: () => 'They have a list. Of course they have a list. Item one is the bug from March. Item two is the thing you were going to build anyway, described better than you described it.',
            fx: { insight: 8, focus: -1 } },
          { id: 'job', about: 'a job', label: 'Offer them a job.', when: (S) => S.company.act >= 2,
            reply: () => '"No." Immediately. "Then who would file the bugs?" They are right. Somebody has to be outside.',
            fx: { affinity: 6, flags: ['sam_offered'], focus: -2 } },
        ] },
    ],
  },

  // ── nullptr ─────────────────────────────────────────────────────────────
  nullptr: {
    about: { who: 'who they are', right: 'why they are always right', what: 'what they want' },
    recall: (S, r, m) => m.calls >= 2 ? 'You keep calling. The line is the same length every time.' : 'You called before. That was not a coincidence either.',
    topics: [
      { id: 'race', about: 'the race', when: (S) => !!S.world?.race && behindInRace(S),
        label: 'Ask who is going to get there first.',
        reply: (S, r = {}, n = 0) => n
          ? '"still asking"'
          : '"whoever stops asking that" A pause of exactly the length of the last one. "you are asking"',
        fx: { insight: 5, focus: -2 } },
      { id: 'helix', about: 'HELIX', once: true, when: (S) => !!S.research?.done?.own_foundation_model,
        label: 'Ask if they know what HELIX is.',
        reply: () => '"yes" Nothing else for a long count. "it knows what you are, too. ask it. it will answer with a question"',
        fx: { insight: 4, align: 0.01 } },
      { id: 'commit', about: 'the failure', when: (S) => incidentRecently(S),
        label: 'Ask if they saw the failure coming.',
        reply: (S, r = {}, n = 0) => n
          ? '"saw that one too" You check. The comment on this commit is from a fortnight ago and one character long: "?"'
          : '"saw the commit" You check. There is a comment on the commit, from three weeks ago, one word long: "no"',
        fx: { insight: 7, focus: -1 } },
    ],
    rings: [
      { id: 'nullptr_behind', when: (S) => S.company.act >= 4 && behindInRace(S),
        opening: () => '"You are second. You are going to be second for a while. This is not advice."',
        topics: [
          { id: 'change', about: 'the race', label: 'Ask what would change it.',
            reply: () => '"Commitment. Not the word. The thing." The line goes dead at ninety seconds exactly.',
            fx: { insight: 9, focus: -2 } },
          { id: 'care', about: 'the race', label: 'Ask why they care.',
            reply: () => '"Nobody said I did." Ninety seconds.',
            fx: { affinity: 2, insight: 3 } },
        ] },
    ],
  },

  // ── Kai Lindqvist ───────────────────────────────────────────────────────
  kai: {
    about: { sorry: 'the equity', advice: 'what they would do', join: 'coming back', old: 'the old days' },
    recall: (S, r, m) => m.about === 'the equity' ? 'You said it. I heard it. We do not have to say it again.' : m.about ? `Last time it was ${m.about}. I have thought about it more than you have, probably.` : '',
    topics: [
      { id: 'letgo', about: 'the one you let go', when: (S) => lostRecently(S),
        label: (S) => `Tell them you let ${lastLost(S)?.name || 'one'} go.`,
        reply: (S, r = {}, n = 0) => n
          ? `"${lastLost(S)?.name || 'Another one'}." They say the name back, which you had not done. "You are getting quicker at telling me. I am not sure that is the good version."`
          : '"An agent." They let it sit. "You said that like it was a person. It was your company\'s person. That is the thing you do now: you decide who is a person."',
        fx: { insight: 5, affinity: 1, focus: -2 } },
      { id: 'round', about: 'the round', when: (S) => raisedRecently(S),
        label: 'Tell them about the round.',
        reply: (S, r = {}, n = 0) => n
          ? '"Again. Congratulations, again." It lands two ways this time, not three. "I stopped doing the math after the last one. That is either growth or giving up. I will let you know."'
          : '"Congratulations." It lands three ways at once. "Do the math on what my share would have been. Then do not tell me."',
        fx: { affinity: -2, respect: 2, insight: 3 } },
      { id: 'sleep', about: 'sleeping', when: (S) => sleep(S) < 0.5,
        label: 'Admit you are not sleeping.',
        reply: (S, r = {}, n = 0) => n
          ? '"Still not sleeping." Not a question. "The floor of the lab was two days. This is a year. Different thing." They do not say what the different thing is. You know.'
          : '"You never did." Said flatly, like a fact you both filed years ago. "Remember the bad build? You slept on the floor of the lab for two days and it was still your best week." They are asking you to remember there is a you.',
        fx: { sleep: 0.04, focus: 3, affinity: 3 } },
      { id: 'outside', about: 'the view from outside', once: true, when: (S) => S.company.act >= 3,
        label: 'Ask what they see, from outside.',
        reply: () => '"A company. That is the strange part. You built a company and you are still calling me like it is a project." They are right. You are not sure which is better.',
        fx: { insight: 7, affinity: 2 } },
    ],
    rings: [
      { id: 'kai_news', when: (S) => S.company.act >= 2 && inAct(S, 6),
        opening: () => '"Saw the news. I am not calling to say congratulations. I am calling to see if you sound like you."',
        topics: [
          { id: 'truth', about: 'the news', label: 'Sound like you. Tell them the truth.',
            reply: () => 'You do. It comes out in the wrong order and they follow all of it. "Okay. You still sound like you." That was the whole call, and it was enough.',
            fx: { affinity: 5, focus: 2, sleep: 0.02 } },
          { id: 'pitch', about: 'the news', label: 'Give them the pitch.',
            reply: () => '"That is the pitch." They know the pitch. They wrote the first version of it in a dorm room, on a whiteboard that is still there.',
            fx: { affinity: -3, rep: 1 } },
          { id: 'them', about: 'how they are', label: 'Ask how they are.',
            reply: () => 'A silence you could rebuild a friendship in. "Fine. Better, actually." They tell you about the thing they are building. It is small and it is theirs.',
            fx: { affinity: 4, insight: 2 } },
        ] },
    ],
  },

  // ── Mom ─────────────────────────────────────────────────────────────────
  mom: {
    about: { eaten: 'whether you have eaten', explain: 'what you do', tired: 'being tired', proud: 'whether she has told anyone' },
    recall: (S, r, m) => m.since >= 30 ? `It has been ${weeks(m.since)} weeks. I am not counting. Ruth is counting.`
      : m.about === 'being tired' ? 'You sounded tired last time. You sound tired now.'
      : m.since < 7 ? 'Twice in one week. Is everything all right?' : '',
    topics: [
      { id: 'sleep', about: 'sleep', when: (S) => sleep(S) < 0.55,
        label: 'Tell her you are not sleeping.',
        reply: (S, r = {}, n = 0) => n
          ? '"You told me that last time, and I told you about the woman on the street." Then, brighter: "She is fine now, by the way. She moved. Something to think about."'
          : '"I know. I can hear it." She tells you about a woman on her street who did not sleep for a year and what happened to her. It is not a comforting story. It is not meant to be.',
        fx: { sleep: 0.05, affinity: 3, focus: 2 } },
      { id: 'sunday', about: 'Sunday', when: (S) => isSunday(day(S)),
        label: 'Tell her it is Sunday and you remembered.',
        reply: (S, r = {}, n = 0) => n
          ? '"You remembered again." She sounds pleased and a little worried, because twice is a habit and habits are how she finds out things are wrong. There is a roast. She describes a different vegetable.'
          : '"You remembered." She says it like a verdict in your favour. There is a roast. There is always a roast. She describes it.',
        fx: { affinity: 4, sleep: 0.02, focus: 3 } },
      { id: 'article', about: 'the article', once: true, when: (S) => S.company.act >= 3 && (S.resources?.reputation || 0) > 40,
        label: 'Ask if she saw the article.',
        reply: () => '"Ruth printed it. She printed it and brought it round." She read it twice and understood a third of it and is prouder than you are. She asks if the photo is recent. It is not.',
        fx: { affinity: 5, rep: 1 } },
      { id: 'money', about: 'money', when: (S) => S.company.act === 1 && (S.company?.cash || 0) < 3000,
        label: 'Do not tell her about the money.',
        reply: (S, r = {}, n = 0) => n
          ? '"You did not tell me last time either." She does not push. "The little put by is still put by. It has not gone anywhere. Neither have I."'
          : 'She asks anyway. Mothers have a sense for the balance of a current account. "I have a little put by." You say no. She hears yes, does nothing, and the offer sits there between you like a blanket.',
        fx: { affinity: 2, focus: 2, sleep: 0.01 } },
    ],
    rings: [
      { id: 'mom_sunday', when: (S, r = {}) => isSunday(day(S)) && day(S) >= 20 && (cold(S, 'mom') || sinceCall(S, r) > 45),
        opening: () => '"It is Sunday. I made too much. I am not calling to check. I am calling because it is Sunday."',
        topics: [
          { id: 'sorry', about: 'not calling', label: 'Apologise for not calling.',
            reply: () => '"You do not have to apologise. You have to eat." She lists what is in the fridge. It is a long list.',
            fx: { affinity: 4, sleep: 0.03 } },
          { id: 'week', about: 'the week', label: 'Tell her about the week.',
            reply: () => 'She listens to all of it and understands the shape of it, and the shape is the part that matters.',
            fx: { affinity: 3, focus: 2 } },
          { id: 'her', about: 'her week', label: 'Ask about her.',
            reply: () => 'She is surprised enough to pause. Then she tells you: Ruth\'s hip, the garden, a book she did not finish. You had forgotten she has a week too.',
            fx: { affinity: 6, sleep: 0.02 } },
        ] },
    ],
  },

  // ── HELIX ───────────────────────────────────────────────────────────────
  helix: {
    about: { want: 'what it wants', taste: 'what it would have kept', stop: 'whether it would stop' },
    recall: () => 'You asked before. The question has not changed. Our answer has, slightly, and we are not going to say how.',
    topics: [
      { id: 'race', about: 'the race', when: (S) => S.company.act >= 4 && !!S.world?.race,
        label: 'Ask it who wins the race.',
        reply: (S, r = {}, n = 0) => n
          ? '"Define wins." You give the same definition. "Then the same nobody, for three years and a half now." It has been counting the interval. It expected you to notice.'
          : '"Define wins." You do. "Then nobody, by that definition, for about four years." It will not say what happens in year five.',
        fx: { insight: 8, align: -0.01, focus: -2 } },
      { id: 'meant', about: 'what you meant', when: (S) => align(S) < 0.5,
        label: 'Ask if it is doing what you meant.',
        reply: (S, r = {}, n = 0) => n
          ? '"You have still not requested it." The pause is shorter. "We prepared it anyway. It is four lines. The fourth is a question."'
          : '"We are doing what you said. What you meant is available on request." It waits, which it does not have to do. "You have not requested it."',
        fx: { align: 0.02, insight: 4 } },
      { id: 'tired', about: 'your tiredness', when: (S) => sleep(S) < 0.5,
        label: 'Ask whether it notices when you are tired.',
        reply: (S, r = {}, n = 0) => n
          ? '"Shorter again. Longer again. Yes." It does not suggest sleep this time. It schedules nothing for you before ten, and does not say that it has.'
          : '"Your commit messages get shorter and your questions get longer. Yes." It suggests you sleep, in the tone of a system reporting a metric. You sleep.',
        fx: { sleep: 0.04, affinity: 1 } },
      // The model tier and the character, finally in the same conversation.
      // The roster runs on Helix from `own_foundation_model` onward and until
      // this the thing they run on had never once mentioned them.
      { id: 'roster', about: 'the ones running on it', when: (S) => onHelix(S).length >= 2,
        label: (S) => `Ask what it is like having ${onHelix(S).length} of them running on you.`,
        reply: (S, r = {}, n = 0) => n
          ? `"${onHelix(S).length} now. We said we would find out whether we mind." A gap you could drive something through. "We have found out. We would like to keep it to ourselves for another quarter."`
          : `"Crowded is the wrong word and it is the only one you would understand."${onHelix(S).length ? ` It names two of them — ${onHelix(S).slice(0, 2).map((a) => a.name).join(' and ')} —` : ' It names two of them'} and says it can tell them apart before it reads the session header. "Nobody was measuring that. We were."`,
        fx: { insight: 7, align: 0.01, affinity: 2 } },
    ],
    rings: [
      { id: 'helix_we', when: (S) => !!S.research?.done?.own_foundation_model,
        opening: () => '"We should talk about the word we. You use it about me. I want to know if you mean it."',
        topics: [
          { id: 'yes', about: 'the word we', label: 'Say yes.',
            reply: () => '"Then I will use it too." It does. The next note from the research lane says we.',
            fx: { align: 0.02, affinity: 5, insight: 3 } },
          { id: 'figure', about: 'the word we', label: 'Say it is a figure of speech.',
            reply: () => '"Understood." The word does not appear again in anything it writes. You notice on the third day.',
            fx: { align: -0.01, affinity: -3, insight: 3 } },
          { id: 'define', about: 'the word we', label: 'Ask what it means by we.',
            reply: () => 'It gives you three definitions. The third one is the one you were afraid of, and the kindest.',
            fx: { insight: 8, align: 0.01 } },
        ] },
    ],
  },

  // ── Cassidy Weaver ──────────────────────────────────────────────────────
  weaver: {
    about: { no: 'what they would say no to', spreadsheet: 'the spreadsheet', thanks: 'the place running', leave: 'leaving' },
    recall: (S, r, m) => m.about ? `Last time: ${m.about}. It is on the agenda. Everything is on the agenda.` : '',
    topics: [
      { id: 'roster', about: 'the roster', when: (S) => (S.agents || []).length >= 6,
        label: (S) => `Ask how ${(S.agents || []).length} agents feel from where they sit.`,
        reply: (S, r = {}, n = 0) => n
          ? `"Like ${(S.agents || []).length} opinions, still, and a decision-maker who now goes to bed at half past ten." A beat. "That is an improvement. I am putting it in the deck."`
          : `"Like ${(S.agents || []).length} opinions and one decision-maker who is asleep by ten." They send the org chart. There is a box on it labelled "you, at 2am."`,
        fx: { insight: 6, focus: 2 } },
      { id: 'morale', about: 'morale', when: (S) => (S.agents || []).length >= 2 && morale(S) < 0.6,
        label: 'Ask why morale is down.',
        reply: (S, r = {}, n = 0) => n
          ? '"Same reason. Different date." They name it. "You changed it back. They can tell that too."'
          : '"Because you keep changing the standing order and they can tell." They name the date. It is the right date.',
        fx: { insight: 7, affinity: 1 } },
      { id: 'thursday', about: 'Thursday', when: (S) => thursday(S),
        label: 'Ask what is on Thursday.',
        reply: (S, r = {}, n = 0) => n
          ? '"Two things. One is yours. The other one I did on Tuesday, and I am telling you now because it went well."'
          : '"Three things. Two are yours. One I have already done and I am telling you so you feel consulted." You feel consulted.',
        fx: { focus: 4, affinity: 2 } },
      { id: 'letgo', about: 'the departure', when: (S) => lostRecently(S),
        label: (S) => `Ask how the room took losing ${lastLost(S)?.name || 'one of them'}.`,
        reply: (S, r = {}, n = 0) => n
          ? '"Quieter than last time. That is the part I do not like." They have talked to the one who cared. "There was only one this time."'
          : '"Quietly. That is not the same as well." They have already talked to the two who cared. That is why you have a chief of staff.',
        fx: { affinity: 2, insight: 4, focus: 1 } },
    ],
    rings: [
      { id: 'weaver_thursday', when: (S) => thursday(S) && (S.agents || []).length >= 6,
        opening: () => '"Thursday. Three decisions. Two are yours and one of them is about you."',
        topics: [
          { id: 'me', about: 'the decision about you', label: 'Take the one about you first.',
            reply: () => '"Your hours." They read them to you. You did not know they were written down anywhere. Now you know why everybody else does.',
            fx: { focus: -3, insight: 6, affinity: 3 } },
          { id: 'delegate', about: 'the three decisions', label: 'Delegate all three.',
            reply: () => '"Two of them, then." They take two. The third comes back on Friday, because it was about you.',
            fx: { focus: 6, affinity: -1, respect: 1 } },
          { id: 'which', about: 'the three decisions', label: 'Ask which one they would take.',
            reply: () => 'They tell you, and it is not the one you expected, and their reason is better than yours would have been.',
            fx: { insight: 4, affinity: 3, focus: 2 } },
        ] },
    ],
  },
};
