import type { Route } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Section } from "@/components/layout/section";
import { buttonVariants } from "@/components/ui/button-variants";
import { mainHero } from "@/content/home";
import type { ColorView } from "@/server/data/types";
import { UltraIllustration } from "./ultra-illustration";

/**
 * Hero principal de la home (docs/06 §3.1 sección 1, BD-056): tipográfico, con el único h1 y su
 * subrayado de tinta (A-11, .ink-draw), y el Bolik Ultra ilustrado (los colores salen de sus
 * variantes). Server Component sin JS: el LCP es el texto del h1, sin imagen que esperar. La
 * ilustración entra con fade-up solo con JS (.js .hero-art) y, con movimiento reducido, solo con
 * opacidad. En móvil va debajo del texto y más chica: los botones quedan en la primera pantalla.
 */
export function MainHero({ colors }: { colors: ColorView[] }) {
  return (
    <Section
      appearanceKey="home.hero"
      background="brand"
      spacing="none"
      aria-labelledby="hero-titulo"
      className="overflow-hidden"
    >
      {/* Alto de la pantalla menos el header: abre la home y deja el resto debajo del pliegue. */}
      <div className="grid min-h-[calc(100svh-var(--header-h))] items-center gap-8 py-12 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] md:py-16">
        <div className="flex flex-col gap-5">
          <p className="w-fit rounded-full bg-yellow px-3 py-1 text-sm font-bold text-ink">
            {mainHero.chip}
          </p>
          <h1
            id="hero-titulo"
            className="font-display text-[length:var(--fs-hero)] leading-[var(--lh-heading)] font-extrabold"
          >
            {mainHero.title.lead}{" "}
            <span className="relative inline-block whitespace-nowrap">
              {mainHero.title.emphasis}
              <svg
                viewBox="0 0 300 12"
                preserveAspectRatio="none"
                className="absolute -bottom-2 left-0 h-3 w-full"
                aria-hidden="true"
              >
                <path
                  d="M3 8C60 3 118 11 178 6s92-3 119 1"
                  pathLength={1}
                  strokeWidth={4}
                  strokeLinecap="round"
                  className="ink-draw ink-draw-late fill-none stroke-yellow"
                  style={{ "--path-length": 1 } as CSSProperties}
                />
              </svg>
            </span>
          </h1>
          <p className="max-w-xl text-[length:var(--fs-lead)] text-text">{mainHero.text}</p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <Link
              href={mainHero.primary.href as Route}
              prefetch={false}
              className={buttonVariants({ variant: "accent", block: true })}
              data-event="hero_cta_click"
              data-chapter="principal"
              data-cta="productos"
            >
              {mainHero.primary.label}
            </Link>
            <Link
              href={mainHero.secondary.href as Route}
              prefetch={false}
              className={buttonVariants({ variant: "outline", block: true })}
              data-event="hero_cta_click"
              data-chapter="principal"
              data-cta="mayoreo"
            >
              {mainHero.secondary.label}
            </Link>
          </div>
        </div>

        {colors.length > 0 && (
          <div className="hero-art relative mx-auto w-full max-w-xs md:max-w-md" aria-hidden="true">
            {/* Disco de fondo: separa los bolígrafos blancos del azul de la sección. */}
            <span className="absolute inset-[6%] rounded-full bg-paper/10" />
            <div className="relative p-4">
              <UltraIllustration colors={colors} />
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}
