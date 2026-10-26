/**
 * Runs the shared product-to-3D preparation (src/lib/product-assets) over a whole catalogue on disk
 * and places products on the shelves (src/lib/auto-placement). Used by `npm run assets:prepare`,
 * the demo catalogue generator and the product importer, so every product goes through the same
 * code as an upload in the admin.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { autoPlaceAll } from '../../src/lib/auto-placement'
import { createLayout } from '../../src/lib/layout'
import { FAMILIES, normaliseFamily } from '../../src/lib/packaging'
import { emptyAsset, prepareProductImage, prepareVariantImage, validateRaster, validateUpload } from '../../src/lib/product-assets/prepare'
import type { Catalog, Product } from '../../src/lib/types'
import { decodeImage, encodeWebp, sniffType } from './node-image'

export interface AssetReport {
  prepared: number
  ready: number
  review: number
  failed: number
  cutouts: number
  fallbacks: number
  placed: number
  unplaced: string[]
  details: { id: string; status: string; family: string; notes: string[] }[]
}

export interface PrepareOptions {
  /** Directory that relative image paths are resolved against (the app's `public/`). */
  publicDir: string
  /** Prepare again even when an asset already exists. */
  force?: boolean
  /** Only these product ids. */
  only?: Set<string>
  /** Re-place every product, not only unplaced ones (after a layout change). */
  replacePlacements?: boolean
  /** Treat the catalogue's sizes and package types as curated (the demo catalogue). */
  curated?: boolean
}

