import { describe, expect, it } from 'vitest';
import { aspectLabel, formatBytes, outputFileName, reductionPercent } from '../src/lib/format';
import { computeDrawRect, croppedFraction, dragToOffset, hasPadding, validateDimensions } from '../src/lib/layout';
import { checkImageBytes, sniffImageKind } from '../src/lib/fileCheck';
import { cleanWhitespace, countGraphemes, formatHashtags, moveHashtagsToEnd, textStats, toHashtagBody } from '../src/lib/text';
import { buildOgTags, checkHttpUrl, descriptionAdvice, escapeAttr, imageRatioAdvice, titleAdvice } from '../src/lib/og';
import { contrastRatio } from '../src/lib/color';
import { validateQr, type QrSettings } from '../src/lib/qr';
import { fitWithin, searchQuality } from '../src/lib/compress';
import { anchorFor } from '../src/lib/watermark';
import { filterTools, TOOLS } from '../src/data/tools';
import { PROFILE_PRESETS, SOCIAL_PRESETS } from '../src/data/presets';
import { metaForPath, ROUTES } from '../src/data/routes';

describe('format', () => {
  it('formats bytes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(200 * 1024)).toBe('200 KB');
    expect(formatBytes(3.5 * 1024 * 1024)).toBe('3.50 MB');
    expect(formatBytes(-1)).toBe('—');
  });
  it('computes real reduction percentages', () => {
    expect(reductionPercent(1000, 250)).toBe(75);
    expect(reductionPercent(1000, 1200)).toBe(-20);
    expect(reductionPercent(0, 10)).toBeNull();
  });
  it('labels aspect ratios', () => {
    expect(aspectLabel(1080, 1350)).toBe('4:5');
    expect(aspectLabel(1920, 1080)).toBe('16:9');
    expect(aspectLabel(1200, 630)).toBe('1.90:1');
    expect(aspectLabel(1584, 396)).toBe('4:1');
  });
  it('builds safe file names', () => {
    expect(outputFileName('My Photo (1).JPG', '1080x1080', 'jpg')).toBe('My-Photo-1-1080x1080.jpg');
    expect(outputFileName('../../etc/passwd', 'x', 'png')).not.toMatch(/[/\\]/);
    expect(outputFileName('.png', 'a', 'png')).toBe('image-a.png');
  });
});

