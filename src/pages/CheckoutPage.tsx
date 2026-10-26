import { useState } from 'react'
import { Link } from 'react-router'
import type { Order } from '@/lib/types'
import { CartLines, CheckoutForm, OrderConfirmation } from '@/ui/Checkout'
import { PageShell } from '@/ui/PageShell'
import { useLocale } from '@/ui/hooks'

export default function CheckoutPage() {
  const { t } = useLocale()
  const [order, setOrder] = useState<Order | null>(null)
  return (
    <PageShell>
      <h1 className="pt-8 pb-6 font-display text-5xl text-garnet">{order ? t('checkout.summary') : t('checkout.title')}</h1>
      {order ? (
        <div className="max-w-lg">
          <OrderConfirmation order={order} />
          <Link to="/" className="btn-quiet mt-4">
            {t('order.back')}
          </Link>
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-[1fr_380px]">
          <CheckoutForm onDone={setOrder} />
          <aside className="order-first md:order-none">
            <h2 className="mb-3 font-display text-2xl">{t('cart.title')}</h2>
            <CartLines />
          </aside>
        </div>
      )}
    </PageShell>
  )
}