function readLocal(publicDir: string, path: string) {
  if (/^(https?:|data:|blob:|idb:)/.test(path)) return null
  const file = join(publicDir, path.replace(/^\//, ''))
  return existsSync(file) ? readFileSync(file) : null
}

async function prepareOne(p: Product, opts: PrepareOptions): Promise<Product> {
  const asset = { ...emptyAsset(), ...(p.asset ?? {}) }
  const originalPath = asset.original ?? p.image
  const buf = originalPath ? readLocal(opts.publicDir, originalPath) : null
  const stamp = new Date().toISOString()
  if (!buf) {
    return { ...p, asset: { ...asset, version: asset.version + 1, status: 'failed', error: `Image not found: ${originalPath || '(none)'}`, updatedAt: stamp } }
  }
  const type = sniffType(buf)
  const invalid = validateUpload({ type, size: buf.length })
  if (invalid) return { ...p, asset: { ...asset, version: asset.version + 1, status: 'failed', error: invalid, updatedAt: stamp } }
  const raster = await decodeImage(buf)
  const tooSmall = validateRaster(raster)
  if (tooSmall) return { ...p, asset: { ...asset, version: asset.version + 1, status: 'failed', error: tooSmall, updatedAt: stamp } }

  const legacy = normaliseFamily(p.shape)
  const manualFamily = asset.familySource === 'manual' && asset.version > 0 ? legacy : null
  const measured = opts.curated || asset.dimsEstimated === false ? { widthCm: p.widthCm, heightCm: p.heightCm, depthCm: p.depthCm } : null
  let out = prepareProductImage({
    image: raster,
    product: { categoryId: p.categoryId, name: `${p.name.fr} ${p.name.en}`, brand: p.brand, sizeLabel: p.sizeLabel },
    family: manualFamily,
    dims: measured,
  })
  // curated catalogues: keep the curated package type when the guess lands in another group
  if (opts.curated && FAMILIES[out.family].group !== FAMILIES[legacy].group) {
    out = prepareProductImage({ image: raster, product: { categoryId: p.categoryId, name: p.name.fr, sizeLabel: p.sizeLabel }, family: legacy, dims: measured })
  }

  // The original is never overwritten. A tight cut-out is used as is; otherwise the cut-out (or,
  // without one, an optimised copy for the card fallback) is written next to it.
  let image = originalPath
  if (out.hasCutout && !out.alreadyCutout) {
    image = `products/cutouts/${p.slug}.webp`
    mkdirSync(join(opts.publicDir, 'products/cutouts'), { recursive: true })
    writeFileSync(join(opts.publicDir, image), await encodeWebp(out.display))
  } else if (!out.hasCutout && (type !== 'image/webp' || raster.width > 900 || raster.height > 900)) {
    image = `products/display/${p.slug}.webp`
    mkdirSync(join(opts.publicDir, 'products/display'), { recursive: true })
    writeFileSync(join(opts.publicDir, image), await encodeWebp(out.display))
  }

  const variants: NonNullable<typeof asset.variants> = { ...(asset.variants ?? {}) }
  const nextVariants = []
  for (const v of p.variants) {
    const vPath = variants[v.id]?.original ?? v.image
    const vBuf = vPath ? readLocal(opts.publicDir, vPath) : null
    if (!vBuf) {
      nextVariants.push(v)
      continue
    }
    const vr = prepareVariantImage(await decodeImage(vBuf))
    let vImage = vPath!
    if (vr.hasCutout && !vr.alreadyCutout) {
      vImage = `products/cutouts/${p.slug}--${v.id}.webp`
      mkdirSync(join(opts.publicDir, 'products/cutouts'), { recursive: true })
      writeFileSync(join(opts.publicDir, vImage), await encodeWebp(vr.display))
    }
    variants[v.id] = { original: vPath ?? null, cutout: vr.hasCutout ? vImage : null, color: vr.color }
    nextVariants.push({ ...v, image: vImage })
  }

  return {
    ...p,
    shape: out.family,
    ...(out.dimsEstimated ? out.dims : {}),
    image,
    variants: nextVariants,
    asset: {
      ...asset,
      version: asset.version + 1,
      status: out.status,
      error: null,
      updatedAt: stamp,
      familySource: out.familySource,
      original: originalPath,
      cutout: out.hasCutout ? image : null,
      profile: out.profile,
      color: out.color,
      dimsEstimated: out.dimsEstimated,
      review: out.status === 'review' ? 'needed' : 'none',
      notes: out.notes,
      variants,
    },
  }
}

export async function prepareCatalog(catalog: Catalog, opts: PrepareOptions): Promise<{ catalog: Catalog; report: AssetReport }> {
  const report: AssetReport = { prepared: 0, ready: 0, review: 0, failed: 0, cutouts: 0, fallbacks: 0, placed: 0, unplaced: [], details: [] }
  const products: Product[] = []
  for (const p0 of catalog.products) {
    const p = { ...p0, shape: normaliseFamily(p0.shape) }
    const wanted = !opts.only || opts.only.has(p.id)
    if (!wanted || (!opts.force && p.asset && p.asset.version > 0)) {
      products.push(p)
      continue
    }
    const next = await prepareOne(p, opts)
    products.push(next)
    report.prepared++
  }

  const layout = createLayout(catalog.settings.store)
  const { placements, unplaced } = autoPlaceAll(products, layout, opts.replacePlacements)
  const placedProducts = products.map((p) => {
    const placement = placements.get(p.id) ?? null
    if (!p.isActive) return p
    if (!placement && p.asset) {
      const note = 'No room on a suitable shelf: place it by hand in Admin → Shelves.'
      return { ...p, placement: null, asset: { ...p.asset, status: p.asset.status === 'failed' ? 'failed' : 'review', review: 'needed', notes: [...p.asset.notes.filter((n) => n !== note), note] } } as Product
    }
    return { ...p, placement }
  })
  report.placed = placedProducts.filter((p) => p.placement).length
  report.unplaced = unplaced

  for (const p of placedProducts) {
    if (!p.asset) continue
    if (opts.only && !opts.only.has(p.id)) continue
    report[p.asset.status === 'ready' ? 'ready' : p.asset.status === 'failed' ? 'failed' : 'review']++
    if (p.asset.cutout) report.cutouts++
    else report.fallbacks++
    report.details.push({ id: p.id, status: p.asset.status, family: p.shape, notes: p.asset.error ? [p.asset.error] : p.asset.notes })
  }
  return { catalog: { ...catalog, products: placedProducts }, report }
}

export function readCatalog(file: string): Catalog {
  return JSON.parse(readFileSync(file, 'utf8')) as Catalog
}

export function writeCatalog(file: string, catalog: Catalog) {
  writeFileSync(file, JSON.stringify(catalog, null, 1) + '\n')
}
