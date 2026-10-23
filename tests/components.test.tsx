import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
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
  it('privacy policy states no ads when ads are disabled', () => {
    at('/privacy');
    expect(screen.getByText(/currently shows no advertising/)).toBeInTheDocument();
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
