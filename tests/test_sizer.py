#!/usr/bin/env python3
"""Interactive cost-sizer at /sizer/ — same method, frozen published 3% case.

A stranger pastes offer and market (optional break-rate and round-trip cost).
Output is the method already on /example/ and /subscribe/: spread, annualised
gross, net after the stated break rate and costs.

Defaults are the frozen published figures, not feed_summary drift:
3% → 24.6% / 2.4% break / 0.40% costs / +1.38%.
No paywall, no second SKU, no live prices, no P&L advice.
"""
from __future__ import annotations

import json
import re
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SIZER = ROOT / "sizer" / "index.html"
JS = ROOT / "assets" / "js" / "merger-sizer.js"
GUMROAD = "https://wuytackcharlie.gumroad.com/l/mergermonitor"
WEEKLY = "https://wuytackcharlie.gumroad.com/l/mergerweekly"

# Published 3% case already on /example/ and /subscribe/. Do not invent.
PUBLISHED = {
    "spread_pct": 3.0,
    "annualised_pct": 24.6,
    "break_rate_label": "2.4%",
    "cost_pct": 0.40,
    "net_pct": 1.38,
    "net_label": "+1.38%",
    "annualised_label": "24.6%",
    "ev_1pct_label": "-0.57%",
    "breakeven_label": "1.59%",
}


def _hrefs(html: str, needle: str) -> list[str]:
    return re.findall(r'href="([^"]*%s[^"]*)"' % re.escape(needle), html)


def _run_sizer(payload: dict) -> dict:
    """Call the published JS module. Fails until merger-sizer.js exists."""
    node = (
        "const size = require('./assets/js/merger-sizer.js').size;\n"
        "const out = size(" + json.dumps(payload) + ");\n"
        "process.stdout.write(JSON.stringify(out));\n"
    )
    proc = subprocess.run(["node", "-e", node], cwd=str(ROOT), capture_output=True, text=True)
    if proc.returncode != 0:
        raise AssertionError(proc.stderr or proc.stdout or f"node exit {proc.returncode}")
    return json.loads(proc.stdout)


