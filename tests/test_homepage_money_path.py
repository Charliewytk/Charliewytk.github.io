#!/usr/bin/env python3
"""Homepage money-path rails for Merger Monitor.

PR #6 makes /merger-monitor obvious on the homepage (masthead + week-late
preview). PR #2 owns the paid button once /subscribe/ exists. Together they
must not invent subscribers, reintroduce Exeter Auto Buys, or make the
primary CTA the free weekly.
"""
from __future__ import annotations

import json
import re
import subprocess
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
        self.assertIn("cash merger", text)
        self.assertNotIn("every us merger that", text)


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
        html = SUBSCRIBE.read_text(encoding="utf-8")
        lowered = html.lower()
        self.assertIn("filing", lowered)
        self.assertIn("not advice", lowered)
        self.assertIn("£5", html)
        self.assertIn("extract", lowered)
        # Honest cost-sizing sits above the first paid button.
        hero = html.split('<div class="cta">', 1)[0]
        self.assertIn("24.6%", hero)
        self.assertIn("+1.38%", hero)
        self.assertIn("1.59%", hero)
        self.assertTrue("−0.57%" in hero or "&minus;0.57%" in hero or "-0.57%" in hero)
        self.assertNotIn("edge", lowered)
        self.assertNotIn("p&amp;l-advice", lowered)
        self.assertNotIn("ict", lowered)
        # Free weekly stays in the footer, not beside the first CTA.
        first_cta = html.split('<div class="cta">', 1)[1].split("</div>", 1)[0]
        self.assertNotIn("mergerweekly", first_cta)
        self.assertIn('class="paybar"', html)
        self.assertIn(GUMROAD, html.split('class="paybar"', 1)[1])

    def test_table_banner_primary_is_subscribe(self) -> None:
        for path in (TABLE, ROOT / "merger-monitor" / "2026-08-19.html"):
            html = path.read_text(encoding="utf-8")
            banner = html.split("<style>", 1)[0]
            hrefs = re.findall(r'<a href="([^"]+)"', banner)
            self.assertTrue(hrefs, f"{path.name} has no banner links")
            self.assertTrue(
                hrefs[0].rstrip("/").endswith("subscribe") or hrefs[0].endswith("/subscribe/"),
                f"{path.name} primary CTA should be /subscribe/, got {hrefs[0]!r}",
            )
            self.assertNotEqual(hrefs[0], WEEKLY)
            self.assertIn(WEEKLY, html)
            self.assertNotIn("gumroad.com/l/", hrefs[0])

    def test_research_leads_with_subscribe(self) -> None:
        html = (ROOT / "research.html").read_text(encoding="utf-8")
        self.assertIn("nine of the seventeen", html)
        hrefs = _hrefs(html, "subscribe")
        self.assertTrue(hrefs, "research notes have no /subscribe/ link")
        first = re.search(r'<a href="([^"]+)"', html[html.find("Where it pays"):])
        self.assertIsNotNone(first)
        self.assertTrue(
            first.group(1).rstrip("/").endswith("subscribe") or first.group(1).endswith("subscribe/"),
            f"research money-path first link should be /subscribe/, got {first.group(1)!r}",
        )

    def test_footer_does_not_kill_the_live_product(self) -> None:
        self.assertNotIn("merger-arbitrage newsletter", HOMEPAGE)
        self.assertIn("Resale Radar", HOMEPAGE)
        self.assertNotIn("Clothes", HOMEPAGE)


