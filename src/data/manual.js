// ─────────────────────────────────────────────────────────────────────────────
// THE MANUAL — everything a player might need looked up, as data.
//
// The walkthrough teaches the interface once. This is what you open at 2am on
// day 400 when you cannot remember what fair price does to churn. Nothing here
// is a secret: if a number moves, the reason is written down somewhere on this
// page.
// ─────────────────────────────────────────────────────────────────────────────

export const KEYS = [
  ['Q', 'Write code by hand', 'Slow, clean, and yours. Costs Focus. No tech debt.'],
  ['W', 'Prompt the AI', 'Far more output for Focus and cash. Adds tech debt, and occasionally invents things.'],
  ['E', 'Talk to users', 'Generates Insight — the difference between building and guessing.'],
  ['R', 'Post publicly', 'Reputation, with a small chance of a very large day.'],
  ['S', 'Ship a feature', 'Spends accumulated Code. Insight decides how good it lands.'],
  ['G', 'Spend the bar', 'Runs the hand chosen on the Desk over and over — until the next feature is covered, or the Focus bar is down to its last tenth, or something asks for you.'],
  ['A', 'Ask ARIA', 'A full read of the current situation, in her words.'],
  ['M', 'The post', 'Opens the inbox. On the workstation it is a window; in the console it is a sheet.'],
  ['C', 'Contacts', 'Everyone you have met, and a number for each of them.'],
  ['F', 'Focus mode', 'In the console: the nav to icons and the Wire away. On the workstation, F is Find.'],
  ['Space', 'Pause / resume', 'The world stops on its own during events anyway.'],
  ['− / =', 'Slower / faster', 'Steps the clock through 1× to 5×. Down past 1× is a stop; up from a stop is a start.'],
  ['N', 'Next decision', 'Runs at 5× until something asks for you — a card, a thread, a letter, an incident, a finished node — then holds the clock.'],
  ['1–9', 'Choose', 'Pick an option while an event card is open.'],
  ['Enter', 'Continue', 'Move past an outcome.'],
  ['?', 'This manual', 'Also / — and the ? button in the top right.'],
];

// The mark on every choice a card offers. The tone used to be a coloured edge
// and nothing else; this is the same information in a glyph, with the legend
// the manual prints under the keys.
export const TONE_LEGEND = [
  ['◇', 'neutral', 'No lean. What it says is what it does.'],
  ['●', 'good', 'The decent thing, which is not always the cheap one.'],
  ['▲', 'risky', 'A gamble. The upside is real, and so is the other side.'],
  ['$', 'costly', 'Paid for up front, in cash, equity or focus.'],
  ['✕', 'cruel', 'Somebody pays for it who is not you.'],
];

