# Redesign plan: real boutique, product-to-3D, MVP catalogue

Status: working plan for the October 2026 redesign. Sources: the six TIFAWIN photographs and the
3D concept (kept out of git, see `docs/reference/tifawin/README.md`), the visual-planning PDF, the project documentation and the
code itself (audited first).

## What the audit found

| Area | Current state | Decision |
| --- | --- | --- |
| Room plan | `src/lib/layout.ts` builds 7 fixtures (counter, 5 walls, island) from width/depth/ceiling; unit-tested | **Modify**: new fixture set from the photos (no island), estimates in one config object |
| Shelf packing | `src/lib/shelf-layout.ts` packs products per level and bay | **Reuse**; add flat orientation and more facings |
| Products in 3D | `src/three/Products.tsx` + `atlas.ts`: flat photo cards, one instanced mesh per atlas page | **Replace the card** by package models; keep the atlas, instancing, picking and highlight |
| Scene shell | `Room`, `Fixtures`, `Facade`, `Decor`, `Lighting`, `materials` in a plum-and-gold style | **Rewrite** to the photos: checkered floor, ceiling grid, white shelving, glass counter, dark shopfront |
| Camera | `rig.ts` viewpoints derived from fixtures; walk mode with AABB colliders | **Reuse**; viewpoints now keep the camera in the aisle in front of the counter |
| Product data | `Product.shape` (16 values), `widthCm/heightCm/depthCm`, `image`, `placement` | **Reuse**; `shape` becomes the package family (wider list); add `asset` and `source` |
| Admin | Product editor uploads a 900 px WebP, no processing state | **Extend**: original kept, automatic preparation after save, status, retry, overrides |
| Live DB | `products.shape` has a CHECK on 16 values | **Migration**: new family list, `asset jsonb`, `source jsonb` |
| Image tooling | `sharp` (dev) for Node, canvas in the browser | Shared pipeline core works on raw RGBA, with a browser and a Node adapter |

## Approach per workstream

1. **Boutique.** Long narrow room. Left wall: tall white shelving (hair, body, makeup). Back wall:
   shelving over a light-oak base cabinet with a stool. Right wall: perfume shelving behind a
   glass-topped oak counter (L-shaped, checkout screens at its rear end) and gift boxes further
   back. Front: black-framed vitrine inside each shop window facing the street, a freestanding
   nail-polish stand near the entrance. Shell: grey/white checkered floor, white 60 cm ceiling
   grid with round downlights, black shopfront with raised illuminated sign (text and logo from
   settings), soffit downlights. Width, depth and ceiling stay 3.5 × 6.5 × 3.0 m: the owner's own
   estimate ("3 or 4 m" by "6 or 7 m"), not a measurement.
2. **Product-to-3D.** Every product = a reusable package family (perfume, bottles, jars, tubes,
   makeup, boxes, sprays…) swept from a silhouette profile. When the photo has a clean cutout, the
   profile is measured from the photo itself, so the model's outline matches the real product, and
   the photo is projected onto the front. Without a cutout the product becomes a thin card (fallback)
   and is flagged for review. Processing runs after save, never blocks it, records status, notes and
   errors, and can be retried. An optional image-to-3D provider sits behind an interface; none is
   configured, so it reports "not configured" and the procedural model is used.
3. **Catalogue import.** Only if Zinabel's terms and robots rules allow it; otherwise import
   nothing from it, keep the reasons, and run the same pipeline on the existing catalogue.

   Finding (26 Oct 2026): zinabel.ma is reachable (PrestaShop, 620 makeup items, robots.txt allows
   category and product pages with `Crawl-delay: 10`), but its *Conditions d'utilisation*
   (https://www.zinabel.ma/content/3-conditions-utilisation, operator Alina distribution SARLAU)
   say the site's texts, images and databases may not be used, reproduced, copied or published
   without its authorisation, for commercial or non-commercial purposes. **Nothing is imported from
   Zinabel.** The importer accepts only sources explicitly marked as permitted (licence or written
   authorisation recorded per source), so Zinabel can be added once Alina distribution agrees in
   writing, or the owner can feed it supplier data and their own photos.

## Dependencies

Families and asset types first (used by scene, admin and importer) → layout → scene → admin
pipeline → importer → tests and screenshots.

## Acceptance checks

Unit: layout fits several room sizes with no overlaps and a clear aisle; shelf packing with flat
items; pipeline (cutout, profile, family inference, dimension estimates, status); importer
idempotency on fixtures. SQL: migration applies on top of the existing schema. E2E: walk in, tap a
product, add, WhatsApp; admin creates a product with a photo and sees it prepared and placed;
Arabic RTL; catalogue fallback. Plus lint, type check, build, desktop and phone screenshots.

## Outcome (26 Oct 2026)

| Item | State |
| --- | --- |
| Boutique rebuilt from the photos (shopfront, floor, ceiling, shelving on three walls, glass counter, polish stand, window displays) | Done; sizes are estimates in `SHOP` (`src/lib/layout.ts`) and the room's width, depth and ceiling in Settings |
| Configurable shopfront sign (title, subtitle, logo) | Done; defaults to "MAISON LUMIÈRE / PARFUMERIE" until the owner confirms the branding |
| Package library (33 families) with photo-measured outlines | Done |
| Image pipeline (checks, original kept, cut-out, outline, family, size estimate, statuses, retry) | Done in the browser (admin) and in Node (scripts); tested in demo mode |
| Automatic shelf placement with admin overrides (fixture, shelf, position, orientation, facings, scale) | Done |
| Image-to-3D provider | Interface, polling, GLB validation and timeouts done and tested with a fake provider; no provider configured; GLB rendering not wired |
| Live database | Migration `20261026000200_product_assets.sql`, tested in PGlite; not run against a real Supabase project here |
| Zinabel import | Not done: its terms forbid reuse. Importer built, permission-gated, tested on synthetic fixtures |
