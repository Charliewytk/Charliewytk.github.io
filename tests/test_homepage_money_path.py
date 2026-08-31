#!/usr/bin/env python3
"""Homepage money-path rails for Merger Monitor.

PR #6 makes /merger-monitor obvious on the homepage (masthead + week-late
preview). PR #2 owns the paid button once /subscribe/ exists. Together they
must not invent subscribers, reintroduce Exeter Auto Buys, or make the
primary CTA the free weekly.
"""
from __future__ import annotations

import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HOMEPAGE = (ROOT / "index.html").read_text(encoding="utf-8")
SUBSCRIBE = ROOT / "subscribe" / "index.html"
TABLE = ROOT / "merger-monitor" / "index.html"
GUMROAD = "https://wuytackcharlie.gumroad.com/l/mergermonitor"
WEEKLY = "https://wuytackcharlie.gumroad.com/l/mergerweekly"


def _hrefs(html: str, needle: str) -> list[str]:
    return re.findall(r'href="([^"]*%s[^"]*)"' % re.escape(needle), html)


def _merger_block() -> str:
    merger = re.search(r'<section class="work" id="merger">.*?</section>', HOMEPAGE, re.S)
    assert merger is not None, "homepage has no Merger Monitor section"
    return merger.group(0)


class HomepageMoneyPath(unittest.TestCase):
    def test_homepage_links_to_merger_monitor(self) -> None:
        hrefs = _hrefs(HOMEPAGE, "merger-monitor")
        self.assertTrue(
            any(h.rstrip("/").endswith("merger-monitor") or "/merger-monitor/" in h or h.endswith("merger-monitor/")
                for h in hrefs),
            f"homepage has no /merger-monitor link, found {hrefs!r}",
        )

    def test_merger_monitor_link_is_obvious(self) -> None:
        """Masthead plus a clickable week-late preview — not a footnote-only href."""
        mast = re.search(r'<div class="masthead">.*?</div>', HOMEPAGE, re.S)
        self.assertIsNotNone(mast)
        self.assertIn("merger-monitor", mast.group(0))

        block = _merger_block()
        preview = re.search(r'<a class="mm-preview[^"]*" href="([^"]+)"', block)
        self.assertIsNotNone(preview, "Merger Monitor section has no clickable week-late preview")
        self.assertIn("merger-monitor", preview.group(1))
        self.assertIn("mm-preview", block)
        self.assertIn("merger-monitor", block)

    def test_primary_paid_cta_is_subscribe(self) -> None:
        """Once /subscribe/ exists, the paid button owns that path — not the free weekly."""
        block = _merger_block()
        go = re.search(r'<a class="go(?:\s+pay)?" href="([^"]+)"', block)
        self.assertIsNotNone(go, "Merger Monitor section has no primary .go link")
        href = go.group(1)
        self.assertTrue(
            href.rstrip("/").endswith("subscribe") or href.endswith("subscribe/"),
            f"primary CTA should be /subscribe/, got {href!r}",
        )
        self.assertNotIn("mergerweekly", href)
        self.assertNotEqual(href, WEEKLY)

    def test_paid_path_is_subscribe_plus_gumroad(self) -> None:
        self.assertTrue(SUBSCRIBE.is_file(), "/subscribe/ page from PR #2 is missing")
        subscribe = SUBSCRIBE.read_text(encoding="utf-8")
        hrefs = _hrefs(HOMEPAGE, "subscribe")
        self.assertTrue(
            any(h.rstrip("/").endswith("subscribe") or h.endswith("subscribe/") for h in hrefs),
            f"homepage has no /subscribe/ link, found {hrefs!r}",
        )
        self.assertIn(GUMROAD, subscribe)

    def test_exeter_auto_buys_is_out(self) -> None:
        self.assertNotIn('id="exeter"', HOMEPAGE)
        self.assertNotRegex(HOMEPAGE, r"Exeter\s+auto\s+buys", re.I)
        self.assertNotIn("Exeter Auto Buys", HOMEPAGE)
        self.assertNotIn("#exeter", HOMEPAGE)

    def test_no_fake_subscriber_counts(self) -> None:
        lowered = HOMEPAGE.lower()
        self.assertIsNone(re.search(r"\d[\d,]*\s+subscribers?", lowered))
        self.assertIsNone(re.search(r"join\s+\d", lowered))
        self.assertNotIn("social proof", lowered)
        # Chelsea Bikes uses "customers" as a shop problem, not a count. Fine.
        self.assertIsNone(re.search(r"\d[\d,]*\s+customers", lowered))

    def test_paid_checkout_is_gumroad_not_a_new_form(self) -> None:
        block = _merger_block()
        self.assertNotIn("<form", block.lower())
        self.assertNotRegex(block, r"href=\"[^\"]*checkout", re.I)
        self.assertTrue(SUBSCRIBE.is_file())
        subscribe = SUBSCRIBE.read_text(encoding="utf-8")
        self.assertIn(GUMROAD, subscribe)
        self.assertNotIn("<form", subscribe.lower())

    def test_honest_week_late_copy(self) -> None:
        text = _merger_block().lower()
        self.assertTrue("week" in text and "late" in text)
        self.assertNotIn("guaranteed", text)
        self.assertNotIn("live trading", text)
        self.assertIn("£5", text)
        self.assertTrue("filing" in text or "filings" in text)
        self.assertTrue("not a tip sheet" in text or "not advice" in text)


class SubscribeAndTablePath(unittest.TestCase):
    def test_subscribe_primary_button_is_gumroad(self) -> None:
        html = SUBSCRIBE.read_text(encoding="utf-8")
        btn = re.search(r'<a class="btn" href="([^"]+)"', html)
        self.assertIsNotNone(btn, "/subscribe/ has no primary .btn")
        self.assertEqual(btn.group(1), GUMROAD)
        self.assertEqual(html.count(GUMROAD), html.lower().count("wuytackcharlie.gumroad.com/l/mergermonitor"))
        self.assertNotIn("<form", html.lower())
        self.assertIsNone(re.search(r"\d[\d,]*\s+subscribers?", html.lower()))
        self.assertNotIn("guaranteed edge", html.lower())

    def test_subscribe_says_the_offer_in_ten_seconds(self) -> None:
        html = SUBSCRIBE.read_text(encoding="utf-8").lower()
        self.assertIn("filing", html)
        self.assertIn("not advice", html)
        self.assertIn("£5", html)
        self.assertIn("extract", html)

    def test_table_banner_primary_is_subscribe(self) -> None:
        html = TABLE.read_text(encoding="utf-8")
        banner = html.split("<style>", 1)[0]
        hrefs = re.findall(r'<a href="([^"]+)"', banner)
        self.assertTrue(hrefs, "week-late table has no banner links")
        self.assertTrue(
            hrefs[0].rstrip("/").endswith("subscribe") or hrefs[0].endswith("/subscribe/"),
            f"table primary CTA should be /subscribe/, got {hrefs[0]!r}",
        )
        self.assertNotEqual(hrefs[0], WEEKLY)
        self.assertIn(WEEKLY, html)
        self.assertNotIn("gumroad.com/l/", hrefs[0])

    def test_footer_does_not_kill_the_live_product(self) -> None:
        self.assertNotIn("merger-arbitrage newsletter", HOMEPAGE)
        self.assertIn("Resale Radar", HOMEPAGE)
        self.assertNotIn("Clothes", HOMEPAGE)


if __name__ == "__main__":
    unittest.main()
