/** Build-time renderer used by scripts/prerender.mjs. Not shipped to browsers. */
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import App from './App';
import { SeoContext, type SeoCollector } from './components/Seo';
import { adsEnabled, adsenseScriptEnabled, analyticsEnabled, site } from './config/site';
import { gaInitScript } from './lib/analytics';
import { metaForPath, NOT_FOUND_META, ROUTES } from './data/routes';
import { buildHeadTags, canonicalUrl } from './lib/seo';

export function render(url: string): { html: string; head: string } {
  const collector: SeoCollector = { schemas: [] };
  const html = renderToString(
    <StrictMode>
      <SeoContext.Provider value={collector}>
        <StaticRouter location={url}>
          <App />
        </StaticRouter>
      </SeoContext.Provider>
    </StrictMode>,
  );
  const meta = url === '/404' ? NOT_FOUND_META : metaForPath(url);
  return { html, head: buildHeadTags(meta, collector.schemas) };
}

export const routes = ROUTES;
export { canonicalUrl, site, adsEnabled, adsenseScriptEnabled, analyticsEnabled, gaInitScript };
