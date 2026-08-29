# The WebMCP Field Guide

> Everything two builds cost to learn, minus the builds.
>
> Portable by design: nothing below depends on HOLDTAG or TABLE. Drop this file
> into a new repo, read §8 to pick the shape, then §12 for what to copy in.
>
> **Sources.** §2 is the spec at `github.com/webmachinelearning/webmcp` HEAD as of
> 2026-08-25. §3 is empirical — every trap in it was hit, diagnosed and fixed in
> a working build. §4, §9 and §10 come from a competitive sweep of 1,063 public
> repos and three adversarial review panels. Where the spec-reading and the
> building disagreed, §11 says so and the building wins.
>
> **Snapshot date: 2026-08-29.** Re-verify §2 and §4 against the spec if you are
> reading this later; both moved twice in the fortnight before it was written.

---

## 1. The contest

| | |
|---|---|
| **Event** | The WebMCP Challenge (OpenAI) |
| **Deadline** | **Sept 3, 2026, 1:00 pm PDT** |
| **Winners announced** | ~Sept 23, 2026 |
| **Field** | 1,401+ registered participants |
| **Winners** | 10 |
| **Per winner** | $3,000 cash · Codex Micro · ChatGPT Pro (1 yr) · swag (≤3 members) · @OpenAIDevs spotlight |
| **Sponsor add-ons** | Cloudflare $10k credits · Vercel $300/mo + $50/mo gateway ×12 · Netlify $500 cash · Render $300 · Shopify $250 gear · Chrome 3mo AI Ultra |

### The four criteria, unweighted

1. **WebMCP Leverage** — thoroughness and skill of the implementation; genuine effort; non-trivial.
2. **Execution** — functional, runnable, a complete coherent product beyond a proof-of-concept.
3. **Potential Impact** — a credible, *specific* case for solving a real problem.
4. **Creativity & Ambition** — novel, differentiated.

Note what is **not** a criterion: business viability, technical difficulty, or how much code you
wrote. Time spent on a solver, a physics engine or a renderer earns points on axes nobody is grading.

### The judges, and what lands with each

| Judge | Owns | What lands | What kills you |
|---|---|---|---|
| **Alex Nahas** (created MCP-B; thanked by name in the spec README) | tool-design depth | dynamic registration driven by human action; `AbortController` teardown; honouring `options.signal` inside `execute`; `readOnlyHint` / `untrustedContentHint` actually used; `exposedTo` | shallow CRUD tools; anything a DOM-clicking agent already does |
| **Ilya Grigorik** (Shopify) | protocol design, web perf, agentic commerce | measured deltas against a DOM agent; **graceful handoff** — the agent hits its authority limit and escalates with structured context | a storefront. He built the real one |
| **Sarah Drasner** (Chrome) | DX, craft, "security, privacy and **user observability**" | a live panel showing which tool is firing, with what arguments and what came back, plus a visible kill switch; `SECURITY.md` | a booking demo — that is her own explainer |
| **Andrew Galloni** (Cloudflare) | edge, the agentic-internet thesis, token waste | Durable Objects for genuine shared multi-actor state; hard numbers | |
| **Jude Gao** (Vercel) | evals, agent reliability | an `evals/` directory with real cases and a pass-rate table; **`AGENTS.md` at repo root** — he wrote the post arguing for it | |
| **Sean Roberts** (Netlify) | recovery, time-to-completion, tokens | **a scripted failure**: the agent asks for something unavailable, gets a structured error with alternatives, and negotiates a different outcome. Ten seconds of graceful recovery beats sixty of happy path | |
| **Justin Rushing** (OpenAI) | it working in ChatGPT | the deep-link one-click path; the compatibility contract stated up front | |

### Submission checklist

- [ ] Live URL that works in **ChatGPT's in-app browser** *and* Chrome with WebMCP enabled
- [ ] Text description: why WebMCP fits · how it improves UX · what humans+agents can now do that was
      not feasible · how it is implemented
- [ ] **YouTube video, under 3:00**, clear audio
- [ ] Public repo with an **OSS licence detectable in the About section**
- [ ] Must use `document.modelContext.registerTool()`

### Hosting as signalling

Cloudflare Workers is the highest-signal single choice: Galloni authored Cloudflare's
agentic-internet thesis, the challenge starter is a Workers template, Durable Objects give real
shared multi-actor state, and it is the largest sponsor prize. Netlify is the only sponsor with
separate cash. Cheapest broad play: deploy on one and note provider-agnostic configs for two others.

---

## 2. The API — ground truth

Taken from `index.bs` at HEAD. Secondary sources on the web disagree with this in several places;
trust this, and re-check the spec before relying on any of it.

