# ReelGrab — Instagram Reels Downloader

A fast, clean, SEO-optimised Instagram Reels downloader built with Next.js, ready to deploy on Vercel in one click.

## Features

- Multi-strategy Instagram extraction (embed page → API param → main page HTML)
- Server-side proxy download — works on all browsers including iOS Safari
- Dark electric design with Bebas Neue + Plus Jakarta Sans
- Fully mobile-responsive
- 2,000+ words of SEO content
- Structured data (JSON-LD) for rich search results
- Ad placeholder slots (leaderboard, rectangle, banner)
- 10-question FAQ with accordion
- Zero personal data collection

## Quick Deploy to Vercel

### Option 1 — Vercel CLI (recommended)

```bash
npm i -g vercel
cd reelgrab
npm install
vercel
```

Follow the prompts. Vercel auto-detects Next.js and configures everything.

### Option 2 — Vercel Dashboard

1. Push this folder to a GitHub/GitLab repo
2. Go to [vercel.com](https://vercel.com) → New Project
3. Import your repo
4. Click Deploy (no env variables needed)

### Option 3 — Local dev

```bash
npm install
npm run dev
# → http://localhost:3000
```

## Project Structure

```
reelgrab/
├── pages/
│   ├── index.js          # Main page (hero, form, SEO, FAQ)
│   ├── _app.js           # Global styles loader
│   ├── _document.js      # HTML head (fonts, meta)
│   └── api/
│       ├── download.js   # Instagram extraction API (3 strategies)
│       └── proxy.js      # Video proxy (streams through our server)
├── styles/
│   └── globals.css       # All styles (dark theme, mobile-first)
├── next.config.js
├── vercel.json           # Function timeout config (30s)
└── package.json
```

## Adding Real Ads

Replace the `.ad-placeholder` divs in `pages/index.js` with your AdSense or preferred ad network tags:

```jsx
// Replace this:
<div className="ad-placeholder leaderboard">Advertisement</div>

// With your ad tag, e.g. Google AdSense:
<ins className="adsbygoogle"
  style={{ display: 'block' }}
  data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
  data-ad-slot="XXXXXXXXXX"
  data-ad-format="auto"
  data-full-width-responsive="true" />
```

Load the AdSense script in `pages/_document.js` inside `<Head>`.

## Customisation

| File | What to change |
|---|---|
| `pages/index.js` | Site name, tagline, stats, features, FAQ content |
| `styles/globals.css` | Colours (CSS variables at top of file), fonts |
| `pages/_document.js` | Favicon, analytics scripts |
| `pages/api/download.js` | Extraction strategies, headers |
| `vercel.json` | Function timeout (max 30s on Hobby, 60s on Pro) |

## Changing the Brand Name

Search and replace `ReelGrab` / `REELGRAB` / `reelgrab` in:
- `pages/index.js` (title, meta, footer)
- `pages/api/proxy.js` (filename in Content-Disposition)
- `package.json` (name field)

## SEO Notes

- Update the canonical URL in `pages/index.js` Head from `https://reelgrab.app` to your actual domain
- Set up Google Search Console and submit the sitemap
- Add `pages/sitemap.xml.js` for a dynamic sitemap (optional)
- The JSON-LD structured data is already configured for WebApplication schema

## Legal

This tool is provided for personal, lawful use only. Downloading third-party Instagram content without the creator's permission may violate copyright law and Instagram's Terms of Service. Add/update the Privacy Policy and Terms pages before going live.

## License

MIT — do whatever you want, just don't be evil.
