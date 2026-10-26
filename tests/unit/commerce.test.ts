import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { computeTotals, priceOf } from '@/lib/pricing'
import { buildWhatsAppMessage, normalisePhone, whatsappUrl } from '@/lib/whatsapp'
import { makeOrderNumber } from '@/lib/order-number'
import { formatMoney } from '@/lib/money'
import type { Catalog, Order } from '@/lib/types'

const catalog = JSON.parse(readFileSync('public/data/catalog.json', 'utf8')) as Catalog
const product = (id: string) => catalog.products.find((p) => p.id === id)!
const zone = (id: string) => catalog.deliveryZones.find((z) => z.id === id)!

describe('pricing', () => {
  it('uses the promo price when it is lower', () => {
    expect(priceOf(product('serum-vitamine-c'))).toEqual({ price: 189, promo: 159, effective: 159 })
  })

  it('uses variant prices (perfume sizes)', () => {
    const p = product('edp-rose-de-damas')
    expect(priceOf(p, p.variants[1]).effective).toBe(549)
  })

  it('adds the delivery fee of the chosen city', () => {
    const t = computeTotals([{ productId: 'shampooing-argan', variantId: null, qty: 2 }], catalog, zone('rabat'))
    expect(t.subtotal).toBe(178)
    expect(t.deliveryFee).toBe(30)
    expect(t.total).toBe(208)
  })

  it('offers delivery above the threshold', () => {
    const t = computeTotals([{ productId: 'edp-oud-ambre', variantId: '100ml', qty: 1 }], catalog, zone('agadir'))
    expect(t.subtotal).toBe(649)
    expect(t.freeDelivery).toBe(true)
    expect(t.total).toBe(649)
  })

  it('caps quantities to stock and drops unavailable lines', () => {
    const stock = product('shampooing-argan').stock
    const t = computeTotals(
      [
        { productId: 'shampooing-argan', variantId: null, qty: 999 },
        { productId: 'chouchous-satin', variantId: null, qty: 1 },
        { productId: 'does-not-exist', variantId: null, qty: 1 },
      ],
      catalog,
    )
    expect(t.lines[0].qty).toBe(stock)
    expect(t.dropped).toHaveLength(2)
  })
})

describe('WhatsApp order', () => {
  const order: Order = {
    number: 'ML-261026-AB2C',
    status: 'new',
    customer: { name: 'Salma Bennani', phone: '+212612345678', city: 'Casablanca', address: '12 rue des Lilas', notes: 'Sonner deux fois' },
    items: [{ productId: 'x', variantId: null, name: 'Huile d’argan sublimatrice', unitPrice: 149, qty: 2, lineTotal: 298 }],
    subtotal: 298,
    deliveryFee: 25,
    total: 323,
    paymentMethod: 'cod',
    locale: 'fr',
    createdAt: '2026-10-26T10:00:00Z',
  }

  it('builds a complete French message', () => {
    const msg = buildWhatsAppMessage(order, catalog.settings)
    expect(msg).toContain('#ML-261026-AB2C')
    expect(msg).toContain('• 2 × Huile d’argan sublimatrice — 298 DH')
    expect(msg).toContain('Livraison : Casablanca — 25 DH')
    expect(msg).toContain('Total : 323 DH (paiement à la livraison)')
    expect(msg).toContain('Remarque : Sonner deux fois')
  })

  it('writes the message in Arabic for Arabic customers', () => {
    const msg = buildWhatsAppMessage({ ...order, locale: 'ar' }, catalog.settings)
    expect(msg).toContain('المجموع')
    expect(msg).toContain('د.م.')
  })

  it('creates a wa.me link with the encoded text', () => {
    expect(whatsappUrl('+212 600-000000', 'Bonjour & merci')).toBe('https://wa.me/212600000000?text=Bonjour%20%26%20merci')
  })

  it.each([
    ['06 12 34 56 78', '+212612345678'],
    ['+212 7 12 34 56 78', '+212712345678'],
    ['00212612345678', '+212612345678'],
    ['+33 6 12 34 56 78', '+33612345678'],
    ['12345', null],
    ['06 12 34', null],
  ])('normalises %s', (input, out) => {
    expect(normalisePhone(input)).toBe(out)
  })
})

describe('misc', () => {
  it('formats order numbers', () => {
    expect(makeOrderNumber('ML', new Date(2026, 9, 26), () => 0)).toBe('ML-261026-2222')
  })

  it('formats money per locale', () => {
    expect(formatMoney(1250, 'fr', catalog.settings).replace(/\s/g, ' ')).toBe('1 250 DH')
    expect(formatMoney(35, 'en', catalog.settings)).toBe('35 MAD')
    expect(formatMoney(35, 'ar', catalog.settings)).toBe('35 د.م.')
  })
})