```webidl
partial interface Document {
  [SecureContext, SameObject] readonly attribute ModelContext modelContext;
};

[Exposed=Window, SecureContext]
interface ModelContext : EventTarget {
  Promise<undefined>                registerTool(ModelContextTool tool,
                                                 optional ModelContextRegisterToolOptions options = {});
  Promise<sequence<RegisteredTool>> getTools(optional ModelContextGetToolOptions options = {});
  Promise<DOMString>                executeTool(RegisteredTool tool,
                                                optional object inputObject = {},
                                                optional ModelContextExecuteToolOptions options = {});
  attribute EventHandler ontoolchange;
};

dictionary ModelContextTool {
  required DOMString           name;
  USVString                    title;        // display label for browser-native UI
  required DOMString           description;
  object                       inputSchema;  // JSON Schema
  required ToolExecuteCallback execute;
  ToolAnnotations              annotations;
};

dictionary ToolAnnotations {
  boolean readOnlyHint = false;
  boolean untrustedContentHint = false;
};

dictionary ToolExecuteCallbackOptions { required AbortSignal signal; };
callback ToolExecuteCallback = Promise<any> (object inputObject, ToolExecuteCallbackOptions options);

dictionary ModelContextRegisterToolOptions {
  sequence<USVString> exposedTo;   // origins this tool is visible to
  AbortSignal         signal;      // abort() === unregister
};
dictionary ModelContextGetToolOptions     { sequence<USVString> fromOrigins; };
dictionary ModelContextExecuteToolOptions { AbortSignal signal; };

dictionary RegisteredTool {
  required DOMString name;  DOMString title;  required DOMString description;
  object inputSchema;  required Window window;  required USVString origin;
  ToolAnnotations annotations;
};
```

### Facts the IDL does not tell you

- **`SecureContext`**: HTTPS or `localhost` only.
- `registerTool()` **rejects if a tool of that name already exists.**
- **There is no `unregisterTool()`.** You unregister by aborting the `AbortSignal` you passed in.
- `execute(args, { signal })` → `Promise<any>`. The spec's own examples return both
  `{content:[{type:'text',text}]}` and bare JSON; both are accepted.
- The `signal` in `ToolExecuteCallbackOptions` is **required** — the agent's stop button is wired to
  it. A long-running tool that ignores it is a broken tool.
- **`toolchange`** fires on `document.modelContext` whenever the tool set changes.
- Permissions Policy: `<iframe allow="tools">`. `Permissions-Policy: tools=()` disables it, and a
  denied registration rejects with `NotAllowedError`. **Absence of a header is not `tools=()`** — the
  default allowlist is already `self`.
- `provideContext()` is **gone**. Anything telling you to call it is stale. So is
  `navigator.modelContext` (deprecated in Chrome 150 in favour of `document.modelContext`) and the
  original `window.agent`. Feature-detect defensively.

### The half of the API nobody uses

`getTools()` / `executeTool()` / `exposedTo` / `fromOrigins` exist so a page can **host its own agent**
and **compose tools across origins** through `allow="tools"` iframes. Registration is the half
everyone ships; consumption is the half that wins criterion 1.

```js
const tools = await document.modelContext.getTools({
  fromOrigins: ['https://partner-a.example', 'https://partner-b.example'],
});
const result = await document.modelContext.executeTool(tools[0], { /* args */ }, { signal });
```

Two ports on localhost are two origins for both Permissions Policy and `exposedTo`, so this can be
genuinely cross-origin in development rather than mocked.

### The declarative API

Forms compile straight to tools — a second, cheap axis of thoroughness:

```html
<form toolname="search-cars" tooldescription="Perform a car make/model search" toolautosubmit>
  <input name="make"  toolparamdescription="The vehicle's make (e.g. BMW, Ford)" required>
  <input name="model" toolparamdescription="The vehicle's model (e.g. 330i, F-150)" required>
  <button type="submit">Search</button>
</form>
```

`SubmitEvent#respondWith()` returns a result to the agent without navigating. **Omitting
`toolautosubmit`** makes the browser focus the submit button and hand control back to the human — a
built-in, spec-native approval gate, and free evidence that you read the implementation.

### Not in the spec — i.e. free territory

Each of these is an open issue. A userland library that solves one *on top of* WebMCP is a
standards-advancing contribution:

