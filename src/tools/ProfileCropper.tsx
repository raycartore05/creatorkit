import { useEffect, useMemo, useRef, useState } from 'react';
import { LIMITS } from '../config/site';
import { presetById, PROFILE_PRESETS } from '../data/presets';
import { exportImage } from '../lib/exportImage';
import { ACCEPT_ATTR, SUPPORTED_LABEL } from '../lib/fileCheck';
import { formatBytes, outputFileName } from '../lib/format';
import { downloadBlob, drawImageOnto, FORMAT_EXT, type LoadedImage, type OutputFormat } from '../lib/image';
import { CENTRED, computeDrawRect, type DrawRect, type Placement } from '../lib/layout';
import { Icon } from '../components/Icon';
import { OutputControls } from '../components/OutputControls';
import { PlacementEditor } from '../components/PlacementEditor';
import { useImageFile } from '../components/useImageFile';
import { Alert, Dropzone, Select, Slider, Toggle } from '../components/ui';
import { trackToolUse } from '../lib/analytics';

function MiniPreview({ image, rect, out, size, circle }: { image: LoadedImage; rect: DrawRect; out: number; size: number; circle: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = c.height = Math.round(size * dpr);
    const s = c.width / out;
    drawImageOnto(ctx, image.source, {
      width: c.width,
      height: c.height,
      rect: { dx: rect.dx * s, dy: rect.dy * s, dw: rect.dw * s, dh: rect.dh * s },
      background: '#ffffff',
      circle,
    });
  }, [image, rect, out, size, circle]);
  return <canvas ref={ref} style={{ width: size, height: size }} aria-hidden="true" />;
}

export function ProfileCropper() {
  const { image, error, busy, load, reset } = useImageFile();
  const [presetId, setPresetId] = useState('pfp-800');
  const [placement, setPlacement] = useState<Placement>(CENTRED);
  const [circleFile, setCircleFile] = useState(false);
  const [format, setFormat] = useState<OutputFormat>('image/png');
  const [quality, setQuality] = useState(0.9);
  const [status, setStatus] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);

  const preset = presetById(PROFILE_PRESETS, presetId) ?? PROFILE_PRESETS[0]!;
  const isSquare = preset.width === preset.height;
  const { width: outW, height: outH } = preset;
  const circleOut = isSquare && circleFile;
  const effFormat: OutputFormat = circleOut && format === 'image/jpeg' ? 'image/png' : format;

  const rect = useMemo(
    () => (image ? computeDrawRect(image.width, image.height, outW, outH, 'cover', placement) : null),
    [image, outW, outH, placement],
  );

  async function download() {
    if (!image || !rect) return;
    setStatus(null);
    try {
      const blob = await exportImage(image, {
        width: outW,
        height: outH,
        rect,
        format: effFormat,
        quality,
        background: circleOut ? null : '#ffffff',
        jpegBackground: '#ffffff',
        circle: circleOut,
      });
      downloadBlob(blob, outputFileName(image.name, circleOut ? `circle-${outW}` : `${outW}x${outH}`, FORMAT_EXT[effFormat]));
      trackToolUse('profile-cropper', 'download', FORMAT_EXT[effFormat]);
      setStatus({ tone: 'ok', text: `Downloaded ${outW} × ${outH} ${FORMAT_EXT[effFormat].toUpperCase()} (${formatBytes(blob.size)}).` });
    } catch (e) {
      setStatus({ tone: 'bad', text: e instanceof Error ? e.message : 'Export failed.' });
    }
  }

  if (!image) {
    return (
      <div className="space-y-3">
        <Dropzone onFile={load} accept={ACCEPT_ATTR} busy={busy} hint={`${SUPPORTED_LABEL}. Up to ${LIMITS.maxFileBytes / 1024 / 1024} MB.`} />
        {error && <Alert tone="bad">{error}</Alert>}
      </div>
    );
  }

  const small = image.width < outW || image.height < outH;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="panel p-4 sm:p-6">
        {rect && (
          <PlacementEditor
            image={image}
            outW={outW}
            outH={outH}
            fit="cover"
            placement={placement}
            onPlacement={setPlacement}
            background="#ffffff"
            overlay={{ circle: isSquare }}
            maxPreview={isSquare ? 420 : 640}
            label={`Crop preview of ${image.name}`}
          />
        )}
        {isSquare && rect && (
          <div className="mt-5 flex flex-wrap items-end justify-center gap-6">
            {[120, 64, 40].map((s) => (
              <div key={s} className="text-center">
                <MiniPreview image={image} rect={rect} out={outW} size={s} circle />
                <p className="mt-1 text-xs text-muted">{s}px</p>
              </div>
            ))}
          </div>
        )}
        <p className="mt-4 text-sm text-muted">
          The circle and small previews show roughly how the picture looks in comments and feeds. Each platform crops and scales slightly differently, so check it after uploading.
        </p>
        {small && <Alert tone="warn">Your image is smaller than {outW} × {outH}, so it will be enlarged and may look soft.</Alert>}
      </div>

      <div className="space-y-5">
        <div className="panel space-y-5 p-4 sm:p-5">
          <Select label="Shape and size" value={presetId} onChange={(v) => { setPresetId(v); setPlacement(CENTRED); setStatus(null); }}>
            {PROFILE_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>{p.platform === 'Profile' ? p.label : `${p.platform} — ${p.label} (${p.width} × ${p.height})`}</option>
            ))}
          </Select>
          {preset.note && <p className="-mt-3 text-sm text-muted">{preset.note}</p>}
          <Slider label="Zoom" value={Math.round(placement.zoom * 100)} min={100} max={400} onChange={(v) => setPlacement({ ...placement, zoom: v / 100 })} format={(v) => `${v}%`} hint="Drag the preview, or use the arrow keys after clicking it, to position." />
          {isSquare && (
            <Toggle
              label="Download as a circle (transparent corners)"
              checked={circleFile}
              onChange={setCircleFile}
              hint="Most platforms want a square upload and add the circle themselves. Use this for slides, email signatures or websites."
            />
          )}
          <OutputControls format={format} onFormat={setFormat} quality={quality} onQuality={setQuality} />
          {circleOut && format === 'image/jpeg' && <p className="text-sm text-muted">Circle images are saved as PNG because JPEG cannot store transparent corners.</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary flex-1" onClick={download}>
            <Icon name="download" className="h-4 w-4" /> Download
          </button>
          <button type="button" className="btn-secondary" onClick={() => setPlacement(CENTRED)}>Re-centre</button>
          <button type="button" className="btn-quiet" onClick={() => { reset(); setPlacement(CENTRED); setStatus(null); }}>
            <Icon name="reset" className="h-4 w-4" /> Start again
          </button>
        </div>
        {status && <Alert tone={status.tone} live>{status.text}</Alert>}
      </div>
    </div>
  );
}
