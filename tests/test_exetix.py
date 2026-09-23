#!/usr/bin/env python3
"""ExeTix showcase: the /exetix/ pages and the homepage hero after the opening.

Rails: the opening (Scroll / I'D RATHER BUILD) stays the first paint; ExeTix is
the first project after it. No fake App Store link. Nothing private ships:
no IPs, no push topics, no keys, no emails beyond the one already public, no
local paths. Every image has alt text and every local reference resolves.
"""
from __future__ import annotations

import re
import unittest
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
HOMEPAGE = (ROOT / "index.html").read_text(encoding="utf-8")
EXETIX = ROOT / "exetix"
PAGES = ["index.html", "how-it-works.html", "engineering.html", "gallery.html"]
LIVE_SITE = "https://www.exeterticketexchange.com"
PUBLIC_EMAIL = "charlie@wuytack.net"
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}


def _page(name: str) -> str:
    return (EXETIX / name).read_text(encoding="utf-8")


def _section() -> str:
    m = re.search(r'<section class="work xt" id="exetix">.*?</section>', HOMEPAGE, re.S)
    assert m, "homepage has no ExeTix section"
    return m.group(0)


class _Nesting(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[str] = []
        self.errors: list[str] = []
        self.imgs: list[dict] = []
        self.refs: list[str] = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "img":
            self.imgs.append(a)
        for key in ("src", "href"):
            if a.get(key):
                self.refs.append(a[key])
        if tag not in VOID:
            self.stack.append(tag)

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if not self.stack or self.stack[-1] != tag:
            self.errors.append(f"</{tag}> closes <{self.stack[-1] if self.stack else 'nothing'}>")
            if tag in self.stack:
                while self.stack and self.stack.pop() != tag:
                    pass
            return
        self.stack.pop()


def _parse(html: str) -> _Nesting:
    p = _Nesting()
    p.feed(html)
    p.close()
    return p


def _local(ref: str) -> bool:
    parts = urlsplit(ref)
    return not parts.scheme and not ref.startswith(("#", "mailto:", "//"))


class ExetixPages(unittest.TestCase):
    def test_pages_exist_and_nest(self) -> None:
        for name in PAGES:
            html = _page(name)
            p = _parse(html)
            self.assertEqual(p.errors, [], f"{name}: {p.errors[:5]}")
            self.assertEqual(p.stack, [], f"{name}: unclosed {p.stack}")
            self.assertRegex(html, r"<title>[^<]*ExeTix[^<]*</title>", name)
            self.assertIn('rel="canonical"', html, name)
            self.assertIn('name="viewport"', html, name)

    def test_every_local_reference_resolves(self) -> None:
        for name in PAGES:
            for ref in _parse(_page(name)).refs:
                if not _local(ref):
                    continue
                path = urlsplit(ref).path
                target = (EXETIX / path).resolve()
                if path.endswith("/") or path in ("", "./"):
                    target = target / "index.html"
                self.assertTrue(target.exists(), f"{name}: {ref} does not resolve")

    def test_every_image_has_alt_and_size(self) -> None:
        for name in PAGES:
            for img in _parse(_page(name)).imgs:
                self.assertTrue((img.get("alt") or "").strip(), f"{name}: img {img.get('src')} has no alt")
                self.assertTrue(img.get("width") and img.get("height"), f"{name}: img {img.get('src')} has no size")

    def test_share_image(self) -> None:
        og = ROOT / "media" / "og-exetix.jpg"
        self.assertTrue(og.is_file())
        self.assertLess(og.stat().st_size, 300_000, "keep the share image under 300 KB for chat previews")
        for name in PAGES:
            html = _page(name)
            self.assertIn('property="og:image" content="https://charliewytk.github.io/media/og-exetix.jpg"', html, name)
            self.assertIn('name="twitter:card" content="summary_large_image"', html, name)

    def test_image_weight_is_sensible(self) -> None:
        total = sum(f.stat().st_size for f in (EXETIX / "img").iterdir() if f.is_file())
        self.assertLess(total, 800_000, f"exetix/img is {total} bytes")
        for f in (EXETIX / "img").iterdir():
            self.assertLess(f.stat().st_size, 120_000, f"{f.name} is too heavy for the web")

    def test_app_store_is_honest(self) -> None:
        for name in PAGES:
            html = _page(name)
            self.assertFalse("apps.apple.com" in html, f"{name}: no App Store link until it is live")
            self.assertFalse("testflight.apple.com" in html, f"{name}: no TestFlight invite link")
            self.assertTrue("Coming to the App Store" in html, f"{name}: say it is coming, not live")
            self.assertTrue(LIVE_SITE in html, f"{name}: link the live site")

    def test_nothing_private_ships(self) -> None:
        bodies = {name: _page(name) for name in PAGES}
        bodies["homepage section"] = _section()
        bodies["exetix.css"] = (EXETIX / "exetix.css").read_text(encoding="utf-8")
        for name, html in bodies.items():
            low = html.lower()
            self.assertIsNone(re.search(r"\b\d{1,3}(?:\.\d{1,3}){3}\b", html), f"{name}: looks like an IP address")
            for needle in ("ntfy", "sk_live", "pk_live", "whsec_", "api_key", "apikey", "bearer ",
                           "/users/", "localhost", "vercel.app", "password:", ".p8", "team id"):
                self.assertNotIn(needle, low, f"{name}: {needle!r} must not ship")
            emails = set(re.findall(r"[\w.+-]+@[\w-]+\.[\w.]+", html)) - {PUBLIC_EMAIL}
            emails = {e for e in emails if not e.startswith("@")}
            self.assertEqual(emails, set(), f"{name}: unexpected emails {emails}")

    def test_watcher_is_described_as_read_only(self) -> None:
        eng = _page("engineering.html").lower()
        self.assertIn("never buys tickets", eng)
        self.assertIn("request budget", eng)
        how = _page("how-it-works.html").lower()
        self.assertIn("only ever buys exetix resale listings", how)

    def test_sitemap_lists_the_pages(self) -> None:
        sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
        for loc in ("exetix/", "exetix/how-it-works.html", "exetix/engineering.html", "exetix/gallery.html"):
            self.assertIn(f"<loc>https://charliewytk.github.io/{loc}</loc>", sitemap)


class HomepageHero(unittest.TestCase):
    def test_exetix_is_the_first_project_after_the_opening(self) -> None:
        opening_end = HOMEPAGE.index("</header>", HOMEPAGE.index('<header class="opening">'))
        xt = HOMEPAGE.index('<section class="work xt" id="exetix">')
        doorly = HOMEPAGE.index('id="doorly"')
        self.assertLess(opening_end, xt)
        self.assertLess(xt, doorly)
        between = HOMEPAGE[opening_end:xt]
        self.assertNotIn("<section", between)

    def test_opening_is_still_the_first_paint(self) -> None:
        opening = re.search(r'<header class="opening">.*?</header>', HOMEPAGE, re.S).group(0)
        self.assertNotIn("exetix/", opening)
        self.assertIn("I'D RATHER BUILD", opening)

    def test_hero_links_and_images(self) -> None:
        block = _section()
        self.assertIn('href="exetix/"', block)
        self.assertIn(LIVE_SITE, block)
        self.assertIn("Coming to the App Store", block)
        self.assertNotIn("apps.apple.com", block)
        p = _parse(block)
        self.assertGreaterEqual(len(p.imgs), 3)
        for img in p.imgs:
            self.assertTrue((img.get("alt") or "").strip(), img.get("src"))
            self.assertTrue((ROOT / img["src"]).is_file(), img["src"])
            self.assertEqual(img.get("loading"), "lazy", img["src"])

    def test_nav_points_at_exetix(self) -> None:
        mast = re.search(r'<div class="masthead">.*?</div>', HOMEPAGE, re.S).group(0)
        self.assertIn('href="exetix/"', mast)
        rail = re.search(r'<nav class="rail".*?</nav>', HOMEPAGE, re.S).group(0)
        self.assertIn('href="#exetix"', rail)
        self.assertLess(rail.index("#exetix"), rail.index("#doorly"))

    def test_homepage_still_nests(self) -> None:
        body = HOMEPAGE.split("<body>", 1)[1].split("<script", 1)[0]
        p = _parse(body)
        self.assertEqual(p.errors, [], p.errors[:5])


if __name__ == "__main__":
    unittest.main()
