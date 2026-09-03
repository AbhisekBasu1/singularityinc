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
import { chronicle, toText } from '../systems/chronicle.js';
import { rivalCoda } from '../data/endings.js';
import { availableEndings } from '../systems/progression.js';
import { DOCTRINE_MAP } from '../data/doctrines.js';
import { verdictOf } from '../data/verdicts.js';
import { buildDossier } from '../systems/keep.js';
import { runChart } from './chart.js';
import * as Shell from './shell.js';

const TONE_COLOR = { good: 'var(--green)', bad: 'var(--red)', dark: 'var(--violet)',
  strange: 'var(--cyan)', neutral: 'var(--amber)' };

export function showEnding(S, ending, onNewTimeline) {
  const color = TONE_COLOR[ending.tone] || 'var(--violet)';
  const gain = computeLegacyGain(S);
  const el = document.createElement('div');
  el.className = 'ending-overlay';
  el.style.setProperty('--end-color', color);
  el.innerHTML = `
    <div class="ending-plate" style="background-image:url('assets/img/end_${esc(ending.plate || ending.id)}.jpg')"></div>
    <div class="ending-veil"></div>
    <div class="ending-scroll">
      <div class="ending-inner">
        <div class="ending-kicker">${esc(gameDate(S.time.day))} · Day ${Math.floor(S.time.day)} · ${esc(S.company.name)}</div>
        <div class="ending-title">${esc(ending.name)}</div>
        <div class="ending-body">${md(ending.text(S))}</div>

        <div class="ending-coda">
          ${(() => { let c = ''; try { c = rivalCoda(S); } catch (e) { c = ''; } return c ? `<p>${md(c)}</p>` : ''; })()}
          ${selectEpilogues(S).map((ep) => `<p>${md(ep.text)}</p>`).join('')}
          ${S.world?.author?.epilogue?.text
            ? `<p class="ending-world-coda">${md(S.world.author.epilogue.text)}</p>` : ''}
        </div>

        <div class="ending-rule"></div>

        <div class="ending-section-title">The run, in numbers</div>
        <div class="grid grid-tiles">
          ${tile('Days survived', fmt(S.stats.daysSurvived))}
          ${dealOf(S) !== null
            ? tile('The deal', money(dealOf(S)), `${(dealOf(S) / Math.max(1, S.company.valuation)).toFixed(1)}× the last valuation`)
            : tile('Final valuation', money(S.company.valuation))}
          ${tile('Your stake', money((dealOf(S) ?? S.company.valuation) * S.company.equity.founder), pct(S.company.equity.founder, 1))}
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

        ${trajectorySection(S)}
        ${ledgerSection(S)}

        ${chronicleSection(S, ending)}

        ${commitmentSection(S, ending)}
        ${doctrineSection(S)}
        ${peopleSection(S)}
        ${raceSection(S)}
        ${roadNotTaken(S, ending)}
        ${careerSection(S, ending)}
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

        <div class="row g10 mt24 wrap">
          <button class="btn btn-violet btn-lg grow" id="end-new">Begin a new timeline</button>
          ${Shell.isOs() ? `<button class="btn btn-lg" id="end-record" data-tip="Open the Record and read the company's own files before any of it resets." data-tip-title="Read the Record">Read the Record</button>` : ''}
          <button class="btn btn-lg" id="end-card" data-tip="Renders the run as an image and puts it on the clipboard." data-tip-title="Copy the card">Copy the card</button>
          <button class="btn btn-lg" id="end-share" data-tip="Copies a compact summary you can paste anywhere.">Copy run summary</button>
        </div>
        <pre class="share-block" id="share-preview">${esc(shareText(S, ending))}</pre>
        <div class="tiny dimmer mt12" style="text-align:center">You will keep knowing how all of it works. That is the real carry-over.</div>
      </div>
    </div>`;
  document.body.appendChild(el);
  el.querySelector('#end-new').addEventListener('click', () => { el.remove(); onNewTimeline?.(); });
  // The book. Folded by default — it is long, and it is the last thing here
  // worth reading slowly — and copied whole.
  el.querySelector('#chron-open')?.addEventListener('click', (e) => {
    const box = el.querySelector('#chron-body');
    if (!box) return;
    const open = box.hidden;
    box.hidden = !open;
    e.currentTarget.textContent = open ? 'Fold the chronicle' : 'Read the chronicle';
  });
  const chronBtn = el.querySelector('#chron-copy');
  chronBtn?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(toText(chronicle(S, ending))); chronBtn.textContent = 'Copied ✓'; }
    catch { chronBtn.textContent = 'Could not copy'; }
    setTimeout(() => { chronBtn.textContent = 'Copy the chronicle'; }, 2600);
  });
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

  // The card, as a picture. Canvas because there is no build step and no
  // dependency: everything below is fillRect and fillText. `ClipboardItem` is
  // not everywhere and an image write can be refused outright, so every path
  // falls back to the text summary the button beside it copies.
  const cardBtn = el.querySelector('#end-card');
  cardBtn?.addEventListener('click', async () => {
    const say = (t) => { cardBtn.textContent = t; setTimeout(() => { cardBtn.textContent = 'Copy the card'; }, 2600); };
    try {
      const blob = await shareCardBlob(S, ending, color);
      if (!blob) throw new Error('no canvas');
      if (typeof ClipboardItem !== 'function' || !navigator.clipboard?.write) throw new Error('no image clipboard');
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      say('Copied ✓');
    } catch (e) {
      try { await navigator.clipboard.writeText(shareText(S, ending)); say('Copied as text ✓'); }
      catch (e2) { say('Could not copy'); }
    }
  });

  // The Record, before the reset. Only the workstation has one; the overlay
  // steps out of the way rather than closing, because the ending is not over.
  const recBtn = el.querySelector('#end-record');
  recBtn?.addEventListener('click', () => {
    el.classList.add('reading');
    el.style.display = 'none';
    Shell.setView('record');
    const back = document.createElement('button');
    back.className = 'btn btn-violet end-return';
    back.textContent = 'Back to the ending';
    back.addEventListener('click', () => { back.remove(); el.style.display = ''; el.classList.remove('reading'); });
    document.body.appendChild(back);
  });
  return el;
}

