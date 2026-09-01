// ─────────────────────────────────────────────────────────────────────────────
// THE FAKE MODELCONTEXT, FOR A REAL BROWSER
//
// The headless twin of this lives in tools/fakemodelcontext.mjs and runs inside
// node. This one is a string, because it has to be installed as an init script
// before any module of the page evaluates — which is the only way the app takes
// the same path it takes in the ChatGPT desktop browser.
//
// tools/liveworld.mjs asserts against it; tools/film.mjs films through it.
// ─────────────────────────────────────────────────────────────────────────────
export const INJECT = `
(() => {
  // A ModelContext that spans frames, because that is the part being tested.
  //
  // The browser shares registrations between a page and an <iframe allow="tools">
  // on another origin; page JavaScript cannot, because window.top is opaque
  // across origins. So the child announces what it registers to the parent over
  // postMessage, and the parent proxies executions back the same way. The shape
  // an application sees — getTools({fromOrigins}) returning another origin's
  // tools, executeTool calling them — is the real one.
  const isTop = (() => { try { return window.top === window; } catch { return false; } })();
  const local = new Map();     // registered by THIS frame
  const remote = new Map();    // announced by a child frame
  const log = [];
  let callSeq = 0;
  const pending = new Map();

  function post(target, msg) { try { target.postMessage({ __mcp: true, ...msg }, '*'); } catch {} }

  window.addEventListener('message', async (e) => {
    const m = e.data;
    if (!m || m.__mcp !== true) return;
    if (m.kind === 'announce' && isTop) {
      for (const t of m.tools) remote.set(t.name, { ...t, __origin: m.origin, __source: e.source });
      mc.dispatchEvent(new Event('toolchange'));
    } else if (m.kind === 'invoke' && local.has(m.name)) {
      let out;
      try { out = await local.get(m.name).execute(m.input || {}, { signal: new AbortController().signal }); }
      catch (err) { out = { status: 'error', message: String(err && err.message) }; }
      post(e.source, { kind: 'result', id: m.id, json: JSON.stringify(out) });
    } else if (m.kind === 'result' && pending.has(m.id)) {
      pending.get(m.id)(m.json); pending.delete(m.id);
    }
  });

  class MC extends EventTarget {
    registerTool(tool, options = {}) {
      if (local.has(tool.name)) return Promise.reject(Object.assign(new Error('dup'), { name: 'InvalidStateError' }));
      local.set(tool.name, tool);
      this.dispatchEvent(new Event('toolchange'));
      // Tell the embedder what this origin publishes, and to whom.
      if (!isTop) {
        post(window.parent, { kind: 'announce', origin: location.origin,
          tools: [{ name: tool.name, title: tool.title, description: tool.description,
                    inputSchema: tool.inputSchema, annotations: tool.annotations || {},
                    exposedTo: options.exposedTo || null }] });
      }
      return new Promise((resolve, reject) => {
        const sig = options.signal;
        if (sig) {
          if (sig.aborted) { local.delete(tool.name); return reject(Object.assign(new Error('abort'), { name: 'AbortError' })); }
          sig.addEventListener('abort', () => {
            local.delete(tool.name);
            this.dispatchEvent(new Event('toolchange'));
            reject(Object.assign(new Error('abort'), { name: 'AbortError' }));
          }, { once: true });
        } else resolve();
      });
    }
    getTools(options = {}) {
      const from = options.fromOrigins;
      const mine = [...local.values()].map((t) => ({ ...t, origin: location.origin }));
      // Another origin's tools are visible only if it exposed them to us.
      const theirs = [...remote.values()]
        .filter((t) => !t.exposedTo || t.exposedTo.includes(location.origin))
        .map((t) => ({ ...t, origin: t.__origin }));
      const all = mine.concat(theirs);
      return Promise.resolve(from ? all.filter((t) => from.includes(t.origin)) : all);
    }
    async executeTool(tool, input = {}, options = {}) {
      const name = tool && tool.name ? tool.name : tool;
      if (local.has(name)) {
        const r = await local.get(name).execute(input, { signal: options.signal || new AbortController().signal });
        const json = JSON.stringify(r);
        log.push({ name, length: json.length });
        return json;
      }
      const far = remote.get(name);
      if (!far) throw new Error('no such tool: ' + name);
      const id = ++callSeq;
      const json = await new Promise((resolve, reject) => {
        pending.set(id, resolve);
        post(far.__source, { kind: 'invoke', id, name, input });
        setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error('timeout')); } }, 4000);
      });
      log.push({ name, length: json.length, origin: far.__origin });
      return json;
    }
  }
  const mc = new MC();
  Object.defineProperty(document, 'modelContext', { value: mc, configurable: true });
  window.__mcp = {
    names: () => [...local.keys()].sort(),
    remote: () => [...remote.keys()].sort(),
    count: () => local.size,
    log: () => log.slice(),
    call: async (name, input, ms) => {
      const ac = new AbortController();
      if (ms != null) setTimeout(() => ac.abort(), ms);
      const raw = await mc.executeTool({ name }, input, { signal: ac.signal });
      try { return JSON.parse(raw); } catch { return { status: 'UNPARSEABLE', raw }; }
    },
    schema: (name) => local.get(name)?.inputSchema,
    title: (name) => local.get(name)?.title,
    description: (name) => local.get(name)?.description,
  };
})();
`;
