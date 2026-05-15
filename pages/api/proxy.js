export const config = { api: { responseLimit: false } };

const ALLOWED_HOSTS = [
  'cdninstagram.com',
  'instagram.com',
  'fbcdn.net',
  'scontent',
];

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL required' });

  let decoded;
  try {
    decoded = decodeURIComponent(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL encoding' });
  }

  const isAllowed = ALLOWED_HOSTS.some((h) => decoded.includes(h));
  if (!isAllowed) return res.status(403).json({ error: 'Forbidden host' });

  try {
    const upstream = await fetch(decoded, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Referer: 'https://www.instagram.com/',
        Accept: 'video/mp4,video/*;q=0.9,*/*;q=0.8',
        'Accept-Encoding': 'identity',
      },
      signal: AbortSignal.timeout(25000),
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: 'Upstream fetch failed' });
    }

    const ct = upstream.headers.get('content-type') || 'video/mp4';
    const cl = upstream.headers.get('content-length');

    res.setHeader('Content-Type', ct);
    res.setHeader('Content-Disposition', 'attachment; filename="reelgrab-video.mp4"');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (cl) res.setHeader('Content-Length', cl);

    const buf = await upstream.arrayBuffer();
    res.send(Buffer.from(buf));
  } catch (err) {
    console.error('[proxy] error:', err.message);
    res.status(500).json({ error: 'Proxy error. Please try direct download.' });
  }
}
