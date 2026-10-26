import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { assetUrl } from '@/lib/assets'
import { useLocale } from '@/ui/hooks'
import { useAdmin } from './store'
import { Card } from './ui'
import { useA } from './text'
import { StatusBadge } from './Orders'

export default function Dashboard() {
  const a = useA()
  const { money, text } = useLocale()
  const catalog = useAdmin((s) => s.catalog)!
  const orders = useAdmin((s) => s.orders)
  const [now] = useState(() => Date.now())

  const stats = useMemo(() => {
    const day = 24 * 3600 * 1000
    const live = orders.filter((o) => o.status !== 'cancelled')
    const today = live.filter((o) => now - new Date(o.createdAt).getTime() < day)
    const week = live.filter((o) => now - new Date(o.createdAt).getTime() < 7 * day)
    const sold = new Map<string, { name: string; qty: number }>()
    for (const o of live) for (const i of o.items) sold.set(i.productId, { name: i.name.split(' — ')[0], qty: (sold.get(i.productId)?.qty ?? 0) + i.qty })
    return {
      today: today.length,
      week: week.length,
      revenue: week.reduce((s, o) => s + o.total, 0),
      pending: orders.filter((o) => o.status === 'new').length,
      best: [...sold.entries()].sort((x, y) => y[1].qty - x[1].qty).slice(0, 5),
    }
  }, [orders, now])

  const lowStock = catalog.products
    .flatMap((p) =>
      p.variants.length
        ? p.variants.filter((v) => v.stock <= 3).map((v) => ({ p, label: `${text(p.name)} — ${text(v.name)}`, stock: v.stock }))
        : p.stock <= 3
          ? [{ p, label: text(p.name), stock: p.stock }]
          : [],
    )
    .slice(0, 8)

  const kpis = [
    { label: a("Commandes aujourd'hui", 'Orders today'), value: stats.today },
    { label: a('Commandes sur 7 jours', 'Orders, last 7 days'), value: stats.week },
    { label: a("Chiffre d'affaires 7 jours", 'Revenue, last 7 days'), value: money(stats.revenue) },
    { label: a('À confirmer', 'To confirm'), value: stats.pending },
  ]

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-4xl text-garnet">{a('Tableau de bord', 'Dashboard')}</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-[22px] bg-white p-4 ring-1 ring-ink/5">
            <p className="text-sm text-mist">{k.label}</p>
            <p className="mt-1 font-display text-3xl tabular-nums text-ink">{k.value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={a('Dernières commandes', 'Latest orders')} className="lg:col-span-2" actions={<Link className="text-sm text-garnet" to="/admin/orders">{a('Tout voir', 'See all')}</Link>}>
          {orders.length === 0 ? (
            <p className="text-sm text-mist">{a('Aucune commande pour le moment.', 'No orders yet.')}</p>
          ) : (
            <ul className="divide-y divide-ink/5">
              {orders.slice(0, 6).map((o) => (
                <li key={o.number} className="flex items-center gap-3 py-2 text-sm">
                  <span className="font-medium">{o.number}</span>
                  <span className="truncate text-mist">{o.customer.name} · {o.customer.city}</span>
                  <span className="ms-auto tabular-nums">{money(o.total)}</span>
                  <StatusBadge status={o.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title={a('Meilleures ventes', 'Best sellers')}>
          {stats.best.length === 0 ? (
            <p className="text-sm text-mist">—</p>
          ) : (
            <ol className="flex flex-col gap-1 text-sm">
              {stats.best.map(([id, b]) => (
                <li key={id} className="flex justify-between gap-2">
                  <span className="truncate">{b.name}</span>
                  <span className="tabular-nums text-mist">× {b.qty}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
      <Card title={a('Stock bas', 'Low stock')}>
        {lowStock.length === 0 ? (
          <p className="text-sm text-mist">{a('Tout est bien approvisionné.', 'Everything is well stocked.')}</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {lowStock.map((l, i) => (
              <li key={i}>
                <Link to={`/admin/products/${l.p.id}`} className="flex items-center gap-3 rounded-2xl bg-blush/50 p-2 text-sm hover:bg-blush">
                  <img src={assetUrl(l.p.image)} alt="" className="h-10 w-8 object-contain" />
                  <span className="min-w-0 flex-1 truncate">{l.label}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${l.stock === 0 ? 'bg-danger text-white' : 'bg-champagne/30'}`}>{l.stock}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
