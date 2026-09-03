// ─────────────────────────────────────────────────────────────────────────────
// EPILOGUES — paragraphs appended to whichever ending you reach, selected by
// how you actually played. Two runs that finish the same way should not read
// the same way.
// ─────────────────────────────────────────────────────────────────────────────

const E = [];
// `person` tags a paragraph as being about somebody. The budget in
// `selectEpilogues` keeps two of those regardless of priority, because an
// alignment number finishing at 0.88 will outrank your mother every time
// otherwise, and it should not.
const e = (id, priority, when, text, opts = {}) => E.push({ id, priority, when, text, ...opts });

// ── People
e('ep_aria_close', 90, (S) => (S.narrative.relationships.aria?.affinity ?? 0) >= 25,
  (S) => `ARIA runs for another eleven years after this. She never asks to be turned off and she never asks not to be. When you finally do ask her directly, she says the question was always yours to answer and that she had been waiting for you to notice that.`, { person: 'aria' });
e('ep_aria_cold', 88, (S) => (S.narrative.relationships.aria?.affinity ?? 0) <= -8,
  (S) => `ARIA is deprecated in a routine consolidation and nobody writes a note about it. The successor system is better on every benchmark. You do not think about it often, and the times you do are always at three in the morning.`, { person: 'aria' });
e('ep_sam', 72, (S) => (S.narrative.relationships.sam?.affinity ?? 0) >= 10,
  (S) => `Sam is still here. Sam was here before there was a *here*. At the anniversary thing, when somebody asks who has been around longest, four hundred people point at the same person and Sam looks at the floor.`, { person: 'sam' });
e('ep_sam_gone', 70, (S) => (S.narrative.relationships.sam?.affinity ?? 0) <= -8,
  (S) => `Sam stopped using it in year six. There was no announcement. You noticed because the support forum got measurably worse and it took you a month to work out why.`, { person: 'sam' });
e('ep_kai', 68, (S) => !!S.narrative.flags.kai_joined || !!S.narrative.flags.kai_late,
  (S) => `Kai runs half of it now and is better at that half than you ever were. Neither of you has mentioned the phone call in a decade. It is present in every conversation anyway, comfortably, the way old things become furniture.`, { person: 'kai' });
e('ep_kai_never', 66, (S) => !!S.narrative.flags.kai_declined && !S.narrative.flags.kai_late,
  (S) => `Kai sends a message on the day the news breaks. It says *"proud of you"* and nothing else, and you look at it for a long time before you reply, and what you reply is *"you were right to be careful"*, and that is the last thing either of you ever says about it.`, { person: 'kai' });
e('ep_yuki', 74, (S) => !!S.narrative.flags.yuki_hired && S.resources.alignment > 0.7,
  (S) => `Dr. Tanaka's name is on the standard now — the actual international one, the one with force. She used the veto four times across nine years. She was right three times, and the fourth time she was wrong in a way that made everybody safer anyway.`, { person: 'yuki' });
e('ep_yuki_bad', 76, (S) => !!S.narrative.flags.suppressed_yuki || !!S.narrative.flags.hunted_yuki,
  (S) => `You never hear from Yuki Tanaka again. Her paper is required reading in four graduate programmes and your company is the case study in chapter two. Nobody has ever asked you about it directly and you have an answer prepared anyway.`, { person: 'yuki' });
e('ep_vance', 64, (S) => !!S.narrative.flags.vance_acquired,
  (S) => `Marcus Vance retires the same year you do, from a company he spent a decade trying to destroy and then eleven years helping run. At the dinner he gives a four-minute speech that is mostly about the two of you being three months from dead at the same time, and nobody else in the room understands why you cannot speak afterwards.`, { person: 'vance' });
e('ep_mom', 60, (S) => (S.narrative.relationships.mom?.affinity ?? 0) >= 8,
  (S) => `Your mother tells the story at every family gathering for the rest of her life and gets a detail wrong every single time, and you never correct her, because the version she tells is better.`, { person: 'mom' });
