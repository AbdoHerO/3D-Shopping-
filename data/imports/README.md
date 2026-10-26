# Product import manifests

`npm run import:products -- data/imports/<source>.manifest.json` adds or updates products from one
source. Every product goes through the same preparation as a photo uploaded in the admin (cut-out,
silhouette, package family, size estimate, automatic shelf placement), and a report is written to
`docs/import-reports/`.

## Rules the importer enforces

- **Permission first.** Nothing is imported unless `source.permission.status` is `"granted"`.
  Record what the permission is (`basis`, `reference`: written authorisation, licence, contract).
- **No invented data.** A product without a price or stock is imported **inactive** (not on sale)
  and listed in the report. Missing sizes are estimated and flagged as estimates in the admin.
  Descriptions, shades and claims are only what the manifest provides.
- **Idempotent.** Products are matched by `source.name` + `sourceId`; running the same manifest
  again updates them (and re-prepares a product only when its photo changed). Duplicate
  `sourceId`s in one manifest are skipped and counted.
- **Images.** A path relative to the manifest, or an `https` URL on a host listed in
  `source.imageHosts`. Files are type-checked from their bytes (JPEG, PNG, WebP, AVIF, 15 MB max),
  kept untouched under `public/products/originals/`; cut-outs go to `public/products/cutouts/`.

## Format

```json
{
  "source": {
    "name": "brand-feed",
    "label": "Brand X press kit",
    "url": "https://brand.example/press",
    "imageHosts": ["media.brand.example"],
    "permission": { "status": "granted", "basis": "Written authorisation", "reference": "email of 2026-11-02", "license": "Retail use by Maison Lumière", "attribution": "Photos © Brand X" }
  },
  "products": [
    {
      "sourceId": "SKU-123",
      "url": "https://brand.example/p/sku-123",
      "name": { "fr": "Rouge à lèvres satiné", "en": "Satin lipstick" },
      "brand": "Brand X",
      "categoryId": "makeup",
      "sizeLabel": "4,2 g",
      "price": 89,
      "stock": 12,
      "image": "images/sku-123.png",
      "family": "lipstick",
      "dimsCm": [2.2, 8.4, 2.2],
      "variants": [{ "sourceId": "01", "name": { "fr": "Rose ancien" }, "colorHex": "#b46a74", "stock": 5, "image": "images/sku-123-01.png" }]
    }
  ]
}
```

`family` (optional) is one of the package families in `src/lib/packaging.ts`; without it the
family is inferred from the name and the photo. `categoryId` must exist in the catalogue.

## Sources checked

| Source | Status | Why |
| --- | --- | --- |
| zinabel.ma (Maquillage) | Not imported | Its *Conditions d'utilisation* forbid reusing the site's texts, images and databases without Alina distribution's authorisation. See `zinabel.manifest.json`. |
| Open Beauty Facts | Not imported | Data is ODbL and photos CC BY-SA (commercial use allowed with attribution and share-alike), but it has no prices, and its makeup photos are either amateur shots on busy backgrounds or packshots whose licence is doubtful. |
