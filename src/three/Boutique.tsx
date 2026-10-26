import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import * as THREE from 'three'
import { useTranslation } from 'react-i18next'
import { tr } from '@/lib/i18n-text'
import type { Locale } from '@/lib/types'
import { useCatalog } from '@/state/catalog'
import { useUi } from '@/state/ui'
import { useMaterials } from './materials'
import { Lighting } from './Lighting'
import { Room } from './Room'
import { Facade } from './Facade'
import { Fixtures } from './Fixtures'
import { Decor, Footprints } from './Decor'
import { Products } from './Products'
import { CameraRig } from './CameraRig'
import { Basket } from './Basket'
import { HotspotTracker } from './HotspotTracker'
import { Effects, type Tier } from './Effects'
import { DETAIL } from './packageGeometry'
import { signFont } from './fonts'
import { closeProduct, enterBoutique, onFacingClick, onFixtureClick } from './actions'
import { rig, walkTo } from './rig'

function initialTier(): Tier {
  const forced = new URLSearchParams(window.location.search).get('tier')
  if (forced === 'low' || forced === 'medium' || forced === 'high') return forced
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  if (coarse) return memory !== undefined && memory <= 3 ? 'low' : 'medium'
  return 'high'
}

const DPR: Record<Tier, [number, number]> = { high: [1, 1.75], medium: [1, 1.5], low: [1, 1] }
const ORDER: Tier[] = ['low', 'medium', 'high']

function Scene({ tier }: { tier: Tier }) {
  const { i18n } = useTranslation()
  const locale = i18n.language as Locale
  const catalog = useCatalog((s) => s.catalog)!
  const layout = useCatalog((s) => s.layout)!
  const m = useMaterials(layout.dims.width, layout.dims.depth)
  const { settings, products } = catalog
  const labelFor = useMemo(
    () => (id: string) => (settings.fixtureLabels[id] ? tr(settings.fixtureLabels[id], locale) : ''),
    [settings, locale],
  )
  const setReady = useUi((s) => s.setSceneReady)
  const onReady = useCallback(() => setReady(true), [setReady])
  // the street sign: configured text, or the shop name until the owner sets it
  const storefront = useMemo(
    () => settings.storefront ?? { title: settings.shopName.toUpperCase(), subtitle: tr(settings.tagline, locale), logoUrl: settings.logoUrl ?? null },
    [settings, locale],
  )
  const gl = useThree((s) => s.gl)

  useEffect(() => {
    rig.layout = layout
  }, [layout])

  useEffect(() => {
    gl.toneMapping = THREE.NeutralToneMapping
    gl.toneMappingExposure = 1.02
  }, [gl])

  const onFloor = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 8 || rig.mode !== 'walk') return
    e.stopPropagation()
    walkTo(e.point.x, e.point.z)
  }

  return (
    <>
      <Lighting dims={layout.dims} />
      <Room layout={layout} m={m} />
      <group onClick={(e) => (e.stopPropagation(), useUi.getState().phase === 'outside' && enterBoutique())}>
        <Facade layout={layout} m={m} storefront={storefront} />
      </group>
      <Fixtures fixtures={layout.fixtures} m={m} labelFor={labelFor} font={signFont(locale)} onSelect={onFixtureClick} />
      <Decor layout={layout} m={m} />
      <Products layout={layout} products={products} onPick={onFacingClick} onReady={onReady} detail={DETAIL[tier]} />
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.004, -layout.dims.depth / 2]} onClick={onFloor}>
        <planeGeometry args={[layout.dims.width, layout.dims.depth]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <Footprints layout={layout} />
      <CameraRig />
      <Basket />
      <HotspotTracker />
      <Effects tier={tier} />
    </>
  )
}

export default function Boutique() {
  const [tier, setTier] = useState<Tier>(initialTier)
  const ceiling = useMemo(() => initialTier(), [])
  const step = (dir: 1 | -1) =>
    setTier((t) => {
      const i = Math.max(0, Math.min(ORDER.indexOf(ceiling), ORDER.indexOf(t) + dir))
      return ORDER[i]
    })
  return (
    <Canvas
      dpr={DPR[tier]}
      gl={{ antialias: tier !== 'high', powerPreference: 'high-performance', alpha: false, stencil: false }}
      camera={{ fov: 46, near: 0.04, far: 140, position: [0, 1.75, 7.2] }}
      onPointerMissed={(e) => {
        if (e.type === 'click' && useUi.getState().selected) closeProduct()
      }}
      style={{ touchAction: 'none' }}
      data-testid="boutique-canvas"
    >
      <color attach="background" args={['#e9e7e4']} />
      <PerformanceMonitor flipflops={3} onDecline={() => step(-1)} onIncline={() => step(1)} onFallback={() => setTier('low')} />
      <Suspense fallback={null}>
        <Scene tier={tier} />
      </Suspense>
    </Canvas>
  )
}
