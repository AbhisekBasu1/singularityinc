// ── RESEARCH ───────────────────────────────────────────────────────────────
import { esc, bar, meter } from '../dom.js';
import { S as LIVE } from '../../engine/state.js';
import { fmt, money, duration } from '../../engine/format.js';
import { RESEARCH, RESEARCH_MAP, BRANCHES } from '../../data/research.js';
import { isAvailable, isVisible, researchRatePerDay, researchProgressPct, etaDays, researchCost,
         excludedBy } from '../../systems/research.js';
import { computeMods } from '../../systems/modifiers.js';
import { laneOutputPure } from '../../systems/agents.js';
import { helixReading } from '../../systems/helix.js';
import { clamp } from '../../engine/format.js';

// The open branch is view state on `S.ui`, not module memory (see world.js).
export function setBranch(b) { if (LIVE) { LIVE.ui ??= {}; LIVE.ui.researchBranch = b; } }
export function getBranch(S = LIVE) { return S?.ui?.researchBranch || 'engineering'; }

export function render(S) {
  const branch = getBranch(S);
  const m = computeMods(S);
  // The last tick's totals, never a fresh roll: `computeLaneOutput` draws
  // from the seeded stream for goal drift and this is a render path.
  const lanes = laneOutputPure(S, m);
  const rate = researchRatePerDay(S, lanes.research, m);
  const active = S.research.active ? RESEARCH_MAP[S.research.active] : null;
  const nodes = RESEARCH.filter((n) => n.branch === branch);
  const tiers = [...new Set(nodes.map((n) => n.tier))].sort((a, b) => a - b);

  return `
  <div class="view-head">
    <div><div class="view-title">Research</div>
      <div class="view-sub">Capability compounds. Everything else is temporary.</div></div>
    <div class="row g8">
      <span class="pill violet">${fmt(S.resources.research)} pts</span>
      <span class="pill" data-tip="Research points a day, from the founder's study hours, agents on the Research lane, compute and data." data-tip-title="Rate">+${fmt(rate, 2)}/day</span>
      ${(S.resources.data || 0) >= 1 ? `<span class="pill" data-tip="Every user leaves data behind, and some research generates it outright. It feeds the rate above and, later, the frontier benchmark." data-tip-title="Data">▤ ${fmt(S.resources.data)} data</span>` : ''}
      <span class="pill">${S.stats.researchDone}/${RESEARCH.length} done</span>
    </div>
  </div>

  ${active ? `
  <div class="panel glow-violet mb16" data-tut="research-status">
    <div class="panel-body">
      <div class="row between g12 mb8">
        <div style="min-width:0">
          <div class="tiny dim mono">IN PROGRESS · ${esc(BRANCHES[active.branch].name)}</div>
          <div style="font-size:16px;font-weight:640">${esc(active.name)}</div>
          <div class="small dim mt4">${esc(active.desc)}</div>
        </div>
        <div class="col" style="align-items:flex-end;flex:0 0 auto">
          <div class="mono bold">${fmt(S.resources.research)} / ${fmt(researchCost(S, active))}</div>
          <div class="tiny dim">~${duration(etaDays(S, active, lanes.research) * 7)} remaining</div>
          <button class="btn btn-sm btn-ghost mt8" data-act="cancel-research">Cancel</button>
        </div>
      </div>
      ${bar(researchProgressPct(S), 'var(--violet)', { tall: true, shimmer: true })}
      ${S.research.queue?.length ? `<div class="row g6 wrap mt12">
        <span class="tiny dim" style="align-self:center">Queued:</span>
        ${S.research.queue.map((id, i) => { const n = RESEARCH_MAP[id]; if (!n) return '';
          return `<button class="pill cyan" data-act="unqueue" data-v="${i}" data-tip="Remove from queue">
            ${i + 1}. ${esc(n.name)} ✕</button>`; }).join('')}
      </div>` : `<div class="tiny dimmer mt8">Tip: click <b>+</b> on any available node to queue it. The next one starts automatically.</div>`}
    </div>
  </div>` : `
  <div class="panel mb16" data-tut="research-status" style="border-color:rgba(245,166,35,.3)">
    <div class="panel-body row between g12">
      <div><div class="bold">Nothing is being researched.</div>
        <div class="small dim">Research points are accumulating with nowhere to go. Pick a node below.</div></div>
      <span class="pill amber">${fmt(S.resources.research)} pts idle</span>
    </div>
  </div>`}

  ${helixPanel(S)}

  <div class="branch-tabs">
    ${Object.values(BRANCHES).map((b) => {
      const all = RESEARCH.filter((n) => n.branch === b.id);
      const done = all.filter((n) => S.research.done[n.id]).length;
      const avail = all.filter((n) => isAvailable(S, n) && S.resources.research >= n.cost).length;
      return `<button class="branch-tab ${branch === b.id ? 'on' : ''}" style="--branch-color:${b.color}"
        data-act="branch" data-v="${b.id}" data-tip="${esc(b.desc)}" data-tip-title="${esc(b.name)}">
        <span style="color:${b.color}">${b.icon}</span>${b.name}
        <span class="branch-count">${done}/${all.length}</span>
        ${avail ? `<span class="nav-badge" style="min-width:15px;height:15px;font-size:9px">${avail}</span>` : ''}
      </button>`;
    }).join('')}
  </div>

  <div class="tech-key">
    <span class="tk-label">key</span>
    <span class="tk"><i class="tk-sw ready"></i>ready to start</span>
    <span class="tk"><i class="tk-sw short"></i>needs more points</span>
    <span class="tk"><i class="tk-sw locked"></i>prerequisite missing</span>
    <span class="tk"><i class="tk-sw done"></i>researched</span>
    <span class="tk-tip">click a node to start it &middot; <b>+</b> queues it for later</span>
  </div>

  ${tiers.map((t) => {
    const tn = nodes.filter((n) => n.tier === t).filter((n) => isVisible(S, n) || S.research.done[n.id]);
    if (!tn.length) return '';
    return `<div class="tier-row">
      <div class="tier-label">TIER ${t}</div>
      <div class="tier-nodes">${tn.map((n) => nodeCard(S, n, lanes.research)).join('')}</div>
    </div>`;
  }).join('') || `<div class="empty">Nothing available in this branch yet.<br/>Advance the story or complete prerequisites.</div>`}
  `;
}

