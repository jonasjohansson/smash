import type { NextConfig } from "next";

/**
 * `STATIC_EXPORT=1` builds a plain static site into `out/` for GitHub Pages
 * (smash.jonasjohansson.se). Without it the build stays a normal Next server app.
 */
const staticExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = staticExport
  ? { output: "export", trailingSlash: true, images: { unoptimized: true } }
  : {};

export default nextConfig;
