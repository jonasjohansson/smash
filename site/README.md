# SMASH — website

The production app for smash.studio. Right now it is a **greyscale wireframe**: real
architecture, real content model, real routes, and deliberately no visual design. The brand
direction comes from CM.SUPPLY separately; this repo is built so that direction lands on top
of a structure that already works.

- **Stack:** Next.js 16 (App Router, Turbopack) · React 19 · Tailwind v4 · three.js
  WebGPURenderer under React Three Fiber v9 · Lenis + GSAP · Sanity (schema in-repo, project
  connected later).
- **Node:** v24 · **npm:** 11

---

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

No environment variables are needed. With Sanity unconfigured the site serves local seed
content from `content/seed.ts`, and every page works.

| Script | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run poster` | Regenerate `public/hero-poster.png` |
| `npm run seed` | Push seed content to Sanity (needs a write token — see below) |

### Debug overlay

Append `?debug=1` to any URL for the `[SMASH]` panel: renderer backend (WebGPU vs WebGL2
fallback), renderer instance count, TSL compile status, boot trigger, route/scene tone, Lenis
and ScrollTrigger state, and a `console.error` tap. It renders nothing without the flag, and
the `log()` calls throughout the app are gated on the same flag.

The `console.error` tap is not decoration. WebGPU material incompatibilities are emitted
asynchronously from inside the renderer during draw — nothing throws through React, and no
error boundary can catch them. The tap is the only reliable capture.

---

## Routes

| Route | What it is |
|---|---|
| `/` | Hero (poster + canvas) → mission statement → four segments → studio teaser → invitation |
| `/studio` | About: story, approach, capability, team, selected clients |
| `/work` | Case-study index with a working segment filter |
| `/work/[slug]` | Case-study template: idea → context → audience experience → transformation, media between sections, meta + credits, next project |
| `/expertise/[slug]` | One page per segment: intro, "how it feels" / "what it does", related work |
| `/lab` | Playground grid — placeholder frames for future web toys |
| `/contact` | Contact as a destination: big CTA, details, non-functional form layout |
| `/admin` | Embedded Sanity Studio (shows setup instructions until Sanity is connected) |

`/admin` sits **outside** the `(site)` route group on purpose: the Studio needs the whole
viewport, with no header, footer, smooth scroll or 3D canvas around it.

---

## Architecture notes

These are ported from a throwaway spike (`../../smash-website-spike/SPIKE-RESULTS.md`) that
proved each pattern against a running build. They are not preferences — changing them will
break things in ways that are hard to see.

### One persistent canvas

`components/canvas/CanvasRoot.tsx` is rendered by `app/(site)/layout.tsx` as a **sibling of
`{children}`**. The App Router swaps `{children}` on navigation but keeps the layout's own
subtree mounted, so the `<Canvas>` element identity never changes and the WebGPU renderer is
constructed exactly once per session. Moving `CanvasRoot` into a page silently undoes this.

Scene content reacts to the route through `lib/canvas-store.ts` (zustand) rather than by
remounting: each route maps to a `tone`/`density` pair in `lib/route-tone.ts` and the shader
uniforms ease towards the new values. R3F v9 *does* bridge React context into the canvas
(`usePathname()` works inside it), but the store keeps animation state out of React entirely.

Verify persistence against a **production build** — in dev, StrictMode's double-mount looks
exactly like a persistence failure.

### WebGPU renderer

`components/canvas/SceneCanvas.tsx` uses R3F v9's async `gl` factory to construct a
`WebGPURenderer` and `await renderer.init()` before R3F ever touches it. `forceWebGL` is
deliberately not set, so three's automatic WebGL2 fallback is what runs on browsers without
`navigator.gpu`.

Detect the backend with the `isWebGPUBackend` / `isWebGLBackend` **brand flags**, never
`backend.constructor.name` — that minifies to junk in production (the spike observed `Ro`).

R3F types `RootState.gl` as `THREE.WebGLRenderer`, so WebGPU-specific access needs a cast.
There is one helper, `asRenderer()`, and it should stay the only one.

### drei on WebGPU — what you may and may not use

Anything that touches `ShaderMaterial`, `onBeforeCompile` or `.defines` is presumed broken
until proven otherwise; three's `NodeBuilder` cannot consume GLSL materials, and
`onBeforeCompile` is inert with no warning.

| Safe | Broken |
|---|---|
| `OrbitControls`, `Environment`, `Html`, `useGLTF`, `Float` | `Text` (troika) — renders a white quad |
| | `ContactShadows` — draws nothing |
| | `MeshTransmissionMaterial` — silently opaque, **no error at all** |

Replacements: type in the DOM via `Html`, or a TSL-authored material; real shadow maps or a
baked shadow; `MeshPhysicalNodeMaterial` for transmission.

Also: drei's `Environment` presets fetch HDRIs from a third-party GitHub proxy at runtime.
**Self-host any HDRI** rather than putting someone else's CDN on a client site's critical path.

`renderer.compileAsync()` is the only cheap proof that a TSL graph produced valid shader code —
`AmbientField.tsx` runs it and reports pass/fail to the debug overlay. Keep that habit for
every custom node material.

### Poster-first boot

The hero poster is a server-rendered `<img>` (next/image with `priority`, which also emits a
`<link rel="preload">`). The 3D chunk is `next/dynamic(..., { ssr: false })` and is not even
*rendered* until `window.load` → `requestIdleCallback` (with a `setTimeout` fallback for
Safari), then cross-fades in over the poster on its first frame.

Under `prefers-reduced-motion: reduce` the chunk is **never requested**. That path is not a
degraded experience — it is the site, minus one background texture. The 3D chunk costs roughly
400 KB brotli; budget for it and keep it behind the gate.

### Lenis + GSAP

`components/site/SmoothScroll.tsx`. Lenis' own rAF is off (`autoRaf: false`) and GSAP's ticker
is the single clock, with `lagSmoothing(0)`.

**The trap:** `<ReactLenis ref={r}>` does **not** give a parent a usable instance in the
parent's mount effect. lenis-react creates the Lenis object inside its own effect and stores it
in React *state*, so `ref.current.lenis` is `undefined` for the whole first commit and a parent
effect reading it silently no-ops — no error, no smooth scroll. Wire it from a **child** via
`useLenis()`. Hoist the options object to module scope too; `ReactLenis` re-creates the
instance whenever `JSON.stringify(options)` changes.

On route change, `RouteScrollSync` resets scroll, kills triggers whose element left the DOM,
and refreshes — two frames out, so the incoming page's own triggers exist first. It
deliberately does not kill everything: pages revert their own triggers through `useGSAP`'s
scoped cleanup.

`SplitText` ships free in the `gsap` package since 3.13. Always create it inside `useGSAP` with
a scope so its DOM surgery is reverted; otherwise navigating away leaves orphaned wrapper spans
and the next visit splits already-split markup.

---

## Content: seed now, Sanity later

Everything renders from `sanity/fetch.ts`. Each function returns Sanity content when a project
is configured and **local seed content otherwise** — including when a configured Sanity is
down or returns nothing. The GROQ projections in `sanity/queries.ts` are written to return JSON
that is structurally identical to `content/seed.ts` (slug already flattened to a string, arrays
coalesced to `[]`), so there is no mapping layer and only one set of types (`sanity/types.ts`).

Seed content: the four segments, four case studies (one real — Reitan Artbox — and three
explicitly labelled placeholders), three lab experiments, and site settings.

### Connecting the real Sanity project

1. **Create the project.** From `site/`:
   ```bash
   npx sanity@latest login
   npx sanity@latest init --project-plan free   # or create it at sanity.io/manage
   ```
   Take the **project ID** and **dataset** name. Do not let the CLI overwrite
   `sanity.config.ts` — the schema and Studio config already exist here.

2. **Set the environment.**
   ```bash
   cp .env.local.example .env.local
   ```
   Fill in `NEXT_PUBLIC_SANITY_PROJECT_ID` and `NEXT_PUBLIC_SANITY_DATASET`. That is the whole
   code-side change — `sanity/env.ts` flips `isSanityConfigured` and every fetch switches source.

3. **Add CORS origins** at sanity.io/manage → API → CORS origins: `http://localhost:3000`
   (allow credentials), plus the production and preview domains when they exist.

