/**
 * Reusable 3D package families. A product never gets a hand-made model: it is drawn as one of
 * these families, swept from a silhouette profile (measured from the product photo when a clean
 * cut-out exists, otherwise the family's template) at the product's real size, with the photo
 * projected onto its front. Pure data and maths, shared by the 3D scene, the admin and the scripts.
 */
import type { I18nText } from './types'

export const PACKAGE_FAMILIES = [
  // perfume
  'perfume-rect',
  'perfume-rounded',
  'perfume-cylinder',
  'perfume-neck',
  // bottles
  'bottle-tall',
  'bottle-rect',
  'bottle-pump',
  'bottle-squeeze',
  'bottle-flip-top',
  'dropper-bottle',
  'spray-bottle',
  'aerosol',
  'roll-on',
  // jars and tubes
  'jar-cylinder',
  'jar-low',
  'jar-lid',
  'tube',
  // makeup
  'lipstick',
  'lip-gloss',
  'mascara',
  'pencil',
  'foundation-bottle',
  'foundation-tube',
  'compact',
  'palette',
  'nail-polish',
  // boxes
  'box-carton',
  'box-perfume',
  'box-flat',
  'box-gift-set',
  // other
  'pouch',
  'accessory',
  'card',
] as const

export type PackageFamily = (typeof PACKAGE_FAMILIES)[number]

export type FamilyGroup = 'perfume' | 'bottle' | 'jar' | 'makeup' | 'box' | 'other'
export type Finish = 'matte' | 'satin' | 'gloss' | 'glass' | 'metal'
export type Orientation = 'upright' | 'flat'

export interface FamilySpec {
  id: PackageFamily
  group: FamilyGroup
  label: Pick<I18nText, 'fr' | 'en'>
  /** Superellipse exponent of the body's cross-section: 2 = round, 4 = rounded rectangle, 12 = box. */
  section: number
  /** Narrow parts (neck, cap, bullet) are round even when the body is flat. */
  roundTop: boolean
  /** Use the silhouette measured from the photo; false for families whose outline is always a rectangle. */
  fitPhoto: boolean
  /** Half-width profile from bottom to top, relative to the widest point (used without a usable cut-out). */
  template: number[]
  /** Typical size in cm [width, height, depth], used only when the real size is unknown (marked as estimated). */
  dims: [number, number, number]
  finish: Finish
  /** How the product usually stands on display. */
  orientation: Orientation
}

const R = (...v: number[]) => v

const F = (spec: Omit<FamilySpec, 'orientation'> & { orientation?: Orientation }): FamilySpec => ({ orientation: 'upright', ...spec })

