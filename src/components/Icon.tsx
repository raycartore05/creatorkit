import type { IconName } from '../data/tools';

/** Small inline SVG icon set, drawn for CreatorKit (no icon library). */
const PATHS: Record<IconName | 'upload' | 'download' | 'copy' | 'reset' | 'check' | 'alert' | 'search' | 'info', string> = {
  resize: 'M4 9V4h5M20 15v5h-5M4 4l6 6M20 20l-6-6M14 4h6v6M10 20H4v-6',
  compress: 'M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7',
  crop: 'M6 2v14a2 2 0 0 0 2 2h14M18 22V8a2 2 0 0 0-2-2H2',
  qr: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM18 18h3v3h-3zM14 20h2M20 14h1',
  share: 'M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v14',
  text: 'M4 6h16M4 12h10M4 18h13',
  watermark: 'M12 3l7 7a7 7 0 1 1-14 0z',
  upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
  download: 'M12 4v12M7 11l5 5 5-5M4 20h16',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  reset: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5',
  check: 'M5 12l5 5 9-10',
  alert: 'M12 9v4M12 17h.01M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01',
};

export type AnyIcon = keyof typeof PATHS;

export function Icon({ name, className = 'h-5 w-5' }: { name: AnyIcon; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
