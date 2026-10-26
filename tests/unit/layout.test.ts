import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createLayout, localToWorld, validateLayout } from '@/lib/layout'
import { layoutFixture, shelfItemsFor } from '@/lib/shelf-layout'
import type { Catalog } from '@/lib/types'

const catalog = JSON.parse(readFileSync('public/data/catalog.json', 'utf8')) as Catalog

describe('store layout', () => {
  it('fits the default 3.5 × 6.5 m shop with no overlaps', () => {
    expect(validateLayout(createLayout({ width: 3.5, depth: 6.5, ceiling: 3 }))).toEqual([])
  })

  it.each([
    [3, 6],
    [4, 7],
    [3.2, 6.8],
  ])('adapts to %s × %s m', (width, depth) => {
    const layout = createLayout({ width, depth, ceiling: 3 })
    expect(validateLayout(layout)).toEqual([])
    for (const vp of Object.values(layout.viewpoints)) {
      expect(Math.abs(vp.position[0])).toBeLessThan(width / 2)
      expect(vp.position[2]).toBeLessThan(0)
      expect(vp.position[2]).toBeGreaterThan(-depth)
    }
  })

  it('leaves a passage between the nail stand and the counter, moving the counter back in a narrow shop', () => {
    for (const width of [3, 3.2, 3.5, 4]) {
      const layout = createLayout({ width, depth: 6.5, ceiling: 3 })
      expect(validateLayout(layout), `${width} m`).toEqual([])
      const stand = layout.colliders.find((c) => c.id === 'stand-nails')!
      for (const id of ['counter', 'counter-return']) {
        const b = layout.colliders.find((c) => c.id === id)!
        const dx = Math.max(0, b.min[0] - stand.max[0])
        const dz = Math.max(0, stand.min[1] - b.max[1])
        expect(Math.hypot(dx, dz), `${id} at ${width} m`).toBeGreaterThanOrEqual(0.75)
      }
    }
    // the default shop keeps the counter where the photos show it
    expect(createLayout().colliders.find((c) => c.id === 'counter-return')!.max[1]).toBeCloseTo(-1.3)
  })

  it('reports impossible rooms', () => {
    expect(validateLayout(createLayout({ width: 2, depth: 3, ceiling: 3 })).length).toBeGreaterThan(0)
  })

  it('maps fixture-local coordinates onto the right wall', () => {
    const layout = createLayout()
    const hair = layout.fixtures.find((f) => f.id === 'wall-hair')!
    const [x, , z] = localToWorld(hair, 0, 0, hair.depth)
    expect(x).toBeCloseTo(-layout.dims.width / 2 + hair.depth)
    expect(z).toBeLessThan(0)
    const skin = layout.fixtures.find((f) => f.id === 'wall-skin')!
    expect(localToWorld(skin, 0, 0, 0)[2]).toBeCloseTo(-layout.dims.depth)
    // the perfume wall runs back to front along the right wall, facing the room
    const perfume = layout.fixtures.find((f) => f.id === 'wall-perfume')!
    expect(localToWorld(perfume, perfume.length, 0, 0)[2]).toBeCloseTo(-0.45)
    expect(localToWorld(perfume, 0, 0, perfume.depth)[0]).toBeCloseTo(layout.dims.width / 2 - perfume.depth)
  })

  it('follows the photographed shop: shelving on three walls, a counter on the right, no island', () => {
    const layout = createLayout()
    const byWall = (w: string) => layout.fixtures.filter((f) => f.wall === w).map((f) => f.id)
    expect(byWall('left')).toEqual(['wall-hair', 'wall-body', 'wall-makeup'])
    expect(byWall('right')).toEqual(['wall-perfume', 'wall-gifts'])
    expect(byWall('back')).toEqual(['wall-skin'])
    expect(layout.fixtures.some((f) => f.kind === ('island' as string))).toBe(false)
    const counter = layout.colliders.find((c) => c.id === 'counter')!
    expect(counter.min[0]).toBeGreaterThan(0)
    // window displays face the street and are not browsed from inside
    for (const id of ['vitrine-left', 'vitrine-right']) {
      const f = layout.fixtures.find((x) => x.id === id)!
      expect(localToWorld(f, 0, 0, f.depth)[2]).toBeGreaterThan(localToWorld(f, 0, 0, 0)[2])
      expect(f.browsable).toBe(false)
    }
  })

  it.each([
    [3.5, 6.5],
    [3, 6],
    [4, 7],
  ])('keeps a walkable aisle and every viewpoint clear of furniture in a %s × %s m shop', (width, depth) => {
    const layout = createLayout({ width, depth, ceiling: 3 })
    for (const a of layout.aisle) expect(a.x1 - a.x0).toBeGreaterThanOrEqual(0.75)
    for (const vp of Object.values(layout.viewpoints)) {
      const [x, , z] = vp.position
      for (const c of layout.colliders) {
        const inside = x > c.min[0] && x < c.max[0] && z > c.min[1] && z < c.max[1]
        expect(inside, `${vp.id} inside ${c.id}`).toBe(false)
      }
    }
    for (const f of layout.fixtures.filter((x) => x.browsable)) expect(layout.viewpoints[f.id], f.id).toBeDefined()
  })

  it('steps the nail stand tiers back as they rise', () => {
    const stand = createLayout().fixtures.find((f) => f.id === 'stand-nails')!
    for (let i = 1; i < stand.levels.length; i++) {
      expect(stand.levels[i]).toBeGreaterThan(stand.levels[i - 1])
      expect(stand.levelZ![i]).toBeLessThan(stand.levelZ![i - 1])
    }
  })
})