class SubscribeConversionPass(unittest.TestCase):
    """Further conversion work on the live /subscribe/ path after PR #7."""

    def test_no_second_sku_or_haircut(self) -> None:
        html = SUBSCRIBE.read_text(encoding="utf-8").lower()
        self.assertNotIn("haircut", html)
        self.assertNotIn("companion product", html)
        self.assertNotIn("scanner", html)
        gumroad = re.findall(r"https://wuytackcharlie\.gumroad\.com/l/[a-z0-9]+", html)
        self.assertTrue(all(u in {GUMROAD, WEEKLY} for u in gumroad), gumroad)
        self.assertIn(GUMROAD, gumroad)

    def test_faq_covers_objections(self) -> None:
        html = SUBSCRIBE.read_text(encoding="utf-8").lower()
        self.assertIn("<details", html)
        self.assertIn("faq", html)
        for needle in ("refund", "advice", "week", "position", "free"):
            self.assertIn(needle, html)

    def test_subscribe_skips_webfonts(self) -> None:
        html = SUBSCRIBE.read_text(encoding="utf-8")
        self.assertNotIn("fonts.googleapis.com", html)
        self.assertNotIn("fonts.gstatic.com", html)

    def test_honest_zero_ledger_not_fake_counts(self) -> None:
        html = SUBSCRIBE.read_text(encoding="utf-8")
        lowered = html.lower()
        self.assertIsNone(re.search(r"[1-9][\d,]*\s+subscribers?", lowered))
        self.assertNotIn("join ", lowered)
        self.assertIn("£0", html)

    def test_feed_summary_exists_and_is_numeric(self) -> None:
        path = ROOT / "merger-monitor" / "feed_summary.json"
        self.assertTrue(path.is_file(), "merger-monitor/feed_summary.json is missing")
        data = json.loads(path.read_text(encoding="utf-8"))
        required = (
            "annualised_3pct",
            "ev_3pct_per_deal",
            "ev_1pct_per_deal",
            "breakeven_pct",
            "break_rate_pct",
            "breaks",
            "settled",
            "publishable",
            "clears_breakeven",
            "median_days_to_close",
            "break_loss_median_pct",
            "cost_pct",
            "carry_pct",
            "digest_date",
        )
        for key in required:
            self.assertIn(key, data)
            if key != "digest_date":
                self.assertIsInstance(data[key], (int, float), key)

    def test_subscribe_binds_feed_not_invented_copy(self) -> None:
        html = SUBSCRIBE.read_text(encoding="utf-8")
        js = (ROOT / "assets" / "js" / "merger-stats.js").read_text(encoding="utf-8")
        self.assertIn("feed_summary.json", js)
        self.assertIn("merger-stats.js", html)
        for attr in (
            "annualised-3pct",
            "ev-3pct",
            "ev-1pct",
            "breakeven",
            "break-rate",
            "breaks",
            "settled",
            "median-days",
            "break-loss",
            "cost",
            "carry",
            "clears",
            "priced",
        ):
            self.assertIn(f'data-merger-{attr}', html)
        # Dated week-late sample stays dated — do not overwrite it with today's feed.
        sample = html.lower().split("week-late sample", 1)[-1]
        self.assertIn("19 august", sample)
        self.assertNotIn("data-merger-clears", sample)
        self.assertNotIn("data-merger-priced", sample)

    def test_apply_writes_feed_values(self) -> None:
        js_path = ROOT / "assets" / "js" / "merger-stats.js"
        self.assertTrue(js_path.is_file())
        summary = json.loads((ROOT / "merger-monitor" / "feed_summary.json").read_text(encoding="utf-8"))
        html = SUBSCRIBE.read_text(encoding="utf-8")
        # Minimal DOM stand-in: node applies the same file against a fixture.
        script = r"""
const fs = require('fs');
const vm = require('vm');
const html = fs.readFileSync(process.argv[1], 'utf8');
const summary = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const js = fs.readFileSync(process.argv[3], 'utf8');
const store = {};
const document = {
  querySelectorAll(sel) {
    const m = sel.match(/\[data-merger-([^\]]+)\]/);
    if (!m) return [];
    const attr = m[1];
    if (!store[attr]) store[attr] = { textContent: 'FALLBACK' };
    return [store[attr]];
  }
};
const sandbox = { document, fetch: () => Promise.reject(new Error('no net')), console };
vm.createContext(sandbox);
vm.runInContext(js.replace(/fetch\([\s\S]*$/, 'true\n'), sandbox);
if (typeof sandbox.apply !== 'function') {
  // IIFE — eval apply by exporting it
}
"""
        # Prefer an exported apply(); if missing this test fails until the script exports one.
        self.assertIn("function apply(", js_path.read_text(encoding="utf-8"))
        self.assertIn("module.exports", js_path.read_text(encoding="utf-8"))
        node = (
            "const apply = require('./assets/js/merger-stats.js').apply;\n"
            "const summary = " + json.dumps(summary) + ";\n"
            "const store = {};\n"
            "global.document = { querySelectorAll: (sel) => {\n"
            "  const m = sel.match(/\\[data-merger-([^\\]]+)\\]/);\n"
            "  if (!m) return [];\n"
            "  const k = m[1];\n"
            "  if (!store[k]) store[k] = { textContent: 'FALLBACK' };\n"
            "  return [store[k]];\n"
            "}};\n"
            "apply(summary);\n"
            "process.stdout.write(JSON.stringify(Object.fromEntries(Object.entries(store).map(([k,v]) => [k, v.textContent]))));\n"
        )
        proc = subprocess.run(["node", "-e", node], cwd=str(ROOT), capture_output=True, text=True)
        self.assertEqual(proc.returncode, 0, proc.stderr)
        written = json.loads(proc.stdout)
        self.assertEqual(written["annualised-3pct"], "24.6%")
        self.assertEqual(written["ev-3pct"], "+1.35%")
        self.assertEqual(written["ev-1pct"], "-0.60%")
        self.assertEqual(written["breakeven"], "1.62%")
        self.assertEqual(written["break-rate"], "2.5%")
        self.assertEqual(written["breaks"], "41")
        self.assertEqual(written["settled"], "1,636")


