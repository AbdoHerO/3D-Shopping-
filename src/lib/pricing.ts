import type { CartLine, Catalog, DeliveryZone, Product, Variant } from './types'
import { cents } from './money'

export interface PriceInfo {
  /** Regular price */
  price: number
  /** Promotional price when lower than the regular price */
  promo: number | null
  /** What the customer pays */
  effective: number
}

export function priceOf(product: Product, variant?: Variant | null): PriceInfo {
  const price = variant?.price ?? product.price
  const promoCandidate = variant?.promoPrice ?? (variant?.price != null ? null : product.promoPrice)
  const promo = promoCandidate != null && promoCandidate < price ? promoCandidate : null
  return { price, promo, effective: promo ?? price }
}

export function stockOf(product: Product, variant?: Variant | null) {
  return variant ? variant.stock : product.stock
}

export interface PricedLine extends CartLine {
  product: Product
  variant: Variant | null
  unitPrice: number
  lineTotal: number
  available: number
}

export interface Totals {
  lines: PricedLine[]
  /** Lines removed because the product is gone, inactive or out of stock. */
  dropped: CartLine[]
  itemCount: number
  subtotal: number
  deliveryFee: number
  freeDelivery: boolean
  total: number
}

/**
 * Prices a cart from the catalog. The same rules run in the database (place_order) for live
 * orders; this copy is for display and for demo-mode WhatsApp orders.
 */
export function computeTotals(lines: CartLine[], catalog: Catalog, zone?: DeliveryZone | null): Totals {
  const byId = new Map(catalog.products.map((p) => [p.id, p]))
  const priced: PricedLine[] = []
  const dropped: CartLine[] = []
  for (const line of lines) {
    const product = byId.get(line.productId)
    const variant = line.variantId ? (product?.variants.find((v) => v.id === line.variantId) ?? null) : null
    if (!product || !product.isActive || (line.variantId && !variant)) {
      dropped.push(line)
      continue
    }
    const available = stockOf(product, variant)
    if (available <= 0) {
      dropped.push(line)
      continue
    }
    const qty = Math.min(line.qty, available)
    const unit = priceOf(product, variant).effective
    priced.push({ ...line, qty, product, variant, unitPrice: unit, lineTotal: cents(unit * qty), available })
  }
  const subtotal = cents(priced.reduce((s, l) => s + l.lineTotal, 0))
  const threshold = catalog.settings.freeDeliveryThreshold
  const freeDelivery = Boolean(threshold && subtotal >= threshold)
  const deliveryFee = zone && priced.length > 0 && !freeDelivery ? zone.fee : 0
  return {
    lines: priced,
    dropped,
    itemCount: priced.reduce((s, l) => s + l.qty, 0),
    subtotal,
    deliveryFee,
    freeDelivery,
    total: cents(subtotal + deliveryFee),
  }
}
