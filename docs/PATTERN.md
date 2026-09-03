# The portable part

Four files in `src/webmcp/` are the part of this worth taking somewhere else.
They import nothing outside that directory — `tools/webmcptest.mjs` fails the
build if that stops being true — and they know nothing about this game.

| file | lines | what it is |
|---|---|---|
| `detect.js` | 46 | `capability()` and the `codex://` deep link. Three answers — NATIVE, LEGACY, UNAVAILABLE — and the exact remedy for the last one. |
| `results.js` | 83 | The result shapes. `ok` · `refused` · `badInput` · `cancelled` · `crashed` · `needsHuman`, each with `status` first and `next` on every non-ok path. |
| `pack.js` | 142 | The output budget, measured on the **serialised** payload, and a serialisability walk that throws on a Map, a Set, a BigInt, a cycle or a non-finite number. |
| `registry.js` | 372 | `mint` · `revoke` · `revokeAll` · `muteAll` · `discover` · `invoke`, a promise-chain mutex, a generation counter, minimal input parsing, and a call log. |

```js
import * as R from './webmcp/registry.js';
import { capability } from './webmcp/detect.js';
import { ok, refused } from './webmcp/results.js';

const cap = capability();
if (cap.tier !== 'none') {
  R.setEmitter((evt, payload) => myBus.emit(evt, payload));   // optional
  R.init(cap.mc, { setBusy: (b) => { myClock.held = b; } });  // optional
  await R.mint({
    name: 'do_the_thing',
    title: 'Do the thing',
    description: 'What it does, in the words the user would use.',
    inputSchema: { type: 'object', required: ['n'],
      properties: { n: { type: 'number', description: 'How many.' } } },
    annotations: { readOnlyHint: false },
    execute: async ({ n }, { signal }) => {
      if (n > 10) return refused([{ rule: 'cap', fix: 'ten at a time', limit: 10, got: n }]);
      return ok({ did: n });
    },
  });
}
```

## What it handles that you would otherwise find out the hard way

- **`registerTool` rejects on a duplicate name.** `mint` revokes an existing
  registration of that name first — revoke, *then* mint, never the other way.
- **There is no `unregisterTool`.** Teardown is aborting the signal passed at
  registration, and doing that also rejects the original registration promise —
  so a revoke ten minutes later is an unhandled rejection at the worst moment
  unless a handler was attached at mint time. `mint` attaches one first.
- **Do not `await` the registration promise.** Implementations disagree about
  whether it resolves on success or stays pending until the signal aborts, and
  awaiting the second kind hangs for ever. `mint` races it against a macrotask,
  which is long enough for a duplicate-name rejection to land.
- **Treat descriptor snapshots as scarce.** The desktop bridge currently
  disables a document after more than 10 distinct registration snapshots (and
  also caps the surface at 100 tools / 65,536 serialised descriptor bytes).
  Publish a stable superset in one batch and enforce changing authority inside
  `execute`; do not revoke and re-mint around selections, submissions or turns.
- **A rejected `execute` has its reason discarded** — the caller gets a bare
  `UnknownError`. Nothing here ever rejects; the wrapper is abort → parse → try →
  resolve, and a crash comes back as a structured `{status:'error'}`.
- **The result is `JSON.stringify`'d and truncated at ~1,500 characters**, and
  that cap is on the whole serialised payload — every key name, every escaped
  newline — not on your prose. `pack()` measures after every cut rather than
  predicting, because the gap between a string's length and its serialised
  weight is how you ship 1,508 under a 1,500 cap.
- **A throw inside that stringify is silent.** `assertSerialisable` walks the
  object first: a Map serialises to `{}` and arrives empty, which is the kind of
  wrong answer that is very hard to see from the other side.
- **Tools are called concurrently** and they usually mutate something shared.
  Every mutating call goes through one promise-chain mutex, and the checks that
  matter are re-run *inside* it: a call that queued behind another may arrive in
  a world that no longer exists, which is what the generation counter is for.
- **`Origin-Agent-Cluster: ?0` makes the API vanish**, and so does
  `document.domain`. A LAN address is not a secure context and fails silently.
  `capability()` says which of those it is.

## What it does not do

It is not a framework and it does not want to be. There is no schema library
(`parseInput` handles the subset these schemas use, because native validation is
still spec issue #92), no transport, no state management, and no opinion about
your UI. `surface.js` in the same directory — one stable capability index with
live validation at execution — is where the actual idea lives; it is not
portable because the interesting half of it is what *your* state means.

MIT, like the rest of this.
