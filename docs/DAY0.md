# Day-zero platform checks

Eleven checks to confirm on the real platform before trusting anything, each with
what to do if the answer is no. Run them against the **deployed** origin in the
**ChatGPT desktop app's built-in browser**, not the dev server, and not the web
app — site tools exist in exactly one client.

Record the answers here as you go. Some of them change constants in the code.

| # | Check | Expect | If not |
|---|---|---|---|
| 1 | **Tool names.** Ask the assistant to call `write_event`, `rival_move`, `regulator_pressure`, `market_weather`, `answer_in_own_words`. | No confirmation modal on any of them. | ChatGPT runs a pre-execution safety review and fires a modal on consequential verbs. Rename the offender — `compose_card`, `rival_line`, `heat_up`, `market_weather`, `reply_in_own_words` — in `src/webmcp/tools.js`, and re-run `evals/select.mjs`. |
| 2 | **The long poll.** Call `wait_for_world` and leave it. | It stays pending, then returns on the heartbeat. | Measure the client's own tool timeout and keep `WORLD_AUTHOR.WAIT_HEARTBEAT_S` comfortably below it. It is 15s by default. |
| 3 | **Re-calling.** After every `wait_for_world` result—and immediately after `answer_in_own_words` returns `needs_human`—does the assistant call it again before ending the turn? | Yes. Accept/Decline and the next decision arrive without a reconnect line. | Check `HIRE_PROMPT`, the tool result's `next`, and `AGENTS.md`; all three explicitly require the persistent loop. Turn-based (`advance_time`) remains the fallback only when the founder ends live play. |
| 4 | **Typing while a tool is pending.** Type a move into the open card while `wait_for_world` is pending, then repeat between assistant turns. | A pending wait receives the exact move immediately; between turns the card holds it safely and the next wait receives it. | Verify the persisted founder submission, its `submission_id`, and the reconnect-copy fallback. The founder should never need the chat composer for a card response. |
| 4a | **Actions outside cards.** With `wait_for_world` pending, ship two features, change a prompt approach, start research, and drag an allocation slider. | Strategic actions and each shipment arrive immediately and in order; rapid slider/direct-work input arrives once as a semantic batch. | Check `activity_log` after a hard reload, then call `inspect_module` for every tab. The assistant should recover exact names and current state without reading the DOM or asking the player. |
| 5 | **Concurrency.** Ask for two things at once. | Both calls arrive; one wins, the other is refused with a reason. | The mutex is already there; check the refusal reads sensibly. |
| 6 | **The popover, after a hard reload.** | Names, titles, descriptions and schemas all render. No empty schemas. | OpenAI's own build log records fixing empty input schemas on a deployed site. There is no minifier here, so this should be clean — but check the artifact, not the dev server. |
| 7 | **The own-words proposal.** Submit a move from the card, call `answer_in_own_words` with its `submission_id`, and inspect the result. | The authored choices become a proposed consequence with an explicit **Accept** button; no effects land before the founder presses it. | Check that stale or cancelled submission IDs are refused and that the exact founder text survives save/reload. |
| 8 | **The model.** Confirm the preset is **Sol** or **Terra**. | Tools are visible. | **Luna has WebMCP disabled.** A judge on the faster preset sees nothing. This belongs in the first ten seconds of the video. |
| 9 | **Flagless Chrome.** Open the deployed origin in Chrome 149+ with `chrome://flags/#enable-webmcp-testing` **off**. | Tools register anyway. | The origin-trial token is not being served. See `docs/DEPLOY.md` — it is almost always the meta tag missing from a rebuild. |
| 10 | **Annotations.** Every tool now publishes explicit hints (`readOnlyHint`, `idempotentHint`, `openWorldHint`; `destructiveHint: false` on `aria_says` and `answer_in_own_words`). Call `write_event` and `advance_time` once each. | No new confirmation modal, and the popover shows the hints. | The hints only state what the defaults already implied (`destructiveHint` defaults to true), so a modal here means the platform keys its review on explicit hints — drop the `annotations` on the offender in `src/webmcp/tools.js` and note which one. |

## Results

_Fill in on the day._

| # | Date | Result | Action taken |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |
| 4 | | | |
| 5 | | | |
| 6 | | | |
| 7 | | | |
| 8 | | | |
| 9 | | | |