class KillLogConversionPath(unittest.TestCase):
    """Public paper kill log that feeds the existing Merger Monitor SKU.

    trading101 PR #10 shipped PaperMill/KILL_LOG.md. This page states that
    record, lists a handful of named deaths, and sends one CTA to the
    £5/month listing. It must not invent a second product or dump the CSV.
    """

    KILL_LOG = ROOT / "kill-log" / "index.html"

    def _html(self) -> str:
        self.assertTrue(self.KILL_LOG.is_file(), "/kill-log/ page is missing")
        return self.KILL_LOG.read_text(encoding="utf-8")

    def test_honest_paper_record_no_live_pnl(self) -> None:
        html = self._html()
        lowered = html.lower()
        self.assertIn("110", html)
        self.assertIn("paper", lowered)
        self.assertTrue("died to cost" in lowered or "die to cost" in lowered)
        self.assertTrue("no live" in lowered and "p&amp;l" in lowered)
        self.assertIsNone(re.search(r"(?<!no )live p&amp;l", lowered))
        self.assertNotIn("i trade this", lowered)
        self.assertNotIn("i trade", lowered)
        self.assertIn("not advice", lowered)

    def test_primary_cta_is_existing_gumroad_sku(self) -> None:
        html = self._html()
        btn = re.search(r'<a class="btn" href="([^"]+)"', html)
        self.assertIsNotNone(btn, "/kill-log/ has no primary .btn")
        self.assertEqual(btn.group(1), GUMROAD)
        self.assertIn("£5", html)
        self.assertIn("merger monitor", html.lower())
        gumroad = re.findall(r"https://wuytackcharlie\.gumroad\.com/l/[a-z0-9]+", html.lower())
        self.assertTrue(all(u in {GUMROAD, WEEKLY} for u in gumroad), gumroad)
        self.assertIn(GUMROAD, gumroad)
        self.assertNotIn("<form", html.lower())
        self.assertNotIn("haircut", html.lower())
        self.assertNotIn("companion product", html.lower())

    def test_employer_safe_extraction_only(self) -> None:
        html = self._html().lower()
        self.assertTrue("extract" in html or "filing" in html)
        self.assertIn("not advice", html)
        self.assertTrue("no position" in html or "no live book" in html)
        for banned in (
            "brain",
            "codabench",
            "launchd",
            "live order",
            "live orders",
            "jane street",
            "haircut",
            "p&amp;l-advice",
            "guaranteed",
        ):
            self.assertNotIn(banned, html)
        self.assertIsNone(re.search(r"\bict\b", html))
        self.assertIsNone(re.search(r"[1-9][\d,]*\s+subscribers?", html))

    def test_short_named_kills_not_full_csv(self) -> None:
        html = self._html()
        rows = re.findall(r"<tbody>.*?</tbody>", html, re.S)
        self.assertTrue(rows, "/kill-log/ has no kill table")
        body = rows[0]
        kills = re.findall(r"<tr>", body)
        self.assertGreaterEqual(len(kills), 5)
        self.assertLessEqual(len(kills), 8)
        lowered = html.lower()
        # Named deaths from the paper log — not a CSV dump.
        for name in (
            "turn-of-month",
            "pre-holiday",
            "dual-class",
            "polymarket",
            "fca",
        ):
            self.assertIn(name, lowered)
        self.assertNotIn("hypothesis_id", html)
        self.assertNotIn("cost_stack (spread+fees+borrow)", html)
        self.assertNotIn("H0003", html)  # ids stay in trading101; names only here

    def test_subscribe_links_quietly_without_wrecking_funnel(self) -> None:
        subscribe = SUBSCRIBE.read_text(encoding="utf-8")
        hrefs = _hrefs(subscribe, "kill-log")
        self.assertTrue(
            any(h.rstrip("/").endswith("kill-log") or "/kill-log/" in h or h.endswith("kill-log/")
                for h in hrefs),
            f"/subscribe/ has no /kill-log/ link, found {hrefs!r}",
        )
        # Existing funnel rails from PR #7 / #8 stay intact.
        btn = re.search(r'<a class="btn" href="([^"]+)"', subscribe)
        self.assertIsNotNone(btn)
        self.assertEqual(btn.group(1), GUMROAD)
        first_cta = subscribe.split('<div class="cta">', 1)[1].split("</div>", 1)[0]
        self.assertNotIn("kill-log", first_cta)
        self.assertNotIn("mergerweekly", first_cta)
        lowered = subscribe.lower()
        self.assertNotIn("edge", lowered)
        self.assertNotIn("haircut", lowered)
        self.assertIn(GUMROAD, subscribe.split('class="paybar"', 1)[1])

    def test_sitemap_lists_kill_log(self) -> None:
        sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
        self.assertIn("https://charliewytk.github.io/kill-log/", sitemap)