class PublishedThreePercentCase(unittest.TestCase):
    """The arithmetic a stranger sees with defaults must match the site."""

    def test_sizer_module_exists(self) -> None:
        self.assertTrue(JS.is_file(), "assets/js/merger-sizer.js is missing")

    def test_known_3pct_case_matches_published_net(self) -> None:
        out = _run_sizer({"offer": 103, "market": 100})
        self.assertAlmostEqual(out["spreadPct"], PUBLISHED["spread_pct"], places=6)
        self.assertAlmostEqual(out["annualisedPct"], PUBLISHED["annualised_pct"], places=6)
        self.assertAlmostEqual(out["netPct"], PUBLISHED["net_pct"], places=2)
        self.assertEqual(out["annualisedLabel"], PUBLISHED["annualised_label"])
        self.assertEqual(out["netLabel"], PUBLISHED["net_label"])
        self.assertEqual(out["breakRateLabel"], PUBLISHED["break_rate_label"])
        self.assertAlmostEqual(out["costPct"], PUBLISHED["cost_pct"], places=2)

    def test_3pct_case_uses_stated_break_sample_not_live_feed(self) -> None:
        """Published 2.4% is 39 of 1,606 — not feed_summary's 2.5% / +1.35%."""
        out = _run_sizer({"offer": 103, "market": 100})
        feed = json.loads((ROOT / "merger-monitor" / "feed_summary.json").read_text(encoding="utf-8"))
        self.assertNotAlmostEqual(out["netPct"], float(feed["ev_3pct_per_deal"]), places=2)
        self.assertEqual(out["netLabel"], "+1.38%")
        self.assertEqual(out["breaks"], 39)
        self.assertEqual(out["settled"], 1606)

    def test_1pct_case_and_breakeven_stay_on_the_published_method(self) -> None:
        one = _run_sizer({"offer": 101, "market": 100})
        self.assertAlmostEqual(one["spreadPct"], 1.0, places=6)
        self.assertEqual(one["netLabel"], PUBLISHED["ev_1pct_label"])
        three = _run_sizer({"offer": 103, "market": 100})
        self.assertEqual(three["breakevenLabel"], PUBLISHED["breakeven_label"])

    def test_spread_is_offer_over_market(self) -> None:
        """Same pricing step as /example/: divide offer by the market."""
        out = _run_sizer({"offer": 150, "market": 145.01})
        self.assertAlmostEqual(out["spreadPct"], (150 / 145.01 - 1) * 100, places=6)

    def test_optional_break_rate_and_cost_override_defaults(self) -> None:
        base = _run_sizer({"offer": 103, "market": 100})
        custom = _run_sizer(
            {"offer": 103, "market": 100, "breakRatePct": 5, "costPct": 1.0}
        )
        self.assertNotAlmostEqual(custom["netPct"], base["netPct"], places=2)
        self.assertLess(custom["netPct"], base["netPct"])

    def test_money_strings_and_blank_optionals_still_hit_the_3pct_case(self) -> None:
        out = _run_sizer({"offer": "$103.00", "market": "100", "breakRatePct": "", "costPct": ""})
        self.assertEqual(out["netLabel"], PUBLISHED["net_label"])
        self.assertEqual(out["annualisedLabel"], PUBLISHED["annualised_label"])

    def test_signed_pct_does_not_print_plus_minus_zero(self) -> None:
        """Rounded −0.00 must not become +-0.00%."""
        node = (
            "const fmt = require('./assets/js/merger-sizer.js').fmtSignedPct;\n"
            "process.stdout.write(JSON.stringify([\n"
            "  fmt(-0.001, 2),\n"
            "  fmt(0, 2),\n"
            "  fmt(1.38148, 2)\n"
            "]));\n"
        )
        proc = subprocess.run(["node", "-e", node], cwd=str(ROOT), capture_output=True, text=True)
        self.assertEqual(proc.returncode, 0, proc.stderr)
        minus_zero, zero, published = json.loads(proc.stdout)
        self.assertNotIn("+-", minus_zero)
        self.assertIn(minus_zero, ("-0.00%", "+0.00%"))
        self.assertEqual(zero, "+0.00%")
        self.assertEqual(published, "+1.38%")

    def test_custom_break_and_cost_have_an_exact_net(self) -> None:
        out = _run_sizer({"offer": 103, "market": 100, "breakRatePct": 5, "costPct": 1.0})
        self.assertEqual(out["netLabel"], "+0.01%")
        self.assertEqual(out["breakRateLabel"], "5.0%")
        self.assertEqual(out["costLabel"], "1.00%")


