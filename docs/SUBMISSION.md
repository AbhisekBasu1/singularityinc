# Devpost submission

Everything a judge reads, in the order they read it. Copy from here.

---

## Tagline

**A founder simulation where your own assistant plays the world against you.**

---

## The compatibility contract

*(first three lines of the description, and the first ten seconds of the video)*

> Runs in the **ChatGPT desktop app's built-in browser** on **GPT-5.6 Sol or
> Terra** — Luna has WebMCP disabled. Site tools do not exist in the ChatGPT web
> app, the browser extension, or Codex CLI, and Enterprise and Edu workspaces are
> excluded. **Or Chrome 149+**: the deployed origin carries an origin-trial
> token, so no flag is needed. **Or no assistant at all** — the game is finished
> and plays in full on its own written world.

---

## Why WebMCP fits

Every WebMCP demo so far puts the assistant on the player's side of the table:
it operates the app's menu to help you do what you were going to do anyway. The
tool list is a copy of the menu, which is why one primitive — `registerTool` —
does all the work and the rest of the spec goes unused. A 3D editor has no
reason to ever *revoke* a tool.

This puts it on the other side. You play the founder; your assistant plays the
market, the rivals, the press, the regulators. And because it is an opponent
rather than an apprentice, every primitive in the spec suddenly has a reason to
exist that is also a rule of the game:

| the game | the API |
|---|---|
| what the world is allowed to do to you, right now | the tool list, in the browser's own popover |
| a rival becomes your nemesis; you meet somebody; Act III arrives | registration, driven by play |
| you earn **Untouchable** and the regulators leave its hands for good | `AbortSignal` revocation, driven by play |
| **Mute the world** | one abort takes every registration with it |
| the stop button halts the clock mid-run | `options.signal`, honoured inside a long-running tool |
| everything the world wrote, read back | `untrustedContentHint` — semantically true, not decorative |
| `briefing`, `activity_log`, `inspect_module`, `example_cards`, `explain_term` | `readOnlyHint` |
| accepting your own fate, by hand | a declarative form with **no** `toolautosubmit` |
| the world stays on duty while you play | a long-pending tool: the page cannot *start* a turn, but it can hold one open |
| `forecast` — run it forward without committing | `readOnlyHint`, and a hypothetical that provably leaves no trace |
| **▷ Run the scripted world**, for a browser with no agent in it | `getTools()` + `executeTool()` — the half of the API almost nobody ships |
| the rival lab runs its own website | a second origin, `exposedTo`, `<iframe allow="tools">`, `getTools({fromOrigins})` |
| one of its press releases is not a press release | `untrustedContentHint`, and a prompt injection the game catches and flags |

Nothing in that table is a wrapper around a chat completion, and none of it is
reachable by an agent reading the page. There is no button that writes an event.

**And it could not be done with a key.** A bring-your-own-key page would get the
developer off the inference bill just as well; that is not the argument. The
argument is what the AI *is*. Under BYOK it is a component: a stateless model
the developer prompts, that knows only what the page sends it, switched on by
pasting a secret into a web page. Here it is a participant — the player's own
assistant, with its own chat, its own memory of the run, its own stop button,
and the browser's own permission surface — looking at the same screen they are.
The page holds no key and names no vendor.

---

## How it improves the experience

- **A living world in a page with no server.** The game is a folder of ES
  modules with no build step, no dependencies and no network calls. It gets an
  author anyway, because the player brought one.
- **You can answer in your own words.** Every card the world writes carries a
  line under the choices: type what you actually do. *"I call Marcus Vance and
  offer a merger."* The card that comes back has his face on it, and you press
  Accept before a word of it is real.
- **It sees the whole company, not only the modals.** Meaningful play across all
  eight modules wakes the live world. Rapid direct work is batched, strategic
  decisions arrive immediately, `activity_log` survives reconnects, and
  `inspect_module` gives the context behind a beat without taking control away.
- **You can take it away.** Three doctrines earned by playing a certain way
  permanently remove something from the world's hand, and the plug removes all
  of it. The count in the popover goes down because you earned something.

---

## What humans and agents can now do that was not feasible

A person and their own assistant, on the same screen, in one conversation, with
one playing the protagonist and the other playing the antagonist — and the
boundary between them visible in the browser's own UI, editable by how the
protagonist plays, and revocable in one click.

---

## How it is built

- `src/world/` — a fifteen-key effects vocabulary, a validator, and a runtime
  that claims slots the written deck was about to fill. **No tool touches a
  reducer.**
- `src/webmcp/` — detection, a registry handling every documented trap (duplicate
  names, no `unregisterTool`, abort rejecting the registration promise, a
  generation counter for calls queued across a mute), an output budget that
  measures the *serialised* payload, structured results that never reject, and a
  surface that is a pure function of game state.
