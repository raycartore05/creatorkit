import { useCallback, useState } from 'react';
import { LIMITS } from '../config/site';
import { fitWithin } from '../lib/compress';
import { exportImage } from '../lib/exportImage';
import { ACCEPT_ATTR, SUPPORTED_LABEL } from '../lib/fileCheck';
import { formatBytes, outputFileName } from '../lib/format';
import { downloadBlob, FORMAT_EXT, type OutputFormat } from '../lib/image';
import { CENTRED, computeDrawRect } from '../lib/layout';
import { drawWatermark, WM_DEFAULTS, type WatermarkSettings, type WmPosition } from '../lib/watermark';
import { Icon } from '../components/Icon';
import { OutputControls } from '../components/OutputControls';
import { PlacementEditor } from '../components/PlacementEditor';
import { useImageFile } from '../components/useImageFile';
import { Alert, ColorField, Dropzone, Slider, Toggle } from '../components/ui';

const GRID: { v: WmPosition; label: string }[] = [
  { v: 'tl', label: 'Top left' },
  { v: 'tc', label: 'Top centre' },
  { v: 'tr', label: 'Top right' },
  { v: 'ml', label: 'Middle left' },
  { v: 'mc', label: 'Centre' },
  { v: 'mr', label: 'Middle right' },
  { v: 'bl', label: 'Bottom left' },
  { v: 'bc', label: 'Bottom centre' },
  { v: 'br', label: 'Bottom right' },
];

export function Watermark() {
  const { image, error, busy, load, reset } = useImageFile();
  const [s, setS] = useState<WatermarkSettings>(WM_DEFAULTS);
  const [format, setFormat] = useState<OutputFormat>('image/jpeg');
  const [quality, setQuality] = useState(0.9);
  const [status, setStatus] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);
  const set = <K extends keyof WatermarkSettings>(k: K, v: WatermarkSettings[K]) => setS((p) => ({ ...p, [k]: v }));

  const draw = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => drawWatermark(ctx, w, h, s), [s]);

  if (!image) {
    return (
      <div className="space-y-3">
        <Dropzone onFile={load} accept={ACCEPT_ATTR} busy={busy} hint={`${SUPPORTED_LABEL}. Up to ${LIMITS.maxFileBytes / 1024 / 1024} MB.`} />
        {error && <Alert tone="bad">{error}</Alert>}
      </div>
    );
  }

  const areaScale = Math.min(1, Math.sqrt(LIMITS.maxOutputPixels / (image.width * image.height)));
  const out = fitWithin(image.width, image.height, Math.min(LIMITS.maxOutputSide, Math.floor(Math.max(image.width, image.height) * areaScale)));
  const scaledDown = out.width < image.width;
  const rect = computeDrawRect(image.width, image.height, out.width, out.height, 'contain', CENTRED);

  async function download() {
    if (!image) return;
    setStatus(null);
    try {
      const blob = await exportImage(image, {
        width: out.width,
        height: out.height,
        rect,
        format,
        quality,
        background: null,
        jpegBackground: '#ffffff',
        draw,
      });
      downloadBlob(blob, outputFileName(image.name, 'watermarked', FORMAT_EXT[format]));
      setStatus({ tone: 'ok', text: `Downloaded ${out.width} × ${out.height} ${FORMAT_EXT[format].toUpperCase()} (${formatBytes(blob.size)}).` });
    } catch (e) {
      setStatus({ tone: 'bad', text: e instanceof Error ? e.message : 'Export failed.' });
    }
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="panel p-4 sm:p-6">
        <PlacementEditor
          image={image}
          outW={out.width}
          outH={out.height}
          fit="contain"
          placement={CENTRED}
          onPlacement={() => undefined}
          background={null}
          extraDraw={draw}
          label={`Preview of ${image.name} with watermark`}
        />
        {scaledDown && <div className="mt-3"><Alert tone="info">Large image: the download is scaled to {out.width} × {out.height} so it can be processed reliably on all devices.</Alert></div>}
        {!s.text.trim() && <div className="mt-3"><Alert tone="warn">Type your watermark text to see it on the image.</Alert></div>}
      </div>
      <div className="space-y-5">
        <div className="panel space-y-5 p-4 sm:p-5">
          <div>
            <label htmlFor="wm-text" className="field-label">Watermark text</label>
            <input id="wm-text" className="input" maxLength={120} value={s.text} onChange={(e) => set('text', e.target.value)} />
          </div>
          <fieldset>
            <legend className="field-label">Position</legend>
            <div className="grid w-40 grid-cols-3 gap-1.5">
              {GRID.map((g) => (
                <label key={g.v} title={g.label} className={`flex h-11 cursor-pointer items-center justify-center rounded-md border ${s.position === g.v ? 'border-accent bg-accent' : 'border-line bg-surface hover:border-accent'}`}>
                  <input type="radio" name="wm-pos" className="sr-only" checked={s.position === g.v} onChange={() => set('position', g.v)} aria-label={g.label} />
                  <span className={`h-2 w-2 rounded-full ${s.position === g.v ? 'bg-white' : 'bg-muted/40'}`} aria-hidden="true" />
                </label>
              ))}
            </div>
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input type="radio" name="wm-pos" className="h-5 w-5" checked={s.position === 'tile'} onChange={() => set('position', 'tile')} />
              Repeat across the whole image (tiled)
            </label>
          </fieldset>
          <Slider label="Size" value={s.sizePct} min={1} max={25} step={0.5} onChange={(v) => set('sizePct', v)} format={(v) => `${v}%`} />
          <Slider label="Opacity" value={Math.round(s.opacity * 100)} min={5} max={100} onChange={(v) => set('opacity', v / 100)} format={(v) => `${v}%`} />
          <Slider label="Rotation" value={s.rotation} min={-90} max={90} onChange={(v) => set('rotation', v)} format={(v) => `${v}°`} />
          <ColorField label="Text colour" value={s.color} onChange={(v) => set('color', v)} />
          <div className="grid grid-cols-2 gap-2">
            <Toggle label="Shadow" checked={s.shadow} onChange={(v) => set('shadow', v)} />
            <Toggle label="Bold" checked={s.bold} onChange={(v) => set('bold', v)} />
          </div>
          <OutputControls format={format} onFormat={setFormat} quality={quality} onQuality={setQuality} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary flex-1" onClick={download} disabled={!s.text.trim()}>
            <Icon name="download" className="h-4 w-4" /> Download
          </button>
          <button type="button" className="btn-secondary" onClick={() => setS(WM_DEFAULTS)}>Reset settings</button>
          <button type="button" className="btn-quiet" onClick={() => { reset(); setStatus(null); }}>
            <Icon name="reset" className="h-4 w-4" /> New image
          </button>
        </div>
        {status && <Alert tone={status.tone} live>{status.text}</Alert>}
      </div>
    </div>
  );
}
