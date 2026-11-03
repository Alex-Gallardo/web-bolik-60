"use client";

import { DATOS } from "./prueba-ci-datos";

/**
 * PR desechable de BD-015: suma ~200 KB al JS inicial de la home. Los datos se usan en un
 * manejador para que el minificador no pueda calcularlos al compilar y eliminarlos.
 */
export function PruebaCiPeso() {
  return (
    <button type="button" hidden onClick={() => console.info(DATOS)}>
      Prueba
    </button>
  );
}
