import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import type { StoreLayout } from '@/lib/layout'
import type { Storefront } from '@/lib/types'
import { assetUrl } from '@/lib/assets'
import { GeoBuilder } from './geom'
import type { Materials } from './materials'
import { FRONT_WALL, frontOpenings, wallWithHoles } from './room-geometry'
import { radialTexture, skyTexture } from './textures'
import { FONTS } from './fonts'
import { doorState } from './rig'

const Z = FRONT_WALL
/** Shopfront joinery protrudes this far from the building. */
const FRONT = 0.08
const FASCIA_Y = 2.66
const FASCIA_H = 0.62
const SOFFIT_DEPTH = 0.42

function Logo({ url, x, y }: { url: string; x: number; y: number }) {
  const map = useTexture(assetUrl(url))
  const aspect = map.image ? (map.image as HTMLImageElement).width / (map.image as HTMLImageElement).height : 1
  const h = 0.42
  return (
    <mesh position={[x - (h * aspect) / 2, y, Z + FRONT + 0.16]}>
      <planeGeometry args={[h * aspect, h]} />
      <meshBasicMaterial map={map} transparent toneMapped={false} />
    </mesh>
  )
}

/**
 * The street side, after the photographed shopfront: glossy black panels and frames, a black sign
 * band with raised illuminated lettering (text and logo from settings), a black soffit with round
 * downlights, the open entrance with glass sliding doors, and shop windows with display cases.
 */
