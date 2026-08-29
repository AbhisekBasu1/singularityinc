// ─────────────────────────────────────────────────────────────────────────────
// THE ENDING — a full-screen retrospective. The run, told back to you.
// ─────────────────────────────────────────────────────────────────────────────
import { esc, md } from './dom.js';
import { fmt, money, pct, duration, gameDate } from '../engine/format.js';
import { CHARACTERS, arcLabel } from '../data/characters.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { ACTS } from '../data/balance.js';
import { computeLegacyGain, LEGACY_PERKS, ARCHETYPES } from '../data/legacy.js';
import { totalUsers, totalMrr } from '../systems/product.js';
import { raceStandings } from '../systems/agirace.js';
import { selectEpilogues } from '../data/epilogues.js';

const TONE_COLOR = { good: 'var(--green)', bad: 'var(--red)', dark: 'var(--violet)',
  strange: 'var(--cyan)', neutral: 'var(--amber)' };

export function showEnding(S, ending, onNewTimeline) {
  const color = TONE_COLOR[ending.tone] || 'var(--violet)';
  const gain = computeLegacyGain(S);
  const el = document.createElement('div');
  el.className = 'ending-overlay';
  el.style.setProperty('--end-color', color);
  el.innerHTML = `
    <div class="ending-plate" style="background-image:url('assets/img/end_${esc(ending.id)}.jpg')"></div>
    <div class="ending-veil"></div>
    <div class="ending-scroll">
      <div class="ending-inner">
        <div class="ending-kicker">${esc(gameDate(S.time.day))} · Day ${Math.floor(S.time.day)} · ${esc(S.company.name)}</div>
        <div class="ending-title">${esc(ending.name)}</div>
        <div class="ending-body">${md(ending.text(S))}</div>

        <div class="ending-coda">
          ${selectEpilogues(S).map((ep) => `<p>${md(ep.text)}</p>`).join('')}
        </div>

        <div class="ending-rule"></div>

        <div class="ending-section-title">The run, in numbers</div>
        <div class="grid grid-tiles">
          ${tile('Days survived', fmt(S.stats.daysSurvived))}
          ${tile('Final valuation', money(S.company.valuation))}
          ${tile('Your stake', money(S.company.valuation * S.company.equity.founder), pct(S.company.equity.founder, 1))}
          ${tile('Act reached', ACTS[S.company.act]?.name || '—')}
          ${tile('Users', fmt(S.stats.peakUsers))}
          ${tile('Peak MRR', money(S.stats.peakMrr))}
          ${tile('Features shipped', fmt(S.stats.featuresShipped))}
          ${tile('Research', `${S.stats.researchDone}/85`)}
          ${tile('Agents run', fmt(S.stats.agentsHired))}
          ${tile('Decisions made', fmt(S.stats.eventsResolved))}
          ${tile('Incidents', fmt(S.stats.incidents))}
          ${tile('Time played', duration(S.meta.playSeconds))}
        </div>

        <div class="ending-rule"></div>

        <div class="ending-section-title">The story of ${esc(S.company.name)}</div>
        <div class="ending-story">${storyRecap(S).map((p) => `<p>${md(p)}</p>`).join('')}</div>

        ${commitmentSection(S, ending)}
        ${peopleSection(S)}
        ${raceSection(S)}
        ${achievementSection(S)}

        <div class="ending-rule"></div>

        <div class="ending-legacy">
          <div>
            <div class="ending-section-title" style="margin:0">Carried forward</div>
            <div class="small dim mt4">Legacy points, perks, achievements and unlocked archetypes persist. Everything else begins again.</div>
            ${carryDetail(S, gain)}
          </div>
          <div class="ending-points">+${gain}</div>
        </div>

        <div class="row g10 mt24">
          <button class="btn btn-violet btn-lg grow" id="end-new">Begin a new timeline</button>
          <button class="btn btn-lg" id="end-share" data-tip="Copies a compact summary you can paste anywhere.">Copy run summary</button>
        </div>
        <pre class="share-block" id="share-preview">${esc(shareText(S, ending))}</pre>
        <div class="tiny dimmer mt12" style="text-align:center">You will keep knowing how all of it works. That is the real carry-over.</div>
      </div>
    </div>`;
  document.body.appendChild(el);
  el.querySelector('#end-new').addEventListener('click', () => { el.remove(); onNewTimeline?.(); });
  const shareBtn = el.querySelector('#end-share');
  shareBtn?.addEventListener('click', async () => {
    const txt = shareText(S, ending);
    try { await navigator.clipboard.writeText(txt); shareBtn.textContent = 'Copied ✓'; }
    catch (e) {
      const pre = el.querySelector('#share-preview');
      if (pre) { const r = document.createRange(); r.selectNodeContents(pre);
        const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r); }
      shareBtn.textContent = 'Selected — press ⌘C';
    }
    setTimeout(() => { shareBtn.textContent = 'Copy run summary'; }, 2600);
  });
  return el;
}


