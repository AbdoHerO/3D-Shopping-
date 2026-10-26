import type { StoreDims } from './types'

/**
 * The boutique floor plan, built entirely from the room dimensions so the owner can change
 * width / depth / ceiling and every fixture, viewpoint and collider follows.
 *
 * World axes (1 unit = 1 m): origin = floor at the centre of the entrance, +X to the right when
 * walking in, -Z into the shop, +Y up. The front wall's inner face is z = 0.
 *
 * Every fixture also has a *local* frame: x runs along it from its left end to its right end
 * (as seen by a customer facing it), y is up and z points out of the wall towards the customer.
 */

export type Wall = 'left' | 'right' | 'back'
export type FixtureKind = 'wallShelf' | 'nailWall' | 'makeupWall' | 'perfumeWall' | 'island' | 'counter'
export type BayStyle = 'shelf' | 'steps' | 'glass' | 'mirror' | 'counterTop'

export interface Bay {
  /** Start / end along the fixture (local x, metres). */
  u0: number
  u1: number
  /** Indices into `fixture.levels` that this bay carries products on. */
  levels: number[]
  style: BayStyle
}

export interface Fixture {
  id: string
  kind: FixtureKind
  /** Which category the fixture is "about"; used for default placement of new products. */
  categoryId: string
  length: number
  depth: number
  height: number
  /** Shelf-top heights (local y) that products stand on. */
  levels: number[]
  /** Local z (distance out from the wall) of the front row of products. */
  productZ: number
  bays: Bay[]
  /** Where the sign plaque sits (local y of its centre). */
  signY: number
  /** World transform of the local frame. */
  position: [number, number, number]
  rotationY: number
  wall: Wall | null
}

export interface Viewpoint {
  id: string
  position: [number, number, number]
  yaw: number
  pitch: number
  /** For fixture viewpoints: the axis the camera can pan along and its limits. */
  pan?: { axis: [number, number, number]; min: number; max: number }
}

export interface Aabb {
  id: string
  min: [number, number]
  max: [number, number]
}

export interface WindowSpot {
  x: number
  z: number
  /** podium top height */
  top: number
  radius: number
}

export interface StoreLayout {
  dims: StoreDims
  /** podiums in the shop windows, showing featured products to the street */
  windowSpots: WindowSpot[]
  fixtures: Fixture[]
  door: { width: number; height: number }
  windows: { x0: number; x1: number; y0: number; y1: number }[]
  colliders: Aabb[]
  viewpoints: Record<string, Viewpoint>
  outside: Viewpoint
  eyeHeight: number
}

export const EYE_HEIGHT = 1.6
const WALL_SHELF_DEPTH = 0.36
const STANDARD_LEVELS = [0.14, 0.5, 0.86, 1.22, 1.58]
const VIEW_DISTANCE = 1.35

export const DEFAULT_DIMS: StoreDims = { width: 3.5, depth: 6.5, ceiling: 3.0 }

function round(n: number) {
  return Math.round(n * 1000) / 1000
}

/** Splits a run of wall into bays of roughly `target` metres separated by 3 cm uprights. */
function makeBays(length: number, levels: number[], style: BayStyle = 'shelf', target = 0.85): Bay[] {
  const count = Math.max(1, Math.round(length / target))
  const upright = 0.03
  const inner = (length - upright * (count + 1)) / count
  return Array.from({ length: count }, (_, i) => {
    const u0 = upright + i * (inner + upright)
    return { u0: round(u0), u1: round(u0 + inner), levels: levels.map((_, l) => l), style }
  })
}

function wallTransform(
  wall: Wall,
  start: number,
  length: number,
  dims: StoreDims,
): Pick<Fixture, 'position' | 'rotationY'> {
  const hw = dims.width / 2
  switch (wall) {
    case 'left':
      return { position: [-hw, 0, -start], rotationY: Math.PI / 2 }
    case 'right':
      return { position: [hw, 0, -(start + length)], rotationY: -Math.PI / 2 }
    case 'back':
      return { position: [-hw + start, 0, -dims.depth], rotationY: 0 }
  }
}

/** Converts a point in a fixture's local frame to world coordinates. */
export function localToWorld(f: Pick<Fixture, 'position' | 'rotationY'>, x: number, y: number, z: number) {
  const c = Math.cos(f.rotationY)
  const s = Math.sin(f.rotationY)
  // Rotation about Y: local x axis -> (c, 0, -s), local z axis -> (s, 0, c)
  return [f.position[0] + x * c + z * s, f.position[1] + y, f.position[2] - x * s + z * c] as [
    number,
    number,
    number,
  ]
}

