/**
 * Minimal static server that mimics Cloudflare Pages for local testing:
 * - /about → about.html (no trailing slash), /about/ → 308 to /about
 * - unknown paths → 404.html with HTTP 404
 * - applies headers from dist/_headers (the "/*" and "/assets/*" blocks)
 * Usage: node scripts/serve-dist.mjs [port]
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = resolve(fileURLToPath(new URL('../dist', import.meta.url)));
const port = Number(process.argv[2] ?? 4173);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json', '.json': 'application/json',
};

function parseHeaders(text) {
  const rules = [];
  let cur = null;
  for (const line of text.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!line.startsWith(' ')) {
      cur = { pattern: line.trim(), headers: {} };
      rules.push(cur);
    } else if (cur) {
      const i = line.indexOf(':');
      cur.headers[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }
  return rules.filter((r) => r.pattern.startsWith('/'));
}
const rules = parseHeaders(await readFile(join(dist, '_headers'), 'utf8'));
const matches = (pattern, path) => (pattern.endsWith('*') ? path.startsWith(pattern.slice(0, -1)) : pattern === path);

async function exists(p) {
  try {
    return (await stat(p)).isFile();
  } catch {
    return false;
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  let path = decodeURIComponent(url.pathname);
  if (path.length > 1 && path.endsWith('/')) {
    res.writeHead(308, { Location: path.replace(/\/+$/, '') });
    return res.end();
  }
  const safe = normalize(path).replace(/^(\.\.[/\\])+/, '');
  let file = join(dist, safe);
  let status = 200;
  if (!file.startsWith(dist)) file = join(dist, '404.html');
  if (path === '/') file = join(dist, 'index.html');
  else if (!(await exists(file))) {
    file = (await exists(`${file}.html`)) ? `${file}.html` : join(dist, '404.html');
    if (file.endsWith('404.html')) status = 404;
  }
  if (file.endsWith('_headers')) {
    file = join(dist, '404.html');
    status = 404;
  }
  const headers = { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' };
  for (const r of rules) if (matches(r.pattern, path)) Object.assign(headers, r.headers);
  res.writeHead(status, headers);
  res.end(await readFile(file));
}).listen(port, () => console.log(`Serving dist on http://localhost:${port}`));
