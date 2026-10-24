"""Side A installs as an app and keeps the record and its tracks for offline listening."""
import json
import re
import struct
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TRACKS = ['exetix', 'research', 'solana', 'merger-monitor', 'doorly', 'powerleash', 'abyss-warden',
          'deskstatus', 'numerai', 'competitions', 'chess-exchange', 'chelsea-bikes']


def png_size(path):
    with open(path, 'rb') as f:
        head = f.read(24)
    assert head[:8] == b'\x89PNG\r\n\x1a\n', path
    return struct.unpack('>II', head[16:24])


class Manifest(unittest.TestCase):
    def setUp(self):
        self.m = json.loads((ROOT / 'manifest.webmanifest').read_text())

    def test_basics(self):
        for key in ('name', 'short_name', 'start_url', 'display', 'icons', 'theme_color', 'background_color'):
            self.assertIn(key, self.m)
        self.assertEqual(self.m['display'], 'standalone')

    def test_icons_exist_at_their_sizes(self):
        sizes = set()
        for icon in self.m['icons']:
            path = ROOT / icon['src']
            self.assertTrue(path.exists(), icon['src'])
            if icon['type'] == 'image/png':
                w, h = png_size(path)
                self.assertEqual(f'{w}x{h}', icon['sizes'], icon['src'])
                sizes.add(icon['sizes'])
        self.assertTrue({'192x192', '512x512'} <= sizes)
        self.assertTrue(any(i.get('purpose') == 'maskable' for i in self.m['icons']))

    def test_shortcuts_point_at_real_pages(self):
        for s in self.m.get('shortcuts', []):
            self.assertTrue((ROOT / s['url'] / 'index.html').exists(), s['url'])

    def test_apple_touch_icon(self):
        self.assertEqual(png_size(ROOT / 'media/icons/apple-touch-icon.png'), (180, 180))


class ServiceWorker(unittest.TestCase):
    def setUp(self):
        self.sw = (ROOT / 'sw.js').read_text()

    def test_keeps_every_track(self):
        listed = re.search(r'var TRACKS = \[(.*?)\];', self.sw, re.S).group(1)
        self.assertEqual(re.findall(r"'([a-z0-9-]+)'", listed), TRACKS)
        for t in TRACKS:
            self.assertTrue((ROOT / 'tracks' / t / 'index.html').exists(), t)

    def test_kept_files_exist(self):
        keep = re.search(r"var KEEP = \[(.*?)\]", self.sw, re.S).group(1)
        for p in re.findall(r"'([^']*)'", keep):
            target = ROOT / p / 'index.html' if p == '' or p.endswith('/') else ROOT / p
            self.assertTrue(target.exists(), p)

    def test_three_matches_the_page(self):
        cdn = re.search(r"var THREE = '([^']+)'", self.sw).group(1)
        self.assertIn(f'<script src="{cdn}"></script>', (ROOT / 'index.html').read_text())

    def test_live_data_and_media_are_never_cached(self):
        self.assertIn(r'\.json$', self.sw)
        self.assertIn('m4a', self.sw)
        self.assertIn("headers.has('range')", self.sw)

    def test_offline_page(self):
        html = (ROOT / 'offline.html').read_text()
        self.assertIn('No signal', html)
        self.assertIn('not financial advice', html)
        for ref in re.findall(r'(?:href|src)="(/[^"/][^"]*)"', html):
            path = ROOT / ref.lstrip('/')
            self.assertTrue(path.exists() or (path / 'index.html').exists(), ref)


class Wiring(unittest.TestCase):
    def test_homepage(self):
        html = (ROOT / 'index.html').read_text()
        self.assertIn('<link rel="manifest" href="manifest.webmanifest">', html)
        self.assertIn('<link rel="apple-touch-icon" href="media/icons/apple-touch-icon.png">', html)
        self.assertIn("serviceWorker.register('sw.js')", html)

    def test_every_track_page(self):
        for t in TRACKS + ['']:
            html = (ROOT / 'tracks' / t / 'index.html').read_text()
            up = '../' if t == '' else '../../'
            self.assertIn(f'<link rel="manifest" href="{up}manifest.webmanifest">', html, t)
            self.assertIn(f"serviceWorker.register(new URL('{up}sw.js'", html, t)


class WorkGate(unittest.TestCase):
    def test_homepage_opens_the_work_gate(self):
        self.assertIn("localStorage.setItem('cw-entered', '1')", (ROOT / 'index.html').read_text())
        self.assertIn("localStorage.getItem('cw-entered') === '1'", (ROOT / 'work/index.html').read_text())


if __name__ == '__main__':
    unittest.main()