// Every term the interface uses, grouped the way the interface is grouped.
export const GLOSSARY = [
  { group: 'Your resources', items: [
    ['Focus', 'Your finite attention for the day. Every direct action spends it; Rest restores it overnight. At zero, output halves and burnout climbs.'],
    ['Code', 'Raw implementation work. It accumulates and is spent to ship features. Each feature costs more than the last.'],
    ['Insight', 'How well you understand what users need. Spent automatically when shipping — high Insight means the feature you shipped is the one they wanted.'],
    ['Reputation', 'Social capital. Drives organic growth, launch strength, hiring and valuation. Slow to build, fast to lose.'],
    ['Research', 'Points spent on the tech tree. They accrue on their own and buy permanent, stacking upgrades.'],
    ['Tech Debt', 'What AI-written code leaves behind. Slows every agent, erodes reliability, and causes incidents. Put an agent on Operations, or research the Engineering branch.'],
    ['Burnout', 'Rises when you sleep too little and rest too rarely. At 100 the game takes a week off you, whether or not that is convenient.'],
  ] },

  { group: 'The clock', items: [
    ['Decision hold', 'A card, call, walkthrough or act transition suspends time only while it is on screen. Closing it returns the clock to the state you chose. A notification switches on Pause only where you asked it to.'],
    ['Next decision', 'The ▸❚ key beside the speeds, or N. The clock runs at 5× until something asks for you, then holds with your own speed back on the dial. Space, or any speed key, stops it sooner.'],
    ['Stop the clock for', 'Five moments in Settings — an incident, a thread or a letter, runway under 30 days, cash going negative, an agent going rogue. All five start off, and while they are off nothing but your own hand ever pauses the game. Turn one on and it pauses the way the button does, and says which one it was.'],
  ] },

  { group: 'The founder', items: [
    ['Sleep', 'How much of a person is left at the end of the day. The Rest share of your time keeps it; a focus bar that sits empty erodes it. It moves slowly, in both directions.'],
    ['Health', 'Follows sleep, with a lag. Above the line it costs nothing. Below it, focus comes back slower and burnout arrives faster. It cannot end a run on its own.'],
    ['Judgement', 'Below a sleep line, the interface stops explaining itself: a card prints the answers without the line under each one saying what it costs, the phone offers one topic fewer, and a prompt rolls like somebody three levels less practised. Nothing is taken from the company. What goes is your ability to read it, and the Life panel says so in mono so it does not read as a fault.'],
    ['Warmth', 'How recently somebody heard from you. A card with their face, a call, or a reply to their post warms it; silence cools it by half every six weeks. A warm tie pays a small daily dividend in the one thing that person is good for.'],
    ['Skills', 'Seven of them, each raising a different rate. Skill points come from levelling; levels come from doing things.'],
    ['Allocation', 'How your sixteen waking hours split between build, users, growth, learning and rest. This runs every day without being asked and it dwarfs your clicking.'],
    ['Approach', 'How you prompt. Each approach has a different spread of outcomes — safe and small, or wild and occasionally enormous. More unlock as Prompting rises.'],
    ['Streak', 'Consecutive actions without pausing. Small bonus, mostly a rhythm.'],
    ['Quarter', 'Ninety days with a name on it. Set up to three intentions at the boundary and a card reads them back at the end. Setting one costs nothing — the commitment is the saying — and each one kept pays a little reputation, focus and alignment. Every run has quarters, board or no board.'],
    ['Standing order', 'One company-wide policy, ramping to full strength over a month, so commitment is rewarded and thrashing is not. Once the company can run itself there are three slots sharing one budget: three orders are three weaker orders. The first slot is the one The Long View counts.'],
    ['Archetype', 'Your starting shape. Locked ones unlock by finishing runs.'],
  ] },

  { group: 'The product', items: [
    ['Quality', 'How well it works. Raised by shipping with high Insight; eroded by tech debt.'],
    ['Appeal', 'How much people want it. Drives conversion and virality.'],
    ['Polish', 'The finish. Slows churn and lifts the price users will tolerate.'],
    ['Reliability', 'Uptime. Falls with tech debt and rises with Operations. Incidents live here.'],
    ['Fair price', 'What the product is actually worth, computed from quality, appeal and polish. Charge far above it and churn multiplies while conversion collapses.'],
    ['Viral coefficient', 'How many new users each existing user brings. Above ~1 the curve stops needing you.'],
    ['Monthly churn', 'The share of users who leave each month. Reliability, polish and price all move it.'],
    ['Daily growth', 'Net new users per day as a share of the base. Virality, reputation and marketing feed it; churn eats it.'],
    ['Sentiment', 'How users feel, as distinct from how many there are. It leads reputation and lags reliability.'],
    ['Awareness', 'How many people have heard of you at all. Posts, press and launches raise it; it decays without them.'],
    ['Revenue', 'Money in per month, before any cost. Users times conversion times effective price.'],
    ['Price', 'What you charge. The effective price is capped near fair price — charging far past it multiplies churn instead of revenue.'],
    ['Model', 'How you charge: free, freemium, subscription, usage-based or enterprise. Each trades growth against revenue per user.'],
    ['TAM', 'The addressable market. It expands as the category matures — you are never permanently capped.'],
  ] },

  { group: 'Agents', items: [
    ['Lane', 'Where an agent spends its day: Build, Growth, Research, Operations, Moonshot. An agent in its own specialty produces full output; off-specialty it produces much less.'],
    ['Model tier', 'The engine. Higher tiers cost more per day and produce disproportionately more. Upgrading is usually cheaper than hiring.'],
    ['Autonomy', 'Whether it asks before acting. Higher means far more output, more tech debt, and a growing chance it stops asking. Alignment pays the bill.'],
    ['Morale', 'Agents that are ignored, overloaded or repeatedly overridden get worse. Morale is not sentiment; it is throughput.'],
    ['Traits', 'Permanent quirks rolled at instantiation. Some are gifts, some are bills that arrive later.'],
    ['Tools', 'Bought once, attached to one agent, kept for the rest of its life.'],
  ] },

  { group: 'Money', items: [
    ['Runway', 'Days of cash left at the current burn. The single number most likely to end the run.'],
    ['MRR', 'Monthly recurring revenue. Users times conversion times effective price.'],
    ['Valuation', 'What the company would sell for. Driven by revenue, growth, reputation and sector hype — and capped by how much of world GDP you could plausibly be worth.'],
    ['Round', 'Capital for equity. Permanent. Bootstrapping all the way is a real strategy and the endings know the difference.'],
    ['Equity', 'Your remaining share. It only ever goes down.'],
    ['Sector hype', 'Market weather. Lifts valuations, launches and organic growth — and invites competitors.'],
    ['Saturation', 'How much of your addressable market is already taken, by you or anyone else. High saturation makes every new user cost more.'],
    ['The Board', 'A Series A or later seats one; angels and a seed do not. It meets every ninety days with one ask chosen from whatever it would actually be reading — the growth line, the burn, the roster, the price, the frontier. A founder who never raises never has one.'],
    ['Confidence', 'The only number the board has, and every power it holds is a threshold on it. Taking an ask raises it and keeping the ask raises it again; refusing costs. Two quarters low and it sets the standing order itself. Three at the floor, with control sold, and it removes you.'],
  ] },

  { group: 'The world', items: [
    ['Frontier Commitment', 'How much of the company is actually pointed at the frontier, 0-100%. Capability is what you hold; commitment is the speed you convert it into race progress. It rises with the Ascend standing order, agents on the Research lane, your own study hours, frontier megaprojects, and with how little you slow down for alignment. It moves gradually — a week of it changes nothing.'],
    ['Frontier Capability', 'The ceiling your race progress climbs toward: intelligence research, compute, data and frontier-grade agents. Holding capability is not the same as having converted it — you can lead the field on paper and still lose.'],
    ['Public approval', 'How the world feels about you. Slows regulation, lifts valuation, and decides which endings are open.'],
    ['Regulatory heat', 'How much attention the state is paying. High heat means investigations, fines and blocked launches.'],
    ['Alignment', 'How reliably your systems do what you meant rather than what you said. Decays with autonomy, recovers with interpretability research. Below 0.3 the failure modes stop being funny.'],
    ['Control', 'Sovereign leverage — how much the world runs on you. Built by deep regional integration.'],
    ['AI safety concern', 'How worried the public is about what you are building specifically. It converts into regulatory heat over time.'],
    ['Compute', 'Petaflop-days available to you. It gates frontier research, agent throughput and everything in Act IV.'],
    ['Energy', 'Dedicated generation capacity in megawatts. Past a certain scale, power is the constraint rather than chips.'],
    ['World GDP', 'The share of global economic output that flows through you. The single best measure of how large this has become.'],
    ['Doom clock', 'Misalignment, scrutiny and distrust combined. It does not end the game by itself; it decides how bad the bad days get.'],
    ['HELIX', 'Your own foundation model, once you have trained one, as a standing relationship rather than four cards. Its standing drifts toward what alignment, its granted requests and its arc say it should be. High standing is faster research; low standing is likelier to route around you. There is no button — it is a consequence you can watch.'],
    ['The Race', 'Rival labs closing on the frontier. They accelerate when they fall behind. Only the Frontier branch and raw compute move your number.'],
    ['Regions', 'Eight blocs, four depths of engagement: market entry, infrastructure, government partnership, sovereign integration. Each stage binds a region tighter to you.'],
  ] },
  { group: 'The world, played', items: [
    ['The world', 'When an assistant is at the table it plays the world against you — it writes event cards, speaks for the people you have met, moves the rival, and turns the market. You still play the founder. It never touches your company directly.'],
    ['The deck', 'The written game: six files of authored cards, the rival\u2019s own moves, the press. It is the default and the spine. An assistant does not replace it — it claims slots the deck would otherwise have filled, and the deck takes any slot the assistant leaves.'],
    ['A slot', 'The moment the game is about to draw a card. With an assistant present it is offered to them first, for a day and a half of game time or forty-five seconds of yours — whichever runs out first. Then the deck draws, as it always did.'],
    ['Mute the world', 'The plug, at the head of the Wire. It revokes every tool the assistant holds, in one click. The run carries on with the written deck and nothing is lost.'],
    ['In your own words', 'The text box on any card shown while the assistant is present. Type what you actually do on the card; the world writes what follows, and you accept it or you do not. If the assistant is between turns, the move stays safely on the card until it reconnects.'],
    ['Immunity', 'Three doctrines take something away from the world permanently. Untouchable removes the regulators from its hands. Beloved stops it writing a cruel choice at you. Zero Entropy stops it adding tech debt.'],
    ['Ceilings', 'How far a single choice the world writes may move anything, per act. They are the authored deck\u2019s own 80th percentile, measured over all 715 written choices, and no card may take more than a quarter of your cash.'],
  ] },
];