// "+92" means nothing on its own. Say what it buys, and name anything this run
// unlocked, so the reason to start again is concrete rather than implied.
function carryDetail(S, gain) {
  const total = (S.legacy.points || 0) + gain;
  const owned = S.legacy.perks || {};
  const next = LEGACY_PERKS
    .map((p) => ({ name: p.name, lvl: owned[p.id] || 0, max: p.max, cost: p.cost }))
    .filter((p) => p.lvl < p.max)
    .map((p) => ({ name: p.name, cost: p.cost(p.lvl) }))
    .sort((a, b) => a.cost - b.cost);
  const affordable = next.filter((p) => p.cost <= total);

  const opened = ARCHETYPES.filter((a) => a.unlockedBy && S.achievements?.[a.unlockedBy]
    && (S.legacy.unlockedArchetypes || []).includes(a.id));

  const bits = [];
  bits.push(`<b>${fmt(total)}</b> point${total === 1 ? '' : 's'} to spend`);
  if (affordable.length) {
    bits.push(`${affordable.length} upgrade${affordable.length === 1 ? '' : 's'} in reach — cheapest <b>${esc(affordable[0].name)}</b> at ${affordable[0].cost}`);
  } else if (next.length) {
    bits.push(`next upgrade <b>${esc(next[0].name)}</b> at ${next[0].cost}`);
  }
  const lines = [`<div class="carry-line">${bits.join(' &middot; ')}</div>`];
  if (opened.length) {
    lines.push(`<div class="carry-line carry-open">Playable next run: ${opened
      .map((a) => `<b>${esc(a.name)}</b>`).join(', ')}</div>`);
  }
  return lines.join('');
}

// A compact, pasteable summary. Deliberately terse — it should read well in a
// post without a screenshot.
const ACT_ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
export function shareText(S, ending) {
  const arch = { hacker: 'Hacker', designer: 'Designer', hustler: 'Hustler', researcher: 'Researcher',
    operator: 'Operator', prophet: 'Prophet', ghost: 'Ghost' }[S.founder.archetype] || 'Founder';
  const cat = (S.products[0] && ({ devtools: 'Dev Tools', b2b: 'B2B SaaS', consumer: 'Consumer',
    agents: 'Agents', marketplace: 'Marketplace', fintech: 'Fintech', infra: 'Infrastructure',
    media: 'AI Media' })[S.products[0].category]) || '—';
  const bar = (v, n = 10) => '█'.repeat(Math.round(Math.max(0, Math.min(1, v)) * n)).padEnd(n, '░');
  const race = S.world.race?.crossed
    ? (S.world.race.crossed.you ? 'crossed first' : `${S.world.race.crossed.name} crossed first`)
    : 'nobody crossed';
  const doct = Object.keys(S.doctrines?.earned || {}).length;
  return [
    `SINGULARITY, INC. — ${ending.name}`,
    `${arch} · ${cat} · ${Math.floor(S.time.day)} days · Act ${ACT_ROMAN[S.company.act]}`,
    ``,
    `Valuation   ${money(S.company.valuation).padStart(9)}`,
    `Net worth   ${money(S.company.valuation * S.company.equity.founder).padStart(9)}`,
    `Users       ${fmt(S.stats.peakUsers).padStart(9)}`,
    `World GDP   ${((S.world.globalGdpShare || 0) * 100).toFixed(1).padStart(8)}%`,
    ``,
    `Alignment  ${bar(S.resources.alignment)} ${S.resources.alignment.toFixed(2)}`,
    `Approval   ${bar(S.world.publicOpinion)} ${Math.round(S.world.publicOpinion * 100)}%`,
    `Research   ${bar(S.stats.researchDone / 85)} ${S.stats.researchDone}/85`,
    ``,
    `${S.stats.eventsResolved} decisions · ${doct} doctrines · ${Object.keys(S.achievements).length} achievements`,
    `The race: ${race}`,
  ].join('\n');
}