describe('shelf layout', () => {
  const layout = createLayout(catalog.settings.store)

  it('places every demo product without overflow or products taller than their shelf', () => {
    for (const f of layout.fixtures) {
      const r = layoutFixture(f, shelfItemsFor(f, catalog.products))
      expect(r.overflow, f.id).toEqual([])
      expect(r.tooTall, f.id).toEqual([])
    }
  })

  it('keeps facings inside their bays and never overlapping', () => {
    for (const f of layout.fixtures) {
      const r = layoutFixture(f, shelfItemsFor(f, catalog.products))
      const byLevel = new Map<number, typeof r.facings>()
      for (const fc of r.facings) byLevel.set(fc.level, [...(byLevel.get(fc.level) ?? []), fc])
      for (const list of byLevel.values()) {
        const sorted = [...list].sort((a, b) => a.u - b.u)
        for (let i = 1; i < sorted.length; i++) {
          expect(sorted[i].u - sorted[i].widthM / 2).toBeGreaterThanOrEqual(sorted[i - 1].u + sorted[i - 1].widthM / 2 - 1e-6)
        }
        for (const fc of list) {
          const inBay = f.bays.some((b) => fc.u - fc.widthM / 2 >= b.u0 - 1e-6 && fc.u + fc.widthM / 2 <= b.u1 + 1e-6)
          expect(inBay, `${fc.key} on ${f.id}`).toBe(true)
        }
      }
    }
  })

  it('shows every shade of a "display variants" product', () => {
    const polish = catalog.products.find((p) => p.id === 'vernis-brillance')!
    const f = layout.fixtures.find((x) => x.id === polish.placement!.fixtureId)!
    const r = layoutFixture(f, shelfItemsFor(f, catalog.products))
    const shades = new Set(r.facings.filter((x) => x.productId === 'vernis-brillance').map((x) => x.variantId))
    expect(shades.size).toBe(polish.variants.length)
  })

  it('runs a product on into empty bays instead of leaving them bare', () => {
    const f = layout.fixtures.find((x) => x.id === 'wall-hair')!
    const one = [{ ...catalog.products[0], id: 'solo', widthCm: 6, heightCm: 18, placement: { fixtureId: f.id, level: 3, slot: 0, facings: 1 }, displayVariants: false, variants: [] }]
    const r = layoutFixture(f, shelfItemsFor(f, one))
    const bays = new Set(r.facings.map((fc) => f.bays.findIndex((b) => fc.u >= b.u0 && fc.u <= b.u1)))
    expect(bays.size).toBe(f.bays.length)
    expect(r.overflow).toEqual([])
  })

  it('lays palettes flat: their thickness stands on the shelf', () => {
    const f = layout.fixtures.find((x) => x.id === 'counter')!
    const palette = { ...catalog.products[0], id: 'flat', widthCm: 13, heightCm: 9, depthCm: 1.2, placement: { fixtureId: 'counter', level: 0, slot: 0, facings: 1, orientation: 'flat' as const }, displayVariants: false, variants: [] }
    const [item] = shelfItemsFor(f, [palette])
    expect(item.heightM).toBeCloseTo(0.012)
    expect(item.depthM).toBeCloseTo(0.09)
  })

  it('reports overflow when a level is too full', () => {
    const f = layout.fixtures.find((x) => x.id === 'counter')!
    const many = Array.from({ length: 40 }, (_, i) => ({
      ...catalog.products[0],
      id: `p${i}`,
      widthCm: 10,
      heightCm: 10,
      placement: { fixtureId: 'counter', level: 0, slot: i, facings: 1 },
      displayVariants: false,
    }))
    expect(layoutFixture(f, shelfItemsFor(f, many)).overflow.length).toBeGreaterThan(0)
  })
})
