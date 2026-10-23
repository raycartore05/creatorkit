import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { expectNoHorizontalScroll, watch } from './helpers';

const PAGES = [
  '/',
  '/tools/image-resizer',
  '/tools/image-compressor',
  '/tools/profile-cropper',
  '/tools/qr-code-generator',
  '/tools/og-preview',
  '/tools/caption-formatter',
  '/tools/watermark',
  '/guides/social-media-image-sizes',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
];
const ORIGIN = 'https://creator.rayore.co.nz';

for (const path of PAGES) {
  test(`${path} loads cleanly, is accessible and has correct SEO tags @mobile`, async ({ page }) => {
    const w = watch(page);
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toHaveCount(1);
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toBe(path === '/' ? `${ORIGIN}/` : `${ORIGIN}${path}`);
    expect(await page.locator('meta[name="description"]').getAttribute('content')).toBeTruthy();
    expect(await page.locator('meta[property="og:image"]').getAttribute('content')).toBe(`${ORIGIN}/og-image.png`);
    expect(await page.title()).toMatch(/CreatorKit/);
    const axe = await new AxeBuilder({ page: page as never }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations.map((v) => `${v.id}: ${v.nodes.length} (${v.nodes[0]?.target.join(' ')})`)).toEqual([]);
    await expectNoHorizontalScroll(page);
    expect(w.errors).toEqual([]);
    expect(w.external).toEqual([]);
  });
}

test('support email links are correct on the contact page and footer @mobile', async ({ page }) => {
  await page.goto('/contact');
  const main = page.getByTestId('support-email');
  await expect(main).toHaveAttribute('href', 'mailto:creatorkit-support@rayore.co.nz');
  await expect(main).toBeVisible();
  await page.goto('/tools/qr-code-generator');
  const footer = page.getByTestId('footer-email');
  await footer.scrollIntoViewIfNeeded();
  await expect(footer).toBeVisible();
  await expect(footer).toHaveAttribute('href', 'mailto:creatorkit-support@rayore.co.nz');
  await expectNoHorizontalScroll(page);
});

test('unknown URL returns 404 with a helpful page and noindex', async ({ page }) => {
  const res = await page.goto('/no-such-page');
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('off the canvas');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});

test('prerendered HTML contains real content without JavaScript', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/tools/image-compressor');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Image Compressor');
  await expect(page.getByText('Quality versus file size')).toBeVisible();
  await ctx.close();
});

test('sitemap, robots and security headers', async ({ request }) => {
  const robots = await request.get('/robots.txt');
  expect(await robots.text()).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`);
  const sitemap = await (await request.get('/sitemap.xml')).text();
  for (const p of PAGES) expect(sitemap).toContain(`<loc>${p === '/' ? `${ORIGIN}/` : ORIGIN + p}</loc>`);
  expect(sitemap).not.toContain('404');
  const home = await request.get('/');
  const csp = home.headers()['content-security-policy'] ?? '';
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("base-uri 'self'");
  expect(home.headers()['x-content-type-options']).toBe('nosniff');
  const ads = await request.get('/ads.txt');
  expect(ads.status()).toBe(200);
  expect(ads.headers()['content-type']).toMatch(/^text\/plain/);
  expect(await ads.text()).toBe('google.com, pub-8644589635574920, DIRECT, f08c47fec0942fa0\n');
});

const ADSENSE = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8644589635574920';

test('AdSense script is in <head> exactly once, never re-added on navigation, and no ad units render', async ({ page }) => {
  const w = watch(page);
  await page.goto('/tools/image-resizer');
  const count = () => page.evaluate(() => document.querySelectorAll('script[src*="adsbygoogle.js"]').length);
  expect(await count()).toBe(1);
  const s = page.locator('head script[src*="adsbygoogle.js"]');
  await expect(s).toHaveAttribute('src', ADSENSE);
  await expect(s).toHaveAttribute('crossorigin', 'anonymous');
  expect(await s.evaluate((e: HTMLScriptElement) => e.async)).toBe(true);
  await expect(page.locator('head meta[name="google-adsense-account"]')).toHaveAttribute('content', 'ca-pub-8644589635574920');
  // Client-side navigation through several pages must not inject more copies.
  for (const label of ['Compress', 'QR Code', 'Captions']) {
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: label, exact: true }).click();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await count()).toBe(1);
  }
  await page.goto('/about');
  expect(await count()).toBe(1);
  // No ad unit is configured yet, so nothing is placed on the page.
  await expect(page.locator('ins.adsbygoogle')).toHaveCount(0);
  await expect(page.getByLabel('Advertisement')).toHaveCount(0);
  // Only Google's ad hosts were contacted (and those are blocked in tests).
  expect(w.external).toEqual([]);
  expect(w.ads.length).toBeGreaterThan(0);
  expect(w.errors).toEqual([]);
});

test('404 page carries no AdSense code', async ({ page }) => {
  await page.goto('/missing-page');
  expect(await page.evaluate(() => document.querySelectorAll('script[src*="adsbygoogle.js"]').length)).toBe(0);
});

test('tools keep working when the ad script is blocked (ad blocker scenario) @mobile', async ({ page }) => {
  const w = watch(page);
  await page.goto('/tools/caption-formatter');
  await page.getByLabel('Your caption or post').fill('Hello world');
  await expect(page.getByTestId('stat-words')).toHaveText('2');
  expect(w.errors).toEqual([]);
});

test('homepage tool search filters and navigation works @mobile', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Find a tool').fill('watermark');
  await expect(page.locator('#tools li')).toHaveCount(1);
  await page.getByLabel('Find a tool').fill('nothing-matches');
  await expect(page.getByText(/No tool matches/)).toBeVisible();
  await page.getByRole('button', { name: 'Show all tools' }).click();
  await expect(page.locator('#tools li')).toHaveCount(7);
  await page.locator('#tools').getByRole('link', { name: /QR Code Generator/ }).click();
  await expect(page).toHaveURL(/\/tools\/qr-code-generator$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('QR Code Generator');
  await expect(page).toHaveTitle(/QR Code Generator/);
});

test('mobile menu opens and lists all tools @mobile', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile only');
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu' }).click();
  // 7 tools + All Tools + Image sizes guide (was 7 tools + guide before All Tools was added to the menu).
  await expect(page.locator('#mobile-nav li')).toHaveCount(9);
});