| Gap | Issue |
|---|---|
| `outputSchema` | #9 |
| Elicitation — a tool asking the user a question | #165, #50 |
| Tool progress reporting for long tasks | — |
| Streaming / transferable tool I/O | #82 |
| Multimodal binary in/out | #41, #86, #81 |
| "Skills" — grouping tools into a journey | #161 |
| Cross-document tool response after navigation | #135 |
| Native schema validation | #92 |
| Cross-origin tool composition | #74 |
| Service Worker tool discovery | `docs/service-workers.md` |

### The spec's explicit non-goals — read these as judging guidance

> - Headless browsing scenarios
> - **Fully autonomous workflows** — "not intended for fully autonomous agents operating without human oversight"
> - Replacement of backend integrations
> - **Replacement of human interfaces** — "the human web interface remains primary"

A submission where the agent does everything while the human watches is arguing *against* the spec's
stated purpose. The human must stay in the driver's seat, visibly.

---

## 3. The traps

Every one of these was hit in a real build. They are ordered by how much time each costs.

### Registration lifecycle

| Trap | What actually happens | What to do |
|---|---|---|
| Duplicate name | `registerTool()` **rejects with `InvalidStateError`**. React StrictMode, HMR and SPA route changes all trigger it | pre-check the name and abort the prior registration first; always `await` |
| Unregistering | **there is no `unregisterTool()`** | teardown is the `AbortSignal` on the registration options |
| Aborting | **also rejects the original `registerTool()` promise** | attach the handler before anything else, or a revoke ten minutes later is an unhandled rejection at the worst moment |
| A rejected `execute` | the spec **discards the reason**; the agent gets a bare `UnknownError` | never reject. Resolve failures as `{ status, reason, who, when, next }`, and make `next` something it can act on |
| The return value | the browser `JSON.stringify`s it; a throw in there is **silent** | no Maps, Sets, BigInt, DOM nodes or circular refs. Check serialisability before returning |
| Re-registering the same name | races calls already in flight | supersession tokens: a stale handle resolves, never throws |
| Concurrency | agents invoke tools **concurrently**, and yours mutate shared state | a promise-chain mutex around execution |
| Registering before the API exists | nothing happens, and no error | check script order |

**Order of operations is not negotiable: revoke, then mint.** A tool being replaced under the same
name must stop existing before its replacement is offered.

### The output budget — the one everybody gets wrong

Chrome truncates a tool result at roughly **1,500 characters**, and the cap applies to
**`JSON.stringify` of the whole payload** — every structured field, every key name, and every `\n`
escaped to a two-character `\\n`. Not to your prose.

Measured on a real surface, that envelope ran **130–290 characters per tool**. A text budgeted to
1,400 shipped at 1,556 and was cut mid-sentence, and the model then re-planned against unterminated
JSON. Budget the serialised object, per tool, and take any overshoot back out of the prose.

### Tool names go through a safety review

ChatGPT runs a pre-execution safety review and fires a confirmation modal on consequential verbs —
`open_*`, `delete_*`, `send_*`, `purchase_*`, permission changes. That stalls a filmed chain
mid-take. Name the tool after what the call actually does: `step_7_TIE88` rather than `open_TIE88`,
`dm_strike` rather than `dm_attack` if the modal appears. **Test this on day 0 with a throwaway tool.**

Names are 1–128 characters, ASCII alphanumeric plus `_ - .`. No spaces, no slashes, no unicode.

### Platform conditions, in the order they bite

1. **Secure context.** `document.modelContext` needs `https` or `localhost`. **A LAN IP is not a
   secure context** — `http://192.168.x.x:8787` from a second machine silently has no API at all.
   This costs an hour the first time. From another machine, SSH-forward the ports
   (`ssh -L 8787:localhost:8787 …`) so the browser still sees `localhost`, which also keeps origins
   byte-identical to whatever `exposedTo` is configured with.
2. **Origin-trial tokens are per-origin and do not cover subdomains.** Three origins means three
   registrations. Ship both the `<meta http-equiv="origin-trial">` tag *and* the `Origin-Trial`
   response header; some CDNs strip one or the other.
3. **Your asset router may answer before your worker does.** On Cloudflare Workers Assets without
   `run_worker_first`, `/` is served by the asset router and your header middleware never runs. The
   meta tag is what actually carries the trial; the header is decoration unless you configure for it.
4. **`Origin-Agent-Cluster: ?0` makes the API vanish outright.** So does any use of `document.domain`.
   Pin `?1`.
5. **An unsubstituted `%VITE_X%` placeholder is not a configured value.** Vite leaves the literal in
   place when a variable is unset, and a percent sign is not an origin or a token. Treat any value
   containing `%` as absent, everywhere.

### Things that are not WebMCP but will still cost you a day

