import { useMemo } from 'react'
import { Link } from 'react-router'
import { computeTotals } from '@/lib/pricing'
import { LOCALES, type Locale } from '@/lib/types'
import { setLocale } from '@/i18n'
import { useCart } from '@/state/cart'
import { useCatalog } from '@/state/catalog'
import { Icon } from './Icon'
import { useLocale } from './hooks'

export function Monogram({ name, size = 36 }: { name: string; size?: number }) {
  const letters = name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-garnet font-display text-[#e9c98f] ring-1 ring-champagne/60"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden="true"
    >
      {letters}
    </span>
  )
}

export function LanguageSelect({ className = '' }: { className?: string }) {
  const { t, locale } = useLocale()
  return (
    <label className={`relative items-center ${className || 'inline-flex'}`}>
      <span className="sr-only">{t('lang.label')}</span>
      <Icon name="globe" size={18} className="pointer-events-none absolute start-3 text-garnet" />
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="h-10 appearance-none rounded-full border border-garnet/20 bg-white/70 ps-9 pe-4 text-sm font-medium text-garnet hover:bg-white"
        data-testid="language"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {t(`lang.${l}`)}
          </option>
        ))}
      </select>
    </label>
  )
}

export function CartButton({ onClick }: { onClick: () => void }) {
  const { t, money } = useLocale()
  const lines = useCart((s) => s.lines)
  const catalog = useCatalog((s) => s.catalog)
  const totals = useMemo(() => (catalog ? computeTotals(lines, catalog) : null), [lines, catalog])
  const count = totals?.itemCount ?? 0
  return (
    <button
      onClick={onClick}
      className="relative inline-flex h-11 items-center gap-2 rounded-full bg-garnet ps-3 pe-4 text-white shadow-soft transition hover:bg-garnet-deep active:scale-[0.97]"
      aria-label={`${t('nav.cart')}, ${t('cart.items', { count })}`}
      data-testid="cart-button"
    >
      <Icon name="bag" />
      <span className="hidden text-sm font-medium sm:inline">{t('nav.cart')}</span>
      {count > 0 && <span className="text-sm tabular-nums opacity-90">{money(totals!.subtotal)}</span>}
      <span
        key={count}
        className="absolute -top-1 -end-1 grid h-5 min-w-5 place-items-center rounded-full bg-champagne px-1 text-[11px] font-semibold text-ink ring-2 ring-porcelain [animation:pop_.35s_var(--ease-out-soft)]"
        data-testid="cart-count"
      >
        {count}
      </span>
    </button>
  )
}

export function Header({ onOpenCart }: { onOpenCart: () => void }) {
  const { t } = useLocale()
  const settings = useCatalog((s) => s.catalog?.settings)
  if (!settings) return null
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center px-3 pt-[max(10px,env(safe-area-inset-top))]">
      <div className="glass pointer-events-auto flex w-full max-w-5xl items-center gap-2 rounded-full py-1.5 ps-1.5 pe-1.5 shadow-float">
        <Link to="/" className="flex min-w-0 items-center gap-2.5 rounded-full pe-2" aria-label={settings.shopName}>
          <Monogram name={settings.shopName} />
          <span className="truncate font-display text-xl leading-none text-garnet sm:text-2xl">{settings.shopName}</span>
        </Link>
        <div className="flex-1" />
        <LanguageSelect className="hidden sm:inline-flex" />
        <Link to="/catalog" className="btn-quiet hidden h-10 !py-0 text-sm md:inline-flex" data-testid="list-link">
          <Icon name="list" size={18} />
          {t('nav.list')}
        </Link>
        <CartButton onClick={onOpenCart} />
      </div>
    </header>
  )
}
