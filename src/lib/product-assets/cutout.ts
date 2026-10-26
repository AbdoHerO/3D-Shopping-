/**
 * Local background removal for product photos. Works when the photo already has transparency, or
 * when the product sits on a plain, even background (typical shop packshots): the background is
 * flood-filled from the image border, so light areas inside the product are kept. Busy or
 * gradient backgrounds are refused rather than guessed, and the product falls back to a card.
 */
import { alphaBounds, crop, createRaster, type RasterImage } from './raster'

export interface CutoutResult {
  /** Cropped RGBA with transparent background, or null when no reliable cut-out was possible. */
  image: RasterImage | null
  method: 'alpha' | 'flood' | 'none'
  /** 0..1, how sure the cut-out is. */
  confidence: number
  /** The photo is opaque and the product seems to fill it edge to edge (e.g. a box front). */
  fillsFrame: boolean
  notes: string[]
}

const dist = (d: Uint8ClampedArray, i: number, c: [number, number, number]) =>
  Math.hypot(d[i] - c[0], d[i + 1] - c[1], d[i + 2] - c[2])

function median(values: number[]) {
  const s = [...values].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)] ?? 0
}

function borderIndices(w: number, h: number) {
  const out: number[] = []
  for (let x = 0; x < w; x++) out.push(x, (h - 1) * w + x)
  for (let y = 1; y < h - 1; y++) out.push(y * w, y * w + w - 1)
  return out
}

/** Keeps the connected foreground parts that matter (drops dust and stray specks). */
function keepMainComponents(mask: Uint8Array, w: number, h: number) {
  const label = new Int32Array(w * h).fill(-1)
  const sizes: number[] = []
  const stack: number[] = []
  for (let start = 0; start < w * h; start++) {
    if (!mask[start] || label[start] !== -1) continue
    const id = sizes.length
    let size = 0
    stack.push(start)
    label[start] = id
    while (stack.length) {
      const p = stack.pop()!
      size++
      const x = p % w
      const y = (p - x) / w
      const n = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]
      for (const q of n) {
        if (q >= 0 && mask[q] && label[q] === -1) {
          label[q] = id
          stack.push(q)
        }
      }
    }
    sizes.push(size)
  }
  if (sizes.length === 0) return 0
  const biggest = Math.max(...sizes)
  const keep = sizes.map((s) => s >= Math.max(biggest * 0.04, w * h * 0.0005))
  for (let p = 0; p < w * h; p++) if (mask[p] && !keep[label[p]]) mask[p] = 0
  return keep.filter(Boolean).length
}