export const FAMILIES: Record<PackageFamily, FamilySpec> = {
  'perfume-rect': F({ id: 'perfume-rect', group: 'perfume', label: { fr: 'Parfum rectangulaire', en: 'Rectangular perfume' }, section: 9, roundTop: true, fitPhoto: true, template: R(1, 1, 1, 1, 1, 1, 1, 1, 0.34, 0.3, 0.42, 0.42), dims: [8, 12, 3.6], finish: 'glass' }),
  'perfume-rounded': F({ id: 'perfume-rounded', group: 'perfume', label: { fr: 'Parfum arrondi', en: 'Rounded perfume' }, section: 4, roundTop: true, fitPhoto: true, template: R(0.86, 0.97, 1, 1, 1, 0.98, 0.92, 0.8, 0.3, 0.28, 0.42, 0.4), dims: [8, 12.5, 4.5], finish: 'glass' }),
  'perfume-cylinder': F({ id: 'perfume-cylinder', group: 'perfume', label: { fr: 'Parfum cylindrique', en: 'Cylindrical perfume' }, section: 2, roundTop: true, fitPhoto: true, template: R(1, 1, 1, 1, 1, 1, 1, 1, 0.42, 0.42, 0.62, 0.6), dims: [5.5, 14, 5.5], finish: 'glass' }),
  'perfume-neck': F({ id: 'perfume-neck', group: 'perfume', label: { fr: 'Flacon à col et bouchon', en: 'Bottle with neck and cap' }, section: 6, roundTop: true, fitPhoto: true, template: R(0.94, 1, 1, 1, 1, 0.97, 0.86, 0.42, 0.3, 0.52, 0.55, 0.5), dims: [7, 13, 4.5], finish: 'glass' }),
  'bottle-tall': F({ id: 'bottle-tall', group: 'bottle', label: { fr: 'Flacon haut arrondi', en: 'Tall rounded bottle' }, section: 3, roundTop: true, fitPhoto: true, template: R(0.92, 1, 1, 1, 1, 1, 0.98, 0.92, 0.72, 0.5, 0.48, 0.44), dims: [6.5, 21, 4.2], finish: 'gloss' }),
  'bottle-rect': F({ id: 'bottle-rect', group: 'bottle', label: { fr: 'Flacon rectangulaire', en: 'Rectangular bottle' }, section: 7, roundTop: true, fitPhoto: true, template: R(1, 1, 1, 1, 1, 1, 1, 0.96, 0.6, 0.45, 0.45, 0.42), dims: [7, 19, 3.8], finish: 'satin' }),
  'bottle-pump': F({ id: 'bottle-pump', group: 'bottle', label: { fr: 'Flacon pompe', en: 'Pump bottle' }, section: 3, roundTop: true, fitPhoto: true, template: R(0.95, 1, 1, 1, 1, 1, 0.97, 0.5, 0.32, 0.26, 0.2, 0.16), dims: [6.5, 20, 6.5], finish: 'gloss' }),
  'bottle-squeeze': F({ id: 'bottle-squeeze', group: 'bottle', label: { fr: 'Flacon souple', en: 'Squeeze bottle' }, section: 4, roundTop: true, fitPhoto: true, template: R(0.82, 0.92, 0.98, 1, 1, 1, 1, 0.98, 0.94, 0.86, 0.62, 0.6), dims: [6.5, 18, 4], finish: 'satin' }),
  'bottle-flip-top': F({ id: 'bottle-flip-top', group: 'bottle', label: { fr: 'Flacon à capsule', en: 'Flip-top bottle' }, section: 3, roundTop: true, fitPhoto: true, template: R(0.94, 1, 1, 1, 1, 1, 1, 0.96, 0.8, 0.66, 0.64, 0.6), dims: [6.5, 19, 4.5], finish: 'gloss' }),
  'dropper-bottle': F({ id: 'dropper-bottle', group: 'bottle', label: { fr: 'Flacon compte-gouttes', en: 'Dropper bottle' }, section: 2, roundTop: true, fitPhoto: true, template: R(0.96, 1, 1, 1, 1, 0.94, 0.56, 0.52, 0.5, 0.46, 0.4, 0.32), dims: [3.6, 11, 3.6], finish: 'glass' }),
  'spray-bottle': F({ id: 'spray-bottle', group: 'bottle', label: { fr: 'Vaporisateur', en: 'Spray bottle' }, section: 2, roundTop: true, fitPhoto: true, template: R(0.98, 1, 1, 1, 1, 1, 0.96, 0.62, 0.52, 0.48, 0.46, 0.42), dims: [5, 17, 5], finish: 'gloss' }),
  aerosol: F({ id: 'aerosol', group: 'bottle', label: { fr: 'Aérosol (déodorant, laque)', en: 'Aerosol (deodorant, hairspray)' }, section: 2, roundTop: true, fitPhoto: true, template: R(0.96, 1, 1, 1, 1, 1, 1, 1, 0.92, 0.86, 0.8, 0.7), dims: [5, 19, 5], finish: 'metal' }),
  'roll-on': F({ id: 'roll-on', group: 'bottle', label: { fr: 'Roll-on', en: 'Roll-on' }, section: 3, roundTop: true, fitPhoto: true, template: R(0.9, 0.98, 1, 1, 0.98, 0.9, 0.86, 0.9, 0.92, 0.9, 0.84, 0.7), dims: [4.5, 11, 3.5], finish: 'satin' }),
  'jar-cylinder': F({ id: 'jar-cylinder', group: 'jar', label: { fr: 'Pot cylindrique', en: 'Cylindrical jar' }, section: 2, roundTop: true, fitPhoto: true, template: R(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1), dims: [7, 7, 7], finish: 'gloss' }),
  'jar-low': F({ id: 'jar-low', group: 'jar', label: { fr: 'Pot bas arrondi', en: 'Low rounded jar' }, section: 2, roundTop: true, fitPhoto: true, template: R(0.9, 0.98, 1, 1, 1, 1, 1, 1, 0.98, 0.94, 0.9, 0.82), dims: [8, 5, 8], finish: 'gloss' }),
  'jar-lid': F({ id: 'jar-lid', group: 'jar', label: { fr: 'Pot avec couvercle', en: 'Jar with lid' }, section: 2, roundTop: true, fitPhoto: true, template: R(0.94, 0.96, 0.96, 0.96, 0.96, 0.96, 0.96, 1, 1, 1, 1, 0.98), dims: [7.5, 6.5, 7.5], finish: 'gloss' }),
  tube: F({ id: 'tube', group: 'jar', label: { fr: 'Tube', en: 'Tube' }, section: 5, roundTop: true, fitPhoto: true, template: R(0.6, 0.66, 0.72, 0.8, 0.86, 0.92, 0.96, 1, 1, 1, 1, 1), dims: [5, 17, 3], finish: 'satin' }),
  lipstick: F({ id: 'lipstick', group: 'makeup', label: { fr: 'Rouge à lèvres', en: 'Lipstick' }, section: 2, roundTop: true, fitPhoto: true, template: R(1, 1, 1, 1, 1, 1, 1, 0.92, 0.72, 0.64, 0.6, 0.5), dims: [2.2, 8.4, 2.2], finish: 'metal' }),
  'lip-gloss': F({ id: 'lip-gloss', group: 'makeup', label: { fr: 'Gloss', en: 'Lip gloss' }, section: 2, roundTop: true, fitPhoto: true, template: R(0.94, 1, 1, 1, 1, 1, 0.98, 0.72, 0.66, 0.66, 0.66, 0.62), dims: [2, 10, 2], finish: 'gloss' }),
  mascara: F({ id: 'mascara', group: 'makeup', label: { fr: 'Mascara', en: 'Mascara' }, section: 2, roundTop: true, fitPhoto: true, template: R(0.96, 1, 1, 1, 1, 1, 0.98, 0.9, 0.86, 0.84, 0.82, 0.76), dims: [2.4, 13.5, 2.4], finish: 'gloss' }),
  pencil: F({ id: 'pencil', group: 'makeup', label: { fr: 'Crayon / eyeliner', en: 'Pencil / eyeliner' }, section: 2, roundTop: true, fitPhoto: true, template: R(1, 1, 1, 1, 1, 1, 1, 1, 1, 0.92, 0.6, 0.3), dims: [1.1, 14, 1.1], finish: 'satin' }),
  'foundation-bottle': F({ id: 'foundation-bottle', group: 'makeup', label: { fr: 'Fond de teint (flacon)', en: 'Foundation bottle' }, section: 5, roundTop: true, fitPhoto: true, template: R(1, 1, 1, 1, 1, 1, 1, 0.82, 0.62, 0.6, 0.6, 0.56), dims: [4.5, 12, 3], finish: 'glass' }),
  'foundation-tube': F({ id: 'foundation-tube', group: 'makeup', label: { fr: 'Fond de teint (tube)', en: 'Foundation tube' }, section: 4, roundTop: true, fitPhoto: true, template: R(0.62, 0.72, 0.84, 0.94, 1, 1, 1, 1, 0.96, 0.96, 0.96, 0.94), dims: [4, 13, 2.6], finish: 'satin' }),
  compact: F({ id: 'compact', group: 'makeup', label: { fr: 'Poudrier', en: 'Compact powder' }, section: 2, roundTop: false, fitPhoto: false, template: R(1, 1, 1, 1), dims: [7, 7, 1.4], finish: 'gloss', orientation: 'flat' }),
  palette: F({ id: 'palette', group: 'makeup', label: { fr: 'Palette', en: 'Palette' }, section: 14, roundTop: false, fitPhoto: false, template: R(1, 1, 1, 1), dims: [13, 9, 1.2], finish: 'satin', orientation: 'flat' }),
  'nail-polish': F({ id: 'nail-polish', group: 'makeup', label: { fr: 'Vernis à ongles', en: 'Nail polish' }, section: 4, roundTop: true, fitPhoto: true, template: R(0.94, 1, 1, 1, 1, 0.96, 0.62, 0.44, 0.44, 0.44, 0.44, 0.42), dims: [3.4, 8, 3.4], finish: 'glass' }),
  'box-carton': F({ id: 'box-carton', group: 'box', label: { fr: 'Boîte carton', en: 'Carton box' }, section: 14, roundTop: false, fitPhoto: false, template: R(1, 1, 1, 1), dims: [6, 12, 4], finish: 'satin' }),
  'box-perfume': F({ id: 'box-perfume', group: 'box', label: { fr: 'Boîte de parfum', en: 'Perfume box' }, section: 14, roundTop: false, fitPhoto: false, template: R(1, 1, 1, 1), dims: [8, 15, 5], finish: 'satin' }),
  'box-flat': F({ id: 'box-flat', group: 'box', label: { fr: 'Boîte plate', en: 'Flat box' }, section: 14, roundTop: false, fitPhoto: false, template: R(1, 1, 1, 1), dims: [10, 14, 2], finish: 'satin' }),
  'box-gift-set': F({ id: 'box-gift-set', group: 'box', label: { fr: 'Coffret', en: 'Gift set' }, section: 14, roundTop: false, fitPhoto: false, template: R(1, 1, 1, 1), dims: [20, 22, 7], finish: 'satin' }),
  pouch: F({ id: 'pouch', group: 'other', label: { fr: 'Sachet / trousse', en: 'Pouch' }, section: 5, roundTop: false, fitPhoto: true, template: R(0.92, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.98, 0.94), dims: [18, 12, 5], finish: 'satin' }),
  accessory: F({ id: 'accessory', group: 'other', label: { fr: 'Petit accessoire', en: 'Small accessory' }, section: 4, roundTop: false, fitPhoto: true, template: R(1, 1, 1, 1, 1, 1), dims: [6, 12, 2], finish: 'satin' }),
  card: F({ id: 'card', group: 'other', label: { fr: 'Carte photo (secours)', en: 'Photo card (fallback)' }, section: 16, roundTop: false, fitPhoto: false, template: R(1, 1, 1, 1), dims: [6, 12, 1.2], finish: 'matte' }),
}

