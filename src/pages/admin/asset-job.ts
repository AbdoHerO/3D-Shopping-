/**
 * The admin's product-to-3D job: runs the shared preparation (src/lib/product-assets) on a saved
 * product's original photo, stores the prepared picture, records the asset and places the product
 * on a shelf. It never blocks saving: the product exists first, the job only enriches it, and a
 * failure is recorded on the product (with the reason) so it can be retried.
 */
import { autoPlace } from '@/lib/auto-placement'
import { createLayout } from '@/lib/layout'
import { decodeBlob, encodeWebp, sniffBlobType } from '@/lib/product-assets/browser'
import { configuredProvider } from '@/lib/product-assets/model-provider'
import { emptyAsset, prepareProductImage, prepareVariantImage, validateRaster, validateUpload } from '@/lib/product-assets/prepare'
import type { Catalog, Product, ProductAsset } from '@/lib/types'
import { adminApi } from './api'

export type JobPhase = 'image' | 'model' | 'placing'

async function loadChecked(ref: string) {
  const blob = await adminApi.readOriginal(ref)
  const type = await sniffBlobType(blob)
  const invalid = validateUpload({ type, size: blob.size })
  if (invalid) throw new Error(invalid)
  const raster = await decodeBlob(blob)
  const tooSmall = validateRaster(raster)
  if (tooSmall) throw new Error(tooSmall)
  return raster
}

export async function prepareProductAsset(product: Product, catalog: Catalog, onPhase: (phase: JobPhase) => void = () => {}): Promise<Product> {
  const asset: ProductAsset = { ...emptyAsset(), ...(product.asset ?? {}) }
  const stamp = new Date().toISOString()
  const ref = asset.original ?? product.image
  if (!ref) return { ...product, asset: { ...asset, version: asset.version + 1, status: 'failed', error: 'Add a photo of the product first.', updatedAt: stamp } }
  try {
    onPhase('image')
    const raster = await loadChecked(ref)
    const measured = asset.dimsEstimated === false ? { widthCm: product.widthCm, heightCm: product.heightCm, depthCm: product.depthCm } : null
    const out = prepareProductImage({
      image: raster,
      product: { categoryId: product.categoryId, name: `${product.name.fr} ${product.name.en}`, brand: product.brand, sizeLabel: product.sizeLabel },
      family: asset.familySource === 'manual' ? product.shape : null,
      dims: measured,
    })
    const image = await adminApi.uploadImage(await encodeWebp(out.display), product.slug || product.id)

    // shade photos: same cut-out, uploaded once per new original
    const variants = { ...(asset.variants ?? {}) }
    const nextVariants = []
    for (const v of product.variants) {
      const vRef = variants[v.id]?.original
      if (!vRef || variants[v.id]?.cutout) {
        nextVariants.push(v)
        continue
      }
      const vr = prepareVariantImage(await loadChecked(vRef))
      const url = await adminApi.uploadImage(await encodeWebp(vr.display), `${product.slug}-${v.id}`)
      variants[v.id] = { original: vRef, cutout: vr.hasCutout ? url : null, color: vr.color }
      nextVariants.push({ ...v, image: url })
    }

    onPhase('model')
    // Optional generated model: only when a provider is configured (none is in this project).
    const provider = configuredProvider()
    const model = provider ? asset.model : { source: 'procedural' as const, url: null, provider: null, jobId: null }

    let next: Product = {
      ...product,
      shape: out.family,
      ...(out.dimsEstimated ? out.dims : {}),
      image,
      variants: nextVariants,
    }
    const notes = [...out.notes]
    let status = out.status
    if (!next.placement && next.isActive) {
      onPhase('placing')
      const layout = createLayout(catalog.settings.store)
      const others = catalog.products.filter((p) => p.id !== product.id && p.isActive && p.placement)
      const placement = autoPlace(next, others, layout)
      if (placement) next = { ...next, placement }
      else {
        notes.push('No room on a suitable shelf: place it by hand in Admin → Shelves.')
        status = 'review'
      }
    }
    return {
      ...next,
      asset: {
        ...asset,
        version: asset.version + 1,
        status,
        error: null,
        updatedAt: stamp,
        familySource: out.familySource,
        original: ref,
        cutout: out.hasCutout ? image : null,
        profile: out.profile,
        color: out.color,
        dimsEstimated: out.dimsEstimated,
        model,
        review: status === 'review' ? 'needed' : asset.review === 'approved' ? 'approved' : 'none',
        notes,
        variants,
      },
    }
  } catch (e) {
    return {
      ...product,
      asset: { ...asset, version: asset.version + 1, status: 'failed', error: e instanceof Error ? e.message : String(e), updatedAt: stamp },
    }
  }
}
