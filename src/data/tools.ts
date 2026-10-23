export interface ToolInfo {
  slug: string;
  path: string;
  name: string;
  /** Short label used in the header navigation. */
  navLabel: string;
  short: string;
  keywords: string[];
  icon: IconName;
  related: string[];
}

export type IconName = 'resize' | 'compress' | 'crop' | 'qr' | 'share' | 'text' | 'watermark';

export const TOOLS: ToolInfo[] = [
  {
    slug: 'image-resizer',
    path: '/tools/image-resizer',
    navLabel: 'Resize',
    name: 'Social Media Image Resizer',
    short: 'Resize and crop images to post, story, cover and thumbnail sizes, or any custom size.',
    keywords: ['resize', 'instagram', 'facebook', 'linkedin', 'youtube', 'tiktok', 'thumbnail', 'banner', 'crop', 'dimensions'],
    icon: 'resize',
    related: ['image-compressor', 'profile-cropper', 'watermark'],
  },
  {
    slug: 'image-compressor',
    path: '/tools/image-compressor',
    navLabel: 'Compress',
    name: 'Image Compressor',
    short: 'Shrink JPEG, PNG and WebP files with a quality slider or a target file size.',
    keywords: ['compress', 'reduce', 'file size', 'kb', 'jpeg', 'png', 'webp', 'optimize', 'smaller'],
    icon: 'compress',
    related: ['image-resizer', 'watermark', 'og-preview'],
  },
  {
    slug: 'profile-cropper',
    path: '/tools/profile-cropper',
    navLabel: 'Crop',
    name: 'Profile Picture & Cover Cropper',
    short: 'Drag and zoom to frame a profile picture with a circle preview, or crop a cover banner.',
    keywords: ['profile picture', 'avatar', 'circle', 'crop', 'cover', 'banner', 'header', 'pfp'],
    icon: 'crop',
    related: ['image-resizer', 'image-compressor', 'watermark'],
  },
  {
    slug: 'qr-code-generator',
    path: '/tools/qr-code-generator',
    navLabel: 'QR Code',
    name: 'QR Code Generator',
    short: 'Make a QR code for a link or text, pick colours and size, and download PNG or SVG.',
    keywords: ['qr', 'qr code', 'barcode', 'link', 'url', 'print', 'menu', 'poster'],
    icon: 'qr',
    related: ['og-preview', 'caption-formatter', 'image-resizer'],
  },
  {
    slug: 'og-preview',
    path: '/tools/og-preview',
    navLabel: 'Social Preview',
    name: 'Social Sharing Preview',
    short: 'Draft a link preview card and copy ready-made Open Graph meta tags.',
    keywords: ['open graph', 'og', 'meta tags', 'link preview', 'share card', 'twitter card', 'seo'],
    icon: 'share',
    related: ['image-resizer', 'caption-formatter', 'qr-code-generator'],
  },
  {
    slug: 'caption-formatter',
    path: '/tools/caption-formatter',
    navLabel: 'Captions',
    name: 'Caption & Text Formatter',
    short: 'Count characters and words, tidy whitespace and clean up hashtags before you post.',
    keywords: ['character count', 'word count', 'caption', 'hashtag', 'whitespace', 'line breaks', 'counter'],
    icon: 'text',
    related: ['og-preview', 'qr-code-generator', 'image-resizer'],
  },
  {
    slug: 'watermark',
    path: '/tools/watermark',
    navLabel: 'Watermark',
    name: 'Image Watermark Tool',
    short: 'Add a text watermark with position, opacity, size, rotation and tiling controls.',
    keywords: ['watermark', 'copyright', 'text on image', 'logo', 'protect', 'brand'],
    icon: 'watermark',
    related: ['image-resizer', 'image-compressor', 'profile-cropper'],
  },
];

/** Homepage section that lists every tool (the "All Tools" directory). */
export const ALL_TOOLS_PATH = '/#tools';

export function toolBySlug(slug: string): ToolInfo {
  const t = TOOLS.find((x) => x.slug === slug);
  if (!t) throw new Error(`Unknown tool ${slug}`);
  return t;
}

/** Case-insensitive match on name, description and keywords. */
export function filterTools(query: string, tools: ToolInfo[] = TOOLS): ToolInfo[] {
  const q = query.trim().toLowerCase();
  if (!q) return tools;
  const terms = q.split(/\s+/);
  return tools.filter((t) => {
    const hay = [t.name, t.short, ...t.keywords].join(' ').toLowerCase();
    return terms.every((term) => hay.includes(term));
  });
}
