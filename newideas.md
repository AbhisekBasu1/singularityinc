# New ideas

What to build to make this the greatest game of its kind, deadline forgotten.
Written 2026-09-02, after the workstation, the Record and the pacing pass.
A direction, not a backlog: `potentialfeatures.md` is the backlog.

**Status, the morning after (2026-09-03).** All nine were built overnight, in
this order, uncommitted. Each idea below ends with a *Built* paragraph: what
shipped, where it lives, and what was deliberately left. The suites that guard
it are in `package.json`'s `test` script — five new ones — and every one passes,
along with the three evals and the balance gate.

## The organising idea

Right now the world is a dealer. It writes cards, voices lines and turns the
market, but every exchange is one round and then it deals again. The greatest
version of this game makes the world a **cast** and an **opponent**, and keeps
every new verb inside the seventeen effect keys, because the derived ceilings
are what make this a game rather than AI Dungeon.

The sim already has enough systems. What it lacks is people and an adversary.

Each idea below is in the order it should be built. The order is by how much of
the game it transforms per unit of work, and by what it composes from: the
first four are mostly assembled out of things that already exist.

## 1. The phone

**What.** Anyone the founder has met can be called, at any time, in the
founder's own words. Sam, Crane, Vance, Dorne, the senator, your mother. A
call is a thread with rounds: you say what you want, they answer in character
from a dossier of what they want and what they remember you said, and a
deal's terms land through the same keys, the same caps and the same Accept.
The world can call you too. A phone ringing at two in the morning is a card
with a face on it.

**Why.** This is the feature that makes the world a place with people in it.
The cards a run remembers are the ones with a face; the phone makes every face
reachable rather than waiting to be dealt.

**Build on.** Three things that exist. Own-words answers
(`answer_in_own_words` in `src/webmcp/tools.js`), which are already a
proposal the founder must accept. Character affinity, which
`src/systems/narrative.js` moves and `src/systems/record.js` reads. Wire
threads (`src/data/threads.js`, `src/systems/feed.js`), which are already
one-click replies judged by the same `effectProblems` a card gets. A call is
a thread that lasts more than one round. `src/data/characters.js` grows a
dossier: what each person wants, what they know, what they remember. A
Contacts app in the workstation; a Calls panel in the console.

**Open.** Without an assistant the phone falls back to authored dialogue
trees, which means writing them. How many rounds before the caps apply to the
whole call rather than to each round. Whether a call costs focus.

**Built.** `src/systems/calls.js` and the trees in `src/data/calls.js`,
eleven of them, one per contact. A call is a modal with rounds that blocks the
clock, costs focus, and ends through the same Accept a card gets. With an
assistant on the line it is played live: `take_the_call` answers in character,
`ring_the_founder` is the world calling, and `validateCallReply` holds every
reply to half a card's ceilings and the whole call to one. Without one the
written trees play. Contacts is the app; every face in the Story view has a
key; a greyed key says what it needs.

*Deepened, 2026-09-03.* The trees remember: what you said is counted across
calls, a `once` topic is said once, repeats are written as repeats, and the
pickup names the last call. Thirty-eight topics only appear because of
something that just happened — an outage, a round, a departure, a rival's
move, a Sunday, a number on the Life panel — and go first. Fifteen written
rings: the people call you, about the thing that happened, and their own
answers come first. A phone chapter in the walkthrough. Left: nothing planned.

## 2. The rival plays the same game

**What.** Aperture Systems already has its own origin and its own tools. Give
it its own state on the same reducers: a product, a research tree, a roster,
a cash position. The assistant plays it, or a second assistant plays it with
asymmetric tool visibility through `exposedTo`, or a person does. Its moves
become visible and answerable, its website updates from its real state, and
the prompt injection is a move it chooses to make.

**Why.** The race stops being a converging number and becomes moves and
counter-moves, which is what the six-hundred-day stretch from Act III onward
needs most. The AGI race is losable now; it should be *contested*.

**Build on.** `rival/rival.js` and `src/webmcp/partners.js` are the second
origin and its discovery. `src/systems/nemesis.js` already has
`availableMoves`, `availableCounters` and `counter` — a move and counter
system with nobody on the other end of it. `rival_move` in
`src/webmcp/tools.js` is the world's hand on it. `src/ui/worldmap.js` is
where a contested race could be seen.

**Open.** Whether the rival runs on the full reducer set or a reduced one.
How much of its state is public and how the founder learns the rest.

**Built.** `src/systems/rivalco.js` over `src/data/rivalco.js`. Aperture has
funding, a roster, users and research on the real tree, plays one of eight
moves a week by a written policy, or by `rival_move`, or by a person. Its
research feeds the race through a bounded multiplier; measured over seven bot
runs the race did not move, which is the right amount. Its own site renders the
company it actually is.

