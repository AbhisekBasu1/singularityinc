// ─────────────────────────────────────────────────────────────────────────────
// THE OPENING — a sequence, not a form. One question at a time, full screen,
// revealed at a readable pace. Choosing is advancing.
// ─────────────────────────────────────────────────────────────────────────────
import { esc } from './dom.js';
import { revealLines, typeInto, stagger, wait, skipActive, isPlaying } from './typewriter.js';
import { ARCHETYPES } from '../data/legacy.js';
import { CATEGORIES } from '../data/products.js';
import { DIFFICULTIES } from '../data/difficulty.js';
import { SCENARIOS } from '../data/scenarios.js';
import { companyName, personName, handleFor, TAGLINES } from '../data/names.js';
import { pick } from '../engine/rng.js';
import { fmt, money } from '../engine/format.js';
import { loadLegacy, hasSave } from '../engine/save.js';

const ARCH_COLOR = { hacker: '#4dd0e1', designer: '#c084fc', hustler: '#f5a623',
  researcher: '#8b5cf6', operator: '#7c8a99', prophet: '#ffffff', ghost: '#6b7686' };

export const draft = {
  founderName: personName(),
  companyName: companyName(),
  archetype: 'hacker',
  category: 'devtools',
  difficulty: 'standard',
  scenario: 'none',
};

let onStart = null;
let onContinue = null;
export function setHandlers(h) { onStart = h.start; onContinue = h.cont; }

const app = () => document.getElementById('app');
const legacy = () => loadLegacy() || { runs: 0, unlockedArchetypes: ['hacker'] };

// ── Cold open ───────────────────────────────────────────────────────────────
const COLD_OPEN = [
  '4:06 AM.',
  'The apartment is quiet in the way that only 4am is quiet.',
  'You have twelve thousand dollars, a laptop that runs hot, and an idea you have not told anyone about — because saying it out loud makes it sound small.',
  'On the screen: an empty repository. A cursor. And in the second pane, an agent, idling, waiting for an instruction.',
  'Six years ago this would have taken a team of eleven.',
];

export async function showTitle({ cold = null } = {}) {
  const L = legacy();
  const firstEver = (L.runs || 0) === 0 && !hasSave();
  const doCold = cold === null ? firstEver : cold;

  app().innerHTML = `
  <div class="stage" id="stage">
    <div class="stage-inner">
      <div class="cold" id="cold"></div>
      <div class="title-block" id="title-block">
        <div class="title-kicker">A solo-founder simulation</div>
        <div class="title-word">SINGULARITY,<br/>INC.</div>
        <div class="title-sub">One person. One laptop. An unlimited supply of machines
          that will do anything you can describe.</div>
        <div class="title-sub dim2">Find out how far that goes.</div>
        <div class="title-actions" id="title-actions">
          ${hasSave() ? `<button class="btn btn-primary btn-lg reveal" data-act="continue-game">Continue</button>` : ''}
          <button class="btn ${hasSave() ? 'btn-ghost' : 'btn-primary'} btn-lg reveal" data-act="new-game">
            ${hasSave() ? 'New timeline' : 'Begin'}</button>
        </div>
        ${L.runs > 0 ? `<div class="title-legacy reveal">
          <span>${L.runs} timeline${L.runs === 1 ? '' : 's'}</span>
          <span>${L.points || 0} legacy points</span>
          <span>best ${money(L.bestValuation || 0)}</span>
        </div>` : ''}
        <div class="title-foot reveal">Everything is simulated locally and saved in your browser.<br/>
          Space pauses. Q · W · E · R are your hands.</div>
      </div>
      ${doCold ? '<div class="skip-hint" id="skip-hint">click to skip</div>' : ''}
    </div>
  </div>`;

  const block = document.getElementById('title-block');
  if (doCold) {
    block.classList.add('hidden-until');
    await revealLines(document.getElementById('cold'), COLD_OPEN, { mode: 'fade', gap: 1500 });
    await wait(900);
    document.getElementById('cold')?.classList.add('fading');
    document.getElementById('skip-hint')?.remove();
    await wait(700);
    document.getElementById('cold')?.remove();
    block.classList.remove('hidden-until');
  }
  block.classList.add('in');
  await stagger(block.querySelectorAll('.reveal'), { gap: 130, delay: 520 });
}

// ── The beats ───────────────────────────────────────────────────────────────
const BEATS = ['who', 'founder', 'building', 'threshold'];
let beat = 0;
let advanced = false;

export function showIntro(startAt = 0) {
  beat = Math.max(0, Math.min(BEATS.length - 1, startAt));
  renderBeat();
}

export function introBeat() { return BEATS[beat]; }

