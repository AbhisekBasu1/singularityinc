// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS — the one dialog that writes `S.settings`. Every control here is
// wired inside the dialog element it belongs to, not on `document`.
// ─────────────────────────────────────────────────────────────────────────────
import { S } from '../engine/state.js';
import * as Save from '../engine/save.js';
import * as Modal from './modal.js';
import { slider as sliderHtml, esc } from './dom.js';
import { toast } from './toast.js';
import { play as sfx, setEnabled as setAudio, initAudio, setAmbient } from './audio.js';
import { setBackgroundEnabled } from './background.js';
import { isOs } from './shell.js';
import { pasteDialog } from './dialogs.js';
import { TIME } from '../data/balance.js';

const actOf = () => S?.company.act || 1;

export function showSettings() {
  const el = Modal.dialog({ title: 'Settings', wide: false, body: settingsBody() });
  bindSettings(el);
}

export function settingsBody() {
  return `<div class="col g12">
      ${toggle('sound', 'Sound', S.settings.sound)}
      ${toggle('ambient', 'Ambient bed', S.settings.ambient !== false)}
      <div class="row between g12">
        <span class="small" id="volume-label">Volume</span>
        <div style="flex:1;max-width:180px">${sliderHtml('volume', S.settings.volume ?? 0.55, 'var(--green)', 'aria-labelledby="volume-label"')}</div>
      </div>
      ${toggle('autosave', 'Autosave', S.settings.autosave)}
      <div class="row between"><span class="small" data-tip="One sitting: the clock runs while you play. The long game: a month of the company for every real day away, and the clock holds after a month of live play." data-tip-title="Pace">Pace</span>
        <span class="row g4">
          <button class="btn btn-sm ${S.settings.pace !== 'long' ? 'on' : ''}" data-set="pace:sitting">One sitting</button>
          <button class="btn btn-sm ${S.settings.pace === 'long' ? 'on' : ''}" data-set="pace:long">The long game</button>
        </span></div>
      ${toggle('particles', 'Background motion', S.settings.particles)}
      ${toggle('reducedMotion', 'Reduce motion', S.settings.reducedMotion)}
      ${toggle('highContrast', 'High contrast', S.settings.highContrast)}
      ${toggle('confirmBigMoves', 'Confirm large decisions', S.settings.confirmBigMoves)}
      ${toggle('autoThrottle', 'Slow the clock for decisions', S.settings.autoThrottle !== false)}
      ${autoPauseRows()}
      <div class="row between"><span class="small" data-tip="Off, a card is a decision about people. On, each choice is run forward on a throwaway copy of the world and prints what it did — cash, users, reputation, alignment, heat, and who warms to you. A choice that rolls is marked <b>~</b>: the preview saw one of its branches." data-tip-title="Show the numbers">Numbers on card choices</span>
        <button class="btn btn-sm ${S.settings.showNumbers ? 'on' : ''}" data-toggle="showNumbers" aria-pressed="${!!S.settings.showNumbers}" aria-label="Numbers on card choices" style="min-width:52px">${S.settings.showNumbers ? 'ON' : 'OFF'}</button></div>
      <div class="divider"></div>
      <button class="btn btn-sm btn-ghost btn-block" data-act="assistant-link">Play with your assistant</button>
      <button class="btn btn-sm btn-ghost btn-block" data-act="help">Manual — keys, glossary, walkthroughs</button>
      ${isOs() ? '' : '<button class="btn btn-sm btn-ghost btn-block" data-set="workstation">Open the workstation — the same save, on a desktop</button>'}
      <div class="divider"></div>
      ${slotRows()}
      <div class="row g8">
        <button class="btn btn-sm" data-set="export">Copy save to clipboard</button>
        <button class="btn btn-sm" data-set="import">Paste a save</button>
      </div>
      <div class="row g8">
        <button class="btn btn-sm" data-set="download">Download the file</button>
        <button class="btn btn-sm" data-set="upload">Open a file</button>
      </div>
      <div class="row g8">
        <button class="btn btn-sm btn-danger" data-set="reset">Abandon this run</button>
      </div>
      <div class="tiny dimmer">Saves live in your browser's local storage. The file and the string carry the same run, so either one moves it to another machine.</div>
    </div>`;
}

