# Kauno Makerspace static website

Kaunas Makerspace website generated from our internal wiki's markdown export.

The `content/` comes from the wiki export.

Everything else in this repository is theming and dynamic functionality on top of the wiki content.

## Build

- You need to have the `bun` Javascript runtime installed to build this website (https://bun.com/).
- To build, run: `bun scripts/build.js`.
  - (re-)creates `public/` on every build
  - `public/` is intended for GitHub Pages and includes `.nojekyll`
- To preview, run: `PORT=8000 bun scripts/preview.js` and open http://127.0.0.1:8000. The preview script also watches for file changes and automatically runs the build script.

## Source layout

- `content/*.md` is wiki-exported readonly page content.
- `content/assets/**` is wiki-exported media, if present.
- `assets-static/**` is hand-maintained site/static media, CSS, and JS.
- `assets-dynamic/**` is site's CSS, JS dynamic code, fonts and similar, bundled from `assets-dynamic/bundle.js` by `scripts/build.js`.
- The build copies `assets-static/` first, then overlays `content/assets/`; wiki assets win on path conflicts.

## Rendering notes

- Renderer: Bun's [markdown.html](https://bun.com/docs/runtime/markdown.md) with options: `tables`, `strikethrough`, `tasklists`, `autolinks`, `headings`.
- Front matter is stripped before rendering.
- Every page is emitted as HTML plus the original source `.md`.
- Wiki links under `/makerspace-lt/...` are rewritten to relative site links because `/makerspace-lt` is only the wiki content root.
- Wiki asset links `/assets/...` are rewritten to relative `./assets/` or `../assets/` paths.
- Content uses standard + GFM markdown. HTML is allowed, but used sparingly. In particular, the content might use these elements for styling/function:
  - `<div class="cards"><div class="card">...</div></div>` (for cards)
  - `<span class="click-to-copy">...</span>` (for click to copy to clipboard function)

## Page chrome / navigation

- Every page is wrapped by `pageTemplate()` in `scripts/build.js`. The DOM is a `.layout` flex row containing a `.sidebar-col` (which wraps the **header** — logo + wordmark, mobile hamburger, scroll-progress bar — above the **sidebar**: site nav labelled "Puslapiai", per-page ToC labelled "Turinys", then the theme toggle) and the **content** article; the content article ends with a **footer** (logo sign-off, nav, contacts, social, sign-off line).
- The primary site nav is the `NAV` array in `scripts/build.js` (slug + optional `anchor` + label). The home page has slug `''` and is labelled "Apie mus". The last entry is `{ slug: '', anchor: 'parama', label: 'Paremk' }` — a jump to the home page's `#parama` section; anchor entries are never marked active. Nav is rendered into the sidebar and the footer; the current page is marked `class="active" aria-current="page"`. A copy of the nav is also rendered in the sidebar but hidden on desktop (`display: none`) — it is shown only inside the mobile (≤900px) off-canvas drawer, so the hamburger still gives mobile users cross-page navigation.
- Social links live in the `SOCIAL` array in `scripts/build.js`.
- The cube logo SVG is inlined in both the header and the footer (so JS can animate the header cube without a runtime fetch). The SVG's `#text` wordmark group is hidden via CSS; the text wordmark beside the cube is the canonical brand. On desktop the header brand is stacked vertically (logo above wordmark, both centered); on mobile it reverts to a horizontal row with extra gap so the scatter animation doesn't clip the text.
- No wiki content modification is required for the chrome or theming — all structure comes from the template and CSS.

## Styling / JS

- `assets-dynamic/*.js`, `assets-dynamic/*.css`
- Logo: `assets-dynamic/brand/logo-cubes.svg` (dynamic because it is inlined by the build script)
- Font (headings, brand wordmark, sidebar labels, nav, and body): self-hosted variable Saira (OFL), split into `latin` + `latin-ext` subsets (`assets-dynamic/brand/saira-latin.woff2` ~33 KB, `saira-latin-ext.woff2` ~25 KB) loaded via two `@font-face` blocks in `main.css` with `unicode-range` so browsers fetch only what the page needs. Latin-ext covers all Lithuanian glyphs. Body and display share the same family; mono stays on the system stack.
- JS files are organized as named `setup*()` functions called once at the end of the file; no inline top-level code. Style is minimal and short; avoid comments that restate what the code does; no semicolons.
- CSS rules should be minimal, no comments that restate the obvious, effective use of inheritance, only fork those rules into @media that are required for functionality.

## Theming notes

The initial `data-theme` is set by a tiny inline `<script>` in `<head>` (before the stylesheet loads), reading `localStorage`/`prefers-color-scheme`. `setupTheme()` in `main.js` only wires the toggle — do not move the initial read back into the bundle, or the page will flash the wrong theme on navigation (the bundle loads at end of `<body>`). `color-scheme` is set on `:root`/`[data-theme="dark"]` so native widgets match.

- Warm "zones" are built without content edits: every `.cards` group gets a gold-tinted panel background (`--panel-bg` via `color-mix`), and the sidebar gets a faint warm wash (`--sidebar-bg`). Both adapt to dark mode automatically because they derive from `--bg` and `--color-accent`.
- `.card` carries a 3px `--color-secondary` (orange) top border, a soft shadow, and a hover lift — the cube's depth metaphor. Cards also get `overflow-wrap: anywhere` so long autolinked URLs (e.g. the Liberapay link) wrap instead of overflowing.
- `h2` headings get a small skewed-square `::before` marker in `--color-secondary` (an isometric cube-face echo). Because `h2` is `display:flex`, its inner anchor `<a>` is a flex item alongside the marker.
- Active-state affordance differs by location: the ToC marks the active entry with a colored left bar **and** bold colored text, while the sidebar site-nav (Puslapiai) uses bold colored text only (no left bar) so the two navigations stay visually distinct.
- Layout: a flex row of `.sidebar-col` + `.content`. `.sidebar-col` is `position: sticky; top: 0; height: 100vh` and is a flex column whose first child is the static `.site-header` (auto-height, transparent background inheriting the column's `--sidebar-bg`) and whose second child is `.sidebar` (which takes the remaining height). So on desktop the header lives inside the left sidebar column, not full-width on top. On mobile (≤900px) `.sidebar-col` becomes a plain block; the header switches to `position: fixed; top: 0` full-width with its own frosted background + `backdrop-filter`, and `.sidebar` becomes the off-canvas drawer (`position: fixed; top: var(--header-h); transform: translateX(100%)`) toggled by the header hamburger. Because the header is a sibling of `.sidebar` inside the non-transformed `.sidebar-col`, its `position: fixed` escapes to the viewport (a transformed ancestor would trap it). The content column gets `margin-top: var(--header-h)` on mobile to clear the fixed header. `.sidebar-content` has `overscroll-behavior: contain` so wheel-scrolling within the sidebar doesn't chain to the page, and `flex-shrink: 0` on its children prevents the `<hr>` from being squeezed at small viewport heights.
- Content column max-width is **960px**. Breakpoints: **≤900px** sidebar collapses to the off-canvas drawer (primary nav hides, header hamburger appears); **≤480px** the header shrinks (`--header-h` 52px) and heading sizes reduce. The footer grid also collapses to a single column at ≤900px.
- The cube logo is intentionally **not** a link (so a tap scatters it on touch); the wordmark beside it is the home link. The logo scatters in both the header and the footer.

The `processGalleryHtml` function is page-agnostic and reusable; a future large `/projektai` infinite-scroll gallery can reuse the same build pipeline and the same `setupGallery` lightbox (the merge-across-galleries behavior already handles one big list).

## Deployment paths

Generated internal links and asset links are relative, so the site can be previewed locally and hosted at the domain root or under a GitHub Pages project path.

## Design tokens (from Logo):

```css
--color-primary:   #df251e; /* Deep red */
--color-secondary: #df651e; /* Orange-red */
--color-accent:    #dfa61f; /* Golden yellow */
```

## Widgets

### Gallery

`<div class="gallery">` blocks in content contain raw `<img>` and/or `<video>` elements directly (no inner wrappers). At build time `scripts/gallery.js` (`processGalleryHtml`, called from `scripts/build.js` after `rewriteLinks`) rewrites each block into a uniform list of `<img class="gallery-item">` thumbnails:

- **Thumbnails** (640px-wide WebP, `fit: inside`, no upscale) for the grid.
- **Full-size** (1600px-wide WebP, no upscale) for the lightbox, for images only. Videos keep their original `<video>` source as `data-full`.
- Videos become `<img>` thumbnails (generated from their `poster`), carrying `data-type="video"` so the lightbox knows to create a `<video controls autoplay loop>` on view. Each thumb `<img>` is wrapped in `<a class="gallery-link" href="…">` pointing at the full-size media — good for SEO/no-JS, and the lightbox intercepts the click.
- Captions come from the element's `title` attribute; emitted as `data-caption` on the thumb and shown in the lightbox info bar (hidden when empty).
- Output media: `public/assets/gallery/<sha1>-{thumb,full}.webp`. The sha1 is of the **source bytes**, so it is a self-validating cache key — no manifest needed. Cached source-of-truth files live in `cache/gallery/` (gitignored); `public/` is wiped each build, so cached variants are copied back. Repeat builds only copy (≈0.1s).

The client lightbox lives in `setupGallery()` in `assets-dynamic/gallery.js` (styles in `assets-dynamic/gallery.css`). All `.gallery-item` on a page merge into one wrap-around list. Nav via `❮`/`❯` buttons, screen-edge click zones, ←/→ keys, and touch swipe; ESC or the `×` button closes (clicking the dim background or center media does nothing). The stage uses `pointer-events: none` so image clicks fall through to the nav zones, while videos re-enable `pointer-events: auto` so their controls stay usable. Scroll position is saved/restored on open/close; adjacent images are preloaded.

Grid layout is CSS multi-column (`column-count: 3`, `break-inside: avoid`) — a lightweight masonry that packs varying aspect ratios like Flickr/Google Photos. Column count auto-scales with item count via `:has()`: 1 item → 1 column, 2 items → 2 columns, 3+ → 3 columns (so a lone photo isn't a tiny sliver). Collapses to 2 columns ≤700px (1 column for a lone item).

### Open hours

The home page's `.open-hours` container (inside the "Atviri vakarai" card) lists open evening hours. `setupOpenHours()` in `assets-dynamic/open-hours.js` (styles in `assets-dynamic/open-hours.css`) fetches two endpoints from `homepage-extras.makerspace.lt` and degrades gracefully — on any fetch failure the container is left untouched:
* `/open-hours` → `[{ wd, hm, p }, …]` (weekday 1–7, 24h time, 0–100 % open probability per 30 min slot). On success the static list is replaced by a 50–105 % probability slider (step 5). **105 % ("--%") is the default and restores the original static `<ul>` verbatim**; 50–100 % is computed from the data. Every weekday is always listed; days with no qualifying run show "---".
* `/open-now` → `{ lastOpenAt, open }`. Appends a `<p class="oh-now">` ("Šiuo metu atidaryta/uždaryta") with a status dot (green pulse when open) as the last child of the card.

The non-obvious algorithm rule: each weekday is treated as a **logical day from 07:00 → 07:00 next morning**, so a post-midnight spill (e.g. `00:30`) shown under weekday W belongs to W's night, not W+1's morning. Maximal runs of slots with `p ≥ threshold` are emitted (multiple ranges joined by `, `); runs shorter than 2 h are dropped. The slider value label updates instantly; the list rebuild is debounced. Until the first successful `/open-hours` fetch the static list stays with no slider.

### Next Hack & Tell

The home page's "Renginiai" card contains `<div class="next-hnt hidden">Sekantis Hack & Tell: <span class="next-hnt-date"></span></div>`. The schedule is first Saturday of every month at 18:00. `setupNextHnt()` in `assets-dynamic/main.js` fills the `.next-hnt-date` span with text like `po 13 dienų (2026-07-04 18:00)` (or `šiandien` when the event is today, `po 1 dienos` for the singular case), and removes the `hidden` class. Computed client-side in the viewer's local time (target audience is Lithuanian).

## For Agents

`AGENTS.md` is a symlink to this README, shared by humans and AIs. When you learn something non-obvious that would save a future task, update the relevant section above (or add a new one) — not a running log here. Keep it terse: gotchas and conventions only, never restate what the code already says or paste feature specs.