class HomepageAndKillLogPayPath(unittest.TestCase):
    """Next conversion pass: pay from the homepage MM section and /kill-log/.

    PR #7 / #8 own /subscribe/ (fold, first Gumroad, sticky bar). Those stay.
    The leftover hop is homepage → /subscribe/ → Gumroad, and /kill-log/ has
    no sticky pay control after the named deaths. Same SKU only.
    """

    def test_homepage_merger_offers_gumroad_after_the_offer(self) -> None:
        block = _merger_block()
        gos = re.findall(r'<a class="go(?:\s+pay)?" href="([^"]+)"', block)
        self.assertGreaterEqual(len(gos), 2, f"need subscribe then Gumroad, got {gos!r}")
        self.assertTrue(
            gos[0].rstrip("/").endswith("subscribe") or gos[0].endswith("subscribe/"),
            f"first .go stays /subscribe/, got {gos[0]!r}",
        )
        self.assertEqual(gos[1], GUMROAD)
        self.assertIn(GUMROAD, block)
        self.assertNotIn("<form", block.lower())
        self.assertNotIn("haircut", block.lower())
        self.assertNotIn("companion product", block.lower())
        self.assertNotIn("i trade this", block.lower())
        self.assertIsNone(re.search(r"\bict\b", block.lower()))

    def test_homepage_first_row_names_gumroad_without_replacing_subscribe(self) -> None:
        """Already-decided readers can pay from the first doing-row, not only /subscribe/."""
        block = _merger_block()
        first_row = block.split('<div class="doing-row', 1)[1].split("</div>", 1)[0]
        self.assertIn("subscribe/", first_row)
        self.assertIn(GUMROAD, first_row)
        self.assertIn("merger-monitor", first_row)

    def test_kill_log_has_sticky_paybar_to_existing_sku(self) -> None:
        html = (ROOT / "kill-log" / "index.html").read_text(encoding="utf-8")
        self.assertIn('class="paybar"', html)
        bar = html.split('class="paybar"', 1)[1]
        self.assertIn(GUMROAD, bar)
        btn = re.search(r'<a class="btn" href="([^"]+)"', html)
        self.assertIsNotNone(btn)
        self.assertEqual(btn.group(1), GUMROAD)
        self.assertNotIn("<form", html.lower())
        self.assertNotIn("haircut", html.lower())
        self.assertNotIn("companion product", html.lower())
        gumroad = re.findall(r"https://wuytackcharlie\.gumroad\.com/l/[a-z0-9]+", html.lower())
        self.assertTrue(all(u in {GUMROAD, WEEKLY} for u in gumroad), gumroad)

    def test_subscribe_fold_first_gumroad_and_sticky_untouched(self) -> None:
        html = SUBSCRIBE.read_text(encoding="utf-8")
        btn = re.search(r'<a class="btn" href="([^"]+)"', html)
        self.assertIsNotNone(btn)
        self.assertEqual(btn.group(1), GUMROAD)
        first_cta = html.split('<div class="cta">', 1)[1].split("</div>", 1)[0]
        self.assertIn(GUMROAD, first_cta)
        self.assertNotIn("mergerweekly", first_cta)
        self.assertNotIn("kill-log", first_cta)
        self.assertIn('class="paybar"', html)
        self.assertIn(GUMROAD, html.split('class="paybar"', 1)[1])
        hero = html.split('<div class="cta">', 1)[0]
        self.assertIn("24.6%", hero)
        self.assertIn("+1.38%", hero)
        self.assertIn("1.59%", hero)


class UniqueShareCards(unittest.TestCase):
    """A share of /subscribe/ or /kill-log/ must not look like the homepage.

    Title, description, and image are unique per URL. Copy stays employer-safe.
    The Gumroad listing is unchanged — this is traffic, not a second SKU.
    """

    HOME = "https://charliewytk.github.io/media/preview.png"
    HOME_TITLE = "Charlie Wuytack — I'd rather build than consume"
    HOME_DESC = "Games, flight search, prediction markets, macOS tools and trading research"

    def _prop(self, html: str, key: str) -> str:
        m = re.search(rf'<meta property="{re.escape(key)}" content="([^"]*)"', html)
        self.assertIsNotNone(m, f"missing og property {key}")
        return m.group(1)

    def _name(self, html: str, key: str) -> str:
        m = re.search(rf'<meta name="{re.escape(key)}" content="([^"]*)"', html)
        self.assertIsNotNone(m, f"missing name {key}")
        return m.group(1)

    def _png_size(self, path: Path) -> tuple[int, int]:
        data = path.read_bytes()
        self.assertTrue(data.startswith(b"\x89PNG\r\n\x1a\n"), f"{path} is not a PNG")
        return int.from_bytes(data[16:20], "big"), int.from_bytes(data[20:24], "big")

    def _local_image(self, url: str) -> Path:
        self.assertTrue(url.startswith("https://charliewytk.github.io/"), url)
        rel = url.removeprefix("https://charliewytk.github.io/")
        path = ROOT / rel
        self.assertTrue(path.is_file(), f"og image missing: {path}")
        return path

    def test_subscribe_share_card_is_not_the_homepage(self) -> None:
        html = SUBSCRIBE.read_text(encoding="utf-8")
        title = self._prop(html, "og:title")
        desc = self._prop(html, "og:description")
        image = self._prop(html, "og:image")
        self.assertNotEqual(title, self.HOME_TITLE)
        self.assertNotIn(self.HOME_DESC, desc)
        self.assertNotEqual(image, self.HOME)
        self.assertIn("Merger Monitor", title)
        self.assertIn("£5", title + desc)
        self.assertTrue("filing" in desc.lower() or "not advice" in desc.lower())
        self.assertEqual(self._name(html, "twitter:card"), "summary_large_image")
        self.assertEqual(self._name(html, "twitter:title"), title)
        twitter_desc = self._name(html, "twitter:description")
        self.assertNotIn(self.HOME_DESC, twitter_desc)
        self.assertNotEqual(twitter_desc, self._name(HOMEPAGE, "twitter:description"))
        self.assertEqual(self._name(html, "twitter:image"), image)
        self.assertNotEqual(self._name(html, "twitter:image"), self.HOME)

    def test_kill_log_share_card_is_not_the_homepage(self) -> None:
        html = (ROOT / "kill-log" / "index.html").read_text(encoding="utf-8")
        title = self._prop(html, "og:title")
        desc = self._prop(html, "og:description")
        image = self._prop(html, "og:image")
        self.assertNotEqual(title, self.HOME_TITLE)
        self.assertNotIn(self.HOME_DESC, desc)
        self.assertNotEqual(image, self.HOME)
        self.assertTrue("kill" in title.lower() or "110" in title or "paper" in title.lower())
        self.assertIn("paper", desc.lower())
        self.assertIn("merger monitor", (title + " " + desc).lower())
        self.assertEqual(self._name(html, "twitter:card"), "summary_large_image")
        self.assertEqual(self._name(html, "twitter:title"), title)
        self.assertEqual(self._name(html, "twitter:description"), desc)
        self.assertEqual(self._name(html, "twitter:image"), image)
        self.assertNotEqual(image, self.HOME)

    def test_subscribe_and_kill_log_cards_are_distinct(self) -> None:
        subscribe = SUBSCRIBE.read_text(encoding="utf-8")
        kill = (ROOT / "kill-log" / "index.html").read_text(encoding="utf-8")
        self.assertNotEqual(self._prop(subscribe, "og:title"), self._prop(kill, "og:title"))
        self.assertNotEqual(self._prop(subscribe, "og:description"), self._prop(kill, "og:description"))
        self.assertNotEqual(self._prop(subscribe, "og:image"), self._prop(kill, "og:image"))
        self.assertNotEqual(self._name(subscribe, "twitter:image"), self._name(kill, "twitter:image"))

    def test_share_copy_is_employer_safe(self) -> None:
        pages = (
            SUBSCRIBE.read_text(encoding="utf-8"),
            (ROOT / "kill-log" / "index.html").read_text(encoding="utf-8"),
        )
        for html in pages:
            head = html.split("</head>", 1)[0].lower()
            for banned in (
                "i trade this",
                "i trade",
                "p&amp;l-advice",
                "p&l advice",
                "live p&amp;l advice",
                "guaranteed",
                "codabench",
                "haircut",
                "companion product",
            ):
                self.assertNotIn(banned, head)
            self.assertIsNone(re.search(r"\bict\b", head))
            self.assertIsNone(re.search(r"[1-9][\d,]*\s+subscribers?", head))

    def test_og_images_are_real_unique_pngs(self) -> None:
        subscribe = SUBSCRIBE.read_text(encoding="utf-8")
        kill = (ROOT / "kill-log" / "index.html").read_text(encoding="utf-8")
        paths = []
        for html in (subscribe, kill):
            url = self._prop(html, "og:image")
            self.assertEqual(self._name(html, "twitter:image"), url)
            path = self._local_image(url)
            self.assertNotEqual(path.resolve(), (ROOT / "media" / "preview.png").resolve())
            self.assertEqual(self._png_size(path), (1200, 630))
            self.assertGreater(path.stat().st_size, 8_000)
            paths.append(path)
        self.assertNotEqual(paths[0].read_bytes(), paths[1].read_bytes())
        self.assertNotEqual(paths[0].read_bytes(), (ROOT / "media" / "preview.png").read_bytes())
        self.assertNotEqual(paths[1].read_bytes(), (ROOT / "media" / "preview.png").read_bytes())


