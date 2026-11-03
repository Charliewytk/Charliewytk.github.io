#!/usr/bin/env python3
"""Build concepts/notes/index.html from concepts/_content/content.json.

Why a build step: every number and honesty line must be verbatim. Copying them
by hand drifts (−, ≈⅓, en dashes), so the markup is generated and then checked.

    python3 concepts/notes/build.py        # writes index.html, then verifies it

Edit copy in content.json, layout in this file, look in style.css, behaviour in app.js.
"""
import html
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = json.loads((HERE.parent / "_content" / "content.json").read_text())
OWNER, PROJECTS = DATA["owner"], DATA["projects"]
SITE_HOST = "charliewytk.github.io"
FOOTER_LINE = DATA["honesty_lines"][0]["text"]  # site-wide footer (home, every track page)

e = lambda s: html.escape(s or "", quote=True)


def norm(s):
    return re.sub(r"[\s.]+$", "", (s or "").strip()).lower()


# ---------- which honesty lines ship in which note ----------
# applies_to values from content.json, mapped to the note that carries them.
# Lines about things this page does not show (apex tenders, the merger table,
# the Quantiacs chart, the DeskStatus schematic) are left out on purpose.
HONESTY_FOR = {
    "exetix": ["exetix"],
    "kill-log": ["research", "research scoreboard", "research ledger: Polymarket liquidity provision",
                 "event shorts", "kill-log"],
    "solana": ["solana"],
    "merger-monitor": ["merger-monitor", "merger-monitor / subscribe"],
    "doorly": ["doorly"],
    "powerleash": ["powerleash download"],
    "chess-exchange": ["chess-exchange"],
    "numerai": ["numerai"],
}

# Descriptive alt text for media that has none in content.json (what the image shows, no claims).
ALT = {
    "/media/doorly.jpg": "Doorly search page: ‘The cheapest flight isn't always the cheapest trip’ above a door-to-door search form",
    "/media/powerleash.png": "PowerLeash app icon: a white leaf on green",
    "/media/abyss-poster.jpg": "Abyss Warden level: towers guarding a winding trench path on a purple seabed",
    "/media/chess.jpg": "Chess Exchange: live boards with White, Draw and Black prices beside a leaderboard of bots",
    "/media/chelsea.jpg": "Chelsea Bikes rebuild: homepage reading ‘Your local bike shop, for every kind of rider.’",
}
SIZE = {  # intrinsic sizes, so nothing jumps while images load
    "/media/doorly.jpg": (1400, 972), "/media/chess.jpg": (1400, 950),
    "/media/chelsea.jpg": (1400, 972), "/media/abyss-poster.jpg": (1400, 875),
}
PAGE_TITLES = {p["href"]: p["title"] for p in DATA["other_pages"] if p.get("title")}


def page_title(href):
    """A link's label, verbatim: content.json's title if it has one, else the page's own
    <title> (minus the owner suffix every track page carries, and an SEO tail after ' | ')."""
    if href in PAGE_TITLES:
        return PAGE_TITLES[href]
    if not href.startswith("/"):
        return None
    f = ROOT / href.lstrip("/")
    if f.is_dir() or href.endswith("/"):
        f = f / "index.html"
    if not f.is_file():
        return None
    m = re.search(r"<title>(.*?)</title>", f.read_text(errors="ignore"), re.S)
    if not m:
        return None
    t = html.unescape(re.sub(r"\s+", " ", m.group(1))).strip()
    t = re.sub(r" · " + re.escape(OWNER["name"]) + r"$", "", t)
    return t.split(" | ")[0].strip() or None

# External links that were dead when checked on 3 Nov 2026. They are left out, not relabelled.
DEAD = {
    "https://www.exeterticketexchange.com",  # HTTP 402, Vercel DEPLOYMENT_DISABLED
    "https://github.com/Charliewytk/trading101/blob/main/PaperMill/KILL_LOG.md",  # HTTP 404
}

