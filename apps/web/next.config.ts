import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @mail-rocket/shared ships TypeScript source (no build step); Next compiles it with the app.
  transpilePackages: ["@mail-rocket/shared"],
};

export default nextConfig;
