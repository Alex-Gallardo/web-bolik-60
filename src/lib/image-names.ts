import { z } from "zod";

/**
 * Nombres y textos de imagen que no describen nada (BD-097, docs/10 §8). Los usa
 * `pnpm import:media` para rechazar fotos con el nombre de la cámara y el esquema del texto
 * alternativo (seed hoy; editor de productos y biblioteca de medios en BD-116 y BD-122).
 */

const IMAGE_EXTENSION = /\.(jpe?g|png|webp|avif|heic|heif|gif|tiff?)$/i;

/**
 * Prefijos de cámaras y teléfonos seguidos de números: IMG_1234, IMG_E4521 (editada en iPhone),
 * _DSC0042 (Nikon), DSCN0042, PXL_2024…, SAM_1234; y los de Olympus (P1010001: P y 7 dígitos).
 * Un código de modelo con letra y números («p1000_azul», «sam3_rojo») no cuenta.
 */
const CAMERA = /^_?(img[\s_-]*e?|dsc[nf]?|pxl|mvimg|gopr|dji|sam[_-])[\s_-]*\d|^p\d{7}(?!\d)/;
/**
 * Capturas y fotos reenviadas, seguidas de una fecha o de nada: «Screenshot_2024…», «WhatsApp
 * Image 2024…», «Imagen de WhatsApp 2024…» (WhatsApp en español), «Captura de pantalla 2024…».
 * Una palabra seguida de otra cosa («captura-x12-colores») no cuenta.
 */
const CAPTURE =
  /^(whatsapp[\s_-]*image|imagen[\s_-]*de[\s_-]*whatsapp|screenshot|screen[\s_-]*shot|captura([\s_-]*de[\s_-]*pantalla)?)(?=[\s_-]*(\d|$))/;
/** Una palabra genérica (o nada) seguida solo de números y separadores: «foto 1», «imagen (2)», «1234». */
const GENERIC =
  /^(foto|fotos|imagen|imagenes|image|images|img|photo|picture|pic|sin[\s_-]*titulo|untitled|nueva|nuevo|new|copia|copy)?[\s\d_().-]*$/;

/** Minúsculas, sin acentos ni extensión: «Foto (2).JPG» → «foto (2)». */
function normalize(value: string): string {
  return value
    .trim()
    .replace(IMAGE_EXTENSION, "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

/** El nombre (o texto) no dice qué se ve: viene de la cámara, es una captura o es genérico. */
export function isGenericImageName(value: string): boolean {
  const name = normalize(value);
  return CAMERA.test(name) || CAPTURE.test(name) || GENERIC.test(name);
}

/** Texto alternativo de una foto: describe lo que se ve; no es un nombre de archivo. */
export function isDescriptiveAlt(value: string): boolean {
  return !IMAGE_EXTENSION.test(value.trim()) && !isGenericImageName(value);
}

/**
 * Texto alternativo obligatorio (1–200 caracteres, como `ProductImage.alt`), que describa la foto.
 * El admin pasa sus mensajes de feedback (docs/08, `admin.altMissing`, BD-116); sin mensajes
 * salen los de desarrollo, para el seed.
 */
export function imageAltSchema(messages?: { required: string; generic: string }) {
  return z
    .string()
    .trim()
    .min(1, messages?.required ?? "Falta el texto alternativo de la imagen")
    .max(200)
    .refine(
      isDescriptiveAlt,
      messages?.generic ??
        "El texto alternativo debe describir la foto, no ser un nombre de archivo ni «foto 1»",
    );
}