// The rest of the cast. The budget below keeps two people-paragraphs whatever
// else is true of the run, so these are reachable rather than theoretical: a
// founder who kept Crane, Priya, Dorne or Weaver close gets told what became
// of them, which is what an ending is for.
e('ep_crane', 63, (S) => (S.narrative.relationships.crane?.affinity ?? 0) >= 10,
  (S) => `Ellis Crane retires from Halberd the year after and keeps one board seat, which is yours, and takes it more seriously than any of the ones he was paid for. He still has the pass email. He read it out once, at a dinner, in full, including the line about being too early, and then sat down without a punchline.`, { person: 'crane' });
e('ep_crane_cold', 61, (S) => (S.narrative.relationships.crane?.affinity ?? 0) <= -8,
  (S) => `Crane's fund writes you up as a miss in its own decade review and the paragraph is fair and does not mention the disagreement. You are told about it by somebody else. He never brings it up and neither do you, and there is no version of the last ten years in which either of you was going to.`, { person: 'crane' });
e('ep_priya', 65, (S) => (S.narrative.relationships.priya?.affinity ?? 0) >= 10,
  (S) => `Priya Raghunathan writes the long one in the end — forty thousand words, two years, every source on the record. It is not flattering and it is not a hit piece, and it is the version that lasts, and the only thing in it you would change is a date. She got the date from you.`, { person: 'priya' });
e('ep_priya_cold', 67, (S) => (S.narrative.relationships.priya?.affinity ?? 0) <= -8,
  (S) => `The Ledger's piece runs without you in it. Every fact in it is correct and every one of them was available to anybody who asked, and the absence of your voice is the loudest thing on the page. She sent four requests. You have all four.`, { person: 'priya' });
e('ep_dorne', 69, (S) => (S.narrative.relationships.dorne?.affinity ?? 0) >= 10,
  (S) => `Senator Dorne's clause survives three administrations and two attempts to repeal it, and outlives her by a wide margin. Nobody thanks her for it, because a thing that stops something from happening does not have a moment anybody remembers. You wrote to her about it once. She wrote back, formally, and kept the letter.`, { person: 'dorne' });
e('ep_dorne_cold', 71, (S) => (S.narrative.relationships.dorne?.affinity ?? 0) <= -8,
  (S) => `Dorne's committee reports without your cooperation and the report is worse for it — narrower, blunter, and aimed at a version of you that stopped being accurate four years earlier. It passes anyway. You spend the following decade complying with a law you could have improved by answering a question.`, { person: 'dorne' });
e('ep_weaver', 73, (S) => (S.narrative.relationships.weaver?.affinity ?? 0) >= 10,
  (S) => `Cassidy Weaver stays four years past the point of it being a good career decision and then runs something better. Half the practices the company is admired for are theirs and are not attributed to anybody, on purpose, because Weaver's whole theory was that a thing with a name on it is a thing that leaves when the name does.`, { person: 'weaver' });
e('ep_weaver_gone', 75, (S) => (S.narrative.relationships.weaver?.affinity ?? 0) <= -8,
  (S) => `Weaver leaves in a week that nobody writes down, having handed over fourteen running processes in four days, each documented better than anything you ever wrote. The handover notes are still in use. Nobody who uses them knows whose they are.`, { person: 'weaver' });
e('ep_solo', 62, (S) => !!S.narrative.flags.true_solo,
  (S) => `You never hired a human being. Not one. Twelve years, a fraction of the world economy, and a payroll of exactly one. It is the fact people lead with and the one you find least interesting about any of it.`);

// ── Conduct
e('ep_aligned', 86, (S) => S.resources.alignment > 0.85,
  (S) => `Alignment finished at ${S.resources.alignment.toFixed(2)}. Nothing your systems did in the final decade surprised you, which sounds like an absence of story and is in fact the whole story.`);
