import { expect, test, type Page } from '@playwright/test';
import { upload, watch } from './helpers';

/**
 * Google Analytics checks. Google's hosts are blocked in test Chrome
 * (playwright.config.ts), and here gtag.js is replaced by a local stub that
 * only counts how often it loaded, so no test ever sends a hit to the real
 * CreatorKit property. Every gtag() command lands in window.dataLayer, which
 * the tests read.
 */
const GA_ID = 'G-WPEHRBK1Q4';
const GTAG_SRC = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;

async function stubGtag(page: Page) {
  const hits: string[] = [];
  await page.route('https://www.googletagmanager.com/gtag/js**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/javascript', body: 'window.__gtagLoads = (window.__gtagLoads || 0) + 1;' }),
  );
  // Collection endpoints must never be called (the stub doesn't send anything).
  await page.route(/google-analytics\.com|analytics\.google\.com/, (route) => {
    hits.push(route.request().url());
    return route.abort();
  });
  return hits;
}

/** dataLayer entries as plain arrays (each gtag() call pushes an Arguments object). */
async function gtagCalls(page: Page): Promise<unknown[][]> {
  return page.evaluate(() => (window.dataLayer ?? []).map((a) => JSON.parse(JSON.stringify(Array.from(a as ArrayLike<unknown>)))));
}

async function events(page: Page) {
  return (await gtagCalls(page)).filter((c) => c[0] === 'event').map((c) => ({ name: c[1], params: c[2] }));
}

test('GA tags are in <head> once, in order, before AdSense; none on the 404 page', async ({ page }) => {
  await stubGtag(page);
  await page.goto('/');
  const order = await page.evaluate(() =>
    Array.from(document.head.querySelectorAll('script[src]')).map((s) => s.getAttribute('src')),
  );
  const iInit = order.indexOf('/ga-init.js');
  const iGtag = order.indexOf(GTAG_SRC);
  const iAds = order.findIndex((s) => s?.includes('adsbygoogle.js'));
  expect(iInit).toBeGreaterThanOrEqual(0);
  expect(iGtag).toBeGreaterThan(iInit);
  expect(iAds).toBeGreaterThan(iGtag);
  expect(order.filter((s) => s === GTAG_SRC)).toHaveLength(1);
  expect(await page.locator(`head script[src="${GTAG_SRC}"]`).evaluate((e: HTMLScriptElement) => e.async)).toBe(true);

  await page.goto('/missing-page');
  expect(await page.locator('script[src*="googletagmanager"], script[src="/ga-init.js"]').count()).toBe(0);
});

test('consent defaults (EEA/UK/CH denied) come before config, which uses only CreatorKit’s ID', async ({ page }) => {
  await stubGtag(page);
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => window.__gtagLoads ?? 0)).toBe(1);
  const calls = await gtagCalls(page);
  expect(calls[0]![0]).toBe('consent');
  expect(calls[0]![1]).toBe('default');
  const consent = calls[0]![2] as Record<string, unknown>;
  for (const k of ['ad_storage', 'ad_user_data', 'ad_personalization', 'analytics_storage']) expect(consent[k]).toBe('denied');
  expect(consent.region).toEqual(expect.arrayContaining(['DE', 'FR', 'IE', 'NO', 'IS', 'LI', 'GB', 'CH']));
  expect(consent.region).not.toContain('NZ');
  expect(consent.region).not.toContain('US');
  expect(calls[1]![0]).toBe('js');
  const configs = calls.filter((c) => c[0] === 'config');
  expect(configs).toEqual([['config', GA_ID]]);
  // No page_view is ever sent by CreatorKit's code (gtag's config + enhanced measurement do that).
  expect(calls.some((c) => c[0] === 'event' && c[1] === 'page_view')).toBe(false);
});

test('client-side navigation never reloads gtag, repeats config or sends page_view itself', async ({ page }) => {
  const hits = await stubGtag(page);
  const w = watch(page);
  await page.goto('/');
  for (const label of ['Resize', 'Compress', 'QR Code', 'Captions', 'Watermark']) {
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: label, exact: true }).click();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  }
  await page.goBack();
  await expect(page).toHaveURL(/\/tools\/caption-formatter$/);
  await expect(page).toHaveTitle(/Caption/);
  expect(await page.evaluate(() => window.__gtagLoads)).toBe(1);
  expect(await page.locator('script[src*="googletagmanager.com/gtag/js"]').count()).toBe(1);
  expect(await page.locator('script[src="/ga-init.js"]').count()).toBe(1);
  const calls = await gtagCalls(page);
  expect(calls.filter((c) => c[0] === 'config')).toHaveLength(1);
  expect(calls.filter((c) => c[0] === 'event')).toEqual([]);
  // CreatorKit never records a consent choice itself: the only consent command is the default.
  expect(calls.filter((c) => c[0] === 'consent').map((c) => c[1])).toEqual(['default']);
  // A full reload starts a fresh page with exactly one gtag load again.
  await page.reload();
  await expect.poll(() => page.evaluate(() => window.__gtagLoads ?? 0)).toBe(1);
  expect((await gtagCalls(page)).filter((c) => c[0] === 'config')).toHaveLength(1);
  expect(hits).toEqual([]);
  expect(w.external).toEqual([]);
  expect(w.errors).toEqual([]);
});

