// ── WORLD ──────────────────────────────────────────────────────────────────
// Act III+: standing, scale, megaprojects, and — at the end — Ascension.
import { esc, md, bar, meter } from '../dom.js';
import { S as LIVE } from '../../engine/state.js';
import { fmt, money } from '../../engine/format.js';
import { WORLD } from '../../data/balance.js';
import { availableProjects, projectCost } from '../../systems/projects.js';
import { availableEndings } from '../../systems/progression.js';
import { commitmentsFor, commitmentDone, canCommit, pathLocked, pathLockedDay } from '../../systems/commitments.js';
import { PROJECT_MAP } from '../../data/projects.js';
import { raceStandings, playerRank, playerProgress, pushLevel, playerCapability } from '../../systems/agirace.js';
import { REGIONS, STAGES, STAGE_INDEX, stanceOf } from '../../data/regions.js';
import { regionState, canEngage, initRegions, regionEffects } from '../../systems/regions.js';
import { worldMap } from '../worldmap.js';

// The open tab is view state on `S.ui`, not module memory: `render(S)` stays
// a function of S, and a reload reopens where the founder left it.
export function setWorldTab(t) { if (LIVE) { LIVE.ui ??= {}; LIVE.ui.worldTab = t; } }
export function getWorldTab(S = LIVE) { return S?.ui?.worldTab || 'standing'; }

const TABS = [
  { id: 'standing', name: 'Standing', icon: '◈' },
  { id: 'board', name: 'The Board', icon: '⊕' },
  { id: 'race', name: 'The Race', icon: '★', req: (S) => !!S.world.race },
  { id: 'projects', name: 'Megaprojects', icon: '▦' },
  { id: 'ascend', name: 'Ascension', icon: '✦', req: (S) => S.company.act >= 5, hot: true },
];

