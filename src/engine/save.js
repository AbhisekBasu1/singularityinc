// ─────────────────────────────────────────────────────────────────────────────
// SAVE — localStorage persistence, migration, export/import.
// ─────────────────────────────────────────────────────────────────────────────
import { S, setState, SAVE_VERSION, newGame } from './state.js';
import { reseed } from './rng.js';
import { markDirty } from '../systems/modifiers.js';
import { emit } from './bus.js';

const KEY = 'singularity_inc_save_v1';
const LEGACY_KEY = 'singularity_inc_legacy_v1';
const SETTINGS_KEY = 'singularity_inc_settings_v1';

// Flags that describe what is happening *right now* rather than what is true
// about the run. `_agentDriven` persisted as true would switch off the
// real-time event floor for the whole of the next session.
const TRANSIENT = ['_agentDriven', '_offline', '_toolBusy', '_narrAcc'];

export function save(state = S) {
  if (!state) return false;
  try {
    state.meta.lastSaved = Date.now();
    state.meta.lastRealTime = Date.now();
    const held = {};
    for (const k of TRANSIENT) { if (k in state) { held[k] = state[k]; delete state[k]; } }
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    finally { Object.assign(state, held); }
    localStorage.setItem(LEGACY_KEY, JSON.stringify(state.legacy));
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
    emit('save');
    return true;
  } catch (e) {
    console.error('[save]', e);
    return false;
  }
}

export function hasSave() {
  try { return !!localStorage.getItem(KEY); } catch { return false; }
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const migrated = migrate(data);
    if (!migrated) return null;
    setState(migrated);
    reseed(migrated.meta.seed >>> 0);
    markDirty();
    emit('load', migrated);
    return migrated;
  } catch (e) {
    console.error('[load]', e);
    return null;
  }
}

export function loadLegacy() {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export function saveLegacy(legacy) {
  try { localStorage.setItem(LEGACY_KEY, JSON.stringify(legacy)); return true; } catch { return false; }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); return true; } catch { return false; }
}

export function hardReset() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(LEGACY_KEY);
    localStorage.removeItem(SETTINGS_KEY);
    return true;
  } catch { return false; }
}

function migrate(data) {
  if (!data || typeof data !== 'object') return null;
  const v = data.meta?.version ?? 0;
  if (v === SAVE_VERSION) return fill(data);
  if (v < SAVE_VERSION) {
    // Structural fill: merge onto a fresh state so new fields exist.
    const fresh = newGame({ legacy: data.legacy });
    const merged = deepMerge(fresh, data);
    merged.meta.version = SAVE_VERSION;
    return fill(merged);
  }
  return fill(data); // newer save; try anyway
}

function fill(s) {
  // Transient holds must never survive a reload: a save written while the
  // walkthrough was up would otherwise come back with the clock frozen.
  delete s.tutorialHold;
  delete s.modalBlocking;
  // Guard against missing sub-objects from older/partial saves
  const fresh = newGame({ legacy: s.legacy });
  for (const k of Object.keys(fresh)) {
    if (s[k] === undefined) s[k] = fresh[k];
    else if (fresh[k] && typeof fresh[k] === 'object' && !Array.isArray(fresh[k])) {
      for (const k2 of Object.keys(fresh[k])) {
        if (s[k][k2] === undefined) s[k][k2] = fresh[k][k2];
      }
    }
  }
  return s;
}

function deepMerge(base, override) {
  if (Array.isArray(override)) return override;
  if (override === null || typeof override !== 'object') return override ?? base;
  const out = Array.isArray(base) ? [] : { ...base };
  for (const k of Object.keys(override)) {
    const b = base?.[k], o = override[k];
    out[k] = (b && typeof b === 'object' && !Array.isArray(b) && o && typeof o === 'object' && !Array.isArray(o))
      ? deepMerge(b, o) : o;
  }
  return out;
}

// ── Export / import ────────────────────────────────────────────────────────
export function exportSave(state = S) {
  const json = JSON.stringify(state);
  return btoa(unescape(encodeURIComponent(json)));
}

export function importSave(b64) {
  try {
    const json = decodeURIComponent(escape(atob(b64.trim())));
    const data = JSON.parse(json);
    const migrated = migrate(data);
    if (!migrated) return false;
    setState(migrated);
    reseed(migrated.meta.seed >>> 0);
    markDirty();
    save(migrated);
    emit('load', migrated);
    return true;
  } catch (e) { console.error('[import]', e); return false; }
}

// ── Autosave ───────────────────────────────────────────────────────────────
let autosaveTimer = null;
export function startAutosave(intervalMs = 12000) {
  stopAutosave();
  autosaveTimer = setInterval(() => { if (S?.settings.autosave) save(S); }, intervalMs);
  window.addEventListener('beforeunload', () => save(S));
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(S); });
}
export function stopAutosave() { if (autosaveTimer) clearInterval(autosaveTimer); autosaveTimer = null; }
