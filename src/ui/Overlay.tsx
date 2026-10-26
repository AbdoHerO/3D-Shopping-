import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useCatalog } from '@/state/catalog'
import { useUi } from '@/state/ui'
import { goToFixture, setWalking } from '@/three/actions'
import { joystick } from '@/three/input'
import { rig } from '@/three/rig'
import { hotspot } from './hotspot'
import { Icon } from './Icon'
import { useLocale } from './hooks'

export function Toasts() {
  const toasts = useUi((s) => s.toasts)
  const dismiss = useUi((s) => s.dismissToast)
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[calc(max(10px,env(safe-area-inset-top))+112px)] z-40 flex flex-col items-center gap-2 px-3" aria-live="polite">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.button
            key={toast.id}
            layout
            initial={{ y: -16, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            onClick={() => {
              dismiss(toast.id)
              if (toast.kind === 'added') useUi.getState().openPanel('cart')
            }}
            className="pointer-events-auto flex max-w-sm items-center gap-3 rounded-full bg-garnet py-1.5 ps-1.5 pe-4 text-start text-sm text-white shadow-float"
            data-testid="toast"
          >
            {toast.image ? (
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white">
                <img src={toast.image} alt="" className="max-h-7 max-w-7 object-contain" />
              </span>
            ) : (
              <Icon name="sparkle" className="ms-2 text-champagne" />
            )}
            <span className="line-clamp-2">{toast.text}</span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  )
}

export function Hint() {
  const hint = useUi((s) => s.hint)
  const selected = useUi((s) => s.selected)
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[max(20px,env(safe-area-inset-bottom))] z-20 flex justify-center px-4" aria-live="polite">
      <AnimatePresence>
        {hint && !selected && (
          <motion.p
            key={hint}
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }}
            className="glass max-w-md rounded-full px-4 py-2 text-center text-sm text-ink shadow-soft"
            data-testid="hint"
          >
            {hint}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Top-down plan of the shop with a live "you are here" marker; tap a fixture to go there. */
export function MiniMap({ className = '' }: { className?: string }) {
  const { t, text } = useLocale()
  const layout = useCatalog((s) => s.layout)
  const labels = useCatalog((s) => s.catalog?.settings.fixtureLabels)
  const marker = useRef<SVGGElement>(null)
  useEffect(() => {
    let raf = 0
    const tick = () => {
      if (marker.current) {
        const deg = (-rig.live.yaw * 180) / Math.PI
        marker.current.setAttribute('transform', `translate(${rig.live.x} ${-rig.live.z}) rotate(${deg})`)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  if (!layout || !labels) return null
  const { width: W, depth: D } = layout.dims
  const pad = 0.25
  return (
    <figure className={`glass rounded-3xl p-2 shadow-float ${className}`} aria-label={t('store.map')}>
      <svg viewBox={`${-W / 2 - pad} ${-pad} ${W + pad * 2} ${D + pad * 2}`} className="block h-full w-full" role="img">
        <title>{t('store.map')}</title>
        <rect x={-W / 2} y={0} width={W} height={D} rx={0.08} fill="#fbf1ef" stroke="#c9a46a" strokeWidth={0.03} />
        <line x1={layout.door.x0} x2={layout.door.x1} y1={0} y2={0} stroke="#fbf5f3" strokeWidth={0.08} />
        {layout.fixtures.map((f, i) => {
          if (!f.browsable) return null
          const c = layout.colliders[i]
          const x = c.min[0]
          const y = -c.max[1]
          const w = c.max[0] - c.min[0]
          const h = c.max[1] - c.min[1]
          return (
            <g key={f.id} className="cursor-pointer" onClick={() => goToFixture(f.id)}>
              <rect x={x} y={y} width={w} height={h} rx={0.04} fill={f.kind === 'perfumeWall' ? '#6b1f3d' : f.kind === 'counter' ? '#c9a46a' : '#e8b9c1'} />
              <text
                x={x + w / 2}
                y={y + h / 2}
                fontSize={0.2}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={f.kind === 'perfumeWall' ? '#f3dfe3' : '#2a1820'}
                transform={w < h ? `rotate(-90 ${x + w / 2} ${y + h / 2})` : undefined}
                style={{ fontFamily: 'Jost, Tajawal, sans-serif' }}
              >
                {text(labels[f.id])}
              </text>
            </g>
          )
        })}
        <g ref={marker}>
          <path d="M0 0 L-0.38 -0.62 A0.72 0.72 0 0 1 0.38 -0.62 Z" fill="#6b1f3d" opacity={0.18} />
          <circle r={0.11} fill="#6b1f3d" stroke="#fff" strokeWidth={0.04} />
        </g>
      </svg>
    </figure>
  )
}

export function Onboarding() {
  const { t } = useLocale()
  const panel = useUi((s) => s.panel)
  const phase = useUi((s) => s.phase)
  const openPanel = useUi((s) => s.openPanel)
  useEffect(() => {
    if (phase !== 'inside') return
    try {
      if (!localStorage.getItem('boutique.onboarded')) openPanel('help')
    } catch {
      /* ignore */
    }
  }, [phase, openPanel])
  const done = () => {
    try {
      localStorage.setItem('boutique.onboarded', '1')
    } catch {
      /* ignore */
    }
    openPanel(null)
  }
  const steps: { icon: 'store' | 'eye' | 'bag'; text: string }[] = [
    { icon: 'store', text: t('onboarding.step1') },
    { icon: 'eye', text: t('onboarding.step2') },
    { icon: 'bag', text: t('onboarding.step3') },
  ]
  return (
    <AnimatePresence>
      {panel === 'help' && (
        <motion.div key="help" className="fixed inset-0 z-50 grid place-items-end bg-ink/25 p-3 sm:place-items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboarding-title"
            initial={{ y: 30, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="w-full max-w-sm rounded-[26px] bg-porcelain p-6 shadow-float"
            data-testid="onboarding"
          >
            <h2 id="onboarding-title" className="font-display text-3xl text-garnet">
              {t('onboarding.title')}
            </h2>
            <ol className="mt-4 flex flex-col gap-3">
              {steps.map((s, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-rosewater text-garnet">
                    <Icon name={s.icon} size={18} />
                  </span>
                  <span className="pt-1.5 leading-snug">{s.text}</span>
                </li>
              ))}
            </ol>
            <button className="btn-primary mt-6 w-full" onClick={done} autoFocus>
              {t('onboarding.go')}
            </button>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Thumb joystick for walking on touch screens. */
export function Joystick() {
  const knob = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)
  const R = 46
  const update = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    let x = e.clientX - (r.left + r.width / 2)
    let y = e.clientY - (r.top + r.height / 2)
    const d = Math.hypot(x, y)
    if (d > R) {
      x = (x / d) * R
      y = (y / d) * R
    }
    joystick.x = x / R
    joystick.y = y / R
    if (knob.current) knob.current.style.transform = `translate(${x}px, ${y}px)`
  }
  const reset = () => {
    joystick.x = 0
    joystick.y = 0
    setActive(false)
    if (knob.current) knob.current.style.transform = ''
  }
  return (
    <div
      className="glass pointer-events-auto relative grid h-32 w-32 touch-none place-items-center rounded-full shadow-float"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        setActive(true)
        update(e)
      }}
      onPointerMove={(e) => active && update(e)}
      onPointerUp={reset}
      onPointerCancel={reset}
      aria-hidden="true"
      data-testid="joystick"
    >
      <div ref={knob} className="h-14 w-14 rounded-full bg-garnet/85 shadow-soft transition-transform duration-75" />
    </div>
  )
}

export function NavControls() {
  const { t } = useLocale()
  const navMode = useUi((s) => s.navMode)
  const mapOpen = useUi((s) => s.mapOpen)
  const toggleMap = useUi((s) => s.toggleMap)
  const openPanel = useUi((s) => s.openPanel)
  const btn = 'glass grid h-11 w-11 place-items-center rounded-full text-garnet shadow-soft transition hover:bg-white'
  return (
    <div className="pointer-events-auto flex flex-col gap-2">
      <button className={`${btn} ${mapOpen ? '!bg-garnet !text-white' : ''}`} onClick={() => toggleMap()} aria-pressed={mapOpen} aria-label={t('nav.map')} title={t('nav.map')}>
        <Icon name="map" />
      </button>
      <button
        className={`${btn} ${navMode === 'walk' ? '!bg-garnet !text-white' : ''}`}
        onClick={() => setWalking(navMode !== 'walk')}
        aria-pressed={navMode === 'walk'}
        aria-label={navMode === 'walk' ? t('nav.guided') : t('nav.walk')}
        title={navMode === 'walk' ? t('nav.guided') : t('nav.walk')}
        data-testid="walk-toggle"
      >
        <Icon name="walk" />
      </button>
      <button className={btn} onClick={() => openPanel('help')} aria-label={t('nav.help')} title={t('nav.help')}>
        <Icon name="help" />
      </button>
    </div>
  )
}

/** Pulsing ring over the selected product, positioned every frame by the 3D scene. */
export function Hotspot() {
  return (
    <div ref={(el) => void (hotspot.el = el)} className="pointer-events-none absolute top-0 left-0 z-10 hidden" aria-hidden="true">
      <span className="absolute -top-4 -left-4 h-8 w-8 animate-ping rounded-full bg-white/70" />
      <span className="absolute -top-3 -left-3 grid h-6 w-6 place-items-center rounded-full bg-garnet ring-2 ring-white">
        <span className="h-2 w-2 rounded-full bg-white" />
      </span>
    </div>
  )
}
