#!/usr/bin/env python3
"""Rails for the shelf homepage (Oct 2026).

The homepage is one 3D scene: two shelves, one object per project, and a hand
with a laser pointer that picks an object up and throws it into its project
page. The full portfolio, case studies and Merger Monitor money path stay on
/work/ and keep their own rails in the other test files. This page must still:
- reach every project without the 3D scene (Work list, keyboard buttons, links);
- link each project to a page that exists, and /work/ for everything;
- show ExeTix as built and sold;
- say it is not advice, and ship nothing private;
- load only pinned scripts and assets that exist.
"""
from __future__ import annotations

import re
import unittest
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
HOMEPAGE = (ROOT / "index.html").read_text(encoding="utf-8")
LOWER = HOMEPAGE.lower()


class _Refs(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.refs: list[str] = []
        self.imgs: list[dict] = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "img":
            self.imgs.append(a)
        for key in ("href", "src"):
            if a.get(key) and "${" not in a[key]:
                self.refs.append(a[key])


def _parsed() -> _Refs:
    p = _Refs()
    p.feed(HOMEPAGE)
    p.close()
    return p


def _resolves(path: str) -> bool:
    target = ROOT / path
    if path.endswith("/") or path == "":
        target = target / "index.html"
    return target.exists()


class ShelfHomepage(unittest.TestCase):
    def test_top_bar_only_work_github_contact(self) -> None:
        bar = re.search(r'<header class="bar">(.*?)</header>', HOMEPAGE, re.S)
        self.assertIsNotNone(bar)
        self.assertIn("Charlie Wuytack", bar.group(1))
        self.assertIn('id="work-btn"', bar.group(1))
        self.assertIn('href="https://github.com/Charliewytk"', bar.group(1))
        self.assertIn('href="mailto:charlie@wuytack.net"', bar.group(1))

    def test_every_project_has_a_real_page(self) -> None:
        pages = re.search(r"const PAGES = (\{.*?\});", HOMEPAGE)
        self.assertIsNotNone(pages)
        entries = re.findall(r'"([a-z-]+)": "([a-z/-]+)"', pages.group(1))
        self.assertEqual(len(entries), 12)
        for key, path in entries:
            self.assertTrue(_resolves(path), f"{key}: {path} has no page")
            self.assertIn(f'id: "{key}"', HOMEPAGE, f"{key} is not on the shelf")

    def test_full_portfolio_linked(self) -> None:
        self.assertTrue((ROOT / "work" / "index.html").is_file())
        self.assertIn('href="work/"', HOMEPAGE)

    def test_exetix_shown_as_sold(self) -> None:
        self.assertIn("ExeTix · built and sold", HOMEPAGE)
        self.assertIn('tag: "Built and sold"', HOMEPAGE)
        self.assertNotIn("live now", LOWER)

    def test_not_advice(self) -> None:
        self.assertIn("not financial advice", LOWER)
        self.assertIn("nothing here is trading live at a profit", LOWER)
        for claim in ("guaranteed", "passive income", "copy my trades"):
            self.assertNotIn(claim, LOWER)

    def test_local_refs_and_assets_resolve(self) -> None:
        for ref in _parsed().refs:
            parts = urlsplit(ref)
            if parts.scheme or ref.startswith(("#", "mailto:", "//")):
                continue
            self.assertTrue(_resolves(parts.path), f"{ref} does not resolve")
        for asset in set(re.findall(r'"((?:media|exetix/img)/[\w./-]+)"', HOMEPAGE)):
            self.assertTrue((ROOT / asset).is_file(), asset)

    def test_hand_model_is_cc0_and_noted(self) -> None:
        self.assertTrue((ROOT / "media" / "arms.glb").is_file())
        note = (ROOT / "media" / "ARMS_LICENSE.txt").read_text(encoding="utf-8")
        self.assertIn("CC0", note)

    def test_images_have_alt(self) -> None:
        for img in _parsed().imgs:
            self.assertTrue((img.get("alt") or "").strip(), img.get("src"))

    def test_share_card_and_app_shell(self) -> None:
        self.assertIn("<title>Charlie Wuytack</title>", HOMEPAGE)
        self.assertIn('<meta property="og:image" content="https://charliewytk.github.io/media/og/shelf.png">', HOMEPAGE)
        self.assertTrue((ROOT / "media" / "og" / "shelf.png").is_file())
        self.assertIn('<link rel="manifest" href="manifest.webmanifest">', HOMEPAGE)
        self.assertIn("serviceWorker.register('sw.js')", HOMEPAGE)

    def test_old_anchor_links_forward_to_work(self) -> None:
        self.assertIn("location.replace('work/#' + id)", HOMEPAGE)
        self.assertIn("addEventListener('hashchange', go)", HOMEPAGE)
        work = (ROOT / "work" / "index.html").read_text(encoding="utf-8")
        for anchor in ("merger", "solana", "research", "doorly", "powerleash", "abyss"):
            self.assertIn(f"'{anchor}'", HOMEPAGE)
            self.assertIn(f'id="{anchor}"', work)

    def test_reachable_without_javascript(self) -> None:
        self.assertIn('<a href="work/" id="work-btn">Work</a>', HOMEPAGE)
        static = re.search(r"<noscript>(.*?)</noscript>", HOMEPAGE, re.S)
        self.assertIsNotNone(static)
        links = re.findall(r'<a href="([^"]+)">', static.group(1))
        self.assertEqual(len(links), 13)
        for href in links:
            self.assertTrue(_resolves(href), href)
        self.assertIn('class="fallback"', HOMEPAGE)
        self.assertIn("prefers-reduced-motion", HOMEPAGE)

    def test_scripts_are_pinned(self) -> None:
        scripts = re.findall(r'<script src="(https://[^"]+)"', HOMEPAGE)
        self.assertIn("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js", scripts)
        self.assertIn("https://cdnjs.cloudflare.com/ajax/libs/cannon.js/0.6.2/cannon.min.js", scripts)
        for url in scripts:
            self.assertRegex(url, r"(r\d+|@\d+\.\d+\.\d+|/\d+\.\d+\.\d+/)", url)

    def test_nothing_private(self) -> None:
        for needle in ("api-key", "api_key", "localhost", "127.0.0.1", "/users/", "private key", "seed phrase", "window.__"):
            self.assertNotIn(needle, LOWER)
        self.assertIsNone(re.search(r"0x[0-9a-fA-F]{40}", HOMEPAGE))
        text = re.sub(r'<link[^>]+fonts\.googleapis\.com[^>]*>', "", HOMEPAGE)
        emails = set(re.findall(r"[\w.+-]+@[\w-]+\.[a-z]{2,}", text)) - {"charlie@wuytack.net"}
        self.assertEqual(emails, set())


if __name__ == "__main__":
    unittest.main()
