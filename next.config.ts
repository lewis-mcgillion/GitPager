import type { NextConfig } from "next";

// GitPager ships as a fully static single-page app (no server) so it can be
// hosted on GitHub Pages. `output: "export"` emits static HTML/JS into `out/`.
// basePath/NEXT_PUBLIC_BASE_PATH are kept in sync so OAuth redirect URIs and
// asset paths resolve correctly under a project Pages path (e.g. "/GitPager").
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: basePath || undefined,
  images: { unoptimized: true },
  // Primer React ships as ESM; ensure it is transpiled by Next.
  transpilePackages: ["@primer/react"],
};

export default nextConfig;