// ── §C2 Stop the clock for ──────────────────────────────────────────────────
// Five things the founder can ask to be stopped at, all off until one is
// turned on. The pause bit belongs to the founder — that is the rule
// `ui/transport.js` is built on — and these do not loosen it: a toggle that is
// on *is* the founder's hand on the pause button, pressed in advance. A toggle
// that is off writes nothing at all, which is why there is no migration and no
// default: a save from before this existed simply has none of them.
//
// The labels are the five moments, not five settings. "An incident" rather
// than "Pause on incident", because the heading above already said what the
// column does and the machine does not need to say it five more times.
const AUTO_PAUSE_ROWS = [
  ['incident', 'An incident'],
  ['wire', 'A thread or a letter'],
  ['runway', `Runway under ${TIME.AUTOPAUSE_RUNWAY_DAYS} days`],
  ['cash', 'Cash goes negative'],
  ['rogue', 'An agent goes rogue'],
];

function autoPauseRows() {
  const on = S.settings.autoPause || {};
  const lit = AUTO_PAUSE_ROWS.filter(([k]) => on[k]).length;
  return `<div class="row between"><span class="small" data-tip="Off, nothing but your own hand ever stops the clock. Turn one on and the game pauses when that happens, the way the pause button does — and says which one it was." data-tip-title="Stop the clock for">Stop the clock for</span>
      <span class="tiny dimmer mono set-count-autoPause">${lit} OF ${AUTO_PAUSE_ROWS.length} ON</span></div>
    <div class="set-indent col g8">
      ${AUTO_PAUSE_ROWS.map(([k, label]) => toggle(`autoPause:${k}`, label, !!on[k])).join('')}
    </div>`;
}

// ── The three slots ─────────────────────────────────────────────────────────
// The workstation puts a login tile on each of these; the console gets the same
// three as rows, because a run you cannot reach is a run you do not have.
// Switching writes the current run first and reloads into the other one — the
// page is the game's whole state, and half a reload is a corrupt slot.
function slotRows() {
  const rows = Save.slots();
  return `<div class="set-slots">
    <div class="row between"><span class="small">Saves</span>
      <span class="tiny dimmer mono">${rows.filter((r) => !r.empty).length} OF ${rows.length} USED</span></div>
    ${rows.map((r) => {
      const label = r.corrupt ? 'unreadable'
        : r.empty ? 'empty'
        : `${r.saved.companyName} · Act ${['0', 'I', 'II', 'III', 'IV', 'V'][r.saved.act]} · day ${r.saved.day}`;
      return `<div class="row between g8 slot-row ${r.active ? 'on' : ''}">
        <span class="tiny mono dimmer" style="width:44px;flex:0 0 44px">SLOT ${r.n}</span>
        <span class="small grow" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(label)}</span>
        ${r.active
          ? '<span class="tiny mono c-green" style="flex:0 0 auto">IN PLAY</span>'
          : `<button class="btn btn-sm" data-set="slot:${r.n}" style="flex:0 0 auto">${r.empty || r.corrupt ? 'Start here' : 'Open'}</button>`}
      </div>`;
    }).join('')}
  </div>`;
}

