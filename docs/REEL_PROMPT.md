# Tifawin — Instagram Reel brief v2 (60 s, 9:16, code-rendered 3D motion graphics)

A complete production prompt. Paste it into a session that has the **code-rendered-motion-video**
skill, or hand it to a motion designer or developer together with that skill file. It contains the
goals, the story, the signature "wow" shots, the edit on a beat grid, the look, the real assets to
use, the honesty rules, the render plan and the deliverables.

---

## 0. Kickoff (paste this first)

```
Use the code-rendered-motion-video skill and follow docs/REEL_PROMPT.md in this repository.
Product: Tifawin Parfumerie — a real perfumery whose shop customers can now walk through in 3D:
browse the shelves, tap any product, fill a basket and order on WhatsApp, cash on delivery.
Platform: Instagram Reel, 1080×1920 (9:16), 30 fps, 60.0 s (30 bars at 120 BPM).
Audience: women in Morocco who buy perfume, makeup, hair and skin care, mostly on their phone.
Goals, in order: stop the scroll, make them want the products, show how easy buying is,
send them to the 3D boutique (link in bio) AND to the physical shop.
Quality bar: a premium perfume commercial crossed with an Apple-style product film. Style frames
first (§12), then animation. Real features only (§4). Real assets from this repository (§10).
Original synthesized music (§8). Video project in video/tifawin-reel/, separate from the website.
Deliver §15. Do not stop until the MP4 exists and is verified.
```

---

## 1. Goals and what the viewer must feel

| Goal | Viewer reaction we want | How the film earns it |
| --- | --- | --- |
| **Stop the scroll** (first 1.5 s) | "What is that?" | Frame 1 is a gorgeous macro of a perfume, then a pull-back to the whole shop floating as a lit miniature (§6, shot 1) |
| **Desire** | "I want that" | Perfume-ad beauty shots of real products: glass, light sweeps, shallow depth of field, an exploded view |
| **Wonder** | "A shop I can walk into from my phone?!" | The shop builds itself; the 3D world spills out of the phone screen; one continuous camera move from the street to the shelves |
| **Ease** | "That's only three taps" | TOUCHE. CHOISIS. AJOUTE. counted on beats; products fly into the basket |
| **Trust** | "I pay when it arrives, and a real person answers" | Cash on delivery, the shop's WhatsApp confirmation, the order number on a parcel |
| **Go** | "I'll open the link / I'll pass by the shop" | Two clear calls to action: the 3D boutique (link in bio) and the real shop (address once confirmed), on a 3D → real-photo match cut |

The video is an ad: every second must either delight or persuade. Nothing is explained in
sentences; everything is shown.

---

## 2. Format and technical spec

| Item | Value |
| --- | --- |
| Canvas | 1080 × 1920, 9:16 |
| Frame rate | 30 fps, shutter 0.5 (180°) |
| Duration | **60.0 s** = 30 bars of 4/4 at **120 BPM** (beat 0.5 s, bar 2.0 s) |
| Video | H.264 High 4.2, yuv420p, BT.709 primaries/transfer/matrix, CRF 17 delivery, CRF 14 master |
| Audio | AAC 48 kHz stereo, 256 kb/s; −14 LUFS integrated, true peak ≤ −1.5 dBTP |
| Safe zone (organic reel) | all words, logo, CTA and key UI inside **x 60–940, y 220–1500**; imagery may be full-bleed |
| Legibility | headline ≥ 110 px, support ≥ 48 px, annotations ≥ 30 px; ≤ 5 words per card, held ≥ 1.2 s (single slam words on beats excepted) |
| Grain / flashes | grain 0.025–0.035; ≤ 3 full-frame flashes per second, no red strobes |
| Loop | the last frame hands off to the first (§9, plate 12) |
| Cover | a poster-worthy frame (the miniature shop or the sign), title inside the central 3:4 |

---

## 3. Story in one paragraph

**"Entre. Regarde. Prends."** A drop of gold light runs down a perfume bottle in extreme close-up.
The camera pulls back, faster and faster, out through the ceiling, until the whole Tifawin shop
floats in the dark like a lit jewel box, every shelf full. Three words slam on the beat. The camera
dives to the street: the TIFAWIN letters fly into place, the lights snap on, the doors slide open
on the drop, and in one continuous move we glide inside while the shelves rise from the floor and
products rain into place. A phone appears; the shop spills out of its screen. Each tap on a section
whips us to a wall; then we stroll freely. One perfume turns in a pool of light and opens into its
parts like a jewel. Then the core: touch, choose a shade, add — three products leap out of the
phone into a real 3D basket. One message on WhatsApp, cash on delivery, a parcel stamped with the
order number. The card flips to Arabic and English. A burst of every wall, then the 3D storefront
dissolves into a photograph of the real shop: "La vraie boutique t'attend." End card: order online,
or come to the shop. The last frame dives back toward the perfume where the film began.