// ── The share card ──────────────────────────────────────────────────────────
// The plate colour, the name, six numbers and three bars, at 2× for a retina
// paste. Nothing here reads the DOM: it is the same numbers `shareText` uses,
// drawn, so the two can never disagree.
const CARD_W = 640, CARD_H = 360;
function shareCardBlob(S, ending, accent) {
  return new Promise((resolve) => {
    let c;
    try { c = document.createElement('canvas'); } catch (e) { return resolve(null); }
    if (!c || typeof c.getContext !== 'function') return resolve(null);
    const R = 2;
    c.width = CARD_W * R; c.height = CARD_H * R;
    const g = c.getContext('2d');
    if (!g) return resolve(null);
    g.scale(R, R);
    // The tone colour arrives as a CSS variable; resolve it against the page,
    // and fall back to a neutral if the page is not there to ask.
    let ink = '#e8eef5', dim = '#7c8a99', hot = '#8b5cf6';
    try {
      const cs = getComputedStyle(document.documentElement);
      const v = (n, d) => (cs.getPropertyValue(n) || '').trim() || d;
      ink = v('--ink', ink); dim = v('--ink-3', dim);
      hot = (accent || '').startsWith('var(') ? v(accent.slice(4, -1), hot) : (accent || hot);
    } catch (e) { /* headless: the fallbacks stand */ }

    g.fillStyle = '#0a0d11'; g.fillRect(0, 0, CARD_W, CARD_H);
    g.fillStyle = hot; g.globalAlpha = 0.10; g.fillRect(0, 0, CARD_W, 64); g.globalAlpha = 1;
    g.fillStyle = hot; g.fillRect(0, 63, CARD_W, 1.5);

    const mono = '600 12px ui-monospace, SFMono-Regular, Menlo, monospace';
    g.fillStyle = dim; g.font = mono;
    g.fillText('SINGULARITY, INC.', 28, 30);
    g.fillStyle = ink; g.font = '700 27px ui-sans-serif, system-ui, sans-serif';
    g.fillText(ending.name, 28, 52);

    const rows = [
      ['COMPANY', S.company.name],
      ['FOUNDER', S.founder.name],
      ['DAYS', String(Math.floor(S.time.day))],
      ['ACT', ACT_ROMAN[S.company.act] || String(S.company.act)],
      ['VALUATION', money(S.company.valuation)],
      ['USERS', fmt(S.stats.peakUsers)],
    ];
    rows.forEach(([k, v], i) => {
      const x = 28 + (i % 2) * 300, y = 106 + Math.floor(i / 2) * 46;
      g.fillStyle = dim; g.font = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace';
      g.fillText(k, x, y);
      g.fillStyle = ink; g.font = '600 18px ui-sans-serif, system-ui, sans-serif';
      g.fillText(String(v).slice(0, 22), x, y + 21);
    });

    const bars = [
      ['ALIGNMENT', S.resources.alignment, S.resources.alignment.toFixed(2)],
      ['APPROVAL', S.world.publicOpinion, Math.round(S.world.publicOpinion * 100) + '%'],
      ['RESEARCH', (S.stats.researchDone || 0) / 85, `${S.stats.researchDone || 0}/85`],
    ];
    bars.forEach(([k, v, label], i) => {
      const y = 252 + i * 28;
      g.fillStyle = dim; g.font = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace';
      g.fillText(k, 28, y + 9);
      g.fillStyle = '#1a2029'; g.fillRect(120, y, 400, 8);
      g.fillStyle = hot; g.fillRect(120, y, 400 * Math.max(0, Math.min(1, v || 0)), 8);
      g.fillStyle = ink; g.font = '600 11px ui-monospace, SFMono-Regular, Menlo, monospace';
      g.fillText(String(label), 532, y + 9);
    });

    try { c.toBlob((b) => resolve(b), 'image/png'); } catch (e) { resolve(null); }
  });
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

// The acquisition's price, when this is that ending. `triggerEnding` keeps the
// card's 1.6×, 1.9× or 2.4× in `S.ending.value`; the legacy payout reads the
// same number, so what the tile says is what was paid.
function dealOf(S) {
  return S.ending?.id === 'acquired' && Number.isFinite(S.ending.value) ? S.ending.value : null;
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
  const outlasted = S.stats.competitorsOutlasted || 0, crushed = S.stats.competitorsCrushed || 0;
  if (outlasted) acts.push(`outlasted ${outlasted} rival${outlasted > 1 ? 's' : ''}`);
  if (crushed) acts.push(`put ${crushed} rival${crushed > 1 ? 's' : ''} out of business`);
  if (Object.keys(S.world.projectsBuilt || {}).length)
    { const np = Object.values(S.world.projectsBuilt).reduce((a, b) => a + b, 0);
      acts.push(`built ${np} megaproject${np > 1 ? 's' : ''}`); }
  out.push(`Along the way you ${acts.join(', ')}.`);

  // Defining choices. First, middle and last was a position in a list, not a
  // verdict: a run's three biggest decisions are the ones that moved a person
  // or moved alignment, plus anything the founder did that the deck called
  // cruel. The score is read off the effects the journal already stores.
  for (const e of definingChoices(j)) {
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

// The weight of a decision, from what it did. An affinity swing is counted at
// its magnitude; alignment is 0-1 and so is scaled to sit on the same axis; and
// a card the deck itself marked `cruel` carries a floor, because the founder
// chose it knowing what it was. Milestones score nothing on their own — a
// milestone is a thing that happened, not a thing that was decided.
const CRUEL_FLOOR = 12;
const ALIGN_WEIGHT = 60;
function decisionWeight(e) {
  let w = 0;
  for (const [k, v] of e.effects || []) {
    if (!Number.isFinite(v)) continue;
    if (k.startsWith('rel:')) w += Math.abs(v);
    else if (k === 'alignment') w += Math.abs(v) * ALIGN_WEIGHT;
  }
  if (e.tone === 'cruel') w = Math.max(w, CRUEL_FLOOR) + CRUEL_FLOOR;
  return w;
}

function definingChoices(chronological, n = 3) {
  const scored = chronological
    .filter((e) => e && e.choice && e.kind !== 'milestone' && e.kind !== 'call')
    .map((e) => ({ e, w: decisionWeight(e) }))
    .filter((x) => x.w > 0)
    .sort((a, b) => b.w - a.w)
    .slice(0, n)
    .map((x) => x.e);
  if (scored.length) return scored.sort((a, b) => a.day - b.day);
  // A run with no effects worth scoring still gets a recap: fall back to the
  // shape the screen has always had rather than printing nothing.
  const notable = chronological.filter((e) => e.kind === 'crisis' || e.kind === 'character');
  return [notable[0], notable[Math.floor(notable.length / 2)], notable[notable.length - 1]]
    .filter((e, i, a) => e && a.indexOf(e) === i).slice(0, n);
}

// The chronicle: the whole run as prose, folded until asked for.
function chronicleSection(S, ending) {
  let book;
  try { book = chronicle(S, ending); } catch (e) { console.error('[chronicle]', e); return ''; }
  return `<div class="ending-rule"></div>
    <div class="ending-section-title">The chronicle</div>
    <div class="small dim">${esc(book.chapters.length)} chapter${book.chapters.length === 1 ? '' : 's'}, ${book.people.length} people, and every decision that made the cut. ${book.lost ? esc(book.lossLine) : 'It is the book of this timeline, and it goes on the shelf.'}</div>
    <div class="row g8 mt12">
      <button class="btn" id="chron-open">Read the chronicle</button>
      <button class="btn btn-ghost" id="chron-copy">Copy the chronicle</button>
    </div>
    <div class="chronicle" id="chron-body" hidden>${chronicleHtml(book)}</div>`;
}

export function chronicleHtml(book) {
  const roman = ['', 'I', 'II', 'III', 'IV', 'V'];
  return `<div class="chron-title">${esc(book.title)}</div>
    <div class="chron-sub">${esc(book.subtitle)}</div>
    ${book.chapters.map((ch) => `<div class="chron-chapter">
      <div class="chron-h">Act ${roman[ch.act] || ch.act} — ${esc(ch.name)} <span class="chron-span">days ${ch.from}–${ch.to}</span></div>
      ${ch.paragraphs.map((p) => typeof p === 'string' ? `<p>${md(p)}</p>` : `<p class="chron-lead">${esc(p.lead)}</p><blockquote class="chron-q">${md(p.text)}</blockquote>`).join('')}
    </div>`).join('')}
    ${book.people.length ? `<div class="chron-chapter"><div class="chron-h">The people</div>${book.people.map((p) => `<p>${md(p.line)}</p>`).join('')}</div>` : ''}
    ${book.race ? `<div class="chron-chapter"><div class="chron-h">The race</div><p>${md(book.race)}</p></div>` : ''}
    <div class="chron-chapter"><div class="chron-h">In numbers</div><div class="chron-nums">${book.numbers.map(([k, v]) => `<span class="chron-k">${esc(k)}</span><span class="chron-v">${esc(v)}</span>`).join('')}</div></div>
    ${book.closing.length ? `<div class="chron-chapter"><div class="chron-h">How it ended</div>${book.closing.map((c) => `<p>${md(c)}</p>`).join('')}</div>` : ''}
    ${book.coda.length ? `<div class="chron-chapter"><div class="chron-h">Afterwards</div>${book.coda.map((c) => `<p>${md(c)}</p>`).join('')}</div>` : ''}`;
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

// Thirteen arc labels in a grid is a legend. What each of them would actually
// say is a verdict, and it is the last thing a run should print about a person
// — so the line comes from `verdicts.js` in their own register, with the arc
// label kept as the caption underneath it rather than as the whole entry.
function peopleSection(S) {
  const rels = Object.entries(S.narrative.relationships)
    .filter(([id, r]) => r.met && CHARACTERS[id])
    .map(([id, r]) => ({ ...CHARACTERS[id], ...r, id }))
    .sort((a, b) => Math.abs(b.affinity) - Math.abs(a.affinity));
  if (!rels.length) return '';
  return `<div class="ending-rule"></div>
    <div class="ending-section-title">Who you met, and what they say</div>
    <div class="col g10">
      ${rels.map((c) => {
        const v = verdictOf(c.id, c.affinity || 0);
        return `<div class="verdict" style="--vc:${c.color}">
          ${c.img ? `<div class="char-portrait verdict-face" style="border-color:${c.color}44"><img src="${c.img}" alt="" onerror="this.parentElement.style.display='none'"/></div>`
            : `<span class="verdict-glyph" style="color:${c.color}">${c.icon}</span>`}
          <div class="verdict-body">
            <div class="row between g8">
              <span class="small bold">${esc(c.name)}</span>
              <span class="tiny" style="color:${c.affinity >= 0 ? 'var(--green)' : 'var(--red)'}">${esc(arcLabel(c.id, c.arc))}</span>
            </div>
            ${v ? `<div class="verdict-line">${md(v.text)}</div>` : ''}
          </div>
        </div>`;
      }).join('')}
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

// ── The trajectory ──────────────────────────────────────────────────────────
// The chart the Story view has always had, at the one moment it is actually a
// retrospective rather than a dashboard. `runChart` is a pure string function
// and draws nothing when there is not enough history.
function trajectorySection(S) {
  let chart = '';
  try { chart = runChart(S); } catch (e) { chart = ''; }
  if (!chart) return '';
  return `<div class="ending-rule"></div>
    <div class="ending-section-title">The whole thing, on one axis</div>
    ${chart}`;
}

// ── The ledger ──────────────────────────────────────────────────────────────
// How the founder decided, counted. `buildDossier` already works out the
// temperament — the word the next timeline's briefing uses about you — so this
// prints that word over the tally rather than deriving a second opinion.
const TONE_WORD = { good: 'careful', risky: 'a gambler', cruel: 'hard', costly: 'willing to pay', neutral: 'even-handed' };
const TONE_HUE = { good: 'var(--green)', risky: 'var(--amber)', cruel: 'var(--red)',
                   costly: 'var(--violet)', neutral: 'var(--ink-3)' };
function ledgerSection(S) {
  const j = (S.narrative?.journal || []).filter((e) => e && e.kind !== 'call');
  if (j.length < 4) return '';
  const tones = { good: 0, risky: 0, cruel: 0, costly: 0, neutral: 0 };
  for (const e of j) tones[e.tone || 'neutral'] = (tones[e.tone || 'neutral'] || 0) + 1;
  let style = 'neutral';
  try { style = buildDossier(S).style || 'neutral'; } catch (e) { style = 'neutral'; }
  const total = Object.values(tones).reduce((a, b) => a + b, 0) || 1;
  const order = ['good', 'neutral', 'risky', 'costly', 'cruel'];
  return `<div class="ending-rule"></div>
    <div class="ending-section-title">How you decided</div>
    <div class="small dim mb12">${fmt(total)} recorded decision${total === 1 ? '' : 's'}. On the balance of them you were <b>${esc(TONE_WORD[style] || style)}</b> — which is what the next timeline's briefing will say about you.</div>
    <div class="ledger">
      ${order.filter((k) => tones[k]).map((k) => `<div class="ledger-row" style="--lc:${TONE_HUE[k]}">
        <span class="ledger-k mono">${esc(k)}</span>
        <span class="ledger-bar"><i style="width:${(tones[k] / total * 100).toFixed(1)}%"></i></span>
        <span class="ledger-n mono">${tones[k]}</span>
      </div>`).join('')}
    </div>`;
}

// ── The doctrines ───────────────────────────────────────────────────────────
// Not bought. Earned by holding a condition for months, which means each one is
// a sentence about how the company was run rather than about what it reached.
function doctrineSection(S) {
  const earned = Object.entries(S.doctrines?.earned || {})
    .map(([id, day]) => ({ d: DOCTRINE_MAP[id], day })).filter((x) => x.d)
    .sort((a, b) => a.day - b.day);
  if (!earned.length) return '';
  return `<div class="ending-rule"></div>
    <div class="ending-section-title">What you earned by how you ran it (${earned.length})</div>
    <div class="col g8">
      ${earned.map(({ d, day }) => `<div class="row g10" style="align-items:flex-start">
        <span style="color:${d.colour};font-size:14px;width:18px;text-align:center">${d.icon}</span>
        <span style="min-width:0;flex:1">
          <span class="small bold">${esc(d.name)}</span>
          <span class="tiny dim" style="display:block;line-height:1.5">${esc(d.flavour)}</span>
        </span>
        <span class="mono tiny dim">day ${Math.floor(day)}</span>
      </div>`).join('')}
    </div>`;
}

// ── The road not taken ──────────────────────────────────────────────────────
// Every constructed path, and where this run stood on it. A gate that was open
// and never built is the interesting row — it is the run the founder could have
// had and did not — and a sealed one says what it still wanted.
function roadNotTaken(S, ending) {
  let paths = [];
  try { paths = availableEndings(S).filter((e) => e.id !== ending.id); } catch (e) { return ''; }
  if (!paths.length) return '';
  const open = paths.filter((p) => p.gateMet).length;
  return `<div class="ending-rule"></div>
    <div class="ending-section-title">The road not taken</div>
    <div class="small dim mb12">${open ? `${open} other gate${open === 1 ? ' was' : 's were'} open at the end.` : 'Every other gate was still sealed.'} A path is three deliberate acts; the pips are how far this run got down each one.</div>
    <div class="col g8">
      ${paths.map((p) => {
        const prog = p.progress || { done: 0, total: 3 };
        return `<div class="road-row ${p.gateMet ? 'open' : ''}">
          <span class="road-icon">${p.icon || '⊙'}</span>
          <span class="road-text">
            <span class="small bold">${esc(p.name)}</span>
            <span class="tiny dim">${p.gateMet ? 'gate was open' : esc(p.req || 'sealed')}</span>
          </span>
          <span class="road-pips">${Array.from({ length: prog.total || 3 },
            (_, k) => `<i class="${k < prog.done ? 'on' : ''}"></i>`).join('')}</span>
        </div>`;
      }).join('')}
    </div>`;
}

// ── The career ──────────────────────────────────────────────────────────────
// This run against the best of the ones before it. The first run has nothing to
// compare with and says so rather than printing a row of dashes.
function careerSection(S, ending) {
  const log = (S.legacy?.log || []).filter((r) => r && Number.isFinite(r.valuation));
  if (!log.length) return '';
  const best = log.reduce((a, r) => (r.valuation > a.valuation ? r : a), log[0]);
  const longest = log.reduce((a, r) => (r.day > a.day ? r : a), log[0]);
  const mine = { day: Math.floor(S.time.day), valuation: dealOf(S) ?? S.company.valuation, act: S.company.act };
  const cmp = (a, b) => (a > b ? 'up' : a < b ? 'down' : '');
  const row = (label, now, then, thenLabel) => `<div class="cmp-row">
    <span class="cmp-k">${esc(label)}</span>
    <span class="cmp-now ${cmp(now.v, then.v)}">${esc(now.t)}</span>
    <span class="cmp-then">${esc(then.t)}<i>${esc(thenLabel)}</i></span>
  </div>`;
  return `<div class="ending-rule"></div>
    <div class="ending-section-title">Against the rest of your career</div>
    <div class="small dim mb12">${log.length} finished run${log.length === 1 ? '' : 's'} before this one. The right-hand column is the best of them.</div>
    <div class="cmp">
      ${row('Valuation', { v: mine.valuation, t: money(mine.valuation) },
            { v: best.valuation, t: money(best.valuation) }, `run ${best.run}`)}
      ${row('Days', { v: mine.day, t: fmt(mine.day) },
            { v: longest.day, t: fmt(longest.day) }, `run ${longest.run}`)}
      ${row('Act reached', { v: mine.act, t: ACT_ROMAN[mine.act] || String(mine.act) },
            { v: best.act || 1, t: ACT_ROMAN[best.act || 1] || String(best.act || 1) }, `run ${best.run}`)}
      ${row('Endings reached', { v: Object.keys(S.legacy?.endings || {}).length, t: String(Object.keys(S.legacy?.endings || {}).length) },
            { v: 0, t: `${new Set(log.map((r) => r.ending)).size}` }, 'distinct, before this')}
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
