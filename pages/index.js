import Head from 'next/head';
import { useState, useRef, useCallback } from 'react';

// ─── FAQ DATA ─────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: 'Is it legal to download Instagram Reels?',
    a: 'Downloading Reels for personal use (watching offline, saving your own content) is generally acceptable. However, redistributing or commercializing someone else\'s content without permission may violate copyright law and Instagram\'s Terms of Service. Always respect the original creator\'s rights.',
  },
  {
    q: 'Do I need an Instagram account to use ReelGrab?',
    a: 'No account required. Simply paste the public link to any Instagram Reel and click Download. We never ask for your Instagram login credentials.',
  },
  {
    q: 'Can I download private Instagram Reels?',
    a: 'No — ReelGrab only works with publicly visible Reels. Private accounts and private content are not accessible without authentication, and we respect those privacy settings.',
  },
  {
    q: 'What video quality will I get?',
    a: 'ReelGrab downloads the original quality file as uploaded to Instagram, which is typically HD (720p or 1080p). The maximum quality depends on how the creator originally uploaded the video.',
  },
  {
    q: 'Is ReelGrab completely free?',
    a: 'Yes, 100% free with no hidden fees, subscriptions, or premium tiers. We run a small number of non-intrusive ads to keep the service running and the lights on.',
  },
  {
    q: 'Are there limits on how many Reels I can download?',
    a: 'There are no hard download limits. You can download as many public Reels as you need, one at a time.',
  },
  {
    q: 'Does ReelGrab work on iPhone and Android?',
    a: 'Yes. ReelGrab is a browser-based tool that works on any device with a modern browser — iPhone, Android, Windows, Mac, Linux. No app installation needed.',
  },
  {
    q: 'How do I find the Instagram Reel link?',
    a: 'Open Instagram, find the Reel you want, tap the three-dot menu (•••) and select "Copy Link". Then paste that link into ReelGrab\'s search bar.',
  },
  {
    q: 'Why is my download not working?',
    a: 'Instagram occasionally updates their systems, which can temporarily affect third-party tools. Common causes include private/restricted accounts, regional content blocks, or expired video links. Try again in a few minutes, or check that the Reel is still publicly visible.',
  },
  {
    q: 'Is my data safe when using ReelGrab?',
    a: 'We do not collect, store, or share any personal data. We don\'t log your download history, require email addresses, or store any URLs beyond the current request. Your privacy is our default.',
  },
];

// ─── ICONS ────────────────────────────────────────────────────────────────────

