/**
 * Camera rig state shared by the 3D scene and the DOM overlay. The camera never jumps: it eases
 * every frame toward the *target* held here, and actions (go to a shelf, pan along it, walk) only
 * move the target. Kept outside React so per-frame updates never re-render anything.
 */
import * as THREE from 'three'
import gsap from 'gsap'
import { EYE_HEIGHT, type Fixture, type StoreLayout, type Viewpoint } from '@/lib/layout'

export type RigMode = 'guided' | 'walk' | 'cinematic'

// Keep animations time-based even when frames are slow (weak phones): GSAP's default lag
// smoothing would otherwise stretch a 2-second walk into many seconds.
gsap.ticker.lagSmoothing(0)

export const doorState = { open: 0 }

export const rig = {
  layout: null as StoreLayout | null,
  mode: 'cinematic' as RigMode,
  /** eased target */
  pos: new THREE.Vector3(0, 1.75, 7.2),
  yaw: 0,
  pitch: 0.02,
  fov: 50,
  /** how quickly the camera follows the target (seconds to ~close the gap) */
  smooth: 0.2,
  /** guided-mode parameters relative to the current viewpoint */
  vp: null as Viewpoint | null,
  pan: 0,
  zoom: 0,
  lookYaw: 0,
  lookPitch: 0,
  /** live camera state, written by CameraRig each frame (read by the minimap) */
  live: { x: 0, z: 7.2, yaw: 0 },
  reducedMotion: false,
  portrait: false,
  /** the live camera (set by CameraRig), used to project 3D points for tests and overlays */
  camera: null as THREE.PerspectiveCamera | null,
}

let tween: gsap.core.Tween | gsap.core.Timeline | null = null
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

export function baseFov() {
  return rig.portrait ? 70 : 60
}

function viewDir(yaw: number) {
  return new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw))
}

/** Target pose for guided mode from viewpoint + pan + zoom + look offsets. */
function guidedPose(vp: Viewpoint, pan: number, zoom: number, lookYaw: number, lookPitch: number) {
  const pos = new THREE.Vector3(...vp.position)
  if (vp.pan) pos.addScaledVector(new THREE.Vector3(...vp.pan.axis), pan)
  pos.addScaledVector(viewDir(vp.yaw), zoom)
  return { pos, yaw: vp.yaw + lookYaw, pitch: clamp(vp.pitch + lookPitch, -1.2, 0.7) }
}

export function maxZoom(vp: Viewpoint | null) {
  if (!vp || !vp.pan) return 1.2
  return 0.75
}

export function applyGuided() {
  if (rig.mode !== 'guided' || !rig.vp) return
  const p = guidedPose(rig.vp, rig.pan, rig.zoom, rig.lookYaw, rig.lookPitch)
  rig.pos.copy(p.pos)
  rig.yaw = p.yaw
  rig.pitch = p.pitch
}

export function killTween() {
  tween?.kill()
  tween = null
}

interface GoOptions {
  pan?: number
  zoom?: number
  lookPitch?: number
  duration?: number
  onComplete?: () => void
}

/** Glides to a viewpoint (or snaps when reduced motion is on). */
export function goToViewpoint(vp: Viewpoint, opts: GoOptions = {}) {
  killTween()
  const pan = vp.pan ? clamp(opts.pan ?? 0, vp.pan.min, vp.pan.max) : 0
  const zoom = clamp(opts.zoom ?? 0, 0, maxZoom(vp))
  const lookPitch = opts.lookPitch ?? 0
  const dest = guidedPose(vp, pan, zoom, 0, lookPitch)
  const finish = () => {
    rig.mode = 'guided'
    rig.vp = vp
    rig.pan = pan
    rig.zoom = zoom
    rig.lookYaw = 0
    rig.lookPitch = lookPitch
    rig.smooth = 0.2
    applyGuided()
    opts.onComplete?.()
  }
  if (rig.reducedMotion) {
    rig.pos.copy(dest.pos)
    rig.yaw = dest.yaw
    rig.pitch = dest.pitch
    finish()
    return
  }
  // same shelf: just slide along it
  if (rig.mode === 'guided' && rig.vp?.id === vp.id) {
    rig.vp = vp
    tween = gsap.to(rig, {
      pan,
      zoom,
      lookYaw: 0,
      lookPitch,
      duration: opts.duration ?? 0.7,
      ease: 'power2.inOut',
      onUpdate: applyGuided,
      onComplete: finish,
    })
    return
  }
  const from = { x: rig.pos.x, y: rig.pos.y, z: rig.pos.z, yaw: rig.yaw, pitch: rig.pitch }
  const toYaw = from.yaw + wrap(dest.yaw - from.yaw)
  const distance = rig.pos.distanceTo(dest.pos) + Math.abs(toYaw - from.yaw) * 0.6
  rig.mode = 'cinematic'
  rig.smooth = 0.08
  tween = gsap.to(from, {
    x: dest.pos.x,
    y: dest.pos.y,
    z: dest.pos.z,
    yaw: toYaw,
    pitch: dest.pitch,
    duration: opts.duration ?? clamp(0.55 + distance * 0.32, 0.7, 1.8),
    ease: 'power2.inOut',
    onUpdate: () => {
      rig.pos.set(from.x, from.y, from.z)
      rig.yaw = from.yaw
      rig.pitch = from.pitch
    },
    onComplete: finish,
  })
}

