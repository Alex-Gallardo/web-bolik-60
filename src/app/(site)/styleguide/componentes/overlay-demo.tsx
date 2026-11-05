"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
  type SheetSide,
} from "@/components/ui/sheet";

const SHEETS: { side: SheetSide; label: string; title: string; text: string }[] = [
  {
    side: "auto",
    label: "Sheet (auto)",
    title: "Filtros",
    text: "Abajo en el teléfono, a la derecha desde 768 px: el patrón del menú, la cotización y los filtros.",
  },
  {
    side: "right",
    label: "Sheet derecha",
    title: "Tu cotización",
    text: "Siempre a la derecha: el drawer de cotización en escritorio (BD-071).",
  },
];

/** Vitrina de overlays (BD-025): cada uno con su Trigger, para probar Escape y el foco de regreso. */
export function OverlayDemo() {
  return (
    <div className="flex flex-wrap gap-3">
      {SHEETS.map((sheet) => (
        <Sheet key={sheet.side}>
          <SheetTrigger asChild>
            <Button variant="outline">{sheet.label}</Button>
          </SheetTrigger>
          <SheetContent
            side={sheet.side}
            title={sheet.title}
            description={sheet.text}
            footer={
              <SheetClose asChild>
                <Button className="w-full">Listo</Button>
              </SheetClose>
            }
          >
            <p className="text-muted">
              El contenido largo hace scroll aquí; el título y el pie quedan fijos.
            </p>
          </SheetContent>
        </Sheet>
      ))}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Precio de fábrica</DialogTitle>
          <DialogDescription>
            Para librerías y distribuidores: cotiza por cajilla o por fardo y te respondemos en un
            día hábil.
          </DialogDescription>
        </DialogContent>
      </Dialog>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">Popover</Button>
        </PopoverTrigger>
        <PopoverContent title="Cajilla">
          <p className="text-sm text-muted">
            Presentación para tiendas: varias unidades del mismo color en una caja.
          </p>
        </PopoverContent>
      </Popover>
    </div>
  );
}
