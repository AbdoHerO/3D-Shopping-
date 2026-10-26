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

function softBoxTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  g.filter = 'blur(14px)'
  g.fillStyle = 'rgba(58,20,36,0.9)'
  g.fillRect(24, 24, 80, 80)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/**
 * Soft contact shadows under every fixture and podium: one blurred box texture stretched over
 * each footprint, merged into a single draw (cheap stand-in for baked ambient occlusion).
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
      <meshBasicMaterial map={map} transparent opacity={0.42} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

/** A bouquet as two draws: instanced flower heads (per-instance colour) and merged stems. */
function Flowers({ flowers, stem }: { flowers: { color: string; x: number; z: number; y: number; s: number }[]; stem: THREE.Material }) {
  const { heads, stems } = useMemo(() => {
    const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshStandardMaterial({ roughness: 0.8 }), flowers.length)
    const m = new THREE.Matrix4()
    const b = new GeoBuilder<'stem'>()
    flowers.forEach((f, i) => {
      m.makeScale(f.s, f.s, f.s).setPosition(f.x, f.y, f.z)
      heads.setMatrixAt(i, m)
      heads.setColorAt(i, new THREE.Color(f.color))
      b.add('stem', new THREE.CylinderGeometry(0.003, 0.003, 0.14, 4), [f.x * 0.5, 0.26, f.z * 0.5])
    })
    return { heads, stems: b.build().stem! }
  }, [flowers])
  return (
    <>
      <primitive object={heads} />
      <mesh geometry={stems} material={stem} />
    </>
  )
}

/** Shop-window podiums, pendants, rug, flowers, corner plants, vanity pouf and the counter logo. */
export function Decor({ layout, m, shopName }: { layout: StoreLayout; m: Materials; shopName: string }) {
  const { width: W, depth: D, ceiling: H } = layout.dims
  const island = layout.fixtures.find((f) => f.kind === 'island')
  const counter = layout.fixtures.find((f) => f.kind === 'counter')
  const makeup = layout.fixtures.find((f) => f.kind === 'makeupWall')

  const parts = useMemo(() => {
    const b = new GeoBuilder<'lacquer' | 'gold' | 'terracotta' | 'foliage' | 'dark' | 'rosePanel' | 'plum' | 'pendants'>()
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
        b.add('pendants', new THREE.SphereGeometry(0.1, 24, 16), [x, 2.12, cz])
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
      {Object.entries(parts)
        .filter(([k]) => k !== 'pendants')
        .map(([k, g]) => (
          <mesh key={k} geometry={g} material={m[k as keyof Materials] as THREE.Material} />
        ))}
      {island && (
        <>
          <mesh rotation-x={-Math.PI / 2} position={[0, 0.003, island.position[2] + island.depth / 2]}>
            <circleGeometry args={[Math.min(1.05, W / 2 - 0.5), 64]} />
            <meshStandardMaterial map={rug} roughness={1} />
          </mesh>
          <mesh geometry={parts.pendants} material={m.bulb} />
        </>
      )}
      {vasePos && (
        <group position={vasePos}>
          <mesh geometry={vase} material={m.lacquer} />
          <Flowers flowers={flowers} stem={m.foliage} />
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