describe('layout geometry', () => {
  it('cover fills the frame and crops the overflow', () => {
    const r = computeDrawRect(2000, 1000, 1000, 1000, 'cover');
    expect(r).toEqual({ dx: -500, dy: 0, dw: 2000, dh: 1000 });
    expect(croppedFraction(r, 1000, 1000)).toBeCloseTo(0.5);
    expect(hasPadding(r, 1000, 1000)).toBe(false);
  });
  it('contain keeps the whole image and pads', () => {
    const r = computeDrawRect(2000, 1000, 1000, 1000, 'contain');
    expect(r).toEqual({ dx: 0, dy: 250, dw: 1000, dh: 500 });
    expect(croppedFraction(r, 1000, 1000)).toBe(0);
    expect(hasPadding(r, 1000, 1000)).toBe(true);
  });
  it('exact aspect match has no crop and no padding', () => {
    const r = computeDrawRect(3000, 2000, 1500, 1000, 'cover');
    expect(croppedFraction(r, 1500, 1000)).toBe(0);
    expect(hasPadding(r, 1500, 1000)).toBe(false);
  });
  it('offsets align to edges', () => {
    expect(computeDrawRect(2000, 1000, 1000, 1000, 'cover', { zoom: 1, offsetX: -1, offsetY: 0 }).dx).toBeCloseTo(0);
    expect(computeDrawRect(2000, 1000, 1000, 1000, 'cover', { zoom: 1, offsetX: 1, offsetY: 0 }).dx).toBe(-1000);
  });
  it('zoom scales and increases crop', () => {
    const r = computeDrawRect(1000, 1000, 1000, 1000, 'cover', { zoom: 2, offsetX: 0, offsetY: 0 });
    expect(r.dw).toBe(2000);
    expect(croppedFraction(r, 1000, 1000)).toBeCloseTo(0.75);
  });
  it('dragging right moves the image right and clamps', () => {
    const rect = computeDrawRect(2000, 1000, 1000, 1000, 'cover');
    const p = dragToOffset({ zoom: 1, offsetX: 0, offsetY: 0 }, { x: 100, y: 0 }, rect, 1000, 1000, 0.5);
    const moved = computeDrawRect(2000, 1000, 1000, 1000, 'cover', p);
    expect(moved.dx).toBeCloseTo(-300);
    const far = dragToOffset({ zoom: 1, offsetX: 0, offsetY: 0 }, { x: 10000, y: 0 }, rect, 1000, 1000, 0.5);
    expect(far.offsetX).toBe(-1);
  });
  it('rejects invalid dimensions', () => {
    expect(validateDimensions(1080, 1080, 8192, 16e6)).toBeNull();
    expect(validateDimensions(10, 1080, 8192, 16e6)).toMatch(/at least 16/);
    expect(validateDimensions(9000, 100, 8192, 16e6)).toMatch(/at most 8192/);
    expect(validateDimensions(5000, 5000, 8192, 16e6)).toMatch(/megapixels/);
    expect(validateDimensions(10.5, 100, 8192, 16e6)).toMatch(/whole/);
    expect(validateDimensions(NaN, 100, 8192, 16e6)).toMatch(/whole/);
  });
  it('throws on zero dimensions', () => {
    expect(() => computeDrawRect(0, 10, 10, 10, 'cover')).toThrow();
  });
});

const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(16).fill(0)]);

