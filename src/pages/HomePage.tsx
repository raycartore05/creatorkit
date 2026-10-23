import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdSlot } from '../components/AdSlot';
import { Icon } from '../components/Icon';
import { Seo } from '../components/Seo';
import { Faqs } from '../components/ToolPage';
import { filterTools } from '../data/tools';
import { websiteSchema } from '../lib/seo';
import { adsenseScriptEnabled } from '../config/site';

const FRAMES = [
  { r: '1:1', w: 64, h: 64, use: 'Square post' },
  { r: '4:5', w: 58, h: 72, use: 'Portrait' },
  { r: '9:16', w: 54, h: 96, use: 'Story' },
  { r: '16:9', w: 112, h: 63, use: 'Thumbnail' },
  { r: '1.91:1', w: 120, h: 63, use: 'Link preview' },
];

export function HomePage() {
  const [q, setQ] = useState('');
  const tools = filterTools(q);
  return (
    <>
      <Seo path="/" schemas={[websiteSchema()]} />
      <section className="border-b border-line bg-surface">
        <div className="wrap grid items-end gap-10 py-14 lg:grid-cols-[1.15fr_1fr] lg:py-20">
          <div>
            <p className="font-display text-lg font-semibold text-accent">Create. Resize. Share.</p>
            <h1 className="mt-3 text-4xl font-extrabold leading-[1.05] sm:text-6xl">Create better social content, faster.</h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              Seven free tools for the fiddly parts of posting: resizing and cropping images to platform sizes, compressing files, framing profile pictures, adding watermarks, making QR codes, drafting link previews and tidying captions. They run in your browser, with no account and no uploads.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/tools/image-resizer" className="btn-primary">Resize an image</Link>
              <a href="#tools" className="btn-secondary">See all tools</a>
            </div>
          </div>
          <figure aria-label="Common social media image shapes" className="flex flex-wrap items-end gap-x-5 gap-y-5 lg:flex-nowrap lg:justify-end">
            {FRAMES.map((f) => (
              <div key={f.r} className="text-center">
                <div className="cropmarks mx-auto flex items-center justify-center rounded-sm border border-accent/40 bg-accent-soft" style={{ width: f.w, height: f.h }}>
                  <span className="font-display text-sm font-semibold text-accent">{f.r}</span>
                </div>
                <p className="mt-2 text-xs text-muted">{f.use}</p>
              </div>
            ))}
          </figure>
        </div>
      </section>

      <section id="tools" className="wrap scroll-mt-4 py-14" aria-labelledby="tools-h">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="tools-h" className="text-3xl font-bold">Tools</h2>
          <div className="relative w-full sm:w-80">
            <label htmlFor="tool-search" className="sr-only">Find a tool</label>
            <Icon name="search" className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-muted" />
            <input id="tool-search" type="search" className="input pl-10" placeholder="Find a tool, e.g. thumbnail, kb, hashtag" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <p className="sr-only" aria-live="polite">{tools.length} tools shown</p>
        {tools.length === 0 ? (
          <div className="mt-6 panel p-6">
            <p>No tool matches “{q}”. Try a broader word like “image” or “text”.</p>
            <button type="button" className="btn-secondary mt-3" onClick={() => setQ('')}>Show all tools</button>
          </div>
        ) : (
          <ul className="mt-6 divide-y divide-line rounded-xl border border-line bg-surface">
            {tools.map((t) => (
              <li key={t.slug}>
                <Link to={t.path} className="group flex items-start gap-4 p-5 text-ink no-underline hover:bg-accent-soft sm:items-center">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line bg-paper text-accent group-hover:border-accent">
                    <Icon name={t.icon} className="h-6 w-6" />
                  </span>
                  <span className="flex-1">
                    <span className="block font-display text-lg font-semibold">{t.name}</span>
                    <span className="mt-0.5 block text-muted">{t.short}</span>
                  </span>
                  <span className="hidden text-sm font-semibold text-accent sm:block">Open</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-y border-line bg-surface" aria-labelledby="how-h">
        <div className="wrap py-14">
          <h2 id="how-h" className="text-3xl font-bold">How it works</h2>
          <ol className="mt-8 grid gap-8 md:grid-cols-3">
            {[
              ['Open a tool', 'No sign-up, no newsletter, no installation. Every tool works straight away on phones and computers.'],
              ['Add your image or text', 'Files are opened by your browser and processed on your device. They are not uploaded to CreatorKit.'],
              ['Check, then download or copy', 'Preview the result, adjust it, and save it. Nothing is kept once you close the page.'],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-4">
                <span className="font-display text-3xl font-bold text-accent" aria-hidden="true">{i + 1}</span>
                <div>
                  <h3 className="text-lg font-semibold">{t}</h3>
                  <p className="mt-1 text-muted">{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="wrap py-14" aria-labelledby="guide-h">
        <h2 id="guide-h" className="text-3xl font-bold">Quick guidance</h2>
        <div className="mt-8 grid gap-x-10 gap-y-8 md:grid-cols-2">
          <div>
            <h3 className="text-lg font-semibold">Image sizes</h3>
            <p className="mt-1 text-muted">
              Match the shape first, then the size. A 9:16 story image is very different from a 1.91:1 link preview, and uploading the wrong shape means the platform crops for you. Our <Link to="/guides/social-media-image-sizes">image sizes guide</Link> notes which sizes come from official help pages.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold">File formats</h3>
            <p className="mt-1 text-muted">
              JPEG for photos, PNG for screenshots, graphics with text and transparency, WebP when you want smaller files and the destination accepts it. When in doubt for uploads, JPEG is the most widely accepted.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Compression</h3>
            <p className="mt-1 text-muted">
              Reducing the dimensions usually saves more than lowering quality. For most social and web uses, 1080–2000 px wide at 80–85% quality looks sharp and loads quickly. See the <Link to="/tools/image-compressor">compressor</Link>.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Sharing links</h3>
            <p className="mt-1 text-muted">
              The image, title and description people see when you share a link come from Open Graph tags on the page. Set them once and every share looks intentional. Draft them with the <Link to="/tools/og-preview">sharing preview</Link>.
            </p>
          </div>
        </div>
      </section>

      <section className="wrap max-w-3xl pb-6" aria-labelledby="faq-h">
        <h2 id="faq-h" className="mb-5 text-3xl font-bold">Questions</h2>
        <Faqs
          items={[
            { q: 'Is CreatorKit free?', a: adsenseScriptEnabled
                ? 'Yes. All tools are free to use with no account. CreatorKit uses Google AdSense to cover running costs, so you may see clearly labelled ads; no tool ever requires clicking an ad.'
                : 'Yes. All tools are free to use with no account. CreatorKit may show clearly labelled ads in future to cover running costs; tools will never require clicking an ad.' },
            { q: 'Are my images uploaded?', a: adsenseScriptEnabled
                ? 'No. Image tools open and process files inside your browser, and your files are never sent anywhere. Your browser does load Google’s advertising code from Google, and loads an image from another site only if you choose “Show image” in the sharing preview tool.'
                : 'No. Image tools open and process files inside your browser. The only time your browser contacts another website is if you choose to load an image from a URL in the sharing preview tool.' },
            { q: 'Do I need to install anything?', a: 'No. CreatorKit works in current versions of Chrome, Edge, Safari and Firefox on phones and computers.' },
            { q: 'Is CreatorKit connected to Instagram, Facebook, TikTok or other platforms?', a: 'No. CreatorKit is independent and not affiliated with any platform. Platform names describe which image sizes a preset is meant for.' },
            { q: 'How do I report a problem or suggest a tool?', a: <>See the <Link to="/contact">contact page</Link>.</> },
          ]}
        />
      </section>
      <div className="wrap"><AdSlot /></div>
    </>
  );
}
