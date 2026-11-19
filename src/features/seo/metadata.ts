import type { Metadata } from "next";
import { ogText } from "@/content/og";
import { publicEnv } from "@/env.public";

/**
 * Datos fijos del sitio para metadatos (docs/10). El NAP (dirección, teléfono, horario) y las
 * redes no van aquí: el JSON-LD los lee de `SiteSetting` (getSiteSettings), una sola fuente.
 */
export const SITE = {
  url: publicEnv.siteUrl,
  name: "Bolik",
  /** Título por defecto y de la home, sin plantilla (docs/10 §1). */
  defaultTitle: "Bolik · Útiles escolares y de oficina hechos en Guatemala desde 1966",
  /** Descripción por defecto y de la home (docs/17 §6). */
  description:
    "Útiles escolares y de oficina fabricados en Guatemala desde 1966. Encuentra dónde comprar Bolik, cotiza por mayor o lleva Bolik a tu escuela.",
  locale: "es_GT",
  foundingDate: "1966-06",
} as const;

/** Imagen Open Graph de la marca (BD-090): la genera app/opengraph-image.tsx en el build. */
export const DEFAULT_OG_IMAGE = {
  url: "/opengraph-image",
  alt: ogText.defaultAlt,
  type: "image/png",
} as const;

type BuildArgs = {
  /**
   * Sin « | Bolik»: lo agrega la plantilla de rootMetadata. `{ absolute }` sale tal cual (la
   * home, docs/10 §1).
   */
  title: string | { absolute: string };
  /** 140–160 caracteres. */
  description: string;
  /** Ruta canónica: «/productos/boligrafos/bolik-ultra». */
  path: string;
  /**
   * Imagen Open Graph (absoluta o relativa a metadataBase); sin ella, la de la marca
   * (app/opengraph-image.tsx). false: la página tiene su propio opengraph-image.tsx (categorías y
   * fichas). Las imágenes que pone aquí la página mandarían sobre las de ese archivo.
   */
  image?: { url: string; alt: string; type?: string } | false;
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
  image = DEFAULT_OG_IMAGE,
  noindex,
  type = "website",
}: BuildArgs): Metadata {
  const canonical = canonicalPath(path);
  const plain = typeof title === "string" ? title : title.absolute;
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
      title: plain,
      description,
      ...(image ? { images: [{ ...image, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: plain,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

/**
 * Metadata raíz (src/app/layout.tsx). Sin canónica ni robots: cada página pone los suyos con
 * buildMetadata (si estuvieran aquí, toda página los heredaría). Íconos (BD-028): favicon.ico y
 * apple-icon.png de src/app; el manifest y las verificaciones de buscadores, con su ticket de SEO.
 */
export const rootMetadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE.defaultTitle,
    template: "%s | Bolik",
  },
  description: SITE.description,
  applicationName: SITE.name,
  formatDetection: { telephone: false },
  openGraph: { locale: SITE.locale, siteName: SITE.name, type: "website" },
};
