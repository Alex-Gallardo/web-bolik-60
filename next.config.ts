import type { NextConfig } from "next";
import { parseServerEnv } from "./src/env.schema";
import { MEDIA_WIDTHS } from "./src/lib/image-loader";

// Next evalúa este archivo al arrancar dev, build y start (ya con .env.local cargado): validar aquí
// hace que una variable faltante detenga el arranque con su nombre. SKIP_ENV_VALIDATION=true en CI.
const env = process.env.SKIP_ENV_VALIDATION === "true" ? null : parseServerEnv(process.env);
const cspEnforced = (env?.CSP_ENFORCE ?? process.env.CSP_ENFORCE) === "true";

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
  // El navegador ignora (y reporta como error) esta directiva en una política Report-Only.
  ...(cspEnforced ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  // Report-Only hasta validar en staging (BD-142); CSP_ENFORCE=true la vuelve obligatoria.
  {
    key: cspEnforced ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only",
    value: csp,
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), payment=(), geolocation=(self)" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const noindex = (value: string) => [{ key: "X-Robots-Tag", value }];

const nextConfig: NextConfig = {
  output: "standalone", // IIS → Node (docs/15)
  cacheComponents: true, // 'use cache' + cacheLife + cacheTag (docs/03 §5)
  partialPrefetching: true,
  typedRoutes: true,
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    deviceSizes: [...MEDIA_WIDTHS],
    imageSizes: [64, 128, 256],
    qualities: [75],
    formats: ["image/webp"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/admin/:path*", headers: noindex("noindex, nofollow") },
      { source: "/styleguide", headers: noindex("noindex, nofollow") },
      { source: "/cotizacion/:path*", headers: noindex("noindex") },
    ];
  },
};

export default nextConfig;
