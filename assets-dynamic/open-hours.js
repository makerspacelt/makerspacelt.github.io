// Open hours: dynamic slider + live open/closed line, backed by homepage-extras.
// Slider 50–100 %, step 5. At default 100% the curated static list is shown.
// At 50–100% - computed from fetched per-slot open probabilities; every weekday is listed.
function setupOpenHours() {
  const container = document.querySelector('.open-hours')
  if (!container) return

  const OH_URL = 'https://homepage-extras.makerspace.lt/open-hours'
  const NOW_URL = 'https://homepage-extras.makerspace.lt/open-now'
  const OH_POLL_OK = 60 * 60 * 1000
  const OH_POLL_FAIL = 5 * 60 * 1000
  const NOW_POLL = 2 * 60 * 1000
  const DEBOUNCE = 200
  const SLOT_MIN = 30,
    MIN_LEN_MIN = 120,
    DAY_START = 7 * 60
  const WEEKDAYS = [
    'Pirmadienis',
    'Antradienis',
    'Trečiadienis',
    'Ketvirtadienis',
    'Penktadienis',
    'Šeštadienis',
    'Sekmadienis',
  ]
  const SLOTS_PER_DAY = (24 * 60) / SLOT_MIN
  const DAY_START_IDX = DAY_START / SLOT_MIN

  const staticList = container.querySelector('ul')
  if (!staticList) return

  const slider = document.createElement('input')
  slider.type = 'range'
  slider.className = 'oh-slider'
  slider.min = 50
  slider.max = 100
  slider.step = 10
  slider.value = 100
  slider.setAttribute('aria-label', 'Tikimybė, kad bus atidaryta')

  const value = document.createElement('span')
  value.className = 'oh-value'

  const label = document.createElement('span')
  label.className = 'oh-label'

  const control = document.createElement('div')
  control.className = 'oh-control'
  control.append(label, slider, value)

  let data = null
  let live = false
  let listEl = staticList
  let debounceId = null

  updateFields(100)

  function updateFields(p) {
    label.textContent = p >= 100 ? 'Darbo laikas¹' : 'Tikimybė¹'
    label.title =
      p >= 100
        ? 'Darbo laikas - kai labai stengiamės, kad būtų atviri vakarai'
        : 'Tikimybė, kad bus atidaryta pagal paskutines 10 savaičių'
    value.textContent = p + '%'
  }

  function fmt(min) {
    const m = ((min % 1440) + 1440) % 1440
    const h = Math.floor(m / 60),
      mm = m % 60
    return String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0')
  }

  // Logical day wd runs 07:00 → 07:00 next morning, so an evening session's
  // post-midnight spill stays on the day it started. Returns ranges as
  // { wd, startMin, endMin } (minutes-from-midnight of each endpoint's own day).
  function computeRanges(threshold) {
    const prob = {}
    for (const e of data) {
      if (e.p < threshold) continue
      const i = e.hm.split(':')
      const idx = (Number(i[0]) * 60 + Number(i[1])) / SLOT_MIN
      const m = prob[e.wd] || (prob[e.wd] = {})
      m[idx] = e.p
    }
    const ranges = []
    for (let wd = 1; wd <= 7; wd++) {
      const dp = prob[wd] || {},
        np = prob[(wd % 7) + 1] || {}
      const slots = []
      for (let i = DAY_START_IDX; i < SLOTS_PER_DAY; i++) slots.push([wd, i])
      for (let i = 0; i < DAY_START_IDX; i++) slots.push([(wd % 7) + 1, i])
      let runStart = null
      const emit = (a, b) => {
        if ((b - a + 1) * SLOT_MIN < MIN_LEN_MIN) return
        const s = slots[a],
          e = slots[b]
        ranges.push({ wd, startMin: s[1] * SLOT_MIN, endMin: (e[1] + 1) * SLOT_MIN })
      }
      for (let j = 0; j < slots.length; j++) {
        const open = (slots[j][0] === wd ? dp : np)[slots[j][1]] != null
        if (open) {
          if (runStart == null) runStart = j
        } else if (runStart != null) {
          emit(runStart, j - 1)
          runStart = null
        }
      }
      if (runStart != null) emit(runStart, slots.length - 1)
    }
    return ranges
  }

  function rangesToHTML(ranges) {
    const byWd = {}
    for (const r of ranges) {
      const a = byWd[r.wd] || (byWd[r.wd] = [])
      a.push(r)
    }
    const lis = []
    for (let wd = 1; wd <= 7; wd++) {
      const parts = byWd[wd] && byWd[wd].map((r) => fmt(r.startMin) + '–' + fmt(r.endMin))
      lis.push(
        '<li><span class="oh-weekday">' + WEEKDAYS[wd - 1] + '</span> ' + (parts ? parts.join(', ') : '---') + '</li>'
      )
    }
    return '<ul>' + lis.join('') + '</ul>'
  }

  function setList(node) {
    if (node === listEl) return
    listEl.replaceWith(node)
    listEl = node
  }

  function render(p) {
    if (p >= 100) {
      setList(staticList)
      return
    }
    if (!data) return
    const tpl = document.createElement('template')
    tpl.innerHTML = rangesToHTML(computeRanges(p))
    setList(tpl.content.firstElementChild)
  }

  function onInput() {
    const p = Number(slider.value)
    updateFields(p)
    if (debounceId) clearTimeout(debounceId)
    debounceId = setTimeout(() => render(p), DEBOUNCE)
  }

  slider.addEventListener('input', onInput)

  async function fetchHours() {
    try {
      const res = await fetch(OH_URL, { cache: 'no-cache' })
      if (!res.ok) throw new Error('open-hours HTTP ' + res.status)
      data = await res.json()
      if (!live) {
        live = true
        staticList.after(control)
      }
      render(Number(slider.value))
      return true
    } catch (e) {
      console.error(e)
      return false
    }
  }

  const pollHours = () => fetchHours().then((ok) => setTimeout(pollHours, ok ? OH_POLL_OK : OH_POLL_FAIL))
  pollHours()

  let nowLine = null
  async function fetchNow() {
    try {
      const res = await fetch(NOW_URL, { cache: 'no-cache' })
      if (!res.ok) throw new Error('open-now HTTP ' + res.status)
      const j = await res.json()
      const open = !!j.open
      if (!nowLine) {
        nowLine = document.createElement('p')
        nowLine.className = 'oh-now'
        const dot = document.createElement('span')
        dot.className = 'oh-dot'
        nowLine.append(dot, document.createTextNode(''))
        container.parentNode.insertBefore(nowLine, container.nextSibling)
      }
      nowLine.lastChild.nodeValue = open ? 'Šiuo metu atidaryta' : 'Šiuo metu uždaryta'
      nowLine.classList.toggle('oh-open', open)
      nowLine.classList.toggle('oh-closed', !open)
    } catch (e) {
      console.error(e)
    }
  }
  fetchNow()
  setInterval(fetchNow, NOW_POLL)
}

setupOpenHours()
