// Guardia de la base de PRUEBAS: la usan la config de integración (vitest.integration.config.mts) y
// pnpm db:reset:test. Una suite o un reset nunca deben tocar la base de desarrollo ni producción.

/**
 * Devuelve el nombre de la base de `testUrl` o lanza si no es inequívocamente una base de pruebas:
 * un solo `database=` (sin `initial catalog=`), que termine en "_Test" y distinta de las otras URL.
 * @param {string | undefined} testUrl
 * @param {Array<string | undefined>} otherUrls DATABASE_URL, SHADOW_DATABASE_URL… que no debe igualar.
 */
export function assertTestDatabaseUrl(testUrl, otherUrls = []) {
  if (!testUrl) {
    throw new Error(
      "Falta TEST_DATABASE_URL: corre scripts/dev/sqlserver-local.ps1 (local) o defínela en la CI.",
    );
  }
  const names = [...testUrl.matchAll(/;\s*(?:database|initial catalog)\s*=\s*([^;]+)/gi)].map((m) =>
    m[1].trim(),
  );
  if (names.length !== 1) {
    throw new Error("TEST_DATABASE_URL debe tener exactamente un database=.");
  }
  const [name] = names;
  if (!/_test$/i.test(name)) {
    throw new Error(`TEST_DATABASE_URL apunta a "${name}", que no termina en "_Test".`);
  }
  if (otherUrls.some((url) => url && url.trim() === testUrl.trim())) {
    throw new Error("TEST_DATABASE_URL es igual a DATABASE_URL o SHADOW_DATABASE_URL.");
  }
  return name;
}
