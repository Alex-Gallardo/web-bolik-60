"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ComponentType,
} from "react";
import { buttonVariants } from "@/components/ui/button-variants";
import { feedback } from "@/content/feedback";
import type { SchoolVisitForm } from "./school-visit-form";

type FormProps = ComponentProps<typeof SchoolVisitForm>;

/** Se descarga una sola vez (y otra vez si falló). */
let loading: Promise<ComponentType<FormProps>> | undefined;
const loadForm = () =>
  (loading ??= import("./school-visit-form").then(
    (m) => m.SchoolVisitForm,
    (error: unknown) => {
      loading = undefined;
      throw error;
    },
  ));

/** Antes de que el formulario entre en pantalla: llega listo y lo que se mueve está fuera de vista. */
const ROOT_MARGIN = "800px";

/**
 * El formulario de /escuelas (BD-076) diferido (BD-105, docs/12 §2): React Hook Form, la
 * validación y el cliente de Server Actions pesan ~10 KB y pasaban la página de su tope de 165 KB.
 * Está debajo del pliegue: se descarga cuando falta poco para verlo (o al llegar con #solicitud,
 * el botón del hero). Mientras, el lugar queda reservado con su alto (sin CLS). Sin JavaScript no
 * se puede enviar de todos modos: la página trae su aviso (FormNoScript). Si no llega, el aviso
 * de error del sistema con «Intentar de nuevo» y WhatsApp.
 */
export function SchoolFormLoader(props: FormProps) {
  const slot = useRef<HTMLDivElement>(null);
  const [Form, setForm] = useState<ComponentType<FormProps> | null>(null);
  const [failed, setFailed] = useState(false);

  // Solo actualiza el estado cuando llega (o falla) el archivo: nunca dentro del efecto.
  const load = useCallback(() => {
    loadForm().then(
      (component) => setForm(() => component),
      () => setFailed(true),
    );
  }, []);
  const retry = () => {
    setFailed(false);
    load();
  };

  useEffect(() => {
    const element = slot.current;
    if (!element || Form) return;
    if (typeof IntersectionObserver === "undefined") {
      load();
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          load();
        }
      },
      { rootMargin: ROOT_MARGIN },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [Form, load]);

  if (Form) return <Form {...props} />;
  const error = feedback.system.genericError;
  return (
    <div ref={slot} className="js-only min-h-[64rem] sm:min-h-[56rem]">
      {failed ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-xl bg-paper p-6">
          <p className="font-bold text-heading">{error.title}</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={retry}
              className={buttonVariants({ variant: "primary" })}
            >
              {error.primary}
            </button>
            {props.whatsappUrl ? (
              <a
                href={props.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "whatsapp" })}
              >
                {error.whatsapp}
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
