// Core behavior: theme, mobile menu, header scroll state, scroll progress,
// TOC highlighting, map overlay

// The initial data-theme is set by an inline script in <head> (before the
// stylesheet applies) to avoid a flash of the wrong theme on navigation.
function setupTheme() {
  const toggle = document.getElementById('theme-toggle')
  if (toggle) {
    toggle.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
      document.documentElement.setAttribute('data-theme', next)
      localStorage.setItem('theme', next)
    })
  }
}

function setupMobileMenu() {
  const menuToggle = document.getElementById('menu-toggle')
  const sidebar = document.getElementById('sidebar')
  if (!menuToggle || !sidebar) return

  function close() {
    sidebar.classList.remove('open')
    menuToggle.setAttribute('aria-expanded', 'false')
  }

  function open() {
    sidebar.classList.add('open')
    menuToggle.setAttribute('aria-expanded', 'true')
  }

  menuToggle.addEventListener('click', (e) => {
    e.stopPropagation()
    sidebar.classList.contains('open') ? close() : open()
  })

  // Close when tapping outside the sidebar/header, or on a sidebar nav link
  document.addEventListener('click', (e) => {
    if (!sidebar.classList.contains('open')) return
    if (sidebar.contains(e.target) || menuToggle.contains(e.target)) {
      if (e.target.closest('a')) close()
      return
    }
    close()
  })

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close()
  })
}

function setupHeaderScroll() {
  const header = document.getElementById('site-header')
  if (!header) return
  let last = 0
  function update() {
    const y = window.scrollY
    header.classList.toggle('scrolled', y > 4)
    last = y
  }
  window.addEventListener('scroll', update, { passive: true })
  update()
}

function setupScrollProgress() {
  const progressBar = document.getElementById('scroll-progress')

  function update() {
    if (!progressBar) return
    const docHeight = document.documentElement.scrollHeight - window.innerHeight
    const progress = docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0
    progressBar.style.width = progress + '%'
  }

  window.addEventListener('scroll', update, { passive: true })
  window.addEventListener('resize', update, { passive: true })
  update()
}

function setupTocHighlight() {
  const tocLinks = document.querySelectorAll('.toc a')
  const headings = document.querySelectorAll(
    '.content h1, .content h2, .content h3, .content h4, .content h5, .content h6'
  )

  function highlight() {
    if (!tocLinks.length || !headings.length) return
    const top = window.scrollY
    const mid = top + window.innerHeight * 0.3

    const activeIds = new Set()
    let fallbackId = ''

    for (const heading of headings) {
      const hTop = heading.offsetTop
      const hBottom = hTop + heading.offsetHeight
      if (hBottom > top && hTop < mid) activeIds.add(heading.id)
      if (hTop <= mid) fallbackId = heading.id
    }

    if (activeIds.size === 0 && fallbackId) activeIds.add(fallbackId)

    tocLinks.forEach((link) => {
      const href = link.getAttribute('href')
      const id = href.startsWith('#') ? href.slice(1) : href
      link.classList.toggle('active', activeIds.has(id))
    })
  }

  window.addEventListener('scroll', highlight, { passive: true })
  highlight()
}

function setupMapOverlay() {
  // Prevent iframe map scroll interaction until clicked once
  document.querySelectorAll('iframe.map').forEach((iframe) => {
    const wrapper = document.createElement('div')
    wrapper.className = 'map-wrapper'
    iframe.parentNode.insertBefore(wrapper, iframe)
    wrapper.appendChild(iframe)

    const overlay = document.createElement('div')
    overlay.className = 'map-overlay'
    overlay.title = 'Press once to control the map'
    wrapper.appendChild(overlay)

    overlay.addEventListener('pointerdown', () => {
      overlay.style.display = 'none'
    })
  })
}

function setupCubeLogo() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  document.querySelectorAll('.brand-logo').forEach(setupOneLogo)
}

