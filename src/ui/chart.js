// ─────────────────────────────────────────────────────────────────────────────
// THE TRAJECTORY — the whole run on one log-scaled axis.
//
// Sparklines answer "is it going up right now". This answers "what happened to
// me", which is a different and better question. Three series over the entire
// run, act boundaries marked, and a pin for every decision the journal thought
// was worth recording.
//
// A pure string function, like every view.
// ─────────────────────────────────────────────────────────────────────────────

import { esc } from './dom.js';
import { fmt, money } from '../engine/format.js';

const W = 1000, H = 300;
const PAD = { l: 46, r: 14, t: 16, b: 26 };
const PLOT_W = W - PAD.l - PAD.r;
const PLOT_H = H - PAD.t - PAD.b;

const SERIES = [
  { key: 'u', name: 'users', color: 'var(--green)', raw: '#00e5a0', fmt: (v) => fmt(v) },
  { key: 'r', name: 'mrr', color: 'var(--cyan)', raw: '#4dd0e1', fmt: (v) => money(v) },
  { key: 'v', name: 'valuation', color: 'var(--amber)', raw: '#f5a623', fmt: (v) => money(v) },
];

const ACT_ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
const KIND_COLOR = {
  crisis: '#ff4d5e', opportunity: '#00e5a0', character: '#4dd0e1',
  milestone: '#f5a623', story: '#8b5cf6',
};

// One shared log scale for all three series: they differ by orders of
// magnitude, and the point is the shape, not the comparison.
const lg = (v) => Math.log10(Math.max(1, v));

export function runChart(S) {
  const arc = (S.company.arc || []).filter((p) => p && p.d != null);
  if (arc.length < 3) {
    return `<div class="chart-empty">Not enough history yet. The trajectory appears after a few weeks.</div>`;
  }

  const dMin = arc[0].d, dMax = Math.max(arc[arc.length - 1].d, dMin + 1);
  let vMax = 1;
  for (const p of arc) for (const s of SERIES) vMax = Math.max(vMax, p[s.key] || 0);
  const yTop = Math.ceil(lg(vMax)) + 0.15;

  const x = (d) => PAD.l + ((d - dMin) / (dMax - dMin)) * PLOT_W;
  const y = (v) => PAD.t + PLOT_H - (lg(v) / yTop) * PLOT_H;

  // Decade gridlines: 1, 10, 100, 1K … whichever fit.
  const rules = [];
  for (let e = 0; e <= yTop; e++) {
    const yy = y(Math.pow(10, e));
    if (yy < PAD.t - 2 || yy > PAD.t + PLOT_H + 2) continue;
    rules.push(`<line class="ch-rule" x1="${PAD.l}" y1="${yy.toFixed(1)}" x2="${W - PAD.r}" y2="${yy.toFixed(1)}"/>
      <text class="ch-ytick" x="${PAD.l - 7}" y="${(yy + 3).toFixed(1)}">${fmt(Math.pow(10, e))}</text>`);
  }

  // Act boundaries, read off the arc itself.
  const acts = [];
  for (let i = 1; i < arc.length; i++) {
    if (arc[i].a > arc[i - 1].a) {
      const xx = x(arc[i].d);
      acts.push(`<g class="ch-act">
        <line x1="${xx.toFixed(1)}" y1="${PAD.t}" x2="${xx.toFixed(1)}" y2="${PAD.t + PLOT_H}"/>
        <text x="${(xx + 4).toFixed(1)}" y="${PAD.t + 10}">ACT ${ACT_ROMAN[arc[i].a] || arc[i].a}</text>
      </g>`);
    }
  }

  const paths = SERIES.map((s) => {
    const pts = arc.map((p) => `${x(p.d).toFixed(1)},${y(p[s.key] || 0).toFixed(1)}`);
    const last = arc[arc.length - 1];
    return `<g class="ch-series" style="--sc:${s.raw}">
      <polyline class="ch-line" points="${pts.join(' ')}"/>
      <circle class="ch-dot" cx="${x(last.d).toFixed(1)}" cy="${y(last[s.key] || 0).toFixed(1)}" r="3"/>
    </g>`;
  }).join('');

  // Pins: the decisions the journal kept, placed on the users line.
  const journal = (S.narrative?.journal || []).filter((j) => j.day >= dMin && j.day <= dMax);
  const step = Math.max(1, Math.ceil(journal.length / 26));   // never a picket fence
  const pins = journal.filter((_, i) => i % step === 0).map((j) => {
    const xx = x(j.day);
    const near = arc.reduce((a, p) => (Math.abs(p.d - j.day) < Math.abs(a.d - j.day) ? p : a), arc[0]);
    const yy = y(near.u || 1);
    const c = KIND_COLOR[j.kind] || '#7c8a99';
    const tip = `d${j.day} &middot; ${esc(j.kind || 'event')}\n**${esc(j.title)}**\n${esc(j.choice || '')}`;
    return `<g class="ch-pin" style="--pc:${c}" data-tip="${tip}" data-tip-title="${esc(j.title)}">
      <line x1="${xx.toFixed(1)}" y1="${yy.toFixed(1)}" x2="${xx.toFixed(1)}" y2="${(yy - 13).toFixed(1)}"/>
      <circle cx="${xx.toFixed(1)}" cy="${(yy - 15).toFixed(1)}" r="3.2"/>
    </g>`;
  }).join('');

  const last = arc[arc.length - 1];

  return `
  <div class="runchart" data-tut="trajectory">
    <div class="ch-head">
      <span class="ch-title">Trajectory</span>
      <span class="ch-legend">
        ${SERIES.map((s) => `<span class="ch-key" style="--sc:${s.raw}">
          <i></i>${s.name}<b>${s.fmt(last[s.key] || 0)}</b></span>`).join('')}
      </span>
    </div>
    <svg class="ch-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" aria-label="Run trajectory">
      ${rules.join('')}
      ${acts.join('')}
      ${paths}
      ${pins}
      <text class="ch-xtick" x="${PAD.l}" y="${H - 8}">d${dMin}</text>
      <text class="ch-xtick ch-end" x="${W - PAD.r}" y="${H - 8}">d${dMax}</text>
    </svg>
    <div class="ch-foot">logarithmic &middot; each pin is a decision you made &middot; hover for what it was</div>
  </div>`;
}
