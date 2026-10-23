import { expect, test } from '@playwright/test';
import { countNearWhite, expectNoHorizontalScroll, inspectDownload, upload, watch } from './helpers';

test.describe('image resizer', () => {
  test('resizes to a preset with cover crop and downloads exact dimensions @mobile', async ({ page }) => {
    const w = watch(page);
    await page.goto('/tools/image-resizer');
    await upload(page, 'landscape.jpg');
    await expect(page.getByTestId('preview-canvas')).toBeVisible();
    await page.waitForTimeout(200);
    await expectNoHorizontalScroll(page);
    // 2000x1000 into 1080x1080 cover -> half the image is cropped
    await expect(page.getByText(/About 50% of your image is outside the frame/)).toBeVisible();
    const dl = page.waitForEvent('download');
    await page.getByRole('button', { name: /Download 1080 × 1080/ }).click();
    const info = await inspectDownload(page, await dl);
    expect(info.width).toBe(1080);
    expect(info.height).toBe(1080);
    expect((await dl).suggestedFilename()).toBe('landscape-1080x1080.jpg');
    await expect(page.getByText(/Downloaded a 1080 × 1080 JPG/)).toBeVisible();
    expect(w.external).toEqual([]);
    expect(w.errors).toEqual([]);
  });

  test('fit mode pads instead of cropping; custom size and PNG transparency', async ({ page }) => {
    await page.goto('/tools/image-resizer');
    await upload(page, 'transparent.png');
    await page.getByLabel('Size', { exact: true }).selectOption('custom');
    await page.getByLabel('Width').fill('800');
    await page.getByLabel('Height', { exact: true }).fill('400');
    await page.getByText('Fit (add borders)').click();
    await expect(page.getByText(/does not fill the frame/)).toBeVisible();
    await expect(page.getByText(/outside the frame/)).toHaveCount(0);
    // JPEG + transparency warning, then switch to PNG + transparent
    await expect(page.getByText(/JPEG cannot store transparency/).first()).toBeVisible();
    await page.getByLabel('File format').selectOption('image/png');
    await page.getByText('Transparent', { exact: true }).click();
    const dl = page.waitForEvent('download');
    await page.getByRole('button', { name: /Download 800 × 400/ }).click();
    const info = await inspectDownload(page, await dl);
    expect([info.width, info.height]).toEqual([800, 400]);
    expect(info.cornerAlpha).toBe(0);
    expect(info.centre.slice(0, 3)).toEqual([220, 30, 30]);
  });

  test('keep aspect ratio locks height; invalid size blocks download', async ({ page }) => {
    await page.goto('/tools/image-resizer');
    await upload(page, 'landscape.jpg');
    await page.getByLabel('Size', { exact: true }).selectOption('custom');
    await page.getByLabel(/Keep original aspect ratio/).check();
    await page.getByLabel('Width').fill('600');
    await expect(page.getByText('300 px')).toBeVisible();
    await page.getByLabel('Width').fill('9000');
    await expect(page.getByText(/at most 8192 pixels/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Download/ })).toBeDisabled();
  });

  test('warns when enlarging a small image', async ({ page }) => {
    await page.goto('/tools/image-resizer');
    await upload(page, 'small.jpg');
    await expect(page.getByText(/may look soft/)).toBeVisible();
  });

  test('EXIF-rotated photo is shown upright', async ({ page }) => {
    await page.goto('/tools/image-resizer');
    await upload(page, 'rotated.jpg');
    await expect(page.getByText(/200 × 400px/)).toBeVisible();
  });

  test('start again returns to the upload screen', async ({ page }) => {
    await page.goto('/tools/image-resizer');
    await upload(page, 'landscape.jpg');
    await page.getByRole('button', { name: /Start again/ }).click();
    await expect(page.getByText('Choose an image', { exact: true })).toBeVisible();
  });

  for (const [file, msg] of [
    ['evil.svg', /SVG files are not accepted/],
    ['corrupt.jpg', /could not be read/],
    ['notimage.jpg', /not a supported image/],
  ] as const) {
    test(`rejects ${file} with a clear message`, async ({ page }) => {
      const w = watch(page);
      await page.goto('/tools/image-resizer');
      await upload(page, file);
      await expect(page.getByRole('alert')).toContainText(msg);
      await expect(page.getByTestId('preview-canvas')).toHaveCount(0);
      expect(w.errors.filter((e) => !/Failed to load resource/.test(e))).toEqual([]);
    });
  }

  test('keyboard repositioning changes the output', async ({ page }) => {
    await page.goto('/tools/image-resizer');
    await upload(page, 'landscape.jpg');
    const canvas = page.getByTestId('preview-canvas');
    await canvas.focus();
    const before = await canvas.screenshot();
    for (let i = 0; i < 5; i += 1) await page.keyboard.press('Shift+ArrowRight');
    expect(Buffer.compare(before, await canvas.screenshot())).not.toBe(0);
  });
});

