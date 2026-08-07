# SMASH website — architecture spike results

**Date:** 2026-08-07 · **Status:** throwaway proof-of-architecture, not production code.

Four architectural bets for an award-level creative site (Next.js 16 + React Three Fiber,
WebGPU-first) plus a drei/WebGPU compatibility matrix. Everything below was observed —
via `npm run build` output, `curl` against a running server, or the browser console and
screenshots of the running production build in Chrome — not inferred from documentation.

---

## Verdicts at a glance

| # | Bet | Verdict |
|---|-----|---------|
| 1 | WebGPURenderer under R3F (async `gl` factory + TSL) | **PROVEN** |
| 2 | Persistent canvas across route navigations | **PROVEN** |
| 3 | Lenis + GSAP ScrollTrigger + App Router | **PROVEN WITH CAVEATS** |
| 4 | Poster-first LCP, deferred canvas boot | **PROVEN** |
| 5 | drei compatibility vs WebGPURenderer | **PARTIAL — 5 of 8 usable, 3 silently broken** |

---

## Exact versions installed

| Package | Version |
|---|---|
| next | 16.3.0 (Turbopack) |
| react / react-dom | 19.2.8 |
| three | **0.185.1** |
| @types/three | 0.185.4 (ships `three/webgpu` + `three/tsl` declarations) |
| @react-three/fiber | 9.7.0 |
| @react-three/drei | 10.7.8 |
| gsap | 3.15.0 (SplitText + ScrollTrigger bundled, free) |
| @gsap/react | 2.1.2 |
| lenis | 1.3.26 |
| zustand | 5.0.14 |
| typescript | 5.9.3 · tailwindcss | 4.3.3 |
| *(transitive)* troika-three-text | 0.52.5 |
| *(transitive)* react-use-measure | 2.1.7 |

Node v24.14.0 / npm 11.9.0. Browser: Chrome on macOS 15 (Darwin 25.5.0), Apple Silicon, DPR 2.

---

## Build / SSR verification

```
npm run build   ✓ Compiled successfully — 3 static routes (/, /_not-found, /work)
npx tsc --noEmit   ✓ clean
npm run lint       ✓ clean
```

`curl` against the dev server:

- `GET /` → **200**, `GET /work` → **200**
- Hero poster **is** in the SSR HTML:
  `<img alt="SMASH hero poster" fetchPriority="high" width="1600" height="900" ... src="/_next/image?url=%2Fposter.png...">`
  plus a matching `<link rel="preload" as="image" ... fetchPriority="high">` in `<head>`.
- `<canvas>` count in the SSR HTML of both routes: **0**. The only occurrence of the string
  "webgpu" is the debug overlay's section heading — no three.js code is server-rendered.

---

## BET 1 — WebGPURenderer under R3F · **PROVEN**

The async `gl` factory pattern **is** supported in the installed R3F. `GLProps` in
`@react-three/fiber@9.7.0` is literally:

```ts
export type GLProps =
  | Renderer
  | ((defaultProps: DefaultGLProps) => Renderer)
  | ((defaultProps: DefaultGLProps) => Promise<Renderer>)   // <- this one
  | Partial<Properties<THREE.WebGLRenderer> | THREE.WebGLRendererParameters>
```

and `createRoot().configure()` does `typeof glConfig === 'function' ? await glConfig(defaultProps) : glConfig`.
R3F passes exactly four default props: `{ canvas, powerPreference: 'high-performance', antialias: true, alpha: true }`.

Observed in the production build, in Chrome:

```
[SPIKE] renderer.construct #1 — new THREE.WebGPURenderer(...) Array(4)
[SPIKE] renderer.init resolved in 18ms — backend: WebGPUBackend (Ro)
[SPIKE] tsl.compileAsync OK — node material compiled on the active backend
```

- **Backend actually active: WebGPU.** Not the WebGL2 fallback. `navigator.gpu` present.
- **`renderer.init()` took 18 ms.** Cheap.
- **DPR cap works:** viewport 1728×997 CSS px on a DPR-2 display produced a
  `<canvas>` backing store of exactly **3456×1994** — i.e. `dpr={[1,2]}` was applied.
- **TSL authoring works.** `MeshBasicNodeMaterial` with a hand-written graph using
  `uv()`, `time`, `sin`, `mix`, `color`, `mx_noise_float`, `positionLocal` and a
  `uniform()` node — driving `colorNode`, `opacityNode` *and* `positionNode` — compiled and
  rendered (visually confirmed: animated banded gradient plane with vertex displacement).

