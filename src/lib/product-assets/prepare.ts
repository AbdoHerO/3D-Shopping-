/**
 * The shared product-to-3D preparation, used by the admin (browser) and the import scripts (Node):
 * validate → cut out → measure the silhouette → choose the package family → size → status.
 * Pure: takes decoded pixels and returns pixels and metadata; adapters handle files and storage.
 */
import { FAMILIES, type PackageFamily } from '../packaging'
import type { AssetStatus, ProductAsset } from '../types'
import { removeBackground } from './cutout'
import { estimateDimensions, inferFamily } from './infer'
import { downscale, type RasterImage } from './raster'
import { measureSilhouette } from './silhouette'

/** Families whose front is a plain rectangle: an opaque, edge-to-edge photo is a valid front. */
const FLAT_FRONT = new Set<string>(['box', 'palette', 'card'])

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024
/** The longest side must reach this; thin products (pencils) may be narrow. */
export const MIN_SIDE = 120
export const MIN_SHORT_SIDE = 16
export const MAX_SIDE = 12000
/** Longest side of the image stored for the shop and drawn on the shelves. */
export const DISPLAY_SIDE = 900

/** Checks a file before decoding it. Returns an English error message or null. */
export function validateUpload(file: { type: string; size: number }): string | null {
  if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) return `Unsupported file type ${file.type || 'unknown'}: use JPEG, PNG, WebP or AVIF.`
  if (file.size > MAX_UPLOAD_BYTES) return `The file is ${(file.size / 1048576).toFixed(1)} MB; the limit is 15 MB.`
  if (file.size < 200) return 'The file is too small to be a product photo.'
  return null
}

/** Checks decoded pixel dimensions. */
export function validateRaster(img: { width: number; height: number }): string | null {
  if (Math.max(img.width, img.height) < MIN_SIDE || Math.min(img.width, img.height) < MIN_SHORT_SIDE)
    return `The photo is ${img.width}×${img.height} px; it needs at least ${MIN_SIDE} px on its longest side.`
  if (img.width > MAX_SIDE || img.height > MAX_SIDE) return `The photo is ${img.width}×${img.height} px; the limit is ${MAX_SIDE} px per side.`
  return null
}

export interface PrepareInput {
  image: RasterImage
  product: { categoryId: string; name: string; brand?: string; sizeLabel?: string }
  /** Family chosen by the admin (kept as is). */
  family?: PackageFamily | null
  /** Real size in cm when measured; otherwise estimated from the family and the photo. */
  dims?: { widthCm: number; heightCm: number; depthCm: number } | null
}

export interface PrepareOutput {
  /** What the shop shows and the shelves use: the cut-out when there is one, else the resized photo. */
  display: RasterImage
  hasCutout: boolean
  cutoutMethod: 'alpha' | 'flood' | 'none'
  /** The input already was a tight cut-out: no new file is needed. */
  alreadyCutout: boolean
  family: PackageFamily
  familySource: 'auto' | 'manual'
  profile: number[] | null
  color: string | null
  dims: { widthCm: number; heightCm: number; depthCm: number }
  dimsEstimated: boolean
  status: Extract<AssetStatus, 'ready' | 'review'>
  notes: string[]
}

export function prepareProductImage(input: PrepareInput): PrepareOutput {
  const notes: string[] = []
  const working = downscale(input.image, 1400)
  let cut = removeBackground(working)
  let silhouette = cut.image ? measureSilhouette(cut.image) : null

  let guess = inferFamily(input.product, silhouette)
  const manual = input.family ?? null
  const family = manual ?? guess.family
  // a box (or palette) photographed edge to edge: the whole photo is its front
  if (!cut.image && cut.fillsFrame && FLAT_FRONT.has(FAMILIES[family].group === 'box' ? 'box' : family)) {
    cut = { image: working, method: 'none', confidence: 0.8, fillsFrame: true, notes: [] }
    silhouette = measureSilhouette(working)
    if (!manual) guess = inferFamily(input.product, silhouette)
  }
  notes.push(...cut.notes)
  if (!manual && guess.confidence < 0.6) notes.push(`Package type guessed from ${guess.reason}; please confirm it.`)

  let dims = input.dims ?? null
  const dimsEstimated = !dims
  if (!dims) {
    dims = estimateDimensions(family, input.product.sizeLabel, silhouette?.aspect ?? null)
    notes.push('Size estimated from the package type and the photo; enter the real size in cm when you can.')
  } else if (silhouette && FAMILIES[family].fitPhoto && FAMILIES[family].orientation === 'upright') {
    const photo = silhouette.aspect
    const entered = dims.heightCm / dims.widthCm
    if (Math.abs(Math.log(photo / entered)) > Math.log(1.6)) {
      notes.push(`The photo is ${photo.toFixed(1)}× taller than wide but the size entered is ${entered.toFixed(1)}×; check width and height.`)
    }
  }

  if (!cut.image) notes.push('No clean cut-out: the product is shown as a flat photo card until a better photo is added.')
  if (cut.image && cut.confidence < 0.7) notes.push('Check the cut-out: the background was close to the product’s own colours.')
  const confident = cut.image && cut.confidence >= 0.7 && (manual || guess.confidence >= 0.6)
  const alreadyCutout =
    cut.image === working ||
    (cut.method === 'alpha' && !!cut.image && cut.image.width >= working.width * 0.97 && cut.image.height >= working.height * 0.97)
  return {
    display: downscale(cut.image ?? working, DISPLAY_SIDE),
    hasCutout: Boolean(cut.image),
    cutoutMethod: cut.method,
    alreadyCutout,
    family,
    familySource: manual ? 'manual' : 'auto',
    profile: silhouette?.profile ?? null,
    color: silhouette?.color ?? null,
    dims,
    dimsEstimated,
    // estimated sizes alone do not need a person; everything else uncertain does
    status: confident && notes.every((n) => n.startsWith('Size estimated')) ? 'ready' : 'review',
    notes,
  }
}

/** Shade photos: same cut-out, no family or size (the product's model is reused). */
export function prepareVariantImage(image: RasterImage) {
  const working = downscale(image, 1400)
  const cut = removeBackground(working)
  const silhouette = cut.image ? measureSilhouette(cut.image) : null
  const alreadyCutout = cut.method === 'alpha' && !!cut.image && cut.image.width >= working.width * 0.97 && cut.image.height >= working.height * 0.97
  return { display: downscale(cut.image ?? working, DISPLAY_SIDE), hasCutout: Boolean(cut.image), alreadyCutout, color: silhouette?.color ?? null, notes: cut.notes }
}

/** A fresh asset record (before any processing). */
export function emptyAsset(): ProductAsset {
  return {
    version: 0,
    status: 'pending',
    error: null,
    updatedAt: null,
    familySource: 'auto',
    original: null,
    cutout: null,
    profile: null,
    color: null,
    dimsEstimated: true,
    model: { source: 'procedural', url: null, provider: null, jobId: null },
    review: 'none',
    notes: [],
  }
}