export function Facade({ layout, m, storefront }: { layout: StoreLayout; m: Materials; storefront: Storefront }) {
  const { width: W } = layout.dims
  const openings = useMemo(() => frontOpenings(layout), [layout])
  const ext = W / 2 + 3.4 // building half-width including neighbours
  const sx0 = -W / 2 - 0.12
  const sx1 = W / 2 + 0.12

  const building = useMemo(() => {
    const g = new THREE.ShapeGeometry(wallWithHoles(-ext, ext, 0, 7.2, [{ x0: sx0, x1: sx1, y0: 0, y1: FASCIA_Y + FASCIA_H + 0.12 }]))
    const pos = g.attributes.position
    const uv = new Float32Array(pos.count * 2)
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2] = pos.getX(i) / 2.2
      uv[i * 2 + 1] = pos.getY(i) / 2.2
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
    return g
  }, [ext, sx0, sx1])

  const parts = useMemo(() => {
    const b = new GeoBuilder<'black' | 'blackMatte' | 'bulb' | 'glass' | 'stoneAlt' | 'windowDark' | 'foliage' | 'pot' | 'chrome'>()
    const top = FASCIA_Y + FASCIA_H
    // panels between and around the openings (the shopfront is black glass and steel)
    b.add('black', new THREE.ExtrudeGeometry(wallWithHoles(sx0, sx1, 0, FASCIA_Y, openings), { depth: FRONT, bevelEnabled: false }), [0, 0, Z])
    // frames around every opening
    for (const o of openings) {
      b.boxAt('black', o.x0 - 0.05, o.y0, Z, 0.05, o.y1 - o.y0, FRONT + 0.03)
      b.boxAt('black', o.x1, o.y0, Z, 0.05, o.y1 - o.y0, FRONT + 0.03)
      b.boxAt('black', o.x0 - 0.05, o.y1, Z, o.x1 - o.x0 + 0.1, 0.05, FRONT + 0.03)
      if (o.y0 > 0) b.boxAt('black', o.x0 - 0.05, 0, Z, o.x1 - o.x0 + 0.1, o.y0, FRONT + 0.03)
    }
    // vertical reveal lines on the side panels, as in the photo
    for (const x of [sx0 + 0.06, sx1 - 0.06]) b.boxAt('chrome', x - 0.004, 0.05, Z + FRONT, 0.008, FASCIA_Y - 0.1, 0.004)
    // soffit with round downlights, then the sign band above it
    b.boxAt('blackMatte', sx0, FASCIA_Y - 0.14, Z, sx1 - sx0, 0.14, SOFFIT_DEPTH)
    const lights = W > 3 ? [-W / 3, 0, W / 3] : [-W / 4, W / 4]
    for (const x of lights) b.add('bulb', new THREE.CircleGeometry(0.075, 28), [x, FASCIA_Y - 0.142, Z + SOFFIT_DEPTH * 0.55], [Math.PI / 2, 0, 0])
    b.boxAt('black', sx0, FASCIA_Y, Z, sx1 - sx0, FASCIA_H, 0.16)
    b.boxAt('black', sx0 - 0.02, top, Z, sx1 - sx0 + 0.04, 0.05, 0.2)
    // glazing of the shop windows
    for (const o of openings.slice(1)) b.add('glass', new THREE.PlaneGeometry(o.x1 - o.x0, o.y1 - o.y0), [(o.x0 + o.x1) / 2, (o.y0 + o.y1) / 2, Z + 0.02])
    // upper floors: windows with balconies on the stone building
    for (const x of [-ext + 1.0, -W / 2 - 1.6, -W / 4 - 0.15, W / 4 + 0.15, W / 2 + 1.6, ext - 1.0]) {
      const y0 = 4.0
      b.boxAt('windowDark', x - 0.45, y0, Z - 0.01, 0.9, 1.5, 0.02)
      b.boxAt('stoneAlt', x - 0.52, y0 - 0.07, Z, 1.04, 0.07, 0.14)
      b.boxAt('stoneAlt', x - 0.52, y0 + 1.5, Z, 1.04, 0.1, 0.08)
      b.boxAt('blackMatte', x - 0.55, y0 + 0.62, Z + 0.32, 1.1, 0.03, 0.03)
      for (let k = 0; k <= 10; k++) b.boxAt('blackMatte', x - 0.55 + k * 0.107, y0 + 0.02, Z + 0.32, 0.015, 0.6, 0.015)
      b.boxAt('stoneAlt', x - 0.6, y0 - 0.12, Z, 1.2, 0.06, 0.36)
    }
    // neighbouring shops: closed dark glazing under a plain fascia
    for (const side of [-1, 1]) {
      const cx = side * (W / 2 + 1.75)
      b.boxAt('windowDark', cx - 0.9, 0.5, Z - 0.01, 1.8, 1.9, 0.02)
      b.boxAt('stoneAlt', cx - 1.0, 0, Z, 2.0, 0.5, 0.06)
      b.boxAt('blackMatte', cx - 1.0, 2.5, Z, 2.0, 0.4, 0.08)
    }
    // greenery at the left of the shopfront, as in the photo
    b.cylinder('pot', sx0 - 0.32, 0, Z + 0.3, 0.2, 0.42, 20, 0.24)
    b.add('foliage', new THREE.IcosahedronGeometry(0.34, 2), [sx0 - 0.32, 0.8, Z + 0.3])
    b.add('foliage', new THREE.IcosahedronGeometry(0.26, 2), [sx0 - 0.24, 1.25, Z + 0.25])
    // street lamp and curb
    const lx = W / 2 + 2.6
    b.cylinder('blackMatte', lx, 0, 4.1, 0.06, 3.8, 10, 0.04)
    b.boxAt('blackMatte', lx - 0.03, 3.75, 3.85, 0.06, 0.06, 0.3)
    b.add('bulb', new THREE.SphereGeometry(0.17, 20, 14), [lx, 3.72, 3.72])
    b.boxAt('stoneAlt', -ext - 6, 0, 4.5, ext * 2 + 12, 0.12, 0.18)
    return b.build()
  }, [W, ext, openings, sx0, sx1])

  // sliding glass doors with thin black frames
  const doorFrame = useMemo(() => {
    const h = layout.door.height
    const half = (layout.door.x1 - layout.door.x0) / 2
    const b = new GeoBuilder<'black'>()
    b.add('black', new THREE.BoxGeometry(half, 0.035, 0.03), [0, h - 0.018, 0])
    b.add('black', new THREE.BoxGeometry(half, 0.06, 0.03), [0, 0.03, 0])
    b.add('black', new THREE.BoxGeometry(0.03, h, 0.03), [-half / 2 + 0.015, h / 2, 0])
    b.add('black', new THREE.BoxGeometry(0.03, h, 0.03), [half / 2 - 0.015, h / 2, 0])
    return b.build().black!
  }, [layout.door])
  const doorL = useRef<THREE.Group>(null)
  const doorR = useRef<THREE.Group>(null)
  const dw = (layout.door.x1 - layout.door.x0) / 2
  const dc = (layout.door.x0 + layout.door.x1) / 2
  useFrame(() => {
    const open = doorState.open
    if (doorL.current) doorL.current.position.x = dc - dw / 2 - open * dw * 0.96
    if (doorR.current) doorR.current.position.x = dc + dw / 2 + open * dw * 0.96
  })

  const spot = radialTexture('rgba(255,244,226,0.75)', 'rgba(255,244,226,0)', 'street-spot')
  const signZ = Z + 0.165
  const title = storefront.title || ' '
  const signW = Math.min(W - 0.3, 3.1)
  const titleSize = Math.min(0.36, (signW / Math.max(4, title.length)) * 1.45)

  return (
    <group>
      <mesh geometry={building} position-z={Z + 0.001} material={m.stone} />
      {Object.entries(parts).map(([k, g]) => (
        <mesh key={k} geometry={g} material={m[k as keyof Materials] as THREE.Material} />
      ))}
      {/* raised lettering: a dark copy behind gives the letters depth, the front glows */}
      <Text font={FONTS.serif} fontSize={titleSize} letterSpacing={0.05} color="#3a3530" anchorX="center" anchorY="middle" position={[0.012, FASCIA_Y + FASCIA_H * 0.6 - 0.012, signZ]} maxWidth={signW}>
        {title}
      </Text>
      <Text font={FONTS.serif} fontSize={titleSize} letterSpacing={0.05} color="#fffaf0" anchorX="center" anchorY="middle" position={[0, FASCIA_Y + FASCIA_H * 0.6, signZ + 0.02]} maxWidth={signW} material-toneMapped={false}>
        {title}
      </Text>
      {storefront.subtitle && (
        <Text font={FONTS.sans} fontSize={0.085} letterSpacing={0.12} color="#e2c48d" anchorX="center" anchorY="middle" position={[signW * 0.22, FASCIA_Y + 0.11, signZ + 0.01]} material-toneMapped={false}>
          {storefront.subtitle}
        </Text>
      )}
      {storefront.logoUrl && <Logo url={storefront.logoUrl} x={-signW / 2 + 0.1} y={FASCIA_Y + FASCIA_H / 2} />}
      {/* sliding doors */}
      {[doorL, doorR].map((ref, i) => (
        <group key={i} ref={ref} position={[i === 0 ? dc - dw / 2 : dc + dw / 2, 0, Z * 0.5 + (i === 0 ? 0.02 : -0.02)]}>
          <mesh position-y={layout.door.height / 2} material={m.glass}>
            <planeGeometry args={[dw, layout.door.height]} />
          </mesh>
          <mesh geometry={doorFrame} material={m.black} />
        </group>
      ))}
      {/* pools of light from the soffit on the pavement */}
      {(W > 3 ? [-W / 3, 0, W / 3] : [-W / 4, W / 4]).map((x) => (
        <mesh key={x} rotation-x={-Math.PI / 2} position={[x, 0.004, Z + 0.7]}>
          <planeGeometry args={[1.3, 1.3]} />
          <meshBasicMaterial map={spot} transparent depthWrite={false} toneMapped={false} opacity={0.6} />
        </mesh>
      ))}
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
