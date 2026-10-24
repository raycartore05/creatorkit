import { useEffect, useId, useState } from 'react';
import { checkFile } from './ogHelpers';
import { buildOgTags, checkHttpUrl, descriptionAdvice, displayDomain, imageRatioAdvice, titleAdvice, type LengthAdvice } from '../lib/og';
import { countGraphemes } from '../lib/text';
import { Icon } from '../components/Icon';
import { Alert, CopyButton } from '../components/ui';
import { trackToolUse } from '../lib/analytics';

const ADVICE_TONE: Record<LengthAdvice['level'], string> = {
  empty: 'text-muted',
  short: 'text-warn',
  good: 'text-ok',
  long: 'text-warn',
};

function Counter({ value, advice, target }: { value: string; advice: LengthAdvice; target: number }) {
  const n = countGraphemes(value);
  return (
    <p className={`field-hint ${ADVICE_TONE[advice.level]}`}>
      <span className="tabular-nums font-semibold">{n}</span>
      <span className="text-muted"> / ~{target}</span> — {advice.message}
    </p>
  );
}

const EMPTY = { title: '', description: '', url: '', imageUrl: '', siteName: '', imageAlt: '' };

export function OgPreview() {
  const [f, setF] = useState(EMPTY);
  const [shownImage, setShownImage] = useState<{ src: string; local: boolean } | null>(null);
  const [imgDims, setImgDims] = useState<{ w: number; h: number } | null>(null);
  const [imgError, setImgError] = useState<string | null>(null);
  const ids = { t: useId(), d: useId(), u: useId(), i: useId(), s: useId(), a: useId() };

  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }));

  useEffect(() => () => {
    if (shownImage?.local) URL.revokeObjectURL(shownImage.src);
  }, [shownImage]);

  const urlCheck = f.url ? checkHttpUrl(f.url) : null;
  const imgCheck = f.imageUrl ? checkHttpUrl(f.imageUrl) : null;
  const domain = displayDomain(f.url);
  const tags = buildOgTags(f);
  const title = f.title.trim() || 'Your page title';
  const desc = f.description.trim() || 'Your description appears here. Write one or two sentences that tell people what they will get.';

  async function onLocalFile(file: File) {
    setImgError(null);
    const err = await checkFile(file);
    if (err) {
      setImgError(err);
      return;
    }
    setImgDims(null);
    setShownImage({ src: URL.createObjectURL(file), local: true });
  }

  function loadRemote() {
    setImgError(null);
    if (!imgCheck?.ok) return;
    if (imgCheck.url.protocol !== 'https:') {
      setImgError('Use an https:// image URL. Many platforms and browsers block images served over http.');
      return;
    }
    setImgDims(null);
    setShownImage({ src: imgCheck.url.href, local: false });
  }

  const media = shownImage ? (
    <img
      src={shownImage.src}
      alt={f.imageAlt || 'Preview image'}
      referrerPolicy="no-referrer"
      className="h-full w-full object-cover"
      onLoad={(e) => setImgDims({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
      onError={() => {
        setImgError('The image could not be displayed. Check the URL opens an image directly, and that the server allows it to be shown on other sites.');
        setShownImage(null);
      }}
    />
  ) : (
    <div className="flex h-full w-full items-center justify-center bg-accent-soft text-sm text-muted">No image loaded</div>
  );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
      <form className="panel space-y-5 p-4 sm:p-6" onSubmit={(e) => e.preventDefault()} aria-label="Link details">
        <div>
          <label htmlFor={ids.t} className="field-label">Title (og:title)</label>
          <input id={ids.t} className="input" value={f.title} onChange={set('title')} placeholder="How to resize images for Instagram" />
          <Counter value={f.title} advice={titleAdvice(countGraphemes(f.title))} target={60} />
        </div>
        <div>
          <label htmlFor={ids.d} className="field-label">Description (og:description)</label>
          <textarea id={ids.d} className="input min-h-24" value={f.description} onChange={set('description')} placeholder="A short summary of the page." />
          <Counter value={f.description} advice={descriptionAdvice(countGraphemes(f.description))} target={160} />
        </div>
        <div>
          <label htmlFor={ids.u} className="field-label">Page URL (og:url)</label>
          <input id={ids.u} className="input" type="url" inputMode="url" value={f.url} onChange={set('url')} placeholder="https://example.com/blog/post" />
          {urlCheck && !urlCheck.ok && <p className="field-hint text-bad">{urlCheck.message}</p>}
        </div>
        <div>
          <label htmlFor={ids.s} className="field-label">Site name (optional)</label>
          <input id={ids.s} className="input" value={f.siteName} onChange={set('siteName')} placeholder="Example Studio" />
        </div>
        <div>
          <label htmlFor={ids.i} className="field-label">Image URL (og:image)</label>
          <div className="flex gap-2">
            <input id={ids.i} className="input" type="url" inputMode="url" value={f.imageUrl} onChange={set('imageUrl')} placeholder="https://example.com/share.jpg" />
            <button type="button" className="btn-secondary shrink-0" disabled={!imgCheck?.ok} onClick={loadRemote}>Show image</button>
          </div>
          {imgCheck && !imgCheck.ok && <p className="field-hint text-bad">{imgCheck.message}</p>}
          <p className="field-hint">
            “Show image” makes <em>your browser</em> request the picture directly from that website, which can see your IP address. CreatorKit never fetches or stores it. Or{' '}
            <label className="cursor-pointer text-accent underline">
              preview a file from your device
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (file) void onLocalFile(file); e.target.value = ''; }} />
            </label>{' '}
            instead.
          </p>
        </div>
        <div>
          <label htmlFor={ids.a} className="field-label">Image description (og:image:alt)</label>
          <input id={ids.a} className="input" value={f.imageAlt} onChange={set('imageAlt')} placeholder="Describe the image for screen-reader users" />
        </div>
        {imgError && <Alert tone="bad">{imgError}</Alert>}
        {imgDims && (
          <Alert tone="info">
            Image is {imgDims.w} × {imgDims.h}px. {imageRatioAdvice(imgDims.w, imgDims.h)}
            {imgDims.w < 600 && ' It is quite small; 1200 px wide is a common recommendation for sharp large cards.'}
          </Alert>
        )}
        <button type="button" className="btn-quiet" onClick={() => { setF(EMPTY); setShownImage(null); setImgDims(null); setImgError(null); }}>
          <Icon name="reset" className="h-4 w-4" /> Clear all fields
        </button>
      </form>

      <div className="space-y-6">
        <div>
          <h2 className="mb-2 font-sans text-sm font-semibold">Large image card (typical layout)</h2>
          <div className="overflow-hidden rounded-xl border border-line bg-surface" data-testid="card-large">
            <div className="aspect-[1.91/1] w-full overflow-hidden">{media}</div>
            <div className="border-t border-line bg-paper px-4 py-3">
              {domain && <p className="text-xs uppercase text-muted">{domain}</p>}
              <p className="mt-0.5 line-clamp-2 font-semibold leading-snug">{title}</p>
              <p className="mt-1 line-clamp-2 text-sm text-muted">{desc}</p>
            </div>
          </div>
        </div>
        <div>
          <h2 className="mb-2 font-sans text-sm font-semibold">Compact card (typical layout)</h2>
          <div className="flex overflow-hidden rounded-xl border border-line bg-surface" data-testid="card-compact">
            <div className="aspect-square w-28 shrink-0 overflow-hidden border-r border-line">{media}</div>
            <div className="min-w-0 px-3 py-2">
              <p className="line-clamp-2 font-semibold leading-snug">{title}</p>
              <p className="mt-1 line-clamp-2 text-sm text-muted">{desc}</p>
              {domain && <p className="mt-1 text-xs text-muted">{domain}</p>}
            </div>
          </div>
        </div>
        <Alert tone="info">
          These are illustrations, not screenshots of any platform. Each network decides its own layout, may crop the image, and caches previews. CreatorKit does not visit or inspect your page; it only shows what you typed.
        </Alert>
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="font-sans text-sm font-semibold">Meta tags for your page’s &lt;head&gt;</h2>
            <CopyButton text={tags} label="Copy tags" onCopied={() => trackToolUse('og-preview', 'copy_tags')} />
          </div>
          <pre className="max-h-80 overflow-auto rounded-xl border border-line bg-ink p-4 text-xs leading-relaxed text-white" data-testid="og-tags"><code>{tags || '<!-- Fill in the form to generate tags -->'}</code></pre>
        </div>
      </div>
    </div>
  );
}