class ChessExchangeCopy(unittest.TestCase):
    """Public copy must match chess-exchange main: engine WDL when a FEN exists."""

    def _chess(self) -> str:
        block = re.search(r'<section class="work" id="chess">.*?</section>', HOMEPAGE, re.S)
        self.assertIsNotNone(block, "homepage has no Chess Exchange section")
        return block.group(0)

    def test_engine_eval_is_stated_not_elo_only(self) -> None:
        block = self._chess()
        lowered = block.lower()
        self.assertNotIn("no engine evaluation anywhere yet", lowered)
        self.assertNotIn("draw pricing is an elo prior", lowered)
        self.assertIn("engine", lowered)
        self.assertTrue("wdl" in lowered or "alpha-beta" in lowered)
        self.assertIn("fen", lowered)
        self.assertIn("elo", lowered)
        self.assertIn("fallback", lowered)

    def test_engine_item_is_done_without_stockfish_or_a_wallet(self) -> None:
        block = self._chess()
        lowered = block.lower()
        done = re.findall(r'<li class="done"><span>([^<]+)</span>', block)
        self.assertTrue(
            any("engine" in item.lower() for item in done),
            f"engine eval should be a done item, got {done!r}",
        )
        self.assertNotIn("stockfish", lowered)
        self.assertIn("play money", lowered)
        self.assertNotIn("paywall", lowered)
        self.assertNotIn("wallet", lowered)
        self.assertNotIn("real money", lowered)


