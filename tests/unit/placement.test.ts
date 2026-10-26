import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { autoPlace, autoPlaceAll, candidateFixtures } from '@/lib/auto-placement'
import { upgradeCatalog } from '@/lib/catalog-upgrade'
import { createLayout } from '@/lib/layout'
import type { PackageFamily } from '@/lib/packaging'
import { layoutFixture, shelfItemsFor } from '@/lib/shelf-layout'
import type { Catalog, Product } from '@/lib/types'

const catalog = JSON.parse(readFileSync('public/data/catalog.json', 'utf8')) as Catalog
const layout = createLayout(catalog.settings.store)
const base = catalog.products[0]
const item = (id: string, shape: PackageFamily, categoryId: string, dims: [number, number, number]): Product => ({
  ...base,
  id,
  slug: id,
  shape,
  categoryId,
  widthCm: dims[0],
  heightCm: dims[1],
  depthCm: dims[2],
  placement: null,
  variants: [],
  displayVariants: false,
  isActive: true,
})

describe('automatic shelf placement', () => {
  it('keeps the polish stand for polish and sends hand care elsewhere', () => {
    expect(candidateFixtures({ shape: 'nail-polish', categoryId: 'nails' }, layout)[0].id).toBe('stand-nails')
    const handCream = candidateFixtures({ shape: 'tube', categoryId: 'nails' }, layout).map((f) => f.id)
    expect(handCream).not.toContain('stand-nails')
    expect(handCream[0]).toBe('wall-body')
  })

  it('lays palettes flat under the counter glass', () => {
    const p = autoPlace(item('new-palette', 'palette', 'makeup', [13, 9, 1.2]), catalog.products, layout)
    expect(p).toMatchObject({ fixtureId: 'counter', level: 0, orientation: 'flat' })
  })

  it('puts a new perfume on the perfume wall at a level it fits under', () => {
    const p = autoPlace(item('new-edp', 'perfume-neck', 'perfume', [7, 13, 4.5]), catalog.products, layout)!
    expect(p.fixtureId).toBe('wall-perfume')
    const f = layout.fixtures.find((x) => x.id === 'wall-perfume')!
    const clearance = (f.levels[p.level + 1] ?? f.height) - f.levels[p.level]
    expect(clearance).toBeGreaterThan(0.13)
  })

  it('never overlaps: a product that no longer fits is left for manual placement', () => {
    const full: Product[] = []
    let n = 0
    // fill every candidate fixture of jars with wide boxes until placement fails
    for (;;) {
      const p = item(`box-${n++}`, 'box-gift-set', 'skin', [40, 20, 20])
      const placement = autoPlace(p, full, layout)
      if (!placement) break
      full.push({ ...p, placement })
      expect(n).toBeLessThan(200)
    }
    for (const f of layout.fixtures.filter((x) => x.stock === 'shelf')) {
      expect(layoutFixture(f, shelfItemsFor(f, full)).overflow, f.id).toEqual([])
    }
  })

  it('is reproducible', () => {
    const a = autoPlaceAll(catalog.products, layout, true)
    const b = autoPlaceAll(catalog.products, layout, true)
    expect([...a.placements.entries()]).toEqual([...b.placements.entries()])
  })
})

describe('catalogues saved by earlier versions', () => {
  const old: Catalog = {
    ...catalog,
    settings: { ...catalog.settings, fixtureLabels: { counter: { fr: 'Caisse', en: 'Checkout', ar: 'الصندوق' } } },
    products: [
      { ...item('old-polish', 'nail-polish', 'nails', [3.4, 8, 3.4]), shape: 'polish' as PackageFamily, placement: { fixtureId: 'wall-nails', level: 5, slot: 0, facings: 2 } },
      { ...item('old-promo', 'jar-lid', 'body', [8, 6, 8]), shape: 'jar' as PackageFamily, placement: { fixtureId: 'island', level: 1, slot: 0, facings: 2 } },
      { ...item('list-only', 'box-carton', 'accessories', [6, 12, 4]), placement: null },
    ],
  }

  it('upgrades shapes, re-places products from removed fixtures and fills in sign labels', () => {
    const up = upgradeCatalog(old)
    const byId = new Map(up.products.map((p) => [p.id, p]))
    expect(byId.get('old-polish')!.shape).toBe('nail-polish')
    expect(byId.get('old-polish')!.placement!.fixtureId).toBe('stand-nails')
    expect(byId.get('old-promo')!.shape).toBe('jar-lid')
    expect(byId.get('old-promo')!.placement!.fixtureId).toBe('wall-body')
    // a product deliberately kept off the shelves stays there
    expect(byId.get('list-only')!.placement).toBeNull()
    expect(up.settings.fixtureLabels.counter.fr).toBe('Caisse')
    expect(up.settings.fixtureLabels['wall-perfume']).toBeDefined()
  })

  it('leaves an up-to-date catalogue untouched', () => {
    expect(upgradeCatalog(catalog)).toBe(catalog)
  })
})
