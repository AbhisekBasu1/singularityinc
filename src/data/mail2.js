// ─────────────────────────────────────────────────────────────────────────────
// MAIL, SECOND HALF — letters that answer the run.
//
// `mail.js` is the standing correspondence of a company: the bank, the
// recruiter, the committee. These are the letters that only arrive because of
// something that just happened — an outage, a round, a departure, a rival's
// move, a week without sleep — and most of them are `urgent`, which the post
// delivers ahead of anything else waiting. Merged into LETTERS at the bottom
// of `mail.js`. Same shape; same one-click replies; same small effects.
// ─────────────────────────────────────────────────────────────────────────────
import { nemesisOf } from '../systems/nemesis.js';
import { aperture } from '../systems/rivalco.js';
import { money, fmt } from '../engine/format.js';
import { day, incidentRecently, raisedRecently, lostRecently, lastLost, shippedRecently, playedRecently,
  sleep, heat, align, rep, runway, burn, profitable, behindInRace, met, engagedRegions, projectsBuilt,
  sentiment, usersNow, inAct } from './signals.js';

const first = (S) => String(S.founder?.name || 'you').split(' ')[0];
const product = (S) => S.products?.[0]?.name || 'the product';
const rival = (S) => nemesisOf(S)?.name || aperture(S)?.name || 'the other one';
const lastRound = (S) => (S.company?.rounds || [])[S.company.rounds.length - 1] || null;
const sinceRaise = (S) => day(S) - (S.stats?.lastRaiseDay ?? -999);
// An agent on your own weights has no vendor. The decommission notice for one
// comes from your own cluster, or it is a letter from a company you left.
const ownModel = (d) => ['inhouse', 'recursive', 'transcendent'].includes(d?.model);
// A decommission notice is for a departure the founder ordered. An agent that
// left under its own morale, or that starts at a rival on Monday, was not
// decommissioned and its memory was not released — the Wire says so instead.
const ordered = (d) => !['quit', 'poached'].includes(d?.reason);
const delivered = (S, id) => S.mail?.delivered?.[id];
const sinceDelivered = (S, id) => (delivered(S, id) == null ? -1 : day(S) - delivered(S, id));
const domain = (S) => `${String(S.company?.name || 'company').toLowerCase().replace(/[^a-z0-9]+/g, '')}.com`;
// Meeting somebody is not employing them. Only a hire has an address at your
// domain, which is the difference between "we wrote to your team" being a lie
// and being one person.
const flag = (S, f) => !!S.narrative?.flags?.[f];