export function removeBackground(input: RasterImage, opts: { tolerance?: number } = {}): CutoutResult {
  const { width: w, height: h, data } = input
  const notes: string[] = []
  const border = borderIndices(w, h)

  // 1. Already transparent (a cut-out PNG or WebP): trust the alpha channel.
  const clearBorder = border.filter((p) => data[p * 4 + 3] < 24).length / border.length
  let clear = 0
  for (let p = 0; p < w * h; p++) if (data[p * 4 + 3] < 24) clear++
  // any real transparency means the file was cut out on purpose (even if only its corners are clear)
  if (clearBorder > 0.25 || clear >= Math.max(4, w * h * 0.0003)) {
    const box = alphaBounds(input, 128)
    if (!box) return { image: null, method: 'none', confidence: 0, fillsFrame: false, notes: ['The image is fully transparent.'] }
    const pad = 2
    return {
      image: crop(input, box.x0 - pad, box.y0 - pad, box.width + pad * 2, box.height + pad * 2),
      method: 'alpha',
      confidence: 0.95,
      fillsFrame: false,
      notes,
    }
  }

  // 2. Plain background: estimate its colour from the border and check it is even.
  const bg: [number, number, number] = [0, 1, 2].map((c) => median(border.map((p) => data[p * 4 + c]))) as [number, number, number]
  const tol = opts.tolerance ?? 26
  // studio backgrounds are neutral white, grey or black; a coloured border is more likely the
  // product itself (a box photographed edge to edge) than a backdrop, so it is not removed
  const spread = Math.max(...bg) - Math.min(...bg)
  const neutral = spread <= 22 && (Math.min(...bg) >= 175 || Math.max(...bg) <= 50)
  if (!neutral) {
    notes.push('The photo has a coloured background (or the product fills the photo), so it was not cut out automatically.')
    return { image: null, method: 'none', confidence: 0, fillsFrame: true, notes }
  }
  const even = border.filter((p) => dist(data, p * 4, bg) < tol).length / border.length
  if (even < 0.72) {
    notes.push('The background is not plain enough to remove automatically; use a photo on a plain background or a transparent PNG.')
    return { image: null, method: 'none', confidence: 0, fillsFrame: true, notes }
  }

  // 3. Flood-fill the background from the border.
  const background = new Uint8Array(w * h)
  const queue = new Int32Array(w * h)
  let head = 0
  let tail = 0
  for (const p of border) {
    if (!background[p] && dist(data, p * 4, bg) < tol) {
      background[p] = 1
      queue[tail++] = p
    }
  }
  while (head < tail) {
    const p = queue[head++]
    const x = p % w
    const y = (p - x) / w
    const n = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]
    for (const q of n) {
      if (q >= 0 && !background[q] && dist(data, q * 4, bg) < tol) {
        background[q] = 1
        queue[tail++] = q
      }
    }
  }

  const fg = new Uint8Array(w * h)
  for (let p = 0; p < w * h; p++) fg[p] = background[p] ? 0 : 1
  const parts = keepMainComponents(fg, w, h)
  const area = fg.reduce((s, v) => s + v, 0) / (w * h)
  if (area < 0.02) {
    notes.push('Almost nothing was left after removing the background.')
    return { image: null, method: 'none', confidence: 0, fillsFrame: false, notes }
  }
  if (area > 0.94) {
    notes.push('The product fills the whole photo, so no background could be found.')
    return { image: null, method: 'none', confidence: 0, fillsFrame: true, notes }
  }
  // a real background surrounds the product; when what is left still touches three edges, the
  // "background" was the product's own colour (a box photographed edge to edge)
  let fx0 = w
  let fy0 = h
  let fx1 = -1
  let fy1 = -1
  for (let p = 0; p < w * h; p++) {
    if (!fg[p]) continue
    const x = p % w
    const y = (p - x) / w
    if (x < fx0) fx0 = x
    if (x > fx1) fx1 = x
    if (y < fy0) fy0 = y
    if (y > fy1) fy1 = y
  }
  const touches = Number(fx0 <= 1) + Number(fy0 <= 1) + Number(fx1 >= w - 2) + Number(fy1 >= h - 2)
  if (touches >= 3) {
    notes.push('The product seems to fill the whole photo; the background could not be told apart from it.')
    return { image: null, method: 'none', confidence: 0, fillsFrame: true, notes }
  }
  if (parts > 3) notes.push(`The photo shows ${parts} separate objects; check that only the product is kept.`)

  // 4. Soft edges: background pixels next to the product fade with their colour distance.
  const out = createRaster(w, h)
  out.data.set(data)
  for (let p = 0; p < w * h; p++) {
    let a = 255
    if (!fg[p]) {
      const x = p % w
      const y = (p - x) / w
      const touches = (x > 0 && fg[p - 1]) || (x < w - 1 && fg[p + 1]) || (y > 0 && fg[p - w]) || (y < h - 1 && fg[p + w])
      a = touches ? Math.round(255 * Math.min(1, Math.max(0, (dist(data, p * 4, bg) - tol * 0.35) / tol))) : 0
    }
    out.data[p * 4 + 3] = Math.min(data[p * 4 + 3], a)
  }

  const box = alphaBounds(out, 128)!
  const pad = 2
  const confidence = Math.min(0.9, 0.55 + (even - 0.72) * 1.2) * (parts > 3 ? 0.8 : 1)
  return {
    image: crop(out, box.x0 - pad, box.y0 - pad, box.width + pad * 2, box.height + pad * 2),
    method: 'flood',
    confidence,
    fillsFrame: false,
    notes,
  }
}
