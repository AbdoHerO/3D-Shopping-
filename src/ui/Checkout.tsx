import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { assetUrl } from '@/lib/assets'
import { IS_LIVE, placeOrder } from '@/lib/data-source'
import { computeTotals } from '@/lib/pricing'
import { buildWhatsAppMessage, normalisePhone, whatsappUrl } from '@/lib/whatsapp'
import type { Order } from '@/lib/types'
import { useCart } from '@/state/cart'
import { useCatalog } from '@/state/catalog'
import { Icon, WhatsAppIcon } from './Icon'
import { useLocale } from './hooks'

function useSchema() {
  const { t } = useLocale()
  return useMemo(
    () =>
      z.object({
        name: z.string().trim().min(2, t('checkout.errors.required')),
        phone: z
          .string()
          .trim()
          .min(1, t('checkout.errors.required'))
          .refine((v) => normalisePhone(v) !== null, t('checkout.errors.phone')),
        zoneId: z.string().min(1, t('checkout.errors.required')),
        address: z.string().trim().min(6, t('checkout.errors.short')),
        notes: z.string().max(400).optional(),
        preferredTime: z.string().max(80).optional(),
        consent: z.boolean().refine((v) => v, t('checkout.errors.consent')),
        company: z.string().max(0).optional(),
      }),
    [t],
  )
}

type FormValues = z.infer<ReturnType<typeof useSchema>>

function Field({ label, error, children, hint }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-mist">{hint}</span>}
      {error && (
        <span className="mt-1 block text-xs text-danger" role="alert">
          {error}
        </span>
      )}
    </label>
  )
}

export function CheckoutForm({ onDone }: { onDone: (order: Order) => void }) {
  const { t, money, locale } = useLocale()
  const schema = useSchema()
  const catalog = useCatalog((s) => s.catalog)!
  const lines = useCart((s) => s.lines)
  const clear = useCart((s) => s.clear)
  const [failed, setFailed] = useState(false)
  const zones = catalog.deliveryZones.filter((z) => z.isActive)
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', phone: '', zoneId: '', address: '', notes: '', preferredTime: '', consent: false, company: '' },
  })
  const zoneId = watch('zoneId')
  const zone = zones.find((z) => z.id === zoneId) ?? null
  const totals = computeTotals(lines, catalog, zone)

  const submit = handleSubmit(async (v) => {
    setFailed(false)
    if (v.company) return // honeypot
    try {
      const order = await placeOrder(
        {
          lines,
          zoneId: v.zoneId,
          locale,
          customer: {
            name: v.name.trim(),
            phone: normalisePhone(v.phone)!,
            city: zone?.city ?? '',
            address: v.address.trim(),
            notes: v.notes?.trim() || undefined,
            preferredTime: v.preferredTime?.trim() || undefined,
          },
        },
        catalog,
      )
      clear()
      onDone(order)
    } catch (e) {
      console.error(e)
      setFailed(true)
    }
  })

  if (totals.lines.length === 0) return <p className="text-mist">{t('checkout.errors.emptyCart')}</p>

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate data-testid="checkout-form">
      <h3 className="font-display text-2xl text-garnet">{t('checkout.contact')}</h3>
      <Field label={t('checkout.name')} error={errors.name?.message}>
        <input className="field" autoComplete="name" {...register('name')} data-testid="field-name" />
      </Field>
      <Field label={t('checkout.phone')} error={errors.phone?.message} hint={t('checkout.phoneHint')}>
        <input className="field" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" {...register('phone')} data-testid="field-phone" />
      </Field>
      <Field label={t('checkout.city')} error={errors.zoneId?.message}>
        <select className="field" {...register('zoneId')} data-testid="field-city">
          <option value="">{t('checkout.cityPick')}</option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.city} — {money(z.fee)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t('checkout.address')} error={errors.address?.message} hint={t('checkout.addressHint')}>
        <textarea className="field min-h-20" autoComplete="street-address" {...register('address')} data-testid="field-address" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('checkout.time')} hint={t('checkout.timeHint')}>
          <input className="field" {...register('preferredTime')} />
        </Field>
        <Field label={t('checkout.notes')}>
          <input className="field" {...register('notes')} />
        </Field>
      </div>
      <input type="text" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" {...register('company')} />
      <div className="rounded-2xl bg-white p-3 ring-1 ring-ink/10">
        <p className="text-sm font-medium">{t('checkout.payment')}</p>
        <p className="mt-0.5 flex items-center gap-2 text-sm text-ink">
          <Icon name="check" size={16} className="text-sage" />
          {t('checkout.cod')}
        </p>
        <p className="text-xs text-mist">{t('checkout.codHint')}</p>
      </div>
      <OrderTotals subtotal={totals.subtotal} delivery={zone ? totals.deliveryFee : null} free={totals.freeDelivery} total={totals.total} eta={zone ? zone.eta : null} />
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-garnet)]" {...register('consent')} data-testid="field-consent" />
        <span>
          {t('checkout.consent')}
          {errors.consent?.message && (
            <span className="mt-1 block text-xs text-danger" role="alert">
              {errors.consent.message}
            </span>
          )}
        </span>
      </label>
      {failed && (
        <p className="rounded-xl bg-danger/10 p-3 text-sm text-danger" role="alert">
          {t('checkout.errors.failed')}
        </p>
      )}
      <button type="submit" className="btn-primary h-12" disabled={isSubmitting} data-testid="place-order">
        {isSubmitting ? t('checkout.placing') : t('checkout.place')}
      </button>
    </form>
  )
}

