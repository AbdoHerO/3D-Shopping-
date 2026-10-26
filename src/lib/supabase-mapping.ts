/** Converts between database rows (snake_case, see supabase/migrations) and app types. */
import { normaliseFamily } from './packaging'
import type { Category, DeliveryZone, Order, OrderStatus, Product, ProductAsset, ProductSource, Variant } from './types'

export interface ProductRow {
  id: string
  slug: string
  category_id: string
  brand: string
  name: Product['name']
  description: Product['description']
  how_to_use: Product['howToUse']
  ingredients: string | null
  size_label: string
  price: number
  promo_price: number | null
  stock: number
  is_active: boolean
  is_featured: boolean
  is_new: boolean
  shape: Product['shape']
  width_cm: number
  height_cm: number
  depth_cm: number
  image: string
  gallery: string[] | null
  fixture_id: string | null
  shelf_level: number | null
  slot_order: number | null
  facings: number | null
  display_variants: boolean
  /** Added by 20261026000200_product_assets.sql. */
  orientation?: 'upright' | 'flat'
  display_scale?: number
  asset?: ProductAsset | null
  source?: ProductSource | null
  product_variants?: VariantRow[]
}

export interface VariantRow {
  id: string
  product_id: string
  name: Variant['name']
  color_hex: string | null
  price: number | null
  promo_price: number | null
  stock: number
  image: string | null
  sort: number
}

const num = (v: unknown) => (v == null ? null : Number(v))

export function rowToProduct(r: ProductRow): Product {
  const variants = (r.product_variants ?? [])
    .slice()
    .sort((a, b) => a.sort - b.sort)
    .map(
      (v): Variant => ({
        id: v.id,
        name: v.name,
        colorHex: v.color_hex ?? undefined,
        price: num(v.price),
        promoPrice: num(v.promo_price),
        stock: v.stock,
        image: v.image,
      }),
    )
  return {
    id: r.id,
    slug: r.slug,
    categoryId: r.category_id,
    brand: r.brand,
    name: r.name,
    description: r.description,
    howToUse: r.how_to_use,
    ingredients: r.ingredients,
    sizeLabel: r.size_label,
    price: Number(r.price),
    promoPrice: num(r.promo_price),
    stock: r.stock,
    isActive: r.is_active,
    isFeatured: r.is_featured,
    isNew: r.is_new,
    shape: normaliseFamily(r.shape),
    widthCm: Number(r.width_cm),
    heightCm: Number(r.height_cm),
    depthCm: Number(r.depth_cm),
    image: r.image,
    gallery: r.gallery ?? [],
    placement:
      r.fixture_id != null
        ? {
            fixtureId: r.fixture_id,
            level: r.shelf_level ?? 0,
            slot: r.slot_order ?? 0,
            facings: r.facings ?? 2,
            ...(r.orientation === 'flat' ? { orientation: 'flat' as const } : {}),
            ...(r.display_scale != null && Number(r.display_scale) !== 1 ? { scale: Number(r.display_scale) } : {}),
          }
        : null,
    variants,
    displayVariants: r.display_variants,
    asset: r.asset ?? null,
    source: r.source ?? null,
  }
}

export function productToRow(p: Product): Omit<ProductRow, 'product_variants'> {
  return {
    id: p.id,
    slug: p.slug,
    category_id: p.categoryId,
    brand: p.brand,
    name: p.name,
    description: p.description,
    how_to_use: p.howToUse ?? null,
    ingredients: p.ingredients ?? null,
    size_label: p.sizeLabel,
    price: p.price,
    promo_price: p.promoPrice ?? null,
    stock: p.stock,
    is_active: p.isActive,
    is_featured: p.isFeatured,
    is_new: p.isNew,
    shape: p.shape,
    width_cm: p.widthCm,
    height_cm: p.heightCm,
    depth_cm: p.depthCm,
    image: p.image,
    gallery: p.gallery,
    fixture_id: p.placement?.fixtureId ?? null,
    shelf_level: p.placement?.level ?? null,
    slot_order: p.placement?.slot ?? null,
    facings: p.placement?.facings ?? null,
    display_variants: p.displayVariants,
    orientation: p.placement?.orientation ?? 'upright',
    display_scale: p.placement?.scale ?? 1,
    asset: p.asset ?? null,
    source: p.source ?? null,
  }
}

export function variantToRow(productId: string, v: Variant, sort: number): VariantRow {
  return {
    id: v.id,
    product_id: productId,
    name: v.name,
    color_hex: v.colorHex ?? null,
    price: v.price ?? null,
    promo_price: v.promoPrice ?? null,
    stock: v.stock,
    image: v.image ?? null,
    sort,
  }
}

export interface CategoryRow {
  id: string
  slug: string
  name: Category['name']
  sort: number
}
export const rowToCategory = (r: CategoryRow): Category => ({ ...r })

export interface DeliveryZoneRow {
  id: string
  city: string
  fee: number
  eta: DeliveryZone['eta']
  is_active: boolean
  sort: number
}
export const rowToZone = (r: DeliveryZoneRow): DeliveryZone => ({
  id: r.id,
  city: r.city,
  fee: Number(r.fee),
  eta: r.eta,
  isActive: r.is_active,
})
export const zoneToRow = (z: DeliveryZone, sort: number): DeliveryZoneRow => ({
  id: z.id,
  city: z.city,
  fee: z.fee,
  eta: z.eta,
  is_active: z.isActive,
  sort,
})

export interface OrderRow {
  number: string
  status: OrderStatus
  customer_name: string
  phone: string
  city: string
  address: string
  notes: string | null
  preferred_time: string | null
  payment_method: 'cod'
  subtotal: number
  delivery_fee: number
  total: number
  locale: Order['locale']
  created_at: string
  order_items?: {
    product_id: string
    variant_id: string | null
    name_snapshot: string
    unit_price: number
    qty: number
    line_total: number
  }[]
}

export const rowToOrder = (r: OrderRow): Order => ({
  number: r.number,
  status: r.status,
  customer: {
    name: r.customer_name,
    phone: r.phone,
    city: r.city,
    address: r.address,
    notes: r.notes ?? undefined,
    preferredTime: r.preferred_time ?? undefined,
  },
  items: (r.order_items ?? []).map((i) => ({
    productId: i.product_id,
    variantId: i.variant_id,
    name: i.name_snapshot,
    unitPrice: Number(i.unit_price),
    qty: i.qty,
    lineTotal: Number(i.line_total),
  })),
  subtotal: Number(r.subtotal),
  deliveryFee: Number(r.delivery_fee),
  total: Number(r.total),
  paymentMethod: 'cod',
  locale: r.locale,
  createdAt: r.created_at,
})
