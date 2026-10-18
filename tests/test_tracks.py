#!/usr/bin/env python3
"""Rails for the Side A track pages (tracks/<slug>/index.html).

One page per track, chained in order, each linking on to the real thing.
They sell nothing new: the only paid link is the existing Merger Monitor SKU.
"""
from __future__ import annotations

import re
import unittest
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
TRACKS = ["exetix", "research", "solana", "merger-monitor", "doorly", "powerleash", "abyss-warden"]
GUMROAD = "https://wuytackcharlie.gumroad.com/l/mergermonitor"


class _Refs(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.refs: list[str] = []
        self.imgs: list[dict] = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "img":
            self.imgs.append(a)
        for key in ("href", "src", "poster"):
            if a.get(key):
                self.refs.append(a[key])


def _page(slug: str) -> Path:
    return ROOT / "tracks" / slug / "index.html"


def _refs(path: Path) -> _Refs:
    p = _Refs()
    p.feed(path.read_text(encoding="utf-8"))
    p.close()
    return p


class TrackPages(unittest.TestCase):
    def test_every_track_has_a_page(self) -> None:
        for slug in TRACKS:
            self.assertTrue(_page(slug).is_file(), slug)
        self.assertTrue((ROOT / "tracks" / "index.html").is_file())
        self.assertTrue((ROOT / "tracks" / "track.css").is_file())

    def test_side_a_links_every_track(self) -> None:
        home = (ROOT / "index.html").read_text(encoding="utf-8")
        for slug in TRACKS:
            self.assertIn(f'href="tracks/{slug}/"', home, slug)

    def test_tracks_chain_in_order(self) -> None:
        for i, slug in enumerate(TRACKS):
            html = _page(slug).read_text(encoding="utf-8")
            self.assertIn(f"Track {i + 1:02d} / 07", html)
            if i + 1 < len(TRACKS):
                self.assertIn(f'class="next wrap" href="../{TRACKS[i + 1]}/"', html)
            else:
                self.assertIn('class="next wrap" href="../../"', html)

    def test_local_refs_resolve(self) -> None:
        for path in [_page(s) for s in TRACKS] + [ROOT / "tracks" / "index.html"]:
            for ref in _refs(path).refs:
                parts = urlsplit(ref)
                if parts.scheme or ref.startswith(("#", "mailto:", "//")):
                    continue
                target = (path.parent / parts.path).resolve()
                if parts.path.endswith("/") or parts.path == "":
                    target = target / "index.html"
                self.assertTrue(target.exists(), f"{path.parent.name}: {ref} does not resolve")

    def test_images_have_alt(self) -> None:
        for slug in TRACKS:
            for img in _refs(_page(slug)).imgs:
                self.assertTrue((img.get("alt") or "").strip(), f"{slug}: {img.get('src')}")

    def test_only_existing_sku_and_not_advice(self) -> None:
        for slug in TRACKS:
            html = _page(slug).read_text(encoding="utf-8").lower()
            skus = set(re.findall(r"https://wuytackcharlie\.gumroad\.com/l/[a-z0-9]+", html))
            self.assertEqual(skus, {GUMROAD}, slug)
            self.assertIn("not financial advice", html, slug)
            for claim in ("guaranteed", "passive income", "copy my trades"):
                self.assertNotIn(claim, html, slug)

    def test_merger_track_is_honest(self) -> None:
        html = _page("merger-monitor").read_text(encoding="utf-8")
        self.assertIn("Zero subscribers so far", html)
        self.assertIn("Take: £0", html)
        self.assertIn("not advice", html.lower())
        self.assertIn("merger-stats.js", html)
        self.assertIsNone(re.search(r"[1-9][\d,]*\s+subscribers?", html.lower()))

    def test_tracks_open_in_place_on_side_a(self) -> None:
        """Side A slides a track up over itself; Back returns to the same scroll spot."""
        home = (ROOT / "index.html").read_text(encoding="utf-8")
        for needle in ("attachShadow", "history.pushState", "popstate", "sessionStorage"):
            self.assertIn(needle, home, needle)
        css = (ROOT / "tracks" / "track.css").read_text(encoding="utf-8")
        self.assertIn(":root, :host {", css)
        self.assertIn("body, .tbody {", css)

    def test_standalone_track_goes_back_to_side_a(self) -> None:
        for slug in TRACKS:
            html = _page(slug).read_text(encoding="utf-8")
            self.assertIn("history.back()", html, slug)
            self.assertIn("document.referrer", html, slug)

    def test_research_track_claims_no_profit(self) -> None:
        html = _page("research").read_text(encoding="utf-8").lower()
        self.assertIn("no profit is claimed", html)
        self.assertIn("nothing here claims a profit", html)


if __name__ == "__main__":
    unittest.main()
