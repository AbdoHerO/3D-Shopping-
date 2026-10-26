/**
 * Builds public/data/catalog.json and draws a transparent WebP packshot for every demo product
 * (and every shade) by rendering the SVGs from scripts/catalog/art.ts in headless Chromium.
 *
 *   npm run gen:catalog
 */
import { chromium } from '@playwright/test'
import sharp from 'sharp'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderArt, type ArtInput } from './catalog/art'
import { categories, deliveryZones, products as sources, settings, t } from './catalog/source'
import type { Catalog, I18nText, Product } from '../src/lib/types'

const ROOT = process.cwd()
const OUT_IMG = join(ROOT, 'public/products')
const OUT_DATA = join(ROOT, 'public/data')

const howTo: Record<string, I18nText> = {
  hair: t(
    'Appliquer sur cheveux mouillés ou secs selon le produit, masser doucement puis rincer si nécessaire.',
    'Apply to wet or dry hair depending on the product, massage gently, then rinse if needed.',
    'يوضع على الشعر المبلل أو الجاف حسب المنتج، يدلك بلطف ثم يشطف عند الحاجة.',
  ),
  skin: t(
    'Appliquer matin et/ou soir sur une peau propre, en évitant le contour des yeux.',
    'Apply morning and/or evening to clean skin, avoiding the eye area.',
    'يوضع صباحاً و/أو مساءً على بشرة نظيفة مع تجنب محيط العين.',
  ),
  nails: t(
    'Appliquer sur des mains et des ongles propres. Laisser sécher entre deux couches.',
    'Apply to clean hands and nails. Let dry between coats.',
    'يوضع على يدين وأظافر نظيفة. يترك ليجف بين الطبقتين.',
  ),
  makeup: t(
    'Appliquer du bout des doigts, au pinceau ou à l’éponge, puis estomper.',
    'Apply with fingertips, a brush or a sponge, then blend.',
    'يوضع بأطراف الأصابع أو بالفرشاة أو الإسفنجة ثم يدمج.',
  ),
  perfume: t(
    'Vaporiser sur les points de pulsation : poignets, cou et derrière les oreilles.',
    'Spray on pulse points: wrists, neck and behind the ears.',
    'يرش على نقاط النبض: المعصمين والرقبة وخلف الأذنين.',
  ),
  body: t(
    'Appliquer sur une peau propre et humide, masser puis rincer ou laisser pénétrer.',
    'Apply to clean, damp skin, massage, then rinse or let it absorb.',
    'يوضع على بشرة نظيفة ورطبة، يدلك ثم يشطف أو يترك ليمتص.',
  ),
  accessories: t(
    'Nettoyer régulièrement et ranger à l’abri de l’humidité.',
    'Clean regularly and store away from moisture.',
    'ينظف بانتظام ويحفظ بعيداً عن الرطوبة.',
  ),
}

/** Deterministic pseudo-random stock levels so the demo is stable between runs. */
function stockFor(slug: string) {
  let h = 0
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return 6 + (h % 34)
}
const OUT_OF_STOCK = new Set(['chouchous-satin'])
const LOW_STOCK = new Set(['edp-iris-velours'])

