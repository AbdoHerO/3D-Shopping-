import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { assetUrl } from '@/lib/assets'
import { createLayout } from '@/lib/layout'
import { firstFreeSlot, layoutFixture, shelfItemsFor } from '@/lib/shelf-layout'
import type { Product, ProductShape, Variant } from '@/lib/types'
import { Icon } from '@/ui/Icon'
import { useLocale } from '@/ui/hooks'
import { adminApi, prepareImage } from './api'
import { useAdmin } from './store'
import { Card, I18nInput, Label, NumberInput, Toggle } from './ui'
import { useA } from './text'
import { slugify } from '@/lib/slug'

const SHAPES: ProductShape[] = ['bottle', 'pump', 'spray', 'dropper', 'jar', 'tube', 'perfume', 'lipstick', 'gloss', 'pen', 'compact', 'palette', 'polish', 'box', 'pouch', 'roll']
const empty = { fr: '', ar: '', en: '' }

function blank(categoryId: string): Product {
  return {
    id: '',
    slug: '',
    categoryId,
    brand: '',
    name: { ...empty },
    description: { ...empty },
    howToUse: null,
    ingredients: null,
    sizeLabel: '',
    price: 0,
    promoPrice: null,
    stock: 10,
    isActive: true,
    isFeatured: false,
    isNew: true,
    shape: 'bottle',
    widthCm: 6,
    heightCm: 15,
    depthCm: 4,
    image: '',
    gallery: [],
    placement: null,
    variants: [],
    displayVariants: false,
  }
}

function ImagePicker({ value, name, onChange }: { value: string | null | undefined; name: string; onChange: (url: string) => void }) {
  const a = useA()
  const [busy, setBusy] = useState(false)
  const [warn, setWarn] = useState<string | null>(null)
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-24 w-20 shrink-0 place-items-center rounded-xl bg-blush">
        {value ? <img src={assetUrl(value)} alt="" className="max-h-20 max-w-16 object-contain" /> : <Icon name="sparkle" className="text-champagne" />}
      </div>
      <div className="min-w-0">
        <label className="btn-quiet h-9 cursor-pointer !py-0 text-sm">
          {busy ? '…' : a('Choisir une photo', 'Choose a photo')}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              setBusy(true)
              setWarn(null)
              try {
                const img = await prepareImage(file)
                if (!img.transparent)
                  setWarn(a('Photo sans fond transparent : elle s’affichera comme une carte. Un PNG détouré rend mieux.', 'Photo without a transparent background: it will show as a card. A cut-out PNG looks better.'))
                onChange(await adminApi.uploadImage(img.blob, name || 'produit'))
              } catch (err) {
                setWarn(err instanceof Error ? err.message : String(err))
              } finally {
                setBusy(false)
                e.target.value = ''
              }
            }}
          />
        </label>
        {warn && <p className="mt-1 text-xs text-[#8a5b12]">{warn}</p>}
      </div>
    </div>
  )
}

