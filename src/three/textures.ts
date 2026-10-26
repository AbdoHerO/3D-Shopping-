/** Small procedural textures drawn on canvases (no downloads). */
import * as THREE from 'three'

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')!] as const
}

const cache = new Map<string, THREE.Texture>()
function memo<T extends THREE.Texture>(key: string, make: () => T): T {
  if (!cache.has(key)) cache.set(key, make())
  return cache.get(key) as T
}

/** Soft radial glow, used for light pools, downlight halos and contact blobs. */
export function radialTexture(inner = 'rgba(255,240,225,1)', outer = 'rgba(255,240,225,0)', key = 'glow') {
  return memo(`radial:${key}`, () => {
    const [c, g] = canvas(128, 128)
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
    grad.addColorStop(0, inner)
    grad.addColorStop(1, outer)
    g.fillStyle = grad
    g.fillRect(0, 0, 128, 128)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  })
}

/** Cone-shaped wall wash below a spotlight. */
export function wallWashTexture() {
  return memo('wash', () => {
    const [c, g] = canvas(128, 256)
    const grad = g.createRadialGradient(64, 0, 4, 64, 40, 230)
    grad.addColorStop(0, 'rgba(255,236,214,0.95)')
    grad.addColorStop(0.35, 'rgba(255,230,205,0.35)')
    grad.addColorStop(1, 'rgba(255,230,205,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 128, 256)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  })
}

/** Vertical flutes as a normal map (counter front, island base). */
export function flutedNormalTexture() {
  return memo('fluted', () => {
    const [c, g] = canvas(256, 8)
    const img = g.createImageData(256, 8)
    for (let x = 0; x < 256; x++) {
      const phase = ((x % 32) / 32) * Math.PI * 2
      const nx = Math.sin(phase) * 0.75
      const nz = Math.sqrt(1 - nx * nx)
      for (let y = 0; y < 8; y++) {
        const i = (y * 256 + x) * 4
        img.data[i] = (nx * 0.5 + 0.5) * 255
        img.data[i + 1] = 128
        img.data[i + 2] = nz * 255
        img.data[i + 3] = 255
      }
    }
    g.putImageData(img, 0, 0)
    const t = new THREE.CanvasTexture(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    return t
  })
}

/** Warm backlight for the perfume niches: bright centre fading to the arch edges. */
export function backlightTexture() {
  return memo('backlight', () => {
    const [c, g] = canvas(128, 256)
    const grad = g.createRadialGradient(64, 150, 10, 64, 140, 170)
    grad.addColorStop(0, '#fff6ea')
    grad.addColorStop(0.55, '#f9dcc8')
    grad.addColorStop(1, '#d9a2a6')
    g.fillStyle = grad
    g.fillRect(0, 0, 128, 256)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  })
}

/** Striped awning canvas with a scalloped valance edge (alpha). */
export function awningTexture(a = '#C97B8E', b = '#FBF1EE') {
  return memo(`awning:${a}:${b}`, () => {
    const [c, g] = canvas(512, 256)
    const stripes = 14
    for (let i = 0; i < stripes; i++) {
      g.fillStyle = i % 2 ? b : a
      g.fillRect((i * 512) / stripes, 0, 512 / stripes + 1, 256)
    }
    // subtle fabric shading
    const shade = g.createLinearGradient(0, 0, 0, 256)
    shade.addColorStop(0, 'rgba(0,0,0,0.12)')
    shade.addColorStop(0.6, 'rgba(0,0,0,0)')
    shade.addColorStop(1, 'rgba(0,0,0,0.08)')
    g.fillStyle = shade
    g.fillRect(0, 0, 512, 256)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.wrapS = THREE.RepeatWrapping
    return t
  })
}

export function valanceTexture(a = '#C97B8E', b = '#FBF1EE') {
  return memo(`valance:${a}:${b}`, () => {
    const [c, g] = canvas(512, 64)
    const stripes = 14
    const w = 512 / stripes
    for (let i = 0; i < stripes; i++) {
      g.fillStyle = i % 2 ? b : a
      g.beginPath()
      g.moveTo(i * w, 0)
      g.lineTo(i * w + w, 0)
      g.lineTo(i * w + w, 34)
      g.arc(i * w + w / 2, 34, w / 2, 0, Math.PI)
      g.closePath()
      g.fill()
    }
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  })
}

/** Golden-hour sky dome gradient. */
export function skyTexture() {
  return memo('sky', () => {
    const [c, g] = canvas(4, 512)
    const grad = g.createLinearGradient(0, 0, 0, 512)
    grad.addColorStop(0, '#6f7fb3')
    grad.addColorStop(0.38, '#c7b4d4')
    grad.addColorStop(0.5, '#f6c9b0')
    grad.addColorStop(0.56, '#f9dcc4')
    grad.addColorStop(1, '#efe0d6')
    g.fillStyle = grad
    g.fillRect(0, 0, 4, 512)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  })
}

/** Text drawn into a texture (used for window decals). */
export function windowLetteringTexture(text: string, color = '#C9A46A') {
  return memo(`letter:${text}:${color}`, () => {
    const [c, g] = canvas(1024, 256)
    g.fillStyle = color
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.font = '600 96px "Cormorant Garamond", Georgia, serif'
    g.fillText(text, 512, 128)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  })
}

/** Stylised mirror: pale reflection with soft diagonal sheens (reads as glass without a reflection pass). */
export function mirrorTexture() {
  return memo('mirror', () => {
    const [c, g] = canvas(256, 256)
    const grad = g.createLinearGradient(0, 0, 256, 256)
    grad.addColorStop(0, '#f7f2f3')
    grad.addColorStop(0.5, '#e6dde1')
    grad.addColorStop(1, '#d9ccd2')
    g.fillStyle = grad
    g.fillRect(0, 0, 256, 256)
    g.globalAlpha = 0.55
    g.fillStyle = '#ffffff'
    g.beginPath()
    g.moveTo(40, 256)
    g.lineTo(110, 256)
    g.lineTo(230, 0)
    g.lineTo(170, 0)
    g.fill()
    g.globalAlpha = 0.3
    g.beginPath()
    g.moveTo(130, 256)
    g.lineTo(150, 256)
    g.lineTo(256, 30)
    g.lineTo(256, -10)
    g.fill()
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  })
}

/** Grey and white checkered floor tiles with fine grout (one 2×2 tile repeat). */
export function checkerTexture() {
  return memo('checker', () => {
    const [c, g] = canvas(512, 512)
    const tile = 256
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        g.fillStyle = (i + j) % 2 ? '#a9a8ab' : '#ecebea'
        g.fillRect(i * tile, j * tile, tile, tile)
      }
    }
    // a faint stone mottle so large areas do not look flat
    const img = g.getImageData(0, 0, 512, 512)
    let seed = 7
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let k = 0; k < img.data.length; k += 4) {
      const n = (rnd() - 0.5) * 7
      img.data[k] += n
      img.data[k + 1] += n
      img.data[k + 2] += n
    }
    g.putImageData(img, 0, 0)
    g.strokeStyle = 'rgba(120,118,120,0.55)'
    g.lineWidth = 2
    for (const v of [1, 256, 511]) {
      g.beginPath()
      g.moveTo(v, 0)
      g.lineTo(v, 512)
      g.moveTo(0, v)
      g.lineTo(512, v)
      g.stroke()
    }
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.anisotropy = 8
    return t
  })
}

/** One suspended-ceiling panel with its T-bar edge (repeated every panel). */
export function ceilingGridTexture() {
  return memo('ceiling-grid', () => {
    const [c, g] = canvas(256, 256)
    g.fillStyle = '#f7f7f5'
    g.fillRect(0, 0, 256, 256)
    // fine fissured mineral-fibre texture
    let seed = 11
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(150,150,150,${0.04 + rnd() * 0.06})`
      g.fillRect(rnd() * 256, rnd() * 256, 1 + rnd() * 2, 1)
    }
    g.fillStyle = '#d9d9d6'
    g.fillRect(0, 0, 256, 5)
    g.fillRect(0, 0, 5, 256)
    g.fillStyle = 'rgba(0,0,0,0.08)'
    g.fillRect(5, 5, 251, 2)
    g.fillRect(5, 5, 2, 251)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.anisotropy = 8
    return t
  })
}

/** Light oak veneer (counter base, back-wall cabinet). */
export function oakTexture() {
  return memo('oak', () => {
    const [c, g] = canvas(512, 128)
    g.fillStyle = '#d8b48a'
    g.fillRect(0, 0, 512, 128)
    let seed = 3
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < 160; i++) {
      const y = rnd() * 128
      g.strokeStyle = `rgba(${150 + rnd() * 40},${105 + rnd() * 30},${70 + rnd() * 20},${0.12 + rnd() * 0.2})`
      g.lineWidth = 0.6 + rnd() * 1.6
      g.beginPath()
      g.moveTo(0, y)
      for (let x = 0; x <= 512; x += 32) g.lineTo(x, y + Math.sin(x / 60 + i) * 1.5 + (rnd() - 0.5))
      g.stroke()
    }
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    return t
  })
}

/** Soft vertical light falling on a back panel from an LED strip at the top of a shelf. */
export function shelfGlowTexture() {
  return memo('shelf-glow', () => {
    const [c, g] = canvas(64, 128)
    const grad = g.createLinearGradient(0, 0, 0, 128)
    grad.addColorStop(0, 'rgba(255,225,180,0.95)')
    grad.addColorStop(0.45, 'rgba(255,214,165,0.35)')
    grad.addColorStop(1, 'rgba(255,214,165,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 64, 128)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  })
}
