import type { Route } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Section } from "@/components/layout/section";
import { buttonVariants } from "@/components/ui/button-variants";
import { kits as text } from "@/content/home";
import type { KitView } from "@/server/data/types";

/**
 * Kits escolares (docs/06 §3.1 sección 9, BD-054): solo con los kits activos en los ajustes
 * (kits_enabled, el mismo que decide «Familias» en el pie) y kits publicados; si no, no se dibuja.
 * Tres tarjetas con nivel, descripción y contenido; sin precio (lo muestra /kits-escolares cuando
 * Mercadeo lo apruebe). En móvil es un carrusel con scroll-snap (sin JS); desde md, 3 columnas.
 */
export function KitsSection({ kits, enabled }: { kits: KitView[]; enabled: boolean }) {
  if (!enabled || kits.length === 0) return null;
  const titleId = "kits-titulo";
  return (
    <Section appearanceKey="home.kits" aria-labelledby={titleId}>
      <div className="flex max-w-2xl flex-col gap-3">
        <h2 id={titleId} className="font-display text-[length:var(--fs-h2)] font-extrabold">
          {text.title}
        </h2>
        <p className="text-[length:var(--fs-lead)] text-muted">{text.text}</p>
      </div>
      <ul
        // Como el carrusel de soluciones: a todo el ancho en móvil, py-5 para el revelado.
        className="-mx-[var(--gutter)] mt-6 flex snap-x snap-mandatory scroll-px-[var(--gutter)] gap-4 overflow-x-auto px-[var(--gutter)] py-5 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0"
      >
        {kits.slice(0, text.limit).map((kit, index) => (
          <li
            key={kit.slug}
            data-reveal
            style={{ "--n": index } as CSSProperties}
            className="w-[min(18rem,78vw)] shrink-0 snap-start [--i:0] md:w-auto md:[--i:var(--n)]"
          >
            {/* Tarjeta blanca: tono claro aunque el admin elija un fondo oscuro. */}
            <article
              data-tone="light"
              className="flex h-full flex-col gap-3 rounded-xl border-2 border-line bg-paper p-6 text-text"
            >
              <p className="text-sm font-bold tracking-wide text-accent-text uppercase">
                {text.levels[kit.level]}
              </p>
              <h3 className="text-xl leading-tight">{kit.name}</h3>
              <p className="text-muted">{kit.description}</p>
              {kit.items.length > 0 && (
                <ul aria-label={text.itemsLabel(kit.name)} className="mt-auto flex flex-col gap-1">
                  {kit.items.map((item, itemIndex) => (
                    <li key={`${item.description}-${itemIndex}`} className="text-sm">
                      {text.item(item.quantity, item.description)}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <Link
          href={text.cta.href as Route}
          prefetch={false}
          className={buttonVariants({ variant: "primary", block: true })}
        >
          {text.cta.label}
        </Link>
      </div>
    </Section>
  );
}
