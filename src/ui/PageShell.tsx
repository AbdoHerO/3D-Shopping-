import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useCatalog } from '@/state/catalog'
import { useUi } from '@/state/ui'
import { CartDrawer } from './CartDrawer'
import { CartButton, LanguageSelect, Monogram } from './Header'
import { Icon } from './Icon'
import { ProductDetails } from './ProductDetails'
import { Toasts } from './Overlay'
import { useLocale } from './hooks'

/** Layout for the 2D pages (catalog, product, checkout): sticky header, cart drawer, footer. */
export function PageShell({ children }: { children: ReactNode }) {
  const { t, text } = useLocale()
  const settings = useCatalog((s) => s.catalog?.settings)
  const status = useCatalog((s) => s.status)
  const openPanel = useUi((s) => s.openPanel)
  return (
    <div className="min-h-dvh bg-porcelain">
      <header className="sticky top-0 z-30 border-b border-ink/5 bg-porcelain/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            {settings && <Monogram name={settings.shopName} />}
            <span className="truncate font-display text-2xl text-garnet">{settings?.shopName}</span>
          </Link>
          <div className="flex-1" />
          <LanguageSelect className="hidden sm:inline-flex" />
          <Link to="/" className="btn-quiet hidden h-10 !py-0 text-sm sm:inline-flex">
            <Icon name="store" size={18} />
            {t('catalog.open3d')}
          </Link>
          <CartButton onClick={() => openPanel('cart')} />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-16">{status === 'ready' ? children : <PageLoading />}</main>
      {settings && (
        <footer className="border-t border-ink/10 bg-blush/60">
          <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 text-sm text-ink/80 sm:grid-cols-3">
            <div className="flex items-center gap-3">
              <Monogram name={settings.shopName} size={40} />
              <div>
                <p className="font-display text-xl text-garnet">{settings.shopName}</p>
                <p className="text-mist">{text(settings.tagline)}</p>
              </div>
            </div>
            <div>
              <p className="font-medium">{t('footer.address')}</p>
              <p>{text(settings.address)}</p>
            </div>
            <div>
              <p className="font-medium">{t('footer.hours')}</p>
              <p>{text(settings.openingHours)}</p>
              <LanguageSelect className="mt-3 inline-flex sm:hidden" />
            </div>
          </div>
        </footer>
      )}
      <Toasts />
      <ProductDetails context="catalog" />
      <CartDrawer />
    </div>
  )
}

function PageLoading() {
  const { t } = useLocale()
  return <p className="py-24 text-center text-mist">{t('store.loading')}</p>
}
