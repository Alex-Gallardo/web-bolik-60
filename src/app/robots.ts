import type { MetadataRoute } from "next";
import { env } from "@/env";
import { SITE } from "@/features/seo/metadata";
import { buildRobots } from "@/features/seo/robots";

/** /robots.txt (BD-092): se genera en el build con el APP_ENV de ese build. */
export default function robots(): MetadataRoute.Robots {
  return buildRobots(env.APP_ENV, SITE.url);
}
