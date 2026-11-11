import "server-only";
import { log } from "@/server/log";

/**
 * Contador en memoria que se escribe en lote (BD-046): los 404 (NotFoundLog) y los usos de cada
 * redirección (Redirect.hits) no tocan la base en cada petición. Acumula por clave y cada
 * `intervalMs` escribe lo acumulado. Con un tope de claves distintas por lote (lo que pasa del tope
 * se descarta y se avisa en el log): un bot que prueba miles de rutas suma como mucho `maxKeys`
 * filas nuevas por lote. No es un límite de la tabla: su limpieza va con las tareas programadas
 * (BD-145).
 * Si la escritura falla, el lote se pierde (es estadística, no vale la pena reintentar sin fin).
 */

export type HitEntry = { key: string; count: number; detail: string | null; lastAt: Date };

export type HitLogOptions = {
  name: string;
  write: (entries: HitEntry[]) => Promise<void>;
  maxKeys?: number;
  intervalMs?: number;
  now?: () => Date;
};

export type HitLog = {
  record(key: string, detail?: string | null): void;
  /**
   * Escribe lo acumulado ya (pruebas). Si hay una escritura en curso, devuelve esa: lo acumulado
   * después sale en el siguiente intervalo. Al apagar el servicio se pierden, como mucho, los
   * conteos de un intervalo (es estadística).
   */
  flush(): Promise<void>;
  /** Claves pendientes de escribir. */
  pending(): number;
};

export function createHitLog({
  name,
  write,
  maxKeys = 500,
  intervalMs = 30_000,
  now = () => new Date(),
}: HitLogOptions): HitLog {
  let buffer = new Map<string, HitEntry>();
  let dropped = 0;
  let timer: ReturnType<typeof setInterval> | undefined;
  let flushing: Promise<void> | undefined;

  async function flush() {
    if (flushing) return flushing;
    if (buffer.size === 0 && dropped === 0) return;
    const entries = [...buffer.values()];
    const lost = dropped;
    buffer = new Map();
    dropped = 0;
    flushing = (async () => {
      if (lost > 0) log.warn({ name, lost }, "Registro en lote: se descartaron rutas por el tope");
      if (entries.length === 0) return;
      try {
        await write(entries);
      } catch (error) {
        log.error(
          { name, err: error, entries: entries.length },
          "Registro en lote: falló la escritura",
        );
      }
    })().finally(() => {
      flushing = undefined;
    });
    return flushing;
  }

  return {
    record(key, detail = null) {
      const existing = buffer.get(key);
      if (existing) {
        existing.count += 1;
        existing.lastAt = now();
        if (detail) existing.detail = detail;
      } else if (buffer.size >= maxKeys) {
        dropped += 1;
      } else {
        buffer.set(key, { key, count: 1, detail, lastAt: now() });
      }
      if (!timer) {
        timer = setInterval(() => void flush(), intervalMs);
        // No mantiene vivo el proceso (pruebas, apagado del servicio).
        timer.unref?.();
      }
    },
    flush,
    pending: () => buffer.size,
  };
}
