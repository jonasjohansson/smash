/**
 * Route → ambient scene tone.
 *
 * The wireframe's persistent canvas is a stand-in for the future signature
 * scene, so the only thing it needs to prove is that scene state can react to
 * navigation without the Canvas remounting. `tone` and `density` are two plain
 * scalars that the TSL graph reads; when a real scene arrives it can read richer
 * state through the same path.
 *
 * Values stay in a narrow band on purpose — this sits behind body copy.
 */

export interface RouteTone {
  /** 0..1 — shifts the gradient's balance. In greyscale this reads as weight. */
  tone: number;
  /** 0..1 — how much noise structure is visible. */
  density: number;
  /** Human-readable, for the debug overlay. */
  label: string;
}

const TONES: Array<{ match: (path: string) => boolean; value: RouteTone }> = [
  { match: (p) => p === '/', value: { tone: 0.5, density: 0.55, label: 'home' } },
  { match: (p) => p.startsWith('/work/'), value: { tone: 0.86, density: 0.2, label: 'work-detail' } },
  { match: (p) => p.startsWith('/work'), value: { tone: 0.72, density: 0.34, label: 'work-index' } },
  { match: (p) => p.startsWith('/expertise'), value: { tone: 0.3, density: 0.7, label: 'expertise' } },
  { match: (p) => p.startsWith('/studio'), value: { tone: 0.62, density: 0.28, label: 'studio' } },
  { match: (p) => p.startsWith('/contact'), value: { tone: 0.14, density: 0.82, label: 'contact' } },
  { match: (p) => p.startsWith('/lab'), value: { tone: 0.95, density: 0.9, label: 'lab' } },
];

const FALLBACK: RouteTone = { tone: 0.5, density: 0.4, label: 'default' };

export function routeTone(pathname: string): RouteTone {
  return TONES.find((t) => t.match(pathname))?.value ?? FALLBACK;
}
