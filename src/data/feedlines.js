// ─────────────────────────────────────────────────────────────────────────────
// THE LIVING FEED — procedural social/news chatter that reacts to your state.
// Tokens: {company} {product} {founder} {handle} {users} {mrr} {val} {rival}
//         {cat} {feature} {n} {city}
// ─────────────────────────────────────────────────────────────────────────────

export const OUTLETS = ['The Ledger', 'Terminal', 'Byline', 'Compute Weekly', 'The Margin',
  'Vector', 'Signal & Noise', 'Standard Deviation', 'The Long Now Post'];

export const RANDOM_HANDLES = ['@devopsdad', '@shipfaster', '@quietbuilder', '@margincall',
  '@notaVC', '@0xnormal', '@yakshaver', '@bugcurious', '@postmortem_fan', '@latency_pilled',
  '@ex_faang_now_farming', '@grumpysre', '@productbrain', '@churnwhisperer', '@indiemaxxing',
  '@compilerpilled', '@second_system', '@refactor_or_die', '@founder_mode', '@seed_stage_sam',
  '@tokencounter', '@vibesbased', '@apilifer', '@lurkmoar', '@uptime_enjoyer'];

export const CITIES = ['SF', 'NYC', 'Berlin', 'Lagos', 'Bangalore', 'Tokyo', 'São Paulo',
  'Warsaw', 'Toronto', 'Singapore', 'Nairobi', 'Seoul', 'Austin', 'Lisbon', 'Tallinn'];

// ── Social posts, keyed by the condition that makes them fire ───────────────
export const SOCIAL = {
  early: [
    'just found {product}. one person built this? in {n} weeks? ok.',
    'been using {product} for three days and I already can\'t go back',
    '{product} is what {cat} should have been the whole time',
    'the {product} onboarding is 40 seconds. forty. seconds.',
    'genuinely don\'t understand how {company} ships this fast with one human',
    'ok {product} just replaced two tools in my stack',
    'small thing but {product} remembered my settings across devices and I audibly said "oh"',
    'the fact that {product} has no signup wall is a competitive advantage nobody talks about',
  ],
  growing: [
    '{product} just crossed {users} users. still one employee. still.',
    'my whole team runs on {product} now. we did not have a meeting about it. it just happened.',
    'watching {company} grow in real time is the most interesting thing on my timeline',
    'unpopular opinion: {product} is underpriced by like 5x',
    '{founder} has shipped more this quarter than my last three employers combined',
    'the {product} changelog is better content than most tech newsletters',
    'PSA: {product} added the thing you\'ve been asking for. yes that one.',
    'switched from {rival} to {product}. the migration took eleven minutes.',
  ],
  big: [
    '{company} is now doing {mrr}/mo. one person. I need to lie down.',
    'at what point do we stop calling {company} a startup',
    '{product} is infrastructure now. you can tell because people complain when it\'s slow instead of leaving.',
    'my bank runs on something that runs on {product}. think about that.',
    'the {company} valuation is {val} and honestly that feels low',
    'every company I talk to is either building on {product} or explaining why they\'re not',
    '{founder} could stop working today and {company} would keep compounding. that\'s the whole thing.',
  ],
  dominant: [
    'reminder that {company} employs one human being',
    'the {company} outage last month cost the global economy an estimated {n}B. one company.',
    'we need a word for what {company} is. "company" isn\'t it anymore.',
    'my kid asked what a job was and I did not have a good answer',
    'genuinely: is there a scenario where {company} doesn\'t own everything by {n}',
    '{founder} hasn\'t posted in six weeks and the stock went up 11%',
  ],
  critical: [
    'hot take: {company} is a single point of failure for like nine industries',
    'not thrilled that {product} is now unavoidable',
    'the {company} thing stopped being cool around the time it stopped being optional',
    'genuine question: who exactly is accountable when {company} makes a mistake',
    'we let one person and some models eat an entire sector and we\'re calling it innovation',
    '{founder} keeps saying "we". there is no we. there is one person and a datacenter.',
  ],
  crisis: [
    '{product} down again. third time this month. considering alternatives.',
    'anyone else getting errors from {product} or is it just me',
    'the {company} status page is green and my dashboard is on fire. classic.',
    'moving off {product}. the reliability isn\'t there and support is a bot.',
    'so {company} shipped a breaking change with no notice. cool. cool cool cool.',
  ],
  rival: [
    '{rival} just shipped basically the same thing. curious.',
    'honestly {rival} is better for my use case. sorry {founder}.',
    'the {product} vs {rival} thing is getting weird and I\'m here for it',
    '{rival} raised again. the war chest is getting silly.',
  ],
};

