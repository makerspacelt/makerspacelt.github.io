import { mkdir, rm, readdir, readFile, writeFile, copyFile, stat } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { processGalleryHtml } from './gallery.js';

const PUBLIC = 'public';
const CONTENT = 'content';
const CONTENT_ASSETS = join(CONTENT, 'assets');
const ASSETS_STATIC = 'assets-static';
const ASSETS_DYNAMIC = 'assets-dynamic';

// Primary site navigation. The home page (slug '') is "Apie mus".
// `anchor` (optional) appends `#anchor` to the home-page link — used for the
// "Paremk" entry, which jumps to the #parama section on the home page.
const NAV = [
  { slug: '',          label: 'Apie mus' },
  { slug: 'patalpos',  label: 'Įranga' },
  // { slug: 'projektai', label: 'Projektai' },
  { slug: 'renginiai', label: 'Renginiai' },
  { slug: 'tvarka',    label: 'Tvarka' },
  { slug: 'shop',      label: 'Parduotuvė' },
  { slug: '', anchor: 'parama', label: 'Paremk' },
];

const SOCIAL = [
  { label: 'Facebook',  href: 'https://www.facebook.com/KaunasMakerspace' },
  { label: 'Instagram', href: 'https://www.instagram.com/kaunas.makerspace/' },
  { label: 'Youtube',   href: 'https://www.youtube.com/@KaunasMakerspace' },
  { label: 'Github',    href: 'https://github.com/makerspacelt/' },
];

// Read the logo SVG once — inlined in the header and footer so JS can manipulate
// individual cube groups without a runtime fetch (which fails on file://)
const logoSvg = (await readFile(join(ASSETS_DYNAMIC, 'brand/logo-cubes.svg'), 'utf-8'))
  .replace(/^<\?xml[^>]*>\s*/, ''); // strip XML declaration for inline HTML

async function copyDir(src, dst) {
  await mkdir(dst, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const dstPath = join(dst, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, dstPath);
    } else {
      await copyFile(srcPath, dstPath);
    }
  }
}

function stripFrontMatter(text) {
  if (text.startsWith('---')) {
    const end = text.indexOf('---', 3);
    if (end !== -1) {
      return text.slice(end + 3).trimStart();
    }
  }
  return text;
}

function extractToc(html) {
  const toc = [];
  const regex = /<h([1-6]) id="([^"]+)">(?:<a[^>]*>)?([^<]+)(?:<\/a>)?<\/h\1>/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    toc.push({ level: parseInt(match[1]), id: match[2], text: match[3] });
  }
  return toc;
}

// Returns just the <ul>...</ul> tree (no outer <nav>); caller wraps it.
function buildTocList(toc) {
  if (!toc.length) return '';
  let html = '<ul><li>';
  let prev = 1;

  for (let i = 0; i < toc.length; i++) {
    const item = toc[i];

    if (i > 0) {
      if (item.level > prev) {
        html += '<ul>'.repeat(item.level - prev) + '<li>';
      } else if (item.level < prev) {
        html += '</li></ul>'.repeat(prev - item.level) + '</li><li>';
      } else {
        html += '</li><li>';
      }
    }

    html += `<a href="#${item.id}">${item.text}</a>`;
    prev = item.level;
  }

  html += '</li></ul>'.repeat(prev);
  return html;
}

// Relative path prefix for a page `depth` levels below the site root.
function prefixFromDepth(depth) {
  return depth > 0 ? '../'.repeat(depth) : './';
}

function buildNavHtml(currentName, prefix) {
  return NAV.map((item) => {
    const itemKey = item.slug || 'index';
    const base = item.slug ? `${prefix}${item.slug}/` : prefix;
    const href = item.anchor ? `${base}#${item.anchor}` : base;
    // Anchor-jump entries (e.g. "Paremk" → /#parama) are never "the page".
    const active = !item.anchor && itemKey === currentName;
    return `<a href="${href}"${active ? ' class="active" aria-current="page"' : ''}>${item.label}</a>`;
  }).join('');
}

// Rewrite wiki-internal links to relative site paths.
function rewriteLinks(html, prefix) {
  return html
    .replace(/href="([^"]*)"/g, (match, href) => {
      if (href.startsWith('/makerspace-lt/')) {
        const rest = href.slice('/makerspace-lt/'.length);
        return `href="${rest ? prefix + rest : prefix}"`;
      }
      if (href.startsWith('/assets/')) {
        return `href="${prefix}${href.slice(1)}"`;
      }
      return match;
    })
    .replace(/src="([^"]*)"/g, (match, src) => {
      if (src.startsWith('/assets/')) {
        return `src="${prefix}${src.slice(1)}"`;
      }
      return match;
    });
}

