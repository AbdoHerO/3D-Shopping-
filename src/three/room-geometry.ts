import * as THREE from 'three'
import { SHOP, type StoreLayout } from '@/lib/layout'

export const FRONT_WALL = 0.2

/** Openings in the front wall, shared by the interior face, the facade and the glazing. */
export function frontOpenings(layout: StoreLayout) {
  const { door, windows } = layout
  return [{ x0: door.x0, x1: door.x1, y0: 0, y1: door.height }, ...windows]
}

export function wallWithHoles(x0: number, x1: number, y0: number, y1: number, holes: { x0: number; x1: number; y0: number; y1: number }[]) {
  const shape = new THREE.Shape()
  shape.moveTo(x0, y0)
  shape.lineTo(x1, y0)
  shape.lineTo(x1, y1)
  shape.lineTo(x0, y1)
  shape.lineTo(x0, y0)
  for (const h of holes) {
    const p = new THREE.Path()
    p.moveTo(h.x0, h.y0)
    p.lineTo(h.x0, h.y1)
    p.lineTo(h.x1, h.y1)
    p.lineTo(h.x1, h.y0)
    p.lineTo(h.x0, h.y0)
    shape.holes.push(p)
  }
  return shape
}


/** Ceiling downlight positions: two rows along the shop, one fitting every other ceiling panel. */
export function downlightSpots(layout: StoreLayout) {
  const { width: W, depth: D } = layout.dims
  const P = SHOP.ceilingPanel
  const cols = W > 3.2 ? [-W / 4, W / 4] : [-W / 5, W / 5]
  const out: [number, number][] = []
  for (let z = -0.75; z > -D + 0.5; z -= 2 * P) for (const x of cols) out.push([x, z])
  return out
}
