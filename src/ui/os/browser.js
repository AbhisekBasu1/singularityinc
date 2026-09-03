// ─────────────────────────────────────────────────────────────────────────────
// BROWSER — the three sites a founder keeps open.
//
// The rival's press office is a real page on a real second origin, framed
// here the way the game already frames it for tools — with `view=1`, so this
// copy registers nothing and the tools stay where they are. It resolves the
// origin itself rather than asking whether the tool layer mounted it: a page
// is a page, and a browser with no site tools can still read the paper. The Ledger is the
// press column of the Wire set as a front page. The company's own site is
// generated from the product. Which tab is open is `S.ui.os.web`, saved.
// Every page is a pure string of state; the iframe is the one exception and
// `render()` keeps the node when nothing about it changed.
// ─────────────────────────────────────────────────────────────────────────────
import { esc, md } from '../dom.js';
import { resolveOrigin } from '../../webmcp/partners.js';
import { activeProduct } from '../../engine/state.js';
import { CATEGORY_MAP, PRICING_MODELS } from '../../data/products.js';
import { totalUsers, totalMrr } from '../../systems/product.js';
import { MACRO } from '../../systems/market.js';
import { nemesisOf } from '../../systems/nemesis.js';
import { EMPTY, CTX } from '../../data/machine.js';
import { fmt, money, gameDate } from '../../engine/format.js';

const line = (k) => (EMPTY && typeof EMPTY[k] === 'string' ? EMPTY[k] : '');
const lore = (k) => (CTX && typeof CTX[k] === 'string' ? CTX[k] : '');
const safe = (fn, dflt) => { try { const v = fn(); return v == null ? dflt : v; } catch { return dflt; } };

const slug = (s) => String(s || 'company').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24) || 'company';

export const SITES = [
  { id: 'home', title: (S) => S.company.name, url: (S) => `https://${slug(S.company.name)}.ai` },
  { id: 'ledger', title: () => 'The Ledger', url: () => 'https://theledger.press' },
  { id: 'aperture', title: () => 'Aperture Systems', url: () => 'https://aperture.systems/press' },
];

export function site(S) {
  const id = S?.ui?.os?.web;
  return SITES.find((s) => s.id === id) || SITES[0];
}

export function render(S) {
  const cur = site(S);
  return `<div class="web" data-ctx="browser">
    <div class="web-bar">
      <span class="web-tabs">
        ${SITES.map((s) => `<button class="web-tab ${s.id === cur.id ? 'on' : ''}" type="button" data-act="web-site" data-v="${s.id}">${esc(s.title(S))}</button>`).join('')}
      </span>
      <span class="web-url mono">${esc(cur.url(S))}</span>
    </div>
    <div class="web-page">${page(S, cur.id)}</div>
  </div>`;
}

function page(S, id) {
  if (id === 'aperture') return aperture(S);
  if (id === 'ledger') return ledger(S);
  return home(S);
}

function aperture(S) {
  const origin = safe(() => resolveOrigin(), null);
  if (!origin) {
    return `<div class="web-offline">
      <div class="web-offline-k">This site can't be reached</div>
      <div class="web-offline-line">${esc(line('web_offline'))}</div>
      <div class="tiny dimmer mt12">${esc(lore('browser'))}</div>
    </div>`;
  }
  return `<iframe class="web-frame" src="${esc(origin)}/rival/?view=1" title="Aperture Systems — press office"></iframe>`;
}

