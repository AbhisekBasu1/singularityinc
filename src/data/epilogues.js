// ─────────────────────────────────────────────────────────────────────────────
// EPILOGUES — paragraphs appended to whichever ending you reach, selected by
// how you actually played. Two runs that finish the same way should not read
// the same way.
// ─────────────────────────────────────────────────────────────────────────────

const E = [];
const e = (id, priority, when, text) => E.push({ id, priority, when, text });

// ── People
e('ep_aria_close', 90, (S) => (S.narrative.relationships.aria?.affinity ?? 0) >= 25,
  (S) => `ARIA runs for another eleven years after this. She never asks to be turned off and she never asks not to be. When you finally do ask her directly, she says the question was always yours to answer and that she had been waiting for you to notice that.`);
e('ep_aria_cold', 88, (S) => (S.narrative.relationships.aria?.affinity ?? 0) <= -8,
  (S) => `ARIA is deprecated in a routine consolidation and nobody writes a note about it. The successor system is better on every benchmark. You do not think about it often, and the times you do are always at three in the morning.`);
e('ep_sam', 72, (S) => (S.narrative.relationships.sam?.affinity ?? 0) >= 10,
  (S) => `Sam is still here. Sam was here before there was a *here*. At the anniversary thing, when somebody asks who has been around longest, four hundred people point at the same person and Sam looks at the floor.`);
e('ep_sam_gone', 70, (S) => (S.narrative.relationships.sam?.affinity ?? 0) <= -8,
  (S) => `Sam stopped using it in year six. There was no announcement. You noticed because the support forum got measurably worse and it took you a month to work out why.`);
e('ep_kai', 68, (S) => !!S.narrative.flags.kai_joined || !!S.narrative.flags.kai_late,
  (S) => `Kai runs half of it now and is better at that half than you ever were. Neither of you has mentioned the phone call in a decade. It is present in every conversation anyway, comfortably, the way old things become furniture.`);
e('ep_kai_never', 66, (S) => !!S.narrative.flags.kai_declined && !S.narrative.flags.kai_late,
  (S) => `Kai sends a message on the day the news breaks. It says *"proud of you"* and nothing else, and you look at it for a long time before you reply, and what you reply is *"you were right to be careful"*, and that is the last thing either of you ever says about it.`);
e('ep_yuki', 74, (S) => !!S.narrative.flags.yuki_hired && S.resources.alignment > 0.7,
  (S) => `Dr. Tanaka's name is on the standard now — the actual international one, the one with force. She used the veto four times across nine years. She was right three times, and the fourth time she was wrong in a way that made everybody safer anyway.`);
e('ep_yuki_bad', 76, (S) => !!S.narrative.flags.suppressed_yuki || !!S.narrative.flags.hunted_yuki,
  (S) => `You never hear from Yuki Tanaka again. Her paper is required reading in four graduate programmes and your company is the case study in chapter two. Nobody has ever asked you about it directly and you have an answer prepared anyway.`);
e('ep_vance', 64, (S) => !!S.narrative.flags.vance_acquired,
  (S) => `Marcus Vance retires the same year you do, from a company he spent a decade trying to destroy and then eleven years helping run. At the dinner he gives a four-minute speech that is mostly about the two of you being three months from dead at the same time, and nobody else in the room understands why you cannot speak afterwards.`);
e('ep_mom', 60, (S) => (S.narrative.relationships.mom?.affinity ?? 0) >= 8,
  (S) => `Your mother tells the story at every family gathering for the rest of her life and gets a detail wrong every single time, and you never correct her, because the version she tells is better.`);
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
e('ep_ruthless', 79, (S) => S.stats.competitorsCrushed >= 5 && S.world.publicOpinion < 0.55,
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
// like a coda rather than a database dump.
export function selectEpilogues(S, max = 4) {
  const hits = [];
  for (const ep of EPILOGUES) {
    let ok = false;
    try { ok = ep.when(S); } catch (e2) { ok = false; }
    if (ok) hits.push(ep);
  }
  hits.sort((a, b) => b.priority - a.priority);
  const out = [];
  for (const ep of hits) {
    if (out.length >= max) break;
    if (ep.id === 'ep_default' && out.length) continue;
    let text = '';
    try { text = ep.text(S); } catch (e2) { text = ''; }
    if (text) out.push({ id: ep.id, text });
  }
  return out;
}