export function render(S) {
  let tab = getWorldTab(S);
  const W = S.world;
  const gdp = WORLD.GDP_2027 * Math.pow(1 + WORLD.GDP_GROWTH, S.time.day / 360);
  const projects = availableProjects(S);
  const queue = W.projectQueue || [];
  const built = Object.values(W.projectsBuilt || {}).reduce((a, b) => a + b, 0);

  const tabs = TABS.filter((t) => !t.req || t.req(S));
  if (!tabs.some((t) => t.id === tab)) { tab = 'standing'; if (S.ui) S.ui.worldTab = 'standing'; }

  return `
  <div class="view-head">
    <div><div class="view-title">The World</div>
      <div class="view-sub">At this size the environment stops being weather and starts being politics.</div></div>
    <div class="row g8">
      <span class="pill ${W.regulatoryHeat > 60 ? 'red' : W.regulatoryHeat > 30 ? 'amber' : ''}">Heat ${Math.round(W.regulatoryHeat)}</span>
      <span class="pill ${W.publicOpinion > 0.6 ? 'green' : W.publicOpinion < 0.35 ? 'red' : ''}">Approval ${Math.round(W.publicOpinion * 100)}%</span>
      ${built ? `<span class="pill violet">${built} project${built === 1 ? '' : 's'} built</span>` : ''}
    </div>
  </div>

  <div class="branch-tabs">
    ${tabs.map((t) => `<button class="branch-tab ${tab === t.id ? 'on' : ''} ${t.hot ? 'hot' : ''}"
      style="--branch-color:${t.hot ? 'var(--violet)' : 'var(--cyan)'}" data-act="world-tab" data-v="${t.id}">
      <span>${t.icon}</span>${t.name}${t.id === 'projects' && queue.length ? `<span class="branch-count">${queue.length} building</span>` : ''}
    </button>`).join('')}
  </div>

  ${tab !== 'standing' ? '' : `
  <div class="grid grid-2 mb16">
    <div class="panel" data-tut="standing"><div class="panel-body col g14">
      <div class="panel-title mb8">Standing</div>
      ${meter('Public approval', Math.round(W.publicOpinion * 100) + '%', W.publicOpinion,
        W.publicOpinion > 0.6 ? 'var(--green)' : W.publicOpinion > 0.35 ? 'var(--amber)' : 'var(--red)')}
      ${meter('Regulatory heat', Math.round(W.regulatoryHeat), W.regulatoryHeat / 100,
        W.regulatoryHeat > 60 ? 'var(--red)' : W.regulatoryHeat > 30 ? 'var(--amber)' : 'var(--green)')}
      ${meter('AI safety concern', Math.round(W.aiSafetyConcern * 100) + '%', W.aiSafetyConcern, 'var(--violet)')}
      ${meter('Alignment', S.resources.alignment.toFixed(2), S.resources.alignment,
        S.resources.alignment > 0.6 ? 'var(--green)' : S.resources.alignment > 0.4 ? 'var(--amber)' : 'var(--red)')}
      <div class="tiny dim">Approval lifts your valuation and softens every bloc that dislikes heat. Regulatory heat is a bill — it shows up as Compliance on the ledger — and investors price it into every round. Alignment stops your own systems routing around you.</div>
      <div class="divider" style="margin:2px 0"></div>
      <div class="col g6">
        ${pressure('Scrutiny', W.regulatoryHeat > 60 ? 'Investigations are active. Every launch is a filing.'
          : W.regulatoryHeat > 30 ? 'You are on several agendas you were not on last year.'
          : 'Nobody important is looking closely.', W.regulatoryHeat > 60 ? 'var(--red)' : W.regulatoryHeat > 30 ? 'var(--amber)' : 'var(--green)')}
        ${pressure('Sentiment', W.publicOpinion > 0.7 ? 'People are glad you exist. Use it.'
          : W.publicOpinion > 0.45 ? 'Mixed. You are useful and slightly unnerving.'
          : 'You are the thing people blame. That has a cost with a delay on it.',
          W.publicOpinion > 0.7 ? 'var(--green)' : W.publicOpinion > 0.45 ? 'var(--amber)' : 'var(--red)')}
        ${pressure('Control', S.resources.alignment > 0.7 ? 'Your systems do what you meant, not what you said.'
          : S.resources.alignment > 0.45 ? 'Occasional surprises. Nothing catastrophic yet.'
          : 'Your oversight is being modelled as an obstacle.',
          S.resources.alignment > 0.7 ? 'var(--green)' : S.resources.alignment > 0.45 ? 'var(--amber)' : 'var(--red)')}
      </div>
    </div></div>

    <div class="panel"><div class="panel-body col g14">
      <div class="panel-title mb8">Scale</div>
      <div class="grid grid-2" style="gap:10px">
        ${tile('Global GDP mediated', (W.globalGdpShare * 100).toFixed(2) + '%', money(gdp * W.globalGdpShare) + ' of ' + money(gdp))}
        ${tile('Compute', fmt(S.resources.computeCap) + ' PF', 'petaflop-days')}
        ${tile('Energy', fmt(S.resources.energyCap) + ' MW', 'dedicated capacity')}
        ${tile('Control', (W.controlPoints || 0).toFixed(1), 'sovereign leverage')}
      </div>
      ${meter('Doom clock', Math.round(W.doomClock) + '/100', W.doomClock / 100,
        W.doomClock > 66 ? 'var(--red)' : W.doomClock > 33 ? 'var(--amber)' : 'var(--green)')}
      <div class="tiny dim">Misalignment, scrutiny and distrust, combined. At 100 it multiplies how often incidents happen by 2.6x and how badly they land by 1.7x.</div>
    </div></div>
  </div>`}

  ${tab === 'board' ? regionPanel(S) : ''}

  ${tab === 'race' ? racePanel(S) : ''}

  ${tab !== 'projects' ? '' : `${queue.length ? `
  <div class="panel mb16 glow-violet">
    <div class="panel-head"><span class="panel-title">Under construction</span>
      <span class="tiny dim">${queue.length} in progress</span></div>
    <div class="panel-body col g12">
      ${queue.map((q) => { const p = PROJECT_MAP[q.id]; if (!p) return '';
        const left = Math.max(0, (1 - q.progress) * q.days);
        return `<div>
          <div class="row between mb4">
            <span class="row g8"><span style="color:var(--violet)">${p.icon}</span><span class="bold small">${esc(p.name)}</span></span>
            <span class="mono tiny dim">${Math.ceil(left)} days · ${(q.progress * 100).toFixed(0)}%</span>
          </div>
          ${bar(q.progress, 'var(--violet)', { shimmer: true })}
        </div>`; }).join('')}
    </div>
  </div>` : ''}

  <div class="panel mb16">
    <div class="panel-head"><span class="panel-title">Megaprojects</span>
      <span class="tiny dim">turn the balance sheet into physical reality</span></div>
    <div class="panel-body">
      ${projects.length === 0 ? `<div class="empty">Nothing available yet. Reach Act III and research infrastructure.</div>` :
      `<div class="grid grid-auto-lg" style="gap:11px">
        ${projects.map((p) => {
          const afford = S.company.cash >= p.cost;
          const built = S.world.projectsBuilt?.[p.id] || 0;
          const locked = !p.available;
          return `<div class="panel" style="padding:14px;border-color:${built ? 'rgba(0,229,160,.25)' : 'var(--line)'};opacity:${locked && !built ? 0.5 : 1}">
            <div class="row between g8 mb4">
              <span class="row g8"><span style="font-size:16px;color:var(--violet)">${p.icon}</span>
                <span class="bold small">${esc(p.name)}</span></span>
              ${built ? `<span class="pill green">×${built}</span>` : `<span class="pill">Act ${['0','I','II','III','IV','V'][p.act]}</span>`}
            </div>
            <div class="tiny dim mb8">${esc(p.desc)}</div>
            <div class="tiny dimmer" style="font-style:italic;min-height:28px">${esc(p.flavor)}</div>
            <div class="row between g8 mt8">
              <span class="mono tiny ${afford ? 'c-green' : 'c-red'}">${money(p.cost)}</span>
              <span class="mono tiny dim">${Math.round(p.days)}d</span>
            </div>
            <button class="btn btn-sm btn-block mt8" data-act="project" data-v="${p.id}"
              ${p.available && afford ? '' : 'disabled'}>
              ${!p.available ? (p.req && !S.research.done[p.req] ? 'Needs research' : (built && !p.repeatable ? 'Built' : 'Locked'))
                : afford ? 'Break ground' : 'Not enough cash'}</button>
          </div>`;
        }).join('')}
      </div>`}
    </div>
  </div>`}

  ${tab !== 'ascend' ? '' : (S.company.act >= 5 ? ascensionPanel(S) : endingPreview(S))}

  ${tab === 'standing' && S.company.act < 5 ? endingPreview(S) : ''}
  `;
}