function ledger(S) {
  const news = (S.feed || []).filter((f) => f.type === 'news' || f.type === 'incident' || f.type === 'launch').slice(0, 14);
  const lead = news[0];
  const rest = news.slice(1);
  const social = (S.feed || []).filter((f) => f.type === 'social' || f.type === 'hn').slice(0, 6);
  const macro = MACRO[S.market.macro];
  const rival = nemesisOf(S);
  return `<div class="web-ledger">
    <div class="wl-mast">
      <span class="wl-date">${esc(gameDate(S.time.day))}</span>
      <span class="wl-name">The Ledger</span>
      <span class="wl-tag">The paper of record for a category that did not exist four years ago</span>
    </div>
    <div class="wl-cols">
      <div class="wl-lead">
        ${lead ? `<div class="wl-kicker">${esc((lead.author || lead.type || 'news').toString())}</div>
          <div class="wl-head">${md(lead.text)}</div>
          ${lead.meta ? `<div class="wl-sub">${md(lead.meta)}</div>` : ''}` : `<div class="wl-head">${esc(line('ledger_quiet'))}</div>`}
        <div class="wl-rule"></div>
        ${rest.map((f) => `<div class="wl-item"><span class="wl-item-d">d${f.day}</span><span>${md(f.text)}</span></div>`).join('') || ''}
      </div>
      <div class="wl-side">
        <div class="wl-box">
          <div class="wl-box-k">Markets</div>
          <div class="wl-row"><span>Regime</span><span style="color:${macro?.color || 'inherit'}">${esc(macro?.name || '—')}</span></div>
          <div class="wl-row"><span>Sector hype</span><span>${Math.round((S.market.hype || 0) * 100)}%</span></div>
          <div class="wl-row"><span>${esc(S.company.name)}</span><span>${money(S.company.valuation)}</span></div>
          ${rival ? `<div class="wl-row"><span>${esc(rival.name)}</span><span>${fmt(rival.users)} users</span></div>` : ''}
        </div>
        <div class="wl-box">
          <div class="wl-box-k">Overheard</div>
          ${social.map((f) => `<div class="wl-quote">“${md(f.text)}”<span class="wl-who">${esc(f.author || '')}</span></div>`).join('') || `<div class="wl-quote dim">${esc(line('feed'))}</div>`}
        </div>
      </div>
    </div>
  </div>`;
}

function home(S) {
  const p = activeProduct(S);
  const cat = p ? CATEGORY_MAP[p.category] : null;
  const pricing = p ? PRICING_MODELS[p.pricing] : null;
  const feats = p ? p.features.slice(-6).reverse() : [];
  const users = totalUsers(S);
  return `<div class="web-home">
    <div class="wh-nav"><span class="wh-logo">${esc(S.company.name)}</span><span class="wh-links"><span>Product</span><span>Pricing</span><span>Company</span></span></div>
    <div class="wh-hero">
      <div class="wh-kicker">${esc(cat?.name || 'Software')}</div>
      <div class="wh-title">${esc(p?.name || S.company.name)}</div>
      <div class="wh-tag">${esc(S.company.tagline || cat?.tagline || '')}</div>
      <div class="wh-cta"><span class="wh-btn">${p?.launched ? 'Start free' : 'Join the waitlist'}</span>
        <span class="wh-proof">${p?.launched ? `Used by ${fmt(users)} people` : 'Not yet live'}</span></div>
    </div>
    <div class="wh-grid">
      <div class="wh-col">
        <div class="wh-k">What it does</div>
        ${feats.length ? feats.map((f) => `<div class="wh-feat"><b>${esc(f.name)}</b></div>`).join('') : `<div class="wh-feat dim">Nothing shipped yet. The page is ahead of the product, as pages are.</div>`}
      </div>
      <div class="wh-col">
        <div class="wh-k">Pricing</div>
        <div class="wh-price">${p?.launched ? `${money(p.price)}<span>/mo</span>` : '—'}</div>
        <div class="wh-feat dim">${esc(pricing?.name || '')}</div>
        <div class="wh-k mt12">Company</div>
        <div class="wh-feat dim">One person. ${S.agents.length ? `${S.agents.length} agent${S.agents.length === 1 ? '' : 's'}.` : 'Several machines.'} We are not hiring humans.</div>
      </div>
    </div>
    <div class="wh-foot">© ${2027 + Math.floor(S.time.day / 360)} ${esc(S.company.name)} · ${money(totalMrr(S))}/mo, if you were wondering</div>
  </div>`;
}

export function readoutFor(S) { return esc(site(S).url(S)).toUpperCase(); }

export function menuFor(S) {
  const cur = site(S);
  return SITES.map((s) => ({ label: s.title(S), act: 'web-site', v: s.id, checked: s.id === cur.id }));
}