export function OrderTotals({
  subtotal,
  delivery,
  free,
  total,
  eta,
}: {
  subtotal: number
  delivery: number | null
  free: boolean
  total: number
  eta: import('@/lib/types').I18nText | null
}) {
  const { t, money, text } = useLocale()
  return (
    <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
      <dt className="text-mist">{t('cart.subtotal')}</dt>
      <dd className="text-end tabular-nums">{money(subtotal)}</dd>
      <dt className="text-mist">
        {t('cart.delivery')}
        {eta && <span className="ms-1 text-xs">· {t('checkout.eta', { eta: text(eta) })}</span>}
      </dt>
      <dd className="text-end tabular-nums">{free ? t('cart.deliveryFree') : delivery == null ? t('cart.deliveryLater') : money(delivery)}</dd>
      <dt className="mt-1 font-display text-xl text-ink">{t('cart.total')}</dt>
      <dd className="mt-1 text-end font-display text-xl tabular-nums text-ink" data-testid="order-total">
        {money(total)}
      </dd>
    </dl>
  )
}

export function OrderConfirmation({ order, onBack }: { order: Order; onBack?: () => void }) {
  const { t, money, locale, text } = useLocale()
  const settings = useCatalog((s) => s.catalog?.settings)
  const zone = useCatalog((s) => s.catalog?.deliveryZones.find((z) => z.city === order.customer.city))
  if (!settings) return null
  const url = whatsappUrl(settings.whatsappNumber, buildWhatsAppMessage(order, settings, locale))
  const first = order.customer.name.split(' ')[0]
  return (
    <div className="flex flex-col gap-4" data-testid="order-confirmation">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-sage/15 text-sage">
        <Icon name="check" size={28} />
      </div>
      <div>
        <h3 className="font-display text-3xl leading-tight text-ink">{t('order.thanks', { name: first })}</h3>
        <p className="mt-1 text-mist" data-testid="order-number">
          {t('order.number', { number: order.number })}
        </p>
      </div>
      <a href={url} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#1f9d55] px-5 font-medium text-white shadow-soft transition hover:bg-[#188146]" data-testid="whatsapp-link">
        <WhatsAppIcon />
        {t('order.sendWhatsapp')}
      </a>
      <p className="text-sm text-mist">{IS_LIVE ? t('order.whatsappHint') : t('order.demoHint')}</p>
      <ul className="divide-y divide-ink/5 rounded-2xl bg-white ring-1 ring-ink/10">
        {order.items.map((i, k) => (
          <li key={k} className="flex justify-between gap-3 px-3 py-2 text-sm">
            <span>
              {i.qty} × {i.name}
            </span>
            <span className="tabular-nums">{money(i.lineTotal)}</span>
          </li>
        ))}
      </ul>
      <OrderTotals subtotal={order.subtotal} delivery={order.deliveryFee} free={order.deliveryFee === 0} total={order.total} eta={zone?.eta ?? null} />
      {zone && <p className="text-sm text-ink/80">{t('order.eta', { eta: text(zone.eta) })}</p>}
      {onBack && (
        <button className="btn-quiet" onClick={onBack}>
          {t('order.back')}
        </button>
      )}
    </div>
  )
}

export function CartLines() {
  const { t, text, money } = useLocale()
  const catalog = useCatalog((s) => s.catalog)!
  const lines = useCart((s) => s.lines)
  const setQty = useCart((s) => s.setQty)
  const remove = useCart((s) => s.remove)
  const totals = computeTotals(lines, catalog)
  return (
    <ul className="flex flex-col gap-2" data-testid="cart-lines">
      {totals.lines.map((l) => (
        <li key={`${l.productId}:${l.variantId}`} className="flex gap-3 rounded-2xl bg-white p-2.5 ring-1 ring-ink/5">
          <div className="grid h-16 w-14 shrink-0 place-items-center rounded-xl bg-blush">
            <img src={assetUrl(l.variant?.image || l.product.image)} alt="" className="max-h-14 max-w-12 object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{text(l.product.name)}</p>
            <p className="truncate text-xs text-mist">
              {l.variant ? text(l.variant.name) : l.product.sizeLabel} · {money(l.unitPrice)}
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="inline-flex h-8 items-center rounded-full ring-1 ring-ink/15">
                <button className="grid h-8 w-8 place-items-center text-garnet" onClick={() => setQty(l.productId, l.variantId, l.qty - 1)} aria-label={t('product.decrease')}>
                  <Icon name="minus" size={14} />
                </button>
                <span className="w-5 text-center text-sm tabular-nums">{l.qty}</span>
                <button className="grid h-8 w-8 place-items-center text-garnet disabled:opacity-30" disabled={l.qty >= l.available} onClick={() => setQty(l.productId, l.variantId, l.qty + 1)} aria-label={t('product.increase')}>
                  <Icon name="plus" size={14} />
                </button>
              </div>
              <button className="ms-auto text-xs text-mist underline-offset-2 hover:text-danger hover:underline" onClick={() => remove(l.productId, l.variantId)}>
                {t('cart.remove')}
              </button>
            </div>
          </div>
          <p className="text-sm font-medium tabular-nums">{money(l.lineTotal)}</p>
        </li>
      ))}
    </ul>
  )
}
