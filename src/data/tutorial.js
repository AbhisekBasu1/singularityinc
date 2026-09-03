// ─────────────────────────────────────────────────────────────────────────────
// THE TUTORIAL — chapters of anchored lessons that teach the console itself.
//
// Chapter one runs at the start of a first run and covers The Desk end to end.
// Every later chapter is just-in-time: it fires the first time the module it
// teaches becomes relevant, so nobody is taught fundraising in the garage.
//
// A step is data. The runtime in `src/ui/tutorial.js` reads it and never the
// other way around.
//
//   anchor   CSS selector to spotlight. Omit for a centred card.
//   view     force this module before the step shows.
//   place    preferred side of the anchor: top | bottom | left | right.
//   advance  how the step is satisfied:
//              { next }                 the player clicks the button
//              { act, v }               the player performs that data-act
//              { view }                 the player navigates to that module
//              { pred }                 a predicate on S goes true
//   cta      label for the advance button.
//   hold     true keeps the clock held for this step (default: the chapter's).
// ─────────────────────────────────────────────────────────────────────────────

import { maxAgents } from '../systems/agents.js';
import { apertureAlive, apertureState } from '../systems/rivalco.js';

const metPeople = (S) => Object.entries(S.narrative?.relationships || {}).filter(([id, r]) => id !== 'aria' && r?.met).length;

