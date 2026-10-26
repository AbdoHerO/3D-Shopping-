import { Environment, Lightformer } from '@react-three/drei'
import type { StoreDims } from '@/lib/types'

/**
 * Image-based lighting from soft "light cards" (ceiling panels, a window wall, warm side strips)
 * baked once into an environment map, plus a few cheap direct lights. No real-time shadows.
 */
export function Lighting({ dims }: { dims: StoreDims }) {
  const { width: W, depth: D, ceiling: H } = dims
  return (
    <>
      <Environment resolution={256} frames={1} environmentIntensity={0.85}>
        <color attach="background" args={['#7d6a68']} />
        {/* ceiling panels */}
        {[-0.22, -0.5, -0.78].map((t, i) => (
          <Lightformer key={i} form="rect" intensity={2.4} color="#fff3e8" position={[0, H + 0.4, D * t]} rotation-x={Math.PI / 2} scale={[W * 0.75, D * 0.18, 1]} />
        ))}
        {/* daylight through the shop windows */}
        <Lightformer form="rect" intensity={1.8} color="#fff1e2" position={[0, 1.4, 2]} rotation-y={Math.PI} scale={[W * 1.4, 2.2, 1]} />
        {/* warm side strips for highlights on gold and glass */}
        <Lightformer form="rect" intensity={0.9} color="#ffd9c2" position={[-W, 1.6, -D / 2]} rotation-y={Math.PI / 2} scale={[D, 0.5, 1]} />
        <Lightformer form="rect" intensity={0.9} color="#ffd9c2" position={[W, 1.6, -D / 2]} rotation-y={-Math.PI / 2} scale={[D, 0.5, 1]} />
        <Lightformer form="ring" intensity={1.2} color="#ffe7d6" position={[0, 2, -D - 1]} scale={2} />
        {/* soft ground bounce */}
        <Lightformer form="rect" intensity={0.35} color="#f2c9c4" position={[0, -1, -D / 2]} rotation-x={-Math.PI / 2} scale={[W * 2, D * 2, 1]} />
      </Environment>
      <hemisphereLight args={['#fff4ee', '#d9b6b0', 0.55]} />
      <directionalLight position={[1.8, 5, 4]} intensity={1.1} color="#fff0e2" />
      <pointLight position={[0, H - 0.3, -D * 0.28]} intensity={5} distance={5.5} decay={2} color="#ffe3c8" />
      <pointLight position={[0, H - 0.3, -D * 0.72]} intensity={5} distance={5.5} decay={2} color="#ffe3c8" />
    </>
  )
}
