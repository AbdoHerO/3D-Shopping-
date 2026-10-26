# Research: tools, skills and techniques for a high-quality 3D boutique

Research date: **2026-10-25**. I checked package versions, release dates and peer dependencies
directly on the npm registry, and Poly Haven asset counts and Blender wheels on their APIs.
GitHub star counts and license notes come from the repository pages. Anything I could only
confirm second-hand is marked *(verify)*.

**Bottom line:** the stack in [`BUILD_PROMPT.md`](BUILD_PROMPT.md) is current and every part is
compatible with the others. There are ready-made **Claude Code skill packs** for exactly these
versions. The biggest levers for quality are:
1. **Baked lighting from Blender.** Blender can run headless in this environment
   (`bpy` 5.2.3 matches its Python 3.13).
2. **Free (CC0) materials and lighting** from Poly Haven.
3. **Clean product cutouts.**
4. **A layer of motion design** built with GSAP and Motion.

---

## 1. Claude Code skills worth installing (Phase 0)

| Pack | License · stars | What it gives | Use? |
|---|---|---|---|
| [cloudai-x/threejs-skills](https://github.com/cloudai-x/threejs-skills) | MIT · 3.7k | 13 skills that target **exactly our versions**: three r186, R3F 9.8, drei 10.7, gltf-transform 4.5. Includes fundamentals, geometry, materials, lighting, textures, animation, loaders, shaders, post-processing, interaction, **performance**, **react-three-fiber** and **asset pipeline**. | **Yes: the main 3D pack** |
| [EnzeD/r3f-skills](https://github.com/EnzeD/r3f-skills) | MIT · 130 | 11 R3F-specific skills, tested against R3F 9.7, drei 10.7.8 and three 0.185.1. The animation, interaction and post-processing skills are strong. | Only `r3f-animation` and `r3f-interaction`, to avoid overlapping advice |
| [anthropics/skills](https://github.com/anthropics/skills) | Apache-2.0 for most *(verify per skill)* | `frontend-design` (distinctive, production-grade UI) and `webapp-testing` (Playwright: screenshots, console logs, UI checks) | **Yes, both** |
| [freshtechbro/claudedesignskills](https://github.com/freshtechbro/claudedesignskills) | MIT · 1.1k | `gsap-scrolltrigger`, `motion-framer`, `blender-web-pipeline`, `lightweight-3d-effects` and more. The last dated entry is from Nov 2025, so it is older. | Only `gsap-scrolltrigger`, `motion-framer` and `blender-web-pipeline` |
| [OpenAEC-Foundation/Three.js-Claude-Skill-Package](https://github.com/OpenAEC-Foundation/Three.js-Claude-Skill-Package) | – | 24 skills, but they target R3F 8 and three r160. | No (outdated for React 19) |

**Install** with the skills CLI (needs Node ≥ 22.20; this environment has 22.22). Skills are
installed into the project, so they live in the repo and work for anyone who opens it:
```bash
npx skills add cloudai-x/threejs-skills -a claude-code
npx skills add anthropics/skills --skill frontend-design -a claude-code
npx skills add anthropics/skills --skill webapp-testing -a claude-code
```
I'll review every installed `SKILL.md` before committing it.

**Already available in this session:**
- `run`: launch the app and take screenshots
- `code-review`, `simplify`, `security-review`

## 2. Library stack (latest versions on npm today)

| Area | Package | Latest | Notes |
|---|---|---|---|
| 3D core | `three` | 0.186.1 | |
| | `@react-three/fiber` | 9.8.2 | requires React ≥ 19 and < 19.4 |
| | `@react-three/drei` | 10.7.9 | `CameraControls`, `Html`, `Text`, `Instances`, `Environment`, `Lightformer`, `ContactShadows`, `PerformanceMonitor`, `KeyboardControls`, `Outlines` |
| | `@react-three/postprocessing` | 3.2.2 | its `postprocessing` 6.39.5 needs three < 0.187, so **keep three on 0.186.x** |
| | `three-mesh-bvh` | 0.9.16 | fast raycasting for picking among hundreds of products |
| | `maath` | 0.10.8 | `easing.damp3` and friends for smooth camera and hover motion |
| App | `react` / `react-dom` | 19.3.1 | |
| | `vite` + `@vitejs/plugin-react` | 8.3.5 / 6.1.2 | |
| | `tailwindcss` + `@tailwindcss/vite` | 4.3.3 | |
| | `react-router` | 8.5.0 | |
| | `zustand` | 5.0.16 | |
| | `i18next` + `react-i18next` | 26 / 17 | FR, AR (RTL), EN |
| | `zod`, `react-hook-form` | 4.6 / 7.91 | |
| Motion | `gsap` + `@gsap/react` | 3.15.0 / 2.1.2 | **All plugins are now free for commercial use, including SplitText** ([Webflow announcement](https://webflow.com/blog/gsap-becomes-free)) |
| | `motion` | 14.6.0 | UI motion: sheets, drawers, toasts, layout animations |
| Backend | `@supabase/supabase-js` | 2.118.0 | Postgres, Auth, Storage, Edge Functions |
| Assets | `@gltf-transform/cli` | 4.5.1 | meshopt, KTX2/WebP, deduplicate, prune |
| | `gltfjsx` | 6.5.3 | |
| | `sharp` | 0.35.5 | |
| Testing | `vitest` | 5.0.5 | |
| | `@playwright/test` | 1.64.1 | Chromium is already installed here |
| Dev only | `leva` 0.10.1, `r3f-perf` 7.2.3 | | live tuning and an FPS / draw-call overlay |
| Optional | `@sparkjsdev/spark` | 2.4.0 | MIT. Renders Gaussian splats in three.js (≥ r180). See §4C. |

**Version pinning.** Several of these versions were published in the last few days. Use **exact
versions released at least two weeks before the build starts**, and commit the lockfile.

**Theatre.js is rejected.** `@theatre/r3f` 0.7.2 is still labelled pre-release, and its R3F docs
were last edited in Feb 2024 ([docs](https://www.theatrejs.com/docs/latest/extensions/react-three-fiber)).
GSAP timelines cover the same camera choreography and are actively maintained.

## 3. Architecture choice: Vite single-page app + Supabase, with no custom server

I'm switching the earlier draft from Next.js to a **static Vite app**, because you want to run it
in the browser easily:
- **Run locally:** `npm install && npm run dev` opens the boutique at `localhost`. It's the
  fastest edit-and-reload loop for 3D work.
- **Host anywhere:** `npm run build` produces static files for Vercel, Netlify, Cloudflare Pages
  or GitHub Pages. With Vercel or Netlify, every branch gets its own **preview link** you can open
  on your phone.
- **Demo mode** needs no accounts:
  - the catalog comes from `public/data/*.json`
  - orders go out by **WhatsApp only**
  - the admin is hidden

  It runs the moment you open it.
- **Live mode** is switched on by setting `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
  - Orders go through a Postgres function, `place_order(payload)`, marked `SECURITY DEFINER`. It
    **recomputes prices and stock on the database side**, so price tampering is impossible. The
    public can call only that function; it cannot write to tables directly.
  - When an order is inserted, a database webhook and a Supabase Edge Function send the owner a
    **Telegram and/or email** alert.
- **Trade-off:** an SPA has weaker link previews. That's fixed in Phase 5 by pre-rendering static
  `/p/<slug>.html` pages with Open Graph tags, so product links show a picture and price when
  shared on WhatsApp or Instagram.

## 4. Visual quality: three routes, in increasing realism

### A. Procedural and PBR (Phases 1–3, the default)
- **Fixtures from the layout data.** Fixtures are built in code from `store-layout.ts`, so
  changing a dimension rebuilds the shop.
- **CC0 materials from [Poly Haven](https://polyhaven.com).** The API currently lists 869
  textures, 521 models and 301 indoor HDRIs. Candidates:
  - floor: `marble_01`, `herringbone_parquet`, `floor_tiles_0x`
  - walls: `clay_plaster`, `grey_plaster`
  - decor models: ceramic and brass vases, plants, stools, lamps
- **Lighting stack:**
  - a 1k indoor HDRI for reflections
  - drei `Lightformer` softboxes, so glass and gloss show clean highlights
  - shadows baked once with `AccumulativeShadows`/`ContactShadows`
  - SMAA and ambient occlusion (N8AO), plus a subtle **bloom on the backlit perfume wall**, on
    high-tier devices only

### B. Baked lighting from Blender (Phase 5 polish; the biggest visual jump)
- **Headless Blender.** `bpy` 5.2.3 installs with `pip` for Python 3.13, which is this
  environment's Python. A script reads the same layout file, builds the room and fixtures, and
  **bakes Cycles lightmaps** (soft global illumination and ambient occlusion). It exports a GLB,
  compressed with gltf-transform (meshopt plus KTX2).
- **Result:** soft, realistic interior light at almost no runtime cost. This is how
  premium three.js interiors are made.
- **Known pitfalls** ([three.js forum](https://discourse.threejs.org/t/apply-uv-coordinates-and-lightmaps-baked-from-blender-to-mesh/63910),
  [bake guide](https://svilenkovic.com/3d/how-to-bake-lighting-for-web)):
  - the lightmap must use the **second UV set**
  - set `texture.flipY = false`
  - the glTF exporter puts the lightmap in the occlusion slot, so it has to be remapped in code

### C. Photoreal copy of your real shop (optional, later)
- **Capture.** Scan the shop with a phone (Scaniverse, Polycam or Luma) to get a Gaussian splat.
- **Render.** Display it with **Spark 2.4** (MIT, WebGL2, streamed level of detail)
  ([repo](https://github.com/sparkjsdev/spark)). The interactive product cards, hotspots and walls
  stay as regular three.js objects on top of it.
- **Cost:** a larger download (tens of MB), no relighting, and products still need to be
  separate objects. A good "wow" upgrade once the shop is selling.

## 5. Products: from your photos to the 3D shelves

1. **Cut out the background.** A batch script runs `rembg` with a **BiRefNet** model, which beats
   the default `u2net` on product edges. BiRefNet is reported as MIT *(verify the license)*. The
   script outputs **WebP at 512 px for the shelves and 1024 px for the detail view**. Owners can
   also upload already-cut PNGs in the admin.
2. **Give each product a shape.** Low-poly meshes are generated in code for each `shape`:
   - bottle, jar, tube, box, pouch
   - perfume, lipstick, compact, polish

   The product photo is mapped onto the front as the label. They look like real objects, with
   no 3D modelling needed per product.
3. **Hero products (optional).** These get true 3D models:
   - bought packs from CGTrader or TurboSquid, or
   - **image-to-3D** with TRELLIS.2 (reported MIT, but needs 16–24 GB of GPU memory, so it would
     run as a hosted job) *(verify)*

   Avoid Hunyuan3D for this: its community license excludes the EU, UK and South Korea *(verify)*.

## 6. Motion design plan

| Moment | Technique |
|---|---|
| Landing headline and logo reveal | GSAP **SplitText** with a masked reveal and a stagger |
| **Intro:** the shop door slides open and the camera dollies in | A GSAP timeline driving `CameraControls` (`power3.inOut`, about 2.5 s), skippable with a tap |
| Moving between zones | `CameraControls.setLookAt(…, true)` with tuned `smoothTime`. The zone sign fades in and the shelf spotlights "warm up" (light intensity rises from 0.6 to 1.0 on arrival). |
| Hovering a product | `maath` damping: the product lifts 1 cm, scales to 1.04, gains a rim highlight and shows its hotspot |
| **Add to basket** | A copy of the product **flies along an arc** from the shelf into the basket (about 600 ms). The basket wobbles, the header badge pops, and a toast slides in. |
| Product card, cart drawer, toasts | Motion `AnimatePresence` and layout animations. Spring physics for the bottom sheet on mobile. |
| Idle life | A soft "breathing" glow on the perfume wall and a gentle basket sway while walking |
| Accessibility | All of the above is replaced by instant cuts and fades when `prefers-reduced-motion` is on |

## 7. Reference projects (for ideas, not as a code base)

- [lisaberger/shopi](https://github.com/lisaberger/shopi): a webshop prototype with a 360° viewer, an AR viewer and **hotspot annotations**.
- [sheyda0/fizzi-3d-ecommerce-landing](https://github.com/sheyda0/fizzi-3d-ecommerce-landing): R3F, GSAP, Zustand and Tailwind on Next.js. A good **motion design reference**.
- [Codrops: camera fly-through with Theatre.js and R3F](https://tympanus.net/codrops/2023/02/14/animate-a-camera-fly-through-on-scroll-using-theatre-js-and-react-three-fiber/): a camera path pattern we'll reproduce with GSAP.
- [Best Three.js websites 2026 (Utsubo)](https://www.utsubo.com/blog/best-threejs-websites-2026): Cartier's 2026 pavilion uses **one 3D "alcove" per product**, which fits our zone-by-zone boutique.
- [Appzlogic case study](https://www.appzlogic.com/casestudies/creating-an-immersive-virtual-store-for-a-cosmetic-brand/): a 360° Three.js virtual store for a cosmetics brand. The vendor reports **40% longer sessions**, but the figure is self-reported.

## 8. How I'll verify quality while building

- **Automated screenshots.** After each phase, Playwright (Chromium is installed here) captures
  every viewpoint at **desktop 1440×900 and phone 390×844**. I send them to you so you can judge
  the look before we move on.
- **Performance overlay.** `r3f-perf` in development checks the budget: ≤ 120 draw calls, ≥ 30 fps
  on a mid-range phone, DPR capped at 1.5.
- **Code checks.** Unit tests (Vitest) and end-to-end tests (Playwright), then the `code-review`
  and `security-review` skills before each push.
