import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { assetUrl, productImage } from '@/lib/assets'
import { stockOf } from '@/lib/pricing'
import { useCatalog } from '@/state/catalog'
import { useUi } from '@/state/ui'
import { addToCart, closeProduct } from '@/three/actions'
import { Icon } from './Icon'
import { Badges, Price, QtyStepper, VariantPicker } from './ProductBits'
import { useLocale } from './hooks'

/** The card that opens at the bottom when a product is tapped on the shelf. */
export function ProductSheet() {
  const { t, text } = useLocale()
  const selected = useUi((s) => s.selected)
  const select = useUi((s) => s.select)
  const openPanel = useUi((s) => s.openPanel)
  const product = useCatalog((s) => (selected ? s.productById.get(selected.productId) : undefined))
  const selKey = `${selected?.productId}:${selected?.variantId}`
  const [qtyState, setQtyState] = useState({ key: '', qty: 1 })
  const qty = qtyState.key === selKey ? qtyState.qty : 1
  const setQty = (n: number) => setQtyState({ key: selKey, qty: n })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && useUi.getState().selected && !useUi.getState().panel && closeProduct()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const variant = product && selected?.variantId ? (product.variants.find((v) => v.id === selected.variantId) ?? null) : null
  const stock = product ? stockOf(product, variant) : 0

  return (
    <AnimatePresence>
      {product && selected && (
        <motion.section
          key="sheet"
          role="dialog"
          aria-label={text(product.name)}
          initial={{ y: '110%' }}
          animate={{ y: 0 }}
          exit={{ y: '110%' }}
          transition={{ type: 'spring', stiffness: 380, damping: 36 }}
          className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[600px] px-0 sm:bottom-4 sm:px-3"
          data-testid="product-sheet"
        >
          <div className="glass rounded-t-[26px] p-4 pb-[max(16px,env(safe-area-inset-bottom))] shadow-float sm:rounded-[26px] sm:p-5">
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-ink/15 sm:hidden" />
            <div className="flex gap-4">
              <div className="flex h-28 w-24 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b from-white to-blush p-2">
                <img src={assetUrl(productImage(product, variant))} alt="" className="max-h-full max-w-full object-contain drop-shadow-md" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs tracking-wide text-mist">
                      {product.brand} · {product.sizeLabel}
                    </p>
                    <h2 className="font-display text-[1.45rem] leading-tight text-ink">{text(product.name)}</h2>
                  </div>
                  <button onClick={closeProduct} className="-me-1 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-mist hover:bg-ink/5 hover:text-ink" aria-label={t('nav.close')}>
                    <Icon name="close" size={18} />
                  </button>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Price product={product} variant={variant} className="text-lg font-medium" />
                  <Badges product={product} variant={variant} />
                </div>
              </div>
            </div>
            {product.variants.length > 0 && (
              <div className="mt-3">
                <VariantPicker product={product} value={selected.variantId} onChange={(id) => select({ productId: product.id, variantId: id })} />
              </div>
            )}
            <div className="mt-4 flex items-center gap-2">
              <QtyStepper size="sm" value={qty} max={Math.max(1, stock)} onChange={(n) => setQty(Math.max(1, Math.min(stock, n)))} />
              <button
                className="btn-primary h-11 flex-1 !py-0"
                disabled={stock <= 0}
                onClick={() => addToCart(product.id, selected.variantId, qty)}
                data-testid="add-to-cart"
              >
                <Icon name="bag" size={18} />
                {stock <= 0 ? t('product.outOfStock') : t('product.add')}
              </button>
              <button className="btn-quiet h-11 !px-3 !py-0 sm:!px-4" onClick={() => openPanel('details')} aria-label={t('product.details')} data-testid="details-button">
                <Icon name="eye" size={18} className="sm:hidden" />
                <span className="hidden sm:inline">{t('product.details')}</span>
              </button>
            </div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  )
}
