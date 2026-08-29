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
    mods: { startCash: 0.5, burn: 1.35, incident: 1.5, competitor: 1.45, eventSeverity: 1.4,
            churn: 1.18, researchCost: 1.2, rivalRace: 1.15, worldHand: 1.3 },
    legacyMult: 1.6,
  },
  {
    id: 'onetake', name: 'One Take', icon: '⌬', color: '#ff4d5e',
    tagline: 'No safety net anywhere.',
    desc: 'Ruthless, plus: no offline progress, incidents can be fatal, and running out of cash ends the run immediately.',
    desc2: 'For people who have already finished this once.',
    mods: { startCash: 0.4, burn: 1.5, incident: 1.8, competitor: 1.6, eventSeverity: 1.6,
            churn: 1.25, researchCost: 1.3, rivalRace: 1.25, noOffline: 1, hardFail: 1,
            worldHand: 1.5 },
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