export function viewpointFor(layout: StoreLayout, id: string) {
  return layout.viewpoints[id] ?? layout.viewpoints.entrance
}

/**
 * Brings a product into view: walks to its fixture if needed, slides along the shelf to it and
 * tilts so it sits in the upper part of the screen (the product sheet covers the bottom).
 */
export function focusOn(layout: StoreLayout, fixture: Fixture, u: number, y: number, height: number) {
  const vp = viewpointFor(layout, fixture.id)
  const pan = u - fixture.length / 2
  const eye = vp.position[1]
  const d = Math.max(0.6, horizontalDistance(vp, fixture))
  const toProduct = Math.atan2(y + height / 2 - eye, d)
  const offset = rig.portrait ? -0.24 : -0.1
  goToViewpoint(vp, { pan, lookPitch: toProduct + offset - vp.pitch })
}

function horizontalDistance(vp: Viewpoint, fixture: Fixture) {
  // distance from the viewpoint to the fixture's product plane along the view direction
  const dir = viewDir(vp.yaw)
  const c = Math.cos(fixture.rotationY)
  const s = Math.sin(fixture.rotationY)
  const fx = fixture.position[0] + fixture.productZ * s
  const fz = fixture.position[2] + fixture.productZ * c
  return (fx - vp.position[0]) * dir.x + (fz - vp.position[2]) * dir.z
}

// ---------------------------------------------------------------------------------------------
// Direct input
// ---------------------------------------------------------------------------------------------

/** Drag in pixels; `viewportHeight` converts pixels to angles/metres. */
export function drag(dx: number, dy: number, viewportHeight: number) {
  if (rig.mode === 'cinematic') return
  const rad = (THREE.MathUtils.degToRad(rig.fov) / viewportHeight) * 1.1
  if (rig.mode === 'walk') {
    rig.yaw += dx * rad
    rig.pitch = clamp(rig.pitch + dy * rad, -1.1, 0.7)
    return
  }
  const vp = rig.vp
  if (!vp) return
  if (vp.pan && vp.pan.max > 0.01) {
    const metres = (2 * 1.35 * Math.tan(THREE.MathUtils.degToRad(rig.fov) / 2)) / viewportHeight
    rig.pan = clamp(rig.pan - dx * metres, vp.pan.min, vp.pan.max)
    rig.lookPitch = clamp(rig.lookPitch + dy * rad, -0.45, 0.45)
  } else {
    rig.lookYaw = clamp(rig.lookYaw + dx * rad, -1.4, 1.4)
    rig.lookPitch = clamp(rig.lookPitch + dy * rad, -0.6, 0.45)
  }
  applyGuided()
}

export function zoomBy(delta: number) {
  if (rig.mode === 'cinematic') return
  if (rig.mode === 'walk') {
    walkStep(delta, 0)
    return
  }
  rig.zoom = clamp(rig.zoom + delta, 0, maxZoom(rig.vp))
  applyGuided()
}

/** Moves the walking camera by (forward, strafe) metres with collision against fixtures and walls. */
export function walkStep(forward: number, strafe: number) {
  const layout = rig.layout
  if (!layout || rig.mode !== 'walk') return
  const f = viewDir(rig.yaw)
  const r = new THREE.Vector3(-f.z, 0, f.x)
  const next = rig.pos.clone().addScaledVector(f, forward).addScaledVector(r, strafe)
  const pad = 0.28
  const W = layout.dims.width / 2 - pad
  const resolve = (x: number, z: number) => {
    if (x < -W || x > W || z > -0.25 || z < -layout.dims.depth + pad) return false
    return !layout.colliders.some(
      (c) => x > c.min[0] - pad && x < c.max[0] + pad && z > c.min[1] - pad && z < c.max[1] + pad,
    )
  }
  // slide along obstacles: try both axes, then each axis alone
  if (resolve(next.x, next.z)) rig.pos.set(next.x, EYE_HEIGHT, next.z)
  else if (resolve(next.x, rig.pos.z)) rig.pos.x = next.x
  else if (resolve(rig.pos.x, next.z)) rig.pos.z = next.z
}

