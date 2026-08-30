// ─────────────────────────────────────────────────────────────────────────────
// SAVE — localStorage persistence, migration, export/import.
// ─────────────────────────────────────────────────────────────────────────────
import { S, setState, SAVE_VERSION, newGame } from './state.js';
import { reseed, rngState, setRngState } from './rng.js';
import { markDirty } from '../systems/modifiers.js';
import { emit, silence } from './bus.js';
import { createProduct } from '../systems/product.js';
import { hireAgent, rollCandidate } from '../systems/agents.js';
import { spawnCompetitor } from '../systems/market.js';

const KEY = 'singularity_inc_save_v1';
const LEGACY_KEY = 'singularity_inc_legacy_v1';
const SETTINGS_KEY = 'singularity_inc_settings_v1';

// Flags that describe what is happening *right now* rather than what is true
// about the run. `_agentDriven` persisted as true would switch off the
// real-time event floor for the whole of the next session.
const TRANSIENT = ['_agentDriven', '_offline', '_toolBusy', '_narrAcc', '_forecast', '_opsRelBonus',
                   'tutorialHold', 'modalBlocking'];

// One serialisation for the save slot and the export string. Never a
// hypothetical — `forecast` points the live binding at a throwaway copy while
// it runs, and the autosave timer, `beforeunload`, `visibilitychange` and the
// Settings export all read that binding — and never the flags that describe
// this moment rather than the run.
export function serialisable(state) {
  if (!state || state._forecast) return null;
  const copy = { ...state };
  for (const k of TRANSIENT) delete copy[k];
  return copy;
}

export function save(state = S) {
  const copy = serialisable(state);
  if (!copy) return false;
  try {
    state.meta.lastSaved = Date.now();
    state.meta.lastRealTime = Date.now();
    localStorage.setItem(KEY, JSON.stringify(copy));
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

// ── Per-version transforms ─────────────────────────────────────────────────
// Structural fill (below) adds what is missing. A transform is for what fill
// cannot express: a field that moved, was renamed, or changed scale. Keyed by
// the version it upgrades *to*, applied in order, each one small enough to
// read in full.
const MIGRATIONS = {
  9: (s) => {
    // `_lastShipDay` was an undeclared top-level side-channel read by the
    // Relentless doctrine; it lives in `stats` now, where it is saved on purpose.
    if (typeof s._lastShipDay === 'number') (s.stats ??= {}).lastShipDay ??= s._lastShipDay;
    delete s._lastShipDay;
  },
};

function migrate(data) {
  if (!data || typeof data !== 'object') return null;
  const v = data.meta?.version ?? 0;
  let s = data;
  if (v < SAVE_VERSION) {
    // Transforms first, on the raw save: the structural merge below fills a
    // missing field with its default, which would hide the one that moved.
    for (let to = v + 1; to <= SAVE_VERSION; to++) {
      try { MIGRATIONS[to]?.(data); } catch (e) { console.error('[migrate]', to, e); }
    }
    // Then the structural fill: merge onto a fresh state so new fields exist.
    const fresh = newGame({ legacy: data.legacy });
    s = deepMerge(fresh, data);
    s.meta.version = SAVE_VERSION;
  }
  return fill(s);   // a newer save than this build knows: try anyway
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
  // Arrays of objects are replaced wholesale by deepMerge and the two-level
  // fill above never looks inside them, so a field added to a product, an
  // agent or a competitor since the save was written was undefined in every
  // element — and `Math.max(undefined, x)` is NaN for the rest of the run.
  // Each element is filled from a template the real factory built, so the
  // shape can never drift from the code that creates new ones.
  backfillItems(s.products, (p) => template((t) => createProduct(t, { name: p.name || 'x', category: p.category })));
  backfillItems(s.agents, () => template((t) => {
    t.company.cash = 1e12;
    const r = hireAgent(t, rollCandidate(t));
    return r.ok ? t.agents[0] : null;
  }));
  backfillItems(s.market?.competitors, () => template((t) =>
    spawnCompetitor(t, { name: 'x', founder: 'x' })));
  return s;
}

// Run a factory on a throwaway game with the RNG and the bus put back after,
// so building a template costs the real run nothing — not a random draw, not
// a feed line.
function template(build) {
  const rng = rngState();
  const unsilence = silence();
  try { return build(newGame({})); }
  catch (e) { console.error('[migrate] template', e); return null; }
  finally { unsilence(); setRngState(rng); }
}

const IDENTITY = new Set(['id', 'name']);
function backfillItems(arr, makeTemplate) {
  if (!Array.isArray(arr)) return;
  let shared = null;
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue;
    const tpl = makeTemplate.length ? makeTemplate(item) : (shared ??= makeTemplate());
    if (!tpl) return;
    for (const k of Object.keys(tpl)) {
      if (IDENTITY.has(k) || item[k] !== undefined) continue;
      const v = tpl[k];
      item[k] = v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v;
    }
  }
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
// Null when there is nothing honest to export: a forecast is running and the
// live binding is its clone.
export function exportSave(state = S) {
  const copy = serialisable(state);
  if (!copy) return null;
  const json = JSON.stringify(copy);
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
