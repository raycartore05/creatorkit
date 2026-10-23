export interface RouteMeta {
  path: string;
  title: string;
  description: string;
  indexable: boolean;
  priority?: number;
  changefreq?: 'weekly' | 'monthly' | 'yearly';
}

export const ROUTES: RouteMeta[] = [
  {
    path: '/',
    title: 'CreatorKit — Free Image Resizer, Compressor, QR & Caption Tools',
    description:
      'Free browser-based tools for creators: resize images for social media, compress photos, crop profile pictures, make QR codes, preview link cards and format captions.',
    indexable: true,
    priority: 1,
    changefreq: 'monthly',
  },
  {
    path: '/tools/image-resizer',
    title: 'Social Media Image Resizer — Instagram, YouTube, LinkedIn Sizes | CreatorKit',
    description:
      'Resize and crop images for Instagram, Facebook, LinkedIn, TikTok and YouTube, or any custom size. Fill or fit, drag to reposition, download PNG, JPEG or WebP.',
    indexable: true,
    priority: 0.9,
    changefreq: 'monthly',
  },
  {
    path: '/tools/image-compressor',
    title: 'Image Compressor — Reduce JPEG, PNG & WebP File Size | CreatorKit',
    description:
      'Compress images in your browser. Set quality or a target size in KB, compare before and after, and see the real file-size saving before you download.',
    indexable: true,
    priority: 0.9,
    changefreq: 'monthly',
  },
  {
    path: '/tools/profile-cropper',
    title: 'Profile Picture Cropper with Circle Preview & Cover Cropper | CreatorKit',
    description:
      'Crop a profile picture with a live circular preview, or frame a cover or banner photo. Drag, zoom and download a square, circle or rectangular image.',
    indexable: true,
    priority: 0.8,
    changefreq: 'monthly',
  },
  {
    path: '/tools/qr-code-generator',
    title: 'Free QR Code Generator — Custom Colours, PNG & SVG | CreatorKit',
    description:
      'Create a QR code for a URL or text with custom colours, size and error correction. Download PNG or SVG. Generated in your browser, nothing stored.',
    indexable: true,
    priority: 0.8,
    changefreq: 'monthly',
  },
  {
    path: '/tools/og-preview',
    title: 'Open Graph Preview & Meta Tag Generator | CreatorKit',
    description:
      'Draft how a shared link card might look, check title and description length, and copy ready-to-paste Open Graph and Twitter card meta tags.',
    indexable: true,
    priority: 0.7,
    changefreq: 'monthly',
  },
  {
    path: '/tools/caption-formatter',
    title: 'Caption Character Counter & Hashtag Formatter | CreatorKit',
    description:
      'Count characters, words and hashtags against your own limit, tidy spacing and line breaks, and clean up hashtag lists, then copy your caption.',
    indexable: true,
    priority: 0.7,
    changefreq: 'monthly',
  },
  {
    path: '/tools/watermark',
    title: 'Add a Text Watermark to an Image — Free Online | CreatorKit',
    description:
      'Add a text watermark to your photo with position, opacity, size, rotation and tiled options. Processed in your browser and downloaded as PNG or JPEG.',
    indexable: true,
    priority: 0.7,
    changefreq: 'monthly',
  },
  {
    path: '/guides/social-media-image-sizes',
    title: 'Social Media Image Sizes Guide — What We Verified | CreatorKit',
    description:
      'Recommended image sizes for Instagram, Facebook, LinkedIn, TikTok and YouTube, which ones come from official help pages, plus format and safe-area tips.',
    indexable: true,
    priority: 0.8,
    changefreq: 'monthly',
  },
  {
    path: '/about',
    title: 'About CreatorKit',
    description: 'Why CreatorKit exists, how the tools work, and how it relates to RayOre.',
    indexable: true,
    priority: 0.4,
    changefreq: 'yearly',
  },
  {
    path: '/contact',
    title: 'Contact CreatorKit',
    description: 'How to report a bug, suggest a tool or ask a question about CreatorKit.',
    indexable: true,
    priority: 0.3,
    changefreq: 'yearly',
  },
  {
    path: '/privacy',
    title: 'Privacy Policy | CreatorKit',
    description: 'What CreatorKit does and does not collect. Images and text you use in the tools are processed in your browser.',
    indexable: true,
    priority: 0.3,
    changefreq: 'yearly',
  },
  {
    path: '/terms',
    title: 'Terms of Use | CreatorKit',
    description: 'Terms for using CreatorKit, including your content, acceptable use and limitations.',
    indexable: true,
    priority: 0.2,
    changefreq: 'yearly',
  },
];

export const NOT_FOUND_META: RouteMeta = {
  path: '/404',
  title: 'Page not found | CreatorKit',
  description: 'The page you were looking for does not exist.',
  indexable: false,
};

export function metaForPath(path: string): RouteMeta {
  const clean = path === '/' ? '/' : path.replace(/\/+$/, '');
  return ROUTES.find((r) => r.path === clean) ?? NOT_FOUND_META;
}
