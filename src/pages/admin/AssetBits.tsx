import type { AssetStatus, Product } from '@/lib/types'
import { useA } from './text'
import { useAdmin } from './store'
import type { JobPhase } from './asset-job'

const STYLE: Record<AssetStatus | JobPhase, string> = {
  pending: 'bg-ink/5 text-mist',
  processing: 'bg-champagne/25 text-[#6d4f1d]',
  image: 'bg-champagne/25 text-[#6d4f1d]',
  model: 'bg-champagne/25 text-[#6d4f1d]',
  placing: 'bg-champagne/25 text-[#6d4f1d]',
  ready: 'bg-sage/15 text-sage',
  review: 'bg-[#f4e2c3] text-[#7a5310]',
  failed: 'bg-danger/10 text-danger',
}

/** The 3D asset state of a product: a running job in this tab wins over the stored status. */
export function AssetStatusBadge({ product, testId }: { product: Product; testId?: string }) {
  const a = useA()
  const phase = useAdmin((s) => s.jobs[product.id])
  const status: AssetStatus | JobPhase = phase ?? product.asset?.status ?? 'pending'
  const label: Record<AssetStatus | JobPhase, string> = {
    pending: a('En attente', 'Waiting for processing'),
    processing: a('Préparation…', 'Preparing…'),
    image: a('Préparation de la photo…', 'Preparing product image…'),
    model: a('Préparation du modèle 3D…', 'Preparing 3D representation…'),
    placing: a('Placement en rayon…', 'Placing on a shelf…'),
    ready: a('Prêt', 'Ready'),
    review: a('À vérifier', 'Needs review'),
    failed: a('Échec', 'Failed'),
  }
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${STYLE[status]}`} data-testid={testId} data-status={status}>
      {label[status]}
    </span>
  )
}
