// ─────────────────────────────────────────────────────────────────────────────
// THE DESK — founder attention, direct actions, the core Act I loop.
// ─────────────────────────────────────────────────────────────────────────────
import { esc, md, bar, meter, slider, sparkline, noteSlot } from '../dom.js';
import { actionNote, shipNote, launchNote, noteTip } from '../notes.js';
import { fmt, money, pct, clamp } from '../../engine/format.js';
import { ALLOCATIONS, founderOutput, focusMultiplier, promptCost,
         currentApproach, availableApproaches } from '../../systems/founder.js';
import { APPROACHES, shiftedBands } from '../../data/approaches.js';
import { featureCost, totalUsers, totalMrr } from '../../systems/product.js';
import { activeProduct } from '../../engine/state.js';
import { computeMods } from '../../systems/modifiers.js';
import { laneOutputPure } from '../../systems/agents.js';
import { researchRatePerDay } from '../../systems/research.js';
import { CATEGORY_MAP } from '../../data/products.js';
import { ARCHETYPE_MAP } from '../../data/legacy.js';
import { FOUNDER, ACTS, CODE, LIFE } from '../../data/balance.js';
import { lifeState, healthMult, ties, sleepWord, healthWord, warmthWord, tired, sleepShift } from '../../systems/life.js';
import { activeObjectives, objectiveProgress } from '../../systems/objectives.js';
import { doctrineList } from '../../systems/doctrines.js';
import { currentAdvice } from '../../data/advice.js';
import { DIRECTIVES, DIRECTIVE_MAP, directiveStrength, RAMP_DAYS,
         maxOrders, orderStrengths } from '../../data/directives.js';
import { availableIntentions, quarterState, quarterDaysLeft, quarterNumber,
         orderLocked } from '../../systems/board.js';
import { QUARTER, ORDERS } from '../../data/balance.js';
import { nextActHint } from '../../systems/progression.js';
import { CODE_SINKS } from '../../data/codesinks.js';
import { verbFor } from '../../data/verbs.js';
import { trendCell, trendRack } from '../why.js';
import { arcSeries, todayLedger, tiny } from '../../systems/ledger.js';
import { plan as spendPlan } from '../../systems/spend.js';
import { todo } from '../../systems/todo.js';
import { actWord } from '../actchrome.js';
import { isSunday } from '../../systems/calendar.js';
import { SUNDAY } from '../../data/machine.js';

