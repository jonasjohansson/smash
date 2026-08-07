'use client';

/**
 * The persistent canvas layer. Rendered by the ROOT LAYOUT as a sibling of
 * `{children}` — that placement is load-bearing.
 *
 * App Router re-renders `{children}` on navigation but keeps the layout's own
 * subtree mounted, so this element's identity never changes, the `<Canvas>`
 * inside it is never torn down, and the WebGPU renderer is constructed exactly
 * once for the session. Scene content reacts to the route through the store
 * instead (see `lib/route-tone.ts`).
 *
 * The boot is deliberately late: the `<Canvas>` lives in an `ssr:false` dynamic
 * chunk that is not even rendered until `window.load` *and* the browser reports
 * idle time, so the hero poster is uncontested for LCP. Under
 * `prefers-reduced-motion: reduce` the chunk is never requested at all — the
 * spike verified the network stays at 10 small chunks instead of pulling ~400 KB
 * brotli of three/WebGPU.
 */

import * as React from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { frameRefs } from '@/lib/frame-refs';
import { log } from '@/lib/debug';
import { useCanvasStore } from '@/lib/canvas-store';

const SceneCanvas = dynamic(() => import('./SceneCanvas'), { ssr: false, loading: () => null });

const IDLE_TIMEOUT_MS = 2000;

function useDeferredBoot(): boolean {
  const [boot, setBoot] = React.useState(false);
  const setReducedMotion = useCanvasStore((s) => s.setReducedMotion);
  const setBootReason = useCanvasStore((s) => s.setBootReason);

  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      setReducedMotion(true);
      setBootReason('blocked — prefers-reduced-motion: reduce (poster only, chunk never requested)');
      log('boot.blocked — reduced motion');
      return;
    }
    setReducedMotion(false);

    let cancelled = false;
    const start = (reason: string) => {
      if (cancelled) return;
      setBootReason(reason);
      log(`boot.start dynamic import — trigger: ${reason}`);
      setBoot(true);
    };

    const afterLoad = () => {
      if (cancelled) return;
      const ric = (
        window as unknown as {
          requestIdleCallback?: (cb: IdleRequestCallback, o?: IdleRequestOptions) => number;
        }
      ).requestIdleCallback;
      if (typeof ric === 'function') {
        ric(() => start('window.load → requestIdleCallback'), { timeout: IDLE_TIMEOUT_MS });
      } else {
        // Safari has no requestIdleCallback; a short timeout is the honest fallback.
        window.setTimeout(() => start('window.load → setTimeout (no requestIdleCallback)'), 200);
      }
    };

    if (document.readyState === 'complete') afterLoad();
    else window.addEventListener('load', afterLoad, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener('load', afterLoad);
    };
  }, [setBootReason, setReducedMotion]);

  return boot;
}

/** DOM-side half of the persistence contract: route in, store out. */
function useRouteSync(): void {
  const pathname = usePathname();
  const setRoute = useCanvasStore((s) => s.setRoute);
  React.useEffect(() => {
    frameRefs.navCount += 1;
    setRoute(pathname ?? '/');
    log('route.changed →', pathname);
  }, [pathname, setRoute]);
}

function usePointerTracking(): void {
  React.useEffect(() => {
    const onMove = (e: PointerEvent) => {
      frameRefs.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      frameRefs.pointerY = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);
}

export default function CanvasRoot() {
  useRouteSync();
  usePointerTracking();
  const boot = useDeferredBoot();
  const canvasVisible = useCanvasStore((s) => s.canvasVisible);

  React.useEffect(() => {
    log('CanvasRoot.mounted (root layout) — must be logged exactly once');
    return () => log('CanvasRoot.unmounted — on navigation this means persistence broke');
  }, []);

  return (
    <div
      id="smash-canvas-layer"
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        opacity: canvasVisible ? 1 : 0,
        transition: 'opacity 900ms ease',
        willChange: 'opacity',
      }}
    >
      {boot ? <SceneCanvas /> : null}
    </div>
  );
}