test('campaign UTM parameters survive landing, hydration and the first second on the page', async ({ page }) => {
  await stubGtag(page);
  const landing = '/?utm_source=linkedin&utm_medium=social&utm_campaign=creatorkit_7day&utm_content=launch_post';
  const res = await page.goto(landing);
  expect(res?.status()).toBe(200);
  expect(res?.request().redirectedFrom()).toBeNull();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.waitForTimeout(1000);
  expect(new URL(page.url()).search).toBe('?utm_source=linkedin&utm_medium=social&utm_campaign=creatorkit_7day&utm_content=launch_post');
  // Config doesn't override page_location, so gtag reads the full landing URL.
  expect((await gtagCalls(page)).find((c) => c[0] === 'config')).toEqual(['config', GA_ID]);
});

/**
 * GA4 enhanced measurement sends one page_view per browser-history change and
 * reads the page title for it. Verified once against the real gtag.js (with
 * every hit blocked): titles were correct for link clicks, Back and "/#tools".
 * The same check showed that React Router's start-up replaceState (same URL,
 * new state object) produces no extra page_view. This test guards the
 * conditions those checks relied on: that start-up replaceState keeps the exact
 * landing URL (campaign parameters included), exactly one pushState per link
 * navigation, no other replaceState, and the title switched to the new page.
 */
test('each navigation makes exactly one history change and updates the title', async ({ page }) => {
  await stubGtag(page);
  await page.addInitScript(() => {
    const log: { type: string; path: string }[] = [];
    (window as unknown as { __hist: typeof log }).__hist = log;
    for (const type of ['pushState', 'replaceState'] as const) {
      const orig = history[type].bind(history);
      history[type] = (state: unknown, unused: string, url?: string | URL | null) => {
        orig(state, unused, url);
        log.push({ type, path: location.pathname + location.search + location.hash });
      };
    }
    addEventListener('popstate', () => log.push({ type: 'popstate', path: location.pathname }));
  });
  const hist = () => page.evaluate(() => (window as unknown as { __hist: { type: string; path: string }[] }).__hist);
  await page.goto('/?utm_source=linkedin&utm_medium=social&utm_campaign=creatorkit_7day&utm_content=launch_post');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.waitForTimeout(500);
  const landing = '/?utm_source=linkedin&utm_medium=social&utm_campaign=creatorkit_7day&utm_content=launch_post';
  expect(await hist()).toEqual([{ type: 'replaceState', path: landing }]);

  const nav = page.getByRole('navigation', { name: 'Main' });
  await nav.getByRole('link', { name: 'Resize', exact: true }).click();
  await expect(page).toHaveTitle(/^Social Media Image Resizer/);
  await nav.getByRole('link', { name: 'QR Code', exact: true }).click();
  await expect(page).toHaveTitle(/^Free QR Code Generator/);
  await page.goBack();
  await expect(page).toHaveTitle(/^Social Media Image Resizer/);
  await nav.getByRole('link', { name: 'All Tools', exact: true }).click();
  await expect(page).toHaveTitle(/^CreatorKit — /);
  await page.waitForTimeout(300);
  expect(await hist()).toEqual([
    { type: 'replaceState', path: landing },
    { type: 'pushState', path: '/tools/image-resizer' },
    { type: 'pushState', path: '/tools/qr-code-generator' },
    { type: 'popstate', path: '/tools/image-resizer' },
    { type: 'pushState', path: '/#tools' },
  ]);
});