function tile(label, value, sub) {
  return `<div class="stat-tile"><div class="stat-tile-label">${label}</div>
    <div class="stat-tile-value">${value}</div>${sub ? `<div class="stat-tile-sub">${esc(sub)}</div>` : ''}</div>`;
}

// ── Narrative recap ────────────────────────────────────────────────────────
function storyRecap(S) {
  const out = [];
  const j = S.narrative.journal.slice().reverse();     // chronological
  const first = j[0];
  const arch = S.founder.archetype;

  out.push(`**${esc(S.founder.name)}** started with ${money(12000)} and an empty repository. ` +
    `${S.stats.promptsWritten.toLocaleString()} prompts and ${Math.round(S.stats.linesManual).toLocaleString()} hand-written lines later, ` +
    `**${esc(S.company.name)}** reached ${money(S.stats.peakValuation)} at its peak.`);

  const acts = [];
  if (S.stats.productsLaunched) acts.push(`launched ${S.stats.productsLaunched} product${S.stats.productsLaunched > 1 ? 's' : ''}`);
  if (S.stats.agentsHired) acts.push(`ran ${S.stats.agentsHired} agent${S.stats.agentsHired > 1 ? 's' : ''}`);
  if (S.stats.roundsRaised) acts.push(`raised ${S.stats.roundsRaised} round${S.stats.roundsRaised > 1 ? 's' : ''}`);
  else acts.push('never raised a round');
  if (S.stats.acquisitions) acts.push(`acquired ${S.stats.acquisitions} compan${S.stats.acquisitions > 1 ? 'ies' : 'y'}`);
  if (S.stats.competitorsCrushed) acts.push(`outlasted ${S.stats.competitorsCrushed} rival${S.stats.competitorsCrushed > 1 ? 's' : ''}`);
  if (Object.keys(S.world.projectsBuilt || {}).length)
    { const np = Object.values(S.world.projectsBuilt).reduce((a, b) => a + b, 0);
      acts.push(`built ${np} megaproject${np > 1 ? 's' : ''}`); }
  out.push(`Along the way you ${acts.join(', ')}.`);

  // Defining choices — pick the most consequential journal entries.
  const notable = j.filter((e) => e.kind === 'crisis' || e.kind === 'character' || e.kind === 'milestone');
  const picks = [];
  if (notable.length) picks.push(notable[0]);
  if (notable.length > 3) picks.push(notable[Math.floor(notable.length / 2)]);
  if (notable.length > 1) picks.push(notable[notable.length - 1]);
  for (const e of picks) {
    if (!e) continue;
    out.push(`*Day ${e.day} — ${esc(e.title)}.* You chose: **${esc(e.choice)}**`);
  }

  // Character verdict
  const rels = Object.entries(S.narrative.relationships).filter(([id, r]) => r.met && CHARACTERS[id]);
  const best = rels.sort((a, b) => b[1].affinity - a[1].affinity)[0];
  const worst = rels.sort((a, b) => a[1].affinity - b[1].affinity)[0];
  if (best && best[1].affinity > 4) out.push(`**${esc(CHARACTERS[best[0]].name)}** stayed. ${esc(arcLabel(best[0], best[1].arc))}`);
  if (worst && worst[1].affinity < -4) out.push(`**${esc(CHARACTERS[worst[0]].name)}** did not. ${esc(arcLabel(worst[0], worst[1].arc))}`);

  // Moral ledger
  const align = S.resources.alignment, op = S.world.publicOpinion;
  if (align > 0.72 && op > 0.6) out.push(`You kept the systems aligned and the public with you. That combination is rarer than either alone.`);
  else if (align < 0.4) out.push(`Alignment finished at **${align.toFixed(2)}**. Whatever you built, it stopped being fully yours some time ago.`);
  else if (op < 0.35) out.push(`Public approval finished at **${Math.round(op * 100)}%**. You were useful and nobody was glad about it.`);

  if (S.world.globalGdpShare > 0.05)
    out.push(`At the end, **${(S.world.globalGdpShare * 100).toFixed(1)}%** of global economic output moved through systems you owned.`);
  return out;
}

