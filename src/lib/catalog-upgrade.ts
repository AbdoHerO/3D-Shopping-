/**
 * Brings catalogues saved by earlier versions (a demo copy in the browser, an exported
 * catalog.json, older database rows) up to date: package families instead of the first "shape"
 * names, sign labels for every fixture, and products whose fixture no longer exists placed again.
 */
import { autoPlace } from './auto-placement'
import { createLayout } from './layout'
import { normaliseFamily } from './packaging'
import type { Catalog, I18nText, Product } from './types'

const t = (fr: string, en: string, ar: string): I18nText => ({ fr, en, ar })

export const DEFAULT_FIXTURE_LABELS: Record<string, I18nText> = {
  'stand-nails': t('Vernis', 'Nail polish', 'طلاء الأظافر'),
  'wall-hair': t('Cheveux', 'Hair care', 'العناية بالشعر'),
  'wall-body': t('Corps & hygiène', 'Body & hygiene', 'الجسم والنظافة'),
  'wall-makeup': t('Maquillage', 'Makeup', 'المكياج'),
  'wall-skin': t('Soins visage', 'Skincare', 'العناية بالبشرة'),
  'wall-gifts': t('Coffrets', 'Gift sets', 'علب الهدايا'),
  'wall-perfume': t('Parfums', 'Fragrance', 'العطور'),
  counter: t('Comptoir & caisse', 'Counter & till', 'المنضدة والصندوق'),
  'vitrine-left': t('Vitrine', 'Shop window', 'الواجهة'),
  'vitrine-right': t('Vitrine', 'Shop window', 'الواجهة'),
}

export function upgradeCatalog(catalog: Catalog): Catalog {
  const layout = createLayout(catalog.settings.store)
  const shelves = new Set(layout.fixtures.filter((f) => f.stock === 'shelf').map((f) => f.id))
  let products: Product[] = catalog.products.map((p) => (p.shape === normaliseFamily(p.shape) ? p : { ...p, shape: normaliseFamily(p.shape) }))
  const stale = new Set(products.filter((p) => p.placement && !shelves.has(p.placement.fixtureId)).map((p) => p.id))
  if (stale.size) {
    const placed = products.filter((p) => p.placement && !stale.has(p.id))
    products = products.map((p) => {
      if (!stale.has(p.id)) return p
      const placement = autoPlace({ ...p, placement: null }, placed, layout)
      const next = { ...p, placement }
      if (placement) placed.push(next)
      return next
    })
  }
  const labels = { ...DEFAULT_FIXTURE_LABELS, ...catalog.settings.fixtureLabels }
  const changed = stale.size > 0 || products.some((p, i) => p !== catalog.products[i]) || Object.keys(labels).length !== Object.keys(catalog.settings.fixtureLabels).length
  return changed ? { ...catalog, settings: { ...catalog.settings, fixtureLabels: labels }, products } : catalog
}
