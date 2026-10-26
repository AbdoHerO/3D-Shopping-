import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { assetUrl } from '@/lib/assets'
import { priceOf, stockOf } from '@/lib/pricing'
import type { Product } from '@/lib/types'
import { useCatalog } from '@/state/catalog'
import { useUi } from '@/state/ui'
import { addToCart } from '@/three/actions'
import { Icon } from '@/ui/Icon'
import { PageShell } from '@/ui/PageShell'
import { Badges, Price } from '@/ui/ProductBits'
import { useLocale } from '@/ui/hooks'

type Sort = 'featured' | 'priceAsc' | 'priceDesc' | 'new'

function normalise(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

export function ProductCard({ p }: { p: Product }) {
  const { t, text } = useLocale()
  const select = useUi((s) => s.select)
  const openPanel = useUi((s) => s.openPanel)
  const variant = p.variants.find((v) => v.stock > 0) ?? p.variants[0] ?? null
  const out = stockOf(p, variant) <= 0
  const open = () => {
    select({ productId: p.id, variantId: variant?.id ?? null })
    openPanel('details')
  }
  return (
    <li className="group flex flex-col rounded-[22px] bg-white p-3 ring-1 ring-ink/5 transition hover:shadow-soft" data-testid="catalog-card">
      <button onClick={open} className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-gradient-to-b from-blush/60 to-rosewater/70">
        <img src={assetUrl(p.image)} alt={text(p.name)} loading="lazy" className="absolute inset-0 m-auto max-h-[78%] max-w-[68%] object-contain drop-shadow-lg transition duration-500 group-hover:-translate-y-1 group-hover:scale-[1.03]" />
        <span className="absolute start-2 top-2">
          <Badges product={p} variant={variant} />
        </span>
        {p.variants.some((v) => v.colorHex) && (
          <span className="absolute inset-x-0 bottom-2 flex justify-center gap-1">
            {p.variants.slice(0, 6).map((v) => (
              <span key={v.id} className="h-3 w-3 rounded-full ring-1 ring-white" style={{ background: v.colorHex }} />
            ))}
          </span>
        )}
      </button>
      <div className="mt-3 flex flex-1 flex-col">
        <p className="text-xs text-mist">{p.brand}</p>
        <button onClick={open} className="text-start font-display text-lg leading-snug text-ink hover:text-garnet">
          {text(p.name)}
        </button>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <Price product={p} variant={variant} className="font-medium" />
          <button
            className="grid h-10 w-10 place-items-center rounded-full bg-garnet text-white transition hover:bg-garnet-deep disabled:bg-ink/20"
            onClick={() => addToCart(p.id, variant?.id ?? null)}
            disabled={out}
            aria-label={`${t('product.add')}: ${text(p.name)}`}
          >
            <Icon name="plus" size={18} />
          </button>
        </div>
      </div>
    </li>
  )
}

export default function CatalogPage() {
  const { t, text } = useLocale()
  const catalog = useCatalog((s) => s.catalog)
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('featured')
  const category = params.get('c') ?? 'all'
  const noWebgl = params.get('noWebgl') === '1'

  const list = useMemo(() => {
    if (!catalog) return []
    const q = normalise(query.trim())
    let items = catalog.products.filter((p) => p.isActive)
    if (category !== 'all') items = items.filter((p) => p.categoryId === category)
    if (q) items = items.filter((p) => normalise(`${p.brand} ${p.name.fr} ${p.name.en} ${p.name.ar}`).includes(q))
    const price = (p: Product) => priceOf(p, p.variants[0] ?? null).effective
    const sorted = [...items]
    if (sort === 'priceAsc') sorted.sort((a, b) => price(a) - price(b))
    if (sort === 'priceDesc') sorted.sort((a, b) => price(b) - price(a))
    if (sort === 'new') sorted.sort((a, b) => Number(b.isNew) - Number(a.isNew))
    if (sort === 'featured') sorted.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured))
    return sorted
  }, [catalog, query, category, sort])

  return (
    <PageShell>
      {noWebgl && <p className="mt-4 rounded-2xl bg-champagne/15 p-3 text-sm">{t('store.noWebgl')}</p>}
      <div className="flex flex-wrap items-end justify-between gap-4 pt-8 pb-4">
        <div>
          <h1 className="font-display text-5xl text-garnet">{t('catalog.title')}</h1>
          <p className="mt-1 text-mist">{t('catalog.count', { count: list.length })}</p>
        </div>
        <Link to="/" className="btn-primary">
          <Icon name="store" size={18} />
          {t('catalog.open3d')}
        </Link>
      </div>
      <div className="sticky top-[68px] z-20 -mx-4 flex flex-col gap-3 bg-porcelain/95 px-4 py-3 backdrop-blur sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">{t('catalog.search')}</span>
          <Icon name="search" size={18} className="absolute start-3 top-1/2 -translate-y-1/2 text-mist" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('catalog.search')} className="field !rounded-full ps-10" type="search" data-testid="catalog-search" />
        </label>
        <label className="flex items-center gap-2 text-sm text-mist">
          {t('catalog.sort')}
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="field !w-auto !rounded-full !py-2">
            <option value="featured">{t('catalog.sortFeatured')}</option>
            <option value="priceAsc">{t('catalog.sortPriceAsc')}</option>
            <option value="priceDesc">{t('catalog.sortPriceDesc')}</option>
            <option value="new">{t('catalog.sortNew')}</option>
          </select>
        </label>
      </div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-4">
        {[{ id: 'all', name: null }, ...(catalog?.categories ?? [])].map((c) => {
          const active = category === c.id
          return (
            <button
              key={c.id}
              onClick={() => setParams(c.id === 'all' ? {} : { c: c.id })}
              className={`h-9 shrink-0 rounded-full px-4 text-sm font-medium transition ${active ? 'bg-garnet text-white' : 'bg-white ring-1 ring-ink/10 hover:ring-garnet/30'}`}
            >
              {c.name ? text(c.name) : t('catalog.all')}
            </button>
          )
        })}
      </div>
      {list.length === 0 ? (
        <p className="py-16 text-center text-mist">{t('catalog.none', { query })}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </ul>
      )}
    </PageShell>
  )
}