- **`display: <anything>` in a class beats the `hidden` attribute.** The UA stylesheet's
  `[hidden] { display: none }` sits at the bottom of the cascade. An overlay styled `display: grid`
  and marked `hidden` is not hidden — and if it is `position: fixed; inset: 0` with a dark
  background, **your entire application disappears behind it** while every element in the DOM remains
  present and correct. Every DOM assertion passes. Add `.thing[hidden] { display: none }` for each,
  and test for it.
- **A canvas can size its own parent.** PixiJS with `autoDensity` writes an inline pixel width onto
  the canvas; an inline style beats a stylesheet, so `width: 100%` stops applying the moment the
  renderer initialises. An in-flow canvas 800px wide makes its container 800px wide, which makes the
  next measurement 800px — the layout can never shrink below its first frame. Put the canvas
  `position: absolute; inset: 0` so it cannot argue back.
- **happy-dom has no WebGL and no layout.** The entire visual half of a canvas app is invisible to
  the test suite. Get a real browser into the loop on day 1 (§7.4).

---

## 4. Platform reality — what runs, where

This is the section that decides whether a judge sees a working demo or a blank page.

### ChatGPT ("Site tools" is OpenAI's name for its WebMCP implementation)

- **Site tools exist in exactly ONE client: the built-in browser of the ChatGPT *desktop app*.** Not
  chatgpt.com. Not the Chrome/Edge extension. Not Codex CLI. Not the Codex IDE extension. Not ChatGPT
  Work's cloud browser. A judge who opens your URL in an ordinary tab sees zero tools.
- **GPT-5.6 Luna has WebMCP disabled.** A judge on the "Faster" preset sees nothing.
- Enterprise and Edu workspaces are **excluded entirely**.
- Site tools shipped in the **Aug 24–28, 2026 release week**. Some judges will be on an older build.
- The agent invokes tools **concurrently**.
- **The chat input floats over the bottom centre of the built-in browser**, roughly 720×120. Anything
  your page puts there is underneath it and unreachable. Treat the bottom centre as a keep-out zone
  and put your furniture in the corners.
- **That pane is narrow and often zoomed.** It is not a 1080p desktop. Design the narrow layout
  first; it is the only browser where your project has a real agent. Nothing may ever be clipped — a
  control the user cannot see is a control they do not have.
- OpenAI's own build log for a reference app records fixing *"empty tool input schemas on the
  deployed site."* Minifiers mangle schema objects. **Verify the deployed artifact in the popover
  after a hard reload**, not the dev server.

### The deep link — the highest-leverage single trick

```
codex://threads/new?prompt=<urlencoded>&browserUrl=<your url>
https://chatgpt.com/codex/deeplink?url=…        # https variant
```

Opens the desktop app on a new thread with **your prompt already typed** and the built-in browser
already on your page. Put it on the landing page, at the top of the README, and at the top of the
Devpost description. Keep the prompt short and let a `briefing` tool carry the rules — a deep link
should not have to hold your whole ruleset in a query string.

### Chrome

- Chrome stable is **152**, inside the 149–156 origin-trial window. Register the trial and ship the
  token and the site works in a judge's ordinary Chrome **with no flag at all**.
- Fallback flag: `chrome://flags/#enable-webmcp-testing`, visible from Chrome 146.0.7672.0+.
- **Stock Chrome ships no consumer agent.** Nothing in Chrome will call your tools on its own. If a
  video claims "an agent using my site in Chrome", that agent is the Tool Inspector extension or an
  in-page one. This is why an in-page agent is not a garnish — it is the only guaranteed Chrome path.
- No headless. Any browser automation must run headed.

### Browser status

| Browser | Status |
|---|---|
| Chrome 149+ | Origin Trial live · `chromestatus/5117755740913664` |
| Edge 150 | Origin Trial live |
| Brave | experimental, via Leo |
| Firefox | standards-position open (`mozilla/standards-positions#1412`) |
| Safari | standards-position open (`WebKit/standards-positions#670`) |

TypeScript defs: `npm i webmcp-types`. A third-party package **also called "webmcp"**
(`@jason.today/webmcp`) is unrelated to `document.modelContext`; several popular blog guides describe
*that one*. Do not copy its architecture and do not cite it.

### The compatibility contract

Put this verbatim in the first ten seconds of the video, the first three lines of the Devpost
description, and the top of the README:

> **ChatGPT desktop app, built-in browser, GPT-5.6 Sol or Terra.** Luna has WebMCP disabled. Site
> tools do not exist in the ChatGPT web app, the browser extension or Codex CLI. Enterprise and Edu
> workspaces are excluded. **Or Chrome 149+** — the deployed origins carry an origin-trial token, so
> no flag is needed.

