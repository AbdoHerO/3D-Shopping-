/**
 * Admin data access. Live mode talks to Supabase (RLS: admins only). Demo mode keeps a copy of
 * the catalog and the orders in this browser, so every admin screen can be tried without an
 * account; "Export catalog.json" turns the demo edits into a file to commit.
 */
import {
  DEMO_CATALOG_KEY,
  IS_LIVE,
  fetchDemoCatalog,
  localOrders,
  saveDemoCatalog,
  saveLocalOrders,
  supabase,
} from '@/lib/data-source'
import {
  productToRow,
  rowToCategory,
  rowToOrder,
  rowToProduct,
  rowToZone,
  variantToRow,
  zoneToRow,
  type CategoryRow,
  type DeliveryZoneRow,
  type OrderRow,
  type ProductRow,
} from '@/lib/supabase-mapping'
import type { Catalog, DeliveryZone, Order, OrderStatus, Product, Settings } from '@/lib/types'
import { upgradeCatalog } from '@/lib/catalog-upgrade'
import { assetUrl } from '@/lib/assets'
import { getOriginal, putOriginal } from '@/lib/original-store'

export interface AdminApi {
  mode: 'demo' | 'live'
  session(): Promise<{ email: string } | null>
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  isAdmin(): Promise<boolean>
  loadCatalog(): Promise<Catalog>
  saveProduct(p: Product): Promise<void>
  deleteProduct(id: string): Promise<void>
  saveSettings(s: Settings): Promise<void>
  saveZones(zones: DeliveryZone[]): Promise<void>
  listOrders(): Promise<Order[]>
  setOrderStatus(number: string, status: OrderStatus): Promise<void>
  uploadImage(file: Blob, name: string): Promise<string>
  /** Stores an untouched original upload; returns a reference for readOriginal. */
  uploadOriginal(file: Blob, name: string): Promise<string>
  readOriginal(ref: string): Promise<Blob>
  resetDemo?(): Promise<void>
}