# Notes about trading or research carry the site-wide honesty line themselves, so a phone
# visitor who lands straight on one sees it (the sidebar that also carries it is desktop only).
SITE_LINE_IN = {"kill-log", "solana", "merger-monitor", "deskstatus", "numerai", "competitions"}

# Notes without pictures open on one big number instead: (index into key_numbers).
# Merger Monitor skips 24.6% on purpose: its own label calls that number marketing.
# DeskStatus leads with "Read-only": the claim that matters, not a count of tabs.
HERO = {"kill-log": 1, "solana": 0, "merger-monitor": 1, "deskstatus": 1, "numerai": 0, "competitions": 0}

# Status words that are honesty labels. The note keeps them as its top line even though
# the row already shows them; any other status that only repeats the row is dropped.
KEEP_STATUS = {"Demo", "Live, unstaked", "Play money"}


def folder_id(tag):
    return re.sub(r"[^a-z0-9]+", "-", tag.lower()).strip("-") or "x"


FOLDERS = []  # shelf_tag values, verbatim, in homepage order. Only tags that hold two or
for p in PROJECTS:  # more notes become folders; a folder of one is just that note again.
    if p["shelf_tag"] not in FOLDERS:
        FOLDERS.append(p["shelf_tag"])
FOLDERS = [f for f in FOLDERS if sum(p["shelf_tag"] == f for p in PROJECTS) >= 2]


ROOT = HERE.parent.parent  # the site root that /media/... paths resolve against
THUMBS = HERE / "thumbs"
POSTERS = HERE / "posters"


