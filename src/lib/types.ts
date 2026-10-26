import type { Orientation, PackageFamily } from './packaging'

export type Locale = 'fr' | 'ar' | 'en'
export const LOCALES: Locale[] = ['fr', 'ar', 'en']

/** A string translated into every supported language. */
export type I18nText = Record<Locale, string>

/** The product's package family (see src/lib/packaging.ts); the field keeps its first name, `shape`. */
export type ProductShape = PackageFamily

export interface Variant {
  id: string
  name: I18nText
  colorHex?: string
  /** Overrides the product price when set. */
  price?: number | null
  promoPrice?: number | null
  stock: number
  image?: string | null
}

export interface Placement {
  fixtureId: string
  level: number
  slot: number
  facings: number
  /** Standing (default) or lying face up, e.g. palettes under the counter glass. */
  orientation?: Orientation
  /** Display scale override (1 = real size). */
  scale?: number
}

export type AssetStatus = 'pending' | 'processing' | 'ready' | 'review' | 'failed'

/**
 * How a product is drawn in 3D. Prices, stock and variants never live here: the catalogue
 * record stays the single source of truth; this only describes the picture and the model.
 */
export interface ProductAsset {
  /** Increments each time the asset is prepared again. */
  version: number
  status: AssetStatus
  error: string | null
  /** ISO time of the last preparation run. */
  updatedAt: string | null
  /** Whether `shape` was inferred automatically or chosen by the admin. */
  familySource: 'auto' | 'manual'
  /** The untouched upload (kept for reprocessing). */
  original: string | null
  /** Transparent cut-out used on the model (usually the same file as `image`). Null = card fallback. */
  cutout: string | null
  /** Silhouette half-widths from bottom to top, 0..1, measured on the cut-out. */
  profile: number[] | null
  /** Packaging colour for the sides and back of the model. */
  color: string | null
  /** True when widthCm/heightCm/depthCm are estimates rather than measured. */
  dimsEstimated: boolean
  /** Procedural model (always available) or a model returned by an image-to-3D provider. */
  model: { source: 'procedural' | 'generated'; url: string | null; provider: string | null; jobId: string | null }
  review: 'none' | 'needed' | 'approved'
  /** Human-readable reasons for review, in English (shown in the admin). */
  notes: string[]
  /** Per-variant pictures prepared the same way (shade photos). */
  variants?: Record<string, { original: string | null; cutout: string | null; color: string | null }>
}

/** Where a product record came from, for traceability and attribution. */
export interface ProductSource {
  kind: 'manual' | 'demo' | 'import'
  name: string | null
  id: string | null
  url: string | null
  /** Licence or written permission the import relied on. */
  license: string | null
  attribution: string | null
}

export interface Product {
  id: string
  slug: string
  categoryId: string
  brand: string
  name: I18nText
  description: I18nText
  howToUse?: I18nText | null
  ingredients?: string | null
  sizeLabel: string
  price: number
  promoPrice?: number | null
  stock: number
  isActive: boolean
  isFeatured: boolean
  isNew: boolean
  shape: ProductShape
  widthCm: number
  heightCm: number
  depthCm: number
  image: string
  gallery: string[]
  placement: Placement | null
  variants: Variant[]
  /** Show every variant as its own bottle on the shelf (nail polish, lipstick shades). */
  displayVariants: boolean
  asset?: ProductAsset | null
  source?: ProductSource | null
}

export interface Category {
  id: string
  slug: string
  name: I18nText
  sort: number
}

export interface DeliveryZone {
  id: string
  city: string
  fee: number
  eta: I18nText
  isActive: boolean
}

export interface StoreDims {
  width: number
  depth: number
  ceiling: number
}

/** The street sign. Defaults to the shop name; the photo reference reads "TIFAWIN / PARFUMERIE". */
export interface Storefront {
  title: string
  subtitle: string
  /** Optional logo image shown left of the title. */
  logoUrl: string | null
}

export interface Settings {
  shopName: string
  tagline: I18nText
  logoUrl?: string | null
  primaryColor: string
  accentColor: string
  whatsappNumber: string
  currency: string
  currencyLabel: I18nText
  defaultLocale: Locale
  orderPrefix: string
  address: I18nText
  openingHours: I18nText
  instagramUrl?: string | null
  freeDeliveryThreshold?: number | null
  store: StoreDims
  /** Sign texts per fixture id, editable by the owner. */
  fixtureLabels: Record<string, I18nText>
  storefront?: Storefront
}

export interface Catalog {
  settings: Settings
  categories: Category[]
  products: Product[]
  deliveryZones: DeliveryZone[]
}

export interface CartLine {
  productId: string
  variantId: string | null
  qty: number
}

export type OrderStatus = 'new' | 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'cancelled'
export const ORDER_STATUSES: OrderStatus[] = ['new', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled']

export interface OrderItem {
  productId: string
  variantId: string | null
  name: string
  unitPrice: number
  qty: number
  lineTotal: number
}

export interface CustomerInfo {
  name: string
  phone: string
  city: string
  address: string
  notes?: string
  preferredTime?: string
}

export interface Order {
  number: string
  status: OrderStatus
  customer: CustomerInfo
  items: OrderItem[]
  subtotal: number
  deliveryFee: number
  total: number
  paymentMethod: 'cod'
  locale: Locale
  createdAt: string
}
