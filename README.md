# charliewytk.github.io

Charlie Wuytack's portfolio: apps, Mac tools, games and quantitative trading research, published with GitHub Pages. Plain static HTML, CSS and JS. No site build step, no framework. (Only `concepts/notes/` has its own generator, `concepts/notes/build.py`.)

## Folder map

| Path | What it is |
| --- | --- |
| `index.html` | Homepage: a tiny desktop. Twelve app icons open each project as a window (a sheet on a phone). Styles and script in `assets/desktop.css` and `assets/desktop.js`. Every icon is a plain link, so it works without JS. |
| `shelf/` | The previous 3D shelf homepage, kept as is. Unlinked. Uses `<base href="../">`. |
| `work/` | The long-form portfolio page: ExeTix, other projects, research, tools, about. |
| `tracks/` | Tracklist (`tracks/index.html`) and one page per project (`tracks/<name>/`). Shared styles in `tracks/track.css`. |
| `research.html`, `apex/`, `kill-log/`, `example/`, `sizer/`, `weekly/`, `essays/` | Research write-ups and tools. |
| `merger-monitor/`, `subscribe/`, `share/` | Merger Monitor pages, sign-up and share drafts. |
| `doorly/`, `abyss-warden/`, `chelsea-bikes/`, `exetix/` | Standalone apps. They are styled separately on purpose. Do not move them onto `site.css`. |
| `concepts/` | Gallery of homepage design concepts (`concepts/index.html`). The Desktop concept became the homepage on 3 Nov 2026; edit the homepage, not `concepts/desktop/`. |
| `assets/site.css` | The shared design system. |
| `assets/js/` | Shared scripts. |
| `media/`, `downloads/` | Images, icons, audio and downloadable files. |
| `sw.js`, `manifest.webmanifest`, `offline.html` | Install-as-app and offline support. |
| `404.html`, `feed.xml`, `sitemap.xml`, `robots.txt` | Site plumbing. |
| `tests/` | Test suite. |

## `assets/site.css`

One stylesheet for the site. Link it first, then put page-only rules in a small inline `<style>` after it. Element defaults use `:where()`, so a page rule always wins.

Tokens live on `:root`:

- Type: `--font-sans`, `--font-mono`, `--text-xs` to `--text-2xl`, `--leading-*`, `--tracking-*`
- Space: `--space-1` (4px) to `--space-10` (128px), `--gutter` (16px on a phone), `--page`, `--measure`, `--header-h`, `--header-offset`
- Radius: `--radius-1` to `--radius-3`, `--radius-pill`
- Colour: `--bg`, `--bg-2`, `--bg-3`, `--fg` to `--fg-4`, `--line`, `--line-2`, `--accent`, `--accent-fg`, `--good`, `--warn`, `--bad`, `--info`, `--selection`
- Motion: `--ease-out`, `--ease-in-out`, `--spring-snappy`, `--spring-bouncy`, `--dur-*`, `--stagger`

Dark mode follows the system and can be forced with `data-theme="dark"` or `data-theme="light"` on `<html>`.

## Preview locally

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000/.

## Run the tests

```sh
python3 -m unittest discover -s tests -v
```

The mobile-fold tests drive headless Chrome through Node. On macOS, point them at Chrome first:

```sh
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" python3 -m unittest discover -s tests -v
```

CI runs the same suite on every push and pull request to `main` (`.github/workflows/test.yml`).

## Rules for agents editing this repo

- Keep every honesty line exactly as written: "paper", "after rewards", "not financial advice", "as of 30 September", "tiny size", "Nothing here is trading live at a profit" and the like. Never invent numbers, results, clients or quotes. Copy numbers verbatim from the source.
- Keep the element ids the tests look for (for example `#exetix`, `#merger`, `#chess`, `#work-btn`). Grep `tests/` before renaming or removing an id.
- For a site-wide change, edit `assets/site.css`. Do not copy tokens into pages.
- Leave the standalone apps' own styles alone.
- If you change a file listed in `KEEP` in `sw.js`, or add one, bump `VERSION` (keep the `side-a-` prefix; old caches are cleared by it).
- Run the tests before you call a change done.
