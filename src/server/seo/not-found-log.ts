import "server-only";
import { writeNotFoundHits } from "@/server/data/seo-logs";
import { createHitLog } from "./hit-log";

/** Rutas que dieron 404 (BD-046), escritas en lote en NotFoundLog para crear redirecciones (BD-123). */
export const notFoundHits = createHitLog({ name: "not-found", write: writeNotFoundHits });
