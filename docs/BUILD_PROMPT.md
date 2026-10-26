# Build prompt: 3D cosmetics boutique with cart and ordering

> **How to use this file.** Everything below the line is the prompt. Give it to Claude Code (or a
> developer) **one phase at a time** (see §14). Before you start, fill in the `{{PLACEHOLDERS}}`
> in §1, or leave them for now: the app reads them from a settings table you can edit later.
> Reference video breakdown: [`VIDEO_ANALYSIS.md`](VIDEO_ANALYSIS.md). Library versions, skills
> and the reasons behind each choice: [`RESEARCH.md`](RESEARCH.md).

---

## 0. Role and goal

You are a senior full-stack and WebGL engineer. Build a **production-ready, mobile-first web app**
that recreates my **real cosmetics boutique for women** as an **interactive 3D store**. Customers
walk around the shop in the browser, look at the shelves, tap products to see details, add them to
a basket, and **send their order directly** from the site. I receive each order in an admin
dashboard and by notification, and the customer can also send it to me on WhatsApp.

The experience is modelled on the Carrefour "Immersive shopping" concept (first-person camera,
the camera glides smoothly to the shelves, a product card at the bottom of the screen, add-to-cart
messages, a cart button in a floating header). Do not copy that concept's branding: everything
uses **my shop's brand**. The store is a small, elegant beauty boutique, not a supermarket.

## 1. Business settings (all editable later in the admin, never hard-coded)

| Key | Value |
|---|---|
| Shop name | `{{SHOP_NAME}}` |
| Logo | `{{LOGO_FILE}}` (SVG or PNG) |
| Brand colors | primary `{{PRIMARY_COLOR, e.g. #C97B8E rose}}`, accent `{{ACCENT_COLOR, e.g. #C9A36A gold}}` |
| WhatsApp number for orders | `{{WHATSAPP_NUMBER in international format, e.g. 2126XXXXXXXX}}` |
| Owner notification | `{{EMAIL}}` and/or a Telegram chat |
| Currency | `{{CURRENCY, e.g. MAD}}` |
| Languages | French (default), Arabic (RTL), English (configurable) |
| Delivery | list of cities/zones with a fee and delay for each, e.g. `{{CITY: fee, delay}}` |
| Payment | **Cash on delivery** in v1. Online payment is optional later through `{{PAYMENT_PROVIDER}}` |
| Shop address, hours, Instagram | `{{…}}` |

## 2. The physical store (build it to scale: 1 unit = 1 meter)

- **Footprint:** **3.5 m wide × 6.5 m deep**. Ceiling **3.0 m**. All three numbers are config values
  (`STORE_WIDTH`, `STORE_DEPTH`, `CEILING_HEIGHT`). The real shop is 3–4 m wide and 6–7 m deep.
- **Axes:** The origin is the floor at the center of the entrance. +X points right as you walk in,
  -Z points into the store, and +Y points up.
- **Entrance:** A glass door, 1.0 m wide, centered on the front wall (z = 0), with a shop window on
  each side showing "New arrivals".

### Floor plan (top view, entrance at the bottom)
```
            z = -6.5  (back wall)
  ┌─────────────────────────────────────┐
  │▓▓▓▓▓▓ PERFUME WALL (backlit) ▓▓▓▓▓▓▓│
  │▒                                   ░│
  │▒ SKINCARE                   MAKEUP ░│
  │▒                   + vanity mirror ░│
  │▒            ┌─────────┐            ░│
  │▒ HAIR CARE  │ ISLAND  │            ░│
  │▒            │ promos  │            ░│
  │▒            └─────────┘            ░│
  │▒                           HANDS & ░│
  │▒                             NAILS ░│
  │■ COUNTER                           ░│
  │■ (caisse)                          ░│
  └────────────┘   DOOR    └────────────┘
       window                  window
     z = 0 (entrance)   x: -1.75 m … +1.75 m
```
▒ left wall shelving · ░ right wall shelving · ▓ back wall · ■ counter

