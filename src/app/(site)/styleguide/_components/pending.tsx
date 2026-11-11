type PendingProps = {
  /** Qué falta (por ejemplo «KitCard»). */
  what: string;
  /** Ticket que lo trae (BD-108). */
  ticket: string;
};

/**
 * Pieza del doc 08 §6 que todavía no existe: se dice qué ticket la trae, sin maquetas inventadas.
 * Texto fijo (sin nada aleatorio) para que las capturas de BD-133 no cambien.
 */
export function Pending({ what, ticket }: PendingProps) {
  return (
    <p
      data-pending={ticket}
      className="rounded-md border-2 border-dashed border-line-strong px-4 py-3 text-sm text-muted"
    >
      <span className="font-bold text-ink">{what}</span> · llega con {ticket}
    </p>
  );
}