const ACT_LINE = ['', 'One room. One laptop.', 'It is a company now.',
  'You are the bottleneck for a continent.', 'It is improving itself.', 'After the company.'];

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
  // Read, never rolled: `computeLaneOutput` draws for goal drift.
  const lanes = laneOutputPure(S, m);
  const arch = ARCHETYPE_MAP[S.founder.archetype];
  const focusMax = Math.max(1, S.founder.focusMax);
  const focusNow = Math.max(0, S.founder.focus);
  const focusPct = clamp(focusNow / focusMax, 0, 1);
  const xpNeed = FOUNDER.XP_PER_LEVEL(S.founder.level);
  const cost = p ? featureCost(S, p) : 0;
  const featPct = p ? clamp(S.resources.code / cost, 0, 1) : 0;
  const ap = currentApproach(S);
  const pc = promptCost(S, m, ap);
  const canPrompt = S.founder.focus >= pc.focus && S.company.cash >= pc.cash
    && (!pc.insight || S.resources.insight >= pc.insight);
  // §A19: the same shift `actionPromptAI` rolls with, so the strip prints the
  // distribution the founder is actually getting rather than a rested one.
  const apBands = shiftedBands(ap, S.founder.skills[ap.scales] || 1, sleepShift(S));
  const expectedOut = apBands.reduce((a, b) => a + b.p * b.out, 0)
    * CODE.PROMPT_BASE_OUTPUT * m.promptOutput * m.codeRate;

  const act = S.company.act;
  const vCode = verbFor(act, 'code'), vPrompt = verbFor(act, 'prompt');
  const vUsers = verbFor(act, 'users'), vPost = verbFor(act, 'post');

  const focusColor = focusPct > 0.5 ? 'var(--green)' : focusPct > 0.22 ? 'var(--amber)' : 'var(--red)';
  const focusBand = focusPct > 0.5 ? 'ready' : focusPct > 0.22 ? 'low' : 'critical';
  const focusState = focusPct > 0.82 ? 'Charged' : focusPct > 0.5 ? 'Ready' : focusPct > 0.22 ? 'Running low' : 'Critical';
  const focusEfficiency = Math.round(focusMultiplier(S) * 100);
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
      <span class="pill act-word mono">${esc(actWord(S))}</span>
      <span class="pill">Lv ${S.founder.level} ${esc(S.founder.name)}</span>
    </div>
  </div>

  ${objectivesPanel(S)}

  <div class="grid split-main">

    <!-- ACTIONS -->
    <div class="col g12">
      <div class="panel focus-panel focus-${focusBand}" data-tut="actions" style="--focus-color:${focusColor}">
        <div class="panel-head">
          <span class="panel-title">Direct Action</span>
          <span class="streak-chip" id="streak"></span>
        </div>
        <div class="panel-body">
          <div class="focus-gauge">
            <div class="focus-gauge-head">
              <span class="focus-identity">
                <span class="focus-orb" aria-hidden="true">◉</span>
                <span class="focus-copy"><b>Focus</b><small>Powers your direct actions</small></span>
              </span>
              <span class="focus-amount"><strong>${Math.round(focusNow)}</strong><span>/${Math.round(focusMax)}</span></span>
            </div>
            <div class="focus-track">
              ${bar(focusPct, focusColor, { tall: true, label: 'Founder focus', valueText: `${Math.round(focusNow)} of ${Math.round(focusMax)}` })}
            </div>
            <div class="focus-gauge-foot">
              <span class="focus-state"><i></i>${focusState}</span>
              <span class="focus-vital">${focusEfficiency}% action efficiency</span>
              <span class="focus-vital ${fo.focusDelta >= 0 ? 'gain' : 'loss'}">${fo.focusDelta >= 0 ? '+' : ''}${fmt(fo.focusDelta, 1)}/day</span>
            </div>
            ${reviewLine(S, fo)}
          </div>
          <div class="grid grid-2" style="gap:9px">
            ${actionBtn(S, m, 'code', '⌘', vCode.name, vCode.desc,
              [`−${fmt(CODE.MANUAL_FOCUS_COST)} focus`,
               `+${fmt(founderCodePerClick(S, m, lanes), 1)} code`],
              S.founder.focus >= CODE.MANUAL_FOCUS_COST, 'Q')}
            ${actionBtn(S, m, 'prompt', ap.icon, vPrompt.name, ap.short + ' — ' + ap.name.toLowerCase() + '.',
              [`−${fmt(pc.focus)} focus`, `−${money(pc.cash)}`,
               ...(pc.insight ? [`−${fmt(pc.insight)} insight`] : []),
               `+~${fmt(expectedOut * focusMultiplier(S), 1)} code`],
              canPrompt, 'W', ap.color)}
            ${actionBtn(S, m, 'users', '☎', vUsers.name, vUsers.desc,
              [`−${FOUNDER.TALK_FOCUS_COST} focus`,
               `+${fmt((FOUNDER.TALK_INSIGHT_BASE
                 + S.founder.skills.growth * FOUNDER.TALK_GROWTH_RATE)
                 * m.insightRate * focusMultiplier(S), 1)} insight`],
              S.founder.focus >= FOUNDER.TALK_FOCUS_COST, 'E')}
            ${actionBtn(S, m, 'post', '↗', vPost.name, vPost.desc,
              [`−${FOUNDER.POST_FOCUS_COST} focus`, `+reputation`, `viral chance`],
              S.founder.focus >= FOUNDER.POST_FOCUS_COST, 'R')}
          </div>

          ${spendStrip(S)}

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
            ${noteSlot(featPct >= 1 ? null : shipNote(S, p, cost), 'Ship', 'grow', `<button class="btn ${featPct >= 1 ? 'btn-primary' : ''} grow" data-act="ship" ${featPct >= 1 ? '' : 'disabled'}>
              ${featPct >= 1 ? 'Ship Feature' : `Need ${fmt(cost - S.resources.code)} more code`}
            </button>`)}
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
              ${noteSlot(launchNote(p), 'Launch', '', `<button class="btn btn-primary nowrap" data-act="launch" ${p.features.length < 1 ? 'disabled' : ''}>Launch →</button>`)}
            </div>` : ''}
          ` : `<div class="empty">No product yet.</div>`}
        </div>
      </div>

      ${quarterPanel(S)}

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
            <span data-tip="${esc(codeSplitTip(S, fo, lanes))}" data-tip-title="Code a day">+${fmt(fo.code + lanes.build * CODE.AGENT_CODE_MULT, 1)} code/d</span>
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
          ${slowTrends(S)}
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

      ${listSticky(S)}

      ${lifePanel(S)}

      ${todayPanel(S)}

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

