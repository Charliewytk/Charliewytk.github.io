#!/usr/bin/env python3
"""Unit tests for build.py helpers (no gitignored source files required)."""
from __future__ import annotations

import unittest

from build import strip_bridges, strip_maths


class BuildHelpers(unittest.TestCase):
    def test_strip_maths_removes_formula_block(self) -> None:
        html = '<p>before</p><div class="maths">x^2</div></div><p>after</p>'
        out = strip_maths(html)
        self.assertNotIn("maths", out)
        self.assertIn("before", out)
        self.assertIn("after", out)

    def test_strip_bridges_removes_bridge_paragraph(self) -> None:
        html = '<p class="bridge rise">link</p><p>stay</p>'
        out = strip_bridges(html)
        self.assertNotIn("bridge", out)
        self.assertIn("stay", out)

    def test_strip_maths_leaves_html_without_maths(self) -> None:
        html = '<section><p>unchanged</p></section>'
        self.assertEqual(strip_maths(html), html)


if __name__ == "__main__":
    unittest.main()
