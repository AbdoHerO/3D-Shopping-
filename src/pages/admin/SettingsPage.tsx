import { useMemo, useState } from 'react'
import { createLayout, validateLayout } from '@/lib/layout'
import { normalisePhone } from '@/lib/whatsapp'
import type { Settings, Storefront } from '@/lib/types'
import { assetUrl } from '@/lib/assets'
import { decodeBlob, encodeWebp, sniffBlobType } from '@/lib/product-assets/browser'
import { downscale } from '@/lib/product-assets/raster'
import { validateUpload } from '@/lib/product-assets/prepare'
import { adminApi } from './api'
import { useAdmin } from './store'
import { Card, I18nInput, Label, NumberInput } from './ui'
import { useA } from './text'

export default function SettingsPage() {
  const a = useA()
  const catalog = useAdmin((s) => s.catalog)!
  const saveSettings = useAdmin((s) => s.saveSettings)
  const load = useAdmin((s) => s.load)
  const busy = useAdmin((s) => s.busy)
  const [s, setS] = useState<Settings>(() => structuredClone(catalog.settings))
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((x) => ({ ...x, [k]: v }))
  const layoutProblems = useMemo(() => validateLayout(createLayout(s.store)), [s.store])
  const phoneOk = normalisePhone(s.whatsappNumber) !== null

  const storefront: Storefront = s.storefront ?? { title: s.shopName.toUpperCase(), subtitle: '', logoUrl: s.logoUrl ?? null }
  const setFront = (patch: Partial<Storefront>) => set('storefront', { ...storefront, ...patch })
  const [logoError, setLogoError] = useState<string | null>(null)

  const exportCatalog = () => {
    // originals kept in this browser (idb:) cannot travel with the file: the prepared images do
    const products = catalog.products.map((p) => (p.asset?.original?.startsWith('idb:') ? { ...p, asset: { ...p.asset, original: null } } : p))
    const blob = new Blob([JSON.stringify({ ...catalog, products, settings: s }, null, 1)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'catalog.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      <h1 className="font-display text-4xl text-garnet">{a('Réglages', 'Settings')}</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={a('La boutique', 'The boutique')}>
          <div className="flex flex-col gap-3">
            <Label label={a('Nom de la boutique', 'Shop name')}>
              <input className="field" value={s.shopName} onChange={(e) => set('shopName', e.target.value)} />
            </Label>
            <I18nInput label={a('Slogan', 'Tagline')} value={s.tagline} onChange={(v) => set('tagline', v)} />
            <I18nInput label={a('Adresse', 'Address')} value={s.address} onChange={(v) => set('address', v)} />
            <I18nInput label={a('Horaires', 'Opening hours')} value={s.openingHours} onChange={(v) => set('openingHours', v)} />
            <Label label="Instagram">
              <input className="field" value={s.instagramUrl ?? ''} onChange={(e) => set('instagramUrl', e.target.value || null)} placeholder="https://instagram.com/…" />
            </Label>
          </div>
        </Card>
        <Card title={a('Commandes', 'Orders')}>
          <div className="flex flex-col gap-3">
            <Label
              label={a('Numéro WhatsApp qui reçoit les commandes', 'WhatsApp number that receives orders')}
              hint={a('Format international, ex. 212 6 12 34 56 78', 'International format, e.g. 212 6 12 34 56 78')}
              error={phoneOk ? null : a('Numéro invalide', 'Invalid number')}
            >
              <input className="field" dir="ltr" value={s.whatsappNumber} onChange={(e) => set('whatsappNumber', e.target.value.replace(/[^\d]/g, ''))} data-testid="settings-whatsapp" />
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <Label label={a('Préfixe des commandes', 'Order prefix')}>
                <input className="field" value={s.orderPrefix} maxLength={6} onChange={(e) => set('orderPrefix', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} />
              </Label>
              <Label label={a('Devise (code)', 'Currency (code)')}>
                <input className="field" value={s.currency} maxLength={3} onChange={(e) => set('currency', e.target.value.toUpperCase())} />
              </Label>
            </div>
            <I18nInput label={a('Symbole affiché', 'Displayed symbol')} value={s.currencyLabel} onChange={(v) => set('currencyLabel', v)} />
          </div>
        </Card>
        <Card title={a('Dimensions de la boutique', 'Boutique dimensions')}>
          <p className="mb-3 text-sm text-mist">{a('Le magasin 3D se reconstruit à partir de ces mesures.', 'The 3D shop rebuilds itself from these measurements.')}</p>
          <div className="grid grid-cols-3 gap-3">
            <Label label={a('Largeur (m)', 'Width (m)')}>
              <NumberInput value={s.store.width} step={0.1} onChange={(v) => set('store', { ...s.store, width: v ?? 3.5 })} />
            </Label>
            <Label label={a('Profondeur (m)', 'Depth (m)')}>
              <NumberInput value={s.store.depth} step={0.1} onChange={(v) => set('store', { ...s.store, depth: v ?? 6.5 })} />
            </Label>
            <Label label={a('Plafond (m)', 'Ceiling (m)')}>
              <NumberInput value={s.store.ceiling} step={0.1} onChange={(v) => set('store', { ...s.store, ceiling: v ?? 3 })} />
            </Label>
          </div>
          {layoutProblems.length > 0 && <p className="mt-2 text-sm text-danger">{layoutProblems.join(' ')}</p>}
        </Card>
        <Card title={a('Enseigne (façade)', 'Storefront sign')}>
          <p className="mb-3 text-sm text-mist">
            {a(
              'Le texte et le logo de l’enseigne lumineuse au-dessus de la porte, en 3D.',
              'The text and logo of the lit sign above the door, in 3D.',
            )}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Label label={a('Nom sur l’enseigne', 'Sign title')}>
              <input className="field" value={storefront.title} maxLength={24} onChange={(e) => setFront({ title: e.target.value })} data-testid="sign-title" />
            </Label>
            <Label label={a('Sous-titre', 'Subtitle')}>
              <input className="field" value={storefront.subtitle} maxLength={32} onChange={(e) => setFront({ subtitle: e.target.value })} />
            </Label>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="grid h-14 w-20 place-items-center rounded-xl bg-ink">
              {storefront.logoUrl ? <img src={assetUrl(storefront.logoUrl)} alt="" className="max-h-12 max-w-16 object-contain" /> : <span className="text-xs text-white/60">logo</span>}
            </div>
            <label className="btn-quiet h-9 cursor-pointer !py-0 text-sm">
              {a('Choisir un logo', 'Choose a logo')}
              <input
                type="file"
                accept="image/png,image/webp,image/jpeg"
                className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setLogoError(null)
                  try {
                    const invalid = validateUpload({ type: await sniffBlobType(file), size: file.size })
                    if (invalid) throw new Error(invalid)
                    const img = downscale(await decodeBlob(file), 600)
                    setFront({ logoUrl: await adminApi.uploadImage(await encodeWebp(img, 0.92), 'logo') })
                  } catch (err) {
                    setLogoError(err instanceof Error ? err.message : String(err))
                  } finally {
                    e.target.value = ''
                  }
                }}
              />
            </label>
            {storefront.logoUrl && (
              <button className="text-sm text-mist hover:text-danger" onClick={() => setFront({ logoUrl: null })}>
                {a('Retirer', 'Remove')}
              </button>
            )}
          </div>
          {logoError && <p className="mt-2 text-sm text-danger">{logoError}</p>}
        </Card>
        <Card title={a('Noms des rayons', 'Section names')}>
          <div className="flex flex-col gap-3">
            {Object.keys(s.fixtureLabels).map((id) => (
              <I18nInput key={id} label={id} value={s.fixtureLabels[id]} onChange={(v) => set('fixtureLabels', { ...s.fixtureLabels, [id]: v })} />
            ))}
          </div>
        </Card>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {adminApi.mode === 'demo' && (
          <>
            <button className="btn-quiet h-11 !py-0" onClick={exportCatalog}>
              {a('Exporter catalog.json', 'Export catalog.json')}
            </button>
            <button
              className="h-11 px-3 text-sm text-mist hover:text-danger"
              onClick={async () => {
                if (!window.confirm(a('Revenir au catalogue de démonstration ?', 'Go back to the demo catalog?'))) return
                await adminApi.resetDemo?.()
                await load()
                window.location.reload()
              }}
            >
              {a('Réinitialiser la démo', 'Reset the demo')}
            </button>
          </>
        )}
        <button className="btn-primary h-11 !py-0" disabled={busy || layoutProblems.length > 0 || !phoneOk} onClick={() => saveSettings(s)} data-testid="save-settings">
          {a('Enregistrer les réglages', 'Save settings')}
        </button>
      </div>
    </div>
  )
}
