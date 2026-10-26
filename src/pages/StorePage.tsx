import { lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router'
import { useCatalog } from '@/state/catalog'
import { useUi } from '@/state/ui'
import { goToFixture, jumpInside, openProduct } from '@/three/actions'
import { Header } from '@/ui/Header'
import { ZoneBar } from '@/ui/ZoneBar'
import { ProductSheet } from '@/ui/ProductSheet'
import { ProductDetails } from '@/ui/ProductDetails'
import { CartDrawer } from '@/ui/CartDrawer'
import { Hint, Hotspot, Joystick, MiniMap, NavControls, Onboarding, Toasts } from '@/ui/Overlay'
import { Landing, LoadingScreen, SkipIntro } from '@/ui/Landing'
import { useLocale } from '@/ui/hooks'

const Boutique = lazy(() => import('@/three/Boutique'))

function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

/** Deep links: /?product=<slug>, /?zone=<fixture or category id> skip the street intro. */
function useDeepLinks() {
  const [params, setParams] = useSearchParams()
  const ready = useUi((s) => s.sceneReady)
  const catalog = useCatalog((s) => s.catalog)
  const layout = useCatalog((s) => s.layout)
  useEffect(() => {
    if (!ready || !catalog || !layout) return
    const slug = params.get('product')
    const zone = params.get('zone')
    if (!slug && !zone) return
    jumpInside()
    if (slug) {
      const p = catalog.products.find((x) => x.slug === slug || x.id === slug)
      if (p) setTimeout(() => openProduct(p.id, null), 120)
    } else if (zone) {
      const f = layout.fixtures.find((x) => x.id === zone || x.categoryId === zone)
      if (f) setTimeout(() => goToFixture(f.id), 120)
    }
    params.delete('product')
    params.delete('zone')
    setParams(params, { replace: true })
  }, [ready, catalog, layout, params, setParams])
}

export default function StorePage() {
  const { t } = useLocale()
  const status = useCatalog((s) => s.status)
  const phase = useUi((s) => s.phase)
  const navMode = useUi((s) => s.navMode)
  const mapOpen = useUi((s) => s.mapOpen)
  const selected = useUi((s) => s.selected)
  const openPanel = useUi((s) => s.openPanel)
  const [webgl] = useState(hasWebGL)
  const [coarse] = useState(() => window.matchMedia('(pointer: coarse)').matches)
  useDeepLinks()

  if (!webgl) return <Navigate to="/catalog?noWebgl=1" replace />

  const inside = phase === 'inside'
  return (
    <div className="fixed inset-0 overflow-hidden bg-porcelain select-none">
      <h1 className="sr-only">{t('nav.shop')}</h1>
      {status === 'ready' && (
        <Suspense fallback={null}>
          <Boutique />
        </Suspense>
      )}
      <Hotspot />
      {inside && (
        <>
          <Header onOpenCart={() => openPanel('cart')} />
          <ZoneBar />
          <Toasts />
          <Hint />
          <div className={`pointer-events-none absolute start-3 bottom-6 z-20 flex-col items-start gap-3 ${selected ? 'hidden lg:flex' : 'flex'}`}>
            {mapOpen && <MiniMap className="pointer-events-auto h-56 w-40 sm:h-64 sm:w-44" />}
            <NavControls />
          </div>
          {navMode === 'walk' && coarse && (
            <div className="pointer-events-none absolute end-4 bottom-8 z-20">
              <Joystick />
            </div>
          )}
          <ProductSheet />
        </>
      )}
      <Landing />
      <SkipIntro />
      <ProductDetails context="store" />
      <CartDrawer />
      <Onboarding />
      <LoadingScreen />
    </div>
  )
}