### Fixtures (default layout, defined as data in `lib/store-layout.ts`)
| Fixture id | Zone | Placement | Size (L × D × H) | Details |
|---|---|---|---|---|
| `counter` | Checkout / accessories | left wall, z −0.3 → −1.4 | 1.1 × 0.55 × 1.0 | Marble top. Small impulse items on top (brushes, hair clips). Clicking it opens the cart. |
| `wall-hair` | **Hair care** | left wall, z −1.6 → −4.0 | 2.4 × 0.35 × 2.2 | 5 shelves at 0.30 / 0.70 / 1.10 / 1.50 / 1.90 m. Shampoos, conditioners, masks, oils, styling. |
| `wall-skin` | **Skincare** | left wall, z −4.0 → −6.1 | 2.1 × 0.35 × 2.2 | Cleansers, creams, serums, sunscreen. |
| `wall-hands` | **Hands & nails** | right wall, z −0.6 → −3.0 | 2.4 × 0.35 × 2.2 | The top half is a stepped **nail-polish rack** with many small bottles in a color grid. The lower shelves hold hand creams and manicure tools. |
| `wall-makeup` | **Makeup** | right wall, z −3.0 → −6.1 | 3.1 × 0.35 × 2.2 | A **vanity mirror** (0.8 m wide, 1.2–1.9 m high) with bulb lights sits in the middle. Face, eyes and lips on either side. |
| `wall-perfume` | **Perfume** | back wall, x −1.45 → +1.45 | 2.9 × 0.30 × 2.2 | **Glass shelves** in front of a soft **backlit panel** (emissive). 4 levels. Premium look. |
| `island` | **Best sellers & promos** / Body care | center, x −0.5 → +0.5, z −2.3 → −3.3 | 1.0 × 0.6 × 0.9 | A two-tier table. Promos on top, body care and gift sets on the lower tier. |

- **Signage.** Each fixture has a header sign above it at 2.3–2.5 m with the zone name in the
  current language. This replaces the hanging aisle signs of the reference.
- **Clearance.** Leave at least 0.9 m of free floor between the island and the walls.
- **Validation.** Zones, names and fixture assignments are data. Products can move between
  fixtures from the admin. The layout must be validated at startup: no overlaps, everything
  inside the room bounds.

## 3. Visual style

- **Mood.** A feminine, premium boutique: blush/nude walls (`#F6EDE8`), white lacquered shelves
  with thin **gold** edge trims, a light marble or terrazzo floor, a white ceiling with warm **track
  spotlights**, and a soft pink accent band along the walls. Use the brand colors from §1 for
  accents and signs.
- **Lighting.** Warm and bright, with no real-time shadows. Use a hemisphere light, an ambient
  light and one soft directional light. Add baked contact shadows that render only once (static).
  Use a low-resolution studio environment map so glass and gloss read correctly. Tone mapping is
  ACES and the output is sRGB.
- **Style.** Stylized and clean, like the reference: simple geometry, crisp textures, and no
  heavy post-processing. It must look good on a mid-range Android phone.
- **Quality routes** (details in `RESEARCH.md` §4):
  - **A (default):** procedural fixtures with CC0 PBR textures and an HDRI from Poly Haven
    (`marble_01` or `herringbone_parquet` floor, `clay_plaster` walls), drei `Lightformer`
    softboxes, and shadows baked once.
  - **B (polish):** a headless Blender (`bpy`) script builds the room from the same layout file,
    bakes Cycles lightmaps, and exports a compressed GLB.
  - **C (optional, later):** a Gaussian-splat scan of the real shop rendered with Spark, with the
    interactive layer on top.
- **Device tiers.** On high-tier devices only: SMAA, N8AO ambient occlusion, and a subtle bloom
  on the backlit perfume wall. Low tiers turn all of these off automatically.

## 4. Products in 3D

- **Image.** Each product has a **front image with a transparent background** (PNG/WebP).
- **Rendering.** Each product is drawn as an **alpha-tested textured card**, scaled to its real
  `width_cm × height_cm`, with a small blob shadow underneath. For extra depth, use thin
  shape-specific meshes per `shape`:
  - `bottle`, `jar`, `tube`, `box`, `pouch`
  - `perfume`, `lipstick`, `compact`, `polish`
- **Hero products (optional).** Perfumes may use a GLB model with a glass `MeshPhysicalMaterial`.
  Keep these to fewer than 10 in the scene.
