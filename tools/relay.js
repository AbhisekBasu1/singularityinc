// ─────────────────────────────────────────────────────────────────────────────
// THE RELAY — two humans on two machines.
//
// A person in Vance's chair on another computer has to reach the copy of the
// rival's page the game has framed. In one browser profile a BroadcastChannel
// does that; across the room it needs a pipe. This is the pipe: one room per
// run, server-sent events out, a JSON POST in, no dependencies, no storage.
// The dev server mounts it on both origins; a static host has none, and the
// chair says so and falls back to the same-browser channel.
//
// It is deliberately dumb. It does not know what a play is. Everything it
// carries is re-checked by the game — a play through the same bounded function
// the written policy uses, a line through the same scan a press release gets —
// and the game accepts it only from the frame it mounted. A room code is six
// characters from the save, so a guest who has the link is a guest who was
// given it.
// ─────────────────────────────────────────────────────────────────────────────
const ROOM = /^[A-Za-z0-9_-]{3,40}$/;
// `board` is a board member's grave power, `founder` is the projection of the
// founder's company the board and the chair read, and `roles` is the relay
// saying who is in the room — the only message it writes itself.
const TYPES = new Set(['play', 'say', 'state', 'hello', 'refused', 'board', 'founder', 'roles']);
// Who may be in a room, and what each may post. A spectator posts nothing: it
// says hello so the room knows somebody is watching, and after that it reads.
// The relay is still dumb — this is not authorisation, it is the difference
// between a reader and a writer, and the game re-checks everything anyway.
const ROLES = new Set(['chair', 'frame', 'board', 'watch']);
const READ_ONLY = new Set(['watch']);
const MAX_BODY = 8192;
const MAX_ROOMS = 64;
const MAX_CLIENTS = 16;
const IDLE_MS = 10 * 60 * 1000;
// §H17. The room remembers the last few messages so a chair that loses its
// connection — a laptop lid, a train, a browser tab discarded — comes back to
// what it missed rather than to a blank page. In memory, for the life of the
// process, and never written anywhere: this is a dev server, not a host.
const LOG_KEEP = 50;
// A client may post this many at once and one more every RATE_MS after that:
// a token bucket per client, per room. The game re-checks every play and
// every line at its own pace; this only keeps one chair from turning the room
// into a firehose for everybody else in it.
const RATE_BURST = 8;
const RATE_MS = 1000;

const rooms = new Map();
let heartbeat = null;

function room(id) {
  let r = rooms.get(id);
  if (!r) {
    if (rooms.size >= MAX_ROOMS) sweep(true);
    r = { clients: new Set(), last: null, lastFounder: null, touched: Date.now(),
          rate: new Map(), log: [], seq: 0, who: new Map() };
    rooms.set(id, r);
  }
  r.touched = Date.now();
  r.log ??= []; r.seq ??= 0; r.who ??= new Map();
  return r;
}

// The roster of roles in the room, which is what tells the game whether
// anybody is watching and whether there is a board member to accept a motion
// from. Counts only — the relay never learns a name.
function roster(r) {
  const out = { chair: 0, frame: 0, board: 0, watch: 0 };
  const now = Date.now();
  for (const [k, v] of r.who) {
    if (now - v.at > IDLE_MS) { r.who.delete(k); continue; }
    if (out[v.role] != null) out[v.role]++;
  }
  return out;
}

// Everything the room carries goes through here: a sequence number, the ring,
// and one write per listener. `since` on the stream replays out of the ring.
function fan(r, msg) {
  msg.n = ++r.seq;
  r.log.push(msg);
  if (r.log.length > LOG_KEEP) r.log.splice(0, r.log.length - LOG_KEEP);
  for (const c of r.clients) send(c, msg);
  return msg;
}

function announceRoles(r) {
  fan(r, { type: 'roles', from: 'relay', roles: roster(r) });
}

function sweep(force = false) {
  const now = Date.now();
  for (const [id, r] of rooms) {
    if (r.clients.size === 0 && (force || now - r.touched > IDLE_MS)) { rooms.delete(id); continue; }
    for (const [k, b] of r.rate) if (now - b.at > IDLE_MS) r.rate.delete(k);
  }
}

