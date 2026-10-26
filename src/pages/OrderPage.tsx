import { Link, useParams } from 'react-router'
import { localOrders } from '@/lib/data-source'
import { OrderConfirmation } from '@/ui/Checkout'
import { PageShell } from '@/ui/PageShell'
import { useLocale } from '@/ui/hooks'

/** Order confirmation, readable again later from this device (orders are remembered locally). */
export default function OrderPage() {
  const { number } = useParams()
  const { t } = useLocale()
  const order = localOrders().find((o) => o.number === number)
  return (
    <PageShell>
      <div className="max-w-lg pt-8">
        {order ? <OrderConfirmation order={order} /> : <p className="text-mist">{t('order.notFound')}</p>}
        <Link to="/" className="btn-quiet mt-6">
          {t('order.back')}
        </Link>
      </div>
    </PageShell>
  )
}
