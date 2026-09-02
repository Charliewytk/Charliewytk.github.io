#!/usr/bin/env python3
"""Build the published pages from source.

MATHS = False publishes without the formula blocks (kept in source, just not shipped).
Flip to True and re-run when you're ready to explain them.
"""
from __future__ import annotations

import os
import re
import sys


def _flag(name: str) -> bool:
    return os.environ.get(name, '') not in ('', '0', 'false', 'False')


MATHS = _flag('MATHS')

# The linking lines between projects. Approved 23 Aug 2026, so they ship by
# default now. Build with STORY=0 to publish without them.
STORY = os.environ.get('STORY', '1') not in ('0', 'false', 'False')


def strip_maths(html: str) -> str:
    return re.sub(r'\s*<div class="maths">.*?</div>\s*</div>\s*', '\n    ', html, flags=re.S)


def strip_bridges(html: str) -> str:
    return re.sub(r'\s*<p class="bridge rise">.*?</p>\s*', '\n\n', html, flags=re.S)


def _read(path: str) -> str:
    try:
        with open(path, encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        sys.exit(f'build.py: missing {path} (source files are gitignored locally)')


def build_homepage() -> None:
    frag = _read('fragment.html')
    i = frag.index('</style>') + len('</style>')
    head, body = frag[:i], frag[i:]
    if not MATHS:
        body = strip_maths(body)
    if not STORY:
        body = strip_bridges(body)
    with open('index.html', 'w', encoding='utf-8') as out:
        out.write(f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="Games, flight search, prediction markets, macOS tools and trading research \u2014 most of it playable right here.">
<link rel="icon" href="media/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="website">
<meta property="og:url" content="https://charliewytk.github.io/">
<meta property="og:title" content="Charlie Wuytack \u2014 I'd rather build than consume">
<meta property="og:description" content="Games, flight search, prediction markets, macOS tools and trading research \u2014 most of it playable right here.">
<meta property="og:image" content="https://charliewytk.github.io/media/preview.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Charlie Wuytack \u2014 I'd rather build than consume">
<meta name="twitter:description" content="Games, flight search, prediction markets, macOS tools and trading research.">
<meta name="twitter:image" content="https://charliewytk.github.io/media/preview.png">
{head}
</head>
<body>
{body}
</body>
</html>
''')


def build_research() -> None:
    res = _read('research.src.html')
    if not MATHS:
        res = strip_maths(res)
    with open('research.html', 'w', encoding='utf-8') as out:
        out.write(res)


def main() -> None:
    build_homepage()
    build_research()
    print('built · maths:', 'included' if MATHS else 'held back',
          '· story lines:', 'included' if STORY else 'held back')


if __name__ == '__main__':
    main()
