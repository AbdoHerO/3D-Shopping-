/** Node adapter for the shared image pipeline: sharp decodes to RGBA and encodes WebP. */
import sharp from 'sharp'
import type { RasterImage } from '../../src/lib/product-assets/raster'

export async function decodeImage(input: Buffer | string): Promise<RasterImage & { format: string }> {
  const img = sharp(input, { failOn: 'error' }).rotate()
  const meta = await img.metadata()
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return { width: info.width, height: info.height, data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length), format: meta.format ?? 'unknown' }
}

export async function encodeWebp(img: RasterImage, quality = 86): Promise<Buffer> {
  return sharp(Buffer.from(img.data.buffer, img.data.byteOffset, img.data.length), { raw: { width: img.width, height: img.height, channels: 4 } })
    .webp({ quality, alphaQuality: 92, effort: 5 })
    .toBuffer()
}

/** MIME type sniffed from the file's first bytes (never trust the extension or the server). */
export function sniffType(buf: Buffer): string {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png'
  if (buf.length > 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp'
  if (buf.length > 12 && buf.subarray(4, 12).toString('ascii').startsWith('ftypavi')) return 'image/avif'
  return 'application/octet-stream'
}