- **Shelf auto-layout (`lib/shelf-layout.ts`).** Each product has `fixture_id`, `shelf_level`,
  `slot_order` and `facings` (1–4 copies side by side). Products are placed left to right in
  `slot_order`, using their real widths plus a 1 cm gap. If a level overflows, the admin shows a
  warning. On the nail-polish rack, products are arranged on a grid instead.
- **Instancing.** Use one `InstancedMesh` per product, with facings as instances. Textures are at
  most 512 px WebP and are **lazy-loaded per zone**. Load the nearest zones first.
- **Visual states.**
  - **Out of stock:** the card is greyed out with an "Out of stock" tag.
  - **On promo:** a small price tag shows the promo price.
  - **New:** a "New" sticker.

## 5. Navigation and camera (first person, eye height 1.6 m)

- **Guided mode (default).**
  - Each fixture has an automatic **viewpoint**: 1.3 m in front of the center of the fixture,
    looking at its center at 1.2 m height.
  - Tapping a fixture, its sign, or a chip in the **zone bar** moves the camera smoothly there
    (about 900 ms with easing, using drei `CameraControls.setLookAt`).
  - On arrival, show the hint: "You're at *Hair care*. Tap a product."
- **Look and pan.** Drag (or use the trackpad) to look around within limits. At a viewpoint,
  dragging sideways **pans along the wall**, which is needed in portrait mode on phones. Pinch or
  scroll moves the camera closer to a shelf, down to a minimum of 0.6 m.
- **Free-walk mode (toggle).** WASD or arrow keys on desktop, a virtual joystick on mobile.
  Collide with the fixtures' bounding boxes and the room walls, so the camera can never leave the
  room or go through furniture.
- **Mini-map.** A top-view map in a corner with zones and a "you are here" dot. Tapping a zone
  teleports the camera there. The shop is small, so the map is a quick way around.
- **Reduced motion.** If `prefers-reduced-motion` is set, cut between viewpoints instead of animating.
- **Deep links.** `/store?zone=perfume` and `/store?product=<slug>` fly the camera to that spot
  and open the product. Use these links in Instagram and WhatsApp posts.

## 6. Interaction and overlay UI (HTML over the canvas, Tailwind)

1. **Floating header.** A rounded white card. Logo and shop name on the left. Language switcher
   (FR / AR / EN) and a **basket button** on the right, with an item count badge and the
   running total.
2. **Zone bar.** Horizontally scrollable chips: Hair · Skincare · Hands & Nails · Makeup ·
   Perfume · Promos · Counter.
3. **Product hover and tap.**
   - Desktop hover: the product gets an outline highlight and a round **hotspot** marker
     (`drei/Html`).
   - Tap or click opens the **product card**: a bottom sheet on mobile, bottom center on desktop.
   - The card shows: image, brand, name, size/volume, price (promo price struck through),
     variant picker, quantity stepper, **Add to basket**, and **Details**.
   - The variant picker covers shades with color swatches (lipstick, nail polish) and sizes
     (perfume 50 ml / 100 ml). Picking a variant changes the price and the image.
4. **Details modal.** A photo gallery, description, how to use, ingredients, and related products
   from the same zone.
5. **Toasts and hints.** Blue-style pills in the brand color, e.g. "Argan hair oil added to your
   basket ✓" and "You're at *Perfume*".
6. **First-person basket.** A small woven basket model fixed at the bottom of the view, like the
   cart in the reference. Mini icons of the added products appear inside it (at most 12 visible).
7. **Onboarding.** Coach marks on the first visit only: "Drag to look around", "Tap a shelf to go
   there", "Tap a product to see it".
8. **Loading screen.** A progress bar, the logo, and an **Enter the boutique** button.

## 6b. Motion design (GSAP for sequences, Motion for UI, maath for continuous damping)

- **Intro.** The shop door slides open and the camera dollies in from the street (a GSAP timeline
  driving `CameraControls`, about 2.5 s, `power3.inOut`). The visitor can skip it with a tap.
  Only shown on the first visit.
- **Landing headline.** GSAP SplitText with a masked, staggered reveal.
- **Zone arrival.** A smooth camera glide, then the zone sign fades in and the zone's spotlights
  "warm up" (intensity rises from 0.6 to 1.0).