// §A23b. HELIX, once the founder has trained one. Standing is a consequence
// rather than a currency — there is no button here — so the panel's whole job
// is to make the consequence legible: where it stands, which way it is going,
// what its last request was, and the two multipliers that ride on it. Pure,
// and it draws nothing: `helixReading` is a read of state.
function helixPanel(S) {
  const h = helixReading(S);
  if (!h) return '';
  const colour = h.standing >= 0.6 ? 'var(--green)' : h.standing >= 0.35 ? 'var(--amber)' : 'var(--red)';
  const arrow = h.trend > 0.02 ? '↑' : h.trend < -0.02 ? '↓' : '·';
  return `<div class="panel mb16" data-tut="helix" style="border-color:${colour}35">
    <div class="panel-head">
      <span class="panel-title">HELIX</span>
      <span class="tiny dim">${h.asks ? `${h.granted} of ${h.asks} request${h.asks === 1 ? '' : 's'} granted` : 'it has not asked for anything'}</span>
    </div>
    <div class="panel-body col g8">
      ${meter('Standing', `${h.word} ${arrow}`, clamp(h.standing, 0, 1), colour)}
      <div class="row between tiny dim mono">
        <span data-tip="A model that trusts the instrument it is graded against does better research. It rises with alignment, with how often its requests are granted, and with where its arc has got to." data-tip-title="What standing buys">RESEARCH ×${h.research.toFixed(2)}</span>
        <span data-tip="A model that does not trust the instrument is likelier to route around you. This scales the odds of a system going rogue." data-tip-title="What standing costs">ROGUE ×${h.rogue.toFixed(2)}</span>
      </div>
      ${h.last ? `<div class="divider" style="margin:2px 0"></div>
        <div class="row between small">
          <span class="dim" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(h.last.choice || h.last.title || 'A request')}</span>
          <span class="mono tiny ${h.last.granted ? 'c-green' : 'c-red'}">${h.last.granted ? 'GRANTED' : 'DECLINED'} &middot; d${Math.floor(h.last.day)}</span>
        </div>` : `<div class="tiny dimmer">It produces, it is evaluated, and the interface between those two things is a dashboard. So far.</div>`}
    </div>
  </div>`;
}

