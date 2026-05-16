export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.json({ error: 'Add ?url=REEL_URL' });

  const sc = url.match(/instagram\.com\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/)?.[1];
  if (!sc) return res.json({ error: 'Bad URL' });

  const igUrl = `https://www.instagram.com/reel/${sc}/`;
  const results = {};

  // Test Cobalt v2
  try {
    const r = await fetch('https://api.cobalt.tools/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ url: igUrl }),
      signal: AbortSignal.timeout(12000),
    });
    results.cobalt_v2 = { status: r.status, body: await r.json().catch(() => 'not json') };
  } catch (e) { results.cobalt_v2 = { error: e.message }; }

  // Test Cobalt v1
  try {
    const r = await fetch('https://co.wuk.sh/api/json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ url: igUrl }),
      signal: AbortSignal.timeout(12000),
    });
    results.cobalt_v1 = { status: r.status, body: await r.json().catch(() => 'not json') };
  } catch (e) { results.cobalt_v1 = { error: e.message }; }

  // Test allorigins proxy → embed parse
  try {
    const embedUrl = `https://www.instagram.com/reel/${sc}/embed/captioned/`;
    const r = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(embedUrl)}`, {
      signal: AbortSignal.timeout(12000),
    });
    const j = await r.json();
    const html = j?.contents ?? '';
    const hasVideo = /"video_url"/.test(html) || /\.mp4/.test(html);
    results.allorigins_embed = {
      status: r.status,
      htmlLength: html.length,
      hasVideoUrl: hasVideo,
      // show first 800 chars to see what came back
      preview: html.slice(0, 800),
    };
  } catch (e) { results.allorigins_embed = { error: e.message }; }

  // Test SaveFrom
  try {
    const r = await fetch(`https://worker.sf-tools.com/savefrom.php?sf_url=${encodeURIComponent(igUrl)}&lang=en`, {
      headers: { 'Origin': 'https://en.savefrom.net', 'Referer': 'https://en.savefrom.net/' },
      signal: AbortSignal.timeout(12000),
    });
    results.savefrom = { status: r.status, body: await r.json().catch(async () => await r.text().catch(() => 'error')) };
  } catch (e) { results.savefrom = { error: e.message }; }

  return res.json({ shortcode: sc, results });
}
