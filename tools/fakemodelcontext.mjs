// ─────────────────────────────────────────────────────────────────────────────
// A ModelContext that reproduces the platform's sharp edges, headlessly.
//
// It is deliberately unkind, because the real one is: a duplicate name rejects,
// an abort rejects the original registration promise as well as unregistering,
// results are stringified (so a Map arrives as `{}` and a cycle throws), calls
// arrive concurrently, and the payload is measured serialised against a cap.
// Anything that passes here has met the traps that cost a build.
// ─────────────────────────────────────────────────────────────────────────────

export const RESULT_CAP = 1500;

class FakeRegisteredTool {
  constructor(def, origin) {
    this.name = def.name;
    this.title = def.title;
    this.description = def.description;
    this.inputSchema = def.inputSchema;
    this.annotations = def.annotations || {};
    this.origin = origin;
    this.window = null;
  }
}

export class FakeModelContext extends EventTarget {
  // `settleOnRegister` picks which reading of the spec to reproduce. The
  // default is the harsher one — the registration promise stays pending for the
  // life of the tool and rejects when the signal aborts — because a registry
  // that survives that also survives the kinder one.
  constructor({ origin = 'http://localhost', truncate = true, settleOnRegister = false } = {}) {
    super();
    this.origin = origin;
    this.truncate = truncate;
    this.settleOnRegister = settleOnRegister;
    this._tools = new Map();      // name → { def, registered }
    this.stats = { registered: 0, revoked: 0, executed: 0, truncated: 0, rejected: 0 };
    this.lastResults = [];
  }

  registerTool(tool, options = {}) {
    if (!tool?.name || typeof tool.name !== 'string') {
      this.stats.rejected++;
      return Promise.reject(named('TypeError', 'a tool needs a name'));
    }
    if (!/^[A-Za-z0-9_.-]{1,128}$/.test(tool.name)) {
      this.stats.rejected++;
      return Promise.reject(named('TypeError', `invalid tool name "${tool.name}"`));
    }
    if (typeof tool.execute !== 'function') {
      this.stats.rejected++;
      return Promise.reject(named('TypeError', 'a tool needs an execute callback'));
    }
    if (this._tools.has(tool.name)) {
      this.stats.rejected++;
      return Promise.reject(named('InvalidStateError', `a tool named "${tool.name}" is already registered`));
    }

    const entry = { def: tool, reg: null };
    this._tools.set(tool.name, entry);
    this.stats.registered++;
    this._fire();

    // The registration promise stays pending for the life of the tool and
    // rejects with AbortError when the signal aborts — which is exactly how a
    // revoke ten minutes later becomes an unhandled rejection if nobody
    // attached a handler at mint time.
    const p = new Promise((resolve, reject) => {
      entry.settle = { resolve, reject };
      const sig = options.signal;
      if (sig) {
        if (sig.aborted) return this._abort(tool.name, reject);
        sig.addEventListener('abort', () => this._abort(tool.name, reject), { once: true });
      }
      if (!sig || this.settleOnRegister) resolve(undefined);
    });
    entry.reg = p;
    return p;
  }

  _abort(name, reject) {
    if (this._tools.has(name)) { this._tools.delete(name); this.stats.revoked++; this._fire(); }
    reject(named('AbortError', 'the registration was aborted'));
  }

  getTools(options = {}) {
    const origins = options.fromOrigins;
    if (origins && !origins.includes(this.origin)) return Promise.resolve([]);
    return Promise.resolve([...this._tools.values()].map((e) => new FakeRegisteredTool(e.def, this.origin)));
  }

  async executeTool(tool, input = {}, options = {}) {
    const entry = this._tools.get(tool?.name);
    if (!entry) throw named('NotFoundError', `no tool named "${tool?.name}"`);
    this.stats.executed++;
    const signal = options.signal || new AbortController().signal;
    const result = await entry.def.execute(input, { signal });
    // The browser stringifies. A throw in here is silent in production.
    let json;
    try { json = JSON.stringify(result); }
    catch (e) { throw named('DataCloneError', 'the result could not be serialised: ' + e.message); }
    if (json === undefined) throw named('DataCloneError', 'the result serialised to undefined');
    this.lastResults.push({ name: tool.name, length: json.length });
    if (this.truncate && json.length > RESULT_CAP) {
      this.stats.truncated++;
      return json.slice(0, RESULT_CAP);      // exactly as unhelpful as the real thing
    }
    return json;
  }

  // Convenience for tests: call by name and parse the wire format back.
  async call(name, input = {}, options = {}) {
    const tools = await this.getTools();
    const t = tools.find((x) => x.name === name);
    if (!t) throw new Error(`test called a tool that is not registered: ${name}`);
    const raw = await this.executeTool(t, input, options);
    try { return JSON.parse(raw); }
    catch { return { status: 'TRUNCATED', raw }; }
  }

  names() { return [...this._tools.keys()].sort(); }
  size() { return this._tools.size; }
  toolNamed(n) { return this._tools.get(n)?.def || null; }

  _fire() {
    this.dispatchEvent(new Event('toolchange'));
    if (typeof this.ontoolchange === 'function') { try { this.ontoolchange(); } catch {} }
  }
}

function named(name, message) {
  const e = new Error(message);
  e.name = name;
  return e;
}

// Install as `document.modelContext` on top of the headless DOM stubs.
export function installModelContext(opts) {
  const mc = new FakeModelContext(opts);
  if (typeof globalThis.document === 'object' && globalThis.document) {
    globalThis.document.modelContext = mc;
  }
  if (typeof globalThis.window === 'object' && globalThis.window) {
    globalThis.window.isSecureContext = true;
  }
  return mc;
}
