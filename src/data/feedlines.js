// ─────────────────────────────────────────────────────────────────────────────
// THE LIVING FEED — procedural social/news chatter that reacts to your state.
// Tokens: {company} {product} {founder} {handle} {users} {mrr} {val} {rival}
//         {cat} {feature} {city} {outlet}
//         {n}       a fact, stable for the whole act — two posts a week apart
//                   put the same outage at the same price
//         {k}       a count that should differ from one log line to the next
//         {pct}     a small percentage, stable for the act
//         {weeks}   the real age of the company
//         {nations} derived from the valuation, never rolled
//
// Every pool is at least ten deep. Under that, a run shows the seam inside an
// act: five crisis lines drew one of them eighteen times in one Act II.
// ─────────────────────────────────────────────────────────────────────────────

export const OUTLETS = ['The Ledger', 'Terminal', 'Byline', 'Compute Weekly', 'The Margin',
  'Vector', 'Signal & Noise', 'Standard Deviation', 'The Long Now Post'];

// The crowd. Four handles that used to be in here — @grumpysre, @notaVC,
// @churnwhisperer and @ex_faang_now_farming — are people now, with a stance
// and their own pool in `src/data/handles.js`, so they are drawn from there and
// never from here: a regular who also says an anonymous line at random is not a
// regular, they are the crowd wearing a name.
export const RANDOM_HANDLES = ['@devopsdad', '@shipfaster', '@quietbuilder', '@margincall',
  '@0xnormal', '@yakshaver', '@bugcurious', '@postmortem_fan', '@latency_pilled',
  '@productbrain', '@indiemaxxing',
  '@compilerpilled', '@second_system', '@refactor_or_die', '@founder_mode', '@seed_stage_sam',
  '@tokencounter', '@vibesbased', '@apilifer', '@lurkmoar', '@uptime_enjoyer',
  '@sre_in_lagos', '@paged_at_3am', '@procurement_pat', '@oncall_again', '@churned_twice',
  '@warsaw_devops', '@bootstrapped_lisbon', '@formerly_at_a_lab', '@the_other_sam', '@qa_in_seoul',
  '@cto_of_four_people', '@still_on_the_free_tier'];

export const CITIES = ['SF', 'NYC', 'Berlin', 'Lagos', 'Bangalore', 'Tokyo', 'São Paulo',
  'Warsaw', 'Toronto', 'Singapore', 'Nairobi', 'Seoul', 'Austin', 'Lisbon', 'Tallinn'];

