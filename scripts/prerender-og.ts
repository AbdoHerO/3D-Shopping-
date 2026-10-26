/**
 * After `vite build`: writes dist/p/<slug>/index.html for every product, a copy of the app shell
 * with that product's title, description and photo in the Open Graph tags, so a product link
 * shared on WhatsApp or Instagram shows a rich preview. Set SITE_URL (e.g. https://boutique.ma)
 * to get absolute image URLs, which WhatsApp requires.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Catalog } from '../src/lib/types'

const DIST = join(process.cwd(), process.argv[2] ?? 'dist')
const site = (process.env.SITE_URL ?? '').replace(/\/$/, '')
const base = process.env.VITE_BASE ?? '/'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('dist/index.html not found: run vite build first')
  process.exit(1)
}
const shell = readFileSync(join(DIST, 'index.html'), 'utf8')
const catalog = JSON.parse(readFileSync(join(DIST, 'data/catalog.json'), 'utf8')) as Catalog
const { settings } = catalog

let n = 0
for (const p of catalog.products.filter((x) => x.isActive)) {
  const title = `${p.name.fr} — ${settings.shopName}`
  const price = p.promoPrice ?? p.price
  const description = `${p.brand} · ${p.sizeLabel} · ${price} ${settings.currencyLabel.fr}. ${p.description.fr}`
  const image = /^https?:/.test(p.image) ? p.image : `${site}${base}${p.image}`
  const url = `${site}${base}p/${p.slug}`
  const tags = [
    `<meta property="og:type" content="product" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    site ? `<meta property="og:url" content="${esc(url)}" />` : '',
    `<meta property="product:price:amount" content="${price}" />`,
    `<meta property="product:price:currency" content="${esc(settings.currency)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
  ].join('\n    ')
  const html = shell
    .replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(description)}" />`)
    .replace(/<meta property="og:[^>]*>\s*/g, '')
    .replace('</head>', `    ${tags}\n  </head>`)
  mkdirSync(join(DIST, 'p', p.slug), { recursive: true })
  writeFileSync(join(DIST, 'p', p.slug, 'index.html'), html)
  n++
}
// GitHub Pages serves 404.html for unknown paths: make it the app so client routes work
writeFileSync(join(DIST, '404.html'), shell)
console.log(`prerendered ${n} product pages${site ? '' : ' (set SITE_URL for absolute image links)'}`)