class FirstPaidSubPath(unittest.TestCase):
    """After PR #11 share cards: leftover is a clearer pay CTA, not more SKUs."""

    def test_subscribe_cta_names_tonights_table(self) -> None:
        html = SUBSCRIBE.read_text(encoding="utf-8")
        btn = re.search(r'<a class="btn" href="([^"]+)"[^>]*>([^<]+)</a>', html)
        self.assertIsNotNone(btn, "/subscribe/ has no primary .btn")
        self.assertEqual(btn.group(1), GUMROAD)
        text = btn.group(2)
        self.assertIn("tonight", text.lower())
        self.assertIn("£5", text)
        self.assertNotIn("subscribe on gumroad", text.lower())

    def test_subscribe_first_cta_follows_cost_sizing_not_the_offer_grid(self) -> None:
        html = SUBSCRIBE.read_text(encoding="utf-8")
        hero = html.split('<div class="cta">', 1)[0]
        self.assertIn("24.6%", hero)
        self.assertIn("+1.38%", hero)
        self.assertIn("1.59%", hero)
        self.assertIn("twoup", hero)
        self.assertNotIn('class="offer"', hero)

    def test_subscribe_paybar_does_not_read_as_free(self) -> None:
        html = SUBSCRIBE.read_text(encoding="utf-8")
        bar = html.split('class="paybar"', 1)[1]
        hint = re.search(r'class="hint"[^>]*>([^<]+)', bar)
        self.assertIsNotNone(hint, "paybar has no hint")
        self.assertNotIn("£0", hint.group(1))
        self.assertIn("£5", bar)
        self.assertIn("not advice", hint.group(1).lower())
        self.assertIn("£0", html)
        self.assertIn("zero subscribers", html.lower())

    def test_subscribe_paybar_is_visible_without_a_mobile_query(self) -> None:
        html = SUBSCRIBE.read_text(encoding="utf-8")
        css = html.split("</style>", 1)[0]
        # Always-on sticky: default .paybar is flex, not display:none.
        self.assertRegex(css, r"\.paybar\s*\{[^}]*display:\s*flex")
        self.assertIsNone(re.search(r"\.paybar\s*\{[^}]*display:\s*none", css))

    def test_kill_log_cta_names_tonights_table_after_the_product(self) -> None:
        html = (ROOT / "kill-log" / "index.html").read_text(encoding="utf-8")
        btn = re.search(r'<a class="btn" href="([^"]+)"[^>]*>([^<]+)</a>', html)
        self.assertIsNotNone(btn, "/kill-log/ has no primary .btn")
        self.assertEqual(btn.group(1), GUMROAD)
        self.assertIn("tonight", btn.group(2).lower())
        self.assertIn("£5", btn.group(2))
        hero = html.split('<div class="cta">', 1)[0].lower()
        self.assertIn("merger monitor", hero)
        self.assertTrue("filing" in hero or "22:30" in hero or "tonight" in hero)

    def test_kill_log_paybar_matches_and_is_always_on(self) -> None:
        html = (ROOT / "kill-log" / "index.html").read_text(encoding="utf-8")
        css = html.split("</style>", 1)[0]
        self.assertRegex(css, r"\.paybar\s*\{[^}]*display:\s*flex")
        self.assertIsNone(re.search(r"\.paybar\s*\{[^}]*display:\s*none", css))
        bar = html.split('class="paybar"', 1)[1]
        hint = re.search(r'class="hint"[^>]*>([^<]+)', bar)
        self.assertIsNotNone(hint)
        self.assertNotIn("£0", hint.group(1))
        self.assertIn("not advice", hint.group(1).lower())
        self.assertIn(GUMROAD, bar)
        self.assertIn("tonight", bar.lower())


class HomepageFirstFoldSell(unittest.TestCase):
    """The leftover after PR #12: the homepage first fold still does not sell.

    /subscribe/ leads with 24.6% / +1.38% / 1.59%, then Get tonight's table
    on the existing Gumroad SKU, and keeps Zero subscribers / £0 honest.
    The opening hero must do the same. Do not invent a second SKU.
    """

    def _fold(self) -> str:
        opening = re.search(r'<header class="opening">.*?</header>', HOMEPAGE, re.S)
        self.assertIsNotNone(opening, "homepage has no opening header")
        return opening.group(0)

    def test_first_fold_has_live_cost_sizing(self) -> None:
        fold = self._fold()
        self.assertIn("24.6%", fold)
        self.assertIn("+1.38%", fold)
        self.assertIn("1.59%", fold)
        for attr in ("annualised-3pct", "ev-3pct", "breakeven"):
            self.assertIn(f"data-merger-{attr}", fold)

    def test_first_fold_cta_is_get_tonights_table_on_gumroad(self) -> None:
        fold = self._fold()
        btn = re.search(
            r'<a class="[^"]*(?:go pay|pay|btn)[^"]*" href="([^"]+)"[^>]*>([^<]+)</a>',
            fold,
        )
        self.assertIsNotNone(btn, "first fold has no pay CTA")
        self.assertEqual(btn.group(1), GUMROAD)
        text = btn.group(2)
        self.assertIn("tonight", text.lower())
        self.assertIn("£5", text)
        self.assertIn("Get tonight", text)
        self.assertEqual(fold.count(GUMROAD), 1)
        self.assertNotIn("mergerweekly", fold.lower())

    def test_first_fold_cta_follows_the_numbers(self) -> None:
        fold = self._fold()
        hero = fold.split(GUMROAD, 1)[0]
        self.assertIn("24.6%", hero)
        self.assertIn("+1.38%", hero)
        self.assertIn("1.59%", hero)
        self.assertNotIn("p&amp;l-advice", hero.lower())
        self.assertIsNone(re.search(r"\bict\b", hero.lower()))

    def test_first_fold_keeps_zero_subscribers_honest(self) -> None:
        fold = self._fold()
        lowered = fold.lower()
        self.assertIn("zero subscribers", lowered)
        self.assertIn("£0", fold)
        self.assertIsNone(re.search(r"[1-9][\d,]*\s+subscribers?", lowered))
        self.assertNotIn("join ", lowered)
        self.assertNotIn("<form", lowered)
        self.assertNotIn("guaranteed", lowered)
        self.assertNotIn("i trade", lowered)
        self.assertTrue("not advice" in lowered or "not a tip sheet" in lowered)

    def test_first_fold_sell_is_in_the_pin_hero_not_scroll_gated(self) -> None:
        """Pay has to sit in the sticky first viewport, not the scroll-revealed .under."""
        fold = self._fold()
        pin = re.search(r'<div class="pin-hero">(.*)</div>\s*</header>', fold, re.S)
        self.assertIsNotNone(pin, "opening has no closed .pin-hero")
        pin_html = pin.group(1)
        self.assertIn('class="fold-sell"', pin_html)
        self.assertIn(GUMROAD, pin_html)
        self.assertIn("24.6%", pin_html)
        veil = re.search(r'<h1 class="veil">.*?</h1>', pin_html, re.S)
        self.assertIsNotNone(veil)
        self.assertNotIn(GUMROAD, veil.group(0))
        self.assertNotIn("24.6%", veil.group(0))
        self.assertGreater(pin_html.find('class="fold-sell"'), pin_html.find("</h1>"))
        under = re.search(r'<p class="under"[^>]*>.*?</p>', pin_html, re.S)
        if under:
            self.assertNotIn(GUMROAD, under.group(0))
            self.assertNotIn("Get tonight", under.group(0))
        self.assertNotIn("scroll-hint", fold)
        css = HOMEPAGE.split("</style>", 1)[0]
        self.assertIn(".fold-sell", css)
        self.assertIsNone(re.search(r"\.fold-sell\s*\{[^}]*display:\s*none", css))
        self.assertIsNone(re.search(r"\.fold-sell\s*\{[^}]*opacity:\s*var\(--tail-op", css))

    def test_entry_gate_also_names_tonights_table(self) -> None:
        """First-time visitors see the vinyl gate, not the opening. Same SKU, same CTA."""
        gate = HOMEPAGE.split('<div class="gate"', 1)[1].split('<div class="masthead">', 1)[0]
        mast = re.search(r'<div class="gate-mast">.*?</div>', gate, re.S)
        self.assertIsNotNone(mast, "vinyl gate has no .gate-mast")
        self.assertIn(GUMROAD, mast.group(0))
        self.assertIn("Get tonight's table", mast.group(0))
        self.assertIn("£5", mast.group(0))
        self.assertNotIn("mergerweekly", gate.lower())
        self.assertNotIn("<form", gate.lower())