---

## 5. Deployment, in the order that works

There is a **chicken-and-egg** here that costs an hour if you meet it cold: an origin-trial token is
issued for a specific origin, so you cannot register one until the origin exists.

1. **Deploy first, on day 0**, even if the app is a skeleton. Note the hostnames.
2. **Register the origin trial once per origin** at <https://developer.chrome.com/origintrials>.
3. Wire the tokens into `.env` and the deploy config, and point the origins at each other.
4. **Rebuild and redeploy** — the meta tag is baked at build time, so redeploying without a rebuild
   changes nothing.
5. `run_worker_first` (or a `_headers` file) for the document routes, or your policy headers reach
   nothing.

Then, before filming:

- DevTools → Application → Frames → Origin Trials shows the trial **enabled** on every origin
- a Chrome profile with the flag **off** still registers tools — that is what proves the token path
- the popover shows your tools with titles and schemas **after a hard reload**
- the deep link opens the desktop app on your page

---

## 6. What actually wins criterion 1

Ranked by signal per hour, from what the panels and the judges' own writing say:

1. **Tools that are minted and revoked by human action**, and a tool count that visibly changes on
   camera. This is the single most WebMCP-native thing a product can do.
2. **Honouring `options.signal` inside `execute`** so the agent's stop button really cancels. Almost
   nobody does this and it is the clearest single signal of spec depth.
3. **`exposedTo` + `getTools({ fromOrigins })` + `allow="tools"`** — the unused half. Make it a real
   second origin, not an import.
4. **Both APIs** — imperative for the surface, declarative for the one or two places a human hand is
   structurally required. Omit `toolautosubmit`.
5. **`readOnlyHint` on every read tool; `untrustedContentHint` on anything carrying user-typed text.**
6. **`title` on every tool.** Nobody sets it, including OpenAI's own reference apps.
7. **A `description` on every schema property**, saying where the value comes from. Most entrants
   ship bare `{ type: "string" }`.
8. **Structured refusals** with `{ status, reason, who, when, next }`.

### The tool surface as the thing the human edits

Since `provideContext()` was removed, tool **descriptions** are the only per-call state channel, and
the agent **re-reads them on every single call**. That makes the description string a live, writable
channel between page and model. A product where authoring and revoking what the agent can do is the
primary human interaction — with the popover's count ticking as the human works — was called by the
review panels *"the most WebMCP-native product shape that exists, and it is unoccupied."*

The general form, which is eleven lines and is the whole argument:

```ts
// state in, tools out — and revoke BEFORE you mint
export async function reconcile(host, next) {
  const want = new Set(desiredTools(next));      // a pure function of state
  const have = new Set(registry.list());
  const revoked = [...have].filter((n) => !want.has(n));
  const minted  = [...want].filter((n) => !have.has(n));
  if (revoked.length) registry.revokeAll(revoked, { reason, who, at });
  for (const name of minted) await registry.mint(toolDef(name, host));
  return { minted, revoked, count: registry.count() };
}
```

---

## 7. The judged artifacts

Four things a judge scores whether or not you meant them to.

### 7.1 The popover copy

ChatGPT renders `name`, `title`, `description` and the **raw JSON Schema** verbatim to a human in the
address bar. Keep descriptions under 500 characters, give every tool an **opening clause disjoint
from every other tool's** (a model reads the first clause and stops), and describe every property.

**Write them in the user's vocabulary, not yours.** This is the highest-value hour in the project and
§7.2 is how you find out you got it wrong.

### 7.2 An eval that measures tool selection

An offline, no-API-key scorer over ~30–40 things a user would actually say, none of which names a
tool. It is not a simulation of the model and must not claim to be. What it proves is the necessary
condition underneath: **that no two tools are lexically indistinguishable for the words people use,
and that the intended tool is reachable from every phrase.**

Gates worth failing the build on: no two tool documents near-duplicate (cosine over IDF-weighted
terms, threshold 0.60); the intended tool ranks top-5 for every prompt; no prompt matches nothing; no
prompt names a tool; every tool is exercised. Report top-1 and median rank; assert on neither.

**It pays for itself on the first run.** In the last build it scored **35% top-1 with eleven prompts
that could not reach their tool at all**, because eight descriptions were written in the builder's
vocabulary: the inventory tool said *"a potion drunk"* where a player says *"I drink the red one"*;
the check tool never mentioned traps, locks or prayer. Rewriting them took it to **63% top-1, median
rank 1** — and helps a real model for exactly the same reason.

### 7.3 A measurement against a DOM agent

