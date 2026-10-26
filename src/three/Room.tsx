import { useMemo } from 'react'
import * as THREE from 'three'
import type { StoreLayout } from '@/lib/layout'
import { GeoBuilder } from './geom'
import { downlightSpots, FRONT_WALL, frontOpenings, wallWithHoles } from './room-geometry'
import type { Materials } from './materials'
import { radialTexture } from './textures'

/** Interior shell: checkered floor, white walls, suspended ceiling grid with round downlights. */
export function Room({ layout, m }: { layout: StoreLayout; m: Materials }) {
  const { width: W, depth: D, ceiling: H } = layout.dims
  const openings = useMemo(() => frontOpenings(layout), [layout])

  const front = useMemo(() => new THREE.ExtrudeGeometry(wallWithHoles(-W / 2, W / 2, 0, H, openings), { depth: FRONT_WALL, bevelEnabled: false }), [W, H, openings])

  // UVs in metres from the room corner, so tiles and ceiling panels line up with the walls
  const planar = (w: number, d: number) => {
    const g = new THREE.PlaneGeometry(w, d)
    const pos = g.attributes.position
    const uv = g.attributes.uv
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, (pos.getY(i) + d / 2) / d)
    return g
  }
  const floorGeo = useMemo(() => planar(W, D), [W, D])

  const fittings = useMemo(() => {
    const b = new GeoBuilder<'chrome' | 'bulb' | 'shelf' | 'blackMatte' | 'whitePlastic'>()
    for (const [x, z] of downlightSpots(layout)) {
      b.add('chrome', new THREE.RingGeometry(0.07, 0.085, 32), [x, H - 0.002, z], [Math.PI / 2, 0, 0])
      b.add('bulb', new THREE.CircleGeometry(0.07, 32), [x, H - 0.004, z], [Math.PI / 2, 0, 0])
    }
    // skirting
    b.boxAt('shelf', -W / 2, 0, -D, W, 0.08, 0.015)
    // security cameras (small domes) in two ceiling corners, as in the photos
    for (const [x, z] of [
      [-W / 2 + 0.25, -0.35],
      [W / 2 - 0.3, -D + 0.6],
    ]) {
      b.cylinder('whitePlastic', x, H - 0.03, z, 0.05, 0.03, 20)
      b.add('blackMatte', new THREE.SphereGeometry(0.038, 16, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), [x, H - 0.03, z])
    }
    return b.build()
  }, [layout, W, D, H])

  const halos = useMemo(() => {
    const b = new GeoBuilder<'halo'>()
    for (const [x, z] of downlightSpots(layout)) b.add('halo', new THREE.PlaneGeometry(0.75, 0.75), [x, H - 0.006, z], [Math.PI / 2, 0, 0])
    return b.build().halo!
  }, [layout, H])
  const halo = radialTexture('rgba(255,250,240,0.85)', 'rgba(255,250,240,0)', 'halo-neutral')

  return (
    <group>
      <mesh geometry={floorGeo} rotation-x={-Math.PI / 2} position={[0, 0, -D / 2]} material={m.floor} />
      <mesh geometry={floorGeo} rotation-x={Math.PI / 2} position={[0, H, -D / 2]} material={m.ceiling} />
      <mesh rotation-y={Math.PI / 2} position={[-W / 2, H / 2, -D / 2]} material={m.wall}>
        <planeGeometry args={[D, H]} />
      </mesh>
      <mesh rotation-y={-Math.PI / 2} position={[W / 2, H / 2, -D / 2]} material={m.wall}>
        <planeGeometry args={[D, H]} />
      </mesh>
      <mesh position={[0, H / 2, -D]} material={m.wall}>
        <planeGeometry args={[W, H]} />
      </mesh>
      <mesh geometry={front} material={[m.wall, m.black]} />
      {Object.entries(fittings).map(([k, g]) => (
        <mesh key={k} geometry={g} material={m[k as keyof Materials] as THREE.Material} />
      ))}
      <mesh geometry={halos}>
        <meshBasicMaterial map={halo} transparent depthWrite={false} toneMapped={false} opacity={0.5} />
      </mesh>
    </group>
  )
}
