import type { Metadata, Viewport } from 'next';
import './globals.css';

/**
 * Root layout — html/body only.
 *
 * The site chrome (persistent canvas, smooth scroll, header, footer) lives in
 * `app/(site)/layout.tsx` so the embedded Sanity Studio at `/admin` can sit
 * outside it and get the whole viewport to itself.
 */

export const metadata: Metadata = {
  title: {
    default: 'SMASH — creative studio',
    template: '%s — SMASH',
  },
  description:
    'SMASH is a creative studio working where art, design, technology and space meet: interactive installations, projection mapping, immersive environments and digital experiences.',
};

export const viewport: Viewport = {
  themeColor: '#f2f2f2',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
