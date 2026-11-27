import { useEffect, useRef } from 'react'

// Pixel art of a cup on a saucer; '#' is a square, '.' is empty.
const CUP = [
  '..################....',
  '..##################..',
  '..################..#.',
  '..################..#.',
  '...##############.##..',
  '....############......',
  '.....##########.......',
  '######################',
  '..##################..',
]
const CUP_ALPHA = 0.07
const STEAM_ALPHA = 0.14
const FRAME_MS = 1000 / 30

type Puff = { x: number; y: number; speed: number; drift: number; phase: number; age: number; life: number }

export function SteamBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let cell = 14
    let width = 0
    let height = 0
    let ink = '#ffffff'
    const puffs: Puff[] = []

    const resize = () => {
      const ratio = window.devicePixelRatio || 1
      width = window.innerWidth
      height = window.innerHeight
      cell = width < 560 ? 9 : 14
      canvas.width = width * ratio
      canvas.height = height * ratio
      // Sized here, not with 100vh in CSS: on iPhones 100vh is taller than the visible area, so the
      // drawing got stretched and the cup ended up below the screen, under the browser's toolbar.
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    }
    const readInk = () => {
      ink = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#ffffff'
    }
    const cupLeft = () => width - (CUP[0].length + 3) * cell
    const cupTop = () => height - (CUP.length + 2) * cell
    // A square is drawn one pixel smaller than its cell, so the shapes read as a grid of squares.
    const square = (x: number, y: number) => ctx.fillRect(x, y, cell - 2, cell - 2)

    const spawn = (age = 0) => {
      const rimCells = CUP[0].indexOf('#')
      puffs.push({
        x: cupLeft() + (rimCells + 2 + Math.random() * 12) * cell,
        y: cupTop() - cell,
        speed: 16 + Math.random() * 14,
        drift: cell * (0.6 + Math.random() * 1.4),
        phase: Math.random() * Math.PI * 2,
        age,
        life: 4 + Math.random() * 2.5,
      })
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = ink
      ctx.globalAlpha = CUP_ALPHA
      CUP.forEach((row, r) =>
        [...row].forEach((c, col) => c === '#' && square(cupLeft() + col * cell, cupTop() + r * cell)),
      )
      for (const p of puffs) {
        const t = p.age / p.life
        const rise = p.age * p.speed
        const x = p.x + Math.sin(p.phase + p.age * 1.3) * p.drift
        ctx.globalAlpha = STEAM_ALPHA * Math.sin(Math.PI * t)
        square(Math.round(x / cell) * cell, Math.round((p.y - rise) / cell) * cell)
      }
    }

    resize()
    readInk()
    for (let i = 0; i < 26; i++) spawn(Math.random() * 5)

    if (still) {
      draw()
      return
    }

    let frame = 0
    let last = performance.now()
    let sinceSpawn = 0
    let frames = 0
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick)
      const dt = now - last
      if (dt < FRAME_MS) return
      last = now
      const seconds = Math.min(dt, 100) / 1000
      sinceSpawn += seconds
      if (sinceSpawn > 0.18) {
        sinceSpawn = 0
        spawn()
      }
      for (const p of puffs) p.age += seconds
      for (let i = puffs.length - 1; i >= 0; i--) if (puffs[i].age >= puffs[i].life) puffs.splice(i, 1)
      // The theme can switch while the page is open; re-reading the colour now and then is enough.
      if (++frames % 60 === 0) readInk()
      draw()
    }
    frame = requestAnimationFrame(tick)

    const onResize = () => {
      resize()
      draw()
    }
    window.addEventListener('resize', onResize)
    window.visualViewport?.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', onResize)
      window.visualViewport?.removeEventListener('resize', onResize)
    }
  }, [])

  return <canvas ref={canvasRef} className="steam-bg" aria-hidden="true" />
}
