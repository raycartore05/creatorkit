import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { adsenseScriptEnabled, analyticsEnabled, site } from '../config/site';
import { groupByPlatform, PRESETS_CHECKED_ON, PROFILE_PRESETS, SOCIAL_PRESETS } from '../data/presets';
import { Icon } from '../components/Icon';
import { Seo } from '../components/Seo';
import { aspectLabel } from '../lib/format';
import { breadcrumbSchema } from '../lib/seo';

function Page({ path, title, children, updated }: { path: string; title: string; children: ReactNode; updated?: string }) {
  return (
    <>
      <Seo path={path} schemas={[breadcrumbSchema([{ name: 'Home', path: '/' }, { name: title, path }])]} />
      <div className="wrap pt-6">
        <nav aria-label="Breadcrumb" className="text-sm text-muted">
          <Link to="/">Home</Link> / <span aria-current="page">{title}</span>
        </nav>
        <article className="prose-ck mt-4">
          <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
          {updated && <p className="text-sm text-muted">Last updated {updated}</p>}
          {children}
        </article>
      </div>
    </>
  );
}

function ContactLine() {
  return site.contactEmail ? (
    <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
  ) : (
    <span data-testid="contact-missing">the contact address on our <Link to="/contact">contact page</Link></span>
  );
}