test.describe('tool events fire only after success, with no personal data', () => {
  test('image resizer, compressor, cropper and watermark', async ({ page }) => {
    await stubGtag(page);
    await page.goto('/tools/image-resizer');
    await upload(page, 'landscape.jpg');
    await expect(page.getByTestId('preview-canvas')).toBeVisible();
    expect(await events(page)).toEqual([]);
    let dl = page.waitForEvent('download');
    await page.getByRole('button', { name: /Download 1080 × 1080/ }).click();
    await dl;
    await expect(page.getByText(/Downloaded a 1080 × 1080 JPG/)).toBeVisible();
    expect(await events(page)).toEqual([
      { name: 'image_resizer_used', params: { tool_name: 'image_resizer', action_type: 'download', output_format: 'jpg' } },
    ]);

    await page.goto('/tools/image-compressor');
    await upload(page, 'landscape.jpg');
    expect(await events(page)).toEqual([]);
    await page.getByRole('button', { name: 'Compress' }).click();
    await expect(page.getByTestId('saving')).toContainText(/% smaller/);
    dl = page.waitForEvent('download');
    await page.getByRole('button', { name: /Download/ }).click();
    await dl;
    expect(await events(page)).toEqual([
      { name: 'image_compressor_used', params: { tool_name: 'image_compressor', action_type: 'compress', output_format: 'jpg' } },
      { name: 'image_compressor_used', params: { tool_name: 'image_compressor', action_type: 'download', output_format: 'jpg' } },
    ]);

    await page.goto('/tools/profile-cropper');
    await upload(page, 'landscape.jpg');
    await page.getByLabel(/Download as a circle/).check();
    expect(await events(page)).toEqual([]);
    dl = page.waitForEvent('download');
    await page.getByRole('button', { name: /^Download$/ }).click();
    await dl;
    await expect(page.getByText(/Downloaded 800 × 800 PNG/)).toBeVisible();
    expect(await events(page)).toEqual([
      { name: 'profile_cropper_used', params: { tool_name: 'profile_cropper', action_type: 'download', output_format: 'png' } },
    ]);

    await page.goto('/tools/watermark');
    await upload(page, 'small.jpg');
    await page.getByLabel('Watermark text').fill('PRIVATE-MARK-TEXT');
    await page.getByLabel('File format').selectOption('image/png');
    expect(await events(page)).toEqual([]);
    dl = page.waitForEvent('download');
    await page.getByRole('button', { name: /^Download$/ }).click();
    await dl;
    await expect(page.getByText(/Downloaded 300 × 400 PNG/)).toBeVisible();
    expect(await events(page)).toEqual([
      { name: 'watermark_tool_used', params: { tool_name: 'watermark', action_type: 'download', output_format: 'png' } },
    ]);
    const all = JSON.stringify(await gtagCalls(page));
    expect(all).not.toMatch(/landscape|small\.jpg|PRIVATE-MARK-TEXT|blob:|data:image/);
  });

  test('QR generator: typing and invalid input send nothing; PNG and SVG downloads do', async ({ page }) => {
    await stubGtag(page);
    await page.goto('/tools/qr-code-generator');
    await page.getByLabel('URL').fill('example');
    await expect(page.getByRole('button', { name: /PNG/ })).toBeDisabled();
    await page.getByLabel('URL').fill('https://secret.example.org/private-path');
    await expect(page.getByTestId('qr-image')).toBeVisible();
    expect(await events(page)).toEqual([]);
    let dl = page.waitForEvent('download');
    await page.getByRole('button', { name: /PNG/ }).click();
    await dl;
    dl = page.waitForEvent('download');
    await page.getByRole('button', { name: /SVG/ }).click();
    await dl;
    expect(await events(page)).toEqual([
      { name: 'qr_code_generator_used', params: { tool_name: 'qr_code_generator', action_type: 'download', output_format: 'png' } },
      { name: 'qr_code_generator_used', params: { tool_name: 'qr_code_generator', action_type: 'download', output_format: 'svg' } },
    ]);
    expect(JSON.stringify(await gtagCalls(page))).not.toContain('secret.example.org');
  });

  test('caption formatter and sharing preview: real changes and successful copies only', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await stubGtag(page);
    await page.goto('/tools/caption-formatter');
    const area = page.getByLabel('Your caption or post');
    await area.fill('My   private caption #nz');
    expect(await events(page)).toEqual([]);
    await page.getByRole('button', { name: 'Clean up spacing' }).click();
    await expect(area).toHaveValue('My private caption #nz');
    // Pressing it again changes nothing, so nothing is recorded.
    await page.getByRole('button', { name: 'Clean up spacing' }).click();
    await expect(page.getByText('Nothing to change.')).toBeVisible();
    await page.getByRole('button', { name: 'Copy caption' }).click();
    await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
    expect(await events(page)).toEqual([
      { name: 'caption_formatter_used', params: { tool_name: 'caption_formatter', action_type: 'clean_whitespace' } },
      { name: 'caption_formatter_used', params: { tool_name: 'caption_formatter', action_type: 'copy_caption' } },
    ]);
    expect(JSON.stringify(await gtagCalls(page))).not.toContain('private caption');

    await page.goto('/tools/og-preview');
    await page.getByLabel('Title (og:title)').fill('My unpublished launch title');
    await expect(page.getByTestId('card-large')).toContainText('My unpublished launch title');
    expect(await events(page)).toEqual([]);
    await page.getByRole('button', { name: 'Copy tags' }).click();
    await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
    expect(await events(page)).toEqual([{ name: 'og_preview_used', params: { tool_name: 'og_preview', action_type: 'copy_tags' } }]);
    expect(JSON.stringify(await gtagCalls(page))).not.toContain('unpublished');
  });
});

test('tools still work when Google Analytics is blocked (ad/tracker blocker)', async ({ page }) => {
  // No stub: gtag.js fails to load, as with a blocker. window.gtag still exists
  // from ga-init.js and only queues into dataLayer; nothing breaks.
  const w = watch(page);
  await page.goto('/tools/qr-code-generator');
  await page.getByLabel('URL').fill('https://example.com');
  await expect(page.getByTestId('qr-image')).toBeVisible();
  const dl = page.waitForEvent('download');
  await page.getByRole('button', { name: /PNG/ }).click();
  expect((await dl).suggestedFilename()).toBe('qr-code-512px.png');
  expect(w.external).toEqual([]);
  expect(w.errors).toEqual([]);
});

declare global {
  interface Window {
    __gtagLoads?: number;
    dataLayer?: unknown[];
  }
}
