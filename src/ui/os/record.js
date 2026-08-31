// ─────────────────────────────────────────────────────────────────────────────
// THE RECORD — a file browser over the company's own history.
//
// Three columns: a rail of folders, a list of files, a reading pane. Miller
// columns, in the machine's own language — every row is a chamfered plate with
// its day stamp on a hairline rail, and the only colour in the whole app is the
// window accent on whatever is selected. Kinds are printed, never tinted: an
// archive that colours nine sorts of file is a dashboard.
//
// `render(S)` is a pure string function. Selection lives at
// `S.ui.os.record = { path, id }`, which is saved, so the machine reopens on
// the file you were reading. Everything a founder reads as prose comes from
// `src/systems/record.js` or from `EMPTY` in `src/data/machine.js`; the only
// strings declared here are mono chrome — a column header, a pane label, a
// screen-reader name for a key — which is the same budget `K` gets in the
// system underneath.
//
// The collapse is derived, not measured. `data-pane` on the root says which
// pane the selection implies — folders, list or read — and the container
// queries in `styles/os.css` decide how many of the three the window is wide
// enough to show. `‹` is the way back up, and it is rendered in both the
// list head and the reading head at every width — which one is on screen is
// the stylesheet's call. The one-column shape has to arrive before the
// window body reaches ~700px, or the 760px ChatGPT pane keeps a 176px rail
// and gives a file 520px to be read in.
// ─────────────────────────────────────────────────────────────────────────────
import { esc, md } from '../dom.js';
import { folders, list, read, summary } from '../../systems/record.js';
import { EMPTY, FOLDERS } from '../../data/machine.js';
import { gameDateShort } from '../../engine/format.js';
import { ROMAN } from './config.js';

// A long run fills a folder. Nothing here has ever come near this, and a list
// that silently stops is worse than a slow one — so the cap is generous and it
// says so when it bites.
const MAX_ROWS = 400;

const safe = (fn, dflt) => { try { const v = fn(); return v == null ? dflt : v; } catch { return dflt; } };
const line = (k) => (EMPTY && typeof EMPTY[k] === 'string' ? EMPTY[k] : '');

function selection(S) {
  const r = S && S.ui && S.ui.os ? S.ui.os.record : null;
  return { path: (r && r.path) || null, id: (r && r.id) || null };
}

// `folders(S)` returns only what this act can open. The drawers still shut are
// drawn anyway, dark, with the act that opens them printed beside the name. A
// disabled thing that does not say why it is disabled is a dead end, and a
// Record that hides three of its eleven drawers teaches nothing about where the
// company is going.
function shutFolders(S, open) {
  const act = Number(S && S.company && S.company.act) || 1;
  const have = new Set(open.map((f) => f.path));
  const out = [];
  for (const f of (Array.isArray(FOLDERS) ? FOLDERS : [])) {
    if (!f || have.has(f.path)) continue;
    const a = Number(f.act);
    if (!Number.isFinite(a) || a <= act) continue;
    out.push({ path: String(f.path || ''), name: String(f.name || f.path || ''), act: a });
  }
  return out;
}

// `day: null` is the record saying it never wrote one down — a megaproject
// tally, a lab standing, a relationship. `Number(null)` is 0, not NaN, so the
// null has to be caught by name or every one of those files is stamped day 000
// and dated the morning the company was founded, two lines above its own meta
// row reading NOT RECORDED. The missing stamp is the point.
function dayStamp(d) {
  if (d == null || d === '') return '—';
  const n = Number(d);
  if (!Number.isFinite(n)) return '—';
  return String(Math.max(0, Math.floor(n))).padStart(3, '0');
}

function dateLine(d) {
  if (d == null || d === '') return '';
  const n = Number(d);
  if (!Number.isFinite(n)) return '';
  return `DAY ${Math.floor(n)} · ${gameDateShort(n).toUpperCase()}`;
}

function actNote(a) {
  const n = Number(a);
  return `ACT ${ROMAN[n] || String(a == null ? '' : a)}`;
}

