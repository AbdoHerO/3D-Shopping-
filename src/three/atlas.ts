/**
 * Packs product packshots into a few 2048² textures so every product on every shelf renders in
 * one draw call per page. Images are scaled to a common density (px per cm), keeping relative
 * sizes, and packed row by row. Textures are uploaded premultiplied and un-premultiplied in the
 * shader, so mipmaps never produce dark halos around cut-out edges.
 */
import * as THREE from 'three'

export interface AtlasEntry {
  key: string
  url: string
  widthCm: number
  heightCm: number
}

export interface AtlasRegion {
  page: number
  /** uv offset and scale: uv' = uv * scale + offset */
  offset: [number, number]
  scale: [number, number]
}

export interface Atlas {
  pages: THREE.CanvasTexture[]
  regions: Map<string, AtlasRegion>
}

const SIZE = 2048
const PAD = 4

async function decode(url: string, w: number, h: number): Promise<CanvasImageSource | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    if ('createImageBitmap' in window) {
      return await createImageBitmap(blob, { resizeWidth: w, resizeHeight: h, resizeQuality: 'high' })
    }
    const img = new Image()
    img.src = URL.createObjectURL(blob)
    await img.decode()
    return img
  } catch {
    return null
  }
}

export async function buildAtlas(entries: AtlasEntry[], pxPerCm = 20, maxHeight = 460): Promise<Atlas> {
  const sized = entries.map((e) => {
    let w = Math.max(4, Math.round(e.widthCm * pxPerCm))
    let h = Math.max(4, Math.round(e.heightCm * pxPerCm))
    const k = Math.min(1, maxHeight / h, (SIZE - 2 * PAD) / w)
    w = Math.round(w * k)
    h = Math.round(h * k)
    return { ...e, w, h }
  })
  // tallest first gives tight rows
  sized.sort((a, b) => b.h - a.h)

  const images = await Promise.all(sized.map((e) => decode(e.url, e.w, e.h)))

  const pages: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }[] = []
  const regions = new Map<string, AtlasRegion>()
  const newPage = () => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = SIZE
    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingQuality = 'high'
    pages.push({ canvas, ctx })
  }
  newPage()
  let x = PAD
  let y = PAD
  let rowH = 0
  sized.forEach((e, i) => {
    if (x + e.w + PAD > SIZE) {
      x = PAD
      y += rowH + PAD
      rowH = 0
    }
    if (y + e.h + PAD > SIZE) {
      newPage()
      x = PAD
      y = PAD
      rowH = 0
    }
    const page = pages.length - 1
    const img = images[i]
    if (img) pages[page].ctx.drawImage(img, x, y, e.w, e.h)
    else {
      // missing image: a soft placeholder silhouette keeps the shelf readable
      const g = pages[page].ctx
      g.fillStyle = '#e8cfd3'
      g.beginPath()
      g.roundRect(x + 1, y + 1, e.w - 2, e.h - 2, Math.min(e.w, e.h) * 0.15)
      g.fill()
    }
    // canvas textures are uploaded with flipY, so v grows upward from the canvas bottom
    regions.set(e.key, {
      page,
      offset: [x / SIZE, 1 - (y + e.h) / SIZE],
      scale: [e.w / SIZE, e.h / SIZE],
    })
    x += e.w + PAD
    rowH = Math.max(rowH, e.h)
    if (img && 'close' in img) (img as ImageBitmap).close()
  })

  const textures = pages.map(({ canvas }) => {
    const t = new THREE.CanvasTexture(canvas)
    t.colorSpace = THREE.SRGBColorSpace
    t.premultiplyAlpha = true
    t.anisotropy = 8
    t.generateMipmaps = true
    t.minFilter = THREE.LinearMipmapLinearFilter
    t.needsUpdate = true
    return t
  })
  return { pages: textures, regions }
}
