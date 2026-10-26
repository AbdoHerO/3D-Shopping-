import type { Bay, Fixture } from './layout'
import type { Product } from './types'

/** One physical item to stand on a shelf: a product, or one shade of it when variants are displayed. */
export interface ShelfItem {
  key: string
  productId: string
  variantId: string | null
  widthM: number
  heightM: number
  depthM: number
  level: number
  slot: number
  facings: number
  /** Facings may grow to fill empty shelf space. */
  autoFacings: boolean
}

export interface PlacedFacing {
  key: string
  productId: string
  variantId: string | null
  fixtureId: string
  level: number
  /** Centre of the facing along the fixture (local x). */
  u: number
  /** Shelf-top height (local y). */
  y: number
  widthM: number
  heightM: number
  depthM: number
  facingIndex: number
}

export interface ShelfLayoutResult {
  facings: PlacedFacing[]
  /** Items that did not fit on their level, with a human-readable reason. */
  overflow: { productId: string; variantId: string | null; reason: string }[]
  /** Items taller than the gap to the shelf above. */
  tooTall: { productId: string; level: number }[]
}

const GAP = 0.012
const MAX_FACINGS = 6
const MAX_VARIANT_FACINGS = 2
const MAX_SPREAD_GAP = 0.06

/** Expands the products placed on a fixture into shelf items (one per displayed variant). */
export function shelfItemsFor(fixture: Fixture, products: Product[]): ShelfItem[] {
  const items: ShelfItem[] = []
  for (const p of products) {
    if (!p.isActive || !p.placement || p.placement.fixtureId !== fixture.id) continue
    const base = {
      productId: p.id,
      widthM: p.widthCm / 100,
      heightM: p.heightCm / 100,
      depthM: Math.max(0.015, p.depthCm / 100),
      level: Math.min(Math.max(0, p.placement.level), fixture.levels.length - 1),
      slot: p.placement.slot,
    }
    if (p.displayVariants && p.variants.length > 0) {
      p.variants.forEach((v, i) =>
        items.push({
          ...base,
          key: `${p.id}:${v.id}`,
          variantId: v.id,
          slot: p.placement!.slot + i / 100,
          facings: 1,
          autoFacings: false,
        }),
      )
    } else {
      items.push({
        ...base,
        key: p.id,
        variantId: null,
        facings: Math.min(MAX_FACINGS, Math.max(1, p.placement.facings)),
        autoFacings: true,
      })
    }
  }
  return items
}

function widthOf(items: { widthM: number; facings: number }[]) {
  return items.reduce((sum, it) => sum + it.widthM * it.facings, 0) + Math.max(0, items.length - 1) * GAP
}


type BayGroup = { bay: Bay; items: ShelfItem[] }

/**
 * Splits `items` (already in slot order) into contiguous runs, one per bay, aiming for each bay
 * to be filled in proportion to its capacity. Falls back to sequential packing when the
 * balanced split would overflow a bay.
 */
function distribute(items: ShelfItem[], bays: Bay[]): { groups: BayGroup[]; overflow: ShelfItem[] } {
  const copies = items.map((it) => ({ ...it }))
  const capacities = bays.map((b) => b.u1 - b.u0)
  const totalCap = capacities.reduce((a, b) => a + b, 0)
  const totalWidth = widthOf(copies)

  // balanced split: move to the next bay once this one holds its share of the total width
  const balanced: BayGroup[] = bays.map((bay) => ({ bay, items: [] }))
  if (totalWidth <= totalCap) {
    let acc = 0
    let b = 0
    let cumTarget = (totalWidth * capacities[0]) / totalCap
    for (const it of copies) {
      const w = it.widthM * it.facings + GAP
      while (b < bays.length - 1 && balanced[b].items.length > 0 && acc + w / 2 > cumTarget + 1e-9) {
        b += 1
        cumTarget += (totalWidth * capacities[b]) / totalCap
      }
      balanced[b].items.push(it)
      acc += w
    }
    if (balanced.every((g, i) => widthOf(g.items) <= capacities[i] + 1e-9)) {
      return { groups: balanced, overflow: [] }
    }
  }

  // sequential fallback
  const groups: BayGroup[] = bays.map((bay) => ({ bay, items: [] }))
  const overflow: ShelfItem[] = []
  let bayIndex = 0
  for (const it of items) {
    const copy = { ...it }
    let placed = false
    while (bayIndex < groups.length) {
      const g = groups[bayIndex]
      if (widthOf([...g.items, copy]) <= capacities[bayIndex]) {
        g.items.push(copy)
        placed = true
        break
      }
      if (g.items.length === 0 && copy.facings > 1) {
        copy.facings -= 1
        continue
      }
      bayIndex += 1
    }
    if (!placed) overflow.push(it)
  }
  return { groups, overflow }
}

