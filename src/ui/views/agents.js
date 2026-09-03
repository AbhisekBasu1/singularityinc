// ── AGENTS ─────────────────────────────────────────────────────────────────
import { esc, bar, meter, slider, noteSlot } from '../dom.js';
import { recruitNote } from '../notes.js';
import { fmt, money, pct, clamp } from '../../engine/format.js';
import { MODELS, MODEL_ORDER, SPECIALTIES, TRAIT_MAP, LANES, AGENT_TOOLS, TOOL_MAP } from '../../data/agents.js';
import { maxAgents, hireCost, availableModels, laneOutputPure, isHomeLane,
         reviewState, isUnreviewed } from '../../systems/agents.js';
import { computeMods, agentStats } from '../../systems/modifiers.js';
import { AGENTS } from '../../data/balance.js';
import { HELIX_TIERS } from '../../data/mail_roster.js';
import { trendCell, trendRack } from '../why.js';
import { arcSeries } from '../../systems/ledger.js';
import { activity } from '../../systems/activity.js';
import { alarmClass } from '../alarm.js';

export function render(S) {
  const m = computeMods(S);
  const cap = maxAgents(S);
  const cost = hireCost(S);
  // The last tick's totals. Calling `computeLaneOutput` here rolled goal
  // drift on the shared stream seven times a second — see `laneOutputPure`.
  const lanes = laneOutputPure(S, m);
  const upkeep = S.agents.reduce((a, x) => a + agentStats(x, S, m).upkeep, 0);
  const lanesAvail = Object.values(LANES).filter((l) => !l.req || S.unlocks[l.req] || S.research.done[l.req]);

  return `
  <div class="view-head">
    <div><div class="view-title">Agents</div>
      <div class="view-sub">You do not hire people. You instantiate them.</div></div>
    <div class="row g8">
      <span class="pill ${S.agents.length >= cap ? 'amber' : ''}">${S.agents.length} / ${cap} slots</span>
      <span class="pill">${money(upkeep)}/day</span>
      ${reviewPill(S, m)}
      ${noteSlot(recruitNote(S), 'Recruit', '', `<button class="btn btn-primary" data-act="recruit" ${S.agents.length >= cap || S.company.cash < cost ? 'disabled' : ''}>
        Recruit · ${money(cost)}</button>`)}
    </div>
  </div>

  <div class="panel mb16" data-tut="lanes">
    <div class="panel-head"><span class="panel-title">Lane throughput</span>
      <span class="tiny dim">work units / day${(S.resources.skunkworks || 0) >= 1 ? ` &middot; <span data-tip="Code written by agents above the self-direction line, for reasons of their own. It ships as a feature nobody asked for once there is enough of it." data-tip-title="Skunkworks">${fmt(S.resources.skunkworks)} code self-directed</span>` : ''}</span></div>
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
      ${moraleTrend(S)}
    </div>
  </div>

  ${activityPanel(S)}

  ${S.agents.length === 0 ? `
    <div class="panel glow-violet">
      <div class="panel-body" style="text-align:center;padding:40px 24px">
        <div style="font-size:34px;margin-bottom:10px">⌬</div>
        <div style="font-size:17px;font-weight:640">No agents running.</div>
        <div class="small dim mt8" style="max-width:460px;margin:0 auto;line-height:1.6">
          Right now you are the bottleneck: every task waits on you to describe it.
          A persistent agent takes direction once and keeps going while you sleep.
        </div>
        ${noteSlot(recruitNote(S), 'Recruit', 'inline', `<button class="btn btn-primary btn-lg mt16" data-act="recruit" ${S.company.cash < cost ? 'disabled' : ''}>
          Recruit your first agent · ${money(cost)}</button>`)}
      </div>
    </div>` : `
  <div class="grid grid-auto-lg${alarmClass('rogue')}">
    ${S.agents.map((a) => agentCard(S, a, m, lanesAvail)).join('')}
  </div>`}
  `;
}

