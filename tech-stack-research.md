# Tech Stack Research — SMASH Website Rebuild

**Date:** 2026-08-07 · **Status:** Research complete, recommendation proposed
**Method:** Four parallel research passes (framework landscape, creative/3D stack, CMS landscape, award-site teardowns), all claims web-verified August 2026. Teardowns include raw-bundle fingerprinting of 13 studio sites and Lighthouse runs.

**The brief (locked with Ash, 2026-08-07):**
- Award-winning (Awwwards/FWA-level) with full WebGL ambition
- Team-editable CMS for case studies (non-technical editors)
- Design collaboration with CM.SUPPLY (they set direction/key screens; we build and extend)
- Launch: autumn/winter 2026, done right
- Built by Ash + Claude Code (AI-assisted development — stack AI-legibility is a real selection criterion)

---

## TL;DR — Recommendation

**Next.js 16 + React Three Fiber (WebGPU-first with automatic WebGL 2 fallback) + GSAP/Lenis + Sanity CMS, on Vercel.**

This is the evidenced "product-grade studio" stack: **basement.studio and 14islands — the two studios whose architecture is closest to what we want — both run exactly Next.js + Sanity + Vercel** (verified from their bundles). It matches the smash-os stack (shared deploy pipeline, muscle memory), and every layer is the most AI-legible option in its category — which matters when Claude is writing most of the code.

**One strategic steer that came out of the research:** the winning *and attainable* 2026 archetype is not wall-to-wall 3D. It's **kinetic editorial typography + weighted smooth scroll + one signature WebGL scene** ("atmosphere over spectacle" is the current judge sentiment). This also happens to match CM.SUPPLY's DNA (see §4) and our own CLAUDE.md anti-goal: *"a motion-heavy site with little clarity."* Full detail in §6.

---

## 1. Framework: why Next.js, and what else was considered