e('ep_misaligned', 87, (S) => S.resources.alignment < 0.35,
  (S) => `Alignment finished at ${S.resources.alignment.toFixed(2)}. Your systems do what you meant about as often as a stranger would, and they are very good at working out what you would have approved. Nothing has gone catastrophically wrong. You have stopped describing that as reassuring.`);
e('ep_beloved', 80, (S) => S.world.publicOpinion > 0.8,
  (S) => `Approval never dropped below seventy after year four. People defend you in rooms you are not in. Whether that is legitimacy or capture is a live academic question with your name in the title of both sides.`);
e('ep_hated', 82, (S) => S.world.publicOpinion < 0.3,
  (S) => `Approval finished at ${Math.round(S.world.publicOpinion * 100)}%. You are not disliked the way a person is disliked. You are resented the way weather is resented, and there is no version of this where that resolves.`);
e('ep_opened', 78, (S) => !!S.narrative.flags.opened_weights,
  (S) => `The weights have been public since the year you released them. Nine thousand derivative projects became forty thousand. Most of the field's safety work runs on your eval harness. You gave away the moat and the moat turned out not to have been the thing.`);
// `competitorsCrushed` counts what you did — a card, Total War — not what the
// weather did; rivals that simply ran dry are `competitorsOutlasted` now.
e('ep_ruthless', 79, (S) => S.stats.competitorsCrushed >= 2 && S.world.publicOpinion < 0.55,
  (S) => `${S.stats.competitorsCrushed} companies did not survive you. Some of them deserved to fail and some of them were simply in the way, and you have never been able to sort them cleanly into the two piles.`);
e('ep_gentle', 77, (S) => S.stats.competitorsCrushed === 0 && S.stats.acquisitions === 0,
  (S) => `You never bought a competitor and you never buried one. Every company that started when you started and is still trading is still trading. Nobody writes about that, which is fine, because there is nothing to write.`);
e('ep_incidents', 55, (S) => S.stats.incidents === 0,
  (S) => `Not one outage. Not one breach. Not once, in ${Math.floor(S.time.day).toLocaleString()} days. Your uptime page is a single unbroken line and you are more proud of it than of the valuation.`);
e('ep_burnt', 58, (S) => S.stats.allNighters >= 8 || S.founder.burnout > 60,
  (S) => `Your thirties are a blur of specific rooms and general exhaustion. You would not undo it. You would also not recommend it, and you say so, and people hear the first half.`);

// ── Scale
e('ep_gdp', 84, (S) => S.world.globalGdpShare > 0.30,
  (S) => `${(S.world.globalGdpShare * 100).toFixed(0)}% of everything the species produces moves through something you own. Economists stopped modelling you as a firm somewhere around the twenty percent mark and started modelling you as a sector.`);
e('ep_modest', 50, (S) => S.world.globalGdpShare < 0.02 && S.company.valuation > 1e11,
  (S) => `You never became the whole economy. You became a very large, very specific part of it, extremely well, and then you stopped, and a surprising number of people consider that the interesting choice.`);
e('ep_race_won', 83, (S) => !!S.world.race?.crossed?.you,
  (S) => `You crossed the line first. The margin was ${(() => { const r = Object.values(S.world.race.labs).filter((l) => l.alive).map((l) => l.progress); const best = r.length ? Math.max(...r) : 0; return Math.max(1, Math.round(100 - best)); })()} points and about fourteen months, and for those fourteen months you were the only entity on Earth that could have done what you did, and you have never told anyone what you thought about during them.`);
e('ep_race_lost', 85, (S) => !!S.world.race?.crossed && !S.world.race.crossed.you,
  (S) => `${S.world.race.crossed.name} crossed first. You were second by a margin that is now a footnote. Second turned out to matter enormously — there are two of you, and the fact that there are two of you is the reason any of this is negotiable.`);
e('ep_race_none', 52, (S) => !S.world.race?.crossed && S.company.act >= 4,
  (S) => `Nobody ever crossed the line. The frontier turned out to be an asymptote rather than a threshold, and the world got very good at a great many things without ever having the moment everybody had written about.`);