// `md()` in `src/ui/dom.js` is inline only — bold, code, em, and a `>` line
// turned into a span. It emits no block at all, so the rest of the game hands
// it a container with `white-space: pre-wrap` and lets the newlines do the
// work. The Record cannot: a file's body is the one long-form surface in the
// workstation, and a body built by `para()` — two, three, four paragraphs
// joined by a blank line — collapses into a single run-on wall the moment it
// lands in a plain div. So the blocks are cut here and `md` is run inside each
// one, which also puts a real `<p>` under the `.rec-prose p` rule that has
// never had anything to match.
//
// Three shapes appear in `src/systems/record.js` and nowhere else: paragraphs
// split by a blank line, `- ` bullets joined by single newlines (an agent's
// traits), and `> ` quotes (its memories, a rival's file on you). The `>` and
// the `- ` are stripped before `md` sees them, so the inline transforms inside
// a quote still run and the marker never prints. The blockquote carries
// `quote` as well as `rec-q`, because that is the class `md()` would have
// put on the same text and any `.rec-prose .quote` rule should still find it.
function prose(body) {
  const src = String(body == null ? '' : body).replace(/\r/g, '');
  const out = [];
  for (const block of src.split(/\n{2,}/)) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    if (lines.every((l) => l.startsWith('- '))) {
      out.push(`<ul class="rec-ul">${lines.map((l) => `<li>${md(l.slice(2))}</li>`).join('')}</ul>`);
    } else if (lines.every((l) => l.startsWith('>'))) {
      out.push(`<blockquote class="rec-q quote">${
        lines.map((l) => md(l.replace(/^>\s?/, ''))).join('<br>')}</blockquote>`);
    } else {
      out.push(`<p>${lines.map((l) => md(l)).join('<br>')}</p>`);
    }
  }
  return out.join('');
}

// ── The app ─────────────────────────────────────────────────────────────────

export function render(S) {
  const open = safe(() => folders(S), []) || [];
  const shut = shutFolders(S, open);
  const sel = selection(S);

  // Not one drawer in play. Unreachable while `FOLDERS` has an act-1 entry, and
  // drawn rather than crashed if that ever stops being true.
  if (!open.length && !shut.length) {
    return shellHtml('folders', emptyPane(line('folder'), 'THE RECORD IS EMPTY'), true);
  }

  const chosen = open.find((f) => f.path === sel.path) || null;
  // The list column is never blank at a width that shows it: with nothing
  // chosen it falls to the first drawer the founder can open. `pane` still
  // reads `folders`, so the one-column mode opens on the rail rather than
  // somewhere the founder never asked to be.
  const shown = chosen || open[0] || null;
  const rows = shown ? (safe(() => list(S, shown.path), []) || []) : [];
  // A file only ever belongs to the drawer it was filed in. A saved selection
  // naming a path this act cannot open — a save from a build with a folder
  // this one does not have — reads against nothing rather than against
  // whichever drawer happened to sort first.
  const source = sel.path ? chosen : shown;
  const doc = source && sel.id ? safe(() => read(S, source.path, sel.id), null) : null;
  // A file can genuinely go: the Wire keeps 160 entries and destroys the tail.
  // Saying so is better than quietly putting the founder back in the list.
  const gone = !!(sel.id && !doc);
  const pane = doc || gone ? 'read' : (chosen ? 'list' : 'folders');

  return shellHtml(pane, [
    railHtml(S, open, shut, shown),
    listHtml(shown, rows, sel, doc),
    readHtml(shown, doc, sel, gone),
  ].join(''));
}

function shellHtml(pane, inner, solo) {
  return `<div class="rec${solo ? ' rec-solo' : ''}" data-pane="${pane}" data-ctx="record">${inner}</div>`;
}

// ── The rail: every drawer the company keeps ────────────────────────────────

function railHtml(S, open, shut, shown) {
  const sum = safe(() => summary(S), null) || {};
  const files = Number(sum.files);
  const since = Number(sum.since);
  const foot = [
    Number.isFinite(files) ? `${files} FILE${files === 1 ? '' : 'S'}` : '',
    Number.isFinite(since) ? `FROM DAY ${Math.floor(since)}` : '',
  ].filter(Boolean).join(' · ');
  // One day of history, and the rail says which day rather than a range of one.
  const today = Math.floor(Number(S && S.time && S.time.day) || 0);
  const fresh = files > 0 && Number.isFinite(since) && today <= Math.floor(since);

  return `<div class="rec-rail">
    <div class="rec-head">
      <span class="rec-k">The Record</span>
      <button class="rec-find" data-act="record-find" type="button"
        data-tip="${esc(line('find'))}" data-tip-title="Find">Find<kbd>F</kbd></button>
    </div>
    <div class="rec-rule"></div>
    <div class="rec-folders">
      ${open.map((f, i) => folderHtml(f, i, shown)).join('')}
      ${shut.map((f, i) => shutHtml(f, open.length + i)).join('')}
    </div>
    ${foot ? `<div class="rec-rail-foot">
      <span class="rec-foot-k">${esc(foot)}</span>
      ${fresh ? `<span class="rec-foot-note">${esc(line('day_one'))}</span>` : ''}
    </div>` : ''}
  </div>`;
}

