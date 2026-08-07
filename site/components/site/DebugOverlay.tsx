'use client';

/**
 * `[SMASH]` debug overlay — the spike's self-reporting panel, kept because the
 * failure modes it catches are otherwise invisible, but gated behind `?debug=1`
 * so it never ships to a visitor.
 *
 * It also taps `console.error`: WebGPU material incompatibilities are emitted
 * asynchronously from inside the renderer during draw, so nothing throws through
 * React and no error boundary can catch them. The tap is the only reliable
 * capture (spike finding, BET 5).
 */

import * as React from 'react';
import { frameRefs } from '@/lib/frame-refs';
import { isDebug } from '@/lib/debug';
import { useCanvasStore } from '@/lib/canvas-store';

function useConsoleErrorTap(active: boolean): string[] {
  const [errors, setErrors] = React.useState<string[]>([]);
  React.useEffect(() => {
    if (!active) return;
    const push = (msg: string) =>
      setErrors((prev) => (prev.includes(msg) ? prev : [...prev, msg].slice(-6)));

    const original = console.error;
    console.error = (...args: unknown[]) => {
      try {
        push(
          args
            .map((a) => (a instanceof Error ? `${a.name}: ${a.message}` : String(a)))
            .join(' ')
            .slice(0, 240),
        );
      } catch {
        /* never let the tap break logging */
      }
      original.apply(console, args as never);
    };

    const onErr = (e: ErrorEvent) => push(`window.onerror: ${e.message}`);
    const onRej = (e: PromiseRejectionEvent) =>
      push(`unhandledrejection: ${String((e.reason as Error)?.message ?? e.reason)}`);
    window.addEventListener('error', onErr);
    window.addEventListener('unhandledrejection', onRej);

    return () => {
      console.error = original;
      window.removeEventListener('error', onErr);
      window.removeEventListener('unhandledrejection', onRej);
    };
  }, [active]);
  return errors;
}

/** Samples the per-frame refs at 4 Hz. Display only — never on the render path. */
function useSampledRefs(active: boolean) {
  const [snap, setSnap] = React.useState({ ...frameRefs });
  React.useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setSnap({ ...frameRefs }), 250);
    return () => window.clearInterval(id);
  }, [active]);
  return snap;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-[104px] shrink-0 text-neutral-500">{label}</span>
      <span className="flex-1 break-words text-neutral-100">{value}</span>
    </div>
  );
}

export default function DebugOverlay() {
  /**
   * `isDebug` reads `window.location`, which the server cannot know. A store
   * with a distinct server snapshot is the hydration-safe way to say "false on
   * the server, the real flag on the client" without a setState-in-effect.
   */
  const active = React.useSyncExternalStore(
    () => () => {}, // the flag never changes within a session
    () => isDebug,
    () => false,
  );

  const s = useCanvasStore();
  const refs = useSampledRefs(active);
  const errors = useConsoleErrorTap(active);
  const [open, setOpen] = React.useState(true);

  if (!active) return null;

  return (
    <div className="fixed bottom-3 left-3 z-[9999] max-h-[92vh] w-[320px] overflow-auto rounded-md border border-white/15 bg-black/85 p-3 font-mono text-[10.5px] leading-[1.5] text-neutral-200 backdrop-blur">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mb-2 flex w-full items-center justify-between text-left text-[11px] font-bold tracking-wide text-white"
      >
        <span>[SMASH] DEBUG</span>
        <span className="text-neutral-500">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="space-y-2.5">
          <section>
            <h2 className="text-[10px] font-bold text-neutral-400">RENDERER</h2>
            <Row label="backend" value={s.backendName ?? 'not initialised'} />
            <Row
              label="mode"
              value={s.isWebGPU == null ? '—' : s.isWebGPU ? 'WebGPU' : 'WebGL2 fallback'}
            />
            <Row label="instances" value={String(s.rendererInstances)} />
            <Row
              label="TSL material"
              value={s.materialStatus + (s.materialError ? ` — ${s.materialError}` : '')}
            />
            <Row label="frames" value={String(refs.frameCount)} />
          </section>

          <section>
            <h2 className="text-[10px] font-bold text-neutral-400">BOOT</h2>
            <Row label="reduced motion" value={s.reducedMotion ? 'yes — canvas blocked' : 'no'} />
            <Row label="boot trigger" value={s.bootReason} />
            <Row label="canvas" value={s.canvasVisible ? 'faded in' : 'poster only'} />
          </section>

          <section>
            <h2 className="text-[10px] font-bold text-neutral-400">ROUTE / SCENE</h2>
            <Row label="route" value={s.route} />
            <Row label="tone" value={`${s.tone.label} (${s.tone.tone} / ${s.tone.density})`} />
            <Row label="shader tone" value={refs.shaderTone.toFixed(3)} />
            <Row label="navigations" value={String(Math.max(0, refs.navCount - 1))} />
          </section>

          <section>
            <h2 className="text-[10px] font-bold text-neutral-400">SCROLL</h2>
            <Row label="lenis" value={s.lenisReady ? 'wired (autoRaf:false)' : 'not wired'} />
            <Row label="triggers" value={String(s.scrollTriggerCount)} />
            <Row label="progress" value={refs.scrollProgress.toFixed(3)} />
          </section>

          <section>
            <h2 className="text-[10px] font-bold text-red-400">CONSOLE ERRORS ({errors.length})</h2>
            {errors.length === 0 ? (
              <p className="text-neutral-500">none</p>
            ) : (
              errors.map((e) => (
                <p key={e} className="break-words text-red-300">
                  • {e}
                </p>
              ))
            )}
          </section>
        </div>
      )}
    </div>
  );
}
