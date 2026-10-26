import { memo, useMemo } from 'react'
import { Text } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { SHOP, type Fixture } from '@/lib/layout'
import { GeoBuilder } from './geom'
import type { Materials } from './materials'

type Key =
  | 'shelf'
  | 'shelfBack'
  | 'oak'
  | 'black'
  | 'blackMatte'
  | 'chrome'
  | 'glass'
  | 'shelfGlass'
  | 'glassEdge'
  | 'ledWarm'
  | 'ledNeutral'
  | 'screen'
  | 'plastic'
  | 'rail'

const BOARD = 0.02
const UPRIGHT = 0.025

/** Shared carcass of a shelving unit: back, ends, uprights between bays, plinth and top. */
function carcass(f: Fixture, b: GeoBuilder<Key>, frame: Key, back: Key, from = 0) {
  const { length: L, depth: D, height: H } = f
  b.boxAt(back, 0, from, 0, L, H - from, 0.012)
  b.boxAt(frame, 0, from, 0, UPRIGHT, H - from, D)
  b.boxAt(frame, L - UPRIGHT, from, 0, UPRIGHT, H - from, D)
  b.boxAt(frame, 0, H - 0.035, 0, L, 0.035, D)
  for (let i = 0; i < f.bays.length - 1; i++) {
    const x = f.bays[i].u1
    b.boxAt(frame, x, from, 0.012, f.bays[i + 1].u0 - x, H - from - 0.035, D - 0.014)
  }
}

/** Tall white melamine wall shelving, as on the left wall and at the back of the right wall. */
function wallShelf(f: Fixture, b: GeoBuilder<Key>) {
  const { length: L, depth: D } = f
  carcass(f, b, 'shelf', 'shelfBack')
  // plinth: the bottom shelf sits on it
  b.boxAt('shelf', 0, 0, 0.02, L, f.levels[0], D - 0.03)
  b.boxAt('blackMatte', 0, 0, D - 0.03, L, 0.06, 0.006)
  for (const bay of f.bays) {
    const w = bay.u1 - bay.u0
    for (const level of bay.levels) {
      if (level === 0) continue
      const y = f.levels[level]
      b.boxAt('shelf', bay.u0, y - BOARD, 0.012, w, BOARD, D - 0.014)
      // pale price rail on the shelf edge
      b.boxAt('rail', bay.u0, y - BOARD - 0.012, D - 0.006, w, 0.026, 0.006)
    }
  }
}

/** Perfume shelving behind the counter: glass shelves lit by warm LED strips. */
function perfumeWall(f: Fixture, b: GeoBuilder<Key>) {
  const { length: L, depth: D } = f
  carcass(f, b, 'shelf', 'shelfBack')
  b.boxAt('shelf', 0, 0, 0.02, L, f.levels[0], D - 0.03)
  for (const bay of f.bays) {
    const w = bay.u1 - bay.u0
    for (const level of bay.levels) {
      const y = f.levels[level]
      if (level > 0) {
        b.boxAt('shelfGlass', bay.u0, y - 0.01, 0.014, w, 0.01, D - 0.03)
        b.boxAt('glassEdge', bay.u0, y - 0.01, D - 0.018, w, 0.01, 0.004)
      }
      // warm LED strip under the shelf above, shining down on the bottles
      const above = f.levels[level + 1] ?? f.height - 0.035
      b.boxAt('ledWarm', bay.u0 + 0.01, above - 0.022, D - 0.06, w - 0.02, 0.006, 0.014)
    }
  }
}

/** Back wall: shelving over a light-oak base cabinet whose top carries products too. */
function backWall(f: Fixture, b: GeoBuilder<Key>) {
  const { length: L, depth: D } = f
  const base = SHOP.backBase
  b.boxAt('oak', 0, 0.06, 0.012, L, base - 0.06 - 0.03, D)
  b.boxAt('blackMatte', 0, 0, 0.03, L, 0.06, D - 0.03)
  b.boxAt('shelf', -0.01, base - 0.03, 0.012, L + 0.02, 0.03, D + 0.02)
  // cabinet doors
  const doors = Math.max(2, Math.round(L / 0.6))
  for (let i = 1; i < doors; i++) b.boxAt('blackMatte', (i * L) / doors - 0.002, 0.08, D + 0.012, 0.004, base - 0.14, 0.002)
  carcass(f, b, 'shelf', 'shelfBack', base)
  for (const bay of f.bays) {
    const w = bay.u1 - bay.u0
    for (const level of bay.levels) {
      if (level === 0) continue
      const y = f.levels[level]
      b.boxAt('shelf', bay.u0, y - BOARD, 0.012, w, BOARD, D - 0.06)
      b.boxAt('rail', bay.u0, y - BOARD - 0.012, D - 0.056, w, 0.026, 0.006)
    }
  }
}

