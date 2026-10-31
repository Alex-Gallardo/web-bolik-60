/**
 * URL amigable (docs/10): minúsculas, sin tildes ni ñ, palabras con guion, sin guiones al inicio
 * ni al final. "Crayones de Cera Jumbo" → "crayones-de-cera-jumbo" · "Año escolar" → "ano-escolar".
 */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "") // quita tildes y la virgulilla de la ñ
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
