import { formatMoney } from './money'
import type { Locale, Order, Settings } from './types'

const COPY = {
  fr: {
    hello: 'Bonjour 👋 Je souhaite passer la commande',
    delivery: 'Livraison',
    free: 'offerte',
    total: 'Total',
    cod: 'paiement à la livraison',
    name: 'Nom',
    phone: 'Tél',
    address: 'Adresse',
    notes: 'Remarque',
    time: 'Créneau',
  },
  en: {
    hello: 'Hello 👋 I would like to place order',
    delivery: 'Delivery',
    free: 'free',
    total: 'Total',
    cod: 'cash on delivery',
    name: 'Name',
    phone: 'Phone',
    address: 'Address',
    notes: 'Note',
    time: 'Time slot',
  },
  ar: {
    hello: 'مرحباً 👋 أود تأكيد الطلب',
    delivery: 'التوصيل',
    free: 'مجاني',
    total: 'المجموع',
    cod: 'الدفع عند الاستلام',
    name: 'الاسم',
    phone: 'الهاتف',
    address: 'العنوان',
    notes: 'ملاحظة',
    time: 'الوقت المفضل',
  },
} satisfies Record<Locale, Record<string, string>>

/** The order text the customer sends to the shop on WhatsApp, in the customer's language. */
export function buildWhatsAppMessage(order: Order, settings: Settings, locale: Locale = order.locale): string {
  const c = COPY[locale]
  const money = (n: number) => formatMoney(n, locale, settings)
  const lines = [
    `${c.hello} #${order.number}`,
    '',
    ...order.items.map((i) => `• ${i.qty} × ${i.name} — ${money(i.lineTotal)}`),
    '',
    `${c.delivery} : ${order.customer.city} — ${order.deliveryFee > 0 ? money(order.deliveryFee) : c.free}`,
    `${c.total} : ${money(order.total)} (${c.cod})`,
    '',
    `${c.name} : ${order.customer.name}`,
    `${c.phone} : ${order.customer.phone}`,
    `${c.address} : ${order.customer.address}`,
  ]
  if (order.customer.preferredTime) lines.push(`${c.time} : ${order.customer.preferredTime}`)
  if (order.customer.notes) lines.push(`${c.notes} : ${order.customer.notes}`)
  return lines.join('\n')
}

export function whatsappUrl(number: string, text: string) {
  const digits = number.replace(/[^\d]/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

/** Normalises Moroccan and international phone numbers to +<digits>; returns null when invalid. */
export function normalisePhone(input: string, defaultCountry = '212'): string | null {
  let d = input.replace(/[^\d+]/g, '')
  if (d.startsWith('+')) d = d.slice(1)
  else if (d.startsWith('00')) d = d.slice(2)
  else if (d.startsWith('0')) d = defaultCountry + d.slice(1)
  if (!/^\d{9,15}$/.test(d)) return null
  if (d.startsWith('212') && !/^212[5-7]\d{8}$/.test(d)) return null
  return `+${d}`
}
