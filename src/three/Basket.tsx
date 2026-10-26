import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { assetUrl } from '@/lib/assets'
import { useCart } from '@/state/cart'
import { useCatalog } from '@/state/catalog'
import { useUi } from '@/state/ui'
import { findFacing } from './registry'
import { rig } from './rig'

const loader = new THREE.TextureLoader()
const textures = new Map<string, THREE.Texture>()
function texture(url: string) {
  if (!textures.has(url)) {
    const t = loader.load(url)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    textures.set(url, t)
  }
  return textures.get(url)!
}

function weaveTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  g.fillStyle = '#d99aa6'
  g.fillRect(0, 0, 128, 128)
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      g.fillStyle = (i + j) % 2 ? '#ecc2c9' : '#d79aa6'
      g.fillRect(i * 16 + 1, j * 16 + 1, 14, 14)
      g.fillStyle = 'rgba(255,255,255,0.25)'
      g.fillRect(i * 16 + 2, j * 16 + 2, (i + j) % 2 ? 12 : 3, (i + j) % 2 ? 3 : 12)
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(22, 2.5)
  return t
}

interface Flight {
  key: string
  url: string
  from: THREE.Vector3
  size: [number, number]
  t: number
}

const SLOTS: [number, number][] = [
  [-0.05, 0.02],
  [0.0, -0.02],
  [0.05, 0.015],
  [-0.025, -0.045],
  [0.03, -0.05],
  [-0.07, -0.03],
  [0.07, -0.025],
  [0.0, 0.045],
  [-0.045, 0.06],
]

/**
 * The shopping basket carried at the bottom right of the view. It fills with mini packshots of
 * what is in the cart; each add-to-basket sends a copy of the product flying in along an arc.
 */
