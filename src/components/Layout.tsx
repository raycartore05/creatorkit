import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { site } from '../config/site';
import { ALL_TOOLS_PATH, TOOLS } from '../data/tools';
import { Icon } from './Icon';

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 text-ink no-underline hover:text-ink" aria-label="CreatorKit home">
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
        <rect x="7" y="7" width="18" height="18" rx="3" fill="#4338ca" />
        <path d="M3 9V3h6M29 23v6h-6" fill="none" stroke="#171a2b" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
      <span className="font-display text-xl font-bold tracking-tight">CreatorKit</span>
    </Link>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const buttonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // The current page gets accent colour plus an underline, so it isn't signalled by colour alone.
  const navCls = ({ isActive }: { isActive: boolean }) =>
    `whitespace-nowrap rounded-md px-2.5 py-2 text-sm font-medium no-underline xl:px-3 ${
      isActive ? 'text-accent shadow-[inset_0_-2px_0_var(--color-accent)]' : 'text-ink hover:bg-accent-soft hover:text-accent'
    }`;
  const mobileCls = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-12 items-center gap-3 rounded-lg px-3 no-underline ${isActive ? 'bg-accent-soft font-semibold text-accent' : 'text-ink hover:bg-accent-soft'}`;

  return (
    <header className="border-b border-line bg-surface">
      <div className="wrap flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-0.5 lg:flex">
          {TOOLS.map((t) => (
            <NavLink key={t.slug} to={t.path} className={navCls} title={t.name}>
              {t.navLabel}
            </NavLink>
          ))}
          <Link to={ALL_TOOLS_PATH} className="btn-secondary ml-2 whitespace-nowrap">All Tools</Link>
        </nav>
        <button
          ref={buttonRef}
          type="button"
          className="btn-secondary lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((o) => !o)}
        >
          <span aria-hidden="true" className="text-base leading-none">{open ? '×' : '☰'}</span>
          {open ? 'Close menu' : 'Menu'}
        </button>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t border-line lg:hidden">
          <ul className="wrap grid gap-1 py-3 sm:grid-cols-2">
            {TOOLS.map((t) => (
              <li key={t.slug}>
                <NavLink to={t.path} className={mobileCls} onClick={() => setOpen(false)}>
                  <Icon name={t.icon} className="h-5 w-5 shrink-0 text-accent" />
                  <span>
                    <span className="block text-sm font-semibold">{t.navLabel}</span>
                    <span className="block text-xs text-muted">{t.name}</span>
                  </span>
                </NavLink>
              </li>
            ))}
            <li>
              <Link to={ALL_TOOLS_PATH} className="flex min-h-12 items-center rounded-lg px-3 font-semibold text-accent no-underline hover:bg-accent-soft" onClick={() => setOpen(false)}>
                All Tools
              </Link>
            </li>
            <li>
              <NavLink to="/guides/social-media-image-sizes" className={mobileCls} onClick={() => setOpen(false)}>
                Image sizes guide
              </NavLink>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-surface">
      <div className="wrap grid gap-8 py-10 text-sm sm:grid-cols-3">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-muted">
            Free tools for preparing images and text for social media and the web. Your files are processed in your browser.
          </p>
        </div>
        <nav aria-label="Tools">
          <h2 className="mb-2 font-sans text-sm font-semibold">Tools</h2>
          <ul className="space-y-1.5">
            {TOOLS.map((t) => (
              <li key={t.slug}><Link to={t.path} className="text-muted no-underline hover:text-accent">{t.name}</Link></li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Site">
          <h2 className="mb-2 font-sans text-sm font-semibold">Site</h2>
          <ul className="space-y-1.5">
            <li><Link to="/guides/social-media-image-sizes" className="text-muted no-underline hover:text-accent">Social media image sizes</Link></li>
            <li><Link to="/about" className="text-muted no-underline hover:text-accent">About</Link></li>
            <li><Link to="/contact" className="text-muted no-underline hover:text-accent">Contact</Link></li>
            {site.contactEmail && (
              <li>
                <a href={`mailto:${site.contactEmail}`} className="break-all text-muted no-underline hover:text-accent" data-testid="footer-email">
                  {site.contactEmail}
                </a>
              </li>
            )}
            <li>
              <a
                href={site.supportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-muted no-underline hover:text-accent"
                data-testid="footer-support"
              >
                Support CreatorKit
                <Icon name="external" className="h-3.5 w-3.5" />
                <span className="sr-only">(PayPal, opens in a new tab)</span>
              </a>
            </li>
            <li><Link to="/privacy" className="text-muted no-underline hover:text-accent">Privacy policy</Link></li>
            <li><Link to="/terms" className="text-muted no-underline hover:text-accent">Terms of use</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-line">
        <p className="wrap py-4 text-xs text-muted">
          CreatorKit is a project by <a href={site.parentUrl}>{site.parentName}</a>. Not affiliated with or endorsed by any social media platform. Platform names are used only to describe compatible image sizes.
        </p>
      </div>
    </footer>
  );
}

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);
  return null;
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface focus:px-4 focus:py-2">
        Skip to content
      </a>
      <ScrollToTop />
      <Header />
      <main id="main" className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
