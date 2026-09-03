// Multi-run balance report: medians across seeds and builds.
import { execFileSync } from 'node:child_process';
import { money } from '../src/engine/format.js';
const combos = process.argv[2] ? [process.argv[2].split('/')] : [
  ['devtools','hacker'], ['consumer','hustler'], ['b2b','operator'],
  ['agents','researcher'], ['marketplace','designer'], ['infra','ghost'], ['media','prophet'],
];
const RUNS = Number(process.env.RUNS || 3);
const DAYS = Number(process.env.DAYS || 1800);
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const rows = [];
for (const [cat, arch] of combos) {
  const acts = [[], [], [], []], fin = { val: [], users: [], mrr: [], inc: [], res: [], feat: [], gdp: [] };
  // §A2: the share of acts I-IV spent with the next act's goal already met.
  const open = [[], [], [], []];
  // §A4: the roster the day each act turned, plus the roster at the end.
  const roster = [[], [], [], [], []];
  // §A1: what a run is worth in cash, not in multiples. `a3cash` is the number
  // the scarcity pass is tuned against — end-of-Act-III cash should be about two
  // years of burn — and `bank` counts the runs that ran out of runway.
  const cash = { a3: [], a3years: [], end: [], years: [] };
  let bank = 0;
  for (let r = 0; r < RUNS; r++) {
    const out = execFileSync('node', ['tools/simtest.mjs', String(DAYS), cat, arch], { encoding: 'utf8' });
    for (const line of out.split('\n')) {
      let m = line.match(/Act (\d) reached on day (\d+)/);
      if (m) acts[Number(m[1]) - 2]?.push(Number(m[2]));
      m = line.match(/final: act (\d) · cash (\S+) · users (\S+) · mrr (\S+) · val (\S+)/);
      if (m) { fin.val.push(m[5]); fin.users.push(m[3]); fin.mrr.push(m[4]); }
      m = line.match(/research (\d+)\/\d+ · features (\d+) · events (\d+)/);
      if (m) { fin.res.push(Number(m[1])); fin.feat.push(Number(m[2])); }
      m = line.match(/incidents (\d+)/); if (m) fin.inc.push(Number(m[1]));
      m = line.match(/gdp ([\d.]+)%/); if (m) fin.gdp.push(Number(m[1]));
      m = line.match(/cashmarks (\{.*?\}) · endcash (-?\d+) · endexp (-?\d+)/);
      if (m) {
        const marks = JSON.parse(m[1]);
        // Cash the day Act IV opens — the end of Act III — and how many years
        // of that day's burn it is. §A1's target is "about two".
        if (marks['4'] != null) {
          const [c, e] = marks['4'];
          cash.a3.push(c);
          if (e > 0) cash.a3years.push(c / e / 360);
        }
        cash.end.push(Number(m[2]));
        // Years of burn = cash over what a day costs to run, revenue ignored.
        // That is the question §A1 asks: how long could this company stand
        // still? Net burn is negative for a profitable company and answers
        // nothing.
        const exp = Number(m[3]);
        if (exp > 0) cash.years.push(Number(m[2]) / exp / 360);
      }
      // §A2. How much of each act was played with the next gate already open.
      // A pure timer reads near 1; a deed that lands at the end reads low.
      m = line.match(/roster (\{.*?\}) · endroster (\d+)/);
      if (m) {
        const r2 = JSON.parse(m[1]);
        for (let a = 2; a <= 5; a++) if (r2[a] != null) roster[a - 2].push(r2[a]);
        roster[4].push(Number(m[2]));
      }
      m = line.match(/gatemarks (\{.*?\}) · gatemet (\{.*?\})/);
      if (m) {
        const turned = JSON.parse(m[1]), met = JSON.parse(m[2]);
        for (let a = 1; a <= 4; a++) {
          const start = a === 1 ? 0 : turned[a];
          const end = turned[a + 1];
          if (start == null || end == null || met[a + 1] == null || end <= start) continue;
          open[a - 1].push(clamp01((end - met[a + 1]) / (end - start)));
        }
      }
      if (/ENDING: Out Of Runway/.test(line)) bank++;
    }
  }
  const med = (a) => a.length ? a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)] : '—';
  const m$ = (a) => (a.length ? money(med(a)) : '—');
  rows.push({ build: `${cat}/${arch}`,
    a2: med(acts[0]), a3: med(acts[1]), a4: med(acts[2]), a5: med(acts[3]),
    val: fin.val[Math.floor(fin.val.length/2)], users: fin.users[Math.floor(fin.users.length/2)],
    res: med(fin.res), feat: med(fin.feat), inc: med(fin.inc), gdp: med(fin.gdp),
    a3cash: m$(cash.a3), endcash: m$(cash.end),
    a3yrs: cash.a3years.length ? med(cash.a3years).toFixed(1) : '—',
    yrs: cash.years.length ? med(cash.years).toFixed(1) : '—', bank,
    open: open.map((a) => (a.length ? Math.round(med(a) * 100) + '%' : '—')),
    roster: roster.map((a) => (a.length ? med(a) : '—')) });
}
const pad = (s, n) => String(s).padEnd(n);
const padl = (s, n) => String(s).padStart(n);
console.log(`\n${pad('BUILD', 22)}${padl('ACT2',6)}${padl('ACT3',7)}${padl('ACT4',7)}${padl('ACT5',7)}${padl('VAL',10)}${padl('USERS',9)}${padl('RES',6)}${padl('FEAT',6)}${padl('INC',5)}${padl('GDP%',7)}`);
console.log('─'.repeat(92));
for (const r of rows) {
  console.log(`${pad(r.build,22)}${padl(r.a2,6)}${padl(r.a3,7)}${padl(r.a4,7)}${padl(r.a5,7)}${padl(r.val,10)}${padl(r.users,9)}${padl(r.res,6)}${padl(r.feat,6)}${padl(r.inc,5)}${padl(r.gdp,7)}`);
}
// The scarcity table. ACT3$ is cash the day Act IV opens and A3YRS is how many
// years of that day's operating cost it buys — §A1's target is "about two".
// ENDYRS is the same ratio at the end of the run.
console.log(`\n${pad('BUILD', 22)}${padl('ACT3$',12)}${padl('A3YRS',8)}${padl('END$',12)}${padl('ENDYRS',8)}${padl('BANKRUPT',10)}`);
console.log('─'.repeat(72));
for (const r of rows) {
  console.log(`${pad(r.build,22)}${padl(r.a3cash,12)}${padl(r.a3yrs,8)}${padl(r.endcash,12)}${padl(r.yrs,8)}${padl(`${r.bank}/${RUNS}`,10)}`);
}
// §A2. The share of each act played after its goal was already met — a pure
// timer reads near 100%, a deed that lands at the end reads low.
console.log(`\n${pad('BUILD', 22)}${padl('GATE-OPEN I',13)}${padl('II',7)}${padl('III',7)}${padl('IV',7)}`
  + `${padl('ROSTER @II',12)}${padl('III',5)}${padl('IV',5)}${padl('V',5)}${padl('END',7)}`);
console.log('─'.repeat(90));
for (const r of rows) {
  console.log(`${pad(r.build,22)}${padl(r.open[0],13)}${padl(r.open[1],7)}${padl(r.open[2],7)}${padl(r.open[3],7)}`
    + `${padl(r.roster[0],12)}${padl(r.roster[1],5)}${padl(r.roster[2],5)}${padl(r.roster[3],5)}${padl(r.roster[4],7)}`);
}
console.log(`\ntotal bankruptcies: ${rows.reduce((a, r) => a + r.bank, 0)}/${rows.length * RUNS} runs`);
console.log(`(medians of ${RUNS} runs × ${DAYS} days · targets: act2≈110 act3≈400 act4≈870 act5≈1200)`);
