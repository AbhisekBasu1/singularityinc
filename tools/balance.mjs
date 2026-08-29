// Multi-run balance report: medians across seeds and builds.
import { execFileSync } from 'node:child_process';
const combos = process.argv[2] ? [process.argv[2].split('/')] : [
  ['devtools','hacker'], ['consumer','hustler'], ['b2b','operator'],
  ['agents','researcher'], ['marketplace','designer'], ['infra','ghost'], ['media','prophet'],
];
const RUNS = Number(process.env.RUNS || 3);
const DAYS = Number(process.env.DAYS || 1800);
const rows = [];
for (const [cat, arch] of combos) {
  const acts = [[], [], [], []], fin = { val: [], users: [], mrr: [], inc: [], res: [], feat: [], gdp: [] };
  for (let r = 0; r < RUNS; r++) {
    const out = execFileSync('node', ['tools/simtest.mjs', String(DAYS), cat, arch], { encoding: 'utf8' });
    for (const line of out.split('\n')) {
      let m = line.match(/Act (\d) reached on day (\d+)/);
      if (m) acts[Number(m[1]) - 2]?.push(Number(m[2]));
      m = line.match(/final: act (\d) · cash (\S+) · users (\S+) · mrr (\S+) · val (\S+)/);
      if (m) { fin.val.push(m[5]); fin.users.push(m[3]); fin.mrr.push(m[4]); }
      m = line.match(/research (\d+)\/85 · features (\d+) · events (\d+)/);
      if (m) { fin.res.push(Number(m[1])); fin.feat.push(Number(m[2])); }
      m = line.match(/incidents (\d+)/); if (m) fin.inc.push(Number(m[1]));
      m = line.match(/gdp ([\d.]+)%/); if (m) fin.gdp.push(Number(m[1]));
    }
  }
  const med = (a) => a.length ? a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)] : '—';
  rows.push({ build: `${cat}/${arch}`,
    a2: med(acts[0]), a3: med(acts[1]), a4: med(acts[2]), a5: med(acts[3]),
    val: fin.val[Math.floor(fin.val.length/2)], users: fin.users[Math.floor(fin.users.length/2)],
    res: med(fin.res), feat: med(fin.feat), inc: med(fin.inc), gdp: med(fin.gdp) });
}
const pad = (s, n) => String(s).padEnd(n);
const padl = (s, n) => String(s).padStart(n);
console.log(`\n${pad('BUILD', 22)}${padl('ACT2',6)}${padl('ACT3',7)}${padl('ACT4',7)}${padl('ACT5',7)}${padl('VAL',10)}${padl('USERS',9)}${padl('RES',6)}${padl('FEAT',6)}${padl('INC',5)}${padl('GDP%',7)}`);
console.log('─'.repeat(92));
for (const r of rows) {
  console.log(`${pad(r.build,22)}${padl(r.a2,6)}${padl(r.a3,7)}${padl(r.a4,7)}${padl(r.a5,7)}${padl(r.val,10)}${padl(r.users,9)}${padl(r.res,6)}${padl(r.feat,6)}${padl(r.inc,5)}${padl(r.gdp,7)}`);
}
console.log(`\n(medians of ${RUNS} runs × ${DAYS} days · targets: act2≈110 act3≈400 act4≈870 act5≈1200)`);
