/** Measures a cut-out's outline: the width profile the 3D model is swept from, and shape cues. */
import { alphaBounds, toHex, type RasterImage } from './raster'

export interface Silhouette {
  /** Width of the opaque outline at `samples` heights, bottom → top, relative to the widest row. */
  profile: number[]
  /** Height / width of the outline's bounding box. */
  aspect: number
  /** Opaque area / bounding-box area: 1 for a box seen from the front. */
  fill: number
  /** How constant the profile is (standard deviation); ~0 for boxes and straight cylinders. */
  spread: number
  /** Narrowest relative width in the top quarter (necks, pumps, caps). */
  topNarrowest: number
  /** Packaging colour from the middle of the body (for the sides and back of the model). */
  color: string
}

const median3 = (a: number, b: number, c: number) => Math.max(Math.min(a, b), Math.min(Math.max(a, b), c))

export function measureSilhouette(img: RasterImage, samples = 32): Silhouette | null {
  const box = alphaBounds(img, 128)
  if (!box || box.width < 4 || box.height < 4) return null
  const { width: W, data } = img
  const rowWidth = (y: number) => {
    let left = -1
    let right = -1
    for (let x = box.x0; x <= box.x1; x++) {
      if (data[(y * W + x) * 4 + 3] >= 128) {
        if (left < 0) left = x
        right = x
      }
    }
    return left < 0 ? 0 : right - left + 1
  }
  // average the row widths within each band (bottom → top)
  const raw: number[] = []
  for (let i = 0; i < samples; i++) {
    const yTop = box.y1 - Math.floor(((i + 1) * box.height) / samples) + 1
    const yBottom = box.y1 - Math.floor((i * box.height) / samples)
    let sum = 0
    let n = 0
    for (let y = Math.max(box.y0, yTop); y <= yBottom; y++) {
      sum += rowWidth(y)
      n++
    }
    raw.push(n ? sum / n : 0)
  }
  const smooth = raw.map((v, i) => median3(raw[Math.max(0, i - 1)], v, raw[Math.min(raw.length - 1, i + 1)]))
  const max = Math.max(...smooth, 1)
  const profile = smooth.map((v) => Math.round((v / max) * 1000) / 1000)

  let area = 0
  const rs: number[] = []
  const gs: number[] = []
  const bs: number[] = []
  const bodyFrom = box.y0 + Math.floor(box.height * 0.3)
  const bodyTo = box.y0 + Math.floor(box.height * 0.75)
  for (let y = box.y0; y <= box.y1; y++) {
    for (let x = box.x0; x <= box.x1; x++) {
      const i = (y * W + x) * 4
      if (data[i + 3] < 128) continue
      area++
      if (y >= bodyFrom && y <= bodyTo && (x + y) % 3 === 0) {
        rs.push(data[i])
        gs.push(data[i + 1])
        bs.push(data[i + 2])
      }
    }
  }
  const med = (v: number[]) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)] ?? 200
  const mean = profile.reduce((s, v) => s + v, 0) / profile.length
  const spread = Math.sqrt(profile.reduce((s, v) => s + (v - mean) ** 2, 0) / profile.length)
  const topQuarter = profile.slice(Math.floor(samples * 0.75))
  return {
    profile,
    aspect: box.height / box.width,
    fill: area / (box.width * box.height),
    spread,
    topNarrowest: Math.min(...topQuarter),
    color: toHex(med(rs), med(gs), med(bs)),
  }
}
