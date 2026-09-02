#!/usr/bin/env python3
"""Overnight leftover after /sizer/ PR #28.

/example/ and /weekly/ still tell the published 3% / +1.38% / 1.59% story.
They now add one honest sentence: the public calculator at /sizer/ fails
closed to the measured 40bp bar; unknown stage stays the labelled 1.57%
policy.

Homepage first fold (Scroll wipe / I'D RATHER BUILD) stays untouched.
No posts. Existing Gumroad SKUs only. Paper / education only.
"""
from __future__ import annotations

import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXAMPLE = ROOT / "example" / "index.html"
WEEKLY = ROOT / "weekly" / "index.html"
HOMEPAGE = ROOT / "index.html"
GUMROAD = "https://wuytackcharlie.gumroad.com/l/mergermonitor"
WEEKLY_SKU = "https://wuytackcharlie.gumroad.com/l/mergerweekly"


def _hrefs(html: str, needle: str) -> list[str]:
    return re.findall(r'href="([^"]*%s[^"]*)"' % re.escape(needle), html)


def _sizer_hrefs(html: str) -> list[str]:
    hrefs = _hrefs(html, "sizer")
    return [
        h
        for h in hrefs
        if re.search(r"(?:^|/)sizer/?$", h.rstrip("/")) or "/sizer/" in h
    ]


def _method_story(html: str) -> None:
    tc = unittest.TestCase()
    tc.assertIn("24.6%", html)
    tc.assertIn("+1.38%", html)
    tc.assertIn("1.59%", html)
    tc.assertIn("3%", html)


def _fail_closed_sentence(html: str, page: str) -> str:
    """The leftover is one sentence that names /sizer/, 40bp, and 1.57%."""
    lowered = html.lower()
    tc = unittest.TestCase()
    hrefs = _sizer_hrefs(html)
    tc.assertTrue(hrefs, f"{page} has no /sizer/ href")
    tc.assertTrue(
        any(h.rstrip("/").endswith("sizer") or "/sizer/" in h or h.endswith("sizer/") for h in hrefs),
        f"{page} /sizer/ hrefs are not the public calculator: {hrefs!r}",
    )
    tc.assertRegex(
        lowered,
        r"fail(?:s|ed)?\s+closed",
        f"{page} must say the calculator fails closed",
    )
    tc.assertIn("40bp", lowered, f"{page} must name the measured 40bp bar")
    tc.assertIn("1.57%", html, f"{page} must keep unknown stage on the labelled 1.57% policy")
    tc.assertTrue(
        "unknown" in lowered and "stage" in lowered,
        f"{page} must name the unknown-stage policy",
    )
    tc.assertTrue(
        "labelled" in lowered or "labeled" in lowered,
        f"{page} must say the 1.57% policy is labelled",
    )
    # The pointer is one sentence, not a new hero or a second method.
    matches = re.findall(
        r"[^.<]*(?:<a[^>]*>)?/sizer/(?:</a>)?[^.<]*fail(?:s|ed)?\s+closed[^.<]*40bp[^.<]*1\.57%[^.<]*\.",
        html,
        re.I | re.S,
    )
    tc.assertTrue(
        matches,
        f"{page} needs one sentence that /sizer/ fails closed to the 40bp bar "
        f"(unknown stage stays labelled 1.57%)",
    )
    return matches[0]


class ExamplePointsAtFailClosedSizer(unittest.TestCase):
    def _html(self) -> str:
        self.assertTrue(EXAMPLE.is_file(), "/example/ page is missing")
        return EXAMPLE.read_text(encoding="utf-8")

    def test_still_tells_the_published_3pct_story(self) -> None:
        html = self._html()
        _method_story(html)
        self.assertIn("ACA", html)
        self.assertIn("+3.44%", html)

    def test_one_honest_sentence_points_at_fail_closed_sizer(self) -> None:
        html = self._html()
        sentence = _fail_closed_sentence(html, "/example/")
        self.assertIn("public calculator", sentence.lower())
        first_gumroad = html.lower().find("wuytackcharlie.gumroad.com")
        self.assertGreater(first_gumroad, 0)
        self.assertLess(html.lower().find("sizer/"), first_gumroad)

    def test_existing_sku_only_and_no_posts(self) -> None:
        html = self._html()
        gumroad = re.findall(r"https://wuytackcharlie\.gumroad\.com/l/[a-z0-9]+", html.lower())
        self.assertTrue(all(u in {GUMROAD, WEEKLY_SKU} for u in gumroad), gumroad)
        self.assertIn(GUMROAD, gumroad)
        lowered = html.lower()
        self.assertIn("not advice", lowered)
        self.assertTrue("paper" in lowered or "education" in lowered or "not advice" in lowered)
        self.assertNotIn("twitter.com/intent", lowered)
        self.assertNotIn("reddit.com/submit", lowered)
        self.assertNotIn("news.ycombinator.com/submit", lowered)
        self.assertNotIn("/l/merger", html.lower().replace(GUMROAD, "").replace(WEEKLY_SKU, ""))


class WeeklyPointsAtFailClosedSizer(unittest.TestCase):
    def _html(self) -> str:
        self.assertTrue(WEEKLY.is_file(), "/weekly/ page is missing")
        return WEEKLY.read_text(encoding="utf-8")

    def test_still_tells_the_published_3pct_story(self) -> None:
        html = self._html()
        _method_story(html)
        self.assertIn("ACA", html)
        self.assertIn("CRNX", html)

    def test_one_honest_sentence_points_at_fail_closed_sizer(self) -> None:
        html = self._html()
        sentence = _fail_closed_sentence(html, "/weekly/")
        self.assertIn("public calculator", sentence.lower())
        first_gumroad = html.lower().find("wuytackcharlie.gumroad.com")
        self.assertGreater(first_gumroad, 0)
        self.assertLess(html.lower().find("sizer/"), first_gumroad)

    def test_existing_sku_only_and_no_posts(self) -> None:
        html = self._html()
        gumroad = re.findall(r"https://wuytackcharlie\.gumroad\.com/l/[a-z0-9]+", html.lower())
        self.assertTrue(all(u in {GUMROAD, WEEKLY_SKU} for u in gumroad), gumroad)
        self.assertIn(WEEKLY_SKU, gumroad)
        lowered = html.lower()
        self.assertIn("not advice", lowered)
        self.assertNotIn("twitter.com/intent", lowered)
        self.assertNotIn("reddit.com/submit", lowered)
        self.assertNotIn("news.ycombinator.com/submit", lowered)
        self.assertNotIn("/l/merger", html.lower().replace(GUMROAD, "").replace(WEEKLY_SKU, ""))


class HomepageFirstFoldUntouched(unittest.TestCase):
    """Do not replace Scroll / I'D RATHER BUILD. This leftover is copy only."""

    def test_opening_still_wipes_to_id_rather_build(self) -> None:
        homepage = HOMEPAGE.read_text(encoding="utf-8")
        fold = re.search(r'<header class="opening">.*?</header>', homepage, re.S)
        self.assertIsNotNone(fold)
        text = fold.group(0)
        self.assertIn('id="scrollHint"', text)
        self.assertIn("Scroll", text)
        self.assertIn("I'D RATHER BUILD", text)
        self.assertNotIn("1.57%", text)
        self.assertNotIn("40bp", text.lower())
        self.assertNotIn("sizer/", text.lower())
        self.assertNotIn("fail closed", text.lower())
        self.assertNotIn("fails closed", text.lower())


if __name__ == "__main__":
    unittest.main()
