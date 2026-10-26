# Tifawin — Instagram Reel brief (60 s, 9:16, code-rendered 3D motion graphics)

A complete production prompt. Paste it into a session that has the **code-rendered-motion-video**
skill, or hand it to a motion designer or developer together with that skill file. Everything a
renderer needs is here: the story, the edit on a beat grid, the look, the real assets to use, the
honesty rules, the render plan and the deliverables.

---

## 0. Kickoff (paste this first)

```
Use the code-rendered-motion-video skill and follow docs/REEL_PROMPT.md in this repository.
Product: Tifawin Parfumerie — a 3D version of the real shop where customers walk the aisles,
tap any product, fill a basket and send the order on WhatsApp (cash on delivery).
Platform: Instagram Reel, 1080×1920 (9:16), 30 fps, 60.0 s (30 bars at 120 BPM).
Audience: women in Morocco who shop for perfume, makeup, hair and skin care, mostly on their phone.
Goal / CTA: visit the 3D boutique ("Visite la boutique en 3D — lien en bio").
Real features only (§3). Real assets from this repository (§9). Original synthesized music (§7).
Video project in video/tifawin-reel/, separate from the website build. No secrets in it.
Deliver §14. Work phase by phase with stills QA; do not stop until the MP4 exists and is verified.
```

---

## 1. Role and mission

Act as a motion director, a three.js engineer and a sound designer. Make a **60-second vertical
reel** that shows, without a single word of explanation needed, that a customer can:

1. arrive in front of the real Tifawin shop,
2. walk in,
3. move between the shelves (by tapping a section, or walking freely),
4. tap **any** product, choose a shade, add it to the basket,
5. send the order in one WhatsApp message and pay on delivery.

It must feel premium and calm-confident, like a perfume ad crossed with a product demo, not like a
screen recording. It is rendered as code: every frame is a pure function of time, cut on a beat
grid, with real 3D, the website's real UI, film finish and original music.

---

## 2. Format and technical spec

| Item | Value |
| --- | --- |
| Canvas | 1080 × 1920, 9:16 |
| Frame rate | 30 fps, shutter 0.5 (180°) |
| Duration | **60.0 s** = 30 bars of 4/4 at **120 BPM** (beat 0.5 s, bar 2.0 s) |
| Video | H.264 High 4.2, yuv420p, BT.709 primaries/transfer/matrix, CRF 17 delivery, CRF 14 master |
| Audio | AAC 48 kHz stereo, 256 kb/s; −14 LUFS integrated, true peak ≤ −1.5 dBTP |
| Safe zone (organic reel) | all words, logo, CTA and key UI inside **x 60–940, y 220–1500**; full-bleed imagery may use the whole frame |
| Legibility | headline ≥ 110 px, support ≥ 48 px, annotations ≥ 30 px; ≤ 5 words per card, held ≥ 1.2 s (single slam words on beats excepted) |
| Grain / flashes | grain 0.025–0.035; ≤ 3 full-frame flashes per second, no red strobes |
| Loop | the last frame hands off to the first (§8, plate 11) |

---

## 3. What is real (the only things the video may show or claim)

All taken from the website in this repository. Show them working; never claim more.