export function Basket() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const group = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const flightMesh = useRef<THREE.Mesh>(null)
  const phase = useUi((s) => s.phase)
  const panel = useUi((s) => s.panel)
  const selected = useUi((s) => s.selected)
  const lines = useCart((s) => s.lines)
  const productById = useCatalog((s) => s.productById)
  const [flight, setFlight] = useState<Flight | null>(null)
  const wobble = useRef(10)
  const show = useRef(0)

  const items = useMemo(
    () =>
      lines
        .map((l) => {
          const p = productById.get(l.productId)
          if (!p) return null
          const v = l.variantId ? p.variants.find((x) => x.id === l.variantId) : null
          const scale = 0.075 / Math.max(p.heightCm, p.widthCm * 0.8) // fit in ~7.5 cm
          return {
            key: `${l.productId}:${l.variantId ?? ''}`,
            url: assetUrl(v?.image || p.image),
            w: p.widthCm * scale,
            h: p.heightCm * scale,
          }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .slice(-SLOTS.length),
    [lines, productById],
  )

  const basketGeo = useMemo(() => {
    const pts = [
      [0.0, 0],
      [0.085, 0],
      [0.1, 0.03],
      [0.118, 0.085],
      [0.12, 0.095],
    ].map(([x, y]) => new THREE.Vector2(x, y))
    const g = new THREE.LatheGeometry(pts, 40)
    g.scale(1, 1, 0.72)
    return g
  }, [])
  const weave = useMemo(() => weaveTexture(), [])

  // launch a flight on every add-to-basket
  useEffect(() => {
    return useUi.subscribe((s, prev) => {
      if (s.addedTick === prev.addedTick || !s.lastAdded) return
      const { productId, variantId } = s.lastAdded
      const p = useCatalog.getState().productById.get(productId)
      if (!p) return
      const v = variantId ? p.variants.find((x) => x.id === variantId) : null
      const facing = findFacing(productId, variantId)
      const from = facing
        ? facing.position.clone().add(new THREE.Vector3(0, facing.height / 2, 0))
        : camera.localToWorld(new THREE.Vector3(0, 0, -0.9))
      setFlight({
        key: `${productId}:${variantId ?? ''}`,
        url: assetUrl(v?.image || p.image),
        from,
        size: [p.widthCm / 100, p.heightCm / 100],
        t: 0,
      })
    })
  }, [camera])

  const tmp = useMemo(() => ({ v: new THREE.Vector3(), q: new THREE.Quaternion(), e: new THREE.Euler() }), [])

  useFrame((_, delta) => {
    const g = group.current
    if (!g) return
    const visible = phase === 'inside' && rig.mode !== 'cinematic' && !(rig.portrait && (selected || panel || rig.mode === 'walk'))
    show.current = THREE.MathUtils.damp(show.current, visible ? 1 : 0, 6, delta)
    g.visible = show.current > 0.01

    // place in the lower right of the view, sized relative to the screen (portrait or landscape)
    const d = 0.55
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * d
    const halfW = halfH * camera.aspect
    const diameter = Math.min(0.26 * 2 * halfW, 0.2 * 2 * halfH)
    const scale = diameter / 0.24
    tmp.v.set(halfW - diameter * 0.62, -halfH + diameter * 0.18 - (1 - show.current) * 0.2, -d)
    g.position.copy(camera.localToWorld(tmp.v))
    g.quaternion.copy(camera.quaternion)
    tmp.e.set(0.62, -0.3, 0)
    g.quaternion.multiply(tmp.q.setFromEuler(tmp.e))
    g.scale.setScalar(scale)

    wobble.current += delta
    if (body.current) {
      const w = wobble.current
      body.current.rotation.z = Math.exp(-w * 5) * Math.sin(w * 22) * 0.18
      body.current.position.y = Math.exp(-w * 6) * Math.sin(w * 16) * 0.012
    }

    if (flight && flightMesh.current) {
      flight.t = Math.min(1, flight.t + delta / 0.7)
      const t = flight.t
      const end = g.localToWorld(tmp.v.set(0, 0.07, 0))
      const control = flight.from.clone().lerp(end, 0.5).add(new THREE.Vector3(0, 0.3, 0))
      const a = flight.from.clone().lerp(control, t)
      const b = control.clone().lerp(end, t)
      flightMesh.current.position.copy(a.lerp(b, t))
      flightMesh.current.quaternion.copy(camera.quaternion)
      const k = 1 - 0.75 * t * t
      flightMesh.current.scale.set(flight.size[0] * k, flight.size[1] * k, 1)
      if (t >= 1) {
        wobble.current = 0
        setFlight(null)
      }
    }
  })

  return (
    <>
      <group ref={group}>
        <group ref={body}>
          <mesh geometry={basketGeo}>
            <meshStandardMaterial map={weave} side={THREE.DoubleSide} roughness={0.7} />
          </mesh>
          <mesh position-y={0.095} rotation-x={Math.PI / 2} scale={[1, 0.72, 1]}>
            <torusGeometry args={[0.12, 0.007, 10, 48]} />
            <meshStandardMaterial color="#c9a46a" metalness={1} roughness={0.3} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.12, 0.1, 0]} rotation-y={Math.PI / 2}>
              <torusGeometry args={[0.03, 0.005, 8, 20, Math.PI]} />
              <meshStandardMaterial color="#c9a46a" metalness={1} roughness={0.3} />
            </mesh>
          ))}
          {items.map((it, i) =>
            flight && flight.key === it.key ? null : (
              <mesh key={it.key} position={[SLOTS[i][0], 0.055 + it.h / 2, SLOTS[i][1]]} rotation-y={(i % 3) * 0.2 - 0.2}>
                <planeGeometry args={[it.w, it.h]} />
                <meshBasicMaterial map={texture(it.url)} alphaTest={0.5} side={THREE.DoubleSide} />
              </mesh>
            ),
          )}
        </group>
      </group>
      {flight && (
        <mesh ref={flightMesh} position={flight.from}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={texture(flight.url)} alphaTest={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
    </>
  )
}
