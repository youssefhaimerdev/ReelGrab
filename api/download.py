from http.server import BaseHTTPRequestHandler
import json, re, os

class handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_POST(self):
        # Parse body
        try:
            length = int(self.headers.get('Content-Length', 0))
            body   = json.loads(self.rfile.read(length).decode('utf-8'))
            url    = body.get('url', '').strip()
        except Exception:
            return self._json(400, {'error': 'Invalid request body'})

        if not url:
            return self._json(400, {'error': 'No URL provided'})

        m = re.search(r'instagram\.com/(?:reel|reels|p|tv)/([A-Za-z0-9_-]+)', url)
        if not m:
            return self._json(400, {'error': 'Invalid Instagram URL. Example: https://www.instagram.com/reel/ABC123/'})

        shortcode = m.group(1)
        ig_url    = f'https://www.instagram.com/reel/{shortcode}/'

        try:
            import yt_dlp
        except ImportError:
            return self._json(503, {'error': 'yt-dlp not available on this server'})

        try:
            result = self._extract(yt_dlp, ig_url, shortcode)
            if result:
                return self._json(200, {'success': True, 'data': result})
            return self._json(404, {'error': 'Could not extract video. The reel may be private or unavailable.'})
        except Exception as e:
            msg = str(e)[:300]
            print(f'[yt-dlp] error: {msg}')
            return self._json(404, {'error': 'Could not extract this reel. It may be private or Instagram may have updated their system.'})

    # ── Core extraction ──────────────────────────────────────────────────────

    def _extract(self, yt_dlp, url, shortcode):
        ydl_opts = {
            'quiet':         True,
            'no_warnings':   True,
            'skip_download': True,
            # Get best mp4 quality available
            'format': 'bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            # Mobile user-agent — more permissive on Instagram
            'http_headers': {
                'User-Agent': (
                    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) '
                    'AppleWebKit/605.1.15 (KHTML, like Gecko) '
                    'Version/17.0 Mobile/15E148 Safari/604.1'
                ),
                'Accept-Language': 'en-US,en;q=0.9',
            },
        }

        # If a session cookie is configured, use it (optional — works without it for public reels)
        ig_cookie = os.environ.get('INSTAGRAM_COOKIE', '')
        if ig_cookie:
            ydl_opts['http_headers']['Cookie'] = ig_cookie

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

        video_url = self._pick_video(info)
        if not video_url:
            return None

        return {
            'videoUrl':  video_url,
            'thumbnail': info.get('thumbnail'),
            'shortcode': shortcode,
        }

    def _pick_video(self, info):
        # Direct URL
        if info.get('url'):
            return info['url']

        # Best from formats list
        formats = info.get('formats', [])
        if not formats:
            return None

        # Prefer mp4 with video
        mp4 = [f for f in formats if f.get('ext') == 'mp4' and f.get('vcodec') != 'none' and f.get('url')]
        if mp4:
            return mp4[-1]['url']   # last = highest quality

        # Any format with a URL
        for f in reversed(formats):
            if f.get('url'):
                return f['url']

        return None

    # ── Helpers ──────────────────────────────────────────────────────────────

    def _cors(self):
        self.send_header('Access-Control-Allow-Origin',  '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def _json(self, code, data):
        body = json.dumps(data).encode('utf-8')
        self.send_response(code)
        self._cors()
        self.send_header('Content-Type',   'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    # Suppress default request logging noise in Vercel logs
    def log_message(self, format, *args):
        pass