function pageTemplate({ title, tocList, navHtml, contentHtml, prefix }) {
  const tocBlock = tocList
    ? `<nav class="toc" aria-label="Turinys"><div class="sidebar-label">Turinys</div>${tocList}</nav>`
    : '';

  const socialHtml = SOCIAL
    .map((s) => `<a href="${s.href}">${s.label}</a>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="lt">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<script>
  (function () {
    var t = localStorage.getItem('theme')
    if (!t && matchMedia('(prefers-color-scheme: dark)').matches) t = 'dark'
    if (t) document.documentElement.setAttribute('data-theme', t)
  })()
</script>
<link rel="icon" href="${prefix}favicon.ico">
<link rel="stylesheet" href="${prefix}bundle.css">
</head>
<body>
<header class="site-header" id="site-header">
  <div class="header-inner">
    <div class="brand">
      <span class="brand-logo" id="site-logo" role="img" aria-hidden="true">${logoSvg}</span>
      <a class="brand-name" href="${prefix}">Kaunas Makerspace</a>
    </div>
    <nav class="primary-nav" aria-label="Puslapiai">
      ${navHtml}
    </nav>
    <button class="menu-toggle" id="menu-toggle" aria-label="Meniu" aria-expanded="false">☰</button>
  </div>
  <div class="scroll-progress" id="scroll-progress" aria-hidden="true"></div>
</header>
<div class="layout">
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-content">
      <nav class="sidebar-nav" aria-label="Puslapiai">
        <div class="sidebar-label">Puslapiai</div>
        ${navHtml}
      </nav>
      ${tocBlock}
    </div>
    <div class="sidebar-foot">
      <button id="theme-toggle" aria-label="Perjungti temą">🌓</button>
    </div>
  </aside>
  <main class="content">
    <article class="content-inner">
      ${contentHtml}
    </article>
    <footer class="site-footer">
      <div class="footer-inner">
        <div class="footer-brand">
          <span class="brand-logo" id="site-logo-footer" role="img" aria-hidden="true">${logoSvg}</span>
          <a class="brand-name" href="${prefix}">Kaunas Makerspace</a>
        </div>
        <nav class="footer-nav" aria-label="Puslapiai">
          ${navHtml}
        </nav>
        <div class="footer-contact">
          <a href="mailto:labas@makerspace.lt">labas@makerspace.lt</a>
          <span class="muted">Raudondvario pl. 86A, Kaunas</span>
        </div>
        <nav class="footer-social" aria-label="Socialiniai tinklai">
          ${socialHtml}
        </nav>
      </div>
    </footer>
  </main>
</div>
<script src="${prefix}bundle.js"></script>
</body>
</html>`;
}

const startAt = Date.now()

// Clean and create output directory
await rm(PUBLIC, { recursive: true, force: true });
await mkdir(PUBLIC, { recursive: true });
await writeFile(join(PUBLIC, '.nojekyll'), '');

// Copy static assets first, then overlay wiki assets
if (await stat(ASSETS_STATIC).catch(() => null)) {
  await copyDir(ASSETS_STATIC, PUBLIC);
}
if (await stat(CONTENT_ASSETS).catch(() => null)) {
  await copyDir(CONTENT_ASSETS, join(PUBLIC, 'assets'));
}

// Build dynamic assets
await Bun.build({entrypoints: [join(ASSETS_DYNAMIC, 'bundle.js')], outdir: 'public/', sourcemap: 'linked', minify: true})

// Build pages from markdown
const mdFiles = (await readdir(CONTENT)).filter((f) => f.endsWith('.md'));

for (const file of mdFiles) {
  const name = basename(file, '.md');
  const stripped = stripFrontMatter(await readFile(join(CONTENT, file), 'utf-8'));

  const rawHtml = Bun.markdown.html(stripped, {
    tables: true,
    strikethrough: true,
    tasklists: true,
    autolinks: true,
    headings: true,
  });

  const toc = extractToc(rawHtml);
  const title = toc.find((t) => t.level === 1)?.text || 'Kauno Makerspace';

  const prefix = prefixFromDepth(name === 'index' ? 0 : 1);
  const contentHtml = await processGalleryHtml(rewriteLinks(rawHtml, prefix), prefix);
  const navHtml = buildNavHtml(name, prefix);

  const fullHtml = pageTemplate({
    title,
    tocList: buildTocList(toc),
    navHtml,
    contentHtml,
    prefix,
  });

  const outDir = name === 'index' ? PUBLIC : join(PUBLIC, name);
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, 'index.html'), fullHtml);

  // Copy the original markdown alongside the HTML (without front matter)
  await writeFile(join(PUBLIC, `${name}.md`), stripped);
}

console.log(`Built ${mdFiles.length} pages to ${PUBLIC}/ in ${Date.now() - startAt} ms`);
