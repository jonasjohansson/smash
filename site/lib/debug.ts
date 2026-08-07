/**
 * `[SMASH]` instrumentation — the spike's debug logger, made opt-in.
 *
 * The spike logged unconditionally because a human was reading the console. In
 * production that is noise, so everything here is gated on `?debug=1`. The gate
 * is read once at module evaluation: it must not change mid-session, and reading
 * `location.search` on every log call would be both slower and inconsistent
 * across a client-side navigation.
 */

export const DEBUG_PARAM = 'debug';
export const LOG_PREFIX = '[SMASH]';

function readFlag(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get(DEBUG_PARAM) === '1';
  } catch {
    return false;
  }
}

/** True only when the page was entered with `?debug=1`. */
export const isDebug: boolean = readFlag();

/** ms since navigation start. */
export function now(): number {
  if (typeof performance !== 'undefined') return Math.round(performance.now() * 10) / 10;
  return Date.now();
}

export function log(event: string, detail?: unknown): void {
  if (!isDebug || typeof console === 'undefined') return;
  const stamp = `t+${now()}ms`;
  if (detail === undefined) console.log(`${LOG_PREFIX} ${stamp} ${event}`);
  else console.log(`${LOG_PREFIX} ${stamp} ${event}`, detail);
}

/** Warnings and errors are NOT gated — a broken renderer is worth saying out loud. */
export function warn(event: string, detail?: unknown): void {
  if (typeof console === 'undefined') return;
  console.warn(`${LOG_PREFIX} ${event}`, detail ?? '');
}

export function error(event: string, detail?: unknown): void {
  if (typeof console === 'undefined') return;
  console.error(`${LOG_PREFIX} ${event}`, detail ?? '');
}
