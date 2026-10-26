import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

const tmp = new THREE.Matrix4()
const q = new THREE.Quaternion()
const e = new THREE.Euler()
const s = new THREE.Vector3(1, 1, 1)
const p = new THREE.Vector3()

/**
 * Collects primitive geometries per material key and merges them, so a whole fixture (dozens of
 * panels, shelves, trims) renders in one draw call per material.
 */
export class GeoBuilder<K extends string = string> {
  private parts = new Map<K, THREE.BufferGeometry[]>()

  add(key: K, geometry: THREE.BufferGeometry, position: [number, number, number] = [0, 0, 0], rotation: [number, number, number] = [0, 0, 0]) {
    e.set(rotation[0], rotation[1], rotation[2])
    q.setFromEuler(e)
    p.set(position[0], position[1], position[2])
    tmp.compose(p, q, s)
    const g = geometry.index ? geometry.toNonIndexed() : geometry
    g.applyMatrix4(tmp)
    g.clearGroups()
    for (const name of Object.keys(g.attributes)) {
      if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name)
    }
    if (!g.attributes.uv) {
      g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((g.attributes.position.count * 2) | 0), 2))
    }
    if (!this.parts.has(key)) this.parts.set(key, [])
    this.parts.get(key)!.push(g)
    return this
  }

  /** Axis-aligned box given by its min corner and size (local fixture coordinates). */
  boxAt(key: K, x: number, y: number, z: number, w: number, h: number, d: number) {
    return this.add(key, new THREE.BoxGeometry(w, h, d), [x + w / 2, y + h / 2, z + d / 2])
  }

  cylinder(key: K, x: number, y: number, z: number, r: number, h: number, segments = 16, rTop = r) {
    return this.add(key, new THREE.CylinderGeometry(rTop, r, h, segments), [x, y + h / 2, z])
  }

  build(): Partial<Record<K, THREE.BufferGeometry>> {
    const out: Partial<Record<K, THREE.BufferGeometry>> = {}
    for (const [key, list] of this.parts) {
      const merged = mergeGeometries(list, false)
      if (merged) {
        merged.computeBoundingSphere()
        out[key] = merged
      }
      list.forEach((g) => g.dispose())
    }
    return out
  }
}

/** Rectangle with a semicircular top, as a THREE.Shape (perfume niches, mirror). */
export function archShape(x: number, y: number, w: number, h: number) {
  const r = w / 2
  const shape = new THREE.Shape()
  shape.moveTo(x, y)
  shape.lineTo(x + w, y)
  shape.lineTo(x + w, y + h - r)
  shape.absarc(x + r, y + h - r, r, 0, Math.PI, false)
  shape.lineTo(x, y)
  return shape
}

export function archPath(x: number, y: number, w: number, h: number) {
  const r = w / 2
  const path = new THREE.Path()
  path.moveTo(x, y)
  path.lineTo(x + w, y)
  path.lineTo(x + w, y + h - r)
  path.absarc(x + r, y + h - r, r, 0, Math.PI, false)
  path.lineTo(x, y)
  return path
}

export function roundedRectShape(x: number, y: number, w: number, h: number, r: number) {
  const shape = new THREE.Shape()
  shape.moveTo(x + r, y)
  shape.lineTo(x + w - r, y)
  shape.quadraticCurveTo(x + w, y, x + w, y + r)
  shape.lineTo(x + w, y + h - r)
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  shape.lineTo(x + r, y + h)
  shape.quadraticCurveTo(x, y + h, x, y + h - r)
  shape.lineTo(x, y + r)
  shape.quadraticCurveTo(x, y, x + r, y)
  return shape
}
