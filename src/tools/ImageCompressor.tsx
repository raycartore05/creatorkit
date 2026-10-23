import { useEffect, useState } from 'react';
import { LIMITS } from '../config/site';
import { encodeToTarget, fitWithin } from '../lib/compress';
import { ACCEPT_ATTR } from '../lib/fileCheck';
import { formatBytes, outputFileName, reductionPercent } from '../lib/format';
import { canEncodeWebp, canvasToBlob, createCanvas, downloadBlob, FORMAT_EXT, type OutputFormat } from '../lib/image';
import { Icon } from '../components/Icon';
import { useImageFile } from '../components/useImageFile';
import { Alert, ColorField, Dropzone, NumberField, Segmented, Select, Slider } from '../components/ui';

interface Result {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  format: OutputFormat;
  quality: number | null;
  fits?: boolean;
}

export function ImageCompressor() {
  const { image, error, busy, load, reset } = useImageFile();
  const [format, setFormat] = useState<OutputFormat>('image/jpeg');
  const [mode, setMode] = useState<'quality' | 'target'>('quality');
  const [quality, setQuality] = useState(0.8);
  const [targetKb, setTargetKb] = useState('200');
  const [maxSide, setMaxSide] = useState('');
  const [bg, setBg] = useState('#ffffff');
  const [result, setResult] = useState<Result | null>(null);
  const [working, setWorking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [webp, setWebp] = useState(true);

  useEffect(() => setWebp(canEncodeWebp()), []);
  // Default the output format to match the upload (PNG stays PNG, etc.).
  useEffect(() => {
    if (!image) return;
    setFormat(image.kind === 'png' ? 'image/png' : image.kind === 'webp' && canEncodeWebp() ? 'image/webp' : 'image/jpeg');
    setResult(null);
  }, [image]);
  useEffect(() => () => {
    if (result) URL.revokeObjectURL(result.url);
  }, [result]);

  const lossy = format !== 'image/png';

  async function compress() {
    if (!image) return;
    setWorking(true);
    setProblem(null);
    try {
      const ms = Number(maxSide);
      if (maxSide && (!Number.isInteger(ms) || ms < 16 || ms > LIMITS.maxOutputSide)) {
        throw new Error(`Maximum width/height must be a whole number from 16 to ${LIMITS.maxOutputSide}.`);
      }
      const dims = fitWithin(image.width, image.height, maxSide ? ms : 0);
      if (dims.width * dims.height > LIMITS.maxOutputPixels) {
        throw new Error(`This image is ${(dims.width * dims.height / 1e6).toFixed(1)} MP. Set a maximum width/height (for example 4000) so it can be processed reliably.`);
      }
      const canvas = createCanvas(dims.width, dims.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas is not available in this browser.');
      if (format === 'image/jpeg') {
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, dims.width, dims.height);
      }
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(image.source, 0, 0, dims.width, dims.height);

      let blob: Blob;
      let q: number | null = lossy ? quality : null;
      let fits: boolean | undefined;
      if (lossy && mode === 'target') {
        const kb = Number(targetKb);
        if (!(kb >= 5 && kb <= 50_000)) throw new Error('Enter a target size between 5 KB and 50,000 KB.');
        const r = await encodeToTarget(canvas, format as 'image/jpeg' | 'image/webp', kb * 1024);
        blob = r.blob;
        q = r.quality;
        fits = r.fits;
      } else {
        blob = await canvasToBlob(canvas, format, quality);
      }
      setResult({ blob, url: URL.createObjectURL(blob), width: dims.width, height: dims.height, format, quality: q, fits });
    } catch (e) {
      setProblem(e instanceof Error ? e.message : 'Compression failed.');
    } finally {
      setWorking(false);
    }
  }

  if (!image) {
    return (
      <div className="space-y-3">
        <Dropzone onFile={load} accept={ACCEPT_ATTR} busy={busy} hint={`JPEG, PNG or WebP (GIF first frame also works). Up to ${LIMITS.maxFileBytes / 1024 / 1024} MB.`} />
        {error && <Alert tone="bad">{error}</Alert>}
      </div>
    );
  }

  const pct = result ? reductionPercent(image.size, result.blob.size) : null;
  const bigger = pct !== null && pct <= 0;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="panel p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <figure>
            <div className="checker flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-line">
              <img src={image.url} alt="Original upload" className="max-h-full max-w-full object-contain" />
            </div>
            <figcaption className="mt-2 text-sm">
              <strong>Before:</strong> {image.width} × {image.height}, {formatBytes(image.size)}
            </figcaption>
          </figure>
          <figure>
            <div className="checker flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-line">
              {result ? (
                <img src={result.url} alt="Compressed result" className="max-h-full max-w-full object-contain" />
              ) : (
                <p className="p-6 text-center text-sm text-muted">Choose settings, then press Compress to see the result here.</p>
              )}
            </div>
            <figcaption className="mt-2 text-sm" data-testid="after-caption">
              <strong>After{result ? ':' : ''}</strong>
              {result ? ` ${result.width} × ${result.height}, ${formatBytes(result.blob.size)}` : ''}
            </figcaption>
          </figure>
        </div>
        {result && (
          <div className="mt-4 space-y-2" aria-live="polite">
            {bigger ? (
              <Alert tone="warn">
                The new file is {formatBytes(result.blob.size)}, which is <strong>not smaller</strong> than your original ({formatBytes(image.size)}). Your original is already well optimised for these settings. Try a lower quality, WebP, or a smaller maximum size, or just keep the original.
              </Alert>
            ) : (
              <Alert tone="ok">
                <span data-testid="saving">
                  {formatBytes(image.size)} → {formatBytes(result.blob.size)}: {pct}% smaller
                </span>
                {result.quality !== null && ` at ${Math.round(result.quality * 100)}% quality`}.
              </Alert>
            )}
            {result.fits === false && (
              <Alert tone="warn">Even at the lowest quality the file is above {targetKb} KB. Reduce the maximum width/height to get it smaller.</Alert>
            )}
            {image.kind === 'png' && result.format === 'image/png' && (
              <Alert tone="info">PNG is lossless, so re-saving it rarely saves much. For photos, WebP or JPEG usually gives far smaller files. Reducing the dimensions also helps.</Alert>
            )}
          </div>
        )}
      </div>

      <div className="space-y-5">
        <div className="panel space-y-5 p-4 sm:p-5">
          <Select label="Output format" value={format} onChange={(v) => { setFormat(v as OutputFormat); setResult(null); }}>
            <option value="image/jpeg">JPEG — photos, no transparency</option>
            <option value="image/webp" disabled={!webp}>WebP — small, keeps transparency{webp ? '' : ' (not supported here)'}</option>
            <option value="image/png">PNG — lossless</option>
          </Select>
          {lossy && (
            <Segmented
              label="Compress by"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'quality', label: 'Quality' },
                { value: 'target', label: 'Target size' },
              ]}
            />
          )}
          {lossy && mode === 'quality' && (
            <Slider label="Quality" value={Math.round(quality * 100)} min={10} max={100} onChange={(v) => setQuality(v / 100)} format={(v) => `${v}%`} hint="Lower = smaller file, more visible artefacts." />
          )}
          {lossy && mode === 'target' && (
            <NumberField label="Target size" value={targetKb} onChange={setTargetKb} min={5} suffix="KB" />
          )}
          <NumberField label="Maximum width or height (optional)" value={maxSide} onChange={setMaxSide} min={16} max={LIMITS.maxOutputSide} suffix="px" />
          {format === 'image/jpeg' && image.hasAlpha && <ColorField label="Fill transparent areas with" value={bg} onChange={setBg} />}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary flex-1" onClick={compress} disabled={working}>
            {working ? 'Compressing…' : 'Compress'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={!result}
            onClick={() => result && downloadBlob(result.blob, outputFileName(image.name, 'compressed', FORMAT_EXT[result.format]))}
          >
            <Icon name="download" className="h-4 w-4" /> Download
          </button>
          <button type="button" className="btn-quiet" onClick={() => { reset(); setResult(null); }}>
            <Icon name="reset" className="h-4 w-4" /> Start again
          </button>
        </div>
        {problem && <Alert tone="bad">{problem}</Alert>}
      </div>
    </div>
  );
}