/** Glass-topped display counter on an oak base, with its till at the rear end and a return at the front. */
function counter(f: Fixture, b: GeoBuilder<Key>) {
  const { length: L, depth: D, height: H } = f
  const shelfY = f.levels[0]
  const gap = SHOP.counter.staffGap
  // oak base on the customer side up to the vitrine, closed staff side
  b.boxAt('oak', 0, 0.05, 0, L, shelfY - 0.05, D)
  b.boxAt('blackMatte', 0.03, 0, 0.03, L - 0.06, 0.05, D - 0.06)
  // vitrine floor, LED and glass box
  b.boxAt('shelf', 0.02, shelfY - 0.012, 0.02, L - 0.04, 0.012, D - 0.04)
  b.boxAt('ledNeutral', 0.04, H - 0.032, D - 0.05, L - 0.08, 0.006, 0.012)
  b.boxAt('glass', 0, shelfY, D - 0.01, L, H - shelfY, 0.01)
  b.boxAt('glass', 0, shelfY, 0, 0.01, H - shelfY, D)
  b.boxAt('glass', L - 0.01, shelfY, 0, 0.01, H - shelfY, D)
  b.boxAt('oak', 0, shelfY, 0, L, H - shelfY, 0.012)
  b.boxAt('glass', -0.01, H - 0.012, -0.01, L + 0.02, 0.012, D + 0.02)
  b.boxAt('glassEdge', -0.01, H - 0.012, D + 0.008, L + 0.02, 0.012, 0.004)
  // slim black frame posts
  const posts = Math.max(2, Math.round(L / 0.75) + 1)
  for (let i = 0; i < posts; i++) {
    const x = Math.min(L - 0.012, (i * L) / (posts - 1))
    b.boxAt('black', x - 0.006, shelfY, D - 0.014, 0.012, H - shelfY - 0.012, 0.012)
  }
  // till at the rear end: oak top, two screens on stands, card terminal
  b.boxAt('oak', 0, H, 0, 0.75, 0.025, D)
  for (const [x, z] of [
    [0.22, D * 0.45],
    [0.55, D * 0.5],
  ]) {
    b.cylinder('plastic', x, H + 0.025, z, 0.07, 0.012, 16)
    b.boxAt('plastic', x - 0.015, H + 0.035, z - 0.01, 0.03, 0.16, 0.02)
    b.add('screen', new THREE.BoxGeometry(0.34, 0.22, 0.03), [x, H + 0.27, z + 0.02], [-0.12, -Math.PI / 2 + 0.35, 0])
  }
  b.boxAt('plastic', 0.62, H + 0.025, D * 0.75, 0.08, 0.04, 0.14)
  // return towards the wall at the customer's right end: a small framed glass case on oak
  const r0 = L - 0.5
  b.boxAt('oak', r0, 0.05, -gap + 0.06, 0.5, shelfY - 0.05, gap - 0.06)
  b.boxAt('glass', r0, shelfY, -gap + 0.06, 0.01, H - shelfY, gap - 0.06)
  b.boxAt('glass', r0, shelfY, -gap + 0.06, 0.5, H - shelfY, 0.01)
  b.boxAt('glass', r0 - 0.01, H - 0.012, -gap + 0.05, 0.52, 0.012, gap - 0.04)
  b.boxAt('black', r0, H - 0.03, -gap + 0.06, 0.5, 0.02, 0.012)
  b.boxAt('black', r0, shelfY, -gap + 0.06, 0.012, H - shelfY, 0.012)
  b.boxAt('ledNeutral', r0 + 0.03, H - 0.032, -gap + 0.1, 0.44, 0.006, 0.012)
}

