import * as React from 'react';

/**
 * The Studio gets the viewport to itself: no header, no footer, no persistent
 * canvas, no Lenis. That is exactly why `/admin` sits outside the `(site)` route
 * group — it shares only the root `<html>`/`<body>`.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-white">{children}</div>;
}
