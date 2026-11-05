import { cva, type VariantProps } from "class-variance-authority";
import type { Route } from "next";
import Link from "next/link";

/**
 * Tarjeta de color por público (docs/06 §3.1 «Un Bolik para cada etapa», BD-023): color sólido,
 * título, texto y flecha. Toda la tarjeta es un solo enlace. Cada color lleva su texto con
 * contraste AA (amarillo con tinta; el resto con blanco).
 */
export const audienceCardVariants = cva(
  // Borde transparente de 2 px como las demás tarjetas: la sombra de .lift (inset -2px) calza.
  "lift group flex h-full flex-col gap-3 rounded-xl border-2 border-transparent p-6 no-underline",
  {
    variants: {
      tone: {
        blue: "bg-blue text-paper",
        navy: "bg-navy text-paper",
        yellow: "bg-yellow text-ink",
        red: "bg-red text-paper",
        green: "bg-green text-paper",
      },
    },
    defaultVariants: { tone: "blue" },
  },
);

type AudienceCardProps = VariantProps<typeof audienceCardVariants> & {
  title: string;
  text: string;
  href: string;
  headingLevel?: 2 | 3 | 4;
  /** Prefetch del Link; false donde la página todavía no existe. */
  prefetch?: boolean;
};

export function AudienceCard({
  title,
  text,
  href,
  tone,
  headingLevel = 3,
  prefetch,
}: AudienceCardProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <Link href={href as Route} prefetch={prefetch} className={audienceCardVariants({ tone })}>
      <Heading className="text-xl leading-tight text-current">{title}</Heading>
      <p className="text-current">{text}</p>
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
        className="mt-auto size-6 transition-transform duration-(--dur-fast) ease-(--ease-out) motion-safe:group-hover:translate-x-1"
      >
        <path
          d="M5 12h14m-6-6 6 6-6 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  );
}
