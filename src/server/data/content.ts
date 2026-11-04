import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { TAGS } from "@/lib/cache-tags";
import { dataSource } from "./source";
import type { FaqFilter } from "./types";

/** Contenido editable: hero, cifras, historia, actividades, FAQs, kits, apariencia y ajustes (BD-037). */

export async function listHeroChapters() {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.content);
  return (await dataSource()).listHeroChapters();
}

export async function listSiteStats() {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.content);
  return (await dataSource()).listSiteStats();
}

/** Solo los hitos verificados. */
export async function listMilestones() {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.content);
  return (await dataSource()).listMilestones();
}

export async function listSchoolActivities() {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.content);
  return (await dataSource()).listSchoolActivities();
}

export async function listFaqs(filter: FaqFilter) {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.faqs);
  return (await dataSource()).listFaqs(filter);
}

export async function listKits() {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.kits);
  return (await dataSource()).listKits();
}

/** null = sin registro: la sección usa su fondo por defecto (docs/08 §3). */
export async function getSectionAppearance(sectionKey: string) {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.appearance);
  return (await dataSource()).getSectionAppearance(sectionKey);
}

export async function getSiteSettings() {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.settings);
  return (await dataSource()).getSiteSettings();
}
