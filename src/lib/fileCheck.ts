/**
 * File validation done before any decoding. Checks the real file signature
 * (magic bytes), not just the extension or the browser-reported MIME type.
 */
export type ImageKind = 'jpeg' | 'png' | 'webp' | 'gif';

export const ACCEPT_ATTR = 'image/jpeg,image/png,image/webp,image/gif';
export const SUPPORTED_LABEL = 'JPEG, PNG, WebP or GIF (first frame)';

export function sniffImageKind(bytes: Uint8Array): ImageKind | null {
  const b = bytes;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (
    b.length >= 8 &&
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  ) return 'png';
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) return 'webp';
  if (b.length >= 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return 'gif';
  return null;
}

function looksLikeSvg(bytes: Uint8Array): boolean {
  const head = new TextDecoder().decode(bytes.slice(0, 512)).trimStart().toLowerCase();
  return head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'));
}

function looksLikeHeic(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  const box = new TextDecoder().decode(bytes.slice(4, 8));
  const brand = new TextDecoder().decode(bytes.slice(8, 12));
  return box === 'ftyp' && ['heic', 'heix', 'hevc', 'heim', 'heis', 'mif1', 'msf1', 'avif', 'avis'].includes(brand);
}

export type FileCheck =
  | { ok: true; kind: ImageKind }
  | { ok: false; message: string };

export function checkImageBytes(bytes: Uint8Array, size: number, maxBytes: number): FileCheck {
  if (size === 0) return { ok: false, message: 'That file is empty. Choose a different image.' };
  if (size > maxBytes) {
    return {
      ok: false,
      message: `That file is ${(size / 1024 / 1024).toFixed(1)} MB. The limit is ${Math.round(maxBytes / 1024 / 1024)} MB.`,
    };
  }
  const kind = sniffImageKind(bytes);
  if (kind) return { ok: true, kind };
  if (looksLikeSvg(bytes)) {
    return {
      ok: false,
      message:
        'SVG files are not accepted because they can contain scripts. Export your SVG as a PNG first, then upload the PNG.',
    };
  }
  if (looksLikeHeic(bytes)) {
    return {
      ok: false,
      message:
        'This looks like a HEIC/HEIF or AVIF photo, which most browsers cannot edit. On iPhone, set Camera > Formats to "Most Compatible", or export the photo as JPEG.',
    };
  }
  return { ok: false, message: `This file is not a supported image. Use ${SUPPORTED_LABEL}.` };
}

export async function checkImageFile(file: File, maxBytes: number): Promise<FileCheck> {
  const head = new Uint8Array(await file.slice(0, 512).arrayBuffer());
  return checkImageBytes(head, file.size, maxBytes);
}
