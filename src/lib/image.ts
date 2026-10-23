/**
 * Browser-only image helpers. Everything runs locally on a <canvas>;
 * nothing here makes a network request.
 */
import { LIMITS } from '../config/site';
import { checkImageFile, type ImageKind } from './fileCheck';
import type { DrawRect } from './layout';

export interface LoadedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
  kind: ImageKind;
  name: string;
  size: number;
  hasAlpha: boolean;
  /** Object URL for <img> previews. Call release() when done. */
  url: string;
  release: () => void;
}

export class ImageLoadError extends Error {}

function decodeWithImgElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new ImageLoadError('decode'));
    img.src = url;
  });
}

/** Sample a downscaled copy to see whether any pixel is not fully opaque. */
function detectAlpha(source: CanvasImageSource, w: number, h: number): boolean {
  const s = Math.min(1, 256 / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * s));
  const ch = Math.max(1, Math.round(h * s));
  const c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return false;
  ctx.drawImage(source, 0, 0, cw, ch);
  const data = ctx.getImageData(0, 0, cw, ch).data;
  for (let i = 3; i < data.length; i += 4) if ((data[i] ?? 255) < 255) return true;
  return false;
}

export async function loadImageFile(file: File): Promise<LoadedImage> {
  const check = await checkImageFile(file, LIMITS.maxFileBytes);
  if (!check.ok) throw new ImageLoadError(check.message);

  const url = URL.createObjectURL(file);
  let img: HTMLImageElement;
  try {
    // <img> honours EXIF orientation in all current browsers.
    img = await decodeWithImgElement(url);
  } catch {
    URL.revokeObjectURL(url);
    throw new ImageLoadError(
      'The file looks like an image but could not be read. It may be damaged or only partly downloaded. Try re-exporting it.',
    );
  }
  const width = img.naturalWidth;
  const height = img.naturalHeight;
  if (!width || !height) {
    URL.revokeObjectURL(url);
    throw new ImageLoadError('This image has no readable dimensions.');
  }
  if (width * height > LIMITS.maxSourcePixels) {
    URL.revokeObjectURL(url);
    throw new ImageLoadError(
      `This image is ${(width * height / 1e6).toFixed(0)} megapixels, above the ${LIMITS.maxSourcePixels / 1e6} MP limit. Scale it down first.`,
    );
  }
  const hasAlpha = check.kind === 'jpeg' ? false : detectAlpha(img, width, height);
  return {
    source: img,
    width,
    height,
    kind: check.kind,
    name: file.name,
    size: file.size,
    hasAlpha,
    url,
    release: () => URL.revokeObjectURL(url),
  };
}

export type OutputFormat = 'image/png' | 'image/jpeg' | 'image/webp';

export const FORMAT_EXT: Record<OutputFormat, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

let webpSupport: boolean | null = null;
/** Safari before v14 and some older browsers cannot encode WebP from canvas. */
export function canEncodeWebp(): boolean {
  if (webpSupport !== null) return webpSupport;
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 2;
    webpSupport = c.toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    webpSupport = false;
  }
  return webpSupport;
}

export interface RenderOptions {
  width: number;
  height: number;
  rect: DrawRect;
  /** CSS colour, or null for transparent. */
  background: string | null;
  /** Clip output to a circle (transparent corners). */
  circle?: boolean;
}

export function createCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function drawImageOnto(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  opts: RenderOptions,
): void {
  const { width, height, rect, background, circle } = opts;
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  if (circle) {
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, Math.min(width, height) / 2, 0, Math.PI * 2);
    ctx.clip();
  }
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, rect.dx, rect.dy, rect.dw, rect.dh);
  ctx.restore();
}

export function renderToCanvas(source: CanvasImageSource, opts: RenderOptions): HTMLCanvasElement {
  const c = createCanvas(opts.width, opts.height);
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available in this browser.');
  drawImageOnto(ctx, source, opts);
  return c;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: OutputFormat, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('The browser could not create the image file.'))),
      type,
      type === 'image/png' ? undefined : quality,
    );
  });
}

/** JPEG has no transparency, so fill a background behind transparent pixels. */
export function flattenForJpeg(canvas: HTMLCanvasElement, background: string): HTMLCanvasElement {
  const c = createCanvas(canvas.width, canvas.height);
  const ctx = c.getContext('2d');
  if (!ctx) return canvas;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(canvas, 0, 0);
  return c;
}

/** Decode a base64 data: URL without fetch() (keeps CSP connect-src strict). */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [head = '', body = ''] = dataUrl.split(',');
  const mime = /data:([^;]+)/.exec(head)?.[1] ?? 'application/octet-stream';
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