/** Families of the first data model ("shape"), kept so older catalogues and rows still load. */
const LEGACY: Record<string, PackageFamily> = {
  bottle: 'bottle-tall',
  pump: 'bottle-pump',
  spray: 'spray-bottle',
  dropper: 'dropper-bottle',
  jar: 'jar-lid',
  perfume: 'perfume-neck',
  gloss: 'lip-gloss',
  pen: 'pencil',
  polish: 'nail-polish',
  box: 'box-carton',
  roll: 'roll-on',
}

export function isPackageFamily(value: unknown): value is PackageFamily {
  return typeof value === 'string' && (PACKAGE_FAMILIES as readonly string[]).includes(value)
}

/** Reads a stored family, upgrading legacy shape names; unknown values become a card. */
export function normaliseFamily(value: unknown): PackageFamily {
  if (isPackageFamily(value)) return value
  if (typeof value === 'string' && LEGACY[value]) return LEGACY[value]
  return 'card'
}

export const FAMILY_GROUPS: { id: FamilyGroup; label: Pick<I18nText, 'fr' | 'en'> }[] = [
  { id: 'perfume', label: { fr: 'Parfums', en: 'Perfume' } },
  { id: 'bottle', label: { fr: 'Flacons', en: 'Bottles' } },
  { id: 'jar', label: { fr: 'Pots et tubes', en: 'Jars and tubes' } },
  { id: 'makeup', label: { fr: 'Maquillage', en: 'Makeup' } },
  { id: 'box', label: { fr: 'Boîtes', en: 'Boxes' } },
  { id: 'other', label: { fr: 'Autres', en: 'Other' } },
]