describe('file signature checks', () => {
  it('recognises real image signatures', () => {
    expect(sniffImageKind(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('jpeg');
    expect(sniffImageKind(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe('png');
    expect(sniffImageKind(new TextEncoder().encode('RIFF\x00\x00\x00\x00WEBPVP8 '))).toBe('webp');
    expect(sniffImageKind(new TextEncoder().encode('GIF89a......'))).toBe('gif');
  });
  it('rejects SVG with an explanation', () => {
    const r = checkImageBytes(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), 100, 1e6);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/SVG/);
  });
  it('rejects HEIC with guidance', () => {
    const heic = new Uint8Array([0, 0, 0, 0x18, ...new TextEncoder().encode('ftypheic'), 0, 0, 0, 0]);
    const r = checkImageBytes(heic, 100, 1e6);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/HEIC/);
  });
  it('rejects text renamed as .jpg, empty and oversized files', () => {
    expect(checkImageBytes(new TextEncoder().encode('hello world, not an image'), 20, 1e6).ok).toBe(false);
    const empty = checkImageBytes(new Uint8Array(), 0, 1e6);
    expect(empty.ok).toBe(false);
    const big = checkImageBytes(bytes(0xff, 0xd8, 0xff), 30 * 1024 * 1024, 25 * 1024 * 1024);
    expect(big.ok).toBe(false);
    if (!big.ok) expect(big.message).toMatch(/30\.0 MB/);
  });
});

describe('text tools', () => {
  it('counts emoji as single characters', () => {
    expect(countGraphemes('hi 👋🏽')).toBe(4);
    expect(countGraphemes('👨‍👩‍👧')).toBe(1);
    expect(countGraphemes('')).toBe(0);
  });
  it('computes stats', () => {
    const s = textStats('Hello world #NZ #nz @ray\n\nSecond para\nline');
    expect(s.words).toBe(8);
    expect(s.lines).toBe(4);
    expect(s.paragraphs).toBe(2);
    expect(s.hashtags).toBe(2);
    expect(s.uniqueHashtags).toBe(1);
    expect(s.mentions).toBe(1);
    expect(textStats('').lines).toBe(0);
    expect(textStats('   ').words).toBe(0);
  });
  it('does not treat emails or URL fragments as mentions/hashtags', () => {
    const s = textStats('mail me at a@b.com or see example.com/page#top');
    expect(s.mentions).toBe(0);
    expect(s.hashtags).toBe(0);
  });
  it('cleans whitespace', () => {
    expect(cleanWhitespace('  a   b  \n\n\n\nc  ', { trimLines: true, collapseSpaces: true, limitBlankLines: true })).toBe('a b\n\nc');
    expect(cleanWhitespace('a\r\nb​', { trimLines: false, collapseSpaces: false, limitBlankLines: false })).toBe('a\nb');
  });
  it('formats hashtag lists', () => {
    expect(toHashtagBody('road trip!')).toBe('roadTrip');
    const opts = { lowercase: false, dedupe: true, separator: 'space' as const };
    expect(formatHashtags('travel, #NZ, road trip, #nz, waikato', opts)).toEqual(['#travel', '#NZ', '#roadTrip', '#waikato']);
    expect(formatHashtags('#A #b #a', { ...opts, lowercase: true })).toEqual(['#a', '#b']);
    expect(formatHashtags('#a #a', { ...opts, dedupe: false })).toEqual(['#a', '#a']);
    expect(formatHashtags('123, !!!, ', opts)).toEqual([]);
    expect(formatHashtags('Café, über', opts)).toEqual(['#Café', '#über']);
  });
  it('moves hashtags to the end', () => {
    const out = moveHashtagsToEnd('Sunset #nz over the hills #travel #nz', { lowercase: false, dedupe: true, separator: 'space' });
    expect(out).toBe('Sunset over the hills\n\n#nz #travel');
  });
});

describe('open graph helpers', () => {
  it('escapes attribute values (no HTML injection)', () => {
    expect(escapeAttr('"><script>alert(1)</script>')).toBe('&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;');
    const tags = buildOgTags({ title: 'A "B" <c>', description: '', url: 'https://x.com', imageUrl: '', siteName: '', imageAlt: '' });
    expect(tags).toContain('content="A &quot;B&quot; &lt;c&gt;"');
    expect(tags).not.toContain('<c>');
    expect(tags).toContain('twitter:card" content="summary"');
  });
  it('validates URLs', () => {
    expect(checkHttpUrl('https://example.com').ok).toBe(true);
    expect(checkHttpUrl('example.com').ok).toBe(false);
    expect(checkHttpUrl('javascript:alert(1)').ok).toBe(false);
    expect(checkHttpUrl('ftp://example.com').ok).toBe(false);
    expect(checkHttpUrl('https://intranet').ok).toBe(false);
  });
  it('gives length advice', () => {
    expect(titleAdvice(0).level).toBe('empty');
    expect(titleAdvice(40).level).toBe('good');
    expect(titleAdvice(80).level).toBe('long');
    expect(descriptionAdvice(120).level).toBe('good');
    expect(imageRatioAdvice(1200, 630)).toMatch(/1\.91/);
  });
});

describe('QR validation', () => {
  const base: QrSettings = { mode: 'url', value: 'https://example.com', fg: '#000000', bg: '#ffffff', size: 512, margin: 4, ecc: 'M' };
  it('accepts a valid config', () => {
    expect(validateQr(base)).toEqual({ errors: [], warnings: [] });
  });
  it('rejects bad input', () => {
    expect(validateQr({ ...base, value: '' }).errors.length).toBe(1);
    expect(validateQr({ ...base, value: 'not a url' }).errors[0]).toMatch(/https/);
    expect(validateQr({ ...base, size: 50 }).errors[0]).toMatch(/between/);
    expect(validateQr({ ...base, fg: '#eeeeee' }).errors[0]).toMatch(/too similar/);
    expect(validateQr({ ...base, fg: 'red' }).errors[0]).toMatch(/hex/);
  });
  it('warns about risky choices', () => {
    expect(validateQr({ ...base, value: 'http://example.com' }).warnings[0]).toMatch(/http/);
    expect(validateQr({ ...base, fg: '#ffffff', bg: '#000000' }).warnings.join()).toMatch(/inverted/);
    expect(validateQr({ ...base, margin: 0 }).warnings.join()).toMatch(/quiet zone/);
  });
  it('text mode does not require a URL', () => {
    expect(validateQr({ ...base, mode: 'text', value: 'Hello' }).errors).toEqual([]);
  });
  it('contrast maths matches WCAG', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBe(21);
    expect(contrastRatio('#fff', '#fff')).toBe(1);
  });
});

