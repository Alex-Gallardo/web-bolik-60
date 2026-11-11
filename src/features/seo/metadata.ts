import type { Metadata } from "next";
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
      ...(image ? { images: [{ url: image, width: 1200, height: 630, alt: plain }] } : {}),
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
 * buildMetadata (si estuvieran aquí, toda página los heredaría). Íconos y manifest llegan con el
 * isotipo de Mercadeo; las verificaciones de buscadores, con su ticket de SEO.
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
