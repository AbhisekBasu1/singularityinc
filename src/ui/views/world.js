// ── WORLD ──────────────────────────────────────────────────────────────────
// Act III+: standing, scale, megaprojects, and — at the end — Ascension.
import { esc, md, bar, meter, slider } from '../dom.js';
import { S as LIVE } from '../../engine/state.js';
import { fmt, money } from '../../engine/format.js';
import { WORLD } from '../../data/balance.js';
import { availableProjects, projectCost, maxProjectSlots, projectSlotsUsed as slotsUsed,
         projectBlockedNote } from '../../systems/projects.js';
import { upkeepOf } from '../../systems/economy.js';
import { computeSplit, computeSplitFx } from '../../systems/compute.js';
import { availableEndings, explainWorld } from '../../systems/progression.js';
import { commitmentsFor, commitmentDone, canCommit, pathLocked, pathLockedDay } from '../../systems/commitments.js';
import { PROJECT_MAP } from '../../data/projects.js';
import { raceStandings, playerRank, playerProgress, pushLevel, playerCapability } from '../../systems/agirace.js';
import { REGIONS, STAGES, STAGE_INDEX, stanceOf } from '../../data/regions.js';
import { regionState, canEngage, initRegions, regionEffects,
         rivalIn, rivalName, canDisplace, stanceDrivers } from '../../systems/regions.js';
