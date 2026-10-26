import { useEffect, useMemo, useState } from 'react'
import { whatsappUrl } from '@/lib/whatsapp'
import { ORDER_STATUSES, type Order, type OrderStatus } from '@/lib/types'
import { Icon, WhatsAppIcon } from '@/ui/Icon'
import { useLocale } from '@/ui/hooks'
import { useAdmin } from './store'
import { Card } from './ui'
import { useA } from './text'

const LABELS: Record<OrderStatus, [string, string]> = {
  new: ['Nouvelle', 'New'],
  confirmed: ['Confirmée', 'Confirmed'],
  preparing: ['En préparation', 'Preparing'],
  shipped: ['Expédiée', 'Shipped'],
  delivered: ['Livrée', 'Delivered'],
  cancelled: ['Annulée', 'Cancelled'],
}
const COLORS: Record<OrderStatus, string> = {
  new: 'bg-garnet text-white',
  confirmed: 'bg-champagne/30 text-[#6d4f1d]',
  preparing: 'bg-champagne/30 text-[#6d4f1d]',
  shipped: 'bg-sky-100 text-sky-900',
  delivered: 'bg-sage/20 text-[#3c5642]',
  cancelled: 'bg-ink/10 text-ink/70',
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  const a = useA()
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${COLORS[status]}`}>{a(...LABELS[status])}</span>
}

/** Message the owner sends the customer to confirm, in the customer's language. */
function confirmMessage(o: Order, shop: string, total: string) {
  const first = o.customer.name.split(' ')[0]
  if (o.locale === 'ar') return `مرحباً ${first}، معك ${shop}. توصلنا بطلبك رقم ${o.number} (${total}). سنوصله إلى ${o.customer.city} قريباً. شكراً لثقتك!`
  if (o.locale === 'en') return `Hello ${first}, this is ${shop}. We received your order ${o.number} (${total}) and will deliver it to ${o.customer.city} soon. Thank you!`
  return `Bonjour ${first}, ici ${shop}. Nous avons bien reçu votre commande ${o.number} (${total}). Nous vous la livrons à ${o.customer.city} très vite. Merci !`
}

function csv(orders: Order[]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const head = ['number', 'date', 'status', 'name', 'phone', 'city', 'address', 'items', 'subtotal', 'delivery', 'total']
  const rows = orders.map((o) =>
    [
      o.number,
      o.createdAt,
      o.status,
      o.customer.name,
      o.customer.phone,
      o.customer.city,
      o.customer.address,
      o.items.map((i) => `${i.qty} x ${i.name}`).join(' | '),
      o.subtotal,
      o.deliveryFee,
      o.total,
    ]
      .map(esc)
      .join(','),
  )
  return [head.join(','), ...rows].join('\n')
}

export default function Orders() {
  const a = useA()
  const { money } = useLocale()
  const orders = useAdmin((s) => s.orders)
  const loadOrders = useAdmin((s) => s.loadOrders)
  const setStatus = useAdmin((s) => s.setOrderStatus)
  const settings = useAdmin((s) => s.catalog!.settings)
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    void loadOrders()
  }, [loadOrders])

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return orders.filter(
      (o) =>
        (filter === 'all' || o.status === filter) &&
        (!q || o.number.toLowerCase().includes(q) || o.customer.phone.includes(q) || o.customer.name.toLowerCase().includes(q)),
    )
  }, [orders, filter, query])
  const current = orders.find((o) => o.number === open) ?? null

  const download = () => {
    const blob = new Blob(['﻿' + csv(list)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `commandes-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <h1 className="font-display text-4xl text-garnet">{a('Commandes', 'Orders')}</h1>
        <button className="btn-quiet h-10 !py-0 text-sm" onClick={download} disabled={list.length === 0}>
          {a('Exporter (CSV)', 'Export (CSV)')}
        </button>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center print:hidden">
        <input className="field !rounded-full sm:max-w-xs" placeholder={a('N°, téléphone ou nom', 'Number, phone or name')} value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {(['all', ...ORDER_STATUSES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`h-9 shrink-0 rounded-full px-3 text-sm ${filter === s ? 'bg-garnet text-white' : 'bg-white ring-1 ring-ink/10'}`}
            >
              {s === 'all' ? a('Toutes', 'All') : a(...LABELS[s])} {s !== 'all' && `(${orders.filter((o) => o.status === s).length})`}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <Card className="print:hidden">
          {list.length === 0 ? (
            <p className="py-8 text-center text-sm text-mist">{a('Aucune commande.', 'No orders.')}</p>
          ) : (
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-start text-xs text-mist">
                  <tr>
                    <th className="px-2 py-1 text-start font-medium">N°</th>
                    <th className="px-2 py-1 text-start font-medium">{a('Date', 'Date')}</th>
                    <th className="px-2 py-1 text-start font-medium">{a('Cliente', 'Customer')}</th>
                    <th className="px-2 py-1 text-end font-medium">Total</th>
                    <th className="px-2 py-1 text-start font-medium">{a('Statut', 'Status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((o) => (
                    <tr key={o.number} onClick={() => setOpen(o.number)} className={`cursor-pointer border-t border-ink/5 hover:bg-blush/50 ${open === o.number ? 'bg-blush/70' : ''}`}>
                      <td className="px-2 py-2 font-medium whitespace-nowrap">{o.number}</td>
                      <td className="px-2 py-2 whitespace-nowrap text-mist">{new Date(o.createdAt).toLocaleString()}</td>
                      <td className="px-2 py-2">
                        {o.customer.name}
                        <span className="block text-xs text-mist">{o.customer.city}</span>
                      </td>
                      <td className="px-2 py-2 text-end tabular-nums">{money(o.total)}</td>
                      <td className="px-2 py-2">
                        <StatusBadge status={o.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        {current && (
          <Card
            title={current.number}
            actions={
              <button className="grid h-9 w-9 place-items-center rounded-full hover:bg-ink/5 print:hidden" onClick={() => setOpen(null)} aria-label="×">
                <Icon name="close" size={18} />
              </button>
            }
          >
            <div className="flex flex-col gap-3 text-sm">
              <p className="text-mist">{new Date(current.createdAt).toLocaleString()}</p>
              <div>
                <p className="font-medium">{current.customer.name}</p>
                <p dir="ltr" className="text-start">{current.customer.phone}</p>
                <p>
                  {current.customer.address}, {current.customer.city}
                </p>
                {current.customer.preferredTime && <p className="text-mist">🕒 {current.customer.preferredTime}</p>}
                {current.customer.notes && <p className="text-mist">📝 {current.customer.notes}</p>}
              </div>
              <div className="flex flex-wrap gap-2 print:hidden">
                <a className="btn-quiet h-9 !py-0 text-sm" href={`tel:${current.customer.phone}`}>
                  {a('Appeler', 'Call')}
                </a>
                <a
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#1f9d55] px-3 text-sm font-medium text-white"
                  href={whatsappUrl(current.customer.phone, confirmMessage(current, settings.shopName, money(current.total)))}
                  target="_blank"
                  rel="noreferrer"
                >
                  <WhatsAppIcon size={16} />
                  {a('Confirmer sur WhatsApp', 'Confirm on WhatsApp')}
                </a>
                <button className="btn-quiet h-9 !py-0 text-sm" onClick={() => window.print()}>
                  {a('Bon de livraison', 'Delivery slip')}
                </button>
              </div>
              <ul className="divide-y divide-ink/5 rounded-2xl ring-1 ring-ink/10">
                {current.items.map((i, k) => (
                  <li key={k} className="flex justify-between gap-2 px-3 py-2">
                    <span>
                      {i.qty} × {i.name}
                    </span>
                    <span className="tabular-nums">{money(i.lineTotal)}</span>
                  </li>
                ))}
              </ul>
              <dl className="grid grid-cols-[1fr_auto] gap-1">
                <dt className="text-mist">{a('Sous-total', 'Subtotal')}</dt>
                <dd className="text-end tabular-nums">{money(current.subtotal)}</dd>
                <dt className="text-mist">{a('Livraison', 'Delivery')}</dt>
                <dd className="text-end tabular-nums">{money(current.deliveryFee)}</dd>
                <dt className="font-medium">Total</dt>
                <dd className="text-end font-medium tabular-nums">{money(current.total)}</dd>
              </dl>
              <label className="block print:hidden">
                <span className="mb-1 block font-medium">{a('Statut', 'Status')}</span>
                <select
                  className="field"
                  value={current.status}
                  disabled={current.status === 'cancelled'}
                  onChange={(e) => void setStatus(current.number, e.target.value as OrderStatus)}
                  data-testid="order-status"
                >
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {a(...LABELS[s])}
                    </option>
                  ))}
                </select>
                {current.status !== 'cancelled' && <span className="mt-1 block text-xs text-mist">{a('Annuler remet les articles en stock.', 'Cancelling puts the items back in stock.')}</span>}
              </label>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
