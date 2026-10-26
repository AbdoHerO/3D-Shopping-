import { Suspense, useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, Lightformer, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { assetUrl } from '@/lib/assets'
import type { Product } from '@/lib/types'
import { buildPackageGeometry, DETAIL, modelSpec, packageMaterial } from '@/three/packageGeometry'

/** The product's 3D model exactly as the shelves draw it, turning slowly, for the admin. */
function Model({ product, texture }: { product: Product; texture: THREE.Texture }) {
  const mesh = useMemo(() => {
    const spec = modelSpec(product)
    const w = product.widthCm / 100
    const h = product.heightCm / 100
    const d = spec.card ? Math.min(0.015, product.depthCm / 100) : Math.max(0.006, product.depthCm / 100)
    const geometry = buildPackageGeometry(spec.family, spec.profile, w, h, d, DETAIL.high)
    geometry.setAttribute('aUv', new THREE.InstancedBufferAttribute(new Float32Array([0, 0, 1, 1]), 4))
    geometry.setAttribute('aState', new THREE.InstancedBufferAttribute(new Float32Array([0, 1]), 2))
    const c = new THREE.Color(product.asset?.color ?? '#e9e4df')
    geometry.setAttribute('aBase', new THREE.InstancedBufferAttribute(new Float32Array([c.r, c.g, c.b]), 3))
    const { material } = packageMaterial(texture, spec.family)
    const m = new THREE.InstancedMesh(geometry, material, 1)
    // centre the product and scale it to a constant on-screen size
    const k = 0.32 / Math.max(w, h)
    m.setMatrixAt(0, new THREE.Matrix4().compose(new THREE.Vector3(0, -(h * k) / 2, 0), new THREE.Quaternion(), new THREE.Vector3(k, k, k)))
    return m
  }, [product, texture])
  useEffect(() => () => (mesh.geometry.dispose(), (mesh.material as THREE.Material).dispose()), [mesh])
  return <primitive object={mesh} />
}

export default function ModelPreview({ product }: { product: Product }) {
  const url = assetUrl(product.asset?.cutout || product.image)
  const [texture, setTexture] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    if (!url) return
    let alive = true
    new THREE.TextureLoader().load(url, (t) => {
      t.colorSpace = THREE.SRGBColorSpace
      // the package shader expects premultiplied colours, like the shelf atlas
      t.premultiplyAlpha = true
      t.needsUpdate = true
      if (alive) setTexture(t)
      else t.dispose()
    })
    return () => {
      alive = false
    }
  }, [url])
  useEffect(() => () => texture?.dispose(), [texture])
  if (!url) return null
  return (
    <div className="h-56 w-full overflow-hidden rounded-2xl bg-gradient-to-b from-[#f4f3f1] to-[#e7e5e2]" data-testid="model-preview">
      <Canvas camera={{ position: [0, 0.05, 0.62], fov: 40 }} dpr={[1, 1.5]} gl={{ antialias: true }}>
        <Suspense fallback={null}>
          <Environment resolution={64} frames={1}>
            <Lightformer form="rect" intensity={2.4} position={[0, 2, 2]} scale={[3, 3, 1]} />
            <Lightformer form="rect" intensity={1} position={[-2, 0.5, -1]} rotation-y={Math.PI / 2} scale={[2, 2, 1]} />
          </Environment>
          <ambientLight intensity={0.5} />
          <directionalLight position={[1, 2, 2]} intensity={1.2} />
          {texture && <Model product={product} texture={texture} />}
        </Suspense>
        <OrbitControls autoRotate autoRotateSpeed={1.6} enablePan={false} enableZoom={false} />
      </Canvas>
    </div>
  )
}
