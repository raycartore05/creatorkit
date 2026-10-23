# CreatorKit launch checklist

Status as of 2026-10-24. Legend: ✅ completed and verified · ☑️ completed, not
independently verified · 👤 requires Ray's action · ⛔ blocked · ⬜ not implemented

| Item | Status | Notes |
|---|---|---|
| All 7 tools functional | ✅ | Verified by Playwright in real Chrome (desktop + Pixel 7 viewport) |
| Unit + component tests | ✅ | `npm test`: 63/63 passing |
| End-to-end tests | ✅ | `npm run test:e2e`: 63 passed, 1 skipped (desktop-only menu test on desktop) |
| Accessibility (axe WCAG 2.1 AA) | ✅ | 0 violations on all 13 pages, desktop and mobile |
| Mobile rendering / no horizontal scroll | ✅ | Checked on every page and with images loaded |
| Security & privacy review | ✅ | 0 npm audit findings; no secrets; CSP `script-src 'self'`; no third-party requests during any tool flow (asserted in tests) |
| Performance review | ☑️ | Main JS 125 KB gzip, CSS 6.6 KB gzip, QR library lazy-loaded; prerendered HTML. Lighthouse/Core Web Vitals not measured yet (needs live URL) |
| About, Privacy, Terms pages | ✅ | Privacy policy matches the implementation (no cookies, analytics or ads) |
| Contact page | ✅ | Shows creatorkit-support@rayore.co.nz (Cloudflare Email Routing). Send a test email to confirm delivery |
| robots.txt, sitemap.xml, canonical, OG tags | ✅ | Generated at build; checked by `check:dist` and e2e |
| GitHub repository | 👤 | Create `raycartore05/creatorkit` (or sign in to GitHub in the desktop app's browser) |
| Cloudflare Pages project + `creator.rayore.co.nz` | ⛔ | No Cloudflare access in this session |
| Domain and HTTPS | ⛔ | Depends on the Pages project |
| Production deployment + live verification | ⛔ | Depends on the above |
| Search Console verification | 👤 | After deploy (steps below) |
| Analytics | ⬜ | Deliberately none. Optional: Cloudflare Web Analytics (cookieless) — update privacy policy first |
| AdSense submission readiness | 👤 | Site content is ready; needs contact email, live site, and your AdSense steps below |
| Consent (EEA/UK/CH) | 👤 | Required before ads go live: publish Google's CMP message in AdSense |
| Backup & recovery | ✅ | Git is the source of truth; see README |

## Cloudflare Pages setup (exact settings)

1. Cloudflare dashboard › Workers & Pages › Create › Pages › Connect to Git ›
   select `raycartore05/creatorkit`.
2. Project name `creatorkit`, production branch `main`, framework preset None,
   build command `npm run build`, output directory `dist`.
3. Environment variables (Production): `NODE_VERSION=22`,
   (`VITE_CONTACT_EMAIL` is optional; it overrides the built-in support address.)
4. Save and deploy. Then Custom domains › Set up › `creator.rayore.co.nz`.
   - If rayore.co.nz uses Cloudflare nameservers, Cloudflare adds the
     `creator` CNAME automatically.
   - If DNS is still at Porkbun, add `CNAME creator → creatorkit.pages.dev`
     there. Do not touch the existing root/apex records (the portfolio on
     GitHub Pages) or MX/email records.
5. Wait for the certificate to show Active.

## Post-deploy verification

```bash
E2E_BASE_URL=https://creator.rayore.co.nz npm run test:e2e
```

Also check rayore.co.nz and smartcalcworks.com still load normally.

## Search Console

1. search.google.com/search-console › Add property › URL prefix
   `https://creator.rayore.co.nz/` (or a Domain property for all of rayore.co.nz).
2. Choose HTML tag, copy only the `content` value into
   `VITE_GOOGLE_SITE_VERIFICATION` in Cloudflare, redeploy, click Verify.
3. Sitemaps › submit `sitemap.xml`.

## AdSense (do these in your own AdSense account)

SmartCalcWorks' approval does not cover this site, and its publisher ID has not
been copied here.

1. Wait until the site is live with a working contact email and has been
   indexed for a few weeks.
2. AdSense › Sites › Add site. I could not confirm from Google's help pages
   whether a subdomain is added on its own or under `rayore.co.nz`; follow
   what the Add site form accepts. Each new site goes through its own review.
3. Set `VITE_ADSENSE_CLIENT=ca-pub-…` (your ID) in Cloudflare and redeploy.
   This adds the `google-adsense-account` meta tag and `ads.txt` but loads no ads.
4. Request review. Do not ask anyone to click ads or send artificial traffic.
5. After approval: Privacy & messaging › European regulations › create and
   publish a consent message for EEA, UK and Switzerland.
6. Create one display ad unit, then set `VITE_ADSENSE_SLOT=<slot id>` and
   `VITE_ADS_ENABLED=true`. This automatically switches the CSP, privacy policy
   and About page to the advertising versions. Ads render only below each
   page's content and FAQ, never near upload, edit or download controls.

## Running costs

- Cloudflare Pages free plan: $0 (500 builds/month, 20,000 files per site).
- Domain renewal at Porkbun: existing cost, unchanged.
- No paid services or APIs.

## Known limitations

- One image at a time (no batch processing).
- Watermark tool is text-only (no logo images).
- QR generator supports URLs and plain text only (no Wi-Fi/vCard).
- HEIC/AVIF uploads are rejected with guidance rather than converted.
- Facebook, LinkedIn, TikTok and some Instagram/YouTube presets are labelled
  "common" because the official help pages could not be confirmed.
- Lighthouse scores not yet measured against the live site.

## 30-day organic traffic plan

Keyword volumes have **not** been measured; validate with Search Console data
before expanding.

- **Week 1:** deploy, verify Search Console, submit sitemap, add a link to
  CreatorKit from rayore.co.nz and your LinkedIn Featured section.
- **Week 2:** share genuinely useful how-tos (e.g. fitting a YouTube thumbnail
  under 2 MB) in relevant communities where self-promotion is allowed.
- **Week 3:** review Search Console queries and impressions; improve titles and
  intros of pages that get impressions but few clicks.
- **Week 4:** add at most one or two new pages only where queries show demand
  and CreatorKit can add distinct value (for example a dedicated YouTube
  thumbnail page with its own preset workflow). Re-check presets against
  official help pages.
