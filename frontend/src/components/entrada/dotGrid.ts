/**
 * Fundo Dot Grid da tela de entrada — reimplementacao leve do Dot Grid do
 * React Bits, sem GSAP (porte da referencia login-ggpost.html).
 *
 * So desenha quando algo muda: parado = 0 frames. Desenha em lotes (um Path2D
 * por faixa de cor), com DPR limitado a 2 e redimensionamento com debounce.
 * Devolve a funcao que desliga tudo (listeners de window, rAF e timer).
 */

interface Opcoes {
  gap: number
  size: number
  proximity: number
  base: [number, number, number]
  active: [number, number, number]
  speedTrigger: number
  shockRadius: number
  shockStrength: number
  returnDuration: number
  /** Cliques nestes elementos nao geram a onda de choque. */
  ignorar: string
}

const PADRAO: Opcoes = {
  gap: 22, size: 3, proximity: 170,
  base: [210, 215, 221], active: [55, 128, 157],
  speedTrigger: 100, shockRadius: 250, shockStrength: 10,
  returnDuration: 1,
  ignorar: '.card, a, button, input, label',
}

export function dotGrid(canvas: HTMLCanvasElement, reduce: boolean, opts: Partial<Opcoes> = {}): () => void {
  const o: Opcoes = { ...PADRAO, ...opts }
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}
  const buckets = 8
  const omega = (2 * Math.PI) / (o.returnDuration * 0.45)
  const K = omega * omega, C = 2 * 0.28 * omega; // mola levemente elastica
  let W = 0, H = 0, n = 0
  let px = new Float32Array(0), py = px, ox = px, oy = px, vx = px, vy = px
  let raf = 0, last = 0
  const ptr = { x: -1e4, y: -1e4, vx: 0, vy: 0, t: 0 }
  const colors = Array.from({ length: buckets }, (_, i) => {
    const t = (i + 1) / buckets
    const c = o.base.map((b, k) => Math.round(b + (o.active[k] - b) * t))
    return `rgb(${c})`
  })
  const baseColor = `rgb(${o.base})`

  function build() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    W = innerWidth; H = innerHeight
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr)
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px'
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    const cell = o.size + o.gap
    const cols = Math.floor((W + o.gap) / cell) + 1
    const rows = Math.floor((H + o.gap) / cell) + 1
    const sx = (W - (cols - 1) * cell) / 2, sy = (H - (rows - 1) * cell) / 2
    n = cols * rows
    px = new Float32Array(n); py = new Float32Array(n)
    ox = new Float32Array(n); oy = new Float32Array(n)
    vx = new Float32Array(n); vy = new Float32Array(n)
    let i = 0
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++, i++) { px[i] = sx + c * cell; py[i] = sy + r * cell; }
    draw()
  }

  function draw() {
    ctx!.clearRect(0, 0, W, H)
    const R = o.size / 2, prox2 = o.proximity * o.proximity
    const paths = Array.from({ length: buckets + 1 }, () => new Path2D())
    for (let i = 0; i < n; i++) {
      const x = px[i] + ox[i], y = py[i] + oy[i]
      const dx = px[i] - ptr.x, dy = py[i] - ptr.y, d2 = dx * dx + dy * dy
      let b = 0
      if (d2 < prox2) b = 1 + Math.min(buckets - 1, Math.floor((1 - Math.sqrt(d2) / o.proximity) * buckets))
      const p = paths[b]
      p.moveTo(x + R, y); p.arc(x, y, R, 0, Math.PI * 2)
    }
    ctx!.fillStyle = baseColor; ctx!.fill(paths[0])
    for (let b = 1; b <= buckets; b++) { ctx!.fillStyle = colors[b - 1]; ctx!.fill(paths[b]); }
  }

  function step(dt: number) {
    let any = false
    for (let i = 0; i < n; i++) {
      if (ox[i] === 0 && oy[i] === 0 && vx[i] === 0 && vy[i] === 0) continue
      vx[i] += (-K * ox[i] - C * vx[i]) * dt; vy[i] += (-K * oy[i] - C * vy[i]) * dt
      ox[i] += vx[i] * dt; oy[i] += vy[i] * dt
      if (Math.abs(ox[i]) < .05 && Math.abs(oy[i]) < .05 && Math.abs(vx[i]) < .5 && Math.abs(vy[i]) < .5) { ox[i] = oy[i] = vx[i] = vy[i] = 0; }
      else any = true
    }
    return any
  }

  function tick(ts: number) {
    const dt = Math.min((ts - (last || ts)) / 1000, 1 / 30) || 1 / 60
    last = ts
    const pendente = aplicarPonteiro(ts)
    const moving = step(dt)
    draw()
    if (moving || pendente) raf = requestAnimationFrame(tick)
    else { raf = 0; last = 0; }
  }
  function wake() { if (!raf) raf = requestAnimationFrame(tick); }

  function push(i: number, fx: number, fy: number) {
    if (vx[i] * vx[i] + vy[i] * vy[i] > 900) return; // ja esta em movimento
    vx[i] += fx; vy[i] += fy
  }

  // O evento so anota a posicao. Empurrar os pontos e uma varredura por todos
  // eles: feita por evento, `pointermove` (que dispara mais de uma vez por
  // quadro com o mouse rapido) repetia a varredura varias vezes para desenhar
  // um quadro so — o tranco vinha dai. Agora a varredura acontece uma vez por
  // quadro, dentro do rAF.
  let alvoX = -1e4, alvoY = -1e4, pendente = false
  function onMove(e: PointerEvent) {
    alvoX = e.clientX; alvoY = e.clientY; pendente = true
    wake()
  }
  function aplicarPonteiro(ts: number) {
    if (!pendente) return false
    pendente = false
    const dt = Math.max(ts - ptr.t, 8) / 1000
    const nvx = (alvoX - ptr.x) / dt, nvy = (alvoY - ptr.y) / dt
    const fresh = ptr.t && ts - ptr.t < 100
    ptr.vx = fresh ? nvx : 0; ptr.vy = fresh ? nvy : 0
    ptr.x = alvoX; ptr.y = alvoY; ptr.t = ts
    if (!reduce && Math.hypot(ptr.vx, ptr.vy) > o.speedTrigger) {
      const prox2 = o.proximity * o.proximity
      for (let i = 0; i < n; i++) {
        const dx = px[i] - ptr.x, dy = py[i] - ptr.y
        if (dx * dx + dy * dy < prox2) push(i, (dx + ptr.vx * .005) * 1.5, (dy + ptr.vy * .005) * 1.5)
      }
    }
    return true
  }
  function onDown(e: PointerEvent) {
    const alvo = e.target instanceof Element ? e.target : null
    if (reduce || alvo?.closest(o.ignorar)) return
    for (let i = 0; i < n; i++) {
      const dx = px[i] - e.clientX, dy = py[i] - e.clientY, d = Math.hypot(dx, dy)
      if (d < o.shockRadius) {
        const f = (1 - d / o.shockRadius) * o.shockStrength * .8
        vx[i] += dx * f; vy[i] += dy * f
      }
    }
    wake()
  }
  function onLeave() { alvoX = alvoY = -1e4; pendente = false; ptr.x = ptr.y = -1e4; ptr.t = 0; wake(); }

  let rt = 0
  const onResize = () => { clearTimeout(rt); rt = window.setTimeout(build, 120); }
  window.addEventListener('resize', onResize)
  window.addEventListener('pointermove', onMove, { passive: true })
  window.addEventListener('pointerdown', onDown, { passive: true })
  document.documentElement.addEventListener('pointerleave', onLeave)
  build()

  return () => {
    clearTimeout(rt)
    if (raf) cancelAnimationFrame(raf)
    raf = 0
    window.removeEventListener('resize', onResize)
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerdown', onDown)
    document.documentElement.removeEventListener('pointerleave', onLeave)
  }
}
