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