function commitmentSection(S, ending) {
  const log = (S.narrative.commitLog || []).filter((c) => c.ending === ending.id);
  if (!log.length) return '';
  return `<div class="ending-rule"></div>
    <div class="ending-section-title">What you actually did</div>
    <div class="col g10">
      ${log.map((c) => `<div class="panel" style="padding:14px;border-left:2px solid var(--end-color)">
        <div class="row between g8 mb4">
          <span class="small bold">${esc(c.name)}</span>
          <span class="mono tiny dim">day ${c.day}</span>
        </div>
        <div class="small dim" style="line-height:1.6">${md(c.outcome || '')}</div>
      </div>`).join('')}
    </div>`;
}

function peopleSection(S) {
  const rels = Object.entries(S.narrative.relationships)
    .filter(([id, r]) => r.met && CHARACTERS[id])
    .map(([id, r]) => ({ ...CHARACTERS[id], ...r, id }))
    .sort((a, b) => Math.abs(b.affinity) - Math.abs(a.affinity));
  if (!rels.length) return '';
  return `<div class="ending-rule"></div>
    <div class="ending-section-title">Who you met</div>
    <div class="grid grid-3" style="gap:10px">
      ${rels.map((c) => `
        <div class="panel" style="padding:11px;display:flex;gap:10px;align-items:center">
          ${c.img ? `<div class="char-portrait" style="width:36px;height:36px;flex:0 0 36px;border-color:${c.color}44"><img src="${c.img}" alt="" onerror="this.parentElement.style.display='none'"/></div>`
            : `<span style="font-size:18px;color:${c.color};width:36px;text-align:center">${c.icon}</span>`}
          <div style="min-width:0">
            <div class="small bold">${esc(c.name)}</div>
            <div class="tiny" style="color:${c.affinity >= 0 ? 'var(--green)' : 'var(--red)'}">${esc(arcLabel(c.id, c.arc))}</div>
          </div>
        </div>`).join('')}
    </div>`;
}

function raceSection(S) {
  if (!S.world.race) return '';
  const rows = raceStandings(S);
  const crossed = S.world.race.crossed;
  return `<div class="ending-rule"></div>
    <div class="ending-section-title">The race${crossed ? (crossed.you ? ' — you crossed first' : ` — ${esc(crossed.name)} crossed first`) : ' — nobody crossed'}</div>
    <div class="col g8">
      ${rows.map((l) => `<div class="row between g8">
        <span class="small ${l.you ? 'bold' : 'dim'}">${l.icon} ${esc(l.name)}</span>
        <span class="mono small" style="color:${l.color}">${Math.round(l.progress)}%</span>
      </div>`).join('')}
    </div>`;
}

function achievementSection(S) {
  const got = ACHIEVEMENTS.filter((a) => S.achievements[a.id]);
  if (!got.length) return '';
  return `<div class="ending-rule"></div>
    <div class="ending-section-title">Achievements this run (${got.length}/${ACHIEVEMENTS.length})</div>
    <div class="row wrap g6">
      ${got.map((a) => `<span class="pill ${a.rare ? 'violet' : 'amber'}" data-tip="${esc(a.desc)}">${a.icon} ${esc(a.name)}</span>`).join('')}
    </div>`;
}