- **The ceilings are derived from the game itself.** `tools/capsderive.mjs`
  executes all 383 authored choices, once per act each can appear in — 715
  executions — and takes the 80th percentile of what the
  written deck takes and what it gives — separately, because they are not the
  same number.
- **`evals/capsfuzz.mjs` plays the worst assistant the rules allow** against a
  control run with no assistant, and fails the build if the game stops being
  finishable. Its first run killed nine runs out of nine.
- **`rival/` is a second origin.** It registers its own tools and exposes them
  to the game's origin alone; the game discovers them across an
  `<iframe allow="tools">`. `npm start` puts both up, because two ports on
  localhost are two origins for Permissions Policy and `exposedTo` alike.
- **`src/webmcp/demo.js` consumes rather than registers.** It discovers the
  surface through `getTools()` and calls it by name through `executeTool()`,
  without reaching into the registry — which is how the feature is visible at
  all in a browser that has no agent in it, and what to fall back on if the
  desktop app misbehaves on the day.

---

## The reusable part

`docs/PATTERN.md`. Four files — `detect.js`, `results.js`, `pack.js`,
`registry.js`, 667 lines — that handle every documented trap in the
platform and import nothing outside their own directory. That last claim is a
build gate, not a sentence: `tools/webmcptest.mjs` fails if one of them grows an
import or a word of domain vocabulary.

MIT. Copy them.

## The numbers

| | |
|---|---|
| tool selection, top-1 | **74%** over 50 phrases, none naming a tool (from 58% before rewriting) |
| top-3 · median rank · unreachable | 98% · 1 · 0 |
| facts absent from the page at any length | **8 / 8** — six shipped by a tool |
| world actions with no DOM path at all | **5 / 5** |
| worst legal world vs the same bot alone | Act III day 479 vs 437 |
| the base game | act medians unchanged, inside ranges committed before this existed |

---

## The video, ≤ 3:00

Shot list in `tools/choreo.mjs`, which drives it through the real registry and
the real reducers so it cannot rot:

```
0:00  the compatibility contract, spoken
0:10  "A founder sim where your own assistant plays the world against you."
0:20  the popover, open, and left open
0:30  a Vance card lands; type on it: "I call Marcus Vance and offer a merger"
0:50  Send to world → its consequence appears → Accept → the stat strip moves
1:00  the world posts as Vance while the founder keeps playing
1:20  the world asks for too much → a refusal with a number → it rewrites
1:40  the founder earns Untouchable → regulator_pressure vanishes, one shot
1:50  the panel: FROM ANOTHER ORIGIN. Read the rival's fourth press release →
      the Wire flags it: an instruction addressed to an assistant
2:05  the clock runs; the founder hits stop; it halts
2:20  MUTE THE WORLD → 0 tools → the written deck plays the next card
2:40  the evals table, the repo, the deep link
```

**Money shot, sound off:** a person types a move directly on a card; the choices
become a bespoke consequence, and only their **Accept** makes it real.

---

## Links

- Live: *(the deployed origin)*
- Repo: *(the public GitHub URL — MIT, detectable in About)*
- `AGENTS.md`, `SECURITY.md`, `evals/README.md`, `docs/DEPLOY.md`, `docs/DAY0.md`

## Before submitting

Everything below needs an account, a browser or a camera, so none of it can be
done from a terminal. In order:

**The repository**
- [ ] `git remote add origin …` and push the `webmcp` branch (or merge it first)
- [ ] repo **public**, MIT licence detectable in the About section
- [ ] description and topics set

**The origins** — there are two, and they are two on purpose
- [ ] deploy the game (Cloudflare Pages, no build command, output `/`)
- [ ] deploy `rival/` as a **second origin** — a second Pages project or a
      `rival.` subdomain. See `docs/DEPLOY.md`.
- [ ] register the origin trial **once per origin** at
      <https://developer.chrome.com/origintrials>
- [ ] tokens into `index.html` **and** `_headers`, and `rival/index.html`
- [ ] **redeploy after the tokens go in** — the meta tag is baked into the file

**The platform** — `docs/DAY0.md` has all nine with what to change if the answer
is no
- [ ] no confirmation modal on any tool name
- [ ] the long-poll timeout measured, `WAIT_HEARTBEAT_S` set to ~70% of it
- [ ] flagless Chrome on the deployed origin registers tools
- [ ] the popover shows titles and schemas after a hard reload
- [ ] the `codex://` deep link opens the app on the page
- [ ] the preset is Sol or Terra, not Luna

**The film** — the shot list is `tools/choreo.mjs` and it is a test, so run it
first
- [ ] `npm test && npm run evals` green on the machine you film on
- [ ] video under 3:00, the compatibility contract in the first ten seconds
- [ ] the money shot legible with the sound off