One honest chart satisfies Grigorik, Galloni and Roberts at once, and it is the strongest available
evidence for criterion 3. The method that survives scrutiny:

- **Steelman the other side.** Charge the DOM agent *one* read of the page's visible-text projection
  — not the raw `innerHTML`, which is three to four times larger, and not one read per fact — and
  credit it with every fact the page contains.
- **Make every claim falsifiable in the same run.** Each fact carries two regexes: one that would
  have to appear in the serialised page for "unreachable" to be a lie, and one that must appear in
  the tool's shipped payload for "obtained" to be true. Fail the build if a claim and its probe
  disagree.
- **Report the finding you actually get.** In a visual app the DOM agent reads *fewer* characters,
  because there is almost no text on the page — so the finding is **reach, not size**. Say that. A
  table that concedes what the other side wins is worth more than one that does not.

This method caught its own author lying twice: facts asserted as canvas-only turned out to be sitting
in a `<select>`, because **a form control is an accessible, machine-readable dump of your domain
model** and nobody thinks of it that way.

### 7.4 Seeing the thing

happy-dom has no WebGL and no layout, so a canvas app's entire visual half is outside the test suite.
That gap is not theoretical: a full-screen overlay covered an entire application from first paint,
every DOM assertion passed, and it took a person opening the page to find it — twice.

Put a real browser in the loop on day 1. A ~150-line script that drives Playwright at the dev server,
screenshots **three viewports** (wide, the ChatGPT pane at ~760×1000, and narrower still), and
reports:

- anything `position: fixed` and full-screen that is still visible — the page-eater check
- anything whose bounding box exceeds the window — the clipping check
- anything inside the bottom-centre keep-out box — the ChatGPT-chat-box check
- canvas size, entry counts, live tool count, and any console error

---

## 8. Choosing what to build

### The field

From a sweep of 1,063 public repos, the crowded shapes:

| Bucket | Est. | Why it is dead |
|---|---|---|
| Storefront / cart / checkout | 150–200 | Cloudflare's official starter is this; Shopify ships 11 native tools; **Grigorik built the real one and is judging** |
| Booking / reservation / calendar | 120–150 | **Drasner's own explainer demo is this** |
| "Agent proposes / human approves / audit trail / permission kernel" | 200–250 | 18% of repos, all of whom think it is their differentiator |
| SDK / framework / bridge / starter | 200–250 | **a library does not demo in three minutes** |
| Auditor / linter / "Lighthouse for WebMCP" | 80–120 | Chrome ships the Tool Inspector, an Evals CLI and a polyfill |
| Form-fillers / intake wizards | ~100 | the declarative API *is* form annotation — reads as "I did the tutorial" |
| CRUD-with-tools (todo, notes, kanban, recipes) | ~150 | the official example set is five flavours of this |
| Co-op asymmetric-info games | 50–70 | Netlify shipped one as an official example |
| Dashboards | ~60 | |

Also burned: every GoogleChromeLabs demo shape (restaurant, pizza builder, flight search, hotel,
movie tickets, smart home, maze), all five Netlify starters, and all ten OpenAI first-party reference
apps. Judges have seen them.

**Two structural facts worth more than any feature.** OpenAI wants ten *different* winners, not ten
of the best shape — category emptiness beats category quality. And roughly half the field created
their repo in the last week of August, so **the field will ship thin and execution is the cheapest
place to separate.**

### The unclaimed positions

Three independent panels reviewing twenty strong ideas converged on the same holes, and all twenty
ideas missed all of them:

1. **Two humans.** Zero hits for crdt / yjs / automerge / multiplayer across 1,063 repos, in a
   challenge whose language is *"humans and agents"*, plural.
2. **Two agents** on one page with **asymmetric tool visibility** — a resident specialist registered
   with `exposedTo`, discovered by the visiting agent through `getTools({ fromOrigins })`.
3. **Consuming `getTools()` / `executeTool()` as the product.** Everyone registers; almost nobody
   calls.
4. **The tool surface as the artifact the human edits** (§6).
5. **Accessibility.** The spec's own Goal #3, and five weak hits across 1,063 repos.
6. **The popover as a design surface** (§7.1).

### Two failure modes that kill good ideas

**The solver-invoker trap.** If the money tool is `solve_X(objective, constraints)`, the model's
entire contribution is marshalling English into a parameter struct and pressing go. The objection at
submission #200 writes itself: *"a dropdown and two sliders do that."* **Escape:** a heterogeneous
chain of five or six calls per beat where each call depends on a **measurement returned by the last**,
plus a surface that changes shape while the human works.