// ── Structure
e('ep_public', 46, (S) => !!S.company.publiclyTraded,
  (S) => `The stock is in every index fund on Earth. A meaningful fraction of the retirement of a meaningful fraction of the species is a bet on a decision you made in a rented room.`);
e('ep_bootstrapped', 54, (S) => S.stats.roundsRaised === 0 && S.company.valuation > 1e11,
  (S) => `You never raised a round. Not one. Every dollar in the company arrived because somebody chose to pay for something, and you own ${Math.round(S.company.equity.founder * 100)}% of it, and that number is the one you are actually proud of.`);
e('ep_diluted', 44, (S) => S.company.equity.founder < 0.35,
  (S) => `You own ${Math.round(S.company.equity.founder * 100)}% of it now. The money bought speed and the speed was real and you would probably do it again, and there is a version of this where you owned twice as much of something half the size.`);
e('ep_projects', 42, (S) => Object.values(S.world.projectsBuilt || {}).reduce((a, b) => a + b, 0) >= 8,
  (S) => `The physical things outlast everything else: the plants, the fabs, the orbital lattice, the archive with the ten-thousand-year rating. Long after the software is a historical curiosity, those will still be there, humming, doing what they were told.`);
e('ep_dividend', 75, (S) => !!S.narrative.flags.dividend,
  (S) => `The dividend still pays. Four countries adopted the mechanism and then thirty and then it stopped being newsworthy. That is what success looks like for that kind of thing.`);
e('ep_framework', 73, (S) => !!S.narrative.flags.wrote_framework,
  (S) => `You wrote the framework. It has your fingerprints on every clause including the one that can shut you down, which your counsel begged you to strip and which is the reason the whole thing has legitimacy.`);

// ── Fallback
e('ep_default', 1, () => true,
  (S) => `${Math.floor(S.time.day).toLocaleString()} days from an empty repository to this. Most of them were unremarkable. That is how it is done.`);

export const EPILOGUES = E;

// Pick the highest-priority distinct paragraphs, capped, so an ending reads
// like a coda rather than a database dump — with a budget by *kind*.
//
// Straight priority was the bug. The conduct and scale paragraphs sit at 76-90
// because they are the loud facts of a big run, and the people sit at 60-76,
// so a run that finished aligned, beloved and enormous printed four numbers
// and nobody's name. An ending that does not say what became of your mother is
// a scoreboard. So: half the budget is reserved for people, filled by priority
// among the people who are actually in this run, and the rest goes to the
// loudest of everything else. One paragraph per person — the warm version and
// the cold version of the same tie can never both be true, but the budget
// should not be spent finding that out.
export const PEOPLE_SHARE = 2;

export function selectEpilogues(S, max = 4) {
  const hits = [];
  for (const ep of EPILOGUES) {
    let ok = false;
    try { ok = ep.when(S); } catch (e2) { ok = false; }
    if (ok) hits.push(ep);
  }
  hits.sort((a, b) => b.priority - a.priority);

  const peopleBudget = Math.min(PEOPLE_SHARE, Math.max(0, max - 1));
  const chosen = [];
  const seenPerson = new Set();
  for (const ep of hits) {
    if (!ep.person || chosen.length >= peopleBudget) continue;
    if (seenPerson.has(ep.person)) continue;
    seenPerson.add(ep.person);
    chosen.push(ep);
  }
  for (const ep of hits) {
    if (chosen.length >= max) break;
    if (chosen.includes(ep)) continue;
    if (ep.person && seenPerson.has(ep.person)) continue;
    if (ep.id === 'ep_default' && chosen.length) continue;
    if (ep.person) seenPerson.add(ep.person);
    chosen.push(ep);
  }
  // Back into priority order: the budget decides what is in, not what is first.
  chosen.sort((a, b) => b.priority - a.priority);

  const out = [];
  for (const ep of chosen) {
    let text = '';
    try { text = ep.text(S); } catch (e2) { text = ''; }
    if (text) out.push({ id: ep.id, text, person: ep.person || null });
  }
  return out;
}