- **Product hover.** The product lifts 1 cm, scales to 1.04, and gets a rim highlight, all damped
  with `maath/easing`.
- **Add to basket.** A copy of the product flies along an arc from the shelf into the basket
  (about 600 ms). The basket wobbles, the header badge pops, and a toast slides in.
- **Overlay UI.** Motion `AnimatePresence` and layout animations for the product sheet, drawer
  and toasts. Spring physics for the mobile bottom sheet.
- **Idle life.** A soft breathing glow on the perfume wall and a gentle basket sway.
- **Reduced motion.** Everything above becomes instant cuts and fades when
  `prefers-reduced-motion` is on.

## 7. Cart

- **State.** Store it in `zustand` with `persist` (localStorage). Each line holds `productId`,
  `variantId`, `qty`. Prices are always re-read from the catalog, never stored as truth.
- **Cart drawer.** Lines with thumbnail, variant, qty stepper and remove button. Then subtotal,
  a delivery fee estimate (after a city is chosen), and the total. Show a "Continue shopping"
  button and an **Order now** button.
- **Stock limits.** You can't add more than the available stock. Disabled products disappear from
  the cart, with a notice.

## 8. Checkout and sending the order

1. **Checkout form** (react-hook-form + zod), on one screen:
   - full name
   - **phone**, validated and normalized to international format
   - **city** (select from `delivery_zones`; this sets the fee)
   - address
   - notes (optional)
   - preferred delivery time (optional)
   - payment method (**Cash on delivery**; online payment hidden until configured)
   - consent checkbox
   - a hidden honeypot field against bots
2. **Placing the order.** There is no custom server: a Postgres function on Supabase does the
   work.
   - **The function.** `place_order(payload jsonb)` is marked `SECURITY DEFINER` and called with
     `supabase.rpc`. It must:
     - validate the payload
     - **recompute every price, promo and delivery fee from the tables**, never trusting the client
     - check stock
     - create `orders` and `order_items` in one transaction and decrement stock
     - generate an order number such as `{{SHOP_PREFIX}}-000123`
     - return `{ order_number, total }`
   - **Permissions.** Anonymous users may only `EXECUTE` this function. They have no direct insert
     rights on any table.
   - **Abuse limits.** A per-phone throttle inside the function (for example, at most 5 orders
     per hour), plus the honeypot field.
   - **Owner alerts.** A database webhook on `orders` insert calls a Supabase Edge Function. The
     function sends the owner a **Telegram bot** message and/or an email (Resend) with the full
     summary.
   - **Demo mode** (no Supabase configured): skip the database and generate a local order number.
     The WhatsApp message becomes the order itself.
3. **Confirmation page** `/order/[number]`: a thank-you message, the order summary, the expected
   delivery time, and a big **"Send my order on WhatsApp"** button. The button opens
   `https://wa.me/{{WHATSAPP_NUMBER}}?text=<url-encoded message>`, built in `lib/whatsapp.ts`
   in the customer's language, for example:
   ```
   Bonjour 👋 Je confirme ma commande #BEA-000123
   • 2 × Huile d'argan cheveux 100 ml — 180 MAD
   • 1 × Vernis à ongles « Rose 05 » — 35 MAD
   Livraison : Casablanca — 30 MAD
   Total : 245 MAD (paiement à la livraison)
   Nom : … | Tél : … | Adresse : …
   ```
4. **Later, optional:** automatic WhatsApp messages through the WhatsApp Business Cloud API, and
   online payment. Design `payment_method` and the order statuses so both can be added without
   changing the schema.

## 9. Admin dashboard (`/admin`, owner only)

- **Login.** Supabase Auth with email and password. Only users listed in `admins` can sign in.
- **Dashboard.** Today's and this week's orders, revenue, best-selling products, and most-viewed
  products (from analytics).
- **Orders.**
  - List with a status filter (`new → confirmed → preparing → shipped → delivered`, plus
    `cancelled`) and search by number or phone.
  - Detail view with **click-to-call** and **click-to-WhatsApp** for the customer.
  - Change the status (a cancelled order restores its stock).
  - Print a delivery slip and export CSV.
