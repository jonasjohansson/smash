/**
 * Per-frame values that must never pass through React state.
 *
 * ScrollTrigger's `onUpdate` and the pointer listener write here; `useFrame`
 * inside the R3F tree reads. No setState on the scroll path, no re-render, no
 * allocation. The debug overlay samples this object on a slow interval purely
 * for display — that sampling is deliberately decoupled from the animation path.
 *
 * Proven in the spike (BET 3): the chain scroll → onUpdate → this object →
 * useFrame → TSL uniform was exact to three decimal places.
 */
export const frameRefs = {
  /** 0..1 — page scroll progress, written by the layout-level ScrollTrigger. */
  scrollProgress: 0,
  /** 0..1 — Lenis' own normalised scroll, for cross-checking. */
  lenisProgress: 0,
  /** -1..1 pointer position, smoothed in the scene. */
  pointerX: 0,
  pointerY: 0,
  /** Frames drawn since the renderer was created. Proof the canvas never remounted. */
  frameCount: 0,
  /** Route changes observed while the canvas stayed alive. */
  navCount: 0,
  /** Read back out of the TSL uniform so the overlay can prove the value landed. */
  shaderTone: 0,
};

export type FrameRefs = typeof frameRefs;