async function fetchBlob(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Could not read the photo (HTTP ${res.status}).`)
  return res.blob()
}

// ---------------------------------------------------------------------------------------------
// Demo (this browser only)
// ---------------------------------------------------------------------------------------------
async function demoCatalog(): Promise<Catalog> {
  try {
    const raw = localStorage.getItem(DEMO_CATALOG_KEY)
    if (raw) return upgradeCatalog(JSON.parse(raw) as Catalog)
  } catch {
    /* fall through */
  }
  return upgradeCatalog(await fetchDemoCatalog())
}

async function updateDemo(fn: (c: Catalog) => Catalog) {
  const next = fn(structuredClone(await demoCatalog()))
  saveDemoCatalog(next)
  // localStorage can be full (large photos): fail loudly rather than silently losing edits
  if (!localStorage.getItem(DEMO_CATALOG_KEY)) throw new Error('storage-full')
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}

const demoApi: AdminApi = {
  mode: 'demo',
  session: async () => ({ email: 'demo' }),
  signIn: async () => {},
  signOut: async () => {},
  isAdmin: async () => true,
  loadCatalog: demoCatalog,
  saveProduct: (p) =>
    updateDemo((c) => {
      const i = c.products.findIndex((x) => x.id === p.id)
      if (i >= 0) c.products[i] = p
      else c.products.push(p)
      return c
    }),
  deleteProduct: (id) => updateDemo((c) => ({ ...c, products: c.products.filter((p) => p.id !== id) })),
  saveSettings: (s) => updateDemo((c) => ({ ...c, settings: s })),
  saveZones: (zones) => updateDemo((c) => ({ ...c, deliveryZones: zones })),
  listOrders: async () => localOrders(),
  setOrderStatus: async (number, status) => {
    const orders = localOrders()
    const o = orders.find((x) => x.number === number)
    if (!o) throw new Error('not_found')
    if (o.status === 'cancelled' && status !== 'cancelled') throw new Error('cancelled_orders_are_final')
    if (status === 'cancelled' && o.status !== 'cancelled') {
      await updateDemo((c) => {
        for (const item of o.items) {
          const p = c.products.find((x) => x.id === item.productId)
          const v = item.variantId ? p?.variants.find((x) => x.id === item.variantId) : null
          if (v) v.stock += item.qty
          else if (p) p.stock += item.qty
        }
        return c
      })
    }
    o.status = status
    saveLocalOrders(orders)
  },
  uploadImage: async (file) => blobToDataUrl(file),
  uploadOriginal: (file, name) => putOriginal(file, name),
  readOriginal: async (ref) => {
    if (ref.startsWith('idb:')) {
      const blob = await getOriginal(ref)
      if (!blob) throw new Error('The original photo is no longer stored in this browser; choose the photo again.')
      return blob
    }
    return fetchBlob(assetUrl(ref))
  },
  resetDemo: async () => saveDemoCatalog(null),
}

// ---------------------------------------------------------------------------------------------
// Live (Supabase)
// ---------------------------------------------------------------------------------------------
function check<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message)
  return r.data
}

const liveApi: AdminApi = {
  mode: 'live',
  async session() {
    const db = await supabase()
    const { data } = await db.auth.getSession()
    return data.session?.user ? { email: data.session.user.email ?? '' } : null
  },
  async signIn(email, password) {
    const db = await supabase()
    const { error } = await db.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
  },
  async signOut() {
    const db = await supabase()
    await db.auth.signOut()
  },
  async isAdmin() {
    const db = await supabase()
    const { data } = await db.rpc('is_admin')
    return data === true
  },
  async loadCatalog() {
    const db = await supabase()
    const [settings, categories, products, zones] = await Promise.all([
      db.from('settings').select('data').eq('id', 1).single(),
      db.from('categories').select('*').order('sort'),
      db.from('products').select('*, product_variants(*)').order('created_at'),
      db.from('delivery_zones').select('*').order('sort'),
    ])
    return upgradeCatalog({
      settings: (check(settings) as { data: Settings }).data,
      categories: (check(categories) as CategoryRow[]).map(rowToCategory),
      products: (check(products) as ProductRow[]).map(rowToProduct),
      deliveryZones: (check(zones) as DeliveryZoneRow[]).map(rowToZone),
    })
  },
  async saveProduct(p) {
    const db = await supabase()
    check(await db.from('products').upsert(productToRow(p)))
    const keep = p.variants.map((v) => v.id)
    const existing = check(await db.from('product_variants').select('id').eq('product_id', p.id)) as { id: string }[]
    const removed = existing.map((v) => v.id).filter((id) => !keep.includes(id))
    if (removed.length) check(await db.from('product_variants').delete().eq('product_id', p.id).in('id', removed))
    if (p.variants.length) check(await db.from('product_variants').upsert(p.variants.map((v, i) => variantToRow(p.id, v, i))))
  },
  async deleteProduct(id) {
    const db = await supabase()
    check(await db.from('products').delete().eq('id', id))
  },
  async saveSettings(s) {
    const db = await supabase()
    check(await db.from('settings').upsert({ id: 1, data: s }))
  },
  async saveZones(zones) {
    const db = await supabase()
    const existing = check(await db.from('delivery_zones').select('id')) as { id: string }[]
    const removed = existing.map((z) => z.id).filter((id) => !zones.some((z) => z.id === id))
    if (removed.length) check(await db.from('delivery_zones').delete().in('id', removed))
    if (zones.length) check(await db.from('delivery_zones').upsert(zones.map(zoneToRow)))
  },
  async listOrders() {
    const db = await supabase()
    const rows = check(await db.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }).limit(500))
    return (rows as OrderRow[]).map(rowToOrder)
  },
  async setOrderStatus(number, status) {
    const db = await supabase()
    check(await db.rpc('set_order_status', { p_number: number, p_status: status }))
  },
  async uploadImage(file, name) {
    const db = await supabase()
    const path = `${name.replace(/[^a-z0-9-]/gi, '-').toLowerCase()}-${Date.now()}.webp`
    check(await db.storage.from('products').upload(path, file, { contentType: file.type || 'image/webp', upsert: false }))
    return db.storage.from('products').getPublicUrl(path).data.publicUrl
  },
  async uploadOriginal(file, name) {
    const db = await supabase()
    const ext = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' } as Record<string, string>)[file.type] ?? 'img'
    const path = `originals/${name.replace(/[^a-z0-9-]/gi, '-').toLowerCase()}-${Date.now()}.${ext}`
    check(await db.storage.from('products').upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false }))
    return db.storage.from('products').getPublicUrl(path).data.publicUrl
  },
  readOriginal: (ref) => fetchBlob(assetUrl(ref)),
}

export const adminApi: AdminApi = IS_LIVE ? liveApi : demoApi
