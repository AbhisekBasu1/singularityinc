// ─────────────────────────────────────────────────────────────────────────────
// THE CUT
//
// Assembles what tools/film.mjs and tools/filmtitles.mjs captured into the
// submission video. tools/filmedl.mjs is the film; everything here is
// arithmetic.
//
// Narration drives length: a shot is held for as long as the line spoken over
// it plus a breath, or its visual target, whichever is longer. A cut landing
// mid-word reads as a mistake, and so does a shot held ten seconds past its
// line. Where a take is shorter than its line the last frame is held rather
// than the picture sped up.
//
// The voice is macOS `say` — a SCRATCH track. It proves the timing and it
// satisfies "audio that covers what you built", but it should be re-recorded
// by a person before submitting. OUT/narration.txt is the script with
// timecodes so a re-record drops straight in.
//
//   node tools/filmcut.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { EDL } from './filmedl.mjs';

const OUT = process.env.FILM_OUT || '/tmp/film';
const CLIPS = path.join(OUT, 'clips');
const CAPS = path.join(OUT, 'caps');
const WORK = path.join(OUT, 'work');
const VOICE = process.env.FILM_VOICE || 'Daniel';
const RATE = Number(process.env.FILM_RATE || 166);
const FINAL = path.join(OUT, 'singularity-inc.mp4');
const BAND = 260;

const sh = (cmd, args) => new Promise((res, rej) => {
  const p = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = '';
  p.stderr.on('data', (d) => { err += d; });
  p.on('close', (c) => (c === 0 ? res() : rej(new Error(`${cmd} failed:\n${err.slice(-1600)}`))));
});
const probe = async (f) => {
  const p = spawn('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]);
  let out = '';
  p.stdout.on('data', (d) => { out += d; });
  await new Promise((r) => p.on('close', r));
  return Number(out.trim()) || 0;
};
const fmt = (s) => {
  const m = Math.floor(s / 60), r = s - m * 60;
  return `${m}:${r.toFixed(1).padStart(4, '0')}`;
};

fs.rmSync(WORK, { recursive: true, force: true });
fs.mkdirSync(WORK, { recursive: true });

// ── 1. the voice, which decides how long each shot is held ─────────────────
console.log(`\n  voice: ${VOICE} at ${RATE} wpm\n`);
const segs = [];
let t = 0;
for (const [i, e] of EDL.entries()) {
  const aiff = path.join(WORK, `vo${i}.aiff`);
  const wav = path.join(WORK, `vo${i}.wav`);
  await sh('say', ['-v', VOICE, '-r', String(RATE), '-o', aiff, e.vo]);
  await sh('ffmpeg', ['-y', '-i', aiff, '-ar', '48000', '-ac', '2', wav]);
  const voDur = await probe(wav);
  const dur = Math.max(e.min, voDur + 1.1);
  segs.push({ ...e, i, wav, voDur, dur, start: t });
  t += dur;
  console.log(`  ${String(i).padStart(2)}  ${e.clip.padEnd(12)} vo ${voDur.toFixed(1)}s → ${dur.toFixed(1)}s   @${fmt(t - dur)}`);
}
console.log(`\n  total ${fmt(t)}   ${t <= 180 ? '· under the 3:00 cap' : '· *** OVER 3:00 ***'}\n`);

// ── 2. cut each shot, and caption it ───────────────────────────────────────
for (const s of segs) {
  const src = path.join(CLIPS, `${s.clip}.mp4`);
  if (!fs.existsSync(src)) { console.log(`  MISSING CLIP: ${s.clip}`); process.exit(1); }
  const have = (await probe(src)) - s.in;
  const cap = path.join(CAPS, `c${String(s.i).padStart(2, '0')}.png`);
  const outv = path.join(WORK, `v${s.i}.mp4`);
  // Hold the last frame when a take is shorter than its line. Speeding the
  // picture up to fit reads as a glitch; a held frame reads as a held frame.
  const pad = have < s.dur ? `,tpad=stop_mode=clone:stop_duration=${(s.dur - have + 0.6).toFixed(2)}` : '';
  const capEnd = Math.min(s.dur, s.voDur + 1.0);
  const filter = `[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,`
    + `pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x05060a${pad},fps=30[v];`
    + `[v][1:v]overlay=0:${1080 - BAND}:enable='between(t,0.30,${capEnd.toFixed(2)})'[o]`;
  await sh('ffmpeg', ['-y', '-ss', String(s.in), '-i', src, '-i', cap,
    '-filter_complex', filter, '-map', '[o]', '-t', String(s.dur),
    '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', outv]);
  // This segment's audio: the line, then silence to the end of the shot.
  const outa = path.join(WORK, `a${s.i}.wav`);
  await sh('ffmpeg', ['-y', '-i', s.wav, '-af',
    `adelay=320|320,apad,atrim=0:${s.dur.toFixed(3)},volume=1.7`, '-ar', '48000', '-ac', '2', outa]);
  process.stdout.write(`  cut ${s.clip}\r`);
}

// ── 3. join and mux ────────────────────────────────────────────────────────
fs.writeFileSync(path.join(WORK, 'v.txt'), segs.map((s) => `file '${path.join(WORK, `v${s.i}.mp4`)}'`).join('\n'));
fs.writeFileSync(path.join(WORK, 'a.txt'), segs.map((s) => `file '${path.join(WORK, `a${s.i}.wav`)}'`).join('\n'));
await sh('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', path.join(WORK, 'v.txt'), '-c', 'copy', path.join(WORK, 'video.mp4')]);
await sh('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', path.join(WORK, 'a.txt'), '-c', 'copy', path.join(WORK, 'audio.wav')]);
await sh('ffmpeg', ['-y', '-i', path.join(WORK, 'video.mp4'), '-i', path.join(WORK, 'audio.wav'),
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', FINAL]);

const dur = await probe(FINAL);
console.log(`\n  ${FINAL}`);
console.log(`  ${fmt(dur)} · ${(fs.statSync(FINAL).size / 1048576).toFixed(1)}MB · 1920x1080 · ${dur <= 180 ? 'under the cap' : 'OVER THE CAP'}\n`);

fs.writeFileSync(path.join(OUT, 'narration.txt'),
  segs.map((s) => `[${fmt(s.start)}]  ${s.clip}  (${s.dur.toFixed(1)}s)\n${s.vo}\n`).join('\n'));
console.log('  narration + timecodes: ' + path.join(OUT, 'narration.txt') + '\n');
