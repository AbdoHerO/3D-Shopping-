/** Browser adapter for the shared image pipeline: decode with createImageBitmap, encode with canvas. */
import type { RasterImage } from './raster'

function canvasOf(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

export async function decodeBlob(blob: Blob): Promise<RasterImage> {
  const bitmap = await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'default' })
  const c = canvasOf(bitmap.width, bitmap.height)
  const g = c.getContext('2d', { willReadFrequently: true })!
  g.drawImage(bitmap, 0, 0)
  bitmap.close()
  const data = g.getImageData(0, 0, c.width, c.height).data
  return { width: c.width, height: c.height, data }
}

export async function encodeWebp(img: RasterImage, quality = 0.86): Promise<Blob> {
  const c = canvasOf(img.width, img.height)
  c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(img.data), img.width, img.height), 0, 0)
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode the image.'))), 'image/webp', quality))
}

/** MIME type from the file's first bytes; browsers report types from the extension. */
export async function sniffBlobType(blob: Blob): Promise<string> {
  const b = new Uint8Array(await blob.slice(0, 16).arrayBuffer())
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to))
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b[0] === 0x89 && ascii(1, 4) === 'PNG') return 'image/png'
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp'
  if (ascii(4, 12).startsWith('ftypavi')) return 'image/avif'
  return blob.type || 'application/octet-stream'
}
