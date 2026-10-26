import { useRef } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'
import { useCatalog } from '@/state/catalog'
import { useUi } from '@/state/ui'
import { enterBoutique, jumpInside } from '@/three/actions'
import { killTween } from '@/three/rig'
import { Monogram, LanguageSelect } from './Header'
import { Icon } from './Icon'
import { useLocale } from './hooks'

gsap.registerPlugin(SplitText, useGSAP)

/** The welcome card shown on the pavement, before the doors open. */
export function Landing() {
  const { t, text } = useLocale()
  const settings = useCatalog((s) => s.catalog?.settings)
  const phase = useUi((s) => s.phase)
  const ready = useUi((s) => s.sceneReady)
  const title = useRef<HTMLHeadingElement>(null)
  const show = phase === 'outside' && ready && !!settings

  useGSAP(
    () => {
      if (!show || !title.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      const split = SplitText.create(title.current, { type: 'words,chars', mask: 'chars' })
      gsap.from(split.chars, { yPercent: 110, duration: 0.9, ease: 'power3.out', stagger: 0.035, delay: 0.15 })
      return () => split.revert()
    },
    { dependencies: [show, settings?.shopName] },
  )

  return (
    <AnimatePresence>
      {show && settings && (
        <motion.section
          key="landing"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16, transition: { duration: 0.35 } }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center p-3 pb-[max(14px,env(safe-area-inset-bottom))] md:inset-y-0 md:start-0 md:end-auto md:items-center md:p-8"
        >
          <div className="glass pointer-events-auto w-full max-w-md rounded-[30px] p-5 shadow-float sm:p-6 md:p-8" data-testid="landing">
            <div className="flex items-center gap-3">
              <Monogram name={settings.shopName} size={44} />
              <p className="text-sm text-mist">{text(settings.tagline)}</p>
            </div>
            <h1 ref={title} className="mt-3 font-display text-[clamp(2.3rem,7vw,4.2rem)] leading-[0.95] text-garnet sm:mt-4">
              {settings.shopName}
            </h1>
            <p className="mt-3 max-w-[38ch] text-[0.95rem] leading-relaxed text-ink/80">{t('landing.lede')}</p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button className="btn-primary h-12 px-6 text-base" onClick={enterBoutique} data-testid="enter">
                <Icon name="door" size={18} />
                {t('landing.enter')}
              </button>
              <Link to="/catalog" className="btn-quiet h-12">
                {t('landing.list')}
              </Link>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-3 text-xs text-mist">
              <span className="flex items-center gap-1.5">
                <Icon name="truck" size={16} />
                {t('landing.delivery')}
              </span>
              <LanguageSelect />
            </div>
            <p className="mt-2 hidden text-xs text-mist sm:block">
              {text(settings.address)} · {text(settings.openingHours)}
            </p>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  )
}

export function SkipIntro() {
  const { t } = useLocale()
  const phase = useUi((s) => s.phase)
  return (
    <AnimatePresence>
      {phase === 'entering' && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.6 } }}
          exit={{ opacity: 0 }}
          onClick={() => {
            killTween()
            jumpInside()
          }}
          className="glass absolute end-4 bottom-[max(16px,env(safe-area-inset-bottom))] z-30 rounded-full px-4 py-2 text-sm font-medium text-garnet shadow-soft"
        >
          {t('landing.skip')}
        </motion.button>
      )}
    </AnimatePresence>
  )
}

export function LoadingScreen() {
  const { t } = useLocale()
  const ready = useUi((s) => s.sceneReady)
  const status = useCatalog((s) => s.status)
  const error = useCatalog((s) => s.error)
  const load = useCatalog((s) => s.load)
  const name = useCatalog((s) => s.catalog?.settings.shopName) ?? ''
  return (
    <AnimatePresence>
      {!ready && (
        <motion.div
          key="loading"
          className="absolute inset-0 z-50 grid place-items-center bg-porcelain"
          exit={{ opacity: 0, transition: { duration: 0.8 } }}
          data-testid="loading"
        >
          <div className="flex flex-col items-center gap-4 px-6 text-center">
            {name && <Monogram name={name} size={64} />}
            {name && <p className="font-display text-3xl text-garnet">{name}</p>}
            {status === 'error' ? (
              <>
                <p className="text-ink">{t('store.loadError')}</p>
                <p className="max-w-sm text-xs text-mist">{error}</p>
                <button className="btn-primary" onClick={() => void load()}>
                  {t('store.retry')}
                </button>
              </>
            ) : (
              <>
                <div className="relative h-1 w-48 overflow-hidden rounded-full bg-rosewater">
                  <div className="absolute inset-y-0 w-1/3 animate-[loading_1.4s_ease-in-out_infinite] rounded-full bg-garnet" />
                </div>
                <p className="text-sm text-mist">{t('store.loading')}</p>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
