import { site } from '../config/site';
import type { RouteMeta } from '../data/routes';

export function canonicalUrl(path: string): string {
  if (path === '/') return `${site.origin}/`;
  return `${site.origin}${path.replace(/\/+$/, '')}`;
}

export const OG_IMAGE = `${site.origin}/og-image.png`;

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export function buildHeadTags(meta: RouteMeta, structuredData: unknown[] = []): string {
  const url = canonicalUrl(meta.path);
  const tags = [
    `<title>${esc(meta.title)}</title>`,
    `<meta name="description" content="${esc(meta.description)}" />`,
    meta.indexable ? `<link rel="canonical" href="${url}" />` : `<meta name="robots" content="noindex, follow" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${site.name}" />`,
    `<meta property="og:locale" content="${site.locale}" />`,
    `<meta property="og:title" content="${esc(meta.title)}" />`,
    `<meta property="og:description" content="${esc(meta.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${OG_IMAGE}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="CreatorKit — ${esc(site.tagline)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(meta.title)}" />`,
    `<meta name="twitter:description" content="${esc(meta.description)}" />`,
    `<meta name="twitter:image" content="${OG_IMAGE}" />`,
  ];
  if (site.googleSiteVerification && meta.path === '/') {
    tags.push(`<meta name="google-site-verification" content="${esc(site.googleSiteVerification)}" />`);
  }
  if (site.adsenseClient) {
    // Lets Google verify site ownership during AdSense review without loading ad code.
    tags.push(`<meta name="google-adsense-account" content="${esc(site.adsenseClient)}" />`);
  }
  for (const data of structuredData) {
    tags.push(`<script type="application/ld+json">${jsonLd(data)}</script>`);
  }
  return tags.join('\n    ');
}

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbSchema(crumbs: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: canonicalUrl(c.path),
    })),
  };
}

/** Describes a free browser tool. No ratings or reviews are claimed. */
export function webAppSchema(name: string, path: string, description: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name,
    url: canonicalUrl(path),
    description,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Any (modern web browser)',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.name,
    url: `${site.origin}/`,
    description: site.tagline,
    inLanguage: 'en',
  };
}
