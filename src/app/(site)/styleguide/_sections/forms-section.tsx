import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { feedback } from "@/content/feedback";
import { SgSection } from "../_components/sg-section";
import { FormDemo } from "../_demos/form-demo";

type FormsSectionProps = { departments: { slug: string; name: string }[] };

/**
 * 7 · Formularios: cada control en sus estados y el formulario de ejemplo con validación real.
 * Ids sin «-error» al final: Field y Checkbox llaman `${id}-error` al mensaje y chocarían.
 */
export function FormsSection({ departments }: FormsSectionProps) {
  const error = feedback.forms.errors.required;
  return (
    <SgSection
      id="formularios"
      intro="Patrón único: etiqueta visible, ayuda y error en español. El foco se ve al navegar con Tab."
    >
      <h3>Estados</h3>
      <div className="grid gap-6 md:grid-cols-3">
        <Field id="estado-normal" label="Normal" hint="Con texto de ayuda">
          <Input placeholder="Tu nombre" />
        </Field>
        <Field id="estado-invalido" label="Con error" error={error}>
          <Input defaultValue="" />
        </Field>
        <Field id="estado-deshabilitado" label="Deshabilitado">
          <Input disabled defaultValue="Solo lectura" />
        </Field>
        <Field id="estado-select" label="Lista">
          <Select placeholder="Elige tu departamento" defaultValue="">
            {departments.slice(0, 3).map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="estado-select-invalida" label="Lista con error" error={error}>
          <Select placeholder="Elige tu departamento" defaultValue="">
            {departments.slice(0, 3).map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="estado-textarea" label="Texto largo deshabilitado">
          <Textarea disabled defaultValue="Comentarios del pedido" />
        </Field>
      </div>
      <div className="flex flex-col gap-3">
        <Checkbox id="estado-check" label="Casilla normal" />
        <Checkbox id="estado-check-on" label="Casilla marcada" defaultChecked />
        <Checkbox id="estado-check-invalida" label="Casilla con error" error={error} />
        <Checkbox id="estado-check-off" label="Casilla deshabilitada" disabled />
      </div>
      <h3>Formulario de ejemplo</h3>
      <p className="text-muted">
        Envíalo vacío para ver los errores; con el teclado se llena de principio a fin.
      </p>
      <FormDemo departments={departments} />
    </SgSection>
  );
}
