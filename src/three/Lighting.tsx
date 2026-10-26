import { Environment, Lightformer } from '@react-three/drei'
import type { StoreDims } from '@/lib/types'

/**
 * Neutral-white shop lighting, as in the photographs: a bright white ceiling with round downlights,
 * baked once into an environment map from soft "light cards", plus a few cheap direct lights. No
 * real-time shadows and no coloured tint, so packaging colours and labels stay true.
 */
export function Lighting({ dims }: { dims: StoreDims }) {
  const { width: W, depth: D, ceiling: H } = dims
  return (
    <>
      <Environment resolution={256} frames={1} environmentIntensity={0.8}>
        <color attach="background" args={['#8a8a8c']} />
        {/* the lit ceiling */}
        {[-0.18, -0.42, -0.66, -0.9].map((t, i) => (
          <Lightformer key={i} form="rect" intensity={2.2} color="#fffaf3" position={[0, H + 0.3, D * t]} rotation-x={Math.PI / 2} scale={[W * 0.9, D * 0.16, 1]} />
        ))}
        {/* daylight from the street */}
        <Lightformer form="rect" intensity={1.4} color="#f4f6fa" position={[0, 1.4, 2]} rotation-y={Math.PI} scale={[W * 1.4, 2.2, 1]} />
        {/* white walls of shelving bounce light sideways */}
        <Lightformer form="rect" intensity={0.7} color="#ffffff" position={[-W, 1.4, -D / 2]} rotation-y={Math.PI / 2} scale={[D, 1.6, 1]} />
        <Lightformer form="rect" intensity={0.7} color="#ffffff" position={[W, 1.4, -D / 2]} rotation-y={-Math.PI / 2} scale={[D, 1.6, 1]} />
        <Lightformer form="rect" intensity={0.3} color="#cfcfd2" position={[0, -1, -D / 2]} rotation-x={-Math.PI / 2} scale={[W * 2, D * 2, 1]} />
      </Environment>
      <hemisphereLight args={['#ffffff', '#c9c7c4', 0.6]} />
      <directionalLight position={[1.8, 5, 4]} intensity={0.9} color="#fffaf2" />
      <pointLight position={[0, H - 0.2, -D * 0.25]} intensity={4.5} distance={5.5} decay={2} color="#fff6ec" />
      <pointLight position={[0, H - 0.2, -D * 0.7]} intensity={4.5} distance={5.5} decay={2} color="#fff6ec" />
    </>
  )
}