### Gotchas hit

1. **`renderer.backend.constructor.name` is useless in production.** The minified build
   reported the class name as `Ro`. Use the runtime brand flags instead —
   `backend.isWebGPUBackend` / `backend.isWebGLBackend` — which exist both at runtime and
   in `@types/three`. Keep `constructor.name` only as cosmetic detail.
2. **R3F types `RootState.gl` as `THREE.WebGLRenderer`.** Every WebGPU-specific access
   (`.backend`, `.compileAsync`, `hasFeatureAsync`) needs a cast. Wrap it once
   (`asRenderer()` in `components/canvas/SceneCanvas.tsx`) rather than casting at call sites.
3. **`three` ships no TypeScript declarations of its own** — `@types/three@0.185.4` supplies
   them, including for the `three/webgpu` and `three/tsl` subpath exports. Keep the
   `@types/three` minor pinned to the `three` minor or the node/TSL types drift.
4. **No dual-instance hazard.** `three/webgpu`, `three/tsl` and the default `three` entry all
   import from the same `build/three.core.js`, so `Mesh` from `three` and `Mesh` from
   `three/webgpu` are the same class. Mixing imports is safe.
5. `three/tsl` re-exports from `three/webgpu`, so importing *anything* from `three/tsl`
   pulls the whole 2.1 MB WebGPU build into that chunk. There is no à-la-carte TSL.
6. **R3F 9.7.0 triggers a deprecation warning from three r185:**
   `THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.` Harmless
   today, but it is R3F's internal loop clock and will need an R3F fix eventually.

### How to verify the node-material graph really compiled

`renderer.compileAsync(mesh, camera, scene)` rejects if WGSL generation or compilation
fails. That is a far stronger signal than "no exception was thrown during render", and the
spike wires it to a pass/fail light. **Use this in the real build's CI smoke test.**

---

## BET 2 — Persistent canvas across route navigations · **PROVEN**

Mechanism: `<CanvasRoot />` is rendered by the **root layout** as a sibling of `{children}`
(`app/layout.tsx`). App Router swaps `{children}` on navigation but keeps the layout's own
subtree mounted, so the element identity of the `<Canvas>` never changes and R3F never
tears down the renderer. Scene content is selected inside the R3F tree from a **zustand**
store that a DOM-side `usePathname()` effect writes to.

Measured across two client-side `<Link>` navigations (`/` → `/work` → `/`):

| Snapshot | renderer instances | rotator turns | frames drawn | route (DOM) | route (in-canvas) |
|---|---|---|---|---|---|
| before nav, on `/` | **1** | 0.38 | 144 | `/` | `/` |
| after nav, on `/work` | **1** | 0.72 | 168 | `/work` | `/work` |
| back on `/` | **1** | 1.07 | 192 | `/` | `/` |

Renderer instance count never left 1; the continuously-rotating torus knot's accumulated
turn counter and the frame counter both increased monotonically with no discontinuity;
`PersistentRig.mounted` logged exactly once per page load and never unmounted.

### Findings

- **R3F v9 bridges React context into the canvas automatically.** `Canvas` calls an internal
  `useBridge()` and wraps the R3F root in it. `usePathname()` called *inside* the Canvas
  returned the correct value and updated on navigation (`route (in-canvas)` column above).
  `useContextBridge` from drei is no longer needed.
- **Still prefer zustand for canvas↔DOM state in the real build.** The bridge works, but a
  module-level store keeps the per-frame path out of React entirely and is immune to
  reconciler-boundary surprises. Use the bridge for things that are genuinely context
  (theme, router), the store for everything animation-adjacent.
- Pages become client components. Expected, harmless — they still SSR.
- In dev, React StrictMode double-mounts `CanvasRoot`, so you *will* see a
  `CanvasRoot.UNMOUNTED` log at boot. It is not a navigation remount. Verify BET 2 against
  a production build, or the noise will mislead you.

---

## BET 3 — Lenis + GSAP ScrollTrigger + App Router · **PROVEN WITH CAVEATS**

Wiring (in `components/SmoothScroll.tsx`): `<ReactLenis root options={{ autoRaf: false }}>`,
`lenis.on('scroll', ScrollTrigger.update)`, `gsap.ticker.add(t => lenis.raf(t * 1000))`,
`gsap.ticker.lagSmoothing(0)`.

Measured scrub, driving a **TSL uniform** with no React state on the per-frame path:

