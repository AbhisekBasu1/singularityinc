// ── LEGACY ─────────────────────────────────────────────────────────────────
import { esc, bar } from '../dom.js';
import { fmt, money, pct, duration } from '../../engine/format.js';
import { ACHIEVEMENTS } from '../../data/achievements.js';
import { LEGACY_PERKS, ARCHETYPES, computeLegacyGain } from '../../data/legacy.js';
import { DIFFICULTY_MAP } from '../../data/difficulty.js';
import { SCENARIO_MAP } from '../../data/scenarios.js';
import { achievementProgress, lifestyleExit } from '../../systems/progression.js';
import { doctrineList, earnedCount } from '../../systems/doctrines.js';
import { kept, dossier } from '../../systems/keep.js';
import { KEEP } from '../../data/balance.js';
import { CHARACTERS } from '../../data/characters.js';
import { ENDINGS } from '../../data/endings.js';
import { miniArc } from '../chart.js';

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

      ${lifestylePanel(S)}

      ${careerPanel(S)}

      ${galleryPanel(S)}

      ${shelfPanel(S)}

      ${keptPanel(S)}

      ${dossierPanel(S)}

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
          ${statRow('Rivals outlasted', fmt(S.stats.competitorsOutlasted || 0))}
          ${statRow('Rivals crushed', fmt(S.stats.competitorsCrushed || 0))}
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
              // A secret is a story beat: name and icon stay hidden until it
              // lands, because the name is the spoiler.
              const hidden = a.secret && !ever;
              return `<div class="ach ${ever ? 'got' : ''} ${a.rare ? 'rare' : ''} ${got ? 'this-run' : ''} ${hidden ? 'secret' : ''}"
                data-tip="${ever ? (got ? 'Earned this timeline.' : 'Earned in a previous timeline.') : hidden ? 'A secret. Something in the story unlocks it.' : 'Not yet earned.'}">
                <div class="ach-icon">${hidden ? '◌' : (a.icon || '◈')}</div>
                <div style="min-width:0">
                  <div class="ach-name">${hidden ? '???' : esc(a.name)}</div>
                  <div class="ach-desc">${ever ? esc(a.desc) : (a.rare || hidden ? '???' : esc(a.desc))}</div>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

// ── The Lifestyle Business ─────────────────────────────────────────────────
// The one ending you take by not going on. It is only ever on this screen,
// because it is the only decision in the game whose subject is the *run*
// rather than the company — and it only appears while the company is small,
// good and paid for, which is what Frugal Empire certifies. A blocked verb
// says what it needs, so the row is here in Acts II and III either way.
function lifestylePanel(S) {
  const act = S.company.act;
  if (S.ending || act < 2 || act > 3) return '';
  const gate = lifestyleExit(S);
  const e = ENDINGS.find((x) => x.id === 'lifestyle');
  return `<div class="panel">
    <div class="panel-head"><span class="panel-title">Stop here</span>
      <span class="tiny dim mono">${gate.open ? 'AVAILABLE' : esc(String(gate.why).toUpperCase())}</span></div>
    <div class="panel-body">
      <div class="small dim mb12">${esc(e?.blurb || '')} The product works, the people who pay for it keep paying, and nothing about it needs to become a story. It ends the timeline, and the legacy is smaller than a finished run and larger than a failed one.</div>
      <button class="btn btn-block ${gate.open ? '' : 'btn-ghost'}" data-act="ending" data-v="lifestyle"
        ${gate.open ? '' : 'disabled'}
        data-tip="${gate.open ? 'Ends the run here, on purpose, while it is still small and good.' : esc(e?.req || '')}"
        data-tip-title="The Lifestyle Business">${gate.open ? 'Take the lifestyle business' : esc(e?.req || 'Not yet')}</button>
    </div>
  </div>`;
}

// ── The gallery ────────────────────────────────────────────────────────────
// One plate per ending: reached or not, across every timeline, with the one
// line a sealed one still needs. `S.legacy.endings` is recorded by
// `triggerEnding` and was displayed nowhere. The count is derived — the deck
// of endings grew from eight to fifteen and a typed number would have lied.
// Several endings share a photograph, because there is no new art; `plate`
// names it and the tone colour framing it is what tells them apart.
function galleryPanel(S) {
  const reachedMap = S.legacy.endings || {};
  const roman = (n) => {
    const T = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    let out = '';
    for (const [v, sym] of T) while (n >= v) { out += sym; n -= v; }
    return out;
  };
  const plates = ENDINGS.map((e, i) => {
    const n = (reachedMap[e.id] || 0) + (S.ending?.id === e.id && !reachedMap[e.id] ? 1 : 0);
    const reached = n > 0;
    return `<div class="end-plate ${reached ? 'reached' : 'sealed'}"
      style="background-image:url('assets/img/end_${esc(e.plate || e.id)}.jpg');--ec:${TONE_C[e.tone] || 'var(--amber)'}"
      data-tip="${esc(e.blurb || '')}" data-tip-title="${esc(e.name)}">
      <span class="ep-idx">${roman(i + 1)}</span>
      ${reached ? `<span class="ep-count">×${n}</span>` : ''}
      <span class="ep-name">${reached ? esc(e.name) : 'Sealed'}</span>
      <span class="ep-req">${reached ? `${n === 1 ? 'one timeline' : `${n} timelines`}` : esc(e.req || '')}</span>
    </div>`;
  });
  const got = ENDINGS.filter((e) => reachedMap[e.id] || S.ending?.id === e.id).length;
  return `<div class="panel" data-tut="gallery">
    <div class="panel-head"><span class="panel-title">Endings</span>
      <span class="tiny dim">${got} / ${ENDINGS.length} reached</span></div>
    <div class="panel-body">
      <div class="small dim mb12">Every way a timeline can end. A sealed plate says what it still needs; a lit one counts the timelines that got there.</div>
      <div class="end-gallery">${plates.join('')}</div>
    </div>
  </div>`;
}

// ── The shelf ──────────────────────────────────────────────────────────────
// Every finished timeline's chronicle, and the book of this one so far. The
// most recent three carry a framing sentence built from the dossier and the
// shape of the run — a career is a set of named timelines, not a list of rows,
// and a shelf that only prints an ending name and a day says nothing about
// what any of them *were*. The arc rides with the book (`prestige()` samples
// it down), so an old run has a picture as well as a text.
const CAMPAIGN_SHOWN = 3;
function shelfPanel(S) {
  const shelf = Array.isArray(S.legacy.chronicles) ? S.legacy.chronicles : [];
  const past = dossier(S);
  const rows = shelf.slice().reverse();
  return `<div class="panel" data-tut="shelf">
    <div class="panel-head"><span class="panel-title">Chronicles</span>
      <span class="tiny dim">${shelf.length} on the shelf</span></div>
    <div class="panel-body">
      <div class="small dim mb12">The run as a book: one chapter per act, every decision that made the cut, the people, the race, and how it ended. A lost run gets one too.</div>
      ${rows.length ? `<div class="col g6">${rows.map((b, i) => {
        const d = past.find((x) => x.run === b.run) || null;
        const framed = i < CAMPAIGN_SHOWN ? campaignLine(b, d) : '';
        return `
        <div class="shelf-row" style="--tc:${TONE_C[b.tone] || 'var(--ink-3)'}">
          <span class="cr-run">${String(b.run).padStart(2, '0')}</span>
          <span class="shelf-text"><span class="small bold">${esc(b.company)}</span><span class="tiny dim">${esc(b.endingName)} · day ${fmt(b.day)}</span></span>
          ${b.arc?.length ? miniArc(b.arc, { color: TONE_C[b.tone] || 'var(--ink-3)' }) : ''}
          <button class="btn btn-sm" data-act="chronicle-read" data-v="${rows.length - 1 - i}">Read</button>
        </div>
        ${framed ? `<div class="shelf-frame">${esc(framed)}</div>` : ''}
        ${b.epilogue ? `<div class="shelf-coda"><span class="shelf-coda-k mono">THE LAST WORD</span>${esc(String(b.epilogue).replace(/\*/g, ''))}</div>` : ''}`;
      }).join('')}</div>` : ''}
      <div class="row g8 mt12">
        <button class="btn btn-sm btn-primary" data-act="chronicle-now">The book so far</button>
        <button class="btn btn-sm btn-ghost" data-act="chronicle-copy">Copy it</button>
      </div>
    </div>
  </div>`;
}

// One sentence about a finished timeline, assembled from its dossier entry.
// Everything in it is read off the run — the temperament, who was burned, who
// stayed, how the race went — so no two timelines that were played differently
// get the same line, and none of it is typed.
function campaignLine(b, d) {
  const who = (ids) => (ids || []).map((id) => CHARACTERS[id]?.name.split(' ')[0] || id);
  const bits = [];
  if (d) {
    if (d.style === 'cruel') bits.push('took the hard option more than any other');
    else if (d.style === 'good') bits.push('took the careful one');
    else if (d.style === 'risky') bits.push('gambled when it could');
    else if (d.style === 'costly') bits.push('paid for things in cash');
    const loved = who(d.loved), burned = who(d.betrayed);
    if (loved.length) bits.push(`kept ${loved.slice(0, 2).join(' and ')} close`);
    if (burned.length) bits.push(`burned ${burned.slice(0, 2).join(' and ')}`);
    if (!loved.length && !burned.length && d.mom < 0) bits.push('stopped calling home');
    if (d.race === 'won') bits.push('crossed the line first');
    else if (d.race && d.race !== 'nobody crossed') bits.push('came second');
  }
  const head = `The ${b.company} timeline`;
  if (!bits.length) return `${head} ran ${fmt(b.day)} days and ended as ${b.endingName}.`;
  return `${head}: a founder who ${bits.slice(0, 3).join(', ')}, ${fmt(b.day)} days, ${b.endingName}.`;
}

// ── The kept deck ──────────────────────────────────────────────────────────
// Cards the founder kept: one an assistant wrote, whole, or the memory of a
// written one — what you did with it, and the road you did not take. They are
// dealt in every later timeline; this is where they can be read, let go, and
// handed to somebody. There is no tier gate on any of it, which is the point:
// a browser with no assistant in it builds a deck too.
const KIND_C = { story: 'var(--violet)', crisis: 'var(--red)', opportunity: 'var(--green)', character: 'var(--cyan)' };
function keptPanel(S) {
  const list = kept(S);
  return `<div class="panel" data-tut="kept">
    <div class="panel-head">
      <span class="panel-title">Kept cards</span>
      <span class="tiny dim">${list.length} / ${KEEP.MAX}</span>
    </div>
    <div class="panel-body">
      <div class="small dim mb12">Moments you chose to keep — a card an assistant wrote, or the memory of one the game dealt you. The written deck deals each one once, in every timeline after the one it happened in, to a founder who has met that person.</div>
      ${list.length ? `<div class="col g6">${list.map((k) => {
        const c = k.char ? CHARACTERS[k.char] : null;
        return `<div class="kept-row" style="--kc:${KIND_C[k.kind] || 'var(--ink-3)'}" data-tip="${esc(k.body.slice(0, 220))}${k.body.length > 220 ? '…' : ''}" data-tip-title="${esc(k.title)}">
          <span class="kept-kind">${esc(k.kind)}</span>
          <span class="kept-title">${esc(k.title)}</span>
          <span class="kept-meta mono">${c ? esc(c.name.split(' ')[0]) + ' · ' : ''}act ${['', 'I', 'II', 'III', 'IV', 'V'][k.act] || k.act}${k.run ? ` · run ${k.run}` : ''}</span>
          <button class="btn btn-sm btn-ghost kept-x" data-act="keep-forget" data-v="${esc(k.id)}" data-tip="Let it go. It leaves the deck." aria-label="Forget ${esc(k.title)}">✕</button>
        </div>`;
      }).join('')}</div>` : `<div class="empty">Nothing kept yet.<br/>Press <b>Keep</b> under any card's outcome, or in the Log.</div>`}
      <div class="row g8 mt12">
        <button class="btn btn-sm" data-act="keep-export" ${list.length ? '' : 'disabled'}>Copy the deck</button>
        <button class="btn btn-sm" data-act="keep-link" ${list.length ? '' : 'disabled'}
          data-tip="The same deck as an address. Opening it keeps every card in it, under the same ceilings as anything the world writes.">Copy a link</button>
        <button class="btn btn-sm btn-ghost" data-act="keep-import">Paste a deck…</button>
      </div>
    </div>
  </div>`;
}

// ── The dossier ────────────────────────────────────────────────────────────
// What the world remembers about the founder from the timelines before this.
function dossierPanel(S) {
  const past = dossier(S);
  if (!past.length) return '';
  return `<div class="panel">
    <div class="panel-head"><span class="panel-title">What the world remembers</span>
      <span class="tiny dim">${past.length} timeline${past.length === 1 ? '' : 's'}</span></div>
    <div class="panel-body col g8">
      <div class="small dim">The cast has met you before. The next run's briefing says so, and so do some of its cards.</div>
      ${past.slice().reverse().slice(0, 4).map((d) => `<div class="dossier-row" style="--tc:${TONE_C[d.tone] || 'var(--ink-3)'}">
        <span class="cr-run">${String(d.run).padStart(2, '0')}</span>
        <span class="dossier-text">
          <span class="small"><b>${esc(d.company)}</b> · ${esc(d.endingName)} · day ${fmt(d.day)}</span>
          <span class="tiny dim">${esc([
            d.race === 'won' ? 'won the race' : d.race === 'nobody crossed' ? 'no one crossed' : d.race,
            d.style === 'cruel' ? 'mostly cruel' : d.style === 'good' ? 'mostly careful' : `mostly ${d.style}`,
            d.betrayed?.length ? `burned ${d.betrayed.map((id) => CHARACTERS[id]?.name.split(' ')[0] || id).join(', ')}` : '',
            d.loved?.length ? `kept ${d.loved.map((id) => CHARACTERS[id]?.name.split(' ')[0] || id).join(', ')} close` : '',
            d.mom < 0 ? 'stopped calling home' : '',
          ].filter(Boolean).join(' · '))}</span>
        </span>
      </div>`).join('')}
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
      <div class="small dim mb12">Bonuses you earn by <i>how</i> you run the company. Nothing to buy —
        hold the condition long enough and it is yours. Stop holding it for as long as you held it
        and it lapses: the record stays on this shelf, the bonus does not.</div>
      <div class="grid grid-auto" style="gap:9px">
        ${shown.map((d) => `
          <div class="doctrine ${d.earned ? 'earned' : ''}" style="--dcc:${d.colour}">
            <div class="row between g8 mb4">
              <span class="row g7"><span style="color:${d.colour};font-size:14px">${d.icon}</span>
                <span class="small bold">${esc(d.name)}</span></span>
              ${d.earned ? `<span class="pill green" style="font-size:9px">d${d.earnedDay}</span>`
                : d.lapsed ? `<span class="pill" style="font-size:9px">lapsed d${d.lapsedDay}</span>` : ''}
            </div>
            <div class="tiny dim" style="line-height:1.45">${d.earned ? esc(d.flavour) : esc(d.hint)}</div>
            ${d.slipping ? `<div class="tiny mono mt6" style="color:var(--amber)">SLIPPING &middot; ${d.slipDaysLeft} DAYS LEFT</div>` : ''}
            ${d.forbidden ? `<div class="tiny mono mt6" style="color:var(--red)">${esc(d.forbidden.note)}</div>
              <div class="tiny dimmer">${esc(d.forbidden.why)}</div>` : ''}
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