// §B11. One number, two sources, and the whole shape of the game is which one
// is bigger. In Act I every point of it is the founder; by Act III the founder
// is a rounding error on their own build lane, and the line never said so.
function codeSplitTip(S, fo, lanes) {
  const roster = (lanes.build || 0) * CODE.AGENT_CODE_MULT;
  const total = fo.code + roster;
  const share = total > 0 ? roster / total : 0;
  const n = S.agents.filter((a) => a.status === 'active' && a.lane === 'build').length;
  return `You: <b>${fmt(fo.code, 1)}/day</b> from the hours in Build.<br>`
    + `The roster: <b>${fmt(roster, 1)}/day</b> from ${n} agent${n === 1 ? '' : 's'} on the build lane.<br>`
    + (n === 0 ? 'Every line of it is yours.'
      : share > 0.9 ? `<b>${(share * 100).toFixed(0)}%</b> of the company's output is theirs. You are the bottleneck for a continent by directing, not by typing.`
      : share > 0.5 ? `<b>${(share * 100).toFixed(0)}%</b> of it is theirs now.`
      : `Still mostly you — <b>${((1 - share) * 100).toFixed(0)}%</b>.`);
}

// ── §B4 Today ──────────────────────────────────────────────────────────────
// The welcome-back briefing has always shown what a week away did. This is the
// same instrument pointed at the day you are actually in — six numbers, what
// each of them did since yesterday, and the three largest reasons. `todayLedger`
// is a pure function of two snapshots the day hook writes, so this costs a
// subtraction and not a second simulation.
//
// Cash is exact: the bill is known to the line, so whatever the day did that
// revenue-minus-expenses does not explain is what your own decisions cost.
function todayPanel(S) {
  const t = todayLedger(S);
  const rows = t.rows.filter((r) => r.delta != null && Math.abs(r.delta) > tinyFor(r));
  return `<div class="panel" data-tut="today">
    <div class="panel-head"><span class="panel-title">Today</span>
      <span class="tiny dim mono">DAY ${fmt(t.day, 0)}</span></div>
    <div class="panel-body">
      ${!t.ready ? `<div class="tiny dim">The first day is still running. Come back tomorrow and this says what it cost.</div>`
        : !rows.length ? `<div class="tiny dim">Nothing moved today worth reporting. That is rarer than it sounds.</div>`
        : `<div class="col g10">${rows.map((r) => `
          <div class="tly-row">
            <div class="row between g8">
              <span class="small dim">${esc(r.label)}</span>
              <span class="mono small" style="color:${deltaColor(r)}">${ledgerNum(r.delta, r.kind, true)}</span>
            </div>
            ${!r.causes.length ? '' : `<div class="tly-causes">${r.causes.map(([why, v]) => `
              <span class="tly-cause ${v > 0 ? 'pos' : 'neg'}">${esc(why)} <b>${ledgerNum(v, r.kind, true)}</b></span>`).join('')}</div>`}
          </div>`).join('')}</div>`}
    </div>
  </div>`;
}
// Below this a row is noise rather than news: a fraction of a cent, a tenth of
// a user, a thousandth of an alignment point. `tiny` is the ledger's own, so
// the panel and the Terminal draw the same line.
function tinyFor(r) { return tiny(r.kind); }
function deltaColor(r) {
  const good = r.invert ? r.delta < 0 : r.delta > 0;
  return Math.abs(r.delta) < tinyFor(r) ? 'var(--ink-4)' : good ? 'var(--green)' : 'var(--red)';
}
function ledgerNum(v, kind, signed) {
  const sign = signed ? (v > 0 ? '+' : v < 0 ? '−' : '') : '';
  const a = Math.abs(v);
  if (kind === 'money') return sign + money(a);
  if (kind === 'align') return sign + a.toFixed(3);
  return sign + fmt(a, a < 10 ? 1 : 0);
}

