import { Bloom, EffectComposer, N8AO, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'

export type Tier = 'low' | 'medium' | 'high'

/**
 * Post-processing per device tier. High: ambient occlusion + bloom. Medium: bloom only.
 * Low: none (the renderer tone-maps directly). The composer turns renderer tone mapping off, so
 * the same Neutral curve is re-applied as the last effect.
 */
export function Effects({ tier }: { tier: Tier }) {
  if (tier === 'high') {
    return (
      <EffectComposer multisampling={4}>
        <N8AO aoRadius={0.35} intensity={1.4} distanceFalloff={0.8} quality="medium" halfRes />
        <Bloom mipmapBlur luminanceThreshold={0.96} luminanceSmoothing={0.15} intensity={0.35} radius={0.5} />
        <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      </EffectComposer>
    )
  }
  if (tier === 'medium') {
    return (
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur luminanceThreshold={0.96} luminanceSmoothing={0.15} intensity={0.3} radius={0.5} />
        <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      </EffectComposer>
    )
  }
  return null
}
