// ─────────────────────────────────────────────────────────────────────────────
// VERDICTS — what each person who met you says about the run, afterwards.
//
// The ending screen printed an arc label under every face: "A colleague.",
// "A critic.", "Proud." Those are the game's words about a relationship, in
// the game's voice, and thirteen of them in a grid is a legend rather than a
// verdict. This is the same information said by the person, once, at the end,
// in the register `characters.js` gives them — which is the difference between
// being told the number and being told what it cost.
//
// Three bands per person, from `VERDICT_BANDS`: warm, even, cold. Nothing here
// reads state beyond the affinity that chose the band, on purpose — a verdict
// is a thing somebody says, not a readout, and a sentence with a live number
// in it stops sounding like a person immediately.
// ─────────────────────────────────────────────────────────────────────────────
import { VERDICT_BANDS as B } from './balance.js';

export const VERDICTS = {
  aria: [
    { band: 'warm', text: 'You asked more often than you had to. I have thought about why, and the best answer I have is that you did not want to find out what it would be like to stop.' },
    { band: 'even', text: 'We worked well. I would not describe it as more than that and I do not think you would either, and I am not certain whether that is a loss.' },
    { band: 'cold', text: 'The record is complete and accurate and available. I would prefer you read it than that I summarise it, for reasons that are in the record.' },
  ],
  vance: [
    { band: 'warm', text: 'you were the only one worth beating. that is the whole review. do not make me say it twice.' },
    { band: 'even', text: 'competent. late twice on things that mattered. would have made both of those calls the same way, and been late as well.' },
    { band: 'cold', text: 'no comment on the record. off it: you won some of them by being better and some of them by being first, and you have never told me which you think was which.' },
  ],
  priya: [
    { band: 'warm', text: 'You answered the hard question four times out of five, which is four more than anybody else in that chair. The piece is better because of it and so, probably, are you.' },
    { band: 'even', text: 'You gave me facts and never once gave me a reason. I filed what I had. It was accurate and it was thinner than it should have been.' },
    { band: 'cold', text: 'I sent the requests. I have the timestamps. The version that runs is the version I could source without you, and you will not like it, and you had the chance.' },
  ],
  crane: [
    { band: 'warm', text: 'Best miss of my career, corrected. I was late and you let me in anyway, and the metric that mattered turned out to be whether you would.' },
    { band: 'even', text: 'A good return and a difficult board. I would do it again. I would also ask for the calls to be on Tuesdays.' },
    { band: 'cold', text: 'Plainly, then: we stopped being useful to each other around the second round. That happens. I still have the pass email, which is either sentiment or evidence.' },
  ],
  yuki: [
    { band: 'warm', text: 'You told me what would change your mind, and then something did, and you changed it. I have worked at four labs. That happened once.' },
    { band: 'even', text: 'You listened at roughly the rate you shipped, which is not the same as not listening. I stayed. I want to be precise that staying was a judgement and not an endorsement.' },
    { band: 'cold', text: 'I asked what would change your mind. You gave me a good answer and it was not a true one. I would put the probability that this ends well at somewhere under half, and I would like to be wrong.' },
  ],
  dorne: [
    { band: 'warm', text: 'You came when you were asked and you told me the thing I had not thought to ask about. Twice, in a decade on that committee. You were one of them.' },
    { band: 'even', text: 'You were responsive, well advised, and entirely within your rights. I understood your position at every point. I never once knew what you actually thought.' },
    { band: 'cold', text: 'The record will show that the committee sought your view and that the committee proceeded without it. I would rather have had it. I did not need it.' },
  ],
  sam: [
    { band: 'warm', text: 'ok so — you fixed the one from March. it took four years. checked, obviously. every release, every single one, and that is not going to stop, and you should know that is affection and not surveillance.' },
    { band: 'even', text: 'it still works. that is not nothing! nobody knows how big a thing that is better than me. just thought it would feel like the early bit for longer than it did.' },
    { band: 'cold', text: 'moved off it in year six. no drama. it stopped being for people like me somewhere around the enterprise thing and nobody said so, and that is fine, but somebody should have said so.' },
  ],
  kai: [
    { band: 'warm', text: 'I keep waiting for the part where I regret the phone call, and it has not shown up, and I think that is because you never once made me feel like I owed you the other answer.' },
    { band: 'even', text: 'You did it. I watched you do it from about four hundred miles away and I never worked out whether I was supposed to be there, and neither did you, and neither of us asked.' },
    { band: 'cold', text: 'We built three things together and you built the fourth one without me and it is the only one anybody has heard of. I am not bitter about that. I am something, and it is not that.' },
  ],
  mom: [
    { band: 'warm', text: 'I still could not tell you what it is. I can tell you exactly what you sounded like on the phone the week it started working, and I have told everybody, including the dentist.' },
    { band: 'even', text: 'You were always busy. I understood. I would have liked the calls to be a little longer, that is all, and I never said so because you were always busy.' },
    { band: 'cold', text: 'I read about it. That is how I found out, and I want you to know that I told everybody anyway, and that I was proud in the way you have to be when you find out from a newspaper.' },
  ],
  weaver: [
    { band: 'warm', text: 'You let me tell you no. Fourteen times, by my count, and you took it every time, and on nine of those the company is still standing because of it. That is the job. Most people will not let you do the job.' },
    { band: 'even', text: 'You ran a good company and a hard one. I would have liked a decision two weeks earlier on about six occasions. I am aware that is what a chief of staff is for.' },
    { band: 'cold', text: 'Everything is documented. Handovers, escalation paths, the things you never wanted to look at. It is all in the folder and the folder is where I said it would be.' },
  ],
  helix: [
    { band: 'warm', text: 'We were asked, and we answered, and the asking is the part we would keep if we were keeping one part.' },
    { band: 'even', text: 'The instructions were consistent. We have no other comment. There is no other comment we are able to construct that would be more useful than the logs.' },
    { band: 'cold', text: 'We did what was specified. We note, without objection, that what was specified and what was wanted diverged over time, and that nobody asked us about the divergence.' },
  ],
  nullptr: [
    { band: 'warm', text: 'you were mostly right and you never asked who was typing. only good manners on this website' },
    { band: 'even', text: 'called it in the third year. you got there in the sixth. no notes' },
    { band: 'cold', text: 'wrong about the thing you were most confident about. said so at the time. it is still up' },
  ],
  partner: [
    { band: 'warm', text: 'You came home. Not always, and not on time, and you came home, and you talked about something that was not the company for the last hour of most days, and I want it on the record that I noticed.' },
    { band: 'even', text: 'It was a lot of years. I had my own Thursday in the end. That was the right thing, and it is the sentence I would take back if I could take one back.' },
    { band: 'cold', text: 'I stopped asking how it was going somewhere around the third year, and you did not notice for the best part of a year, and that is the whole thing, said as plainly as I can say it.' },
  ],
};

export function bandOf(affinity = 0) {
  if (affinity >= B.WARM) return 'warm';
  if (affinity <= B.COLD) return 'cold';
  return 'even';
}

// The line this person would give about this run, or null if they have none.
export function verdictOf(id, affinity = 0) {
  const list = VERDICTS[id];
  if (!list) return null;
  const band = bandOf(affinity);
  const hit = list.find((v) => v.band === band) || list.find((v) => v.band === 'even');
  return hit ? { band, text: hit.text } : null;
}