- **Products.** Create, edit and delete products, with trilingual fields (FR/AR/EN). Fields:
  brand, price, promo price, stock, size, shape, real dimensions, zone, active/featured flags, and
  variants (name, color hex, price, stock, image). The image upload converts to WebP and warns if
  the image has no transparent background.
- **Placement editor.** A 2D front view of each fixture, showing its shelf levels. Drag products
  onto levels, reorder them, and set facings. Overflow warnings appear live. A "Preview in 3D"
  button opens the store at that fixture.
- **Settings.** Everything in §1: shop name, logo, colors, WhatsApp number, currency, delivery
  zones and fees, languages, hours, and the store dimensions.

## 10. Other pages (SEO and fallback)

- **`/catalog`.** A 2D grid of all products, with zone filters, search, sorting and
  add-to-basket. It is the fallback for devices without WebGL and the "List view" toggle inside
  the 3D store.
- **`/p/:slug`.** A product page with a "See it in the boutique" button that deep-links into 3D.
  Link previews on WhatsApp and Instagram need Open Graph tags. A build step pre-renders static
  `/p/<slug>.html` files carrying those tags (image, name, price).
- **`/`.** A landing page with the hero and an **Enter the boutique** button. Detect WebGL and
  low-end devices, and offer the catalog instead when needed.

## 11. Internationalization and accessibility

- **i18n.** Use `i18next` + `react-i18next` with **FR (default), AR, EN**. Arabic switches the overlay UI to
  **RTL**. 3D signs re-render in the current language (drei `Text` with a font that supports
  Arabic).
- **Accessibility.**
  - All overlay controls are keyboard-accessible with visible focus.
  - Products can be reached through the list view.
  - Images have alt text, and every button has an ARIA label.
  - Text meets AA color contrast.
  - Audio is off by default. Optional soft background music is behind a toggle.

## 12. Tech stack and project structure

Use the versions verified in `RESEARCH.md` §2. Pin exact versions released at least two weeks
before the start date, and commit the lockfile.

- **App:**
  - **Vite + React 19 + TypeScript (strict)**, built as a static single-page app
  - **Tailwind CSS 4** and **react-router**
  - **zustand** for client state, **zod** for validation, **react-hook-form** for forms
- **3D:**
  - **three 0.186.x**, **@react-three/fiber 9**, **@react-three/drei 10** (`CameraControls`,
    `Html`, `Text`, `useGLTF`, `Instances`, `Environment`, `Lightformer`, `ContactShadows`,
    `PerformanceMonitor`, `KeyboardControls`, `Outlines`)
  - **@react-three/postprocessing**, **three-mesh-bvh** and **maath**
- **Motion:** **gsap** with `@gsap/react`, and **motion**.
- **Backend:** **Supabase** (Postgres, Auth, Storage, Edge Functions) with Row Level Security.
  The Telegram Bot API and/or Resend send notifications.
- **Two run modes:**
  - **Demo** is the default: catalog from `public/data/*.json`, orders by WhatsApp only, no
    accounts needed.
  - **Live** is on when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
    (`.env.example` provided).
- **Testing and hosting:** **Vitest** for unit tests, **Playwright** for end-to-end tests and
  screenshots. Deploy as static files to Vercel or Netlify (with branch preview links), Cloudflare
  Pages, or GitHub Pages.
- **Dev only:** `leva` and `r3f-perf`.

```
src/main.tsx, src/App.tsx          router: /, /store, /catalog, /p/:slug, /checkout, /order/:number, /admin/*
src/pages/                         Landing, Store, Catalog, Product, Checkout, OrderConfirmation, admin/*
src/three/                         Boutique, Room, Lighting, CameraRig, IntroSequence, Basket, FlyToBasket
  fixtures/                        WallShelf, NailPolishRack, PerfumeWall, Island, Counter, VanityMirror, Sign, Door
  products/                        ProductInstances, ProductShapes, ProductHotspot
src/ui/                            Header, ZoneBar, ProductSheet, ProductDetails, CartDrawer, Toasts, MiniMap, Onboarding, LoadingScreen
src/lib/                           store-layout.ts, shelf-layout.ts, cart-store.ts, ui-store.ts, pricing.ts, whatsapp.ts,
                                   money.ts, data-source.ts (demo JSON | Supabase), i18n/
public/data/                       demo catalog JSON + product images
public/textures, public/models     optimized CC0 textures, HDRI, GLB
supabase/migrations/               SQL schema, RLS, place_order()
supabase/functions/notify-order/   Edge Function: Telegram / email alert
scripts/                           seed.ts, cutout-products.py (rembg + BiRefNet), optimize-assets.ts (gltf-transform + sharp),
                                   blender/build_and_bake.py (Route B), prerender-og.ts
.claude/skills/                    installed Claude Code skills (Phase 0)
```