/** Black freestanding nail-polish stand with stepped tiers and a brand header. */
function nailStand(f: Fixture, b: GeoBuilder<Key>) {
  const { length: L, depth: D, height: H } = f
  b.boxAt('black', 0, 0, 0, L, f.levels[0] - 0.02, D)
  b.boxAt('black', 0, 0, 0, L, H, 0.03)
  b.boxAt('black', -0.02, 0, 0, 0.02, H - 0.25, D)
  b.boxAt('black', L, 0, 0, 0.02, H - 0.25, D)
  const step = f.levels.length > 1 ? Math.abs((f.levelZ?.[0] ?? 0) - (f.levelZ?.[1] ?? 0)) : 0.06
  f.levels.forEach((y, i) => {
    const z = f.levelZ?.[i] ?? f.productZ
    // step: a black board as deep as one tier, a clear acrylic lip, and the riser at its back edge
    b.boxAt('blackMatte', 0, y - 0.015, z - step / 2, L, 0.015, step)
    b.boxAt('glassEdge', 0, y, z + step / 2 - 0.003, L, 0.02, 0.003)
    b.boxAt('black', 0, i === 0 ? f.levels[0] - 0.02 : f.levels[i - 1], z - step / 2 - 0.01, L, i === 0 ? 0.02 : y - f.levels[i - 1], 0.01)
  })
  // header panel above the tiers
  b.boxAt('black', -0.02, H - 0.25, 0, L + 0.04, 0.25, 0.06)
}

/** Display case inside a shop window, facing the street: black frame, white back, glass shelves. */
function vitrine(f: Fixture, b: GeoBuilder<Key>) {
  const { length: L, depth: D, height: H } = f
  b.boxAt('blackMatte', 0, 0, 0, L, H, 0.012)
  b.boxAt('shelfBack', 0.02, 0.02, 0.012, L - 0.04, H - 0.04, 0.004)
  b.boxAt('black', 0, 0, 0, 0.03, H, D)
  b.boxAt('black', L - 0.03, 0, 0, 0.03, H, D)
  b.boxAt('black', 0, H - 0.05, 0, L, 0.05, D)
  b.boxAt('black', 0, 0, 0, L, f.levels[0], D)
  b.boxAt('ledNeutral', 0.04, H - 0.056, D - 0.05, L - 0.08, 0.006, 0.014)
  for (const [level, y] of f.levels.entries()) {
    if (level === 0) continue
    b.boxAt('shelfGlass', 0.03, y - 0.01, 0.016, L - 0.06, 0.01, D - 0.03)
    b.boxAt('black', 0.03, y - 0.012, D - 0.012, L - 0.06, 0.012, 0.012)
  }
}

function buildFixture(f: Fixture) {
  const b = new GeoBuilder<Key>()
  if (f.kind === 'perfumeWall') perfumeWall(f, b)
  else if (f.kind === 'backWall') backWall(f, b)
  else if (f.kind === 'counter') counter(f, b)
  else if (f.kind === 'nailStand') nailStand(f, b)
  else if (f.kind === 'vitrine') vitrine(f, b)
  else wallShelf(f, b)
  return b.build()
}

/** Warm light washing the back panel of each perfume bay (additive, one merged draw). */
function BayGlow({ f, m }: { f: Fixture; m: Materials }) {
  const geometry = useMemo(() => {
    if (f.kind !== 'perfumeWall') return null
    const b = new GeoBuilder<'glow'>()
    for (const bay of f.bays) {
      for (let level = 0; level < f.levels.length; level++) {
        const y0 = f.levels[level]
        const y1 = f.levels[level + 1] ?? f.height - 0.035
        b.add('glow', new THREE.PlaneGeometry(bay.u1 - bay.u0, y1 - y0 - 0.02), [(bay.u0 + bay.u1) / 2, (y0 + y1) / 2, 0.016])
      }
    }
    return b.build().glow ?? null
  }, [f])
  if (!geometry) return null
  return <mesh geometry={geometry} material={m.glow} />
}

/** Header text of the nail stand (the fixture label, e.g. a brand). */
function StandHeader({ f, label, font }: { f: Fixture; label: string; font: string }) {
  if (f.kind !== 'nailStand' || !label) return null
  return (
    <Text font={font} fontSize={0.085} letterSpacing={0.02} color="#ffffff" anchorX="center" anchorY="middle" position={[f.length / 2, f.height - 0.125, 0.065]} maxWidth={f.length - 0.06}>
      {label}
    </Text>
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
    if (e.delta > 8 || !f.browsable) return
    e.stopPropagation()
    const local = e.eventObject.worldToLocal(e.point.clone())
    onSelect(f, local.x)
  }
  return (
    <group position={f.position} rotation-y={f.rotationY}>
      <group
        onClick={onClick}
        onPointerOver={() => f.browsable && (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        {Object.entries(parts).map(([k, g]) => (
          <mesh key={k} geometry={g} material={m[k as Key]} />
        ))}
      </group>
      <BayGlow f={f} m={m} />
      <StandHeader f={f} label={label} font={font} />
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
