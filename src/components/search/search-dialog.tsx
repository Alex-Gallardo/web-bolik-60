"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { searchText as t } from "@/content/search";
import { SearchPanel } from "./search-panel";

export type SearchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Devuelve el foco a lo que lo abrió (no hay Trigger de Radix). */
  returnFocus: () => void;
  whatsappUrl: string | null;
};

/**
 * Buscador instantáneo (BD-066, docs/06 §3.6): el mismo panel de /buscar en un diálogo, con el campo
 * enfocado. Lo descarga SearchLink (header) al primer uso, con Radix, Fuse y el índice.
 */
export default function SearchDialog({
  open,
  onOpenChange,
  returnFocus,
  whatsappUrl,
}: SearchDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-search-dialog
        className="sm:max-w-2xl"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocus();
        }}
      >
        <DialogTitle>{t.dialogTitle}</DialogTitle>
        <p className="hidden text-sm text-muted lg:block">{t.shortcut}</p>
        {/* Sin otro contenedor con scroll: DialogContent ya tiene el suyo. */}
        <div className="mt-4">
          <SearchPanel
            id="buscador-rapido"
            whatsappUrl={whatsappUrl}
            autoFocus
            mode="dialog"
            onNavigate={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
