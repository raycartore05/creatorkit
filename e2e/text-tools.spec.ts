import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import jsQR from 'jsqr';
import { watch } from './helpers';

test.describe('QR code generator', () => {
  test('generates a scannable PNG that decodes to the entered URL @mobile', async ({ page }) => {
    const w = watch(page);
    await page.goto('/tools/qr-code-generator');
    const url = 'https://creator.rayore.co.nz/tools/qr-code-generator?test=1';
    await page.getByLabel('URL').fill(url);
    await expect(page.getByTestId('qr-image')).toBeVisible();
    const dl = page.waitForEvent('download');
    await page.getByRole('button', { name: /PNG/ }).click();
    const d = await dl;
    expect(d.suggestedFilename()).toBe('qr-code-512px.png');
    const b64 = (await readFile(await d.path())).toString('base64');
    const pixels = await page.evaluate(async (b64) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      return { w: c.width, h: c.height, data: Array.from(ctx.getImageData(0, 0, c.width, c.height).data) };
    }, b64);
    expect(pixels.w).toBe(512);
    const decoded = jsQR(Uint8ClampedArray.from(pixels.data), pixels.w, pixels.h);
    expect(decoded?.data).toBe(url);
    expect(w.external).toEqual([]);
    expect(w.errors).toEqual([]);
  });

  test('custom colours, SVG download and text mode', async ({ page }) => {
    await page.goto('/tools/qr-code-generator');
    await page.getByText('Plain text', { exact: true }).first().click();
    await page.getByLabel('Text', { exact: true }).fill('Hello from CreatorKit');
    await page.getByLabel('Foreground (modules)', { exact: true }).fill('#1E3A8A');
    await expect(page.getByTestId('qr-image')).toBeVisible();
    const dl = page.waitForEvent('download');
    await page.getByRole('button', { name: /SVG/ }).click();
    const svg = await readFile(await (await dl).path(), 'utf8');
    expect(svg).toContain('<svg');
    expect(svg.toLowerCase()).toContain('#1e3a8a');
    expect(svg).not.toMatch(/<script/i);
  });

  test('validation: invalid URL, low contrast and too much data', async ({ page }) => {
    await page.goto('/tools/qr-code-generator');
    await page.getByLabel('URL').fill('example');
    await expect(page.getByText(/full URL/)).toBeVisible();
    await expect(page.getByRole('button', { name: /PNG/ })).toBeDisabled();
    await page.getByLabel('URL').fill('https://example.com');
    await page.getByLabel('Foreground (modules)', { exact: true }).fill('#EEEEEE');
    await expect(page.getByText(/too similar/).first()).toBeVisible();
    await page.getByLabel('Foreground (modules)', { exact: true }).fill('#000000');
    await page.getByText('Plain text', { exact: true }).first().click();
    await page.getByLabel('Error correction').selectOption('H');
    await page.getByLabel('Text', { exact: true }).fill('x'.repeat(3000));
    await expect(page.getByText(/too much content/)).toBeVisible();
    await expect(page.getByText(/Always scan the downloaded file/)).toBeVisible();
  });
});

test.describe('caption formatter', () => {
  test('counts, cleans, copies @mobile', async ({ page, context, browserName, isMobile }) => {
    test.skip(browserName !== 'chromium');
    if (!isMobile) await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const w = watch(page);
    await page.goto('/tools/caption-formatter');
    const area = page.getByLabel('Your caption or post');
    await area.fill('Sunny day   in Hamilton 🌞 #nz #NZ\n\n\n\nSee you there @friend');
    await expect(page.getByTestId('stat-words')).toHaveText('10');
    await expect(page.getByTestId('stat-hashtags')).toHaveText('2');
    await expect(page.getByTestId('stat-paragraphs')).toHaveText('2');
    await page.getByRole('button', { name: 'Clean up spacing' }).click();
    await expect(area).toHaveValue('Sunny day in Hamilton 🌞 #nz #NZ\n\nSee you there @friend');
    if (!isMobile) {
      await page.getByRole('button', { name: 'Copy caption' }).click();
      await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
      expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('Sunny day in Hamilton');
    }
    await page.getByRole('button', { name: /Clear/ }).click();
    await expect(area).toHaveValue('');
    expect(w.external).toEqual([]);
  });
});

test.describe('sharing preview', () => {
  test('updates cards, produces tags and never contacts the page URL', async ({ page }) => {
    const w = watch(page);
    await page.goto('/tools/og-preview');
    await page.getByLabel('Title (og:title)').fill('Resize images for every platform');
    await page.getByLabel('Description (og:description)').fill('Free tools that run in your browser.');
    await page.getByLabel('Page URL (og:url)').fill('https://www.example.org/post');
    await expect(page.getByTestId('card-large')).toContainText('Resize images for every platform');
    await expect(page.getByTestId('card-large')).toContainText('example.org');
    await expect(page.getByTestId('og-tags')).toContainText('<meta property="og:url" content="https://www.example.org/post" />');
    await page.waitForTimeout(300);
    expect(w.external).toEqual([]);
  });

  test('local image preview shows dimensions without network', async ({ page }) => {
    const w = watch(page);
    await page.goto('/tools/og-preview');
    await page.locator('input[type=file]').setInputFiles(new URL('./fixtures/landscape.jpg', import.meta.url).pathname);
    await expect(page.getByText(/Image is 2000 × 1000px/)).toBeVisible();
    expect(w.external).toEqual([]);
  });

  test('remote image is only requested after pressing Show image', async ({ page }) => {
    const requests: string[] = [];
    await page.route('https://images.example.test/**', async (route) => {
      requests.push(route.request().url());
      const png = await readFile(new URL('./fixtures/transparent.png', import.meta.url));
      await route.fulfill({ status: 200, contentType: 'image/png', body: png });
    });
    await page.goto('/tools/og-preview');
    await page.getByLabel('Image URL (og:image)').fill('https://images.example.test/share.png');
    await page.waitForTimeout(300);
    expect(requests).toEqual([]);
    await page.getByRole('button', { name: 'Show image' }).click();
    await expect(page.getByText(/Image is 400 × 400px/)).toBeVisible();
    expect(requests.length).toBeGreaterThan(0);
  });
});
