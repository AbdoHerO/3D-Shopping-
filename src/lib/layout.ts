import type { StoreDims } from './types'

/**
 * The boutique floor plan, rebuilt from the photographs of the real shop (docs/reference/tifawin/README.md):
 * a long, narrow room with tall white shelving down both walls and across the back, a glass-topped
 * oak counter on the right, a freestanding nail-polish stand by the entrance and a display case in
 * each shop window facing the street. Everything is computed from the room dimensions plus the
 * SHOP constants below, so a measured survey only means changing numbers.
 *
 * World axes (1 unit = 1 m): origin = floor at the centre of the front wall, +X to the right when
 * walking in, -Z into the shop, +Y up. The front wall's inner face is z = 0.
 *
 * Every fixture also has a *local* frame: x runs along it from its left end to its right end
 * (as seen by a customer facing it), y is up and z points out of the wall towards the customer.
 */

export type Wall = 'left' | 'right' | 'back' | 'front'
export type FixtureKind = 'wallShelf' | 'perfumeWall' | 'backWall' | 'counter' | 'nailStand' | 'vitrine'
export type BayStyle = 'shelf' | 'glass' | 'steps' | 'vitrine' | 'counterTop'

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
  /** Which category the fixture is "about"; used for automatic placement of new products. */
  categoryId: string
  length: number
  depth: number
  height: number
  /** Shelf-top heights (local y) that products stand on. */
  levels: number[]
  /** Local z (distance out from the back) of the front row of products. */
  productZ: number
  /** Per-level override of productZ (stepped displays). */
  levelZ?: number[]
  bays: Bay[]
  /** World transform of the local frame. */
  position: [number, number, number]
  rotationY: number
  wall: Wall | null
  /** Products come from placements ('shelf') or are the featured products of some categories ('featured'). */
  stock: 'shelf' | { featured: string[] }
  /** Listed in the section bar and reachable as a viewpoint. */
  browsable: boolean
}

export interface Viewpoint {
  id: string
  position: [number, number, number]
  yaw: number
  pitch: number
  /** For fixture viewpoints: the axis the camera can pan along and its limits. */
  pan?: { axis: [number, number, number]; min: number; max: number }
  /** Position along the fixture (local x) the viewpoint faces; pans are measured from it. */
  u?: number
}

export interface Aabb {
  id: string
  min: [number, number]
  max: [number, number]
}

export interface Opening {
  x0: number
  x1: number
  y0: number
  y1: number
}

export interface StoreLayout {
  dims: StoreDims
  fixtures: Fixture[]
  door: { x0: number; x1: number; height: number }
  windows: Opening[]
  /** Free walking corridor down the middle of the shop (x range at a few depths). */
  aisle: { x0: number; x1: number; z0: number; z1: number }[]
  /** Collision boxes in world XZ. The first `fixtures.length` entries match `fixtures` by index. */
  colliders: Aabb[]
  viewpoints: Record<string, Viewpoint>
  outside: Viewpoint
  eyeHeight: number
}

export const EYE_HEIGHT = 1.6

/**
 * Shop measurements. **All of these are estimates** read from the photographs and the owner's
 * description ("3 or 4 m wide, 6 or 7 m long"); nothing has been surveyed yet. Change them here
 * (and the room size in Admin → Settings) once the shop is measured.
 */