// §I3. What the roster is doing, right now. The lane panel above says how much
// work is coming out of each lane; this says who is producing it and at what.
// The bar is a shift, not a progress meter — nothing here finishes at 100% —
// which is why it is a segment travelling a track rather than a fill.
function activityPanel(S) {
  const rows = activity(S);
  if (!rows.length) return '';
  return `<div class="panel mb16" data-tut="activity">
    <div class="panel-head">
      <span class="panel-title">On the floor</span>
      <span class="tiny dim">${rows.length} running${rows[0]?.phaseWord ? ` · ${esc(rows[0].phaseWord)}` : ''}</span>
    </div>
    <div class="panel-body">
      <div class="act-strip">
        ${rows.map((r) => `<div class="act-row ${r.note ? 'noted' : ''}" style="--lc:${r.color};--ph:${r.phase.toFixed(3)}"
            data-ctx="agent" data-id="${esc(r.id)}">
          <span class="act-who">${esc(r.name)}</span>
          <span class="act-lane mono" data-tip="${esc(r.laneName)}">${r.laneIcon} ${esc(r.laneName)}</span>
          <span class="act-track" aria-hidden="true"><i></i></span>
          <span class="act-task">${esc(r.task)}</span>
        </div>`).join('')}
      </div>
    </div>
  </div>`;
}

// §B3. Mean morale across the run. Morale is the one agent number that decides
// whether the roster stays — under `QUIT_MORALE` for long enough and they leave
// — and it moves slowly enough that the card meters never show it moving.
function moraleTrend(S) {
  const mo = arcSeries(S, 'mo');
  if (mo.length < 3) return '';
  return `<div class="mt12">${trendRack([
    trendCell('Mean morale', mo, { color: 'var(--green)', fmt: (v) => Math.round(v * 100) + '%',
      note: 'The average across the roster, over the whole run. It falls with tech debt, crowding, off-specialty work and a burnt-out founder.' }),
    trendCell('Tech debt', arcSeries(S, 'td'), { color: 'var(--amber)', fmt: (v) => String(Math.round(v)),
      note: 'The largest single drag on morale, and the one you can put an agent on.' }),
  ])}</div>`;
}

// §A4. Span of control, on the screen it bounds. The pill says how many of the
// roster the founder's day actually reached; the card of one it did not says
// UNREVIEWED, because "your roster is too big for you" has to be legible on
// the agent it is happening to and not only in a total.
function reviewPill(S, m) {
  const r = reviewState(S, m);
  if (!r.total) return '';
  const short = r.total - r.covered;
  return `<span class="pill ${short ? 'amber' : ''}"
    data-tip="Every running agent takes some of your day to check, and the day's focus regeneration pays that first. ${fmt(r.need, 1)} of ${fmt(r.budget, 1)} focus a day.${short ? `<br><b>${short} running unreviewed:</b> ×${AGENTS.UNREVIEWED_DEBT} tech debt and morale sliding. A better model, a longer leash, or a smaller roster.` : ''}"
    data-tip-title="Review">Review ${r.covered}/${r.total}</span>`;
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
  // Your own weights, and the character that is them. The tier has been called
  // Helix since Act IV and nothing on this screen ever said which agents were
  // on it — see `m_helix_roster` in `src/data/mail_roster.js`.
  const helix = HELIX_TIERS.includes(a.model);

  return `<div class="agent-card${alarmClass(`agent:${a.id}`)}" data-ctx="agent" data-id="${esc(a.id)}"
    style="--agent-color:${model.color};--agent-bg:${model.color}18">
    <div class="agent-top">
      <div class="agent-avatar">${spec?.icon || '◈'}</div>
      <div style="flex:1;min-width:0">
        <div class="row between g8">
          <span class="agent-name">${esc(a.name)}</span>
          <span class="agent-lvl">Lv${a.level}</span>
        </div>
        <div class="agent-role" data-tip="${esc(spec?.desc || '')}" data-tip-title="${esc(spec?.name || a.spec)}">${esc(spec?.name || a.spec)} · <span style="color:${model.color}">${esc(model.name)}</span>${helix ? ` <span class="tiny mono" style="color:var(--green)" data-tip="This one runs on your own weights. HELIX knows it is running it, and says so." data-tip-title="Runs on HELIX">◈ HELIX</span>` : ''}</div>
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
      <span data-tip="Work units per day, as the agent reports them. The lane panel above adds up what was actually done.">⚡ ${fmt(st.reported, 1)}/d</span>
      <span data-tip="Tech debt generated per work unit. Rises with the codebase on a small context window.">⚠ ${st.debt.toFixed(2)}</span>
      <span data-tip="Daily cost.">$ ${money(st.upkeep)}</span>
      ${isUnreviewed(S, a.id, m) ? `<span class="mono" style="color:var(--amber)"
        data-tip="Your day ran out before you got to this one. It is still working — nobody read the diff and nobody asked how it was getting on. ×${AGENTS.UNREVIEWED_DEBT} tech debt, and its morale is sliding.<br>A better model needs less reading; more autonomy needs less asking."
        data-tip-title="Unreviewed">UNREVIEWED</span>` : ''}
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
          const match = isHomeLane({ ...a, lane: l.id });
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
