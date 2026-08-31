# Deploying, in the order that works

There is a chicken-and-egg here that costs an hour if you meet it cold: an
origin-trial token is issued for a specific origin, so you cannot register one
until the origin exists. Deploy first, register second, redeploy third.

## 1. Deploy the folder

The whole game is static — no build step, no dependencies, no server. Any host
that serves a directory works. Cloudflare Pages:

```
Framework preset:   None
Build command:      (leave empty)
Output directory:   /
```

Note the hostname it gives you. That is the origin everything below is about.

## 2. Register the origin trial

At <https://developer.chrome.com/origintrials>, register **WebMCP** for that
exact origin. Two things bite here:

- **Tokens are per-origin and do not cover subdomains.** Production and any
  preview deployment are separate registrations.
- **`localhost` needs nothing.** It is already a secure context, and the game
  runs there with the Chrome flag or in the ChatGPT desktop browser with no
  token at all.

## 3. Wire the token in, in both places

Put the token in **`index.html`**:

```html
<meta http-equiv="origin-trial" content="THE_TOKEN">
```

and in **`_headers`**, replacing `REPLACE_WITH_THE_TOKEN_FOR_THIS_ORIGIN`.

Both, not either. Some CDNs strip the header; and on a host where an asset
router answers before any middleware, the header never runs at all for `/` —
the meta tag is what actually carries the trial. The header is the belt.

## 4. Redeploy

The meta tag is in the file, so a redeploy is required. Registering a token and
not redeploying changes nothing, and it is a very quiet nothing.

## 5. Check it, on the deployed origin

- DevTools → Application → Frames → Origin Trials shows **WebMCP: enabled**
- a Chrome profile with `chrome://flags/#enable-webmcp-testing` **off** still
  registers tools — that is what proves the token path rather than the flag
- the site-tools popover lists the tools with titles and schemas **after a hard
  reload**, not just on the dev server
- the `codex://` deep link from the game's "Play with your assistant" dialog
  opens the desktop app on the page

## The workstation's path

`/computer/` is the same game in a desktop housing, on the same origin. Two
things follow.

**It needs its own rows in `_headers`.** A trial token is issued per *origin*,
so it is the same token — but a header rule for `/` does not cover a path under
it, and `computer/index.html` carries the `<meta>` tag as well for the same
reason `index.html` does.

**It carries `<base href="/">`, and that only works at an origin root.** Every
asset path in this game is written in JavaScript and is document-relative —
`assets/img/act3.jpg` in a modal, a character's portrait, an ending plate — so
from `/computer/` each one would resolve a directory too deep and quietly 404.
The base tag resolves them all against the origin instead; module imports are
unaffected, because they resolve against the module's own URL. If you ever
deploy this game under a sub-path rather than at a root, that tag is the first
thing that breaks.

## The second origin

`rival/` is Aperture Systems' press office and it has to be a **different
origin** from the game — that is the whole point of it. Two options:

- **A second Pages project** pointed at the same repository, serving `/rival/`.
  Simplest, and gives you a hostname like `rival-singularity.pages.dev`.
- **A subdomain**, `rival.yourdomain`. Also a different origin.

Either way it needs **its own origin-trial token**: tokens are per-origin and do
not cover subdomains. Put it in `rival/index.html`, the same way. The game finds
it by convention — `rival.<host>` in production, the next port in development —
or you can point it anywhere with `?rival=https://somewhere-else`.

If it is not there, nothing breaks. The game notices it is not answering, does
not publish `read_the_rival` or `ask_the_rival`, and plays on.

## Playing locally

```
npm start          # or: node tools/serve.js
```

It prints every URL the game can be opened on, and puts the rival up on the next
port — two ports on localhost are two origins, so the cross-origin half works in
development without any of it being mocked. Use the **Local** one:
`localhost` is a secure context, and **a LAN address is not** — from a second
machine, `http://192.168.x.x:5173` silently has no `document.modelContext` at
all, with no error anywhere. SSH-forward the port instead:

```
ssh -L 5173:localhost:5173 you@the-machine
```

so the browser still sees `localhost`.
