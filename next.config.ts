import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
  // Next.js 16 uses top-level "turbopack" (not experimental.turbo). next-intl's plugin
  // injects the alias under experimental.turbo, which is ignored, so we set it here.
  // Use relative path (Turbopack doesn't support Windows absolute paths in resolveAlias).
  turbopack: {
    resolveAlias: {
      "next-intl/config": "./src/i18n/request.ts",
    },
  },
};

// Strip experimental.turbo added by next-intl (Next.js 16 uses top-level "turbopack" only)
let config = withNextIntl(nextConfig);
const exp = config.experimental as Record<string, unknown> | undefined;
if (exp?.turbo !== undefined) {
  const { turbo: _turbo, ...experimentalRest } = exp;
  config = {
    ...config,
    experimental:
      Object.keys(experimentalRest).length > 0 ? experimentalRest : undefined,
  };
}
export default config;
