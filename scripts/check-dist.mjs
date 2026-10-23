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
    if (!m[1].startsWith('/')) problems.push(`${route}: third-party script ${m[1]}`);
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
const adsOn = !headers.includes("script-src 'self';");
for (const f of files.filter((x) => /\.(js|html|css|txt|xml|json|webmanifest)$/.test(x) || x.endsWith('_headers'))) {
  const text = await readFile(f, 'utf8');
  const rel = relative(dist, f);
  if (/(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]{10,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,}|-----BEGIN [A-Z ]*PRIVATE KEY|xox[baprs]-[A-Za-z0-9-]{10,}/.test(text)) {
    problems.push(`${rel}: looks like it contains a secret`);
  }
  if (!adsOn && /googlesyndication\.com\/pagead\/js/.test(text) && !rel.startsWith('assets/')) {
    problems.push(`${rel}: AdSense script present while ads are disabled`);
  }
}
if (!adsOn && (await exists(join(dist, 'ads.txt')))) problems.push('ads.txt present while ads disabled');
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
