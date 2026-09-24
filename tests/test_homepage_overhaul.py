#!/usr/bin/env python3
"""Rails for the 2026-09 homepage overhaul.

The homepage is a public portfolio for employers and friends:
- the only thing for sale is the existing Merger Monitor SKU (not advice);
- it ships no wallet addresses, keys, RPC URLs, local paths or balances;
- it does not promote gambling (no matched betting, bookmakers or free bets);
- every paper / backtest / dry-run number carries a label, and the footer says
  plainly that nothing here is trading live at a profit;
- every local link and in-page anchor resolves.
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
BODY = HOMEPAGE.split("<body>", 1)[1]


class _Refs(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.refs: list[str] = []
        self.ids: set[str] = set()
        self.imgs: list[dict] = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get("id"):
            self.ids.add(a["id"])
        if tag == "img":
            self.imgs.append(a)
        for key in ("href", "src", "poster"):
            if a.get(key):
                self.refs.append(a[key])


def _parsed() -> _Refs:
    p = _Refs()
    p.feed(HOMEPAGE)
    p.close()
    return p


class SellsOnlyTheExistingSku(unittest.TestCase):
    """Charles kept Merger Monitor (24 Sep 2026). Nothing else is for sale."""

    def test_only_existing_gumroad_skus(self) -> None:
        skus = set(re.findall(r"https://wuytackcharlie\.gumroad\.com/l/[a-z0-9]+", LOWER))
        self.assertTrue(skus <= {"https://wuytackcharlie.gumroad.com/l/mergermonitor",
                                 "https://wuytackcharlie.gumroad.com/l/mergerweekly"}, skus)
        for needle in ("donate", "patreon", "ko-fi", "buy me a coffee", "copy trading", "signals group"):
            self.assertNotIn(needle, LOWER, f"homepage must not carry {needle!r}")

    def test_not_advice_and_no_live_profit_claim(self) -> None:
        self.assertIn("not financial advice", LOWER)
        self.assertIn("nothing on this page is trading live at a profit", LOWER)
        visible = re.sub(r"<(script|style)\b.*?</\1>", "", BODY, flags=re.S).lower()
        for claim in ("profitable strategy", "guaranteed", "passive income", "returns of", "join my", "copy my trades"):
            self.assertNotIn(claim, visible)

    def test_evidence_is_labelled(self) -> None:
        for chip in ('class="chip bt">Backtest', 'class="chip paper">Paper', 'class="chip paper">Dry'):
            self.assertIn(chip, HOMEPAGE, f"missing evidence label {chip!r}")
        events = re.search(r'<article class="case[^"]*" id="events">.*?</article>', HOMEPAGE, re.S)
        self.assertIsNotNone(events)
        self.assertIn("Backtest", events.group(0))
        self.assertIn("held out", events.group(0).lower())


class NothingPrivate(unittest.TestCase):
    def test_no_wallet_addresses(self) -> None:
        text = re.sub(r"<(script|style)\b.*?</\1>", "", BODY, flags=re.S)
        base58 = re.findall(r"(?<![A-Za-z0-9])[1-9A-HJ-NP-Za-km-z]{32,44}(?![A-Za-z0-9])", text)
        self.assertEqual(base58, [], "looks like a Solana address")
        self.assertIsNone(re.search(r"0x[0-9a-fA-F]{40}", HOMEPAGE), "looks like an EVM address")

    def test_no_keys_rpc_or_local_paths(self) -> None:
        for needle in ("api-key", "api_key", "apikey", "helius-rpc.com", "mainnet.helius", "rpc.url",
                       "/users/", "localhost", "127.0.0.1", "secrets/", "seed phrase", "private key",
                       "burn wallet", "sk_live", "bearer "):
            self.assertNotIn(needle, LOWER, f"{needle!r} must not ship")
        emails = set(re.findall(r"[\w.+-]+@[\w-]+\.[\w.]+", HOMEPAGE)) - {"charlie@wuytack.net"}
        self.assertEqual(emails, set())

    def test_no_balances_or_account_names(self) -> None:
        for needle in ("wallet balance", "account balance", "deposited", "charliewuytack", "nav $", "my balance"):
            self.assertNotIn(needle, LOWER)

    def test_no_gambling_promotion(self) -> None:
        for needle in ("matched bet", "bookmaker", "bookie", "free bet", "sign-up offer", "betfair", "smarkets", "casino"):
            self.assertNotIn(needle, LOWER, f"{needle!r} must not appear")


class LinksResolve(unittest.TestCase):
    def test_local_refs_resolve(self) -> None:
        for ref in _parsed().refs:
            parts = urlsplit(ref)
            if parts.scheme or ref.startswith(("#", "mailto:", "//")):
                continue
            target = ROOT / parts.path
            if parts.path.endswith("/") or parts.path == "":
                target = target / "index.html"
            self.assertTrue(target.exists(), f"{ref} does not resolve")

    def test_anchors_resolve(self) -> None:
        p = _parsed()
        for ref in p.refs:
            if ref.startswith("#") and len(ref) > 1:
                self.assertIn(ref[1:], p.ids, f"anchor {ref} has no target")

    def test_images_have_alt(self) -> None:
        for img in _parsed().imgs:
            self.assertTrue((img.get("alt") or "").strip(), img.get("src"))


class Structure(unittest.TestCase):
    def test_chapters_in_order(self) -> None:
        order = ['id="exetix"', 'id="work"', 'id="research"', 'id="method"', 'id="apex"', 'id="solana"',
                 'id="events"', 'id="merger"', 'id="deskstatus"', 'id="numerai"', 'id="competitions"', 'id="builds"',
                 'id="doorly"', 'id="powerleash"', 'id="chess"', 'id="chelsea"', 'id="abyss"', 'id="about"']
        pos = [HOMEPAGE.index(x) for x in order]
        self.assertEqual(pos, sorted(pos))

    def test_contact_kept(self) -> None:
        self.assertIn('href="mailto:charlie@wuytack.net"', HOMEPAGE)
        self.assertIn('href="https://github.com/Charliewytk"', HOMEPAGE)


if __name__ == "__main__":
    unittest.main()
