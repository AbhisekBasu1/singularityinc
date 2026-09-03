// ─────────────────────────────────────────────────────────────────────────────
// THE TACTICAL DISPLAY — eight blocs on a graticule, filling in as you take
// them. A pure string function like every other view, so it renders headless.
//
// It is not an atlas. It is the board a very large company would put on a wall:
// abstract outlines, stance in the stroke, depth of integration in the fill,
// and a line drawn to everywhere the company actually runs.
// ─────────────────────────────────────────────────────────────────────────────

import { esc } from './dom.js';
import { REGIONS, STAGES, STAGE_INDEX, stanceOf } from '../data/regions.js';
import { regionState, canEngage, rivalIn, rivalName } from '../systems/regions.js';

const W = 1000, H = 440;
// The blocs occupy x 94..868, y 56..394. Crop to that plus a margin so the
// board fills its panel instead of floating in a field of nothing.
const VIEW = '62 28 838 396';
const ROMAN = ['', 'I', 'II', 'III', 'IV'];

// How solid a bloc reads: none is an outline, sovereign is nearly filled.
const FILL = [0.045, 0.14, 0.26, 0.40, 0.62];

function graticule() {
  const lines = [];
  for (let x = 0; x <= W; x += 50) {
    lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${H}" class="${x % 250 === 0 ? 'g-major' : 'g-minor'}"/>`);
  }
  for (let y = 0; y <= H; y += 50) {
    lines.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y}" class="${y % 200 === 0 ? 'g-major' : 'g-minor'}"/>`);
  }
  return `<g class="wm-grid">${lines.join('')}</g>`;
}

// Every place the company actually runs, tied back to wherever it started.
function links(S, held) {
  if (held.length < 2) return '';
  const home = held[0];
  return `<g class="wm-links">${held.slice(1).map((r) => {
    const [x1, y1] = home.at, [x2, y2] = r.at;
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - Math.abs(x2 - x1) * 0.18 - 18;
    return `<path d="M ${x1},${y1} Q ${mx},${my} ${x2},${y2}" class="wm-link"/>`;
  }).join('')}</g>`;
}

export function worldMap(S) {
  const rows = REGIONS.map((r) => {
    const st = regionState(S, r.id);
    const idx = STAGE_INDEX[st.stage] || 0;
    const stance = stanceOf(st.stance);
    const check = canEngage(S, r.id);
    // §A10. Somebody else is in the room. No new art: a small ⊘ over the bloc's
    // shoulder, and the bloc's own tooltip says who and at what depth.
    const rv = rivalIn(S, r.id);
    return { r, st, idx, stance, ready: !!check?.ok, building: !!st.building,
             rival: rv ? { stage: STAGE_INDEX[rv.stage] || 0, who: rivalName(S, r.id) } : null };
  });

  const held = rows.filter((x) => x.idx > 0).map((x) => x.r);
  const pop = rows.reduce((a, x) => a + (x.idx > 0 ? x.r.pop : 0), 0);
  const gdp = rows.reduce((a, x) => a + (x.idx > 0 ? x.r.gdp : 0), 0);
  const sovereign = rows.filter((x) => x.idx >= 4).length;

  const contested = rows.filter((x) => x.rival).length;

  const blocs = rows.map(({ r, st, idx, stance, ready, building, rival }) => {
    const cls = ['wm-bloc', idx > 0 ? 'held' : '', ready ? 'ready' : '', building ? 'building' : '',
                 idx >= 4 ? 'sovereign' : '', rival ? 'contested' : ''].filter(Boolean).join(' ');
    const tip = `${stance.name} &middot; ${esc(STAGES[idx].name)}${building ? ' (building)' : ''}`
      + (rival ? `<br><b>${esc(rival.who)}</b> holds ${esc(STAGES[rival.stage].name.toLowerCase())} here.` : '')
      + `\n${esc(r.desc)}`;
    return `<g class="${cls}" style="--rc:${r.color};--fill:${FILL[idx]}"
      data-act="focus-region" data-v="${r.id}" role="button" tabindex="0"
      data-tip="${tip}" data-tip-title="${esc(r.name)}">
      <path class="wm-shape" d="${r.path}"/>
      <text class="wm-code" x="${r.at[0]}" y="${r.at[1]}">${esc(r.short)}</text>
      <text class="wm-stage" x="${r.at[0]}" y="${r.at[1] + 15}">${idx ? ROMAN[idx] : '—'}</text>
      ${ready ? `<circle class="wm-ping" cx="${r.at[0]}" cy="${r.at[1] - 26}" r="4"/>` : ''}
      ${rival ? `<text class="wm-rival" x="${r.at[0] + 26}" y="${r.at[1] - 14}">⊘</text>` : ''}
    </g>`;
  }).join('');

  return `
  <div class="worldmap" data-tut="map">
    <div class="wm-head">
      <span class="wm-title">Theatre</span>
      <span class="wm-readout">
        <span><i>pop</i>${(pop * 100).toFixed(0)}%</span>
        <span><i>output</i>${(gdp * 100).toFixed(0)}%</span>
        <span><i>blocs</i>${held.length}/8</span>
        ${contested ? `<span class="wm-cold"><i>contested</i>${contested}</span>` : ''}
        ${sovereign ? `<span class="wm-hot"><i>sovereign</i>${sovereign}</span>` : ''}
      </span>
    </div>
    <svg class="wm-svg" viewBox="${VIEW}" preserveAspectRatio="xMidYMid meet" aria-label="World engagement map">
      ${graticule()}
      ${links(S, held)}
      ${blocs}
      <g class="wm-sweep"><line x1="0" y1="0" x2="0" y2="${H}"/></g>
    </svg>
    <div class="wm-key">
      <span class="wmk"><i class="wmk-sw s0"></i>no presence</span>
      <span class="wmk"><i class="wmk-sw s1"></i>market</span>
      <span class="wmk"><i class="wmk-sw s2"></i>infrastructure</span>
      <span class="wmk"><i class="wmk-sw s3"></i>partnership</span>
      <span class="wmk"><i class="wmk-sw s4"></i>sovereign</span>
      <span class="wmk"><i class="wmk-sw contested">⊘</i>somebody else is there</span>
      <span class="wmk-tip">click a bloc for its file &middot; a dot means you can act there now</span>
    </div>
  </div>`;
}
