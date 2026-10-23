/** Compression helpers: quality encode and target-size search. */
import { canvasToBlob, type OutputFormat } from './image';

export interface EncodeResult {
  blob: Blob;
  quality: number | null;
}

/**
 * Binary-search the quality setting to get under a byte budget.
 * Returns the highest quality that fits, or the lowest-quality result
 * (with fits=false) if even that is too big.
 */
export async function encodeToTarget(
  canvas: HTMLCanvasElement,
  type: Exclude<OutputFormat, 'image/png'>,
  targetBytes: number,
  encode: (c: HTMLCanvasElement, t: OutputFormat, q: number) => Promise<Blob> = canvasToBlob,
): Promise<EncodeResult & { fits: boolean; attempts: number }> {
  return searchQuality((q) => encode(canvas, type, q), targetBytes);
}

/** Pure search over an encoder function; exported for unit tests. */
export async function searchQuality(
  encodeAt: (q: number) => Promise<Blob>,
  targetBytes: number,
): Promise<EncodeResult & { fits: boolean; attempts: number }> {
  let lo = 0.05;
  let hi = 0.95;
  let attempts = 0;
  let best: { blob: Blob; quality: number } | null = null;
  const top = await encodeAt(hi);
  attempts += 1;
  if (top.size <= targetBytes) return { blob: top, quality: hi, fits: true, attempts };
  let lowest: { blob: Blob; quality: number } = { blob: top, quality: hi };
  for (let i = 0; i < 7; i += 1) {
    const mid = Math.round(((lo + hi) / 2) * 100) / 100;
    const b = await encodeAt(mid);
    attempts += 1;
    if (b.size <= targetBytes) {
      best = { blob: b, quality: mid };
      lo = mid;
    } else {
      lowest = b.size < lowest.blob.size ? { blob: b, quality: mid } : lowest;
      hi = mid;
    }
    if (hi - lo < 0.02) break;
  }
  if (best) return { ...best, fits: true, attempts };
  const floor = await encodeAt(0.05);
  attempts += 1;
  if (floor.size <= targetBytes) return { blob: floor, quality: 0.05, fits: true, attempts };
  return { ...(floor.size < lowest.blob.size ? { blob: floor, quality: 0.05 } : lowest), fits: false, attempts };
}

/** Scale dimensions so the longest side is at most maxSide. */
export function fitWithin(w: number, h: number, maxSide: number): { width: number; height: number } {
  if (!(maxSide > 0) || Math.max(w, h) <= maxSide) return { width: w, height: h };
  const s = maxSide / Math.max(w, h);
  return { width: Math.max(1, Math.round(w * s)), height: Math.max(1, Math.round(h * s)) };
}
