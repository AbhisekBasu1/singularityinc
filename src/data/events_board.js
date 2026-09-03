// ─────────────────────────────────────────────────────────────────────────────
// THE BOARD, AND THE QUARTER — the cards. §A6 and §A7.
//
// Five cards, and between them they are the only surface either mechanic has
// besides a panel. Four of them belong to a founder who sold a priced round;
// the fifth, the quarterly review, belongs to every run, including a
// bootstrapped one that will never meet an investor.
//
// Each one is `priority` and each one is gated on a flag `systems/board.js`
// sets in the day hook rather than on a date, so a long offline stretch cannot
// skip a meeting and a review cannot fire twice. Every choice clears the flag
// it fired on — that is the contract, and a choice here that forgets to do it
// is a priority card that blocks the deck for ever.
// ─────────────────────────────────────────────────────────────────────────────
import { BOARD } from './balance.js';
import { boardState, boardDue, pendingAsk, acceptAsk, refuseAsk, quarterDue,
         quarterReading, closeQuarter, lastAsk, buyback, buybackCost, canBuyback,
         lostControl, confidenceWord, hasBoard } from '../systems/board.js';

const M = (n) => {
  const v = Math.abs(n);
  if (v >= 1e12) return '$' + (n / 1e12).toFixed(1) + 'T';
  if (v >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (v >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
  return '$' + Math.round(n).toLocaleString();
};
const board = (S) => { try { return boardState(S); } catch (e) { return null; } };
const chairName = (S) => {
  const b = board(S);
  const seat = (b?.seats || [])[0];
  return seat ? seat.person : 'the chair';
};
const chairFund = (S) => {
  const b = board(S);
  const seat = (b?.seats || [])[0];
  return seat ? seat.fund : 'the lead';
};
const pct = (v) => `${Math.round((v || 0) * 100)}%`;

export const EVENTS_BOARD = [

// ── The room exists now ─────────────────────────────────────────────────────

{ id: 'eb_formed', kind: 'story', weight: 0, once: true, priority: 40,
  when: (S) => hasBoard(S) && (S.time.day - (board(S)?.since ?? 0)) <= 14,
  title: 'The First Meeting',
  body: (S) => {
    const b = board(S);
    const seats = (b?.seats || []).length || 1;
    return `There is a calendar invitation with a recurrence rule on it. That is the part that lands.

${chairFund(S)} has a seat now, and so does everybody who came in beside them: **${seats} seat${seats === 1 ? '' : 's'}**, against your **${pct(S.company.equity.founder)}**. The paperwork was signed weeks ago and none of it felt like this, because none of it had a recurrence rule.

${chairName(S)} runs the first one in forty minutes. It is not adversarial. It is worse than adversarial — it is *interested*. Somebody has read the churn cohort you have been avoiding and has a question about month four that you cannot answer, and the question is good.

At the end they ask what you want the standing agenda to be, which is the only part of the meeting that is actually yours.`;
  },
  choices: [
    { label: 'The numbers, in full, every quarter.', sub: 'Nothing hidden. They will hold you to it. +Confidence.', tone: 'good',
      effect: (S, fx) => { const b = board(S); if (b) b.confidence = Math.min(1, b.confidence + 0.12);
        fx.rep(30); fx.focus(-6); fx.flag('board_open_books');
        return 'You send the full pack — cohorts, incidents, the two things that went wrong — the Friday before each meeting. It costs a day a quarter and it buys you the benefit of the doubt exactly once, which turns out to be enough.'; } },
    { label: 'One number, and the reasoning behind it.', sub: 'A board is not a dashboard. Neutral.', tone: 'neutral',
      effect: (S, fx) => { fx.insight(40); fx.focus(-2); fx.flag('board_one_number');
        return 'You pick the metric you actually run the company on and refuse the other nine. Two of them push. ' + chairName(S) + ' does not, and afterwards says that was the right answer and that you should expect to be asked again every quarter for two years.'; } },
    { label: 'Say nothing. Let them set it.', sub: 'You have work to do. −Confidence.', tone: 'risky',
      effect: (S, fx) => { const b = board(S); if (b) b.confidence = Math.max(0, b.confidence - 0.08);
        fx.focus(6); fx.flag('board_ceded_agenda');
        return 'The agenda arrives by email on the Tuesday. It is competent, thorough, and about a company slightly different from the one you are running, and correcting it becomes a standing item that takes twenty minutes of every meeting for the next three years.'; } },
  ] },

// ── The quarterly meeting ───────────────────────────────────────────────────

// `max` and `cooldown` are load-bearing on the three that recur. The default
// ceiling is four showings, and a quarterly card in a fifteen-hundred-day run
// wants eighteen — a capped one would stop being drawn with `due` still set,
// and `tickBoard` waits on `due`, so the board would simply never meet again.
{ id: 'eb_meeting', kind: 'crisis', weight: 0, priority: 46, max: 999, cooldown: 30,
  when: (S) => boardDue(S) && !!pendingAsk(S),
  title: 'The Board Has An Ask',
  body: (S) => {
    const ask = pendingAsk(S);
    const b = board(S);
    const prev = lastAsk(S);
    const conf = b ? b.confidence : 0.5;
    const history = prev && prev.accepted
      ? (prev.kept === true
        ? `Last quarter's ask — *${prev.name.toLowerCase()}* — was met, and the minute says so in one line and then moves on, which is the whole personality of a board.`
        : prev.kept === false
          ? `Last quarter's ask — *${prev.name.toLowerCase()}* — was not met. Nobody says anything unkind. Somebody writes something down.`
          : `Last quarter's ask is still open.`)
      : prev
        ? `You refused last quarter. Nobody has forgotten, and the fact that nobody mentions it is the mention.`
        : `It is the first real ask.`;
    return `${history}

${chairName(S)} puts one slide up and leaves it up.

> **${ask ? ask.name : 'The ask'}** — ${ask ? ask.desc : ''}
>
> *${ask ? ask.line : ''}*

They are not wrong about the underlying thing. That is the difficulty with a good board: the ask is a reasonable reading of a real problem, made by people who are not in the building and who will be reading a different slide in ninety days.

The room is at **${pct(conf)}** on you — ${confidenceWord(conf)} — and everybody in it knows the number without anybody having computed it.`;
  },
  choices: [
    { label: 'Take it. Put it in the minutes.', sub: (S) => { const a = pendingAsk(S); return a ? `Agreed: ${a.line}. +Confidence, and it costs something today.` : 'Agreed.'; }, tone: 'neutral',
      effect: (S, fx) => {
        const note = acceptAsk(S, fx);
        return `${note || 'It goes in the minutes.'} You have ninety days and a number, which is more than most quarters come with.`;
      } },
    { label: 'Refuse it, and show them the work.', sub: 'Costs a week of your own time. Half the damage.', tone: 'costly',
      req: (S) => S.founder.focus >= 18,
      effect: (S, fx) => {
        const b = board(S);
        const before = b ? b.confidence : 0;
        refuseAsk(S);
        // Refusal has already charged the full loss; showing the work buys
        // half of it back, at a week of the founder's own hands.
        if (b) b.confidence = Math.min(1, b.confidence + BOARD.REFUSE_LOSS / 2);
        fx.focus(-18); fx.insight(50); fx.flag('board_argued');
        return before > 0
          ? 'You spend the week before the meeting building the case rather than the product, and you present it yourself, and two of them change their minds in the room. It is the most expensive twenty minutes of the quarter and it works.'
          : 'You make the case. It lands.';
      } },
    { label: 'Refuse it. Move on.', sub: 'Your company. −Confidence.', tone: 'risky',
      effect: (S, fx) => {
        refuseAsk(S);
        fx.focus(4); fx.flag('board_refused');
        return 'You say no, plainly, without a deck. The meeting ends nine minutes early. Nobody follows you out and somebody schedules a call with somebody else that evening.';
      } },
  ] },

// ── The quarter, read back ──────────────────────────────────────────────────

{ id: 'eb_review', kind: 'story', weight: 0, priority: 44, max: 999, cooldown: 30,
  when: (S) => quarterDue(S),
  title: 'The Quarter, Read Back',
  body: (S) => {
    const r = quarterReading(S);
    if (!r.total) return `Ninety days closed this morning and there is nothing to compare them to.

You did not write anything down at the start of it. That is not a failure — most quarters in most companies are like this, and the work was real, and the numbers moved. It is only that you cannot now say whether they moved the way you wanted them to, because you never said which way that was.

The panel on the desk takes three intentions and it takes about twenty seconds. The next ninety days start today.`;
    const lines = r.rows.map((x) => `- ${x.kept ? '**kept** ' : 'missed '}— ${x.line}`).join('\n');
    return `Ninety days closed this morning. You wrote ${r.total === 1 ? 'one thing' : `${r.total} things`} down at the start of them.

${lines}

${r.kept === r.total
  ? 'All of it. That does not happen often and it is worth about ten minutes of sitting still before you write the next three.'
  : r.kept === 0
    ? 'None of it. The quarter was not wasted — quarters rarely are — but it went somewhere other than where you pointed it, and the interesting question is where.'
    : `${r.kept} of ${r.total}. Which is what a quarter usually looks like when somebody is actually keeping score.`}`;
  },
  choices: [
    { label: 'Read them back. Write the next three.', sub: 'Close the quarter.', tone: 'neutral',
      effect: (S, fx) => {
        const r = closeQuarter(S, fx);
        return r.total
          ? `Filed. ${r.kept} of ${r.total}, and the next ninety days are open on the desk.`
          : 'Filed, with nothing in it. The panel is open on the desk.';
      } },
    { label: 'Read them back, and write down what actually happened instead.', sub: 'A page of it. +Insight, −Focus.', tone: 'good',
      effect: (S, fx) => {
        const r = closeQuarter(S, fx);
        fx.insight(45); fx.focus(-5);
        return `It takes an hour and most of it is not about the list. ${r.kept === r.total && r.total ? 'The interesting part is which of them you would not set again.' : 'The interesting part is the one you did not write down and did anyway.'}`;
      } },
    { label: 'Close it and get back to work.', sub: 'The quarter was the quarter. +Focus.', tone: 'neutral',
      effect: (S, fx) => { closeQuarter(S, fx); fx.focus(6);
        return 'You close the tab. Whatever the next ninety days are, they started about four minutes ago.'; } },
  ] },

// ── Two escalations ─────────────────────────────────────────────────────────

{ id: 'eb_forced_harvest', kind: 'crisis', weight: 0, priority: 48, max: 999, cooldown: 60,
  when: (S) => { const b = board(S); return !!b && b.forcedUntil > S.time.day && b.forcedAnnounced !== b.forcedUntil; },
  title: 'The Board Sets The Order',
  body: (S) => {
    const b = board(S);
    return `It is not a vote. Somebody reads a resolution out and then there is a vote, and the resolution is already written.

For the next ${Math.max(1, Math.ceil((b?.forcedUntil || 0) - S.time.day))} days the company's standing order is **Harvest**. Stop buying growth. Find out what the thing is worth. It is a perfectly respectable strategy — it is on the panel, you could have chosen it — and the difference between choosing it and being handed it is the entire content of this meeting.

Confidence in the room is at **${pct(b?.confidence)}**. ${lostControl(S) ? `You hold ${pct(S.company.equity.founder)} of the company, which is not enough to stop them and has not been for a while.` : `You hold ${pct(S.company.equity.founder)}, which is enough to stop them and not enough to make it costless.`}

${chairName(S)} stays behind for a minute afterwards and says the thing that is meant to be kind, which is that this is recoverable and that they have seen it recover.`;
  },
  choices: [
    { label: 'Run it properly. Make the quarter.', sub: 'Harvest, held, and the numbers made. +Confidence.', tone: 'neutral',
      effect: (S, fx) => { const b = board(S); if (b) { b.forcedAnnounced = b.forcedUntil; b.confidence = Math.min(1, b.confidence + 0.06); }
        fx.focus(-8); fx.flag('board_ran_the_harvest');
        return 'You run it like it was your idea, which is the only way to run somebody else\'s idea. Margin comes up, growth comes down, and the quarter after this one is yours again if the number holds.'; } },
    { label: 'Comply with the letter of it.', sub: 'The order stands. Your attention does not. Neutral.', tone: 'risky',
      effect: (S, fx) => { const b = board(S); if (b) { b.forcedAnnounced = b.forcedUntil; b.confidence = Math.max(0, b.confidence - 0.04); }
        fx.insight(30); fx.flag('board_complied');
        return 'The standing order is Harvest and every conversation inside the building is about the thing after Harvest. It is not insubordination. It is worse for morale than insubordination would be, because nobody can name it.'; } },
    { label: 'Ask what it would take to get the quarter back.', sub: 'A real answer, in writing. +Insight.', tone: 'good',
      effect: (S, fx) => { const b = board(S); if (b) { b.forcedAnnounced = b.forcedUntil; b.confidence = Math.min(1, b.confidence + 0.03); }
        fx.insight(60); fx.focus(-4); fx.flag('board_asked_terms');
        return 'They write it down, which surprises you: four conditions, three of them measurable, one of them about you personally and phrased carefully enough that you have to read it twice. You keep the email.'; } },
  ] },

{ id: 'eb_warning', kind: 'crisis', weight: 0, priority: 66, max: 3, cooldown: 200,
  when: (S) => { const b = board(S); return !!b && (b.removeRun || 0) >= BOARD.WARN_AT && lostControl(S) && !S.ending; },
  title: 'The Item Is Not On The Agenda',
  body: (S) => {
    const b = board(S);
    return `There is an item on the agenda called *Governance*, and there has never been an item called Governance.

It is not the vote. The vote, if it comes, is next quarter — that is how these are done, because a board that removes a founder without a quarter of notice is a board that gets sued. This is the quarter of notice, and everybody in the room understands that, and nobody says it.

Confidence sits at **${pct(b?.confidence)}**. You hold **${pct(S.company.equity.founder)}** of the company against their **${pct(S.company.equity.investors)}**, and ${Math.round(BOARD.CONTROL_EQUITY * 100)}% is the line where this conversation would have been impossible.

${chairName(S)} calls you afterwards, on the phone, which they have never done. "I want to be extremely clear that I would rather not." A pause that is not for effect. "That is not the same as saying I won't."`;
  },
  choices: [
    { label: 'Buy the block back. Whatever it costs.', sub: (S) => `${M(buybackCost(S))} for ${Math.round(BOARD.BUYBACK_EQUITY * 100)}% and the quarter.`, tone: 'costly',
      req: (S) => canBuyback(S),
      effect: (S, fx) => {
        const r = buyback(S, fx);
        fx.focus(-14); fx.flag('bought_the_block');
        return `${M(r.cost)} out of the balance sheet for ${Math.round(r.back * 100)}% of your own company, at a premium everybody in the room knows is a premium. The Governance item comes off the agenda. Nothing else about the situation has changed and both of you know it, and you have a year.`;
      } },
    { label: 'Give them the quarter they are asking for.', sub: 'Harvest, held, and the numbers made. +Confidence.', tone: 'neutral',
      effect: (S, fx) => {
        const b = board(S);
        S.company.directive = 'harvest';
        S.company.directiveSince = S.time.day;
        if (b) { b.confidence = Math.min(1, b.confidence + 0.16); b.floorQuarters = 0; b.removeRun = 0; }
        fx.focus(-10); fx.flag('gave_them_the_quarter');
        return 'You run the quarter they wrote. It is the least interesting ninety days of the company\'s life and at the end of it the Governance item is gone and so is a year you will not get back.';
      } },
    { label: 'Let them count the votes.', sub: 'You are not going to be managed out quietly. −Confidence.', tone: 'risky',
      effect: (S, fx) => {
        const b = board(S); if (b) b.confidence = Math.max(0, b.confidence - 0.06);
        fx.rep(20); fx.focus(6); fx.flag('let_them_count');
        return 'You tell them to bring it to a vote and put it in writing. Two of the seats find that admirable, in the way people find a thing admirable when it is happening to somebody else. The item stays on the agenda.';
      } },
  ] },

];
