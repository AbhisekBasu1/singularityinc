// ─────────────────────────────────────────────────────────────────────────────
// WHERE THE ASSISTANT RUNS — the one place the vendor's names live.
//
// These are product names and version numbers that will be wrong within
// months. They used to be typed out in three places (the title screen's
// dialog, the world console's UNAVAILABLE line, and the README) and had
// already started to differ. The README is prose and stays by hand; every
// line the game itself prints comes from here.
// ─────────────────────────────────────────────────────────────────────────────
export const PLATFORM = {
  // The app, and which of its presets have site tools switched on.
  app: 'the ChatGPT desktop app’s built-in browser',
  presets: 'GPT-5.6 Sol or Terra',
  presetsOff: 'Luna has site tools switched off',
  // The other route: a browser with the API and an origin-trial token.
  browser: 'Chrome 149+',
  // Where it does not work, stated so nobody spends an hour finding out.
  not: 'Not the ChatGPT web app, the extension, or Codex CLI. Enterprise and Edu workspaces are excluded.',
};

// One sentence for a console that has just found no site tools.
export const REMEDY = `no site tools in this browser — use ${PLATFORM.app} (${PLATFORM.presets.replace('GPT-5.6 ', '')}; ${PLATFORM.presetsOff}), or ${PLATFORM.browser}`;
