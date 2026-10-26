import { useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { backlightTexture, flutedNormalTexture } from './textures'

const base = import.meta.env.BASE_URL + 'textures/'
const TEXTURES = {
  marbleDiff: base + 'marble_diff.webp',
  marbleRough: base + 'marble_rough.webp',
  marbleNor: base + 'marble_nor.webp',
  plasterNor: base + 'plaster_nor.webp',
  facadeNor: base + 'facade_nor.webp',
  pavementDiff: base + 'pavement_diff.webp',
  pavementNor: base + 'pavement_nor.webp',
}

export const PALETTE = {
  wall: '#f3e2df',
  ceiling: '#fbf8f6',
  lacquer: '#fbf6f3',
  rosePanel: '#e9c3c8',
  blushPanel: '#f2d8da',
  plum: '#5e1c36',
  gold: '#c9a46a',
  ink: '#2a1820',
  warmLight: '#ffe6cc',
}

function repeat(t: THREE.Texture, x: number, y: number, srgb = false) {
  const c = t.clone()
  c.wrapS = c.wrapT = THREE.RepeatWrapping
  c.repeat.set(x, y)
  c.anisotropy = 8
  if (srgb) c.colorSpace = THREE.SRGBColorSpace
  c.needsUpdate = true
  return c
}

export type Materials = ReturnType<typeof useMaterials>

/** All shared materials of the boutique, created once per scene (suspends while textures load). */
export function useMaterials(width: number, depth: number) {
  const tex = useTexture(TEXTURES)
  return useMemo(() => {
    const floor = new THREE.MeshStandardMaterial({
      map: repeat(tex.marbleDiff, width / 1.4, depth / 1.4, true),
      roughnessMap: repeat(tex.marbleRough, width / 1.4, depth / 1.4),
      normalMap: repeat(tex.marbleNor, width / 1.4, depth / 1.4),
      normalScale: new THREE.Vector2(0.4, 0.4),
      roughness: 0.55,
      color: '#fbf6f4',
      envMapIntensity: 0.9,
    })
    const wall = new THREE.MeshStandardMaterial({
      color: PALETTE.wall,
      roughness: 0.92,
      normalMap: repeat(tex.plasterNor, 3, 2),
      normalScale: new THREE.Vector2(0.25, 0.25),
    })
    const ceiling = new THREE.MeshStandardMaterial({ color: PALETTE.ceiling, roughness: 0.95 })
    const lacquer = new THREE.MeshStandardMaterial({ color: PALETTE.lacquer, roughness: 0.3, envMapIntensity: 0.8 })
    const rosePanel = new THREE.MeshStandardMaterial({ color: PALETTE.rosePanel, roughness: 0.82 })
    const blushPanel = new THREE.MeshStandardMaterial({ color: PALETTE.blushPanel, roughness: 0.82 })
    const plum = new THREE.MeshStandardMaterial({ color: PALETTE.plum, roughness: 0.42, envMapIntensity: 0.9 })
    const gold = new THREE.MeshStandardMaterial({ color: PALETTE.gold, metalness: 1, roughness: 0.28 })
    const marbleTop = new THREE.MeshStandardMaterial({ color: '#f6f1ee', roughness: 0.18, envMapIntensity: 1.1 })
    const fluted = new THREE.MeshStandardMaterial({
      color: '#e6bcc2',
      roughness: 0.6,
      normalMap: repeat(flutedNormalTexture(), 6, 1),
      normalScale: new THREE.Vector2(0.9, 0.9),
    })
    const flutedPlum = fluted.clone()
    flutedPlum.color.set(PALETTE.plum)
    flutedPlum.normalMap = repeat(flutedNormalTexture(), 5, 1)
    const glass = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.05,
      metalness: 0.1,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      envMapIntensity: 1.6,
    })
    const shelfGlass = glass.clone()
    shelfGlass.opacity = 0.35
    shelfGlass.color.set('#f4fbff')
    const acrylic = glass.clone()
    acrylic.opacity = 0.5
    acrylic.color.set('#fff7f8')
    const mirror = new THREE.MeshStandardMaterial({ color: '#efe9ec', metalness: 1, roughness: 0.04, envMapIntensity: 1.3 })
    const led = new THREE.MeshBasicMaterial({ color: '#fff1df', toneMapped: false })
    const bulb = new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff4e6').multiplyScalar(1.6), toneMapped: false })
    const backlight = new THREE.MeshBasicMaterial({ map: backlightTexture(), toneMapped: false })
    backlight.color.setScalar(1.05)
    const dark = new THREE.MeshStandardMaterial({ color: '#221a1e', roughness: 0.35, metalness: 0.4 })
    const facade = new THREE.MeshStandardMaterial({
      normalMap: repeat(tex.facadeNor, 4, 2),
      normalScale: new THREE.Vector2(0.6, 0.6),
      color: '#f4e4d6',
      roughness: 0.95,
    })
    const facadeAlt = facade.clone()
    facadeAlt.color.set('#e9e6e0')
    const facadeWarm = facade.clone()
    facadeWarm.color.set('#e9c9ad')
    const pavement = new THREE.MeshStandardMaterial({
      map: repeat(tex.pavementDiff, 6, 3, true),
      normalMap: repeat(tex.pavementNor, 6, 3),
      roughness: 0.9,
      color: '#e6dfda',
    })
    const asphalt = new THREE.MeshStandardMaterial({ color: '#6a6266', roughness: 0.95 })
    const foliage = new THREE.MeshStandardMaterial({ color: '#5f7a52', roughness: 0.85 })
    const terracotta = new THREE.MeshStandardMaterial({ color: '#c98a6a', roughness: 0.8 })
    const windowDark = new THREE.MeshStandardMaterial({ color: '#6f7a8c', roughness: 0.12, metalness: 0.55, envMapIntensity: 1.2 })
    return {
      floor,
      wall,
      ceiling,
      lacquer,
      rosePanel,
      blushPanel,
      plum,
      gold,
      marbleTop,
      fluted,
      flutedPlum,
      glass,
      shelfGlass,
      acrylic,
      mirror,
      led,
      bulb,
      backlight,
      dark,
      facade,
      facadeAlt,
      facadeWarm,
      pavement,
      asphalt,
      foliage,
      terracotta,
      windowDark,
    }
  }, [tex, width, depth])
}
