import type { Metadata } from "next";

export const SITE = {
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bolik66.com",
  name: "Bolik",
  legalName: "Industrias Bolik, S.A.", // confirmar con Gerencia
  tagline: "De la materia prima a tu primer trazo.",
  description:
    "Bolik fabrica en Guatemala desde 1966 bolígrafos, lápices, marcadores y útiles escolares y de oficina. Encuentra dónde comprar y cotiza por mayor.",
  locale: "es_GT",
  phone: "+502 6628 2600",
  address: {
    streetAddress: "6a. Avenida 6-31, zona 2",
    addressLocality: "San José Villa Nueva",
    addressRegion: "Guatemala",
    postalCode: "01064",
    addressCountry: "GT",
  },
  foundingDate: "1966-06",
  sameAs: ["https://www.facebook.com/universoBolik/"],
} as const;

type BuildArgs = {
  title: string;              // sin " | Bolik" (lo agrega la plantilla)
  description: string;        // 140–160 caracteres
  path: string;               // "/productos/boligrafos/bolik-ultra"
  image?: string;             // ruta absoluta o relativa de la imagen OG
  noindex?: boolean;
  type?: "website" | "article";
};

/** Metadata estándar de cada página. Úsala en generateMetadata/metadata de TODAS las rutas. */
export function buildMetadata({ title, description, path, image, noindex, type = "website" }: BuildArgs): Metadata {
  const canonical = path === "/" ? "/" : path.replace(/\/+$/, "");
  return {
    title,
    description,
    alternates: { canonical },
    robots: noindex
      ? { index: false, follow: true, googleBot: { index: false, follow: true } }
      : { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
    openGraph: {
      type,
      locale: SITE.locale,
      siteName: SITE.name,
      url: canonical,
      title,
      description,
      ...(image ? { images: [{ url: image, width: 1200, height: 630, alt: title }] } : {}),
    },
    twitter: { card: "summary_large_image", title, description, ...(image ? { images: [image] } : {}) },
  };
}

/** Metadata raíz: va en src/app/layout.tsx */
export const rootMetadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: "Bolik · Útiles escolares y de oficina hechos en Guatemala desde 1966", template: "%s | Bolik" },
  description: SITE.description,
  applicationName: SITE.name,
  formatDetection: { telephone: false },
  icons: { icon: "/brand/favicon.svg", apple: "/brand/apple-touch-icon.png" },
  manifest: "/manifest.webmanifest",
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    other: process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : undefined,
  },
};
