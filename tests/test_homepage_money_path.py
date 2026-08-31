#!/usr/bin/env python3
"""Homepage money-path rails for Merger Monitor.

This PR makes /merger-monitor obvious on the homepage.
It must not invent subscribers, reintroduce Exeter Auto Buys,
or smash the /subscribe/ page owned by PR #2.
"""
from __future__ import annotations

import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HOMEPAGE = (ROOT / "index.html").read_text(encoding="utf-8")
SUBSCRIBE = ROOT / "subscribe" / "index.html"
GUMROAD = "https://wuytackcharlie.gumroad.com/l/mergermonitor"


def _hrefs(html: str, needle: str) -> list[str]:
    return re.findall(r'href="([^"]*%s[^"]*)"' % re.escape(needle), html)


class HomepageMoneyPath(unittest.TestCase):
    def test_homepage_links_to_merger_monitor(self) -> None:
        hrefs = _hrefs(HOMEPAGE, "merger-monitor")
        self.assertTrue(
            any(h.rstrip("/").endswith("merger-monitor") or "/merger-monitor/" in h or h.endswith("merger-monitor/")
                for h in hrefs),
            f"homepage has no /merger-monitor link, found {hrefs!r}",
        )

    def test_merger_monitor_link_is_obvious(self) -> None:
        """Masthead plus a section CTA — not a footnote-only href."""
        mast = re.search(r'<div class="masthead">.*?</div>', HOMEPAGE, re.S)
        self.assertIsNotNone(mast)
        self.assertIn("merger-monitor", mast.group(0))

        merger = re.search(r'<section class="work" id="merger">.*?</section>', HOMEPAGE, re.S)
        self.assertIsNotNone(merger)
        block = merger.group(0)
        go = re.search(r'<a class="go" href="([^"]+)"', block)
        self.assertIsNotNone(go, "Merger Monitor section has no primary .go link")
        self.assertIn("merger-monitor", go.group(1))
        self.assertIn("mm-preview", block)
        self.assertIn("merger-monitor", block)

    def test_paid_path_is_the_live_gumroad_listing(self) -> None:
        self.assertIn(GUMROAD, HOMEPAGE)

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

    def test_this_pr_does_not_add_subscribe_page(self) -> None:
        self.assertFalse(SUBSCRIBE.exists(), "do not smash PR #2 — leave /subscribe/ alone")
        self.assertNotIn("/subscribe/", HOMEPAGE)
        self.assertNotIn('href="subscribe/"', HOMEPAGE)

    def test_honest_week_late_copy(self) -> None:
        merger = re.search(r'<section class="work" id="merger">.*?</section>', HOMEPAGE, re.S)
        self.assertIsNotNone(merger)
        text = merger.group(0).lower()
        self.assertTrue("week" in text and "late" in text)
        self.assertNotIn("guaranteed", text)
        self.assertNotIn("live trading", text)


if __name__ == "__main__":
    unittest.main()
