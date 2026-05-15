export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Please provide a valid Instagram URL.' });
  }

  const shortcode = extractShortcode(url.trim());
  if (!shortcode) {
    return res.status(400).json({
      error: 'Invalid Instagram URL. Paste a link like: https://www.instagram.com/reel/ABC123/',
    });
  }

  try {
    const result = await getInstagramData(shortcode);
    if (!result || !result.videoUrl) {
      return res.status(404).json({
        error: 'Could not extract video. The reel may be private, deleted, or Instagram may have updated their API.',
      });
    }
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('[download] error:', err.message);
    return res.status(500).json({ error: 'Server error. Please try again in a moment.' });
  }
}

// ─── URL parsing ─────────────────────────────────────────────────────────────

function extractShortcode(url) {
  const patterns = [
    /instagram\.com\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/,
    /instagr\.am\/p\/([A-Za-z0-9_-]+)/,
    /^([A-Za-z0-9_-]{10,12})$/, // raw shortcode
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

// ─── Shared fetch headers ─────────────────────────────────────────────────────

function browserHeaders(extra = {}) {
  return {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    ...extra,
  };
}

// ─── Helper: clean escaped URLs ──────────────────────────────────────────────

function cleanUrl(raw) {
  return raw
    .replace(/\\u0026/g, '&')
    .replace(/\\\//g, '/')
    .replace(/&amp;/g, '&');
}

// ─── Strategy orchestrator ───────────────────────────────────────────────────

async function getInstagramData(shortcode) {
  const strategies = [fetchEmbedPage, fetchApiParam, fetchMainPage];
  for (const strategy of strategies) {
    try {
      const result = await strategy(shortcode);
      if (result?.videoUrl) return result;
    } catch (e) {
      console.error(`[strategy:${strategy.name}] failed:`, e.message);
    }
  }
  return null;
}

// ─── Strategy 1: embed/captioned page ────────────────────────────────────────

async function fetchEmbedPage(shortcode) {
  const variants = [
    `https://www.instagram.com/reel/${shortcode}/embed/captioned/`,
    `https://www.instagram.com/p/${shortcode}/embed/captioned/`,
    `https://www.instagram.com/reel/${shortcode}/embed/`,
  ];

  for (const embedUrl of variants) {
    const res = await fetch(embedUrl, {
      headers: browserHeaders({ Referer: 'https://www.instagram.com/' }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) continue;
    const html = await res.text();

    const videoPatterns = [
      /src="(https:\/\/[^"]*scontent[^"]*\.mp4[^"]*)"/,
      /"video_url":"(https:[^"]+)"/,
      /videoUrl&quot;:&quot;(https:[^&]+)&quot;/,
      /"contentUrl"\s*:\s*"(https:[^"]+\.mp4[^"]*)"/,
      /\\"video_url\\":\\"(https:[^"]+)\\"/,
      /data-video-url="(https:[^"]+)"/,
    ];

    for (const re of videoPatterns) {
      const m = html.match(re);
      if (m) {
        const videoUrl = cleanUrl(m[1]);
        const thumb = extractThumbnail(html);
        return { videoUrl, thumbnail: thumb, shortcode };
      }
    }
  }
  return null;
}

// ─── Strategy 2: ?__a=1 API param ────────────────────────────────────────────

async function fetchApiParam(shortcode) {
  const endpoints = [
    `https://www.instagram.com/reel/${shortcode}/?__a=1&__d=dis`,
    `https://www.instagram.com/p/${shortcode}/?__a=1&__d=dis`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: browserHeaders({
          Accept: 'application/json, text/javascript, */*; q=0.01',
          'X-Requested-With': 'XMLHttpRequest',
          Referer: 'https://www.instagram.com/',
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const json = await res.json();
      const media =
        json?.graphql?.shortcode_media ||
        json?.items?.[0] ||
        json?.data?.shortcode_media;
      if (!media) continue;
      if (media.video_url) {
        return {
          videoUrl: media.video_url,
          thumbnail: media.display_url || media.thumbnail_url || null,
          shortcode,
        };
      }
    } catch (_) {}
  }
  return null;
}

// ─── Strategy 3: main page HTML parse ────────────────────────────────────────

async function fetchMainPage(shortcode) {
  const res = await fetch(`https://www.instagram.com/reel/${shortcode}/`, {
    headers: browserHeaders(),
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) return null;
  const html = await res.text();

  const videoPatterns = [
    /"video_url":"(https:[^"]+)"/,
    /"contentUrl":"(https:[^"]+\.mp4[^"]*)"/,
    /property="og:video" content="(https:[^"]+)"/,
    /<meta[^>]+content="(https:[^"]+\.mp4[^"]*)"[^>]*>/,
  ];

  for (const re of videoPatterns) {
    const m = html.match(re);
    if (m) {
      return {
        videoUrl: cleanUrl(m[1]),
        thumbnail: extractThumbnail(html),
        shortcode,
      };
    }
  }
  return null;
}

// ─── Thumbnail extraction helper ─────────────────────────────────────────────

function extractThumbnail(html) {
  const patterns = [
    /property="og:image" content="(https:[^"]+)"/,
    /"display_url":"(https:[^"]+)"/,
    /"thumbnail_url":"(https:[^"]+)"/,
    /src="(https:\/\/[^"]*scontent[^"]*\.(jpg|jpeg|png)[^"]*)"/,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return cleanUrl(m[1]);
  }
  return null;
}