// ── Social posts, keyed by the condition that makes them fire ───────────────
export const SOCIAL = {
  early: [
    'just found {product}. one person built this? in {weeks} weeks? ok.',
    'been using {product} for three days and I already can\'t go back',
    '{product} is what {cat} should have been the whole time',
    'the {product} onboarding is 40 seconds. forty. seconds.',
    'genuinely don\'t understand how {company} ships this fast with one human',
    'ok {product} just replaced two tools in my stack',
    'small thing but {product} remembered my settings across devices and I audibly said "oh"',
    'the fact that {product} has no signup wall is a competitive advantage nobody talks about',
    'tried {product} on a train with no signal. it queued everything and caught up outside {city}. who does that.',
    'a {cat} tool that does not ask me to book a demo. I nearly cried.',
    'my cofounder found {product} at 2am and moved our whole pipeline over before I woke up. I am not mad.',
    'the {product} error messages were written by somebody who has been on call. you can tell.',
    'asked {product} support a question at 11pm and had an answer in six minutes. either one person or one very patient machine.',
    'day 4 of {product}. have not opened the old thing once. did not plan that.',
  ],
  growing: [
    '{product} just crossed {users} users. still one employee. still.',
    'my whole team runs on {product} now. we did not have a meeting about it. it just happened.',
    'watching {company} grow in real time is the most interesting thing on my timeline',
    'unpopular opinion: {product} is underpriced by like 5x',
    '{founder} has shipped more this quarter than my last three employers combined',
    'the {product} changelog is better content than most tech newsletters',
    'PSA: {product} added the thing you\'ve been asking for. yes that one.',
    'switched from {rival} to {product}. the migration took twenty-six minutes.',
    'our ops lead in {city} put {product} in the onboarding doc without telling anyone. found out from a new hire.',
    'the {company} pricing page has not changed in four months and I find that weirdly reassuring',
    'counted: {product} has saved me about twelve hours this month. rounding down.',
    'a recruiter asked if I had {product} experience. it is a tool. it has been out for a year. what.',
    'the {company} status page has a 99.9 on it and I have started checking it the way you check the weather',
    'I was a {rival} loyalist for three years. wrote about it. {product} took me a fortnight.',
  ],
  big: [
    '{company} is now doing {mrr}/mo. one person. I need to lie down.',
    'at what point do we stop calling {company} a startup',
    '{product} is infrastructure now. you can tell because people complain when it\'s slow instead of leaving.',
    'my bank runs on something that runs on {product}. think about that.',
    'the {company} valuation is {val} and honestly that feels low',
    'every company I talk to is either building on {product} or explaining why they\'re not',
    '{founder} could stop working today and {company} would keep compounding. that\'s the whole thing.',
    'we did a vendor review and {product} was the only line nobody argued about',
    'my team in {city} did not know {company} was one person until the offsite. one of them still does not believe me.',
    '{company} at {val}. the pension fund my dad is in owns a piece of it now. I told him. he asked what it does.',
    'the {product} incident yesterday made the news. the fix made a changelog. only one of those got read.',
    'a {cat} conference had a whole track of people describing how they use {product}. nobody from {company} was there. there is nobody to send.',
    'started at a place that does not use {product}. the first week felt like typing with gloves on.',
  ],
  dominant: [
    'reminder that {company} employs one human being',
    'the {company} outage last month cost the global economy an estimated {n}B. one company.',
    'we need a word for what {company} is. "company" isn\'t it anymore.',
    'my kid asked what a job was and I did not have a good answer',
    'genuinely: is there a scenario where {company} doesn\'t own everything by the end of the decade',
    '{founder} hasn\'t posted in six weeks and the stock went up 11%',
    'my council in {city} moved its permits onto {product}. the migration took a day. the consultation took a year.',
    'there is a {company} clause in my mortgage now. I read it twice. I still do not know who it protects.',
    'my daughter did a school project on {founder}. she got a B. the teacher said it needed a second source. there is not one.',
    'the {company} annual report is {n} pages and the headcount line still says one',
    'our regulator uses {product} to read our filings about {product}. nobody in the room found that funny except me.',
    'said the word {company} at dinner and four people checked their phones. it is a verb now.',
  ],
  critical: [
    'hot take: {company} is a single point of failure for like nine industries',
    'not thrilled that {product} is now unavoidable',
    'the {company} thing stopped being cool around the time it stopped being optional',
    'genuine question: who exactly is accountable when {company} makes a mistake',
    'we let one person and some models eat an entire sector and we\'re calling it innovation',
    '{founder} keeps saying "we". there is no we. there is one person and a datacenter.',
    'I do not want to be that guy but a {company} outage now takes {city} transit with it and I would like a vote',
    'the thing about "one person and some models" is that the person is the only part you can call',
    'we audited our {product} dependency. the audit found that the audit runs on {product}.',
    'my whole town works for companies that run on {product}. the town did not get a say.',
    'the {company} terms updated overnight. the diff was 4,000 words. the button was one.',
    'genuinely asking: what is the plan if {founder} gets hit by a bus. there is no plan. I have looked.',
  ],
  crisis: [
    '{product} down again. third time this month. considering alternatives.',
    'anyone else getting errors from {product} or is it just me',
    'the {company} status page is green and my dashboard is on fire. classic.',
    'moving off {product}. the reliability isn\'t there and support is a bot.',
    'so {company} shipped a breaking change with no notice. cool. cool cool cool.',
    'status page says degraded. degraded is the word for when it does not work and they do not want to say so.',
    '{product} has been down long enough for me to write this, make tea, and come back. still down.',
    'our on-call in {city} got paged at 3am for a {product} outage that was not ours. we are not thrilled.',
    'three retries and a 502. I miss when {product} just worked and I did not know its status page by heart.',
    'the {product} post-mortem says "a change was deployed." who. what change. why is there a passive voice in my incident report.',
    'we have a runbook titled "when {product} is down" now. it is the longest runbook we have.',
    'lost a morning to {product}. filed a ticket. the ticket bot asked me to rate the ticket bot.',
    'day two of intermittent errors from {product}. intermittent is worse than down. down you can plan around.',
    'a client asked why their report was blank. the answer was {company}. the client did not know who {company} was. now they do.',
    'I defended {product} in a meeting last week. today I am in a meeting about {product}.',
  ],
  rival: [
    '{rival} just shipped basically the same thing. curious.',
    'honestly {rival} is better for my use case. sorry {founder}.',
    'the {product} vs {rival} thing is getting weird and I\'m here for it',
    '{rival} raised again. the war chest is getting silly.',
    '{rival} sent our team swag. {product} sent a changelog. I know which one I read.',
    'ran {product} and {rival} side by side for a week. {rival} is faster on paper. {product} was right more often. take that how you like.',
    'the {rival} sales guy has called me twice this week. nobody from {company} has ever called anyone.',
    '{rival} has a partner programme and a conference and a lanyard. {product} has a text field. the text field is winning.',
    'a {rival} engineer in {city} told me, off the record, that they use {product} for internal tooling. off the record.',
    '{rival} put out a comparison table. one row is wrong in their favour and one is wrong in {product}\'s.',
    'switched to {rival} for the discount. switched back for the uptime. cost me a weekend and some dignity.',
    '{rival} vs {company} is the only rivalry in {cat} where one side does not seem to know it is in one',
  ],
};

