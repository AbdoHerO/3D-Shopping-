import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { StoreLayout } from '@/lib/layout'
import { assetUrl } from '@/lib/assets'
import { FAMILIES, profileKey } from '@/lib/packaging'
import type { Product } from '@/lib/types'
import { useUi } from '@/state/ui'
import { buildAtlas, type Atlas, type AtlasEntry } from './atlas'
import { radialTexture } from './textures'
import { productRegistry } from './registry'
import { computeFacings, imageKey, type WorldFacing } from './facings'
import { buildPackageGeometry, DETAIL, modelSpec, packageMaterial, type PackageDetail } from './packageGeometry'

/** The picture drawn on a model: the prepared cut-out of the shade or product, else its image. */
function textureUrl(p: Product, variantId: string | null) {
  const v = variantId ? p.variants.find((x) => x.id === variantId) : null
  const prepared = variantId ? p.asset?.variants?.[variantId]?.cutout : p.asset?.cutout
  return assetUrl(prepared || v?.image || p.image)
}

function baseColor(p: Product, variantId: string | null) {
  const v = variantId ? p.variants.find((x) => x.id === variantId) : null
  return new THREE.Color(p.asset?.variants?.[variantId ?? '']?.color || v?.colorHex || p.asset?.color || '#e9e4df')
}

function atlasEntries(products: Map<string, Product>, facings: WorldFacing[]): AtlasEntry[] {
  const seen = new Map<string, AtlasEntry>()
  for (const f of facings) {
    const p = products.get(f.productId)
    if (!p) continue
    const key = imageKey(f.productId, f.variantId)
    if (seen.has(key)) continue
    seen.set(key, { key, url: textureUrl(p, f.variantId), widthCm: p.widthCm, heightCm: p.heightCm })
  }
  return [...seen.values()]
}

interface ModelMesh {
  mesh: THREE.InstancedMesh
  facings: WorldFacing[]
  state: THREE.InstancedBufferAttribute
  uniforms: { uTime: { value: number } }
}

const FLAT = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2)

