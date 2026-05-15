/**
 * Debug endpoint — shows raw API response
 * Visit: /api/debug?url=YOUR_REEL_URL
 * Remove this file once the parser is fixed.
 */

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.json({ error: 'Add ?url=INSTAGRAM_REEL_URL to the request' });

  const shortcode = url.match(/instagram\.com\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/)?.[1];
  if (!shortcode) return res.json({ error: 'Could not extract shortcode from URL' });

  if (!RAPIDAPI_KEY) return res.json({ error: 'RAPIDAPI_KEY not set in environment variables' });

  const results = {};

  // Test 1: instagram-scraper-api2 by herosAPI
  try {
    const r = await fetch(
      `https://instagram-scraper-api2.p.rapidapi.com/v1/post_info?code_or_id_or_url=${encodeURIComponent(shortcode)}`,
      {
        headers: {
          'x-rapidapi-key':  RAPIDAPI_KEY,
          'x-rapidapi-host': 'instagram-scraper-api2.p.rapidapi.com',
        },
        signal: AbortSignal.timeout(10000),
      }
    );
    results.herosAPI = {
      status: r.status,
      statusText: r.statusText,
      body: await r.json().catch(() => 'not JSON'),
    };
  } catch (e) {
    results.herosAPI = { error: e.message };
  }

  // Test 2: instagram120 — reels endpoint
  try {
    const r = await fetch('https://instagram120.p.rapidapi.com/api/instagram/reels', {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-rapidapi-key':  RAPIDAPI_KEY,
        'x-rapidapi-host': 'instagram120.p.rapidapi.com',
      },
      body: JSON.stringify({ url: `https://www.instagram.com/reel/${shortcode}/` }),
      signal: AbortSignal.timeout(10000),
    });
    results.instagram120_reels = {
      status: r.status,
      body: await r.json().catch(() => 'not JSON'),
    };
  } catch (e) {
    results.instagram120_reels = { error: e.message };
  }

  // Test 3: instagram120 — posts endpoint (the one you subscribed to)
  try {
    const r = await fetch('https://instagram120.p.rapidapi.com/api/instagram/posts', {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-rapidapi-key':  RAPIDAPI_KEY,
        'x-rapidapi-host': 'instagram120.p.rapidapi.com',
      },
      body: JSON.stringify({ url: `https://www.instagram.com/reel/${shortcode}/` }),
      signal: AbortSignal.timeout(10000),
    });
    results.instagram120_posts_with_url = {
      status: r.status,
      body: await r.json().catch(() => 'not JSON'),
    };
  } catch (e) {
    results.instagram120_posts_with_url = { error: e.message };
  }

  return res.json({
    shortcode,
    testedUrl: url,
    keySet: !!RAPIDAPI_KEY,
    keyPrefix: RAPIDAPI_KEY?.slice(0, 8) + '...',
    results,
  });
}
