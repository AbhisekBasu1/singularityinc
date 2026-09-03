// ─────────────────────────────────────────────────────────────────────────────
// DIFFICULTY — chosen once at the start of a timeline. Harder settings pay
// more Legacy points, so the choice is a real trade rather than a slider.
// ─────────────────────────────────────────────────────────────────────────────

export const DIFFICULTIES = [
  {
    id: 'story', name: 'Founder Mode', icon: '☾', color: '#4dd0e1',
    tagline: 'The story, without the knife at your throat.',
    desc: 'Twice the starting cash, gentler burn, softer crises. The whole game, none of the death spirals.',
    mods: { startCash: 2.0, burn: 0.68, incident: 0.6, competitor: 0.72, eventSeverity: 0.65,
            churn: 0.9, researchCost: 0.85, worldHand: 0.6 },
    legacyMult: 0.6,
  },
  {
    id: 'standard', name: 'Standard', icon: '◈', color: '#00e5a0',
    tagline: 'As intended.',
    desc: 'The balance the whole thing was tuned around. Runway matters. Debt compounds. Rivals are real.',
    mods: { worldHand: 1.0 },
    legacyMult: 1.0,
  },
  {
    id: 'ruthless', name: 'Ruthless', icon: '⚔', color: '#f5a623',
    tagline: 'Everything is harder and nothing is unfair.',
    desc: 'Half the starting cash, heavier burn, rivals who compound faster, crises with teeth. Act gates unchanged.',
    // §A21. Ruthless used to produce the same run thirty days sooner: every
    // mod was a scalar on a curve. `rivalFunding` and `rivalPlays` change the
    // *shape* of the opposition instead — Aperture opens with a war chest and
    // takes two decisions a week, so it hires while it researches and the
    // board fills up while you are still choosing a bloc. Read in
    // `systems/rivalco.js`; the act floors are deliberately untouched.
    mods: { startCash: 0.5, burn: 1.35, incident: 1.5, competitor: 1.45, eventSeverity: 1.4,
            churn: 1.18, researchCost: 1.2, worldHand: 1.3,
            rivalFunding: 2.5, rivalPlays: 2 },
    legacyMult: 1.6,
  },
  {
    id: 'onetake', name: 'One Take', icon: '⌬', color: '#ff4d5e',
    tagline: 'No safety net anywhere.',
    desc: 'Ruthless, plus: no offline progress, incidents more frequent and harder still, and the first day below zero cash ends the run.',
    desc2: 'For people who have already finished this once.',
    mods: { startCash: 0.4, burn: 1.5, incident: 1.8, competitor: 1.6, eventSeverity: 1.6,
            churn: 1.25, researchCost: 1.3, rivalRace: 1.05, noOffline: 1, hardFail: 1,
            worldHand: 1.5, rivalFunding: 5, rivalPlays: 2 },
    legacyMult: 2.4,
    req: 'finishedOnce',
  },
];

export const DIFFICULTY_MAP = Object.fromEntries(DIFFICULTIES.map((d) => [d.id, d]));

export function diffMods(S) {
  return (DIFFICULTY_MAP[S?.settings?.difficulty || 'standard'] || DIFFICULTY_MAP.standard).mods;
}
export function diffOf(S) {
  return DIFFICULTY_MAP[S?.settings?.difficulty || 'standard'] || DIFFICULTY_MAP.standard;
}

// ── Difficulty as narrative temperature ─────────────────────────────────────
// Every number in the game is already scaled by the table above: burn,
// incidents, event severity, churn, the rival's funding and how hard the world
// layer is allowed to play. This is the only place the setting reaches the
// *prose*, and it must never reach a number — a card that scaled an effect
// here would charge the founder for the difficulty twice, and the second
// charge would be invisible to `balance.mjs`.
//
// `harsher(S, line)` is one more sentence on the outcome of a crisis card, and
// it appears only on Ruthless and One Take, where the world gives nothing back.
// `gentler(S, line)` is its opposite on Founder Mode. Both return '' on
// Standard — the balance everything was tuned against — and both come back
// with a leading space, so a call site is `return '…' + harsher(S, '…')`.
export function harsher(S, line) {
  const id = diffOf(S).id;
  return line && (id === 'ruthless' || id === 'onetake') ? ' ' + line : '';
}
export function gentler(S, line) {
  return line && diffOf(S).id === 'story' ? ' ' + line : '';
}
