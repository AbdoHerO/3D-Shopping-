import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useNavigate } from 'react-router'
import { assetUrl, productImage } from '@/lib/assets'
import { stockOf } from '@/lib/pricing'
import { useCatalog } from '@/state/catalog'
import { useUi } from '@/state/ui'
import { addToCart, openProduct } from '@/three/actions'
import { Icon } from './Icon'
import { Badges, Price, QtyStepper, VariantPicker } from './ProductBits'
import { useLocale } from './hooks'

const EMPTY: never[] = []

/** Full product page in a dialog: description, how to use, related products. */
export function ProductDetails({ context }: { context: 'store' | 'catalog' }) {
  const { t, text } = useLocale()
  const navigate = useNavigate()
  const panel = useUi((s) => s.panel)
  const selected = useUi((s) => s.selected)
  const select = useUi((s) => s.select)
  const openPanel = useUi((s) => s.openPanel)
  const productById = useCatalog((s) => s.productById)
  const catalog = useCatalog((s) => s.catalog)
  const products = catalog?.products ?? EMPTY
  const product = selected ? productById.get(selected.productId) : undefined
  const variant = product && selected?.variantId ? (product.variants.find((v) => v.id === selected.variantId) ?? null) : null
  const selKey = `${selected?.productId}:${selected?.variantId}`
  const [qtyState, setQtyState] = useState({ key: '', qty: 1 })
  const qty = qtyState.key === selKey ? qtyState.qty : 1
  const setQty = (n: number) => setQtyState({ key: selKey, qty: n })
  const closeRef = useRef<HTMLButtonElement>(null)
  const open = panel === 'details' && !!product

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && openPanel(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, openPanel])

  const related = product
    ? products.filter((p) => p.isActive && p.id !== product.id && p.categoryId === product.categoryId).slice(0, 4)
    : []
  const stock = product ? stockOf(product, variant) : 0

  return (
    <AnimatePresence>
      {open && product && (
        <motion.div
          key="details"
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/35 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && openPanel(null)}
        >
          <motion.article
            role="dialog"
            aria-modal="true"
            aria-label={text(product.name)}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 34 }}
            className="relative grid max-h-[92dvh] w-full max-w-4xl overflow-y-auto rounded-t-[28px] bg-porcelain shadow-float sm:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] sm:rounded-[28px]"
            data-testid="product-details"
          >
            <button
              ref={closeRef}
              onClick={() => openPanel(null)}
              className="absolute end-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/80 text-ink shadow-soft hover:bg-white"
              aria-label={t('nav.close')}
            >
              <Icon name="close" size={18} />
            </button>
            <div className="grid min-h-64 place-items-center bg-gradient-to-b from-white via-blush to-rosewater p-8 sm:min-h-[480px]">
              <img src={assetUrl(productImage(product, variant))} alt={text(product.name)} className="max-h-72 max-w-[70%] object-contain drop-shadow-xl sm:max-h-96" />
            </div>
            <div className="flex flex-col gap-4 p-5 sm:p-8">
              <div>
                <p className="text-sm text-mist">
                  {product.brand} · {product.sizeLabel}
                </p>
                <h2 className="mt-1 font-display text-3xl leading-tight text-ink sm:text-4xl">{text(product.name)}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Price product={product} variant={variant} className="text-xl font-medium" />
                  <Badges product={product} variant={variant} />
                </div>
              </div>
              <VariantPicker product={product} value={selected?.variantId ?? null} onChange={(id) => select({ productId: product.id, variantId: id })} />
              <div className="flex flex-wrap items-center gap-2">
                <QtyStepper value={qty} max={Math.max(1, stock)} onChange={(n) => setQty(Math.max(1, Math.min(stock, n)))} />
                <button className="btn-primary h-11 flex-1 !py-0" disabled={stock <= 0} onClick={() => addToCart(product.id, selected?.variantId ?? null, qty)}>
                  <Icon name="bag" size={18} />
                  {stock <= 0 ? t('product.outOfStock') : t('product.add')}
                </button>
              </div>
              {context === 'catalog' && (
                <button className="btn-quiet self-start" onClick={() => navigate(`/?product=${product.slug}`)}>
                  <Icon name="store" size={18} />
                  {t('product.seeInStore')}
                </button>
              )}
              <div className="hairline" />
              <section>
                <h3 className="font-display text-xl text-garnet">{t('product.description')}</h3>
                <p className="mt-1 leading-relaxed text-ink/85">{text(product.description)}</p>
              </section>
              {product.howToUse && (
                <section>
                  <h3 className="font-display text-xl text-garnet">{t('product.howTo')}</h3>
                  <p className="mt-1 leading-relaxed text-ink/85">{text(product.howToUse)}</p>
                </section>
              )}
              {product.ingredients && (
                <section>
                  <h3 className="font-display text-xl text-garnet">{t('product.ingredients')}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink/75">{product.ingredients}</p>
                </section>
              )}
              {related.length > 0 && (
                <section>
                  <h3 className="font-display text-xl text-garnet">{t('product.related')}</h3>
                  <ul className="mt-2 grid grid-cols-4 gap-2">
                    {related.map((r) => (
                      <li key={r.id}>
                        <button
                          onClick={() => {
                            if (context === 'store') openProduct(r.id, null)
                            else select({ productId: r.id, variantId: r.variants[0]?.id ?? null })
                          }}
                          className="group flex w-full flex-col items-center gap-1 rounded-2xl bg-white p-2 text-center ring-1 ring-ink/5 hover:ring-garnet/30"
                        >
                          <img src={assetUrl(r.image)} alt="" className="h-16 object-contain transition group-hover:-translate-y-0.5" />
                          <span className="line-clamp-2 text-[11px] leading-tight text-ink/80">{text(r.name)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </motion.article>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
