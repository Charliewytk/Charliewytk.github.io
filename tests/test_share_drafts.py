#!/usr/bin/env python3
"""Paste-ready share drafts for Charles — method first, he still clicks post.

/share/ is a phone clipboard, not another funnel. Agents never submit
Reddit, X, or HN. Frozen method figures must match the published site
(24.6% / 2.4% / +1.38%), not feed_summary drift.
"""
from __future__ import annotations

import html as html_lib
import json
import re
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHARE = ROOT / "share" / "index.html"
SHARE_JS = ROOT / "assets" / "js" / "share-copy.js"
EXAMPLE = ROOT / "example" / "index.html"
WEEKLY = ROOT / "weekly" / "index.html"
SUBSCRIBE = ROOT / "subscribe" / "index.html"
HOMEPAGE = ROOT / "index.html"

EXAMPLE_URL = "https://charliewytk.github.io/example/"
WEEKLY_URL = "https://charliewytk.github.io/weekly/"
SIZER_URL = "https://charliewytk.github.io/sizer/"
GUMROAD = "https://wuytackcharlie.gumroad.com/l/mergermonitor"
WEEKLY_SKU = "https://wuytackcharlie.gumroad.com/l/mergerweekly"

# Same sentence /example/ and /weekly/ already publish after PR #29.
FAIL_CLOSED_SENTENCE = (
    "The public calculator at /sizer/ now fails closed to the measured 40bp bar "
    "— unknown stage stays the labelled 1.57% policy."
)

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
        self.assertLessEqual(len(hn_title), 80, f"HN title is {len(hn_title)} chars; field max is 80")
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
            self.assertIn(SIZER_URL, text, key)
            self.assertIn(GUMROAD, text, key)

    def test_share_page_html_names_sizer_and_existing_sku(self) -> None:
        html = _page()
        self.assertIn("sizer/", html)
        self.assertIn(GUMROAD, html)
        self.assertIn(WEEKLY_SKU, html)
        self.assertIn(SIZER_URL, html)
        gumroad = re.findall(r"https://wuytackcharlie\.gumroad\.com/l/[a-z0-9]+", html.lower())
        self.assertTrue(gumroad)
        self.assertTrue(all(u in {GUMROAD, WEEKLY_SKU} for u in gumroad), gumroad)
        self.assertIn(GUMROAD, gumroad)
        self.assertIn(WEEKLY_SKU, gumroad)

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
        # One-copy UI may show the existing SKUs. It is still not a new listing or a form.
        self.assertNotIn("<form", lowered)
        self.assertIn("noindex", html.lower())
        robots = (ROOT / "robots.txt").read_text(encoding="utf-8")
        self.assertIn("Disallow: /share/", robots)
        sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
        self.assertNotIn("/share/", sitemap)

    def test_x_post_fits_weighted_280(self) -> None:
        text = _fields(_page(), "x")["body"]
        weighted = text
        for url in re.findall(r"https?://\S+", text):
            weighted = weighted.replace(url, "x" * 23)
        self.assertLessEqual(len(weighted), 280, f"X weighted length {len(weighted)}")

    def test_every_draft_names_five_pound_sku_and_sizer(self) -> None:
        """Each paste payload must name £5 and /sizer/, not just the page chrome."""
        html = _page()
        for key in DRAFT_KEYS:
            text = _draft_text(html, key)
            self.assertIn("£5", text, f"{key} must name the £5 SKU")
            self.assertIn(SIZER_URL, text, key)
            self.assertIn(GUMROAD, text, key)

    def test_each_draft_has_one_copy_post_button(self) -> None:
        """iPhone: one tap copies the whole draft. Field copies may stay secondary."""
        html = _page()
        for key in DRAFT_KEYS:
            block = _block(html, key)
            posts = re.findall(
                r"<button[^>]*data-copy-post=\"([^\"]+)\"[^>]*>",
                block,
            )
            self.assertEqual(posts, [key], f"{key} needs one data-copy-post button")
            label = re.search(
                rf"<button[^>]*data-copy-post=\"{re.escape(key)}\"[^>]*>(.*?)</button>",
                block,
                re.S,
            )
            self.assertIsNotNone(label, key)
            self.assertIn("copy", label.group(1).lower(), key)

    def test_morning_bar_is_one_copy_for_the_09_draft(self) -> None:
        html = _page()
        self.assertIn('data-morning', html)
        morning = re.search(r'<[^>]*data-morning[^>]*>(.*?)</(?:div|aside|section)>', html, re.S)
        self.assertIsNotNone(morning, "missing data-morning one-copy control")
        self.assertIn('data-copy-post="reddit-sa"', morning.group(0))
        self.assertIn("Copy tomorrow", morning.group(0))
        self.assertIn("copy", morning.group(0).lower())
        self.assertIn("long-press", html.lower())

    def test_one_copy_ui_has_obvious_existing_sku_path(self) -> None:
        """iPhone sticky bar: copy stays, £5 and free weekly are tappable hrefs."""
        html = _page()
        morning = re.search(r'<[^>]*data-morning[^>]*>(.*?)</(?:div|aside|section)>', html, re.S)
        self.assertIsNotNone(morning, "missing data-morning one-copy control")
        bar = morning.group(0)
        self.assertIn('data-copy-post="reddit-sa"', bar)
        self.assertIn("Copy tomorrow", bar)
        pay = re.search(
            rf'<a[^>]+href="{re.escape(GUMROAD)}"[^>]*>(.*?)</a>',
            bar,
            re.S,
        )
        self.assertIsNotNone(pay, "morning bar needs a tappable £5 Gumroad link")
        pay_label = html_lib.unescape(pay.group(1)).lower()
        self.assertIn("£5", pay.group(1))
        self.assertTrue(
            "tonight" in pay_label or "table" in pay_label,
            "£5 control must name tonight's table, not a new product",
        )
        weekly = re.search(
            rf'<a[^>]+href="{re.escape(WEEKLY_SKU)}"[^>]*>(.*?)</a>',
            bar,
            re.S,
        )
        self.assertIsNotNone(weekly, "morning bar needs a tappable free-weekly Gumroad link")
        self.assertIn("free", weekly.group(1).lower())
        self.assertNotIn(WEEKLY_SKU, pay.group(0))
        self.assertNotIn(GUMROAD, weekly.group(0))
        self.assertIsNone(re.search(r"[1-9][\d,]*\s+subscribers?", html.lower()))
        self.assertNotIn("twitter.com/intent", html.lower())
        self.assertNotIn("reddit.com/submit", html.lower())
        self.assertNotIn("news.ycombinator.com/submit", html.lower())

    def test_share_copy_script_is_loaded(self) -> None:
        html = _page()
        self.assertIn("share-copy.js", html)
        self.assertTrue(SHARE_JS.is_file(), "assets/js/share-copy.js is missing")

    def test_one_copy_paste_names_fail_closed_sizer(self) -> None:
        """Tomorrow's iPhone paste must name the same fail-closed fact as #29."""
        html = _page()
        sa_body = _fields(html, "reddit-sa")["body"]
        self.assertIn(FAIL_CLOSED_SENTENCE, sa_body)
        assembled = _run_share_js(
            "const { assemblePost } = require('./assets/js/share-copy.js');\n"
            "process.stdout.write(JSON.stringify({\n"
            "  text: assemblePost(" + json.dumps(_fields(html, "reddit-sa")) + ")\n"
            "}));\n"
        )["text"]
        self.assertIn(FAIL_CLOSED_SENTENCE, assembled)
        for key in DRAFT_KEYS:
            text = _draft_text(html, key)
            self.assertRegex(
                text.lower(),
                r"fail(?:s|ed)?\s+closed",
                f"{key} must say /sizer/ fails closed",
            )
            self.assertIn("40bp", text.lower(), f"{key} must name the measured 40bp bar")
            self.assertIn("1.57%", text, f"{key} must keep unknown stage on labelled 1.57%")
            self.assertTrue(
                "unknown" in text.lower() and "stage" in text.lower(),
                f"{key} must name the unknown-stage policy",
            )
            self.assertTrue(
                "labelled" in text.lower() or "labeled" in text.lower(),
                f"{key} must say the 1.57% policy is labelled",
            )

    def test_share_stays_clipboard_not_a_post_existing_sku_only(self) -> None:
        html = _page()
        lowered = html.lower()
        self.assertNotIn("twitter.com/intent", lowered)
        self.assertNotIn("reddit.com/submit", lowered)
        self.assertNotIn("news.ycombinator.com/submit", lowered)
        gumroad = re.findall(r"https://wuytackcharlie\.gumroad\.com/l/[a-z0-9]+", lowered)
        self.assertTrue(gumroad)
        self.assertTrue(all(u in {GUMROAD, WEEKLY_SKU} for u in gumroad), gumroad)
        self.assertIn(GUMROAD, gumroad)

    def test_homepage_first_fold_and_clothes_untouched(self) -> None:
        homepage = HOMEPAGE.read_text(encoding="utf-8")
        self.assertIn('class="scroll-hint"', homepage)
        self.assertIn("I'D RATHER BUILD", homepage)
        self.assertNotIn("Clothes", homepage)
        self.assertNotIn("share/", homepage.lower())
        fold = re.search(r'<header class="opening">.*?</header>', homepage, re.S)
        self.assertIsNotNone(fold, "homepage has no opening header")
        text = fold.group(0)
        self.assertIn("I'D RATHER BUILD", text)
        self.assertNotIn("1.57%", text)
        self.assertNotIn("40bp", text.lower())
        self.assertNotIn("sizer/", text.lower())
        self.assertNotIn("fail closed", text.lower())
        self.assertNotIn("fails closed", text.lower())