function regionPanel(S) {
  if (S.company.act < 3) return '';
  initRegions(S);
  const eff = regionEffects(S);
  return `<div class="panel mb16">
    <div class="panel-head">
      <span class="panel-title">The Board</span>
      <span class="tiny dim">eight blocs · four depths</span>
    </div>
    <div class="panel-body">
      ${worldMap(S)}
      <div class="small dim mb16 mt16">Presence compounds: each stage raises your standing, which unlocks the next.
        Stance drifts toward what each bloc actually cares about — reputation, approval, alignment, or leverage.</div>
      <div class="grid grid-auto-lg" style="gap:11px">
        ${REGIONS.map((r) => regionCard(S, r)).join('')}
      </div>
    </div>
  </div>`;
}

function regionCard(S, r) {
  const st = regionState(S, r.id);
  const focused = S.ui?.focusRegion === r.id;
  const stance = stanceOf(st.stance);
  const idx = STAGE_INDEX[st.stage];
  const stage = STAGES[idx];
  const check = canEngage(S, r.id);
  const next = check?.next || STAGES[idx + 1];
  const cost = check?.cost ?? (next ? next.cost(r, S) : 0);

  return `<div class="region-card ${focused ? 'focused' : ''}" id="reg-${r.id}" style="--rc:${r.color}">
    <div class="row between g8 mb6">
      <span class="row g8">
        <span style="font-size:16px;color:${r.color}">${r.icon}</span>
        <span class="bold small">${esc(r.name)}</span>
      </span>
      <span class="pill" style="color:${stance.color};border-color:${stance.color}44" data-tip="${esc(stance.note)}">${stance.name}</span>
    </div>
    <div class="tiny dim mb8" style="line-height:1.45">${esc(r.desc)}</div>
    <div class="row g10 tiny mono dimmer mb8">
      <span data-tip="Share of world population">pop ${(r.pop * 100).toFixed(0)}%</span>
      <span data-tip="Share of world output">gdp ${(r.gdp * 100).toFixed(0)}%</span>
      <span data-tip="Regulatory intensity">reg ${(r.regBase * 100).toFixed(0)}%</span>
    </div>
    <div class="mb8">
      <div class="row between mb4">
        <span class="tiny dim">Standing</span>
        <span class="mono tiny" style="color:${stance.color}">${(st.stance * 100).toFixed(0)}%</span>
      </div>
      ${bar(st.stance, stance.color, { thin: true })}
    </div>
    ${r.bonus ? `<div class="tiny mt6" style="color:${idx >= 2 ? r.color : 'var(--ink-4)'}"
      data-tip="${esc(r.bonus.note)}${idx >= 2 ? '' : '<br><b>Active from the infrastructure stage.</b>'}">
      ${idx >= 2 ? '✓' : '○'} ${esc(r.bonus.label)}</div>` : ''}
    <div class="region-stages">
      ${STAGES.slice(1).map((sg, i) => `<span class="region-pip ${i < idx ? 'on' : ''}"
        data-tip="${esc(sg.desc)}" data-tip-title="${esc(sg.name)}"></span>`).join('')}
      <span class="tiny dim" style="margin-left:6px">${esc(stage.name)}</span>
    </div>
    ${st.building ? `
      <div class="mt8">
        <div class="row between mb4"><span class="tiny dim">Building ${esc(STAGES[STAGE_INDEX[st.building.stage]].name)}</span>
          <span class="mono tiny dim">${Math.ceil((1 - st.progress) * st.building.days)}d</span></div>
        ${bar(st.progress, r.color, { thin: true, shimmer: true })}
      </div>`
    : next ? `
      <div class="row g6 mt10">
        <button class="btn btn-sm grow" data-act="engage" data-v="${r.id}" ${check?.ok ? '' : 'disabled'}>
          ${check?.ok ? `${esc(next.name)} · ${money(cost)}`
            : check?.reason === 'stance' ? `Needs ${Math.round(next.need * 100)}% standing`
            : check?.reason === 'cash' ? `Needs ${money(cost)}` : 'Unavailable'}</button>
        <button class="btn btn-sm btn-ghost" data-act="court" data-v="${r.id}"
          data-tip="Spend influence (or cash) to raise standing directly.">◈</button>
      </div>`
    : `<div class="tiny c-green mt10">Fully integrated.</div>`}
  </div>`;
}

