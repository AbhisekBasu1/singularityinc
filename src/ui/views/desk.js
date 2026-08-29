// ─────────────────────────────────────────────────────────────────────────────
// THE DESK — founder attention, direct actions, the core Act I loop.
// ─────────────────────────────────────────────────────────────────────────────
import { esc, md, bar, meter, slider, sparkline } from '../dom.js';
import { fmt, money, pct, clamp } from '../../engine/format.js';
import { ALLOCATIONS, founderOutput, focusMultiplier, promptCost,
         currentApproach, availableApproaches } from '../../systems/founder.js';
import { APPROACHES, shiftedBands } from '../../data/approaches.js';
import { featureCost, totalUsers, totalMrr } from '../../systems/product.js';
import { activeProduct } from '../../engine/state.js';
import { computeMods } from '../../systems/modifiers.js';
import { computeLaneOutput } from '../../systems/agents.js';
import { researchRatePerDay } from '../../systems/research.js';
import { CATEGORY_MAP } from '../../data/products.js';
import { ARCHETYPE_MAP } from '../../data/legacy.js';
import { FOUNDER, ACTS, CODE } from '../../data/balance.js';
import { activeObjectives, objectiveProgress } from '../../systems/objectives.js';
import { doctrineList } from '../../systems/doctrines.js';
import { currentAdvice } from '../../data/advice.js';
import { DIRECTIVES, DIRECTIVE_MAP, directiveStrength, RAMP_DAYS } from '../../data/directives.js';
import { nextActHint } from '../../systems/progression.js';
import { CODE_SINKS } from '../../data/codesinks.js';
import { verbFor } from '../../data/verbs.js';

const ACT_LINE = ['', 'One room. One laptop.', 'It is a company now.',
  'You are the bottleneck for a continent.', 'The curve went vertical.', 'After the company.'];

const SKILLS = [
  { id: 'engineering', name: 'Engineering', icon: '⌘', desc: 'Code output and feature quality.' },
  { id: 'design', name: 'Design', icon: '◈', desc: 'Conversion and product polish.' },
  { id: 'growth', name: 'Growth', icon: '↗', desc: 'Insight from users; awareness.' },
  { id: 'sales', name: 'Sales', icon: '⛁', desc: 'Revenue per user; deal-making.' },
  { id: 'ops', name: 'Operations', icon: '⚙', desc: 'Agent throughput and cost control.' },
  { id: 'prompting', name: 'Prompting', icon: '⌬', desc: 'AI output quality and hit rate.' },
  { id: 'vision', name: 'Vision', icon: '✦', desc: 'Research, reputation, narrative pull.' },
];

