// Number/date formatting for an incremental game. Readability > precision.

const SHORT = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc',
               'UDc', 'DDc', 'TDc', 'QaDc', 'QiDc', 'SxDc', 'SpDc', 'OcDc', 'NoDc', 'Vg'];

export function fmt(n, decimals) {
  if (n === null || n === undefined || Number.isNaN(n)) return '0';
  if (!Number.isFinite(n)) return '∞';
  const neg = n < 0;
  n = Math.abs(n);
  let out;
  if (n < 1000) {
    const d = decimals ?? (n < 10 ? (n % 1 === 0 ? 0 : 1) : 0);
    out = n.toFixed(d);
  } else {
    const tier = Math.min(SHORT.length - 1, Math.floor(Math.log10(n) / 3));
    const scaled = n / Math.pow(10, tier * 3);
    const d = decimals ?? (scaled < 10 ? 2 : scaled < 100 ? 1 : 0);
    // Strip trailing zeros ONLY after a decimal point. The old pattern also ate
    // them off integer mantissas, so 500000 printed as "5K" and 110000 as
    // "11K" — every value from 100–999 in any tier was shown 10x or 100x low.
    out = scaled.toFixed(d);
    if (out.includes('.')) out = out.replace(/0+$/, '').replace(/\.$/, '');
    out += SHORT[tier];
  }
  return (neg ? '-' : '') + out;
}

export function money(n, decimals) {
  if (n === null || n === undefined || Number.isNaN(n)) return '$0';
  const neg = n < 0;
  const s = fmt(Math.abs(n), decimals);
  return (neg ? '-$' : '$') + s;
}

export function moneyExact(n) {
  const neg = n < 0;
  const v = Math.abs(Math.round(n));
  return (neg ? '-$' : '$') + v.toLocaleString('en-US');
}

export function pct(n, decimals = 0) {
  if (!Number.isFinite(n)) return '—';
  return (n * 100).toFixed(decimals) + '%';
}

export function signed(n, formatter = fmt) {
  const s = formatter(Math.abs(n));
  return (n >= 0 ? '+' : '−') + s;
}

export function rate(n, unit = '/s') {
  return fmt(n, n < 10 ? 2 : undefined) + unit;
}

// Duration in seconds → compact human string
export function duration(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '—';
  if (sec < 60) return Math.ceil(sec) + 's';
  if (sec < 3600) return Math.floor(sec / 60) + 'm ' + Math.floor(sec % 60) + 's';
  if (sec < 86400) return Math.floor(sec / 3600) + 'h ' + Math.floor((sec % 3600) / 60) + 'm';
  return Math.floor(sec / 86400) + 'd ' + Math.floor((sec % 86400) / 3600) + 'h';
}

// Game days → "Day 12" / "Month 4" style labels
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const START_YEAR = 2027;

export function gameDate(day) {
  const d = Math.floor(day);
  const year = START_YEAR + Math.floor(d / 360);
  const dayOfYear = d % 360;
  const month = Math.floor(dayOfYear / 30);
  const dom = (dayOfYear % 30) + 1;
  return `${MONTHS[month]} ${dom}, ${year}`;
}

export function gameDateShort(day) {
  const d = Math.floor(day);
  const year = START_YEAR + Math.floor(d / 360);
  const dayOfYear = d % 360;
  const month = Math.floor(dayOfYear / 30);
  const dom = (dayOfYear % 30) + 1;
  return `${MONTHS[month]} ${dom} '${String(year).slice(2)}`;
}

export function runwayText(cash, burnPerDay) {
  if (burnPerDay <= 0) return 'Profitable';
  const days = cash / burnPerDay;
  if (days > 3650) return '10y+';
  if (days > 720) return (days / 360).toFixed(1) + 'y';
  if (days > 60) return Math.floor(days / 30) + ' mo';
  return Math.max(0, Math.floor(days)) + ' days';
}

export function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function titleCase(s) {
  return s.replace(/\w\S*/g, (t) => t[0].toUpperCase() + t.slice(1).toLowerCase());
}

export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function invLerp(a, b, v) { return b === a ? 0 : clamp((v - a) / (b - a), 0, 1); }

// Diminishing-returns curve: 0 → 0, ∞ → cap
export function soften(x, scale = 1, cap = 1) {
  return cap * (1 - Math.exp(-x / scale));
}
