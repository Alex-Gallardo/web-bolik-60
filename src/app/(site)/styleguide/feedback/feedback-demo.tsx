"use client";

import { useState, type ReactNode } from "react";
import { EmptyState } from "@/components/feedback/empty-state";
import { InlineAlert } from "@/components/feedback/inline-alert";
import { useFeedback } from "@/components/feedback/use-feedback";
import { Button } from "@/components/ui/button";
import { ChipToggle } from "@/components/ui/chip";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { feedback } from "@/content/feedback";
import { ui } from "@/content/ui";
import { EXAMPLES } from "./examples";

type Row = {
  action: string;
  type: "Toast" | "Dialog" | "Inline" | "Inline + Toast" | "Dialog + Toast" | "Sheet" | "Página";
  textKey: string;
  demo: ReactNode;
  /** Ticket que conecta la pieza final, si no es este. */
  later?: string;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** El error se lanza al renderizar: lo atrapa (site)/error.tsx, como un error real. */
function Thrower({ armed }: { armed: boolean }) {
  if (armed) throw new Error("Error de prueba de la vitrina (BD-024)");
  return null;
}

type FeedbackDemoProps = { productName: string; storeName: string };

/**
 * Cada fila de la matriz de feedback (docs/08 §4) con un ejemplo que funciona y los textos reales
 * de content/feedback.ts. Criterio de aceptación de BD-024.
 */
export function FeedbackDemo({ productName, storeName }: FeedbackDemoProps) {
  const { toast, dialog } = useFeedback();
  const [count, setCount] = useState(0);
  const [qty, setQty] = useState(2);
  const [lineVisible, setLineVisible] = useState(true);
  const [sending, setSending] = useState(false);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string>();
  const [shake, setShake] = useState(0);
  const [color, setColor] = useState<(typeof EXAMPLES.colors)[number]>(EXAMPLES.colors[0]);
  const [progress, setProgress] = useState<number | null>(null);
  const [crash, setCrash] = useState(false);

  const removeLine = () => {
    setLineVisible(false);
    toast(feedback.quote.removed(productName), { onAction: () => setLineVisible(true) });
  };

  const retrySend = () =>
    dialog(feedback.quote.failed, {
      kind: "error",
      onPrimary: async () => {
        await wait(1200);
        dialog(feedback.quote.sent(EXAMPLES.quoteFolio), { kind: "success" });
      },
    });

  const locate = async (ok: boolean) => {
    toast(feedback.stores.locating, { id: "stores-locate" });
    await wait(1200);
    toast(ok ? feedback.stores.located(EXAMPLES.storesFound) : feedback.stores.locationDenied, {
      id: "stores-locate",
    });
  };

  const upload = async () => {
    for (let p = 0; p <= 100; p += 25) {
      setProgress(p);
      await wait(250);
    }
    setProgress(null);
    toast(feedback.admin.uploadOk);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(EXAMPLES.whatsappMessage(productName));
      toast(feedback.whatsapp.copied);
    } catch {
      toast(feedback.whatsapp.copyFailed);
    }
  };

  const rows: Row[] = [
    {
      action: "Agregar a cotización",
      type: "Toast",
      textKey: "quote.added",
      demo: (
        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              setCount((n) => n + 1);
              // «Ver cotización» abrirá el drawer (BD-071); aquí cierra el aviso.
              toast(feedback.quote.added(productName, 2, "cajillas"), { onAction: () => {} });
            }}
          >
            Agregar a cotización
          </Button>
          <span
            key={count}
            aria-hidden="true"
            className="badge-pop grid size-8 place-items-center rounded-full bg-yellow text-sm font-bold text-ink"
          >
            {count}
          </span>
        </div>
      ),
    },
    {
      action: "Cambiar cantidad",
      type: "Inline",
      textKey: "—",
      demo: (
        <Field id="demo-qty" label="Cajillas">
          <QuantityStepper value={qty} onChange={setQty} />
        </Field>
      ),
    },
    {
      action: "Quitar línea",
      type: "Toast",
      textKey: "quote.removed",
      later: "BD-071 (colapso A-36)",
      demo: lineVisible ? (
        <div className="flex items-center justify-between gap-3 rounded-md border-2 border-line px-4 py-2">
          <span>{productName}</span>
          <Button variant="link" size="sm" onClick={removeLine}>
            Quitar
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted">Línea quitada: usa «Deshacer» en el aviso.</p>
      ),
    },
    {
      action: "Enviar cotización (cargando)",
      type: "Inline",
      textKey: "quote.sending",
      demo: (
        <Button
          loading={sending}
          loadingText={feedback.quote.sending.title}
          onClick={async () => {
            setSending(true);
            await wait(1500);
            setSending(false);
          }}
        >
          Enviar cotización
        </Button>
      ),
    },
    {
      action: "Cotización enviada",
      type: "Dialog",
      textKey: "quote.sent",
      demo: (
        <Button
          onClick={() => dialog(feedback.quote.sent(EXAMPLES.quoteFolio), { kind: "success" })}
        >
          Ver diálogo de éxito
        </Button>
      ),
    },
    {
      action: "Error al enviar",
      type: "Dialog",
      textKey: "quote.failed",
      demo: (
        <Button variant="outline" onClick={retrySend}>
          Ver diálogo de error
        </Button>
      ),
    },
    {
      action: "Formulario con errores",
      type: "Inline + Toast",
      textKey: "forms.invalid",
      demo: (
        <form
          noValidate
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim()) {
              setNameError(undefined);
              return;
            }
            setNameError(feedback.forms.errors.required);
            setShake((n) => n + 1);
            document.getElementById("demo-name")?.focus();
            toast(feedback.forms.invalid);
          }}
        >
          <Field id="demo-name" label="Tu nombre" required error={nameError} shakeKey={shake}>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Button type="submit" variant="outline" className="self-start">
            Enviar vacío
          </Button>
        </form>
      ),
    },
    {
      action: "Límite de envíos",
      type: "Dialog",
      textKey: "forms.rateLimited",
      demo: (
        <Button
          variant="outline"
          onClick={() => dialog(feedback.forms.rateLimited, { kind: "error" })}
        >
          Ver diálogo de límite
        </Button>
      ),
    },
    {
      action: "Solicitud de visita escolar",
      type: "Dialog",
      textKey: "forms.schoolSent",
      demo: (
        <Button
          variant="accent"
          onClick={() =>
            dialog(feedback.forms.schoolSent(EXAMPLES.schoolFolio, EXAMPLES.schoolName), {
              kind: "success",
              celebrate: true,
            })
          }
        >
          Ver diálogo festivo
        </Button>
      ),
    },
    {
      action: "Solicitud de distribuidor",
      type: "Dialog",
      textKey: "forms.distributorSent",
      demo: (
        <Button
          variant="outline"
          onClick={() =>
            dialog(feedback.forms.distributorSent(EXAMPLES.distributorFolio), { kind: "success" })
          }
        >
          Ver diálogo de distribuidor
        </Button>
      ),
    },
    {
      action: "Abrir WhatsApp",
      type: "Sheet",
      textKey: "whatsapp.opened",
      later: "BD-025 (Sheet) y BD-067 (vista previa)",
      demo: (
        <div className="flex flex-col gap-3">
          <p className="rounded-md bg-soft p-3 text-sm">{EXAMPLES.whatsappMessage(productName)}</p>
          <Button
            variant="whatsapp"
            className="self-start"
            onClick={() => toast(feedback.whatsapp.opened)}
          >
            Abrir WhatsApp
          </Button>
        </div>
      ),
    },
    {
      action: "Copiar mensaje",
      type: "Toast",
      textKey: "whatsapp.copied / copyFailed",
      demo: (
        <Button variant="outline" onClick={() => void copy()}>
          Copiar mensaje
        </Button>
      ),
    },
    {
      action: "Cambiar color en ficha",
      type: "Inline",
      textKey: "catalog.colorChanged",
      later: "ficha de producto (crossfade de la imagen)",
      demo: (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.colors.map((c) => (
              <ChipToggle
                key={c.sku}
                line="escritura"
                pressed={color.sku === c.sku}
                onClick={() => setColor(c)}
              >
                {c.name}
              </ChipToggle>
            ))}
          </div>
          <p aria-live="polite" className="text-sm font-bold">
            {feedback.catalog.colorChanged(color.name, color.sku).title}
          </p>
        </div>
      ),
    },
    {
      action: "Buscar sin resultados",
      type: "Inline",
      textKey: "catalog.noResults",
      demo: (
        <EmptyState
          illustration="no-results"
          headingLevel={4}
          {...feedback.catalog.noResults(EXAMPLES.searchQuery)}
        />
      ),
    },
    {
      action: "Filtros sin resultados",
      type: "Inline",
      textKey: "catalog.filtersEmpty",
      demo: (
        <EmptyState
          illustration="empty"
          headingLevel={4}
          title={feedback.catalog.filtersEmpty.title}
        >
          <Button variant="outline" size="sm">
            {feedback.catalog.filtersEmpty.action}
          </Button>
        </EmptyState>
      ),
    },
    {
      action: "Descargar PDF",
      type: "Toast",
      textKey: "catalog.pdfReady",
      demo: (
        <Button variant="outline" onClick={() => toast(feedback.catalog.pdfReady)}>
          Descargar ficha técnica
        </Button>
      ),
    },
    {
      action: "Usar mi ubicación",
      type: "Toast",
      textKey: "stores.*",
      demo: (
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => void locate(true)}>
            Con permiso
          </Button>
          <Button variant="outline" onClick={() => void locate(false)}>
            Sin permiso
          </Button>
        </div>
      ),
    },
    {
      action: "Sin conexión / reconexión",
      type: "Toast",
      textKey: "system.offline / system.online",
      demo: (
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => window.dispatchEvent(new Event("offline"))}>
            Simular sin conexión
          </Button>
          <Button variant="outline" onClick={() => window.dispatchEvent(new Event("online"))}>
            Simular reconexión
          </Button>
        </div>
      ),
    },
    {
      action: "Error inesperado",
      type: "Página",
      textKey: "system.genericError",
      demo: (
        <>
          <Thrower armed={crash} />
          <Button variant="danger" onClick={() => setCrash(true)}>
            Provocar un error
          </Button>
        </>
      ),
    },
    {
      action: "Admin: guardar",
      type: "Toast",
      textKey: "admin.saved",
      later: "panel admin (enlace «Ver en el sitio»)",
      demo: (
        <Button onClick={() => toast(feedback.admin.saved, { onAction: () => {} })}>Guardar</Button>
      ),
    },
    {
      action: "Admin: eliminar",
      type: "Dialog + Toast",
      textKey: "admin.confirmDelete / admin.deleted",
      demo: (
        <Button
          variant="danger"
          onClick={() =>
            dialog(feedback.admin.confirmDelete(`la tienda ${storeName}`), {
              kind: "confirm",
              destructive: true,
              onPrimary: () => toast(feedback.admin.deleted("Tienda"), { onAction: () => {} }),
            })
          }
        >
          Eliminar tienda
        </Button>
      ),
    },
    {
      action: "Admin: subir imagen",
      type: "Inline + Toast",
      textKey: "admin.uploadOk",
      demo: (
        <div className="flex flex-col gap-3">
          <Button
            variant="outline"
            className="self-start"
            loading={progress !== null}
            loadingText={ui.loading.uploading}
            onClick={() => void upload()}
          >
            Subir imagen
          </Button>
          <div
            role="progressbar"
            aria-label="Subida de la imagen"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress ?? 0}
            className="h-2 overflow-hidden rounded-full bg-soft"
          >
            <div
              className="h-full origin-left bg-blue transition-transform duration-(--dur-base) ease-(--ease-out)"
              style={{ transform: `scaleX(${(progress ?? 0) / 100})` }}
            />
          </div>
        </div>
      ),
    },
    {
      action: "Admin: falta alt",
      type: "Inline",
      textKey: "admin.altMissing",
      demo: <InlineAlert {...feedback.admin.altMissing} />,
    },
    {
      action: "Admin: sesión vencida",
      type: "Toast",
      textKey: "admin.sessionExpired",
      later: "panel admin (redirección al login)",
      demo: (
        <Button variant="outline" onClick={() => toast(feedback.admin.sessionExpired)}>
          Simular sesión vencida
        </Button>
      ),
    },
  ];

  return (
    <ol data-testid="matriz-feedback" className="grid gap-4 lg:grid-cols-2">
      {rows.map((row) => (
        <li
          key={row.action}
          data-row={row.action}
          className="flex flex-col gap-4 rounded-lg border-2 border-line bg-paper p-5"
        >
          <div className="flex flex-col gap-1">
            <h3 className="text-lg leading-tight">{row.action}</h3>
            <p className="text-sm text-muted">
              {row.type} · <code>{row.textKey}</code>
              {row.later ? <> · pieza final: {row.later}</> : null}
            </p>
          </div>
          {row.demo}
        </li>
      ))}
    </ol>
  );
}
