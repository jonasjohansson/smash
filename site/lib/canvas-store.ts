'use client';

/**
 * Canvas ↔ DOM state.
 *
 * zustand rather than context, on the spike's recommendation: R3F runs its own
 * reconciler root, and a module-level store is immune to reconciler-boundary
 * surprises. (R3F v9 *does* bridge React context automatically — `usePathname()`
 * works inside the Canvas — but the store keeps animation-adjacent state out of
 * React entirely.)
 *
 * Everything the `?debug=1` overlay reports lives here.
 */

import { create } from 'zustand';
import { routeTone, type RouteTone } from './route-tone';

export type Health = 'idle' | 'pending' | 'pass' | 'fail';

interface CanvasState {
  // renderer
  backendName: string | null;
  isWebGPU: boolean | null;
  rendererInstances: number;
  materialStatus: Health;
  materialError: string | null;

  // route / scene
  route: string;
  tone: RouteTone;

  // boot
  reducedMotion: boolean;
  bootReason: string;
  canvasVisible: boolean;

  // scroll
  lenisReady: boolean;
  scrollTriggerCount: number;

  registerRenderer: (info: { backendName: string; isWebGPU: boolean; instance: number }) => void;
  setMaterial: (status: Health, error?: string) => void;
  setRoute: (route: string) => void;
  setReducedMotion: (v: boolean) => void;
  setBootReason: (reason: string) => void;
  setCanvasVisible: (v: boolean) => void;
  setLenisReady: (v: boolean) => void;
  setScrollTriggerCount: (n: number) => void;
}

/**
 * Counted at module scope, not in React state: StrictMode double-invokes render
 * but not the async `gl` factory, so this is the honest count of
 * `new WebGPURenderer()` calls for the page's lifetime.
 */
export const rendererCounter = { created: 0 };

export const useCanvasStore = create<CanvasState>((set) => ({
  backendName: null,
  isWebGPU: null,
  rendererInstances: 0,
  materialStatus: 'idle',
  materialError: null,

  route: '/',
  tone: routeTone('/'),

  reducedMotion: false,
  bootReason: 'pending',
  canvasVisible: false,

  lenisReady: false,
  scrollTriggerCount: 0,

  registerRenderer: ({ backendName, isWebGPU, instance }) =>
    set({ backendName, isWebGPU, rendererInstances: instance }),
  setMaterial: (status, error) => set({ materialStatus: status, materialError: error ?? null }),
  setRoute: (route) => set((s) => (s.route === route ? s : { route, tone: routeTone(route) })),
  setReducedMotion: (v) => set({ reducedMotion: v }),
  setBootReason: (reason) => set({ bootReason: reason }),
  setCanvasVisible: (v) => set({ canvasVisible: v }),
  setLenisReady: (v) => set({ lenisReady: v }),
  setScrollTriggerCount: (n) => set({ scrollTriggerCount: n }),
}));
