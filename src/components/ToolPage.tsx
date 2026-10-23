import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { TOOLS, toolBySlug } from '../data/tools';
import { metaForPath } from '../data/routes';
import { breadcrumbSchema, webAppSchema } from '../lib/seo';
import { AdSlot } from './AdSlot';
import { Icon } from './Icon';
import { Seo } from './Seo';
import { ToolErrorBoundary } from './ui';

export interface Faq {
  q: string;
  a: ReactNode;
}

export function Faqs({ items }: { items: Faq[] }) {
  return (
    <div className="divide-y divide-line rounded-xl border border-line bg-surface">
      {items.map((f) => (
        <details key={f.q} className="group px-4 py-1">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 font-semibold">
            {f.q}
            <span aria-hidden="true" className="text-accent transition-transform group-open:rotate-45">+</span>
          </summary>
          <div className="pb-4 text-muted">{f.a}</div>
        </details>
      ))}
    </div>
  );
}

export function ToolPage({
  slug,
  lede,
  privacyNote,
  children,
  content,
  faqs,
}: {
  slug: string;
  lede: ReactNode;
  privacyNote: ReactNode;
  children: ReactNode;
  content: ReactNode;
  faqs: Faq[];
}) {
  const tool = toolBySlug(slug);
  const meta = metaForPath(tool.path);
  const related = tool.related.map((s) => TOOLS.find((t) => t.slug === s)).filter((t): t is NonNullable<typeof t> => !!t);
  return (
    <>
      <Seo
        path={tool.path}
        schemas={[
          webAppSchema(tool.name, tool.path, meta.description),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: tool.name, path: tool.path },
          ]),
        ]}
      />
      <div className="wrap pt-6">
        <nav aria-label="Breadcrumb" className="text-sm text-muted">
          <ol className="flex flex-wrap gap-1">
            <li><Link to="/">Home</Link> /</li>
            <li aria-current="page">{tool.name}</li>
          </ol>
        </nav>
        <header className="mt-4 max-w-3xl">
          <h1 className="text-3xl font-bold sm:text-4xl">{tool.name}</h1>
          <p className="mt-3 text-lg text-muted">{lede}</p>
          <p className="mt-3 flex items-center gap-2 text-sm text-ok">
            <Icon name="check" className="h-4 w-4" /> {privacyNote}
          </p>
        </header>
        <section aria-label={`${tool.name} tool`} className="mt-8">
          <ToolErrorBoundary>{children}</ToolErrorBoundary>
        </section>
        <article className="prose-ck mt-14">{content}</article>
        <section className="mt-12 max-w-3xl" aria-labelledby="faq-h">
          <h2 id="faq-h" className="mb-4 text-2xl font-semibold">Frequently asked questions</h2>
          <Faqs items={faqs} />
        </section>
        <AdSlot />
        <section className="mt-12" aria-labelledby="related-h">
          <h2 id="related-h" className="mb-4 text-2xl font-semibold">Related tools</h2>
          <ul className="grid gap-3 sm:grid-cols-3">
            {related.map((t) => (
              <li key={t.slug}>
                <Link to={t.path} className="panel flex h-full gap-3 p-4 text-ink no-underline hover:border-accent">
                  <Icon name={t.icon} className="h-6 w-6 shrink-0 text-accent" />
                  <span>
                    <span className="block font-semibold">{t.name}</span>
                    <span className="mt-1 block text-sm text-muted">{t.short}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