function folderHtml(f, i, shown) {
  const path = String(f.path || '');
  const name = String(f.name || path);
  const count = Number(f.count);
  const on = !!(shown && shown.path === path);
  return `<button class="rec-folder${on ? ' on' : ''}" type="button" data-act="record-folder"
    data-ctx="record-folder" data-v="${esc(path)}" data-path="${esc(path)}" data-name="${esc(name)}"
    ${f.blurb ? `data-tip="${esc(f.blurb)}" data-tip-title="${esc(name)}"` : ''}
    aria-current="${on ? 'true' : 'false'}">
    <span class="rec-fi">${String(i + 1).padStart(2, '0')}</span>
    <span class="rec-fn">${esc(name)}</span>
    <span class="rec-fc">${Number.isFinite(count) ? count : ''}</span>
  </button>`;
}

// Not `disabled`: a disabled button takes no pointer events in most browsers,
// and the tip explaining the lock is the whole reason the row is drawn. It
// carries no `data-act`, so pressing it does nothing at all.
function shutHtml(f, i) {
  return `<button class="rec-folder locked" type="button" aria-disabled="true" tabindex="-1"
    data-ctx="record-folder" data-path="${esc(f.path)}" data-name="${esc(f.name)}"
    data-tip="${esc(line('locked'))}" data-tip-title="${esc(f.name)}">
    <span class="rec-fi">${String(i + 1).padStart(2, '0')}</span>
    <span class="rec-fn">${esc(f.name)}</span>
    <span class="rec-fc">${esc(actNote(f.act))}</span>
  </button>`;
}

// ── The list: one drawer, newest first ──────────────────────────────────────

function listHtml(shown, rows, sel, doc) {
  if (!shown) return `<div class="rec-list">${emptyPane(line('folder'), 'NO FOLDER')}</div>`;
  const name = String(shown.name || shown.path || '');
  const count = rows.length;
  const cut = rows.slice(0, MAX_ROWS);

  return `<div class="rec-list">
    <div class="rec-head">
      <button class="rec-back" data-act="record-back" type="button" aria-label="Back to the folders">‹</button>
      <span class="rec-k">${esc(name)}</span>
      <span class="rec-count">${count}</span>
    </div>
    <div class="rec-rule"></div>
    ${shown.blurb ? `<div class="rec-blurb">${esc(shown.blurb)}</div>` : ''}
    ${count === 0 ? emptyPane(shown.empty || line('folder'), 'NOTHING FILED HERE') : `
    <div class="rec-legend"><span>Day</span><span>File</span><span>Detail</span></div>
    <div class="rec-rows">
      ${cut.map((r) => rowHtml(shown, r, sel, doc)).join('')}
      ${count > cut.length ? `<div class="rec-more">${count - cut.length} more · use Find</div>` : ''}
    </div>`}
  </div>`;
}

function rowHtml(folder, r, sel, doc) {
  const id = String(r.id == null ? '' : r.id);
  const on = !!doc && sel.id === id;
  const name = String(r.name || id);
  const kind = String(r.kind || '');
  const meta = String(r.meta == null ? '' : r.meta);
  const day = dayStamp(r.day);
  return `<button class="rec-row${on ? ' on' : ''}" type="button" data-act="record-open"
    data-ctx="record-file" data-path="${esc(folder.path)}" data-id="${esc(id)}"
    data-name="${esc(name)}" data-kind="${esc(kind)}" data-day="${esc(day)}"
    aria-current="${on ? 'true' : 'false'}">
    <span class="rec-d">${esc(day)}</span>
    <span class="rec-n">${esc(name)}</span>
    <span class="rec-m">${esc(meta || kind)}</span>
  </button>`;
}

// ── The reading pane ────────────────────────────────────────────────────────

