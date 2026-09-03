// ─────────────────────────────────────────────────────────────────────────────
// PROMPT APPROACHES — how you talk to the machine. A persistent style rather
// than a per-click decision, so the core loop stays one keystroke but stops
// being a slot machine.
//
// roll(): weighted outcome bands. Each band gives an output multiplier and a
// debt multiplier. The distribution is the whole personality of the approach.
// ─────────────────────────────────────────────────────────────────────────────

export const APPROACHES = [
  {
    id: 'describe', name: 'Describe the outcome', icon: '◇', color: '#4dd0e1',
    short: 'Fast and loose',
    desc: 'Say what you want and let it fill in the rest. Quick, cheap, and it will invent things.',
    flavour: '"make the dashboard good" — four hundred lines later, it has opinions about what good means.',
    focus: 4.2, cashMult: 0.9,
    scales: 'prompting',
    bands: [
      { p: 0.13, kind: 'brilliant', out: 2.3, debt: 0.55 },
      { p: 0.42, kind: 'good',      out: 1.05, debt: 1.0 },
      { p: 0.27, kind: 'messy',     out: 0.55, debt: 1.9 },
      { p: 0.18, kind: 'hallucinated', out: 0.14, debt: 2.7 },
    ],
  },
  {
    id: 'spec', name: 'Write a precise spec', icon: '⊹', color: '#8b5cf6',
    short: 'Slow and clean',
    desc: 'Define the interface, the invariants and the failure modes first. Costs more focus. Almost no debt.',
    flavour: 'Twenty minutes of writing to save two days of reading.',
    focus: 7.6, cashMult: 1.15, req: null,
    scales: 'engineering',
    bands: [
      { p: 0.08, kind: 'brilliant', out: 1.9, debt: 0.15 },
      { p: 0.66, kind: 'good',      out: 1.15, debt: 0.30 },
      { p: 0.22, kind: 'messy',     out: 0.70, debt: 0.60 },
      { p: 0.04, kind: 'hallucinated', out: 0.25, debt: 0.9 },
    ],
  },
  {
    id: 'examples', name: 'Give it examples', icon: '◈', color: '#00e5a0',
    short: 'Costs insight, buys fit',
    desc: 'Show it three real cases from real users. Output scales with Insight, and what you ship actually fits.',
    flavour: 'It does not need your theory. It needs the transcript.',
    focus: 5.4, cashMult: 1.0, insight: 2.4,
    scales: 'growth', fitBonus: 0.35,
    bands: [
      { p: 0.16, kind: 'brilliant', out: 1.85, debt: 0.5 },
      { p: 0.58, kind: 'good',      out: 1.15, debt: 0.85 },
      { p: 0.21, kind: 'messy',     out: 0.6, debt: 1.4 },
      { p: 0.05, kind: 'hallucinated', out: 0.2, debt: 2.0 },
    ],
  },
  {
    id: 'freehand', name: 'Let it decide', icon: '✦', color: '#f5a623',
    short: 'Maximum variance',
    desc: 'Give it the goal and no constraints. Occasionally produces something you would never have specified.',
    flavour: 'You asked for a fix. It rewrote the module and left a note explaining why you were wrong.',
    focus: 3.4, cashMult: 1.3, req: 'prompt_library',
    scales: 'prompting', breakthrough: 0.055,
    bands: [
      { p: 0.22, kind: 'brilliant', out: 3.1, debt: 0.9 },
      { p: 0.24, kind: 'good',      out: 1.1, debt: 1.2 },
      { p: 0.24, kind: 'messy',     out: 0.5, debt: 2.2 },
      { p: 0.30, kind: 'hallucinated', out: 0.08, debt: 3.2 },
    ],
  },
  {
    id: 'pair', name: 'Pair with it', icon: '⌘', color: '#f472b6',
    short: 'Expensive. You learn.',
    desc: 'Work through it together, line by line. Enormous focus cost, best output, and your own skill grows.',
    flavour: 'You stop being the person who asks and become the person who is asked.',
    focus: 11.5, cashMult: 1.5, req: 'rag',
    scales: 'engineering', xpMult: 3.2, skillChance: 0.10,
    bands: [
      { p: 0.26, kind: 'brilliant', out: 2.4, debt: 0.2 },
      { p: 0.60, kind: 'good',      out: 1.4, debt: 0.45 },
      { p: 0.13, kind: 'messy',     out: 0.8, debt: 0.8 },
      { p: 0.01, kind: 'hallucinated', out: 0.3, debt: 1.2 },
    ],
  },
];

export const APPROACH_MAP = Object.fromEntries(APPROACHES.map((a) => [a.id, a]));

export const KIND_TEXT = {
  brilliant: ['That one landed.', 'It found a better shape than the one you asked for.', 'Clean, complete, and shorter than you expected.'],
  good: ['Works. Does what it says.', 'Solid. Merged.', 'Fine. Next.'],
  messy: ['It works and you would not want to explain how.', 'Passes the tests. Nobody should read it.', 'Functional. Load-bearing duct tape.'],
  hallucinated: ['It made that up.', 'Confident, detailed, entirely fictional.', 'It imported a module that has never existed.'],
};

// Skill-shifted probability: high relevant skill moves mass from the bad bands
// into the good ones without changing the shape of the approach.
//
// §A19: `shift` is added to the skill before the move is computed, and it is
// how sleep reaches the prompt. `sleepShift(S)` in `systems/life.js` is the
// only caller that passes a non-zero one, and it is negative — a tired founder
// prompts like somebody three levels less practised. Kept as a number rather
// than as state so this file stays data and the Desk can print the shifted
// distribution the founder is actually rolling against.
export function shiftedBands(approach, skill, shift = 0) {
  const k = Math.min(0.55, Math.max(0, (skill + shift - 1)) * 0.045);
  const out = approach.bands.map((b) => ({ ...b }));
  let moved = 0;
  for (const b of out) {
    if (b.kind === 'hallucinated' || b.kind === 'messy') {
      const take = b.p * k;
      b.p -= take; moved += take;
    }
  }
  for (const b of out) {
    if (b.kind === 'brilliant') b.p += moved * 0.42;
    if (b.kind === 'good') b.p += moved * 0.58;
  }
  return out;
}
