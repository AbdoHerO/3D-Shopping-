import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { easing } from 'maath'
import * as THREE from 'three'
import { useUi } from '@/state/ui'
import { joystick } from './input'
import { applyGuided, baseFov, drag, outsidePortrait, outsideX, rig, walkStep, zoomBy } from './rig'


const KEYS = {
  forward: ['KeyW', 'KeyZ', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'KeyQ', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
}

export function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const gl = useThree((s) => s.gl)
  const size = useThree((s) => s.size)
  const cur = useRef({ yaw: rig.yaw, pitch: rig.pitch })
  const keys = useRef(new Set<string>())

  useEffect(() => {
    rig.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    rig.camera = camera
    camera.position.copy(rig.pos)
    cur.current.yaw = rig.yaw
    cur.current.pitch = rig.pitch
  }, [camera])

  useEffect(() => {
    const portrait = size.width < size.height
    if (portrait !== rig.portrait) {
      rig.portrait = portrait
      if (rig.mode !== 'cinematic') rig.fov = baseFov()
    }
    // standing on the pavement: a portrait screen needs a wider lens to see the whole shopfront,
    // a wide screen steps left so the welcome card does not cover it
    if (useUi.getState().phase === 'outside') {
      rig.fov = portrait ? 64 : 46
      rig.pos.x = outsideX(size.width / size.height)
      if (portrait) outsidePortrait()
      else {
        rig.pos.z = 7.2
        rig.pitch = 0.02
      }
    }
  }, [size])

  // pointer drag / pinch / wheel on the canvas
  useEffect(() => {
    const el = gl.domElement
    const pointers = new Map<number, { x: number; y: number }>()
    let pinch = 0
    const down = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()]
        pinch = Math.hypot(a.x - b.x, a.y - b.y)
      }
    }
    const move = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId)
      if (!prev) return
      const p = { x: e.clientX, y: e.clientY }
      pointers.set(e.pointerId, p)
      if (pointers.size === 1) {
        drag(p.x - prev.x, p.y - prev.y, el.clientHeight || 800)
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()]
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        zoomBy((d - pinch) * 0.004)
        pinch = d
      }
    }
    const up = (e: PointerEvent) => {
      pointers.delete(e.pointerId)
    }
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      zoomBy(-Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 120) * 0.0018)
    }
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    el.addEventListener('wheel', wheel, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      el.removeEventListener('wheel', wheel)
    }
  }, [gl])

  // keyboard: walk in walk mode, slide along the shelf in guided mode
  useEffect(() => {
    const isTyping = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)
    }
    const down = (e: KeyboardEvent) => {
      if (isTyping(e)) return
      if (Object.values(KEYS).some((list) => list.includes(e.code))) {
        keys.current.add(e.code)
        if (e.code.startsWith('Arrow')) e.preventDefault()
      }
    }
    const up = (e: KeyboardEvent) => keys.current.delete(e.code)
    const blur = () => keys.current.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [])

  useFrame((state, delta) => {
    // generous cap: on slow devices the camera must still keep up with timed animations
    const dt = Math.min(delta, 0.25)
    const k = keys.current
    const has = (list: string[]) => list.some((c) => k.has(c))
    const fwd = (has(KEYS.forward) ? 1 : 0) - (has(KEYS.back) ? 1 : 0) + -joystick.y
    const side = (has(KEYS.right) ? 1 : 0) - (has(KEYS.left) ? 1 : 0) + joystick.x
    if (rig.mode === 'walk' && (fwd || side)) {
      walkStep(fwd * 1.6 * dt, side * 1.3 * dt)
    } else if (rig.mode === 'guided' && (fwd || side) && useUi.getState().panel === null) {
      drag(-side * 420 * dt, fwd * 260 * dt, 800)
      applyGuided()
    }

    // idle breathing while standing on the pavement
    const outside = useUi.getState().phase === 'outside'
    const t = state.clock.elapsedTime
    const target = outside ? rig.pos.clone().add(new THREE.Vector3(Math.sin(t * 0.35) * 0.06, Math.sin(t * 0.5) * 0.02, 0)) : rig.pos
    const yaw = outside ? rig.yaw + Math.sin(t * 0.3) * 0.012 : rig.yaw

    easing.damp3(camera.position, target, rig.smooth, dt)
    easing.dampAngle(cur.current, 'yaw', yaw, rig.smooth, dt)
    easing.damp(cur.current, 'pitch', rig.pitch, rig.smooth, dt)
    camera.rotation.set(cur.current.pitch, cur.current.yaw, 0, 'YXZ')
    if (Math.abs(camera.fov - rig.fov) > 0.01) {
      easing.damp(camera, 'fov', rig.fov, 0.3, dt)
      camera.updateProjectionMatrix()
    }
    rig.live.x = camera.position.x
    rig.live.z = camera.position.z
    rig.live.yaw = cur.current.yaw
  }, -1)

  return null
}
