import { memo, useMemo } from 'react'
import { Text } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { Fixture } from '@/lib/layout'
import { archPath, archShape, GeoBuilder, roundedRectShape } from './geom'
import type { Materials } from './materials'
import { wallWashTexture } from './textures'

type Key =
  | 'lacquer'
  | 'rosePanel'
  | 'blushPanel'
  | 'plum'
  | 'gold'
  | 'led'
  | 'shelfGlass'
  | 'acrylic'
  | 'marbleTop'
  | 'fluted'
  | 'flutedPlum'
  | 'backlight'
  | 'mirror'
  | 'bulb'
  | 'dark'

const SIGN_COLOR = '#e9c98f'

function wallShelf(f: Fixture, b: GeoBuilder<Key>) {
  const L = f.length
  const D = f.depth
  const H = f.height
  const panel: Key = f.kind === 'nailWall' ? 'blushPanel' : 'rosePanel'
  b.boxAt(panel, 0, 0.12, 0, L, H - 0.24, 0.018)
  b.boxAt('plum', 0, 0, 0, L, 0.12, D - 0.01)
  b.boxAt('gold', 0, 0.105, D - 0.012, L, 0.01, 0.004)
  b.boxAt('lacquer', 0, 0.12, 0, L, 0.02, D)
  b.boxAt('lacquer', 0, 0, 0, 0.025, H, D + 0.01)
  b.boxAt('lacquer', L - 0.025, 0, 0, 0.025, H, D + 0.01)
  b.boxAt('lacquer', 0, H - 0.12, 0, L, 0.12, D + 0.025)
  b.boxAt('gold', 0, H - 0.075, D + 0.025, L, 0.014, 0.004)
  b.boxAt('led', 0.03, H - 0.127, D - 0.05, L - 0.06, 0.006, 0.02)
  for (let i = 0; i < f.bays.length - 1; i++) {
    const x = f.bays[i].u1
    b.boxAt('lacquer', x, 0.12, 0, f.bays[i + 1].u0 - x, H - 0.24, D - 0.005)
    b.boxAt('gold', x + (f.bays[i + 1].u0 - x) / 2 - 0.004, 0.14, D - 0.006, 0.008, H - 0.28, 0.004)
  }
  for (const bay of f.bays) {
    const w = bay.u1 - bay.u0
    if (bay.style === 'mirror') {
      // vanity top at the third level, mirror above
      b.boxAt('marbleTop', bay.u0 - 0.01, 0.84, 0, w + 0.02, 0.03, D + 0.05)
      b.boxAt('gold', bay.u0 - 0.01, 0.835, D + 0.05, w + 0.02, 0.008, 0.004)
      for (const level of bay.levels) {
        const y = f.levels[level]
        if (level === 0 || y > 0.8) continue
        b.boxAt('lacquer', bay.u0, y - 0.022, 0.02, w, 0.022, D - 0.03)
        b.boxAt('gold', bay.u0, y - 0.022, D - 0.01, w, 0.022, 0.004)
      }
      continue
    }
    for (const level of bay.levels) {
      if (level === 0) continue
      const y = f.levels[level]
      const step = bay.style === 'steps' && y > 1.05
      if (step) {
        b.boxAt('acrylic', bay.u0, y - 0.01, 0.14, w, 0.01, D - 0.15)
        b.boxAt('acrylic', bay.u0, y - 0.01, 0.14, w, 0.16, 0.008)
        b.boxAt('gold', bay.u0, y - 0.013, D - 0.012, w, 0.006, 0.004)
      } else {
        b.boxAt('lacquer', bay.u0, y - 0.022, 0.02, w, 0.022, D - 0.03)
        b.boxAt('gold', bay.u0, y - 0.022, D - 0.012, w, 0.022, 0.004)
        b.boxAt('led', bay.u0 + 0.02, y - 0.03, D - 0.06, w - 0.04, 0.005, 0.015)
      }
    }
  }
}

