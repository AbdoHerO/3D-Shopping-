import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useUi } from '@/state/ui'
import { hotspot } from '@/ui/hotspot'
import { findFacing } from './registry'

const v = new THREE.Vector3()

/** Projects the selected product's position to the screen and moves the DOM marker there. */
export function HotspotTracker() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  useFrame(() => {
    const el = hotspot.el
    if (!el) return
    const { selected, phase } = useUi.getState()
    const f = selected && phase === 'inside' ? findFacing(selected.productId, selected.variantId) : null
    if (!f) {
      el.style.display = 'none'
      return
    }
    v.copy(f.position)
    v.y += f.height * 0.55
    v.project(camera)
    if (v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) {
      el.style.display = 'none'
      return
    }
    el.style.display = 'block'
    el.style.transform = `translate3d(${((v.x + 1) / 2) * size.width}px, ${((1 - v.y) / 2) * size.height}px, 0)`
  })
  return null
}
