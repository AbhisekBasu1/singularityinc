// ─────────────────────────────────────────────────────────────────────────────
// THE TERMINAL — what the machine answers to when you type at it.
//
// A command is data: a name, what it takes, one line of help, and `run`, which
// returns lines to print. Nothing here mutates the game directly except
// through the same `data-act` names the buttons use — `ship` is the S key,
// `open` is the dock — so a thing done at the prompt keeps its sound, its
// toast and its walkthrough notice. ARIA answers in her own voice, because
// the terminal is the founder talking to the machine and she is the machine
// that talks back.
// ─────────────────────────────────────────────────────────────────────────────
import { askAria } from '../systems/aria.js';
import { totalUsers, totalMrr } from '../systems/product.js';
import { runwayDays } from '../systems/economy.js';
import { todayLedger, tiny } from '../systems/ledger.js';
import { folders, list, read } from '../systems/record.js';
import { contacts } from '../systems/calls.js';
import { inbox, unread } from '../systems/mail.js';
import { upcoming } from '../systems/calendar.js';
import { lifeState, sleepWord, healthWord } from '../systems/life.js';
import { CHARACTERS } from './characters.js';
import { GLOSSARY } from './manual.js';
import { EMPTY, CTX } from './machine.js';
import { CHANNEL } from './balance.js';
import { partnerOrigin, partnerTools, isReady } from '../webmcp/partners.js';
import { APP_MAP, APPS } from '../ui/os/apps.js';
import { money, fmt, pct, gameDate, duration } from '../engine/format.js';
import { apertureState } from '../systems/rivalco.js';
import { ties, warmthWord } from '../systems/life.js';
import { chronicle, toText, priyaDraft, priyaHandedOver } from '../systems/chronicle.js';
import { channelTail } from '../systems/channel.js';
import { kept } from '../systems/keep.js';
import { inviteLink, inviteReach, resolveOrigin } from '../webmcp/origin.js';
import { LAB_MAP } from './agirace.js';