// ---------------------------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------------------------

/** Linear resampling of a bottom→top profile to `n` points. */
export function resampleProfile(profile: number[], n: number): number[] {
  if (profile.length === 0) return new Array(n).fill(1)
  if (profile.length === 1) return new Array(n).fill(profile[0])
  return Array.from({ length: n }, (_, i) => {
    const t = (i / (n - 1)) * (profile.length - 1)
    const k = Math.min(profile.length - 2, Math.floor(t))
    const f = t - k
    return profile[k] * (1 - f) + profile[k + 1] * f
  })
}

/**
 * The profile a product is drawn with: the one measured from its photo when the family follows
 * photos, else the family template. Values are clamped so the model never pinches to nothing.
 */
export function profileFor(family: PackageFamily, measured: number[] | null | undefined): number[] {
  const spec = FAMILIES[family]
  const source = spec.fitPhoto && measured && measured.length >= 4 ? measured : spec.template
  const max = Math.max(...source, 1e-6)
  return source.map((v) => Math.min(1, Math.max(0.06, v / max)))
}

/** A short stable key for geometry caching. */
export function profileKey(family: PackageFamily, profile: number[], w: number, d: number) {
  return `${family}|${profile.map((v) => Math.round(v * 100)).join('.')}|${Math.round((w / Math.max(d, 1e-6)) * 20)}`
}

/** Superellipse point for angle t (radians) with semi-axes a (x) and b (z) and exponent n. */
export function superellipse(t: number, a: number, b: number, n: number): [number, number] {
  const c = Math.cos(t)
  const s = Math.sin(t)
  const e = 2 / n
  return [a * Math.sign(c) * Math.abs(c) ** e, b * Math.sign(s) * Math.abs(s) ** e]
}

/**
 * Cross-section of one profile ring, in metres. The body follows the family's section exponent;
 * narrow rings (necks, caps, bullets) of families with round tops become round.
 */
export function ringShape(spec: FamilySpec, rel: number, widthM: number, depthM: number) {
  const halfW = (rel * widthM) / 2
  const narrow = spec.roundTop ? smooth((0.78 - rel) / 0.2) : 0
  const n = spec.section + (2 - spec.section) * narrow
  // a body uses the product depth; a neck narrower than that is as deep as it is wide
  const b = Math.min(halfW, depthM / 2)
  return { a: halfW, b: Math.max(0.0005, b), n: Math.max(2, n) }
}

function smooth(x: number) {
  const t = Math.min(1, Math.max(0, x))
  return t * t * (3 - 2 * t)
}
