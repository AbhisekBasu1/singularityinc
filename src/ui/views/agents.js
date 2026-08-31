// ── AGENTS ─────────────────────────────────────────────────────────────────
import { esc, bar, meter, slider } from '../dom.js';
import { fmt, money, pct, clamp } from '../../engine/format.js';
import { MODELS, MODEL_ORDER, SPECIALTIES, TRAIT_MAP, LANES, AGENT_TOOLS, TOOL_MAP } from '../../data/agents.js';
import { maxAgents, hireCost, availableModels, computeLaneOutput } from '../../systems/agents.js';
import { computeMods, agentStats } from '../../systems/modifiers.js';
import { AGENTS } from '../../data/balance.js';

export function render(S) {
  const m = computeMods(S);
  const cap = maxAgents(S);
  const cost = hireCost(S);
  const { out: lanes } = computeLaneOutput(S, m);
  const upkeep = S.agents.reduce((a, x) => a + agentStats(x, S, m).upkeep, 0);
  const lanesAvail = Object.values(LANES).filter((l) => !l.req || S.unlocks[l.req] || S.research.done[l.req]);

  return `
  <div class="view-head">
    <div><div class="view-title">Agents</div>
      <div class="view-sub">You do not hire people. You instantiate them.</div></div>
    <div class="row g8">
      <span class="pill ${S.agents.length >= cap ? 'amber' : ''}">${S.agents.length} / ${cap} slots</span>
      <span class="pill">${money(upkeep)}/day</span>
      <button class="btn btn-primary" data-act="recruit" ${S.agents.length >= cap || S.company.cash < cost ? 'disabled' : ''}>
        Recruit · ${money(cost)}</button>
    </div>
  </div>

  <div class="panel mb16" data-tut="lanes">
    <div class="panel-head"><span class="panel-title">Lane throughput</span>
      <span class="tiny dim">work units / day</span></div>
    <div class="panel-body">
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px">
        ${lanesAvail.map((l) => {
          const v = lanes[l.id] || 0;
          const maxv = Math.max(1, ...Object.values(lanes));
          return `<div data-tip="${esc(l.desc)}" data-tip-title="${esc(l.name)}">
            <div class="row between mb4"><span class="meter-label">${l.icon} ${l.name}</span>
              <span class="mono small">${fmt(v, 1)}</span></div>
            ${bar(v / maxv, laneColor(l.id), { thin: true })}
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>

  ${S.agents.length === 0 ? `
    <div class="panel glow-violet">
      <div class="panel-body" style="text-align:center;padding:40px 24px">
        <div style="font-size:34px;margin-bottom:10px">⌬</div>
        <div style="font-size:17px;font-weight:640">No agents running.</div>
        <div class="small dim mt8" style="max-width:460px;margin:0 auto;line-height:1.6">
          Right now you are the bottleneck: every task waits on you to describe it.
          A persistent agent takes direction once and keeps going while you sleep.
        </div>
        <button class="btn btn-primary btn-lg mt16" data-act="recruit" ${S.company.cash < cost ? 'disabled' : ''}>
          Recruit your first agent · ${money(cost)}</button>
      </div>
    </div>` : `
  <div class="grid grid-auto-lg">
    ${S.agents.map((a) => agentCard(S, a, m, lanesAvail)).join('')}
  </div>`}
  `;
}

function laneColor(id) {
  return ({ build: 'var(--cyan)', growth: 'var(--green)', research: 'var(--violet)',
    ops: 'var(--ink-2)', moonshot: 'var(--pink)' })[id] || 'var(--cyan)';
}

function agentCard(S, a, m, lanesAvail) {
  const st = agentStats(a, S, m);
  const model = MODELS[a.model];
  const spec = SPECIALTIES[a.spec];
  const nextModel = MODEL_ORDER.filter((id) => {
    const mo = MODELS[id];
    return mo.tier > model.tier && (!mo.req || S.research.done[mo.req] || S.unlocks[mo.req]);
  })[0];
  const upCost = nextModel ? Math.floor(AGENTS.UPGRADE_BASE_COST
    * Math.pow(AGENTS.UPGRADE_COST_GROWTH, MODELS[nextModel].tier - 1)) : 0;
  const tools = AGENT_TOOLS.filter((t) => !t.req || S.research.done[t.req]);

  return `<div class="agent-card" data-ctx="agent" data-id="${esc(a.id)}"
    style="--agent-color:${model.color};--agent-bg:${model.color}18">
    <div class="agent-top">
      <div class="agent-avatar">${spec?.icon || '◈'}</div>
      <div style="flex:1;min-width:0">
        <div class="row between g8">
          <span class="agent-name">${esc(a.name)}</span>
          <span class="agent-lvl">Lv${a.level}</span>
        </div>
        <div class="agent-role">${esc(spec?.name || a.spec)} · <span style="color:${model.color}">${esc(model.name)}</span></div>
      </div>
      <button class="btn btn-icon btn-ghost btn-sm" data-act="fire-agent" data-v="${a.id}" data-tip="Release this agent">✕</button>
    </div>

    <div class="row wrap g4 mt8">
      ${(a.traits || []).map((tid) => { const t = TRAIT_MAP[tid]; if (!t) return '';
        return `<span class="trait-chip ${t.good ? 'good' : 'bad'}" data-tip="${esc(t.desc)}" data-tip-title="${esc(t.name)}">${t.icon} ${esc(t.name)}</span>`;
      }).join('')}
      ${(a.tools || []).map((tid) => { const t = TOOL_MAP[tid]; if (!t) return '';
        return `<span class="trait-chip" style="border-color:rgba(77,208,225,.3);color:var(--cyan)" data-tip="${esc(t.desc)}" data-tip-title="${esc(t.name)}">${t.icon} ${esc(t.name)}</span>`;
      }).join('')}
    </div>

    <div class="row g10 mt12 tiny mono dim">
      <span data-tip="Work units produced per day.">⚡ ${fmt(st.output, 1)}/d</span>
      <span data-tip="Tech debt generated per work unit.">⚠ ${st.debt.toFixed(2)}</span>
      <span data-tip="Daily cost.">$ ${money(st.upkeep)}</span>
    </div>

    <div class="mt12">
      <div class="row between mb4">
        <span class="meter-label" data-tip="Morale scales output. It falls with tech debt, crowding, working off-specialty, very low autonomy and a burnt-out founder. It rises with levels, tools and an Empathic teammate." data-tip-title="Morale">Morale</span>
        <span class="mono tiny">${(st.morale * 100).toFixed(0)}%</span></div>
      ${bar(st.morale, st.morale > 0.7 ? 'var(--green)' : st.morale > 0.45 ? 'var(--amber)' : 'var(--red)', { thin: true })}
    </div>

    <div class="mt12">
      <div class="row between mb4">
        <span class="meter-label" data-tip="Higher autonomy means more output and more tech debt — and a small chance the agent stops asking permission.">Autonomy</span>
        <span class="mono tiny" style="color:${a.autonomy > 0.75 ? 'var(--red)' : a.autonomy > 0.5 ? 'var(--amber)' : 'var(--ink-2)'}">${(a.autonomy * 100).toFixed(0)}%</span>
      </div>
      ${slider('autonomy:' + a.id, a.autonomy, a.autonomy > 0.75 ? 'var(--red)' : a.autonomy > 0.5 ? 'var(--amber)' : 'var(--cyan)')}
    </div>

    <div class="mt12">
      <div class="meter-label mb4">Assignment</div>
      <div class="lane-tabs">
        ${lanesAvail.map((l) => {
          const match = SPECIALTIES[a.spec]?.lane === l.id;
          return `<button class="lane-tab ${a.lane === l.id ? 'on' : ''} ${match ? 'match' : ''}"
          data-act="lane" data-v="${a.id}" data-lane="${l.id}"
          data-tip="${esc(l.desc)}${match ? '<br><b>Specialty match: full output, better morale.</b>' : `<br>Off-specialty: ${(st.crossLane * 100).toFixed(0)}% output and −17% morale.`}">${l.icon}<span class="lane-name">${l.name}</span></button>`;
        }).join('')}
      </div>
    </div>

    ${a.lastLine ? `<div class="agent-note" data-tip="${esc((a.memory || []).map((mm) => `d${mm.day} · ${mm.text}`).join('<br>') || 'No notable history yet.')}" data-tip-title="History">
      <span class="dimmer">d${a.lastLineDay ?? 0}</span> ${esc(a.lastLine)}</div>` : ''}

    <div class="row g6 mt12">
      ${nextModel ? `<button class="btn btn-sm grow" data-act="upgrade-agent" data-v="${a.id}" data-model="${nextModel}"
        ${S.company.cash < upCost ? 'disabled' : ''}>↑ ${esc(MODELS[nextModel].name)} · ${money(upCost)}</button>` : ''}
      ${tools.length ? `<button class="btn btn-sm btn-ghost" data-act="agent-tools" data-v="${a.id}">Tools</button>` : ''}
    </div>
  </div>`;
}