def thumb(p):
    """Row thumbnail. Posters are 1400px wide but shown at 40-48px, so a 144px square WebP
    is made once into concepts/notes/thumbs/ (needs cwebp; falls back to the original)."""
    m = p["media"]
    if p["slug"] == "exetix":
        return m["icon"]["src"]  # 4.7 KB already
    src = m.get("poster") or m.get("image")
    if not src:
        return None
    out = THUMBS / (Path(src).stem + ".webp")
    if not out.exists() and shutil.which("cwebp"):
        THUMBS.mkdir(exist_ok=True)
        w, h = SIZE.get(src, (512, 512))
        side = min(w, h)
        crop = ["-crop", str((w - side) // 2), str((h - side) // 2), str(side), str(side)]
        subprocess.run(["cwebp", "-quiet", "-q", "80", *crop, "-resize", "144", "144",
                        str(ROOT / src.lstrip("/")), "-o", str(out)], check=True)
    return f"thumbs/{out.name}" if out.exists() else src


def poster(src):
    """Video poster as WebP at its native 1400px (about a third of the JPEG's bytes), made
    once into concepts/notes/posters/. Falls back to the original JPEG without cwebp."""
    out = POSTERS / (Path(src).stem + ".webp")
    if not out.exists() and shutil.which("cwebp"):
        POSTERS.mkdir(exist_ok=True)
        subprocess.run(["cwebp", "-quiet", "-q", "78", "-m", "6", str(ROOT / src.lstrip("/")), "-o", str(out)], check=True)
    return f"posters/{out.name}" if out.exists() else src


# ---------- where each honesty line sits ----------
# Every line still ships verbatim; these just put a qualifier next to the thing it qualifies
# instead of in the grey block at the end. Anything not placed here stays in that block.
PLACE = {
    "merger-monitor": {
        "hero": ["A floor, not a ceiling: deals that die before a definitive proxy never enter the sample."],
        "link": {
            "/subscribe/": "£5/month · not advice",
            "https://wuytackcharlie.gumroad.com/l/mergermonitor": "£5/month on Gumroad. Cancel there. 7-day refund.",
        },
    },
    "kill-log": {
        # under the verdict row whose label starts with this text
        "row": {
            "candidates, on paper.": "Both are candidates on paper, not results.",
            "in live execution tests.": "~£0. Live tests run at tiny size to measure real fills against paper; "
                                        "paper and backtest numbers are labelled as such throughout.",
        },
        "after_retraction": "Separately, the meme-desk auditor has closed about 70 entry and exit variants "
                            "as failed or inconclusive, with no pass standing.",
    },
}


def placed(slug):
    pl = PLACE.get(slug, {})
    return [*pl.get("hero", []), *pl.get("link", {}).values(), *pl.get("row", {}).values(),
            *([pl["after_retraction"]] if pl.get("after_retraction") else [])]


# ---------- note body pieces ----------
def smalls(*qs):
    return "".join(f"<small>{e(q)}</small>" for q in qs if q)


def hero(value, label, qual, extra=()):
    return (f'<div class="hero">\n  <p class="hero-n">{e(value)}</p>\n'
            f'  <p class="hero-l">{e(label)}{smalls(qual, *extra)}</p>\n</div>')


def numbers_table(rows, caption=None):
    out = ['<table class="grid">']
    if caption:
        out.append(f"  <caption>{e(caption)}</caption>")
    out.append("  <tbody>")
    for value, label, qual in rows:
        out.append(f'    <tr><th scope="row">{e(value)}</th><td>{e(label)}{smalls(qual)}</td></tr>')
    out += ["  </tbody>", "</table>"]
    return "\n".join(out)


def media_block(p):
    m, slug = p["media"], p["slug"]
    if slug == "exetix":
        shots = [i for i in m["images"] if i.get("alt")]
        figs = "\n".join(
            f'  <img src="{e(i["src"])}" alt="{e(i["alt"])}" width="{i["w"]}" height="{i["h"]}" loading="lazy" decoding="async">'
            for i in shots)
        return f'<div class="shots">\n{figs}\n</div>'
    if m.get("video"):
        src = m["poster"]
        w, h = SIZE.get(src, (16, 10))
        lqip = thumb(p)
        # The poster loads when the note opens (app.js), not for all four notes at once.
        # Until then the row's own square thumbnail stands in, centred, exactly where the
        # poster's middle will be; without JS, CSS shows the full poster instead.
        style = f"aspect-ratio:{w}/{h};background-image:url({lqip});--poster:url({poster(src)})"
        return (f'<figure class="video" style="{e(style)}">\n'
                f'  <video src="{e(m["video"])}" data-poster="{e(poster(src))}" muted loop playsinline preload="none" '
                f'aria-label="{e(ALT.get(src, p["name"]))}"></video>\n'
                f'  <button class="vid-toggle" type="button" aria-label="Play video" hidden>'
                f'<svg aria-hidden="true"><use href="#i-play"/></svg></button>\n'
                f'</figure>')
    return ""


def link_item(href, label, note=None, main=False, ext=False):
    cls = ' class="link-main"' if main else ""
    rel = ' rel="noopener"' if ext else ""
    icon = '<span class="link-icon" aria-hidden="true"><svg><use href="#i-doc"/></svg></span>' if main else ""
    tail = ('<span class="ext" aria-hidden="true">↗</span>' if ext
            else '<svg class="go" aria-hidden="true"><use href="#i-chev-r"/></svg>')
    return f'<li><a{cls} href="{e(href)}"{rel}>{icon}<span>{e(label)}{smalls(note)}</span>{tail}</a></li>'


def links_block(p):
    """One inset list. Every row is labelled with where it goes, in that page's own words:
    the project's page first, then its track page (where most of the quoted numbers come
    from), then titled related pages and live external links."""
    primary = p["primary_href"]
    notes = PLACE.get(p["slug"], {}).get("link", {})
    out = []
    if p.get("download_href"):
        icon = p["media"].get("image")
        name = p["download_href"].rsplit("/", 1)[-1]
        out += [f'<a class="file" href="{e(p["download_href"])}" download>',
                f'  <img src="{e(icon)}" alt="" width="40" height="40" loading="lazy" decoding="async">',
                f'  <span>{e(name)}</span>',
                '</a>']
    items = [link_item(primary, page_title(primary) or p["name"], notes.get(primary), main=True)]
    seen = {primary}
    track = p["track_href"]
    for href in [track, *p["related_hrefs"]]:
        label = page_title(href) if href == track else PAGE_TITLES.get(href)
        if href and href not in seen and label:
            seen.add(href)
            items.append(link_item(href, label, notes.get(href)))
    for x in p["external_href"]:
        if x["href"] in DEAD:
            continue
        items.append(link_item(x["href"], x["label"], notes.get(x["href"]), ext=True))
    out.append('<ul class="links">\n  ' + "\n  ".join(items) + "\n</ul>")
    return "\n".join(out)


def kill_log_extra():
    """The research scoreboard from /work/#programme. Counts ship with their as-of line."""
    r = DATA["research_summary"]
    led = r["second_ledger"]
    row_notes = PLACE["kill-log"]["row"]
    note_for = lambda label: next((t for k, t in row_notes.items() if label.startswith(k)), None)
    parts = [f'<p>{e(r["headline"]["text"])}</p>',
             numbers_table([(x["value"], x["label"], None) for x in r["first_programme"]]),
             numbers_table([(x["value"], x["label"], note_for(x["label"])) for x in led["verdicts"]],
                           caption=led["caption"]["text"]),
             f'<p class="aside">{e(led["as_of"]["text"])}</p>',
             '<table class="grid edges">\n  <thead><tr><th scope="col">Edge</th><th scope="col">Eaten by</th></tr></thead>\n  <tbody>\n' + "\n".join(
                 f'    <tr><td>{e(x["edge"])}</td><td>{e(x["eaten_by"])}</td></tr>'
                 for x in r["what_ate_the_edges"]) + "\n  </tbody>\n</table>",
             '<ul class="plain">\n' + "\n".join(
                 f'  <li><strong>{e(x["value"])}</strong> {e(x["label"])}</li>' for x in r["retraction"]) + "\n</ul>",
             f'<p class="aside">{e(PLACE["kill-log"]["after_retraction"])}</p>']
    return "\n".join(parts)


def honesty_block(p, shown):
    lines = []
    for h in DATA["honesty_lines"]:
        if h["applies_to"] not in HONESTY_FOR.get(p["slug"], []):
            continue
        t = norm(h["text"])
        if any(t in s for s in shown if s):
            continue  # already on screen as a qualifier or status line
        shown.append(t)
        lines.append(f'<p>{e(h["text"])}</p>')
    if p["slug"] in SITE_LINE_IN:
        lines.append(f'<p class="site-line">{e(FOOTER_LINE)}</p>')
    return f'<div class="fine">\n' + "\n".join(lines) + "\n</div>" if lines else ""


def status_line(p):
    """Centered grey line at the top, like a note's date. The status detail, in full: if an
    honesty line carries it word for word (often with a word more), that line is used, so it
    is said once, up top. If a number's qualifier already says it, the short status is used,
    and even that is dropped when it only repeats the row (unless it is an honesty label)."""
    mine = [h["text"] for h in DATA["honesty_lines"] if h["applies_to"] in HONESTY_FOR.get(p["slug"], [])]
    quals = [norm(k.get("qualifier")) for k in p["key_numbers"] if k.get("qualifier")]
    detail = (p["status_detail"] or {}).get("text")
    meta = p["status"]
    if detail:
        # a word or two more at most: a long honesty line stays in the fine print
        meta = next((h for h in mine if norm(detail) in norm(h) and len(h) <= len(detail) + 8), detail)
        if meta == detail and any(norm(detail) in norm(h) for h in mine):
            meta = p["status"]
        if any(norm(detail) in q for q in quals):
            meta = p["status"]
    if meta == p["status"] and meta not in KEEP_STATUS:
        return None
    return meta


def article(p, first):
    meta = status_line(p)
    shown = [norm(meta)] + [norm(t) for t in placed(p["slug"])]
    rows = []
    for k in p["key_numbers"]:
        rows.append((k["value"], k["label"], k.get("qualifier")))
        shown += [norm(k.get("qualifier")), norm(f'{k["value"]} {k["label"]}')]
    lead = None
    if p["slug"] in HERO:
        lead = hero(*rows.pop(HERO[p["slug"]]), extra=PLACE.get(p["slug"], {}).get("hero", ()))
    note = p["media"].get("note")  # DeskStatus is never pictured; the reason reads as a caption
    body = [f'<p class="meta">{e(meta)}</p>' if meta else "",
            f'<h2>{e(p["name"])}</h2>',
            f'<p class="lede">{e(p["one_line"]["text"])}</p>',
            lead or "",
            media_block(p),
            numbers_table(rows) if rows else "",
            f'<p class="aside caption">{e(note["text"])}</p>' if note else ""]
    if p["slug"] == "kill-log":
        body.append(kill_log_extra())
        r = DATA["research_summary"]
        shown += [norm(x["label"]) for x in r["second_ledger"]["verdicts"]]
        shown += [norm(x["eaten_by"]) for x in r["what_ate_the_edges"]]
    body += [links_block(p), honesty_block(p, shown)]
    inner = "\n".join(b for b in body if b)
    inner = "\n".join("      " + ln if ln else ln for ln in inner.split("\n"))
    cls = ' class="is-active"' if first else ""
    return f'    <article id="{p["slug"]}"{cls} aria-labelledby="t-{p["slug"]}">\n{inner.replace("<h2>", f"<h2 id=\"t-{p["slug"]}\" tabindex=\"-1\">", 1)}\n    </article>'


def row(p, first):
    t = thumb(p)
    img = f'<img src="{e(t)}" alt="" width="44" height="44" decoding="async">' if t else ""  # ~16 KB in all, on screen at first paint
    cur = ' aria-current="true"' if first else ""
    return (f'        <li data-folder="{folder_id(p["shelf_tag"])}"><a class="row" href="#{p["slug"]}"{cur}>'
            f'<span class="row-text"><strong>{e(p["name"])}</strong>'
            f'<span class="preview"><span class="st">{e(p["status"])}</span> <span class="pv">{e(p["one_line"]["text"])}</span></span></span>'
            f'{img}</a></li>')


def folder_row(fid, label, count, current=False):
    cur = ' aria-current="true"' if current else ""
    return (f'        <li><a class="frow" id="folder-{fid}" href="#folder-{fid}" data-folder="{fid}"{cur}>'
            f'<svg aria-hidden="true"><use href="#i-folder"/></svg><span>{e(label)}</span>'
            f'<span class="count">{count}</span><svg class="chev" aria-hidden="true"><use href="#i-chev-r"/></svg></a></li>')


def folder_css():
    """Without JS a folder link still filters the list: the link is its own :target."""
    out = ["html:not(.js) body:has(.frow:target) .frow[aria-current] { background: none; }",
           "html:not(.js) .frow:target { background: var(--sel-folder); }"]
    for f in FOLDERS:
        fid = folder_id(f)
        out.append(f'html:not(.js) body:has(#folder-{fid}:target) .rows > li:not([data-folder="{fid}"]) {{ display: none; }}')
    return "\n".join(out)


def owner_links():
    items = []
    for n in OWNER["home_nav"]:
        ext = n["href"].startswith("http")
        rel = ' rel="me noopener"' if ext else ""
        items.append(f'        <li><a href="{e(n["href"])}"{rel}>{e(n["label"])}</a></li>')
    return "\n".join(items)


def build():
    counts = {f: sum(p["shelf_tag"] == f for p in PROJECTS) for f in FOLDERS}
    folders = [folder_row("all", "All", len(PROJECTS), True)] + [
        folder_row(folder_id(f), f, counts[f]) for f in FOLDERS]
    rows = [row(p, i == 0) for i, p in enumerate(PROJECTS)]
    notes = [article(p, i == 0) for i, p in enumerate(PROJECTS)]
    tpl = (HERE / "template.html").read_text()
    out = (tpl.replace("{{FOLDERS}}", "\n".join(folders))
              .replace("{{FOLDER_CSS}}", folder_css())
              .replace("{{ROWS}}", "\n".join(rows))
              .replace("{{NOTES}}", "\n".join(notes))
              .replace("{{OWNER_LINKS}}", owner_links())
              .replace("{{FOOTER}}", e(FOOTER_LINE))
              .replace("{{NAME}}", e(OWNER["name"])))
    (HERE / "index.html").write_text(out)
    return out


# ---------- verbatim check ----------
def check(out):
    text = html.unescape(re.sub(r"<[^>]+>", " ", out))
    text = re.sub(r"\s+", " ", text)
    need = [FOOTER_LINE, OWNER["name"]]
    for p in PROJECTS:
        need += [p["name"], p["one_line"]["text"], p["status"]]
        if p["status_detail"]:
            need.append(p["status_detail"]["text"])
        for k in p["key_numbers"]:
            need += [k["value"], k["label"]] + ([k["qualifier"]] if k.get("qualifier") else [])
        if p["media"].get("note"):
            need.append(p["media"]["note"]["text"])
        if f'href="{p["primary_href"]}"' not in out:
            print("MISSING primary_href", p["primary_href"]); sys.exit(1)
        for h in DATA["honesty_lines"]:
            if h["applies_to"] in HONESTY_FOR.get(p["slug"], []):
                need.append(re.sub(r"\.$", "", h["text"]))
        # Every quoted number links to the page it was taken from (track pages at least),
        # and no two links in one note say the same thing.
        art = re.search(rf'<article id="{p["slug"]}".*?</article>', out, re.S).group(0)
        srcs = {p["track_href"]} | {
            "/" + k[f].removesuffix("index.html") for k in p["key_numbers"]
            for f in ("source", "qualifier_source") if (k.get(f) or "").startswith("tracks/")}
        for href in sorted(srcs):
            if f'href="{href}"' not in art:
                print("NOTE", p["slug"], "does not link its source", href); sys.exit(1)
        labels = [html.unescape(re.sub(r"<small>.*?</small>|<[^>]+>", "", m)).strip().lower()
                  for m in re.findall(r'<ul class="links">.*?</ul>', art, re.S)[0].split("<li>")[1:]]
        if len(labels) != len(set(labels)):
            print("NOTE", p["slug"], "repeats a link label", labels); sys.exit(1)
        for t in placed(p["slug"]):
            if t not in [h["text"] for h in DATA["honesty_lines"]]:
                print("PLACE text is not a verbatim honesty line:", t); sys.exit(1)
    for n in OWNER["home_nav"]:
        if f'href="{n["href"]}"' not in out:
            print("MISSING owner link", n["href"]); sys.exit(1)
    missing = [s for s in need if re.sub(r"\s+", " ", s) not in text]
    for s in missing:
        print("MISSING:", s)
    raw = re.findall(r'<a [^>]*>\s*(?:<[^>]+>\s*)*(/[^<\s]*)', out)
    if raw:
        print("RAW PATH as link text:", raw); sys.exit(1)
    for d in DEAD:
        if d in out:
            print("DEAD link shipped:", d); sys.exit(1)
    if re.search(r"realised", text, re.I):
        print("FORBIDDEN word 'realised' found"); sys.exit(1)
    if missing:
        sys.exit(1)
    print(f"ok: {len(need)} verbatim strings, {len(PROJECTS)} notes, every track page linked")


if __name__ == "__main__":
    check(build())
