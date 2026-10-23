/** QR generation wrapper around the `qrcode` library. Runs entirely in the browser. */
import { contrastRatio, luminance } from './color';
import { checkHttpUrl } from './og';

export type Ecc = 'L' | 'M' | 'Q' | 'H';

export interface QrSettings {
  mode: 'url' | 'text';
  value: string;
  fg: string;
  bg: string;
  size: number;
  margin: number;
  ecc: Ecc;
}

export const QR_MIN_SIZE = 128;
export const QR_MAX_SIZE = 2048;

export interface QrValidation {
  errors: string[];
  warnings: string[];
}

export function validateQr(s: QrSettings): QrValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const v = s.value.trim();
  if (!v) errors.push(s.mode === 'url' ? 'Enter the URL the QR code should open.' : 'Enter the text to encode.');
  else if (s.mode === 'url') {
    const c = checkHttpUrl(v);
    if (!c.ok) errors.push(c.message);
    else if (c.url.protocol === 'http:') warnings.push('This link uses http://. Many phones warn before opening insecure links; use https:// if the site supports it.');
  }
  if (!Number.isInteger(s.size) || s.size < QR_MIN_SIZE || s.size > QR_MAX_SIZE) {
    errors.push(`Size must be a whole number between ${QR_MIN_SIZE} and ${QR_MAX_SIZE} pixels.`);
  }
  const ratio = contrastRatio(s.fg, s.bg);
  if (ratio === null) errors.push('Colours must be valid hex values such as #111827.');
  else {
    if (ratio < 3) errors.push(`The colours are too similar (contrast ${ratio}:1). Use a much darker foreground or lighter background.`);
    else if (ratio < 4.5) warnings.push(`Contrast is only ${ratio}:1. Some scanners may struggle; dark on light with 7:1 or more is safest.`);
    const lf = luminance(s.fg) ?? 0;
    const lb = luminance(s.bg) ?? 1;
    if (lf > lb) warnings.push('Light modules on a dark background ("inverted") are not supported by every scanner app. Test with several phones.');
  }
  if (s.margin < 2) warnings.push('A quiet zone (margin) of at least 4 modules is recommended by the QR standard. Small margins can stop some scanners working.');
  return { errors, warnings };
}

export function qrOptions(s: QrSettings) {
  return {
    errorCorrectionLevel: s.ecc,
    margin: s.margin,
    width: s.size,
    color: { dark: s.fg, light: s.bg },
  } as const;
}

// Loaded on demand so other pages don't download the QR library.
const lib = () => import('qrcode').then((m) => m.default ?? m);

export async function qrToDataUrl(s: QrSettings): Promise<string> {
  return (await lib()).toDataURL(s.value.trim(), { ...qrOptions(s), type: 'image/png' });
}

export async function qrToSvg(s: QrSettings): Promise<string> {
  return (await lib()).toString(s.value.trim(), { ...qrOptions(s), type: 'svg' });
}

/** Friendly message for library errors (most commonly: too much data). */
export function qrErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/too big|amount of data/i.test(msg)) {
    return 'There is too much content for a QR code at this error-correction level. Shorten the text, use a shorter link, or choose a lower error-correction level.';
  }
  return 'The QR code could not be generated. Check the content and try again.';
}
