# content.json: the shared content pack (every string is verbatim from the `source` file it names)
- `owner`: name, location, site, links (github/contact/email) and home nav, as on the homepage.
- `projects[]`: 12 projects in homepage order (01–12, the `P` object). `slug` = folder-style id; `home_id` = homepage key.
- Per project: `one_line` (shortest verbatim line), `alt_lines`, `kind` (/work/ label), `shelf_tag` (homepage tag), `status` (+ `status_detail`).
- Links: `primary_href` (where the homepage sends you), `track_href`, `work_anchor`, `related_hrefs`, `external_href[]`, `download_href`.
- `media`: root-relative `image`/`images` (with alt)/`video`/`poster`/`og`; `null` means none exists. DeskStatus is never pictured; do not fake it.
- `key_numbers[]`: `{value, label, qualifier}`. A qualifier must ship next to its number.
- `honesty_lines[]`: `{text, source, applies_to}`. Every one must ship on the page it applies to, word for word.
- `research_summary`: the /work/#programme scoreboard. Include the "as of 30 September 2026" line wherever a count appears.
- `conflicts[]`: places where the site disagrees with itself. The pack uses the more qualified wording, and these are still open. Never call +1.38% "realised".
