/**
 * ReelGrab — Download API
 *
 * Uses Cobalt (cobalt.tools) — free, open source, no API key needed.
 * Same approach used in TikTok downloaders. Supports Instagram natively.
 * https://cobalt.tools / https://github.com/imputnet/cobalt
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { url } = req.body ?? {};
  if (!url) return res.status(400).json({ error: 'No URL provided.' });

  const clean     = url.trim();
  const shortcode = extractShortcode(clean);

  if (!shortcode) {
    return res.status(400).json({
      error: 'Invalid Instagram URL. Example: https://www.instagram.com/reel/ABC123/',
    });
  }

  const igUrl = `https://www.instagram.com/reel/${shortcode}/`;

  // Try strategies in order — first working result wins
  const strategies = [
    () => tryCobaltV2(igUrl, shortcode),
    () => tryCobaltV1(igUrl, shortcode),
    () => tryEmbedParse(shortcode),
  ];

  for (const run of strategies) {
    try {
      const result = await run();
      if (result?.videoUrl) {
        return res.status(200).json({ success: true, data: result });
      }
    } catch (e) {
      console.error('[strategy]', e.message);
    }
  }

  return res.status(404).json({
    error: 'Could not extract this reel. It may be private or Instagram may have changed something. Try again in a moment.',
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractShortcode(url) {
  const m = url.match(/instagram\.com\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/);
  return m?.[1] ?? null;
}

function cleanUrl(str) {
  return str.replace(/\\u0026/g, '&').replace(/\\\//g, '/').replace(/&amp;/g, '&');
}

// ─── Strategy 1: Cobalt API v2 (current) ─────────────────────────────────────
// https://api.cobalt.tools/
// No auth, no key — completely free and open

async function tryCobaltV2(igUrl, shortcode) {
  const r = await fetch('https://api.cobalt.tools/', {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept':       'application/json',
    },
    body:   JSON.stringify({ url: igUrl }),
    signal: AbortSignal.timeout(15000),
  });

  if (!r.ok) throw new Error(`Cobalt v2: HTTP ${r.status}`);
  const j = await r.json();

  // Single video: status = "redirect" or "tunnel"
  if ((j.status === 'redirect' || j.status === 'tunnel' || j.status === 'stream') && j.url) {
    return { videoUrl: j.url, thumbnail: null, shortcode };
  }

  // Carousel / multiple: status = "picker"
  if (j.status === 'picker' && Array.isArray(j.picker)) {
    const video = j.picker.find(p => p.type === 'video' || p.url?.includes('.mp4'));
    if (video?.url) return { videoUrl: video.url, thumbnail: null, shortcode };
  }

  return null;
}

// ─── Strategy 2: Cobalt API v1 (older endpoint, still active) ────────────────
// https://co.wuk.sh/api/json

async function tryCobaltV1(igUrl, shortcode) {
  const r = await fetch('https://co.wuk.sh/api/json', {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept':       'application/json',
    },
    body:   JSON.stringify({ url: igUrl }),
    signal: AbortSignal.timeout(15000),
  });

  if (!r.ok) throw new Error(`Cobalt v1: HTTP ${r.status}`);
  const j = await r.json();

  if ((j.status === 'redirect' || j.status === 'stream' || j.status === 'tunnel') && j.url) {
    return { videoUrl: j.url, thumbnail: null, shortcode };
  }

  if (j.status === 'picker' && Array.isArray(j.picker)) {
    const video = j.picker.find(p => p.type === 'video' || p.url?.includes('.mp4'));
    if (video?.url) return { videoUrl: video.url, thumbnail: null, shortcode };
  }

  return null;
}

// ─── Strategy 3: Instagram embed page parse ───────────────────────────────────
// Direct scrape of Instagram's embed page via a CORS proxy.
// No auth needed — Instagram's embed is public.

async function tryEmbedParse(shortcode) {
  const embedUrl = `https://www.instagram.com/reel/${shortcode}/embed/captioned/`;

  // allorigins is a free CORS proxy — fetches the page from their servers
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(embedUrl)}`;

  const r = await fetch(proxyUrl, { signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`allorigins: HTTP ${r.status}`);

  const j    = await r.json();
  const html = j?.contents ?? '';
  if (!html) return null;

  // Multiple patterns to extract video URL from embed HTML
  const patterns = [
    /"video_url":"(https:[^"]+)"/,
    /src="(https:\/\/[^"]*scontent[^"]*\.mp4[^"]*)"/,
    /"contentUrl"\s*:\s*"(https:[^"]+\.mp4[^"]*)"/,
    /property="og:video" content="(https:[^"]+)"/,
    /videoSrc\s*=\s*"(https:[^"]+\.mp4[^"]*)"/,
    /"playback_url":"(https:[^"]+)"/,
  ];

  for (const re of patterns) {
    const m = html.match(re);
    if (m) {
      const videoUrl = cleanUrl(m[1]);
      const thumbM   = html.match(/property="og:image" content="(https:[^"]+)"/) ||
                       html.match(/"display_url":"(https:[^"]+)"/);
      const thumbnail = thumbM ? cleanUrl(thumbM[1]) : null;
      return { videoUrl, thumbnail, shortcode };
    }
  }

  return null;
}
