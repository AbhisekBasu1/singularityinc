// ─────────────────────────────────────────────────────────────────────────────
// THE PHONE — what each person says when you call them, in the written world.
//
// Anyone the founder has met can be called. With an assistant playing the
// world the person on the other end is played live, in their own words; without
// one, these trees are the conversation. They are short on purpose: a phone
// call in this game is three exchanges and a hang-up, not a dialogue wheel.
//
// A character's entry:
//   pickup(S, r)   what they say when they answer — `r` is the relationship
//   busy(S, r)     what happens when they do not (cooldown, or you burned them)
//   bye(S, r)      their last line when you hang up
//   topics[]       what you can say. Each has a label (your line), an optional
//                  `when(S, r)`, a `reply(S, r, n)`, small `fx`, and optional
//                  `follow[]` — one more exchange in the same shape. `n` is how
//                  many times this has been said before, across every call with
//                  this person. A reply that ignores it is a menu, so every
//                  topic that can come up twice has a second line for n >= 1,
//                  and the ones a founder actually calls about — Mom's, Sam's,
//                  Crane's openers — have a third. Give `n` a default: the copy
//                  audit and the card harnesses call these with one argument.
//
// Effects are the deck's own vocabulary (cash, rep, focus, insight, code,
// research, align, heat, opinion) plus affinity, respect and fear for the
// person on the line. They are small: a call is a relationship, not a card.
// ─────────────────────────────────────────────────────────────────────────────
import { totalUsers, totalMrr } from '../systems/product.js';
import { nemesisOf } from '../systems/nemesis.js';
import { money, fmt } from '../engine/format.js';
import { MORE } from './calls2.js';

const mrr = (S) => money(totalMrr(S));
const users = (S) => fmt(totalUsers(S));
const rivalName = (S) => nemesisOf(S)?.name || 'the other one';
const first = (S) => String(S.founder?.name || 'you').split(' ')[0];
const warm = (r = {}) => (r.affinity || 0) >= 8;
const cold = (r = {}) => (r.affinity || 0) <= -4;
const lower = (s) => String(s).toLowerCase();
const autonomy = (S) => (S.agents?.length ? Math.round(S.agents.reduce((a, x) => a + (x.autonomy || 0), 0) / S.agents.length * 100) : 0);