export function Products({
  layout,
  products,
  onPick,
  onReady,
  detail = DETAIL.medium,
}: {
  layout: StoreLayout
  products: Product[]
  onPick: (facing: WorldFacing) => void
  onReady?: () => void
  detail?: PackageDetail
}) {
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])
  const facings = useMemo(() => computeFacings(layout, products), [layout, products])
  const [atlas, setAtlas] = useState<Atlas | null>(null)

  useEffect(() => {
    let cancelled = false
    buildAtlas(atlasEntries(byId, facings)).then((a) => {
      if (cancelled) a.pages.forEach((t) => t.dispose())
      else setAtlas(a)
    })
    return () => {
      cancelled = true
    }
  }, [byId, facings])

  useEffect(() => {
    productRegistry.facings = facings
  }, [facings])

  // one instanced mesh per product model and atlas page: every facing of a product is one draw
  const meshes = useMemo<ModelMesh[]>(() => {
    if (!atlas) return []
    const groups = new Map<string, { product: Product; page: number; list: WorldFacing[] }>()
    for (const f of facings) {
      const p = byId.get(f.productId)
      const region = atlas.regions.get(imageKey(f.productId, f.variantId))
      if (!p || !region) continue
      const k = `${p.id}|${region.page}`
      if (!groups.has(k)) groups.set(k, { product: p, page: region.page, list: [] })
      groups.get(k)!.list.push(f)
    }
    const geometries = new Map<string, THREE.BufferGeometry>()
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const s = new THREE.Vector3()
    const up = new THREE.Vector3(0, 1, 0)
    const built = [...groups.values()].map(({ product: p, page, list }) => {
      const spec = modelSpec(p)
      const w = p.widthCm / 100
      const h = p.heightCm / 100
      const d = spec.card ? Math.min(0.015, p.depthCm / 100) : Math.max(0.006, p.depthCm / 100)
      const gk = `${profileKey(spec.family, spec.profile ?? FAMILIES[spec.family].template, w, d)}|${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}|${detail.rings}`
      if (!geometries.has(gk)) geometries.set(gk, buildPackageGeometry(spec.family, spec.profile, w, h, d, detail))
      const geometry = geometries.get(gk)!.clone()
      const { material, uniforms } = packageMaterial(atlas.pages[page], spec.family)
      const mesh = new THREE.InstancedMesh(geometry, material, list.length)
      const uv = new Float32Array(list.length * 4)
      const state = new Float32Array(list.length * 2)
      const base = new Float32Array(list.length * 3)
      list.forEach((f, i) => {
        q.setFromAxisAngle(up, f.rotationY)
        if (f.orientation === 'flat') q.multiply(FLAT)
        // the facing may be scaled (display scale); a card keeps its thin depth
        s.set(f.width / w, f.height / h, spec.card ? 1 : f.depth / d)
        m.compose(f.position, q, s)
        mesh.setMatrixAt(i, m)
        const r = atlas.regions.get(imageKey(f.productId, f.variantId))!
        uv.set([r.offset[0], r.offset[1], r.scale[0], r.scale[1]], i * 4)
        // lower shelves sit in the shadow of the shelf above
        state.set([0, 0.86 + 0.14 * Math.min(1, f.position.y / 1.6)], i * 2)
        const c = baseColor(p, f.variantId)
        base.set([c.r, c.g, c.b], i * 3)
      })
      geometry.setAttribute('aUv', new THREE.InstancedBufferAttribute(uv, 4))
      const stateAttr = new THREE.InstancedBufferAttribute(state, 2)
      stateAttr.setUsage(THREE.DynamicDrawUsage)
      geometry.setAttribute('aState', stateAttr)
      geometry.setAttribute('aBase', new THREE.InstancedBufferAttribute(base, 3))
      mesh.instanceMatrix.needsUpdate = true
      mesh.computeBoundingSphere()
      return { mesh, facings: list, state: stateAttr, uniforms }
    })
    geometries.forEach((g) => g.dispose())
    return built
  }, [atlas, facings, byId, detail])

  useEffect(() => {
    if (meshes.length) onReady?.()
  }, [meshes, onReady])

  useEffect(() => () => meshes.forEach((p) => (p.mesh.geometry.dispose(), (p.mesh.material as THREE.Material).dispose())), [meshes])
  useEffect(() => () => atlas?.pages.forEach((t) => t.dispose()), [atlas])

  // highlight hovered and selected products without re-rendering React
  useEffect(() => {
    const apply = () => {
      const { hovered, selected } = useUi.getState()
      for (const page of meshes) {
        let dirty = false
        page.facings.forEach((f, i) => {
          const isSel =
            selected && f.productId === selected.productId && (!f.variantId || !selected.variantId || f.variantId === selected.variantId)
          const target = isSel ? 1 : hovered === f.productId ? 0.55 : 0
          if (page.state.getX(i) !== target) {
            page.state.setX(i, target)
            dirty = true
          }
        })
        if (dirty) page.state.needsUpdate = true
      }
    }
    apply()
    return useUi.subscribe((s, prev) => {
      if (s.hovered !== prev.hovered || s.selected !== prev.selected) apply()
    })
  }, [meshes])

  useFrame((state) => {
    for (const p of meshes) p.uniforms.uTime.value = state.clock.elapsedTime
  })

  // soft contact shadow under each standing front-row product
  const blobs = useMemo(() => {
    const front = facings.filter((f) => f.orientation === 'upright')
    const tex = radialTexture('rgba(20,20,24,0.5)', 'rgba(20,20,24,0)', 'blob-neutral')
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false })
    const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)
    const mesh = new THREE.InstancedMesh(geo, mat, front.length)
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const up = new THREE.Vector3(0, 1, 0)
    front.forEach((f, i) => {
      q.setFromAxisAngle(up, f.rotationY)
      m.compose(f.position.clone().setY(f.position.y + 0.002), q, new THREE.Vector3(f.width * 1.3, 1, Math.max(0.05, f.depth * 1.3)))
      mesh.setMatrixAt(i, m)
    })
    mesh.raycast = () => {}
    mesh.renderOrder = 1
    return mesh
  }, [facings])
  useEffect(() => () => (blobs.geometry.dispose(), (blobs.material as THREE.Material).dispose()), [blobs])

  const hoverRef = useRef<string | null>(null)
  const facingFor = (e: ThreeEvent<PointerEvent | MouseEvent>, page: ModelMesh) => (e.instanceId != null ? page.facings[e.instanceId] : null)

  return (
    <group>
      <primitive object={blobs} />
      {meshes.map((page, i) => (
        <primitive
          key={i}
          object={page.mesh}
          onPointerMove={(e: ThreeEvent<PointerEvent>) => {
            if (e.pointerType !== 'mouse') return
            e.stopPropagation()
            const f = facingFor(e, page)
            if (f && hoverRef.current !== f.productId) {
              hoverRef.current = f.productId
              useUi.getState().hover(f.productId)
              document.body.style.cursor = 'pointer'
            }
          }}
          onPointerOut={() => {
            hoverRef.current = null
            useUi.getState().hover(null)
            document.body.style.cursor = ''
          }}
          onClick={(e: ThreeEvent<MouseEvent>) => {
            if (e.delta > 8) return
            e.stopPropagation()
            const f = facingFor(e, page)
            if (f) onPick(f)
          }}
        />
      ))}
    </group>
  )
}
