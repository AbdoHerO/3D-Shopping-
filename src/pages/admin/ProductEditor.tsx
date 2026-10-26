import { lazy, Suspense, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { assetUrl } from '@/lib/assets'
import { createLayout } from '@/lib/layout'
import { FAMILIES, FAMILY_GROUPS, PACKAGE_FAMILIES, type PackageFamily } from '@/lib/packaging'
import { decodeBlob, encodeWebp, sniffBlobType } from '@/lib/product-assets/browser'
import { configuredProvider } from '@/lib/product-assets/model-provider'
import { emptyAsset, prepareVariantImage, validateRaster, validateUpload } from '@/lib/product-assets/prepare'
import { firstFreeSlot, layoutFixture, shelfItemsFor } from '@/lib/shelf-layout'
import type { Product, ProductAsset, Variant } from '@/lib/types'
import { Icon } from '@/ui/Icon'
import { useLocale } from '@/ui/hooks'
import { adminApi } from './api'
import { AssetStatusBadge } from './AssetBits'
import { useAdmin } from './store'
import { Card, I18nInput, Label, NumberInput, Toggle } from './ui'
import { useA } from './text'
import { slugify } from '@/lib/slug'

const ModelPreview = lazy(() => import('./ModelPreview'))
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
    shape: 'bottle-tall',
    widthCm: 6,
    heightCm: 15,
    depthCm: 4,
    image: '',
    gallery: [],
    placement: null,
    variants: [],
    displayVariants: false,
    asset: emptyAsset(),
    source: { kind: 'manual', name: null, id: null, url: null, license: null, attribution: null },
  }
}

/** Checks a chosen file, keeps the untouched original and returns its reference and pixels. */
async function takeOriginal(file: File, name: string) {
  const type = await sniffBlobType(file)
  const invalid = validateUpload({ type, size: file.size })
  if (invalid) throw new Error(invalid)
  const raster = await decodeBlob(file)
  const tooSmall = validateRaster(raster)
  if (tooSmall) throw new Error(tooSmall)
  const ref = await adminApi.uploadOriginal(file, name || 'produit')
  return { ref, raster }
}

function PhotoPicker({ preview, name, onPicked }: { preview: string; name: string; onPicked: (ref: string, preview: string) => void }) {
  const a = useA()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-24 w-20 shrink-0 place-items-center rounded-xl bg-blush">
        {preview ? <img src={preview} alt="" className="max-h-20 max-w-16 object-contain" /> : <Icon name="sparkle" className="text-champagne" />}
      </div>
      <div className="min-w-0">
        <label className="btn-quiet h-9 cursor-pointer !py-0 text-sm">
          {busy ? '…' : a('Choisir une photo', 'Choose a photo')}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="sr-only"
            data-testid="photo-input"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              setBusy(true)
              setError(null)
              try {
                const { ref } = await takeOriginal(file, name)
                onPicked(ref, URL.createObjectURL(file))
              } catch (err) {
                setError(err instanceof Error ? err.message : String(err))
              } finally {
                setBusy(false)
                e.target.value = ''
              }
            }}
          />
        </label>
        <p className="mt-1 text-xs text-mist">
          {a(
            'JPEG, PNG, WebP ou AVIF, 15 Mo max. Fond uni ou détouré : le produit est découpé automatiquement.',
            'JPEG, PNG, WebP or AVIF, up to 15 MB. Plain or transparent background: the product is cut out automatically.',
          )}
        </p>
        {error && (
          <p className="mt-1 text-xs text-danger" data-testid="photo-error">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}

/** Shade photos are cut out straight away (they reuse the product's model, so there is no job). */
function ShadePhoto({ value, name, onChange }: { value: string | null | undefined; name: string; onChange: (url: string, original: string) => void }) {
  const a = useA()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <label className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-xl bg-white ring-1 ring-ink/10" title={error ?? a('Photo de la teinte', 'Shade photo')}>
      {busy ? '…' : value ? <img src={assetUrl(value)} alt="" className="max-h-10 max-w-10 object-contain" /> : <Icon name="plus" size={16} />}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="sr-only"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (!file) return
          setBusy(true)
          setError(null)
          try {
            const { ref, raster } = await takeOriginal(file, name)
            const vr = prepareVariantImage(raster)
            onChange(await adminApi.uploadImage(await encodeWebp(vr.display), name), ref)
          } catch (err) {
            setError(err instanceof Error ? err.message : String(err))
          } finally {
            setBusy(false)
            e.target.value = ''
          }
        }}
      />
    </label>
  )
}