export function SizesGuidePage() {
  const extra = PROFILE_PRESETS.filter((p) => !SOCIAL_PRESETS.some((s) => s.id === p.id) && p.platform !== 'Profile');
  return (
    <Page path="/guides/social-media-image-sizes" title="Social media image sizes" updated={PRESETS_CHECKED_ON}>
      <p>
        These are the sizes built into the CreatorKit <Link to="/tools/image-resizer">image resizer</Link> and <Link to="/tools/profile-cropper">profile cropper</Link>. Many size lists online repeat each other without sources, so we label every size honestly:
      </p>
      <ul>
        <li><strong>Official</strong>: we found it on the platform’s own help page on {PRESETS_CHECKED_ON} (linked).</li>
        <li><strong>Common</strong>: widely used and generally accepted, but we could not confirm it on an official page.</li>
      </ul>
      <p>Platforms change their layouts without notice. Treat every size as a starting point, and check how your post looks after uploading.</p>
      {groupByPlatform([...SOCIAL_PRESETS, ...extra]).map(([platform, list]) => (
        <section key={platform}>
          <h2>{platform}</h2>
          <table>
            <thead>
              <tr>
                <th scope="col">Use</th>
                <th scope="col">Pixels</th>
                <th scope="col">Shape</th>
                <th scope="col">Source</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.label}
                    {p.note && <span className="mt-1 block text-xs text-muted">{p.note}</span>}
                  </td>
                  <td className="whitespace-nowrap tabular-nums">{p.width} × {p.height}</td>
                  <td>{aspectLabel(p.width, p.height)}</td>
                  <td>{p.source === 'official' ? <a href={p.ref} target="_blank" rel="noopener noreferrer">Official</a> : 'Common'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
      <h2>What matters more than exact pixels</h2>
      <h3>Get the shape right</h3>
      <p>
        The aspect ratio decides how much of your image is shown. Uploading a landscape photo to a vertical story means the platform crops away most of it, or adds bars. Choosing the shape first, then cropping deliberately, gives you control.
      </p>
      <h3>Keep a safe area</h3>
      <p>
        Story and short-video screens overlay buttons, captions and profile names along the top, bottom and right edge. Banners and covers are cropped differently on phones and desktops, and profile pictures often cover one corner. Keep faces, text and logos well inside the frame.
      </p>
      <h3>Upload at least the recommended width</h3>
      <p>
        Larger images rarely help beyond the recommended size, because platforms scale them down and re-compress them. Smaller images get enlarged and look soft. Matching the recommended width usually gives the most predictable result.
      </p>
      <h3>Choose JPEG for photos, PNG for text-heavy graphics</h3>
      <p>
        Platforms re-compress uploads. Graphics with small text often survive that better when uploaded as PNG. Photos are fine as high-quality JPEG. See the <Link to="/tools/image-compressor">compressor</Link> for help hitting a file-size limit.
      </p>
    </Page>
  );
}

export function AboutPage() {
  return (
    <Page path="/about" title="About CreatorKit">
      <p>
        CreatorKit is a small set of free, practical tools for people who publish content: creators, social media managers, small businesses, freelancers and bloggers. It covers the repetitive jobs that sit between making something and posting it, such as getting an image to the right size, keeping a file under an upload limit, or tidying a caption.
      </p>
      <h2>How CreatorKit is different</h2>
      <ul>
        <li><strong>Runs in your browser.</strong> Image tools process files on your own device. Your photos are not uploaded to a server.</li>
        <li><strong>No account.</strong> Open a tool and use it. There is no sign-up, email capture or paywall.</li>
        <li><strong>Honest about limits.</strong> Size presets say whether they come from an official help page. Previews say when they are approximations. Compression results are measured, not promised.</li>
      </ul>
      <h2>Who runs it</h2>
      <p>
        CreatorKit is part of <a href={site.parentUrl}>{site.parentName}</a>, an independent project based in New Zealand. It is not affiliated with, endorsed by or sponsored by Instagram, Facebook, Meta, TikTok, LinkedIn, YouTube, Google, X or any other platform; their names are used only to describe compatible image sizes.
      </p>
      <h2>How it is funded</h2>
      <p>
        CreatorKit is free. To cover running costs it {adsenseScriptEnabled ? 'uses Google AdSense, so pages may show advertising' : 'may in future show advertising'}. Ads are always labelled and kept away from tool controls, and no tool ever requires you to click an ad.{adsenseScriptEnabled ? ' See the privacy policy for how Google uses cookies.' : ' There is currently no advertising on the site.'}
      </p>
      <section aria-labelledby="support-h" className="mt-10 rounded-xl border border-line bg-surface p-5" data-testid="about-support">
        <h2 id="support-h" className="!mt-0">Support CreatorKit</h2>
        <p>
          Enjoying CreatorKit? If these free tools save you time, you can optionally support the project to help with ongoing development and maintenance.
        </p>
        <p>Your support is entirely voluntary. All CreatorKit tools remain free to use, whether or not you contribute.</p>
        <p className="!mb-0">
          <a href={site.supportUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary" data-testid="about-support-link">
            Support CreatorKit on PayPal
            <Icon name="external" className="h-4 w-4" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </p>
      </section>
      <h2>Feedback</h2>
      <p>
        Found a bug, a size that has changed, or a tool you would like to see? Please <Link to="/contact">get in touch</Link>.
      </p>
    </Page>
  );
}

export function ContactPage() {
  return (
    <Page path="/contact" title="Contact CreatorKit Support">
      {site.contactEmail ? (
        <>
          <p>
            Email us at{' '}
            <a href={`mailto:${site.contactEmail}`} data-testid="support-email">{site.contactEmail}</a>
          </p>
          <p>
            Get in touch about problems with a tool, technical issues on your device or browser, accessibility barriers, or general feedback and ideas. We read every message, though we can’t promise a reply to each one.
          </p>
        </>
      ) : (
        <p data-testid="contact-missing">An email contact address is being set up and will be published here shortly.</p>
      )}
      <h2>Reporting a problem</h2>
      <p>Helpful details to include:</p>
      <ul>
        <li>The tool and what you were trying to do.</li>
        <li>Your device and browser, for example “iPhone 15, Safari” or “Windows, Chrome”.</li>
        <li>Any error message shown.</li>
        <li>The size and type of the file (for example “4 MB JPEG”). Please do not send private images.</li>
      </ul>
      <h2>Accessibility</h2>
      <p>
        If something on CreatorKit is hard to use with a screen reader, keyboard, zoom or other assistive technology, please tell us what you were trying to do and what got in the way, so we can fix it.
      </p>
      <h2>Suggestions</h2>
      <p>
        If a platform has changed a recommended size, or you would like a new tool, let us know. Links to the official source are especially useful.
      </p>
      <h2>Privacy requests</h2>
      <p>
        For questions about personal information, see the <Link to="/privacy">privacy policy</Link>. CreatorKit does not hold accounts or tool data, so in most cases there is nothing stored to access or delete.
      </p>
    </Page>
  );
}

function googleCookiesNote(): string {
  if (analyticsEnabled && adsenseScriptEnabled) return ' Google Analytics and Google’s advertising code, described below, can set and read cookies.';
  if (analyticsEnabled) return ' Google Analytics, described below, can set and read cookies.';
  if (adsenseScriptEnabled) return ' Google’s advertising code, described below, can set and read cookies.';
  return '';
}

function thirdPartyScriptsNote(): string {
  const scripts = ['Cloudflare Web Analytics', analyticsEnabled && 'Google Analytics', adsenseScriptEnabled && 'Google AdSense'].filter(Boolean);
  return ` The third-party scripts are ${scripts.length > 1 ? `${scripts.slice(0, -1).join(', ')} and ${scripts.at(-1)}` : scripts[0]}. No third-party font services are used.`;
}

export function PrivacyPage() {
  return (
    <Page path="/privacy" title="Privacy policy" updated={site.buildDate}>
      <p>
        This policy explains what information CreatorKit (<a href={`${site.origin}/`}>{site.origin.replace('https://', '')}</a>) handles. CreatorKit is part of {site.parentName}, based in New Zealand. Questions can be sent to <ContactLine />.
      </p>
      <h2>Images and text you use in the tools</h2>
      <p>
        All image tools (resizer, compressor, profile cropper and watermark tool) open and process files inside your web browser using standard browser features. <strong>Your files are not uploaded to CreatorKit or to anyone else.</strong> The same applies to the text, links and settings you enter in the QR code generator, caption formatter and sharing preview. This content is not stored by CreatorKit: it is held in your browser’s memory while the page is open and discarded when you leave or reload.
      </p>
      <p>
        One exception: in the <Link to="/tools/og-preview">sharing preview</Link>, if you enter an image web address and press “Show image”, your browser requests that image directly from the website you named. That website will receive your IP address and normal browser information, as it would if you visited the address yourself. CreatorKit does not see or store that request. You can avoid this by previewing a file from your device instead.
      </p>
      <h2>Information collected when you visit</h2>
      <p>
        CreatorKit is hosted on Cloudflare Pages. Like any web host, Cloudflare processes technical information needed to deliver and protect the site, such as your IP address, browser type, the page requested and the time. This is handled by Cloudflare under its own <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer">privacy policy</a>. CreatorKit does not use this information to identify you.
      </p>
      <p>
        CreatorKit also uses Cloudflare Web Analytics to count page views. It does not use cookies or browser storage and does not identify individual visitors.
      </p>
      <ul>
        <li>
          CreatorKit’s own code does not set cookies or use browser storage (such as localStorage) for tracking.
          {googleCookiesNote()}
        </li>
        <li>
          Fonts and CreatorKit’s own code are served from CreatorKit itself.
          {thirdPartyScriptsNote()}
        </li>
        <li>There are no accounts, sign-up forms or newsletters.</li>
      </ul>
      {analyticsEnabled && (
        <>
          <h2>Analytics</h2>
          <p>
            CreatorKit uses Google Analytics to understand how many people visit, which pages and tools they use, and how they found the site (for example a search engine, a social media post or a campaign link). Google Analytics loads from Google’s servers and uses cookies to tell visits apart. It records the pages you view, your device and browser type, your approximate location (worked out from your IP address) and the website or link that referred you. Google Analytics does not log or store your IP address.
          </p>
          <p>
            When you complete an action in a tool, such as downloading a resized image or copying a caption, CreatorKit sends Google Analytics only the tool name, the type of action and, for downloads, the file format (for example PNG). It never sends your images, file names, or the text, links and settings you enter.
          </p>
          <p>
            For visitors in the European Economic Area, the United Kingdom and Switzerland, Google Analytics does not set or read cookies unless you agree in Google’s consent message. If you don’t agree, Google may still receive basic information that a page was viewed, without cookies or an identifier that links your visits. Anyone can block Google Analytics with the <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">Google Analytics opt-out browser add-on</a>, a content blocker or browser privacy settings. The tools keep working either way.
          </p>
        </>
      )}
      <h2>Advertising</h2>
      {adsenseScriptEnabled ? (
        <>
          <p>
            CreatorKit uses Google AdSense to show advertising. Every page includes Google’s AdSense code, which loads from Google’s servers, so Google receives your IP address and browser information when you visit. Ads, when shown, are labelled “Advertisement”. The image and text tools still work entirely in your browser, and CreatorKit never sends your files or the text you enter to Google or anyone else.
          </p>
          <p>
            Google and other third-party vendors use cookies to serve ads based on your previous visits to this and other websites. Google’s use of advertising cookies enables it and its partners to serve ads based on your visits to this site and/or other sites on the internet.
          </p>
          <p>
            You can opt out of personalised advertising by visiting <a href="https://adssettings.google.com/" target="_blank" rel="noopener noreferrer">Google Ads Settings</a>, or opt out of some third-party vendors’ use of cookies at <a href="https://www.aboutads.info/" target="_blank" rel="noopener noreferrer">aboutads.info</a>. For visitors in the European Economic Area, the United Kingdom and Switzerland, CreatorKit uses Google’s consent message so you can choose whether personalised ads are shown. See also <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">how Google uses information from sites that use its services</a>.
          </p>
        </>
      ) : (
        <p>
          CreatorKit currently shows no advertising and loads no advertising code. If advertising is introduced, this policy will be updated before it starts, including the information that ad providers collect and how to opt out.
        </p>
      )}
      <h2>Optional support through PayPal</h2>
      <p>
        The “Support CreatorKit” links take you to PayPal’s own website. CreatorKit does not process payments and does not receive your card or bank details.{analyticsEnabled ? ' Google Analytics records that the link was clicked, as it does for any link to another website, but not anything you do on PayPal.' : ' CreatorKit does not track whether you follow the link.'} Anything you enter on PayPal is handled by PayPal under its own privacy statement. Contributing is optional and has no effect on what you can use on CreatorKit.
      </p>
      <h2>If you contact us</h2>
      <p>
        Contacting us is optional. If you email <ContactLine />, you choose what to share: we receive your email address, your name if your email provider includes it, and whatever you write or attach. The message is sent by your own email provider and forwarded to our inbox through Cloudflare’s email routing service. We use it only to reply and to improve CreatorKit, and we delete messages when they are no longer needed. Please do not send private images.
      </p>
      <h2>Your rights</h2>
      <p>
        Under the New Zealand Privacy Act 2020 you can ask for access to, and correction of, personal information we hold about you. If you are in another country, such as the UK or EU, you may have similar rights. Because CreatorKit keeps no tool data and no accounts, the only personal information we are likely to hold is email correspondence. To make a request, contact <ContactLine />. If you are not satisfied with our response you can contact the <a href="https://www.privacy.org.nz/" target="_blank" rel="noopener noreferrer">Office of the Privacy Commissioner</a>.
      </p>
      <h2>Children</h2>
      <p>CreatorKit is a general-audience tool site and does not knowingly collect personal information from children.</p>
      <h2>Changes</h2>
      <p>We will update this page when the way CreatorKit handles information changes, and change the date above.</p>
    </Page>
  );
}

export function TermsPage() {
  return (
    <Page path="/terms" title="Terms of use" updated={site.buildDate}>
      <p>
        By using CreatorKit you agree to these terms. They are written in plain language and are not a substitute for legal advice.
      </p>
      <h2>Your content</h2>
      <p>
        You keep all rights to the images and text you use with CreatorKit. Because files are processed in your browser, CreatorKit does not receive or store them and claims no rights to them. You are responsible for making sure you have the right to edit, watermark and publish the content you use, including photos of other people and material owned by others.
      </p>
      <h2>Acceptable use</h2>
      <ul>
        <li>Do not use CreatorKit to create or distribute content that is illegal, infringes someone else’s rights, or is intended to deceive or harm people (for example QR codes that lead to phishing pages).</li>
        <li>Do not attempt to disrupt the site, overload it with automated traffic, or interfere with its security.</li>
        <li>Do not remove watermarks from images you do not own.</li>
      </ul>
      <h2>Accuracy and limitations</h2>
      <p>
        CreatorKit’s tools and guidance are provided to help, but without any guarantee. Image size recommendations may be out of date, previews are approximations, platforms may crop or re-compress your uploads, and browser encoders differ. Always check your results, especially QR codes before printing, and keep copies of your original files.
      </p>
      <h2>Availability</h2>
      <p>CreatorKit is free and may change, be interrupted or be withdrawn at any time.</p>
      <h2>Liability</h2>
      <p>
        To the extent permitted by law, CreatorKit is provided “as is” and we are not liable for any loss arising from its use, including lost or damaged files, printing costs, or content that does not display as expected. Nothing in these terms limits rights you have under consumer protection laws that cannot be excluded, such as the New Zealand Consumer Guarantees Act where it applies.
      </p>
      <h2>Trademarks</h2>
      <p>
        Platform names such as Instagram, Facebook, LinkedIn, TikTok, YouTube and X are trademarks of their owners. CreatorKit is not affiliated with or endorsed by them.
      </p>
      <h2>Contact</h2>
      <p>Questions about these terms: <ContactLine />.</p>
    </Page>
  );
}

export function NotFoundPage() {
  return (
    <>
      <Seo path="/404" />
      <div className="wrap py-20">
        <div className="cropmarks max-w-xl p-6">
          <h1 className="text-4xl font-bold">This page is off the canvas</h1>
          <p className="mt-3 text-lg text-muted">The address may be mistyped, or the page has moved.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/" className="btn-primary">Go to the homepage</Link>
            <Link to="/#tools" className="btn-secondary">Browse tools</Link>
          </div>
        </div>
      </div>
    </>
  );
}