**Tone:** warm, luminous, precise, feminine without clichés, confident. Hold-then-snap motion,
generous negative space, one gold accent.
**Not:** neon, cyberpunk, lens-flare soup, glitter storms, stock "luxury" particles, emoji, outlined
type, template transitions, anything that looks AI-generated.

---

## 4. What is real (the only things the video may show or claim)

All taken from the website in this repository. Show them working; never claim more.

| Feature | Where it lives | What to show |
| --- | --- | --- |
| Black shopfront with the lit **TIFAWIN / PARFUMERIE** sign, sliding doors, window displays | `src/three/Facade.tsx`, settings `storefront` | storefront, doors opening |
| The real shop layout: checkered floor, white ceiling grid with round lights, white shelving on three walls, glass counter on oak, nail-polish stand | `src/lib/layout.ts`, `src/three/Room.tsx`, `Fixtures.tsx` | the miniature, interior, walls |
| **8 sections**: Vernis, Cheveux, Corps & hygiène, Maquillage, Soins visage, Coffrets, Parfums, Comptoir & caisse | `src/ui/ZoneBar.tsx`, `settings.fixtureLabels` | tap a chip → the camera glides to that wall |
| Swipe to look, free walking (keys, or a joystick on phones), minimap "Vous êtes ici" | `src/three/CameraRig.tsx`, `src/ui/Overlay.tsx` | gestures, joystick walk |
| Every product on its shelf as a 3D package made from its photo, every shade shown | `src/three/Products.tsx`, `packageGeometry.ts` | beauty shots, shelf density |
| Tap a product → card with name, size, price, shade picker, quantity, "Ajouter au panier"; the chosen shade is highlighted on the shelf | `src/ui/ProductSheet.tsx`, `Products.tsx` | the core action |
| Added products fly into a 3D basket (pink weave, gold rim) and the basket count updates | `src/three/Basket.tsx`, `src/ui/Header.tsx` | fly-to-basket |
| Checkout: name, phone, city, address; **paiement à la livraison** | `src/ui/Checkout.tsx` | typed form |
| Order number like `TF-261026-7KQ4`; a ready-to-send WhatsApp message in the customer's language; "Nous vous répondons pour confirmer la livraison." | `src/lib/whatsapp.ts`, order page | message building, trust line |
| "Nouveau" and "Promo" badges | `ProductSheet`, catalogue data | only on products that really carry them |
| French, Arabic (right to left), English | `src/i18n/*.ts` | the card flipping language |
| Product list without 3D, on any device | `/catalog` | one beat in the montage |

**Real UI copy to reuse verbatim** (`src/i18n/fr.ts`): "Entrer dans la boutique", "Ajouter au panier",
"Teinte", "Votre panier", "Commander", "Paiement à la livraison", "Valider la commande",
"Envoyer ma commande sur WhatsApp", "Rayon {zone}. Touchez un produit pour le voir.",
"Utilisez le joystick pour marcher, glissez pour regarder", "Vous êtes ici".

The real WhatsApp message (`buildWhatsAppMessage`, French):
```
Bonjour 👋 Je souhaite passer la commande #TF-261026-7KQ4

• 1 × <produit> — <prix>
Livraison : <ville> — <frais>
Total : <total> (paiement à la livraison)

Nom : …   Tél : …   Adresse : …
```

---

## 5. Honesty rules (blocking: check them before the final render)

The products in `public/data/catalog.json` are **demo content** today (`source.kind: "demo"`):
fictional products, brands, prices and stock. The shop's own catalogue is not loaded yet.

- **Pre-flight gate.** At render time read the catalogue. If a product shown has
  `source.kind === "demo"`: no readable prices, totals or delivery fees (soft band or crop), no
  fictional brand names in large type, and a small mono footnote `PRODUITS DE DÉMONSTRATION` on
  product plates. With the real catalogue loaded, drop both and re-render: the edit is the same.
  **Strongly preferred:** load at least 8–12 real hero products (real photos, names, prices) before
  the final render — the beauty shots sell far better with products customers recognise.