export function render(S) {
  const m = computeMods(S);
  const p = activeProduct(S);
  const fo = founderOutput(S, m);
  const { out: lanes } = computeLaneOutput(S, m);
  const arch = ARCHETYPE_MAP[S.founder.archetype];
  const focusPct = S.founder.focus / S.founder.focusMax;
  const xpNeed = FOUNDER.XP_PER_LEVEL(S.founder.level);
  const cost = p ? featureCost(S, p) : 0;
  const featPct = p ? clamp(S.resources.code / cost, 0, 1) : 0;
  const ap = currentApproach(S);
  const pc = promptCost(S, m, ap);
  const canPrompt = S.founder.focus >= pc.focus && S.company.cash >= pc.cash
    && (!pc.insight || S.resources.insight >= pc.insight);
  const apBands = shiftedBands(ap, S.founder.skills[ap.scales] || 1);
  const expectedOut = apBands.reduce((a, b) => a + b.p * b.out, 0) * 9 * m.promptOutput * m.codeRate;

  const act = S.company.act;
  const vCode = verbFor(act, 'code'), vPrompt = verbFor(act, 'prompt');
  const vUsers = verbFor(act, 'users'), vPost = verbFor(act, 'post');

  const focusColor = focusPct > 0.5 ? 'var(--green)' : focusPct > 0.22 ? 'var(--amber)' : 'var(--red)';
  const debtRatio = clamp(S.resources.techDebt / 300, 0, 1);

  return `
  <div class="act-hero act-hero-${S.company.act}">
    <div class="act-hero-fade"></div>
    <div class="act-hero-text">
      <div class="act-hero-kicker">Act ${['0','I','II','III','IV','V'][S.company.act]} · ${esc(ACTS[S.company.act]?.name || '')}</div>
      <div class="act-hero-title">${esc(ACT_LINE[S.company.act] || 'The Desk')}</div>
      <div class="act-hero-sub">${esc(arch?.tagline || '')}</div>
    </div>
    <div class="act-hero-badges">
      ${doctrineList(S).filter((d) => d.earned).slice(0, 5).map((d) =>
        `<span class="pill" style="color:${d.colour};border-color:${d.colour}44"
          data-tip="${esc(d.flavour)}" data-tip-title="${esc(d.name)}">${d.icon}</span>`).join('')}
      ${S.founder.skillPoints > 0 ? `<span class="pill amber">${S.founder.skillPoints} skill point${S.founder.skillPoints > 1 ? 's' : ''}</span>` : ''}
      <span class="pill">Lv ${S.founder.level} ${esc(S.founder.name)}</span>
    </div>
  </div>

  ${objectivesPanel(S)}

  <div class="grid split-main">

    <!-- ACTIONS -->
    <div class="col g12">
      <div class="panel" data-tut="actions">
        <div class="panel-head">
          <span class="panel-title">Direct Action</span>
          <span class="row g8"><span class="streak-chip" id="streak"></span>
            <span class="tiny dim">Focus ${Math.round(S.founder.focus)}/${Math.round(S.founder.focusMax)} · efficiency ${(focusMultiplier(S) * 100).toFixed(0)}%</span></span>
        </div>
        <div class="panel-body">
          <div style="margin-bottom:14px">${bar(focusPct, focusColor, { tall: true })}</div>
          <div class="grid grid-2" style="gap:9px">
            ${actionBtn('code', '⌘', vCode.name, vCode.desc,
              [`−${fmt(0.85)} focus`, `+${fmt(founderCodePerClick(S, m), 1)} code`],
              S.founder.focus >= 0.85, 'Q')}
            ${actionBtn('prompt', ap.icon, vPrompt.name, ap.short + ' — ' + ap.name.toLowerCase() + '.',
              [`−${fmt(pc.focus)} focus`, `−${money(pc.cash)}`,
               ...(pc.insight ? [`−${fmt(pc.insight)} insight`] : []),
               `+~${fmt(expectedOut * focusMultiplier(S), 1)} code`],
              canPrompt, 'W', ap.color)}
            ${actionBtn('users', '☎', vUsers.name, vUsers.desc,
              [`−4.5 focus`, `+${fmt((2.2 + S.founder.skills.growth * 0.6) * m.insightRate * focusMultiplier(S), 1)} insight`],
              S.founder.focus >= 4.5, 'E')}
            ${actionBtn('post', '↗', vPost.name, vPost.desc,
              [`−3.2 focus`, `+reputation`, `viral chance`],
              S.founder.focus >= 3.2, 'R')}
          </div>

          ${approachStrip(S, m)}
        </div>
      </div>

      <!-- BUILD -->
      <div class="panel ${featPct >= 1 ? 'glow-green' : ''}" data-tut="build">
        <div class="panel-head">
          <span class="panel-title">Build</span>
          ${p ? `<span class="tiny dim">${p.features.length} feature${p.features.length === 1 ? '' : 's'} shipped</span>` : ''}
        </div>
        <div class="panel-body">
          ${p ? `
          <div class="meter mb12">
            <div class="meter-head">
              <span class="meter-label">Next feature</span>
              <span class="meter-value mono">${fmt(S.resources.code)} / ${fmt(cost)}</span>
            </div>
            ${bar(featPct, featPct >= 1 ? 'var(--green)' : 'var(--cyan)', { tall: true, shimmer: featPct >= 1 })}
          </div>
          <div class="row g8">
            <button class="btn ${featPct >= 1 ? 'btn-primary' : ''} grow" data-act="ship" ${featPct >= 1 ? '' : 'disabled'}>
              ${featPct >= 1 ? 'Ship Feature' : `Need ${fmt(cost - S.resources.code)} more code`}
            </button>
            <button class="btn btn-ghost btn-sm" data-act="toggle-autoship"
              data-tip="When on, features ship automatically the moment you have enough code.">
              Auto ${S.settings.autoShip === false ? 'OFF' : 'ON'}
            </button>
          </div>
          ${sinkRack(S, cost)}
          ${!p.launched ? `
            <div class="divider"></div>
            <div class="row between g12">
              <div style="min-width:0">
                <div class="bold">${esc(p.name)} is not live yet.</div>
                <div class="tiny dim">Launch when the product is good enough to survive attention. Quality and polish decide how hard it lands.</div>
              </div>
              <button class="btn btn-primary nowrap" data-act="launch" ${p.features.length < 1 ? 'disabled' : ''}>Launch →</button>
            </div>` : ''}
          ` : `<div class="empty">No product yet.</div>`}
        </div>
      </div>

      ${directivePanel(S)}

      <!-- ALLOCATION -->
      <div class="panel" data-tut="alloc">
        <div class="panel-head">
          <span class="panel-title">Where the day goes</span>
          <span class="tiny dim">16 waking hours</span>
        </div>
        <div class="panel-body">
          ${ALLOCATIONS.map((a) => {
            const v = S.founder.allocation[a.id] || 0;
            return `<div class="alloc-row">
              <div class="alloc-name" data-tip="${esc(a.desc)}" data-tip-title="${esc(a.name)}">
                <span style="color:${a.color}">${a.icon}</span>${a.name}</div>
              ${slider('alloc:' + a.id, v, a.color)}
              <div class="alloc-pct">${(v * 100).toFixed(0)}%</div>
            </div>`;
          }).join('')}
          <div class="divider"></div>
          <div class="row wrap g8 tiny mono dim">
            <span>+${fmt(fo.code + lanes.build * 2.4, 1)} code/d</span>
            <span>+${fmt(fo.insight, 1)} insight/d</span>
            <span>+${fmt(fo.reputation, 1)} rep/d</span>
            <span>+${fmt(researchRatePerDay(S, lanes.research, m), 2)} research/d</span>
            <span style="color:${fo.focusDelta >= 0 ? 'var(--green)' : 'var(--red)'}">${fo.focusDelta >= 0 ? '+' : ''}${fmt(fo.focusDelta, 1)} focus/d</span>
          </div>
        </div>
      </div>
    </div>

    <!-- RIGHT COLUMN -->
    <div class="col g12">
      <div class="panel" data-tut="resources">
        <div class="panel-head"><span class="panel-title">Resources</span></div>
        <div class="panel-body col g12">
          ${resRow('⌘', 'Code', fmt(S.resources.code), 'var(--cyan)', 'Raw implementation work. Spent to ship features.')}
          ${resRow('◈', 'Insight', fmt(S.resources.insight), 'var(--green)', 'Understanding of what users actually need. Raises the *fit* of every feature you ship.')}
          ${resRow('☼', 'Reputation', fmt(S.resources.reputation), 'var(--amber)', 'Social capital. Drives organic growth, launch strength, and valuation.')}
          ${resRow('⌬', 'Research', fmt(S.resources.research), 'var(--violet)', 'Points spent on the tech tree.')}
          <div class="meter">
            <div class="meter-head">
              <span class="meter-label" data-tip="Generated by AI-written code. High debt slows velocity, breaks reliability and causes incidents." data-tip-title="Tech Debt">⚠ Tech Debt</span>
              <span class="meter-value mono" style="color:${debtRatio > 0.6 ? 'var(--red)' : debtRatio > 0.3 ? 'var(--amber)' : 'var(--ink-2)'}">${fmt(S.resources.techDebt)}</span>
            </div>
            ${bar(debtRatio, debtRatio > 0.6 ? 'var(--red)' : debtRatio > 0.3 ? 'var(--amber)' : 'var(--ink-3)')}
          </div>
          ${S.founder.burnout > 5 ? `
          <div class="meter">
            <div class="meter-head"><span class="meter-label">Burnout</span>
              <span class="meter-value mono" style="color:var(--red)">${Math.round(S.founder.burnout)}</span></div>
            ${bar(S.founder.burnout / 100, 'var(--red)')}
          </div>` : ''}
        </div>
      </div>

      <div class="panel" data-tut="founder">
        <div class="panel-head">
          <span class="panel-title">Founder</span>
          <span class="tiny dim mono">${fmt(S.founder.xp, 0)}/${fmt(xpNeed, 0)} xp</span>
        </div>
        <div class="panel-body">
          <div class="row g10 mb12">
            <div class="agent-avatar" style="--agent-color:${archColor(arch)};--agent-bg:${archColor(arch)}1a">${arch?.icon || '◈'}</div>
            <div style="min-width:0;flex:1">
              <div class="bold">${esc(S.founder.name)}</div>
              <div class="tiny dim">${esc(arch?.name || 'Founder')} · Level ${S.founder.level}</div>
            </div>
          </div>
          ${bar(S.founder.xp / xpNeed, 'var(--violet)', { thin: true })}
          <div class="divider"></div>
          <div class="col g6">
            ${SKILLS.map((sk) => {
              const v = S.founder.skills[sk.id] || 1;
              const canUp = S.founder.skillPoints > 0 && v < FOUNDER.SKILL_CAP;
              return `<div class="row g8" data-tip="${esc(sk.desc)}" data-tip-title="${esc(sk.name)}">
                <span style="width:15px;text-align:center;opacity:.8">${sk.icon}</span>
                <span class="small grow">${sk.name}</span>
                <span class="mono small" style="width:22px;text-align:right">${v}</span>
                <div style="width:64px">${bar(v / FOUNDER.SKILL_CAP, 'var(--cyan)', { thin: true })}</div>
                ${canUp ? `<button class="btn btn-sm" style="padding:1px 7px" data-act="skill" data-v="${sk.id}">+</button>` : '<span style="width:24px"></span>'}
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>

      ${adviceCard(S)}

      ${p && p.launched ? `
      <div class="panel">
        <div class="panel-head"><span class="panel-title">${esc(p.name)}</span>
          <span class="tiny dim">${esc(CATEGORY_MAP[p.category]?.name || '')}</span></div>
        <div class="panel-body col g10">
          ${meter('Quality', (p.quality * 100).toFixed(0), clamp(p.quality, 0, 1), 'var(--cyan)')}
          ${meter('Appeal', (p.appeal * 100).toFixed(0), clamp(p.appeal, 0, 1), 'var(--green)')}
          ${meter('Polish', (p.polish * 100).toFixed(0), clamp(p.polish, 0, 1), 'var(--violet)')}
          ${meter('Reliability', (p.reliability * 100).toFixed(1) + '%', p.reliability, p.reliability > 0.9 ? 'var(--green)' : p.reliability > 0.75 ? 'var(--amber)' : 'var(--red)')}
          <div class="divider" style="margin:4px 0"></div>
          ${sparkline(S.company.userHistory, { color: 'var(--green)' })}
          <div class="row between tiny dim mono">
            <span>${fmt(totalUsers(S))} users</span>
            <span>${money(totalMrr(S))}/mo</span>
          </div>
        </div>
      </div>` : ''}
    </div>
  </div>`;
}

const ADVICE_COLOR = { red: 'var(--red)', amber: 'var(--amber)', green: 'var(--green)',
  cyan: 'var(--cyan)', dim: 'var(--ink-3)' };

function adviceCard(S) {
  S._actHint = nextActHint(S);
  const a = currentAdvice(S);
  if (!a) return '';
  const c = ADVICE_COLOR[a.tone] || 'var(--ink-3)';
  return `<div class="panel" data-tut="fieldnotes" style="border-color:${a.tone === 'dim' ? 'var(--line)' : c + '35'}">
    <div class="panel-head" style="padding:10px 16px">
      <span class="panel-title" style="color:${c}">Field Notes</span>
      ${a.view ? `<button class="btn btn-sm btn-ghost" data-act="view" data-v="${a.view}">Go →</button>` : ''}
    </div>
    <div class="panel-body" style="padding:12px 16px">
      <div class="bold small mb4" style="color:${c}">${esc(a.title)}</div>
      <div class="small dim" style="line-height:1.55">${md(a.text)}</div>
      <button class="btn btn-sm btn-ghost btn-block mt12" data-act="ask-aria">
        <span style="color:var(--violet)">⌬</span> Ask ARIA for a full read
      </button>
    </div>
  </div>`;
}

function directivePanel(S) {
  const avail = DIRECTIVES.filter((d) => !d.act || S.company.act >= d.act);
  if (avail.length <= 2) return '';
  const cur = DIRECTIVE_MAP[S.company.directive || 'none'];
  const k = directiveStrength(S);
  const held = Math.max(0, S.time.day - (S.company.directiveSince || 0));
  return `<div class="panel">
    <div class="panel-head">
      <span class="panel-title">Standing order</span>
      <span class="tiny dim">${cur.id === 'none' ? 'none set'
        : `held ${Math.floor(held)}d · ${(k * 100).toFixed(0)}% effect`}</span>
    </div>
    <div class="panel-body">
      ${cur.id !== 'none' ? `<div class="mb12">
        <div class="row between mb4">
          <span class="small" style="color:${cur.color}">${cur.icon} ${esc(cur.name)}</span>
          <span class="mono tiny dim">${k >= 1 ? 'at full strength' : `full in ${Math.ceil(RAMP_DAYS - held)}d`}</span>
        </div>
        ${bar(k, cur.color, { thin: true })}
      </div>` : ''}
      <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:8px">
        ${avail.map((d) => `
          <button class="directive ${S.company.directive === d.id ? 'on' : ''}" style="--dc:${d.color}"
            data-act="directive" data-v="${d.id}"
            data-tip="${esc(d.desc)}<br><i>${esc(d.flavour)}</i>" data-tip-title="${esc(d.name)}">
            <span class="dir-icon" style="color:${d.color}">${d.icon}</span>
            <span class="dir-name">${esc(d.name)}</span>
          </button>`).join('')}
      </div>
      <div class="tiny dimmer mt8">The effect ramps over ${RAMP_DAYS} days. Switching resets it — commitment is the whole mechanic.</div>
    </div>
  </div>`;
}

// The approach strip: how you talk to the machine. A persistent style, not a
// per-click decision, so the loop stays one keystroke and still has strategy.
function approachStrip(S, m) {
  const avail = availableApproaches(S);
  const cur = currentApproach(S);
  const locked = APPROACHES.filter((a) => !avail.includes(a));
  return `<div class="approach-strip">
    <div class="row between mb8">
      <span class="meter-label">How you prompt</span>
      <span class="tiny dim">${esc(cur.name)} · scales with ${esc(cur.scales)} (${S.founder.skills[cur.scales] || 1})</span>
    </div>
    <div class="approach-row">
      ${avail.map((a) => {
        const bands = shiftedBands(a, S.founder.skills[a.scales] || 1);
        const dist = bands.map((b) => `<span class="ab ab-${b.kind}" style="flex:${Math.max(0.02, b.p)}"></span>`).join('');
        const tip = `${a.desc}<br><br>${bands.map((b) =>
          `${Math.round(b.p * 100)}% ${b.kind} (×${b.out.toFixed(2)} code, ×${b.debt.toFixed(2)} debt)`).join('<br>')}<br><br><i>${a.flavour}</i>`;
        return `<button class="approach ${cur.id === a.id ? 'on' : ''}" style="--ac:${a.color}"
          data-act="approach" data-v="${a.id}" data-tip="${esc(tip)}" data-tip-title="${esc(a.name)}">
          <span class="approach-head"><span style="color:${a.color}">${a.icon}</span>
            <span class="approach-name">${esc(a.name)}</span></span>
          <span class="approach-dist">${dist}</span>
          <span class="approach-cost mono">${fmt(a.focus, 1)}f${a.insight ? ` · ${a.insight}i` : ''}</span>
        </button>`;
      }).join('')}
      ${locked.map((a) => `<button class="approach locked" disabled
        data-tip="Unlocks with <b>${esc(a.req)}</b> research.<br>${esc(a.desc)}" data-tip-title="${esc(a.name)} — locked">
        <span class="approach-head"><span>🔒</span><span class="approach-name">${esc(a.name)}</span></span>
      </button>`).join('')}
    </div>
  </div>`;
}

function objectivesPanel(S) {
  const objs = activeObjectives(S);
  if (!objs.length) return '';
  const prog = objectiveProgress(S);
  return `<div class="panel mb16" data-tut="objectives" style="border-color:rgba(0,229,160,.18)">
    <div class="panel-head" style="padding:10px 16px">
      <span class="panel-title">Next</span>
      <span class="tiny dim mono">${prog.done}/${prog.total}</span>
    </div>
    <div class="panel-body" style="padding:12px 16px">
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px">
        ${objs.map((o) => `
          <button class="obj ${o.view ? 'clickable' : ''}" ${o.view ? `data-act="view" data-v="${o.view}"` : ''}>
            <span class="obj-dot"></span>
            <span style="min-width:0">
              <span class="obj-title">${esc(o.title)}${o.optional ? ' <span class="dimmer tiny">optional</span>' : ''}</span>
              <span class="obj-hint">${esc(o.hint)}</span>
            </span>
          </button>`).join('')}
      </div>
    </div>
  </div>`;
}

function archColor(a) {
  return ({ hacker: '#4dd0e1', designer: '#c084fc', hustler: '#f5a623', researcher: '#8b5cf6',
    operator: '#7c8a99', prophet: '#ffffff', ghost: '#6b7686' })[a?.id] || '#4dd0e1';
}

function actionBtn(act, icon, name, desc, costs, enabled, key, color) {
  return `<button class="action-btn" data-act="do" data-v="${act}" ${enabled ? '' : 'disabled'}
    ${color ? `style="border-color:${color}30"` : ''}>
    <span class="action-key">${key}</span>
    <div class="action-name"><span ${color ? `style="color:${color}"` : ''}>${icon}</span>${name}</div>
    <div class="action-desc">${esc(desc)}</div>
    <div class="action-cost">${costs.map((c) => `<span>${c}</span>`).join('')}</div>
  </button>`;
}

function resRow(icon, name, value, color, tip) {
  return `<div class="row between" data-tip="${esc(tip)}" data-tip-title="${esc(name)}">
    <span class="row g8"><span style="color:${color};width:15px;text-align:center">${icon}</span><span class="small">${name}</span></span>
    <span class="mono bold" style="color:${color}">${value}</span>
  </div>`;
}

// Code had one destination for the whole game: the next feature. These are the
// other doors — each a worse deal in raw value, each buying something shipping
// cannot.
function sinkRack(S, featureCost) {
  const rows = CODE_SINKS.map((k) => {
    let can = false;
    try { can = k.can ? !!k.can(S) : true; } catch { can = false; }
    const price = k.cost(S, featureCost);
    return { ...k, price, can, afford: S.resources.code >= price };
  }).filter((k) => k.can);
  if (!rows.length) return '';
  return `<div class="sinks">
    <div class="sinks-k">code is also for</div>
    ${rows.map((k) => `
      <button class="sink ${k.afford ? '' : 'shut'}" data-act="spend-code" data-v="${k.id}"
        ${k.afford ? '' : 'disabled'} data-tip="${esc(k.note)}" data-tip-title="${esc(k.name)}">
        <span class="sk-icon">${k.icon}</span>
        <span class="sk-text">
          <span class="sk-name">${esc(k.name)}</span>
          <span class="sk-desc">${esc(k.desc)}</span>
        </span>
        <span class="sk-cost ${k.afford ? '' : 'over'}">${fmt(k.price)}</span>
      </button>`).join('')}
  </div>`;
}

// What one click of Write Code actually yields, floor included — the button has
// to show the number the action will really produce.
function founderCodePerClick(S, m) {
  const raw = 1 * (0.8 + S.founder.skills.engineering * 0.42) * m.codeRate * focusMultiplier(S);
  const dayBuild = computeLaneOutput(S, m).out.build * CODE.AGENT_CODE_MULT;
  const floor = dayBuild > 0
    ? dayBuild * FOUNDER.DIRECT_DAY_SHARE * (0.85 / Math.max(1, S.founder.focusMax))
    : 0;
  return Math.max(raw, floor);
}
