import { useMemo } from 'react'
import * as THREE from 'three'
import type { StoreLayout } from '@/lib/layout'
import { GeoBuilder } from './geom'
import { FRONT_WALL, frontOpenings, wallWithHoles } from './room-geometry'
import type { Materials } from './materials'
import { radialTexture } from './textures'

/** Interior shell: floor, walls, ceiling, skirting, cove light and recessed downlights. */
export function Room({ layout, m }: { layout: StoreLayout; m: Materials }) {
  const { width: W, depth: D, ceiling: H } = layout.dims
  const openings = useMemo(() => frontOpenings(layout), [layout])

  const front = useMemo(() => {
    const shape = wallWithHoles(-W / 2, W / 2, 0, H, openings)
    const g = new THREE.ExtrudeGeometry(shape, { depth: FRONT_WALL, bevelEnabled: false })
    return g
  }, [W, H, openings])

  const trims = useMemo(() => {
    const b = new GeoBuilder<'lacquer' | 'led' | 'gold'>()
    // skirting boards
    b.boxAt('lacquer', -W / 2, 0, -D, 0.02, 0.1, D)
    b.boxAt('lacquer', W / 2 - 0.02, 0, -D, 0.02, 0.1, D)
    b.boxAt('lacquer', -W / 2, 0, -D, W, 0.1, 0.02)
    // cove: a lacquer ledge with a warm LED strip hidden above it, all around the ceiling
    const cy = H - 0.16
    b.boxAt('lacquer', -W / 2, cy, -D, 0.12, 0.04, D)
    b.boxAt('lacquer', W / 2 - 0.12, cy, -D, 0.12, 0.04, D)
    b.boxAt('lacquer', -W / 2, cy, -D, W, 0.04, 0.12)
    b.boxAt('led', -W / 2 + 0.005, cy + 0.04, -D, 0.03, 0.012, D)
    b.boxAt('led', W / 2 - 0.035, cy + 0.04, -D, 0.03, 0.012, D)
    b.boxAt('led', -W / 2, cy + 0.04, -D + 0.005, W, 0.012, 0.03)
    // gold door frame and window mullions on the inside
    for (const o of openings) {
      b.boxAt('gold', o.x0 - 0.03, o.y0, -0.01, 0.03, o.y1 - o.y0, 0.03)
      b.boxAt('gold', o.x1, o.y0, -0.01, 0.03, o.y1 - o.y0, 0.03)
      b.boxAt('gold', o.x0 - 0.03, o.y1, -0.01, o.x1 - o.x0 + 0.06, 0.03, 0.03)
    }
    return b.build()
  }, [W, D, H, openings])

  // Recessed downlights: glowing discs plus soft halos on the ceiling, merged into two draws.
  const downlights = useMemo(() => {
    const cols = W > 3 ? [-W / 4, W / 4] : [0]
    const discs = new GeoBuilder<'bulb' | 'halo'>()
    for (let z = -0.9; z > -D + 0.4; z -= 1.15) {
      for (const x of cols) {
        discs.add('bulb', new THREE.CircleGeometry(0.045, 24), [x, H - 0.003, z], [Math.PI / 2, 0, 0])
        discs.add('halo', new THREE.PlaneGeometry(0.7, 0.7), [x, H - 0.002, z], [Math.PI / 2, 0, 0])
      }
    }
    return discs.build()
  }, [W, D, H])
  const halo = radialTexture('rgba(255,236,215,0.9)', 'rgba(255,236,215,0)', 'halo')

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, -D / 2]} material={m.floor}>
        <planeGeometry args={[W, D]} />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position={[0, H, -D / 2]} material={m.ceiling}>
        <planeGeometry args={[W, D]} />
      </mesh>
      <mesh rotation-y={Math.PI / 2} position={[-W / 2, H / 2, -D / 2]} material={m.wall}>
        <planeGeometry args={[D, H]} />
      </mesh>
      <mesh rotation-y={-Math.PI / 2} position={[W / 2, H / 2, -D / 2]} material={m.wall}>
        <planeGeometry args={[D, H]} />
      </mesh>
      <mesh position={[0, H / 2, -D]} material={m.wall}>
        <planeGeometry args={[W, H]} />
      </mesh>
      <mesh geometry={front} material={[m.wall, m.lacquer]} />
      {Object.entries(trims).map(([k, g]) => (
        <mesh key={k} geometry={g} material={m[k as keyof Materials] as THREE.Material} />
      ))}
      <mesh geometry={downlights.halo}>
        <meshBasicMaterial map={halo} transparent depthWrite={false} toneMapped={false} opacity={0.55} />
      </mesh>
      <mesh geometry={downlights.bulb} material={m.bulb} />
    </group>
  )
}