// §B3. The two numbers on this panel that kill a run slowly. Both are meters
// that read the same at 40 as at 40-and-climbing-for-a-month, and neither had
// any history anywhere in the game. The arc keeps one sample every ten days for
// the whole run, so this is where the debt started as well as where it is.
function slowTrends(S) {
  const td = arcSeries(S, 'td'), bo = arcSeries(S, 'bo');
  return trendRack([
    trendCell('Tech debt', td, { color: 'var(--amber)', fmt: (v) => String(Math.round(v)),
      note: 'Debt is written by agents and paid down by the Operations lane. A line that only goes up is a roster with nobody on ops.' }),
    trendCell('Burnout', bo, { color: 'var(--red)', fmt: (v) => String(Math.round(v)),
      note: 'It climbs whenever focus is low and falls when it is not. At 100 the schedule reorganises itself and takes a week doing it.' }),
  ]);
}

// §I4. The sticky. Everything on it is somewhere else in the game already — an
// objective, ARIA's note, a thread waiting on an answer, an idle bench, somebody
// who has not heard from you — and nothing ever put it in one place. It is
// generated every morning by `systems/todo.js` and thrown away every night: the
// ticks are keyed by the day, so tomorrow starts blank. The Today panel below
// says what the last day *cost*; this says what is still being asked for.
function listSticky(S) {
  const rows = todo(S, { max: 5 });
  if (!rows.length) return '';
  const done = rows.filter((r) => r.done).length;
  return `<div class="panel today-sticky" data-tut="list" data-ctx="todo">
    <div class="panel-head" style="padding:10px 16px">
      <span class="panel-title">The list</span>
      <span class="tiny dim mono">${done}/${rows.length}</span>
    </div>
    <div class="panel-body" style="padding:8px 12px 12px">
      <div class="td-rows">
        ${rows.map((r) => `<div class="td-row ${r.done ? 'done' : ''} ${r.kind}">
          <button class="td-tick" type="button" data-act="todo-tick" data-v="${esc(r.id)}"
            role="checkbox" aria-checked="${r.done}" aria-label="${esc(r.text)}"><span aria-hidden="true">${r.done ? '✓' : ''}</span></button>
          <span class="td-text"><span class="td-title">${esc(r.text)}</span></span>
          <span class="td-side">
            ${r.note ? `<span class="td-note mono">${esc(r.note)}</span>` : ''}
            ${r.view ? `<button class="td-go" data-act="view" data-v="${esc(r.view)}" aria-label="Go there">→</button>` : ''}
          </span>
        </div>`).join('')}
      </div>
    </div>
  </div>`;
}