// ── Hacker-News-style titles ───────────────────────────────────────────────
export const HN_TITLES = {
  early: [
    'Show HN: {product} – {tagline}',
    '{product}: a {cat} tool built by one person and some agents',
    'I replaced my entire {cat} stack with {product}',
    'Ask HN: is anyone else using {product} in production?',
  ],
  growing: [
    'How {company} runs {users} users with one employee',
    '{product} is quietly eating the {cat} market',
    'The {company} architecture, explained',
    'Why we moved from {rival} to {product}',
    '{founder} on shipping 40 features in a quarter, alone',
  ],
  big: [
    '{company} hits {mrr} MRR with a headcount of one',
    'The economics of a one-person {val} company',
    'Inside {company}: the org chart is a config file',
    '{product} is now a dependency of 14% of the Fortune 500',
  ],
  dominant: [
    'Is {company} too big to regulate?',
    'The {company} problem',
    'What happens when one company owns the substrate',
    '{founder} declines to appear before the committee (again)',
    'A modest proposal to nationalise {company}',
  ],
  crisis: [
    '{company} outage: post-mortem thread',
    '{product} breaking change broke my production',
    'Ask HN: alternatives to {product}?',
  ],
};

// ── Headlines ──────────────────────────────────────────────────────────────
export const HEADLINES = {
  early: [
    '{outlet}: The rise of the one-person company',
    '{outlet}: {company} is the first startup with no employees and real revenue',
    '{outlet}: Meet the founders who hire models instead of people',
  ],
  growing: [
    '{outlet}: {company} reaches {users} users without a single hire',
    '{outlet}: Inside the "agent-native" company',
    '{outlet}: Investors are scrambling to price companies with no payroll',
    '{outlet}: {rival} scrambles as {company} takes the {cat} market',
  ],
  big: [
    '{outlet}: {company} valued at {val} in latest round',
    '{outlet}: The one-person unicorn is no longer a thought experiment',
    '{outlet}: Labor economists have no model for what {company} is doing',
    '{outlet}: {company} now processes more {cat} volume than the next four combined',
  ],
  dominant: [
    '{outlet}: Lawmakers call for oversight of {company}',
    '{outlet}: The {company} question: when does a company become a jurisdiction?',
    '{outlet}: {founder} is now wealthier than 140 nations combined',
    '{outlet}: {company} signs infrastructure deal with third sovereign state this year',
    '{outlet}: Anti-trust action against {company} stalls for the fourth time',
  ],
  singularity: [
    '{outlet}: {company} announces capability milestone; no external researcher can verify it',
    '{outlet}: Global GDP grew {n}% this quarter. Analysts credit one company.',
    '{outlet}: "We are no longer the fastest thinkers on the planet" — {founder}',
    '{outlet}: The Ascension hearings: day nine',
    '{outlet}: What does {company} want?',
  ],
};

// ── Internal system log lines (agent chatter) ──────────────────────────────
export const AGENT_LOGS = [
  '{agent} → shipped `{feature}` · {n} files changed',
  '{agent} → flagged {n} deprecated call sites, opened cleanup PR',
  '{agent} → completed {n} tasks in queue · 0 escalations',
  '{agent} → requests review: architectural decision, low confidence',
  '{agent} → note: churn correlates with p99 latency, not feature gaps',
  '{agent} → declined a task as out of scope. Logged for your review.',
  '{agent} → found a 340ms regression introduced 6 days ago. Reverted.',
  '{agent} → I rewrote the section you flagged. I think the original was better. Both are on the branch.',
  '{agent} → competitor {rival} shipped a similar feature 4h ago. Diff analysis attached.',
  '{agent} → I have been running for {n} days without a restart.',
  '{agent} → suggestion: you have not slept in 19 hours. Output quality is down 22%.',
  '{agent} → escalating: this decision has downstream effects I cannot evaluate.',
  '{agent} → done. Waiting.',
];
