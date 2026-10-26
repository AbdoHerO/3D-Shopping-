import type { WorldFacing } from './facings'

/** Where every product card currently stands in the world (written by <Products>). */
export const productRegistry = {
  facings: [] as WorldFacing[],
}

/** The front-row facing of a product (or of one of its shades), preferring shelves over windows. */
export function findFacing(productId: string, variantId?: string | null): WorldFacing | null {
  const list = productRegistry.facings.filter((f) => f.productId === productId)
  const onShelf = list.filter((f) => f.fixtureId)
  const pool = onShelf.length ? onShelf : list
  if (variantId) {
    const exact = pool.find((f) => f.variantId === variantId)
    if (exact) return exact
  }
  return pool[Math.floor((pool.length - 1) / 2)] ?? null
}
