import { useId, useState } from 'react';
import { formatNumber } from '../lib/format';
import { cleanWhitespace, formatHashtags, moveHashtagsToEnd, textStats, type HashtagOptions } from '../lib/text';
import { Icon } from '../components/Icon';
import { Alert, CopyButton, NumberField, Toggle } from '../components/ui';

/**
 * Commonly cited caption/post limits. These are NOT verified against
 * official documentation and platforms change them; users can edit the
 * number directly.
 */
const LIMIT_SUGGESTIONS = [
  { label: '280 (short posts)', value: 280 },
  { label: '500', value: 500 },
  { label: '2,200 (long captions)', value: 2200 },
  { label: '3,000', value: 3000 },
];

export function CaptionFormatter() {
  const [text, setText] = useState('');
  const [limit, setLimit] = useState('2200');
  const [trimLines, setTrimLines] = useState(true);
  const [collapseSpaces, setCollapseSpaces] = useState(true);
  const [limitBlank, setLimitBlank] = useState(true);
  const [tagInput, setTagInput] = useState('');
  const [tagOpts, setTagOpts] = useState<HashtagOptions>({ lowercase: false, dedupe: true, separator: 'space' });
  const [notice, setNotice] = useState<string | null>(null);
  const areaId = useId();
  const tagId = useId();

  const stats = textStats(text);
  const lim = Number(limit);
  const limitValid = Number.isInteger(lim) && lim > 0 && lim <= 100_000;
  const remaining = limitValid ? lim - stats.characters : null;
  const over = remaining !== null && remaining < 0;
  const tags = formatHashtags(tagInput, tagOpts);
  const tagString = tags.join(tagOpts.separator === 'newline' ? '\n' : ' ');

  function apply(next: string, msg: string) {
    if (next === text) {
      setNotice('Nothing to change.');
    } else {
      setText(next);
      setNotice(msg);
    }
    setTimeout(() => setNotice(null), 2500);
  }

  const statRows: [string, number][] = [
    ['Characters', stats.characters],
    ['Without spaces', stats.charactersNoSpaces],
    ['Words', stats.words],
    ['Lines', stats.lines],
    ['Paragraphs', stats.paragraphs],
    ['Hashtags', stats.hashtags],
    ['Mentions', stats.mentions],
  ];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4">
        <div className="panel p-4 sm:p-6">
          <label htmlFor={areaId} className="field-label">Your caption or post</label>
          <textarea
            id={areaId}
            className="input min-h-72 font-sans leading-relaxed"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste or type your caption here…"
            aria-describedby={`${areaId}-count`}
          />
          <p id={`${areaId}-count`} className={`mt-2 text-sm ${over ? 'font-semibold text-bad' : 'text-muted'}`} aria-live="polite">
            {formatNumber(stats.characters)} characters
            {remaining !== null && (over ? ` — ${formatNumber(-remaining)} over your ${formatNumber(lim)} limit` : ` — ${formatNumber(remaining)} left of ${formatNumber(lim)}`)}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" disabled={!text} onClick={() => apply(cleanWhitespace(text, { trimLines, collapseSpaces, limitBlankLines: limitBlank }), 'Whitespace cleaned up.')}>
              Clean up spacing
            </button>
            <button type="button" className="btn-secondary" disabled={stats.hashtags === 0} onClick={() => apply(moveHashtagsToEnd(text, tagOpts), 'Hashtags moved to the end.')}>
              Move hashtags to end
            </button>
            <CopyButton text={text} label="Copy caption" className="btn-primary" />
            <button type="button" className="btn-quiet" disabled={!text} onClick={() => { setText(''); setNotice(null); }}>
              <Icon name="reset" className="h-4 w-4" /> Clear
            </button>
          </div>
          {notice && <div className="mt-3"><Alert tone="ok" live>{notice}</Alert></div>}
          <div className="mt-4 grid gap-1 sm:grid-cols-3">
            <Toggle label="Trim spaces at line ends" checked={trimLines} onChange={setTrimLines} />
            <Toggle label="Collapse repeated spaces" checked={collapseSpaces} onChange={setCollapseSpaces} />
            <Toggle label="Max one blank line" checked={limitBlank} onChange={setLimitBlank} />
          </div>
        </div>

        <div className="panel space-y-4 p-4 sm:p-6">
          <h2 className="text-xl font-semibold">Hashtag cleaner</h2>
          <div>
            <label htmlFor={tagId} className="field-label">Words or hashtags</label>
            <textarea id={tagId} className="input min-h-24" value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="travel, #NZ, road trip, #nz, waikato" />
            <p className="field-hint">Separate with commas, new lines or #. Spaces inside a phrase are joined (“road trip” → #roadTrip).</p>
          </div>
          <div className="grid gap-1 sm:grid-cols-3">
            <Toggle label="Lowercase" checked={tagOpts.lowercase} onChange={(v) => setTagOpts({ ...tagOpts, lowercase: v })} />
            <Toggle label="Remove duplicates" checked={tagOpts.dedupe} onChange={(v) => setTagOpts({ ...tagOpts, dedupe: v })} />
            <Toggle label="One per line" checked={tagOpts.separator === 'newline'} onChange={(v) => setTagOpts({ ...tagOpts, separator: v ? 'newline' : 'space' })} />
          </div>
          <div>
            <p className="field-label">Result ({tags.length})</p>
            <pre className="min-h-12 whitespace-pre-wrap break-words rounded-lg border border-line bg-paper p-3 font-sans text-sm" data-testid="hashtag-output">{tagString || '—'}</pre>
          </div>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={tagString} label="Copy hashtags" />
            <button type="button" className="btn-secondary" disabled={!tagString} onClick={() => setText((t) => (t.trim() ? `${t.trimEnd()}\n\n${tagString}` : tagString))}>
              Add to caption
            </button>
          </div>
        </div>
      </div>

      <aside className="space-y-4" aria-label="Text statistics">
        <div className="panel p-4 sm:p-5">
          <NumberField label="Character limit to check against" value={limit} onChange={setLimit} min={1} />
          <div className="mt-2 flex flex-wrap gap-2">
            {LIMIT_SUGGESTIONS.map((s) => (
              <button key={s.value} type="button" className={`btn border text-xs ${lim === s.value ? 'border-accent text-accent' : 'border-line'}`} onClick={() => setLimit(String(s.value))}>
                {s.label}
              </button>
            ))}
          </div>
          <p className="field-hint">Platforms set and change their own limits. Check the current limit in the app you post to.</p>
          {!limitValid && <p className="field-hint text-bad">Enter a whole number above 0.</p>}
        </div>
        <dl className="panel divide-y divide-line">
          {statRows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between px-4 py-2.5">
              <dt className="text-sm text-muted">{k}</dt>
              <dd className="font-display text-lg font-semibold tabular-nums" data-testid={`stat-${k.toLowerCase().replace(/\s+/g, '-')}`}>{formatNumber(v)}</dd>
            </div>
          ))}
        </dl>
        {stats.hashtags !== stats.uniqueHashtags && (
          <Alert tone="warn">You have {stats.hashtags - stats.uniqueHashtags} repeated hashtag{stats.hashtags - stats.uniqueHashtags === 1 ? '' : 's'}.</Alert>
        )}
        {stats.utf16Length !== stats.characters && (
          <p className="text-xs text-muted">
            Emoji and some symbols count as one character here, but some platforms count them as two or more ({formatNumber(stats.utf16Length)} by that measure).
          </p>
        )}
      </aside>
    </div>
  );
}
