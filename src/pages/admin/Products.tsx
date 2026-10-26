import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { assetUrl } from '@/lib/assets'
import { priceOf } from '@/lib/pricing'
import { Icon } from '@/ui/Icon'
import { useLocale } from '@/ui/hooks'
import { useAdmin } from './store'
import { Card, Toggle } from './ui'
import { useA } from './text'

export default function Products() {
  const a = useA()
  const { text, money } = useLocale()
  const catalog = useAdmin((s) => s.catalog)!
  const save = useAdmin((s) => s.saveProduct)
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('all')

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return catalog.products.filter(
      (p) =>
        (cat === 'all' || p.categoryId === cat) &&
        (!q || `${p.brand} ${p.name.fr} ${p.name.en} ${p.name.ar} ${p.slug}`.toLowerCase().includes(q)),
    )
  }, [catalog, query, cat])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-4xl text-garnet">{a('Produits', 'Products')}</h1>
        <Link to="/admin/products/new" className="btn-primary h-10 !py-0 text-sm" data-testid="new-product">
          <Icon name="plus" size={18} />
          {a('Nouveau produit', 'New product')}
        </Link>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input className="field !rounded-full sm:max-w-xs" placeholder={a('Rechercher', 'Search')} value={query} onChange={(e) => setQuery(e.target.value)} />
        <select className="field !w-auto !rounded-full" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="all">{a('Toutes les catégories', 'All categories')}</option>
          {catalog.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {text(c.name)}
            </option>
          ))}
        </select>
      </div>
      <Card>
        <p className="mb-2 text-sm text-mist">
          {list.length} / {catalog.products.length}
        </p>
        <ul className="divide-y divide-ink/5">
          {list.map((p) => {
            const stock = p.variants.length ? p.variants.reduce((s, v) => s + v.stock, 0) : p.stock
            const price = priceOf(p, p.variants[0] ?? null)
            return (
              <li key={p.id} className="flex items-center gap-3 py-2">
                <img src={assetUrl(p.image)} alt="" className="h-12 w-10 shrink-0 object-contain" />
                <Link to={`/admin/products/${p.id}`} className="min-w-0 flex-1">
                  <p className="truncate font-medium hover:text-garnet">{text(p.name)}</p>
                  <p className="truncate text-xs text-mist">
                    {p.brand} · {p.sizeLabel} {p.variants.length > 0 && `· ${p.variants.length} ${a('variantes', 'variants')}`}
                    {!p.placement && ` · ${a('pas en rayon', 'not on a shelf')}`}
                  </p>
                </Link>
                <span className="hidden text-sm tabular-nums sm:block">{money(price.effective)}</span>
                <span className={`w-12 text-end text-sm tabular-nums ${stock <= 3 ? 'text-danger' : 'text-mist'}`}>{stock}</span>
                <Toggle checked={p.isActive} onChange={(v) => void save({ ...p, isActive: v })} label="" />
              </li>
            )
          })}
        </ul>
      </Card>
    </div>
  )
}