| Feature | Where it lives | What to show |
| --- | --- | --- |
| Black shopfront with the lit **TIFAWIN / PARFUMERIE** sign, sliding doors, window displays | `src/three/Facade.tsx`, settings `storefront` | storefront night shot, doors opening |
| The real shop layout: checkered floor, white ceiling grid with round lights, white shelving on three walls, glass counter on oak, nail-polish stand | `src/lib/layout.ts`, `src/three/Room.tsx`, `Fixtures.tsx` | interior reveal, walls, counter, stand |
| **8 sections** in the section bar: Vernis, Cheveux, Corps & hygiène, Maquillage, Soins visage, Coffrets, Parfums, Comptoir & caisse | `src/ui/ZoneBar.tsx`, `settings.fixtureLabels` | tap a chip → the camera glides to that shelf |
| Free walking (arrow keys, or a joystick on phones), a minimap with "Vous êtes ici" | `src/three/CameraRig.tsx`, `src/ui/Overlay.tsx` | first-person walk with the joystick |
| Every product stands on its shelf as a 3D package built from its photo, with every shade shown | `src/three/Products.tsx`, `packageGeometry.ts` | close-up orbit of one product |
| Tap a product → product card: name, size, price, shade picker, quantity, "Ajouter au panier" | `src/ui/ProductSheet.tsx` | the core action |
| Added products fly into the basket; the basket count updates | `src/three/Basket.tsx`, `Header.tsx` | fly-to-basket arc, counter rolls |
| Checkout: name, phone, city, address; **paiement à la livraison** | `src/ui/Checkout.tsx` | typed form, "Valider la commande" |
| Order number like `TF-261026-7KQ4` and a ready-to-send WhatsApp message in the customer's language | `src/lib/whatsapp.ts`, order page | message bubble building line by line |
| French, Arabic (right to left) and English | `src/i18n/*.ts` | the product card flipping language |
| A product list without 3D, on any device | `/catalog` | one beat in the montage |

**Real UI copy to reuse verbatim** (from `src/i18n/fr.ts`): "Entrer dans la boutique",
"Ajouter au panier", "Teinte", "Votre panier", "Commander", "Paiement à la livraison",
"Valider la commande", "Envoyer ma commande sur WhatsApp", "Rayon {zone}. Touchez un produit pour le voir.",
"Utilisez le joystick pour marcher, glissez pour regarder", "Vous êtes ici".

The real WhatsApp message format (`buildWhatsAppMessage`, French):
```
Bonjour 👋 Je souhaite passer la commande #TF-261026-7KQ4

• 1 × <produit> — <prix>
…
Livraison : <ville> — <frais>
Total : <total> (paiement à la livraison)

Nom : …
Tél : …
Adresse : …
```
In the video the emoji is drawn as plain type or omitted (no emoji in the video's own type;
inside the recreated message it may stay as in the real text).

---

## 4. Honesty rules (blocking: check them before the final render)

The products in `public/data/catalog.json` are **demo content** today (`source.kind: "demo"`):
fictional products, brands, prices and stock. The shop's own catalogue has not been loaded yet.

- **Pre-flight gate.** At render time, read the catalogue. If any product shown has
  `source.kind === "demo"`:
  - do not show prices, totals or delivery fees as readable numbers (draw the price row as a soft
    band, or crop it out), and do not show fictional brand names in large type;
  - add a small mono footnote on product plates: `PRODUITS DE DÉMONSTRATION`.
  Once the real catalogue is loaded (real photos, names, prices), remove both and re-render: the
  same edit works with real data.
- **Do not show the shop's phone number**, address, opening hours or city. They are not confirmed
  for publication. The WhatsApp message bubble shows the message, never a recipient number.
- **"Livraison partout au Maroc" and "paiement à la livraison"** are the website's own copy.
  Ask the owner to confirm both before publishing; if not confirmed, keep only what is.
- No ratings, review counts, customer numbers, "best price" or "N° 1" claims. No "IA" claims:
  the 3D packages are built automatically from photos; say "en 3D", never "généré par IA".