// The person the company runs on. Two meters and everyone who has heard from
// you lately — the ground the cards land on, printed where the founder can see
// it slip. A tie that has gone cold says so in the same mono a greyed key uses.
function lifePanel(S) {
  const L = lifeState(S);
  const hm = healthMult(S);
  const rows = ties(S);
  const sleepColor = L.sleep >= 0.55 ? 'var(--green)' : L.sleep >= 0.3 ? 'var(--amber)' : 'var(--red)';
  const healthColor = L.health >= LIFE.HEALTH_FULL_ABOVE ? 'var(--green)' : L.health >= 0.35 ? 'var(--amber)' : 'var(--red)';
  return `<div class="panel" data-tut="life">
    <div class="panel-head">
      <span class="panel-title">Life</span>
      ${isSunday(Math.floor(S.time.day)) ? `<span class="tiny mono c-amber" data-tip="${esc(SUNDAY.line)}" data-tip-title="Sunday">${esc(SUNDAY.note)}</span>` : ''}
      <span class="tiny dim">${hm < 1 ? `focus returns at ${Math.round(hm * 100)}%` : 'holding'}</span>
    </div>
    <div class="panel-body col g10">
      ${meter('Sleep', sleepWord(L.sleep), clamp(L.sleep, 0, 1), sleepColor)}
      ${meter('Health', healthWord(L.health), clamp(L.health, 0, 1), healthColor)}
      ${tired(S) ? `<div class="note-line mono tiny" style="color:var(--red)"
        data-tip="Below ${LIFE.SLEEP_JUDGEMENT.toFixed(2)} sleep, a card no longer prints what each answer costs, the phone offers one topic fewer, and a prompt rolls like somebody three levels less practised. Nothing has been taken from the company. What has gone is your ability to read it."
        data-tip-title="Sleep and judgement">SUBS HIDDEN &middot; SLEEP</div>` : ''}
      ${rows.length ? `<div class="divider" style="margin:2px 0"></div>
      <div class="ties">
        ${rows.map((t) => `<div class="tie-row ${t.warm ? 'warm' : t.cold ? 'cold' : ''}"
            data-tip="${esc(t.line || 'Nothing in particular. They still notice.')}<br><i>${esc(t.since == null ? 'They have never heard from you.' : t.since === 0 ? 'You spoke today.' : `Last heard from you ${t.since} day${t.since === 1 ? '' : 's'} ago.`)}</i>" data-tip-title="${esc(t.name)}">
          <span class="tie-name" style="color:${t.color}">${esc(t.name.split(' ')[0])}</span>
          <span class="tie-pips">${Array.from({ length: 7 }, (_, i) => `<i style="${i < Math.round(t.warmth * 7) ? `background:${t.color}` : ''}"></i>`).join('')}</span>
          <span class="tie-since mono">${esc(t.since == null ? 'NEVER' : t.since === 0 ? 'TODAY' : `${t.since}D`)}</span>
          <span class="tie-word">${esc(warmthWord(t))}${t.warm && t.gives ? ` · +${esc(t.gives)}` : ''}</span>
        </div>`).join('')}
      </div>` : `<div class="tiny dimmer">Nobody to keep in touch with yet. That changes.</div>`}
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

// §A7. The quarter, on the Desk. Up to three intentions, set once, read back
// ninety days later by a card. It is deliberately modest: a rack of toggles
// and a countdown, because the mechanic is *saying* the thing and the reward
// for keeping it is small. Pure — every number here is `base`, the same value
// the review's test uses, so the panel and the card can never disagree.
function quarterPanel(S) {
  const q = quarterState(S);
  const avail = availableIntentions(S);
  if (!avail.length) return '';
  const set = avail.filter((x) => x.chosen);
  const left = quarterDaysLeft(S);
  const full = set.length >= QUARTER.MAX_INTENTIONS;
  return `<div class="panel" data-tut="quarter">
    <div class="panel-head">
      <span class="panel-title">Quarter ${quarterNumber(S)}</span>
      <span class="tiny dim">${q.due ? 'the review is waiting'
        : set.length ? `${set.length} of ${QUARTER.MAX_INTENTIONS} set &middot; ${left}d left`
        : `nothing written down &middot; ${left}d left`}</span>
    </div>
    <div class="panel-body">
      <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(196px,1fr));gap:8px">
        ${avail.map((x) => `
          <button class="directive ${x.chosen ? 'on' : ''}" style="--dc:${x.colour}"
            data-act="plan-toggle" data-v="${x.id}"
            ${!x.chosen && (full || q.due) ? 'disabled' : ''}
            data-tip="${esc(x.blurb)}<br><b>${esc(x.line)}</b>" data-tip-title="${esc(x.name)}">
            <span class="dir-icon" style="color:${x.colour}">${x.icon}</span>
            <span class="dir-name">${esc(x.line)}</span>
          </button>`).join('')}
      </div>
      <div class="tiny dimmer mt8">${q.due
        ? 'The quarter has closed. The review card reads these back and opens the next one.'
        : full ? 'Three is the limit. Take one off to swap it.'
        : 'What these ninety days are for. Nothing is spent setting one; the review reads them back and pays for each one kept.'}</div>
    </div>
  </div>`;
}

// §A4. The review line: what the roster costs the founder's day before any of
// it is spent, and how many of them the day actually reached. It is the one
// place the span-of-control rule is a number rather than a consequence, and it
// only appears once there is a roster to review.
function reviewLine(S, fo) {
  const r = fo.review;
  if (!r || !r.total) return '';
  const short = r.total - r.covered;
  const colour = short ? 'var(--amber)' : 'var(--ink-2)';
  return `<div class="row between tiny mono mt8" style="color:${colour}"
    data-tip="Every running agent takes some of your day to check, and the day's focus regeneration pays that before anything else. A better model needs less reading, a longer leash needs less asking, and a chief of staff halves the whole line.<br><b>${fmt(r.need, 1)} of ${fmt(r.budget, 1)} focus a day.</b>${short ? `<br>${short} ${short === 1 ? 'agent is' : 'agents are'} running unreviewed: more tech debt, and morale sliding.` : ''}"
    data-tip-title="Review">
    <span>REVIEW ${r.covered}/${r.total}</span>
    <span>−${fmt(r.need, 1)} focus/day${short ? ` · ${short} UNREVIEWED` : ''}</span>
  </div>`;
}

// The standing order, and — §A23a — the stack, once `autonomous_corporation`
// is done. Slot zero is the order the game has always had and keeps its own
// action; the slots the node opens go through `set-order`, which carries the
// slot on `data-slot`. The strengths printed are `orderStrengths`, the same
// numbers `computeMods` applies, so the panel cannot drift from the sim.
function directivePanel(S) {
  const avail = DIRECTIVES.filter((d) => !d.act || S.company.act >= d.act);
  if (avail.length <= 2) return '';
  const slots = maxOrders(S);
  const rows = orderStrengths(S);
  const lock = orderLocked(S);
  const cur = DIRECTIVE_MAP[S.company.directive || 'none'];
  const k = directiveStrength(S);
  const held = Math.max(0, S.time.day - (S.company.directiveSince || 0));
  const running = rows.filter((r) => r.dir && r.dir.id !== 'none');
  const budget = running.reduce((a, r) => a + r.raw, 0);
  return `<div class="panel">
    <div class="panel-head">
      <span class="panel-title">Standing order${slots > 1 ? 's' : ''}</span>
      <span class="tiny dim">${lock ? esc(lock.note) + ' · ' + lock.until + 'd'
        : slots > 1 ? `${running.length} of ${slots} slots · budget ${(Math.min(budget, ORDERS.BUDGET) * 100).toFixed(0)} of ${(ORDERS.BUDGET * 100).toFixed(0)}`
        : cur.id === 'none' ? 'none set'
        : `held ${Math.floor(held)}d · ${(k * 100).toFixed(0)}% effect`}</span>
    </div>
    <div class="panel-body">
      ${lock ? `<div class="note-line mono tiny mb12" style="color:var(--red)"
        data-tip="${esc(lock.why)}" data-tip-title="The board set it">BOARD ORDER &middot; ${lock.until}D</div>` : ''}
      ${running.length ? `<div class="col g8 mb12">
        ${running.map((r) => `<div>
          <div class="row between mb4">
            <span class="small" style="color:${r.dir.color}">${r.dir.icon} ${esc(r.dir.name)}${r.slot > 0 ? ` <span class="mono dimmer">SLOT ${r.slot + 1}</span>` : ''}</span>
            <span class="mono tiny dim">${(r.k * 100).toFixed(0)}%${r.raw >= 1 ? '' : ` · full in ${Math.ceil(RAMP_DAYS - (S.time.day - r.since))}d`}</span>
          </div>
          ${bar(r.k, r.dir.color, { thin: true })}
        </div>`).join('')}
      </div>` : ''}
      <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:8px">
        ${avail.map((d) => `
          <button class="directive ${S.company.directive === d.id ? 'on' : ''}" style="--dc:${d.color}"
            data-act="directive" data-v="${d.id}" ${lock ? 'disabled' : ''}
            data-tip="${esc(d.desc)}<br><i>${esc(d.flavour)}</i>" data-tip-title="${esc(d.name)}">
            <span class="dir-icon" style="color:${d.color}">${d.icon}</span>
            <span class="dir-name">${esc(d.name)}</span>
          </button>`).join('')}
      </div>
      ${slots > 1 ? extraSlots(S, avail, slots) : ''}
      <div class="tiny dimmer mt8">${slots > 1
        ? `Each slot ramps over ${RAMP_DAYS} days on its own clock, and the slots share one budget — three orders are three weaker orders. The first slot is the one The Long View counts.`
        : `The effect ramps over ${RAMP_DAYS} days. Switching resets it — commitment is the whole mechanic.`}</div>
    </div>
  </div>`;
}

// The extra slots. One rack per slot, because a founder needs to see which
// order is in which slot to understand why the first one is the one that
// counts for The Long View.
function extraSlots(S, avail, slots) {
  const extra = S.company.orders || [];
  const out = [];
  for (let n = 1; n < slots; n++) {
    const held = extra[n - 1] || null;
    out.push(`<div class="divider" style="margin:10px 0"></div>
      <div class="row between mb4">
        <span class="meter-label">Slot ${n + 1}</span>
        <span class="tiny dim">${held ? esc(DIRECTIVE_MAP[held.id]?.name || held.id) : 'empty'}</span>
      </div>
      <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:8px">
        <button class="directive ${!held ? 'on' : ''}" style="--dc:var(--ink-3)"
          data-act="set-order" data-v="none" data-slot="${n}"
          data-tip="Leave this slot empty. The others get more of the shared budget."
          data-tip-title="Empty">
          <span class="dir-icon" style="color:var(--ink-3)">○</span>
          <span class="dir-name">Empty</span>
        </button>
        ${avail.filter((d) => d.id !== 'none').map((d) => {
          const dup = S.company.directive === d.id || extra.some((o, i) => i !== n - 1 && o?.id === d.id);
          return `<button class="directive ${held?.id === d.id ? 'on' : ''}" style="--dc:${d.color}"
            data-act="set-order" data-v="${d.id}" data-slot="${n}" ${dup ? 'disabled' : ''}
            data-tip="${esc(d.desc)}<br><i>${esc(d.flavour)}</i>${dup ? '<br><b>Already running in another slot.</b>' : ''}" data-tip-title="${esc(d.name)}">
            <span class="dir-icon" style="color:${d.color}">${d.icon}</span>
            <span class="dir-name">${esc(d.name)}</span>
          </button>`;
        }).join('')}
      </div>`);
  }
  return out.join('');
}

// §C9. Spend the bar. The Act I loop is eleven presses of the same key, and
// the honest fix is not to make the key cheaper but to let the founder say the
// sentence they meant: *prompt until the next feature is covered*. One control,
// four hands, and the sentence each one would carry out printed under it — the
// run stops on the target, on the focus floor, or on anything that would have
// taken a hand off the key.
const SPEND_HANDS = [
  ['code', '⌘', 'Write'],
  ['prompt', '⌬', 'Prompt'],
  ['users', '☎', 'Talk'],
  ['post', '↗', 'Post'],
];

function spendStrip(S) {
  const cur = S.ui?.spendHand && SPEND_HANDS.some(([id]) => id === S.ui.spendHand)
    ? S.ui.spendHand : 'prompt';
  const p = spendPlan(S, cur);
  const label = SPEND_HANDS.find(([id]) => id === cur)?.[2] || 'Prompt';
  return `<div class="spend-strip" data-tut="spend">
    <div class="row between mb8">
      <span class="meter-label">Spend the bar</span>
      <span class="tiny dim">${esc(p.say)}</span>
    </div>
    <div class="spend-row">
      <div class="spend-hands" role="group" aria-label="Which hand to spend on">
        ${SPEND_HANDS.map(([id, icon, name]) => `<button class="spend-hand ${cur === id ? 'on' : ''}"
          data-act="spend-hand" data-v="${id}" aria-pressed="${cur === id}"
          data-tip="${esc(spendPlan(S, id).say)}" data-tip-title="${esc(name)}">
          <span aria-hidden="true">${icon}</span><span class="sh-name">${esc(name)}</span></button>`).join('')}
      </div>
      ${noteSlot(p.note, 'Spend', '', `<button class="btn btn-primary spend-go" data-act="spend-bar" ${p.ok ? '' : 'disabled'}>
        <span class="action-key">G</span> ${esc(label)} it out</button>`)}
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
        const bands = shiftedBands(a, S.founder.skills[a.scales] || 1, sleepShift(S));
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