export default function ProductEditor() {
  const a = useA()
  const { text } = useLocale()
  const { id } = useParams()
  const navigate = useNavigate()
  const catalog = useAdmin((s) => s.catalog)!
  const save = useAdmin((s) => s.saveProduct)
  const remove = useAdmin((s) => s.deleteProduct)
  const busy = useAdmin((s) => s.busy)
  const existing = id ? catalog.products.find((p) => p.id === id) : undefined
  const [p, setP] = useState<Product>(() => (existing ? structuredClone(existing) : blank(catalog.categories[0]?.id ?? '')))
  const [errors, setErrors] = useState<string[]>([])
  const layout = useMemo(() => createLayout(catalog.settings.store), [catalog.settings.store])
  const set = <K extends keyof Product>(k: K, v: Product[K]) => setP((x) => ({ ...x, [k]: v }))

  const fixture = p.placement ? layout.fixtures.find((f) => f.id === p.placement!.fixtureId) : undefined
  const check = useMemo(() => {
    if (!fixture) return null
    const others = catalog.products.filter((x) => x.id !== p.id)
    const r = layoutFixture(fixture, shelfItemsFor(fixture, [...others, { ...p, id: p.id || '__new' }]))
    const mine = (x: { productId: string }) => x.productId === (p.id || '__new')
    return { overflow: r.overflow.some(mine), tooTall: r.tooTall.some(mine), level: r.overflow.filter((x) => !mine(x)).length }
  }, [fixture, catalog.products, p])

  if (id && !existing) return <p className="text-mist">404</p>

  const updateVariant = (i: number, v: Partial<Variant>) => set('variants', p.variants.map((x, k) => (k === i ? { ...x, ...v } : x)))

  const submit = async () => {
    const problems: string[] = []
    if (!p.name.fr.trim()) problems.push(a('Le nom en français est obligatoire.', 'The French name is required.'))
    if (!(p.price >= 0)) problems.push(a('Prix invalide.', 'Invalid price.'))
    if (p.promoPrice != null && p.promoPrice >= p.price) problems.push(a('Le prix promo doit être inférieur au prix.', 'The offer price must be lower than the price.'))
    if (!p.image) problems.push(a('Ajoutez une photo.', 'Add a photo.'))
    if (p.variants.some((v) => !v.name.fr.trim())) problems.push(a('Chaque variante a besoin d’un nom.', 'Every variant needs a name.'))
    const slug = p.slug || slugify(p.name.fr)
    if (!existing && catalog.products.some((x) => x.id === slug)) problems.push(a('Un produit avec ce nom existe déjà.', 'A product with this name already exists.'))
    setErrors(problems)
    if (problems.length) return
    const product: Product = {
      ...p,
      id: p.id || slug,
      slug,
      variants: p.variants.map((v) => ({ ...v, id: v.id || slugify(v.name.fr) })),
    }
    if (await save(product)) navigate('/admin/products')
  }

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/admin/products" className="grid h-10 w-10 place-items-center rounded-full hover:bg-ink/5" aria-label={a('Retour', 'Back')}>
          <Icon name="back" className="rtl:rotate-180" />
        </Link>
        <h1 className="font-display text-4xl text-garnet">{existing ? text(existing.name) : a('Nouveau produit', 'New product')}</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={a('Présentation', 'Presentation')}>
          <div className="flex flex-col gap-4">
            <ImagePicker value={p.image} name={p.slug || slugify(p.name.fr)} onChange={(url) => set('image', url)} />
            <I18nInput label={a('Nom', 'Name')} value={p.name} onChange={(v) => set('name', v)} required />
            <div className="grid gap-3 sm:grid-cols-2">
              <Label label={a('Marque', 'Brand')}>
                <input className="field" value={p.brand} onChange={(e) => set('brand', e.target.value)} />
              </Label>
              <Label label={a('Contenance', 'Size')} hint="100 ml, 50 g…">
                <input className="field" value={p.sizeLabel} onChange={(e) => set('sizeLabel', e.target.value)} />
              </Label>
            </div>
            <I18nInput label={a('Description', 'Description')} value={p.description} onChange={(v) => set('description', v)} multiline />
            <I18nInput label={a('Conseils d’utilisation', 'How to use')} value={p.howToUse} onChange={(v) => set('howToUse', v)} multiline />
            <Label label={a('Composition', 'Ingredients')}>
              <textarea className="field min-h-16" value={p.ingredients ?? ''} onChange={(e) => set('ingredients', e.target.value || null)} />
            </Label>
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card title={a('Prix et stock', 'Price and stock')}>
            <div className="grid gap-3 sm:grid-cols-3">
              <Label label={a('Prix', 'Price')}>
                <NumberInput value={p.price} onChange={(v) => set('price', v ?? 0)} step={0.5} />
              </Label>
              <Label label={a('Prix promo', 'Offer price')}>
                <NumberInput value={p.promoPrice} onChange={(v) => set('promoPrice', v)} step={0.5} />
              </Label>
              <Label label={a('Stock', 'Stock')} hint={p.variants.length ? a('Géré par variante', 'Per variant') : undefined}>
                <NumberInput value={p.stock} onChange={(v) => set('stock', Math.max(0, Math.round(v ?? 0)))} />
              </Label>
            </div>
            <div className="mt-4 flex flex-wrap gap-4">
              <Toggle checked={p.isActive} onChange={(v) => set('isActive', v)} label={a('En vente', 'On sale')} />
              <Toggle checked={p.isFeatured} onChange={(v) => set('isFeatured', v)} label={a('Coup de cœur (vitrine)', 'Featured (shop window)')} />
              <Toggle checked={p.isNew} onChange={(v) => set('isNew', v)} label={a('Nouveau', 'New')} />
            </div>
          </Card>

          <Card title={a('Catégorie et format', 'Category and format')}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Label label={a('Catégorie', 'Category')}>
                <select className="field" value={p.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
                  {catalog.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {text(c.name)}
                    </option>
                  ))}
                </select>
              </Label>
              <Label label={a('Forme', 'Shape')}>
                <select className="field" value={p.shape} onChange={(e) => set('shape', e.target.value as ProductShape)}>
                  {SHAPES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Label>
            </div>
            <p className="mt-3 mb-1 text-sm font-medium">{a('Dimensions réelles (cm)', 'Real size (cm)')}</p>
            <div className="grid grid-cols-3 gap-3">
              <Label label={a('Largeur', 'Width')}>
                <NumberInput value={p.widthCm} onChange={(v) => set('widthCm', v ?? 1)} step={0.5} />
              </Label>
              <Label label={a('Hauteur', 'Height')}>
                <NumberInput value={p.heightCm} onChange={(v) => set('heightCm', v ?? 1)} step={0.5} />
              </Label>
              <Label label={a('Profondeur', 'Depth')}>
                <NumberInput value={p.depthCm} onChange={(v) => set('depthCm', v ?? 1)} step={0.5} />
              </Label>
            </div>
          </Card>

          <Card title={a('En rayon', 'On the shelf')}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Label label={a('Meuble', 'Fixture')}>
                <select
                  className="field"
                  value={p.placement?.fixtureId ?? ''}
                  onChange={(e) => {
                    const f = layout.fixtures.find((x) => x.id === e.target.value)
                    if (!f) return set('placement', null)
                    const slot = firstFreeSlot(f, shelfItemsFor(f, catalog.products.filter((x) => x.id !== p.id)), p.widthCm / 100) ?? { level: 0, slot: 99 }
                    set('placement', { fixtureId: f.id, level: slot.level, slot: slot.slot, facings: p.placement?.facings ?? 2 })
                  }}
                  data-testid="placement-fixture"
                >
                  <option value="">{a('— Pas en rayon (liste seulement)', '— Not on a shelf (list only)')}</option>
                  {layout.fixtures.map((f) => (
                    <option key={f.id} value={f.id}>
                      {text(catalog.settings.fixtureLabels[f.id])}
                    </option>
                  ))}
                </select>
              </Label>
              {fixture && p.placement && (
                <Label label={a('Étagère', 'Shelf')}>
                  <select className="field" value={p.placement.level} onChange={(e) => set('placement', { ...p.placement!, level: Number(e.target.value) })}>
                    {fixture.levels.map((y, i) => (
                      <option key={i} value={i}>
                        {i + 1} — {Math.round(y * 100)} cm
                      </option>
                    ))}
                  </select>
                </Label>
              )}
              {fixture && p.placement && (
                <>
                  <Label label={a('Position (ordre)', 'Position (order)')}>
                    <NumberInput value={p.placement.slot} onChange={(v) => set('placement', { ...p.placement!, slot: v ?? 0 })} />
                  </Label>
                  <Label label={a('Exemplaires de face', 'Facings')}>
                    <NumberInput value={p.placement.facings} onChange={(v) => set('placement', { ...p.placement!, facings: Math.min(6, Math.max(1, v ?? 1)) })} />
                  </Label>
                </>
              )}
            </div>
            {check?.overflow && <p className="mt-2 text-sm text-danger">{a("Plus de place sur cette étagère : choisissez-en une autre.", 'This shelf is full: choose another one.')}</p>}
            {check?.tooTall && <p className="mt-2 text-sm text-[#8a5b12]">{a("Le produit est plus haut que l'espace sous l'étagère du dessus.", 'The product is taller than the gap under the shelf above.')}</p>}
            {fixture && (
              <Link to={`/?zone=${fixture.id}`} className="mt-3 inline-flex text-sm text-garnet underline-offset-2 hover:underline">
                {a('Voir ce rayon en 3D', 'See this shelf in 3D')}
              </Link>
            )}
          </Card>
        </div>
      </div>

      <Card
        title={a('Variantes (teintes, tailles)', 'Variants (shades, sizes)')}
        actions={
          <button
            className="btn-quiet h-9 !py-0 text-sm"
            onClick={() => set('variants', [...p.variants, { id: '', name: { ...empty }, stock: 10, colorHex: undefined, price: null, promoPrice: null, image: null }])}
          >
            <Icon name="plus" size={16} />
            {a('Ajouter', 'Add')}
          </button>
        }
      >
        {p.variants.length === 0 ? (
          <p className="text-sm text-mist">{a('Aucune variante : un seul format.', 'No variants: a single format.')}</p>
        ) : (
          <div className="flex flex-col gap-3">
            <Toggle checked={p.displayVariants} onChange={(v) => set('displayVariants', v)} label={a('Montrer chaque teinte en rayon (vernis, rouges à lèvres)', 'Show every shade on the shelf (polish, lipsticks)')} />
            {p.variants.map((v, i) => (
              <div key={i} className="grid gap-3 rounded-2xl bg-blush/40 p-3 md:grid-cols-[1.4fr_auto_repeat(3,minmax(0,0.6fr))_auto]">
                <I18nInput label={a('Nom', 'Name')} value={v.name} onChange={(name) => updateVariant(i, { name })} required />
                <Label label={a('Couleur', 'Colour')}>
                  <span className="flex items-center gap-2">
                    <input type="color" className="h-11 w-12 rounded-lg" value={v.colorHex ?? '#cccccc'} onChange={(e) => updateVariant(i, { colorHex: e.target.value })} />
                    {v.colorHex && (
                      <button type="button" className="text-xs text-mist" onClick={() => updateVariant(i, { colorHex: undefined })}>
                        ×
                      </button>
                    )}
                  </span>
                </Label>
                <Label label={a('Prix', 'Price')}>
                  <NumberInput value={v.price} onChange={(price) => updateVariant(i, { price })} step={0.5} />
                </Label>
                <Label label={a('Promo', 'Offer')}>
                  <NumberInput value={v.promoPrice} onChange={(promoPrice) => updateVariant(i, { promoPrice })} step={0.5} />
                </Label>
                <Label label="Stock">
                  <NumberInput value={v.stock} onChange={(stock) => updateVariant(i, { stock: Math.max(0, Math.round(stock ?? 0)) })} />
                </Label>
                <div className="flex items-end gap-2">
                  <ImagePicker value={v.image} name={`${p.slug || slugify(p.name.fr)}-${slugify(v.name.fr)}`} onChange={(image) => updateVariant(i, { image })} />
                  <button type="button" className="grid h-10 w-10 place-items-center rounded-full text-mist hover:bg-white hover:text-danger" onClick={() => set('variants', p.variants.filter((_, k) => k !== i))} aria-label={a('Supprimer', 'Delete')}>
                    <Icon name="trash" size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-porcelain/95 px-4 py-3 backdrop-blur md:start-[230px]">
        <div className="flex flex-wrap items-center gap-3">
          {errors.length > 0 && <p className="text-sm text-danger">{errors.join(' ')}</p>}
          <div className="flex-1" />
          {existing && (
            <button
              className="text-sm text-mist hover:text-danger"
              onClick={async () => {
                if (window.confirm(a('Supprimer ce produit ?', 'Delete this product?')) && (await remove(existing.id))) navigate('/admin/products')
              }}
            >
              {a('Supprimer', 'Delete')}
            </button>
          )}
          <button className="btn-primary h-11 !py-0" onClick={submit} disabled={busy} data-testid="save-product">
            {a('Enregistrer', 'Save')}
          </button>
        </div>
      </div>
    </div>
  )
}
