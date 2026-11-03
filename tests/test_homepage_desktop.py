#!/usr/bin/env python3
"""Rails for the Desktop homepage (3 Nov 2026).

The homepage is a tiny desktop: twelve app icons, one per project, and a dock
with Work, GitHub and Contact. Every icon is a plain link to its project page;
with JS a click opens the project as a window (desktop) or a sheet (phone),
cloned from a <template>. The old shelf homepage lives on at /shelf/ with its
own rails in test_homepage_shelf.py. This page must still:
- reach every project without JS (plain links outside any template);
- link each project to a page that exists, and /work/ for everything;
- show ExeTix as built and sold;
- say it is not advice, and ship nothing private (HTML, CSS and JS);
- load only its own scripts and assets, and keep the PWA wiring.
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
CSS = (ROOT / "assets" / "desktop.css").read_text(encoding="utf-8")
JS = (ROOT / "assets" / "desktop.js").read_text(encoding="utf-8")
# Everything outside the window templates is what a visitor without JS gets.
STATIC = re.sub(r"<template\b.*?</template>", "", HOMEPAGE, flags=re.S)

PROJECTS = {
    "exetix": "exetix/",
    "kill-log": "kill-log/",
    "solana": "tracks/solana/",
    "merger-monitor": "merger-monitor/",
    "doorly": "doorly/",
    "powerleash": "tracks/powerleash/",
    "abyss-warden": "abyss-warden/",
    "deskstatus": "tracks/deskstatus/",
    "numerai": "tracks/numerai/",
    "competitions": "tracks/competitions/",
    "chess-exchange": "tracks/chess-exchange/",
    "chelsea-bikes": "chelsea-bikes/",
}


class _Refs(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.refs: list[str] = []
        self.imgs: list[tuple[dict, list[str]]] = []
        self._classes: list[str] = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "img":
            self.imgs.append((a, list(self._classes)))
        if tag not in ("img", "input", "source", "use", "path", "circle", "rect", "meta", "link", "br"):
            self._classes.append(a.get("class") or "")
        for key in ("href", "src", "poster"):
            if a.get(key) and "${" not in a[key]:
                self.refs.append(a[key])

    def handle_endtag(self, tag):
        if self._classes and tag not in ("img", "input", "source", "use", "path", "circle", "rect", "meta", "link", "br"):
            self._classes.pop()


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


class DesktopHomepage(unittest.TestCase):
    def test_dock_only_work_github_contact(self) -> None:
        dock = re.search(r'<nav class="dock".*?</nav>', HOMEPAGE, re.S)
        self.assertIsNotNone(dock)
        links = re.findall(r'<a class="tile" href="([^"]+)"', dock.group(0))
        self.assertEqual(links, ["work/", "https://github.com/Charliewytk", "mailto:charlie@wuytack.net"])
        self.assertIn('href="work/" id="work-btn"', dock.group(0))
        self.assertIn("<h1>Charlie Wuytack</h1>", HOMEPAGE)

    def test_every_project_has_a_real_page_and_window(self) -> None:
        apps = re.findall(r'<a class="app" href="([^"]+)" data-app="([a-z-]+)"', STATIC)
        self.assertEqual(len(apps), 12)
        self.assertEqual({key: href for href, key in apps}, PROJECTS)
        for href, key in apps:
            self.assertTrue(_resolves(href), f"{key}: {href} has no page")
            self.assertIn(f'<template id="tpl-{key}">', HOMEPAGE, f"{key} has no window")

    def test_full_portfolio_linked(self) -> None:
        self.assertTrue((ROOT / "work" / "index.html").is_file())
        self.assertIn('href="work/"', STATIC)

    def test_exetix_shown_as_sold(self) -> None:
        exetix = re.search(r'<template id="tpl-exetix">.*?</template>', HOMEPAGE, re.S).group(0)
        self.assertIn("Built and sold", exetix)
        self.assertNotIn("live now", LOWER)

    def test_not_advice(self) -> None:
        honesty = re.search(r'<p class="honesty">(.*?)</p>', STATIC, re.S)
        self.assertIsNotNone(honesty, "the honesty line must be visible without JS")
        self.assertIn("not financial advice", honesty.group(1).lower())
        self.assertIn("nothing here is trading live at a profit", honesty.group(1).lower())
        for claim in ("guaranteed", "passive income", "copy my trades"):
            self.assertNotIn(claim, LOWER)

    def test_paid_and_paper_labels_kept(self) -> None:
        merger = re.search(r'<template id="tpl-merger-monitor">.*?</template>', HOMEPAGE, re.S).group(0)
        for label in ("£5/month", "+1.38%", "Filings, not advice.", "Zero subscribers so far. Take: £0.", "7-day refund"):
            self.assertIn(label, merger)
        kill = re.search(r'<template id="tpl-kill-log">.*?</template>', HOMEPAGE, re.S).group(0)
        self.assertIn("No live P&amp;L is claimed", kill)
        self.assertIn("Nothing here claims a profit yet", kill)
        solana = re.search(r'<template id="tpl-solana">.*?</template>', HOMEPAGE, re.S).group(0)
        self.assertIn("Fills are simulated at the estimated landing slot, not landed.", solana)
        chess = re.search(r'<template id="tpl-chess-exchange">.*?</template>', HOMEPAGE, re.S).group(0)
        self.assertIn("Play money", chess)

    def test_local_refs_and_assets_resolve(self) -> None:
        for ref in _parsed().refs:
            parts = urlsplit(ref)
            if parts.scheme or ref.startswith(("#", "mailto:", "//")):
                continue
            self.assertFalse(ref.startswith("/"), f"{ref} must be relative to the site root")
            self.assertTrue(_resolves(parts.path), f"{ref} does not resolve")

    def test_images_have_alt(self) -> None:
        # app icons are decorative (the label names the app), so they carry alt="" on purpose
        for img, classes in _parsed().imgs:
            self.assertIn("alt", img, img.get("src"))
            if not (img.get("alt") or "").strip():
                self.assertTrue(any("icon" in c or "menu__bar" in c for c in classes), f"{img.get('src')} needs alt text")

    def test_share_card_and_app_shell(self) -> None:
        self.assertIn("<title>Charlie Wuytack</title>", HOMEPAGE)
        self.assertIn('<meta property="og:image" content="https://charliewytk.github.io/media/og/desktop.png">', HOMEPAGE)
        self.assertTrue((ROOT / "media" / "og" / "desktop.png").is_file())
        self.assertNotIn("shelf", LOWER)
        self.assertIn('<link rel="manifest" href="manifest.webmanifest">', HOMEPAGE)
        self.assertIn("serviceWorker.register('sw.js')", HOMEPAGE)
        self.assertIn("localStorage.setItem('cw-entered', '1')", HOMEPAGE)

    def test_old_anchor_links_forward_to_work(self) -> None:
        self.assertIn("location.replace('work/#' + id)", HOMEPAGE)
        self.assertIn("addEventListener('hashchange', go)", HOMEPAGE)
        work = (ROOT / "work" / "index.html").read_text(encoding="utf-8")
        for anchor in ("merger", "solana", "research", "doorly", "powerleash", "abyss"):
            self.assertIn(f"'{anchor}'", HOMEPAGE)
            self.assertIn(f'id="{anchor}"', work)

    def test_reachable_without_javascript(self) -> None:
        links = re.findall(r'<a class="(?:app|tile)" href="([^"]+)"', STATIC)
        self.assertEqual(len(links), 15)
        for href in links:
            if not href.startswith(("https://", "mailto:")):
                self.assertTrue(_resolves(href), href)
        self.assertIn("<script src=\"assets/desktop.js\" defer></script>", HOMEPAGE)
        self.assertIn("prefers-reduced-motion", CSS)
        self.assertIn("prefers-reduced-motion", JS)

    def test_scripts_are_own(self) -> None:
        self.assertEqual(re.findall(r'<script src="([^"]+)"', HOMEPAGE), ["assets/desktop.js"])
        self.assertIn('<link rel="stylesheet" href="assets/desktop.css">', HOMEPAGE)
        for text in (CSS, JS):
            self.assertNotRegex(text, r"(?:import|url)\(\s*['\"]?https?://")

    def test_nothing_private(self) -> None:
        for name, text in (("index.html", HOMEPAGE), ("desktop.css", CSS), ("desktop.js", JS)):
            low = text.lower()
            for needle in ("api-key", "api_key", "localhost", "127.0.0.1", "/users/", "private key", "seed phrase", "window.__"):
                self.assertNotIn(needle, low, f"{needle} in {name}")
            self.assertIsNone(re.search(r"0x[0-9a-fA-F]{40}", text), name)
            emails = set(re.findall(r"[\w.+-]+@[\w-]+\.[a-z]{2,}", text)) - {"charlie@wuytack.net"}
            self.assertEqual(emails, set(), name)


if __name__ == "__main__":
    unittest.main()
