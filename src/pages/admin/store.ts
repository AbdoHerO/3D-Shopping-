import { create } from 'zustand'
import { useCatalog } from '@/state/catalog'
import type { Catalog, DeliveryZone, Order, OrderStatus, Product, Settings } from '@/lib/types'
import { adminApi } from './api'
import { prepareProductAsset, type JobPhase } from './asset-job'

interface AdminState {
  catalog: Catalog | null
  orders: Order[]
  busy: boolean
  error: string | null
  notice: string | null
  load: () => Promise<void>
  loadOrders: () => Promise<void>
  /** Saves a product; with `prepare`, its 3D asset is prepared right after (without blocking). */
  saveProduct: (p: Product, opts?: { prepare?: boolean }) => Promise<boolean>
  /** Product-to-3D jobs running in this tab, by product id. */
  jobs: Record<string, JobPhase>
  prepare: (id: string) => Promise<void>
  deleteProduct: (id: string) => Promise<boolean>
  saveSettings: (s: Settings) => Promise<boolean>
  saveZones: (z: DeliveryZone[]) => Promise<boolean>
  setOrderStatus: (number: string, s: OrderStatus) => Promise<boolean>
  flash: (notice: string | null) => void
}

/** Refreshes the customer-facing catalog after an admin change so the 3D shop updates too. */
async function syncPublic(catalog: Catalog) {
  if (adminApi.mode === 'demo') useCatalog.getState().replace(catalog)
  else await useCatalog.getState().load()
}

let flashTimer: ReturnType<typeof setTimeout> | undefined

export const useAdmin = create<AdminState>((set, get) => {
  const run = async (fn: () => Promise<void>, notice?: string) => {
    set({ busy: true, error: null })
    try {
      await fn()
      const catalog = await adminApi.loadCatalog()
      set({ catalog, busy: false })
      await syncPublic(catalog)
      if (notice) get().flash(notice)
      return true
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      set({ busy: false, error: message })
      return false
    }
  }
  return {
    catalog: null,
    orders: [],
    busy: false,
    error: null,
    notice: null,
    load: async () => {
      set({ busy: true, error: null })
      try {
        const [catalog, orders] = await Promise.all([adminApi.loadCatalog(), adminApi.listOrders()])
        set({ catalog, orders, busy: false })
      } catch (e) {
        set({ busy: false, error: e instanceof Error ? e.message : String(e) })
      }
    },
    loadOrders: async () => {
      try {
        set({ orders: await adminApi.listOrders() })
      } catch (e) {
        set({ error: e instanceof Error ? e.message : String(e) })
      }
    },
    saveProduct: async (p, opts) => {
      const ok = await run(() => adminApi.saveProduct(p), 'saved')
      if (ok && opts?.prepare) void get().prepare(p.id)
      return ok
    },
    jobs: {},
    prepare: async (id) => {
      const setPhase = (phase: JobPhase | null) =>
        set((s) => {
          const jobs = { ...s.jobs }
          if (phase) jobs[id] = phase
          else delete jobs[id]
          return { jobs }
        })
      const catalog = get().catalog
      const product = catalog?.products.find((p) => p.id === id)
      if (!catalog || !product || get().jobs[id]) return
      setPhase('image')
      try {
        const next = await prepareProductAsset(product, catalog, setPhase)
        await adminApi.saveProduct(next)
        const fresh = await adminApi.loadCatalog()
        set({ catalog: fresh })
        await syncPublic(fresh)
      } catch (e) {
        set({ error: e instanceof Error ? e.message : String(e) })
      } finally {
        setPhase(null)
      }
    },
    deleteProduct: (id) => run(() => adminApi.deleteProduct(id), 'deleted'),
    saveSettings: (s) => run(() => adminApi.saveSettings(s), 'saved'),
    saveZones: (z) => run(() => adminApi.saveZones(z), 'saved'),
    setOrderStatus: async (number, status) => {
      const ok = await run(() => adminApi.setOrderStatus(number, status), 'saved')
      await get().loadOrders()
      return ok
    },
    flash: (notice) => {
      clearTimeout(flashTimer)
      set({ notice })
      if (notice) flashTimer = setTimeout(() => set({ notice: null }), 2600)
    },
  }
})