function actionBtn(S, m, act, icon, name, desc, costs, enabled, key, color) {
  // The right-click target is the wrapper, not the button. A disabled
  // `<button>` fires no `contextmenu` at all, so the menu was missing from
  // exactly the actions whose menu says what they need — which is the one thing
  // it was written for. The same wrapper carries the reason as a tooltip when
  // the hand is greyed, in the words the workstation's menus use.
  const note = enabled ? null : actionNote(S, act, m);
  return `<span class="action-slot" data-ctx="action" data-v="${act}"${note ? ` data-tip="${esc(noteTip(note))}" data-tip-title="${esc(name)}"` : ''}>
    <button class="action-btn" data-act="do" data-v="${act}" ${enabled ? '' : 'disabled'}
      ${color ? `style="border-color:${color}30"` : ''}>
      <span class="action-key">${key}</span>
      <div class="action-name"><span ${color ? `style="color:${color}"` : ''}>${icon}</span>${name}</div>
      <div class="action-desc">${esc(desc)}</div>
      <div class="action-cost">${costs.map((c) => `<span>${c}</span>`).join('')}</div>
    </button>
  </span>`;
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
function founderCodePerClick(S, m, lanes) {
  const raw = CODE.MANUAL_PER_CLICK * (FOUNDER.MANUAL_BASE
    + S.founder.skills.engineering * FOUNDER.MANUAL_ENGINEERING_RATE)
    * m.codeRate * focusMultiplier(S);
  const dayBuild = (lanes.build || 0) * CODE.AGENT_CODE_MULT;
  const floor = dayBuild > 0
    ? dayBuild * FOUNDER.DIRECT_DAY_SHARE
      * (CODE.MANUAL_FOCUS_COST / Math.max(1, S.founder.focusMax))
    : 0;
  return Math.max(raw, floor);
}
