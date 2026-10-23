/**
 * Pure geometry for placing a source image on an output canvas.
 * Shared by the resizer, cropper and watermark tools, and unit-tested.
 */
export type FitMode = 'cover' | 'contain';

export interface Placement {
  /** Zoom multiplier on top of the base fit (1 = exact fit). */
  zoom: number;
  /** -1 (left/top) … 0 (centre) … 1 (right/bottom). */
  offsetX: number;
  offsetY: number;
}

export interface DrawRect {
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

export const CENTRED: Placement = { zoom: 1, offsetX: 0, offsetY: 0 };

export function computeDrawRect(
  srcW: number,
  srcH: number,
  outW: number,
  outH: number,
  fit: FitMode,
  p: Placement = CENTRED,
): DrawRect {
  if (!(srcW > 0 && srcH > 0 && outW > 0 && outH > 0)) {
    throw new Error('Dimensions must be positive');
  }
  const sx = outW / srcW;
  const sy = outH / srcH;
  const base = fit === 'cover' ? Math.max(sx, sy) : Math.min(sx, sy);
  const scale = base * Math.max(0.1, p.zoom);
  const dw = srcW * scale;
  const dh = srcH * scale;
  // "extra" is how far the drawn image overflows (positive) or underfills
  // (negative) the canvas. Offset slides it across that range.
  const extraX = dw - outW;
  const extraY = dh - outH;
  const dx = -extraX * ((clampUnit(p.offsetX) + 1) / 2);
  const dy = -extraY * ((clampUnit(p.offsetY) + 1) / 2);
  // `+ 0` normalises -0, which some consumers (and tests) treat as distinct.
  return { dx: dx + 0, dy: dy + 0, dw, dh };
}

function clampUnit(n: number): number {
  return Math.min(1, Math.max(-1, Number.isFinite(n) ? n : 0));
}

/**
 * Fraction (0–1) of the source image that ends up OUTSIDE the canvas,
 * i.e. cropped away. 0 means nothing is lost.
 */
export function croppedFraction(rect: DrawRect, outW: number, outH: number): number {
  const visW = Math.max(0, Math.min(rect.dx + rect.dw, outW) - Math.max(rect.dx, 0));
  const visH = Math.max(0, Math.min(rect.dy + rect.dh, outH) - Math.max(rect.dy, 0));
  const total = rect.dw * rect.dh;
  if (total <= 0) return 0;
  const lost = 1 - (visW * visH) / total;
  return lost < 1e-6 ? 0 : lost;
}

/** True when part of the canvas is left uncovered (padding visible). */
export function hasPadding(rect: DrawRect, outW: number, outH: number): boolean {
  const eps = 0.5;
  return rect.dx > eps || rect.dy > eps || rect.dx + rect.dw < outW - eps || rect.dy + rect.dh < outH - eps;
}

/**
 * Convert a pointer drag (in preview pixels) into a new offset.
 * previewScale = preview size / output size.
 */
export function dragToOffset(
  start: Placement,
  deltaPx: { x: number; y: number },
  rect: DrawRect,
  outW: number,
  outH: number,
  previewScale: number,
): Placement {
  const extraX = rect.dw - outW;
  const extraY = rect.dh - outH;
  const mx = deltaPx.x / previewScale;
  const my = deltaPx.y / previewScale;
  // Moving the pointer right should move the image right (dx increases).
  const nx = Math.abs(extraX) < 0.5 ? start.offsetX : start.offsetX - (2 * mx) / extraX;
  const ny = Math.abs(extraY) < 0.5 ? start.offsetY : start.offsetY - (2 * my) / extraY;
  return { ...start, offsetX: clampUnit(nx), offsetY: clampUnit(ny) };
}

/** Validate user-entered output dimensions. Returns an error message or null. */
export function validateDimensions(
  w: number,
  h: number,
  maxSide: number,
  maxPixels: number,
): string | null {
  if (!Number.isInteger(w) || !Number.isInteger(h)) return 'Width and height must be whole numbers.';
  if (w < 16 || h < 16) return 'Width and height must be at least 16 pixels.';
  if (w > maxSide || h > maxSide) return `Width and height can be at most ${maxSide} pixels.`;
  if (w * h > maxPixels) {
    return `That is ${(w * h / 1e6).toFixed(1)} megapixels. The limit is ${maxPixels / 1e6} MP so it works reliably on phones.`;
  }
  return null;
}