export const SHOP = {
  /** Depth of the white wall shelving (estimate). */
  wallShelfDepth: 0.32,
  /** Height of the wall shelving; the photos show it close to the ceiling (estimate, capped by the ceiling). */
  wallShelfHeight: 2.7,
  /** Shelf tops of the wall shelving, 28 cm apart (estimate). */
  wallLevels: [0.1, 0.38, 0.66, 0.94, 1.22, 1.5, 1.78, 2.06, 2.34],
  /** Target width of one shelving bay between uprights (estimate). */
  bayWidth: 0.62,
  /** Side shelving starts this far inside the front wall, behind the window displays (estimate). */
  sideStart: 0.45,
  /** Share of each side wall given to its sections, front to back. */
  leftSplit: [0.42, 0.3, 0.28],
  rightSplit: [0.56, 0.44],
  /** Oak base cabinet under the back-wall shelving (estimate). */
  backBase: 0.9,
  backLevels: [0.9, 1.18, 1.46, 1.74, 2.02, 2.3],
  /** Glass-topped counter parallel to the right wall (all estimates). */
  counter: { start: 1.3, length: 2.2, depth: 0.55, height: 0.95, staffGap: 0.7, vitrineShelf: 0.5 },
  /** Freestanding nail-polish stand near the entrance (estimate from the photos). */
  nailStand: { width: 0.7, depth: 0.5, height: 1.72, z: 1.0, tiers: 7 },
  /** Display cases inside the shop windows, facing the street (estimate). */
  vitrine: { depth: 0.3, height: 2.15, levels: [0.12, 0.42, 0.72, 1.02, 1.32, 1.62, 1.92] },
  /** Entrance opening, slightly right of centre as in the photo (estimate). */
  door: { width: 1.2, offset: 0.12, height: 2.35 },
  windowSill: 0.08,
  windowTop: 2.35,
  /** Suspended ceiling panels and floor tiles (estimates: standard 60 cm grid, 45 cm tiles). */
  ceilingPanel: 0.6,
  floorTile: 0.45,
} as const

export const DEFAULT_DIMS: StoreDims = { width: 3.5, depth: 6.5, ceiling: 3.0 }

const VIEW_DISTANCE = 1.3

function round(n: number) {
  return Math.round(n * 1000) / 1000
}

/** Splits a run into bays of roughly `target` metres separated by 2.5 cm uprights. */
function makeBays(length: number, levels: readonly number[], style: BayStyle = 'shelf', target: number = SHOP.bayWidth): Bay[] {
  const count = Math.max(1, Math.round(length / target))
  const upright = 0.025
  const inner = (length - upright * (count + 1)) / count
  return Array.from({ length: count }, (_, i) => {
    const u0 = upright + i * (inner + upright)
    return { u0: round(u0), u1: round(u0 + inner), levels: levels.map((_, l) => l), style }
  })
}

function wallTransform(wall: Wall, start: number, length: number, dims: StoreDims, inset = 0): Pick<Fixture, 'position' | 'rotationY'> {
  const hw = dims.width / 2
  switch (wall) {
    case 'left':
      return { position: [-hw, 0, -start], rotationY: Math.PI / 2 }
    case 'right':
      return { position: [hw, 0, -(start + length)], rotationY: -Math.PI / 2 }
    case 'back':
      return { position: [-hw + start, 0, -dims.depth], rotationY: 0 }
    case 'front':
      // display cases standing against the inside of the front wall, facing the street
      return { position: [-hw + start, 0, -inset], rotationY: 0 }
  }
}

