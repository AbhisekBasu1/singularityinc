// ─────────────────────────────────────────────────────────────────────────────
// MOTIFS — the small things the deck quotes back at the founder years later.
//
// The first line. Day One offers three openings and each leaves a different
// artefact at the top of the repository: a comment, nine sentences and no
// code, or a timestamp and one word. Three late cards quote it — the last
// commit, ARIA's hour, the archive — and they used to assume the comment
// whether or not the player wrote it. They read the flag now. A run with none
// of the three (the world wrote Day One, or the save predates the flags) gets
// the comment, which is what those cards always said.
// ─────────────────────────────────────────────────────────────────────────────

export function firstLine(S) {
  const f = S?.narrative?.flags || {};
  if (f.first_line_paragraph) return {
    kind: 'paragraph',
    // e12_the_archive: what somebody screenshotted.
    archive: 'a screenshot somebody took of your first commit, which is nine sentences and no code',
    // e4_final_commit: what the first commit is, at the bottom of the scroll.
    last: 'It is not code. It is nine sentences in a file called `README.md`, and you still believe seven of them.',
    // e9_aria_hour: the commit she stops on.
    hour: 'The first commit is nine sentences and no code. She has read it more times than you rewrote it.',
  };
  if (f.first_line_coffee) return {
    kind: 'coffee',
    archive: 'a screenshot somebody took of your first commit message, which is timestamped 06:52 and says `ok`',
    last: 'It is timestamped 06:52. The message is one word: `ok`. You remember the coffee better than the commit.',
    hour: 'The first commit is at 06:52 and its message is one word: `ok`. She has never asked what took the fifty minutes.',
  };
  return {
    kind: 'comment',
    archive: 'a screenshot somebody took of a comment in your first commit that says `// this is going to work`',
    last: 'It is a comment. It says:\n\n`// this is going to work`',
    hour: 'The fourth commit is a comment. It says `// this is going to work`.',
  };
}
