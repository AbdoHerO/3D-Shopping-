/**
 * Parametric SVG packshots for the demo catalog. Each function draws one packaging shape at its
 * real proportions (px = cm × PX) with cylindrical shading, metallic caps and a printed label, so
 * the 3D shelves look stocked before the owner uploads real product photos.
 */
import type { ProductShape } from '../../src/lib/types'
import type { ArtSpec } from './source'

export const PX = 32

type Rgb = [number, number, number]
const hexToRgb = (hex: string): Rgb => {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const rgbToHex = ([r, g, b]: Rgb) =>
  '#' + [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')
/** amount > 0 mixes towards white, < 0 towards black */
export const shade = (hex: string, amount: number) => {
  const c = hexToRgb(hex)
  const t = amount < 0 ? [0, 0, 0] : [255, 255, 255]
  const a = Math.abs(amount)
  return rgbToHex([c[0] + (t[0] - c[0]) * a, c[1] + (t[1] - c[1]) * a, c[2] + (t[2] - c[2]) * a])
}
const luminance = (hex: string) => {
  const [r, g, b] = hexToRgb(hex)
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const GOLD = '#C9A46A'

class Svg {
  defs: string[] = []
  body: string[] = []
  private n = 0
  constructor(
    readonly id: string,
    readonly W: number,
    readonly H: number,
  ) {}
  uid(p: string) {
    return `${this.id}-${p}${this.n++}`
  }
  /** Horizontal cylinder shading. */
  cyl(base: string, strength = 1) {
    const id = this.uid('cyl')
    const s = (a: number) => shade(base, a * strength)
    this.defs.push(`<linearGradient id="${id}" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="${s(-0.42)}"/><stop offset="0.1" stop-color="${s(-0.16)}"/>
      <stop offset="0.27" stop-color="${s(0.1)}"/><stop offset="0.35" stop-color="${s(0.42)}"/>
      <stop offset="0.43" stop-color="${s(0.12)}"/><stop offset="0.72" stop-color="${base}"/>
      <stop offset="0.9" stop-color="${s(-0.2)}"/><stop offset="1" stop-color="${s(-0.45)}"/></linearGradient>`)
    return `url(#${id})`
  }
  metal(base: string) {
    const id = this.uid('metal')
    const dark = luminance(base) < 0.25
    const stops = dark
      ? ['#060506', '#3d373b', '#0d0b0d', '#5d555b', '#0a090a']
      : base.toUpperCase() === '#FFFFFF' || luminance(base) > 0.85
        ? ['#c9c4c8', '#ffffff', '#e6e1e4', '#ffffff', '#bdb7bb']
        : [shade(base, -0.45), shade(base, 0.45), shade(base, -0.15), shade(base, 0.6), shade(base, -0.4)]
    this.defs.push(`<linearGradient id="${id}" x1="0" x2="1" y1="0" y2="0">
      ${stops.map((c, i) => `<stop offset="${[0, 0.3, 0.55, 0.72, 1][i]}" stop-color="${c}"/>`).join('')}</linearGradient>`)
    return `url(#${id})`
  }
  vertical(top: string, bottom: string) {
    const id = this.uid('v')
    this.defs.push(
      `<linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>`,
    )
    return `url(#${id})`
  }
  add(s: string) {
    this.body.push(s)
  }
  text(
    x: number,
    y: number,
    str: string,
    o: { size: number; fill: string; family?: 'serif' | 'sans'; weight?: number; maxw?: number; spacing?: number; rotate?: number; opacity?: number },
  ) {
    const family = o.family === 'sans' ? "'Jost'" : "'Cormorant Garamond'"
    const transform = o.rotate ? ` transform="rotate(${o.rotate} ${x} ${y})"` : ''
    this.add(
      `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-family="${family}" font-weight="${o.weight ?? (o.family === 'sans' ? 400 : 600)}" font-size="${o.size}" letter-spacing="${o.spacing ?? 0}" fill="${o.fill}" opacity="${o.opacity ?? 1}" data-maxw="${o.maxw ?? 0}"${transform}>${esc(str)}</text>`,
    )
  }
  highlight(x: number, y: number, w: number, h: number, opacity = 0.35) {
    const id = this.uid('hl')
    this.defs.push(
      `<linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.25" stop-color="#fff" stop-opacity="${opacity}"/><stop offset="0.8" stop-color="#fff" stop-opacity="${opacity * 0.6}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`,
    )
    this.add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w / 2}" fill="url(#${id})"/>`)
  }
  toString() {
    return `<svg xmlns="http://www.w3.org/2000/svg" id="${this.id}" width="${this.W}" height="${this.H}" viewBox="0 0 ${this.W} ${this.H}"><defs>${this.defs.join('')}</defs>${this.body.join('')}</svg>`
  }
}

export interface ArtInput {
  id: string
  shape: ProductShape
  wCm: number
  hCm: number
  brand: string
  size: string
  art: ArtSpec
  /** Variant colour (shade) when the packshot is for one shade. */
  color?: string
}

function label(s: Svg, x: number, y: number, w: number, h: number, input: ArtInput, opts: { compact?: boolean } = {}) {
  const { art } = input
  const ink = art.ink ?? '#2A1820'
  if (art.label) {
    s.add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(w, h) * 0.06}" fill="${s.cyl(art.label, 0.35)}"/>`)
  }
  const cx = x + w / 2
  const brandSize = Math.min(w * 0.17, h * 0.2)
  s.text(cx, y + h * (opts.compact ? 0.3 : 0.26), input.brand.toUpperCase(), {
    size: brandSize,
    fill: ink,
    spacing: brandSize * 0.08,
    maxw: w * 0.86,
  })
  s.add(`<rect x="${cx - w * 0.12}" y="${y + h * 0.42}" width="${w * 0.24}" height="${Math.max(1, h * 0.012)}" fill="${art.accent ?? GOLD}"/>`)
  if (art.line && !opts.compact) {
    s.text(cx, y + h * 0.58, art.line, { size: brandSize * 0.62, fill: ink, family: 'sans', weight: 500, maxw: w * 0.86 })
  }
  s.text(cx, y + h * (opts.compact ? 0.66 : 0.8), input.size, {
    size: brandSize * 0.5,
    fill: ink,
    family: 'sans',
    opacity: 0.75,
    maxw: w * 0.8,
  })
}

const shapes: Record<ProductShape, (s: Svg, i: ArtInput) => void> = {
  bottle(s, i) {
    const { W, H } = s
    const capH = H * (i.art.style === 1 ? 0.1 : 0.13)
    const capW = W * (i.art.style === 1 ? 0.62 : 0.56)
    const y0 = capH * 0.9
    const r = W * 0.1
    s.add(`<rect x="${(W - capW) / 2}" y="0" width="${capW}" height="${capH}" rx="${W * 0.06}" fill="${s.cyl(i.art.cap ?? '#fff')}"/>`)
    s.add(
      `<path d="M${W * 0.2} ${y0} C${W * 0.04} ${y0} 0 ${y0 + H * 0.04} 0 ${y0 + H * 0.1} L0 ${H - r} Q0 ${H} ${r} ${H} L${W - r} ${H} Q${W} ${H} ${W} ${H - r} L${W} ${y0 + H * 0.1} C${W} ${y0 + H * 0.04} ${W * 0.96} ${y0} ${W * 0.8} ${y0} Z" fill="${s.cyl(i.art.body)}"/>`,
    )
    label(s, W * 0.08, H * 0.36, W * 0.84, H * 0.46, i)
    s.highlight(W * 0.22, H * 0.16, W * 0.06, H * 0.8, 0.28)
  },
  pump(s, i) {
    const { W, H } = s
    const glass = i.art.style === 1
    const bodyTop = H * 0.24
    const r = W * (glass ? 0.06 : 0.12)
    s.add(`<rect x="${W * 0.44}" y="${H * 0.05}" width="${W * 0.12}" height="${H * 0.12}" fill="${s.metal(i.art.cap ?? '#fff')}"/>`)
    s.add(
      `<path d="M${W * 0.26} ${H * 0.02} h${W * 0.5} q${W * 0.06} 0 ${W * 0.06} ${H * 0.03} v${H * 0.02} h-${W * 0.56} Z" fill="${s.metal(i.art.cap ?? '#fff')}"/>`,
    )
    s.add(`<rect x="${W * 0.3}" y="${H * 0.15}" width="${W * 0.4}" height="${H * 0.1}" rx="${W * 0.04}" fill="${s.metal(i.art.cap ?? '#fff')}"/>`)
    const body = i.color ?? i.art.body
    if (glass) {
      s.add(`<rect x="0" y="${bodyTop}" width="${W}" height="${H - bodyTop}" rx="${r}" fill="${s.cyl(shade(body, 0.55), 0.6)}"/>`)
      s.add(`<rect x="${W * 0.08}" y="${bodyTop + H * 0.04}" width="${W * 0.84}" height="${H - bodyTop - H * 0.08}" rx="${r * 0.7}" fill="${s.cyl(body, 0.8)}"/>`)
      label(s, W * 0.18, H * 0.48, W * 0.64, H * 0.3, { ...i, art: { ...i.art, label: '#ffffff' } }, { compact: true })
    } else {
      s.add(`<rect x="0" y="${bodyTop}" width="${W}" height="${H - bodyTop}" rx="${r}" fill="${s.cyl(body)}"/>`)
      label(s, W * 0.08, H * 0.4, W * 0.84, H * 0.44, i)
    }
    s.highlight(W * 0.2, bodyTop + H * 0.03, W * 0.06, H * 0.68, 0.3)
  },
  spray(s, i) {
    const { W, H } = s
    const top = H * 0.24
    s.add(`<rect x="${W * 0.22}" y="${H * 0.02}" width="${W * 0.56}" height="${H * 0.14}" rx="${W * 0.12}" fill="${s.metal(i.art.cap ?? GOLD)}"/>`)
    s.add(`<circle cx="${W * 0.5}" cy="${H * 0.075}" r="${W * 0.05}" fill="#2a2326"/>`)
    s.add(`<rect x="${W * 0.28}" y="${H * 0.15}" width="${W * 0.44}" height="${H * 0.1}" fill="${s.metal(i.art.cap ?? GOLD)}"/>`)
    s.add(`<rect x="0" y="${top}" width="${W}" height="${H - top}" rx="${W * 0.16}" fill="${s.cyl(i.art.body)}"/>`)
    label(s, W * 0.08, H * 0.42, W * 0.84, H * 0.42, i)
    s.highlight(W * 0.2, top + H * 0.03, W * 0.07, H * 0.68, 0.3)
  },
  dropper(s, i) {
    const { W, H } = s
    s.add(`<rect x="${W * 0.32}" y="0" width="${W * 0.36}" height="${H * 0.3}" rx="${W * 0.18}" fill="${s.cyl('#2b2327')}"/>`)
    s.add(`<rect x="${W * 0.24}" y="${H * 0.26}" width="${W * 0.52}" height="${H * 0.12}" rx="${W * 0.03}" fill="${s.metal(i.art.cap ?? GOLD)}"/>`)
    for (let k = 1; k < 6; k++) {
      s.add(`<rect x="${W * 0.24}" y="${H * 0.26 + (H * 0.12 * k) / 6}" width="${W * 0.52}" height="0.8" fill="#000" opacity="0.18"/>`)
    }
    const top = H * 0.37
    s.add(
      `<path d="M${W * 0.3} ${top} L${W * 0.7} ${top} C${W} ${top} ${W} ${top + H * 0.08} ${W} ${top + H * 0.12} L${W} ${H - W * 0.1} Q${W} ${H} ${W * 0.9} ${H} L${W * 0.1} ${H} Q0 ${H} 0 ${H - W * 0.1} L0 ${top + H * 0.12} C0 ${top + H * 0.08} 0 ${top} ${W * 0.3} ${top} Z" fill="${s.cyl(i.art.body, 0.9)}"/>`,
    )
    if (i.art.liquid) {
      s.add(`<rect x="${W * 0.06}" y="${top + H * 0.14}" width="${W * 0.88}" height="${H - top - H * 0.17}" rx="${W * 0.06}" fill="${s.cyl(i.art.liquid, 0.5)}" opacity="0.55"/>`)
    }
    label(s, W * 0.1, H * 0.55, W * 0.8, H * 0.34, i, { compact: true })
    s.highlight(W * 0.14, top + H * 0.06, W * 0.07, H * 0.5, 0.45)
  },
  jar(s, i) {
    const { W, H } = s
    const lidH = H * 0.36
    s.add(`<rect x="0" y="0" width="${W}" height="${lidH}" rx="${W * 0.05}" fill="${s.metal(i.art.cap ?? GOLD)}"/>`)
    for (let k = 1; k < 8; k++) {
      s.add(`<rect x="${W * 0.02}" y="${(lidH * k) / 8}" width="${W * 0.96}" height="0.8" fill="#000" opacity="0.12"/>`)
    }
    s.add(
      `<path d="M${W * 0.02} ${lidH * 0.96} H${W * 0.98} V${H - W * 0.07} Q${W * 0.98} ${H} ${W * 0.9} ${H} H${W * 0.1} Q${W * 0.02} ${H} ${W * 0.02} ${H - W * 0.07} Z" fill="${s.cyl(i.art.body)}"/>`,
    )
    label(s, W * 0.1, H * 0.44, W * 0.8, H * 0.5, i, { compact: true })
    s.highlight(W * 0.16, lidH + H * 0.04, W * 0.05, H * 0.5, 0.3)
  },
  tube(s, i) {
    const { W, H } = s
    s.add(`<rect x="${W * 0.22}" y="${H * 0.83}" width="${W * 0.56}" height="${H * 0.17}" rx="${W * 0.08}" fill="${s.metal(i.art.cap ?? '#fff')}"/>`)
    s.add(
      `<path d="M0 ${H * 0.05} L${W} ${H * 0.05} C${W} ${H * 0.5} ${W * 0.82} ${H * 0.76} ${W * 0.76} ${H * 0.84} L${W * 0.24} ${H * 0.84} C${W * 0.18} ${H * 0.76} 0 ${H * 0.5} 0 ${H * 0.05} Z" fill="${s.cyl(i.art.body)}"/>`,
    )
    s.add(`<rect x="0" y="0" width="${W}" height="${H * 0.055}" fill="${shade(i.art.body, -0.08)}"/>`)
    for (let k = 1; k < 14; k++) {
      s.add(`<rect x="${(W * k) / 14}" y="0" width="0.8" height="${H * 0.05}" fill="#000" opacity="0.12"/>`)
    }
    const ink = i.art.ink ?? '#2A1820'
    const bs = W * 0.15
    s.text(W / 2, H * 0.27, i.brand.toUpperCase(), { size: bs, fill: ink, spacing: bs * 0.08, maxw: W * 0.86 })
    s.add(`<rect x="${W * 0.4}" y="${H * 0.33}" width="${W * 0.2}" height="1.2" fill="${i.art.accent ?? GOLD}"/>`)
    if (i.art.line) s.text(W / 2, H * 0.4, i.art.line, { size: bs * 0.62, fill: ink, family: 'sans', weight: 500, maxw: W * 0.8 })
    s.text(W / 2, H * 0.5, i.size, { size: bs * 0.5, fill: ink, family: 'sans', opacity: 0.75, maxw: W * 0.7 })
    s.highlight(W * 0.2, H * 0.08, W * 0.07, H * 0.62, 0.3)
  },
  perfume(s, i) {
    const { W, H } = s
    const style = i.art.style ?? 0
    const cap = i.art.cap ?? GOLD
    const liquid = i.art.liquid ?? shade(i.art.body, -0.15)
    const glass = i.art.body
    const top = H * 0.3
    s.add(`<rect x="${W * 0.36}" y="${H * 0.22}" width="${W * 0.28}" height="${H * 0.1}" fill="${s.metal(GOLD)}"/>`)
    if (style === 0) {
      s.add(`<rect x="${W * 0.27}" y="0" width="${W * 0.46}" height="${H * 0.24}" rx="${W * 0.03}" fill="${s.metal(cap)}"/>`)
      s.add(`<rect x="0" y="${top}" width="${W}" height="${H - top}" rx="${W * 0.06}" fill="${s.cyl(shade(glass, 0.3), 0.5)}"/>`)
      s.add(`<rect x="${W * 0.09}" y="${top + H * 0.06}" width="${W * 0.82}" height="${H - top - H * 0.16}" rx="${W * 0.04}" fill="${s.cyl(liquid, 0.7)}"/>`)
    } else if (style === 1) {
      s.add(`<ellipse cx="${W / 2}" cy="${H * 0.12}" rx="${W * 0.26}" ry="${H * 0.12}" fill="${s.metal(cap)}"/>`)
      s.add(`<ellipse cx="${W / 2}" cy="${top + (H - top) / 2}" rx="${W / 2}" ry="${(H - top) / 2}" fill="${s.cyl(shade(glass, 0.3), 0.5)}"/>`)
      s.add(`<ellipse cx="${W / 2}" cy="${top + (H - top) * 0.55}" rx="${W * 0.42}" ry="${(H - top) * 0.4}" fill="${s.cyl(liquid, 0.7)}"/>`)
    } else if (style === 2) {
      s.add(`<rect x="${W * 0.32}" y="0" width="${W * 0.36}" height="${H * 0.24}" rx="${W * 0.04}" fill="${s.metal(cap)}"/>`)
      s.add(`<path d="M${W * 0.14} ${top} H${W * 0.86} L${W} ${H} H0 Z" fill="${s.cyl(shade(glass, 0.3), 0.5)}"/>`)
      s.add(`<path d="M${W * 0.2} ${top + H * 0.06} H${W * 0.8} L${W * 0.9} ${H * 0.92} H${W * 0.1} Z" fill="${s.cyl(liquid, 0.7)}"/>`)
    } else {
      s.add(`<rect x="${W * 0.25}" y="0" width="${W * 0.5}" height="${H * 0.24}" rx="${W * 0.02}" fill="${s.metal(cap)}"/>`)
      s.add(
        `<path d="M${W * 0.18} ${top} H${W * 0.82} L${W} ${top + H * 0.12} V${H - H * 0.06} L${W * 0.86} ${H} H${W * 0.14} L0 ${H - H * 0.06} V${top + H * 0.12} Z" fill="${s.cyl(shade(glass, 0.25), 0.6)}"/>`,
      )
      s.add(
        `<path d="M${W * 0.22} ${top + H * 0.06} H${W * 0.78} L${W * 0.9} ${top + H * 0.15} V${H - H * 0.1} L${W * 0.8} ${H * 0.95} H${W * 0.2} L${W * 0.1} ${H - H * 0.1} V${top + H * 0.15} Z" fill="${s.cyl(liquid, 0.8)}"/>`,
      )
    }
    // facet highlights and a small engraved plate
    s.highlight(W * 0.1, top + H * 0.05, W * 0.06, H * 0.55, 0.55)
    s.add(`<rect x="${W * 0.86}" y="${top + H * 0.08}" width="${W * 0.03}" height="${H * 0.5}" fill="#fff" opacity="0.25"/>`)
    const pw = W * 0.6
    const ph = H * 0.17
    const px = (W - pw) / 2
    const py = top + (H - top) * 0.38
    s.add(`<rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="${W * 0.02}" fill="#fff" opacity="0.82" stroke="${GOLD}" stroke-width="${Math.max(1, W * 0.012)}"/>`)
    s.text(W / 2, py + ph * 0.38, i.brand.toUpperCase(), { size: ph * 0.3, fill: i.art.ink ?? '#2A1820', spacing: ph * 0.02, maxw: pw * 0.88 })
    if (i.art.line) s.text(W / 2, py + ph * 0.74, i.art.line, { size: ph * 0.24, fill: i.art.ink ?? '#2A1820', family: 'sans', maxw: pw * 0.86 })
  },
  lipstick(s, i) {
    const { W, H } = s
    const shadeColor = i.color ?? i.art.accent ?? '#B0245A'
    if (i.art.style === 1) {
      // closed lip balm stick
      s.add(`<rect x="0" y="0" width="${W}" height="${H * 0.46}" rx="${W * 0.18}" fill="${s.cyl(i.art.cap ?? '#E8B4BE')}"/>`)
      s.add(`<rect x="0" y="${H * 0.44}" width="${W}" height="${H * 0.56}" rx="${W * 0.14}" fill="${s.cyl(i.art.body)}"/>`)
      s.add(`<rect x="0" y="${H * 0.44}" width="${W}" height="${H * 0.025}" fill="${s.metal(GOLD)}"/>`)
      s.text(W / 2, H * 0.72, i.brand.toUpperCase(), { size: W * 0.2, fill: i.art.ink ?? '#2A1820', rotate: -90, maxw: H * 0.45 })
      s.highlight(W * 0.22, H * 0.05, W * 0.12, H * 0.9, 0.3)
      return
    }
    s.add(`<rect x="0" y="${H * 0.46}" width="${W}" height="${H * 0.54}" rx="${W * 0.1}" fill="${s.metal(i.art.cap ?? GOLD)}"/>`)
    s.add(`<rect x="${W * 0.14}" y="${H * 0.36}" width="${W * 0.72}" height="${H * 0.12}" fill="${s.metal(GOLD)}"/>`)
    s.add(`<path d="M${W * 0.2} ${H * 0.37} L${W * 0.2} ${H * 0.14} Q${W * 0.2} ${H * 0.11} ${W * 0.3} ${H * 0.09} L${W * 0.8} ${H * 0.01} L${W * 0.8} ${H * 0.37} Z" fill="${s.cyl(shadeColor)}"/>`)
    s.add(`<rect x="${W * 0.06}" y="${H * 0.62}" width="${W * 0.88}" height="${H * 0.012}" fill="#000" opacity="0.25"/>`)
    s.highlight(W * 0.18, H * 0.48, W * 0.14, H * 0.48, 0.35)
  },
  gloss(s, i) {
    const { W, H } = s
    const color = i.color ?? i.art.accent ?? '#E59AAE'
    s.add(`<rect x="0" y="0" width="${W}" height="${H * 0.36}" rx="${W * 0.3}" fill="${s.metal(i.art.cap ?? GOLD)}"/>`)
    s.add(`<rect x="0" y="${H * 0.34}" width="${W}" height="${H * 0.66}" rx="${W * 0.32}" fill="${s.cyl(shade(color, 0.35), 0.4)}"/>`)
    s.add(`<rect x="${W * 0.1}" y="${H * 0.37}" width="${W * 0.8}" height="${H * 0.6}" rx="${W * 0.26}" fill="${s.cyl(color)}"/>`)
    s.add(`<rect x="${W * 0.42}" y="${H * 0.38}" width="${W * 0.16}" height="${H * 0.4}" fill="#fff" opacity="0.18"/>`)
    s.text(W / 2, H * 0.66, i.brand.toUpperCase(), { size: W * 0.22, fill: luminance(color) > 0.6 ? '#2A1820' : '#ffffff', rotate: -90, maxw: H * 0.5 })
    s.highlight(W * 0.16, H * 0.38, W * 0.12, H * 0.56, 0.45)
  },
  pen(s, i) {
    const { W, H } = s
    s.add(`<rect x="0" y="0" width="${W}" height="${H * 0.5}" rx="${W * 0.45}" fill="${s.metal(i.art.cap ?? '#111')}"/>`)
    s.add(`<rect x="0" y="${H * 0.48}" width="${W}" height="${H * 0.52}" rx="${W * 0.3}" fill="${s.metal(i.art.body)}"/>`)
    s.add(`<rect x="0" y="${H * 0.48}" width="${W}" height="${H * 0.035}" fill="${s.metal(i.art.accent ?? GOLD)}"/>`)
    s.text(W / 2, H * 0.75, i.brand.toUpperCase(), { size: W * 0.34, fill: i.art.ink ?? GOLD, rotate: -90, spacing: W * 0.04, maxw: H * 0.42 })
  },
  compact(s, i) {
    const { W, H } = s
    const r = Math.min(W, H) / 2
    const cx = W / 2
    const cy = H / 2
    const pan = i.color ?? i.art.body
    s.add(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${s.metal(i.art.cap ?? GOLD)}"/>`)
    if (i.art.style === 3) {
      // mirror compact
      s.add(`<circle cx="${cx}" cy="${cy}" r="${r * 0.86}" fill="${s.cyl('#E9EDF2', 0.5)}"/>`)
      s.add(`<path d="M${cx - r * 0.6} ${cy - r * 0.2} L${cx - r * 0.2} ${cy - r * 0.6}" stroke="#fff" stroke-width="${r * 0.08}" opacity="0.7" stroke-linecap="round"/>`)
      s.text(cx, cy + r * 0.45, i.brand.toUpperCase(), { size: r * 0.2, fill: '#6b6f78', maxw: r * 1.2 })
      return
    }
    s.add(`<circle cx="${cx}" cy="${cy}" r="${r * 0.88}" fill="${s.cyl(i.art.style === 1 ? '#F4D7DA' : '#1E1A1C', 0.4)}"/>`)
    s.add(`<circle cx="${cx}" cy="${cy}" r="${r * 0.66}" fill="${s.cyl(pan, 0.5)}"/>`)
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2
      s.add(`<circle cx="${cx + Math.cos(a) * r * 0.32}" cy="${cy + Math.sin(a) * r * 0.32}" r="${r * 0.12}" fill="${shade(pan, 0.18)}" opacity="0.7"/>`)
    }
    s.add(`<circle cx="${cx}" cy="${cy}" r="${r * 0.12}" fill="${shade(pan, 0.25)}"/>`)
    s.add(`<ellipse cx="${cx - r * 0.25}" cy="${cy - r * 0.3}" rx="${r * 0.3}" ry="${r * 0.12}" fill="#fff" opacity="0.22" transform="rotate(-30 ${cx} ${cy})"/>`)
  },
  palette(s, i) {
    const { W, H } = s
    const rose = i.art.style === 1
    const shades = rose
      ? ['#F2C6C2', '#E8A39C', '#D9877E', '#B86B61', '#F3D3B8', '#D9A273', '#B97A4E', '#8E4F3A', '#E7B7C4', '#C97B92', '#9C4E66', '#5E2A3B']
      : ['#F3E2D2', '#E6CBB0', '#D4AE8C', '#B88D6B', '#E9D3C3', '#CFA88E', '#A97C61', '#7D573F', '#F0DCC9', '#C9A38A', '#8F6A55', '#4B3428']
    s.add(`<rect x="0" y="0" width="${W}" height="${H}" rx="${W * 0.035}" fill="${s.cyl(i.art.body, 0.35)}"/>`)
    s.add(`<rect x="${W * 0.035}" y="${H * 0.05}" width="${W * 0.93}" height="${H * 0.9}" rx="${W * 0.025}" fill="none" stroke="${GOLD}" stroke-width="${Math.max(1.5, W * 0.006)}"/>`)
    s.text(W / 2, H * 0.15, i.brand.toUpperCase(), { size: H * 0.08, fill: i.art.ink ?? '#2A1820', spacing: H * 0.012, maxw: W * 0.7 })
    const gx = W * 0.08
    const gy = H * 0.25
    const gw = (W * 0.84) / 4
    const gh = (H * 0.65) / 3
    shades.forEach((c, k) => {
      const col = k % 4
      const row = Math.floor(k / 4)
      const x = gx + col * gw + gw * 0.08
      const y = gy + row * gh + gh * 0.08
      s.add(`<rect x="${x}" y="${y}" width="${gw * 0.84}" height="${gh * 0.84}" rx="${gw * 0.08}" fill="${s.vertical(shade(c, 0.18), shade(c, -0.12))}"/>`)
      if (k % 3 === 1) s.add(`<rect x="${x + gw * 0.1}" y="${y + gh * 0.1}" width="${gw * 0.3}" height="${gh * 0.2}" rx="${gw * 0.05}" fill="#fff" opacity="0.35"/>`)
    })
  },
  polish(s, i) {
    const { W, H } = s
    const style = i.art.style ?? 0
    const color = i.color ?? i.art.body
    const capH = H * (style === 2 ? 0.52 : 0.46)
    const capW = style === 3 ? W * 0.5 : W * 0.42
    s.add(`<rect x="${(W - capW) / 2}" y="0" width="${capW}" height="${capH}" rx="${W * (style === 3 ? 0.2 : 0.05)}" fill="${s.metal(i.art.cap ?? '#111')}"/>`)
    s.add(`<rect x="${W * 0.34}" y="${capH - 2}" width="${W * 0.32}" height="${H * 0.06}" fill="${s.cyl('#e9e2e6', 0.4)}"/>`)
    const top = capH + H * 0.04
    const rx = W * (style === 3 ? 0.32 : 0.16)
    s.add(`<rect x="0" y="${top}" width="${W}" height="${H - top}" rx="${rx}" fill="${s.cyl(shade(color, 0.25), 0.4)}"/>`)
    s.add(`<rect x="${W * 0.07}" y="${top + H * 0.03}" width="${W * 0.86}" height="${H - top - H * 0.06}" rx="${rx * 0.8}" fill="${s.cyl(color)}"/>`)
    if (style === 4) {
      let seed = color.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
      const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280)
      for (let k = 0; k < 70; k++) {
        const x = W * 0.12 + rnd() * W * 0.76
        const y = top + H * 0.05 + rnd() * (H - top - H * 0.1)
        s.add(`<circle cx="${x}" cy="${y}" r="${0.6 + rnd() * 1.6}" fill="${rnd() > 0.5 ? '#fff' : shade(color, 0.5)}" opacity="${0.4 + rnd() * 0.6}"/>`)
      }
    }
    if (i.art.style === 1 || luminance(color) > 0.9) {
      s.text(W / 2, top + (H - top) * 0.55, i.brand.toUpperCase(), { size: W * 0.14, fill: i.art.ink ?? '#2A1820', maxw: W * 0.8 })
    }
    s.highlight(W * 0.16, top + H * 0.04, W * 0.12, (H - top) * 0.8, 0.55)
    s.add(`<rect x="${W * 0.78}" y="${top + H * 0.08}" width="${W * 0.05}" height="${(H - top) * 0.6}" rx="${W * 0.025}" fill="#fff" opacity="0.3"/>`)
  },
  box(s, i) {
    const { W, H } = s
    const { art } = i
    const style = art.style ?? 0
    const ink = art.ink ?? '#2A1820'
    s.add(`<rect x="0" y="0" width="${W}" height="${H}" rx="${Math.min(W, H) * 0.025}" fill="${s.cyl(art.body, 0.28)}"/>`)
    if (style === 1) {
      // gift box with satin ribbon
      const rib = art.accent ?? GOLD
      s.add(`<rect x="${W * 0.66}" y="0" width="${W * 0.08}" height="${H}" fill="${s.cyl(rib, 0.5)}"/>`)
      s.add(`<rect x="0" y="${H * 0.62}" width="${W}" height="${H * 0.08}" fill="${s.vertical(shade(rib, 0.2), shade(rib, -0.2))}"/>`)
      s.add(`<ellipse cx="${W * 0.64}" cy="${H * 0.6}" rx="${W * 0.09}" ry="${H * 0.08}" fill="${shade(rib, 0.1)}" transform="rotate(-25 ${W * 0.64} ${H * 0.6})"/>`)
      s.add(`<ellipse cx="${W * 0.77}" cy="${H * 0.6}" rx="${W * 0.09}" ry="${H * 0.08}" fill="${shade(rib, -0.05)}" transform="rotate(25 ${W * 0.77} ${H * 0.6})"/>`)
      s.add(`<circle cx="${W * 0.7}" cy="${H * 0.66}" r="${Math.min(W, H) * 0.045}" fill="${shade(rib, -0.15)}"/>`)
      s.text(W * 0.33, H * 0.22, i.brand.toUpperCase(), { size: Math.min(W * 0.075, H * 0.11), fill: art.label ?? ink, spacing: 1, maxw: W * 0.58 })
      if (art.line) s.text(W * 0.33, H * 0.36, art.line, { size: Math.min(W * 0.06, H * 0.09), fill: art.label ?? ink, family: 'sans', maxw: W * 0.58 })
      s.text(W * 0.33, H * 0.85, i.size, { size: Math.min(W * 0.045, H * 0.07), fill: art.label ?? ink, family: 'sans', opacity: 0.8, maxw: W * 0.5 })
      return
    }
    // windowed retail card / carton
    const win = { x: W * 0.12, y: H * 0.3, w: W * 0.76, h: H * 0.52 }
    s.text(W / 2, H * 0.1, i.brand.toUpperCase(), { size: Math.min(W * 0.11, H * 0.06), fill: ink, spacing: 1, maxw: W * 0.86 })
    if (art.line) s.text(W / 2, H * 0.19, art.line, { size: Math.min(W * 0.085, H * 0.045), fill: ink, family: 'sans', weight: 500, maxw: W * 0.86 })
    s.text(W / 2, H * 0.92, i.size, { size: Math.min(W * 0.07, H * 0.035), fill: ink, family: 'sans', opacity: 0.8, maxw: W * 0.8 })
    const accent = art.accent ?? GOLD
    if (style === 0) {
      s.add(`<rect x="${win.x}" y="${win.y}" width="${win.w}" height="${win.h}" rx="${W * 0.04}" fill="${art.label ?? '#fff'}" opacity="0.9"/>`)
      for (let k = 0; k < 5; k++) {
        s.add(`<circle cx="${win.x + win.w * (0.2 + k * 0.15)}" cy="${win.y + win.h * (k % 2 ? 0.35 : 0.65)}" r="${win.w * 0.09}" fill="${accent}" opacity="0.55"/>`)
      }
      return
    }
    s.add(`<rect x="${win.x}" y="${win.y}" width="${win.w}" height="${win.h}" rx="${W * 0.05}" fill="${shade(art.body, 0.55)}"/>`)
    if (style === 2) {
      s.add(`<rect x="${W * 0.38}" y="${win.y + win.h * 0.04}" width="${W * 0.24}" height="${win.h * 0.92}" rx="${W * 0.12}" fill="${s.cyl(accent, 0.6)}"/>`)
    } else if (style === 3) {
      s.add(`<ellipse cx="${W / 2}" cy="${win.y + win.h * 0.55}" rx="${win.w * 0.34}" ry="${win.h * 0.42}" fill="${s.cyl(accent, 0.7)}"/>`)
    } else if (style === 4) {
      for (let k = 0; k < 4; k++) {
        s.add(`<rect x="${win.x + win.w * 0.12}" y="${win.y + win.h * (0.1 + k * 0.22)}" width="${win.w * 0.76}" height="${win.h * 0.1}" rx="${win.h * 0.05}" fill="${s.metal(GOLD)}"/>`)
        s.add(`<circle cx="${win.x + win.w * 0.2}" cy="${win.y + win.h * (0.15 + k * 0.22)}" r="${win.h * 0.05}" fill="#fbf4f0"/>`)
      }
    } else if (style === 5) {
      for (let k = 0; k < 5; k++) {
        const x = win.x + win.w * (0.12 + k * 0.17)
        s.add(`<rect x="${x}" y="${win.y + win.h * 0.32}" width="${win.w * 0.08}" height="${win.h * 0.64}" rx="${win.w * 0.03}" fill="${s.cyl('#2a1d23', 0.6)}"/>`)
        s.add(`<rect x="${x - win.w * 0.005}" y="${win.y + win.h * 0.2}" width="${win.w * 0.09}" height="${win.h * 0.13}" fill="${s.metal(GOLD)}"/>`)
        s.add(`<path d="M${x - win.w * 0.02} ${win.y + win.h * 0.21} Q${x + win.w * 0.04} ${win.y - win.h * 0.02 + k * 2} ${x + win.w * 0.1} ${win.y + win.h * 0.21} Z" fill="${shade(accent, k * 0.08)}"/>`)
      }
    }
  },
  pouch(s, i) {
    const { W, H } = s
    const { art } = i
    const style = art.style ?? 0
    if (style === 1) {
      // kessa glove
      const glove = `M${W * 0.12} ${H} V${H * 0.22} Q${W * 0.12} 0 ${W * 0.5} 0 Q${W * 0.88} 0 ${W * 0.88} ${H * 0.22} V${H} Z`
      const clip = s.uid('clip')
      s.defs.push(`<clipPath id="${clip}"><path d="${glove}"/></clipPath>`)
      s.add(`<path d="${glove}" fill="${s.cyl(art.body, 0.5)}"/>`)
      const lines: string[] = []
      for (let k = -10; k < 20; k++) {
        lines.push(`<path d="M${W * 0.12 + k * W * 0.06} ${H} l${W * 0.5} -${H}" stroke="#000" stroke-width="0.8" opacity="0.15"/>`)
      }
      s.add(`<g clip-path="url(#${clip})">${lines.join('')}</g>`)
      s.add(`<rect x="${W * 0.12}" y="${H * 0.86}" width="${W * 0.76}" height="${H * 0.14}" fill="${s.cyl(art.cap ?? '#E8D5BC', 0.4)}"/>`)
      s.add(`<rect x="${W * 0.3}" y="${H * 0.45}" width="${W * 0.4}" height="${H * 0.16}" rx="2" fill="${art.label ?? '#fff'}"/>`)
      s.text(W / 2, H * 0.53, i.brand.toUpperCase(), { size: H * 0.045, fill: art.ink ?? '#333', maxw: W * 0.36 })
      return
    }
    const outline = `M${W * 0.04} ${H * 0.12} Q${W * 0.04} ${H * 0.04} ${W * 0.14} ${H * 0.04} H${W * 0.86} Q${W * 0.96} ${H * 0.04} ${W * 0.96} ${H * 0.12} Q${W} ${H * 0.55} ${W * 0.95} ${H * 0.9} Q${W * 0.94} ${H} ${W * 0.84} ${H} H${W * 0.16} Q${W * 0.06} ${H} ${W * 0.05} ${H * 0.9} Q0 ${H * 0.55} ${W * 0.04} ${H * 0.12} Z`
    s.add(`<path d="${outline}" fill="${s.cyl(art.body, 0.45)}"/>`)
    if (style === 3) {
      const clip = s.uid('clip')
      s.defs.push(`<clipPath id="${clip}"><path d="${outline}"/></clipPath>`)
      const lines: string[] = []
      for (let k = -8; k < 12; k++) {
        lines.push(`<path d="M${k * W * 0.12} ${H} L${k * W * 0.12 + H * 0.9} ${H * 0.1}" stroke="#fff" stroke-width="1.2" opacity="0.35"/>`)
        lines.push(`<path d="M${k * W * 0.12} ${H * 0.1} L${k * W * 0.12 + H * 0.9} ${H}" stroke="#fff" stroke-width="1.2" opacity="0.35"/>`)
      }
      s.add(`<g clip-path="url(#${clip})">${lines.join('')}</g>`)
    }
    s.add(`<rect x="${W * 0.08}" y="${H * 0.1}" width="${W * 0.84}" height="${Math.max(2, H * 0.025)}" fill="${s.metal(art.cap ?? GOLD)}"/>`)
    s.add(`<rect x="${W * 0.8}" y="${H * 0.08}" width="${W * 0.05}" height="${H * 0.14}" rx="1" fill="${s.metal(art.cap ?? GOLD)}"/>`)
    const lw = W * 0.5
    const lh = H * 0.2
    s.add(`<rect x="${(W - lw) / 2}" y="${H * 0.46}" width="${lw}" height="${lh}" rx="${lh * 0.15}" fill="${art.label ?? '#fff'}"/>`)
    s.text(W / 2, H * 0.46 + lh * 0.4, i.brand.toUpperCase(), { size: lh * 0.26, fill: art.ink ?? '#2A1820', maxw: lw * 0.88 })
    if (art.line) s.text(W / 2, H * 0.46 + lh * 0.75, art.line, { size: lh * 0.2, fill: art.ink ?? '#2A1820', family: 'sans', maxw: lw * 0.86 })
  },
  roll(s, i) {
    const { W, H } = s
    s.add(`<rect x="0" y="0" width="${W}" height="${H * 0.4}" rx="${W * 0.45}" fill="${s.metal(i.art.cap ?? '#fff')}"/>`)
    s.add(`<rect x="0" y="${H * 0.36}" width="${W}" height="${H * 0.64}" rx="${W * 0.2}" fill="${s.cyl(i.art.body)}"/>`)
    label(s, W * 0.1, H * 0.48, W * 0.8, H * 0.4, i, { compact: true })
  },
}

export function renderArt(input: ArtInput): string {
  const W = Math.round(input.wCm * PX)
  const H = Math.round(input.hCm * PX)
  const s = new Svg(input.id.replace(/[^a-z0-9-]/gi, '_'), W, H)
  shapes[input.shape](s, input)
  return s.toString()
}