## 13. Database schema (Supabase / Postgres)

```sql
create table settings (id int primary key default 1 check (id = 1),
  shop_name text, logo_url text, primary_color text, accent_color text,
  whatsapp_number text, currency text default 'MAD', default_locale text default 'fr',
  store_width numeric default 3.5, store_depth numeric default 6.5, ceiling_height numeric default 3.0,
  address text, opening_hours jsonb, instagram_url text, order_prefix text);

create table zones (id uuid primary key default gen_random_uuid(), slug text unique,
  name jsonb not null,               -- {"fr": "Cheveux", "ar": "الشعر", "en": "Hair care"}
  fixture_id text not null,          -- matches lib/store-layout.ts
  sort int default 0);

create table products (id uuid primary key default gen_random_uuid(), slug text unique,
  zone_id uuid references zones, brand text, name jsonb not null, description jsonb,
  how_to_use jsonb, ingredients text, size_label text,
  price numeric(10,2) not null, promo_price numeric(10,2), stock int default 0,
  is_active boolean default true, is_featured boolean default false, is_new boolean default false,
  shape text check (shape in ('box','bottle','jar','tube','pouch','perfume','lipstick','compact','polish')),
  width_cm numeric not null, height_cm numeric not null,
  image_front_url text not null, gallery text[] default '{}',
  fixture_id text, shelf_level int, slot_order int, facings int default 2 check (facings between 1 and 4),
  created_at timestamptz default now());

create table product_variants (id uuid primary key default gen_random_uuid(),
  product_id uuid references products on delete cascade, name jsonb not null,
  color_hex text, price numeric(10,2), stock int default 0, image_url text, sort int default 0);

create table delivery_zones (id uuid primary key default gen_random_uuid(),
  city text not null, fee numeric(10,2) not null, eta text, is_active boolean default true);

create table orders (id uuid primary key default gen_random_uuid(), number text unique not null,
  status text not null default 'new'
    check (status in ('new','confirmed','preparing','shipped','delivered','cancelled')),
  customer_name text not null, phone text not null, city text not null, address text not null,
  notes text, preferred_time text, payment_method text not null default 'cod',
  subtotal numeric(10,2) not null, delivery_fee numeric(10,2) not null, total numeric(10,2) not null,
  locale text, source text, created_at timestamptz default now());

create table order_items (id uuid primary key default gen_random_uuid(),
  order_id uuid references orders on delete cascade, product_id uuid references products,
  variant_id uuid references product_variants, name_snapshot text not null,
  unit_price numeric(10,2) not null, qty int not null check (qty > 0), line_total numeric(10,2) not null);

create table admins (user_id uuid primary key references auth.users);
create table events (id bigserial primary key, type text, product_id uuid, zone text,
  session_id text, created_at timestamptz default now());   -- zone_visit, product_view, add_to_cart, checkout_start, order_placed
```

**RLS rules:**
- Anyone may read active products, zones, variants, delivery zones and settings.
- Nobody inserts into `orders` or `order_items` directly. Anonymous users may only
  `EXECUTE place_order(jsonb)`, a `SECURITY DEFINER` function that prices, validates and inserts.
- Only admins may read or update orders and edit the catalog.

## 14. Phases (build and demo each one before moving on)

After every phase, take Playwright screenshots of each viewpoint at desktop 1440×900 and phone
390×844 so the owner can review the look.

0. **Tooling.**
   - Install and review the Claude Code skills from `RESEARCH.md` §1: `cloudai-x/threejs-skills`,
     plus `frontend-design` and `webapp-testing` from `anthropics/skills`.
   - Scaffold Vite, React, TypeScript, Tailwind, R3F, ESLint/Prettier and Vitest/Playwright.
   - Add a CI workflow that runs lint, typecheck, tests and the build.
