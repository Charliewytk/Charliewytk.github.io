#!/usr/bin/env python3
"""Paste-ready share drafts for Charles — method first, he still clicks post.

/share/ is a phone clipboard, not another funnel. Agents never submit
Reddit, X, or HN. Frozen method figures must match the published site
(24.6% / 2.4% / +1.38%), not feed_summary drift.
"""
from __future__ import annotations

import html as html_lib
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHARE = ROOT / "share" / "index.html"
EXAMPLE = ROOT / "example" / "index.html"
WEEKLY = ROOT / "weekly" / "index.html"
SUBSCRIBE = ROOT / "subscribe" / "index.html"

EXAMPLE_URL = "https://charliewytk.github.io/example/"
WEEKLY_URL = "https://charliewytk.github.io/weekly/"

# Advice words defined for these drafts. Word-boundary only — "sold" and
# "resale" stay allowed; "buy ACA" / "alpha" do not.
ADVICE_WORDS = ("buy", "sell", "accumulate", "alpha")
ADVICE_RE = re.compile(r"\b(?:" + "|".join(ADVICE_WORDS) + r")\b", re.I)

DRAFT_KEYS = ("reddit-sa", "reddit-investing", "hn", "x")


def _page() -> str:
    assert SHARE.is_file(), "/share/ page is missing"
    return SHARE.read_text(encoding="utf-8")


def _block(html: str, key: str) -> str:
    m = re.search(
        rf'<section[^>]*data-draft="{re.escape(key)}"[^>]*>(.*?)</section>',
        html,
        re.S,
    )
    assert m is not None, f"missing data-draft={key!r}"
    return m.group(1)


def _fields(html: str, key: str) -> dict[str, str]:
    block = _block(html, key)
    out = {}
    for field, body in re.findall(
        r'<textarea[^>]*data-field="([^"]+)"[^>]*>(.*?)</textarea>',
        block,
        re.S,
    ):
        out[field] = html_lib.unescape(body).strip()
    return out


def _draft_text(html: str, key: str) -> str:
    fields = _fields(html, key)
    assert fields, f"data-draft={key!r} has no textarea fields"
    return "\n".join(fields[k] for k in sorted(fields))


class ShareDraftsPage(unittest.TestCase):
    def test_share_page_exists(self) -> None:
        self.assertTrue(SHARE.is_file(), "/share/ page is missing")

    def test_marked_as_drafts_he_still_clicks_post(self) -> None:
        html = _page()
        lowered = html.lower()
        self.assertIn("draft", lowered)
        self.assertTrue(
            "you still click" in lowered or "he still clicks" in lowered or "still click post" in lowered,
            "page must say these are drafts and he still clicks post",
        )
        self.assertTrue(
            "never submit" in lowered or "agents never" in lowered,
            "page must say agents never submit",
        )
        self.assertIn("charliequantack", lowered)

    def test_four_paste_fields_for_three_drafts(self) -> None:
        html = _page()
        for key in DRAFT_KEYS:
            fields = _fields(html, key)
            self.assertTrue(fields, key)
        self.assertIn("title", _fields(html, "reddit-sa"))
        self.assertIn("body", _fields(html, "reddit-sa"))
        self.assertIn("title", _fields(html, "reddit-investing"))
        self.assertIn("body", _fields(html, "reddit-investing"))
        self.assertIn("title", _fields(html, "hn"))
        self.assertIn("body", _fields(html, "hn"))
        self.assertIn("body", _fields(html, "x"))
        hn_title = _fields(html, "hn")["title"]
        self.assertTrue(hn_title.startswith("Show HN"), hn_title)
        investing = _draft_text(html, "reddit-investing")
        security = _draft_text(html, "reddit-sa")
        self.assertLess(len(investing), len(security))

    def test_drafts_lead_with_frozen_method_numbers(self) -> None:
        html = _page()
        example = EXAMPLE.read_text(encoding="utf-8")
        weekly = WEEKLY.read_text(encoding="utf-8")
        subscribe = SUBSCRIBE.read_text(encoding="utf-8")
        # Verify, do not invent: published site still uses these figures.
        self.assertIn("24.6%", weekly)
        self.assertIn("+1.38%", weekly)
        self.assertIn("24.6%", example)
        self.assertIn("+1.38%", example)
        self.assertIn("2.4%", example)
        self.assertIn("2.4%", subscribe)
        for key in DRAFT_KEYS:
            text = _draft_text(html, key)
            self.assertIn("24.6%", text, key)
            self.assertIn("2.4%", text, key)
            self.assertIn("+1.38%", text, key)
            lead = text[:220]
            self.assertIn("24.6%", lead, f"{key} must lead with the method")
            self.assertIn("+1.38%", lead, f"{key} must lead with the method")

    def test_drafts_contain_both_public_urls(self) -> None:
        html = _page()
        for key in DRAFT_KEYS:
            text = _draft_text(html, key)
            self.assertIn(EXAMPLE_URL, text, key)
            self.assertIn(WEEKLY_URL, text, key)

    def test_drafts_do_not_contain_defined_advice_words(self) -> None:
        html = _page()
        for key in DRAFT_KEYS:
            text = _draft_text(html, key)
            hit = ADVICE_RE.search(text)
            self.assertIsNone(
                hit,
                f"{key} contains advice word {hit.group(0)!r}" if hit else key,
            )

    def test_extraction_and_cost_sizing_only(self) -> None:
        html = _page()
        lowered = html.lower()
        self.assertTrue("extract" in lowered or "cost-sizing" in lowered or "cost sizing" in lowered)
        self.assertIn("not advice", lowered)
        for banned in (
            "buy aca",
            "buy arcosa",
            "i made",
            "i trade",
            "p&amp;l-advice",
            "p&l advice",
            "guaranteed",
            "haircut",
            "companion product",
            "brain",
            "codabench",
            "launchd",
            "live order",
        ):
            self.assertNotIn(banned, lowered)
        self.assertIsNone(re.search(r"\bict\b", lowered))
        self.assertIsNone(re.search(r"[1-9][\d,]*\s+subscribers?", lowered))
        self.assertNotIn("join ", lowered)
        # Not another page of CTAs.
        self.assertNotIn("gumroad.com", lowered)
        self.assertNotIn('class="paybar"', html)
        self.assertNotIn('class="btn"', html)
        self.assertNotIn("<form", lowered)
        self.assertIn("noindex", html.lower())


if __name__ == "__main__":
    unittest.main()