/** Converts a point in a fixture's local frame to world coordinates. */
export function localToWorld(f: Pick<Fixture, 'position' | 'rotationY'>, x: number, y: number, z: number) {
  const c = Math.cos(f.rotationY)
  const s = Math.sin(f.rotationY)
  // Rotation about Y: local x axis -> (c, 0, -s), local z axis -> (s, 0, c)
  return [f.position[0] + x * c + z * s, f.position[1] + y, f.position[2] - x * s + z * c] as [number, number, number]
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

/** Axis-aligned footprint of a fixture in world XZ (rotated fixtures included). */
export function footprint(f: Pick<Fixture, 'position' | 'rotationY' | 'length' | 'depth'>, id: string, zFrom = 0): Aabb {
  const pts = [
    localToWorld(f, 0, 0, zFrom),
    localToWorld(f, f.length, 0, zFrom),
    localToWorld(f, 0, 0, f.depth),
    localToWorld(f, f.length, 0, f.depth),
  ]
  const xs = pts.map((p) => p[0])
  const zs = pts.map((p) => p[2])
  return { id, min: [round(Math.min(...xs)), round(Math.min(...zs))], max: [round(Math.max(...xs)), round(Math.max(...zs))] }
}

export function createLayout(dims: StoreDims = DEFAULT_DIMS): StoreLayout {
  const W = dims.width
  const D = dims.depth
  const H = dims.ceiling
  const sd = SHOP.wallShelfDepth
  const shelfH = Math.min(SHOP.wallShelfHeight, H - 0.06)
  const wallLevels = SHOP.wallLevels.filter((y) => y < shelfH - 0.22)
  const fixtures: Fixture[] = []

  const sideLength = D - SHOP.sideStart
  const sections = (split: readonly number[]) => {
    let at = SHOP.sideStart
    return split.map((share, i) => {
      const len = i === split.length - 1 ? D - at : round(sideLength * share)
      const run = { start: round(at), length: round(len) }
      at += len
      return run
    })
  }

  const wall = (
    id: string,
    kind: FixtureKind,
    categoryId: string,
    side: Wall,
    run: { start: number; length: number },
    extra: Partial<Fixture> = {},
  ) => {
    const levels = extra.levels ?? wallLevels
    fixtures.push({
      id,
      kind,
      categoryId,
      length: run.length,
      depth: sd,
      height: shelfH,
      levels,
      productZ: 0.2,
      bays: makeBays(run.length, levels),
      wall: side,
      stock: 'shelf',
      browsable: true,
      ...wallTransform(side, run.start, run.length, dims),
      ...extra,
    })
  }

  // Left wall, front to back: hair care, body and hygiene, makeup.
  const [hair, body, makeup] = sections(SHOP.leftSplit)
  wall('wall-hair', 'wallShelf', 'hair', 'left', hair)
  wall('wall-body', 'wallShelf', 'body', 'left', body)
  wall('wall-makeup', 'wallShelf', 'makeup', 'left', makeup)

  // Right wall, front to back: perfume (behind the counter, warm lit), then gift sets.
  const [perfume, gifts] = sections(SHOP.rightSplit)
  wall('wall-perfume', 'perfumeWall', 'perfume', 'right', perfume, { bays: makeBays(perfume.length, wallLevels, 'glass') })
  wall('wall-gifts', 'wallShelf', 'perfume', 'right', gifts)

  // Back wall: shelving above an oak base cabinet, between the two side walls.
  const backLevels = SHOP.backLevels.filter((y) => y < shelfH - 0.22)
  const backRun = { start: sd, length: round(W - 2 * sd) }
  wall('wall-skin', 'backWall', 'skin', 'back', backRun, {
    levels: backLevels,
    bays: makeBays(backRun.length, backLevels),
  })

  // Glass-topped counter parallel to the right wall; its front faces the aisle.
  const c = SHOP.counter
  const counterBack = W / 2 - sd - c.staffGap
  const counterLength = Math.min(c.length, Math.max(1, D - c.start - 2.2))
  fixtures.push({
    id: 'counter',
    kind: 'counter',
    categoryId: 'accessories',
    length: counterLength,
    depth: c.depth,
    height: c.height,
    levels: [c.vitrineShelf, c.height + 0.012],
    productZ: c.depth / 2,
    bays: [
      // under the glass: the whole length; on top: the front part, clear of the till at the rear end
      { u0: 0.06, u1: round(counterLength - 0.06), levels: [0], style: 'vitrine' },
      { u0: round(Math.min(0.85, counterLength * 0.4)), u1: round(counterLength - 0.08), levels: [1], style: 'counterTop' },
    ],
    position: [round(counterBack), 0, -round(c.start + counterLength)],
    rotationY: -Math.PI / 2,
    wall: null,
    stock: 'shelf',
    browsable: true,
  })

  // Freestanding nail-polish stand by the entrance, angled towards the aisle.
  const n = SHOP.nailStand
  const standYaw = 0.85
  const standCentre: [number, number] = [-W / 2 + sd + 0.12 + n.depth / 2 + 0.1, -n.z]
  const tiers = Array.from({ length: n.tiers }, (_, i) => round(0.4 + i * 0.15))
  const standTransform = (() => {
    // place the local origin (back-left corner) so the stand's centre lands on standCentre
    const cc = Math.cos(standYaw)
    const ss = Math.sin(standYaw)
    const cx = n.width / 2
    const cz = n.depth / 2
    return {
      position: [round(standCentre[0] - (cx * cc + cz * ss)), 0, round(standCentre[1] - (-cx * ss + cz * cc))] as [number, number, number],
      rotationY: standYaw,
    }
  })()
  fixtures.push({
    id: 'stand-nails',
    kind: 'nailStand',
    categoryId: 'nails',
    length: n.width,
    depth: n.depth,
    height: n.height,
    levels: tiers,
    productZ: n.depth - 0.05,
    // each tier steps back towards the top
    levelZ: tiers.map((_, i) => round(n.depth - 0.05 - i * ((n.depth - 0.1) / (n.tiers - 1)))),
    bays: [{ u0: 0.04, u1: round(n.width - 0.04), levels: tiers.map((_, i) => i), style: 'steps' }],
    wall: null,
    stock: 'shelf',
    browsable: true,
    ...standTransform,
  })

  // Shop windows either side of the entrance, each with a display case facing the street.
  const door = { x0: round(SHOP.door.offset - SHOP.door.width / 2), x1: round(SHOP.door.offset + SHOP.door.width / 2), height: Math.min(SHOP.door.height, H - 0.4) }
  const windows: Opening[] = [
    { x0: round(-W / 2 + 0.16), x1: round(door.x0 - 0.14), y0: SHOP.windowSill, y1: Math.min(SHOP.windowTop, H - 0.4) },
    { x0: round(door.x1 + 0.14), x1: round(W / 2 - 0.16), y0: SHOP.windowSill, y1: Math.min(SHOP.windowTop, H - 0.4) },
  ]
  const v = SHOP.vitrine
  windows.forEach((w, i) => {
    const length = round(w.x1 - w.x0 - 0.04)
    const levels = v.levels.filter((y) => y < Math.min(v.height, w.y1) - 0.2)
    fixtures.push({
      id: i === 0 ? 'vitrine-left' : 'vitrine-right',
      kind: 'vitrine',
      categoryId: i === 0 ? 'hair' : 'perfume',
      length,
      depth: v.depth,
      height: Math.min(v.height, w.y1 - 0.05),
      levels,
      productZ: v.depth - 0.11,
      bays: makeBays(length, levels, 'vitrine', length),
      wall: 'front',
      stock: { featured: i === 0 ? ['hair', 'body', 'skin'] : ['perfume', 'makeup', 'nails'] },
      browsable: false,
      ...wallTransform('front', w.x0 + 0.02 + W / 2, length, dims, v.depth + 0.04),
    })
  })

  // Colliders: one per fixture (same order), plus the counter's return towards the wall.
  const colliders: Aabb[] = fixtures.map((f) => footprint(f, f.id))
  const counter = fixtures.find((f) => f.id === 'counter')!
  const counterFront = counter.position[0] - counter.depth
  colliders.push({
    id: 'counter-return',
    min: [round(counter.position[0]), round(-(c.start + 0.5))],
    max: [round(W / 2 - sd - 0.05), round(-c.start)],
  })

  // The walking corridor between the left shelving / nail stand and the counter / right shelving.
  const stand = colliders[fixtures.findIndex((f) => f.id === 'stand-nails')]
  const aisle = [
    { x0: round(stand.max[0]), x1: round(W / 2 - sd), z0: -SHOP.sideStart, z1: round(stand.min[1]) },
    { x0: round(-W / 2 + sd), x1: round(counterFront), z0: round(stand.min[1]), z1: round(counter.position[2]) },
    { x0: round(-W / 2 + sd), x1: round(W / 2 - sd), z0: round(counter.position[2]), z1: round(-D + sd) },
  ]
  const aisleAt = (z: number) => aisle.find((a) => z <= a.z0 + 1e-6 && z >= a.z1 - 1e-6) ?? aisle[aisle.length - 1]

  const viewpoints: Record<string, Viewpoint> = {
    entrance: { id: 'entrance', position: [round(SHOP.door.offset - 0.15), EYE_HEIGHT, -0.4], yaw: -0.12, pitch: -0.1 },
  }
  for (const f of fixtures) {
    if (!f.browsable) continue
    let position: [number, number, number]
    let pitch: number
    if (f.kind === 'counter' || f.kind === 'nailStand') {
      const d = f.kind === 'counter' ? 1.0 : 0.85
      const targetY = f.kind === 'counter' ? 0.8 : 1.05
      position = localToWorld(f, f.length / 2, EYE_HEIGHT, f.depth + d)
      pitch = Math.atan2(targetY - EYE_HEIGHT, d)
    } else if (f.wall === 'back') {
      const d = Math.min(1.7, D - 2.6)
      position = localToWorld(f, f.length / 2, EYE_HEIGHT, f.depth + d)
      pitch = Math.atan2(1.45 - EYE_HEIGHT, d)
    } else {
      // side walls: stand in the corridor, as far back from the shelf as it allows
      // look at the longest stretch of the section not hidden by a freestanding unit (the nail stand)
      const z0 = localToWorld(f, 0, 0, 0)[2]
      const z1 = localToWorld(f, f.length, 0, 0)[2]
      let spans: [number, number][] = [[Math.min(z0, z1), Math.max(z0, z1)]]
      for (const o of fixtures) {
        if (o.wall !== null || o.kind === 'counter') continue
        const c = footprint(o, o.id)
        const near = f.wall === 'left' ? c.min[0] < -W / 2 + f.depth + 0.9 : c.max[0] > W / 2 - f.depth - 0.9
        if (!near) continue
        spans = spans.flatMap(([a, b]): [number, number][] => [
          [a, Math.min(b, c.min[1])],
          [Math.max(a, c.max[1]), b],
        ]).filter(([a, b]) => b - a > 0.05)
      }
      const best = spans.sort((p, q) => q[1] - q[0] - (p[1] - p[0]))[0] ?? [Math.min(z0, z1), Math.max(z0, z1)]
      const mid: [number, number, number] = [localToWorld(f, 0, 0, 0)[0], 0, (best[0] + best[1]) / 2]
      const a = aisleAt(mid[2])
      const face = f.wall === 'left' ? -W / 2 + f.depth : W / 2 - f.depth
      const wanted = f.wall === 'left' ? face + VIEW_DISTANCE : face - VIEW_DISTANCE - 0.15
      const x = Math.min(a.x1 - 0.3, Math.max(a.x0 + 0.3, wanted))
      position = [round(x), EYE_HEIGHT, round(mid[2])]
      const d = Math.abs(x - mid[0]) - f.depth
      pitch = Math.atan2(1.3 - EYE_HEIGHT, Math.max(0.6, d))
    }
    // where along the fixture the camera stands, and how far it may slide either way
    const dx = position[0] - f.position[0]
    const dz = position[2] - f.position[2]
    const u = f.kind === 'nailStand' ? f.length / 2 : Math.min(f.length, Math.max(0, dx * Math.cos(f.rotationY) - dz * Math.sin(f.rotationY)))
    const margin = f.kind === 'nailStand' ? f.length / 2 : 0.3
    viewpoints[f.id] = {
      id: f.id,
      position: [round(position[0]), position[1], round(position[2])],
      yaw: yawFacing(f),
      pitch,
      pan: { axis: fixtureAxis(f), min: round(Math.min(0, margin - u)), max: round(Math.max(0, f.length - margin - u)) },
      u: round(u),
    }
  }

  return {
    dims,
    fixtures,
    door,
    windows,
    aisle,
    colliders,
    viewpoints,
    outside: { id: 'outside', position: [0, 1.75, 7.2], yaw: 0, pitch: 0.02 },
    eyeHeight: EYE_HEIGHT,
  }
}

/** Readable problems when a layout is impossible (fixtures overlapping, outside the room, no aisle). */
export function validateLayout(layout: StoreLayout): string[] {
  const problems: string[] = []
  const { width, depth } = layout.dims
  if (width < 2.8) problems.push(`The shop must be at least 2.8 m wide (got ${width} m).`)
  if (depth < 4.5) problems.push(`The shop must be at least 4.5 m deep (got ${depth} m).`)
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
  for (const a of layout.aisle) {
    if (a.x1 - a.x0 < 0.75) problems.push(`The aisle is only ${Math.round((a.x1 - a.x0) * 100)} cm wide between z ${a.z0} and ${a.z1}.`)
  }
  return problems
}