1. **Foundation.**
   - Add `store-layout.ts` and the procedural room: walls, floor, ceiling, door, windows,
     fixtures and signs.
   - Lighting with Poly Haven textures and HDRI, the loading screen, and the guided camera with
     viewpoints, zone bar and mini-map.
   - Runs in demo mode.
2. **Products.**
   - Demo catalog: **40 products** across all zones, with generic names (no real brand logos) and
     placeholder cutout images.
   - Shelf auto-layout, product shape meshes, instancing, hover/tap, the product card with
     variants, and the details modal.
3. **Cart, orders and motion.**
   - The cart store and drawer, the first-person basket, and fly-to-basket.
   - Checkout and the WhatsApp order, which already works in demo mode.
   - The intro sequence, zone-arrival effects, and the UI motion from §6b.
4. **Live backend and admin.**
   - Supabase migrations and RLS, `place_order()`, and the owner-alert Edge Function.
   - Admin: auth, orders, products and variants, the placement editor, and settings.
5. **Polish and launch.**
   - Mobile controls and portrait layout, i18n and RTL, the catalog and product pages, and the
     pre-rendered link previews.
   - Analytics events, the performance and accessibility pass, Route B baked lighting, and
     deployment with preview links.

## 15. Performance budget (test on a mid-range Android phone)

- **Frame rate:** at least 30 fps on a mid-range phone and at least 60 fps on a laptop.
- **Draw calls:** at most 120. **Load:** the first interaction within 5 s on 4G, and at most
  8 MB of initial download.
- **Pixel ratio:** cap DPR at 1.5 on mobile. Use `PerformanceMonitor` to lower quality
  automatically when fps drops.
- **Textures and models:** WebP/KTX2 textures, compressed GLB (Draco/Meshopt). Static geometry is
  merged. No real-time shadows.

## 16. Acceptance criteria

- [ ] `npm install && npm run dev` runs the full boutique in **demo mode** with no accounts. A
      WhatsApp order can be sent from it.
- [ ] On a phone, I can enter the boutique, jump to every zone from the zone bar or the mini-map,
      and pan along each wall.
- [ ] Every active product appears on its shelf at its real size and can be opened. Its variants
      change the price and image.
- [ ] The basket survives a page reload. The header shows the right count and total.
- [ ] Placing an order stores it with prices recomputed on the server and notifies me. The
      customer sees the order number and a working WhatsApp button with the full order text.
- [ ] Tampering with prices in the request has no effect on the stored order.
- [ ] In the admin I can add a product with a photo, put it on a shelf, and see it in 3D without
      redeploying. I can manage order statuses.
- [ ] FR, AR (RTL) and EN all work. The catalog view works without WebGL.
- [ ] The performance budget holds. Lighthouse accessibility score is at least 90 on the overlay
      pages.
- [ ] Unit tests cover the shelf layout, pricing and the WhatsApp message. A Playwright test
      covers browse → add → checkout → confirmation.

## 17. Constraints

- No hard-coded business data (prices, phone, fees, texts). Everything comes from the database
  or the translation files.
- Don't use another retailer's branding. Real product photos are uploaded by the shop owner.
- Keep the code typed, modular and commented where it isn't obvious. Provide a `README` with
  setup steps (Supabase project, env vars, seed, deploy).

---

### What the shop owner needs to prepare
1. **Measurements** (width, depth, ceiling height, door position) and **photos or a video of each
   wall**, so the layout in §2 matches the real shop.
2. **The product list** as a spreadsheet:
   - name, brand, zone, size/volume
   - price, promo price, stock
   - short description
   - variants (shades, sizes)
   - approximate width and height in cm
3. **Product photos.** Front-facing, on a plain background. A transparent PNG is ideal; background
   removal can be done in bulk.
4. **Branding.** Logo, colors, shop name, Instagram.
5. **Selling details.** The WhatsApp number that receives orders, delivery cities with fees and
   delays, and the payment method.
6. **Accounts.** None are needed for demo mode. For live mode: free **Supabase** and **Vercel**
   (or Netlify) accounts, a domain name, and optionally a Telegram bot for order alerts.
