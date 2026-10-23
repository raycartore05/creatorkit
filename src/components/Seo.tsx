import { createContext, useContext, useEffect } from 'react';
import { metaForPath } from '../data/routes';
import { canonicalUrl, jsonLd } from '../lib/seo';

/** Collects structured data during prerender; syncs <head> after client navigation. */
export interface SeoCollector {
  schemas: unknown[];
}

export const SeoContext = createContext<SeoCollector | null>(null);

function setMeta(selector: string, attr: 'content' | 'href', value: string) {
  document.head.querySelector(selector)?.setAttribute(attr, value);
}

export function Seo({ path, schemas = [] }: { path: string; schemas?: unknown[] }) {
  const collector = useContext(SeoContext);
  if (collector && typeof window === 'undefined') collector.schemas.push(...schemas);

  const meta = metaForPath(path);
  const schemaJson = JSON.stringify(schemas);

  useEffect(() => {
    document.title = meta.title;
    setMeta('meta[name="description"]', 'content', meta.description);
    setMeta('meta[property="og:title"]', 'content', meta.title);
    setMeta('meta[property="og:description"]', 'content', meta.description);
    setMeta('meta[name="twitter:title"]', 'content', meta.title);
    setMeta('meta[name="twitter:description"]', 'content', meta.description);
    const url = canonicalUrl(meta.path);
    setMeta('meta[property="og:url"]', 'content', url);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    let robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (meta.indexable) {
      robots?.remove();
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.rel = 'canonical';
        document.head.appendChild(canonical);
      }
      canonical.href = url;
    } else {
      canonical?.remove();
      if (!robots) {
        robots = document.createElement('meta');
        robots.name = 'robots';
        document.head.appendChild(robots);
      }
      robots.content = 'noindex, follow';
    }
    document.head.querySelectorAll('script[type="application/ld+json"]').forEach((s) => s.remove());
    for (const data of JSON.parse(schemaJson) as unknown[]) {
      const s = document.createElement('script');
      s.type = 'application/ld+json';
      s.textContent = jsonLd(data);
      document.head.appendChild(s);
    }
  }, [meta, schemaJson]);

  return null;
}
