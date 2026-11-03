/**
 * URL amigable (docs/10): minúsculas, sin tildes ni ñ, palabras con guion, sin guiones al inicio
 * ni al final. "Crayones de Cera Jumbo" → "crayones-de-cera-jumbo" · "Año escolar" → "ano-escolar".
 * Un slug publicado no se cambia sin redirección 301: no cambies estas reglas a la ligera.
 * Un texto sin letras latinas da "": quien llama debe tratar ese caso.
 */
export function slugify(text: string): string {
  return text
    .normalize("NFKD") // separa tildes y convierte símbolos compatibles (² → 2, ﬁ → fi)
    .replace(/\p{M}/gu, "") // quita tildes y la virgulilla de la ñ
    .replace(/['’`´]/g, "") // "Kid's" → "kids", no "kid-s"
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
