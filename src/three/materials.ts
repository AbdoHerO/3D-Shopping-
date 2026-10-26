import { useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { SHOP } from '@/lib/layout'
import { ceilingGridTexture, checkerTexture, oakTexture, shelfGlowTexture } from './textures'

const base = import.meta.env.BASE_URL + 'textures/'
const TEXTURES = {
  plasterNor: base + 'plaster_nor.webp',
  facadeNor: base + 'facade_nor.webp',
  pavementDiff: base + 'pavement_diff.webp',
  pavementNor: base + 'pavement_nor.webp',
}

/** Colours read from the photographs of the real shop. */
export const PALETTE = {
  wall: '#f1f0ec',
  shelf: '#f7f7f5',
  black: '#141416',
  oak: '#d6b48c',
  stone: '#d9ccb6',
  ink: '#1d1d1f',
  ledWarm: '#ffdcae',
  ledNeutral: '#fff6ea',
  gold: '#c9a46a',
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
    // checkered tiles: the 2×2 texture covers two tiles each way
    const tiles = 2 * SHOP.floorTile
    const floor = new THREE.MeshStandardMaterial({
      map: repeat(checkerTexture(), width / tiles, depth / tiles),
      roughness: 0.34,
      metalness: 0,
      envMapIntensity: 0.55,
    })
    const ceiling = new THREE.MeshStandardMaterial({
      map: repeat(ceilingGridTexture(), width / SHOP.ceilingPanel, depth / SHOP.ceilingPanel),
      roughness: 0.95,
    })
    const wall = new THREE.MeshStandardMaterial({
      color: PALETTE.wall,
      roughness: 0.92,
      normalMap: repeat(tex.plasterNor, 3, 2),
      normalScale: new THREE.Vector2(0.15, 0.15),
    })
    // white melamine shelving, satin
    const shelf = new THREE.MeshStandardMaterial({ color: PALETTE.shelf, roughness: 0.42, envMapIntensity: 0.6 })
    const shelfBack = new THREE.MeshStandardMaterial({ color: '#f2f2f0', roughness: 0.7, envMapIntensity: 0.4 })
    const oak = new THREE.MeshStandardMaterial({ map: repeat(oakTexture(), 1.6, 1), color: '#ffffff', roughness: 0.55, envMapIntensity: 0.5 })
    // glossy black storefront panels and display frames
    const black = new THREE.MeshStandardMaterial({ color: PALETTE.black, roughness: 0.22, metalness: 0.25, envMapIntensity: 1.1 })
    const blackMatte = new THREE.MeshStandardMaterial({ color: '#1c1c1f', roughness: 0.6, metalness: 0.1 })
    const chrome = new THREE.MeshStandardMaterial({ color: '#dcdde0', metalness: 1, roughness: 0.18 })
    const gold = new THREE.MeshStandardMaterial({ color: PALETTE.gold, metalness: 1, roughness: 0.3 })
    const glass = new THREE.MeshStandardMaterial({
      color: '#f4fbff',
      roughness: 0.04,
      metalness: 0.1,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
      envMapIntensity: 1.4,
    })
    const shelfGlass = glass.clone()
    shelfGlass.opacity = 0.32
    const glassEdge = new THREE.MeshStandardMaterial({ color: '#cfe3df', roughness: 0.1, transparent: true, opacity: 0.6 })
    const ledWarm = new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.ledWarm).multiplyScalar(1.15), toneMapped: false })
    const ledNeutral = new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.ledNeutral).multiplyScalar(1.1), toneMapped: false })
    const bulb = new THREE.MeshBasicMaterial({ color: new THREE.Color('#fffaf2').multiplyScalar(1.7), toneMapped: false })
    const glow = new THREE.MeshBasicMaterial({ map: shelfGlowTexture(), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
    const screen = new THREE.MeshStandardMaterial({ color: '#0d1116', roughness: 0.18, metalness: 0.2, emissive: '#1b2633', emissiveIntensity: 0.6 })
    const plastic = new THREE.MeshStandardMaterial({ color: '#2a2a2d', roughness: 0.45 })
    const rail = new THREE.MeshStandardMaterial({ color: '#dcdcdc', roughness: 0.5 })
    const whitePlastic = new THREE.MeshStandardMaterial({ color: '#f4f4f2', roughness: 0.35 })
    const stone = new THREE.MeshStandardMaterial({
      normalMap: repeat(tex.facadeNor, 4, 2),
      normalScale: new THREE.Vector2(0.5, 0.5),
      color: PALETTE.stone,
      roughness: 0.95,
    })
    const stoneAlt = stone.clone()
    stoneAlt.color.set('#cfc6b8')
    const pavement = new THREE.MeshStandardMaterial({
      map: repeat(tex.pavementDiff, 6, 3, true),
      normalMap: repeat(tex.pavementNor, 6, 3),
      roughness: 0.9,
      color: '#d9d4cf',
    })
    const asphalt = new THREE.MeshStandardMaterial({ color: '#5f5a5e', roughness: 0.95 })
    const foliage = new THREE.MeshStandardMaterial({ color: '#4f6b45', roughness: 0.85 })
    const pot = new THREE.MeshStandardMaterial({ color: '#e9e7e2', roughness: 0.4 })
    const petal = new THREE.MeshStandardMaterial({ color: '#fbf8f6', roughness: 0.6 })
    const windowDark = new THREE.MeshStandardMaterial({ color: '#5d6676', roughness: 0.12, metalness: 0.55, envMapIntensity: 1.2 })
    return {
      floor,
      ceiling,
      wall,
      shelf,
      shelfBack,
      oak,
      black,
      blackMatte,
      chrome,
      gold,
      glass,
      shelfGlass,
      glassEdge,
      ledWarm,
      ledNeutral,
      bulb,
      glow,
      screen,
      plastic,
      rail,
      whitePlastic,
      stone,
      stoneAlt,
      pavement,
      asphalt,
      foliage,
      pot,
      petal,
      windowDark,
    }
  }, [tex, width, depth])
}
