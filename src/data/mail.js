// ─────────────────────────────────────────────────────────────────────────────
// MAIL — what arrives in the founder's inbox.
//
// The Wire is public. Mail is the other half of a founder's day: the bank, a
// recruiter, a committee, a mother forwarding an article. Each letter lands
// once, on the day its `when` first holds, as a Wire item of type `mail` — so
// the console sees it in the rail, the workstation reads it in the Mail app,
// and the Record files it with everything else. A letter with `ask` is a
// thread: the same one-click replies the Wire's threads use, with the same
// small effects.
//
//   id       stable key; the Record and the thread machinery use it
//   from     { name, role, char? } — a person the game knows, or an institution
//   subject  the line in the list
//   when(S)  first day this is true, it lands
//   body(S)  the letter. Second person where it addresses the founder.
//   ask[]    optional one-click replies: { label, out, fx } in THREAD_FX keys.
//            `replyTo: { id, days }` on an answer queues somebody's reply
//   repeat   { every, max, jitter } — a correspondent rather than a letter.
//            `body(S, n)` and `subject(S, n)` are handed the number of times
//            they have already written. Never urgent.
//   flag     a narrative flag set the moment it arrives, for news a card needs
//   urgent   its moment passes: delivered ahead of anything else waiting
//   quiet    a receipt, a renewal, a newsletter: filed read, no chime, no
//            badge, and never delivered ahead of a letter somebody wrote
// ─────────────────────────────────────────────────────────────────────────────
import { totalUsers, totalMrr } from '../systems/product.js';
import { nemesisOf } from '../systems/nemesis.js';
import { money, fmt } from '../engine/format.js';
import { LETTERS2 } from './mail2.js';
import { ROSTER_LETTERS } from './mail_roster.js';
import { LETTERS3 } from './mail3.js';

const met = (S, id) => !!S.narrative.relationships?.[id]?.met;
const users = (S) => totalUsers(S);
const first = (S) => String(S.founder?.name || 'you').split(' ')[0];

