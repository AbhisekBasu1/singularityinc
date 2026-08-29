// Ambient background: slow-drifting particle field + faint connection lines.
let paused = false;
export function setBackgroundEnabled(v) { paused = !v; }

export function startBackground() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext && canvas.getContext('2d');
  if (!ctx) return;
  let w = 0, h = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
  let pts = [];

  function resize() {
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.min(70, Math.floor((w * h) / 26000));
    pts = Array.from({ length: n }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.14, vy: (Math.random() - 0.5) * 0.14,
      r: Math.random() * 1.3 + 0.4,
    }));
  }
  resize();
  window.addEventListener('resize', resize);

  let raf;
  function draw() {
    if (paused) { ctx.clearRect(0, 0, w, h); raf = requestAnimationFrame(draw); return; }
    ctx.clearRect(0, 0, w, h);
    for (const p of pts) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
    }
    ctx.strokeStyle = 'rgba(139,92,246,0.10)';
    ctx.lineWidth = 0.6;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 17000) {
          ctx.globalAlpha = 1 - d2 / 17000;
          ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(0,229,160,0.32)';
    for (const p of pts) { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); }
    raf = requestAnimationFrame(draw);
  }
  draw();
  return () => cancelAnimationFrame(raf);
}