// One token per message, RATE_BURST held at most. `true` when the client may
// post now.
function allow(r, key) {
  const now = Date.now();
  const b = r.rate.get(key) || { tokens: RATE_BURST, at: now };
  b.tokens = Math.min(RATE_BURST, b.tokens + (now - b.at) / RATE_MS);
  b.at = now;
  r.rate.set(key, b);
  if (b.tokens < 1) return false;
  b.tokens -= 1;
  return true;
}

function send(res, obj) {
  try { res.write(`data: ${JSON.stringify(obj)}\n\n`); } catch {}
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// Keep proxies and laptops from closing a quiet stream.
function ensureHeartbeat() {
  if (heartbeat) return;
  heartbeat = setInterval(() => {
    let any = false;
    for (const r of rooms.values()) for (const c of r.clients) { any = true; try { c.write(': ping\n\n'); } catch {} }
    sweep();
    if (!any && rooms.size === 0) { clearInterval(heartbeat); heartbeat = null; }
  }, 25000);
  heartbeat.unref?.();
}

// What a message may carry. Anything else is dropped here rather than argued
// about in a browser.
function shape(msg) {
  if (!msg || typeof msg !== 'object' || !TYPES.has(msg.type)) return null;
  const out = { type: msg.type, from: String(msg.from || '').slice(0, 24) };
  if (msg.type === 'play') { if (typeof msg.play !== 'string') return null; out.play = msg.play.slice(0, 20); }
  if (msg.type === 'say') { if (typeof msg.text !== 'string') return null; out.text = msg.text.replace(/\s+/g, ' ').trim().slice(0, 240); if (!out.text) return null; }
  if (msg.type === 'state') { if (!msg.payload || typeof msg.payload !== 'object') return null; out.payload = msg.payload; }
  if (msg.type === 'hello') {
    if (typeof msg.role === 'string' && ROLES.has(msg.role)) out.role = msg.role;
    if (typeof msg.since === 'number' && Number.isFinite(msg.since)) out.since = Math.max(0, Math.trunc(msg.since));
  }
  // §H15. A board member's power. `power` names which of the three; `arg` is
  // the directive it is forcing, when it is forcing one. The relay does not
  // know what any of them mean and does not check: the game re-derives all
  // three, refuses what the company's own state does not allow, and turns
  // whatever survives into a card the founder has to answer.
  if (msg.type === 'board') {
    if (typeof msg.power !== 'string') return null;
    out.power = msg.power.slice(0, 24);
    if (typeof msg.arg === 'string') out.arg = msg.arg.slice(0, 40);
    if (typeof msg.note === 'string') out.note = msg.note.replace(/\s+/g, ' ').trim().slice(0, 180);
  }
  // §H15. The founder's company, as the board and the chair are shown it. The
  // game pushes it the way it pushes Aperture's own week.
  if (msg.type === 'founder') { if (!msg.payload || typeof msg.payload !== 'object') return null; out.payload = msg.payload; }
  // The relay writes this one itself; a client claiming it is dropped.
  if (msg.type === 'roles') return null;
  // The game refused the chair's hand; the framed copy says which, and why.
  if (msg.type === 'refused') {
    out.what = String(msg.what || '').slice(0, 8);
    if (typeof msg.play === 'string') out.play = msg.play.slice(0, 20);
    out.reason = String(msg.reason || '').slice(0, 24);
    out.note = String(msg.note || '').replace(/\s+/g, ' ').trim().slice(0, 60);
  }
  return out;
}

// `true` when the request was for the relay and has been answered.
export function relayHandler(req, res, pathname) {
  if (!pathname.startsWith('/relay/')) return false;
  const id = pathname.slice('/relay/'.length);
  cors(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return true; }
  if (!ROOM.test(id)) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('404 no such room'); return true; }
  const r = room(id);

  if (req.method === 'GET') {
    if (r.clients.size >= MAX_CLIENTS) { res.writeHead(429, { 'Content-Type': 'text/plain' }); res.end('429 room is full'); return true; }
    res.writeHead(200, {
      'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive', 'X-Accel-Buffering': 'no',
    });
    res.write('retry: 2000\n\n');
    r.clients.add(res);
    ensureHeartbeat();
    // §H17. `?since=` replays what the ring still holds after that sequence
    // number, so a chair that dropped out comes back to the plays and the
    // lines it missed rather than to silence. Without it — a first
    // connection — the last state is enough to draw the page.
    let since = null;
    try { since = new URL(req.url, 'http://relay').searchParams.get('since'); } catch {}
    const from = Number(since);
    if (since != null && Number.isFinite(from)) {
      const missed = r.log.filter((m) => m.n > from);
      if (missed.length) { for (const m of missed) send(res, m); }
      else if (r.last) send(res, r.last);
    } else {
      // A chair that opens after the game has already spoken gets the numbers now.
      if (r.last) send(res, r.last);
      if (r.lastFounder) send(res, r.lastFounder);
    }
    req.on('close', () => { r.clients.delete(res); r.touched = Date.now(); });
    return true;
  }

  if (req.method === 'POST') {
    let body = '';
    let over = false;
    let answered = false;
    const reply = (code, headers, text) => { if (answered) return; answered = true; try { res.writeHead(code, headers); res.end(text); } catch {} };
    req.on('data', (chunk) => { body += chunk; if (body.length > MAX_BODY) { over = true; reply(413, { 'Content-Type': 'text/plain' }, '413 too long'); req.destroy(); } });
    // Everything in here runs outside the server's own try/catch, and a throw
    // in an event callback takes the whole process — and both origins — down.
    req.on('end', () => {
      try {
        if (over) return;
        let msg = null;
        try { msg = shape(JSON.parse(body)); } catch { msg = null; }
        if (!msg) {
          // Say why on the server, where somebody debugging a room can see it.
          console.error(`  [relay] refused a message in ${id}: ${body.slice(0, 80).replace(/\s+/g, ' ')}`);
          return reply(400, { 'Content-Type': 'text/plain' }, '400 not a relay message');
        }
        r.touched = Date.now();
        // Per client: the address and the id the page chose for itself, so two
        // chairs behind one router are two buckets.
        if (!allow(r, `${req.socket?.remoteAddress || '?'}|${msg.from}`)) {
          return reply(429, { 'Content-Type': 'text/plain', 'Retry-After': '1' }, '429 slow down');
        }
        // A spectator reads. Anything else it sends is refused here rather
        // than argued about in the game, and it is told why.
        const mine = r.who.get(msg.from);
        if (mine && READ_ONLY.has(mine.role) && msg.type !== 'hello') {
          return reply(403, { 'Content-Type': 'text/plain' }, '403 this room is read-only for a spectator');
        }
        if (msg.type === 'hello') {
          const role = msg.role || 'chair';
          const known = r.who.get(msg.from);
          r.who.set(msg.from, { role, at: Date.now() });
          if (!known || known.role !== role) announceRoles(r);
        }
        if (msg.type === 'state') r.last = msg;
        if (msg.type === 'founder') r.lastFounder = msg;
        fan(r, msg);
        // A newcomer's hello is answered in the response itself: the numbers,
        // if the game has spoken, the founder's projection, who else is here,
        // and where in the log the room currently is — which is what a
        // reconnect passes back as `?since=`.
        if (msg.type === 'hello') {
          return reply(200, { 'Content-Type': 'application/json' },
            JSON.stringify({ ...(r.last || { type: 'state', payload: null }),
                             founder: r.lastFounder?.payload || null,
                             roles: roster(r), at: r.seq }));
        }
        reply(204, {}, '');
      } catch (e) {
        reply(500, { 'Content-Type': 'text/plain' }, '500');
      }
    });
    req.on('error', () => reply(400, { 'Content-Type': 'text/plain' }, '400'));
    return true;
  }

  res.writeHead(405, { 'Content-Type': 'text/plain' }); res.end('405');
  return true;
}

// For tests and the banner.
export function relayStats() {
  return { rooms: rooms.size,
           clients: [...rooms.values()].reduce((a, r) => a + r.clients.size, 0),
           held: [...rooms.values()].reduce((a, r) => a + (r.log?.length || 0), 0) };
}
export function resetRelay() { for (const r of rooms.values()) for (const c of r.clients) { try { c.end(); } catch {} } rooms.clear(); if (heartbeat) { clearInterval(heartbeat); heartbeat = null; } }
