import * as THREE from 'three'
import { localToWorld, type Fixture, type StoreLayout } from '@/lib/layout'
import { layoutFixture, shelfItemsFor, type PlacedFacing } from '@/lib/shelf-layout'
import type { Product } from '@/lib/types'

/** A product card placed in the world. */
export interface WorldFacing {
  key: string
  productId: string
  variantId: string | null
  fixtureId: string | null
  u: number
  position: THREE.Vector3
  rotationY: number
  width: number
  height: number
  /** back rows are darker copies standing behind the front row */
  back: boolean
}

const BACK_OFFSET = 0.085

export function imageKey(productId: string, variantId: string | null) {
  return variantId ? `${productId}:${variantId}` : productId
}

export function computeFacings(layout: StoreLayout, products: Product[]): WorldFacing[] {
  const out: WorldFacing[] = []
  const push = (f: Fixture, p: PlacedFacing, back: boolean) => {
    const z = f.productZ - (back ? BACK_OFFSET : 0)
    out.push({
      key: p.key + (back ? ':b' : ''),
      productId: p.productId,
      variantId: p.variantId,
      fixtureId: f.id,
      u: p.u,
      position: new THREE.Vector3(...localToWorld(f, p.u, p.y, z)),
      rotationY: f.rotationY,
      width: p.widthM,
      height: p.heightM,
      back,
    })
  }
  for (const f of layout.fixtures) {
    const result = layoutFixture(f, shelfItemsFor(f, products))
    for (const p of result.facings) {
      push(f, p, false)
      const flat = p.depthM < 0.025
      if (!flat && f.productZ - BACK_OFFSET > 0.05 && f.kind !== 'counter') push(f, p, true)
    }
  }
  // featured products on the window podiums, facing the street
  const featured = products.filter(
    (p) => p.isActive && p.isFeatured && p.stock > 0 && !['box', 'palette', 'compact', 'pouch'].includes(p.shape),
  )
  layout.windowSpots.forEach((spot, i) => {
    const p = featured[i % Math.max(1, featured.length)]
    if (!p) return
    const variantId = p.displayVariants ? (p.variants[0]?.id ?? null) : null
    const scale = Math.min(1.6, 0.26 / Math.max(0.08, p.heightCm / 100))
    out.push({
      key: `window:${i}`,
      productId: p.id,
      variantId,
      fixtureId: null,
      u: 0,
      position: new THREE.Vector3(spot.x, spot.top, spot.z),
      rotationY: 0,
      width: (p.widthCm / 100) * scale,
      height: (p.heightCm / 100) * scale,
      back: false,
    })
  })
  return out
}

