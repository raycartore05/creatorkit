import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { within } from '@testing-library/react';
import App from '../src/App';
import { CaptionFormatter } from '../src/tools/CaptionFormatter';
import { OgPreview } from '../src/tools/OgPreview';
import { QrGenerator } from '../src/tools/QrGenerator';

function at(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('caption formatter', () => {
  it('counts, cleans and moves hashtags', async () => {
    const user = userEvent.setup();
    render(<CaptionFormatter />);
    const area = screen.getByLabelText('Your caption or post');
    await user.type(area, 'Hello   world #nz #NZ');
    expect(screen.getByTestId('stat-characters')).toHaveTextContent('21');
    expect(screen.getByTestId('stat-words')).toHaveTextContent('4');
    expect(screen.getByText(/repeated hashtag/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clean up spacing' }));
    expect(area).toHaveValue('Hello world #nz #NZ');
    await user.click(screen.getByRole('button', { name: 'Move hashtags to end' }));
    expect(area).toHaveValue('Hello world\n\n#nz');
  });
  it('flags captions over the limit', async () => {
    const user = userEvent.setup();
    render(<CaptionFormatter />);
    const limit = screen.getByLabelText('Character limit to check against');
    await user.clear(limit);
    await user.type(limit, '5');
    await user.type(screen.getByLabelText('Your caption or post'), 'abcdefg');
    expect(screen.getByText(/2 over your 5 limit/)).toBeInTheDocument();
  });
  it('cleans hashtag lists and clears', async () => {
    const user = userEvent.setup();
    render(<CaptionFormatter />);
    await user.type(screen.getByLabelText('Words or hashtags'), 'travel, road trip, #Travel');
    expect(screen.getByTestId('hashtag-output')).toHaveTextContent('#travel #roadTrip');
  });
});

describe('QR generator', () => {
  it('shows a validation error for an invalid URL and no download', async () => {
    const user = userEvent.setup();
    render(<QrGenerator />);
    await user.type(screen.getByLabelText('URL'), 'not-a-url');
    expect(await screen.findByText(/full URL/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /PNG/ })).toBeDisabled();
  });
  it('generates a code for a valid URL and resets', async () => {
    const user = userEvent.setup();
    render(<QrGenerator />);
    await user.type(screen.getByLabelText('URL'), 'https://example.com');
    // jsdom has no canvas; the library falls back or errors. Accept either a
    // rendered image or a handled error, but never an unhandled crash.
    await waitFor(() => {
      const ok = screen.queryByTestId('qr-image');
      const err = screen.queryByText(/could not be generated/);
      expect(ok || err).toBeTruthy();
    });
    await user.click(screen.getByRole('button', { name: /Reset/ }));
    expect(screen.getByLabelText('URL')).toHaveValue('');
  });
});

describe('OG preview', () => {
  it('updates the card and escapes generated tags', async () => {
    const user = userEvent.setup();
    render(<OgPreview />);
    await user.type(screen.getByLabelText('Title (og:title)'), 'My <b>post</b> "x"');
    await user.type(screen.getByLabelText('Page URL (og:url)'), 'https://www.example.com/a');
    expect(screen.getByTestId('card-large')).toHaveTextContent('My <b>post</b> "x"');
    expect(screen.getByTestId('card-large')).toHaveTextContent('example.com');
    expect(screen.getByTestId('og-tags').textContent).toContain('My &lt;b&gt;post&lt;/b&gt; &quot;x&quot;');
    // No element was injected from user text
    expect(screen.getByTestId('card-large').querySelector('b')).toBeNull();
  });
  it('rejects non-http image URLs', async () => {
    const user = userEvent.setup();
    render(<OgPreview />);
    await user.type(screen.getByLabelText('Image URL (og:image)'), 'javascript:alert(1)');
    expect(screen.getByText(/Only http/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show image' })).toBeDisabled();
  });
});

describe('routing and pages', () => {
  it('renders the homepage with all tools and filters them', async () => {
    const user = userEvent.setup();
    at('/');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Create better social content, faster.');
    expect(screen.getAllByRole('link', { name: /Image Resizer/ }).length).toBeGreaterThan(0);
    await user.type(screen.getByLabelText('Find a tool'), 'hashtag');
    expect(screen.getByText('1 tools shown')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Find a tool'));
    await user.type(screen.getByLabelText('Find a tool'), 'qwerty');
    expect(screen.getByText(/No tool matches/)).toBeInTheDocument();
  });
  it.each([
    ['/tools/image-resizer', 'Social Media Image Resizer'],
    ['/tools/image-compressor', 'Image Compressor'],
    ['/tools/profile-cropper', 'Profile Picture & Cover Cropper'],
    ['/tools/qr-code-generator', 'QR Code Generator'],
    ['/tools/og-preview', 'Social Sharing Preview'],
    ['/tools/caption-formatter', 'Caption & Text Formatter'],
    ['/tools/watermark', 'Image Watermark Tool'],
    ['/privacy', 'Privacy policy'],
    ['/terms', 'Terms of use'],
    ['/about', 'About CreatorKit'],
    ['/contact', 'Contact'],
    ['/guides/social-media-image-sizes', 'Social media image sizes'],
  ])('%s renders a single h1', (path, h1) => {
    at(path);
    const hs = screen.getAllByRole('heading', { level: 1 });
    expect(hs).toHaveLength(1);
    expect(hs[0]).toHaveTextContent(h1);
  });
  it('unknown routes show the 404 page', () => {
    at('/does-not-exist');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('off the canvas');
  });
  it('privacy policy discloses Google advertising and cookies', () => {
    at('/privacy');
    // Default build includes the AdSense script, so the policy must disclose Google advertising.
    expect(screen.getByRole('heading', { name: 'Advertising' })).toBeInTheDocument();
    expect(screen.getByText(/CreatorKit uses Google AdSense to show advertising/)).toBeInTheDocument();
    expect(screen.getByText(/Google and other third-party vendors use cookies/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Google Ads Settings' })).toHaveAttribute('href', 'https://adssettings.google.com/');
    expect(screen.queryByText(/does not set cookies and does not use/)).toBeNull();
  });
  it('contact page shows the support email as a mailto link', () => {
    at('/contact');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Contact CreatorKit Support');
    const link = screen.getByTestId('support-email');
    expect(link).toHaveAttribute('href', 'mailto:creatorkit-support@rayore.co.nz');
    expect(link).toHaveTextContent('creatorkit-support@rayore.co.nz');
    expect(screen.queryByTestId('contact-missing')).toBeNull();
    expect(screen.getByText(/accessibility barriers/)).toBeInTheDocument();
  });
  it('footer shows the support email on tool pages', () => {
    at('/tools/image-resizer');
    expect(screen.getByTestId('footer-email')).toHaveAttribute('href', 'mailto:creatorkit-support@rayore.co.nz');
  });
  it('privacy policy explains what is shared when emailing support', () => {
    at('/privacy');
    expect(screen.getByText(/Contacting us is optional/)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'creatorkit-support@rayore.co.nz' }).length).toBeGreaterThan(0);
  });
  it('image tools show an upload prompt before a file is chosen', () => {
    at('/tools/image-resizer');
    expect(screen.getByText('Choose an image')).toBeInTheDocument();
  });
});

const NAV = [
  ['Resize', '/tools/image-resizer'],
  ['Compress', '/tools/image-compressor'],
  ['Crop', '/tools/profile-cropper'],
  ['QR Code', '/tools/qr-code-generator'],
  ['Social Preview', '/tools/og-preview'],
  ['Captions', '/tools/caption-formatter'],
  ['Watermark', '/tools/watermark'],
] as const;
const PAYPAL = 'https://paypal.me/RaycartOre';

describe('header navigation', () => {
  it('has a dedicated link for each of the seven tools plus All Tools, with no duplicates', () => {
    at('/');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((l) => [l.textContent, l.getAttribute('href')])).toEqual([...NAV, ['All Tools', '/#tools']]);
    expect(new Set(links.map((l) => l.getAttribute('href'))).size).toBe(links.length);
  });
  it('logo links to the homepage', () => {
    at('/tools/watermark');
    const logos = screen.getAllByRole('link', { name: 'CreatorKit home' });
    for (const l of logos) expect(l).toHaveAttribute('href', '/');
  });
  it.each(NAV)('marks %s as the current page on its route', (label, path) => {
    at(path);
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page');
    const others = within(nav).getAllByRole('link').filter((l) => l.textContent !== label);
    for (const o of others) expect(o).not.toHaveAttribute('aria-current');
  });
  it('navigates client-side when a tool link is clicked', async () => {
    const user = userEvent.setup();
    at('/');
    await user.click(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name: 'Captions' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Caption & Text Formatter');
  });
});

describe('mobile menu', () => {
  it('opens, lists every tool and All Tools, and reports its state', async () => {
    const user = userEvent.setup();
    at('/');
    const btn = screen.getByRole('button', { name: 'Menu' });
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('navigation', { name: 'Mobile' })).toBeNull();
    await user.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'true');
    expect(btn).toHaveAccessibleName('Close menu');
    const menu = screen.getByRole('navigation', { name: 'Mobile' });
    const hrefs = within(menu).getAllByRole('link').map((l) => l.getAttribute('href'));
    for (const [, path] of NAV) expect(hrefs).toContain(path);
    expect(hrefs).toContain('/#tools');
    expect(hrefs).toContain('/guides/social-media-image-sizes');
  });
  it('closes with Escape and returns focus to the button', async () => {
    const user = userEvent.setup();
    at('/');
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('navigation', { name: 'Mobile' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveFocus();
  });
  it('closes after choosing a destination, including the current page', async () => {
    const user = userEvent.setup();
    at('/tools/watermark');
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    await user.click(within(screen.getByRole('navigation', { name: 'Mobile' })).getByRole('link', { name: /Watermark/ }));
    expect(screen.queryByRole('navigation', { name: 'Mobile' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    await user.click(within(screen.getByRole('navigation', { name: 'Mobile' })).getByRole('link', { name: /Compress/ }));
    expect(screen.queryByRole('navigation', { name: 'Mobile' })).toBeNull();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Image Compressor');
  });
});

describe('voluntary PayPal support', () => {
  it('footer link uses the exact PayPal.Me URL and safe new-tab attributes', () => {
    at('/tools/image-resizer');
    const link = screen.getByTestId('footer-support');
    expect(link).toHaveAttribute('href', PAYPAL);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveAccessibleName('Support CreatorKit (PayPal, opens in a new tab)');
  });
  it('About page has an optional support section with the PayPal button', () => {
    at('/about');
    const section = screen.getByTestId('about-support');
    expect(within(section).getByRole('heading', { name: 'Support CreatorKit' })).toBeInTheDocument();
    expect(section).toHaveTextContent('entirely voluntary');
    expect(section).toHaveTextContent('remain free to use, whether or not you contribute');
    const btn = within(section).getByRole('link', { name: /Support CreatorKit on PayPal/ });
    expect(btn).toHaveAttribute('href', PAYPAL);
    expect(btn).toHaveAttribute('target', '_blank');
    expect(btn).toHaveAttribute('rel', 'noopener noreferrer');
  });
  it('support links appear only in the footer and About page, never as a dialog or on tool content', () => {
    at('/tools/qr-code-generator');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.querySelectorAll(`a[href="${PAYPAL}"]`)).toHaveLength(1);
    expect(screen.getByRole('main').querySelector(`a[href="${PAYPAL}"]`)).toBeNull();
  });
  it('privacy policy explains the PayPal link without claiming to collect payment details', () => {
    at('/privacy');
    expect(screen.getByRole('heading', { name: 'Optional support through PayPal' })).toBeInTheDocument();
    expect(screen.getByText(/does not receive your card or bank details/)).toBeInTheDocument();
  });
  it('adds no payment SDK dependency', () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    expect(deps.filter((d) => /paypal|braintree|stripe/i.test(d))).toEqual([]);
  });
});

describe('support email unchanged', () => {
  it('contact page and footer still use the support address', () => {
    at('/contact');
    expect(screen.getByTestId('support-email')).toHaveAttribute('href', 'mailto:creatorkit-support@rayore.co.nz');
    expect(screen.getByTestId('footer-email')).toHaveAttribute('href', 'mailto:creatorkit-support@rayore.co.nz');
  });
});

describe('AdSense head tags', () => {
  it('adds the exact AdSense snippet and account meta to content pages only', async () => {
    const { buildHeadTags } = await import('../src/lib/seo');
    const { metaForPath, NOT_FOUND_META } = await import('../src/data/routes');
    const snippet = '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8644589635574920" crossorigin="anonymous"></script>';
    const home = buildHeadTags(metaForPath('/'));
    expect(home.split(snippet)).toHaveLength(2);
    expect(home).toContain('<meta name="google-adsense-account" content="ca-pub-8644589635574920" />');
    expect(buildHeadTags(NOT_FOUND_META)).not.toContain('adsbygoogle');
  });
  it('does not render ad units without a configured slot ID', () => {
    at('/tools/image-resizer');
    expect(document.querySelector('ins.adsbygoogle')).toBeNull();
  });
});

describe('Google Analytics', () => {
  const GA = 'G-WPEHRBK1Q4';
  const GTAG = `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA}"></script>`;
  const INIT = '<script src="/ga-init.js"></script>';

  it('head tags: ga-init.js, then gtag.js, then AdSense, once each, content pages only', async () => {
    const { buildHeadTags } = await import('../src/lib/seo');
    const { metaForPath, NOT_FOUND_META } = await import('../src/data/routes');
    for (const path of ['/', '/tools/image-resizer', '/privacy']) {
      const head = buildHeadTags(metaForPath(path));
      expect(head.split(GTAG)).toHaveLength(2);
      expect(head.split(INIT)).toHaveLength(2);
      expect(head.indexOf(INIT)).toBeLessThan(head.indexOf(GTAG));
      expect(head.indexOf(GTAG)).toBeLessThan(head.indexOf('adsbygoogle.js'));
    }
    const nf = buildHeadTags(NOT_FOUND_META);
    expect(nf).not.toContain('googletagmanager');
    expect(nf).not.toContain('ga-init');
  });

  it('ga-init.js sets EEA/UK/CH consent defaults before config and never sends page_view itself', async () => {
    const { gaInitScript } = await import('../src/lib/analytics');
    const js = gaInitScript(GA);
    expect(js.indexOf("gtag('consent', 'default'")).toBeGreaterThan(-1);
    expect(js.indexOf("gtag('consent', 'default'")).toBeLessThan(js.indexOf(`gtag('config', '${GA}')`));
    expect(js).toContain('"analytics_storage":"denied"');
    expect(js).toContain('"ad_user_data":"denied"');
    expect(js).not.toMatch(/page_view|send_page_view/);
    // Only Google's consent message may record a visitor's choice.
    expect(js).not.toMatch(/['"]update['"]/);
    // Runs as-is and records commands in order.
    const w: { dataLayer?: unknown[]; gtag?: unknown } = {};
    new Function('window', 'dataLayer', `${js.replace('window.dataLayer = window.dataLayer || [];', '')}`)(w, (w.dataLayer = []));
    const calls = (w.dataLayer as ArrayLike<unknown>[]).map((a) => Array.from(a));
    expect(calls.map((c) => c[0])).toEqual(['consent', 'js', 'config']);
    expect(calls[2]).toEqual(['config', GA]);
    expect(() => gaInitScript('UA-1234-1')).toThrow();
  });

  it('trackToolUse sends only fixed parameters and is a no-op without gtag', async () => {
    const { trackToolUse } = await import('../src/lib/analytics');
    delete window.gtag;
    expect(() => trackToolUse('image-resizer', 'download', 'png')).not.toThrow();
    const calls: unknown[][] = [];
    window.gtag = (...args: unknown[]) => calls.push(args);
    trackToolUse('image-resizer', 'download', 'png');
    trackToolUse('watermark', 'download', 'my-photo.png');
    trackToolUse('caption-formatter', 'copy_caption');
    expect(calls).toEqual([
      ['event', 'image_resizer_used', { tool_name: 'image_resizer', action_type: 'download', output_format: 'png' }],
      ['event', 'watermark_tool_used', { tool_name: 'watermark', action_type: 'download' }],
      ['event', 'caption_formatter_used', { tool_name: 'caption_formatter', action_type: 'copy_caption' }],
    ]);
    window.gtag = () => {
      throw new Error('blocked');
    };
    expect(() => trackToolUse('og-preview', 'copy_tags')).not.toThrow();
    delete window.gtag;
  });

  it('a failed copy does not count as tool usage', async () => {
    const { CopyButton } = await import('../src/components/ui');
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) }, configurable: true });
    const prevExec = document.execCommand;
    document.execCommand = () => false;
    let copied = 0;
    render(<CopyButton text="hello" onCopied={() => (copied += 1)} />);
    await user.click(screen.getByRole('button'));
    await screen.findByText(/Copy failed/);
    expect(copied).toBe(0);
    document.execCommand = prevExec;
  });

  it('privacy policy discloses Google Analytics, Cloudflare Web Analytics, consent and what tools send', () => {
    at('/privacy');
    expect(screen.getByRole('heading', { name: 'Analytics' })).toBeInTheDocument();
    expect(screen.getByText(/CreatorKit uses Google Analytics to understand/)).toBeInTheDocument();
    expect(screen.getByText(/It never sends your images, file names, or the text/)).toBeInTheDocument();
    expect(screen.getByText(/does not set or read cookies unless you agree in Google’s consent message/)).toBeInTheDocument();
    expect(screen.getByText(/Cloudflare Web Analytics to count page views/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Google Analytics opt-out browser add-on' })).toHaveAttribute('href', 'https://tools.google.com/dlpage/gaoptout');
    expect(screen.queryByText(/does not use analytics scripts/)).toBeNull();
    expect(screen.queryByText(/does not track whether you follow the link/)).toBeNull();
    // The advertising paragraph appears once (it used to be duplicated).
    const main = screen.getByRole('main').textContent ?? '';
    expect(main.split('Google and other third-party vendors use cookies to serve ads').length).toBe(2);
  });
});