- **Shop details** (address, city, hours, phone number, website address, Instagram handle) appear
  only once the owner confirms them. The WhatsApp bubble never shows a recipient number.
- **"Livraison partout au Maroc"** and **"paiement à la livraison"** are the website's own copy;
  the owner confirms both before publishing.
- No ratings, review counts, customer numbers, "best price", "N° 1", countdowns or fake urgency.
  No "IA" claims: say "en 3D", never "généré par IA".
- No third-party logos or trademark designs: a generic phone (no Apple/Samsung cues), a generic chat
  bubble (no WhatsApp logo or interface copy; the word "WhatsApp" only as plain text, as in the
  website's button). Brands appear only on the shop's real products, from photos it may use.
- No photoreal people, faces or hands. A touch is a gold ring (§7). Faces in the real shop photo are
  blurred or cropped out.
- No maps of Morocco (border depictions are sensitive); show delivery with a parcel, not a map.
- Customer details typed in the checkout are fictional and masked (`Salma B.`, `06 •• •• •• ••`).
- Nothing imported from other websites (e.g. Zinabel) appears: nothing was imported.

---

## 6. The nine signature shots ("wow" moments)

Each must work as a still: a frame you would post on its own. Render each as a **style frame**
first (§12) and get it approved before animating.

1. **Macro to miniature (hook, 0–2 s).** Extreme close-up of a perfume on the lit glass shelf: a
   gold light sweep travels down the glass, shallow depth of field, warm bokeh of the bays behind.
   The camera pulls back in one accelerating move (`inExpo`, ×300 distance), through the ceiling
   grid, until the entire shop floats in black as a cutaway miniature: ceiling removed, the four
   walls full of products, the checkered floor, the counter, the stand, every downlight glowing.
   Seen from 3/4 above (the "plan 3D" view), slowly rotating.
2. **The sign assembles (4–8 s).** Seven extruded letters T-I-F-A-W-I-N fly in from hashed offsets
   and lock with a spring, one per 8th note: white faces, gold sides. A light sweep crosses them,
   the soffit downlights snap on, PARFUMERIE writes on underneath.
3. **One continuous take in (8–14 s).** The doors slide open on the drop and the camera glides in
   without a cut, down the real aisle at eye height.
4. **The shop builds itself (10–14 s).** As we enter, the shelves rise out of the checkered floor
   and products drop into place bay by bay on 16th notes (each with a tiny spring bounce and a soft
   "tick"), the ceiling lights switch on in a wave toward the back wall. Satisfying and dense.
5. **Out of the phone (14–40 s, recurring).** A floating phone shows the shop; the 3D world is not
   trapped in the screen: shelves and light extend past the bezel into the reel, products leap
   out of the screen. The phone tilts with each gesture (parallax ±6°).
6. **Whip pans (14–22 s).** Each section tap whips the camera 60–90° in 5 frames with real motion
   blur; the section name lands as extruded type floating in the aisle.
7. **Perfume beauty shot (26–30 s).** One hero product turns slowly in a pool of light, macro lens,
   then opens like a jewel: the cap lifts, the bottle and its label separate in space (exploded
   view), its shades orbit as a ring, everything reassembles on the downbeat.
8. **Into the basket, then the parcel (30–48 s).** Products arc out of the phone into the website's
   3D basket (pink weave, gold rim) with squash-and-settle. Later the WhatsApp bubble folds into a
   kraft parcel that closes; a gold label stamps the order number on it.
9. **3D becomes real (54–56 s).** The 3D storefront, framed exactly like the owner's photograph,
   dissolves along a light sweep into the **real photo of the shop**: "La vraie boutique t'attend."

---

## 7. Look: palette, type, motifs, lighting, lenses

### Palette (linear HDR in the engine; only `signal` may bloom)

| Token | Hex | Role |
| --- | --- | --- |
| `ink` | `#0B0A0B` | storefront black, the void around the miniature, type plates |
| `ink2` | `#17151A` | panels, phone body |
| `graphite` | `#3A373C` | secondary lines, inactive UI |
| `bone` | `#F4F1EA` | display type, sign letter faces |
| `signal` | `#C9A46A` | **the only glow**: tap rings, sign sides, light sweeps, CTA underline |
| `hot` | `#FFE7B0` | core of a glow, perfume-bay light |
| `shadow` | `#5E4520` | deep gold shadow |
| `kraft` | `#B58A5A` | the parcel |
| UI (inside the phone only) | `#FBF5F3` porcelain, `#6B1F3D` garnet, `#C9A46A` champagne, `#2A1820` ink | the website as it really is |
| floor | `#EDEBE8` / `#9C9A98` | the shop's checker |

Product colours stay on the products. Type never exceeds ~0.8 and never blooms.

### Typography (OFL; Jost, Cormorant Garamond and Tajawal are already in `node_modules/@fontsource`)

- **Display:** Jost 700–800 capitals, tracking −0.02 em, 140–220 px; echoes the sign. Big words can
  be **extruded 3D type placed in the scene** (in the aisle, beside the miniature), lit like the sign.
- **Accent:** Cormorant Garamond 500 italic (the website's display face), 64–90 px, used sparingly
  (walk-in line, beauty shot, real-shop line, CTA).
- **Machine voice:** IBM Plex Mono 500 (add `@fontsource/ibm-plex-mono`), capitals +0.14 em, 30–36 px.
- **Arabic:** Tajawal 500/700/800, right to left.
- Kerned layout, lining figures, typographic apostrophes (’) and guillemets (« »).

### Motifs

1. **The gold touch ring**: every interaction; also the iris transition.
2. **The checker grid**: tiles flip on 16ths as a wipe; the floor of the type plates.
3. **The gold edge**: the light sweep on the sign returns on the beauty shot, the 3D-to-real
   dissolve and the CTA.

### Lighting and lenses (per shot)

| Shot | Lens (vertical FOV) | Light |
| --- | --- | --- |
| Macro product / beauty | 18–22° (≈ 85–100 mm), depth of field (focus on the label, bays blurred) | the perfume bay's warm backlight, a soft key from top-left, a gold rim, one moving light sweep |
| Miniature | 28–32°, slow 3/4 orbit | black void, interior lights only, subtle ground glow |
| Street / sign | 34–40°, crane | night: sign glow, soffit pools on the pavement, cool ambient |
| Interior walk | 48–52° at 1.6 m eye height | the website's neutral white interior |
| Phone plates | 30–34° | soft studio key, gold rim on the phone edge |

Glass uses physical transmission only in close-ups (expensive); elsewhere the website's cheaper
materials. Depth of field: blurred background pass composited behind the subject.

### Gesture vocabulary (the "3D interaction" must be visible)

| Gesture | How it is drawn |
| --- | --- |
| Tap | gold ring (`outExpo`, 0 → 90 px, alpha 1 → 0 in 0.35 s), the element presses to 0.96 |
| Swipe to look | a gold trail follows the fingertip path; the camera pans with it; the phone tilts |
| Pinch to approach | two rings converging; the camera dollies in |
| Joystick walk | thumb disc with a gold ring; footstep marks fade on the floor |
| Add to basket | the product leaves along an arc with a short gold streak, lands in the basket with a squash |

---

## 8. Music and sound

**Route:** original synthesized bed (publishable, no licence risk), 120 BPM, 30 bars. If the owner
supplies a licensed track, build a review version on its grid; keep this one as the publishable master.

**Character:** modern, warm, elegant pop-house: round sub bass, soft side-chained pads, a plucked
hook (harp/oud-like, synthesized), light percussion with subtle frame-drum (darbuka-style) rolls
into the drops; no vocals, or a wordless breathy pad.

| Bars | Section | Music | Picture |
| --- | --- | --- | --- |
| 0–2 | hook | filtered pluck; sub drop + impact at bar 1 (2.0 s) | macro → miniature; ENTRE. REGARDE. PRENDS. |
| 2–4 | build | riser, frame-drum roll | sign assembles, lights |
| 4–11 | drop A | full groove | doors open (8.0 s), shop builds, section whips |
| 11–15 | break | drums thin out, pad + pluck | free walk, beauty shot |
| 15–16 | build | riser, snare roll | tap → card |
| 16–24 | drop B | full groove, extra percussion | choose, add ×3, order, parcel |
| 24–28 | lift | counter-melody | languages, montage, real shop |
| 28–30 | outro | hook motif, final hit at bar 29 (58.0 s), loopable tail | end card, loop dive |

**Sound design** (scene-owned `cues()`; SFX bus ~8 dB under music; duck music 2–4 dB on big hits):
glass "tink" per tap, whooshes on whips, a mechanical slide for the doors, soft ticks as products
land on shelves (16ths, pitch varied), very soft tile footsteps during the walk, a bright pop and a
chime rising in pitch for items 1–3 in the basket, keyboard ticks on 16ths, a generic "send" swoosh
(not WhatsApp's sound), a cardboard fold and a stamp thud for the parcel, a warm low impact under
the end card. Render picture once, silent; mux audio afterwards.

---

## 9. The edit: plates on the beat grid

`B(i)` = time of beat `i` (0.5 s each); bar `k` starts at `2k` s. Copy is French (§11 has AR/EN).

| # | id | Bars | Time (s) | Copy on screen | Picture | Hand-off out |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `hook` | 0–2 | 0.0–4.0 | **ENTRE.** (B4) **REGARDE.** (B5) **PRENDS.** (B6), extruded 3D type beside the miniature | Shot 1: macro perfume → pull-back → floating miniature shop | the camera dives toward the miniature's door (B7–B8) |
| 2 | `storefront` | 2–5 | 4.0–10.0 | the sign; mono `PARFUMERIE · BOUTIQUE EN 3D` (B12) | Shot 2 at night; doors open on **8.0 s**; shot 3 begins | continuous take through the doors |
| 3 | `build` | 5–7 | 10.0–14.0 | *Comme si tu y étais.* (Cormorant italic, B21) | Shot 4: shelves rise, products rain in on 16ths, light wave | the phone slides up (B27); the view becomes its screen |
| 4 | `sections` | 7–11 | 14.0–22.0 | **8 RAYONS** (B28), then one chip name per bar: PARFUMS · MAQUILLAGE · VERNIS · SOINS VISAGE | Shots 5–6: the real section bar in the phone, tap per bar, whip, extruded chip name in the aisle; the website's hint "Rayon … Touchez un produit pour le voir." | the phone tilts away; full-screen first person |
| 5 | `walk` | 11–13 | 22.0–26.0 | **OU BALADE-TOI.** (B44); mono `GLISSE POUR REGARDER` | Swipe trail, joystick walk, minimap path drawing in gold | the camera stops at the perfume wall |
| 6 | `beauty` | 13–15 | 26.0–30.0 | *Chaque produit, en 3D.* (B53); demo footnote if needed | Shot 7: beauty shot, exploded view, shade ring, reassembles on B58 | gold ring tap on the product (B60) |
| 7 | `take` | 15–20 | 30.0–40.0 | **TOUCHE.** (B60) **CHOISIS.** (B64) **AJOUTE.** (B68); basket count 0 → 1 → 2 → 3 | The real product card slides up; 4 shade taps on beats, each highlighting that shade on the shelf; add → shot 8 (out of the phone into the 3D basket). A lipstick (B72) and a perfume (B76), faster, on the kicks | the basket opens into the drawer (B80) |
| 8 | `order` | 20–24 | 40.0–48.0 | **COMMANDE EN UN MESSAGE.** (B84); mono `PAIEMENT À LA LIVRAISON` (B88); *On te répond pour confirmer.* (B91) | Drawer → "Commander" → fields typed on 16ths → "Valider la commande" → "Commande n° TF-…" stamps → "Envoyer ma commande sur WhatsApp" → message builds line by line in a generic bubble → send (B93) → bubble folds into the parcel, label stamps (B94) | the parcel slides out of frame |
| 9 | `languages` | 24–26 | 48.0–52.0 | **Français · العربية · English** (one per 2 beats) | The card flips FR → AR (whole layout mirrors right to left) → EN | the card shrinks to a tile |
| 10 | `montage` | 26–27 | 52.0–54.0 | **SUR MOBILE ET ORDINATEUR.** (B104) | 8th-note cuts: perfume glow, palettes under the counter glass, the stand, hair wall, back wall, the list view on a laptop and on a phone | cut to the 3D storefront, framed as the real photo |
| 11 | `realshop` | 27–28 | 54.0–56.0 | *La vraie boutique t'attend.* (B108); address/hours line only if confirmed | Shot 9: 3D storefront → real photo along the gold sweep; photo presented as a framed card with a soft shadow, faces blurred, clutter cropped | the photo card slides back; the 3D sign returns |
| 12 | `endcard` | 28–30 | 56.0–60.0 | **TIFAWIN** · *Commande en ligne — lien en bio* · *Ou passe en boutique* (+ city/address if confirmed) | Sign hero, light sweep (B112), CTAs inside the safe zone; final 0.75 s: dive through the doorway toward the perfume wall, landing on frame 1's framing | **loop** into plate 1 |

### Plate notes

- **1 · hook.** Frame 1 must already be beautiful (it is also a candidate cover). The pull-back is
  one unbroken move: macro → the bay → the perfume wall → the room → through the ceiling grid →
  the floating miniature. The miniature's sign band is still blank and dark: the letters arrive in
  plate 2. Words are extruded type floating around the miniature, each slam on its
  beat with a 2-frame shake. Then the camera dives toward the miniature's doorway and the scale
  change hides the cut to the full-size street.
- **2 · storefront.** The website's real façade. Letters on 8ths from B8 to B11; sweep at B12;
  lights on B14 and B15; doors open on 8.0 s exactly (music hit). Crane from the sign down to eye
  height while the doors open, then an `inExpo` glide through the opening.
- **3 · build.** Continue the same camera move. Shelves rise (each bay 0.25 s, `outBack`), products
  drop in by level from top to bottom on 16ths, the light wave runs to the back wall. Calm,
  satisfying, dense; the one Cormorant line.
- **4 · sections.** Generic dark phone, slight yaw (−0.12 rad); the screen shows the 3D view, and
  the same 3D scene continues outside the bezel (render the scene once, mask the phone area with
  the UI overlay, let geometry pass the edge). Chip tap → garnet → whip → extruded section name in
  the aisle → website hint. One section per bar.
- **5 · walk.** Swipe trail first (B44), then the joystick walk with ≤ 1.5 cm head-bob, minimap
  top-left drawing a gold path. Real hint text once.
- **6 · beauty.** Fewer elements, slower: the breath before the drop. Exploded view uses the
  package geometry's parts (cap, neck, body, label plane) separated along the bottle's axis.
- **7 · take.** The heart of the film. The card is the real ProductSheet layout. Each add: product
  leaves the screen in 3D, arcs over the bezel into the basket (outside the phone), squash, chime,
  counter rolls. Items 2 and 3 take one bar each.
- **8 · order.** Fictional masked data; stamp the order number (scale 1.4 → 1 in 60 ms, 3°
  rotation); generic bubble lines on 8ths; the bubble folds (two 90° hinges) into the parcel;
  gold label with `TF-261026-7KQ4` stamps (B94). Trust lines one at a time: the payment line from
  B88, replaced by the reply line from B91 to B95.
- **9 · languages.** Translations from the website itself; Arabic mirrors the whole card.
- **10 · montage.** Eight cuts, eight idioms, no new information: energy and scale.
- **11 · realshop.** Match the 3D camera to the photo's framing (frontal, centred on the doorway)
  so the dissolve is seamless. Crop the ladder, boxes and mirror at the bottom of the photo; blur
  faces; if the owner sends a cleaner photo or a short video of the shop, use it instead.
- **12 · endcard.** Two CTA lines, the primary bigger. The final dive must cut invisibly into frame 1.

---

## 10. Real assets and how to build each layer

### 3D (the shop itself): reuse the website's code, not a re-modelled copy

- Data: `public/data/catalog.json`, `public/products/**`, `public/textures/**`.
- Pure modules (read-only, alias `@app/*` → `../../src/*`): `lib/layout.ts` (`createLayout`, `SHOP`),
  `lib/shelf-layout.ts`, `lib/packaging.ts`, `three/packageGeometry.ts`, `three/facings.ts`,
  `three/atlas.ts`, `three/materials.ts`, `three/textures.ts`, `three/room-geometry.ts`, `three/fonts.ts`.
- **Approach A (time-box 1 hour):** mount the website's R3F components (`Room`, `Fixtures`,
  `Facade`, `Decor`, `Products`, `Basket`) with `createRoot`, `frameloop: 'never'`, the catalogue
  store hydrated once; never mount `CameraRig` or `Effects`; drive the camera, door opening and
  highlights from `t`. Prove determinism: the same `t` rendered twice, and in reverse order, gives
  identical pixels.
- **Approach B (fallback):** rebuild in plain three.js from the same modules; move any geometry
  builder out of a `.tsx` file into a `.ts` module **without changing its output**, keeping the
  website's lint, type check, unit and e2e tests green.
- The miniature (shot 1) is the same scene without the ceiling, seen from outside; the "shop
  builds itself" (shot 4) animates the website's fixture and product transforms from `t`.
- Lighting: the website's neutral interior; engine `NoToneMapping` + the engine's tone shoulder;
  bloom threshold ≥ 1.0 so only the sign, perfume bays and gold rings bloom.

### UI (inside the phone): the website's real design

- Capture references with Playwright from the running website, 390 × 844 at `deviceScaleFactor: 3`,
  `?tier=high`, in FR, AR and EN: section bar, arrival hint, product card with shades, basket drawer,
  checkout form, order confirmation.
- Recreate the animated parts in Canvas2D from the real tokens (`src/styles.css`) and fonts; compare
  each recreation side by side with its capture.
- Copy from `src/i18n/{fr,ar,en}.ts`; the message from `buildWhatsAppMessage` with a fictional order.

### Graphic layer

Canvas2D layers uploaded only when their state changes. Extruded type: opentype.js glyphs of Jost 800
→ `ShapePath` → `ExtrudeGeometry` with bevel; white face, `signal` sides.

### Phone, basket, parcel

- Phone: generic rounded device (extruded rounded rect, `ink2`, satin clearcoat), no brand cues.
- Basket: the website's own 3D basket from `src/three/Basket.tsx`.
- Parcel: a simple bevelled box with two flap hinges, `kraft` material, a gold label plane.

### Real shop photo

The owner's storefront photograph (not in git; see `docs/reference/tifawin/README.md`), cropped
to the sign and doorway, faces blurred. Never use the AI-generated concept image as "the real shop".

---

## 11. Copy in three languages (one edit, three renders)

All copy lives in `data/copy.<locale>.txt`, looked up by key. French is the master.

| Key | FR (master) | AR | EN |
| --- | --- | --- | --- |
| hook | ENTRE. · REGARDE. · PRENDS. | ادخلي. · انظري. · خذي. | WALK IN. · LOOK. · TAKE. |
| store | PARFUMERIE · BOUTIQUE EN 3D | عطور · متجر ثلاثي الأبعاد | PARFUMERIE · 3D BOUTIQUE |
| build | Comme si tu y étais. | كأنكِ في المتجر. | As if you were there. |
| sections | 8 RAYONS | 8 أقسام | 8 SECTIONS |
| walk | OU BALADE-TOI. · GLISSE POUR REGARDER | أو تجولي بحرية. · اسحبي للنظر | OR WANDER FREELY. · SWIPE TO LOOK |
| beauty | Chaque produit, en 3D. | كل منتج بالأبعاد الثلاثية. | Every product, in 3D. |
| take | TOUCHE. · CHOISIS. · AJOUTE. | المسي. · اختاري. · أضيفي. | TAP. · CHOOSE. · ADD. |
| order | COMMANDE EN UN MESSAGE. · PAIEMENT À LA LIVRAISON · On te répond pour confirmer. | اطلبي برسالة واحدة. · الدفع عند الاستلام · نرد عليكِ للتأكيد. | ORDER IN ONE MESSAGE. · CASH ON DELIVERY · We reply to confirm. |
| languages | Français · العربية · English | (same) | (same) |
| montage | SUR MOBILE ET ORDINATEUR. | على الهاتف والحاسوب. | ON PHONE AND COMPUTER. |
| realshop | La vraie boutique t'attend. | المتجر الحقيقي في انتظارك. | The real shop is waiting. |
| cta | Commande en ligne — lien en bio · Ou passe en boutique | اطلبي عبر الإنترنت — الرابط في الملف الشخصي · أو زورينا في المتجر | Order online — link in bio · Or visit the shop |

A native speaker checks the Arabic (Modern Standard Arabic or Darija, as the owner prefers).
Section names in the phone come from the website's `fixtureLabels`.

---

## 12. Production order (each step has a gate)

1. **Pre-flight:** read the catalogue (demo or real); apply the owner's answers (§16) or the
   defaults. Gate: a written list of what will and will not be shown.
2. **Treatment:** `docs/TREATMENT.md` from §3–§9.
3. **Style frames (quality gate).** Render the 9 signature shots (§6) plus the end card as
   1080 × 1920 stills, with final lighting, type and grade. Review them as posters: would each stop
   a scroll on its own? Iterate until yes; share them with the owner before animating.
4. **Music:** synthesize the bed, write `audio.json`. Gate: downbeats verified with a click track.
5. **Scaffold:** fonts, palette, the website's shop in the engine. Gate: an interior still matches
   the website's own screenshot of the same viewpoint.
6. **Plates one at a time:** stills at entry, hits, middle and exit with safe-zone guides; contact
   sheets for motion; fix and repeat.
7. **Transitions:** `sheet --cuts`; the hook's pull-back and the end dive checked frame by frame.
8. **Draft video**, frames at every hit and cut, contact sheet at 4 fps, watched with and without sound.
9. **Final master** (silent), mux, transcode, loudness and spec QA.
10. **Variants** (AR, EN, 15 s cutdown, 4:5) and the **report**.

### Render environment

This machine has **no GPU** (Chromium falls back to SwiftShader; 4 CPU cores, 15 GB RAM; ffmpeg 6.1
with libx264 and AAC, bun and Playwright's Chromium installed). So:
- develop with stills at 540 × 960; draft at 540 × 960, 30 fps, 2 samples;
- measure the final settings on 30 frames, compute the ETA, render the final in chunks per plate
  (`--from/--to`, concat with `-c copy`), samples capped per plate (12 on fast plates, 4 on static);
- if the ETA exceeds ~8 hours, deliver the draft and hand over the exact command for a computer with
  a GPU (`--use-angle=d3d11` on Windows, `metal` on Mac). Never wrap a long render in a guessed timeout.

Project: `video/tifawin-reel/` with its own `package.json` (three, opentype.js, react,
@react-three/fiber, @fontsource/ibm-plex-mono; dev: vite, playwright-core, typescript); add `video/`
to the website's ESLint ignores. Engine as in the skill (§4): pure `render(t)`, timeline from
`audio.json`, sub-frame motion blur, post (bloom, halation tinted `signal`, tone shoulder, grain
0.03, vignette 0.3, dither), `?t=` scrub, `&guides`, CLI `gpu | stills | sheet | video | cues`.

---

## 13. QA checklist

- **Wow test:** each of the 9 signature shots works as a still; the first 1.5 s is striking with
  the sound off.
- **Story test (muted):** a stranger can say what the shop is, how to buy, and where to go next.
- One idea per plate; every word inside x 60–940, y 220–1500; nothing essential under 30 px.
- Copy lands exactly on its beat, never early.
- The 3D shop matches the website (layout, colours, sign): compare stills with website screenshots.
- §5 honesty gate passed (no demo prices readable, no unconfirmed details or claims).
- No NaN discs, black frames, debug UI, z-fighting or clipping through shelves.
- Hand-offs: zero shake/zoom before each cut; the last frame loops into the first.
- `ffprobe`: h264 High, 1080×1920, yuv420p, BT.709 ×3, 30 fps, 60.0 s; AAC 48 kHz stereo;
  −14 LUFS ±1, true peak ≤ −1.5 dBTP.

---

## 14. Posting notes (to maximise reach)

- Cover: style frame of the floating miniature or the sign, with "Tifawin en 3D" inside the central 3:4.
- First caption line = the hook; then both calls to action; 5–10 hashtags.
- Post the 60 s reel and, a few days later, the 15 s cutdown; pin the reel on the profile; put the
  website link in the bio (and the shop address in the profile once confirmed).

---

## 15. Deliverables

In `video/tifawin-reel/out/` (git-ignored) and `renders/`:

- `Tifawin_Reel_FR.mp4` (publishable master, 1080×1920, 30 fps, 60 s, music + SFX)
- `Tifawin_Reel_AR.mp4`, `Tifawin_Reel_EN.mp4` (same edit, translated copy, Arabic RTL)
- `Tifawin_Reel_15s_FR.mp4` (hook + take + order + end card) and a 4:5 feed version
- the 10 style frames, `*_preview.mp4` (540×960), `cover.jpg`, `contact_sheet.png`, QA stills
- `audio/mix.wav` and stems; `CREDITS.md` (fonts OFL, original music, engine licence)
- `caption_fr.txt` (+ AR, EN), e.g. *« Entre, regarde, prends : Tifawin Parfumerie est en 3D.
  Commande en ligne (lien en bio) ou passe nous voir en boutique. »* #Tifawin #parfumerie #parfum
  #maquillage #soinsvisage #beauté #Maroc #shoppingenligne
- `REPORT.md`: specs, loudness, render times, what was checked, what is demo, every compromise.

---

## 16. Questions for the owner (defaults apply if unanswered)

| Question | Default |
| --- | --- |
| Shop address, city and opening hours for "Ou passe en boutique"? | "Ou passe en boutique" without details |
| Website address or Instagram handle for the CTA? | "lien en bio" |
| Can you load 8–12 real hero products (photos, names, prices) before the final render? | demo gate of §5 |
| Confirm "livraison partout au Maroc" and "paiement à la livraison" | only what is confirmed |
| A clean photo or short video of the storefront (day or night)? | the existing photo, cropped and blurred |
| Official logo file (SVG/PNG)? | the sign lettering in Jost 800, as on the website |
| Music: original synthesized bed, or a licensed track? | original bed (§8) |
| Arabic: Darija or Modern Standard Arabic? French "tu" or "vous"? | Modern Standard Arabic; "tu" |