function perfumeWall(f: Fixture, b: GeoBuilder<Key>) {
  const L = f.length
  const D = f.depth
  const H = f.height
  const base = 0.9
  b.boxAt('plum', 0, 0, 0, L, base, D)
  b.boxAt('gold', 0, 0.02, D, L, 0.012, 0.004)
  b.boxAt('marbleTop', -0.02, base, 0, L + 0.04, 0.025, D + 0.03)
  b.boxAt('plum', 0, base, 0, L, H - base, 0.006)
  b.boxAt('plum', 0, H - 0.1, 0, L, 0.1, D + 0.02)
  b.boxAt('gold', 0, H - 0.06, D + 0.02, L, 0.012, 0.004)
  const top = H - 0.14
  const archHeight = top - base - 0.03
  // front panel with arched openings
  const front = new THREE.Shape()
  front.moveTo(0, base + 0.025)
  front.lineTo(L, base + 0.025)
  front.lineTo(L, H - 0.1)
  front.lineTo(0, H - 0.1)
  front.lineTo(0, base + 0.025)
  for (const bay of f.bays) front.holes.push(archPath(bay.u0, base + 0.025, bay.u1 - bay.u0, archHeight))
  b.add('plum', new THREE.ExtrudeGeometry(front, { depth: 0.05, bevelEnabled: false, curveSegments: 20 }), [0, 0, D - 0.05])
  let prev = 0
  for (const bay of f.bays) {
    const w = bay.u1 - bay.u0
    const h = archHeight
    // side walls of the niche
    b.boxAt('plum', prev, base + 0.025, 0, bay.u0 - prev, H - 0.1 - base, D - 0.05)
    prev = bay.u1
    // gold trim around the arch
    const ring = archShape(bay.u0 - 0.014, base + 0.025, w + 0.028, h + 0.014)
    ring.holes.push(archPath(bay.u0, base + 0.025, w, h))
    b.add('gold', new THREE.ExtrudeGeometry(ring, { depth: 0.008, bevelEnabled: false, curveSegments: 20 }), [0, 0, D])
    // warm backlit niche with normalised UVs for the gradient
    const back = new THREE.ShapeGeometry(archShape(bay.u0, base + 0.025, w, h), 20)
    const pos = back.attributes.position
    const uv = back.attributes.uv
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) - bay.u0) / w, (pos.getY(i) - base) / h)
    b.add('backlight', back, [0, 0, 0.008])
    for (const level of bay.levels) {
      if (level === 0) continue
      const y = f.levels[level]
      b.boxAt('shelfGlass', bay.u0, y - 0.01, 0.01, w, 0.01, D - 0.06)
      b.boxAt('gold', bay.u0, y - 0.012, D - 0.062, w, 0.012, 0.004)
    }
  }
  b.boxAt('plum', prev, base + 0.025, 0, L - prev, H - 0.1 - base, D - 0.05)
  // drawer pulls
  for (const bay of f.bays) {
    const cx = (bay.u0 + bay.u1) / 2
    b.boxAt('gold', cx - 0.11, 0.62, D, 0.22, 0.014, 0.02)
    b.boxAt('gold', bay.u0 + 0.01, 0.45, D, bay.u1 - bay.u0 - 0.02, 0.004, 0.002)
  }
}

function island(f: Fixture, b: GeoBuilder<Key>) {
  const L = f.length
  const D = f.depth
  b.boxAt('flutedPlum', 0.04, 0, 0.04, L - 0.08, 0.34, D - 0.08)
  b.boxAt('gold', 0.04, 0, D - 0.04, L - 0.08, 0.02, 0.004)
  b.boxAt('lacquer', 0, 0.34, 0, L, 0.022, D)
  b.boxAt('gold', 0, 0.34, D, L, 0.022, 0.004)
  for (const [x, z] of [
    [0.05, 0.05],
    [L - 0.05, 0.05],
    [0.05, D - 0.05],
    [L - 0.05, D - 0.05],
  ])
    b.cylinder('gold', x, 0.362, z, 0.016, 0.53, 14)
  b.boxAt('marbleTop', -0.025, 0.888, -0.025, L + 0.05, 0.034, D + 0.05)
  b.boxAt('gold', -0.025, 0.884, D + 0.025, L + 0.05, 0.006, 0.004)
}

function counter(f: Fixture, b: GeoBuilder<Key>) {
  const L = f.length
  const D = f.depth
  b.boxAt('fluted', 0, 0, 0, L, 0.95, D)
  b.boxAt('gold', 0, 0, D, L, 0.035, 0.006)
  b.boxAt('marbleTop', -0.02, 0.95, 0, L + 0.04, 0.045, D + 0.04)
  b.boxAt('gold', -0.02, 0.945, D + 0.04, L + 0.04, 0.006, 0.004)
  // card terminal
  b.boxAt('dark', L * 0.74, 0.995, D * 0.3, 0.2, 0.012, 0.14)
  b.add('dark', new THREE.BoxGeometry(0.2, 0.14, 0.012), [L * 0.84, 1.07, D * 0.38], [-0.45, 0, 0])
}

function buildFixture(f: Fixture) {
  const b = new GeoBuilder<Key>()
  if (f.kind === 'perfumeWall') perfumeWall(f, b)
  else if (f.kind === 'island') island(f, b)
  else if (f.kind === 'counter') counter(f, b)
  else wallShelf(f, b)
  return b.build()
}