import { labReadout } from '../../systems/labs.js';
import { apertureState } from '../../systems/rivalco.js';
import { REGION_BOARD as BOARD, RACE, ENDINGS_FORCED as EF } from '../../data/balance.js';
import { worldMap } from '../worldmap.js';
import { whyPanel, whyBlock, trendCell, trendRack } from '../why.js';
import { arcSeries } from '../../systems/ledger.js';
import { explainAlignment } from '../../systems/alignment.js';
import { computeMods } from '../../systems/modifiers.js';

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
      ${standingTrends(S)}
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

    ${splitPanel(S)}
  </div>`}

  ${tab === 'standing' ? standingWhy(S) : ''}

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
      <span class="tiny dim">${slotsUsed(S)} of ${maxProjectSlots(S)} slots &middot; turn the balance sheet into physical reality</span></div>
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
            <div class="row between g8 mt4 tiny dimmer"
              data-tip="Upkeep never stops. It is staffed, powered, cooled and defended for as long as you own it — and it is a line in the ledger the day it opens." data-tip-title="Upkeep">
              <span>upkeep</span><span class="mono">${money(upkeepOf(p.cost))}/day</span></div>
            <button class="btn btn-sm btn-block mt8" data-act="project" data-v="${p.id}"
              ${p.available && afford ? '' : 'disabled'}>
              ${!p.available ? (projectBlockedNote(S, p) || 'Locked')
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

// §B3. Which way the four slow numbers have been going, over the whole run.
// The arc has one sample every ten days and never loses the beginning, so this
// is Act III next to today rather than the last fortnight. A save written
// before these were recorded simply draws a shorter line.
function standingTrends(S) {
  const al = arcSeries(S, 'al'), ht = arcSeries(S, 'ht'), ap = arcSeries(S, 'ap');
  const rc = arcSeries(S, 'rc'), rv = arcSeries(S, 'rv');
  return trendRack([
    trendCell('Alignment', al, { color: 'var(--green)', fmt: (v) => v.toFixed(2),
      note: 'Where alignment has been. It converges on an equilibrium, so a line that is drifting down is a target that moved — see the panel below.' }),
    trendCell('Regulatory heat', ht, { color: 'var(--red)', fmt: (v) => String(Math.round(v)),
      note: 'Heat accrues with scale and cools at a fixed rate. A line that never comes back down is a company that outgrew its Legal lane.' }),
    trendCell('Approval', ap, { color: 'var(--cyan)', fmt: (v) => Math.round(v * 100) + '%',
      note: 'What the public makes of you. It follows your own users first and your size second.' }),
    trendCell('The frontier', rc, { color: 'var(--violet)', fmt: (v) => v.toFixed(1),
      note: rv.length ? `You against the leading lab, which is at <b>${rv[rv.length - 1].toFixed(1)}</b>. The race is decided by a handful of points.` : 'Your progress toward the frontier benchmark.' }),
  ]);
}

// §B1. The three numbers that decide the back half of a run, decomposed. The
// alignment equilibrium is the whole mechanic of Acts IV and V and was written
// nowhere; heat is a bill and approval is a discount, and both are the sum of
// four terms a founder can move. `explainAlignment` and `explainWorld` are the
// same functions `loop.js` and `tickWorld` run, so these rows cannot drift
// from the simulation — see `systems/alignment.js`.
function standingWhy(S) {
  const m = computeMods(S);
  const a = explainAlignment(S, m);
  const w = explainWorld(S, m);
  const dir = (v) => (v > 0.0002 ? '↑' : v < -0.0002 ? '↓' : '→');
  const sign = (v, d = 3) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(d);
  return whyPanel(S, {
    id: 'standing',
    title: 'Why standing is what it is',
    blocks: [
      whyBlock('Alignment', `${a.now.toFixed(2)} ${dir(a.perDay)} ${a.target.toFixed(2)}`, a.rows,
        { subColor: a.perDay >= 0 ? 'var(--green)' : 'var(--red)' }),
      whyBlock('The drift', `${sign(a.perDay)}/day`, a.drift,
        { subColor: a.perDay >= 0 ? 'var(--green)' : 'var(--red)' }),
      whyBlock('Regulatory heat', `${Math.round(w.heat.total)} ${sign(w.heat.perDay, 2)}/day`, w.heat.rows,
        { invert: true, subColor: w.heat.perDay > 0 ? 'var(--red)' : 'var(--green)' }),
      whyBlock('Public approval', `${Math.round(w.approval.total * 100)}% → ${Math.round(w.approval.target * 100)}%`,
        w.approval.rows, { subColor: w.approval.target >= w.approval.total ? 'var(--green)' : 'var(--red)' }),
    ],
    foot: `Alignment converges on its equilibrium and nowhere else: to raise it for good you have to raise the <b>target</b>, not the number. Heat is charged as Compliance on the Ledger and discounts every round. Approval multiplies the valuation and softens every bloc on the board.`,
  });
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
    ${tasteRow(r)}
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
      ${driftRow(S, r, st)}
    </div>
    ${r.bonus ? `<div class="tiny mt6" style="color:${idx >= 2 ? r.color : 'var(--ink-4)'}"
      data-tip="${esc(r.bonus.note)}${idx >= 2 ? '' : '<br><b>Active from the infrastructure stage.</b>'}">
      ${idx >= 2 ? '✓' : '○'} ${esc(r.bonus.label)}</div>` : ''}
    <div class="region-stages">
      ${STAGES.slice(1).map((sg, i) => `<span class="region-pip ${i < idx ? 'on' : ''}"
        data-tip="${esc(sg.desc)}" data-tip-title="${esc(sg.name)}"></span>`).join('')}
      <span class="tiny dim" style="margin-left:6px">${esc(stage.name)}</span>
    </div>
    ${rivalRow(S, r)}
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
            : check?.reason === 'rival' ? `${esc(check.who || 'Somebody')} holds this bloc`
            : check?.reason === 'stance' ? `Needs ${Math.round(next.need * 100)}% standing`
            : check?.reason === 'cash' ? `Needs ${money(cost)}` : 'Unavailable'}</button>
        <button class="btn btn-sm btn-ghost" data-act="court" data-v="${r.id}"
          data-tip="Spend influence (or cash) to raise standing directly.">◈</button>
      </div>
      ${check?.reason === 'rival' ? displaceRow(S, r) : ''}`
    : `<div class="tiny c-green mt10">Fully integrated.</div>`}
  </div>`;
}

// §B7. What a bloc wants and what it will not forgive. Eight cards, four
// tastes between them, and the whole board was played blind: `likes` and
// `dislikes` decide every stance in the game and were printed nowhere.
const TASTE = {
  reputation: ['reputation', 'They read the press. Build reputation and they warm on their own.'],
  opinion: ['approval', 'Public approval here follows public approval everywhere.'],
  alignment: ['alignment', 'They want to know the thing does what it was asked.'],
  control: ['leverage', 'Sovereign leverage reads as seriousness rather than as a threat.'],
  heat: ['heat', 'Scrutiny elsewhere is scrutiny here, and it costs more the larger you get.'],
};
function tasteRow(r) {
  const chips = [
    ...r.likes.map((k) => ['likes', k]),
    ...r.dislikes.map((k) => ['dislikes', k]),
  ].filter(([, k]) => TASTE[k]);
  if (!chips.length) return `<div class="taste-row"><span class="taste none"
    data-tip="Nothing in particular moves them. Presence and time are the whole lever here."
    data-tip-title="No strong feelings">pragmatic</span></div>`;
  return `<div class="taste-row">${chips.map(([kind, k]) => `<span class="taste ${kind}"
    data-tip="${esc(TASTE[k][1])}" data-tip-title="${kind === 'likes' ? 'Wants' : 'Will not forgive'}"
    >${kind === 'likes' ? '+' : '−'} ${esc(TASTE[k][0])}</span>`).join('')}</div>`;
}

// Which way it is going this month, and the single largest reason. Stance
// drifts toward a target at 1.4% of the gap a day, so the arrow is worth more
// than the number: a bloc at 48% and climbing is a different bloc from one at
// 48% and sliding.
function driftRow(S, r, st) {
  const d = stanceDrivers(S, r, st);
  const per30 = d.gap * 0.014 * 30;
  if (Math.abs(per30) < 0.002) {
    return `<div class="drift-row flat" data-tip="Standing is where its drivers put it. It will sit here until one of them moves." data-tip-title="Settled">→ steady at ${(d.target * 100).toFixed(0)}%</div>`;
  }
  const up = per30 > 0;
  // The biggest term in the direction the stance is actually travelling; that
  // is the one a founder can do something about.
  const pull = d.rows.filter((x) => (up ? x.v > 0 : x.v < 0))
    .sort((a, b) => Math.abs(b.v) - Math.abs(a.v))[0];
  return `<div class="drift-row ${up ? 'up' : 'down'}"
    data-tip="Toward <b>${(d.target * 100).toFixed(0)}%</b> at 1.4% of the gap a day.${
      pull ? ` The largest term pulling it ${up ? 'up' : 'down'} is <b>${esc(pull.label.toLowerCase())}</b> — ${esc(pull.note)}` : ''}"
    data-tip-title="${up ? 'Warming' : 'Cooling'}">${up ? '↑' : '↓'} ${(Math.abs(per30) * 100).toFixed(1)}pt a month${
      pull ? ` · ${esc(pull.label.toLowerCase())}` : ''}</div>`;
}

// §A10. Who else is in this bloc, and what their being there costs you. Below
// the infrastructure stage it is a competing offer and your standing target is
// lower for it; from partnership up the bloc runs on one supplier and this is
// a door rather than a discount.
function rivalRow(S, r) {
  const rv = rivalIn(S, r.id);
  if (!rv) return '';
  const idx = STAGE_INDEX[rv.stage] || 0;
  const who = rivalName(S, r.id);
  const exclusive = idx >= BOARD.EXCLUSIVE_FROM;
  return `<div class="region-rival ${exclusive ? 'shut' : ''}"
    data-tip="${esc(who)} reached ${esc(STAGES[idx].name.toLowerCase())} here on day ${rv.day}. While they are in the bloc your standing target is ${Math.round(idx * BOARD.CONTEST_STANCE * 100)} points lower, and partnership and sovereign integration are closed until they are displaced."
    data-tip-title="Contested">
    <span class="rr-mark">⊘</span>
    <span class="rr-who">${esc(who)}</span>
    <span class="rr-stage mono">${esc(STAGES[idx].name)}</span>
  </div>`;
}

function displaceRow(S, r) {
  const d = canDisplace(S, r.id);
  return `<div class="row g6 mt6">
    <button class="btn btn-sm btn-danger grow" data-act="displace" data-v="${r.id}" ${d.ok ? '' : 'disabled'}
      data-tip="A bloc at this depth runs on one supplier. Buying out the incumbent's contracts costs ${Math.round((BOARD.DISPLACE_COST_MULT - 1) * 100)}% more than the stage did, raises regulatory heat by ${BOARD.DISPLACE_HEAT}, and is noticed."
      data-tip-title="Displace ${esc(d.who || '')}">
      ${d.ok ? `Displace ${esc(d.who)} · ${money(d.cost)}` : `Displace ${esc(d.who || '')}`}</button>
  </div>
  ${d.ok ? '' : `<div class="tiny mono dimmer mt4">${esc(d.note || '')}</div>`}`;
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
      <div class="tiny dimmer mt12">In Act V you build one of these. Three deliberate acts each. That construction is the run.</div>
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
          ${labLine(S, l)}
        </div>`).join('')}
      ${commitmentRow(S)}
      <div class="tiny dimmer">A lab's speed is what that lab holds — the people it employs, the frontier work it has
        finished, and the compute its money buys. Nothing in it reads your progress except one bounded term:
        published work spreads, so a lab a long way behind the leader runs up to
        ${Math.round(RACE.DIFFUSION_MAX * 100)}% faster for reading what the leader published.
        Opening your weights speeds every one of them up.</div>
    </div>
  </div>`;
}

// §A3. What a lab actually holds, under its own bar, so a lead or a deficit is
// something a founder can read a reason into rather than a number that moved.
function labLine(S, l) {
  if (l.you) return '';
  const rr = labReadout(S, l.id);
  if (rr) {
    return `<div class="race-holds mono tiny dimmer">
      <span>${fmt(rr.roster)} people</span>
      <span>${rr.nodes} frontier node${rr.nodes === 1 ? '' : 's'}</span>
      <span>${money(rr.funding)}</span>
      ${rr.researching ? `<span class="dim">on ${esc(rr.researching)}</span>` : ''}
      ${rr.blocs.length ? `<span class="dim">${rr.blocs.length} bloc${rr.blocs.length === 1 ? '' : 's'}</span>` : ''}
    </div>`;
  }
  // Aperture reads off the company on the Market view rather than a second copy.
  const a = apertureState(S);
  if (l.id !== 'aperture' || !a) return '';
  return `<div class="race-holds mono tiny dimmer">
    <span>${a.roster} people</span>
    <span>${a.researchDone} nodes learned</span>
    <span>${money(a.funding)}</span>
    ${a.researching ? `<span class="dim">on ${esc(a.researching)}</span>` : ''}
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