def _run_share_js(script: str) -> dict:
    proc = subprocess.run(
        ["node", "-e", script],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        raise AssertionError(proc.stderr or proc.stdout or f"node exit {proc.returncode}")
    return json.loads(proc.stdout)


class ShareCopyModule(unittest.TestCase):
    """iPhone one-copy: assemble the draft, then copy with an iOS-safe fallback."""

    def test_assemble_post_joins_title_and_body(self) -> None:
        out = _run_share_js(
            "const { assemblePost } = require('./assets/js/share-copy.js');\n"
            "process.stdout.write(JSON.stringify({\n"
            "  both: assemblePost({ title: 'T', body: 'B' }),\n"
            "  body: assemblePost({ body: 'B' }),\n"
            "  title: assemblePost({ title: 'T' })\n"
            "}));\n"
        )
        self.assertEqual(out["both"], "T\n\nB")
        self.assertEqual(out["body"], "B")
        self.assertEqual(out["title"], "T")

    def test_assemble_post_from_share_page_includes_sku(self) -> None:
        html = _page()
        fields = _fields(html, "reddit-sa")
        script = (
            "const { assemblePost } = require('./assets/js/share-copy.js');\n"
            "const text = assemblePost(" + json.dumps(fields) + ");\n"
            "process.stdout.write(JSON.stringify({ text }));\n"
        )
        text = _run_share_js(script)["text"]
        self.assertIn(fields["title"], text)
        self.assertIn(fields["body"], text)
        self.assertIn("£5", text)
        self.assertIn(SIZER_URL, text)
        self.assertIn(GUMROAD, text)

    def test_copy_text_uses_clipboard_when_it_works(self) -> None:
        out = _run_share_js(
            "const { copyText } = require('./assets/js/share-copy.js');\n"
            "let written = '';\n"
            "const env = {\n"
            "  clipboard: { writeText: (t) => { written = t; return Promise.resolve(); } },\n"
            "  document: { createElement() { throw new Error('fallback should not run'); } }\n"
            "};\n"
            "copyText('hello', env).then((ok) => {\n"
            "  process.stdout.write(JSON.stringify({ ok, written }));\n"
            "});\n"
        )
        self.assertTrue(out["ok"])
        self.assertEqual(out["written"], "hello")

    def test_copy_text_ios_fallback_selects_and_execs_copy(self) -> None:
        out = _run_share_js(
            "const { copyText } = require('./assets/js/share-copy.js');\n"
            "const calls = [];\n"
            "const ta = {\n"
            "  value: '',\n"
            "  style: {},\n"
            "  setAttribute(k, v) { calls.push(['setAttribute', k]); },\n"
            "  removeAttribute(k) { calls.push(['removeAttribute', k]); },\n"
            "  focus() { calls.push(['focus']); },\n"
            "  select() { calls.push(['select']); },\n"
            "  setSelectionRange(a, b) { calls.push(['setSelectionRange', a, b]); }\n"
            "};\n"
            "const env = {\n"
            "  clipboard: { writeText() { return Promise.reject(new Error('denied')); } },\n"
            "  document: {\n"
            "    createElement(tag) { calls.push(['createElement', tag]); return ta; },\n"
            "    body: {\n"
            "      appendChild() { calls.push(['appendChild']); },\n"
            "      removeChild() { calls.push(['removeChild']); }\n"
            "    },\n"
            "    execCommand(cmd) { calls.push(['execCommand', cmd]); return true; }\n"
            "  }\n"
            "};\n"
            "copyText('hello', env).then((ok) => {\n"
            "  process.stdout.write(JSON.stringify({\n"
            "    ok, value: ta.value, calls,\n"
            "    fontSize: ta.style.fontSize,\n"
            "    width: ta.style.width,\n"
            "    height: ta.style.height\n"
            "  }));\n"
            "});\n"
        )
        self.assertTrue(out["ok"])
        self.assertEqual(out["value"], "hello")
        self.assertEqual(out["fontSize"], "12pt")
        self.assertNotEqual(out["width"], "1px")
        self.assertNotEqual(out["height"], "1px")
        self.assertIn(["createElement", "textarea"], out["calls"])
        self.assertIn(["setAttribute", "readonly"], out["calls"])
        self.assertNotIn(["removeAttribute", "readonly"], out["calls"])
        self.assertIn(["setSelectionRange", 0, 5], out["calls"])
        self.assertIn(["execCommand", "copy"], out["calls"])
        self.assertIn(["removeChild"], [c[:1] for c in out["calls"]])

    def test_bind_share_page_copies_assembled_section(self) -> None:
        fields = _fields(_page(), "reddit-sa")
        out = _run_share_js(
            "const { bindSharePage, assemblePost } = require('./assets/js/share-copy.js');\n"
            "let written = '';\n"
            "const title = { value: " + json.dumps(fields["title"]) + ", getAttribute: () => 'title' };\n"
            "const body = { value: " + json.dumps(fields["body"]) + ", getAttribute: () => 'body' };\n"
            "const section = { querySelectorAll: (sel) => sel.indexOf('textarea') >= 0 ? [title, body] : [] };\n"
            "const handlers = {};\n"
            "const btn = {\n"
            "  getAttribute: (k) => k === 'data-copy-post' ? 'reddit-sa' : null,\n"
            "  addEventListener: (ev, fn) => { handlers[ev] = fn; },\n"
            "  classList: { add() {}, remove() {} },\n"
            "  textContent: 'Copy post'\n"
            "};\n"
            "const root = {\n"
            "  querySelectorAll: (sel) => {\n"
            "    if (sel.indexOf('data-copy-post') >= 0) return [btn];\n"
            "    return [];\n"
            "  },\n"
            "  querySelector: (sel) => sel.indexOf('reddit-sa') >= 0 ? section : null\n"
            "};\n"
            "bindSharePage(root, {\n"
            "  clipboard: { writeText: (t) => { written = t; return Promise.resolve(); } },\n"
            "  document: { createElement() { throw new Error('no fallback'); } }\n"
            "});\n"
            "handlers.click({ currentTarget: btn });\n"
            "setTimeout(() => {\n"
            "  process.stdout.write(JSON.stringify({\n"
            "    written,\n"
            "    expected: assemblePost(" + json.dumps(fields) + ")\n"
            "  }));\n"
            "}, 20);\n"
        )
        self.assertEqual(out["written"], out["expected"])
        self.assertIn("£5", out["written"])
        self.assertIn(SIZER_URL, out["written"])
        self.assertIn(GUMROAD, out["written"])
        self.assertIn(fields["title"], out["written"])


if __name__ == "__main__":
    unittest.main()
