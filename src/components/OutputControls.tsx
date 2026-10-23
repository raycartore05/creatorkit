import { useEffect, useState } from 'react';
import { canEncodeWebp, type OutputFormat } from '../lib/image';
import { Select, Slider } from './ui';

/** Format + quality picker shared by image tools. */
export function OutputControls({
  format,
  onFormat,
  quality,
  onQuality,
  allowPng = true,
}: {
  format: OutputFormat;
  onFormat: (f: OutputFormat) => void;
  quality: number;
  onQuality: (q: number) => void;
  allowPng?: boolean;
}) {
  const [webp, setWebp] = useState(true);
  useEffect(() => setWebp(canEncodeWebp()), []);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Select
        label="File format"
        value={format}
        onChange={(v) => onFormat(v as OutputFormat)}
        hint={format === 'image/png' ? 'Lossless and supports transparency. Larger files for photos.' : format === 'image/jpeg' ? 'Best for photos. No transparency.' : 'Smaller files, supports transparency.'}
      >
        {allowPng && <option value="image/png">PNG</option>}
        <option value="image/jpeg">JPEG</option>
        <option value="image/webp" disabled={!webp}>WebP{webp ? '' : ' (not supported by this browser)'}</option>
      </Select>
      {format !== 'image/png' && (
        <Slider
          label="Quality"
          value={Math.round(quality * 100)}
          min={10}
          max={100}
          onChange={(v) => onQuality(v / 100)}
          format={(v) => `${v}%`}
          hint="80–90% is a good balance for most social posts."
        />
      )}
    </div>
  );
}