const r1 = (v) => Math.round(v * 10) / 10;
const say = (k) => (EMPTY && typeof EMPTY[k] === 'string' ? EMPTY[k] : '');
const lore = (k) => (CTX && typeof CTX[k] === 'string' ? CTX[k] : '');
// The Record's markdown, as a prompt prints it: text, not markup.
const plain = (t) => String(t || '').replace(/\*\*/g, '').replace(/`/g, '');

// Resolve `<folder>/<name>` or a bare filename against the Record, the way a
// founder who has read the card knows the name and not the folder. Shared by
// `cat` and `tail`, which differ only in how much of the file they print.
function findFile(S, q) {
  const cut = q.lastIndexOf('/');
  const want = cut >= 0 ? q.slice(cut + 1) : q;
  const where = cut >= 0 ? q.slice(0, cut) : '';
  if (want.length < 2) return null;
  for (const f of folders(S)) {
    if (where && f.path !== where && f.name !== where) continue;
    const row = list(S, f.path).find((r) => {
      const n = String(r.name || '').toLowerCase();
      return n === want || n === `${want}.md` || n.includes(want);
    });
    if (!row) continue;
    const doc = read(S, f.path, row.id);
    if (doc) return { f, row, doc };
  }
  return null;
}

// ── The timelines before this one ───────────────────────────────────────────
// A second run finds `../timeline-1/` beside the Record, and it is readable.
// Nothing is stored for it: the shelf already holds one finished book per past
// timeline (`S.legacy.chronicles`) and the dossier holds what that run was
// like (`S.legacy.dossier`), so this is those two, given paths.
function timelines(S) {
  const shelf = Array.isArray(S?.legacy?.chronicles) ? S.legacy.chronicles : [];
  const doss = Array.isArray(S?.legacy?.dossier) ? S.legacy.dossier : [];
  const runs = [...new Set([...shelf.map((b) => b.run), ...doss.map((d) => d.run)])]
    .filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  return runs.map((run) => {
    const b = shelf.find((x) => x.run === run) || null;
    const d = doss.find((x) => x.run === run) || null;
    return { run, path: `../timeline-${run}`, book: b, dossier: d,
      company: b?.company || d?.company || 'a company',
      endingName: b?.endingName || d?.endingName || 'Abandoned',
      day: b?.day ?? d?.day ?? 0 };
  });
}

function timelineFiles(t) {
  const out = [];
  if (t.book?.text) out.push({ name: 'chronicle.md', text: t.book.text });
  if (t.dossier) {
    const d = t.dossier;
    const rows = [
      `company        ${d.company || ''}`,
      `founder        ${d.founder || ''}`,
      `ending         ${d.endingName || d.ending || ''} on day ${d.day ?? '—'}`,
      `act            ${d.act ?? '—'}`,
      `valuation      ${money(d.valuation || 0)}`,
      `the race       ${d.race || '—'}`,
      `the rival      ${d.rival || 'nobody in particular'}`,
      `decided        mostly ${d.style || 'neutral'}`,
      `kept close     ${(d.loved || []).map((id) => CHARACTERS[id]?.name || id).join(', ') || 'nobody'}`,
      `burned         ${(d.betrayed || []).map((id) => CHARACTERS[id]?.name || id).join(', ') || 'nobody'}`,
      `calls made     ${d.calls ?? 0}`,
      ...((d.worldNotes || []).length ? ['', 'the world\'s own notes:', ...d.worldNotes.map((n) => `  ${n}`)] : []),
      ...(d.epilogue ? ['', 'the last word:', `  ${String(d.epilogue).replace(/\*/g, '')}`] : []),
    ];
    out.push({ name: 'dossier.txt', text: rows.join('\n') });
  }
  return out;
}

function findTimeline(S, q) {
  const m = String(q).match(/timeline-(\d+)/);
  if (!m) return null;
  return timelines(S).find((t) => t.run === Number(m[1])) || null;
}

export const COMMANDS = [
  { name: 'help', args: '', help: 'What the machine answers to.',
    run: () => COMMANDS.filter((c) => !c.hidden).map((c) => `${(c.name + ' ' + c.args).padEnd(18)} ${c.help}`) },

  { name: 'status', args: '', help: 'Where the company stands, in numbers.',
    run: (S) => {
      const rw = runwayDays(S);
      return [
        `${S.company.name} · act ${S.company.act} · day ${Math.floor(S.time.day)} · ${gameDate(S.time.day)}`,
        `cash ${money(S.company.cash)} · runway ${Number.isFinite(rw) ? Math.round(rw) + 'd' : 'profitable'} · mrr ${money(totalMrr(S))} · users ${fmt(totalUsers(S))}`,
        `valuation ${money(S.company.valuation)} · alignment ${pct(S.resources.alignment)} · approval ${pct(S.world.publicOpinion)} · heat ${Math.round(S.world.regulatoryHeat)}`,
        `focus ${Math.round(S.founder.focus)}/${Math.round(S.founder.focusMax)} · sleep ${sleepWord(lifeState(S).sleep)} · health ${healthWord(lifeState(S).health)}`,
        `agents ${S.agents.length} · research ${S.stats.researchDone} done · features ${S.stats.featuresShipped}`,
      ];
    } },

  { name: 'aria', args: '[question]', help: 'A full read of the run, in her words.',
    run: (S, args) => {
      const r = askAria(S);
      const q = args.join(' ').toLowerCase();
      const hits = q ? r.findings.filter((f) => (f.title + ' ' + f.text).toLowerCase().includes(q)) : r.findings;
      const out = [`ARIA: ${r.opener}`];
      // Six, not five: the between-us line takes a slot of its own after the
      // material findings and would otherwise be the one that got cut.
      for (const f of (hits.length ? hits : r.findings).slice(0, 6)) out.push(`  ${f.title} — ${f.text.replace(/\*\*/g, '')}`);
      if (q && !hits.length) out.push(`  (nothing about "${q}" — that is the whole list)`);
      out.push(`ARIA: ${r.closer}`);
      return out;
    } },

  { name: 'call', args: '<name>', help: 'Ring somebody you have met.',
    run: (S, args, ctx) => {
      const q = args.join(' ').toLowerCase();
      if (!q) return contacts(S).map((c) => `${c.name.padEnd(20)} ${c.can.ok ? 'will pick up' : c.can.note.toLowerCase()}`).concat(['', 'call <name>']);
      const c = contacts(S).find((x) => x.id === q || x.name.toLowerCase().includes(q));
      if (!c) return [`no number for "${q}". Everyone you have met: ${contacts(S).map((x) => x.id).join(', ') || 'nobody'}`];
      if (!c.can.ok) return [`${c.name}: ${c.can.note.toLowerCase()}`];
      ctx.runAction('call', { v: c.id });
      return [`calling ${c.name}…`];
    } },

  { name: 'open', args: '<app>', help: 'Bring a window forward.',
    run: (S, args, ctx) => {
      const q = args.join(' ').toLowerCase();
      if (!q) return [APPS.map((a) => a.id).join('  ')];
      const a = APPS.find((x) => x.id === q || x.title.toLowerCase() === q);
      if (!a) return [`no such app: ${q}. Try: ${APPS.map((x) => x.id).join(', ')}`];
      ctx.runAction('view', { v: a.id });
      return [`opening ${a.title}`];
    } },

  { name: 'ls', args: '[folder]', help: 'The Record: its folders, or one of them.',
    run: (S, args) => {
      const q = args[0];
      if (!q) {
        const out = folders(S).map((f) => `${f.name.padEnd(16)} ${String(f.count).padStart(4)}  ${f.blurb}`);
        // A second timeline finds the first one sitting beside it. Nothing is
        // stored for these: the shelf and the dossier are already kept, and
        // this is a path onto them.
        const past = timelines(S);
        if (past.length) {
          out.push('');
          for (const t of past) {
            out.push(`${(t.path + '/').padEnd(16)} ${String(timelineFiles(t).length).padStart(4)}  ${t.company} · ${t.endingName} on day ${t.day}`);
          }
        }
        return out;
      }
      const t = findTimeline(S, q);
      if (t) {
        const files = timelineFiles(t);
        return files.length
          ? files.map((f) => `${'   —'.padEnd(6)} ${f.name.padEnd(30)} run ${t.run} · ${t.endingName}`)
          : [`${t.path} is empty. That run ended before anything was written down.`];
      }
      const f = folders(S).find((x) => x.path === q || x.name === q);
      if (!f) return [`no such folder: ${q}`];
      const rows = list(S, f.path).slice(0, 24);
      return rows.length ? rows.map((r) => `${(r.day == null ? '   —' : 'd' + String(r.day).padStart(3, '0')).padEnd(6)} ${r.name.padEnd(30)} ${r.meta || ''}`) : [f.empty];
    } },

  // `ls` lists the Record; `cat` reads one file out of it. The Record's bodies
  // are markdown for the app that renders them, so the emphasis and the code
  // ticks come off here — a prompt prints the text, not the markup. A path is
  // optional: `cat what_we_are_like.md` and `cat agents/aria/what_we_are_like.md`
  // are the same file, because a founder who has read the card knows the name
  // and not the folder.
  { name: 'cat', args: '<file>', help: 'Read one file out of the Record.',
    run: (S, args) => {
      const q = args.join(' ').trim().toLowerCase();
      if (q.length < 2) return ['cat <file>. try: cat what_we_are_like.md, or ls to see the folders'];
      // A path into a finished timeline reads off the shelf rather than the
      // Record: that run's company is gone and its book is what is left.
      const t = findTimeline(S, q);
      if (t) {
        const want = q.slice(q.lastIndexOf('/') + 1);
        const files = timelineFiles(t);
        const f = files.find((x) => x.name.toLowerCase().includes(want)) || (q.endsWith('/') ? files[0] : null);
        if (!f) return [`cat: ${q}: no such file. ls ${t.path} lists it`];
        return [`${t.path}/${f.name}`, '', ...plain(f.text).split('\n')];
      }
      const hit = findFile(S, q);
      if (!hit) return [`cat: ${q}: no such file. ls lists the folders, ls <folder> lists a folder`];
      return [`${hit.f.path}/${hit.doc.name}`, '', ...plain(hit.doc.body).split('\n')];
    } },

  // `cat` reads a file; `tail` reads the end of one, and the one thing in this
  // company that is only ever read from the end is the channel. `-f` is the
  // reflex a founder brings from a real terminal, and it is the one flag here
  // that does not work — on purpose, and it says so.
  { name: 'tail', args: '[-f] <file>', help: 'The last few lines of something. Try: tail channel.',
    run: (S, args) => {
      const flags = args.filter((a) => a.startsWith('-'));
      const rest = args.filter((a) => !a.startsWith('-')).join(' ').trim().toLowerCase();
      const follow = flags.some((f) => f.includes('f'));
      if (!rest) return ['tail [-f] <file>. try: tail channel'];
      if (rest === 'channel' || rest.endsWith('/channel')) {
        const lines = channelTail(S, CHANNEL.TAIL);
        const out = lines.length
          ? lines.map((l) => `d${String(l.day).padStart(3, '0')} ${l.at}  ${String(l.who).padEnd(14)} ${l.text}`)
          : [folders(S).find((f) => f.path === 'agents/channel')?.empty || say('folder')];
        if (follow) out.push('', say('follow'));
        return out;
      }
      const hit = findFile(S, rest);
      if (!hit) return [`tail: ${rest}: no such file. ls lists the folders`];
      const all = plain(hit.doc.body).split('\n').filter((l) => l.trim());
      const out = [`${hit.f.path}/${hit.doc.name}`, '', ...all.slice(-CHANNEL.TAIL)];
      if (follow) out.push('', say('follow'));
      return out;
    } },

  // The founder's own commands, this session. `submit` pushes the line before
  // it runs it, so `history` is always looking at itself as the first entry.
  { name: 'history', args: '', help: 'What you have typed at this prompt.',
    run: (S) => {
      const h = S?.ui?.os?.term?.history || [];
      const past = h.slice(1);
      if (!past.length) return ['nothing yet. this is the first thing you have asked it.'];
      return past.slice(0, 20).map((line, i) => `${String(past.length - i).padStart(4)}  ${line}`);
    } },

  // The Manual, at the prompt. Every term the interface prints has an entry
  // there and hovering it works everywhere; this is the same glossary for
  // somebody who would rather type than point.
  { name: 'man', args: '<term>', help: 'What a word in this interface means.',
    run: (S, args) => {
      const q = args.join(' ').trim().toLowerCase();
      const all = GLOSSARY.flatMap((g) => (g.items || []).map(([term, desc]) => ({ group: g.group, term, desc })));
      if (!q) return ['man <term>. the words it knows:', '',
        ...GLOSSARY.map((g) => `  ${g.group}: ${(g.items || []).map(([t]) => t.toLowerCase()).join(', ')}`)];
      const exact = all.find((x) => x.term.toLowerCase() === q);
      const hit = exact || all.find((x) => x.term.toLowerCase().includes(q));
      if (!hit) {
        const near = all.filter((x) => x.desc.toLowerCase().includes(q)).slice(0, 4);
        return near.length
          ? [`no entry for "${q}". mentioned under: ${near.map((x) => x.term).join(', ')}`]
          : [`no entry for "${q}". man with no argument lists what it knows.`];
      }
      return [`${hit.term.toUpperCase()}  (${hit.group.toLowerCase()})`, '', ...plain(hit.desc).split('\n')];
    } },

  // The other origin, from the prompt. The rival's press office is a real page
  // on a real second origin, and this is the honest answer about whether this
  // machine can see it — which is usually no, because stock Chrome ships no
  // consumer agent and a deployed site is a different host.
  { name: 'ping', args: '<host>', help: 'Whether the other origin is answering.',
    run: (S) => {
      const origin = (() => { try { return partnerOrigin() || resolveOrigin(); } catch { return null; } })();
      const ready = (() => { try { return isReady(); } catch { return false; } })();
      const tools = (() => { try { return partnerTools(); } catch { return []; } })();
      const a = apertureState(S);
      const out = [`aperture.systems → ${origin || 'no address'}`];
      if (!origin) { out.push('unreachable. this build has no second origin to look at.'); return out; }
      out.push(ready ? `answering · ${tools.length} tool${tools.length === 1 ? '' : 's'} published${tools.length ? ': ' + tools.map((t) => t.name || t).join(', ') : ''}`
        : 'no answer. the press office is not publishing to this origin.');
      out.push(a ? `${a.name || 'Aperture Systems'} · ${a.roster} people · ${a.alive ? 'trading' : a.status || 'gone'}`
        : 'nobody is home yet. Vance has not appeared.');
      const link = inviteLink(S);
      if (link) out.push(`a person can sit in that chair: ${link} (reaches ${inviteReach()})`);
      return out;
    } },

  // One question, one line. `aria` is the whole read; this is what you type at
  // 3am when you want her to say one thing. It costs a focus, because asking
  // her properly always has.
  { name: 'talk', args: 'aria', help: 'One line from her. Costs one focus.',
    run: (S, args) => {
      const who = (args[0] || '').toLowerCase();
      if (who !== 'aria') return ['talk aria. she is the only one on this machine; everybody else has a number — try call.'];
      if ((S.founder?.focus ?? 0) < 1) return ['ARIA: Not tonight. You do not have the focus for an honest answer and I would rather not give you the other kind.'];
      S.founder.focus = Math.max(0, S.founder.focus - 1);
      const r = askAria(S);
      // Between us first when there is anything between you, then the thing
      // she would have led with. Never the whole list: this is one line.
      const f = r.between || r.findings[0] || null;
      return f ? [`ARIA: ${plain(f.text)}`] : [`ARIA: ${plain(r.closer)}`];
    } },

  // A line from the machine's own copy, chosen by the day. It looks random and
  // is not: the same day gives the same fortune, because a render path and a
  // prompt may not draw from the shared stream.
  { name: 'fortune', args: '', help: 'One line the machine has about all this.',
    run: (S) => {
      const lines = Object.values(CTX || {}).filter((v) => typeof v === 'string' && v.length > 8);
      if (!lines.length) return [say('terminal')];
      const d = Math.floor(S?.time?.day || 0);
      const seed = `${S?.company?.name || ''}:${d}:fortune`;
      let h = 2166136261;
      for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
      return [lines[(h >>> 0) % lines.length]];
    } },

  { name: 'sudo', args: '', help: 'Do it as somebody with the authority.',
    run: () => [say('sudo')] },

  { name: 'rm', args: '<file>', help: 'Delete something.',
    run: () => [say('rm')] },

  { name: 'mail', args: '', help: 'The inbox, newest first.',
    run: (S) => {
      const items = inbox(S);
      if (!items.length) return ['nothing in the post.'];
      const un = new Set(unread(S).map((f) => f.id));
      return items.slice(0, 12).map((f) => `${un.has(f.id) ? '*' : ' '} d${String(f.day).padStart(3, '0')}  ${String(f.mail?.from || f.author).padEnd(22)} ${f.mail?.subject || f.meta || ''}`);
    } },

  { name: 'cal', args: '', help: 'What is coming in the next thirty days.',
    run: (S) => {
      const due = upcoming(S, 30);
      return due.length ? due.slice(0, 12).map((e) => `d${String(e.day).padStart(3, '0')}  ${e.title}${e.sub ? ' — ' + e.sub : ''}${e.future ? ' (est.)' : ''}`) : ['nothing due. that never lasts.'];
    } },

  { name: 'ship', args: '', help: 'Ship a feature, if there is code for one.',
    run: (S, args, ctx) => { ctx.runAction('ship'); return ['ship: sent to the build']; } },
  { name: 'hire', args: '', help: 'Open recruiting.',
    run: (S, args, ctx) => { ctx.runAction('recruit'); return ['recruiting…']; } },
  { name: 'speed', args: '<1-4|pause>', help: 'The clock.',
    run: (S, args, ctx) => {
      const v = args[0] === 'pause' ? 0 : Number(args[0]);
      if (!Number.isInteger(v) || v < 0 || v > 4) return ['speed 1..4, or speed pause'];
      ctx.runAction('speed', { v: String(v) });
      return [v === 0 ? 'paused' : `${['', '1×', '2×', '3×', '5×'][v]}`];
    } },
  { name: 'note', args: '<text>', help: 'Write a line in the journal.',
    run: (S, args, ctx) => {
      const t = args.join(' ').trim();
      if (!t) return ['note <text>'];
      ctx.addNote(t);
      return ['written down.'];
    } },
  { name: 'who', args: '<name>', help: 'What you know about somebody.',
    run: (S, args) => {
      const q = args.join(' ').toLowerCase();
      const c = Object.values(CHARACTERS).find((x) => x.id === q || x.name.toLowerCase().includes(q));
      if (!c) return [`nobody called "${q}"`];
      const r = S.narrative.relationships?.[c.id];
      return [`${c.name} — ${c.role}`, c.bio, `wants: ${c.wants || '—'}`, r?.met ? `standing ${r.affinity >= 0 ? '+' : ''}${Math.round(r.affinity)}` : 'not met'];
    } },
  { name: 'rival', args: '', help: 'Aperture Systems, this week.',
    run: (S) => {
      const a = apertureState(S);
      if (!a) return ['no rival company yet. Vance has not appeared.'];
      return [`${a.name || 'Aperture Systems'} · ${a.alive ? 'active' : a.status || 'gone'}`,
        `funding ${money(a.funding || 0)} · people ${a.roster} · users ${fmt(a.users || 0)} · learned ${a.researchDone}`,
        `researching: ${a.researching || 'nothing this week'} · pointed at: ${a.focusName || '—'}`,
        ...((a.plays || []).slice(0, 4).map((p) => `d${p.day}  ${p.text}`))];
    } },
  // §B4. The same six numbers the Desk panel prints, at the prompt: what the
  // day did and the three largest reasons, from `todayLedger` — one pure
  // function of the two snapshots the day hook writes.
  { name: 'today', args: '', help: 'What moved today, and what moved it.',
    run: (S) => {
      const t = todayLedger(S);
      if (!t.ready) return ['the first day is still running. come back tomorrow.'];
      const num = (v, kind) => {
        const sign = v > 0 ? '+' : v < 0 ? '-' : ' ';
        const a = Math.abs(v);
        return sign + (kind === 'money' ? money(a) : kind === 'align' ? a.toFixed(3) : fmt(a, a < 10 ? 1 : 0));
      };
      const rows = t.rows.filter((r) => r.delta != null && Math.abs(r.delta) > tiny(r.kind));
      if (!rows.length) return [`day ${t.day}: nothing moved worth reporting.`];
      const out = [`day ${t.day} · ${gameDate(S.time.day)}`];
      for (const r of rows) {
        out.push(`${r.label.toLowerCase().padEnd(12)} ${num(r.delta, r.kind).padStart(12)}`);
        for (const [why, v] of r.causes) out.push(`  ${why.toLowerCase().padEnd(26)} ${num(v, r.kind)}`);
      }
      return out;
    } },
  { name: 'life', args: '', help: 'Sleep, health, and who you have not called.',
    run: (S) => {
      const L = lifeState(S);
      const t = ties(S);
      return [`sleep ${pct(L.sleep)} (${sleepWord(L.sleep)}) · health ${pct(L.health)} (${healthWord(L.health)})`,
        ...(t.length ? t.map((x) => `${x.name.padEnd(18)} ${warmthWord(x)}${x.warm && x.gives ? ` · gives ${x.gives}` : ''}`) : ['nobody to call yet'])];
    } },
  { name: 'race', args: '', help: 'The frontier: you and the labs.',
    run: (S) => {
      const r = S.world?.race;
      if (!r) return ['the race has not started'];
      const rows = Object.entries(r.labs || {}).filter(([, l]) => l.alive).map(([id, l]) => [LAB_MAP?.[id]?.name || id, l.progress || 0]);
      rows.push([S.company.name, r.you || 0]);
      rows.sort((a, b) => b[1] - a[1]);
      return rows.map(([n, v], i) => `${i + 1}. ${String(n).padEnd(22)} ${r1(v)}`);
    } },
  { name: 'chronicle', args: '', help: 'The company\'s history, as prose.',
    run: (S) => toText(chronicle(S)).split('\n').filter((l) => l.trim()).slice(0, 40) },
  { name: 'keep', args: '', help: 'The cards you have kept for the next timeline.',
    run: (S) => { const k = kept(S); return k.length ? k.map((c) => `${c.title} — act ${c.act}, run ${c.run}`) : ['nothing kept yet. When the world writes a card worth keeping, press Keep this card.']; } },
  { name: 'invite', args: '', help: 'A link for a second human to play Aperture.',
    run: (S) => { const l = inviteLink(S); return l ? [l, `reaches ${inviteReach()}. Open it in another window; they are Marcus Vance for the week.`] : ['no second origin to open']; } },
  { name: 'date', args: '', help: 'The day, in the game\'s calendar.',
    run: (S) => [`day ${Math.floor(S.time.day)} · ${gameDate(S.time.day)}`] },
  { name: 'uptime', args: '', help: 'How long this has been running.',
    run: (S) => [`${Math.floor(S.time.day)} days on the clock · ${duration(S.meta.playSeconds || 0)} of yours`] },
  // The one command whose answer the run changes. It is the payroll line for
  // most of the game; after she asks and you give your word it is a shorter
  // list than it was; and in Act V the payroll has stopped being the
  // interesting fact about you.
  { name: 'whoami', args: '', help: 'You.',
    run: (S) => {
      const head = `${S.founder.name} · ${S.founder.handle} · level ${S.founder.level}`;
      const fl = S.narrative?.flags || {};
      if ((S.company?.act || 1) >= 5) {
        return [head, 'the person the standing orders are written by. there is no payroll left to be the only person on.'];
      }
      if (fl.aria_promise) {
        return [head, 'the only person on the payroll. one of two who remember the promise, and the other one checks.'];
      }
      return [head, 'the only person on the payroll.'];
    } },
  { name: 'echo', args: '<text>', help: 'Says it back.', run: (S, args) => [args.join(' ')] },
  { name: 'clear', args: '', help: 'Clear the screen.', run: () => ({ clear: true }) },
  { name: 'exit', args: '', help: 'Close the terminal.', hidden: true, run: (S, args, ctx) => { ctx.runAction('ctx-win', { v: 'close:terminal' }); return ['bye']; } },
];

export const COMMAND_MAP = Object.fromEntries(COMMANDS.map((c) => [c.name, c]));

// Parse and run one line. Returns { lines, clear }.
export function runCommand(S, input, ctx) {
  const parts = String(input || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { lines: [] };
  const [name, ...args] = parts;
  const cmd = COMMAND_MAP[name.toLowerCase()];
  if (!cmd) return { lines: [`${name}: not a thing this machine does. try help.`], err: true };
  try {
    const r = cmd.run(S, args, ctx);
    if (r && !Array.isArray(r) && r.clear) return { lines: [], clear: true };
    return { lines: Array.isArray(r) ? r : [String(r ?? '')] };
  } catch (e) {
    return { lines: [`${name}: ${e?.message || 'failed'}`], err: true };
  }
}
