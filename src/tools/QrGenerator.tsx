import { useEffect, useState } from 'react';
import { dataUrlToBlob, downloadBlob } from '../lib/image';
import { QR_MAX_SIZE, QR_MIN_SIZE, qrErrorMessage, qrToDataUrl, qrToSvg, validateQr, type Ecc, type QrSettings } from '../lib/qr';
import { Icon } from '../components/Icon';
import { Alert, ColorField, Segmented, Select, Slider } from '../components/ui';
import { trackToolUse } from '../lib/analytics';

const DEFAULTS: QrSettings = {
  mode: 'url',
  value: '',
  fg: '#111827',
  bg: '#ffffff',
  size: 512,
  margin: 4,
  ecc: 'M',
};

export function QrGenerator() {
  const [s, setS] = useState<QrSettings>(DEFAULTS);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const v = validateQr(s);
  const valid = v.errors.length === 0;
  const set = <K extends keyof QrSettings>(k: K, val: QrSettings[K]) => setS((p) => ({ ...p, [k]: val }));

  useEffect(() => {
    let cancelled = false;
    if (!valid) {
      setDataUrl(null);
      return;
    }
    qrToDataUrl(s)
      .then((u) => {
        if (!cancelled) {
          setDataUrl(u);
          setGenError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setDataUrl(null);
          setGenError(qrErrorMessage(e));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [s, valid]);

  async function downloadPng() {
    if (!dataUrl) return;
    downloadBlob(dataUrlToBlob(dataUrl), `qr-code-${s.size}px.png`);
    trackToolUse('qr-code-generator', 'download', 'png');
  }
  async function downloadSvg() {
    try {
      const svg = await qrToSvg(s);
      downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), 'qr-code.svg');
      trackToolUse('qr-code-generator', 'download', 'svg');
    } catch (e) {
      setGenError(qrErrorMessage(e));
    }
  }

  const showErrors = touched || s.value.length > 0;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="panel space-y-5 p-4 sm:p-6">
        <Segmented
          label="What should the QR code contain?"
          value={s.mode}
          onChange={(m) => set('mode', m)}
          options={[
            { value: 'url', label: 'Website link' },
            { value: 'text', label: 'Plain text' },
          ]}
        />
        <div>
          <label htmlFor="qr-value" className="field-label">{s.mode === 'url' ? 'URL' : 'Text'}</label>
          {s.mode === 'url' ? (
            <input
              id="qr-value"
              className="input"
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder="https://example.com/menu"
              value={s.value}
              onBlur={() => setTouched(true)}
              onChange={(e) => set('value', e.target.value)}
              aria-invalid={showErrors && !valid}
              aria-describedby="qr-msgs"
            />
          ) : (
            <textarea
              id="qr-value"
              className="input min-h-28"
              placeholder="Wi-Fi name, a short message, a code…"
              value={s.value}
              onBlur={() => setTouched(true)}
              onChange={(e) => set('value', e.target.value)}
              aria-invalid={showErrors && !valid}
              aria-describedby="qr-msgs"
            />
          )}
          <p className="field-hint">{s.value.length} characters. Shorter content makes a simpler code that scans more easily.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <ColorField label="Foreground (modules)" value={s.fg} onChange={(c) => set('fg', c)} />
          <ColorField label="Background" value={s.bg} onChange={(c) => set('bg', c)} />
        </div>
        <Slider label="Image size" value={s.size} min={QR_MIN_SIZE} max={QR_MAX_SIZE} step={32} onChange={(n) => set('size', n)} format={(n) => `${n} × ${n}px`} hint="For print, the SVG download scales to any size without blurring." />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Error correction" value={s.ecc} onChange={(e) => set('ecc', e as Ecc)} hint="Higher levels survive damage or smudges but make denser codes.">
            <option value="L">Low (~7% recovery)</option>
            <option value="M">Medium (~15%)</option>
            <option value="Q">Quartile (~25%)</option>
            <option value="H">High (~30%)</option>
          </Select>
          <Slider label="Quiet zone (margin)" value={s.margin} min={0} max={10} onChange={(n) => set('margin', n)} format={(n) => `${n} modules`} />
        </div>
        <div id="qr-msgs" className="space-y-2" aria-live="polite">
          {showErrors && v.errors.map((e) => <Alert key={e} tone="bad">{e}</Alert>)}
          {v.warnings.map((w) => <Alert key={w} tone="warn">{w}</Alert>)}
          {genError && <Alert tone="bad">{genError}</Alert>}
        </div>
      </div>

      <div className="space-y-4">
        <div className="panel flex aspect-square items-center justify-center p-6">
          {dataUrl ? (
            <img src={dataUrl} alt={`QR code for ${s.value.trim()}`} className="max-h-full max-w-full" style={{ imageRendering: 'pixelated' }} data-testid="qr-image" />
          ) : (
            <p className="text-center text-sm text-muted">{s.mode === 'url' ? 'Enter a link to see your QR code.' : 'Enter some text to see your QR code.'}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary flex-1" disabled={!dataUrl} onClick={downloadPng}>
            <Icon name="download" className="h-4 w-4" /> PNG
          </button>
          <button type="button" className="btn-secondary flex-1" disabled={!dataUrl} onClick={downloadSvg}>
            <Icon name="download" className="h-4 w-4" /> SVG
          </button>
          <button type="button" className="btn-quiet" onClick={() => { setS(DEFAULTS); setTouched(false); setGenError(null); }}>
            <Icon name="reset" className="h-4 w-4" /> Reset
          </button>
        </div>
        <Alert tone="warn">
          Always scan the downloaded file with at least two different phones before printing or sharing it. A QR code that looks fine can still fail at small sizes, on glossy paper or with low contrast.
        </Alert>
      </div>
    </div>
  );
}