*Deepened, 2026-09-03.* Every play has five or six lines instead of one or
two, and the site never prints a line it printed in the last six weeks; a
person in the chair can now be on another machine (see 7). Left: a second
assistant with asymmetric tools through `exposedTo` — the origin is ready for
it and nothing calls for it yet.

## 3. The desktop is the founder's computer

**What.** The workstation stops being a window manager around views and
becomes the diegetic world. **Mail**, where investors, regulators and your
mother write to you, while the Wire stays public. A **Browser** window that
literally loads the rival's second origin. A **Terminal** where you talk to
ARIA and your agents. A **Calendar** the clock walks through, with Sunday
calls, hearings and launch days on it. A **Journal** you write in, so the Log
becomes something you author. Every app is a lore surface and every
notification is the world reaching you.

**Why.** Sitting at the founder's computer at three in the morning is the
feeling the whole game is about. The Record was the first step of this and it
is the right direction: an app that is fiction, not chrome.

**Build on.** `src/ui/os/apps.js` and the Record (`src/ui/os/record.js` over
`src/systems/record.js`) are the shape of an app that is generated from
state. `src/ui/os/notify.js` is the notification centre. ARIA already answers
(`askAria` in `src/systems/aria.js`). The rival's page is already served on a
second port by `tools/serve.js`.

**Open.** What the terminal's idiom is. Whether Mail replaces some Wire posts
or duplicates them.

**Built.** Six apps under `src/ui/os/`: Contacts, Mail (twenty-two letters in
`src/data/mail.js`, one a day, unread badge on the dock), Browser (the rival's
origin, loaded for real, with the chair's numbers), Journal (the one thing the
founder writes, kept in the save and read back by the Record), Calendar (a
month grid the clock walks) and Terminal (ARIA and the agents at a prompt,
from `src/data/terminal.js`). Each has a readout, a menu, a right-click and an
empty line.

*Deepened, 2026-09-03.* Thirty-three more letters that arrive because of the
week — the customer after the outage, the fund after the round, the vendor's
decommissioning notice for the agent you let go, the recruiter Aperture sent
to your whole team — and the post delivers an urgent one ahead of anything
waiting. A workstation-only chapter walks the seven apps. Left: mail does not
replace Wire posts; it is a second channel.

## 4. The world remembers, and the deck grows

**What.** Legacy carries the founder's history across timelines and the
assistant gets none of it. Put a dossier on the founder into the briefing: how
you won last time, who you betrayed, what you always do. The rival remembers.
The mother remembers. New Game Plus becomes a world that plays *you*.

Alongside it, a **Keep** button on any card the world wrote saves it into your
deck, face and effects intact, to play in future runs with no assistant at
all. The written deck grows every time someone plays.

**Why.** Free with a mind on the other side and impossible in any written
deck. And no other game has the flywheel: the game writes itself as it is
played.

**Build on.** `src/data/legacy.js` (`computeLegacyGain`) and the legacy log
for what persists. The `briefing` tool for where the dossier rides. Kept cards
go through `validateCard` in `src/world/validate.js` and land under the same
`WORLD_AUTHOR` caps, so a kept card can never do more than a written one.

**Open.** Where kept cards live (the save, or an export). Whether a kept card
can be shared between players, which is a deck format.

**Built.** `src/systems/keep.js`. "Keep this card" on a world card's outcome
and a keep key on the Story timeline; kept cards are dealt by the written deck
in later timelines, marked *kept*, under the same ceilings, and can be exported
and imported as text from the Legacy screen. Prestige writes a dossier the
briefing hands to the assistant as `pastTimelines`, and ARIA reads it too.
Four cards in `src/data/events14.js` pay the dossier off in play — Vance,
your mother and Kai remember the last timeline, and ARIA has read it. Left: a
shared deck format between players.

## 5. The person

**What.** The thesis is what a one-person company does to the person, and
today that lives in the best cards rather than in a system. A **Life**
surface: relationships that decay unless you spend focus on them, sleep and
health as the floor under everything, the room you are in. Mechanical and
unpreachy, with real payoffs, so that the Sunday call and Sam's list are
decisions rather than scenery.

**Why.** This is where the game's heart already is. The mother's Sunday call,
the burnout wall and the agents' disagreement are the cards the pacing pass
found were the ones a run remembers. Give it a panel.

**Build on.** `src/systems/founder.js` and the `FOUNDER` block in
`src/data/balance.js` (focus, study hours, the direct-day floor). The
escalating cards in `src/data/events13.js` and the mother's call are the
threads a Life surface would make legible.

**Open.** How not to make it a chore meter. The payoffs have to be specific:
the call resets something, the list unlocks something.

