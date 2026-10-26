/**
 * Automatic shelf placement for new or imported products. Deterministic: the same catalogue and
 * room always give the same placements, so the scene is reproducible on reload. A product is only
 * placed where it fits under the shelf above and leaves the level without overflow; otherwise it
 * is left unplaced and flagged for manual placement.
 */
import type { Fixture, StoreLayout } from './layout'
import { FAMILIES, type PackageFamily } from './packaging'
import { layoutFixture, shelfItemsFor } from './shelf-layout'
import type { Placement, Product } from './types'

/** Fixture ids that suit a package family, best first (before the category's own fixtures). */
const BY_FAMILY: Partial<Record<PackageFamily, string[]>> = {
  'nail-polish': ['stand-nails', 'wall-makeup'],
  palette: ['counter', 'wall-makeup'],
  compact: ['counter', 'wall-makeup'],
  lipstick: ['wall-makeup', 'counter'],
  'lip-gloss': ['wall-makeup', 'counter'],
  mascara: ['wall-makeup', 'counter'],
  pencil: ['wall-makeup', 'counter'],
  'foundation-bottle': ['wall-makeup'],
  'foundation-tube': ['wall-makeup'],
  'perfume-rect': ['wall-perfume', 'wall-gifts'],
  'perfume-rounded': ['wall-perfume', 'wall-gifts'],
  'perfume-cylinder': ['wall-perfume', 'wall-gifts'],
  'perfume-neck': ['wall-perfume', 'wall-gifts'],
  'box-perfume': ['wall-perfume', 'wall-gifts'],
  'box-gift-set': ['wall-gifts', 'wall-skin'],
  accessory: ['counter', 'wall-body', 'wall-gifts'],
  pouch: ['counter', 'wall-gifts', 'wall-body'],
}

/** Fixtures reserved for one kind of product (the polish stand holds polish only). */
const RESERVED: Record<string, PackageFamily[]> = { 'stand-nails': ['nail-polish'] }

/** Where a category goes when its own fixture is reserved or full. */
const CATEGORY_FALLBACK: Record<string, string[]> = {
  nails: ['wall-body', 'wall-makeup'],
  accessories: ['counter', 'wall-gifts', 'wall-body'],
  makeup: ['wall-makeup', 'counter'],
  perfume: ['wall-perfume', 'wall-gifts'],
  hair: ['wall-hair', 'wall-body'],
  body: ['wall-body', 'wall-hair'],
  skin: ['wall-skin', 'wall-body'],
}

/** Fixtures worth trying for a product, best first. */
export function candidateFixtures(product: Pick<Product, 'shape' | 'categoryId'>, layout: StoreLayout): Fixture[] {
  const shelves = layout.fixtures.filter(
    (f) => f.stock === 'shelf' && (!RESERVED[f.id] || RESERVED[f.id].includes(product.shape)),
  )
  const ids = [
    ...(BY_FAMILY[product.shape] ?? []),
    ...shelves.filter((f) => f.categoryId === product.categoryId).map((f) => f.id),
    ...(CATEGORY_FALLBACK[product.categoryId] ?? []),
  ]
  const seen = new Set<string>()
  return ids
    .filter((id) => (seen.has(id) ? false : (seen.add(id), true)))
    .map((id) => shelves.find((f) => f.id === id))
    .filter((f): f is Fixture => Boolean(f))
}

/** Shelf height a product of this size is usually shown at. */
function preferredHeight(heightM: number) {
  if (heightM < 0.12) return 1.3
  if (heightM < 0.2) return 1.0
  return 0.55
}

/** Free height above a level: up to the next shelf, the glass of a vitrine, or the top of the unit. */
export function clearanceAt(f: Fixture, level: number) {
  const y = f.levels[level]
  const next = f.levels[level + 1]
  if (f.kind === 'counter') return level === 0 ? f.height - y - 0.03 : 0.4
  if (f.kind === 'nailStand') return 0.22
  return (next ?? f.height) - y - 0.025
}

function bayCapacity(f: Fixture, level: number) {
  return f.bays.filter((b) => b.levels.includes(level)).reduce((s, b) => s + (b.u1 - b.u0), 0)
}

/** Share of a level's width already used by its products at one facing each. */
export function levelFill(f: Fixture, products: Product[], level: number) {
  const cap = bayCapacity(f, level)
  if (cap <= 0) return Infinity
  const used = shelfItemsFor(f, products)
    .filter((it) => it.level === level)
    .reduce((s, it) => s + it.widthM + 0.012, 0)
  return used / cap
}

/**
 * Finds a placement for `product` among `others` (everything already in the shop). Returns null
 * when no suitable shelf has room; the caller flags the product for manual placement.
 */
export function autoPlace(product: Product, others: Product[], layout: StoreLayout): Placement | null {
  const spec = FAMILIES[product.shape]
  for (const f of candidateFixtures(product, layout)) {
    // lying flat only makes sense under the counter glass
    const orientation = spec.orientation === 'flat' && f.kind === 'counter' ? 'flat' : 'upright'
    const standing = orientation === 'flat' ? product.depthCm / 100 : product.heightCm / 100
    const reach = orientation === 'flat' ? product.heightCm / 100 : product.depthCm / 100
    if (reach > f.depth - 0.02) continue
    const options = f.levels
      .map((_, level) => level)
      .filter((level) => bayCapacity(f, level) > 0)
      .filter((level) => (orientation === 'flat' ? level === 0 || f.kind !== 'counter' : !(f.kind === 'counter' && level === 0)))
      .filter((level) => standing <= clearanceAt(f, level))
      // small items belong near eye level, big ones low down; then the emptiest level wins
      .map((level) => ({ level, score: levelFill(f, others, level) + 0.1 * Math.abs(f.levels[level] - preferredHeight(standing)) }))
      .sort((a, b) => a.score - b.score || a.level - b.level)
    // two facings where they fit; one facing on the right fixture beats two on a fallback one
    // (a polish range with a dozen shades still fits a stand tier at one facing per shade)
    for (const facings of [2, 1]) {
      for (const { level } of options) {
        const slot =
          others
            .filter((p) => p.placement?.fixtureId === f.id && p.placement.level === level)
            .reduce((m, p) => Math.max(m, Math.floor(p.placement!.slot)), -1) + 1
        const placement: Placement = { fixtureId: f.id, level, slot, facings, ...(orientation === 'flat' ? { orientation } : {}) }
        const trial = { ...product, isActive: true, placement }
        const result = layoutFixture(f, shelfItemsFor(f, [...others, trial]))
        if (!result.overflow.some((o) => o.productId === product.id)) return placement
      }
    }
  }
  return null
}

/**
 * Places every product of `products` in order, each seeing the placements before it. Products
 * that already have a valid placement keep it unless `replace` is true.
 */
export function autoPlaceAll(products: Product[], layout: StoreLayout, replace = false) {
  const valid = (p: Product) => p.placement && layout.fixtures.some((f) => f.id === p.placement!.fixtureId && f.stock === 'shelf')
  const placed: Product[] = replace ? [] : products.filter(valid)
  const unplaced: string[] = []
  const out = new Map<string, Placement | null>()
  for (const p of products) {
    if (!replace && valid(p)) {
      out.set(p.id, p.placement)
      continue
    }
    const placement = p.isActive ? autoPlace(p, placed, layout) : null
    out.set(p.id, placement)
    if (placement) placed.push({ ...p, placement })
    else if (p.isActive) unplaced.push(p.id)
  }
  return { placements: out, unplaced }
}
