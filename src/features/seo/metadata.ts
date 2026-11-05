import type { Metadata } from "next";
import { publicEnv } from "@/env.public";

/**
 * Datos del sitio para metadatos y JSON-LD (docs/10). NAP igual en todo el sitio (docs/06 §2):
 * dirección, teléfono y horario de docs/17 §1 y del ajuste `SiteSetting`.
 */
export const SITE = {
  url: publicEnv.siteUrl,
  name: "Bolik",
  /** Por validar con Gerencia (docs/17 §1, docs/02). */
  legalName: "Industrias Bolik, S.A.",
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
  /** Sin « | Bolik»: lo agrega la plantilla de rootMetadata. */
  title: string;
  /** 140–160 caracteres. */
  description: string;
  /** Ruta canónica: «/productos/boligrafos/bolik-ultra». */
  path: string;
  /** Imagen Open Graph (absoluta o relativa a metadataBase). */
  image?: string;
  noindex?: boolean;
  type?: "website" | "article";
};

/** Ruta canónica: en minúsculas ya viene del router; sin barra final (salvo la home). */
export function canonicalPath(path: string): string {
  if (path === "/" || path === "") return "/";
  return path.replace(/\/+$/, "");
}

/** Metadata estándar de cada página (BD-090 la aplica en todas las rutas). */
export function buildMetadata({
  title,
  description,
  path,
  image,
  noindex,
  type = "website",
}: BuildArgs): Metadata {
  const canonical = canonicalPath(path);
  return {
    title,
    description,
    alternates: { canonical },
    robots: noindex
      ? { index: false, follow: true, googleBot: { index: false, follow: true } }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        },
    openGraph: {
      type,
      locale: SITE.locale,
      siteName: SITE.name,
      url: canonical,
      title,
      description,
      ...(image ? { images: [{ url: image, width: 1200, height: 630, alt: title }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

/**
 * Metadata raíz (src/app/layout.tsx). Íconos y manifest llegan con el isotipo de Mercadeo; las
 * verificaciones de buscadores, con su ticket de SEO (variables nuevas en el esquema de env).
 */
export const rootMetadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "Bolik · Útiles escolares y de oficina hechos en Guatemala desde 1966",
    template: "%s | Bolik",
  },
  description: SITE.description,
  applicationName: SITE.name,
  formatDetection: { telephone: false },
  openGraph: { locale: SITE.locale, siteName: SITE.name, type: "website" },
};
