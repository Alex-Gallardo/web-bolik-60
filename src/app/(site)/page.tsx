import { VideoHero } from "@/components/hero/video-hero";
import { SITE, buildMetadata } from "@/features/seo/metadata";
import { listHeroChapters } from "@/server/data/content";

/** Home: título por defecto sin plantilla (docs/10 §1) y descripción de docs/17 §6. */
export const metadata = buildMetadata({
  title: { absolute: SITE.defaultTitle },
  description: SITE.description,
  path: "/",
});

/**
 * Home (docs/06 §3.1). Por ahora el hero con capítulos (BD-050); las demás secciones llegan con
 * BD-051 a BD-054.
 */
export default async function HomePage() {
  const chapters = await listHeroChapters();
  return <VideoHero chapters={chapters} />;
}
