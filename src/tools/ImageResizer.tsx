import { useMemo, useState } from 'react';
import { LIMITS } from '../config/site';
import { groupByPlatform, presetById, SOCIAL_PRESETS } from '../data/presets';
import { exportImage } from '../lib/exportImage';
import { ACCEPT_ATTR, SUPPORTED_LABEL } from '../lib/fileCheck';
import { aspectLabel, formatBytes, outputFileName } from '../lib/format';
import { downloadBlob, FORMAT_EXT, type OutputFormat } from '../lib/image';
import { CENTRED, computeDrawRect, croppedFraction, hasPadding, validateDimensions, type FitMode, type Placement } from '../lib/layout';
import { Icon } from '../components/Icon';
import { OutputControls } from '../components/OutputControls';
import { PlacementEditor } from '../components/PlacementEditor';
import { useImageFile } from '../components/useImageFile';
import { Alert, ColorField, Dropzone, NumberField, Segmented, Select, Slider } from '../components/ui';

export function ImageResizer() {
  const { image, error, busy, load, reset } = useImageFile();
  const [presetId, setPresetId] = useState('ig-square');
  const [customW, setCustomW] = useState('1200');
  const [customH, setCustomH] = useState('800');
  const [lockToSource, setLockToSource] = useState(false);
  const [fit, setFit] = useState<FitMode>('cover');
  const [placement, setPlacement] = useState<Placement>(CENTRED);
  const [bgMode, setBgMode] = useState<'color' | 'transparent'>('color');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [format, setFormat] = useState<OutputFormat>('image/jpeg');
  const [quality, setQuality] = useState(0.9);
  const [status, setStatus] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);
  const [exporting, setExporting] = useState(false);

  const preset = presetById(SOCIAL_PRESETS, presetId);
  const isCustom = presetId === 'custom';

  let outW = preset?.width ?? 0;
  let outH = preset?.height ?? 0;
  if (isCustom) {
    outW = Number(customW);
    if (lockToSource && image) {
      outH = Math.max(1, Math.round((outW * image.height) / image.width));
    } else {
      outH = Number(customH);
    }
  }
  const dimError = validateDimensions(outW, outH, LIMITS.maxOutputSide, LIMITS.maxOutputPixels);

  const rect = useMemo(
    () => (image && !dimError ? computeDrawRect(image.width, image.height, outW, outH, fit, placement) : null),
    [image, dimError, outW, outH, fit, placement],
  );
  const lost = rect ? croppedFraction(rect, outW, outH) : 0;
  const padded = rect ? hasPadding(rect, outW, outH) : false;
  const background = bgMode === 'transparent' && format !== 'image/jpeg' ? null : bgColor;
  const upscale = image && rect ? rect.dw / image.width > 1.05 : false;

  function changePreset(id: string) {
    setPresetId(id);
    setPlacement(CENTRED);
    setStatus(null);
  }

  async function download() {
    if (!image || !rect) return;
    setExporting(true);
    setStatus(null);
    try {
      const blob = await exportImage(image, {
        width: outW,
        height: outH,
        rect,
        format,
        quality,
        background,
        jpegBackground: bgColor,
      });
      downloadBlob(blob, outputFileName(image.name, `${outW}x${outH}`, FORMAT_EXT[format]));
      setStatus({ tone: 'ok', text: `Downloaded a ${outW} × ${outH} ${FORMAT_EXT[format].toUpperCase()} (${formatBytes(blob.size)}).` });
    } catch (e) {
      setStatus({ tone: 'bad', text: e instanceof Error ? e.message : 'Export failed.' });
    } finally {
      setExporting(false);
    }
  }

  function startOver() {
    reset();
    setPlacement(CENTRED);
    setStatus(null);
  }

  if (!image) {
    return (
      <div className="space-y-3">
        <Dropzone onFile={load} accept={ACCEPT_ATTR} busy={busy} hint={`${SUPPORTED_LABEL}. Up to ${LIMITS.maxFileBytes / 1024 / 1024} MB.`} />
        {error && <Alert tone="bad">{error}</Alert>}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="panel p-4 sm:p-6">
        {rect ? (
          <PlacementEditor
            image={image}
            outW={outW}
            outH={outH}
            fit={fit}
            placement={placement}
            onPlacement={setPlacement}
            background={background}
            label={`Preview of ${image.name} resized to ${outW} by ${outH}`}
          />
        ) : (
          <Alert tone="bad">{dimError}</Alert>
        )}
        <div className="mt-4 space-y-2" aria-live="polite">
          {lost > 0.005 && (
            <Alert tone="warn">
              About {Math.round(lost * 100)}% of your image is outside the frame and will be cut off. Drag the preview to choose what stays, or switch to <strong>Fit</strong> to keep the whole image.
            </Alert>
          )}
          {padded && (
            <Alert tone="info">
              The image does not fill the frame, so the empty area is filled with {background ? 'your background colour' : 'transparency'}.
            </Alert>
          )}
          {image.hasAlpha && format === 'image/jpeg' && (
            <Alert tone="info">This image has transparent areas. JPEG cannot store transparency, so they will be filled with {bgColor.toUpperCase()}. Choose PNG or WebP to keep them.</Alert>
          )}
          {upscale && (
            <Alert tone="warn">The output is larger than your original in this area, so it is being enlarged and may look soft. A higher-resolution original will look sharper.</Alert>
          )}
        </div>
      </div>

      <div className="space-y-5">
        <div className="panel space-y-5 p-4 sm:p-5">
          <Select label="Size" value={presetId} onChange={changePreset}>
            {groupByPlatform(SOCIAL_PRESETS).map(([platform, list]) => (
              <optgroup key={platform} label={platform}>
                {list.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label} — {p.width} × {p.height}
                  </option>
                ))}
              </optgroup>
            ))}
            <option value="custom">Custom size…</option>
          </Select>
          {preset && (
            <p className="-mt-3 text-sm text-muted">
              Shape {aspectLabel(preset.width, preset.height)}.{' '}
              {preset.source === 'official' ? (
                <>From the platform’s <a href={preset.ref} target="_blank" rel="noopener noreferrer">help page</a></>
              ) : (
                'Commonly used size, not confirmed on an official page'
              )}
              {preset.note ? `. ${preset.note}` : ''}
            </p>
          )}
          {isCustom && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Width" value={customW} onChange={setCustomW} min={16} max={LIMITS.maxOutputSide} suffix="px" />
                {lockToSource ? (
                  <div>
                    <span className="field-label">Height</span>
                    <p className="input bg-paper tabular-nums">{outH} px</p>
                  </div>
                ) : (
                  <NumberField label="Height" value={customH} onChange={setCustomH} min={16} max={LIMITS.maxOutputSide} suffix="px" />
                )}
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-5 w-5" checked={lockToSource} onChange={(e) => setLockToSource(e.target.checked)} />
                Keep original aspect ratio ({aspectLabel(image.width, image.height)})
              </label>
            </div>
          )}
          <Segmented
            label="How should the image fit?"
            value={fit}
            onChange={(v) => {
              setFit(v);
              setPlacement(CENTRED);
            }}
            options={[
              { value: 'cover', label: 'Fill (crop edges)' },
              { value: 'contain', label: 'Fit (add borders)' },
            ]}
          />
          <Slider
            label="Zoom"
            value={Math.round(placement.zoom * 100)}
            min={fit === 'cover' ? 100 : 20}
            max={400}
            onChange={(v) => setPlacement({ ...placement, zoom: v / 100 })}
            format={(v) => `${v}%`}
          />
          <div>
            <Segmented
              label="Background"
              value={bgMode}
              onChange={setBgMode}
              options={[
                { value: 'color', label: 'Colour' },
                { value: 'transparent', label: 'Transparent' },
              ]}
            />
            {bgMode === 'transparent' && format === 'image/jpeg' && <p className="field-hint">JPEG has no transparency; the colour below is used instead.</p>}
          </div>
          {(bgMode === 'color' || format === 'image/jpeg') && <ColorField label="Background colour" value={bgColor} onChange={setBgColor} />}
          <OutputControls format={format} onFormat={setFormat} quality={quality} onQuality={setQuality} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary flex-1" onClick={download} disabled={!rect || exporting}>
            <Icon name="download" className="h-4 w-4" /> {exporting ? 'Preparing…' : `Download ${outW || '?'} × ${outH || '?'}`}
          </button>
          <button type="button" className="btn-secondary" onClick={() => setPlacement(CENTRED)}>Re-centre</button>
          <button type="button" className="btn-quiet" onClick={startOver}>
            <Icon name="reset" className="h-4 w-4" /> Start again
          </button>
        </div>
        {status && <Alert tone={status.tone} live>{status.text}</Alert>}
        <p className="text-xs text-muted">
          Source: {image.name}, {image.width} × {image.height}px, {formatBytes(image.size)}
        </p>
      </div>
    </div>
  );
}
