// ─────────────────────────────────────────────────────────────────────────────
// THE MANUAL — walkthroughs, keys, the glossary and the per-act guide, in one
// dialog. Everything it prints is data in `src/data/manual.js`; this is the
// screen that reads it.
// ─────────────────────────────────────────────────────────────────────────────
import { S } from '../engine/state.js';
import { esc } from './dom.js';
import * as Modal from './modal.js';
import * as Tutorial from './tutorial.js';
import { play as sfx } from './audio.js';
import { KEYS, GLOSSARY, ACT_GUIDE, FOOTNOTES } from '../data/manual.js';

const MANUAL_TABS = [
  { id: 'walk', name: 'Walkthroughs' },
  { id: 'keys', name: 'Keys' },
  { id: 'terms', name: 'Glossary' },
  { id: 'run', name: 'The run' },
];
let manualTab = 'walk';

function manualBody() {
  if (manualTab === 'walk') return manualWalk();
  if (manualTab === 'keys') return manualKeys();
  if (manualTab === 'run') return manualRun();
  return manualTerms();
}

function manualWalk() {
  const rows = Tutorial.chapterStatus();
  return `<div class="col g8">
    <div class="small dim mb4">Short, anchored tours of the interface. Each one runs where it applies and holds the clock while it does.</div>
    ${rows.map((c, i) => {
      const state = c.done ? 'done' : c.available ? 'ready' : 'later';
      return `<div class="man-row ${state}">
        <span class="man-idx">${String(i + 1).padStart(2, '0')}</span>
        <span class="man-text">
          <span class="man-name">${esc(c.name)}</span>
          <span class="man-sub">${esc(c.sub)} · ${c.steps} steps</span>
        </span>
        <span class="man-state">${c.done ? 'complete' : c.available ? 'available' : 'not yet'}</span>
        <button class="btn btn-sm ${c.available ? '' : 'btn-ghost'}" data-man="run:${c.id}"
          ${c.available ? '' : 'disabled'}>${c.done ? 'Replay' : 'Start'}</button>
      </div>`;
    }).join('')}
    <div class="divider"></div>
    <div class="row between">
      <span class="small dim">Offer walkthroughs automatically</span>
      <button class="btn btn-sm ${Tutorial.isDisabled() ? '' : 'on'}" data-man="toggle" style="min-width:52px">${Tutorial.isDisabled() ? 'OFF' : 'ON'}</button>
    </div>
  </div>`;
}

function manualKeys() {
  return `<div class="col g8">
    ${KEYS.map(([k, name, note]) => `<div class="row g10" style="align-items:flex-start">
      <kbd class="kbd">${esc(k)}</kbd>
      <span style="min-width:0"><span class="small bold">${esc(name)}</span>
        ${note ? `<span class="tiny dim" style="display:block;line-height:1.45">${esc(note)}</span>` : ''}</span>
    </div>`).join('')}
    <div class="divider"></div>
    ${FOOTNOTES.map((f) => `<div class="tiny dimmer" style="line-height:1.5">${esc(f)}</div>`).join('')}
  </div>`;
}

function manualTerms() {
  return `<div class="small dim mb12">Every term below is also a hover. Anywhere the interface prints one of these words as a label, resting on it gives you this definition.</div>
  <div class="man-terms">
    ${GLOSSARY.map((g) => `<div class="man-group">
      <div class="man-group-title">${esc(g.group)}</div>
      ${g.items.map(([n, d]) => `<div class="man-term">
        <div class="man-term-name">${esc(n)}</div>
        <div class="man-term-def">${esc(d)}</div>
      </div>`).join('')}
    </div>`).join('')}
  </div>`;
}

function manualRun() {
  const act = S?.company.act || 1;
  return `<div class="col g8">
    <div class="small dim mb4">Five acts. Each one changes what the game is about, and the previous act's habits stop working.</div>
    ${ACT_GUIDE.map((a) => `<div class="man-act ${a.act === act ? 'on' : a.act < act ? 'past' : ''}">
      <div class="man-act-head">
        <span class="man-act-num">ACT ${['','I','II','III','IV','V'][a.act]}</span>
        <span class="man-act-name">${esc(a.name)}</span>
        ${a.act === act ? '<span class="man-act-here">you are here</span>' : ''}
      </div>
      <div class="man-act-line">${esc(a.line)}</div>
      <div class="man-act-row"><span class="man-k">do</span>${esc(a.goal)}</div>
      <div class="man-act-row"><span class="man-k">watch</span>${esc(a.watch)}</div>
    </div>`).join('')}
  </div>`;
}

export function showHelp() {
  const el = Modal.dialog({ title: 'Manual', wide: true,
    body: `<div class="man-tabs" id="man-tabs">
      ${MANUAL_TABS.map((t) => `<button class="branch-tab ${manualTab === t.id ? 'on' : ''}" data-man="tab:${t.id}">${esc(t.name)}</button>`).join('')}
    </div>
    <div id="man-body">${manualBody()}</div>`,
    actions: [{ label: 'Close', cls: 'btn-primary' }] });

  const repaint = () => {
    const tabs = el.querySelector('#man-tabs');
    const body = el.querySelector('#man-body');
    if (!tabs || !body) return;
    tabs.querySelectorAll('[data-man^="tab:"]').forEach((b) =>
      b.classList.toggle('on', b.dataset.man === 'tab:' + manualTab));
    body.innerHTML = manualBody();
  };

  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-man]');
    if (!b) return;
    const v = b.dataset.man;
    if (v.startsWith('tab:')) { manualTab = v.slice(4); sfx('click'); repaint(); return; }
    if (v === 'toggle') { Tutorial.setDisabled(!Tutorial.isDisabled()); sfx('click'); repaint(); return; }
    if (v.startsWith('run:')) {
      const id = v.slice(4);
      Modal.closeModal();
      setTimeout(() => Tutorial.start(id), 220);
    }
  });
}
