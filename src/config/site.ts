/**
 * Site-wide settings. Every value here is public (it ships in the HTML),
 * so never put secrets in VITE_* variables.
 */
const env = import.meta.env;

function clean(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/**
 * CreatorKit's AdSense publisher (same account as SmartCalcWorks; matches its
 * ads.txt). VITE_ADSENSE_CLIENT can override it. Set VITE_ADSENSE_SCRIPT=false
 * to build without any AdSense code (e.g. for local experiments).
 */
export const ADSENSE_CLIENT = 'ca-pub-8644589635574920';
const adsenseClientRaw = clean(env.VITE_ADSENSE_CLIENT) || ADSENSE_CLIENT;
const adsenseClient =
  clean(env.VITE_ADSENSE_SCRIPT) !== 'false' && /^ca-pub-\d{10,20}$/.test(adsenseClientRaw) ? adsenseClientRaw : '';
const adsenseSlot = /^\d{6,20}$/.test(clean(env.VITE_ADSENSE_SLOT)) ? clean(env.VITE_ADSENSE_SLOT) : '';
/** Public support address (Cloudflare Email Routing). VITE_CONTACT_EMAIL can override it. */
export const SUPPORT_EMAIL = 'creatorkit-support@rayore.co.nz';
const contactEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(env.VITE_CONTACT_EMAIL))
  ? clean(env.VITE_CONTACT_EMAIL)
  : SUPPORT_EMAIL;

export const site = {
  name: 'CreatorKit',
  tagline: 'Create. Resize. Share.',
  origin: 'https://creator.rayore.co.nz',
  parentName: 'RayOre',
  parentUrl: 'https://rayore.co.nz',
  /** Voluntary support link (PayPal.Me). A plain external link: no SDK, no tracking. */
  supportUrl: 'https://paypal.me/RaycartOre',
  locale: 'en_NZ',
  contactEmail,
  googleSiteVerification: clean(env.VITE_GOOGLE_SITE_VERIFICATION),
  adsenseClient,
  adsenseSlot,
  buildDate: typeof __BUILD_DATE__ === 'string' ? __BUILD_DATE__ : '',
};

/**
 * The AdSense script (adsbygoogle.js) is placed once in every page's <head>
 * at build time whenever a publisher ID is configured. It is needed for site
 * verification and review, and loads Google's ad code (which may use cookies),
 * but on its own places no ad units on the page.
 */
export const adsenseScriptEnabled = site.adsenseClient !== '';

/**
 * Manual ad units render only when explicitly switched on AND a real ad-unit
 * slot ID from the AdSense dashboard is configured. No slot ID is invented.
 */
export const adsEnabled =
  clean(env.VITE_ADS_ENABLED) === 'true' && site.adsenseClient !== '' && site.adsenseSlot !== '';

/** Upload limits shared by every image tool. */
export const LIMITS = {
  maxFileBytes: 25 * 1024 * 1024,
  /** Decoding very large images can crash mobile browsers. */
  maxSourcePixels: 50_000_000,
  /** iOS Safari caps canvas area at ~16.7 MP. */
  maxOutputPixels: 16_000_000,
  maxOutputSide: 8192,
};