- No third-party logos or trademarks: generic phone (no Apple/Samsung design cues), a generic chat
  bubble (not a copy of WhatsApp's interface or logo; the word "WhatsApp" only as plain text, as in
  the website's own button). Product brands appear only on the shop's real products, from photos
  the shop is entitled to use.
- No people, faces or hands rendered photoreal. A touch is a gold ring (motif 1).
- Customer details typed in the checkout are clearly fictional and partly masked
  (`Salma B.`, `06 •• •• •• ••`).
- Products imported from other websites (e.g. Zinabel) must not appear: nothing was imported.

---

## 5. The idea in one paragraph

**"Entre. Regarde. Prends."** The reel opens on its payoff: a perfume lifts off a lit glass shelf
at a gold touch and flies straight at the lens. Three words slam on the beat. Whip to the street:
the TIFAWIN letters assemble, the soffit lights snap on, the doors slide open on the first drop and
the camera glides inside the real shop. A phone frame slides in: each tap on a section whips the
camera to that wall; then we walk freely with the joystick. One product turns slowly in the light
(the breath). Then the core of the film: touch, choose a shade, add — three products fly into the
basket on the kicks. One message on WhatsApp, cash on delivery. The card flips to Arabic and
English. A fast montage of every wall, then we pull back out to the storefront: "Visite la boutique
en 3D". The last frame pushes into the doorway, which is exactly where the first frame begins.

**Tone:** warm, precise, feminine without clichés, confident. **Not:** neon, cyberpunk, lens-flare
soup, sparkles everywhere, stock "luxury" gold particles, emoji, outlined type, generic AI imagery.

---

## 6. Look: palette, type, motifs

### Palette (linear HDR in the engine; only `signal` may bloom)

| Token | Hex | Role |
| --- | --- | --- |
| `ink` | `#0B0A0B` | storefront black, type plates background |
| `ink2` | `#17151A` | panels, phone body |
| `graphite` | `#3A373C` | secondary lines, inactive UI |
| `bone` | `#F4F1EA` | display type, sign letter faces |
| `signal` | `#C9A46A` | **the only glow**: tap rings, sign letter sides, light sweeps, CTA underline |
| `hot` | `#FFE7B0` | core of a glow |
| `shadow` | `#5E4520` | deep gold shadow |
| `porcelain` / `garnet` / `champagne` | `#FBF5F3` / `#6B1F3D` / `#C9A46A` | the website's UI as it really is (inside the phone only) |
| floor | `#EDEBE8` / `#9C9A98` | the shop's checker |

Product colours stay on the products. Type never exceeds ~0.8 and never blooms.

### Typography (all OFL, already in `node_modules/@fontsource` except the mono)

- **Display:** Jost 700–800, capitals, tight tracking (−0.02 em): echoes the bold sign letters.
  One word per hit, 140–220 px.
- **Accent line:** Cormorant Garamond 500 italic (the website's display face), 64–90 px, once or
  twice in the film (the breath, the end card).
- **Machine voice:** IBM Plex Mono 500 (add `@fontsource/ibm-plex-mono` to the video project),
  capitals tracked +0.14 em, 30–36 px: labels, footnotes, counters.
- **Arabic:** Tajawal 500/700/800, laid out right to left (Canvas2D shapes Arabic natively).
- Kerned layout, lining figures, typographic apostrophes (’) and guillemets (« »).

### Motifs (thread them through every plate)

1. **The gold tap ring.** Every interaction is a gold ring growing from the touch point
   (`outExpo`, 0 → 90 px, alpha 1 → 0 in 0.35 s) with a 0.96 press on the touched element. The
   same ring, scaled to full screen, is the iris transition between some plates.
2. **The checker grid.** The floor's 45 cm tiles become a 2D grid that wipes between plates (tiles
   flip on 16ths) and the ground plane of the type plates.
3. **The gold edge.** The sign's gold letter sides catch a light sweep in plate 2; the same sweep
   crosses the CTA in plate 11.

---

## 7. Music and sound

**Route: original synthesized bed** (publishable, no licence risk), 120 BPM, 30 bars. If the owner
later supplies a licensed track, make a review version on its beat grid and keep this one as the
publishable master.

**Character:** modern, warm, elegant pop-house; round sub bass, soft side-chained pads, a plucked
melodic hook (harp/oud-like pluck, synthesized, not sampled), light percussion with subtle
North-African frame-drum colour (darbuka-style rolls into the drops). No vocals, or a wordless
breathy pad only.

| Bars | Section | What happens musically | Picture |
| --- | --- | --- | --- |
| 0–2 | hook | filtered pluck motif, kick on 1, impact on bar 1 beat 1 | perfume flies, ENTRE. REGARDE. PRENDS. |
| 2–4 | build | riser, frame-drum roll | sign assembles, lights snap on |
| 4–11 | drop A | full groove | doors open (bar 4), walk-in, section whips |
| 11–15 | break | drums thin out, pad + pluck | free walk, the breath |
| 15–16 | build | riser, snare roll | tap → card |
| 16–24 | drop B | full groove, extra percussion | choose, add ×3, order, WhatsApp |
| 24–28 | lift | key change or added counter-melody | languages, montage |
| 28–30 | outro | hook motif, final hit on bar 29 beat 1, tail into a loopable bar | end card, loop push |

**Sound design** (scene-owned `cues()`; SFX bus ~8 dB under music; duck music 2–4 dB on big hits):
glass "tink" for each tap ring, soft whoosh for each camera whip, a mechanical slide for the
doors, tile footsteps (very soft) during the free walk, a bright "pop" + coin-like chime when a
product lands in the basket (rising pitch for items 1, 2, 3), keyboard ticks on 16ths while
typing, a generic "send" swoosh (not WhatsApp's sound), a warm low impact under the end card.

Write `data/audio.json` (beats, downbeats, sections, envelopes) from the synth itself so the grid
is exact. Render picture once, silent; mux audio afterwards.

---

## 8. The edit: plates on the beat grid

`B(i)` = time of beat `i` (0.5 s each); bar `k` starts at `2k` s. Copy is French (§10 has AR/EN).

| # | id | Bars | Time (s) | Copy on screen | Idea | Technique | Hand-off out |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `hook` | 0–2 | 0.0–4.0 | **ENTRE.** (B4) **REGARDE.** (B5) **PRENDS.** (B6) | A perfume on the lit glass perfume wall; gold ring at frame 1; it lifts, spins once and flies at the lens | 3D perfume wall + product package, crash dolly, slam words | whip pan left with motion blur (B7.5) |
| 2 | `storefront` | 2–5 | 4.0–10.0 | the sign itself; mono `PARFUMERIE · BOUTIQUE EN 3D` (B12) | Night street. TIFAWIN letters fly in and lock one per 8th (extruded, white faces, gold sides), light sweep, soffit lights on B14–B15; doors slide open on **bar 4** (8.0 s) | extruded glyphs (Jost 800 via opentype.js), the website's facade geometry, crane down | zoom-through the open doorway (8.0–10.0) |
| 3 | `walkin` | 5–7 | 10.0–14.0 | *Comme si tu y étais.* (Cormorant italic, B21) | The camera glides down the real aisle; ceiling lights switch on in a wave down the grid on 16ths; shelves are already full | the website's room, fixtures and products, slow dolly | a phone frame slides up from below (B27), the 3D view becomes its screen |
| 4 | `sections` | 7–11 | 14.0–22.0 | **8 RAYONS** (B28) then the chip name each bar: PARFUMS · MAQUILLAGE · VERNIS · SOINS VISAGE | Inside the phone: the real section bar. One tap per bar; the camera whips to that wall; the real hint "Rayon … Touchez un produit pour le voir." appears | recreated ZoneBar + 3D in the phone screen, whip pans, chip stamps | the phone tilts away; full-screen first-person view |
| 5 | `walk` | 11–13 | 22.0–26.0 | **OU BALADE-TOI.** (B44); mono `JOYSTICK · GLISSE POUR REGARDER` | First-person walk down the aisle; the joystick UI and the minimap ("Vous êtes ici") with a path drawing on | real walk-mode framing, minimap recreated in 2D, footsteps | the camera stops in front of the nail-polish stand |
| 6 | `breath` | 13–15 | 26.0–30.0 | *Chaque produit, en 3D.* (B53); mono footnote if demo | Quiet plate: one polish bottle turns slowly in a pool of light; its shades appear as a ring of bottles around it on 8ths | single product package orbit, soft key, contact shadow | the ring collapses back onto the stand, gold ring tap (B60) |
| 7 | `take` | 15–20 | 30.0–40.0 | **TOUCHE.** (B60) **CHOISIS.** (B64) **AJOUTE.** (B68); basket counter 0 → 1 → 2 → 3 | Phone again. Tap the polish → the product card slides up (real layout: name, size, shade row, quantity, "Ajouter au panier"); 4 shade taps on beats, each highlighting that shade's bottle on the shelf; add → it flies in an arc into the basket (B68). Then a lipstick (bar 18) and a perfume (bar 19) the same way, faster, on the kicks | recreated ProductSheet over the live 3D, fly-to-basket arcs, rolling counter, pops | the basket opens into the drawer (B80) |
| 8 | `order` | 20–24 | 40.0–48.0 | **COMMANDE EN UN MESSAGE.** (B84); mono `PAIEMENT À LA LIVRAISON` | Drawer → "Commander" → checkout fields typed on 16ths → "Valider la commande" → "Commande n° TF-…" stamps → "Envoyer ma commande sur WhatsApp" pressed → the real message text builds line by line in a generic chat bubble → send swoosh (B94) | recreated Checkout + order page, typewriter, stamp, bubble build | the bubble shrinks into the gold ring |
| 9 | `languages` | 24–26 | 48.0–52.0 | **Français · العربية · English** (one per 2 beats) | The product card flips language on beats: FR → AR (the whole layout mirrors right to left) → EN | card flip in 3D (plane rotation), RTL mirror | the card shrinks to a tile in the montage grid |
| 10 | `montage` | 26–28 | 52.0–56.0 | **SUR MOBILE ET ORDINATEUR.** (B104) | Cuts on 8ths: perfume wall glow, palettes under the counter glass, the stand, hair wall, back wall, the product list on a laptop frame, the same on a phone | hard cuts on 8ths, checker-grid wipes | pull back out through the doors |
| 11 | `endcard` | 28–30 | 56.0–60.0 | **TIFAWIN** (the sign) · *Visite la boutique en 3D* · mono `LIEN EN BIO` | The camera pulls back out to the storefront; doors close; the light sweep crosses the sign and the CTA (B112); last 0.5 s: a slow push into the doorway that matches frame 1's composition | facade, sweep, loop push | **loop** into plate 1 |

### Plate notes

- **1 · hook.** Frame 1 must already be beautiful: the perfume wall's warm bays, a gold ring
  blooming on a bottle. The bottle lifts with `springStep`, spins 360° with `outExpo`, and its
  flight ends exactly on B4 as ENTRE. slams (scale slam, 2-frame shake). REGARDE. and PRENDS.
  replace it on B5 and B6. Hold, then whip at B7.5.
- **2 · storefront.** Use the website's real façade (stone building, black shopfront, soffit
  downlights, window displays with products). Seven letters, one per 8th from B8 to B11, each
  flying from a hashed offset into place with a spring, gold sides catching the light. Lights snap
  on B14 and B15. The doors slide on 8.0 s exactly (music hit). Crane from the sign down to eye
  height while the doors open, then `inExpo` dolly through the opening.
- **3 · walk-in.** Eye height 1.6 m, the real aisle. The light wave runs from the door to the back
  wall on 16ths (each downlight's bulb pops from 0 to full). One line of Cormorant italic. Keep it
  calm: this is the "wow, it's the shop" moment.
- **4 · sections.** The phone is a generic dark device floating slightly tilted (−0.12 rad yaw),
  the 3D view rendered into its screen (render target → texture). The section bar is the real
  design (pill chips, garnet active state). Tap ring on the chip, chip turns garnet, the screen's
  camera whips to the wall (yaw 60–90° in 5 frames, motion blur), the chip name stamps big
  outside the phone. Four sections, one per bar.
- **5 · walk.** Full-screen first person, small head-bob (≤ 1.5 cm), the joystick bottom-left in
  the safe zone, the minimap top-left drawing a gold path. Show the real hint text once.
- **6 · breath.** Fewer elements, slower. One package (nail-polish family) from the website's
  package geometry with its real photo texture. Shades from the product's real variants.
- **7 · take.** The heart of the film. The card is the real ProductSheet layout (porcelain card,
  serif name, mono size, shade dots, garnet button). Each shade tap swaps the card's shade and highlights that
  shade's bottle on the shelf behind the card, exactly as the website does. Each add launches the
  product along a parabola into the basket button; the counter rolls; a pop + chime per item.
  Item 2 and 3 are quicker (one bar each). Prices: see §4.
- **8 · order.** Fields fill on 16ths with fictional, masked data. The order number stamps (scale
  1.4 → 1 in 60 ms, 3° rotation). The chat bubble is generic (rounded, light green-grey tint is
  allowed but no WhatsApp logo, header or UI chrome); lines appear one per 8th.
- **9 · languages.** Same card, three languages from the website's real translations. Arabic
  mirrors the whole layout (shade row, button, close icon) — that is the proof of RTL.
- **10 · montage.** Eight cuts on 8ths, each a different idiom (glow, glass, steps, density, list
  view). No new information, just energy and scale.
- **11 · end card.** Sign hero, then the CTA block inside the safe zone: Cormorant italic
  "Visite la boutique en 3D" (90 px), mono "LIEN EN BIO" with a gold underline drawn on. If the
  owner confirms the website address, show it instead of (or under) "LIEN EN BIO". The final push
  into the doorway must land on a framing that cuts invisibly into frame 1.

---

## 9. Real assets and how to build each layer

### 3D (the shop itself): reuse the website's code, not a re-modelled copy

The boutique in the video must be the website's own scene, so the reel is truthful:

- Data: `public/data/catalog.json` (settings, `fixtureLabels`, products, variants, placements),
  `public/products/**` (packshots and cut-outs), `public/textures/**`.
- Pure modules to import read-only through a path alias (`@app/*` → `../../src/*`):
  `lib/layout.ts` (`createLayout`, `SHOP`), `lib/shelf-layout.ts`, `lib/packaging.ts`,
  `three/packageGeometry.ts`, `three/facings.ts`, `three/atlas.ts`, `three/materials.ts`,
  `three/textures.ts`, `three/room-geometry.ts`, `three/fonts.ts`.
- **Approach A (try first, time-box 1 hour):** mount the website's own R3F components
  (`Room`, `Fixtures`, `Facade`, `Decor`, `Products`) with `@react-three/fiber`'s `createRoot` on
  the engine's renderer, `frameloop: 'never'`, hydrate the catalogue store once, and render the
  R3F scene into the engine's HDR target each sub-frame. Do **not** mount `CameraRig`, `Effects`
  or anything that keeps time: the camera is `camera(t)`, the door opening is set from `t`
  (`doorState.open`), highlights from `t`. Prove determinism: render the same `t` twice and in
  reverse order, and diff the pixels (must be identical).
- **Approach B (fallback):** rebuild the scene in plain three.js from the same pure modules; if a
  geometry builder lives inside a `.tsx` component, move it to a `.ts` module **without changing
  its output**, and keep the website's lint, type check, unit and e2e tests green.
- Lighting: the website's neutral interior; in the engine, `NoToneMapping` + the engine's tone
  shoulder; bloom threshold ≥ 1.0 so only the sign, the perfume-bay glows and the gold rings bloom.

### UI (inside the phone): the website's real design

- **Capture references** with Playwright from the running website (`npm run dev`), viewport
  390 × 844, `deviceScaleFactor: 3`, `?tier=high`, in FR, AR and EN: section bar, arrival hint,
  product card with shades, basket drawer, checkout form, order confirmation. Save under
  `video/tifawin-reel/app/public/assets/ui/`.
- **Recreate the animated elements in Canvas2D** from the real tokens (`src/styles.css`:
  porcelain `#FBF5F3`, garnet `#6B1F3D`, champagne `#C9A46A`, ink `#2A1820`, mist `#8A777E`;
  Jost / Cormorant Garamond / Tajawal) so taps, presses, typing and counters animate crisply.
  Compare each recreation side by side with its capture before using it.
- Copy comes from `src/i18n/{fr,ar,en}.ts`; the message text from `buildWhatsAppMessage`
  (import it and call it with a fictional order).

### Graphic layer (type plates, rings, grid)

Canvas2D layers on top of the 3D, uploaded as textures only when their state changes. Extruded
TIFAWIN letters: opentype.js glyphs of Jost 800 → `ShapePath` → `ExtrudeGeometry` with bevel;
white face material, gold side material (`signal`).

### Phone mockup

Generic rounded device (extruded rounded rect, `ink2`, satin clearcoat), screen as a
`CanvasTexture`/render-target plane. No notch shape copied from a real brand.

---

## 10. Copy in three languages (one edit, three renders)

Keep all copy in `data/copy.<locale>.txt` (§6.3 of the skill), looked up by key, so a language
swap never touches scene code. The French master is the publishable default.

| Key | FR (master) | AR | EN |
| --- | --- | --- | --- |
| hook | ENTRE. · REGARDE. · PRENDS. | ادخلي. · انظري. · خذي. | WALK IN. · LOOK. · TAKE. |
| store | PARFUMERIE · BOUTIQUE EN 3D | عطور · متجر ثلاثي الأبعاد | PARFUMERIE · 3D BOUTIQUE |
| walkin | Comme si tu y étais. | كأنكِ في المتجر. | As if you were there. |
| sections | 8 RAYONS | 8 أقسام | 8 SECTIONS |
| walk | OU BALADE-TOI. | أو تجولي بحرية. | OR WANDER FREELY. |
| breath | Chaque produit, en 3D. | كل منتج بالأبعاد الثلاثية. | Every product, in 3D. |
| take | TOUCHE. · CHOISIS. · AJOUTE. | المسي. · اختاري. · أضيفي. | TAP. · CHOOSE. · ADD. |
| order | COMMANDE EN UN MESSAGE. · PAIEMENT À LA LIVRAISON | اطلبي برسالة واحدة. · الدفع عند الاستلام | ORDER IN ONE MESSAGE. · CASH ON DELIVERY |
| languages | Français · العربية · English | (same) | (same) |
| montage | SUR MOBILE ET ORDINATEUR. | على الهاتف والحاسوب. | ON PHONE AND COMPUTER. |
| cta | Visite la boutique en 3D · LIEN EN BIO | زوري المتجر بالأبعاد الثلاثية · الرابط في الملف الشخصي | Visit the 3D boutique · LINK IN BIO |

Have a native speaker check the Arabic (Darija or Modern Standard Arabic, as the owner prefers)
before publishing. Section names in the phone come from the website's own `fixtureLabels`.

---

## 11. Engine and project setup

- Project: `video/tifawin-reel/` with its own `package.json` (three, opentype.js, react,
  @react-three/fiber, @fontsource/ibm-plex-mono; dev: vite, playwright-core, typescript). Add
  `video/` to the website's ESLint ignores; it must never be part of the website build or tests.
- Engine: port the reference engine (pdoom-video, MIT) or build the minimal engine of the skill
  (§4): `render(t)` pure, scenes on a timeline from `audio.json`, sub-frame motion blur, post
  (bloom, halation tinted `signal`, tone shoulder, grain 0.03, vignette 0.3, dither).
- Preview: `?t=` scrub, `&guides` overlay of the safe zone (refused in `video` mode).
- CLI: `gpu | stills | sheet | video | cues` as in the skill.
- **This machine has no GPU** (Chromium falls back to SwiftShader, 4 CPU cores, 15 GB RAM;
  ffmpeg 6.1 with libx264 and AAC, bun and Playwright's Chromium are installed). Plan for it:
  1. develop with stills at 540 × 960;
  2. draft at 540 × 960, 30 fps, 2 samples;
  3. measure the final settings on 30 frames, compute the ETA, and render the final in chunks per
     plate (`--from/--to`, concat with `-c copy`), capped at 12 samples on fast plates and 4 on
     static ones;
  4. if the ETA exceeds ~8 hours, deliver the draft and hand over the exact final command for a
     computer with a GPU (`--use-angle=d3d11` on Windows, `metal` on Mac).
  Never wrap a long render in a guessed timeout.

---

## 12. Production order (each with an exit gate)

1. **Pre-flight:** read the catalogue (demo or real), confirm the open questions (§15) or apply
   the defaults. Gate: a list of what will and will not be shown.
2. **Treatment:** `docs/TREATMENT.md` from §5–§8. Gate: every plate has one idea and a designed
   hand-off.
3. **Music:** synthesize the bed, write `audio.json`. Gate: downbeats verified with a click track.
4. **Scaffold + smoke scene:** fonts, palette, the website's shop rendering in the engine.
   Gate: a still of the interior matches the website's own screenshot of the same viewpoint.
5. **Timeline**, then **plates one at a time**: stills at entry, hits, middle and exit with guides;
   read them, fix, repeat.
6. **Transitions:** `sheet --cuts`.
7. **Draft video**, frames at every hit and cut, contact sheet at 4 fps.
8. **Final master** (silent), mux, transcode, loudness and spec QA.
9. **Variants** (AR, EN, 15 s cutdown, 4:5) and **report**.

---

## 13. QA checklist (per plate and global)

- One idea per plate, readable in about one second, muted.
- Every word inside x 60–940, y 220–1500; nothing essential under 30 px.
- Copy appears exactly on its beat, never early.
- The 3D shop matches the website (same layout, colours, sign) — compare stills with website
  screenshots at the same viewpoint.
- §4 honesty gate passed (no demo prices readable, no phone number, no unconfirmed claims).
- No NaN discs, black frames, debug UI, z-fighting or clipping through shelves.
- Hand-offs: zero shake/zoom before each cut; the last frame loops into the first.
- `ffprobe`: h264 High, 1080×1920, yuv420p, BT.709 ×3, 30 fps, 60.0 s; AAC 48 kHz stereo;
  −14 LUFS ±1, true peak ≤ −1.5 dBTP.

---

## 14. Deliverables

In `video/tifawin-reel/out/` (git-ignored) and `renders/`:

- `Tifawin_Reel_FR.mp4` (publishable master, 1080×1920, 30 fps, 60 s, with music and SFX)
- `Tifawin_Reel_AR.mp4`, `Tifawin_Reel_EN.mp4` (same edit, translated copy, Arabic layouts RTL)
- `Tifawin_Reel_15s_FR.mp4` cutdown (hook + take + order + end card) and a 4:5 feed version
- `*_preview.mp4` (540×960), `cover.jpg` (end-card frame, title inside the central 3:4),
  `contact_sheet.png`, QA stills at every hit and cut
- `audio/mix.wav` and stems; `CREDITS.md` (fonts OFL, original music, engine licence)
- `caption_fr.txt` (+ AR, EN): hook first line, CTA, 5–10 hashtags, e.g.
  *« Entre, regarde, prends : Tifawin Parfumerie est maintenant en 3D. Visite la boutique, lien en
  bio. »* #Tifawin #parfumerie #maquillage #parfum #soinsvisage #beauté #Maroc #shoppingenligne
- `REPORT.md`: specs (ffprobe), loudness, render times, what was checked, what is demo, every
  compromise.

---

## 15. Open questions for the owner (defaults apply if unanswered)

| Question | Default if no answer |
| --- | --- |
| Website address or Instagram handle for the CTA? | "LIEN EN BIO" only |
| Is the real catalogue (photos, prices) loaded? | demo gate of §4 (no readable prices, footnote) |
| Confirm "livraison partout au Maroc" and "paiement à la livraison" | show only "paiement à la livraison" if that alone is confirmed |
| Official logo file (SVG/PNG)? | the sign lettering in Jost 800, as on the website |
| Music: original synth bed, or a licensed track? | original synthesized bed (§7) |
| Arabic: Darija or Modern Standard Arabic? | Modern Standard Arabic, reviewed by a native speaker |
| French "tu" (friendly) or "vous" (formal)? | "tu", as is common on Instagram (the website uses "vous") |
