export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb < 10 ? mb.toFixed(2) : mb.toFixed(1)} MB`;
}

/**
 * Size change as a percentage of the original. Positive = smaller.
 * Returns null when the original size is zero/invalid.
 */
export function reductionPercent(original: number, result: number): number | null {
  if (!(original > 0) || !(result >= 0)) return null;
  return Math.round(((original - result) / original) * 1000) / 10;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-NZ').format(n);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Greatest common divisor for aspect-ratio labels. */
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export function aspectLabel(w: number, h: number): string {
  if (!(w > 0 && h > 0)) return '—';
  const g = gcd(Math.round(w), Math.round(h));
  const rw = Math.round(w) / g;
  const rh = Math.round(h) / g;
  if (rw <= 32 && rh <= 32) return `${rw}:${rh}`;
  return `${(w / h).toFixed(2)}:1`;
}

/** Build a safe download filename from the original name. */
export function outputFileName(original: string, suffix: string, ext: string): string {
  const base = original.replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').slice(0, 60).replace(/^-+|-+$/g, '') || 'image';
  return `${base}-${suffix}.${ext}`;
}
