// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { FAMILIES, normaliseFamily, PACKAGE_FAMILIES, profileFor, resampleProfile, ringShape } from '@/lib/packaging'
import { removeBackground } from '@/lib/product-assets/cutout'
import { estimateDimensions, inferFamily, parseVolume } from '@/lib/product-assets/infer'
import { prepareProductImage, validateRaster, validateUpload } from '@/lib/product-assets/prepare'
import { createRaster, type RasterImage } from '@/lib/product-assets/raster'
import { measureSilhouette } from '@/lib/product-assets/silhouette'
import { runGeneration, validateGlb, type ModelProvider } from '@/lib/product-assets/model-provider'

type Paint = (x: number, y: number) => [number, number, number, number] | null

/** Draws a synthetic photo: `paint` returns a product pixel or null for background. */
function photo(w: number, h: number, paint: Paint, background: (x: number, y: number) => [number, number, number, number] = () => [255, 255, 255, 255]): RasterImage {
  const img = createRaster(w, h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = paint(x, y) ?? background(x, y)
      img.data.set(c, (y * w + x) * 4)
    }
  }
  return img
}

/** A perfume bottle: wide body, narrow neck, a cap on top; centred in a 200×300 frame. */
const bottle: Paint = (x, y) => {
  const cx = 100
  if (y >= 120 && y < 270 && Math.abs(x - cx) < 60) return [220, 120, 150, 255] // body
  if (y >= 95 && y < 120 && Math.abs(x - cx) < 16) return [200, 190, 180, 255] // neck
  if (y >= 50 && y < 95 && Math.abs(x - cx) < 30) return [40, 30, 35, 255] // cap
  return null
}

describe('package families', () => {
  it('has every family the brief lists, each with a usable spec', () => {
    for (const f of ['perfume-rect', 'perfume-cylinder', 'perfume-neck', 'bottle-pump', 'bottle-squeeze', 'bottle-flip-top', 'jar-low', 'jar-lid', 'lipstick', 'lip-gloss', 'mascara', 'foundation-bottle', 'foundation-tube', 'compact', 'palette', 'nail-polish', 'box-carton', 'box-perfume', 'box-flat', 'box-gift-set', 'spray-bottle', 'aerosol', 'roll-on', 'tube', 'accessory'])
      expect(PACKAGE_FAMILIES).toContain(f)
    for (const f of PACKAGE_FAMILIES) {
      const s = FAMILIES[f]
      expect(s.template.length, f).toBeGreaterThanOrEqual(4)
      expect(s.dims.every((v) => v > 0), f).toBe(true)
    }
  })

  it('upgrades the first shape names and turns unknown ones into a card', () => {
    expect(normaliseFamily('perfume')).toBe('perfume-neck')
    expect(normaliseFamily('polish')).toBe('nail-polish')
    expect(normaliseFamily('lipstick')).toBe('lipstick')
    expect(normaliseFamily('teapot')).toBe('card')
  })

  it('uses the measured silhouette only for families that follow photos', () => {
    const measured = [0.5, 1, 1, 0.3]
    expect(profileFor('perfume-neck', measured)).toEqual([0.5, 1, 1, 0.3])
    expect(profileFor('box-carton', measured)).toEqual(FAMILIES['box-carton'].template.map(() => 1))
    expect(resampleProfile([0, 1], 3)).toEqual([0, 0.5, 1])
  })

  it('makes necks round and keeps a flat body as deep as the product', () => {
    const spec = FAMILIES['perfume-rect']
    const body = ringShape(spec, 1, 0.08, 0.036)
    const neck = ringShape(spec, 0.3, 0.08, 0.036)
    expect(body.b).toBeCloseTo(0.018)
    expect(neck.n).toBeCloseTo(2)
    expect(neck.a).toBeCloseTo(neck.b)
  })
})

