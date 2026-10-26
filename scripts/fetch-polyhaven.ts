/**
 * Downloads the CC0 PBR textures the boutique uses from Poly Haven (https://polyhaven.com, all
 * assets CC0) and converts them to WebP in public/textures. Already committed, so you only need
 * to run this to change or refresh a texture:
 *
 *   npm run assets:textures
 */
import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = join(process.cwd(), 'public/textures')

// [asset id, Poly Haven map name, output file, webp quality, desaturate+lighten]
const MAPS: [string, string, string, number, boolean?][] = [
  ['grey_plaster', 'nor_gl', 'plaster_nor.webp', 85],
  ['clay_plaster', 'nor_gl', 'facade_nor.webp', 85],
  ['patio_tiles', 'Diffuse', 'pavement_diff.webp', 80, true],
  ['patio_tiles', 'nor_gl', 'pavement_nor.webp', 85],
]

async function main() {
  mkdirSync(OUT, { recursive: true })
  const credits: string[] = []
  for (const [asset, map, file, quality, neutral] of MAPS) {
    const files = (await (await fetch(`https://api.polyhaven.com/files/${asset}`)).json()) as Record<
      string,
      Record<string, Record<string, { url: string }>>
    >
    const url = files[map]['1k'].jpg.url
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer())
    // neutralised maps keep their texture detail but lose the source colour, so materials tint them
    const img = neutral ? sharp(buf).modulate({ saturation: 0.1 }).linear(0.38, 160) : sharp(buf)
    await img.webp({ quality }).toFile(join(OUT, file))
    credits.push(`${file}: ${asset} (${map}) — https://polyhaven.com/a/${asset} — CC0`)
    console.log('✓', file)
  }
  writeFileSync(join(OUT, 'CREDITS.txt'), credits.join('\n') + '\n')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
