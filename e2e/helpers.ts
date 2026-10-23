import { expect, type Download, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const fixture = (name: string) => join(import.meta.dirname, 'fixtures', name);

/** Records every request that leaves localhost, and every console error. */
export function watch(page: Page) {
  const external: string[] = [];
  const errors: string[] = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (!['localhost', '127.0.0.1'].includes(u.hostname) && !['data:', 'blob:'].includes(u.protocol)) external.push(r.url());
  });
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  return { external, errors };
}

export async function upload(page: Page, name: string) {
  await page.getByTestId('file-input').setInputFiles(fixture(name));
}

export interface ImageInfo {
  width: number;
  height: number;
  /** Alpha of the top-left pixel. */
  cornerAlpha: number;
  /** RGBA of the centre pixel. */
  centre: number[];
  type: string;
  size: number;
}

/** Decode a downloaded image inside the browser and report its real properties. */
export async function inspectDownload(page: Page, download: Download): Promise<ImageInfo> {
  const path = await download.path();
  const buf = await readFile(path);
  const name = download.suggestedFilename();
  const type = name.endsWith('.png') ? 'image/png' : name.endsWith('.webp') ? 'image/webp' : name.endsWith('.svg') ? 'image/svg+xml' : 'image/jpeg';
  const b64 = buf.toString('base64');
  const info = await page.evaluate(
    async ({ b64, type }) => {
      const img = new Image();
      img.src = `data:${type};base64,${b64}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const corner = ctx.getImageData(0, 0, 1, 1).data;
      const mid = ctx.getImageData(Math.floor(c.width / 2), Math.floor(c.height / 2), 1, 1).data;
      return { width: c.width, height: c.height, cornerAlpha: corner[3]!, centre: Array.from(mid) };
    },
    { b64, type },
  );
  return { ...info, type, size: buf.length };
}

/** Number of pixels with R,G,B all above 230 in a downloaded PNG/JPEG. */
export async function countNearWhite(page: Page, download: Download): Promise<number> {
  const buf = await readFile(await download.path());
  const type = download.suggestedFilename().endsWith('.png') ? 'image/png' : 'image/jpeg';
  return page.evaluate(
    async ({ b64, type }) => {
      const img = new Image();
      img.src = `data:${type};base64,${b64}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i]! > 230 && d[i + 1]! > 230 && d[i + 2]! > 230) n += 1;
      return n;
    },
    { b64: buf.toString('base64'), type },
  );
}

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}
