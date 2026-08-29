// ── LEGACY ─────────────────────────────────────────────────────────────────
import { esc, bar } from '../dom.js';
import { fmt, money, pct, duration } from '../../engine/format.js';
import { ACHIEVEMENTS } from '../../data/achievements.js';
import { LEGACY_PERKS, ARCHETYPES, computeLegacyGain } from '../../data/legacy.js';
import { DIFFICULTY_MAP } from '../../data/difficulty.js';
import { SCENARIO_MAP } from '../../data/scenarios.js';
import { achievementProgress } from '../../systems/progression.js';
import { doctrineList, earnedCount } from '../../systems/doctrines.js';

export function render(S) {
  const ap = achievementProgress(S);
  const base = computeLegacyGain(S);
  const diff = DIFFICULTY_MAP[S.settings.difficulty || 'standard'] || DIFFICULTY_MAP.standard;
  const scen = SCENARIO_MAP[S.settings.scenario || 'none'] || SCENARIO_MAP.none;
  const gain = Math.max(1, Math.round(base * (diff.legacyMult ?? 1) * (scen.legacyMult ?? 1)));
  const pts = S.legacy.points || 0;
  const lifetime = new Set([...Object.keys(S.achievements), ...Object.keys(S.legacy.achievements || {})]).size;

  return `
  <div class="view-head">
    <div><div class="view-title">Legacy</div>
      <div class="view-sub">What survives the timeline reset.</div></div>
    <div class="row g8">
      <span class="pill violet">${pts} legacy points</span>
      <span class="pill">${lifetime}/${ap.total} achievements</span>
      <span class="pill" style="color:${diff.color}">${diff.icon} ${esc(diff.name)}</span>
      ${scen.id !== 'none' ? `<span class="pill" style="color:${scen.color}">${scen.icon} ${esc(scen.name)}</span>` : ''}
      <span class="pill">Run ${(S.legacy.runs || 0) + 1}</span>
    </div>
  </div>

  <div class="grid split-left">
    <div class="col g12">
      <div class="panel glow-violet" data-tut="new-timeline">
        <div class="panel-head"><span class="panel-title">New Timeline</span></div>
        <div class="panel-body">
          <div class="small dim mb12">Reset the run. Keep your Legacy points, perks, achievements and unlocked archetypes. Everything else starts again — with everything you learned.</div>
          <div class="col g6 mb12">
            <div class="row between"><span class="small dim">Base</span><span class="mono small">${base}</span></div>
            <div class="row between"><span class="small dim">${esc(diff.name)}</span>
              <span class="mono small" style="color:${diff.legacyMult >= 1 ? 'var(--green)' : 'var(--ink-3)'}">×${diff.legacyMult.toFixed(2)}</span></div>
            ${scen.id !== 'none' ? `<div class="row between"><span class="small dim">${esc(scen.name)}</span>
              <span class="mono small" style="color:${scen.legacyMult >= 1 ? 'var(--green)' : 'var(--ink-3)'}">×${scen.legacyMult.toFixed(2)}</span></div>` : ''}
            <div class="divider" style="margin:3px 0"></div>
            <div class="row between"><span class="small bold">Points if you reset now</span>
              <span class="mono bold c-violet">+${gain}</span></div>
          </div>
          <button class="btn btn-violet btn-block" data-act="prestige">Begin a New Timeline</button>
          <div class="tiny dimmer mt8">Points scale with valuation, act reached, achievements and whether you reached an ending.</div>
        </div>
      </div>

      ${careerPanel(S)}

      <div class="panel">
        <div class="panel-head"><span class="panel-title">Run stats</span></div>
        <div class="panel-body col g6">
          ${statRow('Days survived', fmt(S.stats.daysSurvived))}
          ${statRow('Played', duration(S.meta.playSeconds))}
          ${statRow('Peak valuation', money(S.stats.peakValuation))}
          ${statRow('Peak MRR', money(S.stats.peakMrr))}
          ${statRow('Peak users', fmt(S.stats.peakUsers))}
          ${statRow('Features shipped', fmt(S.stats.featuresShipped))}
          ${statRow('Prompts written', fmt(S.stats.promptsWritten))}
          ${statRow('Research completed', fmt(S.stats.researchDone))}
          ${statRow('Agents hired', fmt(S.stats.agentsHired))}
          ${statRow('Incidents', fmt(S.stats.incidents))}
          ${statRow('Decisions made', fmt(S.stats.eventsResolved))}
          ${statRow('Rivals outlasted', fmt(S.stats.competitorsCrushed))}
        </div>
      </div>

      <div class="panel">
        <div class="panel-head" data-tut="archetypes"><span class="panel-title">Archetypes</span></div>
        <div class="panel-body col g8">
          ${ARCHETYPES.map((a) => {
            const un = !a.unlockedBy || S.legacy.unlockedArchetypes.includes(a.id);
            return `<div class="row g10 ${un ? '' : 'dim'}" style="opacity:${un ? 1 : 0.42}">
              <span style="font-size:16px;width:20px;text-align:center">${un ? a.icon : '🔒'}</span>
              <div style="min-width:0"><div class="small bold">${esc(a.name)}</div>
                <div class="tiny dim">${un ? esc(a.tagline) : 'Locked'}</div></div>
              ${S.founder.archetype === a.id ? '<span class="pill green" style="margin-left:auto">current</span>' : ''}
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>

    <div class="col g12">
      ${doctrinePanel(S)}

      <div class="panel">
        <div class="panel-head" data-tut="perks"><span class="panel-title">Permanent perks</span>
          <span class="tiny dim">${pts} points available</span></div>
        <div class="panel-body">
          <div class="grid grid-auto" style="gap:10px">
            ${LEGACY_PERKS.map((p) => {
              const lvl = S.legacy.perks?.[p.id] || 0;
              const cost = p.cost(lvl);
              const maxed = lvl >= p.max;
              const can = !maxed && pts >= cost;
              return `<div class="panel" style="padding:12px;border-color:${lvl > 0 ? 'rgba(139,92,246,.3)' : 'var(--line)'}">
                <div class="row between g8 mb4">
                  <span class="row g6"><span style="color:var(--violet)">${p.icon}</span>
                    <span class="small bold">${esc(p.name)}</span></span>
                  <span class="tiny mono dim">${lvl}/${p.max}</span>
                </div>
                <div class="tiny dim" style="min-height:30px">${esc(p.desc(Math.max(1, lvl)))}</div>
                <button class="btn btn-sm btn-block mt8" data-act="buy-perk" data-v="${p.id}" ${can ? '' : 'disabled'}>
                  ${maxed ? 'Maxed' : `${cost} pts`}</button>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head"><span class="panel-title">Achievements</span>
          <span class="row g8">
            <span class="tiny dim">this run <b class="c-ink">${ap.got}</b></span>
            <span class="tiny dim">all time <b class="c-amber">${lifetime}</b> / ${ap.total}</span>
          </span></div>
        <div class="panel-body">
          <div class="mb12">${bar(lifetime / ap.total, 'var(--amber)', { thin: true })}</div>
          <div class="grid grid-auto" style="gap:7px">
            ${ACHIEVEMENTS.map((a) => {
              const got = !!S.achievements[a.id];
              const ever = got || !!(S.legacy.achievements || {})[a.id];
              return `<div class="ach ${ever ? 'got' : ''} ${a.rare ? 'rare' : ''} ${got ? 'this-run' : ''}"
                data-tip="${ever ? (got ? 'Earned this timeline.' : 'Earned in a previous timeline.') : 'Not yet earned.'}">
                <div class="ach-icon">${a.icon || '◈'}</div>
                <div style="min-width:0">
                  <div class="ach-name">${esc(a.name)}</div>
                  <div class="ach-desc">${ever ? esc(a.desc) : (a.rare ? '???' : esc(a.desc))}</div>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function doctrinePanel(S) {
  const list = doctrineList(S);
  const shown = list.filter((d) => d.visible);
  const hidden = list.length - shown.length;
  return `<div class="panel">
    <div class="panel-head">
      <span class="panel-title">Doctrines</span>
      <span class="tiny dim">${earnedCount(S)} / ${list.length} earned this timeline</span>
    </div>
    <div class="panel-body">
      <div class="small dim mb12">Permanent bonuses you earn by <i>how</i> you run the company. Nothing to buy —
        hold the condition long enough and it is yours for the rest of the run.</div>
      <div class="grid grid-auto" style="gap:9px">
        ${shown.map((d) => `
          <div class="doctrine ${d.earned ? 'earned' : ''}" style="--dcc:${d.colour}">
            <div class="row between g8 mb4">
              <span class="row g7"><span style="color:${d.colour};font-size:14px">${d.icon}</span>
                <span class="small bold">${esc(d.name)}</span></span>
              ${d.earned ? `<span class="pill green" style="font-size:9px">d${d.earnedDay}</span>` : ''}
            </div>
            <div class="tiny dim" style="line-height:1.45">${d.earned ? esc(d.flavour) : esc(d.hint)}</div>
            ${!d.earned ? `<div class="mt8">
              <div class="row between mb3"><span class="tiny dimmer">${Math.floor(d.streak)}/${d.hold} days held</span>
                <span class="tiny mono dimmer">${(d.progress * 100).toFixed(0)}%</span></div>
              ${bar(d.progress, d.colour, { thin: true, shimmer: d.progress > 0.5 })}
            </div>` : `<div class="row wrap g4 mt8">
              ${Object.entries(d.mods).map(([k, v]) => `<span class="tl-eff pos">${esc(modLabel(k))} ${
                k.startsWith('+') ? '+' + v : '×' + v.toFixed(2)}</span>`).join('')}
            </div>`}
          </div>`).join('')}
      </div>
      ${hidden ? `<div class="tiny dimmer mt12">${hidden} doctrine${hidden === 1 ? '' : 's'} not yet revealed. They surface as the company grows.</div>` : ''}
    </div>
  </div>`;
}

const MOD_LABEL = { debtRate: 'debt', codeRate: 'code', agentOutput: 'agents', agentXp: 'agent xp',
  userMult: 'users', churn: 'churn', incidentChance: 'incidents', repDamage: 'rep damage',
  rogueChance: 'rogue risk', researchRate: 'research', allLanes: 'all lanes', opCost: 'costs',
  conversion: 'conversion', featureCost: 'feature cost', agentUpkeep: 'upkeep', mrrMult: 'revenue',
  valuationMult: 'valuation', repRate: 'reputation', '+heatDecay': 'heat decay', '+opinionDrift': 'approval drift' };
function modLabel(k) { return MOD_LABEL[k] || k.replace('+', ''); }

function statRow(label, value) {
  return `<div class="row between"><span class="small dim">${label}</span><span class="mono small">${value}</span></div>`;
}

// ── The career ─────────────────────────────────────────────────────────────
// Every finished run, in order. A player who can see the shape of what they
// have already done has a reason to change the shape of the next one.
const TONE_C = { good: 'var(--green)', dark: 'var(--violet)', strange: 'var(--cyan)',
                 neutral: 'var(--amber)', bad: 'var(--red)' };
const ARCH_ICON = Object.fromEntries(ARCHETYPES.map((a) => [a.id, a.icon]));

function careerPanel(S) {
  const log = (S.legacy.log || []).slice().reverse();
  if (!log.length) {
    return `<div class="panel">
      <div class="panel-head"><span class="panel-title">Career</span></div>
      <div class="panel-body">
        <div class="empty">No finished runs yet.<br/>This is the first one.</div>
      </div>
    </div>`;
  }
  const best = log.reduce((a, r) => (r.valuation > a.valuation ? r : a), log[0]);
  const endings = new Set(log.map((r) => r.ending)).size;
  const days = log.reduce((a, r) => a + r.day, 0);

  return `<div class="panel">
    <div class="panel-head">
      <span class="panel-title">Career</span>
      <span class="tiny dim">${log.length} run${log.length === 1 ? '' : 's'} &middot; ${endings} ending${endings === 1 ? '' : 's'} &middot; ${fmt(days)} days lived</span>
    </div>
    <div class="panel-body">
      <div class="career">
        ${log.map((r) => `
          <div class="career-row ${r.ending === 'bankrupt' ? 'failed' : ''}" style="--tc:${TONE_C[r.tone] || 'var(--ink-3)'}">
            <span class="cr-run">${String(r.run).padStart(2, '0')}</span>
            <span class="cr-arch" title="${esc(r.archetype)}">${ARCH_ICON[r.archetype] || '◈'}</span>
            <span class="cr-name">
              <span class="cr-end">${esc(r.endingName)}</span>
              <span class="cr-meta">${esc(r.company)} &middot; ${esc(r.category || '—')} &middot; ${esc(r.difficulty || 'standard')}</span>
            </span>
            <span class="cr-num">d${fmt(r.day)}</span>
            <span class="cr-num cr-val">${money(r.valuation)}</span>
            <span class="cr-gain">+${r.gain}</span>
          </div>`).join('')}
      </div>
      <div class="tiny dimmer mt10">Best so far: <b>${esc(best.endingName)}</b> at ${money(best.valuation)} on day ${fmt(best.day)}.</div>
    </div>
  </div>`;
}
