#!/usr/bin/env python3
"""Restore the pre-scroll 'Scroll' hint and the wipe-open, not a full-phone MM fold.

Charles 1 Sep 2026: the overnight first-fold sell (PR #13) plus sticky mast
(PR #21) replaced the original opening. Before you scroll it should be the
small 'Scroll' text; then the veil wipes I'D RATHER BUILD and the site
opens. Merger Monitor / £5 stay after that, on the existing Gumroad SKU.

This file fails on the broken AFTER (MM copy mid-screen, no hint) and
passes on the restored reveal.
"""
from __future__ import annotations

import json
import re
import subprocess
import threading
from functools import lru_cache
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
HOMEPAGE = (ROOT / "index.html").read_text(encoding="utf-8")
MEASURE = ROOT / "tests" / "measure_mobile_fold.mjs"
GUMROAD = "https://wuytackcharlie.gumroad.com/l/mergermonitor"
MOBILE = (390, 844)
DESKTOP = (1280, 800)


class _QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):  # noqa: A003
        return


def _css() -> str:
    return HOMEPAGE.split("</style>", 1)[0]


def _opening() -> str:
    m = re.search(r'<header class="opening">.*?</header>', HOMEPAGE, re.S)
    assert m, "homepage has no opening header"
    return m.group(0)


@lru_cache(maxsize=1)
def _served_origin() -> str:
    httpd = ThreadingHTTPServer(("127.0.0.1", 0), lambda *a, **k: _QuietHandler(*a, directory=str(ROOT), **k))
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    host, port = httpd.server_address[:2]
    return f"http://{host}:{port}"


def _measure(width: int, height: int, scroll_y: int = 0) -> dict:
    origin = _served_origin()
    proc = subprocess.run(
        ["node", str(MEASURE), f"{origin}/", str(width), str(height), str(scroll_y)],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        timeout=40,
    )
    if proc.returncode != 0:
        raise AssertionError(f"fold probe failed:\n{proc.stderr or proc.stdout}")
    line = proc.stdout.strip().splitlines()[-1]
    return json.loads(line)


class HomepageOpeningReveal(unittest.TestCase):
    """Pre-scroll is the small hint. The MM sell is not the first paint."""

    def test_opening_html_has_scroll_hint_and_veil(self) -> None:
        opening = _opening()
        self.assertIn('class="scroll-hint"', opening)
        self.assertIn("Scroll", opening)
        self.assertIn('class="veil"', opening)
        self.assertIn("I'D RATHER BUILD", opening)
        self.assertIn("than consume", opening)
        self.assertIn('class="under"', opening)

    def test_opening_does_not_paint_mm_sell_before_scroll(self) -> None:
        """PR #13 put always-visible fold-sell in .pin-hero. That is the bug."""
        opening = _opening()
        css = _css()
        self.assertIn(".scroll-hint", css)
        self.assertIn("--hint-op", css)
        self.assertRegex(css, r"\.veil\s*\{[^}]*clip-path")
        # If fold-sell stays in the opening, it must be scroll-gated like .under.
        if "fold-sell" in opening:
            self.assertRegex(
                css,
                r"\.fold-sell\s*\{[^}]*opacity:\s*var\(--tail-op",
                "fold-sell is in the opening but not gated behind the wipe",
            )
        pin = re.search(r'<div class="pin-hero">(.*)</div>\s*</header>', opening, re.S)
        self.assertIsNotNone(pin)
        pin_html = pin.group(1)
        veil = re.search(r'<h1 class="veil">.*?</h1>', pin_html, re.S)
        self.assertIsNotNone(veil)
        hint = re.search(r'<p class="scroll-hint"[^>]*>.*?</p>', pin_html, re.S)
        self.assertIsNotNone(hint)
        self.assertLess(pin_html.find("scroll-hint"), pin_html.find('class="veil"'))

    def test_mm_pay_still_exists_after_the_open(self) -> None:
        mast = re.search(r'<div class="masthead">.*?</div>', HOMEPAGE, re.S)
        self.assertIsNotNone(mast)
        self.assertIn(GUMROAD, mast.group(0))
        self.assertIn("£5", mast.group(0))
        merger = re.search(r'<section class="work" id="merger">.*?</section>', HOMEPAGE, re.S)
        self.assertIsNotNone(merger)
        self.assertIn(GUMROAD, merger.group(0))
        self.assertNotIn("Clothes", HOMEPAGE)
        self.assertNotIn("mergerweekly", mast.group(0).lower())

    def test_mobile_viewport_before_scroll_is_the_small_hint(self) -> None:
        geo = _measure(*MOBILE, 0)
        self.assertGreaterEqual(geo["innerWidth"], 360)
        self.assertLessEqual(geo["innerWidth"], 430)
        self.assertEqual(geo["scrollY"], 0)

        self.assertTrue(geo["hintInView"], f"Scroll hint missing on first paint: {geo['scrollHint']!r}")
        self.assertFalse(
            geo["foldSellInView"],
            f"MM fold-sell is occupying the phone before scroll: {geo['foldSell']!r}",
        )
        self.assertLess(
            geo["revealPct"],
            2,
            f"veil already open before scroll: {geo['revealPct']}",
        )
        self.assertEqual(geo["payHref"], GUMROAD)

    def test_mobile_viewport_scroll_wipes_the_headline_open(self) -> None:
        geo = _measure(*MOBILE, int(844 * 0.55))
        self.assertGreater(
            geo["revealPct"],
            20,
            f"scroll did not open the veil: {geo['revealPct']}",
        )
        self.assertEqual(geo["payHref"], GUMROAD)

    def test_desktop_reveal_does_not_regress(self) -> None:
        rest = _measure(*DESKTOP, 0)
        self.assertTrue(rest["hintInView"])
        self.assertFalse(rest["foldSellInView"])
        self.assertLess(rest["revealPct"], 2)
        self.assertEqual(rest["payHref"], GUMROAD)
        opened = _measure(*DESKTOP, int(800 * 0.55))
        self.assertGreater(opened["revealPct"], 20)
        self.assertEqual(opened["payHref"], GUMROAD)
        self.assertEqual(opened["foldHref"] or GUMROAD, GUMROAD)


if __name__ == "__main__":
    unittest.main()
