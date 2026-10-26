import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartLine } from '@/lib/types'

interface CartState {
  lines: CartLine[]
  add: (productId: string, variantId: string | null, qty?: number, max?: number) => void
  setQty: (productId: string, variantId: string | null, qty: number) => void
  remove: (productId: string, variantId: string | null) => void
  clear: () => void
}

const same = (l: CartLine, productId: string, variantId: string | null) =>
  l.productId === productId && l.variantId === variantId

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (productId, variantId, qty = 1, max = Infinity) =>
        set((s) => {
          const existing = s.lines.find((l) => same(l, productId, variantId))
          if (existing) {
            return {
              lines: s.lines.map((l) => (same(l, productId, variantId) ? { ...l, qty: Math.min(max, l.qty + qty) } : l)),
            }
          }
          return { lines: [...s.lines, { productId, variantId, qty: Math.min(max, qty) }] }
        }),
      setQty: (productId, variantId, qty) =>
        set((s) => ({
          lines:
            qty <= 0
              ? s.lines.filter((l) => !same(l, productId, variantId))
              : s.lines.map((l) => (same(l, productId, variantId) ? { ...l, qty } : l)),
        })),
      remove: (productId, variantId) => set((s) => ({ lines: s.lines.filter((l) => !same(l, productId, variantId)) })),
      clear: () => set({ lines: [] }),
    }),
    { name: 'boutique.cart', version: 1 },
  ),
)
