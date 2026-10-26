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

  it('reports impossible rooms', () => {
    expect(validateLayout(createLayout({ width: 2, depth: 3, ceiling: 3 })).length).toBeGreaterThan(0)
  })

  it('maps fixture-local coordinates onto the right wall', () => {
    const layout = createLayout()
    const hair = layout.fixtures.find((f) => f.id === 'wall-hair')!
    const [x, , z] = localToWorld(hair, 0, 0, hair.depth)
    expect(x).toBeCloseTo(-layout.dims.width / 2 + hair.depth)
    expect(z).toBeLessThan(0)
    const perfume = layout.fixtures.find((f) => f.id === 'wall-perfume')!
    expect(localToWorld(perfume, 0, 0, 0)[2]).toBeCloseTo(-layout.dims.depth)
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
    const nails = layout.fixtures.find((f) => f.id === 'wall-nails')!
    const r = layoutFixture(nails, shelfItemsFor(nails, catalog.products))
    const shades = new Set(r.facings.filter((f) => f.productId === 'vernis-brillance').map((f) => f.variantId))
    expect(shades.size).toBe(12)
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