const TONE_C = { good: '#00e5a0', dark: '#8b5cf6', strange: '#4dd0e1', neutral: '#7c8a99', bad: '#ff4d5e' };

function endingPreview(S) {
  const paths = availableEndings(S);
  const open = paths.filter((e) => e.gateMet).length;
  return `<div class="panel">
    <div class="panel-head">
      <span class="panel-title">Where this ends</span>
      <span class="tiny dim">${open} of ${paths.length} gates open</span>
    </div>
    <div class="panel-body">
      <div class="path-grid">
        ${paths.map((e, i) => {
          const c = TONE_C[e.tone] || '#7c8a99';
          const p = e.progress || { done: 0, total: 3 };
          const pips = Array.from({ length: p.total || 3 },
            (_, k) => `<i class="pp-pip${k < p.done ? ' on' : ''}"></i>`).join('');
          return `<div class="path-plate ${e.gateMet ? 'open' : ''}" style="--pc:${c}">
            <div class="pp-idx">${String(i + 1).padStart(2, '0')}</div>
            <div class="pp-head">
              <span class="pp-icon">${e.icon || '⊙'}</span>
              <span class="pp-name">${esc(e.name)}</span>
              <span class="pp-state">${e.gateMet ? 'gate open' : 'sealed'}</span>
            </div>
            <div class="pp-blurb">${esc(e.blurb || '')}</div>
            <div class="pp-line"><span class="pp-k">req</span><span>${esc(e.req || '—')}</span></div>
            <div class="pp-line"><span class="pp-k">build</span>
              <span class="pp-pips">${pips}</span>
              <span class="pp-n">${p.done}/${p.total || 3}</span></div>
          </div>`;
        }).join('')}
      </div>
      <div class="tiny dimmer mt12">In Act V you build one. Three deliberate acts each. That construction is the run.</div>
    </div>
  </div>`;
}

