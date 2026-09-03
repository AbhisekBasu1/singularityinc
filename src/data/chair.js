// ─────────────────────────────────────────────────────────────────────────────
// THE OTHER CHAIRS — a board member, and a room watching.
//
// §H15 and §H16. The relay already carried one guest: a person in Vance's
// chair on the rival's origin, playing Aperture's week. Two more sit down at
// the same table and neither of them is playing the game.
//
// A **board member** holds three powers and no keyboard. They cannot spend a
// dollar, hire anybody, or move the clock. They can refuse the next round,
// force the standing order for a quarter, and — only when the board's own
// confidence has already collapsed — move to remove the founder. Each one
// lands as a card the founder has to answer, so the power is a *demand* rather
// than a reducer, and it is bounded exactly like a card the world wrote.
//
// A **spectator** holds one power, which is to say something. The caster's
// line prints in the Wire marked as a caster's, and moves nothing at all.
//
// The prose here is the game's side of all three: what the founder reads when
// somebody who is not playing does something to their company.
// ─────────────────────────────────────────────────────────────────────────────

// What the board can be holding, in the order the chair page lists them.
export const POWERS = [
  { id: 'refuse_round', name: 'Refuse the round', kind: 'round',
    sub: 'No outside money until the next quarter.' },
  { id: 'approve_round', name: 'Approve the round', kind: 'round',
    sub: 'Lift a refusal. The signature is available again.' },
  { id: 'force_directive', name: 'Force the standing order', kind: 'directive',
    sub: 'The company runs on their order for a quarter, whatever you set.' },
  { id: 'remove_founder', name: 'Move to remove the founder', kind: 'motion',
    sub: 'Only when the board has already lost confidence.' },
];

// Why a power is not available, in the mono note the chair prints.
export const REFUSALS = {
  no_board: 'NO BOARD YET',
  no_room: 'NOBODY IN THE SEAT',
  confident: 'THE BOARD IS SATISFIED',
  control: 'THEY DO NOT HOLD THE VOTES',
  already: 'ALREADY REFUSED',
  none: 'NOTHING TO LIFT',
  unknown: 'NOT A MOTION',
  directive: 'NOT AN ORDER',
  rate: 'ONE MOTION AT A TIME',
  card: 'THEY ARE READING SOMETHING',
};

// ── The three cards ─────────────────────────────────────────────────────────
// Each is written the way the deck writes: second person, present tense, one
// number, and two costs rather than one cost twice. `{who}` is what the board
// is called in this company; `{order}` is the order they are forcing.

