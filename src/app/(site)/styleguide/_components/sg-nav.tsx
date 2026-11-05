import { SECTIONS } from "./sections";

function Links() {
  return (
    <ol className="flex flex-col gap-1">
      {SECTIONS.map((section, index) => (
        <li key={section.id}>
          <a
            href={`#${section.id}`}
            className="flex min-h-11 items-center gap-3 rounded-md px-3 text-ink no-underline hover:bg-soft"
          >
            <span className="w-6 text-sm text-muted tnum">
              {String(index + 1).padStart(2, "0")}
            </span>
            {section.title}
          </a>
        </li>
      ))}
      <li className="mt-2 border-t-2 border-line pt-2">
        <a
          href="/styleguide/datos"
          className="flex min-h-11 items-center rounded-md px-3 text-blue hover:bg-soft"
        >
          Datos de ejemplo
        </a>
      </li>
    </ol>
  );
}

/**
 * Índice del styleguide (docs/08 §6): menú desplegable en móvil (<details>, sin JS) y columna
 * lateral fija en escritorio. Solo uno de los dos se ve a la vez.
 */
export function SgNav() {
  return (
    <>
      <details className="rounded-lg border-2 border-line lg:hidden">
        <summary className="flex min-h-11 cursor-pointer items-center px-4 font-bold">
          Secciones
        </summary>
        <nav aria-label="Secciones del styleguide" className="px-1 pb-2">
          <Links />
        </nav>
      </details>
      <nav
        aria-label="Secciones del styleguide"
        className="sticky top-6 hidden max-h-[calc(100dvh-3rem)] overflow-y-auto lg:block"
      >
        <Links />
      </nav>
    </>
  );
}