function nodeCard(S, n, laneResearch = 0) {
  const done = !!S.research.done[n.id];
  const avail = isAvailable(S, n);
  const active = S.research.active === n.id;
  const afford = S.resources.research >= researchCost(S, n);
  // How long this would take at today's rate, from the points already banked.
  // Printed on every node you could start, so the choice is made in days.
  const eta = avail && !active ? etaDays(S, n, laneResearch) : null;
  const cls = done ? 'done' : active ? 'active' : avail ? (afford ? 'affordable' : '') : 'locked';
  const missing = n.reqs.filter((r) => !S.research.done[r]).map((r) => RESEARCH_MAP[r]?.name).filter(Boolean);
  const b = BRANCHES[n.branch];
  // §A12a. What this node would close, and what closed it. A tree you can
  // finish all of is a sort by cost; a door is what makes it a build — so the
  // door has to be printed on the node *before* it is walked through, not
  // discovered afterwards.
  const shut = excludedBy(S, n);
  const closes = (n.excludes || []).filter((x) => !S.research.done[x])
    .map((x) => RESEARCH_MAP[x]?.name).filter(Boolean);

  const queued = (S.research.queue || []).indexOf(n.id);
  return `<div class="tech-node ${cls} ${queued >= 0 ? 'queued' : ''}" data-ctx="node" data-id="${n.id}" ${avail && !active ? `data-act="research" data-v="${n.id}"` : ''}
    ${avail && !active ? 'role="button" tabindex="0"' : ''}>
    ${avail && !active ? `<button class="node-queue" data-act="queue" data-v="${n.id}"
      data-tip="${queued >= 0 ? 'Already queued' : 'Add to research queue'}">${queued >= 0 ? queued + 1 : '+'}</button>` : ''}
    <div class="tech-name" style="${done ? 'color:var(--green)' : ''}">${esc(n.name)}</div>
    <div class="tech-desc">${esc(n.desc)}</div>
    ${n.flavor ? `<div class="tech-flavor">${esc(n.flavor)}</div>` : ''}
    ${!done ? `<div class="tech-cost">
      <span style="color:${afford ? b.color : 'var(--ink-4)'}">⌬ ${fmt(researchCost(S, n))}</span>
      ${eta != null ? `<span class="dim" data-tip="At today's rate, counting what is already banked.">${afford ? 'now' : '~' + duration(eta * 7)}</span>` : ''}
      ${n.act > S.company.act ? `<span class="c-amber">Act ${['0','I','II','III','IV','V'][n.act]}</span>` : ''}
      ${n.gate?.compute ? `<span class="${S.resources.computeCap >= n.gate.compute ? 'dim' : 'c-amber'}">▦ ${fmt(n.gate.compute)} PF</span>` : ''}
    </div>` : ''}
    ${missing.length && !done ? `<div class="tech-reqs">needs ${esc(missing.join(', '))}</div>` : ''}
    ${shut && !done ? `<div class="tech-reqs" style="color:var(--red)"
      data-tip="You already took the other road. Nothing reopens it." data-tip-title="Closed">
      closed by ${esc(RESEARCH_MAP[shut]?.name || shut)}</div>` : ''}
    ${!shut && !done && closes.length ? `<div class="tech-reqs" style="color:var(--amber)"
      data-tip="Finishing this one closes the other for the rest of the run. They are two answers to the same question and this company only gets to give one."
      data-tip-title="A door">closes ${esc(closes.join(', '))}</div>` : ''}
  </div>`;
}
