import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalScroll, watch } from './helpers';

const NAV = [
  ['Resize', '/tools/image-resizer', 'Social Media Image Resizer'],
  ['Compress', '/tools/image-compressor', 'Image Compressor'],
  ['Crop', '/tools/profile-cropper', 'Profile Picture & Cover Cropper'],
  ['QR Code', '/tools/qr-code-generator', 'QR Code Generator'],
  ['Social Preview', '/tools/og-preview', 'Social Sharing Preview'],
  ['Captions', '/tools/caption-formatter', 'Caption & Text Formatter'],
  ['Watermark', '/tools/watermark', 'Image Watermark Tool'],
] as const;
const PAYPAL = 'https://paypal.me/RaycartOre';
const WIDTHS = [375, 768, 1024, 1440];

const mainNav = (page: Page) => page.getByRole('navigation', { name: 'Main' });

for (const width of WIDTHS) {
  test(`header works at ${width}px with no overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/', '/tools/image-resizer', '/about']) {
      await page.goto(path);
      await expectNoHorizontalScroll(page);
    }
    if (width >= 1024) {
      await expect(mainNav(page)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Menu' })).toBeHidden();
      const boxes = await mainNav(page).getByRole('link').evaluateAll((els) =>
        els.map((e) => {
          const r = e.getBoundingClientRect();
          return { top: Math.round(r.top), right: r.right, h: r.height };
        }),
      );
      expect(boxes).toHaveLength(8);
      // One row, nothing clipped off the right edge, no wrapped labels.
      expect(new Set(boxes.map((b) => b.top)).size).toBeLessThanOrEqual(2);
      for (const b of boxes) {
        expect(b.right).toBeLessThanOrEqual(width);
        expect(b.h).toBeLessThan(48);
      }
    } else {
      await expect(mainNav(page)).toBeHidden();
      const btn = page.getByRole('button', { name: 'Menu' });
      await btn.click();
      const menu = page.getByRole('navigation', { name: 'Mobile' });
      for (const [, path] of NAV) await expect(menu.locator(`a[href="${path}"]`)).toBeVisible();
      await expect(menu.locator('a[href="/#tools"]')).toBeVisible();
      const heights = await menu.getByRole('link').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
      for (const h of heights) expect(h).toBeGreaterThanOrEqual(44);
      await expectNoHorizontalScroll(page);
    }
  });
}

test('each desktop nav link routes client-side, marks itself active, and back/forward work', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const w = watch(page);
  await page.goto('/');
  await page.evaluate(() => ((window as unknown as { __spa: number }).__spa = 1));
  for (const [label, path, h1] of NAV) {
    await mainNav(page).getByRole('link', { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(h1);
    await expect(mainNav(page).getByRole('link', { name: label, exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(mainNav(page).locator('[aria-current="page"]')).toHaveCount(1);
  }
  // Same JS context throughout = no full page reloads.
  expect(await page.evaluate(() => (window as unknown as { __spa?: number }).__spa)).toBe(1);
  await page.goBack();
  await expect(page).toHaveURL(/\/tools\/caption-formatter$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Caption & Text Formatter');
  await page.goForward();
  await expect(page).toHaveURL(/\/tools\/watermark$/);
  await mainNav(page).getByRole('link', { name: 'All Tools' }).click();
  await expect(page).toHaveURL(/\/#tools$/);
  await expect(page.locator('#tools li')).toHaveCount(7);
  await page.getByRole('link', { name: 'CreatorKit home' }).first().click();
  await expect(page).toHaveURL(/\/$/);
  expect(w.errors).toEqual([]);
});

for (const [, path, h1] of NAV) {
  test(`${path} loads directly and survives a refresh`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(h1);
  });
}

test('keyboard users can reach and use the desktop nav', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const focused: string[] = [];
  for (let i = 0; i < 12; i += 1) {
    await page.keyboard.press('Tab');
    focused.push(await page.evaluate(() => document.activeElement?.textContent?.trim() ?? ''));
  }
  // Skip link, logo, then the tools in order.
  const start = focused.indexOf('Resize');
  expect(start).toBeGreaterThan(0);
  expect(focused.slice(start, start + 8)).toEqual(['Resize', 'Compress', 'Crop', 'QR Code', 'Social Preview', 'Captions', 'Watermark', 'All Tools']);
  // Focus ring visible
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement as Element).outlineStyle);
  expect(outline).not.toBe('none');
  // Move back from wherever focus ended up to "Watermark", then activate it with Enter.
  const back = focused.length - 1 - (start + 6);
  for (let i = 0; i < back; i += 1) await page.keyboard.press('Shift+Tab');
  expect(await page.evaluate(() => document.activeElement?.textContent?.trim())).toBe('Watermark');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/tools\/watermark$/);
});

test('mobile menu works with keyboard: open, move, Escape, choose @mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/tools/image-resizer');
  const btn = page.getByRole('button', { name: 'Menu' });
  await btn.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('navigation', { name: 'Mobile' })).toHaveCount(0);
  await expect(btn).toBeFocused();
  await expect(btn).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('Enter');
  const menu = page.getByRole('navigation', { name: 'Mobile' });
  await expect(menu.locator('a[aria-current="page"]')).toHaveAttribute('href', '/tools/image-resizer');
  await menu.locator('a[href="/tools/og-preview"]').focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/tools\/og-preview$/);
  await expect(page.getByRole('navigation', { name: 'Mobile' })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Social Sharing Preview');
});

test('footer keeps informational pages and has a safe, voluntary support link @mobile', async ({ page }) => {
  const w = watch(page);
  await page.goto('/tools/caption-formatter');
  const footer = page.locator('footer');
  for (const href of ['/guides/social-media-image-sizes', '/about', '/contact', '/privacy', '/terms']) {
    await expect(footer.locator(`a[href="${href}"]`)).toHaveCount(1);
  }
  const support = page.getByTestId('footer-support');
  await expect(support).toHaveAttribute('href', PAYPAL);
  await expect(support).toHaveAttribute('target', '_blank');
  await expect(support).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(support).toContainText('Support CreatorKit');
  await expect(page.locator(`a[href="${PAYPAL}"]`)).toHaveCount(1);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(footer.locator('a[href="mailto:creatorkit-support@rayore.co.nz"]')).toHaveCount(1);
  await page.waitForLoadState('networkidle');
  expect(w.external.filter((u) => /paypal/i.test(u))).toEqual([]);
  expect(await page.content()).not.toMatch(/paypal\.com\/sdk|paypalobjects/i);
});

test('About page support section is secondary, optional and links to PayPal', async ({ page }) => {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/about');
    const section = page.getByTestId('about-support');
    await expect(section).toBeVisible();
    await expect(section).toContainText('entirely voluntary');
    const btn = section.getByRole('link', { name: /Support CreatorKit on PayPal/ });
    await expect(btn).toHaveAttribute('href', PAYPAL);
    await expect(btn).toHaveAttribute('target', '_blank');
    await expect(btn).toHaveAttribute('rel', 'noopener noreferrer');
    // Comes after the main About content, not at the top.
    const order = await page.evaluate(() => {
      const h1 = document.querySelector('h1')!.getBoundingClientRect().top;
      const s = document.querySelector('[data-testid=about-support]')!.getBoundingClientRect().top;
      return s > h1 + 300;
    });
    expect(order).toBe(true);
    await expectNoHorizontalScroll(page);
  }
});
