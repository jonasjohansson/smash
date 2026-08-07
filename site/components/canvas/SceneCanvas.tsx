'use client';

/**
 * The WebGPU canvas. This module is the dynamically-imported chunk — its
 * top-level evaluation is the "3D arrived" marker for the poster-first boot.
 *
 * Ported from the spike (BET 1), which proved:
 *  - R3F v9's `GLProps` accepts an async factory returning a Promise<Renderer>,
 *    so `await renderer.init()` can happen before R3F ever uses it;
 *  - `three/webgpu` falls back to a WebGL2 backend by itself — we deliberately
 *    do not pass `forceWebGL`, so whatever the browser can do is what we get;
 *  - the backend must be identified by the `isWebGPUBackend` / `isWebGLBackend`
 *    brand flags. `backend.constructor.name` minifies to junk in production
 *    (the spike observed `Ro`), so it is kept only as cosmetic detail.
 */

import * as React from 'react';
import * as THREE from 'three/webgpu';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { AmbientField } from './AmbientField';
import { frameRefs } from '@/lib/frame-refs';
import { error, log } from '@/lib/debug';
import { rendererCounter, useCanvasStore } from '@/lib/canvas-store';

log('canvas.chunk-evaluated (SceneCanvas.tsx module scope)');

/**
 * R3F types `RootState.gl` as `THREE.WebGLRenderer`, so every WebGPU-specific
 * field needs a cast. One narrow helper, used everywhere, beats scattered casts.
 */
export type AnyRenderer = THREE.WebGPURenderer & {
  backend?: { isWebGPUBackend?: boolean; isWebGLBackend?: boolean };
};

export function asRenderer(gl: unknown): AnyRenderer {
  return gl as unknown as AnyRenderer;
}

function describeBackend(renderer: AnyRenderer): { backendName: string; isWebGPU: boolean } {
  const backend = renderer.backend;
  if (!backend) return { backendName: 'unknown (no .backend)', isWebGPU: false };
  const ctor = (backend as object).constructor?.name ?? 'Unknown';
  if (backend.isWebGPUBackend) return { backendName: `WebGPU (${ctor})`, isWebGPU: true };
  if (backend.isWebGLBackend) return { backendName: `WebGL2 fallback (${ctor})`, isWebGPU: false };
  return { backendName: `unrecognised: ${ctor}`, isWebGPU: false };
}

/** Reports the first rendered frame so the poster can cross-fade out. */
function FrameReporter() {
  const setCanvasVisible = useCanvasStore((s) => s.setCanvasVisible);
  useFrame(() => {
    frameRefs.frameCount += 1;
    if (frameRefs.frameCount === 1) {
      log('canvas.first-frame rendered — cross-fading poster → canvas');
      setCanvasVisible(true);
    }
  });
  return null;
}

function RendererIntrospect() {
  const gl = useThree((s) => s.gl);
  const registerRenderer = useCanvasStore((s) => s.registerRenderer);
  React.useEffect(() => {
    const info = describeBackend(asRenderer(gl));
    registerRenderer({ ...info, instance: rendererCounter.created });
    log('renderer.introspect', { ...info, three: THREE.REVISION });
  }, [gl, registerRenderer]);
  return null;
}

export default function SceneCanvas() {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 5], fov: 45 }}
      style={{ background: 'transparent' }}
      gl={async (props) => {
        const t0 = performance.now();
        rendererCounter.created += 1;
        log(`renderer.construct #${rendererCounter.created}`, Object.keys(props));

        const renderer = new THREE.WebGPURenderer({
          ...(props as unknown as THREE.WebGPURendererParameters),
          antialias: true,
          alpha: true,
          // No forceWebGL: the automatic WebGL2 fallback is what we want to observe.
        });

        try {
          await renderer.init();
        } catch (err) {
          error('renderer.init threw', err);
          throw err;
        }

        const info = describeBackend(renderer as unknown as AnyRenderer);
        log(`renderer.init resolved in ${Math.round(performance.now() - t0)}ms — ${info.backendName}`);
        useCanvasStore.getState().registerRenderer({ ...info, instance: rendererCounter.created });
        return renderer;
      }}
    >
      <RendererIntrospect />
      <FrameReporter />
      {/* Mounted once for the lifetime of the app — never swapped by navigation. */}
      <AmbientField />
    </Canvas>
  );
}