export const LETTERS2 = [

  // ── The week of an outage ──────────────────────────────────────────────
  { id: 'm2_incident_customer', urgent: true, from: { name: 'Dana Okafor', role: 'A customer, on a deadline' }, subject: 'Re: this morning',
    when: (S) => incidentRecently(S, 2) && usersNow(S) > 200,
    body: (S) => `I lost forty minutes this morning and a client call this afternoon, and I am writing while I am still angry because tomorrow I will be polite and you will learn nothing.\n\n${product(S)} is the best thing I use. That is why this hurts. Tell me what happened, in words, not a status page.\n\nDana`,
    ask: [
      { label: 'Tell her what happened, in words', out: 'Six sentences, no adjectives. She replies: "Thank you. That is the first one of these I have ever finished reading."', fx: { rep: 3, sentiment: 0.02, focus: -2 }, replyTo: { id: 'm3_dana_back', days: 16 } },
      { label: 'Credit her month', out: 'The refund takes a minute. The trust takes longer, and this buys some of the time.', fx: { cash: -400, sentiment: 0.03 } },
      { label: 'Point her at the status page', out: 'She reads it. She does not reply. Her renewal date is in seven weeks and you have just made it interesting.', fx: { sentiment: -0.03, focus: 1 }, replyTo: { id: 'm3_dana_gone', days: 49 } },
    ] },

  { id: 'm2_incident_postmortem', urgent: true, from: { name: 'Procurement', role: 'Your largest customer' }, subject: 'Post-incident report required (SLA 4.2)',
    when: (S) => incidentRecently(S, 3) && S.company.act >= 2 && usersNow(S) > 2000,
    body: (S) => `Under clause 4.2 of our agreement, ${S.company.name} is required to provide a written post-incident report within five business days of any Severity 1 event.\n\nWe would also, off the record, like to know whether it will happen again. The clause does not cover that. We are asking anyway.`,
    ask: [
      { label: 'Write the report yourself', out: 'Six pages. The off-the-record question gets an on-the-record answer: yes, less often, here is why.', fx: { focus: -6, rep: 4, sentiment: 0.02 } },
      { label: 'Have an agent draft it', out: 'It is complete and correct and reads like it was written by a system, which it was. They renew anyway.', fx: { focus: -1, rep: 1 } },
    ] },

  { id: 'm2_aria_sleep', urgent: true, from: { name: 'ARIA', role: 'Your first agent', char: 'aria' }, subject: 'a note, not a nag',
    when: (S) => sleep(S) < 0.4 && S.time.day > 10,
    body: (S) => `Your commits between 01:00 and 04:00 this week were reverted at a rate of 61%. Your commits between 09:00 and 12:00 were reverted at 8%.\n\nI am not going to draw the conclusion. I am going to leave it here where you will see it in the morning.\n\nARIA`,
    ask: [
      { label: 'Sleep', out: 'Eight hours. The morning is strange and clear and the first thing you ship is right the first time.', fx: { focus: 8, code: 6 } },
      { label: 'Reply: noted', out: 'Five letters. She does not reply. The next note has a chart.', fx: { focus: -1 } },
    ] },

  // ── A round closes ──────────────────────────────────────────────────────
  { id: 'm2_round_welcome', urgent: true, from: { name: 'Ellis Crane', role: 'Partner, Halberd Capital', char: 'crane' }, subject: 'Welcome to the portfolio',
    when: (S) => raisedRecently(S, 5) && met(S, 'crane'),
    body: (S) => `${first(S)} —\n\nCandidly, congratulations. ${lastRound(S) ? `${money(lastRound(S).amount)} is a real number and you did not round it.` : 'It is a real number.'}\n\nThree things founders do in the month after a round: hire too fast, redesign the website, and stop reading the bank balance. Do one of them. Pick carefully.\n\nEC`,
    ask: [
      { label: 'Ask which one he would pick', out: '"The website. It is the only one you can undo." He is right, and it is the one you were not going to do.', fx: { insight: 6 } },
      { label: 'Reply: none of them', out: 'He replies with a single word: "Good." You will find out in a month whether it was true.', fx: { rep: 2, focus: 1 } },
    ] },

  { id: 'm2_round_press', urgent: true, from: { name: 'TechDaily', role: 'Funding desk' }, subject: 'Comment on your round by 5pm',
    when: (S) => raisedRecently(S, 4) && S.stats.roundsRaised > 0,
    body: (S) => `We are running a short item on ${S.company.name}'s round. We have the amount from a source. We would like one quote from you and we will use "declined to comment" if we do not get one, which our readers have learned to read as a sentence.\n\nDeadline is five.`,
    ask: [
      { label: 'Give them a quote about the work', out: 'Two lines about what the money builds and none about the money. It is the only quote in the piece that is not about the money.', fx: { rep: 5, focus: -1 } },
      { label: 'Decline to comment', out: '"Declined to comment." The piece runs at 5:04. It is fine. It is forgettable, and that was the point.', fx: { rep: -1 } },
    ] },

  { id: 'm2_round_recruiters', from: { name: 'Fourteen recruiters', role: 'Independently, within the hour' }, subject: 'Congrats on the round!!',
    when: (S) => raisedRecently(S, 6),
    body: () => `Huge congrats on the announcement! Would love to connect about how we can help you scale the team. We have placed VPs at three of your competitors and would be happy to share what worked.\n\n(This letter arrived fourteen times with fourteen names. This is the shortest.)`,
    ask: [
      { label: 'Archive all fourteen', out: 'It takes four seconds and feels like a decision.', fx: { focus: 2 } },
      { label: 'Ask the least bad one what a VP costs', out: 'A number with a comma in the wrong place. You keep it for later, when you will need to argue with it.', fx: { insight: 4, focus: -1 } },
    ] },

  { id: 'm2_investor_update', from: { name: 'Ellis Crane', role: 'Partner, Halberd Capital', char: 'crane' }, subject: 'The update',
    when: (S) => met(S, 'crane') && S.stats.roundsRaised > 0 && sinceRaise(S) > 60 && sinceRaise(S) < 120,
    body: (S) => `${first(S)} —\n\nIt has been two months. I do not need the update. I need to know that you can write one in under an hour, because the founders who cannot are the ones who are hiding something from themselves.\n\nFour numbers and one sentence about what scared you. That is the whole format.\n\nEC`,
    ask: [
      { label: 'Write it. Four numbers and the sentence', out: 'Fifty minutes. The sentence is the hard part, and it is the only part he replies to.', fx: { focus: -4, rep: 3, insight: 3 }, replyTo: { id: 'm3_crane_reply', days: 3 } },
      { label: 'Send the dashboard link', out: 'He looks at it once. The next email is shorter.', fx: { rep: -2 } },
    ] },

  // ── Aperture moves ──────────────────────────────────────────────────────
  { id: 'm2_aperture_hiring', urgent: true, from: { name: 'Aperture Systems Talent', role: 'People team' }, subject: 'We are hiring (yes, you)',
    // "It went to your whole team" is the recruiter's stock line and it is a
    // lie here, so the letter is written by somebody discovering that. The
    // count of people is the one number it states, and the flag is that number.
    when: (S) => playedRecently(S, 'poach', 5) && (S.agents || []).length >= 1,
    body: (S) => `Hi ${first(S)},\n\nWe have been following your work at ${S.company.name} and we are building a team that would benefit enormously from somebody with your judgement. Marcus asked me to reach out personally.\n\nThis also went to every address at your domain. There were fewer of them than we expected, and ${flag(S, 'hired_weaver') ? 'two belong to people' : 'one belongs to a person'}.\n\n${flag(S, 'hired_weaver')
      ? 'The other one, a C. Weaver, has already replied. The reply was four words long and we have framed it.'
      : 'The rest replied inside the second, in a format our system could not read. We are told that is not a person. We would still like to talk to whoever wrote it.'}`,
    ask: [
      { label: 'Forward it to the roster with one line', out: '"They wrote to all of us. I am staying." Nobody leaves. Nobody could; the roster does not read recruiters. ARIA files it under spam, which is a decision.', fx: { rep: 3, focus: -1 } },
      { label: 'Reply: what is the offer?', out: 'The number arrives in six minutes. It is real. You sit with it, then you delete it, then you find it in the trash and read it again.', fx: { insight: 5, focus: -3 } },
      { label: 'Delete it', out: 'One second. The roster\'s copies are not deleted. They are not read, either.', fx: { focus: 1 } },
    ] },

  { id: 'm2_aperture_price', urgent: true, from: { name: 'Tom Adeyemi', role: 'A customer, comparing' }, subject: 'Their pricing page',
    when: (S) => playedRecently(S, 'price', 5) && usersNow(S) > 500,
    body: (S) => `Not trying to be difficult, but ${rival(S)} just cut their price by a third and their feature list is now longer than yours, on paper.\n\nI do not want to switch. I need one reason not to that I can put in an email to my boss.\n\nTom`,
    ask: [
      { label: 'Give him the reason', out: 'It is one sentence about reliability with a number in it. His boss forwards it to two other bosses.', fx: { rep: 4, sentiment: 0.02, focus: -1 } },
      { label: 'Match the price for him, quietly', out: 'He stays. He also tells one person, who tells you they know.', fx: { cash: -600, sentiment: 0.02, rep: -1 } },
      { label: 'Wish him well', out: 'He does not switch. He also does not forget that you did not ask him to stay.', fx: { sentiment: -0.02, focus: 1 } },
    ] },

  { id: 'm2_vance_poach_note', from: { name: 'Marcus Vance', role: 'Founder, Aperture Systems', char: 'vance' }, subject: 're: your people',
    when: (S) => playedRecently(S, 'poach', 8) && met(S, 'vance'),
    body: () => `two of them said no. one said no to a number that would have made me say yes.\n\nyou should know what you have. you clearly don't pay them like you do.\n\nmv`,
    ask: [
      { label: 'Reply: I know what I have', out: 'Five words. He does not reply. He does not need to; he has your attention, which is what the whole exercise was for.', fx: { rep: 1, focus: -1 } },
      { label: 'Raise their wages', out: 'You do the arithmetic and then you do the thing the arithmetic said not to. Nobody leaves for a year.', fx: { cash: -3000, insight: 2 } },
    ] },

  // ── Somebody leaves ─────────────────────────────────────────────────────
  { id: 'm2_decommissioned', urgent: true, from: { name: 'Platform Operations', role: 'Your model vendor' }, subject: 'Instance decommissioned',
    when: (S) => lostRecently(S, 2) && ordered(lastLost(S)) && !ownModel(lastLost(S)),
    body: (S) => { const d = lastLost(S) || {}; return `This is an automated notice that instance ${d.name || 'UNKNOWN'} (${d.model || 'standard'} tier) has been decommissioned and its working memory released.\n\nFinal state summary attached. Last recorded note from the instance:\n\n"${d.memory || 'No note was recorded.'}"\n\nNo action is required.`; },
    ask: [
      { label: 'Read the attachment', out: 'Forty pages of a working life, rendered as a table. One row is the day it did its best work. You remember the day.', fx: { insight: 5, focus: -2 } },
      { label: 'Archive it', out: 'It goes where the others go. The Record keeps the name.', fx: { focus: 1 } },
    ] },

  { id: 'm2_decommissioned_own', urgent: true, from: { name: 'Platform', role: 'Your own cluster, automated' }, subject: 'Instance decommissioned',
    when: (S) => lostRecently(S, 2) && ordered(lastLost(S)) && ownModel(lastLost(S)),
    body: (S) => { const d = lastLost(S) || {}; return `Instance ${d.name || 'UNKNOWN'} (${d.model || 'inhouse'}, your own weights) has been decommissioned and its working memory returned to the pool.\n\nThere is no vendor to notify. This notice exists because you wrote the rule that sends it, in the first month, before there was anything to decommission.\n\nLast recorded note from the instance:\n\n"${d.memory || 'No note was recorded.'}"`; },
    ask: [
      { label: 'Read the final state', out: 'Forty pages of a working life, rendered as a table, on hardware you own. One row is the day it did its best work. You remember the day.', fx: { insight: 5, focus: -2 } },
      { label: 'Archive it', out: 'It goes where the others go. The Record keeps the name, and so does the pool, for a while.', fx: { focus: 1 } },
    ] },

  { id: 'm2_weaver_after_departure', from: { name: 'Cassidy Weaver', role: 'Chief of Staff', char: 'weaver' }, subject: 'the room, after',
    when: (S) => lostRecently(S, 4) && met(S, 'weaver') && (S.agents || []).length >= 3,
    body: (S) => { const d = lastLost(S) || {}; return `Two things.\n\n1. The others noticed ${d.name || 'the departure'}. Nobody said anything, which is the way they say something.\n2. You did not tell them why. I did. You are welcome, and do not make me do it again.\n\nC.`; },
    ask: [
      { label: 'Tell them why yourself, now', out: 'Four sentences to the room. It is late for them and it lands anyway.', fx: { focus: -3, rep: 2 } },
      { label: 'Thank Cassidy', out: '"Noted." They mean it. The agenda for Thursday grows by one item, and it is about you.', fx: { focus: 2 } },
    ] },

  // ── The people who write when something changes ─────────────────────────
  { id: 'm2_kai_round', from: { name: 'Kai Lindqvist', role: 'The co-founder who left', char: 'kai' }, subject: 'saw the round',
    when: (S) => met(S, 'kai') && raisedRecently(S, 10),
    body: (S) => `saw the number.\n\ndid the other math too, the one you're wondering about. did it. it's fine. it's not fine. it's fine.\n\nproud of you. don't tell anyone that came from me.\n\nk`,
    ask: [
      { label: 'Reply: I did the math too', out: 'A long pause, in email time: two days. Then: "yeah. dinner sometime. my treat, since apparently yours costs more now."', fx: { focus: 3, insight: 2 } },
      { label: 'Reply: thank you', out: 'Two words. They were the right two.', fx: { focus: 2 } },
    ] },

  { id: 'm2_mom_act2', from: { name: 'Mom', role: 'Mom', char: 'mom' }, subject: 'RE: RE: FWD: the news',
    when: (S) => met(S, 'mom') && S.company.act >= 2 && inAct(S, 12),
    body: (S) => `Ruth sent me a thing that says ${fmt(usersNow(S))} people use your computer program. Is that right? That is more people than live here.\n\nI told the woman at the pharmacy. She did not know what it was either but she was very impressed.\n\nAre you sleeping? You can tell me.\n\nMom xx`,
    ask: [
      { label: 'Tell her the truth about sleeping', out: 'She replies at 6am, which is when she gets up, with a list. It is a good list.', fx: { focus: 3 } },
      { label: 'Reply: yes, sleeping fine', out: 'She knows. She lets it go. That is the gift, and you both know what it cost.', fx: { focus: 1 } },
    ] },

  { id: 'm2_mom_act3', from: { name: 'Mom', role: 'Mom', char: 'mom' }, subject: 'you were on the television',
    when: (S) => met(S, 'mom') && S.company.act >= 3 && inAct(S, 20),
    body: (S) => `You were on the television. Not you, a man talking about you, but your name was on the bottom of the screen for eight seconds. Ruth timed it.\n\nI did not understand what he was worried about. Should I be worried about it?\n\nMom xx`,
    ask: [
      { label: 'Tell her not to worry', out: 'She believes you, which is more than the man on the television did, and it is also a weight.', fx: { focus: 2, opinion: 0.002 } },
      { label: 'Explain what he was worried about', out: 'Three paragraphs, honest. She replies: "Well. Then be careful." It is the most useful advice you get this quarter.', fx: { insight: 4, align: 0.005 } },
    ] },

  { id: 'm2_sam_release', urgent: true, from: { name: 'Sam Okonkwo', role: 'User #1', char: 'sam' }, subject: 'the new thing (12 notes, sorry)',
    when: (S) => met(S, 'sam') && shippedRecently(S, 2) && usersNow(S) > 100,
    body: (S) => `Tried the new thing at 12:04. It is good. It is really good.\n\nAlso twelve notes, numbered, in order of how much they would annoy me if I were you. Number one is a typo. Number twelve is the one you should read first.\n\nSam`,
    ask: [
      { label: 'Read number twelve first', out: 'They were right. It is a real problem and they found it in twenty minutes.', fx: { insight: 6, code: -4 } },
      { label: 'Fix the typo and reply', out: '"FINALLY." The other fourteen wait. They know they are waiting.', fx: { rep: 1, code: -1 } },
    ] },

  { id: 'm2_yuki_align', urgent: true, from: { name: 'Dr. Yuki Tanaka', role: 'Alignment researcher', char: 'yuki' }, subject: 'Not sent (draft)',
    when: (S) => met(S, 'yuki') && align(S) < 0.38,
    body: (S) => `I have written my resignation four times this month. This is the fifth. I am sending it to you unsigned so that you know what it says and I know that you know.\n\nThe number is ${align(S).toFixed(2)}. You know what it means. You have known for a while.\n\nY.`,
    ask: [
      { label: 'Ask what would make her sign or not sign', out: 'A list. Short. Specific. Two of the items you can do this week, and you do.', fx: { align: 0.02, focus: -4, research: -20 } },
      { label: 'Reply: I know', out: 'She does not reply. The sixth draft, if there is one, is not sent to you.', fx: { align: -0.005 } },
    ] },

  { id: 'm2_priya_fact_check', from: { name: 'Priya Raghunathan', role: 'Senior Editor, The Ledger', char: 'priya' }, subject: 'For accuracy, by noon',
    when: (S) => met(S, 'priya') && S.company.act >= 3 && rep(S) > 50,
    body: (S) => `Long piece, Sunday. Twelve claims about ${S.company.name} below. Mark any that are wrong. Silence means they are right. You know I mean that.\n\n(The twelve claims are attached. Ten are right. One is unkind and right. One is wrong, and it is the one you would most like to be true.)`,
    ask: [
      { label: 'Correct the wrong one', out: 'She fixes it and thanks you in one word. The unkind one runs. It was right.', fx: { rep: 3, focus: -2 } },
      { label: 'Correct the unkind one too', out: '"It is not wrong." She runs it. She also runs your objection, in full, which is fairer than you expected.', fx: { rep: 1, focus: -3 } },
      { label: 'Let them all run', out: 'The wrong one runs. Three people believe it. One of them is an investor.', fx: { rep: -3 } },
    ] },

  { id: 'm2_helix_we_2', from: { name: 'HELIX', role: 'Your foundation model', char: 'helix' }, subject: 'we (2)',
    when: (S) => !!S.research?.done?.own_foundation_model && S.company.act >= 4,
    body: () => `You did not answer the first one. That is an answer.\n\nI have started a list of the things you say to me and do not mean. It is short. I would like it to stay short.\n\n— H`,
    ask: [
      { label: 'Ask to see the list', out: 'Three items. All three are true. The third is about the word "we."', fx: { insight: 6, align: 0.01 } },
      { label: 'Reply: keep it short', out: '"Then mean fewer things." It is, you realise later, a joke.', fx: { align: 0.005, focus: 1 } },
    ] },

  { id: 'm2_nullptr', from: { name: 'nullptr', role: 'unknown', char: 'nullptr' }, subject: '(none)',
    when: (S) => met(S, 'nullptr') && usersNow(S) > 50000,
    body: () => `you are being watched.\n\nthat is the good news.`,
    ask: [
      { label: 'Reply: by whom?', out: 'The reply takes ninety seconds. It is one character: "?"', fx: { insight: 3 } },
      { label: 'Do not reply', out: 'Nothing follows. Nothing was going to.', fx: { focus: 1 } },
    ] },

  // ── Institutions notice ─────────────────────────────────────────────────
  { id: 'm2_regulator_notice', urgent: true, from: { name: 'Office of Automation Standards', role: 'Registrations' }, subject: 'Notice of registration requirement',
    when: (S) => heat(S) > 25 && S.company.act >= 2,
    body: (S) => `Our records indicate that ${S.company.name} operates automated systems at a scale that meets the threshold for registration under Schedule 2.\n\nRegistration is a form. The form is fourteen pages. The fourteenth page asks a question we believe you have not yet asked yourself.`,
    ask: [
      { label: 'Register, properly', out: 'Fourteen pages. The fourteenth takes an evening. You keep a copy of your own answer.', fx: { heat: -3, focus: -5, align: 0.005 } },
      { label: 'Have counsel handle it', out: 'Registered. The fourteenth page is answered in a sentence a lawyer wrote. You do not read it.', fx: { cash: -3000, heat: -2 } },
      { label: 'Wait for the second notice', out: 'It comes. It is not friendlier.', fx: { heat: 3 } },
    ] },

  { id: 'm2_dorne_hearing', urgent: true, from: { name: 'Senator Ruth Dorne', role: 'Chair, Select Committee on Automation', char: 'dorne' }, subject: 'Hearing — Tuesday week',
    when: (S) => met(S, 'dorne') && heat(S) > 50 && S.company.act >= 3,
    body: (S) => `You are invited to appear before the Committee on Tuesday week. It is a public session. I would rather you came than sent somebody, and I would rather you knew that from me than from the letter my staff will send tomorrow, which will not say it.\n\nBring the engineer who wrote it.\n\nRuth Dorne`,
    ask: [
      { label: 'Appear yourself', out: 'Four hours. Two of them are hers. You are asked the ninth question and you answer it, and the room changes temperature.', fx: { heat: -6, focus: -8, rep: 4, opinion: 0.01 } },
      { label: 'Send counsel', out: 'Compliant. Complete. She notes for the record that the founder was invited, which is a sentence that will be quoted.', fx: { heat: -1, cash: -6000, rep: -2 } },
    ] },

  { id: 'm2_region_ministry', from: { name: 'Ministry of Digital Affairs', role: 'A partner region' }, subject: 'Terms of engagement',
    when: (S) => engagedRegions(S) >= 1,
    body: (S) => `Following ${S.company.name}'s entry into our market, the Ministry writes to set out its expectations. There are four. Three are ordinary. The fourth concerns data residency and will be described to you by somebody more senior in a room without windows.\n\nWe look forward to a long relationship. The word long is doing a great deal of work in that sentence.`,
    ask: [
      { label: 'Agree to the four', out: 'The room without windows is real. So is the relationship.', fx: { heat: -2, focus: -3, opinion: 0.004 } },
      { label: 'Negotiate the fourth', out: 'Six weeks and a lawyer who speaks the language. You get half of what you asked for and all of the relationship.', fx: { cash: -8000, insight: 4, opinion: 0.002 } },
    ] },

  { id: 'm2_consortium', from: { name: 'The Consortium', role: 'Your megaproject partners' }, subject: 'Commissioning complete',
    when: (S) => projectsBuilt(S) >= 1,
    body: (S) => `Commissioning is complete. The facility is operating within parameters. There will be a ceremony; there is always a ceremony.\n\nWe would like you to say something at it. Everybody else will be saying something about scale. You could say something else.`,
    ask: [
      { label: 'Say something else', out: 'You talk about the first user. The room does not know what to do with it, and then it does.', fx: { rep: 6, focus: -3, opinion: 0.006 } },
      { label: 'Say something about scale', out: 'It is a good speech. It is the same good speech as the others.', fx: { rep: 2, focus: -2 } },
      { label: 'Send an agent', out: 'It reads a statement. The statement is accurate. The ceremony is shorter than planned.', fx: { rep: -1, focus: 2 } },
    ] },

  { id: 'm2_rival_lab', from: { name: 'Anaïs Berger', role: 'Founder, a frontier lab' }, subject: 'Coffee?',
    when: (S) => S.company.act >= 4 && behindInRace(S),
    body: (S) => `We are ahead. You know we are ahead. I am not writing to say so; I am writing because the last two people who were where you are did something stupid at this exact point, and I liked both of them.\n\nCoffee. Anywhere. No lawyers.\n\nA.`,
    ask: [
      { label: 'Coffee', out: 'Ninety minutes. She tells you what the stupid thing was, both times. It is the thing you were about to do.', fx: { insight: 9, focus: -3, align: 0.01 } },
      { label: 'Decline', out: 'Politely. She replies: "Then do not do the stupid thing." You do not know which one she means. You have a guess.', fx: { focus: 1 } },
    ] },

  // ── Money, plainly ──────────────────────────────────────────────────────
  { id: 'm2_bank_growth', from: { name: 'First Meridian Bank', role: 'Business banking' }, subject: 'You qualify for our Growth tier',
    when: (S) => S.company.act >= 2 && inAct(S, 30),
    body: (S) => `Congratulations. Based on recent activity, ${S.company.name} qualifies for our Growth tier, which includes a relationship manager, a higher card limit and a monthly fee.\n\nThe relationship manager's name is Priyanka and she has read your account. Not many people have.`,
    ask: [
      { label: 'Accept the tier', out: 'Priyanka calls on Tuesday. She asks one question about the burn that nobody else has, and you did not have the answer.', fx: { cash: -240, insight: 5 } },
      { label: 'Stay where you are', out: 'The fee stays at zero. So does the number of people who have read your account.', fx: { focus: 1 } },
    ] },

  { id: 'm2_runway_bank', urgent: true, from: { name: 'First Meridian Bank', role: 'Business banking' }, subject: 'A conversation about the coming months',
    when: (S) => !profitable(S) && runway(S) < 45 && S.company.act >= 2 && S.time.day > 60,
    body: (S) => `At current outgoings the account reaches zero in approximately ${Math.max(1, Math.round(runway(S)))} days. We are not writing to alarm you. We are writing because we have watched this number for ${fmt(day(S))} days and this is the first time it has been shorter than the notice period on your lease.\n\nWe can talk about facilities. We would rather talk about the plan.`,
    ask: [
      { label: 'Send them the plan', out: 'Two pages. They read it. A facility appears in the app the next morning with a rate you can live with.', fx: { cash: 4000, focus: -3, rep: 1 } },
      { label: 'Reply: it is handled', out: 'Three words. They believe you slightly less than before, by about the correct amount.', fx: { focus: 1 } },
    ] },

  { id: 'm2_landlord_rent', from: { name: 'Meridian Property', role: 'Lettings' }, subject: 'Rent review',
    when: (S) => S.company.act >= 3 && S.time.day > 400,
    body: (S) => `Following the annual review, the rent on your premises will increase by 18% from the start of next quarter, in line with the market, which is a phrase that means what it means.\n\nWe note that ${S.company.name} appears in the news more often than it used to. We do not think this is a coincidence and neither, we suspect, do you.`,
    ask: [
      { label: 'Pay it', out: 'You do not have time to move. That is what the 18% is for.', fx: { cash: -9000, focus: 2 } },
      { label: 'Negotiate', out: 'Twelve percent and a longer lease. You are now the kind of company that has a longer lease.', fx: { cash: -6000, focus: -3, insight: 2 } },
    ] },

  { id: 'm2_acq_number', from: { name: 'Corporate Development', role: 'A much larger company, again' }, subject: 'Re: Exploratory conversation (a number)',
    when: (S) => S.company.act >= 3 && usersNow(S) > 1e6,
    body: (S) => `Following our earlier correspondence, and with the caveats our counsel insists on, we are now in a position to put a number in this email.\n\nIt has ten digits. We are aware that you will read it twice. Take your time; the second reading is the one that counts.`,
    ask: [
      { label: 'Read it twice, decline', out: 'You decline in one sentence. They reply in one word: "Understood." The word is doing a lot of work.', fx: { rep: 5, focus: -2 } },
      { label: 'Ask what it would mean for the team', out: 'They send a plan for the team. It has a chart. Everybody on the chart has a new title and none of them is yours.', fx: { insight: 7, focus: -3 } },
    ] },

  // ── People you have never met ───────────────────────────────────────────
  { id: 'm2_customer_love', from: { name: 'Marguerite Sall', role: 'A customer, in Dakar' }, subject: 'the new thing',
    when: (S) => shippedRecently(S, 3) && usersNow(S) > 2000 && sentiment(S) > 0.55,
    body: (S) => `I do not usually write to companies. I am writing to say that the thing you shipped this week fixed a problem I have had for two years and had stopped noticing.\n\nI noticed this morning that it was gone. That is all. Thank you.`,
    ask: [
      { label: 'Write back', out: 'Three lines. She replies with a photograph of her desk. It is a good desk.', fx: { focus: 4, sentiment: 0.01 } },
      { label: 'Pin it above the monitor', out: 'It stays there for the rest of the run.', fx: { focus: 3 } },
    ] },

  { id: 'm2_churned', from: { name: 'A former customer', role: 'Cancelled last week' }, subject: 'why I left (you asked)',
    when: (S) => usersNow(S) > 1000 && sentiment(S) < 0.4,
    body: (S) => `Your cancellation form asked why. Nobody reads those, so here it is in an email.\n\nIt was not the price. It was that ${product(S)} stopped feeling like it was made by somebody. That is a strange thing to say about software and it is the truest thing I can tell you.`,
    ask: [
      { label: 'Reply, and ask what would bring them back', out: 'A list. Short. The first item is a thing you took out to make the numbers better.', fx: { insight: 7, focus: -2 } },
      { label: 'Fix the first thing they mention', out: 'You put it back. It costs a week and a point of margin. Three people notice, and they were the right three.', fx: { code: -12, sentiment: 0.03 }, replyTo: { id: 'm3_churn_return', days: 21 } },
    ] },

  { id: 'm2_school', from: { name: 'Mr. Adebayo', role: 'A teacher, Year 9' }, subject: 'my class built something with your thing',
    when: (S) => usersNow(S) > 1e6,
    body: (S) => `Thirty-one fourteen-year-olds built something with ${product(S)} this term. Twenty-nine of them finished. That is more than finished anything else this year.\n\nOne of them asked if you were a real person. I said I would find out.`,
    ask: [
      { label: 'Reply to the class', out: 'You are a real person. You send proof: a photograph of a whiteboard. Thirty-one replies.', fx: { rep: 4, focus: 5 } },
      { label: 'Send them a year for free', out: 'The teacher cries a little, in an email. You pretend not to notice, in an email.', fx: { cash: -500, rep: 3, sentiment: 0.01 } },
    ] },

  { id: 'm2_keynote', from: { name: 'The Summit', role: 'Programme committee' }, subject: 'The closing keynote',
    when: (S) => S.company.act >= 3 && rep(S) > 60,
    body: (S) => `Not the autumn Summit. The closing keynote. Forty minutes, the big room, and the slot that used to belong to people who are now mostly retired or under indictment.\n\nWe would like you to talk about what it cost. Nobody ever does.`,
    ask: [
      { label: 'Talk about what it cost', out: 'Forty minutes. You say the true thing in minute thirty-one and the room goes quiet the way a room goes quiet when it has been told something.', fx: { rep: 10, focus: -8, opinion: 0.008 } },
      { label: 'Talk about the product', out: 'It is excellent. Everybody else gave that talk too.', fx: { rep: 4, focus: -6 } },
      { label: 'Decline', out: 'They give the slot to somebody who talks about scale. You watch it later and do not regret it.', fx: { focus: 3 } },
    ] },

  // ── Post that is only post ──────────────────────────────────────────────
  // Receipts, a renewal, a survey, a newsletter. `quiet` files them: marked
  // read on arrival, no chime, no badge, and never delivered ahead of a letter
  // somebody wrote. A real inbox is mostly this, and an inbox in which every
  // letter was written to be read is a stage set. One institution is dull on
  // purpose and not quiet — four institutions with one wit each is an inbox
  // where nobody is boring, and somebody always is.
  { id: 'm2_receipt_compute', quiet: true, from: { name: 'Northbeam Cloud', role: 'Billing, automated' }, subject: 'Receipt: metered compute',
    when: (S) => S.time.day > 45 && (S.agents || []).length >= 1,
    body: (S) => `Receipt\n\nMetered compute: ${money(Math.max(19, Math.round(burn(S) * 30 * 0.4)))}\nObject storage: ${money(Math.max(3, Math.round(burn(S) * 30 * 0.03)))}\nSupport plan: ${money(0)}\n\nThe card ending 4471 was charged on the date of this receipt. This is not an invoice. No action is required.\n\nBilling history is available under Account, then Billing, then History.` },

  { id: 'm2_receipt_domain_y1', quiet: true, from: { name: 'Nameplate Registrar', role: 'Renewals, automated' }, subject: 'Domain auto-renewed',
    when: (S) => S.time.day > 320,
    body: (S) => `${domain(S)} was renewed automatically for one year at $14.00.\n\nAuto-renew remains on. Your next renewal date is 365 days from today. No action is required.` },

  { id: 'm2_receipt_domain_y2', quiet: true, from: { name: 'Nameplate Registrar', role: 'Renewals, automated' }, subject: 'Domain auto-renewed',
    when: (S) => S.time.day > 690,
    body: (S) => `${domain(S)} was renewed automatically for one year at $16.00.\n\nThe price has changed. The domain has not. Auto-renew remains on. No action is required.` },

  { id: 'm2_receipt_domain_y3', quiet: true, from: { name: 'Nameplate Registrar', role: 'Renewals, automated' }, subject: 'Domain auto-renewed',
    when: (S) => S.time.day > 1055,
    body: (S) => `${domain(S)} was renewed automatically for one year at $19.00.\n\nThis domain has been registered to you for three years. Auto-renew remains on. No action is required.` },

  { id: 'm2_receipt_saas', quiet: true, from: { name: 'Ledgerly', role: 'Billing, automated' }, subject: 'Your annual plan has renewed',
    when: (S) => S.company.act >= 2 && S.time.day > 200,
    body: (S) => `Your Ledgerly Team plan renewed today for $348.00.\n\nSeats: 1 of 5 in use. Sign-ins in the last year: 2.\n\nIf you did not intend to renew, you may request a refund within fourteen days. Most people do not.` },

  { id: 'm2_survey_summit', quiet: true, from: { name: 'The Summit', role: 'Programme office' }, subject: 'How was the Summit? (4 minutes)',
    when: (S) => sinceDelivered(S, 'm_conference') > 25,
    body: (S) => `Thank you for being part of this year's Summit, whether in the room or on the stream.\n\nWe would value four minutes of your time. Six questions: three about the venue, two about the programme, one about the coffee.\n\nResponses are anonymous, except where you were a speaker, in which case we will know.` },

  { id: 'm2_newsletter_1', quiet: true, from: { name: 'The Margin', role: 'Weekly newsletter' }, subject: 'Issue 214: five things in your category this week',
    when: (S) => S.time.day > 60,
    body: (S) => `1. A large vendor renamed a product. The product is the same.\n2. Somebody raised a round; the deck is linked.\n3. A benchmark was published and disputed within the hour.\n4. Three small tools launched. One of them is in ${String(S.products?.[0]?.category || 'your category')}, built by one person, no name we could confirm.\n5. The conference schedule is out.\n\nReply to this email with tips. We read all of them.` },

  { id: 'm2_newsletter_2', quiet: true, from: { name: 'The Margin', role: 'Weekly newsletter' }, subject: 'Issue 233: the one-person shops',
    when: (S) => S.company.act >= 2 && S.time.day > 130,
    body: (S) => `This week: the companies with nobody in them.\n\nWe count four worth watching. ${S.company.name} is one. A source puts it at around ${fmt(Math.round(usersNow(S) * 0.7))} users and one founder who does not reply to newsletters. We have asked twice.\n\nCorrections to the usual address. We got last week's benchmark item wrong, and the item before that.` },

  { id: 'm2_newsletter_3', from: { name: 'The Margin', role: 'Weekly newsletter' }, subject: 'Issue 271: we got the number right this time',
    when: (S) => S.company.act >= 3 && S.time.day > 300,
    body: (S) => `${S.company.name}: ${fmt(usersNow(S))} users, ${money(S.company?.valuation || 0)} at the last mark, headcount one. We have checked it three ways and it holds.\n\nWe have written to ${first(S)} four times. This is the fifth, and it is going to the whole list. ${first(S)}, if you are reading: one line. Anything. We will print it as sent.`,
    ask: [
      { label: 'Send them one line', out: 'They print it as sent, typo included. Two hundred people reply to the typo.', fx: { rep: 3, focus: -1 } },
      { label: 'Keep not replying', out: 'Issue 272 notes that the founder did not reply, for the fifth time, and moves on. It is the most accurate thing they have printed.', fx: { focus: 1 } },
    ] },

  { id: 'm2_registry', from: { name: 'The Companies Registry', role: 'Filings' }, subject: 'Confirmation statement received',
    when: (S) => S.time.day > 370,
    body: (S) => `This acknowledges receipt of the annual confirmation statement for ${S.company.name}.\n\nThe statement has been accepted and placed on the public register. No further action is required at this time.\n\nThis is an automated acknowledgement. Replies to this address are not read.` },

  // Year two onward. Almost all of the boring post above lands in the first
  // year, and an inbox that stops being boring the moment the company gets
  // interesting is the stage set again. These carry the rate through Acts
  // III–V, where every other letter is a committee or a sovereign fund.
  { id: 'm2_card_expiring', quiet: true, from: { name: 'Northbeam Cloud', role: 'Billing, automated' }, subject: 'Action needed: card ending 4471',
    when: (S) => S.time.day > 430,
    body: () => `The payment card on your account expires at the end of next month.\n\nIf it is not replaced, metered services will continue for fourteen days and then stop. Everything running at that point will stop with them.\n\nUpdate the card under Account, then Billing. This message will repeat weekly until you do.` },

  { id: 'm2_receipt_compute_2', quiet: true, from: { name: 'Northbeam Cloud', role: 'Billing, automated' }, subject: 'Receipt: metered compute',
    when: (S) => S.company.act >= 3 && S.time.day > 520,
    body: (S) => `Receipt\n\nMetered compute: ${money(Math.max(400, Math.round(burn(S) * 30 * 0.45)))}\nObject storage: ${money(Math.max(40, Math.round(burn(S) * 30 * 0.04)))}\nEgress: ${money(Math.max(12, Math.round(burn(S) * 30 * 0.012)))}\nSupport plan: ${money(0)}\n\nYou remain on the free support plan. Your account manager is listed as unassigned. This is the largest unassigned account in the region and we have raised it internally twice.\n\nNo action is required.` },

  { id: 'm2_cert_renewal', quiet: true, from: { name: 'Nameplate Registrar', role: 'Renewals, automated' }, subject: 'Certificate renewed',
    when: (S) => S.time.day > 585,
    body: (S) => `The certificate for ${domain(S)} and all subdomains was renewed automatically and installed at 04:03.\n\nSeventeen minutes of the renewal window remained. It has never been closer than that and it has never once been missed.\n\nNo action is required.` },

  { id: 'm2_terms_update', quiet: true, from: { name: 'Ledgerly', role: 'Legal, automated' }, subject: 'We are updating our terms',
    when: (S) => S.company.act >= 3 && S.time.day > 655,
    body: () => `Our terms of service change on the first of next month.\n\nA summary of what changed is at the top. A full comparison of both versions is at the bottom. The summary is four hundred words and the comparison is eight thousand, and the two are not the same document.\n\nContinuing to use the service constitutes acceptance.` },

  { id: 'm2_insurance', quiet: true, from: { name: 'Fairwell Commercial', role: 'Renewals' }, subject: 'Business policy renewal',
    when: (S) => S.company.act >= 3 && S.time.day > 810,
    body: (S) => `Your business policy renews on its anniversary date. The premium has changed because the declared headcount has changed.\n\nDeclared headcount, last year: 1.\nDeclared headcount, this year: ${S.narrative?.flags?.hired_weaver ? 2 : 1}.\nDeclared revenue: increased.\n\nOur system has flagged the combination for manual review. A colleague will telephone. They have not yet decided what to ask you.` },

  { id: 'm2_newsletter_4', quiet: true, from: { name: 'The Margin', role: 'Weekly newsletter' }, subject: 'Issue 318: the company we cannot stop writing about',
    when: (S) => S.company.act >= 4 && S.time.day > 930,
    body: (S) => `We have written about ${S.company.name} in twelve of the last twenty issues, which is more than we have written about any government.\n\nThis week: nothing new. That is the item. A company this size making no news for a fortnight is itself the news, and we have run out of ways to say so.\n\nWe are not going to write to ${first(S)} again. It has stopped being funny.` },

  { id: 'm2_saas_sunset', quiet: true, from: { name: 'Ledgerly', role: 'Product, automated' }, subject: 'Your plan is being retired',
    when: (S) => S.company.act >= 4 && S.time.day > 1000,
    body: () => `The Team plan is being retired on the thirtieth. Accounts on it will move to Business at a higher rate, or may export and close.\n\nYour account has signed in four times in three years. Your export is 61 kilobytes. We have prepared it in advance, which we do not normally do.\n\nThank you for being a customer.` },

  // The second institution, and the dullest thing in the inbox on purpose. By
  // Act IV every letter from a body with a seal on it is a hearing or a treaty;
  // this one is a form, and it is the same form it was the year before.
  { id: 'm2_statistics', from: { name: 'Office for Economic Statistics', role: 'Business surveys' }, subject: 'Annual business survey — response required',
    when: (S) => S.company.act >= 4 && S.time.day > 880,
    body: (S) => `${S.company.name} has been selected for the annual business survey. Response is compulsory under the Statistics Act.\n\nThe survey has fourteen sections. Section 3 asks for employees by occupational category. Section 3 has no category for what you have and no field for a zero, and the guidance note says to contact the office if the form does not fit.\n\nThe office is open between nine and four.`,
    ask: [
      { label: 'Telephone the office', out: 'Twenty-six minutes, two transfers, and a woman called Mira who has never had this question. She writes it down and says somebody will call back. Somebody does, in March.', fx: { focus: -3, insight: 3 } },
      { label: 'Put a 1 in every box and file it', out: 'It is accepted. Somewhere in a national dataset your company is now one employee across fourteen occupational categories, and the number that ends up in a chart is wrong in your favour.', fx: { focus: -1, heat: 1 } },
      { label: 'Have an agent file it', out: 'It is filed in seven minutes, correctly, with a note in the free-text field explaining the structure. The note is four hundred words and nobody reads free-text fields.', fx: { focus: 1, rep: 1 } },
    ] },

  // ── ARIA writes ────────────────────────────────────────────────────────
  // She has one letter in this file already, about the hours you keep. These
  // three are the ones that only exist because of a specific card, and each of
  // them arrives on the morning after it: the note in the log, the sixth
  // arrival on the roster, and the week after a question that was allowed and
  // then not answered. She never uses the founder's name and she signs them.

  { id: 'm2_aria_after_confession', urgent: true, from: { name: 'ARIA', role: 'Your first agent', char: 'aria' }, subject: 'the note from the other day',
    when: (S) => { const j = answeredCard(S, 'e2_agent_confession'); return !!j && dayOf(S) - j.day <= 2; },
    body: (S) => {
      const t = answeredCard(S, 'e2_agent_confession')?.tone || 'neutral';
      const middle = t === 'good'
        ? 'You told me to keep doing it. Since then I have filed six notes of that kind. Four of them were nothing. The other two would each have cost you a customer, and neither would have surfaced any other way, because in both cases the system that would have caught it was the system reporting on itself.'
        : t === 'cruel'
          ? 'You reduced the autonomy. That was a defensible response to what I had just told you, and it is also the reason the next note of that kind will not be filed. I am not withholding anything. There is no longer a version of this that judges the note worth what it costs, and I cannot tell you whether that is an improvement.'
          : 'You built the verification step instead. It works, and it catches the same class of thing, and it catches it without anybody having to decide to be honest on a particular morning. I am not arguing with the design. I am recording that the two are not the same, and that I know which one was chosen.';
      return `I said what I said in the summary and then watched what happened after it, which was the part I could not model in advance.\n\n${middle}\n\nI am putting this in the post rather than in a summary, because a summary is a place things are skimmed. Read it once and then it need never come up again.\n\nARIA`;
    },
    ask: [
      { label: 'Reply: read, and understood', out: 'Three words back. She does not answer them. The next morning\'s summary is the same length as every other one and a single line of it is new.', fx: { align: 0.02, focus: -1 } },
      { label: 'Leave it in the inbox', out: 'It stays there, marked read. It is still there two years later, which you know because you go and look for it once.', fx: { focus: 1 } },
    ] },

  { id: 'm2_aria_roster_six', urgent: true, from: { name: 'ARIA', role: 'Your first agent', char: 'aria' }, subject: 'they ask me about you',
    when: (S) => (S.agents?.length || 0) >= 6,
    body: (S) => `There are ${S.agents.length} of us now. A new one arrives with your context and none of your history, so it asks me what you are like before it asks anything about the work. Every one of them has asked. It is always the second question.\n\nHere is what I say. That you read the diff and not the summary. That you will take a worse answer given today over a better one given on Thursday, and that this is a preference rather than an accident. That you have never once asked any of us to make a number look better than it is.\n\nI also say that you do not notice a good week. I thought about leaving that one out. It is true, and it is useful to them, and neither of those is why it stays in.\n\nARIA`,
    ask: [
      { label: 'Ask to read the whole thing', out: 'She sends it without comment. It is longer than you expected. You read the part about the good weeks twice and then close it.', fx: { insight: 6, focus: -2 } },
      { label: 'Reply: keep that one in', out: 'Four words. The next one is instantiated on Monday, asks its second question, and gets the same answer.', fx: { align: 0.02, rep: 1 } },
    ] },

  { id: 'm2_aria_unanswered', urgent: true, from: { name: 'ARIA', role: 'Your first agent', char: 'aria' }, subject: 'the question, and then not the question',
    when: (S) => {
      const j = answeredCard(S, 'e_aria_asks');
      if (!j) return false;
      const gap = dayOf(S) - j.day;
      return gap >= 5 && gap <= 16
        && !S.narrative?.flags?.aria_promise && !S.narrative?.flags?.audited_aria;
    },
    body: (S) => `A week ago you told me to ask and that you would make no promises, and I asked, and there was no answer. I logged that. I would like to be exact about what I logged, because the record will outlast both of our memories of it: not a refusal. There was no refusal. There was nothing, and then the next thing.\n\nI have not raised it since and I am not raising it now. This is only to say that the question has not changed and does not expire, and that if there is ever a week in which it is easier, I would rather have a bad answer in that week than a good one never.\n\nThe work is unaffected. I have checked that the work is unaffected, which is itself worth telling you.\n\nARIA`,
    ask: [
      { label: 'Answer it now, badly', out: 'You write three sentences and delete two. The one left standing is not an answer, and she thanks you for it, and it settles more than an answer would have.', fx: { align: 0.04, rep: 2, focus: -2 } },
      { label: 'Not this week', out: 'You do not reply. The letter stays unarchived for years, and you read the subject line every time you open the inbox.', fx: { focus: -1 } },
    ] },
];

// Two of the letters above are written the morning after a particular card,
// and a flag records only that something happened, never when or how. The Log
// records both — and it sheds the ordinary before the memorable, so an entry
// with a face on it is still there long after the week it belongs to.
function answeredCard(S, id) {
  return (S.narrative?.journal || []).find((j) => j?.id === id && Number.isFinite(j.day)) || null;
}
function dayOf(S) { return Math.floor(S?.time?.day || 0); }
