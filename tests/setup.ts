// Configuración común de las pruebas unitarias (vitest.config.ts → setupFiles).
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Desmonta lo que renderizó cada prueba para que no se filtre a la siguiente.
afterEach(() => cleanup());
