import type { Product, Variant } from './types'

/** Resolves catalog image paths: absolute URLs pass through, relative ones live under the app base. */
export function assetUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (/^(https?:|data:|blob:)/.test(path)) return path
  return import.meta.env.BASE_URL + path.replace(/^\//, '')
}

/** The packshot to show for a product, or for one of its shades. */
export function productImage(product: Product, variant?: Variant | null) {
  return variant?.image || product.image
}
