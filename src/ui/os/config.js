// ─────────────────────────────────────────────────────────────────────────────
// THE WORKSTATION'S GEOMETRY — every number the desktop is built from.
//
// `src/data/balance.js` is the game's tuning and none of this belongs there.
// This is the machine's own dimensions: how tall the menu bar is, how long a
// window takes to close, how often an unfocused window is allowed to repaint.
// ─────────────────────────────────────────────────────────────────────────────

export const OS = {
  // ── Chrome ────────────────────────────────────────────────────────────────
  MENUBAR_H: 30,
  DOCK_H: 60,
  DOCK_W: 56,
  TITLE_H: 32,
  TILE: 44,
  INSET: 12,               // desktop margin for zoom and the first-boot layout

  // ── Widths ────────────────────────────────────────────────────────────────
  // The console's own breakpoints, so the two housings change shape together.
  WIRE_W: 356,             // the docked Wire rail, at desktop width
  WIRE_MIN_FIELD: 620,     // never dock it if what is left is smaller than this
  DESKTOP_MIN: 1120,       // below this the Wire is a drawer, as it always was
  STACKED_MAX: 860,        // at or below this, one window at a time

  // ChatGPT's chat input floats over the bottom centre of its own browser,
  // about 720x120. Nothing the page pins may sit under it.
  KEEPOUT_HOSTED: 132,
  KEEPOUT_PLAIN: 34,

  // ── Windows ───────────────────────────────────────────────────────────────
  CASCADE: 28,             // offset per already-open window
  CASCADE_ORIGIN: [40, 40],
  DRAG_KEEP: 80,           // px of title bar that must stay on the desktop
  EDGE_GRAB: 8,            // invisible resize band on an edge
  CORNER_GRAB: 15,
  SNAP_EDGE: 22,           // pointer distance from an edge that arms a snap
  Z_BASE: 10,
  Z_TOP: 39,

  // ── Cadence ───────────────────────────────────────────────────────────────
  // `paintMain` runs every 130ms. The focused window paints on every one of
  // those; the rest take turns, at most one per call, and never faster than
  // this. An idle window costs one string build, because `render()` short-
  // circuits on an identical string.
  PAINT_OTHER_MS: 480,

  // ── Motion ────────────────────────────────────────────────────────────────
  T_WIN: 240,              // open / close / minimize
  T_FOCUS: 140,
  T_ZOOM: 220,
  T_MENU_IN: 120,
  T_MENU_OUT: 90,
  T_WALL: 1400,            // wallpaper crossfade on an act change
  T_CALL: 700,             // the call banner before a card from a person
  T_SHUTDOWN_STEP: 90,

  // ── Notifications ─────────────────────────────────────────────────────────
  NOTIFY_W: 332,
  NOTIFY_MAX: 4,
  NOTIFY_MAX_STACKED: 2,
  NC_KEEP: 40,             // notifications the Center remembers

  // ── Wallpaper ─────────────────────────────────────────────────────────────
  WALL_OPACITY: 0.22,
};

// The machine's name. It is `WORKSTATION` until the company is large enough to
// run on its own stack, and the company's from Act III — the quiet half of the
// act transition, which nothing announces.
export function machineName(company, act) {
  const name = String(company || '').trim();
  return act >= 3 && name ? `${name.toUpperCase()} OS` : 'WORKSTATION';
}

export const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V'];
