import * as THREE from 'three'
import { localToWorld, type Fixture, type StoreLayout } from '@/lib/layout'
import type { Orientation } from '@/lib/packaging'
import { layoutFixture, shelfItemsFor, type PlacedFacing, type ShelfItem } from '@/lib/shelf-layout'
import type { Product } from '@/lib/types'

/** One product model placed in the world. */
export interface WorldFacing {
  key: string
  productId: string
  variantId: string | null
  fixtureId: string | null
  u: number
  /** Bottom centre of the model (lying items: centre of their underside). */
  position: THREE.Vector3
  rotationY: number
  /** Model size in metres (real product size × display scale). */
  width: number
  height: number
  depth: number
  orientation: Orientation
}

export function imageKey(productId: string, variantId: string | null) {
  return variantId ? `${productId}:${variantId}` : productId
}

/** Window display cases show the featured products of their categories, filled level by level. */
function featuredItems(f: Fixture, products: Product[], categories: string[]): ShelfItem[] {
  const pool = products.filter(
    (p) => p.isActive && p.isFeatured && categories.includes(p.categoryId) && (p.variants.length ? p.variants.some((v) => v.stock > 0) : p.stock > 0),
  )
  if (pool.length === 0) return []
  const items: ShelfItem[] = []
  f.levels.forEach((y, level) => {
    const clearance = (f.levels[level + 1] ?? f.height) - y - 0.03
    const fits = pool.filter((p) => p.heightCm / 100 <= clearance && p.depthCm / 100 <= f.depth - 0.04)
    fits.forEach((p, i) => {
      const variantId = p.displayVariants ? (p.variants[(level + i) % p.variants.length]?.id ?? null) : null
      items.push({
        key: `${f.id}:${p.id}:${level}`,
        productId: p.id,
        variantId,
        widthM: p.widthCm / 100,
        heightM: p.heightCm / 100,
        depthM: p.depthCm / 100,
        level,
        slot: (i + level) % fits.length,
        facings: 1,
        autoFacings: true,
        orientation: 'upright',
      })
    })
  })
  return items
}

export function computeFacings(layout: StoreLayout, products: Product[]): WorldFacing[] {
  const out: WorldFacing[] = []
  const push = (f: Fixture, p: PlacedFacing) => {
    const flat = p.orientation === 'flat'
    // lying items: the shelf layout's height is their thickness and its depth their length
    const height = flat ? p.depthM : p.heightM
    const depth = flat ? p.heightM : p.depthM
    const z = f.levelZ?.[p.level] ?? f.productZ
    const position = flat ? localToWorld(f, p.u, p.y + depth / 2, z + height / 2) : localToWorld(f, p.u, p.y, z)
    out.push({
      key: p.key,
      productId: p.productId,
      variantId: p.variantId,
      fixtureId: f.id,
      u: p.u,
      position: new THREE.Vector3(...position),
      rotationY: f.rotationY,
      width: p.widthM,
      height,
      depth,
      orientation: p.orientation,
    })
  }
  for (const f of layout.fixtures) {
    const items = f.stock === 'shelf' ? shelfItemsFor(f, products) : featuredItems(f, products, f.stock.featured)
    const result = layoutFixture(f, items)
    for (const p of result.facings) push(f, p)
  }
  return out
}