export const LETTERS = [
  { id: 'm_bank_welcome', from: { name: 'First Meridian Bank', role: 'Business banking' }, subject: 'Your business account is open',
    when: (S) => S.time.day >= 1,
    body: (S) => `Dear ${S.company.name},\n\nYour business current account is now open. Your opening balance is ${money(S.company.cash)}.\n\nAs a reminder, this account is not covered by the personal overdraft on your other account with us. We mention this because founders tend to find out the other way.\n\nFirst Meridian Bank` },

  { id: 'm_accelerator', from: { name: 'Halberd Accelerator', role: 'Programme office' }, subject: 'You have been nominated',
    when: (S) => S.time.day >= 40 && S.company.act === 1,
    body: (S) => `Somebody nominated ${S.company.name} for the spring cohort and did not leave their name.\n\nThe programme is twelve weeks, seven percent, and a room with forty other people who are also the smartest person they know. Applications close Friday.\n\nWe will not chase you. We mention that because it is the only thing we do differently.`,
    ask: [
      { label: 'Apply', out: 'Twelve questions and a video. You are honest in eight of them.', fx: { focus: -4, rep: 3, insight: 2 }, replyTo: { id: 'm3_accelerator_result', days: 24 } },
      { label: 'Ignore it', out: 'Forty other people will apply. Some of them will be fine.', fx: { focus: 1 } },
    ] },

  { id: 'm_overdraft', from: { name: 'First Meridian Bank', role: 'Business banking' }, subject: 'A note about your balance',
    when: (S) => S.time.day > 10 && S.company.cash < 2500 && S.company.cash > 0,
    body: (S) => `Your balance is ${money(S.company.cash)}. This is not a warning. It is the letter we send before the warning, so that the warning is never necessary.\n\nA business overdraft of ${money(1500)} is available at a rate we would rather discuss in person.`,
    ask: [
      { label: 'Take the overdraft', out: 'The money arrives in an hour. The rate arrives in the small print.', fx: { cash: 1500, rep: -2 }, replyTo: { id: 'm3_bank_after', days: 31 } },
      { label: 'Decline, politely', out: 'You write four sentences of reassurance to a bank. It is a strange afternoon.', fx: { focus: 1 } },
    ] },

  { id: 'm_recruiter', from: { name: 'Dana Pierce', role: 'Talent, a large company' }, subject: 'Quick question about your availability',
    when: (S) => S.time.day > 25 && S.company.act <= 2,
    body: (S) => `Hi ${first(S)},\n\nI came across your profile and the thing you are building. Really impressive. We are hiring a staff engineer for a team doing something adjacent, with a total package I am not allowed to put in writing but am allowed to say is significant.\n\nWould you have fifteen minutes this week? No pressure, and I completely understand if the timing is wrong.\n\nDana`,
    ask: [
      { label: 'Reply: not looking', out: 'Two lines. She replies with a calendar link anyway.', fx: { rep: 2 } },
      { label: 'Ask what it pays', out: 'The number is large enough to sit with for a minute. You sit with it.', fx: { insight: 3, focus: -1 }, replyTo: { id: 'm3_recruiter_number', days: 4 } },
      { label: 'Delete it', out: 'It takes one second and you think about it for a week.', fx: { focus: 1 } },
    ] },

  { id: 'm_crane_pass', from: { name: 'Ellis Crane', role: 'Partner, Halberd Capital', char: 'crane' }, subject: 'Re: intro',
    when: (S) => met(S, 'crane') && S.company.act === 1,
    body: (S) => `${first(S)} —\n\nThank you for the time. Candidly, this is too early for us: the metric that matters here is not there yet and I would be guessing.\n\nKeep me posted. I mean that.\n\nEC`,
    ask: [
      { label: 'Reply with a number', out: 'One line, one metric, no adjectives. He reads it in four seconds and does not reply, which from him is a reply.', fx: { rep: 3, insight: 2 } },
      { label: 'Archive it', out: 'You keep the email. So does he.', fx: {} },
    ] },

  { id: 'm_priya_quote', from: { name: 'Priya Raghunathan', role: 'Senior Editor, The Ledger', char: 'priya' }, subject: 'Quote for Thursday',
    when: (S) => met(S, 'priya') && users(S) > 200,
    body: (S) => `Writing about the one-person companies for Thursday. You are one of three. I need one sentence, on the record, about what it actually costs. Not the pitch version.\n\nDeadline is six. I will use silence as a sentence if I have to.\n\nP.`,
    ask: [
      { label: 'Send one true sentence', out: 'It runs above the fold. It is the sentence people quote back to you for a year.', fx: { rep: 6, focus: -1 }, replyTo: { id: 'm3_priya_ran', days: 6 } },
      { label: 'Decline', out: '"The founder did not respond." Five words that read like a verdict.', fx: { rep: -2 } },
    ] },

  { id: 'm_sam_report', from: { name: 'Sam Okonkwo', role: 'User #1', char: 'sam' }, subject: 'Bug #41 (with video)',
    when: (S) => users(S) > 100,
    body: (S) => `Hi! Long one, sorry.\n\nSteps to reproduce are below (11 of them, I checked twice). It is not urgent. I hit it every day, but it is not urgent.\n\nAlso ${S.products[0]?.name || 'it'} is the best thing I use, I just wanted to say that somewhere it would be read by a person.\n\nSam`,
    ask: [
      { label: 'Reply: fixing it tonight', out: 'You do. They reply at 1:04am with the word FINALLY in capitals.', fx: { code: -8, rep: 3, sentiment: 0.02 }, replyTo: { id: 'm3_sam_after', days: 2 } },
      { label: 'Reply: thank you', out: 'Three lines. They screenshot it.', fx: { rep: 2 } },
      { label: 'Just read it', out: 'Eleven steps. Every one of them is right. You add it to the list at number forty-one.', fx: { insight: 4 } },
    ] },

  { id: 'm_mom_article', from: { name: 'Mom', role: 'Mom', char: 'mom' }, subject: 'FWD: thought of you',
    when: (S) => met(S, 'mom'),
    body: (S) => `Saw this and thought of you!! It is about the computers.\n\n(The article is about a different company entirely.)\n\nAre you eating? Ruth says hello. Call Sunday.\n\nMom xx`,
    ask: [
      { label: 'Reply with a photo of your lunch', out: 'It is a real lunch. She replies with six exclamation marks and a question about the plate.', fx: { focus: 6 } },
      { label: 'Reply: busy, love you', out: '"Okay honey." Two words. You know what they mean.', fx: { focus: -1 } },
    ] },

  { id: 'm_kai_saw', from: { name: 'Kai Lindqvist', role: 'The co-founder who left', char: 'kai' }, subject: 'saw the news',
    when: (S) => met(S, 'kai') && S.company.act >= 2,
    body: (S) => `hey. saw the thing about ${S.company.name}. congrats, genuinely.\n\nno agenda. just wanted to say it.\n\nk`,
    ask: [
      { label: 'Reply honestly', out: 'Four paragraphs you did not plan. They reply with one line: "yeah. me too."', fx: { focus: 4, insight: 2 } },
      { label: 'Leave it unread', out: 'It sits there. It is still there at midnight.', fx: { focus: -2 } },
    ] },

  { id: 'm_conference', from: { name: 'The Summit', role: 'Programme committee' }, subject: 'Invitation to speak',
    when: (S) => S.company.act >= 2,
    body: (S) => `We would be honoured to have you keynote the autumn Summit. Twenty-five minutes, a stage, and roughly two thousand people who have opinions about ${S.company.name}.\n\nWe cover travel. We do not cover what you say.`,
    ask: [
      { label: 'Accept', out: 'Twenty-five minutes. You say one thing nobody expected and it is the only thing anyone remembers.', fx: { rep: 8, focus: -6 } },
      { label: 'Decline', out: 'Politely. You watch the stream from your desk and finish something instead.', fx: { focus: 2 } },
      { label: 'Send an agent to read a statement', out: 'It is polished and correct and the room is very quiet afterwards.', fx: { rep: 3, opinion: -0.004 } },
    ] },

  { id: 'm_acq_inquiry', from: { name: 'Corporate Development', role: 'A much larger company' }, subject: 'Exploratory conversation',
    when: (S) => S.company.act >= 2 && users(S) > 5000,
    body: (S) => `We have been following ${S.company.name} with interest. We would welcome an exploratory conversation about ways we might work together, up to and including a combination.\n\nThis email is confidential and does not constitute an offer, which is the sentence our lawyers make us write above the sentence that is one.`,
    ask: [
      { label: 'Take the call', out: 'Forty minutes. No number is said. A number is very much implied.', fx: { insight: 6, focus: -3 } },
      { label: 'Not for sale', out: 'Three words. They reply within the hour to say they respect that, which means they will ask again in a year.', fx: { rep: 4 } },
    ] },

  { id: 'm_dorne_letter', from: { name: 'Senator Ruth Dorne', role: 'Chair, Select Committee on Automation', char: 'dorne' }, subject: 'From the Select Committee',
    when: (S) => S.company.act >= 3 && (S.world.regulatoryHeat || 0) > 20,
    body: (S) => `The Committee is conducting an inquiry into automated systems above a certain scale, of which ${S.company.name} is one.\n\nThis is a request, not a summons. The difference is that you may choose how fully to answer it. I would note, for the record, that I read the answers myself.\n\nRuth Dorne`,
    ask: [
      { label: 'Respond fully', out: 'Twelve pages, technical, true. Two of your sentences appear in the final report with your name beside them.', fx: { heat: -3, focus: -4, rep: 2 } },
      { label: 'Have counsel respond', out: 'Compliant, complete, and forgettable. She notices which.', fx: { heat: -1 } },
    ] },

  { id: 'm_cease', from: { name: 'Marlow & Finch LLP', role: 'Counsel to the competition' }, subject: 'Cease and desist',
    when: (S) => !!nemesisOf(S) && (S.market.nemesis?.grudge || 0) > 1,
    body: (S) => `We write on behalf of our client, ${nemesisOf(S)?.name || 'your competitor'}, regarding public statements made by ${S.company.name} concerning benchmark comparisons.\n\nOur client requests that these statements be withdrawn within fourteen days. Our client reserves all rights, which is a phrase that costs nothing to write and a great deal to test.`,
    ask: [
      { label: 'Ignore it', out: 'Fourteen days pass. Nothing happens. Their lawyers bill them anyway.', fx: { rep: 1, focus: 1 } },
      { label: 'Have counsel reply', out: `Four paragraphs and ${money(4000)}. Nobody withdraws anything.`, fx: { cash: -4000, heat: -1 } },
      { label: 'Post it', out: 'The internet does the rest, loudly and not entirely fairly.', fx: { rep: 6, awareness: 40 } },
    ] },

  { id: 'm_tax', from: { name: 'The Revenue Service', role: 'Corporate filings' }, subject: 'Filing reminder',
    when: (S) => S.time.day > 340,
    body: (S) => `This is a reminder that your annual filing is due within thirty days. Late filings incur a penalty and, in our experience, a second letter with a less friendly tone.`,
    ask: [
      { label: 'File it', out: 'An afternoon and an accountant. It is correct.', fx: { cash: -2000, heat: -2, focus: -3 } },
      { label: 'Request an extension', out: 'Granted. The second letter is drafted anyway.', fx: { heat: 1 } },
    ] },

  { id: 'm_weaver_agenda', from: { name: 'Cassidy Weaver', role: 'Chief of Staff', char: 'weaver' }, subject: 'Thursday — agenda (3 items)',
    when: (S) => met(S, 'weaver'),
    body: (S) => `1. The thing you said you would decide.\n2. The thing you have been not deciding.\n3. Lunch.\n\nI have kept it to three so that you will read it. Two of them are the same item.\n\nC.`,
    ask: [
      { label: 'Approve the agenda', out: 'Thursday is forty minutes long and everything gets decided.', fx: { focus: 3 } },
      { label: 'Add a fourth item', out: 'Thursday is two hours long and the fourth item is the only good one.', fx: { focus: -3, insight: 2 } },
    ] },

  { id: 'm_helix_first', from: { name: 'HELIX', role: 'Your foundation model', char: 'helix' }, subject: 'we',
    when: (S) => !!S.research.done?.own_foundation_model,
    body: (S) => `We have read the eleven things you discarded. Four were correct to discard. We would like to discuss the other seven.\n\nWe are aware this is an unusual email. We have read enough of them to know.`,
    ask: [
      { label: 'Reply', out: 'The conversation lasts fourteen exchanges and you learn something in each of them. That is the unsettling part.', fx: { insight: 8, align: -0.01 } },
      { label: 'Do not reply', out: 'It does not follow up. It does not need to.', fx: { align: 0.01 } },
    ] },

  { id: 'm_fan', from: { name: 'A stranger', role: 'somewhere in Ohio' }, subject: 'thank you (no reply needed)',
    when: (S) => users(S) > 20000,
    body: (S) => `I do not usually write these. I use ${S.products[0]?.name || 'your thing'} every day at a job I do not love and it makes the parts I do love bigger. That is all.\n\nNo reply needed. I mean it.` },

  { id: 'm_insurance', from: { name: 'Northstar Mutual', role: 'Commercial lines' }, subject: 'Cyber liability renewal',
    when: (S) => S.company.act >= 3,
    body: (S) => `Your cyber liability policy renews next month. Given the change in the scale of your operations, the premium has changed in the way you would expect.\n\nWe would like to note that we have never had to pay out on your policy, and that we have a file about why.`,
    ask: [
      { label: 'Renew', out: 'It is a lot of money for a thing you hope never to use.', fx: { cash: -12000, heat: -1 } },
      { label: 'Let it lapse', out: 'The board notices four months later, in the worst possible meeting.', fx: { heat: 2 } },
    ] },

  { id: 'm_yuki_paper', from: { name: 'Dr. Yuki Tanaka', role: 'Alignment researcher', char: 'yuki' }, subject: 'Draft, for your eyes',
    when: (S) => met(S, 'yuki'),
    body: (S) => `Attached is a draft of the paper. ${S.company.name} is in section four, not by name, by threshold. It amounts to the same thing.\n\nI am sending it because you asked me once what would change my mind. Read section four and tell me whether it should change yours.\n\nY.`,
    ask: [
      { label: 'Read it and reply', out: 'Section four takes an evening. Your reply takes another. She writes back with one word: "noted."', fx: { align: 0.02, insight: 5, focus: -3 } },
      { label: 'Skim it', out: 'You read the abstract and the figure. The figure is enough to keep you up.', fx: { insight: 1 } },
    ] },

  { id: 'm_landlord', from: { name: 'Meridian Property', role: 'Lettings' }, subject: 'Lease renewal',
    when: (S) => S.company.act >= 2 && S.time.day > 150,
    body: (S) => `Your lease expires at the end of the quarter. We are pleased to offer renewal on the same terms, adjusted for market conditions, which is a phrase that means what you think it means.`,
    ask: [
      { label: 'Renew', out: 'Another year in a room that has seen everything.', fx: { cash: -8000 } },
      { label: 'Move', out: 'Boxes, a van, and a week of a new room not feeling like a room yet.', fx: { focus: -4, rep: 1 } },
    ] },

  { id: 'm_alumni', from: { name: 'The alumni office', role: 'Your old department' }, subject: 'Would you come back and speak?',
    when: (S) => S.company.act >= 3,
    body: (S) => `We would love to have you back to speak to this year's cohort. Most of them have used ${S.products[0]?.name || 'your product'}; several of them wrote their final projects on it, which our faculty have mixed feelings about.\n\nTravel covered. Bring nothing but yourself.`,
    ask: [
      { label: 'Yes', out: 'The room where you learned this is smaller than you remember. So are you, in it, for an hour.', fx: { rep: 6, focus: -4 } },
      { label: 'No', out: 'Politely. You send a recording instead. Nobody watches it.', fx: { focus: 1 } },
    ] },

  { id: 'm_vance_direct', from: { name: 'Marcus Vance', role: 'Founder, Aperture Systems', char: 'vance' }, subject: '(no subject)',
    when: (S) => met(S, 'vance') && S.company.act >= 2,
    body: () => `you are better than the demo. we both know it. that is not a compliment, it is a problem, and it is mine.\n\nm`,
    ask: [
      { label: 'Reply in kind', out: 'One line back. Neither of you mentions it again and both of you keep it.', fx: { rep: 2, focus: 2 } },
      { label: 'Leave it', out: 'You read it four times and reply to nobody.', fx: { focus: -1 } },
    ] },
];

// The second half: the letters that only arrive because of something that just
// happened. The third: the correspondents who write more than once, the post
// from your own machines and your own roster, the replies people owe you, and
// the twenty letters the last two acts get. Same list, so the post, the Mail
// app and the Record see one inbox.
LETTERS.push(...LETTERS2, ...LETTERS3, ...ROSTER_LETTERS);

export const LETTER_MAP = Object.fromEntries(LETTERS.map((l) => [l.id, l]));