// What each act actually asks of you — the shape of a run, in five lines.
export const ACT_GUIDE = [
  { act: 1, name: 'The Garage', line: 'One room, one laptop.',
    goal: 'Ship features until something works, then launch.',
    watch: 'Focus and cash. Nothing else can hurt you yet.' },
  { act: 2, name: 'The Machine', line: 'It is a company now.',
    goal: 'Hire agents, find a price, and get revenue past burn.',
    watch: 'Tech debt and runway. Both arrive quietly.' },
  { act: 3, name: 'The Empire', line: 'You are the bottleneck for a continent.',
    goal: 'Enter regions, run megaprojects, and stay ahead in the race.',
    watch: 'Regulatory heat and alignment. The world started paying attention.' },
  { act: 4, name: 'The Singularity', line: 'The curve went vertical.',
    goal: 'Recursive self-improvement, frontier compute, sovereign leverage.',
    watch: 'The doom clock. Every value is large now, including the bad ones.' },
  { act: 5, name: 'After The Company', line: 'What comes after.',
    goal: 'Choose one ending and build it with three deliberate acts.',
    watch: 'Nothing here happens by accident. That is the point.' },
];

export const FOOTNOTES = [
  'The clock stops whenever a decision is on screen, so nothing is missed by looking away.',
  'Progress accrues at a reduced rate while the tab is closed, and saturates after a few hours.',
  'The game autosaves. Settings has an export string if you want to move a run between machines.',
];