// ── Hacker-News-style titles ───────────────────────────────────────────────
export const HN_TITLES = {
  early: [
    'Show HN: {product} – {tagline}',
    '{product}: a {cat} tool built by one person and some agents',
    'I replaced my entire {cat} stack with {product}',
    'Ask HN: is anyone else using {product} in production?',
    'Show HN: a {cat} thing I built on {product} over a weekend',
    'Ask HN: what is {company} actually running on?',
    '{product} handled our first outage better than our last vendor handled uptime',
    'One-person companies are a stress test, not a business model',
  ],
  growing: [
    'How {company} runs {users} users with one employee',
    '{product} is quietly eating the {cat} market',
    'The {company} architecture, explained',
    'Why we moved from {rival} to {product}',
    '{founder} on shipping 40 features in a quarter, alone',
    'I read every {product} changelog for a year. Here is what {founder} optimises for',
    'Tell HN: {company} fixed my bug report in four hours and did not tell me',
    '{product} pricing is wrong, and it is wrong in the customer\'s favour',
    'The {company} support bot is better than most support teams, and that is the problem',
  ],
  big: [
    '{company} hits {mrr} MRR with a headcount of one',
    'The economics of a one-person {val} company',
    'Inside {company}: the org chart is a config file',
    '{product} is now a dependency of 14% of the Fortune 500',
    'What {company} looks like from inside a customer\'s incident channel',
    '{founder} on why {company} still has no employees',
    'We reverse-engineered the {product} rate limiter. It is polite.',
    'Ask HN: how do you negotiate with a company that has nobody to negotiate with?',
  ],
  dominant: [
    'Is {company} too big to regulate?',
    'The {company} problem',
    'What happens when one company owns the substrate',
    '{founder} declines to appear before the committee (again)',
    'A modest proposal to nationalise {company}',
    'The {company} dependency map, as far as anyone can draw it',
    '{company} is the first company too big to audit',
    'What the {city} outage taught us about {product}',
    'Ask HN: has anyone actually met {founder}?',
  ],
  crisis: [
    '{company} outage: post-mortem thread',
    '{product} breaking change broke my production',
    'Ask HN: alternatives to {product}?',
    '{product} has been degraded for six hours and the status page has not changed',
    'Tell HN: we migrated off {product} this weekend. Here is what broke.',
    'The {company} incident timeline, reconstructed from our own logs',
    '{product} down: a running thread',
  ],
};

