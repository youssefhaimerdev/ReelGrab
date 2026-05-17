/**
 * ReelGrab — Download API
 *
 * Uses Instagram's own mobile API endpoint — same method real apps use.
 * Requires one env variable: INSTAGRAM_SESSION (free, takes 60 seconds to set up).
 *
 * ── HOW TO GET YOUR SESSION COOKIE (one-time, 60 seconds) ────────────────────
 * 1. Open Chrome and go to instagram.com — log in if needed
 * 2. Press F12 → Application tab → Cookies → https://www.instagram.com
 * 3. Find the row named "sessionid" — copy its Value
 * 4. In Vercel: Settings → Environment Variables → Add New:
 *      Name:  INSTAGRAM_SESSION
 *      Value: sessionid=PASTE_YOUR_VALUE_HERE
 * 5. Redeploy → downloads work instantly
 *
 * The cookie lasts months and only needs refreshing if you log out of Instagram.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const SESSION = process.env.INSTAGRAM_SESSION;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { url } = req.body ?? {};
  if (!url) return res.status(400).json({ error: 'No URL provided.' });

  const sc = url.trim().match(
    /instagram\.com\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/
  )?.[1];

  if (!sc) {
    return res.status(400).json({
      error: 'Invalid Instagram URL. Example: https://www.instagram.com/reel/ABC123/',
    });
  }

  if (!SESSION) {
    return res.status(503).json({
      error:
        'INSTAGRAM_SESSION not set. Add your Instagram sessionid cookie to Vercel Environment Variables — see README for the 60-second setup.',
      setup: true,
    });
  }

  // Try strategies in order
  const strategies = [
    () => fetchViaMobileAPI(sc),
    () => fetchViaWebAPI(sc),
    () => fetchViaEmbed(sc),
  ];

  for (const run of strategies) {
    try {
      const result = await run();
      if (result?.videoUrl) {
        return res.status(200).json({ success: true, data: result });
      }
    } catch (e) {
      console.error('[strategy error]', e.message);
    }
  }

  return res.status(404).json({
    error:
      'Could not extract video. The reel may be private, or your session cookie may have expired — refresh it from Instagram.',
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Convert shortcode → numeric media ID (Instagram's internal format) */
function shortcodeToId(code) {
  const CHARS =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let id = BigInt(0);
  for (const char of code) {
    id = id * 64n + BigInt(CHARS.indexOf(char));
  }
  return id.toString();
}

function csrfFromSession(session) {
  return session.match(/csrftoken=([^;]+)/)?.[1] ?? 'missing';
}

function mobileHeaders() {
  return {
    'User-Agent':
      'Instagram 275.0.0.27.98 Android (33/13; 420dpi; 1080x2400; samsung; SM-G991B; o1s; exynos2100; en_US; 458229237)',
    'Cookie':          SESSION,
    'X-IG-App-ID':     '567067343352427',
    'X-IG-Capabilities': '3brTvwE=',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept':          '*/*',
  };
}

function webHeaders() {
  return {
    'User-Agent':
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'Cookie':       SESSION,
    'X-CSRFToken':  csrfFromSession(SESSION),
    'X-IG-App-ID':  '936619743392459',
    'Referer':      'https://www.instagram.com/',
    'Accept':       'application/json, text/plain, */*',
  };
}

// ── Strategy 1: Instagram Mobile API (most reliable) ──────────────────────────
// Same endpoint the official Instagram app uses internally

async function fetchViaMobileAPI(sc) {
  const mediaId = shortcodeToId(sc);

  const r = await fetch(
    `https://i.instagram.com/api/v1/media/${mediaId}/info/`,
    {
      headers: mobileHeaders(),
      signal:  AbortSignal.timeout(12000),
    }
  );

  if (!r.ok) throw new Error(`Mobile API: HTTP ${r.status}`);
  const json = await r.json();

  const item = json?.items?.[0];
  if (!item) return null;

  // Reels store video_url directly on the item
  const videoUrl =
    item.video_url ??
    item.video_versions?.[0]?.url ??
    null;

  if (!videoUrl) return null;

  const thumbnail =
    item.image_versions2?.candidates?.[0]?.url ??
    item.thumbnail_url ??
    null;

  return { videoUrl, thumbnail, shortcode: sc };
}

// ── Strategy 2: Instagram Web API (?__a=1) ─────────────────────────────────────
// Older but still works with a valid session cookie

async function fetchViaWebAPI(sc) {
  const urls = [
    `https://www.instagram.com/reel/${sc}/?__a=1&__d=dis`,
    `https://www.instagram.com/p/${sc}/?__a=1&__d=dis`,
  ];

  for (const url of urls) {
    try {
      const r = await fetch(url, {
        headers: webHeaders(),
        signal:  AbortSignal.timeout(10000),
      });

      if (!r.ok) continue;

      const json = await r.json();
      const media =
        json?.graphql?.shortcode_media ??
        json?.items?.[0] ??
        null;

      if (!media) continue;

      const videoUrl = media.video_url ?? null;
      if (!videoUrl) continue;

      return {
        videoUrl,
        thumbnail: media.display_url ?? media.thumbnail_url ?? null,
        shortcode: sc,
      };
    } catch (_) {
      continue;
    }
  }

  return null;
}

// ── Strategy 3: Embed page parse (no auth fallback) ───────────────────────────
// Works for some public reels even without a perfect session

async function fetchViaEmbed(sc) {
  const r = await fetch(
    `https://www.instagram.com/reel/${sc}/embed/captioned/`,
    {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Cookie':       SESSION,
        'Referer':      'https://www.instagram.com/',
        'Accept':       'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(12000),
    }
  );

  if (!r.ok) return null;
  const html = await r.text();

  const patterns = [
    /"video_url":"(https:[^"]+)"/,
    /src="(https:\/\/[^"]*scontent[^"]*\.mp4[^"]*)"/,
    /"playback_url":"(https:[^"]+)"/,
    /"contentUrl":"(https:[^"]+\.mp4[^"]*)"/,
  ];

  for (const re of patterns) {
    const m = html.match(re);
    if (m) {
      const videoUrl = m[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/');
      const thumbM   = html.match(/property="og:image" content="(https:[^"]+)"/);
      return {
        videoUrl,
        thumbnail: thumbM ? thumbM[1] : null,
        shortcode: sc,
      };
    }
  }

  return null;
}
