/**
 * Test the Python yt-dlp function directly
 * Visit: /api/debug?url=https://www.instagram.com/reel/C8vQ2xFNqOL/
 */
export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.json({ error: 'Add ?url=REEL_URL' });

  try {
    // Call the Python function internally
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const r = await fetch(`${baseUrl}/api/download`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ url }),
      signal:  AbortSignal.timeout(25000),
    });

    const json = await r.json();
    return res.json({ status: r.status, response: json });
  } catch (e) {
    return res.json({ error: e.message });
  }
}
