'use client';

/**
 * Lenis + GSAP under the App Router.
 *
 * The wiring: Lenis' own rAF is off and GSAP's ticker becomes the single clock,
 * so Lenis, ScrollTrigger and every tween advance in the same frame.
 * `lagSmoothing(0)` stops GSAP catching up after a stall, which otherwise
 * desyncs scrub positions.
 *
 * THE BUG THE SPIKE FOUND, and why this file looks the way it does:
 * `<ReactLenis ref={r}>` does NOT give a parent a usable instance in the
 * parent's mount effect. lenis-react creates the Lenis object inside its own
 * effect and stores it in React *state*, then feeds `useImperativeHandle` from
 * that state — so `ref.current.lenis` is `undefined` for the whole first commit
 * and a parent effect reading it silently no-ops, with no error and no smooth
 * scroll. The wiring therefore happens in a CHILD via `useLenis()`, which
 * subscribes properly and re-runs once the instance exists.
 */

import * as React from 'react';
import { ReactLenis, useLenis } from 'lenis/react';
import { usePathname } from 'next/navigation';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { frameRefs } from '@/lib/frame-refs';
import { log } from '@/lib/debug';
import { useCanvasStore } from '@/lib/canvas-store';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/** Hoisted: ReactLenis re-creates the instance whenever JSON.stringify(options) changes. */
const LENIS_OPTIONS = { autoRaf: false, duration: 1.05 } as const;

function LenisGsapBridge() {
  const lenis = useLenis();
  const setLenisReady = useCanvasStore((s) => s.setLenisReady);

  React.useEffect(() => {
    if (!lenis) {
      log('lenis.pending — instance not created yet (expected on first commit)');
      return;
    }

    const onScroll = () => {
      // Whole-page progress, straight into the module object the scene reads.
      const p = lenis.progress ?? 0;
      frameRefs.lenisProgress = p;
      frameRefs.scrollProgress = p;
      ScrollTrigger.update();
    };
    lenis.on('scroll', onScroll);

    const tick = (t: number) => lenis.raf(t * 1000); // gsap ticker is in seconds
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    setLenisReady(true);
    log('lenis.wired — autoRaf:false, driven by gsap.ticker');

    return () => {
      lenis.off('scroll', onScroll);
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33); // restore GSAP's default
      setLenisReady(false);
    };
  }, [lenis, setLenisReady]);

  return null;
}

/**
 * Route changes: reset scroll, drop triggers whose element left the DOM, then
 * re-measure.
 *
 * Pages revert their own triggers through `useGSAP`'s scoped cleanup (the spike
 * measured 4 → 0 → 4 across a round trip, no leak), so this deliberately does
 * NOT kill everything — that would take out the incoming page's triggers, which
 * are created by child effects that fire before this sibling's. Orphan-killing
 * plus a deferred refresh is the safe version.
 */
function RouteScrollSync() {
  const pathname = usePathname();
  const lenis = useLenis();
  const setScrollTriggerCount = useCanvasStore((s) => s.setScrollTriggerCount);
  const firstRun = React.useRef(true);

  React.useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
    } else {
      lenis?.scrollTo(0, { immediate: true, force: true });
      frameRefs.scrollProgress = 0;
      frameRefs.lenisProgress = 0;
    }

    // Two frames out: long enough for the incoming page's effects to have built
    // their triggers and for layout to have settled.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        for (const st of ScrollTrigger.getAll()) {
          const el = st.trigger;
          if (el && !document.body.contains(el)) st.kill();
        }
        ScrollTrigger.refresh();
        const count = ScrollTrigger.getAll().length;
        setScrollTriggerCount(count);
        log(`scrollTrigger.synced — ${count} alive on ${pathname}`);
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [pathname, lenis, setScrollTriggerCount]);

  return null;
}

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  return (
    <ReactLenis root options={LENIS_OPTIONS}>
      <LenisGsapBridge />
      <RouteScrollSync />
      {children}
    </ReactLenis>
  );
}