export default function ProductEditor() {
  const a = useA()
  const { text, locale } = useLocale()
  const lang = locale === 'en' ? 'en' : 'fr'
  const { id } = useParams()
  const navigate = useNavigate()
  const catalog = useAdmin((s) => s.catalog)!
  const save = useAdmin((s) => s.saveProduct)
  const prepare = useAdmin((s) => s.prepare)
  const remove = useAdmin((s) => s.deleteProduct)
  const busy = useAdmin((s) => s.busy)
  const job = useAdmin((s) => (id ? s.jobs[id] : undefined))
  const existing = id ? catalog.products.find((p) => p.id === id) : undefined
  const [p, setP] = useState<Product>(() => (existing ? structuredClone(existing) : blank(catalog.categories[0]?.id ?? '')))
  const [preview, setPreview] = useState('')
  const [newPhoto, setNewPhoto] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const shadeOriginals = useRef<Record<number, string>>({})
  const layout = useMemo(() => createLayout(catalog.settings.store), [catalog.settings.store])
  const set = <K extends keyof Product>(k: K, v: Product[K]) => setP((x) => ({ ...x, [k]: v }))
  const asset: ProductAsset = { ...emptyAsset(), ...(p.asset ?? {}) }
  const setAsset = (patch: Partial<ProductAsset>) => setP((x) => ({ ...x, asset: { ...emptyAsset(), ...(x.asset ?? {}), ...patch } }))
  // the stored product is the truth for what a finished job produced
  const stored = existing?.asset ?? null

  const fixture = p.placement ? layout.fixtures.find((f) => f.id === p.placement!.fixtureId) : undefined
  const check = useMemo(() => {
    if (!fixture) return null
    const others = catalog.products.filter((x) => x.id !== p.id)
    const r = layoutFixture(fixture, shelfItemsFor(fixture, [...others, { ...p, id: p.id || '__new' }]))
    const mine = (x: { productId: string }) => x.productId === (p.id || '__new')
    return { overflow: r.overflow.some(mine), tooTall: r.tooTall.some(mine) }
  }, [fixture, catalog.products, p])

  if (id && !existing) return <p className="text-mist">404</p>

  const updateVariant = (i: number, v: Partial<Variant>) => set('variants', p.variants.map((x, k) => (k === i ? { ...x, ...v } : x)))

  const submit = async () => {
    const problems: string[] = []
    if (!p.name.fr.trim()) problems.push(a('Le nom en français est obligatoire.', 'The French name is required.'))
    if (!(p.price >= 0)) problems.push(a('Prix invalide.', 'Invalid price.'))
    if (p.promoPrice != null && p.promoPrice >= p.price) problems.push(a('Le prix promo doit être inférieur au prix.', 'The offer price must be lower than the price.'))
    if (!p.image && !asset.original) problems.push(a('Ajoutez une photo.', 'Add a photo.'))
    if (p.variants.some((v) => !v.name.fr.trim())) problems.push(a('Chaque variante a besoin d’un nom.', 'Every variant needs a name.'))
    if (![p.widthCm, p.heightCm, p.depthCm].every((v) => v > 0 && v < 100)) problems.push(a('Dimensions entre 0 et 100 cm.', 'Sizes must be between 0 and 100 cm.'))
    const slug = p.slug || slugify(p.name.fr)
    if (!existing && catalog.products.some((x) => x.id === slug)) problems.push(a('Un produit avec ce nom existe déjà.', 'A product with this name already exists.'))
    setErrors(problems)
    if (problems.length) return
    // a job that finished while the form was open wins for the picture, the model and its sizes
    const base: Product = existing && stored && stored.version > asset.version && !newPhoto
      ? { ...p, image: existing.image, shape: stored.familySource === 'manual' || asset.familySource === 'auto' ? existing.shape : p.shape, ...(stored.dimsEstimated && asset.dimsEstimated ? { widthCm: existing.widthCm, heightCm: existing.heightCm, depthCm: existing.depthCm } : {}), placement: p.placement ?? existing.placement, asset: { ...stored, familySource: asset.familySource, dimsEstimated: asset.dimsEstimated, review: asset.review } }
      : p
    const baseAsset: ProductAsset = { ...emptyAsset(), ...(base.asset ?? {}) }
    const variants = base.variants.map((v) => ({ ...v, id: v.id || slugify(v.name.fr) }))
    const variantAssets = { ...(baseAsset.variants ?? {}) }
    variants.forEach((v, i) => {
      const original = shadeOriginals.current[i]
      if (original) variantAssets[v.id] = { original, cutout: v.image ?? null, color: null }
    })
    // a new photo, a new package type, or no prepared asset yet: prepare after saving (never blocks it)
    const familyChanged = existing && (existing.shape !== base.shape || existing.asset?.familySource !== baseAsset.familySource)
    const needsPrepare = newPhoto || !base.asset || baseAsset.version === 0 || Boolean(familyChanged)
    const product: Product = {
      ...base,
      id: base.id || slug,
      slug,
      variants,
      asset: { ...baseAsset, variants: variantAssets, status: needsPrepare ? 'pending' : baseAsset.status },
    }
    if (await save(product, { prepare: needsPrepare })) {
      setNewPhoto(false)
      shadeOriginals.current = {}
      navigate(existing ? `/admin/products/${product.id}` : '/admin/products')
    }
  }

  const provider = configuredProvider()
  const familyOptions = FAMILY_GROUPS.map((g) => ({ group: g, items: PACKAGE_FAMILIES.filter((f) => FAMILIES[f].group === g.id) }))
  const shown = stored && existing ? existing : p
  const shownAsset: ProductAsset = { ...emptyAsset(), ...(shown.asset ?? {}) }

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/admin/products" className="grid h-10 w-10 place-items-center rounded-full hover:bg-ink/5" aria-label={a('Retour', 'Back')}>
          <Icon name="back" className="rtl:rotate-180" />
        </Link>
        <h1 className="font-display text-4xl text-garnet">{existing ? text(existing.name) : a('Nouveau produit', 'New product')}</h1>
        {existing && <AssetStatusBadge product={existing} testId="asset-status" />}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={a('Présentation', 'Presentation')}>
          <div className="flex flex-col gap-4">
            <PhotoPicker
              preview={preview || assetUrl(existing?.image ?? p.image)}
              name={p.slug || slugify(p.name.fr)}
              onPicked={(ref, url) => {
                setPreview(url)
                setNewPhoto(true)
                setAsset({ original: ref, status: 'pending', error: null })
              }}
            />
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

          <Card title={a('Catégorie et emballage', 'Category and packaging')}>
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
              <Label
                label={a('Type d’emballage (modèle 3D)', 'Package type (3D model)')}
                hint={asset.familySource === 'auto' ? a('Détecté automatiquement à partir du nom et de la photo', 'Detected from the name and the photo') : a('Choisi à la main', 'Chosen by hand')}
              >
                <select
                  className="field"
                  value={asset.familySource === 'auto' ? 'auto' : p.shape}
                  data-testid="family-select"
                  onChange={(e) => {
                    if (e.target.value === 'auto') setAsset({ familySource: 'auto' })
                    else {
                      set('shape', e.target.value as PackageFamily)
                      setAsset({ familySource: 'manual' })
                    }
                  }}
                >
                  <option value="auto">
                    {a('Automatique', 'Automatic')} ({FAMILIES[shown.shape].label[lang]})
                  </option>
                  {familyOptions.map(({ group, items }) => (
                    <optgroup key={group.id} label={group.label[lang]}>
                      {items.map((f) => (
                        <option key={f} value={f}>
                          {FAMILIES[f].label[lang]}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </Label>
            </div>
            <div className="mt-3 mb-1 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">{a('Dimensions réelles (cm)', 'Real size (cm)')}</p>
              <Toggle checked={!asset.dimsEstimated} onChange={(v) => setAsset({ dimsEstimated: !v })} label={a('Mesurées', 'Measured')} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {(['widthCm', 'heightCm', 'depthCm'] as const).map((k, i) => (
                <Label key={k} label={[a('Largeur', 'Width'), a('Hauteur', 'Height'), a('Profondeur', 'Depth')][i]}>
                  <NumberInput
                    value={stored && stored.version > asset.version && asset.dimsEstimated ? shown[k] : p[k]}
                    onChange={(v) => {
                      set(k, v ?? 1)
                      setAsset({ dimsEstimated: false })
                    }}
                    step={0.5}
                  />
                </Label>
              ))}
            </div>
            {asset.dimsEstimated && (
              <p className="mt-2 text-xs text-[#8a5b12]">
                {a('Tailles estimées d’après le type d’emballage et la photo : saisissez les vraies mesures si possible.', 'Sizes estimated from the package type and the photo: enter the real measurements when you can.')}
              </p>
            )}
          </Card>

          <Card title={a('En rayon', 'On the shelf')}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Label label={a('Meuble', 'Fixture')} hint={!p.placement ? a('Vide = placé automatiquement à l’enregistrement', 'Empty = placed automatically when saved') : undefined}>
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
                  <option value="">{a('— Automatique / pas en rayon', '— Automatic / not on a shelf')}</option>
                  {layout.fixtures
                    .filter((f) => f.stock === 'shelf')
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {catalog.settings.fixtureLabels[f.id] ? text(catalog.settings.fixtureLabels[f.id]) : f.id}
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
                    <NumberInput value={p.placement.facings} onChange={(v) => set('placement', { ...p.placement!, facings: Math.min(10, Math.max(1, v ?? 1)) })} />
                  </Label>
                  <Label label={a('Orientation', 'Orientation')}>
                    <select className="field" value={p.placement.orientation ?? 'upright'} onChange={(e) => set('placement', { ...p.placement!, orientation: e.target.value as 'upright' | 'flat' })}>
                      <option value="upright">{a('Debout', 'Standing')}</option>
                      <option value="flat">{a('À plat (face vers le haut)', 'Lying flat (face up)')}</option>
                    </select>
                  </Label>
                  <Label label={a('Échelle d’affichage', 'Display scale')} hint="0.5 – 2">
                    <NumberInput value={p.placement.scale ?? 1} onChange={(v) => set('placement', { ...p.placement!, scale: Math.min(2, Math.max(0.5, v ?? 1)) })} step={0.05} />
                  </Label>
                </>
              )}
            </div>
            {check?.overflow && <p className="mt-2 text-sm text-danger">{a('Plus de place sur cette étagère : choisissez-en une autre.', 'This shelf is full: choose another one.')}</p>}
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
        title={a('Modèle 3D', '3D model')}
        actions={
          existing && (
            <div className="flex flex-wrap gap-2">
              {shownAsset.status === 'review' && !job && (
                <button
                  className="btn-quiet h-9 !py-0 text-sm"
                  onClick={() => void save({ ...existing, asset: { ...shownAsset, status: 'ready', review: 'approved' } })}
                  data-testid="approve-asset"
                >
                  {a('Valider', 'Mark as reviewed')}
                </button>
              )}
              <button className="btn-quiet h-9 !py-0 text-sm" onClick={() => void prepare(existing.id)} disabled={Boolean(job)} data-testid="retry-asset">
                <Icon name="sparkle" size={16} />
                {shownAsset.status === 'failed' ? a('Réessayer', 'Retry') : a('Préparer à nouveau', 'Prepare again')}
              </button>
            </div>
          )
        }
      >
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          {existing && shownAsset.version > 0 && shownAsset.status !== 'failed' ? (
            <Suspense fallback={<div className="h-56 rounded-2xl bg-blush/50" />}>
              <ModelPreview product={existing} />
            </Suspense>
          ) : (
            <p className="grid h-56 place-items-center rounded-2xl bg-blush/40 p-4 text-center text-sm text-mist">
              {a('Le modèle 3D est préparé automatiquement après l’enregistrement.', 'The 3D model is prepared automatically after saving.')}
            </p>
          )}
          <div className="flex flex-col gap-2 text-sm">
            <p>
              <span className="text-mist">{a('Modèle : ', 'Model: ')}</span>
              {shownAsset.cutout || !shown.asset ? FAMILIES[shown.shape].label[lang] : a('carte photo (pas de détourage propre)', 'photo card (no clean cut-out)')}
              {shownAsset.version > 0 && <span className="text-mist"> · v{shownAsset.version}</span>}
            </p>
            {shownAsset.updatedAt && (
              <p className="text-mist">
                {a('Préparé le ', 'Prepared on ')}
                {new Date(shownAsset.updatedAt).toLocaleString(lang)}
              </p>
            )}
            {shownAsset.error && (
              <p className="rounded-xl bg-danger/10 p-2 text-danger" data-testid="asset-error">
                {shownAsset.error}
              </p>
            )}
            {shownAsset.notes.length > 0 && (
              <ul className="list-disc space-y-1 ps-5 text-[#7a5310]" data-testid="asset-notes">
                {shownAsset.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            )}
            <p className="text-xs text-mist" data-testid="model-provider">
              {provider
                ? a(`Service de génération 3D : ${provider.label}`, `Image-to-3D service: ${provider.label}`)
                : a(
                    'Génération 3D par IA : non configurée. Le modèle est construit à partir de la photo et du type d’emballage.',
                    'AI image-to-3D generation: not configured. The model is built from the photo and the package type.',
                  )}
            </p>
            {shown.source?.url && (
              <p className="text-xs text-mist">
                {a('Source : ', 'Source: ')}
                <a className="underline" href={shown.source.url} target="_blank" rel="noreferrer">
                  {shown.source.name ?? shown.source.url}
                </a>
                {shown.source.license && ` · ${shown.source.license}`}
              </p>
            )}
          </div>
        </div>
      </Card>

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
                  <ShadePhoto
                    value={v.image}
                    name={`${p.slug || slugify(p.name.fr)}-${slugify(v.name.fr)}`}
                    onChange={(image, original) => {
                      shadeOriginals.current[i] = original
                      updateVariant(i, { image })
                    }}
                  />
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
