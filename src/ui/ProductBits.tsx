import { priceOf, stockOf } from '@/lib/pricing'
import type { Product, Variant } from '@/lib/types'
import { Icon } from './Icon'
import { useLocale } from './hooks'

export function Price({ product, variant, className = '' }: { product: Product; variant?: Variant | null; className?: string }) {
  const { money } = useLocale()
  const p = priceOf(product, variant)
  return (
    <span className={`inline-flex items-baseline gap-2 tabular-nums ${className}`}>
      <span className={p.promo ? 'text-garnet' : ''}>{money(p.effective)}</span>
      {p.promo != null && <s className="text-[0.82em] text-mist">{money(p.price)}</s>}
    </span>
  )
}

export function Badges({ product, variant }: { product: Product; variant?: Variant | null }) {
  const { t } = useLocale()
  const p = priceOf(product, variant)
  const stock = stockOf(product, variant)
  return (
    <span className="flex flex-wrap gap-1.5">
      {p.promo != null && (
        <span className="rounded-full bg-garnet px-2 py-0.5 text-[11px] font-medium text-white">
          {t('product.promo')} −{Math.round((1 - p.promo / p.price) * 100)}%
        </span>
      )}
      {product.isNew && <span className="rounded-full bg-champagne/25 px-2 py-0.5 text-[11px] font-medium text-[#7a5a26]">{t('product.new')}</span>}
      {stock <= 0 && <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[11px] font-medium text-ink">{t('product.outOfStock')}</span>}
      {stock > 0 && stock <= 3 && <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-medium text-danger">{t('product.lowStock', { count: stock })}</span>}
    </span>
  )
}

export function VariantPicker({
  product,
  value,
  onChange,
}: {
  product: Product
  value: string | null
  onChange: (id: string) => void
}) {
  const { t, text, money } = useLocale()
  if (product.variants.length === 0) return null
  const swatches = product.variants.every((v) => v.colorHex)
  const current = product.variants.find((v) => v.id === value)
  return (
    <fieldset>
      <legend className="mb-1.5 text-xs text-mist">
        {swatches ? t('product.shade') : t('product.size')}
        {current && swatches && <span className="ms-1.5 font-medium text-ink">{text(current.name)}</span>}
      </legend>
      <div className="flex flex-wrap gap-1.5" role="radiogroup">
        {product.variants.map((v) => {
          const active = v.id === value
          const out = v.stock <= 0
          return swatches ? (
            <button
              key={v.id}
              role="radio"
              aria-checked={active}
              aria-label={text(v.name) + (out ? ` (${t('product.outOfStock')})` : '')}
              title={text(v.name)}
              onClick={() => onChange(v.id)}
              className={`relative h-8 w-8 rounded-full ring-offset-2 ring-offset-porcelain transition ${active ? 'ring-2 ring-garnet' : 'ring-1 ring-ink/15 hover:ring-ink/40'} ${out ? 'opacity-40' : ''}`}
              style={{ background: v.colorHex }}
            >
              {out && <span className="absolute inset-0 m-auto h-px w-7 rotate-45 bg-ink" />}
            </button>
          ) : (
            <button
              key={v.id}
              role="radio"
              aria-checked={active}
              onClick={() => onChange(v.id)}
              disabled={out}
              className={`rounded-full px-3 py-1.5 text-sm transition ${active ? 'bg-garnet text-white' : 'bg-white ring-1 ring-ink/15 hover:ring-ink/40'} disabled:opacity-40`}
            >
              {text(v.name)}
              {v.price != null && <span className="ms-1.5 opacity-75">{money(v.price)}</span>}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

export function QtyStepper({ value, max, onChange, size = 'md' }: { value: number; max: number; onChange: (n: number) => void; size?: 'sm' | 'md' }) {
  const { t } = useLocale()
  const h = size === 'sm' ? 'h-8' : 'h-11'
  return (
    <div className={`inline-flex ${h} items-center rounded-full bg-white ring-1 ring-ink/15`}>
      <button className={`grid ${h} w-9 place-items-center rounded-full text-garnet disabled:opacity-30`} onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label={t('product.decrease')}>
        <Icon name="minus" size={16} />
      </button>
      <span className="w-6 text-center text-sm font-medium tabular-nums" aria-live="polite">
        {value}
      </span>
      <button className={`grid ${h} w-9 place-items-center rounded-full text-garnet disabled:opacity-30`} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={t('product.increase')}>
        <Icon name="plus" size={16} />
      </button>
    </div>
  )
}
