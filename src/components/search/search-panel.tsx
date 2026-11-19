"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { retryableImport } from "@/components/feedback/feedback-store";
import { buttonVariants } from "@/components/ui/button-variants";
import { Input } from "@/components/ui/input";
import { feedback } from "@/content/feedback";
import { searchSynonyms, searchText as t } from "@/content/search";
import type { SearchEntry, SearchResult } from "@/lib/search";
import { MAX_QUERY_LENGTH } from "@/lib/search-query";
import { SearchResults } from "./search-results";

/**
 * El motor (Fuse.js) y el índice (/api/search-index) se descargan al usar el buscador, no al cargar
 * la página (docs/01: decisiones; docs/12 §2). Una sola vez por pestaña; si falla, el próximo
 * intento lo vuelve a pedir.
 */
const loadSearcher = retryableImport(async () => {
  const [{ createSearcher }, entries] = await Promise.all([
    import("@/lib/search"),
    fetch("/api/search-index").then((r) => {
      if (!r.ok) throw new Error(`Índice del buscador: ${r.status}`);
      return r.json() as Promise<SearchEntry[]>;
    }),
  ]);
  return createSearcher(entries, searchSynonyms);
});

/** Precarga el buscador (acercar el puntero, el foco o el atajo). */
export const warmSearcher = () => void loadSearcher().catch(() => {});

/** Pausas: la URL y el lector de pantalla no se actualizan en cada tecla (INP, ruido). */
const URL_DELAY_MS = 300;
const ANNOUNCE_DELAY_MS = 500;

type SearchPanelProps = {
  /** id del campo (une la etiqueta). */
  id: string;
  initialQuery?: string;
  /** Resultado que ya calculó el servidor (/buscar?q=): se ve sin JS. */
  initialResult?: SearchResult;
  whatsappUrl: string | null;
  autoFocus?: boolean;
  /**
   * page: /buscar, la URL sigue a lo que se escribe (?q=) y Enter muestra los resultados aquí.
   * dialog: el buscador del header; Enter lleva a /buscar?q=… y elegir un resultado lo cierra.
   */
  mode?: "page" | "dialog";
  /** Al seguir un enlace de los resultados (el diálogo se cierra). */
  onNavigate?: () => void;
};

const SHORT: SearchResult = { status: "short", results: [] };
const tooShort = (q: string) => q.trim().length < 2;

type Phase = "idle" | "loading" | "ready" | "failed";

/**
 * Buscador (BD-066, docs/06 §3.6): formulario GET a /buscar que funciona sin JS y, con JS,
 * resultados mientras se escribe. Lo usan la página /buscar y el buscador instantáneo del header.
 * Mientras carga el motor dice «Cargando el buscador…» y nunca muestra los resultados de otra
 * consulta; si no carga, lo avisa y el botón sigue llevando a /buscar (resultados del servidor).
 */
export function SearchPanel({
  id,
  initialQuery = "",
  initialResult = SHORT,
  whatsappUrl,
  autoFocus,
  mode = "page",
  onNavigate,
}: SearchPanelProps) {
  const [query, setQuery] = useState(initialQuery);
  /** null: hay una consulta y el motor aún no la resolvió (no se pinta un resultado viejo). */
  const [result, setResult] = useState<SearchResult | null>(initialResult);
  const [phase, setPhase] = useState<Phase>("idle");
  const [announcement, setAnnouncement] = useState("");
  const searcher = useRef<((q: string) => SearchResult) | null>(null);
  /** La última consulta: si el motor termina de cargar, se resuelve esta y no una vieja. */
  const latest = useRef(initialQuery);
  const input = useRef<HTMLInputElement>(null);
  const urlTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (autoFocus) input.current?.focus();
  }, [autoFocus]);

  useEffect(() => () => window.clearTimeout(urlTimer.current), []);

  const resolve = (q: string): SearchResult | null =>
    tooShort(q) ? SHORT : searcher.current ? searcher.current(q) : null;

  const ensureSearcher = async () => {
    if (searcher.current) return;
    setPhase("loading");
    try {
      searcher.current = await loadSearcher();
      setPhase("ready");
      setResult(resolve(latest.current));
    } catch {
      setPhase("failed"); // sin red: el formulario sigue yendo a /buscar
    }
  };

  const update = (next: string) => {
    latest.current = next;
    setQuery(next);
    setResult(resolve(next));
    if (!searcher.current && !tooShort(next)) void ensureSearcher();
    if (mode === "page") {
      window.clearTimeout(urlTimer.current);
      urlTimer.current = window.setTimeout(() => {
        const q = next.trim();
        // null: así el router de Next sincroniza su estado con la URL (como los filtros, BD-060).
        window.history.replaceState(null, "", q ? `/buscar?q=${encodeURIComponent(q)}` : "/buscar");
      }, URL_DELAY_MS);
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    // En la página, con el motor listo, los resultados ya están a la vista. En el diálogo (o sin
    // motor), el formulario va a /buscar?q=… y el servidor responde con los resultados.
    if (mode === "page" && searcher.current) {
      event.preventDefault();
      setResult(resolve(query));
    }
  };

  const suggest = (s: string) => {
    update(s);
    input.current?.focus();
  };

  const status =
    phase === "failed"
      ? feedback.search.loadFailed
      : result === null
        ? t.loading
        : result.status === "short"
          ? query.trim()
            ? t.tooShort
            : ""
          : result.status === "empty"
            ? t.noResults.title(query.trim())
            : t.results(result.results.length, query.trim());

  // El lector de pantalla oye el estado cuando se deja de escribir, no en cada tecla.
  useEffect(() => {
    const timer = window.setTimeout(() => setAnnouncement(status), ANNOUNCE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [status]);

  return (
    <div className="flex flex-col gap-6">
      <form
        action="/buscar"
        method="get"
        role="search"
        data-event="search_open"
        onSubmit={onSubmit}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <label htmlFor={id} className="sr-only">
          {t.label}
        </label>
        <Input
          ref={input}
          id={id}
          name="q"
          type="search"
          autoComplete="off"
          enterKeyHint="search"
          maxLength={MAX_QUERY_LENGTH}
          placeholder={t.placeholder}
          value={query}
          onFocus={warmSearcher}
          onPointerEnter={warmSearcher}
          onChange={(event) => update(event.target.value)}
          className="sm:flex-1"
        />
        <button type="submit" className={buttonVariants({ variant: "primary", block: true })}>
          {t.button}
        </button>
      </form>
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {phase === "failed" ? (
        <p className="text-muted">{feedback.search.loadFailed}</p>
      ) : result === null ? (
        <p className="text-muted">{t.loading}</p>
      ) : result.status === "short" && query.trim() ? (
        <p className="text-muted">{t.tooShort}</p>
      ) : (
        <SearchResults
          query={query.trim()}
          result={result}
          whatsappUrl={whatsappUrl}
          onSuggest={suggest}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
}
