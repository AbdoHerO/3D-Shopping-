import { create } from 'zustand'
import { useCatalog } from '@/state/catalog'
import type { Catalog, DeliveryZone, Order, OrderStatus, Product, Settings } from '@/lib/types'
import { adminApi } from './api'

interface AdminState {
  catalog: Catalog | null
  orders: Order[]
  busy: boolean
  error: string | null
  notice: string | null
  load: () => Promise<void>
  loadOrders: () => Promise<void>
  saveProduct: (p: Product) => Promise<boolean>
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
    saveProduct: (p) => run(() => adminApi.saveProduct(p), 'saved'),
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
