/**
 * Debug — visit /api/debug?url=https://www.instagram.com/reel/C8vQ2xFNqOL/
 */
const SESSION = process.env.INSTAGRAM_SESSION;

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.json({ error: 'Add ?url=REEL_URL' });

  const sc = url.match(/instagram\.com\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/)?.[1];
  if (!sc) return res.json({ error: 'Bad URL' });

  const results = {
    sessionSet: !!SESSION,
    sessionPrefix: SESSION ? SESSION.slice(0, 20) + '...' : 'NOT SET',
  };

  // Test mobile API
  if (SESSION) {
    try {
      const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
      let id = BigInt(0);
      for (const c of sc) id = id * 64n + BigInt(CHARS.indexOf(c));
      const mediaId = id.toString();

      const r = await fetch(`https://i.instagram.com/api/v1/media/${mediaId}/info/`, {
        headers: {
          'User-Agent': 'Instagram 275.0.0.27.98 Android (33/13; 420dpi; 1080x2400; samsung; SM-G991B; o1s; exynos2100; en_US; 458229237)',
          'Cookie': SESSION,
          'X-IG-App-ID': '567067343352427',
        },
        signal: AbortSignal.timeout(10000),
      });
      const json = await r.json();
      results.mobileAPI = {
        status: r.status,
        hasItems: !!json?.items?.length,
        hasVideoUrl: !!json?.items?.[0]?.video_url,
        error: json?.message ?? null,
      };
    } catch (e) {
      results.mobileAPI = { error: e.message };
    }

    // Test web API
    try {
      const r = await fetch(`https://www.instagram.com/reel/${sc}/?__a=1&__d=dis`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
          'Cookie': SESSION,
          'X-IG-App-ID': '936619743392459',
        },
        signal: AbortSignal.timeout(10000),
      });
      const text = await r.text();
      let json = null;
      try { json = JSON.parse(text); } catch {}
      results.webAPI = {
        status: r.status,
        isJSON: !!json,
        hasVideoUrl: !!(json?.graphql?.shortcode_media?.video_url || json?.items?.[0]?.video_url),
      };
    } catch (e) {
      results.webAPI = { error: e.message };
    }
  }

  return res.json({ shortcode: sc, results });
}
