/**
 * Imports products from an authorised source into the catalogue, through the same
 * product-to-3D preparation as an upload in the admin.
 *
 *   npm run import:products -- data/imports/<source>.manifest.json [--dry-run]
 *
 * A manifest names its source, the permission the import relies on, and the products (see
 * data/imports/README.md). Nothing is imported unless `permission.status` is "granted": the
 * source's terms are the owner's to check, not the script's to guess. Re-running a manifest
 * updates the products it created before (matched by source name + source id); it never
 * duplicates them and never touches prices, stock or texts the manifest does not provide.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, extname, isAbsolute, join, resolve } from 'node:path'
import { slugify } from '../src/lib/slug'
import { isPackageFamily } from '../src/lib/packaging'
import { MAX_UPLOAD_BYTES, validateUpload } from '../src/lib/product-assets/prepare'
import type { Catalog, I18nText, Product, Variant } from '../src/lib/types'
import { prepareCatalog, readCatalog, writeCatalog } from './lib/catalog-assets'
import { sniffType } from './lib/node-image'

export interface ManifestVariant {
  sourceId: string
  name: Partial<I18nText> & { fr: string }
  colorHex?: string
  price?: number | null
  stock?: number | null
  image?: string | null
}

export interface ManifestProduct {
  sourceId: string
  url?: string
  name: Partial<I18nText> & { fr: string }
  brand?: string
  categoryId: string
  description?: Partial<I18nText>
  sizeLabel?: string
  price?: number | null
  promoPrice?: number | null
  stock?: number | null
  image?: string | null
  family?: string
  dimsCm?: [number, number, number] | null
  variants?: ManifestVariant[]
}

export interface Manifest {
  source: {
    name: string
    label: string
    url?: string
    /** Hosts images may be downloaded from (https only). */
    imageHosts?: string[]
    permission: { status: 'granted' | 'pending' | 'denied'; basis?: string; reference?: string; date?: string; license?: string; attribution?: string; notes?: string }
  }
  products: ManifestProduct[]
}

export interface ImportReport {
  source: string
  permission: string
  blocked: string | null
  discovered: number
  imported: number
  updated: number
  skippedDuplicates: number
  invalid: { sourceId: string; reason: string }[]
  imagesUnavailable: { sourceId: string; reason: string }[]
  needsReview: number
  ready3d: number
  fallbacks: number
  inactive: string[]
}

const full = (t: Partial<I18nText> | undefined, fallback = ''): I18nText => ({ fr: t?.fr ?? fallback, en: t?.en ?? t?.fr ?? fallback, ar: t?.ar ?? t?.fr ?? fallback })

async function fetchImage(url: string, hosts: string[]): Promise<Buffer> {
  const u = new URL(url)
  if (u.protocol !== 'https:') throw new Error(`refused non-https image URL ${url}`)
  if (!hosts.includes(u.hostname)) throw new Error(`image host ${u.hostname} is not in the manifest's imageHosts`)
  const res = await fetch(url, { headers: { 'user-agent': 'MaisonLumiereImporter/1.0' }, redirect: 'error' })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  const len = Number(res.headers.get('content-length') ?? 0)
  if (len > MAX_UPLOAD_BYTES) throw new Error(`image too large (${len} bytes)`)
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length > MAX_UPLOAD_BYTES) throw new Error(`image too large (${buf.length} bytes)`)
  return buf
}

/** Copies a manifest image into public/products/originals and returns its catalogue path. */
async function storeOriginal(ref: string, manifestDir: string, hosts: string[], publicDir: string, key: string): Promise<string> {
  const buf = /^https?:/.test(ref) ? await fetchImage(ref, hosts) : readFileSync(isAbsolute(ref) ? ref : join(manifestDir, ref))
  const type = sniffType(buf)
  const invalid = validateUpload({ type, size: buf.length })
  if (invalid) throw new Error(invalid)
  const ext = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/avif': '.avif' }[type] ?? extname(ref)
  const rel = `products/originals/${key}${ext}`
  mkdirSync(join(publicDir, 'products/originals'), { recursive: true })
  writeFileSync(join(publicDir, rel), buf)
  return rel
}

