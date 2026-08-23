#!/usr/bin/env python3
"""Build the published pages from source.

MATHS = False publishes without the formula blocks (kept in source, just not shipped).
Flip to True and re-run when you're ready to explain them.
"""
import os
import re

# Held back by default so the published page never ships maths by accident.
# Preview them locally with:  MATHS=1 python3 build.py
def _flag(name):
    return os.environ.get(name, '') not in ('', '0', 'false', 'False')

MATHS = _flag('MATHS')

# The italic linking lines between projects. Claude drafted them, so they stay
# out of the published page until Charlie has read them. Preview: STORY=1

STORY = _flag('STORY')

def strip_maths(html):
    return re.sub(r'\s*<div class="maths">.*?</div>\s*</div>\s*', '\n    ', html, flags=re.S)

def strip_bridges(html):
    return re.sub(r'\s*<p class="bridge rise">.*?</p>\s*', '\n\n', html, flags=re.S)

# --- homepage: fragment.html -> index.html ---
frag = open('fragment.html').read()
i = frag.index('</style>') + len('</style>')
head, body = frag[:i], frag[i:]
if not MATHS:
    body = strip_maths(body)
if not STORY:
    body = strip_bridges(body)
open('index.html', 'w').write(f'''<!doctype html>
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

# --- research: research.src.html -> research.html ---
res = open('research.src.html').read()
if not MATHS:
    res = strip_maths(res)
open('research.html', 'w').write(res)

print('built · maths:', 'included' if MATHS else 'held back',
      '· story lines:', 'included' if STORY else 'held back')
