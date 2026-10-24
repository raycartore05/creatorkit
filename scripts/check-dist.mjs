/**
 * Post-build checks on dist/: metadata on every page, internal links resolve,
 * no secrets or third-party script/font origins, no ad code when ads are off.
 * Exits non-zero on any failure.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = resolve(fileURLToPath(new URL('../dist', import.meta.url)));
const ORIGIN = 'https://creator.rayore.co.nz';
const problems = [];
const EXPECTED_GA = 'G-WPEHRBK1Q4';
const warn = [];

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}
const files = await walk(dist);
const htmlFiles = files.filter((f) => f.endsWith('.html'));
const routeOf = (f) => {
  const r = '/' + relative(dist, f).replace(/\.html$/, '');
  return r === '/index' ? '/' : r;
};
const exists = async (p) => stat(p).then((s) => s.isFile()).catch(() => false);
async function resolves(href) {
  const path = href.split('#')[0].split('?')[0];
  if (path === '' || path === '/') return true;
  return (await exists(join(dist, path))) || (await exists(join(dist, `${path}.html`)));
}

const titles = new Map();
const descs = new Map();
for (const f of htmlFiles) {
  const html = await readFile(f, 'utf8');
  const route = routeOf(f);
  const title = /<title>([^<]*)<\/title>/.exec(html)?.[1];
  const desc = /<meta name="description" content="([^"]*)"/.exec(html)?.[1];
  const h1s = (html.match(/<h1[\s>]/g) ?? []).length;
  if (!title) problems.push(`${route}: missing <title>`);
  if (!desc) problems.push(`${route}: missing meta description`);
  if (h1s !== 1) problems.push(`${route}: expected 1 <h1>, found ${h1s}`);
  if (route !== '/404') {
    const canon = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1];
    const expected = route === '/' ? `${ORIGIN}/` : `${ORIGIN}${route}`;
    if (canon !== expected) problems.push(`${route}: canonical ${canon} != ${expected}`);
    if (title) titles.set(title, [...(titles.get(title) ?? []), route]);
    if (desc) descs.set(desc, [...(descs.get(desc) ?? []), route]);
  } else if (!html.includes('noindex')) problems.push('/404: should be noindex');
  if (/http:\/\/(?!www\.w3\.org)/.test(html)) problems.push(`${route}: contains an http:// (mixed-content risk) URL`);
  for (const m of html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)) {
    const isAdsense = m[1] === 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8644589635574920';
    const isGtag = m[1] === `https://www.googletagmanager.com/gtag/js?id=${EXPECTED_GA}`;
    if (!m[1].startsWith('/') && !isAdsense && !isGtag) problems.push(`${route}: third-party script ${m[1]}`);
  }
  if (/fonts\.googleapis|fonts\.gstatic/.test(html)) problems.push(`${route}: third-party font request`);
  if (/<script(?![^>]*(type="application\/ld\+json"|src=))[^>]*>/.test(html)) problems.push(`${route}: inline script (blocked by CSP)`);
  for (const m of html.matchAll(/href="(\/[^"]*)"/g)) {
    if (!(await resolves(m[1]))) problems.push(`${route}: broken internal link ${m[1]}`);
  }
  if (html.includes('data-testid="contact-missing"')) warn.push(`${route}: contact email not configured`);
}
for (const [t, r] of titles) if (r.length > 1) problems.push(`Duplicate title "${t}" on ${r.join(', ')}`);
for (const [, r] of descs) if (r.length > 1) problems.push(`Duplicate description on ${r.join(', ')}`);

const headers = await readFile(join(dist, '_headers'), 'utf8');
// Only the AdSense CSP allows frames.
const adsOn = headers.includes('frame-src https:');
const gaOn = await exists(join(dist, 'ga-init.js'));
for (const f of files.filter((x) => /\.(js|html|css|txt|xml|json|webmanifest)$/.test(x) || x.endsWith('_headers'))) {
  const text = await readFile(f, 'utf8');
  const rel = relative(dist, f);
  if (/(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]{10,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,}|-----BEGIN [A-Z ]*PRIVATE KEY|xox[baprs]-[A-Za-z0-9-]{10,}/.test(text)) {
    problems.push(`${rel}: looks like it contains a secret`);
  }
  if (/[\w.+-]+@gmail\.com/i.test(text)) problems.push(`${rel}: contains a personal @gmail.com address (only the public support address should appear)`);
  if (/paypal\.com\/sdk|paypalobjects\.com|braintreegateway|js\.stripe\.com/i.test(text)) problems.push(`${rel}: payment SDK reference found (only a plain PayPal.Me link is allowed)`);
  if (!adsOn && /googlesyndication\.com\/pagead\/js/.test(text) && !rel.startsWith('assets/')) {
    problems.push(`${rel}: AdSense script present while ads are disabled`);
  }
}
if (!adsOn && (await exists(join(dist, 'ads.txt')))) problems.push('ads.txt present while ads disabled');

// AdSense: when enabled, every content page has exactly one correct script tag,
// the 404 page has none, and ads.txt holds exactly the expected record.
const EXPECTED_CLIENT = 'ca-pub-8644589635574920';
const SCRIPT = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${EXPECTED_CLIENT}" crossorigin="anonymous"></script>`;
if (adsOn) {
  for (const f of htmlFiles) {
    const html = await readFile(f, 'utf8');
    const route = routeOf(f);
    const n = (html.match(/adsbygoogle\.js/g) ?? []).length;
    if (route === '/404') {
      if (n !== 0) problems.push('/404: AdSense script should not be on the error page');
      continue;
    }
    if (n !== 1) problems.push(`${route}: expected exactly 1 AdSense script, found ${n}`);
    else if (!html.includes(SCRIPT)) problems.push(`${route}: AdSense script tag differs from the expected snippet`);
    const head = html.slice(0, html.indexOf('</head>'));
    if (!head.includes(SCRIPT)) problems.push(`${route}: AdSense script is not inside <head>`);
    if (!head.includes(`<meta name="google-adsense-account" content="${EXPECTED_CLIENT}" />`)) problems.push(`${route}: missing google-adsense-account meta`);
  }
  const adsTxt = (await exists(join(dist, 'ads.txt'))) ? await readFile(join(dist, 'ads.txt'), 'utf8') : '';
  if (adsTxt !== 'google.com, pub-8644589635574920, DIRECT, f08c47fec0942fa0\n') problems.push(`ads.txt content unexpected: ${JSON.stringify(adsTxt)}`);
  if (!/\/ads\.txt\n {2}Content-Type: text\/plain/.test(headers)) problems.push('_headers: /ads.txt is not served as text/plain');
  for (const f of files.filter((x) => x.endsWith('.js'))) {
    if (/ins class="adsbygoogle"[^>]*data-ad-slot="(?!\d)/.test(await readFile(f, 'utf8'))) problems.push(`${relative(dist, f)}: ad unit without a numeric slot`);
  }
}
// Google Analytics: when enabled, every content page loads /ga-init.js then
// gtag.js exactly once, both before AdSense; the 404 page has neither; the only
// GA4 ID anywhere in the build is CreatorKit's own; consent defaults precede config.
if (gaOn) {
  const GTAG = `<script async src="https://www.googletagmanager.com/gtag/js?id=${EXPECTED_GA}"></script>`;
  const INIT = '<script src="/ga-init.js"></script>';
  for (const f of htmlFiles) {
    const html = await readFile(f, 'utf8');
    const route = routeOf(f);
    const nGtag = (html.match(/googletagmanager\.com\/gtag\/js/g) ?? []).length;
    const nInit = (html.match(/\/ga-init\.js/g) ?? []).length;
    if (route === '/404') {
      if (nGtag || nInit) problems.push('/404: Google Analytics should not be on the error page');
      continue;
    }
    if (nGtag !== 1 || nInit !== 1) problems.push(`${route}: expected gtag.js and ga-init.js once each, found ${nGtag} and ${nInit}`);
    const head = html.slice(0, html.indexOf('</head>'));
    const iInit = head.indexOf(INIT);
    const iGtag = head.indexOf(GTAG);
    const iAds = head.indexOf('adsbygoogle.js');
    if (iInit < 0 || iGtag < 0) problems.push(`${route}: GA tags missing from <head> or differ from the expected snippet`);
    else if (!(iInit < iGtag && (iAds < 0 || iGtag < iAds))) problems.push(`${route}: GA tags must come before AdSense, ga-init.js first`);
  }
  const init = await readFile(join(dist, 'ga-init.js'), 'utf8');
  const iConsent = init.indexOf("gtag('consent', 'default'");
  const iConfig = init.indexOf(`gtag('config', '${EXPECTED_GA}')`);
  if (iConsent < 0 || iConfig < 0 || iConsent > iConfig) problems.push('ga-init.js: consent default must be set before config');
  if (!/"analytics_storage":"denied"/.test(init) || !/"GB"/.test(init) || !/"CH"/.test(init) || !/"DE"/.test(init)) problems.push('ga-init.js: EEA/UK/CH consent defaults missing');
  if (/send_page_view|'event', ?'page_view'/.test(init)) problems.push('ga-init.js: must not send page_view manually (enhanced measurement does)');
} else if (htmlFiles.length) {
  for (const f of htmlFiles) if (/googletagmanager|ga-init\.js/.test(await readFile(f, 'utf8'))) problems.push(`${routeOf(f)}: GA code present while analytics is disabled`);
}
for (const f of files.filter((x) => /\.(js|html)$/.test(x))) {
  // Only Google's consent message may change consent; CreatorKit must never send an update.
  if (/['"]consent['"]\s*,\s*['"]update['"]/.test(await readFile(f, 'utf8'))) problems.push(`${relative(dist, f)}: sends a consent update (only Google's consent message may do that)`);
  for (const m of (await readFile(f, 'utf8')).matchAll(/\bG-[A-Z0-9]{8,12}\b/g)) {
    if (m[0] !== EXPECTED_GA) problems.push(`${relative(dist, f)}: unexpected GA4 measurement ID ${m[0]}`);
  }
}

for (const req of ['robots.txt', 'sitemap.xml', '404.html', '_headers', 'favicon.svg', 'og-image.png', 'site.webmanifest']) {
  if (!(await exists(join(dist, req)))) problems.push(`missing dist/${req}`);
}

console.log(`Checked ${htmlFiles.length} HTML files and ${files.length} files total.`);
for (const w of warn) console.log(`WARN  ${w}`);
if (problems.length) {
  for (const p of problems) console.error(`FAIL  ${p}`);
  process.exit(1);
}
console.log('All dist checks passed.');