function readHtml(shown, doc, sel, gone) {
  if (!doc) {
    return `<div class="rec-read">
      <div class="rec-head">
        ${gone ? `<button class="rec-back rec-shut" data-act="record-back" type="button" aria-label="Put it back">‹</button>` : ''}
        <span class="rec-k">Reading</span>
      </div>
      <div class="rec-rule"></div>
      ${emptyPane(line(gone ? 'read' : 'select'), gone ? 'GONE' : 'NOTHING OPEN')}
    </div>`;
  }
  const name = String(doc.name || '');
  const kind = String(doc.kind || '');
  const folder = shown ? String(shown.name || shown.path || '') : '';
  const meta = Array.isArray(doc.meta) ? doc.meta : [];
  const date = dateLine(doc.day);

  return `<div class="rec-read">
    <div class="rec-head">
      <button class="rec-back rec-shut" data-act="record-back" type="button" aria-label="Put it back">‹</button>
      <span class="rec-k">${esc(folder)}</span>
      <span class="rec-sub rec-k">${esc(name)}</span>
    </div>
    <div class="rec-rule"></div>
    <div class="rec-doc">
      <div class="rec-doc-in" data-ctx="record-file" data-path="${esc(shown ? shown.path : '')}"
        data-id="${esc(String(sel.id == null ? '' : sel.id))}" data-name="${esc(name)}" data-kind="${esc(kind)}"
        data-day="${esc(dayStamp(doc.day))}">
        <div class="rec-doc-head">
          ${kind ? `<span class="rec-doc-k rec-m">${esc(kind)}</span>` : ''}
          <div class="rec-doc-name">${esc(name)}</div>
          ${date ? `<div class="rec-doc-day">${esc(date)}</div>` : ''}
        </div>
        ${meta.length ? `<div class="rec-meta">${meta.map(([k, v]) =>
          `<span class="rec-mk">${esc(String(k == null ? '' : k))}</span><span class="rec-mv">${esc(String(v == null ? '—' : v))}</span>`).join('')}</div>` : ''}
        ${doc.body ? `<div class="rec-prose">${prose(doc.body)}</div>` : ''}
      </div>
    </div>
  </div>`;
}

// ── Empty ───────────────────────────────────────────────────────────────────
// Day three is mostly this, so it is drawn rather than apologised for: a
// reticle, a mono label, and the one authored line the data has for it.

function emptyPane(prose, label) {
  return `<div class="rec-empty">
    <span class="rec-empty-mark" aria-hidden="true">⊟</span>
    <span class="rec-empty-k">${esc(label)}</span>
    ${prose ? `<span class="rec-empty-line">${esc(prose)}</span>` : ''}
  </div>`;
}

// ── The title bar ───────────────────────────────────────────────────────────
// `summary(S)` is the cheap call and the only one this may make: it runs seven
// times a second for the focused window.

export function readoutFor(S) {
  const sum = safe(() => summary(S), null);
  if (!sum) return 'THE RECORD';
  const files = Number(sum.files);
  const fold = Number(sum.folders);
  const since = Number(sum.since);
  const bits = [];
  if (Number.isFinite(files)) bits.push(`${files} FILE${files === 1 ? '' : 'S'}`);
  if (Number.isFinite(fold)) bits.push(`${fold} FOLDER${fold === 1 ? '' : 'S'}`);
  if (Number.isFinite(since)) bits.push(`FROM DAY ${Math.floor(since)}`);
  return bits.length ? bits.join(' · ') : 'THE RECORD';
}

// ── The menu ────────────────────────────────────────────────────────────────
// A blocked item says why it is blocked, in mono, every time.

export function menuFor(S) {
  const open = safe(() => folders(S), []) || [];
  const shut = shutFolders(S, open);
  const sel = selection(S);
  const up = !!(sel.path || sel.id);
  const out = [
    { label: 'Search the record…', key: 'F', act: 'record-find' },
    { label: 'Back', act: 'record-back', disabled: !up, note: up ? undefined : 'AT THE TOP' },
  ];
  if (!open.length && !shut.length) return out;
  out.push({ sep: true }, { head: 'FOLDERS' });
  for (const f of open) {
    const count = Number(f.count);
    out.push({
      label: String(f.name || f.path || ''),
      act: 'record-folder',
      v: String(f.path || ''),
      checked: sel.path === f.path,
      note: Number.isFinite(count) && count === 0 ? 'EMPTY' : undefined,
    });
  }
  for (const f of shut) {
    out.push({ label: f.name, disabled: true, note: actNote(f.act) });
  }
  return out;
}
