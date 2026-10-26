import { create } from 'zustand'
import { loadCatalog } from '@/lib/data-source'
import { createLayout, type StoreLayout } from '@/lib/layout'
import { upgradeCatalog } from '@/lib/catalog-upgrade'
import type { Catalog, Product } from '@/lib/types'

interface CatalogState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null
  catalog: Catalog | null
  layout: StoreLayout | null
  productById: Map<string, Product>
  load: () => Promise<void>
  replace: (catalog: Catalog) => void
}

function derive(saved: Catalog) {
  const catalog = upgradeCatalog(saved)
  return {
    catalog,
    layout: createLayout(catalog.settings.store),
    productById: new Map(catalog.products.map((p) => [p.id, p])),
  }
}

export const useCatalog = create<CatalogState>((set, get) => ({
  status: 'idle',
  error: null,
  catalog: null,
  layout: null,
  productById: new Map(),
  load: async () => {
    if (get().status === 'loading') return
    set({ status: 'loading', error: null })
    try {
      const catalog = await loadCatalog()
      set({ status: 'ready', ...derive(catalog) })
    } catch (e) {
      set({ status: 'error', error: e instanceof Error ? e.message : String(e) })
    }
  },
  replace: (catalog) => set({ status: 'ready', ...derive(catalog) }),
}))
