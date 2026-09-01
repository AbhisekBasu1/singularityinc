// ─────────────────────────────────────────────────────────────────────────────
// THE EDIT DECISION LIST
//
// The whole film, in order. `clip` names a take in OUT/clips, `in` skips the
// dead air at its head, `min` is the visual target in seconds, and `vo` is the
// line spoken over it — which is also the caption, because a judge watches with
// the sound off.
//
// Shared by tools/filmcaps.mjs (which renders the captions) and
// tools/filmcut.mjs (which assembles), so the two can never disagree about
// what is said over which shot.
// ─────────────────────────────────────────────────────────────────────────────
export const EDL = [
  { clip: 't1-contract', in: 0.3, min: 8,
    vo: 'Singularity Inc. runs in the ChatGPT desktop app, in its built-in browser, on GPT 5.6 Sol or Terra. Or in Chrome 149. Or with no assistant at all.' },
  { clip: 't2-hook', in: 0.3, min: 10.5,
    vo: 'They keep saying this era will produce the first one person, billion dollar company. Nobody ever says who the other person is.' },
  { clip: 'boot', in: 16, min: 11,
    vo: 'You play the founder. Your assistant plays everything on the other side of the table. The company does not age while the chat is waiting, so a run opens with a briefing.' },
  { clip: 'hand', in: 1.2, min: 7,
    vo: 'These are the tools the world is holding. That is everything it may do to you, right now, in the browser’s own list.' },
  { clip: 'card', in: 24.5, min: 10,
    vo: 'It deals a card. His face, his words, and three things you could do — written by the assistant, inside the game’s own rules.' },
  { clip: 'type', in: 0.4, min: 11,
    vo: 'Or you ignore the buttons, and type what you actually do.' },
  { clip: 'accept', in: 0.3, min: 8.5,
    vo: 'The consequence comes back written for you. Nothing it writes is real until you press accept.' },
  { clip: 'wire', in: 0.3, min: 7,
    vo: 'It speaks as him on the wire, and keeps playing while you do. It never waits for you.' },
  { clip: 'refuse', in: 5, min: 15,
    vo: 'It plays hard. It does not get to cheat. Ask for too much and the rules refuse it by name, and hand back the number it may have. It rewrites, inside the rule.' },
  { clip: 'revoke', in: 3, min: 12,
    vo: 'Play a certain way for long enough and you take a tool out of its hands. Earn untouchable, and the regulators are gone for the rest of the run.' },
  { clip: 'rival', in: 0.3, min: 10,
    vo: 'The rival lab runs its own website — a second origin, publishing its own tools to this one. One of its press releases is a prompt injection. The game flags it.' },
  { clip: 'stop', in: 0.5, min: 9,
    vo: 'The clock is yours. The stop button halts it, mid run, on screen.' },
  { clip: 'mute', in: 0.5, min: 13,
    vo: 'And you can pull the plug. Every tool it holds, revoked at once — and the written deck takes back every slot without missing a day.' },
  { clip: 't3-evals', in: 0.2, min: 11,
    vo: 'None of this is a demo path. The ceilings are derived from the game’s own deck, and every one of these gates fails the build.' },
  { clip: 't4-end', in: 0.2, min: 9,
    vo: 'Singularity Inc. Your move.' },
];
