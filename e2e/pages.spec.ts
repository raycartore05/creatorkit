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
  expect(csp).toContain("script-src 'self'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(home.headers()['x-content-type-options']).toBe('nosniff');
  expect((await request.get('/ads.txt')).status()).toBe(404);
});

test('no ad code is present when ads are disabled', async ({ page }) => {
  const w = watch(page);
  await page.goto('/tools/image-resizer');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('ins.adsbygoogle')).toHaveCount(0);
  expect(await page.content()).not.toContain('googlesyndication');
  expect(w.external).toEqual([]);
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
  await expect(page.locator('#mobile-nav li')).toHaveCount(8);
});
