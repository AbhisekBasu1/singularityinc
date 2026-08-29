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

export const CHAPTERS = [
  // ── One ───────────────────────────────────────────────────────────────────
  {
    id: 'first_light',
    name: 'First Light',
    sub: 'the desk, end to end',
    hold: true,                        // the clock waits while you read
    when: () => true,                  // the desk never stops being the desk
    auto: (S) => S.company.act === 1 && S.meta.firstRun && S.time.day < 3,
    steps: [
      { id: 'welcome',
        title: 'This is the console',
        body: `You are one person with a laptop and a model that will write whatever you describe.\n\nEverything you will ever do happens on the eight modules down the left. This walkthrough covers the first one, and takes about two minutes.\n\nSkip whenever you like — **?** reopens it, along with the manual for every term in the game.\n\n**The clock is held until you are done.**`,
        cta: 'Begin' },

      { id: 'readouts', anchor: '.stat-strip', place: 'bottom',
        title: 'What the world can measure',
        body: `Cash, runway, revenue, users, valuation. These are the only numbers anyone outside the company ever sees.\n\n**Runway** is the one that kills you: how many days of cash are left at the current burn. Hover any readout for the detail behind it.` },

      { id: 'clock', anchor: '.time-block', place: 'bottom',
        title: 'Time is the real resource',
        body: `Days pass on their own. **1× to 5×** sets how fast, and **Space** pauses.\n\nThe clock always stops for a decision, so nothing important happens while you are reading. It is stopped right now.` },

      { id: 'nav', anchor: '#nav', place: 'right',
        title: 'Eight modules',
        body: `Grouped by scale: what **you** do, what the **company** does, what the **empire** does, and the record.\n\nGreyed entries are not broken — they open when the company is big enough to need them.` },

      { id: 'objectives', view: 'desk', anchor: '[data-tut="objectives"]', place: 'bottom',
        title: 'When in doubt, read Next',
        body: `Three things the game wants from you right now. They advance the act, and the act is the story.\n\nClick one to be taken to the module that satisfies it.` },

      { id: 'actions', view: 'desk', anchor: '[data-tut="actions"]', place: 'right',
        title: 'Direct Action is you',
        body: `Four things you can do with your own hands. The bar across the top is **Focus** — your budget for the day, refilled every morning by how you sleep.\n\nEach action names its cost and what it returns. Nothing here is hidden.` },

      { id: 'write_code', view: 'desk', anchor: '[data-act="do"][data-v="code"]', place: 'right',
        title: 'Write one line yourself',
        body: `Slow, clean, and yours. It adds **Code** and no tech debt.\n\nPress **Q** or click it.`,
        advance: { act: 'do', v: 'code' } },

      { id: 'prompt', view: 'desk', anchor: '[data-act="do"][data-v="prompt"]', place: 'right',
        title: 'Now let the machine do it',
        body: `Ten times the output for money and a little **tech debt**. This is the entire premise of the company: you describe, it builds.\n\nPress **W**.`,
        advance: { act: 'do', v: 'prompt' } },

      { id: 'approach', view: 'desk', anchor: '.approach-strip', place: 'top', optional: true,
        title: 'How you ask changes what you get',
        body: `The prompting approach sets the spread of outcomes — safe and small, or wild and occasionally enormous.\n\nMore approaches unlock as your Prompting skill rises.` },

      { id: 'build', view: 'desk', anchor: '[data-tut="build"]', place: 'right',
        title: 'Code becomes features',
        body: `Code piles up until there is enough for a feature, then you **ship** it. Features are what users actually get.\n\nEach one costs more than the last, so velocity has to come from somewhere else eventually. That somewhere else is agents.` },

      { id: 'alloc', view: 'desk', anchor: '[data-tut="alloc"]', place: 'right',
        title: 'The other sixteen hours',
        body: `Clicking is the small part. This is what you are doing the rest of the day, every day, without being asked.\n\nDrag the bars. **Rest** is not optional — the burnout meter is real and it takes a week off you when it fills.` },

      { id: 'resources', view: 'desk', anchor: '[data-tut="resources"]', place: 'left',
        title: 'Four resources and one debt',
        body: `**Code** ships features. **Insight** makes them the right features. **Reputation** brings people. **Research** buys permanent upgrades.\n\n**Tech Debt** is what the machine leaves behind. It slows everything and eventually breaks things.` },

      { id: 'fieldnotes', view: 'desk', anchor: '[data-tut="fieldnotes"]', place: 'left',
        title: 'The one panel that always helps',
        body: `Field Notes names the single most useful thing you could be doing, and changes as the situation does.\n\nIf you are ever unsure what to do next, this is the answer.` },

      { id: 'wire', anchor: '#feed-rail', place: 'left',
        title: 'The world, talking',
        body: `Users, press, rivals, and your own agents. Most of it is texture.\n\nAnything marked **NEEDS YOU** is a real decision with real consequences, and it waits for you.` },

      { id: 'statusline', anchor: '.statusline', place: 'top',
        title: 'The bottom strip',
        body: `Where you are, what is going wrong, and what the keys do — always visible, never in the way.\n\nWarnings appear in the middle the moment they matter.` },

      { id: 'release',
        title: 'That is the whole interface',
        body: `Write code, ship features, launch, and read Next when you are lost. Everything else opens on its own.\n\n**The clock starts when you close this.**`,
        cta: 'Start the clock' },
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
      { id: 'tree', view: 'research', anchor: '[data-tut="research-active"]', place: 'bottom',
        title: 'Nothing compounds harder',
        body: `Research points accrue on their own and buy permanent, stacking upgrades. One node at a time.\n\nAn idle research queue is the most expensive mistake in the game, and it is completely silent.` },

      { id: 'branches', view: 'research',
        title: 'Seven branches, one company',
        body: `Engineering, Product, Growth, Capital, Frontier, Infrastructure, Alignment.\n\nYou will not finish them all in one run. What you choose to skip is a real decision about what kind of company this is.` },

      { id: 'queue', view: 'research', anchor: '.branch-tabs', place: 'bottom',
        title: 'Pick a node',
        body: `Click a branch, then a node, to queue it. Progress is driven by the Research lane and your Vision skill.\n\nCome back whenever the queue empties.`,
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
      { id: 'console', anchor: '[data-tut="author"]', place: 'left',
        title: 'What it is allowed to do',
        body: `Everything the world holds right now, and what it just did with it.\n\nThe bar on each line is how much of the browser's **1,500-character** result budget that call spent. A **✕** is the rules refusing it something.` },
      { id: 'plug', anchor: '[data-act="mute-world"]', place: 'left',
        title: 'And how to take it back',
        body: `One click revokes every tool at once.\n\nThe game does not stop. The written world — six files of authored cards, the rival's own moves, the press — takes back every slot. Nothing is lost by pulling it.` },
      { id: 'words',
        title: 'You can answer in your own words',
        body: `Any card the world writes has a line under the choices.\n\nType what you actually do into the chat instead of pressing a button, and the world will write what happens — then you decide whether to accept it.` },
    ],
  },
];

export const CHAPTER_MAP = Object.fromEntries(CHAPTERS.map((c) => [c.id, c]));
export const TOTAL_STEPS = CHAPTERS.reduce((a, c) => a + c.steps.length, 0);