import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { assetUrl, productImage } from '@/lib/assets'
import { createLayout } from '@/lib/layout'
import { firstFreeSlot, layoutFixture, shelfItemsFor } from '@/lib/shelf-layout'
import { autoPlace } from '@/lib/auto-placement'
import type { Product } from '@/lib/types'
import { Icon } from '@/ui/Icon'
import { useLocale } from '@/ui/hooks'
import { useAdmin } from './store'
import { Card } from './ui'
import { useA } from './text'

/**
 * Front view of each fixture at scale, with the real packshots where the 3D shop will put them.
 * Select a product to move it along the shelf, to another shelf, or change its facings.
 */
export default function Placement() {
  const a = useA()
  const { text } = useLocale()
  const catalog = useAdmin((s) => s.catalog)!
  const save = useAdmin((s) => s.saveProduct)
  const layout = useMemo(() => createLayout(catalog.settings.store), [catalog.settings.store])
  const shelves = useMemo(() => layout.fixtures.filter((f) => f.stock === 'shelf'), [layout])
  const [fixtureId, setFixtureId] = useState(shelves[0].id)
  const [selected, setSelected] = useState<string | null>(null)
  const fixture = shelves.find((f) => f.id === fixtureId) ?? shelves[0]
  const result = useMemo(() => layoutFixture(fixture, shelfItemsFor(fixture, catalog.products)), [fixture, catalog.products])
  const byId = useMemo(() => new Map(catalog.products.map((p) => [p.id, p])), [catalog.products])
  const onShelf = catalog.products.filter((p) => p.placement?.fixtureId === fixture.id)
  const unplaced = catalog.products.filter((p) => !p.placement)
  const sel = selected ? byId.get(selected) : undefined

  const H = fixture.height + 0.15
  const levelProducts = (level: number) =>
    onShelf.filter((p) => p.placement!.level === level).sort((x, y) => x.placement!.slot - y.placement!.slot)

  /** Rewrites slots 0..n-1 for a level in the given order and saves the products that moved. */
  const commitLevel = async (list: Product[], level: number) => {
    for (const [i, p] of list.entries()) {
      if (p.placement!.slot !== i || p.placement!.level !== level) await save({ ...p, placement: { ...p.placement!, level, slot: i } })
    }
  }

  const move = async (dir: -1 | 1) => {
    if (!sel?.placement) return
    const list = levelProducts(sel.placement.level)
    const i = list.findIndex((p) => p.id === sel.id)
    const j = i + dir
    if (j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j], list[i]]
    await commitLevel(list, sel.placement.level)
  }
  const changeLevel = async (dir: -1 | 1) => {
    if (!sel?.placement) return
    const level = sel.placement.level + dir
    if (level < 0 || level >= fixture.levels.length) return
    const target = levelProducts(level)
    await save({ ...sel, placement: { ...sel.placement, level, slot: target.length } })
  }
  const facings = async (d: -1 | 1) => {
    if (!sel?.placement) return
    await save({ ...sel, placement: { ...sel.placement, facings: Math.min(10, Math.max(1, sel.placement.facings + d)) } })
  }
  const place = async (p: Product) => {
    const slot = firstFreeSlot(fixture, shelfItemsFor(fixture, catalog.products), p.widthCm / 100)
    if (!slot) return
    await save({ ...p, placement: { fixtureId: fixture.id, level: slot.level, slot: slot.slot, facings: 2 } })
    setSelected(p.id)
  }
  const placeAuto = async (p: Product) => {
    const placement = autoPlace(p, catalog.products.filter((x) => x.id !== p.id && x.isActive && x.placement), layout)
    if (!placement) return
    await save({ ...p, placement })
    setFixtureId(placement.fixtureId)
    setSelected(p.id)
  }
  const frame = fixture.kind === 'nailStand' ? '#1c1c1f' : fixture.kind === 'counter' ? '#d6b48c' : '#e4e4e1'
  const panel = fixture.kind === 'nailStand' ? '#2a2a2d' : fixture.kind === 'perfumeWall' ? '#fbefe0' : fixture.kind === 'counter' ? '#eef4f3' : '#f6f6f4'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-4xl text-garnet">{a('Rayons', 'Shelves')}</h1>
        <Link to={`/?zone=${fixture.id}`} className="btn-quiet h-10 !py-0 text-sm">
          <Icon name="store" size={18} />
          {a('Voir en 3D', 'See in 3D')}
        </Link>
      </div>
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
        {shelves.map((f) => (
          <button
            key={f.id}
            onClick={() => {
              setFixtureId(f.id)
              setSelected(null)
            }}
            className={`h-9 shrink-0 rounded-full px-3 text-sm ${f.id === fixture.id ? 'bg-garnet text-white' : 'bg-white ring-1 ring-ink/10'}`}
          >
            {catalog.settings.fixtureLabels[f.id] ? text(catalog.settings.fixtureLabels[f.id]) : f.id}
          </button>
        ))}
      </div>
      {(result.overflow.length > 0 || result.tooTall.length > 0) && (
        <p className="rounded-2xl bg-danger/10 p-3 text-sm text-danger">
          {result.overflow.length > 0 &&
            a(`${result.overflow.length} produit(s) ne tiennent pas sur leur étagère.`, `${result.overflow.length} product(s) do not fit on their shelf.`)}{' '}
          {result.tooTall.length > 0 && a(`${result.tooTall.length} produit(s) trop hauts pour leur étagère.`, `${result.tooTall.length} product(s) too tall for their shelf.`)}
        </p>
      )}
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Card>
          <svg viewBox={`-0.05 -0.05 ${fixture.length + 0.1} ${H + 0.1}`} className="w-full" role="img" aria-label={text(catalog.settings.fixtureLabels[fixture.id])}>
            <rect x={0} y={H - fixture.height} width={fixture.length} height={fixture.height} rx={0.02} fill={frame} />
            {fixture.bays.map((b, i) => (
              <g key={i}>
                <rect x={b.u0} y={H - fixture.height + 0.04} width={b.u1 - b.u0} height={fixture.height - 0.08} fill={panel} rx={0.01} />
                {b.levels.map((l) => (
                  <rect key={l} x={b.u0} y={H - fixture.levels[l]} width={b.u1 - b.u0} height={0.015} fill={fixture.kind === 'nailStand' ? '#555' : '#c8c8c4'} />
                ))}
              </g>
            ))}
            {result.facings.map((f) => {
              const p = byId.get(f.productId)
              if (!p) return null
              const v = f.variantId ? p.variants.find((x) => x.id === f.variantId) : null
              const isSel = selected === p.id
              return (
                <image
                  key={f.key}
                  href={assetUrl(productImage(p, v))}
                  x={f.u - f.widthM / 2}
                  y={H - f.y - f.heightM}
                  width={f.widthM}
                  height={f.heightM}
                  preserveAspectRatio="xMidYMax meet"
                  onClick={() => setSelected(p.id)}
                  style={{ cursor: 'pointer', opacity: selected && !isSel ? 0.45 : 1 }}
                />
              )
            })}
          </svg>
          <p className="mt-2 text-xs text-mist">{a('Touchez un produit pour le déplacer.', 'Tap a product to move it.')}</p>
        </Card>
        <div className="flex flex-col gap-4">
          <Card title={sel ? text(sel.name) : a('Aucun produit choisi', 'No product selected')}>
            {sel?.placement ? (
              <div className="flex flex-col gap-3 text-sm">
                <p className="text-mist">
                  {a('Étagère', 'Shelf')} {sel.placement.level + 1} · {a('position', 'position')} {Math.round(sel.placement.slot) + 1} · {sel.placement.facings} {a('de face', 'facings')}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button className="btn-quiet h-10 !py-0" onClick={() => move(-1)}>
                    {a('◀ Vers la gauche', '◀ Left')}
                  </button>
                  <button className="btn-quiet h-10 !py-0" onClick={() => move(1)}>
                    {a('Vers la droite ▶', 'Right ▶')}
                  </button>
                  <button className="btn-quiet h-10 !py-0" onClick={() => changeLevel(1)}>
                    {a('▲ Étagère au-dessus', '▲ Shelf above')}
                  </button>
                  <button className="btn-quiet h-10 !py-0" onClick={() => changeLevel(-1)}>
                    {a('▼ Étagère en dessous', '▼ Shelf below')}
                  </button>
                  <button className="btn-quiet h-10 !py-0" onClick={() => facings(-1)}>
                    {a('− Un de face', '− One facing')}
                  </button>
                  <button className="btn-quiet h-10 !py-0" onClick={() => facings(1)}>
                    {a('+ Un de face', '+ One facing')}
                  </button>
                </div>
                <div className="flex justify-between">
                  <Link to={`/admin/products/${sel.id}`} className="text-garnet">
                    {a('Modifier la fiche', 'Edit product')}
                  </Link>
                  <button className="text-mist hover:text-danger" onClick={() => save({ ...sel, placement: null }).then(() => setSelected(null))}>
                    {a('Retirer du rayon', 'Remove from shelf')}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-mist">{a('Choisissez un produit sur le dessin.', 'Pick a product on the drawing.')}</p>
            )}
          </Card>
          <Card title={a('Pas encore en rayon', 'Not on a shelf yet')}>
            {unplaced.length === 0 ? (
              <p className="text-sm text-mist">{a('Tous les produits sont en rayon.', 'Every product is on a shelf.')}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {unplaced.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 text-sm">
                    <img src={assetUrl(p.image)} alt="" className="h-10 w-8 object-contain" />
                    <span className="min-w-0 flex-1 truncate">{text(p.name)}</span>
                    <button className="btn-quiet h-8 !px-3 !py-0 text-xs" onClick={() => placeAuto(p)} title={a('Choisit le rayon et l’étagère', 'Chooses the fixture and shelf')}>
                      {a('Auto', 'Auto')}
                    </button>
                    <button className="btn-quiet h-8 !px-3 !py-0 text-xs" onClick={() => place(p)}>
                      {a('Mettre ici', 'Place here')}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
