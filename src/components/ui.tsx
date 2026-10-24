import { Component, useId, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';
import { copyText } from '../lib/clipboard';

type Tone = 'info' | 'ok' | 'warn' | 'bad';
const TONE: Record<Tone, string> = {
  info: 'border-accent/30 bg-accent-soft text-ink',
  ok: 'border-ok/30 bg-ok-soft text-ok',
  warn: 'border-warn/30 bg-warn-soft text-warn',
  bad: 'border-bad/30 bg-bad-soft text-bad',
};

export function Alert({ tone = 'info', children, live }: { tone?: Tone; children: ReactNode; live?: boolean }) {
  return (
    <div
      className={`flex gap-2 rounded-lg border px-3 py-2.5 text-sm ${TONE[tone]}`}
      role={tone === 'bad' ? 'alert' : live ? 'status' : undefined}
    >
      <Icon name={tone === 'ok' ? 'check' : tone === 'info' ? 'info' : 'alert'} className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

/** File picker + drag-and-drop zone. */
export function Dropzone({
  onFile,
  accept,
  hint,
  busy,
}: {
  onFile: (f: File) => void;
  accept: string;
  hint: ReactNode;
  busy?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const id = useId();
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      className={`cropmarks flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
        over ? 'border-accent bg-accent-soft' : 'border-line bg-surface'
      }`}
    >
      <Icon name="upload" className="h-8 w-8 text-accent" />
      <div>
        <label htmlFor={id} className="btn-primary">
          {busy ? 'Reading image…' : 'Choose an image'}
        </label>
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          className="sr-only"
          data-testid="file-input"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = '';
          }}
        />
      </div>
      <p className="text-sm text-muted">or drag and drop it here</p>
      <p className="text-xs text-muted">{hint}</p>
    </div>
  );
}

export function CopyButton({
  text,
  label = 'Copy',
  className = 'btn-secondary',
  onCopied,
}: {
  text: string;
  label?: string;
  className?: string;
  /** Called only after the text really reached the clipboard. */
  onCopied?: () => void;
}) {
  const [state, setState] = useState<'idle' | 'ok' | 'fail'>('idle');
  return (
    <button
      type="button"
      className={className}
      disabled={!text}
      onClick={async () => {
        const ok = await copyText(text);
        setState(ok ? 'ok' : 'fail');
        if (ok) onCopied?.();
        setTimeout(() => setState('idle'), 2000);
      }}
    >
      <Icon name={state === 'ok' ? 'check' : 'copy'} className="h-4 w-4" />
      <span aria-live="polite">{state === 'ok' ? 'Copied' : state === 'fail' ? 'Copy failed — select and copy manually' : label}</span>
    </button>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format = (v) => String(v),
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  hint?: ReactNode;
}) {
  const id = useId();
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="field-label">{label}</label>
        <output htmlFor={id} className="text-sm tabular-nums text-muted">{format(value)}</output>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

export function Select({
  label,
  value,
  onChange,
  children,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
  hint?: ReactNode;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="field-label">{label}</label>
      <select id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="field-label">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={`btn cursor-pointer border ${value === o.value ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface text-ink hover:border-accent'}`}
          >
            <input type="radio" className="sr-only" checked={value === o.value} onChange={() => onChange(o.value)} />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="field-label">{label}</label>
      <div className="flex items-center gap-2">
        <input id={id} className="input tabular-nums" inputMode="numeric" type="number" min={min} max={max} value={value} onChange={(e) => onChange(e.target.value)} />
        {suffix && <span className="text-sm text-muted">{suffix}</span>}
      </div>
    </div>
  );
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: ReactNode }) {
  const id = useId();
  return (
    <div>
      <div className="flex min-h-11 items-center gap-3">
        <input id={id} type="checkbox" className="h-5 w-5 accent-[#4338ca]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <label htmlFor={id} className="text-sm font-medium">{label}</label>
      </div>
      {hint && <p className="field-hint -mt-1 ml-8">{hint}</p>}
    </div>
  );
}

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="field-label">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" aria-label={`${label} picker`} value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'} onChange={(e) => onChange(e.target.value)} className="h-11 w-12 cursor-pointer rounded-lg border border-line bg-surface p-1" />
        <input id={id} className="input font-mono uppercase" value={value} maxLength={7} onChange={(e) => onChange(e.target.value)} spellCheck={false} />
      </div>
    </div>
  );
}

interface EBState {
  failed: boolean;
}

/** Keeps one broken tool from blanking the whole page. */
export class ToolErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { failed: false };
  static getDerivedStateFromError(): EBState {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <Alert tone="bad">
          The tool hit an unexpected problem. Reload the page to start again. If it keeps happening, your browser may not support a feature the tool needs; try the latest Chrome, Edge, Firefox or Safari.
          <div className="mt-2">
            <button type="button" className="btn-secondary" onClick={() => window.location.reload()}>Reload page</button>
          </div>
        </Alert>
      );
    }
    return this.props.children;
  }
}
