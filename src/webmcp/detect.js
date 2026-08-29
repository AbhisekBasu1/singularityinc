// ─────────────────────────────────────────────────────────────────────────────
// CAPABILITY DETECTION — three seconds, one answer, and a remedy when it is no.
//
// `document.modelContext` is the current surface. `navigator.modelContext` was
// deprecated in Chrome 150 and is accepted here only so an older browser
// degrades to LEGACY rather than to nothing. `provideContext()` and
// `window.agent` are gone; nothing in this codebase may call them.
//
// The failure that costs an hour if you meet it cold: a secure context means
// https or localhost, and a LAN address is not one. The API is simply absent,
// with no error anywhere, which reads as a broken page rather than a missing
// browser feature. So say it.
// ─────────────────────────────────────────────────────────────────────────────

export function capability() {
  const win = typeof window !== 'undefined' ? window : null;
  const doc = typeof document !== 'undefined' ? document : null;
  const secure = !!win?.isSecureContext;
  const mc = doc?.modelContext || null;
  const legacy = !mc && (typeof navigator !== 'undefined' ? navigator?.modelContext : null) || null;

  if (mc) return { tier: 'native', mc, secure, label: 'NATIVE' };
  if (legacy) {
    return { tier: 'legacy', mc: legacy, secure, label: 'LEGACY',
      reason: 'this browser still exposes the old navigator.modelContext — it works, but update it' };
  }
  return {
    tier: 'none', mc: null, secure, label: 'UNAVAILABLE',
    reason: !secure
      ? 'not a secure context — open this over https or on localhost (a LAN address like 192.168.x.x will never work)'
      : 'no site tools in this browser — use the ChatGPT desktop app’s built-in browser (Sol or Terra; Luna has them switched off), or Chrome 149+',
  };
}

// The deep link that opens the desktop app on a new thread, on this page, with
// an opening instruction already typed. The instruction itself belongs to
// whatever is being built; this file only knows how to make the link.
export function deepLinks(prompt = '') {
  const url = typeof location !== 'undefined' ? location.origin + location.pathname : '';
  const q = `prompt=${encodeURIComponent(prompt)}&browserUrl=${encodeURIComponent(url)}`;
  return {
    app: `codex://threads/new?${q}`,
    web: `https://chatgpt.com/codex/deeplink?url=${encodeURIComponent(url)}&${q}`,
    url,
  };
}
