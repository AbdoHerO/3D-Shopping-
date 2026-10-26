import { useMemo } from 'react'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { localToWorld, type StoreLayout } from '@/lib/layout'
import { GeoBuilder } from './geom'
import type { Materials } from './materials'
import { FONTS } from './fonts'

function rugTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const g = c.getContext('2d')!
  g.fillStyle = '#f4dcdc'
  g.beginPath()
  g.arc(256, 256, 254, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = '#c9a46a'
  g.lineWidth = 6
  for (const r of [236, 214]) {
    g.beginPath()
    g.arc(256, 256, r, 0, Math.PI * 2)
    g.stroke()
  }
  g.strokeStyle = 'rgba(107,31,61,0.35)'
  g.lineWidth = 3
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2
    g.beginPath()
    g.ellipse(256 + Math.cos(a) * 150, 256 + Math.sin(a) * 150, 34, 12, a, 0, Math.PI * 2)
    g.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

const vaseProfile = [
  [0.0, 0],
  [0.05, 0],
  [0.065, 0.03],
  [0.07, 0.09],
  [0.055, 0.15],
  [0.035, 0.19],
  [0.04, 0.22],
].map(([x, y]) => new THREE.Vector2(x, y))

/** Shop-window podiums, pendants, rug, flowers, corner plants, vanity pouf and the counter logo. */
export function Decor({ layout, m, shopName }: { layout: StoreLayout; m: Materials; shopName: string }) {
  const { width: W, depth: D, ceiling: H } = layout.dims
  const island = layout.fixtures.find((f) => f.kind === 'island')
  const counter = layout.fixtures.find((f) => f.kind === 'counter')
  const makeup = layout.fixtures.find((f) => f.kind === 'makeupWall')

  const parts = useMemo(() => {
    const b = new GeoBuilder<'lacquer' | 'gold' | 'terracotta' | 'foliage' | 'dark' | 'rosePanel' | 'plum'>()
    for (const s of layout.windowSpots) {
      b.cylinder('lacquer', s.x, 0, s.z, s.radius, s.top - 0.012, 32)
      b.cylinder('gold', s.x, s.top - 0.012, s.z, s.radius + 0.006, 0.012, 32)
      b.cylinder('gold', s.x, 0, s.z, s.radius + 0.004, 0.02, 32)
    }
    // two topiary trees in the back corners
    for (const side of [-1, 1]) {
      const x = side * (W / 2 - 0.17)
      const z = -D + 0.22
      b.cylinder('lacquer', x, 0, z, 0.11, 0.34, 24, 0.13)
      b.cylinder('gold', x, 0.33, z, 0.135, 0.015, 24)
      b.cylinder('dark', x, 0.34, z, 0.015, 0.9, 6)
      b.add('foliage', new THREE.IcosahedronGeometry(0.2, 2), [x, 1.35, z])
      b.add('foliage', new THREE.IcosahedronGeometry(0.14, 2), [x + side * -0.06, 1.62, z + 0.03])
    }
    // pendant lights over the island
    if (island) {
      const cz = island.position[2] + island.depth / 2
      for (const sx of [-1, 1]) {
        const x = sx * (island.length / 2 + 0.12)
        b.cylinder('gold', x, 2.22, cz, 0.006, H - 2.22, 6)
        b.cylinder('gold', x, H - 0.02, cz, 0.05, 0.02, 16)
      }
    }
    // vanity pouf
    if (makeup) {
      const [x, , z] = localToWorld(makeup, makeup.length / 2, 0, makeup.depth + 0.42)
      b.cylinder('rosePanel', x, 0.04, z, 0.2, 0.36, 28)
      b.cylinder('gold', x, 0, z, 0.17, 0.04, 28)
    }
    return b.build()
  }, [layout, W, D, H, island, makeup])

  const vase = useMemo(() => new THREE.LatheGeometry(vaseProfile, 24), [])
  const flowers = useMemo(() => {
    const colors = ['#f2a7b8', '#f7d0d6', '#e88aa0', '#fbe7e1', '#f6b9a4', '#e9a0b4', '#fff1ec']
    return colors.map((c, i) => {
      const a = (i / colors.length) * Math.PI * 2
      const r = i === 0 ? 0 : 0.055
      return { color: c, x: Math.cos(a) * r, z: Math.sin(a) * r, y: 0.33 + (i % 3) * 0.025, s: 0.038 + (i % 2) * 0.01 }
    })
  }, [])
  const rug = useMemo(() => rugTexture(), [])

  const vasePos = counter ? localToWorld(counter, counter.length * 0.66, 0.995, counter.depth * 0.45) : null
  const logoPos = counter ? localToWorld(counter, counter.length / 2, 1.62, 0.012) : null
  const monogram = shopName
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <group>
      {Object.entries(parts).map(([k, g]) => (
        <mesh key={k} geometry={g} material={m[k as keyof Materials] as THREE.Material} />
      ))}
      {island && (
        <>
          <mesh rotation-x={-Math.PI / 2} position={[0, 0.003, island.position[2] + island.depth / 2]}>
            <circleGeometry args={[Math.min(1.05, W / 2 - 0.5), 64]} />
            <meshStandardMaterial map={rug} roughness={1} />
          </mesh>
          {[-1, 1].map((sx) => (
            <mesh key={sx} position={[sx * (island.length / 2 + 0.12), 2.12, island.position[2] + island.depth / 2]} material={m.bulb}>
              <sphereGeometry args={[0.1, 24, 16]} />
            </mesh>
          ))}
        </>
      )}
      {vasePos && (
        <group position={vasePos}>
          <mesh geometry={vase} material={m.lacquer} />
          {flowers.map((f, i) => (
            <group key={i}>
              <mesh position={[f.x * 0.5, 0.26, f.z * 0.5]} material={m.foliage}>
                <cylinderGeometry args={[0.003, 0.003, 0.14, 4]} />
              </mesh>
              <mesh position={[f.x, f.y, f.z]}>
                <sphereGeometry args={[f.s, 14, 10]} />
                <meshStandardMaterial color={f.color} roughness={0.8} />
              </mesh>
            </group>
          ))}
        </group>
      )}
      {logoPos && counter && (
        <group position={logoPos} rotation-y={counter.rotationY}>
          <mesh material={m.gold}>
            <torusGeometry args={[0.2, 0.008, 12, 64]} />
          </mesh>
          <mesh position-z={-0.004} material={m.plum}>
            <circleGeometry args={[0.195, 48]} />
          </mesh>
          <Text font={FONTS.serif} fontSize={0.16} color="#e9c98f" anchorX="center" anchorY="middle" position={[0, 0.005, 0.01]} letterSpacing={0.02}>
            {monogram}
          </Text>
          <Text font={FONTS.serif} fontSize={0.075} color="#6b1f3d" anchorX="center" anchorY="middle" position={[0, -0.29, 0.01]} letterSpacing={0.08}>
            {shopName}
          </Text>
        </group>
      )}
    </group>
  )
}
