import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { computeTotals } from '@/lib/pricing'
import type { Order } from '@/lib/types'
import { useCart } from '@/state/cart'
import { useCatalog } from '@/state/catalog'
import { useUi } from '@/state/ui'
import { CartLines, CheckoutForm, OrderConfirmation } from './Checkout'
import { Icon } from './Icon'
import { useLocale } from './hooks'

type Step = 'cart' | 'checkout' | 'done'

function FreeDeliveryMeter({ subtotal }: { subtotal: number }) {
  const { t, money } = useLocale()
  const threshold = useCatalog((s) => s.catalog?.settings.freeDeliveryThreshold)
  if (!threshold) return null
  const left = Math.max(0, threshold - subtotal)
  const pct = Math.min(100, (subtotal / threshold) * 100)
  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-ink/5">
      <p className="flex items-center gap-2 text-sm">
        <Icon name="truck" size={18} className="text-garnet" />
        {left > 0 ? t('cart.almostFree', { amount: money(left) }) : t('cart.gotFree')}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-rosewater">
        <div className="h-full rounded-full bg-gradient-to-r from-champagne to-garnet transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/** Drawer content; mounted fresh each time the drawer opens, so it always starts at the right step. */
function DrawerBody({ initial, onClose }: { initial: Step; onClose: () => void }) {
  const { t, money } = useLocale()
  const catalog = useCatalog((s) => s.catalog)!
  const lines = useCart((s) => s.lines)
  const [step, setStep] = useState<Step>(initial)
  const [order, setOrder] = useState<Order | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const totals = useMemo(() => computeTotals(lines, catalog), [lines, catalog])

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const title = step === 'cart' ? t('cart.title') : step === 'checkout' ? t('checkout.title') : t('checkout.summary')
  return (
    <>
      <header className="flex items-center gap-2 px-5 pt-[max(18px,env(safe-area-inset-top))] pb-3">
        {step === 'checkout' && (
          <button onClick={() => setStep('cart')} className="grid h-10 w-10 place-items-center rounded-full hover:bg-ink/5" aria-label={t('nav.back')}>
            <Icon name="back" className="rtl:rotate-180" />
          </button>
        )}
        <h2 className="flex-1 font-display text-3xl text-ink">{title}</h2>
        <button ref={closeRef} onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full hover:bg-ink/5" aria-label={t('nav.close')}>
          <Icon name="close" />
        </button>
      </header>
      <div className="hairline mx-5" />
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {step === 'cart' &&
          (totals.lines.length === 0 ? (
            <div className="grid place-items-center gap-3 py-16 text-center">
              <Icon name="bag" size={40} className="text-champagne" />
              <p className="font-display text-2xl">{t('cart.empty')}</p>
              <p className="max-w-[26ch] text-sm text-mist">{t('cart.emptyHint')}</p>
              <button className="btn-quiet mt-2" onClick={onClose}>
                {t('cart.continue')}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {totals.dropped.length > 0 && <p className="rounded-xl bg-champagne/15 p-3 text-sm">{t('cart.dropped')}</p>}
              <FreeDeliveryMeter subtotal={totals.subtotal} />
              <CartLines />
            </div>
          ))}
        {step === 'checkout' && (
          <CheckoutForm
            onDone={(o) => {
              setOrder(o)
              setStep('done')
            }}
          />
        )}
        {step === 'done' && order && <OrderConfirmation order={order} onBack={onClose} />}
      </div>
      {step === 'cart' && totals.lines.length > 0 && (
        <footer className="border-t border-ink/10 px-5 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-mist">{t('cart.subtotal')}</span>
            <span className="font-display text-2xl tabular-nums" data-testid="cart-subtotal">
              {money(totals.subtotal)}
            </span>
          </div>
          <button className="btn-primary h-12 w-full" onClick={() => setStep('checkout')} data-testid="checkout-button">
            {t('cart.checkout')}
          </button>
          <button className="mt-2 w-full py-2 text-sm text-garnet" onClick={onClose}>
            {t('cart.continue')}
          </button>
        </footer>
      )}
    </>
  )
}

/** Basket, checkout and confirmation in one drawer, so the 3D boutique stays loaded behind it. */
export function CartDrawer() {
  const { t, rtl } = useLocale()
  const panel = useUi((s) => s.panel)
  const openPanel = useUi((s) => s.openPanel)
  const catalog = useCatalog((s) => s.catalog)
  const open = panel === 'cart' || panel === 'checkout'
  const close = useMemo(() => () => openPanel(null), [openPanel])
  const off = rtl ? '-105%' : '105%'

  return (
    <AnimatePresence>
      {open && catalog && (
        <motion.div key="cart" className="fixed inset-0 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-ink/30" onClick={close} />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={t('cart.title')}
            initial={{ x: off }}
            animate={{ x: 0 }}
            exit={{ x: off }}
            transition={{ type: 'spring', stiffness: 340, damping: 36 }}
            className="absolute inset-y-0 end-0 flex w-full max-w-md flex-col bg-porcelain shadow-float sm:rounded-s-[28px]"
            data-testid="cart-drawer"
          >
            <DrawerBody initial={panel === 'checkout' ? 'checkout' : 'cart'} onClose={close} />
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
