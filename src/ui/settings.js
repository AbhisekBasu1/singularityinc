// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS — the one dialog that writes `S.settings`. Every control here is
// wired inside the dialog element it belongs to, not on `document`.
// ─────────────────────────────────────────────────────────────────────────────
import { S } from '../engine/state.js';
import * as Save from '../engine/save.js';
import * as Modal from './modal.js';
import { slider as sliderHtml } from './dom.js';
import { toast } from './toast.js';
import { play as sfx, setEnabled as setAudio, initAudio, setAmbient } from './audio.js';
import { setBackgroundEnabled } from './background.js';

const actOf = () => S?.company.act || 1;

export function showSettings() {
  const el = Modal.dialog({ title: 'Settings', wide: false,
    body: `<div class="col g12">
      ${toggle('sound', 'Sound', S.settings.sound)}
      ${toggle('ambient', 'Ambient bed', S.settings.ambient !== false)}
      <div class="row between g12">
        <span class="small" id="volume-label">Volume</span>
        <div style="flex:1;max-width:180px">${sliderHtml('volume', S.settings.volume ?? 0.55, 'var(--green)', 'aria-labelledby="volume-label"')}</div>
      </div>
      ${toggle('autosave', 'Autosave', S.settings.autosave)}
      ${toggle('particles', 'Background motion', S.settings.particles)}
      ${toggle('reducedMotion', 'Reduce motion', S.settings.reducedMotion)}
      ${toggle('highContrast', 'High contrast', S.settings.highContrast)}
      ${toggle('confirmBigMoves', 'Confirm large decisions', S.settings.confirmBigMoves)}
      <div class="divider"></div>
      <button class="btn btn-sm btn-ghost btn-block" data-act="assistant-link">Play with your assistant</button>
      <button class="btn btn-sm btn-ghost btn-block" data-act="help">Manual — keys, glossary, walkthroughs</button>
      <div class="divider"></div>
      <div class="row g8">
        <button class="btn btn-sm" data-set="export">Copy save to clipboard</button>
        <button class="btn btn-sm" data-set="import">Import save</button>
      </div>
      <div class="row g8">
        <button class="btn btn-sm btn-danger" data-set="reset">Abandon this run</button>
      </div>
      <div class="tiny dimmer">Saves live in your browser's local storage. Exporting gives you a portable string.</div>
    </div>`, actions: [] });

  el.querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.toggle; S.settings[k] = !S.settings[k];
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
    if (k === 'import') { const v = prompt('Paste save string:'); if (v && Save.importSave(v)) { location.reload(); } }
    if (k === 'reset') { if (confirm('Abandon this run? Legacy points are kept.')) { Save.clearSave(); location.reload(); } }
  }));
}

function toggle(key, label, val) {
  return `<div class="row between"><span class="small">${label}</span>
    <button class="btn btn-sm ${val ? 'on' : ''}" data-toggle="${key}" aria-pressed="${!!val}" style="min-width:52px">${val ? 'ON' : 'OFF'}</button></div>`;
}
