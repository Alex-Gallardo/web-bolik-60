"use client";

import { DATOS } from "./prueba-ci-datos";

/** PR desechable de BD-015: suma ~200 KB al JS inicial de la home. */
export function PruebaCiPeso() {
  return <p hidden>{DATOS.length}</p>;
}