describe('cut-out', () => {
  it('removes a plain white background and keeps light areas inside the product', () => {
    const img = photo(200, 300, (x, y) => (y >= 150 && y < 170 && Math.abs(x - 100) < 40 ? [252, 252, 252, 255] : bottle(x, y)))
    const r = removeBackground(img)
    expect(r.method).toBe('flood')
    expect(r.image).not.toBeNull()
    const cut = r.image!
    // tight crop around the bottle (120 wide, 220 tall) plus a 2 px margin
    expect(cut.width).toBeCloseTo(123, -1)
    expect(cut.height).toBeCloseTo(224, -1)
    // the white label inside the body stays opaque
    const label = ((158 - 48) * cut.width + 62) * 4 + 3
    expect(cut.data[label]).toBe(255)
  })

  it('trusts the alpha channel of a cut-out PNG', () => {
    const img = photo(200, 300, bottle, () => [0, 0, 0, 0])
    expect(removeBackground(img).method).toBe('alpha')
  })

  it('refuses a busy background instead of guessing', () => {
    const noise = (x: number, y: number): [number, number, number, number] => [(x * 37 + y * 11) % 255, (x * 7 + y * 53) % 255, (x * y) % 255, 255]
    const r = removeBackground(photo(200, 300, bottle, noise))
    expect(r.image).toBeNull()
    expect(r.notes.join(' ')).toMatch(/coloured background|not plain/)
  })

  it('does not eat a box photographed edge to edge', () => {
    // a cream carton filling the frame with a darker logo band: the border colour is the box itself
    const box = photo(160, 240, (x, y) => (y > 90 && y < 130 && x > 20 && x < 140 ? [90, 60, 40, 255] : [236, 226, 210, 255]))
    const r = removeBackground(box)
    expect(r.image).toBeNull()
    expect(r.fillsFrame).toBe(true)
  })
})

describe('silhouette and family', () => {
  const cut = removeBackground(photo(200, 300, bottle)).image!
  const s = measureSilhouette(cut)!

  it('measures a narrow neck near the top and the body colour', () => {
    expect(s.profile[2]).toBeGreaterThan(0.95)
    expect(s.topNarrowest).toBeLessThan(0.35)
    expect(s.color).toBe('#dc7896')
  })

  it('reads the package type from French and English names', () => {
    expect(inferFamily({ categoryId: 'makeup', name: 'Rouge à lèvres satiné' }, null).family).toBe('lipstick')
    expect(inferFamily({ categoryId: 'makeup', name: 'Gloss repulpant' }, null).family).toBe('lip-gloss')
    expect(inferFamily({ categoryId: 'makeup', name: 'Mascara volume' }, null).family).toBe('mascara')
    expect(inferFamily({ categoryId: 'nails', name: 'Vernis effet gel' }, null).family).toBe('nail-polish')
    expect(inferFamily({ categoryId: 'makeup', name: 'Palette nude' }, null).family).toBe('palette')
    // a rectangular body with a neck and cap: the rectangular perfume family
    expect(inferFamily({ categoryId: 'perfume', name: 'Eau de parfum Rose' }, s).family).toBe('perfume-rect')
    expect(inferFamily({ categoryId: 'perfume', name: 'Eau de parfum Rose' }, null).family).toBe('perfume-neck')
    const low = inferFamily({ categoryId: 'skin', name: 'Produit mystère' }, null)
    expect(low.family).toBe('jar-lid')
    expect(low.confidence).toBeLessThan(0.6)
  })

  it('estimates a size from the label volume and the photo proportions', () => {
    expect(parseVolume('50 / 100 ml')).toEqual({ value: 50, unit: 'ml' })
    expect(parseVolume('4,2 g')).toEqual({ value: 4.2, unit: 'g' })
    const big = estimateDimensions('perfume-rect', '100 ml', s.aspect)
    const small = estimateDimensions('perfume-rect', '30 ml', s.aspect)
    expect(small.heightCm).toBeLessThan(big.heightCm)
    expect(big.heightCm / big.widthCm).toBeCloseTo(s.aspect, 1)
  })
})

