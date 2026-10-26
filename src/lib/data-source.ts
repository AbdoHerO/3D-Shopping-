/**
 * Where the catalog comes from and where orders go.
 *
 * - Demo mode (default, no account needed): catalog from public/data/catalog.json (or the copy the
 *   demo admin saved in this browser); orders are kept in this browser and sent by WhatsApp.
 * - Live mode (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY set): catalog read from Supabase;
 *   orders go through the `place_order` database function, which re-prices everything server-side.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { computeTotals } from './pricing'
import { makeOrderNumber } from './order-number'
import { tr } from './i18n-text'
import type { Catalog, CartLine, CustomerInfo, Locale, Order, Settings } from './types'
import {
  rowToCategory,
  rowToProduct,
  rowToZone,
  type CategoryRow,
  type DeliveryZoneRow,
  type ProductRow,
} from './supabase-mapping'

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const IS_LIVE = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

export const DEMO_CATALOG_KEY = 'boutique.demoCatalog'
export const DEMO_ORDERS_KEY = 'boutique.orders'

let client: SupabaseClient | null = null
export async function supabase(): Promise<SupabaseClient> {
  if (!IS_LIVE) throw new Error('Supabase is not configured')
  if (!client) {
    const { createClient } = await import('@supabase/supabase-js')
    client = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!)
  }
  return client
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage full or unavailable: the order still goes out by WhatsApp */
  }
}

export async function fetchDemoCatalog(): Promise<Catalog> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/catalog.json`)
  if (!res.ok) throw new Error(`catalog.json: HTTP ${res.status}`)
  return (await res.json()) as Catalog
}

export async function loadCatalog(): Promise<Catalog> {
  if (!IS_LIVE) {
    return readJson<Catalog>(DEMO_CATALOG_KEY) ?? (await fetchDemoCatalog())
  }
  const db = await supabase()
  const [settings, categories, products, zones] = await Promise.all([
    db.from('settings').select('data').eq('id', 1).single(),
    db.from('categories').select('*').order('sort'),
    db.from('products').select('*, product_variants(*)').eq('is_active', true),
    db.from('delivery_zones').select('*').eq('is_active', true).order('sort'),
  ])
  for (const r of [settings, categories, products, zones]) if (r.error) throw r.error
  return {
    settings: (settings.data as { data: Settings }).data,
    categories: (categories.data as CategoryRow[]).map(rowToCategory),
    products: (products.data as ProductRow[]).map(rowToProduct),
    deliveryZones: (zones.data as DeliveryZoneRow[]).map(rowToZone),
  }
}

export interface PlaceOrderInput {
  lines: CartLine[]
  customer: CustomerInfo
  zoneId: string
  locale: Locale
}

export async function placeOrder(input: PlaceOrderInput, catalog: Catalog): Promise<Order> {
  const zone = catalog.deliveryZones.find((z) => z.id === input.zoneId) ?? null
  if (IS_LIVE) {
    const db = await supabase()
    const { data, error } = await db.rpc('place_order', {
      payload: {
        lines: input.lines.map((l) => ({ product_id: l.productId, variant_id: l.variantId, qty: l.qty })),
        customer: input.customer,
        zone_id: input.zoneId,
        locale: input.locale,
        honeypot: '',
      },
    })
    if (error) throw error
    const result = data as { order_number: string; subtotal: number; delivery_fee: number; total: number; items: Order['items'] }
    const order: Order = {
      number: result.order_number,
      status: 'new',
      customer: { ...input.customer, city: zone?.city ?? input.customer.city },
      items: result.items,
      subtotal: Number(result.subtotal),
      deliveryFee: Number(result.delivery_fee),
      total: Number(result.total),
      paymentMethod: 'cod',
      locale: input.locale,
      createdAt: new Date().toISOString(),
    }
    rememberOrder(order)
    return order
  }

  const totals = computeTotals(input.lines, catalog, zone)
  if (totals.lines.length === 0) throw new Error('empty-cart')
  const order: Order = {
    number: makeOrderNumber(catalog.settings.orderPrefix),
    status: 'new',
    customer: { ...input.customer, city: zone?.city ?? input.customer.city },
    items: totals.lines.map((l) => ({
      productId: l.productId,
      variantId: l.variantId,
      name: [tr(l.product.name, input.locale), l.variant ? tr(l.variant.name, input.locale) : null]
        .filter(Boolean)
        .join(' — '),
      unitPrice: l.unitPrice,
      qty: l.qty,
      lineTotal: l.lineTotal,
    })),
    subtotal: totals.subtotal,
    deliveryFee: totals.deliveryFee,
    total: totals.total,
    paymentMethod: 'cod',
    locale: input.locale,
    createdAt: new Date().toISOString(),
  }
  rememberOrder(order)
  return order
}

/** Keeps the customer's own orders on this device (confirmation page, demo admin). */
export function rememberOrder(order: Order) {
  const list = readJson<Order[]>(DEMO_ORDERS_KEY) ?? []
  writeJson(DEMO_ORDERS_KEY, [order, ...list.filter((o) => o.number !== order.number)].slice(0, 200))
}

export function localOrders(): Order[] {
  return readJson<Order[]>(DEMO_ORDERS_KEY) ?? []
}

export function saveLocalOrders(orders: Order[]) {
  writeJson(DEMO_ORDERS_KEY, orders)
}

export function saveDemoCatalog(catalog: Catalog | null) {
  if (catalog) writeJson(DEMO_CATALOG_KEY, catalog)
  else
    try {
      localStorage.removeItem(DEMO_CATALOG_KEY)
    } catch {
      /* ignore */
    }
}
