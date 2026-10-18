#!/usr/bin/env python3
"""Rails for the Side A homepage (Oct 2026).

The homepage is now a scroll story around one 3D record. The full portfolio,
case studies and Merger Monitor money path moved to /work/ and keep their own
rails in the other test files. This page must still:
- sell only the existing Merger Monitor SKU and say it is not advice;
- link every project card to a page that exists, each with an icon;
- point people at /work/ and the contact address;
- ship nothing private.
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
            if a.get(key):
                self.refs.append(a[key])


def _parsed() -> _Refs:
    p = _Refs()
    p.feed(HOMEPAGE)
    p.close()
    return p


class SideAHomepage(unittest.TestCase):
    def test_full_portfolio_moved_to_work(self) -> None:
        self.assertTrue((ROOT / "work" / "index.html").is_file())
        self.assertIn('href="work/"', HOMEPAGE)

    def test_only_existing_sku_and_not_advice(self) -> None:
        skus = set(re.findall(r"https://wuytackcharlie\.gumroad\.com/l/[a-z0-9]+", LOWER))
        self.assertEqual(skus, {"https://wuytackcharlie.gumroad.com/l/mergermonitor"})
        self.assertIn("not financial advice", LOWER)
        self.assertIn("nothing here is trading live at a profit", LOWER)
        for claim in ("guaranteed", "passive income", "copy my trades", "subscribers"):
            self.assertNotIn(claim, LOWER)

    def test_cards_have_icons_and_real_pages(self) -> None:
        tiles = re.findall(r'<a class="tile" href="([^"]+)"[^>]*>(.*?)</a>', HOMEPAGE, re.S)
        self.assertEqual(len(tiles), 4)
        for href, inner in tiles:
            self.assertIn('class="ic" aria-hidden="true"', inner, href)
            self.assertIn("<svg", inner, href)
            path = urlsplit(href).path
            target = ROOT / path / "index.html" if path.endswith("/") else ROOT / path
            self.assertTrue(target.exists(), f"{href} has no page")

    def test_local_refs_resolve(self) -> None:
        for ref in _parsed().refs:
            parts = urlsplit(ref)
            if parts.scheme or ref.startswith(("#", "mailto:", "//")):
                continue
            target = ROOT / parts.path
            if parts.path.endswith("/") or parts.path == "":
                target = target / "index.html"
            self.assertTrue(target.exists(), f"{ref} does not resolve")
        self.assertTrue((ROOT / "media" / "tank.m4a").is_file())

    def test_images_have_alt(self) -> None:
        for img in _parsed().imgs:
            self.assertTrue((img.get("alt") or "").strip(), img.get("src"))

    def test_contact_and_share_card_kept(self) -> None:
        self.assertIn('href="mailto:charlie@wuytack.net"', HOMEPAGE)
        self.assertIn('<meta property="og:image" content="https://charliewytk.github.io/media/og/side-a.png">', HOMEPAGE)
        self.assertTrue((ROOT / "media" / "og" / "side-a.png").is_file())
        self.assertIn("<title>Charlie Wuytack</title>", HOMEPAGE)

    def test_side_b_scene_lists_tracks_08_to_12(self) -> None:
        block = re.search(r'<section class="scene" data-word="Side B".*?</section>', HOMEPAGE, re.S)
        self.assertIsNotNone(block)
        hrefs = re.findall(r'href="(tracks/[a-z-]+/)"', block.group(0))
        self.assertEqual(len(hrefs), 5)
        self.assertIn("Two sides, 12 tracks", HOMEPAGE)

    def test_old_anchor_links_forward_to_work(self) -> None:
        self.assertIn("location.replace('work/#' + id)", HOMEPAGE)
        self.assertIn("addEventListener('hashchange', go)", HOMEPAGE)
        work = (ROOT / "work" / "index.html").read_text(encoding="utf-8")
        for anchor in ("merger", "solana", "research", "doorly", "powerleash", "abyss"):
            self.assertIn(f"'{anchor}'", HOMEPAGE)
            self.assertIn(f'id="{anchor}"', work)

    def test_scene_marks_are_buttons_one_per_scene(self) -> None:
        scenes = len(re.findall(r'<section class="scene', HOMEPAGE))
        nav = re.search(r'<nav class="meter" aria-label="Scenes">(.*?)</nav>', HOMEPAGE, re.S)
        self.assertIsNotNone(nav)
        buttons = re.findall(r'<button type="button" data-label="[^"]+" aria-label="[^"]+"></button>', nav.group(1))
        self.assertEqual(len(buttons), scenes)

    def test_record_player_records_exist(self) -> None:
        for src in re.findall(r"src: '(media/[a-z]+\.m4a)'", HOMEPAGE):
            self.assertTrue((ROOT / src).is_file(), src)
        self.assertEqual(len(re.findall(r"src: '(media/[a-z]+\.m4a)'", HOMEPAGE)), 3)
        self.assertIn('id="nextRecord"', HOMEPAGE)

    def test_placeholder_record_before_webgl(self) -> None:
        self.assertIn('<div class="ph" aria-hidden="true"></div>', HOMEPAGE)
        self.assertIn(".gl-ready .ph { opacity: 0; }", HOMEPAGE)

    def test_three_is_pinned(self) -> None:
        self.assertIn("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js", HOMEPAGE)

    def test_nothing_private(self) -> None:
        for needle in ("api-key", "api_key", "localhost", "127.0.0.1", "/users/", "private key", "seed phrase"):
            self.assertNotIn(needle, LOWER)
        self.assertIsNone(re.search(r"0x[0-9a-fA-F]{40}", HOMEPAGE))
        # the Google Fonts URL ("wght@12..96") looks like an address; leave it out
        text = re.sub(r'<link[^>]+fonts\.googleapis\.com[^>]*>', "", HOMEPAGE)
        emails = set(re.findall(r"[\w.+-]+@[\w-]+\.[\w.]+", text)) - {"charlie@wuytack.net"}
        self.assertEqual(emails, set())


if __name__ == "__main__":
    unittest.main()
