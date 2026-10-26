/**
 * Prepares the 3D assets of the products in public/data/catalog.json with the shared pipeline
 * (cut-out, silhouette, package family, size estimate) and places unplaced products on shelves.
 *
 *   npm run assets:prepare                       # products without a prepared asset
 *   npm run assets:prepare -- --force            # every product again
 *   npm run assets:prepare -- --only id1,id2     # some products
 *   npm run assets:prepare -- --replace-placements  # re-place everything (after a layout change)
 */
import { join } from 'node:path'
import { prepareCatalog, readCatalog, writeCatalog } from './lib/catalog-assets'

const args = process.argv.slice(2)
const only = args.includes('--only') ? new Set(args[args.indexOf('--only') + 1].split(',')) : undefined
const file = join(process.cwd(), 'public/data/catalog.json')
const { catalog, report } = await prepareCatalog(readCatalog(file), {
  publicDir: join(process.cwd(), 'public'),
  force: args.includes('--force'),
  only,
  replacePlacements: args.includes('--replace-placements'),
})
writeCatalog(file, catalog)
console.log(`prepared ${report.prepared}: ${report.ready} ready, ${report.review} to review, ${report.failed} failed; ${report.cutouts} cut-outs, ${report.fallbacks} card fallbacks`)
console.log(`placed ${report.placed}; unplaced: ${report.unplaced.join(', ') || 'none'}`)
for (const d of report.details.filter((x) => x.status !== 'ready')) console.log(`  ${d.status.padEnd(7)} ${d.id} (${d.family}): ${d.notes.join(' ')}`)
