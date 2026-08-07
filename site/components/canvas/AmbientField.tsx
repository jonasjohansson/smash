'use client';

/**
 * WIREFRAME SCENE — a stand-in, not the design.
 *
 * A single full-viewport plane with a hand-authored TSL node material: a slow
 * greyscale gradient with a noise field over it, kept in a light, low-contrast
 * band so it sits behind body copy without fighting it. The real signature scene
 * replaces this file and nothing around it.
 *
 * What it is here to prove:
 *  1. TSL authoring works on the active backend — `compileAsync` rejects if the
 *     node graph fails to produce valid WGSL/GLSL, so it is a real smoke test
 *     rather than "no exception during render" (spike finding, BET 1).
 *  2. Scene state reacts to route changes while the Canvas stays mounted: each
 *     route has a `tone`/`density` pair and the uniforms ease towards the new
 *     values on navigation. If the Canvas ever remounted, that ease would snap.
 *  3. Scroll reaches the shader through a module-level object read in useFrame —
 *     no React state on the per-frame path.
 */

import * as React from 'react';
import * as THREE from 'three/webgpu';
import { float, mix, mx_noise_float, positionLocal, sin, time, uniform, uv, vec3 } from 'three/tsl';
import { useFrame, useThree } from '@react-three/fiber';
import { asRenderer } from './SceneCanvas';
import { frameRefs } from '@/lib/frame-refs';
import { error, log } from '@/lib/debug';
import { useCanvasStore } from '@/lib/canvas-store';

/**
 * Built at module scope so the uniform node identity is stable regardless of how
 * often React re-renders. Written to directly inside useFrame.
 */
const uTone = uniform(0.5);
const uDensity = uniform(0.4);
const uScroll = uniform(0);

function buildMaterial(): THREE.MeshBasicNodeMaterial {
  const material = new THREE.MeshBasicNodeMaterial();
  material.transparent = true;
  material.depthWrite = false;

  const st = uv();

  // Diagonal gradient, drifting slowly. Values live in 0.82..1.0 luminance —
  // greyscale by construction, so there is no colour decision to un-make later.
  const sweep = st.x.mul(0.45).add(st.y.mul(0.55)).add(sin(time.mul(0.06)).mul(0.06));
  const base = mix(float(1.0), float(0.82), sweep.clamp(0, 1));

  // Two octaves of noise, scaled by the route's density.
  const n1 = mx_noise_float(vec3(st.mul(3.2), time.mul(0.035))).mul(0.5).add(0.5);
  const n2 = mx_noise_float(vec3(st.mul(9.0), time.mul(0.02))).mul(0.5).add(0.5);
  const grain = mix(n1, n2, float(0.35)).sub(0.5).mul(uDensity).mul(0.09);

  // Route tone tilts the whole field lighter or heavier.
  const toned = base.add(grain).sub(uTone.sub(0.5).mul(0.06));
  const lum = toned.clamp(0.78, 1.0);

  material.colorNode = vec3(lum, lum, lum);
  // Fades out as the page scrolls so long-form reading stays clean.
  material.opacityNode = float(1).sub(uScroll.mul(0.45)).clamp(0.35, 1);

  // A hair of vertex displacement, so the graph exercises positionNode too.
  material.positionNode = positionLocal.add(
    vec3(0, 0, sin(positionLocal.x.mul(2.2).add(time.mul(0.25))).mul(0.02)),
  );

  return material;
}

export function AmbientField() {
  const setMaterial = useCanvasStore((s) => s.setMaterial);
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  const viewport = useThree((s) => s.viewport);
  const meshRef = React.useRef<THREE.Mesh>(null);

  const material = React.useMemo(() => {
    try {
      const m = buildMaterial();
      log('tsl.material-built — MeshBasicNodeMaterial (colorNode/opacityNode/positionNode)');
      return m;
    } catch (err) {
      error('tsl.material-build failed', err);
      setMaterial('fail', err instanceof Error ? err.message : String(err));
      return null;
    }
  }, [setMaterial]);

  React.useEffect(() => {
    if (!material || !meshRef.current) return;
    setMaterial('pending');
    let cancelled = false;
    asRenderer(gl)
      .compileAsync(meshRef.current, camera, scene)
      .then(() => {
        if (cancelled) return;
        setMaterial('pass');
        log('tsl.compileAsync ok — node material compiled on the active backend');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setMaterial('fail', err instanceof Error ? err.message : String(err));
        error('tsl.compileAsync failed', err);
      });
    return () => {
      cancelled = true;
    };
  }, [material, gl, camera, scene, setMaterial]);

  React.useEffect(() => {
    log('AmbientField.mounted — must happen exactly once per page load');
    return () => log('AmbientField.unmounted — on navigation this would mean the canvas remounted');
  }, []);

  useFrame((_, delta) => {
    const d = Math.min(delta, 0.1);
    const ease = 1 - Math.pow(0.02, d); // frame-rate independent approach

    // Read the store imperatively rather than subscribing: the route's tone is
    // React state, but the per-frame path must stay outside React entirely.
    const target = useCanvasStore.getState().tone;
    uTone.value += (target.tone - uTone.value) * ease;
    uDensity.value += (target.density - uDensity.value) * ease;
    uScroll.value = frameRefs.scrollProgress;

    // Read back off the node so the overlay proves the value reached the graph.
    frameRefs.shaderTone = uTone.value;

    if (meshRef.current) {
      meshRef.current.position.x = frameRefs.pointerX * 0.06;
      meshRef.current.position.y = frameRefs.pointerY * -0.06;
    }
  });

  if (!material) return null;

  return (
    <mesh ref={meshRef} scale={[viewport.width * 1.25, viewport.height * 1.25, 1]}>
      <planeGeometry args={[1, 1, 32, 32]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