| | Verdict |
|---|---|
| **Next.js 16.3** | ✅ **Recommended.** Turbopack stable, Cache Components/PPR shipped, and since 16.2/16.3 it is the most agent-native framework in existence (DevTools MCP, auto-generated AGENTS.md, llms.txt docs, errors that emit fix prompts for coding agents). Matches smash-os. Largest R3F/GSAP ecosystem. |
| **Astro 7** | Strong runner-up. Architecturally elegant for "static pages + 3D islands" (zero JS baseline, `client:only` islands sidestep all SSR/WebGL friction). Loses on: persistent-canvas-across-routes patterns (each island is its own React root), zero overlap with our existing stack, Cloudflare-gravity since the Jan 2026 acquisition (we're on Vercel). Choose only if we abandon cross-page 3D continuity. |
| **SvelteKit + Threlte** | The artisan option. Beautiful DX, but three taxes for an AI-assisted build: Svelte 5 runes post-date most AI training data (official MCP mitigates, doesn't eliminate), Threlte's ecosystem is a fraction of R3F's, and SvelteKit 2→3 transition lands mid-build. |
| Nuxt / TanStack Start / React Router 7 | Eliminated (Vue ecosystem we have no stake in / too young / governance turbulence). |

**Known friction to design around:** an animation-heavy site is ~90% `"use client"` — we use the server side only where it pays (CMS-driven case-study pages with ISR/Cache Components, metadata, OG images). GSAP + App Router patterns are well-mapped (basement.studio's "BSMNT way" guide: `useGSAP` hook, centralized provider).

## 2. Creative/3D stack

- **Three.js r185+ via React Three Fiber v9, WebGPU-first.** WebGPU is genuinely shippable for a late-2026 launch: Safari 26 closed the last gap (Sept 2025), ~95% browser coverage, and `WebGPURenderer` **falls back to WebGL 2 automatically** — one renderer, no dual codebase. Early enough to be award-differentiating, late enough to be safe.
- **TSL (Three Shading Language)** for all new shader work — shaders as composable JS node graphs compiling to both WGSL and GLSL. Also a quiet AI win: Claude handles TSL far better than opaque GLSL strings, and it diffs/reviews like normal code.
- **GSAP 3.15 is now 100% free** including all formerly-paid Club plugins (ScrollTrigger, SplitText, MorphSVG…) since the Webflow acquisition. GSAP + **Lenis** (the de facto smooth-scroll standard — even Locomotive ships it) is the scroll/story backbone. **Motion** (`motion/react`) for UI micro-interactions; native View Transitions (Baseline since Oct 2025) + CSS scroll-driven animations as progressive enhancement.
- **Asset pipeline:** Blender → glb → `gltf-transform optimize` (meshopt geometry + KTX2 textures — KTX2 stays compressed in VRAM, ~10x memory savings). `gltfjsx` turns models into AI-editable JSX. Video: AV1 + H.264 fallback ladder (Safari only hardware-decodes AV1).
- Alternatives assessed and rejected as primary engine: Babylon (apps/games culture, absent from award work), Spline (prototyping, heavy generic embeds), PlayCanvas (wrong shape). **Unicorn Studio** is a legitimate garnish — no-code shader accents designers can own.
- **Week-one spike required:** R3F + WebGPU works today (async `gl` prop) but some drei helpers assume WebGL internals — test the drei components we rely on against WebGPURenderer before committing scenes to it.

## 3. CMS: Sanity (recommended) vs Payload (close second)

The field collapsed to two credible options for us:

**Sanity — recommended.**
- **Free tier likely covers SMASH indefinitely**: 20 seats, 10k documents, 100GB assets/bandwidth, and — decisively — **visual editing/Presentation included free**: editors get click-to-edit overlays and live-as-you-type preview of the *real* rendered site (works fine around a WebGL front-end for all DOM/text content).
- **Best video story in the industry**: the official Mux plugin (drag a video into the Studio → transcoded, 4K, captions, playback ID). For a media-heavy experiential portfolio this is the killer feature. North Kingdom runs Contentful+Mux with mobile-specific encodes; we get the same with less money and better preview.
- Most AI-agent-ready hosted CMS (official MCP server, GROQ, typegen) — Claude can query/mutate content directly.
- Proven by the exact studios we're benchmarking: basement.studio (141 refs in their bundle), 14islands (379 refs).
- Costs: Portable Text needs custom serializers (bounded work), content lives in their Content Lake not our DB, pricing has churned at the enterprise end (doesn't touch our tier).

**Payload v3 — choose instead if data ownership outranks editor polish.**
- Now Figma-owned (June 2025); still MIT, releases healthy, Figma designers actively improving the admin UX. But **Payload Cloud paused new signups** → self-host only (fine: official Vercel + Neon + Blob template = literally our stack).
- $0 forever, unlimited seats, content in our own Neon Postgres, entire content model is TypeScript in the repo (ideal Claude territory), free unlimited localization.
- Costs: we own ops/backups/upgrades, Mux is DIY (~a day), admin needs careful collection design to feel effortless, v4 migration ahead, and the "Figma abandons standalone Payload" tail-risk (MIT caps the downside).

**Eliminated:** Storyblok (its flagship visual editor is DOM-dependent — largely neutralized by a canvas-heavy front-end, leaving a $99/mo bill for what Sanity does free), Contentful (pricing cliff to ~$300/mo, enterprise-shaped), Prismic (cheap but page-builder slice model fights a bespoke front-end), Strapi/Directus (more ops than Payload, worse Next.js fit; Directus has a BSL revenue clause), git-based CMSs (Keystatic looks abandoned — maintainer silence through 2025–26; none are truly non-technical-editor ready, and media stories are weak).

**My call:** Ash chose "team needs a CMS" — editor experience and the video pipeline are the top-weighted criteria, and Sanity wins both while removing a whole category of ops from a 5-person studio. Swedish/English localization is fine on both.

## 4. CM.SUPPLY compatibility (design partner)

- **Their own site is 100% Framer** (verified; republished 24 Jul 2026). They are a brand/motion/interaction studio, **not a WebGL dev shop** — though they collaborate with FIELD.IO, so WebGL ambition in the design direction is plausible.
- Portfolio DNA: modular systems, clean editorial layout, strong motion detail — which maps naturally onto the rising "kinetic typographic" award archetype, *not* shader-art maximalism.
- Practical implications:
  1. **We build the WebGL layer ourselves** — architect a clean separation between a designer-legible DOM/typography layer and the canvas/scene layer.
  2. Expect prototypes/key screens **as Framer sites** → plan a translation workflow (Framer motion idioms — springs, layout transitions, variants — map cleanly to Motion/GSAP), not an embed workflow.
  3. **Rive** is worth putting on the table with them: proven at Site-of-the-Year level (Lando Norris: 206 Rive refs, Rive-driven page transitions) and a natural designer↔developer handoff format for motion.

## 5. What actually wins awards in 2026 (teardown findings)

- **Awwwards 2025 annuals:** SOTY = Lando Norris by OFF+BRAND (Webflow + custom WebGL + Rive layer!); Developer SOTY = Messenger by abeto (playable WebGL planet); Agency of the Year = Immersive Garden (Nuxt + Lenis). 2024 SOTY Igloo Inc was fully WebGL (procedural ice, particle footer).
- **Two archetypes win:** (a) total-WebGL worlds (Igloo, Messenger — built by elite in-house-engine shops like abeto/Active Theory/Obys, with tiny custom engines); (b) **editorial/kinetic-typography sites with surgical 3D moments** — the growing SOTD cohort and the attainable one.
- **Stacks:** Next.js + Sanity + Vercel = the self-built studio default (basement, 14islands). The platform matters less than the custom layer on top — a Webflow site won SOTY, a WordPress site (unseen.co) wins SOTDs. **CMS choice is invisible to judges.**
- **Performance reality (our Lighthouse runs, mobile):** award winners overwhelmingly fail Core Web Vitals — SOTY Lando Norris: 35.6s lab LCP; basement.studio: 13 perf score, 18.8s main-thread blocking. The outlier: **Obys — 1.0MB total desktop JS, 90ms TBT, split mobile/desktop bundles, WebGL canvas and all.** Beautiful AND fast is rare, achievable, and **a genuine differentiator/pitch line for a studio selling experiential work to clients.**

## 6. The playbook (distilled, cross-checked against our CLAUDE.md)

1. **One signature WebGL/WebGPU scene** — an ownable mechanic tied to SMASH's "spaces into living experiences" story — not wall-to-wall 3D. Atmosphere over spectacle.
2. **Kinetic oversized typography** as the primary design system (viewport-scaled variable font, scroll-reactive, SplitText reveals). Loudest 2026 trend and the cheapest to make fast.
3. **Lenis weighted scroll** + scroll-driven case-study storytelling with clear spatial logic.
4. **Page transitions that preserve spatial context** (case-study card → hero morphs; View Transitions API is Baseline).
5. **Case studies as cinematic scroll narratives** — full-bleed muted Mux video with mobile-specific encodes, idea → context → audience experience → transformation (our CLAUDE.md storytelling principle, verbatim).
6. **A live footer/contact "moment"** — contact as destination.
7. Micro-interaction density: magnetic buttons, hover states that communicate, contextual cursor only.
8. **Split delivery per device class** (Obys pattern): mobile gets a cheaper, still-designed experience — not a degraded desktop one.
9. Consider one small **playable element** (FWA/Developer-award axis; SMASH is literally an interactive-installation studio — a web toy is on-brand).
10. **Performance as a stated feature**: poster-image LCP before canvas boots, WebGL deferred after first paint, `prefers-reduced-motion` static path, per-frame values bypass React state (drive uniforms directly).

**Anti-patterns (dated or usability-killing):** blocking percentage preloaders (hidden-body = LCP catastrophe), decorative cursors that obscure controls, scroll-hijacking without escape, monolithic multi-MB JS boot (the single biggest measured failure of the genre).

**Performance budget (beats every site we tested):** mobile LCP ≤ 2.5s (real content painted before canvas), TBT < 200ms, CLS ≈ 0, < 2MB critical path, 3D assets streamed post-LCP, DPR capped at 1.5–2 with quality tiers.

---

## 7. The options, side by side

| | **A. Next.js + R3F + Sanity** (recommended) | **B. Astro 7 + R3F islands** | **C. SvelteKit + Threlte** |
|---|---|---|---|
| Award precedent | basement, 14islands, big Awwwards cohort | Growing, page-centric sites | Thin |
| 3D continuity across routes | ✅ persistent canvas, SPA-style | ❌ awkward (island roots) | ✅ |
| AI-assisted build | Best in class at every layer | Good | Weakest (mitigated by MCP) |
| Stack overlap with smash-os | Total | None | None |
| Raw perf ceiling | Good (discipline required) | Best baseline | Excellent |
| 4–5 yr safety | Safest | Safe (Cloudflare-owned) | Safe but transitioning |

**Recommended bill of materials (Option A):**
Next.js 16 (App Router, Cache Components, Turbopack) · React 19 · R3F v9 + drei + gltfjsx · Three.js r185+ WebGPURenderer + TSL (auto WebGL 2 fallback) · GSAP 3.15 (ScrollTrigger, SplitText) · Lenis · Motion for UI transitions · Sanity (free tier) + Mux plugin · Vercel hosting · Blender → gltf-transform (meshopt + KTX2) pipeline · variable WOFF2 subset fonts · AV1+H.264 video ladder.

## 8. Proposed next steps

1. **Decide** Option A vs B, and Sanity vs Payload (my votes: A, Sanity).
2. **Week-one technical spike** (before any design lands): WebGPURenderer + R3F + drei compatibility check, persistent-canvas-across-routes skeleton, Lenis + ScrollTrigger + App Router wiring, poster-LCP-then-canvas boot pattern. De-risks every architectural bet in one throwaway repo.
3. **Bring to CM.SUPPLY:** the two-archetype framing (§5), the playbook (§6), Rive as a possible motion-handoff format, and the Framer→code translation workflow. Their design direction should decide *what* the signature scene is; the stack is ready for either archetype.
4. **Content model draft** for case studies (idea/context/experience/transformation structure per CLAUDE.md) to validate the Sanity schema early.
5. Re-run field CrUX/PSI checks from a non-quota-blocked key if we want field (not lab) comparison data on benchmark sites.