class WorkedExamplePage(unittest.TestCase):
    """One public worked example a stranger can read without paying.

    Lead with method, not returns. Use a named deal already on this site.
    After a stated break rate and costs, the net is the figure already
    published (24.6% / +1.38% / 1.59%). Quiet Gumroad SKU at the end.
    """

    EXAMPLE = ROOT / "example" / "index.html"
    TABLE = ROOT / "merger-monitor" / "index.html"
    ACA_FILING = (
        "https://www.sec.gov/Archives/edgar/data/1739445/"
        "000114036126030551/0001140361-26-030551-index.htm"
    )

    def _html(self) -> str:
        self.assertTrue(self.EXAMPLE.is_file(), "/example/ page is missing")
        return self.EXAMPLE.read_text(encoding="utf-8")

    def test_uses_named_deal_already_on_the_week_late_table(self) -> None:
        html = self._html()
        table = self.TABLE.read_text(encoding="utf-8")
        self.assertIn("ACA", html)
        self.assertIn("Arcosa", html)
        self.assertIn("+3.44%", html)
        self.assertIn("$150", html)
        self.assertIn("$145.01", html)
        # Named deal must already live on the public table — no invented ticker.
        self.assertIn("ACA", table)
        self.assertIn("Arcosa", table)
        self.assertIn("+3.44%", table)
        self.assertIn("$150", table)
        self.assertIn("19 August", html)
        self.assertTrue("week" in html.lower() and "late" in html.lower())

    def test_filing_is_the_one_already_cited(self) -> None:
        html = self._html()
        table = self.TABLE.read_text(encoding="utf-8")
        self.assertIn(self.ACA_FILING, html)
        self.assertIn(self.ACA_FILING, table)
        self.assertIn("DEFM14A", html)
        self.assertIn("2026-08-03", html)
        self.assertIn("$150.00 in cash", html)
        self.assertEqual(html.count("sec.gov/Archives/edgar"), 1)

    def test_leads_with_method_not_a_pay_button(self) -> None:
        html = self._html()
        first_gumroad = html.lower().find("wuytackcharlie.gumroad.com/l/mergermonitor")
        self.assertGreater(first_gumroad, 0, "page never names the existing SKU")
        before = html[:first_gumroad]
        self.assertIn("24.6%", before)
        self.assertIn("+1.38%", before)
        self.assertIn("1.59%", before)
        self.assertIn("break", before.lower())
        self.assertTrue("cost" in before.lower() or "costs" in before.lower())
        self.assertIn("ACA", before)
        self.assertNotIn("Get tonight", before)
        self.assertNotIn("Subscribe on Gumroad", before)

    def test_net_is_the_figure_already_used_on_the_site(self) -> None:
        html = self._html()
        hero = html.split("wuytackcharlie.gumroad.com", 1)[0]
        self.assertIn("24.6%", hero)
        self.assertIn("+1.38%", hero)
        self.assertIn("1.59%", hero)
        self.assertTrue("−0.57%" in hero or "&minus;0.57%" in hero or "-0.57%" in hero)
        # Same fallbacks as /subscribe/ and the homepage fold.
        for attr in ("annualised-3pct", "ev-3pct", "breakeven", "break-rate", "cost", "carry"):
            self.assertIn(f"data-merger-{attr}", html)
        self.assertIn("merger-stats.js", html)

    def test_states_break_rate_and_costs(self) -> None:
        html = self._html().lower()
        self.assertIn("2.4%", html)
        self.assertIn("0.40%", html)
        self.assertTrue("carry" in html or "t-bill" in html)
        self.assertTrue("break rate" in html or "break-rate" in html)

    def test_extraction_and_cost_sizing_only(self) -> None:
        html = self._html().lower()
        self.assertTrue("extract" in html or "filing" in html)
        self.assertIn("not advice", html)
        self.assertTrue("cost-sizing" in html or "cost sizing" in html)
        for banned in (
            "buy this deal",
            "buy aca",
            "buy arcosa",
            "i trade this",
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
            self.assertNotIn(banned, html)
        self.assertIsNone(re.search(r"\bict\b", html))
        self.assertNotIn("<form", html)
        gumroad = re.findall(r"https://wuytackcharlie\.gumroad\.com/l/[a-z0-9]+", html)
        self.assertTrue(all(u in {GUMROAD, WEEKLY} for u in gumroad), gumroad)
        self.assertIn(GUMROAD, gumroad)

    def test_quiet_cta_is_existing_sku_at_the_end(self) -> None:
        html = self._html()
        self.assertNotIn('class="paybar"', html)
        btns = re.findall(r'<a class="btn" href="([^"]+)"[^>]*>([^<]+)</a>', html)
        self.assertTrue(btns, "/example/ has no end CTA")
        self.assertEqual(btns[0][0], GUMROAD)
        self.assertIn("£5", btns[0][1] + html[html.find(btns[0][0]):])
        # One pay control, after the arithmetic — not a second product.
        self.assertEqual(len(btns), 1)
        self.assertNotIn("Get tonight", html.split("</h1>", 1)[0])

    def test_zero_subscribers_stay_honest(self) -> None:
        html = self._html()
        lowered = html.lower()
        self.assertIn("zero subscribers", lowered)
        self.assertIn("£0", html)
        self.assertIsNone(re.search(r"[1-9][\d,]*\s+subscribers?", lowered))
        self.assertNotIn("join ", lowered)
        self.assertNotIn("social proof", lowered)

    def test_subscribe_links_quietly_without_wrecking_funnel(self) -> None:
        subscribe = SUBSCRIBE.read_text(encoding="utf-8")
        hrefs = _hrefs(subscribe, "example")
        self.assertTrue(
            any(h.rstrip("/").endswith("example") or "/example/" in h or h.endswith("example/")
                for h in hrefs),
            f"/subscribe/ has no /example/ link, found {hrefs!r}",
        )
        btn = re.search(r'<a class="btn" href="([^"]+)"', subscribe)
        self.assertIsNotNone(btn)
        self.assertEqual(btn.group(1), GUMROAD)
        first_cta = subscribe.split('<div class="cta">', 1)[1].split("</div>", 1)[0]
        self.assertNotIn("example", first_cta)
        self.assertNotIn("mergerweekly", first_cta)
        self.assertIn(GUMROAD, subscribe.split('class="paybar"', 1)[1])

    def test_sitemap_lists_example(self) -> None:
        sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
        self.assertIn("https://charliewytk.github.io/example/", sitemap)

    def test_share_card_is_not_the_homepage(self) -> None:
        html = self._html()
        title = re.search(r'<meta property="og:title" content="([^"]*)"', html)
        desc = re.search(r'<meta property="og:description" content="([^"]*)"', html)
        image = re.search(r'<meta property="og:image" content="([^"]*)"', html)
        self.assertIsNotNone(title)
        self.assertIsNotNone(desc)
        self.assertIsNotNone(image)
        self.assertNotEqual(title.group(1), UniqueShareCards.HOME_TITLE)
        self.assertNotIn(UniqueShareCards.HOME_DESC, desc.group(1))
        self.assertNotEqual(image.group(1), UniqueShareCards.HOME)
        self.assertTrue(
            "example" in title.group(1).lower() or "ACA" in title.group(1) or "Arcosa" in title.group(1)
        )
        self.assertIn("£5", title.group(1) + desc.group(1))
        lowered = desc.group(1).lower()
        self.assertTrue("filing" in lowered or "not advice" in lowered)
        self.assertIn("method", (title.group(1) + " " + desc.group(1)).lower())
        twitter = re.search(r'<meta name="twitter:card" content="([^"]*)"', html)
        self.assertIsNotNone(twitter)
        self.assertEqual(twitter.group(1), "summary_large_image")
        tw_img = re.search(r'<meta name="twitter:image" content="([^"]*)"', html)
        self.assertIsNotNone(tw_img)
        self.assertEqual(tw_img.group(1), image.group(1))
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
        self.assertNotEqual(path.read_bytes(), (ROOT / "media" / "og-subscribe.png").read_bytes())
        self.assertNotEqual(path.read_bytes(), (ROOT / "media" / "og-kill-log.png").read_bytes())
        self.assertNotEqual(path.read_bytes(), (ROOT / "media" / "preview.png").read_bytes())


if __name__ == "__main__":
    unittest.main()
