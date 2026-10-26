/**
 * Builds a product's 3D package from its family and silhouette: rings of superellipse
 * cross-sections swept up the product's height (round bottles, flat perfumes, boxes all come out
 * of the same code), closed by flat caps. UVs are a straight front projection (u = x / width,
 * v = y / height), so the product photo lands exactly where the outline it was measured from is.
 */
import * as THREE from 'three'
import { FAMILIES, normaliseFamily, profileFor, resampleProfile, ringShape, superellipse, type PackageFamily } from '@/lib/packaging'
import type { Product } from '@/lib/types'

export interface PackageDetail {
  rings: number
  segments: number
}

export const DETAIL: Record<'low' | 'medium' | 'high', PackageDetail> = {
  low: { rings: 10, segments: 8 },
  medium: { rings: 16, segments: 12 },
  high: { rings: 22, segments: 16 },
}

/** Geometry in metres: x ∈ [-w/2, w/2], y ∈ [0, h], z ∈ [-d/2, d/2], front facing +z. */
export function buildPackageGeometry(
  family: PackageFamily,
  measured: number[] | null | undefined,
  w: number,
  h: number,
  d: number,
  detail: PackageDetail = DETAIL.medium,
) {
  const spec = FAMILIES[family]
  const boxy = spec.section >= 12
  // boxes need no more than two rings; everything else follows its profile
  const rings = boxy ? 2 : detail.rings
  const segs = boxy ? 4 * Math.max(3, Math.round(detail.segments / 4)) : detail.segments
  const profile = resampleProfile(profileFor(family, measured), rings)

  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const ring = (rel: number) => ringShape(spec, rel, w, d)

  // side wall
  for (let i = 0; i < rings; i++) {
    const y = (i / (rings - 1)) * h
    const { a, b, n } = ring(profile[i])
    for (let j = 0; j <= segs; j++) {
      const t = -Math.PI / 2 + (j / segs) * Math.PI * 2 + (boxy ? Math.PI / segs : 0)
      const [x, z] = superellipse(t, a, b, n)
      positions.push(x, y, z)
      uvs.push(x / w + 0.5, y / h)
    }
  }
  const row = segs + 1
  for (let i = 0; i < rings - 1; i++) {
    for (let j = 0; j < segs; j++) {
      const p = i * row + j
      indices.push(p, p + 1, p + row, p + 1, p + row + 1, p + row)
    }
  }
  const side = new THREE.BufferGeometry()
  side.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  side.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  side.setIndex(indices)
  side.computeVertexNormals()

  // flat caps (separate vertices so their normals stay vertical)
  const cap = (top: boolean) => {
    const i = top ? rings - 1 : 0
    const y = top ? h : 0
    const { a, b, n } = ring(profile[i])
    const pos: number[] = [0, y, 0]
    const uv: number[] = [0.5, y / h]
    const idx: number[] = []
    for (let j = 0; j <= segs; j++) {
      const t = -Math.PI / 2 + (j / segs) * Math.PI * 2 + (boxy ? Math.PI / segs : 0)
      const [x, z] = superellipse(t, a, b, n)
      pos.push(x, y, z)
      uv.push(x / w + 0.5, y / h)
      if (j > 0) {
        if (top) idx.push(0, j, j + 1)
        else idx.push(0, j + 1, j)
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    g.setIndex(idx)
    g.computeVertexNormals()
    return g
  }

  const parts = [side, cap(true), cap(false)].map((g) => g.toNonIndexed())
  const count = parts.reduce((s, g) => s + g.attributes.position.count, 0)
  const pos = new Float32Array(count * 3)
  const nor = new Float32Array(count * 3)
  const uv = new Float32Array(count * 2)
  let o = 0
  for (const g of parts) {
    pos.set(g.attributes.position.array as Float32Array, o * 3)
    nor.set(g.attributes.normal.array as Float32Array, o * 3)
    uv.set(g.attributes.uv.array as Float32Array, o * 2)
    o += g.attributes.position.count
    g.dispose()
  }
  side.dispose()
  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3))
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  out.computeBoundingBox()
  out.computeBoundingSphere()
  return out
}

/** Surface finish per family: glossy glass, satin cartons, metallic lipstick cases. */
export function finishParams(family: PackageFamily) {
  switch (FAMILIES[family].finish) {
    case 'glass':
      return { roughness: 0.1, metalness: 0.05 }
    case 'gloss':
      return { roughness: 0.25, metalness: 0 }
    case 'metal':
      return { roughness: 0.3, metalness: 0.55 }
    case 'satin':
      return { roughness: 0.48, metalness: 0 }
    default:
      return { roughness: 0.75, metalness: 0 }
  }
}

/**
 * Lit package material: the atlas photo on the front (where its cut-out is opaque), the packaging
 * colour everywhere else. Per instance: aUv = atlas rect, aState = (highlight, shade), aBase = colour.
 */
export function packageMaterial(map: THREE.Texture, family: PackageFamily) {
  const mat = new THREE.MeshStandardMaterial({ map, ...finishParams(family), envMapIntensity: 0.9 })
  const uniforms = { uTime: { value: 0 } }
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute vec4 aUv;
        attribute vec2 aState;
        attribute vec3 aBase;
        varying vec2 vState;
        varying vec3 vBase;
        varying float vFront;`,
      )
      .replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>
        vMapUv = clamp(uv, 0.0, 1.0) * aUv.zw + aUv.xy;
        vState = aState;
        vBase = aBase;`,
      )
      .replace(
        '#include <beginnormal_vertex>',
        `#include <beginnormal_vertex>
        vFront = objectNormal.z;`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uTime;
        varying vec2 vState;
        varying vec3 vBase;
        varying float vFront;`,
      )
      .replace(
        '#include <map_fragment>',
        `vec4 photo = texture2D(map, vMapUv);
        vec3 photoRgb = photo.rgb / max(photo.a, 0.0001);
        float onFront = smoothstep(0.08, 0.45, vFront) * smoothstep(0.3, 0.7, photo.a);
        diffuseColor.rgb = mix(vBase, photoRgb, onFront) * vState.y;
        float pulse = vState.x * (0.14 + 0.07 * sin(uTime * 4.0));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.95, 0.88), pulse);`,
      )
  }
  mat.customProgramCacheKey = () => 'package-v1'
  return { material: mat, uniforms }
}

/** How a product is modelled: its family (a card when there is no cut-out yet) and its silhouette. */
export function modelSpec(p: Product): { family: PackageFamily; profile: number[] | null; card: boolean } {
  const family = normaliseFamily(p.shape)
  // no asset record (older catalogues): the image is taken as a cut-out, the family's template is used
  if (!p.asset) return { family, profile: null, card: false }
  const card = !p.asset.cutout
  return { family: card ? 'card' : family, profile: card ? null : p.asset.profile, card }
}