describe('preparation', () => {
  it('validates uploads by type, size and pixel size', () => {
    expect(validateUpload({ type: 'image/gif', size: 5000 })).toMatch(/Unsupported/)
    expect(validateUpload({ type: 'image/png', size: 20 * 1024 * 1024 })).toMatch(/limit is 15 MB/)
    expect(validateUpload({ type: 'image/webp', size: 5000 })).toBeNull()
    expect(validateRaster({ width: 60, height: 80 })).toMatch(/at least 120/)
    expect(validateRaster({ width: 40, height: 400 })).toBeNull()
  })

  it('prepares a clean photo as ready, with an estimated size', () => {
    const out = prepareProductImage({ image: photo(200, 300, bottle), product: { categoryId: 'perfume', name: 'Eau de parfum Rose', sizeLabel: '50 ml' } })
    expect(out.hasCutout).toBe(true)
    expect(out.family).toBe('perfume-rect')
    expect(out.dimsEstimated).toBe(true)
    expect(out.status).toBe('ready')
  })

  it('keeps an admin choice and flags a busy photo for review as a card', () => {
    const noise = (x: number, y: number): [number, number, number, number] => [(x * 37 + y * 11) % 255, (x * 7 + y * 53) % 255, (x * y) % 255, 255]
    const out = prepareProductImage({
      image: photo(200, 300, bottle, noise),
      product: { categoryId: 'perfume', name: 'Eau de parfum' },
      family: 'perfume-rect',
      dims: { widthCm: 8, heightCm: 12, depthCm: 4 },
    })
    expect(out.family).toBe('perfume-rect')
    expect(out.familySource).toBe('manual')
    expect(out.hasCutout).toBe(false)
    expect(out.status).toBe('review')
    expect(out.dims).toEqual({ widthCm: 8, heightCm: 12, depthCm: 4 })
  })

  it('uses an edge-to-edge box photo as the box front', () => {
    const box = photo(160, 240, (x, y) => (y > 90 && y < 130 && x > 20 && x < 140 ? [90, 60, 40, 255] : [236, 226, 210, 255]))
    const out = prepareProductImage({ image: box, product: { categoryId: 'perfume', name: 'Coffret cadeau' } })
    expect(out.family).toBe('box-gift-set')
    expect(out.hasCutout).toBe(true)
    expect(out.alreadyCutout).toBe(true)
  })
})

describe('optional image-to-3D provider', () => {
  const glb = () => {
    const buf = new ArrayBuffer(24)
    const v = new DataView(buf)
    v.setUint32(0, 0x46546c67, true)
    v.setUint32(4, 2, true)
    v.setUint32(8, 24, true)
    return buf
  }
  const fake = (polls: Awaited<ReturnType<ModelProvider['poll']>>[], file = glb()): ModelProvider => ({
    id: 'fake',
    label: 'Fake',
    submit: async () => ({ provider: 'fake', jobId: 'j1' }),
    poll: async () => polls.shift() ?? { status: 'running' },
    fetchModel: async () => file,
  })
  const input = { productId: 'p', imageUrl: 'https://x/y.webp', family: 'lipstick' as const, dimsCm: [2, 8, 2] as [number, number, number] }
  const now = { sleep: async () => {} }

  it('validates GLB files', () => {
    expect(validateGlb(glb())).toBeNull()
    expect(validateGlb(new ArrayBuffer(24))).toMatch(/magic/)
  })

  it('tracks a job to a validated model', async () => {
    const r = await runGeneration(fake([{ status: 'running' }, { status: 'done', modelUrl: 'https://x/m.glb' }]), input, now)
    expect(r.status).toBe('done')
    expect(r.modelUrl).toBe('https://x/m.glb')
  })

  it('reports failures, invalid files and timeouts without throwing', async () => {
    expect((await runGeneration(fake([{ status: 'failed', error: 'quota' }]), input, now)).error).toBe('quota')
    expect((await runGeneration(fake([{ status: 'done', modelUrl: 'u' }], new ArrayBuffer(30)), input, now)).status).toBe('failed')
    expect((await runGeneration(fake([]), input, { ...now, intervalMs: 10, timeoutMs: 30 })).status).toBe('timeout')
  })
})