**The domain tax — and this one is worse, because it is invisible while you build.** A previous
project was scrapped a week before the deadline, with 187 passing tests, three real origins and a
choreographed demo already working, because **its own author could not say what it was.** Distribution-grid switching is a domain almost nobody
has worked in, and every minute a viewer spends learning what a feeder is, is a minute not spent
understanding the argument. Three things to take from it:

- **Legibility is a build gate, not a polish pass.** Test it the way you test tool selection: show the
  screen to someone for sixty seconds and ask what it does. If they cannot say, the build is red.
  That test was never run, and it was the only one that mattered.
- **Visual language sets the category before a word is read.** A dark map with counters ticking up
  means "strategy game" to almost everyone, whatever your thesis is.
- **Pick the domain for the audience, not for the argument's elegance.** A domain everyone already
  carries in their head is worth more than one that fits perfectly.

The replacement project's rule: **the metaphor and the mechanism must be the same object.** What the
viewer sees should be literally what the code does.

---

## 9. The scoring playbook

Concrete moves that cost hours, not days.

**WebMCP Leverage** — §6, all eight items.

**Execution**
- [ ] Origin-trial token deployed **day 0** so stock Chrome works flagless
- [ ] A first-run **capability banner** that self-diagnoses in under three seconds —
      NATIVE / LEGACY / UNAVAILABLE — with exact remediation in the failure case, and a statement
      that the product still works without an agent
- [ ] An **in-page agent** driving the real `getTools()` / `executeTool()` round trip. Label it
      honestly if it is scripted. This turns Chrome's biggest structural weakness into the demo's
      strongest thirty seconds, and it is the fallback when everything else fails on the day
- [ ] The `codex://` deep link as the primary call to action
- [ ] Seeded data, no signup, and **something on screen before an agent arrives** — an app that opens
      empty because it is waiting for a DM looks broken
- [ ] A mutex around tool execution
- [ ] The output budget written on **day 1**, not day 5
- [ ] `evals/` with a pass-rate table in the README; headline the number in the video
- [ ] `AGENTS.md`, `SECURITY.md`, `llms.txt`, MIT/Apache-2.0 `LICENSE` at repo root
- [ ] Pass Chrome M150's Lighthouse Agentic Browsing audit and screenshot it

**Potential Impact**
- [ ] The DOM-agent measurement (§7.3)
- [ ] Ship the reusable pattern as an MIT library — solving one of the spec's open issues in userland
      is the highest-scoring thing available here

**Creativity & Ambition**
- [ ] An empty category (§8)
- [ ] A thesis about what the agentic web should be, not just an app

**Budget reality.** Tool-selection reliability is **one to two full days**, not the half-day everyone
plans. The panels' blunt verdict:

> *The likely actual winner has zero novel algorithms and spends all its days on tool descriptions,
> structured error payloads, an eval suite, and six takes of the video.*

---

## 10. The video

Hard limit 3:00.

- **First ten seconds: the compatibility contract**, then the one sentence.
- **The filmed prompt must be indirect.** Naming your own tools on camera proves nothing.
- **Show the popover with the tool list visibly mutating** as the human works. Open it *before* the
  change and leave it open across it, so the count moves in one continuous shot rather than a cut.
- **Include the scripted failure and recovery.** The agent asks for something it cannot have, gets a
  structured refusal with something to do next, and negotiates.
- **Include a beat where the human overrides or redirects the agent mid-action.**
- **The money shot must be legible with the sound off, to someone who knows nothing about the
  domain.** If it is not, the domain is wrong or the framing is (§8).

And rehearse it as a test. A choreography test that drives the exact filmed sequence through the real
reducers, the real registry and the real tools means the shot list cannot rot between writing it and
filming it.

---

## 11. Where reading the spec and building it disagreed

Kept because being wrong in a specific way is more useful than being vaguely right.

| Belief from the spec and docs | What building it showed |
|---|---|
| "Chrome's output budget is ~1.5K chars" | The cap is on `JSON.stringify` of the **whole payload**. The envelope alone ran 130–290 characters per tool. Budgeting the prose alone ships a truncated result |
| "A LAN IP will not be a secure context" | True, and it fails **silently** — the API is simply `undefined`, with no error anywhere. Costs an hour if you meet it cold from a second machine |
| Policy headers on the worker will protect the documents | Not if the asset router answers first. Without `run_worker_first` the middleware never runs for `/` |
| Chrome's security docs cite `ModelContextClient.requestUserInteraction()` | **Removed by PR #205, merged 2026-06-11.** The Chrome doc is stale; there is no elicitation primitive today |
| An in-page agent is a nice fallback | It is the *only* guaranteed Chrome path, and the only thing that still works when the desktop app misbehaves on the day |
| Tool descriptions are documentation | They are a **judged artifact and a live channel to the model**, re-read on every call, and the single highest-leverage hour in the project |