function setupOneLogo(logoContainer) {
  const svg = logoContainer.querySelector('svg')
  if (!svg) return

  const cubesGroup = svg.querySelector('#cubes')
  if (!cubesGroup) return

  const cubes = Array.from(cubesGroup.children).filter((g) => {
    const t = g.getAttribute('transform')
    return t && t.startsWith('translate(')
  })
  if (!cubes.length) return

  const cubeData = cubes.map((g) => {
    const m = g.getAttribute('transform').match(/translate\(([-\d.]+),([-\d.]+)\)/)
    return {
      el: g,
      ox: m ? parseFloat(m[1]) : 0,
      oy: m ? parseFloat(m[2]) : 0,
      curX: 0,
      curY: 0,
      tgtX: 0,
      tgtY: 0,
    }
  })

  let scattered = false

  function randomizeScatter() {
    cubeData.forEach((c) => {
      const angle = Math.random() * Math.PI * 2
      const dist = 6 + Math.random() * 14
      c.tgtX = Math.cos(angle) * dist
      c.tgtY = Math.sin(angle) * dist
    })
  }

  function toggleScatter() {
    if (scattered) {
      cubeData.forEach((c) => {
        c.tgtX = 0
        c.tgtY = 0
      })
      scattered = false
    } else {
      randomizeScatter()
      scattered = true
    }
  }

  // On touch devices Chrome synthesizes mouseenter before click, which
  // would toggle twice and make the first tap appear to do nothing.
  const brandArea = logoContainer.closest('.brand') || logoContainer.closest('.footer-brand') || logoContainer
  if (window.matchMedia('(hover: hover)').matches) {
    brandArea.addEventListener('mouseenter', toggleScatter)
  }
  logoContainer.addEventListener('click', toggleScatter)

  const lerp = 0.08
  function animate() {
    cubeData.forEach((c) => {
      c.curX += (c.tgtX - c.curX) * lerp
      c.curY += (c.tgtY - c.curY) * lerp
      c.el.setAttribute('transform', `translate(${c.ox + c.curX},${c.oy + c.curY})`)
    })
    requestAnimationFrame(animate)
  }
  animate()
}

function setupClickToCopy() {
  const COPIED_CLASS = 'copied'
  const FEEDBACK_MS = 900

  function showCopied(el) {
    el.classList.add(COPIED_CLASS)
    setTimeout(() => el.classList.remove(COPIED_CLASS), FEEDBACK_MS)
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
        return true
      }
    } catch (_) {
      /* fall through to legacy path */
    }

    // Legacy / non-secure context fallback (file:// previews, older browsers)
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'absolute'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    let ok = false
    try {
      ok = document.execCommand('copy')
    } catch (_) {
      ok = false
    }
    document.body.removeChild(ta)
    return ok
  }

  document.addEventListener('click', (e) => {
    const el = e.target.closest('.click-to-copy')
    if (!el) return
    if (e.target.closest('a, button')) return // don't steal clicks from nested links

    e.preventDefault()
    const text = (el.textContent || '').trim()
    if (!text) return

    copyText(text).then((ok) => {
      if (ok) showCopied(el)
    })
  })
}

// Next Hack & Tell: first Saturday of the month at 18:00. Fills the date
// span and reveals the line (hidden until JS runs).
function setupNextHnt() {
  const el = document.querySelector('.next-hnt')
  if (!el) return
  const dateEl = el.querySelector('.next-hnt-date')
  if (!dateEl) return

  const EVENT_HOUR = 18
  const now = new Date()

  function firstSaturday(year, month) {
    const d = new Date(year, month, 1, EVENT_HOUR, 0, 0, 0)
    d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7))
    return d
  }

  let next = firstSaturday(now.getFullYear(), now.getMonth())
  const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const event0 = new Date(next.getFullYear(), next.getMonth(), next.getDate())
  if (event0.getTime() < today0.getTime()) {
    next = firstSaturday(now.getFullYear(), now.getMonth() + 1)
  }

  const days = Math.floor((next.getTime() - now.getTime()) / 86400000)
  const yyyy = next.getFullYear()
  const mm = String(next.getMonth() + 1).padStart(2, '0')
  const dd = String(next.getDate()).padStart(2, '0')

  let prefix
  if (days <= 0) prefix = 'šiandien'
  else if (days === 1) prefix = 'po 1 dienos'
  else prefix = 'po ' + days + ' dienų'

  dateEl.textContent = `${prefix}, ${yyyy}-${mm}-${dd}.`
  el.classList.remove('hidden')
}

setupTheme()
setupMobileMenu()
setupHeaderScroll()
setupScrollProgress()
setupTocHighlight()
setupMapOverlay()
setupCubeLogo()
setupClickToCopy()
setupNextHnt()
setInterval(setupNextHnt, 600_000)