/**
 * Lays items out level by level: in slot order, filling the fixture's bays left to right, then
 * growing facings round-robin to fill spare space and spreading what is left as even gaps.
 */
export function layoutFixture(fixture: Fixture, items: ShelfItem[]): ShelfLayoutResult {
  const result: ShelfLayoutResult = { facings: [], overflow: [], tooTall: [] }

  fixture.levels.forEach((levelY, level) => {
    const onLevel = items.filter((it) => it.level === level).sort((a, b) => a.slot - b.slot)
    if (onLevel.length === 0) return
    const bays = fixture.bays.filter((b) => b.levels.includes(level))
    const above = fixture.levels[level + 1]
    const clearance = above !== undefined ? above - levelY - 0.025 : Infinity

    for (const it of onLevel) {
      if (it.heightM > clearance) result.tooTall.push({ productId: it.productId, level })
    }
    if (bays.length === 0) {
      for (const it of onLevel)
        result.overflow.push({ productId: it.productId, variantId: it.variantId, reason: 'no-bay-on-level' })
      return
    }

    // 1. split the ordered items into contiguous groups, one per bay, balanced by width
    const groups = distribute(onLevel, bays)
    for (const it of groups.overflow) {
      result.overflow.push({ productId: it.productId, variantId: it.variantId, reason: 'level-full' })
    }

    // 2. grow facings, 3. spread
    for (const g of groups.groups) {
      if (g.items.length === 0) continue
      const capacity = g.bay.u1 - g.bay.u0
      let grew = true
      while (grew) {
        grew = false
        for (const it of g.items) {
          if (it.facings >= (it.autoFacings ? MAX_FACINGS : MAX_VARIANT_FACINGS)) continue
          if (widthOf(g.items) + it.widthM <= capacity * 0.9) {
            it.facings += 1
            grew = true
          }
        }
      }
      const used = widthOf(g.items)
      const spare = capacity - used
      const gap = GAP + Math.min(MAX_SPREAD_GAP, spare / (g.items.length + 1))
      const total = used - (g.items.length - 1) * GAP + (g.items.length - 1) * gap
      let cursor = g.bay.u0 + (capacity - total) / 2
      for (const it of g.items) {
        for (let f = 0; f < it.facings; f++) {
          result.facings.push({
            key: `${it.key}#${f}`,
            productId: it.productId,
            variantId: it.variantId,
            fixtureId: fixture.id,
            level,
            u: cursor + it.widthM / 2,
            y: levelY,
            widthM: it.widthM,
            heightM: it.heightM,
            depthM: it.depthM,
            facingIndex: f,
          })
          cursor += it.widthM
        }
        cursor += gap
      }
    }
  })
  return result
}

/** Picks the first level with room on a fixture for a new product (used by the admin). */
export function firstFreeSlot(fixture: Fixture, items: ShelfItem[], widthM: number) {
  for (let level = 0; level < fixture.levels.length; level++) {
    const bays = fixture.bays.filter((b) => b.levels.includes(level))
    const capacity = bays.reduce((s, b) => s + (b.u1 - b.u0), 0)
    const onLevel = items.filter((it) => it.level === level)
    const used = widthOf(onLevel.map((it) => ({ ...it, facings: 1 })))
    if (capacity - used >= widthM + GAP) {
      const slot = onLevel.reduce((m, it) => Math.max(m, Math.floor(it.slot)), -1) + 1
      return { level, slot }
    }
  }
  return null
}
