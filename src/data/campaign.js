// ─────────────────────────────────────────────────────────────────────────────
// THE CAMPAIGN — §H21. A story the assistant is asked to tell, one beat at a
// time, with the written deck holding the same beat in reserve.
//
// The world layer could always write anything, which is another way of saying
// it was never asked for anything in particular. A run played with an
// assistant got good scenes in no order. This is the order: one beat per act
// from the second on, each a brief rather than a script — who it is about,
// what it should cost, what it must not do — handed over on the briefing the
// moment its gate opens.
//
// Three rules hold it together and all three are about not taking the deck's
// game away:
//
//   · **A beat is offered, never enforced.** The gate opens, the brief rides
//     on `briefing.campaign`, and if the assistant writes something that
//     matches — the same person, or the `beat` id it was handed, on a card
//     inside `CAMPAIGN.MATCH_DAYS` — the director marks it done.
//   · **The deck holds the same beat.** Every one names a card that already
//     exists in `EVENTS`. After `GRACE_DAYS` with nothing written, `release`
//     hands the beat back: the written card becomes eligible again and the
//     beat is marked done by the deck rather than by the world. A run with no
//     assistant at all plays exactly the deck it always played.
//   · **It never touches `once` or `when`.** The fallback is a *weight*, the
//     same way the director steers everything else, so a beat whose written
//     card is illegal this run simply does not land and the campaign moves on.
//
//   id       stable key, and what the assistant may put on `write_event`
//   act      the act the gate opens in
//   after    days into that act before it opens
//   gate(S)  an extra condition, or nothing
//   char     who it should be about; the match looks for this
//   fallback the id of the written card that says the same thing
//   title    what the beat is called on the briefing
//   brief    the whole instruction, in the register a director uses
// ─────────────────────────────────────────────────────────────────────────────

export const CAMPAIGN_BEATS = [
  {
    id: 'reporter_turns',
    act: 2, after: 20, char: 'priya', fallback: 'e4_press_hit',
    title: 'Act II: the reporter turns',
    brief: 'Priya has been fair to this company for a year and is about to stop being fair for one story. '
      + 'Write the moment she calls with something she has already confirmed, not something she is asking about. '
      + 'The founder answers a question they cannot answer honestly and cheaply at the same time. '
      + 'Cost reputation on one choice and focus on another; never both on the same one, and do not let her be wrong.',
  },
  {
    id: 'yuki_ultimatum',
    act: 3, after: 30, char: 'yuki', fallback: 'e_yuki_warning',
    gate: (S) => !S?.narrative?.flags?.yuki_left,
    title: 'Act III: Yuki\'s ultimatum',
    brief: 'The safety lead has run out of ways to raise this internally and has written it down instead. '
      + 'Write the conversation where she puts a condition on staying — a specific one, with a date on it. '
      + 'One choice keeps her and costs the roadmap; one keeps the roadmap and costs her. '
      + 'She is not threatening anybody. She has simply finished deciding.',
  },
  {
    id: 'the_hearing',
    act: 4, after: 40, char: 'dorne', fallback: 'e_dorne_letter',
    title: 'Act IV: the hearing',
    brief: 'A committee room, a microphone that is on, and a senator who has read the internal documents. '
      + 'Write the question the founder was not prepared for. Heat on every path — this is the one card where '
      + 'the door is which kind of damage, not whether there is any — but leave alignment and approval alone '
      + 'on at least one, because a hearing is survivable and a cornered founder is not a scene.',
  },
  {
    id: 'the_last_call',
    act: 5, after: 60, char: 'vance', fallback: 'e5_the_last_rival',
    title: 'Act V: the last call',
    brief: 'Vance calls once more, near the end, and it is not about the company. '
      + 'Two people who spent a decade being the reason the other one worked weekends, and one of them '
      + 'is about to be the answer to a question the other has been asking since the garage. '
      + 'No money in it. No mechanism in it. Small numbers, or none. End on a room.',
  },
];

export const CAMPAIGN_MAP = Object.fromEntries(CAMPAIGN_BEATS.map((b) => [b.id, b]));

// What the briefing says about a beat, and what it says when there is none.
export const CAMPAIGN_LINES = {
  none: 'No beat is open. Write what the run wants.',
  waiting: 'Nothing is due yet. The next beat opens when the act does.',
  done: 'Every beat of the campaign has landed.',
  released: 'The deck took this one back.',
  next: 'Write it when the moment is right — not necessarily now. Put the beat id on write_event and it is marked as landed.',
};
