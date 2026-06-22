// Build-time gallery processing.
//
// Scans rendered page HTML for `<div class="gallery">…</div>` blocks and, for
// every `<img>` / `<video>` directly inside, generates a cached thumbnail and
// (for images) an optimized full-size WebP, then rewrites the block into a
// uniform list of clickable `<img class="gallery-item">` thumbnails that the
// client-side lightbox (assets/main.js → setupGallery) understands.
//
// Output media live under `public/assets/gallery/<sha1>-{thumb,full}.webp`.
// Source bytes are sha1-hashed; the hash IS the cache key, so a cached file is
// always valid for its bytes and no manifest is needed. The on-disk cache
// (`cache/gallery/`) persists across builds (public/ is wiped each build), so
// repeat builds only copy. `cache/` is gitignored.

import { mkdir, readFile, copyFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'

const CACHE_DIR = join(process.cwd(), 'cache', 'gallery')
const OUT_DIR = join(process.cwd(), 'public', 'assets', 'gallery')
const THUMB_W = 640
const FULL_W = 1600

const GALLERY_BLOCK_RE = /<div class="gallery">([\s\S]*?)<\/div>/g
const MEDIA_TAG_RE = /<(img|video)\b([^>]*?)(?:\/>|>(?:[\s\S]*?<\/\1>)|>)/gi

function getAttr(attrs, name) {
  const m = attrs.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, 'i'))
  return m ? m[1] : null
}

// Map a (possibly absolute or relative) `/assets/…`, `./assets/…`, `../assets/…`
// reference to candidate filesystem paths under the project root.
function resolveCandidates(ref) {
  const stripped = ref.replace(/^(?:\.\.\/)+|^\.\//, '').replace(/^\//, '')
  return [join('content', stripped), join(stripped)]
}

async function firstExisting(candidates) {
  for (const p of candidates) if (existsSync(p)) return p
  return null
}

async function sha1File(path) {
  return createHash('sha1').update(await readFile(path)).digest('hex')
}

async function ensureDir(path) {
  await mkdir(path, { recursive: true })
}

// Generate (or reuse from cache) a WebP variant and copy it to public/.
// `kind` is 'thumb' or 'full'. Returns {w, h} of the produced file.
async function ensureVariant(srcPath, hash, kind) {
  const cachePath = join(CACHE_DIR, `${hash}-${kind}.webp`)
  const outPath = join(OUT_DIR, `${hash}-${kind}.webp`)
  if (!existsSync(cachePath)) {
    const w = kind === 'thumb' ? THUMB_W : FULL_W
    await Bun.file(srcPath)
      .image()
      .resize(w, w, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: kind === 'thumb' ? 78 : 82 })
      .write(cachePath)
  }
  await copyFile(cachePath, outPath)
  const meta = await Bun.file(cachePath).image().metadata()
  return { w: meta.width, h: meta.height }
}

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

// Process one <img> or <video> tag. Returns the replacement HTML string, or
// null to leave the tag untouched (e.g. source file missing).
async function processMediaTag(tagName, attrs, prefix) {
  const isVideo = tagName === 'video'

  // Source for thumbnail generation: image src, or video poster.
  const ref = isVideo ? getAttr(attrs, 'poster') : getAttr(attrs, 'src')
  if (!ref) return null
  const srcPath = await firstExisting(resolveCandidates(ref))
  if (!srcPath) return null

  const hash = await sha1File(srcPath)
  const { w, h } = await ensureVariant(srcPath, hash, 'thumb')

  // Full-size source: optimized WebP for images, the original video file for
  // videos (already copied to public/assets/ by the build's asset copy).
  let fullUrl
  if (isVideo) {
    const videoSrc = getAttr(attrs, 'src')
    fullUrl = videoSrc // already relative after rewriteLinks
  } else {
    await ensureVariant(srcPath, hash, 'full')
    fullUrl = `${prefix}assets/gallery/${hash}-full.webp`
  }
  const thumbUrl = `${prefix}assets/gallery/${hash}-thumb.webp`
  const caption = getAttr(attrs, 'title') || ''
  const alt = caption || getAttr(attrs, 'alt') || ''
  const type = isVideo ? 'video' : 'image'

  const img =
    `<img class="gallery-item" src="${escapeAttr(thumbUrl)}" ` +
    `data-full="${escapeAttr(fullUrl)}" data-type="${type}" ` +
    `data-caption="${escapeAttr(caption)}" width="${w}" height="${h}" ` +
    `loading="lazy" alt="${escapeAttr(alt)}">`
  // Wrap in a link to the full-size media so crawlers and no-JS visitors
  // get a direct path; the lightbox intercepts the click.
  return `<a class="gallery-link" href="${escapeAttr(fullUrl)}">${img}</a>`
}

// Process all gallery blocks in a page's rendered HTML.
export async function processGalleryHtml(html, prefix) {
  if (!html.includes('class="gallery"')) return html

  await ensureDir(CACHE_DIR)
  await ensureDir(OUT_DIR)

  // Replace each gallery block, and within it each media tag. We collect all
  // replacements per block, then rebuild the block string so the outer regex
  // can substitute it in one pass.
  const replacements = []
  let match
  while ((match = GALLERY_BLOCK_RE.exec(html)) !== null) {
    const inner = match[1]
    const parts = []
    let last = 0
    let m
    while ((m = MEDIA_TAG_RE.exec(inner)) !== null) {
      parts.push(inner.slice(last, m.index))
      const replacement = await processMediaTag(m[1].toLowerCase(), m[2], prefix)
      parts.push(replacement ?? m[0])
      last = m.index + m[0].length
    }
    parts.push(inner.slice(last))
    replacements.push(`<div class="gallery">${parts.join('')}</div>`)
  }
  GALLERY_BLOCK_RE.lastIndex = 0

  let i = 0
  return html.replace(GALLERY_BLOCK_RE, () => replacements[i++])
}
