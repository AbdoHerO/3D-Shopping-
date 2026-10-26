import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { StoreLayout } from '@/lib/layout'
import { assetUrl } from '@/lib/assets'
import type { Product } from '@/lib/types'
import { useUi } from '@/state/ui'
import { buildAtlas, productCardMaterial, type Atlas, type AtlasEntry } from './atlas'
import { radialTexture } from './textures'
import { productRegistry } from './registry'
import { computeFacings, imageKey, type WorldFacing } from './facings'

function atlasEntries(products: Product[], facings: WorldFacing[]): AtlasEntry[] {
  const byId = new Map(products.map((p) => [p.id, p]))
  const seen = new Map<string, AtlasEntry>()
  for (const f of facings) {
    const p = byId.get(f.productId)
    if (!p) continue
    const key = imageKey(f.productId, f.variantId)
    if (seen.has(key)) continue
    const v = f.variantId ? p.variants.find((x) => x.id === f.variantId) : null
    seen.set(key, { key, url: assetUrl(v?.image || p.image), widthCm: p.widthCm, heightCm: p.heightCm })
  }
  return [...seen.values()]
}

interface PageMesh {
  mesh: THREE.InstancedMesh
  facings: WorldFacing[]
  state: THREE.InstancedBufferAttribute
  uniforms: { uTime: { value: number } }
}

export function Products({
  layout,
  products,
  onPick,
  onReady,
}: {
  layout: StoreLayout
  products: Product[]
  onPick: (facing: WorldFacing) => void
  onReady?: () => void
}) {
  const facings = useMemo(() => computeFacings(layout, products), [layout, products])
  const [atlas, setAtlas] = useState<Atlas | null>(null)

  useEffect(() => {
    let cancelled = false
    buildAtlas(atlasEntries(products, facings)).then((a) => {
      if (cancelled) a.pages.forEach((t) => t.dispose())
      else setAtlas(a)
    })
    return () => {
      cancelled = true
    }
  }, [products, facings])

  useEffect(() => {
    productRegistry.facings = facings
  }, [facings])

  const pages = useMemo<PageMesh[]>(() => {
    if (!atlas) return []
    const byPage = new Map<number, WorldFacing[]>()
    for (const f of facings) {
      const region = atlas.regions.get(imageKey(f.productId, f.variantId))
      if (!region) continue
      if (!byPage.has(region.page)) byPage.set(region.page, [])
      byPage.get(region.page)!.push(f)
    }
    const geometry = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0)
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const s = new THREE.Vector3()
    const up = new THREE.Vector3(0, 1, 0)
    return [...byPage.entries()].map(([page, list]) => {
      const { material, uniforms } = productCardMaterial(atlas.pages[page])
      const mesh = new THREE.InstancedMesh(geometry, material, list.length)
      const uv = new Float32Array(list.length * 4)
      const state = new Float32Array(list.length * 2)
      list.forEach((f, i) => {
        q.setFromAxisAngle(up, f.rotationY)
        s.set(f.width, f.height, 1)
        m.compose(f.position, q, s)
        mesh.setMatrixAt(i, m)
        const r = atlas.regions.get(imageKey(f.productId, f.variantId))!
        uv.set([r.offset[0], r.offset[1], r.scale[0], r.scale[1]], i * 4)
        // lower shelves sit in the shadow of the shelf above; back rows are darker still
        const shelfShade = 0.84 + 0.16 * Math.min(1, f.position.y / 1.6)
        state.set([0, shelfShade * (f.back ? 0.68 : 1)], i * 2)
      })
      const g = geometry.clone()
      g.setAttribute('aUv', new THREE.InstancedBufferAttribute(uv, 4))
      const stateAttr = new THREE.InstancedBufferAttribute(state, 2)
      stateAttr.setUsage(THREE.DynamicDrawUsage)
      g.setAttribute('aState', stateAttr)
      mesh.geometry = g
      mesh.instanceMatrix.needsUpdate = true
      mesh.computeBoundingSphere()
      mesh.frustumCulled = false
      return { mesh, facings: list, state: stateAttr, uniforms }
    })
  }, [atlas, facings])

  useEffect(() => {
    if (pages.length) onReady?.()
  }, [pages, onReady])

  useEffect(() => () => pages.forEach((p) => (p.mesh.geometry.dispose(), (p.mesh.material as THREE.Material).dispose())), [pages])
  useEffect(() => () => atlas?.pages.forEach((t) => t.dispose()), [atlas])

  // highlight hovered and selected products without re-rendering React
  useEffect(() => {
    const apply = () => {
      const { hovered, selected } = useUi.getState()
      for (const page of pages) {
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
  }, [pages])

  useFrame((state) => {
    for (const p of pages) p.uniforms.uTime.value = state.clock.elapsedTime
  })

  const blobs = useMemo(() => {
    const front = facings.filter((f) => !f.back)
    const tex = radialTexture('rgba(40,12,24,0.55)', 'rgba(40,12,24,0)', 'blob')
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false })
    const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)
    const mesh = new THREE.InstancedMesh(geo, mat, front.length)
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const up = new THREE.Vector3(0, 1, 0)
    front.forEach((f, i) => {
      q.setFromAxisAngle(up, f.rotationY)
      m.compose(f.position.clone().setY(f.position.y + 0.002), q, new THREE.Vector3(f.width * 1.35, 1, 0.07))
      mesh.setMatrixAt(i, m)
    })
    mesh.raycast = () => {}
    mesh.renderOrder = 1
    return mesh
  }, [facings])
  useEffect(() => () => (blobs.geometry.dispose(), (blobs.material as THREE.Material).dispose()), [blobs])

  const hoverRef = useRef<string | null>(null)
  const facingFor = (e: ThreeEvent<PointerEvent | MouseEvent>, page: PageMesh) =>
    e.instanceId != null ? page.facings[e.instanceId] : null

  return (
    <group>
      <primitive object={blobs} />
      {pages.map((page, i) => (
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
