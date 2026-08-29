// ─────────────────────────────────────────────────────────────────────────────
// PARITY — is the base game still the base game?
//
// The WebMCP layer is supposed to be additive: with no assistant present it
// should change nothing at all. `tools/balance.mjs` cannot show that, because it
// draws a fresh random seed for every run — a five-run sample moved Act II from
// a median of 104 to 126 and that looked like a regression until it was measured
// properly. It was noise.
//
// This measures it properly. Same seed, same bot, two checkouts, and it prints
// the act days, the cash to the dollar, and the position of the RNG after 1,500
// days. Identical output means identical simulation.
//
//   git worktree add /tmp/base <the commit before the layer>
//   for s in 11111 22222 33333; do
//     node tools/parity.mjs . $s
//     node tools/parity.mjs /tmp/base $s
//   done
//
// Measured on the commit that added this: identical on all three seeds, down to
// `rngProbe` — the same draw from the same position in the same stream.
// ─────────────────────────────────────────────────────────────────────────────
// Same seed, same bot, both trees. If the base game changed, this shows it.
// Resolve the checkout to compare against as an absolute file URL, so `.` means
// this repository rather than this file's directory.
const path = await import('node:path');
const url = await import('node:url');
const ROOT = url.pathToFileURL(path.resolve(process.argv[2] || '.')).href;
globalThis.performance = globalThis.performance || { now: () => Date.now() };
globalThis.localStorage = { _d:{}, getItem(k){return this._d[k]??null}, setItem(k,v){this._d[k]=String(v)}, removeItem(k){delete this._d[k]} };
globalThis.window = { addEventListener(){}, innerWidth:1600, innerHeight:900 };
globalThis.document = { addEventListener(){}, getElementById:()=>null, querySelector:()=>null,
  querySelectorAll:()=>[], createElement:()=>({style:{},classList:{add(){},remove(){},toggle(){}},appendChild(){},remove(){},addEventListener(){}}),
  body:{appendChild(){}}, hidden:false };
globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = () => {};
globalThis.btoa = s => Buffer.from(s,'binary').toString('base64');
globalThis.atob = s => Buffer.from(s,'base64').toString('binary');

const { newGame, setState } = await import(ROOT + '/src/engine/state.js');
const StateMod = await import(ROOT + '/src/engine/state.js');
const Game = await import(ROOT + '/src/game.js');
const Loop = await import(ROOT + '/src/engine/loop.js');
const { resolveChoice, dismissEvent } = await import(ROOT + '/src/systems/narrative.js');
const { startResearch, availableResearch } = await import(ROOT + '/src/systems/research.js');
const { rollCandidate, hireAgent, maxAgents, hireCost } = await import(ROOT + '/src/systems/agents.js');
const { actionPromptAI, actionWriteCode, actionTalkToUsers } = await import(ROOT + '/src/systems/founder.js');
const { startProject, availableProjects } = await import(ROOT + '/src/systems/projects.js');
const { rand } = await import(ROOT + '/src/engine/rng.js');

const SEED = Number(process.argv[3] || 12345);
const s = Game.startNewGame({ founderName:'T', companyName:'T', archetype:'hacker',
                              category:'devtools', productName:'T', seed: SEED });
const { reseed } = await import(ROOT + '/src/engine/rng.js');
reseed(SEED);                      // whatever startNewGame did, pin it here
s.tutorialHold = false;
const acts = {};
let last = 1;
for (let d = 0; d < 1500; d++) {
  for (let i=0;i<3;i++){ if(s.founder.focus>30&&s.company.cash>200)actionPromptAI(s); else if(s.founder.focus>5)actionWriteCode(s); }
  if (s.resources.insight<20 && s.founder.focus>20) actionTalkToUsers(s);
  const p=s.products[0];
  for(let i=0;i<4;i++){const r=Game.doShipFeature(s); if(!r.ok)break;}
  if(p && !p.launched && p.features.length>=4) Game.doLaunch(s);
  if(!s.research.active){const av=availableResearch(s).sort((a,b)=>a.cost-b.cost); if(av.length)startResearch(s,av[0].id);}
  if(s.agents.length<maxAgents(s)&&s.company.cash>hireCost(s)*3)hireAgent(s,rollCandidate(s));
  if(s.narrative.activeEvent&&!s.narrative.activeEvent.outcome){const n=s.narrative.activeEvent.choices.length; if(n)resolveChoice(s,0); dismissEvent(s);}
  const pr=availableProjects(s).filter(x=>x.available&&s.company.cash>x.cost*4);
  if(pr.length)startProject(s,pr[0].id);
  Loop.simulate(1);
  if (s.company.act !== last) { acts[s.company.act] = Math.floor(s.time.day); last = s.company.act; }
  if (s.ending) break;
}
console.log(JSON.stringify({ seed: SEED, acts, day: Math.floor(s.time.day), act: s.company.act,
  cash: Math.round(s.company.cash), rep: Math.round(s.resources.reputation),
  res: Object.keys(s.research.done).length, feat: s.stats.featuresShipped,
  events: s.stats.eventsResolved, rngProbe: rand().toFixed(9) }));
process.exit(0);