function racePanel(S) {
  if (S.company.act < 3 || !S.world.race) return '';
  const rows = raceStandings(S);
  const crossed = S.world.race.crossed;
  return `<div class="panel mb16 ${crossed && !crossed.you ? 'glow-red' : ''}">
    <div class="panel-head">
      <span class="panel-title">The Race</span>
      <span class="tiny dim">${crossed ? (crossed.you ? 'You crossed first.' : `${esc(crossed.name)} crossed on day ${crossed.day}.`)
        : `you are ${ordinalRank(playerRank(S))} of ${rows.length}`}</span>
    </div>
    <div class="panel-body col g12">
      <div class="small dim">Frontier capability, measured against every benchmark anyone has agreed on. Nobody has said out loud what happens at 100.</div>
      ${rows.map((l) => `
        <div data-tip="${esc(l.line || '')}" data-tip-title="${esc(l.name)}">
          <div class="row between mb4">
            <span class="row g8">
              <span style="color:${l.color};width:14px;text-align:center">${l.icon}</span>
              <span class="small ${l.you ? 'bold' : ''}">${esc(l.name)}</span>
              ${l.you ? '<span class="pill green" style="font-size:9px">you</span>' : `<span class="tiny dimmer">${esc(l.tag)}</span>`}
            </span>
            <span class="mono tiny" style="color:${l.color}">${Math.round(l.progress)}%</span>
          </div>
          ${bar(l.progress / 100, l.color, { thin: !l.you, shimmer: l.progress > 88 })}
        </div>`).join('')}
      ${commitmentRow(S)}
      <div class="tiny dimmer">Rivals accelerate when they fall behind — they read your papers too. Opening your weights speeds everyone up, including them.</div>
    </div>
  </div>`;
}

// Capability is what you hold; commitment is how fast you convert it. Both are
// printed, because a hidden multiplier should not be what decides the race.
function commitmentRow(S) {
  if (S.world.race?.crossed) return '';
  const push = pushLevel(S);
  const held = Math.min(100, playerCapability(S));
  const unconverted = Math.max(0, held - playerProgress(S));
  const band = push >= 0.72 ? ['everything into the frontier', 'var(--green)']
    : push >= 0.45 ? ['a serious share of the company', 'var(--amber)']
    : push >= 0.22 ? ['a side project', 'var(--amber)']
    : ['almost nothing', 'var(--red)'];
  return `<div class="mt4" data-tut="race-commitment">
    <div class="row between mb4">
      <span class="small">Frontier Commitment</span>
      <span class="mono tiny" style="color:${band[1]}">${Math.round(push * 100)}% &middot; ${band[0]}</span>
    </div>
    ${bar(push, band[1], { thin: true })}
    <div class="tiny dimmer mt6">
      Capability is what you hold; commitment is how fast you turn it into frontier progress.
      ${unconverted > 3
        ? `You are holding <b>${Math.round(unconverted)} points</b> of capability you have not converted.`
        : 'You are converting everything you hold.'}
      It moves with the Ascend standing order, agents on Research, your own study hours,
      frontier megaprojects — and with how little you are slowing down for safety.
    </div>
  </div>`;
}

function ordinalRank(n) { return ['—', '1st', '2nd', '3rd', '4th', '5th', '6th'][n] || n + 'th'; }