---

## 12. What to copy in, and in what order

From this repo, in dependency order. Line counts are real; everything here is domain-free or noted.

| Bring | Lines | What it is |
|---|---|---|
| `src/core/webmcp.d.ts` | ~60 | ambient types for `document.modelContext` |
| `src/core/registry.ts` | 458 | **the spine.** `mint` / `revoke` / `revokeAll` / `has` / `list` / `count` / `onChange` / `discover` / `invoke` / `callByName`, with every trap in §3 handled. Zero domain coupling |
| `src/core/budget.ts` | 148 | priority-ordered output budgeting. `render(sections, ceiling)`, `clamp`, `window_`, `coalesce` |
| `src/table/payload.ts` | 145 | `pack()` (weighs the **serialised** payload), `refuse` / `badInput` / `crashed` / `cancelled`, and `jsonSchema()` from zod. Rename the module; the logic is generic |
| `src/table/surface.ts` | 50 | state → tools, revoke-before-mint. The whole argument, in eleven lines |
| `tests/fake-model-context.ts` | 113 | a `ModelContext` that reproduces the platform's sharp edges headlessly |
| `evals/select.ts` | 154 | the offline tool-selection scorer and its gates |
| `evals/baseline.ts` | 352 | the DOM comparison and the falsifiable-probe method. Replace the fact table |
| `scripts/shot.mjs` | 161 | the real-browser check (§7.4). Change the routes |
| `scripts/preflight.mjs` | 91 | cold-machine check before filming |
| `src/worker/table-room.ts` | 210 | Durable Object with WebSocket hibernation: shared multi-actor state, one room per session. Rename |
| `src/worker/index.ts` | 176 | origin-trial and policy headers, `/health`, `run_worker_first` routing |
| `docs/DEPLOY.md` | — | the chicken-and-egg, in order |

**Do not bring** anything under `src/rules/`, `src/world/`, `src/ui/map/` or `src/table/copy.ts` —
that is the game. And do not bring `src/table/tools.ts` wholesale; read it for the shape of a tool
definition and the executor wrapper (abort → parse → try → resolve, never reject), then write your own.

### Day zero, in order

1. Scaffold, deploy both origins, **register the origin trials.**
2. Open the skeleton in the ChatGPT desktop app and register one throwaway tool with your most
   consequential-sounding verb. Confirm no confirmation modal. Rename now if there is one.
3. Copy in the table above. Write `pack()` into your first tool before you write your second.
4. Wire `npm run shot` and look at the page.
5. Write the one sentence that says what the product is. Show it to somebody. If they cannot repeat
   it back, change the product, not the sentence.

---

## 13. Five days

Written on 2026-08-29, with the deadline on 2026-09-03 at 1:00 pm PDT. Adjust the dates; keep the
shape, and keep the order — the risky, unclaimed things go early, and the things that score nothing
on their own go last or not at all.

| Day | Do | Do not |
|---|---|---|
| **0** — Sat 29 | §12's day-zero list. Deploy, register both trials, prove `dm_attack`-style naming in the real app, copy the spine in, get `npm run shot` running. Write the one sentence and test it on a person | start on the domain model |
| **1** — Sun 30 | The whole tool surface, headless, against real reducers. Pure logic, no UI. `pack()` on every return from the first one. Tests as you go | build a renderer |
| **2** — Mon 31 | The UI, narrow layout first (§4). The capability banner, the deep link, the tool-count panel. Play it end to end in the ChatGPT desktop app | polish |
| **3** — Tue 1 | The unclaimed positions you chose (§8) — the second origin, the second human, whichever. These are worth more than anything else left and they must not be last. Then the eval set, and rewrite every description it exposes | add features |
| **4** — Wed 2 | Freeze. The DOM baseline, the README, `AGENTS.md`, `SECURITY.md`. Rehearse the take against a choreography test, film, cut, upload. Devpost text | fix anything that is not broken |
| **5** — Thu 3, am | Submit before 1:00 pm PDT. Tag the release | |

Three rules that hold on every one of those days:

1. **Anything that is not WebMCP is a cost, not an asset.** Criterion 1 measures the WebMCP
   implementation, not your simulator, your renderer or your solver.
2. **The unclaimed positions go before the polish**, because the polish is what you cut on the last
   day and they are not.
3. **If you cannot say what it is in one sentence, stop and fix that first.** Everything else is
   downstream of it, including the video, the README and the first ten seconds a judge gives you.
