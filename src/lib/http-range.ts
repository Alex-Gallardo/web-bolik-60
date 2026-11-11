/**
 * Cabecera HTTP `Range` para servir video (BD-050, ruta /media): un solo rango `bytes=a-b`,
 * `bytes=a-` o `bytes=-n`. Como pide RFC 9110 §14.2, una cabecera que no se entiende (mal
 * escrita, otra unidad o varios rangos, que el navegador no pide para video) se ignora: null, y se
 * responde el archivo completo. "invalid" solo para un rango bien escrito que cae fuera del
 * archivo (416).
 */
export function parseRange(
  header: string | null,
  size: number,
): { start: number; end: number } | null | "invalid" {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (match[1] === "" && match[2] === "")) return null;
  if (size === 0) return "invalid";
  let start: number;
  let end: number;
  if (match[1] === "") {
    // Los últimos n bytes.
    start = Math.max(0, size - Number(match[2]));
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === "" ? size - 1 : Math.min(Number(match[2]), size - 1);
  }
  if (start > end || start >= size) return "invalid";
  return { start, end };
}
