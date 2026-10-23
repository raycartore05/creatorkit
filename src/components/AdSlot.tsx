import { useEffect, useRef } from 'react';
import { adsEnabled, site } from '../config/site';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

function ensureScript() {
  if (document.querySelector('script[data-ck-adsense]')) return;
  const s = document.createElement('script');
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.dataset.ckAdsense = '1';
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${site.adsenseClient}`;
  document.head.appendChild(s);
}

/**
 * A single display ad unit. Renders nothing unless ads are explicitly
 * enabled at build time (see .env.example). Placed only after tool content,
 * never beside upload, download or editing controls.
 */
export function AdSlot() {
  const pushed = useRef(false);
  useEffect(() => {
    if (!adsEnabled || pushed.current) return;
    pushed.current = true;
    ensureScript();
    try {
      (window.adsbygoogle = window.adsbygoogle ?? []).push({});
    } catch {
      // Ad blockers or consent refusal: ignore.
    }
  }, []);
  if (!adsEnabled) return null;
  return (
    <aside aria-label="Advertisement" className="my-10 border-y border-line py-4">
      <p className="mb-2 text-xs text-muted">Advertisement</p>
      <ins
        className="adsbygoogle block"
        style={{ display: 'block', minHeight: 100 }}
        data-ad-client={site.adsenseClient}
        data-ad-slot={site.adsenseSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
