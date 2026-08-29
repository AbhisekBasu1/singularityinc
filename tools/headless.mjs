// ─────────────────────────────────────────────────────────────────────────────
// HEADLESS — the DOM stubs every node-side tool needs, in one place.
//
// `tools/uitest.mjs` and `tools/simtest.mjs` predate this and carry their own
// copies; they are left alone on purpose (they are load-bearing and green).
// Everything written for the WebMCP layer imports this instead.
// ─────────────────────────────────────────────────────────────────────────────
const noop = () => {};

export function installDom({ rich = true } = {}) {
  globalThis.performance = globalThis.performance || { now: () => Date.now() };
  globalThis.localStorage = {
    _d: {}, getItem(k) { return this._d[k] ?? null; },
    setItem(k, v) { this._d[k] = String(v); }, removeItem(k) { delete this._d[k]; },
  };
  const mkEl = () => ({
    style: {}, dataset: {},
    classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    appendChild: noop, remove: noop, addEventListener: noop, removeEventListener: noop,
    querySelector: () => null, querySelectorAll: () => [], closest: () => null,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 20, right: 100, bottom: 20 }),
    set innerHTML(v) { this._h = v; }, get innerHTML() { return this._h || ''; },
    scrollTop: 0, scrollHeight: 0, clientHeight: 0, focus: noop, click: noop, blur: noop,
    textContent: '', clientWidth: 1200, width: 0, height: 0, scrollIntoView: noop,
    getContext: () => ({ setTransform: noop, clearRect: noop, beginPath: noop, moveTo: noop,
      lineTo: noop, stroke: noop, arc: noop, fill: noop, globalAlpha: 1, strokeStyle: '',
      fillStyle: '', lineWidth: 1 }),
  });
  globalThis.__mkEl = mkEl;
  globalThis.document = {
    addEventListener: noop, removeEventListener: noop,
    getElementById: () => (rich ? mkEl() : null),
    querySelector: () => null, querySelectorAll: () => [],
    createElement: mkEl, body: { appendChild: noop, classList: { add: noop, remove: noop } },
    hidden: false, documentElement: mkEl(), createRange: () => ({ selectNodeContents: noop }),
  };
  globalThis.window = {
    addEventListener: noop, removeEventListener: noop, innerWidth: 1600, innerHeight: 900,
    devicePixelRatio: 1, isSecureContext: true,
    matchMedia: () => ({ matches: false, addEventListener: noop }),
    getSelection: () => ({ removeAllRanges: noop, addRange: noop }),
  };
  globalThis.location = { search: '', href: 'http://localhost/', origin: 'http://localhost',
    pathname: '/', reload: noop };
  globalThis.requestAnimationFrame = () => 0;
  globalThis.cancelAnimationFrame = noop;
  globalThis.btoa = (s) => Buffer.from(s, 'binary').toString('base64');
  globalThis.atob = (s) => Buffer.from(s, 'base64').toString('binary');
  try {
    Object.defineProperty(globalThis, 'navigator', {
      value: { clipboard: { writeText: async () => {} } }, configurable: true,
    });
  } catch {}
}

// ── Test reporting ──────────────────────────────────────────────────────────
let pass = 0, fail = 0;
const failures = [];

export function ok(name, cond, detail) {
  if (cond) { pass++; return true; }
  fail++; failures.push(`${name}${detail ? ': ' + detail : ''}`);
  console.log(`  ✗ ${name}${detail ? ': ' + detail : ''}`);
  return false;
}
export function eq(name, got, want) {
  return ok(name, Object.is(got, want) || JSON.stringify(got) === JSON.stringify(want),
            `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}
export function near(name, got, want, tol) {
  return ok(name, Math.abs(got - want) <= tol, `got ${got}, want ${want}±${tol}`);
}
export async function section(title, fn) {
  console.log(`\n── ${title} ──`);
  try { await fn(); }
  catch (e) { fail++; failures.push(`${title} threw: ${e.message}`);
    console.log(`  ✗ ${title} threw: ${e.message}\n     ${(e.stack || '').split('\n')[1]?.trim()}`); }
}
export function report(label) {
  console.log(`\n═══ ${label}: ${pass}/${pass + fail} checks passed ═══`);
  if (failures.length) { console.log('\nfailures:'); failures.forEach((f) => console.log('  · ' + f)); }
  process.exit(fail ? 1 : 0);
}