**Built.** `src/systems/life.js` and the Life panel on the Desk: sleep and
health as a floor under focus and burnout, ties that cool with a half-life and
warm on contact, and a specific payoff per warm tie, so the Sunday call and
Sam's list are decisions rather than scenery. Glossary entries for Sleep,
Health and Warmth. Left: the room you are in.

## 6. A director for the deck

**What.** The pacing work in the four late event files was done by hand with a
pooled log of three runs. Build the instrument in: tension per act, faces
against institutions, days since a release, milestones due. Let it steer the
draw, and hand the assistant a beat sheet in every briefing, so it becomes a
co-director rather than a dealer.

**Why.** Every run gets an arc instead of a distribution.

**Build on.** `eligibleEvents` and `drawEvent` in `src/systems/narrative.js`,
`EVENTS.FATIGUE` and the relax ladder. The pooled-run instrument described
under *Pacing, measured* in `CLAUDE.md` is the measurement the director would
run live.

**Built.** `src/systems/director.js`: `measure` reads the last eight journal
entries, `steer` multiplies a card's weight in `drawEvent`, and `beatSheet` is
the same reading in words, in every briefing and in the context every world
card is written against. `once` and `when` are never touched. Left: nothing.

## 7. Two humans

**What.** The unclaimed position. **Rival mode**, where the opponent in idea 2
is a person on another device. Or **board mode**, where a second player holds
a different projection of the same company and a few grave powers: approve or
refuse the round, force the pivot, remove the founder. Each with their own
assistant.

**Why.** It is the largest single thing that would move this from great to
unprecedented. Zero hits across a thousand repos for any multiplayer
primitive, in a challenge whose language is plural.

**Build on.** Nothing in the repo; this is the one that needs shared state and
a server. A Durable Object with one room per run is the shape.

**Open.** Everything about latency, turn order and what happens when one
player is away. Last rather than first for that reason.

**Built, smaller than proposed.** Rival mode, on one machine: `rival/?play=1`
is Vance's chair, with the eight plays and a line to post as him. It talks to
the framed press office over a BroadcastChannel on the rival's origin, which
relays to the game by `postMessage`; the game accepts only that origin and only
that frame, runs a play through `humanPlay` and a line through the injection
scan. No server, and the frame mounts even without site tools so this works in
stock Chrome.

*Two machines, 2026-09-03.* `tools/relay.js` gives the dev server a room per
run — server-sent events out, a JSON POST in, no dependencies — and the chair
joins it from any machine that reaches the address. The Market view prints
the invite link and the Terminal answers `invite`. Proven across two browser
profiles, which a BroadcastChannel cannot cross. Left: board mode entirely,
and a relay on the static host, which would need a server it does not have.

## 8. The long game, as a mode

**What.** A run that lives in your week: one in-game month per real day, the
world playing while you are away, a decision waiting each morning, the phone
ringing.

**Why.** The premise wants a company you live with, and a daily ritual is the
one turn a page can rely on a person to start. The assistant cannot begin a
chat turn; a person opening the machine each morning can.

**Build on.** Offline catch-up already exists and saturates at
`TIME.MAX_OFFLINE_DAYS`. The notification centre. `wait_for_world` is already
the world staying on duty.

**Open.** Whether it is a setting or a separate run shape. What a month a day
does to the act floors.

**Built, as a pace.** `settings.pace` is chosen in the opening and in
Settings. In the long game a dozen live days a real day are yours, then the
machine says the month is played and offers to keep going tonight; away, the
company plays a month a day, capped, and the mail that arrived is waiting. The
morning brief knows which pace it is. Left: nothing planned.

## 9. The chronicle

**What.** At the end, and at any moment, the company's history as long-form
prose in the game's voice, built from the Record, with the epilogues and what
people said. Exportable. The Legacy screen becomes a shelf of timelines, and
losing gets a biography too.

**Why.** A lost run with a good story should be worth keeping, and nothing
today lets anyone show a run to anyone.

**Build on.** `src/systems/record.js` already reads the whole history as pure
functions of state. `src/data/epilogues.js` is the most quotable thing in the
game and `src/ui/ending.js` is where it is shown. The share card in
`potentialfeatures.md` is the small version of this.

**Built.** `src/systems/chronicle.js` is a pure function of state to chapters,
in the voice of `src/data/chronicle.js`. It prints on the ending screen, on
demand from the Legacy screen, copies as text, and a lost run gets one. Legacy
keeps a shelf of the last six.

*Deepened, 2026-09-03.* Three ways to say each kind of entry, three closers
per temperament, three openers per act, rotated by the day so two chapters
never read the same. Left: a rendered share card.

## Deliberately not doing

More research nodes, more modules, more cards of the kind already in the deck,
spoken voices, or a mobile layout. Each adds width to a game whose remaining
distance is depth of relationship.
