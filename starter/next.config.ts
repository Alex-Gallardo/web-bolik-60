import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

/** Anchos que genera server/media/process-image.ts. Deben coincidir con lib/image-loader.ts. */
export const MEDIA_WIDTHS = [320, 480, 640, 960, 1280, 1920];

// CSP: ver docs/15 §6 (por qué 'unsafe-inline' en scripts con páginas prerenderizadas).
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.clarity.ms https://*.clarity.ms",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://www.googletagmanager.com https://*.clarity.ms https://c.bing.com",
  "font-src 'self'",
  "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://*.clarity.ms",
  "media-src 'self'",
  "frame-src https://www.google.com https://www.youtube-nocookie.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  // Empieza como Report-Only en staging (BD-142); cambia la clave a "Content-Security-Policy" al validar.
  { key: process.env.CSP_ENFORCE === "true" ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), payment=(), geolocation=(self)" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  output: "standalone", // IIS → Node (docs/15)
  cacheComponents: true, // 'use cache' + cacheLife + cacheTag (docs/03 §5)
  typedRoutes: true,
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    deviceSizes: MEDIA_WIDTHS,
    imageSizes: [64, 128, 256],
    formats: ["image/webp"],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/styleguide", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/cotizacion/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex" }] },
    ];
  },
};

// `pnpm analyze` = ANALYZE=true next build --webpack (el analizador funciona con webpack).
export default bundleAnalyzer({ enabled: process.env.ANALYZE === "true" })(nextConfig);
