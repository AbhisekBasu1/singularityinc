# Player action observability

The live world should know what the founder *did*, without becoming a click
analytics feed. `wait_for_world` therefore carries semantic beats, while
`activity_log` is the persisted recovery path and `inspect_module` supplies the
state behind any beat.

| Surface | Immediate beats | Batched or ledger-only beats |
|---|---|---|
| Desk | exceptional prompts, code sinks, auto-ship, standing order, prompt approach, founder levels and burnout | manual code, ordinary prompts, user calls, ordinary posts, allocation drags, skill points |
| Product | each feature shipment, product creation, launch, pricing model, incidents | repeated price clicks |
| Agents | hire, release, model upgrade, tool install, lane assignment, breakthroughs, rogue acts and founder-visible level milestones | autonomy drags |
| Research | start, cancel, completion | queue edits |
| Market | acquisition, round signed, negotiated round, failed negotiation, walking from a term sheet, rival counter, competitor arrival/failure | none |
| World | megaproject start/completion, regional courtship/entry/completion, race beats and irreversible commitments | none |
| Story | card choices, own-words acceptance, Wire choices, doctrines, objectives and act transitions | none |
| Legacy | run ending | perk purchases are ledger-only |

Navigation, research branch filters, map focus, help, settings, audio and visual
preferences do not describe an in-fiction decision and do not wake the world.
Clock state is still visible in `briefing`, every heartbeat, and the Desk
snapshot, so a paused game is never mistaken for a broken connection.

Every immediate observation describes an effect that already landed. It never
authorizes the world to redo, amend or replace the founder's action. Routine
work waits for a short quiet beat and is grouped by semantic action. Important
observations are held in a persisted FIFO inbox, and the activity ledger keeps
the latest 48 entries across reloads.