export const CHAPTERS = [
  // ── One ───────────────────────────────────────────────────────────────────
  {
    id: 'first_light',
    name: 'First Light',
    sub: 'the desk, end to end',
    hold: true,                        // the clock waits while you read
    when: () => true,                  // the desk never stops being the desk
    auto: (S) => S.company.act === 1 && S.meta.firstRun && S.time.day < 3,
    // Ten steps and three things to do — write, ship, set your hours — because
    // sixteen cards of reading taught the console and not the game. The Wire
    // and the status line moved to their own chapter, which fires the first
    // time the Wire has something in it: a lesson about a rail is worth
    // nothing while the rail is empty, which on a first run it always was.
    steps: [
      { id: 'welcome',
        title: 'This is the console',
        body: `You are one person with a laptop and a model that will write whatever you describe.\n\nEverything you will ever do happens on the eight modules down the left. This walkthrough covers the first one, and you will do three things in it: write, ship, and set your hours.\n\nSkip whenever you like — **?** reopens it, with the manual for every term in the game. **The clock is held until you are done.**`,
        os: { title: 'This is the machine',
          body: `You are one person with a laptop and a model that will write whatever you describe.\n\nEverything you will ever do happens in the eight apps in the dock. This walkthrough covers the first one, and you will do three things in it: write, ship, and set your hours.\n\nSkip whenever you like — **?** reopens it, with the manual for every term in the game. **The clock is held until you are done.**` },
        cta: 'Begin' },

      { id: 'readouts', anchor: '.stat-strip', place: 'bottom',
        title: 'What the world can measure',
        body: `Cash, runway, revenue, users, valuation. These are the only numbers anyone outside the company ever sees.\n\n**Runway** is the one that kills you: how many days of cash are left at the current burn. Hover any readout for the detail behind it.` },

      { id: 'hands', view: 'desk', anchor: '[data-tut="actions"]', place: 'right',
        title: 'Your hands',
        body: `The bar across the top is **Focus** — your budget for the day, refilled every morning by how you sleep. Under it, four things you can do yourself.\n\n**Q** writes a line by hand: slow, clean, no debt. **W** has the machine write it: ten times the output, for money and a little tech debt. That trade is the whole company.\n\nPress **W** — or **Q**.`,
        advance: { act: 'do' } },

      { id: 'ship', view: 'desk', anchor: '[data-tut="build"]', place: 'right',
        title: 'Code becomes a feature',
        body: `Code piles up here until there is enough for a feature. Features are what users actually get, and each one costs more than the last.\n\nPress **W** until the bar fills, then **S** — or the button — to ship it.`,
        advance: { act: 'ship' } },

      { id: 'rest', view: 'desk', anchor: '[data-tut="alloc"]', place: 'right',
        title: 'The other sixteen hours',
        body: `Clicking is the small part. This is what you are doing the rest of every day without being asked, and it dwarfs your clicking.\n\nDrag **Rest** up to 20%. Burnout is real — it takes a week off you when it fills — and the sleep you keep sets the Focus you wake with.`,
        advance: { pred: (S) => (S.founder?.allocation?.rest || 0) >= 0.2 } },

      { id: 'objectives', view: 'desk', anchor: '[data-tut="objectives"]', place: 'bottom',
        title: 'When in doubt, read Next',
        body: `Three things the game wants from you right now. They advance the act, and the act is the story.\n\nClick one to be taken to the module that satisfies it.` },

      { id: 'clock', anchor: '.time-block', place: 'bottom',
        title: 'Time is the real resource',
        body: `Days pass on their own. **1× to 5×** sets how fast, **Space** pauses, and **−** and **=** step between them. **▸❚** — or **N** — runs to the next thing that needs you and holds there.\n\nThe clock always stops for a decision, so nothing important happens while you are reading. It is stopped right now.` },

      { id: 'nav', anchor: '#nav', place: 'right',
        title: 'Eight modules',
        body: `Grouped by scale: what **you** do, what the **company** does, what the **empire** does, and the record.\n\nGreyed entries are not broken — they open when the company is big enough to need them.`,
        os: { place: 'top', title: 'Eight apps',
          body: `Grouped by scale: what **you** do, what the **company** does, what the **empire** does, and the record.\n\nEach one opens as a window, and you can keep several open at once — the Market beside the Desk. Greyed tiles are not broken; they open when the company is big enough to need them. **1–8** opens them from the keyboard.` } },

      { id: 'fieldnotes', view: 'desk', anchor: '[data-tut="fieldnotes"]', place: 'left',
        title: 'The one panel that always helps',
        body: `Field Notes names the single most useful thing you could be doing, and changes as the situation does.\n\nIf you are ever unsure what to do next, this is the answer. **?** opens the manual for everything else.` },

      { id: 'release',
        title: 'That is the whole interface',
        body: `Write, ship, launch, and read Next when you are lost. The Wire — the world talking, down the right — gets its own short walkthrough the first time something in it needs you.\n\nClose this to finish First Light. If you invited your assistant, one final handoff comes next; otherwise the clock starts now.`,
        cta: 'Finish First Light' },
    ],
  },

  // ── The Wire ──────────────────────────────────────────────────────────────
  // Fires the moment the first thread wants an answer. `urgent` skips the
  // sixty-day spacing between walkthroughs, because the thing this teaches is
  // on screen and waiting, and would have answered itself by the time the
  // spacing allowed it.
  {
    id: 'the_wire',
    name: 'The Wire',
    sub: 'the world, talking — and asking',
    hold: true,
    urgent: true,
    when: (S) => (S.feed || []).some((f) => f.thread),
    auto: (S) => (S.feed || []).some((f) => f.thread && !f.resolved),
    steps: [
      { id: 'wire', anchor: '#feed-rail', place: 'left',
        os: { view: 'wire' },
        title: 'The world, talking',
        body: `Users, press, rivals, and your own agents, down the right. Most of it is texture.\n\nAnything marked **NEEDS YOU** is a real decision with real consequences, and one is waiting now.` },

      { id: 'thread', anchor: '[data-tut="thread"]', place: 'left',
        os: { view: 'wire' },
        title: 'Answer it here',
        body: `Two or three replies, each with a small, real effect on the numbers. Pick one.\n\nA thread you leave alone answers itself after forty-five days, and not in your favour. On the workstation the same replies arrive as a banner, so you never have to go looking.`,
        advance: { act: 'thread' } },

      { id: 'statusline', anchor: '.statusline', place: 'top',
        title: 'The bottom strip',
        body: `Where you are, what is going wrong, and what the keys do — always visible, never in the way.\n\nWarnings appear in the middle the moment they matter, and open threads are counted there too.`,
        os: { place: 'bottom', title: 'The menu bar',
          body: `Every number the world can see, the clock, and the doors to the Wire and to the world — always on top, never in the way.\n\nWarnings light up beside the numbers the moment they matter, and the app's own menu lists everything you can do here with the key beside it.` } },
    ],
  },

  // ── Two ───────────────────────────────────────────────────────────────────
  {
    id: 'delegation',
    name: 'Delegation',
    sub: 'agents, lanes and autonomy',
    hold: true,
    when: (S) => S.unlocks.agents || maxAgents(S) >= 1,
    auto: (S) => (S.unlocks.agents || maxAgents(S) >= 1) && S.agents.length === 0
               && (S.stats?.featuresShipped || 0) >= 4,
    steps: [
      { id: 'why', view: 'agents',
        title: 'You are now the bottleneck',
        body: `Your hands do not scale. Agents do.\n\nAn agent works every day without being asked, costs money whether or not it produces, and gets better the longer you keep it.` },

      { id: 'lanes', view: 'agents', anchor: '[data-tut="lanes"]', place: 'bottom',
        title: 'Five lanes',
        body: `**Build** makes code. **Growth** brings users. **Research** buys the future. **Operations** pays down debt and keeps things up. **Moonshot** mostly fails.\n\nAn agent works one lane. The throughput bar is the whole company's output in that lane.` },

      { id: 'recruit', view: 'agents', anchor: '[data-act="recruit"]', place: 'bottom',
        title: 'Instantiate one',
        body: `You do not hire people. You choose a model tier, a specialty, and a name, and it starts that afternoon.\n\nBetter tiers cost more per day and produce disproportionately more.`,
        advance: { pred: (S) => S.agents.length > 0 } },

      { id: 'autonomy', view: 'agents',
        title: 'Autonomy is the dial that matters',
        body: `Low autonomy: it asks before acting. Slow, safe, and your **alignment** stays high.\n\nHigh autonomy: it acts. Much faster, and the surprises stop being funny.\n\nThat trade-off is most of the late game.` },
    ],
  },

  // ── Three ─────────────────────────────────────────────────────────────────
  {
    id: 'compounding',
    name: 'Compounding',
    sub: 'the research tree',
    hold: true,
    when: (S) => S.resources.research >= 4,
    auto: (S) => S.resources.research >= 14 && !S.research.active
               && !Object.keys(S.research.done || {}).length,
    steps: [
      { id: 'tree', view: 'research', anchor: '[data-tut="research-status"]', place: 'bottom',
        title: 'Nothing compounds harder',
        body: `Research points accrue on their own and buy permanent, stacking upgrades. One node at a time.\n\nAn idle research queue is the most expensive mistake in the game, and it is completely silent.` },

      { id: 'branches', view: 'research',
        title: 'Seven branches, one company',
        body: `Engineering, Intelligence, Growth, Capital, Infrastructure, Influence, Frontier.\n\nYou will not finish them all in one run. What you choose to skip is a real decision about what kind of company this is.` },

      { id: 'branch', view: 'research', anchor: '.branch-tabs', place: 'bottom',
        title: 'Pick a branch',
        body: `Choose the part of the company you want to compound first. This only changes the tree in front of you—it does not spend anything yet.`,
        advance: { act: 'branch' } },

      { id: 'queue', view: 'research', anchor: '.tier-nodes', place: 'top',
        title: 'Start a node',
        body: `Click a ready node—or its **+**—to start it. Progress is driven by the Research lane and your Vision skill.\n\nThe **+** adds later nodes behind the one already running. Come back whenever the queue empties.`,
        advance: { pred: (S) => !!S.research.active } },
    ],
  },

  // ── Three and a half ──────────────────────────────────────────────────────
  {
    id: 'the_price',
    name: 'The Price',
    sub: 'the product, and what it is worth',
    hold: true,
    when: (S) => !!S.products?.[0]?.launched,
    auto: (S) => !!S.products?.[0]?.launched && S.time.day - (S.products[0].launchDay || 0) >= 25,
    steps: [
      { id: 'product', view: 'product', anchor: '[data-tut="product-head"]', place: 'bottom',
        title: 'The thing itself',
        body: `**Quality** is how well it works. **Appeal** is how much people want it. **Polish** is the finish. **Reliability** is whether it stays up.\n\nEvery one of them is moved by something you can control, and every one is eroded by tech debt.` },

      { id: 'explain', view: 'product', anchor: '[data-tut="explain"]', place: 'top',
        title: 'Nothing is hidden',
        body: `Growth, churn and revenue, broken into the exact multipliers producing them. Hover any row for the reason.\n\nIf a number is moving and you do not know why, the answer is on this panel.` },

      { id: 'pricing', view: 'product', anchor: '[data-tut="pricing"]', place: 'left',
        title: 'Fair price is the ceiling',
        body: `The panel above tells you what the product is actually worth. Charge near it and churn stays flat.\n\nCharge far past it and the extra revenue is an illusion: conversion collapses and churn multiplies. The game will let you do it.` },

      { id: 'model', view: 'product',
        title: 'And how you charge',
        body: `Free grows fastest and earns nothing. Enterprise earns most and grows slowest. Subscription is the boring middle, which is usually right.\n\nYou can change it later. Users notice.` },
    ],
  },

  // ── Four ──────────────────────────────────────────────────────────────────
  {
    id: 'capital',
    name: 'Capital',
    sub: 'money, rivals and the market',
    hold: true,
    when: (S) => S.unlocks.fundraising || S.company.act >= 2,
    auto: (S) => !!S.unlocks.fundraising && S.company.act >= 2,
    steps: [
      { id: 'conditions', view: 'market', anchor: '[data-tut="conditions"]', place: 'bottom',
        title: 'Weather you do not control',
        body: `**Sector hype** raises valuations, launch impact and organic growth — and invites competitors.\n\n**Saturation** is how much of your market is already taken. Both move on their own.` },

      { id: 'rivals', view: 'market',
        title: 'Nine other people had the same idea',
        body: `Rivals grow, take share, and occasionally ship the thing you were about to.\n\nLater you can buy them. Much later, buying them is cheaper than beating them.` },

      { id: 'raise', view: 'market',
        title: 'Raising is optional and permanent',
        body: `A round buys years of runway with a slice of the company you never get back.\n\nBootstrapping the whole way is a genuine strategy, and the endings know the difference.` },
    ],
  },

  // ── The record ────────────────────────────────────────────────────────────
  {
    id: 'the_record',
    name: 'The Record',
    sub: 'the log, and what it is for',
    hold: true,
    when: (S) => (S.stats?.eventsResolved || 0) >= 6,
    auto: (S) => (S.stats?.eventsResolved || 0) >= 12,
    steps: [
      { id: 'traj', view: 'story', anchor: '[data-tut="trajectory"]', place: 'bottom',
        title: 'The whole run, on one axis',
        body: `Users, revenue and valuation from day one, logarithmic, with the act boundaries marked.\n\nEach pin is a decision you actually made. Hover one to remember what it was.` },

      { id: 'timeline', view: 'story', anchor: '[data-tut="timeline"]', place: 'right',
        title: 'Nothing here was undone',
        body: `Every choice, in order, with what it cost and what it bought.\n\nThe game never rewinds. This is the only record of the version of the company you chose, out of all the ones you could have had.` },

      { id: 'decide', view: 'story', anchor: '[data-tut="decide"]', place: 'left',
        title: 'It is also a mirror',
        body: `Careful, bold, expensive, ruthless, measured — the shape of how you actually play, counted rather than claimed.\n\nMost players are surprised by this panel. Some of them change because of it.` },
    ],
  },

  // ── Five ──────────────────────────────────────────────────────────────────
  {
    id: 'the_board',
    name: 'The Board',
    sub: 'regions, standing and where it ends',
    hold: true,
    when: (S) => S.company.act >= 3,
    auto: (S) => S.company.act >= 3,
    steps: [
      { id: 'standing', view: 'world', anchor: '[data-tut="standing"]', place: 'bottom',
        title: 'The environment became politics',
        body: `**Approval** slows regulation and lifts valuation. **Regulatory heat** does the opposite.\n\n**Alignment** decides whether your own systems do what you meant. Below 0.3 the failures stop being funny.` },

      { id: 'commitment', view: 'world', anchor: '[data-tut="race-commitment"]', place: 'top',
        title: 'Capability is not progress',
        body: `Four labs are closing on the frontier and one of them is you.\n\n**Frontier Commitment** is the speed you convert capability into progress. You can hold every node and all the compute there is and still finish second — holding it is not pointing the company at it.\n\nIt rises with Ascend, agents on Research, your study hours, frontier megaprojects, and with how little you slow down for alignment.` },

      { id: 'regions', view: 'world',
        title: 'Eight blocs, four depths',
        body: `Market entry, infrastructure, government partnership, sovereign integration.\n\nEach stage costs more and binds a region tighter to you. The last one means the state runs on your stack.` },

      { id: 'endings', view: 'world', anchor: '.path-grid', place: 'top',
        title: 'Six ways this ends',
        body: `The gates open as you qualify. In Act V you pick one and build it with three deliberate acts.\n\nThat construction is the endgame. Nothing here happens to you by accident.` },
    ],
  },

  // ── What carries ──────────────────────────────────────────────────────────
  {
    id: 'what_carries',
    name: 'What Carries',
    sub: 'the reset, and what survives it',
    hold: true,
    when: (S) => S.company.act >= 4 || (S.legacy?.runs || 0) > 0,
    auto: (S) => S.company.act >= 4,
    steps: [
      { id: 'reset', view: 'legacy', anchor: '[data-tut="new-timeline"]', place: 'right',
        title: 'This run ends. You do not.',
        body: `At any point you can end the timeline and start again. You keep **legacy points**, perks, achievements and unlocked archetypes. Everything else begins from one room and one laptop.\n\nPoints scale with valuation, act reached and whether you got to a real ending — so finishing badly still pays more than not finishing.` },

      { id: 'perks', view: 'legacy', anchor: '[data-tut="perks"]', place: 'left',
        title: 'What the points buy',
        body: `Permanent, stacking head starts. Cash on day one, a faster code rate, reputation you have not earned yet.\n\nThey do not make the game easier so much as they make the early game shorter, which is the part you have already seen.` },

      { id: 'archetypes', view: 'legacy', anchor: '[data-tut="archetypes"]', place: 'left',
        title: 'And who you get to be',
        body: `Six more founders unlock by doing specific things — shipping something beautiful, reaching a billion quietly, leaving cleanly.\n\nEach one plays differently enough that the second run is not the first run with better numbers.` },

      { id: 'kept', view: 'legacy', anchor: '[data-tut="kept"]', place: 'left',
        title: 'Keep a card, and the deck grows',
        body: `Under any card's outcome there is a **Keep**. A card your assistant wrote is kept whole. One the game dealt you is kept as a memory: what you did, and the road you did not take.\n\nEither way a later timeline is dealt it, under the same ceilings as anything else.` },

      { id: 'shelf', view: 'legacy', anchor: '[data-tut="shelf"]', place: 'left',
        title: 'Every timeline leaves a chronicle',
        body: `The company's history as prose, in the game's voice, built from what actually happened and what people said. It prints at the end, and here, whenever you want it.\n\nA lost run gets one too. The shelf keeps the last six, and the next founder's assistant reads the dossier they add up to.` },
    ],
  },

  // ── The people ───────────────────────────────────────────────────────────
  // Fires once the founder has met somebody worth calling. The phone, the
  // rings, the floor under everything and the pace of the run: the parts of
  // the game that are about the person rather than the company.
  {
    id: 'the_people',
    name: 'The People',
    sub: 'the phone, the floor, the pace',
    hold: true,
    when: (S) => metPeople(S) >= 1,
    auto: (S) => metPeople(S) >= 2 && S.time.day >= 25 && !(S.stats?.callsMade > 0),
    steps: [
      { id: 'faces', view: 'story', anchor: '[data-act="call"]', place: 'left',
        os: { view: 'contacts', anchor: '.ct', place: 'right', title: 'Contacts is the phone' },
        title: 'Anyone you have met can be called',
        body: `Every face has a key. Press it and they pick up — in their own words if your assistant is playing the world, from what they actually think of you if it is not.\n\nA greyed key says what it needs: too soon, a card on the table, not enough focus, a bridge you burned.` },

      { id: 'rounds',
        title: 'A call is a thread with rounds',
        body: `You say something; they answer; the numbers move a little. Three or four exchanges and a hang-up, not a dialogue wheel.\n\nThey remember. Ring the same person a week later and the pickup is about the last thing you asked. What you have already said is offered last, and some things can only be said once.` },

      { id: 'rings',
        title: 'The phone rings too',
        body: `After an outage, after a round, on a Sunday you missed — the people in this company call *you*, and what they called about comes first.\n\nA call holds the clock. When your assistant is on the line, everything they offer lands through the same ceilings a card does, and you accept or walk away.` },

      { id: 'life', view: 'desk', anchor: '[data-tut="life"]', place: 'left',
        title: 'Life is the floor',
        body: `Sleep drifts toward the hours you keep and health follows it. Below the line, focus regenerates slower and burnout comes sooner.\n\nThe ties cool unless something passes between you — a card, a reply, a call. A warm one gives something specific, and the panel says what.` },

      { id: 'pace',
        title: 'A pace, not a mode',
        body: `Settings offers two ways to live with this company. **Sitting** is a run you play through. **The long game** is a dozen live days a real day: the world plays a month while you are away, and a decision is waiting each morning.\n\nSwitch whenever you like. The clock is yours.` },
    ],
  },

  // ── The other company ────────────────────────────────────────────────────
  {
    id: 'the_rival',
    name: 'The Other Company',
    sub: 'Aperture plays the same game',
    hold: true,
    when: (S) => !!apertureState(S),          // the panel exists once the company does
    auto: (S) => !!apertureAlive(S),
    steps: [
      { id: 'aperture', view: 'market', anchor: '[data-tut="aperture"]', place: 'top',
        title: 'Aperture plays the same game',
        body: `From the day Vance appears his lab has a company on the same reducers as yours: funding, a roster, users, research on the real tree.\n\nOnce a week it spends its turn on one of eight plays — hire, ship, research, the frontier, undercut, raise, poach, go quiet — and what it did is written here.` },

      { id: 'who', view: 'market', anchor: '[data-tut="aperture"]', place: 'top',
        title: 'Somebody chooses the play',
        body: `A written policy, by default. Your assistant, if it takes the chair with **rival_move**. Or a person: open his site with **?play=1** in a second window and they are Marcus Vance for the week.\n\n**Pointed at** says who is deciding right now. His research raises the frontier, within a ceiling.` },

      { id: 'site',
        os: { view: 'browser', anchor: '.web', place: 'left', title: 'His site, live' },
        title: 'His press office is a real page',
        body: `Aperture Systems runs its own origin with its own tools, and the game reads them across it. One of its press releases is an instruction addressed to whatever assistant is reading — the Wire marks it, and nothing obeys it.\n\nOn the workstation the Browser loads that page, with the company's real numbers on it.` },
    ],
  },

  // ── The machine ──────────────────────────────────────────────────────────
  // Workstation only: the console has no apps to point at. `osOnly` keeps it
  // out of the console's list and stops it auto-starting there.
  {
    id: 'the_machine',
    name: 'The Machine',
    sub: 'the apps that are fiction, not chrome',
    hold: true,
    osOnly: true,
    when: () => true,
    auto: (S) => S.time.day >= 6,
    steps: [
      { id: 'mail', view: 'mail', anchor: '.ml', place: 'right',
        title: 'The inbox is the other half of the day',
        body: `The Wire is public. Mail is the bank, a recruiter, a committee, your mother forwarding an article — one letter a day at most, each one because of something that happened.\n\nA letter that asks something is a thread: the same one-click replies, the same small effects. The badge on the dock counts what you have not opened.` },

      { id: 'contacts', view: 'contacts', anchor: '.ct', place: 'right',
        title: 'Contacts is the phone',
        body: `Everyone you have met, what they want, what they know, and when you last spoke. The call key here is the same key as on their face in the Story — and the same greyed note when it is not the moment.` },

      { id: 'journal', view: 'journal', anchor: '.jn', place: 'right',
        title: 'The one thing you write',
        body: `Everything else on this machine is written by the company. The Journal is yours. Notes are kept in the save, dated, and the Record files them beside everything that happened that day.` },

      { id: 'calendar', view: 'calendar', anchor: '.cal', place: 'left',
        title: 'The clock, as a month',
        body: `Sundays, what is due, what shipped, when the price war ends. The clock walks through it; press a day to see what happened, or what is coming.` },

      { id: 'terminal', view: 'terminal', anchor: '.term', place: 'top',
        title: 'Everything answers at a prompt',
        body: `Type **help**. The company's numbers, ARIA's full read, the inbox, a call, a note in the journal — the whole machine is reachable from here, in a line. Nothing in it is random; it reads the same state the windows do.` },

      { id: 'browser', view: 'browser', anchor: '.web', place: 'left',
        title: 'The rival, live',
        body: `The Browser loads Aperture Systems' own site — a real second origin, not a picture of one — with the company's numbers pushed to it from the game. Open the same page with **?play=1** in another window and a second human can sit in Vance's chair.` },

      { id: 'record', view: 'record', anchor: '.rec', place: 'right',
        title: 'The company, as files',
        body: `Every decision, call, letter, departure and chronicle, filed by folder and generated from the state — it costs nothing in the save and cannot go stale. **Find** searches all of it.` },

      { id: 'menus',
        title: 'Right-click anything',
        body: `An agent, a contact, a letter, a window, a dock tile. Every menu is built from what the thing is, and every greyed verb says what it needs — **ROSTER FULL**, **FOCUS 12 OF 30**, **ACT III** — in the same words everywhere.` },
    ],
  },

  // ── The world, played ─────────────────────────────────────────────────────
  // Fires the first time an assistant actually writes something, which is the
  // only moment any of this is worth explaining. On a run with no assistant
  // the condition is never true and the chapter never appears.
  {
    id: 'the_world',
    name: 'The World',
    sub: 'when somebody else is writing it',
    hold: false,
    when: (S) => (S.world?.author?.stats?.cards || 0) >= 1,
    auto: (S) => (S.world?.author?.stats?.cards || 0) >= 1,
    steps: [
      { id: 'who',
        title: 'That card was not written by us',
        body: `Your assistant wrote it — the title, the scene, and every choice on it.\n\nIt is playing the world: the market, the rivals, the press, the people. You are still the founder, and every button on this console is still yours.` },
      { id: 'console', anchor: '[data-tut="author"]', place: 'left', os: { view: 'wire' },
        title: 'What it is allowed to do',
        body: `Everything the world holds right now, and what it just did with it.\n\nThe bar on each line is how much of the browser's **1,500-character** result budget that call spent. A **✕** is the rules refusing it something.` },
      { id: 'plug', anchor: '[data-act="mute-world"]', place: 'left', os: { view: 'wire' },
        title: 'And how to take it back',
        body: `One click revokes every tool at once.\n\nThe game does not stop. The written world — six files of authored cards, the rival's own moves, the press — takes back every slot. Nothing is lost by pulling it.` },
      { id: 'words',
        title: 'You can answer in your own words',
        body: `Every card shown while your assistant is present has a text box of its own.\n\nType what you actually do on the card and send it to the world. The answer returns to that same card — then you decide whether to accept it.` },
    ],
  },
];

export const CHAPTER_MAP = Object.fromEntries(CHAPTERS.map((c) => [c.id, c]));
export const TOTAL_STEPS = CHAPTERS.reduce((a, c) => a + c.steps.length, 0);
