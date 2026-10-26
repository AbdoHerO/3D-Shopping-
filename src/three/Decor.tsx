import { useMemo } from 'react'
import * as THREE from 'three'
import { localToWorld, SHOP, type StoreLayout } from '@/lib/layout'
import { GeoBuilder } from './geom'
import type { Materials } from './materials'

function softBoxTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  g.filter = 'blur(14px)'
  g.fillStyle = 'rgba(30,30,34,0.9)'
  g.fillRect(24, 24, 80, 80)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/**
 * Soft contact shadows under every fixture: one blurred box texture stretched over each
 * footprint, merged into a single draw (cheap stand-in for baked ambient occlusion).
 */
export function Footprints({ layout }: { layout: StoreLayout }) {
  const { geometry, map } = useMemo(() => {
    const b = new GeoBuilder<'shadow'>()
    for (const c of layout.colliders) {
      const w = c.max[0] - c.min[0]
      const d = c.max[1] - c.min[1]
      // the blurred box fills the middle 62% of the texture: grow the quad so the core matches the footprint
      b.add('shadow', new THREE.PlaneGeometry(w / 0.62 + 0.05, d / 0.62 + 0.05), [(c.min[0] + c.max[0]) / 2, 0.005, (c.min[1] + c.max[1]) / 2], [-Math.PI / 2, 0, 0])
    }
    return { geometry: b.build().shadow!, map: softBoxTexture() }
  }, [layout])
  return (
    <mesh geometry={geometry} renderOrder={1}>
      <meshBasicMaterial map={map} transparent opacity={0.3} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

/** A white orchid in a pot: merged stems and leaves, instanced-looking petals. */
type DecorKey = 'pot' | 'foliage' | 'petal' | 'chrome' | 'blackMatte' | 'screen' | 'plastic'

function orchid(b: GeoBuilder<DecorKey>, x: number, y: number, z: number, s = 1) {
  b.cylinder('pot', x, y, z, 0.065 * s, 0.12 * s, 20, 0.08 * s)
  for (const k of [-1, 1]) b.add('foliage', new THREE.SphereGeometry(0.06 * s, 10, 6).scale(1.6, 0.25, 0.7), [x + k * 0.05 * s, y + 0.13 * s, z], [0, k * 0.4, k * 0.3])
  b.cylinder('foliage', x, y + 0.12 * s, z, 0.004, 0.32 * s, 5)
  for (let i = 0; i < 6; i++) {
    const t = i / 5
    const px = x + Math.sin(t * 2.2) * 0.07 * s
    const py = y + (0.34 + t * 0.09) * s
    b.add('petal', new THREE.SphereGeometry(0.03 * s, 10, 8).scale(1, 0.75, 0.35), [px, py, z + 0.01])
  }
}

/** Furniture and details seen in the photos: a stool at the back counter, orchids, a TV, a mirror pole. */
export function Decor({ layout, m }: { layout: StoreLayout; m: Materials }) {
  const { width: W, depth: D } = layout.dims
  const counter = layout.fixtures.find((f) => f.kind === 'counter')
  const back = layout.fixtures.find((f) => f.kind === 'backWall')

  const parts = useMemo(() => {
    const b = new GeoBuilder<DecorKey>()
    // bar stool in front of the back-wall cabinet (left part), as in the photo
    if (back) {
      const [x, , z] = localToWorld(back, back.length * 0.3, 0, back.depth + 0.45)
      b.cylinder('blackMatte', x, 0.66, z, 0.18, 0.05, 24)
      for (const [dx, dz] of [
        [0.11, 0.11],
        [-0.11, 0.11],
        [0.11, -0.11],
        [-0.11, -0.11],
      ]) {
        b.add('blackMatte', new THREE.CylinderGeometry(0.012, 0.014, 0.68, 6), [x + dx * 0.9, 0.33, z + dz * 0.9], [dz * 0.6, 0, -dx * 0.6])
      }
      b.add('chrome', new THREE.TorusGeometry(0.15, 0.008, 6, 24), [x, 0.26, z], [Math.PI / 2, 0, 0])
    }
    // orchids on the counter top and on the return, as in the photo
    if (counter) {
      const h = counter.height + 0.012
      const [x1, , z1] = localToWorld(counter, 0.82, 0, counter.depth * 0.25)
      orchid(b, x1, h, z1, 0.75)
      const [x2, , z2] = localToWorld(counter, counter.length - 0.25, 0, -SHOP.counter.staffGap * 0.45)
      orchid(b, x2, h, z2, 0.85)
    }
    // TV screen high on the left wall towards the back
    const tvZ = -D * 0.62
    b.add('screen', new THREE.BoxGeometry(0.04, 0.42, 0.72), [-W / 2 + SHOP.wallShelfDepth + 0.15, 2.45, tvZ], [0, 0, -0.18])
    b.boxAt('blackMatte', -W / 2 + SHOP.wallShelfDepth, 2.42, tvZ - 0.03, 0.12, 0.06, 0.06)
    return b.build()
  }, [counter, back, W, D])

  return (
    <group>
      {Object.entries(parts).map(([k, g]) => (
        <mesh key={k} geometry={g} material={m[k as keyof Materials] as THREE.Material} />
      ))}
    </group>
  )
}
