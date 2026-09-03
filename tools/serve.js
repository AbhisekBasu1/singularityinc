// Minimal zero-dependency static server for local play/dev.
import http from 'node:http';
import { relayHandler } from './relay.js';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import os from 'node:os';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 5173);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

// Serve one file out of ROOT, and nothing else.
//
// Two things here are load-bearing and were both wrong once:
//
//   · `new URL()` normalises `..`, and then `decodeURIComponent` runs *after*
//     that normalisation and hands back a `/` from `%2f`. So `%2f..%2f..%2f`
//     survives normalisation and escapes. Decode first, normalise second.
//   · `filePath.startsWith(ROOT)` is a string test, not a path test. Any
//     sibling directory whose name merely begins with ROOT's — a backup, a
//     worktree, `simgame1-secrets` — passes it. `path.relative` is the test.
//
// This binds 0.0.0.0 and the banner advertises the LAN address, so neither of
// those is theoretical.
const DENY = /(^|\/)\.[^/]/;          // dotfiles and dot-directories: .git, .env

function handler(req, res) {
  try {
    const parsed = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    // Decode BEFORE normalising, then normalise ourselves.
    let raw;
    try { raw = decodeURIComponent(parsed.pathname); }
    catch { res.writeHead(400, { 'Content-Type': 'text/plain' }); return res.end('400 bad path'); }

    let pathname = path.posix.normalize(raw.replace(/\\/g, '/'));
    // The relay: a room per run for a second human on another machine.
    if (relayHandler(req, res, pathname)) return;
    if (pathname.endsWith('/')) pathname += 'index.html';
    if (DENY.test(pathname)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 not found');
    }

    let filePath = path.resolve(ROOT, '.' + (pathname.startsWith('/') ? pathname : '/' + pathname));

    // A real containment check: the resolved path must be inside ROOT — and
    // so must whatever a symlink inside ROOT actually points at.
    const inside = (p) => { const rel = path.relative(ROOT, p); return !rel.startsWith('..') && !path.isAbsolute(rel); };
    let real = filePath;
    try { real = fs.realpathSync(filePath); } catch { /* missing: the stat below answers 404 */ }
    if (!inside(filePath) || !inside(real)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      return res.end('403 forbidden');
    }

    let st;
    try { st = fs.statSync(filePath); } catch { st = null; }
    if (st?.isDirectory()) {
      const idx = path.join(filePath, 'index.html');
      try { if (fs.statSync(idx).isFile()) { filePath = idx; st = fs.statSync(idx); } } catch { st = null; }
    }
    if (!st || !st.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 not found: ' + pathname);
    }

    const ext = path.extname(filePath).toLowerCase();
    const stream = fs.createReadStream(filePath);

    // A read that fails after the headers are gone must not take the process
    // with it. An `error` event with no listener is an uncaught exception, and
    // this process is serving BOTH origins — one unreadable file used to kill
    // the game and the rival together.
    stream.on('error', (err) => {
      if (!res.headersSent) {
        res.writeHead(err.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain' });
        res.end((err.code === 'ENOENT' ? '404 not found: ' : '500 ') + pathname);
      } else {
        res.destroy();
      }
      console.error(`  [serve] ${err.code || 'error'} reading ${pathname}`);
    });

    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    stream.pipe(res);
  } catch (err) {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 ' + err.message);
    } else res.destroy();
  }
}

const server = http.createServer(handler);

// If the preferred port is taken, walk up until we find a free one — the game
// should never fail to start because something else owns 5173.
let attemptPort = PORT;
let attemptsLeft = 12;

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE' && attemptsLeft > 0) {
    attemptsLeft--;
    attemptPort++;
    setTimeout(() => server.listen(attemptPort), 30);
  } else {
    console.error(err.message);
    process.exit(1);
  }
});

// Print every address the game can actually be opened on, so playing from
// another machine on the network is a copy-paste rather than an investigation.
function lanAddresses() {
  const out = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    for (const a of addrs || []) {
      if (a.family !== 'IPv4' || a.internal) continue;
      if (a.address.startsWith('169.254.')) continue;   // self-assigned, not routable
      out.push({ name, address: a.address });
    }
  }
  return out;
}

server.on('listening', () => {
  const port = server.address().port;
  const lines = [`  Local    http://localhost:${port}`];
  for (const { name, address } of lanAddresses()) {
    lines.push(`  Network  http://${address}:${port}   (${name})`);
  }
  if (os.hostname()) lines.push(`  Bonjour  http://${os.hostname().replace(/\.$/, '')}:${port}`);
  lines.push('');
  lines.push('  The Network and Bonjour lines have no site tools: a LAN address is not a');
  lines.push('  secure context, so document.modelContext is simply absent there. Use Local,');
  lines.push('  or SSH-forward the port so the browser still sees localhost.');
  console.log(`\n  SINGULARITY, INC.\n\n${lines.join('\n')}\n`);
  startRival(port);
});

server.listen(attemptPort);

// ── The second origin ───────────────────────────────────────────────────────
// `rival/` is a separate page that registers its own tools and offers them,
// through `exposedTo`, to the game's origin only. For that to mean anything it
// has to actually *be* a different origin — and two ports on localhost are two
// origins, for Permissions Policy and for `exposedTo` alike. So the dev server
// puts up a second listener on the next free port rather than making anybody
// run two commands to see the interesting half of the API work.
function startRival(mainPort) {
  const rival = http.createServer(handler);
  const rivalPort = mainPort + 1;
  // Exactly `mainPort + 1`, and no walking. The page computes the rival's
  // origin from its own port with the same arithmetic and has no way to be told
  // otherwise, so a rival that drifted to a different port would be a rival the
  // game iframes into somebody else's server — or into nothing, while the
  // banner says it started. Better to say plainly that it did not.
  rival.on('error', (err) => {
    console.log(`  Rival    not started — ${err.code === 'EADDRINUSE'
      ? `something else is listening on ${rivalPort}`
      : err.message}`);
    console.log('           The game plays fine without it; the cross-origin half will be absent.');
    console.log(`           Free the port with:  lsof -nP -iTCP:${rivalPort} -sTCP:LISTEN -t | xargs kill\n`);
  });
  rival.on('listening', () => {
    console.log(`  Rival    http://localhost:${rival.address().port}/rival/   (a second origin, on purpose)\n`);
  });
  rival.listen(rivalPort);
}
