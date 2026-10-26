/** A decoded RGBA image, independent of canvas or sharp so the pipeline runs in both. */
export interface RasterImage {
  width: number
  height: number
  /** RGBA, 4 bytes per pixel, row-major from the top-left. */
  data: Uint8ClampedArray
}

export function createRaster(width: number, height: number): RasterImage {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) }
}

/** Nearest-neighbour-free box downscale so the longest side is at most `max` pixels. */
export function downscale(img: RasterImage, max: number): RasterImage {
  const k = Math.min(1, max / Math.max(img.width, img.height))
  if (k >= 1) return img
  const w = Math.max(1, Math.round(img.width * k))
  const h = Math.max(1, Math.round(img.height * k))
  const out = createRaster(w, h)
  const sx = img.width / w
  const sy = img.height / h
  for (let y = 0; y < h; y++) {
    const y0 = Math.floor(y * sy)
    const y1 = Math.max(y0 + 1, Math.floor((y + 1) * sy))
    for (let x = 0; x < w; x++) {
      const x0 = Math.floor(x * sx)
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) * sx))
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      let n = 0
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const i = (yy * img.width + xx) * 4
          const al = img.data[i + 3]
          // premultiplied average keeps cut-out edges clean
          r += img.data[i] * al
          g += img.data[i + 1] * al
          b += img.data[i + 2] * al
          a += al
          n++
        }
      }
      const o = (y * w + x) * 4
      out.data[o] = a ? r / a : 0
      out.data[o + 1] = a ? g / a : 0
      out.data[o + 2] = a ? b / a : 0
      out.data[o + 3] = a / n
    }
  }
  return out
}

export function crop(img: RasterImage, x0: number, y0: number, w: number, h: number): RasterImage {
  const out = createRaster(w, h)
  for (let y = 0; y < h; y++) {
    const sy = y0 + y
    if (sy < 0 || sy >= img.height) continue
    for (let x = 0; x < w; x++) {
      const sx = x0 + x
      if (sx < 0 || sx >= img.width) continue
      const i = (sy * img.width + sx) * 4
      const o = (y * w + x) * 4
      out.data[o] = img.data[i]
      out.data[o + 1] = img.data[i + 1]
      out.data[o + 2] = img.data[i + 2]
      out.data[o + 3] = img.data[i + 3]
    }
  }
  return out
}

/** Bounding box of pixels with alpha ≥ `threshold`, or null when the image is empty. */
export function alphaBounds(img: RasterImage, threshold = 128) {
  let x0 = img.width
  let y0 = img.height
  let x1 = -1
  let y1 = -1
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (img.data[(y * img.width + x) * 4 + 3] >= threshold) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1, width: x1 - x0 + 1, height: y1 - y0 + 1 }
}

export function toHex(r: number, g: number, b: number) {
  const h = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
}
