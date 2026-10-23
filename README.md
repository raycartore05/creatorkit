# CreatorKit

Free, browser-based tools for preparing social media and web content.
Production: https://creator.rayore.co.nz · Parent brand: https://rayore.co.nz

Tools (all functional, all processing done in the browser):

| Tool | Route |
|---|---|
| Social Media Image Resizer | `/tools/image-resizer` |
| Image Compressor | `/tools/image-compressor` |
| Profile Picture & Cover Cropper | `/tools/profile-cropper` |
| QR Code Generator | `/tools/qr-code-generator` |
| Social Sharing (Open Graph) Preview | `/tools/og-preview` |
| Caption & Text Formatter | `/tools/caption-formatter` |
| Image Watermark Tool | `/tools/watermark` |

Plus a sizes guide, About, Contact, Privacy, Terms and a 404 page.

## Stack

React 19 + TypeScript + Vite 8 + Tailwind CSS 4, prerendered to static HTML
(`scripts/prerender.mjs`) and hosted on Cloudflare Pages. No backend, no
database, no analytics, no cookies. Heading font is self-hosted
(Bricolage Grotesque via Fontsource); body text uses system fonts.

## Commands

```bash
npm ci                 # install exact dependency versions
npm run dev            # local dev server
npm run lint           # ESLint
npm run typecheck      # TypeScript
npm test               # unit + component tests (Vitest, jsdom)
npm run build          # typecheck, client build, SSR build, prerender
npm run check:dist     # metadata, links, secrets, ad-code checks on dist/
npm run test:e2e       # Playwright browser tests against dist/ (desktop + mobile)
npm run verify         # everything above, in order
node scripts/serve-dist.mjs 4173   # serve dist/ like Cloudflare Pages does
```

E2E tests use a system Chrome if one is installed, otherwise run
`npx playwright install chromium` first.

## Configuration

All settings are build-time `VITE_*` variables (see `.env.example`). They are
public: never put secrets in them.

| Variable | Purpose |
|---|---|
| `VITE_CONTACT_EMAIL` | Address shown on /contact, /privacy, /terms. **Required before AdSense review.** |
| `VITE_GOOGLE_SITE_VERIFICATION` | Search Console HTML-tag token (homepage only). |
| `VITE_ADSENSE_CLIENT` | `ca-pub-…` for CreatorKit's own AdSense site entry. Adds the `google-adsense-account` meta tag and `ads.txt`. Does **not** load ads. |
| `VITE_ADS_ENABLED` | `true` loads ad code. Only after approval and a consent message for EEA/UK/CH. |
| `VITE_ADSENSE_SLOT` | Display ad unit ID. |

Turning ads on also switches the generated CSP and privacy policy text to
the advertising versions automatically.

## Cloudflare Pages settings

- Framework preset: None
- Build command: `npm run build`
- Build output directory: `dist`
- Production branch: `main`
- Environment variable: `NODE_VERSION=22` (also pinned in `.node-version`)
- Custom domain: `creator.rayore.co.nz`

`dist/_headers` (generated) sets security headers, CSP and caching:
hashed `/assets/*` are immutable for a year; HTML revalidates on every request.
`*.pages.dev` hostnames get `X-Robots-Tag: noindex`.

## Image size presets

Defined in `src/data/presets.ts`. Each preset is marked `official` (checked on
the platform's help page, with a link) or `common` (widely used, not confirmed).
Re-check them every few months and update `PRESETS_CHECKED_ON`.

## Backup and recovery

The Git repository is the source of truth; the site has no data to back up.
To recover: clone, `npm ci`, `npm run build`, redeploy `dist/` (or roll back to
an earlier deployment in Cloudflare Pages › Deployments).
