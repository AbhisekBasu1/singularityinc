// ─────────────────────────────────────────────────────────────────────────────
// THE RACE — rival frontier labs, visibly closing. Act III onward.
// Progress is 0..100. Reaching 100 is the point of no return for somebody.
// ─────────────────────────────────────────────────────────────────────────────

export const LABS = [
  { id: 'aperture', name: 'Aperture Systems', tag: 'the rival you know',
    color: '#ff4d5e', icon: '⚔', base: 0.052, volatility: 0.35, safety: 0.25,
    line: 'Marcus Vance is not going to lose twice.',
    linkedChar: 'vance' },
  { id: 'meridian_state', name: 'The Consortium', tag: 'four governments, one budget',
    color: '#60a5fa', icon: '⚑', base: 0.040, volatility: 0.15, safety: 0.55,
    line: 'Slow, enormous, and answerable to voters. That last part cuts both ways.' },
  { id: 'obsidian', name: 'Obsidian Research', tag: 'nobody knows who funds it',
    color: '#a3a3a3', icon: '◌', base: 0.048, volatility: 0.55, safety: 0.08,
    line: 'No papers. No product. Three datacenters and a nine-figure power contract.' },
  { id: 'commons', name: 'The Open Commons', tag: 'everyone at once',
    color: '#00e5a0', icon: '⌘', base: 0.036, volatility: 0.25, safety: 0.7,
    line: 'Forty thousand contributors and no one to negotiate with.' },
];

export const LAB_MAP = Object.fromEntries(LABS.map((l) => [l.id, l]));

// Narrative beats keyed to how close the leader is.
export const RACE_BEATS = [
  { at: 25, id: 'race_25', text: 'The frontier is no longer a research question. It is a schedule.' },
  { at: 50, id: 'race_50', text: 'Halfway. The conversations have changed from "whether" to "who".' },
  { at: 75, id: 'race_75', text: 'Every capability announcement is now a national security briefing.' },
  { at: 92, id: 'race_92', text: 'Someone is going to cross the line this year.' },
];