function Mirror({ f, m }: { f: Fixture; m: Materials }) {
  const bay = f.bays.find((b) => b.style === 'mirror')
  const geo = useMemo(() => {
    if (!bay) return null
    const w = (bay.u1 - bay.u0) * 0.8
    const h = 0.88
    const frame = roundedRectShape(-w / 2 - 0.03, -h / 2 - 0.03, w + 0.06, h + 0.06, 0.06)
    const hole = roundedRectShape(-w / 2, -h / 2, w, h, 0.045)
    frame.holes.push(hole)
    const cx = (bay.u0 + bay.u1) / 2
    const cy = 1.42
    const bulbs = new GeoBuilder<'bulb'>()
    for (let i = 0; i < 5; i++) {
      const y = cy - h / 2 + 0.08 + (i * (h - 0.16)) / 4
      for (const x of [cx - w / 2 - 0.06, cx + w / 2 + 0.06]) bulbs.add('bulb', new THREE.SphereGeometry(0.022, 14, 10), [x, y, 0.05])
    }
    return {
      bulbs: bulbs.build().bulb!,
      w,
      h,
      glass: (() => {
        const g = new THREE.ShapeGeometry(roundedRectShape(-w / 2, -h / 2, w, h, 0.045), 8)
        const pos = g.attributes.position
        const uv = g.attributes.uv
        for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5)
        return g
      })(),
      frame: new THREE.ExtrudeGeometry(frame, { depth: 0.02, bevelEnabled: false, curveSegments: 8 }),
    }
  }, [bay])
  if (!bay || !geo) return null
  const cx = (bay.u0 + bay.u1) / 2
  const cy = 1.42
  return (
    <group>
      <mesh geometry={geo.glass} position={[cx, cy, 0.03]} material={m.mirror} />
      <mesh geometry={geo.frame} position={[cx, cy, 0.02]} material={m.gold} />
      <mesh geometry={geo.bulbs} material={m.bulb} />
    </group>
  )
}

function Sign({ f, label, font, m }: { f: Fixture; label: string; font: string; m: Materials }) {
  const hanging = f.kind === 'island'
  const width = Math.min(1.15, Math.max(0.62, f.length * 0.42, label.length * 0.07))
  const pos: [number, number, number] = hanging ? [f.length / 2, 2.12, f.depth / 2] : [f.length / 2, f.signY, 0.02]
  return (
    <group position={pos}>
      {hanging && (
        <>
          <mesh position={[-width / 2 + 0.06, 0.45, 0]} material={m.gold}>
            <cylinderGeometry args={[0.004, 0.004, 0.8, 6]} />
          </mesh>
          <mesh position={[width / 2 - 0.06, 0.45, 0]} material={m.gold}>
            <cylinderGeometry args={[0.004, 0.004, 0.8, 6]} />
          </mesh>
        </>
      )}
      <mesh material={m.gold}>
        <boxGeometry args={[width + 0.024, 0.224, 0.02]} />
      </mesh>
      <mesh position-z={0.006} material={m.plum}>
        <boxGeometry args={[width, 0.2, 0.02]} />
      </mesh>
      <Text font={font} fontSize={0.1} letterSpacing={0.03} color={SIGN_COLOR} anchorX="center" anchorY="middle" position={[0, 0.004, 0.018]} maxWidth={width - 0.06}>
        {label}
      </Text>
      {hanging && (
        <Text font={font} fontSize={0.1} letterSpacing={0.03} color={SIGN_COLOR} anchorX="center" anchorY="middle" position={[0, 0.004, -0.018]} rotation-y={Math.PI} maxWidth={width - 0.06}>
          {label}
        </Text>
      )}
    </group>
  )
}

/** Soft light falling from the top LED onto each bay's back panel (one merged draw per fixture). */
function WallWashes({ f }: { f: Fixture }) {
  const geometry = useMemo(() => {
    if (f.kind !== 'wallShelf' && f.kind !== 'nailWall' && f.kind !== 'makeupWall') return null
    const b = new GeoBuilder<'wash'>()
    for (const bay of f.bays) b.add('wash', new THREE.PlaneGeometry((bay.u1 - bay.u0) * 1.1, 1.3), [(bay.u0 + bay.u1) / 2, f.height - 0.75, 0.02])
    return b.build().wash ?? null
  }, [f])
  if (!geometry) return null
  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial map={wallWashTexture()} transparent opacity={0.32} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

interface FixtureProps {
  f: Fixture
  m: Materials
  label: string
  font: string
  onSelect: (f: Fixture, u: number) => void
}

const FixtureView = memo(function FixtureView({ f, m, label, font, onSelect }: FixtureProps) {
  const parts = useMemo(() => buildFixture(f), [f])
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 8) return
    e.stopPropagation()
    const local = e.eventObject.worldToLocal(e.point.clone())
    onSelect(f, local.x)
  }
  return (
    <group position={f.position} rotation-y={f.rotationY}>
      <group
        onClick={onClick}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        {Object.entries(parts).map(([k, g]) => (
          <mesh key={k} geometry={g} material={m[k as Key]} />
        ))}
      </group>
      {f.kind === 'makeupWall' && <Mirror f={f} m={m} />}
      <WallWashes f={f} />
      <Sign f={f} label={label} font={font} m={m} />
    </group>
  )
})

export function Fixtures({
  fixtures,
  m,
  labelFor,
  font,
  onSelect,
}: {
  fixtures: Fixture[]
  m: Materials
  labelFor: (id: string) => string
  font: string
  onSelect: (f: Fixture, u: number) => void
}) {
  return (
    <>
      {fixtures.map((f) => (
        <FixtureView key={f.id} f={f} m={m} label={labelFor(f.id)} font={font} onSelect={onSelect} />
      ))}
    </>
  )
}
