import { cva } from "class-variance-authority";
import type { Route } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Section } from "@/components/layout/section";
import { buttonVariants } from "@/components/ui/button-variants";
import { wholesale } from "@/content/home";

const card = cva("flex h-full flex-col gap-3 rounded-xl p-8", {
  variants: {
    tone: { blue: "bg-blue text-paper", navy: "bg-navy text-paper" },
  },
});

/**
 * «Mayoreo y empresas» (docs/06 §3.1 sección 8; se sumó a BD-053): dos tarjetas grandes, librerías
 * y distribuidores (azul) y empresas y universidades (navy), con sus textos de docs/17. El CTA
 * lleva a /mayoreo y /empresas, que tienen su formulario de cotización.
 */
export function WholesaleSection() {
  const titleId = "mayoreo-titulo";
  return (
    <Section appearanceKey="home.wholesale" aria-labelledby={titleId}>
      <h2 id={titleId} className="sr-only">
        {wholesale.title}
      </h2>
      <ul className="grid gap-6 md:grid-cols-2">
        {wholesale.cards.map((item, index) => (
          <li key={item.key} data-reveal style={{ "--i": index } as CSSProperties}>
            <article className={card({ tone: item.tone })}>
              <p className="text-sm font-bold tracking-wide text-yellow uppercase">
                {item.eyebrow}
              </p>
              <h3 className="font-display text-[length:var(--fs-h3)] font-extrabold text-paper">
                {item.title}
              </h3>
              <p className="text-on-dark">{item.text}</p>
              <div className="mt-auto pt-4">
                <Link
                  href={item.href as Route}
                  prefetch={false}
                  className={buttonVariants({ variant: "accent", block: true })}
                  data-event="solution_click"
                  data-audience={item.key}
                >
                  {item.cta}
                </Link>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </Section>
  );
}
