export type Locale = 'fr' | 'ar' | 'en'
export const LOCALES: Locale[] = ['fr', 'ar', 'en']

/** A string translated into every supported language. */
export type I18nText = Record<Locale, string>

export type ProductShape =
  | 'bottle'
  | 'pump'
  | 'spray'
  | 'dropper'
  | 'jar'
  | 'tube'
  | 'perfume'
  | 'lipstick'
  | 'gloss'
  | 'pen'
  | 'compact'
  | 'palette'
  | 'polish'
  | 'box'
  | 'pouch'
  | 'roll'

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