/** World-space direction of the fixture's local +x (left → right along it). */
export function fixtureAxis(f: Pick<Fixture, 'rotationY'>): [number, number, number] {
  return [Math.cos(f.rotationY), 0, -Math.sin(f.rotationY)]
}

/** The camera yaw that looks straight at a fixture's front face. */
export function yawFacing(f: Pick<Fixture, 'rotationY'>) {
  // camera looks along -Z at yaw 0; the fixture faces along its local +z = (sin r, 0, cos r)
  return f.rotationY
}

export function createLayout(dims: StoreDims = DEFAULT_DIMS): StoreLayout {
  const W = dims.width
  const D = dims.depth
  const runEnd = D - 0.42 // side walls stop short of the perfume wall
  const fixtures: Fixture[] = []

  const addWall = (
    id: string,
    kind: FixtureKind,
    categoryId: string,
    wall: Wall,
    start: number,
    end: number,
    extra: Partial<Fixture> & { bays?: Bay[] },
  ) => {
    const length = round(end - start)
    const levels = extra.levels ?? STANDARD_LEVELS
    fixtures.push({
      id,
      kind,
      categoryId,
      length,
      depth: extra.depth ?? WALL_SHELF_DEPTH,
      height: extra.height ?? 2.2,
      levels,
      productZ: extra.productZ ?? 0.27,
      bays: extra.bays ?? makeBays(length, levels),
      signY: extra.signY ?? 2.34,
      wall,
      ...wallTransform(wall, start, length, dims),
    })
  }

  // Left wall: counter by the door, then hair care, then skincare.
  const counterStart = 0.5
  const counterEnd = Math.min(1.55, runEnd * 0.26)
  addWall('counter', 'counter', 'accessories', 'left', counterStart, counterEnd, {
    depth: 0.56,
    height: 1.0,
    levels: [1.0],
    productZ: 0.4,
    signY: 2.15,
    bays: [{ u0: 0.06, u1: round((counterEnd - counterStart) * 0.55), levels: [0], style: 'counterTop' }],
  })
  const hairStart = counterEnd + 0.12
  const hairEnd = round(hairStart + (runEnd - hairStart) * 0.53)
  addWall('wall-hair', 'wallShelf', 'hair', 'left', hairStart, hairEnd, {})
  addWall('wall-skin', 'wallShelf', 'skin', 'left', hairEnd, runEnd, {})

  // Right wall: hands & nails (with a stepped polish rack on top), then makeup with a vanity mirror.
  const nailStart = 0.6
  const nailEnd = round(nailStart + (runEnd - nailStart) * 0.44)
  const nailLevels = [0.14, 0.5, 0.86, 1.14, 1.32, 1.5, 1.68, 1.86]
  const nailBays = makeBays(nailEnd - nailStart, nailLevels).map((b) => ({
    ...b,
    style: 'steps' as BayStyle,
  }))
  addWall('wall-nails', 'nailWall', 'nails', 'right', nailStart, nailEnd, { levels: nailLevels, bays: nailBays })

  const makeupLength = runEnd - nailEnd
  const makeupBays = makeBays(makeupLength, STANDARD_LEVELS, 'shelf', makeupLength / 3)
  if (makeupBays.length >= 3) {
    const mid = Math.floor(makeupBays.length / 2)
    makeupBays[mid] = { ...makeupBays[mid], levels: [0, 1, 2], style: 'mirror' }
  }
  addWall('wall-makeup', 'makeupWall', 'makeup', 'right', nailEnd, runEnd, { bays: makeupBays })

  // Back wall: backlit perfume niches.
  const perfumeInset = 0.3
  const perfumeLength = W - perfumeInset * 2
  const perfumeLevels = [0.92, 1.22, 1.52, 1.82]
  addWall('wall-perfume', 'perfumeWall', 'perfume', 'back', perfumeInset, perfumeInset + perfumeLength, {
    depth: 0.32,
    height: 2.3,
    levels: perfumeLevels,
    productZ: 0.2,
    signY: 2.48,
    bays: makeBays(perfumeLength, perfumeLevels, 'glass', perfumeLength / 3).map((b) => ({
      ...b,
      u0: round(b.u0 + 0.06),
      u1: round(b.u1 - 0.06),
    })),
  })

  // Centre island: two tiers, promotions on top, body care below. Faces the entrance.
  const islandLength = round(Math.min(1.1, Math.max(0.6, W - 2 * WALL_SHELF_DEPTH - 1.7)))
  const islandDepth = 0.62
  const islandCentreZ = -D * 0.46
  fixtures.push({
    id: 'island',
    kind: 'island',
    categoryId: 'body',
    length: islandLength,
    depth: islandDepth,
    height: 0.92,
    levels: [0.36, 0.92],
    productZ: 0.42,
    bays: [{ u0: 0.06, u1: round(islandLength - 0.06), levels: [0, 1], style: 'shelf' }],
    signY: 1.32,
    wall: null,
    position: [-islandLength / 2, 0, round(islandCentreZ - islandDepth / 2)],
    rotationY: 0,
  })

  const doorWidth = Math.min(1.1, W * 0.32)
  const windows = [
    { x0: -W / 2 + 0.18, x1: -doorWidth / 2 - 0.2, y0: 0.45, y1: 2.35 },
    { x0: doorWidth / 2 + 0.2, x1: W / 2 - 0.18, y0: 0.45, y1: 2.35 },
  ]
  const windowSpots: WindowSpot[] = windows.flatMap((w) => {
    const width = w.x1 - w.x0
    return [
      { x: round(w.x0 + width * 0.3), z: -0.34, top: 0.62, radius: 0.12 },
      { x: round(w.x0 + width * 0.72), z: -0.3, top: 0.44, radius: 0.14 },
    ]
  })

  // Colliders (top-down AABBs in world XZ) for free-walk mode, padded for the camera body.
  const colliders: Aabb[] = fixtures.map((f) => {
    const a = localToWorld(f, 0, 0, 0)
    const b = localToWorld(f, f.length, 0, f.depth)
    return {
      id: f.id,
      min: [Math.min(a[0], b[0]), Math.min(a[2], b[2])],
      max: [Math.max(a[0], b[0]), Math.max(a[2], b[2])],
    }
  })

  windowSpots.forEach((s, k) =>
    colliders.push({ id: `window-${k}`, min: [s.x - s.radius, s.z - s.radius], max: [s.x + s.radius, s.z + s.radius] }),
  )

  const viewpoints: Record<string, Viewpoint> = {
    entrance: { id: 'entrance', position: [0, EYE_HEIGHT, -0.55], yaw: 0, pitch: -0.1 },
  }
  for (const f of fixtures) {
    const targetY = f.kind === 'island' ? 0.55 : f.kind === 'counter' ? 0.95 : f.kind === 'perfumeWall' ? 1.35 : 1.12
    const distance =
      f.kind === 'island' ? 1.05 : f.kind === 'counter' ? 1.0 : f.kind === 'perfumeWall' ? 1.5 : VIEW_DISTANCE
    const maxDistance = f.wall === 'left' || f.wall === 'right' ? W - f.depth - 0.5 : distance
    const d = Math.min(distance, maxDistance)
    const centre = localToWorld(f, f.length / 2, EYE_HEIGHT, f.depth + d)
    const axis = fixtureAxis(f)
    const halfPan = Math.max(0, f.length / 2 - 0.35)
    viewpoints[f.id] = {
      id: f.id,
      position: centre,
      yaw: yawFacing(f),
      pitch: Math.atan2(targetY - EYE_HEIGHT, d),
      pan: { axis, min: -halfPan, max: halfPan },
    }
  }

  return {
    dims,
    fixtures,
    door: { width: doorWidth, height: 2.3 },
    windows,
    windowSpots,
    colliders,
    viewpoints,
    outside: { id: 'outside', position: [0, 1.75, 7.2], yaw: 0, pitch: 0.02 },
    eyeHeight: EYE_HEIGHT,
  }
}

/** Throws a readable error when a layout is impossible (fixtures overlapping or outside the room). */
export function validateLayout(layout: StoreLayout): string[] {
  const problems: string[] = []
  const { width, depth } = layout.dims
  if (width < 2.4) problems.push(`The shop must be at least 2.4 m wide (got ${width} m).`)
  if (depth < 4) problems.push(`The shop must be at least 4 m deep (got ${depth} m).`)
  const eps = 1e-6
  layout.colliders.forEach((c, i) => {
    if (c.min[0] < -width / 2 - eps || c.max[0] > width / 2 + eps || c.min[1] < -depth - eps || c.max[1] > eps) {
      problems.push(`${c.id} sticks out of the room.`)
    }
    layout.colliders.forEach((o, j) => {
      if (j <= i) return
      const overlap =
        c.min[0] < o.max[0] - eps && c.max[0] > o.min[0] + eps && c.min[1] < o.max[1] - eps && c.max[1] > o.min[1] + eps
      if (overlap) problems.push(`${c.id} overlaps ${o.id}.`)
    })
  })
  return problems
}
