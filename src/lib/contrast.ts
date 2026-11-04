/**
 * Contraste de color según WCAG 2.x (relación entre luminancias relativas, de 1 a 21).
 * AA pide 4.5 para texto normal y 3 para texto grande (≥ 24 px, o ≥ 18.66 px en negrita).
 * Lo usan las pruebas de los componentes y la vista /styleguide (BD-021, BD-026).
 */

/** Color hex de 6 dígitos (con #, en mayúsculas o minúsculas) → [r, g, b] de 0 a 255. */
export function hexToRgb(hex: string): [number, number, number] {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) throw new Error(`Color inválido: ${hex}`);
  const value = Number.parseInt(match[1]!, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(foreground: string, background: string): number {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a) as [
    number,
    number,
  ];
  return (light + 0.05) / (dark + 0.05);
}