function ascensionPanel(S) {
  const endings = availableEndings(S);
  const locked = pathLocked(S);
  const lockedName = locked ? (endings.find((e) => e.id === locked)?.name || locked) : null;
  return `<div class="panel glow-violet">
    <div class="panel-head">
      <span class="panel-title" style="color:var(--violet)">Ascension</span>
      <span class="tiny dim">${locked ? 'the path is chosen' : 'nothing is chosen until it is built'}</span>
    </div>
    <div class="panel-body">
      <div class="small dim mb16" style="max-width:680px;line-height:1.65">
        There is nothing left that requires you. What remains is a decision — and it is not a menu.
        Each path is three deliberate acts, each with a real cost, none of them reversible.
        Build one, and then you may take it.
      </div>
      ${locked
        ? `<div class="path-lock chosen">
             <span class="pl-k">committed</span>
             <span class="pl-name">${esc(lockedName)}</span>
             <span class="pl-note">chosen on day ${pathLockedDay(S)} &middot; the other five closed that morning</span>
           </div>`
        : `<div class="path-lock warn">
             <span class="pl-k">warning</span>
             <span class="pl-note">The first act you take on any path <b>closes the other five permanently</b>. Read all six before you touch one.</span>
           </div>`}
      <div class="grid grid-auto-lg" style="gap:12px">
        ${endings.map((e) => {
          const list = commitmentsFor(e.id);
          const shut = locked && locked !== e.id;
          return `<div class="ending-card ${e.available ? 'ready' : ''} ${shut ? 'shut' : ''} ${locked === e.id ? 'chosen' : ''}">
            ${shut ? `<div class="ec-shut">closed &middot; you chose ${esc(lockedName)}</div>` : ''}
            <div class="row g8 mb6"><span style="font-size:20px">${e.icon || '⊙'}</span>
              <span class="bold">${esc(e.name)}</span>
              <span class="grow"></span>
              <span class="mono tiny ${e.available ? 'c-green' : 'dim'}">${e.progress.done}/${e.progress.total}</span></div>
            <div class="small dim" style="line-height:1.55">${esc(e.blurb || '')}</div>
            ${!e.gateMet ? `<div class="tiny c-amber mt8">Gate: ${esc(e.req || '')}</div>` : ''}
            <div class="col g6 mt10">
              ${list.map((c) => {
                const done = commitmentDone(S, c);
                const check = c.kind === 'act' ? canCommit(S, e.id, c.id) : { ok: false };
                return `<div class="commit ${done ? 'done' : ''}">
                  <div class="row g8" style="align-items:flex-start">
                    <span class="commit-mark">${done ? '✓' : c.kind === 'state' ? '◇' : '○'}</span>
                    <span style="min-width:0;flex:1">
                      <span class="commit-name">${esc(c.name)}</span>
                      <span class="commit-desc">${esc(c.desc)}</span>
                      ${!done && c.kind === 'act' ? `<span class="commit-cost">${esc(c.costLabel || '')}</span>` : ''}
                      ${!done && c.hint && (c.kind === 'state' || !check.ok) ? `<span class="commit-hint">${esc(c.hint)}</span>` : ''}
                    </span>
                    ${!done && c.kind === 'act'
                      ? `<button class="btn btn-sm" data-act="commit" data-v="${e.id}" data-c="${c.id}"
                          ${check.ok && e.gateMet ? '' : 'disabled'}>Do it</button>` : ''}
                  </div>
                </div>`;
              }).join('')}
            </div>
            <button class="btn ${e.available ? 'btn-violet' : ''} btn-block mt12" data-act="ending" data-v="${e.id}"
              ${e.available ? '' : 'disabled'}>${e.available ? 'Take this ending' : `${e.progress.total - e.progress.done} left`}</button>
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>`;
}

function pressure(label, text, color) {
  return `<div class="row g8" style="align-items:flex-start">
    <span style="width:6px;height:6px;border-radius:50%;background:${color};margin-top:6px;flex:0 0 6px"></span>
    <span style="min-width:0"><span class="tiny" style="color:${color};font-weight:650">${label}</span>
      <span class="tiny dim" style="display:block;line-height:1.45">${esc(text)}</span></span>
  </div>`;
}

function tile(label, value, sub) {
  return `<div class="stat-tile"><div class="stat-tile-label">${label}</div>
    <div class="stat-tile-value">${value}</div><div class="stat-tile-sub">${esc(sub)}</div></div>`;
}