4. **Seed the dataset (optional but recommended).** Create a token at sanity.io/manage → API →
   Tokens with the **Editor** role, put it in `.env.local` as `SANITY_API_WRITE_TOKEN`
   (server-only — never prefix it with `NEXT_PUBLIC_`), then:
   ```bash
   npm run seed -- --dry   # list what would be written
   npm run seed            # write it
   ```
   The script uses deterministic document ids and `createOrReplace`, so it is idempotent — and
   it **will overwrite** editor changes to those documents. It is a bootstrap tool, not a sync.

5. **Restart the dev server.** `/admin` becomes the Studio; the site reads live content.

### Schema map

| File | Document |
|---|---|
| `sanity/schemas/caseStudy.ts` | Project: meta, four narrative sections, gallery, credits |
| `sanity/schemas/segment.ts` | One of the four offerings |
| `sanity/schemas/labExperiment.ts` | Playground piece |
| `sanity/schemas/siteSettings.ts` | Singleton: mission, about teaser, CTA, contact |
| `sanity/schemas/objects.ts` | `media`, `narrativeSection`, `credit`, `socialLink` |

The four narrative beats are separate fields, not one free-form body, so a project can never
quietly become a list of tools and effects.

---

## Wireframe vs permanent

**Permanent — build on this:**

- App Router structure, the `(site)` group and the `/admin` split
- Persistent canvas mechanism, boot gate, reduced-motion path, `asRenderer()`
- Lenis/GSAP wiring and the route-change scroll sync
- The content model, GROQ projections, seed fallback and types
- The debug overlay and `?debug=1` gate

**Wireframe — expected to be replaced:**

- Everything in `app/globals.css`: greyscale palette, system font stacks, the whole visual layer
- `components/wireframe/*` — dashed placeholder blocks, `Eyebrow`, `WireNote`. The `WireNote`
  boxes are visible on purpose; a placeholder that looks finished is how placeholders ship.
- `components/canvas/AmbientField.tsx` — a stand-in TSL gradient, not the signature scene
- `public/hero-poster.png` — generated grey field, replace with a real still
- All page copy. It is written in the studio's voice so the layout is judged at real length,
  but it is placeholder. Three of the four case studies say so in their titles.
- The contact form: layout only, no submission, `type="button"` on the send control
- The `/lab` frames: nothing runs in them yet
- The shared "how it feels / what it does" blocks on segment pages
- The `/studio` team grid — not modelled in Sanity

## Known environment notes

- **npm cache.** The machine has a root-owned directory in `~/.npm/_cacache` that makes plain
  `npm install` fail with `EACCES`. This project was installed with
  `npm install --cache ~/.npm-smash-cache`. Worth fixing on the machine.
- **Headless / background tabs.** R3F sizes its canvas from a `ResizeObserver`, which a
  non-frontmost tab never receives — the canvas stays 300×150 and the renderer is never
  constructed. A synthetic `window.dispatchEvent(new Event('resize'))` unblocks it. This is an
  environment artefact, not a bug; a foreground tab never hits it.
