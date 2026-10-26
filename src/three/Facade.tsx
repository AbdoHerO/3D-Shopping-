import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import type { StoreLayout } from '@/lib/layout'
import { GeoBuilder } from './geom'
import type { Materials } from './materials'
import { FRONT_WALL, frontOpenings, wallWithHoles } from './room-geometry'
import { awningTexture, skyTexture, valanceTexture } from './textures'
import { FONTS } from './fonts'
import { doorState } from './rig'

const Z = FRONT_WALL

/**
 * The street-side view used for the intro: a plum painted shopfront with gold lettering, a striped
 * awning, glazing, sliding doors, neighbouring facades, pavement and a golden-hour sky.
 */
export function Facade({ layout, m, shopName, tagline }: { layout: StoreLayout; m: Materials; shopName: string; tagline: string }) {
  const { width: W } = layout.dims
  const openings = useMemo(() => frontOpenings(layout), [layout])
  const ext = W / 2 + 3.4 // facade half-width including neighbours
  const fasciaY = 2.62

  const facade = useMemo(() => {
    const g = new THREE.ShapeGeometry(wallWithHoles(-ext, ext, 0, 7.2, openings))
    // planar UVs in metres so the plaster texture keeps its scale
    const pos = g.attributes.position
    const uv = new Float32Array(pos.count * 2)
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2] = pos.getX(i) / 2.2
      uv[i * 2 + 1] = pos.getY(i) / 2.2
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
    return g
  }, [ext, openings])

  const parts = useMemo(() => {
    const b = new GeoBuilder<'plum' | 'gold' | 'lacquer' | 'dark' | 'windowDark' | 'terracotta' | 'foliage' | 'facadeAlt'>()
    // shopfront joinery: pilasters, fascia, stall risers under the windows, cornice
    b.boxAt('plum', -W / 2 - 0.12, 0, Z, 0.24, fasciaY + 0.62, 0.1)
    b.boxAt('plum', W / 2 - 0.12, 0, Z, 0.24, fasciaY + 0.62, 0.1)
    b.boxAt('plum', -W / 2 - 0.12, fasciaY - 0.2, Z, W + 0.24, 0.82, 0.12)
    b.boxAt('gold', -W / 2 - 0.16, fasciaY + 0.62, Z, W + 0.32, 0.05, 0.16)
    b.boxAt('gold', -W / 2 + 0.05, fasciaY - 0.14, Z + 0.12, W - 0.1, 0.012, 0.012)
    b.boxAt('gold', -W / 2 + 0.05, fasciaY + 0.5, Z + 0.12, W - 0.1, 0.012, 0.012)
    for (const o of openings) {
      if (o.y0 > 0) b.boxAt('plum', o.x0 - 0.04, 0, Z, o.x1 - o.x0 + 0.08, o.y0, 0.08)
      // frames
      b.boxAt('plum', o.x0 - 0.05, o.y0, Z, 0.05, o.y1 - o.y0, 0.07)
      b.boxAt('plum', o.x1, o.y0, Z, 0.05, o.y1 - o.y0, 0.07)
      b.boxAt('plum', o.x0 - 0.05, o.y1, Z, o.x1 - o.x0 + 0.1, 0.06, 0.07)
      if (o.y0 > 0) {
        b.boxAt('gold', o.x0, o.y0 - 0.015, Z + 0.02, o.x1 - o.x0, 0.03, 0.05)
        // transom bar with a small gold rail
        b.boxAt('plum', o.x0, o.y1 - 0.42, Z - 0.02, o.x1 - o.x0, 0.04, 0.05)
      }
    }
    // upper floor: windows with balconies, for both the shop building and the neighbours
    const upper = [-ext + 1.0, -W / 2 - 1.6, -W / 4 - 0.15, W / 4 + 0.15, W / 2 + 1.6, ext - 1.0]
    for (const x of upper) {
      const y0 = 4.0
      b.boxAt('windowDark', x - 0.45, y0, Z - 0.01, 0.9, 1.5, 0.02)
      b.boxAt('lacquer', x - 0.52, y0 - 0.07, Z, 1.04, 0.07, 0.14)
      b.boxAt('lacquer', x - 0.52, y0 + 1.5, Z, 1.04, 0.1, 0.08)
      b.boxAt('lacquer', x - 0.03, y0, Z, 0.06, 1.5, 0.03)
      // wrought balcony rail
      b.boxAt('dark', x - 0.55, y0 + 0.02, Z + 0.32, 1.1, 0.03, 0.03)
      b.boxAt('dark', x - 0.55, y0 + 0.62, Z + 0.32, 1.1, 0.03, 0.03)
      for (let k = 0; k <= 10; k++) b.boxAt('dark', x - 0.55 + k * 0.107, y0 + 0.02, Z + 0.32, 0.015, 0.6, 0.015)
      b.boxAt('lacquer', x - 0.6, y0 - 0.12, Z, 1.2, 0.06, 0.36)
    }
    // neighbouring shopfronts (closed, darker glazing)
    for (const side of [-1, 1]) {
      const cx = side * (W / 2 + 1.75)
      b.boxAt('windowDark', cx - 0.9, 0.5, Z - 0.01, 1.8, 1.9, 0.02)
      b.boxAt('facadeAlt', cx - 1.0, 0, Z, 2.0, 0.5, 0.06)
      b.boxAt('lacquer', cx - 1.0, 2.4, Z, 2.0, 0.08, 0.1)
    }
    // planters with topiary either side of the shopfront
    for (const side of [-1, 1]) {
      const x = side * (W / 2 + 0.45)
      b.cylinder('terracotta', x, 0, Z + 0.45, 0.2, 0.42, 20, 0.26)
      b.cylinder('dark', x, 0.42, Z + 0.45, 0.025, 0.35, 8)
      b.add('foliage', new THREE.IcosahedronGeometry(0.3, 2), [x, 1.05, Z + 0.45])
    }
    // street lamp
    const lx = W / 2 + 2.6
    b.cylinder('dark', lx, 0, 4.1, 0.06, 3.8, 10, 0.04)
    b.boxAt('dark', lx - 0.03, 3.75, 3.85, 0.06, 0.06, 0.3)
    // curb
    b.boxAt('lacquer', -ext - 6, 0, 4.5, ext * 2 + 12, 0.12, 0.18)
    return b.build()
  }, [W, ext, openings])

  const lamp = useMemo(() => new THREE.SphereGeometry(0.17, 20, 14), [])
  const awning = useMemo(() => {
    // a gently curved canvas from the fascia out over the pavement
    const g = new THREE.PlaneGeometry(W + 0.1, 1.15, 1, 8)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const t = (pos.getY(i) + 0.575) / 1.15 // 0 at the street edge, 1 at the wall
      const z = (1 - t) * 1.05
      const y = -0.42 * (1 - t) + 0.06 * Math.sin(t * Math.PI)
      pos.setXYZ(i, pos.getX(i), y, z)
    }
    g.computeVertexNormals()
    return g
  }, [W])
  const awningTex = useMemo(() => {
    const t = awningTexture().clone()
    t.repeat.set(W / 3.5, 1)
    t.needsUpdate = true
    return t
  }, [W])

  const doorL = useRef<THREE.Group>(null)
  const doorR = useRef<THREE.Group>(null)
  const dw = layout.door.width / 2
  useFrame(() => {
    const open = doorState.open
    if (doorL.current) doorL.current.position.x = -dw / 2 - open * dw * 0.98
    if (doorR.current) doorR.current.position.x = dw / 2 + open * dw * 0.98
  })

  return (
    <group>
      <mesh geometry={facade} position-z={Z + 0.001} material={m.facade} />
      {Object.entries(parts).map(([k, g]) => (
        <mesh key={k} geometry={g} material={m[k as keyof Materials] as THREE.Material} />
      ))}
      {/* shop name on the fascia */}
      <Text
        font={FONTS.serif}
        fontSize={0.34}
        letterSpacing={0.06}
        color="#e9c98f"
        anchorX="center"
        anchorY="middle"
        position={[0, fasciaY + 0.22, Z + 0.125]}
        maxWidth={W - 0.4}
      >
        {shopName}
      </Text>
      <Text
        font={FONTS.serifItalic}
        fontSize={0.11}
        letterSpacing={0.04}
        color="#f3dfe3"
        anchorX="center"
        anchorY="middle"
        position={[0, fasciaY - 0.03, Z + 0.125]}
      >
        {tagline}
      </Text>
      {/* awning with scalloped valance */}
      <group position={[0, fasciaY - 0.22, Z + 0.06]}>
        <mesh geometry={awning}>
          <meshStandardMaterial map={awningTex} side={THREE.DoubleSide} roughness={0.9} />
        </mesh>
        <mesh position={[0, -0.42 - 0.09, 1.05]}>
          <planeGeometry args={[W + 0.1, 0.18]} />
          <meshStandardMaterial map={valanceTexture()} transparent alphaTest={0.5} side={THREE.DoubleSide} roughness={0.9} />
        </mesh>
      </group>
      {/* glazing */}
      {openings.slice(1).map((o, i) => (
        <mesh key={i} position={[(o.x0 + o.x1) / 2, (o.y0 + o.y1) / 2, Z * 0.5]} material={m.glass}>
          <planeGeometry args={[o.x1 - o.x0, o.y1 - o.y0]} />
        </mesh>
      ))}
      {/* sliding doors */}
      {[doorL, doorR].map((ref, i) => (
        <group key={i} ref={ref} position={[i === 0 ? -dw / 2 : dw / 2, 0, Z * 0.35]}>
          <mesh position-y={layout.door.height / 2} material={m.glass}>
            <planeGeometry args={[dw, layout.door.height]} />
          </mesh>
          <mesh position={[0, layout.door.height / 2, 0]} material={m.gold}>
            <boxGeometry args={[dw, 0.04, 0.03]} />
          </mesh>
          <mesh position={[(i === 0 ? 1 : -1) * (dw / 2 - 0.05), 1.05, 0.03]} material={m.gold}>
            <boxGeometry args={[0.025, 0.5, 0.025]} />
          </mesh>
          <mesh position={[0, layout.door.height - 0.02, 0]} material={m.gold}>
            <boxGeometry args={[dw, 0.04, 0.04]} />
          </mesh>
          <mesh position={[0, 0.02, 0]} material={m.gold}>
            <boxGeometry args={[dw, 0.04, 0.04]} />
          </mesh>
        </group>
      ))}
      {/* sconces either side of the door, the street lamp */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (W / 2 + 0.02), 2.25, Z + 0.2]}>
          <mesh material={m.gold}>
            <boxGeometry args={[0.04, 0.04, 0.2]} />
          </mesh>
          <mesh position={[0, -0.06, 0.1]} material={m.bulb}>
            <sphereGeometry args={[0.07, 16, 12]} />
          </mesh>
        </group>
      ))}
      <mesh geometry={lamp} position={[W / 2 + 2.6, 3.72, 3.72]} material={m.bulb} />
      {/* pavement, street and sky */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.001, Z + 2.15]} material={m.pavement}>
        <planeGeometry args={[ext * 2 + 12, 4.3]} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, 14]} material={m.asphalt}>
        <planeGeometry args={[80, 19]} />
      </mesh>
      <mesh>
        <sphereGeometry args={[45, 24, 16]} />
        <meshBasicMaterial map={skyTexture()} side={THREE.BackSide} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}