class SizerPage(unittest.TestCase):
    """Public tool. No paywall. One Gumroad CTA after the arithmetic."""

    def _html(self) -> str:
        self.assertTrue(SIZER.is_file(), "/sizer/ page is missing")
        return SIZER.read_text(encoding="utf-8")

    def test_page_exists_and_is_not_paywalled(self) -> None:
        html = self._html()
        self.assertNotIn('class="paybar"', html)
        self.assertNotIn('class="gate"', html)
        body = html.split("<body", 1)[-1].lower()
        self.assertNotIn("get tonight", body.split("gumroad.com", 1)[0] if "gumroad.com" in body else body)
        first_gumroad = html.lower().find("wuytackcharlie.gumroad.com/l/mergermonitor")
        self.assertGreater(first_gumroad, 0, "existing £5 SKU missing")
        before = html[:first_gumroad]
        self.assertIn("24.6%", before)
        self.assertIn("+1.38%", before)
        self.assertTrue("offer" in before.lower() and "market" in before.lower())

    def test_defaults_are_the_frozen_published_figures(self) -> None:
        html = self._html()
        self.assertIn('value="103"', html)
        self.assertIn('value="100"', html)
        self.assertIn("2.4", html)
        self.assertIn("0.40", html)
        self.assertIn("24.6%", html)
        self.assertIn("+1.38%", html)
        self.assertIn("merger-sizer.js", html)
        self.assertNotIn("merger-stats.js", html)
        self.assertNotIn("feed_summary", html)
        self.assertNotIn("data-merger-", html)

    def test_inputs_are_offer_market_optional_break_and_cost(self) -> None:
        html = self._html()
        for name in ("offer", "market", "break-rate", "cost"):
            self.assertTrue(
                f'id="{name}"' in html or f'name="{name}"' in html,
                f"missing input {name}",
            )
        self.assertIn("break", html.lower())
        self.assertTrue("round-trip" in html.lower() or "round trip" in html.lower() or "cost" in html.lower())

    def test_outputs_are_spread_annualised_and_net(self) -> None:
        html = self._html()
        for attr in ("spread", "annualised", "net"):
            self.assertIn(f'data-out="{attr}"', html)
        lowered = html.lower()
        self.assertIn("annualis", lowered)
        self.assertIn("spread", lowered)

    def test_quiet_links_at_the_bottom(self) -> None:
        html = self._html()
        footer = html.split("<footer", 1)[-1]
        hrefs_ex = _hrefs(footer, "example")
        hrefs_wk = _hrefs(footer, "weekly")
        self.assertTrue(
            any(h.rstrip("/").endswith("example") or "/example/" in h or h.endswith("example/")
                for h in hrefs_ex),
            f"footer missing /example/, found {hrefs_ex!r}",
        )
        self.assertTrue(
            any(h.rstrip("/").endswith("weekly") or "/weekly/" in h or h.endswith("weekly/")
                for h in hrefs_wk),
            f"footer missing /weekly/, found {hrefs_wk!r}",
        )
        self.assertIn(GUMROAD, footer)
        self.assertIn("£5", footer)

    def test_honest_zero_and_no_advice(self) -> None:
        html = self._html()
        lowered = html.lower()
        self.assertIn("zero subscribers", lowered)
        self.assertIn("£0", html)
        self.assertIn("not advice", lowered)
        self.assertIsNone(re.search(r"[1-9][\d,]*\s+subscribers?", lowered))
        self.assertNotIn("join ", lowered)
        for banned in (
            "buy this",
            "buy aca",
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
            "live price",
            "live prices",
        ):
            self.assertNotIn(banned, lowered)
        self.assertIsNone(re.search(r"\bict\b", lowered))
        self.assertIsNone(re.search(r"\bbuy\b", lowered))

    def test_existing_sku_only(self) -> None:
        html = self._html()
        gumroad = re.findall(r"https://wuytackcharlie\.gumroad\.com/l/[a-z0-9]+", html.lower())
        self.assertTrue(all(u in {GUMROAD, WEEKLY} for u in gumroad), gumroad)
        self.assertIn(GUMROAD, gumroad)
        self.assertNotIn("new sku", html.lower())

    def test_pay_path_cta_contains_gumroad_url(self) -> None:
        """Sizer HTML names the existing SKU. One CTA, subscribe/kill-log voice."""
        html = self._html()
        self.assertIn(GUMROAD, html)
        btns = re.findall(r'<a class="btn" href="([^"]+)"[^>]*>([^<]+)</a>', html)
        self.assertTrue(btns, "/sizer/ has no pay-path CTA")
        self.assertEqual(btns[0][0], GUMROAD)
        self.assertIn("Get tonight's table", btns[0][1])
        self.assertIn("£5", btns[0][1])
        self.assertEqual(len(btns), 1)
        form_pos = html.find('id="sizer"')
        btn_pos = html.find('class="btn"')
        self.assertGreater(form_pos, 0)
        self.assertGreater(btn_pos, form_pos, "CTA must follow the calculator, not lead it")
        between = html[form_pos:btn_pos]
        self.assertIn("24.6%", between)
        self.assertIn("+1.38%", between)
        self.assertNotIn("weekly", btns[0][0])
        self.assertNotIn("weekly", btns[0][1].lower())
        hrefs_wk = _hrefs(html, "weekly")
        self.assertTrue(
            any(
                h.rstrip("/").endswith("weekly") or "/weekly/" in h or h.endswith("weekly/")
                for h in hrefs_wk
            ),
            f"/sizer/ missing quieter /weekly/, found {hrefs_wk!r}",
        )
        self.assertRegex(html.lower(), r"week[-\s]?late")
        self.assertNotIn("share/", html.lower())
        self.assertNotIn('class="paybar"', html)

    def test_homepage_index_contains_sizer_href(self) -> None:
        """Homepage notes point at the public calculator. Not a new hero."""
        homepage = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn('href="sizer/"', homepage)
        block = re.search(r'<section class="work" id="merger">.*?</section>', homepage, re.S)
        self.assertIsNotNone(block)
        notes = re.search(
            r'<div class="worked rise">(.*)</div>\s*<div class="doing-row',
            block.group(0),
            re.S,
        )
        self.assertIsNotNone(notes, "merger-monitor notes block missing")
        self.assertIn('href="sizer/"', notes.group(1))
        self.assertIn('href="example/"', notes.group(1))
        self.assertNotIn("share/", homepage.lower())

    def test_does_not_replace_paid_path_on_homepage_or_subscribe(self) -> None:
        homepage = (ROOT / "index.html").read_text(encoding="utf-8")
        fold = re.search(r'<header class="opening">.*?</header>', homepage, re.S)
        self.assertIsNotNone(fold)
        self.assertIn(GUMROAD, fold.group(0))
        self.assertNotIn("sizer/", fold.group(0).lower())

        subscribe = (ROOT / "subscribe" / "index.html").read_text(encoding="utf-8")
        btn = re.search(r'<a class="btn" href="([^"]+)"', subscribe)
        self.assertIsNotNone(btn)
        self.assertEqual(btn.group(1), GUMROAD)
        first_cta = subscribe.split('<div class="cta">', 1)[1].split("</div>", 1)[0]
        self.assertNotIn("sizer", first_cta)

    def test_sitemap_lists_sizer(self) -> None:
        sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
        self.assertIn("https://charliewytk.github.io/sizer/", sitemap)

    def test_share_card_is_not_the_homepage(self) -> None:
        html = self._html()
        title = re.search(r'<meta property="og:title" content="([^"]*)"', html)
        desc = re.search(r'<meta property="og:description" content="([^"]*)"', html)
        image = re.search(r'<meta property="og:image" content="([^"]*)"', html)
        self.assertIsNotNone(title)
        self.assertIsNotNone(desc)
        self.assertIsNotNone(image)
        self.assertNotEqual(title.group(1), "Charlie Wuytack — I'd rather build than consume")
        self.assertNotIn("Games, flight search, prediction markets", desc.group(1))
        self.assertNotEqual(image.group(1), "https://charliewytk.github.io/media/preview.png")
        card = title.group(1) + " " + desc.group(1)
        self.assertTrue("sizer" in card.lower() or "cost" in card.lower())
        self.assertIn("24.6%", card)
        self.assertIn("+1.38%", card)
        self.assertTrue("not advice" in desc.group(1).lower() or "filing" in desc.group(1).lower())
        self.assertEqual(
            re.search(r'<meta name="twitter:card" content="([^"]*)"', html).group(1),
            "summary_large_image",
        )
        rel = image.group(1).removeprefix("https://charliewytk.github.io/")
        path = ROOT / rel
        self.assertTrue(path.is_file(), f"og image missing: {path}")
        data = path.read_bytes()
        self.assertTrue(data.startswith(b"\x89PNG\r\n\x1a\n"))
        self.assertEqual(
            (int.from_bytes(data[16:20], "big"), int.from_bytes(data[20:24], "big")),
            (1200, 630),
        )
        self.assertGreater(path.stat().st_size, 8_000)
        for other in (
            ROOT / "media" / "og-example.png",
            ROOT / "media" / "og-weekly.png",
            ROOT / "media" / "og-subscribe.png",
            ROOT / "media" / "preview.png",
        ):
            self.assertNotEqual(path.read_bytes(), other.read_bytes())


if __name__ == "__main__":
    unittest.main()