async function main() {
  rmSync(OUT_IMG, { recursive: true, force: true })
  mkdirSync(OUT_IMG, { recursive: true })
  mkdirSync(OUT_DATA, { recursive: true })

  const jobs: { file: string; input: ArtInput }[] = []
  const products: Product[] = sources.map((src) => {
    const [fixtureId, level, slot, facings = 2] = src.at
    const variants = (src.variants ?? []).map((v) => {
      const hasArt = Boolean(v.colorHex)
      const file = `${src.slug}--${v.id}.webp`
      if (hasArt) {
        jobs.push({
          file,
          input: {
            id: `${src.slug}--${v.id}`,
            shape: src.shape,
            wCm: src.dims[0],
            hCm: src.dims[1],
            brand: src.brand,
            size: src.size,
            art: src.art,
            color: v.colorHex,
          },
        })
      }
      return {
        id: v.id,
        name: v.name,
        colorHex: v.colorHex,
        price: v.price ?? null,
        promoPrice: v.promoPrice ?? null,
        stock: OUT_OF_STOCK.has(src.slug) ? 0 : (v.stock ?? stockFor(src.slug + v.id)),
        image: hasArt ? `products/${file}` : null,
      }
    })
    const firstColor = src.variants?.find((v) => v.colorHex)?.colorHex
    const mainFile = `${src.slug}.webp`
    jobs.push({
      file: mainFile,
      input: {
        id: src.slug,
        shape: src.shape,
        wCm: src.dims[0],
        hCm: src.dims[1],
        brand: src.brand,
        size: src.size,
        art: src.art,
        color: src.art.body === '#000' ? firstColor : undefined,
      },
    })
    return {
      id: src.slug,
      slug: src.slug,
      categoryId: src.category,
      brand: src.brand,
      name: src.name,
      description: src.description,
      howToUse: howTo[src.category] ?? null,
      ingredients: null,
      sizeLabel: src.size,
      price: src.price,
      promoPrice: src.promoPrice ?? null,
      stock: OUT_OF_STOCK.has(src.slug) ? 0 : LOW_STOCK.has(src.slug) ? 3 : (src.stock ?? stockFor(src.slug)),
      isActive: true,
      isFeatured: Boolean(src.featured),
      isNew: Boolean(src.isNew),
      shape: src.shape,
      widthCm: src.dims[0],
      heightCm: src.dims[1],
      depthCm: src.dims[2],
      image: `products/${mainFile}`,
      gallery: [],
      placement: { fixtureId, level, slot, facings },
      variants,
      displayVariants: Boolean(src.displayVariants),
    }
  })

  const font = (pkg: string, file: string) =>
    readFileSync(join(ROOT, 'node_modules/@fontsource', pkg, 'files', file)).toString('base64')
  const css = `
    @font-face { font-family: 'Cormorant Garamond'; font-weight: 600; src: url(data:font/woff2;base64,${font('cormorant-garamond', 'cormorant-garamond-latin-600-normal.woff2')}) format('woff2'); }
    @font-face { font-family: 'Jost'; font-weight: 400; src: url(data:font/woff2;base64,${font('jost', 'jost-latin-400-normal.woff2')}) format('woff2'); }
    @font-face { font-family: 'Jost'; font-weight: 500; src: url(data:font/woff2;base64,${font('jost', 'jost-latin-500-normal.woff2')}) format('woff2'); }
    html, body { margin: 0; background: transparent; }
    svg { display: block; margin: 8px; }
    text { text-rendering: geometricPrecision; }`

  // CHROMIUM_PATH lets CI or sandboxes use a preinstalled Chromium instead of `npx playwright install`
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })
  const page = await browser.newPage({ deviceScaleFactor: 2 })
  const html = `<!doctype html><html><head><style>${css}</style></head><body>${jobs
    .map((j) => renderArt(j.input))
    .join('\n')}</body></html>`
  await page.setContent(html)
  // passed as a string: tsx would otherwise inject helpers that do not exist in the page
  await page.evaluate(`(async () => {
    await document.fonts.ready
    for (const el of Array.from(document.querySelectorAll('text[data-maxw]'))) {
      const max = Number(el.dataset.maxw)
      if (!max) continue
      let size = Number(el.getAttribute('font-size'))
      const rotated = el.hasAttribute('transform')
      while ((rotated ? el.getBBox().width : el.getComputedTextLength()) > max && size > 2) {
        size *= 0.93
        el.setAttribute('font-size', String(size))
      }
    }
  })()`)

  let n = 0
  for (const job of jobs) {
    const el = page.locator(`svg#${job.input.id.replace(/[^a-z0-9-]/gi, '_')}`)
    const png = await el.screenshot({ omitBackground: true })
    const W = Math.round(job.input.wCm * 32)
    const H = Math.round(job.input.hCm * 32)
    await sharp(png).resize(W, H).webp({ quality: 86, alphaQuality: 90 }).toFile(join(OUT_IMG, job.file))
    n++
  }
  await browser.close()

  const catalog: Catalog = { settings, categories, products, deliveryZones }
  writeFileSync(join(OUT_DATA, 'catalog.json'), JSON.stringify(catalog, null, 1) + '\n')
  console.log(`catalog.json: ${products.length} products, ${n} packshots written`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
