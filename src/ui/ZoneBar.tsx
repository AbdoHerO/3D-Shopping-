import { useEffect, useRef } from 'react'
import { useCatalog } from '@/state/catalog'
import { useUi } from '@/state/ui'
import { goToFixture } from '@/three/actions'
import { useLocale } from './hooks'

/** Fixtures in the order a customer walks past them: left side in, back wall, right side out. */
const ORDER = ['entrance', 'stand-nails', 'wall-hair', 'wall-body', 'wall-makeup', 'wall-skin', 'wall-gifts', 'wall-perfume', 'counter']

export function ZoneBar() {
  const { t, text } = useLocale()
  const settings = useCatalog((s) => s.catalog?.settings)
  const layout = useCatalog((s) => s.layout)
  const focus = useUi((s) => s.focus)
  const list = useRef<HTMLUListElement>(null)
  // keep the current section's chip visible on narrow screens
  useEffect(() => {
    const el = list.current?.querySelector<HTMLElement>('[aria-current="location"]')
    el?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [focus])
  if (!settings || !layout) return null
  const browsable = layout.fixtures.filter((f) => f.browsable)
  const ids = [
    ...ORDER.filter((id) => id === 'entrance' || browsable.some((f) => f.id === id)),
    ...browsable.map((f) => f.id).filter((id) => !ORDER.includes(id)),
  ]
  return (
    <nav aria-label={t('store.map')} className="pointer-events-none absolute inset-x-0 top-[calc(max(10px,env(safe-area-inset-top))+62px)] z-20 flex justify-center">
      <ul ref={list} className="no-scrollbar pointer-events-auto flex max-w-full gap-1.5 overflow-x-auto px-3 py-1">
        {ids.map((id) => {
          const active = focus === id
          const label = id === 'entrance' ? t('nav.entrance') : settings.fixtureLabels[id] ? text(settings.fixtureLabels[id]) : id
          return (
            <li key={id} className="shrink-0">
              <button
                onClick={() => goToFixture(id)}
                aria-current={active ? 'location' : undefined}
                className={`h-9 rounded-full px-3.5 text-sm font-medium whitespace-nowrap shadow-soft transition ${
                  active ? 'bg-garnet text-white' : 'glass text-ink hover:bg-white'
                }`}
                data-testid={`zone-${id}`}
              >
                {label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