// §F2. The Act V clock, in the only two forms that are honest: how long the
// world will wait before it closes a door itself, and — under each path — what
// that path's own numbers are doing. The second is the one that matters,
// because alignment falls while the company is pointed at the frontier and
// approval falls as the share of world output rises, and both of those have
// always been true and were never once shown next to the gate they close.
function act5Clock(S) {
  const W = S.world || {};
  const left = Math.max(0, Math.round((W.act5Window || EF.ACT5_WINDOW) - (W.act5Days || 0)));
  const doom = Math.round(W.doomClock || 0);
  const sealedCount = Object.keys(W.sealed || {}).length;
  const soon = left <= 60;
  return `<div class="act5-clock ${soon ? 'soon' : ''}"
    data-tip="Act V is not open-ended. Past this window the world stops waiting and closes one of the doors itself — a standard set elsewhere, a hearing, somebody asking the question first. The doom clock shortens it: at ${doom}/100 the window is ${Math.round(W.act5Window || EF.ACT5_WINDOW)} days rather than ${EF.ACT5_WINDOW}."
    data-tip-title="The world is not waiting">
    <span class="a5-k">the world</span>
    <span class="a5-v">${W.act5Due ? 'is closing a door' : `waits about <b>${left}</b> more days`}</span>
    <span class="a5-note">${sealedCount ? `${sealedCount} ${sealedCount === 1 ? 'door has' : 'doors have'} already closed` : 'nothing has closed yet'} &middot; doom ${doom}/100</span>
  </div>`;
}

