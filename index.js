const MIN_LOADER_MS = 1400
const START_IN_MS = 4 * 60 * 60 * 1000
const END_IN_MS = 40 * 60 * 60 * 1000
const WAITLIST_START_KEY = 'archain_waitlist_start_at'
const WAITLIST_END_KEY = 'archain_waitlist_end_at'

const page = document.getElementById('page')
const loader = document.getElementById('loader')
const waitlistAction = document.getElementById('waitlist-action')
const startBlock = document.querySelector('[data-countdown="start"]')
const endBlock = document.querySelector('[data-countdown="end"]')

function waitForAssets() {
  const fontReady = document.fonts?.ready ?? Promise.resolve()
  const images = ['assets/mark.png', 'assets/banner.png'].map(
    (src) =>
      new Promise((resolve) => {
        const img = new Image()
        img.onload = resolve
        img.onerror = resolve
        img.src = src
      }),
  )
  return Promise.all([fontReady, ...images])
}

function getWaitlistTargets() {
  const now = Date.now()
  let startAt = Number(localStorage.getItem(WAITLIST_START_KEY))
  let endAt = Number(localStorage.getItem(WAITLIST_END_KEY))

  if (!Number.isFinite(startAt) || startAt <= 0) {
    startAt = now + START_IN_MS
    localStorage.setItem(WAITLIST_START_KEY, String(startAt))
  }

  if (!Number.isFinite(endAt) || endAt <= 0) {
    endAt = now + END_IN_MS
    localStorage.setItem(WAITLIST_END_KEY, String(endAt))
  }

  return { startAt, endAt }
}

function splitRemaining(ms) {
  const total = Math.max(0, ms)
  const hours = Math.floor(total / 3_600_000)
  const minutes = Math.floor((total % 3_600_000) / 60_000)
  const seconds = Math.floor((total % 60_000) / 1000)

  return {
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0'),
    done: total <= 0,
  }
}

function renderCountdownBlock(block, time, activeLabel, completeLabel) {
  if (!block) return
  const label = block.querySelector('[data-label]')
  const h = block.querySelector('[data-h]')
  const m = block.querySelector('[data-m]')
  const s = block.querySelector('[data-s]')
  const digits = block.querySelector('.countdown__digits')

  if (label) label.textContent = time.done ? completeLabel : activeLabel
  if (h) h.textContent = time.hours
  if (m) m.textContent = time.minutes
  if (s) s.textContent = time.seconds
  if (digits) digits.setAttribute('aria-hidden', time.done ? 'true' : 'false')
}

function renderWaitlistButton(started, ended) {
  if (!waitlistAction) return

  if (ended) {
    waitlistAction.innerHTML =
      '<span class="waitlist-btn waitlist-btn--disabled">WAITLIST CLOSED</span>'
    return
  }

  if (started) {
    waitlistAction.innerHTML =
      '<a class="waitlist-btn" href="https://x.com/archaindotfun" target="_blank" rel="noopener noreferrer">JOIN WAITLIST</a>'
    return
  }

  waitlistAction.innerHTML =
    '<span class="waitlist-btn waitlist-btn--disabled">JOIN WAITLIST</span>'
}

function startCountdown() {
  const targets = getWaitlistTargets()

  const tick = () => {
    const now = Date.now()
    const start = splitRemaining(targets.startAt - now)
    const end = splitRemaining(targets.endAt - now)
    const started = now >= targets.startAt
    const ended = now >= targets.endAt

    renderCountdownBlock(startBlock, start, 'STARTS IN', 'WAITLIST OPEN')
    renderCountdownBlock(endBlock, end, 'ENDS IN', 'WAITLIST CLOSED')
    renderWaitlistButton(started, ended)
  }

  tick()
  window.setInterval(tick, 1000)
}

function startParallax() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduceMotion || !page) return

  let raf = 0
  let targetX = 0
  let targetY = 0
  let currentX = 0
  let currentY = 0

  const onMove = (event) => {
    const { innerWidth, innerHeight } = window
    targetX = (event.clientX / innerWidth - 0.5) * 2
    targetY = (event.clientY / innerHeight - 0.5) * 2
  }

  const loop = () => {
    currentX += (targetX - currentX) * 0.04
    currentY += (targetY - currentY) * 0.04
    page.style.setProperty('--mx', currentX.toFixed(4))
    page.style.setProperty('--my', currentY.toFixed(4))
    raf = requestAnimationFrame(loop)
  }

  window.addEventListener('pointermove', onMove, { passive: true })
  raf = requestAnimationFrame(loop)

  window.addEventListener(
    'beforeunload',
    () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(raf)
    },
    { once: true },
  )
}

function startLogoCursor() {
  const cursor = document.getElementById('cursor')
  if (!cursor) return

  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!finePointer) return

  let x = window.innerWidth / 2
  let y = window.innerHeight / 2
  let currentX = x
  let currentY = y
  let raf = 0

  const render = () => {
    const ease = reduceMotion ? 1 : 0.22
    currentX += (x - currentX) * ease
    currentY += (y - currentY) * ease
    cursor.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`
    raf = requestAnimationFrame(render)
  }

  const onMove = (event) => {
    x = event.clientX
    y = event.clientY
    cursor.classList.add('is-active')
  }

  const onOver = (event) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const hoverable = target.closest('a, button, .waitlist-btn, .header__x')
    cursor.classList.toggle('is-hover', Boolean(hoverable))
  }

  window.addEventListener('pointermove', onMove, { passive: true })
  window.addEventListener('pointerover', onOver, { passive: true })
  raf = requestAnimationFrame(render)
}

async function boot() {
  const started = performance.now()
  await waitForAssets()
  const remaining = Math.max(0, MIN_LOADER_MS - (performance.now() - started))
  await new Promise((resolve) => setTimeout(resolve, remaining))

  if (loader) {
    loader.classList.add('is-done')
    loader.setAttribute('aria-busy', 'false')
  }

  window.setTimeout(() => {
    page?.classList.add('is-ready')
    startParallax()
    startLogoCursor()
  }, 80)

  window.setTimeout(() => {
    loader?.remove()
  }, 900)

  startCountdown()
}

boot()