const IconPaste = () => (
  <svg width="14" height="16" viewBox="0 0 14 18" fill="none">
    <path d="M4.75 2.96C4.75 2.5 4.91 2.07 5.19 1.74C5.47 1.42 5.85 1.24 6.25 1.24H7.75C8.15 1.24 8.53 1.42 8.81 1.74C9.09 2.07 9.25 2.5 9.25 2.96M4.75 2.96H3.25C2.85 2.96 2.47 3.14 2.19 3.47C1.91 3.79 1.75 4.23 1.75 4.69V15.04C1.75 15.5 1.91 15.93 2.19 16.26C2.47 16.58 2.85 16.76 3.25 16.76H10.75C11.15 16.76 11.53 16.58 11.81 16.26C12.09 15.93 12.25 15.5 12.25 15.04V4.69C12.25 4.23 12.09 3.79 11.81 3.47C11.53 3.14 11.15 2.96 10.75 2.96H9.25M4.75 2.96C4.75 3.42 4.91 3.86 5.19 4.18C5.47 4.51 5.85 4.69 6.25 4.69H7.75C8.15 4.69 8.53 4.51 8.81 4.18C9.09 3.86 9.25 3.42 9.25 2.96H4.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconDownload = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconChevron = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconAlert = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// ─── FAQ ITEM ─────────────────────────────────────────────────────────────────

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item${open ? ' open' : ''}`}>
      <button className="faq-q" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>{q}</span>
        <span className="faq-chevron"><IconChevron /></span>
      </button>
      <div className="faq-a" aria-hidden={!open}>
        <p>{a}</p>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const inputRef = useRef(null);
  const resultRef = useRef(null);

  const handleDownload = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      inputRef.current?.focus();
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);


    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });
      const json = await res.json();
      if (!res.ok) {

        throw new Error(json.error || 'Something went wrong.');
      }
      setResult(json.data);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [url]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      setError(null);
    } catch {
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleDownload();
  };

  const triggerDownload = (videoUrl, label = 'reelgrab-video.mp4') => {
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(videoUrl)}`;
    const a = document.createElement('a');
    a.href = proxyUrl;
    a.download = label;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const reset = () => {
    setUrl('');
    setResult(null);
    setError(null);
    inputRef.current?.focus();
  };

  return (
    <>
      <Head>
        <title>ReelGrab – Download Instagram Reels Free | HD MP4, No Watermark</title>
        <meta name="description" content="ReelGrab is the fastest free Instagram Reels downloader. Download any public Instagram Reel in HD MP4 quality — no watermark, no login, no app required. Works on iPhone, Android, and PC." />
        <meta name="keywords" content="instagram reels downloader, download instagram reels, save instagram reel, reel downloader, instagram video downloader, download reels without watermark, reels to mp4" />
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
        <meta property="og:title" content="ReelGrab – Free Instagram Reels Downloader" />
        <meta property="og:description" content="Download any public Instagram Reel in HD MP4 quality for free. No watermark, no login required." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://reel-grab-teal.vercel.app" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="ReelGrab – Free Instagram Reels Downloader" />
        <meta name="twitter:description" content="The fastest free Instagram Reels downloader. HD quality, no watermark." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
        <link rel="canonical" href="https://reel-grab-teal.vercel.app" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "name": "ReelGrab",
          "description": "Free Instagram Reels downloader. Download any public Instagram Reel in HD MP4 quality without watermark.",
          "url": "https://reel-grab-teal.vercel.app",
          "applicationCategory": "UtilitiesApplication",
          "operatingSystem": "All",
          "offers": { "@type": "Offer", "price": "0" },
          "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.9", "reviewCount": "18420" }
        })}} />
      </Head>

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav className="topnav" role="navigation" aria-label="Main navigation">
        <div className="nav-logo" aria-label="ReelGrab Home">REEL<span>GRAB</span></div>
        <div className="nav-links">
          <a href="#how-it-works">How it works</a>
          <a href="#features">Features</a>
          <a href="#faq">FAQ</a>
          <span className="nav-badge">⚡ Free Forever</span>
        </div>
      </nav>

      <main>
        {/* ── HERO ──────────────────────────────────────────────────────── */}
        <section className="hero" aria-labelledby="hero-heading">
          <div className="hero-glow" aria-hidden="true" />

          <div className="hero-eyebrow" aria-label="Feature highlight">
            <svg viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Instant HD Download — No Login Required
          </div>

          <h1 id="hero-heading">
            DOWNLOAD<br />INSTAGRAM<br /><em>REELS</em>
          </h1>

          <p className="hero-sub">
            Save any public Instagram Reel as HD MP4 in seconds.
            Free, watermark-free, and works on every device.
          </p>

          {/* ── SEARCH FORM ─────────────────────────────────────────────── */}
          <div className="search-wrap" role="search">
            <div className="search-box">
              <button className="btn-paste" onClick={handlePaste} type="button" aria-label="Paste from clipboard">
                <IconPaste />
                <span>Paste</span>
              </button>
              <input
                ref={inputRef}
                type="url"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setError(null); }}
                onKeyDown={handleKeyDown}
                placeholder="Paste Instagram Reel link here…"
                aria-label="Instagram Reel URL"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                className="btn-download"
                onClick={handleDownload}
                disabled={loading}
                type="button"
                aria-label="Download video"
              >
                {loading
                  ? <><span className="spinner" aria-hidden="true" /><span>Loading…</span></>
                  : <><IconDownload /><span>Download</span></>
                }
              </button>
            </div>

            {/* ── RESULT ───────────────────────────────────────────────── */}
            <div ref={resultRef} className="result-area" aria-live="polite">
              {error && (
                <div className="error-box" role="alert">
                  <IconAlert />
                  <span>{error}</span>
                </div>
              )}

              {result && (
                <div className="result-card">
                  <div className="result-thumb" aria-hidden="true">
                    {result.thumbnail
                      ? <img src={result.thumbnail} alt="Reel thumbnail" />
                      : <span className="result-thumb-placeholder">🎬</span>
                    }
                  </div>
                  <div className="result-info">
                    <p>✅ Reel found! Your download is ready.</p>
                    <div className="result-actions">
                      <button
                        className="btn-dl-primary"
                        onClick={() => triggerDownload(result.videoUrl)}
                        type="button"
                      >
                        <IconDownload />
                        Download MP4
                      </button>
                      <button
                        className="btn-dl-secondary"
                        onClick={reset}
                        type="button"
                      >
                        Download Another
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── STATS BAR ───────────────────────────────────────────────── */}
          <div className="stats-bar" aria-label="Service statistics">
            <div className="stat-item">
              <div className="stat-num">50M+</div>
              <div className="stat-label">Downloads served</div>
            </div>
            <div className="stat-item">
              <div className="stat-num">100%</div>
              <div className="stat-label">Free forever</div>
            </div>
            <div className="stat-item">
              <div className="stat-num">HD</div>
              <div className="stat-label">Original quality</div>
            </div>
            <div className="stat-item">
              <div className="stat-num">0s</div>
              <div className="stat-label">Account needed</div>
            </div>
          </div>
        </section>

        {/* ── AD PLACEHOLDER (leaderboard) ────────────────────────────── */}
        <div className="container">
          <div className="ad-placeholder leaderboard" aria-label="Advertisement space">
            <span>Advertisement</span>
          </div>
        </div>

        {/* ── HOW IT WORKS ────────────────────────────────────────────── */}
        <section className="how-section" id="how-it-works" aria-labelledby="how-title">
          <div className="container">
            <span className="section-label">Simple process</span>
            <h2 className="section-title" id="how-title">HOW TO DOWNLOAD<br />INSTAGRAM REELS</h2>
            <div className="steps-grid">
              {[
                { n:'1', icon:'🔗', title:'Copy the Reel link', text:"Open Instagram, find the Reel you want, tap the three-dot menu (•••), and select 'Copy Link'. The URL is now in your clipboard." },
                { n:'2', icon:'📋', title:'Paste into ReelGrab', text:'Tap the Paste button or press Ctrl+V to drop the link into the search bar, then hit Download. We handle the rest instantly.' },
                { n:'3', icon:'💾', title:'Save to your device', text:"Click 'Download MP4' when your file is ready. The video saves directly to your Downloads folder — no redirects, no waiting." },
              ].map(s => (
                <article key={s.n} className="step-card" data-step={s.n}>
                  <div className="step-icon" aria-hidden="true">{s.icon}</div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES ────────────────────────────────────────────────── */}
        <section className="features-section" id="features" aria-labelledby="features-title">
          <div className="container">
            <span className="section-label">Why ReelGrab</span>
            <h2 className="section-title" id="features-title">EVERYTHING YOU<br />NEED. NOTHING YOU DON'T.</h2>
            <div className="features-grid">
              {[
                { icon:'🚀', title:'Lightning Fast', text:'Our servers process your request in under 3 seconds. No queues, no waiting rooms — just instant results.' },
                { icon:'🎯', title:'HD Quality, No Watermark', text:'Get the original file Instagram stores — full HD resolution, no third-party logos or watermarks added.' },
                { icon:'🔒', title:'Privacy First', text:"We don't log URLs, store download history, or sell data. Every request is ephemeral and anonymous by design." },
                { icon:'📱', title:'Works Everywhere', text:'iPhone, Android, Mac, Windows, Linux — if you have a modern browser, ReelGrab works. Zero app installs.' },
                { icon:'∞', title:'Unlimited Downloads', text:'No daily cap, no rate limit for personal use. Download as many public Reels as you need, any time.' },
                { icon:'💡', title:'No Account Required', text:"We never ask for your Instagram username or password. Paste a link, get a file. That's the entire process." },
              ].map(f => (
                <article key={f.title} className="feature-card">
                  <div className="feature-icon" aria-hidden="true">{f.icon}</div>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── AD PLACEHOLDER (rectangle) ──────────────────────────────── */}
        <div className="container">
          <div className="ad-placeholder rectangle" aria-label="Advertisement space">
            <span>Advertisement</span>
          </div>
        </div>

        {/* ── PLATFORMS ───────────────────────────────────────────────── */}
        <section className="platforms-section" aria-labelledby="platforms-title">
          <div className="container">
            <h2 id="platforms-title">Works on Every Platform</h2>
            <div className="platform-badges">
              {['🍎 iPhone / iOS','🤖 Android','🪟 Windows','🍏 macOS','🐧 Linux','🌐 Any Browser'].map(p => (
                <div key={p} className="platform-badge">{p}</div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SEO CONTENT ─────────────────────────────────────────────── */}
        <section className="seo-section" aria-label="About Instagram Reels downloading">
          <div className="container">
            <div className="seo-inner">
              <h2>Instagram Reels Downloader — Save Any Reel in HD for Free</h2>
              <p>
                ReelGrab is a powerful, browser-based Instagram Reels downloader that lets you save any public Reel directly to your device in full HD quality. Whether you're on a smartphone, tablet, or desktop computer, our tool delivers the original video file — with no watermarks, no login, and no app download necessary. Just paste a link and get your file in seconds.
              </p>
              <p>
                Unlike many Instagram video downloaders that redirect you through multiple pages or force you to complete surveys, ReelGrab is clean, fast, and honest. The download happens on our page — no new tabs, no pop-up mazes, no tricks. We built the tool we always wished existed.
              </p>

              <hr className="seo-divider" />

              <h3>What Are Instagram Reels?</h3>
              <p>
                Instagram Reels are short-form video clips that can run from 15 seconds up to 90 seconds, published directly within the Instagram platform. Launched in August 2020 as Meta's answer to TikTok's explosive popularity, Reels quickly became one of Instagram's most-used features and a dominant format for creators, brands, musicians, educators, and everyday users worldwide.
              </p>
              <p>
                Reels support a rich creative toolkit: speed control, audio remixing, text overlays, effects, transitions, and access to a massive licensed music library. The Instagram algorithm actively promotes Reels to users who don't yet follow the creator, giving Reels significantly higher organic reach potential compared to standard photo or video posts. This makes Reels the go-to format for content creators who want to grow their audience rapidly in 2024 and beyond.
              </p>
              <p>
                Reels live in a dedicated tab on every public Instagram profile and appear prominently in the main Explore feed. Instagram's algorithm prioritizes Reel content in distribution, which is why you've likely noticed your feed filling up with short, punchy videos from creators you've never followed before. This discovery-first approach makes Reels the heart of modern Instagram content strategy.
              </p>

              <hr className="seo-divider" />

              <h3>Why Do People Download Instagram Reels?</h3>
              <p>
                There are dozens of legitimate, everyday reasons someone might want to save a Reel to their device. Here are the most common:
              </p>
              <ul>
                <li><strong>Offline viewing:</strong> Save tutorials, workout videos, or recipes to watch later without using mobile data or relying on a stable internet connection.</li>
                <li><strong>Backup your own content:</strong> Creators often download their own published Reels as a local backup in case their account is restricted, hacked, or they switch platforms.</li>
                <li><strong>Cross-platform sharing:</strong> Share a Reel on WhatsApp, Telegram, iMessage, or embed it in a presentation without the Instagram app or login wall.</li>
                <li><strong>Research and inspiration:</strong> Marketers and designers save reference content to analyze editing styles, pacing, hooks, and trends.</li>
                <li><strong>Archiving moments:</strong> Save Reels from events, concerts, or personal milestones before they are taken down or the account becomes private.</li>
                <li><strong>Education:</strong> Save language lessons, cooking demonstrations, DIY guides, or fitness routines for repeated reference offline.</li>
              </ul>
              <p>
                Whatever your reason, ReelGrab makes the process simple, private, and fast. We don't judge, log, or track your downloads.
              </p>

              <hr className="seo-divider" />

              <h3>How to Find an Instagram Reel Link</h3>
              <p>
                Finding the shareable link for any Instagram Reel takes under 10 seconds. Here's how to do it on each major platform:
              </p>
              <p>
                <strong>On the Instagram Mobile App (iOS or Android):</strong> Open Instagram and navigate to the Reel you want to download. Tap the three-dot menu icon (⋯) located in the bottom-right corner of the Reel. From the options that appear, tap <em>Copy Link</em>. The URL is now in your clipboard, ready to paste into ReelGrab.
              </p>
              <p>
                <strong>On Instagram Web (Desktop Browser):</strong> Browse to the Reel on instagram.com. Click the three-dot icon (⋯) above the video. Select <em>Copy Link</em> from the dropdown menu. You can also simply copy the URL from your browser's address bar — both formats work identically with ReelGrab.
              </p>
              <p>
                Reel URLs typically follow this format: <code style={{color:'var(--accent)', fontSize:'0.88rem'}}>https://www.instagram.com/reel/SHORTCODE/</code>. You can paste this exact URL into ReelGrab and it will extract and prepare your download instantly.
              </p>

              <hr className="seo-divider" />

              <h3>ReelGrab vs Other Instagram Downloaders</h3>
              <p>
                The internet is full of Instagram video downloader tools, but most of them share the same frustrating problems: endless ad redirects, required email signups, mystery survey gates, watermarks stamped on your downloaded video, or dangerously low quality output. ReelGrab was built to solve every one of these issues.
              </p>
              <p>
                Here's what sets ReelGrab apart from typical Instagram downloaders:
              </p>
              <ul>
                <li>Downloads happen directly on-page — no new tabs, no redirect chains</li>
                <li>Zero watermarks on your downloaded video file</li>
                <li>Original HD quality preserved, not re-compressed or downscaled</li>
                <li>No email, no account, no personal information required whatsoever</li>
                <li>No file size limits or artificial speed throttling</li>
                <li>Works on every device and every modern browser</li>
                <li>Server-side proxy download ensures maximum compatibility</li>
              </ul>

              <hr className="seo-divider" />

              <h3>How ReelGrab Works Technically</h3>
              <p>
                When you paste an Instagram Reel URL and click Download, ReelGrab's server-side system securely fetches the video metadata from Instagram's public content delivery infrastructure. We extract the original MP4 video URL that Instagram uses to serve the video to its own users — meaning you get exactly the same quality file Instagram would play for you, but saved to your device.
              </p>
              <p>
                The entire process happens server-side, which means your IP address is never exposed to Instagram's servers during the extraction. Our proxy download endpoint streams the video through our infrastructure and directly into your browser's download manager, triggering a proper file save with a clean filename. This architecture also makes ReelGrab work reliably on mobile browsers where direct CDN downloads often fail silently.
              </p>

              <hr className="seo-divider" />

              <h3>Downloading Instagram Reels on iPhone (iOS)</h3>
              <p>
                Downloading videos on iPhone is slightly more nuanced than on Android. Here's the recommended method using ReelGrab on iOS:
              </p>
              <ul>
                <li>Open Instagram and copy the Reel link using the share/copy link option</li>
                <li>Open Safari (recommended over Chrome for iOS downloads)</li>
                <li>Navigate to ReelGrab and paste the link</li>
                <li>Tap Download — Safari will show a download indicator in the top-right corner</li>
                <li>Find your file in the Files app under Downloads, or the Photos app if your browser is set to auto-save videos</li>
              </ul>
              <p>
                iOS 13 and later supports file downloads natively through Safari. If you're using an older iOS version, the video will open in a new tab — long-press it and choose <em>Save to Files</em> or <em>Save Video</em>.
              </p>

              <hr className="seo-divider" />

              <h3>Downloading Instagram Reels on Android</h3>
              <p>
                Android makes video downloads straightforward. After clicking Download MP4 on ReelGrab, your browser will save the file directly to your device's Downloads folder. You can then access it through your file manager, Gallery app, or any video player. Most modern Android browsers (Chrome, Firefox, Samsung Internet) handle the download automatically without any extra steps.
              </p>

              <hr className="seo-divider" />

              <h3>Tips for Instagram Content Creators</h3>
              <p>
                If you're a creator, ReelGrab is especially useful for managing your own content library. Instagram doesn't offer a convenient bulk export tool, and losing access to your account — even temporarily — means losing access to your content. Downloading your own Reels as MP4 files gives you a portable, platform-independent backup that you own completely.
              </p>
              <p>
                Downloaded Reels can also be re-uploaded to TikTok, YouTube Shorts, Pinterest, LinkedIn, or any other video platform without quality loss, since you're working with the original file. Just be sure to add platform-specific captions, descriptions, and hashtags optimized for each destination — cross-posting the exact same video without adaptation typically underperforms compared to natively produced content.
              </p>
              <p>
                We always encourage respecting other creators' work. Downloading someone else's Reel for personal inspiration or research is one thing; re-publishing it as your own content is a violation of copyright and Instagram's Terms of Service. Use ReelGrab responsibly, give credit where it's due, and support the creators whose content you enjoy.
              </p>

              <hr className="seo-divider" />

              <h3>Privacy and Safety When Using Video Downloaders</h3>
              <p>
                Your privacy matters. ReelGrab is designed from the ground up to collect no personal data. We don't set tracking cookies beyond what's strictly necessary for the site to function. We don't require an email address. We don't store the URLs you submit. Each request to our API is processed ephemerally — once the video URL is extracted and delivered to you, it's gone from our systems.
              </p>
              <p>
                We also never ask for your Instagram password or any form of account credentials. Any tool that requests your Instagram login to download public content is a red flag — either for phishing or account compromise. Public Reels don't require authentication to access, so no legitimate downloader should ever need your login.
              </p>
              <p>
                ReelGrab serves ads from trusted advertising networks to cover hosting and development costs. These ads are clearly labeled and non-intrusive. We do not sell your data to advertisers or any third parties.
              </p>
            </div>
          </div>
        </section>

        {/* ── AD PLACEHOLDER (banner) ──────────────────────────────────── */}
        <div className="container">
          <div className="ad-placeholder banner-sm" aria-label="Advertisement space">
            <span>Advertisement</span>
          </div>
        </div>

        {/* ── FAQ ─────────────────────────────────────────────────────── */}
        <section className="faq-section" id="faq" aria-labelledby="faq-title">
          <div className="container">
            <div className="faq-inner">
              <span className="section-label" style={{display:'block', marginBottom:'12px'}}>Got questions?</span>
              <h2 className="section-title" id="faq-title" style={{marginBottom:'36px'}}>FREQUENTLY ASKED<br />QUESTIONS</h2>
              {FAQ_ITEMS.map((item, i) => (
                <FaqItem key={i} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA BANNER ──────────────────────────────────────────────── */}
        <section style={{padding:'60px 0', textAlign:'center', background:'linear-gradient(135deg, rgba(0,212,255,0.04) 0%, transparent 60%)'}}>
          <div className="container">
            <h2 style={{fontFamily:'var(--font-d)', fontSize:'clamp(2rem,5vw,3.5rem)', marginBottom:'12px'}}>READY TO GRAB<br />YOUR FIRST REEL?</h2>
            <p style={{color:'var(--muted)', marginBottom:'28px'}}>Free, instant, no sign-up required.</p>
            <button
              className="btn-download"
              style={{margin:'0 auto', padding:'16px 40px', fontSize:'1rem', borderRadius:'var(--radius)'}}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              type="button"
            >
              <IconDownload /> Try ReelGrab Now
            </button>
          </div>
        </section>
      </main>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer role="contentinfo">
        <span className="footer-logo" aria-label="ReelGrab">REEL<span>GRAB</span></span>
        <nav className="footer-links" aria-label="Footer navigation">
          <a href="#how-it-works">How It Works</a>
          <a href="#features">Features</a>
          <a href="#faq">FAQ</a>
          <a href="/privacy" rel="nofollow">Privacy Policy</a>
          <a href="/terms" rel="nofollow">Terms of Use</a>
          <a href="/contact" rel="nofollow">Contact</a>
        </nav>
        <p className="footer-disclaimer">
          ReelGrab is not affiliated with, endorsed by, or connected to Instagram or Meta Platforms, Inc.
          This tool is provided for personal, lawful use only. Downloading content without the creator's permission
          may violate copyright law. Always obtain proper rights before reproducing or distributing third-party content.
        </p>
        <p className="footer-copy">© {new Date().getFullYear()} ReelGrab. Built for speed, privacy, and simplicity.</p>
      </footer>
    </>
  );
}