// One path's own drift, in days. Null when the gate turns on a flag rather
// than a number — "closes in ~N days" would be a lie about those.
function gateDriftLine(e) {
  if (e.sealed) return `<div class="ec-drift shut">closed by the world on day ${e.sealed}</div>`;
  const c = e.clock;
  if (!c || c.dir === 'sealed') return '';
  if (c.dir === 'closing') return `<div class="ec-drift closing">${esc(c.what)} is drifting — this gate closes in ~${c.days} days</div>`;
  return `<div class="ec-drift opening">${esc(c.what)} is rising — this gate opens in ~${c.days} days</div>`;
}

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
             <span class="pl-note">chosen on day ${pathLockedDay(S)} &middot; the other ${endings.length - 1} closed that morning</span>
           </div>`
        : `<div class="path-lock warn">
             <span class="pl-k">warning</span>
             <span class="pl-note">The first act you take on any path <b>closes the other ${endings.length - 1} permanently</b>. Read all ${endings.length} before you touch one.</span>
           </div>`}
      ${act5Clock(S)}
      <div class="grid grid-auto-lg" style="gap:12px">
        ${endings.map((e) => {
          const list = commitmentsFor(e.id);
          const shut = (locked && locked !== e.id) || !!e.sealed;
          return `<div class="ending-card ${e.available ? 'ready' : ''} ${shut ? 'shut' : ''} ${locked === e.id ? 'chosen' : ''}">
            ${e.sealed ? `<div class="ec-shut">closed by the world &middot; day ${e.sealed}</div>`
              : shut ? `<div class="ec-shut">closed &middot; you chose ${esc(lockedName)}</div>` : ''}
            <div class="row g8 mb6"><span style="font-size:20px">${e.icon || '⊙'}</span>
              <span class="bold">${esc(e.name)}</span>
              <span class="grow"></span>
              <span class="mono tiny ${e.available ? 'c-green' : 'dim'}">${e.progress.done}/${e.progress.total}</span></div>
            <div class="small dim" style="line-height:1.55">${esc(e.blurb || '')}</div>
            ${!e.gateMet ? `<div class="tiny c-amber mt8">Gate: ${esc(e.req || '')}</div>` : ''}
            ${gateDriftLine(e)}
            <div class="col g6 mt10">
              ${list.map((c) => {
                const done = commitmentDone(S, c);
                const check = c.kind === 'act' ? canCommit(S, e.id, c.id) : { ok: false };
                // §A6. A commitment's hint may be a function now, because the
                // board's veto says *why* it cannot be taken and that reason is
                // a read of the run. A throw prints nothing rather than the
                // source of the function.
                let hint = c.hint;
                if (typeof hint === 'function') { try { hint = hint(S); } catch (err) { hint = ''; } }
                return `<div class="commit ${done ? 'done' : ''}">
                  <div class="row g8" style="align-items:flex-start">
                    <span class="commit-mark">${done ? '✓' : c.kind === 'state' ? '◇' : '○'}</span>
                    <span style="min-width:0;flex:1">
                      <span class="commit-name">${esc(c.name)}</span>
                      <span class="commit-desc">${esc(c.desc)}</span>
                      ${!done && c.kind === 'act' ? `<span class="commit-cost">${esc(c.costLabel || '')}</span>` : ''}
                      ${!done && hint && (c.kind === 'state' || !check.ok) ? `<span class="commit-hint">${esc(hint)}</span>` : ''}
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

// ── §A9 The compute allocation ─────────────────────────────────────────────
// Compute was a ceiling: every provisioned unit fed research and the frontier
// at once and served users for free. Three lanes want it, so it is a split —
// and it sits here, beside the number it divides, rather than on a screen that
// never says how much compute the company has. The defaults are exactly what
// the game did before this control existed, so an untouched dial changes
// nothing.
function splitPanel(S) {
  const s = computeSplit(S);
  const fx = computeSplitFx(S);
  const cap = S.resources.computeCap || 0;
  const row = (id, name, colour, note) => `
    <div>
      <div class="row between mb4"><span class="meter-label">${name}</span>
        <span class="mono bold" style="color:${colour}">${(s[id] * 100).toFixed(0)}%</span></div>
      ${slider('csplit:' + id, s[id], colour)}
      <div class="row between tiny dim mt4"><span>${note}</span>
        <span class="mono">${fmt(cap * s[id])} PF</span></div>
    </div>`;
  return `
  <div class="panel" data-tut="compute-split"><div class="panel-body col g14">
    <div class="panel-title mb8">Compute allocation</div>
    <div class="tiny dim">Every petaflop-day is spoken for three times over. Move one and the other two absorb it.</div>
    ${row('research', 'Research', 'var(--violet)',
      `research rate ×${fx.research.toFixed(2)}`)}
    ${row('serving', 'Serving', 'var(--cyan)',
      `serving cost ×${fx.serveCost.toFixed(2)} · reliability ${fx.reliability >= 0 ? '+' : ''}${(fx.reliability * 100).toFixed(1)}%`)}
    ${row('frontier', 'Frontier', 'var(--green)',
      `frontier commitment ×${fx.frontier.toFixed(2)}`)}
    <div class="tiny dimmer">Starve serving and the traffic arrives before the machines do: the same users cost more and the system holds less well. Starve research or the frontier and you find out later.</div>
  </div></div>`;
}
