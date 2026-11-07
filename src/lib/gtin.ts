/**
 * Códigos de barras GTIN (EAN-8, UPC-A, EAN-13 y GTIN-14): solo dígitos y con el dígito
 * verificador correcto. Atrapa casi todos los errores de transcripción (cualquier dígito cambiado y
 * la mayoría de los vecinos invertidos; no los que difieren en 5, como 0↔5 o 1↔6) antes de que
 * lleguen a la base (BD-031) o al admin.
 * UPC-A 759364663115: los dígitos se pesan 3, 1, 3, 1… desde la derecha sin contar el último, y el
 * verificador es lo que le falta a la suma para llegar a la siguiente decena.
 */
const GTIN_LENGTHS = new Set([8, 12, 13, 14]);

export function isValidGtin(code: string): boolean {
  if (!/^\d+$/.test(code) || !GTIN_LENGTHS.has(code.length)) return false;
  const digits = [...code].map(Number);
  const check = digits.pop()!;
  const sum = digits
    .reverse()
    .reduce((total, digit, i) => total + digit * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}
