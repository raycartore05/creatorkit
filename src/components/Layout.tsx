import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { site } from '../config/site';
import { TOOLS } from '../data/tools';

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
  useEffect(() => setOpen(false), [pathname]);
  const navCls = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-2 text-sm font-medium no-underline ${isActive ? 'text-accent' : 'text-ink hover:text-accent'}`;
  return (
    <header className="border-b border-line bg-surface">
      <div className="wrap flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          <NavLink to="/tools/image-resizer" className={navCls}>Resize</NavLink>
          <NavLink to="/tools/image-compressor" className={navCls}>Compress</NavLink>
          <NavLink to="/tools/qr-code-generator" className={navCls}>QR code</NavLink>
          <NavLink to="/guides/social-media-image-sizes" className={navCls}>Image sizes</NavLink>
          <Link to="/#tools" className="btn-secondary ml-2">All tools</Link>
        </nav>
        <button
          type="button"
          className="btn-quiet md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? 'Close' : 'Menu'}
        </button>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t border-line md:hidden">
          <ul className="wrap py-2">
            {TOOLS.map((t) => (
              <li key={t.slug}>
                <Link to={t.path} className="block py-3 text-ink no-underline">{t.name}</Link>
              </li>
            ))}
            <li>
              <Link to="/guides/social-media-image-sizes" className="block py-3 text-ink no-underline">Image sizes guide</Link>
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
