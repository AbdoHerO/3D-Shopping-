// @vitest-environment node
/**
 * The product importer end to end, in a temporary folder: synthetic product photos (made with
 * sharp, nothing downloaded), a manifest, two runs (import, then update), and the refusals.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { runImport, type Manifest } from '../../scripts/import-products'
import type { Catalog } from '@/lib/types'

let dir: string
const real = JSON.parse(readFileSync('public/data/catalog.json', 'utf8')) as Catalog

/** A lipstick photographed on white: dark case, coloured bullet. */
async function lipstickPhoto(file: string, color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="600">
    <rect width="300" height="600" fill="#ffffff"/>
    <rect x="115" y="260" width="70" height="300" rx="6" fill="#1d1a1c"/>
    <rect x="125" y="140" width="50" height="125" fill="#c9a46a"/>
    <path d="M128 140 L128 70 Q150 40 172 90 L172 140 Z" fill="${color}"/>
  </svg>`
  await sharp(Buffer.from(svg)).jpeg({ quality: 92 }).toFile(file)
}

/** A palette lid, already cut out (transparent PNG). */
async function palettePhoto(file: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="360">
    <rect x="10" y="10" width="500" height="340" rx="18" fill="#2b2326"/>
    <rect x="60" y="60" width="120" height="100" fill="#d9a8a0"/><rect x="200" y="60" width="120" height="100" fill="#b67a6a"/>
  </svg>`
  await sharp(Buffer.from(svg)).png().toFile(file)
}

/** A busy photo: noise everywhere, no plain background. */
async function busyPhoto(file: string) {
  const w = 300
  const h = 400
  const raw = Buffer.alloc(w * h * 3)
  for (let i = 0; i < raw.length; i++) raw[i] = (i * 73) % 251
  await sharp(raw, { raw: { width: w, height: h, channels: 3 } }).jpeg().toFile(file)
}

function manifest(status: 'granted' | 'denied' = 'granted', price = 89): Manifest {
  return {
    source: { name: 'test-feed', label: 'Test feed', imageHosts: ['media.example.com'], permission: { status, basis: 'Test fixture', license: 'Test licence' } },
    products: [
      { sourceId: 'L-1', name: { fr: 'Rouge à lèvres satiné', en: 'Satin lipstick' }, brand: 'TestBrand', categoryId: 'makeup', sizeLabel: '4 g', price, stock: 7, image: 'img/lipstick.jpg' },
      { sourceId: 'L-1', name: { fr: 'Doublon' }, categoryId: 'makeup', price: 1, stock: 1, image: 'img/lipstick.jpg' },
      { sourceId: 'P-2', name: { fr: 'Palette fards à paupières' }, brand: 'TestBrand', categoryId: 'makeup', price: 149, stock: 3, image: 'img/palette.png', dimsCm: [13, 9, 1.2] },
      { sourceId: 'B-3', name: { fr: 'Poudre libre' }, brand: 'TestBrand', categoryId: 'makeup', image: 'img/busy.jpg' },
      { sourceId: 'X-4', name: { fr: 'Catégorie inconnue' }, categoryId: 'shoes', price: 10, stock: 1 },
      { sourceId: 'N-5', name: { fr: 'Mascara volume' }, categoryId: 'makeup', price: 79, stock: 2, image: 'https://evil.example.net/m.jpg' },
    ],
  }
}

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'import-'))
  mkdirSync(join(dir, 'img'))
  mkdirSync(join(dir, 'public/data'), { recursive: true })
  await lipstickPhoto(join(dir, 'img/lipstick.jpg'), '#b0313f')
  await palettePhoto(join(dir, 'img/palette.png'))
  await busyPhoto(join(dir, 'img/busy.jpg'))
  writeFileSync(join(dir, 'public/data/catalog.json'), JSON.stringify({ ...real, products: [] }))
})
afterAll(() => rmSync(dir, { recursive: true, force: true }))

const opts = () => ({ manifestDir: dir, catalogPath: join(dir, 'public/data/catalog.json'), publicDir: join(dir, 'public') })

describe('product importer', () => {
  it('imports nothing without a granted permission', async () => {
    const { report } = await runImport(manifest('denied'), opts())
    expect(report.blocked).toMatch(/denied/)
    expect(report.imported).toBe(0)
    const saved = JSON.parse(readFileSync(opts().catalogPath, 'utf8')) as Catalog
    expect(saved.products).toHaveLength(0)
  })

  it('imports valid records through the shared pipeline and reports the rest', async () => {
    const { report, catalog } = await runImport(manifest(), opts())
    expect(report.discovered).toBe(6)
    expect(report.skippedDuplicates).toBe(1)
    expect(report.invalid).toEqual([{ sourceId: 'X-4', reason: 'unknown category shoes' }])
    expect(report.imagesUnavailable.map((i) => i.sourceId)).toEqual(['N-5'])
    expect(report.imagesUnavailable[0].reason).toMatch(/not in the manifest's imageHosts/)
    expect(report.imported).toBe(4)

    const byId = (sid: string) => catalog.products.find((p) => p.source?.id === sid)!
    const lipstick = byId('L-1')
    expect(lipstick.shape).toBe('lipstick')
    expect(lipstick.asset!.cutout).toMatch(/^products\/cutouts\//)
    expect(existsSync(join(dir, 'public', lipstick.asset!.cutout!))).toBe(true)
    expect(lipstick.asset!.original).toMatch(/^products\/originals\//)
    expect(lipstick.asset!.dimsEstimated).toBe(true)
    expect(lipstick.placement?.fixtureId).toBe('wall-makeup')
    expect(lipstick.isActive).toBe(true)
    expect(lipstick.source).toMatchObject({ kind: 'import', name: 'test-feed', license: 'Test licence' })

    const palette = byId('P-2')
    expect(palette.shape).toBe('palette')
    expect(palette.asset!.dimsEstimated).toBe(false)
    expect(palette.placement).toMatchObject({ fixtureId: 'counter', orientation: 'flat' })

    // no price and stock in the source: imported, but not on sale and flagged
    const busy = byId('B-3')
    expect(busy.isActive).toBe(false)
    expect(report.inactive).toContain('B-3')
    expect(busy.asset!.cutout).toBeNull()
    expect(busy.asset!.status).toBe('review')
    expect(report.fallbacks).toBeGreaterThanOrEqual(1)
    expect(report.ready3d).toBeGreaterThanOrEqual(2)
  })

  it('updates on a second run instead of duplicating', async () => {
    const { report, catalog } = await runImport(manifest('granted', 95), opts())
    expect(report.imported).toBe(0)
    expect(report.updated).toBe(4)
    const lipsticks = catalog.products.filter((p) => p.source?.id === 'L-1')
    expect(lipsticks).toHaveLength(1)
    expect(lipsticks[0].price).toBe(95)
    // the photo did not change, so the asset was not prepared again
    expect(lipsticks[0].asset!.version).toBe(1)
  })
})
