import { honeypotLabel } from "@/content/forms";

/**
 * Campo trampa (BD-077): fuera de la vista y del orden del teclado, invisible para el lector de
 * pantalla; un bot que llena todo lo llena. Sin nombre que active el autocompletado. Lo leen
 * `use-request-form.ts` y la Server Action (`checkFormMeta`).
 */
export function HoneypotField() {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
      <label>
        {honeypotLabel}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}
