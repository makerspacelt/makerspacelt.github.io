function setupGallery() {
  const galleries = document.querySelectorAll('.gallery')
  if (!galleries.length) return

  // Merge every gallery item on the page into one list so the lightbox
  // cycles across all galleries, matching the wiki's per-page grouping.
  const items = []
  galleries.forEach((gallery) => {
    gallery.querySelectorAll('img.gallery-item').forEach((img) => {
      const idx = items.length
      items.push({
        type: img.dataset.type || 'image',
        full: img.dataset.full,
        caption: img.dataset.caption || '',
        alt: img.alt || '',
      })
      // Attach to the <a> wrapper if present (it is the focusable element),
      // otherwise fall back to the <img> itself.
      const el = img.closest('a') || img
      el.addEventListener('click', (e) => {
        e.preventDefault()
        open(idx)
      })
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          open(idx)
        }
      })
    })
  })
  if (!items.length) return

  let overlay = null
  let stageEl = null
  let captionEl = null
  let counterEl = null
  let current = 0
  let savedOverflow = ''
  let savedScrollY = 0
  let touchStartX = 0

  function build() {
    overlay = document.createElement('div')
    overlay.className = 'lightbox'
    overlay.setAttribute('aria-hidden', 'true')
    overlay.innerHTML =
      '<div class="lightbox-zone lightbox-zone-left"></div>' +
      '<div class="lightbox-zone lightbox-zone-right"></div>' +
      '<button class="lightbox-btn lightbox-close" aria-label="Uždaryti">×</button>' +
      '<div class="lightbox-counter"></div>' +
      '<button class="lightbox-btn lightbox-prev" aria-label="Ankstesnis">❮</button>' +
      '<div class="lightbox-stage"></div>' +
      '<button class="lightbox-btn lightbox-next" aria-label="Kitas">❯</button>' +
      '<div class="lightbox-caption"></div>'
    document.body.appendChild(overlay)
    stageEl = overlay.querySelector('.lightbox-stage')
    captionEl = overlay.querySelector('.lightbox-caption')
    counterEl = overlay.querySelector('.lightbox-counter')

    overlay.querySelector('.lightbox-close').addEventListener('click', close)
    overlay.querySelector('.lightbox-zone-left').addEventListener('click', () => nav(-1))
    overlay.querySelector('.lightbox-zone-right').addEventListener('click', () => nav(1))
    overlay.querySelector('.lightbox-prev').addEventListener('click', (e) => {
      e.stopPropagation()
      nav(-1)
    })
    overlay.querySelector('.lightbox-next').addEventListener('click', (e) => {
      e.stopPropagation()
      nav(1)
    })
    document.addEventListener('keydown', onKey)
    overlay.addEventListener(
      'touchstart',
      (e) => {
        touchStartX = e.touches[0].clientX
      },
      { passive: true }
    )
    overlay.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX
      if (Math.abs(dx) > 50) nav(dx > 0 ? -1 : 1)
    })
  }

  function open(idx) {
    if (!overlay) build()
    current = idx
    savedOverflow = document.documentElement.style.overflow
    savedScrollY = window.scrollY
    document.documentElement.style.overflow = 'hidden'
    overlay.classList.add('open')
    overlay.setAttribute('aria-hidden', 'false')
    render()
  }

  function close() {
    if (!overlay || !overlay.classList.contains('open')) return
    overlay.classList.remove('open')
    overlay.setAttribute('aria-hidden', 'true')
    document.documentElement.style.overflow = savedOverflow
    window.scrollTo(0, savedScrollY)
    stageEl.innerHTML = '' // pause/discard any playing video
  }

  function nav(dir) {
    current = (current + dir + items.length) % items.length
    render()
  }

  function onKey(e) {
    if (!overlay || !overlay.classList.contains('open')) return
    if (e.key === 'Escape') close()
    else if (e.key === 'ArrowLeft') nav(-1)
    else if (e.key === 'ArrowRight') nav(1)
  }

  function preload(idx) {
    const item = items[idx]
    if (item && item.type === 'image') {
      const i = new Image()
      i.src = item.full
    }
  }

  function render() {
    const item = items[current]
    stageEl.innerHTML = ''
    if (item.type === 'video') {
      const v = document.createElement('video')
      v.src = item.full
      v.controls = true
      v.autoplay = true
      v.loop = true
      v.playsInline = true
      if (item.caption) v.setAttribute('aria-label', item.caption)
      stageEl.appendChild(v)
    } else {
      const img = document.createElement('img')
      img.src = item.full
      img.alt = item.alt || item.caption || ''
      stageEl.appendChild(img)
    }
    captionEl.textContent = item.caption
    counterEl.textContent = `${current + 1} / ${items.length}`
    preload((current + 1) % items.length)
    preload((current - 1 + items.length) % items.length)
  }
}

setupGallery()