export async function nextBeat() {
  if (beat >= BEATS.length - 1) return;
  await leave();
  beat++;
  renderBeat();
}
export async function prevBeat() {
  if (beat === 0) { showTitle({ cold: false }); return; }
  await leave();
  beat--;
  renderBeat();
}

function leave() {
  const el = document.querySelector('.beat');
  if (!el) return Promise.resolve();
  el.classList.add('leaving');
  return wait(240);
}

function chrome(index) {
  return `<div class="beat-chrome">
    <button class="beat-back" data-act="beat-back" title="Back">←</button>
    <div class="beat-dots">
      ${BEATS.map((_, i) => `<span class="beat-dot ${i === index ? 'on' : ''} ${i < index ? 'done' : ''}"></span>`).join('')}
    </div>
    <div class="beat-count">${index + 1} / ${BEATS.length}</div>
  </div>`;
}

async function renderBeat() {
  const id = BEATS[beat];
  if (id === 'who') return beatWho();
  if (id === 'founder') return beatFounder();
  if (id === 'building') return beatBuilding();
  return beatThreshold();
}

// ── 1. Who ──────────────────────────────────────────────────────────────────
async function beatWho() {
  app().innerHTML = `
  <div class="stage"><div class="beat narrow" id="beat">
    ${chrome(0)}
    <div class="beat-body narrow">
      <div class="beat-q" id="q"></div>
      <div class="beat-fields reveal">
        <label class="line-field">
          <span class="line-label">Your name</span>
          <input class="line-input" id="in-founder" value="${esc(draft.founderName)}"
            maxlength="28" autocomplete="off" spellcheck="false" />
        </label>
        <label class="line-field">
          <span class="line-label">The company</span>
          <span class="line-with-btn">
            <input class="line-input" id="in-company" value="${esc(draft.companyName)}"
              maxlength="28" autocomplete="off" spellcheck="false" />
            <button class="roll-btn" data-act="reroll-name" title="Roll new names">⟳</button>
          </span>
        </label>
      </div>
      <div class="beat-note reveal">Nobody has heard either of these yet.</div>
      <button class="btn btn-primary btn-lg beat-next reveal" data-act="beat-next">Continue</button>
    </div>
  </div></div>`;

  const f = document.getElementById('in-founder');
  const c = document.getElementById('in-company');
  f?.addEventListener('input', () => { draft.founderName = f.value; });
  c?.addEventListener('input', () => { draft.companyName = c.value; });
  for (const el of [f, c]) {
    el?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); nextBeat(); } });
  }

  await typeInto(document.getElementById('q'), 'First — who is doing this?', { cps: 38 });
  await stagger(document.querySelectorAll('#beat .reveal'), { gap: 150, delay: 120 });
  f?.focus();
  f?.select();
}

// ── 2. Founder ──────────────────────────────────────────────────────────────
async function beatFounder() {
  const un = legacy().unlockedArchetypes || ['hacker'];
  const open = ARCHETYPES.filter((a) => !a.unlockedBy || un.includes(a.id));
  const shut = ARCHETYPES.filter((a) => !(!a.unlockedBy || un.includes(a.id)));
  const single = open.length === 1;

  app().innerHTML = `
  <div class="stage"><div class="beat ${single ? 'narrow' : ''}" id="beat">
    ${chrome(1)}
    <div class="beat-body ${single ? 'narrow' : ''}">
      <div class="beat-q" id="q"></div>
      <div class="beat-sub reveal">${single
        ? 'Everyone starts here. The others are earned.'
        : 'This is not a difficulty setting. It is a different game.'}</div>
      <div class="choice-grid ${single ? 'single' : ''}">
        ${open.map((a) => `
          <button class="choice-card reveal" style="--cc:${ARCH_COLOR[a.id]}"
            data-act="choose-arch" data-v="${a.id}">
            <span class="cc-icon" style="color:${ARCH_COLOR[a.id]}">${a.icon}</span>
            <span class="cc-name">${esc(a.name)}</span>
            <span class="cc-tag">${esc(a.tagline)}</span>
            <span class="cc-desc">${esc(a.desc)}</span>
            <span class="cc-stats">${archStats(a)}</span>
          </button>`).join('')}
      </div>
      ${shut.length ? `<div class="locked-strip reveal">
        <div class="locked-label">${single ? 'Waiting for you' : 'Still locked'}</div>
        <div class="locked-row">
          ${shut.map((a) => `<span class="locked-chip"
            data-tip="${esc(a.desc)}<br><br><b>Unlocks:</b> ${esc(unlockHint(a))}" data-tip-title="${esc(a.name)} — locked">
            <span style="color:${ARCH_COLOR[a.id]};opacity:.55">${a.icon}</span> ${esc(a.name)}</span>`).join('')}
        </div>
      </div>` : ''}
    </div>
  </div></div>`;
  await typeInto(document.getElementById('q'),
    single ? 'You are a builder.' : 'What kind of founder are you?', { cps: 38 });
  await stagger(document.querySelectorAll('#beat .reveal'), { gap: 70, delay: 100 });
}