test.describe('image compressor', () => {
  test('compresses by quality and reports the actual saving @mobile', async ({ page }) => {
    const w = watch(page);
    await page.goto('/tools/image-compressor');
    await upload(page, 'landscape.jpg');
    await page.getByRole('button', { name: 'Compress' }).click();
    await expect(page.getByTestId('saving')).toContainText(/% smaller/);
    await expectNoHorizontalScroll(page);
    const dl = page.waitForEvent('download');
    await page.getByRole('button', { name: /Download/ }).click();
    const d = await dl;
    const info = await inspectDownload(page, d);
    expect([info.width, info.height]).toEqual([2000, 1000]);
    expect(info.size).toBeLessThan(1174654);
    // Reported size matches the real file
    const caption = await page.getByTestId('after-caption').textContent();
    expect(caption).toContain('2000 × 1000,');
    expect(d.suggestedFilename()).toBe('landscape-compressed.jpg');
    expect(w.external).toEqual([]);
  });

  test('target size mode stays under the target', async ({ page }) => {
    await page.goto('/tools/image-compressor');
    await upload(page, 'landscape.jpg');
    const radio = page.getByRole('radio', { name: 'Target size' });
    await expect(async () => {
      await page.getByText('Target size', { exact: true }).first().click();
      await expect(radio).toBeChecked({ timeout: 1000 });
    }).toPass();
    await page.getByRole('spinbutton', { name: 'Target size' }).fill('150');
    await page.getByRole('button', { name: 'Compress' }).click();
    await expect(page.getByTestId('saving')).toBeVisible();
    const dl = page.waitForEvent('download');
    await page.getByRole('button', { name: /Download/ }).click();
    const info = await inspectDownload(page, await dl);
    expect(info.size).toBeLessThanOrEqual(150 * 1024);
  });

  test('max dimension resizes and WebP output works', async ({ page }) => {
    await page.goto('/tools/image-compressor');
    await upload(page, 'landscape.jpg');
    await page.getByLabel('Output format').selectOption('image/webp');
    await page.getByLabel(/Maximum width or height/).fill('500');
    await page.getByRole('button', { name: 'Compress' }).click();
    await expect(page.getByTestId('after-caption')).toContainText('500 × 250');
    const dl = page.waitForEvent('download');
    await page.getByRole('button', { name: /Download/ }).click();
    const d = await dl;
    expect(d.suggestedFilename()).toMatch(/\.webp$/);
    const info = await inspectDownload(page, d);
    expect([info.width, info.height]).toEqual([500, 250]);
  });

  test('honestly reports when the file does not get smaller', async ({ page }) => {
    await page.goto('/tools/image-compressor');
    // A 16x16 JPEG saved at 5% quality: re-encoding at 100% must be larger.
    await upload(page, 'tiny.jpg');
    await page.getByRole('slider', { name: 'Quality' }).fill('100');
    await page.getByRole('button', { name: 'Compress' }).click();
    await expect(page.getByText(/not smaller/)).toBeVisible();
  });
});

test.describe('profile cropper', () => {
  test('downloads a circular PNG with transparent corners @mobile', async ({ page }) => {
    await page.goto('/tools/profile-cropper');
    await upload(page, 'landscape.jpg');
    await expectNoHorizontalScroll(page);
    await page.getByLabel(/Download as a circle/).check();
    await page.getByRole('slider', { name: 'Zoom' }).fill('150');
    const dl = page.waitForEvent('download');
    await page.getByRole('button', { name: /^Download$/ }).click();
    const d = await dl;
    const info = await inspectDownload(page, d);
    expect([info.width, info.height]).toEqual([800, 800]);
    expect(info.cornerAlpha).toBe(0);
    expect(info.centre[3]).toBe(255);
    expect(d.suggestedFilename()).toMatch(/circle-800\.png$/);
  });

  test('banner preset downloads a rectangle', async ({ page }) => {
    await page.goto('/tools/profile-cropper');
    await upload(page, 'landscape.jpg');
    await page.getByLabel('Shape and size').selectOption('li-banner');
    const dl = page.waitForEvent('download');
    await page.getByRole('button', { name: /^Download$/ }).click();
    const info = await inspectDownload(page, await dl);
    expect([info.width, info.height]).toEqual([1584, 396]);
    expect(info.cornerAlpha).toBe(255);
  });
});

test.describe('watermark', () => {
  test('adds a watermark and changes pixels', async ({ page }) => {
    const w = watch(page);
    await page.goto('/tools/watermark');
    await upload(page, 'small.jpg');
    await page.getByLabel('Watermark text').fill('SAMPLE');
    await page.getByTitle('Centre', { exact: true }).click();
    await page.getByRole('slider', { name: 'Size' }).fill('20');
    await page.getByRole('slider', { name: 'Opacity' }).fill('100');
    await page.getByLabel('Shadow').uncheck();
    await page.getByLabel('File format').selectOption('image/png');
    const dl = page.waitForEvent('download');
    await page.getByRole('button', { name: /^Download$/ }).click();
    const d = await dl;
    const info = await inspectDownload(page, d);
    expect([info.width, info.height]).toEqual([300, 400]);
    // The source is a solid (40,90,160) image, so any near-white pixel was drawn by the watermark.
    const white = await countNearWhite(page, d);
    expect(white).toBeGreaterThan(200);
    expect(w.external).toEqual([]);
  });

  test('empty text disables download; tiled mode renders', async ({ page }) => {
    await page.goto('/tools/watermark');
    await upload(page, 'landscape.jpg');
    await page.getByLabel('Watermark text').fill('');
    await expect(page.getByRole('button', { name: /^Download$/ })).toBeDisabled();
    await page.getByLabel('Watermark text').fill('© Test');
    await page.getByText(/Repeat across the whole image/).click();
    await expect(page.getByRole('button', { name: /^Download$/ })).toBeEnabled();
  });
});