export async function runImport(
  manifest: Manifest,
  opts: { manifestDir: string; catalogPath: string; publicDir: string; dryRun?: boolean; log?: (s: string) => void },
): Promise<{ report: ImportReport; catalog: Catalog }> {
  const log = opts.log ?? (() => {})
  const src = manifest.source
  const report: ImportReport = {
    source: src.label,
    permission: src.permission.status,
    blocked: null,
    discovered: manifest.products.length,
    imported: 0,
    updated: 0,
    skippedDuplicates: 0,
    invalid: [],
    imagesUnavailable: [],
    needsReview: 0,
    ready3d: 0,
    fallbacks: 0,
    inactive: [],
  }
  let catalog = readCatalog(opts.catalogPath)
  if (src.permission.status !== 'granted') {
    report.blocked = `Permission ${src.permission.status}${src.permission.notes ? `: ${src.permission.notes}` : ''}`
    return { report, catalog }
  }

  const seen = new Set<string>()
  const touched = new Set<string>()
  const products = [...catalog.products]
  for (const m of manifest.products) {
    if (seen.has(m.sourceId)) {
      report.skippedDuplicates++
      continue
    }
    seen.add(m.sourceId)
    if (!m.name?.fr?.trim()) {
      report.invalid.push({ sourceId: m.sourceId, reason: 'missing French name' })
      continue
    }
    if (!catalog.categories.some((c) => c.id === m.categoryId)) {
      report.invalid.push({ sourceId: m.sourceId, reason: `unknown category ${m.categoryId}` })
      continue
    }
    const index = products.findIndex((p) => p.source?.kind === 'import' && p.source.name === src.name && p.source.id === m.sourceId)
    const before = index >= 0 ? products[index] : null
    const id = before?.id ?? slugify(`${m.brand ?? ''} ${m.name.fr}`) + (products.some((p) => p.id === slugify(`${m.brand ?? ''} ${m.name.fr}`)) ? `-${slugify(src.name)}` : '')

    // the image: stored as an original, prepared later by the shared pipeline
    let original: string | null = before?.asset?.original ?? null
    let imageChanged = false
    if (m.image) {
      try {
        const stored = opts.dryRun ? `dry-run:${m.image}` : await storeOriginal(m.image, opts.manifestDir, src.imageHosts ?? [], opts.publicDir, `${slugify(src.name)}-${slugify(m.sourceId)}`)
        imageChanged = stored !== original || !before?.asset?.version
        original = stored
      } catch (e) {
        report.imagesUnavailable.push({ sourceId: m.sourceId, reason: e instanceof Error ? e.message : String(e) })
      }
    } else report.imagesUnavailable.push({ sourceId: m.sourceId, reason: 'no image in the manifest' })

    const variants: Variant[] = []
    const variantAssets: NonNullable<NonNullable<Product['asset']>['variants']> = { ...(before?.asset?.variants ?? {}) }
    for (const v of m.variants ?? []) {
      const vid = slugify(v.sourceId || v.name.fr)
      let vImage: string | null = before?.variants.find((x) => x.id === vid)?.image ?? null
      if (v.image && !opts.dryRun) {
        try {
          vImage = await storeOriginal(v.image, opts.manifestDir, src.imageHosts ?? [], opts.publicDir, `${slugify(src.name)}-${slugify(m.sourceId)}--${vid}`)
          variantAssets[vid] = { original: vImage, cutout: null, color: null }
        } catch (e) {
          report.imagesUnavailable.push({ sourceId: `${m.sourceId}/${v.sourceId}`, reason: e instanceof Error ? e.message : String(e) })
        }
      }
      variants.push({
        id: vid,
        name: full(v.name),
        colorHex: v.colorHex,
        price: v.price ?? null,
        promoPrice: null,
        stock: v.stock ?? 0,
        image: vImage,
      })
    }

    // never invent a price or stock: without them the product is imported but not on sale
    const priceKnown = typeof m.price === 'number' && m.price > 0
    const stockKnown = typeof m.stock === 'number' || (m.variants?.length ?? 0) > 0
    const sellable = priceKnown && stockKnown && Boolean(original)
    if (!sellable) report.inactive.push(m.sourceId)

    const next: Product = {
      ...(before ?? {
        id,
        slug: id,
        isFeatured: false,
        isNew: true,
        gallery: [],
        placement: null,
        displayVariants: false,
        howToUse: null,
        ingredients: null,
      }),
      id,
      slug: before?.slug ?? id,
      categoryId: m.categoryId,
      brand: m.brand ?? before?.brand ?? '',
      name: full(m.name),
      description: m.description ? full(m.description) : (before?.description ?? full(undefined)),
      sizeLabel: m.sizeLabel ?? before?.sizeLabel ?? '',
      price: priceKnown ? m.price! : (before?.price ?? 0),
      promoPrice: typeof m.promoPrice === 'number' && priceKnown && m.promoPrice < m.price! ? m.promoPrice : null,
      stock: typeof m.stock === 'number' ? Math.max(0, Math.round(m.stock)) : (before?.stock ?? 0),
      isActive: sellable,
      shape: m.family && isPackageFamily(m.family) ? m.family : (before?.shape ?? 'box-carton'),
      widthCm: m.dimsCm?.[0] ?? before?.widthCm ?? 6,
      heightCm: m.dimsCm?.[1] ?? before?.heightCm ?? 12,
      depthCm: m.dimsCm?.[2] ?? before?.depthCm ?? 4,
      image: before?.image ?? original ?? '',
      variants: m.variants ? variants : (before?.variants ?? []),
      displayVariants: before?.displayVariants ?? ((m.variants?.length ?? 0) > 1 && ['nail-polish', 'lipstick', 'lip-gloss'].includes(m.family ?? '')),
      asset: {
        ...(before?.asset ?? {
          version: 0,
          status: 'pending',
          error: null,
          updatedAt: null,
          cutout: null,
          profile: null,
          color: null,
          model: { source: 'procedural', url: null, provider: null, jobId: null },
          review: 'none',
          notes: [],
        }),
        familySource: m.family && isPackageFamily(m.family) ? 'manual' : (before?.asset?.familySource ?? 'auto'),
        original,
        dimsEstimated: !m.dimsCm && (before?.asset?.dimsEstimated ?? true),
        variants: variantAssets,
        ...(imageChanged ? { version: before?.asset?.version ?? 0, status: 'pending' as const } : {}),
      },
      source: {
        kind: 'import',
        name: src.name,
        id: m.sourceId,
        url: m.url ?? src.url ?? null,
        license: src.permission.license ?? src.permission.basis ?? null,
        attribution: src.permission.attribution ?? null,
      },
    }
    if (before) {
      products[index] = next
      report.updated++
    } else {
      products.push(next)
      report.imported++
    }
    if (imageChanged || !before?.asset?.version) touched.add(id)
  }

  catalog = { ...catalog, products }
  if (!opts.dryRun && touched.size) {
    log(`preparing ${touched.size} product(s) with the shared pipeline…`)
    const prepared = await prepareCatalog(catalog, { publicDir: opts.publicDir, only: touched, force: true })
    catalog = prepared.catalog
  }
  for (const p of catalog.products.filter((x) => x.source?.kind === 'import' && x.source.name === src.name)) {
    if (!p.asset || p.asset.version === 0) continue
    if (p.asset.status === 'review' || p.asset.status === 'failed') report.needsReview++
    if (p.asset.cutout) report.ready3d++
    else report.fallbacks++
  }
  if (!opts.dryRun) writeCatalog(opts.catalogPath, catalog)
  return { report, catalog }
}

if (process.argv[1]?.endsWith('import-products.ts')) {
  const file = process.argv.slice(2).find((a) => !a.startsWith('--'))
  if (!file) {
    console.error('usage: npm run import:products -- <manifest.json> [--dry-run]')
    process.exit(2)
  }
  const manifestPath = resolve(file)
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest
  const root = process.cwd()
  runImport(manifest, {
    manifestDir: dirname(manifestPath),
    catalogPath: join(root, 'public/data/catalog.json'),
    publicDir: join(root, 'public'),
    dryRun: process.argv.includes('--dry-run'),
    log: (s) => console.log(s),
  })
    .then(({ report }) => {
      const out = join(root, 'docs/import-reports')
      if (!existsSync(out)) mkdirSync(out, { recursive: true })
      const name = `${slugify(manifest.source.name)}-${new Date().toISOString().slice(0, 10)}.json`
      writeFileSync(join(out, name), JSON.stringify(report, null, 2) + '\n')
      console.log(JSON.stringify(report, null, 2))
      if (report.blocked) {
        console.log(`\nNothing imported from ${report.source}: ${report.blocked}`)
        process.exit(3)
      }
    })
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
}
