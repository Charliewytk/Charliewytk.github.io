#!/usr/bin/env python3
"""Homepage PowerLeash install copy must match PowerLeash PR #1.

The README stranger path is: unzip → drag to /Applications → right-click Open.
The zip URL is already https://charliewytk.github.io/downloads/PowerLeash.zip.
The leftover is the homepage #powerleash note still saying only
"unsigned — right click → Open".

Do not invent watt / battery-life savings. Do not add a SKU. Do not restyle
the first-fold Scroll wipe. Clothes stays parked.
"""
from __future__ import annotations

import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HOMEPAGE = (ROOT / "index.html").read_text(encoding="utf-8")
PUBLIC_ZIP = "https://charliewytk.github.io/downloads/PowerLeash.zip"
GUMROAD = "https://wuytackcharlie.gumroad.com/l/mergermonitor"
WEEKLY = "https://wuytackcharlie.gumroad.com/l/mergerweekly"


def _powerleash() -> str:
    block = re.search(r'<section class="work" id="powerleash">.*?</section>', HOMEPAGE, re.S)
    assert block is not None, "homepage has no PowerLeash section"
    return block.group(0)


def _install_row() -> str:
    block = _powerleash()
    row = re.search(r'<div class="doing-row[^"]*">.*?</div>', block, re.S)
    assert row is not None, "PowerLeash section has no .doing-row"
    return row.group(0)


def _opening() -> str:
    opening = re.search(r'<header class="opening">.*?</header>', HOMEPAGE, re.S)
    assert opening is not None, "homepage has no opening header"
    return opening.group(0)


def _compact(html: str) -> str:
    return re.sub(r"\s+", " ", html).strip().lower()


class PowerLeashPublicZip(unittest.TestCase):
    def test_download_is_the_existing_public_zip(self) -> None:
        row = _install_row()
        go = re.search(r'<a class="go[^"]*" href="([^"]+)"', row)
        self.assertIsNotNone(go, "PowerLeash has no Download .go link")
        href = go.group(1)
        self.assertEqual(href, PUBLIC_ZIP)
        self.assertIn("Download for Mac", row)

    def test_zip_file_is_still_on_disk(self) -> None:
        path = ROOT / "downloads" / "PowerLeash.zip"
        self.assertTrue(path.is_file(), "downloads/PowerLeash.zip is missing")
        self.assertGreater(path.stat().st_size, 10_000)


class PowerLeashThreeSteps(unittest.TestCase):
    def test_stranger_sees_unzip_applications_right_click_open(self) -> None:
        compact = _compact(_install_row())
        self.assertRegex(
            compact,
            r"unzip.*(?:/)?applications.*right[- ]click",
            "install note must keep unzip → Applications → right-click order",
        )
        self.assertIn("open", compact)
        self.assertIn("unsigned", compact)
        self.assertIn("apple silicon", compact)

    def test_gatekeeper_block_is_expected_not_a_corrupt_zip(self) -> None:
        compact = _compact(_install_row())
        self.assertIn("gatekeeper", compact)
        self.assertTrue(
            "double-click" in compact or "double click" in compact,
            "install note must warn that double-click is blocked",
        )


class PowerLeashHonesty(unittest.TestCase):
    def test_install_copy_does_not_invent_watt_savings(self) -> None:
        compact = _compact(_install_row())
        forbidden = (
            r"saves \d",
            r"\d+% battery",
            r"\d+ more hours",
            r"hours of battery",
            r"2x battery",
            r"lasts \d",
            r"\d+% longer",
        )
        for pat in forbidden:
            self.assertIsNone(
                re.search(pat, compact),
                f"install note invented a savings claim matching {pat!r}",
            )
        self.assertTrue(
            "not quantified" in compact or "not yet quantified" in compact,
            "install note must refuse to quantify battery savings",
        )

    def test_no_new_sku_in_the_powerleash_section(self) -> None:
        block = _powerleash().lower()
        self.assertNotIn("gumroad", block)
        self.assertNotIn("wuytackcharlie.gumroad.com", block)
        self.assertNotIn("<form", block)
        self.assertNotIn("haircut", block)
        self.assertNotIn("companion product", block)

    def test_homepage_gumroad_skus_are_still_only_the_existing_two(self) -> None:
        gumroad = re.findall(
            r"https://wuytackcharlie\.gumroad\.com/l/[a-z0-9]+",
            HOMEPAGE.lower(),
        )
        self.assertTrue(all(u in {GUMROAD, WEEKLY} for u in gumroad), gumroad)
        self.assertIn(GUMROAD, gumroad)

    def test_first_fold_scroll_wipe_is_untouched(self) -> None:
        opening = _opening()
        self.assertIn('class="scroll-hint"', opening)
        self.assertIn("Scroll", opening)
        self.assertIn('class="veil"', opening)
        self.assertIn("I'D RATHER BUILD", opening)
        self.assertIn("than consume", opening)
        css = HOMEPAGE.split("</style>", 1)[0]
        self.assertIn(".scroll-hint", css)
        self.assertIn("--hint-op", css)
        self.assertRegex(css, r"\.veil\s*\{[^}]*clip-path")
        self.assertNotIn("PowerLeash", opening)
        self.assertNotIn("downloads/PowerLeash.zip", opening)

    def test_clothes_stays_parked(self) -> None:
        self.assertNotIn("Clothes", HOMEPAGE)

    def test_no_live_trades_or_credentials(self) -> None:
        block = _powerleash().lower()
        for banned in (
            "i trade this",
            "live order",
            "apple_id",
            "notarytool",
            "api_key",
            "password",
        ):
            self.assertNotIn(banned, block)


if __name__ == "__main__":
    unittest.main()