describe('compression search', () => {
  // Fake encoder: size grows linearly with quality.
  const enc = (perQ: number) => async (q: number) => new Blob([new Uint8Array(Math.round(q * perQ))]);
  it('returns the highest quality that fits', async () => {
    const r = await searchQuality(enc(100_000), 50_000);
    expect(r.fits).toBe(true);
    expect(r.blob.size).toBeLessThanOrEqual(50_000);
    expect(r.quality).toBeGreaterThan(0.45);
  });
  it('returns top quality immediately when already small', async () => {
    const r = await searchQuality(enc(1000), 50_000);
    expect(r.quality).toBe(0.95);
    expect(r.attempts).toBe(1);
  });
  it('reports when the target cannot be met', async () => {
    const r = await searchQuality(async () => new Blob([new Uint8Array(10_000)]), 100);
    expect(r.fits).toBe(false);
  });
  it('fits dimensions within a max side', () => {
    expect(fitWithin(4000, 3000, 2000)).toEqual({ width: 2000, height: 1500 });
    expect(fitWithin(800, 600, 2000)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(800, 600, 0)).toEqual({ width: 800, height: 600 });
  });
});

describe('watermark anchors', () => {
  it('maps grid positions', () => {
    expect(anchorFor('tl')).toEqual({ ax: 0, ay: 0 });
    expect(anchorFor('mc')).toEqual({ ax: 0.5, ay: 0.5 });
    expect(anchorFor('br')).toEqual({ ax: 1, ay: 1 });
  });
});

describe('site data', () => {
  it('every tool has a route with metadata, and related tools exist', () => {
    for (const t of TOOLS) {
      expect(metaForPath(t.path).path).toBe(t.path);
      for (const r of t.related) expect(TOOLS.some((x) => x.slug === r)).toBe(true);
    }
  });
  it('titles and descriptions are unique', () => {
    expect(new Set(ROUTES.map((r) => r.title)).size).toBe(ROUTES.length);
    expect(new Set(ROUTES.map((r) => r.description)).size).toBe(ROUTES.length);
    for (const r of ROUTES) expect(r.description.length).toBeLessThanOrEqual(170);
  });
  it('presets are valid and official ones cite a source', () => {
    for (const p of [...SOCIAL_PRESETS, ...PROFILE_PRESETS]) {
      expect(p.width).toBeGreaterThanOrEqual(16);
      expect(p.width * p.height).toBeLessThanOrEqual(16_000_000);
      if (p.source === 'official') expect(p.ref).toMatch(/^https:\/\//);
    }
  });
  it('filters tools', () => {
    expect(filterTools('thumbnail').map((t) => t.slug)).toContain('image-resizer');
    expect(filterTools('kb').map((t) => t.slug)).toEqual(['image-compressor']);
    expect(filterTools('zzz')).toEqual([]);
    expect(filterTools('')).toHaveLength(TOOLS.length);
  });
  it('unknown paths resolve to noindex 404 meta', () => {
    expect(metaForPath('/nope').indexable).toBe(false);
    expect(metaForPath('/about/').path).toBe('/about');
  });
});