export function bindSettings(el) {
  if (!el) return;
  el.querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.toggle;
    // `group:key` writes one field of a map instead of one field of settings.
    // §C2's five live under `autoPause`, and the map is made on the first
    // press rather than in `newGame`, so a run nobody has configured carries
    // no record of a decision nobody made.
    if (k.includes(':')) {
      const [group, key] = k.split(':');
      const map = (S.settings[group] ||= {});
      map[key] = !map[key];
      b.classList.toggle('on'); b.textContent = map[key] ? 'ON' : 'OFF';
      b.setAttribute('aria-pressed', String(!!map[key]));
      const count = el.querySelector('.set-count-' + group);
      if (count) count.textContent = `${Object.values(map).filter(Boolean).length} OF ${el.querySelectorAll(`[data-toggle^="${group}:"]`).length} ON`;
      return;
    }
    S.settings[k] = !S.settings[k];
    if (k === 'sound') { setAudio(S.settings.sound);
      if (S.settings.sound) { initAudio(); sfx('click'); if (S.settings.ambient !== false) setAmbient(true, actOf); } }
    if (k === 'ambient') setAmbient(S.settings.ambient !== false && S.settings.sound !== false, actOf);
    if (k === 'reducedMotion') document.documentElement.classList.toggle('reduced-motion', !!S.settings.reducedMotion);
    if (k === 'highContrast') document.documentElement.classList.toggle('high-contrast', !!S.settings.highContrast);
    if (k === 'particles') setBackgroundEnabled(S.settings.particles);
    b.classList.toggle('on'); b.textContent = S.settings[k] ? 'ON' : 'OFF';
    b.setAttribute('aria-pressed', String(!!S.settings[k]));
  }));
  el.querySelectorAll('[data-set]').forEach((b) => b.addEventListener('click', async () => {
    const k = b.dataset.set;
    if (k === 'export') {
      const str = Save.exportSave(S);
      if (!str) { toast({ icon: '⚠', title: 'Nothing to copy just now.', sub: 'A forecast is running. Try again in a moment.', kind: 'bad' }); return; }
      await navigator.clipboard.writeText(str);
      toast({ icon: '⌗', title: 'Save copied.', kind: 'good' });
    }
    // The file, both ways. The viewer sandbox that forbids a page-initiated
    // download belongs to published artifacts, not to a game served from its
    // own origin, so an anchor and a file input are all this needs.
    if (k === 'download') {
      if (!Save.downloadSave(S)) toast({ icon: '⚠', title: 'Nothing to write just now.', sub: 'A forecast is running. Try again in a moment.', kind: 'bad' });
      else toast({ icon: '⌗', title: 'Save written.', sub: Save.saveFileName(S), kind: 'good' });
    }
    if (k === 'upload') {
      Save.pickSaveFile((okFile, reason) => {
        if (okFile) { location.reload(); return; }
        if (reason) toast({ icon: '⚠', title: reason, kind: 'bad' });
      });
    }
    // Another slot. The run on screen is written down first — the page is the
    // whole of the game's state and half a reload is a corrupt slot.
    if (k.startsWith('slot:')) {
      const n = Number(k.slice(5));
      Save.save(S);
      Save.setSlot(n);
      location.reload();
    }
    // The other housing, on the same save. Write first: the workstation is a
    // fresh document and an unsaved minute would be a minute lost.
    if (k === 'workstation') { Save.save(S); location.href = '/computer/'; }
    // The game's own sheet, not the browser's `prompt()`. In the console it
    // replaces the Settings dialog on screen, so Cancel puts Settings back; on
    // the workstation Settings is a window and the sheet simply closes.
    if (k === 'import') showImportSave({ onCancel: isOs() ? null : () => showSettings() });
    if (k.startsWith('pace:')) {
      S.settings.pace = k.slice(5) === 'long' ? 'long' : 'sitting';
      el.querySelectorAll('[data-set^="pace:"]').forEach((x) => x.classList.toggle('on', x.dataset.set === k));
      toast({ icon: S.settings.pace === 'long' ? '☾' : '◷', title: S.settings.pace === 'long' ? 'The long game.' : 'One sitting.',
        sub: S.settings.pace === 'long' ? 'A month of the company for every real day away.' : 'The clock runs while you play.', kind: 'good' });
    }
    if (k === 'reset') showAbandonRun();
  }));
}

// The two sheets Settings opens. Both housings' app menus reach them too, so
// they are exported rather than bound to a button.
export function showImportSave({ onCancel = null } = {}) {
  pasteDialog({
    title: 'Import a save', verb: 'Import',
    hint: 'Paste the string <b>Copy save</b> produced on the other machine. It replaces the run in this browser and the page reloads into it.',
    placeholder: 'eyJtZXRhIjp7…',
    onCancel,
    submit: (v) => {
      if (!String(v || '').trim()) return { ok: false, reason: 'Nothing pasted.' };
      if (!Save.importSave(v)) return { ok: false, reason: 'That did not read as a save this game wrote.' };
      location.reload();
      return { ok: true };
    },
  });
}

export function showAbandonRun() {
  Modal.dialog({ title: 'Abandon this run?', centred: true,
    body: `<div class="small dim" style="line-height:1.7">The company, the cast and everything you decided go away. Legacy points, perks, achievements and unlocked archetypes are kept.<br><br>There is no undo.</div>`,
    actions: [{ label: 'Keep playing', cls: 'btn-ghost' },
      { label: 'Abandon it', cls: 'btn-danger', fn: () => { Save.clearSave(); location.reload(); } }] });
}

function toggle(key, label, val) {
  return `<div class="row between"><span class="small">${label}</span>
    <button class="btn btn-sm ${val ? 'on' : ''}" data-toggle="${key}" aria-pressed="${!!val}" aria-label="${label}" style="min-width:52px">${val ? 'ON' : 'OFF'}</button></div>`;
}
