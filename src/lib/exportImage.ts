import { canvasToBlob, flattenForJpeg, renderToCanvas, type LoadedImage, type OutputFormat } from './image';
import type { DrawRect } from './layout';

export interface ExportOptions {
  width: number;
  height: number;
  rect: DrawRect;
  format: OutputFormat;
  quality: number;
  /** Background for padding. null = transparent (PNG/WebP). */
  background: string | null;
  /** Used behind transparency when exporting JPEG. */
  jpegBackground: string;
  circle?: boolean;
  draw?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
}

export async function exportImage(image: LoadedImage, o: ExportOptions): Promise<Blob> {
  let canvas = renderToCanvas(image.source, {
    width: o.width,
    height: o.height,
    rect: o.rect,
    background: o.background,
    circle: o.circle,
  });
  if (o.draw) {
    const ctx = canvas.getContext('2d');
    if (ctx) o.draw(ctx, o.width, o.height);
  }
  if (o.format === 'image/jpeg') canvas = flattenForJpeg(canvas, o.background ?? o.jpegBackground);
  return canvasToBlob(canvas, o.format, o.quality);
}