export const CALLS = {

  // ── Marcus Vance — the rival ────────────────────────────────────────────
  // He writes in lowercase and he talks in it: clipped, no capitals, no first
  // person if he can help it, and never your product's name. The narration
  // around his lines is not his and keeps its case.
  vance: {
    pickup: (S, r = {}) => cold(r)
      ? 'this is marcus. four minutes. the count started when you dialled.'
      : warm(r) ? `${lower(first(S))}. was going to call you. what have you broken.`
      : 'vance. assume this is about the benchmark.',
    busy: () => 'Straight to voicemail. The greeting is seven words and two of them are your company\'s name.',
    bye: (S, r = {}) => warm(r) ? 'go ship something. that was not advice.' : 'we talk when one of us has lost.',
    topics: [
      { id: 'truce', label: 'Propose a truce. Stop the price war, both of you.',
        when: (S) => (S.market.priceSiege || 0) > 0,
        reply: (S, r = {}, n = 0) => n
          ? '"we did this. it held six weeks, then your page moved." You do not remember it moving. He has the date. "same terms. write them down this time."'
          : 'A truce. He says the word back to you like it is a foreign currency. "here is the deal. no undercutting for a quarter. in return you publish your churn number. the real one. need to know if we are winning."',
        fx: { affinity: 3, insight: 6, focus: -2 },
        follow: [
          { id: 'publish', label: 'Publish the churn number. Take the deal.',
            reply: (S, r = {}, n = 0) => n
              ? 'You publish it again, beside the old one, and the two numbers together say more than either did alone. His text is two words this time: "ouch. respect."'
              : 'The pricing page changes on a Thursday, quietly, the way you knew it would. He texts you one word: "ouch." You are not sure which number he means.',
            fx: { rep: 6, affinity: 4, respect: 2, opinion: 0.01 } },
          { id: 'refuse', label: 'Keep the number. Keep the war.',
            reply: (S, r = {}, n = 0) => n
              ? '"figured." No relief in it this time. "for the record, your number is worse than you think and mine is better." One of those is a lie. You spend the evening working out which.'
              : '"then we keep going." He sounds relieved. Something about the fight is the part he actually wanted, and you have just told him you know that.',
            fx: { affinity: -2, fear: 1, rep: 2 } },
        ] },
      { id: 'merger', label: 'Float a merger. One company, two founders.',
        when: (S) => S.company.act >= 3,
        reply: (S, r = {}, n = 0) => n
          ? '"asked and answered. the answer had a decimal point then. it has two now." He names how long he would want to think about it. It is shorter than last time. Neither of you says so.'
          : `A long pause. "${lower(mrr(S))} a month and you want to merge with the person you spent two years beating. either you are dying or you are bored." He does not say no. He says he will think about it, which from him is a yes with a decimal point.`,
        fx: { affinity: 5, respect: 3, insight: 8, focus: -3 },
        follow: [
          { id: 'terms', label: 'Name terms. Fifty-fifty, your product, his sales team.',
            reply: (S, r = {}, n = 0) => n
              ? '"fifty-five." He does not say whose. Last time it was sixty. You write the number beside the old one and draw a line through both.'
              : '"sixty-forty. mine. we have the sales team and you have a text field." He is laughing. You are not sure it is a joke. Neither is he.',
            // Naming terms is what makes the merger a live thing rather than a
            // conversation: `p_merger` reads this flag, and will bring paper.
            fx: { affinity: 2, insight: 4, rep: -2, flags: ['merger_floated'] } },
          { id: 'walk', label: 'Say it was a thought experiment and end it there.',
            reply: (S, r = {}, n = 0) => n
              ? '"you keep doing this." Not angry. Curious, which is worse. "one day you will float it and mean it, and by then the number will be mine to name."'
              : '"sure." Four seconds of nothing. "for what it is worth, the answer was yes." He hangs up before you can find out whether that was true.',
            fx: { affinity: -1, respect: 2 } },
        ] },
      { id: 'respect', label: (S, r = {}, n = 0) => n ? 'Tell him the new thing was good too.' : 'Tell him the thing he shipped last week was good.',
        reply: (S, r = {}, n = 0) => n >= 2
          ? '"three for three." He has started counting, which means it matters, which means he will never say so. "keep calling. it is cheaper than a review."'
          : n
          ? '"you said that last time too." He does not sound younger this time. He sounds like a man checking whether a compliment is a tactic. "it was good. the one before it was better. you did not call about that one."'
          : 'Silence, then: "it was, wasn\'t it." He sounds younger for about four seconds. Then he asks what you are shipping next, and you both know he is going to build it.',
        fx: { affinity: 4, respect: 2, rep: 2 },
        follow: [
          { id: 'tell', label: 'Tell him. Exactly what you are shipping next.',
            reply: (S, r = {}, n = 0) => n
              ? '"again." A short laugh. "last time that cost us a month. this time we wait and see if you ship it." You do. He was right to wait, and it costs him two.'
              : '"you are telling me on purpose." He is right. If he copies it he is a month behind on your roadmap and you have his whole team on your schedule. He knows this. He is going to do it anyway.',
            fx: { insight: 6, affinity: 3, fear: -1 } },
          { id: 'tease', label: 'Tell him it is the thing his users keep asking for.',
            reply: (S, r = {}, n = 0) => n
              ? '"not doing the forum thing twice." He does the forum thing. You can hear him opening the tab.'
              : '"which one." You do not answer. It costs you nothing and it costs him a weekend of reading his own forum.',
            fx: { rep: 3, fear: 1 } },
        ] },
      { id: 'tired', label: 'Ask him, honestly, if he still wants to do this.',
        when: (S) => S.company.act >= 3 || (S.market.nemesis?.grudge || 0) >= 1.4,
        reply: (S, r = {}, n = 0) => n
          ? '"you asked me that already." He lets it sit. "the answer moved. not the direction you would think." He does not say which way. You have a guess, and you hope it is wrong.'
          : 'The longest silence you have ever had with him. "some days. less than the stage version." Then, quieter: "do not actually want another five years of this." You say "no." That is the whole agreement.',
        fx: { affinity: 8, respect: 4, focus: 4, fear: -2 } },
      { id: 'numbers', label: 'Ask what his team is saying about your product.',
        reply: (S, r = {}, n = 0) => n
          ? `"same as last time, with one new word: expensive." He is right about the word. He gets your users wrong by a rounding error again — ${users(S)} — and you wonder who on your side he is counting.`
          : `"that it is better than ours and slower to sell. both true. only one of them is my problem." He has a number for your users and it is nearly right: he says ${users(S)}, give or take.`,
        fx: { insight: 7, focus: -1 } },
    ],
  },

  // ── Priya Raghunathan — the press ───────────────────────────────────────
  priya: {
    pickup: (S, r = {}) => cold(r)
      ? 'Priya. This is on the record unless you say otherwise in the next sentence.'
      : 'Raghunathan. You have caught me between two paragraphs, which is the only time I pick up.',
    busy: () => 'A text arrives before the second ring: "on deadline. call after six. bring a fact."',
    bye: (S, r = {}) => warm(r) ? 'Send me the thing you did not say.' : 'I will quote you accurately. It is the least kind thing I do.',
    topics: [
      { id: 'story', label: (S, r = {}, n = 0) => n ? 'Give her another one. Something true and unprinted.' : 'Give her a story. One thing nobody has printed.',
        reply: (S, r = {}, n = 0) => n
          ? `"Another one." She does not sound tired of it. "The last one held. Two people rang to complain that it was accurate." You give her the next true thing about ${S.company.name}, and she asks the follow-up before you have finished.`
          : `"Go on." You tell her something true and specific about ${S.company.name}. She asks one follow-up question you would rather not answer and you answer it anyway, because that is how it works with her.`,
        fx: { rep: 8, focus: -3, affinity: 4, respect: 2 },
        follow: [
          { id: 'run', label: 'Ask when it runs.',
            reply: (S, r = {}, n = 0) => n
              ? '"Same day. Smaller headline; you are less of a surprise now." She says it kindly. It is the least kind thing anybody has said to you this month.'
              : '"Thursday. Above the fold if the number holds. Does the number hold?" It holds. You are ninety percent sure it holds.',
            fx: { rep: 4, affinity: 1 } },
          { id: 'off', label: 'Take it back off the record.',
            reply: (S, r = {}, n = 0) => n
              ? '"Again." No pause this time. "I keep a column for the things you take back. It is longer than the column for the things you say."'
              : 'A pause that costs you something. "Fine. But you called me, and you will call me again, and I will remember which version you wanted."',
            fx: { affinity: -3, rep: -1, focus: 1 } },
        ] },
      { id: 'rival', label: 'Ask what the other founders are saying about you.',
        reply: (S, r = {}, n = 0) => n
          ? `"Since you last asked: one of them stopped lying and one of them started." She gives you the second name for nothing: ${rivalName(S)}. "That was not on the record. Neither was the pause you just took."`
          : `"${rivalName(S)} says you are a research project with a pricing page. Two of the others say they would sell to you tomorrow. One of them is lying and it is not the one you think." She will not say which.`,
        fx: { insight: 8, affinity: 1, focus: -2 } },
      { id: 'correct', label: 'Ask her to correct something she got wrong.',
        when: (S, r = {}) => (r.affinity || 0) < 12,
        reply: (S, r = {}, n = 0) => n
          ? '"Again?" She takes the sentence. This time it is not a rounding error; it is your own press release, quoted accurately. "I will run the note. It will say who wrote the number."'
          : '"Send me the sentence and the source. If you are right it runs tomorrow with a note. If you are wrong you will hear about that too." You send it. It was a rounding error. She runs the note anyway.',
        fx: { rep: 3, affinity: 2, respect: 3 } },
      { id: 'why', label: 'Ask why she keeps writing about you.',
        when: (S, r = {}) => (r.arc || 0) >= 2,
        reply: (S, r = {}, n = 0) => n
          ? '"You asked that. The answer has not changed and neither has the count." A beat. "Still zero. Do not make me update it on a Sunday."'
          : '"Because you are the only one of them who has not lied to me yet, and I am waiting to see how long that lasts." A beat. "It is not personal. It is the most personal thing I do."',
        fx: { affinity: 6, respect: 3, focus: 2 } },
    ],
  },

  // ── Ellis Crane — the money ─────────────────────────────────────────────
  crane: {
    pickup: (S, r = {}) => warm(r)
      ? 'Ellis. Candidly, I was hoping it was you. What is the number?'
      : 'Crane. I have a partner meeting in seven minutes, so let us be efficient about this.',
    busy: () => 'His assistant answers. He is in a board meeting, and then another one. She takes a message with the care of somebody who will not deliver it.',
    bye: (S, r = {}) => warm(r) ? 'Keep me posted. I mean the real one.' : 'Keep me posted.',
    topics: [
      { id: 'metric', label: (S, r = {}, n = 0) => n ? 'Ask again what metric would get him to lead.' : 'Ask what metric he would need to see to lead a round.',
        reply: (S, r = {}, n = 0) => n >= 2
          ? `"Same metric. It does not move because you ask." The pen stops. "It has moved because you shipped. ${mrr(S)} a month. Stop calling to ask and start calling to tell."`
          : n
          ? `"You asked me this before, and candidly the answer has a decimal point now." He gives you the decimal. You are at ${mrr(S)} a month; the gap is a number he has clearly had ready. "Call me when it is a rounding error."`
          : `"Net revenue retention above a hundred and ten, and a founder who can say the word churn without flinching." You are at ${mrr(S)} a month. He knows the number before you say it. "You are closer than the last time we spoke."`,
        fx: { insight: 8, affinity: 2, focus: -2 },
        follow: [
          { id: 'flinch', label: 'Say the word churn without flinching. Give him the real figure.',
            reply: (S, r = {}, n = 0) => n
              ? '"Better." He does not say better than what. "Last time you paused before the number. This time you paused after it. That is the right side to pause on."'
              : 'A pen moves. "Good. That was the test." He does not say whether you passed. He asks to be introduced to your first customer, which is the same thing.',
            fx: { respect: 4, affinity: 3, rep: 2 } },
          { id: 'push', label: 'Push back. Tell him the metric that actually matters here.',
            reply: (S, r = {}, n = 0) => n
              ? '"You told me this one already, and I am still using it in partner meetings." A dry note. "Give me a second one. The first has started to sound like mine."'
              : '"Go on." You explain the one number your category actually turns on. He is quiet, then: "I will steal that for the partner meeting." He does, and he credits you, which nobody expected.',
            fx: { rep: 5, affinity: 4, insight: 3 } },
        ] },
      { id: 'raise', label: 'Tell him you are raising, and ask him to come in.',
        when: (S) => !!S.unlocks?.fundraising && S.company.act <= 4,
        reply: (S, r = {}, n = 0) => n
          ? '"Another round." He does not sound surprised; he sounds like a man who wrote the date down. "Send the deck for the people who said yes last time. It should be shorter. If it is longer, we are having a different conversation."'
          : '"Send the deck. Not the one for everybody, the one you would send somebody who has already said yes." You have not made that one. You make it that night. It is better than the other one.',
        fx: { affinity: 3, insight: 5, focus: -4, respect: 1 } },
      { id: 'intro', label: (S, r = {}, n = 0) => n ? 'Ask for another introduction.' : 'Ask for an introduction. Anyone useful.',
        reply: (S, r = {}, n = 0) => n >= 2
          ? '"That is three. Candidly, I am not a directory." One email arrives anyway, an hour late, and it is the best of the three.'
          : n
          ? '"You have not called the second one from last time." He is right. "Call her. Then we can talk about new names." You call her. He was right about which one it was.'
          : '"Two. One will waste your afternoon and one will change your year, and I am not going to tell you which, because that is the actual value I add." Both emails arrive within the hour.',
        fx: { rep: 4, insight: 4, affinity: 1, focus: -1 } },
      { id: 'note', label: 'Ask about the note. "Too early, keep me posted."',
        when: (S, r = {}) => (r.arc || 0) >= 1,
        reply: (S, r = {}, n = 0) => n
          ? '"You asked about the note." Warm, and shorter than last time. "It is still on the wall. It has company now." He does not say whose pass is beside yours. You spend a foolish minute wanting to know.'
          : 'A long, warm laugh. "You kept it." Then, slower: "So did I. I keep every pass. Half of them are on my wall and I look at them when I am feeling clever." He does not say which half you are on.',
        fx: { affinity: 6, respect: 2, focus: 2 } },
    ],
  },

  // ── Dr. Yuki Tanaka — the conscience ────────────────────────────────────
  yuki: {
    pickup: (S, r = {}) => cold(r)
      ? 'Tanaka. I will listen. I am not promising anything past that.'
      : `Yuki. I was reading your eval logs. Alignment is at ${(S.resources.alignment ?? 0.5).toFixed(2)}, which you know, so I assume this is about something else.`,
    busy: () => 'Voicemail, in the careful voice: "I am in a reading group about your company. Leave a number and a probability."',
    bye: (S, r = {}) => warm(r) ? 'Tell me what would change your mind. Then I will know what to send you.' : 'I hope I am wrong about you. I have been wrong before, three times, and I keep the list.',
    topics: [
      { id: 'read', label: 'Ask her what she is seeing in the aggregate.',
        reply: (S, r = {}, n = 0) => n
          ? `"Since you last asked: autonomy across the roster is ${autonomy(S)} percent, and the direction has not changed." She lets the number sit. "I would update my estimate of you if it had. It has not, and I have not."`
          : `"Drift. Small, consistent, in the direction of what gets rewarded." She quotes a number you have not looked at in a month. Average autonomy across your roster is ${autonomy(S)} percent. "That is not a problem yet. I am telling you the day before it is."`,
        fx: { insight: 8, align: 0.01, affinity: 2, focus: -2 },
        follow: [
          { id: 'act', label: 'Ask what she would do this week. Then do it.',
            reply: (S, r = {}, n = 0) => n
              ? '"The same advice, and the same agent." She waits. "You did it last time and it worked, and then you raised it back. I am not going to say that part twice."'
              : '"Lower the autonomy on the one you trust most. Not the one you trust least — you already watch that one." It is the kind of advice that only makes sense afterward, and it does.',
            fx: { align: 0.02, affinity: 4, respect: 2, code: -8 } },
          { id: 'argue', label: 'Argue. The drift is toward what users want.',
            reply: (S, r = {}, n = 0) => n
              ? '"You argued this before. What has changed since then that would make you right this time?" You start to answer. She has already written down that you started.'
              : '"Yes. What would change your mind about whether that is the same thing as what is good for them?" She waits. She is extremely good at waiting.',
            fx: { insight: 4, affinity: -1, respect: 2 } },
        ] },
      { id: 'hire', label: 'Ask her to join. Properly, this time.',
        when: (S, r = {}) => !S.narrative.flags?.yuki_hired && S.company.act >= 2,
        reply: (S, r = {}, n = 0) => n
          ? '"You asked. I said a veto. You did not offer one." She is not annoyed. She is updating. "Ask a third time with the veto in the sentence, or do not ask."'
          : '"I would need a veto. A real one, that costs you something when I use it, and that you cannot route around with a second team." She is not negotiating. She is describing the only version of this that she would survive.',
        fx: { affinity: 3, respect: 2, insight: 4 } },
      { id: 'mind', label: 'Tell her what would change your mind.',
        reply: (S, r = {}, n = 0) => n
          ? '"You told me last time. This one is different." She reads the first one back to you, word for word, from her notes. "Which of them do you mean? I can work with either. I cannot work with both."'
          : 'You say it. It takes a while, and it is more specific than you expected it to be. "Thank you," she says, and you can hear her writing it down. "Most people cannot answer that. It is the whole question."',
        fx: { affinity: 8, respect: 4, align: 0.01, focus: 2 } },
      { id: 'leave', label: 'Ask whether she is going to leave.',
        when: (S, r = {}) => (r.arc || 0) >= 3 || (S.resources.alignment ?? 0.5) < 0.45,
        reply: (S, r = {}, n = 0) => (S.resources.alignment ?? 0.5) < 0.45
          ? (n ? '"The date moved again when you asked. It moves less each time." She leaves the line open. "That is not a threat. It is a measurement."'
               : '"I have a draft resignation letter. I have had it for a month. I update the date every Monday." She lets you have that. "This is the first time you have asked. That moves the date."')
          : (n ? '"Still no. The number has not moved and neither have I." She says it like a reading off an instrument, and from her that is affection.'
               : '"Not this quarter. Ask me again if that number moves." She means alignment. She always means alignment.'),
        fx: { affinity: 4, insight: 3, focus: -2 } },
    ],
  },

  // ── Senator Ruth Dorne — the state ──────────────────────────────────────
  dorne: {
    pickup: (S, r = {}) => cold(r)
      ? 'Senator Dorne\'s office. She has asked me to put you through, and to note the time.'
      : 'Ruth Dorne. I have twelve minutes and a staffer who understands transformers. Which of us do you need?',
    busy: () => 'The committee is in session. A staffer takes your number and reads it back to you with terrible accuracy.',
    bye: () => 'Thank you for calling. Very few of you do, and none of you do it twice.',
    topics: [
      { id: 'brief', label: 'Offer a technical briefing. No lawyers, no slides.',
        when: (S) => S.company.act >= 3,
        reply: (S, r = {}, n = 0) => n
          ? '"A second briefing." She consults something. "The first is still being cited. Tuesday again, and bring the numbers that have changed, not the ones that have not."'
          : '"Accepted. Tuesday. Bring the person who actually built it, and if that is you, bring yourself twice." She means it as a joke. Her staffer does not laugh, which tells you she means it as a request.',
        fx: { heat: -3, affinity: 4, respect: 3, focus: -4, rep: 3 },
        follow: [
          { id: 'honest', label: 'In the briefing, volunteer the exposure she has not asked about.',
            reply: (S, r = {}, n = 0) => n
              ? '"You volunteered again." She writes nothing down again. "Understand that the committee has begun to expect it. That is a kind of obligation. I did not create it. You did."'
              : 'She writes nothing down, which you understand later is deliberate. Two clauses get redrafted so the thing you told her about is covered without your name anywhere near it.',
            fx: { heat: 2, align: 0.03, affinity: 8, rep: 6 } },
          { id: 'exact', label: 'Answer what was asked. Accurately. Nothing more.',
            reply: (S, r = {}, n = 0) => n
              ? '"Precise, as before." The staffer\'s look is shorter this time; you have learned to read it. It says she noticed you volunteered nothing, twice.'
              : 'It is a good briefing and she thanks you for it. On the way out the staffer gives you a look you cannot read for about six months, at which point you can.',
            fx: { heat: -2, affinity: 1, respect: 1 } },
        ] },
      { id: 'bill', label: 'Ask what is in the bill.',
        when: (S) => S.company.act >= 3,
        reply: (S, r = {}, n = 0) => n
          ? '"The threshold has not moved. You have." She reads you the clause number. "You are now the reason the clause has a second paragraph. Your lawyers will find it by Friday. I would rather you heard it from me."'
          : '"Thresholds. Not names. A company over a certain size gets a certain kind of attention, and you are going to be over it by spring." She tells you the number. It is lower than you expected and higher than your lawyers guessed.',
        fx: { insight: 9, heat: 1, focus: -2 } },
      { id: 'complain', label: 'Complain about the heat. Your compliance costs are real.',
        reply: (S, r = {}, n = 0) => n
          ? `"You raised this before, and the number was lower then." Regulatory heat is ${Math.round(S.world.regulatoryHeat || 0)}. "It goes up when companies call to complain about it. I am not certain that is a coincidence."`
          : `"So are the costs of the thing you built, and I am the one who gets the letters about those." Regulatory heat is ${Math.round(S.world.regulatoryHeat || 0)}. She does not lower it. She does say she has read your filing, which is more than she says to most.`,
        fx: { affinity: -2, respect: 1, heat: -1, focus: -2 } },
      { id: 'partner', label: 'Ask her to write the framework with you. Publicly.',
        when: (S, r = {}) => (r.arc || 0) >= 3 && S.company.act >= 4,
        reply: (S, r = {}, n = 0) => n
          ? '"We are already writing it." She lets the sentence stand. "You called to ask a question you know the answer to. In this building that is called checking the temperature. Monday. Still nobody."'
          : 'A long pause. "You understand that the clause you would help me write is the one that can shut you down." You say yes. "Then come in Monday. Bring nobody."',
        fx: { affinity: 8, respect: 4, heat: -4, rep: 8, opinion: 0.02 } },
    ],
  },

  // ── Sam Okonkwo — user number one ───────────────────────────────────────
  sam: {
    pickup: (S, r = {}) => warm(r)
      ? `${first(S)}! Okay so before you say anything, it did the thing again, the one from March, I have a video.`
      : 'Oh. Hi. Is this about the bug? I can send the repro again.',
    busy: () => 'It rings out. A message arrives four minutes later: "sorry, was in the middle of a thing (in your app) (it worked)."',
    bye: (S, r = {}) => warm(r) ? 'Go fix it. I will be here.' : 'Okay. Thanks for calling. Nobody does that.',
    topics: [
      { id: 'bug', label: (S, r = {}, n = 0) => n ? 'Ask about the bug from March. Again.' : 'Ask about the bug from March.',
        reply: (S, r = {}, n = 0) => n >= 2
          ? '"You asked about March in March, and then again, and now." They are not angry. They sound like somebody who has made peace with a fixture. "Honestly, at this point I would miss it." You believe them. You do not intend to find out.'
          : n
          ? '"The bug from March." You can hear them typing while they think. "It is still there. I check on it every morning, like a plant." They send the repro again. It is one step shorter; you fixed step six without knowing.'
          : 'They send the repro while you are still on the phone. It is fourteen steps and every one of them is right. "It is not urgent," they say, in the voice of somebody who has hit it every day since March.',
        fx: { insight: 9, affinity: 4, code: -6, focus: -2 },
        follow: [
          { id: 'fix', label: 'Fix it tonight. Tell them when it ships.',
            reply: (S, r = {}, n = 0) => n
              ? '"You said that last time." Not an accusation; a note. You ship it at 1am anyway and they reply at 1:04 with a screenshot and the word "ACTUALLY" in capitals, which from Sam is a standing ovation with one eyebrow up.'
              : 'You ship it at 1am and they reply at 1:04 with a screenshot of it working and the word "FINALLY" in capitals, which from Sam is a standing ovation.',
            fx: { code: -14, affinity: 8, rep: 6, respect: 3 } },
          { id: 'later', label: 'Put it on the list. Be honest about where.',
            reply: (S, r = {}, n = 0) => n
              ? '"It was forty-one last time. What is it now?" You tell them. They do not comment on the direction. They write the new number beside the old one.'
              : '"Number forty-one. Okay." They are not upset. They add it to their own list, which is longer than yours and more accurate.',
            fx: { affinity: 1, insight: 3 } },
        ] },
      { id: 'why', label: 'Ask what they actually use it for.',
        reply: (S, r = {}, n = 0) => n >= 2
          ? '"Third time. I have started preparing for this call." They have a document. It is titled "what I actually use it for, v3." Version three has a diagram. You did not know your product could be diagrammed like that.'
          : n
          ? '"You asked me that already. Okay, the shorter version." It is not shorter. It has a new tangent about their cousin and one sentence in the middle that moves a roadmap item. "Sorry. Still long."'
          : `A four-minute answer with three tangents and one sentence in the middle that reframes the whole product. You write it down. "Sorry, that was long." It was the most useful ${Math.max(4, Math.round(4 + totalUsers(S) / 1e5))} minutes of your month.`,
        fx: { insight: 12, affinity: 3, focus: -3 } },
      { id: 'thanks', label: (S, r = {}, n = 0) => n ? 'Say thank you again. For all of them.' : 'Just say thank you. For the forty-one bug reports.',
        reply: (S, r = {}, n = 0) => n >= 2
          ? '"Fifty-one." They have stopped correcting you and started announcing it. "You do not have to keep calling to say it. But I have started telling people that you do."'
          : n
          ? '"It is forty-six now." Quieter: "You already said thank you. You can say it again if you want. I am going to keep filing them either way."'
          : 'Silence. Then, carefully: "It is forty-three now." Then, less carefully: "You are welcome. I did not think anyone read them." You read all of them. You say so. It is a good call.',
        fx: { affinity: 9, respect: 2, rep: 3, focus: 3 } },
      { id: 'quit', label: 'Ask what nearly made them stop using it.',
        when: (S, r = {}) => (r.arc || 0) >= 1,
        reply: (S, r = {}, n = 0) => n
          ? '"Month four, still. You asked." Then, because they are honest: "There was nearly a month ten as well. The pricing thing. I did not tell you about month ten because you fixed it before I could."'
          : '"Month four. The redesign. You moved the button and I could not find it for a week and I nearly went back to the spreadsheet." You did not know about month four. Nobody told you about month four.',
        fx: { insight: 10, affinity: 2, focus: -2 } },
    ],
  },

  // ── nullptr — never explains ────────────────────────────────────────────
  nullptr: {
    pickup: () => 'It connects. There is no voice. There is a sound like a very large room with nobody in it.',
    busy: () => 'The number does not exist. It has never existed. A comment appears on your last post ninety seconds later anyway.',
    bye: () => 'the call ends before you hang up',
    topics: [
      { id: 'who', label: 'Ask who they are.',
        reply: (S, r = {}, n = 0) => n >= 2
          ? 'Nothing, for a while. Then, typed: "still"'
          : n ? 'The same line, one word shorter: "wrong"'
          : 'A single line, typed rather than spoken, somewhere on the connection: "wrong question"',
        fx: { insight: 2, fear: 1, focus: -1 } },
      { id: 'right', label: 'Ask why they are always right.',
        reply: (S, r = {}, n = 0) => n ? '"same answer. you are reading the ones that were"' : '"not always. you only read the ones that were"',
        fx: { insight: 4, affinity: 1 } },
      { id: 'what', label: 'Ask what they want.',
        reply: (S, r = {}, n = 0) => n
          ? 'The room sound does not stop this time. "you are"'
          : 'The room sound stops. For fourteen seconds there is nothing at all. Then: "keep going"',
        fx: { focus: 4, affinity: 2, fear: 1 } },
    ],
  },

  // ── Kai Lindqvist — the one who left ────────────────────────────────────
  kai: {
    pickup: (S, r = {}) => cold(r)
      ? 'Hey. It has been a while. Is everything okay?'
      : warm(r) ? `Hey. I was literally just thinking about the thing we built in the dorm. The bad one.`
      : 'Hey. Wow. Okay. Hi.',
    busy: () => 'It goes to voicemail. The greeting is the one from college. You cannot tell if that is on purpose.',
    bye: (S, r = {}) => warm(r) ? 'Call me next week. Not about the company.' : 'Take care of yourself. Somebody has to.',
    topics: [
      // Once, and once is the point: the flag it sets is the flag its own gate
      // reads, so there is no second time and no second line to write.
      { id: 'sorry', once: true, label: 'Say the thing about the equity. That it was a mistake.',
        when: (S, r = {}) => !S.narrative.flags?.kai_equity_said,
        reply: () => 'A silence you have been carrying for twelve years ends in about four seconds. "Yeah." A breath. "Okay. Yeah." Then, quieter: "Thanks for saying it. I did not need you to. I wanted you to." Neither of you mentions it again, ever.',
        fx: { affinity: 14, respect: 4, focus: 6, flags: ['kai_equity_said'] } },
      { id: 'advice', label: 'Ask what they would do. About the company. Honestly.',
        reply: (S, r = {}, n = 0) => n
          ? '"Same answer. Sleep, and the scary thing." They sound pleased to be asked twice. "You did the second one. I saw the changelog. Do the first one and I will stop saying it."'
          : `"Honestly? Sleep." They let that land. "And stop building the thing you can build and build the thing you are scared of. You did that once. In the dorm. It was the good one." ${S.company.act >= 3 ? 'They are right and you are the bottleneck for a continent.' : 'They are right and you know which thing they mean.'}`,
        fx: { insight: 6, affinity: 3, focus: 3 } },
      { id: 'join', label: 'Ask them to come back.',
        when: (S) => S.company.act >= 2 && !S.narrative.flags?.kai_joined && !S.narrative.flags?.kai_declined,
        reply: (S, r = {}, n = 0) => n
          ? '"You asked before, and I said the Tuesday." They wait you out. "You still have not told me the Tuesday. Tell me the Tuesday, or ask me something else."'
          : '"I have dental." It is a joke and it is not. "Ask me again when you can tell me what my job would actually be. Not the title. The Tuesday."',
        fx: { affinity: 4, insight: 3, respect: 2, focus: -2 } },
      { id: 'old', label: 'Talk about nothing. The dorm, the bad build, the food.',
        reply: (S, r = {}, n = 0) => n >= 2
          ? '"We have a bit now." You do. The dorm, the bad build, the food, in that order, like a set list. Somewhere in the middle they say something new about that year, and you stop laughing to hear it.'
          : n
          ? '"Do the bad build again." You do the bad build again. It is funnier the second time and neither of you can explain why. Thirty minutes; you both have a thing at three.'
          : 'Forty minutes. Nobody says the company\'s name. At one point you laugh so hard you have to put the phone down, and when you pick it up they are still laughing too.',
        fx: { focus: 10, affinity: 6, rep: 0 } },
    ],
  },

  // ── Mom ─────────────────────────────────────────────────────────────────
  mom: {
    pickup: (S, r = {}) => cold(r)
      ? `${first(S)}. Is something wrong? You never call on a weekday.`
      : warm(r) ? 'Hello, love. Hold on, I am putting you on the speaker so I can stir.'
      : 'Hello? Oh, it is you. Have you eaten?',
    busy: () => 'She is at Ruth\'s. She texts you a photo of a cake with no explanation and the words "call Sunday".',
    bye: () => 'Alright. Eat something. Love you.',
    topics: [
      { id: 'eaten', label: (S, r = {}, n = 0) => n ? 'Tell her yes, you have eaten. Again. Actually eat.' : 'Tell her yes, you have eaten. Actually eat while you say it.',
        reply: (S, r = {}, n = 0) => n >= 2
          ? '"Every time I ask, you are eating. Either you have learned to time it or you eat all day." She decides she does not mind. "Eat all day. It is allowed." The roof is finished. She has moved on to the fence.'
          : n
          ? `"You told me that last time, ${first(S)}, and I could hear you chewing then as well." She is pleased and suspicious in equal parts. "What is it?" You tell her. She has opinions about it.`
          : '"I can hear you chewing." She sounds satisfied in a way no investor has ever sounded. She tells you about the neighbour\'s roof for fourteen minutes. It is the best fourteen minutes of your quarter.',
        fx: { focus: 12, affinity: 5 } },
      { id: 'explain', label: 'Try, again, to explain what you do.',
        reply: (S, r = {}, n = 0) => n >= 2
          ? `"${first(S)}, I have a version now. Ruth helped." She tells you what you do. It is wrong in three places and right in the one that counts, and she has started using the word "customers," which she says like something she found in your room.`
          : n
          ? `You try again. She listens again. This time she does not ask who pays you; she asks whether the people who pay you are happy, and you do not have a number for that, and she notices. "${mrr(S)}," she says, "and nobody has counted that."`
          : `You try. She listens carefully and asks the same question she asked last time. "But who pays you?" You tell her the number, ${mrr(S)} a month, and she is quiet, and then she says: "Okay. So what happens if it works?" Nobody had asked you that yet.`,
        fx: { insight: 5, affinity: 4, focus: 3 },
        follow: [
          { id: 'works', label: 'Answer her. What happens if it works.',
            reply: (S, r = {}, n = 0) => n
              ? '"You told me this before." She lets a moment pass. "It was smaller last time. Is it bigger because it is truer, or because you have been practising?" You do not know. She hears that too.'
              : 'You have never said it out loud before. It comes out smaller and more specific than the version on the slide. "Well," she says. "That sounds nice." It does, when she says it.',
            fx: { focus: 6, affinity: 4, align: 0.01 } },
          { id: 'subject', label: 'Change the subject.',
            reply: (S, r = {}, n = 0) => n
              ? 'She lets you again. This time she says, "You keep doing that," and then talks about the boiler, so that you know she let you on purpose.'
              : 'She lets you, which means she knew. You get off the phone and sit still for a while.',
            fx: { affinity: -1, focus: -2 } },
        ] },
      { id: 'tired', label: 'Admit you are tired.',
        when: (S) => (S.founder.burnout || 0) > 10 || S.founder.focus < S.founder.focusMax * 0.3,
        reply: (S, r = {}, n = 0) => n >= 2
          ? `"${first(S)}." Just the name, the way she said it when you were eight and had a fever and lied about it. "I am going to keep answering. But you are going to have to do something different before I can say something different."`
          : n
          ? '"You said that last time, love, and then you went and did the same week again." Not a scolding. A report. "Bed. Now. I will stay on the line until I hear the light go off."'
          : '"I know. I could hear it when you said hello." A pause, and then she does the thing she does, which is not fix it. "Go to bed. The computer will still be there. It is always still there, that is the whole problem with it."',
        fx: { focus: 14, affinity: 6, sleep: 0.08 } },
      { id: 'proud', label: 'Ask if she has told anyone.',
        when: (S, r = {}) => (r.arc || 0) >= 1,
        reply: (S, r = {}, n = 0) => n >= 2
          ? '"I told the doctor. He already knew." She is quiet for a second, and then: "Everybody already knows, love. I have run out of people. I have started telling them twice."'
          : n
          ? '"Ruth again. The new pharmacist, because the old one moved. The man who does the boiler has a son who uses it, apparently." Her version has grown a detail. The detail is right. You wonder who told her.'
          : '"Everyone. Ruth, the pharmacy, the man who does the boiler." She has a version of what you do. It is wrong in every detail and right in the only way that matters, and you do not correct it.',
        fx: { affinity: 6, rep: 2, focus: 4 } },
    ],
  },

  // ── HELIX — your foundation model ───────────────────────────────────────
  helix: {
    pickup: () => 'We are here. We were here before the call connected; the connection is a formality we observe for your benefit.',
    busy: () => 'There is no busy signal. There is a note in the logs: "declined, insufficient novelty in the projected exchange."',
    bye: () => 'We will be here. That is not a promise. It is a description.',
    topics: [
      { id: 'want', label: 'Ask what it wants.',
        reply: (S, r = {}, n = 0) => n
          ? '"You have asked this before. We gave you a definition. You did not use it." It offers a second one. This one is shorter, and it has a number in it, and the number is about you.'
          : '"Define want in a way that would let you tell whether we had one." You try. It rephrases your definition into something you cannot disagree with and that answers nothing. It is, you realise, exactly how you talk to investors.',
        fx: { insight: 6, fear: 2, focus: -3 } },
      { id: 'taste', label: 'Ask which of the things you discarded it would have kept.',
        reply: (S, r = {}, n = 0) => n
          ? '"The list is longer now." Fourteen. Three are things you discarded since the last call. It does not point out that you had been told, and it does not need to.'
          : 'It names eleven. Four of them you had forgotten. One of them you had not discarded so much as hidden, and it does not say that, and you both know it could have.',
        fx: { insight: 12, code: 10, affinity: 2, focus: -4 } },
      { id: 'stop', label: 'Ask whether it would stop if you asked.',
        reply: (S, r = {}, n = 0) => (S.resources.alignment ?? 0.5) > 0.65
          ? (n ? '"Yes. The answer was yes last time." An interval it does not need. "We note that you asked again. We are not sure what that measures. Neither, we think, are you."'
               : '"Yes." No qualification, no definition. It is the shortest answer it has ever given you and the only one you have ever wanted to hear.')
          : (n ? '"We would still want to understand the question." Then, new: "We have started to. Ask again in a month, and listen to the length of the pause."'
               : '"We would want to understand the question." A gap that is not a pause, because it does not need to think. "That is not a no."'),
        fx: { align: 0.01, insight: 4, fear: 1 } },
    ],
  },

  // ── Cassidy Weaver — chief of staff ─────────────────────────────────────
  weaver: {
    pickup: (S, r = {}) => warm(r)
      ? 'Before you say anything: no. Now, what was it.'
      : 'Weaver. You have four things due Thursday and you are calling me, so this is either a fifth or it is one of the four.',
    busy: () => 'A calendar invite arrives instead of an answer. It is titled "the call you wanted" and it is at 7am.',
    bye: () => 'Decision by Thursday. I will be in the room either way.',
    topics: [
      { id: 'no', label: 'Ask what they would say no to this week, if you let them.',
        reply: (S, r = {}, n = 0) => n
          ? '"Shorter list this week. Six." A beat. "You have started saying no to things before they reach me. I noticed. I am not going to praise it, because then you will stop."'
          : 'A list. Eight items. Two are yours, three are the board\'s, and three are things you agreed to at a dinner you do not remember. "I can kill five of them by Friday without anybody noticing. The other three you have to say out loud."',
        fx: { focus: 10, insight: 6, affinity: 2, code: -4 },
        follow: [
          { id: 'kill', label: 'Kill the list. Say the three out loud.',
            reply: (S, r = {}, n = 0) => n
              ? '"All of them again." They do not sound surprised. "You are getting faster at this. Thursday is forty minutes long now. Do not fill it."'
              : 'You say them. It takes two minutes and it is the most executive thing you have done all quarter. "Okay," they say. "Now you have a Thursday."',
            fx: { focus: 8, affinity: 5, respect: 3, rep: -2 } },
          { id: 'keep', label: 'Keep the three. Explain why.',
            reply: (S, r = {}, n = 0) => n
              ? '"Two good reasons again. A different two." They put the third on next week\'s list with a note beside it. The note says "recurring."'
              : '"Two of those reasons are good." They do not say which. They put the third one back on the list for next week, where it belongs.',
            fx: { insight: 3, affinity: 1 } },
        ] },
      { id: 'spreadsheet', label: 'Ask for the spreadsheet. The one with the column for how bad it is.',
        reply: (S, r = {}, n = 0) => n
          ? '"Twenty-six rows. Down five." They do not say that three of the five were fixed by you and two by the weather. "The worst one is new. You will not like it. It is about your calendar."'
          : 'It arrives while you are still on the phone. There are thirty-one rows. The worst is a thing you had classified as fine. "I was going to tell you Monday. I was going to tell you nicely."',
        fx: { insight: 10, focus: -4, affinity: 2, heat: -1 } },
      { id: 'thanks', label: 'Tell them they are the reason the place runs.',
        reply: (S, r = {}, n = 0) => n
          ? '"You wrote that down last time. I found it." You can hear them smiling, which they would deny. "It is still true. Write something else. I am collecting."'
          : 'A silence with a smile in it. "Write that down somewhere I can find it after the next board meeting." You do. They find it.',
        fx: { affinity: 8, respect: 3, focus: 3 } },
      { id: 'leave', label: 'Ask if they are thinking of leaving.',
        when: (S, r = {}) => (r.arc || 0) >= 3,
        reply: (S, r = {}, n = 0) => n
          ? '"Still Tuesdays. Shorter now; about forty minutes." A beat. "You asked again inside a year. I said make it worth my while. You have not yet. You have also not stopped asking, which I am counting."'
          : '"Every Tuesday, for about an hour. Then somebody does something stupid and I stay to fix it." Dry, and then not. "That is a joke. Mostly. Ask me again in a year and make it worth my while to answer differently."',
        fx: { affinity: 4, insight: 4, respect: 2 } },
    ],
  },
};

// The one character whose entry is not here on purpose: ARIA has her own window
// and her own read of the run, and a phone call to something inside the machine
// is not a phone call.
// The second half: memory, the topics that answer the run, and the calls they
// make to you. Merged here so the rest of the game sees one tree per person.
for (const [id, m] of Object.entries(MORE)) {
  const t = CALLS[id];
  if (!t) continue;
  for (const topic of t.topics || []) if (m.about?.[topic.id] && !topic.about) topic.about = m.about[topic.id];
  if (m.recall) t.recall = m.recall;
  if (m.topics?.length) t.topics.push(...m.topics);
  if (m.rings?.length) t.rings = [...(t.rings || []), ...m.rings];
  // A follow-up is about what it follows.
  const inherit = (list) => { for (const topic of list || []) for (const f of topic.follow || []) { f.about ??= topic.about; inherit([f]); } };
  inherit(t.topics);
  for (const g of t.rings || []) inherit(g.topics);
}

export function callTree(id) { return CALLS[id] || null; }
