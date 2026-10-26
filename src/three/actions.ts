/** Store-level actions shared by the 3D scene and the DOM overlay. */
import i18n from '@/i18n'
import { tr } from '@/lib/i18n-text'
import { stockOf } from '@/lib/pricing'
import type { Fixture } from '@/lib/layout'
import type { Locale } from '@/lib/types'
import { useCart } from '@/state/cart'
import { useCatalog } from '@/state/catalog'
import { useUi } from '@/state/ui'
import { assetUrl } from '@/lib/assets'
import { findFacing } from './registry'
import type { WorldFacing } from './facings'
import { enterWalkMode, exitWalkMode, focusOn, goToViewpoint, isGliding, placeOutside, playIntro, rig, viewpointFor } from './rig'

const locale = () => (i18n.language as Locale) || 'fr'

function fixtureLabel(id: string) {
  const labels = useCatalog.getState().catalog?.settings.fixtureLabels ?? {}
  return labels[id] ? tr(labels[id], locale()) : id === 'entrance' ? i18n.t('nav.entrance') : id
}

function arrived(id: string) {
  useUi.getState().setFocus(id)
  if (id !== 'entrance' && !useUi.getState().selected) {
    useUi.getState().showHint(i18n.t('hint.arrived', { zone: fixtureLabel(id) }))
  }
}

export function goToFixture(id: string, u?: number) {
  const { layout } = useCatalog.getState()
  if (!layout) return
  if (rig.mode === 'walk') useUi.getState().setNavMode('guided')
  const f = layout.fixtures.find((x) => x.id === id)
  const vp = viewpointFor(layout, id)
  const pan = f && u !== undefined ? u - (vp.u ?? f.length / 2) : 0
  goToViewpoint(vp, { pan, onComplete: () => arrived(id) })
}

export function onFixtureClick(f: Fixture, u: number) {
  if (useUi.getState().phase !== 'inside') return
  goToFixture(f.id, u)
}

/** Opens a product: selects it, and walks to its shelf. */
export function openProduct(productId: string, variantId: string | null = null, opts: { move?: boolean } = {}) {
  const { layout, productById } = useCatalog.getState()
  const p = productById.get(productId)
  if (!p || !layout) return
  const v = variantId ?? (p.variants.find((x) => x.stock > 0)?.id ?? p.variants[0]?.id ?? null)
  useUi.getState().select({ productId, variantId: v })
  useUi.getState().showHint(null)
  if (opts.move === false || useUi.getState().phase !== 'inside') return
  const facing = findFacing(productId, variantId)
  const fixture = facing?.fixtureId ? layout.fixtures.find((f) => f.id === facing.fixtureId) : null
  if (facing && fixture) {
    if (rig.mode === 'walk') return
    focusOn(layout, fixture, facing.u, facing.position.y, facing.height)
    useUi.getState().setFocus(fixture.id)
  }
}

export function onFacingClick(f: WorldFacing) {
  const phase = useUi.getState().phase
  if (phase === 'outside') {
    useUi.getState().select({ productId: f.productId, variantId: f.variantId })
    return
  }
  openProduct(f.productId, f.variantId)
}

export function closeProduct() {
  useUi.getState().select(null)
  const { layout } = useCatalog.getState()
  // ease the tilt back to the shelf's resting view
  if (layout && rig.mode === 'guided' && rig.vp) goToViewpoint(rig.vp, { pan: rig.pan, zoom: rig.zoom, duration: 0.5 })
}

export function addToCart(productId: string, variantId: string | null, qty = 1) {
  const p = useCatalog.getState().productById.get(productId)
  if (!p) return false
  const v = variantId ? (p.variants.find((x) => x.id === variantId) ?? null) : null
  const max = stockOf(p, v)
  if (max <= 0) return false
  useCart.getState().add(productId, variantId, qty, max)
  const name = tr(p.name, locale()) + (v ? ` — ${tr(v.name, locale())}` : '')
  useUi.getState().toast(i18n.t('product.added', { name }), 'added', assetUrl(v?.image || p.image))
  useUi.getState().bumpAdded({ productId, variantId })
  return true
}

export function enterBoutique() {
  const { layout } = useCatalog.getState()
  const ui = useUi.getState()
  if (!layout || ui.phase !== 'outside') return
  ui.select(null)
  ui.setPhase('entering')
  playIntro(layout, () => {
    useUi.getState().setPhase('inside')
    useUi.getState().setFocus('entrance')
  })
}

/** Skips the intro (deep links, returning visitors). */
export function jumpInside() {
  const { layout } = useCatalog.getState()
  if (!layout) return
  useUi.getState().setPhase('inside')
  rig.fov = rig.portrait ? 70 : 60
  rig.mode = 'guided'
  rig.vp = null
  rig.pos.set(...layout.viewpoints.entrance.position)
  rig.yaw = layout.viewpoints.entrance.yaw
  rig.pitch = layout.viewpoints.entrance.pitch
  goToViewpoint(layout.viewpoints.entrance, { duration: 0.01, onComplete: () => arrived('entrance') })
}

export function goOutside() {
  const { layout } = useCatalog.getState()
  if (!layout) return
  useUi.getState().setPhase('outside')
  useUi.getState().select(null)
  placeOutside(layout)
}

export function setWalking(walk: boolean) {
  const { layout } = useCatalog.getState()
  if (!layout) return
  useUi.getState().setNavMode(walk ? 'walk' : 'guided')
  if (walk) {
    enterWalkMode()
    useUi.getState().setFocus(null)
  } else exitWalkMode(layout)
}

// Test and debugging hooks (used by the Playwright screenshots and e2e tests).
if (typeof window !== 'undefined') {
  ;(window as unknown as { __boutique: unknown }).__boutique = {
    goToFixture,
    openProduct,
    closeProduct,
    enterBoutique,
    jumpInside,
    goOutside,
    setWalking,
    addToCart,
    rig,
    /** Renderer counters of the last frame (use ?tier=low: post-processing adds its own passes). */
    stats() {
      const info = rig.renderer?.info
      return info
        ? { calls: info.render.calls, triangles: info.render.triangles, textures: info.memory.textures, geometries: info.memory.geometries, programs: info.programs?.length ?? 0 }
        : null
    },
    /** True once no glide is running and the eased camera has caught up with its target. */
    settled() {
      const cam = rig.camera
      if (!cam || isGliding()) return false
      const yaw = Math.abs(Math.atan2(Math.sin(rig.live.yaw - rig.yaw), Math.cos(rig.live.yaw - rig.yaw)))
      return cam.position.distanceTo(rig.pos) < 0.003 && yaw < 0.003
    },
    /** Screen position (CSS px) of a product on its shelf, or null when off screen. */
    project(productId: string, variantId?: string | null) {
      const f = findFacing(productId, variantId)
      const cam = rig.camera
      const canvas = document.querySelector('canvas')
      if (!f || !cam || !canvas) return null
      const p = f.position.clone()
      p.y += f.height / 2
      p.project(cam)
      if (p.z > 1 || Math.abs(p.x) > 1 || Math.abs(p.y) > 1) return null
      const r = canvas.getBoundingClientRect()
      return { x: r.left + ((p.x + 1) / 2) * r.width, y: r.top + ((1 - p.y) / 2) * r.height }
    },
  }
}
