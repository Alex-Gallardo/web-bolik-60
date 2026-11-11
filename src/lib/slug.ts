/**
 * URL amigable (docs/10): minúsculas, sin tildes ni ñ, palabras con guion, sin guiones al inicio
 * ni al final. "Crayones de Cera Jumbo" → "crayones-de-cera-jumbo" · "Año escolar" → "ano-escolar".
 * Un slug publicado no se cambia sin redirección 301: no cambies estas reglas a la ligera.
 * Un texto sin letras latinas da "": quien llama debe tratar ese caso.
 */
/**
 * El valor si es un slug válido (como los que genera slugify), si no undefined. Para lo que llega
 * de la URL antes de usarlo como clave de caché o tag: un slug inventado no crea entradas nuevas.
 */
export function safeSlug(value: string | undefined): string | undefined {
  return value && value.length <= 100 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
    ? value
    : undefined;
}

export function slugify(text: string): string {
  return text
    .normalize("NFKD") // separa tildes y convierte símbolos compatibles (² → 2, ﬁ → fi)
    .replace(/\p{M}/gu, "") // quita tildes y la virgulilla de la ñ
    .replace(/['’`´]/g, "") // "Kid's" → "kids", no "kid-s"
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