export const CARDS = {
  refuse_round: {
    kind: 'crisis',
    title: 'The Board Will Not Sign',
    body: 'The call is eleven minutes long and the substance of it is one sentence, delivered early: they are not signing the next round.\n\nNot never. Not at this price, on this quarter, with this burn. What follows the sentence is nine minutes of reasons, all of which are the same reason with different numbers in front of it, and then a silence in which you are expected to say something reassuring.\n\nYou have a term sheet in a folder and no signature that makes it real.',
    choices: [
      { label: 'Take the quarter. Prove the number.', tone: 'neutral',
        sub: 'No round until they meet again',
        outcome: 'You say the only true thing available, which is that you will show them a better quarter, and you get off the call before anybody can make it a negotiation. It costs nothing today. The something it costs arrives in about six weeks.',
        effects: { focus: -4, rep: 6 } },
      { label: 'Tell them what the delay costs.', tone: 'risky',
        sub: 'Reputation for a straight answer',
        outcome: 'You put the runway on the screen and read it out, twice, without adjectives. Two of them go quiet in a way that is not agreement. It does not change the vote and it does change what they think you are, which is the longer game.',
        effects: { rep: -14, insight: 8, focus: -2 } },
      { label: 'Cut the burn instead of arguing.', tone: 'costly',
        sub: 'Money now, momentum later',
        outcome: 'You take a fortnight of spend out of the plan before the call has finished cooling, and send the new model round without commentary. Nobody replies to it. Everybody reads it.',
        effects: { cash: -18000, focus: -6, rep: 10 } },
    ],
  },
  approve_round: {
    kind: 'opportunity',
    title: 'The Refusal Is Lifted',
    body: 'A one-line message at 07:40: the objection to the round is withdrawn.\n\nThere is no explanation and there will not be one. Somebody in that room changed their mind, or somebody who was going to be difficult has stopped being on the call, and either way the folder in your desk is a live document again.\n\nWhat is different is that you now know exactly how long a quarter is.',
    choices: [
      { label: 'Move on it today.', tone: 'good',
        sub: 'Before anybody reconsiders',
        outcome: 'You have the diligence pack out before nine, because you built it during the refusal, because there was nothing else to do during the refusal. The speed is noticed and read as strength, which is close enough to true.',
        effects: { focus: -5, rep: 12 } },
      { label: 'Take the week. Come back with a better price.', tone: 'neutral',
        sub: 'Patience, at a cost',
        outcome: 'You let it sit. The week produces two more weeks of revenue and one more comparable, and the price moves in the direction prices move when you are not desperate.',
        effects: { insight: 10, focus: -2 } },
    ],
  },
  force_directive: {
    kind: 'crisis',
    title: 'The Order Is Not Yours',
    body: 'The resolution is circulated before the meeting and passed during it, which is how you learn that this was arranged rather than decided.\n\nFor the next quarter the company runs on {order}. Not as advice. As the standing order, in the minutes, with your name in the section that records who was present.\n\nYour own people find out at eleven and none of them ask you about it, which is worse than if they had.',
    choices: [
      { label: 'Run their order. Run it better than they meant.', tone: 'neutral',
        sub: 'Compliance, weaponised',
        outcome: 'You execute it precisely and publicly, and you make certain that every second-order consequence of it has your name attached to the memo that predicted it. In ten weeks somebody will read those memos.',
        effects: { focus: -6, rep: 8, insight: 6 } },
      { label: 'Tell the company who set it.', tone: 'risky',
        sub: 'Honesty, and the cost of it',
        outcome: 'You say it in the all-hands, plainly, without editorial. The room is grateful and something in it goes out of the building the same afternoon, into two group chats and then into a reporter\'s inbox.',
        effects: { heat: 5, rep: -8, opinion: -0.02, insight: 4 } },
      { label: 'Say nothing and work the room instead.', tone: 'costly',
        sub: 'A quarter of somebody else\'s evenings',
        outcome: 'You spend the quarter on eleven private calls that are all the same call. Two of them move. It is the least interesting work you have ever done and it is the only work that changes the next vote.',
        effects: { focus: -14, influence: 12 } },
    ],
  },
  remove_founder: {
    kind: 'crisis',
    title: 'A Motion Is Tabled',
    body: 'Item seven. It is written in the passive voice and it is about you.\n\n*That the board considers whether the current executive arrangement remains appropriate to the stage of the company.* Nobody says the word. Two people who have known you for years study the table while it is read into the minutes, which is how you know they knew it was coming.\n\nIt does not carry today. It has been said out loud, in a room with a record, and that is a different company from the one you walked into this morning.',
    choices: [
      { label: 'Answer it. Line by line, in the room.', tone: 'costly',
        sub: 'The whole afternoon, and every number',
        outcome: 'You go through it for three hours without raising your voice once. By the end the motion is withdrawn rather than defeated, which is not the same and is what was available.',
        effects: { focus: -16, rep: 14, insight: 6 } },
      { label: 'Give them a quarter and a number to hold you to.', tone: 'risky',
        sub: 'A promise that can be missed',
        outcome: 'You put a target on the record and offer to leave against it, which stops the conversation because nobody in that room actually wants the alternative. The number is now a thing that exists.',
        effects: { rep: 20, opinion: 0.02, focus: -6 } },
      { label: 'Let it stand. Go back to work.', tone: 'costly',
        sub: 'Nothing said, everything noted',
        outcome: 'You thank them for raising it, close the folder, and are in a review by two. The silence reads as either strength or resignation depending on who is describing it later, and both descriptions will be given.',
        effects: { rep: -10, focus: -2, insight: 10 } },
    ],
  },
};

// The small grey line under a board card, in the journal and the outcome strip.
export const CARD_META = {
  refuse_round: 'The board · they will not sign this quarter',
  approve_round: 'The board · the objection is withdrawn',
  force_directive: 'The board · the standing order is theirs',
  remove_founder: 'The board · item seven',
};

// ── §H16 The room ───────────────────────────────────────────────────────────
// Somebody watching, saying what they see. It is a line in the Wire and it is
// marked as a caster's, because a sentence with no author in a feed the game
// also writes is a sentence the founder will take for the game's opinion.

export const CASTER = {
  author: 'The Room',
  meta: 'A spectator · commentary, and nothing else',
  empty: 'Nobody is watching this run.',
  rate: 'The room has said enough for one day.',
};