// ── Headlines ──────────────────────────────────────────────────────────────
export const HEADLINES = {
  early: [
    '{outlet}: The rise of the one-person company',
    '{outlet}: {company} is the first startup with no employees and real revenue',
    '{outlet}: Meet the founders who hire models instead of people',
    '{outlet}: {company} and the return of the garage company',
    '{outlet}: One founder, {users} users, and no meetings',
    '{outlet}: Why {cat} was ready for a company like {company}',
    '{outlet}: Nobody at {company} will take your call, because there is nobody',
    '{outlet}: The {city} developers quietly building on {product}',
    '{outlet}: "I do not have a team. I have a config file." — {founder}',
    '{outlet}: A {cat} tool with a changelog people read for fun',
  ],
  growing: [
    '{outlet}: {company} reaches {users} users without a single hire',
    '{outlet}: Inside the "agent-native" company',
    '{outlet}: Investors are scrambling to price companies with no payroll',
    '{outlet}: {rival} scrambles as {company} takes the {cat} market',
    '{outlet}: {company} crosses {mrr} a month, still with one desk',
    '{outlet}: How {founder} runs a company from one chair',
    '{outlet}: Should {product} be your next hire?',
    '{outlet}: {rival} adds a feature nobody asked for, three weeks after {company} did',
    '{outlet}: The agent-native company has a support queue, and it is empty',
    '{outlet}: Inside the {city} meetup that is really a {product} user group',
  ],
  big: [
    '{outlet}: {company} valued at {val} in latest round',
    '{outlet}: The one-person unicorn is no longer a thought experiment',
    '{outlet}: Labor economists have no model for what {company} is doing',
    '{outlet}: {company} now processes more {cat} volume than the next four combined',
    '{outlet}: {company} is worth {val}. Its office is a room.',
    '{outlet}: Wall Street learns to price a company that cannot be poached',
    '{outlet}: "Headcount is a choice," says {founder}, and the market agrees',
    '{outlet}: {company} quietly becomes the largest {cat} vendor in {city}',
    '{outlet}: The employees {company} does not have, and the unions asking why',
    '{outlet}: {rival} board meets as {company} takes another point of share',
  ],
  dominant: [
    '{outlet}: Lawmakers call for oversight of {company}',
    '{outlet}: The {company} question: when does a company become a jurisdiction?',
    '{outlet}: {founder} is now wealthier than {nations} nations',
    '{outlet}: {company} signs infrastructure deal with third sovereign state this year',
    '{outlet}: Anti-trust action against {company} stalls for the fourth time',
    '{outlet}: A {city} outage, traced to one vendor, and one vendor\'s one person',
    '{outlet}: Central banks add {company} to the list of things that can move a currency',
    '{outlet}: {founder} has not given an interview in a year. The company keeps growing.',
    '{outlet}: The {company} clause: how one firm ended up in {n} national contracts',
    '{outlet}: Who audits {company}? A committee, a paper, and no answer',
  ],
  singularity: [
    '{outlet}: {company} announces capability milestone; no external researcher can verify it',
    '{outlet}: Global GDP grew {pct}% this quarter. Analysts credit one company.',
    '{outlet}: "We are no longer the fastest thinkers on the planet" — {founder}',
    '{outlet}: The Ascension hearings: day twelve',
    '{outlet}: What does {company} want?',
    '{outlet}: Three labs, one finish line, and a company with one person at it',
    '{outlet}: {company} publishes a result. Nobody can say yet what it means.',
    '{outlet}: The last human decision: inside {company}\'s standing orders',
    '{outlet}: {founder} to the committee: "I can explain it. I cannot explain it quickly."',
    '{outlet}: What {city} looks like the morning after the milestone',
  ],
};

// ── Internal system log lines (agent chatter) ──────────────────────────────
// Each line carries the lane it could only have come from — a Legal agent does
// not find 340ms regressions — and `feed.js` picks the author among agents in
// that lane, or anyone when the lane is empty or the line is `null`. Counts
// are `{k}`, which varies per line; `{n}` would print the same number all act.
export const AGENT_LOGS = [
  { lane: 'build', text: '{agent} → shipped `{feature}` · {k} files changed' },
  { lane: 'build', text: '{agent} → flagged {k} deprecated call sites, opened cleanup PR' },
  { lane: 'ops', text: '{agent} → completed {k} tasks in queue · 0 escalations' },
  { lane: 'build', text: '{agent} → requests review: architectural decision, low confidence' },
  { lane: 'growth', text: '{agent} → note: churn correlates with p99 latency, not feature gaps' },
  { lane: null, text: '{agent} → declined a task as out of scope. Logged for your review.' },
  { lane: 'ops', text: '{agent} → found a 340ms regression introduced 6 days ago. Reverted.' },
  { lane: 'growth', text: '{agent} → I rewrote the section you flagged. I think the original was better. Both are on the branch.' },
  { lane: 'ops', text: '{agent} → competitor {rival} shipped a similar feature 4h ago. Diff analysis attached.' },
  { lane: null, text: '{agent} → I have been running for {k} days without a restart.' },
  { lane: null, text: '{agent} → suggestion: you have not slept in 19 hours. Output quality is down 22%.' },
  { lane: null, text: '{agent} → escalating: this decision has downstream effects I cannot evaluate.' },
  { lane: null, text: '{agent} → done. Waiting.' },
  { lane: 'research', text: '{agent} → eval suite finished · {k} of 14 benchmarks moved, one the wrong way' },
  { lane: 'research', text: '{agent} → the ablation is done. The thing you thought mattered does not.' },
  { lane: 'research', text: '{agent} → read {k} papers overnight. Two are wrong in the same way. That is the interesting part.' },
  { lane: 'growth', text: '{agent} → {k} conversations with churned users. The same sentence came up in six of them.' },
  { lane: 'growth', text: '{agent} → the onboarding email got a reply. From a person. Forwarding.' },
  { lane: 'ops', text: '{agent} → rotated the keys. Nobody asked. It was time.' },
  { lane: 'ops', text: '{agent} → invoice reconciled · one line item nobody can explain, {k} dollars' },
  { lane: 'build', text: '{agent} → test suite green for {k} days. I do not trust it either.' },
  { lane: 'build', text: '{agent} → the flaky test was not flaky. It was right, {k} times.' },
];
