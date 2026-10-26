import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { assetUrl, productImage } from '@/lib/assets'
import { stockOf } from '@/lib/pricing'
import { useCatalog } from '@/state/catalog'
import { useUi } from '@/state/ui'
import { addToCart } from '@/three/actions'
import { Icon } from '@/ui/Icon'
import { PageShell } from '@/ui/PageShell'
import { Badges, Price, VariantPicker } from '@/ui/ProductBits'
import { useLocale } from '@/ui/hooks'

/** Shareable product page (/p/<slug>) with a link straight to the product's shelf in 3D. */
export default function ProductPage() {
  const { slug } = useParams()
  const { t, text } = useLocale()
  const navigate = useNavigate()
  const catalog = useCatalog((s) => s.catalog)
  const selected = useUi((s) => s.selected)
  const select = useUi((s) => s.select)
  const product = catalog?.products.find((p) => p.slug === slug)

  useEffect(() => {
    if (product && selected?.productId !== product.id) select({ productId: product.id, variantId: product.variants[0]?.id ?? null })
  }, [product, selected, select])

  useEffect(() => {
    if (product) document.title = `${text(product.name)} — ${catalog?.settings.shopName}`
  }, [product, catalog, text])

  if (catalog && !product) {
    return (
      <PageShell>
        <p className="py-24 text-center text-mist">404</p>
      </PageShell>
    )
  }
  if (!product) return <PageShell>{null}</PageShell>
  const variant = selected?.productId === product.id && selected.variantId ? (product.variants.find((v) => v.id === selected.variantId) ?? null) : null
  const stock = stockOf(product, variant)
  return (
    <PageShell>
      <nav className="pt-6 text-sm text-mist">
        <Link to="/catalog" className="hover:text-garnet">
          {t('catalog.title')}
        </Link>
      </nav>
      <article className="mt-4 grid gap-8 md:grid-cols-2">
        <div className="grid aspect-square place-items-center rounded-[28px] bg-gradient-to-b from-white via-blush to-rosewater">
          <img src={assetUrl(productImage(product, variant))} alt={text(product.name)} className="max-h-[78%] max-w-[60%] object-contain drop-shadow-xl" />
        </div>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-mist">
            {product.brand} · {product.sizeLabel}
          </p>
          <h1 className="font-display text-5xl leading-tight text-ink">{text(product.name)}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Price product={product} variant={variant} className="text-2xl font-medium" />
            <Badges product={product} variant={variant} />
          </div>
          <VariantPicker product={product} value={variant?.id ?? null} onChange={(id) => select({ productId: product.id, variantId: id })} />
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary h-12 flex-1" disabled={stock <= 0} onClick={() => addToCart(product.id, variant?.id ?? null)}>
              <Icon name="bag" size={18} />
              {stock <= 0 ? t('product.outOfStock') : t('product.add')}
            </button>
            <button className="btn-quiet h-12" onClick={() => navigate(`/?product=${product.slug}`)}>
              <Icon name="store" size={18} />
              {t('product.seeInStore')}
            </button>
          </div>
          <div className="hairline" />
          <p className="leading-relaxed text-ink/85">{text(product.description)}</p>
          {product.howToUse && (
            <div>
              <h2 className="font-display text-2xl text-garnet">{t('product.howTo')}</h2>
              <p className="mt-1 leading-relaxed text-ink/85">{text(product.howToUse)}</p>
            </div>
          )}
        </div>
      </article>
    </PageShell>
  )
}