| window.scrollY | ScrollTrigger progress | value read back off the TSL `uniform()` node |
|---|---|---|
| 0 | 0.000 | 0.000 |
| 872 | 0.000 (before the section's `start`) | 0.000 |
| 1745 | 0.292 | **0.292** |
| 2617 | 0.583 | **0.583** |
| 3489 | 0.875 | **0.875** |

The chain scroll → `ScrollTrigger.onUpdate` → module-level mutable object → `useFrame` →
`uScroll.value` is exact and allocation-free. Nothing re-renders while scrolling.

- **SplitText works and is free.** `import { SplitText } from 'gsap/SplitText'` in the plain
  `gsap` package; `SplitText.create(el, { type: 'lines', mask: 'lines' })` produced 2 lines
  per headline and reported `pass`.
- **ScrollTrigger survives navigation away and back.** 4 triggers alive on `/`; 0 after
  navigating to `/work` (the `useGSAP` scoped revert killed them cleanly, no leak); **4
  again** after navigating back, with the scrub still mapping 0 → 1 over the same section.

### The caveat — a real bug we hit

**`<ReactLenis ref={...}>` does not give a parent component a usable instance.**
`lenis-react@1.3.26` creates the Lenis object inside its own `useEffect` and stores it in
React *state*, then feeds `useImperativeHandle` from that state. So `ref.current.lenis` is
`undefined` for the entire first commit, and a parent's mount effect reading it silently
no-ops — smooth scroll simply never starts, with no error.

```
[SPIKE] lenis.MISSING — ref.current.lenis was undefined
```

**Fix, and the pattern for the real build:** do the GSAP wiring from a *child* rendered
inside `<ReactLenis>` that calls `useLenis()`. That hook subscribes properly and re-runs
once the instance exists. After the fix: `lenis: wired (autoRaf:false)`.

Also note `ReactLenis` re-creates the Lenis instance whenever `JSON.stringify(options)`
changes — hoist the options object to module scope.

---

## BET 4 — Poster-first LCP, deferred canvas boot · **PROVEN**

Boot chain, all logged with timestamps:

```
[SPIKE] timing.posterMountedAt
[SPIKE] poster.img onLoad fired (LCP candidate painted)
[SPIKE] boot.window-load fired — waiting for idle
[SPIKE] boot.start dynamic import('./SceneCanvas') — trigger: window.load -> requestIdleCallback
[SPIKE] canvas.chunk-evaluated (SceneCanvas.tsx module scope)
[SPIKE] renderer.init resolved ... backend: WebGPUBackend
[SPIKE] canvas.first-frame rendered — cross-fading poster -> canvas
```

Ordering held on every run: **poster → import start → chunk evaluated → renderer.init →
first frame → cross-fade**. (Absolute millisecond values from the automated runs are not
representative — see "Environment artefacts" below — but the ordering is.)

- The canvas chunk is `next/dynamic(..., { ssr: false })` and is not even *rendered* until
  `window.load` → `requestIdleCallback({ timeout: 2000 })`, with a `setTimeout` fallback
  for Safari.
- **`prefers-reduced-motion: reduce` genuinely blocks the boot.** Verified via the
  `?reducedMotion=1` override: `canvas` elements in the DOM = **0**, `window.__spikePump`
  undefined (the module never evaluated), poster still present, overlay reads
  `boot trigger: BLOCKED`. Network confirms it: **10 JS chunks, largest 63 KB** — the heavy
  chunk is never requested. With the canvas booted the same page loads **11 chunks / ~701 KB
  compressed**.

### Bundle cost of the WebGPU path

| | size |
|---|---|
| the three/WebGPU + R3F + drei chunk, minified | **1.79 MB** |
| gzip | **498 KB** |
| brotli | **397 KB** |

That is the price of `three/webgpu`. It is deferred, but it is real, and it is roughly
**2.5× the whole rest of the app**. Budget for it.

---

## BET 5 — drei × WebGPURenderer compatibility matrix

Each helper was mounted individually in the WebGPU-backed Canvas behind its own error
boundary and Suspense, then verified against three signals: (a) React-level mount +
rendered frames, (b) console errors tapped from `console.error`, (c) a screenshot.

**Read the "React" column as "did not crash", not "worked".** Three helpers pass at the
React level and produce garbage on screen — that is the dangerous class.

| Helper | React | Renders correctly | Error observed |
|---|---|---|---|
| `OrbitControls` | pass | **✅ works** | — |
| `Environment` (`preset="city"`) | pass | **✅ works** — visibly changed scene lighting (IBL applied; three's node PMREM path is fine) | — but see CDN note |
| `Text` (troika) | pass | **❌ BROKEN** — renders a solid **white quad** where the text should be; A/B screenshot confirms the quad appears/disappears with the toggle | `THREE.NodeBuilder: Material "ShaderMaterial" is not compatible.` |
| `Html` | pass | **✅ works** — it is pure DOM projection, no GPU involvement | — |
| `useGLTF` | pass | **✅ works** — loaded and rendered the generated `/test-cube.glb` | — |
| `MeshTransmissionMaterial` | pass | **❌ BROKEN, SILENTLY** — renders fully opaque | **no error at all** |
| `Float` | pass | **✅ works** — transform-only wrapper | — |
| `ContactShadows` | pass | **❌ BROKEN** — no shadow drawn | `THREE.NodeBuilder: Material "ShaderMaterial" is not compatible.` and `THREE.NodeBuilder: Material "MeshDepthMaterial" is not compatible.` |

### Why the three failures fail

There is one root cause with two shapes.

1. **Raw `THREE.ShaderMaterial` / legacy materials are rejected outright.** three's
   `NodeBuilder` cannot consume GLSL `ShaderMaterial` (or `MeshDepthMaterial`) and logs
   `Material "X" is not compatible`. That kills `ContactShadows` (blur passes are
   `new THREE.ShaderMaterial(...)`, depth pass is `new THREE.MeshDepthMaterial()`) and
   troika's derived text material.
2. **`onBeforeCompile` is never called.** `NodeMaterial` has no GLSL compile step to hook,
   so the callback is simply inert — *no warning, no error*. drei's
   `MeshTransmissionMaterial` pins `transmission: 0` on the underlying
   `MeshPhysicalMaterial` and does all its work through injected GLSL reading a private
   `_transmission` uniform. Under WebGPU that injection never happens, so you get a
   `MeshPhysicalMaterial` with `transmission = 0` — an opaque sphere. Verified in
   `node_modules/@react-three/drei/core/MeshTransmissionMaterial.js` and on screen.

**Rule for the real build: any drei helper that touches `ShaderMaterial`, `onBeforeCompile`,
or `.defines` is presumed broken on WebGPU until proven otherwise. Grep for those three
strings in a helper's source before you commit to using it.**

### Replacements to plan for

- **Text** → author the material in TSL, or use three's own `TextGeometry`/MSDF with a node
  material, or keep type in the DOM (drei `Html`) and composite. Do not assume a troika
  update will land in time.
- **MeshTransmissionMaterial** → use three's native `MeshPhysicalNodeMaterial` with
  `transmission`/`thickness`/`iridescence`, which the WebGPU renderer supports properly, or
  write the refraction pass in TSL.
- **ContactShadows** → real shadow maps (WebGPU shadow maps work), or a TSL-authored
  blur pass, or a baked shadow texture.

### Two more things worth knowing

- **`Environment preset` fetches from a third-party CDN at runtime.** Observed request:
  `raw.githack.com/pmndrs/drei-assets/456060a2…/hdri/…`. That is a hard dependency on
  someone else's GitHub proxy on the critical path of a client site. **Self-host the HDRI.**
- **React error boundaries cannot catch these failures.** The `NodeBuilder` errors are
  emitted asynchronously from inside the renderer during draw; nothing throws through
  React. The only reliable capture is a `console.error` tap (which the spike's debug
  overlay implements) plus `renderer.compileAsync()` on materials you care about.

---

## Environment artefacts (so nobody misreads the numbers)

The automated browser session drove a Chrome tab that was never frontmost, so
`document.visibilityState === 'hidden'` throughout. Consequences:

- **No `requestAnimationFrame` ticks and no `ResizeObserver` deliveries.** R3F's `Canvas`
  only calls `configure()` once `react-use-measure` reports a non-zero size, and that
  measurement is delivered by ResizeObserver — so on a hidden tab the canvas stays at its
  default 300×150 and the renderer is never constructed. This is **not** an app bug; a
  synthetic `window.dispatchEvent(new Event('resize'))` (which takes react-use-measure's
  undebounced window-resize path) unblocks it immediately, and a foreground tab never hits
  it. Worth remembering if you ever run R3F in a hidden tab, a `content-visibility: hidden`
  subtree, or a headless CI browser.
- `setTimeout` is throttled to ~1 s, which is why several long automation calls hit a CDP
  timeout and why the drei watchdog (10 s) produced spurious `fail` labels when several
  helpers were toggled at once. All per-helper results in the matrix above come from
  isolated runs.
- Absolute boot timings (`renderer.init done: 11376ms`) are inflated by the same throttling.
  The **ordering** of the boot chain is the finding; the millisecond values are not.

To keep the spike verifiable in that environment it exposes three affordances — all
spike-only, delete them for the real build:

- `window.__spikePump(n)` — render `n` frames synchronously via R3F's `advance()`.
- `window.__spikeMeasure()` — force a re-measure so R3F sizes the canvas.
- `window.__spikeScroll(y)` — jump Lenis to `y` and force a synchronous `ScrollTrigger.update()`.
- `/?reducedMotion=1` — exercise the reduced-motion path without changing OS settings.

Note that `advance()` computes its delta from three's own clock, so frames pumped in a tight
loop have ~0 delta. Pump in batches with real waits between if you need time to pass.

---

## Patterns that should change for the real build

1. **Wire Lenis from a child using `useLenis()`, never from a parent's ref.** (BET 3 caveat.)
2. **Detect the backend with `backend.isWebGPUBackend`, not `constructor.name`.**
3. **One typed `asRenderer()` helper** for the WebGPU cast, not scattered `as any`.
4. **Ship a `console.error` tap in dev.** WebGPU material incompatibilities are invisible to
   React; without the tap you find them by noticing something looks wrong.
5. **Add `renderer.compileAsync()` as a smoke test** for every custom node material — it is
   the only cheap signal that a TSL graph actually produced valid WGSL.
6. **Treat drei as a "check the source first" dependency**, not a default. Grep each helper
   for `ShaderMaterial` / `onBeforeCompile` / `.defines` before adopting it.
7. **Self-host every asset drei would otherwise pull from a CDN** (HDRIs, troika fonts).
8. **Budget ~400 KB brotli for the 3D chunk** and keep it strictly behind the
   load → idle → cross-fade gate. The reduced-motion path proves the site is fully usable
   without it.
9. **Verify canvas persistence against a production build**, not dev — StrictMode's
   double-mount log looks exactly like a persistence failure.
10. Keep the per-frame path (scroll progress, pointer, time) in module-level mutable objects
    read by `useFrame`. It worked exactly as intended and cost nothing.

---

## Repo map

```
app/layout.tsx                        root layout — mounts the persistent canvas beside {children}
app/page.tsx                          home: poster hero + 3 viewport-heights of scroll content
app/work/page.tsx                     drei matrix control panel
components/PosterHero.tsx             BET 4 — the LCP element
components/ScrollContent.tsx          BET 3 — SplitText + the scrubbed ScrollTrigger
components/SmoothScroll.tsx           BET 3 — ReactLenis + the useLenis()/gsap.ticker bridge
components/SiteNav.tsx                next/link nav
components/DebugOverlay.tsx           the self-reporting overlay + console.error tap
components/canvas/CanvasRoot.tsx      BET 2 + BET 4 — deferred, ssr:false, reduced-motion gate
components/canvas/SceneCanvas.tsx     BET 1 — the async gl factory + backend detection
components/canvas/PersistentRig.tsx   BET 1 (TSL) + BET 2 (continuity rotator)
components/canvas/FramePump.tsx       verification affordance — delete for the real build
components/canvas/SceneErrorBoundary.tsx
components/canvas/scenes/HeroScene.tsx
components/canvas/scenes/WorkScene.tsx  BET 5 — the isolated drei slots
lib/spike-store.ts                    zustand store (canvas <-> DOM)
lib/frame-refs.ts                     module-level per-frame values — never React state
lib/spike-log.ts                      [SPIKE] logger
scripts/make-poster.mjs               hand-rolled PNG encoder -> public/poster.png
scripts/make-glb.mjs                  hand-rolled GLB writer  -> public/test-cube.glb
```

`scripts/make-glb.mjs` exists because **three's `GLTFExporter` cannot run in plain Node** —
it reaches for `FileReader` and DOM image APIs. Importing `three` for geometry math in Node
is fine; exporting is not. The script builds the GLB chunks by hand from a `BoxGeometry`'s
typed arrays, and the result round-trips through `GLTFLoader.parse()` and through drei's
`useGLTF` in the browser.

### Local note

The machine's npm cache contains a root-owned directory
(`~/.npm/_cacache/content-v2/sha512/a6/71`) that makes `npm install` fail with `EACCES`.
This repo was installed with `npm install --cache ~/.npm-spike-cache`. Worth fixing on the
machine before the real project starts.
