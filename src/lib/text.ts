/** Caption / text statistics and clean-up. Pure functions, unit-tested. */

/** Count user-perceived characters (emoji and accented letters count as 1). */
export function countGraphemes(text: string): number {
  if (!text) return 0;
  const Seg = (Intl as unknown as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (Seg) {
    let n = 0;
    for (const _ of new Seg('en', { granularity: 'grapheme' }).segment(text)) {
      void _;
      n += 1;
    }
    return n;
  }
  return Array.from(text).length;
}

const HASHTAG_RE = /(^|[^\p{L}\p{N}_&])#([\p{L}\p{N}_]+)/gu;
const MENTION_RE = /(^|[^\p{L}\p{N}_])@([\p{L}\p{N}_.]+)/gu;

export function extractHashtags(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(HASHTAG_RE)) if (m[2]) out.push(m[2]);
  return out;
}

export interface TextStats {
  characters: number;
  charactersNoSpaces: number;
  utf16Length: number;
  words: number;
  lines: number;
  paragraphs: number;
  hashtags: number;
  uniqueHashtags: number;
  mentions: number;
}

export function textStats(text: string): TextStats {
  const trimmed = text.trim();
  const tags = extractHashtags(text);
  return {
    characters: countGraphemes(text),
    charactersNoSpaces: countGraphemes(text.replace(/\s+/g, '')),
    utf16Length: text.length,
    words: trimmed ? trimmed.split(/\s+/u).filter((w) => /[\p{L}\p{N}]/u.test(w)).length : 0,
    lines: text === '' ? 0 : text.split(/\r\n|\r|\n/).length,
    paragraphs: trimmed ? trimmed.split(/(?:\r?\n[ \t]*){2,}/).filter((p) => p.trim()).length : 0,
    hashtags: tags.length,
    uniqueHashtags: new Set(tags.map((t) => t.toLowerCase())).size,
    mentions: [...text.matchAll(MENTION_RE)].length,
  };
}

export interface CleanupOptions {
  trimLines: boolean;
  collapseSpaces: boolean;
  /** Reduce 3+ newlines to a single blank line. */
  limitBlankLines: boolean;
}

export function cleanWhitespace(text: string, o: CleanupOptions): string {
  let t = text.replace(/\r\n?/g, '\n').replace(/[\u200B\uFEFF]/g, '');
  if (o.collapseSpaces) t = t.replace(/[ \t\u00A0]{2,}/g, ' ');
  if (o.trimLines) t = t.split('\n').map((l) => l.trim()).join('\n');
  if (o.limitBlankLines) t = t.replace(/\n{3,}/g, '\n\n');
  return t.trim();
}

/** Turn arbitrary words into a valid hashtag body (letters, numbers, underscore). */
export function toHashtagBody(word: string): string {
  return word
    .normalize('NFC')
    .replace(/^#+/, '')
    .split(/[^\p{L}\p{N}_]+/u)
    .filter(Boolean)
    .map((part, i) => (i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join('');
}

export interface HashtagOptions {
  lowercase: boolean;
  dedupe: boolean;
  separator: 'space' | 'newline';
}

/** Parse a free-form list ("travel, #NZ  road trip") into clean hashtags. */
export function formatHashtags(input: string, o: HashtagOptions): string[] {
  const parts = input
    .split(/[,\n]|(?=#)|\s{2,}/)
    .flatMap((chunk) => {
      const c = chunk.trim();
      if (!c) return [];
      // "#a #b" style — split on spaces; "road trip" — join words.
      return c.includes('#') ? c.split(/\s+/) : [c];
    })
    .map(toHashtagBody)
    .filter((b) => b.length > 0 && /[\p{L}]/u.test(b));
  const out: string[] = [];
  const seen = new Set<string>();
  for (const b of parts) {
    const body = o.lowercase ? b.toLowerCase() : b;
    const key = body.toLowerCase();
    if (o.dedupe && seen.has(key)) continue;
    seen.add(key);
    out.push(`#${body}`);
  }
  return out;
}

/** Remove hashtags found inline in a caption and return [caption, tags]. */
export function moveHashtagsToEnd(text: string, o: HashtagOptions): string {
  const tags = extractHashtags(text);
  if (tags.length === 0) return text;
  const body = text
    .replace(HASHTAG_RE, (_m, pre: string) => pre)
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+$/gm, '')
    .trim();
  const formatted = formatHashtags(tags.map((t) => `#${t}`).join(' '), o);
  const sep = o.separator === 'newline' ? '\n' : ' ';
  return `${body}\n\n${formatted.join(sep)}`;
}
