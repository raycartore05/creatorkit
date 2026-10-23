/**
 * Site-wide settings. Every value here is public (it ships in the HTML),
 * so never put secrets in VITE_* variables.
 */
const env = import.meta.env;

function clean(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

const adsenseClientRaw = clean(env.VITE_ADSENSE_CLIENT);
const adsenseClient = /^ca-pub-\d{10,20}$/.test(adsenseClientRaw) ? adsenseClientRaw : '';
const adsenseSlot = /^\d{6,20}$/.test(clean(env.VITE_ADSENSE_SLOT)) ? clean(env.VITE_ADSENSE_SLOT) : '';
const contactEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(env.VITE_CONTACT_EMAIL))
  ? clean(env.VITE_CONTACT_EMAIL)
  : '';

export const site = {
  name: 'CreatorKit',
  tagline: 'Create. Resize. Share.',
  origin: 'https://creator.rayore.co.nz',
  parentName: 'RayOre',
  parentUrl: 'https://rayore.co.nz',
  locale: 'en_NZ',
  contactEmail,
  googleSiteVerification: clean(env.VITE_GOOGLE_SITE_VERIFICATION),
  adsenseClient,
  adsenseSlot,
  buildDate: typeof __BUILD_DATE__ === 'string' ? __BUILD_DATE__ : '',
};

/**
 * Ads render only when explicitly switched on AND a valid publisher + slot
 * are configured. Default build: no ad code, no ad network requests.
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
