import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Primer React ships as ESM; ensure it is transpiled by Next.
  transpilePackages: ["@primer/react"],
};

export default nextConfig;
