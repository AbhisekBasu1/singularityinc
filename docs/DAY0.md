# Day-zero platform checks

Nine things to confirm on the real platform before trusting anything, each with
what to do if the answer is no. Run them against the **deployed** origin in the
**ChatGPT desktop app's built-in browser**, not the dev server, and not the web
app — site tools exist in exactly one client.

Record the answers here as you go. Some of them change constants in the code.

| # | Check | Expect | If not |
|---|---|---|---|
| 1 | **Tool names.** Ask the assistant to call `write_event`, `rival_move`, `regulator_pressure`, `market_weather`, `answer_in_own_words`. | No confirmation modal on any of them. | ChatGPT runs a pre-execution safety review and fires a modal on consequential verbs. Rename the offender — `compose_card`, `rival_line`, `heat_up`, `market_weather`, `reply_in_own_words` — in `src/webmcp/tools.js`, and re-run `evals/select.mjs`. |
| 2 | **The long poll.** Call `wait_for_world` and leave it. | It stays pending, then returns on the heartbeat. | Measure the client's own tool timeout and set `WORLD_AUTHOR.WAIT_HEARTBEAT_S` to about 70% of it. It is 60s by default. |
| 3 | **Re-calling.** After a `wait_for_world` result, does the assistant call it again under a standing instruction? | Yes — that is what keeps the world on duty. | Live mode becomes "call it again when I say so". Turn-based (`advance_time`) stays the default either way. |
| 4 | **Typing while a tool is pending.** Try to send a message while `wait_for_world` is open. | Input is disabled until it resolves or you press stop. | Say so in the README: press stop to talk. The heartbeat exists to keep that window short. |
| 5 | **Concurrency.** Ask for two things at once. | Both calls arrive; one wins, the other is refused with a reason. | The mutex is already there; check the refusal reads sensibly. |
| 6 | **The popover, after a hard reload.** | Names, titles, descriptions and schemas all render. No empty schemas. | OpenAI's own build log records fixing empty input schemas on a deployed site. There is no minifier here, so this should be clean — but check the artifact, not the dev server. |
| 7 | **The declarative form.** Answer a card in your own words and look at the Accept button. | The form is listed as a tool; calling it focuses the button and hands control back. | If the declarative API is unsupported it is still an ordinary form and an ordinary button. Nothing breaks. |
| 8 | **The model.** Confirm the preset is **Sol** or **Terra**. | Tools are visible. | **Luna has WebMCP disabled.** A judge on the faster preset sees nothing. This belongs in the first ten seconds of the video. |
| 9 | **Flagless Chrome.** Open the deployed origin in Chrome 149+ with `chrome://flags/#enable-webmcp-testing` **off**. | Tools register anyway. | The origin-trial token is not being served. See `docs/DEPLOY.md` — it is almost always the meta tag missing from a rebuild. |

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
