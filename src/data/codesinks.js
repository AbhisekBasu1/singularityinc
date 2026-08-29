// ─────────────────────────────────────────────────────────────────────────────
// WHAT ELSE CODE IS FOR
//
// For most of the game, code had exactly one destination: the next feature. The
// bar filled, you shipped, the bar filled again. Every other number the
// interface shouts about — tech debt, reliability, research — was something you
// could only affect indirectly, by assigning an agent and waiting.
//
// These are the other doors. Each one is a worse deal than shipping in raw
// value, and each one buys something shipping cannot.
//
//   cost(S)   code required — usually relative to the current feature cost, so
//             it stays proportionate for the whole run
//   can(S)    availability
//   do(S)     apply; return the line the player reads
// ─────────────────────────────────────────────────────────────────────────────

import { clamp } from '../engine/format.js';

export const CODE_SINKS = [
  {
    id: 'harden',
    name: 'Harden',
    desc: 'Stop adding. Make what exists survive contact with everyone.',
    note: 'reliability and polish, permanently',
    icon: '⛨',
    cost: (S, featureCost) => Math.round(featureCost * 0.45),
    can: (S) => !!S.products?.[0]?.launched,
    do: (S) => {
      const p = S.products[0];
      p.reliability = clamp(p.reliability + 0.025, 0, 0.995);
      p.polish = clamp(p.polish + 0.03, 0, 5);
      return 'Nothing new ships. The error rate halves, the loading states stop lying, and the support thread goes quiet for a week.';
    },
  },
  {
    id: 'refactor',
    name: 'Refactor',
    desc: 'Go back through what the machine wrote and mean it this time.',
    note: 'the only direct answer to tech debt',
    icon: '⌗',
    cost: (S, featureCost) => Math.round(featureCost * 0.35),
    can: (S) => (S.resources.techDebt || 0) > 12,
    do: (S) => {
      const before = S.resources.techDebt;
      S.resources.techDebt = Math.max(0, before - Math.max(18, before * 0.22));
      const cut = Math.round(before - S.resources.techDebt);
      return `You delete more than you write. Tech debt down **${cut}**. Nobody outside the company will ever know this happened, which is the nature of the work.`;
    },
  },
  {
    id: 'prototype',
    name: 'Prototype',
    desc: 'Build the thing that does not work yet, to find out why.',
    note: 'code into research — a poor exchange rate, and the only one you control',
    icon: '⌬',
    cost: (S, featureCost) => Math.round(featureCost * 0.8),
    can: (S) => S.company.act >= 2 && !!S.research.active,
    do: (S) => {
      const gain = 6 + S.company.act * 5;
      S.resources.research += gain;
      return `Three days of building something you will throw away. It answers a question the papers had not asked yet. **+${gain} research.**`;
    },
  },
  {
    id: 'opensource',
    name: 'Open a component',
    desc: 'Give a piece of it away and let other people carry it.',
    note: 'reputation now, a permanent share of maintenance forever',
    icon: '◇',
    cost: (S, featureCost) => Math.round(featureCost * 0.6),
    can: (S) => S.company.act >= 2 && (S.products?.[0]?.features?.length || 0) >= 6,
    do: (S) => {
      S.resources.reputation += 55 + S.company.act * 22;
      const p = S.products[0];
      if (p) p.awareness = (p.awareness || 0) * 1.06;
      S.narrative.flags.gave_something_away = true;
      return 'It gets 900 stars in a week and one very good pull request from someone in Kraków who is now, functionally, on the team.';
    },
  },
];

export const CODE_SINK_MAP = Object.fromEntries(CODE_SINKS.map((s) => [s.id, s]));
