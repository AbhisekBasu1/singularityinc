// ─────────────────────────────────────────────────────────────────────────────
// THE RIVAL'S ORIGIN — where Aperture Systems lives, and the room for a guest.
//
// Kept apart from `partners.js` so the pieces of the game that only need the
// address — the Browser app, the Market's invite line, the Terminal — do not
// import the tool registry to get it.
// ─────────────────────────────────────────────────────────────────────────────

export function resolveOrigin() {
  try {
    const q = new URLSearchParams(location.search).get('rival');
    if (q) return new URL(q).origin;
  } catch {}
  if (typeof location === 'undefined' || !location?.hostname) return null;   // headless: no address at all
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(location.hostname)) {
    // The dev server: the rival is the next port up, on the same host — which
    // is a LAN address when the game was opened from one. This wins over the
    // meta tag below on purpose: the tag names the *deployed* rival, and a
    // local run that reached for it would be talking to production — and to a
    // relay that a static host does not have.
    const port = Number(location.port || 80) + 1;
    return `${location.protocol}//${location.hostname}:${port}`;
  }
  // A deploy without a custom domain cannot make `rival.<host>` exist, so the
  // page may name the rival's origin outright: `<meta name="rival-origin">` in
  // index.html and computer/index.html. Empty means "use the convention".
  try {
    const m = document.querySelector('meta[name="rival-origin"]')?.content?.trim();
    if (m) return new URL(m).origin;
  } catch {}
  // Deployed: a sibling host. `rival.` in front of the apex, which is a
  // different origin and therefore needs its own origin-trial token.
  return `${location.protocol}//rival.${location.hostname.replace(/^www\./, '')}`;
}

// Six characters from the save. Stable for the run, different for the next one,
// and not stored: a room is a fact about the game, not a setting.
export function roomCode(S) {
  const src = `${S?.meta?.seed ?? 'x'}:${S?.meta?.createdAt || 0}`;
  let h = 2166136261;
  for (let i = 0; i < src.length; i++) { h ^= src.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(36).padStart(6, '0').slice(-6);
}

// The link a second human opens to sit in Vance's chair. Null when there is no
// second origin to open.
export function inviteLink(S) {
  const o = resolveOrigin();
  return o ? `${o}/rival/?play=1&room=${roomCode(S)}` : null;
}

// Whether that link can reach another machine. `localhost` cannot; the LAN
// address the dev server prints can.
export function inviteReach() {
  if (typeof location === 'undefined' || !location?.hostname) return 'none';
  return location.hostname === 'localhost' || location.hostname === '127.0.0.1' ? 'this machine' : 'this network';
}
