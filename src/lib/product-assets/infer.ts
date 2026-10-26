/**
 * Chooses a package family from what is known about a product (category, name, size) and, when a
 * cut-out exists, its silhouette. Low-confidence guesses are flagged for review, never hidden.
 */
import { FAMILIES, type PackageFamily } from '../packaging'
import type { Silhouette } from './silhouette'

export interface FamilyGuess {
  family: PackageFamily
  confidence: number
  reason: string
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

/** Keyword rules, most specific first (French and English product names). */
const RULES: [RegExp, PackageFamily | 'perfume' | 'foundation' | 'bottle' | 'cream' | 'deodorant'][] = [
  [/\b(vernis|nail ?polish|polish|top ?coat|base ?coat|effet gel|gel effect|nail lacquer)\b/, 'nail-polish'],
  [/\b(gloss|lip ?oil|huile (a|pour les) levres|brillant a levres|encre a levres|lip ?ink|rouge a levres liquide|liquid lipstick|lip tint)\b/, 'lip-gloss'],
  [/\b(rouge a levres|lipstick|lip ?stick|baume a levres|lip balm|lip butter)\b/, 'lipstick'],
  [/\bmascara\b/, 'mascara'],
  [/\b(eye ?liner|crayon|pencil|kohl|khol|liner|sourcils?|brow)\b/, 'pencil'],
  [/\b(palette)\b/, 'palette'],
  [/\b(fond de teint|foundation|bb ?cream|cc ?cream|cc ?creme|bb ?creme|skin ?tint|teint)\b/, 'foundation'],
  [/\b(poudre|powder|compact|blush|fard a joues|bronzer|highlighter|enlumineur|terracotta|fard a paupieres|eyeshadow|ombre a paupieres)\b/, 'compact'],
  [/\b(coffret|gift ?set|coffret cadeau)\b/, 'box-gift-set'],
  [/\b(eau de parfum|eau de toilette|parfum|perfume|edp|edt|fragrance|cologne|extrait)\b/, 'perfume'],
  [/\b(roll[- ]?on)\b/, 'roll-on'],
  [/\b(deodorant|deo|anti-?transpirant|antiperspirant)\b/, 'deodorant'],
  [/\b(laque|hair ?spray|spray coiffant|fixateur)\b/, 'aerosol'],
  [/\b(brume|mist|spray|vaporisateur|thermo-?protecteur)\b/, 'spray-bottle'],
  [/\b(serum|huile (visage|seche)|dropper|compte-?gouttes|ampoule)\b/, 'dropper-bottle'],
  [/\b(shampo+ing|shampoo|apres-?shampo+ing|conditioner|gel douche|shower gel|lait (corps|hydratant)|body lotion|lotion|eau micellaire|micellar|demaquillant|tonique)\b/, 'bottle'],
  [/\b(creme mains|hand cream|tube)\b/, 'tube'],
  [/\b(masque|mask|creme|cream|baume|balm|beurre|butter|gommage|scrub|ghassoul|henne|savon noir)\b/, 'cream'],
  [/\b(eponge|sponge|pinceau|brush|lime|file|pince|miroir|mirror|chouchous?|scrunchie|gant|trousse|accessoire)\b/, 'accessory'],
]

const BY_CATEGORY: Record<string, PackageFamily> = {
  perfume: 'perfume-neck',
  nails: 'nail-polish',
  makeup: 'foundation-bottle',
  hair: 'bottle-tall',
  body: 'bottle-tall',
  skin: 'jar-lid',
  accessories: 'accessory',
}

function refine(kind: string, s: Silhouette | null): PackageFamily {
  switch (kind) {
    case 'perfume':
      if (!s) return 'perfume-neck'
      if (s.fill > 0.93 && s.spread < 0.05) return 'box-perfume'
      if (s.topNarrowest < 0.45) return s.fill > 0.8 ? 'perfume-rect' : 'perfume-neck'
      return s.fill > 0.86 ? 'perfume-rect' : 'perfume-rounded'
    case 'foundation':
      if (!s) return 'foundation-bottle'
      // a tube stands on its cap: the wide crimped end is at the top
      return s.profile[0] < s.profile[s.profile.length - 1] * 0.8 && s.aspect > 2.2 ? 'foundation-tube' : 'foundation-bottle'
    case 'bottle':
      if (!s) return 'bottle-tall'
      if (s.topNarrowest < 0.3) return 'bottle-pump'
      if (s.fill > 0.86 && s.spread < 0.12) return 'bottle-rect'
      return s.topNarrowest > 0.55 ? 'bottle-flip-top' : 'bottle-tall'
    case 'cream':
      if (!s) return 'jar-lid'
      if (s.aspect > 1.8) return 'tube'
      return s.aspect < 0.75 ? 'jar-low' : 'jar-lid'
    case 'deodorant':
      return s && s.aspect < 2.6 ? 'roll-on' : 'aerosol'
    default:
      return kind as PackageFamily
  }
}

export function inferFamily(
  product: { categoryId: string; name: string; brand?: string; sizeLabel?: string },
  silhouette: Silhouette | null,
): FamilyGuess {
  const text = norm(`${product.name} ${product.sizeLabel ?? ''}`)
  for (const [re, kind] of RULES) {
    if (re.test(text)) {
      const family = refine(kind, silhouette)
      return { family, confidence: 0.85, reason: `name matches “${text.match(re)?.[0]}”` }
    }
  }
  const fallback = BY_CATEGORY[product.categoryId] ?? 'box-carton'
  if (silhouette && silhouette.fill > 0.94 && silhouette.spread < 0.05) {
    return { family: 'box-carton', confidence: 0.6, reason: 'the photo outline is a plain rectangle' }
  }
  return { family: fallback, confidence: 0.45, reason: `default for the “${product.categoryId}” category` }
}

/** Volume or weight from a size label such as "100 ml", "4,2 g", "50 / 100 ml" (first value). */
export function parseVolume(sizeLabel: string | undefined): { value: number; unit: 'ml' | 'g' } | null {
  // the first value of "50 / 100 ml" style labels
  const m = norm(sizeLabel ?? '').match(/(\d+(?:[.,]\d+)?)(?:\s*\/\s*\d+(?:[.,]\d+)?)*\s*(ml|g|gr)\b/)
  if (!m) return null
  return { value: Number(m[1].replace(',', '.')), unit: m[2] === 'ml' ? 'ml' : 'g' }
}

/** Reference contents for the family's typical size, to scale estimates by the label. */
const REFERENCE: Partial<Record<PackageFamily, number>> = {
  'perfume-rect': 100,
  'perfume-rounded': 100,
  'perfume-cylinder': 100,
  'perfume-neck': 100,
  'bottle-tall': 250,
  'bottle-rect': 250,
  'bottle-pump': 300,
  'bottle-squeeze': 200,
  'bottle-flip-top': 250,
  'dropper-bottle': 30,
  'spray-bottle': 150,
  aerosol: 200,
  'roll-on': 50,
  'jar-cylinder': 200,
  'jar-low': 50,
  'jar-lid': 50,
  tube: 75,
  'lip-gloss': 7,
  mascara: 10,
  'foundation-bottle': 30,
  'foundation-tube': 30,
  'nail-polish': 10,
}

/**
 * Estimated real size in cm when the admin has not measured the product: the family's typical
 * height, scaled by the label's volume, with the width taken from the photo's proportions.
 */
export function estimateDimensions(family: PackageFamily, sizeLabel: string | undefined, aspect: number | null) {
  const spec = FAMILIES[family]
  let [w, h, d] = spec.dims
  const vol = parseVolume(sizeLabel)
  const ref = REFERENCE[family]
  if (vol && ref) {
    const k = Math.min(1.5, Math.max(0.65, Math.cbrt(vol.value / ref)))
    w *= k
    h *= k
    d *= k
  }
  if (aspect && aspect > 0.2 && aspect < 12) {
    if (spec.orientation === 'flat') {
      // the photo shows the lid or face: keep the width, follow the photo for the other side
      h = w * aspect
    } else if (spec.fitPhoto) {
      const ratio = d / w
      w = h / aspect
      d = spec.section <= 2.5 ? w : w * ratio
    }
  }
  const r = (v: number) => Math.round(v * 10) / 10
  return { widthCm: r(w), heightCm: r(h), depthCm: r(Math.max(0.6, d)) }
}