const UNLOCK_HINT = {
  designer: 'reach 0.9 product polish in any run',
  hustler: 'reach $1M ARR',
  researcher: 'train your own foundation model',
  operator: 'reach $1M ARR without ever raising',
  prophet: 'reach Act V',
  ghost: 'reach a $1B valuation with under 200 reputation',
};
function unlockHint(a) { return UNLOCK_HINT[a.id] || 'keep playing'; }

// ── 3. Building ─────────────────────────────────────────────────────────────
async function beatBuilding() {
  app().innerHTML = `
  <div class="stage"><div class="beat" id="beat">
    ${chrome(2)}
    <div class="beat-body">
      <div class="beat-q" id="q"></div>
      <div class="beat-sub reveal">Every category is a different economy. Choose the one you want to live in.</div>
      <div class="choice-grid">
        ${CATEGORIES.map((c) => `
          <button class="choice-card reveal" style="--cc:${c.color}" data-act="choose-cat" data-v="${c.id}">
            <span class="cc-icon" style="color:${c.color}">${c.icon}</span>
            <span class="cc-name">${esc(c.name)}</span>
            <span class="cc-tag">${esc(c.tagline)}</span>
            <span class="cc-desc">${esc(c.desc)}</span>
            <span class="cc-stats">
              <span class="cc-stat">market ${fmt(c.tam)}</span>
              <span class="cc-stat">viral ${c.baseViral.toFixed(2)}</span>
              <span class="cc-stat">churn ${(c.baseChurn * 100).toFixed(1)}%</span>
              <span class="cc-stat">${money(c.basePrice)}/mo</span>
              ${c.regRisk > 0.6 ? '<span class="cc-stat warn">scrutiny</span>' : ''}
              ${c.coldStart ? '<span class="cc-stat warn">cold start</span>' : ''}
            </span>
          </button>`).join('')}
      </div>
    </div>
  </div></div>`;
  await typeInto(document.getElementById('q'), 'What are you going to build?', { cps: 38 });
  await stagger(document.querySelectorAll('#beat .reveal'), { gap: 65, delay: 100 });
}

// ── 4. Threshold ────────────────────────────────────────────────────────────
async function beatThreshold() {
  const a = ARCHETYPES.find((x) => x.id === draft.archetype) || ARCHETYPES[0];
  const c = CATEGORIES.find((x) => x.id === draft.category) || CATEGORIES[0];
  const L = legacy();
  const showAdv = (L.runs || 0) > 0;
  const diff = DIFFICULTIES.find((d) => d.id === draft.difficulty) || DIFFICULTIES[1];
  const scen = SCENARIOS.find((s) => s.id === draft.scenario) || SCENARIOS[0];

  app().innerHTML = `
  <div class="stage"><div class="beat narrow" id="beat">
    ${chrome(3)}
    <div class="beat-body narrow">
      <div class="threshold-lines" id="lines"></div>
      <div class="threshold-card reveal">
        <span class="tc-row"><span class="tc-icon" style="color:${ARCH_COLOR[a.id]}">${a.icon}</span>
          <span><b>${esc(draft.founderName || 'You')}</b> — ${esc(a.name)}</span></span>
        <span class="tc-row"><span class="tc-icon" style="color:${c.color}">${c.icon}</span>
          <span><b>${esc(draft.companyName || 'Untitled')}</b> — ${esc(c.name)}</span></span>
        ${showAdv ? `<span class="tc-row"><span class="tc-icon" style="color:${diff.color}">${diff.icon}</span>
          <span>${esc(diff.name)}${scen.id !== 'none' ? ` · ${esc(scen.name)}` : ''}</span></span>` : ''}
      </div>
      ${showAdv ? `<button class="adv-toggle reveal" data-act="toggle-adv">${advanced ? 'Hide' : 'Adjust'} the run conditions</button>` : ''}
      ${showAdv && advanced ? advancedPanel(L) : ''}
      <button class="btn btn-primary btn-lg beat-next reveal" data-act="start-game">Open the editor →</button>
      <div class="beat-note reveal">None of this can be changed later.</div>
      <button class="assistant-line reveal" data-act="assistant-link">
        <span class="al-mark">◈</span>
        <span>Play with your assistant — it writes the world against you</span>
      </button>
    </div>
  </div></div>`;

  await revealLines(document.getElementById('lines'), [
    'That is everything the world knows.',
    'It is 4am and nobody is waiting on you.',
  ], { mode: 'fade', gap: 900 });
  await stagger(document.querySelectorAll('#beat .reveal'), { gap: 120, delay: 80 });
}

