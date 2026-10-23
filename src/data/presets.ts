/**
 * Image size presets.
 *
 * `source: 'official'` — checked against the platform's own help page on
 * the date in PRESETS_CHECKED_ON (URL in `ref`).
 * `source: 'common'` — widely used size that we could NOT confirm on an
 * official page when this was written. Shown to users as such.
 *
 * Platforms change their layouts without notice; every preset is a
 * recommendation, not a guarantee the platform will accept or display
 * the image exactly as previewed.
 */
export const PRESETS_CHECKED_ON = '2026-10-24';

export interface SizePreset {
  id: string;
  platform: string;
  label: string;
  width: number;
  height: number;
  source: 'official' | 'common';
  ref?: string;
  note?: string;
  /** Suggested for circular profile crops. */
  circle?: boolean;
}

const YT_THUMB = 'https://support.google.com/youtube/answer/72431';
const IG_RES = 'https://help.instagram.com/1631821640426723';

export const SOCIAL_PRESETS: SizePreset[] = [
  {
    id: 'ig-square',
    platform: 'Instagram',
    label: 'Post — square (1:1)',
    width: 1080,
    height: 1080,
    source: 'official',
    ref: IG_RES,
    note: 'Instagram says it shares photos at up to 1080 × 1080 pixels.',
  },
  {
    id: 'ig-portrait',
    platform: 'Instagram',
    label: 'Post — portrait (4:5)',
    width: 1080,
    height: 1350,
    source: 'common',
    note: '1080 px wide matches Instagram’s stated maximum width; the 4:5 ratio is a widely used portrait size.',
  },
  {
    id: 'ig-landscape',
    platform: 'Instagram',
    label: 'Post — landscape (1.91:1)',
    width: 1080,
    height: 566,
    source: 'common',
  },
  {
    id: 'ig-story',
    platform: 'Instagram',
    label: 'Story / Reels cover (9:16)',
    width: 1080,
    height: 1920,
    source: 'common',
    note: 'Keep text and faces away from the top and bottom ~250 px, where app controls overlap.',
  },
  { id: 'fb-post', platform: 'Facebook', label: 'Feed post — landscape', width: 1200, height: 630, source: 'common' },
  { id: 'fb-square', platform: 'Facebook', label: 'Feed post — square', width: 1080, height: 1080, source: 'common' },
  {
    id: 'fb-cover',
    platform: 'Facebook',
    label: 'Page cover photo',
    width: 1640,
    height: 624,
    source: 'common',
    note: 'Desktop and mobile crop the cover differently. Keep key content in the centre.',
  },
  { id: 'li-post', platform: 'LinkedIn', label: 'Feed post — landscape', width: 1200, height: 627, source: 'common' },
  { id: 'li-square', platform: 'LinkedIn', label: 'Feed post — square', width: 1200, height: 1200, source: 'common' },
  {
    id: 'li-banner',
    platform: 'LinkedIn',
    label: 'Personal profile background',
    width: 1584,
    height: 396,
    source: 'common',
    note: 'Your profile photo covers part of the lower-left area.',
  },
  {
    id: 'tt-cover',
    platform: 'TikTok',
    label: 'Video cover (9:16)',
    width: 1080,
    height: 1920,
    source: 'common',
  },
  {
    id: 'yt-thumb',
    platform: 'YouTube',
    label: 'Video thumbnail (16:9)',
    width: 1280,
    height: 720,
    source: 'official',
    ref: YT_THUMB,
    note: 'YouTube asks for 16:9, at least 640 px wide. Mobile uploads are limited to 2 MB, so 1280 × 720 JPEG is a safe default.',
  },
  {
    id: 'yt-thumb-4k',
    platform: 'YouTube',
    label: 'Video thumbnail — 4K (16:9)',
    width: 3840,
    height: 2160,
    source: 'official',
    ref: YT_THUMB,
    note: 'YouTube’s current recommended resolution. Desktop uploads allow up to 50 MB.',
  },
  {
    id: 'yt-shorts-thumb',
    platform: 'YouTube',
    label: 'Shorts thumbnail (9:16)',
    width: 1080,
    height: 1920,
    source: 'official',
    ref: YT_THUMB,
    note: 'YouTube asks for 9:16, at least 640 px tall (2160 × 3840 recommended).',
  },
  {
    id: 'yt-banner',
    platform: 'YouTube',
    label: 'Channel banner',
    width: 2560,
    height: 1440,
    source: 'common',
    note: 'Only a central strip is visible on every device. Keep text and logos in the middle.',
  },
  { id: 'og-card', platform: 'Web', label: 'Link preview image (1.91:1)', width: 1200, height: 630, source: 'common' },
];

export const PROFILE_PRESETS: SizePreset[] = [
  { id: 'pfp-400', platform: 'Profile', label: 'Profile picture 400 × 400', width: 400, height: 400, source: 'common', circle: true },
  { id: 'pfp-800', platform: 'Profile', label: 'Profile picture 800 × 800', width: 800, height: 800, source: 'common', circle: true },
  { id: 'pfp-1080', platform: 'Profile', label: 'Profile picture 1080 × 1080', width: 1080, height: 1080, source: 'common', circle: true },
  ...SOCIAL_PRESETS.filter((p) => ['fb-cover', 'li-banner', 'yt-banner'].includes(p.id)),
  { id: 'x-header', platform: 'X', label: 'Header image (3:1)', width: 1500, height: 500, source: 'common' },
];

export function presetById(list: SizePreset[], id: string): SizePreset | undefined {
  return list.find((p) => p.id === id);
}

export function groupByPlatform(list: SizePreset[]): [string, SizePreset[]][] {
  const map = new Map<string, SizePreset[]>();
  for (const p of list) {
    const arr = map.get(p.platform) ?? [];
    arr.push(p);
    map.set(p.platform, arr);
  }
  return [...map.entries()];
}
