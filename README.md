# ReelGrab — Instagram Reels Downloader

Fast, clean Next.js Instagram Reels downloader. Deployed on Vercel.

---

## ⚡ Get Downloads Working — 2 Minutes

Vercel's server IPs are datacenter IPs Instagram blocks outright.
The solution (same one all major downloader sites use) is a RapidAPI layer.

### Step 1 — Free RapidAPI key

1. Create free account at **https://rapidapi.com**
2. Open: **https://rapidapi.com/herosAPI/api/instagram-scraper-api2**
3. Click **Subscribe to Test** → pick **FREE plan** (500 req/month, no card needed)
4. Right panel → **Header Parameters** → copy the `X-RapidAPI-Key` value

### Step 2 — Add to Vercel

Vercel Dashboard → **Settings → Environment Variables → Add New**

| Name | Value |
|---|---|
| `RAPIDAPI_KEY` | your key from Step 1 |

Then **Deployments → Redeploy**. Done — downloads work immediately.

### Local dev

```bash
cp .env.local.example .env.local   # paste your key inside
npm install
npm run dev                         # http://localhost:3000
```

---

## Deploy from scratch

```bash
npm i -g vercel
npm install
vercel          # follow prompts, then add RAPIDAPI_KEY in dashboard
```

Or: push repo to GitHub → import in Vercel dashboard → add env var → deploy.

---

## Project structure

```
reelgrab/
├── pages/
│   ├── index.js              # Hero, search form, results, SEO content, FAQ
│   ├── _app.js               # Global CSS
│   ├── _document.js          # Fonts, Google Analytics, favicon, Search Console
│   ├── sitemap.xml.js        # /sitemap.xml
│   ├── robots.txt.js         # /robots.txt
│   └── api/
│       ├── download.js       # RapidAPI scraper — 3 strategies, auto-fallback
│       └── proxy.js          # Streams video through server (fixes iOS Safari)
├── styles/globals.css         # Full dark-theme CSS, mobile-first
├── public/
│   ├── favicon.svg
│   ├── apple-touch-icon.png
│   └── google030d394dae3fee69.html
├── .env.local.example
├── vercel.json               # 30s function timeout
└── package.json
```

---

## How the download flow works

```
1. User pastes Reel URL → clicks Download
2. POST /api/download  →  extract shortcode
3. Call RapidAPI (instagram-scraper-api2)
4.   └─ if that fails → try backup RapidAPI provider automatically
5. Return { videoUrl, thumbnail } to the browser
6. User clicks "Download MP4"
7. GET /api/proxy?url=VIDEO_URL
8. Proxy adds correct headers, forces download → file saved to device
```

The proxy step ensures downloads work on all browsers including iOS Safari,
which refuses direct CDN downloads without correct Referer headers.

---

## Swap in real ads

Replace the `ad-placeholder` divs in `pages/index.js`:

```jsx
// swap this ↓
<div className="ad-placeholder leaderboard">Advertisement</div>

// for this ↓
<ins className="adsbygoogle"
  style={{ display: 'block' }}
  data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
  data-ad-slot="XXXXXXXXXX"
  data-ad-format="auto"
  data-full-width-responsive="true" />
```

Add the AdSense `<script>` tag in `pages/_document.js` inside `<Head>`.

---

## Changing your domain

If you move off Vercel's subdomain, find-replace `reel-grab-teal.vercel.app` in:
- `pages/index.js` (3 places — canonical + JSON-LD)
- `pages/sitemap.xml.js`
- `pages/robots.txt.js`

---

## RapidAPI limits

| Plan | Requests | Cost |
|---|---|---|
| Free | 500/month | $0 |
| Basic | 5,000/month | ~$9 |
| Pro | 50,000/month | ~$29 |

Upgrade in the RapidAPI dashboard — no code changes needed, same key.
If you want to switch providers, update the host/endpoint in `pages/api/download.js`.

---

## Environment variables

| Variable | Required | Where to get it |
|---|---|---|
| `RAPIDAPI_KEY` | ✅ | rapidapi.com → your app → Header Parameters |

---

## Legal

Personal, lawful use only. Create `/pages/privacy.js` and `/pages/terms.js` before launch.
ReelGrab is not affiliated with Instagram or Meta Platforms, Inc.
