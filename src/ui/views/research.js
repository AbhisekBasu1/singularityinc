// ── RESEARCH ───────────────────────────────────────────────────────────────
import { esc, bar } from '../dom.js';
import { fmt, money, duration } from '../../engine/format.js';
import { RESEARCH, RESEARCH_MAP, BRANCHES } from '../../data/research.js';
import { isAvailable, isVisible, researchRatePerDay, researchProgressPct, etaDays, researchCost } from '../../systems/research.js';
import { computeMods } from '../../systems/modifiers.js';
import { computeLaneOutput } from '../../systems/agents.js';

let branch = 'engineering';
export function setBranch(b) { branch = b; }
export function getBranch() { return branch; }

export function render(S) {
  const m = computeMods(S);
  const { out: lanes } = computeLaneOutput(S, m);
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
      <span class="pill">+${fmt(rate, 2)}/day</span>
      <span class="pill">${S.stats.researchDone}/${RESEARCH.length} done</span>
    </div>
  </div>

  ${active ? `
  <div class="panel glow-violet mb16" data-tut="research-active">
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
  <div class="panel mb16" style="border-color:rgba(245,166,35,.3)">
    <div class="panel-body row between g12">
      <div><div class="bold">Nothing is being researched.</div>
        <div class="small dim">Research points are accumulating with nowhere to go. Pick a node below.</div></div>
      <span class="pill amber">${fmt(S.resources.research)} pts idle</span>
    </div>
  </div>`}

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
      <div class="tier-nodes">${tn.map((n) => nodeCard(S, n)).join('')}</div>
    </div>`;
  }).join('') || `<div class="empty">Nothing available in this branch yet.<br/>Advance the story or complete prerequisites.</div>`}
  `;
}

function nodeCard(S, n) {
  const done = !!S.research.done[n.id];
  const avail = isAvailable(S, n);
  const active = S.research.active === n.id;
  const afford = S.resources.research >= researchCost(S, n);
  const cls = done ? 'done' : active ? 'active' : avail ? (afford ? 'affordable' : '') : 'locked';
  const missing = n.reqs.filter((r) => !S.research.done[r]).map((r) => RESEARCH_MAP[r]?.name).filter(Boolean);
  const b = BRANCHES[n.branch];

  const queued = (S.research.queue || []).indexOf(n.id);
  return `<div class="tech-node ${cls} ${queued >= 0 ? 'queued' : ''}" ${avail && !active ? `data-act="research" data-v="${n.id}"` : ''}
    ${avail && !active ? 'role="button" tabindex="0"' : ''}>
    ${avail && !active ? `<button class="node-queue" data-act="queue" data-v="${n.id}"
      data-tip="${queued >= 0 ? 'Already queued' : 'Add to research queue'}">${queued >= 0 ? queued + 1 : '+'}</button>` : ''}
    <div class="tech-name" style="${done ? 'color:var(--green)' : ''}">${esc(n.name)}</div>
    <div class="tech-desc">${esc(n.desc)}</div>
    ${n.flavor ? `<div class="tech-flavor">${esc(n.flavor)}</div>` : ''}
    ${!done ? `<div class="tech-cost">
      <span style="color:${afford ? b.color : 'var(--ink-4)'}">⌬ ${fmt(researchCost(S, n))}</span>
      ${n.act > S.company.act ? `<span class="c-amber">Act ${['0','I','II','III','IV','V'][n.act]}</span>` : ''}
      ${n.gate?.compute ? `<span class="${S.resources.computeCap >= n.gate.compute ? 'dim' : 'c-amber'}">▦ ${fmt(n.gate.compute)} PF</span>` : ''}
    </div>` : ''}
    ${missing.length && !done ? `<div class="tech-reqs">needs ${esc(missing.join(', '))}</div>` : ''}
  </div>`;
}
