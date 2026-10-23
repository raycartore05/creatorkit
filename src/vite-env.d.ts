/// <reference types="vite/client" />

declare const __BUILD_DATE__: string;

interface ImportMetaEnv {
  readonly VITE_CONTACT_EMAIL?: string;
  readonly VITE_GOOGLE_SITE_VERIFICATION?: string;
  readonly VITE_ADSENSE_CLIENT?: string;
  readonly VITE_ADS_ENABLED?: string;
  readonly VITE_ADSENSE_SLOT?: string;
}