function advancedPanel(L) {
  return `<div class="adv-panel reveal">
    <div class="adv-label">How hard</div>
    <div class="adv-row">
      ${DIFFICULTIES.map((d) => {
        const ok = !d.req || L[d.req];
        return `<button class="adv-chip ${draft.difficulty === d.id ? 'on' : ''} ${ok ? '' : 'locked'}"
          style="--ac:${d.color}" ${ok ? `data-act="pick-diff" data-v="${d.id}"` : 'disabled'}
          data-tip="${esc(d.desc)}" data-tip-title="${esc(d.name)}">
          ${ok ? d.icon : '🔒'} ${esc(d.name)} <span class="adv-mult">×${d.legacyMult.toFixed(1)}</span></button>`;
      }).join('')}
    </div>
    <div class="adv-label">Opening conditions</div>
    <div class="adv-row">
      ${SCENARIOS.map((s) => `<button class="adv-chip ${draft.scenario === s.id ? 'on' : ''}"
        style="--ac:${s.color}" data-act="pick-scen" data-v="${s.id}"
        data-tip="${esc(s.desc)}" data-tip-title="${esc(s.name)}">
        ${s.icon} ${esc(s.name)}${s.legacyMult !== 1 ? ` <span class="adv-mult">×${s.legacyMult.toFixed(2)}</span>` : ''}</button>`).join('')}
    </div>
    <div class="adv-note">Harder conditions pay more Legacy points when the run ends.</div>
  </div>`;
}

function archStats(a) {
  const out = [];
  for (const [k, v] of Object.entries(a.mods || {})) {
    if (k.startsWith('+')) { out.push(`<span class="cc-stat">${k.slice(1)} +${v}</span>`); continue; }
    const p = Math.round((v - 1) * 100);
    if (!p) continue;
    out.push(`<span class="cc-stat ${p > 0 ? 'up' : 'down'}">${label(k)} ${p > 0 ? '+' : ''}${p}%</span>`);
  }
  return out.join('');
}
const LABELS = { codeRate: 'code', debtRate: 'debt', repRate: 'reputation', conversion: 'conversion',
  churn: 'churn', mrrMult: 'revenue', arpu: 'arpu', researchRate: 'research', agentOutput: 'agents',
  opCost: 'costs', valuationMult: 'valuation', competitorGrowth: 'rivals', rivalHeat: 'rival heat' };
function label(k) { return LABELS[k] || k; }

// ── Selection helpers ───────────────────────────────────────────────────────
export async function chooseArchetype(id, el) {
  draft.archetype = id;
  await commitCard(el);
  nextBeat();
}
export async function chooseCategory(id, el) {
  draft.category = id;
  await commitCard(el);
  nextBeat();
}
async function commitCard(el) {
  if (!el) return;
  el.parentElement?.querySelectorAll('.choice-card').forEach((n) => {
    if (n !== el) n.classList.add('dimmed');
  });
  el.classList.add('chosen');
  await wait(320);
}

export function toggleAdvanced() { advanced = !advanced; renderBeat(); }
export function rerollNames() {
  draft.founderName = personName();
  draft.companyName = companyName();
  const f = document.getElementById('in-founder');
  const c = document.getElementById('in-company');
  if (f) f.value = draft.founderName;
  if (c) c.value = draft.companyName;
}

export function getConfig() {
  return {
    founderName: draft.founderName?.trim() || 'Alex Rivera',
    companyName: draft.companyName?.trim() || 'Untitled',
    handle: handleFor(draft.founderName || 'alex'),
    archetype: draft.archetype,
    category: draft.category,
    difficulty: draft.difficulty,
    scenario: draft.scenario,
    productName: draft.companyName?.trim() || 'Untitled',
    tagline: pick(TAGLINES),
  };
}

export function setDraft(k, v) { draft[k] = v; if (BEATS[beat] === 'threshold') renderBeat(); }

// ── The curtain ─────────────────────────────────────────────────────────────
// A held beat between choosing and playing, so the game does not simply appear.
export async function curtain(lines, { hold = 900 } = {}) {
  const el = document.createElement('div');
  el.className = 'curtain';
  el.innerHTML = '<div class="curtain-lines" id="curtain-lines"></div>';
  document.body.appendChild(el);
  await wait(60);
  el.classList.add('in');
  await revealLines(document.getElementById('curtain-lines'), lines, { mode: 'fade', gap: 1150 });
  await wait(hold);
  el.classList.add('out');
  await wait(760);
  el.remove();
}
export { skipActive, isPlaying, wait };
