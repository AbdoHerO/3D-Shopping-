import { useState } from 'react'
import type { DeliveryZone } from '@/lib/types'
import { Icon } from '@/ui/Icon'
import { useAdmin } from './store'
import { Card, I18nInput, Label, NumberInput, Toggle } from './ui'
import { useA } from './text'
import { slugify } from '@/lib/slug'

export default function Delivery() {
  const a = useA()
  const catalog = useAdmin((s) => s.catalog)!
  const saveZones = useAdmin((s) => s.saveZones)
  const saveSettings = useAdmin((s) => s.saveSettings)
  const busy = useAdmin((s) => s.busy)
  const [zones, setZones] = useState<DeliveryZone[]>(() => structuredClone(catalog.deliveryZones))
  const [threshold, setThreshold] = useState<number | null>(catalog.settings.freeDeliveryThreshold ?? null)
  const update = (i: number, z: Partial<DeliveryZone>) => setZones((list) => list.map((x, k) => (k === i ? { ...x, ...z } : x)))

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-4xl text-garnet">{a('Livraison', 'Delivery')}</h1>
      <Card title={a('Livraison offerte', 'Free delivery')}>
        <div className="flex flex-wrap items-end gap-3">
          <Label label={a('À partir de (laisser vide pour désactiver)', 'From (leave empty to turn off)')}>
            <NumberInput value={threshold} onChange={setThreshold} />
          </Label>
          <button className="btn-primary h-11 !py-0" disabled={busy} onClick={() => saveSettings({ ...catalog.settings, freeDeliveryThreshold: threshold })}>
            {a('Enregistrer', 'Save')}
          </button>
        </div>
      </Card>
      <Card
        title={a('Villes et tarifs', 'Cities and fees')}
        actions={
          <button className="btn-quiet h-9 !py-0 text-sm" onClick={() => setZones([...zones, { id: '', city: '', fee: 30, eta: { fr: '48 h', ar: '48 ساعة', en: '48 h' }, isActive: true }])}>
            <Icon name="plus" size={16} />
            {a('Ajouter une ville', 'Add a city')}
          </button>
        }
      >
        <div className="flex flex-col gap-3">
          {zones.map((z, i) => (
            <div key={i} className="grid items-end gap-3 rounded-2xl bg-blush/40 p-3 sm:grid-cols-[1fr_110px_1.2fr_auto_auto]">
              <Label label={a('Ville', 'City')}>
                <input className="field" value={z.city} onChange={(e) => update(i, { city: e.target.value })} />
              </Label>
              <Label label={a('Frais', 'Fee')}>
                <NumberInput value={z.fee} onChange={(fee) => update(i, { fee: fee ?? 0 })} />
              </Label>
              <I18nInput label={a('Délai', 'Delay')} value={z.eta} onChange={(eta) => update(i, { eta })} />
              <Toggle checked={z.isActive} onChange={(isActive) => update(i, { isActive })} label={a('Active', 'Active')} />
              <button className="grid h-10 w-10 place-items-center rounded-full text-mist hover:bg-white hover:text-danger" onClick={() => setZones(zones.filter((_, k) => k !== i))} aria-label={a('Supprimer', 'Delete')}>
                <Icon name="trash" size={18} />
              </button>
            </div>
          ))}
          <button
            className="btn-primary h-11 self-end !py-0"
            disabled={busy || zones.some((z) => !z.city.trim())}
            onClick={() => saveZones(zones.map((z) => ({ ...z, id: z.id || slugify(z.city) || `zone-${Date.now()}` })))}
          >
            {a('Enregistrer les villes', 'Save cities')}
          </button>
        </div>
      </Card>
    </div>
  )
}
