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

export default withNextIntl(nextConfig);