export function walkTo(x: number, z: number) {
  const layout = rig.layout
  if (!layout) return
  killTween()
  const target = { x: rig.pos.x, z: rig.pos.z }
  const d = Math.hypot(x - target.x, z - target.z)
  tween = gsap.to(target, {
    x,
    z,
    duration: clamp(d * 0.45, 0.4, 2),
    ease: 'power2.inOut',
    onUpdate: () => {
      const dx = target.x - rig.pos.x
      const dz = target.z - rig.pos.z
      const yaw = rig.yaw
      const f = viewDir(yaw)
      const forward = dx * f.x + dz * f.z
      const strafe = dx * -f.z + dz * f.x
      walkStep(forward, strafe)
    },
  })
}

export function enterWalkMode() {
  killTween()
  rig.mode = 'walk'
  rig.vp = null
  rig.pos.y = EYE_HEIGHT
  rig.pitch = clamp(rig.pitch, -0.5, 0.3)
  rig.smooth = 0.12
}

export function exitWalkMode(layout: StoreLayout) {
  // go to the nearest viewpoint
  let best = layout.viewpoints.entrance
  let bestD = Infinity
  for (const vp of Object.values(layout.viewpoints)) {
    const d = Math.hypot(vp.position[0] - rig.pos.x, vp.position[2] - rig.pos.z)
    if (d < bestD) {
      bestD = d
      best = vp
    }
  }
  rig.mode = 'guided'
  rig.vp = null
  goToViewpoint(best)
}

// ---------------------------------------------------------------------------------------------
// Intro
// ---------------------------------------------------------------------------------------------

/** Horizontal offset of the street camera: on wide screens the shopfront sits right of centre. */
export function outsideX(aspect: number) {
  return aspect > 1.25 ? -Math.min(1.3, (aspect - 1.25) * 2.2) : 0
}

/** On a phone the welcome card covers the lower half: step back and look lower. */
export function outsidePortrait() {
  rig.pos.z = 8.4
  rig.pitch = -0.13
}

export function placeOutside(layout: StoreLayout) {
  killTween()
  const o = layout.outside
  rig.mode = 'cinematic'
  rig.pos.set(...o.position)
  rig.pos.x = outsideX(window.innerWidth / window.innerHeight)
  if (rig.portrait) outsidePortrait()
  rig.yaw = o.yaw
  rig.pitch = o.pitch
  rig.fov = rig.portrait ? 64 : 46
  rig.smooth = 0.25
  doorState.open = 0
}

/** Doors slide open, the camera walks in from the pavement and settles at the entrance. */
export function playIntro(layout: StoreLayout, onDone: () => void) {
  killTween()
  const entrance = layout.viewpoints.entrance
  if (rig.reducedMotion) {
    doorState.open = 0
    rig.fov = baseFov()
    goToViewpoint(entrance)
    onDone()
    return
  }
  rig.mode = 'cinematic'
  rig.smooth = 0.06
  const cam = { x: rig.pos.x, y: rig.pos.y, z: rig.pos.z, pitch: rig.pitch, fov: rig.fov, yaw: rig.yaw }
  const sync = () => {
    rig.pos.set(cam.x, cam.y, cam.z)
    rig.yaw = cam.yaw
    rig.pitch = cam.pitch
    rig.fov = cam.fov
  }
  // doors run on their own tweens so they keep closing after the camera hands over control
  gsap.to(doorState, { open: 1, duration: 1.1, ease: 'power2.inOut', delay: 0.15 })
  gsap.to(doorState, { open: 0, duration: 1.0, ease: 'power2.inOut', delay: 2.9 })
  const tl = gsap.timeline({
    onComplete: () => {
      goToViewpoint(entrance, { duration: 0.01 })
      onDone()
    },
  })
  tl.to(cam, { x: 0, z: 1.4, y: 1.66, pitch: -0.02, fov: 54, duration: 1.45, ease: 'power1.in', onUpdate: sync }, 0.2)
  tl.to(cam, { z: entrance.position[2], y: entrance.position[1], pitch: entrance.pitch, fov: baseFov(), duration: 1.15, ease: 'power2.out', onUpdate: sync }, 1.65)
  tween = tl
}
