/** Helpers for the Open Graph preview tool. No network access. */

export function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export type UrlCheck = { ok: true; url: URL } | { ok: false; message: string };

/** Accept only absolute http(s) URLs. */
export function checkHttpUrl(value: string): UrlCheck {
  const v = value.trim();
  if (!v) return { ok: false, message: 'Enter a URL.' };
  let u: URL;
  try {
    u = new URL(v);
  } catch {
    return { ok: false, message: 'Enter a full URL, including https:// at the start.' };
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') {
    return { ok: false, message: 'Only http:// and https:// URLs are supported.' };
  }
  if (!u.hostname.includes('.') && u.hostname !== 'localhost') {
    return { ok: false, message: 'That URL is missing a domain name (for example example.com).' };
  }
  return { ok: true, url: u };
}

export interface OgInput {
  title: string;
  description: string;
  url: string;
  imageUrl: string;
  siteName: string;
  imageAlt: string;
}

export function buildOgTags(i: OgInput): string {
  const lines: string[] = [];
  const add = (prop: string, value: string, attr: 'property' | 'name' = 'property') => {
    if (value.trim()) lines.push(`<meta ${attr}="${prop}" content="${escapeAttr(value.trim())}" />`);
  };
  if (i.title.trim()) lines.push(`<title>${escapeAttr(i.title.trim())}</title>`);
  add('description', i.description, 'name');
  add('og:type', 'website');
  add('og:title', i.title);
  add('og:description', i.description);
  add('og:url', i.url);
  add('og:site_name', i.siteName);
  add('og:image', i.imageUrl);
  add('og:image:alt', i.imageAlt);
  add('twitter:card', i.imageUrl.trim() ? 'summary_large_image' : 'summary', 'name');
  add('twitter:title', i.title, 'name');
  add('twitter:description', i.description, 'name');
  add('twitter:image', i.imageUrl, 'name');
  return lines.join('\n');
}

export interface LengthAdvice {
  level: 'empty' | 'short' | 'good' | 'long';
  message: string;
}

/**
 * Rules of thumb only. Platforms truncate by pixel width and device,
 * not by a fixed character count.
 */
export function titleAdvice(n: number): LengthAdvice {
  if (n === 0) return { level: 'empty', message: 'Add a title. Without one, platforms fall back to the page URL or <title>.' };
  if (n < 15) return { level: 'short', message: 'Quite short. A few more descriptive words usually help.' };
  if (n <= 60) return { level: 'good', message: 'Good length. Titles up to about 60 characters are rarely cut off.' };
  return { level: 'long', message: 'Long titles are often truncated, especially on mobile. Put key words first.' };
}

export function descriptionAdvice(n: number): LengthAdvice {
  if (n === 0) return { level: 'empty', message: 'Add a description. Many cards show one or two lines of it.' };
  if (n < 50) return { level: 'short', message: 'Short. Consider a full sentence that explains what the page offers.' };
  if (n <= 160) return { level: 'good', message: 'Good length. Many layouts show roughly the first 100–160 characters.' };
  return { level: 'long', message: 'Likely to be truncated. Keep the most important point in the first sentence.' };
}

/** Display hostname for the card footer, e.g. "EXAMPLE.COM". */
export function displayDomain(url: string): string {
  const c = checkHttpUrl(url);
  return c.ok ? c.url.hostname.replace(/^www\./, '') : '';
}

export function imageRatioAdvice(w: number, h: number): string {
  if (!(w > 0 && h > 0)) return '';
  const r = w / h;
  if (Math.abs(r - 1.91) < 0.08) return 'About 1.91:1 — the shape most large link-preview cards use (e.g. 1200 × 630).';
  if (Math.abs(r - 1) < 0.05) return 'Square. Some platforms show square images as a small thumbnail instead of a large card.';
  if (r > 1.91) return 'Wider than 1.91:1. The sides may be cropped in large cards.';
  return 'Taller than 1.91:1. The top and bottom may be cropped in large cards.';
}
