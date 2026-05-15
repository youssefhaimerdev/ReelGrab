/**
 * ReelGrab — Download API
 *
 * Uses the instagram120 RapidAPI (the one you subscribed to).
 * Add your key to Vercel: Settings → Environment Variables
 *   Name:  RAPIDAPI_KEY
 *   Value: (your key from the RapidAPI dashboard)
 */

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { url } = req.body ?? {};
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'No URL provided.' });
  }

  const clean     = url.trim();
  const shortcode = extractShortcode(clean);

  if (!shortcode) {
    return res.status(400).json({
      error: 'Invalid Instagram link. Paste a URL like: https://www.instagram.com/reel/ABC123/',
    });
  }

  if (!RAPIDAPI_KEY) {
    return res.status(503).json({
      error: 'RAPIDAPI_KEY not set. Add it to Vercel Environment Variables and redeploy.',
    });
  }

  const canonicalUrl = `https://www.instagram.com/reel/${shortcode}/`;

  // Try all strategies in order, return first one that works
  const strategies = [
    () => instagram120_reels(canonicalUrl, shortcode),
    () => instagram120_mediaInfo(shortcode),
    () => instagram120_postInfo(canonicalUrl),
    () => herosAPI_fallback(shortcode),
  ];

  for (const run of strategies) {
    try {
      const result = await run();
      if (result?.videoUrl) {
        return res.status(200).json({ success: true, data: result });
      }
    } catch (err) {
      console.error('[strategy error]', err.message);
    }
  }

  return res.status(404).json({
    error: 'Could not extract video. The reel may be private or temporarily unavailable.',
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractShortcode(url) {
  const m = url.match(/instagram\.com\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/);
  return m?.[1] ?? null;
}

function ig120Headers() {
  return {
    'Content-Type':   'application/json',
    'x-rapidapi-host': 'instagram120.p.rapidapi.com',
    'x-rapidapi-key':  RAPIDAPI_KEY,
  };
}

function parseVideoFromResponse(json) {
  if (!json) return null;

  // Walk common response shapes from different IG APIs
  const candidates = [
    json?.video_url,
    json?.data?.video_url,
    json?.media?.video_url,
    json?.items?.[0]?.video_url,
    json?.graphql?.shortcode_media?.video_url,
    json?.result?.video_url,
    json?.url,
    json?.download_url,
    // Array of media links — pick mp4
    ...(Array.isArray(json?.links)
      ? json.links.filter(l => l?.link?.includes('.mp4')).map(l => l.link)
      : []),
    ...(Array.isArray(json?.medias)
      ? json.medias.filter(m => m?.url?.includes('.mp4')).map(m => m.url)
      : []),
  ];

  return candidates.find(v => typeof v === 'string' && v.startsWith('http')) ?? null;
}

function parseThumbnailFromResponse(json) {
  if (!json) return null;
  const candidates = [
    json?.thumbnail_url,
    json?.thumbnail,
    json?.display_url,
    json?.data?.thumbnail_url,
    json?.data?.display_url,
    json?.image_url,
    json?.cover,
    json?.items?.[0]?.image_versions2?.candidates?.[0]?.url,
  ];
  return candidates.find(v => typeof v === 'string' && v.startsWith('http')) ?? null;
}

// ─── Strategy 1: instagram120 — /api/instagram/reels ─────────────────────────
// POST with reel URL — most likely endpoint for what we need

async function instagram120_reels(canonicalUrl, shortcode) {
  const res = await fetch('https://instagram120.p.rapidapi.com/api/instagram/reels', {
    method: 'POST',
    headers: ig120Headers(),
    body: JSON.stringify({ url: canonicalUrl }),
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) throw new Error(`reels endpoint: HTTP ${res.status}`);
  const json = await res.json();

  const videoUrl = parseVideoFromResponse(json);
  if (!videoUrl) return null;
  return { videoUrl, thumbnail: parseThumbnailFromResponse(json), shortcode };
}

// ─── Strategy 2: instagram120 — /api/instagram/media_info ────────────────────
// Some IG APIs expose a media_info or post_info endpoint by shortcode

async function instagram120_mediaInfo(shortcode) {
  // Try shortcode-based lookup
  const endpoints = [
    `https://instagram120.p.rapidapi.com/api/instagram/media_info`,
    `https://instagram120.p.rapidapi.com/api/instagram/post_detail`,
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: ig120Headers(),
        body: JSON.stringify({ shortcode }),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) continue;
      const json = await res.json();
      const videoUrl = parseVideoFromResponse(json);
      if (videoUrl) return { videoUrl, thumbnail: parseThumbnailFromResponse(json), shortcode };
    } catch (_) {
      continue;
    }
  }
  return null;
}

// ─── Strategy 3: instagram120 — /api/instagram/post ──────────────────────────

async function instagram120_postInfo(canonicalUrl) {
  const endpoints = [
    'https://instagram120.p.rapidapi.com/api/instagram/post',
    'https://instagram120.p.rapidapi.com/api/instagram/reel',
    'https://instagram120.p.rapidapi.com/api/instagram/video',
  ];

  const shortcode = extractShortcode(canonicalUrl);

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: ig120Headers(),
        body: JSON.stringify({ url: canonicalUrl }),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) continue;
      const json = await res.json();
      const videoUrl = parseVideoFromResponse(json);
      if (videoUrl) return { videoUrl, thumbnail: parseThumbnailFromResponse(json), shortcode };
    } catch (_) {
      continue;
    }
  }
  return null;
}

// ─── Strategy 4: herosAPI fallback (instagram-scraper-api2) ──────────────────
// Different host — same RapidAPI key works across all subscribed APIs

async function herosAPI_fallback(shortcode) {
  const res = await fetch(
    `https://instagram-scraper-api2.p.rapidapi.com/v1/post_info?code_or_id_or_url=${encodeURIComponent(shortcode)}`,
    {
      method: 'GET',
      headers: {
        'x-rapidapi-key':  RAPIDAPI_KEY,
        'x-rapidapi-host': 'instagram-scraper-api2.p.rapidapi.com',
      },
      signal: AbortSignal.timeout(12000),
    }
  );

  if (!res.ok) throw new Error(`herosAPI: HTTP ${res.status}`);
  const json = await res.json();
  const item = json?.data;
  if (!item?.video_url) return null;

  return {
    videoUrl:  item.video_url,
    thumbnail: item.thumbnail_url ?? item.display_url ?? null,
    shortcode,
  };
}
